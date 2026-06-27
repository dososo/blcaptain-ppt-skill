# 02 · 技术崇高 `instrument-cool` 布局库

> 规范来源：设计系统规范 布局模板库 /  呼吸 / SKILL.md 语义白名单。本库是技术崇高人格的布局集合。
> 每个布局给：叙事功能（SIGNAL 角色）+ 必备字段 + 视觉规则 + `data-layout` 名（validator 据此校验）。
> 铁律：每页必须有 `data-layout`（在白名单内）+ `data-role`；每页须有 `.intel-stamp`；颜色只用 `var(--…)`。

---

## 语义白名单（validator `LAYOUT_WHITELIST`，共 14 个）

`signal-cover · context-map · paradigm-shift · evidence-wall · timeline-impact · decision-matrix · risk-radar · opportunity · screenshot-intel · kpi-wall · final-move · social-card`

> 本文件详述 8 种核心版式：`signal-cover` / `context-map` / `evidence-wall` / `kpi-wall`（即「数据 hero / KPI 墙」）/ `timeline-impact` / `risk-radar` / `final-move` / `social-card`。其余 4 个（paradigm-shift / decision-matrix / opportunity / screenshot-intel）仍在白名单内可用，写法参照最接近的本表布局。

## SIGNAL 叙事链路 → data-role 映射

| 字母 | 角色 data-role | 这一步回答 | 对应布局 |
|---|---|---|---|
| S — State 态势 | `state` | 一句话抛出最重要的判断 | signal-cover |
| I — Insight 洞察 | `insight` | 反常识点是什么 | paradigm-shift |
| G — Ground 立据 | `ground` | 凭什么相信 | evidence-wall / kpi-wall / timeline-impact / screenshot-intel |
| N — Narrow 收窄 | `narrow` | 哪些变量会让判断失效 | risk-radar |
| A — Act 行动 | `act` | 下一步做什么 | final-move |
| L — Leave 余味 | `leave` | 一句可截图的金句 | social-card |

> 硬约束：整套 deck 必须至少各有一页 `data-role=state`、`ground`、`act`（信号/证据/行动缺一不可）。单页 social-card 长图豁免此三角色必检。

标准 8 页战报序列：`signal-cover → context-map → paradigm-shift → evidence-wall → timeline-impact → risk-radar → final-move → social-card`。能量谱 🔴⚪🟡⚪🔴⚪🟡🔴（炸—平—半—平—炸—平—半—炸，炸页之间总隔克制页）。

---

## 1 · signal-cover（封面 / 信号）

- **`data-layout`**：`signal-cover`　**`data-role`**：`state`　**能量**：🔴 炸页
- **叙事功能**：一句话抛出全篇最重要的判断（S 态势）。封面是传播物不是第一页。
- **必备字段**：信号 mono 小标签（如 `SIGNAL · 周战报`）｜核心判断句（12–18 字，判断句不用产品名）｜一行灰导语（可选）｜`.intel-stamp`（`场景代码 · 日期 · 01/总页`）｜`data-cover-paradigm`（命中封面 8 范式之一，A 主力 2 单一大数字 / 6 结构图）。
- **视觉规则**：单主元素占屏 ≥50%，信息单元 = 1；判断句 weight 300、负字距 `var(--ls-hero)`；accent 只点判断句关键词（≤10%）；深石墨满屏，无装饰/无渐变/无图；mono 标签正字距 `+0.08em`。

## 2 · context-map（语境 / 议程）

- **`data-layout`**：`context-map`　**`data-role`**：`insight`（或 `ground`）　**能量**：⚪ 克制页
- **叙事功能**：封面之后立刻降能量，给「what is（现状）」——把读者放进语境，建立判断的背景坐标。
- **必备字段**：小节标题（判断句或主题词）｜2–4 个语境单元（每个一句话 + 可选 mono 编号 `№01`）｜hairline 分隔｜`.intel-stamp`。
- **视觉规则**：无霸屏元素，最大 ≤30%；信息单元 3–6 个但每个克制；图文分栏走黄金比 5:7 而非五五对切；单元间靠 gutter/hairline 分隔不画粗竖线；标题 ≤`--fs-h2`，正文 `--fs-body`。

## 3 · evidence-wall（证据墙 / 立据）

- **`data-layout`**：`evidence-wall`　**`data-role`**：`ground`　**能量**：⚪ 克制页
- **叙事功能**：凭什么相信（G 立据）——三条事实/截图/指标 + 来源，每条声明证据等级。
- **必备字段**：3–4 张 `.card`，每张**必带** `data-evidence-type ∈ {fact / observation / inference / illustrative}`｜每卡一句结论 + 出处/口径｜`illustrative`（示意）渲染「示意」chip 用 `--illus` 提醒别当真｜`.intel-stamp`。
- **视觉规则**：2×2 / 2×3 模块矩阵，无卡片背景，hairline + 留白分区；数字一律 `font-variant-numeric:tabular-nums lining-nums`，纵向小数点对齐成竖线；禁三个带图标盒子、禁 emoji 当项目符；accent ≤10%。

## 4 · kpi-wall（数据 hero / KPI 墙 / 立据）

