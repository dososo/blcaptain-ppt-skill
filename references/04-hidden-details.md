# 04 · 技术崇高 `instrument-cool` 专属隐蔽细节清单

> 规范来源：设计系统规范 公理10（隐形的考究）/  /  动效 + `references/00-tokens-locked.md`（令牌真值）。这是「内行一眼识货的最后 5%」，也是与平庸 AI PPT 的护城河。
> 用法：生成后逐条扫，命中反面即廉价信号，必改。每条带数值/做法。token 数值以 `00-tokens-locked.md` 为准。

---

## A 的 8 条专属隐蔽细节（带数值）

### 1 · 暗底文字三档明度（88 / 60 / 38 量级）
- **做法**：技术崇高 用具体 hex（带蓝色温，非透明白）：主文 `--ink:#E8EEF2`（≈88% · 15.54:1 on bg）、次文 `--ink-dim:#7E8A94`（≈60% · 5.15:1 过 AA 小字）、弱文 `--ink-faint:#525C66`（≈38% · 2.67:1，仅占位/装饰，不承载关键信息）。deck 另有中档 `--ink-mid:#9AA6B0` 供中文导语。
- **为什么显贵**：纯白 `#FFF` on 暗底会 halation（光晕）刺眼 = 业余信号；用具体冷调 hex 而非透明白可精确控对比（已 WCAG 实测）。
- **反面（命中即改）**：暗底纯白正文。

### 2 · sRGB 必写（duotone/posterize 滤镜）
- **做法**：凡定义 `feColorMatrix`/`feComponentTransfer` 色调映射，filter 上必写 `color-interpolation-filters="sRGB"`。
- **为什么显贵**：默认 linearRGB 会发灰发脏，90% 人翻车于此——这一行是内行与外行的分水岭。
- **反面**：duotone 发灰发脏（漏写 sRGB）。

### 3 · 暗底降饱和 accent（A↔C 判别开关）
- **做法**：信号青 `#3FD6C2` 是低饱和（H=172 S65 L54），非荧光青；暗底 accent 相对亮底降 S 10–20%、提 L 5–10%。
- **为什么显贵**：高饱和色在暗场会「振动」。A 降饱和、C 反向高饱和——这是 A 与 C 的判别开关之一。
- **反面**：暗底用高饱和荧光色（属 C，A 禁用）。

### 4 · 冷灰带色温
- **做法**：`--ink-dim:#7E8A94` 略带蓝（S≈8%），不用纯无彩 `#808080`（S=0）。中性灰一律给 S=4–8%（A 走冷偏蓝）。
- **为什么显贵**：纯无彩灰显塑料脏。
- **反面**：`#808080` 纯灰。

### 5 · 真乘号 / 减号 / 窄空格
- **做法**：`3×4` 用 `×`(U+00D7)、负数用 `−`(U+2212)、`8 GB` 用窄不换行空格 `&#8239;`（U+202F）而非普通空格或贴死；另 `±`(U+00B1) `≈`(U+2248)。
- **为什么显贵**：字母 `x` 当乘号是经典破绽。
- **反面**：用字母 x 当乘号、连字符当减号。

### 6 · tabular 对小数点（A 的性价比之王）
- **做法**：所有 KPI/表格数字 `font-variant-numeric:tabular-nums lining-nums`；纵向排列时小数点对齐成一条竖线。`.kpi-slot` 必带 `tabular-nums`（可机检）。正文用 onum、标题用 lnum、表格用 tnum（场景选 figure，用错=外行）。
- **为什么显贵**：等宽数字让列「真的对齐」，是最便宜的内行信号。
- **反面**：比例数字（proportional）做 KPI，小数点参差。

