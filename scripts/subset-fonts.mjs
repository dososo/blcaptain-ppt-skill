#!/usr/bin/env node
/* =====================================================================
 * subset-fonts.mjs — blcaptain deck 字体「生产步骤」（按内容子集化）
 * ---------------------------------------------------------------------
 * 答「任意用户内容如何 100% 覆盖」：每份 deck 生成时，把全部 CJK 字重
 *   从【完整源字体】按 deck 实际可见用字子集化 → deck 专属 woff2。
 *   覆盖 by construction（不共享、不固定字符集），再由 validate-deck.mjs
 *   的 font-coverage 门交付前独立复核。
 *
 * 分层（与 validator 各司其职）：
 *   - 本脚本 = build-time（开发机：需 pyftsubset/fontTools + 完整源字体缓存）。
 *   - validate-deck.mjs = 三端零依赖门（runtime 也可跑，只读 woff2 cmap 验证）。
 *
 * 完整源字体（不入 repo·开发机缓存一次）：放 $BLCAPTAIN_FONT_SRC（默认 ~/.cache/blcaptain-fonts）。
 *   需要：GlowSansSC-Normal-Regular.otf / -Normal-Medium.otf / -Compressed-ExtraBold.otf / SmileySans-Oblique.ttf
 *   来源：welai/glow-sans v0.93（Normal/Compressed 包）· atelier-anchor/smiley-sans（得意黑）。均 OFL。
 *
 * 用法：
 *   node scripts/subset-fonts.mjs templates/deck-constructivist.html   # 子集化该 deck 的字体
 *   node scripts/subset-fonts.mjs <deck.html> --check                  # 只报需子集的字体 + 缺源，不写盘
 *   BLCAPTAIN_FONT_SRC=/path/to/src node scripts/subset-fonts.mjs <deck.html>
 *
 * 退出码：成功 0；全部所需源缺失 / pyftsubset 失败 → 1（CI/Skill 据此阻断）。
 *   部分源缺失 → 跳过缺源字体、续子集其余（exit 0·fail-soft）；
 *   安全性由 validate-deck 的 font-coverage 门独立兜底（被跳过字体若漏字 → P0）。
 * ===================================================================== */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { argv, exit, env } from 'node:process';

/* —— 配置：输出 woff2 名 → 完整源 otf/ttf + 子集策略 ——
   新增字体在此登记即可（系统化·非为单 deck 写死）。Geist/GeistMono 是拉丁可变轴、
   全字打包不子集，故不在此表（脚本只子集需要按内容裁剪的 CJK 字体）。 */
