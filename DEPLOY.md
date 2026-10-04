# Deploying Kulaya

Everything (web app, AI agent, gasless relayer, Telegram bot) is **one Next.js project** on **Vercel**, plus a free **Upstash Redis** for small state. The contracts are already deployed on BSC testnet (see README).

```
Telegram ──webhook──▶ /api/telegram ─┐
Browser  ──────────▶ /api/{agent,sales,relay,link,redteam}
                                      ├─▶ LLM chain (Groq > Cerebras > ... > Gemini)   ├─▶ BSC testnet RPCs
                                      └─▶ Upstash Redis (wallet links, rate limits, locks, sale-history cache)
```

## One-time setup

1. **Vercel project:** `cd app && npx vercel link`, then `npx vercel deploy --prod`.
2. **Redis:** `npx vercel integration add upstash/upstash-kv` (accept the terms in the browser once). It injects `KV_REST_API_URL` / `KV_REST_API_TOKEN`.
3. **Environment variables** (Project → Settings → Environment Variables, Production). Mark the secrets *Sensitive*:

| Variable | Notes |
|---|---|
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `SESSION_SECRET`, `UNDERWRITER_PRIVATE_KEY`, `RELAYER_PRIVATE_KEY` | secrets. Webhook secret: any 16+ char random string; session secret: 32+ chars (`openssl rand -hex 32`), signs dashboard sign-in tokens |
| `GROQ_API_KEY`, `CEREBRAS_API_KEY`, `MISTRAL_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY` | AI providers, set **at least one** (all free tiers). Tried in that order with automatic failover; Groq also gives free voice-note transcription. Optional `LLM_CHAIN` overrides the order |
| `NEXT_PUBLIC_TELEGRAM_BOT` | bot username without `@` (used for every Telegram link in the UI). **A username only, never the token** (`NEXT_PUBLIC_` values reach every browser) |
| `NEXT_PUBLIC_WC_PROJECT_ID` | optional: free WalletConnect/Reown project id; enables the wallet picker for phones without a wallet browser |
| `NEXT_PUBLIC_SITE_URL` | optional: canonical site URL for social-preview metadata (defaults to `https://kulaya.vercel.app`) |
| `RPC_URL` | comma-separated failover list (see `app/.env.example`) |
| `WARUNG_ADDRESS`, `IDRX_ADDRESS`, `REPUTATION_ADAPTER`, `ERC8004_REPUTATION_REGISTRY`, `AGENT_ID`, `DEPLOY_BLOCK`, `CHAIN_ID` | from the README / deploy output |
| `REDTEAM_MERCHANT`, `REDTEAM_RATE_LIMIT` | demo shop for `/protocol/redteam`; attempts per IP per hour |
| `APP_URL` | the production URL (`https://kulaya.vercel.app`) (used in QR payment and loan links) |
| `NEXT_PUBLIC_*` | public copies of the addresses (see `app/.env.example`) |

4. **Telegram bot name.** Telegram usernames can't be renamed: create a new bot in @BotFather (e.g. `@KulayaBot`), put its token in `TELEGRAM_BOT_TOKEN` and its username (no @) in `NEXT_PUBLIC_TELEGRAM_BOT`, then redo the webhook below. Display name and descriptions can be changed on any bot via `setMyName` / `setMyDescription`.
5. **Telegram webhook** (once, and again if the URL or secret changes):

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  --data-urlencode "url=https://<your-app>.vercel.app/api/telegram" \
  --data-urlencode "secret_token=$TELEGRAM_WEBHOOK_SECRET" \
  --data-urlencode 'allowed_updates=["message"]'
```

6. **Warm the log index** (sales, customer numbers, shop list; key `sales:v2`) (one-time backfill; the API then only scans a few recent blocks per request): `cd app && npm run warm`. This needs the Redis variables locally (`npx vercel env pull`).

## Feature scripts (from `app/`)

`npm run features` runs 31 live API checks against production; `npm run e2e:ui`, `e2e:owner`, `e2e:pay` drive real-browser journeys with a scripted wallet; `npm run login-code -- 0xWallet` prints a Telegram-login code for testing. A first `deploy --prod` after a change sometimes reports `status: error` without a build error; rerunning it succeeds.

## Operating notes

- **No servers to keep awake.** Telegram calls the webhook; the AI work runs after the HTTP response (`after()`), so Telegram never retries on slow replies (duplicates are also dropped by update id).
- **Closed loans** are published to the AI's ERC-8004 reputation by a keeper that piggybacks on `/api/agent` requests (once a minute at most, cross-instance locked).
- **Relayer gas:** the relayer wallet needs tBNB. It refuses to run below 0.002 tBNB and returns a clear error.
- **Free-tier LLMs** rate-limit (Gemini's quota ran out during development, which is why the chain exists): `/api/redteam` is limited per IP, and the red-team page offers a "compromised model" mode that never calls the LLM.
- **Log history:** the official BNB RPCs reject `eth_getLogs` and PublicNode prunes old logs, so `LOGS_RPC_URL` defaults to OnFinality's public node (10k-block ranges) with PublicNode as fallback.
- Keep the demo shop's 30-day credit window fresh until Demo Day (Oct 31): `cd app && npm run seed -- day` once per UTC day.

## Redeploying contracts

`cd contracts && bash redeploy.sh` redeploys, seeds and runs a full loan cycle, writing `app/.env.local`. Then update the matching variables on Vercel, run `npm run warm`, redeploy the app, and refresh the ERC-8004 agent card (`setAgentURI`).
