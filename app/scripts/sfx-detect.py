"""Find visual "events" in the finished video: moments where a small region of the picture starts moving after being still
(stamps, pops, coins, taps, wipes). Writes video/events.json: [{t, strength, x, y}] so sound effects can be snapped to real frames.
Run with the venv python:  <venv>/python scripts/sfx-detect.py [video]"""
import json, subprocess, sys
from pathlib import Path
import numpy as np

VID = Path(__file__).resolve().parent.parent.parent / "video"
src = sys.argv[1] if len(sys.argv) > 1 else str(VID / "final-edited.mp4")
W, H, FPS = 192, 108, 30
raw = subprocess.check_output(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", src, "-an", "-vf", f"fps={FPS},scale={W}:{H},format=gray", "-f", "rawvideo", "-"])
fr = np.frombuffer(raw, dtype=np.uint8).reshape(-1, H, W).astype(np.float32)
n = len(fr)
d = np.abs(fr[1:] - fr[:-1])  # n-1, H, W
B = 12  # block size in px (of the 192x108 frame)
blocks = d.reshape(n - 1, H // B, B, W // B, B).mean(axis=(2, 4))  # n-1, 9, 16
act = blocks > 2.0  # a block is "moving" when its mean abs diff is noticeable
ev = []
quiet = int(0.25 * FPS)
for t in range(quiet, n - 1):
    new = act[t] & ~act[t - quiet:t].any(axis=0)  # blocks that start moving after 250 ms of stillness
    k = int(new.sum())
    if k:
        ys, xs = np.nonzero(new)
        ev.append({"t": round((t + 1) / FPS, 3), "strength": round(float(blocks[t][new].sum()), 1), "blocks": k, "x": round(float(xs.mean()) / 16, 2), "y": round(float(ys.mean()) / 9, 2)})
# merge events closer than 0.15 s, keep the strongest
merged = []
for e in ev:
    if merged and e["t"] - merged[-1]["t"] < 0.15:
        if e["strength"] > merged[-1]["strength"]:
            merged[-1] = e
    else:
        merged.append(e)
(VID / "events.json").write_text(json.dumps(merged, indent=0))
print(f"{len(merged)} events")
print(" ".join(f"{e['t']:.1f}" for e in merged))