const FONT_SOURCES = {
  'GlowSansSC-Regular.constr.woff2':            { src: 'GlowSansSC-Normal-Regular.otf' },
  'GlowSansSC-Medium.constr.woff2':             { src: 'GlowSansSC-Normal-Medium.otf' },
  'GlowSansSC-Compressed-ExtraBold.subset.woff2': { src: 'GlowSansSC-Compressed-ExtraBold.otf' },
  'SmileySans-Oblique.subset.woff2':            { src: 'SmileySans-Oblique.ttf' },
  // 第三人格 信息·数据设计 专属子集（per-deck）
  'GlowSansSC-Regular.info.woff2':              { src: 'GlowSansSC-Normal-Regular.otf' },
  'GlowSansSC-Medium.info.woff2':               { src: 'GlowSansSC-Normal-Medium.otf' },
  // 实测 样例 deck-ev-battery 专属子集（per-deck·info-data 人格·EV×电池域·勿与 .info 共享否则互相覆写漏字）
  'GlowSansSC-Regular.ev.woff2':                { src: 'GlowSansSC-Normal-Regular.otf' },
  'GlowSansSC-Medium.ev.woff2':                 { src: 'GlowSansSC-Normal-Medium.otf' },
  // 旗舰 deck-compute 字体（裸名·原非托管固定子集→纳入 subset 机制；仅 compute 家族引用，按内容子集补字）
  'GlowSansSC-Regular.woff2':                   { src: 'GlowSansSC-Normal-Regular.otf' },
  'GlowSansSC-Medium.woff2':                    { src: 'GlowSansSC-Normal-Medium.otf' },
  // 第四人格 时尚奢侈极简 — 字体生产说明（设计决策 · 实现期 架构修正）
  // ─────────────────────────────────────────────────────────────────────
  // ★ Playfair Display（西文 Didone 薄纱）= 拉丁字体，【不进此表】，走 Geist 模式：
  //   ./fonts/PlayfairDisplay.luxury.woff2 由 pyftsubset --unicodes='*' 全字打包，
  //   deck @font-face 直接引用该文件——不经 subset-fonts CJK 子集流程。
  //   原因：subset-fonts 只按 deck CJK 用字（isCjkish）子集；Playfair 无任何 CJK 字形，
  //   进表后 CJK-only 子集会产出零字形 woff2（cmap 空表），拉丁字形全丢，薄纱大词全回退
  //   系统字体，人格显形锚崩（实测坐实：CJK 子集后 cmap_size=0，has_R/E/S=False）。
  //   拉丁字体（Geist / Playfair）一律 ./fonts/ 全字 woff2 直引，不走 CJK 子集表。
  // ⚠ 源须是 wght=400 静态实例（非可变字体·仍有效）：
  //   上游 google/fonts 仅发可变 PlayfairDisplay[wght].ttf，须先实例化：
  //   python3 -m fontTools.varLib.instancer PlayfairDisplay[wght].ttf wght=400 -o PlayfairDisplay-Regular.ttf
  //   验证：from fontTools.ttLib import TTFont; 'fvar' not in TTFont('PlayfairDisplay-Regular.ttf') → True
  //   自动化（instance 字段·子集前自动实例化）留 follow-up。
  // ─────────────────────────────────────────────────────────────────────
  // 中文静默走 Glow（CJK·per-deck .luxury 子集·正确走此表）
  'GlowSansSC-Regular.luxury.woff2':            { src: 'GlowSansSC-Normal-Regular.otf' },
  // 第五人格 De Stijl 新造型主义 — 字体生产说明（设计决策 · 实现期）
  // ─────────────────────────────────────────────────────────────────────
  // ★ Space Grotesk（西文几何无衬线·全大写标题）= 拉丁字体，【不进此表】，走 Geist/Playfair 模式：
  //   ./fonts/SpaceGrotesk.de-stijl.woff2 由 pyftsubset --unicodes='*' 全字打包，
  //   deck @font-face 直接引用该文件——不经 subset-fonts CJK 子集流程。
  //   完整源：~/.cache/blcaptain-fonts/SpaceGrotesk-Variable.ttf（OFL·floriankarsten/space-grotesk v2.0.0）
  //   全字打包命令：pyftsubset SpaceGrotesk-Variable.ttf --unicodes='*' --flavor=woff2
  //     --layout-features='*' --output-file=templates/fonts/SpaceGrotesk.de-stijl.woff2
  // ─────────────────────────────────────────────────────────────────────
  // 中文静默走 Glow（CJK·per-deck .de-stijl 子集·正确走此表）
  // 仅 Regular（400）一个面：deck 强调走颜色/留白/字号·非字重（守 De Stijl 字体克制·无 Medium 面·防 faux-bold）。
  'GlowSansSC-Regular.de-stijl.woff2':          { src: 'GlowSansSC-Normal-Regular.otf' },
  // 第六人格 编辑主义 Editorial — 字体生产说明（设计决策 · 实现期）
  // ─────────────────────────────────────────────────────────────────────
  // ★ Source Serif 4 SmText（拉丁衬线正文·命根·Text 光学刻字）= 拉丁字体，【不进此表】，走全字打包模式：
  //   ./fonts/SourceSerif4SmText-Regular.editorial.woff2 / SourceSerif4SmText-Semibold.editorial.woff2
  //   由 pyftsubset --unicodes='*' 全字打包，deck @font-face 直接引用——不经 CJK 子集流程。
  //   ⚠ 进表后 CJK-only 子集会产出零字形 woff2（cmap_size=0），拉丁字形全丢，衬线命根崩
  //   （同 Playfair/SpaceGrotesk 教训）。
  //   完整源（已缓存）：
  //     ~/.cache/blcaptain-fonts/SourceSerif4SmText-Regular.ttf（256KB）
  //     ~/.cache/blcaptain-fonts/SourceSerif4SmText-Semibold.ttf（263KB）
  //   来源：adobe-fonts/source-serif release 4.005R（Desktop zip·OFL）。
  //   全字打包命令：
  //     pyftsubset SourceSerif4SmText-Regular.ttf --unicodes='*' --flavor=woff2
  //       --layout-features='*' --output-file=templates/fonts/SourceSerif4SmText-Regular.editorial.woff2
  //     pyftsubset SourceSerif4SmText-Semibold.ttf --unicodes='*' --flavor=woff2
  //       --layout-features='*' --output-file=templates/fonts/SourceSerif4SmText-Semibold.editorial.woff2
  // ─────────────────────────────────────────────────────────────────────
  // ★ Libre Franklin（数据/标签无衬线·杂志「衬线叙事+无衬线标数据」分工）= 拉丁字体，【不进此表】，走全字打包模式：
  //   ./fonts/LibreFranklin.editorial.woff2 由 pyftsubset --unicodes='*' 全字打包，
  //   deck @font-face 直接引用——不经 CJK 子集流程（同上理由）。
  //   完整源（已缓存）：~/.cache/blcaptain-fonts/LibreFranklin-Variable.ttf（183KB）
  //   来源：google/fonts main ofl/librefranklin（OFL·可变轴 wght）。
  //   全字打包命令：
  //     pyftsubset LibreFranklin-Variable.ttf --unicodes='*' --flavor=woff2
  //       --layout-features='*' --output-file=templates/fonts/LibreFranklin.editorial.woff2
  // ─────────────────────────────────────────────────────────────────────
  // 中文宋体走思源宋体 SC（CJK·per-deck .editorial 子集·正确走此表）
  // Regular（400）+ Medium（500）两面：正文宋体叙事·不上粗字重（守编辑主义克制·防 faux-bold）。
  'SourceHanSerifSC-Regular.editorial.woff2':    { src: 'SourceHanSerifSC-Regular.otf' },
  'SourceHanSerifSC-Medium.editorial.woff2':     { src: 'SourceHanSerifSC-Medium.otf' },
  // 第七人格 演示禅×阴翳×MUJI空「空的信念」— 字体生产说明（设计决策 · 实现期）
  // ─────────────────────────────────────────────────────────────────────
  // ★ Source Sans 3（拉丁 refined humanist sans·数据/标签/拉丁词）= 拉丁字体，【不进此表】，走全字打包模式：
  //   ./fonts/SourceSans3.zen.woff2 由 pyftsubset --unicodes='*' 全字打包，
  //   deck @font-face 直接引用——不经 CJK 子集流程（同 Playfair/SpaceGrotesk/SourceSerif4 先例·
  //   设计决策/设计决策/设计决策：进表后 CJK-only 子集产零字形 woff2，拉丁字形全丢，命根崩）。
  //   选型：Source Sans 3 = Adobe 与思源黑体（Source Han Sans）严格同源族——同一设计语言的拉丁/CJK 配套，
  //   humanist neutral·MUJI 调·区隔 info-data 的 humanist sans（靠暗墨气质 + 用法 + 日系字面，见 设计规范）。
  //   字体族上限：CJK 思源黑体 + Latin Source Sans 3 = 2 ≤ 3（守族上限）。
  //   ⚠ 不复用已打包的 ./fonts/SourceSans3.subset.woff2（那是别 deck 的内容子集·149 字形·zen 复用会漏字）——
  //     拉丁面必须 zen 专属全字打包（设计决策 军规）。
  //   完整源（OFL 1.1·待补缓存·adobe-fonts/source-sans release 3.052·静态 OTF）：
  //     ~/.cache/blcaptain-fonts/SourceSans3-Regular.otf
  //   全字打包命令：
  //     pyftsubset SourceSans3-Regular.otf --unicodes='*' --flavor=woff2
  //       --layout-features='*' --output-file=templates/fonts/SourceSans3.zen.woff2
  // ─────────────────────────────────────────────────────────────────────
  // 中文走思源黑体 SC（Source Han Sans·CJK·per-deck .zen 子集·正确走此表·OFL 1.1）
  // Regular（400）+ Medium（500）两真面：强调走真 Medium 面（中文永不合成 700·继承 ds-cjk-no-faux-bold·设计规范）。
  // ⚠ 完整源待补缓存（adobe-fonts/source-han-sans release 2.005R·SC 语言专属 OTF·OFL 1.1）：
  //     ~/.cache/blcaptain-fonts/SourceHanSansSC-Regular.otf
  //     ~/.cache/blcaptain-fonts/SourceHanSansSC-Medium.otf
  // Light（300）大号 display 标题专属真面（封面一念非强调 / statement 信念句·恢复演示禅「空·轻」·巨号下 400 偏重失空灵）。
  'SourceHanSansSC-Light.zen.woff2':             { src: 'SourceHanSansSC-Light.otf' },
  'SourceHanSansSC-Regular.zen.woff2':           { src: 'SourceHanSansSC-Regular.otf' },
  'SourceHanSansSC-Medium.zen.woff2':            { src: 'SourceHanSansSC-Medium.otf' },
};

