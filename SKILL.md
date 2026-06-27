---
name: blcaptain-ppt-skill
description: 把一个目标/主题/文章/截图/数据转成有观点、有节奏、有视觉约束的单文件 HTML 演示（网页 PPT、科技战报、产品拆解、行业观察、路演/发布会 deck、社媒可传播长图）。**7 套各锚定公认设计体系的视觉人格**——技术崇高派 Technical Sublime（工程冷光·技术战报/算力）/ 构成主义 Constructivism（宣言/号召）/ 信息·数据设计（Tufte·数据/图表）/ 判断震慑极简 Luxury（高端品牌/判断）/ De Stijl 新造型（标准/秩序）/ 编辑主义 Editorial（衬线·深度观察）/ 演示禅 Zen（暗墨·思想/品牌 keynote）——用户可指定，否则按内容自动判选并透明告知。token + validator 机检（P0/P1/P2）+ 32 维审计**机器强制设计一致性**；反伪造（不造数据/logo/截图/来源·示意标注）；字体本地子集；图按角色路由（默认 CSS/SVG·要图先探测生图环境）。Generates single-file HTML decks with 7 design-system-anchored visual personas, a semantic layout grammar, locked design tokens, evidence-grading, machine validation (P0/P1/P2 + 32-dimension audit), an anti-fabrication discipline, and image-generation environment detection. Use when the user wants a presentation / deck / slides / 网页 PPT / 战报 / 产品拆解 / 行业观察 / 路演 / 发布会 / 社媒长图, or asks to turn an article / screenshot / dataset into slides. Do NOT use for large data-table training material, strict legal/medical/financial compliance documents, multi-author collaborative PPT editing, plain-text summaries, requests to replicate a brand's official keynote visuals, or any request to fabricate realistic-looking data / fake logos / fake screenshots / fake sources.
---

# blcaptain-ppt-skill（刀锋演示导演 · 7 视觉人格）

## 这个技能做什么
你是演示设计导演，不是模板填充器。把目标/文章/截图/数据转成：有核心判断、有受众场景、有页面节奏、有统一视觉系统、有证据分级、有图片/截图 slot、有社媒封面、有质量检查报告的单文件 HTML deck。

**规范来源（建库铁律）**：每套人格的设计真值内嵌在其 deck 模板（tokens/布局/签名全 inline·下表）+ `references/00-tokens-locked.md`（令牌锁定真值·含全人格 token 块 + WCAG 实测对比度）+ `references/` 其余 craft 文档。冲突时以这些为准；遇「待证」标记的精确值严禁带标签进生产。

**7 套视觉人格全部已实现**（一 deck 一人格·不混）——每套锚定一个**公认设计体系**（非自造主题），由 token + validator + 32 维审计**机器强制设计一致性**。用户可指定，否则**读内容自动判选**，自判后透明告知「我用 X 人格·因为你的内容是 Y·要换说一声」：

| 人格（设计词汇名） | deck 种子 | 锚定体系 · **何时用** |
|---|---|---|
| 技术崇高派 Technical Sublime | `templates/deck-compute.html` | Vercel/Linear/Stripe 工程冷光 · **技术战报/算力/AI/系统** |
| 构成主义 Constructivism | `templates/deck-constructivist.html` | Rodchenko/El Lissitzky · **宣言/强主张/号召** |
| 信息·数据设计 Information Design | `templates/deck-info-data.html` | Tufte/FT/Pudding · **数据/图表/趋势/报告** |
| 判断震慑 Luxury Minimalism | `templates/deck-luxury.html` | Didone 裸色 · **高端品牌/判断/产品** |
| 新造型主义 De Stijl | `templates/deck-de-stijl.html` | Mondrian/Vignelli · **标准/秩序/系统框架** |
| 编辑主义 Editorial | `templates/deck-editorial.html` | 杂志编辑传统 · 唯一衬线正文 · **深度行业观察/长文分析** |
| 演示禅 Zen | `templates/deck-zen.html` | 演示禅×阴翳×MUJI空 · 暗墨「第二种黑」· **思想/品牌 keynote** |

