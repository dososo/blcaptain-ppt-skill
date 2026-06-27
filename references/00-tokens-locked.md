# 00 · 设计令牌锁定真值（technical-sublime · 技术崇高 instrument-cool）

> 文档定位：本文件是**最终锁定、可直接粘贴/可 node 跑**的 design tokens 唯一真值，由设计令牌工程师从官方源核实后从【待证】锁成【已核实】。
> 唯一规范来源：设计系统规范（已批准）。本文件是其  基础令牌的**取证收口版**。
> 5 个已拍板决策全部执行：① mono = Geist Mono；② 主无衬线 = Geist Sans 可变字重，关键标题用中间档 ~500/510；不引 Inter（守"一支无衬线 + 一支等宽"）；③ 首发禁 Stripe 式签名渐变（纯暗场冷光）；④ 圆角全系 0px；⑤ 官方精确值已 WebFetch / npm 官方包核实补全。
> 取证日期：2026-06-17。对比度均为 **node 脚本 WCAG 2.x 实测**，非目测（脚本见文末附录 A，可复跑）。

---

## 0 · 本次从官方核实/修订了什么（【待证】项状态更新结论）

逐项对应规格附录"待证清单"与  拍板点，给出本次核实结论：

| # | 规格原状态 | 本次结论 | 取证来源 |
|---|---|---|---|
| ① Geist 官方精确灰阶 / 强调色 hex | 【待证】公开页未列纯文本 | **【部分已核实】** 官方 `vercel.com/geist/colors` 公开页 hex 确为 JS 渲染、纯文本不可得（WebFetch + web-reader 双证实）；但 **Vercel 官方字体包 `geist@1.7.2` + 官方色阶 npm 镜像 `geist-colors@1.0.0`** 给出全色阶 HSL/OKLCH 真值，已转 hex 并实测对比度（见）。Geist 暗场画布官方 = `#0a0a0a`；灰阶为**纯中性 0% 饱和**；官方暗场 accent 用 **teal H172–174**（与技术崇高 信号青同源，强背书）。 | WebFetch `vercel.com/geist/colors`【官方·JS渲染】；web-reader 同页【官方】；`npm pack geist-colors`→`gray-dark.css`/`teal-dark.css`/`background-dark.css`【官方色阶镜像】 |
| ② Geist 按钮 small/medium/large 精确像素高 | 【待证】 | **仍【待证】** 本次未取到一手像素值；deck 不依赖按钮高度，不阻断。 | — |
| ③ 代码块官方精确 token | 【待证】 | **仍【待证】** 用克制策略落地（代码块），不造精确值。 | — |
| ④ Linear 是否用噪点 / 渐变光晕参数 | 【待证】 | **【已核实·方法论】** Linear 工程博客证实其色彩走 **LCH 色彩空间**、用**三变量（base/accent/contrast）**、**靠亮度变化表达层级（elevation）**、标题用 **Inter Display**；博客**不公开具体 hex/LCH 数值**。噪点本体仍【待证】，按规格当可选收尾、非签名。决策③据此成立：纯暗场冷光，禁霓虹 mesh。 | WebFetch `linear.app/now/how-we-redesigned-the-linear-ui`【官方】 |
| ⑤ Stripe `#533afd` 与 `#635BFF` 关系 / Söhne / 插画指南 | 【待证】 | **【部分已核实】** Stripe 现行品牌 blurple 仍为 **`#635BFF`**（2026.03 来源确认），`#533afd` 未获官方坐实关系，维持【待证】。Söhne 付费、插画指南仍【待证】——决策不引 Söhne，用 Geist Sans，规避。 | WebSearch（mobbin/brandcolors 2026.03）【社区】 |
| ⑥ 各字体是否真含 tnum/lnum/cv01/ss03 | 【待证】 | **【已核实·Geist】** 官方 `geist` 包确认 Geist Sans/Mono 通过 **NPM/.zip 版支持 `font-feature-settings`**（官方 font 页明示，Google Fonts 版不支持）；OT 特性须以 NPM/zip 版引入。决策②不用 Inter，故 `cv01/ss03`（Inter 专属）不再相关，移除该依赖。 | WebFetch `vercel.com/font`【官方】 |
| ⑦ text-autospace / hanging-punctuation 等浏览器支持 | 【待证】 | **仍【待证】** 须落地实测兜底，已在 / 标注降级方案。 | — |
| ⑧ Geist "9 档圆角 / 12 档间距 / 15 字阶"计数 | 【待证】社区镜像 | **【结论：计数不锁】** 官方 `vercel.com/geist/colors` 坐实"**10 色阶 + 1–10 步级语义 + 2 背景色 + P3**"（web-reader 取得纯文本原文，见）；间距"8px 基准 + grid 是核心美学"为官方定调，但 **9/12/15 三个具体计数官方公开页仍未以纯文本列出**，维持【社区·不作硬约束】。本技术崇高 自定档位（不依赖这三个数字），合法。 | web-reader `vercel.com/geist/colors`【官方】 |
| 决策① mono 升 Geist Mono | 拍板待执行 | **【已执行】** 字族升级为 Geist Mono（OFL）；官方包确认 Geist Mono 全 19 静态字重 + Variable（见）。 | `npm pack geist`【官方】 |
| 决策② 字重轴 510 | 拍板待执行 | **【已执行】** Geist Sans 官方为**连续可变轴 `weight: "100 900"`**（官方包 `sans.js`），故关键标题取中间档可精确到 **510**（拿不到可变轴时回退 500），对标 Linear 刻意权威感。 | `npm pack geist`→`dist/sans.js`【官方】 |

**一句话**：Geist 官方 hex 仍不以网页纯文本公开，但**经 Vercel 官方 npm 包（字体）+ 官方色阶镜像**已把灰阶/accent/语义色从【待证】锁成可用真值；技术崇高 信号青与 Geist 官方暗场 teal **同 hue 家族**，选色站得住官方肩膀。下方 `:root` 块即最终锁定值。

---

## 1 · 官方核实真值速查（锁定依据）

### 1.1 Geist 色彩 1–10 步级语义【已核实·官方原文】
来源：web-reader 抓取 `https://vercel.com/geist/colors` 渲染后纯文本（原文逐字）：
- "There are **10 color scales** in the system. **P3 colors** are used on supported browsers and displays."
- "There are **two background colors**" — Background 1（default）/ Background 2（secondary, sparingly）。
- Colors **1–3 = UI component backgrounds**（1 default / 2 hover / 3 active）。
- Colors **4–6 = borders**（4 default / 5 hover / 6 active）。
- Colors **7–8 = high contrast backgrounds**。
- Colors **9–10 = accessible text and icons**（9 secondary / 10 primary）。

> 锁定意义：任何新主题填满 1–10 即自动获得一致 hover/border/text 关系——本系统语义层据此设计（其他人格 复用零成本）。

### 1.2 Geist 暗场色阶 hex【已核实·官方色阶镜像 `geist-colors@1.0.0`】
官方暗场画布与灰阶（HSL 原值，0% 饱和=纯中性，无色温）：
- `--background-dark-100: #0a0a0a`（默认画布）、`--background-dark-200: #000`（极少用）。
- gray-dark 1000=`hsl(0 0% 93%)`→`#ededed`（主文字，**14.87:1**）；900=`hsl(0 0% 63%)`→`#a1a1a1`（次文字，**6.74:1**）；400=`hsl(0 0% 18%)`→`#2e2e2e`（border）。
- **官方暗场 accent = teal**：teal-dark-900=`hsl(174 90% 41%)`→`#0ac7b4`（**8.16:1**）；teal-dark-600=`#0c9784`；OKLCH/P3 见镜像。
- 官方语义：amber-dark-700=`hsl(39 100% 57%)`→`#ffb224`（**9.65:1**）；red-dark-600=`hsl(358 75% 59%)`→`#e5484d`（**4.45:1**）；green-dark-700=`#45a557`；blue-dark-900=`#52a8ff`。

