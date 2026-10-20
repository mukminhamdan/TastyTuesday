import json, sys, time
from faster_whisper import WhisperModel
src, out = sys.argv[1], sys.argv[2]
m = WhisperModel('mobiuslabsgmbh/faster-whisper-large-v3-turbo', device='cpu', compute_type='int8', cpu_threads=4)
import wave, numpy as np
wf=wave.open(src); audio=np.frombuffer(wf.readframes(wf.getnframes()),dtype=np.int16).astype(np.float32)/32768.0
segs, info = m.transcribe(audio, language='ms', word_timestamps=True, vad_filter=True,
    vad_parameters=dict(min_silence_duration_ms=500), beam_size=1, condition_on_previous_text=False,
    initial_prompt='Tasty Tuesday. Resepi masakan Malaysia. Okay guys, hari ni kita masak.')
t0 = time.time()
with open(out, 'w') as f:
    for s in segs:
        d = dict(start=round(s.start,2), end=round(s.end,2), text=s.text.strip(),
                 words=[dict(w=w.word, s=round(w.start,2), e=round(w.end,2), p=round(w.probability,2)) for w in (s.words or [])])
        f.write(json.dumps(d, ensure_ascii=False)+'\n'); f.flush()
        print(f'[{s.start:7.1f}] {s.text.strip()}  ({time.time()-t0:.0f}s)', flush=True)
print('DONE', flush=True)