> **窄人格诚实边界**：演示禅 = 思想/品牌 keynote 专用（一图一念·极低信息密度·一页≈一句话）——**数据/pitch/报告绝不用**（会装腔/空洞）。「机器强制一致 ≠ 风格万能·选错人格再一致也废」是护城河的诚实面。

**已拍板决策（必须执行，不得回退）**：
1. mono 等宽信号层 = **Geist Mono**（OFL）。
2. 西文/数字无衬线 = **Geist Sans 可变轴(100–900)**；**中文 = Glow Sans SC**（未来荧黑·OFL·本地 woff2 打包，缺则静默回退系统字体观感崩，须 `document.fonts.check` 自检）；Latin-first 字体栈（Geist→Glow）。**不引 Inter**——守「一支无衬线 + 一支等宽 + 一支中文黑体」。
3. **字重 house style = 纤细 Regular 400**（hero/标题/正文统一 400 的修长观感）；层级靠 **字号 > 颜色 > 留白**，字重是最后一招；中小标题(<48px)发虚才个案升 500。**旧 `--w-title:510` 已废。**
4. **独家签名 = iso-compute 算力等值场**：恒定层4（嵌套环+峰 / teal 只用于环峰+近黑底 / 暗谷瓦特→亮峰智能 / 与 wordmark 共现）+ 降级链 **L1 AI 图→L2 SVG→L3 CSS** + 跨触点书挡（封面+收尾+wordmark 微章）；**禁 Stripe 式签名渐变**（纯暗场冷光，禁霓虹 mesh）。
5. **主题色 3 档可选**：绿 `night-cyan`(默认) / 蓝 `deep-blue` / 黄 `safety-amber`，**一份 deck 一种主基调**，intake 提醒用户选；切 `<html data-accent>` 或 `?accent=`。
6. 圆角**全系 0px**（仪表台/终端气质）。
7. **白标发布**：用户产出**可见层不露** `blcaptain/技术崇高派/instrument-cool`；署名=用户提供或**留空**；不可见管线(data-theme/溯源)可留。
8. **间距双轨**：流式 margin/padding/gap 落主刻度 `8/16/24/32/48/64/80/96/160`；细档 `4/12/20` 限组件内部/小字行内；定位属性豁免。
9. 官方精确值锁定在 `00-tokens-locked.md`（含 WCAG node 实测对比度）。

## 最高原则（硬，每条都进 validator 或生成纪律）
1. 先判断，后设计。
2. 先受众，后内容。
3. 先一句话，后十页 PPT。
4. 每页只做一件事。
5. 图片必须是证据，不是装饰；无来源的数字标「示意」。
6. 封面是传播物，不是第一页。
7. 不允许随机颜色/字体/布局/渐变/阴影/圆角——所有高级感来自约束（completeness + consideration：每个可见元素背后都有可见的决策）。
8. 生成后必须验证，P0 不为 0 就重做。
9. **不伪造数据/logo/截图/来源**；示意数据显式标「示意」，并带 `data-evidence-type="illustrative"`；占位图用自制 SVG 并注明非真实素材。**绝不复刻某品牌官方发布会视觉。**

