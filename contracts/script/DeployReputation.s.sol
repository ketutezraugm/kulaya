// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Warung} from "../src/Warung.sol";
import {ReputationAdapter, IReputationRegistry} from "../src/ReputationAdapter.sol";

/// env: PRIVATE_KEY (Warung admin), WARUNG_ADDRESS, AGENT_ID, ERC8004_REPUTATION_REGISTRY
contract DeployReputation is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        Warung w = Warung(vm.envAddress("WARUNG_ADDRESS"));
        vm.startBroadcast(pk);
        ReputationAdapter a = new ReputationAdapter(
            IReputationRegistry(vm.envAddress("ERC8004_REPUTATION_REGISTRY")), vm.envUint("AGENT_ID"), address(w)
        );
        w.setReputation(a);
        vm.stopBroadcast();
        console.log("ReputationAdapter", address(a));
    }
}
