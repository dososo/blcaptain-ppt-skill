# 05 · 图表系统 ChartSpec（AI 只产 JSON → 锁定渲染层画 SVG）

> 规范来源：工程规范（图表方法论：JSON 契约 + 锁定渲染层 + 白名单 + 去 chartjunk）；主题真值 `references/00-tokens-locked.md`。
> 实现：`scripts/chart-render.mjs`，零依赖 ES module，导出 `renderChart(spec, opts?) -> svgString`。自测：`node scripts/chart-render.mjs --selftest`。
> **铁律**：定量图（柱/横条/折线/面积/KPI/sparkline）**禁止 AI 直接手写 `<svg>` 坐标**。AI 只产 ChartSpec(JSON)，交锁定渲染层产出内联 SVG（带签名 `data-rendered-by="blcaptain-chart"`）。仅非定量示意图（flow/diagram，P1）允许手写 SVG 且须标 illustrative。

---

## 0 · 为什么是这套架构（一句话）

LLM **强在语义/结构**（「这是柱状图、A=48、B=81、高亮 B、标题写结论」），**弱在几何**（「B 柱 y=137.4 height=288.6」）。让它盲画 SVG 坐标 = 必然图烂（路径不闭合、比例失真、非零基线欺骗）。
**正确做法**：把「数据→像素坐标」交给确定性渲染器（自研 `scaleLinear`，对标 FT 用 D3 scale、Pudding/NYT 用 Datawrapper）。最终产物仍是内联 SVG，但是「**算出来的**」不是「**写出来的**」。

```
AI 产出 ──► ChartSpec(JSON) ──► renderChart() 锁定渲染层 ──► 内联 <svg>（带签名）
（语义层）   {type,title,unit,      · 自研 scaleLinear（坐标不靠估）        · data-rendered-by="blcaptain-chart"
            series,source,note}    · Y 轴强制从 0 / 去 chartjunk 写死在函数  · data-chart-type="bar|hbar|…"
```

---

## 1 · 11 种核心图（白名单，）

> 首发 6 种（量级 / 排名 / 时序）+ 扩建 5 种（部分整体 / 相关 / 偏差 / 路演转化）= 11 种，覆盖 FT「视觉词汇」主干。
> 每种都内建：单信号 `--accent` 只高亮关键一项、其余降灰（Tufte 擦除）；强调项克制辉光；tabular 数字直标；hairline 轴；圆角 0；`sRGB`；`data-rendered-by` 签名。

### 1.1 首发 6 种

| type | 意图（FT 族） | 何时用 | 数据形态 | 渲染层写死的硬约束 |
|---|---|---|---|---|
| `bar` | Magnitude / Ranking | **≤8 类**量级对比 | `series[0].data = [{label,value}]` | **Y 轴强制从 0**；强调色只 1 根（默认自动高亮最大值）；类目 >8 应改 hbar |
| `hbar` | Ranking | 类目多 / 标签长 | 同 bar | **按值降序**；标签左对齐贴条首；数值直标条尾；起点 0 |
| `line` | Change over Time | 趋势 / 时序 | `series=[{name,emphasis?,data:[{x,y}]}]` | **线尾直标系列名（禁独立图例）**；多系列只 1 主角系列用 accent；节点按真实 x 比例（日期可解析）；首发统一从 0 |
| `area` | Change over Time / Part-to-whole | 累积 / 占比随时间 | 同 line | **强制从 0**；堆叠 ≤4 层；填充用 `--accent-dim`（禁渐变填充） |
| `kpi` | Magnitude | 一个数字独占页 | `data:{value,unit,delta?,takeaway,spark?}` | 数字 `clamp(64,…,160)` **weight 300 偏左非居中**；单位降一级；tabular-nums；可挂内嵌 sparkline；正 delta 用 accent / 负用 danger |
| `sparkline` | Change over Time（word-sized） | 嵌 KPI 墙 / 文内 | `series[0].data=[y0,y1,…]`（裸数组亦可） | **无轴无坐标无图例**；高亮末点 accent |

### 1.2 扩建 5 种

