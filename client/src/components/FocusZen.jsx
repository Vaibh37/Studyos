import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./FocusZen.css";

const clamp = x => Math.max(0, Math.min(1, x));
const mix = (a,b,t) => a+(b-a)*t;
const phase = (t,a,b) => clamp((t-a)/(b-a));
const smooth = x => { x=clamp(x); return x*x*x*(x*(6*x-15)+10); };
const envelope = x => Math.pow(Math.max(0,Math.sin(Math.PI*clamp(x))),1.5);

// Visual layer only: the parent owns all session state and API calls.
export default function FocusZen({anchor, time, status, onToggle, onClose, animate, saving, error, sharedRoom = null}) {
  const roomMode = Boolean(sharedRoom);
  const dialog = useRef(null), canvas = useRef(null), digits = useRef(null);
  const exit = useRef(null), closeRef = useRef(onClose);
  const leaving = useRef(false), requestExit = useRef(null);
  const [ready,setReady] = useState(false);
  const [pending,setPending] = useState(false);
  const pendingRef = useRef(false);
  const animateOnOpen = useRef(animate).current;
  useEffect(() => { if(ready) exit.current?.focus({preventScroll:true}); },[ready]);
  const toggle = async () => {
    if(pendingRef.current || saving) return;
    pendingRef.current=true;setPending(true);
    try { await onToggle(); } finally { pendingRef.current=false;setPending(false); }
  };
  useEffect(() => { closeRef.current=onClose; },[onClose]);
  useEffect(() => {
    const modal=dialog.current, c=canvas.current, timer=digits.current;
    const g=c.getContext("2d"), original=anchor;
    const previousFocus=document.activeElement;
    let frame=0, progress=0, last=performance.now(), w=0,h=0,dpr=1, rect;
    let animation=null, originalVisibility=original?.style.visibility;
    let previousOverflow=document.body.style.overflow;
    let disposed=false;
    const measure=()=>{
      w=window.innerWidth; h=window.innerHeight; dpr=Math.min(window.devicePixelRatio||1,2);
      c.width=Math.round(w*dpr); c.height=Math.round(h*dpr);
      if(g) g.setTransform(dpr,0,0,dpr,0,0);
      rect=original?.getBoundingClientRect();
      if(roomMode){
        modal.style.setProperty("--zen-room-y", (h*(h<450?.28:.32))+"px");
        modal.style.setProperty("--zen-room-size", Math.min(w*.175,h*.18,158)+"px");
      }
    };
    const curve=(x,b)=>{
      g.moveTo(x-b*.65,-30);
      g.bezierCurveTo(x+b,h*.18,x+b*.85,h*.73,x-b*.65,h+30);
    };
    function render(t) {
      const x=w/2,y=h/2, out=leaving.current;
      const m=smooth(phase(t,.08,.96)), light=smooth(phase(t,.30,.97));
      const punch=out?0:envelope(phase(t,.20,.64));
      const zoom=1+.045*punch;
      const ax=rect ? rect.left+rect.width/2 : x;
      const ay=rect ? rect.top+rect.height/2 : y;
      const destinationY=roomMode?h*(h<450?.28:.32):y;
      const tx=mix(x+(ax-x)*zoom,x,m), ty=mix(y+(ay-y)*zoom,destinationY,m);
      const normalSize=original ? parseFloat(getComputedStyle(original).fontSize)||64 : 64;
      const targetSize=roomMode?Math.min(w*.175,h*.18,158):Math.min(w*.19,h*.24,180);
      const size=mix(normalSize,targetSize,m)*(1+.025*punch);
      if(g){
        g.clearRect(0,0,w,h);
        if(t>0){
          const p=smooth(phase(t,0,.86));
          const edge=mix(-w*.7,w*1.7,p), bend=Math.min(w*.38,h*.65)*Math.sin(Math.PI*p);
          g.beginPath();curve(edge,bend);g.lineTo(-w,h+30);g.lineTo(-w,-30);g.closePath();
          g.fillStyle="#000";g.fill();
          if(light>0){
            const aim=mix(w*1.35,x,light), spread=Math.min(w*.36,h*.55);
            g.save();g.globalAlpha=light;g.filter="blur(18px)";
            const beam=g.createLinearGradient(x,-h*.12,aim,h*.84);
            beam.addColorStop(0,"rgba(255,255,255,.29)");
            beam.addColorStop(.42,"rgba(255,255,255,.115)");beam.addColorStop(1,"transparent");
            g.beginPath();g.moveTo(x-7,-h*.12);g.lineTo(x+7,-h*.12);
            g.lineTo(aim+spread,h*.84);g.lineTo(aim-spread,h*.84);g.closePath();
            g.fillStyle=beam;g.fill();g.restore();
            g.save();g.globalAlpha=light;g.translate(aim,h*.72);g.scale(1,.16);
            const pool=g.createRadialGradient(0,0,0,0,0,spread);
            pool.addColorStop(0,"rgba(255,255,255,.075)");pool.addColorStop(1,"transparent");
            g.fillStyle=pool;g.fillRect(-spread,-spread,spread*2,spread*2);g.restore();
          }
          [64,26,9,3,1.5].forEach((width,i)=>{
            const q=smooth(phase(t,i*.035,.79+i*.035)); if(q<=0||q>=1)return;
            const a=envelope(q), cx=mix(-w*.75,w*1.75,q);
            const b=Math.min(w*.44,h*.75)*Math.sin(Math.PI*q), z=width*a*(out?.65:1);
            g.beginPath();curve(cx,b);g.lineTo(cx-b*.65-z,h+30);
            g.bezierCurveTo(cx+b*.85-z,h*.73,cx+b-z,h*.18,cx-b*.65-z,-30);g.closePath();
            const grad=g.createLinearGradient(0,0,0,h), strength=[.76,.48,.86,.74,.5][i];
            grad.addColorStop(0,"transparent");grad.addColorStop(.34,"rgba(245,245,245,"+a*strength+")");
            grad.addColorStop(.64,"rgba(245,245,245,"+a*strength*.75+")");grad.addColorStop(1,"transparent");
            g.fillStyle=grad;g.fill();
          });
          const q=phase(t,.13,.94);
          if(q>0&&q<1){
            const a=smooth(q), alpha=envelope(q), radius=mix(Math.min(w,h)*.59,Math.min(w,h)*.19,a);
            g.save();g.translate(tx,ty);g.rotate(-.48+a*.25);g.scale(1,.63);
            for(let i=0;i<4;i++){
              const r=radius+i*13, angle=-2.7+a*(out?4.7:6.8)+i*.24, len=(2.35-i*.39)*alpha;
              for(let j=0;j<36;j++){
                const u=j/36, intensity=alpha*Math.pow(1-u,1.65);
                g.beginPath();g.arc(0,0,r,angle-len*u,angle-len*(u+.033),true);
                g.strokeStyle="rgba(245,245,245,"+intensity*(i===0?.95:.39)+")";
                g.lineWidth=Math.max(.3,(i===0?8:2.1)*(1-u)*alpha);g.lineCap="round";g.stroke();
              }
            }
            g.restore();
          }
        }
      } else { modal.style.background=t===1?"#000":"transparent"; }
      timer.style.left=tx+"px";timer.style.top=ty+"px";
      timer.style.fontSize=size+"px";
      timer.style.textShadow="0 0 "+light*36+"px rgba(255,255,255,"+light*.17+")";
      // The shell camera zoom is paused at the same instant as the Canvas timeline.
      if(animation) animation.currentTime=t*2500;
    }
    const doAnimate=animateOnOpen && !!g && !(roomMode && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const tick=now=>{
      if(disposed)return;
      const dt=Math.max(0,now-last);last=now;
      const out=leaving.current;
      progress=doAnimate?(out?Math.max(0,progress-dt/1150):Math.min(1,progress+dt/2500)):(out?0:1);
      render(progress);
      if(out&&progress===0){closeRef.current();return;}
      if(!out&&progress===1){animation?.cancel();animation=null;setReady(true);return;}
      frame=requestAnimationFrame(tick);
    };
    const beginExit=()=>{
      if(leaving.current)return;
      leaving.current=true;setReady(false);
      cancelAnimationFrame(frame);last=performance.now();frame=requestAnimationFrame(tick);
    };
    const onCancel=e=>{e.preventDefault();beginExit();};
    const onResize=()=>{measure();render(progress);};
    measure();
    modal.showModal();
    if(original)original.style.visibility="hidden";
    document.body.style.overflow="hidden";
    const shell=document.querySelector(".app-shell-v2");
    if(doAnimate&&shell?.animate){
      animation=shell.animate([{transform:"scale(1)",offset:0},{transform:"scale(1)",offset:.2},{transform:"scale(1.045)",offset:.42},{transform:"scale(1)",offset:.64},{transform:"scale(1)",offset:1}],{duration:2500,fill:"both",easing:"linear"});
      animation.pause();animation.currentTime=0;
    }
    modal.addEventListener("cancel",onCancel);
    window.addEventListener("resize",onResize);
    requestExit.current=beginExit;
    render(0);frame=requestAnimationFrame(tick);
    return ()=>{
      disposed=true;cancelAnimationFrame(frame);animation?.cancel();
      window.removeEventListener("resize",onResize);modal.removeEventListener("cancel",onCancel);
      requestExit.current=null;
      if(original)original.style.visibility=originalVisibility;
      document.body.style.overflow=previousOverflow;
      if(modal.open)modal.close();
      if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
    };
  },[anchor,animateOnOpen,roomMode]);
  return createPortal(
    <dialog className={`studyos-zen-dialog${roomMode?" studyos-zen-room":""}`} ref={dialog} aria-label={roomMode?"Shared Zen mode":"Zen focus mode"}>
      <canvas ref={canvas} aria-hidden="true" />
      {roomMode && <div className={`studyos-zen-scene room-environment--${sharedRoom.scenery}`} data-ready={ready} aria-hidden="true" />}
      <div className="studyos-zen-digits" ref={digits} role="timer">{time}</div>
      <div className="studyos-zen-ui" data-ready={ready} inert={!ready}>
        <button ref={exit} type="button" className="studyos-zen-exit" onClick={()=>requestExit.current?.()}>Exit Zen <span>Esc</span></button>
        {roomMode ? <>
          <header className="zen-room-header">
            <span className={`zen-room-indicator${sharedRoom.connected?" is-online":""}`} />
            <div><strong>{sharedRoom.name}</strong>
              <span>{sharedRoom.connected?`${sharedRoom.activeCount} studying · ${sharedRoom.total} in room`:"Reconnecting to room…"}</span>
            </div>
          </header>
          <div className="zen-room-controls">
            <p className="zen-room-detail">{sharedRoom.detail}</p>
            <div className="zen-room-buttons">
              <button type="button" className="studyos-zen-action" disabled={saving || pending} onClick={toggle}>{status==="running"?"Pause":status==="paused"?"Resume":"Start focus"}</button>
              {status!=="idle" && <button type="button" disabled={saving || pending} onClick={sharedRoom.onFinish}>Finish &amp; save</button>}
              <button type="button" aria-pressed={sharedRoom.audio.playing} onClick={sharedRoom.audio.toggle}>{sharedRoom.audio.playing?"Mute sound":"Play sound"}</button>
            </div>
            {(error || sharedRoom.audio.error) && <span className="zen-room-error" role="alert">{error || sharedRoom.audio.error}</span>}
          </div>
          {sharedRoom.roster}
        </> : <>
          <button type="button" className="studyos-zen-action" disabled={saving || pending} onClick={toggle}>{status==="running"?"Pause":status==="paused"?"Resume":"Start focus"}</button>
          {error && <p className="studyos-zen-error" role="alert">{error}</p>}
        </>}
      </div>
    </dialog>,document.body
  );
}
