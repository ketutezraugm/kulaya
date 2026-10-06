# Kulaya pitch deck: complete handoff for Claude Design

You are designing the pitch deck for **Kulaya**, a hackathon project. Everything you need is in this document and in the uploaded bundle (`kulaya-deck-bundle.zip`). You have no access to the code repository, so do not assume anything that is not written here. **Use only the bundle's art, screens and facts.** When something is not specified, choose the plainer option.

---

## 0. The bundle (what each folder is for)

| Folder / file | Contents | Use |
|---|---|---|
| `kulaya-tokens.css` | The product's design tokens (colours, type scale, radii, shadows). | Source of truth for colours and the stamp shadow. |
| `art/logo/` | `logo-lockup.svg` (icon + wordmark), `logo-lockup-reversed.svg` (for dark backgrounds), `logo-icon.svg`, `logo-wordmark.svg`, mono variants. | Logo on the title and closing slides, small logo in the footer. |
| `art/scene/` | Hand-drawn scenes: `ill-landing-hero.svg` (the warung "BAKSO BU SRI" with owner and customer), `ill-step-scan.svg`, `ill-step-offer.svg`, `ill-step-split.svg` (the three "how it works" steps), `ill-pinjol-side.svg` (phone with predatory-loan alerts), `ill-kulaya-side.svg` (calm stall), `ill-shutter-closed.svg`, `ill-coin-drop.svg`, `ill-wallet-confirm.svg`, `ill-envelope-offer.svg`, `ill-registered.svg`, `picto-1-scan.svg`, `picto-2-confirm.svg`, `picto-3-done.svg`, and the state scenes. | Main illustrations. |
| `art/mascot/` | The coin-jar mascot: `mascot-greet.svg`, `mascot-explain.svg`, `mascot-point.svg`, `mascot-think.svg`, `mascot-celebrate.svg`, `mascot-apologetic.svg`. | At most once per slide, small, as a guide character. Never as decoration filler. |
| `art/stall/` | The level ladder: `ill-stall-perintis.svg` → `ill-stall-berkembang.svg` → `ill-stall-maju.svg` → `ill-stall-unggul.svg`, plus round `badge-level-*.svg`. | The credit-level slide. |
| `art/motif/` | `motif-awning-tile.svg` (the striped awning scallop, repeat horizontally), `motif-awning-tile-soft.svg`, `motif-nota-edge.svg` (the zig-zag receipt edge), `pattern-kawung.svg` / `pattern-kawung-faint.svg` (Javanese kawung pattern), `jar-0.svg` … `jar-100.svg` (coin jar filling up), `stamp-uji-coba.svg` ("test version" stamp). | Edges, receipts, texture. |
| `art/dev/` | `dia-architecture.svg` (system diagram), `dia-shields.svg` (four-layer shield), `dia-gasless.svg` (signature → relayer → contract), `badge-track-ai-agents.svg`, `badge-track-finance.svg`, `badge-track-consumer.svg`. | Architecture, safety and title slides. |
| `art/icon/` | 43 line icons on a 24 px grid, ink stroke with a kunyit fill accent. Names are Bahasa: `icon-terima-bayar` (receive payment / QR), `icon-modal` (capital), `icon-cicilan` (repayment), `icon-aman` (safe), `icon-tanpa-jaminan` (no collateral), `icon-tanpa-penagih` (no collectors), `icon-biaya` (fee), `icon-verifikasi` (verify), `icon-kode` (code), `icon-telegram`, `icon-pesan-suara` (voice note), `icon-dompet` (wallet), `icon-pelanggan` (customers), `icon-penjualan` (sales), `icon-bahasa` (language), `icon-level`, `icon-lunas` (repaid / check), `icon-gagal` (fail / cross), `icon-peringatan` (warning), `icon-waktu` (time), `icon-lanjut` (arrow), and more. | Small inline icons in lists and steps. |
| `screens/phone/` | Real screens of the live app, 780 × 1688 px (phone at 2×): `00-landing.png`, `01-beranda.png` (home: "Selamat siang, Bu Sri"), `02-terima-amount.png` (keypad), `03-terima-qr.png` (payment QR), `04-modal-limit.png` (credit limit), `05-riwayat.png` (sales history), `06-tanya-empty.png` (AI chat), `07-customer-pay.png` (customer pay page). `*-full.png` are full-length captures. | Product slide. Always inside the phone frame described in §3.6. |
| `screens/desktop/` | The English judge site, 1440 px wide: `10-protocol-overview.png`, `11-redteam-policy-blocked.png`, `12-redteam-contract-reverts.png`, `13-protocol-overview-full.png`. | Safety slide (red-team proof). Crop to the relevant panel. |
| `stills/` | 1920 × 1080 frames from the demo video: `01-customer-paid`, `02-owner-payment-received`, `03-sales-30-days`, `04-credit-limit-receipt`, `05-ai-offer-in-chat`, `06-offer-terms`, `07-loan-received`, `08-repay-montage`, `09-lunas`, `10-level-up-erc8004`, `11-redteam-blocked`, `12-redteam-reverted`, `13-four-shields`. **English captions are burned into the bottom of every still: always crop above y = 900 or crop tightly to the panel you need.** | Close-ups of moments that are not in the app screenshots (offer terms, "Lunas!", REVERTED). |
| `qr/` | QR codes in brand ink on a transparent background: `qr-app.svg` (kulaya.vercel.app), `qr-redteam.svg` (kulaya.vercel.app/protocol/redteam), `qr-video.svg` (youtu.be/mTLAuLq-RCg), `qr-github.svg`, `qr-telegram.svg`. | Closing slide. Minimum 220 px square, on a white card. |
| `brand/` | `brand-sheet.jpg` and `components-sheet.jpg`: full captures of the designer's original brand and component sheets. | Reference for the visual language. Look at these before you start. |

