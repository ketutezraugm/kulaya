# Kulaya: implementation notes

## Files
- `handoff/kulaya-tokens.css`: paste into `app/globals.css`. Owner is the default; `[data-site="protocol"]` and `[data-site="protocol"][data-theme="dark"]` override.
- `handoff/copy-id.json`: every Bahasa string, keyed by route. `{curly}` tokens are filled by code, never by the LLM.
- `art/`: all artwork as SVG. Inline as React components (SVGR or hand-copied). Groups: `logo/`, `icon/` (24 grid, `currentColor` stroke + kunyit fill), `motif/`, `mascot/`, `stall/`, `scene/`, `people/`, `dev/`.
- Design frames: `Owner 1–5`, `Protocol 1–4`, `Components`, `QR Poster A5/A6`, `Copy Deck`, `Kulaya Brand Sheet`. Frame ids (e.g. `3e`) and route names (`toko/terima — kode QR`) match.

## Fonts (next/font/google)
- Bree Serif 400 (display, money)
- Plus Jakarta Sans 400, 600, 700, 800 (UI, body)
- JetBrains Mono 400, 600 (protocol only, don't load on owner routes)

## Owner site layout
- Fixed: test banner (top), CTA bar + bottom tab bar (bottom). Everything between scrolls.
- One accent button (kunyit, ink border, 4px stamp shadow) per screen max. Primary nila otherwise.
- Desktop ≥ 768: centered column `max-width: var(--k-column-max)` (560); tab bar becomes a top nav (see 5h). Same order, no new layout.
- Test at 360 px and 130% system text. No fixed heights on text containers.
- Status is always icon + word + colour (`pill` in Components).

## Wallet moments
Every wallet popup is preceded by a prep screen (2c, 2f, 3j, 4f, 5c) with `ill-wallet-confirm.svg` and the "Warung" name note. Waiting state 2d polls; cancel → 2k; wrong chain → 2j; no injected provider on mobile → 2i (WalletConnect picker).

## Live states
- Terima Bayar: poll for a payment matching amount + shop after QR shows (3e). On match → 3g. Fullscreen (3f) uses the Fullscreen API + Screen Wake Lock where supported.
- Relayer busy → 4m (offer user-paid gas as secondary).
- Errors: human copy first, `Detail untuk teknisi` disclosure holds code/route/time only (4l).

## Charts
- 30-day bars (4a): flex row of 30 divs. Past days: kunyit with a repeating 9px/3px stripe ("stacked goods"). Today: nila bar + flag (2px pole, kunyit triangle). Baseline 3px nila. Labels at start / middle / today only.

## Motion (all 0ms under `prefers-reduced-motion`)
- Press: `--k-dur-fast` translate 2–3px, shadow shrinks.
- Payment received (3g): coin in `ill-coin-drop.svg` drops 40px into jar, `--k-dur-slow`, once.
- Receipt stamp (5d): scale 1.2 → 1 + rotate -14deg, 220ms, once.
- Optional idle: steam paths in hero rise/fade 3s loop; awning scallops sway 1deg 4s loop. Pause when off-screen.
- Progress bars animate width 480ms on mount only.

## Protocol site
- Sidebar 248px, sticky. ≤ 900px: sidebar becomes a `Menu` button → full-screen list (6b).
- Addresses: `trunc(6…4)` in mono, full value in `title` + clipboard. Copy shows "Copied" for 2s. BscScan links: `https://testnet.bscscan.com/address/{addr}` (tx: `/tx/{hash}`).
- Red-team: always show the SIMULATION badge. Pipeline is in execution order (3 Policy → 4 Reply guard → 1 Propose-only → contract). Raw trace collapsed by default except when the contract reverts.
- Values marked "mockup" in the frames come from the API; the Docs page (7h) slots must be filled verbatim from README/DEPLOY.

## Poster
`QR Poster A5/A6` print at true size (doc-page). Page 2 of each is the black-and-white version (mono logo, mono awning, mono kawung). QR is the shop's general link `/bayar/[toko]` (customer enters amount, 5b).

## Not drawn as separate art (by design)
Help FAQ spot art uses the icon set at 28px on kunyit-100 tiles rather than separate illustrations, to keep page weight down.
