/**
 * 外部工具统一目录种子。
 *
 * 运行时权威是 workspace marketplace 快照；此清单只用于首次初始化和显式目录版本迁移。
 * 同名产品合并；toolTypeIds 保留多分类；externalCategoryRanks 保留分类内排序。
 */
export const EXTERNAL_TOOLS_EXCEL_VERSION = '1.1.0-canonical-external-tools';
export const EXTERNAL_TOOLS_EXCEL = [
  {
    "id": "tool-saas-chatgpt",
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
    "id": "tool-saas-claude",
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
    "id": "tool-saas-deepseek",
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
    "id": "tool-saas-kimi",
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
    "id": "tool-saas-perplexity",
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
    "id": "tool-saas-metaso",
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
    "id": "tool-ext-notebooklm",
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
    "id": "tool-saas-notion-ai",
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
    "id": "tool-saas-gamma",
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
    "id": "tool-saas-midjourney",
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
    "id": "tool-saas-jimeng",
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
    "id": "tool-saas-runway",
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
    "id": "tool-ext-elevenlabs",
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
    "id": "tool-ext-t1fd65bfeda",
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
    "id": "tool-saas-cursor",
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
    "id": "tool-ext-t03d8f35876",
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
    "id": "tool-ext--coze",
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
    "id": "tool-saas-gemini",
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
    "id": "tool-ext-grok",
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
    "id": "tool-saas-doubao",
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
    "id": "tool-saas-tongyi",
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
    "id": "tool-ext-ai",
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
    "id": "tool-ext-t8563e24dc0",
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
    "id": "tool-ext-grammarly",
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
    "id": "tool-ext-beautiful-ai",
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
    "id": "tool-ext-wps-ai",
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
    "id": "tool-ext-te06e975987",
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
    "id": "tool-saas-tongyi-2",
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
    "id": "tool-ext-google-flow-veo",
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
    "id": "tool-ext-heygen",
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
    "id": "tool-saas-kling",
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
    "id": "tool-ext-suno",
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
    "id": "tool-ext-mureka",
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
    "id": "tool-ext-otter-ai",
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
    "id": "tool-ext-zoom-ai-companion",
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
    "id": "tool-ext--ai",
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
    "id": "tool-ext-t13eee22e20",
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
    "id": "tool-saas-workbuddy",
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
    "id": "tool-ext-codex",
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
    "id": "tool-saas-claude-code",
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
    "id": "tool-saas-copilot",
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
    "id": "tool-saas-trae",
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
    "id": "tool-ext--codebuddy",
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
    "id": "tool-ext-dify",
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
    "id": "tool-ext-synthesia",
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
    "id": "tool-ext-fireflies-ai",
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
    "id": "tool-ext-ima",
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
    "id": "tool-ext-meta-ai",
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
    "id": "tool-saas-yuanbao",
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
    "id": "tool-ext-ai-3",
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
    "id": "tool-ext-obsidian",
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
    "id": "tool-ext-aippt",
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
    "id": "tool-saas-chatgpt-2",
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
    "id": "tool-ext-nano-banana-2",
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
    "id": "tool-saas-flux",
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
    "id": "tool-ext-liblibai",
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
    "id": "tool-ext-ai-8",
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
    "id": "tool-saas-wanxiang",
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
    "id": "tool-ext-minimax-audio",
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
    "id": "tool-ext-cosyvoice",
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
    "id": "tool-ext-tf7ed573b17",
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
    "id": "tool-ext-t0956c4653b",
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
    "id": "tool-saas-windsurf",
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
    "id": "tool-ext-codegeex",
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
    "id": "tool-ext-openclaw",
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
    "id": "tool-ext-hermes-agent",
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
    "id": "tool-ext-genspark",
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
    "id": "tool-ext-manus",
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
    "id": "tool-excel-qwen-work",
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
    "id": "tool-excel-trae-work",
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
    "id": "tool-excel-kimi-work",
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
    "id": "tool-excel-libtv",
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
    "id": "tool-excel-stable-diffusion",
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
  },
  {
    "id": "tool-ext-deepl",
    "name": "DeepL",
    "company": "DeepL SE",
    "region": "overseas",
    "toolTypeId": "writing",
    "toolTypeIds": [
      "writing"
    ],
    "toolTypeLabels": [
      "写作与翻译"
    ],
    "externalCategoryRanks": {
      "writing": 1
    },
    "externalSortOrder": 89,
    "externalSortRank": 1,
    "cardSummary": "面向专业沟通的机器翻译与多语言写作优化平台",
    "productIntro": "面向专业沟通的机器翻译与多语言写作优化平台。",
    "bestFor": "跨语言邮件、正式文档、本地化与英文表达润色",
    "coreCapabilities": [
      "文档翻译",
      "术语表",
      "DeepL Write",
      "企业安全"
    ],
    "homepageUrl": "https://www.deepl.com/",
    "docsUrl": "https://support.deepl.com/",
    "mediaUrl": "https://www.deepl.com/en/features",
    "icon": "fa-pen"
  },
  {
    "id": "tool-ext-power-bi-copilot",
    "name": "Power BI Copilot",
    "company": "Microsoft",
    "region": "overseas",
    "toolTypeId": "data",
    "toolTypeIds": [
      "data"
    ],
    "toolTypeLabels": [
      "数据分析"
    ],
    "externalCategoryRanks": {
      "data": 1
    },
    "externalSortOrder": 90,
    "externalSortRank": 1,
    "cardSummary": "在 Power BI 中以自然语言创建报表、摘要和数据洞察",
    "productIntro": "在 Power BI 中以自然语言创建报表、摘要和数据洞察。",
    "bestFor": "经营看板、管理层摘要、探索式分析和报表搭建",
    "coreCapabilities": [
      "自然语言问数",
      "报表生成",
      "叙述摘要",
      "数据模型协作"
    ],
    "homepageUrl": "https://powerbi.microsoft.com/",
    "docsUrl": "https://learn.microsoft.com/en-us/power-bi/create-reports/copilot-introduction",
    "mediaUrl": "https://powerbi.microsoft.com/en-us/copilot/",
    "icon": "fa-chart-line"
  },
  {
    "id": "tool-ext-n8n",
    "name": "n8n",
    "company": "n8n GmbH",
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
    "externalSortOrder": 91,
    "externalSortRank": 1,
    "cardSummary": "可视化编排应用、数据和 AI 智能体流程的低代码自动化平台",
    "productIntro": "可视化编排应用、数据和 AI 智能体流程的低代码自动化平台。",
    "bestFor": "跨系统流程、内容管线、通知同步和企业 AI 工作流",
    "coreCapabilities": [
      "工作流编排",
      "AI Agent",
      "自托管",
      "丰富连接器"
    ],
    "homepageUrl": "https://n8n.io/",
    "docsUrl": "https://docs.n8n.io/",
    "mediaUrl": "https://n8n.io/ai/",
    "icon": "fa-robot"
  },
  {
    "id": "tool-ext-google-ai-mode",
    "name": "Google AI Mode",
    "company": "Google",
    "region": "overseas",
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
    "externalSortOrder": 92,
    "externalSortRank": 1,
    "cardSummary": "在 Google 搜索中用生成式 AI 完成多步骤提问、比较和网页探索",
    "productIntro": "在 Google 搜索中用生成式 AI 完成多步骤提问、比较和网页探索。",
    "bestFor": "开放网络检索、旅行与购物比较、复杂问题的多轮追问",
    "coreCapabilities": [
      "多步骤搜索",
      "追问",
      "网页链接",
      "视觉搜索"
    ],
    "homepageUrl": "https://search.google/ways-to-search/ai-mode/",
    "docsUrl": "https://support.google.com/websearch/answer/16011537",
    "mediaUrl": "https://search.google/ways-to-search/ai-mode/",
    "icon": "fa-magnifying-glass"
  },
  {
    "id": "tool-ext-you-com",
    "name": "You.com",
    "company": "You.com",
    "region": "overseas",
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
    "externalSortOrder": 93,
    "externalSortRank": 1,
    "cardSummary": "面向个人与企业的可定制 AI 搜索、研究与答案 API 平台",
    "productIntro": "面向个人与企业的可定制 AI 搜索、研究与答案 API 平台。",
    "bestFor": "网页研究、企业搜索集成、可控来源和多模型问答",
    "coreCapabilities": [
      "AI Search",
      "Research",
      "来源控制",
      "Search API"
    ],
    "homepageUrl": "https://you.com/",
    "docsUrl": "https://documentation.you.com/",
    "mediaUrl": "https://you.com/platform",
    "icon": "fa-magnifying-glass"
  },
  {
    "id": "tool-ext-readwise-reader",
    "name": "Readwise Reader",
    "company": "Readwise",
    "region": "overseas",
    "toolTypeId": "knowledge",
    "toolTypeIds": [
      "knowledge"
    ],
    "toolTypeLabels": [
      "知识管理与写作"
    ],
    "externalCategoryRanks": {
      "knowledge": 1
    },
    "externalSortOrder": 94,
    "externalSortRank": 1,
    "cardSummary": "集中阅读网页、PDF、邮件与电子书并通过 AI 进行提炼和回顾",
    "productIntro": "集中阅读网页、PDF、邮件与电子书并通过 AI 进行提炼和回顾。",
    "bestFor": "个人知识输入、长文阅读、标注沉淀与间隔复习",
    "coreCapabilities": [
      "稍后读",
      "Ghostreader AI",
      "高亮同步",
      "每日回顾"
    ],
    "homepageUrl": "https://readwise.io/read",
    "docsUrl": "https://docs.readwise.io/reader/docs",
    "mediaUrl": "https://readwise.io/read",
    "icon": "fa-book"
  },
  {
    "id": "tool-ext-glean",
    "name": "Glean",
    "company": "Glean Technologies",
    "region": "overseas",
    "toolTypeId": "knowledge",
    "toolTypeIds": [
      "knowledge"
    ],
    "toolTypeLabels": [
      "知识管理与写作"
    ],
    "externalCategoryRanks": {
      "knowledge": 1
    },
    "externalSortOrder": 95,
    "externalSortRank": 1,
    "cardSummary": "面向企业内部数据、知识与应用的 AI 搜索和工作助手平台",
    "productIntro": "面向企业内部数据、知识与应用的 AI 搜索和工作助手平台。",
    "bestFor": "跨系统企业搜索、知识问答、专家发现与内部智能体",
    "coreCapabilities": [
      "企业搜索",
      "权限感知",
      "Glean Assistant",
      "Agent Builder"
    ],
    "homepageUrl": "https://www.glean.com/",
    "docsUrl": "https://docs.glean.com/",
    "mediaUrl": "https://www.glean.com/product/assistant",
    "icon": "fa-book"
  },
  {
    "id": "tool-ext-writer",
    "name": "WRITER",
    "company": "Writer, Inc.",
    "region": "overseas",
    "toolTypeId": "writing",
    "toolTypeIds": [
      "writing"
    ],
    "toolTypeLabels": [
      "写作与翻译"
    ],
    "externalCategoryRanks": {
      "writing": 1
    },
    "externalSortOrder": 96,
    "externalSortRank": 1,
    "cardSummary": "面向企业治理、品牌一致性与业务智能体的生成式 AI 平台",
    "productIntro": "面向企业治理、品牌一致性与业务智能体的生成式 AI 平台。",
    "bestFor": "企业内容生产、品牌规范、受控知识与部门智能体",
    "coreCapabilities": [
      "企业写作",
      "品牌规则",
      "知识图谱",
      "AI Studio"
    ],
    "homepageUrl": "https://writer.com/",
    "docsUrl": "https://dev.writer.com/",
    "mediaUrl": "https://writer.com/product/",
    "icon": "fa-pen"
  },
  {
    "id": "tool-ext-canva-magic-studio",
    "name": "Canva Magic Studio",
    "company": "Canva",
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
    "externalSortOrder": 97,
    "externalSortRank": 1,
    "cardSummary": "在 Canva 内生成并编辑演示、文档、图片和品牌内容",
    "productIntro": "在 Canva 内生成并编辑演示、文档、图片和品牌内容。",
    "bestFor": "品牌演示、社媒物料、协作文档与快速视觉排版",
    "coreCapabilities": [
      "Magic Design",
      "演示生成",
      "品牌套件",
      "协作编辑"
    ],
    "homepageUrl": "https://www.canva.com/magic/",
    "docsUrl": "https://www.canva.com/help/using-magic-studio/",
    "mediaUrl": "https://www.canva.com/magic/",
    "icon": "fa-file-powerpoint"
  },
  {
    "id": "tool-ext-adobe-firefly",
    "name": "Adobe Firefly",
    "company": "Adobe",
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
    "externalSortOrder": 98,
    "externalSortRank": 1,
    "cardSummary": "面向商业创意工作流的生成式图像、视频与设计平台",
    "productIntro": "面向商业创意工作流的生成式图像、视频与设计平台。",
    "bestFor": "品牌创意、商业设计、Adobe 工作流与可控图像编辑",
    "coreCapabilities": [
      "文本生图",
      "生成式填充",
      "文本效果",
      "Creative Cloud 集成"
    ],
    "homepageUrl": "https://www.adobe.com/products/firefly.html",
    "docsUrl": "https://helpx.adobe.com/firefly/get-set-up/learn-the-basics/adobe-firefly-faq.html",
    "mediaUrl": "https://www.adobe.com/products/firefly/features.html",
    "icon": "fa-image"
  },
  {
    "id": "tool-saas-ideogram",
    "name": "Ideogram",
    "company": "Ideogram AI",
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
    "externalSortOrder": 99,
    "externalSortRank": 1,
    "cardSummary": "以文字排版、海报创意和可控图像生成见长的视觉平台",
    "productIntro": "以文字排版、海报创意和可控图像生成见长的视觉平台。",
    "bestFor": "含文字海报、品牌概念、社媒视觉和快速构图",
    "coreCapabilities": [
      "文字渲染",
      "Style Reference",
      "Magic Fill",
      "Canvas"
    ],
    "homepageUrl": "https://ideogram.ai/",
    "docsUrl": "https://docs.ideogram.ai/",
    "mediaUrl": "https://ideogram.ai/",
    "icon": "fa-image"
  },
  {
    "id": "tool-ext-recraft",
    "name": "Recraft",
    "company": "Recraft",
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
    "externalSortOrder": 100,
    "externalSortRank": 1,
    "cardSummary": "专注设计一致性、品牌视觉与矢量资产的 AI 创作平台",
    "productIntro": "专注设计一致性、品牌视觉与矢量资产的 AI 创作平台。",
    "bestFor": "品牌系统、矢量图标、营销素材和系列视觉一致性",
    "coreCapabilities": [
      "矢量生成",
      "品牌风格",
      "图像编辑",
      "Mockup"
    ],
    "homepageUrl": "https://www.recraft.ai/",
    "docsUrl": "https://www.recraft.ai/docs",
    "mediaUrl": "https://www.recraft.ai/blog/introducing-recraft-v4-design-taste-meets-image-generation",
    "icon": "fa-image"
  },
  {
    "id": "tool-ext-udio",
    "name": "Udio",
    "company": "Uncharted Labs",
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
    "externalSortOrder": 101,
    "externalSortRank": 1,
    "cardSummary": "通过文本提示创作、延展和编辑高质量音乐的生成平台",
    "productIntro": "通过文本提示创作、延展和编辑高质量音乐的生成平台。",
    "bestFor": "音乐创作探索、风格迭代、短配乐和歌曲原型",
    "coreCapabilities": [
      "文本生成音乐",
      "音频延展",
      "局部编辑",
      "风格提示"
    ],
    "homepageUrl": "https://www.udio.com/",
    "docsUrl": "https://www.udio.com/guide",
    "mediaUrl": "https://www.udio.com/",
    "icon": "fa-microphone"
  },
  {
    "id": "tool-ext-descript",
    "name": "Descript",
    "company": "Descript",
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
    "externalSortOrder": 102,
    "externalSortRank": 1,
    "cardSummary": "通过编辑文字稿来剪辑播客与视频，并用 AI 完成声音和画面处理",
    "productIntro": "通过编辑文字稿来剪辑播客与视频，并用 AI 完成声音和画面处理。",
    "bestFor": "播客剪辑、访谈视频、字幕、降噪与快速内容再利用",
    "coreCapabilities": [
      "文本式剪辑",
      "AI 共同编辑",
      "声音修复",
      "字幕与片段"
    ],
    "homepageUrl": "https://www.descript.com/",
    "docsUrl": "https://help.descript.com/",
    "mediaUrl": "https://www.descript.com/underlord",
    "icon": "fa-microphone"
  },
  {
    "id": "tool-ext-granola",
    "name": "Granola",
    "company": "Granola",
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
    "externalSortOrder": 103,
    "externalSortRank": 1,
    "cardSummary": "将个人笔记与会议音频结合，生成结构自然、可编辑的会议记录",
    "productIntro": "将个人笔记与会议音频结合，生成结构自然、可编辑的会议记录。",
    "bestFor": "一对一、访谈、客户沟通和不希望机器人入会的场景",
    "coreCapabilities": [
      "无机器人记录",
      "增强个人笔记",
      "会议模板",
      "团队共享"
    ],
    "homepageUrl": "https://www.granola.ai/",
    "docsUrl": "https://help.granola.ai/",
    "mediaUrl": "https://www.granola.ai/",
    "icon": "fa-users"
  },
  {
    "id": "tool-ext-tableau-agent",
    "name": "Tableau Agent",
    "company": "Salesforce",
    "region": "overseas",
    "toolTypeId": "data",
    "toolTypeIds": [
      "data"
    ],
    "toolTypeLabels": [
      "数据分析"
    ],
    "externalCategoryRanks": {
      "data": 1
    },
    "externalSortOrder": 104,
    "externalSortRank": 1,
    "cardSummary": "在 Tableau 中通过自然语言探索数据、创建可视化和解释洞察",
    "productIntro": "在 Tableau 中通过自然语言探索数据、创建可视化和解释洞察。",
    "bestFor": "自助 BI、可视化探索、仪表板制作与业务问题追问",
    "coreCapabilities": [
      "自然语言分析",
      "可视化生成",
      "计算辅助",
      "洞察解释"
    ],
    "homepageUrl": "https://www.tableau.com/products/tableau-agent",
    "docsUrl": "https://help.tableau.com/current/online/en-us/tableau_gai_einstein.htm",
    "mediaUrl": "https://www.tableau.com/products/tableau-agent",
    "icon": "fa-chart-line"
  },
  {
    "id": "tool-ext-hex",
    "name": "Hex",
    "company": "Hex Technologies",
    "region": "overseas",
    "toolTypeId": "data",
    "toolTypeIds": [
      "data"
    ],
    "toolTypeLabels": [
      "数据分析"
    ],
    "externalCategoryRanks": {
      "data": 1
    },
    "externalSortOrder": 105,
    "externalSortRank": 1,
    "cardSummary": "把 SQL、Python、数据应用与 AI 分析协作整合在同一工作区",
    "productIntro": "把 SQL、Python、数据应用与 AI 分析协作整合在同一工作区。",
    "bestFor": "分析团队协作、可复现研究、数据应用和技术型问数",
    "coreCapabilities": [
      "Notebook",
      "SQL 与 Python",
      "Hex AI",
      "数据应用"
    ],
    "homepageUrl": "https://hex.tech/",
    "docsUrl": "https://learn.hex.tech/docs",
    "mediaUrl": "https://hex.tech/product/ai/",
    "icon": "fa-chart-line"
  },
  {
    "id": "tool-ext-julius-ai",
    "name": "Julius AI",
    "company": "Julius AI",
    "region": "overseas",
    "toolTypeId": "data",
    "toolTypeIds": [
      "data"
    ],
    "toolTypeLabels": [
      "数据分析"
    ],
    "externalCategoryRanks": {
      "data": 1
    },
    "externalSortOrder": 106,
    "externalSortRank": 1,
    "cardSummary": "用自然语言分析表格、生成图表并执行统计与预测任务",
    "productIntro": "用自然语言分析表格、生成图表并执行统计与预测任务。",
    "bestFor": "快速表格分析、统计检验、可视化和非技术人员问数",
    "coreCapabilities": [
      "文件分析",
      "图表生成",
      "统计分析",
      "预测模型"
    ],
    "homepageUrl": "https://julius.ai/",
    "docsUrl": "https://help.julius.ai/",
    "mediaUrl": "https://julius.ai/",
    "icon": "fa-chart-line"
  },
  {
    "id": "tool-ext-zapier-ai",
    "name": "Zapier AI",
    "company": "Zapier",
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
    "externalSortOrder": 107,
    "externalSortRank": 1,
    "cardSummary": "连接数千款应用，通过自然语言构建自动化流程与业务智能体",
    "productIntro": "连接数千款应用，通过自然语言构建自动化流程与业务智能体。",
    "bestFor": "跨 SaaS 自动化、营销运营、销售流程和无代码智能体",
    "coreCapabilities": [
      "应用连接",
      "Zapier Agents",
      "AI Actions",
      "无代码工作流"
    ],
    "homepageUrl": "https://zapier.com/ai",
    "docsUrl": "https://help.zapier.com/",
    "mediaUrl": "https://zapier.com/agents",
    "icon": "fa-robot"
  },
  {
    "id": "tool-ext-make-ai-agents",
    "name": "Make AI Agents",
    "company": "Make",
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
    "externalSortOrder": 108,
    "externalSortRank": 1,
    "cardSummary": "以可视化场景编排应用、数据和可审计 AI 智能体流程",
    "productIntro": "以可视化场景编排应用、数据和可审计 AI 智能体流程。",
    "bestFor": "复杂业务流程、系统集成、可视化调试和运营自动化",
    "coreCapabilities": [
      "可视化编排",
      "AI Agents",
      "应用连接器",
      "运行监控"
    ],
    "homepageUrl": "https://www.make.com/en/ai-agents",
    "docsUrl": "https://help.make.com/",
    "mediaUrl": "https://www.make.com/en/ai-agents",
    "icon": "fa-robot"
  },
  {
    "id": "tool-saas-ms-copilot",
    "name": "Microsoft 365 Copilot",
    "company": "Microsoft",
    "region": "overseas",
    "toolTypeId": "general",
    "toolTypeIds": [
      "general"
    ],
    "toolTypeLabels": [
      "通用AI助手"
    ],
    "externalCategoryRanks": {
      "general": 1
    },
    "externalSortOrder": 109,
    "externalSortRank": 1,
    "cardSummary": "贯穿 Word、Excel、PowerPoint、Outlook 与 Teams 的企业级 AI 办公助手",
    "productIntro": "贯穿 Word、Excel、PowerPoint、Outlook 与 Teams 的企业级 AI 办公助手。",
    "bestFor": "Office 文档协作、邮件与会议总结、数据分析、研究报告和工作智能体",
    "coreCapabilities": [
      "Office 应用协作",
      "Researcher",
      "Analyst",
      "自定义 Agents"
    ],
    "homepageUrl": "https://m365.cloud.microsoft/",
    "docsUrl": "https://support.microsoft.com/en-us/microsoft-365-copilot/",
    "mediaUrl": "https://www.microsoft.com/en-us/microsoft-365-copilot",
    "icon": "fa-comments"
  },
  {
    "id": "tool-ext-elicit",
    "name": "Elicit",
    "company": "Elicit",
    "region": "overseas",
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
    "externalSortOrder": 110,
    "externalSortRank": 1,
    "cardSummary": "面向科学研究的论文检索、证据提取与系统综述工作台",
    "productIntro": "面向科学研究的论文检索、证据提取与系统综述工作台。",
    "bestFor": "学术检索、文献综述、论文对比、证据提取和系统性研究",
    "coreCapabilities": [
      "论文语义检索",
      "研究报告",
      "数据提取",
      "系统综述"
    ],
    "homepageUrl": "https://elicit.com/",
    "docsUrl": "https://support.elicit.com/",
    "mediaUrl": "https://elicit.com/solutions/systematic-review",
    "icon": "fa-magnifying-glass"
  },
  {
    "id": "tool-ext-consensus",
    "name": "Consensus",
    "company": "Consensus",
    "region": "overseas",
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
    "externalSortOrder": 111,
    "externalSortRank": 1,
    "cardSummary": "以同行评审论文为依据生成答案与研究综述的学术搜索引擎",
    "productIntro": "以同行评审论文为依据生成答案与研究综述的学术搜索引擎。",
    "bestFor": "科研事实核验、证据共识判断、论文发现和带引用的学术问答",
    "coreCapabilities": [
      "学术搜索",
      "论文引用",
      "研究综合",
      "质量指标"
    ],
    "homepageUrl": "https://consensus.app/",
    "docsUrl": "https://help.consensus.app/",
    "mediaUrl": "https://consensus.app/home/blog/welcome-to-consensus/",
    "icon": "fa-magnifying-glass"
  },
  {
    "id": "tool-ext-napkin-ai",
    "name": "Napkin AI",
    "company": "Napkin AI",
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
    "externalSortOrder": 112,
    "externalSortRank": 1,
    "cardSummary": "把文字内容快速转成可编辑的信息图、流程图与演示视觉",
    "productIntro": "把文字内容快速转成可编辑的信息图、流程图与演示视觉。",
    "bestFor": "PPT 逻辑图、信息图、流程图、概念可视化和商业叙事",
    "coreCapabilities": [
      "文本转视觉",
      "图示编辑",
      "品牌样式",
      "PPT / SVG 导出"
    ],
    "homepageUrl": "https://www.napkin.ai/",
    "docsUrl": "https://help.napkin.ai/",
    "mediaUrl": "https://www.napkin.ai/",
    "icon": "fa-file-powerpoint"
  },
  {
    "id": "tool-ext-figma-ai",
    "name": "Figma AI",
    "company": "Figma",
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
    "externalSortOrder": 113,
    "externalSortRank": 1,
    "cardSummary": "在协同设计空间中生成设计方向、编辑图像并构建高保真原型",
    "productIntro": "在协同设计空间中生成设计方向、编辑图像并构建高保真原型。",
    "bestFor": "界面设计、交互原型、视觉探索、设计系统和产品协作",
    "coreCapabilities": [
      "设计智能体",
      "图像编辑",
      "Figma Make",
      "协同迭代"
    ],
    "homepageUrl": "https://www.figma.com/ai/",
    "docsUrl": "https://help.figma.com/hc/en-us/articles/23870272542231-Use-AI-tools-in-Figma-Design",
    "mediaUrl": "https://www.figma.com/ai/",
    "icon": "fa-image"
  },
  {
    "id": "tool-ext-fathom",
    "name": "Fathom",
    "company": "Fathom",
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
    "externalSortOrder": 114,
    "externalSortRank": 1,
    "cardSummary": "为 Zoom、Google Meet 与 Teams 自动记录、转写并总结会议",
    "productIntro": "为 Zoom、Google Meet 与 Teams 自动记录、转写并总结会议。",
    "bestFor": "个人会议记录、重点片段回看、行动项提取和 CRM 更新",
    "coreCapabilities": [
      "自动转写",
      "即时摘要",
      "行动项",
      "会议搜索"
    ],
    "homepageUrl": "https://fathom.video/",
    "docsUrl": "https://help.fathom.video/",
    "mediaUrl": "https://fathom.video/for/teams",
    "icon": "fa-users"
  },
  {
    "id": "tool-ext-replit-agent",
    "name": "Replit Agent",
    "company": "Replit",
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
    "externalSortOrder": 115,
    "externalSortRank": 1,
    "cardSummary": "从自然语言需求出发，在云端创建、测试并发布完整应用",
    "productIntro": "从自然语言需求出发，在云端创建、测试并发布完整应用。",
    "bestFor": "零配置原型、全栈应用、快速验证、在线协作和一键发布",
    "coreCapabilities": [
      "应用生成",
      "云端开发",
      "自动调试",
      "一键发布"
    ],
    "homepageUrl": "https://replit.com/ai",
    "docsUrl": "https://docs.replit.com/category/replit-apps",
    "mediaUrl": "https://replit.com/blog/introducing-replit-agent",
    "icon": "fa-code"
  },
  {
    "id": "tool-ext-lovable",
    "name": "Lovable",
    "company": "Lovable",
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
    "externalSortOrder": 116,
    "externalSortRank": 1,
    "cardSummary": "用自然语言生成、迭代并发布网站与全栈应用的 AI 构建平台",
    "productIntro": "用自然语言生成、迭代并发布网站与全栈应用的 AI 构建平台。",
    "bestFor": "非技术人员做应用原型、产品团队快速验证与前后端一体开发",
    "coreCapabilities": [
      "自然语言建站",
      "全栈应用",
      "可视化迭代",
      "云端发布"
    ],
    "homepageUrl": "https://lovable.dev/",
    "docsUrl": "https://docs.lovable.dev/",
    "mediaUrl": "https://lovable.dev/",
    "icon": "fa-code"
  },
  {
    "id": "tool-ext-scite",
    "name": "scite",
    "company": "Research Solutions",
    "region": "overseas",
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
    "externalSortOrder": 117,
    "externalSortRank": 1,
    "cardSummary": "围绕论文引用上下文与证据关系，帮助研究者判断文献是否被支持或反驳",
    "productIntro": "围绕论文引用上下文与证据关系，帮助研究者判断文献是否被支持或反驳。",
    "bestFor": "学术检索、引用核验、文献综述和证据质量判断",
    "coreCapabilities": [
      "Smart Citations",
      "论文搜索",
      "引用语境",
      "研究助手"
    ],
    "homepageUrl": "https://scite.ai/",
    "docsUrl": "https://help.scite.ai/",
    "mediaUrl": "https://scite.ai/",
    "icon": "fa-magnifying-glass"
  },
  {
    "id": "tool-ext-mem",
    "name": "Mem",
    "company": "Mem Labs",
    "region": "overseas",
    "toolTypeId": "knowledge",
    "toolTypeIds": [
      "knowledge"
    ],
    "toolTypeLabels": [
      "知识管理与写作"
    ],
    "externalCategoryRanks": {
      "knowledge": 1
    },
    "externalSortOrder": 118,
    "externalSortRank": 1,
    "cardSummary": "用 AI 自动组织笔记、关联上下文并从个人知识中生成答案与内容",
    "productIntro": "用 AI 自动组织笔记、关联上下文并从个人知识中生成答案与内容。",
    "bestFor": "自动整理笔记、个人知识检索、会议信息沉淀和基于记忆写作",
    "coreCapabilities": [
      "自动组织",
      "语义检索",
      "AI 问答",
      "智能写作"
    ],
    "homepageUrl": "https://get.mem.ai/",
    "docsUrl": "https://help.mem.ai/",
    "mediaUrl": "https://get.mem.ai/",
    "icon": "fa-book"
  },
  {
    "id": "tool-saas-jasper",
    "name": "Jasper",
    "company": "Jasper",
    "region": "overseas",
    "toolTypeId": "writing",
    "toolTypeIds": [
      "writing"
    ],
    "toolTypeLabels": [
      "写作与翻译"
    ],
    "externalCategoryRanks": {
      "writing": 1
    },
    "externalSortOrder": 119,
    "externalSortRank": 1,
    "cardSummary": "面向营销团队的内容平台，强调品牌语调、活动协作和规模化内容生产",
    "productIntro": "面向营销团队的内容平台，强调品牌语调、活动协作和规模化内容生产。",
    "bestFor": "品牌营销文案、Campaign、内容运营和多渠道规模化生产",
    "coreCapabilities": [
      "Brand Voice",
      "营销模板",
      "团队协作",
      "内容工作流"
    ],
    "homepageUrl": "https://www.jasper.ai/",
    "docsUrl": "https://help.jasper.ai/",
    "mediaUrl": "https://www.jasper.ai/",
    "icon": "fa-pen"
  },
  {
    "id": "tool-saas-copyai",
    "name": "Copy.ai",
    "company": "Copy.ai",
    "region": "overseas",
    "toolTypeId": "writing",
    "toolTypeIds": [
      "writing"
    ],
    "toolTypeLabels": [
      "写作与翻译"
    ],
    "externalCategoryRanks": {
      "writing": 1
    },
    "externalSortOrder": 120,
    "externalSortRank": 1,
    "cardSummary": "把销售与营销内容生成嵌入可复用工作流，适合团队批量交付",
    "productIntro": "把销售与营销内容生成嵌入可复用工作流，适合团队批量交付。",
    "bestFor": "营销文案、销售材料、内容再利用和 GTM 工作流",
    "coreCapabilities": [
      "GTM Workflows",
      "品牌语调",
      "批量内容",
      "团队模板"
    ],
    "homepageUrl": "https://www.copy.ai/",
    "docsUrl": "https://support.copy.ai/",
    "mediaUrl": "https://www.copy.ai/",
    "icon": "fa-pen"
  },
  {
    "id": "tool-ext-wordtune",
    "name": "Wordtune",
    "company": "AI21 Labs",
    "region": "overseas",
    "toolTypeId": "writing",
    "toolTypeIds": [
      "writing"
    ],
    "toolTypeLabels": [
      "写作与翻译"
    ],
    "externalCategoryRanks": {
      "writing": 1
    },
    "externalSortOrder": 121,
    "externalSortRank": 1,
    "cardSummary": "围绕改写、语气、清晰度与摘要优化英文表达的 AI 写作助手",
    "productIntro": "围绕改写、语气、清晰度与摘要优化英文表达的 AI 写作助手。",
    "bestFor": "英文润色、改写、语气调整、摘要和商务沟通",
    "coreCapabilities": [
      "Rewrite",
      "语气调整",
      "语法优化",
      "摘要"
    ],
    "homepageUrl": "https://www.wordtune.com/",
    "docsUrl": "https://support.wordtune.com/",
    "mediaUrl": "https://www.wordtune.com/",
    "icon": "fa-pen"
  },
  {
    "id": "tool-ext-plus-ai",
    "name": "Plus AI",
    "company": "Plus",
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
    "externalSortOrder": 122,
    "externalSortRank": 1,
    "cardSummary": "直接在 Google Slides 与 PowerPoint 中生成、重写和重新排版演示文稿",
    "productIntro": "直接在 Google Slides 与 PowerPoint 中生成、重写和重新排版演示文稿。",
    "bestFor": "保留原生 PPT 编辑、企业模板、长文转演示和团队协作",
    "coreCapabilities": [
      "原生插件",
      "生成演示",
      "内容重写",
      "企业模板"
    ],
    "homepageUrl": "https://www.plusdocs.com/",
    "docsUrl": "https://www.plusdocs.com/plus-ai-for-google-slides",
    "mediaUrl": "https://www.plusdocs.com/plus-ai-for-powerpoint",
    "icon": "fa-file-powerpoint"
  },
  {
    "id": "tool-ext-pitch",
    "name": "Pitch",
    "company": "Pitch",
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
    "externalSortOrder": 123,
    "externalSortRank": 1,
    "cardSummary": "面向销售和团队协作的演示平台，用 AI 加速起稿、改写与品牌化排版",
    "productIntro": "面向销售和团队协作的演示平台，用 AI 加速起稿、改写与品牌化排版。",
    "bestFor": "销售演示、团队协作、品牌模板、演示分享和效果分析",
    "coreCapabilities": [
      "AI 起稿",
      "协作编辑",
      "品牌模板",
      "演示分析"
    ],
    "homepageUrl": "https://pitch.com/",
    "docsUrl": "https://help.pitch.com/",
    "mediaUrl": "https://pitch.com/",
    "icon": "fa-file-powerpoint"
  },
  {
    "id": "tool-ext-sora",
    "name": "Sora",
    "company": "OpenAI",
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
    "externalSortOrder": 124,
    "externalSortRank": 1,
    "cardSummary": "从文字、图片或视频出发生成和编辑具有连贯运动与镜头感的视频",
    "productIntro": "从文字、图片或视频出发生成和编辑具有连贯运动与镜头感的视频。",
    "bestFor": "概念短片、分镜预演、营销视频、视觉实验和视频再创作",
    "coreCapabilities": [
      "文生视频",
      "图生视频",
      "视频编辑",
      "故事板"
    ],
    "homepageUrl": "https://sora.com/",
    "mediaUrl": "https://openai.com/sora/",
    "icon": "fa-video"
  },
  {
    "id": "tool-saas-luma",
    "name": "Luma Dream Machine",
    "company": "Luma AI",
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
    "externalSortOrder": 125,
    "externalSortRank": 1,
    "cardSummary": "面向创作者的图像与视频生成平台，突出快速镜头迭代与视觉一致性",
    "productIntro": "面向创作者的图像与视频生成平台，突出快速镜头迭代与视觉一致性。",
    "bestFor": "广告概念、镜头探索、图片动效、创意短片和快速迭代",
    "coreCapabilities": [
      "文生视频",
      "图生视频",
      "关键帧",
      "镜头控制"
    ],
    "homepageUrl": "https://lumalabs.ai/dream-machine",
    "docsUrl": "https://lumalabs.ai/learning-hub",
    "mediaUrl": "https://lumalabs.ai/dream-machine",
    "icon": "fa-video"
  },
  {
    "id": "tool-saas-pika",
    "name": "Pika",
    "company": "Pika Labs",
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
    "externalSortOrder": 126,
    "externalSortRank": 1,
    "cardSummary": "以低门槛特效、图生视频和快速风格化著称的短视频生成工具",
    "productIntro": "以低门槛特效、图生视频和快速风格化著称的短视频生成工具。",
    "bestFor": "社媒短视频、趣味特效、图片动效、产品创意和快速试错",
    "coreCapabilities": [
      "图生视频",
      "视频特效",
      "对象替换",
      "风格化"
    ],
    "homepageUrl": "https://pika.art/",
    "docsUrl": "https://pika.art/",
    "mediaUrl": "https://pika.art/",
    "icon": "fa-video"
  },
  {
    "id": "tool-ext-murf-ai",
    "name": "Murf AI",
    "company": "Murf",
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
    "externalSortOrder": 127,
    "externalSortRank": 1,
    "cardSummary": "面向商业视频和培训内容的 AI 配音工作室，提供多语言语音与团队协作",
    "productIntro": "面向商业视频和培训内容的 AI 配音工作室，提供多语言语音与团队协作。",
    "bestFor": "培训配音、产品解说、广告旁白、多语言视频和团队制作",
    "coreCapabilities": [
      "AI 配音",
      "多语言",
      "语音编辑",
      "团队协作"
    ],
    "homepageUrl": "https://murf.ai/",
    "docsUrl": "https://help.murf.ai/",
    "mediaUrl": "https://murf.ai/",
    "icon": "fa-microphone"
  },
  {
    "id": "tool-ext-adobe-podcast",
    "name": "Adobe Podcast",
    "company": "Adobe",
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
    "externalSortOrder": 128,
    "externalSortRank": 1,
    "cardSummary": "用 AI 清理语音、增强录音质量并简化播客与访谈音频制作",
    "productIntro": "用 AI 清理语音、增强录音质量并简化播客与访谈音频制作。",
    "bestFor": "人声增强、远程录音、播客编辑、访谈清理和音频转写",
    "coreCapabilities": [
      "Enhance Speech",
      "远程录音",
      "转写编辑",
      "麦克风检查"
    ],
    "homepageUrl": "https://podcast.adobe.com/",
    "docsUrl": "https://helpx.adobe.com/podcast/",
    "mediaUrl": "https://podcast.adobe.com/",
    "icon": "fa-microphone"
  },
  {
    "id": "tool-ext-tl-dv",
    "name": "tl;dv",
    "company": "tl;dv",
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
    "externalSortOrder": 129,
    "externalSortRank": 1,
    "cardSummary": "自动记录、转写并总结线上会议，可跨会议检索主题和同步行动项",
    "productIntro": "自动记录、转写并总结线上会议，可跨会议检索主题和同步行动项。",
    "bestFor": "销售访谈、用户研究、团队会议、跨会议洞察和 CRM 同步",
    "coreCapabilities": [
      "会议录制",
      "AI 纪要",
      "跨会议搜索",
      "CRM 集成"
    ],
    "homepageUrl": "https://tldv.io/",
    "docsUrl": "https://intercom.help/tldv/en/",
    "mediaUrl": "https://tldv.io/",
    "icon": "fa-users"
  },
  {
    "id": "tool-ext-rows-ai",
    "name": "Rows AI",
    "company": "Rows",
    "region": "overseas",
    "toolTypeId": "data",
    "toolTypeIds": [
      "data"
    ],
    "toolTypeLabels": [
      "数据分析"
    ],
    "externalCategoryRanks": {
      "data": 1
    },
    "externalSortOrder": 130,
    "externalSortRank": 1,
    "cardSummary": "在在线表格中使用 AI、数据连接器与公式完成分析、清洗和可视化",
    "productIntro": "在在线表格中使用 AI、数据连接器与公式完成分析、清洗和可视化。",
    "bestFor": "营销数据、运营分析、联网取数、表格自动化和团队报表",
    "coreCapabilities": [
      "AI Analyst",
      "数据连接器",
      "表格公式",
      "可视化"
    ],
    "homepageUrl": "https://rows.com/",
    "docsUrl": "https://rows.com/docs",
    "mediaUrl": "https://rows.com/ai",
    "icon": "fa-chart-line"
  },
  {
    "id": "tool-ext-thoughtspot-spotter",
    "name": "ThoughtSpot Spotter",
    "company": "ThoughtSpot",
    "region": "overseas",
    "toolTypeId": "data",
    "toolTypeIds": [
      "data"
    ],
    "toolTypeLabels": [
      "数据分析"
    ],
    "externalCategoryRanks": {
      "data": 1
    },
    "externalSortOrder": 131,
    "externalSortRank": 1,
    "cardSummary": "面向企业数据的对话式分析 Agent，可从业务语义中持续追问并生成洞察",
    "productIntro": "面向企业数据的对话式分析 Agent，可从业务语义中持续追问并生成洞察。",
    "bestFor": "企业自助分析、自然语言问数、指标追踪和业务决策支持",
    "coreCapabilities": [
      "对话式分析",
      "语义层",
      "自动洞察",
      "企业治理"
    ],
    "homepageUrl": "https://www.thoughtspot.com/product/spotter",
    "docsUrl": "https://docs.thoughtspot.com/",
    "mediaUrl": "https://www.thoughtspot.com/product/spotter",
    "icon": "fa-chart-line"
  },
  {
    "id": "tool-ext-v0",
    "name": "v0",
    "company": "Vercel",
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
    "externalSortOrder": 132,
    "externalSortRank": 1,
    "cardSummary": "从自然语言和参考图快速生成高完成度前端界面与可运行 Web 应用",
    "productIntro": "从自然语言和参考图快速生成高完成度前端界面与可运行 Web 应用。",
    "bestFor": "UI 原型、React / Next.js 页面、设计转代码和前端快速迭代",
    "coreCapabilities": [
      "UI 生成",
      "全栈应用",
      "视觉输入",
      "Vercel 发布"
    ],
    "homepageUrl": "https://v0.dev/",
    "docsUrl": "https://v0.dev/docs",
    "mediaUrl": "https://v0.dev/",
    "icon": "fa-code"
  },
  {
    "id": "tool-ext-devin",
    "name": "Devin",
    "company": "Cognition",
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
    "externalSortOrder": 133,
    "externalSortRank": 1,
    "cardSummary": "可在云端环境中独立处理工程任务、运行工具并提交代码成果的软件工程 Agent",
    "productIntro": "可在云端环境中独立处理工程任务、运行工具并提交代码成果的软件工程 Agent。",
    "bestFor": "需求实现、Bug 修复、代码迁移、测试和异步工程任务",
    "coreCapabilities": [
      "自主规划",
      "云端开发环境",
      "代码执行",
      "PR 交付"
    ],
    "homepageUrl": "https://devin.ai/",
    "docsUrl": "https://docs.devin.ai/",
    "mediaUrl": "https://devin.ai/",
    "icon": "fa-code"
  },
  {
    "id": "tool-ext-amazon-q-developer",
    "name": "Amazon Q Developer",
    "company": "AWS",
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
    "externalSortOrder": 134,
    "externalSortRank": 1,
    "cardSummary": "深度连接 AWS 与主流 IDE 的开发助手，覆盖编码、测试、升级和云资源操作",
    "productIntro": "深度连接 AWS 与主流 IDE 的开发助手，覆盖编码、测试、升级和云资源操作。",
    "bestFor": "AWS 开发、Java 升级、代码建议、云资源理解和安全扫描",
    "coreCapabilities": [
      "IDE 助手",
      "AWS 集成",
      "代码转换",
      "安全扫描"
    ],
    "homepageUrl": "https://aws.amazon.com/q/developer/",
    "docsUrl": "https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/",
    "mediaUrl": "https://aws.amazon.com/q/developer/",
    "icon": "fa-code"
  },
  {
    "id": "tool-ext-cline",
    "name": "Cline",
    "company": "Cline",
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
    "externalSortOrder": 135,
    "externalSortRank": 1,
    "cardSummary": "运行在编辑器中的开源编码 Agent，可读写文件、执行命令并连接多种模型",
    "productIntro": "运行在编辑器中的开源编码 Agent，可读写文件、执行命令并连接多种模型。",
    "bestFor": "自选模型、透明工具调用、VS Code 开发、本地任务和可控自动化",
    "coreCapabilities": [
      "开源 Agent",
      "多模型",
      "终端执行",
      "MCP"
    ],
    "homepageUrl": "https://cline.bot/",
    "docsUrl": "https://docs.cline.bot/",
    "mediaUrl": "https://cline.bot/",
    "icon": "fa-code"
  },
  {
    "id": "tool-saas-chatgpt-3",
    "name": "ChatGPT Workspace Agents",
    "company": "OpenAI",
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
    "externalSortOrder": 136,
    "externalSortRank": 1,
    "cardSummary": "在 ChatGPT 工作空间中创建可共享的云端 Agent，连接文件、应用、工具和组织流程",
    "productIntro": "在 ChatGPT 工作空间中创建可共享的云端 Agent，连接文件、应用、工具和组织流程。",
    "bestFor": "研究报告、跨应用流程、团队共享 Agent、定时工作和组织最佳实践",
    "coreCapabilities": [
      "云端执行",
      "连接应用",
      "团队共享",
      "技能与记忆"
    ],
    "homepageUrl": "https://chatgpt.com/",
    "docsUrl": "https://developers.openai.com/",
    "mediaUrl": "https://openai.com/index/introducing-workspace-agents-in-chatgpt/",
    "icon": "fa-robot"
  },
  {
    "id": "tool-ext-codex-cloud",
    "name": "Codex Cloud",
    "company": "OpenAI",
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
    "externalSortOrder": 137,
    "externalSortRank": 1,
    "cardSummary": "把代码任务交给云端智能体并行推进，在隔离环境中实现、测试与交付",
    "productIntro": "在隔离云环境中并行执行长任务，可从网页、GitHub、Linear 或 Slack 委派工作。",
    "bestFor": "后台长任务、多方案并行、代码库任务、自动化交付和异步协作",
    "coreCapabilities": [
      "云端沙箱",
      "并行任务",
      "后台执行",
      "集成委派"
    ],
    "homepageUrl": "https://chatgpt.com/codex",
    "docsUrl": "https://developers.openai.com/codex/cloud",
    "mediaUrl": "https://openai.com/codex/",
    "icon": "fa-robot"
  },
  {
    "id": "tool-ext-ai-2",
    "name": "夸克AI",
    "company": "阿里巴巴",
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
    "externalSortOrder": 138,
    "externalSortRank": 1,
    "cardSummary": "融合搜索、网盘、扫描和内容生成的中文 AI 信息服务",
    "productIntro": "融合搜索、网盘、扫描和内容生成的中文 AI 信息服务。",
    "bestFor": "中文资料搜索、文件总结、学习辅助与移动端信息处理",
    "coreCapabilities": [
      "AI 搜索",
      "深度研究",
      "文件解析",
      "扫描与网盘"
    ],
    "homepageUrl": "https://ai.quark.cn/",
    "docsUrl": "https://ai.quark.cn/",
    "mediaUrl": "https://ai.quark.cn/",
    "icon": "fa-magnifying-glass"
  },
  {
    "id": "tool-ext-tbfab108334",
    "name": "飞书知识问答",
    "company": "飞书",
    "region": "domestic",
    "toolTypeId": "knowledge",
    "toolTypeIds": [
      "knowledge"
    ],
    "toolTypeLabels": [
      "知识管理与写作"
    ],
    "externalCategoryRanks": {
      "knowledge": 1
    },
    "externalSortOrder": 139,
    "externalSortRank": 1,
    "cardSummary": "基于飞书文档、知识库与业务内容进行权限内检索和问答",
    "productIntro": "基于飞书文档、知识库与业务内容进行权限内检索和问答。",
    "bestFor": "组织制度查询、项目知识复用、新人学习与跨文档检索",
    "coreCapabilities": [
      "知识问答",
      "权限继承",
      "来源引用",
      "飞书内容连接"
    ],
    "homepageUrl": "https://www.feishu.cn/hc/zh-CN/articles/854453754409-%E4%BD%BF%E7%94%A8%E7%9F%A5%E8%AF%86%E9%97%AE%E7%AD%94",
    "docsUrl": "https://www.feishu.cn/hc/zh-CN/articles/854453754409-%E4%BD%BF%E7%94%A8%E7%9F%A5%E8%AF%86%E9%97%AE%E7%AD%94",
    "mediaUrl": "https://www.feishu.cn/product/ai",
    "icon": "fa-book"
  },
  {
    "id": "tool-ext-t91df293e5e",
    "name": "秘塔写作猫",
    "company": "秘塔科技",
    "region": "domestic",
    "toolTypeId": "writing",
    "toolTypeIds": [
      "writing"
    ],
    "toolTypeLabels": [
      "写作与翻译"
    ],
    "externalCategoryRanks": {
      "writing": 1
    },
    "externalSortOrder": 140,
    "externalSortRank": 1,
    "cardSummary": "提供中文纠错、改写、续写和排版建议的 AI 写作辅助工具",
    "productIntro": "提供中文纠错、改写、续写和排版建议的 AI 写作辅助工具。",
    "bestFor": "中文公文、报告、长文校对与表达优化",
    "coreCapabilities": [
      "中文纠错",
      "智能改写",
      "文本续写",
      "浏览器插件"
    ],
    "homepageUrl": "https://xiezuocat.com/",
    "docsUrl": "https://xiezuocat.com/",
    "mediaUrl": "https://xiezuocat.com/",
    "icon": "fa-pen"
  },
  {
    "id": "tool-ext-tffe5575282",
    "name": "讯飞写作",
    "company": "科大讯飞",
    "region": "domestic",
    "toolTypeId": "writing",
    "toolTypeIds": [
      "writing"
    ],
    "toolTypeLabels": [
      "写作与翻译"
    ],
    "externalCategoryRanks": {
      "writing": 1
    },
    "externalSortOrder": 141,
    "externalSortRank": 1,
    "cardSummary": "面向中文材料、公文和营销内容的 AI 写作与润色平台",
    "productIntro": "面向中文材料、公文和营销内容的 AI 写作与润色平台。",
    "bestFor": "公文材料、工作总结、营销文案与中文长文",
    "coreCapabilities": [
      "主题写作",
      "公文模板",
      "扩写润色",
      "内容改写"
    ],
    "homepageUrl": "https://huixie.iflyrec.com/",
    "docsUrl": "https://huixie.iflyrec.com/",
    "mediaUrl": "https://huixie.iflyrec.com/",
    "icon": "fa-pen"
  },
  {
    "id": "tool-ext-islide-ai",
    "name": "iSlide AI",
    "company": "成都艾斯莱德网络科技",
    "region": "domestic",
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
    "externalSortOrder": 142,
    "externalSortRank": 1,
    "cardSummary": "围绕 PowerPoint 的 AI 生成、模板素材和批量排版工具",
    "productIntro": "围绕 PowerPoint 的 AI 生成、模板素材和批量排版工具。",
    "bestFor": "企业 PPT 美化、模板复用、批量排版和快速成稿",
    "coreCapabilities": [
      "AI 生成 PPT",
      "模板库",
      "智能排版",
      "图示素材"
    ],
    "homepageUrl": "https://www.islide.cc/",
    "docsUrl": "https://support.islide.cc/",
    "mediaUrl": "https://www.islide.cc/",
    "icon": "fa-file-powerpoint"
  },
  {
    "id": "tool-ext-vidu",
    "name": "Vidu",
    "company": "生数科技",
    "region": "domestic",
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
    "externalSortOrder": 143,
    "externalSortRank": 1,
    "cardSummary": "面向动漫、广告和创意表达的多主体一致性 AI 视频生成平台",
    "productIntro": "面向动漫、广告和创意表达的多主体一致性 AI 视频生成平台。",
    "bestFor": "动漫内容、参考图视频、品牌短片和社媒创意",
    "coreCapabilities": [
      "参考生视频",
      "主体一致性",
      "文生视频",
      "动漫风格"
    ],
    "homepageUrl": "https://www.vidu.com/zh/",
    "docsUrl": "https://www.vidu.com/zh/",
    "mediaUrl": "https://www.vidu.com/zh/",
    "icon": "fa-video"
  },
  {
    "id": "tool-ext-wps-ai-",
    "name": "WPS AI 表格",
    "company": "金山办公",
    "region": "domestic",
    "toolTypeId": "data",
    "toolTypeIds": [
      "data"
    ],
    "toolTypeLabels": [
      "数据分析"
    ],
    "externalCategoryRanks": {
      "data": 1
    },
    "externalSortOrder": 144,
    "externalSortRank": 1,
    "cardSummary": "在 WPS 表格中以自然语言生成公式、分析数据与制作图表",
    "productIntro": "在 WPS 表格中以自然语言生成公式、分析数据与制作图表。",
    "bestFor": "中文办公表格、公式辅助、经营数据整理和快速图表",
    "coreCapabilities": [
      "公式生成",
      "数据问答",
      "智能图表",
      "表格整理"
    ],
    "homepageUrl": "https://ai.wps.cn/",
    "docsUrl": "https://ai.wps.cn/",
    "mediaUrl": "https://ai.wps.cn/",
    "icon": "fa-chart-line"
  },
  {
    "id": "tool-ext-chatexcel",
    "name": "ChatExcel",
    "company": "北京元空智能科技",
    "region": "domestic",
    "toolTypeId": "data",
    "toolTypeIds": [
      "data"
    ],
    "toolTypeLabels": [
      "数据分析"
    ],
    "externalCategoryRanks": {
      "data": 1
    },
    "externalSortOrder": 145,
    "externalSortRank": 1,
    "cardSummary": "以对话处理 Excel、数据库和多格式资料并生成报告与看板",
    "productIntro": "以对话处理 Excel、数据库和多格式资料并生成报告与看板。",
    "bestFor": "复杂表格清洗、跨表分析、自然语言问数与数据报告",
    "coreCapabilities": [
      "AI Excel",
      "ChatDB",
      "多模态资料",
      "报告与看板"
    ],
    "homepageUrl": "https://www.chatexcel.com/",
    "docsUrl": "https://chatexcel.com/blog/tutorial/chatexcel-beginners-guide/",
    "mediaUrl": "https://chatexcel.com/blog/chatexcel-ultra-%E6%A1%8C%E9%9D%A2%E7%89%88%E6%AD%A3%E5%BC%8F%E4%B8%8A%E7%BA%BF%EF%BC%81/",
    "icon": "fa-chart-line"
  },
  {
    "id": "tool-ext-t41f06b73fa",
    "name": "腾讯元器",
    "company": "腾讯",
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
    "externalSortOrder": 146,
    "externalSortRank": 1,
    "cardSummary": "基于腾讯生态搭建知识库、工作流和可发布智能体的平台",
    "productIntro": "基于腾讯生态搭建知识库、工作流和可发布智能体的平台。",
    "bestFor": "公众号与企微助手、知识问答、行业机器人和内容服务",
    "coreCapabilities": [
      "智能体搭建",
      "知识库",
      "工作流",
      "腾讯生态发布"
    ],
    "homepageUrl": "https://yuanqi.tencent.com/",
    "docsUrl": "https://yuanqi.tencent.com/agent-doc/",
    "mediaUrl": "https://yuanqi.tencent.com/",
    "icon": "fa-robot"
  },
  {
    "id": "tool-ext-tcd48919259",
    "name": "讯飞星火",
    "company": "科大讯飞",
    "region": "domestic",
    "toolTypeId": "general",
    "toolTypeIds": [
      "general"
    ],
    "toolTypeLabels": [
      "通用AI助手"
    ],
    "externalCategoryRanks": {
      "general": 1
    },
    "externalSortOrder": 147,
    "externalSortRank": 1,
    "cardSummary": "面向中文办公、学习与行业应用的多模态认知大模型助手",
    "productIntro": "面向中文办公、学习与行业应用的多模态认知大模型助手。",
    "bestFor": "中文写作、知识问答、语音交互、学习辅导与行业应用",
    "coreCapabilities": [
      "中文理解",
      "语音交互",
      "文档问答",
      "多模态"
    ],
    "homepageUrl": "https://xinghuo.xfyun.cn/",
    "docsUrl": "https://www.xfyun.cn/doc/spark/Web.html",
    "mediaUrl": "https://xinghuo.xfyun.cn/",
    "icon": "fa-comments"
  },
  {
    "id": "tool-ext-ta8787dd7a6",
    "name": "知乎直答",
    "company": "知乎",
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
    "externalSortOrder": 148,
    "externalSortRank": 1,
    "cardSummary": "依托知乎内容与全网信息生成带来源的答案，强调观点与经验信息",
    "productIntro": "依托知乎内容与全网信息生成带来源的答案，强调观点与经验信息。",
    "bestFor": "中文问题研究、经验检索、观点对照和信息来源追踪",
    "coreCapabilities": [
      "智能搜索",
      "来源引用",
      "知乎内容",
      "追问"
    ],
    "homepageUrl": "https://zhida.zhihu.com/",
    "mediaUrl": "https://zhida.zhihu.com/",
    "icon": "fa-magnifying-glass"
  },
  {
    "id": "tool-ext-ai-4",
    "name": "博查AI搜索",
    "company": "博查",
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
    "externalSortOrder": 149,
    "externalSortRank": 1,
    "cardSummary": "提供面向 AI 应用与个人研究的中文搜索、答案生成和搜索 API",
    "productIntro": "提供面向 AI 应用与个人研究的中文搜索、答案生成和搜索 API。",
    "bestFor": "中文联网检索、资料聚合、开发者搜索接入和事实查询",
    "coreCapabilities": [
      "联网搜索",
      "搜索 API",
      "网页摘要",
      "多源结果"
    ],
    "homepageUrl": "https://bochaai.com/",
    "docsUrl": "https://open.bochaai.com/",
    "mediaUrl": "https://bochaai.com/",
    "icon": "fa-magnifying-glass"
  },
  {
    "id": "tool-ext-flowus-ai",
    "name": "FlowUs AI",
    "company": "FlowUs",
    "region": "domestic",
    "toolTypeId": "knowledge",
    "toolTypeIds": [
      "knowledge"
    ],
    "toolTypeLabels": [
      "知识管理与写作"
    ],
    "externalCategoryRanks": {
      "knowledge": 1
    },
    "externalSortOrder": 150,
    "externalSortRank": 1,
    "cardSummary": "把文档、数据库、知识库与 AI 助手整合在一体化协作空间中",
    "productIntro": "把文档、数据库、知识库与 AI 助手整合在一体化协作空间中。",
    "bestFor": "团队文档、项目知识库、信息整理、协作写作和知识问答",
    "coreCapabilities": [
      "块编辑器",
      "多维表",
      "知识库",
      "AI 写作"
    ],
    "homepageUrl": "https://flowus.cn/",
    "docsUrl": "https://flowus.cn/share/",
    "mediaUrl": "https://flowus.cn/",
    "icon": "fa-book"
  },
  {
    "id": "tool-ext-ta8a343cb47",
    "name": "语雀",
    "company": "蚂蚁集团",
    "region": "domestic",
    "toolTypeId": "knowledge",
    "toolTypeIds": [
      "knowledge"
    ],
    "toolTypeLabels": [
      "知识管理与写作"
    ],
    "externalCategoryRanks": {
      "knowledge": 1
    },
    "externalSortOrder": 151,
    "externalSortRank": 1,
    "cardSummary": "面向个人与团队的结构化文档和知识库平台，支持 AI 辅助创作与总结",
    "productIntro": "面向个人与团队的结构化文档和知识库平台，支持 AI 辅助创作与总结。",
    "bestFor": "团队知识库、项目文档、规范沉淀、协同写作和内容发布",
    "coreCapabilities": [
      "结构化知识库",
      "协同文档",
      "AI 辅助",
      "权限管理"
    ],
    "homepageUrl": "https://www.yuque.com/",
    "docsUrl": "https://www.yuque.com/yuque/help",
    "mediaUrl": "https://www.yuque.com/",
    "icon": "fa-book"
  },
  {
    "id": "tool-ext--ai-2",
    "name": "有道云笔记 AI",
    "company": "网易有道",
    "region": "domestic",
    "toolTypeId": "knowledge",
    "toolTypeIds": [
      "knowledge"
    ],
    "toolTypeLabels": [
      "知识管理与写作"
    ],
    "externalCategoryRanks": {
      "knowledge": 1
    },
    "externalSortOrder": 152,
    "externalSortRank": 1,
    "cardSummary": "在多端笔记、资料收藏和文档处理中加入 AI 总结、写作与问答能力",
    "productIntro": "在多端笔记、资料收藏和文档处理中加入 AI 总结、写作与问答能力。",
    "bestFor": "跨端笔记、资料收藏、OCR、文档阅读和个人知识管理",
    "coreCapabilities": [
      "多端同步",
      "OCR",
      "AI 总结",
      "资料收藏"
    ],
    "homepageUrl": "https://note.youdao.com/",
    "mediaUrl": "https://note.youdao.com/",
    "icon": "fa-book"
  },
  {
    "id": "tool-ext-ai-5",
    "name": "笔灵AI",
    "company": "笔灵科技",
    "region": "domestic",
    "toolTypeId": "writing",
    "toolTypeIds": [
      "writing"
    ],
    "toolTypeLabels": [
      "写作与翻译"
    ],
    "externalCategoryRanks": {
      "writing": 1
    },
    "externalSortOrder": 153,
    "externalSortRank": 1,
    "cardSummary": "面向中文长文、公文、自媒体与商业材料的一站式 AI 写作平台",
    "productIntro": "面向中文长文、公文、自媒体与商业材料的一站式 AI 写作平台。",
    "bestFor": "中文长文、工作总结、公文、营销文案和自媒体内容",
    "coreCapabilities": [
      "长文生成",
      "公文写作",
      "改写润色",
      "模板库"
    ],
    "homepageUrl": "https://ibiling.cn/",
    "mediaUrl": "https://ibiling.cn/",
    "icon": "fa-pen"
  },
  {
    "id": "tool-ext-t72dd0035f1",
    "name": "火山写作",
    "company": "字节跳动",
    "region": "domestic",
    "toolTypeId": "writing",
    "toolTypeIds": [
      "writing"
    ],
    "toolTypeLabels": [
      "写作与翻译"
    ],
    "externalCategoryRanks": {
      "writing": 1
    },
    "externalSortOrder": 154,
    "externalSortRank": 1,
    "cardSummary": "提供中文与英文的智能改写、续写、润色和表达建议",
    "productIntro": "提供中文与英文的智能改写、续写、润色和表达建议。",
    "bestFor": "日常写作、英文辅助、句子改写、润色与表达校正",
    "coreCapabilities": [
      "中英写作",
      "改写续写",
      "语法检查",
      "表达建议"
    ],
    "homepageUrl": "https://www.writingo.net/",
    "mediaUrl": "https://www.writingo.net/",
    "icon": "fa-pen"
  },
  {
    "id": "tool-ext-t4268e8f61c",
    "name": "橙篇",
    "company": "百度",
    "region": "domestic",
    "toolTypeId": "writing",
    "toolTypeIds": [
      "writing"
    ],
    "toolTypeLabels": [
      "写作与翻译"
    ],
    "externalCategoryRanks": {
      "writing": 1
    },
    "externalSortOrder": 155,
    "externalSortRank": 1,
    "cardSummary": "面向长文理解与创作，将资料检索、阅读、整理和成稿串成完整流程",
    "productIntro": "面向长文理解与创作，将资料检索、阅读、整理和成稿串成完整流程。",
    "bestFor": "长篇报告、资料研究、内容整理和中文深度写作",
    "coreCapabilities": [
      "长文生成",
      "资料检索",
      "多文档理解",
      "内容编辑"
    ],
    "homepageUrl": "https://cp.baidu.com/",
    "mediaUrl": "https://cp.baidu.com/",
    "icon": "fa-pen"
  },
  {
    "id": "tool-ext-effidit",
    "name": "Effidit",
    "company": "腾讯 AI Lab",
    "region": "domestic",
    "toolTypeId": "writing",
    "toolTypeIds": [
      "writing"
    ],
    "toolTypeLabels": [
      "写作与翻译"
    ],
    "externalCategoryRanks": {
      "writing": 1
    },
    "externalSortOrder": 156,
    "externalSortRank": 1,
    "cardSummary": "腾讯 AI Lab 推出的智能创作助手，提供文本补全、改写、纠错和检索",
    "productIntro": "腾讯 AI Lab 推出的智能创作助手，提供文本补全、改写、纠错和检索。",
    "bestFor": "中文学术与办公写作、句子补全、改写和智能检索",
    "coreCapabilities": [
      "智能补全",
      "文本改写",
      "错误纠正",
      "素材检索"
    ],
    "homepageUrl": "https://effidit.qq.com/",
    "mediaUrl": "https://effidit.qq.com/",
    "icon": "fa-pen"
  },
  {
    "id": "tool-ext-ppt",
    "name": "秒出PPT",
    "company": "秒出科技",
    "region": "domestic",
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
    "externalSortOrder": 157,
    "externalSortRank": 1,
    "cardSummary": "围绕“快速出稿”提供主题生成、文档导入、模板匹配和 PPTX 导出",
    "productIntro": "围绕“快速出稿”提供主题生成、文档导入、模板匹配和 PPTX 导出。",
    "bestFor": "日常汇报、课程演示、方案初稿和快速可编辑导出",
    "coreCapabilities": [
      "主题生成",
      "文档导入",
      "模板匹配",
      "PPTX 导出"
    ],
    "homepageUrl": "https://10sppt.com/",
    "mediaUrl": "https://10sppt.com/",
    "icon": "fa-file-powerpoint"
  },
  {
    "id": "tool-ext-ai-ppt",
    "name": "百度文库AI PPT",
    "company": "百度",
    "region": "domestic",
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
    "externalSortOrder": 158,
    "externalSortRank": 1,
    "cardSummary": "结合百度文库资料与 AI 能力，从主题或文档生成结构化演示材料",
    "productIntro": "结合百度文库资料与 AI 能力，从主题或文档生成结构化演示材料。",
    "bestFor": "中文资料搜集、文档转 PPT、教育培训和通用汇报",
    "coreCapabilities": [
      "AI 生成 PPT",
      "文档转演示",
      "模板库",
      "资料辅助"
    ],
    "homepageUrl": "https://wenku.baidu.com/",
    "mediaUrl": "https://wenku.baidu.com/",
    "icon": "fa-file-powerpoint"
  },
  {
    "id": "tool-ext-ai-6",
    "name": "堆友AI",
    "company": "阿里巴巴",
    "region": "domestic",
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
    "externalSortOrder": 159,
    "externalSortRank": 1,
    "cardSummary": "面向设计师和电商创作者的一站式 AI 视觉平台，覆盖生图、抠图和素材",
    "productIntro": "面向设计师和电商创作者的一站式 AI 视觉平台，覆盖生图、抠图和素材。",
    "bestFor": "电商视觉、营销图片、背景生成、素材搜索和快速设计",
    "coreCapabilities": [
      "AI 生图",
      "智能抠图",
      "电商素材",
      "设计资源"
    ],
    "homepageUrl": "https://d.design/",
    "mediaUrl": "https://d.design/",
    "icon": "fa-image"
  },
  {
    "id": "tool-ext-ai-7",
    "name": "稿定AI",
    "company": "稿定科技",
    "region": "domestic",
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
    "externalSortOrder": 160,
    "externalSortRank": 1,
    "cardSummary": "把 AI 生图、设计模板、抠图与商品图制作融入大众化在线设计流程",
    "productIntro": "把 AI 生图、设计模板、抠图与商品图制作融入大众化在线设计流程。",
    "bestFor": "营销海报、社媒图片、电商商品图、抠图和模板化设计",
    "coreCapabilities": [
      "AI 生图",
      "商品图",
      "模板设计",
      "智能抠图"
    ],
    "homepageUrl": "https://www.gaoding.com/ai",
    "mediaUrl": "https://www.gaoding.com/ai",
    "icon": "fa-image"
  },
  {
    "id": "tool-ext-tc0906ba79c",
    "name": "美图设计室",
    "company": "美图",
    "region": "domestic",
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
    "externalSortOrder": 161,
    "externalSortRank": 1,
    "cardSummary": "面向商业设计与电商内容的 AI 视觉工作台，强调商品图和营销素材效率",
    "productIntro": "面向商业设计与电商内容的 AI 视觉工作台，强调商品图和营销素材效率。",
    "bestFor": "电商商品图、商业海报、图片精修、模特换装和批量素材",
    "coreCapabilities": [
      "AI 商品图",
      "智能设计",
      "图片精修",
      "批量创作"
    ],
    "homepageUrl": "https://www.designkit.com/",
    "mediaUrl": "https://www.designkit.com/",
    "icon": "fa-image"
  },
  {
    "id": "tool-ext-pixverse",
    "name": "PixVerse",
    "company": "爱诗科技",
    "region": "domestic",
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
    "externalSortOrder": 162,
    "externalSortRank": 1,
    "cardSummary": "提供文生视频、图生视频和模板化特效的全球化 AI 视频平台",
    "productIntro": "提供文生视频、图生视频和模板化特效的全球化 AI 视频平台。",
    "bestFor": "社媒视频、图片动画、模板特效、角色短片和快速创作",
    "coreCapabilities": [
      "文生视频",
      "图生视频",
      "模板特效",
      "角色一致性"
    ],
    "homepageUrl": "https://pixverse.ai/",
    "docsUrl": "https://docs.pixverse.ai/",
    "mediaUrl": "https://pixverse.ai/",
    "icon": "fa-video"
  },
  {
    "id": "tool-ext-tdf9d00f6c3",
    "name": "智谱清影",
    "company": "智谱",
    "region": "domestic",
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
    "externalSortOrder": 163,
    "externalSortRank": 1,
    "cardSummary": "智谱推出的 AI 影像生成能力，支持文本、图片到视频的快速创作",
    "productIntro": "智谱推出的 AI 影像生成能力，支持文本、图片到视频的快速创作。",
    "bestFor": "中文图生视频、创意短片、镜头草图和营销内容",
    "coreCapabilities": [
      "文生视频",
      "图生视频",
      "中文提示词",
      "快速生成"
    ],
    "homepageUrl": "https://chatglm.cn/",
    "mediaUrl": "https://chatglm.cn/",
    "icon": "fa-video"
  },
  {
    "id": "tool-ext-fish-audio",
    "name": "Fish Audio",
    "company": "Fish Audio",
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
    "externalSortOrder": 164,
    "externalSortRank": 1,
    "cardSummary": "支持高质量语音合成、声音克隆与多语言生成的开放语音平台",
    "productIntro": "支持高质量语音合成、声音克隆与多语言生成的开放语音平台。",
    "bestFor": "声音克隆、角色配音、多语言语音、开发者 API 和有声内容",
    "coreCapabilities": [
      "语音合成",
      "声音克隆",
      "多语言",
      "API"
    ],
    "homepageUrl": "https://fish.audio/",
    "docsUrl": "https://docs.fish.audio/",
    "mediaUrl": "https://fish.audio/",
    "icon": "fa-microphone"
  },
  {
    "id": "tool-ext-t81e9793daa",
    "name": "讯飞智作",
    "company": "科大讯飞",
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
    "externalSortOrder": 165,
    "externalSortRank": 1,
    "cardSummary": "面向配音、有声内容和虚拟人的在线智能音视频创作平台",
    "productIntro": "面向配音、有声内容和虚拟人的在线智能音视频创作平台。",
    "bestFor": "中文配音、课件解说、广告旁白、有声书和数字人视频",
    "coreCapabilities": [
      "智能配音",
      "多音色",
      "有声内容",
      "数字人"
    ],
    "homepageUrl": "https://peiyin.xunfei.cn/",
    "mediaUrl": "https://peiyin.xunfei.cn/",
    "icon": "fa-microphone"
  },
  {
    "id": "tool-ext-td60238d98c",
    "name": "腾讯智影",
    "company": "腾讯",
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
    "externalSortOrder": 166,
    "externalSortRank": 1,
    "cardSummary": "集智能配音、数字人、字幕与在线视频编辑于一体的内容生产平台",
    "productIntro": "集智能配音、数字人、字幕与在线视频编辑于一体的内容生产平台。",
    "bestFor": "中文配音、数字人口播、字幕生成、培训视频和营销短片",
    "coreCapabilities": [
      "智能配音",
      "数字人",
      "自动字幕",
      "在线视频编辑"
    ],
    "homepageUrl": "https://zenvideo.qq.com/",
    "mediaUrl": "https://zenvideo.qq.com/",
    "icon": "fa-microphone"
  },
  {
    "id": "tool-ext-t0cfd1908aa",
    "name": "网易见外",
    "company": "网易",
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
    "externalSortOrder": 167,
    "externalSortRank": 1,
    "cardSummary": "提供音视频转写、字幕、翻译和文档翻译的一站式智能转写平台",
    "productIntro": "提供音视频转写、字幕、翻译和文档翻译的一站式智能转写平台。",
    "bestFor": "会议录音、视频字幕、多语言翻译、媒体内容和访谈整理",
    "coreCapabilities": [
      "语音转写",
      "字幕生成",
      "文档翻译",
      "多语言"
    ],
    "homepageUrl": "https://jianwai.youdao.com/",
    "mediaUrl": "https://jianwai.youdao.com/",
    "icon": "fa-users"
  },
  {
    "id": "tool-ext-quick-bi-",
    "name": "Quick BI 智能问数",
    "company": "阿里云",
    "region": "domestic",
    "toolTypeId": "data",
    "toolTypeIds": [
      "data"
    ],
    "toolTypeLabels": [
      "数据分析"
    ],
    "externalCategoryRanks": {
      "data": 1
    },
    "externalSortOrder": 168,
    "externalSortRank": 1,
    "cardSummary": "在企业 BI 平台中通过自然语言问数、自动图表和指标洞察降低分析门槛",
    "productIntro": "在企业 BI 平台中通过自然语言问数、自动图表和指标洞察降低分析门槛。",
    "bestFor": "经营分析、管理驾驶舱、自然语言问数和企业数据治理",
    "coreCapabilities": [
      "智能问数",
      "自动图表",
      "指标管理",
      "企业 BI"
    ],
    "homepageUrl": "https://www.aliyun.com/product/bigdata/bi",
    "docsUrl": "https://help.aliyun.com/zh/quick-bi/",
    "mediaUrl": "https://www.aliyun.com/product/bigdata/bi",
    "icon": "fa-chart-line"
  },
  {
    "id": "tool-ext-finechatbi",
    "name": "FineChatBI",
    "company": "帆软",
    "region": "domestic",
    "toolTypeId": "data",
    "toolTypeIds": [
      "data"
    ],
    "toolTypeLabels": [
      "数据分析"
    ],
    "externalCategoryRanks": {
      "data": 1
    },
    "externalSortOrder": 169,
    "externalSortRank": 1,
    "cardSummary": "把企业语义、权限与大模型结合，让业务人员通过对话完成可信问数",
    "productIntro": "把企业语义、权限与大模型结合，让业务人员通过对话完成可信问数。",
    "bestFor": "企业经营问数、复杂指标解释、权限控制和管理层数据洞察",
    "coreCapabilities": [
      "对话问数",
      "指标语义",
      "权限治理",
      "可视化"
    ],
    "homepageUrl": "https://www.fanruan.com/",
    "mediaUrl": "https://www.fanruan.com/",
    "icon": "fa-chart-line"
  },
  {
    "id": "tool-ext--sugar-bi",
    "name": "百度 Sugar BI",
    "company": "百度智能云",
    "region": "domestic",
    "toolTypeId": "data",
    "toolTypeIds": [
      "data"
    ],
    "toolTypeLabels": [
      "数据分析"
    ],
    "externalCategoryRanks": {
      "data": 1
    },
    "externalSortOrder": 170,
    "externalSortRank": 1,
    "cardSummary": "面向企业数据可视化与智能分析，提供低代码大屏、报表和 AI 问数能力",
    "productIntro": "面向企业数据可视化与智能分析，提供低代码大屏、报表和 AI 问数能力。",
    "bestFor": "数据大屏、经营报表、低代码分析、行业可视化和智能问数",
    "coreCapabilities": [
      "数据可视化",
      "低代码大屏",
      "智能问数",
      "多源接入"
    ],
    "homepageUrl": "https://cloud.baidu.com/product/sugar.html",
    "docsUrl": "https://cloud.baidu.com/doc/SUGAR/",
    "mediaUrl": "https://cloud.baidu.com/product/sugar.html",
    "icon": "fa-chart-line"
  },
  {
    "id": "tool-ext-datawind",
    "name": "DataWind",
    "company": "火山引擎",
    "region": "domestic",
    "toolTypeId": "data",
    "toolTypeIds": [
      "data"
    ],
    "toolTypeLabels": [
      "数据分析"
    ],
    "externalCategoryRanks": {
      "data": 1
    },
    "externalSortOrder": 171,
    "externalSortRank": 1,
    "cardSummary": "火山引擎的一站式数据洞察平台，覆盖自助分析、智能问数与企业报表",
    "productIntro": "火山引擎的一站式数据洞察平台，覆盖自助分析、智能问数与企业报表。",
    "bestFor": "运营分析、经营看板、自助取数、智能问数和团队数据协作",
    "coreCapabilities": [
      "自助 BI",
      "智能问数",
      "数据看板",
      "协作分析"
    ],
    "homepageUrl": "https://www.volcengine.com/product/datawind",
    "docsUrl": "https://www.volcengine.com/docs/4726",
    "mediaUrl": "https://www.volcengine.com/product/datawind",
    "icon": "fa-chart-line"
  },
  {
    "id": "tool-ext--comate",
    "name": "文心快码 Comate",
    "company": "百度",
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
    "externalSortOrder": 172,
    "externalSortRank": 1,
    "cardSummary": "面向企业和开发者的智能编码助手，覆盖补全、问答、单测与代码库理解",
    "productIntro": "面向企业和开发者的智能编码助手，覆盖补全、问答、单测与代码库理解。",
    "bestFor": "中文研发团队、代码补全、单元测试、代码解释和企业知识增强",
    "coreCapabilities": [
      "代码补全",
      "代码问答",
      "单测生成",
      "企业知识"
    ],
    "homepageUrl": "https://comate.baidu.com/",
    "docsUrl": "https://comate.baidu.com/zh/page/document",
    "mediaUrl": "https://comate.baidu.com/",
    "icon": "fa-code"
  },
  {
    "id": "tool-ext-fitten-code",
    "name": "Fitten Code",
    "company": "非十科技",
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
    "externalSortOrder": 173,
    "externalSortRank": 1,
    "cardSummary": "面向主流 IDE 的国产 AI 编程助手，提供补全、问答、测试和代码解释",
    "productIntro": "面向主流 IDE 的国产 AI 编程助手，提供补全、问答、测试和代码解释。",
    "bestFor": "个人开发、代码补全、Bug 分析、注释生成和单元测试",
    "coreCapabilities": [
      "代码补全",
      "编程问答",
      "单测生成",
      "代码解释"
    ],
    "homepageUrl": "https://code.fittentech.com/",
    "mediaUrl": "https://code.fittentech.com/",
    "icon": "fa-code"
  },
  {
    "id": "tool-ext-autoglm",
    "name": "AutoGLM",
    "company": "智谱",
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
    "externalSortOrder": 174,
    "externalSortRank": 1,
    "cardSummary": "面向手机与电脑操作的自主智能体，理解目标后完成跨应用操作",
    "productIntro": "面向手机与电脑操作的自主智能体，理解目标后完成跨应用操作。",
    "bestFor": "手机任务、网页操作、应用协同、信息收集和个人自动化",
    "coreCapabilities": [
      "GUI 操作",
      "任务规划",
      "跨应用执行",
      "中文交互"
    ],
    "homepageUrl": "https://autoglm.zhipuai.cn/",
    "mediaUrl": "https://autoglm.zhipuai.cn/",
    "icon": "fa-robot"
  },
  {
    "id": "tool-ext-flowith-neo",
    "name": "Flowith Neo",
    "company": "Flowith",
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
    "externalSortOrder": 175,
    "externalSortRank": 1,
    "cardSummary": "以画布、知识和多步骤执行为核心的 Agent 工作空间，适合开放式复杂任务",
    "productIntro": "以画布、知识和多步骤执行为核心的 Agent 工作空间，适合开放式复杂任务。",
    "bestFor": "研究规划、知识工作、复杂内容项目、多步骤执行和可视化思考",
    "coreCapabilities": [
      "Agent 工作流",
      "画布",
      "知识库",
      "多步骤执行"
    ],
    "homepageUrl": "https://flowith.io/",
    "docsUrl": "https://flowith.io/",
    "mediaUrl": "https://flowith.io/",
    "icon": "fa-robot"
  }
] as const;
