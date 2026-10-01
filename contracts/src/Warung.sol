// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

/// @dev Reports loan outcomes to the underwriter agent's ERC-8004 reputation. Adapter is wired after the testnet spike.
interface IAgentReputation {
    function recordOutcome(bytes32 loanRef, bool repaid) external;
}

/// @title Warung: QR sales -> on-chain revenue record -> micro-loans repaid as a % of each sale.
/// @notice The AI underwriter (UNDERWRITER_ROLE) only *proposes* loans. Every limit below is enforced here,
///         so a hallucinating or jailbroken agent can never exceed them.
contract Warung is AccessControl, Pausable, ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    bytes32 public constant UNDERWRITER_ROLE = keccak256("UNDERWRITER_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    uint256 private constant BPS = 10_000;
    uint256 private constant DEAD_SHARES = 100;
    uint8 private constant MAX_TIER = 3;

    // EIP-712 typed actions so a relayer can pay gas while the user stays the actor. Funds only ever move to the merchant
    // the payer signed for, so a relayer can delay or drop a message but can never redirect, alter or replay one.
    bytes32 private constant REGISTER_TYPEHASH = keccak256("Register(address merchant,uint256 nonce,uint256 deadline)");
    bytes32 private constant PAY_TYPEHASH = keccak256("Pay(address payer,address merchant,uint256 amount,bytes32 memoHash,uint256 nonce,uint256 deadline)");
    bytes32 private constant ACCEPT_TYPEHASH = keccak256("Accept(uint256 loanId,uint256 nonce,uint256 deadline)");

    enum Status { None, Proposed, Active, Repaid, Defaulted }

    /// ponytail: fixed at deploy, no setter / timelock. Add a timelocked setter only if params must change post-launch.
    struct Params {
        uint64 epochLength; // seconds per revenue bucket
        uint64 lateAfter; // seconds of silence before an active loan can be marked late
        uint64 proposalTtl; // seconds a proposal stays acceptable
        uint8 lookbackEpochs; // trailing window for the credit limit
        uint8 minPayers; // distinct payers required before any loan
        uint16 maxLoanBps; // principal <= this % of trailing revenue
        uint16 maxFeeBps; // flat fee <= this % of principal
        uint16 maxRepayBps; // share of each sale taken for repayment
        uint16 exposureBps; // per-loan principal <= this % of pool assets
        uint16 dailyBudgetBps; // new disbursements per day <= this % of pool assets
        uint16 reserveBps; // share of fees held back as first-loss reserve
        uint128 payerEpochCap; // max revenue counted per payer per merchant per epoch
        uint128 minPayment; // smaller payments are rejected (dust sybils)
        uint128 baseTierMax; // tier 0 max principal; doubles per tier
    }

    struct Merchant {
        bool registered;
        bool defaulted;
        uint8 tier;
        uint32 payers;
        uint256 loanId; // latest loan, 0 = none
    }

    struct Loan {
        address merchant;
        Status status;
        uint16 repayBps;
        uint128 principal;
        uint128 total; // principal + fee
        uint128 repaid;
        uint64 proposedAt;
        uint64 acceptedAt;
        uint64 lastSaleAt;
        bytes32 reasonHash; // hash of the agent's written rationale (auditable, never trusted)
    }

    IERC20 public immutable asset;
    Params public p;
    IAgentReputation public reputation;
    mapping(uint256 => bool) public reported; // loan outcome already published to ERC-8004
    mapping(address => uint256) public relayNonces; // per-signer replay protection for relayed actions

    mapping(address => Merchant) public merchants;
    mapping(uint256 => Loan) public loans;
    uint256 public nextLoanId = 1;

    mapping(address => mapping(uint256 => uint256)) public epochRevenue; // merchant => epoch => counted revenue
    mapping(address => mapping(uint256 => mapping(address => uint256))) private payerCounted;
    mapping(address => mapping(address => bool)) private payerSeen;

    // LP pool
    uint256 public totalShares;
    mapping(address => uint256) public shares;
    uint256 public loanedOut; // outstanding principal
    uint256 public reserve; // first-loss reserve, excluded from LP value
    mapping(uint256 => uint256) public disbursedOnDay;

    event MerchantRegistered(address indexed merchant);
    event Sale(address indexed merchant, address indexed payer, uint256 amount, uint256 repaidCut, string memo, uint256 epoch);
    event Deposited(address indexed lp, uint256 amount, uint256 sharesMinted);
    event Withdrawn(address indexed lp, uint256 amount, uint256 sharesBurned);
    event LoanProposed(uint256 indexed loanId, address indexed merchant, uint256 principal, uint256 feeBps, uint256 repayBps, bytes32 reasonHash);
    event LoanAccepted(uint256 indexed loanId, address indexed merchant, uint256 principal);
    event LoanRepaid(uint256 indexed loanId, address indexed merchant);
    event LoanDefaulted(uint256 indexed loanId, address indexed merchant, uint256 loss);

    error NotRegistered();
    error AlreadyRegistered();
    error BadPayment();
    error MemoTooLong();
    error OpenLoanExists();
    error MerchantDefaulted();
    error TooFewPayers(uint256 have, uint256 need);
    error ExceedsCreditCap(uint256 requested, uint256 cap);
    error ExceedsExposure(uint256 requested, uint256 cap);
    error FeeTooHigh(uint256 feeBps, uint256 max);
    error RepayBpsOutOfRange(uint256 repayBps, uint256 max);
    error NotMerchant();
    error NotProposed();
    error NotActive();
    error Expired();
    error InsufficientLiquidity();
    error DailyBudgetExceeded();
    error NotLate();
    error ZeroAmount();
    error NotClosed();
    error SignatureExpired();
    error BadSignature();
    error AlreadyReported();

    constructor(IERC20 asset_, Params memory params, address admin, address underwriter, address guardian) EIP712("Warung", "1") {
        asset = asset_;
        p = params;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UNDERWRITER_ROLE, underwriter);
        _grantRole(GUARDIAN_ROLE, guardian);
    }

    // ───────────────────────── merchants & sales ─────────────────────────

    function register() external {
        _register(msg.sender);
    }

    function _register(address merchant) private {
        if (merchants[merchant].registered) revert AlreadyRegistered();
        merchants[merchant].registered = true;
        emit MerchantRegistered(merchant);
    }

    /// @notice Pay a merchant. While a loan is active, repayBps of the payment goes to the pool automatically.
    function pay(address merchant, uint256 amount, string calldata memo) external nonReentrant {
        _pay(msg.sender, merchant, amount, memo);
    }

    /// @notice One-signature payment: EIP-2612 permit + pay in a single (sponsored) tx.
    function payWithPermit(address merchant, uint256 amount, string calldata memo, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
        external
        nonReentrant
    {
        // A front-run permit must not block the payment: ignore failure, the allowance check in transferFrom decides.
        try IERC20Permit(address(asset)).permit(msg.sender, address(this), amount, deadline, v, r, s) {} catch {}
        _pay(msg.sender, merchant, amount, memo);
    }

    function _pay(address payer, address merchant, uint256 amount, string calldata memo) private {
        Merchant storage m = merchants[merchant];
        if (!m.registered) revert NotRegistered();
        if (amount < p.minPayment || payer == merchant) revert BadPayment();
        if (bytes(memo).length > 140) revert MemoTooLong(); // memo is untrusted data: emitted, never interpreted

        uint256 epoch = block.timestamp / p.epochLength;

        // Revenue record, with a per-payer cap so one wallet can't manufacture a credit history.
        uint256 seen = payerCounted[merchant][epoch][payer];
        uint256 room = seen >= p.payerEpochCap ? 0 : p.payerEpochCap - seen;
        uint256 counted = amount < room ? amount : room;
        if (counted > 0) {
            payerCounted[merchant][epoch][payer] = seen + counted;
            epochRevenue[merchant][epoch] += counted;
        }
        if (!payerSeen[merchant][payer]) {
            payerSeen[merchant][payer] = true;
            m.payers++;
        }

        // Auto-repayment split.
        uint256 cut;
        Loan storage l = loans[m.loanId];
        if (m.loanId != 0 && l.status == Status.Active) {
            cut = amount * l.repayBps / BPS;
            uint256 remaining = l.total - l.repaid;
            if (cut > remaining) cut = remaining;
            l.lastSaleAt = uint64(block.timestamp);
        }

        if (cut > 0) asset.safeTransferFrom(payer, address(this), cut);
        asset.safeTransferFrom(payer, merchant, amount - cut);
        if (cut > 0) _applyRepayment(m.loanId, l, m, cut);

        emit Sale(merchant, payer, amount, cut, memo, epoch);
    }

    function _applyRepayment(uint256 loanId, Loan storage l, Merchant storage m, uint256 chunk) private {
        uint256 before = l.repaid;
        l.repaid = uint128(before + chunk);
        // cumulative rounding keeps principal portions exact; at completion they sum to principal
        uint256 principalPart = uint256(l.repaid) * l.principal / l.total - before * l.principal / l.total;
        uint256 feePart = chunk - principalPart;
        loanedOut -= principalPart;
        reserve += feePart * p.reserveBps / BPS;

        if (l.repaid >= l.total) {
            l.status = Status.Repaid;
            if (m.tier < MAX_TIER) m.tier++;
            emit LoanRepaid(loanId, l.merchant);
        }
    }

    // ───────────────────────── credit ─────────────────────────

    function currentEpoch() public view returns (uint256) {
        return block.timestamp / p.epochLength;
    }

    function trailingRevenue(address merchant) public view returns (uint256 sum) {
        uint256 e = currentEpoch();
        uint256 n = p.lookbackEpochs;
        for (uint256 i = 0; i < n && i <= e; i++) sum += epochRevenue[merchant][e - i];
    }

    function tierMax(uint8 tier) public view returns (uint256) {
        return uint256(p.baseTierMax) << tier;
    }

    /// @notice The hard ceiling for any new loan. The agent can propose less, never more.
    function creditLimit(address merchant) public view returns (uint256) {
        Merchant storage m = merchants[merchant];
        if (!m.registered || m.defaulted) return 0;
        uint256 byRevenue = trailingRevenue(merchant) * p.maxLoanBps / BPS;
        uint256 byTier = tierMax(m.tier);
        return byRevenue < byTier ? byRevenue : byTier;
    }

    function proposeLoan(address merchant, uint256 principal, uint256 feeBps, uint256 repayBps, bytes32 reasonHash)
        external
        onlyRole(UNDERWRITER_ROLE)
        whenNotPaused
        returns (uint256 loanId)
    {
        Merchant storage m = merchants[merchant];
        if (!m.registered) revert NotRegistered();
        if (m.defaulted) revert MerchantDefaulted();
        if (principal == 0) revert ZeroAmount();
        if (_hasOpenLoan(m)) revert OpenLoanExists();
        if (m.payers < p.minPayers) revert TooFewPayers(m.payers, p.minPayers);

        uint256 cap = creditLimit(merchant);
        if (principal > cap) revert ExceedsCreditCap(principal, cap);
        if (feeBps > p.maxFeeBps) revert FeeTooHigh(feeBps, p.maxFeeBps);
        if (repayBps == 0 || repayBps > p.maxRepayBps) revert RepayBpsOutOfRange(repayBps, p.maxRepayBps);
        uint256 exposureCap = totalAssets() * p.exposureBps / BPS;
        if (principal > exposureCap) revert ExceedsExposure(principal, exposureCap);

        loanId = nextLoanId++;
        loans[loanId] = Loan({
            merchant: merchant,
            status: Status.Proposed,
            repayBps: uint16(repayBps),
            principal: uint128(principal),
            total: uint128(principal + principal * feeBps / BPS),
            repaid: 0,
            proposedAt: uint64(block.timestamp),
            acceptedAt: 0,
            lastSaleAt: 0,
            reasonHash: reasonHash
        });
        m.loanId = loanId;
        emit LoanProposed(loanId, merchant, principal, feeBps, repayBps, reasonHash);
    }

    /// @notice Only the merchant can accept, from their own wallet, after reading terms from the chain.
    function acceptLoan(uint256 loanId) external nonReentrant whenNotPaused {
        _accept(msg.sender, loanId);
    }

    function _accept(address merchant, uint256 loanId) private {
        Loan storage l = loans[loanId];
        if (l.merchant != merchant) revert NotMerchant();
        if (l.status != Status.Proposed) revert NotProposed();
        if (block.timestamp > l.proposedAt + p.proposalTtl) revert Expired();
        if (idle() < l.principal) revert InsufficientLiquidity();

        uint256 day = block.timestamp / 1 days;
        disbursedOnDay[day] += l.principal;
        if (disbursedOnDay[day] > totalAssets() * p.dailyBudgetBps / BPS) revert DailyBudgetExceeded();

        l.status = Status.Active;
        l.acceptedAt = uint64(block.timestamp);
        loanedOut += l.principal;
        asset.safeTransfer(merchant, l.principal);
        emit LoanAccepted(loanId, merchant, l.principal);
    }

    function _hasOpenLoan(Merchant storage m) private view returns (bool) {
        if (m.loanId == 0) return false;
        Loan storage l = loans[m.loanId];
        if (l.status == Status.Active) return true;
        return l.status == Status.Proposed && block.timestamp <= l.proposedAt + p.proposalTtl;
    }

    /// @notice Anyone can write off a loan whose merchant went silent. Limit drops to zero; reserve absorbs loss first.
    function markLate(uint256 loanId) external {
        Loan storage l = loans[loanId];
        if (l.status != Status.Active) revert NotActive();
        uint256 lastActivity = l.lastSaleAt > l.acceptedAt ? l.lastSaleAt : l.acceptedAt;
        if (block.timestamp <= lastActivity + p.lateAfter) revert NotLate();

        uint256 outstanding = l.principal - uint256(l.repaid) * l.principal / l.total;
        loanedOut -= outstanding;
        uint256 covered = reserve < outstanding ? reserve : outstanding;
        reserve -= covered;

        l.status = Status.Defaulted;
        Merchant storage m = merchants[l.merchant];
        m.defaulted = true;
        m.tier = 0;
        emit LoanDefaulted(loanId, l.merchant, outstanding);
    }

    /// @notice Publish a closed loan's outcome to the underwriter's ERC-8004 reputation. Permissionless, once per loan.
    /// @dev Deliberately NOT part of pay()/markLate(): a customer's payment must stay cheap, and a broken or expensive
    ///      registry must never be able to touch repayment, write-offs or the pool. A keeper (or anyone) calls this after.
    function reportOutcome(uint256 loanId) external {
        Loan storage l = loans[loanId];
        if (l.status != Status.Repaid && l.status != Status.Defaulted) revert NotClosed();
        if (reported[loanId] || address(reputation) == address(0)) revert AlreadyReported();
        reported[loanId] = true; // effects before the external call
        reputation.recordOutcome(bytes32(loanId), l.status == Status.Repaid);
    }

    // ───────────────────────── gasless (relayed) actions ─────────────────────────

    function _verify(address signer, bytes32 structHash, uint256 deadline, bytes calldata sig) private view {
        if (block.timestamp > deadline) revert SignatureExpired();
        if (!SignatureChecker.isValidSignatureNow(signer, _hashTypedDataV4(structHash), sig)) revert BadSignature();
    }

    function registerFor(address merchant, uint256 deadline, bytes calldata sig) external {
        _verify(merchant, keccak256(abi.encode(REGISTER_TYPEHASH, merchant, relayNonces[merchant]++, deadline)), deadline, sig);
        _register(merchant);
    }

    /// @notice Relayed payment. `sig` authorizes (payer, merchant, amount, memo); the permit authorizes the token pull.
    function payFor(
        address payer, address merchant, uint256 amount, string calldata memo, uint256 deadline, bytes calldata sig,
        uint256 permitDeadline, uint8 v, bytes32 r, bytes32 s
    ) external nonReentrant {
        _verify(payer, keccak256(abi.encode(PAY_TYPEHASH, payer, merchant, amount, keccak256(bytes(memo)), relayNonces[payer]++, deadline)), deadline, sig);
        try IERC20Permit(address(asset)).permit(payer, address(this), amount, permitDeadline, v, r, s) {} catch {}
        _pay(payer, merchant, amount, memo);
    }

    function acceptLoanFor(uint256 loanId, uint256 deadline, bytes calldata sig) external nonReentrant whenNotPaused {
        address merchant = loans[loanId].merchant;
        _verify(merchant, keccak256(abi.encode(ACCEPT_TYPEHASH, loanId, relayNonces[merchant]++, deadline)), deadline, sig);
        _accept(merchant, loanId);
    }

    // ───────────────────────── LP pool ─────────────────────────

    /// @notice Pool value excluding the first-loss reserve.
    function totalAssets() public view returns (uint256) {
        return asset.balanceOf(address(this)) + loanedOut - reserve;
    }

    /// @notice Cash that can leave the pool right now.
    function idle() public view returns (uint256) {
        return asset.balanceOf(address(this)) - reserve;
    }

    function deposit(uint256 amount) external nonReentrant whenNotPaused returns (uint256 minted) {
        if (amount == 0) revert ZeroAmount();
        if (totalShares == 0) {
            if (amount <= DEAD_SHARES) revert ZeroAmount();
            minted = amount - DEAD_SHARES;
            shares[address(0)] = DEAD_SHARES; // burn a sliver to defuse first-depositor inflation
            totalShares = amount;
        } else {
            minted = amount * totalShares / totalAssets();
            totalShares += minted;
        }
        shares[msg.sender] += minted;
        asset.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, amount, minted);
    }

    /// @dev Withdrawals stay open while paused: the guardian can halt new risk, never trap LP funds.
    function withdraw(uint256 sharesIn) external nonReentrant returns (uint256 amount) {
        if (sharesIn == 0) revert ZeroAmount();
        amount = sharesIn * totalAssets() / totalShares;
        if (amount > idle()) revert InsufficientLiquidity();
        shares[msg.sender] -= sharesIn;
        totalShares -= sharesIn;
        asset.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount, sharesIn);
    }

    // ───────────────────────── admin ─────────────────────────

    /// @dev Pauses new deposits, proposals and acceptances. Payments and withdrawals keep working.
    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function setReputation(IAgentReputation r) external onlyRole(DEFAULT_ADMIN_ROLE) {
        reputation = r;
    }
}
