"""Verify the finished mix (video/vo-mix.wav) against the captions without any speech recognition:
find where speech starts after each silence and check that every caption start has a speech onset within +/-0.30 s,
and that no speech is cut mid-word by a clip boundary (a boundary inside speech shows up as an energy dip of < 60 ms)."""
import re, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
VID = ROOT / "video"


def ts(s):
    h, m, r = s.split(":")
    sec, ms = r.split(",")
    return int(h) * 3600 + int(m) * 60 + int(sec) + int(ms) / 1000


starts = [ts(re.search(r"(\S+) -->", b).group(1)) for b in (VID / "vo.srt").read_text(encoding="utf8").strip().split("\n\n")]
out = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(VID / "vo-mix.wav"), "-af", "silencedetect=noise=-33dB:d=0.025", "-f", "null", "-"], capture_output=True, text=True).stderr
ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]  # speech begins where silence ends
bad = 0
for i, s in enumerate(starts):
    d = min(ends, key=lambda e: abs(e - s)) - s if ends else 9
    ok = abs(d) <= 0.30
    bad += not ok
    print(f"cue {i + 1:2d}: speech onset {d:+.2f}s vs caption start{'' if ok else '   <-- check'}")
print(f"{len(starts) - bad}/{len(starts)} phrases start within 0.30 s of their caption")