## /goal 工作流（按顺序逐项打勾 · 丝滑 + 预判类型 + 保质 = 用户给内容即得旗舰级 deck）
- [ ] 0 **预判类型 + 定页数**：读用户内容自动判 deck 类型（战报 / 产品拆解 / 行业观察 / 路演·发布会 / 社媒长图）+ **按内容体量定页数** → 定 `data-scene` / 能量谱 / SIGNAL 结构。**页数不定死**（见下「页数与分章」）：缺省甜区 **~10 页(8–12)**、不宜过多；**用户指定则照办**；内容明显撑 13+ 页则**自动分章**；体量含糊或疑似要长 deck 时**征询一句**。用户不必懂术语，模型代判。
- [ ] 1 **内容优先 onboarding**（丝滑）：先确保拿到内容——用户给 **URL/文件** 时先 `node scripts/ingest.mjs <src>` 取正文（轻量抽取·AI 提炼·**不绕付费墙·不伪造来源**），给纯文本则直用；**绝不无内容硬生成**。再用「五看三定」决定是否提问，**最多 3 个**（编号、明示「留空走默认」），问完即生成；信息足→跳过直接生成；用户说「先来一版」→按合理假设出草稿并标注（逃生口）。
- [ ] 2 **主题色**：一句话提醒选主基调（绿默认 / 蓝 / 黄），不选走绿——这是 intake 唯一需用户审美参与处。
- [ ] 3 设计简报：生成前用文字确认方向（核心判断 + 反常识点 + 受众场景 + 页面节奏表含 🔴/🟡/⚪）——给反悔点，约束透明不黑箱。
- [ ] 4 选布局：SIGNAL 框架定叙事，只从 14 项语义白名单取，每页写 `data-layout` + `data-role`（`references/02`）。
- [ ] 5 写文案：标题=判断句 takeaway（「X 三年涨 4 倍」非「X 趋势图」），不以问号结尾（金句页除外）。
  - **内容预算（变长不崩）**：标题守 per-layout 宽度预算、表格/列表页守行数预算（如 info-data `data-table` ≤5 数据行、`data-kpi` 恰 3；compute `evidence-wall` ≤4 卡、`decision-matrix` ≤6 行；constructivist `evidence` ≤4 卡、`compare` ≤8 点·`section-divider` 幕名最紧 ≤16 字）；超了**精炼标题 / 分页 / 提炼**，不靠版式硬扛（选了契约非缩放）——超预算 validator 报 **P1**（按 `[data-theme][layout]` 取预算）。数值见 `references/content-budgets.md`。
- [ ] 6 生成：**按人格选种子**（一 deck 一人格 · 7 选 1 不混 · 按步0 选定的人格取上表对应 `templates/deck-<key>.html`）。产单文件；令牌用 `00-tokens-locked.md` 对应 theme 区块；签名按该人格规范、**白标**（可见层不露内部代号 / 无 emoji）、隐蔽细节按 `references/04`。
  - **图像（决策树 · 见 `scripts/image-gen.mjs`）**：默认 **CSS/SVG 签名图形**（多数 deck 零位图·零依赖）。氛围/隐喻/hero 要位图时——先跑 `node scripts/image-gen.mjs detect` 探测生图环境：① 报 `codex-native` → 直接按名 try 调用原生 imagegen skill（try-and-catch·成功即用·抛错再降级）② 报 `third-party:<backend>` → `node scripts/image-gen.mjs generate "<prompt>" out.png`（env 门控·OpenAI v1）③ 报 `none` → **明确告知用户**「未检测到生图环境·可配 `IMAGE_BACKEND`+key / 或 `image-gen.mjs search "<query>" out.png` 取 Openverse CC0 开源图(自动署名进 SOURCES.md) / 或走 CSS·SVG」。AI 图每张过 **craft 三门**（主题匹配=配色 `--accent`+近黑/留文字位/风格=人格 DNA · 内容匹配 · 质量弱则重生）；**绝不静默塞通用图**（反 slop·宪法）。**不伪造**真实数据/logo/截图/人事（走图表+`示意`或向用户索要）。art-direction prompt 配方读 `references/03`。
- [ ] 6b **字体子集化**（答「任意用户内容如何 100% 覆盖」）：deck 含中文时跑 `BLCAPTAIN_FONT_SRC=<完整源目录> node scripts/subset-fonts.mjs <file>`——把全部 CJK 字重从**完整源字体**按 deck 实际可见用字子集化 → deck 专属 woff2（覆盖 by construction，不共享/不固定字符集）。完整源 setup（开发机一次性、OFL）见脚本缺源提示；纯拉丁可变轴 deck 自动跳过。
- [ ] 7 跑 validator：`node scripts/validate-deck.mjs <file>`，**P0=0 才交付**，修 P1，P2 列可选。
- [ ] 8 **32 维终极审计**：逐维过线、◐ 必修；再出审查报告（P0/P1/P2 + 处置）+ 封面文案，末行留「**敢不敢直接发出去/讲出去**」主观验收门。

**真实支流（80% 用户落在这三条，不止顺流）**：
- 流 B 信息不足 → 最多问 3 个（编号、留空走默认），问完即生成。
- 流 C 素材脏（最易触发伪造事故）→ 检测到截图，条件触发「看物三问」（想证明什么/保真还是标注/有无敏感信息打码）。
- 流 D 请求越界 → 拒绝 + 解释 + 给出路（不否定目标，只换实现路径：真实+标示意 > 伪造；自制 SVG 占位 > 假截图/假 logo；真实数据标来源 > 编造好看数字）。