> 锁定意义：**技术崇高 信号青 `#3FD6C2`（H172）落在 Geist 官方 teal H172–174 区间**——选色得官方背书。技术崇高 不直接抄 `#0ac7b4`：技术崇高 提一档明度/降一档饱和（`#3FD6C2`）以匹配自家略亮的"仪表台"画布 `#11161B`（非 Geist 纯黑 `#0a0a0a`），并保持 hue 同源。技术崇高 灰阶**带蓝色温**（非 Geist 纯中性），是与通用模板审美区隔的有意决策（暗场冷光）。

### 1.3 Geist 字体真值【已核实·官方包 `geist@1.7.2`】
- **Geist Sans**：官方 `dist/sans.js` → `localFont({ src: "Geist-Variable.woff2", variable: "--font-geist-sans", weight: "100 900" })` —— **连续可变轴 100–900**。静态字重文件（woff2/ttf 实测存在）：Thin/UltraLight/Light/Regular/Medium/SemiBold/Bold/ExtraBold/Black/UltraBlack + 全套 Italic + `Geist-Italic[wght]`（可变斜体轴）。
- **Geist Mono**：同结构，`Geist-Variable`/`GeistMono-Variable` 全字重；静态档与 Sans 对齐（Thin…UltraBlack + Italic）。
- **OpenType / OT 特性**：官方 `vercel.com/font` 明示 "**font-feature-settings support**" 仅在 **NPM 安装或 .zip 下载**时可用；**Google Fonts 版不支持 OT 特性**（须用 NPM/zip 版）。Stylistic sets 存在但官方未枚举具体编号【部分待证】。
- **授权**：**OFL（SIL Open Font License）**，官方页明示 "Licensed under OFL"。可商用/可嵌入/可改（遵守 OFL：保留版权、衍生不单售、不用保留名）。
- **设计定调**【官方原文】："design principles of simplicity, minimalism, and speed"、"inspiration from the renowned Swiss design movement"、"precision, clarity, and functionality"。

### 1.4 Linear 色彩/层级方法论【已核实·官方工程博客】
- 色彩空间从 HSL 迁移到 **LCH**（"perceptually uniform"）；主题仅 **3 变量：base / accent / contrast**。
- 提高整体对比："making our text and neutral icons darker in light mode and lighter in dark mode"。
- "more neutral and timeless appearance" 靠 "limiting how much chrome (blue…) was used"。
- 层级靠 **lightness variation for elevation across surfaces**（背景→面板→对话框越前越亮）。
- 标题用 **Inter Display**，正文用 Inter。**博客不公开具体 hex/LCH 数值**。

> 锁定意义：印证本系统"面板层级靠亮度不靠投影""暗场提亮表达更高层级"（公理 11、 阴影=none）。决策③（纯暗场冷光、禁霓虹 mesh）与 Linear "neutral / timeless、限制 chrome 用量"一致。

### 1.5 Stripe 配色门 / 品牌色【已核实·官方 + 社区】
- **官方**（`stripe.com/blog/accessible-color-systems`）：色彩空间 **CIELAB**；门限原文 "minimum contrast ratio of **4.5 for small text, and 3.0 for large text**"；系统内置规则 "Any two colors are guaranteed to have sufficient contrast for small text if they are at least **five levels apart**, and at least **four levels apart for icons and large text**."
- 品牌 blurple **`#635BFF`** 仍为现行（2026.03 社区源确认）；`#533afd` 关系未坐实【待证】。

> 锁定意义：validator 对比门（小字 4.5:1 / 大字 3.0:1）= WCAG ∩ Stripe 官方，直接成立。decision③ 不引 Stripe 渐变，仅借其"对比门内置系统"逻辑。

---

## 2 · 最终锁定 design tokens（可粘贴 · 唯一真值）

> 直接粘进 deck 模板 的 `/* TOKENS START */ … /* TOKENS END */` 区块。
> 铁律：颜色只能用 `var(--…)`；TOKENS 区块外不得出现裸 hex（validator P0）。

