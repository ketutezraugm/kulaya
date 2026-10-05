# Voiceover pipeline

1. Generate the whole script in ONE take on elevenlabs.io (Text to Speech): paste `full-script.txt`, pick the voice, download the MP3 into `video/vo-input/`.
   One take keeps the intonation natural; the script cuts it into phrases afterwards.
2. One-time setup of the splitter (speech-to-text for word timestamps):
   `python -m venv .vo-venv && .vo-venv/Scripts/pip install faster-whisper`
3. From `app/`: `<venv>/python scripts/vo-split.py` (cuts one clip per caption cue of `video/vo.srt` into `video/vo-clips/`)
4. From `app/`: `node scripts/vo-build.mjs` writes `Kulaya Demo Video - VO.mp4` (optional `MUSIC=<file>` env for ducked background music).

Every clip is cut with short fades and can never play into the next phrase; a phrase longer than its caption window is sped up by at most 15%.
