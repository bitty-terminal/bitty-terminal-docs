---
title: Image Protocol Decision
description: Decision record for the M1-33 image-protocol question - Sixel stays refused and a bounded iTerm2 inline-image subset was admitted through the demand-gated path
category: specifications
audience: contributor
document_type: register
status: draft
website_publish: false
sidebar_order: 40
---

# Image Protocol Decision

> Status: **draft decision record** — a recorded disposition, not an accepted
> contract. It resolves the M1-33 question (backlog item `M1-33`,
> [bitty#1159](https://github.com/bitty-terminal/bitty/issues/1159)) at the
> recommendation level only. The original disposition changes no accepted
> document, closes no open question, grants no capability, and weakens no
> normative security control.
> The accepted [Rich Presentation RFC](rich-presentation-rfc.md) image contract
> and its open point 2, the accepted
> [Compatibility Milestone RFC](compatibility-milestone-rfc.md) M1 scope, and
> the [Rich Content](../interfaces/rich-content.md) candidate contract remain
> authoritative until a reviewed revision says otherwise. The 2026-10-26
> admission record below records bounded implementation status; it grants no
> capability and claims no `Verified` or `Compatible` status.

## Purpose

This record answers whether the initial PTY image-protocol set admits iTerm2
inline images or Sixel, or keeps the explicit refusal already visible in the
implementation. It exists so the refusal is a recorded Bitty decision rather
than an inference from absent code. The original disposition kept both
refused or deferred; the admission record below supersedes the iTerm2
deferral for one bounded subset and leaves the Sixel refusal in place.

In scope: the PTY image protocols behind the accepted image contract — Kitty
Graphics, Sixel, and iTerm2 inline images — and their admission or deferral.
Out of scope: Kitty-family non-image extensions (pointer shapes, text sizing,
and file transfer, tracked by `OQ-077`); the image-store and placement ceilings;
and the animation lifecycle, all of which stay with the accepted RFC.

## Source identity

| Source                                                                                                            | Role                                                                             |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [Rich Presentation RFC](rich-presentation-rfc.md)                                                                 | Accepted image contract (OQ-008); open point 2 records the bounded iTerm2 subset |
| [Compatibility Milestone RFC](compatibility-milestone-rfc.md)                                                     | Accepted M1 matrix: Images are `Out of M1`, deferred to the image-protocol RFC   |
| [Rich Content](../interfaces/rich-content.md)                                                                     | Candidate rich-surface contract; records Sixel and iTerm2 as unimplemented       |
| [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md)                                                 | iTerm2 is `implemented-only (bounded subset)`; Sixel is `missing; refused`       |
| [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) | Cross-project governance, linked not copied; no dedicated image-scope OQ open    |

Implementation evidence, read-only from `bitty` `origin/main` `fce0c3b`
(2026-09-20), the historical baseline for this record:

- Kitty Graphics is the only image path implemented end to end: APC `G` intake,
  bounded PNG/RGB/RGBA decode, cursor-anchored placement, and the present-path
  blit (`crates/bitty-rich`, `crates/bitty-render`, `crates/bitty-runtime`).
- `bitty inspect protocol sixel` reports `unsupported` and states that Sixel
  sequences are ignored while text and fallbacks keep working
  (`crates/bitty-app/src/inspect.rs`).
- No iTerm2 inline-image parser or decoder existed at this pin; `ImageSource::Sixel`
  and `ImageSource::Iterm2` were data-model variants only
  (`crates/bitty-rich/src/image.rs`). Superseded for one bounded subset by the
  2026-10-26 admission record below; unchanged for Sixel.
- `TERM_PROGRAM=bitty` and the inherited `GHOSTTY_*`/`WEZTERM_*`/`KITTY_*`/
  `ITERM_*` fingerprint stripping keep term-DB probes from advertising graphics
  Bitty does not implement (`crates/bitty-pty/src/builder.rs`).

## Disposition

The disposition below is the 2026-09-20 recommendation. It remains the record
for Sixel. For iTerm2 it was superseded on 2026-10-26 by the admission record,
which took the demand-gated path under a new scoped task.

### Recommended disposition

**Keep the explicit refusal and deferral — Kitty-primary, with a demand-gated
admission path.** Bitty admitted Kitty Graphics as its only shipped image
protocol for the current milestone and recorded Sixel as refused and iTerm2
inline images as deferred, admitted only through a new scoped task that carries
protocol work, demand evidence, and a security review.

### Rationale

1. **No demand is demonstrated.** The
   [roadmap gap register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/roadmap/now-next-later.md)
   records non-Kitty images as "consider, do not chase without demand" and the
   Sixel row as an explicit unsupported stance matching Alacritty and Ghostty.
2. **Kitty already covers the primary use case.** The implemented path decodes
   PNG, raw RGB, and raw RGBA, which covers the `chafa`/`icat`-style producers
   the gap analysis names. Sixel and iTerm2 would add coverage, not a missing
   capability.
3. **Each adapter multiplies decoder attack surface.** Every new protocol
   adapter introduces another bounded decode path under `R-002`/`T-02`
   (compressed-graphics exhaustion). The accepted ceilings `IMG-1`..`IMG-9`
   bound one adapter today; a second and third decoder add review and fuzz cost
   with no release-gating benefit.
4. **M1 explicitly excludes images.** The
   [Compatibility Milestone RFC](compatibility-milestone-rfc.md) records Images
   as `Out of M1`, so no milestone gate is waiting on Sixel or iTerm2.

### What changes if adopted

- **As recommended (keep the refusal):** no runtime change. The
  [Rich Presentation RFC](rich-presentation-rfc.md) open point 2 resolves toward
  "deferred" through a reviewed RFC revision that moves Sixel and iTerm2 from
  the "initial candidate set" wording to a demand-gated, refused-by-default
  statement. The [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md)
  row keeps `missing; refused`, and `bitty inspect protocol` may add an explicit
  `iterm2` entry beside the existing `sixel` one. No accepted ceiling moves.
- **If instead admitted:** a new scoped task adds one bounded adapter per
  protocol (payload cap, dimension and allocation checks before decode,
  fail-closed malformed input), makes the `ImageSource` variant reachable, and
  lands negative tests plus a focused security review before any `Compatible`
  claim. Admission requires demonstrated demand and a protocol-work estimate,
  not convenience.

### Security and bounds

- All PTY image input stays untrusted until a bounded decode plus policy check
  succeeds (accepted image contract).
- The decompression-bomb defense stays before allocation: `IMG-1` compressed
  payload cap, `IMG-2` decoded dimensions, `IMG-3` decode peak memory, `IMG-4`
  aggregate store bytes, `IMG-5` image count, plus the animation ceilings
  `IMG-6`..`IMG-9`.
- File and shared-memory transports stay capability requests denied by default
  (`R-003`); a protocol adapter is not a file-access grant.
- The original disposition opens no parser path and no capability; the adapter
  recorded below is bounded code, not a new capability grant.

## Admission record (2026-10-26)

Status: **implemented-only, bounded subset.** This record supersedes the iTerm2
deferral in the disposition above. It follows the bounded-adapter requirements
of the "if instead admitted" path: the scoped Core task carried the protocol
work, the pre-decode bounds, the fail-closed malformed-input handling, and the
negative tests, and this docs task (CTX-1591) records the result. It admits
nothing beyond the adapter implemented at `19a50380` (CTX-1590,
[bitty#2217](https://github.com/bitty-terminal/bitty/issues/2217), 2026-10-26),
inspected read-only for this record; no merge or release state is asserted
here. It moves no accepted ceiling, closes no open question, and claims no
`Verified` or `Compatible` status. Sixel remains refused.

### What is admitted

`OSC 1337 ; File=` inline images with an explicit `inline=1` and a PNG payload
only. An admitted image is routed through the existing Kitty
store/placement/present seam as `f=100` PNG at the drained cursor with the
cursor held (`C=1`); per-origin store and placement quotas, alternate-screen
stashing, and the present blit budget apply unchanged. The adapter reuses that
seam rather than the `ImageSource::Iterm2` data-model variant, which stays
unreachable. The iTerm2 download form does not exist in Bitty: no protocol input
writes a file.

### Bounds

| Bound                              | Value                                                                                   |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| Base64 wire payload                | 4 MiB (`ITERM2_OSC_MAX_WIRE_BYTES`, IMG-1 parity)                                       |
| Decoded payload                    | 3 MiB (`ITERM2_OSC_MAX_DECODED_BYTES`)                                                  |
| Attribute header (`key=value;...`) | 4096 bytes (`ITERM2_OSC_MAX_ATTRIBUTE_BYTES`)                                           |
| Decoded `name=`                    | 256 bytes (`ITERM2_OSC_MAX_NAME_BYTES`); validated and dropped                          |
| Requested `width`/`height` span    | 4096 cells per axis (`ITERM2_OSC_MAX_CELL_SPAN`); `auto` or a cell count only           |
| PNG side                           | 8192 px (`ITERM2_DECODE_MAX_DIMENSION`)                                                 |
| PNG area                           | 4096 x 4096 px (`ITERM2_DECODE_MAX_PIXELS`)                                             |
| Format                             | PNG only; the signature and `IHDR` dimensions are checked before any decoder allocation |

The collected body cap is the header cap plus one separator byte plus the wire
cap; an over-cap body is dropped without further buffering and counted as
refused.

IMG-2 states `4096 x 4096` px. This adapter permits `8192` px per side within a
`4096 x 4096`-pixel area, the same relationship the Kitty path records as a
deviation from the IMG-2 wording in the [Rich Presentation RFC](rich-presentation-rfc.md#kitty-probe-and-alternate-screen-image-evidence);
the memory ceiling is unchanged, and aligning IMG-2 remains the owning RFC
revision's work.

### Fail-closed accounting

- Every parser refusal emits the inert `TerminalAction::Iterm2ImageRejected`
  action. Terminal state counts it in `iterm2_refused` and does nothing else:
  no store, no placement, no paint, no partial payload.
- The scanner releases the body buffer when the OSC terminates. A candidate
  whose prefix does not match is replayed byte-for-byte into `vte`, so every
  other OSC path is unchanged.
- An admitted image that the downstream seam cannot store or place fails closed
  and is logged; nothing is painted.

### Deliberately refused forms

- `inline=0`, and `OSC 1337 ; File=` with no `inline` attribute at all. The
  protocol default is `0` (the download form), so only an explicit `inline=1`
  paints; no file is written and no unreachable image is stored.
- `preserveAspectRatio=0` (stretch to the requested box): the shared placement
  seam letterboxes, so a distortion request cannot be honoured.
- `width`/`height` in `Npx` or `N%`: only `auto` and cell counts up to the
  4096-cell cap are admitted.
- Every non-PNG payload, including JPEG and GIF.
- `MultipartFile=`, `FilePart=`, and `FileEnd=` (the iTerm2 3.5 multipart
  transfer forms): not matched by the `File=` pre-scan, so they stay inert
  unknown OSC and never reach the image parser.
- Unknown, duplicate, or malformed attributes, invalid base64, and over-cap
  payloads.
- Sixel, unchanged: there is no parser path, and `bitty inspect protocol sixel`
  reports `unsupported`.

### Implementation evidence

- Parser and bounds: `crates/bitty-vt/src/iterm2_osc.rs`, wired in
  `crates/bitty-vt/src/parser.rs`; the constant names above are the code's own.
- Runtime routing and refusal logging: `crates/bitty-runtime/src/runtime/pty.rs`.
- Counter: `TelemetryCounters::iterm2_refused` in
  `crates/bitty-term-state/src/state.rs`.
- Capability wording: `bitty inspect protocol iterm2-inline-images` reports the
  bounded subset, the doctor image row names it beside `kitty-graphics`, and
  `sixel` stays `unsupported`.
- Tests: `crates/bitty-vt/src/iterm2_osc.rs` module tests;
  `crates/bitty-vt/src/parser/tests.rs::osc1337_refusals_are_counted_inert_actions`,
  `::osc1337_other_commands_stay_inert_unknown_osc`;
  `crates/bitty-term-state/src/state/tests.rs::iterm2_inline_image_is_inert_and_refusals_are_counted`;
  `crates/bitty-runtime/tests/iterm2_inline_images.rs` (admitted placement,
  auto sizing, split reads, oversize/format/transmit-only refusals, and Kitty
  coexistence).
- Live pixel evidence: none is recorded for this adapter. The commit adds
  headless tests only; no live-campaign paint result is claimed.

### Review gate

The admission is **subject to the focused security review recorded in the
task**; this record asserts no approval beyond that task record.

## Verification backlog

- The original disposition closed M1-33 as a recorded decision. The RFC open
  point is amended in the same docs task to record the admitted subset while the
  wider-surface question stays open; acceptance of that wording is subject to
  the architecture category owner and the security auditor per the
  [documentation workflow](../docs/development/documentation-workflow.md).
- Any future widening of the admitted iTerm2 subset, or any Sixel admission,
  starts from a new scoped task, not this record, and must cite the demand
  evidence, the protocol work, and the negative-test and security-review
  evidence in its own acceptance record.
