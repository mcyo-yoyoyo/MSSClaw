#!/usr/bin/env python3
"""Generate apps/web/src/domain/externalToolsCatalog.ts from CSV."""

from __future__ import annotations

import csv
import hashlib
import json
import re
from pathlib import Path

CSV_PATH = Path(r"C:\Users\HUAWEI\Downloads\ai-tools-directory-2026-08-05.csv")
OUT_PATH = Path(__file__).resolve().parents[1] / "apps/web/src/domain/externalToolsCatalog.ts"

NAME_TO_ID = {
    "chatgpt": "tool-saas-chatgpt",
    "gemini": "tool-saas-gemini",
    "claude": "tool-saas-claude",
    "perplexity": "tool-saas-perplexity",
    "gamma": "tool-saas-gamma",
    "workbuddy": "tool-saas-workbuddy",
    "豆包": "tool-saas-doubao",
    "deepseek": "tool-saas-deepseek",
    "kimi": "tool-saas-kimi",
    "qwen": "tool-saas-tongyi",
    "cursor": "tool-saas-cursor",
    "claude code": "tool-saas-claude-code",
    "github copilot": "tool-saas-copilot",
    "midjourney": "tool-saas-midjourney",
    "runway": "tool-saas-runway",
    "可灵ai": "tool-saas-kling",
    "可灵": "tool-saas-kling",
    "即梦ai": "tool-saas-jimeng",
    "即梦": "tool-saas-jimeng",
    "秘塔ai搜索": "tool-saas-metaso",
    "jasper": "tool-saas-jasper",
    "windsurf": "tool-saas-windsurf",
    "ideogram": "tool-saas-ideogram",
    "pika": "tool-saas-pika",
    "luma dream machine": "tool-saas-luma",
    "腾讯元宝": "tool-saas-yuanbao",
    "copy.ai": "tool-saas-copyai",
    "microsoft 365 copilot": "tool-saas-ms-copilot",
    "trae": "tool-saas-trae",
    "通义万相视频": "tool-saas-wanxiang",
    "flux.2": "tool-saas-flux",
    "notion ai": "tool-saas-notion-ai",
    "notebooklm": "tool-ext-notebooklm",
}

TYPE_MAP = {
    "通用AI助手": "general",
    "AI搜索与研究": "search",
    "知识管理与学习": "knowledge",
    "写作与翻译": "writing",
    "演示与文档": "ppt",
    "图像与设计": "image",
    "视频与数字人": "video",
    "音频与语音": "audio",
    "会议与协作": "meeting",
    "数据分析": "data",
    "编程开发": "code",
    "自动化与智能体": "agent",
}

TYPE_ICON = {
    "general": "fa-comments",
    "search": "fa-magnifying-glass",
    "knowledge": "fa-book",
    "writing": "fa-pen",
    "ppt": "fa-file-powerpoint",
    "image": "fa-image",
    "video": "fa-video",
    "audio": "fa-microphone",
    "meeting": "fa-users",
    "data": "fa-chart-line",
    "code": "fa-code",
    "agent": "fa-robot",
}


def slugify(name: str) -> str:
    s = name.strip().lower()
    s = re.sub(r"[^a-z0-9\u4e00-\u9fff]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    ascii_s = re.sub(r"[^a-z0-9-]+", "", s)
    if len(ascii_s) < 2:
        ascii_s = "t" + hashlib.md5(name.encode()).hexdigest()[:10]
    return ascii_s[:40]


def norm_name(n: str) -> str:
    return re.sub(r"\s+", " ", n.strip()).lower()


def js_str(s: str | None) -> str:
    return json.dumps(s, ensure_ascii=False)


def resolve_id(name: str) -> str:
    nn = norm_name(name)
    if nn in NAME_TO_ID:
        return NAME_TO_ID[nn]
    for k, v in NAME_TO_ID.items():
        if k in nn or nn in k:
            return v
    return f"tool-ext-{slugify(name)}"


def main() -> None:
    with open(CSV_PATH, encoding="gb18030", newline="") as f:
        rows = list(csv.DictReader(f))

    tools: list[dict] = []
    used_ids: set[str] = set()
    for r in rows:
        name = (r["产品名"] or "").strip()
        company = (r["公司"] or "").strip()
        tlabel = (r["工具类型"] or "").strip()
        region_raw = (r["区域"] or "").strip()
        card = (r["卡片核心作用"] or "").strip()
        intro = (r["产品介绍"] or "").strip()
        best = (r["最适合"] or "").strip()
        features = (r["核心能力"] or "").strip()
        tags = (r["标签"] or "").strip()
        url = (r["访问链接"] or "").strip() or "#"
        docs = (r["帮助文档"] or "").strip()
        media = (r["官方介绍或演示"] or "").strip()
        shot = (r["官方截图"] or "").strip()
        guide = (r["站内使用指导"] or "").strip()
        version = (r["公开版本"] or "").strip()

        type_id = TYPE_MAP.get(tlabel, "general")
        region = "overseas" if region_raw == "海外" else "domestic"
        tid = resolve_id(name)
        base = tid
        n = 2
        while tid in used_ids:
            tid = f"{base}-{n}"
            n += 1
        used_ids.add(tid)

        tag_list = ["ai-saas"]
        if tags:
            for t in re.split(r"[;；,，|]", tags):
                t = t.strip()
                if t and t not in tag_list:
                    tag_list.append(t)
        if tlabel and tlabel not in tag_list:
            tag_list.append(tlabel)

        tools.append(
            {
                "id": tid,
                "name": name,
                "desc": card or intro or name,
                "company": company,
                "toolTypeId": type_id,
                "region": region,
                "cardSummary": card,
                "productIntro": intro,
                "bestFor": best,
                "coreFeatures": [
                    x.strip() for x in re.split(r"[;；、]", features) if x.strip()
                ]
                if features
                else [],
                "version": version,
                "homepageUrl": url,
                "docsUrl": docs or None,
                "mediaUrl": media or None,
                "screenshotUrl": None if (not shot or shot == "待补充") else shot,
                "icon": TYPE_ICON[type_id],
                "tags": tag_list,
                "guideBody": guide,
            }
        )

    lines: list[str] = [
        "/** Auto-generated from ai-tools-directory CSV. Do not hand-edit. */",
        "import type { ExternalToolCatalogEntry } from '@/domain/externalToolTaxonomy';",
        "",
        "export const EXTERNAL_TOOLS_CATALOG: ExternalToolCatalogEntry[] = [",
    ]
    for t in tools:
        lines.append("  {")
        for key in (
            "id",
            "name",
            "desc",
            "company",
            "toolTypeId",
            "region",
            "cardSummary",
            "productIntro",
            "bestFor",
            "version",
            "homepageUrl",
            "docsUrl",
            "mediaUrl",
            "screenshotUrl",
            "icon",
            "guideBody",
        ):
            val = t.get(key)
            if val is None or val == "":
                continue
            lines.append(f"    {key}: {js_str(val)},")
        if t["coreFeatures"]:
            lines.append(f"    coreFeatures: {js_str(t['coreFeatures'])},")
        lines.append(f"    tags: {js_str(t['tags'])},")
        lines.append("  },")
    lines.append("];")
    lines.append("")

    OUT_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(
        f"wrote {OUT_PATH} tools={len(tools)} "
        f"saas={sum(1 for t in tools if t['id'].startswith('tool-saas-'))} "
        f"bytes={OUT_PATH.stat().st_size}"
    )


if __name__ == "__main__":
    main()