| type | 意图（FT 族） | 何时用 | 数据形态 | 渲染层写死的硬约束 |
|---|---|---|---|---|
| `donut` | **Part-to-whole**（部分整体） | 单一占比/构成，强调「关键一块占多少」 | `data=[{label,value}]`（或 `series[0].data`），**≤6 扇区** | 一个强调扇区 accent+辉光、其余灰阶；**中心洞内放强调项占比大数字**；**直标各扇区标签+百分比，禁独立图例**；从 12 点钟顺时针 |
| `stacked-bar` | **Part-to-whole over categories**（部分整体随类目） | 构成如何随类目/时间变化（每类总量＋内部拆分） | `series=[{name,emphasis?,data:[{label,value}]}]`，**每柱 ≤5 段** | **Y 从 0**；强调段 accent+辉光、其余按明度灰阶；**顶部标总计**；强调段段内直标值；x 类目标签；系列名右上直标（禁图例） |
| `scatter` | **Correlation**（相关） | 两变量相关/分布，点出一个关键样本 | `series=[{name,data:[{x,y,label?,emphasis?}]}]` | 点用 circle；强调点 accent+辉光、其余灰；**x/y 各一条 hairline 轴 + 起止刻度**（数值域留 ~8% 余量）；强调点直标；**缺坐标的点自动跳过**（防 NaN） |
| `diverging-bar` | **Deviation**（偏差） | 围绕基准 0 的正负偏差（同比增减、达成/缺口） | `data=[{label,value}]`（value 可正可负） | **0 为中心竖直 hairline 轴**；正值向右、负值向左；**正向 accent（强调项辉光）、负向 danger 语义色**；**按值降序**；标签贴条内侧、带符号数值直标外端 |
| `funnel` | **Conversion**（路演转化/管道） | 阶段转化漏斗（注册→付费、线索→成单） | `data=[{label,value}]`（按流程顺序，**≤6 阶段，不排序**） | 各阶段从上到下递减的**居中梯形**；强调某阶段 accent+辉光、其余灰；**每阶段直标 名称+值+相对首阶段转化率%**；**禁 3D** |

> **仍不实现**（传入被渲染层拒绝，抛错）：`sankey`/`chord`（复杂流向关系）、`treemap`（嵌套占比）、`map`（地理）、`flow`/`diagram`（非定量示意，唯一允许手写 SVG 处，须标 illustrative）。
> **永久黑名单**（，渲染层主动拒）：3D 任意图 / 双轴图 / 彩虹色阶 / >3 块或并排饼 / 截断 Y 轴柱图。spec 带 `threeD/dualAxis` 或 `bar/hbar/area/stacked-bar` 的 `encoding.y.zeroBaseline:false` → 直接抛错。

---

## 2 · ChartSpec JSON Schema（字段全集）

```jsonc
{
  // —— 必填 ——
  // ∈ 11 种白名单，否则渲染层拒
  "type": "bar | hbar | line | area | kpi | sparkline | donut | stacked-bar | scatter | diverging-bar | funnel",

  // —— 强烈建议（数据诚实/可读性）——
  "title": "结论句（含动词或数字），非名词短语",   // 「标题即结论」；过长会自动折行（禁静默截断）
  "unit":  "%",                                    // 单位，渲染在标题下方降一级
  "source": "数据来源 + 口径",                      // 定量图必填；缺则自动标「示意」+ data-illustrative
  "note":   "补充注解（可选）",                      // 与 source 同条贴底

  // —— 数据（二选一写法）——
  // 写法 A（多系列，line/area 用）：
  "series": [
    {
      "name": "Agent PR 占比",      // 线尾直标用（禁图例）
      "emphasis": true,            // 主角系列 → accent；其余 → ink-dim 降灰（只许 1 个 true）
      "data": [ {"x":"2024-01","y":4}, {"x":"2025-07","y":26} ]
    }
  ],
  // 写法 B（单系列糖，bar/hbar 常用）：
  "data": [ {"label":"2025","value":81,"emphasis":true} ],   // 等价于 series:[{data:[…]}]

  // —— kpi 专用（type:"kpi" 时）——
  "data": { "value":62, "unit":"%", "delta":18, "takeaway":"不是消失，是岗位定义被改写", "spark":[40,49,58,62] },

  // —— 可选：证据分级（对齐 deck 的 data-evidence-type）——
  "evidenceType": "fact | observation | inference | illustrative",

  // —— 可选：显式编码（高级用法）——
  "encoding": { "y": { "zeroBaseline": true } }   // bar/hbar/area/stacked-bar 不可为 false（会被拒）
}
```

