import { gasPrice, getLoan, type Chain } from "./chain";
import { warungAbi } from "./abi";
import { kv, withLock } from "./kv";

/** Publish every closed-but-unreported loan to the agent's ERC-8004 reputation. Anyone could do this; the bot pays gas. */
export async function reportClosedLoans(c: Chain): Promise<string[]> {
  // serverless: many requests may call this; only one runs per minute
  if (!(await kv.setNX("keeper:cooldown", 1, 60))) return [];
  const next: bigint = await c.read("nextLoanId");
  const done: string[] = [];
  for (let id = 1n; id < next; id++) {
    const l = await getLoan(c, id);
    if (l.status !== "Repaid" && l.status !== "Defaulted") continue;
    if (await c.read("reported", [id])) continue;
    const { request } = await c.publicClient.simulateContract({ address: c.warung, abi: warungAbi, functionName: "reportOutcome", args: [id], account: c.agent });
    await withLock("agent-key", async () => {
      const nonce = await c.publicClient.getTransactionCount({ address: c.agent.address, blockTag: "pending" });
      const hash = await c.agentWallet.writeContract({ ...request, nonce, type: "legacy", gasPrice: await gasPrice(c) } as never);
      await c.publicClient.waitForTransactionReceipt({ hash });
    });
    done.push(`#${id} ${l.status}`);
  }
  return done;
}
