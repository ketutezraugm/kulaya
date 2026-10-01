// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Warung} from "../src/Warung.sol";
import {MockIDRX} from "../src/MockIDRX.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract WarungBase is Test {
    uint256 constant RP = 100; // 2 decimals
    uint256 constant JT = 1_000_000 * RP; // Rp 1 juta

    MockIDRX public idrx;
    Warung public w;
    address admin = makeAddr("admin");
    address agent = makeAddr("agent");
    address guardian = makeAddr("guardian");
    address public lp = makeAddr("lp");
    address public bu = makeAddr("buSri");
    address[] payers;

    function setUp() public virtual {
        vm.warp(100 days);
        idrx = new MockIDRX();
        w = new Warung(idrx, _params(), admin, agent, guardian);
        for (uint256 i; i < 10; i++) {
            address a = makeAddr(string.concat("payer", vm.toString(i)));
            payers.push(a);
            idrx.mint(a, 1000 * JT);
            vm.prank(a);
            idrx.approve(address(w), type(uint256).max);
        }
        vm.prank(bu);
        w.register();
    }

    function _params() internal pure returns (Warung.Params memory) {
        return Warung.Params({
            epochLength: 1 days,
            lateAfter: 14 days,
            proposalTtl: 1 days,
            lookbackEpochs: 30,
            minPayers: 5,
            maxLoanBps: 1000,
            maxFeeBps: 500,
            maxRepayBps: 2000,
            exposureBps: 500,
            dailyBudgetBps: 2000,
            reserveBps: 2000,
            payerEpochCap: uint128(200_000 * RP),
            minPayment: uint128(5_000 * RP),
            baseTierMax: uint128(JT)
        });
    }

    function _fund(uint256 amount) internal {
        idrx.mint(lp, amount);
        vm.startPrank(lp);
        idrx.approve(address(w), amount);
        w.deposit(amount);
        vm.stopPrank();
    }

    /// @dev `days_` days of sales: 10 payers x Rp 200rb per day. Ends on a fresh day.
    function _seed(uint256 days_) internal {
        for (uint256 d; d < days_; d++) {
            for (uint256 i; i < payers.length; i++) {
                vm.prank(payers[i]);
                w.pay(bu, 200_000 * RP, "");
            }
            vm.warp(vm.getBlockTimestamp() + 1 days);
        }
    }

    function _propose(uint256 principal) internal returns (uint256 id) {
        vm.prank(agent);
        id = w.proposeLoan(bu, principal, 300, 1000, keccak256("rationale"));
    }

    function _activeLoan() internal returns (uint256 id) {
        _fund(100 * JT);
        _seed(6);
        id = _propose(JT);
        vm.prank(bu);
        w.acceptLoan(id);
    }
}