```css
/* =========================================================================
   TOKENS START · technical-sublime
   决策已执行：Geist Sans(可变轴)+Geist Mono · 关键标题中间档510 · 圆角0 · 纯暗场冷光禁渐变
   对比度均为 WCAG 2.x node 实测（附录 A 可复跑），非目测。
   ========================================================================= */

/* ---- 全局基底（与主题无关的结构常量）---- */
:root{
  /* 字体族（决策①②：Geist Sans 可变 + Geist Mono；不引 Inter；守"一支无衬线+一支等宽"） */
  --font-sans:"Geist","Geist Sans","Noto Sans SC","PingFang SC","Microsoft YaHei UI",system-ui,-apple-system,sans-serif;
  --font-mono:"Geist Mono","SFMono-Regular",ui-monospace,"JetBrains Mono",monospace; /* JetBrains Mono 仅离线兜底回退 */
  --font-serif:var(--font-sans); /* 本系统不用衬线，指回 sans 防误用 */

  /* 字阶 modular scale · ratio 1.25(major third) · base 18px · h2 故意跳级（对标 Geist 大跳字阶） */
  --fs-meta:13px;          /* mono 元数据下限 */
  --fs-body:18px;          /* 正文 base */
  --fs-lead:22.5px;        /* 导语 = base×1.25 */
  --fs-h3:28px;            /* base×1.25²(28.12 取整) */
  --fs-h2:43.95px;         /* base×1.25⁴；中间 1.25³(35.16) 故意空出，标题跳更狠 */
  --fs-h1:clamp(44px,6.4vw,86px);   /* hero 响应式（起点 44px 与 Stripe H1 hero 一致） */

  /* 字重（越大越细 = 技术崇高签名；决策②关键标题 510 拿权威感） */
  --w-hero:300;            /* hero 判断句：细 + 阔 + 负字距 */
  --w-title:510;           /* 关键标题中间档（Geist 可变轴 100–900 连续，可精确 510；回退 500） */
  --w-body:400;
  --w-label:600;           /* 全大写小标签 */

  /* 字距（display 负、正文零、大写正；对标 Geist 负字距随字号加大） */
  --ls-hero:-0.03em;       /* hero≈48–86px 收紧（Geist 48px≈-2.4~-2.88px 量级等比） */
  --ls-title:-0.02em;      /* 标题档（对标 Stripe H1 -0.02em） */
  --ls-body:0;
  --ls-caps:0.08em;        /* 全大写加正字距（Butterick 硬规则） */

  /* 行高（字越大越紧） */
  --lh-hero:1.05;          /* hero（对标 Stripe H1 1.03 量级） */
  --lh-title:1.08;
  --lh-body:1.5;

  /* 间距 8px 节拍（有限成比例刻度；与 deck 模板实现 1:1） */
  --sp-1:8px;  --sp-2:16px; --sp-3:24px; --sp-4:32px;
  --sp-6:48px; --sp-8:64px; --sp-10:80px; --sp-12:96px; --sp-16:160px; /* 160=8×20 仍落刻度 */
  /* 设计决策 细档例外轨（4pt·非主刻度·仅组件内部/紧凑/图标-文字/≤14px 小字行内；异名前缀不入主刻度机检） */
  --sp-fine-a:4px; --sp-fine-c:12px; --sp-fine-e:20px;

  /* 网格（16:9 画板 · 16 栏密对称稳） */
  --grid-cols:16; --gutter:24px; --pad:80px;
  --deck-w:1280px; --deck-h:720px;

  /* 圆角（决策④：全系 0px 直角 = 仪表台/终端气质） */
  --radius-sm:0px; --radius:0px; --radius-lg:0px; --radius-pill:0px;

  /* 线条（发丝线 · 真值在主题块内定 alpha；线宽常量） */
  --line-w:1px; --line-w-hair:0.5px; /* hi-dpi 用 transform:scaleY(.5) 或 box-shadow:inset 0 .5px 0 兜底 */

  /* 动效（决策守公理7：UI <300ms） */
  --dur-fast:.15s;         /* 微交互 100–150ms */
  --dur-base:.28s;         /* 标准 ≤300ms（280ms 守上限，禁回 .4s） */
  --ease:cubic-bezier(.22,1,.36,1);                 /* 入场 ease-out（技术崇高 主用） */
  --ease-out-quart:cubic-bezier(0.165,0.84,0.44,1); /* Vercel/Linear 入场备选 */
  --ease-inout:cubic-bezier(0.645,0.045,0.355,1);   /* 屏内位移 */

  /* OpenType 特性（默认；Geist NPM/zip 版支持，Google Fonts 版不支持） */
  --ot-base:"kern" 1,"liga" 1;
}

/* ---- 技术崇高 人格：instrument-cool（暗场冷光）---- */
:root[data-theme="instrument-cool"]{
  /* 中性场（近黑非纯黑·文字色与底色同源带蓝色温；对标 Geist #0a0a0a 提亮+加冷调） */
  --bg:#11161B;            /* 石墨蓝灰画布（Geist 官方纯黑 #0a0a0a 提亮一档更"仪表台"） */
  --surface:#161D24;       /* 第一层面（层级靠亮度，对标 Linear surface 越前越亮） */
  --surface-2:#1C2530;     /* 第二层面 */

  /* 文字三档明度（暗底不用纯白防 halation；对标 Material 88/60/38 + Linear 三级灰） */
  --ink:#E8EEF2;           /* 主文字 · 实测 15.54:1 on bg（远超 AA） */
  --ink-dim:#7E8A94;       /* 次文字 · 实测 5.15:1 on bg（过 AA 小字门 4.5:1，可作次要正文/元数据） */
  --ink-faint:#525C66;     /* 弱文字 · 实测 2.67:1 on bg（<AA，仅禁用/占位/装饰，不承载关键信息） */

  /* 发丝线（半透明前景色 = 随底色呼吸，非固定灰；对标 Vercel shadow-as-border） */
  --hairline:rgba(255,255,255,.10);
  --hairline-2:rgba(255,255,255,.05);

  /* 单一信号色（暗底降饱和·hue∈[160,210]·面积≤10%；与 Geist 官方暗场 teal H172–174 同源） */
  --accent:#3FD6C2;        /* 信号青 H172 S65 L54 · 实测 10.06:1 on bg / 9.40:1 on surface / 8.56:1 on surface-2 */
  --accent-dim:rgba(63,214,194,.14);  /* 仅作低饱和面/外发光暗示"重点"，不承载文字 */

  /* 语义色（只在数据语义用，不当装饰；语义不靠颜色单一载体——配图标/文字/位置） */
  --warn:#F2B23E;          /* 警示 · 实测 9.71:1 on bg（对标 Geist amber-700 #ffb224） */
  --danger:#FF5C5C;        /* 危险 · 实测 6.01:1 on bg（对标 Geist red-600 #e5484d） */
  --illus:#8A7CC2;         /* 示意/illustrative chip · 实测 4.97:1 on bg（过大字，提醒"别当真"） */

  /* 阴影/层叠（决策③暗场默认无投影，靠 surface 亮度差 + hairline 分层 = shadow-as-border） */
  --shadow:none;
  /* 需浮起感时（screenshot-intel 卡）才用 Vercel 招牌叠层（多层极淡 + 内嵌 1px ring，黑透明 4–12%）： */
  --shadow-card:0 0 0 1px rgba(255,255,255,.06), 0 2px 8px rgba(0,0,0,.30), 0 12px 24px -12px rgba(0,0,0,.40);

  /* 字体特性映射（数据/KPI 强制 tabular；正文 kern/liga） */
  --num-tabular:tabular-nums lining-nums;
  --num-prose:proportional-nums;
}

/* ---- accent 场景子档（语义信号非审美·只切 --accent / --accent-dim，改一处全局生效）---- */
:root[data-theme="instrument-cool"][data-accent="night-cyan"]{  /* 默认：AI/科技战报、产品拆解 */
  --accent:#3FD6C2; --accent-dim:rgba(63,214,194,.14);
}
:root[data-theme="instrument-cool"][data-accent="deep-blue"]{   /* 产品发布、内部/路演 */
  --accent:#3D7BFF; --accent-dim:rgba(61,123,255,.16);
  /* ⚠️ 硬约束：实测 4.74:1 on bg，仅过大字 AA，小字正文须谨慎（不用于小字读数） */
}
:root[data-theme="instrument-cool"][data-accent="safety-amber"]{ /* 风险/事故复盘（语义专用·不用于路演） */
  --accent:#FF8A3D; --accent-dim:rgba(255,138,61,.16);          /* 实测 7.76:1 on bg */
}
/* =========================================================================
   TOKENS END
   ========================================================================= */
```

### 2.1 OpenType / 数字字形落地（搭配上方 token）
```css
/* 全局基础特性（Geist NPM/zip 版支持；Google Fonts 版无 OT，须换 NPM/zip 引入） */
body{ font-feature-settings:var(--ot-base);
      -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility; }
/* 成列/会变的数字一律 tabular（公理4 · validator 查 .kpi-slot 含 tabular-nums） */
.kpi-slot,.data-table td,.intel-stamp,.src{ font-variant-numeric:var(--num-tabular); }
/* 正文行内单个数字可 proportional */
.prose{ font-variant-numeric:var(--num-prose); }
```
> ⚠️【已核实】Geist 官方确认 OT 特性仅 NPM/.zip 版可用。`cv01/ss03`（Inter 专属）因决策②不引 Inter 已**移除依赖**——本套不再需要它们。

---

## 3 · 字体安装与回退（决策①②落地）

- **不打包字体二进制进仓库**，只给安装说明（OFL 允许嵌入，但保持仓库轻量）：
  - `npm i geist`（官方包，含 Sans/Mono Variable + 全静态字重 woff2/ttf；**用此版才有 OT 特性**），或从 `vercel.com/font` 下载 .zip。
  - **禁用 Google Fonts 版做正式产出**（无 OT 特性，tabular/liga 失效）。
- **可变轴**：Geist Sans/Mono 官方 `weight:"100 900"` 连续轴——`--w-title:510` 可精确取中间档；若运行环境只装到静态字重，回退 `font-weight:500`。
- **回退栈**（已写入 token，离线可读）：sans → `Noto Sans SC / PingFang SC / Microsoft YaHei UI / system-ui`；mono → `SFMono-Regular / ui-monospace / JetBrains Mono`（JetBrains Mono 仅兜底，非主用）。
- **授权**：Geist Sans/Mono = **OFL**，可商用/可嵌入/可改。**不引 Söhne（Klim 付费）/ Berkeley Mono（付费）/ Inter**——决策②守"一支无衬线 + 一支等宽"，规避付费授权与"假装用 Söhne"红线。

---

## 4 · 对比度实测总表（WCAG 2.x · node 实测 · 附录 A 可复跑）

| 色对 | 实测对比度 | 判定 |
|---|---|---|
| `--ink #E8EEF2` on `--bg #11161B` | **15.54:1** | 主文字 · 远超 AA/AAA |
| `--ink` on `--surface #161D24` | 14.52:1 | 通过 |
| `--ink` on `--surface-2 #1C2530` | 13.23:1 | 通过 |
| `--ink-dim #7E8A94` on `--bg` | **5.15:1** | **过 AA 小字门(4.5:1)** · 可作次要正文/元数据 |
| `--ink-dim` on `--surface` | 4.82:1 | 过 AA 小字 |
| `--ink-faint #525C66` on `--bg` | **2.67:1** | **<AA** · 仅禁用/占位/装饰，不承载关键信息 |
| `--accent #3FD6C2` on `--bg` | **10.06:1** | 远超 AA |
| `--accent` on `--surface` | 9.40:1 | 通过 |
| `--accent` on `--surface-2` | 8.56:1 | 通过（过 validator 死区门 3.0:1） |
| `--warn #F2B23E` on `--bg` | 9.71:1 | 通过 |
| `--danger #FF5C5C` on `--bg` | 6.01:1 | 通过 |
| `--illus #8A7CC2` on `--bg` | 4.97:1 | 过 AA 小字（示意提醒色） |
| `deep-blue #3D7BFF` on `--bg` | **4.74:1** | **仅过大字 AA** · 小字慎用（硬约束） |
| `safety-amber #FF8A3D` on `--bg` | 7.76:1 | 通过 |
| 参照 · Geist 官方 teal-900 `#0ac7b4` on `#0a0a0a` | 8.16:1 | 官方暗场 accent（技术崇高 选色背书） |
| 参照 · Geist 官方主文字 `#ededed` on `#0a0a0a` | 14.87:1 | 官方对标 |

