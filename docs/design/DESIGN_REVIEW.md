# Kulaya design handoff: verification report

Reviewed: everything the designer (Claude Design) delivered into `app/assets/` on 2026-10-04, **before any of it was implemented**.
Method: every file was parsed or rendered in real Chrome and measured. Nothing here is an impression; the numbers are reproducible with the commands at the bottom.

## 1. What was delivered

| Item | Count / detail |
|---|---|
| Design frames (HTML) | 14 files, **70 labelled frames** (Owner 1-5, Protocol 1-4, Components, Brand Sheet, Copy Deck, QR Poster A5/A6) |
| Artwork | **114 SVGs**: 43 icons, 14 logo variants, 6 mascot poses, 14 motifs, 21 scenes, 8 level stalls/badges, 2 people, 6 developer diagrams/badges |
| Tokens | `handoff/kulaya-tokens.css` (owner default + `[data-site="protocol"]` + dark theme) |
| Copy | `handoff/copy-id.json`: **348 Bahasa strings** keyed by route, `{curly}` placeholders filled by code |
| Notes | `handoff/IMPLEMENTATION.md`, build helpers in `handoff/build/` |
| Reference renders | `screenshots/` (31 PNGs, local only, not committed) |

## 2. Verified good

- **Every file renders**: all 14 frame files load with 0 JavaScript errors, 0 broken images, and all three fonts (Bree Serif, Plus Jakarta Sans, JetBrains Mono).
- **All 114 SVGs are valid XML** with a `viewBox`. None contains an embedded bitmap, a script, an external link, an emoji, or a third-party generator/brand mark. Everything is original (see 4.1 for provenance).
- **Coverage of the brief is near complete.** Every owner route and every state requested was designed: landing, 5 tutorial cards, setup (incl. no wallet, wrong network, cancelled, already registered, wallet picker), login (incl. Telegram link sent), session expired, Beranda with all 6 capital states, Terima Bayar (5 states incl. fullscreen and payment received), Modal (6 states incl. 7-day quiet reminder), Riwayat, Tanya (4 states incl. AI busy), Bantuan, info sheet, skeleton, slow, offline, generic error with technician detail, relayer busy, install-to-home-screen, customer payment (6 states incl. general QR, low balance, cancelled), public shop profile, desktop frames, two printable posters (A5/A6 with a black-and-white page). Developer site: overview (+390px, +dark), red-team (3 results), agent, pool, contracts, gasless, docs, loading, API error.
- **Contrast is real.** Computed WCAG ratios for 35 token pairs: owner body text 16.3:1; heading 12.8:1; link 9.0:1; primary button 13.7:1; accent button label 7.36:1; success/warning/danger text on white 7.45 / 7.62 / 7.93:1. The designer's own claims in comments are accurate (within 0.2). The protocol dark theme passes AA everywhere (lowest 6.6:1).
- **Copy deck is clean.** Of 348 strings: **0 emoji or symbol glyphs, 0 casual pronouns (kamu/-mu), 0 English leakage, 0 empty strings.** The only glossary "hits" are intentional and allowed by the brief: "Bunga" inside the *pinjol* comparison rows, "MetaMask" as the named example wallet, and "IDRX" in the Help glossary.
- **Page weight (art):** after removing metadata (4.1) the entire 114-file set is **~210 KB**; the largest single scene is ~19 KB.
- **The mascot, logo and level stalls are a coherent, distinctive identity** (rising-awning mark, coin-jar mascot, cart-to-toko ladder) with no emoji or stock look.

## 3. Findings to fix at implementation

Severity: **M** = visibly wrong or functionally affects users, **L** = polish, **I** = information needed when building.

