"use client";
import { keccak256, toBytes, type Address, type Hex } from "viem";
import { BOT_API, IDRX, WARUNG, erc20Abi, publicClient, warungRead, type useWallet } from "./web3";

type Wallet = NonNullable<ReturnType<typeof useWallet>["wallet"]>;

/** Thrown when the relayer can't help (down, rate-limited, out of gas money). The caller falls back to a normal transaction. */
export class RelayUnavailable extends Error {}

const domain = { name: "Warung", version: "1", chainId: 97, verifyingContract: WARUNG } as const;
const inOneHour = () => BigInt(Math.floor(Date.now() / 1000) + 3600);

export async function relay(body: object): Promise<Hex> {
  let r: Response;
  try {
    r = await fetch(`${BOT_API}/relay`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch { throw new RelayUnavailable("relayer unreachable"); }
  const j = await r.json().catch(() => ({}));
  if (r.status === 429 || r.status === 503) throw new RelayUnavailable(j.error ?? "relayer unavailable");
  if (!r.ok) throw new Error(j.revert?.name ? `${j.error}: ${j.revert.name}` : (j.error ?? "relay failed"));
  return j.hash as Hex;
}

export async function relayEnabled(): Promise<boolean> {
  try { return Boolean((await (await fetch(`${BOT_API}/relay`)).json()).enabled); } catch { return false; }
}

export async function gaslessRegister(w: Wallet, account: Address) {
  const deadline = inOneHour();
  const sig = await w.signTypedData({
    domain, primaryType: "Register", message: { merchant: account, nonce: await warungRead("relayNonces", [account]), deadline },
    types: { Register: [{ name: "merchant", type: "address" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] },
  });
  return relay({ action: "register", merchant: account, deadline: deadline.toString(), sig });
}

export async function gaslessAccept(w: Wallet, account: Address, loanId: bigint) {
  const deadline = inOneHour();
  const sig = await w.signTypedData({
    domain, primaryType: "Accept", message: { loanId, nonce: await warungRead("relayNonces", [account]), deadline },
    types: { Accept: [{ name: "loanId", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] },
  });
  return relay({ action: "accept", loanId: loanId.toString(), deadline: deadline.toString(), sig });
}

/** Two signatures, zero gas: one authorizes this exact payment (merchant, amount, memo), one lets the token move. */
export async function gaslessPay(w: Wallet, account: Address, merchant: Address, amount: bigint, memo: string) {
  const deadline = inOneHour();
  const nonce = await warungRead("relayNonces", [account]);
  const sig = await w.signTypedData({
    domain, primaryType: "Pay",
    message: { payer: account, merchant, amount, memoHash: keccak256(toBytes(memo)), nonce, deadline },
    types: { Pay: [{ name: "payer", type: "address" }, { name: "merchant", type: "address" }, { name: "amount", type: "uint256" }, { name: "memoHash", type: "bytes32" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] },
  });
  const permitNonce = await publicClient.readContract({ address: IDRX, abi: erc20Abi, functionName: "nonces", args: [account] });
  const ps = await w.signTypedData({
    domain: { name: "Mock IDRX", version: "1", chainId: 97, verifyingContract: IDRX }, primaryType: "Permit",
    message: { owner: account, spender: WARUNG, value: amount, nonce: permitNonce, deadline },
    types: { Permit: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }, { name: "value", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] },
  });
  const r = `0x${ps.slice(2, 66)}`, s = `0x${ps.slice(66, 130)}`, v = parseInt(ps.slice(130, 132), 16);
  return relay({ action: "pay", payer: account, merchant, amount: amount.toString(), memo, deadline: deadline.toString(), sig, permit: { deadline: deadline.toString(), v, r, s } });
}

export const gaslessFaucet = (address: Address) => relay({ action: "faucet", address });
