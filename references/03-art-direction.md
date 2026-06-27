# 03 · 艺术指导层（技术崇高 `instrument-cool` 可执行配方）

> 规范来源：设计系统规范 图片与图形体系 +  数据图卡。这是本 skill 与现有 AI 工具普遍缺失的维度。
> 命题：别人靠「往里塞图」做 wow，我们禁止塞假图——那 wow 从「同一只手处理过的整套视觉」（艺术指导）来，且完全不需要造假。

---

## 技术崇高艺术指导一句话

**让图像「消失」，让数据「发光」。** A 的最高境界是「好像没怎么用图，但每页都很满、很专业」。

---

## 配方一 · 数据即图 / 类型即图（A 的主角，零风险三件套之首）

- **优先级**：① 数据即图（真 KPI / 真趋势线，占主导）→ ② 程序化 SVG 结构图 → ③ 抽象材质场（暗场 `feTurbulence`，仅封面）→ ④ 用户截图（保真流做证据）。**几乎不用图库照片。**
- **数据即图执行**：图上直标结论（标题 = 结论）+ 坐标轴用 mono + 只高亮一条线、其余降灰（Tufte 擦除）。删的是「装饰墨水」（边框/3D/网格/渐变/图例），加回的是「叙事墨水」（标题=结论、直标数据、精准标注、引导线）。
- **数据可视化禁忌（会误导、内行一眼识破）**：柱状图 Y 轴必须从 0；避免双轴；一律 2D 禁 3D；连续数据用感知均匀单色阶禁彩虹；>4 类用条形不用饼图。
- **隐蔽识货点**：外行看「图很干净」，内行看「这人懂数据可视化」。

## 配方二 · sRGB duotone（一号武器，A 的统一处理核心）

把来源杂乱的氛围图统一成「一个摄影师拍的一套片」。A 的 duotone 端点：石墨 `--bg #11161B` → 信号青 `--accent #3FD6C2`。

```svg
<filter id="duo-a" color-interpolation-filters="sRGB">
  <!-- ① 转灰 -->
  <feColorMatrix type="matrix"
    values="0.33 0.33 0.33 0 0
            0.33 0.33 0.33 0 0
            0.33 0.33 0.33 0 0
            0    0    0    1 0"/>
  <!-- ② 灰阶映射到 #11161B → #3FD6C2 两端点 -->
  <feComponentTransfer>
    <feFuncR type="table" tableValues="0.067 0.247"/>  <!-- 0x11→0x3F /255 -->
    <feFuncG type="table" tableValues="0.086 0.839"/>  <!-- 0x16→0xD6 /255 -->
    <feFuncB type="table" tableValues="0.106 0.761"/>  <!-- 0x1B→0xC2 /255 -->
  </feComponentTransfer>
</filter>
```

- **`color-interpolation-filters="sRGB"` 必写**——默认 linearRGB 会发灰发脏，90% 人翻车在此，这一行是内行与外行的分水岭（IMG5 识货点）。
- **铁律**：一套 deck 只用一套 treatment id（validator 可检全 deck `filter:url(#…)` 是否指向同一 id）；treatment 绝不上正文与数据图表；保真证据图不过重处理（只装裱不变色，否则降级为示意）。

## 配方三 · grain 颗粒（A 取最弱，仅封面）

```svg
<filter id="grain-a">
  <feTurbulence type="fractalNoise" baseFrequency="0.9"
    numOctaves="2" stitchTiles="stitch" result="n"/>
  <feColorMatrix in="n" type="matrix"
    values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.03 0"/>  <!-- 透明度 3% -->
</filter>
```
叠层 `opacity:.02–.03`、`pointer-events:none` 必写、`stitchTiles="stitch"` 必写。A 取 2–3% **仅封面**，不上正文/图表/数据页。

## 配方四 · 暗底防 banding（A 必做）

近黑底任何渐变在 8-bit 屏会出现台阶状色带。两条道：① 用 `feTurbulence` 噪点 1–2% dithering 打散；② 干脆用纯色块两层级（`--bg` / `--surface`）从根上避免渐变。

## 配方五 · 程序化 CSS/SVG 生成图（唯一可放进模板分发）

零版权风险、零造假风险，不主张照片。背景、结构图、留白、刻度尺、sparkline 全部自生成。模板里不内置任何图库照片，只内置 CSS/SVG 生成图（彻底避开再分发风险）。

---

## 「不造假图源」红线（全套通用，A 严格执行）

| 优先级 | 图源 | 在 A 的用法 |
|---|---|---|
| ★★★ | 类型即图 / 数据即图 | 主角、KPI、封面 |
| ★★★ | 生成式 CSS/SVG | 背景、结构图、留白（唯一可放进模板分发） |
| ★★ | 用户自有素材（授权） | 证据、产品拆解（保真流） |
| ★★ | 公共领域/CC0（NASA/The Met/Smithsonian/Openverse） | 极少，标氛围、过统一处理 |
| ★ | AI 抽象概念图 | 仅抽象、须守边界、标「示意」 |
| ★ | 开源图库照片 | A 几乎不用 |

- **AI 抽象图边界**：✅ 抽象概念图（无具体可识别对象）；❌ 伪造 logo/UI/真实场景照片/数据图表/可识别真人真品牌。
- **占位图**：用自制 SVG 并注明非真实素材；示意数据显式标「示意」。

---

## 技术崇高禁用清单（艺术指导层）

- 禁 **halftone**、**riso 错版**（太吵、破坏冷精密——本人格不适用）。
- 禁彩虹渐变、任何发光/辉光、真人脸氛围图。
- 禁印刷的「纸质」一面（letterpress / 重纸纹——那是 其他人格语汇）。A 走「屏幕原生·冷光」，不走「纸质·油墨」，混进来会串味。
- 玻璃拟态、紫蓝渐变、3D 抽象小人、伪科技蓝紫光、三个带图标盒子、emoji 当装饰——经典 AI 指纹，永远禁。

---

## 给 validator 的图像硬规则（IMG1–IMG7，A 适配）

| # | 校验项 | 优先级 |
|---|---|---|
| IMG1 | 统一处理一致性：全 deck 氛围图类 `filter:url(#…)` 指向同一 treatment id | P1 |
| IMG2 | treatment 禁上数据图表/正文（`.chart` / `figure[data-evidence-type=fact]` 不得有 grain/duotone） | P1 |
| IMG3 | 无外链图片（`<img src>` 不得 http(s) 外链） | P1 |
| IMG4 | 图源诚实标注：AI 抽象/图库氛围图须 `data-evidence-type=illustrative` 并渲染「示意」chip | **P0（红线）** |
| IMG5 | `color-interpolation-filters="sRGB"` 存在性（凡定义 duotone/posterize） | P2（识货点） |
| IMG6 | 按 theme 禁用处理（A 禁 halftone/riso） | P1 |
| IMG7 | 封面页须命中 8 范式之一的 `data-cover-paradigm`（A 主力 2/6） | P2 |

> 注：IMG1–7 是设计规范「建议新增」方向上的图像类校验——本表是生成时的人工自检清单，按此手动核对。

> 收尾：三套不是「三种配色」，是「三种对待图像的哲学」——技术崇高把图藏起来让数据说话。