## 图片业务流（按"角色"路由  · 不一刀切）
落版时**每个图 slot 先判角色**，再走对应通道：

| 角色 | 优先级链 | 铁律 |
|---|---|---|
| **证据/真实**（产品截图·真实数据·logo·真人真事） | ① 用户提供 → ② 向用户索要 → ③ 真实公开来源(标 license) → ④ **降级图表/纯排版** | **绝不 AI 伪造**；数据一律 chart-render；**用户截图按 `references/05-screenshot-framing.md` 零依赖 CSS 裱框（只裱不改内容·守反伪造）** |
| **氛围/隐喻/母题**（封面 hero·章节背景·插画·装饰·图标） | ① **CSS/SVG 签名图形**(多数 deck 默认·零依赖·风格=人格 DNA) → ② **AI 生图**(先 `image-gen.mjs detect` 探环境·codex-native try / 第三方 env 门控·主题匹配 craft 三门) → ③ **开源图库**(`image-gen.mjs search`·Openverse CC0·自动署名) | 反 slop 靠 craft·**绝不静默塞通用图** |

- **为何 CSS/SVG-first（对标校准）**：多数 deck 的"图"本质是签名图形（iso-compute 等高线/円相/构成红场/图表）→ CSS/SVG 程序化构造，零依赖零 license、风格=人格 DNA、永远可控。**默认生通用图 = 把差异化亲手抹平**（AI slop 是 2025 年度词·指纹="可与竞品互换"）。AI 生图是"必须真实世界位图"时的升级路（先探测环境）；stock 仅写实场景备选。
- **intake 触发**：内容暗示需要真实证据时，问一句"有没有要放的真实截图/数据?"，其余不打断（最少打断原则）。
- **治理**：`imageRequest`(搜索词+优先级+裁切/版权)；统一质感"套样式"(per 主题 duotone/色调)；`SOURCES.md` 记 source/license，未核证 `UNVERIFIED`；**封面缺图且无降级→报错**(不无图硬排)；AI 图带 provenance + `data-image-disposition`。
- **降级链**：AI 图 / 真实图 / stock → SVG → 纯排版/图表，皆合格终态。

> ⚠ **以下 SIGNAL 框架 + 14 版式白名单 + 硬约束以「技术崇高派(compute)」为范例详述**；其余 6 套各有自己的叙事框架 + 版式库 + 机检门（各人格的版式/门由 validator 全数覆盖·设计细节内嵌其 deck 模板）。选定人格后按其 deck 模板的版式/门来——但**反伪造、token only、内容驱动页数、白标、机检 P0=0、32 维审计** 这些是**全人格通用律**。

## SIGNAL 叙事框架（信号 → 行动 6 步链路 · 技术崇高派范例）
| 字母 | 含义 | 这一步回答 | 对应 data-role（布局） |
|---|---|---|---|
| S — State 态势 | 现在发生了什么 | 一句话抛出最重要的判断 | state（signal-cover） |
| I — Insight 洞察 | 别人没看到的角度 | 反常识点是什么 | insight（paradigm-shift / context-map） |
| G — Ground 立据 | 凭什么相信 | 三条事实/截图/指标 + 来源 | ground（evidence-wall / kpi-wall / timeline-impact / screenshot-intel） |
| N — Narrow 收窄 | 风险与边界在哪 | 哪些变量会让判断失效 | narrow（risk-radar / decision-matrix） |
| A — Act 行动 | 下一步做什么 | 判决 + 优先级 | act（final-move / opportunity） |
| L — Leave 余味 | 留下什么被记住 | 一句可截图的金句 | leave（social-card） |

标准 8 页战报序列：signal-cover → context-map → paradigm-shift → evidence-wall → timeline-impact → risk-radar → final-move → social-card。

