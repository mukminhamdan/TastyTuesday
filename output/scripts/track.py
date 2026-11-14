# Track singer via lime-green shirt mask -> per-frame (cx, shirt_top) in source pixels (576x1024)
import numpy as np, cv2, subprocess, sys, json
src, out = sys.argv[1], sys.argv[2]
W,H=576,1024
p=subprocess.Popen(["ffmpeg","-v","error","-i",src,"-f","rawvideo","-pix_fmt","bgr24","-"],stdout=subprocess.PIPE)
res=[]
while True:
    b=p.stdout.read(W*H*3)
    if len(b)<W*H*3: break
    f=np.frombuffer(b,np.uint8).reshape(H,W,3)
    hsv=cv2.cvtColor(f,cv2.COLOR_BGR2HSV)
    m=cv2.inRange(hsv,(28,110,60),(48,255,255))
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(m)
    if n>1:
        k=1+np.argmax(st[1:,cv2.CC_STAT_AREA]); a=st[k]
        res.append([float(cen[k][0]), float(a[cv2.CC_STAT_TOP]), float(a[cv2.CC_STAT_AREA])])
    else: res.append([None,None,0])
json.dump(res,open(out,"w"))
a=np.array([r[0] if r[0] is not None else np.nan for r in res]); t=np.array([r[1] if r[1] is not None else np.nan for r in res])
print(len(res),"frames; missing",np.isnan(a).sum(),"cx range",np.nanmin(a),np.nanmax(a),"top range",np.nanmin(t),np.nanmax(t))
