# Guardian demo video

The active Remotion composition is the approved 17-scene version, 1920×1080 at 30 fps. Its fixed timeline is 8,940 frames, or **4 minutes 58 seconds**. English narration and subtitles accompany actual synthetic demo UI captures, short screen recordings, and illustrated explanations. Empty presenter placeholders have been removed.

The storyboard and rubric map are in [SCENES-5MIN.md](SCENES-5MIN.md). The spoken script is [narration.5min.json](narration.5min.json). Production notes and evidence sources are in [PRODUCTION.md](PRODUCTION.md).

## Render

Run these commands inside `video/`.

```bash
npm ci
node scripts/verify-video.cjs
npx tsc --noEmit
npx remotion studio src/index.ts --port=3100
npx remotion render src/index.ts GuardianDemo out/Guardian-5min.mp4 \
  --port=3100 --concurrency=4 --codec=h264 --crf=18 \
  --browser-executable='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
```

Port 3100 avoids the application on port 3000. Use an installed Chrome/Chromium path appropriate to your system. No live application, cloud credentials, or model call is needed to render the committed media.

## Regenerate narration

Install Python 3.12 with `kokoro-onnx` and `soundfile`, then download the Kokoro v1.0 int8 ONNX model and voices from the [official repository](https://github.com/thewh1teagle/kokoro-onnx). These model binaries remain outside Git.

```bash
python scripts/tts.py --model /path/kokoro-v1.0.int8.onnx \
  --voices /path/voices-v1.0.bin --narration narration.5min.json
node scripts/build-timeline.cjs
```

For consistent final audio, build the same frame-aligned narration and normalize it after rendering.

```bash
python scripts/mix-audio.py
node scripts/finalize.cjs out/Guardian-5min.mp4 out/Guardian-final.mp4
```

The finalizer targets −16 LUFS and a −1.5 dBTP ceiling, using FFmpeg. It also accepts an optional separately rendered final 900-frame tail for incremental edits.

The timeline builder checks speech against each scene budget and rejects speech requiring more than 1.15× speed. The present version uses normal speed throughout. Subtitles and voice share cue IDs and frame timing.

## Media

- `public/demo/` contains curated synthetic UI screenshots and two short screen recordings. No browser session or credentials are included.
- `public/tts/v2-*.wav` contains offline Kokoro narration, voice `af_heart`.
- Fonts are the app’s Manrope and DM Serif Display, bundled locally.
- Product figures are reused from Guardian’s own SVG assets.
- `public/rec/` is ignored scratch output, including browser sessions and raw recordings. Never commit it.
- `narration.json`, `src/timeline.ts`, and the old scene components are retained as legacy material. The active entry uses `FiveMinute.tsx` and `timeline.5min.json`.

The root Next.js application excludes the separate video project from its TypeScript and ESLint checks. Validate the video using its own `tsconfig.json`.