- **`data-layout`**：`kpi-wall`　**`data-role`**：`ground`　**能量**：🔴 数据 hero 可炸 / ⚪ KPI 墙克制
- **叙事功能**：用真实数字立据或制造单点爆点（数据即图）。A 的签名战场。
- **必备字段**：KPI 数字（真实数据，无来源标「示意」并 `data-evidence-type="illustrative"`）｜单位/前缀（降一级）｜刻度槽 `.kpi-slot`（hairline 刻度尺 + 单点 accent 高亮当前读数/越阈值）｜`.intel-stamp`。
- **视觉规则**：
  - 数据 hero（🔴）：大数字左对齐偏左不正中，`clamp(64px,12vw,160px)` weight 300（大字配细），单主元素 ≥50%、信息单元 = 1。
  - KPI 墙（⚪）：2×2 / 2×3 矩阵，每格数字底基线对齐，可挂 word-sized sparkline。
  - 共用：`.kpi-slot` 必带 `tabular-nums`；刻度尺用固定 token 宽度 hairline；accent 只点亮一格，面积 ≤10%；绝不堆假 dashboard（装饰不许伪装功能）。

## 5 · timeline-impact（时间线 / 立据）

- **`data-layout`**：`timeline-impact`　**`data-role`**：`ground`　**能量**：⚪ 克制页
- **叙事功能**：把一段时间内的事件/影响按真实节奏铺开（G 立据的时间维度）。
- **必备字段**：横向单轴｜每节点 = 时间标 + 一句事件 + 可选影响量（数字 tabular）｜`.intel-stamp`。
- **视觉规则**：节点吸附栏线，hairline 不用粗箭头；**节点间距按真实时间比例而非均分**（均分会误导）；时间标 mono，可 accent 点一个关键转折节点（≤10%）；无卡片背景。

## 6 · risk-radar（风险雷达 / 收窄）

- **`data-layout`**：`risk-radar`　**`data-role`**：`narrow`　**能量**：⚪ 克制页（第二次张力）
- **叙事功能**：哪些变量会让判断失效（N 收窄）——风险与边界，接受优先级。
- **必备字段**：3–5 条风险项｜每条 = 风险描述 + 等级/概率 + 可选 `data-evidence-type`｜`.intel-stamp`。
- **视觉规则**：对比/2×2 可用「左灰（现状降噪）右点强调（重点高亮）」制造张力（Duarte「what is ↔ what could be」）；风险等级用 `--warn`/`--danger` 语义色点睛，不抢 accent；hairline 分区；无发光/无辉光。

## 7 · final-move（行动 / 收束）

- **`data-layout`**：`final-move`　**`data-role`**：`act`　**能量**：🔴 炸页（能量回峰收尾）
- **叙事功能**：下一步做什么（A 行动）——判决 + 优先级，能量回到峰值收尾不虎头蛇尾。
- **必备字段**：一句判决（判断句）｜1–3 条优先级行动（可编号）｜`.intel-stamp`｜禁「谢谢观看」空页。
- **视觉规则**：金句式收束，单主元素 ≥50%、信息单元 = 1；判决句顶到 hero 级字号、weight 300；accent 点判决关键词 ≤10%；优先级用 hairline 列表不用粗箭头。

## 8 · social-card（社媒金句卡 / 余味）

- **`data-layout`**：`social-card`　**`data-role`**：`leave`　**能量**：🔴 炸页（独立传播物）
- **叙事功能**：留下一句可截图的金句（L 余味）。独立设计 ≠ 第一页缩小。
- **必备字段**：金句钩子（8–16 字）｜可选品牌小标识/账号脸元素｜签名条 `.social-mark`（左下角 mono `品牌 · 风格 · 页码`，替代情报戳）｜每页能单独截图。
  > 情报戳豁免：social-card 是独立传播物，用 `.social-mark` 承担签名条，**不要求 `.intel-stamp`**。validator `STAMP_EXEMPT_LAYOUTS` 已豁免 social-card，不报 `missing-intel-stamp`。
- **视觉规则**：3:4 竖版（小红书）或 21:9（公众号）；标题可用问号（QUOTE_LAYOUTS 豁免判断句启发式）；金句左对齐挂黄金位（约高 38%），引号悬挂版心外，行距 1.1–1.2，一页一句 ≤20 字；满图/大字范式；单页 social-card 豁免 state/ground/act 三角色必检。

---

## 图片 slot 规则（凡布局含图）

- 图片必须放进 `figure[data-slot]`，带合法 `data-ratio ∈ {16:9 / 4:3 / 1:1 / 3:4 / 9:16}`，`img` 须有非空 `alt`。
- 图片是证据不是装饰；无来源数字标「示意」+ `data-evidence-type="illustrative"`。
- 占位图用自制 SVG 并注明非真实素材；不伪造 logo/UI/截图。

## 跨布局硬约束速记

- 不得连续 3 页同一 `data-layout`（validator `MAX_SAME_LAYOUT_RUN=2`）。
- 标题须为判断句、不得以问号结尾（social-card 豁免）。
- 每页 `.intel-stamp`；每个证据块声明 `data-evidence-type`。
- 炸页判据：主元素 ≥50% 且信息单元 = 1，否则降级；连续 ≥4 页克制 → 缺节奏断点；两炸页相邻（非合法首尾）→ 能量过载。
