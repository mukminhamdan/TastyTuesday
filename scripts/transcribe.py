import json, sys, time
from faster_whisper import WhisperModel
src, out = sys.argv[1], sys.argv[2]
m = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8", cpu_threads=4)
import numpy as np, wave
wf=wave.open(src); audio=np.frombuffer(wf.readframes(wf.getnframes()),dtype=np.int16).astype(np.float32)/32768
t=time.time()
segs, info = m.transcribe(audio, language="ms", word_timestamps=True, vad_filter=True, beam_size=5, vad_parameters=dict(threshold=0.35, min_silence_duration_ms=400, speech_pad_ms=200), condition_on_previous_text=False,
    initial_prompt="Okay, harini kita masak ikan guna Cooven. Ikan kembung, bawang, kicap, sambal, jintan. Senang je, tak payah basuh periuk.")
res=[]
for s in segs:
    res.append({"start":s.start,"end":s.end,"text":s.text,"words":[{"w":w.word,"s":w.start,"e":w.end,"p":w.probability} for w in s.words]})
    print(f"[{s.start:7.2f}-{s.end:7.2f}] {s.text}", flush=True)
json.dump(res, open(out,"w"), ensure_ascii=False)
print("DONE", time.time()-t)
