#!/usr/bin/env node
/* =====================================================================
 * image-gen.mjs — 生图环境探测 + 降级（zero-dependency · ESM）
 * ---------------------------------------------------------------------
 * 把「配图」从一句 prose 决策树落成真代码：探测当前机器有什么生图能力，
 * 报告该走哪条路；并提供两条「真能跑」的兜底通道（第三方 API / 开源图库）。
 *
 * 决策树（呼应 /goal 步6 配图流程）：
 *
 *   ┌─ 1. 原生生图（首选）────────────────────────────────────────┐
 *   │  环境装了「按名调用的生图能力」（imagegen / imagen 等 skill）。   │
 *   │  关键心智模型：它是 *skill*，不是能 `command -v` 到的二进制 →    │
 *   │  本脚本只负责探「它在不在」；真正的调用是 *agent 侧 try-and-catch*│
 *   │  （让 agent 直接按名调 imagegen，成功就用、抛错就降级）。       │
 *   │  → detect 报 recommendation: codex-native                      │
 *   └───────────────────────────────────────────────────────────────┘
 *   ┌─ 2. 第三方 API 后端（env 门控）─────────────────────────────┐
 *   │  只有「能用 HTTP 直连的第三方 API」才用 env 变量门控：           │
 *   │  IMAGE_BACKEND 选后端 + {PROVIDER}_API_KEY 提供 key。           │
 *   │  → detect 报 third-party:<backend>；generate 子命令真出图。     │
 *   └───────────────────────────────────────────────────────────────┘
 *   ┌─ 3. 降级（永远可用）────────────────────────────────────────┐
 *   │  上面都没有 → 三选一，全不依赖付费/外网 key：                   │
 *   │   ① 配 IMAGE_BACKEND=openai + OPENAI_API_KEY（走 generate）     │
 *   │   ② search 子命令取开源 CC0 图（Openverse·免 key·自动署名）     │
 *   │   ③ 走 CSS/SVG 签名图形（零依赖·永远可用·该人格 DNA）          │
 *   └───────────────────────────────────────────────────────────────┘
 *
 * ── 诚实边界（脚本探不到的，明确标注、绝不假装）──────────────────
 *   • MCP 生图 server：脚本探不到 agent 的 MCP 连接（那是 agent 进程的
 *     运行时状态，不落在文件系统 / env），故 detect 只标注「MCP 由 agent
 *     侧判断·脚本不探」，不报 true/false。
 *   • 原生 skill 能不能真出图：脚本只探「目录在不在」，真正的可用性 =
 *     agent 按名 try-and-catch 调用的结果（鉴权过期 / OAuth 额度 / API
 *     变更都可能让一个「存在」的 skill 调用失败）→ 由 agent 侧负责。
 *   • generate / search 失败：脚本如实把「文件名 + 用的 prompt + 错误」
 *     吐出来并 exit(1)，*绝不悄悄换 stock 图*（语义不同·是 slop 之源）；
 *     降不降级、降到哪，由调用方（agent / 用户）决定。
 *
 * 零第三方依赖：仅 Node 内置（node:fs / node:os / node:path）+ 全局 fetch
 *   （Node ≥ 18）。不向 package.json 加任何 dependency。
 *
 * 用法：
 *   node image-gen.mjs detect [--json]
 *   node image-gen.mjs generate <prompt> <out.png> [--size 1536x1024]
 *   node image-gen.mjs search   <query>  <out.png> [--json]
 *   node image-gen.mjs --help
 *
 * 退出码：成功 0；缺参 / 缺 env / 网络失败 / 无结果 → 1（调用方据此决定降级）。
 * ===================================================================== */

import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname, isAbsolute, resolve } from 'node:path';

/* ── 常量 ─────────────────────────────────────────────────────────── */

const CODEX_SKILLS_DIR = join(homedir(), '.codex', 'skills');
const CODEX_AUTH_PATH = join(homedir(), '.codex', 'auth.json');
// 原生生图 skill 的已知名字（按名调用·非二进制）。探到任一即视为「装了原生生图」。
const NATIVE_IMAGE_SKILLS = ['imagegen', 'imagen'];