// CJK-ish 码点（与 validate-deck.mjs 的 font-coverage 门口径 1:1，避免门/产两套标准）
function isCjkish(o) {
  return (o >= 0x3000 && o <= 0x303F) || (o >= 0x3400 && o <= 0x4DBF) ||
         (o >= 0x4E00 && o <= 0x9FFF) || (o >= 0xF900 && o <= 0xFAFF) ||
         (o >= 0xFF00 && o <= 0xFFEF) ||
         [0x00B7, 0x00D7, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022,
          0x2026, 0x2190, 0x2191, 0x2192, 0x2193, 0x2032, 0x2033, 0x00B0, 0x2103].includes(o);
}
// 去标签/注释，只留可见渲染文本（与门同口径：CSS/JS 注释中文不算用字）
const stripForText = (s) =>
  s.replace(/<!--[\s\S]*?-->/g, ' ')
   .replace(/<script[\s\S]*?<\/script>/gi, ' ')
   .replace(/<style[\s\S]*?<\/style>/gi, ' ')
   .replace(/<[^>]+>/g, ' ');

const args = argv.slice(2);
const checkOnly = args.includes('--check');
const file = args.find((a) => !a.startsWith('--'));
if (!file) { console.error('用法: node scripts/subset-fonts.mjs <deck.html> [--check]'); exit(2); }

