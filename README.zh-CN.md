<div align="center">

# blcaptain-ppt-skill

把一个想法 / 一篇文章 / 一组数据，变成 **7 套各有灵魂、好看与诚实都由机器强制**的单文件 HTML 演示

[English](README.md) · **中文**

[![License](https://img.shields.io/badge/License-个人免费%20·%20商业授权-2E6FDB.svg?style=flat-square)](LICENSE) ![Node](https://img.shields.io/badge/Node-%3E%3D18-3FD6C2.svg?style=flat-square) ![Zero-dependency](https://img.shields.io/badge/依赖-0%20npm%20包-3FD6C2.svg?style=flat-square) ![Agent Skill](https://img.shields.io/badge/Agent-Skill-2E6FDB.svg?style=flat-square)

</div>

<img src="docs/gallery/hero-wall.jpg" width="100%" alt="blcaptain-ppt-skill — 7 套视觉人格 · 各 20 页总览墙" />

> **安装** —— 对你的 Agent（Codex / Claude Code / Cursor / Gemini CLI…）说：「帮我安装这个 Skill：`github.com/dososo/blcaptain-ppt-skill`」

---

## 核心理念 —— 精密的信念（Engineered Conviction）

市面上的 AI 演示，一眼就能看出是 AI 做的：大色块、emoji、紫蓝渐变、居中堆叠、随手编的数据、随手塞的图库图。问题不在模型不努力，而在**「好看」被当成了玄学**——交给运气，每次都不一样。

但真正的演示设计——技术战报、发布会 keynote、行业观察——是**有方法**的：字号差多少、留白留多少、什么颜色绝不能用、暗底投影怎么才看得清、什么数据不能编。这些被公认设计体系研究了几十年。

**blcaptain 把这套功夫，铸成机器能强制执行的约束。** 每一份 deck = 一个被精密构造、承载**一个不容回避判断**的物体——*精密 × 信念*。AI 不自由发挥，只在被验证过的版式里填内容。所以出来的**稳定地好看、而且诚实**——靠的是机制，不是运气。

## 护城河 —— 我们「绝不做」什么

> *「好的设计，是尽可能少的设计。」* —— Dieter Rams。护城河不是功能清单，是我们**拒绝**交付什么的纪律。

- **绝不伪造** 数据 / logo / 截图 / 来源——查不到的标 `示意`，而且**机器把关**。
- **禁 emoji、禁随手图库**——AI slop 最响的两个信号。
- **单一信号色 ~5%**——不让多色互相打架抢注意力。
- **禁装饰性几何**——形式服务内涵，不为独特而独特。
- **字重不轻佻**，不全圆角浮卡，不用紫蓝橙粉渐变。
- **绝不怼满**、牺牲呼吸去多塞。
- **不上未锚定的自创风**——每套人格都锚定一个**公认**设计体系，带出处。
- **不照抄单一流派**当成品。

## 它能给你什么

| | |
|---|---|
| **7 套视觉人格** | 每套锚定一个**公认设计体系**（非换皮模板）：技术崇高 · 构成主义 · 信息数据 · 奢侈极简 · 新造型 · 编辑主义 · 演示禅。按内容自动判选，也可指定。 |
| **机器强制品味** | token + WCAG 对比度门 + 间距刻度门 + P0/P1/P2 校验 + 32 维审计——好看铸成**代码常量**；每份 deck 过线才交付。 |
| **反伪造诚信** | 不造假数据 / logo / 截图 / 来源；查不到标 `示意`，**机器把关**。 |
| **本地字体** | 字体按内容子集打包**进** deck——**断网 / 墙内不崩**，不依赖 CDN。 |
| **单文件 HTML** | 一份 deck = 一个 `.html`：浏览器直接放映 · `Ctrl+P` 出精确 16:9 PDF · 截图发社媒。 |
| **零依赖** | 脚本只用 Node 内置能力。`git clone` 即用——**不装一个 npm 包**。 |

## 7 套视觉人格

选人格不是挑装饰，是给内容认领一个**立场**（设计体系）。下方每张封面 = 该人格 20 页 demo 的第 1 页：

| 封面 | 人格 · 锚定 | 何时用 |
|:---:|---|---|
| <img src="docs/gallery/cover-compute.png" width="420" alt="技术崇高 封面"/> | **技术崇高** · Technical Sublime<br><sub>Vercel / Linear / Stripe 工程冷光 + iso-compute 算力等值场签名。</sub> | 技术战报 · 算力 · AI · 系统 |
| <img src="docs/gallery/cover-constructivist.png" width="420" alt="构成主义 封面"/> | **构成主义** · Constructivism<br><sub>Rodchenko / El Lissitzky 红场分幕 + 非对称张力。</sub> | 宣言 · 强主张 · 号召 |
| <img src="docs/gallery/cover-info-data.png" width="420" alt="信息·数据 封面"/> | **信息·数据** · Information Design<br><sub>Tufte / FT / Pudding 图表语汇——数据即论据。</sub> | 数据 · 趋势 · 报告 |
| <img src="docs/gallery/cover-luxury.png" width="420" alt="判断震慑 封面"/> | **判断震慑** · Luxury Minimalism<br><sub>Didone 裸色 + 留白即定价。</sub> | 高端品牌 · 判断 · 产品 |
| <img src="docs/gallery/cover-de-stijl.png" width="420" alt="新造型 封面"/> | **新造型** · De Stijl<br><sub>Mondrian / Vignelli 几何无衬线 + 浊三原色。</sub> | 标准 · 秩序 · 系统框架 |
| <img src="docs/gallery/cover-editorial.png" width="420" alt="编辑主义 封面"/> | **编辑主义** · Editorial<br><sub>杂志编辑传统 + 七人格唯一衬线正文。</sub> | 深度观察 · 长文分析 |
| <img src="docs/gallery/cover-zen.png" width="420" alt="演示禅 封面"/> | **演示禅** · Zen<br><sub>演示禅 × 阴翳 × MUJI 空 + 暗墨「第二种黑」。</sub> | 思想 · 品牌 keynote *（窄人格：一图一念·非数据/pitch）* |

## 画廊 —— 每套人格的完整 20 页

上面是封面（第 1 页）；这里是每套 demo 的全部页（点开看大图，或打开对应 `templates/deck-<persona>.html` 看活体）：

<table>
<tr>
<td align="center" width="50%"><img src="docs/gallery/compute-overview-hd.png" width="100%" alt="技术崇高 · 20 页总览"/><br/><sub><b>技术崇高</b> · 工程冷光</sub></td>
<td align="center" width="50%"><img src="docs/gallery/constructivist-overview-hd.png" width="100%" alt="构成主义 · 20 页总览"/><br/><sub><b>构成主义</b> · 红场宣言</sub></td>
</tr>
<tr>
<td align="center"><img src="docs/gallery/info-data-overview-hd.png" width="100%" alt="信息·数据 · 20 页总览"/><br/><sub><b>信息·数据</b> · 数据即论据</sub></td>
<td align="center"><img src="docs/gallery/luxury-overview-hd.png" width="100%" alt="判断震慑 · 20 页总览"/><br/><sub><b>判断震慑</b> · 裸色 · 留白即定价</sub></td>
</tr>
<tr>
<td align="center"><img src="docs/gallery/de-stijl-overview-hd.png" width="100%" alt="新造型 · 20 页总览"/><br/><sub><b>新造型</b> · 浊三原色 · 纯粹秩序</sub></td>
<td align="center"><img src="docs/gallery/editorial-overview-hd.png" width="100%" alt="编辑主义 · 20 页总览"/><br/><sub><b>编辑主义</b> · 衬线 · 杂志网格</sub></td>
</tr>
<tr>
<td align="center"><img src="docs/gallery/zen-overview-hd.png" width="100%" alt="演示禅 · 20 页总览"/><br/><sub><b>演示禅</b> · 暗墨 · 一页一念</sub></td>
<td align="center" valign="center"><sub>7 套 = 7 种被时间验证的设计体系，<br/><b>不是换皮模板</b>。<br/><br/>每套 20 页、全 <code>P0=0</code> 机检过线。<br/>全部超清原图见 <a href="docs/gallery/">docs/gallery/</a>。</sub></td>
</tr>
</table>

## 凭什么不一样

| 维度 | 多数 AI 演示工具 | blcaptain |
|---|---|---|
| **一致性** | 好看*靠运气*——每次都不一样 | **机器强制下限**（WCAG / 间距 / 32 维审计）——过线才交付 |
| **深度 vs 广度** | 一套模板换色套所有内容 | **7 套人格，各锚定一个公认设计体系** |
| **诚信** | 乐于编数据、伪造截图 | **反伪造，成文 + 机检** |
| **字体** | CDN 字体——断网 / 墙内崩 | **子集打包进 deck**，永不崩 |
| **投影** | 暗底投影常看不清 | **AAA 对比度地板**，观众真能看清 |
| **体积** | npm + 构建链 | **零依赖**——`git clone` 即用 |

## 不适合

大表格 / 培训教材 · 法律 / 医疗 / 金融合规文件 · 多人协作编辑的传统 PPT · 纯文本摘要 · 复刻某品牌官方发布会视觉 · 任何要求编造真实数据 / logo / 截图。*一个什么都能做的工具，通常什么都做不好。*

## 怎么用

装好后，对你的 Agent 说人话：

```
用 blcaptain 把这段内容做成演示：
（把你的目标 / 文章 / 数据贴进来）
```

它会读懂内容、**判一套人格（并告诉你为什么）**、需要时最多问 3 个问题，然后排版出一份单文件 HTML deck + 质检报告。不满意直接说「换个人格 / 这页太满 / 字大点」，它会改。

**你会得到**：一个 `.html`（浏览器直接放映 / `Ctrl+P` 出 16:9 PDF）+ 一份质检报告（P0 / P1 / P2 + 32 维审计）。校验任意 deck：

```bash
node scripts/validate-deck.mjs templates/deck-compute.html   # P0 须为 0
```

## 工作流（智能驱动 · 内容优先）

不是填格子——每一步都由 Agent 亲自经手：

1. **读懂 + 定盘** —— 自动判 deck 类型 + 人格，按内容体量定页数（不灌水、不写死）。
2. **内容优先** —— 给 URL / 文件先用 `scripts/ingest.mjs` 取干净正文（**绝不绕付费墙、不伪造来源**）；信息够就生成，不够最多问 3 个。
3. **设计简报** —— 生成前用文字确认核心判断 + 受众 + 页面节奏。
4. **落版 + 配图** —— 按人格选种子版式；图按角色路由（见下）。
5. **生成单文件 HTML** —— token 来自锁定真值，签名按人格 DNA，白标（不露内部代号）。
6. **校验 + 审计** —— `validate-deck.mjs`（P0=0 才交付）+ 32 维审计，末行问「敢不敢直接发出去 / 讲出去」。

## 图片怎么来（按角色路由 · 反伪造）

图不强行配。每个 slot 按「这张图是什么角色」路由：

- **证据 / 真实**（产品截图 · 数据 · logo）→ ① 你提供 → ② 向你索要 → ③ 真实公开来源（标 license）→ ④ 降级成图表 / 纯排版。**绝不 AI 伪造**；你的截图走零依赖 CSS 裱框（只裱不改内容）。
- **氛围 / 隐喻 / 母题**（封面 hero · 背景 · 装饰）→ ① **CSS / SVG 签名图形**（多数 deck·零位图·风格 = 人格 DNA）→ ② **AI 生图**（先 `scripts/image-gen.mjs detect` 探测**你的**生图环境·有就用·没有明确告知）→ ③ **开源图库**（Openverse CC0·自动署名）。

**绝不静默塞通用图**——默认生一张「任何工具都能出」的图，等于把你来这儿要的差异化亲手抹平。

## 视觉审美参考 —— 对标公认最高奖级

这套审美不是凭空来的，每套人格都锚定被时间验证过的体系：

- **技术崇高** → Vercel / Linear / Stripe 工程冷光 · Edward Tufte 数据墨水比。
- **构成主义 / 新造型** → Rodchenko · El Lissitzky · Mondrian · Theo van Doesburg · Vignelli。
- **信息·数据** → Tufte · Financial Times · The Pudding · NYT Graphics。
- **奢侈极简 / 编辑** → Didone（Bodoni / Didot）· The New Yorker · Monocle · 出版设计协会 SPD。
- **演示禅** → 谷崎润一郎《阴翳礼赞》· 原研哉 / MUJI · 枯山水的「间」。

## 目录结构

```
blcaptain-ppt-skill/
├── SKILL.md            # 给 Agent 读的大脑：智能工作流 + 7 人格 + 硬约束
├── PRODUCT.md          # 产品定位 / 差异化 / 能力边界
├── references/         # 按需加载：令牌真值 / 版式库 / 图表系统 / 截图裱框 / 隐蔽细节
├── scripts/            # 零依赖 Node：校验 / 字体子集 / 图表渲染 / 生图探测 / 内容摄取
├── templates/          # 7 套 deck 种子（单文件 HTML·tokens/布局/签名全 inline）+ 本地字体
├── examples/           # 端到端样例 deck
└── docs/gallery/       # 7 套 × 20 页总览 + 封面 + 海报墙
```

## 后续计划（Roadmap）

- **原生可编辑 PPTX 导出** —— 企业「在 PowerPoint 改字」场景（重要、规划中；当前可用浏览器 `Ctrl+P` 出精确 16:9 PDF）。
- 更多人格的真实内容打磨 + 端到端样例。
- 每套人格的完整设计方法论逐步公开。
- 双语文档持续完善，覆盖更多 Agent 平台。

## FAQ

**和那些「一键生成 PPT」的工具有什么不一样？**
它们大多一套模板套所有内容，一眼是 AI、还爱编数据。这套给你 7 套各锚定公认设计体系的人格，加上**机器强制的对比度 / 间距 / 32 维审计**和**反伪造诚信**——一眼专业、而且不骗人。

**必须用 Claude 吗？**
不必。只要你的 Agent 支持 Skill（Codex / Claude Code / Cursor / Gemini CLI…），就能用。

**要装一堆依赖吗？**
不用。脚本只用 Node 内置能力（`fetch` / `fs`…）——**零 npm 依赖**，`git clone` 即用（Node ≥ 18）。

**没有图怎么办？**
多数 deck 的「图」本质是 CSS/SVG 签名图形，零位图也成立；真要位图，先探测你的生图环境（有就用、没有明确告知），或从 Openverse CC0 取。**绝不偷偷塞通用图、绝不伪造截图。**

**能改人格 / 颜色吗？**
人格可指定也可自判；主题色 3 档可选；但字号 / 间距 / 对比度机器兜底——这正是它稳定好看的原因。

**我的内容会被上传吗？**
不会传到我们这。Skill 在你自己的 Agent 里本地运行，内容只经过你正在用的 Agent / 模型；我们没有服务器、收不到任何内容。

## 关于作者

**爆裂队长NEXT（BLCaptain）** —— 15yr PM. Fired myself. Hired 10 AIs. AI Agents 团队翻车笔记，生产级真干货持续分享。少刷二手情绪，多看一手信号源。

- X / Twitter：[@thinkszyg](https://x.com/thinkszyg)
- 邮箱：blteam2026@outlook.com

欢迎在 [Issues](https://github.com/dososo/blcaptain-ppt-skill/issues) 提反馈、提需求。

## License

**开源与个人用途免费；闭源商业用途需购买商业授权。** 你用本 Skill 生成的演示作品本身归你所有、任意使用，不受限制——只有把软件本身嵌入闭源 / 商业产品才需授权。详见 [LICENSE](LICENSE)。商业授权联系：blteam2026@outlook.com
