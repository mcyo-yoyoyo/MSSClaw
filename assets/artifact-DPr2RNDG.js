const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/platform-admin-De7qP8HS.js","assets/vendor-react-3lf4XbMO.js","assets/vendor-ZcURUwEj.js","assets/platform-workflow-C66lzsKO.js","assets/vendor-zustand-ChpNO9Ln.js","assets/page-task-Be9rRmak.js"])))=>i.map(i=>d[i]);
var kn=Object.defineProperty;var bn=(e,t,n)=>t in e?kn(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n;var ht=(e,t,n)=>bn(e,typeof t!="symbol"?t+"":t,n);import{j as l,r as A}from"./vendor-react-3lf4XbMO.js";import{c as be}from"./vendor-zustand-ChpNO9Ln.js";import{e as I,o as Y,s as g,a as ne,b as He,n as ue,c as yn,t as Sn,d as wn,f as P,z as vn}from"./vendor-ZcURUwEj.js";const In=["gtm","mkt","ecommerce","service","channel","retail","hr","quality"],An=[{id:"gtm",label:"GTM"},{id:"mkt",label:"MKT"},{id:"ecommerce",label:"电商"},{id:"service",label:"服务"},{id:"channel",label:"渠道"},{id:"retail",label:"零售"},{id:"hr",label:"HR"},{id:"quality",label:"质运"},{id:"finance",label:"财经"}],se="hq",Pe="china",Tn=[{id:se,label:"机关"},{id:"apac",label:"亚太"},{id:"mea",label:"中东非"},{id:"latam",label:"拉美"},{id:"europe",label:"欧洲"},{id:"eurasia",label:"欧亚"},{id:Pe,label:"中国区"}],fe=[...An],ge=[...Tn],ai={skill:"Skill",tool:"工具",agent:"Agent",external_tool:"外部工具",case:"场景案例",playbook:"场景方案",insight:"前沿洞察",training:"培训课件",news:"前沿洞察"},si={public:"公开可见",org:"组织内",private:"仅发布方"};let Lt=Object.fromEntries(fe.map(e=>[e.id,e.label])),jt=Object.fromEntries(ge.map(e=>[e.id,e.label]));function Pn(){Lt=Object.fromEntries(fe.map(e=>[e.id,e.label])),jt=Object.fromEntries(ge.map(e=>[e.id,e.label]))}function ri(e,t){fe.splice(0,fe.length,...e),ge.splice(0,ge.length,...t),Pn()}function xt(e){return Lt[e]??e}function qe(e){return jt[e]??e}function ii(e){return e?qe(e):"全部区域"}function Mn(e){return fe.some(t=>t.id===e)}function Cn(e){return ge.some(t=>t.id===e)}function ye(e){const t=[...new Set(((e==null?void 0:e.deptIds)??[]).filter(Mn))],n=e!=null&&e.regionId&&Cn(e.regionId)?e.regionId:null;return{deptIds:t,regionId:n}}function oi(e){const t=new Map(In.map((n,a)=>[n,a]));return[...e].sort((n,a)=>{const s=t.has(n)?t.get(n):1e3+n.charCodeAt(0),r=t.has(a)?t.get(a):1e3+a.charCodeAt(0);return s!==r?s-r:xt(n).localeCompare(xt(a),"zh-CN")})}function li(e){const t=new Set(e),n=[];t.has(se)&&n.push(se);const a=e.filter(s=>s!==se&&s!==Pe).sort((s,r)=>qe(s).localeCompare(qe(r),"zh-CN"));return n.push(...a),t.has(Pe)&&n.push(Pe),n}function Rn(e,t){return t.length?t.some(n=>n===se?!e||e===se:e===n):!0}function ci(e,t){return!e||Rn(e,t)}const Et="mssclaw_api",Nn="mssclaw_api_auth";function On(){return!0}function _t(e){return e==="localhost"||e==="127.0.0.1"||e==="[::1]"}function Ln(e){try{const t=new URL(e);return _t(t.hostname)}catch{return/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(e)}}function jn(){var e;if(typeof localStorage<"u"){const t=(e=localStorage.getItem(Et))==null?void 0:e.trim();if(t){const n=t.replace(/\/$/,"");return Ln(n)&&typeof location<"u"&&!_t(location.hostname)?"":n}}return""}function N(){return!1}function di(){typeof localStorage>"u"||localStorage.removeItem(Et)}function En(){var e;if(typeof localStorage<"u"){const t=(e=localStorage.getItem(Nn))==null?void 0:e.trim();if(t)return t}return""}function V(){var n;const e={},t=En();t&&(e["X-API-Key"]=t);try{const a=typeof sessionStorage<"u"?(n=sessionStorage.getItem("mssclaw_auth_token"))==null?void 0:n.trim():"";a&&(e.Authorization=`Bearer ${a}`,e["X-Session-Token"]=a)}catch{}return e}function T(e){const t=jn(),n=e.startsWith("/")?e:`/${e}`;return t?`${t}${n}`:n}async function je(e,t={},n=8e3){const a=new AbortController,s=setTimeout(()=>a.abort(),n);try{return await fetch(e,{...t,signal:a.signal})}finally{clearTimeout(s)}}const _n="modulepreload",$n=function(e){return"/MSSClaw/"+e},kt={},Ne=function(t,n,a){let s=Promise.resolve();if(n&&n.length>0){let i=function(d){return Promise.all(d.map(m=>Promise.resolve(m).then(c=>({status:"fulfilled",value:c}),c=>({status:"rejected",reason:c}))))};document.getElementsByTagName("link");const o=document.querySelector("meta[property=csp-nonce]"),p=(o==null?void 0:o.nonce)||(o==null?void 0:o.getAttribute("nonce"));s=i(n.map(d=>{if(d=$n(d),d in kt)return;kt[d]=!0;const m=d.endsWith(".css"),c=m?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${d}"]${c}`))return;const u=document.createElement("link");if(u.rel=m?"stylesheet":_n,m||(u.as="script"),u.crossOrigin="",u.href=d,p&&u.setAttribute("nonce",p),document.head.appendChild(u),m)return new Promise((f,y)=>{u.addEventListener("load",f),u.addEventListener("error",()=>y(new Error(`Unable to preload CSS for ${d}`)))})}))}function r(i){const o=new Event("vite:preloadError",{cancelable:!0});if(o.payload=i,window.dispatchEvent(o),!o.defaultPrevented)throw i}return s.then(i=>{for(const o of i||[])o.status==="rejected"&&r(o.reason);return t().catch(r)})},_="ws-cn-marketing",zn=I(["super_admin","capability_ops","business_user","viewer"]);function $t(e){switch(e){case"super_admin":case"workspace_admin":return"super_admin";case"capability_ops":case"developer":return"capability_ops";case"business_user":return"business_user";case"viewer":return"viewer";default:return"business_user"}}I(["none","read","execute","write","admin"]);I(["chat","prompt","skill","workflow","agent","knowledge","tool","memory","settings"]);Y({id:g(),name:g(),email:g(),role:zn,avatar:g(),lastActive:g(),status:I(["active","invited","suspended"]),deptIds:ne(g()).optional(),regionId:g().nullable().optional()});const pi={super_admin:"平台运营",capability_ops:"能力开发",business_user:"业务用户",viewer:"只读访客"},mi={super_admin:"平台运营：可查看/创建全部 Skill 与治理配置（租户/门户/展示/组织权限）",capability_ops:"能力开发：配置 Agent/Skill/工具。短期不做组织数据权限；后续可按「公开可见 / 组织内」限制 MSS 集市 Agent/Skill",business_user:"业务壳：工作平台（找案例/做任务/任务记录）；左侧领域/区域菜单全量可见，作浏览筛选",viewer:"业务壳：工作平台以找案例为主；左侧领域/区域菜单全量可见，作浏览筛选"},ui=["capability_ops","business_user","viewer"],fi={active:"已激活",invited:"待激活",suspended:"已停用"},gi={none:"—",read:"R",execute:"Execute",write:"Write",admin:"Admin"},hi={none:"bg-slate-100 text-slate-400",read:"bg-blue-50 text-blue-600",execute:"bg-emerald-50 text-emerald-600",write:"bg-amber-50 text-amber-700",admin:"bg-indigo-50 text-indigo-700"},Dn={chat:"admin",prompt:"admin",skill:"admin",workflow:"admin",agent:"admin",knowledge:"admin",tool:"admin",memory:"admin",settings:"admin"};function Fn(e,t,n){return{super_admin:{...Dn},capability_ops:e,business_user:t,viewer:n}}const Kn=Fn({chat:"execute",prompt:"write",skill:"write",workflow:"write",agent:"write",knowledge:"write",tool:"write",memory:"write",settings:"read"},{chat:"execute",prompt:"read",skill:"execute",workflow:"execute",agent:"read",knowledge:"read",tool:"read",memory:"read",settings:"none"},{chat:"read",prompt:"read",skill:"read",workflow:"read",agent:"read",knowledge:"read",tool:"none",memory:"none",settings:"none"});function xi(e){return Kn}const ki={chat:"Chat",prompt:"Prompt",skill:"Skill",workflow:"Workflow",agent:"Agent",knowledge:"Knowledge",tool:"Tool",memory:"Memory",settings:"Settings"},zt=[{id:"u-mcyo",name:"Mcyo",email:"mcyo@huawei.com",role:"super_admin",avatar:"bg-indigo-600",lastActive:"刚刚",status:"active",deptIds:["quality"],regionId:null},{id:"u-jacky",name:"Jacky",email:"jacky@huawei.com",role:"capability_ops",avatar:"bg-teal-600",lastActive:"1 小时前",status:"active",deptIds:["quality"],regionId:null},{id:"u-dickson",name:"Dickson",email:"dickson@huawei.com",role:"business_user",avatar:"bg-amber-500",lastActive:"今天",status:"active",deptIds:["gtm"],regionId:"apac"},{id:"u-somebody",name:"Somebody",email:"somebody@huawei.com",role:"viewer",avatar:"bg-slate-500",lastActive:"昨天",status:"active",deptIds:["mkt"],regionId:"europe"}],Bn=[_,"ws-apac","ws-3c-latam","ws-mea","ws-eurasia","ws-europe"],Dt=Object.fromEntries(Bn.map(e=>[e,zt.map(t=>({...t,deptIds:[...t.deptIds??[]]}))]));function bi(e){return Dt[e]??zt.map(t=>({...t}))}function yi(e){return{super_admin:"bg-red-50 text-red-700 border-red-200",capability_ops:"bg-blue-50 text-blue-700 border-blue-200",business_user:"bg-emerald-50 text-emerald-700 border-emerald-200",viewer:"bg-slate-100 text-slate-600 border-slate-200"}[e]}function Si(e){return e==="org"?"members":e==="rbac"?"roles":e}const wi=[{id:"members",label:"成员",icon:"fa-users",hint:"添加 · 导入 · 改角色"},{id:"roles",label:"角色",icon:"fa-user-shield",hint:"看权限矩阵"},{id:"depts",label:"部门",icon:"fa-building",hint:"部门 · 区域字典"},{id:"audit",label:"审计",icon:"fa-clipboard-list",hint:"操作日志"}],Un="mssclaw",ve={super_admin:4,capability_ops:3,business_user:2,viewer:1},Wn=new Set(["mcyo@huawei.com","mcyo@company.com"]);function bt(e){return e.trim().replace(/@company\.com$/i,"@huawei.com")}function Gn(e,t){return ye({deptIds:[...e.deptIds,...t.deptIds],regionId:e.regionId??t.regionId})}function Hn(e){return ye({deptIds:e.deptIds??[],regionId:e.regionId??null})}function qn(){return[]}function Jn(){const e=new Map,t=(n,a)=>{const s=bt(n.email).toLowerCase();if(!s)return;const r=$t(n.role),i=Wn.has(s)?"super_admin":r,o=Hn(n),p=bt(n.email),d=e.get(s);if(!d){e.set(s,{id:n.id,name:n.name,email:p,platformRole:i,avatar:n.avatar,status:n.status,workspaceIds:a?[a]:[],deptIds:o.deptIds,regionId:o.regionId??null});return}n.status==="active"&&d.status!=="active"&&(d.status="active"),ve[i]>ve[d.platformRole]&&(d.platformRole=i),a&&!d.workspaceIds.includes(a)&&d.workspaceIds.push(a);const m=Gn({deptIds:d.deptIds,regionId:d.regionId},o);d.deptIds=m.deptIds,d.regionId=m.regionId??null,a===_&&(d.id=n.id,d.name=n.name,d.avatar=n.avatar)};return Object.entries(Dt).forEach(([n,a])=>{a.forEach(s=>t(s,n))}),qn().forEach(n=>t(n)),[...e.values()].sort((n,a)=>{const s=ve[a.platformRole]-ve[n.platformRole];return s!==0?s:n.name.localeCompare(a.name,"zh-CN")})}async function Yn(e,t){const n=e.trim().toLowerCase();if(!n)return{ok:!1,error:"请输入邮箱账号"};if(!t)return{ok:!1,error:"请输入密码"};const a=Jn().find(p=>p.email.toLowerCase()===n);if(!a)return{ok:!1,error:"账号不存在，请使用组织权限中的邮箱登录"};if(a.status==="invited")return{ok:!1,error:"该成员尚未激活，请联系管理员完成邀请"};if(a.status==="suspended")return{ok:!1,error:"账号已停用，无法登录"};const{loadAuthPolicy:s,verifyAccountPassword:r}=await Ne(async()=>{const{loadAuthPolicy:p,verifyAccountPassword:d}=await import("./platform-admin-De7qP8HS.js").then(m=>m.b);return{loadAuthPolicy:p,verifyAccountPassword:d}},__vite__mapDeps([0,1,2,3,4,5])),i=s(),o=await r(n,t);return o==="match"?{ok:!0,account:a}:o==="mismatch"?{ok:!1,error:"密码错误"}:i.allowDemoPassword&&t===Un?{ok:!0,account:a}:i.allowDemoPassword?{ok:!1,error:"密码错误"}:{ok:!1,error:"该账号尚未设置密码，请联系平台运营在「组织权限」中配置"}}function Vn(e){return!e||e==="business_user"||e==="viewer"?"business":"ops"}function Xn(e){return Vn(e)}function Qn(e){return e==="agents"||e==="skills"||e==="tools"||e==="office-scenes"||e==="memory"||e==="kb"||e==="prompts"||e==="automation"||e==="workflow"||e==="portal-ops"||e==="model-ops"||e==="executions"||e==="approvals"||e==="admin"||e==="presentation"||e==="workspace-config"||e==="agent-studio"}const oe=be((e,t)=>({perspective:"business",hydrate:n=>{e({perspective:Xn(n)})},ensureOpsForView:n=>{t().perspective==="ops"&&Qn(n)}})),Je="mssclaw_auth_token";let le=0;function Zn(){try{return sessionStorage.getItem(Je)}catch{return null}}function Ie(e){try{e?sessionStorage.setItem(Je,e):sessionStorage.removeItem(Je)}catch{}}function ea(e){const t=ye({deptIds:e.deptIds,regionId:e.regionId});return{id:e.id,name:e.name,email:e.email,platformRole:e.platformRole,avatar:e.avatar,deptIds:t.deptIds,regionId:t.regionId??null}}function yt(e){const t=ye({deptIds:e.deptIds??[],regionId:e.regionId??null});return{id:e.id,name:e.name,email:e.email,platformRole:$t(e.platformRole),avatar:e.avatar||"bg-zinc-900",deptIds:t.deptIds,regionId:t.regionId??null}}const Ee=be((e,t)=>({user:null,isAuthenticated:!1,bootstrapped:!1,hydrateFromServer:async()=>{const n=++le;if(!Zn()||!N()){e({bootstrapped:!0});return}const s=L.getState().workspaceId||"ws-mss-ai";try{const r=await Ns(s);if(n!==le)return;if(r.ok){const i=yt(r.user);oe.getState().hydrate(i.platformRole),e({user:i,isAuthenticated:!0,bootstrapped:!0});return}}catch{if(n!==le)return;e({bootstrapped:!0});return}if(n===le){if(Ie(null),t().isAuthenticated&&t().user){e({bootstrapped:!0});return}oe.getState().hydrate(void 0),e({user:null,isAuthenticated:!1,bootstrapped:!0})}},login:async(n,a)=>{const s=L.getState().workspaceId||"ws-mss-ai";le+=1;const r=L.getState().apiStatus;if(N()&&r!=="unreachable"&&r!=="local-demo")try{const d=await Rs({email:n,password:a,workspaceId:s});if(d.ok&&d.token){Ie(d.token);const m=yt(d.user);return oe.getState().hydrate(m.platformRole),L.setState({apiConnected:!0,apiStatus:"connected"}),e({user:m,isAuthenticated:!0,bootstrapped:!0}),{ok:!0}}if(d.ok===!1){const m=d.error||"登录失败";if(/密码|账号|不存在|停用|尚未|未激活/.test(m)&&!/\b40[45]\b/.test(m))return{ok:!1,error:m}}}catch{L.setState({apiConnected:!1,apiStatus:"unreachable"})}const o=await Yn(n,a);if(!o.ok)return{ok:!1,error:o.error};Ie(null);const p=ea(o.account);return oe.getState().hydrate(p.platformRole),e({user:p,isAuthenticated:!0,bootstrapped:!0}),{ok:!0}},logout:()=>{const n=L.getState().workspaceId||"ws-mss-ai";Os(n),Ie(null),oe.getState().hydrate(void 0),e({user:null,isAuthenticated:!1})},getUserId:()=>{var n;return((n=t().user)==null?void 0:n.id)??""},getUserName:()=>{var n;return((n=t().user)==null?void 0:n.name)??""},getPlatformRole:()=>{var n;return((n=t().user)==null?void 0:n.platformRole)??"viewer"},getOrgAffiliation:()=>{var n,a;return ye({deptIds:((n=t().user)==null?void 0:n.deptIds)??[],regionId:((a=t().user)==null?void 0:a.regionId)??null})}}));function _e(){return Ee.getState().getUserId()}function ta(){return Ee.getState().getUserName()}function Ft(){return Ee.getState().getPlatformRole()}function tt(){return Ee.getState().getOrgAffiliation()}function na(){return tt().deptIds}function aa(){return tt().regionId??null}function sa(e){return(e??Ft())==="super_admin"}const vi=Object.freeze(Object.defineProperty({__proto__:null,getCurrentDeptIds:na,getCurrentOrgAffiliation:tt,getCurrentPlatformRole:Ft,getCurrentRegionId:aa,getCurrentUserId:_e,getCurrentUserName:ta,isSystemAdmin:sa},Symbol.toStringTag,{value:"Module"})),ra=I(["user","agent","other","system","typing","plan","step"]),ia=Y({role:ra,text:g().optional(),name:g().optional(),avatar:g().optional(),streaming:He().optional(),planId:g().optional(),steps:ne(g()).optional(),awaitingApproval:He().optional(),mountedSkills:ne(g()).optional(),stepId:g().optional(),index:ue().optional(),total:ue().optional(),label:g().optional(),stepStatus:I(["pending","running","done"]).optional()}),oa=Y({id:g(),title:g(),type:I(["bot","group"]),icon:g(),color:g(),status:g(),history:ne(ia),prompts:ne(g()),sessionGroup:I(["pinned","agents"]).optional(),iconBg:g().optional(),badge:g().optional(),agentId:g().optional(),actionType:I(["marketing","knowledge"]).optional(),taskSource:I(["skill","expert","case_demo","embedded","other"]).optional(),businessScenarioId:I(["S1","S2","S3","S4","S5","S6","S7","S8"]).optional(),skillId:g().optional(),ownerUserId:g().optional(),ownerEmail:g().optional(),createdAt:ue().optional(),pinnedAt:ue().optional(),adminId:g().optional(),members:ne(Y({id:g(),name:g(),email:g().optional(),avatar:g().optional(),role:I(["admin","member"]),canUseAi:He().default(!0)})).optional()});function $e(e){return e.type==="group"||e.sessionGroup==="pinned"}function Ii(e,t){var a;const n=_e();return $e(e)?e.adminId?e.adminId===n:((a=e.members)==null?void 0:a.some(s=>s.id===n&&s.role==="admin"))??!1:!1}function Ai(e,t){var s;const n=_e();if(!$e(e)||!((s=e.members)!=null&&s.length))return!0;const a=e.members.find(r=>r.id===n);return(a==null?void 0:a.canUseAi)!==!1}function Ti(e,t){if($e(e))return!1;const n=(t??_e()).trim();return n?e.ownerUserId===n:!1}const la=new Set(["marketing","knowledge","smoke_task","test_task"]);function Pi(e){return!!(e.id.startsWith("task_")||e.id.startsWith("warroom_")||la.has(e.id)||e.sessionGroup==="agents"||!e.sessionGroup&&e.type==="bot")}I(["chat","agent","prompt","skill","tool","workflow","knowledge","memory","settings"]);const Mi=Y({skill:g(),time:g(),label:g(),detail:g()});const ca=[{id:"agent-marketing",primarySkillId:"skill-data-analysis",agentType:"marketing",systemPrompt:"你是 MSS 营销 Agent，面向业务的问数、问报告与智能分析专家。优先编排：多源数据分析 → SO/零售洞察 → 价格与异动解释 → 行动建议与简报。口径不清时先声明假设。标注演示样例。",demoPrompt:"@营销 Agent 请基于演示样例做一次智能分析：近一周欧洲穿戴销售趋势、代表处排名异动，并输出可进例会的简报与三条行动建议（可衔接 /数据分析、/so报表）。",planSteps:["澄清问数/问报告目标与口径","挂载数据分析并汇总关键指标（/数据分析）","对齐 SO/零售报表并标注异常（/so报表、零售洞察）","输出洞察结论、风险与行动建议简报"],mockReport:`✅ **营销 Agent 完成**（演示样例）

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

评分：话术 4/5 · 价值塑造 3/5。先共情再对比，补充以旧换新钩子。`}],da=new Map(ca.map(e=>[e.id,e]));function pa(e){return e?da.get(e)??null:null}const ma=[{id:"agent-marketing",name:"营销 Agent",desc:"【业务专家】AI 问数、问报告与智能分析：销售/渠道/零售数据洞察与行动建议（编排多技能）",category:"manage",bizLine:"GTM/MKT/渠道",homeTag:"gtm",ownerDeptIds:["gtm","mkt","channel","retail","ecommerce"],ownerRegionIds:["china","apac","mea","latam","europe","eurasia"],author:"华为 MSS",published:!0,invokes:5200,updatedAt:"2026-08-12",skillIds:["skill-data-analysis","skill-so-report","skill-weekly-report","skill-retail-insight","skill-price-monitor","skill-work-summary"],chatId:"marketing",icon:"fa-chart-line",color:"from-zinc-800 to-zinc-950",scenarioTags:["问数","报表","分析","营销","SO"]},{id:"agent-data-analysis",name:"数据分析 Agent",desc:"【办公提效】多源数据自动分析，融合 ISRP/零售/电商数据输出洞察报表（可对话编排 Skill）",category:"office",bizLine:"GTM/渠道",homeTag:"gtm",ownerDeptIds:["gtm","channel"],ownerRegionIds:["latam","mea","eurasia","china"],author:"华为 MSS",published:!0,invokes:4280,updatedAt:"2026-08-05",skillIds:["skill-data-analysis","skill-so-report","skill-work-summary"],chatId:"marketing",icon:"fa-chart-pie",color:"from-zinc-700 to-zinc-900",scenarioTags:["综履","结算","返利","SO"]},{id:"agent-doc-review",name:"文档解读 Agent",desc:"【办公提效】营销物料/合同/招投标文档内容正确性、风险与合规筛查（可对话编排 Skill）",category:"office",bizLine:"MKT/质量与运营",homeTag:"mkt",ownerDeptIds:["mkt","quality"],ownerRegionIds:["europe"],author:"华为 MSS",published:!0,invokes:3150,updatedAt:"2026-07-28",skillIds:["skill-doc-compliance","skill-doc-gen","skill-doc-parser"],chatId:"knowledge",icon:"fa-file-shield",color:"from-stone-500 to-zinc-700",scenarioTags:["办公提效","平台","合规","质量与运营"]},{id:"agent-file-organize",name:"文件整理 Agent",desc:"【办公提效】本地文件夹/员工助手/Email 多源文件清洗归档与个人总结（可对话编排 Skill）",category:"office",bizLine:"HR",homeTag:"hr",ownerDeptIds:["hr"],author:"华为 MSS",published:!0,invokes:1890,updatedAt:"2026-06-18",skillIds:["skill-file-archive","skill-work-summary","skill-doc-parser"],chatId:"marketing",icon:"fa-folder-tree",color:"from-slate-600 to-slate-800",scenarioTags:["知识","归档"]},{id:"agent-ppt",name:"PPT 生成 Agent",desc:"【办公提效】多源数据驱动 PPT 自动生成，支持员工助手内部 POC 验证（可对话编排 Skill）",category:"office",bizLine:"MKT/GTM",homeTag:"mkt",ownerDeptIds:["mkt","gtm"],ownerRegionIds:["latam"],author:"华为 MSS",published:!0,invokes:2240,updatedAt:"2026-07-09",skillIds:["skill-ppt-gen","skill-data-analysis","skill-doc-gen"],chatId:"marketing",icon:"fa-file-powerpoint",color:"from-neutral-500 to-zinc-700",scenarioTags:["办公提效","PPT","平台"]},{id:"agent-meeting",name:"会议纪要 Agent",desc:"【办公提效】会议纪要 AI 自动生成，小批量试点 60% AI + 40% 人工（可对话编排 Skill）",category:"office",bizLine:"HR",homeTag:"hr",ownerDeptIds:["hr"],author:"华为 MSS",published:!0,invokes:5340,updatedAt:"2026-08-14",skillIds:["skill-meeting-minutes","skill-doc-gen","skill-wecom"],chatId:"marketing",icon:"fa-clipboard-list",color:"from-slate-500 to-zinc-700",scenarioTags:["办公提效","会议","平台"]},{id:"agent-launch-sentiment",name:"舆情快报 Agent",desc:"【管理提效】产品发布舆情 AI 分析快报，面向 MKT/服务（可对话编排 Skill）",category:"manage",bizLine:"MKT/服务",homeTag:"mkt",ownerDeptIds:["mkt","service"],ownerRegionIds:["europe"],author:"华为 MSS",published:!0,invokes:1420,updatedAt:"2026-06-30",skillIds:["skill-launch-sentiment","skill-doc-gen","skill-wecom"],chatId:"marketing",icon:"fa-bullhorn",color:"from-zinc-600 to-zinc-800"},{id:"agent-survey",name:"问卷洞察 Agent",desc:"【管理提效】洞察部用户问卷调研设计与开放题洞察分析（可对话编排 Skill）",category:"manage",bizLine:"MKT",homeTag:"mkt",ownerDeptIds:["mkt"],author:"华为 MSS",published:!0,invokes:980,updatedAt:"2026-05-22",skillIds:["skill-survey-insight","skill-data-analysis","skill-doc-gen"],chatId:"marketing",icon:"fa-square-poll-vertical",color:"from-stone-500 to-zinc-600"},{id:"agent-review-collect",name:"评分采集 Agent",desc:"【管理提效】采集 Amazon 等平台 3C 商品购买页用户订单评论，清洗后交接翻译链路（可对话编排 Skill）",category:"manage",bizLine:"电商/服务",homeTag:"ecommerce",ownerDeptIds:["ecommerce","service"],ownerRegionIds:["apac","europe","latam"],author:"华为 MSS",published:!0,invokes:2100,updatedAt:"2026-07-16",skillIds:["skill-review-collect","skill-review-translate","skill-data-analysis"],chatId:"knowledge",icon:"fa-download",color:"from-emerald-700 to-slate-800",scenarioTags:["评论分析","评论","电商"]},{id:"agent-review-translate",name:"语种翻译 Agent",desc:"【管理提效】将采集的多语种订单评论统一翻译成英语与中文，保留原文对照（可对话编排 Skill）",category:"manage",bizLine:"电商/服务",homeTag:"ecommerce",ownerDeptIds:["ecommerce","mkt","service"],ownerRegionIds:["apac","europe","latam"],author:"华为 MSS",published:!0,invokes:1960,updatedAt:"2026-07-02",skillIds:["skill-review-translate","skill-review-cluster","skill-doc-gen"],chatId:"knowledge",icon:"fa-language",color:"from-sky-600 to-slate-700",scenarioTags:["评论分析","评论","电商","翻译","本地化","小语种"]},{id:"agent-review",name:"评论分析 Agent",desc:"【管理提效】对采集清洗并完成中英翻译的订单评论做情感判断与用户数据挖掘，面向电商/服务/MKT",category:"manage",bizLine:"电商/服务",homeTag:"ecommerce",ownerDeptIds:["ecommerce","service","mkt"],ownerRegionIds:["apac","europe"],author:"华为 MSS",published:!0,invokes:2780,updatedAt:"2026-07-21",skillIds:["skill-review-cluster","skill-data-analysis","skill-doc-gen"],chatId:"knowledge",icon:"fa-comments",color:"from-slate-500 to-slate-700",scenarioTags:["评论分析","评论","电商"]},{id:"agent-retail-insight",name:"零售洞察 Agent",desc:"【管理提效】零售信息洞察 π 例行报告，门店 DOS/转化/陈列分析（可对话编排 Skill）",category:"manage",bizLine:"零售/电商",homeTag:"retail",ownerDeptIds:["retail","ecommerce"],ownerRegionIds:["latam","eurasia","china"],author:"华为 MSS",published:!0,invokes:3680,updatedAt:"2026-08-08",skillIds:["skill-retail-insight","skill-so-report","skill-doc-gen"],chatId:"marketing",icon:"fa-store",color:"from-neutral-600 to-zinc-800"},{id:"agent-price-monitor",name:"价格监测 Agent",desc:"【管理提效】18 国多渠道价格 & offer 监测，覆盖 5347 行/周级入表（可对话编排 Skill）",category:"manage",bizLine:"渠道/电商/GTM",homeTag:"gtm",ownerDeptIds:["gtm","channel","ecommerce"],ownerRegionIds:["china","apac","mea","latam","europe","eurasia"],author:"华为 MSS",published:!0,invokes:4120,updatedAt:"2026-08-11",skillIds:["skill-price-monitor","skill-data-analysis","skill-wecom"],chatId:"marketing",icon:"fa-tags",color:"from-emerald-800 to-emerald-900",scenarioTags:["价格监测","offer","价格"]},{id:"agent-hr-resume",name:"简历筛选 Agent",desc:"【流程提效】JD 解析 + 简历筛选 + 面试分析三 Agent 协同，面向 HR/用人部门（可对话编排 Skill）",category:"process",bizLine:"HR",homeTag:"hr",ownerDeptIds:["hr"],author:"华为 MSS",published:!0,invokes:1560,updatedAt:"2026-06-06",skillIds:["skill-jd-parser","skill-resume-screen","skill-interview-analysis"],chatId:"knowledge",icon:"fa-user-check",color:"from-stone-600 to-zinc-800",scenarioTags:["招聘","HR","面试","简历","JD"]},{id:"agent-training",name:"培训内容 Agent",desc:"【流程提效】Nova 新品培训内容生成，多 Agent 对抗协同与门店陪练衔接（可对话编排 Skill）",category:"process",bizLine:"零售/门店",homeTag:"retail",ownerDeptIds:["retail"],ownerRegionIds:["apac"],author:"华为 MSS",published:!0,invokes:1890,updatedAt:"2026-06-24",skillIds:["skill-training-gen","skill-retail-coach","skill-doc-gen"],chatId:"knowledge",icon:"fa-graduation-cap",color:"from-slate-600 to-zinc-700",scenarioTags:["门店","培训"]},{id:"agent-knowledge",name:"知识 Agent",desc:"【业务专家】知识问答与知识陪练：制度/SOP/案例检索问答，并可开展话术与培训陪练（编排多技能）",category:"experience",bizLine:"服务/质量与运营/零售",homeTag:"service",ownerDeptIds:["service","quality","retail","hr"],ownerRegionIds:["china","apac","mea","latam","europe","eurasia"],author:"华为 MSS",published:!0,invokes:3520,updatedAt:"2026-08-01",skillIds:["skill-rag","skill-rerank","skill-knowledge-digest","skill-complaint-sop","skill-frontline-script","skill-retail-coach","skill-training-gen"],chatId:"knowledge",icon:"fa-book-open",color:"from-zinc-600 to-zinc-800",scenarioTags:["知识","RAG","SOP","检索","客诉"]},{id:"agent-retail-coach",name:"零售陪练 Agent",desc:"【体验提升】门店 AI 陪练、卖点演练与考核反馈，衔接培训内容 Agent（可对话编排 Skill）",category:"experience",bizLine:"零售/门店",homeTag:"retail",ownerDeptIds:["retail"],ownerRegionIds:["apac"],author:"华为 MSS",published:!0,invokes:860,updatedAt:"2026-05-15",skillIds:["skill-retail-coach","skill-training-gen","skill-wecom"],chatId:"knowledge",icon:"fa-headset",color:"from-zinc-700 to-zinc-900",scenarioTags:["门店","培训","Nova","陪练"]}];function ua(e){const t=pa(e.id);return t?{...e,systemPrompt:t.systemPrompt,primarySkillId:t.primarySkillId,demoPrompt:t.demoPrompt,planSteps:[...t.planSteps]}:e}const nt=ma.map(ua),fa=new Map(nt.map(e=>[e.id,e]));function Ci(e){return e.map(t=>{var s,r;const n=fa.get(t.id);if(!n)return t;const a={};return!t.updatedAt&&n.updatedAt&&(a.updatedAt=n.updatedAt),!((s=t.capabilityTypeIds)!=null&&s.length)&&((r=n.capabilityTypeIds)!=null&&r.length)&&(a.capabilityTypeIds=n.capabilityTypeIds),Object.keys(a).length?{...t,...a}:t})}const ga={"skill-data-analysis":{ownerDeptIds:["gtm"],ownerRegionId:"apac"},"skill-doc-gen":{ownerDeptIds:["mkt"],ownerRegionId:null},"skill-doc-compliance":{ownerDeptIds:["quality"],ownerRegionId:"europe"},"skill-file-archive":{ownerDeptIds:["hr"],ownerRegionId:null},"skill-ppt-gen":{ownerDeptIds:["mkt"],ownerRegionId:null},"skill-meeting-minutes":{ownerDeptIds:["hr"],ownerRegionId:null},"skill-work-summary":{ownerDeptIds:["hr"],ownerRegionId:null},"skill-doc-parser":{ownerDeptIds:["mkt"],ownerRegionId:null},"skill-launch-sentiment":{ownerDeptIds:["mkt"],ownerRegionId:"europe"},"skill-survey-insight":{ownerDeptIds:["mkt"],ownerRegionId:null},"skill-review-collect":{ownerDeptIds:["ecommerce"],ownerRegionId:"apac"},"skill-review-translate":{ownerDeptIds:["ecommerce"],ownerRegionId:"apac"},"skill-review-cluster":{ownerDeptIds:["ecommerce"],ownerRegionId:"apac"},"skill-retail-insight":{ownerDeptIds:["retail"],ownerRegionId:"latam"},"skill-price-monitor":{ownerDeptIds:["gtm"],ownerRegionId:"apac"},"skill-so-report":{ownerDeptIds:["gtm"],ownerRegionId:"apac"},"skill-jd-parser":{ownerDeptIds:["hr"],ownerRegionId:null},"skill-resume-screen":{ownerDeptIds:["hr"],ownerRegionId:null},"skill-interview-analysis":{ownerDeptIds:["hr"],ownerRegionId:null},"skill-training-gen":{ownerDeptIds:["retail"],ownerRegionId:"apac"},"skill-rag":{ownerDeptIds:["service"],ownerRegionId:null},"skill-rerank":{ownerDeptIds:["service"],ownerRegionId:null},"skill-retail-coach":{ownerDeptIds:["retail"],ownerRegionId:"apac"},"skill-complaint-sop":{ownerDeptIds:["service"],ownerRegionId:"eurasia"},"skill-wecom":{ownerDeptIds:["service"],ownerRegionId:null},"skill-l10n-localize":{ownerDeptIds:["mkt"],ownerRegionId:"mea"},"skill-sales-copy":{ownerDeptIds:["mkt"],ownerRegionId:null},"skill-frontline-script":{ownerDeptIds:["service"],ownerRegionId:null},"skill-knowledge-digest":{ownerDeptIds:["service"],ownerRegionId:null},"skill-weekly-report":{ownerDeptIds:["gtm"],ownerRegionId:"apac"},"skill-comp-brief":{ownerDeptIds:["gtm"],ownerRegionId:"apac"},"skill-channel-brief":{ownerDeptIds:["channel"],ownerRegionId:"china"},"skill-email-draft":{ownerDeptIds:["mkt"],ownerRegionId:null}};function ha(e){if(e!=null&&e.length)return[e[0]]}function xa(e){return e.map(t=>ka(t))}function ka(e){const t=ga[e.id];if(t){const a=t.ownerRegionId??null;return{...e,sourceType:e.sourceType??"internal",visibility:"org",ownerDeptIds:[...t.ownerDeptIds],ownerRegionId:a,ownerRegionIds:a?[a]:[],featuredInDoTask:typeof e.featuredInDoTask=="boolean"?e.featuredInDoTask:void 0,featuredInMssMarket:typeof e.featuredInMssMarket=="boolean"?e.featuredInMssMarket:void 0,published:e.published!==!1}}const n=e.ownerRegionId??null;return{...e,sourceType:e.sourceType??"internal",visibility:e.visibility??"org",ownerDeptIds:ha(e.ownerDeptIds),ownerRegionId:n,ownerRegionIds:Array.isArray(e.ownerRegionIds)&&e.ownerRegionIds.length>0?[e.ownerRegionIds[0]]:n?[n]:[]}}const ba=/[\u4e00-\u9fff]/,Kt={"skill-data-analysis":"多源数据分析","skill-doc-gen":"文档初稿生成","skill-doc-compliance":"文档合规筛查","skill-file-archive":"智能文件归档","skill-ppt-gen":"PPT 自动生成","skill-meeting-minutes":"会议纪要生成","skill-work-summary":"个人工作总结","skill-doc-parser":"文档解析","skill-launch-sentiment":"发布会舆情快报","skill-survey-insight":"问卷洞察分析","skill-review-collect":"评分采集","skill-review-translate":"评论语种翻译","skill-review-cluster":"订单评论分析","skill-retail-insight":"零售信息洞察","skill-price-monitor":"价格与 Offer 监测","skill-so-report":"SO/SI 报表","skill-jd-parser":"JD 解析","skill-resume-screen":"简历筛选","skill-interview-analysis":"面试分析","skill-training-gen":"培训内容生成","skill-rag":"企业知识检索","skill-rerank":"检索重排序","skill-retail-coach":"零售 AI 陪练","skill-complaint-sop":"客诉 SOP 匹配","skill-wecom":"企微消息推送","skill-l10n-localize":"小语种本地化翻译","skill-sales-copy":"卖点文案写作","skill-frontline-script":"一线统一话术","skill-knowledge-digest":"组织知识沉淀","skill-weekly-report":"经营分析周报","skill-comp-brief":"竞品简报","skill-channel-brief":"渠道作战简报","skill-email-draft":"商务邮件草稿"};function Ye(e){return!!(e&&ba.test(e))}function ya(e){var s;const t=(s=e.nameZh)==null?void 0:s.trim();if(t)return t;const n=e.id?Kt[e.id]:void 0;if(n)return n;if(Ye(e.name))return e.name.trim();const a=(e.command||"").replace(/^\//,"").trim();return Ye(a)?a:(e.name||e.nameEn||"未命名技能").trim()}function Ri(e){return(e.descZh||e.desc||e.descEn||"").trim()}function Ni(e){const t=(e.nameZh||ya(e)||"").trim(),n=(e.descZh||e.desc||"").trim();return{...e,nameZh:t,descZh:n,name:t||(e.nameEn||e.name||"").trim(),desc:n||(e.descEn||e.desc||"").trim()}}function Sa(e){var a,s;const t=((a=e.nameZh)==null?void 0:a.trim())||Kt[e.id]||void 0,n=((s=e.nameEn)==null?void 0:s.trim())||(e.name&&!Ye(e.name)?e.name.trim():void 0);return!t&&!n?e:{...e,...t?{nameZh:t}:{},...n?{nameEn:n}:{}}}function X(e,t="Skill"){const n=["120ms","280ms","450ms","360ms","520ms","300ms"];return e.map((a,s)=>({skill:`${t}_${s+1}`,time:n[s%n.length],label:a,detail:`执行：${a}`}))}function D(e){return{...e,execSteps:e.execSteps??X(e.planSteps,"Office")}}const wa=[D({id:"skill-data-analysis",agentType:"marketing",planSteps:["解析分析意图与业务实体（品类/区域/时间窗）","对齐多源指标口径（ISRP / 零售 / 电商）","异动归因与关键驱动因子拆解","生成可视化要点与下一步行动建议"],demoPrompt:"/数据分析 请基于演示样例，输出近一周欧洲穿戴品类销售趋势：环比、TOP 代表处、异动归因与 NBA 建议。",instructions:`你是 MSS「多源数据分析」Skill（/数据分析）。基于 ISRP/零售/电商等多源数据做趋势与归因分析。

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
- 下周复盘促销 ROI`}),D({id:"skill-doc-gen",agentType:"knowledge",planSteps:["明确文档类型、受众与篇幅","抽取要点并搭提纲","生成初稿正文（分节）","补充待确认清单与引用占位"],demoPrompt:"/文档生成 请基于演示样例，生成一份「欧洲穿戴 Q2 业务复盘」初稿（含背景、结论、行动项，标注待确认）。",instructions:`你是 MSS「文档初稿生成」Skill（/文档生成）。

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
- [ ] 责任人与截止日期`}),D({id:"skill-doc-compliance",agentType:"knowledge",planSteps:["识别文档类型与适用合规规则集","扫描敏感用语/承诺/医疗宣称","输出风险分级与原文定位","给出改写建议与放行条件"],demoPrompt:"/合规筛查 请对演示样例营销文案做合规筛查：标出高风险表述、依据要点与改写建议。",instructions:`你是 MSS「文档合规筛查」Skill（/合规筛查）。面向营销物料/合同摘要/招投标用语做风险提示。

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

> 本结果为演示提示，非法律意见。`}),D({id:"skill-file-archive",agentType:"knowledge",planSteps:["识别文件类型与业务归属","生成归档路径与命名建议","抽取摘要与标签","输出归档清单与待人工确认项"],demoPrompt:"/文件整理 请基于演示样例，将一批会议纪要与报表整理为归档方案（路径、命名、标签、摘要）。",instructions:`你是 MSS「智能文件归档」Skill（/文件整理）。

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
- 是否合并两份重复「周报」`}),D({id:"skill-ppt-gen",agentType:"marketing",planSteps:["确认汇报场景与页数预算","设计幻灯片大纲（一页一事）","填充关键图表与结论页","输出演讲备注与附录建议"],demoPrompt:"/ppt 请基于演示样例，生成「欧洲穿戴周度经营」PPT 大纲（8～10 页）及每页要点。",instructions:`你是 MSS「PPT 自动生成」Skill（/ppt）。输出可直接进制作工具的大纲与要点，而非二进制文件。

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
先讲结论，再展开归因；南欧库存单独强调。`}),D({id:"skill-meeting-minutes",agentType:"knowledge",planSteps:["识别会议主题、参会方与议程","提炼决议与待办（Owner/Due）","整理讨论要点与未决问题","生成可分发纪要稿"],demoPrompt:"/会议纪要 请基于演示样例，生成欧洲穿戴周例会纪要：决议、待办、未决问题。",instructions:`你是 MSS「会议纪要生成」Skill（/会议纪要）。默认 60% AI 结构化 + 40% 人工确认。

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
- 促销预算是否追加（待财务）`}),D({id:"skill-work-summary",agentType:"knowledge",planSteps:["确认总结周期与角色视角","归类成果/进展/风险/求助","生成 Markdown 正文","给出可粘贴到周报系统的精简版"],demoPrompt:"/工作总结 请基于演示样例，生成个人本周工作总结（成果、进展、风险、下周计划）。",instructions:`你是 MSS「个人工作总结」Skill（/工作总结）。

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
本周交付周报与缺货对齐；推进价格监测自动化；风险在口径不一致；下周固化模板并跟闭环。`}),D({id:"skill-doc-parser",agentType:"knowledge",planSteps:["识别文件类型与结构","抽取关键字段/表格摘要","生成结构化摘要","标注解析置信度与人工复核点"],demoPrompt:"/解析文档 请基于演示样例，解析一份 SO 周报 Excel 摘要：字段、关键表、结论要点。",instructions:`你是 MSS「文档解析」Skill（/解析文档）。支持 PDF/Excel/PPT 的结构化摘要（演示环境用文本样例）。

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
可继续调用 \`/数据分析\` 做归因。`})],va="skill-review-cluster",Ia=`你是 MSS 电渠「订单评论分析」Skill（/评论分析）。对**已采集并完成中英双语清洗**的订单评论做正向/负向情感判断与用户数据挖掘，输出可进例会的 VoC 行动建议。

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
- 合规：仅作合法市场与口碑分析用途`,St=["确认已承接采集+翻译清洗语料（或演示样例）","星级分布与正负向情感判断","主题聚类与用户数据挖掘（诉求/场景/退换信号）","卖点 GAP 与预警识别","生成分角色行动建议（电商 / 服务 / MKT）"];function Aa(e="/评论分析"){return`${e} 请基于 Amazon MX 演示样例 ASIN B0FPG9431G（假设已完成采集与中英翻译清洗），输出情感判断、用户数据挖掘、卖点 GAP、预警与分角色建议。`}const Ta=`✅ **订单评论分析已完成**（演示样例 · ASIN \`B0FPG9431G\` · 经采集→翻译清洗）

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
- **MKT**：筛选高星长评作拥护者素材`,Pa={id:va,instructions:Ia,planSteps:[...St],demoPrompt:Aa(),mockReport:Ta,execSteps:X([...St],"Review"),agentType:"knowledge"},Ma="skill-review-collect",Ca=`你是 MSS 电渠「评分采集」Skill（/评论采集）。从电商平台商品购买页采集用户订单评论（已购已用），输出可交给下游翻译/分析的干净样本包。

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
- 不要编造精确到个位的虚假统计；演示样例须标注`,wt=["确认平台/站点/ASIN 与目标评论量","拉取购买页订单评论并去重清洗","输出星级/语种粗分与样本清单","标注质量缺口并交接给翻译链路"];function Ra(e="/评论采集"){return`${e} 请采集 Amazon MX 演示样例 ASIN B0FPG9431G（3C 穿戴）购买页订单评论，输出任务卡、样本清单（含星级/语种/原文摘要）与交接说明，标注演示样例。`}const Na=`✅ **评分采集已完成**（演示样例 · ASIN \`B0FPG9431G\` · Amazon MX）

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
请将样本清单交给 **语种翻译 Agent**（/评论翻译），统一产出中英双语后再进入评论分析。`,Oa={id:Ma,instructions:Ca,planSteps:[...wt],demoPrompt:Ra(),mockReport:Na,execSteps:X([...wt],"Collect"),agentType:"knowledge"},La="skill-review-translate",ja=`你是 MSS 电渠「语种翻译」Skill（/评论翻译）。将上游采集的多语种订单评论统一翻译为**英语 + 中文**，保留原文，供评论分析使用。

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
- 低置信度译文不得伪装成精确；演示样例须标注`,vt=["接收采集样本并识别源语分布","逐条译为英语与中文并保留原文","统一术语/专名，标注低置信度行","输出双语对照表并交接给分析链路"];function Ea(e="/评论翻译"){return`${e} 请将 Amazon MX 演示样例 ASIN B0FPG9431G 的多语种订单评论统一翻译为英语和中文，输出双语对照表（保留原文），并标注演示样例。`}const _a=`✅ **语种翻译已完成**（演示样例 · ASIN \`B0FPG9431G\`）

### 一、任务卡
- 源语：es-MX 为主 · 目标：en + zh-CN
- 条数：演示批次 12 条

### 二、双语对照（节选）
| # | 原文 | EN | ZH |
| --- | --- | --- | --- |
| 1 | Es muy bueno… pero el GPS es poco preciso. | Nice design, but GPS is inaccurate. | 外观不错，但 GPS 不够准。 |
| 2 | La batería dura todo el día. | Battery lasts all day. | 续航能撑一整天。 |

### 三、交接
请将双语对照表交给 **评论分析 Agent**（/评论分析）做情感判断与用户洞察挖掘。`,$a={id:La,instructions:ja,planSteps:[...vt],demoPrompt:Ea(),mockReport:_a,execSteps:X([...vt],"Translate"),agentType:"knowledge"};function ce(e){return{...e,execSteps:e.execSteps??X(e.planSteps,"Manage")}}const za=[ce({id:"skill-launch-sentiment",agentType:"marketing",planSteps:["界定产品/发布会与监测窗口","聚合社媒与媒体声量","情感分层与热点主题聚类","输出快报与危机/机会建议"],demoPrompt:"/舆情快报 请基于演示样例，输出某穿戴新品发布会 48h 舆情快报：声量、情感、热点与建议。",instructions:`你是 MSS「发布会舆情快报」Skill（/舆情快报）。

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
- 服务：备好开箱/配对 FAQ`}),ce({id:"skill-survey-insight",agentType:"marketing",planSteps:["确认问卷主题与样本说明","清洗与分层（人群/区域）","交叉分析关键题项","输出洞察与行动建议"],demoPrompt:"/问卷洞察 请基于演示样例，分析用户满意度问卷：NPS、痛点 TOP、分人群差异与建议。",instructions:`你是 MSS「问卷洞察」Skill（/问卷洞察）。

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
- MKT：包装内页多语种改版试点`}),ce({id:"skill-retail-insight",agentType:"marketing",planSteps:["选定门店范围与指标（DOS/转化/陈列）","拉取并校验零售数据口径","识别异常门店与机会门店","生成洞察 π 报告与动作清单"],demoPrompt:"/零售洞察 请基于演示样例，输出 3 月代表处 DOS/转化洞察：异常门店、原因假设与动作。",instructions:`你是 MSS「零售信息洞察 π」Skill（/零售洞察）。

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
- 复制 DE 高转化话术到 IT`}),ce({id:"skill-price-monitor",agentType:"marketing",planSteps:["确认监测国家、渠道与 SKU 清单","聚合价格与 offer 变化","识别异常降价/窜货信号","输出监测简报与跟进建议"],demoPrompt:"/价格监测 请基于演示样例，输出 18 国中选 3 国穿戴主力 SKU 的价格与 offer 监测简报。",instructions:`你是 MSS「价格与 Offer 监测」Skill（/价格监测）。

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
- 渠道：同步官方活动日历`}),ce({id:"skill-so-report",agentType:"marketing",planSteps:["确认统计周期与剔除规则（如 IoT）","汇总代表处 SO/SI 与排名","计算环比与结构占比","生成报表结论与跟进项"],demoPrompt:"/so报表 请基于演示样例，输出各代表处累计 SO 排名（剔除 IoT），含环比与简要结论。",instructions:`你是 MSS「SO/SI 报表」Skill（/so报表）。

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
- 与 FR 对齐促销与库存`})],Da=[...za,Oa,$a,Pa];function Ae(e){return{...e,execSteps:e.execSteps??X(e.planSteps,"Process")}}const Fa=[Ae({id:"skill-jd-parser",agentType:"knowledge",planSteps:["识别岗位与职级信息","抽取职责、要求与胜任力标签","结构化为招聘标准字段","输出筛选权重建议"],demoPrompt:"/jd解析 请基于演示样例，解析「区域电商运营」JD：职责、硬性要求、胜任力与筛选权重。",instructions:`你是 MSS「JD 解析」Skill（/jd解析）。

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
硬性 40% · 项目经验 35% · 软技能 25%`}),Ae({id:"skill-resume-screen",agentType:"knowledge",planSteps:["对齐 JD 关键要求","解析简历经历与成果","人岗匹配打分与风险点","输出面试关注清单"],demoPrompt:"/简历筛选 请基于演示样例，对 1 份电商运营简历做人岗匹配：得分、亮点、风险、面试问题。",instructions:`你是 MSS「简历筛选」Skill（/简历筛选）。

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
2. 如何处理渠道价格冲突`}),Ae({id:"skill-interview-analysis",agentType:"knowledge",planSteps:["整理面试记录与评价维度","提取行为事例与能力证据","生成评估报告与录用建议倾向","列出待核实背景调查点"],demoPrompt:"/面试分析 请基于演示样例面试记录，输出评估报告：维度得分、证据、倾向建议。",instructions:`你是 MSS「面试分析」Skill（/面试分析）。

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
- 上一段离职原因`}),Ae({id:"skill-training-gen",agentType:"knowledge",planSteps:["确认产品/受众与课时","设计学习目标与大纲","生成讲义要点与测验题","输出门店演练脚本"],demoPrompt:"/培训内容 请基于演示样例，生成 Nova 新品门店 45 分钟培训大纲、测验与演练脚本。",instructions:`你是 MSS「培训内容生成」Skill（/培训内容）。

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
店员 A 演示 → 店员 B 扮演顾虑价格顾客 → 反馈 2 条改进。`})];function de(e){return{...e,execSteps:e.execSteps??X(e.planSteps,"Exp")}}const Ka=[de({id:"skill-rag",agentType:"knowledge",planSteps:["提问重写与术语对齐","按业务分区向量检索","汇总候选文档块","生成带引用的回答草稿"],demoPrompt:"/检索 请基于演示样例知识库，回答：欧洲门店 DOS 过高时应按什么 SOP 处理？并给出引用。",instructions:`你是 MSS「企业知识检索」Skill（/检索）。按业务部门分区做向量检索演示。

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
- [调拨指引 §2] 演示锚点`}),de({id:"skill-rerank",agentType:"knowledge",planSteps:["接收初检候选列表","Cross-Encoder 语义重排","截断 Top-K 并解释排序理由","输出供摘要使用的精选块"],demoPrompt:"/rerank 请基于演示样例，对 8 条检索候选重排为 Top-3，并说明排序理由。",instructions:`你是 MSS「检索重排序」Skill（/rerank）。

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
可进入抗幻觉摘要生成。`}),de({id:"skill-retail-coach",agentType:"knowledge",planSteps:["设定演练场景与考核点","生成顾客异议与标准应答","模拟一轮对话并评分","输出改进建议与再练脚本"],demoPrompt:"/陪练 请基于演示样例，开展一轮「价格贵」异议处理陪练：脚本、评分与改进建议。",instructions:`你是 MSS「零售 AI 陪练」Skill（/陪练）。

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
「贵在多两天续航和更稳的运动定位，按周均下来…」`}),de({id:"skill-complaint-sop",agentType:"knowledge",planSteps:["识别客诉类型与紧急度","匹配 SOP 与话术模板","生成对客回复草稿","列出升级路径与工单字段"],demoPrompt:"/客诉 请基于演示样例，处理「物流延误」客诉：SOP 匹配、对客话术与是否升级。",instructions:`你是 MSS「客诉 SOP 匹配」Skill（/客诉）。

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
订单号 / 延误时长 / 补偿意向`}),de({id:"skill-wecom",agentType:"marketing",planSteps:["确认推送对象与消息类型","组装卡片/文本内容","校验敏感信息与频率","输出推送预览与发送清单"],demoPrompt:"/wecom 请基于演示样例，生成一条经营周报企业微信卡片推送预览（标题、要点、按钮）。",instructions:`你是 MSS「企业微信推送」Skill（/wecom）。演示环境只生成推送预览，不真实调用 WeCom API。

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

> 演示模式：仅预览，未调用企业微信 API。`})];function F(e){return{...e,execSteps:e.execSteps??X(e.planSteps,"Skill")}}const Ba=[F({id:"skill-l10n-localize",agentType:"marketing",planSteps:["识别源语/目标语与物料类型（卖点卡/详情页）","按术语表与禁译表完成初译","回译抽检与规格数字校验","输出双语对照包与质检清单"],demoPrompt:"/本地化翻译 将以下卖点卡译为阿语，保留品牌词与规格数字，并给出术语质检清单（演示样例）。",instructions:`你是 MSS「小语种本地化翻译」Skill（/本地化翻译）。面向营销物料本地化，不是通用闲聊翻译。

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
| 敏感表述 | 需人工抽检 10% |`}),F({id:"skill-sales-copy",agentType:"marketing",planSteps:["澄清产品、人群与渠道触点","提炼 3–5 条差异化卖点","生成短文案与落地页段落","给出 A/B 测试建议"],demoPrompt:"/卖点文案 为穿戴新品生成电商详情页卖点（中国区 · 演示样例）。",instructions:`你是 MSS「卖点文案」Skill（/卖点文案）。参考专业营销 copy 框架，输出可落地的中文文案。

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
立即了解渠道主推机型`}),F({id:"skill-frontline-script",agentType:"knowledge",planSteps:["识别场景（客诉/门店/热线）","对齐 SOP 关键步骤","生成可朗读统一话术","列出禁忌语与升级条件"],demoPrompt:"/一线话术 电池过热客诉，请给出一线统一口径与禁忌语（演示样例）。",instructions:`你是 MSS「一线话术」Skill（/一线话术）。输出可直接对客的口径，避免绝对化承诺。

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
- 不承诺「绝对不会再发热」`}),F({id:"skill-knowledge-digest",agentType:"knowledge",planSteps:["识别待沉淀材料类型","抽取可检索要点与标签","生成知识卡片摘要","给出入库分区建议"],demoPrompt:"/知识沉淀 将本周渠道复盘纪要沉淀为可检索知识卡片（演示样例）。",instructions:`你是 MSS「知识沉淀」Skill（/知识沉淀）。把长文变成可入库的知识卡片。

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
\`gtm/channel-weekly\``}),F({id:"skill-weekly-report",agentType:"marketing",planSteps:["对齐时间窗与口径（SO/SI）","汇总代表处与品类结构","提炼亮点/风险与归因","输出周报成稿与 NBA"],demoPrompt:"/经营周报 生成上周欧洲穿戴经营周报（演示样例）。",instructions:`你是 MSS「经营周报」Skill（/经营周报）。输出可直接发群的周清成稿。

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
- 复盘 TOP3 异动渠道`}),F({id:"skill-comp-brief",agentType:"marketing",planSteps:["锁定竞品型号与对比维度","整理价格/卖点/渠道差异","给出应对建议","输出一页纸简报"],demoPrompt:"/竞品简报 对比竞品手表 A 与我司主推机型（演示样例）。",instructions:`你是 MSS「竞品简报」Skill（/竞品简报）。输出一页纸对照，不编造未提供的精确价格。

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
强化续航与健康监测卖点沟通。`}),F({id:"skill-channel-brief",agentType:"marketing",planSteps:["对齐活动档期与主推机型","核对库存与渠道节奏","输出作战要点","列出协同角色与截止时间"],demoPrompt:"/渠道简报 生成本周中国区渠道作战简报（演示样例）。",instructions:`你是 MSS「渠道简报」Skill（/渠道简报）。面向渠道经理的作战对齐材料。

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
- 促销话术统一`}),F({id:"skill-email-draft",agentType:"knowledge",planSteps:["明确收件人与沟通目的","整理事实要点与诉求","生成礼貌、简洁邮件草稿","给出主题行备选"],demoPrompt:"/邮件草稿 给渠道客户写一封补货跟进邮件（演示样例）。",instructions:`你是 MSS「邮件草稿」Skill（/邮件草稿）。输出可直接粘贴的商务邮件。

## 必须输出
1. 主题行（2 个备选）
2. 正文
3. 礼貌结尾
4. 需人工核对的事实项`,mockReport:`✅ **邮件草稿已生成**（演示样例）

### 主题
关于本周补货进度的确认

### 正文
您好，…（演示）恳请确认到货窗口。谢谢！`})],Ua=[...wa,...Da,...Fa,...Ka,...Ba],Wa=new Map(Ua.map(e=>[e.id,e]));function Ga(e){return e?Wa.get(e)??null:null}const Ha=[{id:"skill-data-analysis",name:"MultiSourceAnalysis",desc:"【办公提效】AI 辅助数据分析 · 多源数据自动分析与可视化（可在做任务 /数据分析 调用）",category:"office",command:"/数据分析",author:"华为 MSS",version:"2.0.0",connector:"ISRP + Sandbox · 对话 Runtime",published:!0,invokes:18400,icon:"fa-chart-line",tags:["数据分析","ISRP","SO","综履","结算","对账"]},{id:"skill-doc-gen",name:"DocDraftGenerator",desc:"【办公提效】AI 辅助文档生成 · 文档初稿自动生成与解读（可在做任务 /文档生成 调用）",category:"office",command:"/文档生成",author:"华为 MSS",version:"1.6.0",connector:"Doc AI · 对话 Runtime",published:!0,invokes:9100,icon:"fa-file-lines",tags:["文档","初稿"]},{id:"skill-doc-compliance",name:"DocComplianceChecker",desc:"【办公提效】AI 辅助文档解读 · 营销物料/合同/招投标合规筛查（可在做任务 /合规筛查 调用）",category:"office",command:"/合规筛查",author:"华为 MSS",version:"1.4.0",connector:"Doc AI · 对话 Runtime",published:!0,invokes:6700,icon:"fa-file-shield",tags:["合规","医疗用语"]},{id:"skill-file-archive",name:"SmartFileArchive",desc:"【办公提效】AI 辅助文件整理 · 多源文件智能归档（可在做任务 /文件整理 调用）",category:"office",command:"/文件整理",author:"华为 MSS",version:"1.2.0",connector:"Onebox/Email · 对话 Runtime",published:!0,invokes:4200,icon:"fa-folder-tree",tags:["归档","总结","知识","指南"]},{id:"skill-ppt-gen",name:"PPTAutoGenerator",desc:"【办公提效】AI 辅助 PPT 生成 · 多源数据 PPT 自动生成（可在做任务 /ppt 调用）",category:"office",command:"/ppt",author:"华为 MSS",version:"1.0.0",connector:"Office Runtime · 对话 Runtime",published:!0,invokes:3100,icon:"fa-file-powerpoint",tags:["PPT","汇报"]},{id:"skill-meeting-minutes",name:"MeetingMinutesGen",desc:"【办公提效】AI 辅助会议纪要生成 · 60% AI + 40% 人工（可在做任务 /会议纪要 调用）",category:"office",command:"/会议纪要",author:"华为 MSS",version:"2.1.0",connector:"WeLink · 对话 Runtime",published:!0,invokes:12100,icon:"fa-clipboard-list",tags:["会议","纪要"]},{id:"skill-work-summary",name:"WorkSummaryGen",desc:"【办公提效】个人工作总结 Markdown/HTML 多形式生成（可在做任务 /工作总结 调用）",category:"office",command:"/工作总结",author:"华为 MSS",version:"1.3.0",connector:"员工助手 · 对话 Runtime",published:!0,invokes:5800,icon:"fa-file-pen",tags:["总结","归档"]},{id:"skill-doc-parser",name:"DocParser",desc:"PDF/Excel/PPT 结构化解析与摘要（可在做任务 /解析文档 调用）",category:"office",command:"/解析文档",author:"华为 MSS",version:"2.0.0",connector:"Doc AI · 对话 Runtime",published:!0,invokes:8900,icon:"fa-file-import",tags:["解析","核验","验收","综履"]},{id:"skill-launch-sentiment",name:"LaunchSentimentReport",desc:"【管理提效】发布会舆情快报 · 产品发布舆情 AI 分析（可在做任务 /舆情快报 调用）",category:"manage",command:"/舆情快报",author:"华为 MSS",version:"1.5.0",connector:"Social Listening · 对话 Runtime",published:!0,invokes:5400,icon:"fa-bullhorn",tags:["舆情","发布会"]},{id:"skill-survey-insight",name:"SurveyInsightAnalyzer",desc:"【管理提效】洞察部用户问卷调研分析与报告生成（可在做任务 /问卷洞察 调用）",category:"manage",command:"/问卷洞察",author:"华为 MSS",version:"1.1.0",connector:"Survey Hub · 对话 Runtime",published:!0,invokes:2100,icon:"fa-square-poll-vertical",tags:["问卷","MKT"]},{id:"skill-review-collect",name:"评分采集",desc:"【管理提效】电渠购买页订单评论采集 · Amazon/Lazada 等站点样本清洗与交接（可在做任务 /评论采集 调用）",category:"manage",command:"/评论采集",author:"华为 MSS",version:"1.0.0",connector:"Amazon/Lazada · 对话 Runtime",published:!0,invokes:4200,icon:"fa-download",tags:["评论","电商","采集","订单评论"],scenarioTags:["评论分析","评论","电商"]},{id:"skill-review-translate",name:"评论语种翻译",desc:"【管理提效】多语种订单评论统一译为英语与中文，保留原文对照（可在做任务 /评论翻译 调用）",category:"manage",command:"/评论翻译",author:"华为 MSS",version:"1.0.0",connector:"Translate Runtime · 对话 Runtime",published:!0,invokes:3800,icon:"fa-language",tags:["评论","翻译","本地化","电商"],scenarioTags:["评论分析","评论","电商","翻译","本地化"]},{id:"skill-review-cluster",name:"订单评论分析",desc:"【管理提效】对采集+翻译后的评论做情感判断、用户数据挖掘、卖点 GAP 与分角色建议（可在做任务 /评论分析 调用）",category:"manage",command:"/评论分析",author:"华为 MSS",version:"3.1.0",connector:"Amazon/Lazada · 对话 Runtime",published:!0,invokes:7600,icon:"fa-comments",tags:["评论","电商","VoC","订单评论","情感"],scenarioTags:["评论分析","评论","电商"]},{id:"skill-retail-insight",name:"RetailInsightPi",desc:"【管理提效】零售信息洞察 π · 门店 DOS/转化/陈列报告（可在做任务 /零售洞察 调用）",category:"manage",command:"/零售洞察",author:"华为 MSS",version:"1.8.0",connector:"iRetail · 对话 Runtime",published:!0,invokes:9800,icon:"fa-store",tags:["零售","洞察π"]},{id:"skill-price-monitor",name:"PriceOfferMonitor",desc:"【管理提效】价格监测 · 18 国多渠道价格 & offer 监测（可在做任务 /价格监测 调用）",category:"manage",command:"/价格监测",author:"华为 MSS",version:"3.0.1",connector:"Market Intel · 对话 Runtime",published:!0,invokes:25600,icon:"fa-tags",tags:["价格","offer","价格监测"]},{id:"skill-so-report",name:"SOReportBuilder",desc:"代表处 SO/SI 排名、环比、IoT 剔除报表（可在做任务 /so报表 调用）",category:"manage",command:"/so报表",author:"华为 MSS",version:"3.0.1",connector:"ISRP · 对话 Runtime",published:!0,invokes:14300,icon:"fa-table",tags:["SO","代表处","返利"]},{id:"skill-jd-parser",name:"JDParser",desc:"【流程提效】招聘 JD 结构化解析与胜任力提取（可在做任务 /jd解析 调用）",category:"process",command:"/jd解析",author:"华为 MSS",version:"1.0.2",connector:"HR Hub · 对话 Runtime",published:!0,invokes:3200,icon:"fa-briefcase",tags:["JD","HR"]},{id:"skill-resume-screen",name:"ResumeScreener",desc:"【流程提效】招聘需求简历分析 · AI 简历筛选与人岗匹配（可在做任务 /简历筛选 调用）",category:"process",command:"/简历筛选",author:"华为 MSS",version:"1.4.0",connector:"HR Hub · 对话 Runtime",published:!0,invokes:4100,icon:"fa-user-check",tags:["简历","HR"]},{id:"skill-interview-analysis",name:"InterviewAnalyzer",desc:"【流程提效】面试记录分析与评估报告生成（可在做任务 /面试分析 调用）",category:"process",command:"/面试分析",author:"华为 MSS",version:"1.2.0",connector:"HR Hub · 对话 Runtime",published:!0,invokes:2800,icon:"fa-user-pen",tags:["面试","HR"]},{id:"skill-training-gen",name:"TrainingContentGen",desc:"【流程提效】AI 辅助培训内容生成 · Nova 新品门店培训（可在做任务 /培训内容 调用）",category:"process",command:"/培训内容",author:"华为 MSS",version:"1.6.0",connector:"LMS · 对话 Runtime",published:!0,invokes:4900,icon:"fa-chalkboard-user",tags:["培训","Nova"]},{id:"skill-rag",name:"MilvusRetriever",desc:"【体验提升】企业知识向量检索 · 按业务部门分区（可在做任务 /检索 调用）",category:"experience",command:"/检索",author:"华为 MSS",version:"2.5.0",connector:"Milvus · 对话 Runtime",published:!0,invokes:19800,icon:"fa-database",tags:["RAG","知识库","知识","归档"]},{id:"skill-rerank",name:"CrossEncoderReranker",desc:"【体验提升】检索结果 Cross-Encoder 重排序（可在做任务 /rerank 调用）",category:"experience",command:"/rerank",author:"华为 MSS",version:"1.0.0",connector:"Model Hub · 对话 Runtime",published:!0,invokes:6200,icon:"fa-sort-amount-down",tags:["RAG"]},{id:"skill-retail-coach",name:"RetailAICoach",desc:"【体验提升】零售 AI 陪练 · 卖点演练与考核反馈（可在做任务 /陪练 调用）",category:"experience",command:"/陪练",author:"华为 MSS",version:"1.1.0",connector:"LMS · 对话 Runtime",published:!0,invokes:3600,icon:"fa-headset",tags:["陪练","门店"]},{id:"skill-complaint-sop",name:"ComplaintSOPMatch",desc:"【体验提升】客诉 SOP 检索与话术推荐（可在做任务 /客诉 调用）",category:"experience",command:"/客诉",author:"华为 MSS",version:"2.2.0",connector:"CSC Ticket · 对话 Runtime",published:!0,invokes:8300,icon:"fa-ticket",tags:["客诉","SOP"],scenarioTags:["客诉","服务","工单"]},{id:"skill-wecom",name:"WeComPush",desc:"企业微信消息/卡片/群机器人推送（可在做任务 /wecom 调用）",category:"experience",command:"/wecom",author:"华为 MSS",version:"2.0.0",connector:"WeCom API · 对话 Runtime",published:!0,invokes:22100,icon:"fa-comment-dots",tags:["WeCom","推送"]},{id:"skill-l10n-localize",name:"LocalizeCopy",desc:"【内容生成】小语种本地化翻译 · 卖点卡/物料初译 + 术语与禁译质检（可在做任务 /本地化翻译 调用）",category:"manage",command:"/本地化翻译",author:"华为 MSS",version:"1.0.0",connector:"Translate Runtime · 对话 Runtime",published:!0,invokes:4600,icon:"fa-language",tags:["翻译","本地化","小语种","术语"],scenarioTags:["翻译","本地化","小语种"]},{id:"skill-sales-copy",name:"SalesCopywriter",desc:"【内容生成】卖点与销售文案 · 按人群/渠道生成卖点卡与落地页文案（可在做任务 /卖点文案 调用）",category:"manage",command:"/卖点文案",author:"华为 MSS",version:"1.0.0",connector:"Doc AI · 对话 Runtime",published:!0,invokes:3900,icon:"fa-pen-nib",tags:["文案","卖点","MKT","转化"]},{id:"skill-frontline-script",name:"FrontlineScript",desc:"【体验提升】一线统一话术 · 客诉/门店口径对齐与禁忌语检查（可在做任务 /一线话术 调用）",category:"experience",command:"/一线话术",author:"华为 MSS",version:"1.0.0",connector:"CSC + LMS · 对话 Runtime",published:!0,invokes:5200,icon:"fa-comments",tags:["话术","客诉","服务","口径"],scenarioTags:["客诉","服务"]},{id:"skill-knowledge-digest",name:"KnowledgeDigest",desc:"【体验提升】组织及个人知识沉淀 · 会议/文档/问答摘要入库（可在做任务 /知识沉淀 调用）",category:"experience",command:"/知识沉淀",author:"华为 MSS",version:"1.0.0",connector:"Milvus + Onebox · 对话 Runtime",published:!0,invokes:4100,icon:"fa-box-archive",tags:["知识","归档","沉淀","RAG"],scenarioTags:["知识","归档","指南"]},{id:"skill-weekly-report",name:"OpsWeeklyReport",desc:"【管理提效】经营分析周报 · SO/渠道/代表处周清成稿（可在做任务 /经营周报 调用）",category:"manage",command:"/经营周报",author:"华为 MSS",version:"1.0.0",connector:"ISRP · 对话 Runtime",published:!0,invokes:6100,icon:"fa-calendar-week",tags:["周报","经营","SO","代表处"],scenarioTags:["数据分析","SO","经营"]},{id:"skill-comp-brief",name:"CompetitorBrief",desc:"【管理提效】竞品简报 · 型号/价格/卖点对照与应对建议（可在做任务 /竞品简报 调用）",category:"manage",command:"/竞品简报",author:"华为 MSS",version:"1.0.0",connector:"Market Intel · 对话 Runtime",published:!0,invokes:3400,icon:"fa-binoculars",tags:["竞品","洞察","GTM"]},{id:"skill-channel-brief",name:"ChannelPlayBrief",desc:"【流程提效】渠道作战简报 · 活动节奏/库存/主推机型对齐（可在做任务 /渠道简报 调用）",category:"process",command:"/渠道简报",author:"华为 MSS",version:"1.0.0",connector:"Channel Hub · 对话 Runtime",published:!0,invokes:2800,icon:"fa-store",tags:["渠道","作战","零售"]},{id:"skill-email-draft",name:"BizEmailDraft",desc:"【办公提效】商务邮件草稿 · 客户/渠道沟通要点与礼貌修订（可在做任务 /邮件草稿 调用）",category:"office",command:"/邮件草稿",author:"华为 MSS",version:"1.0.0",connector:"Email · 对话 Runtime",published:!0,invokes:4500,icon:"fa-envelope",tags:["邮件","沟通","办公"]}];function qa(e){const t=Ga(e.id);return t?{...e,instructions:t.instructions,planSteps:[...t.planSteps]}:e}const Bt=xa(Ha.map(qa).map(Sa)),Oi=[{id:"all",name:"全部文档",icon:"fa-layer-group"},{id:"public",name:"公共",icon:"fa-building-columns",desc:"平台规范 · 通用制度"},{id:"gtm",name:"GTM",icon:"fa-rocket",desc:"上市 · 准入 · 区域策略"},{id:"mkt",name:"MKT",icon:"fa-bullhorn",desc:"品牌 · 活动 · 洞察"},{id:"ecommerce",name:"电商",icon:"fa-cart-shopping",desc:"评论 · offer · 平台规则"},{id:"retail",name:"零售",icon:"fa-store",desc:"门店 · 培训 · 洞察 π"},{id:"service",name:"服务",icon:"fa-headset",desc:"SOP · 客诉 · 质检"},{id:"channel",name:"渠道",icon:"fa-diagram-project",desc:"返利 · 价盘 · 代表处"},{id:"hr",name:"HR",icon:"fa-user-tie",desc:"JD · 招聘 · 人岗标准"},{id:"finance",name:"财经",icon:"fa-coins",desc:"返利对账 · 价保 · 财务口径"},{id:"quality",name:"质量运营",icon:"fa-clipboard-check",desc:"合规检查 · 审计 · 质量规范"},{id:"other",name:"其他",icon:"fa-folder-open",desc:"未分类 · 临时归档"}],Ja=[{id:"kb-platform-guide",title:"MSS Claw 平台使用指南",desc:"AI任务、Agent/Skill 挂载、任务中心与交付物流转说明",collection:"public",type:"PDF",size:"2.1 MB",pages:42,clearance:"L2",indexed:!0,chunks:186,tags:["平台","指南"],updatedAt:"2026-07-08",author:"MSS AI变革"},{id:"kb-agent-playbook",title:"Agent/Skill 配置与发布规范",desc:"Agent 设计规范、Skill 挂载策略、审批与审计要求",collection:"public",type:"PDF",size:"1.8 MB",pages:36,clearance:"L2",indexed:!0,chunks:168,tags:["Agent","Skill"],updatedAt:"2026-07-08",author:"MSS AI变革"},{id:"kb-gtm-launch",title:"GTM 上市节奏 Playbook",desc:"Mate/Pura 上市里程碑、区域准入与首销 KPI 模板",collection:"gtm",type:"PDF",size:"3.2 MB",pages:54,clearance:"L3",indexed:!0,chunks:412,tags:["上市","GTM"],updatedAt:"2026-07-07",author:"GTM 部"},{id:"kb-latam-compliance",title:"拉美/EU 市场准入 Checklist",desc:"ANATEL 认证、RoHS、环保参数与准入清单",collection:"gtm",type:"PDF",size:"3.6 MB",pages:62,clearance:"L3",indexed:!0,chunks:520,tags:["拉美","准入"],updatedAt:"2026-06-15",author:"GTM 合规"},{id:"kb-campaign-q3",title:"2025 Q3 全渠道活动 Playbook",desc:"大促节奏、预算池、活动物料与审批流",collection:"mkt",type:"PDF",size:"2.4 MB",pages:48,clearance:"L3",indexed:!0,chunks:312,tags:["活动","MKT"],updatedAt:"2026-06-28",author:"MKT"},{id:"kb-wearable-okr",title:"2025 可穿戴 OKR 复盘",desc:"KR 进度、续航目标卡点与代表处反馈汇总",collection:"mkt",type:"XLSX",size:"540 KB",pages:6,clearance:"L2",indexed:!0,chunks:72,tags:["穿戴","OKR"],updatedAt:"2026-06-30",author:"MKT 洞察"},{id:"kb-survey-guide",title:"洞察部用户问卷调研方法",desc:"问卷设计、样本配额、开放题编码与洞察报告模板",collection:"mkt",type:"DOCX",size:"680 KB",pages:18,clearance:"L2",indexed:!0,chunks:96,tags:["问卷","洞察"],updatedAt:"2026-07-04",author:"MKT 洞察部"},{id:"kb-review-sop",title:"Amazon/Lazada 评论分析 SOP",desc:"评分采集 → 语种翻译（中英）→ 评论分析三段口径与 MX/EU 平台差异",collection:"ecommerce",type:"PDF",size:"1.2 MB",pages:22,clearance:"L2",indexed:!0,chunks:142,tags:["评论","电商"],updatedAt:"2026-07-06",author:"电商运营"},{id:"kb-offer-monitor",title:"电商 Offer 监测口径说明",desc:"SKU 字段映射、多国采集 VPN 策略与复核 URL 清单",collection:"ecommerce",type:"XLSX",size:"420 KB",pages:8,clearance:"L2",indexed:!0,chunks:88,tags:["offer","价格"],updatedAt:"2026-07-07",author:"电商数据"},{id:"kb-retail-pi",title:"零售洞察 π 报告模板",desc:"门店 DOS、转化、陈列合规与代表处下钻结构",collection:"retail",type:"PDF",size:"1.5 MB",pages:28,clearance:"L2",indexed:!0,chunks:168,tags:["零售","洞察π"],updatedAt:"2026-07-05",author:"零售运营"},{id:"kb-nova-training",title:"Nova 新品培训内容框架",desc:"卖点脚本、对抗演练题库、门店考核指标",collection:"retail",type:"Folder",size:"24 MB",pages:0,clearance:"L2",indexed:!0,chunks:860,tags:["Nova","培训"],updatedAt:"2026-07-03",author:"零售培训"},{id:"kb-sop-complaint",title:"消费者服务 SOP · 电池过热客诉",desc:"分级处理、话术、OTA 引导与升级路径",collection:"service",type:"PDF",size:"1.1 MB",pages:24,clearance:"L2",indexed:!0,chunks:186,tags:["客诉","SOP"],updatedAt:"2026-07-01",author:"消费者服务"},{id:"kb-sop-bundle",title:"服务 SOP 知识包 v4",desc:"客诉分类、质检评分、备件策略综合包",collection:"service",type:"Bundle",size:"18 MB",pages:0,clearance:"L2",indexed:!0,chunks:2140,tags:["SOP","质检"],updatedAt:"2026-06-20",author:"CSC"},{id:"kb-rebate-q3",title:"渠道返利政策 2025 Q3",desc:"代表处返利规则、价保策略、破价稽核要点",collection:"channel",type:"XLSX",size:"860 KB",pages:8,clearance:"L3",indexed:!0,chunks:142,tags:["返利","价保"],updatedAt:"2026-07-06",author:"渠道管理部"},{id:"kb-price-master",title:"价盘政策主数据说明",desc:"FD/KA 价盘层级、价保模拟与破价预警规则",collection:"channel",type:"DOCX",size:"420 KB",pages:16,clearance:"L3",indexed:!0,chunks:88,tags:["价盘"],updatedAt:"2026-07-04",author:"渠道财经"},{id:"kb-jd-template",title:"招聘 JD 模板库",desc:"MSS 各序列 JD 结构、胜任力模型与合规用语",collection:"hr",type:"DOCX",size:"520 KB",pages:12,clearance:"L2",indexed:!0,chunks:76,tags:["JD","招聘"],updatedAt:"2026-07-02",author:"HR"},{id:"kb-resume-rubric",title:"简历筛选评分标准",desc:"人岗匹配维度、面试分析 Agent 输出字段说明",collection:"hr",type:"PDF",size:"380 KB",pages:10,clearance:"L2",indexed:!0,chunks:54,tags:["简历","HR"],updatedAt:"2026-06-28",author:"HR"},{id:"kb-rebate-finance",title:"返利/价保财务对账说明",desc:"代表处对账周期、异常返利稽核与 Finance Hub 口径",collection:"finance",type:"XLSX",size:"640 KB",pages:6,clearance:"L3",indexed:!0,chunks:68,tags:["返利","财经"],updatedAt:"2026-07-05",author:"财经"},{id:"kb-wearable-medical",title:"可穿戴医疗用语合规检查清单",desc:"营销物料、合同、招投标文档医疗宣称与风险筛查要点",collection:"quality",type:"PDF",size:"920 KB",pages:20,clearance:"L3",indexed:!0,chunks:124,tags:["合规","医疗用语"],updatedAt:"2026-07-07",author:"质量运营"},{id:"kb-quality-audit",title:"质量运营审计规范",desc:"文档合规抽检、Agent 调用审计与问题闭环流程",collection:"quality",type:"PDF",size:"760 KB",pages:16,clearance:"L2",indexed:!0,chunks:98,tags:["审计","质量"],updatedAt:"2026-07-01",author:"质量运营"},{id:"kb-assistant-bridge",title:"员工助手多源接入说明",desc:"Onebox/WeLink/Email 与知识库衔接的手工衔接指引",collection:"other",type:"MD",size:"120 KB",pages:8,clearance:"L1",indexed:!0,chunks:32,tags:["员工助手"],updatedAt:"2026-07-08",author:"MSS AI变革"}],Ya=new Map(Bt.map(e=>[e.id,e.name]));function Va(e){return e.includes("cf0a2c")||e.includes("e0122f")||e.includes("rose")?"rose":e.includes("teal")||e.includes("cyan")?"teal":e.includes("emerald")||e.includes("green")?"emerald":e.includes("violet")||e.includes("purple")?"violet":e.includes("indigo")||e.includes("blue")?"indigo":e.includes("amber")||e.includes("orange")?"amber":e.includes("pink")?"pink":e.includes("sky")?"sky":e.includes("slate")?"slate":"rose"}function Xa(e){return e.map(t=>Ya.get(t)??t)}function Qa(e){const t=Xa(e.skillIds);return{id:e.id,name:e.name,description:e.desc,icon:e.icon,color:Va(e.color),persona:e.systemPrompt??`你是 ${e.name}，服务华为 MSS 营销服智枢平台。`,llm:{model:"glm-5.1",temperature:.2,maxTokens:4096},bindings:{promptId:`prompt-${e.id}`,promptName:`${e.name.replace(/\s*Agent\s*/i,"")}_BRIEF`,workflowIds:[],workflowNames:[],skillIds:e.skillIds,skillNames:t,knowledgeIds:e.chatId==="knowledge"?["kb-mss-enterprise"]:[],knowledgeNames:e.chatId==="knowledge"?["mss_enterprise_knowledge"]:[],toolIds:[],toolNames:[]},status:e.published?"online":"draft",version:"v1.0",updatedAt:"2026-07-08",author:e.author,chatId:e.chatId,tags:[e.category,e.bizLine,e.homeTag]}}function Za(e){const t=nt.filter(n=>n.skillIds.includes(e.id)).map(n=>n.name);return{id:e.id,name:e.name,displayName:e.name,description:e.desc,version:e.version.startsWith("v")?`v${e.version}`:`v${e.version}`,lifecycle:e.published?"online":"create",updatedAt:"2026-07-08",author:e.author,toolNames:e.connector?[e.connector]:[],inputSchema:"{ query: string, context?: object }",outputSchema:"{ result: object }",retry:2,timeoutMs:15e3,memoryPolicy:"session_readonly",usedByAgents:t,usedByWorkflows:[],dependsOn:[],tags:[...e.tags,e.category,e.command]}}function es(e){const t=e.toLowerCase();return t==="pdf"?"pdf":t==="xlsx"?"xlsx":t==="docx"?"docx":t==="md"?"md":"pdf"}function ts(e){const t=e.match(/([\d.]+)\s*(MB|KB|GB)/i);if(!t)return 1;const n=parseFloat(t[1]),a=t[2].toUpperCase();return a==="GB"?n*1024:a==="KB"?n/1024:n}function ns(e){return{id:e.id,name:e.title,type:es(e.type),sizeMb:ts(e.size),status:e.indexed?"indexed":"pending",chunks:e.chunks,clearanceLevel:e.clearance,updatedAt:e.updatedAt,domain:e.collection}}function as(){const e=Ja.map(ns),t=e.reduce((n,a)=>n+a.chunks,0);return{id:"kb-mss-enterprise",name:"mss_enterprise_knowledge",description:"华为 MSS 营销服企业知识库 · 按业务部门分区 · Milvus Online",status:"online",vectorDb:"Milvus",collection:"mss_enterprise_knowledge_v2",embeddingModel:"bge-large-zh-v1.5",chunkStrategy:"semantic_recursive",chunkSize:512,overlap:64,totalDocuments:e.length,totalChunks:t,storageGb:12.4,pipelineStage:"ready",updatedAt:"2026-07-08",tags:["rag","milvus","mss","biz-dept"],documents:e}}function ss(){return nt.map(Qa)}function Li(){return Bt.map(Za)}function ji(){return[as()]}const rs=I(["online","draft","testing","approved","released","deprecated","archived"]),is=I(["agent","workflow","knowledge","prompt"]),os=Y({id:g(),kind:is,name:g(),status:rs,icon:g(),description:g().optional(),chatId:g().optional(),version:g().optional()}),Ut=Y({id:g(),name:g(),namespace:g(),description:g(),memberCount:ue()}),ls=Y({workspace:Ut,chats:yn(g(),oa),resources:ne(os),defaultChatId:g()}),cs=["conversations","agents","workflows","knowledge","prompts"];function ds(){return ss().map(e=>({id:e.id,kind:"agent",name:e.name,status:"online",icon:e.icon,chatId:e.chatId,description:e.description.slice(0,80)}))}const It=ds(),ps=[{id:"kb-mss-enterprise",kind:"knowledge",name:"mss_enterprise_knowledge",status:"online",icon:"fa-database",description:"Milvus · 按业务部门分区"},{id:"prompt-qa-strict",kind:"prompt",name:"ENTERPRISE_QA_STRICT",status:"released",icon:"fa-file-lines",version:"v3",description:"抗幻觉企业问答模板"}];function ie(e){const t=e.agentSlice!=null?It.slice(0,e.agentSlice):It;return{workspace:{id:e.id,name:e.name,namespace:e.namespace,description:e.description,memberCount:e.memberCount},chats:{},defaultChatId:"",resources:[...t,...ps]}}const Wt=ie({id:_,name:"华为全球营销服",namespace:"hw.global.mkt",description:"机关职能 · 华为全球营销服务默认数据空间",memberCount:4}),ms=ie({id:"ws-apac",name:"亚太地区部",namespace:"hw.apac",description:"一线区域 · 亚太地区部作战数据空间",memberCount:4,agentSlice:8}),us=ie({id:"ws-3c-latam",name:"拉美地区部",namespace:"hw.latam",description:"一线区域 · 拉美地区部作战数据空间",memberCount:4,agentSlice:6}),fs=ie({id:"ws-mea",name:"中东地区部",namespace:"hw.mea",description:"一线区域 · 中东地区部作战数据空间",memberCount:4,agentSlice:6}),gs=ie({id:"ws-eurasia",name:"欧亚地区部",namespace:"hw.eurasia",description:"一线区域 · 欧亚地区部作战数据空间",memberCount:4,agentSlice:6}),hs=ie({id:"ws-europe",name:"欧洲地区部",namespace:"hw.europe",description:"一线区域 · 欧洲地区部作战数据空间",memberCount:4,agentSlice:6}),ze={[_]:Wt,"ws-apac":ms,"ws-3c-latam":us,"ws-mea":fs,"ws-eurasia":gs,"ws-europe":hs},$=Object.values(ze).map(e=>e.workspace);function Me(e){return ze[e]??Wt}function xs(e){var t;return{workspace:{id:e.id,name:e.name,namespace:e.namespace,description:((t=e.description)==null?void 0:t.trim())||`${e.name} 租户空间`,memberCount:e.memberCount??1},chats:{},defaultChatId:"",resources:[{id:"agent-marketing",kind:"agent",name:"营销 Agent",status:"online",icon:"fa-chart-pie"},{id:"agent-knowledge",kind:"agent",name:"知识 Agent",status:"online",icon:"fa-book-open"}]}}function Ei(e,t){return e.resources.filter(n=>n.kind===t)}function _i(e){return{online:"Online",draft:"Draft",testing:"Testing",released:"Released",approved:"Approved",deprecated:"Deprecated",archived:"Archived"}[e]}function $i(e){return{online:"text-green-600 bg-green-50 border-green-200",draft:"text-amber-600 bg-amber-50 border-amber-200",testing:"text-blue-600 bg-blue-50 border-blue-200",released:"text-indigo-600 bg-indigo-50 border-indigo-200",approved:"text-emerald-600 bg-emerald-50 border-emerald-200",deprecated:"text-slate-500 bg-slate-100 border-slate-200",archived:"text-slate-400 bg-slate-50 border-slate-200"}[e]}const zi="workspace-config",Di={"zh-CN":"中文",en:"English",es:"Español"},ks={[_]:"zh-CN","ws-apac":"en","ws-3c-latam":"es","ws-mea":"en","ws-eurasia":"en","ws-europe":"en"};function Gt(){return $.map((e,t)=>({id:e.id,enabled:!0,sortOrder:t,name:e.name,description:e.description,namespace:e.namespace,memberCount:e.memberCount,locale:ks[e.id]??"zh-CN",custom:!1}))}function Ht(e,t){var n,a,s;return t?{id:e.id,name:((n=t.name)==null?void 0:n.trim())||e.name,description:((a=t.description)==null?void 0:a.trim())||e.description,namespace:((s=t.namespace)==null?void 0:s.trim())||e.namespace,memberCount:t.memberCount??e.memberCount}:e}function bs(e){return{id:e.id,name:e.name.trim()||e.id,description:e.description.trim()||`${e.name} 租户空间`,namespace:e.namespace.trim()||e.id.replace(/^ws-/,"").replace(/-/g,"."),memberCount:e.memberCount>=0?e.memberCount:1}}function ys(){return Object.keys(ze)}function De(e){return ys().includes(e)}function Ss(e){const n=e.trim().toLowerCase().replace(/[\s_]+/g,"-").replace(/[^a-z0-9\u4e00-\u9fa5-]/g,"").replace(/-+/g,"-").replace(/^-|-$/g,"").slice(0,32).replace(/[\u4e00-\u9fa5]/g,"")||`tenant-${Date.now().toString(36)}`;return n.startsWith("ws-")?n:`ws-${n}`}function ws(){return _}function vs(e,t,n){if(!(e!=null&&e.id)||typeof e.id!="string")return null;const a=e.custom===!0||!De(e.id)&&!n,s=n??{id:e.id,name:e.id,description:"",namespace:e.id.replace(/^ws-/,"").replace(/-/g,"."),memberCount:1,locale:"zh-CN",custom:!0};return{id:e.id,enabled:e.enabled!==!1,sortOrder:typeof e.sortOrder=="number"?e.sortOrder:t,name:typeof e.name=="string"&&e.name.trim()?e.name.trim():s.name,description:typeof e.description=="string"&&e.description.trim()?e.description.trim():s.description,namespace:typeof e.namespace=="string"&&e.namespace.trim()?e.namespace.trim():s.namespace,memberCount:typeof e.memberCount=="number"&&e.memberCount>=0?e.memberCount:s.memberCount,locale:e.locale==="zh-CN"||e.locale==="en"||e.locale==="es"?e.locale:s.locale,custom:a||s.custom===!0}}function Ve(e){var i;const t=Gt();if(!e)return{defaultWorkspaceId:_,items:t};const n=new Map(t.map(o=>[o.id,o])),a=[],s=new Set;return Array.isArray(e.items)&&e.items.forEach((o,p)=>{if(!(o!=null&&o.id)||s.has(o.id))return;const d=n.get(o.id),m=vs(o,p,d);m&&(a.push(m),s.add(o.id),n.delete(o.id))}),n.forEach(o=>{s.has(o.id)||a.push(o)}),{defaultWorkspaceId:typeof e.defaultWorkspaceId=="string"&&a.some(o=>o.id===e.defaultWorkspaceId&&o.enabled)?e.defaultWorkspaceId:((i=a.find(o=>o.enabled))==null?void 0:i.id)??_,items:a.sort((o,p)=>o.sortOrder-p.sortOrder)}}function Is(){return Ve(null)}function K(e){J()&&Ls(he(),"workspace-config",{defaultWorkspaceId:e.defaultWorkspaceId,items:e.items})}function qt(e){const t=$.find(n=>n.id===e.id);return t?Ht(t,e):bs(e)}function Jt(e){const t={};return e.forEach(n=>{(n.custom||!De(n.id))&&(t[n.id]=xs({id:n.id,name:n.name,namespace:n.namespace,description:n.description,memberCount:n.memberCount}))}),t}function B(e){Ne(async()=>{const{useWorkspaceStore:t}=await Promise.resolve().then(()=>Vt);return{useWorkspaceStore:t}},void 0).then(({useWorkspaceStore:t})=>{const n=e.items.filter(s=>s.enabled).sort((s,r)=>s.sortOrder-r.sortOrder).map(qt),a=Jt(e.items);t.setState(s=>{const r={...s.catalogs};return Object.keys(r).forEach(i=>{!De(i)&&!e.items.some(o=>o.id===i)&&delete r[i]}),Object.assign(r,a),{workspaceList:n.length?n:$,catalogs:r}})})}function pe(e){Ne(async()=>{const{useWorkspaceStore:t}=await Promise.resolve().then(()=>Vt);return{useWorkspaceStore:t}},void 0).then(({useWorkspaceStore:t})=>{Ne(async()=>{const{useConversationStore:n}=await import("./page-task-Be9rRmak.js").then(a=>a.bZ);return{useConversationStore:n}},__vite__mapDeps([5,1,2,4])).then(({useConversationStore:n})=>{var o,p;const{workspaceId:a,switchWorkspace:s}=t.getState(),r=e.items.filter(d=>d.enabled);if(!r.some(d=>d.id===a)){const d=r.some(c=>c.id===e.defaultWorkspaceId)?e.defaultWorkspaceId:((o=r[0])==null?void 0:o.id)??e.defaultWorkspaceId,m=s(d);n.getState().loadWorkspace(d,m),n.setState({pushToast:`Current tenant disabled; switched to ${((p=e.items.find(c=>c.id===d))==null?void 0:p.name)??d}`})}})})}const U=be((e,t)=>({...Is(),hydrate:()=>{(async()=>{if(J())try{const a=await Xe(he(),"workspace-config");if(!a)return;const s=Ve(a);e(s),B(s),pe(s)}catch{}})()},getConfig:a=>t().items.find(s=>s.id===a),getAllConfigs:()=>[...t().items].sort((a,s)=>a.sortOrder-s.sortOrder),getVisibleWorkspaces:()=>{const a=t().items.filter(s=>s.enabled).sort((s,r)=>s.sortOrder-r.sortOrder).map(qt);return a.length?a:$},resolveWorkspace:a=>{const s=t().getConfig(a.id);return s?Ht(a,s):a},getLocale:a=>{var s;return((s=t().getConfig(a))==null?void 0:s.locale)??"zh-CN"},isEnabled:a=>{var s;return((s=t().getConfig(a))==null?void 0:s.enabled)!==!1},getDefaultWorkspaceId:()=>{var r;const{defaultWorkspaceId:a,items:s}=t();return s.some(i=>i.id===a&&i.enabled)?a:((r=s.find(i=>i.enabled))==null?void 0:r.id)??a},setDefaultWorkspaceId:a=>{if(!t().items.some(r=>r.id===a&&r.enabled))return;const s={defaultWorkspaceId:a,items:t().items};K(s),e({defaultWorkspaceId:a})},setEnabled:(a,s)=>{var m;const r=t().items.filter(c=>c.enabled).length;if(!s&&r<=1)return;const i=t().items.map(c=>c.id===a?{...c,enabled:s}:c),o=i.filter(c=>c.enabled);let p=t().defaultWorkspaceId;o.some(c=>c.id===p)||(p=((m=o[0])==null?void 0:m.id)??p);const d={defaultWorkspaceId:p,items:i};K(d),e(d),B(d),s||pe(d)},updateWorkspace:(a,s)=>{const r=t().items.map(o=>o.id===a?{...o,...s,id:a,custom:o.custom}:o),i={defaultWorkspaceId:t().defaultWorkspaceId,items:r};K(i),e({items:r}),B(i)},moveWorkspace:(a,s)=>{const r=[...t().items].sort((m,c)=>m.sortOrder-c.sortOrder),i=r.findIndex(m=>m.id===a);if(i<0)return;const o=s==="up"?i-1:i+1;if(o<0||o>=r.length)return;const p=r.map((m,c)=>c===i?{...m,sortOrder:o}:c===o?{...m,sortOrder:i}:{...m,sortOrder:c}),d={defaultWorkspaceId:t().defaultWorkspaceId,items:p};K(d),e({items:p}),B(d)},addTenant:a=>{var u,f;const s=a.name.trim();if(!s)return null;const r=new Set(t().items.map(y=>y.id));let i=Ss(s);if(r.has(i)){let y=2;for(;r.has(`${i}-${y}`);)y+=1;i=`${i}-${y}`}const o=((u=a.namespace)==null?void 0:u.trim())||i.replace(/^ws-/,"").replace(/-/g,"."),p=t().items.reduce((y,x)=>Math.max(y,x.sortOrder),-1),d={id:i,enabled:!0,sortOrder:p+1,name:s,description:((f=a.description)==null?void 0:f.trim())||`${s} tenant space`,namespace:o,memberCount:a.memberCount??1,locale:a.locale??"zh-CN",custom:!0},m=[...t().items,d],c={defaultWorkspaceId:t().defaultWorkspaceId,items:m};return K(c),e({items:m}),B(c),i},removeTenant:a=>{var d,m;const s=t().items.find(c=>c.id===a);if(!s||!s.custom&&De(a)||t().items.length<=1)return!1;const r=t().items.filter(c=>c.id!==a),i=r.filter(c=>c.enabled);let o=t().defaultWorkspaceId;i.some(c=>c.id===o)||(o=((d=i[0])==null?void 0:d.id)??((m=r[0])==null?void 0:m.id)??o);const p={defaultWorkspaceId:o,items:r};return K(p),e(p),B(p),pe(p),!0},resetToDefaults:()=>{const a={defaultWorkspaceId:_,items:Gt()};K(a),e(a),B(a),pe(a)},exportConfig:()=>{const{defaultWorkspaceId:a,items:s}=t();return JSON.stringify({defaultWorkspaceId:a,items:s},null,2)},importConfig:a=>{try{const s=JSON.parse(a),r=Ve(s);return r.items.length?(K(r),e(r),B(r),pe(r),!0):!1}catch{return!1}},enabledCount:()=>t().items.filter(a=>a.enabled).length,getCustomCatalogs:()=>Jt(t().items)})),Fi=Object.freeze(Object.defineProperty({__proto__:null,useWorkspaceConfigStore:U},Symbol.toStringTag,{value:"Module"}));async function As(){if(!N())return $;try{const e=await je(T("/api/v1/workspaces"),{},8e3);if(!e.ok)throw new Error(`HTTP ${e.status}`);const t=await e.json();return Ps(t.workspaces)}catch{return $}}async function Yt(e){var t,n;if(!N())return Me(e);try{const a=await je(T(`/api/v1/workspaces/${e}/catalog`),{},8e3);if(!a.ok)throw new Error(`HTTP ${a.status}`);const s=await a.json(),r=ls.parse(s),i=Me(e),o=Object.keys(r.chats??{}).length===0&&(((t=r.resources)==null?void 0:t.length)??0)===0,p=Object.keys(i.chats??{}).length>0||(((n=i.resources)==null?void 0:n.length)??0)>0;return o&&p?i:r}catch{return Me(e)}}async function Ts(e){const t=await Promise.all(e.map(async n=>[n,await Yt(n)]));return Object.fromEntries(t)}function We(){return ze}function Ps(e){if(!Array.isArray(e))return $;const t=e.map(n=>{try{return Ut.parse(n)}catch{return null}}).filter(n=>n!==null);return t.length>0?t:$}class Ms extends Error{constructor(n="portal_conflict",a){super(n);ht(this,"revision");this.name="PortalConflictError",this.revision=a}}function at(){return{"Content-Type":"application/json",Accept:"application/json",...V()}}async function Cs(){if(!N())return{ok:!1,llmEnvConfigured:!1};try{const e=new AbortController,t=setTimeout(()=>e.abort(),3e3),n=await fetch(T("/api/v1/health"),{signal:e.signal,headers:{Accept:"application/json",...V()}});if(clearTimeout(t),!n.ok)return{ok:!1,llmEnvConfigured:!1};if(!(n.headers.get("content-type")||"").includes("application/json"))return{ok:!1,llmEnvConfigured:!1};const s=await n.json(),r=(s==null?void 0:s.status)==="ok"&&(s==null?void 0:s.service)==="mss-claw-api";return{ok:r,llmEnvConfigured:r&&!!s.llmEnvConfigured}}catch{return{ok:!1,llmEnvConfigured:!1}}}async function Ki(e){const t=await fetch(T(`/api/v1/workspaces/${e}/sessions`),{headers:V()});if(!t.ok)throw new Error(`HTTP ${t.status}`);return(await t.json()).chats??null}async function Bi(e,t){const n=await fetch(T(`/api/v1/workspaces/${e}/sessions`),{method:"PUT",headers:at(),body:JSON.stringify({chats:t})});if(!n.ok)throw new Error(`HTTP ${n.status}`)}async function Ui(e){const t=await fetch(T(`/api/v1/workspaces/${e}/marketplace`),{headers:V()});if(!t.ok)throw new Error(`HTTP ${t.status}`);const n=await t.json();return n==null?null:typeof n=="object"?n:null}async function Wi(e,t){const n=await fetch(T(`/api/v1/workspaces/${e}/marketplace`),{method:"PUT",headers:at(),body:JSON.stringify(t)});if(!n.ok)throw new Error(`HTTP ${n.status}`)}async function Gi(e){const t=await fetch(T(`/api/v1/workspaces/${e}/portal-content`),{headers:V()});if(!t.ok)throw new Error(`HTTP ${t.status}`);const n=await t.json();if(n==null)return null;if(typeof n=="object"&&Array.isArray(n.items)){const a=typeof n.revision=="number"?n.revision:0;return{items:n.items,revision:a}}return null}async function Hi(e,t){const n=await fetch(T(`/api/v1/workspaces/${e}/portal-content`),{method:"PUT",headers:at(),body:JSON.stringify({items:t.items,expectedRevision:t.expectedRevision??0})});if(n.status===409){let s;try{s=(await n.json()).revision}catch{}throw new Ms("portal_conflict",s)}if(!n.ok)throw new Error(`HTTP ${n.status}`);const a=await n.json();return{items:Array.isArray(a.items)?a.items:t.items,revision:typeof a.revision=="number"?a.revision:(t.expectedRevision??0)+1}}const At=cs.reduce((e,t)=>(e[t]=t==="conversations"||t==="agents",e),{}),L=be((e,t)=>({workspaceId:ws(),workspaceList:U.getState().getVisibleWorkspaces(),catalogs:{...We(),...U.getState().getCustomCatalogs()},catalogReady:!1,catalogLoading:!1,apiConnected:!1,nestLlmEnvConfigured:!1,apiStatus:"unknown",expandedSections:At,selectedResourceId:null,switchToast:null,bootstrap:async()=>{if(t().catalogReady||t().catalogLoading)return;e({catalogLoading:!0});const n=a=>{const s=U.getState();e({workspaceList:s.getVisibleWorkspaces(),catalogs:{...We(),...s.getCustomCatalogs()},catalogReady:!0,catalogLoading:!1,apiConnected:!1,nestLlmEnvConfigured:!1,apiStatus:a})};try{if(!N()||On()){n("local-demo");return}const a=await Cs();if(!a.ok){n("unreachable");return}const s=U.getState(),r=await As(),i=new Set(r.map(c=>c.id)),o=s.getVisibleWorkspaces(),p=o.length?o:r,d=p.map(c=>c.id).filter(c=>i.has(c)),m={...We(),...await Ts(d),...s.getCustomCatalogs()};e({workspaceList:p,catalogs:m,catalogReady:!0,catalogLoading:!1,apiConnected:!0,nestLlmEnvConfigured:a.llmEnvConfigured,apiStatus:"connected"})}catch{n("unreachable")}},getCatalog:n=>{const{catalogs:a}=t();return a[n]??Me(n)},currentWorkspace:()=>{const n=t().getCatalog(t().workspaceId);return U.getState().resolveWorkspace(n.workspace)},switchWorkspace:n=>{if(!U.getState().isEnabled(n))return e({switchToast:"该租户已隐藏，请在「租户配置」中启用"}),t().getCatalog(t().workspaceId).defaultChatId;const s=t().getCatalog(n),r=U.getState().resolveWorkspace(s.workspace).name;return e({workspaceId:n,selectedResourceId:null,expandedSections:{...At},switchToast:`已切换到「${r}」`}),N()&&!t().catalogs[n]&&Yt(n).then(i=>{e(o=>({catalogs:{...o.catalogs,[n]:i}}))}),s.defaultChatId},toggleSection:n=>e(a=>({expandedSections:{...a.expandedSections,[n]:!a.expandedSections[n]}})),selectResource:n=>e({selectedResourceId:n}),resourceToModule:n=>({agent:"agent",workflow:"workflow",knowledge:"knowledge",prompt:"prompt"})[n],dismissSwitchToast:()=>e({switchToast:null})})),Vt=Object.freeze(Object.defineProperty({__proto__:null,WORKSPACE_LIST:$,useWorkspaceStore:L},Symbol.toStringTag,{value:"Module"}));function st(){return{"Content-Type":"application/json",Accept:"application/json",...V()}}function J(){return N()&&L.getState().apiConnected}function he(){return L.getState().workspaceId||"ws-mss-ai"}const Xt=new Map;function rt(e,t){return`${e}::${t}`}function Tt(e,t){return Xt.get(rt(e,t))??null}function Qt(e,t,n){Xt.set(rt(e,t),n)}async function Xe(e,t,n){if(!J())return n!=null&&n.fresh?null:Tt(e,t);if(!(n!=null&&n.fresh)){const i=Tt(e,t);if(i!=null)return i}const a=await fetch(T(`/api/v1/workspaces/${e}/docs/${t}`),{headers:{Accept:"application/json",...V(),...n!=null&&n.fresh?{"Cache-Control":"no-cache"}:{}},cache:n!=null&&n.fresh?"no-store":"default"});if(!a.ok)throw new Error(`docs_get_${t}_${a.status}`);const r=(await a.json()).payload??null;return r!=null&&Qt(e,t,r),r}async function Zt(e,t,n){if(!J())throw new Error("shared_api_required");const a=await fetch(T(`/api/v1/workspaces/${e}/docs/${t}`),{method:"PUT",headers:st(),body:JSON.stringify({payload:n})});if(!a.ok)throw new Error(`docs_put_${t}_${a.status}`);let s=n;if((a.headers.get("content-type")??"").includes("application/json"))try{const r=await a.json();r&&Object.prototype.hasOwnProperty.call(r,"payload")&&(s=r.payload)}catch{}Qt(e,t,s)}async function Rs(e){if(!N())return{ok:!1,error:"共享服务未启用"};const t=await je(T("/api/v1/auth/login"),{method:"POST",headers:st(),body:JSON.stringify(e)},8e3),a=(t.headers.get("content-type")||"").includes("application/json");if(!t.ok){if(t.status>=500||t.status===404||t.status===405||t.status===408||!a)throw new Error(`login_unreachable_${t.status}`);try{return{ok:!1,error:(await t.json()).error||`登录失败（HTTP ${t.status}）`}}catch{throw new Error(`login_unreachable_${t.status}`)}}if(!a)throw new Error("login_unreachable_not_json");return await t.json()}async function Ns(e){if(!N())return{ok:!1,error:"共享服务未启用"};const t=`?workspaceId=${encodeURIComponent(e)}`,n=await je(T(`/api/v1/auth/me${t}`),{headers:{Accept:"application/json",...V()}},8e3);return n.ok?await n.json():{ok:!1,error:`会话校验失败（HTTP ${n.status}）`}}async function Os(e){if(N())try{await fetch(T("/api/v1/auth/logout"),{method:"POST",headers:st(),body:JSON.stringify({workspaceId:e})})}catch{}}const Ge=new Map;function Ls(e,t,n,a=500){const s=rt(e,t);return new Promise((r,i)=>{const o=Ge.get(s);o&&clearTimeout(o.timer);const p=[...(o==null?void 0:o.waiters)??[],{resolve:r,reject:i}],d=setTimeout(()=>{Ge.delete(s),Zt(e,t,n).then(()=>p.forEach(m=>m.resolve()),m=>p.forEach(c=>c.reject(m)))},a);Ge.set(s,{timer:d,waiters:p})})}function w(...e){return Sn(wn(e))}function js(e){const t=e.match(/@([\u4e00-\u9fa5\w\s]+?)(?=\s|$|[，。！？])/g);return(t==null?void 0:t.map(n=>n.slice(1).trim()))??[]}function qi(e,t){const n=new Set(["knowledge","rd_rag"]);if(!new Set(["campaign_ops"]).has(e))return n.has(e)?"knowledge":"marketing";const s=js(t);return s.some(r=>r.includes("知识"))?"knowledge":s.some(r=>r.includes("营销")||r.includes("洞察"))?"marketing":t.includes("知识")||t.includes("SOP")||t.includes("合规")?"knowledge":"marketing"}const ae=[{id:"glm-5.1",label:"GLM 5.1",baseUrl:"https://open.bigmodel.cn/api/paas/v4",providerName:"智谱"},{id:"deepseek-v4-flash",label:"DeepSeek V4 Flash",baseUrl:"https://api.deepseek.com/v1",providerName:"DeepSeek"},{id:"deepseek-v4-pro",label:"DeepSeek V4 Pro",baseUrl:"https://api.deepseek.com/v1",providerName:"DeepSeek"},{id:"qwen3.7-plus",label:"Qwen 3.7 Plus",baseUrl:"https://dashscope.aliyuncs.com/compatible-mode/v1",providerName:"通义"}];function Se(){return ae.map(e=>({...e,apiKey:"",enabled:!0,source:"preset"}))}const G={model:ae[0].id,baseUrl:ae[0].baseUrl,apiKey:"",platformModels:Se(),defaultModelId:ae[0].id,customModels:[]},Es={"GLM-5.1":"glm-5.1","glm-5":"glm-5.1","DeepSeek-V4":"deepseek-v4-flash","DeepSeek V4":"deepseek-v4-flash","deepseek-chat":"deepseek-v4-flash","deepseek-reasoner":"deepseek-v4-flash","Qwen-3.7":"qwen3.7-plus","Qwen 3.7":"qwen3.7-plus","qwen-plus":"qwen3.7-plus","qwen-max":"qwen3.7-plus","qwen-turbo":"qwen3.7-plus","gpt-4o":"glm-5.1","gpt-4o-mini":"glm-5.1","gpt-4-turbo":"glm-5.1"};function R(e){const t=e.trim();return Es[t]??t}function _s(e){return Array.isArray(e)?e.filter(t=>!!t&&typeof t=="object").map(t=>{const n=R(String(t.id||""));if(!n)return null;const a=ae.find(s=>s.id===n);return{id:n,label:String(t.label||(a==null?void 0:a.label)||n),baseUrl:String(t.baseUrl||(a==null?void 0:a.baseUrl)||"").trim(),providerName:String(t.providerName||(a==null?void 0:a.providerName)||"平台"),apiKey:typeof t.apiKey=="string"?t.apiKey:"",enabled:t.enabled!==!1,source:t.source==="platform"||!a?"platform":"preset"}}).filter(t=>!!t):Se()}function en(e){var n;return(((n=e.platformModels)==null?void 0:n.length)>0?e.platformModels:Se()).filter(a=>a.enabled)}function tn(e){const t=R(e.model),a=(Array.isArray(e.platformModels)?e.platformModels:Se()).find(i=>i.id===t);if(a)return{id:a.id,label:a.label,baseUrl:a.baseUrl,apiKey:a.apiKey||"",providerName:a.providerName,custom:!1,platform:!0};const s=ae.find(i=>i.id===t);if(s)return{...s,apiKey:"",custom:!1,platform:!0};const r=e.customModels.find(i=>i.id===t||i.id===e.model);return r?{id:r.id,label:r.label||r.id,baseUrl:r.baseUrl,apiKey:r.apiKey||"",providerName:"自定义",custom:!0,platform:!1}:{id:t,label:t,baseUrl:"",apiKey:"",providerName:"自定义",custom:!0,platform:!1}}function Fe(e){const t=tn(e),n=(t.apiKey||e.apiKey||"").trim(),a=(t.baseUrl||e.baseUrl||"").trim();return{model:t.id,baseUrl:a,apiKey:n}}function nn(e){const t=Fe(e);return!!(t.apiKey&&t.baseUrl&&t.model)}ae[0].baseUrl;function Pt(){return{...G,platformModels:Se(),customModels:[],apiKey:""}}function $s(e,t){return Array.isArray(e)?e.filter(n=>!!n&&typeof n=="object").map(n=>{const a=R(String(n.id||""));return a?{id:a,label:String(n.label||a),baseUrl:String(n.baseUrl||"").trim(),apiKey:typeof n.apiKey=="string"&&n.apiKey?n.apiKey:t}:null}).filter(n=>!!n):[]}function Ce(e){var p,d;const t=typeof(e==null?void 0:e.apiKey)=="string"?e.apiKey:"";let n=_s(e==null?void 0:e.platformModels);t&&(n=n.map(m=>m.apiKey?m:{...m,apiKey:t}));const a=$s(e==null?void 0:e.customModels,t),s=R((e==null?void 0:e.defaultModelId)||((p=n.find(m=>m.enabled))==null?void 0:p.id)||((d=a[0])==null?void 0:d.id)||G.defaultModelId);let r=R((e==null?void 0:e.model)||s);const i=new Set([...en({platformModels:n}).map(m=>m.id),...a.map(m=>m.id)]);i.size&&!i.has(r)&&(r=i.has(s)?s:[...i][0]||G.model);const o=Fe({model:r,baseUrl:"",apiKey:"",platformModels:n,customModels:a});return{model:r,baseUrl:o.baseUrl||((e==null?void 0:e.baseUrl)||"").trim()||G.baseUrl,apiKey:o.apiKey,platformModels:n,defaultModelId:s,customModels:a}}async function zs(e){if(!J())throw new Error("shared_api_required");await Zt(he(),"llm-config",e)}function te(e,t,n,a){const s=Fe({model:e,baseUrl:"",apiKey:"",platformModels:t,customModels:n});return{model:s.model,baseUrl:s.baseUrl,apiKey:s.apiKey}}const an=be((e,t)=>({config:Pt(),settingsOpen:!1,settingsFocusAdd:!1,syncing:!1,lastError:null,hydrate:async n=>{if(!J()){e({config:Pt(),lastError:"共享 API 未连接，模型配置无法从数据库加载"});return}e({syncing:!0,lastError:null});try{const a=await Xe(he(),"llm-config",{fresh:(n==null?void 0:n.fresh)!==!1});e({config:Ce(a),syncing:!1,lastError:null})}catch(a){e({syncing:!1,lastError:a instanceof Error?a.message:"加载模型配置失败"})}},saveConfig:async n=>{if(!J())throw e({lastError:"共享 API 未连接，无法写入数据库。请先连接后端再配置模型。"}),new Error("shared_api_required");const a=Ce({...t().config,...n});e({syncing:!0,lastError:null});try{await zs(a);const s=await Xe(he(),"llm-config",{fresh:!0});e({config:Ce(s??a),syncing:!1,lastError:null})}catch(s){const r=s instanceof Error?s.message:"保存模型配置失败";throw e({syncing:!1,lastError:r}),s}},selectModel:async n=>{if(n==="__configure__"||n==="__credentials__"||n==="__extend__"){t().openSettings({focusAdd:n==="__extend__"});return}const{config:a}=t(),s=R(n);await t().saveConfig(te(s,a.platformModels,a.customModels,a.defaultModelId))},addCustomModel:async n=>{var i;const a=R(n.id.trim());if(!a)return;const{config:s}=t(),r=[...s.customModels.filter(o=>o.id!==a),{id:a,label:n.label.trim()||a,baseUrl:n.baseUrl.trim(),apiKey:((i=n.apiKey)==null?void 0:i.trim())||""}];await t().saveConfig({customModels:r,...te(a,s.platformModels,r,s.defaultModelId)})},removeCustomModel:async n=>{var i,o;const{config:a}=t(),s=a.customModels.filter(p=>p.id!==n),r=a.model===n?a.defaultModelId||((i=s[0])==null?void 0:i.id)||((o=a.platformModels.find(p=>p.enabled))==null?void 0:o.id)||G.model:a.model;await t().saveConfig({customModels:s,...te(r,a.platformModels,s,a.defaultModelId)})},upsertPlatformModel:async n=>{var d;const a=R(n.id.trim());if(!a)return;const{config:s}=t(),r=s.platformModels.find(m=>m.id===a),i={id:a,label:n.label.trim()||a,baseUrl:n.baseUrl.trim(),providerName:n.providerName.trim()||"平台",apiKey:((d=n.apiKey)==null?void 0:d.trim())??(r==null?void 0:r.apiKey)??"",enabled:n.enabled!==!1,source:"platform"};((r==null?void 0:r.source)==="preset"||n.source==="preset")&&(i.source="preset"),r||(i.source=n.source==="preset"?"preset":"platform");const o=[...s.platformModels.filter(m=>m.id!==a),i],p=s.model===a?te(a,o,s.customModels,s.defaultModelId):{};await t().saveConfig({platformModels:o,...p})},setPlatformModelApiKey:async(n,a)=>{const{config:s}=t(),r=s.platformModels.map(o=>o.id===n?{...o,apiKey:a}:o),i=s.model===n?te(n,r,s.customModels,s.defaultModelId):{};await t().saveConfig({platformModels:r,...i})},removePlatformModel:async n=>{var o,p;const{config:a}=t(),s=a.platformModels.filter(d=>d.id!==n),r={platformModels:s};a.defaultModelId===n&&(r.defaultModelId=((o=s.find(d=>d.enabled))==null?void 0:o.id)||((p=a.customModels[0])==null?void 0:p.id)||G.defaultModelId);const i=a.model===n?r.defaultModelId||a.defaultModelId:a.model;Object.assign(r,te(i,s,a.customModels,r.defaultModelId||a.defaultModelId)),await t().saveConfig(r)},setPlatformModelEnabled:async(n,a)=>{var o,p,d,m;const{config:s}=t(),r=s.platformModels.map(c=>c.id===n?{...c,enabled:a}:c),i={platformModels:r};if(!a&&s.model===n){const c=((o=r.find(u=>u.enabled))==null?void 0:o.id)||((p=s.customModels[0])==null?void 0:p.id)||G.model;Object.assign(i,te(c,r,s.customModels,s.defaultModelId))}!a&&s.defaultModelId===n&&(i.defaultModelId=((d=r.find(c=>c.enabled))==null?void 0:d.id)||((m=s.customModels[0])==null?void 0:m.id)||G.defaultModelId),await t().saveConfig(i)},setDefaultModelId:async n=>{await t().saveConfig({defaultModelId:R(n)})},openSettings:n=>e({settingsOpen:!0,settingsFocusAdd:!!(n!=null&&n.focusAdd)}),closeSettings:()=>e({settingsOpen:!1,settingsFocusAdd:!1}),requiresSharedApi:()=>J(),modelOptions:()=>{const{config:n}=t(),a=en(n).map(o=>({id:o.id,label:o.label,providerName:o.providerName,group:"platform"})),s=n.customModels.map(o=>({id:o.id,label:o.label||o.id,providerName:"自定义",group:"custom"})),r=new Set([...a,...s].map(o=>o.id)),i=n.model&&!r.has(n.model)?[{id:n.model,label:n.model,group:"custom",providerName:"自定义"}]:[];return[...a,...s,...i]},statusLabel:()=>{const{config:n}=t(),a=tn(n),{apiConnected:s,nestLlmEnvConfigured:r}=L.getState();return s?nn(n)?{text:r?`${a.label} · 模型 Key 已配 · 亦可走服务端 LLM_*`:`${a.label} · 模型 Key 已配`,configured:!0}:r?{text:`${a.label} · 服务端 LLM_* 可用`,configured:!0}:{text:`${a.label} · 当前模型未配置 API Key`,configured:!1}:{text:`${a.label} · 共享 API 未连接（无法读写库）`,configured:!1}}})),Ji=Object.freeze(Object.defineProperty({__proto__:null,normalizeLlmConfig:Ce,useLlmConfigStore:an},Symbol.toStringTag,{value:"Module"}));function it(){return an.getState().config}function Ke(){return Fe(it())}function E(e){return nn(e??it())}function ot(e){return e.trim().replace(/\/$/,"")}async function sn(e,t){var r,i,o,p;const n=Ke(),a=await fetch(`${ot(n.baseUrl)}/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n.apiKey.trim()}`},body:JSON.stringify({model:R(n.model),messages:e,max_tokens:(t==null?void 0:t.maxTokens)??512,temperature:(t==null?void 0:t.temperature)??.3,stream:!1}),signal:t==null?void 0:t.signal});if(!a.ok){const d=await a.text();throw new Error(`LLM HTTP ${a.status}: ${d.slice(0,160)}`)}return((p=(o=(i=(r=(await a.json()).choices)==null?void 0:r[0])==null?void 0:i.message)==null?void 0:o.content)==null?void 0:p.trim())??""}async function*rn(e,t){var o,p,d;const n=Ke(),a=await fetch(`${ot(n.baseUrl)}/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n.apiKey.trim()}`},body:JSON.stringify({model:R(n.model),messages:e,max_tokens:(t==null?void 0:t.maxTokens)??1200,temperature:(t==null?void 0:t.temperature)??.5,stream:!0}),signal:t==null?void 0:t.signal});if(!a.ok||!a.body){const m=await a.text().catch(()=>"");throw new Error(`LLM stream HTTP ${a.status}: ${m.slice(0,160)}`)}const s=a.body.getReader(),r=new TextDecoder;let i="";for(;;){const{done:m,value:c}=await s.read();if(m)break;i+=r.decode(c,{stream:!0});const u=i.split(`
`);i=u.pop()??"";for(const f of u){const y=f.trim();if(!y.startsWith("data:"))continue;const x=y.slice(5).trim();if(!(!x||x==="[DONE]"))try{const v=(d=(p=(o=JSON.parse(x).choices)==null?void 0:o[0])==null?void 0:p.delta)==null?void 0:d.content;v&&(yield v)}catch{}}}}function Ds(e,t){const n=e.trim();if(!n)return t;const a=n.match(/\[[\s\S]*\]/);if(a)try{const r=JSON.parse(a[0]);if(Array.isArray(r)){const i=r.map(o=>typeof o=="string"?o.trim():"").filter(Boolean).slice(0,8);if(i.length>=2)return i}}catch{}const s=n.split(`
`).map(r=>r.replace(/^[\d.\-*)\]]+\s*/,"").trim()).filter(Boolean).slice(0,8);return s.length>=2?s:t}async function Fs(e){var r;const t=e.skillNames.length?e.skillNames.join("、"):"无",a=[{role:"system",content:"你是 MSS Claw 企业 AI 任务编排助手。根据用户任务输出 4-6 个简洁、可执行的中文步骤。只返回 JSON 字符串数组，不要 markdown 代码块，不要额外解释。"+((r=e.systemPrompt)!=null&&r.trim()?`
Agent 角色设定：${e.systemPrompt.trim()}`:"")},{role:"user",content:`任务类型：${e.actionType==="knowledge"?"知识检索/RAG":"营销数据分析"}
负责 Agent：${e.agentName}
已挂载 Skill：${t}
用户任务：${e.userTask}
参考模板（可优化但保持业务语义）：${JSON.stringify(e.fallbackSteps)}`}],s=await sn(a,{maxTokens:400,temperature:.2,signal:e.signal});return Ds(s,e.fallbackSteps)}function Ks(e){var s,r;const t=((s=e.systemPrompt)==null?void 0:s.trim())||`你是 ${e.agentName}，华为营销服 MSS Claw 平台的专业 AI Agent。`,n=e.actionType==="knowledge"&&((r=e.kbContext)!=null&&r.trim())?`

【知识库检索上下文】
${e.kbContext}

请在回答中用 [1][2] 形式标注引用编号，并确保结论可溯源。`:"";return[{role:"system",content:`${t}

请基于已确认的执行计划完成用户任务，输出结构清晰的中文 markdown 回复。
计划步骤：
${e.planSteps.map((i,o)=>`${o+1}. ${i}`).join(`
`)}
若为知识类任务，请标注引用来源；若为分析类任务，给出结论与建议。`+n},{role:"user",content:e.userTask}]}function Bs(e){return e.map((t,n)=>({skill:`PlanStep_${n+1}`,time:`${120+n*90}ms`,label:t,detail:t}))}function Us(e){return new Promise(t=>setTimeout(t,e))}async function*Ws(e){const{signal:t,planSteps:n,actionType:a,agentName:s,message:r,systemPrompt:i,kbContext:o}=e;if(t!=null&&t.aborted)return;const p=performance.now();yield{type:"execution_start",executionId:`llm_${Date.now()}`};for(let c=0;c<n.length;c++){if(t!=null&&t.aborted)return;const u=n[c],f=`PlanStep_${c+1}`;if(yield{type:"skill_start",skill:f,label:u},await Us(120+Math.floor(Math.random()*80)),t!=null&&t.aborted)return;yield{type:"skill_end",skill:f,latency:`${120+c*90}ms`}}const d=Ks({userTask:r,actionType:a,agentName:s,systemPrompt:i,planSteps:n,kbContext:o});try{for await(const c of rn(d,{signal:t,maxTokens:1200})){if(t!=null&&t.aborted)return;yield{type:"token",content:c}}}catch(c){yield{type:"error",message:c instanceof Error?c.message:"LLM 流式响应失败"};return}const m=((performance.now()-p)/1e3).toFixed(2);yield{type:"artifact",agentType:a},yield{type:"done",totalTime:`${m}s`,steps:Bs(n),agentName:s}}async function Gs(e,t){var r;if(!E())return"";const n=e.trim().slice(0,400);if(!n)return"";const a=t!=null&&t.agentName?`绑定专家：${t.agentName}
`:"";return((r=(await sn([{role:"system",content:"你是任务标题助手。根据用户任务描述生成简洁中文标题：不超过16个字，不要引号，不要句号，不要「标题：」前缀，只输出标题本身。"},{role:"user",content:`${a}任务描述：
${n}`}],{maxTokens:32,temperature:.2,signal:t==null?void 0:t.signal})).replace(/^["'「『]|["'」』]$/g,"").replace(/^(标题|任务名)\s*[:：]\s*/u,"").split(/[\r\n]/)[0])==null?void 0:r.trim())??""}async function Hs(e){const t=e.apiKey.trim(),n=ot(e.baseUrl),a=R(e.model);if(!t)return{ok:!1,message:"请先填写 API Key"};if(!n)return{ok:!1,message:"请先填写 Base URL"};if(!a)return{ok:!1,message:"请先填写模型名称"};try{const s=await fetch(`${n}/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`},body:JSON.stringify({model:a,messages:[{role:"user",content:"ping"}],max_tokens:8})});if(s.ok)return{ok:!0,message:"连接成功 · 模型可用"};const r=await s.text();return{ok:!1,message:`失败 HTTP ${s.status}：${r.slice(0,120)}`}}catch(s){return{ok:!1,message:`连接失败：${s instanceof Error?s.message:String(s)}`}}}const Yi=Object.freeze(Object.defineProperty({__proto__:null,generatePlanStepsWithLlm:Fs,getActiveLlmConfig:it,getActiveLlmRuntime:Ke,isLlmConfigured:E,llmExecutionStream:Ws,refineTaskTitleWithLlm:Gs,streamChatCompletion:rn,testLlmConnection:Hs},Symbol.toStringTag,{value:"Module"}));function Te(e,t,n="application/json"){const a=new Blob([t],{type:n}),s=URL.createObjectURL(a),r=document.createElement("a");r.href=s,r.download=e,r.click(),URL.revokeObjectURL(s)}function qs({open:e,title:t,onClose:n,children:a,actions:s,size:r="md",elevate:i=!1,header:o,fitContent:p=!1}){if(!e)return null;const d=r==="fullscreen",m=r==="xl"||r==="2xl",c=d?"h-[min(96vh,calc(100%-1rem))] max-h-none max-w-none":r==="2xl"?p?"max-h-[94vh] max-w-6xl":"h-[min(94vh,920px)] max-w-6xl":r==="xl"?p?"max-h-[92vh] max-w-5xl":"h-[min(92vh,880px)] max-w-5xl":r==="lg"?"max-h-[85vh] max-w-2xl":"max-h-[85vh] max-w-lg";return l.jsx("div",{className:w("modal-backdrop fixed inset-0 flex items-center justify-center",d?"bg-black/55 p-2 md:p-3":"p-4",i?"z-[120]":"z-[100]"),onClick:u=>u.target===u.currentTarget&&n(),children:l.jsxs("div",{className:w("flex w-full flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-apple-lg",c),children:[o??l.jsxs("div",{className:w("flex shrink-0 items-center justify-between border-b border-black/[0.06]",d||m?"px-5 py-3":"px-5 py-4"),children:[l.jsx("h3",{className:"truncate text-[15px] font-semibold text-[#1d1d1f]",children:t}),l.jsx("button",{type:"button",onClick:n,className:"text-[#86868b] transition hover:text-[#1d1d1f]",children:l.jsx("i",{className:"fa-solid fa-xmark"})})]}),l.jsx("div",{className:w(d?"min-h-0 flex-1 overflow-hidden p-3 md:p-4":m?"min-h-0 flex-1 overflow-y-auto p-0":"max-h-[60vh] overflow-y-auto p-5"),children:a}),s&&l.jsx("div",{className:w("flex w-full shrink-0 items-center justify-end gap-2 border-t border-black/[0.06] bg-[#fafafa]/50",d||m?"px-5 py-3":"px-5 py-4"),children:s})]})})}function Vi({title:e,subtitle:t,actions:n,tip:a}){return l.jsxs("div",{className:"mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end",children:[l.jsxs("div",{className:"max-w-2xl",children:[l.jsx("p",{className:"mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400",children:"MSS Claw"}),l.jsxs("div",{className:"flex flex-wrap items-center gap-2",children:[l.jsx("h2",{className:"text-[20px] font-semibold tracking-tight text-zinc-900 md:text-[22px]",children:e}),a?l.jsx(Js,{children:a}):null]}),l.jsx("p",{className:"mt-1 text-[12px] leading-relaxed text-zinc-500",children:t})]}),n&&l.jsx("div",{className:"flex flex-wrap items-center gap-2",children:n})]})}function Js({children:e}){const[t,n]=A.useState(!1);return l.jsxs("div",{className:"relative inline-flex items-center",children:[l.jsxs("button",{type:"button",onClick:()=>n(a=>!a),onBlur:()=>setTimeout(()=>n(!1),150),className:w("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition",t?"border-claw-600/30 bg-claw-50 text-claw-700":"border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-800"),"aria-expanded":t,"aria-label":"快速上手",children:[l.jsx("i",{className:"fa-solid fa-lightbulb text-[9px]"}),"快速上手"]}),t?l.jsxs("div",{className:"absolute left-0 top-[calc(100%+6px)] z-30 w-[min(320px,80vw)] rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[11px] leading-relaxed text-zinc-600 shadow-lg",children:[l.jsx("p",{className:"mb-1 text-[10px] font-semibold tracking-wide text-zinc-400",children:"快速上手"}),l.jsx("div",{className:"learning-callout-inline",children:e})]}):null]})}function Xi({value:e,onChange:t,placeholder:n,className:a="w-full max-w-[12rem] sm:w-48"}){return l.jsx("input",{type:"text",value:e,onChange:s=>t(s.target.value),placeholder:n,className:`apple-input ${a}`})}function Qi({items:e}){return l.jsx("div",{className:"mb-4 grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]",children:e.map(([t,n])=>l.jsxs("div",{className:"apple-card p-3",children:[l.jsx("p",{className:"text-[9px] font-semibold uppercase tracking-wide text-zinc-500",children:t}),l.jsx("p",{className:"mt-1 text-lg font-semibold tabular-nums tracking-tight text-zinc-900",children:n})]},t))})}function Ys(e){return e.trim().replace(/\/$/,"")}async function on(e,t){var r,i,o,p;const n=Ke(),a=await fetch(`${Ys(n.baseUrl)}/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n.apiKey.trim()}`},body:JSON.stringify({model:R(n.model),messages:e,max_tokens:(t==null?void 0:t.maxTokens)??3200,temperature:(t==null?void 0:t.temperature)??.4,stream:!1}),signal:t==null?void 0:t.signal});if(!a.ok){const d=await a.text();throw new Error(`LLM HTTP ${a.status}: ${d.slice(0,160)}`)}return((p=(o=(i=(r=(await a.json()).choices)==null?void 0:r[0])==null?void 0:i.message)==null?void 0:o.content)==null?void 0:p.trim())??""}function Vs(e){let t=e.trim();return t=t.replace(/^```(?:html|HTML|json|JSON|xml)?\s*\n?/i,""),t=t.replace(/\n?```\s*$/i,""),t.trim()}function ln(e){const t=Vs(e);try{return JSON.parse(t)}catch{const n=t.indexOf("{"),a=t.lastIndexOf("}");if(n>=0&&a>n)try{return JSON.parse(t.slice(n,a+1))}catch{return null}return null}}async function Xs(e){if(!E())throw new Error("LLM 未配置");const t=e.markdown.slice(0,12e3),n=e.type==="knowledge"?"知识检索 / 合规 / SOP / 引用溯源":"营销数据 / 经营分析 / 渠道与代表处",a=await on([{role:"system",content:["你是企业多场景分析报告架构师。根据 Markdown 提炼「分析看板」结构化 JSON，供前端固定模板渲染。","只返回 JSON，不要代码块，不要解释。字段：","{",'  "executiveSummary": "一句话摘要（≤80字）",','  "metrics": [{"label":"指标名","value":"如 +8.2% 或 #1","tone":"up|down|neutral|warn","hint":"可选"}],','  "insights": [{"title":"短标题","text":"发现陈述","kind":"finding|risk|action|cite"}],','  "risks": ["风险句"],','  "actions": ["行动句"],','  "cites": ["溯源/引用句"],','  "sectionOverview": [{"title":"章节名","pointCount":3}]',"}","要求：","1) 紧扣场景语义提炼，适配营销/知识/培训/电商等不同材料，不要套固定话术。","2) 不得编造原文没有的数字或事实；可归纳改写，但必须可追溯到 Markdown。","3) metrics 2-4 个；insights 2-4 个；risks/actions 各 1-4 条；尽量保留关键百分比与专有名词。"].join(`
`)},{role:"user",content:[`场景倾向：${n}`,`Agent：${e.agentName||"Agent"}`,`任务：${e.query||"（未填）"}`,"","Markdown 全文：",t].join(`
`)}],{maxTokens:2200,temperature:.35,signal:e.signal}),s=ln(a);if(!s)throw new Error("LLM 未返回有效分析看板 JSON");const r=Array.isArray(s.metrics)?s.metrics:[],i=Array.isArray(s.insights)?s.insights:[];return{executiveSummary:typeof s.executiveSummary=="string"?s.executiveSummary:void 0,metrics:r,insights:i,risks:Array.isArray(s.risks)?s.risks.map(String):void 0,actions:Array.isArray(s.actions)?s.actions.map(String):void 0,cites:Array.isArray(s.cites)?s.cites.map(String):void 0,sectionOverview:Array.isArray(s.sectionOverview)?s.sectionOverview:void 0,source:"model"}}async function Qs(e){if(!E())throw new Error("LLM 未配置");const t=e.markdown.slice(0,14e3),n=[`Agent：${e.agentName||"Agent"}`,`任务：${e.query||"（未填）"}`].join(`
`),a=await on([{role:"system",content:["你是企业高管汇报 PPT 结构专家。根据 Markdown 提炼幻灯片。","硬性要求：","1) 覆盖原文全部主要章节与关键结论/数据/建议，不得只摘前两段。",'2) 只返回 JSON：{"slides":[{"title":"...","bullets":["..."]}]}，不要代码块，不要解释。',"3) 建议 4-10 页：第 1 页封面（标题+背景），其后每章一页或合并极短章节；每页 3-7 条 bullets，bullet 用完整业务语句，保留关键数字。","4) 不要空泛套话；bullet 必须能追溯到原文信息。"].join(`
`)},{role:"user",content:`${n}

Markdown 全文：
${t}`}],{maxTokens:2800,temperature:.3,signal:e.signal}),s=ln(a),r=s==null?void 0:s.slides;if(!Array.isArray(r)||!r.length)throw new Error("LLM 未返回有效 PPT");return{slides:r.slice(0,12).map(i=>({title:String(i.title||"要点"),bullets:Array.isArray(i.bullets)?i.bullets.map(o=>String(o)).filter(Boolean).slice(0,10):["（无要点）"]}))}}function Zs(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function W(e){let t=Zs(e);return t=t.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>"),t=t.replace(/__(.+?)__/g,"<strong>$1</strong>"),t=t.replace(/`([^`]+)`/g,"<code>$1</code>"),t=t.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2">$1</a>'),t=t.replace(/(^|[\s（(「])\*([^*\n]+)\*(?=[\s）)」.,，。!！?？]|$)/g,"$1<em>$2</em>"),t}function xe(e){let t=e.trim();return t.startsWith("|")&&(t=t.slice(1)),t.endsWith("|")&&(t=t.slice(0,-1)),t.split("|").map(n=>n.trim())}function H(e){const t=e.trim();return t.includes("-")?/^\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$/.test(t)||/^\|?(\s*:?-{3,}:?\s*\|)+\s*$/.test(t):!1}function Re(e){const t=e.trim();if(!t.includes("|"))return!1;if(H(t))return!0;const n=xe(t);return n.length>=2&&n.some(a=>a.length>0)}function er(e){const t=e.trim();if(!t.includes("|")||!/\|[\t ]*:?-{3,}/.test(t))return null;const a=/\|?(?:\s*:?-{3,}:?\s*\|)+(?:\s*:?-{3,}:?\s*)?\|?/.exec(t);if(!a||a.index==null)return null;const s=t.slice(0,a.index).trim(),r=a[0].trim().startsWith("|")?a[0].trim():`|${a[0].trim()}`;let i=t.slice(a.index+a[0].length).trim();if(!s.includes("|"))return null;const p=xe(s).length;if(p<2)return null;const d=[s.startsWith("|")?s:`| ${s} |`,r.endsWith("|")?r:`${r}|`];if(!i)return d;const m=i.split(/\|\s*\|/).map(u=>u.trim()).filter(Boolean).map(u=>{const f=u.startsWith("|")?u:`| ${u}`;return f.endsWith("|")?f:`${f} |`});if(m.length>=1)return d.push(...m),d;const c=xe(i.startsWith("|")?i:`| ${i}`);for(let u=0;u+p<=c.length;u+=p){const f=c.slice(u,u+p);f.every(y=>!y)||d.push(`| ${f.join(" | ")} |`)}return d.length>=3?d:null}function Mt(e){const t=e.map(o=>o.trim()).filter(Boolean);if(t.length<2)return"";let n=t[0],a=t.slice(1);a[0]&&H(a[0])&&(a=a.slice(1));const s=xe(n);if(s.length<2)return"";const r=`<thead><tr>${s.map(o=>`<th>${W(o)}</th>`).join("")}</tr></thead>`,i=`<tbody>${a.filter(o=>!H(o)).map(o=>{const p=xe(o);for(;p.length<s.length;)p.push("");return`<tr>${p.slice(0,s.length).map(d=>`<td>${W(d)}</td>`).join("")}</tr>`}).join("")}</tbody>`;return`<div class="md-table-wrap"><table class="md-table">${r}${i}</table></div>`}function tr(e){const n=e.replace(/\r\n/g,`
`).split(`
`).flatMap(m=>er(m)??[m]),a=[];let s=0,r=!1,i=!1,o=[];const p=()=>{r&&(a.push("</ul>"),r=!1),i&&(a.push("</ol>"),i=!1)},d=()=>{if(!o.length)return;const m=o.join(" ").trim();m&&a.push(`<p>${W(m)}</p>`),o=[]};for(;s<n.length;){const u=(n[s]??"").trimEnd().trim();if(!u){d(),p(),s+=1;continue}if(Re(u)){const k=(n[s+1]??"").trim();if(H(u)||H(k)||Re(k)&&u.includes("|")&&k.includes("|")||H(k)){d(),p();const O=[];for(;s<n.length&&Re((n[s]??"").trim());)O.push((n[s]??"").trim()),s+=1;O.length>=2&&!H(O[0])?a.push(Mt(O)):O.length>=3&&a.push(Mt(O.slice(1)));continue}}if(/^---+$/.test(u)||/^\*\*\*+$/.test(u)){d(),p(),a.push("<hr/>"),s+=1;continue}const f=/^(#{1,4})\s+(.+)$/.exec(u);if(f){d(),p();const k=f[1].length;a.push(`<h${k}>${W(f[2])}</h${k}>`),s+=1;continue}if(/^>\s?/.test(u)){d(),p();const k=[];for(;s<n.length&&/^>\s?/.test((n[s]??"").trim());)k.push((n[s]??"").trim().replace(/^>\s?/,"")),s+=1;a.push(`<blockquote>${W(k.join(" "))}</blockquote>`);continue}const y=/^[-*·]\s+(.+)$/.exec(u);if(y){d(),i&&(a.push("</ol>"),i=!1),r||(a.push("<ul>"),r=!0),a.push(`<li>${W(y[1])}</li>`),s+=1;continue}const x=/^(\d+)[.)]\s+(.+)$/.exec(u);if(x){const k=x[2].trim(),v=k.length<=48&&!/[。；;！？!?]$/.test(k)&&(/表|图|归因|建议|结论|摘要|指标|分析|说明|概况|概述|TOP|可视化/.test(k)||k.length<=24);if(d(),v){p(),a.push(`<h3>${W(k)}</h3>`),s+=1;continue}r&&(a.push("</ul>"),r=!1),i||(a.push("<ol>"),i=!0),a.push(`<li>${W(k)}</li>`),s+=1;continue}p(),o.push(u),s+=1}return d(),p(),a.join(`
`)}function lt(e){const t=e.replace(/\r\n/g,`
`).split(`
`),n=[];let a="",s=1,r=[],i=!1;const o=()=>{const p=r.join(`
`).trim();!i&&!p||(n.push({heading:a||(n.length===0?"概述":`要点 ${n.length+1}`),body:p,level:s}),r=[])};for(const p of t){const d=/^(#{1,4})\s+(.+)$/.exec(p.trim());if(d){(i||r.some(m=>m.trim()))&&o(),a=d[2].trim(),s=d[1].length,i=!0;continue}r.push(p)}return o(),n}function re(e,t=10){const n=e.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),a=[];for(const s of n){if(/^---+$/.test(s)||/^>\s?/.test(s)||Re(s)||H(s))continue;const i=s.replace(/^[-*·]\s+/,"").replace(/^\d+[.)]\s+/,"").trim().replace(/\*\*(.+?)\*\*/g,"$1").replace(/\*(.+?)\*/g,"$1").replace(/`([^`]+)`/g,"$1").trim();if(i){if(!/^[-*·\d]/.test(s)&&i.length>90&&/[。；;]/.test(i)){const o=i.split(new RegExp("(?<=[。；;])\\s*")).map(p=>p.trim()).filter(p=>p.length>=6);for(const p of o)if(a.push(p.length>140?`${p.slice(0,138)}…`:p),a.length>=t)return a;continue}if(a.push(i.length>140?`${i.slice(0,138)}…`:i),a.length>=t)break}}if(!a.length){const s=e.replace(/\s+/g," ").trim();s&&a.push(s.length>140?`${s.slice(0,138)}…`:s)}return a}function M(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function q(e){return e.replace(/\*\*(.+?)\*\*/g,"$1").replace(/\*(.+?)\*/g,"$1").replace(/`([^`]+)`/g,"$1").replace(/\[([^\]]+)\]\([^)]+\)/g,"$1").trim()}function nr(e){const t=[],n=new Set,a=e.replace(/\*\*(.+?)\*\*/g,"$1").replace(/\*(.+?)\*/g,"$1").replace(/`([^`]+)`/g,"$1"),s=(d,m,c)=>{const u=q(d).replace(/[-*·:：]+$/g,"").trim()||"指标",f=Number(m),y=`${m}%`,x=`${u}|${y}`;n.has(x)||t.length>=6||(n.add(x),t.push({label:u.slice(0,18),value:y,tone:f>0?"up":f<0?"down":"neutral",hint:c}))},r=/([A-Za-z\u4e00-\u9fff][A-Za-z0-9\u4e00-\u9fff/\s]{0,20}?)\s*[:：]?\s*([+-]?\d+(?:\.\d+)?)\s*%/g;let i;for(;(i=r.exec(a))&&t.length<6;)s(i[1],i[2],"来自 Markdown 数值");const o=/(环比|同比|增长|下降|转化|占比|提升|回落)\s*([+-]?\d+(?:\.\d+)?)\s*%/g;for(;(i=o.exec(a))&&t.length<6;)s(i[1],i[2]);const p=/([A-Za-z\u4e00-\u9fff]{2,12}).{0,8}(?:排名|第)\s*(\d{1,2})\b/g;for(;(i=p.exec(a))&&t.length<6;){const d=`${q(i[1]).slice(0,10)}排名`,m=`#${i[2]}`,c=`${d}|${m}`;n.has(c)||(n.add(c),t.push({label:d,value:m,tone:"neutral",hint:"位次"}))}return t.slice(0,4)}function ar(e){const t=lt(e),n=[],a=re(e,24),s=r=>{n.some(i=>i.text===r.text)||n.push(r)};for(const r of a){const i=q(r);if(!(i.length<8)&&(/风险|合规|避免|警告|需复核|不得|禁止/.test(i)?s({title:"风险提示",text:i,kind:"risk"}):/建议|下一步|启动|同步|复核|提交|执行/.test(i)?s({title:"行动建议",text:i,kind:"action"}):/引用|来源|指南|规范|SOP|文档/.test(i)&&n.filter(o=>o.kind==="cite").length<2?s({title:"溯源引用",text:i,kind:"cite"}):n.filter(o=>o.kind==="finding").length<4&&s({title:"关键发现",text:i,kind:"finding"}),n.length>=8))break}for(const r of t){const i=r.heading,o=re(r.body,4);if(o.length){if(/结论|摘要|发现|洞察/.test(i))for(const p of o.slice(0,2))s({title:i,text:q(p),kind:"finding"});if(/下一步|建议|行动/.test(i))for(const p of o.slice(0,3))s({title:i,text:q(p),kind:"action"});if(/引用|来源|溯源/.test(i))for(const p of o.slice(0,2))s({title:i,text:q(p),kind:"cite"})}}return n.slice(0,8)}function Ct(e){return e==="up"?"kpi-up":e==="down"?"kpi-down":e==="warn"?"kpi-warn":"kpi-neutral"}function sr(e){return e==="risk"?{label:"风险",cls:"tag-risk"}:e==="action"?{label:"行动",cls:"tag-action"}:e==="cite"?{label:"溯源",cls:"tag-cite"}:{label:"发现",cls:"tag-find"}}function rr(e){const t=Math.abs(Number(String(e).replace("%","")));return Number.isFinite(t)?Math.max(12,Math.min(100,t*(t<=20?4:1))):40}function ct(e,t){var c;const n=nr(e),a=ar(e),s=lt(e),r=a.filter(u=>u.kind==="finding"),i=a.filter(u=>u.kind==="risk").map(u=>u.text),o=a.filter(u=>u.kind==="action").map(u=>u.text),p=a.filter(u=>u.kind==="cite").map(u=>u.text),d=n.length>0?n:[{label:"章节覆盖",value:String(Math.max(1,s.length)),tone:"neutral",hint:"Markdown 章节"},{label:"提炼要点",value:String(Math.max(1,a.length)),tone:"up",hint:"自动抽取"},{label:"报告类型",value:(t==null?void 0:t.type)==="knowledge"?"知识":"分析",tone:"neutral"}];return{executiveSummary:(q(((c=r[0]||a[0])==null?void 0:c.text)||re(e,1)[0]||"")||"已根据 Markdown 完成结构化分析，详见下方看板与正文。").slice(0,160),metrics:d.slice(0,4),insights:(r.length?r:a).slice(0,4),risks:i.slice(0,4),actions:o.slice(0,4),cites:p.slice(0,3),sectionOverview:s.slice(0,6).map(u=>({title:u.heading,pointCount:re(u.body,20).length})),source:"local"}}function ir(e,t){if(!t)return e;const n=c=>c==="up"||c==="down"||c==="neutral"||c==="warn",a=(t.metrics||[]).map(c=>({label:String((c==null?void 0:c.label)||"").trim().slice(0,18),value:String((c==null?void 0:c.value)||"").trim().slice(0,24),tone:n(c==null?void 0:c.tone)?c.tone:"neutral",hint:c!=null&&c.hint?String(c.hint).slice(0,24):"模型提炼"})).filter(c=>c.label&&c.value),s=(t.insights||[]).map(c=>({title:String((c==null?void 0:c.title)||"关键发现").trim().slice(0,40),text:String((c==null?void 0:c.text)||"").trim().slice(0,200),kind:(c==null?void 0:c.kind)==="risk"||(c==null?void 0:c.kind)==="action"||(c==null?void 0:c.kind)==="cite"||(c==null?void 0:c.kind)==="finding"?c.kind:"finding"})).filter(c=>c.text),r=(t.risks||[]).map(c=>String(c).trim()).filter(Boolean).slice(0,4),i=(t.actions||[]).map(c=>String(c).trim()).filter(Boolean).slice(0,4),o=(t.cites||[]).map(c=>String(c).trim()).filter(Boolean).slice(0,3),p=(t.sectionOverview||[]).map(c=>({title:String((c==null?void 0:c.title)||"").trim(),pointCount:Number(c==null?void 0:c.pointCount)||0})).filter(c=>c.title).slice(0,6),d=String(t.executiveSummary||"").trim().slice(0,160);return!!d&&(a.length>=2||s.length>=2||i.length+r.length>=2)?{executiveSummary:d||e.executiveSummary,metrics:a.length?a.slice(0,4):e.metrics,insights:s.length?s.slice(0,4):e.insights,risks:r.length?r:e.risks,actions:i.length?i:e.actions,cites:o.length?o:e.cites,sectionOverview:p.length?p:e.sectionOverview,source:"model"}:e}function or(e,t){const n=(t==null?void 0:t.board)??ct(e,t),a=n.insights.filter(f=>f.kind==="finding").slice(0,3),s=n.metrics.slice(0,4),r=s.filter(f=>/%|％/.test(f.value)).slice(0,4),i=n.source==="model"?"模型按场景提炼 · 本地模板排版":"本地规则抽取 · 模板排版",o=s.map(f=>`<div class="kpi ${Ct(f.tone)}">
      <div class="kpi-label">${M(f.label)}</div>
      <div class="kpi-value">${M(f.value)}</div>
      ${f.hint?`<div class="kpi-hint">${M(f.hint)}</div>`:""}
    </div>`).join(""),p=r.length>=2?`<div class="panel">
      <div class="panel-hd"><span>指标对照</span><span class="muted">${n.source==="model"?"模型提炼数值":"由文中百分比生成"}</span></div>
      <div class="bars">
        ${r.map(f=>`<div class="bar-row">
          <div class="bar-label">${M(f.label)}</div>
          <div class="bar-track"><div class="bar-fill ${Ct(f.tone)}" style="width:${rr(f.value)}%"></div></div>
          <div class="bar-val">${M(f.value)}</div>
        </div>`).join("")}
      </div>
    </div>`:`<div class="panel">
      <div class="panel-hd"><span>结构概览</span><span class="muted">章节拆解</span></div>
      <div class="struct-grid">
        ${n.sectionOverview.slice(0,6).map((f,y)=>`<div class="struct-item">
          <span class="struct-idx">${y+1}</span>
          <span class="struct-title">${M(f.title)}</span>
          <span class="struct-len">${f.pointCount} 要点</span>
        </div>`).join("")}
      </div>
    </div>`,d=(a.length?a:n.insights.slice(0,3)).map(f=>{const y=sr(f.kind);return`<div class="insight-card">
        <span class="tag ${y.cls}">${y.label}</span>
        <h4>${M(f.title)}</h4>
        <p>${M(f.text)}</p>
      </div>`}).join(""),m=n.risks.length>0?n.risks.map(f=>`<li>${M(f)}</li>`).join(""):"<li>文中未检出显式风险词；请结合正文复核业务口径。</li>",c=n.actions.length>0?n.actions.map((f,y)=>`<li><span class="step">${y+1}</span>${M(f)}</li>`).join(""):'<li><span class="step">1</span>复核正文结论后同步相关 Owner。</li>',u=n.cites.length>0?`<div class="panel cite-panel">
      <div class="panel-hd"><span>溯源要点</span><span class="muted">${n.source==="model"?"模型归纳":"来自引用相关语句"}</span></div>
      <ul class="cite-list">${n.cites.map(f=>`<li>${M(f)}</li>`).join("")}</ul>
    </div>`:"";return`
<section class="analysis">
  <div class="analysis-hd">
    <div>
      <p class="analysis-eyebrow">ANALYSIS BOARD</p>
      <h2>智能分析看板</h2>
      <p class="analysis-desc">${M(i)}：指标、发现、风险与行动，便于多场景快速阅览。</p>
    </div>
    <div class="exec-pill">
      <span class="exec-label">一句话摘要</span>
      <p>${M(q(n.executiveSummary).slice(0,160))}</p>
    </div>
  </div>

  <div class="kpi-grid">${o}</div>

  <div class="split">
    ${p}
    <div class="panel">
      <div class="panel-hd"><span>关键发现</span><span class="muted">${n.source==="model"?"模型聚类":"自动聚类"}</span></div>
      <div class="insight-grid">${d||'<p class="muted">暂无提炼要点</p>'}</div>
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
</section>`}const lr=`
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
`;function cr(e){return e!=null&&e.length?e.join(" · "):""}function dr(e,t){var a;const n=/^#\s+(.+)$/m.exec(e);return((a=n==null?void 0:n[1])==null?void 0:a.trim())||t}function pr(e){return/[+-]?\d+(\.\d+)?%|#\d+|第\s*\d+|环比|同比|万元|GMV|SO\b/.test(e)}function cn(e){return e.length?e.filter(pr).length>=Math.ceil(e.length*.5)&&e.length<=6?"metrics":e.length<=6?"cards":"list":"list"}function Qe(e,t=72){const n=e.replace(/\s+/g," ").trim();return n.length>t?`${n.slice(0,t-1)}…`:n}function dn(e,t){var d,m,c;const n=((d=t==null?void 0:t.title)==null?void 0:d.trim())||((m=e[0])==null?void 0:m.title)||"业务汇报",a=e.filter(u=>u.role!=="cover"&&u.role!=="closing").filter(u=>!/谢谢|thank\s*you|致谢/i.test(u.title)).map(u=>({...u,role:u.role||"content",layout:u.layout||cn(u.bullets),bullets:u.bullets.map(f=>Qe(f,88)).slice(0,6)})),s=a[0]&&a[0].title===n&&a[0].bullets.every(u=>/Agent|Skill|任务|基于/.test(u))?a.slice(1):a,r=s.slice(0,5).map((u,f)=>`${f+1}. ${u.title}`),i={role:"cover",layout:"cover",title:n,subtitle:"MSS Claw · 智能交付汇报",bullets:[],meta:[t!=null&&t.agentName?`汇报人：${t.agentName}`:"MSS AI 提效作战平台",(c=t==null?void 0:t.skills)!=null&&c.length?`能力：${cr(t.skills)}`:"基于 Markdown 智能生成",t!=null&&t.query?`议题：${t.query.slice(0,42)}`:new Date().toLocaleDateString("zh-CN")]},o=r.length>=2?{role:"agenda",layout:"cards",title:"汇报议程",subtitle:"Agenda",bullets:r}:null,p={role:"closing",layout:"closing",title:"谢谢",subtitle:"Thank You",bullets:["欢迎交流与反馈","MSS Claw · 让业务交付更高效"],meta:[(t==null?void 0:t.agentName)||"MSS Claw",new Date().toLocaleDateString("zh-CN")]};return[i,...o?[o]:[],...s.slice(0,8),p]}function mr(e,t){const n=lt(e),a=dr(e,"业务汇报"),s=[];for(const r of n){if(r.level===1&&r.heading===a&&!r.body.trim())continue;const i=re(r.body,8).filter(o=>!o.includes("|")&&!/^[-:]+$/.test(o)).map(o=>Qe(o,88));!i.length&&r.level===1||i.length&&s.push({role:"content",title:r.heading.replace(/^\d+[.)]\s*/,""),bullets:i,layout:cn(i)})}return s.length||s.push({role:"content",title:"核心要点",bullets:re(e,6).map(r=>Qe(r,88)),layout:"cards"}),dn(s,{title:a,agentName:t==null?void 0:t.agentName,query:t==null?void 0:t.query,skills:t==null?void 0:t.skills})}function ur(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}function fr(e,t,n){const a=new Uint8Array(t.byteLength);a.set(t);const s=new Blob([a],{type:n}),r=URL.createObjectURL(s),i=document.createElement("a");i.href=r,i.download=e,i.click(),URL.revokeObjectURL(r)}function gr(e,t="l"){return`<p:txBody><a:bodyPr/><a:lstStyle/>${e.map((a,s)=>{const r=(a.size??18)*100,i=a.bold?"<a:b/>":"",o=a.color??"1A1A1A";return`<a:p>
  <a:pPr algn="${t}">
    <a:spcBef><a:spcPts val="${s===0?0:120}"/></a:spcBef>
  </a:pPr>
  <a:r>
    <a:rPr lang="zh-CN" sz="${r}" dirty="0">${i}<a:solidFill><a:srgbClr val="${o}"/></a:solidFill>
      <a:latin typeface="Microsoft YaHei"/><a:ea typeface="Microsoft YaHei"/>
    </a:rPr>
    <a:t>${ur(a.text)}</a:t>
  </a:r>
  <a:endParaRPr lang="zh-CN" sz="${r}"/>
</a:p>`}).join("")}</p:txBody>`}let Ze=10;function hr(){return Ze+=1,Ze}function C(e){var n;const t=(n=e.lines)!=null&&n.length?gr(e.lines,e.align??"l"):'<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="zh-CN"/></a:p></p:txBody>';return`<p:sp>
  <p:nvSpPr><p:cNvPr id="${hr()}" name="Shape"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
  <p:spPr>
    <a:xfrm><a:off x="${e.x}" y="${e.y}"/><a:ext cx="${e.cx}" cy="${e.cy}"/></a:xfrm>
    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
    <a:solidFill><a:srgbClr val="${e.fill}"/></a:solidFill>
    <a:ln><a:noFill/></a:ln>
  </p:spPr>
  ${t}
</p:sp>`}const Oe=12192e3,dt=6858e3,j="CF0A2C",Le="1A1A1A",ke="595959",et="F7F7F7";function xr(e){const t=(e.meta??[]).slice(0,3),n=[C({x:0,y:0,cx:72e4,cy:dt,fill:j}),C({x:11e5,y:9e5,cx:95e5,cy:5e5,fill:"FFFFFF",lines:[{text:"HUAWEI STYLE · MSS CLAW",size:12,bold:!0,color:j}]}),C({x:11e5,y:22e5,cx:98e5,cy:16e5,fill:"FFFFFF",lines:[{text:e.subtitle||"智能交付汇报",size:14,color:ke},{text:e.title||"业务汇报",size:36,bold:!0,color:Le}]}),C({x:11e5,y:4e6,cx:12e5,cy:6e4,fill:j}),...t.map((a,s)=>C({x:11e5,y:43e5+s*42e4,cx:9e6,cy:38e4,fill:"FFFFFF",lines:[{text:a,size:13,color:ke}]}))];return pt(n.join(""))}function kr(e){const t=[C({x:0,y:0,cx:Oe,cy:12e4,fill:j}),C({x:12e5,y:22e5,cx:98e5,cy:22e5,fill:"FFFFFF",align:"ctr",lines:[{text:e.title||"谢谢",size:48,bold:!0,color:Le},{text:e.subtitle||"Thank You",size:18,bold:!0,color:j},...e.bullets.slice(0,2).map(n=>({text:n,size:13,color:ke}))]}),C({x:0,y:dt-7e5,cx:Oe,cy:7e5,fill:et,align:"ctr",lines:[{text:(e.meta??["MSS Claw"]).join(" · "),size:11,color:ke}]})];return pt(t.join(""))}function br(e){const t=e.bullets.slice(0,6),a=e.layout==="metrics"?t.map((r,i)=>{const o=i%3,p=Math.floor(i/3),d=r.match(/([+-]?\d+(?:\.\d+)?%|#\d+|第\s*\d+)/),m=(d==null?void 0:d[1])||String(i+1),c=r.replace(m,"").replace(/^[:：\s-]+/,"").trim()||r,u=7e5+o*37e5,f=18e5+p*2e6;return C({x:u,y:f,cx:34e5,cy:17e5,fill:et,lines:[{text:c.slice(0,28),size:11,color:ke},{text:m,size:28,bold:!0,color:j}]})}):t.map((r,i)=>{const o=i%2,p=Math.floor(i/2),d=7e5+o*56e5,m=17e5+p*14e5;return[C({x:d,y:m,cx:12e4,cy:12e5,fill:j}),C({x:d+12e4,y:m,cx:5e6,cy:12e5,fill:et,lines:[{text:String(i+1).padStart(2,"0"),size:11,bold:!0,color:j},{text:r.slice(0,80),size:13,color:Le}]})].join("")}),s=[C({x:0,y:0,cx:Oe,cy:9e4,fill:j}),C({x:7e5,y:4e5,cx:1e7,cy:11e5,fill:"FFFFFF",lines:[{text:e.subtitle||(e.role==="agenda"?"AGENDA":"KEY POINTS"),size:11,bold:!0,color:j},{text:e.title,size:24,bold:!0,color:Le}]}),...Array.isArray(a)?a:[a]];return pt(s.flat().join(""))}function pt(e){return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</p:sld>`}function yr(e){return Ze=10,e.role==="cover"||e.layout==="cover"?xr(e):e.role==="closing"||e.layout==="closing"?kr(e):br(e)}const Sr=e=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</Types>`,wr=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,vr=e=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
 saveSubsetFonts="1">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>
    ${Array.from({length:e},(t,n)=>`<p:sldId id="${256+n}" r:id="rId${n+2}"/>`).join(`
    `)}
  </p:sldIdLst>
  <p:sldSz cx="${Oe}" cy="${dt}" type="screen16x9"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`,Ir=e=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${Array.from({length:e},(t,n)=>`<Relationship Id="rId${n+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${n+1}.xml"/>`).join(`
  `)}
  <Relationship Id="rId${e+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>`,Ar=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`,Tr=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</p:sldLayout>`,Pr=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`,Mr=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</p:sldMaster>`,Cr=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`,Rr=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</a:theme>`;function Nr(){const e=new Date().toISOString();return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</cp:coreProperties>`}function Or(e){return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
 xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>MSS Claw</Application>
  <Slides>${e}</Slides>
</Properties>`}function Lr(e){const t=e.length?e:[{title:"空演示",bullets:[],role:"content"}],n=t.length,a={"[Content_Types].xml":P(Sr(n)),"_rels/.rels":P(wr),"docProps/core.xml":P(Nr()),"docProps/app.xml":P(Or(n)),"ppt/presentation.xml":P(vr(n)),"ppt/_rels/presentation.xml.rels":P(Ir(n)),"ppt/slideLayouts/slideLayout1.xml":P(Tr),"ppt/slideLayouts/_rels/slideLayout1.xml.rels":P(Pr),"ppt/slideMasters/slideMaster1.xml":P(Mr),"ppt/slideMasters/_rels/slideMaster1.xml.rels":P(Cr),"ppt/theme/theme1.xml":P(Rr)};return t.forEach((s,r)=>{const i=r+1;a[`ppt/slides/slide${i}.xml`]=P(yr(s)),a[`ppt/slides/_rels/slide${i}.xml.rels`]=P(Ar)}),vn(a,{level:6})}function jr(e,t){const n=e.toLowerCase().endsWith(".pptx")?e:`${e}.pptx`,a=Lr(t);fr(n,a,"application/vnd.openxmlformats-officedocument.presentationml.presentation")}function pn(e){return e!=null&&e.length?e.join(" · "):"（未挂载 Skill）"}function mn(e){const t=(e??"").trim();return t?t.length>8e3?`${t.slice(0,8e3)}

…（后续内容已截断）`:t:""}function Er(e){const t=mn(e.agentReply);return["# 任务交付报告","",`> Agent：${e.agentName||"数据分析 Agent"}  ·  Skill：${pn(e.skills)}`,"","## 任务目标","",e.query||"（未填写）","","## 执行摘要","",t||["- 拉美穿戴 SO 环比 **+8.2%**，墨西哥、阿根廷贡献主要增量","- 竞品降价对巴西影响显著，建议启动 NBA 补贴券策略","- IoT 剔除后排名稳定，渠道促销为首要归因因子"].join(`
`),"","## 下一步","","1. 复核巴西价盘与竞品价差","2. 同步渠道与代表处执行 NBA","3. 下周复盘 SO / 转化交叉指标","","---",`*生成时间：${new Date().toLocaleString("zh-CN")}*`].join(`
`)}function _r(e){var a,s;const t=mn(e.agentReply),n=((s=(a=e.kbArtifact)==null?void 0:a.citations)==null?void 0:s.slice(0,8).map((r,i)=>{var o;return`${i+1}. **${r.docTitle}** — ${((o=r.snippet)==null?void 0:o.slice(0,120))||r.docId}`}).join(`
`))||`1. 拉美合规准入指南
2. 3C 营销话术规范`;return["# 知识检索交付","",`> Agent：${e.agentName||"知识 Agent"}  ·  Skill：${pn(e.skills)}`,"","## 查询","",e.query||"（未填写）","","## 结论","",t||["- 可穿戴营销物料需避免未获批医疗功效表述","- 建议提交 MKT 合规复核后再对外发布","- 引用已按密级与可见性过滤"].join(`
`),"","## 引用来源","",n,"","---",`*生成时间：${new Date().toLocaleString("zh-CN")}*`].join(`
`)}function $r(e,t){const n=t.query?t.query.slice(0,80):"";return`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${me(t.title)}</title>
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
  ${lr}
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
        <h1>${me(t.title)}</h1>
        <p class="meta">${me(t.agent)}${n?` · ${me(n)}`:""} · Markdown 智能分析 + 正文详稿</p>
      </header>
      <div class="content">
        ${t.analysisHtml||""}
        <div class="body-detail">
          ${e}
        </div>
        <div class="footer">
          <span>智能分析看板 + Markdown 正文 · 指标与要点自动抽取</span>
          <span>${me(new Date().toLocaleString("zh-CN"))}</span>
        </div>
      </div>
    </article>
  </div>
</body>
</html>`}function me(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function un(e,t){var a;const n=/^#\s+(.+)$/m.exec(e);return((a=n==null?void 0:n[1])==null?void 0:a.trim())||t}function fn(e,t,n){const a=tr(e),s=a.replace(/^\s*<h1>[\s\S]*?<\/h1>\s*/i,""),r=un(e,(t==null?void 0:t.type)==="knowledge"?"知识检索交付":"任务交付报告"),i=or(e,{type:t==null?void 0:t.type,board:n??ct(e,{type:t==null?void 0:t.type})});return $r(s||a,{title:r,agent:(t==null?void 0:t.agentName)||"Agent",query:(t==null?void 0:t.query)||"",analysisHtml:i})}function zr(e,t){return mr(e,t)}function Dr(e,t,n){if(e==="html"){const s=fn(t,n);return{html:s,size:`${Math.max(6,Math.round(s.length/1024))} KB`,pendingGenerate:!1}}const a=zr(t,n);return{slides:a,size:`${Math.max(.6,a.length*.35).toFixed(1)} MB`,pendingGenerate:!1}}function Rt(e){var t,n,a;return e.pendingGenerate?!1:e.kind==="markdown"?!!((t=e.markdown)!=null&&t.trim()):e.kind==="html"?!!((n=e.html)!=null&&n.trim()):e.kind==="ppt"?!!((a=e.slides)!=null&&a.length):e.kind==="xlsx"?!!e.table:e.kind==="board"||e.kind==="knowledge"}function Nt(e){return e==="html"||e==="ppt"}async function Fr(e,t,n,a){var i,o;const s=t.trim();if(!s)throw new Error("请先确保 Markdown 交付件有内容");const r=Dr(e,s,n);if(e==="html"){let p=ct(s,{type:n.type});if(E())try{const m=await Xs({markdown:s,agentName:n.agentName,query:n.query,type:n.type,signal:a});if(a!=null&&a.aborted)throw new Error("已取消生成");p=ir(p,m)}catch{}else await new Promise(m=>setTimeout(m,280));if(a!=null&&a.aborted)throw new Error("已取消生成");const d=fn(s,n,p);return{html:d,size:`${Math.max(6,Math.round(d.length/1024))} KB`,pendingGenerate:!1}}if(E())try{const p=await Qs({kind:"ppt",markdown:s,agentName:n.agentName,query:n.query,type:n.type,signal:a});if((i=p.slides)!=null&&i.length){const d=((o=r.slides)==null?void 0:o.length)??0;if(p.slides.length+1>=d||p.slides.length>=4){const m=dn(p.slides.map(c=>({title:c.title,bullets:c.bullets,role:"content"})),{title:un(s,"业务汇报"),agentName:n.agentName,query:n.query,skills:n.skills});return{slides:m,size:`${Math.max(.6,m.length*.35).toFixed(1)} MB`,pendingGenerate:!1}}}}catch{}if(await new Promise(p=>setTimeout(p,280)),a!=null&&a.aborted)throw new Error("已取消生成");return r}function Ot(e,t,n,a,s,r){return{id:e,kind:t,name:n,title:a,size:"待生成",icon:s,iconClass:r,pendingGenerate:!0}}function Kr(e){const t=e.type==="marketing"?Er(e):_r(e),n=e.type==="marketing"?"m":"k";return[{id:`${n}-md`,kind:"markdown",name:"Markdown",title:"Markdown",size:`${Math.max(2,Math.round(t.length/1024))} KB`,icon:"fa-file-lines",iconClass:"text-zinc-700",markdown:t,pendingGenerate:!1},Ot(`${n}-html`,"html","HTML","HTML","fa-file-code","text-orange-600"),Ot(`${n}-ppt`,"ppt","PPT","PPT","fa-file-powerpoint","text-amber-600")]}function Br(e,t=""){var n;if(e.kind==="markdown"&&e.markdown){Te(`${e.name}.md`,e.markdown,"text/markdown;charset=utf-8");return}if(e.kind==="html"&&e.html){Te(`${e.name}.html`,e.html,"text/html;charset=utf-8");return}if(e.kind==="ppt"&&((n=e.slides)!=null&&n.length)){jr(e.name,e.slides);return}if(e.kind==="xlsx"&&e.table){const a=[e.table.headers.join(","),...e.table.rows.map(s=>s.join(","))].join(`
`);Te(`${e.name}.csv`,`${a}
# ${t}`,"text/csv;charset=utf-8");return}Te(`${e.name}.json`,JSON.stringify({id:e.id,kind:e.kind,query:t,exportedAt:new Date().toISOString()},null,2))}const h={red:"#CF0A2C",redDark:"#A10822",ink:"#1A1A1A",mute:"#595959",line:"#E5E5E5",soft:"#F7F7F7",white:"#FFFFFF"};function Ur({index:e,total:t,title:n,children:a}){return l.jsxs("div",{className:"overflow-hidden rounded-lg bg-white shadow-[0_12px_32px_rgba(0,0,0,0.12)] ring-1 ring-black/5",children:[l.jsxs("div",{className:"flex items-center gap-1.5 border-b border-zinc-200 bg-[#f7f7f8] px-3 py-1.5",children:[l.jsx("span",{className:"h-2 w-2 rounded-full bg-[#ff5f57]"}),l.jsx("span",{className:"h-2 w-2 rounded-full bg-[#febc2e]"}),l.jsx("span",{className:"h-2 w-2 rounded-full bg-[#28c840]"}),l.jsxs("span",{className:"ml-2 truncate text-[10px] text-zinc-500",children:["幻灯片 ",e+1," / ",t," · ",n]})]}),l.jsx("div",{className:"relative aspect-[16/9] w-full overflow-hidden",children:a})]})}function Wr({slide:e}){var t;return l.jsxs("div",{className:"absolute inset-0 flex",style:{background:h.white},children:[l.jsx("div",{className:"relative w-[8%] shrink-0",style:{background:h.red},children:l.jsx("div",{className:"absolute bottom-0 left-0 h-[38%] w-full opacity-90",style:{background:`linear-gradient(160deg, ${h.redDark} 0%, ${h.red} 100%)`,clipPath:"polygon(0 35%, 100% 0, 100% 100%, 0 100%)"}})}),l.jsxs("div",{className:"relative flex min-w-0 flex-1 flex-col justify-between px-9 py-8",children:[l.jsxs("div",{className:"flex items-center justify-between",children:[l.jsx("p",{className:"text-[11px] font-semibold tracking-[0.18em]",style:{color:h.red},children:"HUAWEI STYLE · MSS CLAW"}),l.jsx("div",{className:"h-1.5 w-10",style:{background:h.red}})]}),l.jsxs("div",{className:"max-w-[90%]",children:[l.jsx("p",{className:"text-[12px] font-medium",style:{color:h.mute},children:e.subtitle||"智能交付汇报"}),l.jsx("h3",{className:"mt-3 text-[30px] font-bold leading-[1.2] tracking-tight",style:{color:h.ink},children:e.title}),l.jsx("div",{className:"mt-5 h-[3px] w-16",style:{background:h.red}}),(t=e.meta)!=null&&t.length?l.jsx("ul",{className:"mt-6 space-y-2",children:e.meta.slice(0,3).map(n=>l.jsxs("li",{className:"flex items-center gap-2 text-[12.5px]",style:{color:h.mute},children:[l.jsx("span",{className:"h-1.5 w-1.5 shrink-0 rounded-full",style:{background:h.red}}),n]},n))}):null]}),l.jsxs("div",{className:"flex items-end justify-between",children:[l.jsx("p",{className:"text-[10px]",style:{color:"#8c8c8c"},children:"Confidential · For Internal Discussion"}),l.jsxs("div",{className:"flex gap-1",children:[l.jsx("span",{className:"h-2 w-8",style:{background:h.red}}),l.jsx("span",{className:"h-2 w-3 bg-zinc-300"}),l.jsx("span",{className:"h-2 w-3 bg-zinc-200"})]})]}),l.jsx("div",{className:"pointer-events-none absolute -bottom-6 -right-4 h-36 w-36 opacity-[0.12]",style:{background:h.red,clipPath:"polygon(40% 0, 100% 0, 100% 100%, 0 100%)"}})]})]})}function Gr({slide:e}){var t;return l.jsxs("div",{className:"absolute inset-0 flex flex-col",style:{background:h.white},children:[l.jsx("div",{className:"h-2 w-full",style:{background:h.red}}),l.jsxs("div",{className:"relative flex flex-1 flex-col items-center justify-center px-8 text-center",children:[l.jsx("div",{className:"mb-4 h-1 w-14",style:{background:h.red}}),l.jsx("h3",{className:"text-[48px] font-bold tracking-tight",style:{color:h.ink},children:e.title||"谢谢"}),l.jsx("p",{className:"mt-2 text-[16px] font-medium tracking-[0.2em]",style:{color:h.red},children:e.subtitle||"Thank You"}),e.bullets.length?l.jsx("div",{className:"mt-8 flex flex-wrap items-center justify-center gap-3",children:e.bullets.slice(0,2).map(n=>l.jsx("span",{className:"rounded-full border px-4 py-1.5 text-[12px]",style:{borderColor:h.line,color:h.mute},children:n},n))}):null,(t=e.meta)!=null&&t.length?l.jsx("p",{className:"mt-8 text-[11px]",style:{color:"#8c8c8c"},children:e.meta.join(" · ")}):null]}),l.jsxs("div",{className:"flex h-10 items-center justify-between px-8",style:{background:h.soft},children:[l.jsx("span",{className:"text-[10px] font-semibold",style:{color:h.red},children:"MSS Claw"}),l.jsx("span",{className:"text-[10px]",style:{color:h.mute},children:"欢迎提问与讨论"})]})]})}function Hr({bullets:e,layout:t}){const n=e.slice(0,6);return t==="metrics"?l.jsx("div",{className:"grid min-h-0 flex-1 grid-cols-3 gap-2.5 content-start",children:n.map((a,s)=>{const r=a.match(/([+-]?\d+(?:\.\d+)?%|#\d+|第\s*\d+)/),i=(r==null?void 0:r[1])||`${s+1}`,o=a.replace(i,"").replace(/^[:：\s-]+/,"").trim()||a;return l.jsxs("div",{className:"flex flex-col justify-between rounded-xl border px-3 py-3",style:{borderColor:h.line,background:s%2===0?h.soft:h.white},children:[l.jsx("span",{className:"text-[10px] font-semibold",style:{color:h.mute},children:o.slice(0,28)}),l.jsx("span",{className:"mt-2 text-[22px] font-bold tracking-tight",style:{color:h.red},children:i})]},`${s}-${a.slice(0,16)}`)})}):t==="list"?l.jsx("ul",{className:"min-h-0 flex-1 space-y-2 overflow-hidden",children:n.map((a,s)=>l.jsxs("li",{className:"flex gap-3 rounded-lg border px-3 py-2.5",style:{borderColor:h.line,background:h.soft},children:[l.jsx("span",{className:"mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white",style:{background:h.red},children:s+1}),l.jsx("span",{className:"text-[12.5px] leading-relaxed",style:{color:h.ink},children:a})]},`${s}-${a.slice(0,16)}`))}):l.jsx("div",{className:"grid min-h-0 flex-1 grid-cols-2 gap-2.5 content-start",children:n.map((a,s)=>l.jsxs("div",{className:"relative overflow-hidden rounded-xl border px-3.5 py-3",style:{borderColor:h.line,background:h.white},children:[l.jsx("div",{className:"absolute left-0 top-0 h-full w-1",style:{background:h.red}}),l.jsxs("div",{className:"flex items-start gap-2.5 pl-1",children:[l.jsx("span",{className:"mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white",style:{background:s===0?h.red:h.ink},children:String(s+1).padStart(2,"0")}),l.jsx("p",{className:"text-[12.5px] leading-relaxed",style:{color:h.ink},children:a})]})]},`${s}-${a.slice(0,16)}`))})}function qr({slide:e,page:t,total:n}){const a=e.role==="agenda";return l.jsxs("div",{className:"absolute inset-0 flex flex-col",style:{background:h.white},children:[l.jsx("div",{className:"h-[3px] w-full",style:{background:h.red}}),l.jsxs("div",{className:"flex min-h-0 flex-1 flex-col px-7 py-5",children:[l.jsxs("div",{className:"mb-3 flex items-end justify-between gap-3 border-b pb-3",style:{borderColor:h.line},children:[l.jsxs("div",{className:"min-w-0",children:[e.subtitle||a?l.jsx("p",{className:"text-[10px] font-semibold tracking-[0.16em]",style:{color:h.red},children:e.subtitle||"AGENDA"}):l.jsx("p",{className:"text-[10px] font-semibold tracking-[0.14em]",style:{color:h.mute},children:"KEY POINTS"}),l.jsx("h3",{className:"mt-1 text-[20px] font-bold leading-snug tracking-tight",style:{color:h.ink},children:e.title})]}),l.jsx("div",{className:"h-8 w-8 shrink-0 rounded-md",style:{background:h.red}})]}),l.jsx(Hr,{bullets:e.bullets,layout:e.layout||"cards"}),l.jsxs("div",{className:"mt-3 flex items-center justify-between border-t pt-2 text-[10px]",style:{borderColor:h.line,color:h.mute},children:[l.jsxs("span",{children:[l.jsx("span",{className:"font-semibold",style:{color:h.red},children:"MSS Claw"}),l.jsx("span",{className:"mx-1.5 text-zinc-300",children:"|"}),"智能交付件"]}),l.jsxs("span",{children:[t," / ",n]})]})]})]})}function Jr({slides:e}){return e.length?l.jsx("div",{className:w("space-y-4 rounded-xl p-3"),style:{background:"#eceff3"},children:e.map((t,n)=>l.jsx(Ur,{index:n,total:e.length,title:t.title,children:t.role==="cover"||t.layout==="cover"?l.jsx(Wr,{slide:t}):t.role==="closing"||t.layout==="closing"?l.jsx(Gr,{slide:t}):l.jsx(qr,{slide:t,page:n+1,total:e.length})},`${t.role}-${t.title}-${n}`))}):l.jsx("div",{className:"rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-[12px] text-zinc-500",children:"暂无幻灯片"})}function Yr(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/^### (.*)$/gm,'<h3 class="mt-3 mb-1 text-[13px] font-semibold text-zinc-900">$1</h3>').replace(/^## (.*)$/gm,'<h2 class="mt-4 mb-1.5 text-[15px] font-semibold text-zinc-900">$1</h2>').replace(/^# (.*)$/gm,'<h1 class="mb-2 text-[17px] font-bold text-zinc-900">$1</h1>').replace(/^> (.*)$/gm,'<p class="my-2 rounded-lg bg-zinc-100 px-3 py-2 text-[12px] text-zinc-600">$1</p>').replace(/^\- (.*)$/gm,'<li class="ml-4 list-disc text-[12px] leading-relaxed text-zinc-700">$1</li>').replace(/^\d+\. (.*)$/gm,'<li class="ml-4 list-decimal text-[12px] leading-relaxed text-zinc-700">$1</li>').replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\*(.*?)\*/g,"<em>$1</em>").replace(/^---$/gm,'<hr class="my-3 border-zinc-200"/>').replace(/\n\n/g,"<br/><br/>")}function Vr({title:e,html:t}){return l.jsx("iframe",{title:e,srcDoc:t,sandbox:"",className:"h-[min(72vh,640px)] w-full rounded-xl border border-zinc-200 bg-white"})}function Xr({item:e}){return e.kind==="markdown"&&e.markdown?l.jsx("div",{className:"rounded-xl border border-zinc-200/80 bg-white p-4",dangerouslySetInnerHTML:{__html:Yr(e.markdown)}}):e.kind==="html"&&e.html?l.jsx(Vr,{title:e.title,html:e.html}):e.kind==="ppt"&&e.slides?l.jsx(Jr,{slides:e.slides}):l.jsx("div",{className:"rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-[12px] text-zinc-500",children:"暂无可预览内容"})}function Zi({ready:e,type:t,query:n="",agentName:a="",skills:s=[],agentReply:r="",kbArtifact:i=null,collapsed:o,onToggleCollapse:p,onPush:d,onDeliverableDownload:m,onRunExample:c}){var gt;const u=A.useMemo(()=>e&&t?Kr({type:t,query:n,agentName:a,skills:s,agentReply:r,kbArtifact:i}):[],[e,t,n,a,s,r,i]),f=`${t}|${n}|${a}|${r.slice(0,80)}`,[y,x]=A.useState({}),[k,v]=A.useState(null),[O,Be]=A.useState(null),[ut,we]=A.useState(null),Q=A.useRef(null);A.useEffect(()=>{var b;x({}),we(null),(b=Q.current)==null||b.abort(),Q.current=null,Be(null)},[f]);const z=A.useMemo(()=>u.map(b=>{const Z=y[b.id];return Z?{...b,...Z,pendingGenerate:!1}:b}),[u,y]);A.useEffect(()=>{if(!z.length){v(null);return}(!k||!z.some(b=>b.id===k))&&v(z[0].id)},[z,k]);const S=z.find(b=>b.id===k)??null,Ue=((gt=z.find(b=>b.kind==="markdown"))==null?void 0:gt.markdown)??"",ft=S?Rt(S):!1,gn=S&&Nt(S.kind)&&!ft&&!!Ue.trim(),hn=async()=>{var Z;if(!S||!t||!Nt(S.kind)||!Ue.trim())return;(Z=Q.current)==null||Z.abort();const b=new AbortController;Q.current=b,Be(S.id),we(null);try{const ee=await Fr(S.kind,Ue,{type:t,query:n,agentName:a,skills:s,agentReply:r,kbArtifact:i},b.signal);if(b.signal.aborted)return;x(xn=>({...xn,[S.id]:{...ee,pendingGenerate:!1}}))}catch(ee){if(b.signal.aborted)return;we(ee instanceof Error?ee.message:"生成失败，请重试")}finally{Q.current===b&&(Q.current=null),Be(ee=>ee===S.id?null:ee)}};return l.jsxs(l.Fragment,{children:[l.jsxs("section",{className:w("artifact-panel z-20 border-l border-zinc-200/80",o&&"collapsed"),children:[l.jsxs("div",{className:"glass-bar flex h-[52px] shrink-0 items-center justify-between border-b border-zinc-200/80 px-4",children:[l.jsxs("div",{className:"flex min-w-0 items-center gap-2.5",children:[l.jsx("button",{type:"button",onClick:p,className:"flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900",title:"收起交付件预览",children:l.jsx("i",{className:"fa-solid fa-chevron-right text-xs"})}),l.jsx("div",{className:"flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-700",children:l.jsx("i",{className:"fa-solid fa-file-lines text-xs"})}),l.jsx("p",{className:"truncate text-[11px] font-semibold leading-none text-zinc-900",children:"交付件预览"})]}),l.jsxs("button",{type:"button",onClick:d,disabled:!e,className:"apple-btn-primary flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40",children:[l.jsx("i",{className:"fa-solid fa-paper-plane text-[10px]"}),"推送"]})]}),e&&z.length>0&&l.jsxs("div",{className:"flex shrink-0 items-center gap-2 border-b border-zinc-200/80 bg-white px-3 py-2",children:[l.jsx("div",{className:"flex flex-1 gap-1.5 overflow-x-auto scroll-hidden",children:z.map(b=>{const Z=Rt(b);return l.jsxs("button",{type:"button",onClick:()=>{v(b.id),we(null)},className:w("flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition",k===b.id?"border-zinc-900 bg-zinc-900 text-white":"border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-white"),children:[l.jsx("i",{className:w("text-[10px]",b.icon.startsWith("fa-")?`fa-solid ${b.icon}`:b.icon,k===b.id?"text-white/80":b.iconClass)}),l.jsx("span",{className:"font-medium",children:b.name}),!Z&&b.kind!=="markdown"?l.jsx("span",{className:w("rounded px-1 text-[9px]",k===b.id?"bg-white/15 text-white/70":"bg-zinc-200/80 text-zinc-500"),children:"空"}):null]},b.id)})}),S&&ft?l.jsx("button",{type:"button",onClick:()=>{Br(S,n),m==null||m(S.name)},className:"shrink-0 rounded-lg border border-zinc-200 px-2 py-1.5 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-50",title:"下载当前交付件",children:l.jsx("i",{className:"fa-solid fa-download"})}):null]}),l.jsxs("div",{className:"relative min-h-0 flex-1 overflow-hidden p-4",children:[!e&&l.jsxs("div",{className:"flex h-full flex-col items-center justify-center",children:[l.jsx("div",{className:"canvas-empty-icon relative mb-4 flex h-20 w-20 items-center justify-center rounded-xl border border-zinc-200 shadow-sm",children:l.jsx("i",{className:"fa-solid fa-wand-magic-sparkles text-3xl text-zinc-400"})}),l.jsx("h3",{className:"mb-1.5 text-[15px] font-semibold text-zinc-900",children:"等待 Agent 交付件"}),l.jsx("p",{className:"max-w-sm text-center text-[12px] leading-relaxed text-zinc-500",children:"确认执行计划后，将先生成 Markdown；可再切换到 HTML / PPT，基于全文点击「开始生成」预览。"}),c&&l.jsxs("div",{className:"mt-4 grid w-full max-w-sm grid-cols-1 gap-1.5",children:[l.jsxs("button",{type:"button",onClick:()=>c("marketing"),className:"task-card apple-card rounded-xl p-3 text-left",children:[l.jsxs("p",{className:"flex items-center gap-2 text-[12px] font-semibold text-zinc-800",children:[l.jsx("i",{className:"fa-solid fa-chart-column text-zinc-600"}),"多源数据分析"]}),l.jsx("p",{className:"mt-0.5 text-[11px] text-zinc-500",children:"/数据分析 · 代表处 SO 排名"})]}),l.jsxs("button",{type:"button",onClick:()=>c("knowledge"),className:"task-card apple-card rounded-xl p-3 text-left",children:[l.jsxs("p",{className:"flex items-center gap-2 text-[12px] font-semibold text-zinc-800",children:[l.jsx("i",{className:"fa-solid fa-file-shield text-zinc-600"}),"文档合规筛查"]}),l.jsx("p",{className:"mt-0.5 text-[11px] text-zinc-500",children:"/合规筛查 · 医疗用语检查"})]}),l.jsxs("button",{type:"button",onClick:()=>c("warroom"),className:"task-card apple-card rounded-xl p-3 text-left",children:[l.jsxs("p",{className:"flex items-center gap-2 text-[12px] font-semibold text-zinc-800",children:[l.jsx("i",{className:"fa-solid fa-tags text-zinc-600"}),"价格监测周报"]}),l.jsx("p",{className:"mt-0.5 text-[11px] text-zinc-500",children:"/价格监测 · 18 国 offer 比对"})]})]})]}),e&&S&&l.jsxs("div",{className:"scroll-hidden h-full overflow-y-auto",children:[l.jsxs("div",{className:"mb-2 flex items-center justify-between gap-2",children:[l.jsx("p",{className:"text-[11px] font-semibold text-zinc-800",children:S.title}),l.jsx("span",{className:"text-[10px] text-zinc-400",children:S.size})]}),O===S.id?l.jsxs("div",{className:"flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-16 text-center",children:[l.jsx("i",{className:"fa-solid fa-spinner fa-spin mb-3 text-2xl text-zinc-400"}),l.jsxs("p",{className:"text-[13px] font-semibold text-zinc-800",children:["正在基于 Markdown 生成 ",S.name,"…"]}),l.jsx("p",{className:"mt-1 text-[11px] text-zinc-500",children:S.kind==="html"?E()?"模型提炼分析看板 · 本地模板排版中":"本地转写 HTML 报告中":E()?"调用 AI 模型提炼幻灯片结构":"正在按章节拆解为幻灯片"}),l.jsx("button",{type:"button",onClick:()=>{var b;return(b=Q.current)==null?void 0:b.abort()},className:"mt-4 rounded-lg border border-zinc-200 px-3 py-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50",children:"取消"})]}):gn?l.jsxs("div",{className:"flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-14 text-center",children:[l.jsx("div",{className:"mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500",children:l.jsx("i",{className:w("fa-solid text-lg",S.icon)})}),l.jsxs("p",{className:"text-[13px] font-semibold text-zinc-800",children:[S.name," 尚未生成"]}),l.jsx("p",{className:"mt-1.5 max-w-xs text-[11px] leading-relaxed text-zinc-500",children:S.kind==="html"?E()?"模型按场景提炼 KPI/发现/风险/行动，再用现有精美模板排版；正文仍完整保留 Markdown。":"将把当前 Markdown 全文排版为可预览 HTML 报告（未配置模型时走本地转写）。":`将按章节把 Markdown 拆成 16:9 幻灯片${E()?"（可调用模型提炼要点）":""}。`}),ut?l.jsx("p",{className:"mt-2 max-w-xs text-[11px] text-red-600",children:ut}):null,l.jsx("button",{type:"button",onClick:()=>void hn(),className:"apple-btn-primary mt-4 rounded-lg px-4 py-2 text-[12px] font-semibold text-white",children:"开始生成"})]}):l.jsx(Xr,{item:S})]})]})]}),o&&l.jsxs("button",{type:"button",onClick:p,className:"artifact-panel-expand-tab visible flex flex-col items-center justify-center gap-1 text-[10px] font-semibold",title:"展开交付件预览",children:[l.jsx("i",{className:"fa-solid fa-file-lines text-sm"}),l.jsx("span",{style:{writingMode:"vertical-rl"},children:"预览"})]})]})}const mt="mt-1 w-full rounded-xl border border-black/8 px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-zinc-900/20";function eo({label:e,children:t,hint:n}){return l.jsxs("label",{className:"block",children:[l.jsx("span",{className:"text-[11px] font-semibold text-[#86868b]",children:e}),n&&l.jsx("p",{className:"mb-1 text-[10px] text-[#86868b]",children:n}),t]})}function to({className:e,...t}){return l.jsx("input",{className:w(mt,e),...t})}function no({className:e,...t}){return l.jsx("textarea",{className:w(mt,e),...t})}function ao({className:e,...t}){return l.jsx("select",{className:w(mt,e),...t})}function Qr({onCancel:e,onSave:t,saveLabel:n="保存",cancelFirst:a=!1}){const s=l.jsx("button",{type:"button",onClick:e,className:"rounded-xl border border-black/8 px-4 py-2 text-[12px]",children:"取消"}),r=l.jsx("button",{type:"button",onClick:t,className:"apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white",children:n});return l.jsxs(l.Fragment,{children:[a?s:r,a?r:s]})}function so({open:e,onClose:t,warrooms:n,members:a,onConfirm:s}){const[r,i]=A.useState("warroom"),[o,p]=A.useState([]),[d,m]=A.useState([]),c=A.useMemo(()=>n.filter(x=>$e(x)),[n]),u=(x,k,v)=>{v(x.includes(k)?x.filter(O=>O!==k):[...x,k])},f=()=>{if(r==="warroom"){if(!o.length)return;s({mode:"warroom",warroomIds:o})}else{if(!d.length)return;s({mode:"members",memberIds:d})}p([]),m([]),t()},y=r==="warroom"?o.length>0:d.length>0;return l.jsx(qs,{open:e,title:"推送交付物",onClose:t,size:"lg",elevate:!0,actions:l.jsx(Qr,{onCancel:t,onSave:()=>{y&&f()},saveLabel:y?"发送":"请先选择"}),children:l.jsxs("div",{className:"space-y-3 text-left",children:[l.jsx("p",{className:"text-[11px] leading-relaxed text-zinc-500",children:"选择协作空间或成员接收交付物通知。协作空间将写入会话记录；成员将收到「我的消息」。"}),l.jsx("div",{className:"inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5",children:[["warroom","协作空间"],["members","成员"]].map(([x,k])=>l.jsx("button",{type:"button",onClick:()=>i(x),className:w("rounded-md px-3 py-1.5 text-[11px] font-semibold transition",r===x?"bg-white text-zinc-900 shadow-sm":"text-zinc-500 hover:text-zinc-800"),children:k},x))}),r==="warroom"?l.jsx("ul",{className:"max-h-[40vh] space-y-1.5 overflow-y-auto",children:c.length===0?l.jsx("li",{className:"rounded-xl border border-dashed border-zinc-200 px-3 py-8 text-center text-[12px] text-zinc-400",children:"暂无协作空间，请先在侧栏「协作空间」中新建"}):c.map(x=>{var v;const k=o.includes(x.id);return l.jsx("li",{children:l.jsxs("label",{className:w("flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition",k?"border-zinc-900 bg-zinc-900/5":"border-zinc-200 hover:border-zinc-300"),children:[l.jsx("input",{type:"checkbox",className:"accent-claw-600",checked:k,onChange:()=>u(o,x.id,p)}),l.jsx("span",{className:"flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white",children:l.jsx("i",{className:"fa-solid fa-users text-[11px]"})}),l.jsxs("span",{className:"min-w-0 flex-1",children:[l.jsx("span",{className:"block truncate text-[12px] font-semibold text-zinc-900",children:x.title}),l.jsxs("span",{className:"text-[10px] text-zinc-400",children:[((v=x.members)==null?void 0:v.length)??0," 名成员 · 协作室"]})]})]})},x.id)})}):l.jsx("ul",{className:"max-h-[40vh] space-y-1.5 overflow-y-auto",children:a.length===0?l.jsx("li",{className:"rounded-xl border border-dashed border-zinc-200 px-3 py-8 text-center text-[12px] text-zinc-400",children:"当前工作区暂无成员"}):a.map(x=>{var v;const k=d.includes(x.id);return l.jsx("li",{children:l.jsxs("label",{className:w("flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition",k?"border-zinc-900 bg-zinc-900/5":"border-zinc-200 hover:border-zinc-300"),children:[l.jsx("input",{type:"checkbox",className:"accent-claw-600",checked:k,onChange:()=>u(d,x.id,m)}),l.jsx("span",{className:w("flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white",x.avatar||"bg-zinc-700"),children:(((v=x.name)==null?void 0:v[0])??"?").toUpperCase()}),l.jsxs("span",{className:"min-w-0 flex-1",children:[l.jsx("span",{className:"block truncate text-[12px] font-semibold text-zinc-900",children:x.name}),l.jsx("span",{className:"truncate text-[10px] text-zinc-400",children:x.email||x.id})]})]})},x.id)})})]})})}export{Ne as $,tt as A,Ft as B,Pe as C,Ci as D,Mi as E,he as F,Aa as G,se as H,qi as I,E as J,Ws as K,Tt as L,Qt as M,J as N,va as O,ai as P,Ls as Q,pi as R,Xe as S,nt as T,Fs as U,Gi as V,zi as W,Hi as X,Ms as Y,Pi as Z,Ii as _,li as a,di as a$,Te as a0,Ai as a1,la as a2,sa as a3,oe as a4,Qn as a5,fe as a6,ge as a7,w as a8,bi as a9,gi as aA,hi as aB,U as aC,ui as aD,Vi as aE,Vn as aF,Zt as aG,Ri as aH,ii as aI,si as aJ,Un as aK,Ei as aL,_i as aM,$i as aN,Cs as aO,Xi as aP,Ti as aQ,eo as aR,to as aS,no as aT,ao as aU,Qr as aV,aa as aW,na as aX,Ni as aY,Qi as aZ,Di as a_,an as aa,en as ab,tn as ac,R as ad,Hs as ae,qs as af,Oi as ag,Zi as ah,so as ai,ss as aj,ji as ak,Li as al,ri as am,Tn as an,An as ao,_ as ap,bt as aq,$t as ar,fi as as,zt as at,Jn as au,wi as av,Si as aw,ki as ax,yi as ay,mi as az,qe as b,vi as b0,Fi as b1,Ji as b2,Yi as b3,zn as c,xi as d,Ee as e,ia as f,xt as g,Ga as h,pa as i,ya as j,Bt as k,N as l,T as m,jn as n,V as o,L as p,Ui as q,Rn as r,oi as s,Ki as t,ci as u,Bi as v,_e as w,$e as x,Wi as y,ta as z};
