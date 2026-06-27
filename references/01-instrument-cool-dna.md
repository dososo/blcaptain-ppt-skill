# 01 · 技术崇高 `instrument-cool` 视觉 DNA + design tokens

> 唯一规范来源：设计系统规范 技术崇高 + `references/00-tokens-locked.md`（令牌锁定真值）。本文件是技术崇高人格
> **token 真值以 `00-tokens-locked.md` 为准**；本文件冲突即以那份为准。已拍板 5 决策已执行：① mono=Geist Mono；② sans=Geist Sans 可变轴、关键标题中间档 `--w-title:510`（回退 500）、不引 Inter；③ 禁 Stripe 式签名渐变（纯暗场冷光）；④ 圆角全系 0px；⑤ 官方精确值已核实补全。
> 用法：生成 deck 前先读本文件确定视觉骨架；tokens 区块可直接粘进 deck 模板 的 `/* TOKENS START */` 区块。
> 铁律：颜色只能用 `var(--…)`，TOKENS 区块外不得出现裸 hex。

---

## 一、视觉 DNA（一句话与四维定位）

**第一眼独特感**：深色底上一排笔直对齐的等宽数字，左侧一条 hairline 刻度尺，只有一格被信号青点亮——像熄灯机房里唯一亮着的仪表面板。冷、精密、低饱和、有「读数感」。

**核心情绪**：精密 · 理性 · 克制的紧张（熄灯作战室里亮着的仪表台）。

**四维定位（与 其他人格 的正交差异轴，A 占的极）**：

| 维度 | A 取的极 | 数值锚 |
|---|---|---|
| 底色明暗 | 暗 · 冷（石墨蓝灰，非纯黑） | `--bg:#11161B` |
| 强调色性格 | 低饱和信号青（暗底降饱和，不振） | `--accent:#3FD6C2`，H=172 S65 L54，`hue∈[160,210]`，面积 ≤10% |
| 字体气质 | 纯无衬线 + 重度 tabular 等宽数字 | Geist Sans 可变轴 + Geist Mono（均 OFL；不引 Inter） |
| 网格性格 | 16 栏 · 密 · 对称 · 稳 | `--grid-cols:16` |

**主角规模**：小而精、对齐数字（不是巨字占屏）。
**签名元素**：刻度槽 KPI（机检签名类名 `.kpi-slot`，设计规范 /  kpi-wall；必带 `tabular-nums`）。
**图像哲学**：让图「消失」，让数据「发光」。

**定位 / 受众 / 场景**：科技/数据/工程语境的「作战室仪表台」，blcaptain 的技术身份证；面向行业内中高级读者、技术决策者（有背景知识，看 2–3 分钟）；用于科技周战报、产品数据拆解、KPI 汇报、风险/预警复盘、发布会技术段。

**不适用**：人文叙事、思想随笔、品牌情绪片、需要温度/亲和的对外沟通——冷光会拒人千里（本人格不适用）。

---

## 二、完整可粘贴 design tokens（真值）

> **唯一真值在 `references/00-tokens-locked.md` **（含 WCAG node 实测对比度、Geist 字体/可变轴核实、accent 三场景子档），与 deck 模板 的 `/* TOKENS START … END */` 区块 **1:1 一致**。
> 本文件不再另抄一份令牌（避免「两处真值漂移」——设计规范 明定「唯一真值来源」）。生成 deck 时直接粘 `00-tokens-locked.md` 的 TOKENS 区块即可。下面只速记 技术崇高的关键决策值，便于校对：

```css
/* —— 技术崇高关键令牌速记（完整版见 00-tokens-locked.md）—— */
/* 色：石墨冷底 + 单一信号青（文字三档明度均经 WCAG 实测） */
--bg:#11161B;  --surface:#161D24;  --surface-2:#1C2530;
--ink:#E8EEF2;       /* 主 · 15.54:1 on bg（近白防 halation） */
--ink-dim:#7E8A94;   /* 次 · 5.15:1 on bg（过 AA 小字门，可作次要正文/元数据） */
--ink-faint:#525C66; /* 弱 · 2.67:1（仅占位/装饰，不承载关键信息） */
--hairline:rgba(255,255,255,.10);  --hairline-2:rgba(255,255,255,.05);
--accent:#3FD6C2;    /* 信号青 H172 · 10.06:1 on bg · hue∈[160,210] · 面积≤10%（与 Geist 官方暗场 teal H172–174 同源） */
--accent-dim:rgba(63,214,194,.14);
--warn:#F2B23E; --danger:#FF5C5C; --illus:#8A7CC2;
/* 字：决策①②——Geist Sans 可变轴 + Geist Mono，不引 Inter */
--font-sans:"Geist","Geist Sans","Noto Sans SC","PingFang SC","Microsoft YaHei UI",system-ui,-apple-system,sans-serif;
--font-mono:"Geist Mono","SFMono-Regular",ui-monospace,"JetBrains Mono",monospace; /* JetBrains Mono 仅离线兜底 */
/* 字阶 1.25 · base 18 · h2 跳级 */ --fs-meta:13px; --fs-body:18px; --fs-lead:22.5px; --fs-h3:28px; --fs-h2:43.95px; --fs-h1:clamp(44px,6.4vw,86px);
/* 字重：越大越细；关键标题中间档 510 拿权威感（回退 500） */ --w-hero:300; --w-title:510; --w-body:400; --w-label:600;
/* 几何：圆角全系 0px（决策④）；暗场无投影 */ --radius:0px; --shadow:none;
/* 动效：守公理7（UI <300ms） */ --dur-fast:.15s; --dur-base:.28s; --ease:cubic-bezier(.22,1,.36,1);
/* 渐变：决策③ 首发禁 Stripe 式签名渐变（纯暗场冷光） */
```