- **validator 死区门**：`--accent` 对 `--bg`/`--surface`/`--surface-2` 任一 < **3.0:1**（WCAG 大字阈值，常量 `MIN_CONTRAST=3.0`）报 P0。技术崇高 accent 最低 8.56:1，安全。
- 门限口径 = WCAG 2.x（小字 4.5:1 / 大字 3.0:1）∩ Stripe 官方（小字 5 级 / 大字 4 级）。

---

## 5 · 锁定要点（一屏速览）

- **色**：近黑画布 `#11161B`（非纯黑·带蓝色温）+ 三层面靠亮度分层；文字三档明度 `#E8EEF2`/`#7E8A94`/`#525C66`；单一信号青 `#3FD6C2`（H172·≤10%·与 Geist 官方 teal H172–174 同源·10.06:1）；语义 warn/danger/illus；暗场三档明度均标实测对比。
- **字**：Geist Sans 可变轴(100–900) + Geist Mono(OFL)；关键标题 `--w-title:510`；hero 细体300+负字距；mono 承载全部数据/KPI/页码/坐标轴；OT 用 NPM/zip 版；不引 Inter/Söhne。
- **间距**（设计决策 双轨）：**主刻度** 8px 节拍 `8/16/24/32/48/64/80/96/160`（流式 margin/padding/gap）；**细档例外轨** 4pt `4 / 12 / 20`（`--sp-fine-*`，仅组件内部/紧凑/图标-文字/≤14px 小字行内）；**绝对定位** top/left/… 光学摆位、豁免栅格。主刻度仍不含 4 与 12（细档非主刻度成员）。
- **网格**：16:9 画板 1280×720 · 16 栏 · gutter 24 · pad 80。
- **线条**：hairline `rgba(255,255,255,.10/.05)` 半透明前景色（随底色呼吸）。
- **圆角**：全系 **0px**（决策④）。
- **阴影/层叠**：默认 `none`，靠 surface 亮度差 + hairline（shadow-as-border）；浮起卡才用极淡叠层 ring。
- **动效**：`--ease:cubic-bezier(.22,1,.36,1)` · `--dur-fast:.15s` · `--dur-base:.28s`（<300ms 守公理7）。
- **渐变**：决策③ **首发禁** Stripe 式签名渐变，纯暗场冷光。

---

## 附录 A · 对比度复算脚本（node 可跑，验证非目测）

```js
// 用法：node contrast.mjs  —— 复算本文件所有对比度
function hexToRgb(hex){hex=hex.replace('#','');if(hex.length===3)hex=hex.split('').map(c=>c+c).join('');return[0,2,4].map(i=>parseInt(hex.substr(i,2),16));}
function lum([r,g,b]){const a=[r,g,b].map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];}
function ratio(c1,c2){const a=hexToRgb(c1),b=hexToRgb(c2);const L1=lum(a),L2=lum(b);return((Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05)).toFixed(2)+':1';}
const t={bg:'#11161B',surface:'#161D24',surface2:'#1C2530',ink:'#E8EEF2',inkDim:'#7E8A94',inkFaint:'#525C66',
         accent:'#3FD6C2',warn:'#F2B23E',danger:'#FF5C5C',illus:'#8A7CC2',deepBlue:'#3D7BFF',amber:'#FF8A3D'};
for(const[k,v]of Object.entries({
  'ink/bg':[t.ink,t.bg],'inkDim/bg':[t.inkDim,t.bg],'inkFaint/bg':[t.inkFaint,t.bg],
  'accent/bg':[t.accent,t.bg],'accent/surface2':[t.accent,t.surface2],
  'warn/bg':[t.warn,t.bg],'danger/bg':[t.danger,t.bg],'illus/bg':[t.illus,t.bg],
  'deepBlue/bg':[t.deepBlue,t.bg],'amber/bg':[t.amber,t.bg]}))
  console.log(k.padEnd(16),ratio(v[0],v[1]));
```

## 附录 B · 取证源清单
- 【官方】`vercel.com/geist/colors`（web-reader 渲染纯文本：10 色阶/1–10 步级语义/2 背景/P3）
- 【官方】`vercel.com/font`（OFL / OT 特性须 NPM·zip 版 / 设计定调原文）
- 【官方包】`npm pack geist@1.7.2` → `dist/sans.js`（`weight:"100 900"` 可变轴）、`dist/fonts/*`（全字重清单）
- 【官方色阶镜像】`npm pack geist-colors@1.0.0` → `gray-dark.css`/`teal-dark.css`/`background-dark.css`/`amber|red|green-dark.css`（HSL+OKLCH 暗场真值）
- 【官方】`linear.app/now/how-we-redesigned-the-linear-ui`（LCH / 3 变量 / 亮度分层 / Inter Display）
- 【官方】`stripe.com/blog/accessible-color-systems`（CIELAB / 小字 4.5 大字 3.0 / 5 级·4 级规则）
- 【社区】mobbin/brandcolors（Stripe blurple `#635BFF` 现行，2026.03）
- 【待证】Geist 网页纯文本 hex（JS 渲染不可得，已用官方包补）、Geist 按钮像素高、代码块 token、Linear 噪点、Stripe `#533afd`/Söhne/插画指南、text-autospace 支持度、9/12/15 计数

---

## 构成主义 theme（data-theme="constructivist" · 亮底信念方言）

> 第二视觉人格锁定令牌——与 设计决策 / `templates/deck-constructivist.html` 的 `:root[data-theme="constructivist"]` **1:1**。
> **一 deck 一人格**：用此 theme 的 deck 全程亮底米白 + 单信号红，与技术崇高 暗底**二选一**（非同 deck 混用，见 设计规范 订正）。对比度均 WCAG node 实测。

| token | 值 | WCAG 实测 |
|---|---|---|
| `--bg` | `#F2EDE3`（米白纸） | 底面 |
| `--ink` | `#16120D`（暖近黑） | 墨 on 米白 = **15.98** AAA |
| `--accent` | `#C81E2C`（构成红 · 单信号色） | 红 on 米白 **4.89** AA；白 / 米白 on 红 **5.71 / 4.89** |
| `--accent-deep` | `#7A1320`（酒红） | 暗部 / 层次 / hover |
| `--accent-hot` | `#E2331A`（朱红） | **仅大字 / 图形 ≥3:1**，禁正文（可选） |
| `--hairline` | `rgba(22,18,13,.16)` | 亮底 = 暖墨透明（非技术崇高 的白透明） |

- **字体**：`--font-display "Smiley Sans"`（得意黑 · hero 专用 · 压缩斜体）；CJK 显示 = Glow Sans SC Compressed ExtraBold；CJK 正文 = Glow Sans SC（Normal）；拉丁 / mono = Geist / Geist Mono（沿用）。全 OFL · 本地 woff2 · **按内容子集**（设计决策 字体覆盖门 + `subset-fonts.mjs`）。
- **几何**：圆角 `0`（跨主题共性）；**8pt 主刻度不变** `{8,16,24,32,48,64,80,96,160}`（构成主义同守，不另立刻度）。
- **非对称边距**：左右 `80` / 顶 `72` / 底 `104`（标题落光学中心略偏上 · Tschichold canon）——属版式定位令牌，非流式间距刻度。
- **签名基元**：红场（route 乙 · 收敛裹内容 · 消 trapped void），纯 CSS（本人格签名无需 AI/SVG 降级）。

