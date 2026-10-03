# Deploying Warung Agent

Everything (web app, AI agent, gasless relayer, Telegram bot) is **one Next.js project** on **Vercel**, plus a free **Upstash Redis** for small state. The contracts are already deployed on BSC testnet (see README).

```
Telegram ──webhook──▶ /api/telegram ─┐
Browser  ──────────▶ /api/{agent,sales,relay,link,redteam}
                                      ├─▶ Gemini (AI)      ├─▶ BSC testnet RPCs
                                      └─▶ Upstash Redis (wallet links, rate limits, locks, sale-history cache)
```

## One-time setup

1. **Vercel project:** `cd app && npx vercel link`, then `npx vercel deploy --prod`.
2. **Redis:** `npx vercel integration add upstash/upstash-kv` (accept the terms in the browser once). It injects `KV_REST_API_URL` / `KV_REST_API_TOKEN`.
3. **Environment variables** (Project → Settings → Environment Variables, Production). Mark the first five *Sensitive*:

| Variable | Notes |
|---|---|
| `GEMINI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `UNDERWRITER_PRIVATE_KEY`, `RELAYER_PRIVATE_KEY` | secrets. Webhook secret: any 16+ char random string (`openssl rand -hex 24`) |
| `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL` | `gemini-3.5-flash` / `gemini-3.8-flash` |
| `RPC_URL` | comma-separated failover list (see `app/.env.example`) |
| `WARUNG_ADDRESS`, `IDRX_ADDRESS`, `REPUTATION_ADAPTER`, `ERC8004_REPUTATION_REGISTRY`, `AGENT_ID`, `DEPLOY_BLOCK`, `CHAIN_ID` | from the README / deploy output |
| `REDTEAM_MERCHANT`, `REDTEAM_RATE_LIMIT` | demo shop for `/redteam`; attempts per IP per hour |
| `APP_URL` | the production URL (used in QR payment and loan links) |
| `NEXT_PUBLIC_*` | public copies of the addresses (see `app/.env.example`) |

4. **Telegram webhook** (once, and again if the URL or secret changes):

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  --data-urlencode "url=https://<your-app>.vercel.app/api/telegram" \
  --data-urlencode "secret_token=$TELEGRAM_WEBHOOK_SECRET" \
  --data-urlencode 'allowed_updates=["message"]'
```

5. **Warm the sale-history cache** (one-time backfill; the API then only scans a few recent blocks per request): `cd app && npm run warm`. This needs the Redis variables locally (`npx vercel env pull`).

## Operating notes

- **No servers to keep awake.** Telegram calls the webhook; the AI work runs after the HTTP response (`after()`), so Telegram never retries on slow replies (duplicates are also dropped by update id).
- **Closed loans** are published to the AI's ERC-8004 reputation by a keeper that piggybacks on `/api/agent` requests (once a minute at most, cross-instance locked).
- **Relayer gas:** the relayer wallet needs tBNB. It refuses to run below 0.002 tBNB and returns a clear error.
- **Free-tier Gemini** rate-limits: `/api/redteam` is limited per IP, and the red-team page offers a "compromised model" mode that never calls the LLM.
- **Log history:** the official BNB RPCs reject `eth_getLogs` and PublicNode prunes old logs, so `LOGS_RPC_URL` defaults to OnFinality's public node (10k-block ranges) with PublicNode as fallback.
- Keep the demo shop's 30-day credit window fresh until Demo Day (Oct 31): `cd app && npm run seed -- day` once per UTC day.

## Redeploying contracts

`cd contracts && bash redeploy.sh` redeploys, seeds and runs a full loan cycle, writing `app/.env.local`. Then update the matching variables on Vercel, run `npm run warm`, redeploy the app, and refresh the ERC-8004 agent card (`setAgentURI`).
