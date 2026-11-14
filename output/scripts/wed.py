import numpy as np, cv2, subprocess, json, sys
from scipy.ndimage import gaussian_filter1d, median_filter
S=sys.argv[1]; C=json.loads(sys.argv[2]); SRC=f"{S}/src"
W,H=1620,2880; OW,OH=1080,1920; FPS=30
MC,M0,T=C["clip"],C["m0"],C["T"]; N=int(round(T*FPS))
def ease(a): a=np.clip(a,0,1); return a*a*(3-2*a)
def keyz(t,kf):
    if t<=kf[0][0]: return kf[0][1]
    for (t0,z0),(t1,z1) in zip(kf,kf[1:]):
        if t<=t1: return z0+(z1-z0)*ease((t-t0)/(t1-t0))
    return kf[-1][1]
if C.get("track"):
    r=json.load(open(f"{S}/track_{MC}.json"))
    def clean(a):
        a=np.array([np.nan if v is None else v for v in a],float); i=np.arange(len(a)); ok=~np.isnan(a)
        a=np.interp(i,i[ok],a[ok]); return gaussian_filter1d(median_filter(a,9),6)
    CX=clean([v[0] for v in r])*W; TOP=clean([v[1] for v in r])*H
    def pos(ts): k=min(int(ts*10),len(CX)-1); return CX[k],TOP[k]
else:
    def pos(ts): return W*0.5, H*C.get("fixtop",0.36)
def crop(img,cx,top,z):
    w,h=W/z,H/z; x0=np.clip(cx-w/2,0,W-w); y0=np.clip(top-0.44*h,0,H-h)
    M=np.array([[OW/w,0,-x0*OW/w],[0,OH/h,-y0*OH/h]],np.float32)
    return cv2.warpAffine(img,M,(OW,OH),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REFLECT)
main=subprocess.Popen(["ffmpeg","-v","error","-ss",str(M0),"-t",str(T+0.5),"-i",f"{SRC}/{MC}.mp4","-vf",f"fps=30,scale={W}:{H}:flags=lanczos","-f","rawvideo","-pix_fmt","bgr24","-"],stdout=subprocess.PIPE)
raw=f"{S}/wraw_{C['tag']}.mp4"
enc=subprocess.Popen(["ffmpeg","-v","error","-y","-f","rawvideo","-pix_fmt","bgr24","-s",f"{OW}x{OH}","-r","30","-i","-","-c:v","libx264","-preset","veryfast","-crf","10","-pix_fmt","yuv420p",raw],stdin=subprocess.PIPE)
XF=0.5; act={}
for n in range(N):
    t=n/FPS; b=main.stdout.read(W*H*3)
    img=np.frombuffer(b,np.uint8).reshape(H,W,3) if len(b)==W*H*3 else img
    cx,top=pos(M0+t); out=crop(img,cx,top,keyz(t,C["mainz"])).astype(np.float32)
    for bi,(a,e,f) in enumerate(C["broll"]):
        if a<=t<e:
            if bi not in act: act[bi]=subprocess.Popen(["ffmpeg","-v","error","-i",f"{S}/broll/{f}.mp4","-f","rawvideo","-pix_fmt","bgr24","-"],stdout=subprocess.PIPE)
            bb=act[bi].stdout.read(OW*OH*3)
            if len(bb)<OW*OH*3: continue
            bo=np.frombuffer(bb,np.uint8).reshape(OH,OW,3).astype(np.float32)
            al=ease(min((t-a)/XF if a>0 else 1.0,(e-t)/XF,1.0)); out=out*(1-al)+bo*al
    enc.stdin.write(np.clip(out,0,255).astype(np.uint8).tobytes())
enc.stdin.close(); enc.wait(); main.kill()
G=("eq=contrast=1.04:saturation=0.90:gamma=0.98,colorbalance=rs=0.02:bs=-0.03:rm=0.03:gm=0.005:bm=-0.025:rh=0.025:bh=-0.035,"
   "curves=all='0/0.035 0.25/0.235 0.5/0.5 0.75/0.765 1/0.965',vignette=angle=PI/6:mode=forward,"
   f"fade=t=in:st=0:d=1.0,fade=t=out:st={T-1.8}:d=1.8,format=yuv420p")
A=("highpass=f=90,equalizer=f=250:t=q:w=1.2:g=-3,equalizer=f=3200:t=q:w=1.0:g=3.5,highshelf=f=9000:g=1.5,"
   "acompressor=threshold=-22dB:ratio=2.5:attack=15:release=200:makeup=2,"
   f"loudnorm=I=-14:TP=-1.5:LRA=9,afade=t=in:st=0:d=1.5,afade=t=out:st={T-3}:d=3,aresample=48000")
aw=f"{S}/wa_{C['tag']}.wav"; an=f"{S}/wan_{C['tag']}.wav"
subprocess.run(["ffmpeg","-v","error","-y","-ss",str(M0),"-t",str(T),"-i",f"{SRC}/{MC}.mp4","-vn","-c:a","pcm_s16le","-ar","48000",aw],check=True)
subprocess.run(["python3","-I",f"{S}/scripts/denoise.py",aw,an,str(C.get("nr",0.7))],check=True)
r=subprocess.run(["ffmpeg","-v","error","-y","-i",raw,"-i",an,"-map","0:v","-map","1:a","-vf",G,"-af",A,
  "-c:v","libx264","-preset","slow","-crf","18","-profile:v","high","-color_range","tv","-colorspace","bt709","-color_primaries","bt709","-color_trc","bt709",
  "-c:a","aac","-b:a","256k","-movflags","+faststart","-t",str(T),C["out"]],capture_output=True,text=True)
print("final",C["tag"],r.returncode,r.stderr[-500:],flush=True)
