# Second-pass loudness: measure integrated loudness, apply exact gain to -12 LUFS with a true-peak limiter; video copied.
import subprocess, re, sys, glob, shutil
S=sys.argv[1]
for f in sorted(glob.glob("/home/user/TastyTuesday/output/*_9x16.mp4")):
    def I(p):
        e=subprocess.run(["ffmpeg","-nostats","-i",p,"-af","ebur128","-f","null","-"],capture_output=True,text=True).stderr
        return float(re.findall(r"I:\s+(-?[\d.]+) LUFS",e)[-1])
    i0=I(f); g=-12.0-i0
    if abs(g)<0.4: print(f.split('/')[-1],"ok",i0); continue
    tmp=f"{S}/ln/"+f.split('/')[-1]
    subprocess.run(["ffmpeg","-v","error","-y","-i",f,"-map","0","-c:v","copy","-af",f"volume={g:.2f}dB,alimiter=limit=0.89:attack=5:release=80:level=false","-c:a","aac","-b:a","256k","-movflags","+faststart",tmp],check=True)
    i1=I(tmp); shutil.copy(tmp,f); print(f.split('/')[-1],f"{i0} -> {i1}")
