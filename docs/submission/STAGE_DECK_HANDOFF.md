# Kulaya stage deck: handoff for Claude Design

You designed the Kulaya pitch deck (`Kulaya Pitch Deck.pdf`). It's good, and it stays as the version judges read on their own. **This job is a second version for the live stage**: the same deck cut down so it works on a projector, behind a speaker, at about 18 seconds per slide.

**Upload with this file:** `DECK_HANDOFF.md` (the original brief: its §3 design system still applies unchanged), `kulaya-deck-bundle.zip` (all art, screens, stills, QR codes), and `Kulaya Pitch Deck.pdf` (your current deck, the starting point).

## 1. The situation

- Demo Day: 3-minute live pitch, then 2 minutes of Q&A, projected in a hall. No live demo.
- The speaker talks continuously. **The slides support the voice; they don't repeat it.** If a slide has a sentence, the room reads it instead of listening.
- The speaker's script is written per slide in this same order, so **slide order, slide count and headlines must stay exactly as they are now.** The speaker must be able to present either deck with the same script.
- Deadline: as soon as possible. Change only what this document asks for.

## 2. Rules for the stage cut (on top of DECK_HANDOFF §3)

- **Exactly 10 slides, 1920 × 1080, one PDF.** Same headlines, same footer, same awning edges on slides 1 and 10, same dark slide 7.
- **Body text: at most 20 words per slide**, not counting the headline and footer. Short phrases, no full sentences unless listed below.
- **Minimum sizes for the stage:** headline 80 px Bree Serif; bold phrases 44 px; any other text 32 px; nothing smaller than 28 px except the footer. Big numbers 120–160 px.
- **One visual per slide, larger than before.** Remove anything not listed below.
- **Legibility test:** view every slide at 480 × 270 (a quarter of full size). If you can't read a word at that size, it's too small or shouldn't be there.
- **Unchanged:** colours, fonts, the stamp shadow, the phone frame, the art (never redraw or restyle it), the anti-slop list in DECK_HANDOFF §3.1. Only facts that already appear in the current deck may be used. Don't add numbers.

## 3. Slide by slide

For each slide: **keep** (from the current deck), **remove**, and the exact remaining copy.

