"""Synthesizes the sound design for the Kulaya demo video: an original music bed and sound effects, all generated locally (no samples,
no licences). Effects are snapped to real visual events (video/events.json from sfx-detect.py).

Writes video/music.wav and video/sfx.wav (44.1 kHz stereo, 180 s). Mix them with scripts/av-mix.mjs.
Run with the venv python:  <venv>/python scripts/sfx-music.py
"""
import json, wave
from pathlib import Path
import numpy as np

SR = 44100
DUR = 180.0
N = int(SR * DUR)
VID = Path(__file__).resolve().parent.parent.parent / "video"
rng = np.random.default_rng(7)
BPM = 112.0
BEAT = 60.0 / BPM
BAR = BEAT * 4


# ---------- dsp helpers ----------
def tt(d):
    return np.arange(int(d * SR)) / SR


def env(d, atk=0.003, tau=0.2):
    t = tt(d)
    return np.minimum(1, t / max(atk, 1e-4)) * np.exp(-t / tau)


def fft_filter(x, lo=None, hi=None, order=2):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones_like(f)
    if lo:
        g *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
    if hi:
        g *= 1 / (1 + (f / hi) ** (2 * order))
    return np.fft.irfft(X * g, len(x))


def noise(d):
    return rng.standard_normal(int(d * SR))


def sweep_noise(d, f0, f1, q=0.6):
    """band-limited noise whose centre frequency moves from f0 to f1 (log), made by filtering in short blocks"""
    n = int(d * SR)
    out = np.zeros(n)
    blocks = 24
    bl = n // blocks
    x = noise(d)
    for b in range(blocks):
        fc = f0 * (f1 / f0) ** (b / max(blocks - 1, 1))
        seg = x[b * bl:(b + 1) * bl if b < blocks - 1 else n]
        seg = fft_filter(seg, lo=fc * (1 - q * 0.6), hi=fc * (1 + q))
        out[b * bl:b * bl + len(seg)] = seg
    return out


def layer(*parts):
    """sum arrays of slightly different lengths (each part is (array, start_seconds))"""
    n = max(int(st * SR) + len(a) for a, st in parts)
    out = np.zeros(n)
    for a, st in parts:
        out[int(st * SR):int(st * SR) + len(a)] += a
    return out


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) or 1
    return x / m * peak


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def reverb(x, wet=0.25, rt=1.3):
    L = int(rt * SR)
    t = np.arange(L) / SR
    out = []
    for _ in range(2):
        ir = fft_filter(rng.standard_normal(L) * np.exp(-t / (rt / 4.5)), lo=200, hi=6500)
        ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
        n = len(x) + L
        y = np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)[: len(x)]
        out.append(y / (np.max(np.abs(y)) + 1e-9) * np.max(np.abs(x)) * 1.0)
    return np.stack([x * (1 - wet) + out[0] * wet, x * (1 - wet) + out[1] * wet])


class Bus:
    """stereo buffer with a mono-note adder"""

    def __init__(self):
        self.b = np.zeros((2, N))

    def add(self, x, t, db=0.0, pan=0.0):
        i = int(t * SR)
        if i >= N or i < 0:
            return
        x = x[: N - i] * 10 ** (db / 20)
        a = (pan + 1) * np.pi / 4
        self.b[0, i:i + len(x)] += x * np.cos(a)
        self.b[1, i:i + len(x)] += x * np.sin(a)

    def add_st(self, x2, t, db=0.0):
        i = int(t * SR)
        x2 = x2[:, : N - i] * 10 ** (db / 20)
        self.b[:, i:i + x2.shape[1]] += x2


# ---------- instruments ----------
def marimba(f, d=0.7, vel=1.0):
    t = tt(d)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.28) + 0.4 * np.sin(2 * np.pi * f * 3.97 * t) * np.exp(-t / 0.05) + 0.12 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t / 0.02)
    y *= np.minimum(1, t / 0.002)
    return y * vel


def bell(f, d=1.6, vel=1.0):
    t = tt(d)
    y = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / tau) for a, r, tau in [(1, 1, 0.9), (0.5, 2.0, 0.6), (0.35, 2.76, 0.4), (0.25, 5.4, 0.2)])
    return y * np.minimum(1, t / 0.002) * vel


def pluck_bass(f, d=0.5, vel=1.0):
    t = tt(d)
    y = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t)) * np.exp(-t / 0.22)
    return y * np.minimum(1, t / 0.004) * vel


