/** Dev/test helper: link a fake Telegram chat to a wallet and print a fresh one-time login code.
 *  npm run login-code -- 0xYourWallet [fakeChatId]      then open  <APP_URL>/masuk?t=<code> */
import { kv } from "../server/kv";
import { store } from "../server/store";

const [, , address, tg = "880000009"] = process.argv;
if (!/^0x[0-9a-fA-F]{40}$/.test(address ?? "")) throw new Error("usage: npm run login-code -- 0xWalletAddress [fakeChatId]");
await kv.set(`link:${tg}`, address);
console.log(await store.newLoginCode(tg));
