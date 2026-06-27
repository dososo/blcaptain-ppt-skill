#!/usr/bin/env node
/**
 * ingest.mjs — 轻量内容摄取（把 URL / 本地文件 / 粘贴文本 → 干净正文，喂给 /goal 步1）
 *
 * 为什么有它：同类内容摄取工具普遍先解决「内容怎么进来」，
 *   而默认假设用户已有干净结构化内容，往往是整条链最薄弱处。
 *   本脚本补最小可用版：吃一个 URL 或文件，吐**轻量清洗后的正文文本**，AI（goal 步1）再 research-led 提炼成判断/页面节奏。
 *
 * 决策树位置：/goal 步1「内容优先 onboarding」——用户给 URL/文件时先 ingest 取正文，再五看三定。
 *
 * 诚实边界（守宪法）：
 *   - 这是**轻量抽取**（fetch + 去 script/style/nav/footer + 去标签 + 合并空白），不是完整 readability；
 *     残留导航/页脚噪声由 AI 在提炼时甩掉（AI 强语义·正好分工）。
 *   - **绝不绕付费墙**（绝不伪装 UA / 走镜像绕过——法律灰区 + 违诚信原则）：
 *     抓到登录墙/付费墙/空正文 → 如实报告，让用户**自己拷贝可见正文**粘贴进来。
 *   - **不伪造来源**：输出顶部如实标 `来源: <url|file>`，供写进 deck 的证据出处。
 *   - 零第三方依赖（只用 Node 内置 fetch / node:fs）。
 *
 * 用法：
 *   node ingest.mjs <url>                 # 抓网页正文
 *   node ingest.mjs <file.md|.txt|.html>  # 读本地文件
 *   cat article.txt | node ingest.mjs -   # 从 stdin 读（粘贴）
 *   node ingest.mjs <src> --json          # 结构化输出 {source,chars,text}
 */

import { readFileSync } from 'node:fs';

const UA = 'blcaptain-ppt-skill/1.0 (+content-ingest; respects-robots)';
const MAX = 200_000; // 正文上限（防超大页·deck 用不了那么多）

function die(msg) { process.stderr.write(msg + '\n'); process.exit(1); }

function help() {
  process.stdout.write(`ingest.mjs — 轻量内容摄取（URL/文件/粘贴 → 干净正文，喂 /goal 步1）

  node ingest.mjs <url>                 抓网页正文
  node ingest.mjs <file.md|.txt|.html>  读本地文件
  cat x.txt | node ingest.mjs -         从 stdin 读
  选项：--json 结构化输出

诚实边界：轻量抽取(非完整readability·AI 提炼时甩噪声)；绝不绕付费墙(撞墙→让用户自己粘正文)；不伪造来源(顶部标 来源)。
`);
}

/** 去掉脚本/样式/导航/页眉页脚/侧栏等非正文块，再去标签、解实体、合并空白 */
function htmlToText(html) {
  let s = html;
  // 去整块非正文容器
  s = s.replace(/<(script|style|noscript|svg|head|nav|header|footer|aside|form|iframe)\b[\s\S]*?<\/\1>/gi, ' ');
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  // 块级元素转换行（保段落感）
  s = s.replace(/<\/(p|div|section|article|h[1-6]|li|tr|br)\b[^>]*>/gi, '\n');
  s = s.replace(/<br\b[^>]*\/?>/gi, '\n');
  // 去剩余标签
  s = s.replace(/<[^>]+>/g, ' ');
  // 解常见 HTML 实体
  const ent = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&rsquo;': '’', '&ldquo;': '“', '&rdquo;': '”', '&mdash;': '—', '&hellip;': '…' };
  s = s.replace(/&[a-z#0-9]+;/gi, (m) => ent[m] ?? m);
  s = s.replace(/&#(\d+);/g, (_, n) => { try { return String.fromCodePoint(+n); } catch { return ''; } });
  // 合并空白：每行 trim、压多空行为一个
  s = s.split('\n').map((l) => l.replace(/[ \t ]+/g, ' ').trim()).filter(Boolean).join('\n');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

/** 取 <title> 作标题线索 */
function getTitle(html) {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

async function fromUrl(url) {
  let res;
  try {
    res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html,*/*' }, redirect: 'follow' });
  } catch (e) {
    die(`抓取失败：${e.message}\n网络不通 / 域名解析失败？换个源，或把正文直接粘进来：cat x.txt | node ingest.mjs -`);
  }
  if (!res.ok) {
    die(`抓取失败：HTTP ${res.status}${res.status === 401 || res.status === 403 ? '（疑似登录/付费墙）' : ''}\n` +
        `本脚本不绕墙（守诚信宪法）。请打开页面、手动拷贝可见正文，再：cat x.txt | node ingest.mjs -`);
  }
  const ct = res.headers.get('content-type') || '';
  const body = await res.text();
  if (/json|^application\/(?!xhtml)/.test(ct)) return { title: '', text: body.slice(0, MAX) }; // 非 HTML 原样给
  const text = htmlToText(body);
  if (text.replace(/\s/g, '').length < 80) {
    die(`抓到的正文几乎为空（${text.length} 字）——大概率是 JS 动态渲染页 / 登录墙。\n` +
        `本脚本不跑浏览器、不绕墙：请手动拷贝页面可见正文，再：cat x.txt | node ingest.mjs -`);
  }
  return { title: getTitle(body), text };
}

function fromFile(p) {
  let raw;
  try { raw = readFileSync(p, 'utf8'); } catch (e) { die(`读文件失败：${e.message}`); }
  if (/\.html?$/i.test(p)) return { title: getTitle(raw), text: htmlToText(raw) };
  return { title: '', text: raw.trim() }; // md/txt 原样（保留 markdown 结构给 AI）
}

async function fromStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return { title: '', text: Buffer.concat(chunks).toString('utf8').trim() };
}

// ---- main ----
const args = process.argv.slice(2);
if (!args.length || args.includes('--help') || args.includes('-h')) { help(); process.exit(0); }
const asJson = args.includes('--json');
const src = args.find((a) => a !== '--json');
if (!src) { help(); process.exit(1); }

let out, sourceLabel;
if (src === '-') { out = await fromStdin(); sourceLabel = '粘贴文本 (stdin)'; }
else if (/^https?:\/\//i.test(src)) { out = await fromUrl(src); sourceLabel = src; }
else { out = fromFile(src); sourceLabel = src; }

let text = (out.text || '').slice(0, MAX);
if (!text.replace(/\s/g, '')) die('正文为空——没抓到/读到内容。');

if (asJson) {
  process.stdout.write(JSON.stringify({ source: sourceLabel, title: out.title || null, chars: text.length, text }, null, 2) + '\n');
} else {
  process.stdout.write(`# 来源: ${sourceLabel}${out.title ? `\n# 标题线索: ${out.title}` : ''}\n# 字数: ${text.length}（轻量抽取·AI 提炼时甩导航/页脚噪声·守不伪造来源）\n\n${text}\n`);
}