def pad_note(f, d):
    t = tt(d)
    y = sum(np.sin(2 * np.pi * f * (1 + dt) * t + ph) for dt, ph in [(0, 0), (0.004, 1.3), (-0.004, 2.1)]) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    a = np.minimum(1, t / 0.9) * np.minimum(1, (d - t) / 1.2)
    return y * a / 3


def kick(vel=1.0):
    t = tt(0.32)
    f = 48 + 90 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * np.exp(-t / 0.13) + 0.2 * noise(0.32) * np.exp(-t / 0.004)) * vel


def shaker(vel=1.0):
    x = fft_filter(noise(0.09), lo=5500)
    return x * np.exp(-tt(0.09) / 0.025) * vel * 0.5


def hat(vel=1.0):
    x = fft_filter(noise(0.06), lo=8000)
    return x * np.exp(-tt(0.06) / 0.015) * vel * 0.5


def rim(vel=1.0):
    t = tt(0.1)
    return (np.sin(2 * np.pi * 1700 * t) * 0.4 + fft_filter(noise(0.1), lo=1500, hi=6000)) * np.exp(-t / 0.018) * vel


# ---------- sound effects ----------
def fx_tick():
    return norm(fft_filter(noise(0.02), lo=2500) * env(0.02, 0.0005, 0.004) + 0.5 * np.sin(2 * np.pi * 2200 * tt(0.02)) * env(0.02, 0.0005, 0.006))


def fx_tap():
    t = tt(0.12)
    f = 180 - 70 * t / 0.12
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.035) + 0.5 * fft_filter(noise(0.12), lo=2000) * np.exp(-t / 0.004))


def fx_pop(f0=420, f1=760):
    t = tt(0.1)
    f = f0 + (f1 - f0) * np.minimum(1, t / 0.05)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.03) * np.minimum(1, t / 0.002))


def fx_notif():
    return norm(np.concatenate([bell(1175, 0.35)[: int(0.11 * SR)], bell(1760, 0.45)]) * 1.0)


def fx_buzz():
    t = tt(0.38)
    return norm(np.sign(np.sin(2 * np.pi * 170 * t)) * 0.5 * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 26 * t))) * np.minimum(1, t / 0.01) * np.minimum(1, (0.38 - t) / 0.02))


def fx_whoosh(d=0.4, f0=500, f1=3500, down=False):
    x = sweep_noise(d, f1 if down else f0, f0 if down else f1)
    t = tt(d)
    return norm(x * np.sin(np.pi * np.minimum(1, t / d)) ** 2)


def fx_stamp(f0=140, f1=55, d=0.3):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t / 0.04)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09) + 0.6 * fft_filter(noise(d), hi=1500) * np.exp(-t / 0.012))


def fx_coin(f=2093, d=0.6):
    t = tt(d)
    y = (np.sin(2 * np.pi * f * t) + 0.6 * np.sin(2 * np.pi * f * 1.5 * t * 1.003) + 0.3 * np.sin(2 * np.pi * f * 2.31 * t)) * np.exp(-t / 0.16) * np.minimum(1, t / 0.001)
    return norm(y)


def fx_cha_ching():
    a, b = fx_coin(1568, 0.5), fx_coin(2349, 0.7)
    out = np.zeros(int(0.9 * SR))
    out[: len(a)] += a * 0.8
    out[int(0.085 * SR):int(0.085 * SR) + len(b)] += b
    return norm(out)


def fx_arp(midis, gap=0.06, d=0.9, inst=bell):
    out = np.zeros(int((gap * len(midis) + d) * SR))
    for k, m in enumerate(midis):
        x = inst(midi(m), d)
        out[int(k * gap * SR):int(k * gap * SR) + len(x)] += x
    return norm(out)


def fx_scan():
    t = tt(0.1)
    return norm(np.sin(2 * np.pi * 1480 * t) * np.minimum(1, t / 0.004) * np.minimum(1, (0.1 - t) / 0.01))


def fx_shutter():
    d = 0.8
    out = np.zeros(int(d * SR))
    w = fx_whoosh(0.55, 350, 3200, down=True)
    out[: len(w)] += w * 0.8
    s = fx_stamp(110, 45, 0.35)
    out[int(0.45 * SR):int(0.45 * SR) + len(s)] += s
    return norm(out)


