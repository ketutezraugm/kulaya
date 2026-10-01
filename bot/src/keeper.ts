import { gasPrice, getLoan, type Chain } from "./chain.js";
import { warungAbi } from "./abi.js";

/** Publish every closed-but-unreported loan to the agent's ERC-8004 reputation. Anyone could do this; the bot pays gas. */
export async function reportClosedLoans(c: Chain): Promise<string[]> {
  const next: bigint = await c.read("nextLoanId");
  const done: string[] = [];
  for (let id = 1n; id < next; id++) {
    const l = await getLoan(c, id);
    if (l.status !== "Repaid" && l.status !== "Defaulted") continue;
    if (await c.read("reported", [id])) continue;
    const { request } = await c.publicClient.simulateContract({ address: c.warung, abi: warungAbi, functionName: "reportOutcome", args: [id], account: c.agent });
    const hash = await c.agentWallet.writeContract({ ...request, type: "legacy", gasPrice: await gasPrice(c) } as never);
    await c.publicClient.waitForTransactionReceipt({ hash });
    done.push(`#${id} ${l.status}`);
  }
  return done;
}
