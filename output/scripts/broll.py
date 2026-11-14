import subprocess, sys, concurrent.futures as cf
S=sys.argv[1]; SRC=f"{S}/src"; OUT=f"{S}/broll"
FIT="scale=1080:1920:flags=lanczos:out_range=tv"; ROT="transpose=2,"
# name: (clip, ss, out_dur, speed, vf)
B={
 "wave_z":("v1",14.2,5.0,0.5,"crop=900:1600:1960:492,"+FIT),
 "c_v1az":("v1",4.0,5.0,0.5,"crop=900:1600:1960:492,"+FIT),
 "c_v2a":("v2",146.0,4.5,1.0,ROT+"crop=1000:1778:1689:374,"+FIT),
 "c_v2bz":("v2",131.0,4.5,1.0,ROT+"crop=1000:1778:1880:374,"+FIT),
 "c_v5z":("v5",6.0,5.0,0.4,"crop=1350:2400:362:427,"+FIT),
 "g_v2cz":("v2",70.0,4.5,1.0,ROT+"crop=900:1600:1278:560,"+FIT),
 "g_v5z":("v5",0.0,5.0,0.4,"crop=1440:2560:468:1000,"+FIT),
 "s_v4a":("v4",36.0,5.4,0.4,"crop=1080:1920:487:1068,"+FIT),
}
def run(k):
    clip,ss,od,sp,vf=B[k]; sd=od*sp
    chain=(f"setpts=(PTS-STARTPTS)/{sp},fps=30,{vf},format=yuv420p" if sp!=1 else f"fps=30,{vf},format=yuv420p")
    r=subprocess.run(["ffmpeg","-v","error","-y","-ss",str(ss),"-t",f"{sd+0.2}","-i",f"{SRC}/{clip}.mp4","-an","-vf",chain,"-t",str(od),
       "-c:v","libx264","-preset","veryfast","-crf","12",f"{OUT}/{k}.mp4"],capture_output=True,text=True)
    return k,r.returncode,r.stderr[-200:]
with cf.ThreadPoolExecutor(2) as ex:
    for x in ex.map(run,[k for k in B if len(sys.argv)<3 or k in sys.argv[2].split(',')]): print(x,flush=True)