def fx_block():
    d = 0.5
    out = fx_stamp(180, 70, d)
    t = tt(0.22)
    buz = np.sign(np.sin(2 * np.pi * (230 - 80 * t / 0.22) * t)) * 0.35 * np.exp(-t / 0.1)
    out[: len(buz)] += buz
    return norm(out)


def fx_reject():
    d = 2.2
    t = tt(d)
    boom = np.sin(2 * np.pi * np.cumsum(32 + 60 * np.exp(-t / 0.18)) / SR) * np.exp(-t / 0.7)
    crack = fft_filter(noise(d), hi=3500) * np.exp(-t / 0.05)
    clang = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / tau) for a, f, tau in [(0.5, 311, 0.9), (0.4, 523, 0.7), (0.3, 877, 0.5), (0.2, 1411, 0.3)])
    low = fft_filter(noise(d), hi=500) * np.exp(-t / 0.35)
    return norm(boom * 1.0 + crack * 0.5 + clang * 0.35 + low * 0.5)


def fx_riser(d):
    t = tt(d)
    n = sweep_noise(d, 250, 7000, q=0.9) * (t / d) ** 2
    f = 180 * (6 ** (t / d))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * (t / d) ** 2.5 * 0.35
    return norm((n + s) * np.minimum(1, (d - t) / 0.01))


def fx_boom(d=1.2, f=45):
    t = tt(d)
    return norm(np.sin(2 * np.pi * np.cumsum(f + 40 * np.exp(-t / 0.2)) / SR) * np.exp(-t / 0.5) + 0.3 * fft_filter(noise(d), hi=700) * np.exp(-t / 0.25))


# ---------- the events (time seconds, kind, dB, pan) ----------
ev = json.loads((VID / "events.json").read_text()) if (VID / "events.json").exists() else []
ev_t = np.array([e["t"] for e in ev]) if ev else np.array([])


def snap(t, tol=0.3):
    if not len(ev_t):
        return t
    i = int(np.argmin(np.abs(ev_t - t)))
    return float(ev_t[i]) if abs(ev_t[i] - t) <= tol else t


