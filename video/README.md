# Guardian demo video (Remotion)

1920×1080, 30 fps. Left: the product stage; right: two 16:9 presenter frames.

## Rancangan versi mendekati lima menit

Draft penambahan berdasarkan subkriteria penilaian Dien ada di [SCENES-5MIN.md](SCENES-5MIN.md). Naskah Inggrisnya ada di [narration.5min.json](narration.5min.json). Target editorial 4 menit 58 detik, 17 scene, dengan demo tambahan untuk klarifikasi, recovery, withdrawal, izin peran, dan injeksi PDF, serta ilustrasi workflow dan batas AI.

Ini rancangan untuk ditinjau. Composition aktif masih menggunakan narration.json, audio, dan rekaman versi sekitar 2 menit 35 detik. Untuk produksi versi panjang, ikuti urutan rekaman dan pemeriksaan pada storyboard terlebih dahulu. Jangan mengganti import naskah tanpa menghasilkan audio, marks rekaman, dan scene baru yang sesuai.

## Render versi aktif

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
