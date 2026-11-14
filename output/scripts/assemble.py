import subprocess, sys, glob
S=sys.argv[1]; out=sys.argv[2]
files=sorted(glob.glob(f"{S}/shots/*.mp4"))
durs=[5.0,6.0,5.0,5.5,5.5,4.5,4.5,5.0,5.8]; D=0.6; M0=208.5; T=42.0
inp=[]; 
for f in files: inp+=["-i",f]
inp+=["-ss",f"{M0}","-t",f"{T}","-i",f"{S}/src/v3.mp4"]
fc=[]; prev="[0:v]"; off=0
for i in range(1,len(files)):
    off+=durs[i-1]-D
    lab=f"[x{i}]"; fc.append(f"{prev}[{i}:v]xfade=transition=fade:duration={D}:offset={off:.3f}{lab}"); prev=lab
fc.append(f"{prev}fade=t=in:st=0:d=1.0,fade=t=out:st={T-1.8}:d=1.8,format=yuv420p[v]")
a=len(files)
fc.append(f"[{a}:a]highpass=f=90,afftdn=nr=10:nf=-38:tn=1,"
          "equalizer=f=250:t=q:w=1.2:g=-3,equalizer=f=3200:t=q:w=1.0:g=3.5,highshelf=f=9000:g=1.5,"
          "acompressor=threshold=-22dB:ratio=2.5:attack=15:release=200:makeup=2,"
          f"loudnorm=I=-14:TP=-1.5:LRA=9,afade=t=in:st=0:d=1.5,afade=t=out:st={T-3}:d=3,aresample=48000[a]")
cmd=["ffmpeg","-v","error","-y",*inp,"-filter_complex",";".join(fc),"-map","[v]","-map","[a]",
     "-c:v","libx264","-preset","slow","-crf","18","-profile:v","high","-pix_fmt","yuv420p",
     "-color_range","tv","-colorspace","bt709","-color_primaries","bt709","-color_trc","bt709",
     "-c:a","aac","-b:a","256k","-movflags","+faststart","-t",f"{T}",out]
r=subprocess.run(cmd,capture_output=True,text=True); print(r.returncode, r.stderr[-1500:])
