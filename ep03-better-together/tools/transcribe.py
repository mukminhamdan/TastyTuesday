import sys, json, time
from faster_whisper import WhisperModel
src, out, model_name = sys.argv[1], sys.argv[2], sys.argv[3]
clip = float(sys.argv[4]) if len(sys.argv) > 4 else None
m = WhisperModel(model_name, device="cpu", compute_type="int8", cpu_threads=4)
t0 = time.time()
import wave, numpy as np
wf = wave.open(src)
audio = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32)/32768.0
kw = dict(language="ms", word_timestamps=True, vad_filter=True, beam_size=1,
          vad_parameters=dict(min_silence_duration_ms=500),
          initial_prompt="Tasty Tuesday live. Thermomix, Cooven, resepi, masak, sedap, okey semua.")
if clip: kw["clip_timestamps"] = [0, clip]
segs, info = m.transcribe(audio, **kw)
res = []
with open(out + ".txt", "w") as ft:
    for s in segs:
        res.append({"start": s.start, "end": s.end, "text": s.text.strip(),
                    "words": [{"w": w.word, "s": round(w.start,2), "e": round(w.end,2), "p": round(w.probability,2)} for w in (s.words or [])]})
        ft.write(f"[{s.start:7.1f}-{s.end:7.1f}] {s.text.strip()}\n"); ft.flush()
json.dump(res, open(out, "w"), ensure_ascii=False)
print("done", time.time() - t0, file=sys.stderr)
