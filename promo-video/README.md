# MSS AI提效平台宣传片

工程同时保留两版成片：

- `MSS-AI-Promo-K3`：新版 70 秒、18 镜头，按 V1.2 分镜表编排；以
  Kimi K3 的留白、硬切和 0.5 秒节拍为视觉参考，用 snapcn 组件制作
  独立大字卡，产品段落只展示未经裁切的真实截图。
- `MSS-AI-Promo`：原 39.3 秒版本，保留用于对照。

两版均在 `1280×720 @ 30fps` 画布上编排，正式输出使用 1.5 倍渲染为
`1920×1080`。

## 叙事结构

1. 统一入口与平台价值
2. AI 快讯：每天 5 分钟、一键订阅
3. 外部工具精选：分类优选、图文/视频教学
4. 内部办公推荐：合规工具、真实场景与案例
5. AI 工具 Hub：聚焦高频高价值场景、沉淀经验
6. 四项价值与内测邀请

逐镜映射见 [storyboard-v2.md](./storyboard-v2.md)。

## 命令

```bash
npm install
npm run dev
npm run lint
npm run render:k3
```

新版成片输出到 `out/mss-ai-promo-k3-1080p.mp4`；原版仍可用
`npm run render` 输出。

## 素材与隐私

- 用户原始截图不被修改；视频只读取 `public/screens/` 下的安全副本。
- 安全副本遮住左下角账号标识。
- 登录截图中的邮箱与默认密码提示不进入视频。
- `public/audio/brand-bed.wav` 是由 `scripts/generate-audio.mjs` 纯合成的原创氛围音频，不含外部音乐素材。
- 新版旁白为本机离线中文语音合成；`brand-bed-k3.wav` 由
  `scripts/generate-k3-bed.mjs` 确定性合成，不含外部音乐素材。

第三方许可说明见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
