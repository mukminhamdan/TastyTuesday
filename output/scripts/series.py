# Multi-shot virtual-camera renderer for one part of the wedding series.
import numpy as np, cv2, subprocess, json, sys
from scipy.ndimage import gaussian_filter1d, median_filter
S=sys.argv[1]; C=json.loads(sys.argv[2]); SRC=f"{S}/src"
OW,OH=1080,1920; FPS=30; XS=0.35; XB=0.5
MC,M0,T=C["clip"],C["m0"],C["T"]; N=int(round(T*FPS))
info=json.loads(subprocess.run(["ffprobe","-v","error","-select_streams","v:0","-show_entries","stream=width,height:stream_side_data=rotation","-of","json",f"{SRC}/{MC}.mp4"],capture_output=True,text=True).stdout)["streams"][0]
w0,h0=info["width"],info["height"]
if any(abs(s.get("rotation",0))==90 for s in info.get("side_data_list",[])): w0,h0=h0,w0
if w0>h0: W,H=3840,2160
else: W,H=1620,2880
def ease(a): a=np.clip(a,0,1); return a*a*(3-2*a)
CX=TOP=None
try:
    r=json.load(open(f"{S}/track_{MC}.json"))
    def clean(a):
        a=np.array([np.nan if v is None else v for v in a],float); i=np.arange(len(a)); ok=~np.isnan(a)
        return gaussian_filter1d(median_filter(np.interp(i,i[ok],a[ok]),C.get("trackmed",9)),C.get("tracksig",14))
    CX=clean([v[0] for v in r])*W; TOP=clean([v[1] for v in r])*H
except FileNotFoundError: pass
def zval(z,t,t0,t1):
    if isinstance(z,list): return z[0]+(z[1]-z[0])*ease((t-t0)/max(t1-t0,1e-3))
    return z
def rect(shot,t):
    t0,t1,kind=shot[0],shot[1],shot[2]; a=shot[3]; z=zval(a["z"],t,t0,t1)
    h=H/z; w=h*9/16
    if kind=="track" and CX is not None:
        kf=(M0+t)*10; ii=np.arange(len(CX)); cx=float(np.interp(kf,ii,CX)); top=float(np.interp(kf,ii,TOP))
        if "clamp" in C: cx=np.clip(cx,C["clamp"][0]*W,C["clamp"][1]*W); top=np.clip(top,C["clamp"][2]*H,C["clamp"][3]*H)
        cx+=a.get("dx",0)*W; y0=top-a.get("frac",0.34)*h; x0=cx-w/2
    else:
        cx=a["cx"]*W; cy=a["cy"]*H
        if "cx1" in a: cx=(a["cx"]+(a["cx1"]-a["cx"])*ease((t-t0)/(t1-t0)))*W
        x0=cx-w/2; y0=cy-h/2
    for a0,a1,xm in C.get("xmin",[]):
        if a0-0.5<=M0+t<=a1+0.5: x0=max(x0,xm*W)
    return np.clip(x0,0,W-w),np.clip(y0,0,H-h),w,h
def crop(img,R):
    x0,y0,w,h=R; M=np.array([[OW/w,0,-x0*OW/w],[0,OH/h,-y0*OH/h]],np.float32)
    return cv2.warpAffine(img,M,(OW,OH),flags=cv2.INTER_AREA if w>OW*1.3 else cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REFLECT)
