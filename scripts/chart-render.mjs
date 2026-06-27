// =========================================================================
// chart-render.mjs · blcaptain 锁定图表渲染层（zero-dependency ES module）
// -------------------------------------------------------------------------
// 架构（工程规范）：AI 只产 ChartSpec(JSON) → 本渲染层确定性地画成静态内联 SVG。
//   根治「让 LLM 手摆坐标 → 图烂」：LLM 强在语义/结构(JSON)、弱在几何(坐标)，
//   所以把「数据 → 像素坐标」交给确定性渲染器（自研 scale，对标 FT 用 D3 scale）。
//
// 主题：instrument-cool（熄灯机房唯一亮着的仪表面板）。真值来自
//   references/00-tokens-locked.md（一字不差）。所有颜色用 CSS 变量，
//   并内置 fallback 常量，使本模块在「无 CSS 变量的纯 node/SSR」环境也能出正确色。
//
// 导出：renderChart(spec) -> svgString
//   · 零依赖（仅纯 JS 字符串/数学）；node 与浏览器都可用；尺寸自适应。
//   · 每个 SVG 带签名 data-rendered-by="blcaptain-chart" + data-chart-type
//     （供 validator 识别「非手画」；工程规范 B1）。
//   · 去 chartjunk：无背景网格噪音 / 无 3D / 无冗余图例 / 能直标就直标
//     （工程规范 B3、TP-1 Tufte）；圆角 0；单信号 accent 只高亮关键一项其余降灰
//     （Tufte 擦除 + Knaflic 前注意）；hairline 坐标轴；tabular 数字标签；
//     color-interpolation-filters="sRGB"（令牌铁律）。
//
// 自测：node scripts/chart-render.mjs --selftest
// =========================================================================

/* ───────────────────────── 1 · 主题真值（与 00-tokens-locked.md 1:1）─────────────────────────
   颜色优先用 var(--token)，但 SVG 属性里 var() 在「无 :root 的离线 SSR」会失效，
   故用 var(--token, <fallback hex>) 双保险：浏览器内吃 CSS 变量，纯 node 吃 fallback。
   fallback hex 一字不差抄令牌，改令牌须同步改这里（工程规范：避免常量/令牌打架）。 */
const TOKENS = {
  bg:        'var(--bg, #11161B)',
  surface:   'var(--surface, #161D24)',
  surface2:  'var(--surface-2, #1C2530)',
  ink:       'var(--ink, #E8EEF2)',
  inkDim:    'var(--ink-dim, #7E8A94)',
  inkFaint:  'var(--ink-faint, #525C66)',
  accent:    'var(--accent, #3FD6C2)',
  accentDim: 'var(--accent-dim, rgba(63,214,194,.14))',
  warn:      'var(--warn, #F2B23E)',
  danger:    'var(--danger, #FF5C5C)',
  illus:     'var(--illus, #8A7CC2)',
  hairline:  'var(--hairline, rgba(255,255,255,.10))',
  hairline2: 'var(--hairline-2, rgba(255,255,255,.05))',
  // ⚠️ 字体栈用单引号包族名：本字符串会进双引号 style="…"，族名若用双引号会提前截断属性。
  fontSans:  "var(--font-sans, 'Geist','Geist Sans','Noto Sans SC','PingFang SC',system-ui,sans-serif)",
  fontMono:  "var(--font-mono, 'Geist Mono','SFMono-Regular',ui-monospace,monospace)",
};

// info-data 亮场主题（设计决策 · fallback 1:1 镜像 00-tokens-locked info-data 块）。
// 在 deck 内 var(--token) 吃 :root[data-theme=info-data] 变量；纯 node SSR 吃 info-data fallback。
const INFO_DATA = {
  bg:        'var(--bg, #FAFBFC)',
  surface:   'var(--surface, #F3F4F6)',
  surface2:  'var(--surface-2, #ECEEF1)',
  ink:       'var(--ink, #1a1f29)',
  inkDim:    'var(--ink-dim, #6a6a62)',
  inkFaint:  'var(--ink-faint, #9a9a92)',
  accent:    'var(--accent, #1A4F9C)',
  accentHot: 'var(--accent-hot, #D85A30)',     // 橙拐点（info-data 专有）
  dataMute:  'var(--data-mute, #C2C2BA)',      // 灰阶降噪线（info-data 专有）
  grid:      'var(--grid, #E2E2DA)',
  // 单色顺序板（明度梯度编码数据·堆叠面积等用·镜像 设计决策）
  seq1: 'var(--seq-1, #E8EEF6)', seq2: 'var(--seq-2, #B9CDE6)', seq3: 'var(--seq-3, #7FA3CE)',
  seq4: 'var(--seq-4, #3E6FB0)', seq5: 'var(--seq-5, #1A4F9C)', seq6: 'var(--seq-6, #123A75)', seq7: 'var(--seq-7, #0C2A52)',
  hairline:  'var(--hairline, rgba(26,31,41,.14))',
  hairline2: 'var(--hairline-2, rgba(26,31,41,.07))',
  fontSans:  "var(--font-data, 'Source Sans 3','Glow Sans SC',system-ui,sans-serif)",
  fontMono:  "var(--font-mono, 'Geist Mono',ui-monospace,monospace)",
};
const THEMES = { 'instrument-cool': TOKENS, 'info-data': INFO_DATA };

// 间距刻度（工程规范 规则 5.2 唯一合法集；含 0.5/1 给 hairline）。
const SPACING = { hair: 0.5, line: 1, s1: 8, s2: 16, s3: 24, s4: 32, s6: 48, s8: 64, s10: 80, s12: 96, s16: 160 };

// 字号（mono 数据/坐标轴；工程规范 字阶）。
const FS = { meta: 13, body: 18, lead: 22.5, h3: 28, h2: 43.95 };

// 中文行高 1.6（已批决策④；工程规范）。仅用于多行文字（标题/注解换行）。
const LH_CN = 1.6;

// 强调数据标记的克制辉光：前注意 luminance pop（Ware/Few；Knaflic「让关键项更不同」），
// 与 deck 数据 hero 同款微光（Linear/Vercel 风，非霓虹）。只施于「唯一高亮项」，不滥用。
const GLOW = 'filter:drop-shadow(0 0 6px var(--accent-glow, rgba(63,214,194,.55)))';

/* ───────────────────────── 2 · 通用小工具（零依赖）───────────────────────── */

// HTML/XML 转义（防 spec 里的文本破坏 SVG）。
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 坐标取 ≤2 位小数（工程规范 B4：SVG 坐标小数位 ≤2），并杜绝 NaN/Infinity（自测断言无 NaN）。
function n(v) {
  if (!Number.isFinite(v)) throw new RangeError(`chart-render: 非法坐标值 ${v}（spec 数据可能缺失或非数字）`);
  return Math.round(v * 100) / 100;
}

// 安全取数：把任意输入收敛成有限数，非数字 → 0（诚实：渲染层不臆造数据，只防崩）。
function num(v, fallback = 0) {
  const x = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(x) ? x : fallback;
}

// 线性比例尺 domain→range（对标 D3 scaleLinear；这是「治图烂」的几何核心：坐标不靠估）。
function scaleLinear(d0, d1, r0, r1) {
  const dd = (d1 - d0) || 1; // 防除零（单点/全等数据）
  return (v) => r0 + (v - d0) / dd * (r1 - r0);
}

// 「nice」轴上界：把最大值向上取整到 1/2/2.5/5 ×10^k 的整洁刻度（专业图的正确默认值，对标 Datawrapper）。
function niceCeil(max) {
  if (max <= 0) return 1;
  const exp = Math.floor(Math.log10(max));
  const base = Math.pow(10, exp);
  const f = max / base;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nf * base;
}

// 更紧的 nice 上限（line/area 用）：给 ~8–12% 顶部余量而非进位到整十，
// 避免曲线压在底部留大片空顶（实测反馈「曲线在画面中占比/位置」）。
function niceCeilTight(max) {
  if (!(max > 0)) return 1;
  const exp = Math.floor(Math.log10(max));
  const base = Math.pow(10, exp);
  const f = max / base; // 1..10
  const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10];
  const nf = steps.find(s => s >= f - 1e-9) || 10;
  return nf * base;
}

// 数字千分位 + tabular 友好格式（不强转单位；保留 spec 给的精度）。
function fmt(v) {
  if (!Number.isFinite(v)) return '—';
  const neg = v < 0; const a = Math.abs(v);
  let s;
  if (a !== 0 && (a >= 1e6 || a < 1e-3)) s = a.toPrecision(3);
  else s = (Math.round(a * 100) / 100).toString();
  // 整数部分加千分位
  const [int, frac] = s.split('.');
  const grp = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (neg ? '-' : '') + grp + (frac ? '.' + frac : '');
}

// 文本估宽（px）：CJK/全角 ≈1em，Latin/数字/标点 ≈0.55em（粗估，足够防溢出断行）。
function estWidth(str, size) {
  let u = 0;
  for (const ch of String(str)) u += /[　-鿿＀-￯]/.test(ch) ? 1 : 0.55;
  return u * size;
}

// 按最大宽度把字符串折成多行（禁静默截断，工程规范）。
// 中文按字断、英文尽量按空格断；返回 string[]。maxLines 限高，超出则把末行收尾（仍显全部词不吃字，宁可缩字号由调用方处理）。
// 行首禁则（避头）：这些标点不能落行首，须黏到上一行行尾。W3C clreq 避头尾。
const NO_LINE_START = '、。，．：；！？）｝】」』〕〉》〗”’%‰℃°…!?:;,.)]}＞»';
// 行尾禁则（避尾）：开括号/开引号不留行尾，须黏到下一行行首。
const NO_LINE_END = '（｛【「『〔〈《〖“‘([{＜«';

function wrapByWidth(str, size, maxW) {
  const s = String(str);
  if (!s) return [];
  if (estWidth(s, size) <= maxW) return [s];
  // 以「中文字 / 英文词」为断点单元
  let tokens = s.match(/[　-鿿＀-￯]|[A-Za-z0-9][A-Za-z0-9.+\-%]*|[^\s]|\s+/g) || [s];
  // 禁则处理：行首禁标点并入前一 token、行尾禁开括号并入后一 token —— 使贪心换行天然不破禁则（clreq 避头尾）。
  const folded = [];
  for (const tk of tokens) {
    const prev = folded[folded.length - 1];
    if (tk.length === 1 && NO_LINE_START.includes(tk) && prev && !/^\s+$/.test(prev)) {
      folded[folded.length - 1] = prev + tk;            // 标点黏住上一字，不落行首
    } else if (prev && !/^\s+$/.test(prev) && NO_LINE_END.includes(prev.slice(-1))) {
      folded[folded.length - 1] = prev + tk;            // 开括号黏住下一字，不留行尾
    } else folded.push(tk);
  }
  const lines = [];
  let cur = '';
  for (const tk of folded) {
    if (/^\s+$/.test(tk)) { if (cur) cur += ' '; continue; }
    const trial = cur + tk;
    if (cur && estWidth(trial, size) > maxW) { lines.push(cur); cur = tk; }
    else cur = trial;
  }
  if (cur) lines.push(cur);
  // 避免孤字（clreq）：末行若仅 1 个中文字、且上一行末字也是中文且够借，则从上一行借末字下来（末行 ≥2 字）。
  if (lines.length >= 2) {
    const lastArr = [...lines[lines.length - 1]];
    const prevArr = [...lines[lines.length - 2]];
    const isLoneCJK = lastArr.length === 1 && /[一-鿿]/.test(lastArr[0]);
    const prevLastCJK = prevArr.length >= 3 && /[一-鿿]/.test(prevArr[prevArr.length - 1]);
    if (isLoneCJK && prevLastCJK) {
      lines[lines.length - 2] = prevArr.slice(0, -1).join('').replace(/\s+$/, '');
      lines[lines.length - 1] = prevArr[prevArr.length - 1] + lines[lines.length - 1];
    }
  }
  return lines;
}

// SVG <text> 统一出口：tabular-nums + mono/sans 切换 + 主题色。
// 注：工程规范 B2 偏好「SVG 内禁 <text>、标签走 HTML 叠层」。但本模块导出的是
// 「自包含 svgString，须在纯 node/浏览器都能独立成图」，无法依赖外部 HTML 叠层，
// 故默认在 SVG 内用 <text>（这是可移植自包含图的正确取舍）。需要 deck 内 B2 合规时，
// 调 renderChart(spec, {labelMode:'html'}) 取「SVG + HTML 叠层」双产物（见文末导出）。
function text(x, y, str, opt = {}) {
  const {
    fill = TOKENS.ink, size = FS.meta, anchor = 'start', mono = true,
    weight = 400, tabular = true, baseline = 'alphabetic', ls = 0, opacity,
  } = opt;
  const style = [
    `font-family:${mono ? TOKENS.fontMono : TOKENS.fontSans}`,
    `font-size:${size}px`,
    `font-weight:${weight}`,
    tabular ? 'font-variant-numeric:tabular-nums lining-nums' : '',
    ls ? `letter-spacing:${ls}em` : '',
    opacity != null ? `opacity:${opacity}` : '',
  ].filter(Boolean).join(';');
  return `<text x="${n(x)}" y="${n(y)}" fill="${fill}" text-anchor="${anchor}" ` +
    `dominant-baseline="${baseline}" style="${style}">${esc(str)}</text>`;
}

// hairline 直线（工程规范 B5：轴线 stroke-width ≤1； 线条角色白名单）。
function hline(x1, y1, x2, y2, opt = {}) {
  const { stroke = TOKENS.hairline, w = SPACING.line, dash } = opt;
  return `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" ` +
    `stroke="${stroke}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''} />`;
}

/* ───────────────────────── 3 · ChartSpec 归一化 + 渲染前校验（工程规范 A）─────────────────────────
   把多种宽松输入收敛成统一内部结构；命中工程规范/A2/A3 红线则抛错（渲染层从源头机检数据诚实）。 */

// 合法白名单（工程规范 白名单子集）：首发 6 种 + 5b 扩建 5 种 = 11 种。
//   部分整体：donut / stacked-bar；相关：scatter；偏差：diverging-bar；路演转化：funnel。
//   仍被拒（非定量 / 复杂关系，暂不实现）：sankey / treemap / map / flow / chord 等。
const WHITELIST = new Set([
  'bar', 'hbar', 'line', 'area', 'kpi', 'sparkline',
  'donut', 'stacked-bar', 'scatter', 'diverging-bar', 'funnel',
]);
// Y 轴强制从 0（工程规范：柱/横条/面积/堆叠柱）。
//   diverging-bar 以 0 为对称中心轴（本身就以 0 为基准，不存在截断基线问题），故不入此集。
//   scatter/donut/funnel 无「从 0 的 Y 轴」语义，不适用。
const ZERO_BASELINE_REQUIRED = new Set(['bar', 'hbar', 'area', 'stacked-bar']);

