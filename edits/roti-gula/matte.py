# Run RobustVideoMatting over frames [f0, f1] and save alpha mattes.
import sys, subprocess, numpy as np, onnxruntime as ort
src, model, f0, f1, out = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
W, H, FPS = 720, 1280, 30
p = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", f"{f0/FPS:.4f}", "-i", src, "-frames:v", str(f1-f0+1),
                      "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
sess = ort.InferenceSession(model, providers=["CPUExecutionProvider"])
rec = [np.zeros((1, 1, 1, 1), np.float32)] * 4
dr = np.array([0.4], np.float32)
alphas = []
while True:
    buf = p.stdout.read(W*H*3)
    if len(buf) < W*H*3: break
    x = np.frombuffer(buf, np.uint8).reshape(H, W, 3).transpose(2, 0, 1)[None].astype(np.float32) / 255
    fgr, pha, *rec = sess.run(None, {"src": x, "r1i": rec[0], "r2i": rec[1], "r3i": rec[2], "r4i": rec[3], "downsample_ratio": dr})
    alphas.append((pha[0, 0]*255).round().astype(np.uint8))
    print(len(alphas), end=" ", flush=True)
np.save(out, np.stack(alphas))