def sfx_events():
    E = []
    a = E.append
    # scene 1: the problem
    a((0.5, "stamp", -9, 0)); a((7.0, "whoosh", -16, 0.2))
    for t in (11.0, 12.6): a((t, "notif", -9, 0.4))
    a((14.0, "notif", -7, 0.4)); a((14.0, "buzz", -12, 0.4))
    a((15.0, "shutter", -6, 0))
    # scene 2: meet Kulaya
    a((17.9, "wipe", -9, 0)); a((18.55, "logo_stamp", -5, 0))
    for k in range(38): a((19.72 + k * 0.06, "tick", -22 + rng.uniform(-2, 2), rng.uniform(-0.15, 0.15)))  # slogan typing, not snapped
    for t in (22.3, 22.7, 23.4): a((t, "pop", -14, rng.uniform(-0.3, 0.3)))
    # scene 3: sell
    a((32.1, "whoosh", -14, -0.1))
    for t, f in ((33.85, 1.0), (34.4, 1.1), (34.8, 0.9)): a((t, "tap", -11, 0.1))
    a((36.0, "tap", -12, 0.1))
    for k in range(14): a((36.45 + k * 0.075, "tick", -25, 0.1))
    a((37.6, "tap", -8, 0.1)); a((38.2, "pop", -9, 0))
    a((39.5, "whoosh", -14, 0.3)); a((41.0, "scan", -12, 0.3)); a((42.0, "whoosh", -14, 0.3)); a((43.0, "tap", -10, 0.3))
    a((44.3, "ding", -8, 0.3)); a((45.6, "cha_ching", -6, -0.2)); a((46.1, "pop", -12, -0.2)); a((47.6, "tick", -18, -0.2))
    a((48.4, "stamp", -9, 0)); a((48.9, "pop", -12, 0.3)); a((53.2, "pop", -15, 0))
    # scene 4: credit
    a((62.1, "wipe", -9, 0)); a((64.0, "whoosh", -15, -0.2)); a((65.7, "pop", -12, 0.3))
    for k in range(18): a((66.4 + k * 0.09, "tick", -24 + k * 0.4, 0.3))  # bars growing
    a((70.5, "pop", -12, 0.3))
    for t in (70.7, 71.2, 71.7): a((t, "tick", -16, 0.3))
    a((72.5, "stamp", -11, 0.3)); a((72.5, "ding", -12, 0.3))
    a((74.2, "whoosh", -15, 0))
    for t in (74.9, 75.6, 76.4): a((t, "pop", -12, rng.uniform(-0.4, 0.4)))
    a((77.9, "pop", -14, -0.3)); a((79.2, "pop", -14, 0.3))
    # scene 5: the offer
    a((84.9, "wipe", -9, 0)); a((86.0, "pop", -13, 0)); a((86.6, "send", -10, 0.3))
    a((90.0, "pop", -14, -0.3)); a((92.0, "recv", -10, 0.3)); a((93.8, "whoosh", -14, 0))
    for t in (94.4, 95.6, 96.2, 96.8): a((t, "tick", -16, 0))
    for t in (97.4, 97.8, 98.2): a((t, "pop", -15, 0))
    a((98.5, "sheet", -12, 0)); a((101.2, "tap", -8, 0)); a((101.8, "cha_ching", -5, 0))
    for k in range(8): a((102.2 + k * 0.3, "coin_s", -17, rng.uniform(-0.3, 0.3)))
    a((104.6, "fanfare", -6, 0))
    # scene 6: repay
    a((115.0, "wipe", -9, 0))
    for k, t in enumerate([116.7, 117.0, 117.5, 118.0, 118.4, 118.8, 119.4, 119.7, 120.3, 120.9, 121.4, 122.6, 123.1, 123.9, 124.5]):
        a((t, "coin_s", -17, rng.uniform(-0.5, 0.5))); a((t + 0.04, "tick", -20, 0))
    a((125.1, "stamp", -5, 0)); a((125.1, "chime", -6, 0)); a((126.5, "levelup", -7, 0)); a((128.5, "badge", -9, 0.2))
    # scene 7: break it
    a((135.0, "boom", -8, 0)); a((136.4, "whoosh", -14, 0))
    for k in range(50): a((139.3 + k * 0.108, "tick", -24 + rng.uniform(-2, 2), rng.uniform(-0.2, 0.2)))  # attack prompt typing
    a((145.4, "pop", -13, 0)); a((146.3, "block", -4, 0)); a((148.4, "tap", -10, 0)); a((149.4, "tap", -10, 0)); a((150.3, "pop", -14, 0)); a((151.0, "pop", -12, 0.2)); a((151.8, "whoosh", -12, 0.3))
    a((152.6, "reject", 0, 0))
    a((154.4, "resolve", -5, 0))
    for t in (157.2, 158.0, 159.4, 161.1): a((t, "pop", -13, rng.uniform(-0.3, 0.3)))
    # scene 8: close
    a((164.8, "wipe", -9, 0))
    for t in (166.1, 167.3, 168.1, 169.6): a((t, "pop", -14, 0))
    a((171.45, "logo_chime", -5, 0))
    for t in (172.0, 172.5, 173.0): a((t, "pop", -17, 0))
    return E


FX = {
    "tick": lambda: fx_tick(), "tap": lambda: fx_tap(), "pop": lambda: fx_pop(), "notif": fx_notif, "buzz": fx_buzz,
    "whoosh": lambda: fx_whoosh(0.4, 500, 3500), "wipe": lambda: fx_whoosh(0.55, 300, 5000), "stamp": lambda: fx_stamp(),
    "logo_stamp": lambda: norm(layer((fx_stamp(120, 50, 0.35), 0), (fx_arp([79, 84, 88], 0.07, 1.0) * 0.5, 0.05))),
    "coin_s": lambda: fx_coin(float(rng.choice([1976, 2093, 2349, 2637])), 0.35), "cha_ching": fx_cha_ching,
    "ding": lambda: fx_arp([79, 84], 0.09, 0.8), "chime": lambda: fx_arp([72, 76, 79, 84], 0.06, 1.2),
    "scan": fx_scan, "shutter": fx_shutter, "block": fx_block, "reject": fx_reject, "boom": lambda: fx_boom(),
    "send": lambda: fx_whoosh(0.2, 800, 4000), "recv": lambda: fx_arp([88, 93], 0.08, 0.5, marimba), "sheet": lambda: fx_whoosh(0.35, 250, 1800),
    "fanfare": lambda: fx_arp([72, 76, 79, 84, 88], 0.07, 1.3), "levelup": lambda: fx_arp([72, 74, 76, 79, 84], 0.075, 1.2, marimba),
    "badge": lambda: norm(layer((fx_whoosh(0.15, 1500, 5000) * 0.6, 0), (fx_coin(2093, 0.6), 0.1))),
    "logo_chime": lambda: fx_arp([79, 84, 88, 91, 96], 0.11, 1.9), "resolve": lambda: norm(layer((fx_boom(1.0, 55) * 0.6, 0), (fx_arp([72, 79, 84, 88, 91], 0.05, 1.6), 0))),
}