function normalizeSpec(spec) {
  if (!spec || typeof spec !== 'object') throw new TypeError('chart-render: spec 必须是对象');
  const type = String(spec.type || '').trim().toLowerCase();

  // A1：type ∈ 白名单（工程规范 A1，P0）。
  if (!WHITELIST.has(type)) {
    throw new RangeError(
      `chart-render: 不支持的图表类型 "${spec.type}"。合法白名单（11 种）= [${[...WHITELIST].join(', ')}]；` +
      `sankey/treemap/map/flow/chord 等（非定量或复杂关系）暂不实现（工程规范）。`
    );
  }

  // A2：黑名单标志位（工程规范 A2，P0）。spec 不该带这些；带了直接拒。
  if (spec.threeD || spec['3d']) throw new RangeError('chart-render: 拒绝 3D 图表（透视失真 / chartjunk，工程规范 黑名单）');
  if (spec.dualAxis || spec.secondaryAxis) throw new RangeError('chart-render: 拒绝双轴图（可独立缩放制造伪相关，工程规范 黑名单）');

  // A3：zeroBaseline（工程规范 A3，P0）。bar/hbar/area 必须从 0；spec 若显式给 false 直接拒。
  const enc = spec.encoding || {};
  const yEnc = enc.y || {};
  if (ZERO_BASELINE_REQUIRED.has(type) && yEnc.zeroBaseline === false) {
    throw new RangeError(`chart-render: ${type} 图 Y 轴必须从 0（zeroBaseline 不可为 false；截断基线=数据欺骗，工程规范 A3）`);
  }

  const out = {
    type,
    title: spec.title != null ? String(spec.title) : '',
    unit: spec.unit != null ? String(spec.unit) : '',
    source: spec.source != null ? String(spec.source) : '',
    note: spec.note != null ? String(spec.note) : '',
    evidenceType: spec.evidenceType != null ? String(spec.evidenceType) : '',
    // 数据诚实（工程规范 A7 /  不造假）：定量图缺 source 自动标「示意」。
    illustrative: false,
  };
  if (!out.source && type !== 'sparkline') {
    out.illustrative = true;
    if (!out.evidenceType) out.evidenceType = 'illustrative';
  }

  // —— 归一化 series：统一成 [{name, data:[{x,y,label?}], emphasis?}] ——
  // 支持两种宽松写法：① spec.series[...]；② spec.data 扁平数组（单系列糖）。
  let series = [];
  if (Array.isArray(spec.series) && spec.series.length) {
    series = spec.series.map((s, i) => ({
      name: s.name != null ? String(s.name) : `series-${i + 1}`,
      emphasis: !!s.emphasis,
      data: normalizePoints(s.data, type),
    }));
  } else if (Array.isArray(spec.data) && spec.data.length) {
    series = [{ name: spec.title || 'series-1', emphasis: false, data: normalizePoints(spec.data, type) }];
  } else if (type !== 'kpi') {
    throw new RangeError('chart-render: spec 缺少数据（series[].data 或 data 均为空）');
  }

  out.series = series;
  out.kpi = type === 'kpi' ? normalizeKpi(spec) : null;

  // emphasis 归一化（工程规范 A5：highlight ≤1）。
  // 点级强调图（emphasis 落在 series[0].data 的某一点上）：bar/hbar 量级图，
  //   以及 5b 的 donut/diverging-bar/funnel/scatter。这些图在各自渲染器内再做最终收敛/默认焦点，
  //   此处只做 A5 收敛（多标→留第一个）；bar/hbar 额外默认强调「最大值」（前注意焦点）。
  const POINT_EMPH = new Set(['bar', 'hbar', 'donut', 'diverging-bar', 'funnel', 'scatter']);
  if (POINT_EMPH.has(type)) {
    const s0 = out.series[0];
    if ((type === 'bar' || type === 'hbar') && s0 && !s0.data.some(d => d.emphasis)) {
      let mi = 0; for (let i = 1; i < s0.data.length; i++) if (s0.data[i].y > s0.data[mi].y) mi = i;
      if (s0.data[mi]) s0.data[mi].emphasis = true;
    }
    // A5 收敛：只保留第一个被标记的 emphasis（多标=违反单信号色纪律）。
    let seen = false;
    s0 && s0.data.forEach(d => { if (d.emphasis) { if (seen) d.emphasis = false; else seen = true; } });
  } else {
    // 系列级强调图（emphasis 落在系列上）：line/area 多系列、stacked-bar 多段，只许 1 个主角（工程规范）。
    let seen = false;
    out.series.forEach(s => { if (s.emphasis) { if (seen) s.emphasis = false; else seen = true; } });
    if (!seen && out.series.length === 1) out.series[0].emphasis = true; // 单系列即主角
  }

  return out;
}

function normalizePoints(arr, type) {
  if (!Array.isArray(arr)) return [];
  return arr.map((d, i) => {
    if (type === 'sparkline' && (typeof d === 'number' || typeof d === 'string')) {
      // sparkline 接受裸数组 [y0,y1,...]
      return { x: i, y: num(d), label: '', emphasis: false };
    }
    if (typeof d === 'number') return { x: i, y: num(d), label: '', emphasis: false };
    return {
      // 类目图用 label 作 x；时序图用 x（数值/可解析）。
      x: d.x != null ? d.x : (d.label != null ? d.label : i),
      y: num(d.y != null ? d.y : d.value),
      label: d.label != null ? String(d.label) : (d.x != null ? String(d.x) : ''),
      emphasis: !!d.emphasis,
    };
  });
}

function normalizeKpi(spec) {
  const d = (Array.isArray(spec.data) ? spec.data[0] : spec.data) || spec.kpi || spec;
  return {
    value: num(d.value, NaN),
    unit: spec.unit != null ? String(spec.unit) : (d.unit != null ? String(d.unit) : ''),
    delta: d.delta != null ? num(d.delta, NaN) : (spec.delta != null ? num(spec.delta, NaN) : NaN),
    takeaway: d.takeaway != null ? String(d.takeaway) : (spec.note != null ? String(spec.note) : ''),
    spark: Array.isArray(d.spark) ? d.spark.map(num) : (Array.isArray(spec.spark) ? spec.spark.map(num) : null),
  };
}

/* ───────────────────────── 4 · SVG 外壳 + 签名 + 标题/来源条 ─────────────────────────
   去 chartjunk（工程规范 B3）：外壳无背景填充 / 无外边框 / 无 drop-shadow / 无渐变。
   color-interpolation-filters="sRGB"（令牌铁律）。签名 data-rendered-by + data-chart-type（B1）。 */

function svgShell({ type, width, height, illustrative }, innerSvg, titleStr, sourceStr, T = TOKENS) {
  const W = n(width), H = n(height);
  // 标记是否示意：供 validator / 人眼识别（工程规范 A7）。
  const illusAttr = illustrative ? ` data-illustrative="true"` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" ` +
    `role="img" preserveAspectRatio="xMidYMid meet" color-interpolation-filters="sRGB" ` +
    `data-rendered-by="blcaptain-chart" data-chart-type="${esc(type)}"${illusAttr} ` +
    `style="font-family:${T.fontSans};-webkit-font-smoothing:antialiased">` +
    // 无 <rect> 背景填充：图表区透明，吃 deck 暗底（去 chartjunk）。
    innerSvg +
    `</svg>`
  );
}

// 标题行（工程规范：标题必须是结论句）+ 示意/单位标记。返回 {svg, top}（top=正文起始 y）。
function renderHeader(spec, W, padX, padTop) {
  let y = padTop;
  let svg = '';
  const titleStr = spec.title || '';
  if (titleStr) {
    const availW = W - padX * 2;
    // 自动选标题字号：从 h3 起，若过长会折太多行则降一档到 lead，仍长则 body（禁静默截断，宁可缩字号断多行）。
    let size = FS.h3;
    let lines = wrapByWidth(titleStr, size, availW);
    if (lines.length > 2) { size = FS.lead; lines = wrapByWidth(titleStr, size, availW); }
    if (lines.length > 3) { size = FS.body; lines = wrapByWidth(titleStr, size, availW); }
    const lh = size * LH_CN; // 中文行高 1.6（决策④）
    lines.forEach((ln, i) => {
      svg += text(padX, y + size * 0.5 + i * lh, ln, {
        fill: TOKENS.ink, size, mono: false, weight: 510, anchor: 'start', baseline: 'middle', tabular: false, ls: -0.02,
      });
    });
    y += size * 0.5 + (lines.length - 1) * lh + size * 0.5 + SPACING.s2;
  }
  // 单位 + 示意 chip（mono、降一级、ink-dim）。
  const tags = [];
  if (spec.unit) tags.push(`单位 ${spec.unit}`);
  if (spec.illustrative) tags.push('示意');
  if (tags.length) {
    svg += text(padX, y, tags.join('   ·   '), {
      fill: spec.illustrative ? TOKENS.illus : TOKENS.inkDim, size: FS.meta, mono: true, anchor: 'start', baseline: 'hanging', ls: 0.04,
    });
    y += SPACING.s3;
  } else {
    y += SPACING.s1;
  }
  return { svg, top: y };
}

// 来源/注解条（贴底，mono，ink-dim；工程规范 A7 数据诚实）。返回 {svg, bottom}（bottom=正文可用下界）。
function renderFooter(spec, W, padX, H, padBottom) {
  let svg = '';
  let bottom = H - padBottom;
  const parts = [];
  if (spec.source) parts.push(`来源 ${spec.source}`);
  else if (spec.illustrative) parts.push('数据为示意，非真实统计');
  if (spec.note) parts.push(spec.note);
  if (parts.length) {
    const y = H - padBottom + SPACING.s3;
    svg += hline(padX, H - padBottom + SPACING.s1, W - padX, H - padBottom + SPACING.s1, { stroke: TOKENS.hairline2 });
    svg += text(padX, y, parts.join('   ·   '), {
      fill: TOKENS.inkDim, size: FS.meta - 1, mono: true, anchor: 'start', baseline: 'hanging',
    });
  }
  return { svg, bottom };
}

/* ───────────────────────── 5 · 首发六种图渲染器（扩建 5 种见）───────────────────────── */

// 内边距（吸附间距刻度）。底部多留来源条空间。
function pads(spec) {
  const hasFooter = !!(spec.source || spec.illustrative || spec.note);
  // 边距收紧（实测反馈留白过大、曲线占比小）：外 padding s8→s6、顶 s6→s4、底 s10→s8。
  return { x: SPACING.s6, top: SPACING.s4, bottom: hasFooter ? SPACING.s8 : SPACING.s4 };
}

// —— 5.1 bar（纵向柱：≤8 类量级对比；Y 轴强制从 0；强调色只 1 根）——
function renderBar(spec, W, H) {
  const p = pads(spec);
  const head = renderHeader(spec, W, p.x, p.top);
  const foot = renderFooter(spec, W, p.x, H, p.bottom);
  const data = (spec.series[0] && spec.series[0].data) || [];
  const plotTop = head.top;
  const plotBottom = foot.bottom - SPACING.s4; // 给 x 轴标签留行
  const plotLeft = p.x + SPACING.s4;           // 给 y 轴刻度留行（只显 0/max，s4 足够，避免左边距过大压窄绘图区）
  const plotRight = W - p.x;
  const plotH = Math.max(1, plotBottom - plotTop);
  const plotW = Math.max(1, plotRight - plotLeft);

  const maxV = niceCeil(Math.max(0, ...data.map(d => d.y)));
  const yScale = scaleLinear(0, maxV, plotBottom, plotTop); // 0 在底（强制从 0）
  const slot = plotW / Math.max(1, data.length);
  const barW = Math.min(slot * 0.6, SPACING.s8);

  let g = '';
  // 基线（0 线，hairline）+ 仅起止两档 y 刻度（工程规范：只留起止刻度）。
  g += hline(plotLeft, n(yScale(0)), plotRight, n(yScale(0)), { stroke: TOKENS.hairline });
  [0, maxV].forEach(v => {
    g += text(plotLeft - SPACING.s2, yScale(v), fmt(v), { fill: TOKENS.inkDim, size: FS.meta, anchor: 'end', baseline: 'middle' });
    if (v === maxV) g += hline(plotLeft, n(yScale(v)), plotRight, n(yScale(v)), { stroke: TOKENS.hairline2 });
  });

  data.forEach((d, i) => {
    const cx = plotLeft + slot * (i + 0.5);
    const x = cx - barW / 2;
    const y = yScale(Math.max(0, d.y));
    const h = Math.max(0, n(yScale(0) - y));
    const fill = d.emphasis ? TOKENS.accent : TOKENS.inkDim; // 单信号 accent，其余降灰（擦除）
    g += `<rect x="${n(x)}" y="${n(y)}" width="${n(barW)}" height="${h}" fill="${fill}"${d.emphasis ? ` style="${GLOW}"` : ''} />`;
    // 直标数值在柱顶：强调柱=accent + 点睛数字加大加重（Knaflic 强调）；其余压灰退后（Datawrapper）。
    g += text(cx, y - SPACING.s1, fmt(d.y), {
      fill: d.emphasis ? TOKENS.accent : TOKENS.inkDim, size: d.emphasis ? FS.lead : FS.meta, anchor: 'middle', baseline: 'alphabetic', weight: d.emphasis ? 600 : 400,
    });
    // x 类目标签（sans，居中；强调项加亮）。
    g += text(cx, plotBottom + SPACING.s3, d.label, {
      fill: d.emphasis ? TOKENS.ink : TOKENS.inkDim, size: FS.meta, mono: false, anchor: 'middle', baseline: 'hanging', tabular: false,
    });
  });

  return svgShell({ type: 'bar', width: W, height: H, illustrative: spec.illustrative }, head.svg + g + foot.svg);
}

// —— 5.2 hbar（横条：类目多 / 标签长；按值排序；标签左对齐贴条首；起点 0）——
function renderHbar(spec, W, H) {
  const p = pads(spec);
  const head = renderHeader(spec, W, p.x, p.top);
  const foot = renderFooter(spec, W, p.x, H, p.bottom);
  let data = ((spec.series[0] && spec.series[0].data) || []).slice();
  data.sort((a, b) => b.y - a.y); // 按值排序（工程规范 hbar 硬约束）

  const plotTop = head.top;
  const plotBottom = foot.bottom;
  // 标签贴在条左侧：估一个标签列宽（按最长标签字数粗算，吸附刻度）。
  const maxLabelLen = Math.max(2, ...data.map(d => (d.label || '').length));
  const labelCol = Math.min(SPACING.s16 + SPACING.s8, p.x + maxLabelLen * 9);
  const plotLeft = labelCol;
  const plotRight = W - p.x - SPACING.s8; // 右侧留数值
  const plotH = Math.max(1, plotBottom - plotTop);
  const plotW = Math.max(1, plotRight - plotLeft);

  const maxV = niceCeil(Math.max(0, ...data.map(d => d.y)));
  const xScale = scaleLinear(0, maxV, plotLeft, plotRight); // 0 在左（起点 0）
  const slot = plotH / Math.max(1, data.length);
  const barH = Math.min(slot * 0.58, SPACING.s4);

  let g = '';
  // 起点竖向 hairline（0 轴）。
  g += hline(plotLeft, plotTop, plotLeft, plotBottom, { stroke: TOKENS.hairline });
  data.forEach((d, i) => {
    const cy = plotTop + slot * (i + 0.5);
    const y = cy - barH / 2;
    const w = Math.max(0, n(xScale(Math.max(0, d.y)) - plotLeft));
    const fill = d.emphasis ? TOKENS.accent : TOKENS.inkDim;
    g += `<rect x="${n(plotLeft)}" y="${n(y)}" width="${w}" height="${n(barH)}" fill="${fill}"${d.emphasis ? ` style="${GLOW}"` : ''} />`;
    // 标签左对齐贴条首左侧（sans）。
    g += text(plotLeft - SPACING.s2, cy, d.label, {
      fill: d.emphasis ? TOKENS.ink : TOKENS.inkDim, size: FS.meta, mono: false, anchor: 'end', baseline: 'middle', tabular: false,
    });
    // 数值直标条尾右侧（mono tabular）。
    g += text(plotLeft + w + SPACING.s2, cy, fmt(d.y), {
      fill: d.emphasis ? TOKENS.accent : TOKENS.ink, size: FS.meta, anchor: 'start', baseline: 'middle', weight: d.emphasis ? 600 : 400,
    });
  });

  return svgShell({ type: 'hbar', width: W, height: H, illustrative: spec.illustrative }, head.svg + g + foot.svg);
}

// —— 5.3 line（折线：趋势 / 时序；直标线尾禁独立图例；可不从 0 但须标注；节点按真实时间比例）——
function renderLine(spec, W, H) {
  return renderLineOrArea(spec, W, H, false);
}
// —— 5.4 area（面积：累积 / 占比随时间；强制从 0；堆叠 ≤4 层）——
function renderArea(spec, W, H) {
  return renderLineOrArea(spec, W, H, true);
}

