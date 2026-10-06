# app/scripts/

Run from `app/` (they read secrets from `.env.local`, which is git-ignored and never printed).

| Script | Purpose |
|---|---|
| `seed.mts` | `npm run seed -- day [0xShop]`: record one day of demo sales (run once per UTC day to keep the 30-day window fresh) |
| `e2e.mts`, `gasless.mts`, `features-e2e.mts` | live end-to-end checks against the API (`npm run e2e`, `gasless`, `features`) |
| `check.mts` | sandbox run of the real agent against the real contract (never broadcasts) |
| `warm-cache.mts` | rebuild the contract-log index in Redis (after a redeploy or index-format change) |
| `login-code.mts` | print a Telegram-login code for a wallet (testing `/masuk?t=...`) |
| `balances.mts` | tBNB balances of the relayer and the AI wallet (relayer refuses to run below 0.002) |
| `reset-faucet-ip.mts` | clear this machine's per-IP faucet counter after heavy testing |
| `build-art.mjs` | convert the designer's SVGs in `assets/art/` to `components/art/*.ts` (metadata stripped, review fixes applied) |
| `vo-*.py/.mjs`, `sfx-*.py`, `av-*.mjs` | demo-video audio pipeline, see `docs/video/vo/README.md` |
