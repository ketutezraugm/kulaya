# Kulaya pitch deck: handoff for Claude Design (Slides)

**Deliverable:** an 8-slide, 16:9 pitch deck for the Indonesia Web3 Hackathon 2026 judges, exportable to PDF/PPTX. Presented live (about 3 to 4 minutes) and also read on its own, so every slide must make sense without a speaker.
**Audience:** hackathon judges (technical and business, international). **Language:** English. Product UI screenshots stay in Bahasa with a short English caption.
**Tone:** confident, warm, specific. Short headlines that state the point ("The AI proposes. The contract decides."), not topics ("Solution"). One idea per slide. Max about 35 words of body text per slide; the rest is visual.

## 1. Look and feel (reuse the product brand)

| What | Where in the repo |
|---|---|
| Tokens (colours, type scale, radii, the 4px "stamp" shadow) | `app/assets/handoff/kulaya-tokens.css` |
| Clean SVG art (inline, metadata stripped) | `app/components/art/*.ts` (each export is an SVG string): `scene.ts`, `mascot.ts`, `stall.ts`, `motif.ts`, `dev.ts`, `logo.ts`, `icon.ts`. If you cannot read `.ts`, use `app/assets/art/**` and strip the `<metadata>` block from each file. |
| Real product screens (phone 390 px @2x, desktop 1440 px) | `docs/video/refs/*.png` |
| Brand sheet and component frames | `app/assets/Kulaya Brand Sheet.dc.html`, `app/assets/Components.dc.html` |

Warm paper background (`kertas #FBF7EF`), nila ink (`#1E2A5A`), kunyit accent (`#F2B33D`), daun green for success, bata red for blocks. Bree Serif for headlines and big numbers, Plus Jakarta Sans for body (tabular figures for money), JetBrains Mono only for code and addresses. Hand-drawn, flat, outlined art with the stamp offset shadow and awning-scallop edges. **No emoji, no stock photos, no 3D, no neon "crypto" look.** Slogan, used on the title and closing slides only: **"Modal usaha, dari hasil jualan sendiri."** with the English subtitle *"Credit that grows from every sale."*

Slide furniture: logo small bottom-left, slide number bottom-right, an awning-scallop strip along the top edge of the title and closing slides. Phone screens always inside a simple nila-outlined phone frame.

## 2. Slides

### 1. Title
**Headline:** Kulaya: credit that grows from every sale.
Slogan (Bahasa) + English subtitle, logo lockup, `illLandingHero` as the hero, track badges (`badgeTrackAiAgents`, `badgeTrackFinance`, `badgeTrackConsumer`) along the bottom, "Indonesia Web3 Hackathon 2026 · BNB Chain".
**Notes:** one sentence: AI micro-credit for small shops, enforced by a smart contract.

### 2. The problem
**Headline:** 64 million small shops. No records a bank trusts.
Three beats with simple art: (1) a shop with a notebook and cash, nothing a lender can verify (`illShutterClosed` or `illStallPerintis`), (2) pinjol notifications (rising interest, debt collectors calling family, contact access), (3) result: no fair working capital.
**Notes:** source of "64 million" is the common UMKM figure used throughout our README; cite it as "Indonesia's ~64 million MSMEs" and be ready to show a source if asked.

### 3. The solution
**Headline:** Every sale becomes credit.
A horizontal 4-step flow with icons: **Sell** (QR payment, gasless) → **Record** (on-chain, owned by the shop) → **Offer** (AI proposes, owner decides) → **Repay by selling** (about 10% of each sale, no due date). Under it the three promises: *No collateral · No collectors · Fee flat, max 5%*.
Use the landing "Cara kerjanya" scenes: `illStepScan`, `illStepOffer`, `illStepSplit`.

### 4. See it work
**Headline:** From first sale to funded in minutes.
Three phone screens left to right with one-line captions (EN): `docs/video/refs/03-terima-qr.png` ("Customer scans, pays gaslessly"), `01-beranda.png` ("Sales build the credit limit"), and an offer screen (take it from the demo video frame at 1:35 or `docs/screenshots/owner-offer.png`: "Terms read from the contract"). A small badge: "Demo video: youtu.be/mTLAuLq-RCg".
Key numbers strip: Rp 12.115.000 30-day sales → limit Rp 1.211.500 (10%, capped by level).