trf=f"{S}/trf_{C['tag']}.trf"
subprocess.run(["ffmpeg","-v","error","-y","-ss",str(M0),"-t",str(T+0.5),"-i",f"{SRC}/{MC}.mp4","-vf",f"fps=30,scale={W}:{H},vidstabdetect=shakiness=7:accuracy=15:stepsize=6:result={trf}","-f","null","-"],check=True)
main=subprocess.Popen(["ffmpeg","-v","error","-ss",str(M0),"-t",str(T+0.5),"-i",f"{SRC}/{MC}.mp4","-vf",f"fps=30,scale={W}:{H}:flags=lanczos,format=yuv420p,vidstabtransform=input={trf}:smoothing={C.get('smooth',40)}:optzoom=1:interpol=bicubic","-f","rawvideo","-pix_fmt","bgr24","-"],stdout=subprocess.PIPE)
raw=f"{S}/sraw_{C['tag']}.mp4"
enc=subprocess.Popen(["ffmpeg","-v","error","-y","-f","rawvideo","-pix_fmt","bgr24","-s",f"{OW}x{OH}","-r","30","-i","-","-c:v","libx264","-preset","veryfast","-crf","10","-pix_fmt","yuv420p",raw],stdin=subprocess.PIPE)
SH=C["shots"]; act={}; img=None
for n in range(N):
    t=n/FPS; b=main.stdout.read(W*H*3)
    if len(b)==W*H*3: img=np.frombuffer(b,np.uint8).reshape(H,W,3)
    # main: find shot; crossfade XS around boundaries
    i=max(j for j,s in enumerate(SH) if s[0]<=t+1e-6) if t>=SH[0][0] else 0
    out=crop(img,rect(SH[i],t)).astype(np.float32)
    if i+1<len(SH) and t>SH[i+1][0]-XS/2:
        al=ease((t-(SH[i+1][0]-XS/2))/XS); out=out*(1-al)+crop(img,rect(SH[i+1],t)).astype(np.float32)*al
    for bi,(a,e,f) in enumerate(C["broll"]):
        if a<=t<e:
            if bi not in act: act[bi]=subprocess.Popen(["ffmpeg","-v","error","-i",f"{S}/broll/{f}.mp4","-f","rawvideo","-pix_fmt","bgr24","-"],stdout=subprocess.PIPE)
            bb=act[bi].stdout.read(OW*OH*3)
            if len(bb)<OW*OH*3: continue
            bo=np.frombuffer(bb,np.uint8).reshape(OH,OW,3).astype(np.float32)
            al=ease(min((t-a)/XB if a>0 else 1.0,(e-t)/XB if e<T-0.01 else 1.0,1.0)); out=out*(1-al)+bo*al
    enc.stdin.write(np.clip(out,0,255).astype(np.uint8).tobytes())
enc.stdin.close(); enc.wait(); main.kill()
G=("eq=contrast=1.04:saturation=0.90:gamma=0.98,colorbalance=rs=0.02:bs=-0.03:rm=0.03:gm=0.005:bm=-0.025:rh=0.025:bh=-0.035,"
   "curves=all='0/0.035 0.25/0.235 0.5/0.5 0.75/0.765 1/0.965',vignette=angle=PI/6:mode=forward,"
   f"fade=t=in:st=0:d=0.8,fade=t=out:st={T-1.5}:d=1.5,format=yuv420p")
aw=f"{S}/sa_{C['tag']}.wav"; an=f"{S}/san_{C['tag']}.wav"
subprocess.run(["ffmpeg","-v","error","-y","-ss",str(M0),"-t",str(T),"-i",f"{SRC}/{MC}.mp4","-vn","-c:a","pcm_s16le","-ar","48000",aw],check=True)
subprocess.run(["python3","-I",f"{S}/scripts/denoise2.py",aw,an,str(C.get("nr",0.85)),"0.3"],check=True)
A=("highpass=f=100,equalizer=f=300:t=q:w=1.0:g=-3.5,equalizer=f=3000:t=q:w=0.9:g=4,highshelf=f=8500:g=2,"
   "agate=threshold=0.015:ratio=2:range=0.35:attack=10:release=300,acompressor=threshold=-24dB:ratio=3:attack=10:release=180:makeup=3,"
   f"loudnorm=I=-12:TP=-1.0:LRA=7,afade=t=in:st=0:d=1.0,afade=t=out:st={T-2}:d=2,aresample=48000")
r=subprocess.run(["ffmpeg","-v","error","-y","-i",raw,"-i",an,"-map","0:v","-map","1:a","-vf",G,"-af",A,
  "-c:v","libx264","-preset","slow","-crf","18","-profile:v","high","-color_range","tv","-colorspace","bt709","-color_primaries","bt709","-color_trc","bt709",
  "-c:a","aac","-b:a","256k","-movflags","+faststart","-t",str(T),C["out"]],capture_output=True,text=True)
print("final",C["tag"],r.returncode,r.stderr[-400:],flush=True)
