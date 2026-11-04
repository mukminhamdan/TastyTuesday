"""Procedural sound design: SFX + background music (48kHz stereo WAV).
Designed in-house because external SFX libraries are not reachable from the build box.
Swap any file in public/sfx or public/music with a licensed library file of the same name."""
import numpy as np, wave, os, sys
from scipy import signal
SR = 48000
OUT = sys.argv[1] if len(sys.argv) > 1 else "public"
rng = np.random.default_rng(7)

def save(path, x):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1: x = np.stack([x, x], 1)
    peak = np.max(np.abs(x)) + 1e-9
    x = x / peak * 0.89
    d = (x * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(d.tobytes())

def t(d): return np.arange(int(SR * d)) / SR
def env_ad(n, a, d, curve=4):
    a = max(int(a*SR),1); out = np.zeros(n)
    out[:a] = np.linspace(0,1,a)**2
    r = n - a; out[a:] = np.exp(-curve*np.linspace(0,1,r)) * (1-np.linspace(0,1,r)**8)
    return out
def noise(n): return rng.standard_normal(n)
def bp_sweep(x, f0, f1, q=2.0):
    # time-varying bandpass via short blocks (state-variable filter)
    n = len(x); f = np.geomspace(f0, f1, n); y = np.zeros(n)
    low = band = 0.0
    for i in range(n):
        fc = 2*np.sin(np.pi*f[i]/SR); hp = x[i]-low-band/q
        band += fc*hp; low += fc*band; y[i] = band
    return y
def reverb(x, decay=1.2, mix=0.25, pre=0.012):
    n = int(decay*SR); ir = noise(n)*np.exp(-6*np.arange(n)/n)
    ir = signal.lfilter(*signal.butter(2, 6000/(SR/2)), ir)
    p = np.zeros(int(pre*SR)); ir = np.concatenate([p, ir]); ir /= np.sqrt(np.sum(ir**2))
    L = signal.fftconvolve(x, ir)[:len(x)+n]; R = signal.fftconvolve(x, np.roll(ir, 137))[:len(x)+n]
    dry = np.pad(x, (0, len(L)-len(x)))
    return np.stack([dry*(1-mix)+L*mix*0.6, dry*(1-mix)+R*mix*0.6], 1)
def pan(x, p):
    p = np.broadcast_to(p, x.shape)
    return np.stack([x*np.cos((p+1)*np.pi/4), x*np.sin((p+1)*np.pi/4)], 1)
def lp(x, f, o=2): return signal.lfilter(*signal.butter(o, f/(SR/2)), x)
def hp(x, f, o=2): return signal.lfilter(*signal.butter(o, f/(SR/2), 'high'), x)

def whoosh(d=0.55, f0=250, f1=4500, name="whoosh"):
    n = int(d*SR); e = np.sin(np.pi*np.linspace(0,1,n))**2.2
    e = e * np.linspace(0.6, 1, n)
    x = bp_sweep(noise(n), f0, f1, q=1.6)*e
    x += 0.35*bp_sweep(noise(n), f0*2, f1*1.3, q=4)*e
    st = pan(x, np.linspace(-0.7, 0.7, n))
    return st
def pop(f0=900, f1=220, d=0.12):
    tt = t(d); f = f1+(f0-f1)*np.exp(-tt*55); ph = 2*np.pi*np.cumsum(f)/SR
    x = np.sin(ph)*np.exp(-tt*38); x[:40] += noise(40)*np.linspace(1,0,40)*0.6
    return reverb(x, 0.4, 0.12)
def click(f=3200, d=0.04):
    tt = t(d); x = np.sin(2*np.pi*f*tt)*np.exp(-tt*180) + hp(noise(len(tt)),2000)*np.exp(-tt*400)*0.4
    return reverb(x, 0.25, 0.1)
def impact(d=2.2):
    tt = t(d); f = 38+90*np.exp(-tt*9); sub = np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*2.2)
    sub = np.tanh(sub*1.8)
    burst = lp(noise(len(tt)), 2500)*np.exp(-tt*14)*0.7
    crack = hp(noise(len(tt)), 3000)*np.exp(-tt*60)*0.5
    return reverb(sub+burst+crack, 1.8, 0.3)
def riser(d=1.6):
    tt = t(d); n=len(tt); e = (tt/d)**2.5
    f = 200*np.power(2, tt/d*3.2)
    saw = signal.sawtooth(2*np.pi*np.cumsum(f)/SR)*0.25 + signal.sawtooth(2*np.pi*np.cumsum(f*1.007)/SR)*0.25
    saw = lp(saw, 5000)
    nz = bp_sweep(noise(n), 400, 9000, q=1.2)
    x = (saw*0.5+nz)*e; x[-int(0.01*SR):] *= np.linspace(1,0,int(0.01*SR))
    return reverb(x, 1.0, 0.3)
