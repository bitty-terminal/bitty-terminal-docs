---
title: Ligature Decision
description: Decision record for the M1-22 and issue 1666 ligature question - adopted HarfBuzz-grade shaping via pure-Rust harfrust swash fontdb stack under CTX-0952
category: specifications
audience: contributor
document_type: register
status: accepted
website_publish: false
sidebar_order: 42
---

# Ligature Decision

## Document status

> Status: **accepted decision record**. It addresses the M1-22 question
> (backlog item `M1-22`, [bitty#1148](https://github.com/bitty-terminal/bitty/issues/1148)),
> the ligature question `OQ-073` (which is **Closed** by this decision),
> and the implementation landing in [bitty#1666](https://github.com/bitty-terminal/bitty/issues/1666)
> under Task `CTX-0952`.
> The accepted
> [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
> row for `OQ-073`, the
> [Text and Rendering RFC](text-rendering-rfc.md) shaping policy, and the
> [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md) row are
> synchronized by this change.

## Purpose and scope

This record answers the M1-22 question — adopt ligatures or record an explicit
refusal — with the accepted adoption recorded by governance for `OQ-073`.
Implementation observations remain `Implemented-only`; adoption does not
accept the whole Text and Rendering RFC or establish performance compliance.

In scope: whether Bitty forms ligatures in the rendered grid, and if so through
which shaping path, fallback interaction, and bounds. Out of scope: the
`Text and Rendering RFC` candidate shaper adoption (`harfbuzz` versus `swash`),
kerning arithmetic, color emoji, variable fonts, and the selection/caret mapping
across shaped glyphs tracked by `OQ-099`; this record cites those contracts and
does not redefine them.

## Source identity

| Source                                                                                                                       | Role                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)            | `OQ-073` Closed by this decision record and [bitty#1666](https://github.com/bitty-terminal/bitty/issues/1666)   |
| [Text and Rendering RFC](text-rendering-rfc.md)                                                                              | Draft RFC; § Shaping records the adopted pure-Rust `harfrust` stack and implementation bounds                   |
| [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md)                                                            | P1 row "Ligatures": `shipped` via [bitty#1666](https://github.com/bitty-terminal/bitty/issues/1666)             |
| [Rich Presentation RFC](rich-presentation-rfc.md)                                                                            | Accepted boundary: cursor and selection keep per-cluster granularity; presentation never changes terminal truth |
| [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) (`OQ-099`) | Open: logical-to-visual selection, hit-testing, and cluster/ligature/bidi snapping remain unresolved            |

Implementation evidence from `bitty` `a8abe148` (2026-10-05, CTX-0959 / PR [#1706](https://github.com/bitty-terminal/bitty/pull/1706)):

- Additive HarfBuzz-grade shaping stack implemented via pure-Rust `harfrust` + `swash` + `fontdb` (`bitty-render`, CTX-0957 PR [#1685](https://github.com/bitty-terminal/bitty/pull/1685)).
- Shaping runs on the terminal grid across contiguous script/style runs; multi-cell span rendering and ligature detection wired to the `wgpu` glyph atlas pipeline (CTX-0958 PR [#1690](https://github.com/bitty-terminal/bitty/pull/1690)).
- Phase C hardening (CTX-0959 PR [#1706](https://github.com/bitty-terminal/bitty/pull/1706)): partial-damage wide-span repaint via emitted-union backgrounds, multi-glyph-per-cluster grouping by `byte_offset`, GPOS mark offsets via `x_offset_px`, invisible-cell suppression, and 2048-slot atlas probe.
- Configuration surface (`bitty-config`): `font.features` (OpenType tags such as `calt`, `liga`, `ss01`) and `font.disable_ligatures` (`always`, `never`, `cursor` un-render under active cursor).

## Disposition

### Accepted disposition

**Adopted ligatures and complex text shaping via the pure-Rust `harfrust` stack.**
The earlier draft recommendation to refuse ligatures is superseded by the owner acceptance and delivery of [bitty#1666](https://github.com/bitty-terminal/bitty/issues/1666) (Task `CTX-0952`).

### Rationale

1. **User and parity requirement.** Programming ligatures (`->`, `!=`, `===`) and OpenType features are standard capabilities in modern terminal emulators (Ghostty, WezTerm, Kitty).
2. **Safe supply-chain invariant maintained.** By adopting `harfrust` (pure-Rust HarfBuzz port) instead of C-bindings (`harfbuzz-sys`), the workspace `#![forbid(unsafe_code)]` requirement remains 100% intact.
3. **Terminal truth preserved.** Shaping operates on the render path (`GridRenderer`). The underlying terminal grid (`Snapshot`) remains logical and unmutated. This does not resolve the selection and hit-testing mapping tracked by `OQ-099`.
4. **Performance budget remains unverified.** Bounded glyph spans and atlas staging are implementation bounds, not evidence of PB-6 compliance. The accepted [Performance Budget RFC](performance-budget-rfc.md#pb-6-throughput-floor) requires sustained VT parse-and-render throughput on one core of the slowest Tier 1 reference machine. This record supplies no matching named workload, hardware, source revision, raw result, or accepted measurement evidence.

### Security and bounds

- Shaping remains on the render path; untrusted PTY input is parsed by `vte` and stored in `bitty-term-state` before shaping runs.
- Bounds: bounded cluster runs, `MAX_SHAPED_GLYPHS_PER_RUN = 512`, and fail-closed handling on non-finite metrics or empty font chains.
- Configuration parsing strictly validates OpenType 4-character tag shapes and values.

## Resolution

This document, together with PR [#1685](https://github.com/bitty-terminal/bitty/pull/1685), PR [#1690](https://github.com/bitty-terminal/bitty/pull/1690), and PR [#1706](https://github.com/bitty-terminal/bitty/pull/1706), closes `OQ-073` and satisfies backlog item `M1-22`.

`OQ-099` remains open. The Text and Rendering RFC remains `draft`, and no
`Verified`, compatibility, performance, or P0 security acceptance follows
from this adoption record.

## References

- [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) — authority for `OQ-073` adoption and open `OQ-099`.
- [Text and Rendering RFC](text-rendering-rfc.md) — draft text contract and implementation observations.
- [Performance Budget RFC](performance-budget-rfc.md) — accepted measurement targets, including PB-6.
