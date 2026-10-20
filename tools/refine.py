#!/usr/bin/env python3
"""Second-pass transcription of selected windows with a bigger model + beam search.
Usage: refine.py audio16k.wav out.jsonl start-end [start-end ...]"""
import json, sys, wave
import numpy as np
from faster_whisper import WhisperModel
src, out, wins = sys.argv[1], sys.argv[2], sys.argv[3:]
wf = wave.open(src); sr = wf.getframerate()
audio = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
m = WhisperModel('large-v3', device='cpu', compute_type='int8', cpu_threads=4)
with open(out, 'a') as f:
    for w in wins:
        a, b = map(float, w.split('-'))
        clip = audio[int(a * sr):int(b * sr)]
        segs, _ = m.transcribe(clip, language='ms', beam_size=5, word_timestamps=True, vad_filter=False, hallucination_silence_threshold=1.0,
            condition_on_previous_text=False, repetition_penalty=1.1, no_repeat_ngram_size=3,
            initial_prompt='Perbualan santai keluarga Malaysia sambil memasak: lempeng, kuah rojak, bunga telang, dehydrate, petis, cili, Thermomix, airfryer.')
        for s in segs:
            d = dict(start=round(a + s.start, 2), end=round(a + s.end, 2), text=s.text.strip(),
                     words=[dict(w=x.word, s=round(a + x.start, 2), e=round(a + x.end, 2), p=round(x.probability, 2)) for x in s.words])
            f.write(json.dumps(d, ensure_ascii=False) + '\n'); f.flush()
            print(f'[{d["start"]:.1f}] {d["text"]}', flush=True)
print('DONE', flush=True)
