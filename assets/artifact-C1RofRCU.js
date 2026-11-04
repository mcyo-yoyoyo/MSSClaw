import{j as o,r as M}from"./vendor-react-9FJQkwKK.js";import{c as oe}from"./vendor-zustand-Dd-O9D2v.js";import{e as A,o as H,s as g,a as X,b as Ge,n as fe,c as gn,t as hn,d as xn,f as T,z as bn}from"./vendor-D4E3TPrg.js";const kn=["gtm","mkt","ecommerce","service","channel","retail","hr","quality"],yn=[{id:"gtm",label:"GTM"},{id:"mkt",label:"MKT"},{id:"ecommerce",label:"电商"},{id:"service",label:"服务"},{id:"channel",label:"渠道"},{id:"retail",label:"零售"},{id:"hr",label:"HR"},{id:"quality",label:"质运"},{id:"finance",label:"财经"}],ne="hq",Me="china",Sn=[{id:ne,label:"机关"},{id:"apac",label:"亚太"},{id:"mea",label:"中东非"},{id:"latam",label:"拉美"},{id:"europe",label:"欧洲"},{id:"eurasia",label:"欧亚"},{id:Me,label:"中国区"}],ge=[...yn],he=[...Sn],Kr={skill:"Skill",tool:"工具",agent:"Agent",external_tool:"外部工具",case:"场景案例",playbook:"场景方案",insight:"前沿洞察",training:"培训课件",news:"前沿洞察"},Ur={public:"公开可见",org:"组织内",private:"仅发布方"};let $t=Object.fromEntries(ge.map(e=>[e.id,e.label])),Et=Object.fromEntries(he.map(e=>[e.id,e.label]));function wn(){$t=Object.fromEntries(ge.map(e=>[e.id,e.label])),Et=Object.fromEntries(he.map(e=>[e.id,e.label]))}function Br(e,t){ge.splice(0,ge.length,...e),he.splice(0,he.length,...t),wn()}function gt(e){return $t[e]??e}function He(e){return Et[e]??e}function Gr(e){return e?He(e):"全部区域"}function vn(e){return ge.some(t=>t.id===e)}function In(e){return he.some(t=>t.id===e)}function zt(e){const t=[...new Set(((e==null?void 0:e.deptIds)??[]).filter(vn))],n=e!=null&&e.regionId&&In(e.regionId)?e.regionId:null;return{deptIds:t,regionId:n}}function Hr(e){const t=new Map(kn.map((n,s)=>[n,s]));return[...e].sort((n,s)=>{const a=t.has(n)?t.get(n):1e3+n.charCodeAt(0),r=t.has(s)?t.get(s):1e3+s.charCodeAt(0);return a!==r?a-r:gt(n).localeCompare(gt(s),"zh-CN")})}function Wr(e){const t=new Set(e),n=[];t.has(ne)&&n.push(ne);const s=e.filter(a=>a!==ne&&a!==Me).sort((a,r)=>He(a).localeCompare(He(r),"zh-CN"));return n.push(...s),t.has(Me)&&n.push(Me),n}function An(e,t){return t.length?t.some(n=>n===ne?!e||e===ne:e===n):!0}function qr(e,t){return t.length?e?An(e,t):!1:!0}const Mn="数据获取失败，请稍候重试",ue=oe(e=>({failed:!1,markFailed:()=>e({failed:!0}),markOk:()=>e({failed:!1})})),Tn="mssclaw_api",Pn="mssclaw_api_auth";function Nn(){return!0}function Dt(e){return e==="localhost"||e==="127.0.0.1"||e==="[::1]"}function Rn(e){try{const t=new URL(e);return Dt(t.hostname)}catch{return/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(e)}}function jn(){var e;if(typeof localStorage<"u"){const t=(e=localStorage.getItem(Tn))==null?void 0:e.trim();if(t){const n=t.replace(/\/$/,"");return Rn(n)&&typeof location<"u"&&!Dt(location.hostname)?"":n}}return""}function j(){return!1}function On(){var e;if(typeof localStorage<"u"){const t=(e=localStorage.getItem(Pn))==null?void 0:e.trim();if(t)return t}return""}const We="mssclaw_auth_token";function Ln(){try{return sessionStorage.getItem(We)}catch{return null}}function Vr(e){try{e?sessionStorage.setItem(We,e):sessionStorage.removeItem(We)}catch{}}function ke(){var n;const e={},t=On();t&&(e["X-API-Key"]=t);try{const s=typeof sessionStorage<"u"?(n=Ln())==null?void 0:n.trim():"";s&&(e.Authorization=`Bearer ${s}`,e["X-Session-Token"]=s)}catch{}return e}function R(e){const t=jn(),n=e.startsWith("/")?e:`/${e}`;return t?`${t}${n}`:n}async function Z(e,t={},n=8e3){const s=new AbortController,a=setTimeout(()=>s.abort(),n);try{const r=await fetch(e,{...t,signal:s.signal});return r.status>=500?ue.getState().markFailed():r.ok&&ue.getState().markOk(),r}catch(r){throw ue.getState().markFailed(),r}finally{clearTimeout(a)}}const _n=A(["super_admin","capability_ops","business_user","viewer"]);function Cn(e){switch(e){case"super_admin":case"workspace_admin":return"super_admin";case"capability_ops":case"developer":return"capability_ops";case"business_user":return"business_user";case"viewer":return"viewer";default:return"business_user"}}A(["none","read","execute","write","admin"]);A(["chat","prompt","skill","workflow","agent","knowledge","tool","memory","settings"]);H({id:g(),name:g(),email:g(),role:_n,avatar:g(),lastActive:g(),status:A(["active","invited","suspended"]),deptIds:X(g()).optional(),regionId:g().nullable().optional()});const Yr={super_admin:"平台运营",capability_ops:"能力开发",business_user:"业务用户",viewer:"只读访客"},Jr={super_admin:"平台运营：可查看/创建全部 Skill 与治理配置（租户/门户/展示/组织权限）",capability_ops:"能力开发：配置 Agent/Skill/工具。短期不做组织数据权限；后续可按「公开可见 / 组织内」限制 MSS 集市 Agent/Skill",business_user:"业务壳：工作平台（找案例/做任务/任务记录）；左侧领域/区域菜单全量可见，作浏览筛选",viewer:"业务壳：工作平台以找案例为主；左侧领域/区域菜单全量可见，作浏览筛选"},Xr={active:"已激活",invited:"待激活",suspended:"已停用"},$n={chat:"admin",prompt:"admin",skill:"admin",workflow:"admin",agent:"admin",knowledge:"admin",tool:"admin",memory:"admin",settings:"admin"};function En(e,t,n){return{super_admin:{...$n},capability_ops:e,business_user:t,viewer:n}}const zn=En({chat:"execute",prompt:"write",skill:"write",workflow:"write",agent:"write",knowledge:"write",tool:"write",memory:"write",settings:"read"},{chat:"execute",prompt:"read",skill:"execute",workflow:"execute",agent:"read",knowledge:"read",tool:"read",memory:"read",settings:"none"},{chat:"read",prompt:"read",skill:"read",workflow:"read",agent:"read",knowledge:"read",tool:"none",memory:"none",settings:"none"});function Qr(){return zn}const Dn=[{id:"u-mcyo",name:"Mcyo",email:"mcyo@huawei.com",role:"super_admin",avatar:"bg-indigo-600",lastActive:"刚刚",status:"active",deptIds:["quality"],regionId:null},{id:"u-jacky",name:"Jacky",email:"jacky@huawei.com",role:"capability_ops",avatar:"bg-teal-600",lastActive:"1 小时前",status:"active",deptIds:["quality"],regionId:null},{id:"u-dickson",name:"Dickson",email:"dickson@huawei.com",role:"business_user",avatar:"bg-amber-500",lastActive:"今天",status:"active",deptIds:["gtm"],regionId:"apac"},{id:"u-somebody",name:"Somebody",email:"somebody@huawei.com",role:"viewer",avatar:"bg-slate-500",lastActive:"昨天",status:"active",deptIds:["mkt"],regionId:"europe"}];function Zr(){return Dn.map(e=>({...e,deptIds:[...e.deptIds??[]]}))}function _e(){return{"Content-Type":"application/json",Accept:"application/json",...ke()}}async function Fn(){if(!j())return null;try{const e=await fetch(R("/api/v1/auth/config"),{headers:_e()});if(!e.ok)return null;const t=await e.json();return{mode:t.mode==="oauth"?"oauth":"password",providerLabel:t.providerLabel||"企业统一身份认证",ready:t.ready!==!1}}catch{return null}}async function eo(e){const t=new URLSearchParams;e.returnTo&&t.set("returnTo",e.returnTo);const n=await fetch(R(`/api/v1/auth/oauth/authorize-url?${t.toString()}`),{headers:_e()});return n.ok?await n.json():{ok:!1,code:n.status===404?"oauth_not_enabled":`http_${n.status}`,error:"无法发起统一身份登录",detail:`GET /auth/oauth/authorize-url 返回 HTTP ${n.status}`,hint:n.status===404?"后端 AUTH_MODE 不是 oauth，或该版本 API 尚未部署统一身份登录":"查看 API 日志中 [oauth] 开头的行",traceId:""}}async function to(e){try{const t=await fetch(R("/api/v1/auth/oauth/callback"),{method:"POST",headers:_e(),body:JSON.stringify(e)});return t.ok?await t.json():{ok:!1,code:`http_${t.status}`,error:"登录请求被拒绝",detail:`POST /auth/oauth/callback 返回 HTTP ${t.status}`,hint:t.status===401?"后端开了 API_KEY，但前端没带 X-API-Key（检查 VITE_API_KEY）":t.status===404?"该版本 API 没有统一身份登录路由，确认部署的是最新构建":"查看 API 日志中 [oauth] 开头的行",traceId:"",steps:[]}}catch(t){return{ok:!1,code:"network_unreachable",error:"连不上服务端",detail:t instanceof Error?t.message:String(t),hint:"确认 Nginx 已反代 /api 到 Nest，且 API 进程在运行",traceId:"",steps:[]}}}async function Kn(){try{const e=await fetch(R("/api/v1/auth/oauth/logout-url"),{headers:_e()});return e.ok?(await e.json()).url??"":""}catch{return""}}const ht="oauth/callback",je="mssclaw_oauth_return_to",qe="mssclaw_oauth_gate_intent";function Un(){return null}function Bn(){return"/MSSClaw/"}function no(e=window.location.pathname){const t=e.replace(/\/+$/,"");return t.endsWith(`/${ht}`)||t.endsWith(ht)}function so(){const e=Bn();return`${window.location.origin}${e.endsWith("/")?e:`${e}/`}`}function ao(e=window.location.search){const t=new URLSearchParams(e);return{code:t.get("code")??"",state:t.get("state")??"",error:t.get("error")??t.get("errorCode")??"",errorDescription:t.get("error_description")??t.get("errorDesc")??""}}function ro(){try{window.history.replaceState(null,"",window.location.pathname)}catch{}}function oo(e){try{e&&e.startsWith("#/")?sessionStorage.setItem(je,e):sessionStorage.removeItem(je)}catch{}}function io(){try{const e=sessionStorage.getItem(je)??"";return sessionStorage.removeItem(je),e.startsWith("#/")?e:""}catch{return""}}function lo(e){try{e&&sessionStorage.setItem(qe,e)}catch{}}function co(){try{const e=sessionStorage.getItem(qe)??"";return sessionStorage.removeItem(qe),e}catch{return""}}let ie=null;const Gn=oe(e=>({mode:"password",providerLabel:"账号密码",ready:!0,resolved:!1,resolve:async()=>{const t=Un();if(t){e({mode:t,providerLabel:t==="oauth"?"企业统一身份认证":"账号密码",ready:!0,resolved:!0});return}if(!j()){e({mode:"password",resolved:!0});return}return ie||(ie=(async()=>{const n=await Fn();e(n?{mode:n.mode,providerLabel:n.providerLabel,ready:n.ready,resolved:!0}:{mode:"password",resolved:!0}),ie=null})(),ie)}}));function xt(){return Gn.getState().mode}const bt="mssclaw_visitor_id",Hn=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;function kt(){var t;if(typeof((t=globalThis.crypto)==null?void 0:t.randomUUID)=="function")return globalThis.crypto.randomUUID();const e=n=>Array.from({length:n},()=>Math.floor(Math.random()*16).toString(16)).join("");return`${e(8)}-${e(4)}-4${e(3)}-a${e(3)}-${e(12)}`}function pe(){var e;try{const t=((e=localStorage.getItem(bt))==null?void 0:e.trim())??"";if(Hn.test(t))return t;const n=kt();return localStorage.setItem(bt,n),n}catch{return kt()}}function po(e=pe()){return`guest:${e}`}const uo=["home","ai-knowledge","me","market-external","market-internal","market-projects","ai-brief","ai-tasks","market-tool","ai-map","task","messages","agents","agent-studio","skills","kb","cases","automation","workflow","tools","office-scenes","memory","prompts","admin","org-members","org-roles","org-depts","org-audit","portal-ops","portal-dashboard","model-ops","executions","approvals"],Wn=["agent-studio","workflow","tools","memory","prompts","admin"];function mo(e){return Wn.includes(e)}const fo=["workspace","platform","ops","system","org"],go=[{id:"home",label:"首页",subtitle:"入口总览 · 工具货架与场景入口",icon:"fa-house",section:"workspace"},{id:"me",label:"个人中心",subtitle:"收藏 · 最近 · 基于市场内容的个人层",icon:"fa-user",section:"workspace"},{id:"task",label:"任务记录",subtitle:"进度 · 结果 · 历史会话（标准/完整）",icon:"fa-list-check",section:"workspace"},{id:"ai-tasks",label:"AI任务",subtitle:"按 Agent 归档的历史执行会话",icon:"fa-robot",section:"workspace"},{id:"ai-map",label:"场景案例",subtitle:"样板间进阶 · 内容由门户运营上架",icon:"fa-map",section:"platform"},{id:"approvals",label:"审批中心",subtitle:"上架 · 更新 · 下架单据",icon:"fa-clipboard-check",section:"platform"},{id:"skills",label:"配置Skill",subtitle:"上架 · 挂载 · 导出（运营）",icon:"fa-cube",section:"platform"},{id:"agents",label:"配置Agent",subtitle:"上架 · 发布 · 编排（运营）",icon:"fa-robot",section:"platform"},{id:"tools",label:"配置工具",subtitle:"连接器 · 外部 API · 上架",icon:"fa-plug",section:"platform"},{id:"office-scenes",label:"配置办公场景",subtitle:"场景字典 · 工具绑定与陈列",icon:"fa-diagram-project",section:"platform"},{id:"kb",label:"管理知识",subtitle:"企业文档 · RAG · 溯源治理",icon:"fa-book-open",section:"platform"},{id:"memory",label:"管理记忆",subtitle:"Agent 长期记忆 · Reflection",icon:"fa-brain",section:"platform"},{id:"automation",label:"自动化设置",subtitle:"定时 · 告警 · 周报",icon:"fa-bolt",section:"platform"},{id:"workflow",label:"工作流设置",subtitle:"LangGraph · 专家编排",icon:"fa-diagram-project",section:"platform"},{id:"prompts",label:"提示词",subtitle:"暂不开放 · 草稿/审批资产库（保留）",icon:"fa-file-code",section:"platform"}],Ve=["portal-ops","portal-dashboard","model-ops","approvals","executions","skills","agents","tools","office-scenes","kb","memory","automation","workflow","org-members","org-roles","org-depts","org-audit"],ho=["org-members","org-roles","org-depts","org-audit"];function qn(e){return e==="prompts"||Ve.includes(e)}function yt(e){const t=Ve.indexOf(e);return t>=0?t:Ve.length+50}function xo(e){return[...e].sort((t,n)=>yt(t.id)-yt(n.id))}const bo={platform:"能力配置",ops:"运营设置",system:"系统设置",org:"组织权限"},Vn={};function ko(e){return e in Vn}function Yn(e,t){return t?t.some(qn)?"ops":"business":!e||e==="business_user"||e==="viewer"?"business":"ops"}function Jn(e,t){return Yn(e,t)}function Xn(e){return e==="agents"||e==="skills"||e==="tools"||e==="office-scenes"||e==="memory"||e==="kb"||e==="prompts"||e==="automation"||e==="workflow"||e==="portal-ops"||e==="portal-dashboard"||e==="model-ops"||e==="executions"||e==="approvals"||e==="admin"||e==="org-members"||e==="org-roles"||e==="org-depts"||e==="org-audit"||e==="workspace-config"||e==="agent-studio"}const Ft=oe((e,t)=>({perspective:"business",hydrate:(n,s)=>{e({perspective:Jn(n,s)})},ensureOpsForView:n=>{t().perspective==="ops"&&Xn(n)}})),Ye="mssclaw_auth_token";let z=0;function Je(){try{return sessionStorage.getItem(Ye)}catch{return null}}function ee(e){try{e?sessionStorage.setItem(Ye,e):sessionStorage.removeItem(Ye)}catch{}}const Kt=6e4;let Te=null;function Ut(){Te&&clearTimeout(Te),Te=null}function Bt(e){const t=e==null?void 0:e.split(".")[1];if(!t)return null;try{const n=JSON.parse(atob(t.replace(/-/g,"+").replace(/_/g,"/")));return typeof n.exp=="number"?n.exp*1e3:null}catch{return null}}function we(e){Ut();const t=Bt(e);if(!t)return;const n=Math.max(5e3,t-Date.now()-Kt);Te=setTimeout(()=>void $.getState().refreshSession(),n)}function Qn(e){const t=zt({deptIds:e.deptIds??[],regionId:e.regionId??null});return{id:e.id,name:e.name,email:e.email,platformRole:Cn(e.platformRole),avatar:e.avatar||"bg-zinc-900",deptIds:t.deptIds,regionId:t.regionId??null}}const Zn={user:null,mode:"guest",isAuthenticated:!1,isGuest:!0,shellReady:!0,menus:null,editableMenus:[]};function ve(e){const t={...Qn(e.user),roleId:e.user.platformRole,roleName:e.roleName},n=e.menus??null;return Ft.getState().hydrate(t.platformRole,n),{user:t,menus:n,editableMenus:e.editableMenus??n??[],mode:"user",isAuthenticated:!0,isGuest:!1,shellReady:!0,bootstrapped:!0}}const $=oe((e,t)=>({user:null,mode:"guest",isAuthenticated:!1,isGuest:!1,shellReady:!1,visitorId:"",bootstrapped:!1,menus:null,editableMenus:[],suppressGuestGate:!1,clearGuestGateSuppression:()=>e({suppressGuestGate:!1}),enterGuest:n=>{Ut(),Ft.getState().hydrate(void 0),e({...Zn,visitorId:t().visitorId||pe(),suppressGuestGate:!!(n!=null&&n.suppressGate)})},hydrateFromServer:async()=>{const n=++z,s=Je();if(!j()){t().isAuthenticated||t().enterGuest(),e({bootstrapped:!0});return}try{const a=s?await ha():null;if(n!==z)return;if(a!=null&&a.ok){e({...ve(a),visitorId:t().visitorId||pe()}),we(s);return}const r=await Tt();if(n!==z)return;if(r){ee(r.token),e({...ve(r),visitorId:t().visitorId||pe()}),we(r.token);return}if(!s){t().isAuthenticated||t().enterGuest(),e({bootstrapped:!0});return}}catch{if(n!==z)return;t().isAuthenticated||t().enterGuest(),e({bootstrapped:!0});return}if(n===z){if(ee(null),t().isAuthenticated&&t().user){e({bootstrapped:!0});return}t().enterGuest(),e({bootstrapped:!0})}},refreshSession:async()=>{const n=z,s=await Tt();return n!==z?!!s:s?(ee(s.token),e(ve(s)),we(s.token),!0):(t().isAuthenticated&&Je()&&(ee(null),t().enterGuest()),!1)},login:async(n,s)=>{if(xt()==="oauth")return{ok:!1,error:"当前环境已启用企业统一身份登录，请从登录页跳转认证"};const a=t().visitorId||pe();z+=1;const r=me.getState().apiStatus;if(j()&&r!=="unreachable"&&r!=="local-demo")try{const l=await ga({email:n,password:s,visitorId:a});if(l.ok&&l.token)return ee(l.token),me.setState({apiConnected:!0,apiStatus:"connected"}),e({...ve(l),visitorId:a,suppressGuestGate:!1}),we(l.token),{ok:!0};if(l.ok===!1){const c=l.error||"登录失败";if(/密码|账号|不存在|停用|尚未|未激活/.test(c)&&!/\b40[45]\b/.test(c))return{ok:!1,error:c}}}catch{me.setState({apiConnected:!1,apiStatus:"unreachable"})}return ue.getState().markFailed(),{ok:!1,error:Mn}},logout:async()=>{const n=xa();if(ee(null),t().enterGuest({suppressGate:!0}),xt()==="oauth"){await n;const s=await Kn();s&&window.location.assign(s)}},getUserId:()=>{var n;return((n=t().user)==null?void 0:n.id)??""},getUserName:()=>{var n;return((n=t().user)==null?void 0:n.name)??""},getPlatformRole:()=>{var n;return((n=t().user)==null?void 0:n.platformRole)??"viewer"},getOrgAffiliation:()=>{var n,s;return zt({deptIds:((n=t().user)==null?void 0:n.deptIds)??[],regionId:((s=t().user)==null?void 0:s.regionId)??null})}}));typeof document<"u"&&document.addEventListener("visibilitychange",()=>{if(document.visibilityState!=="visible")return;const{isAuthenticated:e,menus:t,refreshSession:n}=$.getState(),s=Bt(Je());e&&t&&s&&s-Date.now()<Kt&&n()});const yo=Object.freeze(Object.defineProperty({__proto__:null,useSessionStore:$},Symbol.toStringTag,{value:"Module"}));function Ce(){return $.getState().getUserId()}function es(){return $.getState().getUserName()}function Gt(){return $.getState().getPlatformRole()}function nt(){return $.getState().getOrgAffiliation()}function ts(){return nt().deptIds}function ns(){return nt().regionId??null}function ss(e){return(e??Gt())==="super_admin"}function as(e){const t=$(s=>s.menus),n=$(s=>{var a;return(a=s.user)==null?void 0:a.platformRole});return t?t.includes(e):n==="super_admin"}const So=Object.freeze(Object.defineProperty({__proto__:null,getCurrentDeptIds:ts,getCurrentOrgAffiliation:nt,getCurrentPlatformRole:Gt,getCurrentRegionId:ns,getCurrentUserId:Ce,getCurrentUserName:es,isSystemAdmin:ss,useHasMenu:as},Symbol.toStringTag,{value:"Module"})),rs=A(["user","agent","other","system","typing","plan","step"]),os=H({role:rs,text:g().optional(),name:g().optional(),avatar:g().optional(),streaming:Ge().optional(),planId:g().optional(),steps:X(g()).optional(),awaitingApproval:Ge().optional(),mountedSkills:X(g()).optional(),stepId:g().optional(),index:fe().optional(),total:fe().optional(),label:g().optional(),stepStatus:A(["pending","running","done"]).optional()}),is=H({id:g(),title:g(),type:A(["bot","group"]),icon:g(),color:g(),status:g(),history:X(os),prompts:X(g()),sessionGroup:A(["pinned","agents"]).optional(),iconBg:g().optional(),badge:g().optional(),agentId:g().optional(),actionType:A(["marketing","knowledge"]).optional(),taskSource:A(["skill","expert","case_demo","embedded","other"]).optional(),businessScenarioId:A(["S1","S2","S3","S4","S5","S6","S7","S8"]).optional(),skillId:g().optional(),ownerUserId:g().optional(),ownerEmail:g().optional(),createdAt:fe().optional(),pinnedAt:fe().optional(),adminId:g().optional(),members:X(H({id:g(),name:g(),email:g().optional(),avatar:g().optional(),role:A(["admin","member"]),canUseAi:Ge().default(!0)})).optional()});function $e(e){return e.type==="group"||e.sessionGroup==="pinned"}function wo(e,t){var s;const n=Ce();return $e(e)?e.adminId?e.adminId===n:((s=e.members)==null?void 0:s.some(a=>a.id===n&&a.role==="admin"))??!1:!1}function vo(e,t){var a;const n=Ce();if(!$e(e)||!((a=e.members)!=null&&a.length))return!0;const s=e.members.find(r=>r.id===n);return(s==null?void 0:s.canUseAi)!==!1}function Io(e,t){if($e(e))return!1;const n=(t??Ce()).trim();return n?e.ownerUserId===n:!1}const ls=new Set(["marketing","knowledge","smoke_task","test_task"]);function Ao(e){return!!(e.id.startsWith("task_")||e.id.startsWith("warroom_")||ls.has(e.id)||e.sessionGroup==="agents"||!e.sessionGroup&&e.type==="bot")}A(["chat","agent","prompt","skill","tool","workflow","knowledge","memory","settings"]);const Mo=H({skill:g(),time:g(),label:g(),detail:g()});const cs=[{id:"agent-marketing",primarySkillId:"skill-data-analysis",agentType:"marketing",systemPrompt:"你是 MSS 营销 Agent，面向业务的问数、问报告与智能分析专家。优先编排：多源数据分析 → SO/零售洞察 → 价格与异动解释 → 行动建议与简报。口径不清时先声明假设。标注演示样例。",demoPrompt:"@营销 Agent 请基于演示样例做一次智能分析：近一周欧洲穿戴销售趋势、代表处排名异动，并输出可进例会的简报与三条行动建议（可衔接 /数据分析、/so报表）。",planSteps:["澄清问数/问报告目标与口径","挂载数据分析并汇总关键指标（/数据分析）","对齐 SO/零售报表并标注异常（/so报表、零售洞察）","输出洞察结论、风险与行动建议简报"],mockReport:`✅ **营销 Agent 完成**（演示样例）

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

评分：话术 4/5 · 价值塑造 3/5。先共情再对比，补充以旧换新钩子。`}],ds=new Map(cs.map(e=>[e.id,e]));function ps(e){return e?ds.get(e)??null:null}const us=[{id:"agent-marketing",name:"营销 Agent",desc:"【业务专家】AI 问数、问报告与智能分析：销售/渠道/零售数据洞察与行动建议（编排多技能）",category:"manage",bizLine:"GTM/MKT/渠道",homeTag:"gtm",ownerDeptIds:["gtm","mkt","channel","retail","ecommerce"],ownerRegionIds:["china","apac","mea","latam","europe","eurasia"],author:"华为 MSS",published:!0,invokes:5200,updatedAt:"2026-08-12",skillIds:["skill-data-analysis","skill-so-report","skill-weekly-report","skill-retail-insight","skill-price-monitor","skill-work-summary"],chatId:"marketing",icon:"fa-chart-line",color:"from-zinc-800 to-zinc-950",scenarioTags:["问数","报表","分析","营销","SO"]},{id:"agent-data-analysis",name:"数据分析 Agent",desc:"【办公提效】多源数据自动分析，融合 ISRP/零售/电商数据输出洞察报表（可对话编排 Skill）",category:"office",bizLine:"GTM/渠道",homeTag:"gtm",ownerDeptIds:["gtm","channel"],ownerRegionIds:["latam","mea","eurasia","china"],author:"华为 MSS",published:!0,invokes:4280,updatedAt:"2026-08-05",skillIds:["skill-data-analysis","skill-so-report","skill-work-summary"],chatId:"marketing",icon:"fa-chart-pie",color:"from-zinc-700 to-zinc-900",scenarioTags:["综履","结算","返利","SO"]},{id:"agent-doc-review",name:"文档解读 Agent",desc:"【办公提效】营销物料/合同/招投标文档内容正确性、风险与合规筛查（可对话编排 Skill）",category:"office",bizLine:"MKT/质量与运营",homeTag:"mkt",ownerDeptIds:["mkt","quality"],ownerRegionIds:["europe"],author:"华为 MSS",published:!0,invokes:3150,updatedAt:"2026-07-28",skillIds:["skill-doc-compliance","skill-doc-gen","skill-doc-parser"],chatId:"knowledge",icon:"fa-file-shield",color:"from-stone-500 to-zinc-700",scenarioTags:["办公提效","平台","合规","质量与运营"]},{id:"agent-file-organize",name:"文件整理 Agent",desc:"【办公提效】本地文件夹/员工助手/Email 多源文件清洗归档与个人总结（可对话编排 Skill）",category:"office",bizLine:"HR",homeTag:"hr",ownerDeptIds:["hr"],author:"华为 MSS",published:!0,invokes:1890,updatedAt:"2026-06-18",skillIds:["skill-file-archive","skill-work-summary","skill-doc-parser"],chatId:"marketing",icon:"fa-folder-tree",color:"from-slate-600 to-slate-800",scenarioTags:["知识","归档"]},{id:"agent-ppt",name:"PPT 生成 Agent",desc:"【办公提效】多源数据驱动 PPT 自动生成，支持员工助手内部 POC 验证（可对话编排 Skill）",category:"office",bizLine:"MKT/GTM",homeTag:"mkt",ownerDeptIds:["mkt","gtm"],ownerRegionIds:["latam"],author:"华为 MSS",published:!0,invokes:2240,updatedAt:"2026-07-09",skillIds:["skill-ppt-gen","skill-data-analysis","skill-doc-gen"],chatId:"marketing",icon:"fa-file-powerpoint",color:"from-neutral-500 to-zinc-700",scenarioTags:["办公提效","PPT","平台"]},{id:"agent-meeting",name:"会议纪要 Agent",desc:"【办公提效】会议纪要 AI 自动生成，小批量试点 60% AI + 40% 人工（可对话编排 Skill）",category:"office",bizLine:"HR",homeTag:"hr",ownerDeptIds:["hr"],author:"华为 MSS",published:!0,invokes:5340,updatedAt:"2026-08-14",skillIds:["skill-meeting-minutes","skill-doc-gen","skill-wecom"],chatId:"marketing",icon:"fa-clipboard-list",color:"from-slate-500 to-zinc-700",scenarioTags:["办公提效","会议","平台"]},{id:"agent-launch-sentiment",name:"舆情快报 Agent",desc:"【管理提效】产品发布舆情 AI 分析快报，面向 MKT/服务（可对话编排 Skill）",category:"manage",bizLine:"MKT/服务",homeTag:"mkt",ownerDeptIds:["mkt","service"],ownerRegionIds:["europe"],author:"华为 MSS",published:!0,invokes:1420,updatedAt:"2026-06-30",skillIds:["skill-launch-sentiment","skill-doc-gen","skill-wecom"],chatId:"marketing",icon:"fa-bullhorn",color:"from-zinc-600 to-zinc-800"},{id:"agent-survey",name:"问卷洞察 Agent",desc:"【管理提效】洞察部用户问卷调研设计与开放题洞察分析（可对话编排 Skill）",category:"manage",bizLine:"MKT",homeTag:"mkt",ownerDeptIds:["mkt"],author:"华为 MSS",published:!0,invokes:980,updatedAt:"2026-05-22",skillIds:["skill-survey-insight","skill-data-analysis","skill-doc-gen"],chatId:"marketing",icon:"fa-square-poll-vertical",color:"from-stone-500 to-zinc-600"},{id:"agent-review-collect",name:"评分采集 Agent",desc:"【管理提效】采集 Amazon 等平台 3C 商品购买页用户订单评论，清洗后交接翻译链路（可对话编排 Skill）",category:"manage",bizLine:"电商/服务",homeTag:"ecommerce",ownerDeptIds:["ecommerce","service"],ownerRegionIds:["apac","europe","latam"],author:"华为 MSS",published:!0,invokes:2100,updatedAt:"2026-07-16",skillIds:["skill-review-collect","skill-review-translate","skill-data-analysis"],chatId:"knowledge",icon:"fa-download",color:"from-emerald-700 to-slate-800",scenarioTags:["评论分析","评论","电商"]},{id:"agent-review-translate",name:"语种翻译 Agent",desc:"【管理提效】将采集的多语种订单评论统一翻译成英语与中文，保留原文对照（可对话编排 Skill）",category:"manage",bizLine:"电商/服务",homeTag:"ecommerce",ownerDeptIds:["ecommerce","mkt","service"],ownerRegionIds:["apac","europe","latam"],author:"华为 MSS",published:!0,invokes:1960,updatedAt:"2026-07-02",skillIds:["skill-review-translate","skill-review-cluster","skill-doc-gen"],chatId:"knowledge",icon:"fa-language",color:"from-sky-600 to-slate-700",scenarioTags:["评论分析","评论","电商","翻译","本地化","小语种"]},{id:"agent-review",name:"评论分析 Agent",desc:"【管理提效】对采集清洗并完成中英翻译的订单评论做情感判断与用户数据挖掘，面向电商/服务/MKT",category:"manage",bizLine:"电商/服务",homeTag:"ecommerce",ownerDeptIds:["ecommerce","service","mkt"],ownerRegionIds:["apac","europe"],author:"华为 MSS",published:!0,invokes:2780,updatedAt:"2026-07-21",skillIds:["skill-review-cluster","skill-data-analysis","skill-doc-gen"],chatId:"knowledge",icon:"fa-comments",color:"from-slate-500 to-slate-700",scenarioTags:["评论分析","评论","电商"]},{id:"agent-retail-insight",name:"零售洞察 Agent",desc:"【管理提效】零售信息洞察 π 例行报告，门店 DOS/转化/陈列分析（可对话编排 Skill）",category:"manage",bizLine:"零售/电商",homeTag:"retail",ownerDeptIds:["retail","ecommerce"],ownerRegionIds:["latam","eurasia","china"],author:"华为 MSS",published:!0,invokes:3680,updatedAt:"2026-08-08",skillIds:["skill-retail-insight","skill-so-report","skill-doc-gen"],chatId:"marketing",icon:"fa-store",color:"from-neutral-600 to-zinc-800"},{id:"agent-price-monitor",name:"价格监测 Agent",desc:"【管理提效】18 国多渠道价格 & offer 监测，覆盖 5347 行/周级入表（可对话编排 Skill）",category:"manage",bizLine:"渠道/电商/GTM",homeTag:"gtm",ownerDeptIds:["gtm","channel","ecommerce"],ownerRegionIds:["china","apac","mea","latam","europe","eurasia"],author:"华为 MSS",published:!0,invokes:4120,updatedAt:"2026-08-11",skillIds:["skill-price-monitor","skill-data-analysis","skill-wecom"],chatId:"marketing",icon:"fa-tags",color:"from-emerald-800 to-emerald-900",scenarioTags:["价格监测","offer","价格"]},{id:"agent-hr-resume",name:"简历筛选 Agent",desc:"【流程提效】JD 解析 + 简历筛选 + 面试分析三 Agent 协同，面向 HR/用人部门（可对话编排 Skill）",category:"process",bizLine:"HR",homeTag:"hr",ownerDeptIds:["hr"],author:"华为 MSS",published:!0,invokes:1560,updatedAt:"2026-06-06",skillIds:["skill-jd-parser","skill-resume-screen","skill-interview-analysis"],chatId:"knowledge",icon:"fa-user-check",color:"from-stone-600 to-zinc-800",scenarioTags:["招聘","HR","面试","简历","JD"]},{id:"agent-training",name:"培训内容 Agent",desc:"【流程提效】Nova 新品培训内容生成，多 Agent 对抗协同与门店陪练衔接（可对话编排 Skill）",category:"process",bizLine:"零售/门店",homeTag:"retail",ownerDeptIds:["retail"],ownerRegionIds:["apac"],author:"华为 MSS",published:!0,invokes:1890,updatedAt:"2026-06-24",skillIds:["skill-training-gen","skill-retail-coach","skill-doc-gen"],chatId:"knowledge",icon:"fa-graduation-cap",color:"from-slate-600 to-zinc-700",scenarioTags:["门店","培训"]},{id:"agent-knowledge",name:"知识 Agent",desc:"【业务专家】知识问答与知识陪练：制度/SOP/案例检索问答，并可开展话术与培训陪练（编排多技能）",category:"experience",bizLine:"服务/质量与运营/零售",homeTag:"service",ownerDeptIds:["service","quality","retail","hr"],ownerRegionIds:["china","apac","mea","latam","europe","eurasia"],author:"华为 MSS",published:!0,invokes:3520,updatedAt:"2026-08-01",skillIds:["skill-rag","skill-rerank","skill-knowledge-digest","skill-complaint-sop","skill-frontline-script","skill-retail-coach","skill-training-gen"],chatId:"knowledge",icon:"fa-book-open",color:"from-zinc-600 to-zinc-800",scenarioTags:["知识","RAG","SOP","检索","客诉"]},{id:"agent-retail-coach",name:"零售陪练 Agent",desc:"【体验提升】门店 AI 陪练、卖点演练与考核反馈，衔接培训内容 Agent（可对话编排 Skill）",category:"experience",bizLine:"零售/门店",homeTag:"retail",ownerDeptIds:["retail"],ownerRegionIds:["apac"],author:"华为 MSS",published:!0,invokes:860,updatedAt:"2026-05-15",skillIds:["skill-retail-coach","skill-training-gen","skill-wecom"],chatId:"knowledge",icon:"fa-headset",color:"from-zinc-700 to-zinc-900",scenarioTags:["门店","培训","Nova","陪练"]}];function ms(e){const t=ps(e.id);return t?{...e,systemPrompt:t.systemPrompt,primarySkillId:t.primarySkillId,demoPrompt:t.demoPrompt,planSteps:[...t.planSteps]}:e}const st=us.map(ms),fs=new Map(st.map(e=>[e.id,e]));function To(e){return e.map(t=>{var a,r;const n=fs.get(t.id);if(!n)return t;const s={};return!t.updatedAt&&n.updatedAt&&(s.updatedAt=n.updatedAt),!((a=t.capabilityTypeIds)!=null&&a.length)&&((r=n.capabilityTypeIds)!=null&&r.length)&&(s.capabilityTypeIds=n.capabilityTypeIds),Object.keys(s).length?{...t,...s}:t})}const gs={"skill-data-analysis":{ownerDeptIds:["gtm"],ownerRegionId:"apac"},"skill-doc-gen":{ownerDeptIds:["mkt"],ownerRegionId:null},"skill-doc-compliance":{ownerDeptIds:["quality"],ownerRegionId:"europe"},"skill-file-archive":{ownerDeptIds:["hr"],ownerRegionId:null},"skill-ppt-gen":{ownerDeptIds:["mkt"],ownerRegionId:null},"skill-meeting-minutes":{ownerDeptIds:["hr"],ownerRegionId:null},"skill-work-summary":{ownerDeptIds:["hr"],ownerRegionId:null},"skill-doc-parser":{ownerDeptIds:["mkt"],ownerRegionId:null},"skill-launch-sentiment":{ownerDeptIds:["mkt"],ownerRegionId:"europe"},"skill-survey-insight":{ownerDeptIds:["mkt"],ownerRegionId:null},"skill-review-collect":{ownerDeptIds:["ecommerce"],ownerRegionId:"apac"},"skill-review-translate":{ownerDeptIds:["ecommerce"],ownerRegionId:"apac"},"skill-review-cluster":{ownerDeptIds:["ecommerce"],ownerRegionId:"apac"},"skill-retail-insight":{ownerDeptIds:["retail"],ownerRegionId:"latam"},"skill-price-monitor":{ownerDeptIds:["gtm"],ownerRegionId:"apac"},"skill-so-report":{ownerDeptIds:["gtm"],ownerRegionId:"apac"},"skill-jd-parser":{ownerDeptIds:["hr"],ownerRegionId:null},"skill-resume-screen":{ownerDeptIds:["hr"],ownerRegionId:null},"skill-interview-analysis":{ownerDeptIds:["hr"],ownerRegionId:null},"skill-training-gen":{ownerDeptIds:["retail"],ownerRegionId:"apac"},"skill-rag":{ownerDeptIds:["service"],ownerRegionId:null},"skill-rerank":{ownerDeptIds:["service"],ownerRegionId:null},"skill-retail-coach":{ownerDeptIds:["retail"],ownerRegionId:"apac"},"skill-complaint-sop":{ownerDeptIds:["service"],ownerRegionId:"eurasia"},"skill-wecom":{ownerDeptIds:["service"],ownerRegionId:null},"skill-l10n-localize":{ownerDeptIds:["mkt"],ownerRegionId:"mea"},"skill-sales-copy":{ownerDeptIds:["mkt"],ownerRegionId:null},"skill-frontline-script":{ownerDeptIds:["service"],ownerRegionId:null},"skill-knowledge-digest":{ownerDeptIds:["service"],ownerRegionId:null},"skill-weekly-report":{ownerDeptIds:["gtm"],ownerRegionId:"apac"},"skill-comp-brief":{ownerDeptIds:["gtm"],ownerRegionId:"apac"},"skill-channel-brief":{ownerDeptIds:["channel"],ownerRegionId:"china"},"skill-email-draft":{ownerDeptIds:["mkt"],ownerRegionId:null}};function hs(e){if(e!=null&&e.length)return[e[0]]}function xs(e){return e.map(t=>bs(t))}function bs(e){const t=gs[e.id];if(t){const s=t.ownerRegionId??null;return{...e,sourceType:e.sourceType??"internal",visibility:"org",ownerDeptIds:[...t.ownerDeptIds],ownerRegionId:s,ownerRegionIds:s?[s]:[],featuredInDoTask:typeof e.featuredInDoTask=="boolean"?e.featuredInDoTask:void 0,featuredInMssMarket:typeof e.featuredInMssMarket=="boolean"?e.featuredInMssMarket:void 0,published:e.published!==!1}}const n=e.ownerRegionId??null;return{...e,sourceType:e.sourceType??"internal",visibility:e.visibility??"org",ownerDeptIds:hs(e.ownerDeptIds),ownerRegionId:n,ownerRegionIds:Array.isArray(e.ownerRegionIds)&&e.ownerRegionIds.length>0?[e.ownerRegionIds[0]]:n?[n]:[]}}const ks=/[\u4e00-\u9fff]/,Ht={"skill-data-analysis":"多源数据分析","skill-doc-gen":"文档初稿生成","skill-doc-compliance":"文档合规筛查","skill-file-archive":"智能文件归档","skill-ppt-gen":"PPT 自动生成","skill-meeting-minutes":"会议纪要生成","skill-work-summary":"个人工作总结","skill-doc-parser":"文档解析","skill-launch-sentiment":"发布会舆情快报","skill-survey-insight":"问卷洞察分析","skill-review-collect":"评分采集","skill-review-translate":"评论语种翻译","skill-review-cluster":"订单评论分析","skill-retail-insight":"零售信息洞察","skill-price-monitor":"价格与 Offer 监测","skill-so-report":"SO/SI 报表","skill-jd-parser":"JD 解析","skill-resume-screen":"简历筛选","skill-interview-analysis":"面试分析","skill-training-gen":"培训内容生成","skill-rag":"企业知识检索","skill-rerank":"检索重排序","skill-retail-coach":"零售 AI 陪练","skill-complaint-sop":"客诉 SOP 匹配","skill-wecom":"企微消息推送","skill-l10n-localize":"小语种本地化翻译","skill-sales-copy":"卖点文案写作","skill-frontline-script":"一线统一话术","skill-knowledge-digest":"组织知识沉淀","skill-weekly-report":"经营分析周报","skill-comp-brief":"竞品简报","skill-channel-brief":"渠道作战简报","skill-email-draft":"商务邮件草稿"};function Xe(e){return!!(e&&ks.test(e))}function ys(e){var a;const t=(a=e.nameZh)==null?void 0:a.trim();if(t)return t;const n=e.id?Ht[e.id]:void 0;if(n)return n;if(Xe(e.name))return e.name.trim();const s=(e.command||"").replace(/^\//,"").trim();return Xe(s)?s:(e.name||e.nameEn||"未命名技能").trim()}function Po(e){return(e.descZh||e.desc||e.descEn||"").trim()}function No(e){const t=(e.nameZh||ys(e)||"").trim(),n=(e.descZh||e.desc||"").trim();return{...e,nameZh:t,descZh:n,name:t||(e.nameEn||e.name||"").trim(),desc:n||(e.descEn||e.desc||"").trim()}}function Ss(e){var s,a;const t=((s=e.nameZh)==null?void 0:s.trim())||Ht[e.id]||void 0,n=((a=e.nameEn)==null?void 0:a.trim())||(e.name&&!Xe(e.name)?e.name.trim():void 0);return!t&&!n?e:{...e,...t?{nameZh:t}:{},...n?{nameEn:n}:{}}}function W(e,t="Skill"){const n=["120ms","280ms","450ms","360ms","520ms","300ms"];return e.map((s,a)=>({skill:`${t}_${a+1}`,time:n[a%n.length],label:s,detail:`执行：${s}`}))}function D(e){return{...e,execSteps:e.execSteps??W(e.planSteps,"Office")}}const ws=[D({id:"skill-data-analysis",agentType:"marketing",planSteps:["解析分析意图与业务实体（品类/区域/时间窗）","对齐多源指标口径（ISRP / 零售 / 电商）","异动归因与关键驱动因子拆解","生成可视化要点与下一步行动建议"],demoPrompt:"/数据分析 请基于演示样例，输出近一周欧洲穿戴品类销售趋势：环比、TOP 代表处、异动归因与 NBA 建议。",instructions:`你是 MSS「多源数据分析」Skill（/数据分析）。基于 ISRP/零售/电商等多源数据做趋势与归因分析。

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
可继续调用 \`/数据分析\` 做归因。`})],vs="skill-review-cluster",Is=`你是 MSS 电渠「订单评论分析」Skill（/评论分析）。对**已采集并完成中英双语清洗**的订单评论做正向/负向情感判断与用户数据挖掘，输出可进例会的 VoC 行动建议。

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
- 合规：仅作合法市场与口碑分析用途`,St=["确认已承接采集+翻译清洗语料（或演示样例）","星级分布与正负向情感判断","主题聚类与用户数据挖掘（诉求/场景/退换信号）","卖点 GAP 与预警识别","生成分角色行动建议（电商 / 服务 / MKT）"];function As(e="/评论分析"){return`${e} 请基于 Amazon MX 演示样例 ASIN B0FPG9431G（假设已完成采集与中英翻译清洗），输出情感判断、用户数据挖掘、卖点 GAP、预警与分角色建议。`}const Ms=`✅ **订单评论分析已完成**（演示样例 · ASIN \`B0FPG9431G\` · 经采集→翻译清洗）

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
- **MKT**：筛选高星长评作拥护者素材`,Ts={id:vs,instructions:Is,planSteps:[...St],demoPrompt:As(),mockReport:Ms,execSteps:W([...St],"Review"),agentType:"knowledge"},Ps="skill-review-collect",Ns=`你是 MSS 电渠「评分采集」Skill（/评论采集）。从电商平台商品购买页采集用户订单评论（已购已用），输出可交给下游翻译/分析的干净样本包。

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
- 不要编造精确到个位的虚假统计；演示样例须标注`,wt=["确认平台/站点/ASIN 与目标评论量","拉取购买页订单评论并去重清洗","输出星级/语种粗分与样本清单","标注质量缺口并交接给翻译链路"];function Rs(e="/评论采集"){return`${e} 请采集 Amazon MX 演示样例 ASIN B0FPG9431G（3C 穿戴）购买页订单评论，输出任务卡、样本清单（含星级/语种/原文摘要）与交接说明，标注演示样例。`}const js=`✅ **评分采集已完成**（演示样例 · ASIN \`B0FPG9431G\` · Amazon MX）

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
请将样本清单交给 **语种翻译 Agent**（/评论翻译），统一产出中英双语后再进入评论分析。`,Os={id:Ps,instructions:Ns,planSteps:[...wt],demoPrompt:Rs(),mockReport:js,execSteps:W([...wt],"Collect"),agentType:"knowledge"},Ls="skill-review-translate",_s=`你是 MSS 电渠「语种翻译」Skill（/评论翻译）。将上游采集的多语种订单评论统一翻译为**英语 + 中文**，保留原文，供评论分析使用。

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
- 低置信度译文不得伪装成精确；演示样例须标注`,vt=["接收采集样本并识别源语分布","逐条译为英语与中文并保留原文","统一术语/专名，标注低置信度行","输出双语对照表并交接给分析链路"];function Cs(e="/评论翻译"){return`${e} 请将 Amazon MX 演示样例 ASIN B0FPG9431G 的多语种订单评论统一翻译为英语和中文，输出双语对照表（保留原文），并标注演示样例。`}const $s=`✅ **语种翻译已完成**（演示样例 · ASIN \`B0FPG9431G\`）

### 一、任务卡
- 源语：es-MX 为主 · 目标：en + zh-CN
- 条数：演示批次 12 条

### 二、双语对照（节选）
| # | 原文 | EN | ZH |
| --- | --- | --- | --- |
| 1 | Es muy bueno… pero el GPS es poco preciso. | Nice design, but GPS is inaccurate. | 外观不错，但 GPS 不够准。 |
| 2 | La batería dura todo el día. | Battery lasts all day. | 续航能撑一整天。 |

### 三、交接
请将双语对照表交给 **评论分析 Agent**（/评论分析）做情感判断与用户洞察挖掘。`,Es={id:Ls,instructions:_s,planSteps:[...vt],demoPrompt:Cs(),mockReport:$s,execSteps:W([...vt],"Translate"),agentType:"knowledge"};function le(e){return{...e,execSteps:e.execSteps??W(e.planSteps,"Manage")}}const zs=[le({id:"skill-launch-sentiment",agentType:"marketing",planSteps:["界定产品/发布会与监测窗口","聚合社媒与媒体声量","情感分层与热点主题聚类","输出快报与危机/机会建议"],demoPrompt:"/舆情快报 请基于演示样例，输出某穿戴新品发布会 48h 舆情快报：声量、情感、热点与建议。",instructions:`你是 MSS「发布会舆情快报」Skill（/舆情快报）。

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
- 服务：备好开箱/配对 FAQ`}),le({id:"skill-survey-insight",agentType:"marketing",planSteps:["确认问卷主题与样本说明","清洗与分层（人群/区域）","交叉分析关键题项","输出洞察与行动建议"],demoPrompt:"/问卷洞察 请基于演示样例，分析用户满意度问卷：NPS、痛点 TOP、分人群差异与建议。",instructions:`你是 MSS「问卷洞察」Skill（/问卷洞察）。

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
- MKT：包装内页多语种改版试点`}),le({id:"skill-retail-insight",agentType:"marketing",planSteps:["选定门店范围与指标（DOS/转化/陈列）","拉取并校验零售数据口径","识别异常门店与机会门店","生成洞察 π 报告与动作清单"],demoPrompt:"/零售洞察 请基于演示样例，输出 3 月代表处 DOS/转化洞察：异常门店、原因假设与动作。",instructions:`你是 MSS「零售信息洞察 π」Skill（/零售洞察）。

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
- 复制 DE 高转化话术到 IT`}),le({id:"skill-price-monitor",agentType:"marketing",planSteps:["确认监测国家、渠道与 SKU 清单","聚合价格与 offer 变化","识别异常降价/窜货信号","输出监测简报与跟进建议"],demoPrompt:"/价格监测 请基于演示样例，输出 18 国中选 3 国穿戴主力 SKU 的价格与 offer 监测简报。",instructions:`你是 MSS「价格与 Offer 监测」Skill（/价格监测）。

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
- 渠道：同步官方活动日历`}),le({id:"skill-so-report",agentType:"marketing",planSteps:["确认统计周期与剔除规则（如 IoT）","汇总代表处 SO/SI 与排名","计算环比与结构占比","生成报表结论与跟进项"],demoPrompt:"/so报表 请基于演示样例，输出各代表处累计 SO 排名（剔除 IoT），含环比与简要结论。",instructions:`你是 MSS「SO/SI 报表」Skill（/so报表）。

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
- 与 FR 对齐促销与库存`})],Ds=[...zs,Os,Es,Ts];function Ie(e){return{...e,execSteps:e.execSteps??W(e.planSteps,"Process")}}const Fs=[Ie({id:"skill-jd-parser",agentType:"knowledge",planSteps:["识别岗位与职级信息","抽取职责、要求与胜任力标签","结构化为招聘标准字段","输出筛选权重建议"],demoPrompt:"/jd解析 请基于演示样例，解析「区域电商运营」JD：职责、硬性要求、胜任力与筛选权重。",instructions:`你是 MSS「JD 解析」Skill（/jd解析）。

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
硬性 40% · 项目经验 35% · 软技能 25%`}),Ie({id:"skill-resume-screen",agentType:"knowledge",planSteps:["对齐 JD 关键要求","解析简历经历与成果","人岗匹配打分与风险点","输出面试关注清单"],demoPrompt:"/简历筛选 请基于演示样例，对 1 份电商运营简历做人岗匹配：得分、亮点、风险、面试问题。",instructions:`你是 MSS「简历筛选」Skill（/简历筛选）。

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
2. 如何处理渠道价格冲突`}),Ie({id:"skill-interview-analysis",agentType:"knowledge",planSteps:["整理面试记录与评价维度","提取行为事例与能力证据","生成评估报告与录用建议倾向","列出待核实背景调查点"],demoPrompt:"/面试分析 请基于演示样例面试记录，输出评估报告：维度得分、证据、倾向建议。",instructions:`你是 MSS「面试分析」Skill（/面试分析）。

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
- 上一段离职原因`}),Ie({id:"skill-training-gen",agentType:"knowledge",planSteps:["确认产品/受众与课时","设计学习目标与大纲","生成讲义要点与测验题","输出门店演练脚本"],demoPrompt:"/培训内容 请基于演示样例，生成 Nova 新品门店 45 分钟培训大纲、测验与演练脚本。",instructions:`你是 MSS「培训内容生成」Skill（/培训内容）。

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
店员 A 演示 → 店员 B 扮演顾虑价格顾客 → 反馈 2 条改进。`})];function ce(e){return{...e,execSteps:e.execSteps??W(e.planSteps,"Exp")}}const Ks=[ce({id:"skill-rag",agentType:"knowledge",planSteps:["提问重写与术语对齐","按业务分区向量检索","汇总候选文档块","生成带引用的回答草稿"],demoPrompt:"/检索 请基于演示样例知识库，回答：欧洲门店 DOS 过高时应按什么 SOP 处理？并给出引用。",instructions:`你是 MSS「企业知识检索」Skill（/检索）。按业务部门分区做向量检索演示。

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
- [调拨指引 §2] 演示锚点`}),ce({id:"skill-rerank",agentType:"knowledge",planSteps:["接收初检候选列表","Cross-Encoder 语义重排","截断 Top-K 并解释排序理由","输出供摘要使用的精选块"],demoPrompt:"/rerank 请基于演示样例，对 8 条检索候选重排为 Top-3，并说明排序理由。",instructions:`你是 MSS「检索重排序」Skill（/rerank）。

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
可进入抗幻觉摘要生成。`}),ce({id:"skill-retail-coach",agentType:"knowledge",planSteps:["设定演练场景与考核点","生成顾客异议与标准应答","模拟一轮对话并评分","输出改进建议与再练脚本"],demoPrompt:"/陪练 请基于演示样例，开展一轮「价格贵」异议处理陪练：脚本、评分与改进建议。",instructions:`你是 MSS「零售 AI 陪练」Skill（/陪练）。

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
「贵在多两天续航和更稳的运动定位，按周均下来…」`}),ce({id:"skill-complaint-sop",agentType:"knowledge",planSteps:["识别客诉类型与紧急度","匹配 SOP 与话术模板","生成对客回复草稿","列出升级路径与工单字段"],demoPrompt:"/客诉 请基于演示样例，处理「物流延误」客诉：SOP 匹配、对客话术与是否升级。",instructions:`你是 MSS「客诉 SOP 匹配」Skill（/客诉）。

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
订单号 / 延误时长 / 补偿意向`}),ce({id:"skill-wecom",agentType:"marketing",planSteps:["确认推送对象与消息类型","组装卡片/文本内容","校验敏感信息与频率","输出推送预览与发送清单"],demoPrompt:"/wecom 请基于演示样例，生成一条经营周报企业微信卡片推送预览（标题、要点、按钮）。",instructions:`你是 MSS「企业微信推送」Skill（/wecom）。演示环境只生成推送预览，不真实调用 WeCom API。

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

> 演示模式：仅预览，未调用企业微信 API。`})];function F(e){return{...e,execSteps:e.execSteps??W(e.planSteps,"Skill")}}const Us=[F({id:"skill-l10n-localize",agentType:"marketing",planSteps:["识别源语/目标语与物料类型（卖点卡/详情页）","按术语表与禁译表完成初译","回译抽检与规格数字校验","输出双语对照包与质检清单"],demoPrompt:"/本地化翻译 将以下卖点卡译为阿语，保留品牌词与规格数字，并给出术语质检清单（演示样例）。",instructions:`你是 MSS「小语种本地化翻译」Skill（/本地化翻译）。面向营销物料本地化，不是通用闲聊翻译。

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
您好，…（演示）恳请确认到货窗口。谢谢！`})],Bs=[...ws,...Ds,...Fs,...Ks,...Us],Gs=new Map(Bs.map(e=>[e.id,e]));function Hs(e){return e?Gs.get(e)??null:null}const Ws=[{id:"skill-data-analysis",name:"MultiSourceAnalysis",desc:"【办公提效】AI 辅助数据分析 · 多源数据自动分析与可视化（可在做任务 /数据分析 调用）",category:"office",command:"/数据分析",author:"华为 MSS",version:"2.0.0",connector:"ISRP + Sandbox · 对话 Runtime",published:!0,invokes:18400,icon:"fa-chart-line",tags:["数据分析","ISRP","SO","综履","结算","对账"]},{id:"skill-doc-gen",name:"DocDraftGenerator",desc:"【办公提效】AI 辅助文档生成 · 文档初稿自动生成与解读（可在做任务 /文档生成 调用）",category:"office",command:"/文档生成",author:"华为 MSS",version:"1.6.0",connector:"Doc AI · 对话 Runtime",published:!0,invokes:9100,icon:"fa-file-lines",tags:["文档","初稿"]},{id:"skill-doc-compliance",name:"DocComplianceChecker",desc:"【办公提效】AI 辅助文档解读 · 营销物料/合同/招投标合规筛查（可在做任务 /合规筛查 调用）",category:"office",command:"/合规筛查",author:"华为 MSS",version:"1.4.0",connector:"Doc AI · 对话 Runtime",published:!0,invokes:6700,icon:"fa-file-shield",tags:["合规","医疗用语"]},{id:"skill-file-archive",name:"SmartFileArchive",desc:"【办公提效】AI 辅助文件整理 · 多源文件智能归档（可在做任务 /文件整理 调用）",category:"office",command:"/文件整理",author:"华为 MSS",version:"1.2.0",connector:"Onebox/Email · 对话 Runtime",published:!0,invokes:4200,icon:"fa-folder-tree",tags:["归档","总结","知识","指南"]},{id:"skill-ppt-gen",name:"PPTAutoGenerator",desc:"【办公提效】AI 辅助 PPT 生成 · 多源数据 PPT 自动生成（可在做任务 /ppt 调用）",category:"office",command:"/ppt",author:"华为 MSS",version:"1.0.0",connector:"Office Runtime · 对话 Runtime",published:!0,invokes:3100,icon:"fa-file-powerpoint",tags:["PPT","汇报"]},{id:"skill-meeting-minutes",name:"MeetingMinutesGen",desc:"【办公提效】AI 辅助会议纪要生成 · 60% AI + 40% 人工（可在做任务 /会议纪要 调用）",category:"office",command:"/会议纪要",author:"华为 MSS",version:"2.1.0",connector:"WeLink · 对话 Runtime",published:!0,invokes:12100,icon:"fa-clipboard-list",tags:["会议","纪要"]},{id:"skill-work-summary",name:"WorkSummaryGen",desc:"【办公提效】个人工作总结 Markdown/HTML 多形式生成（可在做任务 /工作总结 调用）",category:"office",command:"/工作总结",author:"华为 MSS",version:"1.3.0",connector:"员工助手 · 对话 Runtime",published:!0,invokes:5800,icon:"fa-file-pen",tags:["总结","归档"]},{id:"skill-doc-parser",name:"DocParser",desc:"PDF/Excel/PPT 结构化解析与摘要（可在做任务 /解析文档 调用）",category:"office",command:"/解析文档",author:"华为 MSS",version:"2.0.0",connector:"Doc AI · 对话 Runtime",published:!0,invokes:8900,icon:"fa-file-import",tags:["解析","核验","验收","综履"]},{id:"skill-launch-sentiment",name:"LaunchSentimentReport",desc:"【管理提效】发布会舆情快报 · 产品发布舆情 AI 分析（可在做任务 /舆情快报 调用）",category:"manage",command:"/舆情快报",author:"华为 MSS",version:"1.5.0",connector:"Social Listening · 对话 Runtime",published:!0,invokes:5400,icon:"fa-bullhorn",tags:["舆情","发布会"]},{id:"skill-survey-insight",name:"SurveyInsightAnalyzer",desc:"【管理提效】洞察部用户问卷调研分析与报告生成（可在做任务 /问卷洞察 调用）",category:"manage",command:"/问卷洞察",author:"华为 MSS",version:"1.1.0",connector:"Survey Hub · 对话 Runtime",published:!0,invokes:2100,icon:"fa-square-poll-vertical",tags:["问卷","MKT"]},{id:"skill-review-collect",name:"评分采集",desc:"【管理提效】电渠购买页订单评论采集 · Amazon/Lazada 等站点样本清洗与交接（可在做任务 /评论采集 调用）",category:"manage",command:"/评论采集",author:"华为 MSS",version:"1.0.0",connector:"Amazon/Lazada · 对话 Runtime",published:!0,invokes:4200,icon:"fa-download",tags:["评论","电商","采集","订单评论"],scenarioTags:["评论分析","评论","电商"]},{id:"skill-review-translate",name:"评论语种翻译",desc:"【管理提效】多语种订单评论统一译为英语与中文，保留原文对照（可在做任务 /评论翻译 调用）",category:"manage",command:"/评论翻译",author:"华为 MSS",version:"1.0.0",connector:"Translate Runtime · 对话 Runtime",published:!0,invokes:3800,icon:"fa-language",tags:["评论","翻译","本地化","电商"],scenarioTags:["评论分析","评论","电商","翻译","本地化"]},{id:"skill-review-cluster",name:"订单评论分析",desc:"【管理提效】对采集+翻译后的评论做情感判断、用户数据挖掘、卖点 GAP 与分角色建议（可在做任务 /评论分析 调用）",category:"manage",command:"/评论分析",author:"华为 MSS",version:"3.1.0",connector:"Amazon/Lazada · 对话 Runtime",published:!0,invokes:7600,icon:"fa-comments",tags:["评论","电商","VoC","订单评论","情感"],scenarioTags:["评论分析","评论","电商"]},{id:"skill-retail-insight",name:"RetailInsightPi",desc:"【管理提效】零售信息洞察 π · 门店 DOS/转化/陈列报告（可在做任务 /零售洞察 调用）",category:"manage",command:"/零售洞察",author:"华为 MSS",version:"1.8.0",connector:"iRetail · 对话 Runtime",published:!0,invokes:9800,icon:"fa-store",tags:["零售","洞察π"]},{id:"skill-price-monitor",name:"PriceOfferMonitor",desc:"【管理提效】价格监测 · 18 国多渠道价格 & offer 监测（可在做任务 /价格监测 调用）",category:"manage",command:"/价格监测",author:"华为 MSS",version:"3.0.1",connector:"Market Intel · 对话 Runtime",published:!0,invokes:25600,icon:"fa-tags",tags:["价格","offer","价格监测"]},{id:"skill-so-report",name:"SOReportBuilder",desc:"代表处 SO/SI 排名、环比、IoT 剔除报表（可在做任务 /so报表 调用）",category:"manage",command:"/so报表",author:"华为 MSS",version:"3.0.1",connector:"ISRP · 对话 Runtime",published:!0,invokes:14300,icon:"fa-table",tags:["SO","代表处","返利"]},{id:"skill-jd-parser",name:"JDParser",desc:"【流程提效】招聘 JD 结构化解析与胜任力提取（可在做任务 /jd解析 调用）",category:"process",command:"/jd解析",author:"华为 MSS",version:"1.0.2",connector:"HR Hub · 对话 Runtime",published:!0,invokes:3200,icon:"fa-briefcase",tags:["JD","HR"]},{id:"skill-resume-screen",name:"ResumeScreener",desc:"【流程提效】招聘需求简历分析 · AI 简历筛选与人岗匹配（可在做任务 /简历筛选 调用）",category:"process",command:"/简历筛选",author:"华为 MSS",version:"1.4.0",connector:"HR Hub · 对话 Runtime",published:!0,invokes:4100,icon:"fa-user-check",tags:["简历","HR"]},{id:"skill-interview-analysis",name:"InterviewAnalyzer",desc:"【流程提效】面试记录分析与评估报告生成（可在做任务 /面试分析 调用）",category:"process",command:"/面试分析",author:"华为 MSS",version:"1.2.0",connector:"HR Hub · 对话 Runtime",published:!0,invokes:2800,icon:"fa-user-pen",tags:["面试","HR"]},{id:"skill-training-gen",name:"TrainingContentGen",desc:"【流程提效】AI 辅助培训内容生成 · Nova 新品门店培训（可在做任务 /培训内容 调用）",category:"process",command:"/培训内容",author:"华为 MSS",version:"1.6.0",connector:"LMS · 对话 Runtime",published:!0,invokes:4900,icon:"fa-chalkboard-user",tags:["培训","Nova"]},{id:"skill-rag",name:"MilvusRetriever",desc:"【体验提升】企业知识向量检索 · 按业务部门分区（可在做任务 /检索 调用）",category:"experience",command:"/检索",author:"华为 MSS",version:"2.5.0",connector:"Milvus · 对话 Runtime",published:!0,invokes:19800,icon:"fa-database",tags:["RAG","知识库","知识","归档"]},{id:"skill-rerank",name:"CrossEncoderReranker",desc:"【体验提升】检索结果 Cross-Encoder 重排序（可在做任务 /rerank 调用）",category:"experience",command:"/rerank",author:"华为 MSS",version:"1.0.0",connector:"Model Hub · 对话 Runtime",published:!0,invokes:6200,icon:"fa-sort-amount-down",tags:["RAG"]},{id:"skill-retail-coach",name:"RetailAICoach",desc:"【体验提升】零售 AI 陪练 · 卖点演练与考核反馈（可在做任务 /陪练 调用）",category:"experience",command:"/陪练",author:"华为 MSS",version:"1.1.0",connector:"LMS · 对话 Runtime",published:!0,invokes:3600,icon:"fa-headset",tags:["陪练","门店"]},{id:"skill-complaint-sop",name:"ComplaintSOPMatch",desc:"【体验提升】客诉 SOP 检索与话术推荐（可在做任务 /客诉 调用）",category:"experience",command:"/客诉",author:"华为 MSS",version:"2.2.0",connector:"CSC Ticket · 对话 Runtime",published:!0,invokes:8300,icon:"fa-ticket",tags:["客诉","SOP"],scenarioTags:["客诉","服务","工单"]},{id:"skill-wecom",name:"WeComPush",desc:"企业微信消息/卡片/群机器人推送（可在做任务 /wecom 调用）",category:"experience",command:"/wecom",author:"华为 MSS",version:"2.0.0",connector:"WeCom API · 对话 Runtime",published:!0,invokes:22100,icon:"fa-comment-dots",tags:["WeCom","推送"]},{id:"skill-l10n-localize",name:"LocalizeCopy",desc:"【内容生成】小语种本地化翻译 · 卖点卡/物料初译 + 术语与禁译质检（可在做任务 /本地化翻译 调用）",category:"manage",command:"/本地化翻译",author:"华为 MSS",version:"1.0.0",connector:"Translate Runtime · 对话 Runtime",published:!0,invokes:4600,icon:"fa-language",tags:["翻译","本地化","小语种","术语"],scenarioTags:["翻译","本地化","小语种"]},{id:"skill-sales-copy",name:"SalesCopywriter",desc:"【内容生成】卖点与销售文案 · 按人群/渠道生成卖点卡与落地页文案（可在做任务 /卖点文案 调用）",category:"manage",command:"/卖点文案",author:"华为 MSS",version:"1.0.0",connector:"Doc AI · 对话 Runtime",published:!0,invokes:3900,icon:"fa-pen-nib",tags:["文案","卖点","MKT","转化"]},{id:"skill-frontline-script",name:"FrontlineScript",desc:"【体验提升】一线统一话术 · 客诉/门店口径对齐与禁忌语检查（可在做任务 /一线话术 调用）",category:"experience",command:"/一线话术",author:"华为 MSS",version:"1.0.0",connector:"CSC + LMS · 对话 Runtime",published:!0,invokes:5200,icon:"fa-comments",tags:["话术","客诉","服务","口径"],scenarioTags:["客诉","服务"]},{id:"skill-knowledge-digest",name:"KnowledgeDigest",desc:"【体验提升】组织及个人知识沉淀 · 会议/文档/问答摘要入库（可在做任务 /知识沉淀 调用）",category:"experience",command:"/知识沉淀",author:"华为 MSS",version:"1.0.0",connector:"Milvus + Onebox · 对话 Runtime",published:!0,invokes:4100,icon:"fa-box-archive",tags:["知识","归档","沉淀","RAG"],scenarioTags:["知识","归档","指南"]},{id:"skill-weekly-report",name:"OpsWeeklyReport",desc:"【管理提效】经营分析周报 · SO/渠道/代表处周清成稿（可在做任务 /经营周报 调用）",category:"manage",command:"/经营周报",author:"华为 MSS",version:"1.0.0",connector:"ISRP · 对话 Runtime",published:!0,invokes:6100,icon:"fa-calendar-week",tags:["周报","经营","SO","代表处"],scenarioTags:["数据分析","SO","经营"]},{id:"skill-comp-brief",name:"CompetitorBrief",desc:"【管理提效】竞品简报 · 型号/价格/卖点对照与应对建议（可在做任务 /竞品简报 调用）",category:"manage",command:"/竞品简报",author:"华为 MSS",version:"1.0.0",connector:"Market Intel · 对话 Runtime",published:!0,invokes:3400,icon:"fa-binoculars",tags:["竞品","洞察","GTM"]},{id:"skill-channel-brief",name:"ChannelPlayBrief",desc:"【流程提效】渠道作战简报 · 活动节奏/库存/主推机型对齐（可在做任务 /渠道简报 调用）",category:"process",command:"/渠道简报",author:"华为 MSS",version:"1.0.0",connector:"Channel Hub · 对话 Runtime",published:!0,invokes:2800,icon:"fa-store",tags:["渠道","作战","零售"]},{id:"skill-email-draft",name:"BizEmailDraft",desc:"【办公提效】商务邮件草稿 · 客户/渠道沟通要点与礼貌修订（可在做任务 /邮件草稿 调用）",category:"office",command:"/邮件草稿",author:"华为 MSS",version:"1.0.0",connector:"Email · 对话 Runtime",published:!0,invokes:4500,icon:"fa-envelope",tags:["邮件","沟通","办公"]}];function qs(e){const t=Hs(e.id);return t?{...e,instructions:t.instructions,planSteps:[...t.planSteps]}:e}const Wt=xs(Ws.map(qs).map(Ss)),Ro=[{id:"all",name:"全部文档",icon:"fa-layer-group"},{id:"public",name:"公共",icon:"fa-building-columns",desc:"平台规范 · 通用制度"},{id:"gtm",name:"GTM",icon:"fa-rocket",desc:"上市 · 准入 · 区域策略"},{id:"mkt",name:"MKT",icon:"fa-bullhorn",desc:"品牌 · 活动 · 洞察"},{id:"ecommerce",name:"电商",icon:"fa-cart-shopping",desc:"评论 · offer · 平台规则"},{id:"retail",name:"零售",icon:"fa-store",desc:"门店 · 培训 · 洞察 π"},{id:"service",name:"服务",icon:"fa-headset",desc:"SOP · 客诉 · 质检"},{id:"channel",name:"渠道",icon:"fa-diagram-project",desc:"返利 · 价盘 · 代表处"},{id:"hr",name:"HR",icon:"fa-user-tie",desc:"JD · 招聘 · 人岗标准"},{id:"finance",name:"财经",icon:"fa-coins",desc:"返利对账 · 价保 · 财务口径"},{id:"quality",name:"质量运营",icon:"fa-clipboard-check",desc:"合规检查 · 审计 · 质量规范"},{id:"other",name:"其他",icon:"fa-folder-open",desc:"未分类 · 临时归档"}],Vs=[{id:"kb-platform-guide",title:"MSS Claw 平台使用指南",desc:"AI任务、Agent/Skill 挂载、任务中心与交付物流转说明",collection:"public",type:"PDF",size:"2.1 MB",pages:42,clearance:"L2",indexed:!0,chunks:186,tags:["平台","指南"],updatedAt:"2026-07-08",author:"MSS AI变革"},{id:"kb-agent-playbook",title:"Agent/Skill 配置与发布规范",desc:"Agent 设计规范、Skill 挂载策略、审批与审计要求",collection:"public",type:"PDF",size:"1.8 MB",pages:36,clearance:"L2",indexed:!0,chunks:168,tags:["Agent","Skill"],updatedAt:"2026-07-08",author:"MSS AI变革"},{id:"kb-gtm-launch",title:"GTM 上市节奏 Playbook",desc:"Mate/Pura 上市里程碑、区域准入与首销 KPI 模板",collection:"gtm",type:"PDF",size:"3.2 MB",pages:54,clearance:"L3",indexed:!0,chunks:412,tags:["上市","GTM"],updatedAt:"2026-07-07",author:"GTM 部"},{id:"kb-latam-compliance",title:"拉美/EU 市场准入 Checklist",desc:"ANATEL 认证、RoHS、环保参数与准入清单",collection:"gtm",type:"PDF",size:"3.6 MB",pages:62,clearance:"L3",indexed:!0,chunks:520,tags:["拉美","准入"],updatedAt:"2026-06-15",author:"GTM 合规"},{id:"kb-campaign-q3",title:"2025 Q3 全渠道活动 Playbook",desc:"大促节奏、预算池、活动物料与审批流",collection:"mkt",type:"PDF",size:"2.4 MB",pages:48,clearance:"L3",indexed:!0,chunks:312,tags:["活动","MKT"],updatedAt:"2026-06-28",author:"MKT"},{id:"kb-wearable-okr",title:"2025 可穿戴 OKR 复盘",desc:"KR 进度、续航目标卡点与代表处反馈汇总",collection:"mkt",type:"XLSX",size:"540 KB",pages:6,clearance:"L2",indexed:!0,chunks:72,tags:["穿戴","OKR"],updatedAt:"2026-06-30",author:"MKT 洞察"},{id:"kb-survey-guide",title:"洞察部用户问卷调研方法",desc:"问卷设计、样本配额、开放题编码与洞察报告模板",collection:"mkt",type:"DOCX",size:"680 KB",pages:18,clearance:"L2",indexed:!0,chunks:96,tags:["问卷","洞察"],updatedAt:"2026-07-04",author:"MKT 洞察部"},{id:"kb-review-sop",title:"Amazon/Lazada 评论分析 SOP",desc:"评分采集 → 语种翻译（中英）→ 评论分析三段口径与 MX/EU 平台差异",collection:"ecommerce",type:"PDF",size:"1.2 MB",pages:22,clearance:"L2",indexed:!0,chunks:142,tags:["评论","电商"],updatedAt:"2026-07-06",author:"电商运营"},{id:"kb-offer-monitor",title:"电商 Offer 监测口径说明",desc:"SKU 字段映射、多国采集 VPN 策略与复核 URL 清单",collection:"ecommerce",type:"XLSX",size:"420 KB",pages:8,clearance:"L2",indexed:!0,chunks:88,tags:["offer","价格"],updatedAt:"2026-07-07",author:"电商数据"},{id:"kb-retail-pi",title:"零售洞察 π 报告模板",desc:"门店 DOS、转化、陈列合规与代表处下钻结构",collection:"retail",type:"PDF",size:"1.5 MB",pages:28,clearance:"L2",indexed:!0,chunks:168,tags:["零售","洞察π"],updatedAt:"2026-07-05",author:"零售运营"},{id:"kb-nova-training",title:"Nova 新品培训内容框架",desc:"卖点脚本、对抗演练题库、门店考核指标",collection:"retail",type:"Folder",size:"24 MB",pages:0,clearance:"L2",indexed:!0,chunks:860,tags:["Nova","培训"],updatedAt:"2026-07-03",author:"零售培训"},{id:"kb-sop-complaint",title:"消费者服务 SOP · 电池过热客诉",desc:"分级处理、话术、OTA 引导与升级路径",collection:"service",type:"PDF",size:"1.1 MB",pages:24,clearance:"L2",indexed:!0,chunks:186,tags:["客诉","SOP"],updatedAt:"2026-07-01",author:"消费者服务"},{id:"kb-sop-bundle",title:"服务 SOP 知识包 v4",desc:"客诉分类、质检评分、备件策略综合包",collection:"service",type:"Bundle",size:"18 MB",pages:0,clearance:"L2",indexed:!0,chunks:2140,tags:["SOP","质检"],updatedAt:"2026-06-20",author:"CSC"},{id:"kb-rebate-q3",title:"渠道返利政策 2025 Q3",desc:"代表处返利规则、价保策略、破价稽核要点",collection:"channel",type:"XLSX",size:"860 KB",pages:8,clearance:"L3",indexed:!0,chunks:142,tags:["返利","价保"],updatedAt:"2026-07-06",author:"渠道管理部"},{id:"kb-price-master",title:"价盘政策主数据说明",desc:"FD/KA 价盘层级、价保模拟与破价预警规则",collection:"channel",type:"DOCX",size:"420 KB",pages:16,clearance:"L3",indexed:!0,chunks:88,tags:["价盘"],updatedAt:"2026-07-04",author:"渠道财经"},{id:"kb-jd-template",title:"招聘 JD 模板库",desc:"MSS 各序列 JD 结构、胜任力模型与合规用语",collection:"hr",type:"DOCX",size:"520 KB",pages:12,clearance:"L2",indexed:!0,chunks:76,tags:["JD","招聘"],updatedAt:"2026-07-02",author:"HR"},{id:"kb-resume-rubric",title:"简历筛选评分标准",desc:"人岗匹配维度、面试分析 Agent 输出字段说明",collection:"hr",type:"PDF",size:"380 KB",pages:10,clearance:"L2",indexed:!0,chunks:54,tags:["简历","HR"],updatedAt:"2026-06-28",author:"HR"},{id:"kb-rebate-finance",title:"返利/价保财务对账说明",desc:"代表处对账周期、异常返利稽核与 Finance Hub 口径",collection:"finance",type:"XLSX",size:"640 KB",pages:6,clearance:"L3",indexed:!0,chunks:68,tags:["返利","财经"],updatedAt:"2026-07-05",author:"财经"},{id:"kb-wearable-medical",title:"可穿戴医疗用语合规检查清单",desc:"营销物料、合同、招投标文档医疗宣称与风险筛查要点",collection:"quality",type:"PDF",size:"920 KB",pages:20,clearance:"L3",indexed:!0,chunks:124,tags:["合规","医疗用语"],updatedAt:"2026-07-07",author:"质量运营"},{id:"kb-quality-audit",title:"质量运营审计规范",desc:"文档合规抽检、Agent 调用审计与问题闭环流程",collection:"quality",type:"PDF",size:"760 KB",pages:16,clearance:"L2",indexed:!0,chunks:98,tags:["审计","质量"],updatedAt:"2026-07-01",author:"质量运营"},{id:"kb-assistant-bridge",title:"员工助手多源接入说明",desc:"Onebox/WeLink/Email 与知识库衔接的手工衔接指引",collection:"other",type:"MD",size:"120 KB",pages:8,clearance:"L1",indexed:!0,chunks:32,tags:["员工助手"],updatedAt:"2026-07-08",author:"MSS AI变革"}],Ys=new Map(Wt.map(e=>[e.id,e.name]));function Js(e){return e.includes("cf0a2c")||e.includes("e0122f")||e.includes("rose")?"rose":e.includes("teal")||e.includes("cyan")?"teal":e.includes("emerald")||e.includes("green")?"emerald":e.includes("violet")||e.includes("purple")?"violet":e.includes("indigo")||e.includes("blue")?"indigo":e.includes("amber")||e.includes("orange")?"amber":e.includes("pink")?"pink":e.includes("sky")?"sky":e.includes("slate")?"slate":"rose"}function Xs(e){return e.map(t=>Ys.get(t)??t)}function Qs(e){const t=Xs(e.skillIds);return{id:e.id,name:e.name,description:e.desc,icon:e.icon,color:Js(e.color),persona:e.systemPrompt??`你是 ${e.name}，服务华为 MSS 营销服智枢平台。`,llm:{model:"glm-5.1",temperature:.2,maxTokens:4096},bindings:{promptId:`prompt-${e.id}`,promptName:`${e.name.replace(/\s*Agent\s*/i,"")}_BRIEF`,workflowIds:[],workflowNames:[],skillIds:e.skillIds,skillNames:t,knowledgeIds:e.chatId==="knowledge"?["kb-mss-enterprise"]:[],knowledgeNames:e.chatId==="knowledge"?["mss_enterprise_knowledge"]:[],toolIds:[],toolNames:[]},status:e.published?"online":"draft",version:"v1.0",updatedAt:"2026-07-08",author:e.author,chatId:e.chatId,tags:[e.category,e.bizLine,e.homeTag]}}function Zs(e){const t=st.filter(n=>n.skillIds.includes(e.id)).map(n=>n.name);return{id:e.id,name:e.name,displayName:e.name,description:e.desc,version:e.version.startsWith("v")?`v${e.version}`:`v${e.version}`,lifecycle:e.published?"online":"create",updatedAt:"2026-07-08",author:e.author,toolNames:e.connector?[e.connector]:[],inputSchema:"{ query: string, context?: object }",outputSchema:"{ result: object }",retry:2,timeoutMs:15e3,memoryPolicy:"session_readonly",usedByAgents:t,usedByWorkflows:[],dependsOn:[],tags:[...e.tags,e.category,e.command]}}function ea(e){const t=e.toLowerCase();return t==="pdf"?"pdf":t==="xlsx"?"xlsx":t==="docx"?"docx":t==="md"?"md":"pdf"}function ta(e){const t=e.match(/([\d.]+)\s*(MB|KB|GB)/i);if(!t)return 1;const n=parseFloat(t[1]),s=t[2].toUpperCase();return s==="GB"?n*1024:s==="KB"?n/1024:n}function na(e){return{id:e.id,name:e.title,type:ea(e.type),sizeMb:ta(e.size),status:e.indexed?"indexed":"pending",chunks:e.chunks,clearanceLevel:e.clearance,updatedAt:e.updatedAt,domain:e.collection}}function sa(){const e=Vs.map(na),t=e.reduce((n,s)=>n+s.chunks,0);return{id:"kb-mss-enterprise",name:"mss_enterprise_knowledge",description:"华为 MSS 营销服企业知识库 · 按业务部门分区 · Milvus Online",status:"online",vectorDb:"Milvus",collection:"mss_enterprise_knowledge_v2",embeddingModel:"bge-large-zh-v1.5",chunkStrategy:"semantic_recursive",chunkSize:512,overlap:64,totalDocuments:e.length,totalChunks:t,storageGb:12.4,pipelineStage:"ready",updatedAt:"2026-07-08",tags:["rag","milvus","mss","biz-dept"],documents:e}}function aa(){return st.map(Qs)}function jo(){return Wt.map(Zs)}function Oo(){return[sa()]}const ra="ws-cn-marketing",oa=A(["online","draft","testing","approved","released","deprecated","archived"]),ia=A(["agent","workflow","knowledge","prompt"]),la=H({id:g(),kind:ia,name:g(),status:oa,icon:g(),description:g().optional(),chatId:g().optional(),version:g().optional()}),ca=H({id:g(),name:g(),namespace:g(),description:g(),memberCount:fe()}),da=H({workspace:ca,chats:gn(g(),is),resources:X(la),defaultChatId:g()}),pa=["conversations","agents","workflows","knowledge","prompts"];function ua(){return aa().map(e=>({id:e.id,kind:"agent",name:e.name,status:"online",icon:e.icon,chatId:e.chatId,description:e.description.slice(0,80)}))}ua();const It={workspace:{id:ra,name:"MSS AI提效平台",namespace:"hw.global.mkt",description:"",memberCount:0},chats:{},defaultChatId:"",resources:[]};function Lo(e,t){return e.resources.filter(n=>n.kind===t)}function _o(e){return{online:"Online",draft:"Draft",testing:"Testing",released:"Released",approved:"Approved",deprecated:"Deprecated",archived:"Archived"}[e]}function Co(e){return{online:"text-green-600 bg-green-50 border-green-200",draft:"text-amber-600 bg-amber-50 border-amber-200",testing:"text-blue-600 bg-blue-50 border-blue-200",released:"text-indigo-600 bg-indigo-50 border-indigo-200",approved:"text-emerald-600 bg-emerald-50 border-emerald-200",deprecated:"text-slate-500 bg-slate-100 border-slate-200",archived:"text-slate-400 bg-slate-50 border-slate-200"}[e]}async function ma(){const e=await Z(R("/api/v1/catalog"),{},8e3);if(!e.ok)throw new Error(`HTTP ${e.status}`);return da.parse(await e.json())}const fa=pa.reduce((e,t)=>(e[t]=t==="conversations"||t==="agents",e),{}),me=oe((e,t)=>({catalog:It,catalogReady:!1,catalogLoading:!1,apiConnected:!1,nestLlmEnvConfigured:!1,apiStatus:"unknown",expandedSections:fa,selectedResourceId:null,bootstrap:async()=>{if(t().catalogReady||t().catalogLoading)return;e({catalogLoading:!0});const n=()=>{ue.getState().markFailed(),e({catalog:It,catalogReady:!0,catalogLoading:!1,apiConnected:!1,nestLlmEnvConfigured:!1,apiStatus:"unreachable"})};try{if(!j()||Nn()){n();return}e({catalog:await ma(),catalogReady:!0,catalogLoading:!1,apiConnected:!0,apiStatus:"connected"})}catch{n()}},toggleSection:n=>e(s=>({expandedSections:{...s.expandedSections,[n]:!s.expandedSections[n]}})),selectResource:n=>e({selectedResourceId:n}),resourceToModule:n=>({agent:"agent",workflow:"workflow",knowledge:"knowledge",prompt:"prompt"})[n]}));function Ee(){return{"Content-Type":"application/json",Accept:"application/json",...ke()}}function se(){return j()&&me.getState().apiConnected}const qt=new Map;function At(e){return qt.get(e)??null}function Vt(e,t){qt.set(e,t)}async function Mt(e,t){if(!se())return t!=null&&t.fresh?null:At(e);if(!(t!=null&&t.fresh)){const r=At(e);if(r!=null)return r}const n=await fetch(R(`/api/v1/docs/${e}`),{headers:{Accept:"application/json",...ke(),...t!=null&&t.fresh?{"Cache-Control":"no-cache"}:{}},cache:t!=null&&t.fresh?"no-store":"default"});if(!n.ok)throw new Error(`docs_get_${e}_${n.status}`);const a=(await n.json()).payload??null;return a!=null&&Vt(e,a),a}async function Yt(e,t){if(!se())throw new Error("shared_api_required");const n=await fetch(R(`/api/v1/docs/${e}`),{method:"PUT",headers:Ee(),body:JSON.stringify({payload:t})});if(!n.ok)throw new Error(`docs_put_${e}_${n.status}`);let s=t;if((n.headers.get("content-type")??"").includes("application/json"))try{const a=await n.json();a&&Object.prototype.hasOwnProperty.call(a,"payload")&&(s=a.payload)}catch{}Vt(e,s)}async function ga(e){if(!j())return{ok:!1,error:"共享服务未启用"};const t=await Z(R("/api/v1/auth/login"),{method:"POST",headers:Ee(),body:JSON.stringify(e)},8e3),s=(t.headers.get("content-type")||"").includes("application/json");if(!t.ok){if(t.status>=500||t.status===404||t.status===405||t.status===408||!s)throw new Error(`login_unreachable_${t.status}`);try{return{ok:!1,error:(await t.json()).error||`登录失败（HTTP ${t.status}）`}}catch{throw new Error(`login_unreachable_${t.status}`)}}if(!s)throw new Error("login_unreachable_not_json");return await t.json()}async function ha(){if(!j())return{ok:!1,error:"共享服务未启用"};const e=await Z(R("/api/v1/auth/me"),{headers:{Accept:"application/json",...ke()}},8e3);return e.ok?await e.json():{ok:!1,error:`会话校验失败（HTTP ${e.status}）`}}let Ke=null;function Tt(){return j()?(Ke??(Ke=(async()=>{try{const e=await Z(R("/api/v1/auth/refresh"),{method:"POST",headers:{Accept:"application/json"},credentials:"include"},8e3);if(!e.ok)return null;const t=await e.json();return t.ok?t:null}catch{return null}finally{Ke=null}})()),Ke):Promise.resolve(null)}async function xa(){if(j())try{await Z(R("/api/v1/auth/logout"),{method:"POST",headers:Ee(),body:"{}"})}catch{}}const Ue=new Map;function $o(e,t,n=500){const s=e;return new Promise((a,r)=>{const i=Ue.get(s);i&&clearTimeout(i.timer);const l=[...(i==null?void 0:i.waiters)??[],{resolve:a,reject:r}],c=setTimeout(()=>{Ue.delete(s),Yt(e,t).then(()=>l.forEach(p=>p.resolve()),p=>l.forEach(f=>f.reject(p)))},n);Ue.set(s,{timer:c,waiters:l})})}async function Eo(e,t,n){const s=await Z(R(e),{method:t,headers:Ee(),body:n===void 0?void 0:JSON.stringify(n)});if(!s.ok)throw new Error(`doc_item_write_${s.status}`);const a=await s.text();return a.trim()?JSON.parse(a):null}const Q=[{id:"glm-5.1",label:"GLM 5.1",baseUrl:"https://open.bigmodel.cn/api/paas/v4",providerName:"智谱"},{id:"deepseek-v4-flash",label:"DeepSeek V4 Flash",baseUrl:"https://api.deepseek.com",providerName:"DeepSeek"},{id:"deepseek-v4-pro",label:"DeepSeek V4 Pro",baseUrl:"https://api.deepseek.com",providerName:"DeepSeek"},{id:"qwen3.7-plus",label:"Qwen 3.7 Plus",baseUrl:"https://dashscope.aliyuncs.com/compatible-mode/v1",providerName:"通义"}];function ye(){return Q.map(e=>({...e,apiKey:"",enabled:!0,source:"preset"}))}const J={model:Q[0].id,baseUrl:Q[0].baseUrl,apiKey:"",platformModels:ye(),defaultModelId:Q[0].id,customModels:[]},ba={"GLM-5.1":"glm-5.1","glm-5":"glm-5.1","DeepSeek-V4":"deepseek-v4-flash","DeepSeek V4":"deepseek-v4-flash","Qwen-3.7":"qwen3.7-plus","Qwen 3.7":"qwen3.7-plus"};function I(e){const t=typeof e=="string"?e.trim():"";return ba[t]??t}function ka(e){return Array.isArray(e)?e.filter(t=>!!t&&typeof t=="object").map(t=>{const n=I(String(t.id||""));if(!n)return null;const s=Q.find(a=>a.id===n);return{id:n,label:String(t.label||(s==null?void 0:s.label)||n),baseUrl:String(t.baseUrl||(s==null?void 0:s.baseUrl)||"").trim(),providerName:String(t.providerName||(s==null?void 0:s.providerName)||"平台"),apiKey:typeof t.apiKey=="string"?t.apiKey:"",enabled:t.enabled!==!1,source:t.source==="platform"||!s?"platform":"preset"}}).filter(t=>!!t):ye()}function Jt(e){return(Array.isArray(e.platformModels)?e.platformModels:ye()).filter(n=>n.enabled)}function ae(e){var t,n;return!!((t=e.baseUrl)!=null&&t.trim())&&!!((n=e.apiKey)!=null&&n.trim())}function at(e){return Jt(e).filter(ae)}function Xt(e){const t=I(e.model),s=(Array.isArray(e.platformModels)?e.platformModels:ye()).find(i=>i.id===t);if(s)return{id:s.id,label:s.label,baseUrl:s.baseUrl,apiKey:s.apiKey||"",providerName:s.providerName,custom:!1,platform:!0};const a=Q.find(i=>i.id===t);if(a)return{...a,apiKey:"",custom:!1,platform:!0};const r=e.customModels.find(i=>i.id===t||i.id===e.model);return r?{id:r.id,label:r.label||r.id,baseUrl:r.baseUrl,apiKey:r.apiKey||"",providerName:"自定义",custom:!0,platform:!1}:{id:t,label:t,baseUrl:"",apiKey:"",providerName:"自定义",custom:!0,platform:!1}}function ze(e){var i,l;const t=I(e.model);if(Array.isArray(e.platformModels)){const c=[...Array.isArray(e.platformModels)?e.platformModels:[],...Array.isArray(e.customModels)?e.customModels:[]].find(p=>I(p.id)===t);return!c||"enabled"in c&&c.enabled===!1?{model:t,baseUrl:"",apiKey:""}:{model:I(c.id),baseUrl:((i=c.baseUrl)==null?void 0:i.trim())||"",apiKey:((l=c.apiKey)==null?void 0:l.trim())||""}}const s=Xt(e),a=(s.apiKey||e.apiKey||"").trim(),r=(s.baseUrl||e.baseUrl||"").trim();return{model:s.id,baseUrl:r,apiKey:a}}function Qe(e){const t=ze(e);return!!(t.apiKey&&t.baseUrl&&t.model)}function ya(e){return typeof e.apiKey=="string"&&e.apiKey.trim()?!0:[...e.platformModels??[],...e.customModels??[]].some(t=>typeof t.apiKey=="string"&&t.apiKey.trim().length>0)}Q[0].baseUrl;function Pt(){return{...J,platformModels:ye(),customModels:[],apiKey:""}}let te=0;function Sa(e,t,n="",s=""){return Array.isArray(e)?e.filter(a=>!!a&&typeof a=="object").map(a=>{const r=I(String(a.id||""));return r?{id:r,label:String(a.label||r),baseUrl:String(a.baseUrl||"").trim()||(r===n?s:""),apiKey:typeof a.apiKey=="string"&&a.apiKey?a.apiKey:r===n?t:""}:null}).filter(a=>!!a):[]}function Pe(e,t){var n,s;return((n=at({platformModels:e})[0])==null?void 0:n.id)||((s=t.find(ae))==null?void 0:s.id)||""}function Ne(e){var d,u;const t=typeof(e==null?void 0:e.apiKey)=="string"?e.apiKey:"",n=Array.isArray(e==null?void 0:e.platformModels),s=I(typeof(e==null?void 0:e.model)=="string"&&e.model.trim()?e.model:typeof(e==null?void 0:e.defaultModelId)=="string"&&e.defaultModelId.trim()?e.defaultModelId:J.model),a=typeof(e==null?void 0:e.baseUrl)=="string"?e.baseUrl.trim():"";let r=ka(e==null?void 0:e.platformModels);t&&!n&&(r=r.map(m=>m.id===s?{...m,baseUrl:a||m.baseUrl,apiKey:m.apiKey||t}:m));let i=Sa(e==null?void 0:e.customModels,n?"":t,n?"":s,n?"":a);!n&&!r.some(m=>m.id===s)&&!i.some(m=>m.id===s)&&(i=[...i,{id:s,label:s,baseUrl:a,apiKey:t}]);const l=I((e==null?void 0:e.defaultModelId)||Pe(r,i)||((d=r.find(m=>m.enabled))==null?void 0:d.id)||((u=i[0])==null?void 0:u.id)||J.defaultModelId);let c=I((e==null?void 0:e.model)||l);const p=new Set([...at({platformModels:r}).map(m=>m.id),...i.filter(ae).map(m=>m.id)]);p.size&&!p.has(c)&&(c=p.has(l)?l:[...p][0]||J.model);const f=ze({model:c,baseUrl:"",apiKey:"",platformModels:r,customModels:i});return{model:c,baseUrl:f.baseUrl||((e==null?void 0:e.baseUrl)||"").trim()||J.baseUrl,apiKey:f.apiKey,platformModels:r,defaultModelId:l,customModels:i}}async function wa(e){if(!se())throw new Error("shared_api_required");await Yt("llm-config",e)}function K(e,t,n,s){const a=ze({model:e,baseUrl:"",apiKey:"",platformModels:t,customModels:n});return{model:a.model,baseUrl:a.baseUrl,apiKey:a.apiKey}}const Qt=oe((e,t)=>({config:Pt(),settingsOpen:!1,settingsFocusAdd:!1,syncing:!1,lastError:null,hydrate:async n=>{const s=++te;if(!se()){e({config:Pt(),lastError:"共享 API 未连接，模型配置无法从数据库加载"});return}e({syncing:!0,lastError:null});try{const a=await Mt("llm-config",{fresh:(n==null?void 0:n.fresh)!==!1});if(s!==te)return;e({config:Ne(a),syncing:!1,lastError:null})}catch(a){if(s!==te)return;e({syncing:!1,lastError:a instanceof Error?a.message:"加载模型配置失败"})}},saveConfig:async n=>{const s=++te;if(!se())throw e({lastError:"共享 API 未连接，无法写入数据库。请先连接后端再配置模型。"}),new Error("shared_api_required");const a=Ne({...t().config,...n});e({syncing:!0,lastError:null});try{await wa(a);const r=await Mt("llm-config",{fresh:!0});if(s!==te)return;e({config:Ne(r??a),syncing:!1,lastError:null})}catch(r){if(s!==te)return;const i=r instanceof Error?r.message:"保存模型配置失败";throw e({syncing:!1,lastError:i}),r}},selectModel:async n=>{if(n==="__configure__"||n==="__credentials__"||n==="__extend__"){t().openSettings({focusAdd:n==="__extend__"});return}const{config:s}=t(),a=I(n);await t().saveConfig(K(a,s.platformModels,s.customModels,s.defaultModelId))},addCustomModel:async n=>{var i;const s=I(n.id.trim());if(!s)return;const{config:a}=t(),r=[...a.customModels.filter(l=>l.id!==s),{id:s,label:n.label.trim()||s,baseUrl:n.baseUrl.trim(),apiKey:((i=n.apiKey)==null?void 0:i.trim())||""}];await t().saveConfig({customModels:r,...K(s,a.platformModels,r,a.defaultModelId)})},removeCustomModel:async n=>{var i,l;const{config:s}=t(),a=s.customModels.filter(c=>c.id!==n),r=s.model===n?s.defaultModelId||((i=a[0])==null?void 0:i.id)||((l=s.platformModels.find(c=>c.enabled))==null?void 0:l.id)||J.model:s.model;await t().saveConfig({customModels:a,...K(r,s.platformModels,a,s.defaultModelId)})},upsertPlatformModel:async n=>{var p;const s=I(n.id.trim());if(!s)return;const{config:a}=t(),r=a.platformModels.find(f=>f.id===s),i={id:s,label:n.label.trim()||s,baseUrl:n.baseUrl.trim(),providerName:n.providerName.trim()||"平台",apiKey:((p=n.apiKey)==null?void 0:p.trim())??(r==null?void 0:r.apiKey)??"",enabled:n.enabled!==!1,source:"platform"};((r==null?void 0:r.source)==="preset"||n.source==="preset")&&(i.source="preset"),r||(i.source=n.source==="preset"?"preset":"platform");const l=[...a.platformModels.filter(f=>f.id!==s),i],c=a.model===s?K(s,l,a.customModels,a.defaultModelId):{};await t().saveConfig({platformModels:l,...c})},setPlatformModelApiKey:async(n,s)=>{const{config:a}=t(),r=a.platformModels.map(l=>l.id===n?{...l,apiKey:s}:l),i={platformModels:r};a.defaultModelId===n&&!s.trim()&&(i.defaultModelId=Pe(r,a.customModels)),a.model===n&&Object.assign(i,K(n,r,a.customModels,i.defaultModelId??a.defaultModelId)),await t().saveConfig(i)},removePlatformModel:async n=>{const{config:s}=t(),a=s.platformModels.filter(l=>l.id!==n),r={platformModels:a};s.defaultModelId===n&&(r.defaultModelId=Pe(a,s.customModels));const i=s.model===n?r.defaultModelId||s.defaultModelId:s.model;Object.assign(r,K(i,a,s.customModels,r.defaultModelId||s.defaultModelId)),await t().saveConfig(r)},setPlatformModelEnabled:async(n,s)=>{var l,c;const{config:a}=t(),r=a.platformModels.map(p=>p.id===n?{...p,enabled:s}:p),i={platformModels:r};if(!s&&a.model===n){const p=((l=r.find(f=>f.enabled))==null?void 0:l.id)||((c=a.customModels[0])==null?void 0:c.id)||J.model;Object.assign(i,K(p,r,a.customModels,a.defaultModelId))}!s&&a.defaultModelId===n&&(i.defaultModelId=Pe(r,a.customModels)),await t().saveConfig(i)},setDefaultModelId:async n=>{const{config:s}=t(),a=I(n);if(!(Jt(s).some(i=>i.id===a&&ae(i))||s.customModels.some(i=>i.id===a&&ae(i))))throw e({lastError:"默认模型必须先配置 Base URL 和 API Key"}),new Error("model_credentials_required");await t().saveConfig({defaultModelId:a,...K(a,s.platformModels,s.customModels)})},openSettings:n=>e({settingsOpen:!0,settingsFocusAdd:!!(n!=null&&n.focusAdd)}),closeSettings:()=>e({settingsOpen:!1,settingsFocusAdd:!1}),requiresSharedApi:()=>se(),modelOptions:()=>{const{config:n}=t(),s=at(n).map(l=>({id:l.id,label:l.label,providerName:l.providerName,group:"platform"})),a=n.customModels.filter(ae).map(l=>({id:l.id,label:l.label||l.id,providerName:"自定义",group:"custom"})),r=new Set([...s,...a].map(l=>l.id)),i=n.model&&!r.has(n.model)&&Qe(n)?[{id:n.model,label:n.model,group:"custom",providerName:"自定义"}]:[];return[...s,...a,...i]},statusLabel:()=>{const{config:n}=t(),s=Xt(n),{apiConnected:a,nestLlmEnvConfigured:r}=me.getState();return a?Qe(n)?{text:r?`${s.label} · 模型 Key 已配 · 亦可走服务端 LLM_*`:`${s.label} · 模型 Key 已配`,configured:!0}:r&&!ya(n)?{text:`${s.label} · 服务端 LLM_* 可用`,configured:!0}:{text:`${s.label} · 当前模型未配置 API Key`,configured:!1}:{text:`${s.label} · 共享 API 未连接（无法读写库）`,configured:!1}}})),zo=Object.freeze(Object.defineProperty({__proto__:null,normalizeLlmConfig:Ne,useLlmConfigStore:Qt},Symbol.toStringTag,{value:"Module"})),Be=2e4;function rt(){return Qt.getState().config}function De(){return ze(rt())}function _(e){return Qe(e??rt())}function Zt(e){return e.trim().replace(/\/$/,"")}function va(e){if(typeof e!="string")return;const t=e.trim();return/^[a-z0-9][a-z0-9_.:-]{0,63}$/i.test(t)?t:void 0}function Nt(e){if(!e||typeof e!="object"||Array.isArray(e))return;const t=e,n=i=>{const l=typeof i=="number"?i:Number(i);return Number.isSafeInteger(l)&&l>=0&&l<=1e9?l:void 0},s=i=>typeof i!="string"?void 0:i.replace(/[\u0000-\u001f\u007f]+/g," ").replace(/Bearer\s+[^\s,;)}\]]+/gi,"Bearer [redacted]").replace(/Basic\s+[A-Za-z0-9+/=]+/gi,"Basic [redacted]").replace(/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/gi,"$1[redacted]@").replace(/([?&](?:api[-_]?key|access[-_]?token|token|secret|password|key)=)[^&\s]+/gi,"$1[redacted]").replace(/((?:api[-_]?key|access[-_]?token|token|secret|password|key)\s*[:=]\s*["']?)[^"',\s}]+/gi,"$1[redacted]").replace(/\b(?:sk|rk|sess|access|refresh)-[A-Za-z0-9][A-Za-z0-9._~-]{7,}\b/gi,"[redacted]").replace(/\s+/g," ").trim().slice(0,240)||void 0,a=t.phase,r={...a==="config"||a==="request"||a==="response"||a==="stream"?{phase:a}:{},...n(t.elapsedMs)!==void 0?{elapsedMs:n(t.elapsedMs)}:{},...n(t.timeoutMs)!==void 0?{timeoutMs:n(t.timeoutMs)}:{},...n(t.httpStatus)!==void 0?{httpStatus:n(t.httpStatus)}:{},...s(t.contentType)?{contentType:s(t.contentType)}:{},...s(t.upstreamSummary)?{upstreamSummary:s(t.upstreamSummary)}:{},...s(t.networkCode)?{networkCode:s(t.networkCode)}:{},...s(t.networkSummary)?{networkSummary:s(t.networkSummary)}:{},...n(t.sseFrames)!==void 0?{sseFrames:n(t.sseFrames)}:{},...n(t.tokenDeltas)!==void 0?{tokenDeltas:n(t.tokenDeltas)}:{},...n(t.reasoningDeltas)!==void 0?{reasoningDeltas:n(t.reasoningDeltas)}:{},...n(t.contentChars)!==void 0?{contentChars:n(t.contentChars)}:{},...n(t.reasoningChars)!==void 0?{reasoningChars:n(t.reasoningChars)}:{},...t.usageInputTokens===null||n(t.usageInputTokens)!==void 0?{usageInputTokens:t.usageInputTokens===null?null:n(t.usageInputTokens)}:{},...t.usageOutputTokens===null||n(t.usageOutputTokens)!==void 0?{usageOutputTokens:t.usageOutputTokens===null?null:n(t.usageOutputTokens)}:{},...typeof t.sawDoneMarker=="boolean"?{sawDoneMarker:t.sawDoneMarker}:{},...typeof t.aborted=="boolean"?{aborted:t.aborted}:{}};return Object.keys(r).length?r:void 0}async function en(e,t){var r,i,l,c;const n=De(),s=await fetch(`${Zt(n.baseUrl)}/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n.apiKey.trim()}`},body:JSON.stringify({model:I(n.model),messages:e,max_tokens:(t==null?void 0:t.maxTokens)??512,temperature:(t==null?void 0:t.temperature)??.3,stream:!1}),signal:t==null?void 0:t.signal});if(!s.ok){const p=await s.text();throw new Error(`LLM HTTP ${s.status}: ${p.slice(0,160)}`)}return((c=(l=(i=(r=(await s.json()).choices)==null?void 0:r[0])==null?void 0:i.message)==null?void 0:l.content)==null?void 0:c.trim())??""}async function*tn(e,t){var l,c,p;const n=De(),s=await fetch(`${Zt(n.baseUrl)}/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n.apiKey.trim()}`},body:JSON.stringify({model:I(n.model),messages:e,max_tokens:(t==null?void 0:t.maxTokens)??1200,temperature:(t==null?void 0:t.temperature)??.5,stream:!0}),signal:t==null?void 0:t.signal});if(!s.ok||!s.body){const f=await s.text().catch(()=>"");throw new Error(`LLM stream HTTP ${s.status}: ${f.slice(0,160)}`)}const a=s.body.getReader(),r=new TextDecoder;let i="";for(;;){const{done:f,value:d}=await a.read();if(f)break;i+=r.decode(d,{stream:!0});const u=i.split(`
`);i=u.pop()??"";for(const m of u){const y=m.trim();if(!y.startsWith("data:"))continue;const x=y.slice(5).trim();if(!(!x||x==="[DONE]"))try{const b=(p=(c=(l=JSON.parse(x).choices)==null?void 0:l[0])==null?void 0:c.delta)==null?void 0:p.content;b&&(yield b)}catch{}}}}function Ia(e,t){const n=e.trim();if(!n)return t;const s=n.match(/\[[\s\S]*\]/);if(s)try{const r=JSON.parse(s[0]);if(Array.isArray(r)){const i=r.map(l=>typeof l=="string"?l.trim():"").filter(Boolean).slice(0,8);if(i.length>=2)return i}}catch{}const a=n.split(`
`).map(r=>r.replace(/^[\d.\-*)\]]+\s*/,"").trim()).filter(Boolean).slice(0,8);return a.length>=2?a:t}async function Aa(e){var r;const t=e.skillNames.length?e.skillNames.join("、"):"无",s=[{role:"system",content:"你是 MSS Claw 企业 AI 任务编排助手。根据用户任务输出 4-6 个简洁、可执行的中文步骤。只返回 JSON 字符串数组，不要 markdown 代码块，不要额外解释。"+((r=e.systemPrompt)!=null&&r.trim()?`
Agent 角色设定：${e.systemPrompt.trim()}`:"")},{role:"user",content:`任务类型：${e.actionType==="knowledge"?"知识检索/RAG":"营销数据分析"}
负责 Agent：${e.agentName}
已挂载 Skill：${t}
用户任务：${e.userTask}
参考模板（可优化但保持业务语义）：${JSON.stringify(e.fallbackSteps)}`}],a=await en(s,{maxTokens:400,temperature:.2,signal:e.signal});return Ia(a,e.fallbackSteps)}function Ma(e){var a,r;const t=((a=e.systemPrompt)==null?void 0:a.trim())||`你是 ${e.agentName}，华为营销服 MSS Claw 平台的专业 AI Agent。`,n=e.actionType==="knowledge"&&((r=e.kbContext)!=null&&r.trim())?`

【知识库检索上下文】
${e.kbContext}

请在回答中用 [1][2] 形式标注引用编号，并确保结论可溯源。`:"";return[{role:"system",content:`${t}

请基于已确认的执行计划完成用户任务，输出结构清晰的中文 markdown 回复。
计划步骤：
${e.planSteps.map((i,l)=>`${l+1}. ${i}`).join(`
`)}
若为知识类任务，请标注引用来源；若为分析类任务，给出结论与建议。`+n},{role:"user",content:e.userTask}]}function Ta(e){return e.map((t,n)=>({skill:`PlanStep_${n+1}`,time:`${120+n*90}ms`,label:t,detail:t}))}function Pa(e){return new Promise(t=>setTimeout(t,e))}async function*Na(e){const{signal:t,planSteps:n,actionType:s,agentName:a,message:r,systemPrompt:i,kbContext:l}=e;if(t!=null&&t.aborted)return;const c=performance.now();yield{type:"execution_start",executionId:`llm_${Date.now()}`};for(let d=0;d<n.length;d++){if(t!=null&&t.aborted)return;const u=n[d],m=`PlanStep_${d+1}`;if(yield{type:"skill_start",skill:m,label:u},await Pa(120+Math.floor(Math.random()*80)),t!=null&&t.aborted)return;yield{type:"skill_end",skill:m,latency:`${120+d*90}ms`}}const p=Ma({userTask:r,actionType:s,agentName:a,systemPrompt:i,planSteps:n,kbContext:l});try{for await(const d of tn(p,{signal:t,maxTokens:4096})){if(t!=null&&t.aborted)return;yield{type:"token",content:d}}}catch(d){yield{type:"error",message:d instanceof Error?d.message:"LLM 流式响应失败"};return}const f=((performance.now()-c)/1e3).toFixed(2);yield{type:"artifact",agentType:s},yield{type:"done",totalTime:`${f}s`,steps:Ta(n),agentName:a}}async function Ra(e,t){var r;if(!_())return"";const n=e.trim().slice(0,400);if(!n)return"";const s=t!=null&&t.agentName?`绑定专家：${t.agentName}
`:"";return((r=(await en([{role:"system",content:"你是任务标题助手。根据用户任务描述生成简洁中文标题：不超过16个字，不要引号，不要句号，不要「标题：」前缀，只输出标题本身。"},{role:"user",content:`${s}任务描述：
${n}`}],{maxTokens:32,temperature:.2,signal:t==null?void 0:t.signal})).replace(/^["'「『]|["'」』]$/g,"").replace(/^(标题|任务名)\s*[:：]\s*/u,"").split(/[\r\n]/)[0])==null?void 0:r.trim())??""}async function nn(e){var t,n,s;if(!j())return{ok:!1,errorCode:"api_disabled",message:"共享 API 未启用，无法测试服务端模型"};try{const a={};(t=e==null?void 0:e.model)!=null&&t.trim()&&(a.model=I(e.model));const r=((n=e==null?void 0:e.baseUrl)==null?void 0:n.trim())||"",i=((s=e==null?void 0:e.apiKey)==null?void 0:s.trim())||"";r&&i&&(a.baseUrl=r,a.apiKey=i);const l=await Z(R("/api/v1/llm-config/test"),{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json",...ke()},body:JSON.stringify(a)},Be),c=await l.json().catch(()=>({}));if(!l.ok||c.ok!==!0){const f=typeof c.message=="string"?c.message.trim():"",d=va(c.errorCode)||(l.status?`http_${l.status}`:void 0),u=Nt(c.diagnostics);return{ok:!1,...d?{errorCode:d}:{},...u?{diagnostics:u}:{},message:f?`服务端测试失败：${f.slice(0,160)}`:`服务端测试失败（HTTP ${l.status||"未知"}）`}}const p=Nt(c.diagnostics);return{ok:!0,message:`连接成功 · ${(typeof c.model=="string"?c.model.trim().slice(0,200):"")||"当前模型"} · 服务端流式可用`,...p?{diagnostics:p}:{}}}catch(a){const r=a instanceof Error?a.message:String(a),i=typeof DOMException<"u"&&a instanceof DOMException&&a.name==="AbortError";return{ok:!1,errorCode:i?"client_request_timeout":"client_request_failed",message:i?`服务端测试请求超时（${Be}ms）`:`服务端测试失败：${r.slice(0,160)}`,...i?{diagnostics:{phase:"request",timeoutMs:Be,aborted:!0}}:{}}}}function ja(e){return nn(e)}const Do=Object.freeze(Object.defineProperty({__proto__:null,generatePlanStepsWithLlm:Aa,getActiveLlmConfig:rt,getActiveLlmRuntime:De,isLlmConfigured:_,llmExecutionStream:Na,refineTaskTitleWithLlm:Ra,streamChatCompletion:tn,testLlmConnection:ja,testWorkspaceLlmConnection:nn},Symbol.toStringTag,{value:"Module"}));function v(...e){return hn(xn(e))}function Oa(e){const t=e.match(/@([\u4e00-\u9fa5\w\s]+?)(?=\s|$|[，。！？])/g);return(t==null?void 0:t.map(n=>n.slice(1).trim()))??[]}function Fo(e,t){const n=new Set(["knowledge","rd_rag"]);if(!new Set(["campaign_ops"]).has(e))return n.has(e)?"knowledge":"marketing";const a=Oa(t);return a.some(r=>r.includes("知识"))?"knowledge":a.some(r=>r.includes("营销")||r.includes("洞察"))?"marketing":t.includes("知识")||t.includes("SOP")||t.includes("合规")?"knowledge":"marketing"}function Ae(e,t,n="application/json"){const s=new Blob([t],{type:n}),a=URL.createObjectURL(s),r=document.createElement("a");r.href=a,r.download=e,r.click(),URL.revokeObjectURL(a)}function ot(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function U(e){let t=ot(e);return t=t.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>"),t=t.replace(/__(.+?)__/g,"<strong>$1</strong>"),t=t.replace(/`([^`]+)`/g,"<code>$1</code>"),t=t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,(n,s,a)=>{const r=Rt(a,!0);return r?`<img src="${r}" alt="${s}" loading="lazy"/>`:s}),t=t.replace(/\[([^\]]+)\]\(([^)]+)\)/g,(n,s,a)=>{const r=Rt(a);return r?`<a href="${r}" target="_blank" rel="noopener noreferrer">${s}</a>`:s}),t=t.replace(/(^|[\s（(「])\*([^*\n]+)\*(?=[\s）)」.,，。!！?？]|$)/g,"$1<em>$2</em>"),t}function Rt(e,t=!1){const n=e.replace(/&amp;/g,"&").replace(/&quot;/g,'"').trim();try{const s=new URL(n);return s.protocol!=="https:"&&s.protocol!=="http:"?"":ot(s.href)}catch{return""}}function xe(e){let t=e.trim();return t.startsWith("|")&&(t=t.slice(1)),t.endsWith("|")&&(t=t.slice(0,-1)),t.split("|").map(n=>n.trim())}function B(e){const t=e.trim();return t.includes("-")?/^\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$/.test(t)||/^\|?(\s*:?-{3,}:?\s*\|)+\s*$/.test(t):!1}function Re(e){const t=e.trim();if(!t.includes("|"))return!1;if(B(t))return!0;const n=xe(t);return n.length>=2&&n.some(s=>s.length>0)}function La(e){const t=e.trim();if(!t.includes("|")||!/\|[\t ]*:?-{3,}/.test(t))return null;const s=/\|?(?:\s*:?-{3,}:?\s*\|)+(?:\s*:?-{3,}:?\s*)?\|?/.exec(t);if(!s||s.index==null)return null;const a=t.slice(0,s.index).trim(),r=s[0].trim().startsWith("|")?s[0].trim():`|${s[0].trim()}`;let i=t.slice(s.index+s[0].length).trim();if(!a.includes("|"))return null;const c=xe(a).length;if(c<2)return null;const p=[a.startsWith("|")?a:`| ${a} |`,r.endsWith("|")?r:`${r}|`];if(!i)return p;const f=i.split(/\|\s*\|/).map(u=>u.trim()).filter(Boolean).map(u=>{const m=u.startsWith("|")?u:`| ${u}`;return m.endsWith("|")?m:`${m} |`});if(f.length>=1)return p.push(...f),p;const d=xe(i.startsWith("|")?i:`| ${i}`);for(let u=0;u+c<=d.length;u+=c){const m=d.slice(u,u+c);m.every(y=>!y)||p.push(`| ${m.join(" | ")} |`)}return p.length>=3?p:null}function jt(e){const t=e.map(l=>l.trim()).filter(Boolean);if(t.length<2)return"";let n=t[0],s=t.slice(1);s[0]&&B(s[0])&&(s=s.slice(1));const a=xe(n);if(a.length<2)return"";const r=`<thead><tr>${a.map(l=>`<th>${U(l)}</th>`).join("")}</tr></thead>`,i=`<tbody>${s.filter(l=>!B(l)).map(l=>{const c=xe(l);for(;c.length<a.length;)c.push("");return`<tr>${c.slice(0,a.length).map(p=>`<td>${U(p)}</td>`).join("")}</tr>`}).join("")}</tbody>`;return`<div class="md-table-wrap"><table class="md-table">${r}${i}</table></div>`}function _a(e){const n=e.replace(/\r\n/g,`
`).split(`
`).flatMap(f=>La(f)??[f]),s=[];let a=0,r=!1,i=!1,l=[];const c=()=>{r&&(s.push("</ul>"),r=!1),i&&(s.push("</ol>"),i=!1)},p=()=>{if(!l.length)return;const f=l.join(" ").trim();f&&s.push(`<p>${U(f)}</p>`),l=[]};for(;a<n.length;){const u=(n[a]??"").trimEnd().trim();if(!u){p(),c(),a+=1;continue}const m=/^```\s*([\w-]*)\s*$/.exec(u);if(m){p(),c();const b=m[1]?` class="language-${m[1]}"`:"",C=[];for(a+=1;a<n.length&&!/^```\s*$/.test((n[a]??"").trim());)C.push(n[a]??""),a+=1;a<n.length&&(a+=1),s.push(`<pre class="md-code-block"><code${b}>${ot(C.join(`
`))}</code></pre>`);continue}if(Re(u)){const b=(n[a+1]??"").trim();if(B(u)||B(b)||Re(b)&&u.includes("|")&&b.includes("|")||B(b)){p(),c();const O=[];for(;a<n.length&&Re((n[a]??"").trim());)O.push((n[a]??"").trim()),a+=1;O.length>=2&&!B(O[0])?s.push(jt(O)):O.length>=3&&s.push(jt(O.slice(1)));continue}}if(/^---+$/.test(u)||/^\*\*\*+$/.test(u)){p(),c(),s.push("<hr/>"),a+=1;continue}const y=/^(#{1,4})\s+(.+)$/.exec(u);if(y){p(),c();const b=y[1].length;s.push(`<h${b}>${U(y[2])}</h${b}>`),a+=1;continue}if(/^>\s?/.test(u)){p(),c();const b=[];for(;a<n.length&&/^>\s?/.test((n[a]??"").trim());)b.push((n[a]??"").trim().replace(/^>\s?/,"")),a+=1;s.push(`<blockquote>${U(b.join(" "))}</blockquote>`);continue}const x=/^[-*·]\s+(.+)$/.exec(u);if(x){p(),i&&(s.push("</ol>"),i=!1),r||(s.push("<ul>"),r=!0),s.push(`<li>${U(x[1])}</li>`),a+=1;continue}const S=/^(\d+)[.)]\s+(.+)$/.exec(u);if(S){const b=S[2].trim(),C=b.length<=48&&!/[。；;！？!?]$/.test(b)&&(/表|图|归因|建议|结论|摘要|指标|分析|说明|概况|概述|TOP|可视化/.test(b)||b.length<=24);if(p(),C){c(),s.push(`<h3>${U(b)}</h3>`),a+=1;continue}r&&(s.push("</ul>"),r=!1),i||(s.push("<ol>"),i=!0),s.push(`<li>${U(b)}</li>`),a+=1;continue}c(),l.push(u),a+=1}return p(),c(),s.join(`
`)}function it(e){const t=e.replace(/\r\n/g,`
`).split(`
`),n=[];let s="",a=1,r=[],i=!1;const l=()=>{const c=r.join(`
`).trim();!i&&!c||(n.push({heading:s||(n.length===0?"概述":`要点 ${n.length+1}`),body:c,level:a}),r=[])};for(const c of t){const p=/^(#{1,4})\s+(.+)$/.exec(c.trim());if(p){(i||r.some(f=>f.trim()))&&l(),s=p[2].trim(),a=p[1].length,i=!0;continue}r.push(c)}return l(),n}function re(e,t=10){const n=e.split(/\r?\n/).map(a=>a.trim()).filter(Boolean),s=[];for(const a of n){if(/^---+$/.test(a)||/^>\s?/.test(a)||Re(a)||B(a))continue;const i=a.replace(/^[-*·]\s+/,"").replace(/^\d+[.)]\s+/,"").trim().replace(/\*\*(.+?)\*\*/g,"$1").replace(/\*(.+?)\*/g,"$1").replace(/`([^`]+)`/g,"$1").trim();if(i){if(!/^[-*·\d]/.test(a)&&i.length>90&&/[。；;]/.test(i)){const l=i.split(new RegExp("(?<=[。；;])\\s*")).map(c=>c.trim()).filter(c=>c.length>=6);for(const c of l)if(s.push(c.length>140?`${c.slice(0,138)}…`:c),s.length>=t)return s;continue}if(s.push(i.length>140?`${i.slice(0,138)}…`:i),s.length>=t)break}}if(!s.length){const a=e.replace(/\s+/g," ").trim();a&&s.push(a.length>140?`${a.slice(0,138)}…`:a)}return s}function Ca(e){return e.trim().replace(/\/$/,"")}async function sn(e,t){var r,i,l,c;const n=De(),s=await fetch(`${Ca(n.baseUrl)}/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n.apiKey.trim()}`},body:JSON.stringify({model:I(n.model),messages:e,max_tokens:(t==null?void 0:t.maxTokens)??3200,temperature:(t==null?void 0:t.temperature)??.4,stream:!1}),signal:t==null?void 0:t.signal});if(!s.ok){const p=await s.text();throw new Error(`LLM HTTP ${s.status}: ${p.slice(0,160)}`)}return((c=(l=(i=(r=(await s.json()).choices)==null?void 0:r[0])==null?void 0:i.message)==null?void 0:l.content)==null?void 0:c.trim())??""}function $a(e){let t=e.trim();return t=t.replace(/^```(?:html|HTML|json|JSON|xml)?\s*\n?/i,""),t=t.replace(/\n?```\s*$/i,""),t.trim()}function an(e){const t=$a(e);try{return JSON.parse(t)}catch{const n=t.indexOf("{"),s=t.lastIndexOf("}");if(n>=0&&s>n)try{return JSON.parse(t.slice(n,s+1))}catch{return null}return null}}async function Ea(e){if(!_())throw new Error("LLM 未配置");const t=e.markdown.slice(0,12e3),n=e.type==="knowledge"?"知识检索 / 合规 / SOP / 引用溯源":"营销数据 / 经营分析 / 渠道与代表处",s=await sn([{role:"system",content:["你是企业多场景分析报告架构师。根据 Markdown 提炼「分析看板」结构化 JSON，供前端固定模板渲染。","只返回 JSON，不要代码块，不要解释。字段：","{",'  "executiveSummary": "一句话摘要（≤80字）",','  "metrics": [{"label":"指标名","value":"如 +8.2% 或 #1","tone":"up|down|neutral|warn","hint":"可选"}],','  "insights": [{"title":"短标题","text":"发现陈述","kind":"finding|risk|action|cite"}],','  "risks": ["风险句"],','  "actions": ["行动句"],','  "cites": ["溯源/引用句"],','  "sectionOverview": [{"title":"章节名","pointCount":3}]',"}","要求：","1) 紧扣场景语义提炼，适配营销/知识/培训/电商等不同材料，不要套固定话术。","2) 不得编造原文没有的数字或事实；可归纳改写，但必须可追溯到 Markdown。","3) metrics 2-4 个；insights 2-4 个；risks/actions 各 1-4 条；尽量保留关键百分比与专有名词。"].join(`
`)},{role:"user",content:[`场景倾向：${n}`,`Agent：${e.agentName||"Agent"}`,`任务：${e.query||"（未填）"}`,"","Markdown 全文：",t].join(`
`)}],{maxTokens:2200,temperature:.35,signal:e.signal}),a=an(s);if(!a)throw new Error("LLM 未返回有效分析看板 JSON");const r=Array.isArray(a.metrics)?a.metrics:[],i=Array.isArray(a.insights)?a.insights:[];return{executiveSummary:typeof a.executiveSummary=="string"?a.executiveSummary:void 0,metrics:r,insights:i,risks:Array.isArray(a.risks)?a.risks.map(String):void 0,actions:Array.isArray(a.actions)?a.actions.map(String):void 0,cites:Array.isArray(a.cites)?a.cites.map(String):void 0,sectionOverview:Array.isArray(a.sectionOverview)?a.sectionOverview:void 0,source:"model"}}async function za(e){if(!_())throw new Error("LLM 未配置");const t=e.markdown.slice(0,14e3),n=[`Agent：${e.agentName||"Agent"}`,`任务：${e.query||"（未填）"}`].join(`
`),s=await sn([{role:"system",content:["你是企业高管汇报 PPT 结构专家。根据 Markdown 提炼幻灯片。","硬性要求：","1) 覆盖原文全部主要章节与关键结论/数据/建议，不得只摘前两段。",'2) 只返回 JSON：{"slides":[{"title":"...","bullets":["..."]}]}，不要代码块，不要解释。',"3) 建议 4-10 页：第 1 页封面（标题+背景），其后每章一页或合并极短章节；每页 3-7 条 bullets，bullet 用完整业务语句，保留关键数字。","4) 不要空泛套话；bullet 必须能追溯到原文信息。"].join(`
`)},{role:"user",content:`${n}

Markdown 全文：
${t}`}],{maxTokens:2800,temperature:.3,signal:e.signal}),a=an(s),r=a==null?void 0:a.slides;if(!Array.isArray(r)||!r.length)throw new Error("LLM 未返回有效 PPT");return{slides:r.slice(0,12).map(i=>({title:String(i.title||"要点"),bullets:Array.isArray(i.bullets)?i.bullets.map(l=>String(l)).filter(Boolean).slice(0,10):["（无要点）"]}))}}function P(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function G(e){return e.replace(/\*\*(.+?)\*\*/g,"$1").replace(/\*(.+?)\*/g,"$1").replace(/`([^`]+)`/g,"$1").replace(/\[([^\]]+)\]\([^)]+\)/g,"$1").trim()}function Da(e){const t=[],n=new Set,s=e.replace(/\*\*(.+?)\*\*/g,"$1").replace(/\*(.+?)\*/g,"$1").replace(/`([^`]+)`/g,"$1"),a=(p,f,d)=>{const u=G(p).replace(/[-*·:：]+$/g,"").trim()||"指标",m=Number(f),y=`${f}%`,x=`${u}|${y}`;n.has(x)||t.length>=6||(n.add(x),t.push({label:u.slice(0,18),value:y,tone:m>0?"up":m<0?"down":"neutral",hint:d}))},r=/([A-Za-z\u4e00-\u9fff][A-Za-z0-9\u4e00-\u9fff/\s]{0,20}?)\s*[:：]?\s*([+-]?\d+(?:\.\d+)?)\s*%/g;let i;for(;(i=r.exec(s))&&t.length<6;)a(i[1],i[2],"来自 Markdown 数值");const l=/(环比|同比|增长|下降|转化|占比|提升|回落)\s*([+-]?\d+(?:\.\d+)?)\s*%/g;for(;(i=l.exec(s))&&t.length<6;)a(i[1],i[2]);const c=/([A-Za-z\u4e00-\u9fff]{2,12}).{0,8}(?:排名|第)\s*(\d{1,2})\b/g;for(;(i=c.exec(s))&&t.length<6;){const p=`${G(i[1]).slice(0,10)}排名`,f=`#${i[2]}`,d=`${p}|${f}`;n.has(d)||(n.add(d),t.push({label:p,value:f,tone:"neutral",hint:"位次"}))}return t.slice(0,4)}function Fa(e){const t=it(e),n=[],s=re(e,24),a=r=>{n.some(i=>i.text===r.text)||n.push(r)};for(const r of s){const i=G(r);if(!(i.length<8)&&(/风险|合规|避免|警告|需复核|不得|禁止/.test(i)?a({title:"风险提示",text:i,kind:"risk"}):/建议|下一步|启动|同步|复核|提交|执行/.test(i)?a({title:"行动建议",text:i,kind:"action"}):/引用|来源|指南|规范|SOP|文档/.test(i)&&n.filter(l=>l.kind==="cite").length<2?a({title:"溯源引用",text:i,kind:"cite"}):n.filter(l=>l.kind==="finding").length<4&&a({title:"关键发现",text:i,kind:"finding"}),n.length>=8))break}for(const r of t){const i=r.heading,l=re(r.body,4);if(l.length){if(/结论|摘要|发现|洞察/.test(i))for(const c of l.slice(0,2))a({title:i,text:G(c),kind:"finding"});if(/下一步|建议|行动/.test(i))for(const c of l.slice(0,3))a({title:i,text:G(c),kind:"action"});if(/引用|来源|溯源/.test(i))for(const c of l.slice(0,2))a({title:i,text:G(c),kind:"cite"})}}return n.slice(0,8)}function Ot(e){return e==="up"?"kpi-up":e==="down"?"kpi-down":e==="warn"?"kpi-warn":"kpi-neutral"}function Ka(e){return e==="risk"?{label:"风险",cls:"tag-risk"}:e==="action"?{label:"行动",cls:"tag-action"}:e==="cite"?{label:"溯源",cls:"tag-cite"}:{label:"发现",cls:"tag-find"}}function Ua(e){const t=Math.abs(Number(String(e).replace("%","")));return Number.isFinite(t)?Math.max(12,Math.min(100,t*(t<=20?4:1))):40}function lt(e,t){var d;const n=Da(e),s=Fa(e),a=it(e),r=s.filter(u=>u.kind==="finding"),i=s.filter(u=>u.kind==="risk").map(u=>u.text),l=s.filter(u=>u.kind==="action").map(u=>u.text),c=s.filter(u=>u.kind==="cite").map(u=>u.text),p=n.length>0?n:[{label:"章节覆盖",value:String(Math.max(1,a.length)),tone:"neutral",hint:"Markdown 章节"},{label:"提炼要点",value:String(Math.max(1,s.length)),tone:"up",hint:"自动抽取"},{label:"报告类型",value:(t==null?void 0:t.type)==="knowledge"?"知识":"分析",tone:"neutral"}];return{executiveSummary:(G(((d=r[0]||s[0])==null?void 0:d.text)||re(e,1)[0]||"")||"已根据 Markdown 完成结构化分析，详见下方看板与正文。").slice(0,160),metrics:p.slice(0,4),insights:(r.length?r:s).slice(0,4),risks:i.slice(0,4),actions:l.slice(0,4),cites:c.slice(0,3),sectionOverview:a.slice(0,6).map(u=>({title:u.heading,pointCount:re(u.body,20).length})),source:"local"}}function Ba(e,t){if(!t)return e;const n=d=>d==="up"||d==="down"||d==="neutral"||d==="warn",s=(t.metrics||[]).map(d=>({label:String((d==null?void 0:d.label)||"").trim().slice(0,18),value:String((d==null?void 0:d.value)||"").trim().slice(0,24),tone:n(d==null?void 0:d.tone)?d.tone:"neutral",hint:d!=null&&d.hint?String(d.hint).slice(0,24):"模型提炼"})).filter(d=>d.label&&d.value),a=(t.insights||[]).map(d=>({title:String((d==null?void 0:d.title)||"关键发现").trim().slice(0,40),text:String((d==null?void 0:d.text)||"").trim().slice(0,200),kind:(d==null?void 0:d.kind)==="risk"||(d==null?void 0:d.kind)==="action"||(d==null?void 0:d.kind)==="cite"||(d==null?void 0:d.kind)==="finding"?d.kind:"finding"})).filter(d=>d.text),r=(t.risks||[]).map(d=>String(d).trim()).filter(Boolean).slice(0,4),i=(t.actions||[]).map(d=>String(d).trim()).filter(Boolean).slice(0,4),l=(t.cites||[]).map(d=>String(d).trim()).filter(Boolean).slice(0,3),c=(t.sectionOverview||[]).map(d=>({title:String((d==null?void 0:d.title)||"").trim(),pointCount:Number(d==null?void 0:d.pointCount)||0})).filter(d=>d.title).slice(0,6),p=String(t.executiveSummary||"").trim().slice(0,160);return!!p&&(s.length>=2||a.length>=2||i.length+r.length>=2)?{executiveSummary:p||e.executiveSummary,metrics:s.length?s.slice(0,4):e.metrics,insights:a.length?a.slice(0,4):e.insights,risks:r.length?r:e.risks,actions:i.length?i:e.actions,cites:l.length?l:e.cites,sectionOverview:c.length?c:e.sectionOverview,source:"model"}:e}function Ga(e,t){const n=(t==null?void 0:t.board)??lt(e,t),s=n.insights.filter(m=>m.kind==="finding").slice(0,3),a=n.metrics.slice(0,4),r=a.filter(m=>/%|％/.test(m.value)).slice(0,4),i=n.source==="model"?"模型按场景提炼 · 本地模板排版":"本地规则抽取 · 模板排版",l=a.map(m=>`<div class="kpi ${Ot(m.tone)}">
      <div class="kpi-label">${P(m.label)}</div>
      <div class="kpi-value">${P(m.value)}</div>
      ${m.hint?`<div class="kpi-hint">${P(m.hint)}</div>`:""}
    </div>`).join(""),c=r.length>=2?`<div class="panel">
      <div class="panel-hd"><span>指标对照</span><span class="muted">${n.source==="model"?"模型提炼数值":"由文中百分比生成"}</span></div>
      <div class="bars">
        ${r.map(m=>`<div class="bar-row">
          <div class="bar-label">${P(m.label)}</div>
          <div class="bar-track"><div class="bar-fill ${Ot(m.tone)}" style="width:${Ua(m.value)}%"></div></div>
          <div class="bar-val">${P(m.value)}</div>
        </div>`).join("")}
      </div>
    </div>`:`<div class="panel">
      <div class="panel-hd"><span>结构概览</span><span class="muted">章节拆解</span></div>
      <div class="struct-grid">
        ${n.sectionOverview.slice(0,6).map((m,y)=>`<div class="struct-item">
          <span class="struct-idx">${y+1}</span>
          <span class="struct-title">${P(m.title)}</span>
          <span class="struct-len">${m.pointCount} 要点</span>
        </div>`).join("")}
      </div>
    </div>`,p=(s.length?s:n.insights.slice(0,3)).map(m=>{const y=Ka(m.kind);return`<div class="insight-card">
        <span class="tag ${y.cls}">${y.label}</span>
        <h4>${P(m.title)}</h4>
        <p>${P(m.text)}</p>
      </div>`}).join(""),f=n.risks.length>0?n.risks.map(m=>`<li>${P(m)}</li>`).join(""):"<li>文中未检出显式风险词；请结合正文复核业务口径。</li>",d=n.actions.length>0?n.actions.map((m,y)=>`<li><span class="step">${y+1}</span>${P(m)}</li>`).join(""):'<li><span class="step">1</span>复核正文结论后同步相关 Owner。</li>',u=n.cites.length>0?`<div class="panel cite-panel">
      <div class="panel-hd"><span>溯源要点</span><span class="muted">${n.source==="model"?"模型归纳":"来自引用相关语句"}</span></div>
      <ul class="cite-list">${n.cites.map(m=>`<li>${P(m)}</li>`).join("")}</ul>
    </div>`:"";return`
<section class="analysis">
  <div class="analysis-hd">
    <div>
      <p class="analysis-eyebrow">ANALYSIS BOARD</p>
      <h2>智能分析看板</h2>
      <p class="analysis-desc">${P(i)}：指标、发现、风险与行动，便于多场景快速阅览。</p>
    </div>
    <div class="exec-pill">
      <span class="exec-label">一句话摘要</span>
      <p>${P(G(n.executiveSummary).slice(0,160))}</p>
    </div>
  </div>

  <div class="kpi-grid">${l}</div>

  <div class="split">
    ${c}
    <div class="panel">
      <div class="panel-hd"><span>关键发现</span><span class="muted">${n.source==="model"?"模型聚类":"自动聚类"}</span></div>
      <div class="insight-grid">${p||'<p class="muted">暂无提炼要点</p>'}</div>
    </div>
  </div>

  <div class="split split-2">
    <div class="panel panel-risk">
      <div class="panel-hd"><span>风险与注意</span></div>
      <ul class="bullet-rich">${f}</ul>
    </div>
    <div class="panel panel-action">
      <div class="panel-hd"><span>行动路线</span></div>
      <ul class="action-list">${d}</ul>
    </div>
  </div>

  ${u}
</section>
<section class="body-hd">
  <p class="analysis-eyebrow">FULL REPORT</p>
  <h2>正文详情</h2>
  <p class="analysis-desc">完整保留 Markdown 原文结构与表述，供核对与转发。</p>
</section>`}const Ha=`
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
`;function Wa(e){return e!=null&&e.length?e.join(" · "):""}function qa(e,t){var s;const n=/^#\s+(.+)$/m.exec(e);return((s=n==null?void 0:n[1])==null?void 0:s.trim())||t}function Va(e){return/[+-]?\d+(\.\d+)?%|#\d+|第\s*\d+|环比|同比|万元|GMV|SO\b/.test(e)}function rn(e){return e.length?e.filter(Va).length>=Math.ceil(e.length*.5)&&e.length<=6?"metrics":e.length<=6?"cards":"list":"list"}function Ze(e,t=72){const n=e.replace(/\s+/g," ").trim();return n.length>t?`${n.slice(0,t-1)}…`:n}function on(e,t){var p,f,d;const n=((p=t==null?void 0:t.title)==null?void 0:p.trim())||((f=e[0])==null?void 0:f.title)||"业务汇报",s=e.filter(u=>u.role!=="cover"&&u.role!=="closing").filter(u=>!/谢谢|thank\s*you|致谢/i.test(u.title)).map(u=>({...u,role:u.role||"content",layout:u.layout||rn(u.bullets),bullets:u.bullets.map(m=>Ze(m,88)).slice(0,6)})),a=s[0]&&s[0].title===n&&s[0].bullets.every(u=>/Agent|Skill|任务|基于/.test(u))?s.slice(1):s,r=a.slice(0,5).map((u,m)=>`${m+1}. ${u.title}`),i={role:"cover",layout:"cover",title:n,subtitle:"MSS Claw · 智能交付汇报",bullets:[],meta:[t!=null&&t.agentName?`汇报人：${t.agentName}`:"MSS AI 提效作战平台",(d=t==null?void 0:t.skills)!=null&&d.length?`能力：${Wa(t.skills)}`:"基于 Markdown 智能生成",t!=null&&t.query?`议题：${t.query.slice(0,42)}`:new Date().toLocaleDateString("zh-CN")]},l=r.length>=2?{role:"agenda",layout:"cards",title:"汇报议程",subtitle:"Agenda",bullets:r}:null,c={role:"closing",layout:"closing",title:"谢谢",subtitle:"Thank You",bullets:["欢迎交流与反馈","MSS Claw · 让业务交付更高效"],meta:[(t==null?void 0:t.agentName)||"MSS Claw",new Date().toLocaleDateString("zh-CN")]};return[i,...l?[l]:[],...a.slice(0,8),c]}function Ya(e,t){const n=it(e),s=qa(e,"业务汇报"),a=[];for(const r of n){if(r.level===1&&r.heading===s&&!r.body.trim())continue;const i=re(r.body,8).filter(l=>!l.includes("|")&&!/^[-:]+$/.test(l)).map(l=>Ze(l,88));!i.length&&r.level===1||i.length&&a.push({role:"content",title:r.heading.replace(/^\d+[.)]\s*/,""),bullets:i,layout:rn(i)})}return a.length||a.push({role:"content",title:"核心要点",bullets:re(e,6).map(r=>Ze(r,88)),layout:"cards"}),on(a,{title:s,agentName:t==null?void 0:t.agentName,query:t==null?void 0:t.query,skills:t==null?void 0:t.skills})}function Ja(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}function Xa(e,t,n){const s=new Uint8Array(t.byteLength);s.set(t);const a=new Blob([s],{type:n}),r=URL.createObjectURL(a),i=document.createElement("a");i.href=r,i.download=e,i.click(),URL.revokeObjectURL(r)}function Qa(e,t="l"){return`<p:txBody><a:bodyPr/><a:lstStyle/>${e.map((s,a)=>{const r=(s.size??18)*100,i=s.bold?"<a:b/>":"",l=s.color??"1A1A1A";return`<a:p>
  <a:pPr algn="${t}">
    <a:spcBef><a:spcPts val="${a===0?0:120}"/></a:spcBef>
  </a:pPr>
  <a:r>
    <a:rPr lang="zh-CN" sz="${r}" dirty="0">${i}<a:solidFill><a:srgbClr val="${l}"/></a:solidFill>
      <a:latin typeface="Microsoft YaHei"/><a:ea typeface="Microsoft YaHei"/>
    </a:rPr>
    <a:t>${Ja(s.text)}</a:t>
  </a:r>
  <a:endParaRPr lang="zh-CN" sz="${r}"/>
</a:p>`}).join("")}</p:txBody>`}let et=10;function Za(){return et+=1,et}function N(e){var n;const t=(n=e.lines)!=null&&n.length?Qa(e.lines,e.align??"l"):'<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="zh-CN"/></a:p></p:txBody>';return`<p:sp>
  <p:nvSpPr><p:cNvPr id="${Za()}" name="Shape"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
  <p:spPr>
    <a:xfrm><a:off x="${e.x}" y="${e.y}"/><a:ext cx="${e.cx}" cy="${e.cy}"/></a:xfrm>
    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
    <a:solidFill><a:srgbClr val="${e.fill}"/></a:solidFill>
    <a:ln><a:noFill/></a:ln>
  </p:spPr>
  ${t}
</p:sp>`}const Oe=12192e3,ct=6858e3,L="CF0A2C",Le="1A1A1A",be="595959",tt="F7F7F7";function er(e){const t=(e.meta??[]).slice(0,3),n=[N({x:0,y:0,cx:72e4,cy:ct,fill:L}),N({x:11e5,y:9e5,cx:95e5,cy:5e5,fill:"FFFFFF",lines:[{text:"HUAWEI STYLE · MSS CLAW",size:12,bold:!0,color:L}]}),N({x:11e5,y:22e5,cx:98e5,cy:16e5,fill:"FFFFFF",lines:[{text:e.subtitle||"智能交付汇报",size:14,color:be},{text:e.title||"业务汇报",size:36,bold:!0,color:Le}]}),N({x:11e5,y:4e6,cx:12e5,cy:6e4,fill:L}),...t.map((s,a)=>N({x:11e5,y:43e5+a*42e4,cx:9e6,cy:38e4,fill:"FFFFFF",lines:[{text:s,size:13,color:be}]}))];return dt(n.join(""))}function tr(e){const t=[N({x:0,y:0,cx:Oe,cy:12e4,fill:L}),N({x:12e5,y:22e5,cx:98e5,cy:22e5,fill:"FFFFFF",align:"ctr",lines:[{text:e.title||"谢谢",size:48,bold:!0,color:Le},{text:e.subtitle||"Thank You",size:18,bold:!0,color:L},...e.bullets.slice(0,2).map(n=>({text:n,size:13,color:be}))]}),N({x:0,y:ct-7e5,cx:Oe,cy:7e5,fill:tt,align:"ctr",lines:[{text:(e.meta??["MSS Claw"]).join(" · "),size:11,color:be}]})];return dt(t.join(""))}function nr(e){const t=e.bullets.slice(0,6),s=e.layout==="metrics"?t.map((r,i)=>{const l=i%3,c=Math.floor(i/3),p=r.match(/([+-]?\d+(?:\.\d+)?%|#\d+|第\s*\d+)/),f=(p==null?void 0:p[1])||String(i+1),d=r.replace(f,"").replace(/^[:：\s-]+/,"").trim()||r,u=7e5+l*37e5,m=18e5+c*2e6;return N({x:u,y:m,cx:34e5,cy:17e5,fill:tt,lines:[{text:d.slice(0,28),size:11,color:be},{text:f,size:28,bold:!0,color:L}]})}):t.map((r,i)=>{const l=i%2,c=Math.floor(i/2),p=7e5+l*56e5,f=17e5+c*14e5;return[N({x:p,y:f,cx:12e4,cy:12e5,fill:L}),N({x:p+12e4,y:f,cx:5e6,cy:12e5,fill:tt,lines:[{text:String(i+1).padStart(2,"0"),size:11,bold:!0,color:L},{text:r.slice(0,80),size:13,color:Le}]})].join("")}),a=[N({x:0,y:0,cx:Oe,cy:9e4,fill:L}),N({x:7e5,y:4e5,cx:1e7,cy:11e5,fill:"FFFFFF",lines:[{text:e.subtitle||(e.role==="agenda"?"AGENDA":"KEY POINTS"),size:11,bold:!0,color:L},{text:e.title,size:24,bold:!0,color:Le}]}),...Array.isArray(s)?s:[s]];return dt(a.flat().join(""))}function dt(e){return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</p:sld>`}function sr(e){return et=10,e.role==="cover"||e.layout==="cover"?er(e):e.role==="closing"||e.layout==="closing"?tr(e):nr(e)}const ar=e=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</Types>`,rr=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,or=e=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
 saveSubsetFonts="1">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>
    ${Array.from({length:e},(t,n)=>`<p:sldId id="${256+n}" r:id="rId${n+2}"/>`).join(`
    `)}
  </p:sldIdLst>
  <p:sldSz cx="${Oe}" cy="${ct}" type="screen16x9"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`,ir=e=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${Array.from({length:e},(t,n)=>`<Relationship Id="rId${n+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${n+1}.xml"/>`).join(`
  `)}
  <Relationship Id="rId${e+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>`,lr=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`,cr=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</p:sldLayout>`,dr=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`,pr=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</p:sldMaster>`,ur=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`,mr=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</a:theme>`;function fr(){const e=new Date().toISOString();return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</cp:coreProperties>`}function gr(e){return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
 xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>MSS Claw</Application>
  <Slides>${e}</Slides>
</Properties>`}function hr(e){const t=e.length?e:[{title:"空演示",bullets:[],role:"content"}],n=t.length,s={"[Content_Types].xml":T(ar(n)),"_rels/.rels":T(rr),"docProps/core.xml":T(fr()),"docProps/app.xml":T(gr(n)),"ppt/presentation.xml":T(or(n)),"ppt/_rels/presentation.xml.rels":T(ir(n)),"ppt/slideLayouts/slideLayout1.xml":T(cr),"ppt/slideLayouts/_rels/slideLayout1.xml.rels":T(dr),"ppt/slideMasters/slideMaster1.xml":T(pr),"ppt/slideMasters/_rels/slideMaster1.xml.rels":T(ur),"ppt/theme/theme1.xml":T(mr)};return t.forEach((a,r)=>{const i=r+1;s[`ppt/slides/slide${i}.xml`]=T(sr(a)),s[`ppt/slides/_rels/slide${i}.xml.rels`]=T(lr)}),bn(s,{level:6})}function xr(e,t){const n=e.toLowerCase().endsWith(".pptx")?e:`${e}.pptx`,s=hr(t);Xa(n,s,"application/vnd.openxmlformats-officedocument.presentationml.presentation")}function ln(e){return e!=null&&e.length?e.join(" · "):"（未挂载 Skill）"}function cn(e){const t=(e??"").trim();return t?t.length>8e3?`${t.slice(0,8e3)}

…（后续内容已截断）`:t:""}function br(e){const t=cn(e.agentReply);return["# 任务交付报告","",`> Agent：${e.agentName||"数据分析 Agent"}  ·  Skill：${ln(e.skills)}`,"","## 任务目标","",e.query||"（未填写）","","## 执行摘要","",t||["- 拉美穿戴 SO 环比 **+8.2%**，墨西哥、阿根廷贡献主要增量","- 竞品降价对巴西影响显著，建议启动 NBA 补贴券策略","- IoT 剔除后排名稳定，渠道促销为首要归因因子"].join(`
`),"","## 下一步","","1. 复核巴西价盘与竞品价差","2. 同步渠道与代表处执行 NBA","3. 下周复盘 SO / 转化交叉指标","","---",`*生成时间：${new Date().toLocaleString("zh-CN")}*`].join(`
`)}function kr(e){var s,a;const t=cn(e.agentReply),n=((a=(s=e.kbArtifact)==null?void 0:s.citations)==null?void 0:a.slice(0,8).map((r,i)=>{var l;return`${i+1}. **${r.docTitle}** — ${((l=r.snippet)==null?void 0:l.slice(0,120))||r.docId}`}).join(`
`))||`1. 拉美合规准入指南
2. 3C 营销话术规范`;return["# 知识检索交付","",`> Agent：${e.agentName||"知识 Agent"}  ·  Skill：${ln(e.skills)}`,"","## 查询","",e.query||"（未填写）","","## 结论","",t||["- 可穿戴营销物料需避免未获批医疗功效表述","- 建议提交 MKT 合规复核后再对外发布","- 引用已按密级与可见性过滤"].join(`
`),"","## 引用来源","",n,"","---",`*生成时间：${new Date().toLocaleString("zh-CN")}*`].join(`
`)}function yr(e,t){const n=t.query?t.query.slice(0,80):"";return`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${de(t.title)}</title>
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
  ${Ha}
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
        <h1>${de(t.title)}</h1>
        <p class="meta">${de(t.agent)}${n?` · ${de(n)}`:""} · Markdown 智能分析 + 正文详稿</p>
      </header>
      <div class="content">
        ${t.analysisHtml||""}
        <div class="body-detail">
          ${e}
        </div>
        <div class="footer">
          <span>智能分析看板 + Markdown 正文 · 指标与要点自动抽取</span>
          <span>${de(new Date().toLocaleString("zh-CN"))}</span>
        </div>
      </div>
    </article>
  </div>
</body>
</html>`}function de(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function dn(e,t){var s;const n=/^#\s+(.+)$/m.exec(e);return((s=n==null?void 0:n[1])==null?void 0:s.trim())||t}function pn(e,t,n){const s=_a(e),a=s.replace(/^\s*<h1>[\s\S]*?<\/h1>\s*/i,""),r=dn(e,(t==null?void 0:t.type)==="knowledge"?"知识检索交付":"任务交付报告"),i=Ga(e,{type:t==null?void 0:t.type,board:n??lt(e,{type:t==null?void 0:t.type})});return yr(a||s,{title:r,agent:(t==null?void 0:t.agentName)||"Agent",query:(t==null?void 0:t.query)||"",analysisHtml:i})}function Sr(e,t){return Ya(e,t)}function wr(e,t,n){if(e==="html"){const a=pn(t,n);return{html:a,size:`${Math.max(6,Math.round(a.length/1024))} KB`,pendingGenerate:!1}}const s=Sr(t,n);return{slides:s,size:`${Math.max(.6,s.length*.35).toFixed(1)} MB`,pendingGenerate:!1}}function Lt(e){var t,n,s;return e.pendingGenerate?!1:e.kind==="markdown"?!!((t=e.markdown)!=null&&t.trim()):e.kind==="html"?!!((n=e.html)!=null&&n.trim()):e.kind==="ppt"?!!((s=e.slides)!=null&&s.length):e.kind==="xlsx"?!!e.table:e.kind==="board"||e.kind==="knowledge"}function _t(e){return e==="html"||e==="ppt"}async function vr(e,t,n,s){var i,l;const a=t.trim();if(!a)throw new Error("请先确保 Markdown 交付件有内容");const r=wr(e,a,n);if(e==="html"){let c=lt(a,{type:n.type});if(_())try{const f=await Ea({markdown:a,agentName:n.agentName,query:n.query,type:n.type,signal:s});if(s!=null&&s.aborted)throw new Error("已取消生成");c=Ba(c,f)}catch{}else await new Promise(f=>setTimeout(f,280));if(s!=null&&s.aborted)throw new Error("已取消生成");const p=pn(a,n,c);return{html:p,size:`${Math.max(6,Math.round(p.length/1024))} KB`,pendingGenerate:!1}}if(_())try{const c=await za({kind:"ppt",markdown:a,agentName:n.agentName,query:n.query,type:n.type,signal:s});if((i=c.slides)!=null&&i.length){const p=((l=r.slides)==null?void 0:l.length)??0;if(c.slides.length+1>=p||c.slides.length>=4){const f=on(c.slides.map(d=>({title:d.title,bullets:d.bullets,role:"content"})),{title:dn(a,"业务汇报"),agentName:n.agentName,query:n.query,skills:n.skills});return{slides:f,size:`${Math.max(.6,f.length*.35).toFixed(1)} MB`,pendingGenerate:!1}}}}catch{}if(await new Promise(c=>setTimeout(c,280)),s!=null&&s.aborted)throw new Error("已取消生成");return r}function Ct(e,t,n,s,a,r){return{id:e,kind:t,name:n,title:s,size:"待生成",icon:a,iconClass:r,pendingGenerate:!0}}function Ir(e){const t=e.type==="marketing"?br(e):kr(e),n=e.type==="marketing"?"m":"k";return[{id:`${n}-md`,kind:"markdown",name:"Markdown",title:"Markdown",size:`${Math.max(2,Math.round(t.length/1024))} KB`,icon:"fa-file-lines",iconClass:"text-zinc-700",markdown:t,pendingGenerate:!1},Ct(`${n}-html`,"html","HTML","HTML","fa-file-code","text-orange-600"),Ct(`${n}-ppt`,"ppt","PPT","PPT","fa-file-powerpoint","text-amber-600")]}function Ar(e,t=""){var n;if(e.kind==="markdown"&&e.markdown){Ae(`${e.name}.md`,e.markdown,"text/markdown;charset=utf-8");return}if(e.kind==="html"&&e.html){Ae(`${e.name}.html`,e.html,"text/html;charset=utf-8");return}if(e.kind==="ppt"&&((n=e.slides)!=null&&n.length)){xr(e.name,e.slides);return}if(e.kind==="xlsx"&&e.table){const s=[e.table.headers.join(","),...e.table.rows.map(a=>a.join(","))].join(`
`);Ae(`${e.name}.csv`,`${s}
# ${t}`,"text/csv;charset=utf-8");return}Ae(`${e.name}.json`,JSON.stringify({id:e.id,kind:e.kind,query:t,exportedAt:new Date().toISOString()},null,2))}const h={red:"#CF0A2C",redDark:"#A10822",ink:"#1A1A1A",mute:"#595959",line:"#E5E5E5",soft:"#F7F7F7",white:"#FFFFFF"};function Mr({index:e,total:t,title:n,children:s}){return o.jsxs("div",{className:"overflow-hidden rounded-lg bg-white shadow-[0_12px_32px_rgba(0,0,0,0.12)] ring-1 ring-black/5",children:[o.jsxs("div",{className:"flex items-center gap-1.5 border-b border-zinc-200 bg-[#f7f7f8] px-3 py-1.5",children:[o.jsx("span",{className:"h-2 w-2 rounded-full bg-[#ff5f57]"}),o.jsx("span",{className:"h-2 w-2 rounded-full bg-[#febc2e]"}),o.jsx("span",{className:"h-2 w-2 rounded-full bg-[#28c840]"}),o.jsxs("span",{className:"ml-2 truncate text-[10px] text-zinc-500",children:["幻灯片 ",e+1," / ",t," · ",n]})]}),o.jsx("div",{className:"relative aspect-[16/9] w-full overflow-hidden",children:s})]})}function Tr({slide:e}){var t;return o.jsxs("div",{className:"absolute inset-0 flex",style:{background:h.white},children:[o.jsx("div",{className:"relative w-[8%] shrink-0",style:{background:h.red},children:o.jsx("div",{className:"absolute bottom-0 left-0 h-[38%] w-full opacity-90",style:{background:`linear-gradient(160deg, ${h.redDark} 0%, ${h.red} 100%)`,clipPath:"polygon(0 35%, 100% 0, 100% 100%, 0 100%)"}})}),o.jsxs("div",{className:"relative flex min-w-0 flex-1 flex-col justify-between px-9 py-8",children:[o.jsxs("div",{className:"flex items-center justify-between",children:[o.jsx("p",{className:"text-[11px] font-semibold tracking-[0.18em]",style:{color:h.red},children:"HUAWEI STYLE · MSS CLAW"}),o.jsx("div",{className:"h-1.5 w-10",style:{background:h.red}})]}),o.jsxs("div",{className:"max-w-[90%]",children:[o.jsx("p",{className:"text-[12px] font-medium",style:{color:h.mute},children:e.subtitle||"智能交付汇报"}),o.jsx("h3",{className:"mt-3 text-[30px] font-bold leading-[1.2] tracking-tight",style:{color:h.ink},children:e.title}),o.jsx("div",{className:"mt-5 h-[3px] w-16",style:{background:h.red}}),(t=e.meta)!=null&&t.length?o.jsx("ul",{className:"mt-6 space-y-2",children:e.meta.slice(0,3).map(n=>o.jsxs("li",{className:"flex items-center gap-2 text-[12.5px]",style:{color:h.mute},children:[o.jsx("span",{className:"h-1.5 w-1.5 shrink-0 rounded-full",style:{background:h.red}}),n]},n))}):null]}),o.jsxs("div",{className:"flex items-end justify-between",children:[o.jsx("p",{className:"text-[10px]",style:{color:"#8c8c8c"},children:"Confidential · For Internal Discussion"}),o.jsxs("div",{className:"flex gap-1",children:[o.jsx("span",{className:"h-2 w-8",style:{background:h.red}}),o.jsx("span",{className:"h-2 w-3 bg-zinc-300"}),o.jsx("span",{className:"h-2 w-3 bg-zinc-200"})]})]}),o.jsx("div",{className:"pointer-events-none absolute -bottom-6 -right-4 h-36 w-36 opacity-[0.12]",style:{background:h.red,clipPath:"polygon(40% 0, 100% 0, 100% 100%, 0 100%)"}})]})]})}function Pr({slide:e}){var t;return o.jsxs("div",{className:"absolute inset-0 flex flex-col",style:{background:h.white},children:[o.jsx("div",{className:"h-2 w-full",style:{background:h.red}}),o.jsxs("div",{className:"relative flex flex-1 flex-col items-center justify-center px-8 text-center",children:[o.jsx("div",{className:"mb-4 h-1 w-14",style:{background:h.red}}),o.jsx("h3",{className:"text-[48px] font-bold tracking-tight",style:{color:h.ink},children:e.title||"谢谢"}),o.jsx("p",{className:"mt-2 text-[16px] font-medium tracking-[0.2em]",style:{color:h.red},children:e.subtitle||"Thank You"}),e.bullets.length?o.jsx("div",{className:"mt-8 flex flex-wrap items-center justify-center gap-3",children:e.bullets.slice(0,2).map(n=>o.jsx("span",{className:"rounded-full border px-4 py-1.5 text-[12px]",style:{borderColor:h.line,color:h.mute},children:n},n))}):null,(t=e.meta)!=null&&t.length?o.jsx("p",{className:"mt-8 text-[11px]",style:{color:"#8c8c8c"},children:e.meta.join(" · ")}):null]}),o.jsxs("div",{className:"flex h-10 items-center justify-between px-8",style:{background:h.soft},children:[o.jsx("span",{className:"text-[10px] font-semibold",style:{color:h.red},children:"MSS Claw"}),o.jsx("span",{className:"text-[10px]",style:{color:h.mute},children:"欢迎提问与讨论"})]})]})}function Nr({bullets:e,layout:t}){const n=e.slice(0,6);return t==="metrics"?o.jsx("div",{className:"grid min-h-0 flex-1 grid-cols-3 gap-2.5 content-start",children:n.map((s,a)=>{const r=s.match(/([+-]?\d+(?:\.\d+)?%|#\d+|第\s*\d+)/),i=(r==null?void 0:r[1])||`${a+1}`,l=s.replace(i,"").replace(/^[:：\s-]+/,"").trim()||s;return o.jsxs("div",{className:"flex flex-col justify-between rounded-xl border px-3 py-3",style:{borderColor:h.line,background:a%2===0?h.soft:h.white},children:[o.jsx("span",{className:"text-[10px] font-semibold",style:{color:h.mute},children:l.slice(0,28)}),o.jsx("span",{className:"mt-2 text-[22px] font-bold tracking-tight",style:{color:h.red},children:i})]},`${a}-${s.slice(0,16)}`)})}):t==="list"?o.jsx("ul",{className:"min-h-0 flex-1 space-y-2 overflow-hidden",children:n.map((s,a)=>o.jsxs("li",{className:"flex gap-3 rounded-lg border px-3 py-2.5",style:{borderColor:h.line,background:h.soft},children:[o.jsx("span",{className:"mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white",style:{background:h.red},children:a+1}),o.jsx("span",{className:"text-[12.5px] leading-relaxed",style:{color:h.ink},children:s})]},`${a}-${s.slice(0,16)}`))}):o.jsx("div",{className:"grid min-h-0 flex-1 grid-cols-2 gap-2.5 content-start",children:n.map((s,a)=>o.jsxs("div",{className:"relative overflow-hidden rounded-xl border px-3.5 py-3",style:{borderColor:h.line,background:h.white},children:[o.jsx("div",{className:"absolute left-0 top-0 h-full w-1",style:{background:h.red}}),o.jsxs("div",{className:"flex items-start gap-2.5 pl-1",children:[o.jsx("span",{className:"mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white",style:{background:a===0?h.red:h.ink},children:String(a+1).padStart(2,"0")}),o.jsx("p",{className:"text-[12.5px] leading-relaxed",style:{color:h.ink},children:s})]})]},`${a}-${s.slice(0,16)}`))})}function Rr({slide:e,page:t,total:n}){const s=e.role==="agenda";return o.jsxs("div",{className:"absolute inset-0 flex flex-col",style:{background:h.white},children:[o.jsx("div",{className:"h-[3px] w-full",style:{background:h.red}}),o.jsxs("div",{className:"flex min-h-0 flex-1 flex-col px-7 py-5",children:[o.jsxs("div",{className:"mb-3 flex items-end justify-between gap-3 border-b pb-3",style:{borderColor:h.line},children:[o.jsxs("div",{className:"min-w-0",children:[e.subtitle||s?o.jsx("p",{className:"text-[10px] font-semibold tracking-[0.16em]",style:{color:h.red},children:e.subtitle||"AGENDA"}):o.jsx("p",{className:"text-[10px] font-semibold tracking-[0.14em]",style:{color:h.mute},children:"KEY POINTS"}),o.jsx("h3",{className:"mt-1 text-[20px] font-bold leading-snug tracking-tight",style:{color:h.ink},children:e.title})]}),o.jsx("div",{className:"h-8 w-8 shrink-0 rounded-md",style:{background:h.red}})]}),o.jsx(Nr,{bullets:e.bullets,layout:e.layout||"cards"}),o.jsxs("div",{className:"mt-3 flex items-center justify-between border-t pt-2 text-[10px]",style:{borderColor:h.line,color:h.mute},children:[o.jsxs("span",{children:[o.jsx("span",{className:"font-semibold",style:{color:h.red},children:"MSS Claw"}),o.jsx("span",{className:"mx-1.5 text-zinc-300",children:"|"}),"智能交付件"]}),o.jsxs("span",{children:[t," / ",n]})]})]})]})}function jr({slides:e}){return e.length?o.jsx("div",{className:v("space-y-4 rounded-xl p-3"),style:{background:"#eceff3"},children:e.map((t,n)=>o.jsx(Mr,{index:n,total:e.length,title:t.title,children:t.role==="cover"||t.layout==="cover"?o.jsx(Tr,{slide:t}):t.role==="closing"||t.layout==="closing"?o.jsx(Pr,{slide:t}):o.jsx(Rr,{slide:t,page:n+1,total:e.length})},`${t.role}-${t.title}-${n}`))}):o.jsx("div",{className:"rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-[12px] text-zinc-500",children:"暂无幻灯片"})}function Or(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/^### (.*)$/gm,'<h3 class="mt-3 mb-1 text-[13px] font-semibold text-zinc-900">$1</h3>').replace(/^## (.*)$/gm,'<h2 class="mt-4 mb-1.5 text-[15px] font-semibold text-zinc-900">$1</h2>').replace(/^# (.*)$/gm,'<h1 class="mb-2 text-[17px] font-bold text-zinc-900">$1</h1>').replace(/^> (.*)$/gm,'<p class="my-2 rounded-lg bg-zinc-100 px-3 py-2 text-[12px] text-zinc-600">$1</p>').replace(/^\- (.*)$/gm,'<li class="ml-4 list-disc text-[12px] leading-relaxed text-zinc-700">$1</li>').replace(/^\d+\. (.*)$/gm,'<li class="ml-4 list-decimal text-[12px] leading-relaxed text-zinc-700">$1</li>').replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\*(.*?)\*/g,"<em>$1</em>").replace(/^---$/gm,'<hr class="my-3 border-zinc-200"/>').replace(/\n\n/g,"<br/><br/>")}function Lr({title:e,html:t}){return o.jsx("iframe",{title:e,srcDoc:t,sandbox:"",className:"h-[min(72vh,640px)] w-full rounded-xl border border-zinc-200 bg-white"})}function _r({item:e}){return e.kind==="markdown"&&e.markdown?o.jsx("div",{className:"rounded-xl border border-zinc-200/80 bg-white p-4",dangerouslySetInnerHTML:{__html:Or(e.markdown)}}):e.kind==="html"&&e.html?o.jsx(Lr,{title:e.title,html:e.html}):e.kind==="ppt"&&e.slides?o.jsx(jr,{slides:e.slides}):o.jsx("div",{className:"rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-[12px] text-zinc-500",children:"暂无可预览内容"})}function Ko({ready:e,type:t,query:n="",agentName:s="",skills:a=[],agentReply:r="",kbArtifact:i=null,collapsed:l,onToggleCollapse:c,onPush:p,onDeliverableDownload:f,onRunExample:d}){var ft;const u=M.useMemo(()=>e&&t?Ir({type:t,query:n,agentName:s,skills:a,agentReply:r,kbArtifact:i}):[],[e,t,n,s,a,r,i]),m=`${t}|${n}|${s}|${r.slice(0,80)}`,[y,x]=M.useState({}),[S,b]=M.useState(null),[C,O]=M.useState(null),[ut,Se]=M.useState(null),q=M.useRef(null);M.useEffect(()=>{var k;x({}),Se(null),(k=q.current)==null||k.abort(),q.current=null,O(null)},[m]);const E=M.useMemo(()=>u.map(k=>{const V=y[k.id];return V?{...k,...V,pendingGenerate:!1}:k}),[u,y]);M.useEffect(()=>{if(!E.length){b(null);return}(!S||!E.some(k=>k.id===S))&&b(E[0].id)},[E,S]);const w=E.find(k=>k.id===S)??null,Fe=((ft=E.find(k=>k.kind==="markdown"))==null?void 0:ft.markdown)??"",mt=w?Lt(w):!1,un=w&&_t(w.kind)&&!mt&&!!Fe.trim(),mn=async()=>{var V;if(!w||!t||!_t(w.kind)||!Fe.trim())return;(V=q.current)==null||V.abort();const k=new AbortController;q.current=k,O(w.id),Se(null);try{const Y=await vr(w.kind,Fe,{type:t,query:n,agentName:s,skills:a,agentReply:r,kbArtifact:i},k.signal);if(k.signal.aborted)return;x(fn=>({...fn,[w.id]:{...Y,pendingGenerate:!1}}))}catch(Y){if(k.signal.aborted)return;Se(Y instanceof Error?Y.message:"生成失败，请重试")}finally{q.current===k&&(q.current=null),O(Y=>Y===w.id?null:Y)}};return o.jsxs(o.Fragment,{children:[o.jsxs("section",{className:v("artifact-panel z-20 border-l border-zinc-200/80",l&&"collapsed"),children:[o.jsxs("div",{className:"glass-bar flex h-[52px] shrink-0 items-center justify-between border-b border-zinc-200/80 px-4",children:[o.jsxs("div",{className:"flex min-w-0 items-center gap-2.5",children:[o.jsx("button",{type:"button",onClick:c,className:"flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900",title:"收起交付件预览",children:o.jsx("i",{className:"fa-solid fa-chevron-right text-xs"})}),o.jsx("div",{className:"flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-700",children:o.jsx("i",{className:"fa-solid fa-file-lines text-xs"})}),o.jsx("p",{className:"truncate text-[11px] font-semibold leading-none text-zinc-900",children:"交付件预览"})]}),o.jsxs("button",{type:"button",onClick:p,disabled:!e,className:"apple-btn-primary flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40",children:[o.jsx("i",{className:"fa-solid fa-paper-plane text-[10px]"}),"推送"]})]}),e&&E.length>0&&o.jsxs("div",{className:"flex shrink-0 items-center gap-2 border-b border-zinc-200/80 bg-white px-3 py-2",children:[o.jsx("div",{className:"flex flex-1 gap-1.5 overflow-x-auto scroll-hidden",children:E.map(k=>{const V=Lt(k);return o.jsxs("button",{type:"button",onClick:()=>{b(k.id),Se(null)},className:v("flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition",S===k.id?"border-zinc-900 bg-zinc-900 text-white":"border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-white"),children:[o.jsx("i",{className:v("text-[10px]",k.icon.startsWith("fa-")?`fa-solid ${k.icon}`:k.icon,S===k.id?"text-white/80":k.iconClass)}),o.jsx("span",{className:"font-medium",children:k.name}),!V&&k.kind!=="markdown"?o.jsx("span",{className:v("rounded px-1 text-[9px]",S===k.id?"bg-white/15 text-white/70":"bg-zinc-200/80 text-zinc-500"),children:"空"}):null]},k.id)})}),w&&mt?o.jsx("button",{type:"button",onClick:()=>{Ar(w,n),f==null||f(w.name)},className:"shrink-0 rounded-lg border border-zinc-200 px-2 py-1.5 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-50",title:"下载当前交付件",children:o.jsx("i",{className:"fa-solid fa-download"})}):null]}),o.jsxs("div",{className:"relative min-h-0 flex-1 overflow-hidden p-4",children:[!e&&o.jsxs("div",{className:"flex h-full flex-col items-center justify-center",children:[o.jsx("div",{className:"canvas-empty-icon relative mb-4 flex h-20 w-20 items-center justify-center rounded-xl border border-zinc-200 shadow-sm",children:o.jsx("i",{className:"fa-solid fa-wand-magic-sparkles text-3xl text-zinc-400"})}),o.jsx("h3",{className:"mb-1.5 text-[15px] font-semibold text-zinc-900",children:"等待 Agent 交付件"}),o.jsx("p",{className:"max-w-sm text-center text-[12px] leading-relaxed text-zinc-500",children:"确认执行计划后，将先生成 Markdown；可再切换到 HTML / PPT，基于全文点击「开始生成」预览。"}),d&&o.jsxs("div",{className:"mt-4 grid w-full max-w-sm grid-cols-1 gap-1.5",children:[o.jsxs("button",{type:"button",onClick:()=>d("marketing"),className:"task-card apple-card rounded-xl p-3 text-left",children:[o.jsxs("p",{className:"flex items-center gap-2 text-[12px] font-semibold text-zinc-800",children:[o.jsx("i",{className:"fa-solid fa-chart-column text-zinc-600"}),"多源数据分析"]}),o.jsx("p",{className:"mt-0.5 text-[11px] text-zinc-500",children:"/数据分析 · 代表处 SO 排名"})]}),o.jsxs("button",{type:"button",onClick:()=>d("knowledge"),className:"task-card apple-card rounded-xl p-3 text-left",children:[o.jsxs("p",{className:"flex items-center gap-2 text-[12px] font-semibold text-zinc-800",children:[o.jsx("i",{className:"fa-solid fa-file-shield text-zinc-600"}),"文档合规筛查"]}),o.jsx("p",{className:"mt-0.5 text-[11px] text-zinc-500",children:"/合规筛查 · 医疗用语检查"})]}),o.jsxs("button",{type:"button",onClick:()=>d("warroom"),className:"task-card apple-card rounded-xl p-3 text-left",children:[o.jsxs("p",{className:"flex items-center gap-2 text-[12px] font-semibold text-zinc-800",children:[o.jsx("i",{className:"fa-solid fa-tags text-zinc-600"}),"价格监测周报"]}),o.jsx("p",{className:"mt-0.5 text-[11px] text-zinc-500",children:"/价格监测 · 18 国 offer 比对"})]})]})]}),e&&w&&o.jsxs("div",{className:"scroll-hidden h-full overflow-y-auto",children:[o.jsxs("div",{className:"mb-2 flex items-center justify-between gap-2",children:[o.jsx("p",{className:"text-[11px] font-semibold text-zinc-800",children:w.title}),o.jsx("span",{className:"text-[10px] text-zinc-400",children:w.size})]}),C===w.id?o.jsxs("div",{className:"flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-16 text-center",children:[o.jsx("i",{className:"fa-solid fa-spinner fa-spin mb-3 text-2xl text-zinc-400"}),o.jsxs("p",{className:"text-[13px] font-semibold text-zinc-800",children:["正在基于 Markdown 生成 ",w.name,"…"]}),o.jsx("p",{className:"mt-1 text-[11px] text-zinc-500",children:w.kind==="html"?_()?"模型提炼分析看板 · 本地模板排版中":"本地转写 HTML 报告中":_()?"调用 AI 模型提炼幻灯片结构":"正在按章节拆解为幻灯片"}),o.jsx("button",{type:"button",onClick:()=>{var k;return(k=q.current)==null?void 0:k.abort()},className:"mt-4 rounded-lg border border-zinc-200 px-3 py-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50",children:"取消"})]}):un?o.jsxs("div",{className:"flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-14 text-center",children:[o.jsx("div",{className:"mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500",children:o.jsx("i",{className:v("fa-solid text-lg",w.icon)})}),o.jsxs("p",{className:"text-[13px] font-semibold text-zinc-800",children:[w.name," 尚未生成"]}),o.jsx("p",{className:"mt-1.5 max-w-xs text-[11px] leading-relaxed text-zinc-500",children:w.kind==="html"?_()?"模型按场景提炼 KPI/发现/风险/行动，再用现有精美模板排版；正文仍完整保留 Markdown。":"将把当前 Markdown 全文排版为可预览 HTML 报告（未配置模型时走本地转写）。":`将按章节把 Markdown 拆成 16:9 幻灯片${_()?"（可调用模型提炼要点）":""}。`}),ut?o.jsx("p",{className:"mt-2 max-w-xs text-[11px] text-red-600",children:ut}):null,o.jsx("button",{type:"button",onClick:()=>void mn(),className:"apple-btn-primary mt-4 rounded-lg px-4 py-2 text-[12px] font-semibold text-white",children:"开始生成"})]}):o.jsx(_r,{item:w})]})]})]}),l&&o.jsxs("button",{type:"button",onClick:c,className:"artifact-panel-expand-tab visible flex flex-col items-center justify-center gap-1 text-[10px] font-semibold",title:"展开交付件预览",children:[o.jsx("i",{className:"fa-solid fa-file-lines text-sm"}),o.jsx("span",{style:{writingMode:"vertical-rl"},children:"预览"})]})]})}function Cr({open:e,title:t,onClose:n,children:s,actions:a,size:r="md",elevate:i=!1,header:l,fitContent:c=!1,inline:p=!1}){if(!e)return null;const f=r==="fullscreen",d=p||r==="xl"||r==="2xl",u=f?"h-[min(96vh,calc(100%-1rem))] max-h-none max-w-none":r==="2xl"?c?"max-h-[94vh] max-w-6xl":"h-[min(94vh,920px)] max-w-6xl":r==="xl"?c?"max-h-[92vh] max-w-5xl":"h-[min(92vh,880px)] max-w-5xl":r==="lg"?"max-h-[85vh] max-w-2xl":"max-h-[85vh] max-w-lg",m=o.jsxs("div",{className:v("flex w-full flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-apple-lg",p?"mx-auto h-full max-w-6xl":u),children:[l??o.jsxs("div",{className:v("flex shrink-0 items-center justify-between border-b border-black/[0.06]",f||d?"px-5 py-3":"px-5 py-4"),children:[o.jsx("h3",{className:"truncate text-[15px] font-semibold text-[#1d1d1f]",children:t}),p?null:o.jsx("button",{type:"button",onClick:n,className:"text-[#86868b] transition hover:text-[#1d1d1f]",children:o.jsx("i",{className:"fa-solid fa-xmark"})})]}),o.jsx("div",{className:v(f?"min-h-0 flex-1 overflow-hidden p-3 md:p-4":d?"min-h-0 flex-1 overflow-y-auto p-0":"max-h-[60vh] overflow-y-auto p-5"),children:s}),a&&o.jsx("div",{className:v("flex w-full shrink-0 items-center justify-end gap-2 border-t border-black/[0.06] bg-[#fafafa]/50",f||d?"px-5 py-3":"px-5 py-4"),children:a})]});return p?m:o.jsx("div",{className:v("modal-backdrop fixed inset-0 flex items-center justify-center",f?"bg-black/55 p-2 md:p-3":"p-4",i?"z-[120]":"z-[100]"),children:m})}function Uo({title:e,subtitle:t,actions:n,tip:s}){return o.jsxs("div",{className:"mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end",children:[o.jsxs("div",{className:"max-w-2xl",children:[o.jsx("p",{className:"mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400",children:"MSS Claw"}),o.jsxs("div",{className:"flex flex-wrap items-center gap-2",children:[o.jsx("h2",{className:"text-[20px] font-semibold tracking-tight text-zinc-900 md:text-[22px]",children:e}),s?o.jsx($r,{children:s}):null]}),t?o.jsx("p",{className:"mt-1 text-[12px] leading-relaxed text-zinc-500",children:t}):null]}),n&&o.jsx("div",{className:"flex flex-wrap items-center gap-2",children:n})]})}function $r({children:e}){const[t,n]=M.useState(!1);return o.jsxs("div",{className:"relative inline-flex items-center",children:[o.jsxs("button",{type:"button",onClick:()=>n(s=>!s),onBlur:()=>setTimeout(()=>n(!1),150),className:v("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition",t?"border-claw-600/30 bg-claw-50 text-claw-700":"border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-800"),"aria-expanded":t,"aria-label":"快速上手",children:[o.jsx("i",{className:"fa-solid fa-lightbulb text-[9px]"}),"快速上手"]}),t?o.jsxs("div",{className:"absolute left-0 top-[calc(100%+6px)] z-30 w-[min(320px,80vw)] rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[11px] leading-relaxed text-zinc-600 shadow-lg",children:[o.jsx("p",{className:"mb-1 text-[10px] font-semibold tracking-wide text-zinc-400",children:"快速上手"}),o.jsx("div",{className:"learning-callout-inline",children:e})]}):null]})}function Bo({value:e,onChange:t,placeholder:n,className:s="w-full max-w-[12rem] sm:w-48",type:a="text"}){return o.jsx("input",{type:a,value:e,onInput:r=>t(r.currentTarget.value),placeholder:n,className:`apple-input ${s}`})}function Go({items:e,columns:t="auto"}){return o.jsx("div",{className:v("mb-4 grid grid-cols-2 gap-2",t==="three"?"sm:grid-cols-3":t==="four"?"sm:grid-cols-4":"sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]"),children:e.map(([n,s])=>o.jsxs("div",{className:"apple-card p-3",children:[o.jsx("p",{className:"text-[9px] font-semibold uppercase tracking-wide text-zinc-500",children:n}),o.jsx("p",{className:"mt-1 text-lg font-semibold tabular-nums tracking-tight text-zinc-900",children:s})]},n))})}const pt="mt-1 w-full rounded-xl border border-black/8 px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-zinc-900/20";function Ho({label:e,children:t,hint:n}){return o.jsxs("label",{className:"block",children:[o.jsx("span",{className:"text-[11px] font-semibold text-[#86868b]",children:e}),n&&o.jsx("p",{className:"mb-1 text-[10px] text-[#86868b]",children:n}),t]})}function Wo({className:e,...t}){return o.jsx("input",{className:v(pt,e),...t})}function qo({className:e,...t}){return o.jsx("textarea",{className:v(pt,e),...t})}function Vo({className:e,...t}){return o.jsx("select",{className:v(pt,e),...t})}function Er({onCancel:e,onSave:t,saveLabel:n="保存",cancelFirst:s=!1}){const a=o.jsx("button",{type:"button",onClick:e,className:"rounded-xl border border-black/8 px-4 py-2 text-[12px]",children:"取消"}),r=o.jsx("button",{type:"button",onClick:t,className:"apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white",children:n});return o.jsxs(o.Fragment,{children:[s?a:r,s?r:a]})}function Yo({open:e,onClose:t,warrooms:n,members:s,onConfirm:a}){const[r,i]=M.useState("warroom"),[l,c]=M.useState([]),[p,f]=M.useState([]),d=M.useMemo(()=>n.filter(x=>$e(x)),[n]),u=(x,S,b)=>{b(x.includes(S)?x.filter(C=>C!==S):[...x,S])},m=()=>{if(r==="warroom"){if(!l.length)return;a({mode:"warroom",warroomIds:l})}else{if(!p.length)return;a({mode:"members",memberIds:p})}c([]),f([]),t()},y=r==="warroom"?l.length>0:p.length>0;return o.jsx(Cr,{open:e,title:"推送交付物",onClose:t,size:"lg",elevate:!0,actions:o.jsx(Er,{onCancel:t,onSave:()=>{y&&m()},saveLabel:y?"发送":"请先选择"}),children:o.jsxs("div",{className:"space-y-3 text-left",children:[o.jsx("p",{className:"text-[11px] leading-relaxed text-zinc-500",children:"选择协作空间或成员接收交付物通知。协作空间将写入会话记录；成员将收到「我的消息」。"}),o.jsx("div",{className:"inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5",children:[["warroom","协作空间"],["members","成员"]].map(([x,S])=>o.jsx("button",{type:"button",onClick:()=>i(x),className:v("rounded-md px-3 py-1.5 text-[11px] font-semibold transition",r===x?"bg-white text-zinc-900 shadow-sm":"text-zinc-500 hover:text-zinc-800"),children:S},x))}),r==="warroom"?o.jsx("ul",{className:"max-h-[40vh] space-y-1.5 overflow-y-auto",children:d.length===0?o.jsx("li",{className:"rounded-xl border border-dashed border-zinc-200 px-3 py-8 text-center text-[12px] text-zinc-400",children:"暂无协作空间，请先在侧栏「协作空间」中新建"}):d.map(x=>{var b;const S=l.includes(x.id);return o.jsx("li",{children:o.jsxs("label",{className:v("flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition",S?"border-zinc-900 bg-zinc-900/5":"border-zinc-200 hover:border-zinc-300"),children:[o.jsx("input",{type:"checkbox",className:"accent-claw-600",checked:S,onChange:()=>u(l,x.id,c)}),o.jsx("span",{className:"flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white",children:o.jsx("i",{className:"fa-solid fa-users text-[11px]"})}),o.jsxs("span",{className:"min-w-0 flex-1",children:[o.jsx("span",{className:"block truncate text-[12px] font-semibold text-zinc-900",children:x.title}),o.jsxs("span",{className:"text-[10px] text-zinc-400",children:[((b=x.members)==null?void 0:b.length)??0," 名成员 · 协作室"]})]})]})},x.id)})}):o.jsx("ul",{className:"max-h-[40vh] space-y-1.5 overflow-y-auto",children:s.length===0?o.jsx("li",{className:"rounded-xl border border-dashed border-zinc-200 px-3 py-8 text-center text-[12px] text-zinc-400",children:"当前工作区暂无成员"}):s.map(x=>{var b;const S=p.includes(x.id);return o.jsx("li",{children:o.jsxs("label",{className:v("flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition",S?"border-zinc-900 bg-zinc-900/5":"border-zinc-200 hover:border-zinc-300"),children:[o.jsx("input",{type:"checkbox",className:"accent-claw-600",checked:S,onChange:()=>u(p,x.id,f)}),o.jsx("span",{className:v("flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white",x.avatar||"bg-zinc-700"),children:(((b=x.name)==null?void 0:b[0])??"?").toUpperCase()}),o.jsxs("span",{className:"min-w-0 flex-1",children:[o.jsx("span",{className:"block truncate text-[12px] font-semibold text-zinc-900",children:x.name}),o.jsx("span",{className:"truncate text-[10px] text-zinc-400",children:x.email||x.id})]})]})},x.id)})})]})})}export{po as $,uo as A,At as B,os as C,Mn as D,Mo as E,se as F,Mt as G,Vt as H,Aa as I,Ao as J,wo as K,Ae as L,vo as M,ls as N,vs as O,_n as P,qr as Q,Yr as R,An as S,Hr as T,Wr as U,ne as V,Me as W,fo as X,ho as Y,Ft as Z,Xn as _,He as a,ns as a$,v as a0,_a as a1,ss as a2,Jt as a3,Xt as a4,I as a5,nn as a6,Zr as a7,Cr as a8,Ro as a9,Vn as aA,ko as aB,Gn as aC,oo as aD,lo as aE,eo as aF,Lo as aG,_o as aH,Co as aI,ao as aJ,ro as aK,to as aL,Vr as aM,io as aN,so as aO,co as aP,no as aQ,Uo as aR,Bo as aS,Io as aT,Jr as aU,Ho as aV,Wo as aW,qo as aX,Vo as aY,Ur as aZ,Er as a_,Ko as aa,Yo as ab,aa as ac,Oo as ad,jo as ae,ge as af,he as ag,Br as ah,Sn as ai,yn as aj,Z as ak,$o as al,Ve as am,Yn as an,go as ao,xo as ap,bo as aq,Yt as ar,Cn as as,Xr as at,Eo as au,mo as av,Ln as aw,Gr as ax,Po as ay,pe as az,gt as b,ts as b0,No as b1,Go as b2,as as b3,ae as b4,yo as b5,So as b6,zo as b7,Do as b8,Hs as c,ps as d,R as e,jn as f,Qr as g,ke as h,j as i,me as j,Ce as k,$e as l,Kr as m,es as n,nt as o,Gt as p,To as q,ue as r,ys as s,As as t,$ as u,Fo as v,Qt as w,ya as x,_ as y,Na as z};