function renderLineOrArea(spec, W, H, isArea) {
  const p = pads(spec);
  const head = renderHeader(spec, W, p.x, p.top);
  const foot = renderFooter(spec, W, p.x, H, p.bottom);
  // area 堆叠 ≤4 层（工程规范）。line 多系列也限 4 以免变意面条。
  const series = spec.series.slice(0, 4);

  const plotTop = head.top;
  const plotBottom = foot.bottom - SPACING.s4;
  const plotLeft = p.x + SPACING.s4; // y 轴只显 0/max，s4 足够；减小左边距让曲线占更宽
  const plotRight = W - p.x - SPACING.s8; // 右侧留「线尾直标」
  const plotH = Math.max(1, plotBottom - plotTop);
  const plotW = Math.max(1, plotRight - plotLeft);

  // x 域：优先用可解析的数值/日期 x；只要有任一不可解析（类目 x 如 "a"/"b"），
  // 整图回退「按索引等距」定位（仍保序，且杜绝 NaN 坐标）。
  const allXraw = []; const allY = [];
  series.forEach(s => s.data.forEach(d => { allXraw.push(toXNum(d.x)); allY.push(d.y); }));
  const xNumeric = allXraw.length > 0 && allXraw.every(Number.isFinite);
  const maxLen = Math.max(1, ...series.map(s => s.data.length));
  const xMin = xNumeric ? Math.min(...allXraw) : 0;
  const xMax = xNumeric ? Math.max(...allXraw) : (maxLen - 1);
  // y 域：area 强制从 0（工程规范）；line 首发也统一从 0（更诚实，治非零基线欺骗）。
  const yMaxRaw = Math.max(0, ...allY);
  const yMax = niceCeilTight(yMaxRaw); // 更紧的上限：减少曲线上方空顶（实测反馈）
  const yMin = 0;
  const xScaleNum = scaleLinear(xMin, xMax, plotLeft, plotRight);
  const yScale = scaleLinear(yMin, yMax, plotBottom, plotTop);
  // 统一 x 定位器：数值 x 用真比例（节点按真实时间比例，）；类目 x 用索引等距。
  const xAt = (d, i) => xNumeric ? xScaleNum(toXNum(d.x)) : xScaleNum(i);

  let g = '';
  // 基线 + 起止 y 刻度（hairline，只留起止）。
  g += hline(plotLeft, n(yScale(yMin)), plotRight, n(yScale(yMin)), { stroke: TOKENS.hairline });
  [yMin, yMax].forEach(v => {
    g += text(plotLeft - SPACING.s2, yScale(v), fmt(v), { fill: TOKENS.inkDim, size: FS.meta, anchor: 'end', baseline: 'middle' });
  });
  // 起止 x 刻度（mono，贴底）。
  const xs0 = series[0] ? series[0].data : [];
  if (xs0.length) {
    g += text(plotLeft, plotBottom + SPACING.s3, String(xs0[0].label || xs0[0].x), { fill: TOKENS.inkDim, size: FS.meta, anchor: 'start', baseline: 'hanging' });
    const last = xs0[xs0.length - 1];
    g += text(plotRight, plotBottom + SPACING.s3, String(last.label || last.x), { fill: TOKENS.inkDim, size: FS.meta, anchor: 'end', baseline: 'hanging' });
  }

  series.forEach((s, si) => {
    if (!s.data.length) return;
    const stroke = s.emphasis ? TOKENS.accent : TOKENS.inkDim;
    const pts = s.data.map((d, i) => [n(xAt(d, i)), n(yScale(d.y))]);
    const dPath = pts.map((pt, i) => (i ? 'L' : 'M') + pt[0] + ' ' + pt[1]).join(' ');
    if (isArea) {
      // 面积填充（极低不透明度，去 chartjunk：不用渐变填充）。主角用 accent-dim，背景系列用 hairline2。
      const fill = s.emphasis ? TOKENS.accentDim : TOKENS.hairline2;
      const areaPath = `M${pts[0][0]} ${n(yScale(yMin))} L` + pts.map(pt => pt[0] + ' ' + pt[1]).join(' L') +
        ` L${pts[pts.length - 1][0]} ${n(yScale(yMin))} Z`;
      g += `<path d="${areaPath}" fill="${fill}" />`;
    }
    g += `<path d="${dPath}" fill="none" stroke="${stroke}" stroke-width="${s.emphasis ? 2.5 : 1}" stroke-linejoin="round" stroke-linecap="round"${s.emphasis ? ` style="${GLOW}"` : ''} />`;
    // 线尾直标系列名（去图例；工程规范 /  A6）。
    const lastPt = pts[pts.length - 1];
    g += text(lastPt[0] + SPACING.s2, lastPt[1], s.name, {
      fill: s.emphasis ? TOKENS.accent : TOKENS.inkDim, size: FS.meta, mono: false, anchor: 'start', baseline: 'middle', tabular: false, weight: s.emphasis ? 600 : 400,
    });
    // 主角线末点强调圆点（前注意焦点）+ 克制辉光。
    if (s.emphasis) g += `<circle cx="${lastPt[0]}" cy="${lastPt[1]}" r="4" fill="${TOKENS.accent}" style="${GLOW}" />`;
  });

  return svgShell({ type: isArea ? 'area' : 'line', width: W, height: H, illustrative: spec.illustrative }, head.svg + g + foot.svg);
}

// x 值转数字：支持纯数字、可解析日期（YYYY / YYYY-MM / YYYY-MM-DD）；不可解析返回 NaN（调用方据此整图回退索引等距）。
function toXNum(x) {
  if (typeof x === 'number' && Number.isFinite(x)) return x;
  const s = String(x);
  // 纯数字串
  const f = parseFloat(s);
  if (Number.isFinite(f) && /^-?\d/.test(s) && !/[-/]/.test(s.slice(1))) return f;
  // 日期串
  const t = Date.parse(s);
  if (Number.isFinite(t)) return t;
  return f; // 最后回退（可能 NaN，调用方已保证顺序索引兜底）
}

// —— 5.5 kpi（一个数字独占：clamp 大字 weight 300 偏左；单位降一级；tabular；可选 delta + sparkline）——
function renderKpi(spec, W, H) {
  const k = spec.kpi || {};
  const p = pads(spec);
  const head = renderHeader(spec, W, p.x, p.top);
  const foot = renderFooter(spec, W, p.x, H, p.bottom);
  const plotTop = head.top;
  const plotBottom = foot.bottom;
  const cx = p.x; // 偏左非居中（工程规范 kpi 硬约束）
  const textX = cx + SPACING.s3;
  const valStr = Number.isFinite(k.value) ? fmt(k.value) : '—';

  // —— 垂直居中一个紧凑块：[大数字(+单位)] / [delta] / [takeaway]（实测反馈：排布散、空一截）——
  const plotH = Math.max(1, plotBottom - plotTop);
  const hasDelta = Number.isFinite(k.delta);
  const hasTake = !!k.takeaway;
  const hasSpark = Array.isArray(k.spark) && k.spark.length > 1;
  // 大数字字号：受可用高度与可用宽度双重约束（防长数字溢出、防小面板里过大）。
  const unitFactor = k.unit ? 0.42 : 0; // 单位约占 0.42 个数字宽
  const availW = (W - p.x) - textX - (hasSpark ? SPACING.s12 + SPACING.s2 : 0);
  const bigByW = availW / Math.max(1, estWidth(valStr, 1) + unitFactor);
  // takeaway 折行（按可用宽，禁静默截断）
  let useDelta = hasDelta, useTake = hasTake;
  let takeLines = useTake ? wrapByWidth(k.takeaway, FS.body, (W - p.x) - textX) : [];
  const blockSize = () => {
    const db = useDelta ? FS.lead + SPACING.s2 : 0;
    const tb = (useTake && takeLines.length) ? SPACING.s2 + takeLines.length * FS.body * 1.45 : 0;
    return { db, tb, room: plotH - db - tb - SPACING.s2 };
  };
  // 空间不足时优雅降级：先省次要 takeaway，再省 delta，永远保大数字完整可读（非静默截断，是空间不足省略可选注解；实测反馈「左侧文字挤」）。
  if (blockSize().room < 52 && useTake) { useTake = false; takeLines = []; }
  if (blockSize().room < 52 && useDelta) useDelta = false;
  const { db: deltaBlock, tb: takeBlock } = blockSize();
  const bigMaxByH = plotH - deltaBlock - takeBlock - SPACING.s2;
  const big = Math.max(40, Math.min(120, plotH * 0.5, bigByW, bigMaxByH));
  const blockH = big + deltaBlock + takeBlock;
  const startY = plotTop + Math.max(0, (plotH - blockH) / 2); // 垂直居中（整块 ≤ plotH，与来源条留白）

  let g = '';
  // 左侧 hairline 刻度槽（技术崇高签名），与内容块同高。
  g += hline(cx, startY, cx, startY + blockH, { stroke: TOKENS.hairline });

  // 大数字（基线中位于数字行）
  const numMid = startY + big * 0.5;
  g += text(textX, numMid, valStr, {
    fill: TOKENS.ink, size: big, weight: 300, anchor: 'start', baseline: 'middle', ls: -0.03,
  });
  if (k.unit) {
    const approxW = estWidth(valStr, big);
    g += text(textX + approxW + SPACING.s2, numMid + big * 0.26, k.unit, {
      fill: TOKENS.inkDim, size: Math.max(FS.lead, big * 0.24), mono: false, anchor: 'start', baseline: 'alphabetic', tabular: false,
    });
  }
  // delta 紧随数字下方一档
  let y2 = startY + big + SPACING.s2;
  if (useDelta) {
    const up = k.delta >= 0;
    const dStr = (up ? '▲ +' : '▼ ') + fmt(Math.abs(k.delta)) + '%';
    g += text(textX, y2, dStr, {
      fill: up ? TOKENS.accent : TOKENS.danger, size: FS.lead, anchor: 'start', baseline: 'hanging', weight: 600,
    });
    y2 += FS.lead + SPACING.s2;
  }
  // takeaway 紧随其后（多行，不再钉死贴底）
  takeLines.forEach((ln, i) => {
    g += text(textX, y2 + i * FS.body * 1.45, ln, {
      fill: TOKENS.inkDim, size: FS.body, mono: false, anchor: 'start', baseline: 'hanging', tabular: false,
    });
  });
  // sparkline：右侧，与大数字行垂直居中对齐（词级短线）
  if (hasSpark) {
    const sw = SPACING.s12, sh = SPACING.s6;
    const sx = W - p.x - sw, sy = numMid - sh / 2;
    g += renderSparkInline(k.spark, sx, sy, sw, sh);
  }

  return svgShell({ type: 'kpi', width: W, height: H, illustrative: spec.illustrative }, head.svg + g + foot.svg);
}

// —— 5.6 sparkline（word-sized：无轴无坐标无图例；高亮末点）——
function renderSparkline(spec, W, H) {
  // 标准件：renderSparkInline（KPI/内联用，纯线）。独立成图时给「标题 + 首尾值直标 + 末点发光」把面板填实
  // （实测反馈独占面板太空；Tufte：sparkline 应标起止/极值，仍属 word-sized 趋势微线，无网格无图例）。
  const p = pads(spec);
  const head = renderHeader(spec, W, p.x, p.top);
  const foot = renderFooter(spec, W, p.x, H, p.bottom);
  const data = ((spec.series[0] && spec.series[0].data) || []).map(d => num(d.y)).filter(Number.isFinite);
  const plotTop = head.top;
  const plotBottom = foot.bottom - SPACING.s2;
  const plotLeft = p.x + SPACING.s6;          // 左留首值
  const plotRight = W - p.x - SPACING.s8;      // 右留末值（更大）
  let g = '';
  if (data.length >= 2) {
    const min = Math.min(...data), max = Math.max(...data);
    const xs = scaleLinear(0, data.length - 1, plotLeft, plotRight);
    const ys = scaleLinear(min, max, plotBottom, plotTop);
    const pts = data.map((v, i) => [n(xs(i)), n(ys(v))]);
    const dPath = pts.map((pt, i) => (i ? 'L' : 'M') + pt[0] + ' ' + pt[1]).join(' ');
    g += `<path d="${dPath}" fill="none" stroke="${TOKENS.accent}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" style="${GLOW}" />`;
    // 首值（灰，退后）
    g += text(pts[0][0] - SPACING.s2, pts[0][1], fmt(data[0]), { fill: TOKENS.inkDim, size: FS.meta, anchor: 'end', baseline: 'middle' });
    // 末点发光 + 末值（accent，加大点睛）
    const lp = pts[pts.length - 1];
    g += `<circle cx="${lp[0]}" cy="${lp[1]}" r="3.5" fill="${TOKENS.accent}" style="${GLOW}" />`;
    g += text(lp[0] + SPACING.s2, lp[1], fmt(data[data.length - 1]), { fill: TOKENS.accent, size: FS.lead, anchor: 'start', baseline: 'middle', weight: 600 });
  }
  return svgShell({ type: 'sparkline', width: W, height: H, illustrative: spec.illustrative }, head.svg + g + foot.svg);
}

// sparkline 内联绘制（复用于 kpi 内嵌）。无轴无图例，仅折线 + 末点 accent。
function renderSparkInline(arr, x, y, w, h) {
  const data = (arr || []).map(num).filter(Number.isFinite);
  if (data.length < 2) return '';
  const min = Math.min(...data), max = Math.max(...data);
  const xs = scaleLinear(0, data.length - 1, x, x + w);
  const ys = scaleLinear(min, max, y + h, y); // 单点全等时 scaleLinear 已防除零
  const pts = data.map((v, i) => [n(xs(i)), n(ys(v))]);
  const dPath = pts.map((pt, i) => (i ? 'L' : 'M') + pt[0] + ' ' + pt[1]).join(' ');
  let g = `<path d="${dPath}" fill="none" stroke="${TOKENS.inkDim}" stroke-width="1" stroke-linejoin="round" stroke-linecap="round" />`;
  const last = pts[pts.length - 1];
  g += `<circle cx="${last[0]}" cy="${last[1]}" r="3" fill="${TOKENS.accent}" style="${GLOW}" />`;
  return g;
}

/* ───────────────────────── 5b · 新增五种图渲染器（donut / stacked-bar / scatter / diverging-bar / funnel）─────────────────────────
   照前 6 种写法扩建：单信号 accent 只高亮「关键一项」、其余降灰（Tufte 擦除）；强调项加 GLOW 辉光；
   tabular 数字直标；hairline 轴；圆角 0；用 n() 杜绝 NaN；复用 pads/renderHeader/renderFooter/svgShell。 */

// 非强调段的灰阶梯（多段图按明度区分「其余项」，保持单信号克制：只有强调项是 accent）。
// 取自令牌的中性前景色，由亮到暗，循环复用。纯灰阶，不引入第二信号色。
const GREY_RAMP = [TOKENS.inkDim, TOKENS.inkFaint, 'var(--ink-faint, #525C66)', TOKENS.hairline, TOKENS.hairline2];
// 取第 i 个非强调灰（循环），与强调段（accent）在明度上拉开。
function greyAt(i) { return GREY_RAMP[i % GREY_RAMP.length]; }

// 把一组「部分」数据归一成 [{label,value,emphasis}]，并把 emphasis 收敛到唯一一项（A5：highlight ≤1）。
// 无任何 emphasis 时默认强调「最大值」那项（前注意焦点，与 bar 同纪律）。
function normalizeParts(data, max = 6) {
  const arr = (data || []).map(d => ({
    label: d.label != null ? String(d.label) : '',
    value: Math.max(0, num(d.value != null ? d.value : d.y)), // 部分-整体语义：值非负
    emphasis: !!d.emphasis,
  })).slice(0, max);
  if (!arr.some(d => d.emphasis) && arr.length) {
    let mi = 0; for (let i = 1; i < arr.length; i++) if (arr[i].value > arr[mi].value) mi = i;
    arr[mi].emphasis = true;
  }
  let seen = false; // 只留第一个 emphasis
  arr.forEach(d => { if (d.emphasis) { if (seen) d.emphasis = false; else seen = true; } });
  return arr;
}

