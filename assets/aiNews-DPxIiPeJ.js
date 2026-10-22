import{j as o}from"./vendor-react-IHhJoXif.js";import{bM as c}from"./page-task-Dcd55aO9.js";import{ab as g}from"./artifact-BdklUGq_.js";import{u as l}from"./index-BxqWW08R.js";import"./aiNewsStore-BHh5ZzSA.js";const E=["image/png","image/jpeg","image/webp","image/gif"],M=5*1024*1024,_=9,f=/^!\[([^\]\n]*)\]\((\/api\/v1\/blobs\/[A-Za-z0-9_-]+)\)$/;function m(n){const e=f.exec(n.trim());return e?{alt:e[1].trim(),url:e[2]}:null}function p(n){const e=[];let t=[];const a=()=>{const s=t.join(`
`).replace(/^\n+|\n+$/g,"");s&&e.push({type:"text",text:s}),t=[]};for(const s of n.replace(/\r\n/g,`
`).split(`
`)){const r=m(s);r?(a(),e.push({type:"image",...r})):t.push(s)}return a(),e}function j(n){return p(n).filter(e=>e.type==="image").length}function w(n){return n.replace(/\r\n/g,`
`).split(`
`).map(e=>m(e)?"[图片]":e).join(`
`)}function I(n,e){return`![${n.replace(/\.[^.]+$/,"").replace(/[[\]\n\r]/g," ").trim()}](/api/v1/blobs/${e})`}function $(n,e,t){const a=Math.max(0,Math.min(e,n.length)),s=n.slice(0,a),r=n.slice(a),i=s&&!s.endsWith(`
`)?`
`:"",u=r.startsWith(`
`)?"":`
`;return{body:`${s}${i}${t}${u}${r}`,cursor:s.length+i.length+t.length+1}}function y({body:n,className:e}){return o.jsx("div",{className:g("space-y-3 text-[13px] leading-relaxed text-zinc-700",e),children:p(n).map((t,a)=>t.type==="text"?o.jsx("p",{className:"whitespace-pre-wrap",children:t.text},a):o.jsx("a",{href:c(t.url),target:"_blank",rel:"noopener noreferrer",title:"在新标签页查看原图",className:"block w-fit max-w-full",children:o.jsx("img",{src:c(t.url),alt:t.alt,loading:"lazy",className:"max-h-[480px] max-w-full rounded-lg border border-zinc-100 object-contain"})},a))})}function v(){const n=l.getState(),e=n.messages.filter(t=>t.kind!=="ai_news");e.length!==n.messages.length&&(l.setState({messages:e}),n.persist())}export{y as A,_ as a,E as b,j as c,w as d,v as e,M as f,I as g,$ as i};
