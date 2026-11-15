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
G=("eq=contrast=1.10:saturation=1.04:gamma=0.97,curves=master='0/0 0.18/0.14 0.5/0.5 0.82/0.86 1/0.94',"
   "colorbalance=rs=-0.02:bs=0.03:rm=0.04:gm=-0.005:bm=-0.03:rh=0.03:gh=0.005:bh=-0.04,"
   "huesaturation=hue=-4:saturation=-0.3:colors=y+g,vignette=PI/5,unsharp=5:5:0.55:5:5:0,noise=alls=3:allf=t,"
   f"fade=t=in:st=0:d=0.8,fade=t=out:st={T-2.5}:d=2.5,format=yuv420p")
A=(f"afade=t=in:st=0:d=1.2,afade=t=out:st={T-3}:d=3,loudnorm=I=-14:TP=-1.5,aresample=48000")
r=subprocess.run(["ffmpeg","-v","error","-y","-i",f"{S}/raw_{TAG}.mp4","-ss",f"{M0}","-t",f"{T}","-i",f"{SRC}/{MC}.mp4",
  "-map","0:v","-map","1:a","-vf",G,"-af",A,"-c:v","libx264","-preset","slow","-crf","18","-profile:v","high",
  "-color_range","tv","-colorspace","bt709","-color_primaries","bt709","-color_trc","bt709",
  "-c:a","aac","-b:a","192k","-movflags","+faststart","-t",f"{T}",OUT],capture_output=True,text=True)
print("final",r.returncode,r.stderr[-800:])