| # | Sev | Finding | Evidence | Fix |
|---|---|---|---|---|
| 1 | **M** | **SVG text falls back to Georgia when the SVG is loaded with `<img>`.** 14 SVGs contain live `<text>` (landing hero sign "BAKSO BU SRI", "Rp 25.000", poster/OG text, dev diagrams) and none embeds a font. Page web fonts do not apply inside `<img>`. | Rendered side by side: `<img>` shows thin Georgia, inlined shows Bree Serif | **Inline these SVGs as React components** (SVGR) so they inherit the page fonts. Never use `<img src>` for any SVG in the list in 6.2. `og-image.svg` must be rasterised (done: `public/og.png`) |
| 2 | **M** | **`scene/ill-step-offer.svg`: label text overflows its box.** Box path `M196 14H284V40H196Z` is 88 wide; "Anda yang putuskan" at 11px/700 is wider (visible overflow, also when inlined). Shown on the landing "Cara kerjanya" step 2. | Screenshot of landing 1a | Widen the box (about x 178..302) or shrink the font to 9px. Measure with `getBBox()` after inlining |
| 3 | **M** | **`mascot/mascot-apologetic.svg` looks angry, not apologetic.** Brows are `M61 74L72 78` and `M99 74L88 78`: inner ends are LOWER than outer ends (a furrowed V). It is the pose used for "AI busy" and errors, so Kulaya would scowl at the owner exactly when something went wrong. | Mascot gallery | Flip the slopes so inner ends are higher: `M61 78L72 74` and `M99 78L88 74` |
| 4 | **M** | **No frame for a loan-history list and none for an expired offer.** Both were requested. The data now exists (`/api/loans` returns every loan with a derived `Expired` status). | Searched all frames and `copy-id.json` | Build with existing parts (nota row + status pill). **New copy keys needed** (see 6.4) |
| 5 | **M** | **Bree Serif has no tabular figures.** The tokens say money is "Bree, tabular", but Bree Serif has no `tnum` feature and its digits have different widths (the digit 1 is 454 units, 4 is 536). `font-variant-numeric: tabular-nums` will do nothing. Plus Jakarta Sans does support `tnum`. | Font file inspected (GSUB features) | Use Bree only for single hero numbers. For nota rows, tables and any column of amounts use **Plus Jakarta Sans 700 with `tabular-nums`**, right-aligned |
| 6 | L | **Mascot "lid" can read as a peci; there is no apron.** The brief direction was a coin jar with an apron (no peci). The jar wears a dark flat-topped lid. | Brand sheet, OG image | Confirm with the product owner whether this is acceptable. If not: re-colour/reshape the lid and add a small apron |
| 7 | L | **Muted text on the "sunk" background is 6.63:1**, below the 7:1 owner target (still passes AA). `--k-color-abu` on `--k-color-bg-sunk`. | Computed | Use `--k-color-text` on `bg-sunk`, or darken `abu` to about `#4F4B42` |
| 8 | L | **`--k-color-border-strong` is only 1.67:1 against the page (light) and 2.06:1 (dark).** Fine for decoration, fails the 3:1 rule if it is the only edge of an input or button. | Computed | Inputs and buttons must use `--k-color-ink` / nila borders; keep `border-strong` for dividers |
| 9 | L | **A Unicode arrow in a diagram.** `dev/dia-architecture.svg` contains a `→` text glyph (brief: no symbols as graphics). | Scan | Replace with a drawn arrow path |
| 10 | I | **Red-team mockup mixes units.** It labels principal "IDRX, 0 decimals" and shows cap `1201500`, but the real API returns raw 2-decimal units (e.g. `100000000000` and `119150000`). | `Protocol 2` frame vs `/api/redteam` output | Convert units to rupiah for display; relabel the field "principal (Rp)"; the API field is `principal_rupiah` |
| 11 | I | **"Live numbers" on the protocol overview needs fields the API lacked** (shops registered, loans closed). | Frame 6a | **Done:** `/api/agent` now returns `stats {shops, loansProposed, loansActive, loansRepaid, loansDefaulted}` |
| 12 | I | **`/masuk` has two meanings.** The design's `/masuk` is a "choose how to log in" screen (frames 2m/2n). The code's `/masuk?t=<code>` is the Telegram one-tap exchange page. | Routes | Keep both on one route: with `?t=` exchange the code, without it show the choice screen. Frame 2n ("link sent") has no backend that can push to Telegram: the website cannot know a visitor's chat id. Make 2n instruct *"Buka Telegram dan ketik /masuk"* |
| 13 | I | **Slogan.** The designer adopted *"Modal usaha, dari hasil jualan sendiri."* (EN *"Credit that grows from every sale."*). | Brand sheet | **Done:** `lib/brand.ts`, README, bot description updated |
| 14 | I | **Pool frame** (7e) shows only "connected". The other pool states in the brief (not connected, wrong network, deposit pending, success) appear only as words in the file. | Frame text search | Design them from the Components sheet, or confirm they are visually specified |

