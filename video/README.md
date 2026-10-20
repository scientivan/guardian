# Guardian demo video (Remotion)

1920×1080, 30 fps. Left: the product stage; right: two 16:9 presenter frames.

```bash
npm install
python3 scripts/tts.py --model kokoro-v1.0.int8.onnx --voices voices-v1.0.bin   # voice for every line in narration.json
npx remotion studio src/index.ts                                               # preview
npx remotion render src/index.ts GuardianDemo out/demo.mp4 \
  --props='{"speaker1Name":"Dien","speaker2Name":"Aurel","speaker1Src":"presenters/dien.mp4","speaker2Src":"presenters/aurel.mp4"}'
```

- Narration and subtitles come from `narration.json` (one sentence per subtitle line); the timeline follows the voice length (`src/timeline.ts`).
- Put presenter videos in `public/presenters/` and pass them as props; without them the frames show a placeholder.
- TTS: Kokoro (offline), models from https://github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0).
- Fonts are the app's own (Manrope, DM Serif Display) in `public/fonts/`; assets are imported from `../src/components/landing/`.
- Set `REMOTION_BROWSER` or `--browser-executable` to use an installed Chromium.

Sources shown in the problem scene: Hospital Management Asia (2026) on Mount Elizabeth Novena's 2023 estimate accuracy; Malaysia Public Accounts Committee findings (The Star, NST, Malay Mail, 24–25 June 2026); Malaysian Ministry of Health deposit rule for foreign patients (Bernama, Asia News Network).
