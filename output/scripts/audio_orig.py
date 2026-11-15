# Replace each edit's audio with the untouched original recording (level-matched only), video stream copied.
import json, subprocess, shutil, re
S="/tmp/claude-0/-home-user-TastyTuesday/a54cbc4d-b0b0-5ec3-be30-75ed2c5c98da/scratchpad"; O="/home/user/TastyTuesday/output"
items=[]
for p in json.load(open(f"{S}/parts.json")): items.append((f"{S}/src/{p['clip']}.mp4",p["m0"],p["T"],p["final"]))
items.append((f"{S}/src2/wa25.mp4",143.5,42.0,f"{O}/green_performance_9x16.mp4"))
for c in json.load(open(f"{S}/batch.json")): items.append((f"{S}/src2/{c['clip']}.mp4",c["m0"],c["T"],c["out"]))
for src,m0,T,out in items:
    tmp=f"{S}/rawaud/"+out.split("/")[-1]
    A=f"afade=t=in:st=0:d=1.0,afade=t=out:st={T-2}:d=2,loudnorm=I=-14:TP=-1.5,aresample=48000"
    r=subprocess.run(["ffmpeg","-v","error","-y","-i",out,"-ss",str(m0),"-t",str(T),"-i",src,"-map","0:v","-map","1:a","-c:v","copy","-af",A,
                      "-c:a","aac","-b:a","256k","-movflags","+faststart","-t",str(T),tmp],capture_output=True,text=True)
    if r.returncode: print("FAIL",out,r.stderr[-200:]); continue
    e=subprocess.run(["ffmpeg","-nostats","-i",tmp,"-af","ebur128","-f","null","-"],capture_output=True,text=True).stderr
    shutil.copy(tmp,out); print(out.split("/")[-1], re.findall(r"I:\s+(-?[\d.]+) LUFS",e)[-1], flush=True)
