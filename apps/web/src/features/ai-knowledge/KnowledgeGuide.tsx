import { useEffect, useRef, useState } from 'react';
import { useAppViewStore } from '@/stores/appViewStore';
import type { AppView } from '@/domain/appView';
import { setAiBriefContentMode } from '@/domain/aiBriefContentMode';
import { useKnowledgeGuide } from './knowledgeGuideStore';
import { openKnowledge } from './KnowledgeDock';
import './knowledgeGuide.css';

type Stop = { title: string; view: AppView; target?: string; text: string; cases?: boolean };
const stops: Stop[] = [
 { title:'顶部导航栏',view:'home',target:'[data-guide="navigation"]',text:'通过顶部导航，切换你要使用的栏目：首页看推荐，AI快讯看资讯与案例，外部工具精选找工具，内部办公推荐找内部能力，AI工具Hub找 Skill 和 Agent。' },
 { title:'了解 AI 新变化',view:'ai-brief',target:'main h1',text:'想知道 AI 最近有什么新变化，来这里看看。新工具、新能力、新做法，都可能成为你改进工作的线索。' },
 { title:'从资讯走向业务机会',view:'ai-brief',target:'[data-guide="case-tab"]',cases:true,text:'看到新技术之后，更值得问一句：它能帮我的业务解决什么问题？案例洞察带你看看，其他企业已经怎样把 AI 用进工作。' },
 { title:'按任务找外部工具',view:'market-external',target:'[data-guide="market-search"]',text:'已经有想做的事？可以在这里按任务或工具名称搜索，再用分类缩小范围。先找与你的问题相关的工具。' },
 { title:'先了解，再使用',view:'market-external',target:'main [data-guide="asset-card"]',text:'找到感兴趣的工具，打开详情看看。先确认它能做什么、是否适合你的场景，再了解怎样访问和使用。' },
 { title:'看看内部现成能力',view:'market-internal',target:'[data-guide="market-search"]',text:'日常办公也可以先看看内部有哪些现成能力。从你的工作场景出发，找到相关工具，再查看使用说明和访问方式。' },
 { title:'认识 Skill 和 Agent',view:'market-projects',target:'[aria-label="MSS 集市面"]',text:'这里汇集了 Skill 和 Agent。你可以先把 Skill 理解为处理某类任务的技能，把 Agent 理解为围绕任务提供帮助的智能体。' },
 { title:'找到能力，开始尝试',view:'market-projects',target:'main [data-guide="asset-card"]',text:'选能力时，先看它适合什么任务、需要你提供什么，以及能得到什么结果。条件合适，再按详情里的方式开始使用。' },
 { title:'现在，自己探索吧',view:'market-projects',text:'逛完啦。你可以先看一个案例找灵感，也可以找一个 Skill 或 Agent 试试。有具体工作想解决，就来找我一起梳理方案。' },
];
const clamp = (n:number,a:number,b:number) => Math.max(a,Math.min(n,Math.max(a,b)));
export function KnowledgeGuide() {
 const active = useKnowledgeGuide(s=>s.active), index = useKnowledgeGuide(s=>s.step);
 const view = useAppViewStore(s=>s.appView);
 const [paused,setPaused]=useState(false), [phase,setPhase]=useState<'moving'|'ready'>('moving');
 const [missing,setMissing]=useState(false);
 const [rect,setRect]=useState<{left:number;top:number;width:number;height:number}|null>(null);
 const [position,setPosition]=useState({left:Math.max(12,window.innerWidth-440),top:Math.max(70,window.innerHeight-250)});
 const bubble=useRef<HTMLDivElement>(null);
 const navigating=useRef(false);
 const step=stops[index] || stops[0];
 useEffect(()=>{if(active){setPaused(false);setPhase('moving');}},[active]);
 const go=(n:number)=>{ setPaused(false); setRect(null); setPhase('moving'); useKnowledgeGuide.getState().go(clamp(n,0,stops.length-1)); };
 const close=()=>useKnowledgeGuide.getState().close();
 const navigate=()=>{
   navigating.current=useAppViewStore.getState().appView!==step.view;
   if(step.view==='ai-brief') { setAiBriefContentMode(step.cases?'cases':'news'); window.dispatchEvent(new Event('mss-guide-brief-mode')); }
   useAppViewStore.getState().setAppView(step.view);
 };
 useEffect(()=>{if(active) { navigate(); const timer=setTimeout(()=>{if(useAppViewStore.getState().appView!==step.view){navigating.current=false;setPaused(true);}},2500);return()=>clearTimeout(timer);}},[active,index]);
 useEffect(()=>{
   if(!active)return;
   if(view===step.view){navigating.current=false;return;}
   if(!navigating.current){setPaused(true);setRect(null);}
 },[view,active,index]);
 useEffect(()=>{
   if(!active||paused)return;
   const check=()=>{
     const modal=Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"],dialog[open]')).some(el=>!el.closest('.knowledge-guide-traveller,.knowledge-guide-start')&&el.getBoundingClientRect().width>0);
     if(modal){setPaused(true);setRect(null);}
   };
   const observer=new MutationObserver(check);observer.observe(document.body,{childList:true,subtree:true});check();
   return()=>observer.disconnect();
 },[active,paused]);
 useEffect(()=>{
   if(!active)return;
   const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();close();}};
   window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[active]);
 useEffect(()=>{
   if(!active||paused||view!==step.view)return;
   let cancelled=false, attempts=0, timer:ReturnType<typeof setTimeout>, arrive:ReturnType<typeof setTimeout>, frame=0;
   let target:HTMLElement|null=null;
   setPhase('moving');setMissing(false);setRect(null);
   const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   const place=()=>{
     if(cancelled)return;
     const w=window.innerWidth,h=window.innerHeight,group=Math.min(430,w-24),height=w<520?330:280;
     if(!target){setPosition({left:Math.max(12,w-group-24),top:Math.max(70,h-height)});return;}
     const r=target.getBoundingClientRect();
     if(r.width===0||r.height===0){setRect(null);return;}
     const top=Math.max(6,r.top-7),left=Math.max(6,r.left-7);
     setRect({left,top,width:Math.max(0,Math.min(w-6,r.right+7)-left),height:Math.max(0,Math.min(h-6,r.bottom+7)-top)});
     let x=r.right+18,y=r.top;
     if(x+group>w-12){x=clamp(r.right-group,12,w-group-12);y=r.bottom+20;if(y+height>h-12)y=r.top-height-16;}
     setPosition({left:clamp(x,12,w-group-12),top:clamp(y,68,h-height-12)});
   };
   const settle=()=>{place();arrive=setTimeout(()=>{if(!cancelled){setPhase('ready');bubble.current?.focus({preventScroll:true});}},reduced?0:720);};
   const find=()=>{
     if(cancelled)return;
     target=step.target?document.querySelector<HTMLElement>(step.target):null;
     if(!step.target){settle();return;}
     if(target && target.getBoundingClientRect().width>0){target.scrollIntoView({block:'nearest',inline:'nearest',behavior:reduced?'auto':'smooth'});timer=setTimeout(settle,reduced?0:350);return;}
     if(++attempts<60){timer=setTimeout(find,100);return;}
     setMissing(true);settle();
   };
   find();
   const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(place);};
   window.addEventListener('resize',update);window.addEventListener('scroll',update,true);
   const resize=new ResizeObserver(update);resize.observe(document.body);
   return()=>{cancelled=true;clearTimeout(timer);clearTimeout(arrive);cancelAnimationFrame(frame);resize.disconnect();window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true);};
 },[active,index,paused,view]);
 if(!active)return null;
 const next=()=>go(index+1);
 const finish=(destination:'cases'|'hub'|'solution')=>{
   close();
   try{localStorage.removeItem('mss-platform-guide-v1');}catch{}
   if(destination==='solution'){openKnowledge('solution');return;}
   if(destination==='cases'){setAiBriefContentMode('cases');window.dispatchEvent(new Event('mss-guide-brief-mode'));useAppViewStore.getState().setAppView('ai-brief');}
   else useAppViewStore.getState().setAppView('market-projects');
 };
 if(paused)return <div className="knowledge-guide-pause" role="status"><img src="/knowledge/voxel-bot.svg" alt=""/><div><p>指引已暂停，先看看这个页面吧。</p><button onClick={()=>{setPaused(false);setPhase('moving');navigate();}}>继续导览</button><button onClick={close}>退出</button></div></div>;
 return <>
   {rect&&rect.height>0&&<div className={`knowledge-guide-spot ${phase} ${index===0 ? 'navigation' : ''}`} style={rect} aria-hidden="true"/>}
   <div className={`knowledge-guide-traveller ${phase}`} style={position}>
     <img className="guide-moving-robot" src="/knowledge/voxel-bot.svg" alt="MAX机器人"/>
     <button className="guide-moving-exit" onClick={close} aria-label="退出指引">×</button>
     <div className="knowledge-guide-bubble" ref={bubble} tabIndex={-1} role="dialog" aria-label={step.title} aria-busy={phase==='moving'}>
       <header><h2>{step.title}</h2><span>{index+1} / {stops.length}</span></header><p>{step.text}</p>
       {missing&&<small>当前区域暂无可展示内容，可以继续下一站。</small>}
       {index===stops.length-1?<footer className="guide-end"><button onClick={()=>finish('cases')}>看看案例</button><button onClick={()=>finish('hub')}>找个能力</button><button className="guide-primary" onClick={()=>finish('solution')}>找方案</button></footer>:<footer><button disabled={index===0} onClick={()=>go(index-1)}>上一步</button><button className="guide-primary" onClick={next}>下一步</button><button onClick={close}>退出</button></footer>}
     </div>
   </div>
 </>;
}
