# navy-suit tracker with optional region (normalised x0,x1,y0,y1); any orientation
import numpy as np, cv2, subprocess, sys, json
src,out=sys.argv[1],sys.argv[2]; reg=[float(v) for v in sys.argv[3].split(",")] if len(sys.argv)>3 else [0,1,0.12,0.8]
info=subprocess.run(["ffprobe","-v","error","-select_streams","v:0","-show_entries","stream=width,height:stream_side_data=rotation","-of","json",src],capture_output=True,text=True).stdout
d=json.loads(info)["streams"][0]; w0,h0=d["width"],d["height"]; rot=any(abs(s.get("rotation",0))==90 for s in d.get("side_data_list",[]))
if rot: w0,h0=h0,w0
W=480 if w0>h0 else 270; H=int(W*h0/w0)//2*2
p=subprocess.Popen(["ffmpeg","-v","error","-i",src,"-vf",f"fps=10,scale={W}:{H}","-f","rawvideo","-pix_fmt","bgr24","-"],stdout=subprocess.PIPE)
res=[]; prev=None
while True:
    b=p.stdout.read(W*H*3)
    if len(b)<W*H*3: break
    f=np.frombuffer(b,np.uint8).reshape(H,W,3); h,s,v=cv2.split(cv2.cvtColor(f,cv2.COLOR_BGR2HSV))
    m=((v<95)&(h>=95)&(h<=135)&(s>35)).astype(np.uint8)
    R=np.zeros_like(m); R[int(reg[2]*H):int(reg[3]*H),int(reg[0]*W):int(reg[1]*W)]=1; m*=R
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((7,4),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(m); best=None
    for k in range(1,n):
        x,y,ww,hh,a=st[k]
        if a<60 or hh<0.06*H: continue
        sc=a*(1.0 if prev is None else np.exp(-abs(cen[k][0]/W-prev)/0.12))
        if best is None or sc>best[0]: best=(sc,cen[k][0]/W,y/H,int(a))
    if best: prev=best[1]; res.append([best[1],best[2],best[3]])
    else: res.append([None,None,0])
json.dump(res,open(out,"w"))
cx=np.array([r[0] if r[0] is not None else np.nan for r in res]); print(src.split('/')[-1],len(res),"missing",int(np.isnan(cx).sum()),np.nanpercentile(cx,[5,50,95]).round(2))