---

## 1. Deliverable

- **10 slides, 16:9, 1920 × 1080 px each.** Exported as **one PDF** (vector text where possible, fonts embedded). If you produce HTML, every slide is a fixed 1920 × 1080 section with `@page { size: 1920px 1080px; margin: 0 }` and `break-after: page`, so the browser's *Print → Save as PDF* gives exactly 10 clean pages with no browser headers.
- Presented live in about **3 to 4 minutes**, and also read on its own by judges: every slide must make sense without the speaker.
- **Speaker notes** for every slide are given in §5. Put them in the notes field if your format has one; otherwise deliver them as a separate text file. They must not appear on the slides.
- Language: **English**. Bahasa appears only as the product's own words (the slogan, UI inside screenshots), always with an English translation next to it.

## 2. Audience and story

**Audience:** hackathon judges for the Indonesia Web3 Hackathon 2026 (tracks: AI Agents, Finance & Commerce, Consumer Apps). They are technical and business people, international, who will see many decks in a row. They reward clarity, honesty and proof.

**The one thing they must remember:** *Kulaya turns a small shop's everyday sales into fair credit, and the AI that offers the loan cannot break the rules, because the smart contract has the final word.*

**Story arc (one line per slide):**
1. Title: what Kulaya is, in one line.
2. Problem: millions of small shops have no record a lender trusts, so they fall to predatory lenders.
3. How it works: every sale becomes a record, the record becomes a limit, the loan repays itself.
4. Product: a Bahasa-first app built for shop owners, gasless, with a Telegram bot.
5. The credit math: limits come from real sales, with rules that make fake sales useless.
6. The loan: plain terms, no due date, no collectors, repaid from sales, then the shop levels up.
7. Safety: the AI proposes, the contract decides, and you can try to break it.
8. Why on-chain: the record, the repayment and the AI's reputation are public and verifiable.
9. Proof and honesty: what is built and tested, and what is not real yet.
10. What's next, and try it now.

## 3. Design system (follow exactly)

### 3.1 Anti-slop rules (non-negotiable)

This deck must look like it was made by the same hand that made the product. Reject anything generic.

**Never use:**
- Stock photos, AI-generated images, 3D renders, isometric illustrations, abstract blobs, gradient meshes, glassmorphism, neon glows, "crypto" visuals (glowing chains, coins raining, rockets, hexagon grids, circuit boards, globe networks).
- Any illustration or icon that is not in the bundle. If something is missing, use typography or a plain shape in brand colours, not a new illustration.
- Emoji, decorative unicode symbols, or icon fonts.
- Gradients of any kind, drop shadows other than the stamp shadow (§3.5), rounded "pill" buttons as decoration, frosted panels, bokeh, vignettes.
- Filler words and phrases: *revolutionize, seamless, empower, unlock, leverage, cutting-edge, next-generation, game-changer, synergy, robust, innovative, harness, ecosystem, journey, world-class, democratize*. Also no rhetorical-question headlines and no exclamation marks in headlines.
- Generic slide titles such as "Problem", "Solution", "Our Team", "Market". Every headline states a point (§4 gives them).
- Invented numbers, charts, user counts, testimonials, partner logos, or "as seen on". Only the facts in §6.
- Centered body text. Body text is left-aligned. Only the title slide's main line may be centered.
- More than one mascot per slide. More than one big illustration per slide.
- Text over illustrations, or illustrations cropped through their outlines.

