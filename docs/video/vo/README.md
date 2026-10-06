# Voiceover pipeline

1. Generate the whole script in ONE take on elevenlabs.io (Text to Speech): paste `full-script.txt`, pick the voice, download the MP3 into `video/vo-input/`.
   One take keeps the intonation natural; the script cuts it into phrases afterwards.
2. One-time setup of the splitter (speech-to-text for word timestamps):
   `python -m venv .vo-venv && .vo-venv/Scripts/pip install faster-whisper`
3. From `app/`: `<venv>/python scripts/vo-split.py` (cuts one clip per caption cue of `video/vo.srt` into `video/vo-clips/`)
4. From `app/`: `node scripts/vo-build.mjs` writes `video/vo-preview.mp4` (voice-only preview; optional `MUSIC=<file>` env for ducked background music).

Every clip is cut with short fades and can never play into the next phrase; a phrase longer than its caption window is sped up by at most 15%.

## Sound design (music + effects)

All synthesized locally, no samples or licences. Needs the venv from step 2 (numpy comes with faster-whisper).

1. `<venv>/python scripts/sfx-detect.py` finds visual events in `video/final-edited.mp4` (writes `video/events.json`).
2. `<venv>/python scripts/sfx-music.py` writes `video/music.wav` (arrangement follows the scenes) and `video/sfx.wav` (effects snapped to the detected frames). The event table is `sfx_events()` in that file.
3. `VO_ONLY=1 node scripts/vo-build.mjs` writes `video/vo-voice.wav` (voice only, never touches a video file).
4. `node scripts/av-mix.mjs` mixes voice + music (ducked under the voice) + effects to -16 LUFS and writes `video/Kulaya Demo Video - Final.mp4`.
   Tune with `MUSIC_LUFS`, `SFX_PEAK`, `DUCK`. `<venv>/python scripts/av-report.py` prints the levels.

To use a licensed music track instead, replace `video/music.wav` with any stereo WAV and rerun step 4.
