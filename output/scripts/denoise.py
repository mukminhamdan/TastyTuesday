# Reduce background chatter: M/S side reduction + non-stationary spectral gating
import sys, numpy as np, soundfile as sf, noisereduce as nr
inp,out=sys.argv[1],sys.argv[2]; strength=float(sys.argv[3]) if len(sys.argv)>3 else 0.75
x,sr=sf.read(inp); x=x.astype(np.float32)
if x.ndim==2:
    m=(x[:,0]+x[:,1])/2; s=(x[:,0]-x[:,1])/2; s*=0.4   # diffuse chatter lives more in the side signal
    x=np.stack([m+s,m-s],1)
y=nr.reduce_noise(y=x.T,sr=sr,stationary=False,prop_decrease=strength,time_constant_s=1.5,
                  freq_mask_smooth_hz=300,time_mask_smooth_ms=80,n_std_thresh_stationary=1.5,thresh_n_mult_nonstationary=2,n_jobs=2).T
sf.write(out,y,sr)
