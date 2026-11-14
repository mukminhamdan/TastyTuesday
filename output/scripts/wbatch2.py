import json, subprocess, sys
S="/tmp/claude-0/-home-user-TastyTuesday/a54cbc4d-b0b0-5ec3-be30-75ed2c5c98da/scratchpad"; O="/home/user/TastyTuesday/output"
def TA(T,cs,gs): return [(0,1.2),(0.28*T,1.25),(0.31*T,1.55),(cs,1.6),(cs+5,1.65),(gs,1.7),(gs+4.5,1.45),(T-5,1.45),(T-1.2,1.2)]
def TB(T,cs,gs): return [(0,1.6),(4.5,1.6),(0.25*T,1.22),(cs,1.25),(cs+5,1.5),(gs,1.6),(gs+4.5,1.3),(T-4,1.35),(T-1,1.2)]
cfgs=[{"tag":"w01","clip":"v3","m0":208.5,"T":42.0,"track":True,
       "mainz":[(0,1.2),(4.4,1.2),(9.8,1.28),(10.6,1.6),(14.2,1.65),(36.2,1.45),(38.0,1.45),(40.8,1.2)],
       "broll":[(0,4.4,"d_v2a"),(13.7,19.6,"s_v4a"),(19.1,24.6,"wave_z"),(24.0,28.5,"c_v2a"),(27.9,32.4,"g_v2a"),(31.8,36.8,"g_v5z")],
       "out":f"{O}/wedding_performance_9x16.mp4"}]
V=[("w02","v3",114.0,37.0,"d_v2b","g_v2cz",TA,True),
   ("w03","v3",151.0,39.5,"d_v2a","g_v5z",TB,True),
   ("w04","v4",0.25,35.5,"d_v2b","g_v2a",TB,True),
   ("w05","v4",35.75,31.75,"d_v2a","g_v5z",TA,True),
   ("w06","v5",0.0,30.7,"d_v2b",None,None,True)]
for tag,clip,m0,T,d,g,tp,trk in V:
    cs=round(0.36*T,2); gs=round(0.68*T,2)
    if gs+4.5>T-4: gs=round(T-8.5,2)
    br=[(0,4.0,d),(cs-0.5,cs+5,"wave_z")]+([(gs-0.5,gs+4.5,g)] if g else [])
    mz=tp(T,cs,gs) if tp else [(0,1.4),(cs-0.5,1.45),(cs+5,1.5),(T-3,1.5),(T-0.5,1.3)]
    cfgs.append({"tag":tag,"clip":clip,"m0":m0,"T":T,"track":trk,"mainz":mz,"broll":br,"out":f"{O}/wedding_performance_{tag[1:]}_9x16.mp4"})
json.dump(cfgs,open(f"{S}/wbatch2.json","w"),indent=1)
only=sys.argv[1].split(",") if len(sys.argv)>1 else None
for c in cfgs:
    if only and c["tag"] not in only: continue
    out=c["out"]; c["out"]=f"{S}/final_{c['tag']}.mp4"
    r=subprocess.run(["python3","-I",f"{S}/scripts/wed.py",S,json.dumps(c)],capture_output=True,text=True)
    ok=r.returncode==0 and "final "+c["tag"]+" 0" in r.stdout
    if ok: subprocess.run(["cp",c["out"],out])
    print(c["tag"],"OK" if ok else "FAIL",(r.stdout+r.stderr)[-300:].replace("\n"," "),flush=True)
