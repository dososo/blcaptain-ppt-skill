#!/usr/bin/env node
/* =====================================================================
 * make-preview.mjs — 由 deck（默认旗舰种子 deck-compute）生成 *-preview.html（手机竖排预览）
 * ---------------------------------------------------------------------
 * 中和 .stage 的 transform:scale，强制所有 .slide 竖排平铺展开、整体 zoom
 * 适配窄屏。仅供「手机滚动看全貌」用；预览里关闭动效（看静态版式）。
 * 真交付物始终是源 deck（如 deck-compute.html）—— 本文件只是审阅辅助产物。
 *
 * 注：背景用 var(--stage-void)（继承 deck :root 令牌），不写 raw-hex，
 *     以通过 validate-deck 的 raw-hex-outside-tokens 机检。
 *
 * 用法：node scripts/make-preview.mjs [deck-basename]
 *   默认 deck-compute（→ deck-compute-preview.html）。
 * ===================================================================== */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = (process.argv[2] || 'deck-compute').replace(/-preview$/, '').replace(/\.html$/, '');
const SRC = resolve(__dirname, `../templates/${BASE}.html`);
const OUT = resolve(__dirname, `../templates/${BASE}-preview.html`);

let s = readFileSync(SRC, 'utf8');

const mob = '<style id="mobile-preview">'
  + 'html,body{height:auto!important;max-height:none!important;overflow:auto!important;background:var(--stage-void)!important}'
  + '#deck{position:static!important;width:auto!important;height:auto!important;overflow:visible!important}'
  + '.stage{position:static!important;width:1280px!important;height:auto!important;transform:none!important;inset:auto!important;margin:0 auto!important}'
  + '.slide{position:relative!important;inset:auto!important;left:auto!important;top:auto!important;right:auto!important;bottom:auto!important;width:1280px!important;height:720px!important;margin:0 auto 16px auto!important;box-shadow:0 8px 40px rgba(0,0,0,.6)!important}'
  + '.slide,.slide *{opacity:1!important;visibility:visible!important}'
  + '.slide *{animation:none!important;transition:none!important;transform:none!important}'
  + '[class*="progress"],[class*="hint"],[class*="nav-"]{display:none!important}'
  + '</style>'
  + '<script>function fit(){if(!document.body)return;document.body.style.zoom=Math.min(1,innerWidth/1304);}addEventListener("resize",fit);addEventListener("load",fit);addEventListener("DOMContentLoaded",fit);fit();</script>';

s = s.replace('</head>', mob + '</head>');
writeFileSync(OUT, s, 'utf8');
console.log(`make-preview: ${BASE}-preview.html written`, (s.length / 1024).toFixed(0) + 'KB');
