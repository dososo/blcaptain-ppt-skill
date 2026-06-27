#!/usr/bin/env node
/* =====================================================================
 * validate-deck.mjs — blcaptain-ppt-skill 单文件 deck 校验器
 * ---------------------------------------------------------------------
 * 目标：零 npm 依赖（只用 Node 内置模块 node:fs / node:zlib / node:path / node:process），
 *       纯字符串 + 正则解析 HTML，不引 jsdom/cheerio。
 *       因为 Claude API 运行环境无网络、无装包，只有零依赖才能三端可跑。
 *
 * 规范来源（唯一真值）：设计系统规范（已批准）
 *   + references/00-tokens-locked.md（令牌锁定真值，含 WCAG node 实测对比度）。
 *   对应章节： 公理 /  令牌 /  组件 /  布局库 /  叙事 /  无障碍 /
 *    validator 要校验什么（P0×5 / P1 / P2 清单）。
 *
 * 校验范围：7 套人格的版式与门
 *   另扩展，现阶段覆盖全部已实现主题)。本文件实现的是 技术崇高质量门 + 三签名指纹。
 *
 * 用法：node scripts/validate-deck.mjs <deck.html>
 *       node scripts/validate-deck.mjs <deck.html> --pretty   # 人类可读补充（写 stderr）
 *
 * 标志：
 *   --pretty  追加人类可读摘要到 stderr（不污染 stdout 的 JSON 管道）
 *   --json    无操作占位：本工具默认即输出 JSON，加不加都一样，仅为兼容历史命令
 *
 * 输出：始终向 stdout 打印一份 JSON：
 *   { file, slides, status, summary:{p0,p1,p2}, issues, next_actions }
 * 退出码：p0 > 0 → exit 1（CI/Skill 据此阻断交付）；否则 exit 0。
 *
 * 校验维度分级（对齐设计规范 P0×5 / P1 / P2 清单）：
 *   —— P0（红线 · 阻断交付）——
 *     P0  每页有 data-layout 且取值在 14 项语义白名单内
 *     P0  叙事角色完整：全 deck 至少各有一页 data-role=state/ground/act
 *         （豁免：整套 deck 仅 1 页且为 social-card 时跳过，见 SINGLE_CARD_LAYOUTS）
 *     P0  TOKENS 区块外不得出现裸 hex 颜色（令牌铁律）
 *     P0  证据块 data-evidence-type 取值合法（fact/observation/inference/illustrative；）
 *     P0  强调色可读性死区：解析 --accent 对 --bg/--surface/--surface-2 对比，
 *         < 3.0:1（WCAG 大字阈值 = 常量 MIN_CONTRAST）即报 P0。A 用低饱和信号青(≈10:1)，对比须达标。
 *   —— P1（应修 · 建议交付前修； P1 + 建议新增）——
 *     P1  每页须有 .intel-stamp（情报戳，视觉签名指纹 1；social-card 豁免）
 *     P1  用到 .kpi-slot 的 deck，其 KPI 数字须带 tabular-nums（建议新增·机检公理 4）
 *     P1  字体族 ≤ 2 无衬线/正文族 + 1 mono = 3（技术崇高 实际 Geist Sans + Geist Mono = 2；）
 *     P1  不得连续 3 页同一 data-layout（能量起伏）
 *     P1  数据图（图表/趋势线/大数字读数）缺来源或「示意」标注（不造假）
 *     P1  figure[data-slot] 须合法 data-ratio；img 须非空 alt
 *   —— P2（可选优化 · 不阻断； P2）——
 *     P2  字数密度（按 data-scene 分档：social≈60/report≈150/deck≈120，缺省 120；）
 *     P2  标题「判断句」启发式：以问号结尾且非金句页 → 告警
 *
 * ====== 第二批新增（工程规范「规则 → validator 映射」，按可行性分批落地）======
 *   每条检查头部注释标明「工程规范几节 + 防住哪个毛病 + 级别」；口径自洽：注释/常量/工程规范三处 1:1。
 *   不破坏上方任何【已实现】检查（它们一行未改）；现有合规 deck-compute.html 仍 P0=0（exit 0）。
 *   —— P0 ——
 *     P0  chart-handwritten-svg：定量图 <svg>（在 figure[data-slot] 内或自带 chart/spark/… 类）
 *         必须带 data-rendered-by="blcaptain-chart"（含 -d3 SSR 变体），否则判「手画图」
 *   —— P1 ——
 *     P1  page-missing-role：单页缺/错 data-role（SIGNAL 六档）（规则 10.1，补「单页」缺口）
 *     P1  layout-role-mismatch：data-layout×data-role 非法配对（映射表强配对）
 *     P1  page-missing-energy：data-energy 已采纳后某页缺/非法（契约一）；能量曲线 
 *     P1  cjk-min-font-size：正文类选择器 font-size <16px（16~18px 降 P2）
 *     P1  off-scale-spacing：margin/padding/gap/... 的 px ∉ 间距刻度集（令牌 --sp-* 真值）
 *     P1  line-role / accent-line-overuse：线宽 ∉{0.5,1,1.5}；一页 accent 画线 ≥2 处
 *     P1  silent-truncation：line-clamp/ellipsis（任处）或 overflow:hidden（内容容器）非豁免宿主
 *     P1  content-budget：按 data-layout 标题 width-unit / 行容器数 超预算（→压穿/溢页裁切）（设计决策·镜像 references/content-budgets.md）
 *   —— P2 ——
 *     P2  text-density-by-layout + bullets-overflow：按 data-layout 二维容量上限（字数/条数）
 *     P2  layout-energy-mismatch：data-energy ∉ 该 layout 合法集（配对表）
 *     P2  energy-not-adopted：deck 未声明任何 data-energy（提示采纳契约，不硬拦；/ D-4）
 *     P2  energy-end-not-peak：末页 data-energy 非 blast（收尾未回峰；③）
 *   —— 自测 ——  node scripts/selftest-validate-deck.mjs（每检触发/豁免断言 + deck-compute.html 现状）
 * ===================================================================== */

import { readFileSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';   // 解 woff2 容器 brotli（Node 内置·零 npm 依赖）
import { dirname, resolve } from 'node:path';        // 字体相对路径解析（Node 内置）
import { argv, exit, stdout } from 'node:process';

/* ----------------------- 配置常量 ----------------------- */

// 语义布局白名单（共 14 个，与 SKILL.md / 设计规范 一致）
// 设计决策 新增 section-divider / agenda：支持长 deck（13–25 页）分章 + 目录。
const LAYOUT_WHITELIST = new Set([
  'signal-cover', 'context-map', 'paradigm-shift', 'evidence-wall',
  'timeline-impact', 'decision-matrix', 'risk-radar', 'opportunity',
  'screenshot-intel', 'kpi-wall', 'final-move', 'social-card',
  'section-divider', 'agenda',
  // 构成主义人格版式（设计决策 · 跨人格 SIGNAL 词汇并存；section-divider/social-card 复用上行）
  'cover', 'statement', 'evidence', 'compare', 'kpi', 'process', 'final',
  // 信息·数据设计人格（设计决策 · 解释方言；final/section-divider/social-card 复用上行）
  'data-cover', 'chart-lead', 'slope-compare', 'small-multiples', 'bar-ranking', 'dumbbell', 'data-kpi', 'method-source',
  'compare-split', 'data-table', 'area-stack', 'scatter', 'waterfall', 'quote',
  // 时尚奢侈极简人格（设计决策 · 判断震慑方言：封面/量级数字/对比/图文专题/信念/引言/收束）
  'lux-cover', 'lux-magnitude', 'lux-contrast', 'lux-editorial', 'lux-conviction', 'lux-quote', 'lux-closing',
  // 时尚奢侈极简·扩展版式（20 页交付级：目录/章节/量级序列/抽言/列表/双量级/时间线/聚焦）
  'lux-index', 'lux-divider', 'lux-statrow', 'lux-pullquote', 'lux-list', 'lux-ratio', 'lux-timeline', 'lux-spotlight',
  // De Stijl 新造型主义人格（设计决策/ · 设计规范 · 秩序方言：正交信息网格 + 原色判断锚 · 15 版式）
  'ds-cover', 'ds-index', 'ds-contrast', 'ds-magnitude', 'ds-grid-content', 'ds-manifesto', 'ds-divider',
  'ds-statrow', 'ds-quote', 'ds-data-block', 'ds-timeline', 'ds-list', 'ds-ratio', 'ds-spotlight', 'ds-closing',
  // 编辑主义 Editorial 人格（设计决策 · 设计规范/ · 编辑判断方言：杂志 feature spread + 衬线命根 + 严格多栏网格 · 11 版式）
  'ed-feature-spread', 'ed-two-col', 'ed-three-col', 'ed-chapter', 'ed-index', 'ed-statement',
  'ed-quote-pull', 'ed-stat-feature', 'ed-data-grid', 'ed-timeline', 'ed-closing',
  // 演示禅×阴翳×MUJI空 zen 人格（设计决策 · 设计规范 · 空的信念方言：一图一念 + 円相 + ma 間 + 白从墨中显形 · 14 版式）
  'zen-cover', 'zen-enso', 'zen-statement', 'zen-shadow', 'zen-number', 'zen-quote', 'zen-chapter', 'zen-closing',
  // 实现期 扩建 · 6 独家「空的一图一念」版式（每个 = 不同的「空」打法·锚日本美学·强化设计独特性·根治单一感）：
  //   zen-horizon=一线/地平线(原研哉 MUJI Horizon·一线即终极 ma) / zen-ma-pair=間 diptych(两点之间的 ma 为主角) /
  //   zen-vertical=竖排(writing-mode vertical-rl·区隔全横排) / zen-karesansui=枯山水(单石+耙痕·一物被正确地看) /
  //   zen-gradient=渐变阴翳(谷崎·光从暗中渐显·一字从渐变显形) / zen-sequence=序列呼吸(多点渐变间隔·节奏即内容)。
  'zen-horizon', 'zen-ma-pair', 'zen-vertical', 'zen-karesansui', 'zen-gradient', 'zen-sequence',
]);

// 叙事角色：整套 deck 必须至少各有一页 state / ground / act（SIGNAL 链路 S/G/A 必检）。
// 注：设计规范 SIGNAL 共 6 档（state/insight/ground/narrow/act/leave），其余四档可选，
//     这里只硬卡「信号/证据/行动缺一不可」三档。
const REQUIRED_ROLES = ['state', 'ground', 'act'];

// 证据类型白名单（设计规范 立据纪律 /  / SKILL 硬约束）
const EVIDENCE_TYPES = new Set(['fact', 'observation', 'inference', 'illustrative']);

// 图片比例白名单（无障碍）
const RATIO_WHITELIST = new Set(['16:9', '4:3', '1:1', '3:4', '9:16']);

// 金句类布局：标题可用问号，豁免「判断句」启发式
const QUOTE_LAYOUTS = new Set(['social-card']);

// 单卡片豁免布局：整套 deck 只有 1 页且布局属此集合时，跳过「state/ground/act 必检」
// 与 .intel-stamp 必检——单张 social-card 长图只承载 leave 角色（见 evals/prompts.csv e05）。
const SINGLE_CARD_LAYOUTS = new Set(['social-card']);

// .intel-stamp 情报戳豁免布局：social-card 用 .social-mark 做签名条，不要求情报戳。
const STAMP_EXEMPT_LAYOUTS = new Set(['social-card']);

const MAX_FONT_FAMILIES = 3;     // ≤2 无衬线/正文族 + 1 mono 信号层 = 3 个首选族（；技术崇高 实际 2 族）
const MAX_SAME_LAYOUT_RUN = 2;   // 连续相同上限 2（出现第 3 页即违规； 能量起伏）

// P2 字数密度：按 data-scene 分档（落地为分档而非一刀切 120）。
// social 社媒压到 ~60、report 同行报告可放到 ~150、deck 通用 ~120；缺省 120。
// ⚠️ 档值口径须与本注释一致（避免「注释一档值、常量另一档值」矛盾）。
const DENSITY_BY_SCENE = { social: 60, report: 150, deck: 120 };
const DENSITY_DEFAULT = 120;

// 强调色「可读性死区」对比下限（设计规范）。
// 取 WCAG 大字阈值 3.0:1 作硬死区门：accent 只用于大号读数/关键词/eyebrow（hero KPI、.claim em、
// 巨号 KPI 等均为大字），死区拦的是「酸色压到几乎不可读」这类红线事故；
// 规格本身把 deep-blue #3D7BFF 标为「实测 4.74:1·仅过大字 AA·小字慎用」( /  矩阵脚注) ——
// 属可控不是死区，故门限取 3.0 而非 4.5，既拦死真正不可读的酸色，又不误杀规格允许的大字级 accent。
// 口径自洽铁律：本注释、常量 MIN_CONTRAST、设计规范/ 三者门限均为 3.0:1（非 4.5）。
const MIN_CONTRAST = 3.0;

// 【工程规范 白标铁律 +  机检 · 设计原则『绝不做』#1 · 防「可见层泄漏内部代号」· P0】
// 设计原则：用户产出**可见层**(eyebrow/folio/正文/title)绝不出现生产系统内部代号 / 人格命名
//   —— 等同伪造、区块外裸 hex 的一级红线（用户买的是成品，不是"我们怎么造的"）。
// 口径自洽铁律：本代号集 = 制作规范「可见层内部代号泄漏」机检项 1:1（改一处须同步另一处）。
// 只扫**可见渲染文本**(stripTags 去 <style>/<script>/标签 + 主流程 html 已 stripComments 去注释)——故
//   data-theme="constructivist" / data-rendered-by="blcaptain" 等内部属性、CSS 选择器、注释**天然不误报**(它们不渲染)。
// constructivis[mt] 兼收 -ist(人格形容词)与 -ism(艺术流派名)——实际泄漏文案为大写 CONSTRUCTIVISM。
// 诚实边界：若 deck 主题**正是**"构成主义"这一公认艺术流派、需把 Constructivism 作正文 → 属可控误报，
//   由作者判断豁免（与"禁伪造数据"门同理：红线宁可手动豁免，不可静默放过）。
const CODENAME_LEAK_PATTERNS = [
  { label: '构成主义', re: /构成主义/g },
  { label: '技术崇高派', re: /技术崇高派/g },
  { label: 'instrument-cool', re: /instrument-cool/gi },
  { label: 'blcaptain', re: /blcaptain/gi },
  { label: 'constructivist/ism', re: /constructivis[mt]/gi },
];

/* =====================================================================
 * 第二批：工程规范「规则 → validator 映射」新增机检项常量
 * ---------------------------------------------------------------------
 * 每个常量头部标明：工程规范几节 + 防住哪个毛病 + 级别。
 * 口径自洽铁律：常量值 / 本注释 / 工程规范正文三处必须 1:1，发现漂移立即修回
 * （工程规范 末「三者须保持 1:1」/ 设计系统 「禁说一套做一套」）。
 * ===================================================================== */

// 【工程规范 间距吸附刻度 · 防「位置乱（随手 17px/23px）」· P1】
// 间距刻度唯一合法集——**以 references/00-tokens-locked.md 的 --sp-* 真值为机检真值**：
//   00-tokens-locked.md:122-123 → --sp-1:8 --sp-2:16 --sp-3:24 --sp-4:32
//                                  --sp-6:48 --sp-8:64 --sp-10:80 --sp-12:96 --sp-16:160
// 即 {8,16,24,32,48,64,80,96,160}。工程规范 规则 5.2 /  八件事表 / 工程规范 D-0
// 均锁同一组、明确「不含 4/12」（设计系统正文那句带 4/12 的口语描述是与其 --sp-* token 块
// 冲突的笔误，工程规范 旁注判定「以 token 块为准」）。本 validator 据此以令牌为唯一真值。
// 0/0.5/1px 给 hairline 放行（工程规范「含 0.5/1px 给 hairline」+  线宽 {0.5,1,1.5}）。
const SPACING_SCALE = new Set([8, 16, 24, 32, 48, 64, 80, 96, 160]);
const SPACING_HAIRLINE_OK = new Set([0, 0.5, 1]); // 0/0.5/1px 不算违规（hairline/重置）
// 只对这些间距属性吸附刻度（工程规范「margin/padding/gap/top/left/...」）。
// 用前缀匹配覆盖 margin-top / padding-inline / row-gap / inset 等衍生属性。
const SPACING_PROPS = ['margin', 'padding', 'gap', 'top', 'right', 'bottom', 'left', 'inset'];
// 设计决策 间距双轨制：主刻度(SPACING_SCALE=CANON,8pt)管流式节奏；以下为受控例外。
// 注意：SPACING_FINE 名称刻意不同于 SPACING_SCALE，治理 spFromConst 只认 SPACING_SCALE，故 CANON 4 镜像仍 1:1。
const SPACING_FINE = new Set([4, 12, 20]);                       // 4pt 细档（组件内部/紧凑/图标-文字/≤14px 小字行内）
const SPACING_POSITIONAL = ['top', 'right', 'bottom', 'left', 'inset']; // 绝对定位=光学摆位，豁免栅格

// 【工程规范 中文最小字号 · 防「投屏看不清」· P1】
// 工程规范 末「字号下限硬规则…正文 ≥18px…机检：正文类元素 font-size < 16px → P1」；
//  中段另有「中文正文 ≥18px」的 P2 提示线。两条口径合并落地：
//   < 16px = P1（硬下限，撑破/看不清红线，对齐  末「正文类 <16px → P1」·业界共识禁 10-13px）；
//   16px ≤ x < 18px = P2（建议提到 18px，对齐 「中文正文 ≥18px」演示场景建议）。
// 只测「正文类」选择器，避免误伤 meta/label（工程规范「meta/label ≥14px」另档，不在此检）。
const CJK_BODY_MIN_FONT_P1 = 16; // < 16px → P1
const CJK_BODY_MIN_FONT_P2 = 18; // 16~18px → P2（建议）
// 正文类选择器关键词（命中其一即视为承载中文正文的元素）。
const CJK_BODY_SELECTORS = ['body', '.body', '.prose', '.note', '.sub', '.txt', '.lead', 'p'];

// 【工程规范 禁静默截断 · 防「文字被静默截断」· P1】
// 工程规范「禁 -webkit-line-clamp / text-overflow:ellipsis 在承载正文/标题/数据的元素上；
//   禁 overflow:hidden 在内容容器(.body/.title-block/.card)上」。
// 豁免（工程规范 原文放行集）：.figure-slot(裁图)/.grain/.bleed/显式 .truncatable(配 title 可悬停看全)。
// 工程化：纯正则无法可靠把「某条 CSS 声明」绑回「某个 DOM 元素」，故采用「选择器块」启发式——
//   扫每个 CSS 规则块，若其选择器命中宿主豁免类则放行，否则若块内出现截断声明即报。
//   行内 style 上的截断声明同样扫（宿主类同规则豁免）。本项标「启发式·可能漏报多行/嵌套」。
const TRUNCATION_HOST_EXEMPT = ['figure-slot', 'grain', 'bleed', 'truncatable'];

// 【工程规范 线条 4 角色白名单 · 防「线条乱」· P1】
// 工程规范：线宽 ∉ {0.5,1,1.5} → P1「非法线宽」（1.5 仅 emphasis-rule）；
//   border 宽 ≥2px 且不透明深色 → P1「粗实线（请改 hairline）」；accent 画线一页 ≥2 次 → P1。
const LINE_WIDTHS_OK = new Set([0.5, 1, 1.5]); // 0 放行（无边）
const LINE_THICK_PX = 2;                        // ≥2px 视为粗线（工程规范「禁 ≥2px」）
// 装饰/装订线可疑来源：border-* / outline / <hr> / 文本装饰线。focus-ring 与 hairline 技法须豁免。

// 【工程规范-B1 定量图禁手写 SVG · 防「图表烂（LLM 盲画坐标）」· P0】
// 工程规范-B1 / ：定量图表必须经锁定渲染层产出内联 SVG 并打 data-rendered-by 签名；
//   「仅非定量示意图（flow/diagram）允许手写 SVG 且须标 illustrative」。
// 触发面（命中其一即视为「定量图 SVG」，须带签名）：
//   (a) <svg> 在 figure[data-slot] 内（工程规范原文「定量 figure 内 <svg>」）；
//   (b) <svg> 自带定量图类名（chart/spark/sparkline/bar/hbar/line/area/scatter/donut/kpi-chart）。
// 签名真值（用户指定一字不差）：data-rendered-by="blcaptain-chart"（工程规范-B1 用 chart-fn|d3 作示例，
//   本系统锁定渲染层签名串统一为 blcaptain-chart；同时放行 d3 SSR 兜底签名 blcaptain-chart-d3）。
const CHART_RENDERED_BY = 'blcaptain-chart';
// 定量图类名（自带这些 class 的裸 <svg> 即被视作定量图，须带签名）。
const QUANT_CHART_CLASSES = ['chart', 'spark', 'sparkline', 'bar', 'hbar', 'line-chart', 'area', 'scatter', 'donut', 'kpi-chart', 'radar'];
// 非定量示意图豁免类名（工程规范 flow/diagram「唯一允许 AI 手写 SVG」；图标 icon 同放行）。
const NON_QUANT_SVG_CLASSES = ['flow', 'diagram', 'icon', 'arrow', 'deco', 'glyph'];

// 【工程规范 layout×role 配对 · 防「布局与角色非法配对/为多样硬加页」· P1】
// 工程规范 映射表 +  末「🆕建议机检 layout-role-mismatch」：强配对违例报 P1。
// 取值：每个 data-layout 允许的 data-role 合法集（来自  映射表「内容类型→layout→role」列，
//   含备选布局映射；signal-cover→state、final-move→act、social-card→leave 为强配对）。
// 未在表内登记的 layout（理论上已被白名单挡住）不在此检，避免双重报错。
const LAYOUT_ROLE_OK = {
  'signal-cover':     ['state'],                       // 封面强配 state
  'final-move':       ['act'],                         // 收尾强配 act
  'social-card':      ['leave'],                       // 金句卡强配 leave
  'context-map':      ['insight', 'ground'],           // 背景/语境
  'paradigm-shift':   ['insight'],                     // 对比/转变
  'evidence-wall':    ['ground'],                      // 并列证据
  'kpi-wall':         ['ground'],                      // 关键数字/KPI 墙
  'timeline-impact':  ['ground'],                      // 时间/流程
  'decision-matrix':  ['insight', 'narrow'],           // 打分型对比(insight 备选) / 收窄( 风险备选)
  'risk-radar':       ['narrow'],                      // 风险/边界
  'opportunity':      ['act'],                          // 机会/行动
  'screenshot-intel': ['ground'],                      // 截图证据
  'section-divider':  ['state', 'insight', 'ground', 'narrow', 'act', 'leave'], // 章节分隔可引任意幕
  'agenda':           ['state', 'insight'],            // 目录/议程
  // 构成主义人格（设计决策 · role 取 deck 实际 + SIGNAL 逻辑）
  'cover':            ['state'],                        // 封面=信号源
  'statement':        ['state', 'insight'],            // 宣言/判断句（信念方言核心）
  'evidence':         ['ground', 'insight'],           // 证据（立据/洞察性证据）
  'compare':          ['insight', 'narrow'],           // 对比/抉择
  'kpi':              ['insight', 'ground'],            // 巨号关键数
  'process':          ['narrow', 'ground'],            // 流程/三步
  'final':            ['act'],                          // 收尾行动
  // 信息·数据设计人格（设计决策 · role 取 deck 实际 + SIGNAL 逻辑）
  'data-cover':       ['state'],                        // 数据封面=信号源
  'chart-lead':       ['insight', 'ground'],            // 图为主角 + 标注层论证
  'slope-compare':    ['insight', 'ground'],            // 斜率图：份额/排名变化·反超
  'small-multiples':  ['ground', 'insight'],            // 小倍数阵列
  'bar-ranking':      ['ground', 'insight'],            // 横向排序条·量级排名·断层
  'dumbbell':         ['insight', 'ground'],            // 哑铃图·前后差距/分化
  'compare-split':    ['insight', 'ground'],            // 对照双栏
  'data-table':       ['ground', 'insight'],            // 表格化
  'area-stack':       ['insight', 'ground'],            // 堆叠面积
  'scatter':          ['insight', 'ground'],            // 散点/气泡
  'waterfall':        ['ground', 'insight'],            // 瀑布·增量分解
  'quote':            ['ground', 'leave'],              // 引言
  'data-kpi':         ['insight', 'ground'],            // 巨号关键数 + sparkline
  'method-source':    ['ground', 'leave'],              // 方法与来源
  // 时尚奢侈极简人格（设计决策 · SIGNAL 弧：判断震慑）
  'lux-cover':        ['state'],                         // 封面=立场信号源（Didone 刊头+判断）
  'lux-magnitude':    ['ground', 'insight'],             // 量级数字页（Hermès 大数+判断+参照）
  'lux-contrast':     ['insight', 'narrow'],             // 对比页（2 列冷淡+判断）
  'lux-editorial':    ['ground', 'insight'],             // 冷淡图文专题（大图+主标+判断+支撑）
  'lux-conviction':   ['insight', 'state'],              // 信念页（判断+稀缺留白·被前序量级垫起）
  'lux-quote':        ['ground', 'leave'],               // 引言（有出处立场）
  'lux-closing':      ['act', 'leave'],                  // 收束（判断落定）
  // 扩展版式
  'lux-index':        ['state', 'insight'],              // 目录（三章一览）
  'lux-divider':      ['state', 'insight', 'ground', 'narrow', 'act', 'leave'], // 章节分隔可引任意幕
  'lux-statrow':      ['ground', 'insight'],             // 量级序列（多坐标小数）
  'lux-pullquote':    ['insight', 'leave'],              // 抽言（大字判断）
  'lux-list':         ['ground', 'insight'],             // 编号判断列表
  'lux-ratio':        ['insight', 'ground', 'narrow'],   // 双量级并置对比
  'lux-timeline':     ['ground', 'insight'],             // 逻辑演变时间线
  'lux-spotlight':    ['insight', 'ground'],             // 单点聚焦 + 大图
  // De Stijl 新造型主义（设计决策 · SIGNAL 弧：秩序的信念·role 取 deck 实际 + SIGNAL 逻辑）
  'ds-cover':         ['state'],                          // 封面=秩序信号源
  'ds-index':         ['state', 'insight'],               // 目录/总览
  'ds-manifesto':     ['state', 'insight'],               // 宣言/判断页（秩序判断核心·封面后宣言）
  'ds-grid-content':  ['insight', 'ground'],              // 网格内容（非对称分区承载论证）
  'ds-magnitude':     ['ground', 'insight'],              // 量级页（巨数 + 原色数据锚）
  'ds-contrast':      ['insight', 'narrow'],              // 对照页（混乱 vs 秩序双区对置）
  'ds-data-block':    ['ground', 'insight'],              // 数据墙（网格 + 原色数据块编码）
  'ds-timeline':      ['insight', 'ground'],              // 标准演进（正交时间轴）
  'ds-quote':         ['state', 'ground', 'leave'],       // 引言（克制留白 + 全大写引语·可作信号/收束）
  'ds-divider':       ['state', 'insight', 'ground', 'narrow', 'act', 'leave'], // 章节过渡可引任意幕
  'ds-list':          ['ground', 'insight'],              // 论点列表（网格行 + 原色序号锚）
  'ds-ratio':         ['ground', 'insight', 'narrow'],    // 比例/占比（原色面积即数据）
  'ds-spotlight':     ['insight', 'ground'],              // 单点聚焦（单原色判断锚 + 大留白）
  'ds-statrow':       ['ground', 'insight'],              // 指标行（tabular 数字 + 网格分隔）
  'ds-closing':       ['act', 'leave'],                   // 收束（新秩序的边界）
  // 编辑主义 Editorial（设计决策 · SIGNAL 弧：编辑叙事弧·开题立论→深度展开(feature)→数据支撑(配角)→主编结论；role 取 SIGNAL 六档 + 编辑逻辑）
  'ed-feature-spread': ['state'],                          // 封面=主编 take 信号源（type-as-image 大标题）
  'ed-index':          ['state', 'insight'],               // 目录/编辑导览（agenda）
  'ed-statement':      ['state', 'insight', 'act'],        // 判断页（标题即结论·开题 state / 收束 act）
  'ed-two-col':        ['ground', 'insight'],              // 双栏长文（深度展开·feature 正文）
  'ed-three-col':      ['ground', 'insight'],              // 三栏富密度（Monocle 式驾驭）
  'ed-stat-feature':   ['ground', 'insight'],              // 数据特写（巨数 + 编辑标注·配角服务判断）
  'ed-quote-pull':     ['ground', 'insight', 'leave'],     // 拉引文页（大号衬线引语 + 编辑红）
  'ed-chapter':        ['state', 'insight', 'ground', 'narrow', 'act', 'leave'], // 大图编辑标注章节页（分章可引任意幕）
  'ed-data-grid':      ['ground', 'insight'],              // 数据网格（数据点服务编辑叙事）
  'ed-timeline':       ['ground', 'insight'],              // 逻辑演变时间线
  'ed-closing':        ['act', 'leave'],                   // 收束（主编结论·克制不炸尾）
  // 演示禅×阴翳×MUJI空 zen（设计决策 · SIGNAL 弧：空的信念·一图一念·role 取 deck 实际 + 禅叙事逻辑）
  'zen-cover':         ['state'],                           // 封面=空显形信号源（一念落张力位）
  'zen-enso':          ['state', 'ground', 'insight'],      // 円相一图一念（簡素 KANSO·可作信号/证据/洞察）
  'zen-statement':     ['state', 'insight', 'act'],         // 空当容器·一句信念（开题 state / 弧中 insight / 落点 act）
  'zen-shadow':        ['ground', 'insight'],               // 阴翳材质·白从墨中显形（谷崎金箔感·承载论证）
  'zen-number':        ['ground', 'insight'],               // 单数·一个巨数（量级物化·把数激活成判断）
  'zen-quote':         ['state', 'ground', 'leave'],        // 拉引文（一句有出处的引文·换气·可作信号/收束）
  'zen-chapter':       ['state', 'insight', 'ground', 'narrow', 'act', 'leave'], // 墨章扉·章节呼吸断点（分章可引任意幕）
  'zen-closing':       ['act', 'leave'],                    // 收束·留白余韵（判断落定·不炸尾）
  // 实现期 扩建 6 版式（SIGNAL 弧·空的方言·role 取 deck 实际 + 禅叙事逻辑·变长复用留余量）：
  'zen-horizon':       ['state', 'insight', 'narrow'],      // 一线/地平线（画线=取舍判断·开题/弧中洞察/收窄边界）
  'zen-ma-pair':       ['insight', 'ground', 'state'],      // 間 diptych（之间=关系判断·洞察/证据/信号）
  'zen-vertical':      ['insight', 'state', 'act'],         // 竖排信念（慢读郑重·一句主动选择的判断·洞察/信号/落点）
  'zen-karesansui':    ['insight', 'ground', 'state'],      // 枯山水单石（一物被正确地看·洞察/证据/信号）
  'zen-gradient':      ['insight', 'ground'],               // 渐变阴翳（亮从暗挣出·对比来自克制·洞察/论证）
  'zen-sequence':      ['act', 'insight', 'leave'],         // 序列呼吸（减的节奏·弧落点/洞察/收束）
};

// 【工程规范 单页必填 role · 防「为多样硬加页」· P1】（page-missing-role）
// 工程规范 规则 10.1：每个 slide 必须有 data-role ∈ SIGNAL 六档；缺 → P1。
// 现有 validator 只查「全 deck 各一页 state/ground/act」（P0），不查单页是否缺 role，本项补此缺口。
const SIGNAL_ROLES = new Set(['state', 'insight', 'ground', 'narrow', 'act', 'leave']);

// 【工程规范 能量谱 · 防「为多样硬加页/谱塌/过载」· 见各检级别】
// data-energy 属性契约（工程规范 契约一）：每页 data-energy ∈ {blast,calm,half}。
// ⚠️ 级别裁定（遵用户口径 + 工程规范 D-4）：工程规范/ 把能量缺失/曲线定为 P1，
//   但**当前 deck 尚未标注 data-energy**（设计/SKILL 未强制），若硬上 P1 会让现有合规 deck
//   全盘误报。故按用户指令「若 deck 还没标 data-energy，作 P2 提示而非硬拦」：
//   —— 全 deck 完全没有任何 data-energy → 整体作 P2 提示（ENERGY_NOT_ADOPTED），不逐页 P1；
//   —— 一旦 deck 开始标注（出现 ≥1 个 data-energy）→ 视为已采纳契约，未标注页报 P1（page-missing-energy）、
//      取值非法报 P1、layout×energy 配对违例报 P2、能量曲线（≥4 calm / ≥2 blast / 末页非 blast）按  报。
//   这样既不破坏现状，又能在 deck 采纳契约后真正机检——口径与工程规范 D-4「建议进、成本极低」一致。
const ENERGY_LEVELS = new Set(['blast', 'calm', 'half']);
// layout×energy 合法配对表（工程规范 契约三，与  映射表能量列 1:1）。
const LAYOUT_ENERGY_OK = {
  'signal-cover':     ['blast'],
  'final-move':       ['blast'],
  'social-card':      ['blast'],
  'kpi-wall':         ['blast', 'calm'],   // 数据 hero=blast / KPI 墙=calm（契约二）
  'paradigm-shift':   ['half', 'blast'],
  'opportunity':      ['half', 'calm'],
  'context-map':      ['calm'],
  'evidence-wall':    ['calm'],
  'timeline-impact':  ['calm'],
  'decision-matrix':  ['calm'],
  'risk-radar':       ['calm'],
  'screenshot-intel': ['calm'],
  'section-divider':  ['blast', 'half'],   // 章节分隔=能量锚（🔴/🟡）
  'agenda':           ['calm', 'half'],    // 目录
  // 构成主义人格（设计决策 · energy 取 deck 实际 + 节奏逻辑）
  'cover':            ['blast'],
  'statement':        ['blast', 'half'],
  'evidence':         ['calm', 'half'],
  'compare':          ['half', 'calm'],
  'kpi':              ['blast', 'calm'],
  'process':          ['calm', 'half'],
  'final':            ['blast', 'half'],   // 容 half：构成主义 final 铺垫·炸尾留 social-card
  // 信息·数据设计人格（设计决策 · 节奏逻辑）
  'data-cover':       ['blast'],
  'chart-lead':       ['calm', 'half'],
  'slope-compare':    ['calm', 'half'],
  'small-multiples':  ['calm'],
  'bar-ranking':      ['calm'],
  'dumbbell':         ['calm', 'half'],
  'compare-split':    ['calm', 'half'],
  'data-table':       ['calm'],
  'area-stack':       ['calm', 'half'],
  'scatter':          ['calm', 'half'],
  'waterfall':        ['calm', 'half'],
  'quote':            ['half', 'calm'],
  'data-kpi':         ['blast', 'calm'],
  'method-source':    ['calm'],
  // 时尚奢侈极简人格（设计决策 · 克制节奏：calm↔half 交替·不炸场·收尾判断落定非回峰）
  'lux-cover':        ['calm', 'half'],
  'lux-magnitude':    ['half', 'calm'],
  'lux-contrast':     ['calm', 'half'],
  'lux-editorial':    ['calm', 'half'],
  'lux-conviction':   ['calm', 'half'],
  'lux-quote':        ['calm', 'half'],
  'lux-closing':      ['half', 'calm'],
  // 扩展版式（克制节奏 calm↔half·章节 half 锚）
  'lux-index':        ['calm', 'half'],
  'lux-divider':      ['half', 'calm'],
  'lux-statrow':      ['calm', 'half'],
  'lux-pullquote':    ['calm', 'half'],
  'lux-list':         ['calm', 'half'],
  'lux-ratio':        ['calm', 'half'],
  'lux-timeline':     ['calm', 'half'],
  'lux-spotlight':    ['calm', 'half'],
  // De Stijl 新造型主义（设计决策 · 设计规范 秩序静态非对称平衡：calm 为主·原色块是节奏重音·量级页可 blast 点睛·不炸尾）
  'ds-cover':         ['calm', 'half'],            // 秩序封面静开（非炸·设计规范）
  'ds-index':         ['calm', 'half'],
  'ds-manifesto':     ['calm', 'half'],
  'ds-grid-content':  ['half', 'calm'],
  'ds-magnitude':     ['blast', 'half'],           // 量级页=原色锚点睛·允许 blast 重音（mid-deck 节奏峰）
  'ds-contrast':      ['half', 'calm'],
  'ds-data-block':    ['half', 'calm'],
  'ds-timeline':      ['calm', 'half'],
  'ds-quote':         ['calm', 'half'],
  'ds-divider':       ['half', 'calm'],            // 章节分隔=能量锚
  'ds-list':          ['half', 'calm'],
  'ds-ratio':         ['half', 'calm'],
  'ds-spotlight':     ['calm', 'half'],
  'ds-statrow':       ['half', 'calm'],
  'ds-closing':       ['half', 'calm'],            // 收束克制·不炸尾（end-not-peak 对秩序人格豁免·见下）
  // 编辑主义 Editorial（设计决策 · 设计规范 富密度节奏：calm/half 克制·feature spread 密↔拉引文/章节页疏·不炸尾）
  'ed-feature-spread': ['blast', 'half'],          // 封面=主编 take 锋利开场（type-as-image·允许 blast）
  'ed-index':          ['calm', 'half'],
  'ed-statement':      ['blast', 'half'],           // 判断页=编辑 take 横切·容 blast 点睛（brief：ed-statement 容 blast）
  'ed-two-col':        ['half', 'calm'],
  'ed-three-col':      ['half', 'calm'],
  'ed-stat-feature':   ['half', 'calm'],            // 数据特写（配角·克制）
  'ed-quote-pull':     ['calm', 'half'],            // 拉引文页疏（克制留白）
  'ed-chapter':        ['half', 'calm'],            // 章节页=能量锚（疏）
  'ed-data-grid':      ['half', 'calm'],
  'ed-timeline':       ['half', 'calm'],
  'ed-closing':        ['half', 'calm'],            // 收束克制·不炸尾（brief：ed-closing 不炸尾·end-not-peak 豁免·见下）
  // 演示禅×阴翳×MUJI空 zen（设计决策 · 设计规范 禅的呼吸·静观非炸场：全 calm/half·绝无 blast·密疏交替靠 calm↔half·章扉/引文/收束疏·不炸尾）
  'zen-cover':         ['calm', 'half'],            // 空显形静开（禅 ≠ blast 开场）
  'zen-enso':          ['calm', 'half'],            // 円相静观（一笔被正确地看）
  'zen-statement':     ['calm', 'half'],            // 一句信念·ma 主角（静）
  'zen-shadow':        ['calm', 'half'],            // 阴翳材质（白从墨中显·静）
  'zen-number':        ['calm', 'half'],            // 单数（量级静陈·非炸数）
  'zen-quote':         ['half', 'calm'],            // 引文换气（疏）
  'zen-chapter':       ['half', 'calm'],            // 章扉=能量锚（疏·密疏交替的「疏」）
  'zen-closing':       ['half', 'calm'],            // 收束克制·余韵不炸尾（end-not-peak 对禅人格豁免·见下）
  // 实现期 扩建 6 版式（设计规范 禅的呼吸·静观非炸场·全 calm/half·绝无 blast·密疏交替靠 calm↔half）：
  'zen-horizon':       ['calm', 'half'],            // 一线/地平线（一线分两片空·静观）
  'zen-ma-pair':       ['calm', 'half'],            // 間 diptych（两点之间的 ma·静）
  'zen-vertical':      ['calm', 'half'],            // 竖排信念（慢读=慢节奏·静）
  'zen-karesansui':    ['calm', 'half'],            // 枯山水单石（一物静观·极致 ma 的庭）
  'zen-gradient':      ['calm', 'half'],            // 渐变阴翳（光从暗中渐显·静）
  'zen-sequence':      ['calm', 'half'],            // 序列呼吸（节奏放缓的呼吸·静）
};
const ENERGY_MAX_CALM_RUN = 4;  // 连续 ≥4 calm 无换挡 → P1（工程规范 ①「看睡」）
const ENERGY_MAX_BLAST_RUN = 2; // 连续 ≥2 blast 非合法首尾 → P1（工程规范 ②「落差磨平」）

// 【工程规范 按布局容量上限 · 防「过密 / 截断」· P2】（text-density-by-layout + bullets-overflow）
// 工程规范 表（13 行二维容量）。本项把现有「一维按 data-scene」升级为「二维按 data-layout」：
//   字数列 = 该 layout「正文/要点字数（全页）」上限（CJK 字）；
//   units 列 = 该 layout「要点条数 / 卡片 / 节点」上限（数 li/.card/.unit/节点）。
// 取值一字对工程规范 表（标 ⚠️ 的 4 个占位布局取「目标规格」值，工程规范 注「待校准」，注释标明）。
// 口径：本表为【工程约定】，与工程规范 表 1:1；超限 → P2（工程规范 标 P2，不阻断）。
const DENSITY_BY_LAYOUT = {
  //                     chars  units   ←工程规范 表列
  'signal-cover':     { chars: 40,  units: 0 },  // 判断句页，0 要点
  'context-map':      { chars: 90,  units: 4 },
  'paradigm-shift':   { chars: 80,  units: 2 },  // ⚠️占位布局·目标规格（待校准）
  'evidence-wall':    { chars: 120, units: 4 },  // ≤4 卡
  'kpi-wall':         { chars: 100, units: 6 },  // 取 KPI 墙模式上限（hero 模式更少，宽松向）
  'timeline-impact':  { chars: 110, units: 6 },  // ≤6 节点
  'decision-matrix':  { chars: 100, units: 9 },  // ⚠️占位·2×2~3×3=最多 9 格（待校准）
  'risk-radar':       { chars: 110, units: 5 },  // ≤5 风险
  'opportunity':      { chars: 80,  units: 3 },  // ⚠️占位·≤3 行动（待校准）
  'screenshot-intel': { chars: 70,  units: 3 },  // ⚠️占位·≤3 注解（待校准）
  'final-move':       { chars: 60,  units: 3 },  // ≤3 行动
  'social-card':      { chars: 20,  units: 0 },  // 金句 ≤20 字
  // 构成主义人格（设计决策 · 偏疏·留白）
  'cover':            { chars: 40,  units: 0 },
  'statement':        { chars: 50,  units: 0 },  // 单句大宣言
  'evidence':         { chars: 120, units: 4 },
  'compare':          { chars: 100, units: 8 },  // 2 列 × 4 点 = 8（对比版式）
  'kpi':              { chars: 100, units: 3 },
  'process':          { chars: 110, units: 6 },
  'final':            { chars: 60,  units: 3 },
  // 信息·数据设计人格（设计决策 · 偏疏·数据为主角）
  'data-cover':       { chars: 50,  units: 0 },
  'chart-lead':       { chars: 90,  units: 0 },
  'slope-compare':    { chars: 100, units: 8 },
  'small-multiples':  { chars: 90,  units: 4 },
  'bar-ranking':      { chars: 120, units: 12 },
  'dumbbell':         { chars: 110, units: 16 },
  'compare-split':    { chars: 100, units: 12 },
  'data-table':       { chars: 140, units: 24 },
  'area-stack':       { chars: 90,  units: 14 },
  'scatter':          { chars: 145, units: 14 },
  'waterfall':        { chars: 105, units: 16 },
  'quote':            { chars: 120, units: 4 },
  'data-kpi':         { chars: 150, units: 8 },
  'method-source':    { chars: 240, units: 8 },
  // 时尚奢侈极简人格（设计决策 · 低密度·判断+支撑·上限防过密·字数下限另由 lux-empty-slogan 管）
  'lux-cover':        { chars: 60,  units: 0 },
  'lux-magnitude':    { chars: 90,  units: 3 },
  'lux-contrast':     { chars: 110, units: 4 },
  'lux-editorial':    { chars: 100, units: 2 },
  'lux-conviction':   { chars: 90,  units: 0 },
  'lux-quote':        { chars: 110, units: 2 },
  'lux-closing':      { chars: 70,  units: 2 },
  // 扩展版式（低密度·判断+支撑）
  'lux-index':        { chars: 130, units: 3 },
  'lux-divider':      { chars: 60,  units: 0 },
  'lux-statrow':      { chars: 140, units: 3 },
  'lux-pullquote':    { chars: 90,  units: 0 },
  'lux-list':         { chars: 150, units: 3 },
  'lux-ratio':        { chars: 120, units: 2 },
  'lux-timeline':     { chars: 150, units: 3 },
  'lux-spotlight':    { chars: 90,  units: 0 },
  // De Stijl 新造型主义（设计决策 · 设计规范 留白主导·原色判断锚·偏疏；ds-contrast 高密页是「形式承载混乱」特性·非 bug 故放宽）
  // 字数上限 = 当前 deck 实测 + ~1 档余量（做系统不做玩具例·变长不崩）；units 按实际承载（仅 ds-timeline .dtl-node 计入 node）。
  'ds-cover':         { chars: 60,  units: 0 },   // 封面判断句·留白主导
  'ds-index':         { chars: 160, units: 5 },   // 目录多行（当前 139·≤3 幕行）
  'ds-manifesto':     { chars: 50,  units: 0 },   // 单句大宣言（当前 27）
  'ds-grid-content':  { chars: 130, units: 4 },   // 网格内容（当前 110/114）
  'ds-magnitude':     { chars: 80,  units: 0 },   // 巨数 + 锚（当前 57）
  'ds-contrast':      { chars: 175, units: 4 },   // 混乱 vs 秩序双区·形式承载混乱=高密特性（当前 157·放宽）
  'ds-data-block':    { chars: 120, units: 8 },   // 数据墙网格（当前 86）
  'ds-timeline':      { chars: 145, units: 8 },   // 正交时间轴（当前 122·节点 ≤8）
  'ds-quote':         { chars: 60,  units: 0 },   // 克制引言（当前 41）
  'ds-divider':       { chars: 40,  units: 0 },   // 章节过渡·大留白（当前 20）
  'ds-list':          { chars: 150, units: 6 },   // 论点列表（当前 125·网格行）
  'ds-ratio':         { chars: 110, units: 4 },   // 比例/占比（当前 81·面积即数据）
  'ds-spotlight':     { chars: 145, units: 0 },   // 单点聚焦 + 大留白（当前 124）
  'ds-statrow':       { chars: 110, units: 6 },   // 指标行（当前 87·网格分隔）
  'ds-closing':       { chars: 75,  units: 0 },   // 收束（当前 58）
  // 编辑主义 Editorial（设计决策 · 设计规范 富密度是身份特性·非 bug → 调档放宽别误杀；字数 = 当前 deck 实测 + ~1 档余量·units 按实际承载）
  // text-density-by-layout 为 P2（不阻断）·brief：editorial 富密度 P2 text-density 可接受；上限防失控过密·变长不崩。
  'ed-feature-spread': { chars: 150, units: 0 },  // 杂志特稿跨页·主图+大标题+拉引文+数据点+正文摘要（当前 131）
  'ed-two-col':        { chars: 230, units: 4 },  // 双栏长文·深度展开 feature 正文（当前 max 212·富密度）
  'ed-three-col':      { chars: 170, units: 0 },  // 三栏富密度·Monocle 式驾驭（当前 max 152）
  'ed-chapter':        { chars: 100, units: 0 },  // 大图编辑标注章节页·疏（当前 86）
  'ed-index':          { chars: 120, units: 6 },  // 目录/编辑导览（当前 102·≤4 条目行）
  'ed-statement':      { chars: 110, units: 0 },  // 判断页·标题即结论（当前 max 95）
  'ed-quote-pull':     { chars: 100, units: 0 },  // 拉引文页·大号引语+克制留白（当前 max 85）
  'ed-stat-feature':   { chars: 125, units: 0 },  // 数据特写·巨数+编辑标注（当前 max 110）
  'ed-data-grid':      { chars: 125, units: 6 },  // 数据网格（当前 107·≤4 格）
  'ed-timeline':       { chars: 155, units: 8 },  // 逻辑演变时间线（当前 137）
  'ed-closing':        { chars: 115, units: 0 },  // 收束·主编结论（当前 98）
  // 演示禅×阴翳×MUJI空 zen（设计决策 · 设计规范/ 一图一念·极致 ma·偏极疏；字数 = 当前 deck 实测 + ~1 档余量·防失控过密破留白·units=0 全无要点条列·禅绝不堆焦点）
  'zen-cover':         { chars: 60,  units: 0 },  // 封面一念（当前 ~22·巨号 display）
  'zen-enso':          { chars: 60,  units: 0 },  // 円相一图一念（当前 ~26·一句念）
  'zen-statement':     { chars: 60,  units: 0 },  // 空当容器·一句信念（当前 max ~30）
  'zen-shadow':        { chars: 80,  units: 0 },  // 阴翳材质 + 一念 + 注（当前 ~50）
  'zen-number':        { chars: 80,  units: 0 },  // 单数 + 一念 + 注（当前 ~45·巨数本身）
  'zen-quote':         { chars: 60,  units: 0 },  // 拉引文·换气疏（当前 ~24·一句引文）
  'zen-chapter':       { chars: 70,  units: 0 },  // 墨章扉·章命题 + 导语（当前 ~40·疏）
  'zen-closing':       { chars: 60,  units: 0 },  // 收束·留白余韵（当前 ~24·最空的一页）
  // 实现期 扩建 6 版式（偏极疏·units=0 全无要点条列·禅绝不堆焦点·字数 = 当前实测 + ~1 档余量·防失控破留白）：
  'zen-horizon':       { chars: 70,  units: 0 },  // 一线/地平线·念 + 地名注（当前 ~33·一线即终极 ma）
  'zen-ma-pair':       { chars: 70,  units: 0 },  // 間 diptych·念 + 注（当前 ~32·之间为主角）
  'zen-vertical':      { chars: 60,  units: 0 },  // 竖排信念·念 + 源注（当前 ~28·竖排=慢读）
  'zen-karesansui':    { chars: 70,  units: 0 },  // 枯山水·念 + 注（当前 ~35·一物被正确地看）
  'zen-gradient':      { chars: 70,  units: 0 },  // 渐变阴翳·念 + 注（当前 ~39·亮从暗挣出）
  'zen-sequence':      { chars: 70,  units: 0 },  // 序列呼吸·念 + 注（当前 ~33·减的节奏）
};

// 【设计决策 内容预算契约 · 变长不崩 · P1】（content-budget）· 跨三人格
// 真值 = references/content-budgets.md（1:1 镜像·改一处必同步）。值由变长压测梯度扫描派生
// （变长压测·取「最大仍不崩」留 1 档余量）。**二级键 [data-theme][layout]**——版式名跨
// 人格碰撞(final/statement/section-divider/social-card)，标题类与预算各不同，故按主题分。
// 某主题无键 or 某 layout 无键 → 不约束。区别 DENSITY_BY_LAYOUT（工程规范 全页密度 P2·另一真值源）。
//   titleClass/titleTag = 标题元素 class 或标签(h1/h2/blockquote)；titleU = 宽度上限(width-unit: CJK×2 + 其余×1)；
//   rowClass/rowTag = 行容器 class 或标签(tr/li)；rows = 计数上限（缺省无行约束）。
const CONTENT_BUDGET = {
  // 解释方言（info-data）
  'info-data': {
    'data-cover':      { titleClass: 'lead',      titleU: 116 },
    'agenda':          { titleClass: 'h',         titleU: 116 },
    'section-divider': { titleClass: 'dv-name',   titleU: 104 },
    'chart-lead':      { titleClass: 'h',         titleU: 68 },
    'data-kpi':        { titleClass: 'h',         titleU: 92,  rowClass: 'kpi-cell', rows: 3 },
    'slope-compare':   { titleClass: 'h',         titleU: 92 },
    'bar-ranking':     { titleClass: 'h',         titleU: 92,  rowClass: 'br-row',   rows: 5 },
    'compare-split':   { titleClass: 'cmp-intro', titleU: 44 },
    'small-multiples': { titleClass: 'h',         titleU: 92,  rowClass: 'sm-cell',  rows: 8 },
    'dumbbell':        { titleClass: 'h',         titleU: 92 },
    'data-table':      { titleClass: 'h',         titleU: 92,  rowClass: 'tbl-row',  rows: 6 },
    'area-stack':      { titleClass: 'h',         titleU: 80 },
    'scatter':         { titleClass: 'h',         titleU: 92 },
    'statement':       { titleClass: 'sts-claim', titleU: 116 },
    'waterfall':       { titleClass: 'h',         titleU: 92 },
    'quote':           { titleClass: 'qt-body',   titleU: 116 },
    'method-source':   { titleClass: 'h',         titleU: 80,  rowClass: 'ms-col',   rows: 3 },
    'final':           { titleClass: 'h',         titleU: 116 },
  },
  // 精密方言（技术崇高·instrument-cool）——标题用 h1/h2 语义标签；图表多 chart-render(C 免)
  'instrument-cool': {
    'signal-cover':    { titleTag: 'h1',         titleU: 116 },
    'context-map':     { titleTag: 'h2',         titleU: 116, rowClass: 'unit', rows: 3 },
    'paradigm-shift':  { titleTag: 'h2',         titleU: 116 },
    'evidence-wall':   { titleTag: 'h2',         titleU: 104, rowClass: 'card', rows: 4 },
    'kpi-wall':        { titleClass: 'lead-m',   titleU: 116 },
    'timeline-impact': { titleTag: 'h2',         titleU: 116 },
    'risk-radar':      { titleTag: 'h2',         titleU: 116, rowClass: 'q',    rows: 6 },
    'decision-matrix': { titleTag: 'h2',         titleU: 116, rowTag: 'tr',     rows: 7 },
    'final-move':      { titleTag: 'h1',         titleU: 56 },
    'social-card':     { titleTag: 'blockquote', titleU: 116 },
  },
  // 信念方言（构成主义）——无图表(C 免)
  'constructivist': {
    'cover':           { titleClass: 'h',        titleU: 116 },
    'statement':       { titleClass: 'big',      titleU: 116 },
    'section-divider': { titleClass: 'ch-name',  titleU: 32 },
    'evidence':        { titleClass: 'h3',       titleU: 116, rowClass: 'card', rows: 4 },
    'compare':         { titleClass: 'h3',       titleU: 56,  rowTag: 'li',     rows: 8 },
    'kpi':             { titleClass: 'cap',      titleU: 116 },
    'process':         { titleClass: 'h3',       titleU: 116, rowClass: 'step', rows: 3 },
    'final':           { titleClass: 'big',      titleU: 68 },
    'social-card':     { titleClass: 'quote',    titleU: 80 },
  },
  // 时尚奢侈极简（luxury-minimal）——标题=判断句 class 靶；titleU 防超长判断压穿/溢页。
  // 值由版式几何（行宽×可用行高）估算·留 1 档余量·初值待梯度校准（同 设计决策 口径·做系统不做玩具例）。
  'luxury-minimal': {
    'lux-cover':       { titleClass: 'cov-claim',  titleU: 72 },  // 判断 ~3 行（当前 22u·宽裕）
    'lux-magnitude':   { titleClass: 'mag-claim',  titleU: 80 },  // 右栏 460px·~4 行（当前 47u）
    'lux-conviction':  { titleClass: 'con-claim',  titleU: 96 },  // 信念主句·~4 行（当前 48u）
    'lux-contrast':    { titleClass: 'con2-claim', titleU: 40 },  // 单栏窄·首栏判断（当前 21u）
    'lux-editorial':   { titleClass: 'ed-claim',   titleU: 64 },  // 图左 540px（当前 40u）
    'lux-quote':       { titleClass: 'qt-body',    titleU: 84 },  // 引言·宽行（当前 50u）
    'lux-closing':     { titleClass: 'clo-claim',  titleU: 64 },  // 收束句（当前 30u）
    // 扩展版式
    'lux-index':       { titleClass: 'idx-lead',   titleU: 64 },  // 目录统领句
    'lux-divider':     { titleClass: 'dv-claim',   titleU: 56 },  // 章判断（右 45% 窄栏）
    'lux-statrow':     { titleClass: 'sr-lead',    titleU: 80 },  // 量级序列统领
    'lux-pullquote':   { titleClass: 'pq-body',    titleU: 76 },  // 抽言（60px 大字）
    'lux-list':        { titleClass: 'ls-lead',    titleU: 80 },  // 列表统领
    'lux-ratio':       { titleClass: 'rt-lead',    titleU: 80 },  // 双量级统领
    'lux-timeline':    { titleClass: 'tl-lead',    titleU: 80 },  // 时间线统领
    'lux-spotlight':   { titleClass: 'sp-claim',   titleU: 64 },  // 聚焦判断
  },
  // De Stijl 新造型主义（设计决策 门复用 设计决策 · 变长不崩）——长内容风险在中文判断/lead 段（ALL-CAPS 英文 *-title 天然短）。
  // titleClass 靶最长行的判断/lead 类；titleU = 当前 deck 实测 + ~1 行余量·防超长判断压穿/溢页；rows 靶网格行容器。
  'de-stijl': {
    'ds-cover':        { titleClass: 'dsc-title',  titleU: 48 },  // 全大写英文刊头（当前 17u·短）
    'ds-index':        { titleClass: 'dix-lead',   titleU: 92,  rowClass: 'dix-row', rows: 6 },  // 统领句（当前 74u·5 幕行）
    'ds-manifesto':    { titleClass: 'dmf-title',  titleU: 56 },  // 单句大宣言（当前 19u）
    'ds-grid-content': { titleClass: 'dgc-lead',   titleU: 140 }, // 网格 lead 中文段（当前 max 129u·放足余量）
    'ds-magnitude':    { titleClass: 'dmg-claim',  titleU: 96 },  // 量级判断段（当前 73u）
    'ds-contrast':     { titleClass: 'dct-r-lead', titleU: 116 }, // 对照右栏判断（当前 94u·混乱页偏密）
    'ds-data-block':   { titleClass: 'ddb-title',  titleU: 56,  rowClass: 'ddb-cell', rows: 6 },  // 数据墙（标题短·4 格）
    'ds-timeline':     { titleClass: 'dtl-claim',  titleU: 96,  rowClass: 'dtl-node', rows: 8 },  // 时间轴判断（当前 74u·5 节点）
    'ds-quote':        { titleClass: 'dqt-cite',   titleU: 116 }, // 引语出处中文段（含署名·宽行）
    'ds-divider':      { titleClass: 'ddv-claim',  titleU: 48 },  // 章判断（短）
    'ds-list':         { titleClass: 'dls-lead',   titleU: 80,  rowClass: 'dls-row', rows: 5 },  // 列表统领（当前 52u·3 行）
    'ds-ratio':        { titleClass: 'drt-lead',   titleU: 130 }, // 比例判断段（当前 106u）
    'ds-spotlight':    { titleClass: 'dsp-lead',   titleU: 130 }, // 聚焦判断段（当前 108u）
    'ds-statrow':      { titleClass: 'dsr-claim',  titleU: 84,  rowClass: 'dsr-cell', rows: 5 },  // 指标判断（当前 60u·3 格）
    'ds-closing':      { titleClass: 'dcl-title',  titleU: 56 },  // 收束刊头（短）
  },
  // 编辑主义 Editorial（设计决策 门复用 设计决策 · 变长不崩）——衬线大标题/中文判断超长压穿风险。
  // titleClass 靶各版式主标题/引语类·titleU = 当前 deck 实测 width-unit + ~1 行余量·防超长压穿/溢页；rowClass 靶网格行容器。
  'editorial': {
    'ed-feature-spread': { titleClass: 'efs-headline', titleU: 56 },  // 封面衬线大标题（当前 28u·type-as-image 须短锋利）
    'ed-index':          { titleClass: 'eix-masthead', titleU: 52, rowClass: 'eix-item', rows: 6 },  // 刊头（当前 22u·≤4 条目）
    'ed-statement':      { titleClass: 'est-claim',    titleU: 72 },  // 判断句·主编 take（当前 max 38u）
    'ed-two-col':        { titleClass: 'etc-title',    titleU: 56 },  // 双栏标题（当前 max 29u）
    'ed-three-col':      { titleClass: 'e3c-title',    titleU: 56, rowClass: 'e3c-col', rows: 6 },  // 三栏标题（当前 max 21u·≤3 栏/页）
    'ed-chapter':        { titleClass: 'ech-title',    titleU: 48 },  // 章节大标题（当前 20u）
    'ed-quote-pull':     { titleClass: 'eqp-quote',    titleU: 116 }, // 拉引文大字（当前 max 81u·大号衬线引语·宽裕）
    'ed-stat-feature':   { titleClass: 'esf-h',        titleU: 56 },  // 数据特写标题（当前 max 28u）
    'ed-data-grid':      { titleClass: 'edg-title',    titleU: 56, rowClass: 'edg-cell', rows: 6 },  // 数据网格标题（当前 19u·≤4 格）
    'ed-timeline':       { titleClass: 'etl-title',    titleU: 56, rowClass: 'etl-node', rows: 8 },  // 时间线标题（当前 16u·≤4 节点）
    'ed-closing':        { titleClass: 'ecl-claim',    titleU: 64 },  // 收束句·主编结论（当前 36u）
  },
  // 演示禅×阴翳×MUJI空 zen（设计决策 门复用 设计决策 · 变长不崩）——巨号 display 念/信念/引文超长压穿风险（一行容量小·须留足余量）。
  // titleClass 靶各版式焦点的「念/信念/引文/章题」类·titleU = 当前 deck 实测 width-unit + ~1 行余量·防超长判断压穿/溢页破留白。
  'zen': {
    'zen-cover':       { titleClass: 'zc-conv',   titleU: 36 },  // 封面一念·巨号 96px（当前 16u·须短锋利）。实现期 压测实测：念列宽 896px·96px×1.04 → ≤18 字(36u)=2 行 bottom 604 ≤ 视觉底线 656·安全；20 字(40u)=3 行 bottom 703 溢出 → cap 由 40 收紧到 36（最后一档 2 行安全值·机器底线对齐视觉破版阈·变长压测取证）
    'zen-enso':        { titleClass: 'ze-read',   titleU: 64 },  // 円相念·33px（当前 40u·左下张力位窄栏）
    'zen-statement':   { titleClass: 'zs-claim',  titleU: 72 },  // 空当容器信念·58px（当前 max 48u）
    'zen-shadow':      { titleClass: 'zsh-claim', titleU: 48 },  // 阴翳念·44px（当前 20u·墨底右区）
    'zen-number':      { titleClass: 'zn-read',   titleU: 72 },  // 单数念·36px（当前 52u·把数激活成判断）
    'zen-quote':       { titleClass: 'zq-quote',  titleU: 60 },  // 拉引文·46px居中（当前 34u·一句三行内）
    'zen-chapter':     { titleClass: 'zch-title', titleU: 56 },  // 章命题·60px（当前 28u）
    'zen-closing':     { titleClass: 'zcl-claim', titleU: 56 },  // 收束句·50px居中（当前 36u）
    // 实现期 扩建 6 版式（titleClass 靶焦点念类·titleU = 实现期 实测 width-unit + ~1 行余量·防超长判断压穿/溢页破留白）：
    'zen-horizon':     { titleClass: 'zhz-read',  titleU: 72 },  // 一线念·38px·列宽~896（当前 48u·贴线显形）
    'zen-ma-pair':     { titleClass: 'zmp-read',  titleU: 60 },  // 間念·36px·列宽~856（当前 38u·点出之间）
    'zen-vertical':    { titleClass: 'zvt-claim', titleU: 48 },  // 竖排信念·46px·max-height 480（当前 24u·竖排列长受限·保守）
    'zen-karesansui':  { titleClass: 'zks-read',  titleU: 56 },  // 枯山水念·36px·列宽 440 窄栏（当前 34u·一物被看）
    'zen-gradient':    { titleClass: 'zgr-read',  titleU: 64 },  // 渐变念·44px·列宽~778（当前 40u·字从渐变显形）
    'zen-sequence':    { titleClass: 'zsq-read',  titleU: 60 },  // 序列念·36px·列宽~888（当前 36u·减的节奏）
  },
};

/* ----------------------- 工具函数 ----------------------- */

// 去掉 HTML 注释，避免注释里的「假 section / 假 data-layout / 假 hex」被误判
const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, '');
// 去掉标签与 <script>/<style>，用于数正文字数
const stripTags = (s) =>
  s.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
