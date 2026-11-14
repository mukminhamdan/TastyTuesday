import sys, subprocess, numpy as np, cv2
from scipy.ndimage import uniform_filter1d
def shifts(p):
    W,H=180,320; b=subprocess.run(["ffmpeg","-v","error","-i",p,"-vf",f"scale={W}:{H},format=gray","-f","rawvideo","-"],capture_output=True).stdout
    f=np.frombuffer(b,np.uint8).reshape(-1,H,W).astype(np.float32); win=cv2.createHanningWindow((W,H),cv2.CV_32F)
    s=[cv2.phaseCorrelate(f[i],f[i+1],win)[0] for i in range(len(f)-1)]
    return np.array(s)
for p in sys.argv[1:]:
    s=shifts(p); hf=s-uniform_filter1d(s,9,axis=0); a=np.abs(hf); print(p.split("/")[-1], "jitter median px(@180w):", np.median(a,0).round(3), "p90:", np.percentile(a,90,axis=0).round(3))
