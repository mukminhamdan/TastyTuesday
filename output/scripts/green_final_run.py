import json,subprocess,sys,concurrent.futures as cf
S=sys.argv[1]
cfgs=[{"tag":"gfA","out":f"{S}/full/BajuHijau_A_Full.mp4","clip":"wa24","m0":0.3,"T":256.5},
      {"tag":"gfB","out":f"{S}/full/BajuHijau_B_Full.mp4","clip":"wa25","m0":0.8,"T":186.0}]
def run(c):
    r=subprocess.run(["python3","-I",f"{S}/scripts/green_final_only.py",S,json.dumps(c)],capture_output=True,text=True)
    return c["tag"],r.returncode,r.stdout[-300:],r.stderr[-300:]
with cf.ThreadPoolExecutor(2) as ex:
    for x in ex.map(run,cfgs): print(*x,flush=True)