// 统计中日韩统一表意文字（粗略代表中文正文密度）
const cjkCount = (s) => (s.match(/[一-鿿]/g) || []).length;

// 取首个含指定 class token 的元素的可见内文（设计决策 标题预算用）。class token 须被
// 引号/空白界定，避免子串误命中（如 'h' 不命中 'cl-head'）。失败返回 null。
function innerTextByClass(html, cls) {
  const re = new RegExp(`<(\\w+)[^>]*\\bclass="(?:[^"]*\\s)?${cls}(?:\\s[^"]*)?"[^>]*>([\\s\\S]*?)</\\1>`, 'i');
  const m = re.exec(html);
  return m ? stripTags(m[2]).replace(/\s+/g, ' ').trim() : null;
}
// 数含指定 class token 的元素个数（设计决策 行预算用）。
function countByClass(html, cls) {
  return (html.match(new RegExp(`\\bclass="(?:[^"]*\\s)?${cls}(?:\\s[^"]*)?"`, 'gi')) || []).length;
}
// 取首个指定标签(h1/h2/blockquote 等)的可见内文（compute 标题用语义标签·非 class）。
function innerTextByTag(html, tag) {
  const m = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(html);
  return m ? stripTags(m[1]).replace(/\s+/g, ' ').trim() : null;
}
// 数指定标签个数（decision-matrix 的 tr / compare 的 li 行预算用）。
function countByTag(html, tag) {
  return (html.match(new RegExp(`<${tag}\\b`, 'gi')) || []).length;
}
// 文本显示宽度（设计决策 width-unit：CJK 全宽 ×2 + 拉丁/数字/标点/空格 ×1）。
function widthUnits(s) {
  let u = 0;
  for (const ch of s) u += isCjkish(ch.codePointAt(0)) ? 2 : 1;
  return u;
}

// —— 颜色解析：把 #rgb/#rrggbb/#rrggbbaa/rgb()/rgba() 解析成 {r,g,b}（0–255），失败返回 null ——
function parseColor(str) {
  if (!str) return null;
  let s = str.trim().toLowerCase();
  // #hex
  const hex = /^#([0-9a-f]{3,8})$/.exec(s);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join(''); // #rgb(a) → #rrggbb(aa)
    if (h.length === 6 || h.length === 8) {
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
    }
    return null;
  }
  // rgb()/rgba()
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(s);
  if (rgb) return { r: +rgb[1], g: +rgb[2], b: +rgb[3] };
  return null;
}

// WCAG 相对亮度（sRGB → 线性 → 加权）
function relLuminance({ r, g, b }) {
  const lin = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// WCAG 对比度（≥1，越大越分明），任一色解析失败返回 null（不误判）
function contrastRatio(c1, c2) {
  const a = parseColor(c1), b = parseColor(c2);
  if (!a || !b) return null;
  const l1 = relLuminance(a), l2 = relLuminance(b);
  const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

/* —— 第二批新增机检的工具函数（零依赖，纯字符串/正则） —— */

// 取标签某属性值（不区分大小写），无则返回 null。
const attr = (tag, name) => {
  const m = new RegExp(`\\b${name}="([^"]*)"`, 'i').exec(tag);
  return m ? m[1].trim() : null;
};
// class 列表（小写、去空）。
const classList = (tag) => (attr(tag, 'class') || '').toLowerCase().split(/\s+/).filter(Boolean);
// class 是否命中给定关键词集合之一（精确 token 或带连字符前缀，避免 .chartistic 误命中 chart）。
const classHits = (classes, words) =>
  classes.some((c) => words.some((w) => c === w || c.startsWith(w + '-') || c.endsWith('-' + w)));

// 切出全部 <style>…</style> 文本（CSS 检查只扫这里 + 行内 style，避免误扫正文字符串）。
// 同时剥除 CSS 注释 /* … */——否则注释会被 splitCssRules 误当「选择器」前缀（修正 silent-truncation 误报）。
function extractStyleCss(s) {
  const out = [];
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let mm;
  while ((mm = re.exec(s)) !== null) out.push(mm[1].replace(/\/\*[\s\S]*?\*\//g, ' '));
  return out.join('\n');
}
// 切出全部行内 style="…" 的声明文本（连同其宿主开标签，供「宿主豁免」判定）。
function extractInlineStyles(s) {
  const out = []; // { decl, tag }
  const re = /<([a-z][\w-]*)\b([^>]*?)\bstyle="([^"]*)"([^>]*)>/gi;
  let mm;
  while ((mm = re.exec(s)) !== null) {
    out.push({ decl: mm[3], tag: mm[0] });
  }
  return out;
}
// 把一段 CSS 文本拆成「{选择器, 声明体}」规则块（浅层，不解析嵌套 @media 的层级，
// 但 @media 内的规则块本身也会被这条正则逐个抓到，足够做选择器级豁免判定）。
function splitCssRules(css) {
  const rules = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let mm;
  while ((mm = re.exec(css)) !== null) {
    const sel = mm[1].trim();
    if (!sel || sel.startsWith('@')) continue; // 跳过 @media/@keyframes 头（其内部块下一轮会被抓）
    rules.push({ sel, body: mm[2] });
  }
  return rules;
}
// 选择器是否命中某宿主豁免类（如 .figure-slot / .card）。逐 class 关键词在选择器串里找 `.kw`。
const selMentionsClass = (sel, kw) => new RegExp(`\\.${kw}\\b`, 'i').test(sel);

// 解析「一条 CSS 声明的 px 数值」们（一个简写如 padding:8px 16px 会得到 [8,16]）。
// 只接受纯 px；带 %/vw/vh/fr/em/rem/calc/clamp/var 的值返回 'skip' 让调用方跳过该属性（工程规范）。
function pxValuesOf(value) {
  const v = value.trim().toLowerCase();
  if (/\b(?:calc|clamp|min|max|var)\s*\(/.test(v)) return 'skip';
  if (/[\d.](?:%|vw|vh|vmin|vmax|fr|em|rem|ch|ex)\b/.test(v)) return 'skip';
  const nums = [];
  const re = /(-?\d*\.?\d+)px\b/g;
  let mm;
  while ((mm = re.exec(v)) !== null) nums.push(parseFloat(mm[1]));
  return nums;
}

/* —— zero-dep woff2 → cmap codepoint set（设计决策 字体覆盖门）——
   Node 内置 zlib 解 brotli + 手解 table directory / cmap(format 4/12)；已对照 fontTools 逐码点验证一致。 */
const WOFF2_KNOWN_TAGS = [
  'cmap','head','hhea','hmtx','maxp','name','OS/2','post','cvt ','fpgm','glyf','loca',
  'prep','CFF ','VORG','EBDT','EBLC','gasp','hdmx','kern','LTSH','PCLT','VDMX','vhea',
  'vmtx','BASE','GDEF','GPOS','GSUB','EBSC','JSTF','MATH','CBDT','CBLC','COLR','CPAL',
  'SVG ','sbix','acnt','avar','bdat','bloc','bsln','cvar','fdsc','feat','fmtx','fvar',
  'gvar','hsty','just','lcar','mort','morx','opbd','prop','trak','Zapf','Silf','Glat',
  'Gloc','Feat','Sill',
];
function woff2ReadBase128(buf, pos) {
  let r = 0;
  for (let i = 0; i < 5; i++) {
    const b = buf[pos.p++];
    r = r * 128 + (b & 0x7f);
    if ((b & 0x80) === 0) return r;
  }
  throw new Error('base128 overflow');
}
function woff2Codepoints(buf) {
  if (buf.readUInt32BE(0) !== 0x774F4632) throw new Error('not woff2');
  const numTables = buf.readUInt16BE(12);
  const totalCompressedSize = buf.readUInt32BE(20);
  const pos = { p: 48 };
  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const flags = buf[pos.p++];
    const idx = flags & 0x3f;
    let tag;
    if (idx === 0x3f) { tag = buf.toString('latin1', pos.p, pos.p + 4); pos.p += 4; }
    else tag = WOFF2_KNOWN_TAGS[idx];
    const tv = (flags >> 6) & 0x3;
    const origLen = woff2ReadBase128(buf, pos);
    let len = origLen;
    if ((tag === 'glyf' || tag === 'loca') && tv === 0) len = woff2ReadBase128(buf, pos); // glyf/loca 变换长度
    tables.push({ tag, len });
  }
  const decomp = brotliDecompressSync(buf.subarray(pos.p, pos.p + totalCompressedSize));
  let off = 0, cmapBuf = null;
  for (const t of tables) {
    if (t.tag === 'cmap') { cmapBuf = decomp.subarray(off, off + t.len); break; }
    off += t.len;
  }
  if (!cmapBuf) return new Set();
  const cps = new Set();
  const numSub = cmapBuf.readUInt16BE(2);
  for (let i = 0; i < numSub; i++) {
    const so = cmapBuf.readUInt32BE(4 + i * 8 + 4);
    const fmt = cmapBuf.readUInt16BE(so);
    if (fmt === 4) {
      const segX2 = cmapBuf.readUInt16BE(so + 6), segCount = segX2 / 2;
      const endO = so + 14, startO = endO + segX2 + 2, deltaO = startO + segX2, rangeO = deltaO + segX2;
      for (let k = 0; k < segCount; k++) {
        const end = cmapBuf.readUInt16BE(endO + k * 2), start = cmapBuf.readUInt16BE(startO + k * 2);
        const delta = cmapBuf.readUInt16BE(deltaO + k * 2), ro = cmapBuf.readUInt16BE(rangeO + k * 2);
        if (start === 0xffff) continue;
        for (let c = start; c <= end; c++) {
          let g;
          if (ro === 0) g = (c + delta) & 0xffff;
          else { const gi = rangeO + k * 2 + ro + (c - start) * 2; if (gi + 1 >= cmapBuf.length) continue; g = cmapBuf.readUInt16BE(gi); if (g !== 0) g = (g + delta) & 0xffff; }
          if (g !== 0) cps.add(c);
        }
      }
    } else if (fmt === 12) {
      const nG = cmapBuf.readUInt32BE(so + 12);
      for (let k = 0; k < nG; k++) {
        const go = so + 16 + k * 12;
        const s = cmapBuf.readUInt32BE(go), e = cmapBuf.readUInt32BE(go + 4);
        for (let c = s; c <= e; c++) cps.add(c);
      }
    }
  }
  return cps;
}
// CJK-ish 码点（与字体子集脚本口径一致；覆盖门据此提取 deck 用字）
function isCjkish(o) {
  return (o >= 0x3000 && o <= 0x303F) || (o >= 0x3400 && o <= 0x4DBF) ||
         (o >= 0x4E00 && o <= 0x9FFF) || (o >= 0xF900 && o <= 0xFAFF) ||
         (o >= 0xFF00 && o <= 0xFFEF) ||
         [0x00B7, 0x00D7, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022,
          0x2026, 0x2190, 0x2191, 0x2192, 0x2193, 0x2032, 0x2033, 0x00B0, 0x2103].includes(o);
}

/* ----------------------- 主流程 ----------------------- */

// 第一个「非 --flag」参数当作文件路径，这样 `--json deck.html` / `deck.html --pretty`
// 任意顺序都能正确取到文件；--json 被显式接受但无操作（默认即 JSON，仅兼容历史命令）。
const file = argv.slice(2).find((a) => !a.startsWith('--'));
const pretty = argv.includes('--pretty');

if (!file) {
  console.error('用法: node scripts/validate-deck.mjs <deck.html> [--pretty] [--json]');
  console.error('说明: 默认即输出 JSON；--json 为兼容占位无操作；--pretty 追加人类可读摘要到 stderr');
  exit(2);
}

let rawHtml;
try {
  rawHtml = readFileSync(file, 'utf8');
} catch (err) {
  // 读不到文件也产出结构化输出，方便上游（Skill / CI）统一处理
  const out = {
    file,
    slides: 0,
    status: 'error',
    summary: { p0: 1, p1: 0, p2: 0 },
    issues: [{ level: 'P0', rule: 'file-not-readable', msg: `无法读取文件：${file}（${err.code || err.message}）` }],
    next_actions: ['确认文件路径是否正确，再重跑校验器'],
  };
  stdout.write(JSON.stringify(out, null, 2) + '\n');
  exit(1);
}

// 解析时用去注释版本；裸 hex 检查也用去注释版本（注释里的 hex 不算违规）
const html = stripComments(rawHtml);

// deck 的生效人格主题（<html data-theme>）；缺省 instrument-cool（技术崇高）。
// 设计决策 订正：一 deck 一人格——deck 只含单一主题色集，validator 据 theme 调字体族上限等，
// 但**不做色彩对比分支**（单主题取唯一 --bg/--accent 即生效值，WCAG 对比对称）。
const deckTheme = (/<html[^>]*\bdata-theme="([^"]*)"/i.exec(html) || [])[1] || 'instrument-cool';

const issues = []; // { level:'P0'|'P1'|'P2', rule, msg, slide? }
const add = (level, rule, msg, slide) =>
  issues.push({ level, rule, msg, ...(slide != null ? { slide } : {}) });

/* —— TOKENS 区块边界（用于「区块外裸 hex」判定 + 在区块内解析主题色） —— */
const tokStart = html.indexOf('TOKENS START');
const tokEnd = html.indexOf('TOKENS END');
const hasTokens = tokStart !== -1 && tokEnd !== -1 && tokStart < tokEnd;
const inTokens = (idx) => hasTokens && idx > tokStart && idx < tokEnd;
const tokensBlock = hasTokens ? html.slice(tokStart, tokEnd) : '';

/* —— 抽取所有 <section class="...slide..."> … </section> —— */
const slideRe = /<section\b[^>]*class="[^"]*\bslide\b[^"]*"[^>]*>([\s\S]*?)<\/section>/gi;
const slides = [];
let m;
while ((m = slideRe.exec(html)) !== null) {
  const openTag = m[0].slice(0, m[0].indexOf('>') + 1);
  slides.push({ openTag, inner: m[1] });
}
if (slides.length === 0) add('P0', 'no-slides', '未找到任何 <section class="slide"> 页面');

/* —— P0：每页 data-layout 存在且在白名单；记录布局序列与角色集合 ——
   同时顺带做 P1（情报戳，按 social-card 豁免）。 */
const layoutSeq = [];
const roleSet = new Set();
slides.forEach((s, i) => {
  const page = i + 1;
  const lm = /data-layout="([^"]*)"/i.exec(s.openTag);
  let layout = null;
  if (!lm || !lm[1].trim()) {
    add('P0', 'missing-layout', '该页缺少 data-layout 属性', page);
  } else {
    layout = lm[1].trim();
    if (!LAYOUT_WHITELIST.has(layout)) {
      add('P0', 'layout-not-in-whitelist', `data-layout="${layout}" 不在语义白名单内`, page);
    }
  }
  layoutSeq.push(layout);

  const rm = /data-role="([^"]*)"/i.exec(s.openTag);
  if (rm && rm[1].trim()) roleSet.add(rm[1].trim());

  // P1：每页须有「页码导航」指示（顶栏 .pg 或封面 .intel-stamp 二选一；social-card 长图豁免）
  // —— 旧规则曾强制装饰性 .intel-stamp 角标作「签名指纹」；按「装饰须承载信息」设计原则
  //    (设计决策：Tufte 橡皮擦 + Norman signifier)已清场纯 HUD 角标，只保留 wayfinding 真功能。
  if (!STAMP_EXEMPT_LAYOUTS.has(layout || '') &&
      !/class="[^"]*\b(?:pg|intel-stamp|folio)\b[^"]*"/i.test(s.inner)) {
    add('P1', 'missing-page-indicator', '该页缺少页码导航指示（顶栏 .pg / .intel-stamp / .folio）', page);
  }
  // 注：.folio = 构成主义 editorial 页码（「第 01 幕 / 06」），与 .pg/.intel-stamp 同为合法 wayfinding。
});