def build_sfx():
    bus = Bus()
    for t, kind, db, pan in sfx_events():
        typing = kind == "tick" and (19.7 < t < 22.1 or 36.4 < t < 37.6 or 139 < t < 145)
        ts = t if typing or kind in ("coin_s",) and False else snap(t) if not typing else t
        x = FX[kind]()
        bus.add(x, ts, db, pan)
    # risers that lead into the big moments
    for end, d, db in ((17.9, 2.4, -17), (125.1, 2.2, -15), (152.6, 2.6, -11), (154.4 - 0.0, 0.0, -99)):
        if d: bus.add(fx_riser(d), end - d, db, 0)
    # a little space on everything
    wet = reverb(bus.b[0] + bus.b[1], wet=1.0, rt=1.1)
    bus.b = bus.b * 0.82 + wet * 0.18 * 0.9
    return bus.b


# ---------- music ----------
CHORDS = [(48, [60, 64, 67]), (43, [59, 62, 67]), (45, [57, 60, 64]), (41, [57, 60, 65])]  # C, G, Am, F (root, voicing)
AM = (45, [57, 60, 64])


def section(t):
    """name for a time"""
    for lim, name in ((17.9, "tense"), (32.0, "intro"), (62.0, "groove"), (85.0, "groove2"), (101.2, "soft"), (115.0, "lift"), (135.0, "drive"),
                      (152.6, "dark"), (154.4, "void"), (164.8, "resolve"), (1e9, "theme")):
        if t < lim:
            return name