// —— 5b.1 donut（环图，部分-整体）：≤6 扇区；一个强调扇区 accent+辉光、其余灰阶；
//        中心留洞、洞内放强调项占比大数字（tabular）；直标各扇区标签+百分比；禁独立图例。——
function renderDonut(spec, W, H) {
  const p = pads(spec);
  const head = renderHeader(spec, W, p.x, p.top);
  const foot = renderFooter(spec, W, p.x, H, p.bottom);
  const data = normalizeParts((spec.series[0] && spec.series[0].data) || [], 6);
  const total = data.reduce((s, d) => s + d.value, 0) || 1; // 防除零（全零数据）

  const plotTop = head.top;
  const plotBottom = foot.bottom;
  const plotH = Math.max(1, plotBottom - plotTop);
  // 布局：环图在左 + 直标行在右（根除放射标签碰撞 / 与中心数字重叠；实测反馈「重叠太多」）。
  const rowH = Math.max(FS.meta + SPACING.s1, Math.min(SPACING.s4, plotH / Math.max(1, data.length)));
  const listH = rowH * data.length;
  const maxLabelW = Math.max(SPACING.s8, ...data.map(d => estWidth(d.label, FS.meta)));
  const listW = 14 + SPACING.s1 + maxLabelW + SPACING.s3 + estWidth('100%', FS.meta); // 色块+名+%
  const listX = W - p.x - listW;
  // 环半径：受可用高与「左侧到直标列之间的宽」双重约束。
  const ringSpaceW = Math.max(40, listX - p.x - SPACING.s3);
  const R = Math.max(28, Math.min(ringSpaceW / 2, plotH / 2) - SPACING.s1);
  const rInner = R * 0.6;
  const cx = p.x + R; // 圆心靠左
  const cy = plotTop + plotH / 2;

  let g = '';
  // 从 12 点钟方向（-90°）顺时针铺扇区。
  let a0 = -Math.PI / 2;
  let emph = null;
  data.forEach((d, i) => {
    const frac = d.value / total;
    const a1 = a0 + frac * Math.PI * 2;
    const fill = d.emphasis ? TOKENS.accent : greyAt(i);
    g += `<path d="${arcSegPath(cx, cy, R, rInner, a0, a1)}" fill="${fill}"${d.emphasis ? ` style="${GLOW}"` : ''} />`;
    if (d.emphasis) emph = { d, pct: Math.round(frac * 1000) / 10 };
    a0 = a1;
  });
  // 无显式强调 → 默认焦点=最大块（不臆造，仅选既有最大项）。
  if (!emph && data.length) { const m = data.reduce((a, b) => b.value > a.value ? b : a); emph = { d: m, pct: Math.round(m.value / total * 1000) / 10 }; }
  // 中心洞内：唯一焦点大百分比（无标签，避免与右侧直标重复）。
  if (emph) {
    const big = Math.max(FS.lead, Math.min(FS.h2, rInner * 1.0));
    g += text(cx, cy, fmt(emph.pct) + '%', { fill: TOKENS.accent, size: big, weight: 300, anchor: 'middle', baseline: 'middle', ls: -0.03 });
  }
  // 右侧竖排直标：色块 + 名称 + 百分比（强调行加亮）。每行垂直居中对齐，无碰撞。
  const listTop = cy - listH / 2 + rowH / 2;
  data.forEach((d, i) => {
    const ry = listTop + i * rowH;
    const sw = 11;
    g += `<rect x="${n(listX)}" y="${n(ry - sw / 2)}" width="${sw}" height="${sw}" fill="${d.emphasis ? TOKENS.accent : greyAt(i)}"${d.emphasis ? ` style="${GLOW}"` : ''} />`;
    g += text(listX + sw + SPACING.s1, ry, d.label, { fill: d.emphasis ? TOKENS.ink : TOKENS.inkDim, size: FS.meta, mono: false, anchor: 'start', baseline: 'middle', tabular: false, weight: d.emphasis ? 600 : 400 });
    g += text(W - p.x, ry, fmt(Math.round(d.value / total * 1000) / 10) + '%', { fill: d.emphasis ? TOKENS.accent : TOKENS.inkDim, size: FS.meta, anchor: 'end', baseline: 'middle', weight: d.emphasis ? 600 : 400 });
  });

  return svgShell({ type: 'donut', width: W, height: H, illustrative: spec.illustrative }, head.svg + g + foot.svg);
}

// 环形扇区路径（外半径 R / 内半径 ri，从 a0 到 a1）。large-arc 自动判定，sweep=1（顺时针）。
function arcSegPath(cx, cy, R, ri, a0, a1) {
  const large = (a1 - a0) > Math.PI ? 1 : 0;
  const x0o = cx + Math.cos(a0) * R, y0o = cy + Math.sin(a0) * R;
  const x1o = cx + Math.cos(a1) * R, y1o = cy + Math.sin(a1) * R;
  const x1i = cx + Math.cos(a1) * ri, y1i = cy + Math.sin(a1) * ri;
  const x0i = cx + Math.cos(a0) * ri, y0i = cy + Math.sin(a0) * ri;
  return `M${n(x0o)} ${n(y0o)} A${n(R)} ${n(R)} 0 ${large} 1 ${n(x1o)} ${n(y1o)} ` +
    `L${n(x1i)} ${n(y1i)} A${n(ri)} ${n(ri)} 0 ${large} 0 ${n(x0i)} ${n(y0i)} Z`;
}

// —— 5b.2 stacked-bar（堆叠柱，部分-整体随类目）：每根柱 ≤5 段堆叠；强调段 accent+辉光、其余按明度灰阶；
//        Y 从 0；顶部标总计；x 类目标签。——
function renderStackedBar(spec, W, H) {
  const p = pads(spec);
  const head = renderHeader(spec, W, p.x, p.top);
  const foot = renderFooter(spec, W, p.x, H, p.bottom);
  // 多系列 = 堆叠层（≤5 段）；每系列 data 与各类目对齐。emphasis 落在系列（段）上，只 1 个主角。
  const series = spec.series.slice(0, 5);
  // 类目轴：取最长系列的 label 序列（按索引对齐）。
  const cats = (series[0] ? series[0].data : []).map((d, i) => d.label || d.x || `#${i + 1}`);
  const nCat = Math.max(1, cats.length);

  const plotTop = head.top;
  const plotBottom = foot.bottom - SPACING.s4; // x 标签行
  const plotLeft = p.x + SPACING.s4;           // y 刻度行
  const plotRight = W - p.x;
  const plotH = Math.max(1, plotBottom - plotTop);
  const plotW = Math.max(1, plotRight - plotLeft);

  // 各类目总计（堆叠高度）。
  const totals = [];
  for (let i = 0; i < nCat; i++) {
    let s = 0; series.forEach(se => { s += Math.max(0, num((se.data[i] || {}).y != null ? se.data[i].y : (se.data[i] || {}).value)); });
    totals.push(s);
  }
  const maxV = niceCeil(Math.max(0, ...totals)); // Y 从 0 到 nice 上界
  const yScale = scaleLinear(0, maxV, plotBottom, plotTop);
  const slot = plotW / nCat;
  const barW = Math.min(slot * 0.6, SPACING.s8);

  // 哪个系列是强调段（只 1 个）。
  let emphIdx = series.findIndex(s => s.emphasis);
  if (emphIdx < 0) emphIdx = 0; // 默认第一层为主角（与单系列糖一致）

  let g = '';
  // 0 基线 + 起止 y 刻度（hairline，只留起止）。
  g += hline(plotLeft, n(yScale(0)), plotRight, n(yScale(0)), { stroke: TOKENS.hairline });
  [0, maxV].forEach(v => {
    g += text(plotLeft - SPACING.s2, yScale(v), fmt(v), { fill: TOKENS.inkDim, size: FS.meta, anchor: 'end', baseline: 'middle' });
    if (v === maxV) g += hline(plotLeft, n(yScale(v)), plotRight, n(yScale(v)), { stroke: TOKENS.hairline2 });
  });

  for (let i = 0; i < nCat; i++) {
    const cx = plotLeft + slot * (i + 0.5);
    const x = cx - barW / 2;
    let acc = 0; // 从 0 起向上累叠
    series.forEach((se, si) => {
      const v = Math.max(0, num((se.data[i] || {}).y != null ? se.data[i].y : (se.data[i] || {}).value));
      if (v <= 0) { acc += v; return; }
      const yTop = yScale(acc + v);
      const yBot = yScale(acc);
      const h = Math.max(0, n(yBot - yTop));
      const isEmph = si === emphIdx;
      const fill = isEmph ? TOKENS.accent : greyAt(si); // 段按明度区分；强调段 accent
      g += `<rect x="${n(x)}" y="${n(yTop)}" width="${n(barW)}" height="${h}" fill="${fill}"${isEmph ? ` style="${GLOW}"` : ''} />`;
      // 强调段在段内直标数值（仅强调段标，避免堆叠拥挤；其余靠总计+x 轴读出）。
      if (isEmph && h >= FS.meta * 1.2) {
        g += text(cx, (yTop + yBot) / 2, fmt(v), {
          fill: TOKENS.bg, size: FS.meta, anchor: 'middle', baseline: 'middle', weight: 600,
        });
      }
      acc += v;
    });
    // 顶部标总计（tabular，柱顶上方）。
    g += text(cx, yScale(totals[i]) - SPACING.s1, fmt(totals[i]), {
      fill: TOKENS.ink, size: FS.meta, anchor: 'middle', baseline: 'alphabetic', weight: 510,
    });
    // x 类目标签。
    g += text(cx, plotBottom + SPACING.s3, String(cats[i]), {
      fill: TOKENS.inkDim, size: FS.meta, mono: false, anchor: 'middle', baseline: 'hanging', tabular: false,
    });
  }
  // 强调段系列名直标（去图例）：在绘图区右上角点一行（只标主角段，单信号；右对齐避开左上 单位/示意 标签带）。
  const emphName = series[emphIdx] && series[emphIdx].name;
  if (emphName) {
    g += text(plotRight, plotTop - SPACING.s1, emphName, {
      fill: TOKENS.accent, size: FS.meta, mono: false, anchor: 'end', baseline: 'alphabetic', weight: 600,
    });
  }

  return svgShell({ type: 'stacked-bar', width: W, height: H, illustrative: spec.illustrative }, head.svg + g + foot.svg);
}

// —— 5b.3 scatter（散点，相关）：点用 circle；强调点 accent+辉光、其余灰；x/y 各一条 hairline 轴 + 起止刻度；
//        可选点标签直标强调点；缺坐标的点跳过（防 NaN）。——
function renderScatter(spec, W, H) {
  const p = pads(spec);
  const head = renderHeader(spec, W, p.x, p.top);
  const foot = renderFooter(spec, W, p.x, H, p.bottom);
  // 收集所有系列的点，统一 {x,y,label,emphasis}；缺/非数坐标的点跳过（诚实：不臆造，且防 NaN）。
  const raw = [];
  spec.series.forEach(s => s.data.forEach(d => {
    const x = toXNum(d.x), y = num(d.y, NaN);
    if (Number.isFinite(x) && Number.isFinite(y)) raw.push({ x, y, label: d.label || '', emphasis: !!d.emphasis });
  }));
  // 强调收敛：只留 1 个强调点；无则不强制（散点焦点可由 spec 指定，未指定则全灰，避免乱点高亮）。
  let seen = false; raw.forEach(d => { if (d.emphasis) { if (seen) d.emphasis = false; else seen = true; } });

  const plotTop = head.top;
  const plotBottom = foot.bottom - SPACING.s4; // x 轴标签行
  const plotLeft = p.x + SPACING.s6;           // y 轴刻度行
  const plotRight = W - p.x - SPACING.s2;
  const plotH = Math.max(1, plotBottom - plotTop);
  const plotW = Math.max(1, plotRight - plotLeft);

  let g = '';
  if (raw.length) {
    // 数值域给余量（niceCeilTight 思路）：min 向下、max 向上各留一点，避免点贴边/重叠轴。
    const xs = raw.map(d => d.x), ys = raw.map(d => d.y);
    let xMin = Math.min(...xs), xMax = Math.max(...xs);
    let yMin = Math.min(...ys), yMax = Math.max(...ys);
    const xPad = (xMax - xMin) * 0.08 || Math.abs(xMax) * 0.08 || 1;
    const yPad = (yMax - yMin) * 0.08 || Math.abs(yMax) * 0.08 || 1;
    xMin -= xPad; xMax += xPad; yMin -= yPad; yMax += yPad;
    const xScale = scaleLinear(xMin, xMax, plotLeft, plotRight);
    const yScale = scaleLinear(yMin, yMax, plotBottom, plotTop);

    // x/y 各一条 hairline 轴（L 形：左竖 + 底横）。
    g += hline(plotLeft, plotTop, plotLeft, plotBottom, { stroke: TOKENS.hairline });
    g += hline(plotLeft, plotBottom, plotRight, plotBottom, { stroke: TOKENS.hairline });
    // 起止刻度（x 底两端、y 左两端，mono tabular）。
    g += text(plotLeft, plotBottom + SPACING.s3, fmt(xMin), { fill: TOKENS.inkDim, size: FS.meta, anchor: 'start', baseline: 'hanging' });
    g += text(plotRight, plotBottom + SPACING.s3, fmt(xMax), { fill: TOKENS.inkDim, size: FS.meta, anchor: 'end', baseline: 'hanging' });
    g += text(plotLeft - SPACING.s2, yScale(yMin), fmt(yMin), { fill: TOKENS.inkDim, size: FS.meta, anchor: 'end', baseline: 'middle' });
    g += text(plotLeft - SPACING.s2, yScale(yMax), fmt(yMax), { fill: TOKENS.inkDim, size: FS.meta, anchor: 'end', baseline: 'middle' });

    // 先画非强调灰点（退后），再画强调点（accent+辉光，置顶前注意焦点）。
    raw.filter(d => !d.emphasis).forEach(d => {
      g += `<circle cx="${n(xScale(d.x))}" cy="${n(yScale(d.y))}" r="4" fill="${TOKENS.inkDim}" fill-opacity="0.65" />`;
    });
    raw.filter(d => d.emphasis).forEach(d => {
      const px = n(xScale(d.x)), py = n(yScale(d.y));
      g += `<circle cx="${px}" cy="${py}" r="6" fill="${TOKENS.accent}" style="${GLOW}" />`;
      // 强调点直标（label 或坐标）。
      const lab = d.label || `(${fmt(d.x)}, ${fmt(d.y)})`;
      g += text(px + SPACING.s1, py - SPACING.s1, lab, {
        fill: TOKENS.accent, size: FS.meta, mono: false, anchor: 'start', baseline: 'alphabetic', tabular: false, weight: 600,
      });
    });
  }

  return svgShell({ type: 'scatter', width: W, height: H, illustrative: spec.illustrative }, head.svg + g + foot.svg);
}