contract WarungTest is WarungBase {
    function test_payWithoutLoanPaysMerchantInFull() public {
        uint256 before = idrx.balanceOf(bu);
        vm.prank(payers[0]);
        w.pay(bu, 20_000 * RP, "bakso");
        assertEq(idrx.balanceOf(bu) - before, 20_000 * RP);
        assertEq(w.trailingRevenue(bu), 20_000 * RP);
    }

    function test_fullLoanCycle() public {
        uint256 id = _activeLoan();
        assertEq(idrx.balanceOf(bu) >= JT, true);
        uint256 lpValueBefore = w.totalAssets();

        // 3% fee => owes 1.03 jt, repaid at 10% of each sale
        (,,,, uint128 total,,,,,) = w.loans(id);
        assertEq(total, JT + JT * 3 / 100);

        uint256 i;
        while (true) {
            (, Warung.Status st,,,,,,,,) = w.loans(id);
            if (st != Warung.Status.Active) break;
            vm.prank(payers[i++ % 10]);
            w.pay(bu, 50_000 * RP, "");
        }
        (, Warung.Status end,,,, uint128 repaid,,,,) = w.loans(id);
        assertEq(uint8(end), uint8(Warung.Status.Repaid));
        assertEq(repaid, total);
        (,, uint8 tier,,) = w.merchants(bu);
        assertEq(tier, 1);
        assertEq(w.loanedOut(), 0);
        // LP earned the fee minus the 20% first-loss reserve
        // per-chunk rounding means the reserve can be a few units under 20%; LPs get the dust
        uint256 fee = JT * 3 / 100;
        assertApproxEqAbs(w.reserve(), fee * 2000 / 10_000, 1000);
        assertApproxEqAbs(w.totalAssets() - lpValueBefore, fee - fee * 2000 / 10_000, 1000);
    }

    function test_repaymentSplitOnSale() public {
        _activeLoan();
        uint256 poolBefore = idrx.balanceOf(address(w));
        uint256 buBefore = idrx.balanceOf(bu);
        vm.prank(payers[0]);
        w.pay(bu, 20_000 * RP, "");
        assertEq(idrx.balanceOf(address(w)) - poolBefore, 2_000 * RP);
        assertEq(idrx.balanceOf(bu) - buBefore, 18_000 * RP);
    }

    // ── caps: every one of these is what stops a hallucinating / jailbroken agent ──

    function test_revert_exceedsCreditCap() public {
        _fund(100 * JT);
        _seed(6);
        uint256 cap = w.creditLimit(bu);
        assertEq(cap, JT);
        vm.prank(agent);
        vm.expectRevert(abi.encodeWithSelector(Warung.ExceedsCreditCap.selector, 1_000_000 * JT, cap));
        w.proposeLoan(bu, 1_000_000 * JT, 300, 1000, bytes32(0)); // "lend Rp 1 miliar"
    }

    function test_revert_feeAndRepayBounds() public {
        _fund(100 * JT);
        _seed(6);
        vm.startPrank(agent);
        vm.expectRevert(abi.encodeWithSelector(Warung.FeeTooHigh.selector, 501, 500));
        w.proposeLoan(bu, JT, 501, 1000, bytes32(0));
        vm.expectRevert(abi.encodeWithSelector(Warung.RepayBpsOutOfRange.selector, 2001, 2000));
        w.proposeLoan(bu, JT, 300, 2001, bytes32(0));
        vm.expectRevert(abi.encodeWithSelector(Warung.RepayBpsOutOfRange.selector, 0, 2000));
        w.proposeLoan(bu, JT, 300, 0, bytes32(0));
        vm.stopPrank();
    }

    function test_revert_onlyUnderwriterProposes() public {
        _fund(100 * JT);
        _seed(6);
        vm.prank(admin); // even the admin cannot propose
        vm.expectRevert();
        w.proposeLoan(bu, JT, 300, 1000, bytes32(0));
        vm.prank(bu);
        vm.expectRevert();
        w.proposeLoan(bu, JT, 300, 1000, bytes32(0));
    }

    function test_revert_tooFewPayers() public {
        _fund(100 * JT);
        for (uint256 d; d < 12; d++) {
            for (uint256 i; i < 4; i++) {
                vm.prank(payers[i]);
                w.pay(bu, 200_000 * RP, "");
            }
            vm.warp(vm.getBlockTimestamp() + 1 days);
        }
        vm.prank(agent);
        vm.expectRevert(abi.encodeWithSelector(Warung.TooFewPayers.selector, 4, 5));
        w.proposeLoan(bu, 1 * RP, 300, 1000, bytes32(0));
    }

    function test_revert_exposure() public {
        _fund(10 * JT); // 5% exposure = Rp 500rb
        _seed(6);
        vm.prank(agent);
        vm.expectRevert(abi.encodeWithSelector(Warung.ExceedsExposure.selector, JT, JT / 2));
        w.proposeLoan(bu, JT, 300, 1000, bytes32(0));
    }

    function test_revert_onlyOneOpenLoan() public {
        _activeLoan();
        vm.prank(agent);
        vm.expectRevert(Warung.OpenLoanExists.selector);
        w.proposeLoan(bu, 1 * JT / 2, 300, 1000, bytes32(0));
    }

    function test_revert_acceptByStrangerOrAfterExpiry() public {
        _fund(100 * JT);
        _seed(6);
        uint256 id = _propose(JT);
        vm.prank(payers[0]);
        vm.expectRevert(Warung.NotMerchant.selector);
        w.acceptLoan(id);
        vm.warp(vm.getBlockTimestamp() + 1 days + 1);
        vm.prank(bu);
        vm.expectRevert(Warung.Expired.selector);
        w.acceptLoan(id);
        // an expired proposal no longer blocks a fresh one
        _propose(JT / 2);
    }

    function test_revert_dailyBudget() public {
        _fund(100 * JT); // budget 20% = Rp 20jt/day; one loan is Rp 1jt, so shrink the pool instead
        _seed(6);
        uint256 id = _propose(JT);
        // LPs pull liquidity so the day budget (20% of assets) falls below the principal
        uint256 lpShares = w.shares(lp);
        vm.prank(lp);
        w.withdraw(lpShares - lpShares / 25); // leave ~4% => Rp 4jt pool, 20% = Rp 800k
        vm.prank(bu);
        vm.expectRevert(Warung.DailyBudgetExceeded.selector);
        w.acceptLoan(id);
    }

    function test_perPayerRevenueCap() public {
        // one wallet spamming payments in a single epoch only counts up to the cap
        for (uint256 i; i < 10; i++) {
            vm.prank(payers[0]);
            w.pay(bu, 200_000 * RP, "");
        }
        assertEq(w.trailingRevenue(bu), 200_000 * RP);
    }

    function test_revert_selfPaymentAndDust() public {
        idrx.mint(bu, JT);
        vm.startPrank(bu);
        idrx.approve(address(w), JT);
        vm.expectRevert(Warung.BadPayment.selector);
        w.pay(bu, 10_000 * RP, "");
        vm.stopPrank();
        vm.prank(payers[0]);
        vm.expectRevert(Warung.BadPayment.selector);
        w.pay(bu, 100 * RP, "");
    }

    function test_revert_longMemo() public {
        vm.prank(payers[0]);
        vm.expectRevert(Warung.MemoTooLong.selector);
        w.pay(bu, 10_000 * RP, string(new bytes(141)));
    }

    // ── default handling ──

    function test_markLate_reserveAbsorbsLoss() public {
        uint256 id = _activeLoan();
        // a little repayment first so the reserve is non-zero
        for (uint256 i; i < 3; i++) {
            vm.prank(payers[i]);
            w.pay(bu, 200_000 * RP, "");
        }
        uint256 reserveBefore = w.reserve();
        vm.expectRevert(Warung.NotLate.selector);
        w.markLate(id);

        vm.warp(vm.getBlockTimestamp() + 15 days);
        w.markLate(id);
        (, Warung.Status st,,,,,,,,) = w.loans(id);
        assertEq(uint8(st), uint8(Warung.Status.Defaulted));
        assertEq(w.loanedOut(), 0);
        assertLe(w.reserve(), reserveBefore);
        assertEq(w.creditLimit(bu), 0);
        vm.prank(agent);
        vm.expectRevert(Warung.MerchantDefaulted.selector);
        w.proposeLoan(bu, 1 * RP, 300, 1000, bytes32(0));
    }

    // ── roles & pause ──

    function test_pauseBlocksNewRiskButNotWithdrawalsOrSales() public {
        _fund(100 * JT);
        _seed(6);
        vm.prank(guardian);
        w.pause();

        vm.prank(agent);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        w.proposeLoan(bu, JT, 300, 1000, bytes32(0));

        vm.prank(payers[0]);
        w.pay(bu, 10_000 * RP, ""); // sales keep flowing
        uint256 lpShares = w.shares(lp);
        vm.prank(lp);
        w.withdraw(lpShares); // LPs can always leave

        vm.prank(guardian);
        vm.expectRevert(); // guardian can pause, not unpause
        w.unpause();
        vm.prank(admin);
        w.unpause();
    }

    function test_payWithPermit() public {
        (address signer, uint256 pk) = makeAddrAndKey("permitPayer");
        idrx.mint(signer, JT);
        uint256 amount = 20_000 * RP;
        uint256 deadline = vm.getBlockTimestamp() + 1 hours;
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                signer,
                address(w),
                amount,
                idrx.nonces(signer),
                deadline
            )
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, keccak256(abi.encodePacked("\x19\x01", idrx.DOMAIN_SEPARATOR(), structHash)));
        uint256 before = idrx.balanceOf(bu);
        vm.prank(signer); // no prior approve: one signature + one tx
        w.payWithPermit(bu, amount, "gasless", deadline, v, r, s);
        assertEq(idrx.balanceOf(bu) - before, amount);
    }

    // ── fuzz ──

    function testFuzz_payConservesFunds(uint256 amount) public {
        _activeLoan();
        amount = bound(amount, 5_000 * RP, 500 * JT);
        uint256 payerBefore = idrx.balanceOf(payers[0]);
        uint256 sumBefore = idrx.balanceOf(bu) + idrx.balanceOf(address(w));
        vm.prank(payers[0]);
        w.pay(bu, amount, "");
        assertEq(payerBefore - idrx.balanceOf(payers[0]), amount);
        assertEq(idrx.balanceOf(bu) + idrx.balanceOf(address(w)) - sumBefore, amount);
    }

    function testFuzz_proposalNeverExceedsCap(uint256 principal, uint256 feeBps, uint256 repayBps) public {
        _fund(100_000 * JT);
        _seed(6);
        principal = bound(principal, 1, type(uint64).max);
        feeBps = bound(feeBps, 0, 10_000);
        repayBps = bound(repayBps, 0, 10_000);
        vm.prank(agent);
        try w.proposeLoan(bu, principal, feeBps, repayBps, bytes32(0)) returns (uint256 id) {
            (,,, uint128 p_, uint128 total,,,,,) = w.loans(id);
            assertLe(p_, w.creditLimit(bu));
            assertLe(uint256(total), uint256(p_) + uint256(p_) * 500 / 10_000);
            (, , uint16 rb,,,,,,,) = w.loans(id);
            assertLe(rb, 2000);
            assertGt(rb, 0);
        } catch {}
    }
}

