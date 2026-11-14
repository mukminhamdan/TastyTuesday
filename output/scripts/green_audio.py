import json, subprocess, sys
S="/tmp/claude-0/-home-user-TastyTuesday/a54cbc4d-b0b0-5ec3-be30-75ed2c5c98da/scratchpad"; O="/home/user/TastyTuesday/output"
items=[("01","wa25",143.5,42.0,f"{O}/green_performance_9x16.mp4")]
for c in json.load(open(f"{S}/batch.json")): items.append((c["tag"][1:],c["clip"],c["m0"],c["T"],c["out"]))
for tag,clip,m0,T,out in items:
    aw=f"{S}/gaud/a{tag}.wav"; an=f"{S}/gaud/n{tag}.wav"; tmp=f"{S}/gaud/g{tag}.mp4"
    subprocess.run(["ffmpeg","-v","error","-y","-ss",str(m0),"-t",str(T),"-i",f"{S}/src2/{clip}.mp4","-vn","-c:a","pcm_s16le","-ar","48000",aw],check=True)
    subprocess.run(["python3","-I",f"{S}/scripts/denoise2.py",aw,an,"0.85","0.3"],check=True)
    A=("highpass=f=100,equalizer=f=300:t=q:w=1.0:g=-3,equalizer=f=3000:t=q:w=0.9:g=3.5,highshelf=f=8500:g=2,"
       "agate=threshold=0.015:ratio=2:range=0.35:attack=10:release=300,acompressor=threshold=-24dB:ratio=3:attack=10:release=180:makeup=3,"
       f"loudnorm=I=-12:TP=-1.0:LRA=7,afade=t=in:st=0:d=1.2,afade=t=out:st={T-2.5}:d=2.5,aresample=48000")
    r=subprocess.run(["ffmpeg","-v","error","-y","-i",out,"-i",an,"-map","0:v","-map","1:a","-c:v","copy","-af",A,"-c:a","aac","-b:a","192k",
                      "-movflags","+faststart","-t",str(T),tmp],capture_output=True,text=True)
    if r.returncode==0: subprocess.run(["cp",tmp,out]); print(tag,"OK",flush=True)
    else: print(tag,"FAIL",r.stderr[-300:],flush=True)
