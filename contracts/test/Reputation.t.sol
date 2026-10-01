// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {WarungBase} from "./Warung.t.sol";
import {Warung} from "../src/Warung.sol";
import {ReputationAdapter, IReputationRegistry} from "../src/ReputationAdapter.sol";

contract MockRegistry is IReputationRegistry {
    uint256 public calls;
    uint256 public lastAgent;
    int128 public lastValue;
    string public lastTag2;
    bytes32 public lastRef;
    address public lastClient;
    bool public broken;

    function setBroken(bool b) external {
        broken = b;
    }

    function giveFeedback(uint256 agentId, int128 value, uint8, string calldata, string calldata tag2, string calldata, string calldata, bytes32 ref)
        external
    {
        require(!broken, "registry down");
        calls++;
        lastAgent = agentId;
        lastValue = value;
        lastTag2 = tag2;
        lastRef = ref;
        lastClient = msg.sender;
    }
}

contract ReputationTest is WarungBase {
    MockRegistry reg;
    ReputationAdapter adapter;

    function setUp() public override {
        super.setUp();
        reg = new MockRegistry();
        adapter = new ReputationAdapter(reg, 42, address(w));
        vm.prank(admin);
        w.setReputation(adapter);
    }

    function _repay(uint256 id) internal {
        uint256 i;
        while (true) {
            (, Warung.Status st,,,,,,,,) = w.loans(id);
            if (st != Warung.Status.Active) break;
            vm.prank(payers[i++ % 10]);
            w.pay(bu, 50_000 * RP, "");
        }
    }

    function test_repaidLoanPostsScore100() public {
        uint256 id = _activeLoan();
        _repay(id);
        assertEq(reg.calls(), 0, "repayment itself never touches the registry");
        w.reportOutcome(id); // permissionless keeper call
        assertEq(reg.calls(), 1);
        assertEq(reg.lastAgent(), 42);
        assertEq(reg.lastValue(), 100);
        assertEq(reg.lastTag2(), "repaid");
        assertEq(reg.lastRef(), bytes32(id));
        assertEq(reg.lastClient(), address(adapter));
    }

    function test_defaultPostsScore0() public {
        uint256 id = _activeLoan();
        vm.warp(vm.getBlockTimestamp() + 15 days);
        w.markLate(id);
        w.reportOutcome(id);
        assertEq(reg.lastValue(), 0);
        assertEq(reg.lastTag2(), "default");
    }

    function test_brokenRegistryNeverBlocksRepaymentOrWriteOff() public {
        reg.setBroken(true);
        uint256 id = _activeLoan();
        _repay(id); // money flows are independent of the registry
        (, Warung.Status st,,,,,,,,) = w.loans(id);
        assertEq(uint8(st), uint8(Warung.Status.Repaid));
        vm.expectRevert(bytes("registry down"));
        w.reportOutcome(id);
        assertFalse(w.reported(id), "a failed report can be retried");
        reg.setBroken(false);
        w.reportOutcome(id);
        assertEq(reg.calls(), 1);
    }

    function test_reportOnlyOnceAndOnlyWhenClosed() public {
        uint256 id = _activeLoan();
        vm.expectRevert(Warung.NotClosed.selector);
        w.reportOutcome(id); // loan still active
        _repay(id);
        w.reportOutcome(id);
        vm.expectRevert(Warung.AlreadyReported.selector);
        w.reportOutcome(id);
        assertEq(reg.calls(), 1);
    }

    function test_closingSaleCostsAboutAsMuchAsAnyOtherSale() public {
        uint256 id = _activeLoan();
        uint256 i;
        uint256 gasNormal;
        while (true) {
            (, Warung.Status st,,,,,,,,) = w.loans(id);
            if (st != Warung.Status.Active) break;
            vm.prank(payers[i++ % 10]);
            uint256 g = gasleft();
            w.pay(bu, 50_000 * RP, "");
            gasNormal = g - gasleft();
        }
        assertLt(gasNormal, 250_000, "closing a loan must not be a gas trap for the customer");
    }

    function test_onlyWarungCanWriteReputation() public {
        vm.expectRevert(ReputationAdapter.OnlyWarung.selector);
        adapter.recordOutcome(bytes32(uint256(1)), true);
    }

    function test_onlyAdminSetsReputation() public {
        vm.prank(agent); // the AI key cannot redirect its own reputation reporting
        vm.expectRevert();
        w.setReputation(adapter);
    }
}
