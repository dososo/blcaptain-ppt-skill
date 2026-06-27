# Changelog

本项目变更记录。遵循语义化版本。

## [1.0.0] - 2026-06-27

首个公开版本。

### 新增

- **7 套体系锚定视觉人格**，每套 20 页超清总览：技术崇高 Technical Sublime / 构成主义 Constructivism / 信息·数据 Information Design / 判断震慑 Luxury Minimalism / 新造型 De Stijl / 编辑主义 Editorial / 演示禅 Zen。按内容自动判选，也可指定。
- **机器强制品味 OS**：`scripts/validate-deck.mjs`——P0 / P1 / P2 校验 + WCAG 对比度门 + 间距刻度门 + 字体覆盖机检 + 白标（防内部代号泄漏）+ 反伪造机检 + 32 维审计框架。
- **零依赖 Node 工具链**：内容摄取 `ingest.mjs`（URL / 文件 / 粘贴 → 干净正文·不绕付费墙·不伪造来源）/ 生图环境探测 `image-gen.mjs`（codex-native try / 第三方 env 门控 / Openverse CC0 兜底）/ 图表渲染 `chart-render.mjs` / 字体子集 `subset-fonts.mjs` / 截图裱框零依赖 CSS 配方。
- **本地字体子集**：按 deck 实际用字打包进文件，断网 / 墙内不崩。
- **单文件 HTML deck**：浏览器直接放映 / `Ctrl+P` 出精确 16:9 PDF / 截图发社媒。
- **暗底投影可读工程**：暗底载义正文守 WCAG AAA（投影地板）。

### 边界（首发不做 · 见 Roadmap）

- 原生可编辑 PPTX 导出（规划中·企业「在 PowerPoint 改字」场景；当前可用浏览器 Ctrl+P 出 PDF）。
- 在线编辑 / 用户登录 / 复杂动画库。