## 信息·数据设计 theme（data-theme="info-data" · 亮场解释方言）

> 第三视觉人格锁定令牌——与 设计决策 / `templates/deck-info-data.html` 的 `:root[data-theme="info-data"]` **1:1**。
> **一 deck 一人格**：用此 theme 的 deck 全程冷白 + 靛蓝单信号 + 暖橙点睛，与技术崇高 暗底 / 构成主义米白**三选一**。对比度均 WCAG node 实测。

| token | 值 | WCAG 实测 |
|---|---|---|
| `--bg` | `#FAFBFC`（冷白 · 数据画布） | 底面 |
| `--ink` | `#1a1f29`（墨） | 墨 on 冷白 = **15.94** AAA |
| `--accent` | `#1A4F9C`（靛蓝 · 信号主 / 数据线） | 靛 on 冷白 **7.67** AAA；冷白 on 靛 7.67（靛底白字合法） |
| `--accent-hot` | `#D85A30`（暖橙 · 关键高亮） | on 冷白 **3.74 · 仅大字/图形 ≥3，禁正文**；禁叠靛蓝上（2.05） |
| `--seq-1..7` | `#E8EEF6 #B9CDE6 #7FA3CE #3E6FB0 #1A4F9C #123A75 #0C2A52` | 单色顺序板（明度梯度编码数据大小）；深阶 #123A75 **10.74** / #0C2A52 **13.80** 可做文字 |
| `--ink-dim` | `#6a6a62`（次级文字 / 轴标） | on 冷白 **5.26** AA |
| `--ink-faint` | `#9a9a92` | on 冷白 **2.73** — **仅网格/极次要数据，不得做轴标文字** |
| `--data-mute` | `#C2C2BA`（灰阶降噪 · 次要数据线） / `--grid #E2E2DA` / `--hairline rgba(26,31,41,.14)` | 辅助/降噪层 |

- **字体**：`--font-data "Source Sans 3"`（Adobe humanist sans · 默认 lining tabular figures · node 实测数字等宽 472 · 区别技术崇高 几何 Geist）；CJK = Glow Sans SC（复用 · 守禁思源裸用）；mono 沿用 Geist Mono。全 OFL · 本地 woff2 · 按内容子集 + cmap 覆盖门。
- **几何**：圆角 `0`（跨主题共性）；**8pt 主刻度不变** `{8,16,24,32,48,64,80,96,160}`。
- **签名基元**：标注层即论证（annotation-as-argument · 引导线 + 判断标注 + 对比高亮/灰阶降噪），纯 CSS/SVG（无 AI/SVG 降级链）。
- **单信号纪律**：靛蓝主 + 单一暖橙强调；顺序板是单色相梯度，非多色。守『绝不做』禁多信号色/彩虹/Spectral。

## 时尚奢侈极简 theme（data-theme="luxury-minimal" · 暖白克制方言）

> 第四视觉人格锁定令牌——与 设计决策 / `templates/deck-luxury.html` 的 `:root[data-theme="luxury-minimal"]` **1:1**。
> **一 deck 一人格**：用此 theme 的 deck 全程象牙白裸底 + **零信号色**（唯一无 `--accent` 人格），与技术崇高 暗底 / 构成主义米白 / info-data 冷白**四选一**。对比度均 WCAG node 实测（附录 A 同款脚本，已自检复算技术崇高 15.54 / info-data 15.94 一致）。

| token | 值 | WCAG 实测 |
|---|---|---|
| `--bg` | `#F6F4EE`（象牙白 · 裸色暖底 · 退后托留白） | 底面 |
| `--ink` | `#1A1815`（炭黑 · 主文字） | 墨 on 象牙白 = **16.11** AAA |
| `--ink-dim` | `#6E6450`（暖灰次文 · 调暗自 mockup 示意 #A89A82=2.51<AA） | on 象牙白 **5.30** AA · 可作次要正文/元数据 |
| `--ink-faint` | `#A89A82`（更淡暖灰 · 原 mockup 次文值降级为 faint） | on 象牙白 **2.51** — **<AA · 仅装饰/极次要（eyebrow/注脚），不承载正文** |
| `--hairline` | `#B89A6E`（驼色淡线 · felt not seen 隐藏精密） | on 象牙白 2.42 · **非文字（线）· 记录不强制** |
| `--veil` | `#9C7C4A`（薄纱锚驼 · 实际作低透明度覆图层） | 实色 on 象牙白 **3.54 · 过大字/图形门 ≥3**（薄纱锚参考，非正文） |
| `--surface` | `#EFEBE1`（图像区裸色 · 比 bg 略深的暖裸 · 薄纱 hero 图占位/周边底） | 层差 on 象牙白 1.08（非文字区 · 记录）；`--ink` on surface **14.88** 通过 |

- **零信号色（唯一无 `--accent` 人格 · 本人格最强区隔轴之一）**：本人格**不设 `--accent` token**——前三人格各有 accent 承担"强调/状态"语义（compute 电光青 / constructivist 红 / info-data 橙），本人格反着来。驼色由 **`--veil`（薄纱锚）+ `--hairline`（线）** 承载，**不承担强调/状态语义**（不亮、不饱和、不报错/重点）。强调改靠**无色强调语法**：留白隔离 + 字号/字重克制对比 + 位置（设计规范）。守 设计原则『禁多信号色』红线；validator 第 3 门（禁 accent · 实现期）的语义依据。
- **字体**：`--font-veil "Playfair Display"`（Didone · 高对比衬线薄纱锚 · OFL 保底，真 Didone 授权 follow-up）；正文静默 = `--font-sans "Geist"`（拉丁 · 复用）+ `--font-cjk "Glow Sans SC"`（中文 · 复用 · 守禁思源裸用）；mono 沿用 Geist Mono。**零新中文字体债**（中文薄纱宋体按需再加 · 不首发）。全 OFL · 本地 woff2 · 按内容子集 + cmap 覆盖门（per-deck 后缀 `.luxury` · 走 设计决策 fail-soft）。
- **几何**：圆角 `0`（跨主题共性）；**8pt 主刻度不变** `{8,16,24,32,48,64,80,96,160}`。
- **`--grid` 取舍**：本人格**不设独立 `--grid` token**——网格隐形（felt not seen · 设计规范「极致留白 · 版式骨架不显形 · 无标尺线」）；「光学标尺线」属技术崇高派方言、永久弃于本人格。
- **签名基元**：① 机器强制的极致克制纪律（identity coherence · 跨变长内容同一克制人格）；② 字体薄纱（typographic veil · 低透明覆图层 · 永不与主文字交叠 · 设计规范）。纯 CSS（本人格签名无需 AI/SVG 降级）。
- **暖不选纯无彩**（团队拍板）：纯无彩黑白最易撞「AI 默认脸」且离 info-data 冷白近；暖调 = Loro Piana 独特，与前三人格全拉开。

## De Stijl 新造型主义 theme（data-theme="de-stijl" · 浊三原色秩序方言）

> 第五视觉人格锁定令牌——与 设计决策 / `templates/deck-de-stijl.html` 的 `:root[data-theme="de-stijl"]` **1:1**。
> **一 deck 一人格**：用此 theme 的 deck 全程暖纸白主导（60–90%）+ 浊三原色判断锚（≤10% 面积）+ 粗黑线正交网格，与技术崇高 暗底 / 构成主义米白 / info-data 冷白 / luxury 象牙白**五选一**。对比度均 WCAG 2.x node 实测（附录 A 同款脚本，已自检复算技术崇高 15.54 / luxury 16.11 口径一致）。
> **浊历史颜料原色，非纯数码 RGB**（设计规范：满饱和纯 RGB = 幼儿园/daycare 语义，证据排除）——三色饱和度全压 ≤0.70（HSL S），超则继续加白调浊。