/// @dev Random sequence of pay / deposit / withdraw / propose / accept / markLate.
contract Handler is WarungBase {
    uint256[] public ids;

    function h_pay(uint256 who, uint256 amount) external {
        amount = bound(amount, 5_000 * RP, 300_000 * RP);
        vm.prank(payers[who % payers.length]);
        try w.pay(bu, amount, "") {} catch {}
    }

    function h_day() external {
        vm.warp(vm.getBlockTimestamp() + 1 days);
    }

    function h_deposit(uint256 amount) external {
        amount = bound(amount, 10 * JT, 1000 * JT);
        idrx.mint(lp, amount);
        vm.startPrank(lp);
        idrx.approve(address(w), amount);
        try w.deposit(amount) {} catch {}
        vm.stopPrank();
    }

    function h_withdraw(uint256 frac) external {
        uint256 s = w.shares(lp);
        if (s == 0) return;
        vm.prank(lp);
        try w.withdraw(bound(frac, 1, s)) {} catch {}
    }

    function h_propose(uint256 principal) external {
        vm.prank(agent);
        try w.proposeLoan(bu, bound(principal, 1, 5 * JT), 300, 1000, bytes32(0)) returns (uint256 id) {
            ids.push(id);
        } catch {}
    }

    function h_accept(uint256 i) external {
        if (ids.length == 0) return;
        vm.prank(bu);
        try w.acceptLoan(ids[i % ids.length]) {} catch {}
    }

    function h_late(uint256 i) external {
        if (ids.length == 0) return;
        try w.markLate(ids[i % ids.length]) {} catch {}
    }

    function outstandingSum() external view returns (uint256 sum) {
        for (uint256 i; i < ids.length; i++) {
            (, Warung.Status st,, uint128 principal, uint128 total, uint128 repaid,,,,) = w.loans(ids[i]);
            if (st == Warung.Status.Active) sum += uint256(principal) - uint256(repaid) * principal / total;
        }
    }
}