> 注：已采用设计规范 三层 token 架构——`<html data-theme="instrument-cool" data-accent="night-cyan">`，跨主题公用常量留裸 `:root{}`，技术崇高基础 token 进 `:root[data-theme="instrument-cool"]{}` 块，三个 accent 场景子档（night-cyan/deep-blue/safety-amber）降为二级属性 `data-accent`，只切 `--accent`/`--accent-dim`/`--accent-glow`。`data-theme` 留给各套视觉人格，与 `data-accent` 互不冲突。

---

## 三、字体（OFL 开源可商用 + 回退栈）

> 决策①②已拍板执行：mono=Geist Mono、sans=Geist Sans 可变轴、**不引 Inter**（守「一支无衬线 + 一支等宽」）。详见 `00-tokens-locked.md`  / 。

| 角色 | 首选 | 回退 | 关键特性 |
|---|---|---|---|
| 标题/正文 sans | **Geist Sans**（可变轴 100–900） | `Noto Sans SC / PingFang SC / system-ui,-apple-system` | 关键标题取中间档 `--w-title:510`（回退 500）拿权威感；OT 特性须 NPM/zip 版 |
| mono 信号层 | **Geist Mono** | `SFMono-Regular,ui-monospace,JetBrains Mono`（JetBrains 仅兜底） | 含 tabular/lining，technical 身份证；与 Geist Sans 成套对标 Vercel |
| 中文 | **思源黑体 / Noto Sans SC** | `"PingFang SC","Microsoft YaHei UI"` | 离线回退保证可读 |

- 字体族总数 ≤ 2 正文族 + 1 mono = 3（validator `MAX_FONT_FAMILIES=3`，超即报 `too-many-fonts`）；技术崇高 实际只用 Geist Sans + Geist Mono = 2 族。
- **OT 特性铁律**：Geist 的 `tabular-nums`/`liga` 仅在 **NPM(`npm i geist`)/zip 版** 可用，**Google Fonts 版不支持**——刻度槽签名依赖 tabular-nums，正式产出禁用 Google Fonts 版（见 `00-tokens-locked.md`）。
- 不打包字体文件，只写安装说明；token 内置系统回退栈保证离线可读（未装字体时回退系统栈，不报错、仅字形非 Geist）。
- 不引 Söhne（Klim 付费）/ Berkeley Mono（付费）/ Inter——规避付费授权与「假装用 Söhne」红线。

---

## 四、accent 场景子档（首发 3 档，改一处全局生效）

accent 不是配色偏好，是**场景语义信号**。改 `data-theme` 一处即全局生效（deck 模板已实现）。

> dim/glow 数值以 `00-tokens-locked.md`  与 deck 模板 TOKENS 区块为准（下表与之 1:1）。

| 档 | hex | dim | 实测对比 on bg | 适用场景 |
|---|---|---|---|---|
| `night-cyan`（默认） | `#3FD6C2` | `rgba(63,214,194,.14)` | 10.06:1 | AI/科技战报、产品拆解 |
| `deep-blue` | `#3D7BFF` | `rgba(61,123,255,.16)` | 4.74:1（仅过大字 AA） | 产品发布、内部团队/路演 |
| `safety-amber` | `#FF8A3D` | `rgba(255,138,61,.16)` | 7.76:1 | 风险/事故复盘（语义专用） |

**硬约束**：
- safety-amber 不该出现在融资路演；night-cyan 不该用于事故复盘——颜色承载语义而非审美。
- accent 子档须用同一 WCAG 脚本复测后放行，不凭目测。已知：`deep-blue #3D7BFF` on `--bg` 实测 **4.74:1**，仅过大字 AA——用作小字正文须谨慎（不用于小字读数）。
- 用户只能在这 3 档里选，不能瞎填 hex（安全旋钮）。

---

## 五、A 的「炸」用法与守则

A 的「炸」是**克制的炸**：一个 KPI hero 数字在刻度槽里占屏过半，深石墨底，单点信号青只点亮「当前读数/越阈值」那一格，hairline 刻度尺横贯。数字承载真实数据（零造假），是「证据纪律 = 视觉 wow」合一的唯一形态。

守则：一页一爆点；accent 仍 ≤10%；绝不堆假 dashboard（Rams 的 honest：装饰不许伪装功能）。能量起伏靠落差，不靠每页都用力——炸页之间总隔着克制页，没有两个炸页相邻（封面与社媒卡这种合法首尾除外）。

---

## 六、参考坐标（点名，非截图）

Vercel / Linear（近黑画布 + 单一酸性高亮如「状态灯」）；FT / The Pudding / Benedict Evans（图上直标、chart junk 归零）；Palantir Q1 / Dropbox Q3 / Sonos Q2（暗·密·企业冷静的数据财报极）；Tufte 数据墨水；Crouwel New Alphabet（栅格化大数字）。

---

## 七、slide 1 文字速写（封面气质校准）

深石墨满屏。左上一行信号青 mono 小标签 `SIGNAL · 周战报`（正字距 +0.08em）。中部一句细体（weight 300）负字距大判断「鸿蒙不是替代 Android，是换掉操作系统的**定义权**」，"定义权"三字点信号青。下方一行灰导语。右下角 mono 情报戳 `HMOS-W24 · 2026.06.17 · 01/08`。无装饰、无渐变、无图——克制到只剩读数感。