/* —— P0：叙事角色完整（state/ground/act 缺一不可） ——
   豁免：整套 deck 仅 1 页且该页布局 ∈ SINGLE_CARD_LAYOUTS（单张 social-card 长图）。 */
const isSingleCardExempt =
  slides.length === 1 &&
  layoutSeq.length === 1 &&
  layoutSeq[0] != null &&
  SINGLE_CARD_LAYOUTS.has(layoutSeq[0]);
if (!isSingleCardExempt) {
  for (const role of REQUIRED_ROLES) {
    if (!roleSet.has(role)) {
      add('P0', 'missing-narrative-role', `整套 deck 缺少 data-role="${role}" 的页（信号/证据/行动缺一不可）`);
    }
  }
}

/* —— P0：TOKENS 区块外裸 hex —— */
const hexRe = /#[0-9a-fA-F]{3,8}\b/g;
let hm;
while ((hm = hexRe.exec(html)) !== null) {
  if (inTokens(hm.index)) continue;
  add('P0', 'raw-hex-outside-tokens', `TOKENS 区块外出现裸 hex 颜色 ${hm[0]}（应改用 var(--…) 或移进 TOKENS 区块）`);
}

/* —— P0：强调色可读性死区（设计规范）——
   解析 TOKENS 区块内全部 --accent 直接色值（含 night-cyan/deep-blue/safety-amber 三个
   data-accent 场景子档，各是合法生效值）与底色（--bg / --surface / --surface-2），逐对计算
   WCAG 对比；任一 accent 在任一底面下作文字色对比 < 3.0:1 → 报 P0（= 常量 MIN_CONTRAST，
   取 WCAG 大字阈值 3.0:1 作硬死区门，与设计规范 /  一致；非 4.5:1）。
   A 用低饱和信号青（#3FD6C2 on #11161B ≈ 10:1）应通过；
   若误用酸色/高亮浅色把对比压到死区即拦下（与规格「酸色不落不可读对比」一致）。
   解析失败（取不到色值/全是 var 引用）则跳过，不误判。 */
function readTokenColor(name) {
  // 取「最后一次」该变量的直接颜色定义（用于底色：base 块即生效值，无子档覆盖）
  const re = new RegExp(`${name}\\s*:\\s*([^;}\\n]+)`, 'gi');
  let last = null, mm;
  while ((mm = re.exec(tokensBlock)) !== null) {
    const v = mm[1].trim();
    if (parseColor(v)) last = v; // 只接受可解析为颜色的值，跳过 var(--…) 间接引用
  }
  return last;
}
function readAllTokenColors(name) {
  // 收集该变量的全部去重直接色值（accent 有多个场景子档，每个都须独立达标）
  const re = new RegExp(`${name}\\s*:\\s*([^;}\\n]+)`, 'gi');
  const set = new Set(); let mm;
  while ((mm = re.exec(tokensBlock)) !== null) {
    const v = mm[1].trim();
    if (parseColor(v)) set.add(v);
  }
  return [...set];
}
if (hasTokens) {
  const accents = readAllTokenColors('--accent');
  const bgColors = [
    ['--bg', readTokenColor('--bg')],
    ['--surface', readTokenColor('--surface')],
    ['--surface-2', readTokenColor('--surface-2')],
  ].filter(([, v]) => v); // 只校验真有定义的底面
  for (const accent of accents) {
    for (const [bgName, bgVal] of bgColors) {
      const cr = contrastRatio(accent, bgVal);
      if (cr != null && cr < MIN_CONTRAST) {
        add('P0', 'accent-contrast-dead-zone',
          `强调色 --accent(${accent}) 在 ${bgName}(${bgVal}) 上对比仅 ${cr.toFixed(2)}:1 < ${MIN_CONTRAST}:1（不可读死区；A 应用达标的低饱和信号青，勿落酸色不可读区）`);
      }
    }
  }
}

/* —— P0 · font-coverage（设计决策 · 铁律⑤「逐字覆盖否则静默回退」机检化）——
   zero-dep 解 @font-face 的本地 woff2 cmap，deck 每个 CJK 字必在某打包字体 cmap 内，
   否则必静默回退系统字 → P0。是「字体生产机制(生成时全字重按内容子集)」的交付前独立复核（catch 手改文案漏字）。 */
{
  const faceRe = /@font-face\s*\{[^}]*\}/gi;
  const woff2Set = new Set();
  let fmf;
  while ((fmf = faceRe.exec(html)) !== null) {
    const u = /url\(\s*["']?([^"')]+\.woff2)["']?\s*\)/i.exec(fmf[0]);
    if (u) woff2Set.add(u[1]);
  }
  if (woff2Set.size) {
    const fontDir = dirname(file);
    const covered = new Set();
    let anyRead = false;
    for (const rel of woff2Set) {
      try { for (const c of woff2Codepoints(readFileSync(resolve(fontDir, rel)))) covered.add(c); anyRead = true; }
      catch { /* 读不到/解析失败 → 不贡献覆盖，缺字会在下方暴露 */ }
    }
    if (anyRead) {
      const deckCjk = new Set();
      // 只看可见渲染文本（stripTags 去 <style>/<script>/标签）——CSS/JS 注释里的中文不渲染、不需覆盖。
      for (const ch of stripTags(html)) { const o = ch.codePointAt(0); if (isCjkish(o)) deckCjk.add(o); }
      const missing = [...deckCjk].filter((c) => !covered.has(c));
      if (missing.length) {
        const shown = missing.slice(0, 40).map((c) => String.fromCodePoint(c)).join('');
        add('P0', 'font-coverage',
          `${missing.length} 个 CJK 字不在任何打包字体 cmap（必静默回退系统字·铁律⑤；改文案后须重新按内容子集）：${shown}${missing.length > 40 ? '…' : ''}`);
      }
    }
  }
}

/* —— P0 · whitelabel-codename-leak（工程规范 白标铁律 +  机检 · 设计原则『绝不做』#1）——
   用户产出可见层(eyebrow/folio/正文/title)出现内部代号 / 人格命名 = 一级红线（白标 设计原则）。
   口径与 font-coverage 共用：只看 stripTags(html) 的可见渲染文本（html 已去注释）——
   内部标记 data-theme="constructivist" / data-rendered-by="blcaptain" / CSS 选择器 / 注释**不在可见文本内，不误报**。
   每个代号一条（去重计数），便于定位"露了哪个、几处"。 */
{
  const visibleText = stripTags(html); // = 渲染文本（无 <style>/<script>/标签/注释）——与用户所见一致
  for (const { label, re } of CODENAME_LEAK_PATTERNS) {
    const hits = visibleText.match(re);
    if (hits && hits.length) {
      add('P0', 'whitelabel-codename-leak',
        `可见层出现内部代号「${label}」${hits.length} 处（白标铁律：用户成品禁露 blcaptain/技术崇高派/instrument-cool/构成主义/constructivist 等人格命名/内部代号；改中性栏目名或留空。内部标记 data-theme/data-rendered-by/CSS/注释不受影响）`);
    }
  }
}

/* —— P1：字体族数量统计（首选族去重，排除 var()/系统关键字） ——
   一 deck 一人格（设计决策 订正）：deck 单主题，全集即生效集。
   技术崇高：Geist Sans + Geist Mono = 2 族（决策②守「一支无衬线 + 一支等宽」），上限 3。
   构成主义：得意黑 display + Glow CJK + Geist latin + Geist Mono = 4 族，上限 4。 */
const fontFamilies = new Set();
const collectFamily = (decl) => {
  const first = decl.split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase();
  if (first && !first.startsWith('var(') && !['inherit', 'initial', 'unset', 'revert'].includes(first)) {
    fontFamilies.add(first);
  }
};
let fm;
const ffRe = /font-family\s*:\s*([^;}\n]+)/gi;
while ((fm = ffRe.exec(html)) !== null) collectFamily(fm[1]);
const tokFontRe = /--font-[\w-]+\s*:\s*([^;}\n]+)/gi;
let tf;
while ((tf = tokFontRe.exec(html)) !== null) collectFamily(tf[1]);
const maxFonts = deckTheme === 'constructivist' ? 4 : MAX_FONT_FAMILIES; // 设计决策：构成主义 4 族（display+CJK+latin+mono）
if (fontFamilies.size > maxFonts) {
  add('P1', 'too-many-fonts', `字体族 ${fontFamilies.size} 个超过上限 ${maxFonts}：${[...fontFamilies].join(' / ')}`);
}

/* —— P1：.kpi-slot 须含 tabular-nums（签名组件 /  建议新增 · 机检公理 4）——
   口径：刻度槽数字是 技术崇高签名指纹 2（小数点对齐成竖线）。实现上 tabular-nums 落在槽内的
   数字元素 .kpi-num 上（见 templates/deck-compute.html），故只要 deck 用到 .kpi-slot 标记，其
   <style> 就必须给 .kpi-slot 或 .kpi-num 声明 font-variant-numeric 含 tabular-nums，
   否则 KPI 数字会回退到比例数字、签名失效。仅当 deck 真用到 .kpi-slot 时才检（无 KPI 不误报）。 */
const usesKpiSlot = /class="[^"]*\bkpi-slot\b[^"]*"/i.test(html);
if (usesKpiSlot) {
  // 抓出针对 .kpi-slot / .kpi-num 的 CSS 规则块，看其声明里是否含 tabular-nums。
  // 也兼容「font-variant-numeric:var(--num-tabular)」+「--num-tabular: …tabular-nums…」的间接写法。
  const kpiRuleRe = /\.kpi-(?:slot|num)\b[^{}]*\{([^}]*)\}/gi;
  let hasTabular = false, km;
  while ((km = kpiRuleRe.exec(html)) !== null) {
    const body = km[1];
    const fvn = /font-variant-numeric\s*:\s*([^;}\n]+)/i.exec(body);
    if (!fvn) continue;
    const val = fvn[1].trim();
    if (/tabular-nums/i.test(val)) { hasTabular = true; break; }
    // 间接：值是 var(--x)，回查该自定义属性的定义是否含 tabular-nums
    const varRef = /var\(\s*(--[\w-]+)\s*\)/i.exec(val);
    if (varRef) {
      const def = new RegExp(`${varRef[1]}\\s*:\\s*([^;}\\n]+)`, 'i').exec(html);
      if (def && /tabular-nums/i.test(def[1])) { hasTabular = true; break; }
    }
  }
  if (!hasTabular) {
    add('P1', 'kpi-slot-missing-tabular-nums',
      'deck 用到 .kpi-slot 但未给 .kpi-slot/.kpi-num 声明 font-variant-numeric:tabular-nums（签名指纹 2：刻度槽数字须等宽对齐成竖线）');
  }
}

/* —— P1：连续 3 页相同 layout（能量起伏：炸/克制纪律） —— */
let run = 1;
for (let i = 1; i < layoutSeq.length; i++) {
  if (layoutSeq[i] && layoutSeq[i] === layoutSeq[i - 1]) {
    run++;
    if (run > MAX_SAME_LAYOUT_RUN) {
      add('P1', 'monotonous-layout', `第 ${i - 1}-${i + 1} 页连续使用相同布局「${layoutSeq[i]}」（不得连续 3 页同布局）`, i + 1);
    }
  } else {
    run = 1;
  }
}

/* —— P1：图片 slot 比例 / img alt / 证据声明 + 数据图来源标注 —— */
slides.forEach((s, i) => {
  const page = i + 1;
  const layout = layoutSeq[i] || '';

  // figure[data-slot] 必须有合法 data-ratio
  const figRe = /<figure\b[^>]*data-slot[^>]*>/gi;
  let figm;
  while ((figm = figRe.exec(s.inner)) !== null) {
    const rm = /data-ratio="([^"]*)"/i.exec(figm[0]);
    if (!rm) add('P1', 'slot-missing-ratio', 'figure[data-slot] 缺少 data-ratio 属性', page);
    else if (!RATIO_WHITELIST.has(rm[1].trim())) {
      add('P1', 'slot-bad-ratio', `data-ratio="${rm[1]}" 不在白名单（${[...RATIO_WHITELIST].join(' / ')}）`, page);
    }
  }

  // 每张 img 须有非空 alt
  const imgRe = /<img\b[^>]*>/gi;
  let im;
  while ((im = imgRe.exec(s.inner)) !== null) {
    const am = /alt="([^"]*)"/i.exec(im[0]);
    if (!am || !am[1].trim()) add('P1', 'img-missing-alt', 'img 缺少非空 alt（可访问性）', page);
  }

  // 证据卡须声明 data-evidence-type；声明了的取值须合法
  const cardRe = /<div\b[^>]*class="[^"]*\bcard\b[^"]*"[^>]*>/gi;
  let cm;
  while ((cm = cardRe.exec(s.inner)) !== null) {
    const em = /data-evidence-type="([^"]*)"/i.exec(cm[0]);
    if (!em || !em[1].trim()) {
      // 仅对「立据类」布局强制要求；其它布局的 .card 只是面板，不强制
      if (layout === 'evidence-wall' || layout === 'kpi-wall' || layout === 'screenshot-intel') {
        add('P1', 'card-missing-evidence-type', '证据卡缺少 data-evidence-type ∈ {fact/observation/inference/illustrative}', page);
      }
    } else if (!EVIDENCE_TYPES.has(em[1].trim())) {
      // 取值非法是红线（设计规范 立据纪律 /  / SKILL 硬约束）
      add('P0', 'bad-evidence-type', `data-evidence-type="${em[1]}" 取值非法（应为 fact/observation/inference/illustrative）`, page);
    }
  }

  // P1：数据图缺来源或「示意」标注（设计规范 不造假铁律）。
  // 启发式：本页含数据可视化（内联 <svg> 含 path/line/circle/rect/polyline，或 .num 大数字读数），
  //   且布局属数据型（signal-cover / kpi-wall / evidence-wall / timeline-impact），
  //   则本页必须出现来源/示意线索之一：.src 来源条 / .ref 卡内来源 / 「来源」「示意」「观察」「推测」字样 / data-evidence-type。
  const hasDataChart =
    /<svg\b[\s\S]*?<(?:path|line|circle|rect|polyline|polygon)\b/i.test(s.inner) ||
    /class="[^"]*\bnum\b[^"]*"/i.test(s.inner);
  const isDataLayout = ['signal-cover', 'kpi-wall', 'evidence-wall', 'timeline-impact'].includes(layout);
  if (hasDataChart && isDataLayout) {
    const text = stripTags(s.inner);
    const hasSourceMarker =
      /class="[^"]*\b(?:src|ref)\b[^"]*"/i.test(s.inner) ||   // .src / .ref 来源条
      /data-evidence-type=/i.test(s.inner) ||                  // 证据分级声明
      /来源|示意|观察|推测|出处|资料/.test(text);              // 显式来源/示意字样
    if (!hasSourceMarker) {
      add('P1', 'data-chart-missing-source',
        '本页含数据图/大数字读数但缺来源或「示意」标注（不造假红线：真实数据须标来源，非真实须标示意/观察/推测）', page);
    }
  }
});

/* —— P2：字数密度（按 data-scene 分档）+ 标题判断句启发式 —— */
slides.forEach((s, i) => {
  const page = i + 1;
  const layout = layoutSeq[i] || '';

  // data-scene 优先取本页 section 上的，缺省回退 <html> 上的，再缺省走 DENSITY_DEFAULT。
  let scene = (/data-scene="([^"]*)"/i.exec(s.openTag) || [])[1];
  if (!scene) scene = (/<html\b[^>]*\bdata-scene="([^"]*)"/i.exec(html) || [])[1];
  scene = (scene || '').trim().toLowerCase();
  const limit = DENSITY_BY_SCENE[scene] ?? DENSITY_DEFAULT;

  const count = cjkCount(stripTags(s.inner));
  if (count > limit) {
    add('P2', 'text-density',
      `本页中文字 ${count} 超密度阈值 ${limit}（场景 ${scene || '缺省'}，layout ${layout || '?'}），建议精简`, page);
  }

  // 标题判断句：取首个 h1/h2；金句页豁免
  const titleM = /<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/i.exec(s.inner);
  if (titleM) {
    const t = stripTags(titleM[1]).trim();
    if (/[？?]\s*$/.test(t) && !QUOTE_LAYOUTS.has(layout)) {
      add('P2', 'title-not-assertive', `标题以问号结尾，建议改判断句：「${t}」`, page);
    }
  }
});

/* =====================================================================
 * 第二批：工程规范 新增机检项（按可行性分批落地）
 * 每个检查块头部注释：工程规范几节 + 防住哪个毛病 + 级别（口径自洽铁律）。
 * 设计纪律：精确限定触发面，绝不破坏现有【已实现】检查（它们不改一行），
 *           现有合规 deck-compute.html 仍 P0=0（exit 0）。
 * ===================================================================== */

/* —— 预备：抽好 CSS 文本与规则块，供多个 CSS 类检查复用 —— */
const styleCss = extractStyleCss(html);
const inlineStyles = extractInlineStyles(html);
const cssRules = splitCssRules(styleCss);

/* —— P0 · chart-handwritten-svg（工程规范-B1 /  · 防「图表烂(LLM 盲画坐标)」）——
   定量图 SVG 必须带 data-rendered-by="blcaptain-chart" 签名（经锁定渲染层产出）；
   仅非定量示意图（flow/diagram/icon）允许手写。触发面：figure[data-slot] 内的 <svg>，
   或自带定量图类名（chart/spark/…）的 <svg>。逐页报，便于定位。 */
slides.forEach((s, i) => {
  const page = i + 1;
  // 找出本页所有 figure[data-slot] 的内容区间，用于判定「svg 是否在定量 figure 内」。
  const figRanges = [];
  const figOpenRe = /<figure\b[^>]*\bdata-slot\b[^>]*>/gi;
  let fo;
  while ((fo = figOpenRe.exec(s.inner)) !== null) {
    const start = fo.index;
    const close = s.inner.indexOf('</figure>', start);
    figRanges.push([start, close === -1 ? s.inner.length : close]);
  }
  const inQuantFigure = (idx) => figRanges.some(([a, b]) => idx > a && idx < b);

  const svgRe = /<svg\b[^>]*>/gi;
  let sm;
  while ((sm = svgRe.exec(s.inner)) !== null) {
    const tag = sm[0];
    const classes = classList(tag);
    // 非定量示意图（flow/diagram/icon/arrow/deco/glyph）豁免（工程规范 唯一允许手写场景）。
    if (classHits(classes, NON_QUANT_SVG_CLASSES)) continue;
    const isQuant = inQuantFigure(sm.index) || classHits(classes, QUANT_CHART_CLASSES);
    if (!isQuant) continue; // 既不在定量 figure、也无定量图类名 → 不在本检触发面
    const rb = (attr(tag, 'data-rendered-by') || '').toLowerCase();
    const signed = rb === CHART_RENDERED_BY || rb === CHART_RENDERED_BY + '-d3';
    if (!signed) {
      add('P0', 'chart-handwritten-svg',
        `定量图 <svg${classes.length ? ' class="' + classes.join(' ') + '"' : ''}> 缺签名 data-rendered-by="${CHART_RENDERED_BY}"（定量图禁手写，须经锁定渲染层产出；非定量示意图请加 class="flow|diagram|icon" 豁免）`, page);
    }
  }
});

/* —— P1 · page-missing-role（工程规范 规则 10.1 · 防「为多样硬加页」）——
   现有 validator 只查「全 deck 各一页 state/ground/act」(P0)；本项补「单页是否缺/错 role」。 */
slides.forEach((s, i) => {
  const page = i + 1;
  const role = attr(s.openTag, 'data-role');
  if (!role) {
    add('P1', 'page-missing-role', '该页缺少 data-role（无叙事职责，疑似为多样硬加页）', page);
  } else if (!SIGNAL_ROLES.has(role)) {
    add('P1', 'page-missing-role', `该页 data-role="${role}" 不在 SIGNAL 六档 {state/insight/ground/narrow/act/leave}`, page);
  }
});

/* —— P1 · layout-role-mismatch（工程规范 映射表 · 防「布局与角色非法配对」）——
   signal-cover→state、final-move→act、social-card→leave 等强配对，违例报。
   只在「layout 在白名单 + role 合法」时判配对，避免与上面两检重复报。 */
slides.forEach((s, i) => {
  const page = i + 1;
  const layout = layoutSeq[i];
  const role = attr(s.openTag, 'data-role');
  if (!layout || !LAYOUT_WHITELIST.has(layout)) return;
  if (!role || !SIGNAL_ROLES.has(role)) return;
  const okRoles = LAYOUT_ROLE_OK[layout];
  if (okRoles && !okRoles.includes(role)) {
    add('P1', 'layout-role-mismatch',
      `布局「${layout}」与角色 data-role="${role}" 非法配对（合法：${okRoles.join('/')}）`, page);
  }
});

/* —— 能量谱（工程规范 /  · 防「为多样硬加页/谱塌/过载」）——
   级别裁定（遵用户口径 +  D-4）：deck 尚未采纳 data-energy 时整体作 P2 提示，
   一旦采纳（出现 ≥1 个 data-energy）则逐页 P1 + 配对 P2 + 曲线 。 */
const energySeq = slides.map((s) => attr(s.openTag, 'data-energy'));
const energyAdopted = energySeq.some((e) => e); // 是否已开始标注契约
if (!energyAdopted) {
  // 未采纳：不硬拦，仅一条 P2 提示（不逐页刷屏）。
  add('P2', 'energy-not-adopted',
    '本 deck 未声明任何 data-energy（能量谱契约未采纳）。工程规范 建议每页标 data-energy ∈ {blast,calm,half} 以启用节奏机检（采纳后将逐页校验缺失/配对/曲线）');
} else {
  // 已采纳：缺失/非法 → P1（page-missing-energy）；layout×energy 配对 → P2。
  slides.forEach((s, i) => {
    const page = i + 1;
    const layout = layoutSeq[i];
    const e = energySeq[i];
    if (!e) {
      add('P1', 'page-missing-energy', '该页缺少 data-energy ∈ {blast,calm,half}（能量谱已采纳，须逐页声明）', page);
      return;
    }
    if (!ENERGY_LEVELS.has(e)) {
      add('P1', 'page-missing-energy', `该页 data-energy="${e}" 非法（应为 blast/calm/half）`, page);
      return;
    }
    const okE = layout && LAYOUT_ENERGY_OK[layout];
    if (okE && !okE.includes(e)) {
      add('P2', 'layout-energy-mismatch',
        `能量与布局气质不符：布局「${layout}」标 data-energy="${e}"（合法：${okE.join('/')}）`, page);
    }
  });
  // 能量曲线（工程规范）：连续 ≥4 calm → P1；连续 ≥2 blast 非合法首尾 → P1；末页非 blast → P2。
  let calmRun = 0, blastRun = 0;
  for (let i = 0; i < energySeq.length; i++) {
    const e = energySeq[i];
    calmRun = e === 'calm' ? calmRun + 1 : 0;
    blastRun = e === 'blast' ? blastRun + 1 : 0;
    if (calmRun === ENERGY_MAX_CALM_RUN) {
      add('P1', 'energy-curve-flat',
        `第 ${i - ENERGY_MAX_CALM_RUN + 2}-${i + 1} 页连续 ${ENERGY_MAX_CALM_RUN} 页 calm 无换挡（缺节奏断点·看睡）`, i + 1);
    }
    // 连续 2 blast：豁免「合法首尾」——首页(封面)与末页(收尾/金句)允许炸。
    if (blastRun >= ENERGY_MAX_BLAST_RUN) {
      const isHeadTail = (i - 1) === 0 || i === energySeq.length - 1;
      if (!isHeadTail) {
        add('P1', 'energy-overload',
          `第 ${i} -${i + 1} 页连续 ${blastRun} 页 blast（非合法首尾·能量过载落差磨平）`, i + 1);
      }
    }
  }
  // 克制收尾人格豁免 end-not-peak（收尾「判断落定」非「炸场回峰」·非虎头蛇尾）：
  //   luxury-minimal（设计决策 判断震慑）+ de-stijl（设计决策 设计规范 秩序静态非对称平衡·calm 为主·不炸尾）
  //   + editorial（设计决策 / 设计规范 编辑收束克制·主编结论落定非炸场回峰）
  //   + zen（设计决策 设计规范/ 反证2 演示禅收=静观余韵·禅 ≠ blast 回峰·把判断落定后让画面静下来·绝无 blast）。
  const END_NOT_PEAK_EXEMPT = new Set(['luxury-minimal', 'de-stijl', 'editorial', 'zen']);
  if (energySeq.length > 1 && !END_NOT_PEAK_EXEMPT.has(deckTheme)) {
    const last = energySeq[energySeq.length - 1];
    if (last && last !== 'blast') {
      add('P2', 'energy-end-not-peak',
        `末页 data-energy="${last}" 非 blast（收尾未回峰·虎头蛇尾），建议收束页回到峰值`, energySeq.length);
    }
  }
}

