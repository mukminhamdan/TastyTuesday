import subprocess, sys, os, concurrent.futures as cf
S=sys.argv[1]; SRC=f"{S}/src"; OUT=f"{S}/shots"
M0=208.5; D=0.6
G=("eq=contrast=1.04:saturation=0.90:gamma=0.98,"
   "colorbalance=rs=0.02:bs=-0.03:rm=0.03:gm=0.005:bm=-0.025:rh=0.025:bh=-0.035,"
   "curves=all='0/0.035 0.25/0.235 0.5/0.5 0.75/0.765 1/0.965',"
   "vignette=angle=PI/6:mode=forward")
FIT="scale=1080:1920:flags=lanczos:out_range=tv"
ROT="transpose=2,"
# name, src, srcstart, out_dur, speed, video filter (before FIT), use zoompan
durs=[5.0,6.0,5.0,5.5,5.5,4.5,4.5,5.0,5.8]
offs=[0]; 
for d in durs[:-1]: offs.append(offs[-1]+d-D)
def zp(z0,z1,n): return f"scale=w='trunc(2160*({z0}+({z1}-{z0})*min(n/{n},1))/2)*2':h=-2:eval=frame:flags=bicubic,crop=2160:3840:(iw-2160)/2:(ih-3840)/2,"+FIT
shots=[
 ("s1_decor","v2",58.0,1.0, ROT+"crop=1215:2160:545:0,"+FIT),
 ("s2_start","v3",M0+offs[1],1.0, zp(1.0,1.06,int(durs[1]*30))),
 ("s3a_close","v3",M0+offs[2],1.0, "crop=1500:2667:330:700,"+FIT),
 ("s3b_slow","v4",36.0,0.4, "crop=1080:1920:487:1068,"+FIT),
 ("s4a_couple","v1",13.5,0.5, "crop=1215:2160:1720:0,"+FIT),
 ("s4b_couple","v2",146.0,1.0, ROT+"crop=1215:2160:1581:0,"+FIT),
 ("s5a_guests","v2",99.0,1.0, ROT+"crop=1215:2160:1312:0,"+FIT),
 ("s5b_guests","v5",0.0,0.4, FIT),
 ("s6_wide","v3",M0+offs[8],1.0, zp(1.12,1.0,int(durs[8]*30))),
]
def run(i):
    name,f,ss,sp,vf=shots[i]; od=durs[i]; sd=od*sp
    chain=f"{vf},setpts=(PTS-STARTPTS)/{sp},fps=30,{G},format=yuv420p" if sp!=1.0 else f"{vf},fps=30,{G},format=yuv420p"
    if sp!=1.0: chain=f"setpts=(PTS-STARTPTS)/{sp},fps=30,{vf},{G},format=yuv420p"
    cmd=["ffmpeg","-v","error","-y","-ss",f"{ss:.3f}","-t",f"{sd+0.1:.3f}","-i",f"{SRC}/{f}.mp4","-an","-vf",chain,
         "-t",f"{od:.3f}","-c:v","libx264","-preset","medium","-crf","14","-color_range","tv","-colorspace","bt709","-color_primaries","bt709","-color_trc","bt709",f"{OUT}/{i}_{name}.mp4"]
    r=subprocess.run(cmd,capture_output=True,text=True); return name, r.returncode, r.stderr[-400:]
with cf.ThreadPoolExecutor(1) as ex:
    for res in ex.map(run, range(len(shots)) if len(sys.argv)<3 else map(int,sys.argv[2].split(','))): print(res, flush=True)
print("offsets", [round(o,2) for o in offs])