// —— 5b.4 diverging-bar（发散柱，偏差）：以 0 为中心竖直 hairline 居中；正值向右、负值向左；
//        正向 accent、负向 danger 语义色（克制单信号：正向为主角焦点）；按值排序；标签贴条、数值直标。——
function renderDivergingBar(spec, W, H) {
  const p = pads(spec);
  const head = renderHeader(spec, W, p.x, p.top);
  const foot = renderFooter(spec, W, p.x, H, p.bottom);
  let data = ((spec.series[0] && spec.series[0].data) || []).map(d => ({
    label: d.label != null ? String(d.label) : '',
    value: num(d.y != null ? d.y : d.value),
    emphasis: !!d.emphasis,
  }));
  data.sort((a, b) => b.value - a.value); // 按值排序（正在上、负在下）

  const plotTop = head.top;
  const plotBottom = foot.bottom;
  // 标签列：贴在中轴左侧外缘需要空间；这里标签随条出现在条端，故左右各留对称绘图半区。
  const plotLeft = p.x + SPACING.s8;   // 左半区起点（左侧留负向数值/标签）
  const plotRight = W - p.x - SPACING.s8; // 右半区终点（右侧留正向数值/标签）
  const cx = (plotLeft + plotRight) / 2; // 0 中心轴
  const plotH = Math.max(1, plotBottom - plotTop);
  const halfW = Math.max(1, (plotRight - plotLeft) / 2);

  const maxAbs = Math.max(1e-9, ...data.map(d => Math.abs(d.value)));
  const axisMax = niceCeil(maxAbs); // 对称量程：±axisMax
  const xScale = scaleLinear(0, axisMax, 0, halfW); // 量级 → 半区像素长度
  const slot = plotH / Math.max(1, data.length);
  const barH = Math.min(slot * 0.58, SPACING.s4);

  let g = '';
  // 中心 0 轴（竖直 hairline，贯穿绘图区）。
  g += hline(cx, plotTop, cx, plotBottom, { stroke: TOKENS.hairline });
  // 中轴顶部标 0（基准）。
  g += text(cx, plotTop - SPACING.s1, '0', { fill: TOKENS.inkDim, size: FS.meta, anchor: 'middle', baseline: 'alphabetic' });

  data.forEach((d, i) => {
    const cy = plotTop + slot * (i + 0.5);
    const y = cy - barH / 2;
    const pos = d.value >= 0;
    const len = n(xScale(Math.abs(d.value)));
    const x = pos ? cx : cx - len;            // 正值从中轴向右、负值向左
    // 单信号克制：正向用 accent（主角焦点，仅强调项加辉光），负向用 danger 语义色。
    const fill = pos ? (d.emphasis ? TOKENS.accent : TOKENS.inkDim) : TOKENS.danger;
    const glow = (pos && d.emphasis) ? ` style="${GLOW}"` : '';
    g += `<rect x="${n(x)}" y="${n(y)}" width="${len}" height="${n(barH)}" fill="${fill}"${glow} />`;
    // 标签贴条「内侧」（靠近中轴侧），数值直标条「外端」。
    g += text(pos ? cx - SPACING.s1 : cx + SPACING.s1, cy, d.label, {
      fill: d.emphasis ? TOKENS.ink : TOKENS.inkDim, size: FS.meta, mono: false,
      anchor: pos ? 'end' : 'start', baseline: 'middle', tabular: false,
    });
    const valStr = (d.value > 0 ? '+' : '') + fmt(d.value);
    g += text(pos ? x + len + SPACING.s1 : x - SPACING.s1, cy, valStr, {
      fill: pos ? (d.emphasis ? TOKENS.accent : TOKENS.ink) : TOKENS.danger, size: FS.meta,
      anchor: pos ? 'start' : 'end', baseline: 'middle', weight: d.emphasis ? 600 : 400,
    });
  });

  return svgShell({ type: 'diverging-bar', width: W, height: H, illustrative: spec.illustrative }, head.svg + g + foot.svg);
}

// —— 5b.5 funnel（漏斗，路演转化/管道）：各阶段从上到下递减居中梯形；强调某阶段 accent+辉光、其余灰；
//        每阶段直标 名称+值+相对首阶段转化率%（tabular）；禁 3D。——
function renderFunnel(spec, W, H) {
  const p = pads(spec);
  const head = renderHeader(spec, W, p.x, p.top);
  const foot = renderFooter(spec, W, p.x, H, p.bottom);
  // 阶段保序（漏斗是流程顺序，不排序）；emphasis 收敛到唯一一项，无则默认强调末阶段（转化终点焦点）。
  let stages = ((spec.series[0] && spec.series[0].data) || []).map(d => ({
    label: d.label != null ? String(d.label) : '',
    value: Math.max(0, num(d.value != null ? d.value : d.y)),
    emphasis: !!d.emphasis,
  })).slice(0, 6);
  if (!stages.some(s => s.emphasis) && stages.length) stages[stages.length - 1].emphasis = true;
  let seen = false; stages.forEach(s => { if (s.emphasis) { if (seen) s.emphasis = false; else seen = true; } });

  const plotTop = head.top;
  const plotBottom = foot.bottom;
  const plotH = Math.max(1, plotBottom - plotTop);
  // 三栏布局：阶段名（左）· 漏斗梯形（中）· 值 · 转化%（右，单行，杜绝跨阶段叠印；实测反馈右侧数值叠起来）。
  const nameW = Math.min(SPACING.s16, Math.max(SPACING.s10, ...stages.map(s => estWidth(s.label, FS.meta))));
  const valW = SPACING.s12; // 「12,345 · 100%」列宽
  const funLeft = p.x + nameW + SPACING.s3;
  const funRight = W - p.x - valW - SPACING.s3;
  const cx = (funLeft + funRight) / 2;
  const fullW = Math.max(1, funRight - funLeft);

  const top = stages.length ? (stages[0].value || 1) : 1; // 首阶段=100% 基准
  const nS = Math.max(1, stages.length);
  const gap = SPACING.s1;
  const segH = Math.max(1, (plotH - gap * (nS - 1)) / nS); // 每阶段条高（等高，宽度递减表转化）

  let g = '';
  stages.forEach((s, i) => {
    const yTop = plotTop + i * (segH + gap);
    const yBot = yTop + segH;
    const cyMid = (yTop + yBot) / 2;
    const wTop = fullW * (s.value / top);                       // 本阶段宽（按相对首阶段比例）
    const wBot = fullW * ((stages[i + 1] ? stages[i + 1].value : s.value) / top); // 下阶段宽（梯形收口）
    const fill = s.emphasis ? TOKENS.accent : greyAt(i);
    // 居中梯形（上宽下窄收口成漏斗；非 3D，纯平面多边形）。
    g += `<path d="M${n(cx - wTop / 2)} ${n(yTop)} L${n(cx + wTop / 2)} ${n(yTop)} L${n(cx + wBot / 2)} ${n(yBot)} L${n(cx - wBot / 2)} ${n(yBot)} Z" ` +
      `fill="${fill}"${s.emphasis ? ` style="${GLOW}"` : ''} />`;
    // 左栏：阶段名（右对齐贴漏斗左缘；不再压在窄条上）。
    g += text(funLeft - SPACING.s2, cyMid, s.label, {
      fill: s.emphasis ? TOKENS.ink : TOKENS.inkDim, size: FS.meta, mono: false, anchor: 'end', baseline: 'middle', tabular: false, weight: s.emphasis ? 600 : 400,
    });
    // 右栏：值 · 转化%（单行，杜绝两行跨阶段叠印）。
    const conv = Math.round((s.value / top) * 1000) / 10;
    g += text(funRight + SPACING.s2, cyMid, fmt(s.value) + '  ·  ' + fmt(conv) + '%', {
      fill: s.emphasis ? TOKENS.accent : TOKENS.ink, size: FS.meta, anchor: 'start', baseline: 'middle', weight: s.emphasis ? 600 : 400,
    });
  });

  return svgShell({ type: 'funnel', width: W, height: H, illustrative: spec.illustrative }, head.svg + g + foot.svg);
}

/* ───────────────────────── 5c · info-data 折线 + 标注层即论证─────────────────────────
   解释方言专有：双线(lead 靛蓝主 / mute 灰降噪) + 标注层(橙拐点 + 引导线 + 判断标注 + 末端直标)。
   agent 只给语义(哪点拐点 / 判断文字)，引擎算全部几何——根治图表手摆坐标(findings  C 类)。 */
function normalizeInfoLine(spec) {
  const x = Array.isArray(spec.x) ? spec.x.map(String) : [];
  const series = (Array.isArray(spec.series) ? spec.series : []).map(s => ({
    role: s.role === 'mute' ? 'mute' : 'lead',
    data: (Array.isArray(s.data) ? s.data : []).map(v => num(v)),
    endLabel: s.endLabel != null ? String(s.endLabel) : '',
    endSub: s.endSub != null ? String(s.endSub) : '',
  })).filter(s => s.data.length);
  const annotations = (Array.isArray(spec.annotations) ? spec.annotations : []).map(a => ({
    point: { series: Math.round(num(a.point && a.point.series)), index: Math.round(num(a.point && a.point.index)) },
    marker: a.marker === 'peak' ? 'peak' : null,
    text: a.text != null ? String(a.text) : '',
    note: a.note != null ? String(a.note) : '',
    labelAnchor: ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(a.labelAnchor) ? a.labelAnchor : null,
  }));
  return {
    x, series, annotations,
    yTicks: Array.isArray(spec.yTicks) ? spec.yTicks.map(String) : null,
    source: spec.source != null ? String(spec.source) : '',
    illustrative: spec.illustrative !== false,
  };
}

function renderInfoAnno(spec, ctx) {
  const { sx, sy, x0, x1, y0, y1, T } = ctx;
  let svg = '';
  for (const a of spec.annotations) {
    const s = spec.series[a.point.series];
    if (!s || a.point.index < 0 || a.point.index >= s.data.length) continue;
    const px = sx(a.point.index), py = sy(s.data[a.point.index]);
    if (a.marker === 'peak') svg += `<circle cx="${n(px)}" cy="${n(py)}" r="5.5" fill="${T.accentHot}"/>`;
    if (!a.text) continue;
    // C 混合放置：labelAnchor 覆盖·否则自动挑拐点对侧上方象限（最可能空）
    const midX = (x0 + x1) / 2;
    const anchor = a.labelAnchor || (px < midX ? 'top-right' : 'top-left');
    const ax = anchor.includes('left') ? x0 + 8 : midX + 8;
    const ay = anchor.includes('top') ? y0 + 16 : (y0 + y1) / 2 + 16;
    svg += text(ax, ay, a.text, { fill: T.accent, anchor: 'start', baseline: 'middle', size: 16, weight: 500, mono: false });
    if (a.note) svg += text(ax, ay + 18, a.note, { fill: T.inkDim, anchor: 'start', baseline: 'middle', size: 12, mono: false });
    // 引导线：从标注文字块**下方**起（不压文字）→ 拐点（虚线·末端缩 8px 不盖拐点圈）
    const fromX = ax + 8, fromY = ay + (a.note ? 32 : 16);
    const dx = px - fromX, dy = py - fromY, len = Math.hypot(dx, dy) || 1;
    svg += hline(fromX, fromY, px - dx / len * 8, py - dy / len * 8, { stroke: T.accent, w: 1, dash: '4 3' });
  }
  return svg;
}

function renderInfoLine(spec, W, H, T) {
  const x0 = 110, x1 = W - 150, y0 = 40, y1 = H - 56;   // 右留末端直标位
  const allV = spec.series.flatMap(s => s.data);
  const vmin = Math.min(0, ...allV), vmax = Math.max(...allV) || 1;
  const sx = scaleLinear(0, Math.max(1, spec.x.length - 1), x0, x1);
  const sy = scaleLinear(vmin, vmax, y1, y0);
  let inner = '';
  // y 网格 + 标
  const ticks = spec.yTicks || [String(Math.round(vmin)), String(Math.round(vmax))];
  ticks.forEach((t, k) => {
    const yy = scaleLinear(0, Math.max(1, ticks.length - 1), y1, y0)(k);
    inner += hline(x0, yy, x1, yy, { stroke: T.grid });
    inner += text(x0 - 12, yy, t, { fill: T.inkDim, anchor: 'end', baseline: 'middle', size: 13 });
  });
  // x 标
  spec.x.forEach((lab, i) => { inner += text(sx(i), y1 + 22, lab, { fill: T.inkDim, anchor: 'middle', size: 13 }); });
  // 双线：先 mute(降噪) 后 lead(主·在上) + 末端直标
  const ordered = [...spec.series].sort((a, b) => (a.role === 'mute' ? 0 : 1) - (b.role === 'mute' ? 0 : 1));
  for (const s of ordered) {
    const pts = s.data.map((v, i) => `${n(sx(i))},${n(sy(v))}`).join(' ');
    const stroke = s.role === 'mute' ? T.dataMute : T.accent;
    inner += `<polyline fill="none" stroke="${stroke}" stroke-width="${s.role === 'mute' ? 2 : 3}" points="${pts}"/>`;
    if (s.endLabel) {
      const lx = sx(s.data.length - 1) + 8, ly = sy(s.data[s.data.length - 1]);
      inner += text(lx, ly, s.endLabel, { fill: s.role === 'mute' ? T.inkDim : T.accent, anchor: 'start', baseline: 'middle', size: 14, mono: false, weight: s.role === 'mute' ? 400 : 600 });
      if (s.endSub) inner += text(lx, ly + 17, s.endSub, { fill: T.inkDim, anchor: 'start', baseline: 'middle', size: 13 });
    }
  }
  inner += renderInfoAnno(spec, { sx, sy, x0, x1, y0, y1, T });
  if (spec.source) inner += text(x0, H - 16, '来源 ' + spec.source, { fill: T.inkFaint, anchor: 'start', baseline: 'middle', size: 12 });
  return svgShell({ type: 'line', width: W, height: H, illustrative: spec.illustrative }, inner, '', '', T);
}

/* ───────────────────────── 5d · info-data 其余图表（slope/dumbbell/area-stack/waterfall·增量2）─────────────
   沿 5c 模式：normalizeXxx + renderXxx(spec,W,H,T)·scaleLinear 算全部几何·复刻 deck 手写形态·复用主题/标注/签名。 */
// 共享：标注归一化 + 标注文字块（落 labelAnchor 区位·缺省 top-left）+ 来源条。
function normAnno(arr) {
  return (Array.isArray(arr) ? arr : []).map(a => ({
    text: a.text != null ? String(a.text) : '', note: a.note != null ? String(a.note) : '',
    labelAnchor: ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(a.labelAnchor) ? a.labelAnchor : null,
  }));
}
// 标注文字块（判断 text + 细节 note）落 labelAnchor 区位·返回 svg + 引导线起点(fromX,fromY)。
// 粗估文本宽（CJK≈字号·拉丁/数字/标点≈0.56 字号）·供标注包围盒定宽。
function strW(s, size) {
  let w = 0;
  for (const ch of String(s)) w += /[⺀-鿿＀-￯　-〿]/.test(ch) ? size : size * 0.56;
  return w;
}
function annoBlock(a, box, T) {
  const anchor = a.labelAnchor || 'top-left';
  const ax = anchor.includes('left') ? box.x0 : (box.x0 + box.x1) / 2;
  const ay = anchor.includes('top') ? box.y0 : (box.y0 + box.y1) / 2;
  let svg = text(ax, ay, a.text, { fill: T.accent, anchor: 'start', baseline: 'middle', size: 16, weight: 500, mono: false });
  if (a.note) svg += text(ax, ay + 18, a.note, { fill: T.inkDim, anchor: 'start', baseline: 'middle', size: 12, mono: false });
  // 文字实际包围盒(供引导线绕开·不穿字)
  const w = Math.max(strW(a.text, 16), a.note ? strW(a.note, 12) : 0);
  return { svg, bb: { x0: ax - 2, y0: ay - 10, x1: ax + w + 2, y1: ay + (a.note ? 28 : 10) } };
}
// 引导线：从标注包围盒「朝锚点那侧的边缘」出发 → 论据锚点 pt·虚线·末端缩 8。
// annotation-as-argument 灵魂(判断指向论据)；从盒边出不穿文字(实测：评审「字线不重叠」)。
function guideLine(bb, pt, T) {
  if (!pt || !bb) return '';
  const fromX = pt.x < bb.x0 ? bb.x0 : (pt.x > bb.x1 ? bb.x1 : (bb.x0 + bb.x1) / 2);
  const fromY = pt.y < bb.y0 ? bb.y0 : (pt.y > bb.y1 ? bb.y1 : (bb.y0 + bb.y1) / 2);
  const dx = pt.x - fromX, dy = pt.y - fromY, len = Math.hypot(dx, dy) || 1;
  if (len < 24) return '';
  return hline(fromX, fromY, pt.x - dx / len * 8, pt.y - dy / len * 8, { stroke: T.accent, w: 1, dash: '4 3' });
}
function infoFoot(spec, x0, H, T) {
  return spec.source ? text(x0, H - 16, '来源 ' + spec.source, { fill: T.inkFaint, anchor: 'start', baseline: 'middle', size: 12 }) : '';
}

