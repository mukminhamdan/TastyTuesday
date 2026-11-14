import numpy as np, soundfile as sf, json
from scipy.ndimage import uniform_filter1d, median_filter
S="/tmp/claude-0/-home-user-TastyTuesday/a54cbc4d-b0b0-5ec3-be30-75ed2c5c98da/scratchpad"
out={}
for c in ["wa24","wa25"]:
    x,sr=sf.read(f"{S}/aud/{c}.wav"); hop=sr//4
    n=len(x)//hop; L=20*np.log10(np.sqrt((x[:n*hop].reshape(n,hop)**2).mean(1))+1e-9)  # 4 Hz
    Ls=uniform_filter1d(L,3); dur=len(x)/sr
    r=json.load(open(f"{S}/track_{c}.json")); top=np.array([v[1] for v in r]); area=np.array([v[2] for v in r])
    mt=median_filter(top,301); ma=median_filter(area,301)
    g=np.clip((mt-top)/40,0,None)+np.clip(area/ma-1,0,None)*3; g=uniform_filter1d(g,15)
    gs=g[::15]  # 2 Hz
    peaks=[(i/2,float(gs[i])) for i in range(2,len(gs)-2) if gs[i]==gs[max(0,i-8):i+9].max() and gs[i]>0.6]
    peaks.sort(key=lambda p:-p[1])
    segs=[]; s=0.5 if c=="wa24" else 0.5
    while True:
        a0=int(s*4); a1=int((s+3)*4)
        if a1>=n: break
        st=(a0+np.argmin(Ls[a0:a1]))/4
        lo,hi=int((st+34)*4),int((st+44)*4)
        if hi>n-2: 
            if (n/4-st)>=32: segs.append([st,min(dur-0.6,st+44)]) 
            break
        en=(lo+np.argmin(Ls[lo:hi]))/4; segs.append([st,en]); s=en
    out[c]={"dur":dur,"segs":segs,"peaks":peaks[:20]}
    print(c,"dur",round(dur,1),"segs",[(round(a,1),round(b,1),round(b-a,1)) for a,b in segs])
    print("  gesture peaks",[(p[0],round(p[1],2)) for p in peaks[:16]])
json.dump(out,open(f"{S}/plan.json","w"),indent=1)
