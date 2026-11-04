import cv2, sys, json
cap=cv2.VideoCapture(sys.argv[1])
casc=cv2.CascadeClassifier(cv2.data.haarcascades+"haarcascade_frontalface_default.xml")
prof=cv2.CascadeClassifier(cv2.data.haarcascades+"haarcascade_profileface.xml")
out={}
for r in sys.argv[2:]:
    a,b=map(float,r.split(':')); boxes=[]
    t=a
    while t<=b:
        cap.set(cv2.CAP_PROP_POS_MSEC,t*1000); ok,f=cap.read()
        if ok:
            g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
            fs=list(casc.detectMultiScale(g,1.1,5,minSize=(60,60)))+list(prof.detectMultiScale(g,1.1,5,minSize=(60,60)))
            for (x,y,w,h) in fs:
                # map source 720x1440 -> output 1080x1920 (scale 1.5, crop 120 top)
                boxes.append([int(x*1.5),int(y*1.5-120),int((x+w)*1.5),int((y+h)*1.5-120)])
        t+=0.5
    if boxes:
        u=[min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes)]
    else: u=None
    print(r, "faces:",len(boxes),"union(out px):",u)
