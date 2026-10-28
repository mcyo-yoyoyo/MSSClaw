-- 本地外部工具快照：73 条。按 ID 更新或新增，不删除其他工具。
-- 保留目标 no / created_at / invokes；更新 updated_at。
-- 执行：psql -X -v ON_ERROR_STOP=1 -d <目标数据库> -f external-tools-20261028.sql
BEGIN;
LOCK TABLE public.tool IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE incoming_external_tools ON COMMIT DROP AS
SELECT "id", "icon", "name", "tags", "author", "region", "company", "best_for", "category", "docs_url", "logo_url", "position", "media_url", "published", "visibility", "description", "source_type", "usage_guide", "card_summary", "homepage_url", "market_shelf", "market_title", "tool_type_id", "delivery_form", "product_intro", "scenario_tags", "tool_type_ids", "version_label", "connector_type", "owner_dept_ids", "publisher_name", "screenshot_url", "owner_region_id", "owner_region_ids", "tool_type_labels", "core_capabilities", "external_sort_rank", "external_sort_order", "publisher_member_id", "business_scenario_ids", "featured_in_find_cases", "external_category_ranks" FROM jsonb_populate_recordset(NULL::public.tool, $tools_data$[
  {
    "id": "tool-saas-chatgpt",
    "icon": "fa-comments",
    "name": "ChatGPT",
    "tags": [
      "ai-saas",
      "通用AI助手",
      "知识管理与写作",
      "演示与文档",
      "AI搜索与研究"
    ],
    "author": "OpenAI",
    "region": "overseas",
    "company": "OpenAI",
    "best_for": "复杂任务拆解、跨文档研究、内容起草与团队协作",
    "category": "external",
    "docs_url": "https://help.openai.com/en/collections/3742473-chatgpt",
    "logo_url": null,
    "position": 0,
    "media_url": "https://openai.com/chatgpt/overview/",
    "published": true,
    "visibility": "public",
    "description": "把提问、文件、数据与多模态素材汇成可直接交付的办公成果。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "把提问、文件、数据与多模态素材汇成可直接交付的办公成果。",
    "homepage_url": "https://chatgpt.com/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "general",
    "delivery_form": null,
    "product_intro": "ChatGPT 是 OpenAI 推出的官方 AI 助手，产品把日常对话、工作任务与 Codex 技术工作整合到同一入口。用户既可以用它获得解释和灵感，也可以把一个明确目标连同文件、数据或图片交给它继续完成。\nChatGPT 支持文字、语音、图片和文件输入，并覆盖联网搜索、深度研究、数据分析、写作与图像创作。多轮对话会保留任务上下文，方便围绕同一成果持续追问、修改和补充材料。\n在工作场景中，它可以从头到尾创建或编辑文档、演示、表格、图表、PDF 与图片，适合复杂任务拆解、跨文档研究、内容起草和团队协作。",
    "scenario_tags": null,
    "tool_type_ids": [
      "general",
      "knowledge",
      "ppt",
      "search"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "通用AI助手",
      "知识管理与写作",
      "演示与文档",
      "AI搜索与研究"
    ],
    "core_capabilities": [
      "深度研究",
      "文件与数据分析",
      "图像与语音",
      "项目工作区"
    ],
    "external_sort_rank": 1,
    "external_sort_order": 1,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "ppt": 2,
      "search": 1,
      "general": 1,
      "knowledge": 1
    }
  },
  {
    "id": "tool-saas-claude",
    "icon": "fa-comments",
    "name": "Claude",
    "tags": [
      "ai-saas",
      "通用AI助手"
    ],
    "author": "Anthropic",
    "region": "overseas",
    "company": "Anthropic",
    "best_for": "长文档审阅、策略分析、代码协作与高质量写作",
    "category": "external",
    "docs_url": "https://docs.anthropic.com/en/docs/about-claude/models/overview",
    "logo_url": null,
    "position": 1,
    "media_url": "https://www.anthropic.com/claude",
    "published": true,
    "visibility": "public",
    "description": "读懂复杂长文档，在严谨分析、高质量写作和结构化成果中保持连贯。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "读懂复杂长文档，在严谨分析、高质量写作和结构化成果中保持连贯。",
    "homepage_url": "https://claude.ai/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "general",
    "delivery_form": null,
    "product_intro": "Claude 是 Anthropic 推出的通用 AI 助手，产品以复杂长文档理解、严谨分析、高质量写作和代码协作为主要特点。它能在较长任务中保持上下文连贯，并把分析结果继续组织成结构化成果。\nClaude 支持文件阅读、网页研究、代码执行与 Artifacts。Artifacts 可把生成的文档、代码、图表或交互内容放在独立工作区中持续编辑，适合把一次问答扩展成可审阅、可修改的交付件。\n它更适合策略材料、长报告审阅、跨文档比较、正式写作与工程任务。使用时可以先要求它解释材料结构与证据，再进入写作或制作阶段，以减少长任务中的方向偏差。",
    "scenario_tags": null,
    "tool_type_ids": [
      "general"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "通用AI助手"
    ],
    "core_capabilities": [
      "长上下文",
      "Artifacts",
      "网页研究",
      "代码执行"
    ],
    "external_sort_rank": 2,
    "external_sort_order": 5,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "general": 2
    }
  },
  {
    "id": "tool-saas-deepseek",
    "icon": "fa-comments",
    "name": "DeepSeek",
    "tags": [
      "ai-saas",
      "通用AI助手"
    ],
    "author": "深度求索",
    "region": "domestic",
    "company": "深度求索",
    "best_for": "中文推理、代码生成、学习辅导与日常问答",
    "category": "external",
    "docs_url": "https://api-docs.deepseek.com/",
    "logo_url": null,
    "position": 2,
    "media_url": "https://www.deepseek.com/",
    "published": true,
    "visibility": "public",
    "description": "用深度推理处理逻辑分析、代码理解与需要分步判断的复杂问题。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "用深度推理处理逻辑分析、代码理解与需要分步判断的复杂问题。",
    "homepage_url": "https://chat.deepseek.com/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "general",
    "delivery_form": null,
    "product_intro": "DeepSeek 是深度求索推出的通用 AI 产品，以深度推理、代码能力和中文任务处理见长。用户可以在普通对话与深度思考之间选择，并结合联网搜索或文件上传处理复杂问题。\n产品适合需要分步骤判断的逻辑分析、代码理解、学习辅导和技术问答。它也提供开放 API，便于开发者把模型能力接入应用或内部工作流。\nDeepSeek 的核心价值是以较低使用门槛提供较强推理能力。使用时应要求展示推理依据、核对联网来源，并对代码、安全建议和重要计算结果进行独立验证。",
    "scenario_tags": null,
    "tool_type_ids": [
      "general"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "通用AI助手"
    ],
    "core_capabilities": [
      "深度思考",
      "联网搜索",
      "文件上传",
      "开放 API"
    ],
    "external_sort_rank": 3,
    "external_sort_order": 6,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "general": 3
    }
  },
  {
    "id": "tool-saas-kimi",
    "icon": "fa-file-powerpoint",
    "name": "Kimi",
    "tags": [
      "ai-saas",
      "演示与文档",
      "通用AI助手"
    ],
    "author": "月之暗面",
    "region": "domestic",
    "company": "月之暗面",
    "best_for": "中文资料研究、长文档总结、报告与演示内容准备",
    "category": "external",
    "docs_url": "https://platform.moonshot.cn/docs/intro",
    "logo_url": null,
    "position": 3,
    "media_url": "https://www.kimi.com/",
    "published": true,
    "visibility": "public",
    "description": "快速消化长文档和网页资料，提炼重点、形成观点并完成中文写作。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "快速消化长文档和网页资料，提炼重点、形成观点并完成中文写作。",
    "homepage_url": "https://www.kimi.com/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "ppt",
    "delivery_form": null,
    "product_intro": "Kimi 是月之暗面推出的通用AI 助手，内置独立 Kimi Slides 智能 PPT 生成模块，支持超大上下文文档解析，内容逻辑优先，兼顾研究分析与演示文稿生成。\nKimi支持超长文档理解、联网搜索、网页与文件解析和办公写作，擅长复杂报告结构化拆解，逻辑层级清晰，适合大量文字提炼精简。输入主题 / 上传 Word/PDF 一键生成整套幻灯片，在线编辑，导出标准 PPTX。\n用户可以上传报告、合同、论文或多份材料，围绕指定内容追问、对比和提炼结论；也可以从搜索结果继续生成摘要、提纲、文章或汇报素材。\nKimi可用于行业研究、学士研究、项目报告、数据分析等；长文档汇总提炼PPT生成。",
    "scenario_tags": null,
    "tool_type_ids": [
      "ppt",
      "general"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "演示与文档",
      "通用AI助手"
    ],
    "core_capabilities": [
      "长文档",
      "深度搜索",
      "文件解析",
      "办公写作"
    ],
    "external_sort_rank": 1,
    "external_sort_order": 7,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "ppt": 1,
      "general": 2
    }
  },
  {
    "id": "tool-saas-perplexity",
    "icon": "fa-magnifying-glass",
    "name": "Perplexity",
    "tags": [
      "ai-saas",
      "AI搜索与研究"
    ],
    "author": "Perplexity AI",
    "region": "overseas",
    "company": "Perplexity AI",
    "best_for": "行业扫描、事实核验、竞品研究与带出处的快速问答",
    "category": "external",
    "docs_url": "https://www.perplexity.ai/help-center/",
    "logo_url": null,
    "position": 4,
    "media_url": "https://www.perplexity.ai/hub",
    "published": true,
    "visibility": "public",
    "description": "把开放网络搜索变成带来源、可追溯、可继续深挖的研究答案。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "把开放网络搜索变成带来源、可追溯、可继续深挖的研究答案。",
    "homepage_url": "https://www.perplexity.ai/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "search",
    "delivery_form": null,
    "product_intro": "Perplexity 是强大的AI搜索引擎与深度研究工具。用户用自然语言提出问题后，Perplexity会自动检索全网信息、深度研究并生成答案。\nPerplexity 支持深度搜索、记住上下文支持连续追问、研究分析、支持溯源等能力，用户可以沿某条引用回到原始网页，也可以继续限定时间、地域和比较维度。\nPerplexity 支持深度搜索，适合学术研究、行业竞品研究、市场分析等，学生、研究人员和专业人士能提供强大的支持。",
    "scenario_tags": null,
    "tool_type_ids": [
      "search"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "AI搜索与研究"
    ],
    "core_capabilities": [
      "来源引用",
      "深度研究",
      "文件空间",
      "Comet 浏览器"
    ],
    "external_sort_rank": 3,
    "external_sort_order": 9,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "search": 3
    }
  },
  {
    "id": "tool-saas-metaso",
    "icon": "fa-magnifying-glass",
    "name": "秘塔AI搜索",
    "tags": [
      "ai-saas",
      "AI搜索与研究"
    ],
    "author": "秘塔科技",
    "region": "domestic",
    "company": "秘塔科技",
    "best_for": "中文资料检索、报告提纲、学术与行业信息梳理",
    "category": "external",
    "docs_url": "https://metaso.cn/",
    "logo_url": null,
    "position": 5,
    "media_url": "https://metaso.cn/",
    "published": true,
    "visibility": "public",
    "description": "提供中文结构化答案、来源追溯和专题研究的 AI 搜索产品。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "提供中文结构化答案、来源追溯和专题研究的 AI 搜索产品。",
    "homepage_url": "https://metaso.cn/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "search",
    "delivery_form": null,
    "product_intro": "秘塔AI搜索 是 秘塔科技 推出的专业AI搜索引擎。聚焦信息检索真实性，强溯源、结构化输出及创意生成等功能。\n支持全网搜索、来源追溯、结构化输出多种格式内容、上传文件进行解读，支持多学科知识学习、图像及视频生成等。\n秘塔AI擅长全网搜索、文献及资料搜索、报告、学术及行业信息梳理。用户可根据需求搜索相关文献及溯源，梳理相关材料并结构化输出。",
    "scenario_tags": null,
    "tool_type_ids": [
      "search"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "AI搜索与研究"
    ],
    "core_capabilities": [
      "结构化答案",
      "来源追溯",
      "专题模式",
      "中文优化"
    ],
    "external_sort_rank": 3,
    "external_sort_order": 10,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "search": 3
    }
  },
  {
    "id": "tool-ext-notebooklm",
    "icon": "fa-file-powerpoint",
    "name": "NotebookLM",
    "tags": [
      "ai-saas",
      "演示与文档",
      "知识管理与写作"
    ],
    "author": "Google",
    "region": "overseas",
    "company": "Google",
    "best_for": "长资料学习、政策研读、专题研究、音视频资料理解与知识复盘",
    "category": "external",
    "docs_url": "https://support.google.com/notebooklm/",
    "logo_url": null,
    "position": 6,
    "media_url": "https://blog.google/innovation-and-ai/products/notebooklm/",
    "published": true,
    "visibility": "public",
    "description": "只围绕指定资料阅读、提问与生成内容，让每个结论都能回到来源。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "只围绕指定资料阅读、提问与生成内容，让每个结论都能回到来源。",
    "homepage_url": "https://notebooklm.google/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "ppt",
    "delivery_form": null,
    "product_intro": "NotebookLM 是 Google 推出的 AI 研究笔记本，所有问答与内容生成都围绕用户指定的来源展开。用户可导入文档、网页、音频或视频资料，再进行提问、比较与主题研究。\n产品会在回答中标注来源引用，并可基于资料生成音频或视频概览、演示文稿、学习指南、简报等衍生内容。\nNotebookLM适合政策研读、课程学习、专题研究和多资料复盘。其差异在于答案边界清晰且能回到原文，适合需要证据链而非泛化聊天的知识任务。",
    "scenario_tags": null,
    "tool_type_ids": [
      "ppt",
      "knowledge"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "演示与文档",
      "知识管理与写作"
    ],
    "core_capabilities": [
      "来源引用",
      "Deep Research",
      "音视频概览",
      "学习指南"
    ],
    "external_sort_rank": 3,
    "external_sort_order": 11,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "ppt": 5,
      "knowledge": 3
    }
  },
  {
    "id": "tool-saas-notion-ai",
    "icon": "fa-book",
    "name": "Notion AI",
    "tags": [
      "ai-saas",
      "知识管理与写作"
    ],
    "author": "Notion",
    "region": "overseas",
    "company": "Notion",
    "best_for": "团队知识沉淀、跨空间搜索、文档生成与项目推进",
    "category": "external",
    "docs_url": "https://www.notion.com/help/category/notion-ai",
    "logo_url": null,
    "position": 7,
    "media_url": "https://www.notion.com/product/ai",
    "published": true,
    "visibility": "public",
    "description": "嵌入团队知识库的写作、搜索、会议记录与任务执行智能体。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "嵌入团队知识库的写作、搜索、会议记录与任务执行智能体。",
    "homepage_url": "https://www.notion.com/product/ai",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "knowledge",
    "delivery_form": null,
    "product_intro": "Notion AI 是 内置在Notion 内的知识管理与学习产品。嵌入团队知识库的写作、搜索、会议记录与任务执行智能体。\n主要能力包括企业搜索、Notion Agent、会议记录、数据库自动填充。它围绕用户选定的资料空间组织内容，通过导入、关联、检索与问答，把分散信息转化为可以持续复用的知识。\n在实际工作中，它更适合团队知识沉淀、跨空间搜索、文档生成与项目推进。",
    "scenario_tags": null,
    "tool_type_ids": [
      "knowledge"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "知识管理与写作"
    ],
    "core_capabilities": [
      "企业搜索",
      "Notion Agent",
      "会议记录",
      "数据库自动填充"
    ],
    "external_sort_rank": 5,
    "external_sort_order": 13,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "knowledge": 5
    }
  },
  {
    "id": "tool-saas-gamma",
    "icon": "fa-file-powerpoint",
    "name": "Gamma",
    "tags": [
      "ai-saas",
      "演示与文档"
    ],
    "author": "Gamma Tech",
    "region": "overseas",
    "company": "Gamma Tech",
    "best_for": "提案初稿、培训材料、项目汇报与轻量专题网页",
    "category": "external",
    "docs_url": "https://help.gamma.app/",
    "logo_url": null,
    "position": 8,
    "media_url": "https://gamma.app/products/presentations",
    "published": true,
    "visibility": "public",
    "description": "把主题或已有材料快速组织成结构清晰、可编辑的演示与网页。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "把主题或已有材料快速组织成结构清晰、可编辑的演示与网页。",
    "homepage_url": "https://gamma.app/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "ppt",
    "delivery_form": null,
    "product_intro": "Gamma 是面向演示、文档和轻量网页的 AI 内容制作工具。用户可以从一句主题、结构化提纲或已有材料开始，快速得到带内容层级与视觉主题的可编辑成稿。\n产品把内容生成、卡片式排版、主题样式、媒体嵌入、协作分享和网页发布放在同一工作流中，适合提案初稿、培训材料、项目汇报及无需开发的专题页面。\nGamma 的优势是缩短从文字结构到可展示页面的时间；正式汇报前仍需逐页核对逻辑、数字和品牌规范。",
    "scenario_tags": null,
    "tool_type_ids": [
      "ppt"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "演示与文档"
    ],
    "core_capabilities": [
      "一键成稿",
      "主题排版",
      "网页发布",
      "协作分享"
    ],
    "external_sort_rank": 1,
    "external_sort_order": 14,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "ppt": 1
    }
  },
  {
    "id": "tool-saas-midjourney",
    "icon": "fa-video",
    "name": "Midjourney",
    "tags": [
      "ai-saas",
      "视频与数字人",
      "图像与设计"
    ],
    "author": "Midjourney, Inc.",
    "region": "overseas",
    "company": "Midjourney, Inc.",
    "best_for": "概念视觉、海报氛围、创意探索和品牌灵感",
    "category": "external",
    "docs_url": "https://docs.midjourney.com/",
    "logo_url": null,
    "position": 9,
    "media_url": "https://www.midjourney.com/explore",
    "published": true,
    "visibility": "public",
    "description": "以视觉质量、风格控制和创意探索见长的 AI 图像生成平台。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "以视觉质量、风格控制和创意探索见长的 AI 图像生成平台。",
    "homepage_url": "https://www.midjourney.com/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "video",
    "delivery_form": null,
    "product_intro": "Midjourney 是 Midjourney, Inc. 推出的AI图像生成工具。以视觉质量、风格控制和创意探索见长的 AI 图像生成平台。\nMidjourney支持文本生图、图像编辑、风格参考、个性化。它用文字提示、参考图或局部编辑指令生成视觉方案，并支持围绕构图、风格、主体与细节持续修改。\n在实际工作中，它更适合概念视觉、海报氛围、创意探索、品牌灵感、影视分镜氛围样片、品牌视觉短视频。",
    "scenario_tags": null,
    "tool_type_ids": [
      "video",
      "image"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "视频与数字人",
      "图像与设计"
    ],
    "core_capabilities": [
      "文本生图",
      "图像编辑",
      "风格参考",
      "个性化"
    ],
    "external_sort_rank": 2,
    "external_sort_order": 15,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "image": 2,
      "video": 4
    }
  },
  {
    "id": "tool-saas-jimeng",
    "icon": "fa-video",
    "name": "即梦AI",
    "tags": [
      "ai-saas",
      "视频与数字人",
      "图像与设计"
    ],
    "author": "字节跳动",
    "region": "domestic",
    "company": "字节跳动",
    "best_for": "中文海报、电商视觉、社媒配图和创意短视频",
    "category": "external",
    "docs_url": "https://jimeng.jianying.com/",
    "logo_url": null,
    "position": 10,
    "media_url": "https://jimeng.jianying.com/",
    "published": true,
    "visibility": "public",
    "description": "面向中文创作场景的图片生成、智能画布与视频创作平台。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "面向中文创作场景的图片生成、智能画布与视频创作平台。",
    "homepage_url": "https://jimeng.jianying.com/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "video",
    "delivery_form": null,
    "product_intro": "即梦AI 是字节跳动推出的AI图像与AI视频创作平台。面向中文创作场景的图片生成、视频生成及数字人等。\n即梦AI支持图片生成、视频生成、音乐生成、数字人、支持Agent模式智能创作与Octo人机同屏协作。用户输入想法可自动编排多步骤任务\n在实际工作中，它更适合中文海报、电商视觉、社媒配图和创意短视频。自媒体口播短视频、短剧片段创作；数字人日常口播内容产出。",
    "scenario_tags": null,
    "tool_type_ids": [
      "video",
      "image"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "视频与数字人",
      "图像与设计"
    ],
    "core_capabilities": [
      "中文生图",
      "智能画布",
      "局部编辑",
      "图生视频"
    ],
    "external_sort_rank": 2,
    "external_sort_order": 17,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "image": 2,
      "video": 2
    }
  },
  {
    "id": "tool-saas-runway",
    "icon": "fa-video",
    "name": "Runway",
    "tags": [
      "ai-saas",
      "视频与数字人"
    ],
    "author": "Runway AI",
    "region": "overseas",
    "company": "Runway AI",
    "best_for": "创意短片、分镜预演、广告素材和视频编辑",
    "category": "external",
    "docs_url": "https://help.runwayml.com/",
    "logo_url": null,
    "position": 11,
    "media_url": "https://runway.com/research/introducing-runway-gen-4.5",
    "published": true,
    "visibility": "public",
    "description": "覆盖生成、编辑与镜头控制的专业 AI 视频创作平台。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "覆盖生成、编辑与镜头控制的专业 AI 视频创作平台。",
    "homepage_url": "https://runwayml.com/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "video",
    "delivery_form": null,
    "product_intro": "Runway 是 Runway AI 推出的视频与数字人产品。覆盖生成、编辑与镜头控制的专业 AI 视频创作平台。\nRunway支持文生视频、图生视频、镜头控制、视频编辑。它把脚本、关键帧、镜头运动、人物表现与后期处理连接起来，用更短链路生成和修改视频内容。\n在实际工作中，它更适合创意短片、分镜预演、广告素材和视频编辑。",
    "scenario_tags": null,
    "tool_type_ids": [
      "video"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "视频与数字人"
    ],
    "core_capabilities": [
      "文生视频",
      "图生视频",
      "镜头控制",
      "视频编辑"
    ],
    "external_sort_rank": 1,
    "external_sort_order": 19,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "video": 1
    }
  },
  {
    "id": "tool-ext-elevenlabs",
    "icon": "fa-microphone",
    "name": "ElevenLabs",
    "tags": [
      "ai-saas",
      "音频与语音"
    ],
    "author": "ElevenLabs",
    "region": "overseas",
    "company": "ElevenLabs",
    "best_for": "多语言配音、播客、有声内容和产品语音交互",
    "category": "external",
    "docs_url": "https://elevenlabs.io/docs/overview",
    "logo_url": null,
    "position": 12,
    "media_url": "https://elevenlabs.io/",
    "published": true,
    "visibility": "public",
    "description": "提供自然语音合成、配音、声音克隆和语音识别的一体化平台。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "提供自然语音合成、配音、声音克隆和语音识别的一体化平台。",
    "homepage_url": "https://elevenlabs.io/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "audio",
    "delivery_form": null,
    "product_intro": "ElevenLabs 是 ElevenLabs 推出的文本转语音（TTS）平台。提供自然语音合成、配音、声音克隆和语音识别的一体化平台。\nElevenLabs 支持语音合成、声音克隆、语音识别、多语言配音。支持长文本连续朗读、多人对话生成、流式低延迟输出，适配虚拟人实时配音。\nElevenLabs 适合多语言配音、播客、有声内容、广告配音、产品语音交互。",
    "scenario_tags": null,
    "tool_type_ids": [
      "audio"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "音频与语音"
    ],
    "core_capabilities": [
      "语音合成",
      "声音克隆",
      "语音识别",
      "多语言配音"
    ],
    "external_sort_rank": 1,
    "external_sort_order": 20,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "audio": 1
    }
  },
  {
    "id": "tool-ext-t1fd65bfeda",
    "icon": "fa-users",
    "name": "飞书妙记",
    "tags": [
      "ai-saas",
      "会议与协作"
    ],
    "author": "飞书",
    "region": "domestic",
    "company": "飞书",
    "best_for": "会议纪要、访谈整理、培训复盘与异步信息同步",
    "category": "external",
    "docs_url": "https://www.feishu.cn/hc/zh-CN/categories-detail?categoryId=720504767423",
    "logo_url": null,
    "position": 13,
    "media_url": "https://www.feishu.cn/product/minutes",
    "published": true,
    "visibility": "public",
    "description": "将会议音视频自动转写、总结并沉淀为可检索协作文档。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "将会议音视频自动转写、总结并沉淀为可检索协作文档。",
    "homepage_url": "https://www.feishu.cn/product/minutes",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "meeting",
    "delivery_form": null,
    "product_intro": "飞书妙记是飞书原生内置音视频智能记录工具，深度嵌入飞书会议、飞书整套办公协同体系；依托飞书大模型，生态内一体化会议纪要方案。\n飞书妙记支持音视频自动转写、发言人区分、自动生成结构化纪要、多语言实时翻译，纪要直接存入飞书文档、飞书知识库。\n在实际工作中，它更适合全组织统一使用飞书的企业，会议纪要、访谈整理、培训复盘与异步信息同步；内部培训、跨部门同步；重视会议 - 文档 - 任务一体化协作。",
    "scenario_tags": null,
    "tool_type_ids": [
      "meeting"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "会议与协作"
    ],
    "core_capabilities": [
      "实时转写",
      "智能总结",
      "重点标记",
      "协作分享"
    ],
    "external_sort_rank": 1,
    "external_sort_order": 21,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "meeting": 1
    }
  },
  {
    "id": "tool-saas-cursor",
    "icon": "fa-code",
    "name": "Cursor",
    "tags": [
      "ai-saas",
      "编程开发"
    ],
    "author": "Anysphere",
    "region": "overseas",
    "company": "Anysphere",
    "best_for": "跨文件开发、代码重构、调试和从需求到实现",
    "category": "external",
    "docs_url": "https://docs.cursor.com/",
    "logo_url": null,
    "position": 14,
    "media_url": "https://cursor.com/features",
    "published": true,
    "visibility": "public",
    "description": "以代码库理解、智能体编程和审查为核心的 AI 代码编辑器。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "以代码库理解、智能体编程和审查为核心的 AI 代码编辑器。",
    "homepage_url": "https://cursor.com/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "code",
    "delivery_form": null,
    "product_intro": "Cursor 是 Anysphere推出的AI代码编辑器，支持Python、Java、C#、JavaScript等多语言，通过快捷键操作，实现代码自动生成、编辑、讨论等功能，显著提升开发效率。\nCursor 支持代码生成、智能补全及检测与修复。Cursor Agent能在任何设备上无缝衔接地使用 AI 编程代理。可以并行运行多个 Agent 任务。\n在实际工作中，它更适合独立开发者、全栈工程师、前端项目；新项目搭建、中型项目多文件重构；原型快速开发；在同一个编辑器完成 “需求→编码→调试” 整套流程。",
    "scenario_tags": null,
    "tool_type_ids": [
      "code"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "编程开发"
    ],
    "core_capabilities": [
      "代码智能体",
      "代码库检索",
      "多文件编辑",
      "自动审查"
    ],
    "external_sort_rank": 1,
    "external_sort_order": 22,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "code": 1
    }
  },
  {
    "id": "tool-ext-t03d8f35876",
    "icon": "fa-code",
    "name": "通义灵码",
    "tags": [
      "ai-saas",
      "编程开发"
    ],
    "author": "阿里云",
    "region": "domestic",
    "company": "阿里云",
    "best_for": "中文代码问答、企业研发、单测生成与工程任务执行",
    "category": "external",
    "docs_url": "https://help.aliyun.com/zh/lingma/",
    "logo_url": null,
    "position": 15,
    "media_url": "https://tongyi.aliyun.com/lingma/",
    "published": true,
    "visibility": "public",
    "description": "面向中文研发场景的代码补全、问答、智能体与企业知识协作工具。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "面向中文研发场景的代码补全、问答、智能体与企业知识协作工具。",
    "homepage_url": "https://tongyi.aliyun.com/lingma/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "code",
    "delivery_form": null,
    "product_intro": "通义灵码 是 阿里云基于通义代码大模型打造的企业级 IDE 代码助手，形态包含 VS Code、JetBrains 全系列插件 + 独立 IDE，面向专业研发团队，主打后端工程、企业规范化开发。\n产品支持行间代码续写、仓库级 RAG 理解，学习企业私有代码库。Java、Go、SpringCloud、阿里云 SDK 专项优化。单元测试生成、故障诊断、SQL 脚本、接口文档自动输出。多角色 AI 专家团并行完成复杂研发任务。\n在实际工作中，通义灵码支持Java/Go 后端、云原生、微服务开发团队日常编码，基于阿里云生态业务系统开发，快速调用云产品 SDK。",
    "scenario_tags": null,
    "tool_type_ids": [
      "code"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "编程开发"
    ],
    "core_capabilities": [
      "代码补全",
      "编程智能体",
      "企业知识",
      "多 IDE 支持"
    ],
    "external_sort_rank": 1,
    "external_sort_order": 23,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "code": 1
    }
  },
  {
    "id": "tool-ext--coze",
    "icon": "fa-robot",
    "name": "扣子 Coze",
    "tags": [
      "ai-saas",
      "智能体"
    ],
    "author": "字节跳动",
    "region": "domestic",
    "company": "字节跳动",
    "best_for": "部门机器人、知识问答、内容自动化和轻量业务助手",
    "category": "external",
    "docs_url": "https://www.coze.cn/open/docs",
    "logo_url": null,
    "position": 16,
    "media_url": "https://www.coze.cn/",
    "published": true,
    "visibility": "public",
    "description": "用于搭建、发布和运营 AI 智能体与工作流的低代码平台。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "用于搭建、发布和运营 AI 智能体与工作流的低代码平台。",
    "homepage_url": "https://www.coze.cn/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "agent",
    "delivery_form": null,
    "product_intro": "扣子 Coze 是 字节跳动 推出的智能体与工作流开发协作平台。用于搭建、发布和运营 AI 智能体与工作流的低代码平台。\n扣子 Coze支持智能体搭建、工作流、知识库。内置 RAG 知识库、长期记忆、多 Agent 协作。支持发布网页机器人、API、嵌入第三方系统；多模型自由切换。\n在实际工作中，它更适合快速搭建行业机器人、知识问答、内容自动化和轻量业务助手。",
    "scenario_tags": null,
    "tool_type_ids": [
      "agent"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "智能体"
    ],
    "core_capabilities": [
      "智能体搭建",
      "工作流",
      "知识库",
      "多渠道发布"
    ],
    "external_sort_rank": 1,
    "external_sort_order": 24,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "agent": 1
    }
  },
  {
    "id": "tool-saas-gemini",
    "icon": "fa-book",
    "name": "Gemini",
    "tags": [
      "ai-saas",
      "知识管理与写作",
      "演示与文档",
      "AI搜索与研究",
      "通用AI助手"
    ],
    "author": "Google",
    "region": "overseas",
    "company": "Google",
    "best_for": "文档撰写、资料搜索、多模态素材理解与整理，Google生态文档管理",
    "category": "external",
    "docs_url": "https://support.google.com/gemini/",
    "logo_url": null,
    "position": 17,
    "media_url": "https://deepmind.google/models/gemini/",
    "published": true,
    "visibility": "public",
    "description": "连接 Google 搜索与办公生态，在同一工作流中理解文字、图片、视频和长资料。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "连接 Google 搜索与办公生态，在同一工作流中理解文字、图片、视频和长资料。",
    "homepage_url": "https://gemini.google.com/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "knowledge",
    "delivery_form": null,
    "product_intro": "Gemini 是 Google 推出的多模态 AI 助手，核心优势是把 Google 搜索、个人或团队资料与 Workspace 办公生态连接到同一对话流程。它可以同时理解文字、图片、音频、视频、代码和长文档。\nGemini支持超长上下文、多模态解析（截图、表格、图纸、视频解读），支持联网实时检索信息，原生联动 Google 生态，直接读写云端文档；擅长技术内容、数据分析、多语种写作等\nGemini 更适合Google 生态重度用户、文档撰写、多语种材料、截图 、 视频素材进行内容整理；联网辅助调研写作。且能够在 Google 信息与生产力工具之间减少切换，并让研究内容继续进入写作与制作环节。",
    "scenario_tags": null,
    "tool_type_ids": [
      "knowledge",
      "ppt",
      "search",
      "general"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "知识管理与写作",
      "演示与文档",
      "AI搜索与研究",
      "通用AI助手"
    ],
    "core_capabilities": [
      "多模态理解",
      "Deep Research",
      "Google 应用连接"
    ],
    "external_sort_rank": 2,
    "external_sort_order": 25,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "ppt": 4,
      "search": 2,
      "general": 3,
      "knowledge": 2
    }
  },
  {
    "id": "tool-ext-grok",
    "icon": "fa-comments",
    "name": "Grok",
    "tags": [
      "ai-saas",
      "通用AI助手"
    ],
    "author": "xAI",
    "region": "overseas",
    "company": "xAI",
    "best_for": "热点信息追踪、快速推理、代码和联网资料综合",
    "category": "external",
    "docs_url": "https://docs.x.ai/docs",
    "logo_url": null,
    "position": 18,
    "media_url": "https://x.ai/news/grok-4-5",
    "published": true,
    "visibility": "public",
    "description": "强调实时信息、推理和原生工具调用的通用 AI 助手。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "强调实时信息、推理和原生工具调用的通用 AI 助手。",
    "homepage_url": "https://grok.com/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "general",
    "delivery_form": null,
    "product_intro": "Grok 是 xAI 推出的通用AI助手产品。强调实时信息、推理和原生工具调用的通用 AI 助手。\nGrok提供实时搜索、深度推理、多模态、代码能力。实时接入 X 社交数据流，擅长热点舆情、互联网话题分析。响应速度快，适合头脑风暴、观点辩论、时事评论。\n在实际工作中，它更适合热点信息追踪、快速推理、代码和联网资料综合。适合需要新鲜互联网实时热点素材的创作者。",
    "scenario_tags": null,
    "tool_type_ids": [
      "general"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "通用AI助手"
    ],
    "core_capabilities": [
      "实时搜索",
      "深度推理",
      "多模态",
      "代码能力"
    ],
    "external_sort_rank": 4,
    "external_sort_order": 29,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "general": 4
    }
  },
  {
    "id": "tool-saas-doubao",
    "icon": "fa-book",
    "name": "豆包",
    "tags": [
      "ai-saas",
      "知识管理与写作",
      "演示与文档",
      "通用AI助手"
    ],
    "author": "字节跳动",
    "region": "domestic",
    "company": "字节跳动",
    "best_for": "中文日常办公、内容创作、学习答疑与语音交流",
    "category": "external",
    "docs_url": "https://www.volcengine.com/docs/82379",
    "logo_url": null,
    "position": 19,
    "media_url": "https://research.doubao.com/zh/blog/seed-2-0-official-launch",
    "published": true,
    "visibility": "public",
    "description": "用低门槛对话完成中文问答、写作、图片创作和语音交流。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "用低门槛对话完成中文问答、写作、图片创作和语音交流。",
    "homepage_url": "https://www.doubao.com/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "knowledge",
    "delivery_form": null,
    "product_intro": "豆包是字节跳动推出的中文多模态 AI 助手，覆盖对话问答、联网搜索、文件阅读、中文写作、图片创作与实时语音交流，强调低门槛和日常使用体验。\n用户可以直接输入问题，也可以上传文档或图片继续提问；在内容创作场景中，可从文案构思延伸到视觉生成，在移动场景中则可通过语音持续交流。\n它更适合中文日常办公、学习答疑、社交内容与轻量创作。复杂研究或正式材料需要补充可靠来源、明确结构，并对自动生成的事实和图像细节进行人工检查。",
    "scenario_tags": null,
    "tool_type_ids": [
      "knowledge",
      "ppt",
      "general"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "知识管理与写作",
      "演示与文档",
      "通用AI助手"
    ],
    "core_capabilities": [
      "联网搜索",
      "文件问答",
      "图像创作",
      "实时语音"
    ],
    "external_sort_rank": 1,
    "external_sort_order": 30,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "ppt": 2,
      "general": 1,
      "knowledge": 1
    }
  },
  {
    "id": "tool-saas-tongyi",
    "icon": "fa-comments",
    "name": "Qwen",
    "tags": [
      "ai-saas",
      "通用AI助手"
    ],
    "author": "阿里云",
    "region": "domestic",
    "company": "阿里云",
    "best_for": "中文办公、多模态理解、代码与企业级模型应用",
    "category": "external",
    "docs_url": "https://qwen.readthedocs.io/",
    "logo_url": null,
    "position": 20,
    "media_url": "https://qwen.ai/blog?id=qwen3.8",
    "published": true,
    "visibility": "public",
    "description": "统一处理文字、图像、文档和代码，覆盖多类型中文工作任务。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "统一处理文字、图像、文档和代码，覆盖多类型中文工作任务。",
    "homepage_url": "https://chat.qwen.ai/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "general",
    "delivery_form": null,
    "product_intro": "Qwen 是阿里云推出的通用多模态 AI 助手，能够处理文字、图片、文档、代码与多种中文工作任务，并与通义系列模型和企业服务生态衔接。\n产品可用于问答、写作、资料理解、视觉分析和编程协作，用户可以围绕同一任务混合使用文本与文件输入，再通过多轮修改形成所需结果。\nQwen 的优势是覆盖任务类型广，并兼顾个人使用与开发接入。正式工作中应明确输出格式和数据边界，对关键事实、代码和专业结论进行复核。",
    "scenario_tags": null,
    "tool_type_ids": [
      "general"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "通用AI助手"
    ],
    "core_capabilities": [
      "多模态",
      "深度研究",
      "代码",
      "开放模型生态"
    ],
    "external_sort_rank": 4,
    "external_sort_order": 33,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "general": 4
    }
  },
  {
    "id": "tool-ext-ai",
    "icon": "fa-magnifying-glass",
    "name": "纳米AI",
    "tags": [
      "ai-saas",
      "AI搜索与研究"
    ],
    "author": "360 集团",
    "region": "domestic",
    "company": "360 集团",
    "best_for": "中文网页搜索、热点综述、资料总结与多模型协同",
    "category": "external",
    "docs_url": "https://www.n.cn/",
    "logo_url": null,
    "position": 21,
    "media_url": "https://www.n.cn/",
    "published": true,
    "visibility": "public",
    "description": "集合搜索、阅读、创作与多智能体协作的AI产品。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "集合搜索、阅读、创作与多智能体协作的AI产品。",
    "homepage_url": "https://www.n.cn/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "search",
    "delivery_form": null,
    "product_intro": "纳米AI 是 360 集团 推出的超级AI搜索工具。集合搜索、阅读、创作与多智能体协作的AI产品。\n产品主要覆盖AI 搜索、多智能体、内容创作等。通过问答、学习、写作和创作，帮助用户解决各种问题。通过强大的多智能体协作，完成复杂任务的拆解与执行。\n在实际工作中，它更适合网页搜索、资料总结、内容创作等。用户可以从明确问题、已有文件或素材开始，围绕同一结果持续补充上下文和修改要求。",
    "scenario_tags": null,
    "tool_type_ids": [
      "search"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "AI搜索与研究"
    ],
    "core_capabilities": [
      "AI 搜索",
      "多智能体",
      "网页总结",
      "内容创作"
    ],
    "external_sort_rank": 2,
    "external_sort_order": 34,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "search": 2
    }
  },
  {
    "id": "tool-ext-t8563e24dc0",
    "icon": "fa-book",
    "name": "得到大脑",
    "tags": [
      "ai-saas",
      "知识管理与写作"
    ],
    "author": "得到",
    "region": "domestic",
    "company": "得到",
    "best_for": "灵感记录、个人知识库、阅读笔记和跨笔记问答",
    "category": "external",
    "docs_url": "https://www.biji.com/",
    "logo_url": null,
    "position": 22,
    "media_url": "https://www.biji.com/",
    "published": true,
    "visibility": "public",
    "description": "将记录、知识输入和 AI 问答结合的个人知识管理工具。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "将记录、知识输入和 AI 问答结合的个人知识管理工具。",
    "homepage_url": "https://www.biji.com/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "knowledge",
    "delivery_form": null,
    "product_intro": "得到大脑 是 得到 推出的知识管理与学习产品。将记录、知识输入和 AI 问答结合的个人知识管理工具。\n主要能力包括AI 笔记、知识问答、内容整理、多端同步。支持碎片化记录，自动整理提炼关键信息。\n在实际工作中，它更适合灵感记录、个人知识库、阅读笔记和跨笔记问答。",
    "scenario_tags": null,
    "tool_type_ids": [
      "knowledge"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "知识管理与写作"
    ],
    "core_capabilities": [
      "AI 笔记",
      "知识问答",
      "内容整理",
      "多端同步"
    ],
    "external_sort_rank": 3,
    "external_sort_order": 35,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "knowledge": 3
    }
  },
  {
    "id": "tool-ext-grammarly",
    "icon": "fa-book",
    "name": "Grammarly",
    "tags": [
      "ai-saas",
      "知识管理与写作"
    ],
    "author": "Grammarly",
    "region": "overseas",
    "company": "Grammarly",
    "best_for": "英文邮件、报告润色、品牌语气统一与跨应用写作",
    "category": "external",
    "docs_url": "https://support.grammarly.com/",
    "logo_url": null,
    "position": 23,
    "media_url": "https://www.grammarly.com/ai",
    "published": true,
    "visibility": "public",
    "description": "覆盖语法、语气、改写与品牌风格控制的英文沟通助手。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "覆盖语法、语气、改写与品牌风格控制的英文沟通助手。",
    "homepage_url": "https://www.grammarly.com/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "knowledge",
    "delivery_form": null,
    "product_intro": "Grammarly 是 Grammarly 推出的写作与翻译产品。覆盖语法、语气、改写与品牌风格控制的英文沟通助手。\n主要能力包括语法校对、语气建议、生成式改写、风格指南。它将起草、改写、翻译、润色和风格统一整合到连续编辑流程中，用户可以围绕同一文本反复迭代。对语言质量、术语一致性、品牌语气或多语言本地化提供更细的控制。\n在实际工作中，它更适合英文邮件、报告润色、品牌语气统一与跨应用写作。",
    "scenario_tags": null,
    "tool_type_ids": [
      "knowledge"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "知识管理与写作"
    ],
    "core_capabilities": [
      "语法校对",
      "语气建议",
      "生成式改写",
      "风格指南"
    ],
    "external_sort_rank": 6,
    "external_sort_order": 36,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "knowledge": 6
    }
  },
  {
    "id": "tool-ext-beautiful-ai",
    "icon": "fa-file-powerpoint",
    "name": "Beautiful.ai",
    "tags": [
      "ai-saas",
      "演示与文档"
    ],
    "author": "Beautiful.ai",
    "region": "overseas",
    "company": "Beautiful.ai",
    "best_for": "标准化商业演示、销售提案、团队模板与快速改版",
    "category": "external",
    "docs_url": "https://support.beautiful.ai/",
    "logo_url": null,
    "position": 24,
    "media_url": "https://www.beautiful.ai/ai-presentations",
    "published": true,
    "visibility": "public",
    "description": "用智能版式和品牌控制快速生成专业演示文稿。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "用智能版式和品牌控制快速生成专业演示文稿。",
    "homepage_url": "https://www.beautiful.ai/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "ppt",
    "delivery_form": null,
    "product_intro": "Beautiful.ai 是 Beautiful.ai 推出的演示与文档产品。用智能版式和品牌控制快速生成专业演示文稿。\nBeautiful.ai 支持DesignerBot、智能版式、品牌控制、团队模板。它从主题、提纲或已有材料出发，协助完成内容结构、页面排版、视觉表达与可编辑文件输出。\n在实际工作中，它更适合标准化商业演示、销售提案、团队模板与快速改版。",
    "scenario_tags": null,
    "tool_type_ids": [
      "ppt"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "演示与文档"
    ],
    "core_capabilities": [
      "DesignerBot",
      "智能版式",
      "品牌控制",
      "团队模板"
    ],
    "external_sort_rank": 3,
    "external_sort_order": 37,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "ppt": 3
    }
  },
  {
    "id": "tool-ext-wps-ai",
    "icon": "fa-file-powerpoint",
    "name": "WPS AI",
    "tags": [
      "ai-saas",
      "演示与文档"
    ],
    "author": "金山办公",
    "region": "domestic",
    "company": "金山办公",
    "best_for": "中文文档起草、PPT 生成、PDF 阅读与表格处理",
    "category": "external",
    "docs_url": "https://ai.wps.cn/",
    "logo_url": null,
    "position": 25,
    "media_url": "https://ai.wps.cn/",
    "published": true,
    "visibility": "public",
    "description": "在文字、表格和演示中直接调用 AI，缩短从材料到成稿的链路。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "在文字、表格和演示中直接调用 AI，缩短从材料到成稿的链路。",
    "homepage_url": "https://ai.wps.cn/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "ppt",
    "delivery_form": null,
    "product_intro": "WPS AI 是嵌入 WPS 文字、表格、演示和 PDF 工作流的办公 AI。用户无需离开正在编辑的文件，就可以调用 AI 进行阅读、写作、数据处理和演示内容生成。\n产品的主要价值是把 AI 放到具体文档上下文中：在文字中起草与改写，在表格中分析和生成公式，在演示中搭建结构与页面，在 PDF 中总结并提问。\n它更适合已有办公材料的快速加工与跨格式流转。正式交付前应保留原始文件，检查公式、图表、版式和引用，避免自动修改覆盖重要内容。",
    "scenario_tags": null,
    "tool_type_ids": [
      "ppt"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "演示与文档"
    ],
    "core_capabilities": [
      "文档写作",
      "智能 PPT",
      "PDF 问答",
      "表格分析"
    ],
    "external_sort_rank": 3,
    "external_sort_order": 38,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "ppt": 3
    }
  },
  {
    "id": "tool-ext-te06e975987",
    "icon": "fa-file-powerpoint",
    "name": "讯飞智文",
    "tags": [
      "ai-saas",
      "演示与文档"
    ],
    "author": "科大讯飞",
    "region": "domestic",
    "company": "科大讯飞",
    "best_for": "中文汇报、培训课件、长文转 PPT 与内容大纲",
    "category": "external",
    "docs_url": "https://zhiwen.xfyun.cn/",
    "logo_url": null,
    "position": 26,
    "media_url": "https://zhiwen.xfyun.cn/",
    "published": true,
    "visibility": "public",
    "description": "从主题或长文档生成中文演示、长文和结构化内容。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "从主题或长文档生成中文演示、长文和结构化内容。",
    "homepage_url": "https://zhiwen.xfyun.cn/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "ppt",
    "delivery_form": null,
    "product_intro": "讯飞智文 是 科大讯飞 推出的演示与文档产品。从主题或长文档生成中文演示、长文和结构化内容。\n主要能力包括AI 生成 PPT、文档转演示、智能配图等。它从主题、提纲或已有材料出发，协助完成内容结构、页面排版、视觉表达与可编辑文件输出。\n在实际工作中，它更适合中文汇报、培训课件、长文转 PPT 与内容大纲。",
    "scenario_tags": null,
    "tool_type_ids": [
      "ppt"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "演示与文档"
    ],
    "core_capabilities": [
      "AI 生成 PPT",
      "文档转演示",
      "智能配图",
      "模板换肤"
    ],
    "external_sort_rank": 4,
    "external_sort_order": 39,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "ppt": 4
    }
  },
  {
    "id": "tool-saas-tongyi-2",
    "icon": "fa-image",
    "name": "Qwen Image",
    "tags": [
      "ai-saas",
      "图像与设计"
    ],
    "author": "阿里云",
    "region": "domestic",
    "company": "阿里云",
    "best_for": "中文海报、信息图、图像编辑与开放模型工作流",
    "category": "external",
    "docs_url": "https://qwenlm.github.io/blog/qwen-image/",
    "logo_url": null,
    "position": 27,
    "media_url": "https://qwen.ai/blog?id=qwen-image-3.0",
    "published": true,
    "visibility": "public",
    "description": "支持中英文文字渲染、图像生成与编辑的通义视觉模型。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "支持中英文文字渲染、图像生成与编辑的通义视觉模型。",
    "homepage_url": "https://chat.qwen.ai/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "image",
    "delivery_form": null,
    "product_intro": "Qwen Image 是 阿里云开源商用图像大模型，支持中文文字渲染、图像生成、图文编辑与精准排版。\n主要能力包括超长指令理解，支持复杂多元素布局及信息图。链式图像编辑，多轮修改能够保持主体一致性。写实、插画、UI 草图多风格兼顾。\n在实际工作中，它更适合中文海报、信息图、图像编辑与开放模型工作流。",
    "scenario_tags": null,
    "tool_type_ids": [
      "image"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "图像与设计"
    ],
    "core_capabilities": [
      "中英文文字",
      "文本生图",
      "图像编辑",
      "开放模型"
    ],
    "external_sort_rank": 3,
    "external_sort_order": 40,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "image": 3
    }
  },
  {
    "id": "tool-ext-google-flow-veo",
    "icon": "fa-video",
    "name": "Google Flow / Veo",
    "tags": [
      "ai-saas",
      "视频与数字人"
    ],
    "author": "Google DeepMind",
    "region": "overseas",
    "company": "Google DeepMind",
    "best_for": "电影化分镜、广告概念、镜头延展和视听一体短片",
    "category": "external",
    "docs_url": "https://support.google.com/labs/answer/16353333",
    "logo_url": null,
    "position": 28,
    "media_url": "https://deepmind.google/models/veo/",
    "published": true,
    "visibility": "public",
    "description": "以 Veo 模型和 Flow 创作界面生成高质量、带声音的可控视频。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "以 Veo 模型和 Flow 创作界面生成高质量、带声音的可控视频。",
    "homepage_url": "https://labs.google/fx/tools/flow/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "video",
    "delivery_form": null,
    "product_intro": "Google Flow / Veo 是 Google DeepMind 推出的视频与数字人产品。以 Veo 视频生成模型和 Flow 可视化创作界面生成高质量、带声音的可控视频。\n产品能力主要有文生视频、图生视频，原生同步生成音效、环境音、台词音频。Flow 支持时间轴、多镜头拼接、角色跨镜头锁定。\n在实际工作中，它更适合电影化分镜、广告概念、镜头延展和视听一体短片。",
    "scenario_tags": null,
    "tool_type_ids": [
      "video"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "视频与数字人"
    ],
    "core_capabilities": [
      "文生视频",
      "原生音频",
      "镜头控制",
      "Flow 工作台"
    ],
    "external_sort_rank": 3,
    "external_sort_order": 41,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "video": 3
    }
  },
  {
    "id": "tool-ext-heygen",
    "icon": "fa-video",
    "name": "HeyGen",
    "tags": [
      "ai-saas",
      "视频与数字人"
    ],
    "author": "HeyGen",
    "region": "overseas",
    "company": "HeyGen",
    "best_for": "培训视频、产品讲解、多语言本地化和数字人口播",
    "category": "external",
    "docs_url": "https://docs.heygen.com/",
    "logo_url": null,
    "position": 29,
    "media_url": "https://www.heygen.com/blog/announcing-avatar-v",
    "published": true,
    "visibility": "public",
    "description": "从脚本快速生成数字人讲解、多语言翻译与企业视频。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "从脚本快速生成数字人讲解、多语言翻译与企业视频。",
    "homepage_url": "https://www.heygen.com/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "video",
    "delivery_form": null,
    "product_intro": "HeyGen 是 HeyGen 推出的AI数字人视频创作平台，致力于简化视频制作过程，让用户能迅速制作出具有专业水准的数字人视频。从脚本快速生成数字人讲解、多语言翻译与企业视频。\nHeyGen能将文本、图像或音频快速转化为高质量视频，基于视频创作Agent，能实现从创意构思到成品视频的一站式制作，HeyGen支持多语言语音克隆、AI 字幕生成等功能。\n在实际工作中，它更适合培训视频、产品演示讲解、多语言本地化和数字人口播。",
    "scenario_tags": null,
    "tool_type_ids": [
      "video"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "视频与数字人"
    ],
    "core_capabilities": [
      "数字人",
      "语音克隆",
      "视频翻译",
      "品牌模板"
    ],
    "external_sort_rank": 2,
    "external_sort_order": 42,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "video": 2
    }
  },
  {
    "id": "tool-saas-kling",
    "icon": "fa-image",
    "name": "可灵AI",
    "tags": [
      "ai-saas",
      "图像与设计",
      "视频与数字人"
    ],
    "author": "快手",
    "region": "domestic",
    "company": "快手",
    "best_for": "广告短片、角色动画、图生视频与创意镜头制作",
    "category": "external",
    "docs_url": "https://app.klingai.com/global/quickstart/klingai-video-3-model-user-guide",
    "logo_url": null,
    "position": 30,
    "media_url": "https://app.klingai.com/global/",
    "published": true,
    "visibility": "public",
    "description": "支持长镜头、角色一致性和多模态控制的国产 AI 视频平台。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "支持长镜头、角色一致性和多模态控制的国产 AI 视频平台。",
    "homepage_url": "https://app.klingai.com/global/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "image",
    "delivery_form": null,
    "product_intro": "可灵AI 是快手自研多模态平台，图像 + 视频双主线，Image 3.0 Omni 模型主打影视级叙事静帧。\n可灵AI 具备强大镜头语言理解，构图、光影、景深、影视氛围感突出。原生支持系列组图批量生成，同一角色跨画面五官、造型稳定，适合分镜、IP 系列图。支持多张参考图融合，超清输出，写实质感。\n在实际工作中，它更适合广告短片、角色动画、图生视频、IP角色系列插图、创意镜头制作。",
    "scenario_tags": null,
    "tool_type_ids": [
      "image",
      "video"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "图像与设计",
      "视频与数字人"
    ],
    "core_capabilities": [
      "文生视频",
      "图生视频",
      "多镜头叙事",
      "角色一致性"
    ],
    "external_sort_rank": 1,
    "external_sort_order": 43,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "image": 1,
      "video": 1
    }
  },
  {
    "id": "tool-ext-suno",
    "icon": "fa-microphone",
    "name": "Suno",
    "tags": [
      "ai-saas",
      "音频与语音"
    ],
    "author": "Suno, Inc.",
    "region": "overseas",
    "company": "Suno, Inc.",
    "best_for": "概念音乐、广告配乐、歌曲草稿和创意音频实验",
    "category": "external",
    "docs_url": "https://help.suno.com/",
    "logo_url": null,
    "position": 31,
    "media_url": "https://suno.com/blog/v5-5",
    "published": true,
    "visibility": "public",
    "description": "从歌词、主题或音频灵感生成完整歌曲与伴奏的 AI 音乐平台。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "从歌词、主题或音频灵感生成完整歌曲与伴奏的 AI 音乐平台。",
    "homepage_url": "https://suno.com/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "audio",
    "delivery_form": null,
    "product_intro": "Suno 是 Suno, Inc. 推出的文生音乐平台。从歌词、主题或音频灵感生成完整歌曲与伴奏的 AI 音乐平台。\nSuno 文本生成歌曲、人声与伴奏、风格控制、音轨延展。曲风覆盖流行、摇滚、国风、电子、说唱。能快速产出短视频原创背景音乐。\nSuno 适合概念音乐、广告配乐、歌曲草稿和创意音频实验。",
    "scenario_tags": null,
    "tool_type_ids": [
      "audio"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "音频与语音"
    ],
    "core_capabilities": [
      "文本生成歌曲",
      "人声与伴奏",
      "风格控制",
      "音轨延展"
    ],
    "external_sort_rank": 2,
    "external_sort_order": 45,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "audio": 2
    }
  },
  {
    "id": "tool-ext-mureka",
    "icon": "fa-microphone",
    "name": "Mureka",
    "tags": [
      "ai-saas",
      "音频与语音"
    ],
    "author": "昆仑万维",
    "region": "domestic",
    "company": "昆仑万维",
    "best_for": "中文歌曲、旋律拓展、音乐 Demo 和创作者发行",
    "category": "external",
    "docs_url": "https://www.mureka.ai/",
    "logo_url": null,
    "position": 32,
    "media_url": "https://www.mureka.ai/",
    "published": true,
    "visibility": "public",
    "description": "支持歌词、旋律和风格控制的 AI 音乐创作与发行平台。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "支持歌词、旋律和风格控制的 AI 音乐创作与发行平台。",
    "homepage_url": "https://www.mureka.ai/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "audio",
    "delivery_form": null,
    "product_intro": "Mureka 是 昆仑万维 推出的一站式 AI 音频创作平台。支持歌词、旋律和风格控制的 AI 音乐创作与发行平台。\nMureka支持歌词生歌、旋律参考、风格控制、音乐发布。附带 TTS 语音克隆，上传短音频生成专属声线。曲风覆盖流行、国风、电子、影视配乐，支持哼唱转旋律、参考曲风迁移。\nMureka适合中文歌曲、旋律拓展、音乐 Demo 和创作者发行。",
    "scenario_tags": null,
    "tool_type_ids": [
      "audio"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "音频与语音"
    ],
    "core_capabilities": [
      "歌词生歌",
      "旋律参考",
      "风格控制",
      "音乐发布"
    ],
    "external_sort_rank": 2,
    "external_sort_order": 46,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "audio": 2
    }
  },
  {
    "id": "tool-ext-otter-ai",
    "icon": "fa-users",
    "name": "Otter.ai",
    "tags": [
      "ai-saas",
      "会议与协作"
    ],
    "author": "Otter.ai",
    "region": "overseas",
    "company": "Otter.ai",
    "best_for": "英文会议、销售通话、采访和跨团队行动项跟踪",
    "category": "external",
    "docs_url": "https://help.otter.ai/",
    "logo_url": null,
    "position": 33,
    "media_url": "https://otter.ai/meeting-agent",
    "published": true,
    "visibility": "public",
    "description": "自动加入会议、实时转写、总结并提取任务的英语会议助手。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "自动加入会议、实时转写、总结并提取任务的英语会议助手。",
    "homepage_url": "https://otter.ai/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "meeting",
    "delivery_form": null,
    "product_intro": "Otter.ai 是 Otter.ai 推出的智能会议记录工具。通过实时转录和AI技术帮助用户捕捉会议中的每一个细节，生成摘要、行动项。支持网页、移动端、桌面端，不绑定任意视频会议软件。\nOtter.ai 支持实时转写、自动总结、行动项、会议机器人。它从会议音频或在线会议开始，完成转写、摘要、结论与行动项提取，并把结果同步到团队协作流程。\n在实际工作中，它更适合英文会议、销售通话、采访和跨团队行动项跟踪。需要实时字幕、长期留存可检索会议资料库；产品、市场、高管例会等",
    "scenario_tags": null,
    "tool_type_ids": [
      "meeting"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "会议与协作"
    ],
    "core_capabilities": [
      "实时转写",
      "自动总结",
      "行动项",
      "会议机器人"
    ],
    "external_sort_rank": 1,
    "external_sort_order": 47,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "meeting": 1
    }
  },
  {
    "id": "tool-ext-zoom-ai-companion",
    "icon": "fa-users",
    "name": "Zoom AI Companion",
    "tags": [
      "ai-saas",
      "会议与协作"
    ],
    "author": "Zoom",
    "region": "overseas",
    "company": "Zoom",
    "best_for": "Zoom 会议总结、错过内容追问、会后行动与团队协作",
    "category": "external",
    "docs_url": "https://support.zoom.com/hc/en/category?id=kb_category&kb_category=8bc9d0b123b5be10f7b2d12afc4bcb08",
    "logo_url": null,
    "position": 34,
    "media_url": "https://www.zoom.com/en/products/ai-assistant/",
    "published": true,
    "visibility": "public",
    "description": "嵌入 Zoom 会议与协作套件的摘要、问答和任务辅助能力。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "嵌入 Zoom 会议与协作套件的摘要、问答和任务辅助能力。",
    "homepage_url": "https://www.zoom.com/en/products/ai-assistant/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "meeting",
    "delivery_form": null,
    "product_intro": "Zoom AI Companion 是 Zoom 推出的会议与协作产品，是Zoom 原生内置AI能力，具备记忆、推理、任务执行和协调能力。\nZoom AI Companion能够从会议音频或在线会议开始，完成转写、摘要、结论与行动项提取，并把结果同步到团队协作流程。\n在实际工作中，它更适合Zoom 会议总结、会后行动与团队协作；内部例会、远程部门同步、线上培训。",
    "scenario_tags": null,
    "tool_type_ids": [
      "meeting"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "会议与协作"
    ],
    "core_capabilities": [
      "会议摘要",
      "会中问答",
      "智能撰写",
      "任务辅助"
    ],
    "external_sort_rank": 3,
    "external_sort_order": 48,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "meeting": 3
    }
  },
  {
    "id": "tool-ext--ai",
    "icon": "fa-users",
    "name": "腾讯会议 AI",
    "tags": [
      "ai-saas",
      "会议与协作"
    ],
    "author": "腾讯",
    "region": "domestic",
    "company": "腾讯",
    "best_for": "中文线上会议、跨端协作、会后回看与要点同步",
    "category": "external",
    "docs_url": "https://meeting.tencent.com/support/",
    "logo_url": null,
    "position": 35,
    "media_url": "https://meeting.tencent.com/ai/",
    "published": true,
    "visibility": "public",
    "description": "在腾讯会议中提供实时转写、智能录制、摘要和会议问答。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "在腾讯会议中提供实时转写、智能录制、摘要和会议问答。",
    "homepage_url": "https://meeting.tencent.com/ai/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "meeting",
    "delivery_form": null,
    "product_intro": "腾讯会议 AI 是 腾讯 推出的会议与协作产品。内嵌在腾讯会议客户端，只服务腾讯会议会话，在腾讯会议中提供实时转写、智能录制、摘要和会议问答。\n支持会议实时转写，会后自动输出完整逐字稿与 AI 摘要，智能识别观点、决策项、待办任务，支持区分发言人、多语种实时翻译；纪要一键导出文档、分享参会人。\n在实际工作中，它更适合全员使用腾讯会议的公司，大量客户外部线上沟通、政企线上会议；，追求轻量化、零配置会议记录；销售对外线上洽谈、远程培训。",
    "scenario_tags": null,
    "tool_type_ids": [
      "meeting"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "会议与协作"
    ],
    "core_capabilities": [
      "实时转写",
      "AI 摘要",
      "会议问答",
      "智能录制"
    ],
    "external_sort_rank": 2,
    "external_sort_order": 49,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "meeting": 2
    }
  },
  {
    "id": "tool-ext-t13eee22e20",
    "icon": "fa-users",
    "name": "通义听悟",
    "tags": [
      "ai-saas",
      "会议与协作"
    ],
    "author": "阿里云",
    "region": "domestic",
    "company": "阿里云",
    "best_for": "会议、访谈、课程和长音视频的中文整理与复盘",
    "category": "external",
    "docs_url": "https://help.aliyun.com/zh/tingwu/",
    "logo_url": null,
    "position": 36,
    "media_url": "https://tingwu.aliyun.com/",
    "published": true,
    "visibility": "public",
    "description": "面向音视频内容的转写、章节、摘要、翻译与智能问答工具。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "面向音视频内容的转写、章节、摘要、翻译与智能问答工具。",
    "homepage_url": "https://tingwu.aliyun.com/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "meeting",
    "delivery_form": null,
    "product_intro": "通义听悟 是 阿里云 推出的跨平台 AI 音视频转写工具，独立网页 / 客户端，不绑定单一会议软件。\n通义听悟支持腾讯会议、飞书会议、线下录音、本地音视频上传转写，跨平台通用。中英实时翻译、支持长音频处理；可生成思维导图形式会议梳理。自动生成章节速览、要点、问答、待办清单。\n在实际工作中，它更适合线上课程、直播回放转文字；访谈录音整理等。不被单一办公生态绑定。",
    "scenario_tags": null,
    "tool_type_ids": [
      "meeting"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "会议与协作"
    ],
    "core_capabilities": [
      "音视频转写",
      "智能摘要",
      "章节速览",
      "中英翻译"
    ],
    "external_sort_rank": 4,
    "external_sort_order": 50,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "meeting": 4
    }
  },
  {
    "id": "tool-saas-workbuddy",
    "icon": "fa-robot",
    "name": "WorkBuddy",
    "tags": [
      "ai-saas",
      "智能体"
    ],
    "author": "腾讯云",
    "region": "domestic",
    "company": "腾讯云",
    "best_for": "调研报告、文档与演示制作、表格分析、本地文件处理和跨工具任务执行",
    "category": "external",
    "docs_url": "https://www.workbuddy.ai/docs/workbuddy/",
    "logo_url": null,
    "position": 37,
    "media_url": "https://www.tencent.com/tencent-cloud-debuts-productivity-agent-suite-creating-a-new-gateway-to-ai-for-users-and-enterprises/",
    "published": true,
    "visibility": "public",
    "description": "从工作目标出发规划步骤、处理材料，并自主完成跨工具办公任务。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "从工作目标出发规划步骤、处理材料，并自主完成跨工具办公任务。",
    "homepage_url": "https://www.workbuddy.ai/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "agent",
    "delivery_form": null,
    "product_intro": "WorkBuddy 是腾讯推出的面向工作目标的桌面端执行型 AI 助手。用户给出任务和材料后，它会规划步骤、处理文件并推进跨工具工作，不局限于返回一段文字答案。\n产品适合把研究、信息整理、办公写作、数据处理和成果制作连接成连续流程，让员工从“告诉我怎么做”转向“按要求完成并交付”。任务过程中的目标、资料和输出格式可以持续补充。\n它更适合边界明确且需要多个步骤的办公任务。使用时应先限定可访问的数据与工具、写明人工确认点，并在发送、发布、采购或修改真实数据前进行复核。",
    "scenario_tags": null,
    "tool_type_ids": [
      "agent"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "智能体"
    ],
    "core_capabilities": [
      "自主任务规划",
      "本地文件操作",
      "多任务并行",
      "可交付成果生成"
    ],
    "external_sort_rank": 3,
    "external_sort_order": 51,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "agent": 3
    }
  },
  {
    "id": "tool-ext-codex",
    "icon": "fa-code",
    "name": "Codex",
    "tags": [
      "ai-saas",
      "编程开发",
      "智能体"
    ],
    "author": "OpenAI",
    "region": "overseas",
    "company": "OpenAI",
    "best_for": "代码库任务、并行开发、代码审查、测试与自动化修复",
    "category": "external",
    "docs_url": "https://developers.openai.com/codex/",
    "logo_url": null,
    "position": 38,
    "media_url": "https://openai.com/codex/",
    "published": true,
    "visibility": "public",
    "description": "理解任务与工作文件后自主推进写作、分析、制作和代码工作，并交付完整成果。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "理解任务与工作文件后自主推进写作、分析、制作和代码工作，并交付完整成果。",
    "homepage_url": "https://openai.com/codex/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "code",
    "delivery_form": null,
    "product_intro": "Codex 是OpenAI 推出的 AI 编程智能体，通过可视化图形界面与开发者交互，它会先理解目标和工作区材料，再规划步骤、读取文件、生成或修改内容，通过实际操作把任务推进到可检查的成果。\n在支持的工作环境中，Codex 可以处理文案与研究材料、整理和分析数据、制作文档或演示草稿，也能完成代码理解、实现、测试与审查。过程中的文件和执行结果会保留下来，便于逐步核验。\n它尤其适合边界清楚、需要连续操作的办公或技术任务。使用时应明确交付格式、允许访问的材料和必须人工确认的节点，再依据中间结果继续修正，而不是只给一个宽泛题目。",
    "scenario_tags": null,
    "tool_type_ids": [
      "code",
      "agent"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "编程开发",
      "智能体"
    ],
    "core_capabilities": [
      "代码库理解",
      "云端任务",
      "运行与验证",
      "代码审查"
    ],
    "external_sort_rank": 3,
    "external_sort_order": 52,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "code": 5,
      "agent": 3
    }
  },
  {
    "id": "tool-saas-claude-code",
    "icon": "fa-code",
    "name": "Claude Code",
    "tags": [
      "ai-saas",
      "编程开发",
      "智能体"
    ],
    "author": "Anthropic",
    "region": "overseas",
    "company": "Anthropic",
    "best_for": "大型代码库理解、重构、调试和自动化工程工作流",
    "category": "external",
    "docs_url": "https://docs.anthropic.com/en/docs/claude-code/overview",
    "logo_url": null,
    "position": 39,
    "media_url": "https://www.anthropic.com/claude-code",
    "published": true,
    "visibility": "public",
    "description": "可读取代码库、编辑文件、运行命令，并在终端、IDE、桌面端与网页执行工程任务。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "可读取代码库、编辑文件、运行命令，并在终端、IDE、桌面端与网页执行工程任务。",
    "homepage_url": "https://www.anthropic.com/claude-code",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "code",
    "delivery_form": null,
    "product_intro": "Claude Code 是是 Anthropic 公司推出的基于命令行的 AI 编程工具。能理解自然语言指令。可读取代码库、编辑文件、运行命令，并在终端、IDE、桌面端与网页执行工程任务。\nClaude Code支持文件操作、代码搜索、网页浏览和 Git 工作流管理；具备代码库深度理解、多文件协同修改、代码生成与优化、集成主流IDE等能力。\n在实际工作中，它更适合大型代码库理解、重构、调试和自动化工程工作流；大型系统整体重构、跨模块改造；数据库大规模迁移、底层逻辑优化。",
    "scenario_tags": null,
    "tool_type_ids": [
      "code",
      "agent"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "编程开发",
      "智能体"
    ],
    "core_capabilities": [
      "终端智能体",
      "代码库理解",
      "工具调用",
      "多智能体协作"
    ],
    "external_sort_rank": 4,
    "external_sort_order": 53,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "code": 4,
      "agent": 4
    }
  },
  {
    "id": "tool-saas-copilot",
    "icon": "fa-code",
    "name": "GitHub Copilot",
    "tags": [
      "ai-saas",
      "编程开发"
    ],
    "author": "GitHub / Microsoft",
    "region": "overseas",
    "company": "GitHub / Microsoft",
    "best_for": "日常 IDE 开发、Pull Request、代码审查与 GitHub 工作流",
    "category": "external",
    "docs_url": "https://docs.github.com/en/copilot",
    "logo_url": null,
    "position": 40,
    "media_url": "https://github.com/features/copilot",
    "published": true,
    "visibility": "public",
    "description": "覆盖 IDE 补全、聊天、代码审查和 GitHub 编码智能体的开发助手。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "覆盖 IDE 补全、聊天、代码审查和 GitHub 编码智能体的开发助手。",
    "homepage_url": "https://github.com/features/copilot",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "code",
    "delivery_form": null,
    "product_intro": "GitHub Copilot 是由GitHub与OpenAI合作开发的一款革命性的智能代码补全和生成工具，旨在帮助开发人员更高效、更准确、更快地编写代码。\nGitHub Copilot 支持代码建议与自动补全，自然语言理解，支持多种编程语言，代码审查、代码重构与示例等\n在实际工作中，它更适合日常 IDE 开发、Pull Request、代码审查与 GitHub 工作流。团队常规业务日常编码；写业务 CRUD、脚本、样板代码；中小型稳定项目迭代等。",
    "scenario_tags": null,
    "tool_type_ids": [
      "code"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "编程开发"
    ],
    "core_capabilities": [
      "代码补全",
      "Copilot Chat",
      "Coding Agent",
      "代码审查"
    ],
    "external_sort_rank": 2,
    "external_sort_order": 54,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "code": 2
    }
  },
  {
    "id": "tool-saas-trae",
    "icon": "fa-code",
    "name": "TRAE",
    "tags": [
      "ai-saas",
      "编程开发"
    ],
    "author": "字节跳动",
    "region": "domestic",
    "company": "字节跳动",
    "best_for": "从需求到应用、中文研发、跨文件编辑和智能体编程",
    "category": "external",
    "docs_url": "https://docs.trae.ai/",
    "logo_url": null,
    "position": 41,
    "media_url": "https://www.trae.ai/",
    "published": true,
    "visibility": "public",
    "description": "集成代码理解、生成和任务执行的 AI 原生开发环境。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "集成代码理解、生成和任务执行的 AI 原生开发环境。",
    "homepage_url": "https://www.trae.ai/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "code",
    "delivery_form": null,
    "product_intro": "TRAE 是 字节跳动自研AI 原生一体化 IDE，拥有独立客户端，支持SOLO 自主智能体模式，集成代码理解、生成和任务执行的 AI 原生开发环境。\n产品支持IDE 模式（常规编码补全）+ SOLO 模式（AI 自主承接完整开发需求），一句话需求自动生成整套项目脚手架、多文件批量创建与修改，自定义智能体，上下文理解及区域化部署。\n在实际工作中，它更适合新项目原型快速验证、从零搭建 Demo；前端项目、数据脚本、爬虫开发；独立开发者 / 全栈工程师快速落地想法；中小型全栈创新项目。",
    "scenario_tags": null,
    "tool_type_ids": [
      "code"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "编程开发"
    ],
    "core_capabilities": [
      "AI IDE",
      "SOLO 模式",
      "代码库理解",
      "多模型"
    ],
    "external_sort_rank": 2,
    "external_sort_order": 55,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "code": 2
    }
  },
  {
    "id": "tool-ext--codebuddy",
    "icon": "fa-code",
    "name": "腾讯 CodeBuddy",
    "tags": [
      "ai-saas",
      "编程开发"
    ],
    "author": "腾讯云",
    "region": "domestic",
    "company": "腾讯云",
    "best_for": "中文研发、代码补全、企业知识接入和端到端应用开发",
    "category": "external",
    "docs_url": "https://copilot.tencent.com/docs/",
    "logo_url": null,
    "position": 42,
    "media_url": "https://copilot.tencent.com/",
    "published": true,
    "visibility": "public",
    "description": "面向企业研发的代码助手、AI IDE 与工程任务智能体。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "面向企业研发的代码助手、AI IDE 与工程任务智能体。",
    "homepage_url": "https://copilot.tencent.com/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "code",
    "delivery_form": null,
    "product_intro": "腾讯 CodeBuddy 是 腾讯云 推出的编程开发产品。面向企业研发的代码助手、AI IDE 与工程任务智能体。\nCodeBuddy 支持代码补全、诊断、优化、重构，能生成单元测试和进行代码评审。兼容 MCP 开放生态，能接入多种第三方工具和服务。\n在实际工作中，它更适合微信小程序、公众号、腾讯云开发项目；ToC 互联网前端业务；产品 / 设计 / 开发协同，消除设计与开发沟通成本；初创团队快速将产品原型转为可运行代码。",
    "scenario_tags": null,
    "tool_type_ids": [
      "code"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "编程开发"
    ],
    "core_capabilities": [
      "代码补全",
      "AI IDE",
      "工程智能体",
      "企业知识"
    ],
    "external_sort_rank": 3,
    "external_sort_order": 56,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "code": 3
    }
  },
  {
    "id": "tool-ext-dify",
    "icon": "fa-robot",
    "name": "Dify",
    "tags": [
      "ai-saas",
      "智能体"
    ],
    "author": "LangGenius",
    "region": "domestic",
    "company": "LangGenius",
    "best_for": "企业知识助手、模型编排、可观测 AI 应用与私有部署",
    "category": "external",
    "docs_url": "https://docs.dify.ai/",
    "logo_url": null,
    "position": 43,
    "media_url": "https://dify.ai/",
    "published": true,
    "visibility": "public",
    "description": "用于搭建 RAG、工作流和生产级 AI 应用的开源平台。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "用于搭建 RAG、工作流和生产级 AI 应用的开源平台。",
    "homepage_url": "https://dify.ai/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "agent",
    "delivery_form": null,
    "product_intro": "Dify 是 LangGenius 推出的开源 LLMOps/AI 应用开发平台，属于底层搭建工具。用于搭建 RAG、工作流和生产级 AI 应用的开源平台。\nDify支持可视化工作流编排、企业级 RAG、Agent 循环调用、插件扩展、应用监控与 LLMOps 运维。完全开源，支持本地私有化部署。\n在实际工作中，它更适合企业知识助手、模型编排、可观测 AI 应用与私有部署。",
    "scenario_tags": null,
    "tool_type_ids": [
      "agent"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "智能体"
    ],
    "core_capabilities": [
      "工作流",
      "RAG",
      "模型管理",
      "开源自托管"
    ],
    "external_sort_rank": 6,
    "external_sort_order": 57,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "agent": 6
    }
  },
  {
    "id": "tool-ext-synthesia",
    "icon": "fa-video",
    "name": "Synthesia",
    "tags": [
      "ai-saas",
      "视频与数字人"
    ],
    "author": "Synthesia",
    "region": "overseas",
    "company": "Synthesia",
    "best_for": "培训课程、产品讲解、企业传播、本地化视频和数字人主持",
    "category": "external",
    "docs_url": "https://help.synthesia.io/",
    "logo_url": null,
    "position": 44,
    "media_url": "https://www.synthesia.io/features/ai-video-generator",
    "published": true,
    "visibility": "public",
    "description": "用脚本、文档或网页快速生成多语言数字人讲解视频。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "用脚本、文档或网页快速生成多语言数字人讲解视频。",
    "homepage_url": "https://www.synthesia.io/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "video",
    "delivery_form": null,
    "product_intro": "Synthesia 是 Synthesia 推出的视频生成制作工具。具备视频编辑、团队协作、一键翻译和本地化等功能，可将文档、网页等快速转化为视频。\nSynthesia支持AI虚拟形象、多语言支持将自动转换成相应语言的语音，可将文字转化为高质量配音，支持视频剪辑、一键翻译能力。\n在实际工作中，它更适合培训课程、产品讲解、企业传播、本地化视频和数字人主持。",
    "scenario_tags": null,
    "tool_type_ids": [
      "video"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "视频与数字人"
    ],
    "core_capabilities": [
      "AI 数字人",
      "文档转视频",
      "多语言翻译",
      "团队协作"
    ],
    "external_sort_rank": 5,
    "external_sort_order": 58,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "video": 5
    }
  },
  {
    "id": "tool-ext-fireflies-ai",
    "icon": "fa-users",
    "name": "Fireflies.ai",
    "tags": [
      "ai-saas",
      "会议与协作"
    ],
    "author": "Fireflies.ai",
    "region": "overseas",
    "company": "Fireflies.ai",
    "best_for": "跨平台会议纪要、团队知识沉淀、销售复盘和工作流同步",
    "category": "external",
    "docs_url": "https://guide.fireflies.ai/",
    "logo_url": null,
    "position": 45,
    "media_url": "https://fireflies.ai/product",
    "published": true,
    "visibility": "public",
    "description": "自动加入线上会议，完成转写、总结、行动项与跨会议检索。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "自动加入线上会议，完成转写、总结、行动项与跨会议检索。",
    "homepage_url": "https://fireflies.ai/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "meeting",
    "delivery_form": null,
    "product_intro": "Fireflies.ai 是 Fireflies.ai 推出的会议与协作产品。自动加入线上会议，完成转写、总结、行动项与跨会议检索。\nFireflies.ai 支持会议转写、生成详细的 AI 总结、提取关键信息、生成后续邮件等。支持 100 + 语种自动识别，多语言国际会议自动识别发言人、自动语言检测等。\n在实际工作中，它更适合多语种跨境商务洽谈、团队知识沉淀、销售团队、客户持续沟通、招聘面试等。",
    "scenario_tags": null,
    "tool_type_ids": [
      "meeting"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "会议与协作"
    ],
    "core_capabilities": [
      "会议转写",
      "AI 摘要",
      "行动项",
      "应用集成"
    ],
    "external_sort_rank": 2,
    "external_sort_order": 59,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "meeting": 2
    }
  },
  {
    "id": "tool-ext-ima",
    "icon": "fa-book",
    "name": "ima",
    "tags": [
      "ai-saas",
      "知识管理与写作"
    ],
    "author": "腾讯",
    "region": "domestic",
    "company": "腾讯",
    "best_for": "个人知识库、网页收藏、长文阅读、资料问答和基于知识的写作",
    "category": "external",
    "docs_url": "https://ima.qq.com/extension-info",
    "logo_url": null,
    "position": 46,
    "media_url": "https://ima.qq.com/",
    "published": true,
    "visibility": "public",
    "description": "以个人知识库为核心，串联搜索、阅读、记录与写作的 AI 工作台。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "以个人知识库为核心，串联搜索、阅读、记录与写作的 AI 工作台。",
    "homepage_url": "https://ima.qq.com/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "knowledge",
    "delivery_form": null,
    "product_intro": "ima 是 腾讯 推出的知识管理与学习产品。以个人知识库为核心，串联搜索、阅读、记录与写作的 AI 工作台。\n主要能力包括知识库问答、搜读写一体、网页收藏、多模型支持。支持多种格式文件上传及解析。可对多篇资料进行分析对比、内容梳理与要点提炼。\n在实际工作中，它更适合个人知识库、网页收藏、长文阅读、资料问答和基于知识的写作。",
    "scenario_tags": null,
    "tool_type_ids": [
      "knowledge"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "知识管理与写作"
    ],
    "core_capabilities": [
      "知识库问答",
      "搜读写一体",
      "网页收藏",
      "多模型支持"
    ],
    "external_sort_rank": 2,
    "external_sort_order": 60,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "knowledge": 2
    }
  },
  {
    "id": "tool-ext-meta-ai",
    "icon": "fa-comments",
    "name": "Meta AI",
    "tags": [
      "ai-saas",
      "通用AI助手"
    ],
    "author": "Meta",
    "region": "overseas",
    "company": "Meta",
    "best_for": "轻量问答、社交内容创作、图片生成和跨 Meta 应用使用",
    "category": "external",
    "docs_url": "https://www.meta.ai/help/",
    "logo_url": null,
    "position": 47,
    "media_url": "https://ai.meta.com/meta-ai/",
    "published": true,
    "visibility": "public",
    "description": "连接 Meta 社交生态的多模态助手，支持问答、创作、图片与日常任务。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "连接 Meta 社交生态的多模态助手，支持问答、创作、图片与日常任务。",
    "homepage_url": "https://www.meta.ai/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "general",
    "delivery_form": null,
    "product_intro": "Meta AI 是 Meta 推出的通用AI助手产品。连接 Meta 社交生态的多模态助手，支持问答、创作、图片与日常任务。\nMeta AI提供多模态问答、支持图文对话、简单图像生成；社交场景轻量化问答。社交应用集成、语音交互。\n在实际工作中，它更适合轻量问答、社交内容创作、图片生成和跨 Meta 应用使用。",
    "scenario_tags": null,
    "tool_type_ids": [
      "general"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "通用AI助手"
    ],
    "core_capabilities": [
      "多模态问答",
      "图片生成",
      "社交应用集成",
      "语音交互"
    ],
    "external_sort_rank": 5,
    "external_sort_order": 61,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "general": 5
    }
  },
  {
    "id": "tool-saas-yuanbao",
    "icon": "fa-comments",
    "name": "腾讯元宝",
    "tags": [
      "ai-saas",
      "通用AI助手"
    ],
    "author": "腾讯",
    "region": "domestic",
    "company": "腾讯",
    "best_for": "中文问答、公众号内容理解、文件阅读、日常写作和图片创作",
    "category": "external",
    "docs_url": null,
    "logo_url": null,
    "position": 48,
    "media_url": "https://yuanbao.tencent.com/",
    "published": true,
    "visibility": "public",
    "description": "结合腾讯混元与多模型能力，覆盖搜索、阅读、写作和内容创作的个人助手。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "结合腾讯混元与多模型能力，覆盖搜索、阅读、写作和内容创作的个人助手。",
    "homepage_url": "https://yuanbao.tencent.com/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "general",
    "delivery_form": null,
    "product_intro": "腾讯元宝 是 腾讯 推出的通用AI助手产品。结合腾讯混元与多模型能力，覆盖搜索、阅读、写作和内容创作的个人助手。\n腾讯元宝原生适配微信生态，直接解析公众号链接、微信文件；腾讯文档无缝互通。擅长中文公文、商务信函、会议材料，OCR 纸质文档识别能力突出。\n腾讯元宝适合中文问答、公众号内容理解、文件阅读、日常写作和图片创作。",
    "scenario_tags": null,
    "tool_type_ids": [
      "general"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "通用AI助手"
    ],
    "core_capabilities": [
      "联网搜索",
      "文件解析",
      "多模型",
      "腾讯生态"
    ],
    "external_sort_rank": 5,
    "external_sort_order": 62,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "general": 5
    }
  },
  {
    "id": "tool-ext-ai-3",
    "icon": "fa-magnifying-glass",
    "name": "天工AI",
    "tags": [
      "ai-saas",
      "AI搜索与研究"
    ],
    "author": "昆仑万维",
    "region": "domestic",
    "company": "昆仑万维",
    "best_for": "中文搜索、热点研究、报告生成和多媒体内容准备",
    "category": "external",
    "docs_url": null,
    "logo_url": null,
    "position": 49,
    "media_url": "https://www.tiangong.cn/",
    "published": true,
    "visibility": "public",
    "description": "集AI 搜索、深度研究、创作和内容生成为一体的AI产品。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "集AI 搜索、深度研究、创作和内容生成为一体的AI产品。",
    "homepage_url": "https://www.tiangong.cn/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "search",
    "delivery_form": null,
    "product_intro": "天工AI 是 昆仑万维 推出的融入大语言模型的AI搜索引擎，集AI搜索、文档解析、内容生成为一体。\n产品主要覆盖AI 搜索、长文本处理、多模态创作、智能体。支持用户进行搜索、阅读、创作及任务执行，解决各类搜索、创作及内容生成任务。\n在实际工作中，它更适合深度搜索、资料总结、行业研究、多模态内容生成等。用户可以根据自己的需求，选择不同的插件进行专业问题处理。",
    "scenario_tags": null,
    "tool_type_ids": [
      "search"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "AI搜索与研究"
    ],
    "core_capabilities": [
      "AI 搜索",
      "深度研究",
      "长文生成",
      "多模态创作"
    ],
    "external_sort_rank": 1,
    "external_sort_order": 63,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "search": 1
    }
  },
  {
    "id": "tool-ext-obsidian",
    "icon": "fa-book",
    "name": "Obsidian",
    "tags": [
      "ai-saas",
      "知识管理与写作"
    ],
    "author": "Obsidian",
    "region": "overseas",
    "company": "Obsidian",
    "best_for": "个人知识库、研究笔记、项目资料、双向链接与长期知识沉淀",
    "category": "external",
    "docs_url": "https://help.obsidian.md/",
    "logo_url": null,
    "position": 50,
    "media_url": "https://obsidian.md/",
    "published": true,
    "visibility": "public",
    "description": "把本地双向链接笔记组织成长期知识网络，并通过插件接入 AI 工作流。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "把本地双向链接笔记组织成长期知识网络，并通过插件接入 AI 工作流。",
    "homepage_url": "https://obsidian.md/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "knowledge",
    "delivery_form": null,
    "product_intro": "Obsidian 是以本地 Markdown 文件为核心的知识管理工具，通过双向链接、标签、图谱和可扩展插件，把零散笔记组织成长期可维护的个人知识网络。\n它本身并不是以原生 AI 为核心的产品，AI 能力主要来自社区插件或外部模型接入。用户可以在保留本地文件控制权的同时，增加摘要、问答、语义检索或写作辅助。\nObsidian 更适合重视长期积累、可迁移文件和自定义工作流的用户。安装 AI 插件前应检查开发者、权限、模型去向与数据传输范围，避免把敏感知识默认发送到外部服务。",
    "scenario_tags": null,
    "tool_type_ids": [
      "knowledge"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "知识管理与写作"
    ],
    "core_capabilities": [
      "本地优先",
      "双向链接",
      "知识图谱",
      "AI 插件生态"
    ],
    "external_sort_rank": 4,
    "external_sort_order": 64,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "knowledge": 4
    }
  },
  {
    "id": "tool-ext-aippt",
    "icon": "fa-file-powerpoint",
    "name": "AiPPT",
    "tags": [
      "ai-saas",
      "演示与文档"
    ],
    "author": "AiPPT",
    "region": "domestic",
    "company": "AiPPT",
    "best_for": "中文汇报初稿、文档转 PPT、模板套用和快速排版",
    "category": "external",
    "docs_url": null,
    "logo_url": null,
    "position": 51,
    "media_url": "https://www.aippt.cn/",
    "published": true,
    "visibility": "public",
    "description": "根据主题、文档或大纲快速生成中文 PPT，并提供模板与在线编辑。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "根据主题、文档或大纲快速生成中文 PPT，并提供模板与在线编辑。",
    "homepage_url": "https://www.aippt.cn/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "ppt",
    "delivery_form": null,
    "product_intro": "AiPPT 是 AiPPT 推出的演示与文档产品。根据主题、文档或大纲快速生成中文 PPT，并提供模板与在线编辑。\n主要能力包括一键生成、文档转 PPT、中文模板、在线编辑。它从主题、提纲或已有材料出发，协助完成内容结构、页面排版、视觉表达与可编辑文件输出。\n在实际工作中，它更适合中文汇报初稿、文档转 PPT、模板套用和快速排版。",
    "scenario_tags": null,
    "tool_type_ids": [
      "ppt"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "演示与文档"
    ],
    "core_capabilities": [
      "一键生成",
      "文档转 PPT",
      "中文模板",
      "在线编辑"
    ],
    "external_sort_rank": 5,
    "external_sort_order": 65,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "ppt": 5
    }
  },
  {
    "id": "tool-saas-chatgpt-2",
    "icon": "fa-image",
    "name": "ChatGPT Images 2.0",
    "tags": [
      "ai-saas",
      "图像与设计"
    ],
    "author": "OpenAI",
    "region": "overseas",
    "company": "OpenAI",
    "best_for": "营销海报、信息图、带文字视觉、产品概念图和对话式修图",
    "category": "external",
    "docs_url": "https://developers.openai.com/api/docs/guides/image-generation",
    "logo_url": null,
    "position": 52,
    "media_url": "https://openai.com/index/introducing-chatgpt-images-2-0/",
    "published": true,
    "visibility": "public",
    "description": "在对话中直接生成、理解和修改图片，让视觉创作可以连续迭代。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "在对话中直接生成、理解和修改图片，让视觉创作可以连续迭代。",
    "homepage_url": "https://chatgpt.com/images",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "image",
    "delivery_form": null,
    "product_intro": "ChatGPT Images 是 ChatGPT 内的图像生成与编辑体验。用户可以在同一对话中描述画面、上传参考图、要求局部修改，并沿着上一轮结果继续调整构图、风格、文字和细节。\n它把语言理解与视觉创作连接起来，适合从概念沟通进入海报、社媒配图、产品示意和创意探索；复杂要求可通过多轮对话逐步收敛，而不必每次重新描述全部背景。\n它的核心差异是编辑过程天然保留对话上下文。正式使用时仍需检查人物与文字细节、品牌素材授权和输出尺寸，并避免把生成结果误当成真实照片或官方素材。",
    "scenario_tags": null,
    "tool_type_ids": [
      "image"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "图像与设计"
    ],
    "core_capabilities": [
      "文生图",
      "高保真编辑",
      "文字渲染",
      "多轮迭代"
    ],
    "external_sort_rank": 1,
    "external_sort_order": 66,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "image": 1
    }
  },
  {
    "id": "tool-ext-nano-banana-2",
    "icon": "fa-image",
    "name": "Nano Banana 2",
    "tags": [
      "ai-saas",
      "图像与设计"
    ],
    "author": "Google DeepMind",
    "region": "overseas",
    "company": "Google DeepMind",
    "best_for": "快速创意、图片编辑、信息图、角色一致性和 Google 生态视觉生产",
    "category": "external",
    "docs_url": "https://ai.google.dev/gemini-api/docs/image-generation",
    "logo_url": null,
    "position": 53,
    "media_url": "https://blog.google/innovation-and-ai/technology/ai/nano-banana-2/",
    "published": true,
    "visibility": "public",
    "description": "用自然语言与参考图完成高质量图像生成和精细编辑，并保持主体一致。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "用自然语言与参考图完成高质量图像生成和精细编辑，并保持主体一致。",
    "homepage_url": "https://gemini.google.com/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "image",
    "delivery_form": null,
    "product_intro": "Nano Banana 2 是 Google 的图像生成与编辑体验，强调自然语言控制、参考图理解、主体一致性和精细修改。用户可以从文字或图片开始，持续调整人物、商品、背景与画面风格。\n产品适合把创意方向、局部编辑和多轮迭代放在同一流程中，并可利用 Gemini 的多模态理解处理较复杂的画面要求和参考关系。\n它更适合电商视觉、人物与商品一致性、海报概念和快速方案探索。涉及商标、真实人物或商业发布时，应核对授权、标识和生成内容披露要求。",
    "scenario_tags": null,
    "tool_type_ids": [
      "image"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "图像与设计"
    ],
    "core_capabilities": [
      "图像生成",
      "对话式编辑",
      "主体一致性",
      "最高 4K"
    ],
    "external_sort_rank": 4,
    "external_sort_order": 67,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "image": 4
    }
  },
  {
    "id": "tool-saas-flux",
    "icon": "fa-image",
    "name": "FLUX.2",
    "tags": [
      "ai-saas",
      "图像与设计"
    ],
    "author": "Black Forest Labs",
    "region": "overseas",
    "company": "Black Forest Labs",
    "best_for": "可控图像生成、开发者 API、品牌视觉、产品图和本地化工作流",
    "category": "external",
    "docs_url": "https://docs.bfl.ai/",
    "logo_url": null,
    "position": 54,
    "media_url": "https://bfl.ai/models",
    "published": true,
    "visibility": "public",
    "description": "面向专业创意工作流的图像模型家族，强调可控生成、编辑与开放集成。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "面向专业创意工作流的图像模型家族，强调可控生成、编辑与开放集成。",
    "homepage_url": "https://playground.bfl.ai/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "image",
    "delivery_form": null,
    "product_intro": "FLUX.2 是 Black Forest Labs 推出的图像与设计产品。面向专业创意工作流的图像模型家族，强调可控生成、编辑与开放集成。\n主要能力包括高质量生成、图像编辑、API、多种模型规格。图文排版持续优化，广告创意、产品渲染可控性强。\n在实际工作中，它更适合可控图像生成、开发者 API、品牌视觉、产品图和本地化工作流。",
    "scenario_tags": null,
    "tool_type_ids": [
      "image"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "图像与设计"
    ],
    "core_capabilities": [
      "高质量生成",
      "图像编辑",
      "API",
      "多种模型规格"
    ],
    "external_sort_rank": 3,
    "external_sort_order": 68,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "image": 3
    }
  },
  {
    "id": "tool-ext-liblibai",
    "icon": "fa-image",
    "name": "LiblibAI",
    "tags": [
      "ai-saas",
      "图像与设计"
    ],
    "author": "北京奇点星宇",
    "region": "domestic",
    "company": "北京奇点星宇",
    "best_for": "创作、模型体验、工作流复用、风格探索和社区素材",
    "category": "external",
    "docs_url": null,
    "logo_url": null,
    "position": 55,
    "media_url": "https://www.liblib.art/",
    "published": true,
    "visibility": "public",
    "description": "国内大型 AI 创作社区与模型平台，支持在线生图、工作流和模型分享。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "国内大型 AI 创作社区与模型平台，支持在线生图、工作流和模型分享。",
    "homepage_url": "https://www.liblib.art/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "image",
    "delivery_form": null,
    "product_intro": "LiblibAI 是 北京奇点星宇 推出的图像与设计产品。国内大型 AI 创作社区与模型平台，支持在线生图、工作流和模型分享。\nLiblibAI 支持多模型自由切换，一个平台调用即梦、Qwen、可灵、SD 系列模型。支持 ControlNet 线稿上色、节点式高级工作流、批量出图、超清放大。适合高频大批量生产；支持模型参数完整自定义。\n在实际工作中，它支持选择不同模型体验、工作流复用、风格探索和社区素材。",
    "scenario_tags": null,
    "tool_type_ids": [
      "image"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "图像与设计"
    ],
    "core_capabilities": [
      "在线生图",
      "模型社区",
      "ComfyUI 工作流",
      "训练与分享"
    ],
    "external_sort_rank": 4,
    "external_sort_order": 69,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "image": 4
    }
  },
  {
    "id": "tool-ext-ai-8",
    "icon": "fa-video",
    "name": "海螺AI",
    "tags": [
      "ai-saas",
      "视频与数字人"
    ],
    "author": "MiniMax",
    "region": "domestic",
    "company": "MiniMax",
    "best_for": "中文创意短片、图片动效、人物表演、营销视频和故事镜头",
    "category": "external",
    "docs_url": null,
    "logo_url": null,
    "position": 56,
    "media_url": "https://hailuoai.video/",
    "published": true,
    "visibility": "public",
    "description": "MiniMax 旗下 AI 视频创作产品，支持文本和图片驱动的视频生成。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "MiniMax 旗下 AI 视频创作产品，支持文本和图片驱动的视频生成。",
    "homepage_url": "https://hailuoai.video/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "video",
    "delivery_form": null,
    "product_intro": "海螺AI 是 MiniMax 推出的多模态 AI 视频创作平台。MiniMax 旗下 AI 视频创作产品，支持文本和图片驱动的视频生成。\n海螺AI支持文生视频、图生视频，兼顾写实科幻与二次元等多种风格。提供多种智能视频模板，支持过重格式输出，高清输出。\n在实际工作中，它更适合社交媒体内容创作、短视频广告、电影和视频制作，虚拟 IP、二次元动画短视频。",
    "scenario_tags": null,
    "tool_type_ids": [
      "video"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "视频与数字人"
    ],
    "core_capabilities": [
      "文生视频",
      "图生视频",
      "主体一致性",
      "镜头表现"
    ],
    "external_sort_rank": 3,
    "external_sort_order": 70,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "video": 3
    }
  },
  {
    "id": "tool-saas-wanxiang",
    "icon": "fa-video",
    "name": "通义万相视频",
    "tags": [
      "ai-saas",
      "视频与数字人"
    ],
    "author": "阿里云",
    "region": "domestic",
    "company": "阿里云",
    "best_for": "电商营销、品牌内容、图生视频、企业批量生成和 API 集成",
    "category": "external",
    "docs_url": "https://help.aliyun.com/zh/model-studio/",
    "logo_url": null,
    "position": 57,
    "media_url": "https://tongyi.aliyun.com/wanxiang/",
    "published": true,
    "visibility": "public",
    "description": "阿里通义万相的生成式视频能力，覆盖文本、图片驱动与企业 API 接入。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "阿里通义万相的生成式视频能力，覆盖文本、图片驱动与企业 API 接入。",
    "homepage_url": "https://tongyi.aliyun.com/wanxiang/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "video",
    "delivery_form": null,
    "product_intro": "通义万相视频 是阿里云推出的AI视频生成工具。阿里通义万相的生成式视频能力，覆盖文本、图片驱动与企业 API 接入。\n通义万相视频支持文生视频和图生视频，能处理多语言输入，支持“灵感扩写”功能，一键帮用户完善提示词，还自带“音频生成”功能，视频生成自带音画同步的音效和音频内容，降低AI视频创作门槛。\n在实际工作中，它更适合影视制作、动画设计、广告创意、社媒内容创作等多个领域。",
    "scenario_tags": null,
    "tool_type_ids": [
      "video"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "视频与数字人"
    ],
    "core_capabilities": [
      "文生视频",
      "图生视频",
      "企业 API",
      "中文理解"
    ],
    "external_sort_rank": 5,
    "external_sort_order": 71,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "video": 5
    }
  },
  {
    "id": "tool-ext-minimax-audio",
    "icon": "fa-microphone",
    "name": "MiniMax Audio",
    "tags": [
      "ai-saas",
      "音频与语音"
    ],
    "author": "MiniMax",
    "region": "domestic",
    "company": "MiniMax",
    "best_for": "多语言配音、声音克隆、角色语音、播客和开发者集成",
    "category": "external",
    "docs_url": "https://platform.minimax.io/docs/",
    "logo_url": null,
    "position": 58,
    "media_url": "https://www.minimax.io/audio",
    "published": true,
    "visibility": "public",
    "description": "提供自然语音合成、声音设计、克隆和多语言音频生成能力。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "提供自然语音合成、声音设计、克隆和多语言音频生成能力。",
    "homepage_url": "https://www.minimax.io/audio",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "audio",
    "delivery_form": null,
    "product_intro": "MiniMax Audio 是 MiniMax 推出的专业TTS语音合成引擎。提供自然语音合成、声音设计、克隆和多语言音频生成能力。\nMiniMax Audio 支持Text to Speech、声音克隆、声音设计、提供企业API。内置海量预置真人质感音色，支持中英混读、口音模拟。\nMiniMax Audio更适合多语言配音、声音克隆、角色语音、播客和开发者集成。",
    "scenario_tags": null,
    "tool_type_ids": [
      "audio"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "音频与语音"
    ],
    "core_capabilities": [
      "Text to Speech",
      "声音克隆",
      "声音设计",
      "企业API"
    ],
    "external_sort_rank": 1,
    "external_sort_order": 72,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "audio": 1
    }
  },
  {
    "id": "tool-ext-cosyvoice",
    "icon": "fa-microphone",
    "name": "CosyVoice",
    "tags": [
      "ai-saas",
      "音频与语音"
    ],
    "author": "阿里巴巴 FunAudioLLM",
    "region": "domestic",
    "company": "阿里巴巴 FunAudioLLM",
    "best_for": "本地部署、声音克隆、研究开发、多语言 TTS 和定制语音",
    "category": "external",
    "docs_url": "https://github.com/FunAudioLLM/CosyVoice",
    "logo_url": null,
    "position": 59,
    "media_url": "https://funaudiollm.github.io/",
    "published": true,
    "visibility": "public",
    "description": "面向多语言语音合成与零样本声音克隆的开源语音生成项目。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "面向多语言语音合成与零样本声音克隆的开源语音生成项目。",
    "homepage_url": "https://github.com/FunAudioLLM/CosyVoice",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "audio",
    "delivery_form": null,
    "product_intro": "CosyVoice 是 阿里巴巴 FunAudioLLM 推出的音频与语音产品语音合成模型。面向多语言语音合成与零样本声音克隆的开源语音生成项目。\nCosyVoice 支持开源 TTS、零样本克隆、多语言、本地部署。韵律自然，多音字、长句朗读稳定性优秀。\nCosyVoice更适合本地部署、声音克隆、研究开发、多语言 TTS 和定制语音。",
    "scenario_tags": null,
    "tool_type_ids": [
      "audio"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "音频与语音"
    ],
    "core_capabilities": [
      "开源 TTS",
      "零样本克隆",
      "多语言",
      "本地部署"
    ],
    "external_sort_rank": 3,
    "external_sort_order": 73,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "audio": 3
    }
  },
  {
    "id": "tool-ext-tf7ed573b17",
    "icon": "fa-users",
    "name": "钉钉闪记",
    "tags": [
      "ai-saas",
      "会议与协作"
    ],
    "author": "钉钉",
    "region": "domestic",
    "company": "钉钉",
    "best_for": "内部会议、访谈记录、培训回顾、行动项提取和团队同步",
    "category": "external",
    "docs_url": null,
    "logo_url": null,
    "position": 60,
    "media_url": "https://www.dingtalk.com/",
    "published": true,
    "visibility": "public",
    "description": "在钉钉协作场景中完成会议录音、实时转写、重点标记与智能纪要。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "在钉钉协作场景中完成会议录音、实时转写、重点标记与智能纪要。",
    "homepage_url": "https://www.dingtalk.com/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "meeting",
    "delivery_form": null,
    "product_intro": "钉钉闪记 是钉钉原生会议记录能力，深度集成钉钉会议、钉钉组织、钉钉待办、钉盘，阿里技术底座。在钉钉协作场景中完成会议录音、实时转写、重点标记与智能纪要。\n支持钉钉会议实时转写、发言人区分，支持手机端现场录音。内置多种纪要模板，支持自定义提示词规范输出纪要格式。会议待办直接同步钉钉任务、关联日程。支持上传外部音视频处理；企业组织权限体系完善\n在实际工作中，全员使用钉钉的团队；线下拜访录音、外勤访谈；项目例会、流程化内部会议；",
    "scenario_tags": null,
    "tool_type_ids": [
      "meeting"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "会议与协作"
    ],
    "core_capabilities": [
      "实时转写",
      "智能纪要",
      "重点标记",
      "钉钉协同"
    ],
    "external_sort_rank": 5,
    "external_sort_order": 74,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "meeting": 5
    }
  },
  {
    "id": "tool-ext-t0956c4653b",
    "icon": "fa-users",
    "name": "讯飞听见",
    "tags": [
      "ai-saas",
      "会议与协作"
    ],
    "author": "科大讯飞",
    "region": "domestic",
    "company": "科大讯飞",
    "best_for": "中文会议转写、采访录音、字幕制作、多语种记录和专业精转",
    "category": "external",
    "docs_url": null,
    "logo_url": null,
    "position": 61,
    "media_url": "https://www.iflyrec.com/",
    "published": true,
    "visibility": "public",
    "description": "以高质量中文语音转写为核心，覆盖会议、访谈、字幕和人工精转。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "以高质量中文语音转写为核心，覆盖会议、访谈、字幕和人工精转。",
    "homepage_url": "https://www.iflyrec.com/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "meeting",
    "delivery_form": null,
    "product_intro": "讯飞听见 是 科大讯飞 推出的专业录音转写平台，语音识别底层能力标杆，兼顾个人与大型政企私有化方案。以高质量音视频转写为核心，覆盖会议、访谈等。\n支持上百种语种识别，长访谈、采访高精度逐字文稿输出，实时会议转写、录音笔硬件联动、本地离线转写，普通话、方言识别，可提供私有化部署，满足涉密、信创、律所、医疗等合规场景。\n在实际工作中，它更适合媒体采访、深度调研访谈、庭审、医疗 / 法律专业会议；嘈杂线下会场；大量方言沟通场景；有离线 / 私有化部署、高转写精度硬性要求的机构；音视频文稿内容创作。",
    "scenario_tags": null,
    "tool_type_ids": [
      "meeting"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "会议与协作"
    ],
    "core_capabilities": [
      "实时转写",
      "录音转文字",
      "多语种",
      "人工精转"
    ],
    "external_sort_rank": 3,
    "external_sort_order": 75,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "meeting": 3
    }
  },
  {
    "id": "tool-saas-windsurf",
    "icon": "fa-code",
    "name": "Windsurf",
    "tags": [
      "ai-saas",
      "编程开发"
    ],
    "author": "Windsurf",
    "region": "overseas",
    "company": "Windsurf",
    "best_for": "复杂代码库、跨文件开发、Agent 工作流、调试和团队工程",
    "category": "external",
    "docs_url": "https://docs.windsurf.com/",
    "logo_url": null,
    "position": 62,
    "media_url": "https://windsurf.com/",
    "published": true,
    "visibility": "public",
    "description": "面向大型代码库的 Agentic IDE，以上下文感知、规划和多文件改动为核心。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "面向大型代码库的 Agentic IDE，以上下文感知、规划和多文件改动为核心。",
    "homepage_url": "https://windsurf.com/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "code",
    "delivery_form": null,
    "product_intro": "Windsurf 是 Windsurf 推出的编程开发产品。面向大型代码库的 Agentic IDE，以上下文感知、规划和多文件改动为核心。\n产品主要覆盖Agentic IDE、代码库理解、多文件编辑、实时感知操作、终端输出。\n在实际工作中，它更适合复杂代码库、跨文件开发、Agent 工作流、调试和团队工程。",
    "scenario_tags": null,
    "tool_type_ids": [
      "code"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "编程开发"
    ],
    "core_capabilities": [
      "Agentic IDE",
      "代码库理解",
      "多文件编辑",
      "终端执行"
    ],
    "external_sort_rank": 3,
    "external_sort_order": 76,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "code": 3
    }
  },
  {
    "id": "tool-ext-codegeex",
    "icon": "fa-code",
    "name": "CodeGeeX",
    "tags": [
      "ai-saas",
      "编程开发"
    ],
    "author": "智谱",
    "region": "domestic",
    "company": "智谱",
    "best_for": "代码补全、跨语言翻译、中文编程问答和 IDE 内辅助开发",
    "category": "external",
    "docs_url": "https://codegeex.cn/docs/",
    "logo_url": null,
    "position": 63,
    "media_url": "https://codegeex.cn/",
    "published": true,
    "visibility": "public",
    "description": "支持多语言代码生成、补全、翻译和问答的国产智能编程助手。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "支持多语言代码生成、补全、翻译和问答的国产智能编程助手。",
    "homepage_url": "https://codegeex.cn/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "code",
    "delivery_form": null,
    "product_intro": "CodeGeeX 是智谱基于其CodeGeeX2多语言代码生成模型，支持Python、Java、C++/C、JavaScript、Go等多种编程语言，实现代码的生成与补全、自动添加注释、代码翻译以及智能问答等功能。\nCodeGeeX支持代码生成与补全、注释生成、跨语种代码翻译、智能问答，并支持主流IDE。\n在实际工作中，它更适合个人开发者日常编码；老旧无注释代码维护；多语言迁移改造；内网、涉密、信创环境开发；算法工程师编写实验脚本等。",
    "scenario_tags": null,
    "tool_type_ids": [
      "code"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "编程开发"
    ],
    "core_capabilities": [
      "代码生成",
      "代码翻译",
      "多语言",
      "IDE 插件"
    ],
    "external_sort_rank": 4,
    "external_sort_order": 77,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "code": 4
    }
  },
  {
    "id": "tool-ext-openclaw",
    "icon": "fa-robot",
    "name": "OpenClaw",
    "tags": [
      "ai-saas",
      "智能体"
    ],
    "author": "OpenClaw Foundation",
    "region": "overseas",
    "company": "OpenClaw Foundation",
    "best_for": "个人常驻助手、邮件日历、消息渠道、定时任务和本地可控自动化",
    "category": "external",
    "docs_url": "https://docs.openclaw.ai/",
    "logo_url": null,
    "position": 64,
    "media_url": "https://openclaw.ai/",
    "published": true,
    "visibility": "public",
    "description": "连接本地系统与消息渠道，让智能体在明确权限内持续执行真实任务。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "连接本地系统与消息渠道，让智能体在明确权限内持续执行真实任务。",
    "homepage_url": "https://openclaw.ai/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "agent",
    "delivery_form": null,
    "product_intro": "OpenClaw 是可连接本地系统与消息渠道的开源智能体工具，目标是让 AI 不只回答问题，还能在用户授权范围内读取环境、调用工具并持续执行真实任务。\n它适合个人自动化、消息触发任务、本地文件处理和需要长期运行的工作流。由于能够接触操作系统、账号或外部渠道，部署方式与权限配置会直接影响安全边界。\nOpenClaw 的差异在高度可控和可扩展，但也需要更强的技术管理。建议先在隔离环境试用，只开放必要目录与接口，并为发送、删除、付费和生产操作设置人工确认。",
    "scenario_tags": null,
    "tool_type_ids": [
      "agent"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "智能体"
    ],
    "core_capabilities": [
      "本地运行",
      "持久记忆",
      "聊天渠道",
      "技能与定时任务"
    ],
    "external_sort_rank": 5,
    "external_sort_order": 78,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "agent": 5
    }
  },
  {
    "id": "tool-ext-hermes-agent",
    "icon": "fa-robot",
    "name": "Hermes Agent",
    "tags": [
      "ai-saas",
      "智能体"
    ],
    "author": "Nous Research",
    "region": "overseas",
    "company": "Nous Research",
    "best_for": "长期个人助手、跨渠道记忆、自动报告、技能积累和本地或云端执行",
    "category": "external",
    "docs_url": "https://hermes-agent.nousresearch.com/docs/",
    "logo_url": null,
    "position": 65,
    "media_url": "https://hermes-agent.nousresearch.com/",
    "published": true,
    "visibility": "public",
    "description": "在本地或云端调用工具、终端与浏览器，自主完成可验证的复杂任务。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "在本地或云端调用工具、终端与浏览器，自主完成可验证的复杂任务。",
    "homepage_url": "https://hermes-agent.nousresearch.com/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "agent",
    "delivery_form": null,
    "product_intro": "Hermes Agent 是 Nous Research 推出的可执行智能体，能够在本地或云端调用终端、浏览器和其他工具，对复杂目标进行规划、执行与结果验证。\n它适合研究、编码、信息处理和需要多步工具调用的任务，用户可以查看执行过程并根据中间结果调整方向，而不是只接收最终回答。\nHermes Agent 的重点是开放性与可执行性。首次使用应在沙盒中运行，限制网络、文件和密钥访问，并在任何外部写入或不可逆动作前保留人工检查点。",
    "scenario_tags": null,
    "tool_type_ids": [
      "agent"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "智能体"
    ],
    "core_capabilities": [
      "持久记忆",
      "自生成技能",
      "定时任务",
      "隔离子 Agent"
    ],
    "external_sort_rank": 6,
    "external_sort_order": 79,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "agent": 6
    }
  },
  {
    "id": "tool-ext-genspark",
    "icon": "fa-robot",
    "name": "Genspark",
    "tags": [
      "ai-saas",
      "智能体"
    ],
    "author": "MainFunc",
    "region": "overseas",
    "company": "MainFunc",
    "best_for": "深度研究、旅行规划、演示制作、表格任务和多媒体工作流",
    "category": "external",
    "docs_url": null,
    "logo_url": null,
    "position": 66,
    "media_url": "https://www.genspark.ai/",
    "published": true,
    "visibility": "public",
    "description": "把搜索、研究、演示、表格和多媒体生成整合为可交付成果的通用 Agent。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "把搜索、研究、演示、表格和多媒体生成整合为可交付成果的通用 Agent。",
    "homepage_url": "https://www.genspark.ai/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "agent",
    "delivery_form": null,
    "product_intro": "Genspark 是 MainFunc 推出的智能体工作台。把搜索、研究、演示、表格和多媒体生成整合为可交付成果的通用 Agent。\n主要能力包括Super Agent、深度研究、成果生成、多应用协作。支持多模型混合调度，并行执行多条任务链路；支持联网深度调研、文档处理、生成 PPT 、网站等素材。\n在实际工作中，它更适合深度研究、旅行规划、演示制作、表格任务和多媒体工作流。",
    "scenario_tags": null,
    "tool_type_ids": [
      "agent"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "智能体"
    ],
    "core_capabilities": [
      "Super Agent",
      "深度研究",
      "成果生成",
      "多应用协作"
    ],
    "external_sort_rank": 2,
    "external_sort_order": 81,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "agent": 2
    }
  },
  {
    "id": "tool-ext-manus",
    "icon": "fa-robot",
    "name": "Manus",
    "tags": [
      "ai-saas",
      "智能体"
    ],
    "author": "Manus",
    "region": "overseas",
    "company": "Manus",
    "best_for": "通用任务执行、研究、网站与应用、演示、数据处理和浏览器操作",
    "category": "external",
    "docs_url": "https://manus.im/docs/introduction/welcome",
    "logo_url": null,
    "position": 67,
    "media_url": "https://manus.im/",
    "published": true,
    "visibility": "public",
    "description": "把一个目标拆成网页操作、资料处理与内容制作步骤，最终交付完整结果。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "把一个目标拆成网页操作、资料处理与内容制作步骤，最终交付完整结果。",
    "homepage_url": "https://manus.im/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "agent",
    "delivery_form": null,
    "product_intro": "Manus 是面向完整任务交付的通用智能体，能够把一个目标拆成网页操作、资料检索、文件处理和内容制作步骤，并持续执行到形成结果。\n它适合研究、旅行或采购方案、网页信息处理、表格与文档制作等需要多种工具协同的任务。用户可以查看任务进度、补充要求并接收最终文件或页面。\nManus 的差异在跨工具执行，而不是单轮问答。连接账号或让其执行外部动作前，应明确数据范围、付费与发布边界，并对关键来源和最终产物进行复核。",
    "scenario_tags": null,
    "tool_type_ids": [
      "agent"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "智能体"
    ],
    "core_capabilities": [
      "自主规划",
      "云端计算机",
      "Wide Research",
      "多种成果交付"
    ],
    "external_sort_rank": 1,
    "external_sort_order": 82,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "agent": 1
    }
  },
  {
    "id": "tool-excel-qwen-work",
    "icon": "fa-robot",
    "name": "Qwen Work",
    "tags": [
      "ai-saas",
      "智能体"
    ],
    "author": "阿里",
    "region": "domestic",
    "company": "阿里",
    "best_for": "办公自动化、长文档撰写、数据分析报表、可复用岗位工作流沉淀、钉钉联动业务处理",
    "category": "external",
    "docs_url": "https://help.aliyun.com/zh/qwenwork/",
    "logo_url": null,
    "position": 68,
    "media_url": "https://qwenwork.cn",
    "published": true,
    "visibility": "public",
    "description": "企业级多形态 AI 智能体工作台，侧重办公全流程自动化、团队技能沉淀；与同类工具相比更适配钉钉生态、企业协同办公任务。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "企业级多形态 AI 智能体工作台，侧重办公全流程自动化、团队技能沉淀；与同类工具相比更适配钉钉生态、企业协同办公任务。",
    "homepage_url": "https://qwenwork.cn",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "agent",
    "delivery_form": null,
    "product_intro": "Qwen Work阿里巴巴推出面向个人与企业的全链路职场 AI 智能体工作台，统一整合桌面、云端、企业协同三类智能体，深度打通钉钉生态。\n通过自然语言下达完整目标，AI 自主拆解步骤持续执行，成熟流程可保存为团队共享技能，支持多端随时追踪、接管任务进度。\n擅长多模态文件解析、文档 / PPT / 报表自动产出、本地文件处理、自定义岗位 Skill 沉淀、任务自动化。",
    "scenario_tags": null,
    "tool_type_ids": [
      "agent"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "智能体"
    ],
    "core_capabilities": [
      "多端协同 Agent",
      "本地文件自动化",
      "自定义 Skill 工作流",
      "多模态理解"
    ],
    "external_sort_rank": 4,
    "external_sort_order": 84,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "agent": 4
    }
  },
  {
    "id": "tool-excel-trae-work",
    "icon": "fa-robot",
    "name": "Trae Work",
    "tags": [
      "ai-saas",
      "智能体"
    ],
    "author": "字节",
    "region": "domestic",
    "company": "字节",
    "best_for": "产品文档、数据分析报表、前端项目开发、跨设备远程异步任务、运营内容批量产出",
    "category": "external",
    "docs_url": "https://www.trae.cn/docs",
    "logo_url": null,
    "position": 69,
    "media_url": "https://www.trae.cn/sem-work-ide",
    "published": true,
    "visibility": "public",
    "description": "字节 AI 原生智能体工作台，兼顾通用办公与开发任务；相比同类，代码工程能力更强，支持跨设备远程下发异步任务。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "字节 AI 原生智能体工作台，兼顾通用办公与开发任务；相比同类，代码工程能力更强，支持跨设备远程下发异步任务。",
    "homepage_url": "https://www.trae.cn",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "agent",
    "delivery_form": null,
    "product_intro": "Trae Work字节 AI 原生全员生产力工作台，设置 Work、Code、Design 三大模式，覆盖办公、研发、设计人群，支持网页、桌面、移动端三端互通。\n支持按需切换工作模式，以自然语言发起项目任务，AI 在云端或配对设备后台自主执行，过程支持实时批注、分阶段迭代成果。\n擅长多文件联合解析、文档与数据报表生成、项目级代码生成调试、跨设备远程异步任务、云端多任务并行运行。",
    "scenario_tags": null,
    "tool_type_ids": [
      "agent"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "智能体"
    ],
    "core_capabilities": [
      "办公 + 代码双模",
      "远程跨设备任务",
      "多文件联合解析",
      "项目级代码生成",
      "云端并行任务"
    ],
    "external_sort_rank": 5,
    "external_sort_order": 85,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "agent": 5
    }
  },
  {
    "id": "tool-excel-kimi-work",
    "icon": "fa-robot",
    "name": "Kimi Work",
    "tags": [
      "ai-saas",
      "智能体"
    ],
    "author": "月之暗面",
    "region": "domestic",
    "company": "月之暗面",
    "best_for": "深度行业研究、文献批量研读、网页数据自动采集、定时报表、金融信息持续跟踪",
    "category": "external",
    "docs_url": "https://www.kimi.com/zh-cn/help/",
    "logo_url": null,
    "position": 70,
    "media_url": "https://www.kimi.com/zh-cn/resources/kimi-work-introduction",
    "published": true,
    "visibility": "public",
    "description": "本地运行桌面 AI 智能体，依托 Kimi 超长文本理解优势，自主操作本地文件与浏览器，擅长资料调研、多文档深度整合与长时间连续任务。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "本地运行桌面 AI 智能体，依托 Kimi 超长文本理解优势，自主操作本地文件与浏览器，擅长资料调研、多文档深度整合与长时间连续任务。",
    "homepage_url": "https://www.kimi.com/zh-cn/products/kimi-work",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "agent",
    "delivery_form": null,
    "product_intro": "Kimi Work月之暗面 Moonshot 推出桌面端本地 AI 智能体，依托 Kimi 长上下文底座，面向研究员、金融从业者等知识密集型工作者。\n常驻电脑后台，接收目标指令自主完成文件读取、网页检索、数据汇总，可持续运行长周期调研任务，并定时输出标准化成果。\n擅长百万级长文档精读、本地文件访问、WebBridge 网页自动化采集、多子智能体并行运算、定时任务调度、多源信息整合汇总。",
    "scenario_tags": null,
    "tool_type_ids": [
      "agent"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "智能体"
    ],
    "core_capabilities": [
      "百万级长上下文",
      "本地文件自动化",
      "浏览器自主浏览",
      "300 子 Agent 集群",
      "定时任务调度"
    ],
    "external_sort_rank": 2,
    "external_sort_order": 86,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "agent": 2
    }
  },
  {
    "id": "tool-excel-libtv",
    "icon": "fa-video",
    "name": "LibTV",
    "tags": [
      "ai-saas",
      "视频与数字人"
    ],
    "author": "LiblibAI",
    "region": "domestic",
    "company": "LiblibAI",
    "best_for": "AI 短剧、广告宣传片、二次元动画、产品动态视觉、批量短视频量产、影视分镜设计",
    "category": "external",
    "docs_url": "https://www.liblib.tv/docs",
    "logo_url": null,
    "position": 71,
    "media_url": "https://www.liblib.tv/blog/libtv-intro",
    "published": true,
    "visibility": "public",
    "description": "专业节点式 AI 视频创作平台，聚焦从剧本、分镜到成片全链路视频生产，区别通用办公工具，专注动态影像内容创作。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "专业节点式 AI 视频创作平台，聚焦从剧本、分镜到成片全链路视频生产，区别通用办公工具，专注动态影像内容创作。",
    "homepage_url": "https://www.liblib.tv",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "video",
    "delivery_form": null,
    "product_intro": "LibTV LiblibAI 推出的一站式 AI 视频创作平台，定位面向创作者与 AI 智能体的专业一站式 AI 视频创作引擎。\n创作者通过无限画布完成从剧本、分镜到成片的完整创作流程，享受角色控制、灯光运镜等 20+ 专业功能；Agent 可通过 Skill 接口调用平台能力，一句话生成短剧、复刻视频或制作 MV。\n适用于短视频、广告片、电影制作、创意短片制作，既适合人工精细化调校镜头画面，也支持 AI Agent 全自动批量产出视频内容，解决多工具切换、镜头角色崩坏、创作流程割裂痛点。",
    "scenario_tags": null,
    "tool_type_ids": [
      "video"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "视频与数字人"
    ],
    "core_capabilities": [
      "无限画布节点工作流",
      "角色一致性控制",
      "多模型视频生成",
      "运镜参数调节",
      "剧本到成片闭环"
    ],
    "external_sort_rank": 4,
    "external_sort_order": 87,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "video": 4
    }
  },
  {
    "id": "tool-excel-stable-diffusion",
    "icon": "fa-image",
    "name": "Stable Diffusion",
    "tags": [
      "ai-saas",
      "图像与设计",
      "视频与数字人"
    ],
    "author": "Stability AI",
    "region": "overseas",
    "company": "Stability AI",
    "best_for": "概念原画、创意插画、设计素材、图片创意修改、定制美术素材、批量视觉配图",
    "category": "external",
    "docs_url": "https://stability.ai/guides",
    "logo_url": null,
    "position": 72,
    "media_url": "https://stability.ai/",
    "published": true,
    "visibility": "public",
    "description": "开源扩散图像生成基础模型，核心用于文生图、图像编辑；区别成品平台，高度可自定义，支持本地部署、插件与模型二次微调。",
    "source_type": "external",
    "usage_guide": null,
    "card_summary": "开源扩散图像生成基础模型，核心用于文生图、图像编辑；区别成品平台，高度可自定义，支持本地部署、插件与模型二次微调。",
    "homepage_url": "https://stability.ai/",
    "market_shelf": "external",
    "market_title": null,
    "tool_type_id": "image",
    "delivery_form": null,
    "product_intro": "Stable Diffusion定位开源通用文生图扩散基础模型，面向创作者、开发者、研究人员开放模型权重。\n主要能力包括文生图、图生图、图像局部重绘、高清放大、风格迁移，支持 LoRA 微调、自定义模型训练，提供 API 与本地部署方案。\n适用任务于概念原画、营销海报、插画、素材生成、视觉原型设计；开发者可基于模型搭建自有绘图应用，研究者开展生成算法实验。与闭源绘图产品差异在于高度开放，允许合规前提下自主改造与商用部署。",
    "scenario_tags": null,
    "tool_type_ids": [
      "image",
      "video"
    ],
    "version_label": null,
    "connector_type": null,
    "owner_dept_ids": [],
    "publisher_name": null,
    "screenshot_url": null,
    "owner_region_id": null,
    "owner_region_ids": null,
    "tool_type_labels": [
      "图像与设计",
      "视频与数字人"
    ],
    "core_capabilities": [
      "文生 / 图生图像",
      "局部重绘",
      "ControlNet 精准构图",
      "开源可本地部署",
      "海量社区微调模型"
    ],
    "external_sort_rank": 5,
    "external_sort_order": 88,
    "publisher_member_id": null,
    "business_scenario_ids": null,
    "featured_in_find_cases": null,
    "external_category_ranks": {
      "image": 5,
      "video": 6
    }
  }
]$tools_data$::jsonb);
DO $guard$
BEGIN
  IF (SELECT count(*) FROM incoming_external_tools) <> 73 OR
     EXISTS (SELECT 1 FROM incoming_external_tools WHERE source_type IS DISTINCT FROM 'external') OR
     EXISTS (SELECT id FROM incoming_external_tools GROUP BY id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Invalid external tools payload';
  END IF;
  IF EXISTS (SELECT 1 FROM public.tool t JOIN incoming_external_tools i USING(id) WHERE t.source_type IS DISTINCT FROM 'external') THEN
    RAISE EXCEPTION 'ID conflicts with a non-external tool; import cancelled';
  END IF;
END $guard$;
CREATE TABLE IF NOT EXISTS public.external_tools_backup_20261028 (
  id text PRIMARY KEY, existed boolean NOT NULL, row_data jsonb, backed_up_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.external_tools_backup_20261028(id, existed, row_data)
SELECT i.id, t.id IS NOT NULL, CASE WHEN t.id IS NOT NULL THEN to_jsonb(t) END
FROM incoming_external_tools i LEFT JOIN public.tool t USING(id)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tool ("id", "icon", "name", "tags", "author", "region", "company", "best_for", "category", "docs_url", "logo_url", "position", "media_url", "published", "visibility", "description", "source_type", "usage_guide", "card_summary", "homepage_url", "market_shelf", "market_title", "tool_type_id", "delivery_form", "product_intro", "scenario_tags", "tool_type_ids", "version_label", "connector_type", "owner_dept_ids", "publisher_name", "screenshot_url", "owner_region_id", "owner_region_ids", "tool_type_labels", "core_capabilities", "external_sort_rank", "external_sort_order", "publisher_member_id", "business_scenario_ids", "featured_in_find_cases", "external_category_ranks", updated_at)
SELECT "id", "icon", "name", "tags", "author", "region", "company", "best_for", "category", "docs_url", "logo_url", "position", "media_url", "published", "visibility", "description", "source_type", "usage_guide", "card_summary", "homepage_url", "market_shelf", "market_title", "tool_type_id", "delivery_form", "product_intro", "scenario_tags", "tool_type_ids", "version_label", "connector_type", "owner_dept_ids", "publisher_name", "screenshot_url", "owner_region_id", "owner_region_ids", "tool_type_labels", "core_capabilities", "external_sort_rank", "external_sort_order", "publisher_member_id", "business_scenario_ids", "featured_in_find_cases", "external_category_ranks", now() FROM incoming_external_tools
ON CONFLICT (id) DO UPDATE SET
  "icon" = EXCLUDED."icon",
  "name" = EXCLUDED."name",
  "tags" = EXCLUDED."tags",
  "author" = EXCLUDED."author",
  "region" = EXCLUDED."region",
  "company" = EXCLUDED."company",
  "best_for" = EXCLUDED."best_for",
  "category" = EXCLUDED."category",
  "docs_url" = EXCLUDED."docs_url",
  "logo_url" = EXCLUDED."logo_url",
  "position" = EXCLUDED."position",
  "media_url" = EXCLUDED."media_url",
  "published" = EXCLUDED."published",
  "visibility" = EXCLUDED."visibility",
  "description" = EXCLUDED."description",
  "source_type" = EXCLUDED."source_type",
  "usage_guide" = EXCLUDED."usage_guide",
  "card_summary" = EXCLUDED."card_summary",
  "homepage_url" = EXCLUDED."homepage_url",
  "market_shelf" = EXCLUDED."market_shelf",
  "market_title" = EXCLUDED."market_title",
  "tool_type_id" = EXCLUDED."tool_type_id",
  "delivery_form" = EXCLUDED."delivery_form",
  "product_intro" = EXCLUDED."product_intro",
  "scenario_tags" = EXCLUDED."scenario_tags",
  "tool_type_ids" = EXCLUDED."tool_type_ids",
  "version_label" = EXCLUDED."version_label",
  "connector_type" = EXCLUDED."connector_type",
  "owner_dept_ids" = EXCLUDED."owner_dept_ids",
  "publisher_name" = EXCLUDED."publisher_name",
  "screenshot_url" = EXCLUDED."screenshot_url",
  "owner_region_id" = EXCLUDED."owner_region_id",
  "owner_region_ids" = EXCLUDED."owner_region_ids",
  "tool_type_labels" = EXCLUDED."tool_type_labels",
  "core_capabilities" = EXCLUDED."core_capabilities",
  "external_sort_rank" = EXCLUDED."external_sort_rank",
  "external_sort_order" = EXCLUDED."external_sort_order",
  "publisher_member_id" = EXCLUDED."publisher_member_id",
  "business_scenario_ids" = EXCLUDED."business_scenario_ids",
  "featured_in_find_cases" = EXCLUDED."featured_in_find_cases",
  "external_category_ranks" = EXCLUDED."external_category_ranks",
  updated_at = now();
SELECT count(*) AS imported_external_tools FROM public.tool t JOIN incoming_external_tools i USING(id);
COMMIT;
