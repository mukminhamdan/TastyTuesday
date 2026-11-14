import numpy as np, cv2, subprocess, json, sys
from scipy.ndimage import gaussian_filter1d, median_filter
S=sys.argv[1]; CFG=json.loads(sys.argv[2]); OUT=CFG["out"]; SRC=f"{S}/src2"; TAG=CFG["tag"]
W,H=576,1024; OW,OH=1080,1920; FPS=30
MC=CFG["clip"]; M0=CFG["m0"]; T=CFG["T"]; N=int(round(T*FPS))
def load_track(name):
    r=json.load(open(f"{S}/track_{name}.json"))
    cx=np.array([v[0] for v in r]); top=np.array([v[1] for v in r])
    cx=gaussian_filter1d(median_filter(cx,15),18)
    top=gaussian_filter1d(median_filter(top,61),30)
    return cx,top
TR={n:load_track(n) for n in ["wa24","wa25"]}
def ease(a): a=np.clip(a,0,1); return a*a*(3-2*a)
def keyz(t,kf):
    if t<=kf[0][0]: return kf[0][1]
    for (t0,z0),(t1,z1) in zip(kf,kf[1:]):
        if t<=t1: return z0+(z1-z0)*ease((t-t0)/(t1-t0))
    return kf[-1][1]
def reader(name,ss,dur,slow=False):
    vf="hqdn3d=2:1:3:3"+(",minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1" if slow else "")
    return subprocess.Popen(["ffmpeg","-v","error","-ss",f"{ss}","-t",f"{dur}","-i",f"{SRC}/{name}.mp4","-vf",vf,"-f","rawvideo","-pix_fmt","bgr24","-"],stdout=subprocess.PIPE)
def rd(p):
    b=p.stdout.read(W*H*3)
    return None if len(b)<W*H*3 else np.frombuffer(b,np.uint8).reshape(H,W,3)
def frame_crop(img,cx,top,z):
    w,h=W/z,H/z; frac=0.44
    x0=np.clip(cx-w/2,0,W-w); y0=np.clip(top-frac*h,0,H-h)
    M=np.array([[OW/w,0,-x0*OW/w],[0,OH/h,-y0*OH/h]],np.float32)
    return cv2.warpAffine(img,M,(OW,OH),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REFLECT)
# main camera zoom keyframes (output time)
MAINZ=[tuple(k) for k in CFG["mainz"]]
BROLL=[tuple(b) for b in CFG["broll"]]
XF=0.5
main=reader(MC,M0,T+0.5)
enc=subprocess.Popen(["ffmpeg","-v","error","-y","-f","rawvideo","-pix_fmt","bgr24","-s",f"{OW}x{OH}","-r",str(FPS),"-i","-",
  "-c:v","libx264","-preset","veryfast","-crf","10","-pix_fmt","yuv420p",f"{S}/raw_{TAG}.mp4"],stdin=subprocess.PIPE)
active={}
for n in range(N):
    t=n/FPS
    img=rd(main); ts=M0+t; i=min(int(round(ts*FPS)),len(TR[MC][0])-1)
    out=frame_crop(img,TR[MC][0][i],TR[MC][1][i],keyz(t,MAINZ)).astype(np.float32)
    for bi,(a,b,clip,ss,z0,z1) in enumerate(BROLL):
        if a<=t<b:
            if bi not in active: active[bi]=[reader(clip,ss,(b-a)/2+0.3,slow=True),0]
            p,k=active[bi]; bimg=rd(p); active[bi][1]+=1
            if bimg is None: continue
            bs=ss+k/60; j=min(int(round(bs*FPS)),len(TR[clip][0])-1)
            bo=frame_crop(bimg,TR[clip][0][j],TR[clip][1][j],z0+(z1-z0)*(t-a)/(b-a)).astype(np.float32)
            al=ease(min((t-a)/XF,(b-t)/XF,1.0))
            out=out*(1-al)+bo*al
    enc.stdin.write(np.clip(out,0,255).astype(np.uint8).tobytes())
    pass
enc.stdin.close(); enc.wait()
G=("eq=contrast=1.10:saturation=1.04:gamma=0.97,curves=master='0/0 0.18/0.14 0.5/0.5 0.82/0.86 1/0.94',"
   "colorbalance=rs=-0.02:bs=0.03:rm=0.04:gm=-0.005:bm=-0.03:rh=0.03:gh=0.005:bh=-0.04,"
   "huesaturation=hue=-4:saturation=-0.3:colors=y+g,vignette=PI/5,unsharp=5:5:0.55:5:5:0,noise=alls=3:allf=t,"
   f"fade=t=in:st=0:d=0.8,fade=t=out:st={T-2}:d=2,format=yuv420p")
A=("highpass=f=80,afftdn=nr=8:nf=-40:tn=1,equalizer=f=280:t=q:w=1.2:g=-2.5,equalizer=f=3000:t=q:w=1:g=3,"
   "highshelf=f=8500:g=2,acompressor=threshold=-20dB:ratio=2.5:attack=15:release=200:makeup=2,"
   f"loudnorm=I=-14:TP=-1.5:LRA=9,afade=t=in:st=0:d=1.2,afade=t=out:st={T-2.5}:d=2.5,aresample=48000")
r=subprocess.run(["ffmpeg","-v","error","-y","-i",f"{S}/raw_{TAG}.mp4","-ss",f"{M0}","-t",f"{T}","-i",f"{SRC}/{MC}.mp4",
  "-map","0:v","-map","1:a","-vf",G,"-af",A,"-c:v","libx264","-preset","slow","-crf","18","-profile:v","high",
  "-color_range","tv","-colorspace","bt709","-color_primaries","bt709","-color_trc","bt709",
  "-c:a","aac","-b:a","192k","-movflags","+faststart","-t",f"{T}",OUT],capture_output=True,text=True)
print("final",r.returncode,r.stderr[-800:])
