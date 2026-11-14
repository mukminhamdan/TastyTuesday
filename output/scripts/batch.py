import json, subprocess, sys, concurrent.futures as cf
S="/tmp/claude-0/-home-user-TastyTuesday/a54cbc4d-b0b0-5ec3-be30-75ed2c5c98da/scratchpad"
OUTD="/home/user/TastyTuesday/output"
segs=[("wa24",0.5,35.5),("wa24",35.5,76.0),("wa24",76.0,119.5),("wa24",119.5,163.2),("wa24",163.2,205.5),("wa24",205.5,245.8),
      ("wa25",0.8,38.8),("wa25",38.8,74.0),("wa25",112.5,143.5)]
pool={"wa25":[9.5,117.5,56.5,24.0,79.0,123.5,32.0,128.5,155.5,175.5,19.0,139.5],
      "wa24":[158.5,208.5,234.5,63.5,103.5,199.5]}
def tmpl(k,T,b1,b2):
    b1a,b1b=b1; b2a,b2b=b2
    if k==0: return [(0,1.0),(0.2*T,1.12),(0.24*T,1.45),(b1a,1.5),(b1b,1.7),(b2a,1.78),(b2b,1.55),(b2b+2,1.55),(T-2,1.0)]
    if k==1: return [(0,1.75),(0.18*T,1.75),(0.28*T,1.05),(b1a,1.1),(b1b,1.45),(b2a,1.55),(b2b,1.7),(T-3,1.75),(T-0.5,1.3)]
    return [(0,1.35),(0.22*T,1.5),(0.27*T,1.75),(b1a,1.8),(b1b,1.0),(b1b+3,1.1),(b2a,1.5),(b2b,1.6),(T-2.5,1.0)]
cfgs=[]
for n,(clip,a,b) in enumerate(segs):
    T=round(b-a,2); other="wa25" if clip=="wa24" else "wa24"
    p1,p2=pool[other].pop(0),pool[other].pop(0)
    b1=(round(0.36*T,2),round(0.36*T+5,2)); b2=(round(0.70*T,2),round(0.70*T+4.5,2))
    if b2[1]>T-3: b2=(round(T-7.5,2),round(T-3,2))
    k=n%3
    zb=[(1.25,1.33),(1.3,1.38)] if k!=2 else [(1.35,1.45),(1.2,1.3)]
    cfgs.append({"tag":f"g{n+2:02d}","out":f"{OUTD}/green_performance_{n+2:02d}_9x16.mp4","clip":clip,"m0":a,"T":T,
      "mainz":tmpl(k,T,b1,b2),
      "broll":[(b1[0]-0.5,b1[1],other,p1-1.25,*zb[0]),(b2[0]-0.5,b2[1],other,p2-1.25,*zb[1])]})
json.dump(cfgs,open(f"{S}/batch.json","w"),indent=1)
def run(c):
    r=subprocess.run(["python3","-I",f"{S}/scripts/green_multi.py",S,json.dumps(c)],capture_output=True,text=True)
    return c["tag"], [l for l in r.stdout.splitlines() if l.startswith("final")]
with cf.ThreadPoolExecutor(2) as ex:
    for res in ex.map(run,cfgs): print(res,flush=True)
