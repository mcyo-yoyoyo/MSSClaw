import { useEffect, useState } from 'react';
import { knowledgeRequest } from '@/api/aiKnowledgeApi';
import type { KnowledgeMode } from './KnowledgeDock';
type Batch={items:{text:string;sourceIds:string[]}[];generatedAt:string|null;pending:boolean;stale:boolean};
const cache:Partial<Record<KnowledgeMode,Batch>>={};
export function SuggestionCarousel({mode,visible,paused,onSelect,fallbackItems}:{mode:KnowledgeMode;visible:boolean;paused:boolean;onSelect:(text:string)=>void;fallbackItems?:string[]}){
 const [batch,setBatch]=useState<Batch|undefined>((cache[mode]?.items.length ? cache[mode] : undefined) || (fallbackItems ? {items:fallbackItems.map(text=>({text,sourceIds:[]})),generatedAt:null,pending:false,stale:false}:undefined));
 const [index,setIndex]=useState(0),[hover,setHover]=useState(false),[reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>setReduced(media.matches);media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);},[]);
 useEffect(()=>{
   setBatch((cache[mode]?.items.length ? cache[mode] : undefined) || (fallbackItems ? {items:fallbackItems.map(text=>({text,sourceIds:[]})),generatedAt:null,pending:false,stale:false}:undefined));setIndex(0);if(mode==='intro'||mode==='search')return;
   let cancelled=false,timer:ReturnType<typeof setTimeout>,attempts=0;
   const controller=new AbortController();
   const load=async()=>{
     try{const data=await knowledgeRequest<Batch>(`/pilot/suggestions?mode=${mode}`,{signal:controller.signal},15000);
       if(cancelled)return;if(data.items.length){cache[mode]=data;setBatch(data);}setIndex(i=>i%Math.max(data.items.length,1));
       if((data.pending||data.stale||data.items.length!==6)&&++attempts<48)timer=setTimeout(load,5000);
     }catch{if(!cancelled&&++attempts<6)timer=setTimeout(load,15000);}
   };void load();
   return()=>{cancelled=true;clearTimeout(timer);controller.abort();};
 },[mode]);
 useEffect(()=>{
   if(!visible||paused||hover||reduced||!batch?.items.length)return;
   const timer=setInterval(()=>{if(document.visibilityState==='visible')setIndex(i=>(i+1)%batch.items.length);},5000);
   return()=>clearInterval(timer);
 },[visible,paused,hover,reduced,batch]);
 if(!visible||mode==='intro'||mode==='search'||!batch?.items.length)return null;
 const current=batch.items[index%batch.items.length];
 return <div className="suggestion-carousel" onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}><button type="button" className="suggestion-carousel-item" key={mode+':'+index} onFocus={()=>setHover(true)} onBlur={()=>setHover(false)} onClick={()=>onSelect(current.text)} title="点击填入问题，不会自动发送"><span>{current.text}</span><small aria-hidden="true">{index+1}/{batch.items.length}</small></button></div>;
}
