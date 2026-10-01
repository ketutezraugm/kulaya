# Deploying Warung Agent

Two pieces: the **web app** (static-ish Next.js, free on Vercel) and the **bot** (a long-running Node process: Telegram polling + AI + relayer + API). The contracts are already deployed (see README).

> Stop any bot running on your own machine before the hosted one starts. Telegram allows one polling process per bot token.

## 1. Bot (Render, free) → gives you `BOT_URL`

1. [render.com](https://render.com) → **New → Web Service** → connect the GitHub repo.
2. Settings: **Root Directory** `bot` · **Runtime** Docker (uses `bot/Dockerfile`) · Instance **Free** · Health Check Path `/health`.
3. **Environment** (copy values from your local `bot/.env`; never commit them):

| Variable | Notes |
|---|---|
| `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL` | `gemini-3.5-flash` / `gemini-3.8-flash` |
| `TELEGRAM_BOT_TOKEN` | from @BotFather |
| `RPC_URL` | comma-separated list from `.env.example` |
| `UNDERWRITER_PRIVATE_KEY` | the AI key (propose-only, tiny gas balance) |
| `RELAYER_PRIVATE_KEY` | the gasless relayer (gas money only) |
| `WARUNG_ADDRESS`, `IDRX_ADDRESS`, `REPUTATION_ADAPTER`, `AGENT_ID`, `ERC8004_REPUTATION_REGISTRY`, `DEPLOY_BLOCK`, `REDTEAM_MERCHANT` | from the README / `.env` |
| `APP_URL` | your Vercel URL (step 2) |
| `PORT` | `8787` |

4. Free instances sleep after ~15 min without HTTP traffic, which would pause Telegram polling. Keep it awake with a free monitor ([UptimeRobot](https://uptimerobot.com)): HTTP check on `BOT_URL/health` every 5 minutes.
5. Free instances have an ephemeral disk: Telegram wallet links and the sales cache reset on restart (users just run `/link` again; the cache rebuilds). Attach a disk or move to SQLite/Supabase if that matters.

## 2. Web app (Vercel) → gives you `APP_URL`

1. [vercel.com](https://vercel.com) → **Add New Project** → import the repo → **Root Directory** `app` (framework: Next.js, auto-detected).
2. **Environment Variables** (all public, from `app/.env.example`):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_CHAIN_ID` | `97` |
| `NEXT_PUBLIC_RPC_URL` | comma-separated RPC list |
| `NEXT_PUBLIC_WARUNG_ADDRESS`, `NEXT_PUBLIC_IDRX_ADDRESS`, `NEXT_PUBLIC_REPUTATION_ADAPTER` | from the README |
| `NEXT_PUBLIC_ERC8004_IDENTITY_REGISTRY`, `NEXT_PUBLIC_ERC8004_REPUTATION_REGISTRY`, `NEXT_PUBLIC_AGENT_ID` | from `.env.example` |
| `NEXT_PUBLIC_DEMO_MERCHANT` | the demo shop address |
| `NEXT_PUBLIC_BOT_API_URL` | `BOT_URL` from step 1 (https, no trailing slash) |

3. Deploy. Then set `APP_URL` on the bot to this URL and redeploy the bot (it builds the QR and loan links from it).

## 3. After both are up

- Replace `<APP_URL>`, `<VIDEO_URL>` in `README.md` and set the repo's website field.
- Smoke test: open `APP_URL`, `/redteam` (run the "compromised model" attack), `/agent`, and message the bot `/start`.
- Keep the demo shop's 30-day credit window fresh until Demo Day (Oct 31): run `cd bot && npm run seed -- day` once per UTC day (a scheduled GitHub Action works well: store the seed wallets file as a secret).
