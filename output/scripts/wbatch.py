import json, subprocess
S="/tmp/claude-0/-home-user-TastyTuesday/a54cbc4d-b0b0-5ec3-be30-75ed2c5c98da/scratchpad"; O="/home/user/TastyTuesday/output"
def TA(T,cs,gs): return [(0,1.0),(0.28*T,1.08),(0.31*T,1.5),(cs,1.55),(cs+5,1.65),(gs,1.7),(gs+4.5,1.4),(T-5,1.4),(T-1.2,1.0)]
def TB(T,cs,gs): return [(0,1.6),(4.5,1.6),(0.25*T,1.05),(cs,1.15),(cs+5,1.5),(gs,1.6),(gs+4.5,1.25),(T-4,1.3),(T-1,1.0)]
V=[("w02","v3",114.0,37.0,"d_v2b","c_v1a","g_v2c",TA,True),
   ("w03","v3",151.0,39.5,"d_v3","c_v2b","g_v5",TB,True),
   ("w04","v4",0.25,35.5,"d_v2a","c_v1b","g_v2a",TB,True),
   ("w05","v4",35.75,31.75,"d_v3","c_v5","g_v2c",TA,True),
   ("w06","v5",0.0,30.7,"d_v2a","c_v1a",None,None,False)]
cfgs=[]
for tag,clip,m0,T,d,c,g,tp,trk in V:
    cs=round(0.36*T,2); gs=round(0.68*T,2)
    if gs+4.5>T-4: gs=round(T-8.5,2)
    br=[(0,4.0,d),(cs-0.5,cs+5,c)]+([(gs-0.5,gs+4.5,g)] if g else [])
    mz=tp(T,cs,gs) if tp else [(0,1.0),(T*0.5,1.12),(T-1.5,1.0)]
    cfgs.append({"tag":tag,"clip":clip,"m0":m0,"T":T,"track":trk,"mainz":mz,"broll":br,"fixtop":0.33,
                 "out":f"{O}/wedding_performance_{tag[1:]}_9x16.mp4"})
for c in cfgs:
    r=subprocess.run(["python3","-I",f"{S}/scripts/wed.py",S,json.dumps(c)],capture_output=True,text=True)
    print(c["tag"],[l for l in (r.stdout+r.stderr).splitlines() if "final" in l or "Error" in l or "Trace" in l][-3:],flush=True)
