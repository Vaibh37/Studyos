import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./FocusCompletion.css";

const TAU=Math.PI*2, clamp=x=>Math.max(0,Math.min(1,x)), mix=(a,b,t)=>a+(b-a)*t, phase=(t,a,b)=>clamp((t-a)/(b-a)), ease=x=>{x=clamp(x);return x*x*x*(x*(6*x-15)+10)}, out=x=>1-Math.pow(1-clamp(x),3);
const DURATION=3650;

// The approved motion study, scoped to a dialog. All persistence belongs to Focus.
export default function FocusCompletion({seconds,onClose}) {
  const modal=useRef(null),canvas=useRef(null),timer=useRef(null),label=useRef(null),receipt=useRef(null),topline=useRef(null),metric=useRef(null),rule=useRef(null),footer=useRef(null),doneButton=useRef(null);
  const closeRef=useRef(onClose);
  const [ready,setReady]=useState(false);
  const total=Math.max(0,Math.floor(Number(seconds)||0));
  const mins=Math.floor(total/60), remainder=total%60;
  useEffect(()=>{closeRef.current=onClose;},[onClose]);
  useEffect(()=>{if(ready)doneButton.current?.focus({preventScroll:true});},[ready]);
  useEffect(()=>{
    const dialog=modal.current,c=canvas.current,g=c.getContext("2d"),card=receipt.current;
    const prior=document.activeElement,overflow=document.body.style.overflow;
    let W=0,H=0,R=0,raf=0,progress=0,disposed=false;
    let completed=false;
    const start=performance.now();
    function light(x,y,r,a){
      if(!g||a<=0||r<=0)return;
      const q=g.createRadialGradient(x,y,0,x,y,r);
      q.addColorStop(0,"rgba(235,233,224,"+a+")");q.addColorStop(.25,"rgba(235,233,224,"+a*.2+")");q.addColorStop(1,"transparent");
      g.fillStyle=q;g.fillRect(x-r,y-r,r*2,r*2);
    }
    function ring(t){
      if(!g||R<=0)return;
      const roll=ease(phase(t,.12,.48)),width=ease(phase(t,.03,.20))*(1-ease(phase(t,.38,.51))),squash=mix(1,.014,roll),angle=mix(-.02,-.19,Math.sin(Math.PI*roll)),rad=mix(R,R*.84,roll),cx=W/2,cy=H/2;
      const a=1-ease(phase(t,.45,.55));if(a<=0)return;
      const segs=[],n=240;
      const project=(theta,r)=>{const X=r*Math.cos(theta),Y=r*Math.sin(theta)*squash,Z=r*Math.sin(theta)*Math.sin(roll*Math.PI/2),p=1/(1-Z/(R*6));return [cx+(X*Math.cos(angle)-Y*Math.sin(angle))*p,cy+(X*Math.sin(angle)+Y*Math.cos(angle))*p,Z];};
      for(let i=0;i<n;i++){const x=i*TAU/n,y=(i+1)*TAU/n+.001,half=.85+width*9;const pts=[project(x,rad-half),project(x,rad+half),project(y,rad+half),project(y,rad-half)];segs.push({pts,z:pts.reduce((v,p)=>v+p[2],0)/4,theta:(x+y)/2});}
      segs.sort((a,b)=>a.z-b.z);g.save();g.globalAlpha=a;
      for(const s of segs){const z=s.theta,beam=Math.pow(Math.max(0,Math.cos(z-(t*5-1.2))),15),soft=.5+.5*Math.cos(z+1.2),shade=Math.round(mix(205,52+soft*110+beam*85,width));g.beginPath();g.moveTo(s.pts[0][0],s.pts[0][1]);for(let j=1;j<4;j++)g.lineTo(s.pts[j][0],s.pts[j][1]);g.closePath();g.fillStyle="rgb("+shade+","+shade+","+Math.max(0,shade-3)+")";g.fill();g.strokeStyle=g.fillStyle;g.lineWidth=.65;g.stroke();}
      g.restore();
      if(width>.02){const p=project(t*8-1.5,rad);g.save();g.globalCompositeOperation="screen";light(p[0],p[1],R*.43,.16*width*a);g.restore();}
    }
    function reveal(el,t,a,b,dy=12){const p=out(phase(t,a,b));el.style.opacity=p;el.style.transform="translateY("+((1-p)*dy)+"px)";}
    function draw(t){
      if(g)g.clearRect(0,0,W,H);
      const cx=W/2,cy=H/2,close=ease(phase(t,.08,.43));
      timer.current.style.opacity=1-ease(phase(t,.08,.35));
      timer.current.style.transform="translate(-50%,-50%) scale("+mix(1,.88,close)+")";
      label.current.style.opacity=1-ease(phase(t,0,.14));ring(t);
      const seam=ease(phase(t,.41,.61)),seamFade=1-ease(phase(t,.62,.79)),half=card.getBoundingClientRect().width/2;
      if(g&&seam>0&&seamFade>0){
        const length=mix(R*.88,half,seam),ang=-.19*(1-seam);g.save();g.translate(cx,cy);g.rotate(ang);
        const q=g.createLinearGradient(-length,0,length,0);
        q.addColorStop(0,"transparent");q.addColorStop(.15,"rgba(235,233,225,"+seamFade*.75+")");q.addColorStop(.5,"rgba(250,249,244,"+seamFade+")");q.addColorStop(.85,"rgba(235,233,225,"+seamFade*.75+")");q.addColorStop(1,"transparent");
        g.fillStyle=q;g.fillRect(-length,-.8,length*2,1.6);g.restore();light(cx,cy,Math.min(W,H)*.4,.11*seam*seamFade);
      }
      const open=ease(phase(t,.56,.81)),wide=ease(phase(t,.50,.67));
      card.style.visibility=t>=.56?"visible":"hidden";
      card.style.clipPath="inset("+((1-open)*50)+"% "+((1-wide)*50)+"% "+((1-open)*50)+"% "+((1-wide)*50)+"% round "+(12*open)+"px)";
      card.style.opacity=phase(t,.56,.60);
      card.style.transform="translate(-50%,-50%) scale("+mix(.985,1,open)+")";
      reveal(topline.current,t,.73,.86,8);reveal(metric.current,t,.78,.94,18);reveal(footer.current,t,.88,1,8);
      rule.current.style.transform="scaleX("+ease(phase(t,.81,.94))+")";
      if(t>.7)light(cx,cy,Math.min(W,H)*.8,.035*ease(phase(t,.7,1)));
    }
    function resize(){W=window.innerWidth;H=window.innerHeight;const d=Math.min(2,window.devicePixelRatio||1);c.width=Math.round(W*d);c.height=Math.round(H*d);if(g)g.setTransform(d,0,0,d,0,0);R=Math.min(175,W*.34,H*.32);draw(progress);}
    function finish(){if(completed)return;completed=true;progress=1;draw(1);setReady(true);}
    function tick(now){if(disposed)return;progress=clamp((now-start)/DURATION);draw(progress);if(progress===1){finish();return;}raf=requestAnimationFrame(tick);}
    const cancel=e=>{e.preventDefault();if(completed)closeRef.current();else{cancelAnimationFrame(raf);finish();}};
    dialog.showModal();document.body.style.overflow="hidden";
    dialog.addEventListener("cancel",cancel);window.addEventListener("resize",resize);
    resize();if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)finish();else raf=requestAnimationFrame(tick);
    return()=>{disposed=true;cancelAnimationFrame(raf);window.removeEventListener("resize",resize);dialog.removeEventListener("cancel",cancel);if(dialog.open)dialog.close();document.body.style.overflow=overflow;if(prior?.isConnected)prior.focus({preventScroll:true});};
  },[]);
  return createPortal(
    <dialog className="studyos-completion" ref={modal} aria-label="Focus session complete">
      <div className="sc-ambient" aria-hidden="true"/>
      <header className="sc-head"><b>StudyOS.</b><span>Focus / Session complete</span></header>
      <canvas ref={canvas} className="sc-fx" aria-hidden="true"/>
      <div ref={timer} className="sc-timer" aria-hidden="true"><div className="sc-digits">00:00</div><div ref={label} className="sc-label">Focus session</div></div>
      <section ref={receipt} className="sc-receipt" aria-hidden={!ready}>
        <div className="sc-paper">
          <div ref={topline} className="sc-topline sc-reveal"><span className="sc-eyebrow">Session complete</span><span className="sc-stamp"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/><path d="m7.5 12 3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>Done</span></div>
          <div ref={metric} className="sc-metric sc-reveal"><div className="sc-number">{mins||total}<span>{mins?"min":"sec"}</span></div><div className="sc-unit">{mins>0&&remainder>0?remainder+" sec · ":""}Time well spent.</div></div>
          <div ref={rule} className="sc-rule"/>
          <div ref={footer} className="sc-footer sc-reveal"><span>Deep work</span><strong>StudyOS</strong></div>
        </div>
      </section>
      <div className="sc-controls" data-ready={ready} inert={!ready}><button ref={doneButton} type="button" onClick={()=>closeRef.current()}>Continue</button></div>
      <div className="sc-sr" role="status" aria-live="polite">{ready?"Session saved. "+mins+" minutes and "+remainder+" seconds of focus.":""}</div>
    </dialog>,document.body
  );
}
