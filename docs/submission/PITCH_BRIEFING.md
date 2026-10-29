# Kulaya: pitch briefing (read this first in the new conversation)

Written 2026-10-29. Purpose: prepare the live pitch for **Demo Day, Oct 31, 2026, Yogyakarta**. Everything below is verified against the repo and the live app. Do not invent numbers; where something is unknown, it is listed in section 8.

## 1. Where the project stands

The product, video, deck and submission are all finished and live. The submission form text is in `docs/submission/FORM_FIELDS.md` and `SUBMISSION.md`. The only pending product work is a cosmetic art fix (section 7). The job now is to turn the material into a spoken pitch and rehearse the Q&A.

| Piece | State |
|---|---|
| Live app | https://kulaya.vercel.app (owner site, Bahasa) and `/protocol` (judge site, English). All end-to-end checks pass on production. |
| Contract | `0xF6fD0727D20eD76442BfD16727fA4ce1482321D8`, BNB Smart Chain Testnet (chain 97). 33 Foundry tests. |
| Demo video | https://youtu.be/mTLAuLq-RCg (3:00, voiceover, music, effects) |
| Deck | `docs/submission/Kulaya Pitch Deck.pdf` (10 slides, speaker notes in `docs/submission/DECK_HANDOFF.md` section 5) |
| Repo | https://github.com/ketutezraugm/kulaya (public), README has screenshots |
| Telegram bot | https://t.me/KulayaBot |
| Builder | Solo developer, @ezrahesperos |

## 2. The pitch in one breath

Indonesia has around 64 million small shops with no records a lender trusts, so they borrow from predatory pinjol. Kulaya turns every QR sale into an on-chain record the shop owns. That record is a credit limit (10% of verified 30-day sales). An AI offers a small loan; the owner sees terms read from the contract and accepts with one free signature; the loan repays itself as a share of each sale. **The AI can only propose; the smart contract decides**, and anyone can attack it live.

Slogan: *Modal usaha, dari hasil jualan sendiri.* / *Credit that grows from every sale.*

Tracks: AI Agents · Finance & Commerce · Consumer Apps.

## 3. The proof points (the numbers a judge can verify)

- Demo shop "Warung Bu Sri": level Berkembang, 30-day verified sales Rp 12.115.000 at the time of the video, credit limit Rp 1.211.500 (10%, under the Rp 2.000.000 ceiling). The live demo shop's numbers have since moved with daily seeding (about Rp 23,8 jt sales, limit Rp 2.000.000 as of Oct 6), so **check `/t/<demo shop>` or the API before quoting live numbers**.
- A real loan on-chain: Rp 800.000 principal, Rp 24.000 flat fee (3%), Rp 824.000 total, repaid at 10% of each sale by 50 customer payments, closed; shop moved Perintis → Berkembang.
- AI reputation on-chain: ERC-8004 agent #2535, 100/100 from 1 closed loan.
- Red-team: a Rp 1.000.000.000 request is blocked by the policy layer; with that layer off, the contract reverts with `ExceedsCreditCap` (simulation against the live contract, nothing broadcast).
- Rules enforced by the contract: limit 10% of verified 30-day sales, capped by level (Rp 1 jt → 2 jt → 4 jt → 8 jt, doubling after each repaid loan); fee flat ≤ 5% (AI offers about 3%); repayment ≤ 20% of each sale (AI offers 10%); ≥ 5 different customers; one customer counts at most Rp 250.000 per day; offer valid 24 h; written off after 14 days without sales; 20% of every fee goes to a first-loss reserve; each loan ≤ 5% of the pool.
- Network (Oct 6): 30+ shops registered (demo and test shops), 8 loans proposed, 1 repaid, 0 written off; pool about Rp 100 jt of test IDRX.
- Tests: 33 Foundry, 32 TypeScript, live API checks, real-browser journeys.

## 4. Honesty guardrails (say them first, before a judge finds them)

Testnet only, mock IDRX, no real money. The payment QR is **not QRIS** (OVO, GoPay and bank apps cannot scan it yet). No real pilot users yet; the demo customers are seeded wallets. A real launch needs a licensed lender of record (OJK-licensed P2P lender or koperasi, via the OJK sandbox). Never claim "live in production", user counts, or revenue.

## 5. Suggested pitch structure (to refine in the new conversation)

