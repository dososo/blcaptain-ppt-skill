# Contributing

## 视觉人格 / 版式贡献规则

新增**一套人格**仅当它定义清楚：

- 锚定的公认设计体系（出处）+ 一句话灵魂
- 字体层级 + 锁定 token（含 WCAG 实测对比度）
- 底色与兄弟人格的区隔（ΔE）
- 签名基元（CSS / SVG 程序化构造）
- 何时用 / 何时不用（窄边界要诚实写出）

新增**一个版式**仅当它定义清楚：

- 版式用途（叙事功能）
- 固定结构 + 必备字段 / 可选字段
- 内容预算（变长不崩的行数 / 宽度上限）
- 移动端可读性风险 + validator 校验风险

## 代码贡献规则

- **守零依赖**：脚本只用 Node 内置能力（`fetch` / `node:fs`…），不引入 npm 依赖与前端构建链。
- 优先语义化 HTML；每个 deck 必须能独立单文件渲染。
- **守反伪造**：不编造数据 / logo / 截图 / 来源；外部图保留 provenance；可见层不露内部代号。
- 改动 token / 校验门须同步更新 `references/00-tokens-locked.md` 与 `scripts/validate-deck.mjs`，并保持自洽。

## 视觉质量门

PR 应至少附一份生成的 HTML deck，并通过 `node scripts/validate-deck.mjs <deck>.html`（**P0 = 0**）。**机器 PASS ≠ 视觉 PASS**——最终视觉由人确认。

## 反馈

欢迎在 [Issues](https://github.com/dososo/blcaptain-ppt-skill/issues) 提 bug、提需求、贴你的成品。
