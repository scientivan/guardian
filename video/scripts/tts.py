"""Text to speech for every narration line (Kokoro, offline).

    python3 scripts/tts.py --model <kokoro.onnx> --voices <voices.bin>

Writes public/tts/<id>.wav and public/tts/durations.json ({id: seconds}).
"""
import argparse, json
from pathlib import Path
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = Path(__file__).resolve().parents[1]
ap = argparse.ArgumentParser()
ap.add_argument("--model", required=True)
ap.add_argument("--voices", required=True)
ap.add_argument("--voice", default="af_heart")
ap.add_argument("--narration", default="narration.json")
ap.add_argument("--speed", type=float, default=1.0)
a = ap.parse_args()
k = Kokoro(a.model, a.voices)
out = HERE / "public" / "tts"
out.mkdir(parents=True, exist_ok=True)
durations = {}
for line in json.loads((HERE / a.narration).read_text()):
    samples, rate = k.create(line.get("say", line["text"]), voice=a.voice, speed=a.speed, lang="en-us")
    peak = float(max(abs(samples), default=0))
    if peak > 0.90:
        samples = samples * (0.90 / peak)
    sf.write(out / f"{line['id']}.wav", samples, rate)
    durations[line["id"]] = round(len(samples) / rate, 3)
    print(line["id"], durations[line["id"]])
(out / "durations.json").write_text(json.dumps(durations, indent=2))
