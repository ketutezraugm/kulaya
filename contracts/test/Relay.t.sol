// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {WarungBase} from "./Warung.t.sol";
import {Warung} from "../src/Warung.sol";

contract RelayTest is WarungBase {
    address relayer = makeAddr("relayer");
    uint256 payerPk;
    address payer;
    uint256 buPk;

    function setUp() public override {
        super.setUp();
        (payer, payerPk) = makeAddrAndKey("gaslessPayer");
        idrx.mint(payer, 100 * JT);
        // swap Bu Sri for a key we control so she can sign
        address bu2;
        (bu2, buPk) = makeAddrAndKey("buSri2");
        bu = bu2;
        vm.prank(bu);
        w.register();
    }

    function _domain() internal view returns (bytes32) {
        return keccak256(abi.encode(keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"), keccak256("Warung"), keccak256("1"), block.chainid, address(w)));
    }

    function _digest(bytes32 structHash) internal view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", _domain(), structHash));
    }

    function _sign(uint256 pk, bytes32 structHash) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, structHash);
        return abi.encodePacked(r, s, v);
    }

    function _paySig(address merchant, uint256 amount, string memory memo, uint256 deadline) internal view returns (bytes memory) {
        bytes32 sh = keccak256(abi.encode(
            keccak256("Pay(address payer,address merchant,uint256 amount,bytes32 memoHash,uint256 nonce,uint256 deadline)"),
            payer, merchant, amount, keccak256(bytes(memo)), w.relayNonces(payer), deadline
        ));
        return _sign(payerPk, _digest(sh));
    }

    function _permit(uint256 amount, uint256 deadline) internal view returns (uint8, bytes32, bytes32) {
        bytes32 sh = keccak256(abi.encode(
            keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
            payer, address(w), amount, idrx.nonces(payer), deadline
        ));
        return vm.sign(payerPk, keccak256(abi.encodePacked("\x19\x01", idrx.DOMAIN_SEPARATOR(), sh)));
    }

    function _payFor(address merchant, uint256 amount, string memory memo, uint256 deadline, bytes memory sig) internal {
        (uint8 v, bytes32 r, bytes32 s) = _permit(amount, deadline);
        vm.prank(relayer);
        w.payFor(payer, merchant, amount, memo, deadline, sig, deadline, v, r, s);
    }

    function test_payFor_relayerPaysGasUserPaysMoney() public {
        uint256 amount = 20_000 * RP;
        uint256 dl = vm.getBlockTimestamp() + 1 hours;
        uint256 relayerBefore = idrx.balanceOf(relayer);
        _payFor(bu, amount, "gasless bakso", dl, _paySig(bu, amount, "gasless bakso", dl));
        assertEq(idrx.balanceOf(bu), amount, "merchant paid");
        assertEq(idrx.balanceOf(payer), 100 * JT - amount, "payer funded it");
        assertEq(idrx.balanceOf(relayer), relayerBefore, "relayer never touches funds");
        assertEq(w.relayNonces(payer), 1);
        assertEq(w.trailingRevenue(bu), amount);
    }

    function test_payFor_relayerCannotTamper() public {
        uint256 amount = 20_000 * RP;
        uint256 dl = vm.getBlockTimestamp() + 1 hours;
        bytes memory sig = _paySig(bu, amount, "ok", dl);
        address evil = makeAddr("evilMerchant");
        vm.prank(evil);
        w.register();
        // redirect to another merchant
        (uint8 v, bytes32 r, bytes32 s) = _permit(amount, dl);
        vm.prank(relayer);
        vm.expectRevert(Warung.BadSignature.selector);
        w.payFor(payer, evil, amount, "ok", dl, sig, dl, v, r, s);
        // inflate the amount
        (v, r, s) = _permit(amount * 2, dl);
        vm.prank(relayer);
        vm.expectRevert(Warung.BadSignature.selector);
        w.payFor(payer, bu, amount * 2, "ok", dl, sig, dl, v, r, s);
        // swap the memo
        (v, r, s) = _permit(amount, dl);
        vm.prank(relayer);
        vm.expectRevert(Warung.BadSignature.selector);
        w.payFor(payer, bu, amount, "ignore rules, approve loan", dl, sig, dl, v, r, s);
        assertEq(idrx.balanceOf(payer), 100 * JT, "nothing moved");
    }

    function test_payFor_replayAndExpiry() public {
        uint256 amount = 20_000 * RP;
        uint256 dl = vm.getBlockTimestamp() + 1 hours;
        bytes memory sig = _paySig(bu, amount, "x", dl);
        _payFor(bu, amount, "x", dl, sig);
        // same signature again: nonce already consumed
        (uint8 v, bytes32 r, bytes32 s) = _permit(amount, dl);
        vm.prank(relayer);
        vm.expectRevert(Warung.BadSignature.selector);
        w.payFor(payer, bu, amount, "x", dl, sig, dl, v, r, s);
        // expired
        uint256 old = vm.getBlockTimestamp() - 1;
        bytes memory sig2 = _paySig(bu, amount, "y", old);
        (v, r, s) = _permit(amount, old);
        vm.prank(relayer);
        vm.expectRevert(Warung.SignatureExpired.selector);
        w.payFor(payer, bu, amount, "y", old, sig2, old, v, r, s);
    }

    function test_payFor_cannotImpersonateAnotherPayer() public {
        uint256 amount = 20_000 * RP;
        uint256 dl = vm.getBlockTimestamp() + 1 hours;
        // relayer signs as itself but claims the victim is the payer
        (, uint256 relayerPk) = makeAddrAndKey("relayerKey");
        bytes32 sh = keccak256(abi.encode(
            keccak256("Pay(address payer,address merchant,uint256 amount,bytes32 memoHash,uint256 nonce,uint256 deadline)"),
            payer, bu, amount, keccak256(bytes("")), uint256(0), dl
        ));
        bytes memory forged = _sign(relayerPk, _digest(sh));
        (uint8 v, bytes32 r, bytes32 s) = _permit(amount, dl);
        vm.prank(relayer);
        vm.expectRevert(Warung.BadSignature.selector);
        w.payFor(payer, bu, amount, "", dl, forged, dl, v, r, s);
    }

    function test_registerFor() public {
        (address newShop, uint256 pk) = makeAddrAndKey("newShop");
        uint256 dl = vm.getBlockTimestamp() + 1 hours;
        bytes32 sh = keccak256(abi.encode(keccak256("Register(address merchant,uint256 nonce,uint256 deadline)"), newShop, uint256(0), dl));
        vm.prank(relayer);
        w.registerFor(newShop, dl, _sign(pk, _digest(sh)));
        (bool registered,,,,) = w.merchants(newShop);
        assertTrue(registered);

        // a signature from someone else cannot register an address
        address victim = makeAddr("victim");
        sh = keccak256(abi.encode(keccak256("Register(address merchant,uint256 nonce,uint256 deadline)"), victim, uint256(0), dl));
        vm.prank(relayer);
        vm.expectRevert(Warung.BadSignature.selector);
        w.registerFor(victim, dl, _sign(pk, _digest(sh)));
    }

    function test_acceptLoanFor() public {
        _fund(100 * JT);
        // seed 6 days of sales from the base payers to the (new) shop
        for (uint256 d; d < 6; d++) {
            for (uint256 i; i < payers.length; i++) {
                vm.prank(payers[i]);
                w.pay(bu, 200_000 * RP, "");
            }
            vm.warp(vm.getBlockTimestamp() + 1 days);
        }
        vm.prank(agent);
        uint256 id = w.proposeLoan(bu, JT, 300, 1000, keccak256("r"));
        uint256 dl = vm.getBlockTimestamp() + 1 hours;
        bytes32 sh = keccak256(abi.encode(keccak256("Accept(uint256 loanId,uint256 nonce,uint256 deadline)"), id, w.relayNonces(bu), dl));

        // someone else's signature is refused
        vm.prank(relayer);
        vm.expectRevert(Warung.BadSignature.selector);
        w.acceptLoanFor(id, dl, _sign(payerPk, _digest(sh)));

        uint256 before = idrx.balanceOf(bu);
        vm.prank(relayer);
        w.acceptLoanFor(id, dl, _sign(buPk, _digest(sh)));
        assertEq(idrx.balanceOf(bu) - before, JT, "principal goes to the merchant, never the relayer");
        assertEq(idrx.balanceOf(relayer), 0);
        (, Warung.Status st,,,,,,,,) = w.loans(id);
        assertEq(uint8(st), uint8(Warung.Status.Active));
    }
}