/* —— P2 · text-density-by-layout + bullets-overflow（工程规范 · 防「过密 / 截断」）——
   把一维按 scene 升级为二维按 layout：字数超该 layout 上限 + 数 li/.card/.unit/节点超条数上限。 */
slides.forEach((s, i) => {
  const page = i + 1;
  const layout = layoutSeq[i] || '';
  const cap = DENSITY_BY_LAYOUT[layout];
  if (!cap) return; // 未登记的 layout 跳过（白名单已挡非法 layout）
  // 字数（CJK）二维上限。
  const chars = cjkCount(stripTags(s.inner));
  if (chars > cap.chars) {
    add('P2', 'text-density-by-layout',
      `本页中文字 ${chars} 超「${layout}」布局上限 ${cap.chars}（工程规范 二维容量），建议精简或拆页`, page);
  }
  // 要点/卡片/节点条数：统计 <li> + .card + .unit + .q（矩阵格）+ .node（时间线节点）等。
  if (cap.units > 0 || layout === 'signal-cover' || layout === 'social-card') {
    const liN = (s.inner.match(/<li\b/gi) || []).length;
    const cardN = (s.inner.match(/class="[^"]*\b(?:card|unit|q|node|kpi-cell|risk)\b[^"]*"/gi) || []).length;
    const unitN = Math.max(liN, cardN); // 取两种计数的较大者作「信息单元数」近似
    if (unitN > cap.units) {
      add('P2', 'bullets-overflow',
        `本页信息单元 ${unitN}（li/卡片/节点）超「${layout}」布局上限 ${cap.units}（工程规范），建议拆页或升级布局`, page);
    }
  }
});

/* —— P1 · content-budget（设计决策 · 变长不崩 · 跨三人格）——
   按 [data-theme][data-layout] 取预算：标题 width-unit 超 titleU（→压穿内容/溢页）、行容器数超 rows（→溢页底裁切）→ P1。
   值由变长压测梯度扫描派生；真值 1:1 镜像 references/content-budgets.md。
   标题/行靶点支持 class 或语义标签(compute h1/h2·decision-matrix tr·compare li)。区别  全页密度 P2。 */
{
  const themeBudget = CONTENT_BUDGET[deckTheme];
  if (themeBudget) slides.forEach((s, i) => {
    const page = i + 1;
    const layout = layoutSeq[i] || '';
    const b = themeBudget[layout];
    if (!b) return;
    if (b.titleU) {
      const t = b.titleTag ? innerTextByTag(s.inner, b.titleTag) : (b.titleClass ? innerTextByClass(s.inner, b.titleClass) : null);
      if (t != null && widthUnits(t) > b.titleU) {
        add('P1', 'content-budget',
          `「${layout}」标题宽度 ${widthUnits(t)} 超预算 ${b.titleU}（width-unit·CJK×2）→ 压穿内容/溢页，须精炼标题：「${t.slice(0, 24)}…」`, page);
      }
    }
    if (b.rows) {
      const n = b.rowTag ? countByTag(s.inner, b.rowTag) : (b.rowClass ? countByClass(s.inner, b.rowClass) : 0);
      if (n > b.rows) {
        add('P1', 'content-budget',
          `「${layout}」行数 ${n}（${b.rowTag || '.' + b.rowClass}）超预算 ${b.rows} → 溢出页底裁切，须分页/提炼`, page);
      }
    }
  });
}

/* —— P0 · lux-empty-slogan（设计决策 · 时尚奢侈极简 A 维内容承载门 · 防「空口号 + 大留白」）——
   命门：luxury content 页若【无支撑元素】AND【CJK 字数 < 下限】→ 报。AND 逻辑精确锁定「既无支撑又没
   内容」的真空集：有支撑→过（量级/对比/图文/引言）；无支撑但字够→过（信念页·判断有分量被前序量级垫
   起）；二者皆无→红（空口号页·上次系统级失败的死法）。不误杀信念页（避免 OR 门强制每页带数字而退化
   成数据墙、撞第 6 人格）。支撑信号 = 结构化标记（data-support/img/figure/blockquote/.lux-num 等·排除
   页码 .pg 裸数字干扰）。字数下限初值·待 deck 梯度校准（类比 content-budget 设计决策）。仅本主题生效。 */
const LUX_MIN_JUDGMENT_CJK = 12; // 立场判断字数下限（初值·"少即是多"4/"留白是答案"5 < 12 必红·待校准）
const LUX_SUPPORT_RE = /\bdata-support\s*=|<(?:img|figure|blockquote)\b|class="[^"]*\b(?:lux-num|lux-stat|lux-fig|lux-cite)\b[^"]*"/i;
if (deckTheme === 'luxury-minimal') {
  slides.forEach((s, i) => {
    const page = i + 1;
    const layout = layoutSeq[i] || '';
    const hasSupport = LUX_SUPPORT_RE.test(s.inner);
    const chars = cjkCount(stripTags(s.inner));
    if (!hasSupport && chars < LUX_MIN_JUDGMENT_CJK) {
      add('P0', 'lux-empty-slogan',
        `「${layout}」页无支撑元素（数字/图/对比/引用）且正文 ${chars} 字 < 下限 ${LUX_MIN_JUDGMENT_CJK}：空口号+大留白=上次死法，每页须「判断+量级支撑」——请加支撑元素或展开判断（设计决策·A 维一票否决）`, page);
    }
  });
  // 门 4 · 禁 accent（设计决策 · 唯一无信号色人格·token 层即无 --accent；强调改用留白/字号/位置）
  if (/--accent\s*:/.test(html)) {
    add('P1', 'lux-accent-forbidden',
      'luxury-minimal 声明了 --accent（唯一无信号色人格·禁第二信号色：强调改用留白 + 字号/字重克制对比 + 位置）');
  }
  // 门 3 · Didone 仅 Display（正文类选择器禁 --font-veil/Playfair·路 2 反证：Didone 细线投影距离物理消失·正文须 Geist/Glow 18-24pt）
  for (const { sel, body } of cssRules) {
    const selLc = sel.toLowerCase();
    const isBodySel = CJK_BODY_SELECTORS.some((k) =>
      k.startsWith('.') ? selMentionsClass(selLc, k.slice(1))
                        : new RegExp(`(^|[\\s,>+~])${k}(?![\\w-])`, 'i').test(selLc));
    if (!isBodySel) continue;
    if (/font-family\s*:[^;}]*(?:--font-veil|playfair)/i.test(body)) {
      add('P1', 'lux-didone-body',
        `正文类选择器「${sel.slice(0, 40)}」用 Didone 薄纱字体做正文（--font-veil/Playfair）：Didone 绝不做正文（细线投影距离物理消失），正文须 Geist/Glow`);
    }
  }
}

/* =====================================================================
 * De Stijl 新造型主义 · 6 门机器强制地板（设计决策/ · 设计规范 · 方法论  · TDD red→green）
 * ---------------------------------------------------------------------
 * 秩序方言签名一句话「正交信息网格上的原色判断」的品味 OS 强制（设计规范）。
 * 全部门用 deckTheme==='de-stijl' 守卫——绝不误伤前 4 主题（五主题回归不破）。
 * 门定义口径 1:1 锚 设计决策/ / 设计规范 / 00-tokens-locked.md「De Stijl theme」块：
 *   ① ds-no-diagonal      禁 rotate/skew/对角 SVG/斜置 gradient → P0(transform/SVG) / P1(gradient)（撞构成主义命门）
 *   ② ds-palette-discipline 禁第四色/中间色(橙绿紫)/渐变多 stop/灰阶过渡 → P1（封闭三原色系统）
 *   ③ ds-primary-area     原色块静态估面积比 > 10% → P1（防铺满幼儿园·一主二从）
 *   ④ ds-saturation-cap   原色 token HSL 饱和度 > 0.70 → P1（挡纯 RGB 满饱和·浊历史颜料）
 *   ⑤ ds-content-bearing  网格区无支撑 AND CJK 字数 < 下限 → P0（沿用 luxury lux-empty-slogan·颜色=信息须真内容）
 *   ⑥ ds-cjk-no-faux-bold CJK-primary 选择器 font-weight≥700 无对应真面(面感知) / 缺全局 font-synthesis:none → P1（根治中文合成假粗·不误伤拉丁真 700）
 * ===================================================================== */
if (deckTheme === 'de-stijl') {
  // —— 公共工具：HSL 饱和度（挡纯 RGB·门④）+ 色相 hue（判中间色·门②）——
  const colorHSL = (str) => {
    const c = parseColor(str);
    if (!c) return null;
    const r = c.r / 255, g = c.g / 255, b = c.b / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
    let s = 0, h = 0;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return { h, s, l };
  };
  // —— De Stijl 系统色（封闭五色：浊三原色 token 实测值 + 黑白 + 暖灰·门②豁免锚）——
  //   从 TOKENS 区块读 --ds-red/yellow/blue/ink/bg/ink-dim/ink-faint 实际值（缺则用 00-tokens-locked 锚值兜底）。
  const sysColorVals = [];
  for (const tk of ['--ds-red', '--ds-yellow', '--ds-blue', '--ink', '--bg', '--ink-dim', '--ink-faint', '--stage-void', '--hud-fg', '--hud-fg-hi']) {
    const v = readTokenColor(tk); if (v) sysColorVals.push(v);
  }
  const sysHSL = sysColorVals.map(colorHSL).filter(Boolean);
  // 某色值是否「属系统封闭五色」：近似匹配任一系统色（RGB 距离阈值·容浊颜料微差 + opacity 派生），
  //   或本身是无彩低饱和(灰/黑/白·S≤0.18)——黑白灰是 De Stijl「非色」永远合法。
  const isSystemColor = (str) => {
    const c = parseColor(str); if (!c) return false;
    const hsl = colorHSL(str);
    if (hsl && (hsl.s <= 0.18 || hsl.l >= 0.95 || hsl.l <= 0.06)) return true; // 无彩非色（黑/白/灰）放行
    for (const sv of sysColorVals) {
      const s = parseColor(sv); if (!s) continue;
      const dist = Math.abs(c.r - s.r) + Math.abs(c.g - s.g) + Math.abs(c.b - s.b);
      if (dist <= 24) return true; // 近似系统色（容浊颜料/抗锯齿微差）
    }
    return false;
  };
  // De Stijl 三原色合法色相带（红≈0/360 · 黄≈45 · 蓝≈210–220）；落带外且有饱和 = 中间色（橙~30/绿~120/紫~280）。
  const isPrimaryHue = (h) =>
    (h >= 345 || h <= 18) ||           // 红
    (h >= 38 && h <= 58) ||            // 黄
    (h >= 195 && h <= 235);            // 蓝
  const PAINT_PROPS = ['background', 'background-color', 'fill', 'stroke', 'color', 'border-color',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color'];

  // —— 切「slide 内容」用的 HTML（剔除 .rotate-hint 竖屏提示块——aria-hidden·UI chrome·非 slide 内容·前人格蓝本继承）——
  const slideContentHtml = html.replace(/<div class="rotate-hint"[\s\S]*?<\/div>\s*(?=<script|<\/body)/i, ' ');
  // CSS 规则里也要把 rotate-hint / rhSpin 相关规则豁免（其 rotate ±90° 是竖屏提示动画·非 slide 对角）。
  const isRotateHintSel = (sel) => /\brotate-hint\b|\brh-ico\b|\brh-sq\b|\brh-msg\b/i.test(sel);

  /* —— 门① ds-no-diagonal（命门·撞构成主义·设计规范 史实：对角=van Doesburg 异端·Mondrian 1925 退出）——
     ① transform:rotate(非正交角)/skew/matrix 切变 → P0；② 对角 SVG <line>(x1≠x2 且 y1≠y2)/斜 polyline → P0；
     ③ linear-gradient 斜角(非 0/90/180/270/正交关键词) → P1。豁免：rotate-hint/rhSpin(竖屏提示·rotate ±90°)。 */
  {
    // 正交旋转角白名单（竖屏提示/正交摆位允许）：0 / ±90 / 180 / 270 / 360 deg（含 turn 等价）。
    const isOrthoAngle = (a) => {
      let deg = null;
      let mm = /(-?\d*\.?\d+)\s*deg/i.exec(a); if (mm) deg = parseFloat(mm[1]);
      else { mm = /(-?\d*\.?\d+)\s*turn/i.exec(a); if (mm) deg = parseFloat(mm[1]) * 360; }
      if (deg == null) return false;
      const n = ((deg % 360) + 360) % 360;
      return n === 0 || n === 90 || n === 180 || n === 270;
    };
    // transform 值里是否含「斜置」（rotate 非正交 / 任意 skew / matrix 含切变项）。
    const transformIsDiagonal = (val) => {
      const v = val.toLowerCase();
      let mm;
      const rotRe = /rotate[xyz]?\s*\(([^)]*)\)/gi;
      while ((mm = rotRe.exec(v)) !== null) { if (!isOrthoAngle(mm[1])) return true; }
      if (/skew[xy]?\s*\(/i.test(v)) return true;                  // 任意 skew = 切变
      if (/matrix(3d)?\s*\(/i.test(v)) {                            // matrix(a,b,c,d,...)：b 或 c ≠0 = 旋转/切变
        const nums = (mm = /matrix(?:3d)?\s*\(([^)]*)\)/i.exec(v)) ? mm[1].split(',').map((x) => parseFloat(x.trim())) : [];
        if (nums.length >= 4 && (Math.abs(nums[1]) > 1e-3 || Math.abs(nums[2]) > 1e-3)) return true;
      }
      return false;
    };
    let flagged = false;
    // CSS 规则体 transform（剔 rotate-hint/rhSpin 选择器）。@keyframes rhSpin 的块选择器是「0%」「100%」等数字——
    //   splitCssRules 跳过 @ 头但其内部块会被抓到；用 isRotateHintSel 抓不到数字选择器，故对 keyframes 内的
    //   rotate 单独豁免：只在 rhSpin keyframes 文本内的 rotate 不计（下方先剔除 rhSpin keyframes 整块再扫）。
    const cssNoKeyframesRhSpin = styleCss.replace(/@keyframes\s+rhSpin\s*\{[\s\S]*?\}\s*\}/i, ' ')
                                         .replace(/@keyframes\s+rhSpin\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/i, ' ');
    for (const { sel, body } of splitCssRules(cssNoKeyframesRhSpin)) {
      if (isRotateHintSel(sel)) continue;
      const tm = /transform\s*:\s*([^;{}]+)/i.exec(body);
      if (tm && transformIsDiagonal(tm[1])) {
        add('P0', 'ds-no-diagonal',
          `选择器「${sel.slice(0, 40)}」transform 含斜置（rotate 非正交/skew/matrix 切变）：De Stijl 禁对角（撞构成主义命门·设计规范 van Doesburg 异端→Mondrian 1925 退出），线/块只水平垂直`);
        flagged = true; break;
      }
    }
    // 行内 style transform（剔 rotate-hint 宿主）。
    if (!flagged) for (const { decl, tag } of inlineStyles) {
      if (isRotateHintSel((attr(tag, 'class') || ''))) continue;
      const tm = /transform\s*:\s*([^;]+)/i.exec(decl);
      if (tm && transformIsDiagonal(tm[1])) {
        add('P0', 'ds-no-diagonal',
          `行内 style transform 含斜置（rotate 非正交/skew/matrix）于 <${(/^<([a-z][\w-]*)/i.exec(tag) || [])[1] || '?'}>：De Stijl 禁对角（线/块只水平垂直·设计规范）`);
        flagged = true; break;
      }
    }
    // 对角 SVG <line>（slide 内容·已剔 rotate-hint）：x1≠x2 且 y1≠y2 = 斜线。
    if (!flagged) {
      const lineRe = /<line\b[^>]*>/gi; let lm;
      while ((lm = lineRe.exec(slideContentHtml)) !== null) {
        const x1 = parseFloat(attr(lm[0], 'x1') ?? 'NaN'), x2 = parseFloat(attr(lm[0], 'x2') ?? 'NaN');
        const y1 = parseFloat(attr(lm[0], 'y1') ?? 'NaN'), y2 = parseFloat(attr(lm[0], 'y2') ?? 'NaN');
        if ([x1, x2, y1, y2].every(Number.isFinite) && x1 !== x2 && y1 !== y2) {
          add('P0', 'ds-no-diagonal',
            `SVG <line>(x1=${x1},y1=${y1} → x2=${x2},y2=${y2}) 为对角线（x≠x 且 y≠y）：De Stijl 禁对角，线只水平(y 等)或垂直(x 等)`);
          flagged = true; break;
        }
      }
    }
    // 斜置 gradient（slide 内容·CSS + 行内）：linear-gradient(<非正交角 / to 双向对角>) → P1（角度斜置）。
    if (!flagged) {
      const scanGrad = (txt) => {
        // 抓 linear-gradient( 后到第一个逗号前的「方向头」（角度或 to 关键词），整段判正交。
        const re = /linear-gradient\s*\(\s*([^,)]+)/gi; let g2;
        while ((g2 = re.exec(txt)) !== null) {
          const head = g2[1].trim().toLowerCase();
          // ① to <单方向> 正交放行；to <双方向>（to top right 等）= 对角，报。
          const toM = /^to\s+([a-z\s]+)$/.exec(head);
          if (toM) { if (toM[1].trim().split(/\s+/).length >= 2) return true; continue; }
          // ② 带角度（deg/turn）：非正交 → 斜置报。
          if (/deg|turn/.test(head)) { if (!isOrthoAngle(head)) return true; continue; }
          // ③ 无方向/角度（默认 to bottom·正交）放行。
        }
        return false;
      };
      if (scanGrad(slideContentHtml.replace(/@keyframes[\s\S]*?\}\s*\}/gi, ' '))) {
        add('P1', 'ds-no-diagonal',
          `检测到斜置 linear-gradient(非 0/90/180/270deg·非 to-正交方向)：De Stijl 禁角度斜置渐变（对角动势=构成主义·设计规范）`);
      }
    }
  }

  /* —— 门② ds-palette-discipline（封闭三原色系统·禁第四色/中间色橙绿紫/渐变多 stop/灰阶过渡）——
     ① paint 属性(background/fill/stroke/color/border-color...)用「中间色」(有饱和但落原色色相带外·橙绿紫) → P1；
     ② gradient ≥3 color stop(含中间过渡) → P1。豁免：系统封闭五色(三原色近似 + 黑白灰非色) + var() 引用 + currentColor/transparent。 */
  {
    const offenders = new Set();   // 去重的违规色值
    let multiStopHit = false;
    const checkPaintVal = (val) => {
      const v = val.trim();
      // 渐变里数 color stop：颜色 token 出现 ≥3 处 = 多 stop 过渡。
      if (/gradient\s*\(/i.test(v)) {
        const stops = (v.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|var\(\s*--[\w-]+\s*\)/gi) || []).length;
        if (stops >= 3) multiStopHit = true;
      }
      // 逐个字面色值（hex/rgb）判中间色——var() 引用走 token（系统色），跳过；currentColor/transparent/inherit 跳过。
      const litRe = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi; let lm;
      while ((lm = litRe.exec(v)) !== null) {
        const lit = lm[0];
        if (isSystemColor(lit)) continue;            // 系统封闭五色（含黑白灰非色）放行
        const hsl = colorHSL(lit);
        if (!hsl) continue;
        if (hsl.s <= 0.18 || hsl.l >= 0.95 || hsl.l <= 0.06) continue; // 无彩非色放行
        if (!isPrimaryHue(hsl.h)) offenders.add(lit);  // 有饱和 + 落原色色相带外 = 中间色（橙绿紫）
      }
    };
    // 扫 CSS 规则体 paint 属性 + 任何含 gradient 的声明。
    const declRe = /([a-z-]+)\s*:\s*([^;{}]+)/gi; let dm;
    while ((dm = declRe.exec(styleCss)) !== null) {
      const prop = dm[1].toLowerCase();
      if (PAINT_PROPS.includes(prop) || /gradient\s*\(/i.test(dm[2])) checkPaintVal(dm[2]);
    }
    // 扫行内 style + SVG fill/stroke 属性。
    for (const { decl } of inlineStyles) {
      let im; const r = /([a-z-]+)\s*:\s*([^;]+)/gi;
      while ((im = r.exec(decl)) !== null) { const p = im[1].toLowerCase(); if (PAINT_PROPS.includes(p) || /gradient\s*\(/i.test(im[2])) checkPaintVal(im[2]); }
    }
    const svgAttrRe = /\b(?:fill|stroke)\s*=\s*"([^"]+)"/gi; let sm;
    while ((sm = svgAttrRe.exec(html)) !== null) { if (!/^(none|currentcolor|transparent)$/i.test(sm[1].trim())) checkPaintVal(sm[1]); }
    if (offenders.size > 0) {
      add('P1', 'ds-palette-discipline',
        `检测到非系统色（中间色橙/绿/紫·落原色色相带外）${offenders.size} 种：${[...offenders].slice(0, 8).join(', ')}；De Stijl 封闭三原色系统禁第四色/中间色（设计决策·只红黄蓝 + 黑白）`);
    }
    if (multiStopHit) {
      add('P1', 'ds-palette-discipline',
        `检测到 ≥3 色标的渐变（中间过渡/灰阶）：De Stijl 禁渐变过渡（原色作克制重音·非渐变·设计规范）`);
    }
  }

  /* —— 门③ ds-primary-area（原色块面积比 > 10% → P1·防铺满幼儿园 Mondrian 红≈蓝 9 倍）——
     静态估算（设计决策后果「若精确机检成本高·P1 lint·art-direction 审计补位」口径）：
     扫每条「primary-bg(--ds-red/yellow/blue) + position:absolute」CSS 规则，按其 width/height（或 left/right/top/bottom
     在 1280×720 画板上反推）算盒面积，同一 base 选择器的 width/height 可来自修饰类规则(.x.big)——合并取值。
     逐页累加 / 921600 比；> 10% 报。无法静态解析尺寸的块（尺寸全 var()/calc·或纯修饰类拆分无法归并）保守跳过（lint 不误杀）。 */
  {
    const STAGE_W = 1280, STAGE_H = 720, STAGE_AREA = STAGE_W * STAGE_H;
    // 解析一段 CSS 声明体里的几何（px·resolve --rule-* token）。返回 {left,right,top,bottom,width,height} 数值或 undefined。
    const ruleTokens = { '--rule-bold': 10, '--rule-mid': 6, '--rule-thin': 2, '--line-w': 1, '--line-w-hair': 0.5 };
    const geomPx = (body, key) => {
      const re = new RegExp(`(?:^|[;{\\s])${key}\\s*:\\s*([^;}]+)`, 'i');
      const mm = re.exec(body); if (!mm) return undefined;
      const raw = mm[1].trim().toLowerCase();
      if (raw === '0') return 0;
      const vm = /var\(\s*(--[\w-]+)\s*\)/.exec(raw); if (vm && ruleTokens[vm[1]] != null) return ruleTokens[vm[1]];
      const pm = /(-?\d*\.?\d+)px\b/.exec(raw); if (pm) return parseFloat(pm[1]);
      return undefined; // %/calc/其他 var → 无法静态解析
    };
    // base 选择器键（去掉末段修饰类 .big/.small/.now 等，用于把拆分的 width/height 归并回主块）。
    const baseKey = (sel) => sel.trim().toLowerCase().replace(/\s+/g, ' ');
    // 收集：① primary-bg 块的 base 选择器集；② 每个选择器块的几何（含修饰类块）。
    const primaryBaseSels = [];     // { sel, body }
    const geomBySel = new Map();    // selStr → merged geom
    const isPrimaryBg = (body) => /(?:background(?:-color)?)\s*:\s*[^;{}]*var\(\s*--ds-(?:red|yellow|blue)\s*\)/i.test(body);
    for (const { sel, body } of cssRules) {
      if (isRotateHintSel(sel)) continue;            // rotate-hint .rh-sq 小方块非 slide 内容
      const g = {};
      for (const k of ['left', 'right', 'top', 'bottom', 'width', 'height']) { const v = geomPx(body, k); if (v !== undefined) g[k] = v; }
      if (Object.keys(g).length) geomBySel.set(baseKey(sel), Object.assign(geomBySel.get(baseKey(sel)) || {}, g));
      if (isPrimaryBg(body)) primaryBaseSels.push({ sel: baseKey(sel), body });
    }
    // 对每个 primary-bg 选择器，归并「自身几何 + 同前缀修饰类几何」求 width×height。
    const resolveWH = (sel) => {
      // 合并自身 + 所有以「sel.」开头(同元素加修饰类)或「sel」结尾匹配的几何块。
      let g = Object.assign({}, geomBySel.get(sel) || {});
      for (const [k, v] of geomBySel) {
        if (k !== sel && (k.startsWith(sel + '.') || k.startsWith(sel + ':') || k === sel)) g = Object.assign({}, v, g);
      }
      let w = g.width, h = g.height;
      if (w === undefined && g.left !== undefined && g.right !== undefined) w = STAGE_W - g.left - g.right;
      if (h === undefined && g.top !== undefined && g.bottom !== undefined) h = STAGE_H - g.top - g.bottom;
      if (w === undefined || h === undefined) return null;
      // 出血到画外则 clamp 进画板（cover 红块 right:0/bottom:0 已是画内尺寸；负值保护）。
      w = Math.max(0, Math.min(w, STAGE_W)); h = Math.max(0, Math.min(h, STAGE_H));
      return w * h;
    };
    // 把每个 primary 选择器归到「它属于哪一页」——选择器前缀含某页 layout class（.ds-cover 等）则归该页；
    // 否则（全局 primary 块·罕见）按全 deck 计入每页保守不做，归「未定位」桶单独按整 deck 最大页估。
    // 工程化：逐页累加该页 layout 前缀匹配的 primary 块面积。
    const layoutClassOf = (i) => (layoutSeq[i] || '');   // ds-cover 等（既是 data-layout 又是 class·deck 实测一致）
    slides.forEach((s, i) => {
      const page = i + 1;
      const lay = layoutClassOf(i); if (!lay) return;
      let sum = 0, anyResolved = false;
      for (const { sel } of primaryBaseSels) {
        if (!new RegExp(`\\.${lay}\\b`).test(sel)) continue;   // 只算属本页 layout 的 primary 块
        const a = resolveWH(sel);
        if (a != null) { sum += a; anyResolved = true; }
      }
      if (anyResolved && sum / STAGE_AREA > 0.10) {
        add('P1', 'ds-primary-area',
          `第 ${page} 页「${lay}」原色块静态估面积 ${(sum / STAGE_AREA * 100).toFixed(1)}% > 10%（防铺满幼儿园·一主二从 Mondrian 红≈蓝 9 倍·原色作 ≤10% 克制重音）`, page);
      }
    });
  }

  /* —— 门④ ds-saturation-cap（原色 token HSL 饱和度 > 0.70 → P1·挡纯 RGB 满饱和 浊历史颜料）——
     设计规范 证据：满饱和纯 RGB = 幼儿园/daycare 语义。三原色须浊（加白调浊·S ≤0.70）。 */
  {
    const CAP = 0.70;
    for (const tk of ['--ds-red', '--ds-yellow', '--ds-blue']) {
      const v = readTokenColor(tk); if (!v) continue;
      const hsl = colorHSL(v);
      if (hsl && hsl.s > CAP) {
        add('P1', 'ds-saturation-cap',
          `原色 ${tk}(${v}) HSL 饱和度 ${hsl.s.toFixed(2)} > 上限 ${CAP}：纯 RGB 满饱和=幼儿园语义（设计规范），须用浊历史颜料原色（加白调浊）`);
      }
    }
  }

  /* —— 门⑤ ds-content-bearing（沿用 luxury lux-empty-slogan AND 模式）——
     网格区【无支撑元素】AND【CJK 字数 < 下限】→ P0（颜色=信息·无内容的色块=违 防空贴图）。
     AND 精确锁「既无支撑又没内容」真空集：有支撑(数字/图/对比/引用/原色数据块)→过；无支撑但字够(判断有分量·被网格垫起)→过。
     字数下限初值·待 deck 梯度校准（同 luxury 口径）。支撑信号排除页码 .pg 裸数字干扰。仅本主题生效。 */
  {
    const DS_MIN_JUDGMENT_CJK = 10; // 立场判断字数下限（初值·"秩序"2/空 < 10 必红·待校准）
    const DS_SUPPORT_RE = /\bdata-support\s*=|<(?:img|figure|blockquote|svg)\b|class="[^"]*\b(?:ds-num|ds-stat|dsc-anchor|dmg-anchor|ddb-hero|ddb-cell|dsr-cell|drt-stat|drt-bar|dtl-node|dix-row|dls-row|dqt-cite|ds-fig)\b[^"]*"/i;
    slides.forEach((s, i) => {
      const page = i + 1;
      const layout = layoutSeq[i] || '';
      const hasSupport = DS_SUPPORT_RE.test(s.inner);
      const chars = cjkCount(stripTags(s.inner));
      if (!hasSupport && chars < DS_MIN_JUDGMENT_CJK) {
        add('P0', 'ds-content-bearing',
          `「${layout}」网格区无支撑元素（数字/图/对比/引用/原色数据块）且正文 ${chars} 字 < 下限 ${DS_MIN_JUDGMENT_CJK}：空贴图=颜色无信息（违），每页须「判断 + 量级支撑」——加支撑元素或展开判断（设计决策·沿用 luxury A 维一票否决）`, page);
      }
    });
  }

  /* —— 门⑥ ds-cjk-no-faux-bold（P1·根治中文 faux-bold 回归 follow-up·方法论  提议）——
     缺陷形态：中文落 Glow Sans SC（仅 400 面）却写 font-weight≥700 → 浏览器合成假粗（墨量+25~35%·笔画发糊·劣质感）。
     它不在任何现有门（font-coverage 验「字在 cmap」过 / palette·area·saturation 与字重无关），靠终极审计+像素墨量法才抓出，
     无机器护栏会回归（下个 deck 一写 700 中文又复发）——故机器化。检测两点：
       ① 中文承载选择器声明 font-weight≥700，而其 CJK 字体（Glow）@font-face 无对应 ≥700 真面 → P1（必合成假粗）。
       ② deck 缺全局 font-synthesis:none 兜底 → P1（任何漏网的 700 中文都会合成）。
     ★ 不误伤拉丁（守卫思路类比 luxury didone-body 门只对正文类生效）：拉丁 Space Grotesk/Geist 有真 700/可变轴，
       门①只对【CJK-primary 栈】（首选字体即 CJK 字体·如 --font-cjk / "Glow Sans SC",...）生效；
       Latin-primary 栈（--font-geo/--font-sans·首选 Space Grotesk/Geist）的 700 是拉丁真 bold，由门②兜底（其内中文若漏写 700·靠 font-synthesis:none 压住），门①绝不报它。
     ★ 面感知（防误伤构成主义式真重面）：从 @font-face 实读 CJK 字体真有的字重区间——若 Glow 另声明真 800 面，则 CJK 800 命中真面·非合成·不报。
     全 deckTheme==='de-stijl' 守卫内·绝不误伤前 4 主题（诊断：compute Glow 100-900/constructivist Glow 含 800 真面/info-data·luxury 中文无 ≥700·均不触发）。 */
  {
    // —— 解析 @font-face：family(小写) → 该族全部声明字重区间 [[min,max],...]（单值 400 视作 [400,400]）——
    const faceWeights = new Map();
    const faceRe = /@font-face\s*\{([^}]*)\}/gi; let fc;
    while ((fc = faceRe.exec(html)) !== null) {
      const body = fc[1];
      const famM = /font-family\s*:\s*([^;}]+)/i.exec(body); if (!famM) continue;
      const fam = famM[1].trim().replace(/^["']|["']$/g, '').toLowerCase();
      // font-weight 可为单值（400）或区间（300 700 / 300,700）；缺省=normal=400。
      let lo = 400, hi = 400;
      const fwM = /font-weight\s*:\s*([^;}]+)/i.exec(body);
      if (fwM) {
        const nums = fwM[1].trim().match(/\d+/g);
        if (nums && nums.length >= 2) { lo = parseInt(nums[0], 10); hi = parseInt(nums[1], 10); }
        else if (nums && nums.length === 1) { lo = hi = parseInt(nums[0], 10); }
        else if (/bold/i.test(fwM[1])) { lo = hi = 700; }
      }
      if (!faceWeights.has(fam)) faceWeights.set(fam, []);
      faceWeights.get(fam).push([lo, hi]);
    }
    // 某 family 是否声明了 ≥w 的真面（任一区间 max≥w）。无该 family 的 @font-face → 视作仅 400 面（最坏假设·=de-stijl 真实情形·CJK 字体须打包·见 font-coverage 门）。
    const familyHasRealFace = (fam, w) => {
      const ranges = faceWeights.get(fam);
      if (!ranges) return w <= 400;           // 未声明 @font-face → 仅 400 真面假设
      return ranges.some(([, hi]) => hi >= w);
    };
    // 已知 CJK 字体名（小写·首选即它则该栈把中文落到它·与 font stack 注释「中文落 Glow」一致）。
    const CJK_FONT_NAMES = ['glow sans sc', 'noto sans sc', 'source han sans', 'source han sans sc',
      'pingfang sc', 'smiley sans', '思源黑体', '思源宋体', '得意黑', 'noto serif sc', 'source han serif'];
    // 解析「一个 font-family 值」的首选族（resolve var(--font-*) 到其 token 定义的首选族）。返回小写族名或 null。
    const resolveFirstFamily = (val) => {
      let v = val.trim();
      const vm = /^var\(\s*(--font-[\w-]+)\s*\)/i.exec(v);
      if (vm) {
        const defRe = new RegExp(`${vm[1]}\\s*:\\s*([^;}\\n]+)`, 'i');
        const def = defRe.exec(html); if (!def) return null;
        v = def[1].trim();
      }
      const first = v.split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase();
      return first || null;
    };
    // 该 font-family 值是否「CJK-primary」（首选族 = 已知 CJK 字体）——即此选择器的中文会落到该 CJK 字体。
    //   Latin-primary 栈（首选 Space Grotesk/Geist 等拉丁）→ 非 CJK-primary，门①不报（拉丁真 700·靠门②兜中文）。
    const cjkPrimaryFontOf = (val) => {
      const first = resolveFirstFamily(val);
      return first && CJK_FONT_NAMES.includes(first) ? first : null;
    };
    // 解析 font-weight 值为数字（bold→700·normal→400·100-900 数字直取；其他/var 返回 null 跳过）。
    const weightNum = (raw) => {
      const v = raw.trim().toLowerCase();
      if (/^\d+$/.test(v)) return parseInt(v, 10);
      if (v === 'bold' || v === 'bolder') return 700;
      if (v === 'normal' || v === 'lighter') return 400;
      return null;
    };

    // —— 门⑥① 扫 CSS 规则 + 行内 style：CJK-primary 选择器 font-weight≥700 而 CJK 字体无对应真面 → P1 ——
    const FAUX_THRESH = 700;   // 经典 bold 阈值（与 设计决策 / 方法论 「中文绝不写 700」口径一致）
    let fauxHit = false;
    const scanFauxRule = (famVal, fwVal, where) => {
      if (fauxHit) return;
      const cjkFam = cjkPrimaryFontOf(famVal); if (!cjkFam) return;     // 非 CJK-primary（拉丁栈）→ 门①不管
      const w = weightNum(fwVal); if (w == null || w < FAUX_THRESH) return;
      if (familyHasRealFace(cjkFam, w)) return;                          // CJK 字体有 ≥w 真面（面感知）→ 命中真面·非合成
      add('P1', 'ds-cjk-no-faux-bold',
        `${where} font-family 首选 CJK 字体「${cjkFam}」(仅 ≤${(faceWeights.get(cjkFam) || [[400, 400]]).reduce((m, [, hi]) => Math.max(m, hi), 0)} 真面) 写 font-weight:${w}≥${FAUX_THRESH}：中文必合成假粗（墨量+25~35%·笔画发糊）——中文强调改靠红块/字号/留白（非字重），或落有真 ≥700 面的字体`);
      fauxHit = true;
    };
    for (const { sel, body } of cssRules) {
      const famM = /font-family\s*:\s*([^;{}]+)/i.exec(body);
      const fwM = /font-weight\s*:\s*([^;{}]+)/i.exec(body);
      if (famM && fwM) scanFauxRule(famM[1], fwM[1], `选择器「${sel.slice(0, 40)}」`);
    }
    for (const { decl, tag } of inlineStyles) {
      const famM = /font-family\s*:\s*([^;]+)/i.exec(decl);
      const fwM = /font-weight\s*:\s*([^;]+)/i.exec(decl);
      if (famM && fwM) scanFauxRule(famM[1], fwM[1], `行内 style 于 <${(/^<([a-z][\w-]*)/i.exec(tag) || [])[1] || '?'}>`);
    }

    // —— 门⑥② 全局 font-synthesis 兜底缺失 → P1（任何漏网 700 中文都会合成）——
    //   认 font-synthesis:none / font-synthesis-weight:none（含 ... 其他子值组合·只要 weight 被 none 关）·任意选择器（通常 *{...}）。
    const hasSynthGuard =
      /font-synthesis\s*:\s*(?:[^;{}]*\b)?none\b/i.test(styleCss) ||
      /font-synthesis-weight\s*:\s*none/i.test(styleCss);
    if (!hasSynthGuard) {
      add('P1', 'ds-cjk-no-faux-bold',
        `deck 缺全局 font-synthesis:none 兜底：De Stijl 中文落 Glow（仅 400 面），任何漏网的 font-weight≥700 中文都会被浏览器合成假粗——须加 *{font-synthesis:none}（强制无真面就用最近真面·拉丁 Space Grotesk/Geist 有真 700/可变轴不受影响）`);
    }
  }
}

