"""Reads a forge broadcast file, verifies the deployment on-chain, and updates the env files. Fails loudly on any mismatch.
usage: python redeploy_env.py core | adapter
"""
import json, os, re, subprocess, sys

RPC = "https://data-seed-prebsc-1-s1.bnbchain.org:8545"
env = {**os.environ, "PATH": os.environ["PATH"] + ":" + os.path.expanduser("~/.foundry/bin")}


def cast(*args):
    return subprocess.check_output(["cast", *args], env=env).decode().strip()


def checksum(a):
    return cast("to-check-sum-address", a)


def setenv(path, key, value):
    s = open(path, encoding="utf-8").read()
    s2 = re.sub(rf"^{key}=.*$", f"{key}={value}", s, flags=re.M)
    assert value in s2, f"{path}: {key} not found"
    open(path, "w", encoding="utf-8").write(s2)


def load(script):
    d = json.load(open(f"broadcast/{script}.s.sol/97/run-latest.json"))
    assert d["receipts"] and all(r["status"] == "0x1" for r in d["receipts"]), f"{script}: a transaction failed"
    created = {t["contractName"]: checksum(t["contractAddress"]) for t in d["transactions"] if t["transactionType"] == "CREATE"}
    return d, created


mode = sys.argv[1]
if mode == "core":
    d, a = load("Deploy")
    W, I = a["Warung"], a["MockIDRX"]
    block = str(int(d["receipts"][0]["blockNumber"], 16))
    assert len(cast("code", W, "--rpc-url", RPC)) > 100 and len(cast("code", I, "--rpc-url", RPC)) > 100, "no code on chain"
    assert cast("call", W, "asset()(address)", "--rpc-url", RPC).lower() == I.lower(), "asset mismatch"
    setenv(".env", "WARUNG_ADDRESS", W)
    setenv("../bot/.env", "WARUNG_ADDRESS", W)
    setenv("../bot/.env", "IDRX_ADDRESS", I)
    setenv("../bot/.env", "DEPLOY_BLOCK", block)
    setenv("../app/.env.local", "NEXT_PUBLIC_WARUNG_ADDRESS", W)
    setenv("../app/.env.local", "NEXT_PUBLIC_IDRX_ADDRESS", I)
    print("CORE VERIFIED", W, I, block)
elif mode == "adapter":
    d, a = load("DeployReputation")
    A = a["ReputationAdapter"]
    W = re.search(r"^WARUNG_ADDRESS=(.*)$", open(".env").read(), re.M).group(1).strip()
    first = lambda *x: cast("call", *x, "--rpc-url", RPC).split()[0]
    assert first(A, "warung()(address)").lower() == W.lower(), "adapter bound to wrong warung"
    assert first(W, "reputation()(address)").lower() == A.lower(), "warung not wired to adapter"
    assert first(A, "agentId()(uint256)") == "2535"
    setenv("../bot/.env", "REPUTATION_ADAPTER", A)
    setenv("../app/.env.local", "NEXT_PUBLIC_REPUTATION_ADAPTER", A)
    print("ADAPTER VERIFIED", A, "<->", W)
else:
    sys.exit("usage: core | adapter")
