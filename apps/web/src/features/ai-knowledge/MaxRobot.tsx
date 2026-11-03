import { useEffect, useRef } from 'react';
import artwork from './max-robot.svg?raw';
import './maxRobot.css';
const clamp=(n:number)=>Math.max(-1,Math.min(1,n));
/** Local CC0 Voxel Bot artwork; only the head responds to pointer position. */
export function MaxRobot({className=''}:{className?:string}){
 const root=useRef<HTMLSpanElement>(null);
 useEffect(()=>{
   const head=root.current?.querySelector<SVGGElement>('.vb-head');if(!head)return;
   const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
   const fine=window.matchMedia('(hover: hover) and (pointer: fine)');
   let frame=0,point:{x:number;y:number}|null=null;
   const paint=()=>{
     frame=0;
     if(!point||reduced.matches||!fine.matches){head.style.transform='';return;}
     const r=root.current?.getBoundingClientRect();if(!r)return;
     const x=clamp((point.x-r.left-r.width*.5)/Math.max(180,window.innerWidth*.4));
     const y=clamp((point.y-r.top-r.height*.35)/Math.max(180,window.innerHeight*.4));
     head.style.transform=`translate(${x*2.5}px,${y*1.5}px) perspective(240px) rotateY(${x*15}deg) rotateX(${-y*10}deg) rotateZ(${x*3}deg)`;
   };
   const queue=()=>{if(!frame)frame=requestAnimationFrame(paint);};
   const move=(event:PointerEvent)=>{if(event.pointerType!=='mouse')return;point={x:event.clientX,y:event.clientY};queue();};
   const reset=()=>{point=null;queue();};
   const leave=(event:PointerEvent)=>{if(!event.relatedTarget)reset();};
   const visibility=()=>{if(document.hidden)reset();};
   window.addEventListener('pointermove',move,{passive:true});
   document.documentElement.addEventListener('pointerleave',leave);
   window.addEventListener('blur',reset);window.addEventListener('resize',queue);
   document.addEventListener('visibilitychange',visibility);
   reduced.addEventListener('change',reset);fine.addEventListener('change',reset);
   return()=>{cancelAnimationFrame(frame);head.style.transform='';window.removeEventListener('pointermove',move);document.documentElement.removeEventListener('pointerleave',leave);window.removeEventListener('blur',reset);window.removeEventListener('resize',queue);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',reset);fine.removeEventListener('change',reset);};
 },[]);
 return <span ref={root} className={`max-robot ${className}`} role="img" aria-label="MAX机器人" dangerouslySetInnerHTML={{__html:artwork}}/>;
}
