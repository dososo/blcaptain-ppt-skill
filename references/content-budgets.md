# 内容预算锁定值 · content budgets（三人格·变长不崩）

> **真值地位**：本表是「每版式能容多少内容」的锁定值，与 `scripts/validate-deck.mjs` 的 `CONTENT_BUDGET` map **1:1 镜像**（改一处必同步另一处，仿间距 CANON）。**二级键 `[data-theme][layout]`**——版式名跨人格碰撞(final/statement/section-divider/social-card)，标题类与预算各不同，按主题分。
> **来源（research-led·非拍脑袋）**：值由变长压测梯度扫描派生——取「最大仍不崩」的内容量，留 1 档余量。
> **P 级**：超预算 = **P1**（致视觉破裂：超长标题压穿图表/内容 / 行溢出页底裁切·见 压测报告 证图）。区别于既有 `text-density-by-layout` P2（工程规范 全页密度·另一真值源）。
> **度量**：`width-unit = CJK 全宽字 ×2 + 拉丁/数字/标点/空格 ×1`（中英混排：CJK 全宽≈拉丁半宽 2 倍）。标题靶=class 或语义标签(compute h1/h2/blockquote)；行靶=class 或标签(tr/li)。
> **C（SVG 图表几何）跨人格结论**：compute 图表多 `chart-render` 确定性生成、constructivist 无图表 → **图表脆性是 info-data 专属**，两套无 SVG 标签契约。
> **作用域**：未登记主题/版式 → 不受约束。三套 demo 实测零误报（预算 ≫ demo 实际内容）。

## 1 · info-data（解释方言）· 标题宽度预算（width-unit）

**度量**：`width-unit = CJK 全宽字 ×2 + 拉丁/数字/标点/空格 ×1`（解决中英混排：CJK 全宽≈拉丁半宽 2 倍）。取标题元素可见文本计。

| 档 | layout | 标题类 | max-hold(CJK 字) | min-break | **预算(unit)** |
|---|---|---|---|---|---|
| 紧 | compare-split | `.cmp-intro` | 22 | 28 | **44** |
| 中紧 | chart-lead | `.h` | 34 | 40 | **68** |
| 中 | area-stack | `.h` | 40 | 46 | **80** |
| 中 | method-source | `.h` | 40 | 46 | **80** |
| 标准 | data-kpi · slope-compare · bar-ranking · small-multiples · dumbbell · data-table · scatter · waterfall | `.h` | 46 | 52 | **92** |
| 宽 | section-divider | `.dv-name` | 52 | 58 | **104** |
| 无紧限 | data-cover `.lead` · agenda `.h` · statement `.sts-claim` · quote `.qt-body` · final `.h` | — | 58(未断) | — | **116** |

## 2 · 行/单元数预算（计数行容器 class）

| layout | 行容器类 | max-hold | min-break | **预算** | 性质 |
|---|---|---|---|---|---|
| data-kpi | `.kpi-cell` | 3 | 4 | **3** | 固定 3-up（非变长·多于 3 须改版式） |
| method-source | `.ms-col` | 3 | 4 | **3** | 固定 3-栏 |
| data-table | `.tbl-row` | 6(含表头) | 7 | **6** | 变长表（=表头 1 + 数据 5）·更多须分页/提炼 |
| bar-ranking | `.br-row` | 5 | 6 | **5** | 排名条·更多须分页 |
| small-multiples | `.sm-cell` | 8 | 9 | **8** | 小倍数网格 |
| agenda | `.ag-row` | 12+(未断) | — | （不设·宽松） | 列表 |

## 2·B · compute（精密方言·instrument-cool）

标题用 h1/h2 语义标签（class=anim·非语义）；图表多 chart-render 确定性生成（C 免）。题区设计宽裕→标题多数 116。

| layout | 标题靶 | titleU | 行靶 | rows |
|---|---|---|---|---|
| signal-cover | `h1` | 116 | — | — |
| context-map | `h2` | 116 | `.unit` | 3 |
| paradigm-shift | `h2` | 116 | — | — |
| evidence-wall | `h2` | 104 | `.card` | 4 |
| kpi-wall | `.lead-m`(文案·非巨数槽) | 116 | — | — |
| timeline-impact | `h2` | 116 | —(横向·探针难判·不强约束) | — |
| risk-radar | `h2` | 116 | `.q` | 6 |
| decision-matrix | `h2` | 116 | `tr`(含表头) | 7 |
| final-move | `h1` | 56 | — | — |
| social-card | `blockquote` | 116 | — | — |

## 2·C · constructivist（信念方言）

无图表（C 免）。

| layout | 标题靶 | titleU | 行靶 | rows |
|---|---|---|---|---|
| cover | `.h` | 116 | — | — |
| statement | `.big` | 116 | — | — |
| section-divider | `.ch-name` | **32**（最紧·幕名巨字） | — | — |
| evidence | `.h3` | 116 | `.card` | 4 |
| compare | `.h3` | 56 | `li` | 8 |
| kpi | `.cap`(说明·非巨数槽) | 116 | — | — |
| process | `.h3` | 116 | `.step` | 3 |
| final | `.big` | 68 | — | — |
| social-card | `.quote` | 80 | — | — |

## 2·D · luxury-minimal（时尚奢侈极简·判断震慑）

无数据图表（薄纱图为氛围层·C 免）。标题=判断句 class 靶；titleU 防超长判断压穿/溢页。值由版式几何（行宽×可用行高）估算·留 1 档余量·初值待梯度校准（设计决策·与 validator `CONTENT_BUDGET['luxury-minimal']` 1:1）。

| layout | 标题靶 | titleU | 行靶 | rows |
|---|---|---|---|---|
| lux-cover | `.cov-claim` | 72 | — | — |
| lux-magnitude | `.mag-claim` | 80 | — | — |
| lux-conviction | `.con-claim` | 96 | — | — |
| lux-contrast | `.con2-claim`(首栏判断) | 40 | — | — |
| lux-editorial | `.ed-claim` | 64 | — | — |
| lux-quote | `.qt-body` | 84 | — | — |
| lux-closing | `.clo-claim` | 64 | — | — |
| lux-index | `.idx-lead` | 64 | — | — |
| lux-divider | `.dv-claim` | 56 | — | — |
| lux-statrow | `.sr-lead` | 80 | — | — |
| lux-pullquote | `.pq-body` | 76 | — | — |
| lux-list | `.ls-lead` | 80 | — | — |
| lux-ratio | `.rt-lead` | 80 | — | — |
| lux-timeline | `.tl-lead` | 80 | — | — |
| lux-spotlight | `.sp-claim` | 64 | — | — |

> **跨人格名碰撞已按二级键隔离**：`final`（info-data 116 / constructivist 68）·`statement`（info-data 116·.sts-claim / constructivist 116·.big）·`section-divider`（info-data 104·.dv-name / constructivist 32·.ch-name）·`social-card`（compute 116·blockquote / constructivist 80·.quote）——同名不同预算/靶，validator 按 `[data-theme]` 各取各的（selftest  主题隔离 case 钉死）。

## 3 · 生成纪律（SKILL.md `/goal` 引用）

- 标题按上表 per-layout 预算写；超了**精炼标题**，不靠版式硬扛（选了契约非缩放）。
- 表格/列表页守行预算：`data-table`/`bar-ranking` ≤5 数据行、`data-kpi`/`method-source` 恰 3、`small-multiples` ≤8——**更多数据 → 分页 / 提炼 / 升级版式**（一页一主张）。
- validator 兜底：超预算报 P1，须改到绿（P0/P1=0 才交付）。