| token | 值 | WCAG / 饱和度 实测 |
|---|---|---|
| `--bg` | `#F4F1E8`（暖纸白 · 底面主导 60–90%） | 底面 |
| `--ink` | `#1A1815`（暖黑 · 主文字 + 粗黑线） | 墨 on 纸白 = **15.69** AAA；黑线 on 纸白 **15.69**（结构极清晰） |
| `--ds-red` | `#B5392B`（浊砖红 · 核心判断锚 · 设计规范） | **纸白 on 红 5.19** AA（红块强制反白·实渲染用 `var(--bg)` 纸白 #F4F1E8 非纯白 #fff·对齐 deck 版式块·守实事求是）；饱和度 **0.62**（≤0.70）。⚠️ 黑字 on 红仅 **3.02**（过大字/图形门 ≥3，禁正文小字） |
| `--ds-yellow` | `#DDBB5E`（浊镉黄 · 次级锚 · 调浊自暂定 #E3B93E=饱和0.75 超门） | **黑字 on 黄 9.57** AAA（黄块强制黑字）；饱和度 **0.65**（≤0.70）。⚠️ 黄 on 纸白仅 **1.64**、白字 on 黄 **1.85** → **黄禁承载小字、只做色块/大字图形**（预警闭环，类比 luxury `--ink-faint` 退装饰） |
| `--ds-blue` | `#28466E`（浊钴蓝 · 数据锚 · 设计规范） | **纸白 on 蓝 8.48** AAA（蓝块强制反白·实渲染用 `var(--bg)` 纸白 #F4F1E8 非纯白 #fff·对齐 deck 版式块·守实事求是）；饱和度 **0.47**（≤0.70）。⚠️ 黑字 on 蓝仅 **1.85**，禁（须反白） |
| `--ink-dim` | `#726E62`（暖灰次文 · 调暗自暂定 #9A968C=2.61<AA） | on 纸白 **4.51** AA · 可作次要正文/元数据（极少用 · 非色补充） |
| `--ink-faint` | `#9A968C`（暖灰 · 原 spec 暂定次文值降级为 faint） | on 纸白 **2.61** — **<AA · 仅装饰/极次要（eyebrow/注脚），不承载正文** |

- **本人格无 `--accent`（第二个破「单信号色」共性的人格 · luxury 零信号色之后）**：色彩 accent 由**三原色封闭系统**（`--ds-red` 核心判断 / `--ds-blue` 数据 / `--ds-yellow` 次级）承担，**无第四信号色**。三原色是**受约束系统色**（neoplastic palette · Schoenmaekers《造型数学原理》1916「三本质色=黄蓝红」为形而上学常量），非「随手多信号」——正当性三层（哲学封闭系统 / van Doesburg 1924 引对角→Mondrian 斥 heresy 退出的历史铁律 / 面积 ≤10% 比单信号色更克制），设计决策。守 设计原则『禁多信号色』精神（「有意义的色」非「花哨多色」）；validator `ds-palette-discipline`（禁第四色/中间色橙绿紫）+ `ds-saturation-cap`（挡纯 RGB 满饱和）门的语义依据。
- **原色 = 判断/信息承载，非装饰**：每页一主二从（红主 / 蓝黄从）、永不等权并置；原色矩形面积 ≤10%（Mondrian《Composition 1930》实测红≈蓝 9 倍·色块漂浮白底）。红/蓝块落**白字**、黄块落**黑字**（实测锚定上表四组对比）。
- **字体**：`--font-geo "Space Grotesk"`（西文几何无衬线 · 类 Futura 全正交无曲线 · **全大写标题**锚 van Doesburg 1919 De Stijl 方块字母 · OFL · 全字 woff2 本地打包走 Geist 模式·不进 CJK 子集表）；正文静默 = `--font-sans "Geist"`（拉丁 · 复用）+ `--font-cjk "Glow Sans SC"`（中文 · 复用 · 几何方正感 · 守禁思源裸用）；mono 沿用 Geist Mono。数字 tabular（数据承载对齐）；字重偏粗呼应粗黑线（正文 ≥400 守共性）。全 OFL · 按内容子集 + cmap 覆盖门（per-deck 后缀 `.de-stijl` · 走 设计决策 fail-soft · 字体登记见 `subset-fonts.mjs`）。
- **几何**：圆角 `0`（跨主题共性 · **De Stijl 禁曲线**强化）；**8pt 主刻度不变** `{8,16,24,32,48,64,80,96,160}`（不另立刻度）。
- **线宽**：复用全局 `--line-w:1px`（次线 `--line-thin`= `--line-w-hair:0.5px`）；**粗黑线主轴**由布局以 `--ink` 实色描边承载（具体粗细落 deck 实现 · 非令牌常量）。
- **签名基元**：① 机器强制地板（5 门：`ds-no-diagonal` 禁对角撞构成主义命门 / `ds-palette-discipline` / `ds-primary-area` ≤10% / `ds-saturation-cap` / `ds-content-bearing` 网格区须真内容）；② art-direction 天花板（正交信息网格 · 原色判断锚 · 正交主轴）。纯 CSS（本人格签名无需 AI/SVG 降级）。
- **区隔构成主义**（1920s 几何最大撞车 · 史实正当性）：线**只水平/垂直禁对角**（vs 构成主义对角动势）· 色**红黄蓝三原色**（vs 红黑）· **静态非对称平衡**（vs 蒙太奇运动）。

## 编辑主义 theme（data-theme="editorial" · 暖纸黑衬线 + 单编辑红方言）

> 第六视觉人格锁定令牌——与 设计决策 / `templates/deck-editorial.html` 的 `:root[data-theme="editorial"]` **1:1**。
> **一 deck 一人格**：用此 theme 的 deck 全程暖纸白底（60–90%）+ 暖黑衬线富密度正文 + **单一编辑红 accent（≤10% 面积）** + 细分栏线杂志网格，与技术崇高 暗底 / 构成主义米白 / info-data 冷白 / luxury 象牙白 / De Stijl 暖纸白**六选一**。对比度均 WCAG 2.x node 实测（附录 A 同款脚本，已自检复算技术崇高 15.54 / luxury 16.11 口径一致）。
> **身份是衬线 + 富密度，红只是杂志 accent 非主体**（设计规范）——编辑红面积 ≤10%，承载强调/红锚/起始大写，**绝非主色块**；强调主要靠衬线排印层级（字号/字重/分栏/留白），红是收口的权威点睛。

| token | 值 | WCAG / 区隔 实测 |
|---|---|---|
| `--bg` | `#ECE5D6`（暖砂 · 杂志暖纸底 · 根治与 De Stijl `#F4F1E8` 撞色、仍暖） | 底面 · 背景暖砂 `#ECE5D6`·ΔE-vs-DeStijl=**5.33**（≥5 机检承诺·护城河区隔）·a*≈0（−0.16）守不蹭 FT |
| `--ink` | `#1A1612`（暖黑 · 衬线正文 + 主墨 · 暖向偏红棕 HSL[30,.18,.09]，比 luxury/De Stijl `#1A1815` 更暖） | 墨 on 暖砂 = **14.34** AAA |
| `--ink-mid` | `#5C5048`（暖灰中文 · 副文/导语/图注次级） | on 暖砂 **6.21** AAA · 可作次要正文 |
| `--ink-dim` | `#6E5F54`（暖灰次文 · 元数据/eyebrow/页眉页脚） | on 暖砂 **4.89** AA · 可作次要正文/元数据 |
| `--ed-red` | `#9E2B22`（**单编辑红 · 杂志权威 accent ≤10%** · 偏深稳暗暖砖 HSL[4,.65,**.38**]） | **红 on 暖砂 5.93**（≥3 大字门·accent 可见·≥4.5 AA）；**暖砂反白 `var(--bg)` on 红 5.93** AA（红块/红条强制反白·用 `#ECE5D6` 暖砂非纯白 `#fff`·对齐前人格实事求是口径）。⚠️ 黑字 on 红仅 **2.63**（<大字门 3·禁正文，红块须反白） |
| `--rule` | `#D8D0C2`（细分栏线 · 杂志正交网格暖驼灰 · felt 杂志骨架） | on 纸白 1.27（**非文字（线）· 记录不强制**）；`--ink` on rule 12.6（线上若压字仍可读） |

