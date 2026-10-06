"""Print a level report of the audio stems and the final mix: dB RMS per 5-second block, plus how far the music sits under the voice.
Run with the venv python:  <venv>/python scripts/av-report.py"""
import wave
from pathlib import Path
import numpy as np

VID = Path(__file__).resolve().parent.parent.parent / "video"


def load(name):
    with wave.open(str(VID / name), "rb") as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float32) / 32768
        return x.reshape(-1, w.getnchannels()).mean(axis=1), w.getframerate()


def blocks(x, sr, sec=5):
    n = int(sr * sec)
    return [20 * np.log10(np.sqrt(np.mean(x[i:i + n] ** 2)) + 1e-9) for i in range(0, len(x) - n + 1, n)]


stems = {n: load(f) for n, f in (("voice", "vo-voice.wav"), ("music", "music.wav"), ("sfx", "sfx.wav"), ("mix", "av-mix.wav"))}
sr = stems["voice"][1]
rows = {n: blocks(x, s) for n, (x, s) in stems.items()}
print("t(s)   voice  music   sfx    mix")
for i in range(len(rows["mix"])):
    print(f"{i * 5:4d}  " + "  ".join(f"{rows[n][i]:5.0f}" for n in ("voice", "music", "sfx", "mix")))
# during speech: loudness of the music (after ducking the mix has voice + music + sfx; estimate music alone by gain used in av-mix)
v, _ = stems["voice"]
m, _ = stems["mix"]
sp = np.abs(v) > 0.02
print(f"speech present {100 * sp.mean():.0f}% of the time; mix peak {20 * np.log10(np.max(np.abs(m))):.1f} dBFS")
