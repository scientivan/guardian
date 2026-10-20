"""Build the final narration from exactly the same scene/cue frames as Remotion."""
import json
from pathlib import Path
import numpy as np
import soundfile as sf

root = Path(__file__).resolve().parents[1]
scenes = json.loads((root / 'src/timeline.5min.json').read_text())
rate = 24000
samples = np.zeros(298 * rate, dtype=np.float32)
for scene in scenes:
    for line in scene['lines']:
        voice, actual_rate = sf.read(root / 'public/tts' / (line['id'] + '.wav'), dtype='float32')
        if actual_rate != rate or line['rate'] != 1:
            raise ValueError('This mix expects normal-speed 24 kHz narration')
        start = round((scene['from'] + line['from']) / 30 * rate)
        end = start + len(voice)
        if end > len(samples):
            raise ValueError('Voice exceeds the final duration')
        samples[start:end] += voice
peak = float(np.max(np.abs(samples)))
if peak >= 1:
    raise ValueError('Audio mix would clip')
(root / 'out').mkdir(exist_ok=True)
sf.write(root / 'out/final-narration.wav', samples, rate, subtype='PCM_16')
print('Audio timeline 298 seconds, 59 cues, peak', round(peak, 4))
