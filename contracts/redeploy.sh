#!/usr/bin/env bash
# Full testnet redeploy: contracts -> adapter -> seed -> one real loan cycle. Stops on the first failure.
# Run from contracts/:  bash redeploy.sh
set -euo pipefail
export PATH="$PATH:$HOME/.foundry/bin"
GAS="--legacy --with-gas-price 120000000"

forge test -q
rm -rf broadcast/Deploy.s.sol/97 broadcast/DeployReputation.s.sol/97
forge script script/Deploy.s.sol --rpc-url bsc_testnet --broadcast $GAS | grep -E "ONCHAIN|Error"
python redeploy_env.py core
forge script script/DeployReputation.s.sol --rpc-url bsc_testnet --broadcast $GAS | grep -E "ONCHAIN|Error"
python redeploy_env.py adapter

cd ../app
rm -f .cache/seeded.json .cache/sales.json
npm run seed -- setup 2>&1 | grep -vE "^npm notice|^> |^$"
npm run seed -- day 2>&1 | grep -vE "^npm notice|^> |^$"
npm run e2e 2>&1 | grep -vE "^npm notice|^> |^$"
echo
echo 'Done. If the web app is hosted, update the same variables on Vercel (WARUNG_ADDRESS, IDRX_ADDRESS, REPUTATION_ADAPTER, DEPLOY_BLOCK and the NEXT_PUBLIC_* copies), run `npm run warm`, redeploy, and refresh the agent card.'