def build_music():
    pad, mar, bass, drums, bells = Bus(), Bus(), Bus(), Bus(), Bus()
    bars = int(DUR / BAR) + 1
    for b in range(bars):
        t0 = b * BAR
        sec = section(t0)
        root, voc = AM if sec in ("tense", "dark", "drive") else CHORDS[b % 4]
        # pad: a held chord per bar (overlapping fades)
        if sec != "void":
            lvl = {"tense": -22, "intro": -19, "groove": -21, "groove2": -21, "soft": -22, "lift": -20, "drive": -24, "dark": -25, "resolve": -17, "theme": -19}[sec]
            for m in voc:
                pad.add(pad_note(midi(m), BAR + 1.2), t0, lvl, 0)
        # bass
        if sec in ("groove", "groove2", "soft", "lift", "resolve", "theme", "drive") and not (sec == "soft" and t0 < 101.0 and b % 2):
            pat = [0, 1.5, 2, 3.5] if sec != "drive" else [0, 2]
            for p in pat:
                bass.add(pluck_bass(midi(root), 0.5), t0 + p * BEAT, -17 if sec != "drive" else -20, 0)
        if sec in ("tense", "dark", "drive"):  # heartbeat
            for p in (0, 2) if sec != "dark" else (0,):
                drums.add(kick(0.7), t0 + p * BEAT, -17 if sec == "tense" else -14, 0)
                drums.add(kick(0.45), t0 + p * BEAT + 0.2, -22 if sec == "tense" else -19, 0)
        # marimba arpeggio, 8ths
        if sec in ("intro", "groove", "groove2", "soft", "lift", "resolve", "theme") and t0 >= 19.5:
            notes = [voc[0] + 12, voc[1] + 12, voc[2] + 12, voc[1] + 12 + 12, voc[2] + 12, voc[1] + 12, voc[0] + 24, voc[1] + 12]
            step = BEAT / 2 if sec != "lift" else BEAT / 4
            seq = notes if sec != "lift" else notes * 2
            for k, m in enumerate(seq):
                if sec == "intro" and k % 2: continue
                mar.add(marimba(midi(m), 0.6), t0 + k * step, {"intro": -23, "groove": -24, "groove2": -23, "soft": -26, "lift": -25, "resolve": -22, "theme": -24}[sec] - (3 if k % 2 else 0), ((k % 4) - 1.5) * 0.35)
        # pluck melody (pentatonic) in groove2 and theme
        if sec in ("groove2", "theme", "resolve") and b % 2 == 0:
            mel = [76, 79, 81, 79, 84, 81, 79, 76]
            for k, m in enumerate(mel):
                if k in (1, 3, 6): continue
                bells.add(bell(midi(m + (0 if sec != "resolve" else 0)), 0.9, 0.7), t0 + (k + 0.0) * BEAT, -26, 0.25)
        # drums
        if sec in ("groove", "groove2", "lift", "theme", "resolve") or (sec == "soft" and t0 >= 101.0) or (sec == "intro" and t0 >= 24.0):
            for p in range(4):
                if sec in ("groove", "groove2", "lift", "theme") or (sec == "soft") or p % 2 == 0:
                    drums.add(kick(0.9), t0 + p * BEAT, -14 if sec != "intro" else -18, 0)
            if sec in ("groove", "groove2", "lift", "theme"):
                for p in (1, 3): drums.add(rim(0.8), t0 + p * BEAT, -22, 0.15)
        if sec in ("intro", "groove", "groove2", "lift", "theme", "soft"):
            n16 = 16 if sec in ("groove", "groove2", "lift", "theme") else 8
            for k in range(n16):
                drums.add(shaker(0.5 + 0.5 * (k % 4 == 2)), t0 + k * BAR / n16, -27 if sec != "lift" else -24, rng.uniform(-0.4, 0.4))
        if sec == "lift":
            for k in range(8): drums.add(hat(0.7), t0 + k * BEAT / 2 + BEAT / 4, -26, 0.3)
    # tension: high, slowly rising tone in the dark section
    t = tt(152.6 - 140.0)
    f = 880 * (1.5 ** (t / t[-1])) if len(t) else t
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * (t / t[-1]) ** 2 * (1 + 0.1 * np.sin(2 * np.pi * 5 * t))
    bells.add(tone, 140.0, -30, 0)
    # the resolve hit and the final chord
    bells.add(bell(midi(72), 3.0), 154.4, -15, 0); bells.add(bell(midi(79), 3.0), 154.4, -17, 0); bells.add(bell(midi(88), 3.0), 154.4, -19, 0)
    for m in (60, 64, 67, 72): pad.add(pad_note(midi(m), 4.0), 154.4, -15, 0)
    for m in (60, 64, 67, 72): pad.add(pad_note(midi(m), 5.0), 175.0, -16, 0)
    bells.add(bell(midi(84), 4.0), 175.0, -19, 0); bells.add(bell(midi(91), 4.0), 175.1, -22, 0)
    # logo moment at 18.5: a chord swell and the first arpeggio
    for m in (60, 64, 67, 72): pad.add(pad_note(midi(m), 2.5), 18.4, -16, 0)
    # a deliberate gap of silence after the reject hit, before the resolve
    drums.b[:, int(152.65 * SR):int(154.35 * SR)] *= np.linspace(1, 0, int(1.7 * SR))[None, :] ** 2
    pad.b[:, int(152.65 * SR):int(154.35 * SR)] *= 0.25
    mar.b[:, int(152.6 * SR):int(154.4 * SR)] = 0
    bass.b[:, int(152.6 * SR):int(154.4 * SR)] = 0
    # space: reverb on pad/marimba/bells, tighter on the rest
    P = reverb(pad.b[0] + pad.b[1], 0.35, 2.0) * 0.7
    M = reverb(mar.b[0] + mar.b[1], 0.3, 1.2)
    Bl = reverb(bells.b[0] + bells.b[1], 0.4, 1.8)
    mix = pad.b * 0.0 + P * 0.5 + M * 0.5 * 1.0 + Bl * 0.5 + bass.b * 0.9 + drums.b * 0.9
    # a lowpass on the whole music so it sits behind the voice
    for c in (0, 1): mix[c] = fft_filter(mix[c], lo=35, hi=11000)
    # global fades: in at the start, out over the last 4 s
    g = np.ones(N)
    g[: int(1.0 * SR)] = np.linspace(0, 1, int(1.0 * SR))
    g[int(176.0 * SR):] = np.linspace(1, 0, N - int(176.0 * SR)) ** 1.5
    return mix * g


def write(path, st):
    st = st / max(1.0, np.max(np.abs(st)) / 0.98)
    pcm = (np.clip(st.T, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    print("events in video/events.json:", len(ev))
    sfx = build_sfx(); write(VID / "sfx.wav", sfx); print("sfx.wav", round(float(np.max(np.abs(sfx))), 3))
    mus = build_music(); write(VID / "music.wav", mus); print("music.wav", round(float(np.max(np.abs(mus))), 3))