### Slide 1: Title (unchanged)
Keep exactly as is. If a fixed `ill-landing-hero.svg` (the customer's fringe) is included in the upload, use it; otherwise keep the current one.

### Slide 2: Problem
- **Headline:** 64 million small shops. No record a lender trusts.
- **Keep:** the three icons and their bold lines, now 44 px: **Sales live in a notebook.** · **So they turn to pinjol.** · **No fair working capital.** Keep `ill-pinjol-side.svg` on its Bata 100 panel, larger (about 640 px).
- **Remove:** the sentence under each bold line.
- **One label** (32 px Abu) under the headline: *Pinjol: predatory online lending apps.*

### Slide 3: How it works
- **Headline:** Every sale becomes credit.
- **Keep:** the four steps (number circle, visual, bold title) and the connectors. Visuals larger (about 340 px). Titles 44 px: **Sell by QR.** · **Build a record.** · **Get an offer.** · **Repay by selling.** Under step 4 only, one 32 px line: *About 10% of each sale.*
- **Keep:** the Kunyit 100 bottom band with its three items, text at 32 px: No collateral · No collectors, no due date · Flat fee, at most 5%.
- **Remove:** the sentence under each step.

### Slide 4: Product
- **Headline:** Built for a shop owner, not for a crypto user.
- **Keep:** the three phones, larger (about 380 px wide each), centred as a group across the content width. Captions: bold phrase only, 40 px: **Show the QR.** · **See today's sales.** · **Ask, even by voice note.**
- **Remove:** the key card on the right, the second half of each caption.
- **One label** (28 px Abu) under the phones: *Real screens from the live app, in Bahasa Indonesia.*

### Slide 5: Credit math
- **Headline:** The limit comes from real sales, not from a score.
- **Left: the receipt, three rows only**, larger:
  - Verified sales, 30 days → **Rp 12.115.000**
  - × 10%
  - dashed separator
  - **Credit limit** → **Rp 1.211.500** (Bree Serif, 96 px)
- **Right: keep the level ladder** (four stalls, ×2 markers, labels *Perintis · Rp 1 jt* … *Unggul · Rp 8 jt* at 28 px).
- **Bottom: one line** with the two icons, 32 px: **5+ different customers** · **Max Rp 250.000 per customer per day**
- **Remove:** the ceiling row and footnote inside the receipt, the ladder caption, the two cards and the sentence under them.

### Slide 6: The loan
- **Headline:** Plain terms. Repaid from sales. No due date.
- **Left: the offer key card**, larger, three rows: You receive → **Rp 800.000** · Flat fee → **Rp 24.000** · From each sale → **10%**.
- **Right: one visual**: the green **LUNAS!** rubber stamp with the 100% progress bar, and under it (32 px) *Repaid by 50 payments. Shop levels up.*
- **One label** (28 px Abu) at the bottom: *Made and repaid on testnet.*
- **Remove:** the total row, the three "No due date / late fees / collectors" lines (the headline says it), the footnote, the 90/10 split beat, the stall beat, the bottom line.

### Slide 7: Safety (dark slide; the most important slide)
- **Headline:** The AI proposes. The contract decides. ("The contract decides." in Kunyit 500.)
- **Main visual: the two red-team results side by side, large** (each about 780 px wide), cropped from `screens/desktop/11-redteam-policy-blocked.png` and `12-redteam-contract-reverts.png` (or the stills `11-redteam-blocked.jpg`, `12-redteam-reverted.jpg`, cropped above the burned-in captions). The **BLOCKED** and **REVERTED** stamps must be readable from the back of a hall. Above each, in JetBrains Mono 600 32 px:
  - Left: `Rp 1.000.000.000 at 0% fee`, and under the crop (32 px): *Policy layer: blocked.*
  - Right: `Same request, policy layer off`, and under the crop (32 px): *Contract: still rejected.*
- **Above the panels**, one row of four small chips (32 px, `#EDE8DC` on `#121731`, 1.5 px `#B4AFA3` border): Key can only propose · Hard caps in the contract · Code writes every number · Reply guard
- **Keep:** the dashed `SIMULATION · NOTHING IS BROADCAST` badge, then *Try it: kulaya.vercel.app/protocol/redteam* (32 px).
- **Remove:** `dia-shields.svg` and its Kertas panel, the numbered list with sentences.
- Still true: never imply a real transaction failed; it's a simulation against the live contract.

### Slide 8: Why on-chain
- **Headline:** What a bank can't see, the chain can prove.
- **Three columns** across the content width, each a 72 px icon, a bold line (44 px), and at most one short line (32 px):
  - `icon-penjualan` **The shop owns its record.** *Any lender can verify it.*
  - `icon-cicilan` **Repayment happens inside the payment.** *No collector.*
  - `icon-verifikasi` **The AI has a public track record.** `ERC-8004 agent #2535 · 100/100` (JetBrains Mono 32 px)
- **Remove:** the architecture diagram (it stays in the reading version), the "open pool" call-out, the gasless bottom line.

### Slide 9: Proof and honesty
- **Headline:** Working on testnet. Here is what's real, and what isn't yet.
- **Left, "Built and verified"** (green `icon-lunas`, 36 px lines): **33** contract tests · A full loan cycle on-chain · AI reputation on-chain: **100/100**
- **Right, "Honest limits"** on the Aren 100 panel (amber `icon-peringatan`, 36 px lines): Testnet, test money · The QR is not QRIS yet · No real pilot yet · Needs a licensed lender
- **Keep:** the bottom line with the contract address `0xF6fD…21D8` (28 px).
- **Remove:** the TypeScript tests line, the 30 shops line, all explanatory clauses.
- The four honest limits must all stay visible and must not be softened.

### Slide 10: Next, and try it
- **Headline:** Next: real rupiah, through QRIS.
- **Roadmap: three nodes** on the line (first filled Kunyit 500), bold titles 40 px, no sentences: **QRIS bridge** · **Licensed lender, via OJK sandbox** · **Mainnet, real IDRX**
- **New: one key card** (stamp shadow), 40 px: *Looking for:* **a licensed lending partner.**
- **QR codes: two large ones** (300 px, on white cards): `qr-app.svg` **Try the app** · `qr-redteam.svg` **Try to break it**. The video link becomes a 28 px text line: *Demo video: youtu.be/mTLAuLq-RCg*. The audience will scan these, so give them space.
- **Keep:** the closing line *Kulaya: credit that grows from every sale.* and the awning edge. `mascot-greet.svg` is optional; drop it if space is tight.
- **Remove:** the fourth roadmap step, the Telegram and GitHub lines, the "Built solo" line (the speaker says it).

## 4. Deliverable and QA

- One PDF, **`Kulaya Pitch Deck - Stage.pdf`**, 10 pages at 1920 × 1080, fonts embedded, no speaker notes needed.
- [ ] Same 10 headlines, word for word, in the same order as the current deck.
- [ ] At most 20 body words per slide; nothing under 28 px except the footer.
- [ ] Every slide readable at 480 × 270.
- [ ] Slide 7: BLOCKED and REVERTED readable at 480 × 270; "simulation" visible.
- [ ] Slide 9: all four honest limits present, unchanged in meaning.
- [ ] Slide 10: two QR codes at least 300 px, and they scan from a phone held 2 m from a laptop screen.
- [ ] No new numbers, art, icons or claims beyond the current deck.
