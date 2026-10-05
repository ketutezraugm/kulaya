"""Split one continuous voiceover recording into one clip per caption cue, using speech-to-text word timestamps.

Why: generating each caption as its own tiny clip gives every phrase a sentence-ending intonation. Instead the voice reads the
whole script in one take (natural flow), and this script cuts it at the pauses between phrases.

  <venv>/python scripts/vo-split.py [audio ...]     default: every audio file in video/vo-input/ (name order, joined)

Writes video/vo-clips/NN.wav (one per cue in video/vo.srt) and video/vo-clips/timing.json (seconds of speech lead-in and length).
Then run:  node scripts/vo-build.mjs   to place the clips on the captions and mux them into the video.
"""
import json, re, subprocess, sys
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
VID = ROOT / "video"
CLIPS = VID / "vo-clips"
CLIPS.mkdir(exist_ok=True)


def ts(s):
    h, m, r = s.split(":")
    sec, ms = r.split(",")
    return int(h) * 3600 + int(m) * 60 + int(sec) + int(ms) / 1000


def load_cues():
    cues = []
    for block in (VID / "vo.srt").read_text(encoding="utf8").strip().split("\n\n"):
        lines = block.strip().splitlines()
        a, z = lines[1].split(" --> ")
        cues.append({"start": ts(a.strip()), "end": ts(z.strip()), "text": " ".join(lines[2:])})
    return cues


NUM = {"64": "sixty four", "250": "two hundred fifty", "000": "thousand", "10": "ten", "30": "thirty", "1": "one", "5": "five", "97": "ninety seven", "8004": "eight thousand four"}


def toks(text):
    out = []
    for w in re.findall(r"[a-z0-9']+", text.lower()):
        out.extend(NUM.get(w, w).split())
    return out


def sim(a, b):
    return SequenceMatcher(None, a, b).ratio()


def align(exp, got):
    """Needleman-Wunsch over words with fuzzy matching. Returns for each expected index the matched transcript index (or None)."""
    n, m = len(exp), len(got)
    GAP = -0.5
    S = [[0.0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        S[i][0] = i * GAP
    for j in range(1, m + 1):
        S[0][j] = j * GAP
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            r = sim(exp[i - 1], got[j - 1][0])
            s = r * 2 - 0.8 if r >= 0.5 else -1.0
            S[i][j] = max(S[i - 1][j - 1] + s, S[i - 1][j] + GAP, S[i][j - 1] + GAP)
    i, j, res = n, m, [None] * n
    while i > 0 and j > 0:
        r = sim(exp[i - 1], got[j - 1][0])
        s = r * 2 - 0.8 if r >= 0.5 else -1.0
        if abs(S[i][j] - (S[i - 1][j - 1] + s)) < 1e-9:
            if r >= 0.5:
                res[i - 1] = j - 1
            i, j = i - 1, j - 1
        elif abs(S[i][j] - (S[i - 1][j] + GAP)) < 1e-9:
            i -= 1
        else:
            j -= 1
    return res


def main():
    args = [Path(a) for a in sys.argv[1:]]
    if not args:
        args = sorted(p for p in (VID / "vo-input").glob("*") if p.suffix.lower() in {".mp3", ".wav", ".m4a", ".flac", ".ogg"} and not p.name.startswith("_"))
    if not args:
        sys.exit("Put the voiceover audio in video/vo-input/ (or pass file paths).")
    full = VID / "vo-input" / "_full.wav"
    full.parent.mkdir(exist_ok=True)
    if len(args) == 1:
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(args[0]), "-ar", "44100", "-ac", "1", str(full)], check=True)
    else:  # several files: join with 0.6 s of silence
        cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
        for a in args:
            cmd += ["-i", str(a)]
        fc = "".join(f"[{k}:a]aresample=44100,aformat=channel_layouts=mono,apad=pad_dur=0.6[x{k}];" for k in range(len(args)))
        cmd += ["-filter_complex", fc + "".join(f"[x{k}]" for k in range(len(args))) + f"concat=n={len(args)}:v=0:a=1[o]", "-map", "[o]", str(full)]
        subprocess.run(cmd, check=True)

    from faster_whisper import WhisperModel
    model = WhisperModel("small.en", device="cpu", compute_type="int8")
    import numpy as np  # decode with ffmpeg ourselves: some PyAV builds choke on faster-whisper's own decoder
    raw = subprocess.check_output(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(full), "-f", "f32le", "-ac", "1", "-ar", "16000", "-"])
    segs, _ = model.transcribe(np.frombuffer(raw, dtype=np.float32), word_timestamps=True, language="en", vad_filter=False, condition_on_previous_text=False)
    got = []
    for s in segs:
        for w in s.words:
            t = toks(w.word)
            for k, piece in enumerate(t):  # a digit word can expand to several spoken words
                got.append((piece, w.start + (w.end - w.start) * k / len(t), w.start + (w.end - w.start) * (k + 1) / len(t)))
    print(f"transcribed {len(got)} words")

    cues = load_cues()
    exp, owner = [], []
    for ci, c in enumerate(cues):
        t = toks(c["text"].replace("Kulaya", "koolaya").replace("QRIS", "kris"))
        exp += t
        owner += [ci] * len(t)
    match = align(exp, got)
    hit = sum(1 for x in match if x is not None)
    print(f"matched {hit}/{len(exp)} words ({100 * hit // len(exp)}%)")

    spans = []  # per cue: first and last matched transcript word
    for ci in range(len(cues)):
        idx = [match[k] for k in range(len(exp)) if owner[k] == ci and match[k] is not None]
        if not idx:
            sys.exit(f"cue {ci + 1} ({cues[ci]['text'][:40]!r}) was not found in the audio; is the whole script in the recording?")
        spans.append((min(idx), max(idx)))
    # enforce order
    for k in range(1, len(spans)):
        if spans[k][0] <= spans[k - 1][1]:
            spans[k] = (spans[k - 1][1] + 1, max(spans[k][1], spans[k - 1][1] + 1))

    total = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(full)]).decode())
    timing = []
    for ci, (a, b) in enumerate(spans):
        t0, t1 = got[a][1], got[b][2]
        prev_end = got[spans[ci - 1][1]][2] if ci else 0.0
        next_start = got[spans[ci + 1][0]][1] if ci + 1 < len(spans) else total
        cut0 = max(prev_end + (t0 - prev_end) / 2, t0 - 0.12) if ci else max(0.0, t0 - 0.12)  # mid-gap, but never more than 120 ms of lead-in
        cut1 = min(t1 + (next_start - t1) / 2, t1 + 0.30)  # mid-gap, but never more than 300 ms of tail
        f = CLIPS / f"{ci + 1:02d}.wav"
        # input-side seek resets timestamps to 0, so the fade times below are relative to the clip (output-side -ss would leave them absolute)
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{cut0:.3f}", "-t", f"{cut1 - cut0:.3f}", "-i", str(full),
                        "-af", f"afade=t=in:d=0.012,afade=t=out:st={max(0, cut1 - cut0 - 0.04):.3f}:d=0.04", str(f)], check=True)
        timing.append({"lead": round(t0 - cut0, 3), "dur": round(cut1 - cut0, 3), "speech": round(t1 - t0, 3)})
    (CLIPS / "timing.json").write_text(json.dumps(timing, indent=1))
    print(f"wrote {len(timing)} clips to {CLIPS}")


main()
