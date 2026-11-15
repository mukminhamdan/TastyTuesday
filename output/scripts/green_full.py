# Full-song green-outfit edits: tracked virtual camera with shot rhythm, push-ins/pull-outs, slow-motion highlights.
import json, subprocess, concurrent.futures as cf
S="/tmp/claude-0/-home-user-TastyTuesday/a54cbc4d-b0b0-5ec3-be30-75ed2c5c98da/scratchpad"
PAL=[(8,1.0,1.08),(7,1.42,1.5),(8,1.7,1.75),(6,1.28,1.18),(8,1.55,1.65),(7,1.05,1.0),(9,1.75,1.68),(7,1.35,1.45)]
def zoomplan(T,start=0):
    kf=[(0,PAL[start][1])]; t=0; k=start
    while t<T-8:
        d,zs,ze=PAL[k%len(PAL)]; t0=t; t1=min(t+d,T-7)
        kf.append((t0+1.2 if t0>0 else 0.01,zs)); kf.append((t1,ze)); t=t1; k+=1
    kf.append((T-6,1.4)); kf.append((T-1,1.0))
    out=[]; 
    for a,z in kf:
        if out and a<=out[-1][0]+0.05: continue
        out.append((round(a,2),z))
    return out
def broll_at(times,picks,dur=5.5):
    return [(t,t+dur,c,ss-1.25,z0,z1) for t,(c,ss,z0,z1) in zip(times,picks)]
cfgs=[]
# Song A (WA0024)
TA=256.5
bA=broll_at([30,70,111,151,192,232],[("wa24",208.5,1.35,1.45),("wa25",9.5,1.3,1.4),("wa24",158.5,1.25,1.35),("wa25",117.5,1.4,1.5),("wa24",63.5,1.3,1.4),("wa25",139.5,1.2,1.3)])
cfgs.append({"tag":"gfA","out":f"{S}/full/BajuHijau_A_Full.mp4","clip":"wa24","m0":0.3,"T":TA,"mainz":zoomplan(TA,0),"broll":bA})
# Song B (WA0025): cover the photographer (82-115) with a slow-motion montage
TB=186.0
mont=broll_at([81.0+4.85*k for k in range(7)],[("wa25",24.0,1.3,1.4),("wa24",103.5,1.4,1.5),("wa25",56.5,1.25,1.35),("wa24",234.5,1.35,1.45),("wa25",155.5,1.3,1.4),("wa24",199.5,1.25,1.35),("wa24",148.5,1.3,1.4)],5.5)
bB=broll_at([35,60],[("wa24",180.5,1.3,1.4),("wa24",12.5,1.35,1.45)])+mont+broll_at([150,165],[("wa24",38.0,1.3,1.4),("wa24",126.0,1.3,1.4)])
cfgs.append({"tag":"gfB","out":f"{S}/full/BajuHijau_B_Full.mp4","clip":"wa25","m0":0.8,"T":TB,"mainz":zoomplan(TB,2),"broll":bB})
for c in cfgs: print(c["tag"],c["T"],len(c["mainz"]),"keys",len(c["broll"]),"broll")
def run(c):
    r=subprocess.run(["python3","-I",f"{S}/scripts/green_full_r.py",S,json.dumps(c)],capture_output=True,text=True)
    return c["tag"],[l for l in (r.stdout+r.stderr).splitlines() if "final" in l or "Error" in l or "Trace" in l][-2:]
import sys
if "--run" in sys.argv:
    with cf.ThreadPoolExecutor(2) as ex:
        for x in ex.map(run,cfgs): print(*x,flush=True)
if "--b2" in sys.argv:
    c=dict(cfgs[1]); c["tag"]="gfB2"; c["out"]=f"{S}/full/BajuHijau_B_Full_v2.mp4"
    print(*run(c),flush=True)
