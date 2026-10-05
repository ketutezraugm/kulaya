// Packs everything the video maker needs into docs/video/bundle/ (for tools that can't read the repo):
// handoff, reference screens, tokens, copy, and the CLEAN art (metadata stripped, review fixes applied) as plain .svg files.
// Run from app/: node scripts/video-bundle.mjs   (then zip docs/video/bundle)
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = "../docs/video/bundle";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, "art"), { recursive: true });

// art: each generated module exports SVG strings; write them back out as files, grouped like the originals
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([a-zA-Z])([0-9])/g, "$1-$2").toLowerCase();
let n = 0;
for (const f of readdirSync("components/art").filter((x) => x.endsWith(".ts"))) {
  const group = f.replace(".ts", "");
  mkdirSync(join(OUT, "art", group), { recursive: true });
  for (const m of readFileSync(join("components/art", f), "utf8").matchAll(/^export const (\w+) = (".*");$/gm)) {
    const svg = JSON.parse(m[2]).replace(' aria-hidden="true" focusable="false"', "");
    writeFileSync(join(OUT, "art", group, kebab(m[1]) + ".svg"), svg);
    n++;
  }
}
cpSync("../docs/video/refs", join(OUT, "refs"), { recursive: true });
cpSync("../docs/video/VIDEO_HANDOFF.md", join(OUT, "VIDEO_HANDOFF.md"));
cpSync("assets/handoff/kulaya-tokens.css", join(OUT, "kulaya-tokens.css"));
cpSync("assets/handoff/copy-id.json", join(OUT, "copy-id.json"));
writeFileSync(join(OUT, "README.txt"), [
  "Kulaya demo video bundle. Start with VIDEO_HANDOFF.md.",
  "",
  "Path mapping (the handoff refers to repo paths):",
  "  app/components/art/<group>.ts  ->  art/<group>/*.svg   (clean: metadata stripped, defects fixed; inline them, never <img> for SVGs with <text>)",
  "  app/assets/handoff/kulaya-tokens.css  ->  kulaya-tokens.css",
  "  app/assets/handoff/copy-id.json       ->  copy-id.json",
  "  docs/video/refs/*.png                 ->  refs/*.png  (screens of the live app)",
  "",
  "File names: export illLandingHero -> art/scene/ill-landing-hero.svg, mascotGreet -> art/mascot/mascot-greet.svg, jar25 -> art/motif/jar-25.svg.",
].join("\n"));
console.log(`bundle: ${n} svgs`);