// 第三方后端 → 它认哪些 env key（任一有值即视为已配 key）。
// 心智模型：只有「能 HTTP 直连的第三方 API」才进这张表并受 env 门控。
const BACKEND_KEY_ENV = {
  openai: ['OPENAI_API_KEY'],
  gemini: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
  stability: ['STABILITY_API_KEY'],
  fal: ['FAL_KEY'],
};
// v1 generate 子命令真正实现了出图的后端（其余后端 detect 认得、generate 暂未接）。
const GENERATE_IMPLEMENTED = new Set(['openai']);

const DEFAULT_SIZE = '1536x1024';

/* ── 小工具 ───────────────────────────────────────────────────────── */

function isDir(p) {
  try { return statSync(p).isDirectory(); } catch { return false; }
}

/** 解析 out 路径为绝对路径，并确保父目录存在（写盘前调用）。 */
function ensureParentDir(outPath) {
  const abs = isAbsolute(outPath) ? outPath : resolve(process.cwd(), outPath);
  mkdirSync(dirname(abs), { recursive: true });
  return abs;
}

/** 从 argv 里抽一个 `--flag value` 形式的命名参数（消费后从数组移除）。 */
function takeOption(args, name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const val = args[i + 1];
  args.splice(i, val === undefined ? 1 : 2);
  return val;
}

/** 从 argv 里抽一个布尔开关（消费后移除）。 */
function takeFlag(args, name) {
  const i = args.indexOf(name);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
}

function die(msg, code = 1) {
  process.stderr.write(msg.endsWith('\n') ? msg : msg + '\n');
  process.exit(code);
}

/* =====================================================================
 * detect — 探测当前生图环境，报告可用路径与建议
 * ===================================================================== */

/** 探原生生图 skill（按名调用·脚本只探存在性）。 */
function probeCodexNative() {
  if (!isDir(CODEX_SKILLS_DIR)) {
    return { available: false, skills: [], authMode: 'none' };
  }
  const found = NATIVE_IMAGE_SKILLS.filter((name) => isDir(join(CODEX_SKILLS_DIR, name)));
  let authMode = 'none';
  if (existsSync(CODEX_AUTH_PATH)) {
    try {
      const auth = JSON.parse(readFileSync(CODEX_AUTH_PATH, 'utf8'));
      // chatgpt = OAuth 登录（OPENAI_API_KEY 常为 null）；apikey = 直配 key；否则 none。
      if (auth && typeof auth.auth_mode === 'string') {
        authMode = auth.auth_mode; // 'chatgpt' | 'apikey' | ...
      } else if (auth && auth.OPENAI_API_KEY) {
        authMode = 'apikey';
      }
    } catch {
      authMode = 'unknown'; // auth.json 存在但解析失败：诚实标 unknown，不猜
    }
  }
  return { available: found.length > 0, skills: found, authMode };
}

/** 探第三方 API 后端（读 IMAGE_BACKEND + 对应 key 是否在 env）。 */
function probeThirdParty() {
  const backend = (process.env.IMAGE_BACKEND || '').trim().toLowerCase();
  if (!backend) {
    return { configured: false, backend: null, keyPresent: false, keyEnvNames: [], known: false };
  }
  const keyEnvNames = BACKEND_KEY_ENV[backend];
  const known = Array.isArray(keyEnvNames);
  const keyPresent = known && keyEnvNames.some((k) => !!(process.env[k] || '').trim());
  return {
    configured: true,
    backend,
    known,
    keyEnvNames: known ? keyEnvNames : [],
    keyPresent,
  };
}

