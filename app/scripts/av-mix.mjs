// Final audio mix: voice (video/vo-voice.wav) + music (video/music.wav, ducked under the voice) + sound effects (video/sfx.wav),
// loudness-normalized, muxed onto the video track of video/final-edited.mp4. Writes "Kulaya Demo Video - Final.mp4" in the project root.
// Never overwrites final-edited.mp4. Needs ffmpeg on PATH.   Run from app/:  node scripts/av-mix.mjs
// Tuning (optional env): MUSIC_LUFS (default -27.5), SFX_PEAK (default -9 dBFS), DUCK (sidechain ratio, default 6)
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";

const ROOT = join(process.cwd(), "..");
const VID = join(ROOT, "video");
const SRC = join(VID, "final-edited.mp4");
const OUT = join(ROOT, "Kulaya Demo Video - Final.mp4");
const voice = join(VID, "vo-voice.wav"), music = join(VID, "music.wav"), sfx = join(VID, "sfx.wav");
const MUSIC_LUFS = parseFloat(process.env.MUSIC_LUFS ?? "-27.5"), SFX_PEAK = parseFloat(process.env.SFX_PEAK ?? "-9"), DUCK = process.env.DUCK ?? "6";

const stderr = (...args) => spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], { encoding: "utf8" }).stderr;
const lufs = (f) => parseFloat(stderr("-i", f, "-af", "ebur128=peak=true", "-f", "null", "-").match(/I:\s+(-?[\d.]+) LUFS/g).pop().match(/-?[\d.]+/)[0]);
const peak = (f) => parseFloat(stderr("-i", f, "-af", "volumedetect", "-f", "null", "-").match(/max_volume: (-?[\d.]+) dB/)[1]);

const gMusic = MUSIC_LUFS - lufs(music), gSfx = SFX_PEAK - peak(sfx);
console.log(`music ${gMusic.toFixed(1)} dB, sfx ${gSfx.toFixed(1)} dB`);

const graph = [
  `[0:a]pan=stereo|c0=c0|c1=c0,asplit=2[v][vsc]`,
  `[1:a]volume=${gMusic.toFixed(2)}dB[m0]`,
  // the music gets out of the way of the voice: key the compressor on the voice, with a slow release so it breathes back in
  `[m0][vsc]sidechaincompress=threshold=0.02:ratio=${DUCK}:attack=15:release=450:makeup=1[m]`,
  `[2:a]volume=${gSfx.toFixed(2)}dB[s]`,
  `[v][m][s]amix=inputs=3:normalize=0:duration=longest,atrim=0:180,apad=whole_dur=180,loudnorm=I=-16:TP=-1.5:LRA=9[mix]`,
].join(";");
execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", voice, "-i", music, "-i", sfx, "-filter_complex", graph, "-map", "[mix]", "-ar", "44100", join(VID, "av-mix.wav")]);
execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", SRC, "-i", join(VID, "av-mix.wav"), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", OUT]);
console.log(`final mix ${lufs(join(VID, "av-mix.wav")).toFixed(1)} LUFS, wrote ${OUT}`);