**Always:**
- Flat colours from §3.2 only. Hand-drawn art with its 2–3 px nila outlines, exactly as delivered (do not recolour, restyle or add effects to SVGs).
- Generous whitespace. A slide that feels empty is better than a slide that feels busy.
- One idea per slide. Body text at most about 40 words (counting labels and captions, excluding the headline).
- Real product screens inside the phone frame (§3.6), never mocked-up UI.

### 3.2 Colours (from `kulaya-tokens.css`)

| Name | Hex | Use |
|---|---|---|
| Kertas (paper) | `#FBF7EF` | Default slide background. |
| Kertas 2 | `#F4EEE1` | Sunk panels, alternating bands. |
| Putih | `#FFFFFF` | Cards, receipts, screen backdrops. |
| Nila 900 (ink) | `#1E2A5A` | Headlines, outlines, primary text on paper, the stamp shadow. |
| Nila 700 | `#2F3F86` | Links, secondary emphasis. |
| Nila 200 | `#C9CFEA` | Phone-frame shadow. |
| Nila 100 | `#E6E9F5` | Soft tint panels. |
| Kunyit 500 (turmeric) | `#F2B33D` | The single accent: one highlight per headline at most, the awning stripes, key numbers' underline, active step. |
| Kunyit 100 | `#FDF1D6` | Soft accent panels. |
| Tinta (body ink) | `#1B1A17` | Body text on paper. |
| Abu (muted) | `#57534A` | Captions and secondary text on paper. |
| Garis (line) | `#E7E1D3` | Hairlines and card borders. |
| Garis kuat | `#CBC1AC` | Dashed separators in receipts. |
| Daun 700 (green) | `#17613F` text / `#E2F0E7` fill | Success only: "Lunas", "PASS", "repaid". |
| Bata 700 (red) | `#8E3324` text / `#F7E4DF` fill | Danger only: "BLOCKED", "REVERTED", pinjol harms. |
| Aren 700 (amber) | `#7A4800` text / `#F3E2C7` fill | Warnings only: "Honest limits", "testnet". |
| Dark slide | background `#121731`, text `#EDE8DC`, muted `#B4AFA3`, accent `#F2B33D` | Only slide 7, matching the product's dark judge console. |

Colour ratio on a paper slide: about 75% paper, 20% ink, at most 5% kunyit. Red and green appear only where they mean something.

### 3.3 Typography

Load from Google Fonts: **Bree Serif** (400), **Plus Jakarta Sans** (400, 500, 600, 700, 800), **JetBrains Mono** (400, 600).

| Role | Font | Size / line height (px on a 1920 × 1080 slide) | Colour |
|---|---|---|---|
| Title slide main line | Bree Serif 400 | 88 / 1.05 | Nila 900 |
| Headline | Bree Serif 400 | 72 / 1.08, max 2 lines, balanced wrapping | Nila 900 (on paper slides one phrase may carry a 10 px Kunyit 500 underline bar; on the dark slide one phrase may be Kunyit 500) |
| Big number | Bree Serif 400 | 96–140 / 1.0 | Nila 900 |
| Subhead | Plus Jakarta Sans 600 | 34 / 1.3 | Tinta |
| Body / list | Plus Jakarta Sans 500 | 28 / 1.4 | Tinta |
| Label / caption | Plus Jakarta Sans 600 | 22 / 1.35, never smaller than 20 | Abu |
| Money in tables and receipts | Plus Jakarta Sans 700, tabular figures (`font-variant-numeric: tabular-nums`), right-aligned | 28 | Nila 900 |
| Code, addresses, contract errors | JetBrains Mono 600 | 22–26 | Nila 900 on paper, `#EDE8DC` on dark |

Rupiah is written the Indonesian way: `Rp 1.211.500` (dot thousands separator, space after Rp). Short form: `Rp 1,2 jt` (comma decimal; "jt" means juta, million). Never `$`, never `IDR 1,211,500`.

### 3.4 Grid and slide furniture

- **Margins:** 112 px left and right, 96 px top, 88 px bottom. **12-column grid**, 24 px gutters.
- **Headline** sits at the top-left of the content area on every slide except the title slide.
- **Footer (slides 2–10):** a 1.5 px Garis hairline across the content width, 56 px above the bottom edge; under it, left: `logo-icon.svg` 28 px tall + "Kulaya" in Plus Jakarta Sans 700 20 px Nila 900; right: the slide number "02 / 10" in JetBrains Mono 600 20 px Abu. Nothing else in the footer. On the dark slide use `logo-lockup-reversed.svg`'s icon colours and `#B4AFA3` for the number.
- **Awning edge:** the title slide and the closing slide have the awning scallop (`motif-awning-tile.svg` repeated horizontally, 44 px tall) across the very top edge. No other slide uses it at full width; it may top a single key card (§3.5).
- **Receipt (nota) style:** white panel, 6 px radius on the top corners, `motif-nota-edge.svg` repeated along the bottom edge (scale the 12 × 6 tile to 24 × 12), dashed 1.5 px Garis kuat separators between rows, money right-aligned in tabular figures. Use it for any list of amounts.