### 字段语义速查

| 字段 | 类型 | 说明 |
|---|---|---|
| `type` | string | 图表类型，∈ 11 种白名单。**唯一必填**。 |
| `title` | string | 结论句。渲染在顶部，按画板宽**自动折行 + 自动降字号**（h3→lead→body），绝不截断。 |
| `unit` | string | 单位，标题下方 mono 降一级显示。 |
| `series[]` | array | 系列数组。每项 `{name, emphasis?, data[]}`。 |
| `series[].name` | string | 系列名，line/area 在线尾直标（代替图例）。 |
| `series[].emphasis` | bool | 是否主角系列。**全局只许 1 个**（多标自动收敛到第一个）。 |
| `series[].data[]` | array | 数据点。类目图 `{label,value}`；时序图 `{x,y}`；可带点级 `emphasis`（bar/hbar 用）。 |
| `data` | array \| object | 单系列糖（数组）或 KPI 载荷（对象）。 |
| `source` | string | 数据来源。**定量图缺它 → 自动标「示意」**（不造假铁律）。 |
| `note` | string | 补充注解。 |
| `evidenceType` | string | `fact/observation/inference/illustrative`，与 deck `data-evidence-type` 同口径。 |

### `renderChart` 调用

```js
import { renderChart } from "../scripts/chart-render.mjs";
const svg = renderChart(spec, { width: 720, height: 420 });   // 默认 720×420，尺寸自适应
// opts.labelMode:
//   'svg'  （默认）→ 返回自包含 svgString（node/浏览器都能独立成图）
//   'html' → 返回 {svg, html}，供 deck 内「SVG 几何 + HTML 文字叠层」B2 合规路径
```

---

## 3 · 数据形态示例（每种图一个最小可跑 spec）

```jsonc
// bar — 类目量级对比（最大值自动高亮）
{ "type":"bar", "title":"单测通过率从 48% 拉到 81%", "unit":"%",
  "data":[{"label":"2023","value":48},{"label":"2025","value":81,"emphasis":true}], "source":"示意" }

// hbar — 排名（自动按值降序）
{ "type":"hbar", "title":"Cursor 周活领跑", "unit":"万 DAU",
  "data":[{"label":"Cursor","value":120,"emphasis":true},{"label":"Copilot","value":95}], "source":"示意" }

// line — 多系列时序（线尾直标，1 主角）
{ "type":"line", "title":"Agent PR 占比 18 个月翻 6 倍", "unit":"%",
  "series":[
    {"name":"Agent PR 占比","emphasis":true,"data":[{"x":"2024-01","y":4},{"x":"2025-07","y":26}]},
    {"name":"人工 review 占比","data":[{"x":"2024-01","y":96},{"x":"2025-07","y":74}]}
  ], "source":"示意" }

// area — 累积（强制从 0）
{ "type":"area", "title":"AI 生成代码累计破 10 亿行", "unit":"亿行",
  "series":[{"name":"累计","emphasis":true,"data":[{"x":"2023","y":0.6},{"x":"2026","y":10.4}]}], "source":"示意" }

// kpi — 单指标独占（可挂 sparkline）
{ "type":"kpi", "title":"初级岗任务可被 agent 接管比例",
  "data":{"value":62,"unit":"%","delta":18,"takeaway":"不是消失，是岗位定义被改写","spark":[40,49,58,62]},
  "source":"示意" }

// sparkline — word-sized（裸数组）
{ "type":"sparkline", "series":[{"data":[12,15,14,19,23,28,31]}] }

// donut — 部分整体（≤6 扇区，中心洞放强调占比，直标无图例）
{ "type":"donut", "title":"agent 自动执行占用时 58%", "unit":"%",
  "data":[{"label":"Agent 自动执行","value":58,"emphasis":true},{"label":"人工补写","value":22},
          {"label":"Review 修改","value":13},{"label":"调试","value":7}], "source":"示意" }

// stacked-bar — 部分整体随类目（每柱 ≤5 段，Y 从 0，顶部标总计）
{ "type":"stacked-bar", "title":"Agent 工时逐季扩大、人工收缩", "unit":"万工时",
  "series":[
    {"name":"Agent 自动","emphasis":true,"data":[{"label":"2024Q1","value":8},{"label":"2025Q3","value":38}]},
    {"name":"人工编写","data":[{"label":"2024Q1","value":42},{"label":"2025Q3","value":25}]}
  ], "source":"示意" }

// scatter — 相关（x/y 双 hairline 轴，强调一个关键点）
{ "type":"scatter", "title":"模型越大、单测通过率越高",
  "series":[{"name":"模型","data":[
    {"x":7,"y":41,"label":"7B"},{"x":70,"y":71,"label":"70B"},
    {"x":175,"y":84,"label":"175B","emphasis":true}]}],
  "source":"示意（横轴=参数量 B，纵轴=pass@1 %）" }

// diverging-bar — 偏差（0 中心轴，正向 accent / 负向 danger，按值降序）
{ "type":"diverging-bar", "title":"各环节工时同比增减", "unit":"%",
  "data":[{"label":"编码实现","value":34,"emphasis":true},{"label":"文档","value":9},
          {"label":"手动测试","value":-18},{"label":"调试排错","value":-27}], "source":"示意" }

// funnel — 路演转化（≤6 阶段按流程顺序，标转化率%，强调终点）
{ "type":"funnel", "title":"注册→付费转化仅 9%", "unit":"人",
  "data":[{"label":"注册","value":10000},{"label":"激活","value":6200},
          {"label":"试用 Agent","value":3100},{"label":"付费","value":900,"emphasis":true}], "source":"示意" }
```

