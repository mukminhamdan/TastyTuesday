"""Transcribe clips with faster-whisper (large-v3-turbo, Malay) to find speech for cutting.
Usage: python3 -I scripts/transcribe.py <out_dir> <audio.wav> [...]
Make the WAVs first: ffmpeg -i clip.mp4 -vn -ac 1 -ar 16000 clip.wav
VAD is on, so silence/noise gives no segments. Without VAD Whisper hallucinates
"Terima kasih kerana menonton!" on kitchen noise: that is NOT speech.
Needs: pip install faster-whisper numpy
"""
import sys, os, json, wave
import numpy as np
from faster_whisper import WhisperModel

out_dir = sys.argv[1]
os.makedirs(out_dir, exist_ok=True)
model = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8", cpu_threads=4)
for wav in sys.argv[2:]:
    name = os.path.basename(wav).rsplit(".", 1)[0]
    with wave.open(wav) as wf:
        audio = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    segs, _ = model.transcribe(audio, language="ms", word_timestamps=True, vad_filter=True,
                               initial_prompt="Resipi masakan. Hai semua, hari ni kita masak.")
    out = []
    for s in segs:
        out.append({"start": s.start, "end": s.end, "text": s.text.strip(),
                    "words": [{"w": w.word, "s": w.start, "e": w.end} for w in (s.words or [])]})
        print(f"[{name} {s.start:7.2f}-{s.end:7.2f}] {s.text.strip()}", flush=True)
    json.dump(out, open(os.path.join(out_dir, name + ".json"), "w"), ensure_ascii=False, indent=1)
    print(f"{name}: {len(out)} segments", flush=True)