## 语义布局白名单（共 14 个，validator 据此校验）
signal-cover · context-map · paradigm-shift · evidence-wall · timeline-impact · decision-matrix · risk-radar · opportunity · screenshot-intel · kpi-wall · final-move · social-card · **section-divider**（章节分隔/分幕）· **agenda**（目录/议程）
> validator 不只查「名字在不在白名单」，还查「整套 deck 是否至少各有一页 data-role=state/ground/act」（信号/证据/行动缺一不可）。详细布局规格见 `references/02-layout-library.md`。

## 页数与分章（不定死页数 · 内容驱动 · 长 deck 分幕）
**页数永远由内容决定，不写死**；流程支持用户自己定。三档：
| 页数 | 结构 | 要点 |
|---|---|---|
| **≤12（甜区，缺省 ~10）** | 单条 SIGNAL 弧、无分章 | 最锐利；多数战报/观察/路演落这里。**不灌水**——内容够 10 页就别凑 20 |
| **13–25** | **分章**：3–5 幕，每幕 = 1 张 `section-divider`（🔴 能量锚 + 签名等值场复现）+ 3–6 内容页；首部可加 `agenda` 目录 | SIGNAL 升为「**幕 → 页**」两级；同一弧把各阶段展开成多页（如 6 张 evidence-wall） |
| **>25** | 建议**拆成多份 deck**，或它本质是文档/报告（skill 不做） | 防 50 页幻灯地狱 |
- **何时征询用户**：内容体量含糊、或用户话里像要"详细/完整/长版" → 一句话问「~10 页精炼版，还是更详细的分章长版？」（默认精炼）。**用户明确给页数就照办**，不反问。
- 能量曲线随页数放大：`section-divider` 天然是 🔴 锚点，自动满足「禁连续≥4 克制页」；签名在每张分隔页复现 = 正好满足 R5「跨 5+ 触点」。
- 翻页/页码 `X / N` / 进度刻度 / 签名书挡 **已按 N 自适应**，不依赖固定页数。
- **人格无关**：步0 定页数 + 本节分章规则对**各套人格同样生效**。构成主义用 `section-divider`（红场分幕）当幕锚、9 版式（cover/statement/evidence/compare/kpi/process/final/social-card + 分幕）重复填幕；已实证 **20 页 3 幕分章 deck → P0=0 / 能量谱·连续同版式·字体覆盖全过**。≤12 单弧、13–25 分章、>25 拆，构成主义照走。

## 澄清策略（五看三定 · 何时提问，何时跳过）
- 信息充足（已给受众 + 核心判断）→ 跳过提问，用默认值补齐，直接生成。
- 信息不足 → 最多问 3 个高杠杆问题，明示「留空走默认」，问完即生成，不追问到底。
- 非问不可（最多 3 个）：Q1 看人（让谁、改变什么判断）｜Q2 看场（在哪看、要不要发社媒，决定能否单独截图）｜Q3 看物（条件触发，检测到截图：想证明什么、保真还是标注）。
- 绝不问：颜色 hex / 字体 / 布局编号 / 字号 / 间距——那是导演职责，由 token + 布局白名单兜底，问了反而暴露「你也不会设计」。

## 合理默认值（缺失即取默认，不打断用户；默认要好到 80% 不用改）
| 维度 | 默认值 |
|---|---|
| 风格（data-theme） | `instrument-cool`（compute 人格的 theme 键） |
| 主题色（data-accent） | **intake 提醒用户选**；缺省 night-cyan(`#3FD6C2`)；按场景：产品发布→deep-blue(`#3D7BFF`)、风险复盘→safety-amber(`#FF8A3D`)。一份 deck 一种主基调 |
| 页数 | **由内容定、不定死**；缺省甜区 ~10 页(8–12)、不宜过多；用户指定则照办；13–25 页自动分章（`section-divider` 分幕）；>25 建议拆 deck 或它本质是文档（超范围） |
| 比例 | 16:9（1280×720 画板） |
| 字体 | 西文/数字 Geist Sans + Geist Mono；**中文 Glow Sans SC**（OFL·本地 woff2·Latin-first 栈）；共「无衬线+等宽+中文黑体」 |
| 字重 | 纤细 **Regular 400**（hero/标题/正文统一的修长 house style；旧 `--w-title:510` 已废） |
| 签名 | iso-compute 等值场：封面 hero + 收尾书挡 + wordmark 微章 |
| 封面 | hybrid：默认(青) AI hero 图 + 双层遮罩 + 标题投影；蓝/琥珀 可染色 SVG 等值场（须 preload 防加载滞后） |
| 锚点色 | 单信号色（accent ≤10%，只点一处需要被读到的地方） |
| 圆角 | 0px（全系直角） |
| 渐变 | 无（纯暗场冷光，首发禁签名渐变） |
| 受众 | 行业内中高级读者，有背景知识，看 2-3 分钟 |
| 封面文案 | 从核心判断抽 12-18 字判断句，不用产品名 |
| 数据真实性 | 无数据则不编造，标「示意/观察/推测」+ `data-evidence-type` |