---

## 4 · 去 chartjunk 规则（渲染层已内建， B）

渲染层从源头保证以下，AI **无需操心**（也无法违反，因为它只产 JSON）：

- **无背景网格噪音**：不画背景填充矩形、不画密集网格线；只留 0 基线 + 起止两档刻度的 hairline。
- **无 3D / 无伪深度 / 无渐变数据填充**（B3）：面积填充用纯 `--accent-dim` 低不透明度，不用 `linearGradient`。
- **无冗余图例**：多系列折线**线尾直标系列名**（FT/NYT 做法），不画图例方块（A6）。
- **能直标就直标**：柱顶/条尾/线尾直接标数值与名称。
- **单信号色 = 擦除（Tufte）**：每图**只有 1 个主角**用 `--accent`，其余一律 `--ink-dim` 降灰；让读者一眼锁定重点（Knaflic 前注意）。
- **hairline 坐标轴**（B5）：轴线 `stroke-width ≤1`，半透明前景色随底色呼吸。
- **tabular 数字**（B7）：所有数值标签 `font-variant-numeric:tabular-nums lining-nums`，小数点对齐成竖线。
- **圆角 0 / 无投影 / 无外边框**（决策④ / B3）：仪表台直角气质。
- **坐标 ≤2 位小数**（B4）；**`color-interpolation-filters="sRGB"`**（令牌铁律）。
- **签名**（B1）：每个 SVG 带 `data-rendered-by="blcaptain-chart"` + `data-chart-type`，供 validator 识别「非手画」。

> **主题色注入**（，全部来自 `00-tokens-locked.md`，渲染层用 `var(--token, fallback)` 双保险，离线 SSR 也出正确色）：主数据系列 `--accent`（≤10% 面积）；背景系列 `--ink-dim`；轴线 `--hairline`；阈值线 `--danger` 虚线；KPI 数字 weight 300；间距吸附 `{8,16,24,32,48,64,80,96,160}`；中文折行行高 1.6（决策④）。

---

## 4b · 配色方案集（4 套，每套单信号，按场景选）

整套图表系统是**单信号**的：每图只有一个主角用 `--accent`，其余降灰。换主题**只需改 3 个变量**（`--accent` / `--accent-dim` / `--accent-glow`），其余（底色 / ink / hairline / danger 语义色）全部继承不动。4 套 accent 均在暗底 `#11161B` 上经 WCAG 验证（对比度远超 AA 4.5:1），辉光取 accent @ ~.5、降级面用 accent @ .14。

