// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Warung} from "../src/Warung.sol";
import {MockIDRX} from "../src/MockIDRX.sol";

/// forge script script/Deploy.s.sol --rpc-url bsc_testnet --broadcast
/// env: PRIVATE_KEY (deployer = admin + guardian), AGENT_ADDRESS (underwriter, propose-only, holds no funds)
contract Deploy is Script {
    uint256 constant RP = 100; // IDRX has 2 decimals

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address agent = vm.envAddress("AGENT_ADDRESS");
        // demo: 10-minute epochs so a credit history can be seeded on testnet in an hour; production = 1 days
        uint64 epoch = uint64(vm.envOr("EPOCH_SECONDS", uint256(10 minutes)));

        vm.startBroadcast(pk);
        MockIDRX idrx = new MockIDRX();
        Warung w = new Warung(
            idrx,
            Warung.Params({
                epochLength: epoch,
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
                payerEpochCap: uint128(250_000 * RP),
                minPayment: uint128(5_000 * RP),
                baseTierMax: uint128(1_000_000 * RP)
            }),
            deployer,
            agent,
            deployer
        );
        vm.stopBroadcast();

        console.log("MockIDRX", address(idrx));
        console.log("Warung  ", address(w));
    }
}
