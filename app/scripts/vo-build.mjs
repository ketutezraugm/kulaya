// Places the per-cue voice clips (made by scripts/vo-split.py) on the captions of video/vo.srt and muxes them into the finished video.
// Needs ffmpeg on PATH.   Run from app/:   node scripts/vo-build.mjs
// Optional env: MUSIC (path to a royalty-free track; ducked under the voice, faded out at the end)
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "..");
const VID = join(ROOT, "video");
const CLIPS = join(VID, "vo-clips");
const IN = join(VID, "Kulaya Demo Video.mp4");
const OUT = join(ROOT, "Kulaya Demo Video - VO.mp4");
const env = { ...process.env };
if (existsSync(".env.local")) for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) { const m = l.match(/^(MUSIC)=(.*)$/); if (m && !(m[1] in env)) env[m[1]] = m[2].trim(); }

const ts = (s) => { const [h, m, r] = s.split(":"); const [sec, ms] = r.split(","); return +h * 3600 + +m * 60 + +sec + +ms / 1000; };
const cues = readFileSync(join(VID, "vo.srt"), "utf8").trim().split(/\r?\n\r?\n/).map((b) => {
  const [, time, ...text] = b.split(/\r?\n/);
  const [a, z] = time.split(" --> ");
  return { start: ts(a), end: ts(z), text: text.join(" ") };
});
const timing = JSON.parse(readFileSync(join(CLIPS, "timing.json"), "utf8"));
const ff = (...a) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...a]);
const clip = (i) => join(CLIPS, `${String(i + 1).padStart(2, "0")}.wav`);

const inputs = [], filters = [], report = [];
cues.forEach((c, i) => {
  const t = timing[i], room = c.end - c.start;
  // speed up (max 15%) only if the spoken phrase is longer than its caption window
  const tempo = t.speech > room - 0.05 ? Math.min(1.15, t.speech / (room - 0.05)) : 1;
  if (t.speech / tempo > room) report.push(`cue ${i + 1} runs ${(t.speech / tempo - room).toFixed(2)}s past its caption even at ${tempo.toFixed(2)}x: "${c.text.slice(0, 40)}"`);
  // start the SPEECH on the caption start (the clip carries a short lead-in)
  const delay = Math.max(0, Math.round((c.start - t.lead / tempo) * 1000));
  inputs.push("-i", clip(i));
  // hard rule: this clip never plays into the next phrase. It ends (with a 40 ms fade) 30 ms before the next speech starts.
  const maxLen = i + 1 < cues.length ? cues[i + 1].start - 0.03 - delay / 1000 : Infinity;
  const cut = (t.dur / tempo) > maxLen ? `,atrim=0:${maxLen.toFixed(3)},afade=t=out:st=${Math.max(0, maxLen - 0.04).toFixed(3)}:d=0.04` : "";
  if (cut) report.push(`cue ${i + 1}: tail trimmed by ${((t.dur / tempo) - maxLen).toFixed(2)}s to stay clear of the next phrase`);
  filters.push(`[${i}:a]atempo=${tempo.toFixed(3)}${cut},adelay=${delay}|${delay}[a${i}]`);
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
console.log(report.length ? "WARNINGS:\n" + report.join("\n") : "all phrases fit their captions");
console.log("wrote", OUT);
