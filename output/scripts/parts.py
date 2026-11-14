import json, subprocess, sys, concurrent.futures as cf
S="/tmp/claude-0/-home-user-TastyTuesday/a54cbc4d-b0b0-5ec3-be30-75ed2c5c98da/scratchpad"; O="/home/user/TastyTuesday/output"
def Tk(t0,t1,z,frac=0.34,dx=0): return [t0,t1,"track",{"z":z,"frac":frac,"dx":dx}]
def F(t0,t1,z,cx,cy,cx1=None):
    a={"z":z,"cx":cx,"cy":cy}
    if cx1 is not None: a["cx1"]=cx1
    return [t0,t1,"fixed",a]
P=[]
def part(clip,m0,m1,shots,broll): P.append({"clip":clip,"m0":m0,"T":round(m1-m0,2),"shots":shots,"broll":broll})
# v6 wide-hall virtual angles (singer far -> zoomed)
def A(t0,t1): return Tk(t0,t1,2.5,.26)
def B(t0,t1,dx=.015): return Tk(t0,t1,2.0,.3,dx)
def Cw(t0,t1,z=1.55): return Tk(t0,t1,z,.38)
def D(t0,t1,cx): return F(t0,t1,2.2,cx,.53)
# 1 Arrival: banner, chandelier, singer walks to couple's table (v5)
part("v5",0.0,30.7,[F(0,8.3,1.3,.55,.42),F(8.3,14,1.25,.47,.42),Tk(14,22,1.7,.3),Tk(22,30.7,[1.6,1.4],.32)],
     [[0,4.8,"banner"],[4.3,8.8,"d_chand"],[22.0,27.0,"c_v5z"]])
# 2-3 On stage (v4)
part("v4",0.25,35.75,[Tk(0,7,[1.3,1.4]),Tk(7,13,1.75,.3),Tk(13,18,1.4,.34,-.04),Tk(18,27,2.0,.3),Tk(27,31,1.5,.34,.04),Tk(31,35.5,[1.4,1.25])],[])
part("v4",35.75,67.5,[Tk(0,8,1.85,.3),Tk(8,12,1.45),Tk(12,20,1.8,.3),Tk(20,24,1.5,.34,.04),Tk(24,28,2.0,.28),Tk(28,31.75,[1.4,1.25])],
     [[11.5,16.5,"wave_z"]])
# 4-9 Full song on stage (v3)
part("v3",0.5,39.0,[Tk(0,6,[1.3,1.4]),Tk(6,13,1.6),Tk(13,21,1.9,.3),Tk(21,29,2.0,.3),Tk(29,38.5,1.9,.3,-.02)],
     [[20.5,25,"d_chand2"],[28.5,33.5,"s_v4b"]])
part("v3",39.0,83.5,[Tk(0,8,2.0,.3),Tk(8,15,1.75),Tk(15,21,2.0,.28),Tk(21,27,1.8,.32,.03),Tk(27,44.5,2.0,.3)],
     [[26.5,31,"c_v2bz"],[30.5,35,"v6_couple1"],[34.5,39.5,"s_v4d"],[39.0,44.0,"s_v4e"]])
part("v3",83.5,125.75,[Tk(0,4,1.9),Tk(4,9,[1.45,1.6]),Tk(9,17,2.0,.3),Tk(17,24,2.0,.28,.02),Tk(24,31,1.7),Tk(31,42.25,[1.6,1.35])],
     [[30.5,35,"d_chand"]])
part("v3",125.75,164.5,[Tk(0,8,[1.35,1.5]),Tk(8,15,1.8,.3),Tk(15,19,1.5,.34,-.03),Tk(19,26,2.0,.28),Tk(26,31,1.6),Tk(31,38.75,[1.5,1.3])],
     [[30.5,35.5,"s_v4c"]])
part("v3",164.5,206.25,[Tk(0,10,[1.35,1.5]),Tk(10,18,1.9,.3),Tk(18,22,1.6,.34,.03),Tk(22,32,2.0,.28),Tk(32,37,1.6),Tk(37,41.75,[1.5,1.3])],[])
part("v3",206.25,250.5,[Tk(0,8,1.7),Tk(8,13,1.7),Tk(13,22,1.9,.3),Tk(22,27,1.55,.34,-.03),Tk(27,34,2.0,.28),Tk(34,44.25,[1.7,1.3])],
     [[7.5,12.9,"s_v4a"]])
# 10-13 Second song (v6): singer on stage seen over guest tables -> upper-body zoomed angles
def A2(t0,t1): return Tk(t0,t1,2.6,.55)
def B2(t0,t1,dx=.01): return Tk(t0,t1,2.25,.5,dx)
def Wd(t0,t1,z=1.9): return Tk(t0,t1,z,.6)
part("v6",89.75,123.75,[Wd(0,8),A2(8,16),B2(16,23),D(23,27,.85),A2(27,34)],[])
part("v6",123.75,161.25,[B2(0,8),A2(8,17),Wd(17,22),A2(22,30),B2(30,37.5,-.01)],[])
part("v6",161.25,193.5,[A2(0,7),D(7,11,.78),B2(11,19),A2(19,27),Wd(27,32.25)],[])
part("v6",193.5,230.4,[A2(0,9),B2(9,17),A2(17,26),Wd(26,36.9,[1.9,1.7])],[])
XMIN_V3=[[18,25,.33],[27,34,.35],[35,41,.36],[42,54,.37],[58,68,.37],[80,87,.42],[90,97,.31],[99,110,.34]]
for p in P:
    if p["clip"]=="v3": p["xmin"]=XMIN_V3
    if p["clip"]=="v6": p["clamp"]=[.14,.42,.38,.5]; p["trackmed"]=71
for i,p in enumerate(P):
    p["tag"]=f"p{i+1:02d}"; p["out"]=f"{S}/part_{i+1:02d}.mp4"; p["final"]=f"{O}/wedding_part{i+1:02d}_9x16.mp4"
json.dump(P,open(f"{S}/parts.json","w"),indent=1)
for p in P: print(p["tag"],p["clip"],p["m0"],p["T"],len(p["shots"]),"shots",len(p["broll"]),"broll")
only=sys.argv[1].split(",") if len(sys.argv)>1 else None
def run(p):
    r=subprocess.run(["python3","-I",f"{S}/scripts/series.py",S,json.dumps(p)],capture_output=True,text=True)
    ok=f"final {p['tag']} 0" in r.stdout
    if ok: subprocess.run(["cp",p["out"],p["final"]])
    return p["tag"],"OK" if ok else "FAIL "+(r.stdout+r.stderr)[-400:].replace("\n"," ")
if only is not None or "--run" in sys.argv:
    todo=[p for p in P if (only is None or only==["--run"] or p["tag"] in only)]
    with cf.ThreadPoolExecutor(2) as ex:
        for x in ex.map(run,todo): print(*x,flush=True)