// ── slope：2 列 × N 系列 from→to（主体洗牌·斜率即变化）──
function normalizeSlope(spec) {
  return {
    cols: (Array.isArray(spec.cols) ? spec.cols : []).map(String).slice(0, 2),
    series: (Array.isArray(spec.series) ? spec.series : []).map(s => ({
      name: String(s.name == null ? '' : s.name), from: num(s.from), to: num(s.to), role: s.role === 'lead' ? 'lead' : null,
    })).filter(s => s.name),
    annotations: normAnno(spec.annotations), source: spec.source != null ? String(spec.source) : '', illustrative: spec.illustrative !== false,
  };
}
function renderSlope(spec, W, H, T) {
  const xL = W * 0.36, xR = W * 0.64, y0 = 54, y1 = H - 44;
  const vals = spec.series.flatMap(s => [s.from, s.to]);
  const vmin = Math.min(...vals, 0), vmax = Math.max(...vals) || 1;
  const sy = scaleLinear(vmin, vmax, y1, y0);
  let inner = '';
  if (spec.cols[0]) inner += text(xL, 26, spec.cols[0], { fill: T.inkDim, anchor: 'middle', size: 13 });
  if (spec.cols[1]) inner += text(xR, 26, spec.cols[1], { fill: T.inkDim, anchor: 'middle', size: 13 });
  let leadPt = null;
  for (const s of spec.series) {
    const col = s.role === 'lead' ? T.accent : T.dataMute, r = s.role === 'lead' ? 5 : 4;
    const yF = sy(s.from), yT = sy(s.to), lc = s.role === 'lead' ? T.accent : T.inkDim, lw = s.role === 'lead' ? 600 : 400;
    inner += `<line x1="${n(xL)}" y1="${n(yF)}" x2="${n(xR)}" y2="${n(yT)}" stroke="${col}" stroke-width="${s.role === 'lead' ? 3 : 2}"/>`;
    inner += `<circle cx="${n(xL)}" cy="${n(yF)}" r="${r}" fill="${col}"/><circle cx="${n(xR)}" cy="${n(yT)}" r="${r}" fill="${col}"/>`;
    inner += text(xL - 16, yF, `${s.name} ${s.from}%`, { fill: lc, anchor: 'end', baseline: 'middle', size: 14, mono: false, weight: lw });
    inner += text(xR + 16, yT, `${s.to}% ${s.name}`, { fill: lc, anchor: 'start', baseline: 'middle', size: 14, mono: false, weight: lw });
    if (s.role === 'lead') leadPt = { x: (xL + xR) / 2, y: (yF + yT) / 2 };   // 引导线指向 lead 斜线中点
  }
  for (const a of spec.annotations) { const b = annoBlock(a, { x0: xL - 60, x1: xL + 40, y0: y0 + 36, y1: y0 + 76 }, T); inner += b.svg + guideLine(b.bb, leadPt, T); }
  inner += infoFoot(spec, 40, H, T);
  return svgShell({ type: 'slope', width: W, height: H, illustrative: spec.illustrative }, inner, '', '', T);
}

// ── dumbbell：横轴 × N 行 from→to + gain（差距即间距）──
function normalizeDumbbell(spec) {
  return {
    xMax: num(spec.xMax) || 1, xTicks: Array.isArray(spec.xTicks) ? spec.xTicks.map(String) : null,
    legend: Array.isArray(spec.legend) ? spec.legend.map(String) : [],
    rows: (Array.isArray(spec.rows) ? spec.rows : []).map(r => ({
      name: String(r.name == null ? '' : r.name), from: num(r.from), to: num(r.to),
      gain: r.gain != null ? String(r.gain) : '', role: r.role === 'lead' ? 'lead' : null,
    })).filter(r => r.name),
    annotations: normAnno(spec.annotations), source: spec.source != null ? String(spec.source) : '', illustrative: spec.illustrative !== false,
  };
}
function renderDumbbell(spec, W, H, T) {
  const x0 = 120, x1 = W - 60, yTop = 52, yBot = H - 42;
  const sx = scaleLinear(0, spec.xMax, x0, x1);
  let inner = hline(x0, yBot, x1, yBot, { stroke: T.inkFaint });
  (spec.xTicks || ['0', String(spec.xMax)]).forEach((t, k, arr) => {
    const xx = scaleLinear(0, Math.max(1, arr.length - 1), x0, x1)(k);
    inner += text(xx, yBot + 18, t, { fill: T.inkDim, anchor: k === 0 ? 'start' : 'middle', size: 13 });
  });
  const rows = spec.rows, gap = (yBot - yTop) / (rows.length + 0.5);
  let leadPt = null;
  rows.forEach((r, i) => {
    const y = yTop + gap * (i + 0.5), col = r.role === 'lead' ? T.accent : T.dataMute, xf = sx(r.from), xt = sx(r.to);
    inner += `<line x1="${n(xf)}" y1="${n(y)}" x2="${n(xt)}" y2="${n(y)}" stroke="${col}" stroke-width="3"/>`;
    inner += `<circle cx="${n(xf)}" cy="${n(y)}" r="6" fill="${col}" opacity="0.55"/><circle cx="${n(xt)}" cy="${n(y)}" r="7" fill="${col}"/>`;
    inner += text(x0 - 16, y, r.name, { fill: r.role === 'lead' ? T.accent : T.inkDim, anchor: 'end', baseline: 'middle', size: 14, mono: false, weight: r.role === 'lead' ? 600 : 400 });
    if (r.gain) inner += text((xf + xt) / 2, y - 12, r.gain, { fill: r.role === 'lead' ? T.accent : T.inkDim, anchor: 'middle', baseline: 'middle', size: 13 });
    if (r.role === 'lead' && !leadPt) leadPt = { x: xt, y };   // 引导线指向最头部 lead 行的 to-端点(甩开处)
  });
  spec.legend.forEach((lg, k) => { const lx = x1 - 150 + k * 84; inner += `<circle cx="${n(lx)}" cy="28" r="${6 + k}" fill="${T.inkDim}"/>` + text(lx + 12, 28, lg, { fill: T.inkDim, anchor: 'start', baseline: 'middle', size: 12 }); });
  for (const a of spec.annotations) { const b = annoBlock(a, { x0: W * 0.46, x1: x1, y0: yBot - 70, y1: yBot - 30 }, T); inner += b.svg + guideLine(b.bb, leadPt, T); }
  inner += infoFoot(spec, x0, H, T);
  return svgShell({ type: 'dumbbell', width: W, height: H, illustrative: spec.illustrative }, inner, '', '', T);
}

// ── area-stack：百分百堆叠面积（重心转移）──
function normalizeAreaStack(spec) {
  return {
    x: (Array.isArray(spec.x) ? spec.x : []).map(String),
    layers: (Array.isArray(spec.layers) ? spec.layers : []).map(l => ({
      name: String(l.name == null ? '' : l.name), data: (Array.isArray(l.data) ? l.data : []).map(v => num(v)), role: l.role === 'lead' ? 'lead' : null,
    })).filter(l => l.data.length),
    annotations: normAnno(spec.annotations), source: spec.source != null ? String(spec.source) : '', illustrative: spec.illustrative !== false,
  };
}
function renderAreaStack(spec, W, H, T) {
  const x0 = 110, x1 = W - 180, y0 = 40, y1 = H - 42, N = spec.x.length;
  const sx = scaleLinear(0, Math.max(1, N - 1), x0, x1), sy = scaleLinear(0, 100, y1, y0);
  let inner = '';
  [['100%', 100], ['50%', 50], ['0', 0]].forEach(([lab, v]) => {
    inner += hline(x0, sy(v), x1, sy(v), { stroke: T.grid }) + text(x0 - 12, sy(v), lab, { fill: T.inkDim, anchor: 'end', baseline: 'middle', size: 12 });
  });
  const cum = new Array(N).fill(0);
  const bands = spec.layers.map(l => {
    const bottoms = cum.slice(), tops = l.data.map((v, i) => bottoms[i] + v);
    tops.forEach((t, i) => cum[i] = t);
    return { l, bottoms, tops };
  });
  const seq = [T.seq5, T.seq3, T.seq2, T.seq4, T.seq6, T.seq1, T.seq7];
  bands.forEach((band, k) => {
    const top = band.tops.map((t, i) => `${n(sx(i))},${n(sy(t))}`);
    const bot = band.bottoms.map((b, i) => `${n(sx(i))},${n(sy(b))}`).reverse();
    const fill = band.l.role === 'lead' ? T.seq3 : seq[k % seq.length];
    inner += `<path d="M${top.join(' L')} L${bot.join(' L')} Z" fill="${fill}"/>`;
  });
  bands.forEach(band => {
    const midY = sy((band.tops[N - 1] + band.bottoms[N - 1]) / 2);
    // 名/值上下两行（实测：长化学名如「三元 NMC」会与 % 横向重叠·改竖排）
    inner += text(x1 + 14, midY - 8, band.l.name, { fill: T.inkDim, anchor: 'start', baseline: 'middle', size: 12, mono: false });
    inner += text(x1 + 14, midY + 9, band.l.data[N - 1] + '%', { fill: T.ink, anchor: 'start', baseline: 'middle', size: 14, weight: band.l.role === 'lead' ? 600 : 400 });
    if (band.l.role === 'lead') inner += `<circle cx="${n(x1)}" cy="${n(midY)}" r="5" fill="${T.accentHot}"/>`;
  });
  spec.x.forEach((lab, i) => { if (i === 0 || i === N - 1 || i === (N >> 1)) inner += text(sx(i), y1 + 20, lab, { fill: T.inkDim, anchor: 'middle', size: 12 }); });
  // 标注放顶部白边距(100% 线以上·白底完美对比·去 scrim 丑解) + 引导线指 lead 层胀大处(实测 缝 B 正解)
  const leadBand = bands.find(b => b.l.role === 'lead'), mi = N >> 1;
  const leadPt = leadBand ? { x: sx(mi), y: sy((leadBand.tops[mi] + leadBand.bottoms[mi]) / 2) } : null;
  for (const a of spec.annotations) { const b = annoBlock(a, { x0: x0 + 6, x1: x1, y0: 12, y1: 34 }, T); inner += b.svg + guideLine(b.bb, leadPt, T); }
  inner += infoFoot(spec, x0, H, T);
  return svgShell({ type: 'area-stack', width: W, height: H, illustrative: spec.illustrative }, inner, '', '', T);
}

// ── waterfall：累积增量拆解（缺口是谁补的）──
function normalizeWaterfall(spec) {
  return {
    yMax: num(spec.yMax) || 1, yTicks: Array.isArray(spec.yTicks) ? spec.yTicks.map(String) : null,
    // 值标签格式（实测 暴露：不能写死 $T·须支持单位/符号/小数·缺省维持 $·T·1 位向后兼容）
    valuePrefix: spec.valuePrefix != null ? String(spec.valuePrefix) : '$',
    unit: spec.unit != null ? String(spec.unit) : 'T',
    decimals: Number.isFinite(spec.decimals) ? spec.decimals : 1,
    base: { label: String((spec.base && spec.base.label) || ''), value: num(spec.base && spec.base.value) },
    steps: (Array.isArray(spec.steps) ? spec.steps : []).map(s => ({ label: String(s.label == null ? '' : s.label), value: num(s.value), role: s.role === 'lead' ? 'lead' : null })),
    total: { label: String((spec.total && spec.total.label) || ''), value: (spec.total && spec.total.value != null) ? num(spec.total.value) : null },
    annotations: normAnno(spec.annotations), source: spec.source != null ? String(spec.source) : '', illustrative: spec.illustrative !== false,
  };
}
function renderWaterfall(spec, W, H, T) {
  const x0 = 110, x1 = W - 60, y0 = 40, y1 = H - 56;
  const cols = 2 + spec.steps.length, sy = scaleLinear(0, spec.yMax, y1, y0);
  const slotW = (x1 - x0) / cols, barW = slotW * 0.52;
  const barX = i => x0 + slotW * i + (slotW - barW) / 2;
  let inner = '';
  (spec.yTicks || ['0', String(spec.yMax)]).forEach((t, k, arr) => {
    const yy = scaleLinear(0, Math.max(1, arr.length - 1), y1, y0)(k);
    inner += hline(x0, yy, x1, yy, { stroke: T.grid }) + text(x0 - 12, yy, t, { fill: T.inkDim, anchor: 'end', baseline: 'middle', size: 12 });
  });
  // 柱：y 取两端较小（视觉顶边）·高取差绝对值——兼容增量(top>bottom)与下降(top<bottom·实测)。
  const bar = (i, bottomV, topV, col) => `<rect x="${n(barX(i))}" y="${n(Math.min(sy(topV), sy(bottomV)))}" width="${n(barW)}" height="${n(Math.abs(sy(bottomV) - sy(topV)))}" fill="${col}"/>`;
  const cat = (i, lab) => text(barX(i) + barW / 2, y1 + 18, lab, { fill: T.inkDim, anchor: 'middle', size: 12, mono: false });
  const valLab = (i, yv, s, hot) => text(barX(i) + barW / 2, sy(yv) - 8, s, { fill: hot ? T.accentHot : T.inkDim, anchor: 'middle', size: 13 });
  // 值格式：prefix + |v| + unit（toFixed 保小数·避 JS 2.0→"2"）；缺省 $X.XT 向后兼容。
  const fmt = v => spec.valuePrefix + Math.abs(v).toFixed(spec.decimals) + spec.unit;
  const signed = v => (v < 0 ? '−' : '+') + fmt(v);   // step 带符号（实测：支持下降/负向·−$90/kWh）
  inner += bar(0, 0, spec.base.value, T.dataMute) + cat(0, spec.base.label) + valLab(0, spec.base.value, fmt(spec.base.value));
  let running = spec.base.value, prevTop = spec.base.value, leadPt = null;
  spec.steps.forEach((s, k) => {
    const ci = k + 1, bottom = running, top = running + s.value, col = s.role === 'lead' ? T.accentHot : T.accent;
    inner += `<line x1="${n(barX(ci - 1) + barW)}" y1="${n(sy(prevTop))}" x2="${n(barX(ci))}" y2="${n(sy(prevTop))}" stroke="${T.grid}" stroke-width="1"/>`;
    inner += bar(ci, bottom, top, col) + cat(ci, s.label) + valLab(ci, Math.max(top, bottom), signed(s.value), s.role === 'lead');
    if (s.role === 'lead' && !leadPt) leadPt = { x: barX(ci) + barW / 2, y: Math.min(sy(top), sy(bottom)) };   // 引导线指向 lead step 柱顶
    running = top; prevTop = top;
  });
  const fi = cols - 1, finalV = spec.total.value != null ? spec.total.value : running;
  inner += `<line x1="${n(barX(fi - 1) + barW)}" y1="${n(sy(prevTop))}" x2="${n(barX(fi))}" y2="${n(sy(prevTop))}" stroke="${T.grid}" stroke-width="1"/>`;
  inner += bar(fi, 0, finalV, T.dataMute) + cat(fi, spec.total.label) + valLab(fi, finalV, fmt(finalV));
  // 标注放「矮柱那侧」上方空区（实测 缝 A：base 高→放右上；demo base 矮→维持左上不回归）+ 引导线指 lead step 柱
  const annoBox = spec.base.value > finalV
    ? { x0: x0 + (x1 - x0) * 0.52, x1, y0: y0 + 12, y1: y0 + 52 }
    : { x0: x0 + 22, x1: W * 0.6, y0: y0 + 12, y1: y0 + 52 };
  for (const a of spec.annotations) { const b = annoBlock(a, annoBox, T); inner += b.svg + guideLine(b.bb, leadPt, T); }
  inner += infoFoot(spec, x0, H, T);
  return svgShell({ type: 'waterfall', width: W, height: H, illustrative: spec.illustrative }, inner, '', '', T);
}

