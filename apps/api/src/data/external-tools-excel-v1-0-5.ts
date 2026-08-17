/**
 * AI工具完整清单-1.0.5.xlsx · 工具目录（A1:M90）的后端快照。
 *
 * 规则：同名产品合并；toolTypeIds 保留多分类；externalCategoryRanks 保留分类内排序。
 * 请通过源 Excel 重新生成，不要手工维护条目内容。
 */
export const EXTERNAL_TOOLS_EXCEL_VERSION = '1.0.5';
export const EXTERNAL_TOOLS_EXCEL = [
  {
    "name": "ChatGPT",
    "company": "OpenAI",
    "region": "overseas",
    "toolTypeId": "general",
    "toolTypeIds": [
      "general",
      "knowledge",
      "ppt",
      "search"
    ],
    "toolTypeLabels": [
      "通用AI助手",
      "知识管理与写作",
      "演示与文档",
      "AI搜索与研究"
    ],
    "externalCategoryRanks": {
      "general": 1,
      "knowledge": 1,
      "ppt": 2,
      "search": 1
    },
    "externalSortOrder": 1,
    "externalSortRank": 1,
    "cardSummary": "把提问、文件、数据与多模态素材汇成可直接交付的办公成果。",
    "productIntro": "ChatGPT 是 OpenAI 推出的官方 AI 助手，产品把日常对话、工作任务与 Codex 技术工作整合到同一入口。用户既可以用它获得解释和灵感，也可以把一个明确目标连同文件、数据或图片交给它继续完成。\nChatGPT 支持文字、语音、图片和文件输入，并覆盖联网搜索、深度研究、数据分析、写作与图像创作。多轮对话会保留任务上下文，方便围绕同一成果持续追问、修改和补充材料。\n在工作场景中，它可以从头到尾创建或编辑文档、演示、表格、图表、PDF 与图片，适合复杂任务拆解、跨文档研究、内容起草和团队协作。",
    "bestFor": "复杂任务拆解、跨文档研究、内容起草与团队协作",
    "coreCapabilities": [
      "深度研究",
      "文件与数据分析",
      "图像与语音",
      "项目工作区"
    ],
    "homepageUrl": "https://chatgpt.com/",
    "docsUrl": "https://help.openai.com/en/collections/3742473-chatgpt",
    "mediaUrl": "https://openai.com/chatgpt/overview/",
    "icon": "fa-comments"
  },
  {
    "name": "Claude",
    "company": "Anthropic",
    "region": "overseas",
    "toolTypeId": "general",
    "toolTypeIds": [
      "general"
    ],
    "toolTypeLabels": [
      "通用AI助手"
    ],
    "externalCategoryRanks": {
      "general": 2
    },
    "externalSortOrder": 5,
    "externalSortRank": 2,
    "cardSummary": "读懂复杂长文档，在严谨分析、高质量写作和结构化成果中保持连贯。",
    "productIntro": "Claude 是 Anthropic 推出的通用 AI 助手，产品以复杂长文档理解、严谨分析、高质量写作和代码协作为主要特点。它能在较长任务中保持上下文连贯，并把分析结果继续组织成结构化成果。\nClaude 支持文件阅读、网页研究、代码执行与 Artifacts。Artifacts 可把生成的文档、代码、图表或交互内容放在独立工作区中持续编辑，适合把一次问答扩展成可审阅、可修改的交付件。\n它更适合策略材料、长报告审阅、跨文档比较、正式写作与工程任务。使用时可以先要求它解释材料结构与证据，再进入写作或制作阶段，以减少长任务中的方向偏差。",
    "bestFor": "长文档审阅、策略分析、代码协作与高质量写作",
    "coreCapabilities": [
      "长上下文",
      "Artifacts",
      "网页研究",
      "代码执行"
    ],
    "homepageUrl": "https://claude.ai/",
    "docsUrl": "https://docs.anthropic.com/en/docs/about-claude/models/overview",
    "mediaUrl": "https://www.anthropic.com/claude",
    "icon": "fa-comments"
  },
  {
    "name": "DeepSeek",
    "company": "深度求索",
    "region": "domestic",
    "toolTypeId": "general",
    "toolTypeIds": [
      "general"
    ],
    "toolTypeLabels": [
      "通用AI助手"
    ],
    "externalCategoryRanks": {
      "general": 3
    },
    "externalSortOrder": 6,
    "externalSortRank": 3,
    "cardSummary": "用深度推理处理逻辑分析、代码理解与需要分步判断的复杂问题。",
    "productIntro": "DeepSeek 是深度求索推出的通用 AI 产品，以深度推理、代码能力和中文任务处理见长。用户可以在普通对话与深度思考之间选择，并结合联网搜索或文件上传处理复杂问题。\n产品适合需要分步骤判断的逻辑分析、代码理解、学习辅导和技术问答。它也提供开放 API，便于开发者把模型能力接入应用或内部工作流。\nDeepSeek 的核心价值是以较低使用门槛提供较强推理能力。使用时应要求展示推理依据、核对联网来源，并对代码、安全建议和重要计算结果进行独立验证。",
    "bestFor": "中文推理、代码生成、学习辅导与日常问答",
    "coreCapabilities": [
      "深度思考",
      "联网搜索",
      "文件上传",
      "开放 API"
    ],
    "homepageUrl": "https://chat.deepseek.com/",
    "docsUrl": "https://api-docs.deepseek.com/",
    "mediaUrl": "https://www.deepseek.com/",
    "icon": "fa-comments"
  },
  {
    "name": "Kimi",
    "company": "月之暗面",
    "region": "domestic",
    "toolTypeId": "ppt",
    "toolTypeIds": [
      "ppt",
      "general"
    ],
    "toolTypeLabels": [
      "演示与文档",
      "通用AI助手"
    ],
    "externalCategoryRanks": {
      "ppt": 1,
      "general": 2
    },
    "externalSortOrder": 7,
    "externalSortRank": 1,
    "cardSummary": "快速消化长文档和网页资料，提炼重点、形成观点并完成中文写作。",
    "productIntro": "Kimi 是月之暗面推出的通用AI 助手，内置独立 Kimi Slides 智能 PPT 生成模块，支持超大上下文文档解析，内容逻辑优先，兼顾研究分析与演示文稿生成。\nKimi支持超长文档理解、联网搜索、网页与文件解析和办公写作，擅长复杂报告结构化拆解，逻辑层级清晰，适合大量文字提炼精简。输入主题 / 上传 Word/PDF 一键生成整套幻灯片，在线编辑，导出标准 PPTX。\n用户可以上传报告、合同、论文或多份材料，围绕指定内容追问、对比和提炼结论；也可以从搜索结果继续生成摘要、提纲、文章或汇报素材。\nKimi可用于行业研究、学士研究、项目报告、数据分析等；长文档汇总提炼PPT生成。",
    "bestFor": "中文资料研究、长文档总结、报告与演示内容准备",
    "coreCapabilities": [
      "长文档",
      "深度搜索",
      "文件解析",
      "办公写作"
    ],
    "homepageUrl": "https://www.kimi.com/",
    "docsUrl": "https://platform.moonshot.cn/docs/intro",
    "mediaUrl": "https://www.kimi.com/",
    "icon": "fa-file-powerpoint"
  },
  {
    "name": "Perplexity",
    "company": "Perplexity AI",
    "region": "overseas",
    "toolTypeId": "search",
    "toolTypeIds": [
      "search"
    ],
    "toolTypeLabels": [
      "AI搜索与研究"
    ],
    "externalCategoryRanks": {
      "search": 3
    },
    "externalSortOrder": 9,
    "externalSortRank": 3,
    "cardSummary": "把开放网络搜索变成带来源、可追溯、可继续深挖的研究答案。",
    "productIntro": "Perplexity 是强大的AI搜索引擎与深度研究工具。用户用自然语言提出问题后，Perplexity会自动检索全网信息、深度研究并生成答案。\nPerplexity 支持深度搜索、记住上下文支持连续追问、研究分析、支持溯源等能力，用户可以沿某条引用回到原始网页，也可以继续限定时间、地域和比较维度。\nPerplexity 支持深度搜索，适合学术研究、行业竞品研究、市场分析等，学生、研究人员和专业人士能提供强大的支持。",
    "bestFor": "行业扫描、事实核验、竞品研究与带出处的快速问答",
    "coreCapabilities": [
      "来源引用",
      "深度研究",
      "文件空间",
      "Comet 浏览器"
    ],
    "homepageUrl": "https://www.perplexity.ai/",
    "docsUrl": "https://www.perplexity.ai/help-center/",
    "mediaUrl": "https://www.perplexity.ai/hub",
    "icon": "fa-magnifying-glass"
  },
  {
    "name": "秘塔AI搜索",
    "company": "秘塔科技",
    "region": "domestic",
    "toolTypeId": "search",
    "toolTypeIds": [
      "search"
    ],
    "toolTypeLabels": [
      "AI搜索与研究"
    ],
    "externalCategoryRanks": {
      "search": 3
    },
    "externalSortOrder": 10,
    "externalSortRank": 3,
    "cardSummary": "提供中文结构化答案、来源追溯和专题研究的 AI 搜索产品。",
    "productIntro": "秘塔AI搜索 是 秘塔科技 推出的专业AI搜索引擎。聚焦信息检索真实性，强溯源、结构化输出及创意生成等功能。\n支持全网搜索、来源追溯、结构化输出多种格式内容、上传文件进行解读，支持多学科知识学习、图像及视频生成等。\n秘塔AI擅长全网搜索、文献及资料搜索、报告、学术及行业信息梳理。用户可根据需求搜索相关文献及溯源，梳理相关材料并结构化输出。",
    "bestFor": "中文资料检索、报告提纲、学术与行业信息梳理",
    "coreCapabilities": [
      "结构化答案",
      "来源追溯",
      "专题模式",
      "中文优化"
    ],
    "homepageUrl": "https://metaso.cn/",
    "docsUrl": "https://metaso.cn/",
    "mediaUrl": "https://metaso.cn/",
    "icon": "fa-magnifying-glass"
  },
  {
    "name": "NotebookLM",
    "company": "Google",
    "region": "overseas",
    "toolTypeId": "ppt",
    "toolTypeIds": [
      "ppt",
      "knowledge"
    ],
    "toolTypeLabels": [
      "演示与文档",
      "知识管理与写作"
    ],
    "externalCategoryRanks": {
      "ppt": 5,
      "knowledge": 3
    },
    "externalSortOrder": 11,
    "externalSortRank": 3,
    "cardSummary": "只围绕指定资料阅读、提问与生成内容，让每个结论都能回到来源。",
    "productIntro": "NotebookLM 是 Google 推出的 AI 研究笔记本，所有问答与内容生成都围绕用户指定的来源展开。用户可导入文档、网页、音频或视频资料，再进行提问、比较与主题研究。\n产品会在回答中标注来源引用，并可基于资料生成音频或视频概览、演示文稿、学习指南、简报等衍生内容。\nNotebookLM适合政策研读、课程学习、专题研究和多资料复盘。其差异在于答案边界清晰且能回到原文，适合需要证据链而非泛化聊天的知识任务。",
    "bestFor": "长资料学习、政策研读、专题研究、音视频资料理解与知识复盘",
    "coreCapabilities": [
      "来源引用",
      "Deep Research",
      "音视频概览",
      "学习指南"
    ],
    "homepageUrl": "https://notebooklm.google/",
    "docsUrl": "https://support.google.com/notebooklm/",
    "mediaUrl": "https://blog.google/innovation-and-ai/products/notebooklm/",
    "icon": "fa-file-powerpoint"
  },
  {
    "name": "Notion AI",
    "company": "Notion",
    "region": "overseas",
    "toolTypeId": "knowledge",
    "toolTypeIds": [
      "knowledge"
    ],
    "toolTypeLabels": [
      "知识管理与写作"
    ],
    "externalCategoryRanks": {
      "knowledge": 5
    },
    "externalSortOrder": 13,
    "externalSortRank": 5,
    "cardSummary": "嵌入团队知识库的写作、搜索、会议记录与任务执行智能体。",
    "productIntro": "Notion AI 是 内置在Notion 内的知识管理与学习产品。嵌入团队知识库的写作、搜索、会议记录与任务执行智能体。\n主要能力包括企业搜索、Notion Agent、会议记录、数据库自动填充。它围绕用户选定的资料空间组织内容，通过导入、关联、检索与问答，把分散信息转化为可以持续复用的知识。\n在实际工作中，它更适合团队知识沉淀、跨空间搜索、文档生成与项目推进。",
    "bestFor": "团队知识沉淀、跨空间搜索、文档生成与项目推进",
    "coreCapabilities": [
      "企业搜索",
      "Notion Agent",
      "会议记录",
      "数据库自动填充"
    ],
    "homepageUrl": "https://www.notion.com/product/ai",
    "docsUrl": "https://www.notion.com/help/category/notion-ai",
    "mediaUrl": "https://www.notion.com/product/ai",
    "icon": "fa-book"
  },
  {
    "name": "Gamma",
    "company": "Gamma Tech",
    "region": "overseas",
    "toolTypeId": "ppt",
    "toolTypeIds": [
      "ppt"
    ],
    "toolTypeLabels": [
      "演示与文档"
    ],
    "externalCategoryRanks": {
      "ppt": 1
    },
    "externalSortOrder": 14,
    "externalSortRank": 1,
    "cardSummary": "把主题或已有材料快速组织成结构清晰、可编辑的演示与网页。",
    "productIntro": "Gamma 是面向演示、文档和轻量网页的 AI 内容制作工具。用户可以从一句主题、结构化提纲或已有材料开始，快速得到带内容层级与视觉主题的可编辑成稿。\n产品把内容生成、卡片式排版、主题样式、媒体嵌入、协作分享和网页发布放在同一工作流中，适合提案初稿、培训材料、项目汇报及无需开发的专题页面。\nGamma 的优势是缩短从文字结构到可展示页面的时间；正式汇报前仍需逐页核对逻辑、数字和品牌规范。",
    "bestFor": "提案初稿、培训材料、项目汇报与轻量专题网页",
    "coreCapabilities": [
      "一键成稿",
      "主题排版",
      "网页发布",
      "协作分享"
    ],
    "homepageUrl": "https://gamma.app/",
    "docsUrl": "https://help.gamma.app/",
    "mediaUrl": "https://gamma.app/products/presentations",
    "icon": "fa-file-powerpoint"
  },
  {
    "name": "Midjourney",
    "company": "Midjourney, Inc.",
    "region": "overseas",
    "toolTypeId": "video",
    "toolTypeIds": [
      "video",
      "image"
    ],
    "toolTypeLabels": [
      "视频与数字人",
      "图像与设计"
    ],
    "externalCategoryRanks": {
      "video": 4,
      "image": 2
    },
    "externalSortOrder": 15,
    "externalSortRank": 2,
    "cardSummary": "以视觉质量、风格控制和创意探索见长的 AI 图像生成平台。",
    "productIntro": "Midjourney 是 Midjourney, Inc. 推出的AI图像生成工具。以视觉质量、风格控制和创意探索见长的 AI 图像生成平台。\nMidjourney支持文本生图、图像编辑、风格参考、个性化。它用文字提示、参考图或局部编辑指令生成视觉方案，并支持围绕构图、风格、主体与细节持续修改。\n在实际工作中，它更适合概念视觉、海报氛围、创意探索、品牌灵感、影视分镜氛围样片、品牌视觉短视频。",
    "bestFor": "概念视觉、海报氛围、创意探索和品牌灵感",
    "coreCapabilities": [
      "文本生图",
      "图像编辑",
      "风格参考",
      "个性化"
    ],
    "homepageUrl": "https://www.midjourney.com/",
    "docsUrl": "https://docs.midjourney.com/",
    "mediaUrl": "https://www.midjourney.com/explore",
    "icon": "fa-video"
  },
  {
    "name": "即梦AI",
    "company": "字节跳动",
    "region": "domestic",
    "toolTypeId": "video",
    "toolTypeIds": [
      "video",
      "image"
    ],
    "toolTypeLabels": [
      "视频与数字人",
      "图像与设计"
    ],
    "externalCategoryRanks": {
      "video": 2,
      "image": 2
    },
    "externalSortOrder": 17,
    "externalSortRank": 2,
    "cardSummary": "面向中文创作场景的图片生成、智能画布与视频创作平台。",
    "productIntro": "即梦AI 是字节跳动推出的AI图像与AI视频创作平台。面向中文创作场景的图片生成、视频生成及数字人等。\n即梦AI支持图片生成、视频生成、音乐生成、数字人、支持Agent模式智能创作与Octo人机同屏协作。用户输入想法可自动编排多步骤任务\n在实际工作中，它更适合中文海报、电商视觉、社媒配图和创意短视频。自媒体口播短视频、短剧片段创作；数字人日常口播内容产出。",
    "bestFor": "中文海报、电商视觉、社媒配图和创意短视频",
    "coreCapabilities": [
      "中文生图",
      "智能画布",
      "局部编辑",
      "图生视频"
    ],
    "homepageUrl": "https://jimeng.jianying.com/",
    "docsUrl": "https://jimeng.jianying.com/",
    "mediaUrl": "https://jimeng.jianying.com/",
    "icon": "fa-video"
  },
  {
    "name": "Runway",
    "company": "Runway AI",
    "region": "overseas",
    "toolTypeId": "video",
    "toolTypeIds": [
      "video"
    ],
    "toolTypeLabels": [
      "视频与数字人"
    ],
    "externalCategoryRanks": {
      "video": 1
    },
    "externalSortOrder": 19,
    "externalSortRank": 1,
    "cardSummary": "覆盖生成、编辑与镜头控制的专业 AI 视频创作平台。",
    "productIntro": "Runway 是 Runway AI 推出的视频与数字人产品。覆盖生成、编辑与镜头控制的专业 AI 视频创作平台。\nRunway支持文生视频、图生视频、镜头控制、视频编辑。它把脚本、关键帧、镜头运动、人物表现与后期处理连接起来，用更短链路生成和修改视频内容。\n在实际工作中，它更适合创意短片、分镜预演、广告素材和视频编辑。",
    "bestFor": "创意短片、分镜预演、广告素材和视频编辑",
    "coreCapabilities": [
      "文生视频",
      "图生视频",
      "镜头控制",
      "视频编辑"
    ],
    "homepageUrl": "https://runwayml.com/",
    "docsUrl": "https://help.runwayml.com/",
    "mediaUrl": "https://runway.com/research/introducing-runway-gen-4.5",
    "icon": "fa-video"
  },
  {
    "name": "ElevenLabs",
    "company": "ElevenLabs",
    "region": "overseas",
    "toolTypeId": "audio",
    "toolTypeIds": [
      "audio"
    ],
    "toolTypeLabels": [
      "音频与语音"
    ],
    "externalCategoryRanks": {
      "audio": 1
    },
    "externalSortOrder": 20,
    "externalSortRank": 1,
    "cardSummary": "提供自然语音合成、配音、声音克隆和语音识别的一体化平台。",
    "productIntro": "ElevenLabs 是 ElevenLabs 推出的文本转语音（TTS）平台。提供自然语音合成、配音、声音克隆和语音识别的一体化平台。\nElevenLabs 支持语音合成、声音克隆、语音识别、多语言配音。支持长文本连续朗读、多人对话生成、流式低延迟输出，适配虚拟人实时配音。\nElevenLabs 适合多语言配音、播客、有声内容、广告配音、产品语音交互。",
    "bestFor": "多语言配音、播客、有声内容和产品语音交互",
    "coreCapabilities": [
      "语音合成",
      "声音克隆",
      "语音识别",
      "多语言配音"
    ],
    "homepageUrl": "https://elevenlabs.io/",
    "docsUrl": "https://elevenlabs.io/docs/overview",
    "mediaUrl": "https://elevenlabs.io/",
    "icon": "fa-microphone"
  },
  {
    "name": "飞书妙记",
    "company": "飞书",
    "region": "domestic",
    "toolTypeId": "meeting",
    "toolTypeIds": [
      "meeting"
    ],
    "toolTypeLabels": [
      "会议与协作"
    ],
    "externalCategoryRanks": {
      "meeting": 1
    },
    "externalSortOrder": 21,
    "externalSortRank": 1,
    "cardSummary": "将会议音视频自动转写、总结并沉淀为可检索协作文档。",
    "productIntro": "飞书妙记是飞书原生内置音视频智能记录工具，深度嵌入飞书会议、飞书整套办公协同体系；依托飞书大模型，生态内一体化会议纪要方案。\n飞书妙记支持音视频自动转写、发言人区分、自动生成结构化纪要、多语言实时翻译，纪要直接存入飞书文档、飞书知识库。\n在实际工作中，它更适合全组织统一使用飞书的企业，会议纪要、访谈整理、培训复盘与异步信息同步；内部培训、跨部门同步；重视会议 - 文档 - 任务一体化协作。",
    "bestFor": "会议纪要、访谈整理、培训复盘与异步信息同步",
    "coreCapabilities": [
      "实时转写",
      "智能总结",
      "重点标记",
      "协作分享"
    ],
    "homepageUrl": "https://www.feishu.cn/product/minutes",
    "docsUrl": "https://www.feishu.cn/hc/zh-CN/categories-detail?categoryId=720504767423",
    "mediaUrl": "https://www.feishu.cn/product/minutes",
    "icon": "fa-users"
  },
  {
    "name": "Cursor",
    "company": "Anysphere",
    "region": "overseas",
    "toolTypeId": "code",
    "toolTypeIds": [
      "code"
    ],
    "toolTypeLabels": [
      "编程开发"
    ],
    "externalCategoryRanks": {
      "code": 1
    },
    "externalSortOrder": 22,
    "externalSortRank": 1,
    "cardSummary": "以代码库理解、智能体编程和审查为核心的 AI 代码编辑器。",
    "productIntro": "Cursor 是 Anysphere推出的AI代码编辑器，支持Python、Java、C#、JavaScript等多语言，通过快捷键操作，实现代码自动生成、编辑、讨论等功能，显著提升开发效率。\nCursor 支持代码生成、智能补全及检测与修复。Cursor Agent能在任何设备上无缝衔接地使用 AI 编程代理。可以并行运行多个 Agent 任务。\n在实际工作中，它更适合独立开发者、全栈工程师、前端项目；新项目搭建、中型项目多文件重构；原型快速开发；在同一个编辑器完成 “需求→编码→调试” 整套流程。",
    "bestFor": "跨文件开发、代码重构、调试和从需求到实现",
    "coreCapabilities": [
      "代码智能体",
      "代码库检索",
      "多文件编辑",
      "自动审查"
    ],
    "homepageUrl": "https://cursor.com/",
    "docsUrl": "https://docs.cursor.com/",
    "mediaUrl": "https://cursor.com/features",
    "icon": "fa-code"
  },
  {
    "name": "通义灵码",
    "company": "阿里云",
    "region": "domestic",
    "toolTypeId": "code",
    "toolTypeIds": [
      "code"
    ],
    "toolTypeLabels": [
      "编程开发"
    ],
    "externalCategoryRanks": {
      "code": 1
    },
    "externalSortOrder": 23,
    "externalSortRank": 1,
    "cardSummary": "面向中文研发场景的代码补全、问答、智能体与企业知识协作工具。",
    "productIntro": "通义灵码 是 阿里云基于通义代码大模型打造的企业级 IDE 代码助手，形态包含 VS Code、JetBrains 全系列插件 + 独立 IDE，面向专业研发团队，主打后端工程、企业规范化开发。\n产品支持行间代码续写、仓库级 RAG 理解，学习企业私有代码库。Java、Go、SpringCloud、阿里云 SDK 专项优化。单元测试生成、故障诊断、SQL 脚本、接口文档自动输出。多角色 AI 专家团并行完成复杂研发任务。\n在实际工作中，通义灵码支持Java/Go 后端、云原生、微服务开发团队日常编码，基于阿里云生态业务系统开发，快速调用云产品 SDK。",
    "bestFor": "中文代码问答、企业研发、单测生成与工程任务执行",
    "coreCapabilities": [
      "代码补全",
      "编程智能体",
      "企业知识",
      "多 IDE 支持"
    ],
    "homepageUrl": "https://tongyi.aliyun.com/lingma/",
    "docsUrl": "https://help.aliyun.com/zh/lingma/",
    "mediaUrl": "https://tongyi.aliyun.com/lingma/",
    "icon": "fa-code"
  },
  {
    "name": "扣子 Coze",
    "company": "字节跳动",
    "region": "domestic",
    "toolTypeId": "agent",
    "toolTypeIds": [
      "agent"
    ],
    "toolTypeLabels": [
      "智能体"
    ],
    "externalCategoryRanks": {
      "agent": 1
    },
    "externalSortOrder": 24,
    "externalSortRank": 1,
    "cardSummary": "用于搭建、发布和运营 AI 智能体与工作流的低代码平台。",
    "productIntro": "扣子 Coze 是 字节跳动 推出的智能体与工作流开发协作平台。用于搭建、发布和运营 AI 智能体与工作流的低代码平台。\n扣子 Coze支持智能体搭建、工作流、知识库。内置 RAG 知识库、长期记忆、多 Agent 协作。支持发布网页机器人、API、嵌入第三方系统；多模型自由切换。\n在实际工作中，它更适合快速搭建行业机器人、知识问答、内容自动化和轻量业务助手。",
    "bestFor": "部门机器人、知识问答、内容自动化和轻量业务助手",
    "coreCapabilities": [
      "智能体搭建",
      "工作流",
      "知识库",
      "多渠道发布"
    ],
    "homepageUrl": "https://www.coze.cn/",
    "docsUrl": "https://www.coze.cn/open/docs",
    "mediaUrl": "https://www.coze.cn/",
    "icon": "fa-robot"
  },
  {
    "name": "Gemini",
    "company": "Google",
    "region": "overseas",
    "toolTypeId": "knowledge",
    "toolTypeIds": [
      "knowledge",
      "ppt",
      "search",
      "general"
    ],
    "toolTypeLabels": [
      "知识管理与写作",
      "演示与文档",
      "AI搜索与研究",
      "通用AI助手"
    ],
    "externalCategoryRanks": {
      "knowledge": 2,
      "ppt": 4,
      "search": 2,
      "general": 3
    },
    "externalSortOrder": 25,
    "externalSortRank": 2,
    "cardSummary": "连接 Google 搜索与办公生态，在同一工作流中理解文字、图片、视频和长资料。",
    "productIntro": "Gemini 是 Google 推出的多模态 AI 助手，核心优势是把 Google 搜索、个人或团队资料与 Workspace 办公生态连接到同一对话流程。它可以同时理解文字、图片、音频、视频、代码和长文档。\nGemini支持超长上下文、多模态解析（截图、表格、图纸、视频解读），支持联网实时检索信息，原生联动 Google 生态，直接读写云端文档；擅长技术内容、数据分析、多语种写作等\nGemini 更适合Google 生态重度用户、文档撰写、多语种材料、截图 、 视频素材进行内容整理；联网辅助调研写作。且能够在 Google 信息与生产力工具之间减少切换，并让研究内容继续进入写作与制作环节。",
    "bestFor": "文档撰写、资料搜索、多模态素材理解与整理，Google生态文档管理",
    "coreCapabilities": [
      "多模态理解",
      "Deep Research",
      "Google 应用连接"
    ],
    "homepageUrl": "https://gemini.google.com/",
    "docsUrl": "https://support.google.com/gemini/",
    "mediaUrl": "https://deepmind.google/models/gemini/",
    "icon": "fa-book"
  },
  {
    "name": "Grok",
    "company": "xAI",
    "region": "overseas",
    "toolTypeId": "general",
    "toolTypeIds": [
      "general"
    ],
    "toolTypeLabels": [
      "通用AI助手"
    ],
    "externalCategoryRanks": {
      "general": 4
    },
    "externalSortOrder": 29,
    "externalSortRank": 4,
    "cardSummary": "强调实时信息、推理和原生工具调用的通用 AI 助手。",
    "productIntro": "Grok 是 xAI 推出的通用AI助手产品。强调实时信息、推理和原生工具调用的通用 AI 助手。\nGrok提供实时搜索、深度推理、多模态、代码能力。实时接入 X 社交数据流，擅长热点舆情、互联网话题分析。响应速度快，适合头脑风暴、观点辩论、时事评论。\n在实际工作中，它更适合热点信息追踪、快速推理、代码和联网资料综合。适合需要新鲜互联网实时热点素材的创作者。",
    "bestFor": "热点信息追踪、快速推理、代码和联网资料综合",
    "coreCapabilities": [
      "实时搜索",
      "深度推理",
      "多模态",
      "代码能力"
    ],
    "homepageUrl": "https://grok.com/",
    "docsUrl": "https://docs.x.ai/docs",
    "mediaUrl": "https://x.ai/news/grok-4-5",
    "icon": "fa-comments"
  },
  {
    "name": "豆包",
    "company": "字节跳动",
    "region": "domestic",
    "toolTypeId": "knowledge",
    "toolTypeIds": [
      "knowledge",
      "ppt",
      "general"
    ],
    "toolTypeLabels": [
      "知识管理与写作",
      "演示与文档",
      "通用AI助手"
    ],
    "externalCategoryRanks": {
      "knowledge": 1,
      "ppt": 2,
      "general": 1
    },
    "externalSortOrder": 30,
    "externalSortRank": 1,
    "cardSummary": "用低门槛对话完成中文问答、写作、图片创作和语音交流。",
    "productIntro": "豆包是字节跳动推出的中文多模态 AI 助手，覆盖对话问答、联网搜索、文件阅读、中文写作、图片创作与实时语音交流，强调低门槛和日常使用体验。\n用户可以直接输入问题，也可以上传文档或图片继续提问；在内容创作场景中，可从文案构思延伸到视觉生成，在移动场景中则可通过语音持续交流。\n它更适合中文日常办公、学习答疑、社交内容与轻量创作。复杂研究或正式材料需要补充可靠来源、明确结构，并对自动生成的事实和图像细节进行人工检查。",
    "bestFor": "中文日常办公、内容创作、学习答疑与语音交流",
    "coreCapabilities": [
      "联网搜索",
      "文件问答",
      "图像创作",
      "实时语音"
    ],
    "homepageUrl": "https://www.doubao.com/",
    "docsUrl": "https://www.volcengine.com/docs/82379",
    "mediaUrl": "https://research.doubao.com/zh/blog/seed-2-0-official-launch",
    "icon": "fa-book"
  },
  {
    "name": "Qwen",
    "company": "阿里云",
    "region": "domestic",
    "toolTypeId": "general",
    "toolTypeIds": [
      "general"
    ],
    "toolTypeLabels": [
      "通用AI助手"
    ],
    "externalCategoryRanks": {
      "general": 4
    },
    "externalSortOrder": 33,
    "externalSortRank": 4,
    "cardSummary": "统一处理文字、图像、文档和代码，覆盖多类型中文工作任务。",
    "productIntro": "Qwen 是阿里云推出的通用多模态 AI 助手，能够处理文字、图片、文档、代码与多种中文工作任务，并与通义系列模型和企业服务生态衔接。\n产品可用于问答、写作、资料理解、视觉分析和编程协作，用户可以围绕同一任务混合使用文本与文件输入，再通过多轮修改形成所需结果。\nQwen 的优势是覆盖任务类型广，并兼顾个人使用与开发接入。正式工作中应明确输出格式和数据边界，对关键事实、代码和专业结论进行复核。",
    "bestFor": "中文办公、多模态理解、代码与企业级模型应用",
    "coreCapabilities": [
      "多模态",
      "深度研究",
      "代码",
      "开放模型生态"
    ],
    "homepageUrl": "https://chat.qwen.ai/",
    "docsUrl": "https://qwen.readthedocs.io/",
    "mediaUrl": "https://qwen.ai/blog?id=qwen3.8",
    "icon": "fa-comments"
  },
  {
    "name": "纳米AI",
    "company": "360 集团",
    "region": "domestic",
    "toolTypeId": "search",
    "toolTypeIds": [
      "search"
    ],
    "toolTypeLabels": [
      "AI搜索与研究"
    ],
    "externalCategoryRanks": {
      "search": 2
    },
    "externalSortOrder": 34,
    "externalSortRank": 2,
    "cardSummary": "集合搜索、阅读、创作与多智能体协作的AI产品。",
    "productIntro": "纳米AI 是 360 集团 推出的超级AI搜索工具。集合搜索、阅读、创作与多智能体协作的AI产品。\n产品主要覆盖AI 搜索、多智能体、内容创作等。通过问答、学习、写作和创作，帮助用户解决各种问题。通过强大的多智能体协作，完成复杂任务的拆解与执行。\n在实际工作中，它更适合网页搜索、资料总结、内容创作等。用户可以从明确问题、已有文件或素材开始，围绕同一结果持续补充上下文和修改要求。",
    "bestFor": "中文网页搜索、热点综述、资料总结与多模型协同",
    "coreCapabilities": [
      "AI 搜索",
      "多智能体",
      "网页总结",
      "内容创作"
    ],
    "homepageUrl": "https://www.n.cn/",
    "docsUrl": "https://www.n.cn/",
    "mediaUrl": "https://www.n.cn/",
    "icon": "fa-magnifying-glass"
  },
  {
    "name": "得到大脑",
    "company": "得到",
    "region": "domestic",
    "toolTypeId": "knowledge",
    "toolTypeIds": [
      "knowledge"
    ],
    "toolTypeLabels": [
      "知识管理与写作"
    ],
    "externalCategoryRanks": {
      "knowledge": 3
    },
    "externalSortOrder": 35,
    "externalSortRank": 3,
    "cardSummary": "将记录、知识输入和 AI 问答结合的个人知识管理工具。",
    "productIntro": "得到大脑 是 得到 推出的知识管理与学习产品。将记录、知识输入和 AI 问答结合的个人知识管理工具。\n主要能力包括AI 笔记、知识问答、内容整理、多端同步。支持碎片化记录，自动整理提炼关键信息。\n在实际工作中，它更适合灵感记录、个人知识库、阅读笔记和跨笔记问答。",
    "bestFor": "灵感记录、个人知识库、阅读笔记和跨笔记问答",
    "coreCapabilities": [
      "AI 笔记",
      "知识问答",
      "内容整理",
      "多端同步"
    ],
    "homepageUrl": "https://www.biji.com/",
    "docsUrl": "https://www.biji.com/",
    "mediaUrl": "https://www.biji.com/",
    "icon": "fa-book"
  },
  {
    "name": "Grammarly",
    "company": "Grammarly",
    "region": "overseas",
    "toolTypeId": "knowledge",
    "toolTypeIds": [
      "knowledge"
    ],
    "toolTypeLabels": [
      "知识管理与写作"
    ],
    "externalCategoryRanks": {
      "knowledge": 6
    },
    "externalSortOrder": 36,
    "externalSortRank": 6,
    "cardSummary": "覆盖语法、语气、改写与品牌风格控制的英文沟通助手。",
    "productIntro": "Grammarly 是 Grammarly 推出的写作与翻译产品。覆盖语法、语气、改写与品牌风格控制的英文沟通助手。\n主要能力包括语法校对、语气建议、生成式改写、风格指南。它将起草、改写、翻译、润色和风格统一整合到连续编辑流程中，用户可以围绕同一文本反复迭代。对语言质量、术语一致性、品牌语气或多语言本地化提供更细的控制。\n在实际工作中，它更适合英文邮件、报告润色、品牌语气统一与跨应用写作。",
    "bestFor": "英文邮件、报告润色、品牌语气统一与跨应用写作",
    "coreCapabilities": [
      "语法校对",
      "语气建议",
      "生成式改写",
      "风格指南"
    ],
    "homepageUrl": "https://www.grammarly.com/",
    "docsUrl": "https://support.grammarly.com/",
    "mediaUrl": "https://www.grammarly.com/ai",
    "icon": "fa-book"
  },
  {
    "name": "Beautiful.ai",
    "company": "Beautiful.ai",
    "region": "overseas",
    "toolTypeId": "ppt",
    "toolTypeIds": [
      "ppt"
    ],
    "toolTypeLabels": [
      "演示与文档"
    ],
    "externalCategoryRanks": {
      "ppt": 3
    },
    "externalSortOrder": 37,
    "externalSortRank": 3,
    "cardSummary": "用智能版式和品牌控制快速生成专业演示文稿。",
    "productIntro": "Beautiful.ai 是 Beautiful.ai 推出的演示与文档产品。用智能版式和品牌控制快速生成专业演示文稿。\nBeautiful.ai 支持DesignerBot、智能版式、品牌控制、团队模板。它从主题、提纲或已有材料出发，协助完成内容结构、页面排版、视觉表达与可编辑文件输出。\n在实际工作中，它更适合标准化商业演示、销售提案、团队模板与快速改版。",
    "bestFor": "标准化商业演示、销售提案、团队模板与快速改版",
    "coreCapabilities": [
      "DesignerBot",
      "智能版式",
      "品牌控制",
      "团队模板"
    ],
    "homepageUrl": "https://www.beautiful.ai/",
    "docsUrl": "https://support.beautiful.ai/",
    "mediaUrl": "https://www.beautiful.ai/ai-presentations",
    "icon": "fa-file-powerpoint"
  },
  {
    "name": "WPS AI",
    "company": "金山办公",
    "region": "domestic",
    "toolTypeId": "ppt",
    "toolTypeIds": [
      "ppt"
    ],
    "toolTypeLabels": [
      "演示与文档"
    ],
    "externalCategoryRanks": {
      "ppt": 3
    },
    "externalSortOrder": 38,
    "externalSortRank": 3,
    "cardSummary": "在文字、表格和演示中直接调用 AI，缩短从材料到成稿的链路。",
    "productIntro": "WPS AI 是嵌入 WPS 文字、表格、演示和 PDF 工作流的办公 AI。用户无需离开正在编辑的文件，就可以调用 AI 进行阅读、写作、数据处理和演示内容生成。\n产品的主要价值是把 AI 放到具体文档上下文中：在文字中起草与改写，在表格中分析和生成公式，在演示中搭建结构与页面，在 PDF 中总结并提问。\n它更适合已有办公材料的快速加工与跨格式流转。正式交付前应保留原始文件，检查公式、图表、版式和引用，避免自动修改覆盖重要内容。",
    "bestFor": "中文文档起草、PPT 生成、PDF 阅读与表格处理",
    "coreCapabilities": [
      "文档写作",
      "智能 PPT",
      "PDF 问答",
      "表格分析"
    ],
    "homepageUrl": "https://ai.wps.cn/",
    "docsUrl": "https://ai.wps.cn/",
    "mediaUrl": "https://ai.wps.cn/",
    "icon": "fa-file-powerpoint"
  },
  {
    "name": "讯飞智文",
    "company": "科大讯飞",
    "region": "domestic",
    "toolTypeId": "ppt",
    "toolTypeIds": [
      "ppt"
    ],
    "toolTypeLabels": [
      "演示与文档"
    ],
    "externalCategoryRanks": {
      "ppt": 4
    },
    "externalSortOrder": 39,
    "externalSortRank": 4,
    "cardSummary": "从主题或长文档生成中文演示、长文和结构化内容。",
    "productIntro": "讯飞智文 是 科大讯飞 推出的演示与文档产品。从主题或长文档生成中文演示、长文和结构化内容。\n主要能力包括AI 生成 PPT、文档转演示、智能配图等。它从主题、提纲或已有材料出发，协助完成内容结构、页面排版、视觉表达与可编辑文件输出。\n在实际工作中，它更适合中文汇报、培训课件、长文转 PPT 与内容大纲。",
    "bestFor": "中文汇报、培训课件、长文转 PPT 与内容大纲",
    "coreCapabilities": [
      "AI 生成 PPT",
      "文档转演示",
      "智能配图",
      "模板换肤"
    ],
    "homepageUrl": "https://zhiwen.xfyun.cn/",
    "docsUrl": "https://zhiwen.xfyun.cn/",
    "mediaUrl": "https://zhiwen.xfyun.cn/",
    "icon": "fa-file-powerpoint"
  },
  {
    "name": "Qwen Image",
    "company": "阿里云",
    "region": "domestic",
    "toolTypeId": "image",
    "toolTypeIds": [
      "image"
    ],
    "toolTypeLabels": [
      "图像与设计"
    ],
    "externalCategoryRanks": {
      "image": 3
    },
    "externalSortOrder": 40,
    "externalSortRank": 3,
    "cardSummary": "支持中英文文字渲染、图像生成与编辑的通义视觉模型。",
    "productIntro": "Qwen Image 是 阿里云开源商用图像大模型，支持中文文字渲染、图像生成、图文编辑与精准排版。\n主要能力包括超长指令理解，支持复杂多元素布局及信息图。链式图像编辑，多轮修改能够保持主体一致性。写实、插画、UI 草图多风格兼顾。\n在实际工作中，它更适合中文海报、信息图、图像编辑与开放模型工作流。",
    "bestFor": "中文海报、信息图、图像编辑与开放模型工作流",
    "coreCapabilities": [
      "中英文文字",
      "文本生图",
      "图像编辑",
      "开放模型"
    ],
    "homepageUrl": "https://chat.qwen.ai/",
    "docsUrl": "https://qwenlm.github.io/blog/qwen-image/",
    "mediaUrl": "https://qwen.ai/blog?id=qwen-image-3.0",
    "icon": "fa-image"
  },
  {
    "name": "Google Flow / Veo",
    "company": "Google DeepMind",
    "region": "overseas",
    "toolTypeId": "video",
    "toolTypeIds": [
      "video"
    ],
    "toolTypeLabels": [
      "视频与数字人"
    ],
    "externalCategoryRanks": {
      "video": 3
    },
    "externalSortOrder": 41,
    "externalSortRank": 3,
    "cardSummary": "以 Veo 模型和 Flow 创作界面生成高质量、带声音的可控视频。",
    "productIntro": "Google Flow / Veo 是 Google DeepMind 推出的视频与数字人产品。以 Veo 视频生成模型和 Flow 可视化创作界面生成高质量、带声音的可控视频。\n产品能力主要有文生视频、图生视频，原生同步生成音效、环境音、台词音频。Flow 支持时间轴、多镜头拼接、角色跨镜头锁定。\n在实际工作中，它更适合电影化分镜、广告概念、镜头延展和视听一体短片。",
    "bestFor": "电影化分镜、广告概念、镜头延展和视听一体短片",
    "coreCapabilities": [
      "文生视频",
      "原生音频",
      "镜头控制",
      "Flow 工作台"
    ],
    "homepageUrl": "https://labs.google/fx/tools/flow/",
    "docsUrl": "https://support.google.com/labs/answer/16353333",
    "mediaUrl": "https://deepmind.google/models/veo/",
    "icon": "fa-video"
  },
  {
    "name": "HeyGen",
    "company": "HeyGen",
    "region": "overseas",
    "toolTypeId": "video",
    "toolTypeIds": [
      "video"
    ],
    "toolTypeLabels": [
      "视频与数字人"
    ],
    "externalCategoryRanks": {
      "video": 2
    },
    "externalSortOrder": 42,
    "externalSortRank": 2,
    "cardSummary": "从脚本快速生成数字人讲解、多语言翻译与企业视频。",
    "productIntro": "HeyGen 是 HeyGen 推出的AI数字人视频创作平台，致力于简化视频制作过程，让用户能迅速制作出具有专业水准的数字人视频。从脚本快速生成数字人讲解、多语言翻译与企业视频。\nHeyGen能将文本、图像或音频快速转化为高质量视频，基于视频创作Agent，能实现从创意构思到成品视频的一站式制作，HeyGen支持多语言语音克隆、AI 字幕生成等功能。\n在实际工作中，它更适合培训视频、产品演示讲解、多语言本地化和数字人口播。",
    "bestFor": "培训视频、产品讲解、多语言本地化和数字人口播",
    "coreCapabilities": [
      "数字人",
      "语音克隆",
      "视频翻译",
      "品牌模板"
    ],
    "homepageUrl": "https://www.heygen.com/",
    "docsUrl": "https://docs.heygen.com/",
    "mediaUrl": "https://www.heygen.com/blog/announcing-avatar-v",
    "icon": "fa-video"
  },
  {
    "name": "可灵AI",
    "company": "快手",
    "region": "domestic",
    "toolTypeId": "image",
    "toolTypeIds": [
      "image",
      "video"
    ],
    "toolTypeLabels": [
      "图像与设计",
      "视频与数字人"
    ],
    "externalCategoryRanks": {
      "image": 1,
      "video": 1
    },
    "externalSortOrder": 43,
    "externalSortRank": 1,
    "cardSummary": "支持长镜头、角色一致性和多模态控制的国产 AI 视频平台。",
    "productIntro": "可灵AI 是快手自研多模态平台，图像 + 视频双主线，Image 3.0 Omni 模型主打影视级叙事静帧。\n可灵AI 具备强大镜头语言理解，构图、光影、景深、影视氛围感突出。原生支持系列组图批量生成，同一角色跨画面五官、造型稳定，适合分镜、IP 系列图。支持多张参考图融合，超清输出，写实质感。\n在实际工作中，它更适合广告短片、角色动画、图生视频、IP角色系列插图、创意镜头制作。",
    "bestFor": "广告短片、角色动画、图生视频与创意镜头制作",
    "coreCapabilities": [
      "文生视频",
      "图生视频",
      "多镜头叙事",
      "角色一致性"
    ],
    "homepageUrl": "https://app.klingai.com/global/",
    "docsUrl": "https://app.klingai.com/global/quickstart/klingai-video-3-model-user-guide",
    "mediaUrl": "https://app.klingai.com/global/",
    "icon": "fa-image"
  },
  {
    "name": "Suno",
    "company": "Suno, Inc.",
    "region": "overseas",
    "toolTypeId": "audio",
    "toolTypeIds": [
      "audio"
    ],
    "toolTypeLabels": [
      "音频与语音"
    ],
    "externalCategoryRanks": {
      "audio": 2
    },
    "externalSortOrder": 45,
    "externalSortRank": 2,
    "cardSummary": "从歌词、主题或音频灵感生成完整歌曲与伴奏的 AI 音乐平台。",
    "productIntro": "Suno 是 Suno, Inc. 推出的文生音乐平台。从歌词、主题或音频灵感生成完整歌曲与伴奏的 AI 音乐平台。\nSuno 文本生成歌曲、人声与伴奏、风格控制、音轨延展。曲风覆盖流行、摇滚、国风、电子、说唱。能快速产出短视频原创背景音乐。\nSuno 适合概念音乐、广告配乐、歌曲草稿和创意音频实验。",
    "bestFor": "概念音乐、广告配乐、歌曲草稿和创意音频实验",
    "coreCapabilities": [
      "文本生成歌曲",
      "人声与伴奏",
      "风格控制",
      "音轨延展"
    ],
    "homepageUrl": "https://suno.com/",
    "docsUrl": "https://help.suno.com/",
    "mediaUrl": "https://suno.com/blog/v5-5",
    "icon": "fa-microphone"
  },
  {
    "name": "Mureka",
    "company": "昆仑万维",
    "region": "domestic",
    "toolTypeId": "audio",
    "toolTypeIds": [
      "audio"
    ],
    "toolTypeLabels": [
      "音频与语音"
    ],
    "externalCategoryRanks": {
      "audio": 2
    },
    "externalSortOrder": 46,
    "externalSortRank": 2,
    "cardSummary": "支持歌词、旋律和风格控制的 AI 音乐创作与发行平台。",
    "productIntro": "Mureka 是 昆仑万维 推出的一站式 AI 音频创作平台。支持歌词、旋律和风格控制的 AI 音乐创作与发行平台。\nMureka支持歌词生歌、旋律参考、风格控制、音乐发布。附带 TTS 语音克隆，上传短音频生成专属声线。曲风覆盖流行、国风、电子、影视配乐，支持哼唱转旋律、参考曲风迁移。\nMureka适合中文歌曲、旋律拓展、音乐 Demo 和创作者发行。",
    "bestFor": "中文歌曲、旋律拓展、音乐 Demo 和创作者发行",
    "coreCapabilities": [
      "歌词生歌",
      "旋律参考",
      "风格控制",
      "音乐发布"
    ],
    "homepageUrl": "https://www.mureka.ai/",
    "docsUrl": "https://www.mureka.ai/",
    "mediaUrl": "https://www.mureka.ai/",
    "icon": "fa-microphone"
  },
  {
    "name": "Otter.ai",
    "company": "Otter.ai",
    "region": "overseas",
    "toolTypeId": "meeting",
    "toolTypeIds": [
      "meeting"
    ],
    "toolTypeLabels": [
      "会议与协作"
    ],
    "externalCategoryRanks": {
      "meeting": 1
    },
    "externalSortOrder": 47,
    "externalSortRank": 1,
    "cardSummary": "自动加入会议、实时转写、总结并提取任务的英语会议助手。",
    "productIntro": "Otter.ai 是 Otter.ai 推出的智能会议记录工具。通过实时转录和AI技术帮助用户捕捉会议中的每一个细节，生成摘要、行动项。支持网页、移动端、桌面端，不绑定任意视频会议软件。\nOtter.ai 支持实时转写、自动总结、行动项、会议机器人。它从会议音频或在线会议开始，完成转写、摘要、结论与行动项提取，并把结果同步到团队协作流程。\n在实际工作中，它更适合英文会议、销售通话、采访和跨团队行动项跟踪。需要实时字幕、长期留存可检索会议资料库；产品、市场、高管例会等",
    "bestFor": "英文会议、销售通话、采访和跨团队行动项跟踪",
    "coreCapabilities": [
      "实时转写",
      "自动总结",
      "行动项",
      "会议机器人"
    ],
    "homepageUrl": "https://otter.ai/",
    "docsUrl": "https://help.otter.ai/",
    "mediaUrl": "https://otter.ai/meeting-agent",
    "icon": "fa-users"
  },
  {
    "name": "Zoom AI Companion",
    "company": "Zoom",
    "region": "overseas",
    "toolTypeId": "meeting",
    "toolTypeIds": [
      "meeting"
    ],
    "toolTypeLabels": [
      "会议与协作"
    ],
    "externalCategoryRanks": {
      "meeting": 3
    },
    "externalSortOrder": 48,
    "externalSortRank": 3,
    "cardSummary": "嵌入 Zoom 会议与协作套件的摘要、问答和任务辅助能力。",
    "productIntro": "Zoom AI Companion 是 Zoom 推出的会议与协作产品，是Zoom 原生内置AI能力，具备记忆、推理、任务执行和协调能力。\nZoom AI Companion能够从会议音频或在线会议开始，完成转写、摘要、结论与行动项提取，并把结果同步到团队协作流程。\n在实际工作中，它更适合Zoom 会议总结、会后行动与团队协作；内部例会、远程部门同步、线上培训。",
    "bestFor": "Zoom 会议总结、错过内容追问、会后行动与团队协作",
    "coreCapabilities": [
      "会议摘要",
      "会中问答",
      "智能撰写",
      "任务辅助"
    ],
    "homepageUrl": "https://www.zoom.com/en/products/ai-assistant/",
    "docsUrl": "https://support.zoom.com/hc/en/category?id=kb_category&kb_category=8bc9d0b123b5be10f7b2d12afc4bcb08",
    "mediaUrl": "https://www.zoom.com/en/products/ai-assistant/",
    "icon": "fa-users"
  },
  {
    "name": "腾讯会议 AI",
    "company": "腾讯",
    "region": "domestic",
    "toolTypeId": "meeting",
    "toolTypeIds": [
      "meeting"
    ],
    "toolTypeLabels": [
      "会议与协作"
    ],
    "externalCategoryRanks": {
      "meeting": 2
    },
    "externalSortOrder": 49,
    "externalSortRank": 2,
    "cardSummary": "在腾讯会议中提供实时转写、智能录制、摘要和会议问答。",
    "productIntro": "腾讯会议 AI 是 腾讯 推出的会议与协作产品。内嵌在腾讯会议客户端，只服务腾讯会议会话，在腾讯会议中提供实时转写、智能录制、摘要和会议问答。\n支持会议实时转写，会后自动输出完整逐字稿与 AI 摘要，智能识别观点、决策项、待办任务，支持区分发言人、多语种实时翻译；纪要一键导出文档、分享参会人。\n在实际工作中，它更适合全员使用腾讯会议的公司，大量客户外部线上沟通、政企线上会议；，追求轻量化、零配置会议记录；销售对外线上洽谈、远程培训。",
    "bestFor": "中文线上会议、跨端协作、会后回看与要点同步",
    "coreCapabilities": [
      "实时转写",
      "AI 摘要",
      "会议问答",
      "智能录制"
    ],
    "homepageUrl": "https://meeting.tencent.com/ai/",
    "docsUrl": "https://meeting.tencent.com/support/",
    "mediaUrl": "https://meeting.tencent.com/ai/",
    "icon": "fa-users"
  },
  {
    "name": "通义听悟",
    "company": "阿里云",
    "region": "domestic",
    "toolTypeId": "meeting",
    "toolTypeIds": [
      "meeting"
    ],
    "toolTypeLabels": [
      "会议与协作"
    ],
    "externalCategoryRanks": {
      "meeting": 4
    },
    "externalSortOrder": 50,
    "externalSortRank": 4,
    "cardSummary": "面向音视频内容的转写、章节、摘要、翻译与智能问答工具。",
    "productIntro": "通义听悟 是 阿里云 推出的跨平台 AI 音视频转写工具，独立网页 / 客户端，不绑定单一会议软件。\n通义听悟支持腾讯会议、飞书会议、线下录音、本地音视频上传转写，跨平台通用。中英实时翻译、支持长音频处理；可生成思维导图形式会议梳理。自动生成章节速览、要点、问答、待办清单。\n在实际工作中，它更适合线上课程、直播回放转文字；访谈录音整理等。不被单一办公生态绑定。",
    "bestFor": "会议、访谈、课程和长音视频的中文整理与复盘",
    "coreCapabilities": [
      "音视频转写",
      "智能摘要",
      "章节速览",
      "中英翻译"
    ],
    "homepageUrl": "https://tingwu.aliyun.com/",
    "docsUrl": "https://help.aliyun.com/zh/tingwu/",
    "mediaUrl": "https://tingwu.aliyun.com/",
    "icon": "fa-users"
  },
  {
    "name": "WorkBuddy",
    "company": "腾讯云",
    "region": "domestic",
    "toolTypeId": "agent",
    "toolTypeIds": [
      "agent"
    ],
    "toolTypeLabels": [
      "智能体"
    ],
    "externalCategoryRanks": {
      "agent": 3
    },
    "externalSortOrder": 51,
    "externalSortRank": 3,
    "cardSummary": "从工作目标出发规划步骤、处理材料，并自主完成跨工具办公任务。",
    "productIntro": "WorkBuddy 是腾讯推出的面向工作目标的桌面端执行型 AI 助手。用户给出任务和材料后，它会规划步骤、处理文件并推进跨工具工作，不局限于返回一段文字答案。\n产品适合把研究、信息整理、办公写作、数据处理和成果制作连接成连续流程，让员工从“告诉我怎么做”转向“按要求完成并交付”。任务过程中的目标、资料和输出格式可以持续补充。\n它更适合边界明确且需要多个步骤的办公任务。使用时应先限定可访问的数据与工具、写明人工确认点，并在发送、发布、采购或修改真实数据前进行复核。",
    "bestFor": "调研报告、文档与演示制作、表格分析、本地文件处理和跨工具任务执行",
    "coreCapabilities": [
      "自主任务规划",
      "本地文件操作",
      "多任务并行",
      "可交付成果生成"
    ],
    "homepageUrl": "https://www.workbuddy.ai/",
    "docsUrl": "https://www.workbuddy.ai/docs/workbuddy/",
    "mediaUrl": "https://www.tencent.com/tencent-cloud-debuts-productivity-agent-suite-creating-a-new-gateway-to-ai-for-users-and-enterprises/",
    "icon": "fa-robot"
  },
  {
    "name": "Codex",
    "company": "OpenAI",
    "region": "overseas",
    "toolTypeId": "code",
    "toolTypeIds": [
      "code",
      "agent"
    ],
    "toolTypeLabels": [
      "编程开发",
      "智能体"
    ],
    "externalCategoryRanks": {
      "code": 5,
      "agent": 3
    },
    "externalSortOrder": 52,
    "externalSortRank": 3,
    "cardSummary": "理解任务与工作文件后自主推进写作、分析、制作和代码工作，并交付完整成果。",
    "productIntro": "Codex 是OpenAI 推出的 AI 编程智能体，通过可视化图形界面与开发者交互，它会先理解目标和工作区材料，再规划步骤、读取文件、生成或修改内容，通过实际操作把任务推进到可检查的成果。\n在支持的工作环境中，Codex 可以处理文案与研究材料、整理和分析数据、制作文档或演示草稿，也能完成代码理解、实现、测试与审查。过程中的文件和执行结果会保留下来，便于逐步核验。\n它尤其适合边界清楚、需要连续操作的办公或技术任务。使用时应明确交付格式、允许访问的材料和必须人工确认的节点，再依据中间结果继续修正，而不是只给一个宽泛题目。",
    "bestFor": "代码库任务、并行开发、代码审查、测试与自动化修复",
    "coreCapabilities": [
      "代码库理解",
      "云端任务",
      "运行与验证",
      "代码审查"
    ],
    "homepageUrl": "https://openai.com/codex/",
    "docsUrl": "https://developers.openai.com/codex/",
    "mediaUrl": "https://openai.com/codex/",
    "icon": "fa-code"
  },
  {
    "name": "Claude Code",
    "company": "Anthropic",
    "region": "overseas",
    "toolTypeId": "code",
    "toolTypeIds": [
      "code",
      "agent"
    ],
    "toolTypeLabels": [
      "编程开发",
      "智能体"
    ],
    "externalCategoryRanks": {
      "code": 4,
      "agent": 4
    },
    "externalSortOrder": 53,
    "externalSortRank": 4,
    "cardSummary": "可读取代码库、编辑文件、运行命令，并在终端、IDE、桌面端与网页执行工程任务。",
    "productIntro": "Claude Code 是是 Anthropic 公司推出的基于命令行的 AI 编程工具。能理解自然语言指令。可读取代码库、编辑文件、运行命令，并在终端、IDE、桌面端与网页执行工程任务。\nClaude Code支持文件操作、代码搜索、网页浏览和 Git 工作流管理；具备代码库深度理解、多文件协同修改、代码生成与优化、集成主流IDE等能力。\n在实际工作中，它更适合大型代码库理解、重构、调试和自动化工程工作流；大型系统整体重构、跨模块改造；数据库大规模迁移、底层逻辑优化。",
    "bestFor": "大型代码库理解、重构、调试和自动化工程工作流",
    "coreCapabilities": [
      "终端智能体",
      "代码库理解",
      "工具调用",
      "多智能体协作"
    ],
    "homepageUrl": "https://www.anthropic.com/claude-code",
    "docsUrl": "https://docs.anthropic.com/en/docs/claude-code/overview",
    "mediaUrl": "https://www.anthropic.com/claude-code",
    "icon": "fa-code"
  },
  {
    "name": "GitHub Copilot",
    "company": "GitHub / Microsoft",
    "region": "overseas",
    "toolTypeId": "code",
    "toolTypeIds": [
      "code"
    ],
    "toolTypeLabels": [
      "编程开发"
    ],
    "externalCategoryRanks": {
      "code": 2
    },
    "externalSortOrder": 54,
    "externalSortRank": 2,
    "cardSummary": "覆盖 IDE 补全、聊天、代码审查和 GitHub 编码智能体的开发助手。",
    "productIntro": "GitHub Copilot 是由GitHub与OpenAI合作开发的一款革命性的智能代码补全和生成工具，旨在帮助开发人员更高效、更准确、更快地编写代码。\nGitHub Copilot 支持代码建议与自动补全，自然语言理解，支持多种编程语言，代码审查、代码重构与示例等\n在实际工作中，它更适合日常 IDE 开发、Pull Request、代码审查与 GitHub 工作流。团队常规业务日常编码；写业务 CRUD、脚本、样板代码；中小型稳定项目迭代等。",
    "bestFor": "日常 IDE 开发、Pull Request、代码审查与 GitHub 工作流",
    "coreCapabilities": [
      "代码补全",
      "Copilot Chat",
      "Coding Agent",
      "代码审查"
    ],
    "homepageUrl": "https://github.com/features/copilot",
    "docsUrl": "https://docs.github.com/en/copilot",
    "mediaUrl": "https://github.com/features/copilot",
    "icon": "fa-code"
  },
  {
    "name": "TRAE",
    "company": "字节跳动",
    "region": "domestic",
    "toolTypeId": "code",
    "toolTypeIds": [
      "code"
    ],
    "toolTypeLabels": [
      "编程开发"
    ],
    "externalCategoryRanks": {
      "code": 2
    },
    "externalSortOrder": 55,
    "externalSortRank": 2,
    "cardSummary": "集成代码理解、生成和任务执行的 AI 原生开发环境。",
    "productIntro": "TRAE 是 字节跳动自研AI 原生一体化 IDE，拥有独立客户端，支持SOLO 自主智能体模式，集成代码理解、生成和任务执行的 AI 原生开发环境。\n产品支持IDE 模式（常规编码补全）+ SOLO 模式（AI 自主承接完整开发需求），一句话需求自动生成整套项目脚手架、多文件批量创建与修改，自定义智能体，上下文理解及区域化部署。\n在实际工作中，它更适合新项目原型快速验证、从零搭建 Demo；前端项目、数据脚本、爬虫开发；独立开发者 / 全栈工程师快速落地想法；中小型全栈创新项目。",
    "bestFor": "从需求到应用、中文研发、跨文件编辑和智能体编程",
    "coreCapabilities": [
      "AI IDE",
      "SOLO 模式",
      "代码库理解",
      "多模型"
    ],
    "homepageUrl": "https://www.trae.ai/",
    "docsUrl": "https://docs.trae.ai/",
    "mediaUrl": "https://www.trae.ai/",
    "icon": "fa-code"
  },
  {
    "name": "腾讯 CodeBuddy",
    "company": "腾讯云",
    "region": "domestic",
    "toolTypeId": "code",
    "toolTypeIds": [
      "code"
    ],
    "toolTypeLabels": [
      "编程开发"
    ],
    "externalCategoryRanks": {
      "code": 3
    },
    "externalSortOrder": 56,
    "externalSortRank": 3,
    "cardSummary": "面向企业研发的代码助手、AI IDE 与工程任务智能体。",
    "productIntro": "腾讯 CodeBuddy 是 腾讯云 推出的编程开发产品。面向企业研发的代码助手、AI IDE 与工程任务智能体。\nCodeBuddy 支持代码补全、诊断、优化、重构，能生成单元测试和进行代码评审。兼容 MCP 开放生态，能接入多种第三方工具和服务。\n在实际工作中，它更适合微信小程序、公众号、腾讯云开发项目；ToC 互联网前端业务；产品 / 设计 / 开发协同，消除设计与开发沟通成本；初创团队快速将产品原型转为可运行代码。",
    "bestFor": "中文研发、代码补全、企业知识接入和端到端应用开发",
    "coreCapabilities": [
      "代码补全",
      "AI IDE",
      "工程智能体",
      "企业知识"
    ],
    "homepageUrl": "https://copilot.tencent.com/",
    "docsUrl": "https://copilot.tencent.com/docs/",
    "mediaUrl": "https://copilot.tencent.com/",
    "icon": "fa-code"
  },
  {
    "name": "Dify",
    "company": "LangGenius",
    "region": "domestic",
    "toolTypeId": "agent",
    "toolTypeIds": [
      "agent"
    ],
    "toolTypeLabels": [
      "智能体"
    ],
    "externalCategoryRanks": {
      "agent": 6
    },
    "externalSortOrder": 57,
    "externalSortRank": 6,
    "cardSummary": "用于搭建 RAG、工作流和生产级 AI 应用的开源平台。",
    "productIntro": "Dify 是 LangGenius 推出的开源 LLMOps/AI 应用开发平台，属于底层搭建工具。用于搭建 RAG、工作流和生产级 AI 应用的开源平台。\nDify支持可视化工作流编排、企业级 RAG、Agent 循环调用、插件扩展、应用监控与 LLMOps 运维。完全开源，支持本地私有化部署。\n在实际工作中，它更适合企业知识助手、模型编排、可观测 AI 应用与私有部署。",
    "bestFor": "企业知识助手、模型编排、可观测 AI 应用与私有部署",
    "coreCapabilities": [
      "工作流",
      "RAG",
      "模型管理",
      "开源自托管"
    ],
    "homepageUrl": "https://dify.ai/",
    "docsUrl": "https://docs.dify.ai/",
    "mediaUrl": "https://dify.ai/",
    "icon": "fa-robot"
  },
  {
    "name": "Synthesia",
    "company": "Synthesia",
    "region": "overseas",
    "toolTypeId": "video",
    "toolTypeIds": [
      "video"
    ],
    "toolTypeLabels": [
      "视频与数字人"
    ],
    "externalCategoryRanks": {
      "video": 5
    },
    "externalSortOrder": 58,
    "externalSortRank": 5,
    "cardSummary": "用脚本、文档或网页快速生成多语言数字人讲解视频。",
    "productIntro": "Synthesia 是 Synthesia 推出的视频生成制作工具。具备视频编辑、团队协作、一键翻译和本地化等功能，可将文档、网页等快速转化为视频。\nSynthesia支持AI虚拟形象、多语言支持将自动转换成相应语言的语音，可将文字转化为高质量配音，支持视频剪辑、一键翻译能力。\n在实际工作中，它更适合培训课程、产品讲解、企业传播、本地化视频和数字人主持。",
    "bestFor": "培训课程、产品讲解、企业传播、本地化视频和数字人主持",
    "coreCapabilities": [
      "AI 数字人",
      "文档转视频",
      "多语言翻译",
      "团队协作"
    ],
    "homepageUrl": "https://www.synthesia.io/",
    "docsUrl": "https://help.synthesia.io/",
    "mediaUrl": "https://www.synthesia.io/features/ai-video-generator",
    "icon": "fa-video"
  },
  {
    "name": "Fireflies.ai",
    "company": "Fireflies.ai",
    "region": "overseas",
    "toolTypeId": "meeting",
    "toolTypeIds": [
      "meeting"
    ],
    "toolTypeLabels": [
      "会议与协作"
    ],
    "externalCategoryRanks": {
      "meeting": 2
    },
    "externalSortOrder": 59,
    "externalSortRank": 2,
    "cardSummary": "自动加入线上会议，完成转写、总结、行动项与跨会议检索。",
    "productIntro": "Fireflies.ai 是 Fireflies.ai 推出的会议与协作产品。自动加入线上会议，完成转写、总结、行动项与跨会议检索。\nFireflies.ai 支持会议转写、生成详细的 AI 总结、提取关键信息、生成后续邮件等。支持 100 + 语种自动识别，多语言国际会议自动识别发言人、自动语言检测等。\n在实际工作中，它更适合多语种跨境商务洽谈、团队知识沉淀、销售团队、客户持续沟通、招聘面试等。",
    "bestFor": "跨平台会议纪要、团队知识沉淀、销售复盘和工作流同步",
    "coreCapabilities": [
      "会议转写",
      "AI 摘要",
      "行动项",
      "应用集成"
    ],
    "homepageUrl": "https://fireflies.ai/",
    "docsUrl": "https://guide.fireflies.ai/",
    "mediaUrl": "https://fireflies.ai/product",
    "icon": "fa-users"
  },
  {
    "name": "ima",
    "company": "腾讯",
    "region": "domestic",
    "toolTypeId": "knowledge",
    "toolTypeIds": [
      "knowledge"
    ],
    "toolTypeLabels": [
      "知识管理与写作"
    ],
    "externalCategoryRanks": {
      "knowledge": 2
    },
    "externalSortOrder": 60,
    "externalSortRank": 2,
    "cardSummary": "以个人知识库为核心，串联搜索、阅读、记录与写作的 AI 工作台。",
    "productIntro": "ima 是 腾讯 推出的知识管理与学习产品。以个人知识库为核心，串联搜索、阅读、记录与写作的 AI 工作台。\n主要能力包括知识库问答、搜读写一体、网页收藏、多模型支持。支持多种格式文件上传及解析。可对多篇资料进行分析对比、内容梳理与要点提炼。\n在实际工作中，它更适合个人知识库、网页收藏、长文阅读、资料问答和基于知识的写作。",
    "bestFor": "个人知识库、网页收藏、长文阅读、资料问答和基于知识的写作",
    "coreCapabilities": [
      "知识库问答",
      "搜读写一体",
      "网页收藏",
      "多模型支持"
    ],
    "homepageUrl": "https://ima.qq.com/",
    "docsUrl": "https://ima.qq.com/extension-info",
    "mediaUrl": "https://ima.qq.com/",
    "icon": "fa-book"
  },
  {
    "name": "Meta AI",
    "company": "Meta",
    "region": "overseas",
    "toolTypeId": "general",
    "toolTypeIds": [
      "general"
    ],
    "toolTypeLabels": [
      "通用AI助手"
    ],
    "externalCategoryRanks": {
      "general": 5
    },
    "externalSortOrder": 61,
    "externalSortRank": 5,
    "cardSummary": "连接 Meta 社交生态的多模态助手，支持问答、创作、图片与日常任务。",
    "productIntro": "Meta AI 是 Meta 推出的通用AI助手产品。连接 Meta 社交生态的多模态助手，支持问答、创作、图片与日常任务。\nMeta AI提供多模态问答、支持图文对话、简单图像生成；社交场景轻量化问答。社交应用集成、语音交互。\n在实际工作中，它更适合轻量问答、社交内容创作、图片生成和跨 Meta 应用使用。",
    "bestFor": "轻量问答、社交内容创作、图片生成和跨 Meta 应用使用",
    "coreCapabilities": [
      "多模态问答",
      "图片生成",
      "社交应用集成",
      "语音交互"
    ],
    "homepageUrl": "https://www.meta.ai/",
    "docsUrl": "https://www.meta.ai/help/",
    "mediaUrl": "https://ai.meta.com/meta-ai/",
    "icon": "fa-comments"
  },
  {
    "name": "腾讯元宝",
    "company": "腾讯",
    "region": "domestic",
    "toolTypeId": "general",
    "toolTypeIds": [
      "general"
    ],
    "toolTypeLabels": [
      "通用AI助手"
    ],
    "externalCategoryRanks": {
      "general": 5
    },
    "externalSortOrder": 62,
    "externalSortRank": 5,
    "cardSummary": "结合腾讯混元与多模型能力，覆盖搜索、阅读、写作和内容创作的个人助手。",
    "productIntro": "腾讯元宝 是 腾讯 推出的通用AI助手产品。结合腾讯混元与多模型能力，覆盖搜索、阅读、写作和内容创作的个人助手。\n腾讯元宝原生适配微信生态，直接解析公众号链接、微信文件；腾讯文档无缝互通。擅长中文公文、商务信函、会议材料，OCR 纸质文档识别能力突出。\n腾讯元宝适合中文问答、公众号内容理解、文件阅读、日常写作和图片创作。",
    "bestFor": "中文问答、公众号内容理解、文件阅读、日常写作和图片创作",
    "coreCapabilities": [
      "联网搜索",
      "文件解析",
      "多模型",
      "腾讯生态"
    ],
    "homepageUrl": "https://yuanbao.tencent.com/",
    "mediaUrl": "https://yuanbao.tencent.com/",
    "icon": "fa-comments"
  },
  {
    "name": "天工AI",
    "company": "昆仑万维",
    "region": "domestic",
    "toolTypeId": "search",
    "toolTypeIds": [
      "search"
    ],
    "toolTypeLabels": [
      "AI搜索与研究"
    ],
    "externalCategoryRanks": {
      "search": 1
    },
    "externalSortOrder": 63,
    "externalSortRank": 1,
    "cardSummary": "集AI 搜索、深度研究、创作和内容生成为一体的AI产品。",
    "productIntro": "天工AI 是 昆仑万维 推出的融入大语言模型的AI搜索引擎，集AI搜索、文档解析、内容生成为一体。\n产品主要覆盖AI 搜索、长文本处理、多模态创作、智能体。支持用户进行搜索、阅读、创作及任务执行，解决各类搜索、创作及内容生成任务。\n在实际工作中，它更适合深度搜索、资料总结、行业研究、多模态内容生成等。用户可以根据自己的需求，选择不同的插件进行专业问题处理。",
    "bestFor": "中文搜索、热点研究、报告生成和多媒体内容准备",
    "coreCapabilities": [
      "AI 搜索",
      "深度研究",
      "长文生成",
      "多模态创作"
    ],
    "homepageUrl": "https://www.tiangong.cn/",
    "mediaUrl": "https://www.tiangong.cn/",
    "icon": "fa-magnifying-glass"
  },
  {
    "name": "Obsidian",
    "company": "Obsidian",
    "region": "overseas",
    "toolTypeId": "knowledge",
    "toolTypeIds": [
      "knowledge"
    ],
    "toolTypeLabels": [
      "知识管理与写作"
    ],
    "externalCategoryRanks": {
      "knowledge": 4
    },
    "externalSortOrder": 64,
    "externalSortRank": 4,
    "cardSummary": "把本地双向链接笔记组织成长期知识网络，并通过插件接入 AI 工作流。",
    "productIntro": "Obsidian 是以本地 Markdown 文件为核心的知识管理工具，通过双向链接、标签、图谱和可扩展插件，把零散笔记组织成长期可维护的个人知识网络。\n它本身并不是以原生 AI 为核心的产品，AI 能力主要来自社区插件或外部模型接入。用户可以在保留本地文件控制权的同时，增加摘要、问答、语义检索或写作辅助。\nObsidian 更适合重视长期积累、可迁移文件和自定义工作流的用户。安装 AI 插件前应检查开发者、权限、模型去向与数据传输范围，避免把敏感知识默认发送到外部服务。",
    "bestFor": "个人知识库、研究笔记、项目资料、双向链接与长期知识沉淀",
    "coreCapabilities": [
      "本地优先",
      "双向链接",
      "知识图谱",
      "AI 插件生态"
    ],
    "homepageUrl": "https://obsidian.md/",
    "docsUrl": "https://help.obsidian.md/",
    "mediaUrl": "https://obsidian.md/",
    "icon": "fa-book"
  },
  {
    "name": "AiPPT",
    "company": "AiPPT",
    "region": "domestic",
    "toolTypeId": "ppt",
    "toolTypeIds": [
      "ppt"
    ],
    "toolTypeLabels": [
      "演示与文档"
    ],
    "externalCategoryRanks": {
      "ppt": 5
    },
    "externalSortOrder": 65,
    "externalSortRank": 5,
    "cardSummary": "根据主题、文档或大纲快速生成中文 PPT，并提供模板与在线编辑。",
    "productIntro": "AiPPT 是 AiPPT 推出的演示与文档产品。根据主题、文档或大纲快速生成中文 PPT，并提供模板与在线编辑。\n主要能力包括一键生成、文档转 PPT、中文模板、在线编辑。它从主题、提纲或已有材料出发，协助完成内容结构、页面排版、视觉表达与可编辑文件输出。\n在实际工作中，它更适合中文汇报初稿、文档转 PPT、模板套用和快速排版。",
    "bestFor": "中文汇报初稿、文档转 PPT、模板套用和快速排版",
    "coreCapabilities": [
      "一键生成",
      "文档转 PPT",
      "中文模板",
      "在线编辑"
    ],
    "homepageUrl": "https://www.aippt.cn/",
    "mediaUrl": "https://www.aippt.cn/",
    "icon": "fa-file-powerpoint"
  },
  {
    "name": "ChatGPT Images 2.0",
    "company": "OpenAI",
    "region": "overseas",
    "toolTypeId": "image",
    "toolTypeIds": [
      "image"
    ],
    "toolTypeLabels": [
      "图像与设计"
    ],
    "externalCategoryRanks": {
      "image": 1
    },
    "externalSortOrder": 66,
    "externalSortRank": 1,
    "cardSummary": "在对话中直接生成、理解和修改图片，让视觉创作可以连续迭代。",
    "productIntro": "ChatGPT Images 是 ChatGPT 内的图像生成与编辑体验。用户可以在同一对话中描述画面、上传参考图、要求局部修改，并沿着上一轮结果继续调整构图、风格、文字和细节。\n它把语言理解与视觉创作连接起来，适合从概念沟通进入海报、社媒配图、产品示意和创意探索；复杂要求可通过多轮对话逐步收敛，而不必每次重新描述全部背景。\n它的核心差异是编辑过程天然保留对话上下文。正式使用时仍需检查人物与文字细节、品牌素材授权和输出尺寸，并避免把生成结果误当成真实照片或官方素材。",
    "bestFor": "营销海报、信息图、带文字视觉、产品概念图和对话式修图",
    "coreCapabilities": [
      "文生图",
      "高保真编辑",
      "文字渲染",
      "多轮迭代"
    ],
    "homepageUrl": "https://chatgpt.com/images",
    "docsUrl": "https://developers.openai.com/api/docs/guides/image-generation",
    "mediaUrl": "https://openai.com/index/introducing-chatgpt-images-2-0/",
    "icon": "fa-image"
  },
  {
    "name": "Nano Banana 2",
    "company": "Google DeepMind",
    "region": "overseas",
    "toolTypeId": "image",
    "toolTypeIds": [
      "image"
    ],
    "toolTypeLabels": [
      "图像与设计"
    ],
    "externalCategoryRanks": {
      "image": 4
    },
    "externalSortOrder": 67,
    "externalSortRank": 4,
    "cardSummary": "用自然语言与参考图完成高质量图像生成和精细编辑，并保持主体一致。",
    "productIntro": "Nano Banana 2 是 Google 的图像生成与编辑体验，强调自然语言控制、参考图理解、主体一致性和精细修改。用户可以从文字或图片开始，持续调整人物、商品、背景与画面风格。\n产品适合把创意方向、局部编辑和多轮迭代放在同一流程中，并可利用 Gemini 的多模态理解处理较复杂的画面要求和参考关系。\n它更适合电商视觉、人物与商品一致性、海报概念和快速方案探索。涉及商标、真实人物或商业发布时，应核对授权、标识和生成内容披露要求。",
    "bestFor": "快速创意、图片编辑、信息图、角色一致性和 Google 生态视觉生产",
    "coreCapabilities": [
      "图像生成",
      "对话式编辑",
      "主体一致性",
      "最高 4K"
    ],
    "homepageUrl": "https://gemini.google.com/",
    "docsUrl": "https://ai.google.dev/gemini-api/docs/image-generation",
    "mediaUrl": "https://blog.google/innovation-and-ai/technology/ai/nano-banana-2/",
    "icon": "fa-image"
  },
  {
    "name": "FLUX.2",
    "company": "Black Forest Labs",
    "region": "overseas",
    "toolTypeId": "image",
    "toolTypeIds": [
      "image"
    ],
    "toolTypeLabels": [
      "图像与设计"
    ],
    "externalCategoryRanks": {
      "image": 3
    },
    "externalSortOrder": 68,
    "externalSortRank": 3,
    "cardSummary": "面向专业创意工作流的图像模型家族，强调可控生成、编辑与开放集成。",
    "productIntro": "FLUX.2 是 Black Forest Labs 推出的图像与设计产品。面向专业创意工作流的图像模型家族，强调可控生成、编辑与开放集成。\n主要能力包括高质量生成、图像编辑、API、多种模型规格。图文排版持续优化，广告创意、产品渲染可控性强。\n在实际工作中，它更适合可控图像生成、开发者 API、品牌视觉、产品图和本地化工作流。",
    "bestFor": "可控图像生成、开发者 API、品牌视觉、产品图和本地化工作流",
    "coreCapabilities": [
      "高质量生成",
      "图像编辑",
      "API",
      "多种模型规格"
    ],
    "homepageUrl": "https://playground.bfl.ai/",
    "docsUrl": "https://docs.bfl.ai/",
    "mediaUrl": "https://bfl.ai/models",
    "icon": "fa-image"
  },
  {
    "name": "LiblibAI",
    "company": "北京奇点星宇",
    "region": "domestic",
    "toolTypeId": "image",
    "toolTypeIds": [
      "image"
    ],
    "toolTypeLabels": [
      "图像与设计"
    ],
    "externalCategoryRanks": {
      "image": 4
    },
    "externalSortOrder": 69,
    "externalSortRank": 4,
    "cardSummary": "国内大型 AI 创作社区与模型平台，支持在线生图、工作流和模型分享。",
    "productIntro": "LiblibAI 是 北京奇点星宇 推出的图像与设计产品。国内大型 AI 创作社区与模型平台，支持在线生图、工作流和模型分享。\nLiblibAI 支持多模型自由切换，一个平台调用即梦、Qwen、可灵、SD 系列模型。支持 ControlNet 线稿上色、节点式高级工作流、批量出图、超清放大。适合高频大批量生产；支持模型参数完整自定义。\n在实际工作中，它支持选择不同模型体验、工作流复用、风格探索和社区素材。",
    "bestFor": "创作、模型体验、工作流复用、风格探索和社区素材",
    "coreCapabilities": [
      "在线生图",
      "模型社区",
      "ComfyUI 工作流",
      "训练与分享"
    ],
    "homepageUrl": "https://www.liblib.art/",
    "mediaUrl": "https://www.liblib.art/",
    "icon": "fa-image"
  },
  {
    "name": "海螺AI",
    "company": "MiniMax",
    "region": "domestic",
    "toolTypeId": "video",
    "toolTypeIds": [
      "video"
    ],
    "toolTypeLabels": [
      "视频与数字人"
    ],
    "externalCategoryRanks": {
      "video": 3
    },
    "externalSortOrder": 70,
    "externalSortRank": 3,
    "cardSummary": "MiniMax 旗下 AI 视频创作产品，支持文本和图片驱动的视频生成。",
    "productIntro": "海螺AI 是 MiniMax 推出的多模态 AI 视频创作平台。MiniMax 旗下 AI 视频创作产品，支持文本和图片驱动的视频生成。\n海螺AI支持文生视频、图生视频，兼顾写实科幻与二次元等多种风格。提供多种智能视频模板，支持过重格式输出，高清输出。\n在实际工作中，它更适合社交媒体内容创作、短视频广告、电影和视频制作，虚拟 IP、二次元动画短视频。",
    "bestFor": "中文创意短片、图片动效、人物表演、营销视频和故事镜头",
    "coreCapabilities": [
      "文生视频",
      "图生视频",
      "主体一致性",
      "镜头表现"
    ],
    "homepageUrl": "https://hailuoai.video/",
    "mediaUrl": "https://hailuoai.video/",
    "icon": "fa-video"
  },
  {
    "name": "通义万相视频",
    "company": "阿里云",
    "region": "domestic",
    "toolTypeId": "video",
    "toolTypeIds": [
      "video"
    ],
    "toolTypeLabels": [
      "视频与数字人"
    ],
    "externalCategoryRanks": {
      "video": 5
    },
    "externalSortOrder": 71,
    "externalSortRank": 5,
    "cardSummary": "阿里通义万相的生成式视频能力，覆盖文本、图片驱动与企业 API 接入。",
    "productIntro": "通义万相视频 是阿里云推出的AI视频生成工具。阿里通义万相的生成式视频能力，覆盖文本、图片驱动与企业 API 接入。\n通义万相视频支持文生视频和图生视频，能处理多语言输入，支持“灵感扩写”功能，一键帮用户完善提示词，还自带“音频生成”功能，视频生成自带音画同步的音效和音频内容，降低AI视频创作门槛。\n在实际工作中，它更适合影视制作、动画设计、广告创意、社媒内容创作等多个领域。",
    "bestFor": "电商营销、品牌内容、图生视频、企业批量生成和 API 集成",
    "coreCapabilities": [
      "文生视频",
      "图生视频",
      "企业 API",
      "中文理解"
    ],
    "homepageUrl": "https://tongyi.aliyun.com/wanxiang/",
    "docsUrl": "https://help.aliyun.com/zh/model-studio/",
    "mediaUrl": "https://tongyi.aliyun.com/wanxiang/",
    "icon": "fa-video"
  },
  {
    "name": "MiniMax Audio",
    "company": "MiniMax",
    "region": "domestic",
    "toolTypeId": "audio",
    "toolTypeIds": [
      "audio"
    ],
    "toolTypeLabels": [
      "音频与语音"
    ],
    "externalCategoryRanks": {
      "audio": 1
    },
    "externalSortOrder": 72,
    "externalSortRank": 1,
    "cardSummary": "提供自然语音合成、声音设计、克隆和多语言音频生成能力。",
    "productIntro": "MiniMax Audio 是 MiniMax 推出的专业TTS语音合成引擎。提供自然语音合成、声音设计、克隆和多语言音频生成能力。\nMiniMax Audio 支持Text to Speech、声音克隆、声音设计、提供企业API。内置海量预置真人质感音色，支持中英混读、口音模拟。\nMiniMax Audio更适合多语言配音、声音克隆、角色语音、播客和开发者集成。",
    "bestFor": "多语言配音、声音克隆、角色语音、播客和开发者集成",
    "coreCapabilities": [
      "Text to Speech",
      "声音克隆",
      "声音设计",
      "企业API"
    ],
    "homepageUrl": "https://www.minimax.io/audio",
    "docsUrl": "https://platform.minimax.io/docs/",
    "mediaUrl": "https://www.minimax.io/audio",
    "icon": "fa-microphone"
  },
  {
    "name": "CosyVoice",
    "company": "阿里巴巴 FunAudioLLM",
    "region": "domestic",
    "toolTypeId": "audio",
    "toolTypeIds": [
      "audio"
    ],
    "toolTypeLabels": [
      "音频与语音"
    ],
    "externalCategoryRanks": {
      "audio": 3
    },
    "externalSortOrder": 73,
    "externalSortRank": 3,
    "cardSummary": "面向多语言语音合成与零样本声音克隆的开源语音生成项目。",
    "productIntro": "CosyVoice 是 阿里巴巴 FunAudioLLM 推出的音频与语音产品语音合成模型。面向多语言语音合成与零样本声音克隆的开源语音生成项目。\nCosyVoice 支持开源 TTS、零样本克隆、多语言、本地部署。韵律自然，多音字、长句朗读稳定性优秀。\nCosyVoice更适合本地部署、声音克隆、研究开发、多语言 TTS 和定制语音。",
    "bestFor": "本地部署、声音克隆、研究开发、多语言 TTS 和定制语音",
    "coreCapabilities": [
      "开源 TTS",
      "零样本克隆",
      "多语言",
      "本地部署"
    ],
    "homepageUrl": "https://github.com/FunAudioLLM/CosyVoice",
    "docsUrl": "https://github.com/FunAudioLLM/CosyVoice",
    "mediaUrl": "https://funaudiollm.github.io/",
    "icon": "fa-microphone"
  },
  {
    "name": "钉钉闪记",
    "company": "钉钉",
    "region": "domestic",
    "toolTypeId": "meeting",
    "toolTypeIds": [
      "meeting"
    ],
    "toolTypeLabels": [
      "会议与协作"
    ],
    "externalCategoryRanks": {
      "meeting": 5
    },
    "externalSortOrder": 74,
    "externalSortRank": 5,
    "cardSummary": "在钉钉协作场景中完成会议录音、实时转写、重点标记与智能纪要。",
    "productIntro": "钉钉闪记 是钉钉原生会议记录能力，深度集成钉钉会议、钉钉组织、钉钉待办、钉盘，阿里技术底座。在钉钉协作场景中完成会议录音、实时转写、重点标记与智能纪要。\n支持钉钉会议实时转写、发言人区分，支持手机端现场录音。内置多种纪要模板，支持自定义提示词规范输出纪要格式。会议待办直接同步钉钉任务、关联日程。支持上传外部音视频处理；企业组织权限体系完善\n在实际工作中，全员使用钉钉的团队；线下拜访录音、外勤访谈；项目例会、流程化内部会议；",
    "bestFor": "内部会议、访谈记录、培训回顾、行动项提取和团队同步",
    "coreCapabilities": [
      "实时转写",
      "智能纪要",
      "重点标记",
      "钉钉协同"
    ],
    "homepageUrl": "https://www.dingtalk.com/",
    "mediaUrl": "https://www.dingtalk.com/",
    "icon": "fa-users"
  },
  {
    "name": "讯飞听见",
    "company": "科大讯飞",
    "region": "domestic",
    "toolTypeId": "meeting",
    "toolTypeIds": [
      "meeting"
    ],
    "toolTypeLabels": [
      "会议与协作"
    ],
    "externalCategoryRanks": {
      "meeting": 3
    },
    "externalSortOrder": 75,
    "externalSortRank": 3,
    "cardSummary": "以高质量中文语音转写为核心，覆盖会议、访谈、字幕和人工精转。",
    "productIntro": "讯飞听见 是 科大讯飞 推出的专业录音转写平台，语音识别底层能力标杆，兼顾个人与大型政企私有化方案。以高质量音视频转写为核心，覆盖会议、访谈等。\n支持上百种语种识别，长访谈、采访高精度逐字文稿输出，实时会议转写、录音笔硬件联动、本地离线转写，普通话、方言识别，可提供私有化部署，满足涉密、信创、律所、医疗等合规场景。\n在实际工作中，它更适合媒体采访、深度调研访谈、庭审、医疗 / 法律专业会议；嘈杂线下会场；大量方言沟通场景；有离线 / 私有化部署、高转写精度硬性要求的机构；音视频文稿内容创作。",
    "bestFor": "中文会议转写、采访录音、字幕制作、多语种记录和专业精转",
    "coreCapabilities": [
      "实时转写",
      "录音转文字",
      "多语种",
      "人工精转"
    ],
    "homepageUrl": "https://www.iflyrec.com/",
    "mediaUrl": "https://www.iflyrec.com/",
    "icon": "fa-users"
  },
  {
    "name": "Windsurf",
    "company": "Windsurf",
    "region": "overseas",
    "toolTypeId": "code",
    "toolTypeIds": [
      "code"
    ],
    "toolTypeLabels": [
      "编程开发"
    ],
    "externalCategoryRanks": {
      "code": 3
    },
    "externalSortOrder": 76,
    "externalSortRank": 3,
    "cardSummary": "面向大型代码库的 Agentic IDE，以上下文感知、规划和多文件改动为核心。",
    "productIntro": "Windsurf 是 Windsurf 推出的编程开发产品。面向大型代码库的 Agentic IDE，以上下文感知、规划和多文件改动为核心。\n产品主要覆盖Agentic IDE、代码库理解、多文件编辑、实时感知操作、终端输出。\n在实际工作中，它更适合复杂代码库、跨文件开发、Agent 工作流、调试和团队工程。",
    "bestFor": "复杂代码库、跨文件开发、Agent 工作流、调试和团队工程",
    "coreCapabilities": [
      "Agentic IDE",
      "代码库理解",
      "多文件编辑",
      "终端执行"
    ],
    "homepageUrl": "https://windsurf.com/",
    "docsUrl": "https://docs.windsurf.com/",
    "mediaUrl": "https://windsurf.com/",
    "icon": "fa-code"
  },
  {
    "name": "CodeGeeX",
    "company": "智谱",
    "region": "domestic",
    "toolTypeId": "code",
    "toolTypeIds": [
      "code"
    ],
    "toolTypeLabels": [
      "编程开发"
    ],
    "externalCategoryRanks": {
      "code": 4
    },
    "externalSortOrder": 77,
    "externalSortRank": 4,
    "cardSummary": "支持多语言代码生成、补全、翻译和问答的国产智能编程助手。",
    "productIntro": "CodeGeeX 是智谱基于其CodeGeeX2多语言代码生成模型，支持Python、Java、C++/C、JavaScript、Go等多种编程语言，实现代码的生成与补全、自动添加注释、代码翻译以及智能问答等功能。\nCodeGeeX支持代码生成与补全、注释生成、跨语种代码翻译、智能问答，并支持主流IDE。\n在实际工作中，它更适合个人开发者日常编码；老旧无注释代码维护；多语言迁移改造；内网、涉密、信创环境开发；算法工程师编写实验脚本等。",
    "bestFor": "代码补全、跨语言翻译、中文编程问答和 IDE 内辅助开发",
    "coreCapabilities": [
      "代码生成",
      "代码翻译",
      "多语言",
      "IDE 插件"
    ],
    "homepageUrl": "https://codegeex.cn/",
    "docsUrl": "https://codegeex.cn/docs/",
    "mediaUrl": "https://codegeex.cn/",
    "icon": "fa-code"
  },
  {
    "name": "OpenClaw",
    "company": "OpenClaw Foundation",
    "region": "overseas",
    "toolTypeId": "agent",
    "toolTypeIds": [
      "agent"
    ],
    "toolTypeLabels": [
      "智能体"
    ],
    "externalCategoryRanks": {
      "agent": 5
    },
    "externalSortOrder": 78,
    "externalSortRank": 5,
    "cardSummary": "连接本地系统与消息渠道，让智能体在明确权限内持续执行真实任务。",
    "productIntro": "OpenClaw 是可连接本地系统与消息渠道的开源智能体工具，目标是让 AI 不只回答问题，还能在用户授权范围内读取环境、调用工具并持续执行真实任务。\n它适合个人自动化、消息触发任务、本地文件处理和需要长期运行的工作流。由于能够接触操作系统、账号或外部渠道，部署方式与权限配置会直接影响安全边界。\nOpenClaw 的差异在高度可控和可扩展，但也需要更强的技术管理。建议先在隔离环境试用，只开放必要目录与接口，并为发送、删除、付费和生产操作设置人工确认。",
    "bestFor": "个人常驻助手、邮件日历、消息渠道、定时任务和本地可控自动化",
    "coreCapabilities": [
      "本地运行",
      "持久记忆",
      "聊天渠道",
      "技能与定时任务"
    ],
    "homepageUrl": "https://openclaw.ai/",
    "docsUrl": "https://docs.openclaw.ai/",
    "mediaUrl": "https://openclaw.ai/",
    "icon": "fa-robot"
  },
  {
    "name": "Hermes Agent",
    "company": "Nous Research",
    "region": "overseas",
    "toolTypeId": "agent",
    "toolTypeIds": [
      "agent"
    ],
    "toolTypeLabels": [
      "智能体"
    ],
    "externalCategoryRanks": {
      "agent": 6
    },
    "externalSortOrder": 79,
    "externalSortRank": 6,
    "cardSummary": "在本地或云端调用工具、终端与浏览器，自主完成可验证的复杂任务。",
    "productIntro": "Hermes Agent 是 Nous Research 推出的可执行智能体，能够在本地或云端调用终端、浏览器和其他工具，对复杂目标进行规划、执行与结果验证。\n它适合研究、编码、信息处理和需要多步工具调用的任务，用户可以查看执行过程并根据中间结果调整方向，而不是只接收最终回答。\nHermes Agent 的重点是开放性与可执行性。首次使用应在沙盒中运行，限制网络、文件和密钥访问，并在任何外部写入或不可逆动作前保留人工检查点。",
    "bestFor": "长期个人助手、跨渠道记忆、自动报告、技能积累和本地或云端执行",
    "coreCapabilities": [
      "持久记忆",
      "自生成技能",
      "定时任务",
      "隔离子 Agent"
    ],
    "homepageUrl": "https://hermes-agent.nousresearch.com/",
    "docsUrl": "https://hermes-agent.nousresearch.com/docs/",
    "mediaUrl": "https://hermes-agent.nousresearch.com/",
    "icon": "fa-robot"
  },
  {
    "name": "Genspark",
    "company": "MainFunc",
    "region": "overseas",
    "toolTypeId": "agent",
    "toolTypeIds": [
      "agent"
    ],
    "toolTypeLabels": [
      "智能体"
    ],
    "externalCategoryRanks": {
      "agent": 2
    },
    "externalSortOrder": 81,
    "externalSortRank": 2,
    "cardSummary": "把搜索、研究、演示、表格和多媒体生成整合为可交付成果的通用 Agent。",
    "productIntro": "Genspark 是 MainFunc 推出的智能体工作台。把搜索、研究、演示、表格和多媒体生成整合为可交付成果的通用 Agent。\n主要能力包括Super Agent、深度研究、成果生成、多应用协作。支持多模型混合调度，并行执行多条任务链路；支持联网深度调研、文档处理、生成 PPT 、网站等素材。\n在实际工作中，它更适合深度研究、旅行规划、演示制作、表格任务和多媒体工作流。",
    "bestFor": "深度研究、旅行规划、演示制作、表格任务和多媒体工作流",
    "coreCapabilities": [
      "Super Agent",
      "深度研究",
      "成果生成",
      "多应用协作"
    ],
    "homepageUrl": "https://www.genspark.ai/",
    "mediaUrl": "https://www.genspark.ai/",
    "icon": "fa-robot"
  },
  {
    "name": "Manus",
    "company": "Manus",
    "region": "overseas",
    "toolTypeId": "agent",
    "toolTypeIds": [
      "agent"
    ],
    "toolTypeLabels": [
      "智能体"
    ],
    "externalCategoryRanks": {
      "agent": 1
    },
    "externalSortOrder": 82,
    "externalSortRank": 1,
    "cardSummary": "把一个目标拆成网页操作、资料处理与内容制作步骤，最终交付完整结果。",
    "productIntro": "Manus 是面向完整任务交付的通用智能体，能够把一个目标拆成网页操作、资料检索、文件处理和内容制作步骤，并持续执行到形成结果。\n它适合研究、旅行或采购方案、网页信息处理、表格与文档制作等需要多种工具协同的任务。用户可以查看任务进度、补充要求并接收最终文件或页面。\nManus 的差异在跨工具执行，而不是单轮问答。连接账号或让其执行外部动作前，应明确数据范围、付费与发布边界，并对关键来源和最终产物进行复核。",
    "bestFor": "通用任务执行、研究、网站与应用、演示、数据处理和浏览器操作",
    "coreCapabilities": [
      "自主规划",
      "云端计算机",
      "Wide Research",
      "多种成果交付"
    ],
    "homepageUrl": "https://manus.im/",
    "docsUrl": "https://manus.im/docs/introduction/welcome",
    "mediaUrl": "https://manus.im/",
    "icon": "fa-robot"
  },
  {
    "name": "Qwen Work",
    "company": "阿里",
    "region": "domestic",
    "toolTypeId": "agent",
    "toolTypeIds": [
      "agent"
    ],
    "toolTypeLabels": [
      "智能体"
    ],
    "externalCategoryRanks": {
      "agent": 4
    },
    "externalSortOrder": 84,
    "externalSortRank": 4,
    "cardSummary": "企业级多形态 AI 智能体工作台，侧重办公全流程自动化、团队技能沉淀；与同类工具相比更适配钉钉生态、企业协同办公任务。",
    "productIntro": "Qwen Work阿里巴巴推出面向个人与企业的全链路职场 AI 智能体工作台，统一整合桌面、云端、企业协同三类智能体，深度打通钉钉生态。\n通过自然语言下达完整目标，AI 自主拆解步骤持续执行，成熟流程可保存为团队共享技能，支持多端随时追踪、接管任务进度。\n擅长多模态文件解析、文档 / PPT / 报表自动产出、本地文件处理、自定义岗位 Skill 沉淀、任务自动化。",
    "bestFor": "办公自动化、长文档撰写、数据分析报表、可复用岗位工作流沉淀、钉钉联动业务处理",
    "coreCapabilities": [
      "多端协同 Agent",
      "本地文件自动化",
      "自定义 Skill 工作流",
      "多模态理解"
    ],
    "homepageUrl": "https://qwenwork.cn",
    "docsUrl": "https://help.aliyun.com/zh/qwenwork/",
    "mediaUrl": "https://qwenwork.cn",
    "icon": "fa-robot"
  },
  {
    "name": "Trae Work",
    "company": "字节",
    "region": "domestic",
    "toolTypeId": "agent",
    "toolTypeIds": [
      "agent"
    ],
    "toolTypeLabels": [
      "智能体"
    ],
    "externalCategoryRanks": {
      "agent": 5
    },
    "externalSortOrder": 85,
    "externalSortRank": 5,
    "cardSummary": "字节 AI 原生智能体工作台，兼顾通用办公与开发任务；相比同类，代码工程能力更强，支持跨设备远程下发异步任务。",
    "productIntro": "Trae Work字节 AI 原生全员生产力工作台，设置 Work、Code、Design 三大模式，覆盖办公、研发、设计人群，支持网页、桌面、移动端三端互通。\n支持按需切换工作模式，以自然语言发起项目任务，AI 在云端或配对设备后台自主执行，过程支持实时批注、分阶段迭代成果。\n擅长多文件联合解析、文档与数据报表生成、项目级代码生成调试、跨设备远程异步任务、云端多任务并行运行。",
    "bestFor": "产品文档、数据分析报表、前端项目开发、跨设备远程异步任务、运营内容批量产出",
    "coreCapabilities": [
      "办公 + 代码双模",
      "远程跨设备任务",
      "多文件联合解析",
      "项目级代码生成",
      "云端并行任务"
    ],
    "homepageUrl": "https://www.trae.cn",
    "docsUrl": "https://www.trae.cn/docs",
    "mediaUrl": "https://www.trae.cn/sem-work-ide",
    "icon": "fa-robot"
  },
  {
    "name": "Kimi Work",
    "company": "月之暗面",
    "region": "domestic",
    "toolTypeId": "agent",
    "toolTypeIds": [
      "agent"
    ],
    "toolTypeLabels": [
      "智能体"
    ],
    "externalCategoryRanks": {
      "agent": 2
    },
    "externalSortOrder": 86,
    "externalSortRank": 2,
    "cardSummary": "本地运行桌面 AI 智能体，依托 Kimi 超长文本理解优势，自主操作本地文件与浏览器，擅长资料调研、多文档深度整合与长时间连续任务。",
    "productIntro": "Kimi Work月之暗面 Moonshot 推出桌面端本地 AI 智能体，依托 Kimi 长上下文底座，面向研究员、金融从业者等知识密集型工作者。\n常驻电脑后台，接收目标指令自主完成文件读取、网页检索、数据汇总，可持续运行长周期调研任务，并定时输出标准化成果。\n擅长百万级长文档精读、本地文件访问、WebBridge 网页自动化采集、多子智能体并行运算、定时任务调度、多源信息整合汇总。",
    "bestFor": "深度行业研究、文献批量研读、网页数据自动采集、定时报表、金融信息持续跟踪",
    "coreCapabilities": [
      "百万级长上下文",
      "本地文件自动化",
      "浏览器自主浏览",
      "300 子 Agent 集群",
      "定时任务调度"
    ],
    "homepageUrl": "https://www.kimi.com/zh-cn/products/kimi-work",
    "docsUrl": "https://www.kimi.com/zh-cn/help/",
    "mediaUrl": "https://www.kimi.com/zh-cn/resources/kimi-work-introduction",
    "icon": "fa-robot"
  },
  {
    "name": "LibTV",
    "company": "LiblibAI",
    "region": "domestic",
    "toolTypeId": "video",
    "toolTypeIds": [
      "video"
    ],
    "toolTypeLabels": [
      "视频与数字人"
    ],
    "externalCategoryRanks": {
      "video": 4
    },
    "externalSortOrder": 87,
    "externalSortRank": 4,
    "cardSummary": "专业节点式 AI 视频创作平台，聚焦从剧本、分镜到成片全链路视频生产，区别通用办公工具，专注动态影像内容创作。",
    "productIntro": "LibTV LiblibAI 推出的一站式 AI 视频创作平台，定位面向创作者与 AI 智能体的专业一站式 AI 视频创作引擎。\n创作者通过无限画布完成从剧本、分镜到成片的完整创作流程，享受角色控制、灯光运镜等 20+ 专业功能；Agent 可通过 Skill 接口调用平台能力，一句话生成短剧、复刻视频或制作 MV。\n适用于短视频、广告片、电影制作、创意短片制作，既适合人工精细化调校镜头画面，也支持 AI Agent 全自动批量产出视频内容，解决多工具切换、镜头角色崩坏、创作流程割裂痛点。",
    "bestFor": "AI 短剧、广告宣传片、二次元动画、产品动态视觉、批量短视频量产、影视分镜设计",
    "coreCapabilities": [
      "无限画布节点工作流",
      "角色一致性控制",
      "多模型视频生成",
      "运镜参数调节",
      "剧本到成片闭环"
    ],
    "homepageUrl": "https://www.liblib.tv",
    "docsUrl": "https://www.liblib.tv/docs",
    "mediaUrl": "https://www.liblib.tv/blog/libtv-intro",
    "icon": "fa-video"
  },
  {
    "name": "Stable Diffusion",
    "company": "Stability AI",
    "region": "overseas",
    "toolTypeId": "image",
    "toolTypeIds": [
      "image",
      "video"
    ],
    "toolTypeLabels": [
      "图像与设计",
      "视频与数字人"
    ],
    "externalCategoryRanks": {
      "image": 5,
      "video": 6
    },
    "externalSortOrder": 88,
    "externalSortRank": 5,
    "cardSummary": "开源扩散图像生成基础模型，核心用于文生图、图像编辑；区别成品平台，高度可自定义，支持本地部署、插件与模型二次微调。",
    "productIntro": "Stable Diffusion定位开源通用文生图扩散基础模型，面向创作者、开发者、研究人员开放模型权重。\n主要能力包括文生图、图生图、图像局部重绘、高清放大、风格迁移，支持 LoRA 微调、自定义模型训练，提供 API 与本地部署方案。\n适用任务于概念原画、营销海报、插画、素材生成、视觉原型设计；开发者可基于模型搭建自有绘图应用，研究者开展生成算法实验。与闭源绘图产品差异在于高度开放，允许合规前提下自主改造与商用部署。",
    "bestFor": "概念原画、创意插画、设计素材、图片创意修改、定制美术素材、批量视觉配图",
    "coreCapabilities": [
      "文生 / 图生图像",
      "局部重绘",
      "ControlNet 精准构图",
      "开源可本地部署",
      "海量社区微调模型"
    ],
    "homepageUrl": "https://stability.ai/",
    "docsUrl": "https://stability.ai/guides",
    "mediaUrl": "https://stability.ai/",
    "icon": "fa-image"
  }
] as const;