| 方案 | accent 名 / hex | 对比度（vs `#11161B`） | 适用场景 | `--accent-dim`（@.14） | `--accent-glow`（@~.5） |
|---|---|---|---|---|---|
| **A** | 信号青 `#3FD6C2` | **10.06:1** | 科技 / AI / 数据（默认） | `rgba(63,214,194,.14)` | `rgba(63,214,194,.55)` |
| **B** | 长春花蓝 `#7C9CFF` | **6.98:1** | 企业 / 金融 | `rgba(124,156,255,.14)` | `rgba(124,156,255,.5)` |
| **C** | 信号琥珀 `#F2B23E` | **9.71:1** | 能源 / 风险 / 汽车 | `rgba(242,178,62,.14)` | `rgba(242,178,62,.5)` |
| **D** | 品红紫 `#C77DFF` | **6.76:1** | 品牌 / 创意 | `rgba(199,125,255,.14)` | `rgba(199,125,255,.5)` |

> 切换示例（只改这 3 个变量，挂到 `:root` 或图表容器即可，其余继承）：
>
> ```css
> /* D · 品红紫（品牌 / 创意） */
> :root{
>   --accent:      #C77DFF;
>   --accent-dim:  rgba(199,125,255,.14);
>   --accent-glow: rgba(199,125,255,.5);
> }
> ```
>
> 渲染层颜色一律走 `var(--accent, …)`（含 fallback），故**纯 node/离线 SSR** 默认吃 技术崇高 fallback；浏览器内只要 `:root` 覆盖上述 3 个变量即整套换肤。`--accent-dim`（面积填充 / 低强度面）与 `--accent-glow`（强调项辉光）须与 `--accent` 同色系，换肤时三者一起改，避免「青色环 + 紫色辉光」打架。

---

## 5 · 数据诚实规则（不造假铁律， /  A7）

1. **定量图必须有 `source`**。缺 `source` 的 bar/hbar/line/area/kpi → 渲染层**自动标「示意」**并打 `data-illustrative="true"` + `evidenceType:"illustrative"`（底部出现「数据为示意，非真实统计」）。这与 validator 的 `data-chart-missing-source`（P1）同口径。
2. **Y 轴强制从 0**（bar/hbar/area/stacked-bar）：截断基线 = 数据欺骗，渲染层拒绝 `zeroBaseline:false`。`diverging-bar` 以 0 为对称中心轴（本身即以 0 为基准）。
3. **真实数据标来源 > 编造好看数字**；**自制示意 > 假截图/假 logo**（拒绝降级三件套）。
4. **`evidenceType`** 与 deck 的 `data-evidence-type` 对齐：`fact`（有来源真实）/`observation`/`inference`/`illustrative`（示意）。

---

## 6 · 与 validator / SKILL 的衔接

- **B1 签名机检**：validator 应检测「定量 figure 内 SVG 是否带 `data-rendered-by`」，无则判「疑似手画」（B1，P0，本系统核心新增项）。本渲染层产出的 SVG 恒带 `data-rendered-by="blcaptain-chart"`。
- **B2 `<text>` 取舍**：工程规范偏好「SVG 内禁 `<text>`、标签走 HTML 叠层」。本模块导出**自包含 svgString**（须在纯 node/浏览器独立成图），故默认在 SVG 内用 `<text>`。deck 内需 B2 严格合规时，用 `renderChart(spec,{labelMode:'html'})` 取双产物路径。
- **渲染前校验（A1–A8）**：本渲染层在 `normalizeSpec` 内落地了 A1（type 白名单）/A2（黑名单标志）/A3（zeroBaseline）/A5（highlight ≤1 自动收敛）/A7（缺 source 标示意）；A4（标题含动词/数字）建议在 SKILL 生成侧把关。
- **自测**：`node scripts/chart-render.mjs --selftest` 渲染 11 样例（首发 6 + 扩建 5）+ 断言签名/几何/单信号 accent/强调辉光/无 NaN/去 chartjunk + 9 反例拒绝（sankey/treemap/map/3D/双轴/bar+stacked-bar 截断基线/缺数据）+ 长标题折行 + 示意降级 + 20 边界健壮性，全绿才算可用。

---

*实现 = `scripts/chart-render.mjs`；可视化 QC = `templates/chart-gallery.html`（暗底 11 图）。数据一律标「示意」。*
