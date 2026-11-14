import subprocess, sys, concurrent.futures as cf
S=sys.argv[1]; SRC=f"{S}/src"; OUT=f"{S}/broll"
FIT="scale=1080:1920:flags=lanczos:out_range=tv"; ROT="transpose=2,"
# name: (clip, ss, out_dur, speed, vf)
B={
 "c_v1a":("v1",4.0,5.0,0.5,"crop=1215:2160:1720:0,"+FIT),
 "c_v1b":("v1",8.0,5.0,0.5,"crop=1215:2160:1720:0,"+FIT),
 "c_v1c":("v1",13.5,5.0,0.5,"crop=1215:2160:1720:0,"+FIT),
 "c_v2b":("v2",131.0,5.0,1.0,ROT+"crop=1215:2160:1774:0,"+FIT),
 "c_v5":("v5",6.0,5.0,0.4,FIT),
 "g_v2a":("v2",99.0,4.5,1.0,ROT+"crop=1215:2160:1312:0,"+FIT),
 "g_v2b":("v2",118.0,4.5,1.0,ROT+"crop=1215:2160:1121:0,"+FIT),
 "g_v2c":("v2",70.0,4.5,1.0,ROT+"crop=1215:2160:545:0,"+FIT),
 "g_v5":("v5",0.0,4.5,0.4,FIT),
 "d_v2a":("v2",58.0,4.0,1.0,ROT+"crop=1215:2160:545:0,"+FIT),
 "d_v2b":("v2",40.0,4.0,1.0,ROT+"crop=1215:2160:545:0,"+FIT),
 "d_v3":("v3",252.5,4.0,1.0,FIT),
}
def run(k):
    clip,ss,od,sp,vf=B[k]; sd=od*sp
    chain=(f"setpts=(PTS-STARTPTS)/{sp},fps=30,{vf},format=yuv420p" if sp!=1 else f"fps=30,{vf},format=yuv420p")
    r=subprocess.run(["ffmpeg","-v","error","-y","-ss",str(ss),"-t",f"{sd+0.2}","-i",f"{SRC}/{clip}.mp4","-an","-vf",chain,"-t",str(od),
       "-c:v","libx264","-preset","veryfast","-crf","12",f"{OUT}/{k}.mp4"],capture_output=True,text=True)
    return k,r.returncode,r.stderr[-200:]
with cf.ThreadPoolExecutor(2) as ex:
    for x in ex.map(run,B): print(x,flush=True)