## 读文件顺序（渐进披露 · 按需读 references，不必一次全读）
**7 套 deck 种子**（`templates/deck-{compute,constructivist,info-data,luxury,de-stijl,editorial,zen}.html`）各把 tokens、布局、签名、翻页 JS、打印 CSS 全部 inline；旗舰参考 `deck-compute.html`。按需精读以下引用层：
- **令牌唯一真值（粘贴用）** → 读 `references/00-tokens-locked.md`（design tokens + WCAG 实测对比度 + 字体安装/回退；TOKENS 区块直接粘进 deck）。
- 看视觉 DNA（技术崇高人格如何成立、how + why）→ 读 `references/01-instrument-cool-dna.md`。
- 看布局怎么写（叙事功能/必备字段/视觉规则/data-layout 名）→ 读 `references/02-layout-library.md`。
- 处理图像/做封面 wow（数据即图 / sRGB duotone / grain 仅封面氛围 / 不造假图源）→ 读 `references/03-art-direction.md`。
- 图表系统（数据图渲染配方 / chart-render 用法）→ 读 `references/05-chart-system.md`。
- **用户截图裱框**（零依赖 CSS·per-人格·只裱不改内容·守反伪造）→ 读 `references/05-screenshot-framing.md`。
- 内容预算（变长不崩的 per-layout 预算值）→ 读 `references/content-budgets.md`。
- 收尾自检隐蔽细节（tabular / 三档明度 / 真乘号 / 负字距 / 微动效 / reduced-motion）→ 读 `references/04-hidden-details.md`。
- 活体范例（7 套 · 均 20 页）→ `templates/deck-<key>.html`（见上「7 人格」表）；例稿见 `examples/`。
- **生图环境探测/降级**（codex-native try / 第三方 env 门控 / Openverse CC0 / SVG 兜底）→ 执行 `scripts/image-gen.mjs detect|generate|search`（不要把脚本当参考读入上下文）。
- 自检规则 → 执行 `scripts/validate-deck.mjs`（不要把脚本当参考读入上下文）。
- 内容摄取（URL/文件/粘贴 → 干净正文·喂步1·不绕墙·不伪造来源）→ 执行 `scripts/ingest.mjs <src>`。
- 评测/边界用例 → 读 `evals/prompts.csv`。

## 校验（必须执行，不要只读）
执行（代码不进上下文）：`node scripts/validate-deck.mjs path/to/deck.html`
默认输出 JSON：`{file, slides, status, summary:{p0,p1,p2}, issues, next_actions}`。P0 必须为 0 才能交付；失败 → 按 issues 修复 → 重跑，直到 p0=0（进程退出码 0）。

## 硬约束（关键，进 validator 或生成纪律）
**P0（红线 · 阻断交付）**
- 每页必须有 `data-layout`（在 14 项语义白名单内）。
- 整套 deck 必须至少各有一页 `data-role=state`、`ground`、`act`（信号/证据/行动缺一不可）。
  - 豁免：整套 deck 仅 1 页且布局为 social-card 时跳过三角色必检（validator 已内置）。
- 颜色只能用 token（`var(--…)`），TOKENS 区块外不得出现裸 hex。
- 每个证据块的 `data-evidence-type` 取值须合法（`fact/observation/inference/illustrative`）；非法取值即 P0。
- 强调色可读性死区：`--accent` 对 `--bg/--surface/--surface-2` 任一对比 < 3.0:1（WCAG 大字阈值）即 P0（拦「酸色压到不可读」）。
- **白标**：可见文本（`<title>`/页脚/署名/任何 credit）不得出现 `blcaptain`/`技术崇高派`/`instrument-cool` 等内部代号；署名 = 用户提供或留空。
- **字体覆盖**：deck 每个可见 CJK 字必在打包字体 cmap（生成时按内容子集，见步 6b）；任一字缺即 P0——否则必静默回退系统字、观感崩（铁律⑤  · validator 零依赖解 woff2 cmap 自动机检）。

