<div align="center">

# blcaptain-ppt-skill

把一个想法 / 一篇文章 / 一组数据，变成 **7 套各有灵魂、好看与诚实都由机器强制**的单文件 HTML 演示

**中文** · [English](README.en.md)

[![License](https://img.shields.io/badge/License-个人免费%20·%20商业授权-2E6FDB.svg)](LICENSE) ![Node](https://img.shields.io/badge/Node-%3E%3D18-3FD6C2.svg) ![Zero-dependency](https://img.shields.io/badge/依赖-0%20npm%20包-3FD6C2.svg) ![Agent Skill](https://img.shields.io/badge/Agent-Skill-2E6FDB.svg)

</div>

<img src="docs/gallery/hero-wall.jpg" width="100%" alt="blcaptain-ppt-skill — 7 套视觉人格 · 各 20 页总览墙" />

> **安装**：对你的 Agent（Codex / Claude Code / Cursor / Gemini CLI…）说 ——「帮我安装这个 Skill：`github.com/dososo/blcaptain-ppt-skill`」

---

## 为什么要做它

市面上的 AI PPT，一眼就能看出是 AI 做的：大色块 + emoji + 紫蓝渐变 + 居中堆叠，数据随手编、配图随手塞。问题不在模型不努力，而在**"好看"被当成了玄学**——交给运气，每次都不一样。

但真正的演示设计——技术战报、发布会 keynote、行业观察——是**有方法**的：字号差多少、留白留多少、什么颜色不能用、暗底投影怎么才看得清、什么数据不能编。这些被顶级设计体系研究了几十年。

blcaptain 把这套功夫**固化成机器能强制执行的约束**：你给内容，它选人格、排版式、配签名图、过质检，产出一份**能直接讲、敢直接发**的 HTML deck。AI 不自由发挥，只在被验证过的版式里填内容——所以出来的**稳定地好看、而且诚实**。

## 它能给你什么

| 维度 | 内容 |
|---|---|
| **7 套视觉人格** | 每套锚定一个**公认设计体系**（非换皮模板）：技术崇高 / 构成主义 / 信息数据 / 奢侈极简 / 新造型 / 编辑主义 / 演示禅；按内容自动判选，也可指定 |
| **机器强制品味** | token + WCAG 对比度门 + 间距刻度门 + P0/P1/P2 校验 + 32 维审计——好看落成**代码常量**，每次生成都过线 |
| **反伪造诚信** | 不编造数据 / logo / 截图 / 来源；查不到的标「示意」，**机器把关** |
| **本地字体** | 字体按内容子集打包进 deck，**断网 / 墙内不崩**，不依赖 CDN |
| **单文件 HTML** | 一份 deck = 一个 `.html`：浏览器直接放映 / `Ctrl+P` 出 PDF / 截图发社媒 |
| **零依赖** | 全部脚本只用 Node 内置能力，`git clone` 即用，**不装一个 npm 包** |

## 独家配方与优势

别的 AI PPT 工具大多「一套模板套所有内容」，满屏一个味、对比度靠运气、爱编数据爱堆 emoji。这套不一样——**护城河是把「好看」和「诚实」都变成机器强制的下限**：

1. **机器强制品味 OS（结构不可复制）**——WCAG 对比度、间距刻度、P0–P2 校验、32 维审计全部 codified；不是「建议」，是**过不了就不交付**。这是大多数工具没有的地板。
2. **7 套体系锚定人格，各有灵魂**——不是换色皮肤，是给每份内容认领一个设计传统（工程冷光 / 革命宣言 / 数据理性 / 奢侈判断 / 秩序系统 / 编辑深度 / 禅意留白）。深度，不是模板数量。
3. **反伪造成文 + 机检**——不造假数据、假 logo、假截图、假来源；这是 AI 演示工具里最稀缺的诚信。
4. **本地字体子集，断网不崩**——很多工具 CDN 字体一断网 / 墙内就回退系统字、观感崩；我们把字按内容子集打包进 deck，覆盖 by construction。
5. **暗底投影可读工程**——公开演讲场景，暗底正文守 WCAG **AAA**（投影地板），观众**真能看清**。
6. **每次都稳定**——字阶 / 留白 / 对比阈值 / 断行 / 配色角色全是代码常量，不靠运气。

## 7 套视觉人格

选人格不是挑装饰，是给内容认领一个**立场**（设计体系）：

- **技术崇高 · Technical Sublime**（工程冷光）— Vercel / Linear / Stripe 式暗场冷光 + iso-compute 算力等值场签名。**技术战报 / 算力 / AI / 系统观察。**
- **构成主义 · Constructivism**（革命宣言）— Rodchenko / El Lissitzky 红场分幕 + 非对称张力。**宣言 / 强主张 / 号召。**
- **信息·数据设计 · Information Design**（数据理性）— Tufte / FT / Pudding 图表语汇 + 数据即论据。**数据 / 趋势 / 报告。**
- **判断震慑 · Luxury Minimalism**（奢侈判断）— Didone 裸色 + 留白即定价。**高端品牌 / 判断 / 产品。**
- **新造型 · De Stijl**（秩序系统）— Mondrian / Vignelli 几何无衬线 + 浊三原色。**标准 / 秩序 / 系统框架。**
- **编辑主义 · Editorial**（编辑深度）— 杂志编辑传统 + 七人格唯一衬线正文。**深度行业观察 / 长文分析。**
- **演示禅 · Zen**（禅意留白）— 演示禅 × 阴翳 × MUJI 空 + 暗墨「第二种黑」。**思想 / 品牌 keynote。** 〔窄人格：一图一念·数据 / pitch 不用〕

## 画廊 · 7 套人格 × 各 20 页总览

每一张 = 该人格 20 页真渲染缩览（点开看大图；想看活体直接打开对应 `templates/deck-<persona>.html`）：

<table>
<tr>
<td align="center" width="50%"><img src="docs/gallery/compute-overview-hd.png" width="100%" alt="技术崇高 · 20 页总览"/><br/><b>技术崇高 · Technical Sublime</b><br/><sub>工程冷光 + iso-compute 算力等值场 · 技术战报 / 算力 / AI</sub></td>
<td align="center" width="50%"><img src="docs/gallery/constructivist-overview-hd.png" width="100%" alt="构成主义 · 20 页总览"/><br/><b>构成主义 · Constructivism</b><br/><sub>红场分幕 + 非对称张力 · 宣言 / 强主张 / 号召</sub></td>
</tr>
<tr>
<td align="center"><img src="docs/gallery/info-data-overview-hd.png" width="100%" alt="信息·数据 · 20 页总览"/><br/><b>信息·数据 · Information Design</b><br/><sub>Tufte / FT / Pudding 图表语汇 · 数据 / 趋势 / 报告</sub></td>
<td align="center"><img src="docs/gallery/luxury-overview-hd.png" width="100%" alt="判断震慑 · 20 页总览"/><br/><b>判断震慑 · Luxury Minimalism</b><br/><sub>Didone 裸色 + 留白即定价 · 高端品牌 / 判断</sub></td>
</tr>
<tr>
<td align="center"><img src="docs/gallery/de-stijl-overview-hd.png" width="100%" alt="新造型 · 20 页总览"/><br/><b>新造型 · De Stijl</b><br/><sub>Mondrian / Vignelli 浊三原色 · 标准 / 秩序 / 系统框架</sub></td>
<td align="center"><img src="docs/gallery/editorial-overview-hd.png" width="100%" alt="编辑主义 · 20 页总览"/><br/><b>编辑主义 · Editorial</b><br/><sub>杂志编辑传统 + 唯一衬线正文 · 深度观察 / 长文</sub></td>
</tr>
<tr>
<td align="center"><img src="docs/gallery/zen-overview-hd.png" width="100%" alt="演示禅 · 20 页总览"/><br/><b>演示禅 · Zen</b><br/><sub>阴翳 × MUJI 空 + 暗墨「第二种黑」· 思想 / 品牌 keynote</sub></td>
<td align="center" valign="center"><sub>7 套 = 7 种被时间验证的设计体系，<br/>**不是换皮模板**。<br/><br/>每套均 20 页、全 P0=0 机检过线。<br/>全部超清原图见 <a href="docs/gallery/">docs/gallery/</a>。</sub></td>
</tr>
</table>

## 适合 / 不适合

**适合**：技术战报 · 产品拆解 · 行业观察 · 路演 / 发布会 deck · 数据复盘 · 思想 / 品牌 keynote · 社媒可传播长图。

**不适合**（会直说、劝你换工具）：大表格 / 培训教材 · 法律 / 医疗 / 金融合规文件 · 多人协作编辑的传统 PPT · 纯文本摘要 · 复刻某品牌官方发布会视觉 · 任何要求**编造**真实数据 / logo / 截图。**一个什么都能做的工具，通常什么都做不好。**

## 怎么用

装好后，在新会话里说人话：

```
用 blcaptain 把这段内容做成演示：
（把你的目标 / 文章 / 数据贴进来）
```

它会读懂内容、判一套人格（并告诉你为什么这么判）、需要时最多问 3 个问题，然后排版出一份单文件 HTML deck。不满意直接说「换个人格 / 这页太满 / 字大点」，它会改。

**你会得到**：一个单文件 `.html`（浏览器直接放映 / `Ctrl+P` 出 PDF），外加一份质检报告（P0 / P1 / P2 + 32 维审计）。

## 工作流（智能驱动 · 内容优先）

不是填格子，每一步都由 Agent 亲自经手：

1. **预判 + 定页数** — 读内容自动判 deck 类型 + 人格，按体量定页数（不写死、不灌水）。
2. **内容优先** — 给 URL / 文件先用 `scripts/ingest.mjs` 取正文（**不绕付费墙·不伪造来源**）；信息够就直接生成，不够最多问 3 个。
3. **设计简报** — 生成前用文字确认核心判断 + 受众 + 页面节奏，给反悔点。
4. **落版 + 配图** — 按人格选种子版式；图按角色路由（见下）。
5. **生成单文件 HTML** — token 来自锁定真值，签名按人格 DNA，白标（不露内部代号）。
6. **校验 + 审计** — 跑 `scripts/validate-deck.mjs`（P0=0 才交付）+ 32 维审计，末行留「敢不敢直接发出去 / 讲出去」主观验收门。

## 图片怎么来（按角色路由 · 反伪造）

图不强行配。按「这张图是什么角色」走不同通道：

- **证据 / 真实**（产品截图·数据·logo）→ ① 你提供 → ② 向你索要 → ③ 真实公开来源（标 license）→ ④ 降级成图表 / 纯排版。**绝不 AI 伪造**；用户截图用零依赖 CSS 裱框（只裱不改内容）。
- **氛围 / 隐喻 / 母题**（封面 hero·背景·装饰）→ ① **CSS / SVG 签名图形**（多数 deck 默认·零依赖·风格 = 人格 DNA）→ ② **AI 生图**（先 `scripts/image-gen.mjs detect` 探测你的生图环境·有就用·没有明确告知）→ ③ **开源图库**（Openverse CC0·自动署名）。

**绝不静默塞通用图**——默认生一张「可与任何工具互换」的图，等于把差异化亲手抹平。

## 验证效果

**机器 PASS ≠ 视觉 PASS。** 机器只证明结构没坏，审美由人确认：

- **机器门禁**（`node scripts/validate-deck.mjs <deck>.html`）：颜色只用 token、对比度过 WCAG、间距落刻度、信号 / 证据 / 行动三角色齐全、字体 100% 覆盖、可见层无内部代号泄漏、数据无来源标「示意」。**P0 不为 0 不交付。**
- **32 维终极审计**：逐维过线，出审查报告（P0 / P1 / P2 + 处置）。
- **人工终判**：成图交你做最终视觉确认——这才是发布闸门。

## 设计原则（负面边界 = 真正的专家经验）

- **反 AI 感**：不用紫蓝橙粉渐变、不居中对称、不全圆角浮卡、不堆 emoji、不上未锚定的自创风。
- **配色克制**：单一强调色 ~5%、不多信号色打架；不用纯白纯黑（用暖白 / 近黑）；颜色是系统合同、不让乱填 hex。
- **诚实中性**：不编造数据 / 品牌 / 来源；外部图记录真实来源；成品不印内部代号 / demo 假信息。
- **形式服务内涵**：每个可见元素都要承载意义，不为独特而独特、不炫技。

## 视觉审美参考（对标公认最高奖级）

这套审美不是凭空来的，每套人格都锚定被时间验证过的体系：

- **技术崇高** → Vercel / Linear / Stripe 的工程冷光 · Edward Tufte 的数据墨水比。
- **构成主义 / 新造型** → Rodchenko · El Lissitzky · Mondrian · Theo van Doesburg · Vignelli 的几何与张力。
- **信息·数据** → Tufte · Financial Times · The Pudding · NYT Graphics 的图表语汇。
- **奢侈极简 / 编辑** → Didone（Bodoni / Didot）· The New Yorker · Monocle · 出版设计协会 SPD 的字阶与留白。
- **演示禅** → 谷崎润一郎《阴翳礼赞》· 原研哉 / MUJI · 枯山水的「间」与减法。

## 目录结构

```
blcaptain-ppt-skill/
├── SKILL.md            # 给 Agent 读的大脑：智能工作流 + 7 人格 + 硬约束
├── PRODUCT.md          # 产品定位 / 差异化 / 能力边界
├── references/         # 按需加载：令牌真值 / 版式库 / 图表系统 / 截图裱框 / 隐蔽细节
├── scripts/            # 零依赖 Node：校验 / 字体子集 / 图表渲染 / 生图探测 / 内容摄取
├── templates/          # 7 套 deck 种子（单文件 HTML·tokens/布局/签名全 inline）+ 本地字体
├── examples/           # 端到端样例 deck
└── docs/gallery/       # 7 套 20 页超清总览
```

## 后续计划（Roadmap）

- **原生可编辑 PPTX 导出**（企业「在 PowerPoint 里改字」场景——重要、规划中；当前可用浏览器 `Ctrl+P` 出精确 16:9 PDF）。
- 更多人格的真实内容打磨与端到端样例。
- 每套人格的完整设计方法论文档逐步公开。
- 双语文档持续完善，覆盖更多 Agent 平台安装方式。

## FAQ

**Q：和那些「一键生成 PPT」的工具有什么不一样？**
A：它们大多一套模板套所有内容，一眼能看出是 AI、还爱编数据。这套给你 7 套有灵魂、各锚定公认设计体系的人格，加上**机器强制的对比度 / 间距 / 32 维审计**和**反伪造诚信**——出来一眼专业、而且不骗人。

**Q：必须用 Claude 吗？**
A：不必。只要你的 Agent 支持 Skill（Codex / Claude Code / Cursor / Gemini CLI…），就能用。

**Q：要装一堆依赖吗？**
A：不用。全部脚本只用 Node 内置能力（`fetch` / `fs`…），**零 npm 依赖**，`git clone` 即用（Node ≥ 18）。

**Q：没有图怎么办？**
A：多数 deck 的「图」本质是 CSS / SVG 签名图形，零位图也成立；真要位图，先探测你的生图环境，有就用、没有就明确告知，或从 Openverse CC0 开源图库取（自动记来源）。**绝不偷偷塞通用图、绝不伪造截图。**

**Q：能改人格 / 颜色吗？**
A：人格可指定也可让它按内容判；主题色有 3 档可选；但字号 / 间距 / 对比度是机器兜底的系统约束，不让乱填——这正是它稳定好看的原因。

**Q：我的内容会被上传吗？**
A：不会。Skill 在你自己的 Agent 里本地运行，内容只经过你正在用的 Agent / 模型；我们没有服务器、收不到你的任何内容。

## 关于作者

**爆裂队长NEXT**

15yr PM. Fired myself. Hired 10 AIs. AI Agents BLTeam 翻车笔记，真实战、生产级干货持续分享。少刷二手情绪，多看一手信号源。

- X / Twitter：[@thinkszyg](https://x.com/thinkszyg)
- 邮箱：blteam2026@outlook.com

欢迎在 [Issues](https://github.com/dososo/blcaptain-ppt-skill/issues) 提反馈、提需求。

## License

**开源与个人用途免费；闭源商业用途需购买商业授权。** 你用本 Skill 生成的演示作品本身归你所有、任意使用，不受限制——只有把软件本身嵌入闭源 / 商业产品才需授权。详见 [LICENSE](LICENSE)。商业授权联系：blteam2026@outlook.com
