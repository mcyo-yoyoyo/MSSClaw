import{j as r,r as j}from"./vendor-react-OqIQ1Ttd.js";import{c as Te}from"./vendor-zustand-nGyoepmo.js";import{t as Qe,c as Ze,e as I,o as q,s as y,a as U,b as ie,n as te,d as N,z as et}from"./vendor-iCJV-tzc.js";function S(...e){return Qe(Ze(e))}function tt(e){const t=e.match(/@([\u4e00-\u9fa5\w\s]+?)(?=\s|$|[，。！？])/g);return(t==null?void 0:t.map(n=>n.slice(1).trim()))??[]}function Jn(e,t){const n=new Set(["knowledge","rd_rag"]);if(!new Set(["campaign_ops"]).has(e))return n.has(e)?"knowledge":"marketing";const a=tt(t);return a.some(l=>l.includes("知识"))?"knowledge":a.some(l=>l.includes("营销")||l.includes("洞察"))?"marketing":t.includes("知识")||t.includes("SOP")||t.includes("合规")?"knowledge":"marketing"}const Vn="v14-review-pipeline-3agents",Xn="v2-biz-dept",Qn="v2-no-default-warroom",Zn="v5-review-pipeline-3agents",Le="ws-cn-marketing",nt={office:"办公提效",manage:"管理提效",process:"流程提效",experience:"体验提升"};function es(e){return nt[e]??e}const st=I(["super_admin","capability_ops","business_user","viewer"]);function ue(e){switch(e){case"super_admin":case"workspace_admin":return"super_admin";case"capability_ops":case"developer":return"capability_ops";case"business_user":return"business_user";case"viewer":return"viewer";default:return"business_user"}}I(["none","read","execute","write","admin"]);I(["chat","prompt","skill","workflow","agent","knowledge","tool","memory","settings"]);q({id:y(),name:y(),email:y(),role:st,avatar:y(),lastActive:y(),status:I(["active","invited","suspended"]),deptIds:U(y()).optional(),regionId:y().nullable().optional()});const ts={super_admin:"超级管理员",capability_ops:"能力运营",business_user:"业务用户",viewer:"只读访客"},ns={super_admin:"管人、管空间、管租户/门户/展示；拥有平台与本空间全部治理权",capability_ops:"运营壳：工作平台 + 能力配置（专家/技能/工具等）；完整产品能力在此配置",business_user:"业务壳：仅工作平台（找案例/做任务/任务记录；协作空间在完整产品可开）",viewer:"业务壳：工作平台仅找案例，不可发起执行或修改配置"},ss=["capability_ops","business_user","viewer"],as={active:"已激活",invited:"待激活",suspended:"已停用"},rs={none:"—",read:"R",execute:"Execute",write:"Write",admin:"Admin"},ls={none:"bg-slate-100 text-slate-400",read:"bg-blue-50 text-blue-600",execute:"bg-emerald-50 text-emerald-600",write:"bg-amber-50 text-amber-700",admin:"bg-indigo-50 text-indigo-700"},at={chat:"admin",prompt:"admin",skill:"admin",workflow:"admin",agent:"admin",knowledge:"admin",tool:"admin",memory:"admin",settings:"admin"};function rt(e,t,n){return{super_admin:{...at},capability_ops:e,business_user:t,viewer:n}}const lt=rt({chat:"execute",prompt:"write",skill:"write",workflow:"write",agent:"write",knowledge:"write",tool:"write",memory:"write",settings:"read"},{chat:"execute",prompt:"read",skill:"execute",workflow:"execute",agent:"read",knowledge:"read",tool:"read",memory:"read",settings:"none"},{chat:"read",prompt:"read",skill:"read",workflow:"read",agent:"read",knowledge:"read",tool:"none",memory:"none",settings:"none"});function is(e){return lt}const os={chat:"Chat",prompt:"Prompt",skill:"Skill",workflow:"Workflow",agent:"Agent",knowledge:"Knowledge",tool:"Tool",memory:"Memory",settings:"Settings"},Ae=[{id:"u-mcyo",name:"Mcyo",email:"mcyo@company.com",role:"super_admin",avatar:"bg-indigo-600",lastActive:"刚刚",status:"active",deptIds:["quality"],regionId:null},{id:"u-jacky",name:"Jacky",email:"jacky@company.com",role:"capability_ops",avatar:"bg-teal-600",lastActive:"1 小时前",status:"active",deptIds:["quality"],regionId:null},{id:"u-dickson",name:"Dickson",email:"dickson@company.com",role:"business_user",avatar:"bg-amber-500",lastActive:"今天",status:"active",deptIds:["gtm"],regionId:"apac"},{id:"u-somebody",name:"Somebody",email:"somebody@company.com",role:"viewer",avatar:"bg-slate-500",lastActive:"昨天",status:"active",deptIds:["mkt"],regionId:"europe"}],it=[Le,"ws-apac","ws-3c-latam","ws-mea","ws-eurasia","ws-europe"],Pe=Object.fromEntries(it.map(e=>[e,Ae.map(t=>({...t,deptIds:[...t.deptIds??[]]}))]));function cs(e){return Pe[e]??Ae.map(t=>({...t}))}function ds(e){return{super_admin:"bg-red-50 text-red-700 border-red-200",capability_ops:"bg-blue-50 text-blue-700 border-blue-200",business_user:"bg-emerald-50 text-emerald-700 border-emerald-200",viewer:"bg-slate-100 text-slate-600 border-slate-200"}[e]}const ps=[{id:"members",label:"成员管理",icon:"fa-users"},{id:"roles",label:"角色说明",icon:"fa-user-shield"},{id:"rbac",label:"权限矩阵",icon:"fa-table-cells"},{id:"org",label:"组织概览",icon:"fa-sitemap"},{id:"depts",label:"部门区域",icon:"fa-building"},{id:"audit",label:"审计日志",icon:"fa-clipboard-list"}],Fe=[{id:"gtm",label:"GTM"},{id:"mkt",label:"MKT"},{id:"ecommerce",label:"电商"},{id:"retail",label:"零售"},{id:"service",label:"服务"},{id:"channel",label:"渠道"},{id:"hr",label:"HR"},{id:"finance",label:"财经"},{id:"quality",label:"质量与运营"}],_e=[{id:"china",label:"中国"},{id:"apac",label:"亚太"},{id:"mea",label:"中东非"},{id:"latam",label:"拉美"},{id:"europe",label:"欧洲"},{id:"eurasia",label:"欧亚"}],ms={skill:"Skill",tool:"工具",agent:"Agent",external_tool:"外部工具",case:"场景案例",insight:"前沿洞察",training:"培训赋能",news:"前沿洞察"},us={public:"全员可见",org:"本组织可见",private:"仅发布方"},ot=Object.fromEntries(Fe.map(e=>[e.id,e.label])),ct=Object.fromEntries(_e.map(e=>[e.id,e.label]));function fs(e){return ot[e]??e}function xs(e){return ct[e]??e}function dt(e){return Fe.some(t=>t.id===e)}function pt(e){return _e.some(t=>t.id===e)}function G(e){const t=[...new Set(((e==null?void 0:e.deptIds)??[]).filter(dt))],n=e!=null&&e.regionId&&pt(e.regionId)?e.regionId:null;return{deptIds:t,regionId:n}}const mt="mssclaw",X={super_admin:4,capability_ops:3,business_user:2,viewer:1},ut=new Set(["mcyo@company.com"]),ft="mssclaw_members_v6_";function xt(e,t){return G({deptIds:[...e.deptIds,...t.deptIds],regionId:e.regionId??t.regionId})}function gt(e){return G({deptIds:e.deptIds??[],regionId:e.regionId??null})}function ht(){const e=[];try{for(let t=0;t<localStorage.length;t+=1){const n=localStorage.key(t);if(!(n!=null&&n.startsWith(ft)))continue;const s=localStorage.getItem(n);if(!s)continue;const a=JSON.parse(s);Array.isArray(a)&&a.forEach(l=>{if(l&&typeof l=="object"&&"email"in l&&"id"in l){const i=l;e.push({...i,role:ue(i.role)})}})}}catch{}return e}function fe(){const e=new Map,t=(n,s)=>{const a=n.email.trim().toLowerCase();if(!a)return;const l=ue(n.role),i=ut.has(a)?"super_admin":l,o=gt(n),d=e.get(a);if(!d){e.set(a,{id:n.id,name:n.name,email:n.email.trim(),platformRole:i,avatar:n.avatar,status:n.status,workspaceIds:s?[s]:[],deptIds:o.deptIds,regionId:o.regionId??null});return}n.status==="active"&&d.status!=="active"&&(d.status="active"),X[i]>X[d.platformRole]&&(d.platformRole=i),s&&!d.workspaceIds.includes(s)&&d.workspaceIds.push(s);const m=xt({deptIds:d.deptIds,regionId:d.regionId},o);d.deptIds=m.deptIds,d.regionId=m.regionId??null,s===Le&&(d.id=n.id,d.name=n.name,d.avatar=n.avatar)};return Object.entries(Pe).forEach(([n,s])=>{s.forEach(a=>t(a,n))}),ht().forEach(n=>t(n)),[...e.values()].sort((n,s)=>{const a=X[s.platformRole]-X[n.platformRole];return a!==0?a:n.name.localeCompare(s.name,"zh-CN")})}function bt(e,t){const n=e.trim().toLowerCase();if(!n)return{ok:!1,error:"请输入邮箱账号"};if(!t)return{ok:!1,error:"请输入密码"};const s=fe().find(a=>a.email.toLowerCase()===n);return s?s.status==="invited"?{ok:!1,error:"该成员尚未激活，请联系管理员完成邀请"}:s.status==="suspended"?{ok:!1,error:"账号已停用，无法登录"}:t!==mt?{ok:!1,error:"密码错误（演示密码：mssclaw）"}:{ok:!0,account:s}:{ok:!1,error:"账号不存在，请使用成员权限管理中的邮箱登录"}}const oe="mssclaw_session";function ce(e){if(!e){localStorage.removeItem(oe);return}localStorage.setItem(oe,JSON.stringify(e))}function yt(e){if(e.deptIds.length>0||e.regionId)return e;const t=fe().find(s=>s.email.toLowerCase()===e.email.toLowerCase());if(!t)return e;const n=G({deptIds:t.deptIds,regionId:t.regionId});return{...e,deptIds:n.deptIds,regionId:n.regionId??null}}function vt(){try{const e=localStorage.getItem(oe);if(!e)return null;const t=JSON.parse(e);if(typeof t.id=="string"&&typeof t.name=="string"&&typeof t.email=="string"&&typeof t.platformRole=="string"){const n=G({deptIds:Array.isArray(t.deptIds)?t.deptIds:[],regionId:t.regionId??null}),s={id:t.id,name:t.name,email:t.email,platformRole:ue(t.platformRole),avatar:typeof t.avatar=="string"?t.avatar:"bg-zinc-900",deptIds:n.deptIds,regionId:n.regionId??null},a=fe().find(d=>d.email.toLowerCase()===s.email.toLowerCase()),l=a?{...s,platformRole:a.platformRole,name:a.name,deptIds:a.deptIds,regionId:a.regionId}:s,i=yt(l);return(i.platformRole!==t.platformRole||i.deptIds.join(",")!==(Array.isArray(t.deptIds)?t.deptIds.join(","):"")||i.regionId!==(t.regionId??null)||i.name!==s.name)&&ce(i),i}}catch{}return null}function wt(e){const t=G({deptIds:e.deptIds,regionId:e.regionId});return{id:e.id,name:e.name,email:e.email,platformRole:e.platformRole,avatar:e.avatar,deptIds:t.deptIds,regionId:t.regionId??null}}const ae=Te((e,t)=>{const n=vt();return{user:n,isAuthenticated:!!n,login:(s,a)=>{const l=bt(s,a);if(!l.ok)return{ok:!1,error:l.error};const i=wt(l.account);return ce(i),e({user:i,isAuthenticated:!0}),{ok:!0}},logout:()=>{ce(null),e({user:null,isAuthenticated:!1})},getUserId:()=>{var s;return((s=t().user)==null?void 0:s.id)??""},getUserName:()=>{var s;return((s=t().user)==null?void 0:s.name)??""},getPlatformRole:()=>{var s;return((s=t().user)==null?void 0:s.platformRole)??"viewer"},getOrgAffiliation:()=>{var s,a;return G({deptIds:((s=t().user)==null?void 0:s.deptIds)??[],regionId:((a=t().user)==null?void 0:a.regionId)??null})}}});function Ee(){return ae.getState().getUserId()}function gs(){return ae.getState().getUserName()}function kt(){return ae.getState().getPlatformRole()}function hs(){return ae.getState().getOrgAffiliation()}function bs(e){return(e??kt())==="super_admin"}const St=I(["user","agent","other","system","typing","plan","step"]),jt=q({role:St,text:y().optional(),name:y().optional(),avatar:y().optional(),streaming:ie().optional(),planId:y().optional(),steps:U(y()).optional(),awaitingApproval:ie().optional(),mountedSkills:U(y()).optional(),stepId:y().optional(),index:te().optional(),total:te().optional(),label:y().optional(),stepStatus:I(["pending","running","done"]).optional()}),ys=q({id:y(),title:y(),type:I(["bot","group"]),icon:y(),color:y(),status:y(),history:U(jt),prompts:U(y()),sessionGroup:I(["pinned","agents"]).optional(),iconBg:y().optional(),badge:y().optional(),agentId:y().optional(),actionType:I(["marketing","knowledge"]).optional(),taskSource:I(["skill","expert","case_demo","embedded","other"]).optional(),businessScenarioId:I(["S1","S2","S3","S4","S5","S6","S7","S8"]).optional(),skillId:y().optional(),createdAt:te().optional(),pinnedAt:te().optional(),adminId:y().optional(),members:U(q({id:y(),name:y(),email:y().optional(),avatar:y().optional(),role:I(["admin","member"]),canUseAi:ie().default(!0)})).optional()});function xe(e){return e.type==="group"||e.sessionGroup==="pinned"}function vs(e,t){var s;const n=Ee();return xe(e)?e.adminId?e.adminId===n:((s=e.members)==null?void 0:s.some(a=>a.id===n&&a.role==="admin"))??!1:!1}function ws(e,t){var a;const n=Ee();if(!xe(e)||!((a=e.members)!=null&&a.length))return!0;const s=e.members.find(l=>l.id===n);return(s==null?void 0:s.canUseAi)!==!1}const Nt=new Set(["marketing","knowledge","smoke_task","test_task"]);function ks(e){return!!(e.id.startsWith("task_")||e.id.startsWith("warroom_")||Nt.has(e.id)||e.sessionGroup==="agents"||!e.sessionGroup&&e.type==="bot")}I(["chat","agent","prompt","skill","tool","workflow","knowledge","memory","settings"]);const Ss=q({skill:y(),time:y(),label:y(),detail:y()}),B=[{id:"glm-5.1",label:"GLM 5.1",baseUrl:"https://open.bigmodel.cn/api/paas/v4",providerName:"智谱"},{id:"deepseek-v4-flash",label:"DeepSeek V4 Flash",baseUrl:"https://api.deepseek.com/v1",providerName:"DeepSeek"},{id:"deepseek-v4-pro",label:"DeepSeek V4 Pro",baseUrl:"https://api.deepseek.com/v1",providerName:"DeepSeek"},{id:"qwen3.7-plus",label:"Qwen 3.7 Plus",baseUrl:"https://dashscope.aliyuncs.com/compatible-mode/v1",providerName:"通义"}],Ne={model:B[0].id,baseUrl:B[0].baseUrl},$t={"GLM-5.1":"glm-5.1","glm-5":"glm-5.1","DeepSeek-V4":"deepseek-v4-flash","DeepSeek V4":"deepseek-v4-flash","deepseek-chat":"deepseek-v4-flash","deepseek-reasoner":"deepseek-v4-flash","Qwen-3.7":"qwen3.7-plus","Qwen 3.7":"qwen3.7-plus","qwen-plus":"qwen3.7-plus","qwen-max":"qwen3.7-plus","qwen-turbo":"qwen3.7-plus","gpt-4o":"glm-5.1","gpt-4o-mini":"glm-5.1","gpt-4-turbo":"glm-5.1"};function E(e){const t=e.trim();return $t[t]??t}function Z(e){const t=E(e.model),n=B.find(a=>a.id===t);if(n)return{...n,custom:!1};const s=e.customModels.find(a=>a.id===t||a.id===e.model);return s?{id:s.id,label:s.label||s.id,baseUrl:s.baseUrl,providerName:"自定义",custom:!0}:{id:t,label:t,baseUrl:"",providerName:"自定义",custom:!0}}function Oe(e){return!!(e.apiKey.trim()&&e.baseUrl.trim()&&e.model.trim())}B[0].baseUrl;const L="mssclaw_llm_";function It(){try{const e=localStorage.getItem(`${L}custom_models`);if(!e)return[];const t=JSON.parse(e);return Array.isArray(t)?t.filter(n=>!!n&&typeof n=="object"&&typeof n.id=="string"):[]}catch{return[]}}function Ct(){const e=It(),t=localStorage.getItem(`${L}model`)||Ne.model,n=E(t),s=Z({model:n,customModels:e}),a=localStorage.getItem(`${L}base_url`);return n!==t&&localStorage.setItem(`${L}model`,n),{model:n,baseUrl:a||s.baseUrl||Ne.baseUrl,apiKey:localStorage.getItem(`${L}api_key`)||"",customModels:e}}function Mt(e){e.baseUrl!=null&&localStorage.setItem(`${L}base_url`,e.baseUrl),e.apiKey!=null&&localStorage.setItem(`${L}api_key`,e.apiKey),e.model!=null&&localStorage.setItem(`${L}model`,e.model),e.customModels!=null&&localStorage.setItem(`${L}custom_models`,JSON.stringify(e.customModels))}const zt=Te((e,t)=>({config:Ct(),settingsOpen:!1,settingsFocusAdd:!1,saveConfig:n=>{const s={...t().config,...n};Mt(n),e({config:s})},selectModel:n=>{if(n==="__configure__"){t().openSettings();return}const{config:s}=t(),a=E(n),l=Z({model:a,customModels:s.customModels});t().saveConfig({model:a,baseUrl:l.baseUrl||s.baseUrl})},addCustomModel:n=>{const s=E(n.id.trim());if(!s)return;const{config:a}=t(),l=[...a.customModels.filter(i=>i.id!==s),{id:s,label:n.label.trim()||s,baseUrl:n.baseUrl.trim()}];t().saveConfig({customModels:l,model:s,baseUrl:n.baseUrl.trim()||a.baseUrl})},removeCustomModel:n=>{const{config:s}=t(),a=s.customModels.filter(o=>o.id!==n),l=s.model===n?B[0].id:s.model,i=Z({model:l,customModels:a});t().saveConfig({customModels:a,model:l,baseUrl:i.baseUrl||s.baseUrl})},openSettings:n=>e({settingsOpen:!0,settingsFocusAdd:!!(n!=null&&n.focusAdd)}),closeSettings:()=>e({settingsOpen:!1,settingsFocusAdd:!1}),modelOptions:()=>{const{config:n}=t(),s=B.map(o=>({id:o.id,label:o.label,group:"default"})),a=n.customModels.map(o=>({id:o.id,label:o.label||o.id,group:"custom"})),l=new Set([...s,...a].map(o=>o.id)),i=n.model&&!l.has(n.model)?[{id:n.model,label:n.model,group:"custom"}]:[];return[...s,...a,...i]},statusLabel:()=>{const{config:n}=t(),s=Z(n);return Oe(n)?{text:`${s.label} · 已接�?Plan/Execute`,configured:!0}:{text:`${s.label} · 未配�?API Key · 本地 Mock`,configured:!1}}}));function J(){return zt.getState().config}function T(e){return Oe(e??J())}function ge(e){return e.trim().replace(/\/$/,"")}async function Re(e,t){var l,i,o,d;const n=J(),s=await fetch(`${ge(n.baseUrl)}/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n.apiKey.trim()}`},body:JSON.stringify({model:E(n.model),messages:e,max_tokens:(t==null?void 0:t.maxTokens)??512,temperature:(t==null?void 0:t.temperature)??.3,stream:!1}),signal:t==null?void 0:t.signal});if(!s.ok){const m=await s.text();throw new Error(`LLM HTTP ${s.status}: ${m.slice(0,160)}`)}return((d=(o=(i=(l=(await s.json()).choices)==null?void 0:l[0])==null?void 0:i.message)==null?void 0:o.content)==null?void 0:d.trim())??""}async function*De(e,t){var o,d,m;const n=J(),s=await fetch(`${ge(n.baseUrl)}/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n.apiKey.trim()}`},body:JSON.stringify({model:E(n.model),messages:e,max_tokens:(t==null?void 0:t.maxTokens)??1200,temperature:(t==null?void 0:t.temperature)??.5,stream:!0}),signal:t==null?void 0:t.signal});if(!s.ok||!s.body){const f=await s.text().catch(()=>"");throw new Error(`LLM stream HTTP ${s.status}: ${f.slice(0,160)}`)}const a=s.body.getReader(),l=new TextDecoder;let i="";for(;;){const{done:f,value:c}=await a.read();if(f)break;i+=l.decode(c,{stream:!0});const p=i.split(`
`);i=p.pop()??"";for(const u of p){const v=u.trim();if(!v.startsWith("data:"))continue;const h=v.slice(5).trim();if(!(!h||h==="[DONE]"))try{const k=(m=(d=(o=JSON.parse(h).choices)==null?void 0:o[0])==null?void 0:d.delta)==null?void 0:m.content;k&&(yield k)}catch{}}}}function Tt(e,t){const n=e.trim();if(!n)return t;const s=n.match(/\[[\s\S]*\]/);if(s)try{const l=JSON.parse(s[0]);if(Array.isArray(l)){const i=l.map(o=>typeof o=="string"?o.trim():"").filter(Boolean).slice(0,8);if(i.length>=2)return i}}catch{}const a=n.split(`
`).map(l=>l.replace(/^[\d.\-*)\]]+\s*/,"").trim()).filter(Boolean).slice(0,8);return a.length>=2?a:t}async function Lt(e){var l;const t=e.skillNames.length?e.skillNames.join("、"):"无",s=[{role:"system",content:"你是 MSS Claw 企业 AI 任务编排助手。根据用户任务输出 4-6 个简洁、可执行的中文步骤。只返回 JSON 字符串数组，不要 markdown 代码块，不要额外解释。"+((l=e.systemPrompt)!=null&&l.trim()?`
Agent 角色设定：${e.systemPrompt.trim()}`:"")},{role:"user",content:`任务类型：${e.actionType==="knowledge"?"知识检索/RAG":"营销数据分析"}
负责 Agent：${e.agentName}
已挂载 Skill：${t}
用户任务：${e.userTask}
参考模板（可优化但保持业务语义）：${JSON.stringify(e.fallbackSteps)}`}],a=await Re(s,{maxTokens:400,temperature:.2,signal:e.signal});return Tt(a,e.fallbackSteps)}function At(e){var a,l;const t=((a=e.systemPrompt)==null?void 0:a.trim())||`你是 ${e.agentName}，华为营销服 MSS Claw 平台的专业 AI Agent。`,n=e.actionType==="knowledge"&&((l=e.kbContext)!=null&&l.trim())?`

【知识库检索上下文】
${e.kbContext}

请在回答中用 [1][2] 形式标注引用编号，并确保结论可溯源。`:"";return[{role:"system",content:`${t}

请基于已确认的执行计划完成用户任务，输出结构清晰的中文 markdown 回复。
计划步骤：
${e.planSteps.map((i,o)=>`${o+1}. ${i}`).join(`
`)}
若为知识类任务，请标注引用来源；若为分析类任务，给出结论与建议。`+n},{role:"user",content:e.userTask}]}function Pt(e){return e.map((t,n)=>({skill:`PlanStep_${n+1}`,time:`${120+n*90}ms`,label:t,detail:t}))}function Ft(e){return new Promise(t=>setTimeout(t,e))}async function*_t(e){const{signal:t,planSteps:n,actionType:s,agentName:a,message:l,systemPrompt:i,kbContext:o}=e;if(t!=null&&t.aborted)return;const d=performance.now();yield{type:"execution_start",executionId:`llm_${Date.now()}`};for(let c=0;c<n.length;c++){if(t!=null&&t.aborted)return;const p=n[c],u=`PlanStep_${c+1}`;if(yield{type:"skill_start",skill:u,label:p},await Ft(120+Math.floor(Math.random()*80)),t!=null&&t.aborted)return;yield{type:"skill_end",skill:u,latency:`${120+c*90}ms`}}const m=At({userTask:l,actionType:s,agentName:a,systemPrompt:i,planSteps:n,kbContext:o});try{for await(const c of De(m,{signal:t,maxTokens:1200})){if(t!=null&&t.aborted)return;yield{type:"token",content:c}}}catch(c){yield{type:"error",message:c instanceof Error?c.message:"LLM 流式响应失败"};return}const f=((performance.now()-d)/1e3).toFixed(2);yield{type:"artifact",agentType:s},yield{type:"done",totalTime:`${f}s`,steps:Pt(n),agentName:a}}async function Et(e,t){var l;if(!T())return"";const n=e.trim().slice(0,400);if(!n)return"";const s=t!=null&&t.agentName?`绑定专家：${t.agentName}
`:"";return((l=(await Re([{role:"system",content:"你是任务标题助手。根据用户任务描述生成简洁中文标题：不超过16个字，不要引号，不要句号，不要「标题：」前缀，只输出标题本身。"},{role:"user",content:`${s}任务描述：
${n}`}],{maxTokens:32,temperature:.2,signal:t==null?void 0:t.signal})).replace(/^["'「『]|["'」』]$/g,"").replace(/^(标题|任务名)\s*[:：]\s*/u,"").split(/[\r\n]/)[0])==null?void 0:l.trim())??""}async function Ot(e){const t=e.apiKey.trim(),n=ge(e.baseUrl),s=E(e.model);if(!t)return{ok:!1,message:"请先填写 API Key"};if(!n)return{ok:!1,message:"请先填写 Base URL"};if(!s)return{ok:!1,message:"请先填写模型名称"};try{const a=await fetch(`${n}/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`},body:JSON.stringify({model:s,messages:[{role:"user",content:"ping"}],max_tokens:8})});if(a.ok)return{ok:!0,message:"连接成功 · 模型可用"};const l=await a.text();return{ok:!1,message:`失败 HTTP ${a.status}：${l.slice(0,120)}`}}catch(a){return{ok:!1,message:`连接失败：${a instanceof Error?a.message:String(a)}`}}}const js=Object.freeze(Object.defineProperty({__proto__:null,generatePlanStepsWithLlm:Lt,getActiveLlmConfig:J,isLlmConfigured:T,llmExecutionStream:_t,refineTaskTitleWithLlm:Et,streamChatCompletion:De,testLlmConnection:Ot},Symbol.toStringTag,{value:"Module"}));function Q(e,t,n="application/json"){const s=new Blob([t],{type:n}),a=URL.createObjectURL(s),l=document.createElement("a");l.href=a,l.download=e,l.click(),URL.revokeObjectURL(a)}function Rt(e){return e.trim().replace(/\/$/,"")}async function Ue(e,t){var l,i,o,d;const n=J(),s=await fetch(`${Rt(n.baseUrl)}/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n.apiKey.trim()}`},body:JSON.stringify({model:E(n.model),messages:e,max_tokens:(t==null?void 0:t.maxTokens)??3200,temperature:(t==null?void 0:t.temperature)??.4,stream:!1}),signal:t==null?void 0:t.signal});if(!s.ok){const m=await s.text();throw new Error(`LLM HTTP ${s.status}: ${m.slice(0,160)}`)}return((d=(o=(i=(l=(await s.json()).choices)==null?void 0:l[0])==null?void 0:i.message)==null?void 0:o.content)==null?void 0:d.trim())??""}function Dt(e){let t=e.trim();return t=t.replace(/^```(?:html|HTML|json|JSON|xml)?\s*\n?/i,""),t=t.replace(/\n?```\s*$/i,""),t.trim()}function Be(e){const t=Dt(e);try{return JSON.parse(t)}catch{const n=t.indexOf("{"),s=t.lastIndexOf("}");if(n>=0&&s>n)try{return JSON.parse(t.slice(n,s+1))}catch{return null}return null}}async function Ut(e){if(!T())throw new Error("LLM 未配置");const t=e.markdown.slice(0,12e3),n=e.type==="knowledge"?"知识检索 / 合规 / SOP / 引用溯源":"营销数据 / 经营分析 / 渠道与代表处",s=await Ue([{role:"system",content:["你是企业多场景分析报告架构师。根据 Markdown 提炼「分析看板」结构化 JSON，供前端固定模板渲染。","只返回 JSON，不要代码块，不要解释。字段：","{",'  "executiveSummary": "一句话摘要（≤80字）",','  "metrics": [{"label":"指标名","value":"如 +8.2% 或 #1","tone":"up|down|neutral|warn","hint":"可选"}],','  "insights": [{"title":"短标题","text":"发现陈述","kind":"finding|risk|action|cite"}],','  "risks": ["风险句"],','  "actions": ["行动句"],','  "cites": ["溯源/引用句"],','  "sectionOverview": [{"title":"章节名","pointCount":3}]',"}","要求：","1) 紧扣场景语义提炼，适配营销/知识/培训/电商等不同材料，不要套固定话术。","2) 不得编造原文没有的数字或事实；可归纳改写，但必须可追溯到 Markdown。","3) metrics 2-4 个；insights 2-4 个；risks/actions 各 1-4 条；尽量保留关键百分比与专有名词。"].join(`
`)},{role:"user",content:[`场景倾向：${n}`,`Agent：${e.agentName||"Agent"}`,`任务：${e.query||"（未填）"}`,"","Markdown 全文：",t].join(`
`)}],{maxTokens:2200,temperature:.35,signal:e.signal}),a=Be(s);if(!a)throw new Error("LLM 未返回有效分析看板 JSON");const l=Array.isArray(a.metrics)?a.metrics:[],i=Array.isArray(a.insights)?a.insights:[];return{executiveSummary:typeof a.executiveSummary=="string"?a.executiveSummary:void 0,metrics:l,insights:i,risks:Array.isArray(a.risks)?a.risks.map(String):void 0,actions:Array.isArray(a.actions)?a.actions.map(String):void 0,cites:Array.isArray(a.cites)?a.cites.map(String):void 0,sectionOverview:Array.isArray(a.sectionOverview)?a.sectionOverview:void 0,source:"model"}}async function Bt(e){if(!T())throw new Error("LLM 未配置");const t=e.markdown.slice(0,14e3),n=[`Agent：${e.agentName||"Agent"}`,`任务：${e.query||"（未填）"}`].join(`
`),s=await Ue([{role:"system",content:["你是企业高管汇报 PPT 结构专家。根据 Markdown 提炼幻灯片。","硬性要求：","1) 覆盖原文全部主要章节与关键结论/数据/建议，不得只摘前两段。",'2) 只返回 JSON：{"slides":[{"title":"...","bullets":["..."]}]}，不要代码块，不要解释。',"3) 建议 4-10 页：第 1 页封面（标题+背景），其后每章一页或合并极短章节；每页 3-7 条 bullets，bullet 用完整业务语句，保留关键数字。","4) 不要空泛套话；bullet 必须能追溯到原文信息。"].join(`
`)},{role:"user",content:`${n}

Markdown 全文：
${t}`}],{maxTokens:2800,temperature:.3,signal:e.signal}),a=Be(s),l=a==null?void 0:a.slides;if(!Array.isArray(l)||!l.length)throw new Error("LLM 未返回有效 PPT");return{slides:l.slice(0,12).map(i=>({title:String(i.title||"要点"),bullets:Array.isArray(i.bullets)?i.bullets.map(o=>String(o)).filter(Boolean).slice(0,10):["（无要点）"]}))}}function Ht(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function P(e){let t=Ht(e);return t=t.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>"),t=t.replace(/__(.+?)__/g,"<strong>$1</strong>"),t=t.replace(/`([^`]+)`/g,"<code>$1</code>"),t=t.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2">$1</a>'),t=t.replace(/(^|[\s（(「])\*([^*\n]+)\*(?=[\s）)」.,，。!！?？]|$)/g,"$1<em>$2</em>"),t}function K(e){let t=e.trim();return t.startsWith("|")&&(t=t.slice(1)),t.endsWith("|")&&(t=t.slice(0,-1)),t.split("|").map(n=>n.trim())}function F(e){const t=e.trim();return t.includes("-")?/^\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$/.test(t)||/^\|?(\s*:?-{3,}:?\s*\|)+\s*$/.test(t):!1}function ee(e){const t=e.trim();if(!t.includes("|"))return!1;if(F(t))return!0;const n=K(t);return n.length>=2&&n.some(s=>s.length>0)}function Gt(e){const t=e.trim();if(!t.includes("|")||!/\|[\t ]*:?-{3,}/.test(t))return null;const s=/\|?(?:\s*:?-{3,}:?\s*\|)+(?:\s*:?-{3,}:?\s*)?\|?/.exec(t);if(!s||s.index==null)return null;const a=t.slice(0,s.index).trim(),l=s[0].trim().startsWith("|")?s[0].trim():`|${s[0].trim()}`;let i=t.slice(s.index+s[0].length).trim();if(!a.includes("|"))return null;const d=K(a).length;if(d<2)return null;const m=[a.startsWith("|")?a:`| ${a} |`,l.endsWith("|")?l:`${l}|`];if(!i)return m;const f=i.split(/\|\s*\|/).map(p=>p.trim()).filter(Boolean).map(p=>{const u=p.startsWith("|")?p:`| ${p}`;return u.endsWith("|")?u:`${u} |`});if(f.length>=1)return m.push(...f),m;const c=K(i.startsWith("|")?i:`| ${i}`);for(let p=0;p+d<=c.length;p+=d){const u=c.slice(p,p+d);u.every(v=>!v)||m.push(`| ${u.join(" | ")} |`)}return m.length>=3?m:null}function $e(e){const t=e.map(o=>o.trim()).filter(Boolean);if(t.length<2)return"";let n=t[0],s=t.slice(1);s[0]&&F(s[0])&&(s=s.slice(1));const a=K(n);if(a.length<2)return"";const l=`<thead><tr>${a.map(o=>`<th>${P(o)}</th>`).join("")}</tr></thead>`,i=`<tbody>${s.filter(o=>!F(o)).map(o=>{const d=K(o);for(;d.length<a.length;)d.push("");return`<tr>${d.slice(0,a.length).map(m=>`<td>${P(m)}</td>`).join("")}</tr>`}).join("")}</tbody>`;return`<div class="md-table-wrap"><table class="md-table">${l}${i}</table></div>`}function Wt(e){const n=e.replace(/\r\n/g,`
`).split(`
`).flatMap(f=>Gt(f)??[f]),s=[];let a=0,l=!1,i=!1,o=[];const d=()=>{l&&(s.push("</ul>"),l=!1),i&&(s.push("</ol>"),i=!1)},m=()=>{if(!o.length)return;const f=o.join(" ").trim();f&&s.push(`<p>${P(f)}</p>`),o=[]};for(;a<n.length;){const p=(n[a]??"").trimEnd().trim();if(!p){m(),d(),a+=1;continue}if(ee(p)){const g=(n[a+1]??"").trim();if(F(p)||F(g)||ee(g)&&p.includes("|")&&g.includes("|")||F(g)){m(),d();const M=[];for(;a<n.length&&ee((n[a]??"").trim());)M.push((n[a]??"").trim()),a+=1;M.length>=2&&!F(M[0])?s.push($e(M)):M.length>=3&&s.push($e(M.slice(1)));continue}}if(/^---+$/.test(p)||/^\*\*\*+$/.test(p)){m(),d(),s.push("<hr/>"),a+=1;continue}const u=/^(#{1,4})\s+(.+)$/.exec(p);if(u){m(),d();const g=u[1].length;s.push(`<h${g}>${P(u[2])}</h${g}>`),a+=1;continue}if(/^>\s?/.test(p)){m(),d();const g=[];for(;a<n.length&&/^>\s?/.test((n[a]??"").trim());)g.push((n[a]??"").trim().replace(/^>\s?/,"")),a+=1;s.push(`<blockquote>${P(g.join(" "))}</blockquote>`);continue}const v=/^[-*·]\s+(.+)$/.exec(p);if(v){m(),i&&(s.push("</ol>"),i=!1),l||(s.push("<ul>"),l=!0),s.push(`<li>${P(v[1])}</li>`),a+=1;continue}const h=/^(\d+)[.)]\s+(.+)$/.exec(p);if(h){const g=h[2].trim(),k=g.length<=48&&!/[。；;！？!?]$/.test(g)&&(/表|图|归因|建议|结论|摘要|指标|分析|说明|概况|概述|TOP|可视化/.test(g)||g.length<=24);if(m(),k){d(),s.push(`<h3>${P(g)}</h3>`),a+=1;continue}l&&(s.push("</ul>"),l=!1),i||(s.push("<ol>"),i=!0),s.push(`<li>${P(g)}</li>`),a+=1;continue}d(),o.push(p),a+=1}return m(),d(),s.join(`
`)}function he(e){const t=e.replace(/\r\n/g,`
`).split(`
`),n=[];let s="",a=1,l=[],i=!1;const o=()=>{const d=l.join(`
`).trim();!i&&!d||(n.push({heading:s||(n.length===0?"概述":`要点 ${n.length+1}`),body:d,level:a}),l=[])};for(const d of t){const m=/^(#{1,4})\s+(.+)$/.exec(d.trim());if(m){(i||l.some(f=>f.trim()))&&o(),s=m[2].trim(),a=m[1].length,i=!0;continue}l.push(d)}return o(),n}function H(e,t=10){const n=e.split(/\r?\n/).map(a=>a.trim()).filter(Boolean),s=[];for(const a of n){if(/^---+$/.test(a)||/^>\s?/.test(a)||ee(a)||F(a))continue;const i=a.replace(/^[-*·]\s+/,"").replace(/^\d+[.)]\s+/,"").trim().replace(/\*\*(.+?)\*\*/g,"$1").replace(/\*(.+?)\*/g,"$1").replace(/`([^`]+)`/g,"$1").trim();if(i){if(!/^[-*·\d]/.test(a)&&i.length>90&&/[。；;]/.test(i)){const o=i.split(new RegExp("(?<=[。；;])\\s*")).map(d=>d.trim()).filter(d=>d.length>=6);for(const d of o)if(s.push(d.length>140?`${d.slice(0,138)}…`:d),s.length>=t)return s;continue}if(s.push(i.length>140?`${i.slice(0,138)}…`:i),s.length>=t)break}}if(!s.length){const a=e.replace(/\s+/g," ").trim();a&&s.push(a.length>140?`${a.slice(0,138)}…`:a)}return s}function $(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function _(e){return e.replace(/\*\*(.+?)\*\*/g,"$1").replace(/\*(.+?)\*/g,"$1").replace(/`([^`]+)`/g,"$1").replace(/\[([^\]]+)\]\([^)]+\)/g,"$1").trim()}function qt(e){const t=[],n=new Set,s=e.replace(/\*\*(.+?)\*\*/g,"$1").replace(/\*(.+?)\*/g,"$1").replace(/`([^`]+)`/g,"$1"),a=(m,f,c)=>{const p=_(m).replace(/[-*·:：]+$/g,"").trim()||"指标",u=Number(f),v=`${f}%`,h=`${p}|${v}`;n.has(h)||t.length>=6||(n.add(h),t.push({label:p.slice(0,18),value:v,tone:u>0?"up":u<0?"down":"neutral",hint:c}))},l=/([A-Za-z\u4e00-\u9fff][A-Za-z0-9\u4e00-\u9fff/\s]{0,20}?)\s*[:：]?\s*([+-]?\d+(?:\.\d+)?)\s*%/g;let i;for(;(i=l.exec(s))&&t.length<6;)a(i[1],i[2],"来自 Markdown 数值");const o=/(环比|同比|增长|下降|转化|占比|提升|回落)\s*([+-]?\d+(?:\.\d+)?)\s*%/g;for(;(i=o.exec(s))&&t.length<6;)a(i[1],i[2]);const d=/([A-Za-z\u4e00-\u9fff]{2,12}).{0,8}(?:排名|第)\s*(\d{1,2})\b/g;for(;(i=d.exec(s))&&t.length<6;){const m=`${_(i[1]).slice(0,10)}排名`,f=`#${i[2]}`,c=`${m}|${f}`;n.has(c)||(n.add(c),t.push({label:m,value:f,tone:"neutral",hint:"位次"}))}return t.slice(0,4)}function Kt(e){const t=he(e),n=[],s=H(e,24),a=l=>{n.some(i=>i.text===l.text)||n.push(l)};for(const l of s){const i=_(l);if(!(i.length<8)&&(/风险|合规|避免|警告|需复核|不得|禁止/.test(i)?a({title:"风险提示",text:i,kind:"risk"}):/建议|下一步|启动|同步|复核|提交|执行/.test(i)?a({title:"行动建议",text:i,kind:"action"}):/引用|来源|指南|规范|SOP|文档/.test(i)&&n.filter(o=>o.kind==="cite").length<2?a({title:"溯源引用",text:i,kind:"cite"}):n.filter(o=>o.kind==="finding").length<4&&a({title:"关键发现",text:i,kind:"finding"}),n.length>=8))break}for(const l of t){const i=l.heading,o=H(l.body,4);if(o.length){if(/结论|摘要|发现|洞察/.test(i))for(const d of o.slice(0,2))a({title:i,text:_(d),kind:"finding"});if(/下一步|建议|行动/.test(i))for(const d of o.slice(0,3))a({title:i,text:_(d),kind:"action"});if(/引用|来源|溯源/.test(i))for(const d of o.slice(0,2))a({title:i,text:_(d),kind:"cite"})}}return n.slice(0,8)}function Ie(e){return e==="up"?"kpi-up":e==="down"?"kpi-down":e==="warn"?"kpi-warn":"kpi-neutral"}function Yt(e){return e==="risk"?{label:"风险",cls:"tag-risk"}:e==="action"?{label:"行动",cls:"tag-action"}:e==="cite"?{label:"溯源",cls:"tag-cite"}:{label:"发现",cls:"tag-find"}}function Jt(e){const t=Math.abs(Number(String(e).replace("%","")));return Number.isFinite(t)?Math.max(12,Math.min(100,t*(t<=20?4:1))):40}function be(e,t){var c;const n=qt(e),s=Kt(e),a=he(e),l=s.filter(p=>p.kind==="finding"),i=s.filter(p=>p.kind==="risk").map(p=>p.text),o=s.filter(p=>p.kind==="action").map(p=>p.text),d=s.filter(p=>p.kind==="cite").map(p=>p.text),m=n.length>0?n:[{label:"章节覆盖",value:String(Math.max(1,a.length)),tone:"neutral",hint:"Markdown 章节"},{label:"提炼要点",value:String(Math.max(1,s.length)),tone:"up",hint:"自动抽取"},{label:"报告类型",value:(t==null?void 0:t.type)==="knowledge"?"知识":"分析",tone:"neutral"}];return{executiveSummary:(_(((c=l[0]||s[0])==null?void 0:c.text)||H(e,1)[0]||"")||"已根据 Markdown 完成结构化分析，详见下方看板与正文。").slice(0,160),metrics:m.slice(0,4),insights:(l.length?l:s).slice(0,4),risks:i.slice(0,4),actions:o.slice(0,4),cites:d.slice(0,3),sectionOverview:a.slice(0,6).map(p=>({title:p.heading,pointCount:H(p.body,20).length})),source:"local"}}function Vt(e,t){if(!t)return e;const n=c=>c==="up"||c==="down"||c==="neutral"||c==="warn",s=(t.metrics||[]).map(c=>({label:String((c==null?void 0:c.label)||"").trim().slice(0,18),value:String((c==null?void 0:c.value)||"").trim().slice(0,24),tone:n(c==null?void 0:c.tone)?c.tone:"neutral",hint:c!=null&&c.hint?String(c.hint).slice(0,24):"模型提炼"})).filter(c=>c.label&&c.value),a=(t.insights||[]).map(c=>({title:String((c==null?void 0:c.title)||"关键发现").trim().slice(0,40),text:String((c==null?void 0:c.text)||"").trim().slice(0,200),kind:(c==null?void 0:c.kind)==="risk"||(c==null?void 0:c.kind)==="action"||(c==null?void 0:c.kind)==="cite"||(c==null?void 0:c.kind)==="finding"?c.kind:"finding"})).filter(c=>c.text),l=(t.risks||[]).map(c=>String(c).trim()).filter(Boolean).slice(0,4),i=(t.actions||[]).map(c=>String(c).trim()).filter(Boolean).slice(0,4),o=(t.cites||[]).map(c=>String(c).trim()).filter(Boolean).slice(0,3),d=(t.sectionOverview||[]).map(c=>({title:String((c==null?void 0:c.title)||"").trim(),pointCount:Number(c==null?void 0:c.pointCount)||0})).filter(c=>c.title).slice(0,6),m=String(t.executiveSummary||"").trim().slice(0,160);return!!m&&(s.length>=2||a.length>=2||i.length+l.length>=2)?{executiveSummary:m||e.executiveSummary,metrics:s.length?s.slice(0,4):e.metrics,insights:a.length?a.slice(0,4):e.insights,risks:l.length?l:e.risks,actions:i.length?i:e.actions,cites:o.length?o:e.cites,sectionOverview:d.length?d:e.sectionOverview,source:"model"}:e}function Xt(e,t){const n=(t==null?void 0:t.board)??be(e,t),s=n.insights.filter(u=>u.kind==="finding").slice(0,3),a=n.metrics.slice(0,4),l=a.filter(u=>/%|％/.test(u.value)).slice(0,4),i=n.source==="model"?"模型按场景提炼 · 本地模板排版":"本地规则抽取 · 模板排版",o=a.map(u=>`<div class="kpi ${Ie(u.tone)}">
      <div class="kpi-label">${$(u.label)}</div>
      <div class="kpi-value">${$(u.value)}</div>
      ${u.hint?`<div class="kpi-hint">${$(u.hint)}</div>`:""}
    </div>`).join(""),d=l.length>=2?`<div class="panel">
      <div class="panel-hd"><span>指标对照</span><span class="muted">${n.source==="model"?"模型提炼数值":"由文中百分比生成"}</span></div>
      <div class="bars">
        ${l.map(u=>`<div class="bar-row">
          <div class="bar-label">${$(u.label)}</div>
          <div class="bar-track"><div class="bar-fill ${Ie(u.tone)}" style="width:${Jt(u.value)}%"></div></div>
          <div class="bar-val">${$(u.value)}</div>
        </div>`).join("")}
      </div>
    </div>`:`<div class="panel">
      <div class="panel-hd"><span>结构概览</span><span class="muted">章节拆解</span></div>
      <div class="struct-grid">
        ${n.sectionOverview.slice(0,6).map((u,v)=>`<div class="struct-item">
          <span class="struct-idx">${v+1}</span>
          <span class="struct-title">${$(u.title)}</span>
          <span class="struct-len">${u.pointCount} 要点</span>
        </div>`).join("")}
      </div>
    </div>`,m=(s.length?s:n.insights.slice(0,3)).map(u=>{const v=Yt(u.kind);return`<div class="insight-card">
        <span class="tag ${v.cls}">${v.label}</span>
        <h4>${$(u.title)}</h4>
        <p>${$(u.text)}</p>
      </div>`}).join(""),f=n.risks.length>0?n.risks.map(u=>`<li>${$(u)}</li>`).join(""):"<li>文中未检出显式风险词；请结合正文复核业务口径。</li>",c=n.actions.length>0?n.actions.map((u,v)=>`<li><span class="step">${v+1}</span>${$(u)}</li>`).join(""):'<li><span class="step">1</span>复核正文结论后同步相关 Owner。</li>',p=n.cites.length>0?`<div class="panel cite-panel">
      <div class="panel-hd"><span>溯源要点</span><span class="muted">${n.source==="model"?"模型归纳":"来自引用相关语句"}</span></div>
      <ul class="cite-list">${n.cites.map(u=>`<li>${$(u)}</li>`).join("")}</ul>
    </div>`:"";return`
<section class="analysis">
  <div class="analysis-hd">
    <div>
      <p class="analysis-eyebrow">ANALYSIS BOARD</p>
      <h2>智能分析看板</h2>
      <p class="analysis-desc">${$(i)}：指标、发现、风险与行动，便于多场景快速阅览。</p>
    </div>
    <div class="exec-pill">
      <span class="exec-label">一句话摘要</span>
      <p>${$(_(n.executiveSummary).slice(0,160))}</p>
    </div>
  </div>

  <div class="kpi-grid">${o}</div>

  <div class="split">
    ${d}
    <div class="panel">
      <div class="panel-hd"><span>关键发现</span><span class="muted">${n.source==="model"?"模型聚类":"自动聚类"}</span></div>
      <div class="insight-grid">${m||'<p class="muted">暂无提炼要点</p>'}</div>
    </div>
  </div>

  <div class="split split-2">
    <div class="panel panel-risk">
      <div class="panel-hd"><span>风险与注意</span></div>
      <ul class="bullet-rich">${f}</ul>
    </div>
    <div class="panel panel-action">
      <div class="panel-hd"><span>行动路线</span></div>
      <ul class="action-list">${c}</ul>
    </div>
  </div>

  ${p}
</section>
<section class="body-hd">
  <p class="analysis-eyebrow">FULL REPORT</p>
  <h2>正文详情</h2>
  <p class="analysis-desc">完整保留 Markdown 原文结构与表述，供核对与转发。</p>
</section>`}const Qt=`
  .analysis { margin: 22px 0 8px; }
  .analysis-hd, .body-hd { margin: 8px 0 14px; }
  .analysis-eyebrow {
    margin: 0 0 6px; font-size: 10px; font-weight: 700; letter-spacing: .14em;
    color: #0f766e; text-transform: uppercase;
  }
  .analysis h2, .body-hd h2 {
    margin: 0 0 6px; font-size: 18px; color: #134e4a; letter-spacing: -.02em;
    border: 0; padding: 0;
  }
  .analysis-desc { margin: 0; font-size: 12.5px; color: #71717a; }
  .exec-pill {
    margin-top: 12px; padding: 12px 14px; border-radius: 14px;
    background: linear-gradient(135deg, #f0fdfa, #ecfeff);
    border: 1px solid #99f6e4;
  }
  .exec-label {
    display: inline-block; font-size: 10px; font-weight: 700; color: #0f766e;
    letter-spacing: .08em; text-transform: uppercase; margin-bottom: 4px;
  }
  .exec-pill p { margin: 0; font-size: 13.5px; color: #115e59; line-height: 1.55; font-weight: 600; }
  .kpi-grid {
    display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 16px 0;
  }
  .kpi {
    border-radius: 14px; padding: 12px 12px 10px; background: #fafafa;
    border: 1px solid #e4e4e7; min-height: 88px;
  }
  .kpi-up { background: #f0fdfa; border-color: #99f6e4; }
  .kpi-down { background: #fff1f2; border-color: #fecdd3; }
  .kpi-warn { background: #fffbeb; border-color: #fde68a; }
  .kpi-neutral { background: #f8fafc; border-color: #e2e8f0; }
  .kpi-label { font-size: 11px; color: #71717a; font-weight: 600; }
  .kpi-value { margin-top: 6px; font-size: 22px; font-weight: 700; letter-spacing: -.03em; color: #18181b; }
  .kpi-up .kpi-value { color: #0f766e; }
  .kpi-down .kpi-value { color: #e11d48; }
  .kpi-hint { margin-top: 4px; font-size: 10px; color: #a1a1aa; }
  .split { display: grid; grid-template-columns: 1.05fr 1fr; gap: 12px; margin: 12px 0; }
  .split-2 { grid-template-columns: 1fr 1fr; }
  .panel {
    border: 1px solid #e4e4e7; border-radius: 16px; padding: 14px 14px 12px; background: #fff;
  }
  .panel-hd {
    display: flex; justify-content: space-between; align-items: baseline; gap: 8px;
    margin-bottom: 12px; font-size: 13px; font-weight: 700; color: #18181b;
  }
  .panel-hd .muted, .muted { font-size: 11px; color: #a1a1aa; font-weight: 500; }
  .bars { display: flex; flex-direction: column; gap: 10px; }
  .bar-row { display: grid; grid-template-columns: 72px 1fr 48px; gap: 8px; align-items: center; }
  .bar-label { font-size: 11px; color: #52525b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bar-track { height: 8px; border-radius: 999px; background: #f4f4f5; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 999px; background: #0f766e; }
  .bar-fill.kpi-down { background: #e11d48; }
  .bar-fill.kpi-up { background: #0d9488; }
  .bar-val { font-size: 11px; font-weight: 700; color: #3f3f46; text-align: right; }
  .struct-grid { display: flex; flex-direction: column; gap: 8px; }
  .struct-item {
    display: grid; grid-template-columns: 22px 1fr auto; gap: 8px; align-items: center;
    padding: 8px 10px; border-radius: 10px; background: #fafafa; border: 1px solid #f4f4f5;
  }
  .struct-idx {
    width: 22px; height: 22px; border-radius: 7px; background: #134e4a; color: #fff;
    font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center;
  }
  .struct-title { font-size: 12.5px; font-weight: 600; color: #27272a; }
  .struct-len { font-size: 10px; color: #a1a1aa; }
  .insight-grid { display: flex; flex-direction: column; gap: 8px; }
  .insight-card {
    border-radius: 12px; padding: 10px 12px; background: #fafafa; border: 1px solid #f4f4f5;
  }
  .insight-card h4 { margin: 6px 0 4px; font-size: 12.5px; color: #18181b; }
  .insight-card p { margin: 0; font-size: 12px; color: #3f3f46; line-height: 1.55; }
  .tag {
    display: inline-block; font-size: 10px; font-weight: 700; border-radius: 999px;
    padding: 2px 7px; letter-spacing: .02em;
  }
  .tag-find { background: #ecfeff; color: #0e7490; }
  .tag-risk { background: #fff1f2; color: #be123c; }
  .tag-action { background: #f0fdfa; color: #0f766e; }
  .tag-cite { background: #f4f4f5; color: #52525b; }
  .panel-risk { background: linear-gradient(180deg, #fff1f2 0%, #fff 48%); }
  .panel-action { background: linear-gradient(180deg, #f0fdfa 0%, #fff 48%); }
  .bullet-rich, .action-list, .cite-list { margin: 0; padding-left: 0; list-style: none; }
  .bullet-rich li, .cite-list li {
    position: relative; padding: 7px 0 7px 14px; font-size: 12.5px; color: #3f3f46; line-height: 1.55;
    border-bottom: 1px dashed #f4f4f5;
  }
  .bullet-rich li:last-child, .cite-list li:last-child, .action-list li:last-child { border-bottom: 0; }
  .bullet-rich li::before {
    content: ""; position: absolute; left: 0; top: 14px; width: 6px; height: 6px; border-radius: 50%;
    background: #e11d48;
  }
  .action-list li {
    display: flex; gap: 8px; align-items: flex-start; padding: 8px 0;
    font-size: 12.5px; color: #3f3f46; line-height: 1.55; border-bottom: 1px dashed #e7e5e4;
  }
  .action-list .step {
    flex-shrink: 0; width: 18px; height: 18px; border-radius: 6px; background: #0f766e; color: #fff;
    font-size: 10px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; margin-top: 1px;
  }
  .cite-panel { margin-top: 12px; }
  @media (max-width: 720px) {
    .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .split, .split-2 { grid-template-columns: 1fr; }
    .bar-row { grid-template-columns: 64px 1fr 40px; }
  }
`;function Zt(e){return e!=null&&e.length?e.join(" · "):""}function en(e,t){var s;const n=/^#\s+(.+)$/m.exec(e);return((s=n==null?void 0:n[1])==null?void 0:s.trim())||t}function tn(e){return/[+-]?\d+(\.\d+)?%|#\d+|第\s*\d+|环比|同比|万元|GMV|SO\b/.test(e)}function He(e){return e.length?e.filter(tn).length>=Math.ceil(e.length*.5)&&e.length<=6?"metrics":e.length<=6?"cards":"list":"list"}function de(e,t=72){const n=e.replace(/\s+/g," ").trim();return n.length>t?`${n.slice(0,t-1)}…`:n}function Ge(e,t){var m,f,c;const n=((m=t==null?void 0:t.title)==null?void 0:m.trim())||((f=e[0])==null?void 0:f.title)||"业务汇报",s=e.filter(p=>p.role!=="cover"&&p.role!=="closing").filter(p=>!/谢谢|thank\s*you|致谢/i.test(p.title)).map(p=>({...p,role:p.role||"content",layout:p.layout||He(p.bullets),bullets:p.bullets.map(u=>de(u,88)).slice(0,6)})),a=s[0]&&s[0].title===n&&s[0].bullets.every(p=>/Agent|Skill|任务|基于/.test(p))?s.slice(1):s,l=a.slice(0,5).map((p,u)=>`${u+1}. ${p.title}`),i={role:"cover",layout:"cover",title:n,subtitle:"MSS Claw · 智能交付汇报",bullets:[],meta:[t!=null&&t.agentName?`汇报人：${t.agentName}`:"MSS AI 提效作战平台",(c=t==null?void 0:t.skills)!=null&&c.length?`能力：${Zt(t.skills)}`:"基于 Markdown 智能生成",t!=null&&t.query?`议题：${t.query.slice(0,42)}`:new Date().toLocaleDateString("zh-CN")]},o=l.length>=2?{role:"agenda",layout:"cards",title:"汇报议程",subtitle:"Agenda",bullets:l}:null,d={role:"closing",layout:"closing",title:"谢谢",subtitle:"Thank You",bullets:["欢迎交流与反馈","MSS Claw · 让业务交付更高效"],meta:[(t==null?void 0:t.agentName)||"MSS Claw",new Date().toLocaleDateString("zh-CN")]};return[i,...o?[o]:[],...a.slice(0,8),d]}function nn(e,t){const n=he(e),s=en(e,"业务汇报"),a=[];for(const l of n){if(l.level===1&&l.heading===s&&!l.body.trim())continue;const i=H(l.body,8).filter(o=>!o.includes("|")&&!/^[-:]+$/.test(o)).map(o=>de(o,88));!i.length&&l.level===1||i.length&&a.push({role:"content",title:l.heading.replace(/^\d+[.)]\s*/,""),bullets:i,layout:He(i)})}return a.length||a.push({role:"content",title:"核心要点",bullets:H(e,6).map(l=>de(l,88)),layout:"cards"}),Ge(a,{title:s,agentName:t==null?void 0:t.agentName,query:t==null?void 0:t.query,skills:t==null?void 0:t.skills})}function sn(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}function an(e,t,n){const s=new Uint8Array(t.byteLength);s.set(t);const a=new Blob([s],{type:n}),l=URL.createObjectURL(a),i=document.createElement("a");i.href=l,i.download=e,i.click(),URL.revokeObjectURL(l)}function rn(e,t="l"){return`<p:txBody><a:bodyPr/><a:lstStyle/>${e.map((s,a)=>{const l=(s.size??18)*100,i=s.bold?"<a:b/>":"",o=s.color??"1A1A1A";return`<a:p>
  <a:pPr algn="${t}">
    <a:spcBef><a:spcPts val="${a===0?0:120}"/></a:spcBef>
  </a:pPr>
  <a:r>
    <a:rPr lang="zh-CN" sz="${l}" dirty="0">${i}<a:solidFill><a:srgbClr val="${o}"/></a:solidFill>
      <a:latin typeface="Microsoft YaHei"/><a:ea typeface="Microsoft YaHei"/>
    </a:rPr>
    <a:t>${sn(s.text)}</a:t>
  </a:r>
  <a:endParaRPr lang="zh-CN" sz="${l}"/>
</a:p>`}).join("")}</p:txBody>`}let pe=10;function ln(){return pe+=1,pe}function C(e){var n;const t=(n=e.lines)!=null&&n.length?rn(e.lines,e.align??"l"):'<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="zh-CN"/></a:p></p:txBody>';return`<p:sp>
  <p:nvSpPr><p:cNvPr id="${ln()}" name="Shape"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
  <p:spPr>
    <a:xfrm><a:off x="${e.x}" y="${e.y}"/><a:ext cx="${e.cx}" cy="${e.cy}"/></a:xfrm>
    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
    <a:solidFill><a:srgbClr val="${e.fill}"/></a:solidFill>
    <a:ln><a:noFill/></a:ln>
  </p:spPr>
  ${t}
</p:sp>`}const ne=12192e3,ye=6858e3,z="CF0A2C",se="1A1A1A",Y="595959",me="F7F7F7";function on(e){const t=(e.meta??[]).slice(0,3),n=[C({x:0,y:0,cx:72e4,cy:ye,fill:z}),C({x:11e5,y:9e5,cx:95e5,cy:5e5,fill:"FFFFFF",lines:[{text:"HUAWEI STYLE · MSS CLAW",size:12,bold:!0,color:z}]}),C({x:11e5,y:22e5,cx:98e5,cy:16e5,fill:"FFFFFF",lines:[{text:e.subtitle||"智能交付汇报",size:14,color:Y},{text:e.title||"业务汇报",size:36,bold:!0,color:se}]}),C({x:11e5,y:4e6,cx:12e5,cy:6e4,fill:z}),...t.map((s,a)=>C({x:11e5,y:43e5+a*42e4,cx:9e6,cy:38e4,fill:"FFFFFF",lines:[{text:s,size:13,color:Y}]}))];return ve(n.join(""))}function cn(e){const t=[C({x:0,y:0,cx:ne,cy:12e4,fill:z}),C({x:12e5,y:22e5,cx:98e5,cy:22e5,fill:"FFFFFF",align:"ctr",lines:[{text:e.title||"谢谢",size:48,bold:!0,color:se},{text:e.subtitle||"Thank You",size:18,bold:!0,color:z},...e.bullets.slice(0,2).map(n=>({text:n,size:13,color:Y}))]}),C({x:0,y:ye-7e5,cx:ne,cy:7e5,fill:me,align:"ctr",lines:[{text:(e.meta??["MSS Claw"]).join(" · "),size:11,color:Y}]})];return ve(t.join(""))}function dn(e){const t=e.bullets.slice(0,6),s=e.layout==="metrics"?t.map((l,i)=>{const o=i%3,d=Math.floor(i/3),m=l.match(/([+-]?\d+(?:\.\d+)?%|#\d+|第\s*\d+)/),f=(m==null?void 0:m[1])||String(i+1),c=l.replace(f,"").replace(/^[:：\s-]+/,"").trim()||l,p=7e5+o*37e5,u=18e5+d*2e6;return C({x:p,y:u,cx:34e5,cy:17e5,fill:me,lines:[{text:c.slice(0,28),size:11,color:Y},{text:f,size:28,bold:!0,color:z}]})}):t.map((l,i)=>{const o=i%2,d=Math.floor(i/2),m=7e5+o*56e5,f=17e5+d*14e5;return[C({x:m,y:f,cx:12e4,cy:12e5,fill:z}),C({x:m+12e4,y:f,cx:5e6,cy:12e5,fill:me,lines:[{text:String(i+1).padStart(2,"0"),size:11,bold:!0,color:z},{text:l.slice(0,80),size:13,color:se}]})].join("")}),a=[C({x:0,y:0,cx:ne,cy:9e4,fill:z}),C({x:7e5,y:4e5,cx:1e7,cy:11e5,fill:"FFFFFF",lines:[{text:e.subtitle||(e.role==="agenda"?"AGENDA":"KEY POINTS"),size:11,bold:!0,color:z},{text:e.title,size:24,bold:!0,color:se}]}),...Array.isArray(s)?s:[s]];return ve(a.flat().join(""))}function ve(e){return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      ${e}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`}function pn(e){return pe=10,e.role==="cover"||e.layout==="cover"?on(e):e.role==="closing"||e.layout==="closing"?cn(e):dn(e)}const mn=e=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  ${Array.from({length:e},(t,n)=>`<Override PartName="/ppt/slides/slide${n+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join(`
  `)}
</Types>`,un=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,fn=e=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
 saveSubsetFonts="1">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>
    ${Array.from({length:e},(t,n)=>`<p:sldId id="${256+n}" r:id="rId${n+2}"/>`).join(`
    `)}
  </p:sldIdLst>
  <p:sldSz cx="${ne}" cy="${ye}" type="screen16x9"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`,xn=e=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${Array.from({length:e},(t,n)=>`<Relationship Id="rId${n+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${n+1}.xml"/>`).join(`
  `)}
  <Relationship Id="rId${e+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>`,gn=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`,hn=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank">
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`,bn=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`,yn=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
</p:sldMaster>`,vn=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`,wn=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="MSSClaw">
  <a:themeElements>
    <a:clrScheme name="MSS">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="1A1A1A"/></a:dk2>
      <a:lt2><a:srgbClr val="F7F7F7"/></a:lt2>
      <a:accent1><a:srgbClr val="CF0A2C"/></a:accent1>
      <a:accent2><a:srgbClr val="A10822"/></a:accent2>
      <a:accent3><a:srgbClr val="595959"/></a:accent3>
      <a:accent4><a:srgbClr val="8C8C8C"/></a:accent4>
      <a:accent5><a:srgbClr val="D9D9D9"/></a:accent5>
      <a:accent6><a:srgbClr val="E5E5E5"/></a:accent6>
      <a:hlink><a:srgbClr val="CF0A2C"/></a:hlink>
      <a:folHlink><a:srgbClr val="A10822"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="MSS">
      <a:majorFont><a:latin typeface="Microsoft YaHei"/><a:ea typeface="Microsoft YaHei"/><a:cs typeface=""/></a:majorFont>
      <a:minorFont><a:latin typeface="Microsoft YaHei"/><a:ea typeface="Microsoft YaHei"/><a:cs typeface=""/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="MSS">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
        <a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
        <a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`;function kn(){const e=new Date().toISOString();return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/"
 xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:dcmitype="http://purl.org/dc/dcmitype/"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>MSS Claw PPT</dc:title>
  <dc:creator>MSS Claw</dc:creator>
  <cp:lastModifiedBy>MSS Claw</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${e}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${e}</dcterms:modified>
</cp:coreProperties>`}function Sn(e){return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
 xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>MSS Claw</Application>
  <Slides>${e}</Slides>
</Properties>`}function jn(e){const t=e.length?e:[{title:"空演示",bullets:[],role:"content"}],n=t.length,s={"[Content_Types].xml":N(mn(n)),"_rels/.rels":N(un),"docProps/core.xml":N(kn()),"docProps/app.xml":N(Sn(n)),"ppt/presentation.xml":N(fn(n)),"ppt/_rels/presentation.xml.rels":N(xn(n)),"ppt/slideLayouts/slideLayout1.xml":N(hn),"ppt/slideLayouts/_rels/slideLayout1.xml.rels":N(bn),"ppt/slideMasters/slideMaster1.xml":N(yn),"ppt/slideMasters/_rels/slideMaster1.xml.rels":N(vn),"ppt/theme/theme1.xml":N(wn)};return t.forEach((a,l)=>{const i=l+1;s[`ppt/slides/slide${i}.xml`]=N(pn(a)),s[`ppt/slides/_rels/slide${i}.xml.rels`]=N(gn)}),et(s,{level:6})}function Nn(e,t){const n=e.toLowerCase().endsWith(".pptx")?e:`${e}.pptx`,s=jn(t);an(n,s,"application/vnd.openxmlformats-officedocument.presentationml.presentation")}function We(e){return e!=null&&e.length?e.join(" · "):"（未挂载 Skill）"}function qe(e){const t=(e??"").trim();return t?t.length>8e3?`${t.slice(0,8e3)}

…（后续内容已截断）`:t:""}function $n(e){const t=qe(e.agentReply);return["# 任务交付报告","",`> Agent：${e.agentName||"数据分析 Agent"}  ·  Skill：${We(e.skills)}`,"","## 任务目标","",e.query||"（未填写）","","## 执行摘要","",t||["- 拉美穿戴 SO 环比 **+8.2%**，墨西哥、阿根廷贡献主要增量","- 竞品降价对巴西影响显著，建议启动 NBA 补贴券策略","- IoT 剔除后排名稳定，渠道促销为首要归因因子"].join(`
`),"","## 下一步","","1. 复核巴西价盘与竞品价差","2. 同步渠道与代表处执行 NBA","3. 下周复盘 SO / 转化交叉指标","","---",`*生成时间：${new Date().toLocaleString("zh-CN")}*`].join(`
`)}function In(e){var s,a;const t=qe(e.agentReply),n=((a=(s=e.kbArtifact)==null?void 0:s.citations)==null?void 0:a.slice(0,8).map((l,i)=>{var o;return`${i+1}. **${l.docTitle}** — ${((o=l.snippet)==null?void 0:o.slice(0,120))||l.docId}`}).join(`
`))||`1. 拉美合规准入指南
2. 3C 营销话术规范`;return["# 知识检索交付","",`> Agent：${e.agentName||"知识 Agent"}  ·  Skill：${We(e.skills)}`,"","## 查询","",e.query||"（未填写）","","## 结论","",t||["- 可穿戴营销物料需避免未获批医疗功效表述","- 建议提交 MKT 合规复核后再对外发布","- 引用已按密级与可见性过滤"].join(`
`),"","## 引用来源","",n,"","---",`*生成时间：${new Date().toLocaleString("zh-CN")}*`].join(`
`)}function Cn(e,t){const n=t.query?t.query.slice(0,80):"";return`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${W(t.title)}</title>
<style>
  :root {
    --ink: #18181b;
    --muted: #71717a;
    --line: #e4e4e7;
    --bg: #f4f4f5;
    --card: #ffffff;
    --accent: #0f766e;
    --accent-soft: #ccfbf1;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background:
      radial-gradient(1200px 400px at 10% -10%, #d1fae5 0%, transparent 55%),
      radial-gradient(900px 360px at 100% 0%, #e0f2fe 0%, transparent 50%),
      var(--bg);
    color: var(--ink);
    font-family: "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    line-height: 1.7;
    -webkit-font-smoothing: antialiased;
  }
  .page { max-width: 820px; margin: 0 auto; padding: 28px 18px 48px; }
  .sheet {
    background: var(--card);
    border: 1px solid rgba(24,24,27,.06);
    border-radius: 20px;
    box-shadow: 0 18px 50px rgba(24,24,27,.08);
    overflow: hidden;
  }
  .hero {
    padding: 28px 32px 22px;
    background: linear-gradient(135deg, #134e4a 0%, #0f766e 48%, #155e75 100%);
    color: #fff;
  }
  .hero .eyebrow {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 600; letter-spacing: .04em;
    text-transform: uppercase; opacity: .85; margin-bottom: 10px;
  }
  .hero h1 {
    margin: 0 0 10px; font-size: 26px; line-height: 1.25; font-weight: 700; letter-spacing: -.02em;
  }
  .hero .meta { margin: 0; font-size: 12.5px; opacity: .88; }
  .content { padding: 8px 32px 32px; }
  .content > .body-detail h1 { font-size: 22px; margin: 24px 0 10px; letter-spacing: -.02em; }
  .content > .body-detail h2 {
    font-size: 16px; margin: 28px 0 10px; padding-bottom: 8px;
    border-bottom: 1px solid var(--line); color: #134e4a;
  }
  .content > .body-detail h3 { font-size: 14px; margin: 20px 0 8px; color: #3f3f46; }
  .content > .body-detail h4 { font-size: 13px; margin: 16px 0 6px; color: #52525b; }
  .content > .body-detail p { margin: 0 0 12px; font-size: 14px; color: #27272a; }
  .content > .body-detail ul, .content > .body-detail ol { margin: 0 0 14px; padding-left: 1.25em; }
  .content > .body-detail li { margin: 0 0 6px; font-size: 14px; color: #27272a; }
  .content > .body-detail li::marker { color: var(--accent); }
  .content > .body-detail strong { color: #134e4a; font-weight: 700; }
  .content > .body-detail em { color: #3f3f46; }
  .content > .body-detail code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 12px; background: #f4f4f5; border: 1px solid var(--line);
    border-radius: 6px; padding: 1px 6px;
  }
  .content > .body-detail a { color: #0e7490; text-decoration: none; border-bottom: 1px solid rgba(14,116,144,.25); }
  .content > .body-detail blockquote {
    margin: 14px 0 18px; padding: 12px 16px;
    background: var(--accent-soft); border-left: 3px solid var(--accent);
    border-radius: 0 12px 12px 0; color: #115e59; font-size: 13px;
  }
  .content > .body-detail hr {
    border: 0; height: 1px; margin: 28px 0;
    background: linear-gradient(90deg, transparent, var(--line), transparent);
  }
  .content > .body-detail .md-table-wrap {
    margin: 14px 0 18px; overflow-x: auto; border-radius: 14px;
    border: 1px solid var(--line); background: #fff;
    box-shadow: 0 1px 0 rgba(24,24,27,.03);
  }
  .content > .body-detail table.md-table {
    width: 100%; border-collapse: collapse; min-width: 480px; font-size: 12.5px;
  }
  .content > .body-detail table.md-table th {
    text-align: left; padding: 10px 12px; background: #f0fdfa; color: #134e4a;
    font-weight: 700; border-bottom: 1px solid #99f6e4; white-space: nowrap;
  }
  .content > .body-detail table.md-table td {
    padding: 9px 12px; border-bottom: 1px solid #f4f4f5; color: #3f3f46;
    vertical-align: top; line-height: 1.5;
  }
  .content > .body-detail table.md-table tr:last-child td { border-bottom: 0; }
  .content > .body-detail table.md-table tbody tr:nth-child(even) td { background: #fafafa; }
  .footer {
    margin-top: 8px; padding-top: 16px; border-top: 1px dashed var(--line);
    font-size: 11px; color: var(--muted); display: flex; justify-content: space-between; gap: 12px;
  }
  ${Qt}
  @media (max-width: 640px) {
    .hero, .content { padding-left: 20px; padding-right: 20px; }
    .hero h1 { font-size: 22px; }
  }
</style>
</head>
<body>
  <div class="page">
    <article class="sheet">
      <header class="hero">
        <div class="eyebrow">MSS Claw · 分析报告</div>
        <h1>${W(t.title)}</h1>
        <p class="meta">${W(t.agent)}${n?` · ${W(n)}`:""} · Markdown 智能分析 + 正文详稿</p>
      </header>
      <div class="content">
        ${t.analysisHtml||""}
        <div class="body-detail">
          ${e}
        </div>
        <div class="footer">
          <span>智能分析看板 + Markdown 正文 · 指标与要点自动抽取</span>
          <span>${W(new Date().toLocaleString("zh-CN"))}</span>
        </div>
      </div>
    </article>
  </div>
</body>
</html>`}function W(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Ke(e,t){var s;const n=/^#\s+(.+)$/m.exec(e);return((s=n==null?void 0:n[1])==null?void 0:s.trim())||t}function Ye(e,t,n){const s=Wt(e),a=s.replace(/^\s*<h1>[\s\S]*?<\/h1>\s*/i,""),l=Ke(e,(t==null?void 0:t.type)==="knowledge"?"知识检索交付":"任务交付报告"),i=Xt(e,{type:t==null?void 0:t.type,board:n??be(e,{type:t==null?void 0:t.type})});return Cn(a||s,{title:l,agent:(t==null?void 0:t.agentName)||"Agent",query:(t==null?void 0:t.query)||"",analysisHtml:i})}function Mn(e,t){return nn(e,t)}function zn(e,t,n){if(e==="html"){const a=Ye(t,n);return{html:a,size:`${Math.max(6,Math.round(a.length/1024))} KB`,pendingGenerate:!1}}const s=Mn(t,n);return{slides:s,size:`${Math.max(.6,s.length*.35).toFixed(1)} MB`,pendingGenerate:!1}}function Ce(e){var t,n,s;return e.pendingGenerate?!1:e.kind==="markdown"?!!((t=e.markdown)!=null&&t.trim()):e.kind==="html"?!!((n=e.html)!=null&&n.trim()):e.kind==="ppt"?!!((s=e.slides)!=null&&s.length):e.kind==="xlsx"?!!e.table:e.kind==="board"||e.kind==="knowledge"}function Me(e){return e==="html"||e==="ppt"}async function Tn(e,t,n,s){var i,o;const a=t.trim();if(!a)throw new Error("请先确保 Markdown 交付件有内容");const l=zn(e,a,n);if(e==="html"){let d=be(a,{type:n.type});if(T())try{const f=await Ut({markdown:a,agentName:n.agentName,query:n.query,type:n.type,signal:s});if(s!=null&&s.aborted)throw new Error("已取消生成");d=Vt(d,f)}catch{}else await new Promise(f=>setTimeout(f,280));if(s!=null&&s.aborted)throw new Error("已取消生成");const m=Ye(a,n,d);return{html:m,size:`${Math.max(6,Math.round(m.length/1024))} KB`,pendingGenerate:!1}}if(T())try{const d=await Bt({kind:"ppt",markdown:a,agentName:n.agentName,query:n.query,type:n.type,signal:s});if((i=d.slides)!=null&&i.length){const m=((o=l.slides)==null?void 0:o.length)??0;if(d.slides.length+1>=m||d.slides.length>=4){const f=Ge(d.slides.map(c=>({title:c.title,bullets:c.bullets,role:"content"})),{title:Ke(a,"业务汇报"),agentName:n.agentName,query:n.query,skills:n.skills});return{slides:f,size:`${Math.max(.6,f.length*.35).toFixed(1)} MB`,pendingGenerate:!1}}}}catch{}if(await new Promise(d=>setTimeout(d,280)),s!=null&&s.aborted)throw new Error("已取消生成");return l}function ze(e,t,n,s,a,l){return{id:e,kind:t,name:n,title:s,size:"待生成",icon:a,iconClass:l,pendingGenerate:!0}}function Ln(e){const t=e.type==="marketing"?$n(e):In(e),n=e.type==="marketing"?"m":"k";return[{id:`${n}-md`,kind:"markdown",name:"Markdown",title:"Markdown",size:`${Math.max(2,Math.round(t.length/1024))} KB`,icon:"fa-file-lines",iconClass:"text-zinc-700",markdown:t,pendingGenerate:!1},ze(`${n}-html`,"html","HTML","HTML","fa-file-code","text-orange-600"),ze(`${n}-ppt`,"ppt","PPT","PPT","fa-file-powerpoint","text-amber-600")]}function An(e,t=""){var n;if(e.kind==="markdown"&&e.markdown){Q(`${e.name}.md`,e.markdown,"text/markdown;charset=utf-8");return}if(e.kind==="html"&&e.html){Q(`${e.name}.html`,e.html,"text/html;charset=utf-8");return}if(e.kind==="ppt"&&((n=e.slides)!=null&&n.length)){Nn(e.name,e.slides);return}if(e.kind==="xlsx"&&e.table){const s=[e.table.headers.join(","),...e.table.rows.map(a=>a.join(","))].join(`
`);Q(`${e.name}.csv`,`${s}
# ${t}`,"text/csv;charset=utf-8");return}Q(`${e.name}.json`,JSON.stringify({id:e.id,kind:e.kind,query:t,exportedAt:new Date().toISOString()},null,2))}const x={red:"#CF0A2C",redDark:"#A10822",ink:"#1A1A1A",mute:"#595959",line:"#E5E5E5",soft:"#F7F7F7",white:"#FFFFFF"};function Pn({index:e,total:t,title:n,children:s}){return r.jsxs("div",{className:"overflow-hidden rounded-lg bg-white shadow-[0_12px_32px_rgba(0,0,0,0.12)] ring-1 ring-black/5",children:[r.jsxs("div",{className:"flex items-center gap-1.5 border-b border-zinc-200 bg-[#f7f7f8] px-3 py-1.5",children:[r.jsx("span",{className:"h-2 w-2 rounded-full bg-[#ff5f57]"}),r.jsx("span",{className:"h-2 w-2 rounded-full bg-[#febc2e]"}),r.jsx("span",{className:"h-2 w-2 rounded-full bg-[#28c840]"}),r.jsxs("span",{className:"ml-2 truncate text-[10px] text-zinc-500",children:["幻灯片 ",e+1," / ",t," · ",n]})]}),r.jsx("div",{className:"relative aspect-[16/9] w-full overflow-hidden",children:s})]})}function Fn({slide:e}){var t;return r.jsxs("div",{className:"absolute inset-0 flex",style:{background:x.white},children:[r.jsx("div",{className:"relative w-[8%] shrink-0",style:{background:x.red},children:r.jsx("div",{className:"absolute bottom-0 left-0 h-[38%] w-full opacity-90",style:{background:`linear-gradient(160deg, ${x.redDark} 0%, ${x.red} 100%)`,clipPath:"polygon(0 35%, 100% 0, 100% 100%, 0 100%)"}})}),r.jsxs("div",{className:"relative flex min-w-0 flex-1 flex-col justify-between px-9 py-8",children:[r.jsxs("div",{className:"flex items-center justify-between",children:[r.jsx("p",{className:"text-[11px] font-semibold tracking-[0.18em]",style:{color:x.red},children:"HUAWEI STYLE · MSS CLAW"}),r.jsx("div",{className:"h-1.5 w-10",style:{background:x.red}})]}),r.jsxs("div",{className:"max-w-[90%]",children:[r.jsx("p",{className:"text-[12px] font-medium",style:{color:x.mute},children:e.subtitle||"智能交付汇报"}),r.jsx("h3",{className:"mt-3 text-[30px] font-bold leading-[1.2] tracking-tight",style:{color:x.ink},children:e.title}),r.jsx("div",{className:"mt-5 h-[3px] w-16",style:{background:x.red}}),(t=e.meta)!=null&&t.length?r.jsx("ul",{className:"mt-6 space-y-2",children:e.meta.slice(0,3).map(n=>r.jsxs("li",{className:"flex items-center gap-2 text-[12.5px]",style:{color:x.mute},children:[r.jsx("span",{className:"h-1.5 w-1.5 shrink-0 rounded-full",style:{background:x.red}}),n]},n))}):null]}),r.jsxs("div",{className:"flex items-end justify-between",children:[r.jsx("p",{className:"text-[10px]",style:{color:"#8c8c8c"},children:"Confidential · For Internal Discussion"}),r.jsxs("div",{className:"flex gap-1",children:[r.jsx("span",{className:"h-2 w-8",style:{background:x.red}}),r.jsx("span",{className:"h-2 w-3 bg-zinc-300"}),r.jsx("span",{className:"h-2 w-3 bg-zinc-200"})]})]}),r.jsx("div",{className:"pointer-events-none absolute -bottom-6 -right-4 h-36 w-36 opacity-[0.12]",style:{background:x.red,clipPath:"polygon(40% 0, 100% 0, 100% 100%, 0 100%)"}})]})]})}function _n({slide:e}){var t;return r.jsxs("div",{className:"absolute inset-0 flex flex-col",style:{background:x.white},children:[r.jsx("div",{className:"h-2 w-full",style:{background:x.red}}),r.jsxs("div",{className:"relative flex flex-1 flex-col items-center justify-center px-8 text-center",children:[r.jsx("div",{className:"mb-4 h-1 w-14",style:{background:x.red}}),r.jsx("h3",{className:"text-[48px] font-bold tracking-tight",style:{color:x.ink},children:e.title||"谢谢"}),r.jsx("p",{className:"mt-2 text-[16px] font-medium tracking-[0.2em]",style:{color:x.red},children:e.subtitle||"Thank You"}),e.bullets.length?r.jsx("div",{className:"mt-8 flex flex-wrap items-center justify-center gap-3",children:e.bullets.slice(0,2).map(n=>r.jsx("span",{className:"rounded-full border px-4 py-1.5 text-[12px]",style:{borderColor:x.line,color:x.mute},children:n},n))}):null,(t=e.meta)!=null&&t.length?r.jsx("p",{className:"mt-8 text-[11px]",style:{color:"#8c8c8c"},children:e.meta.join(" · ")}):null]}),r.jsxs("div",{className:"flex h-10 items-center justify-between px-8",style:{background:x.soft},children:[r.jsx("span",{className:"text-[10px] font-semibold",style:{color:x.red},children:"MSS Claw"}),r.jsx("span",{className:"text-[10px]",style:{color:x.mute},children:"欢迎提问与讨论"})]})]})}function En({bullets:e,layout:t}){const n=e.slice(0,6);return t==="metrics"?r.jsx("div",{className:"grid min-h-0 flex-1 grid-cols-3 gap-2.5 content-start",children:n.map((s,a)=>{const l=s.match(/([+-]?\d+(?:\.\d+)?%|#\d+|第\s*\d+)/),i=(l==null?void 0:l[1])||`${a+1}`,o=s.replace(i,"").replace(/^[:：\s-]+/,"").trim()||s;return r.jsxs("div",{className:"flex flex-col justify-between rounded-xl border px-3 py-3",style:{borderColor:x.line,background:a%2===0?x.soft:x.white},children:[r.jsx("span",{className:"text-[10px] font-semibold",style:{color:x.mute},children:o.slice(0,28)}),r.jsx("span",{className:"mt-2 text-[22px] font-bold tracking-tight",style:{color:x.red},children:i})]},`${a}-${s.slice(0,16)}`)})}):t==="list"?r.jsx("ul",{className:"min-h-0 flex-1 space-y-2 overflow-hidden",children:n.map((s,a)=>r.jsxs("li",{className:"flex gap-3 rounded-lg border px-3 py-2.5",style:{borderColor:x.line,background:x.soft},children:[r.jsx("span",{className:"mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white",style:{background:x.red},children:a+1}),r.jsx("span",{className:"text-[12.5px] leading-relaxed",style:{color:x.ink},children:s})]},`${a}-${s.slice(0,16)}`))}):r.jsx("div",{className:"grid min-h-0 flex-1 grid-cols-2 gap-2.5 content-start",children:n.map((s,a)=>r.jsxs("div",{className:"relative overflow-hidden rounded-xl border px-3.5 py-3",style:{borderColor:x.line,background:x.white},children:[r.jsx("div",{className:"absolute left-0 top-0 h-full w-1",style:{background:x.red}}),r.jsxs("div",{className:"flex items-start gap-2.5 pl-1",children:[r.jsx("span",{className:"mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white",style:{background:a===0?x.red:x.ink},children:String(a+1).padStart(2,"0")}),r.jsx("p",{className:"text-[12.5px] leading-relaxed",style:{color:x.ink},children:s})]})]},`${a}-${s.slice(0,16)}`))})}function On({slide:e,page:t,total:n}){const s=e.role==="agenda";return r.jsxs("div",{className:"absolute inset-0 flex flex-col",style:{background:x.white},children:[r.jsx("div",{className:"h-[3px] w-full",style:{background:x.red}}),r.jsxs("div",{className:"flex min-h-0 flex-1 flex-col px-7 py-5",children:[r.jsxs("div",{className:"mb-3 flex items-end justify-between gap-3 border-b pb-3",style:{borderColor:x.line},children:[r.jsxs("div",{className:"min-w-0",children:[e.subtitle||s?r.jsx("p",{className:"text-[10px] font-semibold tracking-[0.16em]",style:{color:x.red},children:e.subtitle||"AGENDA"}):r.jsx("p",{className:"text-[10px] font-semibold tracking-[0.14em]",style:{color:x.mute},children:"KEY POINTS"}),r.jsx("h3",{className:"mt-1 text-[20px] font-bold leading-snug tracking-tight",style:{color:x.ink},children:e.title})]}),r.jsx("div",{className:"h-8 w-8 shrink-0 rounded-md",style:{background:x.red}})]}),r.jsx(En,{bullets:e.bullets,layout:e.layout||"cards"}),r.jsxs("div",{className:"mt-3 flex items-center justify-between border-t pt-2 text-[10px]",style:{borderColor:x.line,color:x.mute},children:[r.jsxs("span",{children:[r.jsx("span",{className:"font-semibold",style:{color:x.red},children:"MSS Claw"}),r.jsx("span",{className:"mx-1.5 text-zinc-300",children:"|"}),"智能交付件"]}),r.jsxs("span",{children:[t," / ",n]})]})]})]})}function Rn({slides:e}){return e.length?r.jsx("div",{className:S("space-y-4 rounded-xl p-3"),style:{background:"#eceff3"},children:e.map((t,n)=>r.jsx(Pn,{index:n,total:e.length,title:t.title,children:t.role==="cover"||t.layout==="cover"?r.jsx(Fn,{slide:t}):t.role==="closing"||t.layout==="closing"?r.jsx(_n,{slide:t}):r.jsx(On,{slide:t,page:n+1,total:e.length})},`${t.role}-${t.title}-${n}`))}):r.jsx("div",{className:"rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-[12px] text-zinc-500",children:"暂无幻灯片"})}function Dn(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/^### (.*)$/gm,'<h3 class="mt-3 mb-1 text-[13px] font-semibold text-zinc-900">$1</h3>').replace(/^## (.*)$/gm,'<h2 class="mt-4 mb-1.5 text-[15px] font-semibold text-zinc-900">$1</h2>').replace(/^# (.*)$/gm,'<h1 class="mb-2 text-[17px] font-bold text-zinc-900">$1</h1>').replace(/^> (.*)$/gm,'<p class="my-2 rounded-lg bg-zinc-100 px-3 py-2 text-[12px] text-zinc-600">$1</p>').replace(/^\- (.*)$/gm,'<li class="ml-4 list-disc text-[12px] leading-relaxed text-zinc-700">$1</li>').replace(/^\d+\. (.*)$/gm,'<li class="ml-4 list-decimal text-[12px] leading-relaxed text-zinc-700">$1</li>').replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\*(.*?)\*/g,"<em>$1</em>").replace(/^---$/gm,'<hr class="my-3 border-zinc-200"/>').replace(/\n\n/g,"<br/><br/>")}function Un({title:e,html:t}){return r.jsx("iframe",{title:e,srcDoc:t,sandbox:"",className:"h-[min(72vh,640px)] w-full rounded-xl border border-zinc-200 bg-white"})}function Bn({item:e}){return e.kind==="markdown"&&e.markdown?r.jsx("div",{className:"rounded-xl border border-zinc-200/80 bg-white p-4",dangerouslySetInnerHTML:{__html:Dn(e.markdown)}}):e.kind==="html"&&e.html?r.jsx(Un,{title:e.title,html:e.html}):e.kind==="ppt"&&e.slides?r.jsx(Rn,{slides:e.slides}):r.jsx("div",{className:"rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-[12px] text-zinc-500",children:"暂无可预览内容"})}function Ns({ready:e,type:t,query:n="",agentName:s="",skills:a=[],agentReply:l="",kbArtifact:i=null,collapsed:o,onToggleCollapse:d,onPush:m,onDeliverableDownload:f,onRunExample:c}){var je;const p=j.useMemo(()=>e&&t?Ln({type:t,query:n,agentName:s,skills:a,agentReply:l,kbArtifact:i}):[],[e,t,n,s,a,l,i]),u=`${t}|${n}|${s}|${l.slice(0,80)}`,[v,h]=j.useState({}),[g,k]=j.useState(null),[M,re]=j.useState(null),[ke,V]=j.useState(null),O=j.useRef(null);j.useEffect(()=>{var b;h({}),V(null),(b=O.current)==null||b.abort(),O.current=null,re(null)},[u]);const A=j.useMemo(()=>p.map(b=>{const R=v[b.id];return R?{...b,...R,pendingGenerate:!1}:b}),[p,v]);j.useEffect(()=>{if(!A.length){k(null);return}(!g||!A.some(b=>b.id===g))&&k(A[0].id)},[A,g]);const w=A.find(b=>b.id===g)??null,le=((je=A.find(b=>b.kind==="markdown"))==null?void 0:je.markdown)??"",Se=w?Ce(w):!1,Je=w&&Me(w.kind)&&!Se&&!!le.trim(),Ve=async()=>{var R;if(!w||!t||!Me(w.kind)||!le.trim())return;(R=O.current)==null||R.abort();const b=new AbortController;O.current=b,re(w.id),V(null);try{const D=await Tn(w.kind,le,{type:t,query:n,agentName:s,skills:a,agentReply:l,kbArtifact:i},b.signal);if(b.signal.aborted)return;h(Xe=>({...Xe,[w.id]:{...D,pendingGenerate:!1}}))}catch(D){if(b.signal.aborted)return;V(D instanceof Error?D.message:"生成失败，请重试")}finally{O.current===b&&(O.current=null),re(D=>D===w.id?null:D)}};return r.jsxs(r.Fragment,{children:[r.jsxs("section",{className:S("artifact-panel z-20 border-l border-zinc-200/80",o&&"collapsed"),children:[r.jsxs("div",{className:"glass-bar flex h-[52px] shrink-0 items-center justify-between border-b border-zinc-200/80 px-4",children:[r.jsxs("div",{className:"flex min-w-0 items-center gap-2.5",children:[r.jsx("button",{type:"button",onClick:d,className:"flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900",title:"收起交付件预览",children:r.jsx("i",{className:"fa-solid fa-chevron-right text-xs"})}),r.jsx("div",{className:"flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-700",children:r.jsx("i",{className:"fa-solid fa-file-lines text-xs"})}),r.jsx("p",{className:"truncate text-[11px] font-semibold leading-none text-zinc-900",children:"交付件预览"})]}),r.jsxs("button",{type:"button",onClick:m,disabled:!e,className:"apple-btn-primary flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40",children:[r.jsx("i",{className:"fa-solid fa-paper-plane text-[10px]"}),"推送"]})]}),e&&A.length>0&&r.jsxs("div",{className:"flex shrink-0 items-center gap-2 border-b border-zinc-200/80 bg-white px-3 py-2",children:[r.jsx("div",{className:"flex flex-1 gap-1.5 overflow-x-auto scroll-hidden",children:A.map(b=>{const R=Ce(b);return r.jsxs("button",{type:"button",onClick:()=>{k(b.id),V(null)},className:S("flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition",g===b.id?"border-zinc-900 bg-zinc-900 text-white":"border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-white"),children:[r.jsx("i",{className:S("text-[10px]",b.icon.startsWith("fa-")?`fa-solid ${b.icon}`:b.icon,g===b.id?"text-white/80":b.iconClass)}),r.jsx("span",{className:"font-medium",children:b.name}),!R&&b.kind!=="markdown"?r.jsx("span",{className:S("rounded px-1 text-[9px]",g===b.id?"bg-white/15 text-white/70":"bg-zinc-200/80 text-zinc-500"),children:"空"}):null]},b.id)})}),w&&Se?r.jsx("button",{type:"button",onClick:()=>{An(w,n),f==null||f(w.name)},className:"shrink-0 rounded-lg border border-zinc-200 px-2 py-1.5 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-50",title:"下载当前交付件",children:r.jsx("i",{className:"fa-solid fa-download"})}):null]}),r.jsxs("div",{className:"relative min-h-0 flex-1 overflow-hidden p-4",children:[!e&&r.jsxs("div",{className:"flex h-full flex-col items-center justify-center",children:[r.jsx("div",{className:"canvas-empty-icon relative mb-4 flex h-20 w-20 items-center justify-center rounded-xl border border-zinc-200 shadow-sm",children:r.jsx("i",{className:"fa-solid fa-wand-magic-sparkles text-3xl text-zinc-400"})}),r.jsx("h3",{className:"mb-1.5 text-[15px] font-semibold text-zinc-900",children:"等待 Agent 交付件"}),r.jsx("p",{className:"max-w-sm text-center text-[12px] leading-relaxed text-zinc-500",children:"确认执行计划后，将先生成 Markdown；可再切换到 HTML / PPT，基于全文点击「开始生成」预览。"}),c&&r.jsxs("div",{className:"mt-4 grid w-full max-w-sm grid-cols-1 gap-1.5",children:[r.jsxs("button",{type:"button",onClick:()=>c("marketing"),className:"task-card apple-card rounded-xl p-3 text-left",children:[r.jsxs("p",{className:"flex items-center gap-2 text-[12px] font-semibold text-zinc-800",children:[r.jsx("i",{className:"fa-solid fa-chart-column text-zinc-600"}),"多源数据分析"]}),r.jsx("p",{className:"mt-0.5 text-[11px] text-zinc-500",children:"/数据分析 · 代表处 SO 排名"})]}),r.jsxs("button",{type:"button",onClick:()=>c("knowledge"),className:"task-card apple-card rounded-xl p-3 text-left",children:[r.jsxs("p",{className:"flex items-center gap-2 text-[12px] font-semibold text-zinc-800",children:[r.jsx("i",{className:"fa-solid fa-file-shield text-zinc-600"}),"文档合规筛查"]}),r.jsx("p",{className:"mt-0.5 text-[11px] text-zinc-500",children:"/合规筛查 · 医疗用语检查"})]}),r.jsxs("button",{type:"button",onClick:()=>c("warroom"),className:"task-card apple-card rounded-xl p-3 text-left",children:[r.jsxs("p",{className:"flex items-center gap-2 text-[12px] font-semibold text-zinc-800",children:[r.jsx("i",{className:"fa-solid fa-tags text-zinc-600"}),"价格监测周报"]}),r.jsx("p",{className:"mt-0.5 text-[11px] text-zinc-500",children:"/价格监测 · 18 国 offer 比对"})]})]})]}),e&&w&&r.jsxs("div",{className:"scroll-hidden h-full overflow-y-auto",children:[r.jsxs("div",{className:"mb-2 flex items-center justify-between gap-2",children:[r.jsx("p",{className:"text-[11px] font-semibold text-zinc-800",children:w.title}),r.jsx("span",{className:"text-[10px] text-zinc-400",children:w.size})]}),M===w.id?r.jsxs("div",{className:"flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-16 text-center",children:[r.jsx("i",{className:"fa-solid fa-spinner fa-spin mb-3 text-2xl text-zinc-400"}),r.jsxs("p",{className:"text-[13px] font-semibold text-zinc-800",children:["正在基于 Markdown 生成 ",w.name,"…"]}),r.jsx("p",{className:"mt-1 text-[11px] text-zinc-500",children:w.kind==="html"?T()?"模型提炼分析看板 · 本地模板排版中":"本地转写 HTML 报告中":T()?"调用 AI 模型提炼幻灯片结构":"正在按章节拆解为幻灯片"}),r.jsx("button",{type:"button",onClick:()=>{var b;return(b=O.current)==null?void 0:b.abort()},className:"mt-4 rounded-lg border border-zinc-200 px-3 py-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50",children:"取消"})]}):Je?r.jsxs("div",{className:"flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-14 text-center",children:[r.jsx("div",{className:"mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500",children:r.jsx("i",{className:S("fa-solid text-lg",w.icon)})}),r.jsxs("p",{className:"text-[13px] font-semibold text-zinc-800",children:[w.name," 尚未生成"]}),r.jsx("p",{className:"mt-1.5 max-w-xs text-[11px] leading-relaxed text-zinc-500",children:w.kind==="html"?T()?"模型按场景提炼 KPI/发现/风险/行动，再用现有精美模板排版；正文仍完整保留 Markdown。":"将把当前 Markdown 全文排版为可预览 HTML 报告（未配置模型时走本地转写）。":`将按章节把 Markdown 拆成 16:9 幻灯片${T()?"（可调用模型提炼要点）":""}。`}),ke?r.jsx("p",{className:"mt-2 max-w-xs text-[11px] text-red-600",children:ke}):null,r.jsx("button",{type:"button",onClick:()=>void Ve(),className:"apple-btn-primary mt-4 rounded-lg px-4 py-2 text-[12px] font-semibold text-white",children:"开始生成"})]}):r.jsx(Bn,{item:w})]})]})]}),o&&r.jsxs("button",{type:"button",onClick:d,className:"artifact-panel-expand-tab visible flex flex-col items-center justify-center gap-1 text-[10px] font-semibold",title:"展开交付件预览",children:[r.jsx("i",{className:"fa-solid fa-file-lines text-sm"}),r.jsx("span",{style:{writingMode:"vertical-rl"},children:"预览"})]})]})}function Hn({open:e,title:t,onClose:n,children:s,actions:a,size:l="md",elevate:i=!1}){return e?r.jsx("div",{className:S("modal-backdrop fixed inset-0 flex items-center justify-center p-4",i?"z-[120]":"z-[100]"),onClick:o=>o.target===o.currentTarget&&n(),children:r.jsxs("div",{className:S("max-h-[85vh] w-full overflow-hidden rounded-2xl border border-black/5 bg-white shadow-apple-lg",l==="lg"?"max-w-2xl":"max-w-lg"),children:[r.jsxs("div",{className:"flex items-center justify-between border-b border-black/[0.06] px-5 py-4",children:[r.jsx("h3",{className:"text-[15px] font-semibold text-[#1d1d1f]",children:t}),r.jsx("button",{type:"button",onClick:n,className:"text-[#86868b] transition hover:text-[#1d1d1f]",children:r.jsx("i",{className:"fa-solid fa-xmark"})})]}),r.jsx("div",{className:"max-h-[60vh] overflow-y-auto p-5",children:s}),a&&r.jsx("div",{className:"flex justify-end gap-2 border-t border-black/[0.06] bg-[#fafafa]/50 px-5 py-4",children:a})]})}):null}function $s({title:e,subtitle:t,actions:n,tip:s}){return r.jsxs("div",{className:"mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end",children:[r.jsxs("div",{className:"max-w-2xl",children:[r.jsx("p",{className:"mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400",children:"MSS Claw"}),r.jsxs("div",{className:"flex flex-wrap items-center gap-2",children:[r.jsx("h2",{className:"text-[20px] font-semibold tracking-tight text-zinc-900 md:text-[22px]",children:e}),s?r.jsx(Gn,{children:s}):null]}),r.jsx("p",{className:"mt-1 text-[12px] leading-relaxed text-zinc-500",children:t})]}),n&&r.jsx("div",{className:"flex flex-wrap items-center gap-2",children:n})]})}function Gn({children:e}){const[t,n]=j.useState(!1);return r.jsxs("div",{className:"relative inline-flex items-center",children:[r.jsxs("button",{type:"button",onClick:()=>n(s=>!s),onBlur:()=>setTimeout(()=>n(!1),150),className:S("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition",t?"border-claw-600/30 bg-claw-50 text-claw-700":"border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-800"),"aria-expanded":t,"aria-label":"快速上手",children:[r.jsx("i",{className:"fa-solid fa-lightbulb text-[9px]"}),"快速上手"]}),t?r.jsxs("div",{className:"absolute left-0 top-[calc(100%+6px)] z-30 w-[min(320px,80vw)] rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[11px] leading-relaxed text-zinc-600 shadow-lg",children:[r.jsx("p",{className:"mb-1 text-[10px] font-semibold tracking-wide text-zinc-400",children:"快速上手"}),r.jsx("div",{className:"learning-callout-inline",children:e})]}):null]})}function Is({value:e,onChange:t,placeholder:n,className:s="w-48"}){return r.jsx("input",{type:"text",value:e,onChange:a=>t(a.target.value),placeholder:n,className:`apple-input ${s}`})}function Cs({items:e}){return r.jsx("div",{className:"mb-4 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6",children:e.map(([t,n])=>r.jsxs("div",{className:"apple-card p-3",children:[r.jsx("p",{className:"text-[9px] font-semibold uppercase tracking-wide text-zinc-500",children:t}),r.jsx("p",{className:"mt-1 text-lg font-semibold tabular-nums tracking-tight text-zinc-900",children:n})]},t))})}const we="mt-1 w-full rounded-xl border border-black/8 px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-zinc-900/20";function Ms({label:e,children:t,hint:n}){return r.jsxs("label",{className:"block",children:[r.jsx("span",{className:"text-[11px] font-semibold text-[#86868b]",children:e}),n&&r.jsx("p",{className:"mb-1 text-[10px] text-[#86868b]",children:n}),t]})}function zs({className:e,...t}){return r.jsx("input",{className:S(we,e),...t})}function Ts({className:e,...t}){return r.jsx("textarea",{className:S(we,e),...t})}function Ls({className:e,...t}){return r.jsx("select",{className:S(we,e),...t})}const As=[{value:"office",label:"办公提效"},{value:"manage",label:"管理提效"},{value:"process",label:"流程提效"},{value:"experience",label:"体验提升"}],Ps=[{value:"marketing",label:"营销分析"},{value:"knowledge",label:"知识问答"}];function Wn({onCancel:e,onSave:t,saveLabel:n="保存"}){return r.jsxs(r.Fragment,{children:[r.jsx("button",{type:"button",onClick:t,className:"apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white",children:n}),r.jsx("button",{type:"button",onClick:e,className:"rounded-xl border border-black/8 px-4 py-2 text-[12px]",children:"取消"})]})}function Fs({open:e,onClose:t,warrooms:n,members:s,onConfirm:a}){const[l,i]=j.useState("warroom"),[o,d]=j.useState([]),[m,f]=j.useState([]),c=j.useMemo(()=>n.filter(h=>xe(h)),[n]),p=(h,g,k)=>{k(h.includes(g)?h.filter(M=>M!==g):[...h,g])},u=()=>{if(l==="warroom"){if(!o.length)return;a({mode:"warroom",warroomIds:o})}else{if(!m.length)return;a({mode:"members",memberIds:m})}d([]),f([]),t()},v=l==="warroom"?o.length>0:m.length>0;return r.jsx(Hn,{open:e,title:"推送交付物",onClose:t,size:"lg",elevate:!0,actions:r.jsx(Wn,{onCancel:t,onSave:()=>{v&&u()},saveLabel:v?"发送":"请先选择"}),children:r.jsxs("div",{className:"space-y-3 text-left",children:[r.jsx("p",{className:"text-[11px] leading-relaxed text-zinc-500",children:"选择协作空间或成员接收交付物通知。协作空间将写入会话记录；成员将收到「我的消息」。"}),r.jsx("div",{className:"inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5",children:[["warroom","协作空间"],["members","成员"]].map(([h,g])=>r.jsx("button",{type:"button",onClick:()=>i(h),className:S("rounded-md px-3 py-1.5 text-[11px] font-semibold transition",l===h?"bg-white text-zinc-900 shadow-sm":"text-zinc-500 hover:text-zinc-800"),children:g},h))}),l==="warroom"?r.jsx("ul",{className:"max-h-[40vh] space-y-1.5 overflow-y-auto",children:c.length===0?r.jsx("li",{className:"rounded-xl border border-dashed border-zinc-200 px-3 py-8 text-center text-[12px] text-zinc-400",children:"暂无协作空间，请先在侧栏「协作空间」中新建"}):c.map(h=>{var k;const g=o.includes(h.id);return r.jsx("li",{children:r.jsxs("label",{className:S("flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition",g?"border-zinc-900 bg-zinc-900/5":"border-zinc-200 hover:border-zinc-300"),children:[r.jsx("input",{type:"checkbox",className:"accent-claw-600",checked:g,onChange:()=>p(o,h.id,d)}),r.jsx("span",{className:"flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white",children:r.jsx("i",{className:"fa-solid fa-users text-[11px]"})}),r.jsxs("span",{className:"min-w-0 flex-1",children:[r.jsx("span",{className:"block truncate text-[12px] font-semibold text-zinc-900",children:h.title}),r.jsxs("span",{className:"text-[10px] text-zinc-400",children:[((k=h.members)==null?void 0:k.length)??0," 名成员 · 协作室"]})]})]})},h.id)})}):r.jsx("ul",{className:"max-h-[40vh] space-y-1.5 overflow-y-auto",children:s.length===0?r.jsx("li",{className:"rounded-xl border border-dashed border-zinc-200 px-3 py-8 text-center text-[12px] text-zinc-400",children:"当前工作区暂无成员"}):s.map(h=>{var k;const g=m.includes(h.id);return r.jsx("li",{children:r.jsxs("label",{className:S("flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition",g?"border-zinc-900 bg-zinc-900/5":"border-zinc-200 hover:border-zinc-300"),children:[r.jsx("input",{type:"checkbox",className:"accent-claw-600",checked:g,onChange:()=>p(m,h.id,f)}),r.jsx("span",{className:S("flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white",h.avatar||"bg-zinc-700"),children:(((k=h.name)==null?void 0:k[0])??"?").toUpperCase()}),r.jsxs("span",{className:"min-w-0 flex-1",children:[r.jsx("span",{className:"block truncate text-[12px] font-semibold text-zinc-900",children:h.name}),r.jsx("span",{className:"truncate text-[10px] text-zinc-400",children:h.email||h.id})]})]})},h.id)})})]})})}export{$s as $,E as A,Ot as B,ys as C,B as D,Ss as E,cs as F,Hn as G,Fe as H,Ns as I,Fs as J,Xn as K,Nt as L,ft as M,_e as N,ue as O,Le as P,mt as Q,ts as R,as as S,Qn as T,ps as U,ds as V,ns as W,ss as X,os as Y,rs as Z,ls as _,xs as a,Is as a0,Cs as a1,Ms as a2,zs as a3,Ts as a4,Ls as a5,As as a6,Ps as a7,Wn as a8,es as a9,us as aa,js as ab,st as b,is as c,jt as d,Q as e,Vn as f,fs as g,Ee as h,bs as i,gs as j,hs as k,kt as l,T as m,_t as n,Lt as o,ms as p,Zn as q,Jn as r,ks as s,xe as t,ae as u,vs as v,ws as w,S as x,zt as y,Z as z};