### 5. The AI can't hurt anyone
**Headline:** The AI proposes. The contract decides.
Left: `diaShields` (the four shields). Right: the four lines: ① AI key can only call `proposeLoan`, holds no funds ② hard caps in the contract ③ the LLM never writes numbers ④ reply guard. Bottom: a screenshot of the red-team result (`docs/video/refs/12-redteam-contract-reverts.png`) with caption "Rp 1.000.000.000 requested → BLOCKED by policy; with the policy layer off the contract reverts `ExceedsCreditCap` (simulation, nothing broadcast)".

### 6. Why web3
**Headline:** The record, the repayment and the AI's reputation live on-chain.
Use `diaArchitecture` as the main visual. Four short call-outs: *shop-owned revenue record · repayment enforced by code · permissionless pool with first-loss reserve · AI identity + reputation via ERC-8004*. Add: *Gasless: users only sign (EIP-712 / EIP-2612).*

### 7. Where we are, honestly
**Headline:** Working on testnet. Here is what's real, and what's next.
Two columns. **Built and verified:** 33 Foundry tests · 32 TypeScript tests · live end-to-end browser journeys · a real closed loan (Rp 800.000, AI reputation 100/100 from 1 loan) · 29 shops registered on testnet (Oct 6, 2026). **Honest limits:** testnet only (mock IDRX) · the QR is not QRIS · no real pilot yet · real lending needs a licensed lender of record. Bottom roadmap bar: **QRIS bridge via IDRX → licensed lending partner (OJK sandbox) → mainnet → embedded wallets**.
**Notes:** judges respect plain honesty here; do not soften the limits.

### 8. Close
**Headline:** Try it. Try to break it.
Slogan again, QR codes (generate them) to **kulaya.vercel.app** and **kulaya.vercel.app/protocol/redteam**, links: t.me/KulayaBot · github.com/ketutezraugm/kulaya · demo video youtu.be/mTLAuLq-RCg. Team names and roles (**fill in**: not available to this handoff; leave a clearly labelled slot). Mascot `mascotGreet` beside the links.

## 3. Facts you may use (verified Oct 6, 2026; do not invent others)

- Network: BNB Smart Chain Testnet (97), test money only. Core contract `0xF6fD0727D20eD76442BfD16727fA4ce1482321D8` (code name `Warung`). ERC-8004 agent #2535.
- Rules: limit = 10% of verified 30-day sales, capped by level (Rp 1 jt → 2 jt → 4 jt → 8 jt, doubling after each repaid loan); fee flat ≤ 5% (AI offers about 3-4%); repayment ≤ 20% of each sale (AI offers about 10%); ≥ 5 different customers; one customer counts at most Rp 250.000 per day; no due date, no late fees, no collectors.
- Demo shop "Warung Bu Sri": level Berkembang, 30-day sales Rp 12.115.000, limit Rp 1.211.500; first loan Rp 800.000 + fee Rp 24.000 = Rp 824.000, repaid at 10% of each sale.
- Network (testnet): 29 shops registered, 7 loans proposed, 1 repaid, 0 written off; pool about Rp 100 jt (test IDRX).
- Stack: Solidity 0.8.28 · Foundry · ERC-8004 · EIP-712/2612 · Next.js on Vercel · Upstash Redis · LLM chain (Groq, Cerebras, Mistral, OpenRouter, Gemini) · Telegram bot · WalletConnect.

## 4. Acceptance checklist

- [ ] 8 slides, 16:9, exported to PDF and PPTX; fonts embedded or outlined.
- [ ] Every number matches section 3; no invented traction, users or testimonials.
- [ ] "Testnet", "not QRIS", "no real pilot" and "licensed lender" each appear (slide 7 at minimum).
- [ ] All art inlined from the repo's cleaned SVGs; no emoji, no stock imagery.
- [ ] Each slide has one idea, a headline that states it, and at most about 35 words of body text.
- [ ] Speaker notes on every slide (1-3 sentences) and the team slot clearly marked until filled.
- [ ] Text contrast at least 4.5:1; code and addresses in JetBrains Mono at 14 pt or larger.
