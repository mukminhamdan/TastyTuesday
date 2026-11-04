"""Sample the source at 2 fps and record face box (normalized) so overlays never cover the face."""
import cv2, subprocess, numpy as np, json, sys
src, out = sys.argv[1], sys.argv[2]
W, H = 360, 720
p = subprocess.Popen(["ffmpeg","-v","error","-i",src,"-vf",f"fps=2,scale={W}:{H}","-f","rawvideo","-pix_fmt","gray","-"], stdout=subprocess.PIPE)
fr = cv2.CascadeClassifier(cv2.data.haarcascades+"haarcascade_frontalface_default.xml")
pr = cv2.CascadeClassifier(cv2.data.haarcascades+"haarcascade_profileface.xml")
res=[]; i=0
while True:
    b = p.stdout.read(W*H)
    if len(b) < W*H: break
    g = np.frombuffer(b, np.uint8).reshape(H, W); g = cv2.equalizeHist(g)
    boxes = list(fr.detectMultiScale(g, 1.1, 5, minSize=(28,28)))
    boxes += list(pr.detectMultiScale(g, 1.1, 5, minSize=(28,28)))
    boxes += [(W-x-w,y,w,h) for (x,y,w,h) in pr.detectMultiScale(cv2.flip(g,1), 1.1, 5, minSize=(28,28))]
    boxes = [bx for bx in boxes if bx[1] < H*0.6]
    if boxes:
        x,y,w,h = max(boxes, key=lambda b:b[2]*b[3])
        res.append([i/2, round((x+w/2)/W,3), round((y+h/2)/H,3), round(w/W,3), round(h/H,3)])
    else: res.append([i/2, None, None, None, None])
    i+=1
json.dump(res, open(out,"w")); print("frames", i, "found", sum(r[1] is not None for r in res))