/* =====================================================================
 * 编辑主义 Editorial · 6 门机器强制地板（设计决策 · 设计规范 · TDD red→green）
 * ---------------------------------------------------------------------
 * 编辑判断方言签名「杂志 feature spread 上、被严格网格驾驭的衬线编辑判断」的品味 OS 强制（设计规范）。
 * 全部门用 deckTheme==='editorial' 守卫——绝不误伤前 5 主题（六主题回归不破）。
 * 门定义口径 1:1 锚 设计决策 / 设计规范 / 00-tokens-locked.md「editorial theme」块：
 *   ① ed-serif-body       正文类选择器字体非 serif/宋体（用了无衬线做正文）→ P0（守唯一衬线人格命根·撞前五套无衬线即红）
 *   ② ed-body-font-floor  正文类选择器 computed 字号 < 地板（拉丁 --body-floor-latin 32px / 中文 --body-floor-cjk 25.33px）→ P1（守命根投影可读·升档自 cjk-min-font-size·诚实标非 WCAG 法定）
 *   ③ ed-single-red       出现编辑红之外的第二信号色 → P1（守单 accent ≤10%·禁多信号·区别 De Stijl 三原色）
 *   ④ ed-grid-baseline    deck 无多栏网格声明 + 无 baseline line-height → P1（守"富密度不乱"骨架·杂志精密·可宽松）
 *   ⑤ ed-content-bearing  feature 区无支撑 AND CJK 字数 < 下限 → P0（沿用 luxury/de-stijl AND 模式·防空版式·栏位是骨架非终点）
 *   ⑥ ds-cjk-no-faux-bold 守卫扩 editorial：CJK 承载选择器 font-weight≥700 无真面(面感知) / 缺全局 font-synthesis:none → P1（守宋体衬线命根·防 700 合成假粗·复用 设计决策 面感知逻辑）
 * ===================================================================== */
if (deckTheme === 'editorial') {
  // —— 编辑主义衬线/宋体命根字体名（小写·正文须落其一 字体血统总表 + 系统兜底衬线）——
  const ED_SERIF_FONTS = ['source serif 4 smtext', 'source serif 4 text', 'source serif 4', 'source serif',
    'newsreader text', 'newsreader', 'source han serif sc', 'source han serif', 'noto serif sc',
    'songti sc', 'simsun', 'georgia', 'serif'];
  // 正文承载类关键词（命中即视为承载编辑正文/叙事的元素·须衬线 + 守字号地板）。
  //   = 现有 CJK_BODY_SELECTORS（body/.body/.prose/.note/.sub/.txt/.lead/p）+ 编辑版式正文/引语/解读类。
  const ED_BODY_CLASS_KW = ['body', 'prose', 'note', 'sub', 'txt', 'lead', 'read', 'coda', 'deck-lead',
    'efs-deck-lead', 'etc-body', 'etc-lead', 'e3c-p', 'esf-read', 'ecl-coda', 'eqp-quote', 'eqp-cite',
    'eix-sub', 'ech-sub', 'etl-p', 'edg-k', 'est-lead'];
  // 解析「一个 font-family 值」首选族（resolve var(--font-*) 到 token 定义首选族·小写）。
  const edResolveFirstFamily = (val) => {
    let v = val.trim();
    const vm = /^var\(\s*(--font-[\w-]+)\s*\)/i.exec(v);
    if (vm) {
      const def = new RegExp(`${vm[1]}\\s*:\\s*([^;}\\n]+)`, 'i').exec(html);
      if (!def) return null;
      v = def[1].trim();
      // --font-display:var(--font-serif) 这类二级间接·再解一层。
      const vm2 = /^var\(\s*(--font-[\w-]+)\s*\)/i.exec(v);
      if (vm2) { const d2 = new RegExp(`${vm2[1]}\\s*:\\s*([^;}\\n]+)`, 'i').exec(html); if (d2) v = d2[1].trim(); }
    }
    const first = v.split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase();
    return first || null;
  };
  // 元信息子类关键词（分工律：来源/数据/页码/单位/题注用无衬线小字·非正文·不守衬线命根 + 字号地板）。
  //   eyebrow/kicker 另靠 uppercase 豁免；这里挡「正文类内嵌的 .src/.ref 来源行」等被父选择器误带进的元信息子元素。
  const ED_META_CLASS_KW = ['src', 'ref', 'foot', 'issue', 'kicker', 'cap', 'meta', 'folio', 'pg',
    'eyebrow', 's-k', 'num-k', 'it-meta', 'fig-cap', 'fig-no'];
  // 选择器是否「正文承载类」（命中正文类关键词·或裸 p/.lead 等）——且非 eyebrow/kicker（uppercase）·非元信息子类（.src 等）。
  const edIsBodySel = (sel) => {
    const selLc = sel.toLowerCase();
    if (ED_META_CLASS_KW.some((k) => selMentionsClass(selLc, k))) return false; // 元信息子类（.src/.ref/页码…）→ 非正文
    return ED_BODY_CLASS_KW.some((k) => selMentionsClass(selLc, k)) ||
           /(^|[\s,>+~])p(?![\w-])/i.test(selLc);
  };

  /* —— 门① ed-serif-body（命根·P0·正文须 serif/宋体·撞前五套无衬线即红·设计规范①）——
     正文承载类选择器（非 uppercase 元信息）声明 font-family·其首选族非衬线/宋体 → 报。守"唯一衬线人格"。 */
  {
    let hit = false;
    for (const { sel, body } of cssRules) {
      if (hit) break;
      if (/text-transform\s*:\s*uppercase/i.test(body)) continue; // eyebrow/kicker 元信息层（分工律·无衬线合法）→ 不计
      if (!edIsBodySel(sel)) continue;
      const famM = /font-family\s*:\s*([^;{}]+)/i.exec(body);
      if (!famM) continue;
      const first = edResolveFirstFamily(famM[1]);
      if (!first) continue;
      if (!ED_SERIF_FONTS.includes(first)) {
        add('P0', 'ed-serif-body',
          `正文承载类选择器「${sel.slice(0, 40)}」首选字体「${first}」非衬线/宋体（用了无衬线做正文）：违编辑主义衬线命根（六人格唯一衬线正文人格·设计规范①）——正文须落 Source Serif/Newsreader/思源宋体；无衬线只给 kicker/标签/数据/单位（分工律）`);
        hit = true;
      }
    }
  }

  /* —— 门② ed-body-font-floor（字号地板·P1·守命根投影可读·设计规范③·诚实标非 WCAG 法定）——
     正文承载类选择器（非 uppercase 元信息）font-size < 地板 → 报。地板从 deck token 读：
       中文承载（首选宋体/serif·或 var(--font-serif/cjk/display)）→ 中文地板 --body-floor-cjk（25.33px·19pt 等效）；
       拉丁承载（首选 Libre Franklin 等无衬线·罕见正文）→ 拉丁地板 --body-floor-latin（32px·24pt 等效）。
     升档自现有全局 cjk-min-font-size（editorial 提高 + 新增拉丁地板）。 */
  {
    // 从 TOKENS 读地板值（缺则用 设计决策 实测锚值兜底）。
    const floorLatin = parseFloat((/--body-floor-latin\s*:\s*([\d.]+)px/i.exec(tokensBlock || html) || [])[1]) || 32;
    const floorCjk = parseFloat((/--body-floor-cjk\s*:\s*([\d.]+)px/i.exec(tokensBlock || html) || [])[1]) || 25.33;
    const reported = new Set();
    for (const { sel, body } of cssRules) {
      if (/text-transform\s*:\s*uppercase/i.test(body)) continue; // eyebrow/kicker 元信息层不守正文地板
      if (!edIsBodySel(sel)) continue;
      const fsM = /font-size\s*:\s*(-?\d*\.?\d+)px\b/i.exec(body);
      if (!fsM) continue;
      const px = parseFloat(fsM[1]);
      // 首选族判中/拉丁：宋体/serif 栈 → 中文地板；无衬线（Libre Franklin 等）→ 拉丁地板。
      const famM = /font-family\s*:\s*([^;{}]+)/i.exec(body);
      const first = famM ? edResolveFirstFamily(famM[1]) : 'serif';
      const isLatinPrimary = first && !ED_SERIF_FONTS.includes(first); // 无衬线首选 = 拉丁正文（罕见）
      const floor = isLatinPrimary ? floorLatin : floorCjk;
      if (px < floor) {
        const key = `${px}|${sel}`;
        if (reported.has(key)) continue;
        reported.add(key);
        add('P1', 'ed-body-font-floor',
          `正文承载类选择器「${sel.slice(0, 40)}」font-size:${px}px < ${isLatinPrimary ? '拉丁' : '中文'}正文地板 ${floor}px（${isLatinPrimary ? '--body-floor-latin·24pt' : '--body-floor-cjk·19pt'} 等效）：衬线/宋体正文逆投影共识·字号不到地板则笔画糊化·命根徒有其名（设计规范③·机器强制地板·诚实标非 WCAG 法定阈值）`);
      }
    }
  }

  /* —— 门③ ed-single-red（单 accent·P1·禁第二信号色·设计规范②·守"单编辑红 ≤10%"共性）——
     paint 属性（color/background/fill/stroke/border-color...）用「编辑红之外的第二信号色」（有饱和的彩色·非编辑红色相带·非黑白灰非色）→ 报。
     区别 De Stijl 三原色系统：editorial 单 accent，引入第二饱和色即违共性。豁免：编辑红近似 + 黑白灰非色 + var() 引用（走 token·系统色）。 */
  {
    const edColorHSL = (str) => {
      const c = parseColor(str); if (!c) return null;
      const r = c.r / 255, g = c.g / 255, b = c.b / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
      let s = 0, h = 0;
      if (d !== 0) {
        s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
        if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
        h *= 60; if (h < 0) h += 360;
      }
      return { h, s, l };
    };
    // 编辑红 token 实际值（缺则用锚值）——其色相带 ±18° 为合法 accent 带（含描红 wash 低饱和版）。
    const edRedVal = readTokenColor('--ed-red') || '#9E2B22';
    const edRedHSL = edColorHSL(edRedVal);
    const edRedHue = edRedHSL ? edRedHSL.h : 5; // 偏深暖砖红 ≈ 5°
    const isEditorialRed = (hsl) => {
      // 红色相带（绕 0/360·容 ±20°）即视作编辑红家族（含描红/wash）。
      const dh = Math.min(Math.abs(hsl.h - edRedHue), 360 - Math.abs(hsl.h - edRedHue));
      return dh <= 20 || hsl.h >= 340 || hsl.h <= 20;
    };
    const ED_PAINT_PROPS = ['color', 'background', 'background-color', 'fill', 'stroke', 'border-color',
      'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color'];
    const offenders = new Set();
    // 编辑红/非色（黑白灰）放行；其余有饱和彩色 = 第二信号色。
    function isSystemColorEd(lit) {
      const hsl = edColorHSL(lit); if (!hsl) return true;
      if (hsl.s <= 0.18 || hsl.l >= 0.95 || hsl.l <= 0.06) return true; // 无彩非色（暖黑/纸白/灰）放行
      // 近似编辑红 token（RGB 距离）放行。
      const c = parseColor(lit), rc = parseColor(edRedVal);
      if (c && rc && (Math.abs(c.r - rc.r) + Math.abs(c.g - rc.g) + Math.abs(c.b - rc.b)) <= 24) return true;
      if (isEditorialRed(hsl)) return true; // 红家族（描红/wash）放行
      offenders.add(lit);
      return false;
    }
    // 扫 CSS paint 属性字面色值（var() 走 token·跳过；token 自身在色彩门另管）。
    const declRe = /([a-z-]+)\s*:\s*([^;{}]+)/gi; let dm;
    while ((dm = declRe.exec(styleCss)) !== null) {
      const prop = dm[1].toLowerCase();
      if (!ED_PAINT_PROPS.includes(prop)) continue;
      const litRe = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi; let lm;
      while ((lm = litRe.exec(dm[2])) !== null) isSystemColorEd(lm[0]);
    }
    // 扫行内 style + SVG fill/stroke 属性。
    for (const { decl } of inlineStyles) {
      let im; const r = /([a-z-]+)\s*:\s*([^;]+)/gi;
      while ((im = r.exec(decl)) !== null) { if (ED_PAINT_PROPS.includes(im[1].toLowerCase())) { const lr = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi; let l2; while ((l2 = lr.exec(im[2])) !== null) isSystemColorEd(l2[0]); } }
    }
    const svgAttrRe = /\b(?:fill|stroke)\s*=\s*"([^"]+)"/gi; let sm2;
    while ((sm2 = svgAttrRe.exec(html)) !== null) { if (!/^(none|currentcolor|transparent)$/i.test(sm2[1].trim()) && /^#|^rgb/i.test(sm2[1].trim())) isSystemColorEd(sm2[1].trim()); }
    if (offenders.size > 0) {
      add('P1', 'ed-single-red',
        `检测到编辑红之外的第二信号色 ${offenders.size} 种：${[...offenders].slice(0, 8).join(', ')}；编辑主义守"单编辑红 ≤10%"共性（禁多信号色·区别 De Stijl 三原色系统·设计规范②）——强调统一用单编辑红或暖黑/灰阶`);
    }
  }

  /* —— 门④ ed-grid-baseline（多栏/baseline·P1·守"富密度不乱"骨架·设计规范④·可宽松）——
     杂志精密 = 严格多栏网格 + baseline grid。检测 deck 是否有【多栏网格声明】(grid-template-columns / column-count ≥2)
     + 【baseline 行节奏】(正文 line-height)。二者全缺 → P1（富密度无骨架=杂乱）。可宽松：有其一骨架即认。 */
  {
    const hasMultiCol = /grid-template-columns\s*:[^;{}]*(?:repeat\s*\(\s*[2-9]|(?:[^;{}]*\b(?:1fr|[\d.]+px|minmax)\b[^;{}]*){2,})/i.test(styleCss) ||
                        /column-count\s*:\s*[2-9]/i.test(styleCss);
    const hasBaseline = /line-height\s*:\s*1\.[0-9]/i.test(styleCss); // 正文行高 = baseline 节奏近似
    if (!hasMultiCol && !hasBaseline) {
      add('P1', 'ed-grid-baseline',
        '编辑主义未检出多栏网格(grid-template-columns/column-count≥2)或 baseline 行节奏(正文 line-height)：杂志精密=严格多栏 + baseline grid 驾驭富密度（设计规范/④）——富密度无骨架=杂乱，请用多栏网格 + 正文行基线对齐');
    }
  }

  /* —— 门⑤ ed-content-bearing（内容承载·P0·沿用 luxury lux-empty-slogan / de-stijl ds-content-bearing AND 模式·设计规范⑤）——
     feature 版式区【无支撑元素】AND【CJK 字数 < 下限】→ P0（颜色/栏位是骨架·无内容=模板感空贴图·违编辑判断命根）。
     AND 精确锁「既无支撑又没内容」真空集：有支撑(数字/图/引用/数据点)→过；无支撑但字够(判断有分量·feature 承载)→过。
     字数下限初值·待 deck 梯度校准（同 luxury/de-stijl 口径）。支撑信号排除页码裸数字干扰。仅本主题生效。 */
  {
    const ED_MIN_JUDGMENT_CJK = 12; // 编辑判断字数下限（初值·空版式 < 12 必红·待校准·同 luxury 口径）
    const ED_SUPPORT_RE = /\bdata-support\s*=|<(?:img|figure|blockquote|svg)\b|class="[^"]*\b(?:d-num|s-num|esf-num|e3c-num|edg-num|eix-no|ech-fig-no|efs-data|ed-fig|ed-stat)\b[^"]*"/i;
    slides.forEach((s, i) => {
      const page = i + 1;
      const layout = layoutSeq[i] || '';
      const hasSupport = ED_SUPPORT_RE.test(s.inner);
      const chars = cjkCount(stripTags(s.inner));
      if (!hasSupport && chars < ED_MIN_JUDGMENT_CJK) {
        add('P0', 'ed-content-bearing',
          `「${layout}」feature 区无支撑元素（数字/图/引用/数据点）且正文 ${chars} 字 < 下限 ${ED_MIN_JUDGMENT_CJK}：模板感空贴图=栏位无编辑视角（违编辑判断命根·设计规范⑤）——每页须「编辑判断 + 内容承载」，请加支撑元素或展开判断（设计决策·沿用 luxury/de-stijl A 维一票否决）`, page);
      }
    });
  }

  /* —— 门⑥ ds-cjk-no-faux-bold 扩 editorial（faux-bold·P1·守宋体衬线命根·复用 设计决策 面感知）——
     编辑主义中文落思源宋体（真 Regular 400 + Medium 500 两面），任何 font-weight≥700 中文 → 浏览器合成假粗（墨量+25~35%·笔画发糊·糊化衬线命根）。
     与 De Stijl 第 6 门同算法（面感知·不误伤拉丁·复用思路）·守卫从 de-stijl 扩到也守 editorial：
       ① CJK 承载选择器(--font-cjk·首选思源宋体) font-weight≥700 而宋体无对应 ≥700 真面 → P1（必合成假粗）；
       ② 缺全局 font-synthesis:none 兜底 → P1（任何漏网 700 中文都会合成）。
     ★ 不误伤拉丁：拉丁 Source Serif 有真 600 Semibold / Libre Franklin 可变轴·门只对【CJK-primary 栈】生效·Latin-primary 700 由门②兜底。 */
  {
    const faceWeights = new Map();
    const faceRe = /@font-face\s*\{([^}]*)\}/gi; let fc;
    while ((fc = faceRe.exec(html)) !== null) {
      const fbody = fc[1];
      const famM = /font-family\s*:\s*([^;}]+)/i.exec(fbody); if (!famM) continue;
      const fam = famM[1].trim().replace(/^["']|["']$/g, '').toLowerCase();
      let lo = 400, hi = 400;
      const fwM = /font-weight\s*:\s*([^;}]+)/i.exec(fbody);
      if (fwM) {
        const nums = fwM[1].trim().match(/\d+/g);
        if (nums && nums.length >= 2) { lo = parseInt(nums[0], 10); hi = parseInt(nums[1], 10); }
        else if (nums && nums.length === 1) { lo = hi = parseInt(nums[0], 10); }
        else if (/bold/i.test(fwM[1])) { lo = hi = 700; }
      }
      if (!faceWeights.has(fam)) faceWeights.set(fam, []);
      faceWeights.get(fam).push([lo, hi]);
    }
    const familyHasRealFace = (fam, w) => {
      const ranges = faceWeights.get(fam);
      if (!ranges) return w <= 400;
      return ranges.some(([, hi]) => hi >= w);
    };
    // 编辑主义 CJK 字体名（小写·首选即它则中文落它·与 --font-cjk 注释「中文落思源宋体」一致）。
    const ED_CJK_FONT_NAMES = ['source han serif sc', 'source han serif', 'noto serif sc',
      'songti sc', 'simsun', '思源宋体'];
    const edResolveFirst = (val) => {
      let v = val.trim();
      const vm = /^var\(\s*(--font-[\w-]+)\s*\)/i.exec(v);
      if (vm) {
        const def = new RegExp(`${vm[1]}\\s*:\\s*([^;}\\n]+)`, 'i').exec(html); if (!def) return null;
        v = def[1].trim();
        const vm2 = /^var\(\s*(--font-[\w-]+)\s*\)/i.exec(v);
        if (vm2) { const d2 = new RegExp(`${vm2[1]}\\s*:\\s*([^;}\\n]+)`, 'i').exec(html); if (d2) v = d2[1].trim(); }
      }
      const first = v.split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase();
      return first || null;
    };
    const cjkPrimaryFontOf = (val) => {
      const first = edResolveFirst(val);
      return first && ED_CJK_FONT_NAMES.includes(first) ? first : null;
    };
    const weightNum = (raw) => {
      const v = raw.trim().toLowerCase();
      if (/^\d+$/.test(v)) return parseInt(v, 10);
      if (v === 'bold' || v === 'bolder') return 700;
      if (v === 'normal' || v === 'lighter') return 400;
      return null;
    };
    const FAUX_THRESH = 700;
    let fauxHit = false;
    const scanFauxRule = (famVal, fwVal, where) => {
      if (fauxHit) return;
      const cjkFam = cjkPrimaryFontOf(famVal); if (!cjkFam) return; // 非 CJK-primary（拉丁栈）→ 门①不管
      const w = weightNum(fwVal); if (w == null || w < FAUX_THRESH) return;
      if (familyHasRealFace(cjkFam, w)) return; // CJK 字体有 ≥w 真面（面感知）→ 非合成
      add('P1', 'ds-cjk-no-faux-bold',
        `${where} font-family 首选 CJK 字体「${cjkFam}」(仅 ≤${(faceWeights.get(cjkFam) || [[400, 400]]).reduce((m, [, hi]) => Math.max(m, hi), 0)} 真面) 写 font-weight:${w}≥${FAUX_THRESH}：中文必合成假粗（墨量+25~35%·笔画发糊·糊化衬线命根）——中文强调改靠编辑红/字号/真斜体（非字重），或落有真 ≥700 面的字体`);
      fauxHit = true;
    };
    for (const { sel, body } of cssRules) {
      const famM = /font-family\s*:\s*([^;{}]+)/i.exec(body);
      const fwM = /font-weight\s*:\s*([^;{}]+)/i.exec(body);
      if (famM && fwM) scanFauxRule(famM[1], fwM[1], `选择器「${sel.slice(0, 40)}」`);
    }
    for (const { decl, tag } of inlineStyles) {
      const famM = /font-family\s*:\s*([^;]+)/i.exec(decl);
      const fwM = /font-weight\s*:\s*([^;]+)/i.exec(decl);
      if (famM && fwM) scanFauxRule(famM[1], fwM[1], `行内 style 于 <${(/^<([a-z][\w-]*)/i.exec(tag) || [])[1] || '?'}>`);
    }
    const hasSynthGuard =
      /font-synthesis\s*:\s*(?:[^;{}]*\b)?none\b/i.test(styleCss) ||
      /font-synthesis-weight\s*:\s*none/i.test(styleCss);
    if (!hasSynthGuard) {
      add('P1', 'ds-cjk-no-faux-bold',
        `deck 缺全局 font-synthesis:none 兜底：editorial 中文落思源宋体（仅 400/500 面），任何漏网的 font-weight≥700 中文都会被浏览器合成假粗（糊化衬线命根）——须加 *{font-synthesis:none}（拉丁 Source Serif 真 600·Libre Franklin 可变轴不受影响）`);
    }
  }
}