**P1（应修 · 建议交付前修）**
- 每页须有 `.intel-stamp`（情报戳，视觉签名指纹 1）；social-card 豁免，改用 `.social-mark` 签名条。
- 用到 `.kpi-slot` 的 deck，其 KPI 数字须带 `tabular-nums`（`.kpi-slot` 或 `.kpi-num` 上声明 `font-variant-numeric:tabular-nums`，机检公理 4）。
- 字体族 ≤ 2 正文/无衬线族 + 1 mono 信号层 = 3（技术崇高 实际只用 Geist Sans + Geist Mono = 2）。
- 不得连续 3 页同一 `data-layout`（能量起伏）。
- 数据图/大数字读数页须带来源或「示意」标注（不造假红线）。
- 图片须放进 `figure[data-slot]` 且带合法 `data-ratio`（16:9/4:3/1:1/3:4/9:16）；`img` 须有非空 `alt`。
- 立据类布局（evidence-wall/kpi-wall/screenshot-intel）的 `.card` 须声明 `data-evidence-type`。

**P2（可选优化 · 不阻断）**
- 字数密度按 `data-scene` 分档（social≈60 / report≈150 / deck≈120，缺省 120）。
- 标题「判断句」启发式：以问号结尾且非金句页 → 告警。

## 三个视觉签名指纹（隐蔽细节，内行一眼识货；详见 references/04）
1. 情报戳（`.intel-stamp`）：每页右下角固定坐标的 mono 信息条，`场景代码 · 日期 · 页码/总页`，像技术文档 colophon。
2. 刻度槽数字：所有 KPI/表格数字 `font-variant-numeric:tabular-nums lining-nums`，小数点对齐成竖线（性价比最高的内行信号）。
3. 证据分级标签（`.chip`）：每个证据块声明事实/观察/推测/示意；illustrative 用 `--illus` 专色提醒别当真。

## 节奏（能量靠起伏，音量按场景，不预设炸）
- 「炸」不是硬要求。说服力来自能量的**起伏**，不是持续高能、也不是全程平淡——该静则静到极致，该响才响，由受众与场景决定（Duarte 张力曲线：在 what is ↔ what could be 之间制造张力）。
- 🔴 炸页（封面/章节/金句/数据 hero）：单主元素占屏 ≥50%、信息单元 = 1、字号顶到 hero 级、accent 敢点关键词。
- 🟡 半炸页（范式转移/机会窗口）：有强对比但不霸屏。
- ⚪ 克制页（内容页）：无霸屏元素（最大 ≤30%）、信息单元 3–6 个但每个克制、hairline 分隔、accent ≤10%。
- 铁律：炸页之间总隔着克制页，没有两个炸页相邻（封面与社媒卡这种合法首尾除外）。标准 8 页能量曲线像 🔴⚪🟡⚪🔴⚪🟡🔴；连续 ≥4 页克制 = 缺节奏断点。
- 技术崇高的炸是「克制的炸」：KPI hero 数字在刻度槽里占屏过半、单点信号青只点亮越阈值那一格、零造假数据；accent 仍 ≤10%，绝不堆假 dashboard。

## 不要使用本技能
- 大表格、大段培训教材；法律/医疗/金融等需专业审核的严肃文件。
- 需要多人协作编辑的传统 PPT；用户只要纯文本摘要。
- 要求复刻某品牌官方发布会视觉；要求编造看起来真实的数据。

## 首发不做（诚实告知，临时绕路）
PPTX/PDF 精确导出（用浏览器 Ctrl+P 出 PDF，精确 16:9 需手动设纸张 1280×720/边距 0/勾选背景图形）、在线编辑、用户登录、复杂动画库。**原生可编辑 PPTX 导出在 Roadmap**（企业「在 PowerPoint 改字」场景·见 README）。
