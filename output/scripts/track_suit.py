# Track navy-suited singer: per-frame (cx, top) normalised, sampled at 10 fps
import numpy as np, cv2, subprocess, sys, json
src,out=sys.argv[1],sys.argv[2]; W,H=270,480
p=subprocess.Popen(["ffmpeg","-v","error","-i",src,"-vf",f"fps=10,scale={W}:{H}","-f","rawvideo","-pix_fmt","bgr24","-"],stdout=subprocess.PIPE)
res=[]; prev=None
while True:
    b=p.stdout.read(W*H*3)
    if len(b)<W*H*3: break
    f=np.frombuffer(b,np.uint8).reshape(H,W,3); hsv=cv2.cvtColor(f,cv2.COLOR_BGR2HSV); h,s,v=cv2.split(hsv)
    m=((v<95)&(h>=95)&(h<=135)&(s>35)).astype(np.uint8)
    m[:int(0.12*H)]=0; m[int(0.8*H):]=0
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((9,5),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(m)
    best=None
    for k in range(1,n):
        x,y,w,hh,a=st[k]
        if a<150 or hh<0.15*H: continue
        score=a*(1.0 if prev is None else np.exp(-abs(cen[k][0]/W-prev)/0.15))
        if best is None or score>best[0]: best=(score,cen[k][0]/W,y/H,a)
    if best: prev=best[1]; res.append([best[1],best[2],int(best[3])])
    else: res.append([None,None,0])
json.dump(res,open(out,"w"))
cx=np.array([r[0] if r[0] is not None else np.nan for r in res])
print(src.split('/')[-1],len(res),"missing",int(np.isnan(cx).sum()),"cx p5/p50/p95",np.nanpercentile(cx,[5,50,95]).round(2))