## 4. Notes

### 4.1 Provenance and the C2PA block (important for the file size)
Every one of the 114 SVGs embeds a `<metadata><c2pa:manifest>` block: a signed Content Credentials stamp ("Claude provided this file at the request of a user"). This confirms the art was generated for Kulaya and is not stock. It also makes up **865 KB of the 1,076 KB total (80%)**. **Strip it when importing** (`<metadata>…</metadata>` and the `xmlns:c2pa` attribute); the repo keeps the unmodified originals in `app/assets/art/` for provenance.

### 4.2 Fonts
Plus Jakarta Sans (400/500/600/700/800), Bree Serif (400), JetBrains Mono (400/600, protocol only). Bree Serif is a rounded slab-like serif (acceptable for the brief's "sturdy slab"); see finding 5 for numerals.

## 5. What was done about the findings already

| Finding | Status |
|---|---|
| 11 stats API | **Done** |
| 13 slogan | **Done** |
| OG image, PWA icons, apple-touch icon, favicon, Telegram avatars | **Done** (rendered from the designer's SVGs, metadata stripped): `app/public/og.png`, `app/public/icons/*`, `docs/brand/telegram-avatar-*.png` |
| 4 history/expired data | **Done** (backend + temporary UI). Visual design still to do |
| 1, 2, 3, 5-10, 12, 14 | Left for the UI implementation session (they are design-asset or layout decisions) |

## 6. Reference lists

### 6.1 Frame ids
Owner 1: 1a landing, 1b-1f tutorial · Owner 2: 2a-2l setup, 2m-2n login, 2o session expired · Owner 3: 3a-3b beranda, 3c-3g terima, 3h-3m modal · Owner 4: 4a-4b riwayat, 4c-4f tanya, 4g bantuan, 4h info sheet, 4i-4n global states · Owner 5: 5a-5f bayar, 5g profil, 5h-5i desktop · Protocol: 6a-6c overview, 7a-7c red-team, 7d agent, 7e pool, 7f contracts, 7g gasless, 7h docs, 7i-7j states.

### 6.2 SVGs containing `<text>` (must be inlined, not `<img>`)
`dev/dia-architecture`, `dev/dia-gasless`, `dev/dia-shields`, `logo/og-image` (raster only), `motif/stamp-uji-coba`, `scene/ill-empty-etalase`, `scene/ill-envelope-offer`, `scene/ill-landing-hero`, `scene/ill-registered`, `scene/ill-state-session`, `scene/ill-step-offer`, `scene/ill-step-scan`, `scene/ill-step-split`, `scene/ill-wallet-confirm`.

### 6.3 Reproduce these checks
Run from `app/` (the scripts and scratch checks used are described in `docs/NEXT_SESSION.md`); the SVG, contrast, copy and font checks are plain Python/Playwright and take seconds.

### 6.4 New copy keys the new features need (not in `copy-id.json`)
- Loan history: title ("Riwayat modal"), row labels, statuses (Lunas / Berjalan / Menunggu keputusan / Kedaluwarsa / Dihentikan), empty state.
- Offer expired state: title, body ("Penawaran ini sudah berakhir. Anda bisa minta penawaran baru."), button.
- Shop profile: "Nama toko", "Panggilan", validation errors (2-40 letters/numbers, no links or symbols), saved confirmation.
- Telegram login: "Masuk lewat Telegram", instruction ("Buka Telegram dan ketik /masuk"), expired/used link message (exists in the API: "Tautan sudah dipakai atau kedaluwarsa. Ketik /masuk di Telegram untuk tautan baru.").
- Live payment: the received banner exists as hard-coded text in `components/QrCard.tsx`; move to the copy deck.