- **本人格 accent = 单一编辑红（守『禁多信号色』共性·杂志 accent 非多信号）**：与 luxury 零 accent / De Stijl 三原色封闭系统 / info-data 靛蓝+橙 不同——本人格**只有一支 `--ed-red`** 承担全部强调/状态/红锚语义，是**单信号色**（magazine accent · 杂志权威点睛），≤10% 面积。守 设计原则『禁多信号色』红线；validator（editorial 单 accent 门 · 实现期 Task）的语义依据。**身份不靠红**：衬线字体 + 富信息密度 + 分栏网格才是人格命根，红是收束判断的点睛锚（设计规范「红只是 accent 非主体」）。
- **编辑红区隔三红（明度轴为主·node 实测）**：本红 L=**0.38** 是**全谱最深稳的权威红**——vs 构成主义革命红 `#C81E2C`（L=0.45 亮正红·RGB Δ45）、De Stijl 浊砖红 `#B5392B`（L=0.44 暖砖·RGB Δ28·最近邻但靠明度 0.38<0.44 + 红通道 158<181 区隔出"更暗更凝的杂志红"非同砖）、构成主义酒红 `#7A1320`（L=0.28 暗酒红·RGB Δ43）。偏暖（hue 4°）+ 偏深（L 0.38）= 杂志编辑权威感，与三红视觉一眼分得开。
- **反白用 `var(--bg)` 暖砂非纯白**（对齐 De Stijl / constructivist 实事求是口径）：红块/红条上的反白字用 `--bg #ECE5D6` 暖砂（实测 5.93 AA），**非** `#fff`（虽更高，但暖砂反白与全 deck 暖纸调一致、不刺、守实事求是）。
- **字体（设计规范 · 拉丁衬线身份 + CJK 暖宋 + 数据无衬线）**：
  - `--font-serif "Source Serif 4 SmText"`（拉丁正文衬线 · 光学 SmText 视觉尺寸为屏幕/投影密度优化 · OFL · 全字 woff2 本地打包 · 实现期 已登记）= **人格身份字**；
  - `--font-cjk "Source Han Serif SC"`（中文正文暖宋 · 思源宋体 SC · **栈尾补系统宋体 `Songti SC`/`SimSun` fallback 但首选打包字** · 防 De Stijl 那类字体泄漏 · `.editorial` 按内容子集 · 实现期 已登记）；
  - `--font-data "Libre Franklin"`（数据/标签/页码/图注 无衬线 · 与衬线正文角色二分 · OFL · 全字 woff2 本地打包 · 实现期 已登记）；
  - `--font-display var(--font-serif)`（大标题 = Source Serif 4 SmText Semibold · 真 Display 光学视觉尺寸待 follow-up，先指回 SmText 不另引债）。
  - mono 如需沿用 Geist Mono（复用）。全 OFL · 本地 woff2 · 按内容子集 + cmap 覆盖门（per-deck 后缀 `.editorial` · 走 设计决策 fail-soft · 字体登记见 `subset-fonts.mjs`）。
- **字号地板令牌（设计规范 命根工程 · 守投影可读 · 暂定值待实测锁）**：
  - `--body-floor-latin: 24pt`（拉丁正文字号地板 · **暂定 · 实现期 投影实测锁定 · 非 WCAG 法定阈值**）；
  - `--body-floor-cjk: 19pt`（中文正文字号地板 · **暂定 · 实现期 投影实测锁定 · 非 WCAG 法定阈值**）。
  - 注：字号地板守"投影可读 + 富密度仍不缩到看不清"，**非** WCAG 对比度法定阈值（设计规范 诚实边界）——具体值待 实现期 实现期投影实测校准后锁定。
- **几何**：圆角 `0`（跨主题共性）；**8pt 主刻度不变** `{8,16,24,32,48,64,80,96,160}`（编辑主义同守，杂志分栏靠网格列宽不另立刻度）。
- **线条**：`--rule #D8D0C2`（细分栏线 · 杂志正交网格暖驼灰 · 比全局 `--hairline` 实色、承载"杂志栏分隔"语义）；复用全局 `--line-w:1px` / `--line-w-hair:0.5px` 线宽常量。
- **签名基元**：① 机器强制地板（单编辑红 ≤10% accent 门 / 衬线身份 / 字号地板投影可读 · 实现期 Task 落 validator）；② art-direction 天花板（杂志分栏富密度排印 · 编辑红权威锚 · 衬线层级即论证）。纯 CSS（本人格签名无需 AI/SVG 降级）。
- **区隔其余五人格**：身份=**衬线 + 富信息密度 + 杂志分栏**（vs 技术崇高/info-data/De Stijl 全无衬线、luxury 极致留白疏、constructivist 压缩黑体）；色=**单编辑红深稳权威**（vs constructivist 亮革命红 / De Stijl 三原色 / info-data 靛橙 / luxury 零色）；暖砂底与 De Stijl 暖纸白 ΔE=**5.33**（≥5 机检承诺·根治撞色·护城河区隔）·a*≈0 守不蹭 FT（`#ECE5D6` vs `#F4F1E8`）。

## 演示禅×阴翳×MUJI空 theme（data-theme="zen" · 暖墨黑「第二种黑」+ 近零彩色方言）

> 第七视觉人格锁定令牌——与 `templates/deck-zen.html` 的 `:root[data-theme="zen"]` **1:1**。
> **一 deck 一人格**：用此 theme 的 deck 全程**暖墨黑底**（唯一暗底信念方言 · 跳出前六套暖纸/冷白窄域）+ **纸白从墨中显形** + **焦点 glow 白**（"空/容器"）+ **近零彩色**（强调靠字重 + 明度·不靠色），与技术崇高 冷科技黑 / 构成主义米白 / info-data 冷白 / luxury 象牙白 / De Stijl 暖纸白 / editorial 暖砂**七选一**。对比度均 WCAG 2.x node 实测（附录 A 同款脚本，已自检复算技术崇高 15.54 / editorial 14.34 口径一致）。
> **暖墨黑「第二种黑」非纯黑/非冷蓝黑**（设计规范：阴翳是"温暖的暗"·谷崎润一郎）——底色 HSL 暖向（H42·b\*+5）防"冷丧/压抑"，与 compute 冷科技黑（L7·b−4·密网格数据画布）ΔE 10+ 一冷一暖硬区隔。

| token | 值 | WCAG / ΔE 实测 |
|---|---|---|
| `--bg` | `#211E17`（暖墨黑 · 底面主导 · 墨为 void · L\*11.37·HSL[42,.18,.11] 暖非冷） | 底面 · ΔE-vs-compute=**10.56**（≥10 机检承诺·"第二种黑"硬区隔·见下 ΔE 体检行） |
| `--bg-void` | `#14100B`（最深墨 · 明度弧谷底 · L\*~6 · 暖向 R>G>B 不丧 · **仅 `zen-closing` 收束页用**） | 收束=静止「隐入最深的墨」专用底（终极审计节奏 restructure·全 deck 明度弧谷底）· 纸白 on `--bg-void` 对比 >13.13（更暗底对比更高·文字仍 AAA·零可读风险）· 极暗 near-zero-color 豁免 |
| `--ink` | `#EAE4D7`（纸白 · 主文字 · 从墨中显形 · HSL[41,.31,.88] 暖白非纯白防 halation） | 纸白 on 暖墨黑 = **13.13** AAA（高对比利暗底投影·命根工程 设计规范 反证①守法） |
| `--ink-soft` | `#B3A997`（次级暖灰 · 副文/导语/图注次级 · 极少用·禅克制） | on 暖墨黑 **7.16** AAA · 载义次级文字·暗底投影须 AAA 7:1（设计决策 提自 #9A9081/5.29 AA·真机投影质疑驱动） |
| `--glow` | `#F4EFE4`（焦点白 · 更亮 · "空/容器"·Hara white=色彩逃逸后的丰盈 · 强调靠明度） | glow on 暖墨黑 **14.50** AAA（焦点白比主文字更亮·"念"被明度激活·设计规范 天花板） |
| `--mat` | `#C2B393`（材质点暖 · kraft/谷崎金箔感 · **稀用**·阴翳里发光 · HSL[41,.28,.67]） | mat on 暖墨黑 **8.05** AAA（材质块可见）；**墨字 `var(--bg)` on mat 8.05** AAA（材质块上压字强制墨字·守实事求是）。⚠️ 纸白 on mat 仅 **1.63**（<AA·材质点上禁压浅字·只做色块/大字或压墨字·类比 De Stijl 黄块强制黑字·editorial 红块反白纪律） |

