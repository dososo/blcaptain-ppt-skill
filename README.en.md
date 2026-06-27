<div align="center">

# blcaptain-ppt-skill

Turn an idea / article / dataset into **single-file HTML presentations across 7 visual personas — where both taste and honesty are machine-enforced**

[中文](README.md) · **English**

[![License](https://img.shields.io/badge/license-personal%20free%20%C2%B7%20commercial-2E6FDB.svg)](LICENSE) ![Node](https://img.shields.io/badge/Node-%3E%3D18-3FD6C2.svg) ![Zero-dependency](https://img.shields.io/badge/deps-0%20npm-3FD6C2.svg) ![Agent Skill](https://img.shields.io/badge/Agent-Skill-2E6FDB.svg)

</div>

<img src="docs/gallery/hero-wall.jpg" width="100%" alt="blcaptain-ppt-skill — 7 visual personas, 20-page overviews" />

> **Install**: tell your agent (Codex / Claude Code / Cursor / Gemini CLI…) — "Install this Skill: `github.com/dososo/blcaptain-ppt-skill`"

Turn a goal / article / dataset into an opinionated, **single-file HTML presentation** — across 7 design-system-anchored visual personas, where **both good taste and honesty are machine-enforced**.

It is **intelligence-driven**: your AI agent reads the content, picks a persona (and tells you why), makes the judgment calls, then fills a validated layout — **the AI never free-styles a layout**, so output stability jumps. The point isn't "it can make a deck." It's that it **rules out the choices that turn ugly or dishonest** — type scale, whitespace, contrast thresholds, palette roles, anti-fabrication — all baked into code as constants and gates.

## What makes it different

1. **Machine-enforced taste OS** — WCAG contrast, a spacing scale, P0–P2 validation, and a 32-dimension audit, all codified. Not advice — it won't ship if it fails. This is the floor most tools lack.
2. **7 anchored personas, each with a soul** — Technical Sublime / Constructivism / Information Design / Luxury Minimalism / De Stijl / Editorial / Zen. Depth, not template count.
3. **Anti-fabrication, in writing and machine-checked** — never fakes data / logos / screenshots / sources; unverifiable numbers are marked "illustrative."
4. **Local font subsetting** — packed into the deck, never breaks offline or behind a firewall.
5. **Projection-readable dark mode** — an AAA contrast floor so a live audience can actually read it.
6. **Zero dependencies** — scripts use only Node built-ins; `git clone` and go.

## The 7 personas

- **Technical Sublime** — Vercel / Linear / Stripe engineered cool + an iso-compute contour signature. *Tech reports / compute / AI / systems.*
- **Constructivism** — Rodchenko / El Lissitzky red-square acts + asymmetric tension. *Manifestos / strong claims / calls to action.*
- **Information Design** — Tufte / FT / The Pudding chart grammar, data as argument. *Data / trends / reports.*
- **Luxury Minimalism** — Didone bare-color + whitespace-as-pricing. *Premium brand / judgment / product.*
- **De Stijl** — Mondrian / Vignelli geometric sans + muted primaries. *Standards / order / system frameworks.*
- **Editorial** — magazine editorial tradition + the only serif body of the seven. *In-depth industry analysis / long-form.*
- **Zen** — Zen × *In Praise of Shadows* × MUJI emptiness, dark-ink "second black." *Ideas / brand keynote.* (narrow persona: one image, one thought — not for data / pitches)

## Gallery · 7 personas × 20-page overviews

Each image is a 20-page render thumbnail of that persona (click to enlarge; open the matching `templates/deck-<persona>.html` to see it live):

<table>
<tr>
<td align="center" width="50%"><img src="docs/gallery/compute-overview-hd.png" width="100%" alt="Technical Sublime — 20-page overview"/><br/><b>Technical Sublime</b><br/><sub>Engineered cool + iso-compute contour signature · tech reports / compute / AI</sub></td>
<td align="center" width="50%"><img src="docs/gallery/constructivist-overview-hd.png" width="100%" alt="Constructivism — 20-page overview"/><br/><b>Constructivism</b><br/><sub>Red-square acts + asymmetric tension · manifestos / strong claims</sub></td>
</tr>
<tr>
<td align="center"><img src="docs/gallery/info-data-overview-hd.png" width="100%" alt="Information Design — 20-page overview"/><br/><b>Information Design</b><br/><sub>Tufte / FT / Pudding chart grammar · data / trends / reports</sub></td>
<td align="center"><img src="docs/gallery/luxury-overview-hd.png" width="100%" alt="Luxury Minimalism — 20-page overview"/><br/><b>Luxury Minimalism</b><br/><sub>Didone bare-color + whitespace-as-pricing · premium brand / judgment</sub></td>
</tr>
<tr>
<td align="center"><img src="docs/gallery/de-stijl-overview-hd.png" width="100%" alt="De Stijl — 20-page overview"/><br/><b>De Stijl</b><br/><sub>Mondrian / Vignelli muted primaries · standards / order / systems</sub></td>
<td align="center"><img src="docs/gallery/editorial-overview-hd.png" width="100%" alt="Editorial — 20-page overview"/><br/><b>Editorial</b><br/><sub>Magazine tradition + the only serif body of the seven · long-form analysis</sub></td>
</tr>
<tr>
<td align="center"><img src="docs/gallery/zen-overview-hd.png" width="100%" alt="Zen — 20-page overview"/><br/><b>Zen</b><br/><sub>Shadows × MUJI emptiness + dark-ink "second black" · ideas / brand keynote</sub></td>
<td align="center" valign="center"><sub>7 personas = 7 time-tested design systems,<br/>**not recolored templates**.<br/><br/>Each is 20 pages, all passing P0=0 machine checks.<br/>Full-resolution images in <a href="docs/gallery/">docs/gallery/</a>.</sub></td>
</tr>
</table>

## Install

```bash
git clone https://github.com/dososo/blcaptain-ppt-skill.git
# point your agent's skills dir at it, e.g. Codex:
# cp -R blcaptain-ppt-skill ~/.codex/skills/
```

Requires Node >= 18. **Zero npm dependencies.**

## Quickstart

Tell your agent: *"Use blcaptain to turn this into a deck: `<paste your content>`"*. It reads the content, picks a persona (and tells you why), asks at most 3 questions, then emits a single-file HTML deck plus a QA report. Validate any deck:

```bash
node scripts/validate-deck.mjs templates/deck-compute.html   # P0 must be 0
```

Open the `.html` in a browser to present, or `Ctrl+P` for a precise 16:9 PDF.

## Where images come from

Most "images" are CSS/SVG signature graphics (zero bitmap, zero dependency). For real bitmaps it first **detects your image-gen environment** (uses it if present, tells you clearly if not), or pulls from **Openverse CC0** with auto-attribution. **Never silently inserts generic stock; never fabricates screenshots.**

## Not for

Large data tables / training material · legal/medical/financial compliance docs · multi-author PPT editing · plain-text summaries · replicating a brand's official keynote · fabricating realistic-looking data. A tool that does everything usually does nothing well.

## License

Dual-license: free for personal & open-source use; closed-source / commercial use requires a paid license. The decks you generate are always yours. See [LICENSE](LICENSE). Contact: blteam2026@outlook.com