/* ───────────────────────── 6 · 主入口 renderChart ───────────────────────── */

const RENDERERS = {
  bar: renderBar, hbar: renderHbar, line: renderLine, area: renderArea, kpi: renderKpi, sparkline: renderSparkline,
  // 5b 新增（部分整体 / 相关 / 偏差 / 路演转化）：
  donut: renderDonut, 'stacked-bar': renderStackedBar, scatter: renderScatter, 'diverging-bar': renderDivergingBar, funnel: renderFunnel,
};

/**
 * renderChart(spec, opts?) -> svgString
 * @param {object} spec  ChartSpec（见 references/05-chart-system.md）
 * @param {object} [opts]
 *   @param {number} [opts.width=720]   画布宽（px，自适应）
 *   @param {number} [opts.height=420]  画布高（px，自适应）
 *   @param {'svg'|'html'} [opts.labelMode='svg']
 *        'svg'  → 返回纯 svgString（自包含，node/浏览器都能独立成图；默认）
 *        'html' → 返回 { svg, html } —— SVG 仅画几何、文字标签走 HTML 叠层（工程规范 B2 deck 内合规用）
 * @returns {string|{svg:string,html:string}}
 */
export function renderChart(spec, opts = {}) {
  const width = num(opts.width, 0) || 720;
  const height = num(opts.height, 0) || 420;
  // info-data 专有图表走标注层渲染器（设计决策 增量1/2）——早返回拦截，避开默认 normalizeSpec/RENDERERS。
  const theme = String(spec.theme || opts.theme || 'instrument-cool');
  const itype = String(spec.type || '').toLowerCase();
  if (theme === 'info-data') {
    const INFO_RENDER = {
      line: () => renderInfoLine(normalizeInfoLine(spec), width, height, INFO_DATA),
      slope: () => renderSlope(normalizeSlope(spec), width, height, INFO_DATA),
      dumbbell: () => renderDumbbell(normalizeDumbbell(spec), width, height, INFO_DATA),
      'area-stack': () => renderAreaStack(normalizeAreaStack(spec), width, height, INFO_DATA),
      waterfall: () => renderWaterfall(normalizeWaterfall(spec), width, height, INFO_DATA),
    };
    if (INFO_RENDER[itype]) {
      const svg = INFO_RENDER[itype]();
      return opts.labelMode === 'html'
        ? { svg, html: `<div class="chart-overlay" data-chart-type="${itype}" aria-hidden="true"></div>` }
        : svg;
    }
  }
  const ns = normalizeSpec(spec);
  const fn = RENDERERS[ns.type];
  if (!fn) throw new RangeError(`chart-render: 无渲染器 for type=${ns.type}`); // 理论上 normalizeSpec 已挡
  const svg = fn(ns, width, height);

  if (opts.labelMode === 'html') {
    // deck 内 B2 合规模式：本实现以「同一 svgString + 提示」交付，
    // 让调用方把 SVG 内 <text> 视为可被 HTML 叠层替换的占位（首发不强拆，避免破坏自包含性）。
    return {
      svg,
      html: `<div class="chart-overlay" data-chart-type="${esc(ns.type)}" aria-hidden="true"></div>`,
    };
  }
  return svg;
}

// 同时支持 default 导入。
export default renderChart;

/* ───────────────────────── 7 · node 自测（--selftest）─────────────────────────
   渲染全部 11 个样例 spec（首发 6 + 5b 新增 5），断言：① 含签名 data-rendered-by/data-chart-type；
   ② 含必要几何元素 + 单信号 accent + 强调辉光；③ 无 NaN/undefined/Infinity 坐标；
   ④ 黑名单/非白名单/缺数据/截断基线被正确拒。 */

const SAMPLE_SPECS = {
  bar: {
    type: 'bar', title: 'GPT-4 类模型把单测通过率从 48% 拉到 81%', unit: '%',
    series: [{ name: 'pass@1', data: [
      { label: '2023', value: 48 }, { label: '2024Q1', value: 61 },
      { label: '2024Q3', value: 73 }, { label: '2025', value: 81, emphasis: true },
    ] }],
    source: '示意（内部基准）',
  },
  hbar: {
    type: 'hbar', title: 'Cursor 周活跃增速领跑 AI 编码工具', unit: '万 DAU',
    series: [{ name: 'DAU', data: [
      { label: 'Cursor', value: 120, emphasis: true }, { label: 'Copilot', value: 95 },
      { label: 'Windsurf', value: 48 }, { label: 'Cody', value: 22 }, { label: 'Tabnine', value: 14 },
    ] }],
    source: '示意',
  },
  line: {
    type: 'line', title: 'Agent 接管的 PR 占比 18 个月翻 6 倍', unit: '%',
    series: [
      { name: 'Agent PR 占比', emphasis: true, data: [
        { x: '2024-01', y: 4 }, { x: '2024-07', y: 11 }, { x: '2025-01', y: 19 }, { x: '2025-07', y: 26 },
      ] },
      { name: '人工 review 占比', data: [
        { x: '2024-01', y: 96 }, { x: '2024-07', y: 89 }, { x: '2025-01', y: 81 }, { x: '2025-07', y: 74 },
      ] },
    ],
    source: '示意',
  },
  area: {
    type: 'area', title: 'AI 生成代码累计行数突破 10 亿行', unit: '亿行',
    series: [{ name: '累计行数', emphasis: true, data: [
      { x: '2023', y: 0.6 }, { x: '2024', y: 3.2 }, { x: '2025', y: 7.1 }, { x: '2026', y: 10.4 },
    ] }],
    source: '示意',
  },
  kpi: {
    type: 'kpi', title: '初级开发岗的任务有多少能被 agent 接管',
    data: { value: 62, unit: '%', delta: 18, takeaway: '不是消失，是岗位定义被改写', spark: [40, 44, 49, 53, 58, 62] },
    source: '示意',
  },
  sparkline: {
    type: 'sparkline', title: '', series: [{ data: [12, 15, 14, 19, 23, 22, 28, 31] }],
  },
  // —— 5b 新增五种（sample 数据均为「示意」，非真实统计）——
  donut: {
    type: 'donut', title: 'AI 编码工具用时里 agent 自动执行占 58%', unit: '%',
    data: [
      { label: 'Agent 自动执行', value: 58, emphasis: true }, { label: '人工补写', value: 22 },
      { label: 'Review 修改', value: 13 }, { label: '调试', value: 7 },
    ],
    source: '示意（内部用时统计）',
  },
  'stacked-bar': {
    type: 'stacked-bar', title: 'Agent 接管的工时逐季扩大、人工占比收缩', unit: '万工时',
    series: [
      { name: 'Agent 自动', emphasis: true, data: [
        { label: '2024Q1', value: 8 }, { label: '2024Q3', value: 15 }, { label: '2025Q1', value: 26 }, { label: '2025Q3', value: 38 },
      ] },
      { name: '人工编写', data: [
        { label: '2024Q1', value: 42 }, { label: '2024Q3', value: 38 }, { label: '2025Q1', value: 31 }, { label: '2025Q3', value: 25 },
      ] },
      { name: '协作返工', data: [
        { label: '2024Q1', value: 12 }, { label: '2024Q3', value: 11 }, { label: '2025Q1', value: 9 }, { label: '2025Q3', value: 8 },
      ] },
    ],
    source: '示意',
  },
  scatter: {
    type: 'scatter', title: '模型规模越大、单测通过率越高（示意相关）', unit: '',
    series: [{ name: '模型', data: [
      { x: 7, y: 41, label: '7B' }, { x: 13, y: 52, label: '13B' }, { x: 34, y: 63, label: '34B' },
      { x: 70, y: 71, label: '70B' }, { x: 175, y: 84, label: '175B', emphasis: true },
    ] }],
    source: '示意（横轴=参数量 B，纵轴=pass@1 %）',
  },
  'diverging-bar': {
    type: 'diverging-bar', title: '各环节工时较去年增减：编码大涨、调试大降', unit: '%',
    data: [
      { label: '需求澄清', value: 6 }, { label: '编码实现', value: 34, emphasis: true },
      { label: '文档', value: 9 }, { label: 'Code Review', value: -11 },
      { label: '手动测试', value: -18 }, { label: '调试排错', value: -27 },
    ],
    source: '示意（同比变化）',
  },
  funnel: {
    type: 'funnel', title: '从注册到付费的转化：试用→付费仅 9%', unit: '人',
    data: [
      { label: '注册', value: 10000 }, { label: '激活', value: 6200 },
      { label: '试用 Agent', value: 3100 }, { label: '周留存', value: 1500 },
      { label: '付费', value: 900, emphasis: true },
    ],
    source: '示意（转化漏斗）',
  },
};

function assert(cond, msg) { if (!cond) throw new Error('SELFTEST FAIL: ' + msg); }

