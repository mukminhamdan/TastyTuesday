# Build the full-length wedding performance: merge the series parts into 4 continuous segments, render, join with soft dips.
import json, subprocess, os, concurrent.futures as cf
S="/tmp/claude-0/-home-user-TastyTuesday/a54cbc4d-b0b0-5ec3-be30-75ed2c5c98da/scratchpad"
P=json.load(open(f"{S}/parts.json"))
groups=[["p01"],["p02","p03"],["p04","p05","p06","p07","p08","p09"],["p10","p11","p12","p13"]]
segs=[]
for gi,g in enumerate(groups):
    ps=[p for p in P if p["tag"] in g]; m0=ps[0]["m0"]; shots=[]; broll=[]
    for p in ps:
        sh=p["m0"]-m0
        for s in p["shots"]: shots.append([round(s[0]+sh,3),round(s[1]+sh,3),s[2],s[3]])
        for b in p["broll"]: broll.append([round(b[0]+sh,3),round(b[1]+sh,3),b[2]])
    T=round(ps[-1]["m0"]+ps[-1]["T"]-m0,2)
    c={k:v for k,v in ps[0].items() if k in ("clip","xmin","clamp","trackmed")}
    c.update({"tag":f"full{gi+1}","m0":m0,"T":T,"shots":shots,"broll":broll,"out":f"{S}/full/seg{gi+1}.mp4"})
    segs.append(c); print(c["tag"],c["clip"],m0,T,len(shots),"shots",len(broll),"broll",flush=True)
def run(c):
    r=subprocess.run(["python3","-I",f"{S}/scripts/series.py",S,json.dumps(c)],capture_output=True,text=True)
    raw=f"{S}/sraw_{c['tag']}.mp4"
    if os.path.exists(raw): os.remove(raw)
    return c["tag"],("OK" if f"final {c['tag']} 0" in r.stdout else "FAIL "+(r.stdout+r.stderr)[-300:])
with cf.ThreadPoolExecutor(2) as ex:
    for x in ex.map(run,segs[::-1]): print(*x,flush=True)