function buildDetectReport() {
  const native = probeCodexNative();
  const thirdParty = probeThirdParty();

  // 推荐优先级：原生（首选·OAuth 免配） > 第三方（env 已配且 key 在） > none。
  let recommendation, message;
  if (native.available) {
    recommendation = 'codex-native';
    message =
      `检测到原生生图能力（skill: ${native.skills.join(', ')}；authMode: ${native.authMode}）。` +
      `agent 应直接按名调用 imagegen skill（try-and-catch：成功即用·抛错再降级）。` +
      `脚本只探到"它在"——能否真出图由 agent 侧调用结果决定。`;
  } else if (thirdParty.configured && thirdParty.known && thirdParty.keyPresent) {
    recommendation = `third-party:${thirdParty.backend}`;
    message =
      `检测到第三方后端 ${thirdParty.backend}（key 已配：${thirdParty.keyEnvNames.join(' / ')}）。` +
      `可用 generate 子命令出图` +
      (GENERATE_IMPLEMENTED.has(thirdParty.backend)
        ? `。`
        : `（注：v1 generate 暂只实现 openai 后端·${thirdParty.backend} 待接）。`);
  } else {
    recommendation = 'none';
    const why = [];
    if (thirdParty.configured && !thirdParty.known) {
      why.push(`IMAGE_BACKEND=${thirdParty.backend} 未识别（支持：${Object.keys(BACKEND_KEY_ENV).join(' / ')}）`);
    } else if (thirdParty.configured && thirdParty.known && !thirdParty.keyPresent) {
      why.push(`IMAGE_BACKEND=${thirdParty.backend} 已设但缺 key（需 env：${thirdParty.keyEnvNames.join(' / ')}）`);
    }
    const whyStr = why.length ? `（${why.join('；')}）` : '';
    message =
      `未检测到生图环境${whyStr}。三选一：` +
      `① 配 IMAGE_BACKEND=openai + OPENAI_API_KEY（再走 generate 子命令）` +
      `② 用 search 子命令取 CC0 开源图（Openverse·免 key·自动署名进 SOURCES.md）` +
      `③ 走 CSS/SVG 签名图形（零依赖·永远可用）。`;
  }

  return {
    recommendation,
    message,
    codexNative: {
      available: native.available,
      skills: native.skills,
      authMode: native.authMode,
    },
    thirdParty: {
      backendEnv: thirdParty.backend,
      recognized: thirdParty.known,
      keyEnvNames: thirdParty.keyEnvNames,
      keyPresent: thirdParty.keyPresent,
    },
    // 诚实边界：脚本探不到 agent 的 MCP 连接·不假装能探。
    mcp: {
      probed: false,
      note: 'MCP 生图 server 由 agent 侧判断·脚本不探（MCP 连接是 agent 运行时状态·不落文件/env）',
    },
  };
}

function cmdDetect(args) {
  const asJson = takeFlag(args, '--json');
  const report = buildDetectReport();

  if (asJson) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    return;
  }

  const lines = [];
  lines.push('生图环境探测（image-gen detect）');
  lines.push('─'.repeat(60));
  lines.push(`原生生图能力 : ${report.codexNative.available ? '✓ 在' : '✗ 不在'}` +
    (report.codexNative.available
      ? `  [skill: ${report.codexNative.skills.join(', ')} · authMode: ${report.codexNative.authMode}]`
      : ''));
  lines.push(`第三方后端   : ${report.thirdParty.backendEnv
    ? (report.thirdParty.recognized
        ? `${report.thirdParty.backendEnv}（key ${report.thirdParty.keyPresent ? '✓ 已配' : '✗ 缺'}：${report.thirdParty.keyEnvNames.join(' / ')}）`
        : `${report.thirdParty.backendEnv}（✗ 未识别后端）`)
    : '未设 IMAGE_BACKEND'}`);
  lines.push(`MCP 生图     : ${report.mcp.note}`);
  lines.push('─'.repeat(60));
  lines.push(`建议（recommendation）: ${report.recommendation}`);
  lines.push('');
  lines.push(report.message);
  process.stdout.write(lines.join('\n') + '\n');
}

/* =====================================================================
 * generate — 第三方 env-gated 出图（v1：OpenAI Images API）
 *   绝不静默失败·绝不自动转 stock（语义不同·slop 源）。
 * ===================================================================== */

