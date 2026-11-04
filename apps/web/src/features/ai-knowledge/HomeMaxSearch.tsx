import { greetingForNow } from '@/domain/timeGreeting';
import { useEffect, useRef, useState } from 'react';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useSessionStore } from '@/stores/sessionStore';
import { stageAiKnowledgeEntry } from '@/domain/aiKnowledgeEntry';
import { knowledgeRequest } from '@/api/aiKnowledgeApi';
import { openAssetDetail } from '@/domain/appRoute';
import { MarketShelfCard } from '@/components/market/MarketShelfCard';
import { MaxRobot } from './MaxRobot';
import { KnowledgeModeTabs } from './KnowledgeModeTabs';
import { openKnowledge, type KnowledgeMode } from './KnowledgeDock';
import { useKnowledgeGuide } from './knowledgeGuideStore';
import { SuggestionCarousel } from './SuggestionCarousel';
import { useKnowledgeToolResults } from './KnowledgeToolSearch';
import './homeMaxSearch.css';
const fallbackQuestions={solution:['帮我整理每周销售汇报，有哪些能力可以用？','我想制作新品发布 PPT，应该怎么准备？','帮我梳理市场分析的实施路径','想处理多语种文档，如何选择相关能力？','门店数据怎么整理成业务分析？','想用 AI 辅助知识检索，该怎么选工具？'],insight:['AI 客服有哪些值得参考的落地案例？','看看 AI 在营销业务中的应用','AI 辅助数据分析有哪些实践？','有哪些适合销售团队参考的 AI 案例？','AI 内容生产有哪些值得关注的方向？','帮我看看平台最近的 AI 资讯']};
type State={draft:string;query:string;mode:KnowledgeMode};
export function HomeMaxSearch(){const owner=useSessionStore(s=>s.user?.id||'guest');return <HomeSearch key={owner} owner={owner}/>}
function HomeSearch({owner}:{owner:string}){
 const name=useSessionStore(s=>s.user?.name);
 const greeting=greetingForNow()+(name?'，'+name:'');
 const key='mss-home-max:'+owner;
 const [state,setState]=useState<State>(()=>{try{const s=JSON.parse(sessionStorage.getItem(key)||'null');if(s&&typeof s.draft==='string'&&typeof s.query==='string'&&['search','solution','insight'].includes(s.mode))return s;}catch{}return {draft:'',query:'',mode:'search'}});
 const [focused,setFocused]=useState(false),[index,setIndex]=useState(0),[revision,setRevision]=useState(0),[expanded,setExpanded]=useState(Boolean(state.query));
 const input=useRef<HTMLInputElement>(null),root=useRef<HTMLDivElement>(null),pending=useRef<string|null>(null);
 const ready=useMarketplaceStore(s=>s.ready),error=useMarketplaceStore(s=>s.loadError),bootstrap=useMarketplaceStore(s=>s.bootstrap);
 const results=useKnowledgeToolResults(state.query);
 useEffect(()=>{sessionStorage.setItem(key,JSON.stringify(state))},[key,state]);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');if(focused||state.draft||media.matches)return;const timer=setInterval(()=>{if(document.visibilityState==='visible')setIndex(n=>(n+1)%6)},5000);return()=>clearInterval(timer)},[focused,state.draft]);
 useEffect(()=>{const close=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setExpanded(false)};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[]);
 useEffect(()=>{if(!pending.current||!ready||error)return;const id=pending.current;pending.current=null;void knowledgeRequest('/usage/search',{method:'POST',body:JSON.stringify({eventId:id,query:state.query,results:results.slice(0,500).map(c=>({id:c.id,kind:c.assetType==='skill'||c.assetType==='agent'?c.assetType:'tool',label:c.title,description:c.description,icon:c.icon}))})}).catch(()=>console.warn('MAX 搜索记录暂未保存'));},[revision,ready,error,results,state.query]);
 const update=(patch:Partial<State>)=>setState(s=>({...s,...patch}));
 const enter=(text=state.draft,mode=state.mode)=>{if(mode==='search'){if(!text.trim())return;pending.current=crypto.randomUUID();update({query:text.trim()});setRevision(n=>n+1);setExpanded(true);return}openKnowledge(mode);stageAiKnowledgeEntry(text,'home',{mode:mode==='insight'?'insight':'solution',autoSend:true,returnHome:true})};
 const hints=['输入 PPT，找找演示文稿相关能力','输入翻译，查找文档与术语处理能力','输入数据分析，看看平台已有能力','输入营销，查找相关 Agent 与工具','输入周报，寻找办公提效工具','输入知识库，查找知识检索能力'];
 return <div ref={root} className="home-max-search" data-guide="market-search" onKeyDown={e=>{if(e.key==='Escape'){input.current?.blur();setExpanded(false)}}}>
 <div className="home-max-greeting"><span className="home-max-greeting-title" title={greeting}>{greeting}</span><span>今天想用 AI 做点什么？</span></div>
 <button className="home-max-robot" aria-label="打开 MAX 首页" onClick={()=>openKnowledge()}><MaxRobot/></button>
 <div className="home-max-tabs"><button type="button" className="home-max-guide" onClick={()=>useKnowledgeGuide.getState().start()}><svg className="home-max-guide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 3 2.78 5.63L21 9.54l-4.5 4.39L17.56 20 12 17.08 6.44 20l1.06-6.07L3 9.54l6.22-.91L12 3Z"/></svg>使用指引</button><KnowledgeModeTabs mode={state.mode} onChange={mode=>{update({mode});setExpanded(false);input.current?.focus()}}/></div>
 <form onSubmit={e=>{e.preventDefault();enter()}}><div className="home-max-input"><input ref={input} value={state.draft} maxLength={state.mode==='search'?200:4000} aria-label="MAX 搜索与提问" placeholder={state.mode==='search'?'输入工具、Skill 或 Agent 名称…':state.mode==='insight'?'想了解哪个主题、案例或近期变化？':'告诉 MAX，你想用 AI 完成什么工作…'} onFocus={()=>{setFocused(true);if(state.query)setExpanded(true)}} onBlur={()=>setFocused(false)} onChange={e=>update({draft:e.target.value})}/>
 {state.mode==='search'&&!state.draft&&!focused&&<button className="home-max-hint" key={index} type="button" title="点击填入，不会自动搜索" onClick={()=>{update({draft:['PPT','翻译','数据分析','营销','周报','知识库'][index]});input.current?.focus()}}><span>{hints[index]}</span><small>{index+1}/6</small></button>}
 <SuggestionCarousel fallbackItems={state.mode==='solution'||state.mode==='insight'?fallbackQuestions[state.mode]:undefined} mode={state.mode} visible={state.mode!=='search'&&!state.draft&&!focused} paused={focused} onSelect={draft=>{update({draft});input.current?.focus()}}/>
 {state.draft&&<button type="button" className="home-max-clear" aria-label="清空输入" onClick={()=>{update({draft:'',query:''});setExpanded(false);input.current?.focus()}}>×</button>}</div>
 <footer><button className="home-max-send" disabled={!state.draft.trim()} aria-label={state.mode==='search'?'搜索':'发送'}><i className={state.mode==='search'?'fa-solid fa-magnifying-glass':'fa-solid fa-arrow-up'}/></button></footer></form>
 {state.mode==='search'&&expanded&&state.query&&<section className="home-max-results" aria-label="工具搜索结果"><div className="home-max-result-head" role="status"><span>{error?'资产读取失败':!ready?'正在读取资产…':`找到 ${results.length} 个结果`}</span><button aria-label="收起搜索结果" onClick={()=>setExpanded(false)}>×</button></div>{error?<button onClick={()=>void bootstrap()}>重试</button>:ready&&<><div className="home-max-grid">{results.map(card=><MarketShelfCard key={(card.assetType||'tool')+card.id} card={card} enableCompare={false} onOpen={()=>openAssetDetail(card.assetType==='skill'||card.assetType==='agent'?card.assetType:'tool',card.id)} onPrimary={()=>openAssetDetail(card.assetType==='skill'||card.assetType==='agent'?card.assetType:'tool',card.id)}/>)}</div>{!results.length&&<p className="home-max-empty">没有匹配结果，试试其他关键词。</p>}<button className="home-max-ask" onClick={()=>enter(`帮我选择适合「${state.query}」的能力`,'solution')}>让 MAX 帮我选 <span>›</span></button></>}</section>}
 </div>;
}