/* =====================================================================
 * 演示禅 zen · 4 专属门 + ds-cjk-no-faux-bold 扩 zen（设计决策 · 设计规范 · TDD red→green）
 * ---------------------------------------------------------------------
 * 「空的信念 / Conviction through Emptiness」方言签名「暖墨黑底·一图一念·留白=被精密设计的容器」的品味 OS 强制（设计规范）。
 * 全部门用 deckTheme==='zen' 守卫——绝不误伤前 6 主题（七主题回归不破·新门只对 zen 触发）。
 * 门定义口径 1:1 锚 设计决策 / 设计规范 / 00-tokens-locked.md「zen theme」块：
 *   ① zen-one-focus       每页焦点载体数≠1（≥2 多焦点稀释 ma / =0 且无念=扯淡空板）→ P0（守一图一念命根·两头堵空与多·绝不主张"留白=高级"空洞）
 *   ② zen-ma-ratio        内容元素铺满画布（留白率过低·堆满牺牲呼吸）或 焦点死正中（非张力位）→ P1（守 ma=被设计的负空间·非偷懒空白）
 *   ③ zen-dark-readable   念/正文承载选择器 color on --bg 对比 < AAA投影地板(7.0) / < 大字死区(3.0) / 字号 < 暗底地板 → P1/P0（守暗底载义文字投影可读命根 由 ≥AA 4.5 提到 ≥AAA 7:1·真机投影质疑驱动）
 *   ④ zen-near-zero-color paint 属性出现饱和彩色（非暖墨/纸白/灰/mat 暖材质）→ P1（守近零彩色·强调靠字重 + 明度·不靠色·设计规范）
 *   ⑤ ds-cjk-no-faux-bold 守卫扩 zen：CJK 承载选择器 font-weight≥700 无真面(面感知) / 缺全局 font-synthesis:none → P1（守白从墨中显形命根·防 700 合成假粗·复用 设计决策 / editorial 设计决策 面感知逻辑）
 * 円相签名豁免：--enso-stroke 13px 笔宽是「图」(円相 ensō)非  分隔/网格/装饰线——token 为 var() 时 line-role 门静态判不了宽度→天然跳过放行
 *   （同 constructivist accent 实色粗杠豁免的同构理据·设计规范「円相用 CSS border」）；此处显式登记该豁免理据，门内不另设粗线检（円相不归线宽白名单管辖）。
 * ===================================================================== */