def ding(f=1318.5, d=1.6):
    tt = t(d); x = np.zeros_like(tt)
    for k, a, dec in [(1,1,3),(2.76,0.4,5),(5.4,0.2,8),(8.93,0.08,12)]:
        x += a*np.sin(2*np.pi*f*k*tt + 0.8*np.sin(2*np.pi*f*1.41*tt)*np.exp(-tt*6))*np.exp(-tt*dec)
    x[:int(.003*SR)] *= np.linspace(0,1,int(.003*SR))
    return reverb(x, 1.4, 0.35)
def sparkle(d=1.2):
    out = np.zeros(int(d*SR)+3*SR)
    notes = [2093, 2637, 3136, 3951, 4186]
    for i, f in enumerate(notes):
        s = ding(f, 0.7)[:,0]*0.5; o = int(i*0.045*SR); out[o:o+len(s)] += s
    return reverb(out[:int(d*SR)], 1.0, 0.4)
def shutter():
    x = np.zeros(int(0.35*SR))
    for o, a in [(0, 1), (0.085, 0.8)]:
        n=int(0.03*SR); s=hp(noise(n),1500)*np.exp(-np.arange(n)/n*8)*a; i=int(o*SR); x[i:i+n]+=s
        tt=t(0.05); m=np.sin(2*np.pi*180*tt)*np.exp(-tt*90)*a*0.6; x[i:i+len(tt)]+=m
    return reverb(x, 0.3, 0.12)
def glitch(d=0.3):
    n=int(d*SR); x=np.zeros(n); i=0
    while i<n:
        L=int(rng.uniform(0.008,0.04)*SR); f=rng.choice([180,440,880,1760,3520])
        seg = signal.square(2*np.pi*f*np.arange(L)/SR)*0.3 + noise(L)*0.3
        seg = np.round(seg*4)/4; x[i:i+L]=seg[:max(0,min(L,n-i))]; i+=L+int(rng.uniform(0,0.02)*SR)
    return pan(lp(x,7000), np.sin(np.linspace(0,9,n))*0.6)
def swipe(): return whoosh(0.28, 900, 7000)
def tape_stop(d=0.6):
    tt=t(d); f=440*(1-tt/d)**1.5+20; x=signal.sawtooth(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*2)
    return reverb(lp(x,3000),0.5,0.2)
def sizzle_hit(d=0.9):
    tt=t(d); x=hp(noise(len(tt)),3500)*(np.exp(-tt*5))*(1+0.5*np.sin(2*np.pi*31*tt))
    return reverb(x,0.6,0.25)
def bass_drop(d=1.2):
    tt=t(d); f=110*np.exp(-tt*2.5)+30; x=np.tanh(2*np.sin(2*np.pi*np.cumsum(f)/SR))*np.exp(-tt*2)
    return reverb(x,0.8,0.15)
def typing(d=0.6):
    out=np.zeros(int(d*SR)); 
    for k in range(9):
        c=click(rng.uniform(2500,4200),0.03)[:,0]*rng.uniform(.4,1); o=int(k*d/9*SR); out[o:o+len(c)]+=c[:len(out)-o]
    return out