Target 3 to 4 minutes plus Q&A. One slide per beat of the deck: hook (the shop owner's problem), mechanism (sell → record → offer → repay), the product (show the phone), the credit math, the loan, **the safety demo** (the strongest moment: run the red-team console live), why on-chain, honest limits, what's next (QRIS), call to action (QR codes to try it and to break it).

Live-demo plan (tested paths): (1) `/protocol/redteam` → "Model compromised" → Run simulation → tick "Disable off-chain policy layer" → run again. (2) `/bayar/0x7FeaeE8CFcC8D0E79329A864Fcf9758F4DDd98C6?amount=25000` → "Coba dengan dompet demo" → payment succeeds gaslessly. (3) `/protocol/agent` for the agent's on-chain identity. Have the video as the backup if the network or RPC is slow.

## 6. Likely judge questions, and honest answers from the repo

- **Why not just use QRIS now?** QRIS settles in rupiah through a licensed provider; that integration needs a licensed partner and is out of scope for a hackathon. The production path keeps everything on-chain and changes only how money enters (provider settles IDRX into the contract).
- **What stops fake sales / wash trading?** At least 5 distinct customers, a per-customer daily cap of Rp 250.000, a minimum payment of Rp 5.000, and a fraud flag from the AI that can only lower limits. Honest limit: parameter-based, a production system would add identity checks.
- **What if the AI is jailbroken or hallucinates?** Four independent layers: key can only call `proposeLoan` and holds no funds; hard caps in the contract; the LLM never writes numbers (templates with placeholders filled by code); reply guard rejects figures not found in tool results. Demonstrate with the red-team console.
- **Who takes the default risk?** Lenders in the public pool, protected by a first-loss reserve (20% of every fee), a per-loan cap of 5% of the pool, a daily lending budget of 20% of the pool, and a write-off rule after 14 days of no sales. There is no collector and no late fee by design.
- **How do owners avoid gas and wallets?** All actions are signature-only; a relayer pays gas and can only submit exactly what was signed (EIP-712 / EIP-2612). Honest limit: owners still need a wallet app today; embedded wallets and a paymaster are on the roadmap.
- **Why blockchain at all?** The record has to be shop-owned and verifiable by any lender; repayment enforced by code; an open pool; and a public, unforgeable track record for the AI (ERC-8004 rejects self-reviews).
- **Regulation?** Real lending needs a licensed lender of record; the plan is the OJK sandbox or a licensed partner. Kulaya as built is a prototype on testnet.
- **What is your moat / business model?** Not defined in the repo beyond the flat fee (≤ 5%) that goes to the pool and reserve. **The user needs to decide the answer** (see section 8).
- **Did you build all of this alone?** Yes: solo developer. The visual design and the video's motion graphics were produced with Claude Design from a written brief and integrated by the developer; the voiceover uses an ElevenLabs voice; the music and sound effects are synthesised.

## 7. Open items outside the pitch

- **Hair fix in the landing illustration** (the customer's fringe): handoff is in `docs/design/hair-fix/HANDOFF.md` and `hair-fix.zip`. When the fixed `ill-landing-hero.svg` comes back: replace `app/assets/art/scene/ill-landing-hero.svg`, run `node scripts/build-art.mjs` from `app/`, run the tests, deploy (`npx vercel@latest deploy --prod --yes`, rerun if the first attempt says `status: error`). The same drawing is on slide 1 of the deck PDF (separate re-export).
- **Before Demo Day:** rerun `npm run seed -- day` (from `app/`) so the demo shop has payments for the current UTC day; check `npm run balances` (relayer must stay above 0.002 tBNB; it had 0.0388). If the demo is on stage Wi-Fi, test it there first.
- Git history still contains the developer's full name in two old commits (the files now use only the @handle); a history rewrite was offered and not requested.

## 8. Decisions the user still has to make (ask about these, don't guess)

1. **Business model and moat:** how does Kulaya (or the lender) make money, and what is defensible? Only the flat fee is defined today.
2. **Demo-day format:** time limit, whether a live demo is allowed, screen/projector setup, whether judges will have their own devices.
3. **Language of the pitch:** English, Bahasa, or both (the app is Bahasa-first, the deck is English).
4. **Who is the pitch aimed at in the room:** technical judges, business/finance judges, or ecosystem sponsors (BNB Chain, Binance Academy, Coinvestasi, Dev Web3 Jogja).
5. **Personal story:** why this problem, why this founder (not in the repo; only the user can supply it).

## 9. Where things are

`docs/NEXT_SESSION.md` (state, commands, gotchas) · `docs/submission/` (form fields, submission text, deck handoff, deck PDF) · `docs/video/` (video handoff, reference screens, voiceover/sound pipeline) · `docs/design/` (design brief, review, hair-fix handoff) · `app/scripts/README.md` (every script). Secrets live only in `app/.env.local` and Vercel; never print or commit them.
