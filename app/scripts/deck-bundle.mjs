// Builds the upload bundle for the pitch-deck designer (Claude Design can't read the repo):
// docs/submission/deck-bundle/  ->  zip it and upload together with DECK_HANDOFF.md.
// Contents: clean SVG art (metadata stripped, review fixes applied, icons coloured), product screens, video stills,
// QR codes, brand-sheet and component-sheet captures, the design tokens.   Run from app/:  node scripts/deck-bundle.mjs
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import QRCode from "qrcode";
import { chromium } from "playwright-core";

const ROOT = resolve("..");
const OUT = join(ROOT, "docs/submission/deck-bundle");
const VIDEO = join(ROOT, "video/Kulaya Demo Video - Final.mp4");
for (const d of ["art", "screens/phone", "screens/desktop", "qr", "brand"]) { rmSync(join(OUT, d), { recursive: true, force: true }); mkdirSync(join(OUT, d), { recursive: true }); }

// 1. art: generated modules -> standalone .svg files. Icons draw with currentColor, so give standalone files the ink colour.
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([a-zA-Z])([0-9])/g, "$1-$2").toLowerCase();
let n = 0;
for (const f of readdirSync("components/art").filter((x) => x.endsWith(".ts"))) {
  const group = f.replace(".ts", "");
  mkdirSync(join(OUT, "art", group), { recursive: true });
  for (const m of readFileSync(join("components/art", f), "utf8").matchAll(/^export const (\w+) = (".*");$/gm)) {
    let svg = JSON.parse(m[2]).replace(' aria-hidden="true" focusable="false"', "");
    if (group === "icon") svg = svg.replace("<svg ", '<svg color="#1E2A5A" ');
    writeFileSync(join(OUT, "art", group, kebab(m[1]) + ".svg"), svg);
    n++;
  }
}

// 2. product screens (live app captures)
const refs = join(ROOT, "docs/video/refs");
for (const f of readdirSync(refs)) cpSync(join(refs, f), join(OUT, "screens", /^1\d-/.test(f) ? "desktop" : "phone", f));
cpSync(join(ROOT, "docs/screenshots/protocol-overview.png"), join(OUT, "screens/desktop/13-protocol-overview-full.png"));

// 3. video stills (1920x1080; captions are burned in at the bottom, crop above y = 900)
const stills = [["43.9", "01-customer-paid"], ["46.6", "02-owner-payment-received"], ["68.6", "03-sales-30-days"], ["73.2", "04-credit-limit-receipt"], ["92.9", "05-ai-offer-in-chat"], ["97.2", "06-offer-terms"], ["106.9", "07-loan-received"], ["121.2", "08-repay-montage"], ["125.9", "09-lunas"], ["129.6", "10-level-up-erc8004"], ["146.9", "11-redteam-blocked"], ["152.95", "12-redteam-reverted"], ["162.2", "13-four-shields"]];
if (existsSync(VIDEO)) {
  rmSync(join(OUT, "stills"), { recursive: true, force: true }); mkdirSync(join(OUT, "stills"));
  for (const [t, name] of stills) execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-ss", t, "-i", VIDEO, "-frames:v", "1", "-q:v", "2", join(OUT, "stills", name + ".jpg")]);
}

// 4. QR codes in brand ink, transparent background
const qrs = { "qr-app": "https://kulaya.vercel.app", "qr-redteam": "https://kulaya.vercel.app/protocol/redteam", "qr-video": "https://youtu.be/mTLAuLq-RCg", "qr-github": "https://github.com/ketutezraugm/kulaya", "qr-telegram": "https://t.me/KulayaBot" };
for (const [name, url] of Object.entries(qrs)) writeFileSync(join(OUT, "qr", name + ".svg"), await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#1E2A5A", light: "#0000" } }));

// 5. brand references: full-page captures of the designer's brand sheet and component sheet
const b = await chromium.launch({ channel: "chrome", headless: true });
for (const [file, name] of [["Kulaya Brand Sheet.dc.html", "brand-sheet"], ["Components.dc.html", "components-sheet"]]) {
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  await p.goto("file:///" + join(resolve("assets"), file).split("\\").join("/").replace(/ /g, "%20"));
  await p.waitForTimeout(3500);
  await p.screenshot({ path: join(OUT, "brand", name + ".jpg"), fullPage: true, type: "jpeg", quality: 82 });
  await p.close();
}
await b.close();

// 6. tokens + handoff
cpSync("assets/handoff/kulaya-tokens.css", join(OUT, "kulaya-tokens.css"));
cpSync(join(ROOT, "docs/submission/DECK_HANDOFF.md"), join(OUT, "DECK_HANDOFF.md"));
console.log(`deck bundle: ${n} svgs, ${readdirSync(join(OUT, "screens/phone")).length + readdirSync(join(OUT, "screens/desktop")).length} screens, ${stills.length} stills, ${Object.keys(qrs).length} QR codes`);