### 7 · opsz 光学尺寸
- **做法**：若用含 `opsz` 轴的可变字体，hero 巨数字 `h1{font-variation-settings:"opsz" 72}` 或 `font-optical-sizing:auto`；display 与 text 两档分开。
- **为什么显贵**：金属活字每字号单独刻模、自带光学修正；hero 巨数字吃 display 光学才「细而利」。
- **反面**：一套字形从 12px 拉到 120px 全同光学版 → 大标题肉。
- **前提**：须确认所选字体真含 opsz 轴，不含则放弃该特性，不可造假渲染。

### 8 · 微动效 bezier + reduced-motion
- **做法**：自定义曲线 `cubic-bezier(.22,1,.36,1)`（= `--ease`）；位移幅度小（translateY 8–16px，deck 实现取 14px），不做大幅飞入；时长 **<300ms**（`--dur-fast:.15s` / `--dur-base:.28s`，280ms 守公理7 上限）；强制 `@media (prefers-reduced-motion:reduce)` 降级（关闭位移/淡入瞬时）。
- **为什么显贵**：克制有语义的微动效 vs 拖沓飞入；尊重无障碍偏好。
- **反面**：翻页 ≥400ms 拖沓（曾漂移到 `.4s` 已踩公理7「>300ms=拖沓=廉价」红线，设计规范 修订注已修回 `.28s`）、或 `linear` 机械曲线、或忽略 reduced-motion。

---

## A 的额外护城河条目（来自设计规范 公理5/10 +  线条，A 适配）

- **暗底加 1–2% 极轻颗粒防 banding**：`feTurbulence baseFrequency .9`、opacity 2–4% 仅背景；或纯色块两层级避渐变。
- **hairline 用半透明前景色**：`--hairline:rgba(255,255,255,.10)` 而非写死灰 hex（写死灰在深浅区轻重不一）。
- **hi-dpi 真 0.5px 发丝线**：`transform:scaleY(.5)` 或 inset shadow（iOS/macOS 系统级分隔线都是 0.5pt）。
- **全大写加 5–12% 字距，小写绝不加**：`.label-caps{letter-spacing:.08em}`（`--ls-caps:0.08em`）；大写连排天生拥挤。
- **亲密性 1:3 而非均布**：标题→正文用小档间距、段组之间用大档（均匀间距 = 没层级 = 业余）。
- **视觉居中 ≠ 几何居中**：按钮/标签顶 padding 取底的 90–94%。

---

## 技术崇高回避项（质感哲学硬边界）

- **A 唯独回避印刷痕迹**：A 走「屏幕原生·冷光」不走「纸质·油墨」；letterpress / riso / 重纸纹混进来会串味——这是 A 与 其他人格 质感哲学的硬边界（B 用纸感+letterpress、C 借 overprint，A 全禁）。

---

## 反面清单（一眼廉价，命中即改）

1. 一套字形从 12px 拉到 120px 全同光学版 → 大标题肉。
2. 用 `scaleX(.85)` 压扁字塞行 → 字看着被捏过（字距 ±3%/字形 ±2% 是物理红线）。
3. 暗底纯白 `#FFF` 正文 → halation。
4. 纯无彩灰 `#808080` → 塑料脏。
5. emoji（✅🚀💡）当项目符 → **头号 AI 廉价指纹**。
6. 翻页 600ms+ 拖沓或 `linear` 机械 → 时长/曲线全错。
7. 字母 x 当乘号 → 经典破绽。
8. KPI 用比例数字、小数点参差 → 漏掉 tabular。

> 待证（上线前实测，不可造假渲染）：opsz/smcp/onum/tnum/lnum 须逐字体核验真含（Geist 的 tabular/lining 仅 NPM/zip 版支持，Google Fonts 版无 OT；见 `00-tokens-locked.md` ⑥）；`text-autospace`/`text-box-trim`/`hanging-punctuation` 浏览器支持仍在铺开，需 `<span>`/负 margin 兜底。
> 注：`cv01`/`ss03` 是 **Inter 专属** stylistic set，决策②不引 Inter，**已移除该依赖**，本套不再需要它们（见 `00-tokens-locked.md` ⑥）。
