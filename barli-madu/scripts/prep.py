"""Analyse raw clips: probe, transcribe (word timestamps), detect faces, make
proxies + contact sheets.

Usage: python3 -I scripts/prep.py <raw_dir> <project_dir>
Outputs (inside project_dir):
  analysis/<clip>.json      probe + words + segments + face boxes
  analysis/<clip>_sheet.jpg contact sheet (1 frame / 2 s)
  public/proxy/<clip>.mp4   720x1280 proxy used for the preview render
"""
import json
import os
import subprocess
import sys

RAW, PROJ = sys.argv[1], sys.argv[2]
ANA = os.path.join(PROJ, "analysis")
PROXY = os.path.join(PROJ, "public", "proxy")
os.makedirs(ANA, exist_ok=True)
os.makedirs(PROXY, exist_ok=True)


def sh(*args):
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout


def probe(path):
    info = json.loads(sh("ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", path))
    v = next(s for s in info["streams"] if s["codec_type"] == "video")
    rot = 0
    for sd in v.get("side_data_list", []):
        if "rotation" in sd:
            rot = int(sd["rotation"])
    rot = int(v.get("tags", {}).get("rotate", rot))
    w, h = int(v["width"]), int(v["height"])
    if abs(rot) in (90, 270):
        w, h = h, w
    num, den = map(int, v["avg_frame_rate"].split("/"))
    return {"width": w, "height": h, "fps": num / den if den else 30, "duration": float(info["format"]["duration"]), "rotation": rot}


def transcribe(path, model):
    wav = os.path.join(ANA, os.path.basename(path) + ".16k.wav")
    sh("ffmpeg", "-y", "-v", "error", "-i", path, "-ac", "1", "-ar", "16000", wav)
    import soundfile as sf
    audio, _ = sf.read(wav, dtype="float32")
    segs, info = model.transcribe(
        audio, language="ms", word_timestamps=True, vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 300}, beam_size=5,
        initial_prompt="Resepi air barli madu. Rebus barli, tapis, tambah madu. Tasty Tuesday.",
    )
    out_s, out_w = [], []
    for s in segs:
        out_s.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()})
        for w in s.words or []:
            out_w.append({"start": round(w.start, 2), "end": round(w.end, 2), "word": w.word.strip(), "p": round(w.probability, 2)})
    os.remove(wav)
    return out_s, out_w


def faces(path, meta, step=1.0):
    import cv2
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    cap = cv2.VideoCapture(path)
    res = []
    t = 0.0
    while t < meta["duration"]:
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        ok, frame = cap.read()
        if not ok:
            break
        h, w = frame.shape[:2]
        scale = 480 / max(h, w)
        small = cv2.resize(frame, (int(w * scale), int(h * scale)))
        gray = cv2.equalizeHist(cv2.cvtColor(small, cv2.COLOR_BGR2GRAY))
        found = cascade.detectMultiScale(gray, 1.1, 6, minSize=(30, 30))
        boxes = [[round(x / small.shape[1], 3), round(y / small.shape[0], 3), round(bw / small.shape[1], 3), round(bh / small.shape[0], 3)] for x, y, bw, bh in found]
        res.append({"t": round(t, 2), "boxes": boxes})
        t += step
    return res


def proxy_and_sheet(path, name, meta):
    out = os.path.join(PROXY, name + ".mp4")
    if not os.path.exists(out):
        sh("ffmpeg", "-y", "-v", "error", "-i", path, "-vf", "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=30",
           "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-g", "15", "-c:a", "aac", "-b:a", "160k", "-ar", "48000", out)
    sheet = os.path.join(ANA, name + "_sheet.jpg")
    sh("ffmpeg", "-y", "-v", "error", "-i", out, "-vf",
       "fps=1/2,scale=180:-1,drawtext=text='%{pts\\:hms}':x=4:y=4:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.6,tile=8x6",
       "-frames:v", "1", "-q:v", "4", sheet)


def main():
    from faster_whisper import WhisperModel
    model = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8", cpu_threads=4)
    clips = sorted(f for f in os.listdir(RAW) if f.lower().endswith((".mp4", ".mov")))
    for f in clips:
        name = os.path.splitext(f)[0]
        dst = os.path.join(ANA, name + ".json")
        if os.path.exists(dst):
            continue
        path = os.path.join(RAW, f)
        meta = probe(path)
        print(name, meta, flush=True)
        proxy_and_sheet(path, name, meta)
        segs, words = transcribe(path, model)
        fc = faces(os.path.join(PROXY, name + ".mp4"), meta)
        with open(dst, "w") as fh:
            json.dump({"clip": name, "file": f, "meta": meta, "segments": segs, "words": words, "faces": fc}, fh, ensure_ascii=False, indent=1)
        print("done", name, len(segs), "segments", flush=True)


if __name__ == "__main__":
    main()