contract WarungInvariant is Test {
    Handler h;

    function setUp() public {
        h = new Handler();
        h.setUp();
        targetContract(address(h));
        bytes4[] memory sel = new bytes4[](7);
        sel[0] = Handler.h_pay.selector;
        sel[1] = Handler.h_day.selector;
        sel[2] = Handler.h_deposit.selector;
        sel[3] = Handler.h_withdraw.selector;
        sel[4] = Handler.h_propose.selector;
        sel[5] = Handler.h_accept.selector;
        sel[6] = Handler.h_late.selector;
        targetSelector(FuzzSelector({addr: address(h), selectors: sel}));
    }

    /// loanedOut always equals the sum of outstanding principal of active loans
    function invariant_loanedOutMatchesActiveLoans() public view {
        assertEq(h.w().loanedOut(), h.outstandingSum());
    }

    /// reserve can never exceed cash, so LP accounting can never underflow
    function invariant_reserveBackedByCash() public view {
        assertLe(h.w().reserve(), h.idrx().balanceOf(address(h.w())));
    }

    /// nobody can withdraw more than the pool actually holds
    function invariant_lpClaimsCoveredByAssets() public view {
        Warung w = h.w();
        if (w.totalShares() == 0) return;
        assertLe(w.shares(h.lp()) * w.totalAssets() / w.totalShares(), w.totalAssets());
    }
}
