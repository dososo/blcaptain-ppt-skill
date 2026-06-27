# 05 · 截图裱框（用户截图怎么美观放进 deck · 零依赖 CSS/SVG · 反伪造）

> **何时读**：`/goal` 步6 检测到用户提供了**截图/产品图**时。把"生硬贴一张图"升级成"裱好的图"（CleanShot X 式：留白衬底 + 圆角 + 投影 + 可选窗框）。
> **护城河差异**：现有方案 靠内置位图背景 + 模型操作图像；**我们用 CSS/SVG 程序化裱框**——零依赖、零 license、风格=人格 DNA、像素可控、跟随主题色。比"靠模型 P 图"更可控、更一致。
> **铁律（反伪造·宪法）**：裱框**只做容器/光学包装**——**绝不修改截图内容**（不改字、不抹水印、不伪造 UI、不拼接成"假产品图"）。截图是证据，证据不可篡改；要改内容 = 向用户索要新图，不自己造。

## 核心配方（通用骨架 · 各人格只换 token）
截图放进一个 `figure[data-slot]`，外层是**衬底容器**，内层是**截图本体**：

```html
<figure class="shot" data-ratio="16:9">
  <img src="<用户截图>" alt="<描述截图在证明什么>">
  <figcaption>图 · &lt;一句:这张截图证明什么&gt; · 来源:用户提供</figcaption>
</figure>
```
```css
.shot{
  /* 衬底 = 人格主面色的「邻近档」(略深/略浅于页底)，给截图一个"被托起"的台面 */
  background: var(--surface-2, var(--surface));
  padding: clamp(24px, 4%, 48px);        /* 留白即裱框的画框宽度·间距落刻度集 */
  border: 1px solid var(--hairline);     /* 极细台面边 */
  border-radius: 0;                       /* 圆角随人格(见下表·多数 deck=0) */
}
.shot img{
  display:block; width:100%; height:auto;
  border-radius: var(--shot-radius, 6px); /* 截图本体的圆角(软件窗感) */
  box-shadow: 0 18px 50px -12px rgba(0,0,0,.45),   /* 浮起投影 */
              0 0 0 1px var(--hairline);            /* 1px 描边压住边缘 */
}
.shot figcaption{
  margin-top: 16px; font-size: 13px; color: var(--ink-soft, var(--muted));
  letter-spacing:.02em;   /* 图注=证据说明·标"用户提供"·守证据纪律 */
}
```
> 间距（padding/margin）必须落**间距刻度集**（`00-tokens-locked.md` `--sp-*`：8/16/24/32/48/64/80/96/160），别用随手值——否则 `validate-deck` off-scale-spacing 报 P1。颜色只用 `var(--…)` token，**TOKENS 区块外禁裸 hex**（P0）。

## 可选 · 极简窗框（标"这是一个界面截图"）
需要强调"这是软件/网页界面"时，在截图上方加一条 **3 点窗控栏**（纯 CSS·零图）：
```css
.shot.chrome img{ border-radius:0 0 var(--shot-radius,6px) var(--shot-radius,6px); }
.shot.chrome::before{
  content:""; display:block; height:32px; background:var(--surface);
  border:1px solid var(--hairline); border-bottom:0;
  border-radius: var(--shot-radius,6px) var(--shot-radius,6px) 0 0;
  /* 三个圆点用 radial-gradient 画·不引图标库 */
  background-image:
    radial-gradient(circle 5px at 20px 16px, var(--hairline) 99%, transparent),
    radial-gradient(circle 5px at 40px 16px, var(--hairline) 99%, transparent),
    radial-gradient(circle 5px at 60px 16px, var(--hairline) 99%, transparent);
}
```
> 窗控点用**中性 hairline 色**，**不**用红/黄/绿（那会引入多信号色·破近零彩色/单信号纪律·且像在复刻 macOS 品牌——白标禁复刻）。

## 各人格裱框口径（换 token·守签名）
| 人格 | 衬底 | 截图圆角 `--shot-radius` | 投影 | 备注 |
|---|---|---|---|---|
| 技术崇高派 compute | 石墨 `--surface-2` | **0**（仪表台直角） | 冷光低投影 + 青 1px 描边可选 | 圆角全系 0·守仪表台气质 |
| 构成主义 constructivist | 米白 | 0（几何硬边） | 硬投影/红场托底 | 可用红场作截图衬底色块 |
| 信息·数据 info-data | 冷白 surface | 4px | 极淡投影 | 数据截图优先 chart-render 重画·非裱原图 |
| 判断震慑 luxury | 裸色 surface | 2px（克制） | 极淡长投影 | 投影≤页面克制度·不喧宾 |
| De Stijl | 暖纸白 | 0（直角秩序） | 硬投影 | 衬底可用浊三原色块(≤面积纪律) |
| 编辑主义 editorial | 暖砂 | 4px | 柔投影 | 杂志感·图注用衬线 |
| 演示禅 zen | 暖墨黑/材质 | 6px | 极淡阴翳投影 | 截图本身已是"焦点"·守一图一念·别再加噪 |

## 降级与边界
- **截图太长/太碎/含敏感信息** → 先问用户（`/goal` 步6 看物三问：想证明什么 / 要不要打码）；敏感信息**让用户自己打码后再给**，我们不替他涂（涂错=失真）。
- **没有真实截图但用户要"界面感"** → **不伪造 UI 截图**；走签名 SVG/示意图 + 标"示意"，或向用户索要真图（反伪造宪法·`SKILL.md` 流 D）。
- **数据型截图**（图表/dashboard） → 优先用 `chart-render` 按真实数据**重画**为矢量（清晰、可控、可改），而非裱一张糊位图；裱原图仅当"证明它确实长这样"时。

## 变更日志
- 2026-06-27（创立·P1）：截图裱框零依赖 CSS/SVG 配方 + 各人格口径 + 反伪造边界（只裱不改内容）。对标现有「截图背景」方案——我方走 CSS 程序化裱框（更可控·跟随主题色·零位图依赖）。`SKILL.md` 步6 图决策树「用户给截图→美观裱框」指向本文。
