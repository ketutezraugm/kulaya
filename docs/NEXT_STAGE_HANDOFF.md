# Kulaya: next stage handoff (from the hackathon repo to a future business repo)

Written 2026-11-04, updated 2026-11-19. If development resumes in a new directory, copy this file there as `HANDOFF.md` and start the new conversation with: *"Read HANDOFF.md first."*

## 1. Who and what

- **Founder:** @ezrahesperos (solo). Write to them in English. They want a lead programmer **and** a business mentor: give opinions, push back, say plainly when you're unsure, and leave the decisions to them.
- **Kulaya:** AI micro-credit for Indonesian warungs/UMKM. Every QR sale becomes a shop-owned record, the record sets a credit limit (10% of verified 30-day sales, capped by level), an AI proposes a small loan, and a share of each sale repays it. "The AI proposes, the contract decides." Slogan: *Modal usaha, dari hasil jualan sendiri.*
- **Outcome:** won **1st place, Finance & Commerce**, Indonesia Web3 Hackathon 2026 (Demo Day Oct 31, Yogyakarta). Judges: Binance Academy SEA, BNB Chain DevRel, Coinfest Asia, Dev Web3 Jogja.
- **Status (2026-11-19):** turning it into a business is on hold; the founder may resume later. No business model, entity, partner or funding is decided.

## 2. The legacy repo (read-only reference, do not develop there)

- GitHub `ketutezraugm/kulaya`: public again since 2026-11-19 under **all rights reserved** (see `LICENSE`). Versions published before that date were MIT and stay MIT.
- What it is: a **testnet prototype**. Next.js app on Vercel (kulaya.vercel.app) with an owner site in Bahasa and an English judge site (`/protocol`, red-team console), AI agent with four safety layers, Telegram bot (voice notes), Upstash Redis, Foundry contracts on BSC testnet (`Warung.sol` at `0xF6fD0727D20eD76442BfD16727fA4ce1482321D8`), MockIDRX, ERC-8004 agent #2535, gasless relayer (EIP-712/2612).
- Where to look: `README.md` (architecture, honest limits), `docs/NEXT_SESSION.md` (commands, contract parameters, gotchas), `docs/submission/` (pitch, deck, Q&A with known loopholes), `docs/design/` and `app/assets/` (brand, art, tokens).
- Known weaknesses found in review: (1) a borrower can stall repayment forever with tiny payments, because write-off only checks silence, not progress; (2) wash trading with ~5 wallets can fake a credit history (capped at Rp 1 jt per fake shop); defence today is parameter-based only.

## 3. Legal and IP status

- Copyright notice in the repo: all rights reserved (2026-11-19). Copyright registration at DGIP: planned, not filed.
- Trademark for the name and logo: recommended, not filed. Indonesia is first-to-file.

## 4. Rules for a new repo

- **Fresh history, proprietary from the first commit.** No MIT headers.
- **Docs before code.** Do not write production code until section 5 is settled; regulation may change the architecture (possibly fiat-first, with the chain as a back-office record).
- **Port deliberately.** When reusing legacy code or art, copy the specific files and note the legacy commit they came from. Do not copy demo-only parts (seed scripts, MockIDRX, judge site, test wallets).
- **New secrets for everything.** Never reuse testnet keys; secrets live only in env files and the host's secret store; never print or commit them.
- **Keep claims honest:** no users, no revenue, no real lending yet.

## 5. Open business questions

Concerns to verify with professionals:
1. **Regulation may reshape the product.** Payments in Indonesia must be in rupiah, and Bank Indonesia bars crypto as a payment instrument, so customers paying warungs in IDRX is likely not allowed. Lending to the public needs an OJK licence (P2P lending: minimum paid-up capital believed to be Rp 25 billion), so Kulaya is more likely the tech/data layer for a licensed lender, or enters the OJK innovation sandbox. Needs a fintech lawyer.
2. **Sales-data lending already exists** (e-wallet/ride-hailing merchant loans, Amartha, Modalku, etc.); the edge must be specific. Investree's licence revocation (2024) shows how the sector fails.
3. **Thin unit economics:** about Rp 24.000 fee on an Rp 800.000 loan, before defaults, cost of capital, acquisition and support.
4. **Real money raises the bar:** KYC/AML, the data protection law (UU PDP), contract audits, fraud controls (section 2 loopholes).
5. **Solo founder** in a regulated sector: likely needs advisers with lending, risk or compliance experience.

Idea to test (verify with a lawyer first): **credit in stock, not cash.** A warung-facing supplier (grosir, FMCG distributor, traditional-market supplier) extends stock on terms (*bayar tempo*), repaid from the shop's sales, with Kulaya as the record and risk-scoring layer (the name comes from *kulakan*). Possibly a lighter regulatory path. Not confirmed legal.

First steps if work resumes, before any code:
1. Regulation research (stablecoin payments, tech layer for a licensed lender, OJK innovation sandbox), then a fintech lawyer.
2. Customer discovery: interview 15–20 warung owners about buying stock, borrowing today and willingness to pay.
3. Find the money: a licensed lender partner, or a warung-facing supplier willing to give credit in stock.
