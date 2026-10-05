// Builds the voiceover for the demo video from video/vo.srt (one ElevenLabs clip per caption cue, placed at the cue's start)
// and muxes it into the finished video. Needs ffmpeg on PATH.
//
//   node scripts/vo-build.mjs --dry     test the mixing with silent placeholder clips (no key, no network)
//   node scripts/vo-build.mjs           real run: reads ELEVENLABS_API_KEY from .env.local (never printed)
//   node scripts/vo-build.mjs --mix     skip the API: re-mix the clips already in video/vo-clips/ (e.g. after replacing one)
//
// Optional env: ELEVENLABS_VOICE_ID (default Rachel), ELEVENLABS_MODEL (default eleven_multilingual_v2),
//               MUSIC (path to a royalty-free track, ducked under the voice).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "..");
const VID = join(ROOT, "video");
const CLIPS = join(VID, "vo-clips");
const IN = join(VID, "Kulaya Demo Video.mp4");
const OUT = join(ROOT, "Kulaya Demo Video - VO.mp4");
const dry = process.argv.includes("--dry"), mixOnly = process.argv.includes("--mix");
mkdirSync(CLIPS, { recursive: true });

// .env.local is only read for the key; nothing from it is logged
const env = { ...process.env };
if (existsSync(".env.local")) for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !(m[1] in env)) env[m[1]] = m[2].trim().replace(/^"|"$/g, ""); }

const ts = (s) => { const [h, m, r] = s.split(":"); const [sec, ms] = r.split(","); return +h * 3600 + +m * 60 + +sec + +ms / 1000; };
const cues = readFileSync(join(VID, "vo.srt"), "utf8").trim().split(/\r?\n\r?\n/).map((b) => {
  const [, time, ...text] = b.split(/\r?\n/);
  const [a, z] = time.split(" --> ");
  return { start: ts(a), end: ts(z), text: text.join(" ") };
});

// spellings that make the voice say the names right (captions keep the real spelling)
const say = (t) => t.replace(/Kulaya/g, "Koolaya").replace(/Bu Sri/g, "Boo Sree").replace(/QRIS/g, "kris").replace(/ERC-8004/g, "E R C eight thousand four").replace(/IDRX/g, "I D R X").replace(/BNB Chain/g, "B N B Chain").replace(/sixty-four/g, "sixty four");

const ff = (...a) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...a]);
const dur = (f) => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", f]).toString());
const file = (i) => join(CLIPS, `${String(i + 1).padStart(2, "0")}.mp3`);

if (!mixOnly) {
  const key = env.ELEVENLABS_API_KEY;
  if (!dry && !key) { console.error("Set ELEVENLABS_API_KEY in app/.env.local (or run with --dry)."); process.exit(1); }
  const voice = env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel
  for (let i = 0; i < cues.length; i++) {
    if (dry) { ff("-f", "lavfi", "-i", "sine=frequency=440:duration=" + Math.min(2.2, cues[i].end - cues[i].start - 0.3), "-q:a", "6", file(i)); continue; }
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        text: say(cues[i].text), model_id: env.ELEVENLABS_MODEL || "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true },
        previous_text: i ? say(cues[i - 1].text) : undefined, next_text: i < cues.length - 1 ? say(cues[i + 1].text) : undefined,
      }),
    });
    if (!r.ok) { console.error(`cue ${i + 1}: ElevenLabs ${r.status} ${(await r.text()).slice(0, 200)}`); process.exit(1); }
    writeFileSync(file(i), Buffer.from(await r.arrayBuffer()));
    console.log(`cue ${i + 1}/${cues.length} ok`);
  }
}

// fit each clip into its cue window (speed up at most 15% if it is longer), place it at the cue start, mix, normalize
const inputs = [], filters = [];
let report = [];
cues.forEach((c, i) => {
  const d = dur(file(i)), room = c.end - c.start - 0.1;
  const tempo = d > room ? Math.min(1.15, d / room) : 1;
  if (d / tempo > room + 0.05) report.push(`cue ${i + 1} is ${(d / tempo - room).toFixed(2)}s too long even at 1.15x: "${c.text.slice(0, 40)}"`);
  inputs.push("-i", file(i));
  filters.push(`[${i}:a]atempo=${tempo.toFixed(3)},adelay=${Math.round(c.start * 1000)}|${Math.round(c.start * 1000)},apad[a${i}]`);
});
const n = cues.length;
const mixed = `${cues.map((_, i) => `[a${i}]`).join("")}amix=inputs=${n}:normalize=0:duration=longest,atrim=0:180,apad=whole_dur=180,loudnorm=I=-16:TP=-1.5:LRA=11[vo]`;
let graph = filters.join(";") + ";" + mixed, map = "[vo]";
if (env.MUSIC && existsSync(env.MUSIC)) {
  inputs.push("-stream_loop", "-1", "-i", env.MUSIC);
  graph += `;[${n}:a]atrim=0:180,volume=0.5[m];[m][vo]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=400[duck];[duck][vo]amix=inputs=2:normalize=0:duration=first,afade=t=out:st=176:d=4[aout]`;
  map = "[aout]";
}
ff(...inputs, "-filter_complex", graph, "-map", map, "-ar", "44100", join(VID, "vo-mix.wav"));
ff("-i", IN, "-i", join(VID, "vo-mix.wav"), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", OUT);
console.log(report.length ? "WARNINGS:\n" + report.join("\n") : "all cues fit their windows");
console.log("wrote", OUT);