function selftest() {
  const types = Object.keys(SAMPLE_SPECS);
  let pass = 0;
  console.log('blcaptain chart-render · selftest');
  console.log('─'.repeat(56));
  for (const t of types) {
    const svg = renderChart(SAMPLE_SPECS[t], { width: 720, height: 420 });
    // ① 签名
    assert(svg.includes('data-rendered-by="blcaptain-chart"'), `${t}: 缺签名 data-rendered-by`);
    assert(svg.includes(`data-chart-type="${t}"`), `${t}: 缺/错 data-chart-type`);
    assert(svg.startsWith('<svg') && svg.endsWith('</svg>'), `${t}: 非完整 SVG`);
    // ② 必要几何元素
    if (t === 'bar' || t === 'hbar') assert(/<rect\b/.test(svg), `${t}: 缺 <rect> 柱体`);
    if (t === 'line' || t === 'area') assert(/<path\b/.test(svg), `${t}: 缺 <path> 折线`);
    if (t === 'area') assert(/fill="var\(--accent-dim/.test(svg) || /fill="var\(--hairline-2/.test(svg), `${t}: 缺面积填充`);
    if (t === 'kpi') assert(/font-weight:300/.test(svg) && /tabular-nums/.test(svg), `${t}: KPI 大数字须 weight300+tabular`);
    if (t === 'sparkline') { assert(/<circle\b/.test(svg), 'sparkline: 缺末点'); assert(/<path\b/.test(svg), 'sparkline: 缺趋势线'); assert(!/<rect\b/.test(svg), 'sparkline: 不应有柱体/网格（仍属趋势微线：仅许标题+首尾值直标，无轴无网格无图例）'); }
    // ②b 5b 新增五种的必要几何 + 单信号 accent + 强调辉光 + 禁独立图例。
    if (t === 'donut') {
      assert(/<path\b/.test(svg), 'donut: 缺 <path> 扇区'); // 环形扇区用 path
      assert(/var\(--accent[,)]/.test(svg), 'donut: 缺 accent 强调扇区'); // 至少一个强调扇区为 accent
      assert(/%</.test(svg), 'donut: 缺百分比直标'); // 直标百分比（禁独立图例）
    }
    if (t === 'stacked-bar') {
      assert(/<rect\b/.test(svg), 'stacked-bar: 缺 <rect> 堆叠段');
      assert(/<line\b/.test(svg), 'stacked-bar: 缺 0 基线'); // Y 从 0
      assert(/var\(--accent[,)]/.test(svg), 'stacked-bar: 缺 accent 强调段');
    }
    if (t === 'scatter') {
      assert(/<circle\b/.test(svg), 'scatter: 缺 <circle> 散点');
      assert(/<line\b/.test(svg), 'scatter: 缺 hairline 轴');
      assert(/var\(--accent[,)]/.test(svg), 'scatter: 缺 accent 强调点');
    }
    if (t === 'diverging-bar') {
      assert(/<rect\b/.test(svg), 'diverging-bar: 缺 <rect> 条');
      assert(/<line\b/.test(svg), 'diverging-bar: 缺中心 0 轴 hairline');
      assert(/var\(--danger/.test(svg), 'diverging-bar: 缺 danger 负向语义色'); // 负向用 danger
      assert(/>\+/.test(svg), 'diverging-bar: 缺带符号数值直标'); // 正值带 + 号
    }
    if (t === 'funnel') {
      assert(/<path\b/.test(svg), 'funnel: 缺 <path> 梯形阶段');
      assert(/var\(--accent[,)]/.test(svg), 'funnel: 缺 accent 强调阶段');
      assert(/%</.test(svg), 'funnel: 缺转化率% 直标');
    }
    // 5b 五种强调项均须带克制辉光（drop-shadow style；前注意焦点）。
    if (['donut', 'stacked-bar', 'scatter', 'diverging-bar', 'funnel'].includes(t)) {
      assert(/drop-shadow/.test(svg), `${t}: 缺强调项辉光（前注意焦点）`);
    }
    // ③ 无 NaN / undefined / Infinity 坐标
    assert(!/NaN|undefined|Infinity/.test(svg), `${t}: SVG 含 NaN/undefined/Infinity`);
    // 坐标数值健全性：抓所有 x/y/width/height/cx/cy/d 里的数字，确保有限
    const nums = svg.match(/-?\d+\.?\d*/g) || [];
    assert(nums.every(s => Number.isFinite(parseFloat(s))), `${t}: 存在非有限数值`);
    // ④ 去 chartjunk：无渐变 / 无 3D / 无普遍滤镜。
    //    例外：单一强调项的「克制辉光」（前注意焦点；Ware/Few；同 deck 数据 hero）经 style="filter:drop-shadow" 施加，
    //    属功能性强调而非装饰，故只禁「filter= 属性形式的普遍滤镜（如全局 blur/3D）」，不禁焦点 style 辉光。
    assert(!/<linearGradient|<radialGradient/.test(svg), `${t}: 含渐变（违 chartjunk）`);
    assert(!/filter="[^"]*(blur|shadow|3d)/i.test(svg), `${t}: 含 SVG filter= 属性滤镜（违 chartjunk；焦点辉光请用 style 形式）`);
    assert(svg.includes('color-interpolation-filters="sRGB"'), `${t}: 缺 sRGB 色彩管理`);
    // 属性完整性：font 栈不得用双引号（会截断 style="…" 属性 → 浏览器渲染崩）。
    assert(!/var\(--font-[a-z]+, *"/.test(svg), `${t}: 字体栈含双引号会截断 style 属性`);
    // bar/area 数据诚实：含基线（hairline line）
    if (t === 'bar' || t === 'area') assert(/<line\b/.test(svg), `${t}: 缺 0 基线`);
    console.log(`  ✓ ${t.padEnd(10)} ${svg.length} bytes · 签名/几何/无NaN/去chartjunk OK`);
    pass++;
  }
  // ⑤ 反例：黑名单 / 非白名单 / 缺数据 必须被拒
  console.log('─'.repeat(56));
  const mustReject = [
    // 非白名单（非定量 / 复杂关系，暂不实现）：sankey / treemap / map / flow。
    ['sankey（不实现）', { type: 'sankey', series: [{ data: [{ x: 1, y: 2 }] }], source: 's' }],
    ['treemap（不实现）', { type: 'treemap', data: [{ label: 'a', value: 1 }], source: 's' }],
    ['map（不实现）', { type: 'map', data: [{ label: 'a', value: 1 }], source: 's' }],
    // 永久黑名单标志位。
    ['3D 标志', { type: 'bar', threeD: true, series: [{ data: [{ label: 'a', value: 1 }] }], source: 's' }],
    ['双轴标志', { type: 'line', dualAxis: true, series: [{ data: [{ x: 1, y: 2 }] }], source: 's' }],
    // 截断基线（数据欺骗）：bar 与新增 stacked-bar 均强制从 0。
    ['bar 截断基线', { type: 'bar', encoding: { y: { zeroBaseline: false } }, series: [{ data: [{ label: 'a', value: 1 }] }], source: 's' }],
    ['stacked-bar 截断基线', { type: 'stacked-bar', encoding: { y: { zeroBaseline: false } }, series: [{ data: [{ label: 'a', value: 1 }] }], source: 's' }],
    // 缺数据。
    ['bar 缺数据', { type: 'bar', series: [] }],
    ['donut 缺数据', { type: 'donut', series: [] }],
  ];
  for (const [name, bad] of mustReject) {
    let threw = false;
    try { renderChart(bad); } catch (e) { threw = true; }
    assert(threw, `反例「${name}」本应被拒却通过了`);
    console.log(`  ✓ 正确拒绝：${name}`);
  }
  // ⑥ 数据诚实：缺 source 的定量图自动标「示意」
  const noSrc = renderChart({ type: 'bar', title: 't', series: [{ data: [{ label: 'a', value: 1 }] }] });
  assert(/data-illustrative="true"/.test(noSrc) && /示意/.test(noSrc), '缺 source 未自动标示意');
  console.log('  ✓ 缺 source 的定量图自动标「示意」');

  // ⑦ 长标题禁静默截断（工程规范）：超宽标题须折成多行（多个 weight:510 的 <text>），不溢出。
  const longTitle = '一个非常非常长的结论句标题用来验证标题在窄画板里会自动折行而不是被静默截断掉超出部分';
  const wrapped = renderChart({ type: 'bar', title: longTitle, series: [{ data: [{ label: 'a', value: 1 }] }], source: 's' }, { width: 480, height: 360 });
  const titleLines = (wrapped.match(/font-weight:510/g) || []).length;
  assert(titleLines >= 2, `长标题未折行（仅 ${titleLines} 行），可能溢出截断`);
  // 折行后每行估宽不得超过可用宽（480 - 2*64 = 352）。
  const lineTexts = [...wrapped.matchAll(/font-weight:510[^>]*>([^<]+)</g)].map(m => m[1]);
  for (const lt of lineTexts) assert(estWidth(lt, FS.body) <= 352 + 1, `标题行「${lt}」估宽超界`);
  console.log(`  ✓ 长标题自动折行（${titleLines} 行）不溢出（禁静默截断）`);

  // ⑧ 边界数据健壮性（防 NaN 坐标回归）：单点 / 全零 / 负值 / 类目 x（不可解析）/ 巨数 / 全等。
  console.log('─'.repeat(56));
  const edge = [
    ['bar single', { type: 'bar', title: 'x', data: [{ label: 'only', value: 5 }], source: 's' }],
    ['bar all-zero', { type: 'bar', title: 'x', data: [{ label: 'a', value: 0 }, { label: 'b', value: 0 }], source: 's' }],
    ['bar negatives', { type: 'bar', title: 'x', data: [{ label: 'a', value: -3 }, { label: 'b', value: 7 }], source: 's' }],
    ['line single pt', { type: 'line', title: 'x', series: [{ data: [{ x: '2024', y: 3 }] }], source: 's' }],
    ['line categorical-x', { type: 'line', title: 'x', series: [{ data: [{ x: 'a', y: 5 }, { x: 'b', y: 9 }] }], source: 's' }],
    ['area categorical+big', { type: 'area', title: 'x', series: [{ data: [{ x: 'a', y: 1200000 }, { x: 'b', y: 8900000 }] }], source: 's' }],
    ['hbar no labels', { type: 'hbar', title: 'x', data: [{ value: 3 }, { value: 9 }], source: 's' }],
    ['kpi bare', { type: 'kpi', title: 'x', data: { value: 42, unit: 'ms' }, source: 's' }],
    ['kpi neg delta', { type: 'kpi', title: 'x', data: { value: 42, unit: '%', delta: -12, takeaway: '下降' }, source: 's' }],
    ['spark identical', { type: 'sparkline', series: [{ data: [5, 5, 5, 5] }] }],
    // —— 5b 新增五种的边界 ——
    ['donut single', { type: 'donut', title: 'x', data: [{ label: 'only', value: 7 }], source: 's' }],
    ['donut all-zero', { type: 'donut', title: 'x', data: [{ label: 'a', value: 0 }, { label: 'b', value: 0 }], source: 's' }],
    ['stacked single cat', { type: 'stacked-bar', title: 'x', series: [{ name: 'a', data: [{ label: 'Q1', value: 3 }] }, { name: 'b', data: [{ label: 'Q1', value: 5 }] }], source: 's' }],
    ['stacked all-zero', { type: 'stacked-bar', title: 'x', series: [{ name: 'a', data: [{ label: 'Q1', value: 0 }] }], source: 's' }],
    ['scatter missing coords', { type: 'scatter', title: 'x', series: [{ data: [{ x: 'n/a', y: 5 }, { x: 3, y: 9, emphasis: true }, { x: 7, label: '缺 y' }] }], source: 's' }],
    ['scatter single pt', { type: 'scatter', title: 'x', series: [{ data: [{ x: 5, y: 5 }] }], source: 's' }],
    ['diverging all-neg', { type: 'diverging-bar', title: 'x', data: [{ label: 'a', value: -3 }, { label: 'b', value: -8 }], source: 's' }],
    ['diverging single', { type: 'diverging-bar', title: 'x', data: [{ label: 'only', value: 12 }], source: 's' }],
    ['funnel single stage', { type: 'funnel', title: 'x', data: [{ label: '注册', value: 1000 }], source: 's' }],
    ['funnel zero tail', { type: 'funnel', title: 'x', data: [{ label: '注册', value: 1000 }, { label: '付费', value: 0 }], source: 's' }],
  ];
  let epass = 0;
  for (const [name, spec] of edge) {
    const svg = renderChart(spec, { width: 600, height: 380 });
    assert(!/NaN|Infinity|undefined/.test(svg), `边界「${name}」含 NaN/Infinity/undefined`);
    assert(svg.startsWith('<svg') && svg.endsWith('</svg>'), `边界「${name}」非完整 SVG`);
    assert((svg.match(/-?\d+\.?\d*/g) || []).every(s => Number.isFinite(parseFloat(s))), `边界「${name}」存在非有限数值`);
    epass++;
  }
  console.log(`  ✓ 边界数据健壮性 ${epass}/${edge.length}（单点/全零/负值/类目x/巨数/全等 均无 NaN 坐标）`);

  // ───────── info-data 折线 + 标注层即论证─────────
  {
    const chartLead = {
      type: 'line', theme: 'info-data',
      x: ['2020', '2021', '2022', '2023', '2024', '2025', '2026'], yTicks: ['$0', '$2T', '$4T', '$6T'],
      series: [{ role: 'lead', data: [1.5, 1.6, 1.9, 2.4, 3.2, 4.5, 6.0], endLabel: 'AI 算力 capex', endSub: '≈$6T' },
               { role: 'mute', data: [1.5, 1.55, 1.7, 1.9, 2.1, 2.3, 2.4], endLabel: '传统 IT' }],
      annotations: [{ point: { series: 0, index: 4 }, marker: 'peak', text: '2024 拐点 · $3.2T', note: '曲线转折——指数级甩开传统 IT' }],
      source: '示意数据 · 形态演示（非真实财报）',
    };
    const svg = renderChart(chartLead, { width: 1120, height: 300 });
    assert(/data-rendered-by="blcaptain-chart"/.test(svg), 'info-line: 带 chart-render 签名（validator 认非手画）');
    assert(/stroke="var\(--accent,/.test(svg), 'info-line: lead 线靛蓝 accent');
    assert(/stroke="var\(--data-mute,/.test(svg), 'info-line: mute 线灰降噪');
    assert((svg.match(/<polyline/g) || []).length >= 2, 'info-line: 双 polyline(lead+mute)');
    assert(svg.includes('AI 算力 capex') && svg.includes('传统 IT'), 'info-line: 末端直标 endLabel');
    assert(svg.includes('$6T') && svg.includes('2024'), 'info-line: y/x 轴标');
    assert(/<circle[^>]*fill="var\(--accent-hot,/.test(svg), 'anno: 橙拐点 marker');
    assert(svg.includes('2024 拐点 · $3.2T') && svg.includes('指数级甩开'), 'anno: 判断标注 text+note');
    assert(/stroke-dasharray="4 3"/.test(svg), 'anno: 引导线虚线');
    for (const a of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
      const s2 = JSON.parse(JSON.stringify(chartLead)); s2.annotations[0].labelAnchor = a;
      assert(renderChart(s2, { width: 1120, height: 300 }).includes('2024 拐点'), `anno: labelAnchor ${a} 渲染`);
    }
    for (const d of [[1, 9], [3, 3, 3, 3, 3], [0.1, 50, 2, 80, 5, 99]]) {
      const v = renderChart({
        type: 'line', theme: 'info-data', x: d.map((_, i) => 'p' + i),
        series: [{ role: 'lead', data: d, endLabel: 'X' }],
        annotations: [{ point: { series: 0, index: d.length - 1 }, marker: 'peak', text: '末点' }],
      }, { width: 900, height: 420 });
      assert(!/NaN|Infinity/.test(v), `info-line 变长 [${d}]: 无 NaN/Infinity 坐标`);
    }
    console.log('  ✓ info-data 折线 + 标注层即论证（双线/橙拐点/引导线/判断标注/末端直标/labelAnchor×4/变长无 NaN）');
  }

  // ───────── info-data 增量2 四图（slope/dumbbell/area-stack/waterfall）─────────
  {
    let svg = renderChart({
      type: 'slope', theme: 'info-data', cols: ['2020', '2026'],
      series: [{ name: '云厂商', from: 68, to: 52 }, { name: '企业自建', from: 24, to: 21 }, { role: 'lead', name: '主权算力', from: 8, to: 27 }],
      annotations: [{ text: '主权算力 ×3.4', note: '反超企业自建' }], source: '示意',
    }, { width: 1120, height: 320 });
    assert(/data-chart-type="slope"/.test(svg) && /data-rendered-by="blcaptain-chart"/.test(svg), 'slope: 签名+type');
    assert((svg.match(/<line/g) || []).length >= 3 && svg.includes('主权算力'), 'slope: ≥3 斜线 + 系列名');
    assert(/stroke="var\(--accent,/.test(svg), 'slope: lead 靛蓝');

    svg = renderChart({
      type: 'dumbbell', theme: 'info-data', xMax: 2, xTicks: ['$0', '$1T', '$2T'], legend: ['2020', '2026'],
      rows: [{ name: '美国', from: 0.3, to: 2.4, gain: '+$2.1T', role: 'lead' }, { name: '欧盟', from: 0.12, to: 0.64, gain: '+$0.52T' }, { name: '其他', from: 0.05, to: 0.27, gain: '+$0.22T' }],
      annotations: [{ text: '头尾差距 ×8' }], source: '示意',
    }, { width: 1120, height: 320 });
    assert(/data-chart-type="dumbbell"/.test(svg), 'dumbbell: type');
    assert((svg.match(/<line/g) || []).length >= 3 && svg.includes('美国') && svg.includes('+$2.1T'), 'dumbbell: 行连线+名+gain');

    svg = renderChart({
      type: 'area-stack', theme: 'info-data', x: ['2020', '2022', '2024', '2026'],
      layers: [{ name: '训练', data: [68, 50, 38, 27] }, { role: 'lead', name: '推理', data: [20, 35, 47, 55] }, { name: '边缘', data: [12, 15, 15, 18] }],
      annotations: [{ text: '推理成主战场' }], source: '示意',
    }, { width: 1120, height: 300 });
    assert(/data-chart-type="area-stack"/.test(svg), 'area-stack: type');
    assert((svg.match(/<path/g) || []).length >= 3 && svg.includes('推理') && svg.includes('55%'), 'area-stack: 3 层 path + 末标');
    assert((svg.match(/stroke-dasharray="4 3"/g) || []).length >= 1, 'area-stack: 标注引导线指 lead 层(annotation-as-argument)');

    svg = renderChart({
      type: 'waterfall', theme: 'info-data', yMax: 6, yTicks: ['$0', '$2T', '$4T', '$6T'],
      base: { label: '2020 基线', value: 1.5 }, steps: [{ label: '云厂商', value: 1.4 }, { role: 'lead', label: '主权算力', value: 2.0 }, { label: '企业', value: 0.6 }, { label: '新兴', value: 0.5 }], total: { label: '2026', value: 6.0 },
      annotations: [{ text: '主权算力单笔最大' }], source: '示意',
    }, { width: 1120, height: 300 });
    assert(/data-chart-type="waterfall"/.test(svg), 'waterfall: type');
    assert((svg.match(/<rect/g) || []).length >= 6 && svg.includes('主权算力') && svg.includes('+$2.0T'), 'waterfall: ≥6 柱(base+4step+total)+gain');
    assert(/fill="var\(--accent-hot,/.test(svg), 'waterfall: lead step 橙');
    // 实测 锁修：单位/负向(成本下降·$/kWh)——值标签须正确 unit + 符号·不出 +$-90.0T
    svg = renderChart({
      type: 'waterfall', theme: 'info-data', yMax: 300, valuePrefix: '$', unit: '/kWh', decimals: 0,
      base: { label: '2016', value: 290 }, steps: [{ label: '规模', value: -90, role: 'lead' }, { label: '化学', value: -55 }], total: { label: '2026', value: 145 },
    }, { width: 900, height: 300 });
    assert(svg.includes('−$90/kWh') && svg.includes('$290/kWh'), 'waterfall: 负向+单位标签正确(−$90/kWh·非 +$-90.0T)');
    assert(!svg.includes('$-') && !svg.includes('+$-'), 'waterfall: 不出错误负号格式');

    const vlong = [
      ['slope', { type: 'slope', theme: 'info-data', cols: ['A', 'B'], series: [{ name: 'x', from: 1, to: 99 }, { role: 'lead', name: 'y', from: 50, to: 2 }] }],
      ['dumbbell', { type: 'dumbbell', theme: 'info-data', xMax: 100, rows: [{ name: 'a', from: 1, to: 99, gain: '+98' }, { name: 'b', from: 50, to: 51, gain: '+1', role: 'lead' }] }],
      ['area-stack', { type: 'area-stack', theme: 'info-data', x: ['p0', 'p1', 'p2', 'p3', 'p4'], layers: [{ name: 'a', data: [90, 10, 50, 30, 5] }, { name: 'b', data: [10, 90, 50, 70, 95] }] }],
      ['waterfall', { type: 'waterfall', theme: 'info-data', yMax: 200, base: { label: 'b', value: 10 }, steps: [{ label: 's', value: 180, role: 'lead' }], total: { label: 't', value: 190 } }],
    ];
    for (const [nm, sp] of vlong) assert(!/NaN|Infinity/.test(renderChart(sp, { width: 900, height: 360 })), `${nm} 变长: 无 NaN/Infinity`);
    console.log('  ✓ info-data 增量2 四图（slope/dumbbell/area-stack/waterfall · 签名/结构/lead 强调/变长无 NaN）');
  }

  console.log('─'.repeat(56));
  console.log(`SELFTEST PASS · ${pass}/${types.length} 图（含 5b 新增 donut/stacked-bar/scatter/diverging-bar/funnel）` +
    ` + ${mustReject.length} 反例拒绝 + 示意降级 + 长标题折行 + ${epass} 边界健壮性 全部通过`);
}

// CLI 入口（仅 node 直跑时；浏览器/被 import 时不触发）。
const isMain = (() => {
  try {
    return typeof process !== 'undefined' && Array.isArray(process.argv) &&
      import.meta.url === `file://${process.argv[1]}` || (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop()));
  } catch { return false; }
})();

if (isMain && process.argv.includes('--selftest')) {
  try { selftest(); process.exit(0); }
  catch (e) { console.error('\n' + e.message + '\n' + (e.stack || '')); process.exit(1); }
}

// 供测试/文档引用导出样例与白名单。
export { SAMPLE_SPECS, WHITELIST, TOKENS };
