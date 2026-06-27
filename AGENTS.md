# AGENTS.md

本仓库是一个 **Agent Skill**。完整的操作「大脑」在 [SKILL.md](SKILL.md)——请先读它。

- **它做什么**：把一个目标 / 文章 / 数据转成单文件 HTML 演示，覆盖 7 套各锚定公认设计体系的视觉人格，由 token + validator + 32 维审计**机器强制设计一致性**，并守反伪造纪律（不造数据 / logo / 截图 / 来源）。
- **Agent 入口**：[SKILL.md](SKILL.md)。
- **校验任意 deck**：`node scripts/validate-deck.mjs <deck>.html`（P0 必须为 0）。
- **引用层**（按需加载）：`references/`。
- **人格种子**（7 套）：`templates/deck-<persona>.html`。
- **零依赖**：所有脚本只用 Node 内置能力（Node ≥ 18），不装一个 npm 包。

兼容任何支持 Skill 的 Agent（Codex / Claude Code / Cursor / Gemini CLI…）。

---

This repository is an **Agent Skill**. The full operating brain lives in [SKILL.md](SKILL.md) — read it first. It turns a goal / article / dataset into a single-file HTML presentation across 7 design-system-anchored visual personas, with machine-enforced design consistency (token + validator + 32-dimension audit) and an anti-fabrication discipline. Validate any deck with `node scripts/validate-deck.mjs <deck>.html` (P0 must be 0). Zero dependencies, Node >= 18.