function generateGuidance(extraReason) {
  const lines = [];
  if (extraReason) lines.push(extraReason, '');
  lines.push('generate 子命令需要「第三方 API 后端」（env 门控）。当前不可用。');
  lines.push('');
  lines.push('要用第三方出图，配齐两个环境变量后重试：');
  lines.push('  export IMAGE_BACKEND=openai');
  lines.push('  export OPENAI_API_KEY=sk-...        # 真实 API key（非 OAuth/ChatGPT 登录）');
  lines.push('  node image-gen.mjs generate "<prompt>" out.png --size 1536x1024');
  lines.push('');
  lines.push('支持的后端（detect 认得）：' + Object.keys(BACKEND_KEY_ENV).join(' / ') +
    `；其中 generate 当前实现：${[...GENERATE_IMPLEMENTED].join(' / ')}。`);
  lines.push('');
  lines.push('不想配 key？两条永远可用的降级路（自己选·脚本不替你决定）：');
  lines.push('  • node image-gen.mjs search "<query>" out.png   # 开源 CC0 图·免 key·自动署名');
  lines.push('  • 走 CSS/SVG 签名图形（零依赖·永远可用）');
  lines.push('');
  lines.push('注：原生生图（imagegen skill）走 agent 侧 try-and-catch 调用·不经本子命令。');
  return lines.join('\n');
}

async function generateOpenAI({ prompt, size, apiKey }) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size,
      n: 1,
      // gpt-image-1 默认即返回 b64_json；显式声明以兼容历史模型字段。
      response_format: 'b64_json',
    }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error?.message || JSON.stringify(body);
    } catch {
      try { detail = await res.text(); } catch { detail = '(无法读取响应体)'; }
    }
    throw new Error(`OpenAI Images API ${res.status} ${res.statusText} — ${detail}`);
  }

  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) {
    const url = data?.data?.[0]?.url;
    if (url) {
      // 某些账号/模型只回 url：拉回来写盘，仍是「真出图」而非 stock。
      const imgRes = await fetch(url);
      if (!imgRes.ok) throw new Error(`图片 URL 拉取失败：${imgRes.status} ${imgRes.statusText}`);
      return Buffer.from(await imgRes.arrayBuffer());
    }
    throw new Error('API 响应里既无 b64_json 也无 url，无法取图');
  }
  return Buffer.from(b64, 'base64');
}

async function cmdGenerate(args) {
  const size = takeOption(args, '--size') || DEFAULT_SIZE;
  const [prompt, outPath] = args;

  if (!prompt || !outPath) {
    die(
      '用法：node image-gen.mjs generate <prompt> <out.png> [--size 1536x1024]\n' +
      '缺少 ' + (!prompt ? '<prompt>' : '<out.png>') + '。\n\n' +
      generateGuidance()
    );
  }

  const tp = probeThirdParty();
  if (!tp.configured) {
    die(generateGuidance('未设 IMAGE_BACKEND——脚本不会自动出图，也绝不悄悄替换成图库图。'));
  }
  if (!tp.known) {
    die(generateGuidance(`IMAGE_BACKEND=${tp.backend} 未识别。`));
  }
  if (!tp.keyPresent) {
    die(generateGuidance(`IMAGE_BACKEND=${tp.backend} 已设·但缺 key（需 env：${tp.keyEnvNames.join(' / ')}）。`));
  }
  if (!GENERATE_IMPLEMENTED.has(tp.backend)) {
    die(generateGuidance(`IMAGE_BACKEND=${tp.backend} 的 generate 通道 v1 尚未实现（已实现：${[...GENERATE_IMPLEMENTED].join(' / ')}）。`));
  }

  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  let buf;
  try {
    buf = await generateOpenAI({ prompt, size, apiKey });
  } catch (err) {
    // 失败不静默吞：把文件名 + 用的 prompt + 错误如实吐出·让 agent 决定降级。
    die(
      '生图失败（generate · 未写盘）。\n' +
      `  目标文件 : ${outPath}\n` +
      `  后端     : ${tp.backend}\n` +
      `  尺寸     : ${size}\n` +
      `  prompt   : ${prompt}\n` +
      `  错误     : ${err && err.message ? err.message : String(err)}\n\n` +
      '脚本绝不自动转 stock 图（语义不同）。降级请改用 search 子命令或 CSS/SVG 签名图形。'
    );
  }

  const abs = ensureParentDir(outPath);
  writeFileSync(abs, buf);
  process.stdout.write(
    `已生成（generate · ${tp.backend}）\n` +
    `  文件   : ${abs}\n` +
    `  尺寸   : ${size}\n` +
    `  字节   : ${buf.length}\n` +
    `  prompt : ${prompt}\n`
  );
}