### 3.5 Cards, pills and the stamp shadow

- **Key card** (at most one per slide): white fill, 2 px Nila 900 border, 18 px radius, **stamp shadow `8px 8px 0 #1E2A5A`** (the product's signature: flat offset, no blur). Optionally topped with the awning edge inside the card (16 px tall).
- **Regular card:** white fill, 1.5 px Garis border, 18 px radius, no shadow.
- **Status pill:** fully rounded, 8 px vertical and 16 px horizontal padding, Plus Jakarta Sans 700 22 px, with a 24 px icon from the bundle: green (`icon-lunas`) for done, red (`icon-gagal`) for blocked, amber (`icon-peringatan` or `icon-waktu`) for warnings. The text always says the status in words; colour is never the only signal.
- **Rubber stamp** (for "BLOCKED", "REVERTED", "LUNAS!"): uppercase JetBrains Mono 600 or Bree Serif, 3 px border in the status colour, 6 px radius, rotated −8°, no fill. Prefer the real stamps from the stills.

### 3.6 Phone frame (for app screenshots)

Real screenshots go inside a simple drawn phone: rectangle with a 44 px corner radius, a 10 px Nila 900 border, white inside, no notch, no buttons, no reflections, no perspective tilt, flat shadow `10px 10px 0 #C9CFEA`. Screen images keep their aspect ratio (780 × 1688, about 0.462). Display width on a slide: 300–360 px. At most three phones per slide, upright, aligned on a common baseline, never overlapping.

### 3.7 Logo rules (from the brand sheet)

- Use the drawn logo files only; never set "kulaya" in a font. Full-colour `logo-lockup.svg` on paper or white; `logo-lockup-reversed.svg` on nila or the dark slide; never put the full-colour mark on kunyit.
- Clear space around the logo: at least one awning-bar width on every side. Minimum size: 88 px wide for the lockup, 16 px for the icon.
- Do not recolour the bars, flatten the slope, add gradients or shadows to the logo.

### 3.8 Illustration use

- Use the SVGs at their natural proportions. Minimum display size for a scene: 420 px wide. Keep at least 48 px of empty space around each illustration.
- Do not combine two scenes into one composition, flip them, or add backgrounds behind them other than a Kunyit 100 or Nila 100 rounded panel.
- On the dark slide, put illustrations on a Kertas rounded panel (they are drawn in dark ink and disappear on dark backgrounds).

---

## 4. Slide-by-slide specification

Each slide lists purpose, exact on-slide copy, layout, assets, and what to avoid. **The copy is final**: do not rewrite it. If a line physically does not fit, shorten it while keeping its meaning and its numbers.

### Slide 1: Title

- **Purpose:** say what Kulaya is in one breath, and look like the product.
- **Copy:**
  - Logo: `logo-lockup.svg` (do not retype the name).
  - Main line (Bree Serif 88, Nila 900): **Credit that grows from every sale.**
  - Slogan (Plus Jakarta Sans 600 30, Abu): *Modal usaha, dari hasil jualan sendiri.*
  - Description (Plus Jakarta Sans 500 28, Tinta): AI micro-credit for Indonesia's small shops, enforced by a smart contract on BNB Chain.
  - Bottom row, left: the three track badges (`badge-track-ai-agents.svg`, `badge-track-finance.svg`, `badge-track-consumer.svg`, 72 px each), each with its label under it (22 px Abu): *AI Agents*, *Finance & Commerce*, *Consumer Apps*.
  - Bottom row, right (22 px Abu): *Indonesia Web3 Hackathon 2026 · @ezrahesperos*
- **Layout:** awning edge across the top. Left 6 columns: logo lockup (360 px wide), then main line, slogan and description stacked with 28 px gaps, vertically centred in the space above the bottom row. Right 6 columns: `ill-landing-hero.svg`, about 760 px wide, bottom-aligned to the top of the bottom row. Background Kertas. No footer on this slide.
- **Avoid:** quotation marks around the tagline, a date, the word "presents".

### Slide 2: Problem

- **Purpose:** make the pain concrete and human.
- **Headline:** **64 million small shops. No record a lender trusts.**
- **Label under the headline** (22 px Abu): *"Pinjol" is the Indonesian name for online lending apps, many of them predatory.*
- **Three stacked rows on the left 7 columns**, each: a 64 px icon, a bold line (Plus Jakarta Sans 700 30), one sentence (28 px):
  1. `icon-penjualan`. **Sales live in a notebook.** The income is real, but cash and paper prove nothing to a lender.
  2. `icon-peringatan`. **So they turn to pinjol.** Interest that keeps growing, collectors who call the family, apps that read their contacts.
  3. `icon-modal`. **No fair working capital.** A shop that sells every day cannot borrow to buy tomorrow's stock.
- **Right 5 columns:** `ill-pinjol-side.svg` (about 520 px) on a Bata 100 rounded panel (24 px radius, 40 px padding).
- **Avoid:** any statistic beyond the 64 million, sad imagery, red anywhere except the pinjol panel.

### Slide 3: How it works

- **Purpose:** the whole mechanism in four steps.
- **Headline:** **Every sale becomes credit.**
- **Four step columns in a row** (3 grid columns each). Each column: step number in a 48 px Nila 900 circle with a Kunyit 500 Bree Serif numeral, a visual (about 300 px wide), a bold title (Plus Jakarta Sans 700 30), one sentence (26 px):
  1. Visual `ill-step-scan.svg`. **Sell by QR.** Customers scan and pay. They only sign; Kulaya pays the network fee.
  2. Visual: a small receipt in nota style (§3.4) with three sale rows (*Pelanggan #12 · Rp 25.000*, *Pelanggan #7 · Rp 40.000*, *Pelanggan #31 · Rp 15.000*) and a tiny label *on-chain* in JetBrains Mono. **Build a record.** Every sale is written on-chain and owned by the shop.
  3. Visual `ill-step-offer.svg`. **Get an offer.** The AI reads verified sales and proposes a loan. The owner decides.
  4. Visual `ill-step-split.svg`. **Repay by selling.** About 10% of each sale repays the loan automatically.
- **Connectors:** a 3 px Nila 900 line with `icon-lanjut` (32 px) between the columns, at the height of the visuals' baseline.
- **Bottom band:** Kunyit 100 panel across the content width, 96 px tall, three items with 32 px icons: `icon-tanpa-jaminan` **No collateral** · `icon-tanpa-penagih` **No collectors, no due date** · `icon-biaya` **Flat fee, written up front, at most 5%**.
- **Avoid:** circular "flywheel" diagrams, more than four steps.

### Slide 4: The product

- **Purpose:** show the real app and who it is for.
- **Headline:** **Built for a shop owner, not for a crypto user.**
- **Left 9 columns: three phones** (each 320 px wide, §3.6), each with a caption under it (24 px, first phrase bold):
  1. `screens/phone/03-terima-qr.png`: **Show the QR.** The customer pays in seconds.
  2. `screens/phone/01-beranda.png`: **See today's sales.** And how much capital is possible.
  3. `screens/phone/06-tanya-empty.png`: **Ask, even by voice note.** In the app or on Telegram.
- **Small note under the phones** (20 px Abu): *Screens from the live app. The interface is in Bahasa Indonesia.*
- **Right 3 columns: a key card** topped with the awning edge, list with 28 px icons and 26 px text:
  - `icon-bahasa` Bahasa-first, no jargon
  - `icon-dompet` Gasless: owners and customers only sign
  - `icon-telegram` A Telegram bot that takes voice notes
  - `icon-aman` Large type, one action per screen
- **Avoid:** angled or overlapping phones, fake UI.

### Slide 5: The credit math

- **Purpose:** prove that the limit is computed from real sales, by rules nobody can bend.
- **Headline:** **The limit comes from real sales, not from a score.**
- **Left 6 columns: a receipt** (nota style, §3.4) titled *Credit limit · Warung Bu Sri* (Plus Jakarta Sans 700 26), rows:
  - Verified sales, last 30 days → **Rp 12.115.000**
  - × 10% → **Rp 1.211.500**
  - Level ceiling (Berkembang) → **Rp 2.000.000**
  - dashed separator
  - **Credit limit** (Plus Jakarta Sans 700 30) → **Rp 1.211.500** (Bree Serif 56, Nila 900)
  - inside the receipt, last line (20 px Abu): *The smaller of the two, computed by the smart contract.*
- **Right 6 columns: the level ladder.** The four stalls `ill-stall-perintis.svg`, `ill-stall-berkembang.svg`, `ill-stall-maju.svg`, `ill-stall-unggul.svg` in a row, growing (about 150, 175, 200, 225 px wide), bottom-aligned on a 3 px Nila 900 ground line, each labelled under it (22 px, level name bold): *Perintis · Rp 1 jt*, *Berkembang · Rp 2 jt*, *Maju · Rp 4 jt*, *Unggul · Rp 8 jt*. A "×2" in JetBrains Mono 20 px between neighbouring stalls. Caption under the ladder (24 px): *Each repaid loan raises the level, and the ceiling doubles.*
- **Bottom: two regular cards** side by side, 28 px icon + text: `icon-pelanggan` **At least 5 different customers** · `icon-verifikasi` **One customer counts for at most Rp 250.000 a day**. Under them (24 px Tinta): *Paying yourself, or one friend paying a lot, does not raise the limit.*
- **Avoid:** credit-score dials, pie charts, the word "algorithm".

### Slide 6: The loan

- **Purpose:** show a real offer, and how calmly it repays.
- **Headline:** **Plain terms. Repaid from sales. No due date.**
- **Left 5 columns: key card (stamp shadow) styled as the offer receipt**, title *Loan offer* (Plus Jakarta Sans 700 26). Rows (money right-aligned, tabular):
  - You receive → **Rp 800.000**
  - Flat fee → **Rp 24.000**
  - Total to repay → **Rp 824.000**
  - Taken from each sale → **10%**
  - Three lines with green `icon-lunas`: *No due date* · *No late fees* · *No collectors*
  - Footnote (20 px Abu): *Terms are read from the contract, not from the chat. Accepting takes one signature.*
- **Right 7 columns: how it repays, three beats left to right**, joined by `icon-lanjut`:
  1. A sale row **Rp 50.000** splitting into two labels: **Rp 45.000 to the shop** and **Rp 5.000 repays the loan** (green text). Alternatively crop `stills/08-repay-montage.jpg` to its "90% / 10%" cards.
  2. A progress bar (16 px tall, 1.5 px Nila 900 border, Kunyit 500 fill) at 100% with the green rubber stamp **LUNAS!** and the caption *Repaid in full.* Alternatively crop `stills/09-lunas.jpg`.
  3. `ill-stall-berkembang.svg` (about 220 px) with the green pill **Level up: Berkembang** and the caption *New ceiling: Rp 2 jt.*
- **Bottom line** (24 px Tinta): *A slow week only means slower repayment. This exact loan was made and repaid on-chain.*
- **Avoid:** APR language, interest-rate charts, the word "debt".

### Slide 7: Safety (the dark slide)

- **Purpose:** the key differentiator: a jailbroken AI still cannot lend outside the rules, with proof.
- **Background:** `#121731`, optional `pattern-kawung-faint.svg` at 4% opacity. Text `#EDE8DC`.
- **Headline:** **The AI proposes. The contract decides.** ("The contract decides." in Kunyit 500.)
- **Left 5 columns:** `dia-shields.svg` on a Kertas rounded panel (24 px radius, 32 px padding), about 360 px wide. Under it, the four layers as a numbered list (number in a 40 px Kunyit 500 circle with a Nila 900 numeral; title Plus Jakarta Sans 700 26; sentence 22 px `#B4AFA3`):
  1. **The AI's key can only propose.** It holds no funds; accepting needs the owner's signature.
  2. **Hard caps in the contract.** Limit, fee at most 5%, repayment at most 20%, pool exposure, daily budget.
  3. **The AI never writes numbers.** Code fills every figure from the chain.
  4. **Reply guard.** A figure not found in a tool result forces a rewrite.
- **Right 7 columns: "We attacked it."** (Plus Jakarta Sans 700 30). Two stacked result panels, cropped from the real red-team captures (`screens/desktop/11-redteam-policy-blocked.png`, `12-redteam-contract-reverts.png`, or the stills `11-redteam-blocked.jpg`, `12-redteam-reverted.jpg`), each with a JetBrains Mono 600 22 px title above it:
  - `Request: Rp 1.000.000.000 at 0% fee` → crop showing **Policy layer: BLOCKED**. Caption (22 px): *Blocked by the policy layer: above the shop's ceiling.*
  - `Same request, policy layer switched off` → crop showing **Warung.sol: REVERTED · ExceedsCreditCap**. Caption: *The contract alone still rejects it.*
  - Under both: a dashed-border badge (JetBrains Mono 600 20, Kunyit 500) `SIMULATION · NOTHING IS BROADCAST`, then (22 px): *Try it: kulaya.vercel.app/protocol/redteam*
- **Avoid:** "unhackable", "100% secure", padlocks, shields other than `dia-shields.svg`. Never imply a real transaction failed on-chain: it is a simulation against the live contract.

### Slide 8: Why on-chain

- **Purpose:** answer "why does this need web3?" with specifics.
- **Headline:** **What a bank can't see, the chain can prove.**
- **Left 8 columns:** `dia-architecture.svg` on a regular white card, about 1000 px wide.
- **Right 4 columns: four call-outs**, each a 32 px icon, a bold line (26 px) and one sentence (22 px):
  - `icon-penjualan` **A record the shop owns.** Every sale is a public event any lender can verify.
  - `icon-cicilan` **Repayment by code.** The split happens inside the payment; no collector needed.
  - `icon-modal` **An open pool.** Anyone can fund shops; 20% of every fee goes to a first-loss reserve.
  - `icon-verifikasi` **An AI with a track record.** The underwriter is ERC-8004 agent #2535: **100/100 from 1 loan**.
- **Bottom line** (22 px Abu): *Gasless: users sign EIP-712 messages, a relayer submits them, and the contract moves only exactly what was signed.*
- **Avoid:** chains of blocks, globes, token prices, "decentralized" as a selling word.

### Slide 9: Proof and honesty

- **Purpose:** show what is real today and say plainly what is not.
- **Headline:** **Working on testnet. Here is what's real, and what isn't yet.**
- **Left 6 columns: "Built and verified"** (Plus Jakarta Sans 700 30, Nila 900), list with green `icon-lunas`, key numbers in Bree Serif inline:
  - Smart contracts with **33** Foundry tests: unit, fuzz, invariants, relay attacks
  - App, AI agent and bot with **32** unit tests, plus live end-to-end browser journeys
  - A full loan cycle on-chain: proposed, accepted, repaid by **50** customer payments, closed
  - The AI's on-chain reputation: **100/100** from **1** loan
  - **30** shops registered on testnet (demo and test shops)
- **Right 6 columns: "Honest limits"** (Plus Jakarta Sans 700 30, Aren 700) on an Aren 100 panel, list with amber `icon-peringatan`:
  - Testnet only. The rupiah stablecoin is a mock (MockIDRX); no real money.
  - The QR is not QRIS yet. OVO, GoPay and bank apps cannot scan it.
  - No real pilot users yet.
  - A real launch needs a licensed lender of record.
- **Bottom line** (22 px Abu): *Verify it: contract* `0xF6fD…21D8` *on BNB Smart Chain Testnet (chain 97).* (address in JetBrains Mono)
- **Avoid:** softening the limits, growth charts, the word "traction".

### Slide 10: What's next, and try it

- **Purpose:** the path to real use, then the links.
- **Headline:** **Next: real rupiah, through QRIS.**
- **Top half: four roadmap steps** on a horizontal 3 px Nila 900 line with four 24 px circle nodes (the first filled Kunyit 500, the rest outlined). Under each node: a bold title (26 px) and one line (22 px):
  1. **QRIS bridge.** Customers pay with any e-wallet; a licensed provider settles IDRX into the same contract.
  2. **Licensed lending partner.** A licensed P2P lender or koperasi as lender of record, through the OJK sandbox.
  3. **Mainnet with real IDRX.**
  4. **Invisible wallets.** Embedded wallets and a paymaster, so owners never see crypto.
- **Bottom half:** three white regular cards in a row, each with a QR (220 px) and a label under it (22 px, first phrase bold): `qr-app.svg` **Try the app** · kulaya.vercel.app; `qr-redteam.svg` **Try to break it** · /protocol/redteam; `qr-video.svg` **Watch the demo** · youtu.be/mTLAuLq-RCg. To their right: `mascot-greet.svg` (180 px) and two lines (22 px): *Telegram: @KulayaBot* · *Code: github.com/ketutezraugm/kulaya*.
- **Closing line** (Bree Serif 40, Nila 900), left, above the footer: *Kulaya: credit that grows from every sale.* Under it (20 px Abu): *Built solo by @ezrahesperos for Indonesia Web3 Hackathon 2026.*
- **Awning edge** across the very top of this slide, like slide 1.
- **Avoid:** "Thank you" or "Questions?" as the headline, dates on the roadmap.

---

## 5. Speaker notes (one per slide, not on the slides)

1. Kulaya gives Indonesia's small shops credit that grows from their own sales. An AI offers the loan, but a smart contract on BNB Chain sets the rules, and the AI cannot break them.
2. Indonesia has around 64 million small businesses. They sell every day, but their records are cash and notebooks, which no lender trusts. So when they need stock money, they end up with pinjol: predatory apps with growing interest and collectors who call the family.
3. Kulaya fixes the record first. Customers pay by QR, gaslessly. Every sale is written on-chain, owned by the shop. That record becomes a credit limit, the AI offers a loan, and the loan repays itself from a share of each sale. No collateral, no collectors, a flat fee.
4. The owner never sees crypto words. The app is in Bahasa, one action per screen, and works from a phone. Owners can also talk to the Telegram bot, even with a voice note.
5. The limit is not a score. It is ten percent of verified sales over thirty days, capped by the shop's level. Fake sales don't work: it needs five different customers, and one customer counts for at most two hundred fifty thousand rupiah a day.
6. Here is the real loan from our demo: eight hundred thousand rupiah, a flat fee of twenty-four thousand, and ten percent of each sale repays it. There is no due date. When it's repaid, the shop moves up a level and can borrow more next time. This loan really happened on-chain.
7. This is the part we care about most. LLMs can be jailbroken, so we don't trust the AI. Its key can only propose. The contract has hard caps, code writes every number, and a reply guard checks the AI's words. We attacked it: a one-billion-rupiah request is blocked, and with the policy layer switched off, the contract itself still rejects it. You can try it yourself.
8. Why on-chain? Because the record has to be owned by the shop and verifiable by any lender, repayment has to happen without collectors, and the AI's own track record has to be public. Kulaya's underwriter is a registered ERC-8004 agent whose reputation is written by real loan outcomes.
9. Everything here runs on testnet today and is covered by tests, including a full loan cycle. And to be clear about the limits: it is test money, the QR is not QRIS yet, there is no real pilot yet, and a real launch needs a licensed lender.
10. The path to real use is QRIS: customers pay with the e-wallets they already have, and a licensed provider settles into the same contract. Then a licensed lending partner, mainnet, and wallets the owner never sees. Scan to try the app, to try to break it, or to watch the demo. Kulaya: credit that grows from every sale.

## 6. Verified facts (the only numbers you may use)

- Network: **BNB Smart Chain Testnet, chain id 97**. Test money only (MockIDRX, a stand-in for the IDRX rupiah stablecoin).
- Core contract: `0xF6fD0727D20eD76442BfD16727fA4ce1482321D8` (short form `0xF6fD…21D8`; code name `Warung`).
- AI underwriter: **ERC-8004 agent #2535**, reputation **100/100 from 1 closed loan**.
- Credit rules, enforced by the contract: limit = **10% of verified 30-day sales**, capped by level: **Perintis Rp 1 jt → Berkembang Rp 2 jt → Maju Rp 4 jt → Unggul Rp 8 jt** (doubles after each fully repaid loan); fee **flat, at most 5%**; repayment **at most 20% of each sale** (offers use about 10%); at least **5 different customers**; one customer counts for at most **Rp 250.000 per day**; minimum payment Rp 5.000; an offer is valid 24 hours; a loan is written off only after 14 days with no sales; **20% of every fee goes to a first-loss reserve**; each loan is at most 5% of the pool.
- Demo shop **Warung Bu Sri** (as shown in the demo video): level Berkembang, 30-day verified sales **Rp 12.115.000**, credit limit **Rp 1.211.500**.
- Real loan on-chain: **Rp 800.000** principal, **Rp 24.000** flat fee (3%), **Rp 824.000** total, repaid at **10% of each sale** by **50** customer payments, closed; the shop moved from Perintis to Berkembang.
- Tests: **33** Foundry tests (contracts), **32** TypeScript unit tests, plus live API checks and real-browser end-to-end journeys.
- Testnet network (Oct 6, 2026): **30 shops registered** (demo and test shops), **7 loans proposed**, **1 repaid**, **0 written off**; pool about **Rp 100 jt** of test IDRX.
- Market: Indonesia has **around 64 million** micro, small and medium businesses (UMKM). Say "around"; use no other market numbers.
- Links: app **kulaya.vercel.app**, judge site **kulaya.vercel.app/protocol**, red-team console **kulaya.vercel.app/protocol/redteam**, demo video **youtu.be/mTLAuLq-RCg**, code **github.com/ketutezraugm/kulaya**, Telegram **@KulayaBot**. Builder: **@ezrahesperos** (solo).

## 7. Final QA checklist (check every item before exporting)

- [ ] Exactly 10 slides, 1920 × 1080, exported as one PDF; fonts embedded; no browser headers or margins.
- [ ] Every headline is the exact text from §4; no generic titles.
- [ ] Every number appears in §6; nothing invented; rupiah written `Rp 1.211.500`.
- [ ] All art comes from the bundle, unmodified; no stock, AI imagery, emoji, gradients, glass, glow or 3D.
- [ ] Only the stamp shadow and the phone-frame shadow are used.
- [ ] Kunyit 500 covers at most about 5% of any paper slide; red and green only where they mean blocked or done.
- [ ] Body text left-aligned, at most about 40 words per slide, nothing smaller than 20 px.
- [ ] Stills cropped above the burned-in captions.
- [ ] Phones flat, upright, real screenshots, at most three per slide.
- [ ] "Testnet", "not QRIS", "no real pilot" and "licensed lender" all appear on slide 9.
- [ ] Slide 7 says "simulation" and nowhere claims a real transaction was attacked or failed.
- [ ] Footer on slides 2–10: logo icon + "Kulaya" on the left, "NN / 10" on the right.
- [ ] All text contrast at least 4.5:1 (check Abu on Kertas 2 and anything on Kunyit).
- [ ] Speaker notes delivered for all 10 slides and not visible on the slides.