if (deckTheme === 'zen') {
  // —— 焦点载体 class（每内容页恰好一个·命根「一图一念」的"图/数/一念/材质"焦点·设计规范）——
  //   zc-conv=封面一念(文字即图) / ze-enso=円相图 / zs-claim=空当容器信念(文字即图) / zsh-panel=阴翳材质块
  //   / zn-fig=单数巨数 / zq-quote=拉引文 / zch-title=章命题 / zcl-claim=收束句。
  //   注：zch-no(极淡序数·aria-hidden 装饰)、z*-mark(短线骨架)、zc-sub/zch-lead/z*-note(副念/导语/注)、kicker/folio 均非焦点载体。
  //   实现期 扩建 6 版式焦点（每页恰一个·图形焦点用图形 class、文字即图用念 class·绝不双计致 N≥2 误报）：
  //     zhz-read=一线念(文字即图·横线 zhz-line 是骨架非焦点) / zmp-read=間念(文字即图·两点 zmp-dot 是「图的两极」非独立焦点·绝不计入致 N=2)
  //     / zvt-claim=竖排信念(文字即图) / zks-stone=枯山水单石(图形焦点·念 zks-read 配它·耙痕 zks-rake 非焦点)
  //     / zgr-read=渐变念(文字即图·渐变场是 background 非元素) / zsq-read=序列念(文字即图·点 zsq-row i 是节奏的「图」非独立焦点·绝不计入致 N=4)。
  const ZEN_FOCUS_CLASSES = ['zc-conv', 'ze-enso', 'zs-claim', 'zsh-panel', 'zn-fig', 'zq-quote', 'zch-title', 'zcl-claim',
    'zhz-read', 'zmp-read', 'zvt-claim', 'zks-stone', 'zgr-read', 'zsq-read'];
  // 念承载 class（焦点配的"一句念/判断"·文字焦点自带念→其本身即念；图形焦点 enso/panel 配独立念）。
  //   实现期 扩建：文字即图者本身即念(zhz-read/zmp-read/zvt-claim/zgr-read/zsq-read)；图形焦点 zks-stone 配独立念 zks-read。
  const ZEN_READ_CLASSES = ['zc-conv', 'ze-read', 'zs-claim', 'zsh-claim', 'zn-read', 'zq-quote', 'zch-title', 'zcl-claim',
    'zhz-read', 'zmp-read', 'zvt-claim', 'zks-read', 'zgr-read', 'zsq-read'];
  const ZEN_MIN_NIAN_CJK = 6; // 「念」字数下限（一句判断·空板 < 6 字即视作无念·两头堵的"扯淡空"侧）

  /* —— 门① zen-one-focus（命根·P0·一图一念·两头堵空与多·设计规范①· 机器地板）——
     每页数焦点载体数 N：N≥2 → 多焦点稀释 ma（违一图一念）；N==0 且念字数 < 下限 → 扯淡空板（空到没承载）。
     恰好 N==1 → 过（一图一念达标：焦点自带念 或 图形焦点配念）。沿用 luxury/de-stijl/editorial「两头堵」AND 模式。 */
  {
    const focusCountIn = (inner) =>
      ZEN_FOCUS_CLASSES.reduce((n, kw) =>
        n + (inner.match(new RegExp(`class="[^"]*\\b${kw}\\b[^"]*"`, 'gi')) || []).length, 0);
    const nianCharsIn = (inner) => {
      // 念字数 = 焦点/念承载 class 元素内的 CJK 字数之和（排版骨架/kicker/folio 不计）。
      let chars = 0;
      for (const kw of ZEN_READ_CLASSES) {
        const re = new RegExp(`<([a-z][\\w-]*)[^>]*class="[^"]*\\b${kw}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/\\1>`, 'gi');
        let mm; while ((mm = re.exec(inner)) !== null) chars += cjkCount(stripTags(mm[2]));
      }
      return chars;
    };
    slides.forEach((s, i) => {
      const page = i + 1;
      const layout = layoutSeq[i] || '';
      const n = focusCountIn(s.inner);
      if (n >= 2) {
        add('P0', 'zen-one-focus',
          `「${layout}」检出 ${n} 个焦点载体（円相/巨数/信念/材质/引文/章题…）：多焦点竞争 = ma 被稀释·违一图一念命根（设计规范①）——每页恰好一个焦点承载一个不容回避判断，绝不堆焦点（设计决策·沿用 A 维一票否决）`, page);
      } else if (n === 0) {
        const nian = nianCharsIn(s.inner);
        if (nian < ZEN_MIN_NIAN_CJK) {
          add('P0', 'zen-one-focus',
            `「${layout}」无焦点载体 且 念 ${nian} 字 < 下限 ${ZEN_MIN_NIAN_CJK}：只标题/kicker + 大白板 = 扯淡留白（空到没承载·违一图一念命根·设计规范①· 反证4「绝不主张留白=高级」）——须落一个焦点（円相/巨数/一句信念）+ 一句念（设计决策·两头堵的"空"侧）`, page);
        }
      }
    });
  }

  /* —— 门② zen-ma-ratio（P1·留白率高位 + 焦点张力位非死正中·设计规范②·）——
     ma = 被精密设计的负空间（非偷懒空白）。两条机器信号：
       ② a 铺满检测：任一承载文字的内容元素显式 width ≥ 画布 90%(≥1152px) AND height ≥ 画布 90%(≥648px) → 留白被吃光（堆满牺牲呼吸）→ 报；
       ② b 死正中检测：焦点元素被显式居中（left+right 对称 或 left:50%+translateX(-50%) 同时纵向也居中域）属"焦点死正中" → 违张力位（rule-of-thirds/非对称）。
     ★ 口径保守（只抓确凿违规·不误杀）：deck-zen 焦点落张力位（封面下三分/円相右上/数字上三分偏左）→ 不报；居中引文/收束句是纵向偏上(top~250/268)非死正中域→放行。 */
  {
    // 取某 class 元素的 CSS 规则体（合并 <style> 选择器命中 .kw 的 + 行内 style）。
    const cssBodyForClass = (kw) => {
      let body = '';
      for (const { sel, body: b } of cssRules) if (selMentionsClass(sel.toLowerCase(), kw)) body += ';' + b;
      return body;
    };
    const pxOf = (body, prop) => {
      const m = new RegExp(`(?:^|[;{\\s])${prop}\\s*:\\s*(-?\\d*\\.?\\d+)px\\b`, 'i').exec(body);
      return m ? parseFloat(m[1]) : null;
    };
    const DECK_W = 1280, DECK_H = 720;
    // ② a 铺满检测：内容承载 class（焦点 + 念）显式宽高近满画布 → 留白被吃光。
    slides.forEach((s, i) => {
      const page = i + 1;
      const layout = layoutSeq[i] || '';
      let flooded = false, where = '';
      for (const kw of [...new Set([...ZEN_FOCUS_CLASSES, ...ZEN_READ_CLASSES])]) {
        if (!new RegExp(`class="[^"]*\\b${kw}\\b[^"]*"`, 'i').test(s.inner)) continue; // 该页确有此元素
        const body = cssBodyForClass(kw) + ';' + ((/* 行内 */(s.inner.match(new RegExp(`class="[^"]*\\b${kw}\\b[^"]*"[^>]*style="([^"]*)"`, 'i')) || [])[1]) || '');
        const w = pxOf(body, 'width'), h = pxOf(body, 'height');
        if (w != null && h != null && w >= DECK_W * 0.9 && h >= DECK_H * 0.9) { flooded = true; where = kw; break; }
      }
      if (flooded) {
        add('P1', 'zen-ma-ratio',
          `「${layout}」承载元素「.${where}」显式宽高近满画布（≥90%·${DECK_W}×${DECK_H}）：留白被吃光 = ma 被稀释（堆满牺牲呼吸·违留白=被设计的容器·设计规范②）——焦点须落张力位 + 大面积「空」邀请，绝不铺满`, page);
      }
    });
    // ② b 死正中检测：焦点元素 left:50%+translateX(-50%) AND top 落纵向死正中域（~330–390·画布中线 360±30）→ 违张力位。
    slides.forEach((s, i) => {
      const page = i + 1;
      const layout = layoutSeq[i] || '';
      for (const kw of ZEN_FOCUS_CLASSES) {
        if (!new RegExp(`class="[^"]*\\b${kw}\\b[^"]*"`, 'i').test(s.inner)) continue;
        const body = cssBodyForClass(kw);
        const hCentered = /left\s*:\s*50%/i.test(body) && /translateX\(\s*-50%\s*\)/i.test(body);
        const top = pxOf(body, 'top');
        if (hCentered && top != null && top >= 330 && top <= 390) {
          add('P1', 'zen-ma-ratio',
            `「${layout}」焦点「.${kw}」水平居中 + top:${top}px 落纵向死正中域（画布中线 360±30）：焦点死正中 = 违张力位（rule-of-thirds/非对称·设计规范②）——焦点须落张力位（下三分/对角交点·非死正中）`, page);
        }
      }
    });
  }

  /* —— 门③ zen-dark-readable（暗底浅字 WCAG + 字号地板·P0/P1·设计规范③·命根工程·投影可读）——
     暗底（--bg 暖墨黑）对字号/对比更敏感（极小焦点 + 暗底有看不清风险·设计规范 反证1）。念/正文承载选择器：
       ③ a 对比：其 color on --bg 实测对比 < AAA 投影地板(7.0) → P1（暗底载义文字投影糊·公众演讲环境光冲淡低对比 由 ≥AA 4.5 提到 ≥AAA 7:1）；< 大字死区(3.0) → P0（几乎不可读）。
       ③ b 字号：CJK 承载正文 font-size < 中文地板 --body-floor-cjk（25.33px）/ 拉丁 < --body-floor-latin（32px）→ P1（暗底对字号更敏感·缩到看不清）。
     ★ 只检"念/正文承载"选择器（含 zc-sub/z*-note/z*-lead 副念导语·须 ≥地板可读）·不误伤 kicker/folio/源注（uppercase 元信息·另档）·不误伤巨号焦点(zc-conv/zn-fig·远超地板)。 */
  {
    const bg = readTokenColor('--bg') || '#211E17';
    const floorLatin = parseFloat((/--body-floor-latin\s*:\s*([\d.]+)px/i.exec(tokensBlock || html) || [])[1]) || 32;
    const floorCjk = parseFloat((/--body-floor-cjk\s*:\s*([\d.]+)px/i.exec(tokensBlock || html) || [])[1]) || 25.33;
    // 念/正文承载 class（须暗底可读·守地板）= 念承载 + 副念/导语/注（解释「空=容器」的次级文字·设计规范）。
    //   实现期 扩建注/副念（中文注 zhz/zks/zgr/zsq-note 须 ≥地板可读·zmp-note/zvt-src 是 uppercase 元信息→门内 uppercase 豁免跳过·加入无害）。
    const ZEN_READABLE_KW = [...new Set([...ZEN_READ_CLASSES, 'zc-sub', 'zch-lead', 'zsh-note', 'zn-note',
      'zhz-note', 'zmp-note', 'zvt-src', 'zks-note', 'zgr-note', 'zsq-note'])];
    // 解析 var(--x) → token 色值（复用 editorial edResolveFirstFamily 思路·只解一层够用）。
    const resolveColor = (val) => {
      let v = val.trim();
      const vm = /^var\(\s*(--[\w-]+)\s*\)/i.exec(v);
      if (vm) { const def = new RegExp(`${vm[1]}\\s*:\\s*([^;}\\n]+)`, 'i').exec(tokensBlock || html); if (def) v = def[1].trim(); }
      return v;
    };
    const reportedDR = new Set();
    for (const { sel, body } of cssRules) {
      const selLc = sel.toLowerCase();
      if (!ZEN_READABLE_KW.some((kw) => selMentionsClass(selLc, kw))) continue;
      if (/text-transform\s*:\s*uppercase/i.test(body)) continue; // kicker/源注（uppercase 元信息层）→ 不守正文可读
      // ③ a 对比
      const colM = /(?:^|[;{\s])color\s*:\s*([^;{}]+)/i.exec(body);
      if (colM) {
        const cv = resolveColor(colM[1]);
        const cr = contrastRatio(cv, bg);
        if (cr != null && cr < 7.0) {
          const key = `c|${sel.slice(0, 40)}|${cv}`;
          if (!reportedDR.has(key)) {
            reportedDR.add(key);
            const lvl = cr < 3.0 ? 'P0' : 'P1';
            add(lvl, 'zen-dark-readable',
              `念/正文承载「${sel.slice(0, 40)}」color「${cv}」on 暖墨黑 --bg(${bg}) 对比仅 ${cr.toFixed(2)}:1 < ${cr < 3.0 ? '大字死区 3.0' : 'AAA 投影地板 7.0'}:1：暗底载义文字投影下糊化（公众演讲环境光冲淡低对比·设计规范③· 反证1）——念/导语须纸白 --ink(13.13)/glow(14.50)/暖灰 --ink-soft(7.16 AAA)，绝不用近底色暗灰（设计决策 暗底投影机器地板·载义文字 ≥AAA 7:1·提自 设计决策 的 ≥AA 4.5）`);
          }
        }
      }
      // ③ b 字号地板
      const fsM = /font-size\s*:\s*(-?\d*\.?\d+)px\b/i.exec(body);
      if (fsM) {
        const px = parseFloat(fsM[1]);
        const famM = /font-family\s*:\s*([^;{}]+)/i.exec(body);
        // 首选 Source Sans 3 等拉丁面 → 拉丁地板；否则（思源黑体/var(--font-cjk)）→ 中文地板。
        const isLatinPrimary = famM && /^\s*(?:var\(\s*--font-latin|["']?source sans)/i.test(famM[1].trim());
        const floor = isLatinPrimary ? floorLatin : floorCjk;
        if (px < floor) {
          const key = `s|${sel.slice(0, 40)}|${px}`;
          if (!reportedDR.has(key)) {
            reportedDR.add(key);
            add('P1', 'zen-dark-readable',
              `念/正文承载「${sel.slice(0, 40)}」font-size:${px}px < ${isLatinPrimary ? '拉丁' : '中文'}地板 ${floor}px（${isLatinPrimary ? '--body-floor-latin·24pt' : '--body-floor-cjk·19pt'}）：暗底对字号更敏感·缩到笔画糊化看不清（设计规范③·命根工程·暗底机器地板·诚实标非 WCAG 法定）`);
          }
        }
      }
    }
  }

  /* —— 门④ zen-near-zero-color（近零彩色·P1·强调靠字重 + 明度·不靠色·设计规范④）——
     paint 属性（color/background/fill/stroke/border-color…）出现"饱和彩色"（非暖墨黑/纸白/灰阶非色·非 mat 暖材质色相带）→ 报。
     守『绝不做』禁多信号色 + 演示禅"光只从墨中显·不滥彩"的同构纪律：强调统一靠真字重（300↔500）+ 明度（glow），绝不引彩色 accent。
     豁免：暖墨/纸白/glow/灰（无彩非色 s≤.18 或极暗/极亮）+ mat 暖材质（kraft/谷崎金箔·暖色相带 ~30–55°·稀用）+ var() 引用（走 token·系统色）。 */
  {
    const zenHSL = (str) => {
      const c = parseColor(str); if (!c) return null;
      const r = c.r / 255, g = c.g / 255, b = c.b / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
      let s = 0, h = 0;
      if (d !== 0) {
        s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
        if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
        h *= 60; if (h < 0) h += 360;
      }
      return { h, s, l };
    };
    const matVal = readTokenColor('--mat') || '#C2B393';
    const matRgb = parseColor(matVal);
    const ZEN_PAINT_PROPS = ['color', 'background', 'background-color', 'fill', 'stroke', 'border-color',
      'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color'];
    const offenders = new Set();
    const isSystemColorZen = (lit) => {
      const hsl = zenHSL(lit); if (!hsl) return true;
      if (hsl.s <= 0.18 || hsl.l >= 0.95 || hsl.l <= 0.07) return true; // 无彩非色（暖墨/纸白/灰/glow）放行
      // mat 暖材质近似（RGB 距离）放行——谷崎金箔/kraft 暖材质点（稀用·非信号彩色）。
      const c = parseColor(lit);
      if (c && matRgb && (Math.abs(c.r - matRgb.r) + Math.abs(c.g - matRgb.g) + Math.abs(c.b - matRgb.b)) <= 30) return true;
      // 暖材质色相带（kraft/金箔暖黄褐 ~28–58°）且中低饱和 → 放行（材质点非信号彩色）。
      if (hsl.h >= 28 && hsl.h <= 58 && hsl.s <= 0.45) return true;
      offenders.add(lit);
      return false;
    };
    const declRe = /([a-z-]+)\s*:\s*([^;{}]+)/gi; let dm;
    while ((dm = declRe.exec(styleCss)) !== null) {
      if (!ZEN_PAINT_PROPS.includes(dm[1].toLowerCase())) continue;
      const litRe = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi; let lm;
      while ((lm = litRe.exec(dm[2])) !== null) isSystemColorZen(lm[0]);
    }
    for (const { decl } of inlineStyles) {
      let im; const r = /([a-z-]+)\s*:\s*([^;]+)/gi;
      while ((im = r.exec(decl)) !== null) { if (ZEN_PAINT_PROPS.includes(im[1].toLowerCase())) { const lr = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi; let l2; while ((l2 = lr.exec(im[2])) !== null) isSystemColorZen(l2[0]); } }
    }
    const svgAttrRe = /\b(?:fill|stroke)\s*=\s*"([^"]+)"/gi; let sm2;
    while ((sm2 = svgAttrRe.exec(html)) !== null) { const v = sm2[1].trim(); if (!/^(none|currentcolor|transparent)$/i.test(v) && /^#|^rgb/i.test(v)) isSystemColorZen(v); }
    if (offenders.size > 0) {
      add('P1', 'zen-near-zero-color',
        `检出饱和彩色 ${offenders.size} 种：${[...offenders].slice(0, 8).join(', ')}；演示禅守近零彩色（强调靠真字重 300↔500 + 明度 glow·非颜色·设计规范④）——「光只从墨中显·不滥彩」（设计决策·守『绝不做』禁多信号色），强调改用纸白/glow 提亮 + Medium 真面`);
    }
  }

  /* —— 门⑤ ds-cjk-no-faux-bold 扩 zen（faux-bold·P1·守白从墨中显形命根·复用 设计决策 / editorial 设计决策 面感知）——
     演示禅中文落思源黑体（真 Light 300 + Regular 400 + Medium 500 三面·绝无 ≥700），任何 font-weight≥700 中文 → 浏览器合成假粗（墨量+25~35%·笔画发糊·糊化「白从墨中显形」命根·强调本应靠真 300↔500 字重对比 + glow 明度）。
     与 De Stijl/editorial 第 6 门同算法（面感知·不误伤拉丁·复用思路）·守卫从 editorial 扩到也守 zen：
       ① CJK 承载选择器(--font-cjk·首选思源黑体) font-weight≥700 而思源黑体无对应 ≥700 真面 → P1（必合成假粗）；
       ② 缺全局 font-synthesis:none 兜底 → P1（任何漏网 700 中文都会合成）。
     ★ 不误伤拉丁：拉丁 Source Sans 3 可变轴 300–700（真 700）·门只对【CJK-primary 栈】生效·Latin-primary 700 不报。 */
  {
    const faceWeights = new Map();
    const faceRe = /@font-face\s*\{([^}]*)\}/gi; let fc;
    while ((fc = faceRe.exec(html)) !== null) {
      const fbody = fc[1];
      const famM = /font-family\s*:\s*([^;}]+)/i.exec(fbody); if (!famM) continue;
      const fam = famM[1].trim().replace(/^["']|["']$/g, '').toLowerCase();
      let lo = 400, hi = 400;
      const fwM = /font-weight\s*:\s*([^;}]+)/i.exec(fbody);
      if (fwM) {
        const nums = fwM[1].trim().match(/\d+/g);
        if (nums && nums.length >= 2) { lo = parseInt(nums[0], 10); hi = parseInt(nums[1], 10); }
        else if (nums && nums.length === 1) { lo = hi = parseInt(nums[0], 10); }
        else if (/bold/i.test(fwM[1])) { lo = hi = 700; }
      }
      if (!faceWeights.has(fam)) faceWeights.set(fam, []);
      faceWeights.get(fam).push([lo, hi]);
    }
    const familyHasRealFace = (fam, w) => {
      const ranges = faceWeights.get(fam);
      if (!ranges) return w <= 400;
      return ranges.some(([, hi]) => hi >= w);
    };
    // 演示禅 CJK 字体名（小写·首选即它则中文落它·与 --font-cjk 注释「中文落思源黑体」一致）。
    const ZEN_CJK_FONT_NAMES = ['source han sans sc', 'source han sans', 'noto sans sc',
      'pingfang sc', 'microsoft yahei', '思源黑体'];
    const zenResolveFirst = (val) => {
      let v = val.trim();
      const vm = /^var\(\s*(--font-[\w-]+)\s*\)/i.exec(v);
      if (vm) {
        const def = new RegExp(`${vm[1]}\\s*:\\s*([^;}\\n]+)`, 'i').exec(html); if (!def) return null;
        v = def[1].trim();
        const vm2 = /^var\(\s*(--font-[\w-]+)\s*\)/i.exec(v);
        if (vm2) { const d2 = new RegExp(`${vm2[1]}\\s*:\\s*([^;}\\n]+)`, 'i').exec(html); if (d2) v = d2[1].trim(); }
      }
      const first = v.split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase();
      return first || null;
    };
    const cjkPrimaryFontOf = (val) => {
      const first = zenResolveFirst(val);
      return first && ZEN_CJK_FONT_NAMES.includes(first) ? first : null;
    };
    const weightNum = (raw) => {
      const v = raw.trim().toLowerCase();
      if (/^\d+$/.test(v)) return parseInt(v, 10);
      if (v === 'bold' || v === 'bolder') return 700;
      if (v === 'normal' || v === 'lighter') return 400;
      return null;
    };
    const FAUX_THRESH = 700;
    let fauxHit = false;
    const scanFauxRule = (famVal, fwVal, where) => {
      if (fauxHit) return;
      const cjkFam = cjkPrimaryFontOf(famVal); if (!cjkFam) return; // 非 CJK-primary（拉丁栈）→ 门①不管·绝不误伤拉丁
      const w = weightNum(fwVal); if (w == null || w < FAUX_THRESH) return;
      if (familyHasRealFace(cjkFam, w)) return; // CJK 字体有 ≥w 真面（面感知）→ 非合成
      add('P1', 'ds-cjk-no-faux-bold',
        `${where} font-family 首选 CJK 字体「${cjkFam}」(仅 ≤${(faceWeights.get(cjkFam) || [[400, 400]]).reduce((m, [, hi]) => Math.max(m, hi), 0)} 真面) 写 font-weight:${w}≥${FAUX_THRESH}：中文必合成假粗（墨量+25~35%·笔画发糊·糊化「白从墨中显形」命根）——演示禅强调改靠真字重对比（300↔500 思源黑体真面）+ 明度（glow），非合成假粗`);
      fauxHit = true;
    };
    for (const { sel, body } of cssRules) {
      const famM = /font-family\s*:\s*([^;{}]+)/i.exec(body);
      const fwM = /font-weight\s*:\s*([^;{}]+)/i.exec(body);
      if (famM && fwM) scanFauxRule(famM[1], fwM[1], `选择器「${sel.slice(0, 40)}」`);
    }
    for (const { decl, tag } of inlineStyles) {
      const famM = /font-family\s*:\s*([^;]+)/i.exec(decl);
      const fwM = /font-weight\s*:\s*([^;]+)/i.exec(decl);
      if (famM && fwM) scanFauxRule(famM[1], fwM[1], `行内 style 于 <${(/^<([a-z][\w-]*)/i.exec(tag) || [])[1] || '?'}>`);
    }
    const hasSynthGuard =
      /font-synthesis\s*:\s*(?:[^;{}]*\b)?none\b/i.test(styleCss) ||
      /font-synthesis-weight\s*:\s*none/i.test(styleCss);
    if (!hasSynthGuard) {
      add('P1', 'ds-cjk-no-faux-bold',
        `deck 缺全局 font-synthesis:none 兜底：zen 中文落思源黑体（仅 300/400/500 面），任何漏网的 font-weight≥700 中文都会被浏览器合成假粗（糊化「白从墨中显形」命根）——须加 *{font-synthesis:none}（拉丁 Source Sans 3 可变轴 300–700 不受影响）`);
    }
  }
}

/* —— P1 · cjk-min-font-size（工程规范 · 防「投屏看不清」）——
   正文类选择器 font-size < 16px → P1（硬下限）；16~18px → P2（建议提到 18px）。
   只测 <style> 内规则；选择器须命中正文类关键词，避免误伤 meta/label/.intel-stamp。 */
{
  const reported = new Set(); // 去重：同一 (px,选择器) 只报一次
  for (const { sel, body } of cssRules) {
    // 选择器命中正文类？（精确 token 或 .类）
    const selLc = sel.toLowerCase();
    const isBodySel = CJK_BODY_SELECTORS.some((k) =>
      k.startsWith('.') ? selMentionsClass(selLc, k.slice(1))
                        : new RegExp(`(^|[\\s,>+~])${k}(?![\\w-])`, 'i').test(selLc));
    if (!isBodySel) continue;
    // 工程规范：meta/label/eyebrow（≥14px 另档）不计入中文正文下限。
    // text-transform:uppercase 是 eyebrow/kicker 标志（中文正文不 uppercase），豁免——
    // 构成主义 .statement/.final .lead 兼作 mono uppercase eyebrow，非中文正文。
    if (/text-transform\s*:\s*uppercase/i.test(body)) continue;
    const fsM = /font-size\s*:\s*(-?\d*\.?\d+)px\b/i.exec(body);
    if (!fsM) continue;
    const px = parseFloat(fsM[1]);
    const key = `${px}|${sel}`;
    if (reported.has(key)) continue;
    reported.add(key);
    if (px < CJK_BODY_MIN_FONT_P1) {
      add('P1', 'cjk-min-font-size',
        `正文类选择器「${sel.slice(0, 40)}」font-size:${px}px < ${CJK_BODY_MIN_FONT_P1}px（中文投屏看不清·禁 10-13px）`);
    } else if (px < CJK_BODY_MIN_FONT_P2) {
      add('P2', 'cjk-min-font-size',
        `正文类选择器「${sel.slice(0, 40)}」font-size:${px}px < ${CJK_BODY_MIN_FONT_P2}px（建议中文正文提到 18px）`);
    }
  }
}

/* —— P1 · off-scale-spacing（工程规范 · 防「位置乱(随手 17px/23px)」）——
   间距属性(margin/padding/gap/top/...)的 px 值必须 ∈ 间距刻度集（令牌真值
   {8,16,24,32,48,64,80,96,160}）；不在刻度集且 >1px → P1。%/vw/vh/fr/clamp/var 跳过。
   0/0.5/1px 给 hairline 放行。去重：每个「违规 px 值」只报一次（避免刷屏），并列出现次数。 */
{
  // 收集 <style> 内 + 行内 style 的全部间距声明 px 值。
  const offValues = new Map(); // px → 次数
  const scanDecl = (propName, value) => {
    const isSpacingProp = SPACING_PROPS.some((p) => propName === p || propName.startsWith(p + '-'));
    if (!isSpacingProp) return;
    // 设计决策 间距双轨制：8pt 主刻度只管「流式节奏」(margin/padding/gap)；
    // 绝对定位属性(top/right/bottom/left/inset)=光学摆位、非栅格节奏 → 豁免。
    if (SPACING_POSITIONAL.some((p) => propName === p || propName.startsWith(p + '-'))) return;
    const pxs = pxValuesOf(value);
    if (pxs === 'skip') return;
    for (const px of pxs) {
      if (SPACING_HAIRLINE_OK.has(px)) continue;        // 0/0.5/1px 放行
      if (Math.abs(px) <= 1) continue;                   // ≤1px 放行（工程规范「>1px 才报」）
      if (SPACING_SCALE.has(Math.abs(px))) continue;     // 在主刻度集（8pt）
      if (SPACING_FINE.has(Math.abs(px))) continue;      // 设计决策 4pt 细档例外 {4,12,20}
      offValues.set(px, (offValues.get(px) || 0) + 1);
    }
  };
  // 扫 <style> 规则体里的每条声明。
  const declRe = /([a-z-]+)\s*:\s*([^;{}]+)/gi;
  let dm;
  while ((dm = declRe.exec(styleCss)) !== null) scanDecl(dm[1].toLowerCase(), dm[2]);
  // 扫行内 style。
  for (const { decl } of inlineStyles) {
    let im;
    const r = /([a-z-]+)\s*:\s*([^;]+)/gi;
    while ((im = r.exec(decl)) !== null) scanDecl(im[1].toLowerCase(), im[2]);
  }
  if (offValues.size > 0) {
    const list = [...offValues.entries()].sort((a, b) => b[1] - a[1]);
    const shown = list.slice(0, 12).map(([px, n]) => `${px}px×${n}`).join(', ');
    const more = list.length > 12 ? ` 等 ${list.length} 种` : '';
    add('P1', 'off-scale-spacing',
      `检测到 ${list.length} 种偏离间距刻度的 px 值（刻度集={8,16,24,32,48,64,80,96,160}·令牌真值）：${shown}${more}；请吸附到刻度`);
  }
}

/* —— P1 · line-role / illegal-line-width / accent-line-overuse（工程规范 · 防「线条乱」）——
   ① 线宽 ∉ {0.5,1,1.5} → 非法线宽（border-width / <hr> / svg stroke-width）；
   ② border 宽 ≥2px → 粗实线（请改 hairline）；
   ③ 一页内 accent 画线 ≥2 次 → accent 画线超 1 处（线条抢戏）。
   放行：focus(-visible) 上下文、hairline 0.5px 技法、宽度用 var()/token 的（无法静态判数值，跳过）。 */
{
  // ①② 线宽：扫 <style> 里 border-width / border:<w> / outline-width / hr 的 px 宽。
  const widthSeen = new Map(); // px → 次数（仅记非法值，去重报）
  for (const { sel, body } of cssRules) {
    if (/:focus(-visible)?\b/i.test(sel)) continue; // focus-ring 豁免
    // border 简写 + border-width + border-<side>-width + outline-width
    const wRe = /\b(?:border(?:-(?:top|right|bottom|left))?(?:-width)?|outline(?:-width)?)\s*:\s*([^;{}]+)/gi;
    let wm;
    while ((wm = wRe.exec(body)) !== null) {
      const val = wm[1].toLowerCase();
      // 构成主义 accent 实色强调杠（border 用 var(--accent)）= 签名构图元素（粗线/块面史实美学·
      // 设计决策·俄国构成主义 Lissitzky 红楔/Rodchenko 粗杠·非「装饰线乱」），豁免线宽门；
      // 非 accent 的线在构成主义里仍守 {0.5,1,1.5}（只豁免签名·不放开整条规则）。
      if (deckTheme === 'constructivist' && /var\(\s*--accent/.test(val)) continue;
      // 先取显式 px 宽度（border 简写里颜色可以是 var(--hairline)，不影响宽度判数值）。
      // 仅当**取不到** px 宽（宽度本身是 var()/calc()/关键字）时才跳过——避免把「3px solid var(--x)」误放行。
      const pm = /(-?\d*\.?\d+)px\b/.exec(val);
      if (!pm) continue;                                 // 无 px 宽（var/calc/thin/medium 等）→ 静态判不了，跳过
      const px = parseFloat(pm[1]);
      if (px === 0) continue;                             // 0 = 无边，放行
      if (!LINE_WIDTHS_OK.has(px)) {
        widthSeen.set(px, (widthSeen.get(px) || 0) + 1);
      }
    }
  }
  if (widthSeen.size > 0) {
    const list = [...widthSeen.entries()].sort((a, b) => b[1] - a[1]);
    const thick = list.filter(([px]) => px >= LINE_THICK_PX);
    const shown = list.map(([px, n]) => `${px}px×${n}`).join(', ');
    add('P1', 'line-role',
      `线宽不在白名单 {0.5,1,1.5}（工程规范 仅 emphasis-rule）：${shown}` +
      (thick.length ? `；其中 ≥2px=粗实线请改 hairline` : ''));
  }
  // ③ accent 画线一页 ≥2 次：每页统计「用 --accent 给线上色」的描边/边框出现次数。
  //   启发式：行内 svg stroke 用 accent（class s-stroke-accent / stroke="var(--accent)"）+
  //   border 用 var(--accent)。仅作页内计数，≥2 报（工程规范「每页 ≤1 处 emphasis-rule」）。
  slides.forEach((s, i) => {
    const page = i + 1;
    // 整体剔除后再计数（规则本意「防 accent 线抢戏」对剔除外的内容仍生效）：
    //   ① 签名母题（.sig-field 等值场 / .sig-mark 微章）= 品牌识别母题，非 emphasis-rule。
    //   ② chart-render 引擎图（data-rendered-by="blcaptain-chart"）= 受信的自包含数据可视化单元（工程规范）：
    //      其内部 accent 描边是「数据线」(lead/guide/lead-link·单信号靛蓝编码)，非装饰性 emphasis-rule；
    //      引擎自守单信号纪律。手写 deck 把 accent 放 CSS class 故天然不计数，引擎走行内描边→须同等剔除
    //      （设计决策·实测 暴露的引擎产物嵌入缝）。剔除外（deck 自有 chrome 的 accent 画线）仍 ≥2 报。
    const inner = s.inner
      .replace(/<svg\b[^>]*\bdata-rendered-by="blcaptain-chart"[\s\S]*?<\/svg>/gi, '')
      .replace(/<div class="sig-field"[\s\S]*?<\/div>/gi, '')
      .replace(/<span class="sig-mark"[\s\S]*?<\/span>/gi, '');
    const n =
      (inner.match(/stroke\s*[:=]\s*["']?var\(--accent\)/gi) || []).length +
      (inner.match(/class="[^"]*\bs-stroke-accent\b[^"]*"/gi) || []).length +
      (inner.match(/border[^:;{}]*:\s*[^;{}]*var\(--accent\)/gi) || []).length;
    if (n >= 2) {
      add('P1', 'accent-line-overuse',
        `本页 accent 画线 ${n} 处（工程规范：每页 ≤1 处 emphasis-rule，多处用 accent 画线=线条抢戏）`, page);
    }
  });
}

/* —— P1 · silent-truncation（工程规范 · 防「文字被静默截断」）——
   扫 -webkit-line-clamp / text-overflow:ellipsis / overflow:hidden 在内容容器上。
   宿主豁免：.figure-slot / .grain / .bleed / .truncatable（工程规范 放行集）。
   启发式（标注可能漏报）：按「选择器块」与「行内 style 宿主」判豁免。 */
{
  const reported = new Set();
  // 内容容器关键词（工程规范 点名 .body/.title-block/.card；扩 .prose/.txt/.note/.unit/.lead/.stat）。
  // overflow:hidden 仅在「内容容器选择器」上算违规（页根 body/html、裁图 wrap 不算）；
  // line-clamp / text-overflow:ellipsis 是「无声吃字」专用属性，出现在任何非豁免宿主上即报。
  const CONTENT_CONTAINER_KW = ['body', 'title-block', 'card', 'prose', 'txt', 'note', 'unit', 'lead', 'stat', 'rail', 'col'];
  const hasClamp = (b) => /-webkit-line-clamp\s*:/i.test(b) || /text-overflow\s*:\s*ellipsis/i.test(b);
  const hasOverflowHidden = (b) => /overflow(?:-(?:x|y))?\s*:\s*hidden/i.test(b);
  const isExemptSel = (sel) => TRUNCATION_HOST_EXEMPT.some((kw) => selMentionsClass(sel, kw));
  // 内容容器选择器：命中内容容器类名（.card 等），或是裸元素选择器 p/h1-6/li（承载文本）。
  const isContentSel = (sel) =>
    CONTENT_CONTAINER_KW.some((kw) => kw === 'body' ? false : selMentionsClass(sel, kw)) ||
    /(^|[\s,>+~])(?:p|h[1-6]|li)(?![\w-])/i.test(sel);

  for (const { sel, body } of cssRules) {
    if (isExemptSel(sel)) continue;
    const clamp = hasClamp(body);
    const ofh = hasOverflowHidden(body) && isContentSel(sel); // overflow:hidden 仅内容容器算
    if (!clamp && !ofh) continue;
    const key = sel.slice(0, 60);
    if (reported.has(key)) continue;
    reported.add(key);
    const what = clamp ? 'line-clamp/ellipsis' : 'overflow:hidden(内容容器)';
    add('P1', 'silent-truncation',
      `选择器「${sel.slice(0, 40)}」含静默截断声明（${what}），非豁免宿主(.figure-slot/.grain/.bleed/.truncatable)→ 可能吃字（工程规范 禁静默截断·启发式可能漏报）`);
  }
  // 行内 style 宿主：宿主 class 命中豁免则放行；overflow:hidden 仅在内容容器类上算。
  for (const { decl, tag } of inlineStyles) {
    const classes = classList(tag);
    if (classHits(classes, TRUNCATION_HOST_EXEMPT)) continue;
    const clamp = hasClamp(decl);
    const ofh = hasOverflowHidden(decl) && classHits(classes, CONTENT_CONTAINER_KW.filter((k) => k !== 'body'));
    if (!clamp && !ofh) continue;
    const key = 'inline|' + tag.slice(0, 50);
    if (reported.has(key)) continue;
    reported.add(key);
    add('P1', 'silent-truncation',
      `行内 style 含静默截断声明（${clamp ? 'line-clamp/ellipsis' : 'overflow:hidden'}）于非豁免元素 <${(/^<([a-z][\w-]*)/i.exec(tag) || [])[1] || '?'}>（工程规范 禁静默截断）`);
  }
}

/* ----------------------- 汇总报告 ----------------------- */

const count = (lv) => issues.filter((f) => f.level === lv).length;
const summary = { p0: count('P0'), p1: count('P1'), p2: count('P2') };
const pass = summary.p0 === 0;

// 生成可执行的 next_actions（按严重度排序，告诉用户下一步敲什么）
const next_actions = [];
if (summary.p0 > 0) {
  next_actions.push(`修复全部 ${summary.p0} 个 P0（阻断项）后重跑：node scripts/validate-deck.mjs ${file}`);
  // 把每条 P0 的修复指引也带上，避免用户来回问
  for (const f of issues.filter((x) => x.level === 'P0')) {
    next_actions.push(`P0 · ${f.rule}${f.slide ? `（第 ${f.slide} 页）` : ''}：${f.msg}`);
  }
}
if (summary.p1 > 0) next_actions.push(`建议修复 ${summary.p1} 个 P1（应修项）后再交付`);
if (summary.p2 > 0) next_actions.push(`${summary.p2} 个 P2 为可选优化，可不阻断交付`);
if (pass && summary.p1 === 0 && summary.p2 === 0) next_actions.push('全部通过，可直接交付');

const report = {
  file,
  slides: slides.length,
  status: pass ? 'pass' : 'fail',
  summary,
  issues,
  next_actions,
};

stdout.write(JSON.stringify(report, null, 2) + '\n');

if (pretty) {
  // 人类可读补充（不影响 JSON 解析，写到 stderr 不污染 stdout 的 JSON 管道）
  process.stderr.write(`\n--- 人类可读摘要 ---\n`);
  process.stderr.write(`deck: ${file}  页数: ${slides.length}  结果: ${report.status.toUpperCase()}\n`);
  process.stderr.write(`P0=${summary.p0}  P1=${summary.p1}  P2=${summary.p2}\n`);
  for (const f of issues) {
    process.stderr.write(`  [${f.level}] ${f.rule}${f.slide ? ' (页 ' + f.slide + ')' : ''}: ${f.msg}\n`);
  }
  process.stderr.write(`\n`);
}

exit(pass ? 0 : 1);