const html = readFileSync(file, 'utf8');
const deckDir = dirname(file);
const fontsDir = join(deckDir, 'fonts');
const srcDir = env.BLCAPTAIN_FONT_SRC || join(homedir(), '.cache', 'blcaptain-fonts');

// 1. 提取 deck 可见文本的 CJK 用字（覆盖目标）
const chars = new Set();
for (const ch of stripForText(html)) { const o = ch.codePointAt(0); if (isCjkish(o)) chars.add(ch); }
const charText = [...chars].join('');
console.log(`deck 可见 CJK 用字：${chars.size} 个`);

// 2. 解析 @font-face 用到的本地 woff2（只子集 FONT_SOURCES 登记的 CJK 字体）
const woff2Used = new Set();
let mm; const faceRe = /@font-face\s*\{[^}]*\}/gi;
while ((mm = faceRe.exec(html)) !== null) {
  const u = /url\(\s*["']?\.\/fonts\/([^"')]+\.woff2)["']?\s*\)/i.exec(mm[0]);
  if (u && FONT_SOURCES[u[1]]) woff2Used.add(u[1]);
}
if (!woff2Used.size) { console.log('该 deck 无需子集的 CJK 字体（仅拉丁可变轴/无 @font-face）。'); exit(0); }

// 3. 校验完整源：缺源字体跳过、续子集源齐备的其余（fail-soft）。
//    安全性由 validate-deck 的 font-coverage 门独立兜底——被跳过字体若漏字，门报 P0 阻断。
//    全部所需源均缺失才 fail-loud（无字体可产）。
const missingSrc = [...woff2Used].filter((w) => !existsSync(join(srcDir, FONT_SOURCES[w].src)));
if (missingSrc.length) {
  console.error(`\n⚠ 完整源字体缺失（在 ${srcDir}）→ 跳过这些字体、续子集其余：`);
  for (const w of missingSrc) {
    console.error(`    跳过 ${w}（缺源 ${FONT_SOURCES[w].src}·其子集不更新）`);
    woff2Used.delete(w);
  }
  console.error(`  ⚠ font-coverage 门将独立复核：被跳过字体若有漏字，validate-deck 报 P0 阻断。`);
  console.error(`  补全源（开发机一次性，有网络）：OFL 完整源 → $BLCAPTAIN_FONT_SRC：`);
  console.error(`    • Glow Sans SC Normal/Compressed：github.com/welai/glow-sans v0.93`);
  console.error(`    • 得意黑 Smiley Sans：github.com/atelier-anchor/smiley-sans`);
  if (!woff2Used.size) {
    console.error(`\n✗ 全部所需源均缺失 → 无字体可子集。补源后重跑。`);
    exit(1);
  }
}

if (checkOnly) {
  console.log(`\n--check：需子集 ${woff2Used.size} 个字体（源齐备）：`);
  for (const w of woff2Used) console.log(`    ${FONT_SOURCES[w].src} → ${w}`);
  console.log('（未写盘）'); exit(0);
}

// 4. 子集化：每个 woff2 从完整源按 deck 用字裁剪
if (!existsSync(fontsDir)) mkdirSync(fontsDir, { recursive: true });
const charFile = join(deckDir, '.subset-chars.tmp');
writeFileSync(charFile, charText);
let failed = 0;
for (const w of woff2Used) {
  const src = join(srcDir, FONT_SOURCES[w].src);
  const out = join(fontsDir, w);
  try {
    execFileSync('pyftsubset', [
      src, `--text-file=${charFile}`, '--flavor=woff2', '--layout-features=*', `--output-file=${out}`,
    ], { stdio: ['ignore', 'ignore', 'inherit'] });
    console.log(`  ✓ ${w}`);
  } catch (e) {
    console.error(`  ✗ ${w}：pyftsubset 失败（确认已 pip install fonttools brotli）`);
    failed++;
  }
}
try { execFileSync('rm', ['-f', charFile]); } catch {}

if (failed) { console.error(`\n${failed} 个字体子集失败。`); exit(1); }
console.log(`\n✓ ${woff2Used.size} 个字体已按 deck 内容子集化 → ${fontsDir}`);
console.log(`  复核：node scripts/validate-deck.mjs ${file}  （font-coverage 应 0 缺）`);
