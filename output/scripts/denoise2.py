# Stronger crowd-chatter suppression: side reduction + harmonic/percussive masking + non-stationary spectral gating
import sys, numpy as np, soundfile as sf, noisereduce as nr
from scipy.signal import stft, istft
from scipy.ndimage import median_filter
inp,out=sys.argv[1],sys.argv[2]; nrs=float(sys.argv[3]) if len(sys.argv)>3 else 0.85; floor=float(sys.argv[4]) if len(sys.argv)>4 else 0.3
x,sr=sf.read(inp); x=x.astype(np.float32)
if x.ndim==1: x=np.stack([x,x],1)
m=(x[:,0]+x[:,1])/2; s=(x[:,0]-x[:,1])/2*0.3
n=4096; hop=1024
f,t,M=stft(m,sr,nperseg=n,noverlap=n-hop); _,_,Sd=stft(s,sr,nperseg=n,noverlap=n-hop)
A=np.abs(M)
Hh=median_filter(A,size=(1,31)); Pp=median_filter(A,size=(31,1))
mask=Hh**2/(Hh**2+Pp**2+1e-12); g=floor+(1-floor)*mask
M*=g; Sd*=g
_,m2=istft(M,sr,nperseg=n,noverlap=n-hop); _,s2=istft(Sd,sr,nperseg=n,noverlap=n-hop)
L=len(x); m2=m2[:L]; s2=s2[:L]
y=np.stack([m2+s2,m2-s2],0)
y=nr.reduce_noise(y=y,sr=sr,stationary=False,prop_decrease=nrs,time_constant_s=1.0,freq_mask_smooth_hz=250,time_mask_smooth_ms=60,thresh_n_mult_nonstationary=2,n_jobs=2)
sf.write(out,y.T,sr)
