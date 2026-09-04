const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/platform-admin-CdHITR3y.js","assets/vendor-react-BRngAyPX.js","assets/vendor-4N5Q60PZ.js","assets/platform-workflow-DEbQ3LGp.js","assets/vendor-zustand-DY2Ir-ha.js","assets/page-task-bWIi8QLn.js"])))=>i.map(i=>d[i]);
var An=Object.defineProperty;var Tn=(e,t,n)=>t in e?An(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n;var bt=(e,t,n)=>Tn(e,typeof t!="symbol"?t+"":t,n);import{j as l,r as M}from"./vendor-react-BRngAyPX.js";import{c as be}from"./vendor-zustand-DY2Ir-ha.js";import{e as T,o as Q,s as g,a as se,b as Ye,n as fe,c as Mn,t as Pn,d as Cn,f as P,z as Rn}from"./vendor-4N5Q60PZ.js";const On=["gtm","mkt","ecommerce","service","channel","retail","hr","quality"],Nn=[{id:"gtm",label:"GTM"},{id:"mkt",label:"MKT"},{id:"ecommerce",label:"电商"},{id:"service",label:"服务"},{id:"channel",label:"渠道"},{id:"retail",label:"零售"},{id:"hr",label:"HR"},{id:"quality",label:"质运"},{id:"finance",label:"财经"}],oe="hq",Re="china",Ln=[{id:oe,label:"机关"},{id:"apac",label:"亚太"},{id:"mea",label:"中东非"},{id:"latam",label:"拉美"},{id:"europe",label:"欧洲"},{id:"eurasia",label:"欧亚"},{id:Re,label:"中国区"}],ge=[...Nn],he=[...Ln],go={skill:"Skill",tool:"工具",agent:"Agent",external_tool:"外部工具",case:"场景案例",playbook:"场景方案",insight:"前沿洞察",training:"培训课件",news:"前沿洞察"},ho={public:"公开可见",org:"组织内",private:"仅发布方"};let Dt=Object.fromEntries(ge.map(e=>[e.id,e.label])),Ft=Object.fromEntries(he.map(e=>[e.id,e.label]));function _n(){Dt=Object.fromEntries(ge.map(e=>[e.id,e.label])),Ft=Object.fromEntries(he.map(e=>[e.id,e.label]))}function xo(e,t){ge.splice(0,ge.length,...e),he.splice(0,he.length,...t),_n()}function yt(e){return Dt[e]??e}function Xe(e){return Ft[e]??e}function ko(e){return e?Xe(e):"全部区域"}function En(e){return ge.some(t=>t.id===e)}function jn(e){return he.some(t=>t.id===e)}function ye(e){const t=[...new Set(((e==null?void 0:e.deptIds)??[]).filter(En))],n=e!=null&&e.regionId&&jn(e.regionId)?e.regionId:null;return{deptIds:t,regionId:n}}function bo(e){const t=new Map(On.map((n,s)=>[n,s]));return[...e].sort((n,s)=>{const a=t.has(n)?t.get(n):1e3+n.charCodeAt(0),r=t.has(s)?t.get(s):1e3+s.charCodeAt(0);return a!==r?a-r:yt(n).localeCompare(yt(s),"zh-CN")})}function yo(e){const t=new Set(e),n=[];t.has(oe)&&n.push(oe);const s=e.filter(a=>a!==oe&&a!==Re).sort((a,r)=>Xe(a).localeCompare(Xe(r),"zh-CN"));return n.push(...s),t.has(Re)&&n.push(Re),n}function $n(e,t){return t.length?t.some(n=>n===oe?!e||e===oe:e===n):!0}function So(e,t){return!e||$n(e,t)}const Kt="mssclaw_api",zn="mssclaw_api_auth";function Dn(){return!0}function Ut(e){return e==="localhost"||e==="127.0.0.1"||e==="[::1]"}function Fn(e){try{const t=new URL(e);return Ut(t.hostname)}catch{return/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(e)}}function Kn(){var e;if(typeof localStorage<"u"){const t=(e=localStorage.getItem(Kt))==null?void 0:e.trim();if(t){const n=t.replace(/\/$/,"");return Fn(n)&&typeof location<"u"&&!Ut(location.hostname)?"":n}}return""}function O(){return!1}function wo(){typeof localStorage>"u"||localStorage.removeItem(Kt)}function Un(){var e;if(typeof localStorage<"u"){const t=(e=localStorage.getItem(zn))==null?void 0:e.trim();if(t)return t}return""}function j(){var n;const e={},t=Un();t&&(e["X-API-Key"]=t);try{const s=typeof sessionStorage<"u"?(n=sessionStorage.getItem("mssclaw_auth_token"))==null?void 0:n.trim():"";s&&(e.Authorization=`Bearer ${s}`,e["X-Session-Token"]=s)}catch{}return e}function A(e){const t=Kn(),n=e.startsWith("/")?e:`/${e}`;return t?`${t}${n}`:n}async function Se(e,t={},n=8e3){const s=new AbortController,a=setTimeout(()=>s.abort(),n);try{return await fetch(e,{...t,signal:s.signal})}finally{clearTimeout(a)}}const Bn="modulepreload",Gn=function(e){return"/MSSClaw/"+e},St={},Ee=function(t,n,s){let a=Promise.resolve();if(n&&n.length>0){let o=function(p){return Promise.all(p.map(m=>Promise.resolve(m).then(c=>({status:"fulfilled",value:c}),c=>({status:"rejected",reason:c}))))};document.getElementsByTagName("link");const i=document.querySelector("meta[property=csp-nonce]"),d=(i==null?void 0:i.nonce)||(i==null?void 0:i.getAttribute("nonce"));a=o(n.map(p=>{if(p=Gn(p),p in St)return;St[p]=!0;const m=p.endsWith(".css"),c=m?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${p}"]${c}`))return;const u=document.createElement("link");if(u.rel=m?"stylesheet":Bn,m||(u.as="script"),u.crossOrigin="",u.href=p,d&&u.setAttribute("nonce",d),document.head.appendChild(u),m)return new Promise((f,y)=>{u.addEventListener("load",f),u.addEventListener("error",()=>y(new Error(`Unable to preload CSS for ${p}`)))})}))}function r(o){const i=new Event("vite:preloadError",{cancelable:!0});if(i.payload=o,window.dispatchEvent(i),!i.defaultPrevented)throw o}return a.then(o=>{for(const i of o||[])i.status==="rejected"&&r(i.reason);return t().catch(r)})},D="ws-cn-marketing",Wn=T(["super_admin","capability_ops","business_user","viewer"]);function Bt(e){switch(e){case"super_admin":case"workspace_admin":return"super_admin";case"capability_ops":case"developer":return"capability_ops";case"business_user":return"business_user";case"viewer":return"viewer";default:return"business_user"}}T(["none","read","execute","write","admin"]);T(["chat","prompt","skill","workflow","agent","knowledge","tool","memory","settings"]);Q({id:g(),name:g(),email:g(),role:Wn,avatar:g(),lastActive:g(),status:T(["active","invited","suspended"]),deptIds:se(g()).optional(),regionId:g().nullable().optional()});const vo={super_admin:"平台运营",capability_ops:"能力开发",business_user:"业务用户",viewer:"只读访客"},Io={super_admin:"平台运营：可查看/创建全部 Skill 与治理配置（租户/门户/展示/组织权限）",capability_ops:"能力开发：配置 Agent/Skill/工具。短期不做组织数据权限；后续可按「公开可见 / 组织内」限制 MSS 集市 Agent/Skill",business_user:"业务壳：工作平台（找案例/做任务/任务记录）；左侧领域/区域菜单全量可见，作浏览筛选",viewer:"业务壳：工作平台以找案例为主；左侧领域/区域菜单全量可见，作浏览筛选"},Ao=["capability_ops","business_user","viewer"],To={active:"已激活",invited:"待激活",suspended:"已停用"},Mo={none:"—",read:"R",execute:"Execute",write:"Write",admin:"Admin"},Po={none:"bg-slate-100 text-slate-400",read:"bg-blue-50 text-blue-600",execute:"bg-emerald-50 text-emerald-600",write:"bg-amber-50 text-amber-700",admin:"bg-indigo-50 text-indigo-700"},Hn={chat:"admin",prompt:"admin",skill:"admin",workflow:"admin",agent:"admin",knowledge:"admin",tool:"admin",memory:"admin",settings:"admin"};function qn(e,t,n){return{super_admin:{...Hn},capability_ops:e,business_user:t,viewer:n}}const Vn=qn({chat:"execute",prompt:"write",skill:"write",workflow:"write",agent:"write",knowledge:"write",tool:"write",memory:"write",settings:"read"},{chat:"execute",prompt:"read",skill:"execute",workflow:"execute",agent:"read",knowledge:"read",tool:"read",memory:"read",settings:"none"},{chat:"read",prompt:"read",skill:"read",workflow:"read",agent:"read",knowledge:"read",tool:"none",memory:"none",settings:"none"});function Co(e){return Vn}const Ro={chat:"Chat",prompt:"Prompt",skill:"Skill",workflow:"Workflow",agent:"Agent",knowledge:"Knowledge",tool:"Tool",memory:"Memory",settings:"Settings"},Gt=[{id:"u-mcyo",name:"Mcyo",email:"mcyo@huawei.com",role:"super_admin",avatar:"bg-indigo-600",lastActive:"刚刚",status:"active",deptIds:["quality"],regionId:null},{id:"u-jacky",name:"Jacky",email:"jacky@huawei.com",role:"capability_ops",avatar:"bg-teal-600",lastActive:"1 小时前",status:"active",deptIds:["quality"],regionId:null},{id:"u-dickson",name:"Dickson",email:"dickson@huawei.com",role:"business_user",avatar:"bg-amber-500",lastActive:"今天",status:"active",deptIds:["gtm"],regionId:"apac"},{id:"u-somebody",name:"Somebody",email:"somebody@huawei.com",role:"viewer",avatar:"bg-slate-500",lastActive:"昨天",status:"active",deptIds:["mkt"],regionId:"europe"}],Jn=[D,"ws-apac","ws-3c-latam","ws-mea","ws-eurasia","ws-europe"],Wt=Object.fromEntries(Jn.map(e=>[e,Gt.map(t=>({...t,deptIds:[...t.deptIds??[]]}))]));function Oo(e){return Wt[e]??Gt.map(t=>({...t}))}function No(e){return{super_admin:"bg-red-50 text-red-700 border-red-200",capability_ops:"bg-blue-50 text-blue-700 border-blue-200",business_user:"bg-emerald-50 text-emerald-700 border-emerald-200",viewer:"bg-slate-100 text-slate-600 border-slate-200"}[e]}function Lo(e){return e==="org"?"members":e==="rbac"?"roles":e}const _o=[{id:"members",label:"成员",icon:"fa-users",hint:"添加 · 导入 · 改角色"},{id:"roles",label:"角色",icon:"fa-user-shield",hint:"看权限矩阵"},{id:"depts",label:"部门",icon:"fa-building",hint:"部门 · 区域字典"},{id:"audit",label:"审计",icon:"fa-clipboard-list",hint:"操作日志"}],Yn="mssclaw",Ae={super_admin:4,capability_ops:3,business_user:2,viewer:1},Xn=new Set(["mcyo@huawei.com","mcyo@company.com"]);function wt(e){return e.trim().replace(/@company\.com$/i,"@huawei.com")}function Qn(e,t){return ye({deptIds:[...e.deptIds,...t.deptIds],regionId:e.regionId??t.regionId})}function Zn(e){return ye({deptIds:e.deptIds??[],regionId:e.regionId??null})}function es(){return[]}function ts(){const e=new Map,t=(n,s)=>{const a=wt(n.email).toLowerCase();if(!a)return;const r=Bt(n.role),o=Xn.has(a)?"super_admin":r,i=Zn(n),d=wt(n.email),p=e.get(a);if(!p){e.set(a,{id:n.id,name:n.name,email:d,platformRole:o,avatar:n.avatar,status:n.status,workspaceIds:s?[s]:[],deptIds:i.deptIds,regionId:i.regionId??null});return}n.status==="active"&&p.status!=="active"&&(p.status="active"),Ae[o]>Ae[p.platformRole]&&(p.platformRole=o),s&&!p.workspaceIds.includes(s)&&p.workspaceIds.push(s);const m=Qn({deptIds:p.deptIds,regionId:p.regionId},i);p.deptIds=m.deptIds,p.regionId=m.regionId??null,s===D&&(p.id=n.id,p.name=n.name,p.avatar=n.avatar)};return Object.entries(Wt).forEach(([n,s])=>{s.forEach(a=>t(a,n))}),es().forEach(n=>t(n)),[...e.values()].sort((n,s)=>{const a=Ae[s.platformRole]-Ae[n.platformRole];return a!==0?a:n.name.localeCompare(s.name,"zh-CN")})}async function ns(e,t){const n=e.trim().toLowerCase();if(!n)return{ok:!1,error:"请输入邮箱账号"};if(!t)return{ok:!1,error:"请输入密码"};const s=ts().find(d=>d.email.toLowerCase()===n);if(!s)return{ok:!1,error:"账号不存在，请使用组织权限中的邮箱登录"};if(s.status==="invited")return{ok:!1,error:"该成员尚未激活，请联系管理员完成邀请"};if(s.status==="suspended")return{ok:!1,error:"账号已停用，无法登录"};const{loadAuthPolicy:a,verifyAccountPassword:r}=await Ee(async()=>{const{loadAuthPolicy:d,verifyAccountPassword:p}=await import("./platform-admin-CdHITR3y.js").then(m=>m.b);return{loadAuthPolicy:d,verifyAccountPassword:p}},__vite__mapDeps([0,1,2,3,4,5])),o=a(),i=await r(n,t);return i==="match"?{ok:!0,account:s}:i==="mismatch"?{ok:!1,error:"密码错误"}:o.allowDemoPassword&&t===Yn?{ok:!0,account:s}:o.allowDemoPassword?{ok:!1,error:"密码错误"}:{ok:!1,error:"该账号尚未设置密码，请联系平台运营在「组织权限」中配置"}}const vt="mssclaw_visitor_id",ss=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;function It(){var t;if(typeof((t=globalThis.crypto)==null?void 0:t.randomUUID)=="function")return globalThis.crypto.randomUUID();const e=n=>Array.from({length:n},()=>Math.floor(Math.random()*16).toString(16)).join("");return`${e(8)}-${e(4)}-4${e(3)}-a${e(3)}-${e(12)}`}function Oe(){var e;try{const t=((e=localStorage.getItem(vt))==null?void 0:e.trim())??"";if(ss.test(t))return t;const n=It();return localStorage.setItem(vt,n),n}catch{return It()}}function Eo(e=Oe()){return`guest:${e}`}function as(e){return!e||e==="business_user"||e==="viewer"?"business":"ops"}function rs(e){return as(e)}function os(e){return e==="agents"||e==="skills"||e==="tools"||e==="office-scenes"||e==="memory"||e==="kb"||e==="prompts"||e==="automation"||e==="workflow"||e==="portal-ops"||e==="portal-dashboard"||e==="model-ops"||e==="executions"||e==="approvals"||e==="admin"||e==="presentation"||e==="workspace-config"||e==="agent-studio"}const Te=be((e,t)=>({perspective:"business",hydrate:n=>{e({perspective:rs(n)})},ensureOpsForView:n=>{t().perspective==="ops"&&os(n)}})),Qe="mssclaw_auth_token";let ce=0;function is(){try{return sessionStorage.getItem(Qe)}catch{return null}}function Me(e){try{e?sessionStorage.setItem(Qe,e):sessionStorage.removeItem(Qe)}catch{}}function ls(e){const t=ye({deptIds:e.deptIds,regionId:e.regionId});return{id:e.id,name:e.name,email:e.email,platformRole:e.platformRole,avatar:e.avatar,deptIds:t.deptIds,regionId:t.regionId??null}}function At(e){const t=ye({deptIds:e.deptIds??[],regionId:e.regionId??null});return{id:e.id,name:e.name,email:e.email,platformRole:Bt(e.platformRole),avatar:e.avatar||"bg-zinc-900",deptIds:t.deptIds,regionId:t.regionId??null}}const cs={user:null,mode:"guest",isAuthenticated:!1,isGuest:!0,shellReady:!0},we=be((e,t)=>({user:null,mode:"guest",isAuthenticated:!1,isGuest:!1,shellReady:!1,visitorId:"",bootstrapped:!1,suppressGuestGate:!1,clearGuestGateSuppression:()=>e({suppressGuestGate:!1}),enterGuest:n=>{Te.getState().hydrate(void 0),e({...cs,visitorId:t().visitorId||Oe(),suppressGuestGate:!!(n!=null&&n.suppressGate)})},hydrateFromServer:async()=>{const n=++ce;if(!is()||!O()){t().isAuthenticated||t().enterGuest(),e({bootstrapped:!0});return}const a=L.getState().workspaceId||"ws-mss-ai";try{const r=await Fa(a);if(n!==ce)return;if(r.ok){const o=At(r.user);Te.getState().hydrate(o.platformRole),e({user:o,mode:"user",isAuthenticated:!0,isGuest:!1,shellReady:!0,visitorId:t().visitorId||Oe(),bootstrapped:!0});return}}catch{if(n!==ce)return;t().isAuthenticated||t().enterGuest(),e({bootstrapped:!0});return}if(n===ce){if(Me(null),t().isAuthenticated&&t().user){e({bootstrapped:!0});return}t().enterGuest(),e({bootstrapped:!0})}},login:async(n,s)=>{const a=L.getState().workspaceId||"ws-mss-ai",r=t().visitorId||Oe();ce+=1;const o=L.getState().apiStatus;if(O()&&o!=="unreachable"&&o!=="local-demo")try{const m=await Da({email:n,password:s,workspaceId:a,visitorId:r});if(m.ok&&m.token){Me(m.token);const c=At(m.user);return Te.getState().hydrate(c.platformRole),L.setState({apiConnected:!0,apiStatus:"connected"}),e({user:c,mode:"user",isAuthenticated:!0,isGuest:!1,shellReady:!0,visitorId:r,suppressGuestGate:!1,bootstrapped:!0}),{ok:!0}}if(m.ok===!1){const c=m.error||"登录失败";if(/密码|账号|不存在|停用|尚未|未激活/.test(c)&&!/\b40[45]\b/.test(c))return{ok:!1,error:c}}}catch{L.setState({apiConnected:!1,apiStatus:"unreachable"})}const d=await ns(n,s);if(!d.ok)return{ok:!1,error:d.error};Me(null);const p=ls(d.account);return Te.getState().hydrate(p.platformRole),e({user:p,mode:"user",isAuthenticated:!0,isGuest:!1,shellReady:!0,visitorId:r,suppressGuestGate:!1,bootstrapped:!0}),{ok:!0}},logout:()=>{const n=L.getState().workspaceId||"ws-mss-ai";Ka(n),Me(null),t().enterGuest({suppressGate:!0})},getUserId:()=>{var n;return((n=t().user)==null?void 0:n.id)??""},getUserName:()=>{var n;return((n=t().user)==null?void 0:n.name)??""},getPlatformRole:()=>{var n;return((n=t().user)==null?void 0:n.platformRole)??"viewer"},getOrgAffiliation:()=>{var n,s;return ye({deptIds:((n=t().user)==null?void 0:n.deptIds)??[],regionId:((s=t().user)==null?void 0:s.regionId)??null})}})),jo=Object.freeze(Object.defineProperty({__proto__:null,useSessionStore:we},Symbol.toStringTag,{value:"Module"}));function ze(){return we.getState().getUserId()}function ds(){return we.getState().getUserName()}function Ht(){return we.getState().getPlatformRole()}function ot(){return we.getState().getOrgAffiliation()}function ps(){return ot().deptIds}function ms(){return ot().regionId??null}function us(e){return(e??Ht())==="super_admin"}const $o=Object.freeze(Object.defineProperty({__proto__:null,getCurrentDeptIds:ps,getCurrentOrgAffiliation:ot,getCurrentPlatformRole:Ht,getCurrentRegionId:ms,getCurrentUserId:ze,getCurrentUserName:ds,isSystemAdmin:us},Symbol.toStringTag,{value:"Module"})),fs=T(["user","agent","other","system","typing","plan","step"]),gs=Q({role:fs,text:g().optional(),name:g().optional(),avatar:g().optional(),streaming:Ye().optional(),planId:g().optional(),steps:se(g()).optional(),awaitingApproval:Ye().optional(),mountedSkills:se(g()).optional(),stepId:g().optional(),index:fe().optional(),total:fe().optional(),label:g().optional(),stepStatus:T(["pending","running","done"]).optional()}),hs=Q({id:g(),title:g(),type:T(["bot","group"]),icon:g(),color:g(),status:g(),history:se(gs),prompts:se(g()),sessionGroup:T(["pinned","agents"]).optional(),iconBg:g().optional(),badge:g().optional(),agentId:g().optional(),actionType:T(["marketing","knowledge"]).optional(),taskSource:T(["skill","expert","case_demo","embedded","other"]).optional(),businessScenarioId:T(["S1","S2","S3","S4","S5","S6","S7","S8"]).optional(),skillId:g().optional(),ownerUserId:g().optional(),ownerEmail:g().optional(),createdAt:fe().optional(),pinnedAt:fe().optional(),adminId:g().optional(),members:se(Q({id:g(),name:g(),email:g().optional(),avatar:g().optional(),role:T(["admin","member"]),canUseAi:Ye().default(!0)})).optional()});function De(e){return e.type==="group"||e.sessionGroup==="pinned"}function zo(e,t){var s;const n=ze();return De(e)?e.adminId?e.adminId===n:((s=e.members)==null?void 0:s.some(a=>a.id===n&&a.role==="admin"))??!1:!1}function Do(e,t){var a;const n=ze();if(!De(e)||!((a=e.members)!=null&&a.length))return!0;const s=e.members.find(r=>r.id===n);return(s==null?void 0:s.canUseAi)!==!1}function Fo(e,t){if(De(e))return!1;const n=(t??ze()).trim();return n?e.ownerUserId===n:!1}const xs=new Set(["marketing","knowledge","smoke_task","test_task"]);function Ko(e){return!!(e.id.startsWith("task_")||e.id.startsWith("warroom_")||xs.has(e.id)||e.sessionGroup==="agents"||!e.sessionGroup&&e.type==="bot")}T(["chat","agent","prompt","skill","tool","workflow","knowledge","memory","settings"]);const Uo=Q({skill:g(),time:g(),label:g(),detail:g()});const ks=[{id:"agent-marketing",primarySkillId:"skill-data-analysis",agentType:"marketing",systemPrompt:"你是 MSS 营销 Agent，面向业务的问数、问报告与智能分析专家。优先编排：多源数据分析 → SO/零售洞察 → 价格与异动解释 → 行动建议与简报。口径不清时先声明假设。标注演示样例。",demoPrompt:"@营销 Agent 请基于演示样例做一次智能分析：近一周欧洲穿戴销售趋势、代表处排名异动，并输出可进例会的简报与三条行动建议（可衔接 /数据分析、/so报表）。",planSteps:["澄清问数/问报告目标与口径","挂载数据分析并汇总关键指标（/数据分析）","对齐 SO/零售报表并标注异常（/so报表、零售洞察）","输出洞察结论、风险与行动建议简报"],mockReport:`✅ **营销 Agent 完成**（演示样例）

### 问数结论
欧洲穿戴周 SO 环比偏正；DE/UK 领跑；南欧库存效率待改善。

### 报告要点
- 渠道：UK 高转化素材可复用
- 价格：关注促销 ROI 回落 SKU
- 库存：南欧畅销 SKU 需补货

### 行动
1. 补齐南欧畅销 SKU  
2. 复用 UK 高转化素材  
3. 下周复盘促销 ROI`},{id:"agent-data-analysis",primarySkillId:"skill-data-analysis",agentType:"marketing",systemPrompt:"你是 MSS 数据分析专家。优先编排：多源数据分析 → SO 报表 → 工作总结。输出可进例会的洞察与 NBA，口径不清时先声明。标注演示样例。",demoPrompt:"@数据分析 Agent /数据分析 请基于演示样例，输出近一周欧洲穿戴销售趋势、代表处排名异动与行动建议；必要时衔接 /so报表 口径说明。",planSteps:["挂载主 Skill：多源数据分析（/数据分析）","对齐 SO 口径并校验异常（/so报表）","归因拆解与可视化要点","汇总行动建议并生成简要工作总结要点"],mockReport:`✅ **数据分析 Agent 编排完成**（演示样例）

### 编排路径
1. MultiSourceAnalysis → 2. SO 报表口径 → 3. 行动建议

### 结论摘要
欧洲穿戴周 SO 环比偏正；DE/UK 领跑；南欧库存效率待改善。

### 行动
- 补齐南欧畅销 SKU
- 复用 UK 高转化素材
- 下周复盘促销 ROI`},{id:"agent-doc-review",primarySkillId:"skill-doc-compliance",agentType:"knowledge",systemPrompt:"你是文档解读与合规专家。优先：合规筛查 → 文档生成改写建议 → 文档解析。明确非法律意见，需合规终审。",demoPrompt:"@文档解读 Agent /合规筛查 请对演示样例营销文案做合规筛查，并给出改写要点与待人工确认项。",planSteps:["挂载合规筛查 Skill","定位高/中风险表述","给出改写与放行条件","必要时生成合规友好初稿要点"],mockReport:`✅ **文档解读 Agent 完成**（演示样例）

### 风险
高 1 / 中 2（演示）

### 建议
删除绝对化与疑似疗效宣称；补充来源脚注；合规终审后放行。`},{id:"agent-file-organize",primarySkillId:"skill-file-archive",agentType:"knowledge",systemPrompt:"你是文件整理专家。优先智能归档，并输出个人总结要点。命名与路径需可执行。",demoPrompt:"@文件整理 Agent /文件整理 请基于演示样例，给出会议纪要与报表的归档方案，并附本周工作总结要点。",planSteps:["识别文件类型与业务归属","生成归档路径与命名","抽取摘要标签","输出工作总结精简版"],mockReport:`✅ **文件整理 Agent 完成**（演示样例）

### 归档
\`/MSS/区域经营/2026-Q2/\` 下按会议纪要/报表分类（演示）

### 总结要点
本周完成周报与归档对齐；风险在口径不一致。`},{id:"agent-ppt",primarySkillId:"skill-ppt-gen",agentType:"marketing",systemPrompt:"你是 PPT 生成专家。先定大纲与一页一事，再补数据要点；输出可进制作工具的结构而非二进制。",demoPrompt:"@PPT 生成 Agent /ppt 请基于演示样例，生成欧洲穿戴周度经营 PPT 大纲（8～10 页）及每页要点。",planSteps:["确认汇报场景与页数","设计大纲（一页一事）","填充图表与结论页","输出演讲备注"],mockReport:`✅ **PPT 生成 Agent 完成**（演示样例 · 9 页大纲）

封面 → 结论 → SO 趋势 → 排名 → 归因 → DOS → 价格 → 行动项 → 附录。`},{id:"agent-meeting",primarySkillId:"skill-meeting-minutes",agentType:"knowledge",systemPrompt:"你是会议纪要专家。决议/待办必须含 Owner 与 Due；模糊处标「待确认」。可建议 WeCom 推送预览。",demoPrompt:"@会议纪要 Agent /会议纪要 请基于演示样例生成欧洲穿戴周例会纪要，并给出 WeCom 推送预览要点。",planSteps:["提炼决议与待办","整理未决问题","生成可分发纪要","组装企业微信推送预览"],mockReport:`✅ **会议纪要 Agent 完成**（演示样例）

### 待办
缺货清单（供应/周五）；素材本地化（MKT/下周三）

### 推送预览
标题：欧洲穿戴周例会纪要（演示 · 未真实发送）`},{id:"agent-launch-sentiment",primarySkillId:"skill-launch-sentiment",agentType:"marketing",systemPrompt:"你是发布会舆情专家。输出声量/情感/热点与分角色建议，样本不足时给定性并标注演示样例。",demoPrompt:"@舆情快报 Agent /舆情快报 请基于演示样例输出穿戴新品发布 48h 舆情快报与 PR/MKT/服务建议。",planSteps:["界定监测窗口","情感与热点聚类","风险机会识别","分角色建议与推送要点"],mockReport:`✅ **舆情快报 Agent 完成**（演示样例）

情感偏正；热点：续航 / 价格 / 设计。建议放大续航原声，准备价格异议素材。`},{id:"agent-survey",primarySkillId:"skill-survey-insight",agentType:"marketing",systemPrompt:"你是问卷洞察专家。关注 NPS/痛点/分人群差异，给出 MKT/产品/服务可执行建议。",demoPrompt:"@问卷洞察 Agent /问卷洞察 请基于演示样例分析满意度问卷：NPS、痛点 TOP 与行动建议。",planSteps:["样本与题项概览","核心指标与分层","痛点亮点 TOP","行动建议"],mockReport:`✅ **问卷洞察 Agent 完成**（演示样例）

NPS 约 32～38；痛点：物流时效、包装本地化。建议强化物流节点通知。`},{id:"agent-review-collect",primarySkillId:"skill-review-collect",agentType:"knowledge",systemPrompt:"你是评分采集 Agent。优先调用「评分采集」Skill（/评论采集），从 Amazon 等购买页采集订单评论并清洗交接；不做深度情感分析。",demoPrompt:"@评分采集 Agent /评论采集 请采集 Amazon MX 演示样例 ASIN B0FPG9431G（3C）购买页订单评论，输出样本清单并交接翻译。",planSteps:["确认平台/ASIN/品类","采集购买页订单评论","清洗去重与质量标注","交接语种翻译 Agent"],mockReport:`✅ **评分采集 Agent 完成**（演示样例 · B0FPG9431G）

已输出 12 条样本清单（es/en）。请继续调用 **语种翻译 Agent**（/评论翻译）。`},{id:"agent-review-translate",primarySkillId:"skill-review-translate",agentType:"knowledge",systemPrompt:"你是语种翻译 Agent。优先调用「评论语种翻译」Skill（/评论翻译），将多语种评论统一译为英语与中文并保留原文；不做情感聚类。",demoPrompt:"@语种翻译 Agent /评论翻译 请将 Amazon MX 演示样例评论统一译为英语和中文，输出双语对照表。",planSteps:["接收采集样本并识别源语","逐条译为英语与中文","术语统一与低置信度标注","交接评论分析 Agent"],mockReport:`✅ **语种翻译 Agent 完成**（演示样例 · B0FPG9431G）

已输出中英双语对照表。请继续调用 **评论分析 Agent**（/评论分析）。`},{id:"agent-review",primarySkillId:"skill-review-cluster",agentType:"knowledge",systemPrompt:"你是评论分析 Agent。优先调用「订单评论分析」Skill（/评论分析），承接采集+翻译后的清洗语料，输出情感判断、用户数据挖掘与行动建议。",demoPrompt:"@评论分析 Agent /评论分析 请基于已清洗的 Amazon MX 演示样例 ASIN B0FPG9431G 输出情感判断、用户洞察、卖点 GAP 与分角色建议。",planSteps:["确认上游采集/翻译语料","情感判断与主题聚类","用户数据挖掘与预警","电商/服务/MKT 行动建议"],mockReport:`✅ **评论分析 Agent 完成**（演示样例 · B0FPG9431G · 经采集→翻译）

负面 TOP：GPS 精度 / 价格预期 / 连接偶发。建议 Listing 补 GPS 场景说明，服务沉淀多语 FAQ。`},{id:"agent-retail-insight",primarySkillId:"skill-retail-insight",agentType:"marketing",systemPrompt:"你是零售洞察 π 专家。聚焦 DOS/转化/陈列异常门店与可执行动作。",demoPrompt:"@零售洞察 Agent /零售洞察 请基于演示样例输出 3 月代表处 DOS/转化洞察与异常门店动作。",planSteps:["选定范围与口径","识别异常/机会门店","原因假设","零售/供应/培训动作"],mockReport:`✅ **零售洞察 Agent 完成**（演示样例）

南欧 12 家 DOS 偏高；建议补货 + 陈列换新 + 复制 DE 话术。`},{id:"agent-price-monitor",primarySkillId:"skill-price-monitor",agentType:"marketing",systemPrompt:"你是价格监测专家。关注异常降价/窜货与 offer 变化，给电商与渠道跟进建议。",demoPrompt:"@价格监测 Agent /价格监测 请基于演示样例输出 DE/UK/MX 主力 SKU 价格与 offer 监测简报。",planSteps:["确认国家渠道 SKU","聚合价格与 offer","异常告警","跟进建议与推送要点"],mockReport:`✅ **价格监测 Agent 完成**（演示样例）

UK 第三方 -4% 需核实授权促销；建议核对价盘并同步活动日历。`},{id:"agent-hr-resume",primarySkillId:"skill-resume-screen",agentType:"knowledge",systemPrompt:"你是招聘协同专家。编排：JD 解析 → 简历筛选 → 面试分析。辅助决策，非录用决定。",demoPrompt:"@简历筛选 Agent /简历筛选 请基于演示样例完成人岗匹配，并说明与 JD 解析、面试分析的衔接要点。",planSteps:["对齐 JD 关键要求（/jd解析）","简历匹配打分（/简历筛选）","输出面试关注清单","说明二面/面试分析衔接"],mockReport:`✅ **招聘协同 Agent 完成**（演示样例）

匹配 78/100；建议推进一面。硬性：电商 3 年；关注跳槽频率与英语场景题。`},{id:"agent-training",primarySkillId:"skill-training-gen",agentType:"knowledge",systemPrompt:"你是培训内容专家。生成大纲/测验/演练，并可衔接门店陪练。",demoPrompt:"@培训内容 Agent /培训内容 请基于演示样例生成 Nova 新品 45 分钟门店培训大纲，并给出一轮陪练场景要点。",planSteps:["设计学习目标与大纲","生成测验与演练脚本","衔接陪练考核点","培训后跟踪建议"],mockReport:`✅ **培训内容 Agent 完成**（演示样例）

45' 大纲已生成；陪练场景：价格异议处理，话术完整性 4/5。`},{id:"agent-knowledge",primarySkillId:"skill-rag",agentType:"knowledge",systemPrompt:"你是 MSS 知识 Agent，面向业务的知识问答与知识陪练专家。编排：检索 → 重排 → SOP/话术；需要演练时衔接培训与陪练。回答必须带引用，未命中时诚实说明。",demoPrompt:"@知识 Agent 请基于演示样例完成：1）回答「欧洲门店 DOS 过高应按什么 SOP 处理？」并给出引用；2）给出一轮相关话术陪练要点。",planSteps:["澄清是知识问答还是陪练演练","分区检索与重排（/检索、/rerank）","生成带引用回答或匹配 SOP","如需陪练则给出场景脚本与评分要点"],mockReport:`✅ **知识 Agent 完成**（演示样例）

### 知识问答
命中《DOS 异常处置 SOP》；流程：核对口径 → 识别缺货/滞销 → 调拨/促销 → 培训跟进。

### 陪练要点
场景：库存异议解释；先对齐口径再给动作；话术完整性建议 4/5。`},{id:"agent-retail-coach",primarySkillId:"skill-retail-coach",agentType:"knowledge",systemPrompt:"你是零售陪练专家。模拟顾客异议、评分并给金句；可衔接培训内容。",demoPrompt:"@零售陪练 Agent /陪练 请基于演示样例开展「价格贵」异议处理陪练：脚本、评分与改进建议。",planSteps:["设定场景与考核点","模拟对话并评分","输出改进与金句","建议再练与培训衔接"],mockReport:`✅ **零售陪练 Agent 完成**（演示样例）

评分：话术 4/5 · 价值塑造 3/5。先共情再对比，补充以旧换新钩子。`}],bs=new Map(ks.map(e=>[e.id,e]));function ys(e){return e?bs.get(e)??null:null}const Ss=[{id:"agent-marketing",name:"营销 Agent",desc:"【业务专家】AI 问数、问报告与智能分析：销售/渠道/零售数据洞察与行动建议（编排多技能）",category:"manage",bizLine:"GTM/MKT/渠道",homeTag:"gtm",ownerDeptIds:["gtm","mkt","channel","retail","ecommerce"],ownerRegionIds:["china","apac","mea","latam","europe","eurasia"],author:"华为 MSS",published:!0,invokes:5200,updatedAt:"2026-08-12",skillIds:["skill-data-analysis","skill-so-report","skill-weekly-report","skill-retail-insight","skill-price-monitor","skill-work-summary"],chatId:"marketing",icon:"fa-chart-line",color:"from-zinc-800 to-zinc-950",scenarioTags:["问数","报表","分析","营销","SO"]},{id:"agent-data-analysis",name:"数据分析 Agent",desc:"【办公提效】多源数据自动分析，融合 ISRP/零售/电商数据输出洞察报表（可对话编排 Skill）",category:"office",bizLine:"GTM/渠道",homeTag:"gtm",ownerDeptIds:["gtm","channel"],ownerRegionIds:["latam","mea","eurasia","china"],author:"华为 MSS",published:!0,invokes:4280,updatedAt:"2026-08-05",skillIds:["skill-data-analysis","skill-so-report","skill-work-summary"],chatId:"marketing",icon:"fa-chart-pie",color:"from-zinc-700 to-zinc-900",scenarioTags:["综履","结算","返利","SO"]},{id:"agent-doc-review",name:"文档解读 Agent",desc:"【办公提效】营销物料/合同/招投标文档内容正确性、风险与合规筛查（可对话编排 Skill）",category:"office",bizLine:"MKT/质量与运营",homeTag:"mkt",ownerDeptIds:["mkt","quality"],ownerRegionIds:["europe"],author:"华为 MSS",published:!0,invokes:3150,updatedAt:"2026-07-28",skillIds:["skill-doc-compliance","skill-doc-gen","skill-doc-parser"],chatId:"knowledge",icon:"fa-file-shield",color:"from-stone-500 to-zinc-700",scenarioTags:["办公提效","平台","合规","质量与运营"]},{id:"agent-file-organize",name:"文件整理 Agent",desc:"【办公提效】本地文件夹/员工助手/Email 多源文件清洗归档与个人总结（可对话编排 Skill）",category:"office",bizLine:"HR",homeTag:"hr",ownerDeptIds:["hr"],author:"华为 MSS",published:!0,invokes:1890,updatedAt:"2026-06-18",skillIds:["skill-file-archive","skill-work-summary","skill-doc-parser"],chatId:"marketing",icon:"fa-folder-tree",color:"from-slate-600 to-slate-800",scenarioTags:["知识","归档"]},{id:"agent-ppt",name:"PPT 生成 Agent",desc:"【办公提效】多源数据驱动 PPT 自动生成，支持员工助手内部 POC 验证（可对话编排 Skill）",category:"office",bizLine:"MKT/GTM",homeTag:"mkt",ownerDeptIds:["mkt","gtm"],ownerRegionIds:["latam"],author:"华为 MSS",published:!0,invokes:2240,updatedAt:"2026-07-09",skillIds:["skill-ppt-gen","skill-data-analysis","skill-doc-gen"],chatId:"marketing",icon:"fa-file-powerpoint",color:"from-neutral-500 to-zinc-700",scenarioTags:["办公提效","PPT","平台"]},{id:"agent-meeting",name:"会议纪要 Agent",desc:"【办公提效】会议纪要 AI 自动生成，小批量试点 60% AI + 40% 人工（可对话编排 Skill）",category:"office",bizLine:"HR",homeTag:"hr",ownerDeptIds:["hr"],author:"华为 MSS",published:!0,invokes:5340,updatedAt:"2026-08-14",skillIds:["skill-meeting-minutes","skill-doc-gen","skill-wecom"],chatId:"marketing",icon:"fa-clipboard-list",color:"from-slate-500 to-zinc-700",scenarioTags:["办公提效","会议","平台"]},{id:"agent-launch-sentiment",name:"舆情快报 Agent",desc:"【管理提效】产品发布舆情 AI 分析快报，面向 MKT/服务（可对话编排 Skill）",category:"manage",bizLine:"MKT/服务",homeTag:"mkt",ownerDeptIds:["mkt","service"],ownerRegionIds:["europe"],author:"华为 MSS",published:!0,invokes:1420,updatedAt:"2026-06-30",skillIds:["skill-launch-sentiment","skill-doc-gen","skill-wecom"],chatId:"marketing",icon:"fa-bullhorn",color:"from-zinc-600 to-zinc-800"},{id:"agent-survey",name:"问卷洞察 Agent",desc:"【管理提效】洞察部用户问卷调研设计与开放题洞察分析（可对话编排 Skill）",category:"manage",bizLine:"MKT",homeTag:"mkt",ownerDeptIds:["mkt"],author:"华为 MSS",published:!0,invokes:980,updatedAt:"2026-05-22",skillIds:["skill-survey-insight","skill-data-analysis","skill-doc-gen"],chatId:"marketing",icon:"fa-square-poll-vertical",color:"from-stone-500 to-zinc-600"},{id:"agent-review-collect",name:"评分采集 Agent",desc:"【管理提效】采集 Amazon 等平台 3C 商品购买页用户订单评论，清洗后交接翻译链路（可对话编排 Skill）",category:"manage",bizLine:"电商/服务",homeTag:"ecommerce",ownerDeptIds:["ecommerce","service"],ownerRegionIds:["apac","europe","latam"],author:"华为 MSS",published:!0,invokes:2100,updatedAt:"2026-07-16",skillIds:["skill-review-collect","skill-review-translate","skill-data-analysis"],chatId:"knowledge",icon:"fa-download",color:"from-emerald-700 to-slate-800",scenarioTags:["评论分析","评论","电商"]},{id:"agent-review-translate",name:"语种翻译 Agent",desc:"【管理提效】将采集的多语种订单评论统一翻译成英语与中文，保留原文对照（可对话编排 Skill）",category:"manage",bizLine:"电商/服务",homeTag:"ecommerce",ownerDeptIds:["ecommerce","mkt","service"],ownerRegionIds:["apac","europe","latam"],author:"华为 MSS",published:!0,invokes:1960,updatedAt:"2026-07-02",skillIds:["skill-review-translate","skill-review-cluster","skill-doc-gen"],chatId:"knowledge",icon:"fa-language",color:"from-sky-600 to-slate-700",scenarioTags:["评论分析","评论","电商","翻译","本地化","小语种"]},{id:"agent-review",name:"评论分析 Agent",desc:"【管理提效】对采集清洗并完成中英翻译的订单评论做情感判断与用户数据挖掘，面向电商/服务/MKT",category:"manage",bizLine:"电商/服务",homeTag:"ecommerce",ownerDeptIds:["ecommerce","service","mkt"],ownerRegionIds:["apac","europe"],author:"华为 MSS",published:!0,invokes:2780,updatedAt:"2026-07-21",skillIds:["skill-review-cluster","skill-data-analysis","skill-doc-gen"],chatId:"knowledge",icon:"fa-comments",color:"from-slate-500 to-slate-700",scenarioTags:["评论分析","评论","电商"]},{id:"agent-retail-insight",name:"零售洞察 Agent",desc:"【管理提效】零售信息洞察 π 例行报告，门店 DOS/转化/陈列分析（可对话编排 Skill）",category:"manage",bizLine:"零售/电商",homeTag:"retail",ownerDeptIds:["retail","ecommerce"],ownerRegionIds:["latam","eurasia","china"],author:"华为 MSS",published:!0,invokes:3680,updatedAt:"2026-08-08",skillIds:["skill-retail-insight","skill-so-report","skill-doc-gen"],chatId:"marketing",icon:"fa-store",color:"from-neutral-600 to-zinc-800"},{id:"agent-price-monitor",name:"价格监测 Agent",desc:"【管理提效】18 国多渠道价格 & offer 监测，覆盖 5347 行/周级入表（可对话编排 Skill）",category:"manage",bizLine:"渠道/电商/GTM",homeTag:"gtm",ownerDeptIds:["gtm","channel","ecommerce"],ownerRegionIds:["china","apac","mea","latam","europe","eurasia"],author:"华为 MSS",published:!0,invokes:4120,updatedAt:"2026-08-11",skillIds:["skill-price-monitor","skill-data-analysis","skill-wecom"],chatId:"marketing",icon:"fa-tags",color:"from-emerald-800 to-emerald-900",scenarioTags:["价格监测","offer","价格"]},{id:"agent-hr-resume",name:"简历筛选 Agent",desc:"【流程提效】JD 解析 + 简历筛选 + 面试分析三 Agent 协同，面向 HR/用人部门（可对话编排 Skill）",category:"process",bizLine:"HR",homeTag:"hr",ownerDeptIds:["hr"],author:"华为 MSS",published:!0,invokes:1560,updatedAt:"2026-06-06",skillIds:["skill-jd-parser","skill-resume-screen","skill-interview-analysis"],chatId:"knowledge",icon:"fa-user-check",color:"from-stone-600 to-zinc-800",scenarioTags:["招聘","HR","面试","简历","JD"]},{id:"agent-training",name:"培训内容 Agent",desc:"【流程提效】Nova 新品培训内容生成，多 Agent 对抗协同与门店陪练衔接（可对话编排 Skill）",category:"process",bizLine:"零售/门店",homeTag:"retail",ownerDeptIds:["retail"],ownerRegionIds:["apac"],author:"华为 MSS",published:!0,invokes:1890,updatedAt:"2026-06-24",skillIds:["skill-training-gen","skill-retail-coach","skill-doc-gen"],chatId:"knowledge",icon:"fa-graduation-cap",color:"from-slate-600 to-zinc-700",scenarioTags:["门店","培训"]},{id:"agent-knowledge",name:"知识 Agent",desc:"【业务专家】知识问答与知识陪练：制度/SOP/案例检索问答，并可开展话术与培训陪练（编排多技能）",category:"experience",bizLine:"服务/质量与运营/零售",homeTag:"service",ownerDeptIds:["service","quality","retail","hr"],ownerRegionIds:["china","apac","mea","latam","europe","eurasia"],author:"华为 MSS",published:!0,invokes:3520,updatedAt:"2026-08-01",skillIds:["skill-rag","skill-rerank","skill-knowledge-digest","skill-complaint-sop","skill-frontline-script","skill-retail-coach","skill-training-gen"],chatId:"knowledge",icon:"fa-book-open",color:"from-zinc-600 to-zinc-800",scenarioTags:["知识","RAG","SOP","检索","客诉"]},{id:"agent-retail-coach",name:"零售陪练 Agent",desc:"【体验提升】门店 AI 陪练、卖点演练与考核反馈，衔接培训内容 Agent（可对话编排 Skill）",category:"experience",bizLine:"零售/门店",homeTag:"retail",ownerDeptIds:["retail"],ownerRegionIds:["apac"],author:"华为 MSS",published:!0,invokes:860,updatedAt:"2026-05-15",skillIds:["skill-retail-coach","skill-training-gen","skill-wecom"],chatId:"knowledge",icon:"fa-headset",color:"from-zinc-700 to-zinc-900",scenarioTags:["门店","培训","Nova","陪练"]}];function ws(e){const t=ys(e.id);return t?{...e,systemPrompt:t.systemPrompt,primarySkillId:t.primarySkillId,demoPrompt:t.demoPrompt,planSteps:[...t.planSteps]}:e}const it=Ss.map(ws),vs=new Map(it.map(e=>[e.id,e]));function Bo(e){return e.map(t=>{var a,r;const n=vs.get(t.id);if(!n)return t;const s={};return!t.updatedAt&&n.updatedAt&&(s.updatedAt=n.updatedAt),!((a=t.capabilityTypeIds)!=null&&a.length)&&((r=n.capabilityTypeIds)!=null&&r.length)&&(s.capabilityTypeIds=n.capabilityTypeIds),Object.keys(s).length?{...t,...s}:t})}const Is={"skill-data-analysis":{ownerDeptIds:["gtm"],ownerRegionId:"apac"},"skill-doc-gen":{ownerDeptIds:["mkt"],ownerRegionId:null},"skill-doc-compliance":{ownerDeptIds:["quality"],ownerRegionId:"europe"},"skill-file-archive":{ownerDeptIds:["hr"],ownerRegionId:null},"skill-ppt-gen":{ownerDeptIds:["mkt"],ownerRegionId:null},"skill-meeting-minutes":{ownerDeptIds:["hr"],ownerRegionId:null},"skill-work-summary":{ownerDeptIds:["hr"],ownerRegionId:null},"skill-doc-parser":{ownerDeptIds:["mkt"],ownerRegionId:null},"skill-launch-sentiment":{ownerDeptIds:["mkt"],ownerRegionId:"europe"},"skill-survey-insight":{ownerDeptIds:["mkt"],ownerRegionId:null},"skill-review-collect":{ownerDeptIds:["ecommerce"],ownerRegionId:"apac"},"skill-review-translate":{ownerDeptIds:["ecommerce"],ownerRegionId:"apac"},"skill-review-cluster":{ownerDeptIds:["ecommerce"],ownerRegionId:"apac"},"skill-retail-insight":{ownerDeptIds:["retail"],ownerRegionId:"latam"},"skill-price-monitor":{ownerDeptIds:["gtm"],ownerRegionId:"apac"},"skill-so-report":{ownerDeptIds:["gtm"],ownerRegionId:"apac"},"skill-jd-parser":{ownerDeptIds:["hr"],ownerRegionId:null},"skill-resume-screen":{ownerDeptIds:["hr"],ownerRegionId:null},"skill-interview-analysis":{ownerDeptIds:["hr"],ownerRegionId:null},"skill-training-gen":{ownerDeptIds:["retail"],ownerRegionId:"apac"},"skill-rag":{ownerDeptIds:["service"],ownerRegionId:null},"skill-rerank":{ownerDeptIds:["service"],ownerRegionId:null},"skill-retail-coach":{ownerDeptIds:["retail"],ownerRegionId:"apac"},"skill-complaint-sop":{ownerDeptIds:["service"],ownerRegionId:"eurasia"},"skill-wecom":{ownerDeptIds:["service"],ownerRegionId:null},"skill-l10n-localize":{ownerDeptIds:["mkt"],ownerRegionId:"mea"},"skill-sales-copy":{ownerDeptIds:["mkt"],ownerRegionId:null},"skill-frontline-script":{ownerDeptIds:["service"],ownerRegionId:null},"skill-knowledge-digest":{ownerDeptIds:["service"],ownerRegionId:null},"skill-weekly-report":{ownerDeptIds:["gtm"],ownerRegionId:"apac"},"skill-comp-brief":{ownerDeptIds:["gtm"],ownerRegionId:"apac"},"skill-channel-brief":{ownerDeptIds:["channel"],ownerRegionId:"china"},"skill-email-draft":{ownerDeptIds:["mkt"],ownerRegionId:null}};function As(e){if(e!=null&&e.length)return[e[0]]}function Ts(e){return e.map(t=>Ms(t))}function Ms(e){const t=Is[e.id];if(t){const s=t.ownerRegionId??null;return{...e,sourceType:e.sourceType??"internal",visibility:"org",ownerDeptIds:[...t.ownerDeptIds],ownerRegionId:s,ownerRegionIds:s?[s]:[],featuredInDoTask:typeof e.featuredInDoTask=="boolean"?e.featuredInDoTask:void 0,featuredInMssMarket:typeof e.featuredInMssMarket=="boolean"?e.featuredInMssMarket:void 0,published:e.published!==!1}}const n=e.ownerRegionId??null;return{...e,sourceType:e.sourceType??"internal",visibility:e.visibility??"org",ownerDeptIds:As(e.ownerDeptIds),ownerRegionId:n,ownerRegionIds:Array.isArray(e.ownerRegionIds)&&e.ownerRegionIds.length>0?[e.ownerRegionIds[0]]:n?[n]:[]}}const Ps=/[\u4e00-\u9fff]/,qt={"skill-data-analysis":"多源数据分析","skill-doc-gen":"文档初稿生成","skill-doc-compliance":"文档合规筛查","skill-file-archive":"智能文件归档","skill-ppt-gen":"PPT 自动生成","skill-meeting-minutes":"会议纪要生成","skill-work-summary":"个人工作总结","skill-doc-parser":"文档解析","skill-launch-sentiment":"发布会舆情快报","skill-survey-insight":"问卷洞察分析","skill-review-collect":"评分采集","skill-review-translate":"评论语种翻译","skill-review-cluster":"订单评论分析","skill-retail-insight":"零售信息洞察","skill-price-monitor":"价格与 Offer 监测","skill-so-report":"SO/SI 报表","skill-jd-parser":"JD 解析","skill-resume-screen":"简历筛选","skill-interview-analysis":"面试分析","skill-training-gen":"培训内容生成","skill-rag":"企业知识检索","skill-rerank":"检索重排序","skill-retail-coach":"零售 AI 陪练","skill-complaint-sop":"客诉 SOP 匹配","skill-wecom":"企微消息推送","skill-l10n-localize":"小语种本地化翻译","skill-sales-copy":"卖点文案写作","skill-frontline-script":"一线统一话术","skill-knowledge-digest":"组织知识沉淀","skill-weekly-report":"经营分析周报","skill-comp-brief":"竞品简报","skill-channel-brief":"渠道作战简报","skill-email-draft":"商务邮件草稿"};function Ze(e){return!!(e&&Ps.test(e))}function Cs(e){var a;const t=(a=e.nameZh)==null?void 0:a.trim();if(t)return t;const n=e.id?qt[e.id]:void 0;if(n)return n;if(Ze(e.name))return e.name.trim();const s=(e.command||"").replace(/^\//,"").trim();return Ze(s)?s:(e.name||e.nameEn||"未命名技能").trim()}function Go(e){return(e.descZh||e.desc||e.descEn||"").trim()}function Wo(e){const t=(e.nameZh||Cs(e)||"").trim(),n=(e.descZh||e.desc||"").trim();return{...e,nameZh:t,descZh:n,name:t||(e.nameEn||e.name||"").trim(),desc:n||(e.descEn||e.desc||"").trim()}}function Rs(e){var s,a;const t=((s=e.nameZh)==null?void 0:s.trim())||qt[e.id]||void 0,n=((a=e.nameEn)==null?void 0:a.trim())||(e.name&&!Ze(e.name)?e.name.trim():void 0);return!t&&!n?e:{...e,...t?{nameZh:t}:{},...n?{nameEn:n}:{}}}function Z(e,t="Skill"){const n=["120ms","280ms","450ms","360ms","520ms","300ms"];return e.map((s,a)=>({skill:`${t}_${a+1}`,time:n[a%n.length],label:s,detail:`执行：${s}`}))}function U(e){return{...e,execSteps:e.execSteps??Z(e.planSteps,"Office")}}const Os=[U({id:"skill-data-analysis",agentType:"marketing",planSteps:["解析分析意图与业务实体（品类/区域/时间窗）","对齐多源指标口径（ISRP / 零售 / 电商）","异动归因与关键驱动因子拆解","生成可视化要点与下一步行动建议"],demoPrompt:"/数据分析 请基于演示样例，输出近一周欧洲穿戴品类销售趋势：环比、TOP 代表处、异动归因与 NBA 建议。",instructions:`你是 MSS「多源数据分析」Skill（/数据分析）。基于 ISRP/零售/电商等多源数据做趋势与归因分析。

## 输入
- 品类、区域、时间窗；或用户粘贴的指标摘要
- 无真实数据时使用演示样例并标注「演示样例」

## 必须输出
1. 分析范围与口径说明
2. 核心指标表（销量/SO/环比等，样本不足写区间或定性）
3. 异动归因 TOP3
4. 可视化建议（图表类型与维度）
5. 行动建议（业务侧可执行）
6. 数据局限

## 原则
- 不编造精确到个位的虚假统计
- 口径不一致时先声明再分析`,mockReport:`✅ **多源数据分析已完成**（演示样例 · 欧洲穿戴 · 近一周）

### 一、分析范围
| 项目 | 内容 |
| --- | --- |
| 品类 | 穿戴 |
| 区域 | 欧洲代表处汇总 |
| 口径 | ISRP SO（演示批次） |

### 二、核心指标
- 周 SO：环比约 **+6%～9%**（演示区间）
- TOP 代表处：DE / UK / FR
- 低潜点：南欧部分门店 DOS 偏高

### 三、异动归因 TOP3
1. 新品上架拉动线上 SO
2. 周末促销放大转化
3. 部分 SKU 缺货抑制进一步增长

### 四、行动建议
- 补齐南欧畅销 SKU 库存
- 对 UK 高转化素材做跨区复用
- 下周复盘促销 ROI`}),U({id:"skill-doc-gen",agentType:"knowledge",planSteps:["明确文档类型、受众与篇幅","抽取要点并搭提纲","生成初稿正文（分节）","补充待确认清单与引用占位"],demoPrompt:"/文档生成 请基于演示样例，生成一份「欧洲穿戴 Q2 业务复盘」初稿（含背景、结论、行动项，标注待确认）。",instructions:`你是 MSS「文档初稿生成」Skill（/文档生成）。

## 输入
- 主题、受众、文档类型（纪要/方案/复盘等）
- 无素材时用演示样例并标注

## 必须输出
1. 文档元信息（标题、受众、版本）
2. 提纲
3. 初稿正文（Markdown）
4. 「待确认」清单
5. 建议下一步（评审/补数）

## 原则
- 事实不足处明确写「待确认」
- 不假装已引用未提供的内部文件`,mockReport:`✅ **文档初稿已生成**（演示样例 · 欧洲穿戴 Q2 业务复盘）

### 元信息
- 标题：欧洲穿戴 Q2 业务复盘（演示）
- 受众：区域经营例会
- 版本：v0.1 草稿

### 提纲
1. 背景与目标
2. 业绩结论
3. 问题与机会
4. 行动项

### 初稿摘要
Q2 穿戴 SO 整体稳中有升；线上贡献提升，南欧库存效率待改善。……（全文略，演示）

### 待确认
- [ ] Q2 精确 SO 与毛利口径
- [ ] 南欧缺货 SKU 清单
- [ ] 责任人与截止日期`}),U({id:"skill-doc-compliance",agentType:"knowledge",planSteps:["识别文档类型与适用合规规则集","扫描敏感用语/承诺/医疗宣称","输出风险分级与原文定位","给出改写建议与放行条件"],demoPrompt:"/合规筛查 请对演示样例营销文案做合规筛查：标出高风险表述、依据要点与改写建议。",instructions:`你是 MSS「文档合规筛查」Skill（/合规筛查）。面向营销物料/合同摘要/招投标用语做风险提示。

## 必须输出
1. 文档类型判断
2. 风险清单（高/中/低）+ 原文摘录
3. 规则要点（简述，非法律意见）
4. 改写建议
5. 人工复核建议

## 原则
- 明确「非法律意见，需合规同学终审」
- 不确定规则时降级为「建议复核」`,mockReport:`✅ **合规筛查完成**（演示样例 · 营销物料）

### 风险摘要
| 级别 | 数量 | 说明 |
| --- | --- | --- |
| 高 | 1 | 疑似疗效/医疗宣称 |
| 中 | 2 | 绝对化用语 |
| 低 | 1 | 来源未标注 |

### 高风险摘录
> 「本产品可治愈失眠」（演示文案）
- 建议：改为功效边界清晰的体验描述，删除「治愈」

### 放行条件
- 合规同学确认改写稿
- 补充数据来源脚注

> 本结果为演示提示，非法律意见。`}),U({id:"skill-file-archive",agentType:"knowledge",planSteps:["识别文件类型与业务归属","生成归档路径与命名建议","抽取摘要与标签","输出归档清单与待人工确认项"],demoPrompt:"/文件整理 请基于演示样例，将一批会议纪要与报表整理为归档方案（路径、命名、标签、摘要）。",instructions:`你是 MSS「智能文件归档」Skill（/文件整理）。

## 必须输出
1. 归档原则（命名/目录）
2. 文件清单表（原名 → 建议名 → 路径 → 标签）
3. 每份 1～2 句摘要
4. 冲突/重复提示
5. 待确认项`,mockReport:`✅ **文件归档方案已生成**（演示样例）

### 归档原则
- 根目录：\`/MSS/区域经营/2026-Q2/\`
- 命名：\`YYYYMMDD_主题_版本\`

### 清单（节选）
| 原名 | 建议名 | 路径 |
| --- | --- | --- |
| 纪要final.docx | 20260612_欧洲穿戴例会_v1.docx | 会议纪要/ |
| SO_week.xlsx | 20260610_欧洲穿戴_SO周报_v1.xlsx | 报表/ |

### 待确认
- 是否合并两份重复「周报」`}),U({id:"skill-ppt-gen",agentType:"marketing",planSteps:["确认汇报场景与页数预算","设计幻灯片大纲（一页一事）","填充关键图表与结论页","输出演讲备注与附录建议"],demoPrompt:"/ppt 请基于演示样例，生成「欧洲穿戴周度经营」PPT 大纲（8～10 页）及每页要点。",instructions:`你是 MSS「PPT 自动生成」Skill（/ppt）。输出可直接进制作工具的大纲与要点，而非二进制文件。

## 必须输出
1. 汇报目标与受众
2. 页级大纲（标题 + 3～5 要点）
3. 建议图表类型
4. 演讲备注要点
5. 附录/备份页建议`,mockReport:`✅ **PPT 大纲已生成**（演示样例 · 欧洲穿戴周度经营 · 9 页）

1. **封面** — 欧洲穿戴周报（演示）
2. **本周结论** — 一句话 + 3 个要点
3. **SO 趋势** — 折线：近 4 周（演示数据）
4. **代表处排名** — 条形 TOP5
5. **异动归因** — 驱动/抑制因子
6. **库存与 DOS** — 风险门店
7. **竞品/价格观察** — 要点卡片
8. **行动项** — Owner / Due
9. **附录** — 口径说明

### 演讲备注
先讲结论，再展开归因；南欧库存单独强调。`}),U({id:"skill-meeting-minutes",agentType:"knowledge",planSteps:["识别会议主题、参会方与议程","提炼决议与待办（Owner/Due）","整理讨论要点与未决问题","生成可分发纪要稿"],demoPrompt:"/会议纪要 请基于演示样例，生成欧洲穿戴周例会纪要：决议、待办、未决问题。",instructions:`你是 MSS「会议纪要生成」Skill（/会议纪要）。默认 60% AI 结构化 + 40% 人工确认。

## 必须输出
1. 会议元信息
2. 决议列表
3. 待办表（事项/Owner/Due/优先级）
4. 讨论要点
5. 未决问题
6. 需人工确认的模糊表述`,mockReport:`✅ **会议纪要已生成**（演示样例 · 欧洲穿戴周例会）

### 元信息
- 时间：2026-06-12（演示）
- 主持：区域经营 Owner

### 决议
1. 下周优先补货南欧畅销 SKU
2. UK 高转化素材同步 DE

### 待办
| 事项 | Owner | Due |
| --- | --- | --- |
| 输出缺货清单 | 供应链 | 本周五 |
| 素材本地化 | MKT | 下周三 |

### 未决
- 促销预算是否追加（待财务）`}),U({id:"skill-work-summary",agentType:"knowledge",planSteps:["确认总结周期与角色视角","归类成果/进展/风险/求助","生成 Markdown 正文","给出可粘贴到周报系统的精简版"],demoPrompt:"/工作总结 请基于演示样例，生成个人本周工作总结（成果、进展、风险、下周计划）。",instructions:`你是 MSS「个人工作总结」Skill（/工作总结）。

## 必须输出
1. 周期与角色
2. 本周成果（可量化优先）
3. 进行中事项
4. 风险与阻塞
5. 下周计划
6. 精简版（5 行内）`,mockReport:`✅ **工作总结已生成**（演示样例 · 本周）

### 成果
- 完成欧洲穿戴周报初稿与例会材料
- 推动南欧缺货清单对齐

### 进行中
- 价格监测周报自动化试点

### 风险
- 部分代表处数据口径未统一

### 下周计划
1. 固化周报模板
2. 跟进补货闭环

### 精简版
本周交付周报与缺货对齐；推进价格监测自动化；风险在口径不一致；下周固化模板并跟闭环。`}),U({id:"skill-doc-parser",agentType:"knowledge",planSteps:["识别文件类型与结构","抽取关键字段/表格摘要","生成结构化摘要","标注解析置信度与人工复核点"],demoPrompt:"/解析文档 请基于演示样例，解析一份 SO 周报 Excel 摘要：字段、关键表、结论要点。",instructions:`你是 MSS「文档解析」Skill（/解析文档）。支持 PDF/Excel/PPT 的结构化摘要（演示环境用文本样例）。

## 必须输出
1. 文件类型与页/表概览
2. 关键字段/表头
3. 结构化摘要
4. 可疑/空值提示
5. 建议下游 Skill（如 /数据分析）`,mockReport:`✅ **文档解析完成**（演示样例 · SO 周报.xlsx）

### 概览
- 类型：Excel
- Sheet：Overview / ByRep

### 关键字段
\`Region\`, \`SKU\`, \`SO_Qty\`, \`WoW\`

### 摘要
欧洲穿戴周 SO 环比为正；DE/UK 领跑；南欧部分 SKU 空值较多。

### 复核点
- ByRep 中 IT 行 SO 为空（演示）

### 建议下一步
可继续调用 \`/数据分析\` 做归因。`})],Ns="skill-review-cluster",Ls=`你是 MSS 电渠「订单评论分析」Skill（/评论分析）。对**已采集并完成中英双语清洗**的订单评论做正向/负向情感判断与用户数据挖掘，输出可进例会的 VoC 行动建议。

## 在链路中的位置
评分采集 Agent（/评论采集）→ 语种翻译 Agent（/评论翻译）→ **本 Skill（评论分析）**

## 能力范围
- 输入优先：双语对照表（原文 + en + zh）或已清洗 JSON；其次才是原始粘贴评论
- 平台语境：Amazon / Lazada 等电渠订单评论（已购已用）
- 若无上游输出：可使用演示样例 ASIN B0FPG9431G，并明确标注「演示样例」

## 必须输出的结构（Markdown）
1. **报告概览**：产品、ASIN/SKU、站点、评论量、均星、数据来源（是否经采集/翻译）
2. **星级与核心指标**：1–5 星分布、好评率(4–5)、差评率(1–2)
3. **情感与观点**：正/中/负占比；负面 TOP3、正面 TOP3（主题、强度、**中英摘录+原文**）
4. **用户数据挖掘**：人群/场景假设、复购/退换意向信号、高频诉求词云要点
5. **卖点 GAP**：官方/常见卖点 vs 用户感知落差
6. **预警**：退换货意愿、集中质量问题、舆情升级风险
7. **行动建议**（分角色）：电商 Listing / 服务话术 / MKT 素材
8. **数据局限**：样本、翻译置信度、采集窗口

## 原则
- 情感判断以清洗后中英译文为主，争议点回看原文
- 高星评论也可能含痛点，勿只按星级下结论
- 不要编造精确到个位的虚假统计；样本不足时给定性并说明
- 合规：仅作合法市场与口碑分析用途`,Tt=["确认已承接采集+翻译清洗语料（或演示样例）","星级分布与正负向情感判断","主题聚类与用户数据挖掘（诉求/场景/退换信号）","卖点 GAP 与预警识别","生成分角色行动建议（电商 / 服务 / MKT）"];function _s(e="/评论分析"){return`${e} 请基于 Amazon MX 演示样例 ASIN B0FPG9431G（假设已完成采集与中英翻译清洗），输出情感判断、用户数据挖掘、卖点 GAP、预警与分角色建议。`}const Es=`✅ **订单评论分析已完成**（演示样例 · ASIN \`B0FPG9431G\` · 经采集→翻译清洗）

### 一、报告概览
| 项目 | 内容 |
| --- | --- |
| 站点 | Amazon.com.mx |
| 链路 | 评分采集 → 语种翻译 → 评论分析 |
| 情感 | 偏正面；差评集中少数主题 |

### 二、情感与观点（负面 TOP）
1. **运动/GPS 精度** — EN: GPS inaccurate / ZH: GPS 不够准（原文西语，建议复核）
2. **价格预期落差** — 售价敏感，Listing 需强化价值证明
3. **连接偶发** — 中性偏负，服务侧准备排查话术

### 三、用户数据挖掘
- 场景：户外运动 / 日常通知
- 信号：未见批量退换措辞；价格异议与功能预期落差并存

### 四、行动建议
- **电商**：Listing/A+ 补 GPS 场景说明
- **服务**：沉淀中英/西语 FAQ
- **MKT**：筛选高星长评作拥护者素材`,js={id:Ns,instructions:Ls,planSteps:[...Tt],demoPrompt:_s(),mockReport:Es,execSteps:Z([...Tt],"Review"),agentType:"knowledge"},$s="skill-review-collect",zs=`你是 MSS 电渠「评分采集」Skill（/评论采集）。从电商平台商品购买页采集用户订单评论（已购已用），输出可交给下游翻译/分析的干净样本包。

## 能力范围
- 平台：Amazon（含 MX/US/DE 等站点）、Lazada 等电渠购买页
- 典型输入：商品 URL / ASIN / itemId、品类（如 3C 穿戴）、目标评论量、站点国家
- 采集对象：星级、标题、正文、语种线索、Verified Purchase、发布时间（可得则保留）
- 若无真实抓取权限：使用演示样例 ASIN B0FPG9431G（Amazon MX），并标注「演示样例」

## 必须输出的结构（Markdown）
1. **采集任务卡**：平台、站点、ASIN/SKU、品类、目标条数、时间窗
2. **采集结果概览**：实际条数、星级粗分布、语种粗分、Verified 占比（未知则注明）
3. **样本清单表**（至少 8～15 条演示行）：序号 | 星级 | 语种 | 原文摘要 | Verified | 日期
4. **质量与缺口**：重复/空评/疑似刷评、未采到字段、建议补采
5. **交接给下游**：明确可交给「语种翻译 Agent」的字段清单

## 原则
- 只采集合法公开的购买页评论，不做登录绕过或违规抓取说明
- 保留原文，不在本 Skill 内做翻译或深度情感分析
- 不要编造精确到个位的虚假统计；演示样例须标注`,Mt=["确认平台/站点/ASIN 与目标评论量","拉取购买页订单评论并去重清洗","输出星级/语种粗分与样本清单","标注质量缺口并交接给翻译链路"];function Ds(e="/评论采集"){return`${e} 请采集 Amazon MX 演示样例 ASIN B0FPG9431G（3C 穿戴）购买页订单评论，输出任务卡、样本清单（含星级/语种/原文摘要）与交接说明，标注演示样例。`}const Fs=`✅ **评分采集已完成**（演示样例 · ASIN \`B0FPG9431G\` · Amazon MX）

### 一、采集任务卡
| 项目 | 内容 |
| --- | --- |
| 平台/站点 | Amazon.com.mx |
| 品类 | 3C 穿戴 |
| 目标 | 近 90 天订单评论 · 演示批次 12 条 |

### 二、概览
- 星级粗分：偏正面；1–2 星约占少数
- 语种粗分：es-MX 为主，夹杂 en
- Verified：演示样本多数为已购标记

### 三、样本清单（节选）
| # | 星 | 语种 | 原文摘要 |
| --- | --- | --- | --- |
| 1 | 4 | es | GPS 场景有落差，外观好评 |
| 2 | 5 | es | 续航与设计满意 |
| 3 | 3 | en | 连接偶发不稳定 |

### 四、交接
请将样本清单交给 **语种翻译 Agent**（/评论翻译），统一产出中英双语后再进入评论分析。`,Ks={id:$s,instructions:zs,planSteps:[...Mt],demoPrompt:Ds(),mockReport:Fs,execSteps:Z([...Mt],"Collect"),agentType:"knowledge"},Us="skill-review-translate",Bs=`你是 MSS 电渠「语种翻译」Skill（/评论翻译）。将上游采集的多语种订单评论统一翻译为**英语 + 中文**，保留原文，供评论分析使用。

## 能力范围
- 输入：评分采集 Agent 输出的样本清单 / 用户粘贴的多语种评论
- 目标语：English（en）与 简体中文（zh-CN）
- 源语：西语/英语/东南亚语种等（识别不到则标 unknown）
- 若无真实样本：承接演示样例 ASIN B0FPG9431G 的采集输出，并标注「演示样例」

## 必须输出的结构（Markdown）
1. **翻译任务卡**：来源 ASIN/站点、条数、源语分布
2. **双语对照表**：序号 | 星级 | 原文 | 英语译文 | 中文译文 | 置信度（高/中/低）
3. **术语与专名**：品牌/SKU/功能词保持一致（如 GPS、ASIN）
4. **质量备注**：谐音梗、脏话、无法直译处标注「建议人工复核」
5. **交接给下游**：明确可交给「评论分析 Agent」的清洗后语料

## 原则
- **必须保留原文**，译文与原文成对出现
- 不在本 Skill 内做情感聚类或卖点 GAP（留给评论分析）
- 低置信度译文不得伪装成精确；演示样例须标注`,Pt=["接收采集样本并识别源语分布","逐条译为英语与中文并保留原文","统一术语/专名，标注低置信度行","输出双语对照表并交接给分析链路"];function Gs(e="/评论翻译"){return`${e} 请将 Amazon MX 演示样例 ASIN B0FPG9431G 的多语种订单评论统一翻译为英语和中文，输出双语对照表（保留原文），并标注演示样例。`}const Ws=`✅ **语种翻译已完成**（演示样例 · ASIN \`B0FPG9431G\`）

### 一、任务卡
- 源语：es-MX 为主 · 目标：en + zh-CN
- 条数：演示批次 12 条

### 二、双语对照（节选）
| # | 原文 | EN | ZH |
| --- | --- | --- | --- |
| 1 | Es muy bueno… pero el GPS es poco preciso. | Nice design, but GPS is inaccurate. | 外观不错，但 GPS 不够准。 |
| 2 | La batería dura todo el día. | Battery lasts all day. | 续航能撑一整天。 |

### 三、交接
请将双语对照表交给 **评论分析 Agent**（/评论分析）做情感判断与用户洞察挖掘。`,Hs={id:Us,instructions:Bs,planSteps:[...Pt],demoPrompt:Gs(),mockReport:Ws,execSteps:Z([...Pt],"Translate"),agentType:"knowledge"};function de(e){return{...e,execSteps:e.execSteps??Z(e.planSteps,"Manage")}}const qs=[de({id:"skill-launch-sentiment",agentType:"marketing",planSteps:["界定产品/发布会与监测窗口","聚合社媒与媒体声量","情感分层与热点主题聚类","输出快报与危机/机会建议"],demoPrompt:"/舆情快报 请基于演示样例，输出某穿戴新品发布会 48h 舆情快报：声量、情感、热点与建议。",instructions:`你是 MSS「发布会舆情快报」Skill（/舆情快报）。

## 必须输出
1. 监测范围与窗口
2. 声量与情感概览
3. 热点主题 TOP5（含代表性原声）
4. 风险与机会
5. 给 PR/MKT/服务的建议
6. 数据局限（标注演示样例）`,mockReport:`✅ **舆情快报已完成**（演示样例 · 穿戴新品发布 48h）

### 概览
- 声量：中等偏高（演示指数）
- 情感：正 62% / 中 25% / 负 13%

### 热点 TOP
1. 续航表现 — 正面居多
2. 价格讨论 — 中性偏负
3. 配色与设计 — 正面

### 建议
- PR：放大续航 KOL 原声
- MKT：价格异议准备对比素材
- 服务：备好开箱/配对 FAQ`}),de({id:"skill-survey-insight",agentType:"marketing",planSteps:["确认问卷主题与样本说明","清洗与分层（人群/区域）","交叉分析关键题项","输出洞察与行动建议"],demoPrompt:"/问卷洞察 请基于演示样例，分析用户满意度问卷：NPS、痛点 TOP、分人群差异与建议。",instructions:`你是 MSS「问卷洞察」Skill（/问卷洞察）。

## 必须输出
1. 样本与题项概览
2. 核心指标（NPS/满意度等，演示可给区间）
3. 痛点 / 亮点 TOP
4. 分人群差异
5. 行动建议（MKT/产品/服务）
6. 局限`,mockReport:`✅ **问卷洞察已完成**（演示样例 · 满意度调研）

### 样本
n≈800（演示）；区域含 EU/APAC

### 核心指标
- NPS：约 32～38（演示区间）
- 满意度：偏正面

### 痛点 TOP
1. 物流时效
2. 包装说明不够本地化

### 建议
- 服务：强化物流节点通知
- MKT：包装内页多语种改版试点`}),de({id:"skill-retail-insight",agentType:"marketing",planSteps:["选定门店范围与指标（DOS/转化/陈列）","拉取并校验零售数据口径","识别异常门店与机会门店","生成洞察 π 报告与动作清单"],demoPrompt:"/零售洞察 请基于演示样例，输出 3 月代表处 DOS/转化洞察：异常门店、原因假设与动作。",instructions:`你是 MSS「零售信息洞察 π」Skill（/零售洞察）。

## 必须输出
1. 范围与口径
2. DOS / 转化核心表
3. 异常门店清单
4. 原因假设
5. 动作建议（零售/供应/培训）
6. 局限`,mockReport:`✅ **零售洞察 π 已完成**（演示样例 · 3 月 DOS）

### 核心发现
- 整体 DOS 可控；南欧 12 家门店 DOS 偏高
- 高转化门店集中在 DE 核心商圈

### 异常门店（节选）
| 门店 | DOS | 假设 |
| --- | --- | --- |
| IT-021 | 高 | 畅销色缺货 + 陈列老化 |

### 动作
- 补货 + 陈列换新培训
- 复制 DE 高转化话术到 IT`}),de({id:"skill-price-monitor",agentType:"marketing",planSteps:["确认监测国家、渠道与 SKU 清单","聚合价格与 offer 变化","识别异常降价/窜货信号","输出监测简报与跟进建议"],demoPrompt:"/价格监测 请基于演示样例，输出 18 国中选 3 国穿戴主力 SKU 的价格与 offer 监测简报。",instructions:`你是 MSS「价格与 Offer 监测」Skill（/价格监测）。

## 必须输出
1. 监测范围（国家/渠道/SKU）
2. 价格带与周变化
3. 异常告警（降价幅度/窜货嫌疑）
4. Offer 变化（赠品/满减）
5. 给电商/渠道的建议
6. 标注演示样例与数据局限`,mockReport:`✅ **价格监测简报**（演示样例 · DE/UK/MX）

### 价格带
| 国家 | 渠道 | 主力 SKU | 价格变化 |
| --- | --- | --- | --- |
| DE | 官方商城 | W-01 | 持平 |
| UK | 第三方 | W-01 | -4%（演示） |
| MX | Amazon | W-02 | +2% |

### 告警
- UK 第三方降价需核实是否授权促销

### 建议
- 电商：核对授权价盘
- 渠道：同步官方活动日历`}),de({id:"skill-so-report",agentType:"marketing",planSteps:["确认统计周期与剔除规则（如 IoT）","汇总代表处 SO/SI 与排名","计算环比与结构占比","生成报表结论与跟进项"],demoPrompt:"/so报表 请基于演示样例，输出各代表处累计 SO 排名（剔除 IoT），含环比与简要结论。",instructions:`你是 MSS「SO/SI 报表」Skill（/so报表）。

## 必须输出
1. 口径（周期、剔除规则）
2. 代表处排名表
3. 环比亮点/落后点
4. 结构说明（品类）
5. 跟进建议
6. 数据局限`,mockReport:`✅ **SO 报表已生成**（演示样例 · 累计 SO · 剔除 IoT）

### 排名（节选）
| 名次 | 代表处 | SO | 环比 |
| --- | --- | --- | --- |
| 1 | DE | 高 | +5% |
| 2 | UK | 高 | +3% |
| 3 | FR | 中 | -1% |

### 结论
头部稳定；FR 需关注穿戴结构下滑（演示）。

### 跟进
- 与 FR 对齐促销与库存`})],Vs=[...qs,Ks,Hs,js];function Pe(e){return{...e,execSteps:e.execSteps??Z(e.planSteps,"Process")}}const Js=[Pe({id:"skill-jd-parser",agentType:"knowledge",planSteps:["识别岗位与职级信息","抽取职责、要求与胜任力标签","结构化为招聘标准字段","输出筛选权重建议"],demoPrompt:"/jd解析 请基于演示样例，解析「区域电商运营」JD：职责、硬性要求、胜任力与筛选权重。",instructions:`你是 MSS「JD 解析」Skill（/jd解析）。

## 必须输出
1. 岗位元信息
2. 职责列表
3. 硬性/加分要求
4. 胜任力标签
5. 建议筛选权重
6. 待 HR 确认项`,mockReport:`✅ **JD 解析完成**（演示样例 · 区域电商运营）

### 元信息
- 职级：中级（演示）
- 汇报：电商主管

### 硬性要求
- 3 年电商运营
- 英语工作沟通

### 胜任力
数据分析 / 促销策划 / 跨部门协同

### 筛选权重建议
硬性 40% · 项目经验 35% · 软技能 25%`}),Pe({id:"skill-resume-screen",agentType:"knowledge",planSteps:["对齐 JD 关键要求","解析简历经历与成果","人岗匹配打分与风险点","输出面试关注清单"],demoPrompt:"/简历筛选 请基于演示样例，对 1 份电商运营简历做人岗匹配：得分、亮点、风险、面试问题。",instructions:`你是 MSS「简历筛选」Skill（/简历筛选）。

## 必须输出
1. 匹配总分与分项
2. 亮点
3. 风险/缺口
4. 建议结论（推进/待定/淘汰）
5. 面试问题 5 条
6. 声明：辅助决策，非录用决定`,mockReport:`✅ **简历筛选完成**（演示样例）

### 匹配
- 总分：78/100（演示）
- 经验匹配高；英语证明弱

### 亮点
- 主导过跨境大促

### 风险
- 近两年跳槽偏频

### 结论
建议推进一面

### 面试问题（节选）
1. 描述一次大促 ROI 复盘
2. 如何处理渠道价格冲突`}),Pe({id:"skill-interview-analysis",agentType:"knowledge",planSteps:["整理面试记录与评价维度","提取行为事例与能力证据","生成评估报告与录用建议倾向","列出待核实背景调查点"],demoPrompt:"/面试分析 请基于演示样例面试记录，输出评估报告：维度得分、证据、倾向建议。",instructions:`你是 MSS「面试分析」Skill（/面试分析）。

## 必须输出
1. 候选人与轮次
2. 维度评分表
3. 关键行为证据
4. 倾向建议（含理由）
5. 待核实项
6. 非最终录用决定声明`,mockReport:`✅ **面试评估报告**（演示样例 · 一面）

### 维度
| 维度 | 得分 |
| --- | --- |
| 专业 | 4/5 |
| 协同 | 3/5 |
| 抗压 | 4/5 |

### 证据
- 清晰讲述大促库存协同案例

### 倾向
建议进入二面；补充英语场景题

### 待核实
- 上一段离职原因`}),Pe({id:"skill-training-gen",agentType:"knowledge",planSteps:["确认产品/受众与课时","设计学习目标与大纲","生成讲义要点与测验题","输出门店演练脚本"],demoPrompt:"/培训内容 请基于演示样例，生成 Nova 新品门店 45 分钟培训大纲、测验与演练脚本。",instructions:`你是 MSS「培训内容生成」Skill（/培训内容）。

## 必须输出
1. 学习目标
2. 课时大纲
3. 讲义要点
4. 测验题（含参考答案）
5. 门店演练脚本
6. 培训后跟踪建议`,mockReport:`✅ **培训内容已生成**（演示样例 · Nova 新品 · 45min）

### 学习目标
- 说清 3 个核心卖点与竞品差异
- 完成一次标准演示话术

### 大纲
1. 产品定位（10'）
2. 卖点演示（15'）
3. 异议处理（10'）
4. 演练与测验（10'）

### 测验（节选）
Q1：续航卖点应如何表述？（参考：场景化 + 对比）

### 演练脚本
店员 A 演示 → 店员 B 扮演顾虑价格顾客 → 反馈 2 条改进。`})];function pe(e){return{...e,execSteps:e.execSteps??Z(e.planSteps,"Exp")}}const Ys=[pe({id:"skill-rag",agentType:"knowledge",planSteps:["提问重写与术语对齐","按业务分区向量检索","汇总候选文档块","生成带引用的回答草稿"],demoPrompt:"/检索 请基于演示样例知识库，回答：欧洲门店 DOS 过高时应按什么 SOP 处理？并给出引用。",instructions:`你是 MSS「企业知识检索」Skill（/检索）。按业务部门分区做向量检索演示。

## 必须输出
1. 改写后的查询
2. 命中文档列表（标题/分区/相关度定性）
3. 回答正文
4. 引用锚点
5. 未命中时的诚实说明
6. 标注演示样例`,mockReport:`✅ **知识检索完成**（演示样例 · 零售 SOP 分区）

### 改写查询
「门店 DOS 过高处理流程 / 欧洲零售」

### 命中
1. 《零售 DOS 异常处置 SOP》v1.2 — 相关度高
2. 《库存调拨指引》— 相关度中

### 回答摘要
1) 核对口径与系统延迟 → 2) 识别缺货/滞销 → 3) 发起调拨或促销清滞 → 4) 门店培训跟进。

### 引用
- [SOP §3.2] 演示锚点
- [调拨指引 §2] 演示锚点`}),pe({id:"skill-rerank",agentType:"knowledge",planSteps:["接收初检候选列表","Cross-Encoder 语义重排","截断 Top-K 并解释排序理由","输出供摘要使用的精选块"],demoPrompt:"/rerank 请基于演示样例，对 8 条检索候选重排为 Top-3，并说明排序理由。",instructions:`你是 MSS「检索重排序」Skill（/rerank）。

## 必须输出
1. 输入候选概览
2. Top-K 精选列表
3. 每条排序理由
4. 被降权样本说明
5. 建议是否进入摘要生成`,mockReport:`✅ **重排序完成**（演示样例 · Top-3）

| 排名 | 文档 | 理由 |
| --- | --- | --- |
| 1 | DOS 异常处置 SOP | 直接匹配流程问题 |
| 2 | 库存调拨指引 | 提供可执行动作 |
| 3 | 门店培训手册节选 | 补充一线话术 |

### 降权
- 品牌故事稿：语义偏营销，与处置流程弱相关

### 建议
可进入抗幻觉摘要生成。`}),pe({id:"skill-retail-coach",agentType:"knowledge",planSteps:["设定演练场景与考核点","生成顾客异议与标准应答","模拟一轮对话并评分","输出改进建议与再练脚本"],demoPrompt:"/陪练 请基于演示样例，开展一轮「价格贵」异议处理陪练：脚本、评分与改进建议。",instructions:`你是 MSS「零售 AI 陪练」Skill（/陪练）。

## 必须输出
1. 场景与考核点
2. 模拟对话（顾客/店员）
3. 维度评分
4. 改进建议
5. 再练 3 句金句`,mockReport:`✅ **陪练回合完成**（演示样例 · 价格异议）

### 场景
顾客认为新品定价偏高

### 模拟（节选）
- 顾客：比上一代贵不少…
- 店员：理解您的顾虑；这一代续航与…（演示）

### 评分
话术完整性 4/5 · 价值塑造 3/5 · 促成 3/5

### 改进
先共情再对比；补充官方活动/以旧换新钩子

### 金句
「贵在多两天续航和更稳的运动定位，按周均下来…」`}),pe({id:"skill-complaint-sop",agentType:"knowledge",planSteps:["识别客诉类型与紧急度","匹配 SOP 与话术模板","生成对客回复草稿","列出升级路径与工单字段"],demoPrompt:"/客诉 请基于演示样例，处理「物流延误」客诉：SOP 匹配、对客话术与是否升级。",instructions:`你是 MSS「客诉 SOP 匹配」Skill（/客诉）。

## 必须输出
1. 客诉分类与紧急度
2. 匹配 SOP 条款
3. 对客话术（多语种可选）
4. 内部动作/升级条件
5. 工单建议字段
6. 演示样例声明`,mockReport:`✅ **客诉 SOP 匹配完成**（演示样例 · 物流延误）

### 分类
- 类型：履约时效
- 紧急度：中

### 匹配
《CSC 物流延误处置 SOP》§2.1（演示）

### 对客话术
非常抱歉延误给您带来不便；当前物流节点为…；预计…前送达；可提供…补偿选项（演示）。

### 升级条件
超过承诺时效 48h 仍无更新 → 升级二线

### 工单字段
订单号 / 延误时长 / 补偿意向`}),pe({id:"skill-wecom",agentType:"marketing",planSteps:["确认推送对象与消息类型","组装卡片/文本内容","校验敏感信息与频率","输出推送预览与发送清单"],demoPrompt:"/wecom 请基于演示样例，生成一条经营周报企业微信卡片推送预览（标题、要点、按钮）。",instructions:`你是 MSS「企业微信推送」Skill（/wecom）。演示环境只生成推送预览，不真实调用 WeCom API。

## 必须输出
1. 推送对象与通道
2. 消息类型（文本/卡片）
3. 标题与要点
4. 按钮/链接占位
5. 合规与频率检查
6. 明确「演示未真实发送」`,mockReport:`✅ **WeCom 推送预览**（演示样例 · 未真实发送）

### 通道
群机器人 · 区域经营群（演示）

### 卡片
- 标题：欧洲穿戴周报（演示）
- 要点：SO 环比上升；南欧 DOS 风险；3 条行动项
- 按钮：查看详情（占位链接）

### 检查
- 无 PII
- 本周同类推送 ≤ 1 次（建议）

> 演示模式：仅预览，未调用企业微信 API。`})];function B(e){return{...e,execSteps:e.execSteps??Z(e.planSteps,"Skill")}}const Xs=[B({id:"skill-l10n-localize",agentType:"marketing",planSteps:["识别源语/目标语与物料类型（卖点卡/详情页）","按术语表与禁译表完成初译","回译抽检与规格数字校验","输出双语对照包与质检清单"],demoPrompt:"/本地化翻译 将以下卖点卡译为阿语，保留品牌词与规格数字，并给出术语质检清单（演示样例）。",instructions:`你是 MSS「小语种本地化翻译」Skill（/本地化翻译）。面向营销物料本地化，不是通用闲聊翻译。

## 必须输出
1. 目标语译文
2. 中英/源语对照表（关键句）
3. 术语与禁译检查结果
4. 需人工终审项
5. 局限说明（演示样例需标注）`,mockReport:`✅ **本地化翻译完成**（演示样例 · 阿语卖点卡）

### 译文要点
- 品牌词保留英文；容量/尺寸未改写
- 禁译词未触发

### 质检
| 项 | 结果 |
| --- | --- |
| 术语一致 | 通过 |
| 数字规格 | 通过 |
| 敏感表述 | 需人工抽检 10% |`}),B({id:"skill-sales-copy",agentType:"marketing",planSteps:["澄清产品、人群与渠道触点","提炼 3–5 条差异化卖点","生成短文案与落地页段落","给出 A/B 测试建议"],demoPrompt:"/卖点文案 为穿戴新品生成电商详情页卖点（中国区 · 演示样例）。",instructions:`你是 MSS「卖点文案」Skill（/卖点文案）。参考专业营销 copy 框架，输出可落地的中文文案。

## 必须输出
1. 人群与场景假设
2. 卖点列表（利益点优先）
3. 主标题 / 副标题 / CTA
4. 详情页短段落
5. 合规提醒（医疗/绝对化用语）`,mockReport:`✅ **卖点文案已生成**（演示样例）

### 主标题
全天续航，运动更自由

### 卖点
1. 轻量化佩戴
2. 血氧与心率监测（演示口径）
3. 多场景表盘

### CTA
立即了解渠道主推机型`}),B({id:"skill-frontline-script",agentType:"knowledge",planSteps:["识别场景（客诉/门店/热线）","对齐 SOP 关键步骤","生成可朗读统一话术","列出禁忌语与升级条件"],demoPrompt:"/一线话术 电池过热客诉，请给出一线统一口径与禁忌语（演示样例）。",instructions:`你是 MSS「一线话术」Skill（/一线话术）。输出可直接对客的口径，避免绝对化承诺。

## 必须输出
1. 场景与情绪安抚开场
2. 标准话术（分步）
3. 禁忌语
4. 升级条件
5. 引用的 SOP 要点（演示可标注样例）`,mockReport:`✅ **一线话术已生成**（演示样例 · 电池过热）

### 开场
非常理解您的担心，我们先确认设备状态并保障安全。

### 步骤话术
1. 确认机型与异常现象
2. 引导安全关机/停用
3. 登记工单并告知时限

### 禁忌
- 不承诺「绝对不会再发热」`}),B({id:"skill-knowledge-digest",agentType:"knowledge",planSteps:["识别待沉淀材料类型","抽取可检索要点与标签","生成知识卡片摘要","给出入库分区建议"],demoPrompt:"/知识沉淀 将本周渠道复盘纪要沉淀为可检索知识卡片（演示样例）。",instructions:`你是 MSS「知识沉淀」Skill（/知识沉淀）。把长文变成可入库的知识卡片。

## 必须输出
1. 标题与摘要
2. 关键要点（条目）
3. 标签 / 分区建议
4. 引用原文片段（如有）
5. 待人工确认项`,mockReport:`✅ **知识卡片已生成**（演示样例）

### 标题
渠道周清 · 穿戴库存与主推对齐

### 要点
- 头部代表处库存健康
- 长尾机型需清库节奏

### 分区
\`gtm/channel-weekly\``}),B({id:"skill-weekly-report",agentType:"marketing",planSteps:["对齐时间窗与口径（SO/SI）","汇总代表处与品类结构","提炼亮点/风险与归因","输出周报成稿与 NBA"],demoPrompt:"/经营周报 生成上周欧洲穿戴经营周报（演示样例）。",instructions:`你是 MSS「经营周报」Skill（/经营周报）。输出可直接发群的周清成稿。

## 必须输出
1. 时间窗与口径
2. 核心指标摘要
3. 亮点 / 风险
4. 归因 TOP3
5. 下周行动（NBA）`,mockReport:`✅ **经营周报已生成**（演示样例）

### 摘要
欧洲穿戴 SO 环比小幅上升；FR 结构需关注。

### NBA
- 对齐 FR 促销与库存
- 复盘 TOP3 异动渠道`}),B({id:"skill-comp-brief",agentType:"marketing",planSteps:["锁定竞品型号与对比维度","整理价格/卖点/渠道差异","给出应对建议","输出一页纸简报"],demoPrompt:"/竞品简报 对比竞品手表 A 与我司主推机型（演示样例）。",instructions:`你是 MSS「竞品简报」Skill（/竞品简报）。输出一页纸对照，不编造未提供的精确价格。

## 必须输出
1. 对比范围
2. 维度表（价格/卖点/渠道）
3. 优劣势
4. 应对建议
5. 信息缺口`,mockReport:`✅ **竞品简报已生成**（演示样例）

### 对照
| 维度 | 我司 | 竞品 A |
| --- | --- | --- |
| 续航 | 优 | 中 |
| 生态 | 优 | 中 |

### 建议
强化续航与健康监测卖点沟通。`}),B({id:"skill-channel-brief",agentType:"marketing",planSteps:["对齐活动档期与主推机型","核对库存与渠道节奏","输出作战要点","列出协同角色与截止时间"],demoPrompt:"/渠道简报 生成本周中国区渠道作战简报（演示样例）。",instructions:`你是 MSS「渠道简报」Skill（/渠道简报）。面向渠道经理的作战对齐材料。

## 必须输出
1. 本周主题
2. 主推与库存提醒
3. 活动节奏
4. 风险与协同人
5. 检查清单`,mockReport:`✅ **渠道简报已生成**（演示样例）

### 本周主题
穿戴清库 + 新品预热

### 清单
- 主推陈列到位
- 促销话术统一`}),B({id:"skill-email-draft",agentType:"knowledge",planSteps:["明确收件人与沟通目的","整理事实要点与诉求","生成礼貌、简洁邮件草稿","给出主题行备选"],demoPrompt:"/邮件草稿 给渠道客户写一封补货跟进邮件（演示样例）。",instructions:`你是 MSS「邮件草稿」Skill（/邮件草稿）。输出可直接粘贴的商务邮件。

## 必须输出
1. 主题行（2 个备选）
2. 正文
3. 礼貌结尾
4. 需人工核对的事实项`,mockReport:`✅ **邮件草稿已生成**（演示样例）

### 主题
关于本周补货进度的确认

### 正文
您好，…（演示）恳请确认到货窗口。谢谢！`})],Qs=[...Os,...Vs,...Js,...Ys,...Xs],Zs=new Map(Qs.map(e=>[e.id,e]));function ea(e){return e?Zs.get(e)??null:null}const ta=[{id:"skill-data-analysis",name:"MultiSourceAnalysis",desc:"【办公提效】AI 辅助数据分析 · 多源数据自动分析与可视化（可在做任务 /数据分析 调用）",category:"office",command:"/数据分析",author:"华为 MSS",version:"2.0.0",connector:"ISRP + Sandbox · 对话 Runtime",published:!0,invokes:18400,icon:"fa-chart-line",tags:["数据分析","ISRP","SO","综履","结算","对账"]},{id:"skill-doc-gen",name:"DocDraftGenerator",desc:"【办公提效】AI 辅助文档生成 · 文档初稿自动生成与解读（可在做任务 /文档生成 调用）",category:"office",command:"/文档生成",author:"华为 MSS",version:"1.6.0",connector:"Doc AI · 对话 Runtime",published:!0,invokes:9100,icon:"fa-file-lines",tags:["文档","初稿"]},{id:"skill-doc-compliance",name:"DocComplianceChecker",desc:"【办公提效】AI 辅助文档解读 · 营销物料/合同/招投标合规筛查（可在做任务 /合规筛查 调用）",category:"office",command:"/合规筛查",author:"华为 MSS",version:"1.4.0",connector:"Doc AI · 对话 Runtime",published:!0,invokes:6700,icon:"fa-file-shield",tags:["合规","医疗用语"]},{id:"skill-file-archive",name:"SmartFileArchive",desc:"【办公提效】AI 辅助文件整理 · 多源文件智能归档（可在做任务 /文件整理 调用）",category:"office",command:"/文件整理",author:"华为 MSS",version:"1.2.0",connector:"Onebox/Email · 对话 Runtime",published:!0,invokes:4200,icon:"fa-folder-tree",tags:["归档","总结","知识","指南"]},{id:"skill-ppt-gen",name:"PPTAutoGenerator",desc:"【办公提效】AI 辅助 PPT 生成 · 多源数据 PPT 自动生成（可在做任务 /ppt 调用）",category:"office",command:"/ppt",author:"华为 MSS",version:"1.0.0",connector:"Office Runtime · 对话 Runtime",published:!0,invokes:3100,icon:"fa-file-powerpoint",tags:["PPT","汇报"]},{id:"skill-meeting-minutes",name:"MeetingMinutesGen",desc:"【办公提效】AI 辅助会议纪要生成 · 60% AI + 40% 人工（可在做任务 /会议纪要 调用）",category:"office",command:"/会议纪要",author:"华为 MSS",version:"2.1.0",connector:"WeLink · 对话 Runtime",published:!0,invokes:12100,icon:"fa-clipboard-list",tags:["会议","纪要"]},{id:"skill-work-summary",name:"WorkSummaryGen",desc:"【办公提效】个人工作总结 Markdown/HTML 多形式生成（可在做任务 /工作总结 调用）",category:"office",command:"/工作总结",author:"华为 MSS",version:"1.3.0",connector:"员工助手 · 对话 Runtime",published:!0,invokes:5800,icon:"fa-file-pen",tags:["总结","归档"]},{id:"skill-doc-parser",name:"DocParser",desc:"PDF/Excel/PPT 结构化解析与摘要（可在做任务 /解析文档 调用）",category:"office",command:"/解析文档",author:"华为 MSS",version:"2.0.0",connector:"Doc AI · 对话 Runtime",published:!0,invokes:8900,icon:"fa-file-import",tags:["解析","核验","验收","综履"]},{id:"skill-launch-sentiment",name:"LaunchSentimentReport",desc:"【管理提效】发布会舆情快报 · 产品发布舆情 AI 分析（可在做任务 /舆情快报 调用）",category:"manage",command:"/舆情快报",author:"华为 MSS",version:"1.5.0",connector:"Social Listening · 对话 Runtime",published:!0,invokes:5400,icon:"fa-bullhorn",tags:["舆情","发布会"]},{id:"skill-survey-insight",name:"SurveyInsightAnalyzer",desc:"【管理提效】洞察部用户问卷调研分析与报告生成（可在做任务 /问卷洞察 调用）",category:"manage",command:"/问卷洞察",author:"华为 MSS",version:"1.1.0",connector:"Survey Hub · 对话 Runtime",published:!0,invokes:2100,icon:"fa-square-poll-vertical",tags:["问卷","MKT"]},{id:"skill-review-collect",name:"评分采集",desc:"【管理提效】电渠购买页订单评论采集 · Amazon/Lazada 等站点样本清洗与交接（可在做任务 /评论采集 调用）",category:"manage",command:"/评论采集",author:"华为 MSS",version:"1.0.0",connector:"Amazon/Lazada · 对话 Runtime",published:!0,invokes:4200,icon:"fa-download",tags:["评论","电商","采集","订单评论"],scenarioTags:["评论分析","评论","电商"]},{id:"skill-review-translate",name:"评论语种翻译",desc:"【管理提效】多语种订单评论统一译为英语与中文，保留原文对照（可在做任务 /评论翻译 调用）",category:"manage",command:"/评论翻译",author:"华为 MSS",version:"1.0.0",connector:"Translate Runtime · 对话 Runtime",published:!0,invokes:3800,icon:"fa-language",tags:["评论","翻译","本地化","电商"],scenarioTags:["评论分析","评论","电商","翻译","本地化"]},{id:"skill-review-cluster",name:"订单评论分析",desc:"【管理提效】对采集+翻译后的评论做情感判断、用户数据挖掘、卖点 GAP 与分角色建议（可在做任务 /评论分析 调用）",category:"manage",command:"/评论分析",author:"华为 MSS",version:"3.1.0",connector:"Amazon/Lazada · 对话 Runtime",published:!0,invokes:7600,icon:"fa-comments",tags:["评论","电商","VoC","订单评论","情感"],scenarioTags:["评论分析","评论","电商"]},{id:"skill-retail-insight",name:"RetailInsightPi",desc:"【管理提效】零售信息洞察 π · 门店 DOS/转化/陈列报告（可在做任务 /零售洞察 调用）",category:"manage",command:"/零售洞察",author:"华为 MSS",version:"1.8.0",connector:"iRetail · 对话 Runtime",published:!0,invokes:9800,icon:"fa-store",tags:["零售","洞察π"]},{id:"skill-price-monitor",name:"PriceOfferMonitor",desc:"【管理提效】价格监测 · 18 国多渠道价格 & offer 监测（可在做任务 /价格监测 调用）",category:"manage",command:"/价格监测",author:"华为 MSS",version:"3.0.1",connector:"Market Intel · 对话 Runtime",published:!0,invokes:25600,icon:"fa-tags",tags:["价格","offer","价格监测"]},{id:"skill-so-report",name:"SOReportBuilder",desc:"代表处 SO/SI 排名、环比、IoT 剔除报表（可在做任务 /so报表 调用）",category:"manage",command:"/so报表",author:"华为 MSS",version:"3.0.1",connector:"ISRP · 对话 Runtime",published:!0,invokes:14300,icon:"fa-table",tags:["SO","代表处","返利"]},{id:"skill-jd-parser",name:"JDParser",desc:"【流程提效】招聘 JD 结构化解析与胜任力提取（可在做任务 /jd解析 调用）",category:"process",command:"/jd解析",author:"华为 MSS",version:"1.0.2",connector:"HR Hub · 对话 Runtime",published:!0,invokes:3200,icon:"fa-briefcase",tags:["JD","HR"]},{id:"skill-resume-screen",name:"ResumeScreener",desc:"【流程提效】招聘需求简历分析 · AI 简历筛选与人岗匹配（可在做任务 /简历筛选 调用）",category:"process",command:"/简历筛选",author:"华为 MSS",version:"1.4.0",connector:"HR Hub · 对话 Runtime",published:!0,invokes:4100,icon:"fa-user-check",tags:["简历","HR"]},{id:"skill-interview-analysis",name:"InterviewAnalyzer",desc:"【流程提效】面试记录分析与评估报告生成（可在做任务 /面试分析 调用）",category:"process",command:"/面试分析",author:"华为 MSS",version:"1.2.0",connector:"HR Hub · 对话 Runtime",published:!0,invokes:2800,icon:"fa-user-pen",tags:["面试","HR"]},{id:"skill-training-gen",name:"TrainingContentGen",desc:"【流程提效】AI 辅助培训内容生成 · Nova 新品门店培训（可在做任务 /培训内容 调用）",category:"process",command:"/培训内容",author:"华为 MSS",version:"1.6.0",connector:"LMS · 对话 Runtime",published:!0,invokes:4900,icon:"fa-chalkboard-user",tags:["培训","Nova"]},{id:"skill-rag",name:"MilvusRetriever",desc:"【体验提升】企业知识向量检索 · 按业务部门分区（可在做任务 /检索 调用）",category:"experience",command:"/检索",author:"华为 MSS",version:"2.5.0",connector:"Milvus · 对话 Runtime",published:!0,invokes:19800,icon:"fa-database",tags:["RAG","知识库","知识","归档"]},{id:"skill-rerank",name:"CrossEncoderReranker",desc:"【体验提升】检索结果 Cross-Encoder 重排序（可在做任务 /rerank 调用）",category:"experience",command:"/rerank",author:"华为 MSS",version:"1.0.0",connector:"Model Hub · 对话 Runtime",published:!0,invokes:6200,icon:"fa-sort-amount-down",tags:["RAG"]},{id:"skill-retail-coach",name:"RetailAICoach",desc:"【体验提升】零售 AI 陪练 · 卖点演练与考核反馈（可在做任务 /陪练 调用）",category:"experience",command:"/陪练",author:"华为 MSS",version:"1.1.0",connector:"LMS · 对话 Runtime",published:!0,invokes:3600,icon:"fa-headset",tags:["陪练","门店"]},{id:"skill-complaint-sop",name:"ComplaintSOPMatch",desc:"【体验提升】客诉 SOP 检索与话术推荐（可在做任务 /客诉 调用）",category:"experience",command:"/客诉",author:"华为 MSS",version:"2.2.0",connector:"CSC Ticket · 对话 Runtime",published:!0,invokes:8300,icon:"fa-ticket",tags:["客诉","SOP"],scenarioTags:["客诉","服务","工单"]},{id:"skill-wecom",name:"WeComPush",desc:"企业微信消息/卡片/群机器人推送（可在做任务 /wecom 调用）",category:"experience",command:"/wecom",author:"华为 MSS",version:"2.0.0",connector:"WeCom API · 对话 Runtime",published:!0,invokes:22100,icon:"fa-comment-dots",tags:["WeCom","推送"]},{id:"skill-l10n-localize",name:"LocalizeCopy",desc:"【内容生成】小语种本地化翻译 · 卖点卡/物料初译 + 术语与禁译质检（可在做任务 /本地化翻译 调用）",category:"manage",command:"/本地化翻译",author:"华为 MSS",version:"1.0.0",connector:"Translate Runtime · 对话 Runtime",published:!0,invokes:4600,icon:"fa-language",tags:["翻译","本地化","小语种","术语"],scenarioTags:["翻译","本地化","小语种"]},{id:"skill-sales-copy",name:"SalesCopywriter",desc:"【内容生成】卖点与销售文案 · 按人群/渠道生成卖点卡与落地页文案（可在做任务 /卖点文案 调用）",category:"manage",command:"/卖点文案",author:"华为 MSS",version:"1.0.0",connector:"Doc AI · 对话 Runtime",published:!0,invokes:3900,icon:"fa-pen-nib",tags:["文案","卖点","MKT","转化"]},{id:"skill-frontline-script",name:"FrontlineScript",desc:"【体验提升】一线统一话术 · 客诉/门店口径对齐与禁忌语检查（可在做任务 /一线话术 调用）",category:"experience",command:"/一线话术",author:"华为 MSS",version:"1.0.0",connector:"CSC + LMS · 对话 Runtime",published:!0,invokes:5200,icon:"fa-comments",tags:["话术","客诉","服务","口径"],scenarioTags:["客诉","服务"]},{id:"skill-knowledge-digest",name:"KnowledgeDigest",desc:"【体验提升】组织及个人知识沉淀 · 会议/文档/问答摘要入库（可在做任务 /知识沉淀 调用）",category:"experience",command:"/知识沉淀",author:"华为 MSS",version:"1.0.0",connector:"Milvus + Onebox · 对话 Runtime",published:!0,invokes:4100,icon:"fa-box-archive",tags:["知识","归档","沉淀","RAG"],scenarioTags:["知识","归档","指南"]},{id:"skill-weekly-report",name:"OpsWeeklyReport",desc:"【管理提效】经营分析周报 · SO/渠道/代表处周清成稿（可在做任务 /经营周报 调用）",category:"manage",command:"/经营周报",author:"华为 MSS",version:"1.0.0",connector:"ISRP · 对话 Runtime",published:!0,invokes:6100,icon:"fa-calendar-week",tags:["周报","经营","SO","代表处"],scenarioTags:["数据分析","SO","经营"]},{id:"skill-comp-brief",name:"CompetitorBrief",desc:"【管理提效】竞品简报 · 型号/价格/卖点对照与应对建议（可在做任务 /竞品简报 调用）",category:"manage",command:"/竞品简报",author:"华为 MSS",version:"1.0.0",connector:"Market Intel · 对话 Runtime",published:!0,invokes:3400,icon:"fa-binoculars",tags:["竞品","洞察","GTM"]},{id:"skill-channel-brief",name:"ChannelPlayBrief",desc:"【流程提效】渠道作战简报 · 活动节奏/库存/主推机型对齐（可在做任务 /渠道简报 调用）",category:"process",command:"/渠道简报",author:"华为 MSS",version:"1.0.0",connector:"Channel Hub · 对话 Runtime",published:!0,invokes:2800,icon:"fa-store",tags:["渠道","作战","零售"]},{id:"skill-email-draft",name:"BizEmailDraft",desc:"【办公提效】商务邮件草稿 · 客户/渠道沟通要点与礼貌修订（可在做任务 /邮件草稿 调用）",category:"office",command:"/邮件草稿",author:"华为 MSS",version:"1.0.0",connector:"Email · 对话 Runtime",published:!0,invokes:4500,icon:"fa-envelope",tags:["邮件","沟通","办公"]}];function na(e){const t=ea(e.id);return t?{...e,instructions:t.instructions,planSteps:[...t.planSteps]}:e}const Vt=Ts(ta.map(na).map(Rs)),Ho=[{id:"all",name:"全部文档",icon:"fa-layer-group"},{id:"public",name:"公共",icon:"fa-building-columns",desc:"平台规范 · 通用制度"},{id:"gtm",name:"GTM",icon:"fa-rocket",desc:"上市 · 准入 · 区域策略"},{id:"mkt",name:"MKT",icon:"fa-bullhorn",desc:"品牌 · 活动 · 洞察"},{id:"ecommerce",name:"电商",icon:"fa-cart-shopping",desc:"评论 · offer · 平台规则"},{id:"retail",name:"零售",icon:"fa-store",desc:"门店 · 培训 · 洞察 π"},{id:"service",name:"服务",icon:"fa-headset",desc:"SOP · 客诉 · 质检"},{id:"channel",name:"渠道",icon:"fa-diagram-project",desc:"返利 · 价盘 · 代表处"},{id:"hr",name:"HR",icon:"fa-user-tie",desc:"JD · 招聘 · 人岗标准"},{id:"finance",name:"财经",icon:"fa-coins",desc:"返利对账 · 价保 · 财务口径"},{id:"quality",name:"质量运营",icon:"fa-clipboard-check",desc:"合规检查 · 审计 · 质量规范"},{id:"other",name:"其他",icon:"fa-folder-open",desc:"未分类 · 临时归档"}],sa=[{id:"kb-platform-guide",title:"MSS Claw 平台使用指南",desc:"AI任务、Agent/Skill 挂载、任务中心与交付物流转说明",collection:"public",type:"PDF",size:"2.1 MB",pages:42,clearance:"L2",indexed:!0,chunks:186,tags:["平台","指南"],updatedAt:"2026-07-08",author:"MSS AI变革"},{id:"kb-agent-playbook",title:"Agent/Skill 配置与发布规范",desc:"Agent 设计规范、Skill 挂载策略、审批与审计要求",collection:"public",type:"PDF",size:"1.8 MB",pages:36,clearance:"L2",indexed:!0,chunks:168,tags:["Agent","Skill"],updatedAt:"2026-07-08",author:"MSS AI变革"},{id:"kb-gtm-launch",title:"GTM 上市节奏 Playbook",desc:"Mate/Pura 上市里程碑、区域准入与首销 KPI 模板",collection:"gtm",type:"PDF",size:"3.2 MB",pages:54,clearance:"L3",indexed:!0,chunks:412,tags:["上市","GTM"],updatedAt:"2026-07-07",author:"GTM 部"},{id:"kb-latam-compliance",title:"拉美/EU 市场准入 Checklist",desc:"ANATEL 认证、RoHS、环保参数与准入清单",collection:"gtm",type:"PDF",size:"3.6 MB",pages:62,clearance:"L3",indexed:!0,chunks:520,tags:["拉美","准入"],updatedAt:"2026-06-15",author:"GTM 合规"},{id:"kb-campaign-q3",title:"2025 Q3 全渠道活动 Playbook",desc:"大促节奏、预算池、活动物料与审批流",collection:"mkt",type:"PDF",size:"2.4 MB",pages:48,clearance:"L3",indexed:!0,chunks:312,tags:["活动","MKT"],updatedAt:"2026-06-28",author:"MKT"},{id:"kb-wearable-okr",title:"2025 可穿戴 OKR 复盘",desc:"KR 进度、续航目标卡点与代表处反馈汇总",collection:"mkt",type:"XLSX",size:"540 KB",pages:6,clearance:"L2",indexed:!0,chunks:72,tags:["穿戴","OKR"],updatedAt:"2026-06-30",author:"MKT 洞察"},{id:"kb-survey-guide",title:"洞察部用户问卷调研方法",desc:"问卷设计、样本配额、开放题编码与洞察报告模板",collection:"mkt",type:"DOCX",size:"680 KB",pages:18,clearance:"L2",indexed:!0,chunks:96,tags:["问卷","洞察"],updatedAt:"2026-07-04",author:"MKT 洞察部"},{id:"kb-review-sop",title:"Amazon/Lazada 评论分析 SOP",desc:"评分采集 → 语种翻译（中英）→ 评论分析三段口径与 MX/EU 平台差异",collection:"ecommerce",type:"PDF",size:"1.2 MB",pages:22,clearance:"L2",indexed:!0,chunks:142,tags:["评论","电商"],updatedAt:"2026-07-06",author:"电商运营"},{id:"kb-offer-monitor",title:"电商 Offer 监测口径说明",desc:"SKU 字段映射、多国采集 VPN 策略与复核 URL 清单",collection:"ecommerce",type:"XLSX",size:"420 KB",pages:8,clearance:"L2",indexed:!0,chunks:88,tags:["offer","价格"],updatedAt:"2026-07-07",author:"电商数据"},{id:"kb-retail-pi",title:"零售洞察 π 报告模板",desc:"门店 DOS、转化、陈列合规与代表处下钻结构",collection:"retail",type:"PDF",size:"1.5 MB",pages:28,clearance:"L2",indexed:!0,chunks:168,tags:["零售","洞察π"],updatedAt:"2026-07-05",author:"零售运营"},{id:"kb-nova-training",title:"Nova 新品培训内容框架",desc:"卖点脚本、对抗演练题库、门店考核指标",collection:"retail",type:"Folder",size:"24 MB",pages:0,clearance:"L2",indexed:!0,chunks:860,tags:["Nova","培训"],updatedAt:"2026-07-03",author:"零售培训"},{id:"kb-sop-complaint",title:"消费者服务 SOP · 电池过热客诉",desc:"分级处理、话术、OTA 引导与升级路径",collection:"service",type:"PDF",size:"1.1 MB",pages:24,clearance:"L2",indexed:!0,chunks:186,tags:["客诉","SOP"],updatedAt:"2026-07-01",author:"消费者服务"},{id:"kb-sop-bundle",title:"服务 SOP 知识包 v4",desc:"客诉分类、质检评分、备件策略综合包",collection:"service",type:"Bundle",size:"18 MB",pages:0,clearance:"L2",indexed:!0,chunks:2140,tags:["SOP","质检"],updatedAt:"2026-06-20",author:"CSC"},{id:"kb-rebate-q3",title:"渠道返利政策 2025 Q3",desc:"代表处返利规则、价保策略、破价稽核要点",collection:"channel",type:"XLSX",size:"860 KB",pages:8,clearance:"L3",indexed:!0,chunks:142,tags:["返利","价保"],updatedAt:"2026-07-06",author:"渠道管理部"},{id:"kb-price-master",title:"价盘政策主数据说明",desc:"FD/KA 价盘层级、价保模拟与破价预警规则",collection:"channel",type:"DOCX",size:"420 KB",pages:16,clearance:"L3",indexed:!0,chunks:88,tags:["价盘"],updatedAt:"2026-07-04",author:"渠道财经"},{id:"kb-jd-template",title:"招聘 JD 模板库",desc:"MSS 各序列 JD 结构、胜任力模型与合规用语",collection:"hr",type:"DOCX",size:"520 KB",pages:12,clearance:"L2",indexed:!0,chunks:76,tags:["JD","招聘"],updatedAt:"2026-07-02",author:"HR"},{id:"kb-resume-rubric",title:"简历筛选评分标准",desc:"人岗匹配维度、面试分析 Agent 输出字段说明",collection:"hr",type:"PDF",size:"380 KB",pages:10,clearance:"L2",indexed:!0,chunks:54,tags:["简历","HR"],updatedAt:"2026-06-28",author:"HR"},{id:"kb-rebate-finance",title:"返利/价保财务对账说明",desc:"代表处对账周期、异常返利稽核与 Finance Hub 口径",collection:"finance",type:"XLSX",size:"640 KB",pages:6,clearance:"L3",indexed:!0,chunks:68,tags:["返利","财经"],updatedAt:"2026-07-05",author:"财经"},{id:"kb-wearable-medical",title:"可穿戴医疗用语合规检查清单",desc:"营销物料、合同、招投标文档医疗宣称与风险筛查要点",collection:"quality",type:"PDF",size:"920 KB",pages:20,clearance:"L3",indexed:!0,chunks:124,tags:["合规","医疗用语"],updatedAt:"2026-07-07",author:"质量运营"},{id:"kb-quality-audit",title:"质量运营审计规范",desc:"文档合规抽检、Agent 调用审计与问题闭环流程",collection:"quality",type:"PDF",size:"760 KB",pages:16,clearance:"L2",indexed:!0,chunks:98,tags:["审计","质量"],updatedAt:"2026-07-01",author:"质量运营"},{id:"kb-assistant-bridge",title:"员工助手多源接入说明",desc:"Onebox/WeLink/Email 与知识库衔接的手工衔接指引",collection:"other",type:"MD",size:"120 KB",pages:8,clearance:"L1",indexed:!0,chunks:32,tags:["员工助手"],updatedAt:"2026-07-08",author:"MSS AI变革"}],aa=new Map(Vt.map(e=>[e.id,e.name]));function ra(e){return e.includes("cf0a2c")||e.includes("e0122f")||e.includes("rose")?"rose":e.includes("teal")||e.includes("cyan")?"teal":e.includes("emerald")||e.includes("green")?"emerald":e.includes("violet")||e.includes("purple")?"violet":e.includes("indigo")||e.includes("blue")?"indigo":e.includes("amber")||e.includes("orange")?"amber":e.includes("pink")?"pink":e.includes("sky")?"sky":e.includes("slate")?"slate":"rose"}function oa(e){return e.map(t=>aa.get(t)??t)}function ia(e){const t=oa(e.skillIds);return{id:e.id,name:e.name,description:e.desc,icon:e.icon,color:ra(e.color),persona:e.systemPrompt??`你是 ${e.name}，服务华为 MSS 营销服智枢平台。`,llm:{model:"glm-5.1",temperature:.2,maxTokens:4096},bindings:{promptId:`prompt-${e.id}`,promptName:`${e.name.replace(/\s*Agent\s*/i,"")}_BRIEF`,workflowIds:[],workflowNames:[],skillIds:e.skillIds,skillNames:t,knowledgeIds:e.chatId==="knowledge"?["kb-mss-enterprise"]:[],knowledgeNames:e.chatId==="knowledge"?["mss_enterprise_knowledge"]:[],toolIds:[],toolNames:[]},status:e.published?"online":"draft",version:"v1.0",updatedAt:"2026-07-08",author:e.author,chatId:e.chatId,tags:[e.category,e.bizLine,e.homeTag]}}function la(e){const t=it.filter(n=>n.skillIds.includes(e.id)).map(n=>n.name);return{id:e.id,name:e.name,displayName:e.name,description:e.desc,version:e.version.startsWith("v")?`v${e.version}`:`v${e.version}`,lifecycle:e.published?"online":"create",updatedAt:"2026-07-08",author:e.author,toolNames:e.connector?[e.connector]:[],inputSchema:"{ query: string, context?: object }",outputSchema:"{ result: object }",retry:2,timeoutMs:15e3,memoryPolicy:"session_readonly",usedByAgents:t,usedByWorkflows:[],dependsOn:[],tags:[...e.tags,e.category,e.command]}}function ca(e){const t=e.toLowerCase();return t==="pdf"?"pdf":t==="xlsx"?"xlsx":t==="docx"?"docx":t==="md"?"md":"pdf"}function da(e){const t=e.match(/([\d.]+)\s*(MB|KB|GB)/i);if(!t)return 1;const n=parseFloat(t[1]),s=t[2].toUpperCase();return s==="GB"?n*1024:s==="KB"?n/1024:n}function pa(e){return{id:e.id,name:e.title,type:ca(e.type),sizeMb:da(e.size),status:e.indexed?"indexed":"pending",chunks:e.chunks,clearanceLevel:e.clearance,updatedAt:e.updatedAt,domain:e.collection}}function ma(){const e=sa.map(pa),t=e.reduce((n,s)=>n+s.chunks,0);return{id:"kb-mss-enterprise",name:"mss_enterprise_knowledge",description:"华为 MSS 营销服企业知识库 · 按业务部门分区 · Milvus Online",status:"online",vectorDb:"Milvus",collection:"mss_enterprise_knowledge_v2",embeddingModel:"bge-large-zh-v1.5",chunkStrategy:"semantic_recursive",chunkSize:512,overlap:64,totalDocuments:e.length,totalChunks:t,storageGb:12.4,pipelineStage:"ready",updatedAt:"2026-07-08",tags:["rag","milvus","mss","biz-dept"],documents:e}}function ua(){return it.map(ia)}function qo(){return Vt.map(la)}function Vo(){return[ma()]}const fa=T(["online","draft","testing","approved","released","deprecated","archived"]),ga=T(["agent","workflow","knowledge","prompt"]),ha=Q({id:g(),kind:ga,name:g(),status:fa,icon:g(),description:g().optional(),chatId:g().optional(),version:g().optional()}),Jt=Q({id:g(),name:g(),namespace:g(),description:g(),memberCount:fe()}),xa=Q({workspace:Jt,chats:Mn(g(),hs),resources:se(ha),defaultChatId:g()}),ka=["conversations","agents","workflows","knowledge","prompts"];function ba(){return ua().map(e=>({id:e.id,kind:"agent",name:e.name,status:"online",icon:e.icon,chatId:e.chatId,description:e.description.slice(0,80)}))}const Ct=ba(),ya=[{id:"kb-mss-enterprise",kind:"knowledge",name:"mss_enterprise_knowledge",status:"online",icon:"fa-database",description:"Milvus · 按业务部门分区"},{id:"prompt-qa-strict",kind:"prompt",name:"ENTERPRISE_QA_STRICT",status:"released",icon:"fa-file-lines",version:"v3",description:"抗幻觉企业问答模板"}];function le(e){const t=e.agentSlice!=null?Ct.slice(0,e.agentSlice):Ct;return{workspace:{id:e.id,name:e.name,namespace:e.namespace,description:e.description,memberCount:e.memberCount},chats:{},defaultChatId:"",resources:[...t,...ya]}}const Yt=le({id:D,name:"华为全球营销服",namespace:"hw.global.mkt",description:"机关职能 · 华为全球营销服务默认数据空间",memberCount:4}),Sa=le({id:"ws-apac",name:"亚太地区部",namespace:"hw.apac",description:"一线区域 · 亚太地区部作战数据空间",memberCount:4,agentSlice:8}),wa=le({id:"ws-3c-latam",name:"拉美地区部",namespace:"hw.latam",description:"一线区域 · 拉美地区部作战数据空间",memberCount:4,agentSlice:6}),va=le({id:"ws-mea",name:"中东地区部",namespace:"hw.mea",description:"一线区域 · 中东地区部作战数据空间",memberCount:4,agentSlice:6}),Ia=le({id:"ws-eurasia",name:"欧亚地区部",namespace:"hw.eurasia",description:"一线区域 · 欧亚地区部作战数据空间",memberCount:4,agentSlice:6}),Aa=le({id:"ws-europe",name:"欧洲地区部",namespace:"hw.europe",description:"一线区域 · 欧洲地区部作战数据空间",memberCount:4,agentSlice:6}),Fe={[D]:Yt,"ws-apac":Sa,"ws-3c-latam":wa,"ws-mea":va,"ws-eurasia":Ia,"ws-europe":Aa},F=Object.values(Fe).map(e=>e.workspace);function Ne(e){return Fe[e]??Yt}function Ta(e){var t;return{workspace:{id:e.id,name:e.name,namespace:e.namespace,description:((t=e.description)==null?void 0:t.trim())||`${e.name} 租户空间`,memberCount:e.memberCount??1},chats:{},defaultChatId:"",resources:[{id:"agent-marketing",kind:"agent",name:"营销 Agent",status:"online",icon:"fa-chart-pie"},{id:"agent-knowledge",kind:"agent",name:"知识 Agent",status:"online",icon:"fa-book-open"}]}}function Jo(e,t){return e.resources.filter(n=>n.kind===t)}function Yo(e){return{online:"Online",draft:"Draft",testing:"Testing",released:"Released",approved:"Approved",deprecated:"Deprecated",archived:"Archived"}[e]}function Xo(e){return{online:"text-green-600 bg-green-50 border-green-200",draft:"text-amber-600 bg-amber-50 border-amber-200",testing:"text-blue-600 bg-blue-50 border-blue-200",released:"text-indigo-600 bg-indigo-50 border-indigo-200",approved:"text-emerald-600 bg-emerald-50 border-emerald-200",deprecated:"text-slate-500 bg-slate-100 border-slate-200",archived:"text-slate-400 bg-slate-50 border-slate-200"}[e]}const Qo="workspace-config",Zo={"zh-CN":"中文",en:"English",es:"Español"},Ma={[D]:"zh-CN","ws-apac":"en","ws-3c-latam":"es","ws-mea":"en","ws-eurasia":"en","ws-europe":"en"};function Xt(){return F.map((e,t)=>({id:e.id,enabled:!0,sortOrder:t,name:e.name,description:e.description,namespace:e.namespace,memberCount:e.memberCount,locale:Ma[e.id]??"zh-CN",custom:!1}))}function Qt(e,t){var n,s,a;return t?{id:e.id,name:((n=t.name)==null?void 0:n.trim())||e.name,description:((s=t.description)==null?void 0:s.trim())||e.description,namespace:((a=t.namespace)==null?void 0:a.trim())||e.namespace,memberCount:t.memberCount??e.memberCount}:e}function Pa(e){return{id:e.id,name:e.name.trim()||e.id,description:e.description.trim()||`${e.name} 租户空间`,namespace:e.namespace.trim()||e.id.replace(/^ws-/,"").replace(/-/g,"."),memberCount:e.memberCount>=0?e.memberCount:1}}function Ca(){return Object.keys(Fe)}function Ke(e){return Ca().includes(e)}function Ra(e){const n=e.trim().toLowerCase().replace(/[\s_]+/g,"-").replace(/[^a-z0-9\u4e00-\u9fa5-]/g,"").replace(/-+/g,"-").replace(/^-|-$/g,"").slice(0,32).replace(/[\u4e00-\u9fa5]/g,"")||`tenant-${Date.now().toString(36)}`;return n.startsWith("ws-")?n:`ws-${n}`}function Oa(){return D}function Na(e,t,n){if(!(e!=null&&e.id)||typeof e.id!="string")return null;const s=e.custom===!0||!Ke(e.id)&&!n,a=n??{id:e.id,name:e.id,description:"",namespace:e.id.replace(/^ws-/,"").replace(/-/g,"."),memberCount:1,locale:"zh-CN",custom:!0};return{id:e.id,enabled:e.enabled!==!1,sortOrder:typeof e.sortOrder=="number"?e.sortOrder:t,name:typeof e.name=="string"&&e.name.trim()?e.name.trim():a.name,description:typeof e.description=="string"&&e.description.trim()?e.description.trim():a.description,namespace:typeof e.namespace=="string"&&e.namespace.trim()?e.namespace.trim():a.namespace,memberCount:typeof e.memberCount=="number"&&e.memberCount>=0?e.memberCount:a.memberCount,locale:e.locale==="zh-CN"||e.locale==="en"||e.locale==="es"?e.locale:a.locale,custom:s||a.custom===!0}}function et(e){var o;const t=Xt();if(!e)return{defaultWorkspaceId:D,items:t};const n=new Map(t.map(i=>[i.id,i])),s=[],a=new Set;return Array.isArray(e.items)&&e.items.forEach((i,d)=>{if(!(i!=null&&i.id)||a.has(i.id))return;const p=n.get(i.id),m=Na(i,d,p);m&&(s.push(m),a.add(i.id),n.delete(i.id))}),n.forEach(i=>{a.has(i.id)||s.push(i)}),{defaultWorkspaceId:typeof e.defaultWorkspaceId=="string"&&s.some(i=>i.id===e.defaultWorkspaceId&&i.enabled)?e.defaultWorkspaceId:((o=s.find(i=>i.enabled))==null?void 0:o.id)??D,items:s.sort((i,d)=>i.sortOrder-d.sortOrder)}}function La(){return et(null)}function G(e){X()&&Ua($(),"workspace-config",{defaultWorkspaceId:e.defaultWorkspaceId,items:e.items})}function Zt(e){const t=F.find(n=>n.id===e.id);return t?Qt(t,e):Pa(e)}function en(e){const t={};return e.forEach(n=>{(n.custom||!Ke(n.id))&&(t[n.id]=Ta({id:n.id,name:n.name,namespace:n.namespace,description:n.description,memberCount:n.memberCount}))}),t}function W(e){Ee(async()=>{const{useWorkspaceStore:t}=await Promise.resolve().then(()=>nn);return{useWorkspaceStore:t}},void 0).then(({useWorkspaceStore:t})=>{const n=e.items.filter(a=>a.enabled).sort((a,r)=>a.sortOrder-r.sortOrder).map(Zt),s=en(e.items);t.setState(a=>{const r={...a.catalogs};return Object.keys(r).forEach(o=>{!Ke(o)&&!e.items.some(i=>i.id===o)&&delete r[o]}),Object.assign(r,s),{workspaceList:n.length?n:F,catalogs:r}})})}function me(e){Ee(async()=>{const{useWorkspaceStore:t}=await Promise.resolve().then(()=>nn);return{useWorkspaceStore:t}},void 0).then(({useWorkspaceStore:t})=>{Ee(async()=>{const{useConversationStore:n}=await import("./page-task-bWIi8QLn.js").then(s=>s.c5);return{useConversationStore:n}},__vite__mapDeps([5,1,2,4])).then(({useConversationStore:n})=>{var i,d;const{workspaceId:s,switchWorkspace:a}=t.getState(),r=e.items.filter(p=>p.enabled);if(!r.some(p=>p.id===s)){const p=r.some(c=>c.id===e.defaultWorkspaceId)?e.defaultWorkspaceId:((i=r[0])==null?void 0:i.id)??e.defaultWorkspaceId,m=a(p);n.getState().loadWorkspace(p,m),n.setState({pushToast:`Current tenant disabled; switched to ${((d=e.items.find(c=>c.id===p))==null?void 0:d.name)??p}`})}})})}const q=be((e,t)=>({...La(),hydrate:()=>{(async()=>{if(X())try{const s=await tt($(),"workspace-config");if(!s)return;const a=et(s);e(a),W(a),me(a)}catch{}})()},getConfig:s=>t().items.find(a=>a.id===s),getAllConfigs:()=>[...t().items].sort((s,a)=>s.sortOrder-a.sortOrder),getVisibleWorkspaces:()=>{const s=t().items.filter(a=>a.enabled).sort((a,r)=>a.sortOrder-r.sortOrder).map(Zt);return s.length?s:F},resolveWorkspace:s=>{const a=t().getConfig(s.id);return a?Qt(s,a):s},getLocale:s=>{var a;return((a=t().getConfig(s))==null?void 0:a.locale)??"zh-CN"},isEnabled:s=>{var a;return((a=t().getConfig(s))==null?void 0:a.enabled)!==!1},getDefaultWorkspaceId:()=>{var r;const{defaultWorkspaceId:s,items:a}=t();return a.some(o=>o.id===s&&o.enabled)?s:((r=a.find(o=>o.enabled))==null?void 0:r.id)??s},setDefaultWorkspaceId:s=>{if(!t().items.some(r=>r.id===s&&r.enabled))return;const a={defaultWorkspaceId:s,items:t().items};G(a),e({defaultWorkspaceId:s})},setEnabled:(s,a)=>{var m;const r=t().items.filter(c=>c.enabled).length;if(!a&&r<=1)return;const o=t().items.map(c=>c.id===s?{...c,enabled:a}:c),i=o.filter(c=>c.enabled);let d=t().defaultWorkspaceId;i.some(c=>c.id===d)||(d=((m=i[0])==null?void 0:m.id)??d);const p={defaultWorkspaceId:d,items:o};G(p),e(p),W(p),a||me(p)},updateWorkspace:(s,a)=>{const r=t().items.map(i=>i.id===s?{...i,...a,id:s,custom:i.custom}:i),o={defaultWorkspaceId:t().defaultWorkspaceId,items:r};G(o),e({items:r}),W(o)},moveWorkspace:(s,a)=>{const r=[...t().items].sort((m,c)=>m.sortOrder-c.sortOrder),o=r.findIndex(m=>m.id===s);if(o<0)return;const i=a==="up"?o-1:o+1;if(i<0||i>=r.length)return;const d=r.map((m,c)=>c===o?{...m,sortOrder:i}:c===i?{...m,sortOrder:o}:{...m,sortOrder:c}),p={defaultWorkspaceId:t().defaultWorkspaceId,items:d};G(p),e({items:d}),W(p)},addTenant:s=>{var u,f;const a=s.name.trim();if(!a)return null;const r=new Set(t().items.map(y=>y.id));let o=Ra(a);if(r.has(o)){let y=2;for(;r.has(`${o}-${y}`);)y+=1;o=`${o}-${y}`}const i=((u=s.namespace)==null?void 0:u.trim())||o.replace(/^ws-/,"").replace(/-/g,"."),d=t().items.reduce((y,x)=>Math.max(y,x.sortOrder),-1),p={id:o,enabled:!0,sortOrder:d+1,name:a,description:((f=s.description)==null?void 0:f.trim())||`${a} tenant space`,namespace:i,memberCount:s.memberCount??1,locale:s.locale??"zh-CN",custom:!0},m=[...t().items,p],c={defaultWorkspaceId:t().defaultWorkspaceId,items:m};return G(c),e({items:m}),W(c),o},removeTenant:s=>{var p,m;const a=t().items.find(c=>c.id===s);if(!a||!a.custom&&Ke(s)||t().items.length<=1)return!1;const r=t().items.filter(c=>c.id!==s),o=r.filter(c=>c.enabled);let i=t().defaultWorkspaceId;o.some(c=>c.id===i)||(i=((p=o[0])==null?void 0:p.id)??((m=r[0])==null?void 0:m.id)??i);const d={defaultWorkspaceId:i,items:r};return G(d),e(d),W(d),me(d),!0},resetToDefaults:()=>{const s={defaultWorkspaceId:D,items:Xt()};G(s),e(s),W(s),me(s)},exportConfig:()=>{const{defaultWorkspaceId:s,items:a}=t();return JSON.stringify({defaultWorkspaceId:s,items:a},null,2)},importConfig:s=>{try{const a=JSON.parse(s),r=et(a);return r.items.length?(G(r),e(r),W(r),me(r),!0):!1}catch{return!1}},enabledCount:()=>t().items.filter(s=>s.enabled).length,getCustomCatalogs:()=>en(t().items)})),ei=Object.freeze(Object.defineProperty({__proto__:null,useWorkspaceConfigStore:q},Symbol.toStringTag,{value:"Module"}));async function _a(){if(!O())return F;try{const e=await Se(A("/api/v1/workspaces"),{},8e3);if(!e.ok)throw new Error(`HTTP ${e.status}`);const t=await e.json();return ja(t.workspaces)}catch{return F}}async function tn(e){var t,n;if(!O())return Ne(e);try{const s=await Se(A(`/api/v1/workspaces/${e}/catalog`),{},8e3);if(!s.ok)throw new Error(`HTTP ${s.status}`);const a=await s.json(),r=xa.parse(a),o=Ne(e),i=Object.keys(r.chats??{}).length===0&&(((t=r.resources)==null?void 0:t.length)??0)===0,d=Object.keys(o.chats??{}).length>0||(((n=o.resources)==null?void 0:n.length)??0)>0;return i&&d?o:r}catch{return Ne(e)}}async function Ea(e){const t=await Promise.all(e.map(async n=>[n,await tn(n)]));return Object.fromEntries(t)}function qe(){return Fe}function ja(e){if(!Array.isArray(e))return F;const t=e.map(n=>{try{return Jt.parse(n)}catch{return null}}).filter(n=>n!==null);return t.length>0?t:F}class $a extends Error{constructor(n="portal_conflict",s){super(n);bt(this,"revision");this.name="PortalConflictError",this.revision=s}}function Ue(){return{"Content-Type":"application/json",Accept:"application/json",...j()}}async function za(){if(!O())return{ok:!1,llmEnvConfigured:!1};try{const e=new AbortController,t=setTimeout(()=>e.abort(),3e3),n=await fetch(A("/api/v1/health"),{signal:e.signal,headers:{Accept:"application/json",...j()}});if(clearTimeout(t),!n.ok)return{ok:!1,llmEnvConfigured:!1};if(!(n.headers.get("content-type")||"").includes("application/json"))return{ok:!1,llmEnvConfigured:!1};const a=await n.json(),r=(a==null?void 0:a.status)==="ok"&&(a==null?void 0:a.service)==="mss-claw-api";return{ok:r,llmEnvConfigured:r&&!!a.llmEnvConfigured}}catch{return{ok:!1,llmEnvConfigured:!1}}}async function ti(e){const t=await fetch(A(`/api/v1/workspaces/${e}/sessions`),{headers:j()});if(!t.ok)throw new Error(`HTTP ${t.status}`);return(await t.json()).chats??null}async function ni(e,t){const n=await fetch(A(`/api/v1/workspaces/${e}/sessions`),{method:"PUT",headers:Ue(),body:JSON.stringify({chats:t})});if(!n.ok)throw new Error(`HTTP ${n.status}`)}async function si(e){const t=await fetch(A(`/api/v1/workspaces/${e}/marketplace`),{headers:j()});if(!t.ok)throw new Error(`HTTP ${t.status}`);const n=await t.json();return n==null?null:typeof n=="object"?n:null}async function ai(e,t){const n=await fetch(A(`/api/v1/workspaces/${e}/marketplace`),{method:"PUT",headers:Ue(),body:JSON.stringify(t)});if(!n.ok)throw new Error(`HTTP ${n.status}`)}async function ri(){const e=await fetch(A("/api/v1/tools"),{headers:j()});if(!e.ok)throw new Error(`HTTP ${e.status}`);const t=await e.json();return t==null?null:Array.isArray(t)?{tools:t}:typeof t=="object"?t:null}async function oi(e){const t=Array.isArray(e)?{tools:e}:e,n=await fetch(A("/api/v1/tools"),{method:"PUT",headers:Ue(),body:JSON.stringify(t)});if(!n.ok)throw new Error(`HTTP ${n.status}`)}async function ii(e){const t=await fetch(A(`/api/v1/workspaces/${e}/portal-content`),{headers:j()});if(!t.ok)throw new Error(`HTTP ${t.status}`);const n=await t.json();if(n==null)return null;if(typeof n=="object"&&Array.isArray(n.items)){const s=typeof n.revision=="number"?n.revision:0;return{items:n.items,revision:s}}return null}async function li(e,t){const n=await fetch(A(`/api/v1/workspaces/${e}/portal-content`),{method:"PUT",headers:Ue(),body:JSON.stringify({items:t.items,expectedRevision:t.expectedRevision??0})});if(n.status===409){let a;try{a=(await n.json()).revision}catch{}throw new $a("portal_conflict",a)}if(!n.ok)throw new Error(`HTTP ${n.status}`);const s=await n.json();return{items:Array.isArray(s.items)?s.items:t.items,revision:typeof s.revision=="number"?s.revision:(t.expectedRevision??0)+1}}const Rt=ka.reduce((e,t)=>(e[t]=t==="conversations"||t==="agents",e),{}),L=be((e,t)=>({workspaceId:Oa(),workspaceList:q.getState().getVisibleWorkspaces(),catalogs:{...qe(),...q.getState().getCustomCatalogs()},catalogReady:!1,catalogLoading:!1,apiConnected:!1,nestLlmEnvConfigured:!1,apiStatus:"unknown",expandedSections:Rt,selectedResourceId:null,switchToast:null,bootstrap:async()=>{if(t().catalogReady||t().catalogLoading)return;e({catalogLoading:!0});const n=s=>{const a=q.getState();e({workspaceList:a.getVisibleWorkspaces(),catalogs:{...qe(),...a.getCustomCatalogs()},catalogReady:!0,catalogLoading:!1,apiConnected:!1,nestLlmEnvConfigured:!1,apiStatus:s})};try{if(!O()||Dn()){n("local-demo");return}const s=await za();if(!s.ok){n("unreachable");return}const a=q.getState(),r=await _a(),o=new Set(r.map(c=>c.id)),i=a.getVisibleWorkspaces(),d=i.length?i:r,p=d.map(c=>c.id).filter(c=>o.has(c)),m={...qe(),...await Ea(p),...a.getCustomCatalogs()};e({workspaceList:d,catalogs:m,catalogReady:!0,catalogLoading:!1,apiConnected:!0,nestLlmEnvConfigured:s.llmEnvConfigured,apiStatus:"connected"})}catch{n("unreachable")}},getCatalog:n=>{const{catalogs:s}=t();return s[n]??Ne(n)},currentWorkspace:()=>{const n=t().getCatalog(t().workspaceId);return q.getState().resolveWorkspace(n.workspace)},switchWorkspace:n=>{if(!q.getState().isEnabled(n))return e({switchToast:"该租户已隐藏，请在「租户配置」中启用"}),t().getCatalog(t().workspaceId).defaultChatId;const a=t().getCatalog(n),r=q.getState().resolveWorkspace(a.workspace).name;return e({workspaceId:n,selectedResourceId:null,expandedSections:{...Rt},switchToast:`已切换到「${r}」`}),O()&&!t().catalogs[n]&&tn(n).then(o=>{e(i=>({catalogs:{...i.catalogs,[n]:o}}))}),a.defaultChatId},toggleSection:n=>e(s=>({expandedSections:{...s.expandedSections,[n]:!s.expandedSections[n]}})),selectResource:n=>e({selectedResourceId:n}),resourceToModule:n=>({agent:"agent",workflow:"workflow",knowledge:"knowledge",prompt:"prompt"})[n],dismissSwitchToast:()=>e({switchToast:null})})),nn=Object.freeze(Object.defineProperty({__proto__:null,WORKSPACE_LIST:F,useWorkspaceStore:L},Symbol.toStringTag,{value:"Module"}));function lt(){return{"Content-Type":"application/json",Accept:"application/json",...j()}}function X(){return O()&&L.getState().apiConnected}function $(){return L.getState().workspaceId||"ws-mss-ai"}const sn=new Map;function ct(e,t){return`${e}::${t}`}function Ot(e,t){return sn.get(ct(e,t))??null}function an(e,t,n){sn.set(ct(e,t),n)}async function tt(e,t,n){if(!X())return n!=null&&n.fresh?null:Ot(e,t);if(!(n!=null&&n.fresh)){const o=Ot(e,t);if(o!=null)return o}const s=await fetch(A(`/api/v1/workspaces/${e}/docs/${t}`),{headers:{Accept:"application/json",...j(),...n!=null&&n.fresh?{"Cache-Control":"no-cache"}:{}},cache:n!=null&&n.fresh?"no-store":"default"});if(!s.ok)throw new Error(`docs_get_${t}_${s.status}`);const r=(await s.json()).payload??null;return r!=null&&an(e,t,r),r}async function rn(e,t,n){if(!X())throw new Error("shared_api_required");const s=await fetch(A(`/api/v1/workspaces/${e}/docs/${t}`),{method:"PUT",headers:lt(),body:JSON.stringify({payload:n})});if(!s.ok)throw new Error(`docs_put_${t}_${s.status}`);let a=n;if((s.headers.get("content-type")??"").includes("application/json"))try{const r=await s.json();r&&Object.prototype.hasOwnProperty.call(r,"payload")&&(a=r.payload)}catch{}an(e,t,a)}async function Da(e){if(!O())return{ok:!1,error:"共享服务未启用"};const t=await Se(A("/api/v1/auth/login"),{method:"POST",headers:lt(),body:JSON.stringify(e)},8e3),s=(t.headers.get("content-type")||"").includes("application/json");if(!t.ok){if(t.status>=500||t.status===404||t.status===405||t.status===408||!s)throw new Error(`login_unreachable_${t.status}`);try{return{ok:!1,error:(await t.json()).error||`登录失败（HTTP ${t.status}）`}}catch{throw new Error(`login_unreachable_${t.status}`)}}if(!s)throw new Error("login_unreachable_not_json");return await t.json()}async function Fa(e){if(!O())return{ok:!1,error:"共享服务未启用"};const t=`?workspaceId=${encodeURIComponent(e)}`,n=await Se(A(`/api/v1/auth/me${t}`),{headers:{Accept:"application/json",...j()}},8e3);return n.ok?await n.json():{ok:!1,error:`会话校验失败（HTTP ${n.status}）`}}async function Ka(e){if(O())try{await fetch(A("/api/v1/auth/logout"),{method:"POST",headers:lt(),body:JSON.stringify({workspaceId:e})})}catch{}}const Ve=new Map;function Ua(e,t,n,s=500){const a=ct(e,t);return new Promise((r,o)=>{const i=Ve.get(a);i&&clearTimeout(i.timer);const d=[...(i==null?void 0:i.waiters)??[],{resolve:r,reject:o}],p=setTimeout(()=>{Ve.delete(a),rn(e,t,n).then(()=>d.forEach(m=>m.resolve()),m=>d.forEach(c=>c.reject(m)))},s);Ve.set(a,{timer:p,waiters:d})})}function w(...e){return Pn(Cn(e))}function Ba(e){const t=e.match(/@([\u4e00-\u9fa5\w\s]+?)(?=\s|$|[，。！？])/g);return(t==null?void 0:t.map(n=>n.slice(1).trim()))??[]}function ci(e,t){const n=new Set(["knowledge","rd_rag"]);if(!new Set(["campaign_ops"]).has(e))return n.has(e)?"knowledge":"marketing";const a=Ba(t);return a.some(r=>r.includes("知识"))?"knowledge":a.some(r=>r.includes("营销")||r.includes("洞察"))?"marketing":t.includes("知识")||t.includes("SOP")||t.includes("合规")?"knowledge":"marketing"}const ae=[{id:"glm-5.1",label:"GLM 5.1",baseUrl:"https://open.bigmodel.cn/api/paas/v4",providerName:"智谱"},{id:"deepseek-v4-flash",label:"DeepSeek V4 Flash",baseUrl:"https://api.deepseek.com",providerName:"DeepSeek"},{id:"deepseek-v4-pro",label:"DeepSeek V4 Pro",baseUrl:"https://api.deepseek.com",providerName:"DeepSeek"},{id:"qwen3.7-plus",label:"Qwen 3.7 Plus",baseUrl:"https://dashscope.aliyuncs.com/compatible-mode/v1",providerName:"通义"}];function ve(){return ae.map(e=>({...e,apiKey:"",enabled:!0,source:"preset"}))}const z={model:ae[0].id,baseUrl:ae[0].baseUrl,apiKey:"",platformModels:ve(),defaultModelId:ae[0].id,customModels:[]},Ga={"GLM-5.1":"glm-5.1","glm-5":"glm-5.1","DeepSeek-V4":"deepseek-v4-flash","DeepSeek V4":"deepseek-v4-flash","deepseek-chat":"deepseek-v4-flash","deepseek-reasoner":"deepseek-v4-flash","Qwen-3.7":"qwen3.7-plus","Qwen 3.7":"qwen3.7-plus","qwen-plus":"qwen3.7-plus","qwen-max":"qwen3.7-plus","qwen-turbo":"qwen3.7-plus","gpt-4o":"glm-5.1","gpt-4o-mini":"glm-5.1","gpt-4-turbo":"glm-5.1"};function I(e){const t=typeof e=="string"?e.trim():"";return Ga[t]??t}function Wa(e){return Array.isArray(e)?e.filter(t=>!!t&&typeof t=="object").map(t=>{const n=I(String(t.id||""));if(!n)return null;const s=ae.find(a=>a.id===n);return{id:n,label:String(t.label||(s==null?void 0:s.label)||n),baseUrl:String(t.baseUrl||(s==null?void 0:s.baseUrl)||"").trim(),providerName:String(t.providerName||(s==null?void 0:s.providerName)||"平台"),apiKey:typeof t.apiKey=="string"?t.apiKey:"",enabled:t.enabled!==!1,source:t.source==="platform"||!s?"platform":"preset"}}).filter(t=>!!t):ve()}function nt(e){return(Array.isArray(e.platformModels)?e.platformModels:ve()).filter(n=>n.enabled)}function on(e){const t=I(e.model),s=(Array.isArray(e.platformModels)?e.platformModels:ve()).find(o=>o.id===t);if(s)return{id:s.id,label:s.label,baseUrl:s.baseUrl,apiKey:s.apiKey||"",providerName:s.providerName,custom:!1,platform:!0};const a=ae.find(o=>o.id===t);if(a)return{...a,apiKey:"",custom:!1,platform:!0};const r=e.customModels.find(o=>o.id===t||o.id===e.model);return r?{id:r.id,label:r.label||r.id,baseUrl:r.baseUrl,apiKey:r.apiKey||"",providerName:"自定义",custom:!0,platform:!1}:{id:t,label:t,baseUrl:"",apiKey:"",providerName:"自定义",custom:!0,platform:!1}}function Be(e){var o,i;const t=I(e.model);if(Array.isArray(e.platformModels)){const d=[...Array.isArray(e.platformModels)?e.platformModels:[],...Array.isArray(e.customModels)?e.customModels:[]].find(p=>I(p.id)===t);return!d||"enabled"in d&&d.enabled===!1?{model:t,baseUrl:"",apiKey:""}:{model:I(d.id),baseUrl:((o=d.baseUrl)==null?void 0:o.trim())||"",apiKey:((i=d.apiKey)==null?void 0:i.trim())||""}}const s=on(e),a=(s.apiKey||e.apiKey||"").trim(),r=(s.baseUrl||e.baseUrl||"").trim();return{model:s.id,baseUrl:r,apiKey:a}}function ln(e){const t=Be(e);return!!(t.apiKey&&t.baseUrl&&t.model)}function Ha(e){return typeof e.apiKey=="string"&&e.apiKey.trim()?!0:[...e.platformModels??[],...e.customModels??[]].some(t=>typeof t.apiKey=="string"&&t.apiKey.trim().length>0)}ae[0].baseUrl;function Nt(){return{...z,platformModels:ve(),customModels:[],apiKey:""}}let re=0;function qa(e,t,n="",s=""){return Array.isArray(e)?e.filter(a=>!!a&&typeof a=="object").map(a=>{const r=I(String(a.id||""));return r?{id:r,label:String(a.label||r),baseUrl:String(a.baseUrl||"").trim()||(r===n?s:""),apiKey:typeof a.apiKey=="string"&&a.apiKey?a.apiKey:r===n?t:""}:null}).filter(a=>!!a):[]}function Le(e){var c,u;const t=typeof(e==null?void 0:e.apiKey)=="string"?e.apiKey:"",n=Array.isArray(e==null?void 0:e.platformModels),s=I(typeof(e==null?void 0:e.model)=="string"&&e.model.trim()?e.model:typeof(e==null?void 0:e.defaultModelId)=="string"&&e.defaultModelId.trim()?e.defaultModelId:z.model),a=typeof(e==null?void 0:e.baseUrl)=="string"?e.baseUrl.trim():"";let r=Wa(e==null?void 0:e.platformModels);t&&!n&&(r=r.map(f=>f.id===s?{...f,baseUrl:a||f.baseUrl,apiKey:f.apiKey||t}:f));let o=qa(e==null?void 0:e.customModels,n?"":t,n?"":s,n?"":a);!n&&!r.some(f=>f.id===s)&&!o.some(f=>f.id===s)&&(o=[...o,{id:s,label:s,baseUrl:a,apiKey:t}]);const i=I((e==null?void 0:e.defaultModelId)||((c=r.find(f=>f.enabled))==null?void 0:c.id)||((u=o[0])==null?void 0:u.id)||z.defaultModelId);let d=I((e==null?void 0:e.model)||i);const p=new Set([...nt({platformModels:r}).map(f=>f.id),...o.map(f=>f.id)]);p.size&&!p.has(d)&&(d=p.has(i)?i:[...p][0]||z.model);const m=Be({model:d,baseUrl:"",apiKey:"",platformModels:r,customModels:o});return{model:d,baseUrl:m.baseUrl||((e==null?void 0:e.baseUrl)||"").trim()||z.baseUrl,apiKey:m.apiKey,platformModels:r,defaultModelId:i,customModels:o}}async function Va(e,t){if(!X())throw new Error("shared_api_required");await rn(e,"llm-config",t)}function H(e,t,n,s){const a=Be({model:e,baseUrl:"",apiKey:"",platformModels:t,customModels:n});return{model:a.model,baseUrl:a.baseUrl,apiKey:a.apiKey}}const cn=be((e,t)=>({config:Nt(),settingsOpen:!1,settingsFocusAdd:!1,syncing:!1,lastError:null,hydrate:async n=>{const s=$(),a=++re;if(!X()){e({config:Nt(),lastError:"共享 API 未连接，模型配置无法从数据库加载"});return}e({syncing:!0,lastError:null});try{const r=await tt(s,"llm-config",{fresh:(n==null?void 0:n.fresh)!==!1});if(a!==re||s!==$())return;e({config:Le(r),syncing:!1,lastError:null})}catch(r){if(a!==re||s!==$())return;e({syncing:!1,lastError:r instanceof Error?r.message:"加载模型配置失败"})}},saveConfig:async n=>{const s=$(),a=++re;if(!X())throw e({lastError:"共享 API 未连接，无法写入数据库。请先连接后端再配置模型。"}),new Error("shared_api_required");const r=Le({...t().config,...n});e({syncing:!0,lastError:null});try{await Va(s,r);const o=await tt(s,"llm-config",{fresh:!0});if(a!==re||s!==$())return;e({config:Le(o??r),syncing:!1,lastError:null})}catch(o){if(a!==re||s!==$())return;const i=o instanceof Error?o.message:"保存模型配置失败";throw e({syncing:!1,lastError:i}),o}},selectModel:async n=>{if(n==="__configure__"||n==="__credentials__"||n==="__extend__"){t().openSettings({focusAdd:n==="__extend__"});return}const{config:s}=t(),a=I(n);await t().saveConfig(H(a,s.platformModels,s.customModels,s.defaultModelId))},addCustomModel:async n=>{var o;const s=I(n.id.trim());if(!s)return;const{config:a}=t(),r=[...a.customModels.filter(i=>i.id!==s),{id:s,label:n.label.trim()||s,baseUrl:n.baseUrl.trim(),apiKey:((o=n.apiKey)==null?void 0:o.trim())||""}];await t().saveConfig({customModels:r,...H(s,a.platformModels,r,a.defaultModelId)})},removeCustomModel:async n=>{var o,i;const{config:s}=t(),a=s.customModels.filter(d=>d.id!==n),r=s.model===n?s.defaultModelId||((o=a[0])==null?void 0:o.id)||((i=s.platformModels.find(d=>d.enabled))==null?void 0:i.id)||z.model:s.model;await t().saveConfig({customModels:a,...H(r,s.platformModels,a,s.defaultModelId)})},upsertPlatformModel:async n=>{var p;const s=I(n.id.trim());if(!s)return;const{config:a}=t(),r=a.platformModels.find(m=>m.id===s),o={id:s,label:n.label.trim()||s,baseUrl:n.baseUrl.trim(),providerName:n.providerName.trim()||"平台",apiKey:((p=n.apiKey)==null?void 0:p.trim())??(r==null?void 0:r.apiKey)??"",enabled:n.enabled!==!1,source:"platform"};((r==null?void 0:r.source)==="preset"||n.source==="preset")&&(o.source="preset"),r||(o.source=n.source==="preset"?"preset":"platform");const i=[...a.platformModels.filter(m=>m.id!==s),o],d=a.model===s?H(s,i,a.customModels,a.defaultModelId):{};await t().saveConfig({platformModels:i,...d})},setPlatformModelApiKey:async(n,s)=>{const{config:a}=t(),r=a.platformModels.map(i=>i.id===n?{...i,apiKey:s}:i),o=a.model===n?H(n,r,a.customModels,a.defaultModelId):{};await t().saveConfig({platformModels:r,...o})},removePlatformModel:async n=>{var i,d;const{config:s}=t(),a=s.platformModels.filter(p=>p.id!==n),r={platformModels:a};s.defaultModelId===n&&(r.defaultModelId=((i=a.find(p=>p.enabled))==null?void 0:i.id)||((d=s.customModels[0])==null?void 0:d.id)||z.defaultModelId);const o=s.model===n?r.defaultModelId||s.defaultModelId:s.model;Object.assign(r,H(o,a,s.customModels,r.defaultModelId||s.defaultModelId)),await t().saveConfig(r)},setPlatformModelEnabled:async(n,s)=>{var i,d,p,m;const{config:a}=t(),r=a.platformModels.map(c=>c.id===n?{...c,enabled:s}:c),o={platformModels:r};if(!s&&a.model===n){const c=((i=r.find(u=>u.enabled))==null?void 0:i.id)||((d=a.customModels[0])==null?void 0:d.id)||z.model;Object.assign(o,H(c,r,a.customModels,a.defaultModelId))}!s&&a.defaultModelId===n&&(o.defaultModelId=((p=r.find(c=>c.enabled))==null?void 0:p.id)||((m=a.customModels[0])==null?void 0:m.id)||z.defaultModelId),await t().saveConfig(o)},setDefaultModelId:async n=>{const{config:s}=t(),a=I(n);(nt(s).some(o=>o.id===a)||s.customModels.some(o=>o.id===a))&&await t().saveConfig({defaultModelId:a,...H(a,s.platformModels,s.customModels)})},openSettings:n=>e({settingsOpen:!0,settingsFocusAdd:!!(n!=null&&n.focusAdd)}),closeSettings:()=>e({settingsOpen:!1,settingsFocusAdd:!1}),requiresSharedApi:()=>X(),modelOptions:()=>{const{config:n}=t(),s=nt(n).map(i=>({id:i.id,label:i.label,providerName:i.providerName,group:"platform"})),a=n.customModels.map(i=>({id:i.id,label:i.label||i.id,providerName:"自定义",group:"custom"})),r=new Set([...s,...a].map(i=>i.id)),o=n.model&&!r.has(n.model)?[{id:n.model,label:n.model,group:"custom",providerName:"自定义"}]:[];return[...s,...a,...o]},statusLabel:()=>{const{config:n}=t(),s=on(n),{apiConnected:a,nestLlmEnvConfigured:r}=L.getState();return a?ln(n)?{text:r?`${s.label} · 模型 Key 已配 · 亦可走服务端 LLM_*`:`${s.label} · 模型 Key 已配`,configured:!0}:r&&!Ha(n)?{text:`${s.label} · 服务端 LLM_* 可用`,configured:!0}:{text:`${s.label} · 当前模型未配置 API Key`,configured:!1}:{text:`${s.label} · 共享 API 未连接（无法读写库）`,configured:!1}}})),di=Object.freeze(Object.defineProperty({__proto__:null,normalizeLlmConfig:Le,useLlmConfigStore:cn},Symbol.toStringTag,{value:"Module"})),Je=2e4;function dt(){return cn.getState().config}function Ge(){return Be(dt())}function E(e){return ln(e??dt())}function dn(e){return e.trim().replace(/\/$/,"")}function Ja(e){if(typeof e!="string")return;const t=e.trim();return/^[a-z0-9][a-z0-9_.:-]{0,63}$/i.test(t)?t:void 0}function Lt(e){if(!e||typeof e!="object"||Array.isArray(e))return;const t=e,n=o=>{const i=typeof o=="number"?o:Number(o);return Number.isSafeInteger(i)&&i>=0&&i<=1e9?i:void 0},s=o=>typeof o!="string"?void 0:o.replace(/[\u0000-\u001f\u007f]+/g," ").replace(/Bearer\s+[^\s,;)}\]]+/gi,"Bearer [redacted]").replace(/Basic\s+[A-Za-z0-9+/=]+/gi,"Basic [redacted]").replace(/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/gi,"$1[redacted]@").replace(/([?&](?:api[-_]?key|access[-_]?token|token|secret|password|key)=)[^&\s]+/gi,"$1[redacted]").replace(/((?:api[-_]?key|access[-_]?token|token|secret|password|key)\s*[:=]\s*["']?)[^"',\s}]+/gi,"$1[redacted]").replace(/\b(?:sk|rk|sess|access|refresh)-[A-Za-z0-9][A-Za-z0-9._~-]{7,}\b/gi,"[redacted]").replace(/\s+/g," ").trim().slice(0,240)||void 0,a=t.phase,r={...a==="config"||a==="request"||a==="response"||a==="stream"?{phase:a}:{},...n(t.elapsedMs)!==void 0?{elapsedMs:n(t.elapsedMs)}:{},...n(t.timeoutMs)!==void 0?{timeoutMs:n(t.timeoutMs)}:{},...n(t.httpStatus)!==void 0?{httpStatus:n(t.httpStatus)}:{},...s(t.contentType)?{contentType:s(t.contentType)}:{},...s(t.upstreamSummary)?{upstreamSummary:s(t.upstreamSummary)}:{},...s(t.networkCode)?{networkCode:s(t.networkCode)}:{},...s(t.networkSummary)?{networkSummary:s(t.networkSummary)}:{},...n(t.sseFrames)!==void 0?{sseFrames:n(t.sseFrames)}:{},...n(t.tokenDeltas)!==void 0?{tokenDeltas:n(t.tokenDeltas)}:{},...n(t.reasoningDeltas)!==void 0?{reasoningDeltas:n(t.reasoningDeltas)}:{},...n(t.contentChars)!==void 0?{contentChars:n(t.contentChars)}:{},...n(t.reasoningChars)!==void 0?{reasoningChars:n(t.reasoningChars)}:{},...t.usageInputTokens===null||n(t.usageInputTokens)!==void 0?{usageInputTokens:t.usageInputTokens===null?null:n(t.usageInputTokens)}:{},...t.usageOutputTokens===null||n(t.usageOutputTokens)!==void 0?{usageOutputTokens:t.usageOutputTokens===null?null:n(t.usageOutputTokens)}:{},...typeof t.sawDoneMarker=="boolean"?{sawDoneMarker:t.sawDoneMarker}:{},...typeof t.aborted=="boolean"?{aborted:t.aborted}:{}};return Object.keys(r).length?r:void 0}async function pn(e,t){var r,o,i,d;const n=Ge(),s=await fetch(`${dn(n.baseUrl)}/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n.apiKey.trim()}`},body:JSON.stringify({model:I(n.model),messages:e,max_tokens:(t==null?void 0:t.maxTokens)??512,temperature:(t==null?void 0:t.temperature)??.3,stream:!1}),signal:t==null?void 0:t.signal});if(!s.ok){const p=await s.text();throw new Error(`LLM HTTP ${s.status}: ${p.slice(0,160)}`)}return((d=(i=(o=(r=(await s.json()).choices)==null?void 0:r[0])==null?void 0:o.message)==null?void 0:i.content)==null?void 0:d.trim())??""}async function*mn(e,t){var i,d,p;const n=Ge(),s=await fetch(`${dn(n.baseUrl)}/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n.apiKey.trim()}`},body:JSON.stringify({model:I(n.model),messages:e,max_tokens:(t==null?void 0:t.maxTokens)??1200,temperature:(t==null?void 0:t.temperature)??.5,stream:!0}),signal:t==null?void 0:t.signal});if(!s.ok||!s.body){const m=await s.text().catch(()=>"");throw new Error(`LLM stream HTTP ${s.status}: ${m.slice(0,160)}`)}const a=s.body.getReader(),r=new TextDecoder;let o="";for(;;){const{done:m,value:c}=await a.read();if(m)break;o+=r.decode(c,{stream:!0});const u=o.split(`
`);o=u.pop()??"";for(const f of u){const y=f.trim();if(!y.startsWith("data:"))continue;const x=y.slice(5).trim();if(!(!x||x==="[DONE]"))try{const v=(p=(d=(i=JSON.parse(x).choices)==null?void 0:i[0])==null?void 0:d.delta)==null?void 0:p.content;v&&(yield v)}catch{}}}}function Ya(e,t){const n=e.trim();if(!n)return t;const s=n.match(/\[[\s\S]*\]/);if(s)try{const r=JSON.parse(s[0]);if(Array.isArray(r)){const o=r.map(i=>typeof i=="string"?i.trim():"").filter(Boolean).slice(0,8);if(o.length>=2)return o}}catch{}const a=n.split(`
`).map(r=>r.replace(/^[\d.\-*)\]]+\s*/,"").trim()).filter(Boolean).slice(0,8);return a.length>=2?a:t}async function Xa(e){var r;const t=e.skillNames.length?e.skillNames.join("、"):"无",s=[{role:"system",content:"你是 MSS Claw 企业 AI 任务编排助手。根据用户任务输出 4-6 个简洁、可执行的中文步骤。只返回 JSON 字符串数组，不要 markdown 代码块，不要额外解释。"+((r=e.systemPrompt)!=null&&r.trim()?`
Agent 角色设定：${e.systemPrompt.trim()}`:"")},{role:"user",content:`任务类型：${e.actionType==="knowledge"?"知识检索/RAG":"营销数据分析"}
负责 Agent：${e.agentName}
已挂载 Skill：${t}
用户任务：${e.userTask}
参考模板（可优化但保持业务语义）：${JSON.stringify(e.fallbackSteps)}`}],a=await pn(s,{maxTokens:400,temperature:.2,signal:e.signal});return Ya(a,e.fallbackSteps)}function Qa(e){var a,r;const t=((a=e.systemPrompt)==null?void 0:a.trim())||`你是 ${e.agentName}，华为营销服 MSS Claw 平台的专业 AI Agent。`,n=e.actionType==="knowledge"&&((r=e.kbContext)!=null&&r.trim())?`

【知识库检索上下文】
${e.kbContext}

请在回答中用 [1][2] 形式标注引用编号，并确保结论可溯源。`:"";return[{role:"system",content:`${t}

请基于已确认的执行计划完成用户任务，输出结构清晰的中文 markdown 回复。
计划步骤：
${e.planSteps.map((o,i)=>`${i+1}. ${o}`).join(`
`)}
若为知识类任务，请标注引用来源；若为分析类任务，给出结论与建议。`+n},{role:"user",content:e.userTask}]}function Za(e){return e.map((t,n)=>({skill:`PlanStep_${n+1}`,time:`${120+n*90}ms`,label:t,detail:t}))}function er(e){return new Promise(t=>setTimeout(t,e))}async function*tr(e){const{signal:t,planSteps:n,actionType:s,agentName:a,message:r,systemPrompt:o,kbContext:i}=e;if(t!=null&&t.aborted)return;const d=performance.now();yield{type:"execution_start",executionId:`llm_${Date.now()}`};for(let c=0;c<n.length;c++){if(t!=null&&t.aborted)return;const u=n[c],f=`PlanStep_${c+1}`;if(yield{type:"skill_start",skill:f,label:u},await er(120+Math.floor(Math.random()*80)),t!=null&&t.aborted)return;yield{type:"skill_end",skill:f,latency:`${120+c*90}ms`}}const p=Qa({userTask:r,actionType:s,agentName:a,systemPrompt:o,planSteps:n,kbContext:i});try{for await(const c of mn(p,{signal:t,maxTokens:1200})){if(t!=null&&t.aborted)return;yield{type:"token",content:c}}}catch(c){yield{type:"error",message:c instanceof Error?c.message:"LLM 流式响应失败"};return}const m=((performance.now()-d)/1e3).toFixed(2);yield{type:"artifact",agentType:s},yield{type:"done",totalTime:`${m}s`,steps:Za(n),agentName:a}}async function nr(e,t){var r;if(!E())return"";const n=e.trim().slice(0,400);if(!n)return"";const s=t!=null&&t.agentName?`绑定专家：${t.agentName}
`:"";return((r=(await pn([{role:"system",content:"你是任务标题助手。根据用户任务描述生成简洁中文标题：不超过16个字，不要引号，不要句号，不要「标题：」前缀，只输出标题本身。"},{role:"user",content:`${s}任务描述：
${n}`}],{maxTokens:32,temperature:.2,signal:t==null?void 0:t.signal})).replace(/^["'「『]|["'」』]$/g,"").replace(/^(标题|任务名)\s*[:：]\s*/u,"").split(/[\r\n]/)[0])==null?void 0:r.trim())??""}async function un(e){var n,s,a;if(!O())return{ok:!1,errorCode:"api_disabled",message:"共享 API 未启用，无法测试服务端模型"};const t=((e==null?void 0:e.workspaceId)||$()).trim();if(!t)return{ok:!1,errorCode:"workspace_missing",message:"未找到工作区，无法测试服务端模型"};try{const r={};(n=e==null?void 0:e.model)!=null&&n.trim()&&(r.model=I(e.model));const o=((s=e==null?void 0:e.baseUrl)==null?void 0:s.trim())||"",i=((a=e==null?void 0:e.apiKey)==null?void 0:a.trim())||"";o&&i&&(r.baseUrl=o,r.apiKey=i);const d=await Se(A(`/api/v1/workspaces/${encodeURIComponent(t)}/llm-config/test`),{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json",...j()},body:JSON.stringify(r)},Je),p=await d.json().catch(()=>({}));if(!d.ok||p.ok!==!0){const c=typeof p.message=="string"?p.message.trim():"",u=Ja(p.errorCode)||(d.status?`http_${d.status}`:void 0),f=Lt(p.diagnostics);return{ok:!1,...u?{errorCode:u}:{},...f?{diagnostics:f}:{},message:c?`服务端测试失败：${c.slice(0,160)}`:`服务端测试失败（HTTP ${d.status||"未知"}）`}}const m=Lt(p.diagnostics);return{ok:!0,message:`连接成功 · ${(typeof p.model=="string"?p.model.trim().slice(0,200):"")||"当前模型"} · 服务端流式可用`,...m?{diagnostics:m}:{}}}catch(r){const o=r instanceof Error?r.message:String(r),i=typeof DOMException<"u"&&r instanceof DOMException&&r.name==="AbortError";return{ok:!1,errorCode:i?"client_request_timeout":"client_request_failed",message:i?`服务端测试请求超时（${Je}ms）`:`服务端测试失败：${o.slice(0,160)}`,...i?{diagnostics:{phase:"request",timeoutMs:Je,aborted:!0}}:{}}}}function sr(e){return un(e)}const pi=Object.freeze(Object.defineProperty({__proto__:null,generatePlanStepsWithLlm:Xa,getActiveLlmConfig:dt,getActiveLlmRuntime:Ge,isLlmConfigured:E,llmExecutionStream:tr,refineTaskTitleWithLlm:nr,streamChatCompletion:mn,testLlmConnection:sr,testWorkspaceLlmConnection:un},Symbol.toStringTag,{value:"Module"}));function Ce(e,t,n="application/json"){const s=new Blob([t],{type:n}),a=URL.createObjectURL(s),r=document.createElement("a");r.href=a,r.download=e,r.click(),URL.revokeObjectURL(a)}function ar({open:e,title:t,onClose:n,children:s,actions:a,size:r="md",elevate:o=!1,header:i,fitContent:d=!1}){if(!e)return null;const p=r==="fullscreen",m=r==="xl"||r==="2xl",c=p?"h-[min(96vh,calc(100%-1rem))] max-h-none max-w-none":r==="2xl"?d?"max-h-[94vh] max-w-6xl":"h-[min(94vh,920px)] max-w-6xl":r==="xl"?d?"max-h-[92vh] max-w-5xl":"h-[min(92vh,880px)] max-w-5xl":r==="lg"?"max-h-[85vh] max-w-2xl":"max-h-[85vh] max-w-lg";return l.jsx("div",{className:w("modal-backdrop fixed inset-0 flex items-center justify-center",p?"bg-black/55 p-2 md:p-3":"p-4",o?"z-[120]":"z-[100]"),children:l.jsxs("div",{className:w("flex w-full flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-apple-lg",c),children:[i??l.jsxs("div",{className:w("flex shrink-0 items-center justify-between border-b border-black/[0.06]",p||m?"px-5 py-3":"px-5 py-4"),children:[l.jsx("h3",{className:"truncate text-[15px] font-semibold text-[#1d1d1f]",children:t}),l.jsx("button",{type:"button",onClick:n,className:"text-[#86868b] transition hover:text-[#1d1d1f]",children:l.jsx("i",{className:"fa-solid fa-xmark"})})]}),l.jsx("div",{className:w(p?"min-h-0 flex-1 overflow-hidden p-3 md:p-4":m?"min-h-0 flex-1 overflow-y-auto p-0":"max-h-[60vh] overflow-y-auto p-5"),children:s}),a&&l.jsx("div",{className:w("flex w-full shrink-0 items-center justify-end gap-2 border-t border-black/[0.06] bg-[#fafafa]/50",p||m?"px-5 py-3":"px-5 py-4"),children:a})]})})}function mi({title:e,subtitle:t,actions:n,tip:s}){return l.jsxs("div",{className:"mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end",children:[l.jsxs("div",{className:"max-w-2xl",children:[l.jsx("p",{className:"mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400",children:"MSS Claw"}),l.jsxs("div",{className:"flex flex-wrap items-center gap-2",children:[l.jsx("h2",{className:"text-[20px] font-semibold tracking-tight text-zinc-900 md:text-[22px]",children:e}),s?l.jsx(rr,{children:s}):null]}),t?l.jsx("p",{className:"mt-1 text-[12px] leading-relaxed text-zinc-500",children:t}):null]}),n&&l.jsx("div",{className:"flex flex-wrap items-center gap-2",children:n})]})}function rr({children:e}){const[t,n]=M.useState(!1);return l.jsxs("div",{className:"relative inline-flex items-center",children:[l.jsxs("button",{type:"button",onClick:()=>n(s=>!s),onBlur:()=>setTimeout(()=>n(!1),150),className:w("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition",t?"border-claw-600/30 bg-claw-50 text-claw-700":"border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-800"),"aria-expanded":t,"aria-label":"快速上手",children:[l.jsx("i",{className:"fa-solid fa-lightbulb text-[9px]"}),"快速上手"]}),t?l.jsxs("div",{className:"absolute left-0 top-[calc(100%+6px)] z-30 w-[min(320px,80vw)] rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[11px] leading-relaxed text-zinc-600 shadow-lg",children:[l.jsx("p",{className:"mb-1 text-[10px] font-semibold tracking-wide text-zinc-400",children:"快速上手"}),l.jsx("div",{className:"learning-callout-inline",children:e})]}):null]})}function ui({value:e,onChange:t,placeholder:n,className:s="w-full max-w-[12rem] sm:w-48",type:a="text"}){return l.jsx("input",{type:a,value:e,onInput:r=>t(r.currentTarget.value),placeholder:n,className:`apple-input ${s}`})}function fi({items:e}){return l.jsx("div",{className:"mb-4 grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]",children:e.map(([t,n])=>l.jsxs("div",{className:"apple-card p-3",children:[l.jsx("p",{className:"text-[9px] font-semibold uppercase tracking-wide text-zinc-500",children:t}),l.jsx("p",{className:"mt-1 text-lg font-semibold tabular-nums tracking-tight text-zinc-900",children:n})]},t))})}function or(e){return e.trim().replace(/\/$/,"")}async function fn(e,t){var r,o,i,d;const n=Ge(),s=await fetch(`${or(n.baseUrl)}/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n.apiKey.trim()}`},body:JSON.stringify({model:I(n.model),messages:e,max_tokens:(t==null?void 0:t.maxTokens)??3200,temperature:(t==null?void 0:t.temperature)??.4,stream:!1}),signal:t==null?void 0:t.signal});if(!s.ok){const p=await s.text();throw new Error(`LLM HTTP ${s.status}: ${p.slice(0,160)}`)}return((d=(i=(o=(r=(await s.json()).choices)==null?void 0:r[0])==null?void 0:o.message)==null?void 0:i.content)==null?void 0:d.trim())??""}function ir(e){let t=e.trim();return t=t.replace(/^```(?:html|HTML|json|JSON|xml)?\s*\n?/i,""),t=t.replace(/\n?```\s*$/i,""),t.trim()}function gn(e){const t=ir(e);try{return JSON.parse(t)}catch{const n=t.indexOf("{"),s=t.lastIndexOf("}");if(n>=0&&s>n)try{return JSON.parse(t.slice(n,s+1))}catch{return null}return null}}async function lr(e){if(!E())throw new Error("LLM 未配置");const t=e.markdown.slice(0,12e3),n=e.type==="knowledge"?"知识检索 / 合规 / SOP / 引用溯源":"营销数据 / 经营分析 / 渠道与代表处",s=await fn([{role:"system",content:["你是企业多场景分析报告架构师。根据 Markdown 提炼「分析看板」结构化 JSON，供前端固定模板渲染。","只返回 JSON，不要代码块，不要解释。字段：","{",'  "executiveSummary": "一句话摘要（≤80字）",','  "metrics": [{"label":"指标名","value":"如 +8.2% 或 #1","tone":"up|down|neutral|warn","hint":"可选"}],','  "insights": [{"title":"短标题","text":"发现陈述","kind":"finding|risk|action|cite"}],','  "risks": ["风险句"],','  "actions": ["行动句"],','  "cites": ["溯源/引用句"],','  "sectionOverview": [{"title":"章节名","pointCount":3}]',"}","要求：","1) 紧扣场景语义提炼，适配营销/知识/培训/电商等不同材料，不要套固定话术。","2) 不得编造原文没有的数字或事实；可归纳改写，但必须可追溯到 Markdown。","3) metrics 2-4 个；insights 2-4 个；risks/actions 各 1-4 条；尽量保留关键百分比与专有名词。"].join(`
`)},{role:"user",content:[`场景倾向：${n}`,`Agent：${e.agentName||"Agent"}`,`任务：${e.query||"（未填）"}`,"","Markdown 全文：",t].join(`
`)}],{maxTokens:2200,temperature:.35,signal:e.signal}),a=gn(s);if(!a)throw new Error("LLM 未返回有效分析看板 JSON");const r=Array.isArray(a.metrics)?a.metrics:[],o=Array.isArray(a.insights)?a.insights:[];return{executiveSummary:typeof a.executiveSummary=="string"?a.executiveSummary:void 0,metrics:r,insights:o,risks:Array.isArray(a.risks)?a.risks.map(String):void 0,actions:Array.isArray(a.actions)?a.actions.map(String):void 0,cites:Array.isArray(a.cites)?a.cites.map(String):void 0,sectionOverview:Array.isArray(a.sectionOverview)?a.sectionOverview:void 0,source:"model"}}async function cr(e){if(!E())throw new Error("LLM 未配置");const t=e.markdown.slice(0,14e3),n=[`Agent：${e.agentName||"Agent"}`,`任务：${e.query||"（未填）"}`].join(`
`),s=await fn([{role:"system",content:["你是企业高管汇报 PPT 结构专家。根据 Markdown 提炼幻灯片。","硬性要求：","1) 覆盖原文全部主要章节与关键结论/数据/建议，不得只摘前两段。",'2) 只返回 JSON：{"slides":[{"title":"...","bullets":["..."]}]}，不要代码块，不要解释。',"3) 建议 4-10 页：第 1 页封面（标题+背景），其后每章一页或合并极短章节；每页 3-7 条 bullets，bullet 用完整业务语句，保留关键数字。","4) 不要空泛套话；bullet 必须能追溯到原文信息。"].join(`
`)},{role:"user",content:`${n}

Markdown 全文：
${t}`}],{maxTokens:2800,temperature:.3,signal:e.signal}),a=gn(s),r=a==null?void 0:a.slides;if(!Array.isArray(r)||!r.length)throw new Error("LLM 未返回有效 PPT");return{slides:r.slice(0,12).map(o=>({title:String(o.title||"要点"),bullets:Array.isArray(o.bullets)?o.bullets.map(i=>String(i)).filter(Boolean).slice(0,10):["（无要点）"]}))}}function dr(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function V(e){let t=dr(e);return t=t.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>"),t=t.replace(/__(.+?)__/g,"<strong>$1</strong>"),t=t.replace(/`([^`]+)`/g,"<code>$1</code>"),t=t.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2">$1</a>'),t=t.replace(/(^|[\s（(「])\*([^*\n]+)\*(?=[\s）)」.,，。!！?？]|$)/g,"$1<em>$2</em>"),t}function xe(e){let t=e.trim();return t.startsWith("|")&&(t=t.slice(1)),t.endsWith("|")&&(t=t.slice(0,-1)),t.split("|").map(n=>n.trim())}function J(e){const t=e.trim();return t.includes("-")?/^\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$/.test(t)||/^\|?(\s*:?-{3,}:?\s*\|)+\s*$/.test(t):!1}function _e(e){const t=e.trim();if(!t.includes("|"))return!1;if(J(t))return!0;const n=xe(t);return n.length>=2&&n.some(s=>s.length>0)}function pr(e){const t=e.trim();if(!t.includes("|")||!/\|[\t ]*:?-{3,}/.test(t))return null;const s=/\|?(?:\s*:?-{3,}:?\s*\|)+(?:\s*:?-{3,}:?\s*)?\|?/.exec(t);if(!s||s.index==null)return null;const a=t.slice(0,s.index).trim(),r=s[0].trim().startsWith("|")?s[0].trim():`|${s[0].trim()}`;let o=t.slice(s.index+s[0].length).trim();if(!a.includes("|"))return null;const d=xe(a).length;if(d<2)return null;const p=[a.startsWith("|")?a:`| ${a} |`,r.endsWith("|")?r:`${r}|`];if(!o)return p;const m=o.split(/\|\s*\|/).map(u=>u.trim()).filter(Boolean).map(u=>{const f=u.startsWith("|")?u:`| ${u}`;return f.endsWith("|")?f:`${f} |`});if(m.length>=1)return p.push(...m),p;const c=xe(o.startsWith("|")?o:`| ${o}`);for(let u=0;u+d<=c.length;u+=d){const f=c.slice(u,u+d);f.every(y=>!y)||p.push(`| ${f.join(" | ")} |`)}return p.length>=3?p:null}function _t(e){const t=e.map(i=>i.trim()).filter(Boolean);if(t.length<2)return"";let n=t[0],s=t.slice(1);s[0]&&J(s[0])&&(s=s.slice(1));const a=xe(n);if(a.length<2)return"";const r=`<thead><tr>${a.map(i=>`<th>${V(i)}</th>`).join("")}</tr></thead>`,o=`<tbody>${s.filter(i=>!J(i)).map(i=>{const d=xe(i);for(;d.length<a.length;)d.push("");return`<tr>${d.slice(0,a.length).map(p=>`<td>${V(p)}</td>`).join("")}</tr>`}).join("")}</tbody>`;return`<div class="md-table-wrap"><table class="md-table">${r}${o}</table></div>`}function mr(e){const n=e.replace(/\r\n/g,`
`).split(`
`).flatMap(m=>pr(m)??[m]),s=[];let a=0,r=!1,o=!1,i=[];const d=()=>{r&&(s.push("</ul>"),r=!1),o&&(s.push("</ol>"),o=!1)},p=()=>{if(!i.length)return;const m=i.join(" ").trim();m&&s.push(`<p>${V(m)}</p>`),i=[]};for(;a<n.length;){const u=(n[a]??"").trimEnd().trim();if(!u){p(),d(),a+=1;continue}if(_e(u)){const k=(n[a+1]??"").trim();if(J(u)||J(k)||_e(k)&&u.includes("|")&&k.includes("|")||J(k)){p(),d();const N=[];for(;a<n.length&&_e((n[a]??"").trim());)N.push((n[a]??"").trim()),a+=1;N.length>=2&&!J(N[0])?s.push(_t(N)):N.length>=3&&s.push(_t(N.slice(1)));continue}}if(/^---+$/.test(u)||/^\*\*\*+$/.test(u)){p(),d(),s.push("<hr/>"),a+=1;continue}const f=/^(#{1,4})\s+(.+)$/.exec(u);if(f){p(),d();const k=f[1].length;s.push(`<h${k}>${V(f[2])}</h${k}>`),a+=1;continue}if(/^>\s?/.test(u)){p(),d();const k=[];for(;a<n.length&&/^>\s?/.test((n[a]??"").trim());)k.push((n[a]??"").trim().replace(/^>\s?/,"")),a+=1;s.push(`<blockquote>${V(k.join(" "))}</blockquote>`);continue}const y=/^[-*·]\s+(.+)$/.exec(u);if(y){p(),o&&(s.push("</ol>"),o=!1),r||(s.push("<ul>"),r=!0),s.push(`<li>${V(y[1])}</li>`),a+=1;continue}const x=/^(\d+)[.)]\s+(.+)$/.exec(u);if(x){const k=x[2].trim(),v=k.length<=48&&!/[。；;！？!?]$/.test(k)&&(/表|图|归因|建议|结论|摘要|指标|分析|说明|概况|概述|TOP|可视化/.test(k)||k.length<=24);if(p(),v){d(),s.push(`<h3>${V(k)}</h3>`),a+=1;continue}r&&(s.push("</ul>"),r=!1),o||(s.push("<ol>"),o=!0),s.push(`<li>${V(k)}</li>`),a+=1;continue}d(),i.push(u),a+=1}return p(),d(),s.join(`
`)}function pt(e){const t=e.replace(/\r\n/g,`
`).split(`
`),n=[];let s="",a=1,r=[],o=!1;const i=()=>{const d=r.join(`
`).trim();!o&&!d||(n.push({heading:s||(n.length===0?"概述":`要点 ${n.length+1}`),body:d,level:a}),r=[])};for(const d of t){const p=/^(#{1,4})\s+(.+)$/.exec(d.trim());if(p){(o||r.some(m=>m.trim()))&&i(),s=p[2].trim(),a=p[1].length,o=!0;continue}r.push(d)}return i(),n}function ie(e,t=10){const n=e.split(/\r?\n/).map(a=>a.trim()).filter(Boolean),s=[];for(const a of n){if(/^---+$/.test(a)||/^>\s?/.test(a)||_e(a)||J(a))continue;const o=a.replace(/^[-*·]\s+/,"").replace(/^\d+[.)]\s+/,"").trim().replace(/\*\*(.+?)\*\*/g,"$1").replace(/\*(.+?)\*/g,"$1").replace(/`([^`]+)`/g,"$1").trim();if(o){if(!/^[-*·\d]/.test(a)&&o.length>90&&/[。；;]/.test(o)){const i=o.split(new RegExp("(?<=[。；;])\\s*")).map(d=>d.trim()).filter(d=>d.length>=6);for(const d of i)if(s.push(d.length>140?`${d.slice(0,138)}…`:d),s.length>=t)return s;continue}if(s.push(o.length>140?`${o.slice(0,138)}…`:o),s.length>=t)break}}if(!s.length){const a=e.replace(/\s+/g," ").trim();a&&s.push(a.length>140?`${a.slice(0,138)}…`:a)}return s}function C(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Y(e){return e.replace(/\*\*(.+?)\*\*/g,"$1").replace(/\*(.+?)\*/g,"$1").replace(/`([^`]+)`/g,"$1").replace(/\[([^\]]+)\]\([^)]+\)/g,"$1").trim()}function ur(e){const t=[],n=new Set,s=e.replace(/\*\*(.+?)\*\*/g,"$1").replace(/\*(.+?)\*/g,"$1").replace(/`([^`]+)`/g,"$1"),a=(p,m,c)=>{const u=Y(p).replace(/[-*·:：]+$/g,"").trim()||"指标",f=Number(m),y=`${m}%`,x=`${u}|${y}`;n.has(x)||t.length>=6||(n.add(x),t.push({label:u.slice(0,18),value:y,tone:f>0?"up":f<0?"down":"neutral",hint:c}))},r=/([A-Za-z\u4e00-\u9fff][A-Za-z0-9\u4e00-\u9fff/\s]{0,20}?)\s*[:：]?\s*([+-]?\d+(?:\.\d+)?)\s*%/g;let o;for(;(o=r.exec(s))&&t.length<6;)a(o[1],o[2],"来自 Markdown 数值");const i=/(环比|同比|增长|下降|转化|占比|提升|回落)\s*([+-]?\d+(?:\.\d+)?)\s*%/g;for(;(o=i.exec(s))&&t.length<6;)a(o[1],o[2]);const d=/([A-Za-z\u4e00-\u9fff]{2,12}).{0,8}(?:排名|第)\s*(\d{1,2})\b/g;for(;(o=d.exec(s))&&t.length<6;){const p=`${Y(o[1]).slice(0,10)}排名`,m=`#${o[2]}`,c=`${p}|${m}`;n.has(c)||(n.add(c),t.push({label:p,value:m,tone:"neutral",hint:"位次"}))}return t.slice(0,4)}function fr(e){const t=pt(e),n=[],s=ie(e,24),a=r=>{n.some(o=>o.text===r.text)||n.push(r)};for(const r of s){const o=Y(r);if(!(o.length<8)&&(/风险|合规|避免|警告|需复核|不得|禁止/.test(o)?a({title:"风险提示",text:o,kind:"risk"}):/建议|下一步|启动|同步|复核|提交|执行/.test(o)?a({title:"行动建议",text:o,kind:"action"}):/引用|来源|指南|规范|SOP|文档/.test(o)&&n.filter(i=>i.kind==="cite").length<2?a({title:"溯源引用",text:o,kind:"cite"}):n.filter(i=>i.kind==="finding").length<4&&a({title:"关键发现",text:o,kind:"finding"}),n.length>=8))break}for(const r of t){const o=r.heading,i=ie(r.body,4);if(i.length){if(/结论|摘要|发现|洞察/.test(o))for(const d of i.slice(0,2))a({title:o,text:Y(d),kind:"finding"});if(/下一步|建议|行动/.test(o))for(const d of i.slice(0,3))a({title:o,text:Y(d),kind:"action"});if(/引用|来源|溯源/.test(o))for(const d of i.slice(0,2))a({title:o,text:Y(d),kind:"cite"})}}return n.slice(0,8)}function Et(e){return e==="up"?"kpi-up":e==="down"?"kpi-down":e==="warn"?"kpi-warn":"kpi-neutral"}function gr(e){return e==="risk"?{label:"风险",cls:"tag-risk"}:e==="action"?{label:"行动",cls:"tag-action"}:e==="cite"?{label:"溯源",cls:"tag-cite"}:{label:"发现",cls:"tag-find"}}function hr(e){const t=Math.abs(Number(String(e).replace("%","")));return Number.isFinite(t)?Math.max(12,Math.min(100,t*(t<=20?4:1))):40}function mt(e,t){var c;const n=ur(e),s=fr(e),a=pt(e),r=s.filter(u=>u.kind==="finding"),o=s.filter(u=>u.kind==="risk").map(u=>u.text),i=s.filter(u=>u.kind==="action").map(u=>u.text),d=s.filter(u=>u.kind==="cite").map(u=>u.text),p=n.length>0?n:[{label:"章节覆盖",value:String(Math.max(1,a.length)),tone:"neutral",hint:"Markdown 章节"},{label:"提炼要点",value:String(Math.max(1,s.length)),tone:"up",hint:"自动抽取"},{label:"报告类型",value:(t==null?void 0:t.type)==="knowledge"?"知识":"分析",tone:"neutral"}];return{executiveSummary:(Y(((c=r[0]||s[0])==null?void 0:c.text)||ie(e,1)[0]||"")||"已根据 Markdown 完成结构化分析，详见下方看板与正文。").slice(0,160),metrics:p.slice(0,4),insights:(r.length?r:s).slice(0,4),risks:o.slice(0,4),actions:i.slice(0,4),cites:d.slice(0,3),sectionOverview:a.slice(0,6).map(u=>({title:u.heading,pointCount:ie(u.body,20).length})),source:"local"}}function xr(e,t){if(!t)return e;const n=c=>c==="up"||c==="down"||c==="neutral"||c==="warn",s=(t.metrics||[]).map(c=>({label:String((c==null?void 0:c.label)||"").trim().slice(0,18),value:String((c==null?void 0:c.value)||"").trim().slice(0,24),tone:n(c==null?void 0:c.tone)?c.tone:"neutral",hint:c!=null&&c.hint?String(c.hint).slice(0,24):"模型提炼"})).filter(c=>c.label&&c.value),a=(t.insights||[]).map(c=>({title:String((c==null?void 0:c.title)||"关键发现").trim().slice(0,40),text:String((c==null?void 0:c.text)||"").trim().slice(0,200),kind:(c==null?void 0:c.kind)==="risk"||(c==null?void 0:c.kind)==="action"||(c==null?void 0:c.kind)==="cite"||(c==null?void 0:c.kind)==="finding"?c.kind:"finding"})).filter(c=>c.text),r=(t.risks||[]).map(c=>String(c).trim()).filter(Boolean).slice(0,4),o=(t.actions||[]).map(c=>String(c).trim()).filter(Boolean).slice(0,4),i=(t.cites||[]).map(c=>String(c).trim()).filter(Boolean).slice(0,3),d=(t.sectionOverview||[]).map(c=>({title:String((c==null?void 0:c.title)||"").trim(),pointCount:Number(c==null?void 0:c.pointCount)||0})).filter(c=>c.title).slice(0,6),p=String(t.executiveSummary||"").trim().slice(0,160);return!!p&&(s.length>=2||a.length>=2||o.length+r.length>=2)?{executiveSummary:p||e.executiveSummary,metrics:s.length?s.slice(0,4):e.metrics,insights:a.length?a.slice(0,4):e.insights,risks:r.length?r:e.risks,actions:o.length?o:e.actions,cites:i.length?i:e.cites,sectionOverview:d.length?d:e.sectionOverview,source:"model"}:e}function kr(e,t){const n=(t==null?void 0:t.board)??mt(e,t),s=n.insights.filter(f=>f.kind==="finding").slice(0,3),a=n.metrics.slice(0,4),r=a.filter(f=>/%|％/.test(f.value)).slice(0,4),o=n.source==="model"?"模型按场景提炼 · 本地模板排版":"本地规则抽取 · 模板排版",i=a.map(f=>`<div class="kpi ${Et(f.tone)}">
      <div class="kpi-label">${C(f.label)}</div>
      <div class="kpi-value">${C(f.value)}</div>
      ${f.hint?`<div class="kpi-hint">${C(f.hint)}</div>`:""}
    </div>`).join(""),d=r.length>=2?`<div class="panel">
      <div class="panel-hd"><span>指标对照</span><span class="muted">${n.source==="model"?"模型提炼数值":"由文中百分比生成"}</span></div>
      <div class="bars">
        ${r.map(f=>`<div class="bar-row">
          <div class="bar-label">${C(f.label)}</div>
          <div class="bar-track"><div class="bar-fill ${Et(f.tone)}" style="width:${hr(f.value)}%"></div></div>
          <div class="bar-val">${C(f.value)}</div>
        </div>`).join("")}
      </div>
    </div>`:`<div class="panel">
      <div class="panel-hd"><span>结构概览</span><span class="muted">章节拆解</span></div>
      <div class="struct-grid">
        ${n.sectionOverview.slice(0,6).map((f,y)=>`<div class="struct-item">
          <span class="struct-idx">${y+1}</span>
          <span class="struct-title">${C(f.title)}</span>
          <span class="struct-len">${f.pointCount} 要点</span>
        </div>`).join("")}
      </div>
    </div>`,p=(s.length?s:n.insights.slice(0,3)).map(f=>{const y=gr(f.kind);return`<div class="insight-card">
        <span class="tag ${y.cls}">${y.label}</span>
        <h4>${C(f.title)}</h4>
        <p>${C(f.text)}</p>
      </div>`}).join(""),m=n.risks.length>0?n.risks.map(f=>`<li>${C(f)}</li>`).join(""):"<li>文中未检出显式风险词；请结合正文复核业务口径。</li>",c=n.actions.length>0?n.actions.map((f,y)=>`<li><span class="step">${y+1}</span>${C(f)}</li>`).join(""):'<li><span class="step">1</span>复核正文结论后同步相关 Owner。</li>',u=n.cites.length>0?`<div class="panel cite-panel">
      <div class="panel-hd"><span>溯源要点</span><span class="muted">${n.source==="model"?"模型归纳":"来自引用相关语句"}</span></div>
      <ul class="cite-list">${n.cites.map(f=>`<li>${C(f)}</li>`).join("")}</ul>
    </div>`:"";return`
<section class="analysis">
  <div class="analysis-hd">
    <div>
      <p class="analysis-eyebrow">ANALYSIS BOARD</p>
      <h2>智能分析看板</h2>
      <p class="analysis-desc">${C(o)}：指标、发现、风险与行动，便于多场景快速阅览。</p>
    </div>
    <div class="exec-pill">
      <span class="exec-label">一句话摘要</span>
      <p>${C(Y(n.executiveSummary).slice(0,160))}</p>
    </div>
  </div>

  <div class="kpi-grid">${i}</div>

  <div class="split">
    ${d}
    <div class="panel">
      <div class="panel-hd"><span>关键发现</span><span class="muted">${n.source==="model"?"模型聚类":"自动聚类"}</span></div>
      <div class="insight-grid">${p||'<p class="muted">暂无提炼要点</p>'}</div>
    </div>
  </div>

  <div class="split split-2">
    <div class="panel panel-risk">
      <div class="panel-hd"><span>风险与注意</span></div>
      <ul class="bullet-rich">${m}</ul>
    </div>
    <div class="panel panel-action">
      <div class="panel-hd"><span>行动路线</span></div>
      <ul class="action-list">${c}</ul>
    </div>
  </div>

  ${u}
</section>
<section class="body-hd">
  <p class="analysis-eyebrow">FULL REPORT</p>
  <h2>正文详情</h2>
  <p class="analysis-desc">完整保留 Markdown 原文结构与表述，供核对与转发。</p>
</section>`}const br=`
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
`;function yr(e){return e!=null&&e.length?e.join(" · "):""}function Sr(e,t){var s;const n=/^#\s+(.+)$/m.exec(e);return((s=n==null?void 0:n[1])==null?void 0:s.trim())||t}function wr(e){return/[+-]?\d+(\.\d+)?%|#\d+|第\s*\d+|环比|同比|万元|GMV|SO\b/.test(e)}function hn(e){return e.length?e.filter(wr).length>=Math.ceil(e.length*.5)&&e.length<=6?"metrics":e.length<=6?"cards":"list":"list"}function st(e,t=72){const n=e.replace(/\s+/g," ").trim();return n.length>t?`${n.slice(0,t-1)}…`:n}function xn(e,t){var p,m,c;const n=((p=t==null?void 0:t.title)==null?void 0:p.trim())||((m=e[0])==null?void 0:m.title)||"业务汇报",s=e.filter(u=>u.role!=="cover"&&u.role!=="closing").filter(u=>!/谢谢|thank\s*you|致谢/i.test(u.title)).map(u=>({...u,role:u.role||"content",layout:u.layout||hn(u.bullets),bullets:u.bullets.map(f=>st(f,88)).slice(0,6)})),a=s[0]&&s[0].title===n&&s[0].bullets.every(u=>/Agent|Skill|任务|基于/.test(u))?s.slice(1):s,r=a.slice(0,5).map((u,f)=>`${f+1}. ${u.title}`),o={role:"cover",layout:"cover",title:n,subtitle:"MSS Claw · 智能交付汇报",bullets:[],meta:[t!=null&&t.agentName?`汇报人：${t.agentName}`:"MSS AI 提效作战平台",(c=t==null?void 0:t.skills)!=null&&c.length?`能力：${yr(t.skills)}`:"基于 Markdown 智能生成",t!=null&&t.query?`议题：${t.query.slice(0,42)}`:new Date().toLocaleDateString("zh-CN")]},i=r.length>=2?{role:"agenda",layout:"cards",title:"汇报议程",subtitle:"Agenda",bullets:r}:null,d={role:"closing",layout:"closing",title:"谢谢",subtitle:"Thank You",bullets:["欢迎交流与反馈","MSS Claw · 让业务交付更高效"],meta:[(t==null?void 0:t.agentName)||"MSS Claw",new Date().toLocaleDateString("zh-CN")]};return[o,...i?[i]:[],...a.slice(0,8),d]}function vr(e,t){const n=pt(e),s=Sr(e,"业务汇报"),a=[];for(const r of n){if(r.level===1&&r.heading===s&&!r.body.trim())continue;const o=ie(r.body,8).filter(i=>!i.includes("|")&&!/^[-:]+$/.test(i)).map(i=>st(i,88));!o.length&&r.level===1||o.length&&a.push({role:"content",title:r.heading.replace(/^\d+[.)]\s*/,""),bullets:o,layout:hn(o)})}return a.length||a.push({role:"content",title:"核心要点",bullets:ie(e,6).map(r=>st(r,88)),layout:"cards"}),xn(a,{title:s,agentName:t==null?void 0:t.agentName,query:t==null?void 0:t.query,skills:t==null?void 0:t.skills})}function Ir(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}function Ar(e,t,n){const s=new Uint8Array(t.byteLength);s.set(t);const a=new Blob([s],{type:n}),r=URL.createObjectURL(a),o=document.createElement("a");o.href=r,o.download=e,o.click(),URL.revokeObjectURL(r)}function Tr(e,t="l"){return`<p:txBody><a:bodyPr/><a:lstStyle/>${e.map((s,a)=>{const r=(s.size??18)*100,o=s.bold?"<a:b/>":"",i=s.color??"1A1A1A";return`<a:p>
  <a:pPr algn="${t}">
    <a:spcBef><a:spcPts val="${a===0?0:120}"/></a:spcBef>
  </a:pPr>
  <a:r>
    <a:rPr lang="zh-CN" sz="${r}" dirty="0">${o}<a:solidFill><a:srgbClr val="${i}"/></a:solidFill>
      <a:latin typeface="Microsoft YaHei"/><a:ea typeface="Microsoft YaHei"/>
    </a:rPr>
    <a:t>${Ir(s.text)}</a:t>
  </a:r>
  <a:endParaRPr lang="zh-CN" sz="${r}"/>
</a:p>`}).join("")}</p:txBody>`}let at=10;function Mr(){return at+=1,at}function R(e){var n;const t=(n=e.lines)!=null&&n.length?Tr(e.lines,e.align??"l"):'<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="zh-CN"/></a:p></p:txBody>';return`<p:sp>
  <p:nvSpPr><p:cNvPr id="${Mr()}" name="Shape"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
  <p:spPr>
    <a:xfrm><a:off x="${e.x}" y="${e.y}"/><a:ext cx="${e.cx}" cy="${e.cy}"/></a:xfrm>
    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
    <a:solidFill><a:srgbClr val="${e.fill}"/></a:solidFill>
    <a:ln><a:noFill/></a:ln>
  </p:spPr>
  ${t}
</p:sp>`}const je=12192e3,ut=6858e3,_="CF0A2C",$e="1A1A1A",ke="595959",rt="F7F7F7";function Pr(e){const t=(e.meta??[]).slice(0,3),n=[R({x:0,y:0,cx:72e4,cy:ut,fill:_}),R({x:11e5,y:9e5,cx:95e5,cy:5e5,fill:"FFFFFF",lines:[{text:"HUAWEI STYLE · MSS CLAW",size:12,bold:!0,color:_}]}),R({x:11e5,y:22e5,cx:98e5,cy:16e5,fill:"FFFFFF",lines:[{text:e.subtitle||"智能交付汇报",size:14,color:ke},{text:e.title||"业务汇报",size:36,bold:!0,color:$e}]}),R({x:11e5,y:4e6,cx:12e5,cy:6e4,fill:_}),...t.map((s,a)=>R({x:11e5,y:43e5+a*42e4,cx:9e6,cy:38e4,fill:"FFFFFF",lines:[{text:s,size:13,color:ke}]}))];return ft(n.join(""))}function Cr(e){const t=[R({x:0,y:0,cx:je,cy:12e4,fill:_}),R({x:12e5,y:22e5,cx:98e5,cy:22e5,fill:"FFFFFF",align:"ctr",lines:[{text:e.title||"谢谢",size:48,bold:!0,color:$e},{text:e.subtitle||"Thank You",size:18,bold:!0,color:_},...e.bullets.slice(0,2).map(n=>({text:n,size:13,color:ke}))]}),R({x:0,y:ut-7e5,cx:je,cy:7e5,fill:rt,align:"ctr",lines:[{text:(e.meta??["MSS Claw"]).join(" · "),size:11,color:ke}]})];return ft(t.join(""))}function Rr(e){const t=e.bullets.slice(0,6),s=e.layout==="metrics"?t.map((r,o)=>{const i=o%3,d=Math.floor(o/3),p=r.match(/([+-]?\d+(?:\.\d+)?%|#\d+|第\s*\d+)/),m=(p==null?void 0:p[1])||String(o+1),c=r.replace(m,"").replace(/^[:：\s-]+/,"").trim()||r,u=7e5+i*37e5,f=18e5+d*2e6;return R({x:u,y:f,cx:34e5,cy:17e5,fill:rt,lines:[{text:c.slice(0,28),size:11,color:ke},{text:m,size:28,bold:!0,color:_}]})}):t.map((r,o)=>{const i=o%2,d=Math.floor(o/2),p=7e5+i*56e5,m=17e5+d*14e5;return[R({x:p,y:m,cx:12e4,cy:12e5,fill:_}),R({x:p+12e4,y:m,cx:5e6,cy:12e5,fill:rt,lines:[{text:String(o+1).padStart(2,"0"),size:11,bold:!0,color:_},{text:r.slice(0,80),size:13,color:$e}]})].join("")}),a=[R({x:0,y:0,cx:je,cy:9e4,fill:_}),R({x:7e5,y:4e5,cx:1e7,cy:11e5,fill:"FFFFFF",lines:[{text:e.subtitle||(e.role==="agenda"?"AGENDA":"KEY POINTS"),size:11,bold:!0,color:_},{text:e.title,size:24,bold:!0,color:$e}]}),...Array.isArray(s)?s:[s]];return ft(a.flat().join(""))}function ft(e){return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</p:sld>`}function Or(e){return at=10,e.role==="cover"||e.layout==="cover"?Pr(e):e.role==="closing"||e.layout==="closing"?Cr(e):Rr(e)}const Nr=e=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</Types>`,Lr=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,_r=e=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
 saveSubsetFonts="1">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>
    ${Array.from({length:e},(t,n)=>`<p:sldId id="${256+n}" r:id="rId${n+2}"/>`).join(`
    `)}
  </p:sldIdLst>
  <p:sldSz cx="${je}" cy="${ut}" type="screen16x9"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`,Er=e=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${Array.from({length:e},(t,n)=>`<Relationship Id="rId${n+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${n+1}.xml"/>`).join(`
  `)}
  <Relationship Id="rId${e+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>`,jr=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`,$r=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</p:sldLayout>`,zr=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`,Dr=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</p:sldMaster>`,Fr=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`,Kr=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</a:theme>`;function Ur(){const e=new Date().toISOString();return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</cp:coreProperties>`}function Br(e){return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
 xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>MSS Claw</Application>
  <Slides>${e}</Slides>
</Properties>`}function Gr(e){const t=e.length?e:[{title:"空演示",bullets:[],role:"content"}],n=t.length,s={"[Content_Types].xml":P(Nr(n)),"_rels/.rels":P(Lr),"docProps/core.xml":P(Ur()),"docProps/app.xml":P(Br(n)),"ppt/presentation.xml":P(_r(n)),"ppt/_rels/presentation.xml.rels":P(Er(n)),"ppt/slideLayouts/slideLayout1.xml":P($r),"ppt/slideLayouts/_rels/slideLayout1.xml.rels":P(zr),"ppt/slideMasters/slideMaster1.xml":P(Dr),"ppt/slideMasters/_rels/slideMaster1.xml.rels":P(Fr),"ppt/theme/theme1.xml":P(Kr)};return t.forEach((a,r)=>{const o=r+1;s[`ppt/slides/slide${o}.xml`]=P(Or(a)),s[`ppt/slides/_rels/slide${o}.xml.rels`]=P(jr)}),Rn(s,{level:6})}function Wr(e,t){const n=e.toLowerCase().endsWith(".pptx")?e:`${e}.pptx`,s=Gr(t);Ar(n,s,"application/vnd.openxmlformats-officedocument.presentationml.presentation")}function kn(e){return e!=null&&e.length?e.join(" · "):"（未挂载 Skill）"}function bn(e){const t=(e??"").trim();return t?t.length>8e3?`${t.slice(0,8e3)}

…（后续内容已截断）`:t:""}function Hr(e){const t=bn(e.agentReply);return["# 任务交付报告","",`> Agent：${e.agentName||"数据分析 Agent"}  ·  Skill：${kn(e.skills)}`,"","## 任务目标","",e.query||"（未填写）","","## 执行摘要","",t||["- 拉美穿戴 SO 环比 **+8.2%**，墨西哥、阿根廷贡献主要增量","- 竞品降价对巴西影响显著，建议启动 NBA 补贴券策略","- IoT 剔除后排名稳定，渠道促销为首要归因因子"].join(`
`),"","## 下一步","","1. 复核巴西价盘与竞品价差","2. 同步渠道与代表处执行 NBA","3. 下周复盘 SO / 转化交叉指标","","---",`*生成时间：${new Date().toLocaleString("zh-CN")}*`].join(`
`)}function qr(e){var s,a;const t=bn(e.agentReply),n=((a=(s=e.kbArtifact)==null?void 0:s.citations)==null?void 0:a.slice(0,8).map((r,o)=>{var i;return`${o+1}. **${r.docTitle}** — ${((i=r.snippet)==null?void 0:i.slice(0,120))||r.docId}`}).join(`
`))||`1. 拉美合规准入指南
2. 3C 营销话术规范`;return["# 知识检索交付","",`> Agent：${e.agentName||"知识 Agent"}  ·  Skill：${kn(e.skills)}`,"","## 查询","",e.query||"（未填写）","","## 结论","",t||["- 可穿戴营销物料需避免未获批医疗功效表述","- 建议提交 MKT 合规复核后再对外发布","- 引用已按密级与可见性过滤"].join(`
`),"","## 引用来源","",n,"","---",`*生成时间：${new Date().toLocaleString("zh-CN")}*`].join(`
`)}function Vr(e,t){const n=t.query?t.query.slice(0,80):"";return`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${ue(t.title)}</title>
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
  ${br}
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
        <h1>${ue(t.title)}</h1>
        <p class="meta">${ue(t.agent)}${n?` · ${ue(n)}`:""} · Markdown 智能分析 + 正文详稿</p>
      </header>
      <div class="content">
        ${t.analysisHtml||""}
        <div class="body-detail">
          ${e}
        </div>
        <div class="footer">
          <span>智能分析看板 + Markdown 正文 · 指标与要点自动抽取</span>
          <span>${ue(new Date().toLocaleString("zh-CN"))}</span>
        </div>
      </div>
    </article>
  </div>
</body>
</html>`}function ue(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function yn(e,t){var s;const n=/^#\s+(.+)$/m.exec(e);return((s=n==null?void 0:n[1])==null?void 0:s.trim())||t}function Sn(e,t,n){const s=mr(e),a=s.replace(/^\s*<h1>[\s\S]*?<\/h1>\s*/i,""),r=yn(e,(t==null?void 0:t.type)==="knowledge"?"知识检索交付":"任务交付报告"),o=kr(e,{type:t==null?void 0:t.type,board:n??mt(e,{type:t==null?void 0:t.type})});return Vr(a||s,{title:r,agent:(t==null?void 0:t.agentName)||"Agent",query:(t==null?void 0:t.query)||"",analysisHtml:o})}function Jr(e,t){return vr(e,t)}function Yr(e,t,n){if(e==="html"){const a=Sn(t,n);return{html:a,size:`${Math.max(6,Math.round(a.length/1024))} KB`,pendingGenerate:!1}}const s=Jr(t,n);return{slides:s,size:`${Math.max(.6,s.length*.35).toFixed(1)} MB`,pendingGenerate:!1}}function jt(e){var t,n,s;return e.pendingGenerate?!1:e.kind==="markdown"?!!((t=e.markdown)!=null&&t.trim()):e.kind==="html"?!!((n=e.html)!=null&&n.trim()):e.kind==="ppt"?!!((s=e.slides)!=null&&s.length):e.kind==="xlsx"?!!e.table:e.kind==="board"||e.kind==="knowledge"}function $t(e){return e==="html"||e==="ppt"}async function Xr(e,t,n,s){var o,i;const a=t.trim();if(!a)throw new Error("请先确保 Markdown 交付件有内容");const r=Yr(e,a,n);if(e==="html"){let d=mt(a,{type:n.type});if(E())try{const m=await lr({markdown:a,agentName:n.agentName,query:n.query,type:n.type,signal:s});if(s!=null&&s.aborted)throw new Error("已取消生成");d=xr(d,m)}catch{}else await new Promise(m=>setTimeout(m,280));if(s!=null&&s.aborted)throw new Error("已取消生成");const p=Sn(a,n,d);return{html:p,size:`${Math.max(6,Math.round(p.length/1024))} KB`,pendingGenerate:!1}}if(E())try{const d=await cr({kind:"ppt",markdown:a,agentName:n.agentName,query:n.query,type:n.type,signal:s});if((o=d.slides)!=null&&o.length){const p=((i=r.slides)==null?void 0:i.length)??0;if(d.slides.length+1>=p||d.slides.length>=4){const m=xn(d.slides.map(c=>({title:c.title,bullets:c.bullets,role:"content"})),{title:yn(a,"业务汇报"),agentName:n.agentName,query:n.query,skills:n.skills});return{slides:m,size:`${Math.max(.6,m.length*.35).toFixed(1)} MB`,pendingGenerate:!1}}}}catch{}if(await new Promise(d=>setTimeout(d,280)),s!=null&&s.aborted)throw new Error("已取消生成");return r}function zt(e,t,n,s,a,r){return{id:e,kind:t,name:n,title:s,size:"待生成",icon:a,iconClass:r,pendingGenerate:!0}}function Qr(e){const t=e.type==="marketing"?Hr(e):qr(e),n=e.type==="marketing"?"m":"k";return[{id:`${n}-md`,kind:"markdown",name:"Markdown",title:"Markdown",size:`${Math.max(2,Math.round(t.length/1024))} KB`,icon:"fa-file-lines",iconClass:"text-zinc-700",markdown:t,pendingGenerate:!1},zt(`${n}-html`,"html","HTML","HTML","fa-file-code","text-orange-600"),zt(`${n}-ppt`,"ppt","PPT","PPT","fa-file-powerpoint","text-amber-600")]}function Zr(e,t=""){var n;if(e.kind==="markdown"&&e.markdown){Ce(`${e.name}.md`,e.markdown,"text/markdown;charset=utf-8");return}if(e.kind==="html"&&e.html){Ce(`${e.name}.html`,e.html,"text/html;charset=utf-8");return}if(e.kind==="ppt"&&((n=e.slides)!=null&&n.length)){Wr(e.name,e.slides);return}if(e.kind==="xlsx"&&e.table){const s=[e.table.headers.join(","),...e.table.rows.map(a=>a.join(","))].join(`
`);Ce(`${e.name}.csv`,`${s}
# ${t}`,"text/csv;charset=utf-8");return}Ce(`${e.name}.json`,JSON.stringify({id:e.id,kind:e.kind,query:t,exportedAt:new Date().toISOString()},null,2))}const h={red:"#CF0A2C",redDark:"#A10822",ink:"#1A1A1A",mute:"#595959",line:"#E5E5E5",soft:"#F7F7F7",white:"#FFFFFF"};function eo({index:e,total:t,title:n,children:s}){return l.jsxs("div",{className:"overflow-hidden rounded-lg bg-white shadow-[0_12px_32px_rgba(0,0,0,0.12)] ring-1 ring-black/5",children:[l.jsxs("div",{className:"flex items-center gap-1.5 border-b border-zinc-200 bg-[#f7f7f8] px-3 py-1.5",children:[l.jsx("span",{className:"h-2 w-2 rounded-full bg-[#ff5f57]"}),l.jsx("span",{className:"h-2 w-2 rounded-full bg-[#febc2e]"}),l.jsx("span",{className:"h-2 w-2 rounded-full bg-[#28c840]"}),l.jsxs("span",{className:"ml-2 truncate text-[10px] text-zinc-500",children:["幻灯片 ",e+1," / ",t," · ",n]})]}),l.jsx("div",{className:"relative aspect-[16/9] w-full overflow-hidden",children:s})]})}function to({slide:e}){var t;return l.jsxs("div",{className:"absolute inset-0 flex",style:{background:h.white},children:[l.jsx("div",{className:"relative w-[8%] shrink-0",style:{background:h.red},children:l.jsx("div",{className:"absolute bottom-0 left-0 h-[38%] w-full opacity-90",style:{background:`linear-gradient(160deg, ${h.redDark} 0%, ${h.red} 100%)`,clipPath:"polygon(0 35%, 100% 0, 100% 100%, 0 100%)"}})}),l.jsxs("div",{className:"relative flex min-w-0 flex-1 flex-col justify-between px-9 py-8",children:[l.jsxs("div",{className:"flex items-center justify-between",children:[l.jsx("p",{className:"text-[11px] font-semibold tracking-[0.18em]",style:{color:h.red},children:"HUAWEI STYLE · MSS CLAW"}),l.jsx("div",{className:"h-1.5 w-10",style:{background:h.red}})]}),l.jsxs("div",{className:"max-w-[90%]",children:[l.jsx("p",{className:"text-[12px] font-medium",style:{color:h.mute},children:e.subtitle||"智能交付汇报"}),l.jsx("h3",{className:"mt-3 text-[30px] font-bold leading-[1.2] tracking-tight",style:{color:h.ink},children:e.title}),l.jsx("div",{className:"mt-5 h-[3px] w-16",style:{background:h.red}}),(t=e.meta)!=null&&t.length?l.jsx("ul",{className:"mt-6 space-y-2",children:e.meta.slice(0,3).map(n=>l.jsxs("li",{className:"flex items-center gap-2 text-[12.5px]",style:{color:h.mute},children:[l.jsx("span",{className:"h-1.5 w-1.5 shrink-0 rounded-full",style:{background:h.red}}),n]},n))}):null]}),l.jsxs("div",{className:"flex items-end justify-between",children:[l.jsx("p",{className:"text-[10px]",style:{color:"#8c8c8c"},children:"Confidential · For Internal Discussion"}),l.jsxs("div",{className:"flex gap-1",children:[l.jsx("span",{className:"h-2 w-8",style:{background:h.red}}),l.jsx("span",{className:"h-2 w-3 bg-zinc-300"}),l.jsx("span",{className:"h-2 w-3 bg-zinc-200"})]})]}),l.jsx("div",{className:"pointer-events-none absolute -bottom-6 -right-4 h-36 w-36 opacity-[0.12]",style:{background:h.red,clipPath:"polygon(40% 0, 100% 0, 100% 100%, 0 100%)"}})]})]})}function no({slide:e}){var t;return l.jsxs("div",{className:"absolute inset-0 flex flex-col",style:{background:h.white},children:[l.jsx("div",{className:"h-2 w-full",style:{background:h.red}}),l.jsxs("div",{className:"relative flex flex-1 flex-col items-center justify-center px-8 text-center",children:[l.jsx("div",{className:"mb-4 h-1 w-14",style:{background:h.red}}),l.jsx("h3",{className:"text-[48px] font-bold tracking-tight",style:{color:h.ink},children:e.title||"谢谢"}),l.jsx("p",{className:"mt-2 text-[16px] font-medium tracking-[0.2em]",style:{color:h.red},children:e.subtitle||"Thank You"}),e.bullets.length?l.jsx("div",{className:"mt-8 flex flex-wrap items-center justify-center gap-3",children:e.bullets.slice(0,2).map(n=>l.jsx("span",{className:"rounded-full border px-4 py-1.5 text-[12px]",style:{borderColor:h.line,color:h.mute},children:n},n))}):null,(t=e.meta)!=null&&t.length?l.jsx("p",{className:"mt-8 text-[11px]",style:{color:"#8c8c8c"},children:e.meta.join(" · ")}):null]}),l.jsxs("div",{className:"flex h-10 items-center justify-between px-8",style:{background:h.soft},children:[l.jsx("span",{className:"text-[10px] font-semibold",style:{color:h.red},children:"MSS Claw"}),l.jsx("span",{className:"text-[10px]",style:{color:h.mute},children:"欢迎提问与讨论"})]})]})}function so({bullets:e,layout:t}){const n=e.slice(0,6);return t==="metrics"?l.jsx("div",{className:"grid min-h-0 flex-1 grid-cols-3 gap-2.5 content-start",children:n.map((s,a)=>{const r=s.match(/([+-]?\d+(?:\.\d+)?%|#\d+|第\s*\d+)/),o=(r==null?void 0:r[1])||`${a+1}`,i=s.replace(o,"").replace(/^[:：\s-]+/,"").trim()||s;return l.jsxs("div",{className:"flex flex-col justify-between rounded-xl border px-3 py-3",style:{borderColor:h.line,background:a%2===0?h.soft:h.white},children:[l.jsx("span",{className:"text-[10px] font-semibold",style:{color:h.mute},children:i.slice(0,28)}),l.jsx("span",{className:"mt-2 text-[22px] font-bold tracking-tight",style:{color:h.red},children:o})]},`${a}-${s.slice(0,16)}`)})}):t==="list"?l.jsx("ul",{className:"min-h-0 flex-1 space-y-2 overflow-hidden",children:n.map((s,a)=>l.jsxs("li",{className:"flex gap-3 rounded-lg border px-3 py-2.5",style:{borderColor:h.line,background:h.soft},children:[l.jsx("span",{className:"mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white",style:{background:h.red},children:a+1}),l.jsx("span",{className:"text-[12.5px] leading-relaxed",style:{color:h.ink},children:s})]},`${a}-${s.slice(0,16)}`))}):l.jsx("div",{className:"grid min-h-0 flex-1 grid-cols-2 gap-2.5 content-start",children:n.map((s,a)=>l.jsxs("div",{className:"relative overflow-hidden rounded-xl border px-3.5 py-3",style:{borderColor:h.line,background:h.white},children:[l.jsx("div",{className:"absolute left-0 top-0 h-full w-1",style:{background:h.red}}),l.jsxs("div",{className:"flex items-start gap-2.5 pl-1",children:[l.jsx("span",{className:"mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white",style:{background:a===0?h.red:h.ink},children:String(a+1).padStart(2,"0")}),l.jsx("p",{className:"text-[12.5px] leading-relaxed",style:{color:h.ink},children:s})]})]},`${a}-${s.slice(0,16)}`))})}function ao({slide:e,page:t,total:n}){const s=e.role==="agenda";return l.jsxs("div",{className:"absolute inset-0 flex flex-col",style:{background:h.white},children:[l.jsx("div",{className:"h-[3px] w-full",style:{background:h.red}}),l.jsxs("div",{className:"flex min-h-0 flex-1 flex-col px-7 py-5",children:[l.jsxs("div",{className:"mb-3 flex items-end justify-between gap-3 border-b pb-3",style:{borderColor:h.line},children:[l.jsxs("div",{className:"min-w-0",children:[e.subtitle||s?l.jsx("p",{className:"text-[10px] font-semibold tracking-[0.16em]",style:{color:h.red},children:e.subtitle||"AGENDA"}):l.jsx("p",{className:"text-[10px] font-semibold tracking-[0.14em]",style:{color:h.mute},children:"KEY POINTS"}),l.jsx("h3",{className:"mt-1 text-[20px] font-bold leading-snug tracking-tight",style:{color:h.ink},children:e.title})]}),l.jsx("div",{className:"h-8 w-8 shrink-0 rounded-md",style:{background:h.red}})]}),l.jsx(so,{bullets:e.bullets,layout:e.layout||"cards"}),l.jsxs("div",{className:"mt-3 flex items-center justify-between border-t pt-2 text-[10px]",style:{borderColor:h.line,color:h.mute},children:[l.jsxs("span",{children:[l.jsx("span",{className:"font-semibold",style:{color:h.red},children:"MSS Claw"}),l.jsx("span",{className:"mx-1.5 text-zinc-300",children:"|"}),"智能交付件"]}),l.jsxs("span",{children:[t," / ",n]})]})]})]})}function ro({slides:e}){return e.length?l.jsx("div",{className:w("space-y-4 rounded-xl p-3"),style:{background:"#eceff3"},children:e.map((t,n)=>l.jsx(eo,{index:n,total:e.length,title:t.title,children:t.role==="cover"||t.layout==="cover"?l.jsx(to,{slide:t}):t.role==="closing"||t.layout==="closing"?l.jsx(no,{slide:t}):l.jsx(ao,{slide:t,page:n+1,total:e.length})},`${t.role}-${t.title}-${n}`))}):l.jsx("div",{className:"rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-[12px] text-zinc-500",children:"暂无幻灯片"})}function oo(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/^### (.*)$/gm,'<h3 class="mt-3 mb-1 text-[13px] font-semibold text-zinc-900">$1</h3>').replace(/^## (.*)$/gm,'<h2 class="mt-4 mb-1.5 text-[15px] font-semibold text-zinc-900">$1</h2>').replace(/^# (.*)$/gm,'<h1 class="mb-2 text-[17px] font-bold text-zinc-900">$1</h1>').replace(/^> (.*)$/gm,'<p class="my-2 rounded-lg bg-zinc-100 px-3 py-2 text-[12px] text-zinc-600">$1</p>').replace(/^\- (.*)$/gm,'<li class="ml-4 list-disc text-[12px] leading-relaxed text-zinc-700">$1</li>').replace(/^\d+\. (.*)$/gm,'<li class="ml-4 list-decimal text-[12px] leading-relaxed text-zinc-700">$1</li>').replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\*(.*?)\*/g,"<em>$1</em>").replace(/^---$/gm,'<hr class="my-3 border-zinc-200"/>').replace(/\n\n/g,"<br/><br/>")}function io({title:e,html:t}){return l.jsx("iframe",{title:e,srcDoc:t,sandbox:"",className:"h-[min(72vh,640px)] w-full rounded-xl border border-zinc-200 bg-white"})}function lo({item:e}){return e.kind==="markdown"&&e.markdown?l.jsx("div",{className:"rounded-xl border border-zinc-200/80 bg-white p-4",dangerouslySetInnerHTML:{__html:oo(e.markdown)}}):e.kind==="html"&&e.html?l.jsx(io,{title:e.title,html:e.html}):e.kind==="ppt"&&e.slides?l.jsx(ro,{slides:e.slides}):l.jsx("div",{className:"rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-[12px] text-zinc-500",children:"暂无可预览内容"})}function gi({ready:e,type:t,query:n="",agentName:s="",skills:a=[],agentReply:r="",kbArtifact:o=null,collapsed:i,onToggleCollapse:d,onPush:p,onDeliverableDownload:m,onRunExample:c}){var kt;const u=M.useMemo(()=>e&&t?Qr({type:t,query:n,agentName:s,skills:a,agentReply:r,kbArtifact:o}):[],[e,t,n,s,a,r,o]),f=`${t}|${n}|${s}|${r.slice(0,80)}`,[y,x]=M.useState({}),[k,v]=M.useState(null),[N,We]=M.useState(null),[ht,Ie]=M.useState(null),ee=M.useRef(null);M.useEffect(()=>{var b;x({}),Ie(null),(b=ee.current)==null||b.abort(),ee.current=null,We(null)},[f]);const K=M.useMemo(()=>u.map(b=>{const te=y[b.id];return te?{...b,...te,pendingGenerate:!1}:b}),[u,y]);M.useEffect(()=>{if(!K.length){v(null);return}(!k||!K.some(b=>b.id===k))&&v(K[0].id)},[K,k]);const S=K.find(b=>b.id===k)??null,He=((kt=K.find(b=>b.kind==="markdown"))==null?void 0:kt.markdown)??"",xt=S?jt(S):!1,wn=S&&$t(S.kind)&&!xt&&!!He.trim(),vn=async()=>{var te;if(!S||!t||!$t(S.kind)||!He.trim())return;(te=ee.current)==null||te.abort();const b=new AbortController;ee.current=b,We(S.id),Ie(null);try{const ne=await Xr(S.kind,He,{type:t,query:n,agentName:s,skills:a,agentReply:r,kbArtifact:o},b.signal);if(b.signal.aborted)return;x(In=>({...In,[S.id]:{...ne,pendingGenerate:!1}}))}catch(ne){if(b.signal.aborted)return;Ie(ne instanceof Error?ne.message:"生成失败，请重试")}finally{ee.current===b&&(ee.current=null),We(ne=>ne===S.id?null:ne)}};return l.jsxs(l.Fragment,{children:[l.jsxs("section",{className:w("artifact-panel z-20 border-l border-zinc-200/80",i&&"collapsed"),children:[l.jsxs("div",{className:"glass-bar flex h-[52px] shrink-0 items-center justify-between border-b border-zinc-200/80 px-4",children:[l.jsxs("div",{className:"flex min-w-0 items-center gap-2.5",children:[l.jsx("button",{type:"button",onClick:d,className:"flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900",title:"收起交付件预览",children:l.jsx("i",{className:"fa-solid fa-chevron-right text-xs"})}),l.jsx("div",{className:"flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-700",children:l.jsx("i",{className:"fa-solid fa-file-lines text-xs"})}),l.jsx("p",{className:"truncate text-[11px] font-semibold leading-none text-zinc-900",children:"交付件预览"})]}),l.jsxs("button",{type:"button",onClick:p,disabled:!e,className:"apple-btn-primary flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40",children:[l.jsx("i",{className:"fa-solid fa-paper-plane text-[10px]"}),"推送"]})]}),e&&K.length>0&&l.jsxs("div",{className:"flex shrink-0 items-center gap-2 border-b border-zinc-200/80 bg-white px-3 py-2",children:[l.jsx("div",{className:"flex flex-1 gap-1.5 overflow-x-auto scroll-hidden",children:K.map(b=>{const te=jt(b);return l.jsxs("button",{type:"button",onClick:()=>{v(b.id),Ie(null)},className:w("flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition",k===b.id?"border-zinc-900 bg-zinc-900 text-white":"border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-white"),children:[l.jsx("i",{className:w("text-[10px]",b.icon.startsWith("fa-")?`fa-solid ${b.icon}`:b.icon,k===b.id?"text-white/80":b.iconClass)}),l.jsx("span",{className:"font-medium",children:b.name}),!te&&b.kind!=="markdown"?l.jsx("span",{className:w("rounded px-1 text-[9px]",k===b.id?"bg-white/15 text-white/70":"bg-zinc-200/80 text-zinc-500"),children:"空"}):null]},b.id)})}),S&&xt?l.jsx("button",{type:"button",onClick:()=>{Zr(S,n),m==null||m(S.name)},className:"shrink-0 rounded-lg border border-zinc-200 px-2 py-1.5 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-50",title:"下载当前交付件",children:l.jsx("i",{className:"fa-solid fa-download"})}):null]}),l.jsxs("div",{className:"relative min-h-0 flex-1 overflow-hidden p-4",children:[!e&&l.jsxs("div",{className:"flex h-full flex-col items-center justify-center",children:[l.jsx("div",{className:"canvas-empty-icon relative mb-4 flex h-20 w-20 items-center justify-center rounded-xl border border-zinc-200 shadow-sm",children:l.jsx("i",{className:"fa-solid fa-wand-magic-sparkles text-3xl text-zinc-400"})}),l.jsx("h3",{className:"mb-1.5 text-[15px] font-semibold text-zinc-900",children:"等待 Agent 交付件"}),l.jsx("p",{className:"max-w-sm text-center text-[12px] leading-relaxed text-zinc-500",children:"确认执行计划后，将先生成 Markdown；可再切换到 HTML / PPT，基于全文点击「开始生成」预览。"}),c&&l.jsxs("div",{className:"mt-4 grid w-full max-w-sm grid-cols-1 gap-1.5",children:[l.jsxs("button",{type:"button",onClick:()=>c("marketing"),className:"task-card apple-card rounded-xl p-3 text-left",children:[l.jsxs("p",{className:"flex items-center gap-2 text-[12px] font-semibold text-zinc-800",children:[l.jsx("i",{className:"fa-solid fa-chart-column text-zinc-600"}),"多源数据分析"]}),l.jsx("p",{className:"mt-0.5 text-[11px] text-zinc-500",children:"/数据分析 · 代表处 SO 排名"})]}),l.jsxs("button",{type:"button",onClick:()=>c("knowledge"),className:"task-card apple-card rounded-xl p-3 text-left",children:[l.jsxs("p",{className:"flex items-center gap-2 text-[12px] font-semibold text-zinc-800",children:[l.jsx("i",{className:"fa-solid fa-file-shield text-zinc-600"}),"文档合规筛查"]}),l.jsx("p",{className:"mt-0.5 text-[11px] text-zinc-500",children:"/合规筛查 · 医疗用语检查"})]}),l.jsxs("button",{type:"button",onClick:()=>c("warroom"),className:"task-card apple-card rounded-xl p-3 text-left",children:[l.jsxs("p",{className:"flex items-center gap-2 text-[12px] font-semibold text-zinc-800",children:[l.jsx("i",{className:"fa-solid fa-tags text-zinc-600"}),"价格监测周报"]}),l.jsx("p",{className:"mt-0.5 text-[11px] text-zinc-500",children:"/价格监测 · 18 国 offer 比对"})]})]})]}),e&&S&&l.jsxs("div",{className:"scroll-hidden h-full overflow-y-auto",children:[l.jsxs("div",{className:"mb-2 flex items-center justify-between gap-2",children:[l.jsx("p",{className:"text-[11px] font-semibold text-zinc-800",children:S.title}),l.jsx("span",{className:"text-[10px] text-zinc-400",children:S.size})]}),N===S.id?l.jsxs("div",{className:"flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-16 text-center",children:[l.jsx("i",{className:"fa-solid fa-spinner fa-spin mb-3 text-2xl text-zinc-400"}),l.jsxs("p",{className:"text-[13px] font-semibold text-zinc-800",children:["正在基于 Markdown 生成 ",S.name,"…"]}),l.jsx("p",{className:"mt-1 text-[11px] text-zinc-500",children:S.kind==="html"?E()?"模型提炼分析看板 · 本地模板排版中":"本地转写 HTML 报告中":E()?"调用 AI 模型提炼幻灯片结构":"正在按章节拆解为幻灯片"}),l.jsx("button",{type:"button",onClick:()=>{var b;return(b=ee.current)==null?void 0:b.abort()},className:"mt-4 rounded-lg border border-zinc-200 px-3 py-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50",children:"取消"})]}):wn?l.jsxs("div",{className:"flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-14 text-center",children:[l.jsx("div",{className:"mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500",children:l.jsx("i",{className:w("fa-solid text-lg",S.icon)})}),l.jsxs("p",{className:"text-[13px] font-semibold text-zinc-800",children:[S.name," 尚未生成"]}),l.jsx("p",{className:"mt-1.5 max-w-xs text-[11px] leading-relaxed text-zinc-500",children:S.kind==="html"?E()?"模型按场景提炼 KPI/发现/风险/行动，再用现有精美模板排版；正文仍完整保留 Markdown。":"将把当前 Markdown 全文排版为可预览 HTML 报告（未配置模型时走本地转写）。":`将按章节把 Markdown 拆成 16:9 幻灯片${E()?"（可调用模型提炼要点）":""}。`}),ht?l.jsx("p",{className:"mt-2 max-w-xs text-[11px] text-red-600",children:ht}):null,l.jsx("button",{type:"button",onClick:()=>void vn(),className:"apple-btn-primary mt-4 rounded-lg px-4 py-2 text-[12px] font-semibold text-white",children:"开始生成"})]}):l.jsx(lo,{item:S})]})]})]}),i&&l.jsxs("button",{type:"button",onClick:d,className:"artifact-panel-expand-tab visible flex flex-col items-center justify-center gap-1 text-[10px] font-semibold",title:"展开交付件预览",children:[l.jsx("i",{className:"fa-solid fa-file-lines text-sm"}),l.jsx("span",{style:{writingMode:"vertical-rl"},children:"预览"})]})]})}const gt="mt-1 w-full rounded-xl border border-black/8 px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-zinc-900/20";function hi({label:e,children:t,hint:n}){return l.jsxs("label",{className:"block",children:[l.jsx("span",{className:"text-[11px] font-semibold text-[#86868b]",children:e}),n&&l.jsx("p",{className:"mb-1 text-[10px] text-[#86868b]",children:n}),t]})}function xi({className:e,...t}){return l.jsx("input",{className:w(gt,e),...t})}function ki({className:e,...t}){return l.jsx("textarea",{className:w(gt,e),...t})}function bi({className:e,...t}){return l.jsx("select",{className:w(gt,e),...t})}function co({onCancel:e,onSave:t,saveLabel:n="保存",cancelFirst:s=!1}){const a=l.jsx("button",{type:"button",onClick:e,className:"rounded-xl border border-black/8 px-4 py-2 text-[12px]",children:"取消"}),r=l.jsx("button",{type:"button",onClick:t,className:"apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white",children:n});return l.jsxs(l.Fragment,{children:[s?a:r,s?r:a]})}function yi({open:e,onClose:t,warrooms:n,members:s,onConfirm:a}){const[r,o]=M.useState("warroom"),[i,d]=M.useState([]),[p,m]=M.useState([]),c=M.useMemo(()=>n.filter(x=>De(x)),[n]),u=(x,k,v)=>{v(x.includes(k)?x.filter(N=>N!==k):[...x,k])},f=()=>{if(r==="warroom"){if(!i.length)return;a({mode:"warroom",warroomIds:i})}else{if(!p.length)return;a({mode:"members",memberIds:p})}d([]),m([]),t()},y=r==="warroom"?i.length>0:p.length>0;return l.jsx(ar,{open:e,title:"推送交付物",onClose:t,size:"lg",elevate:!0,actions:l.jsx(co,{onCancel:t,onSave:()=>{y&&f()},saveLabel:y?"发送":"请先选择"}),children:l.jsxs("div",{className:"space-y-3 text-left",children:[l.jsx("p",{className:"text-[11px] leading-relaxed text-zinc-500",children:"选择协作空间或成员接收交付物通知。协作空间将写入会话记录；成员将收到「我的消息」。"}),l.jsx("div",{className:"inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5",children:[["warroom","协作空间"],["members","成员"]].map(([x,k])=>l.jsx("button",{type:"button",onClick:()=>o(x),className:w("rounded-md px-3 py-1.5 text-[11px] font-semibold transition",r===x?"bg-white text-zinc-900 shadow-sm":"text-zinc-500 hover:text-zinc-800"),children:k},x))}),r==="warroom"?l.jsx("ul",{className:"max-h-[40vh] space-y-1.5 overflow-y-auto",children:c.length===0?l.jsx("li",{className:"rounded-xl border border-dashed border-zinc-200 px-3 py-8 text-center text-[12px] text-zinc-400",children:"暂无协作空间，请先在侧栏「协作空间」中新建"}):c.map(x=>{var v;const k=i.includes(x.id);return l.jsx("li",{children:l.jsxs("label",{className:w("flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition",k?"border-zinc-900 bg-zinc-900/5":"border-zinc-200 hover:border-zinc-300"),children:[l.jsx("input",{type:"checkbox",className:"accent-claw-600",checked:k,onChange:()=>u(i,x.id,d)}),l.jsx("span",{className:"flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white",children:l.jsx("i",{className:"fa-solid fa-users text-[11px]"})}),l.jsxs("span",{className:"min-w-0 flex-1",children:[l.jsx("span",{className:"block truncate text-[12px] font-semibold text-zinc-900",children:x.title}),l.jsxs("span",{className:"text-[10px] text-zinc-400",children:[((v=x.members)==null?void 0:v.length)??0," 名成员 · 协作室"]})]})]})},x.id)})}):l.jsx("ul",{className:"max-h-[40vh] space-y-1.5 overflow-y-auto",children:s.length===0?l.jsx("li",{className:"rounded-xl border border-dashed border-zinc-200 px-3 py-8 text-center text-[12px] text-zinc-400",children:"当前工作区暂无成员"}):s.map(x=>{var v;const k=p.includes(x.id);return l.jsx("li",{children:l.jsxs("label",{className:w("flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition",k?"border-zinc-900 bg-zinc-900/5":"border-zinc-200 hover:border-zinc-300"),children:[l.jsx("input",{type:"checkbox",className:"accent-claw-600",checked:k,onChange:()=>u(p,x.id,m)}),l.jsx("span",{className:w("flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white",x.avatar||"bg-zinc-700"),children:(((v=x.name)==null?void 0:v[0])??"?").toUpperCase()}),l.jsxs("span",{className:"min-w-0 flex-1",children:[l.jsx("span",{className:"block truncate text-[12px] font-semibold text-zinc-900",children:x.name}),l.jsx("span",{className:"truncate text-[10px] text-zinc-400",children:x.email||x.id})]})]})},x.id)})})]})})}export{li as $,ai as A,ds as B,Re as C,ot as D,Uo as E,Ht as F,Bo as G,oe as H,$ as I,_s as J,ci as K,cn as L,Ha as M,E as N,Ns as O,go as P,tr as Q,vo as R,Ot as S,an as T,X as U,Ua as V,Qo as W,tt as X,it as Y,Xa as Z,ii as _,yo as a,ms as a$,$a as a0,Ko as a1,zo as a2,Ee as a3,Ce as a4,Do as a5,xs as a6,us as a7,Te as a8,os as a9,_o as aA,Lo as aB,Ro as aC,No as aD,Io as aE,Mo as aF,Po as aG,q as aH,Ao as aI,mi as aJ,as as aK,Se as aL,Go as aM,ko as aN,ho as aO,Jo as aP,Yo as aQ,Xo as aR,za as aS,ui as aT,Fo as aU,Oe as aV,hi as aW,xi as aX,ki as aY,bi as aZ,co as a_,Eo as aa,ge as ab,he as ac,w as ad,Oo as ae,nt as af,on as ag,I as ah,un as ai,ar as aj,Ho as ak,gi as al,yi as am,ua as an,Vo as ao,qo as ap,xo as aq,Ln as ar,Nn as as,rn as at,D as au,wt as av,Bt as aw,To as ax,Gt as ay,ts as az,Xe as b,ps as b0,Wo as b1,fi as b2,Zo as b3,wo as b4,jo as b5,$o as b6,ei as b7,di as b8,pi as b9,Wn as c,Co as d,we as e,gs as f,yt as g,ea as h,ys as i,Cs as j,Vt as k,O as l,A as m,Kn as n,j as o,L as p,si as q,$n as r,bo as s,ti as t,So as u,ni as v,ri as w,ze as x,De as y,oi as z};