def music(path, bpm=92, bars=48, seed=3):
    """Chill neo-soul/lofi groove: rhodes-style chords, sub bass, swung drums, vinyl."""
    r = np.random.default_rng(seed)
    beat = 60/bpm; bar = beat*4; n = int(bars*bar*SR); L = np.zeros(n); R = np.zeros(n)
    def add(x, at, g=1.0, p=0.0):
        i=int(at*SR); 
        if i>=n: return
        if x.ndim==1: x=pan(x,p)
        m=min(len(x), n-i); L[i:i+m]+=x[:m,0]*g; R[i:i+m]+=x[:m,1]*g
    def rhodes(freqs, d):
        tt=t(d); y=np.zeros_like(tt)
        for f in freqs:
            mod=np.sin(2*np.pi*f*tt)*1.2*np.exp(-tt*3)
            y+=np.sin(2*np.pi*f*tt+mod)*np.exp(-tt*0.9)+0.15*np.sin(2*np.pi*f*2*tt)*np.exp(-tt*3)
        y*=1+0.18*np.sin(2*np.pi*4.5*tt); y[:200]*=np.linspace(0,1,200)
        y[-2000:]*=np.linspace(1,0,2000); return lp(y,3800)
    mid = lambda m: 440*2**((m-69)/12)
    # Dmaj9 - Bm9 - Gmaj7 - A13sus  (bright, warm, food-friendly)
    prog = [[50,54,57,61,64],[47,50,54,57,61],[43,47,50,54,59],[45,50,52,55,59]]
    roots = [38,35,31,33]
    kick = lambda: np.tanh(3*np.sin(2*np.pi*np.cumsum(45+120*np.exp(-t(0.35)*30))/SR))*np.exp(-t(0.35)*9)
    def snare():
        tt=t(0.3); return (bp_fast(noise(len(tt)),1800)*np.exp(-tt*16)+0.5*np.sin(2*np.pi*190*tt)*np.exp(-tt*25))
    def hat(o=False):
        tt=t(0.2 if o else 0.05); return hp(noise(len(tt)),7000,4)*np.exp(-tt*(18 if o else 90))
    def bp_fast(x,f): return signal.lfilter(*signal.butter(2,[f*0.6/(SR/2),f*1.6/(SR/2)],'band'),x)
    K,S,Hc,Ho = kick(),snare(),hat(),hat(True)
    for b in range(bars):
        sec = b//8  # arrangement sections
        ch = prog[b%4]; t0=b*bar
        add(rhodes([mid(m) for m in ch], bar*1.05), t0, 0.16, 0)
        if b%2==1: add(rhodes([mid(ch[-1]+12)], beat*1.5), t0+beat*2.5, 0.07, 0.4)
        # sub bass
        if sec>=1 or b>=4:
            for st,dur in [(0,1.5),(1.75,0.75),(2.5,1.5)]:
                tt=t(beat*dur); f=mid(roots[b%4]); bs=np.sin(2*np.pi*f*tt)+0.25*np.sin(4*np.pi*f*tt)
                bs*=np.minimum(1,tt*60)*np.exp(-tt*1.2); bs[-300:]*=np.linspace(1,0,300)
                add(bs, t0+st*beat, 0.30)
        if b>=2:
            sw = beat*0.5*0.16
            for k in range(8):
                at=t0+k*beat/2+(sw if k%2 else 0)
                add(Hc, at, 0.05*(1.2 if k%2==0 else 0.8)*r.uniform(.8,1.1), 0.25)
            add(Ho, t0+3.5*beat+sw, 0.04, -0.3)
            add(K, t0, 0.5); add(K, t0+2.5*beat, 0.38)
            if b%2: add(K, t0+1.75*beat, 0.25)
            add(S, t0+beat, 0.2, 0.05); add(S, t0+3*beat, 0.2, 0.05)
    mix = np.stack([L,R],1)
    vinyl = lp(noise(n),4500)*0.004 + (r.random(n)>0.9996)*r.standard_normal(n)*0.05
    mix += np.stack([vinyl, np.roll(vinyl,77)],1)
    # gentle glue compression + mid scoop around 1–3kHz to leave room for voice
    for c in range(2):
        x=mix[:,c]; e=np.abs(signal.lfilter([0.001],[1,-0.999],np.abs(x)))
        mix[:,c]=x/(1+3*np.maximum(e-0.05,0))
        b,a = signal.iirpeak(2200/(SR/2), 0.7); mix[:,c] -= 0.45*signal.lfilter(b,a,mix[:,c])
    fade=int(2*SR); mix[:fade]*=np.linspace(0,1,fade)[:,None]; mix[-fade:]*=np.linspace(1,0,fade)[:,None]
    save(path, mix)

if __name__ == "__main__":
    sd = f"{OUT}/sfx"; md=f"{OUT}/music"; os.makedirs(sd, exist_ok=True); os.makedirs(md, exist_ok=True)
    fx = dict(whoosh=whoosh(), whoosh_long=whoosh(0.9,150,3500), swipe=swipe(), pop=pop(), pop_hi=pop(1500,500,0.09),
              click=click(), impact=impact(), riser=riser(), ding=ding(), sparkle=sparkle(), shutter=shutter(),
              glitch=glitch(), tape_stop=tape_stop(), sizzle=sizzle_hit(), bass_drop=bass_drop(), typing=typing())
    for k,v in fx.items(): save(f"{sd}/{k}.wav", v); print("sfx", k)
    music(f"{md}/groove_92.wav", 92, 48, 3); print("music groove")
    music(f"{md}/groove_104.wav", 104, 56, 11); print("music groove fast")