- **ΔE76 体检（zen `--bg` vs 全六人格底色·区隔承诺 ΔE≥5·尤其 vs compute ≥10·node 实测）**：vs **compute** `#11161B` = **10.56**（≥10 ✓·"第二种黑"·Lab L\* 11.37 vs 6.97 一暖一冷）；vs constructivist `#F2EDE3` = **82.51**；vs info-data `#FAFBFC` = **87.40**；vs luxury `#F6F4EE` = **84.85**；vs de-stijl `#F4F1E8` = **83.78**；vs editorial `#ECE5D6` = **79.79**。**min ΔE = 10.56（vs compute·全六人格全 ≥ 区隔门）**——暗底直接跳出暖纸五套窄域，根治"七套色系收敛"系统性隐患（2026-06-26 评审指出·设计规范）。
- **近零彩色 accent（守『禁多信号色』共性·本人格最强区隔轴之一）**：本人格**不设彩色 `--accent` token**——强调**靠字重（300↔600 真字重对比）+ 明度（`--glow` 焦点白）**，不靠色。`--mat`（材质点暖 kraft/金箔）**稀用**·只作"阴翳里发光"的极克制材质，**不承担强调/状态语义**（不亮不饱和不报错·同 luxury `--veil` 定位）。守 设计原则『禁多信号色』红线（"光只从墨中显，不滥彩"=这里同构于 De Stijl"红只作墨水非块"）；validator `zen-near-zero-color`（像素测彩色面积上限·实现期）的语义依据。
- **暗底可读（命根工程·设计规范 反证① 投影加固）**：纸白 on 暖墨黑 WCAG **AAA**（13.13·高对比利投影·reduces glare）；**次级灰守 AAA（7.16·载义次级文字暗底投影地板由 ≥AA 4.5 提到 ≥AAA 7:1·真机"观众投影看得清吗"质疑驱动）**；焦点 glow 守对比（14.50）。三档全 node 实测·守"暗底 + 极致留白的投影可读"反证（字号地板 + WCAG AAA + glow 焦点 + `zen-dark-readable` 门四件套兜底）。氛围元素（章序水印/枯山水耙痕/涟漪）刻意极淡=阴翳"若隐若现"·不载义·投影下优雅降级（一念由 AAA 大字扛）·非 bug。
- **字体（设计规范 · refined 日系无衬线 · 区隔 info-data humanist sans）**：CJK = `--font-cjk "Source Han Sans SC"`（思源黑体 SC·refined 日系 gothic·MUJI 调·ma/字间克制·栈尾补系统 `PingFang SC` fallback 但首选打包字·防字体泄漏）；Latin = `--font-sans` 配套 refined sans（neutral·humanist 或 neo-grotesque·OFL·全字 woff2 本地打包）；mono 如需沿用 Geist Mono（复用）。**精确字体 实现期 走 OFL 登记锁**（同 设计决策 本地子集机制·per-deck 后缀 `.zen`·fail-soft）。**防 faux-bold**：全局 `font-synthesis:none`（继承 `ds-cjk-no-faux-bold`·中文永不合成 700·强调靠真字重 300↔600 + 明度 glow·非合成）。**防 FOUT/泄漏**：本地 woff2 子集 + preload + `font-display:optional`·改文案必重 subset（铁律）·CDP `getPlatformFontsForNode` 验大标题不落系统字。
- **区隔 info-data 的 humanist sans**（同为无衬线·最大撞车风险）：靠 ① **用法**（info-data 密排数据/图表·本套 vast ma + 一个念）② **暗墨气质**（深底浅字·vs info-data 冷白深字）③ **日系字面调**（思源黑/Zen Kaku 的 ma 感）。
- **字号地板令牌（设计规范 命根工程 · 守暗底投影可读 · 与 editorial 地板同量级·暂定值待实测锁）**：
  - `--body-floor-latin: 24pt`（拉丁正文字号地板 · **暂定 · 实现期/5 投影实测锁定 · 非 WCAG 法定阈值** · 参 editorial 同量级·暗底投影对字号更敏感不缩到看不清）；
  - `--body-floor-cjk: 19pt`（中文正文字号地板 · **暂定 · 实现期/5 投影实测锁定 · 非 WCAG 法定阈值** · 参 editorial 同量级）。
  - 注：字号地板守"暗底投影可读 + 极致留白下焦点仍看得清"，**非** WCAG 对比度法定阈值（设计规范 诚实边界·反证①）——暗底 + 极小焦点有"看不清"风险，字号地板 + WCAG AAA + glow + `zen-dark-readable` 门机器兜底；具体值待 实现期/5 实现期投影实测校准后锁定。
- **几何**：圆角 `0`（跨主题共性）；**8pt 主刻度不变** `{8,16,24,32,48,64,80,96,160}`（演示禅同守·ma 靠留白率高位与张力位摆放·不另立刻度）。
- **网格 / ma**：**以 ma 为第一性**（设计规范空是主动元素）——版面先定"空"（高留白率），再放唯一焦点于**张力位**（rule-of-thirds 交点 / 非对称配重·非死正中）；**无密集分栏线/标尺线**（演示禅=去骨架·区隔 editorial `--rule` 杂志网格 / De Stijl 粗黑线·本人格不设独立网格线 token）；复用全局 `--line-w:1px` / `--line-w-hair:0.5px` 线宽常量（円相/材质 CSS 构造按需用）。
- **签名基元**：① 机器强制地板（`zen-one-focus` P0 一图一念两头堵 / `zen-ma-ratio` 留白率高位 + 张力位 / `zen-dark-readable` 暗底 WCAG + 字号地板 / `zen-near-zero-color` 近零彩色 / `ds-cjk-no-faux-bold` 扩 · 实现期 实现期 落 validator）；② art-direction 天花板（円相 ensō + ma 間 + 一图一念 + 白从墨中显形）。CSS 构造円相/材质（border + 留口 + 微旋转 wabi-sabi / 渐变微噪谷崎阴翳·零图库·本人格签名无需 AI/SVG 降级）。
- **区隔其余六人格**：底色=**暖墨黑「第二种黑」**（唯一暗底信念方言·vs compute 冷科技黑 ΔE 10.56 一暖一冷·vs 暖纸五套 ΔE 79+ 直接跳出窄域）；强调=**字重 + 明度近零彩色**（vs compute 单电光蓝 / constructivist 革命红 / info-data 靛橙 / luxury 零色 / De Stijl 三原色 / editorial 单编辑红——本套连"单信号色"都不要·靠 glow 明度）；气质=**禅/阴翳/幽玄·温暖的暗 + 极致留白一图一念**（vs 技术崇高 科技崇高冷 / editorial 杂志富密度）。

---

*取证日期 2026-06-17（技术崇高）/ 2026-06-20（构成主义）/ 2026-06-21（信息·数据设计）/ 2026-06-23（时尚奢侈极简）/ 2026-06-25（De Stijl 新造型主义）/ 2026-06-26（编辑主义）/ 2026-06-27（演示禅×阴翳×MUJI空）· 对比度 node 实测 · 标【待证】者严禁带标签进生产。*