/* =====================================================================
 * search — 开源 CC0 图库兜底（Openverse·免 key·永远可用）
 *   失败/无结果 → 清晰报告 + exit(1)（让调用方降级到 SVG）。
 * ===================================================================== */

async function cmdSearch(args) {
  const asJson = takeFlag(args, '--json');
  const [query, outPath] = args;

  if (!query || !outPath) {
    die(
      '用法：node image-gen.mjs search <query> <out.png> [--json]\n' +
      '缺少 ' + (!query ? '<query>' : '<out.png>') + '。\n\n' +
      'search 调 Openverse API 取 CC0/公有领域图（免 key·永远可用），' +
      '下载到 <out.png> 并输出 source/creator/license（供写进 SOURCES.md 署名）。'
    );
  }

  // 只取 cc0 + pdm（公有领域标记）——确保可商用、署名友好、不踩授权雷。
  const api =
    'https://api.openverse.org/v1/images/' +
    `?q=${encodeURIComponent(query)}&license=cc0,pdm&page_size=5`;

  let meta;
  try {
    const res = await fetch(api, {
      headers: { 'User-Agent': 'blcaptain-ppt-skill/1.0 (+image-gen.mjs)', Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Openverse API ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    const hit = Array.isArray(data?.results) ? data.results[0] : null;
    if (!hit) {
      die(
        `Openverse 无结果（query: "${query}"）。\n` +
        '换个关键词重试·或降级走 CSS/SVG 签名图形（零依赖·永远可用）。'
      );
    }
    const imgUrl = hit.url; // 原图直链
    if (!imgUrl) throw new Error('命中结果缺图片 URL');

    const imgRes = await fetch(imgUrl, {
      headers: { 'User-Agent': 'blcaptain-ppt-skill/1.0 (+image-gen.mjs)' },
    });
    if (!imgRes.ok) throw new Error(`图片下载失败：${imgRes.status} ${imgRes.statusText}（${imgUrl}）`);
    const buf = Buffer.from(await imgRes.arrayBuffer());

    const abs = ensureParentDir(outPath);
    writeFileSync(abs, buf);

    meta = {
      file: abs,
      bytes: buf.length,
      title: hit.title || '(untitled)',
      creator: hit.creator || '(unknown)',
      license: `${(hit.license || '').toUpperCase()}${hit.license_version ? ' ' + hit.license_version : ''}`.trim(),
      licenseUrl: hit.license_url || '',
      source: hit.foreign_landing_url || hit.url || '',
      provider: hit.provider || hit.source || '',
      query,
    };
  } catch (err) {
    die(
      '开源图库取图失败（search · 未写盘）。\n' +
      `  query : ${query}\n` +
      `  错误  : ${err && err.message ? err.message : String(err)}\n\n` +
      '降级请走 CSS/SVG 签名图形（零依赖·永远可用）。'
    );
  }

  if (asJson) {
    process.stdout.write(JSON.stringify(meta, null, 2) + '\n');
    return;
  }

  process.stdout.write(
    `已下载开源图（search · Openverse）\n` +
    `  文件     : ${meta.file}\n` +
    `  字节     : ${meta.bytes}\n` +
    `  标题     : ${meta.title}\n` +
    `  作者     : ${meta.creator}\n` +
    `  许可证   : ${meta.license}${meta.licenseUrl ? '  ' + meta.licenseUrl : ''}\n` +
    `  来源页   : ${meta.source}\n` +
    `  提供方   : ${meta.provider}\n\n` +
    `署名（写进 SOURCES.md）：\n` +
    `  "${meta.title}" by ${meta.creator} — ${meta.license || 'CC0'}${meta.source ? ' · ' + meta.source : ''}\n`
  );
}

/* =====================================================================
 * --help
 * ===================================================================== */

function printHelp() {
  process.stdout.write(`image-gen.mjs — 生图环境探测 + 降级（零第三方依赖 · ESM）

把「配图」从 prose 决策树落成真代码：探当前机器有什么生图能力，报告走哪条路，
并提供两条真能跑的兜底通道（第三方 API / 开源 CC0 图库）。失败绝不静默换 stock。

决策树（三路 · 对齐 /goal 步6）：
  1. 原生生图（首选）  imagegen / imagen 等「按名调用的 skill」存在
     → agent 侧 try-and-catch 直接调用（脚本只探"在不在"·不替它调用）
  2. 第三方 API（门控）IMAGE_BACKEND + {PROVIDER}_API_KEY 都齐
     → generate 子命令真出图（v1：openai）
  3. 降级（永远可用）  ① 配 openai key 走 generate  ② search 取 CC0 开源图
     ③ CSS/SVG 签名图形（零依赖）

子命令：
  detect [--json]
      探测生图环境，报告 recommendation ∈ {codex-native, third-party:<backend>, none}
      + 人类可读指引。--json 给结构化输出。

  generate <prompt> <out.png> [--size ${DEFAULT_SIZE}]
      第三方 env-gated 出图（v1：OpenAI Images API · gpt-image-1）。
      缺 IMAGE_BACKEND / 缺 key / 失败 → 清晰指引 + exit(1)，绝不自动转 stock。
      需要：IMAGE_BACKEND=openai 且 OPENAI_API_KEY=<真实 key>（非 OAuth 登录）。

  search <query> <out.png> [--json]
      开源 CC0 图库兜底（Openverse API · 免 key · 永远可用）。取第一张 CC0/PDM
      图下载到 <out.png>，输出 source/creator/license 供写进 SOURCES.md 署名。
      无结果 / 失败 → 清晰报告 + exit(1)（降级走 CSS/SVG）。

环境变量：
  IMAGE_BACKEND          第三方后端：${Object.keys(BACKEND_KEY_ENV).join(' / ')}
  OPENAI_API_KEY         openai 后端的 key
  GEMINI_API_KEY / GOOGLE_API_KEY   gemini 后端的 key
  STABILITY_API_KEY      stability 后端的 key
  FAL_KEY                fal 后端的 key

诚实边界（脚本探不到 → 留给 agent 侧）：
  • MCP 生图 server 的连接：agent 运行时状态·不落文件/env·脚本不探。
  • 原生 skill 能否真出图：脚本只探目录存在；真可用性 = agent try-and-catch 调用结果。

退出码：成功 0；缺参 / 缺 env / 网络失败 / 无结果 → 1。
`);
}

/* =====================================================================
 * 入口
 * ===================================================================== */

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const rest = argv.slice(1);

  if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help') {
    printHelp();
    return;
  }

  switch (cmd) {
    case 'detect':
      cmdDetect(rest);
      return;
    case 'generate':
      await cmdGenerate(rest);
      return;
    case 'search':
      await cmdSearch(rest);
      return;
    default:
      die(`未知子命令：${cmd}\n\n运行 \`node image-gen.mjs --help\` 看用法。`);
  }
}

main().catch((err) => {
  // 兜底：任何未预期异常也给人类可读信息·非裸栈。
  die('未预期错误：' + (err && err.message ? err.message : String(err)) +
    '\n（这是脚本 bug·请带上面信息反馈。）');
});
