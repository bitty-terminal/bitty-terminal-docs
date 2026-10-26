---
title: Temporal Input Feedback (Candidate)
description: Candidate decision for legible bounded presentation-only feedback on typing submit mode-change panel-action and command-lifecycle boundaries without adding input latency
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 84
---

# Temporal Input Feedback (Candidate)

## Document status

> Status: **draft candidate** — not **Accepted**, **Verified**, **Implemented**,
> **Compatible**, or normative. It records the direction bitty#2220 asks for:
> input actions legible in time without delaying the PTY, reordering bytes, or
> weakening an accepted control. It authorizes no implementation and claims no
> behavior below exists.
>
> Revision note (2026-10-27): resolves the docs-review must-fix contradictions on
> the phase model, ack-versus-echo ordering, budget consistency, the default
> indicator, the plugin read-path dependency, key repeat, labels, and
> announcements. Still draft.
>
> `OQ-UX-TEMPORAL-INPUT` has no registered definition. This record defers it to
> the `bitty-docs` open-question register if the owner wants it tracked; it
> neither defines nor closes the identifier.

Owner: input and presentation surfaces (CTX-0156); issue:
[bitty#2220](https://github.com/bitty-terminal/bitty/issues/2220).
Implementation: none — no feedback state surface, indicator module, or feedback
transition leaf exists. Promotion gate: owner answers `T-01`..`T-06` (or records
the fail-safe defaults), independent review, then `status: accepted`.

## Purpose and scope

Bitty presents typing, Enter/submit, mode changes, and panel-action starts as
instantaneous transitions: bytes arrive, the screen updates, no boundary is
perceptible. That is fast but ambiguous — the user cannot tell whether a command
was handed to the shell, whether a user mode is active, or whether a multi-second
action started or stalled. Copy mode is one case: its state is a runtime log line
rather than a composited indicator per the
[Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md). The goal is
**legibility without added input latency**, delivered in two independent
channels: a **state channel** that always exists, changes discretely, and needs
no animation, timer, or indicator; and a **motion channel** that is optional,
bounded, cancellable, and pure presentation.

In scope: action classes and feedback windows, the phase model, timing budgets,
surface ownership, the indicator contract, accessibility and preferences,
performance and idle rules, `T-01`..`T-06`, and the bitty#2220 acceptance
mapping. Out of scope and owned elsewhere: the accepted transition set and
duration grammar
([RFC-0002](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md)),
PTY ordering and encoding ([Input and Pointer Contract](input-pointer-rfc.md)),
terminal state and damage ([Terminal State RFC](terminal-state-rfc.md)), shell
integration mechanics, audio and haptics, and any per-frame plugin API. Contour's
public documentation is a **product-direction reference only**; this record
claims nothing about its internals.

## Normative sources this specification must not weaken

| Source                                                                                                                                                                                                                         | What it binds here                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Panel Animations and Effects RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md) (accepted)                                                                         | `0..=500` ms durations, closed easing set, `enabled = false`, reduced motion, `--safe` collapse, no loops, and no interpolation of terminal content, cursor, selection, or scrollback |
| [Performance Budget RFC](performance-budget-rfc.md) (accepted)                                                                                                                                                                 | PB-4 key-to-screen `≤8 ms p50`/`≤15 ms p99`, PB-7 idle CPU and zero Bitty-attributable periodic wakeups, PB-5 package size for added code                                             |
| [Input and Pointer Contract](input-pointer-rfc.md) (draft)                                                                                                                                                                     | Synchronous plugin-free hot path `Platform → Router → Keymap → Encoder → PTY`; only encoder bytes mutate terminal state                                                               |
| [Terminal State RFC](terminal-state-rfc.md) (accepted)                                                                                                                                                                         | Parser-to-action-to-state is the only write path; parser-driven modes are terminal state, never feedback labels                                                                       |
| [Text and Rendering RFC](text-rendering-rfc.md) (draft)                                                                                                                                                                        | Damage-driven frame work; a chrome-only change rebuilds no snapshot; the PB-4/PB-7 reconciliation applies                                                                             |
| [Status System Specification](status-system.md) (draft)                                                                                                                                                                        | Bar composition and module ownership; `--safe` loads no optional status or bar replacement and draws no Core strip; ADR 0014 keeps presentation plugin-only                           |
| [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md) (draft)                                                                                                                                            | Chrome never enters the hot path; `statusline` is not a slot; the future `StatusProvider` interface, version, and filtering protocol stay open                                        |
| [Accessibility Extraction Contract](accessibility-extraction-contract.md) (accepted)                                                                                                                                           | Core-owned reduced-motion and high-contrast composition; transition-only, rate-limited announcements; only a headless backend exists today                                            |
| [Theme Token Contract (Candidate)](theme-token-contract-candidate.md) (draft) and [Appearance RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0001-appearance-configuration.md) (accepted) | The contrast obligations `AC-1`..`AC-3` and their token resolution apply to any feedback styling; a plugin cannot self-certify contrast                                               |
| [Default Distribution RFC](default-distribution-rfc.md) (accepted)                                                                                                                                                             | The bundled catalog is `bitty-terminal.shell-integration` only and is bundled-disabled; `bitty --safe` loads zero plugins                                                             |
| [Core and Plugin Boundaries](../architecture/core-boundaries.md) (accepted), [ADR 0014](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md)            | Mechanism versus policy, no plugin on terminal/render/input hot paths; workspace and status presentation stay plugin-only                                                             |
| [Documentation workflow](../docs/development/documentation-workflow.md) (normative)                                                                                                                                            | Frontmatter, status meanings, English-only text, self-containment, and review ownership                                                                                               |

Two accepted sources fix the hard part: feedback may interpolate **Core-owned
chrome only**, and a new transition leaf is a reviewed extension of RFC-0002,
not runtime registration. Motion therefore optimizes an already legible state;
it never carries the state.

## Terminology

An **action class** is a closed category of user action with one feedback window.
An **observation state** is a resting phase with defined exit events: it holds no
timer and renders no frames while unchanged. The **committed state** is the final,
already-correct presentation that exists with or without motion. **Minimum
visible** is the shortest time a progress indicator stays presented once shown. A
**command boundary** is an explicit signal that a command started or finished. A
**mode** here is a Core user mode (scrollback copy/selection, the search overlay);
parser-driven terminal modes such as `DECCKM`, mouse capture, alternate screen, or
bracketed paste are terminal state and never receive a feedback label.

## Principles

1. **PTY delivery and terminal semantics are never delayed.** The encoder and
   write keep their ordering and latency; feedback publishes after the write and
   is never awaited by the input thread.
2. **Feedback is presentation-only.** It never mutates Terminal Truth and never
   interpolates terminal content, cursor, selection, or scrollback.
3. **State before motion.** Every class is legible with motion disabled; motion
   may clarify a transition but is never the only signal.
4. **Ack is local, not shell acceptance.** `submitted` means handed to the PTY; it
   does not claim the shell read, parsed, or accepted the line.
5. **Every animation is bounded and cancellable, and reduced motion or
   `--safe` collapses it to `0 ms`** while removing nothing else.
6. **No periodic wakeups when idle.** Frames run only while a bounded animation
   or a one-shot dwell deadline is active; neither survives completion.
7. **No plugin work per frame, and no plugin read path yet.** Plugin rendering
   waits for the status-provider contract; until then Core state exists alone.

## State model and action classes

`ack` is the **only** time-bounded transitional phase. The phases after it are
observation states with explicit exits and no scheduled feedback while unchanged.
Mode is a separate latched machine that persists until replaced or exited.

```text
idle -> ack (<=80 ms) -> submitted | pasting | active (starting -> running) -> settled -> idle
```

1. `ack` always resolves within `80 ms` and never waits for the shell.
2. `submitted` ends on the first PTY output, the next input, or a focus change,
   whichever comes first; a slow shell may leave it resting, and it then
   schedules nothing and claims nothing further. `pasting` ends when the bounded
   paste commit completes or is rejected and adds no wait beyond the paste path.
3. `active` is entered only when a producer declares a boundary (shell mark,
   action scope, or Core-owned operation). Without one, ack completes and the
   machine returns to `idle` — no `starting` or progress state is invented.
   `active` lasts as long as the action, but it schedules no frames while
   unchanged and implies no completion time.
4. `settled` applies the committed state first and optionally animates entry; a
   newer trigger of the same class replaces the current one, so feedback never
   queues unboundedly or stacks.

| Action class         | State channel (always)                                     | Motion channel (optional)              | Window                                                                      | Cancel and coalesce                                                          |
| -------------------- | ---------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Printable keypress   | Echo only; no indicator                                    | None                                   | `0 ms`                                                                      | Never animates; echo and PTY write unchanged                                 |
| Enter / submit       | `submitted` after ack until first output/next input        | Ack accent                             | Ack `≤80 ms`, then rest; no progress claim                                  | First output, next input, or focus change ends it; key repeat never restarts |
| Paste commit         | `pasting`, then `pasted` or `refused`                      | One ack, never per byte or line        | Ack `≤80 ms`; rest bounded by the paste commit                              | Oversized or rejected paste uses the error class                             |
| Mode change          | Explicit text label naming the Core user mode              | Chrome accent `120..=180 ms`           | Persists while active; motion `≤180 ms`                                     | Next mode replaces; exit commits immediately                                 |
| Panel / action start | `ack`, then `starting` only when a boundary is known       | Entry transition `120..=180 ms`        | Entry `≤180 ms`; minimum visible `150..=200 ms` once shown                  | No boundary means ack only; completion commits; cancel shows final state     |
| Long-running command | `active`: `starting` then `running` with measured progress | Determinate steps only, `≤180 ms` each | While active; completion interpolation `≤300 ms`                            | No loop and no spinner; indeterminate work is static after entry             |
| Error / refusal      | `settled`: label plus status glyph                         | Entry `≤180 ms`; no exit flash         | Minimum dwell `≥2000 ms`, then sticky until next input, dismiss, or replace | Replaced only by a newer state; never auto-clears below the dwell            |

Paste is one bounded burst: echo plus one optional ack, not a per-line effect.
Long-running actions reject a spinner because a spinner is a looping animation,
which RFC-0002 forbids and PB-7 charges as continuous work.

## Timing budgets

All values are **candidate design targets**, not measurements. The perceptual
anchors (`~100 ms`, `~150 ms`, `16.7 ms`, `≤1 ms`) are rationale, not verified
thresholds; the exact microsecond ceiling belongs to the implementing repository.

| Quantity                      | Candidate value                          | Basis and tie to accepted budgets                                                                                    |
| ----------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Ack                           | `≤80 ms`                                 | About five 60 Hz frames; a candidate rationale anchors `~100 ms` as the limit where a local response reads immediate |
| Mode transition               | `120..=180 ms` (default `150`)           | Inside the accepted `150`/`120`/`100`/`200` defaults and the `0..=500` bound                                         |
| Minimum visible               | `150..=200 ms` (180 recommended, `T-02`) | Candidate rationale: below `~150 ms` a shown indicator reads as a glitch; this is a hold, not animation              |
| Per-burst interpolation cap   | `300 ms`                                 | Explicit tightening of RFC-0002's `500 ms`: entry plus exit per feedback burst; static holds are excluded            |
| Error dwell                   | `≥2000 ms` then sticky                   | A flash is not a signal; the error stays readable until next input, dismissal, or replacement                        |
| Frame budget                  | `16.7 ms` (60 Hz)                        | Candidate planning envelope: feedback uses `≤1 ms` (about 6%) and never triggers parse, shaping, or snapshot rebuild |
| Concurrent animating surfaces | `≤8`                                     | Candidate bound inherited from the UI Motion record; not accepted; excess triggers commit their end state            |

The `300 ms` cap bounds **interpolated time**, not wall-clock presence: entry and
exit must fit inside it, a minimum-visible hold renders zero frames, and a burst
whose configured entry and exit sum above `300 ms` degrades to the committed
state instead of animating. Ack (`≤80`) and mode (`≤180`) fit inside the cap by
construction.

## Why this adds no input latency

- The PTY write happens **before** the state is published; the write path never
  reads, waits for, or is scheduled by the feedback state machine, and no feedback
  path contains a sleep, blocking wait, or input queue.
- The invariant is **the ack never delays the PTY write**, not that the ack must
  follow echo. A local ack may share the echo frame, be the next present, or
  precede echo on a slow shell; all three are correct because the ack makes no
  claim about shell state.
- Key repeat coalesces into **one absolute window** of `≤300 ms` measured from the
  first trigger. Repeats never restart the window, so holding Enter cannot sustain
  animation.
- Cancellation applies the committed state without waiting for an animation, so a
  fast typist never observes stale feedback.

## Surfaces and ownership

| Layer              | Owner                        | Responsibility                                                                                                                        |
| ------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Feedback state     | Core                         | Phase machine, classes, dwell deadlines, cancellation, accessibility semantics; draws nothing                                         |
| Core chrome motion | Core renderer                | Only RFC-0002 leaves plus a reviewed extension for ack/mode accents; interpolates already-computed scene values, never terminal cells |
| Feedback renderer  | `bar` or `statusline` plugin | Optional, installed by the user; renders state only after the status-provider amendment; no per-frame callback                        |

**There is no default indicator** in Core or in the bundled catalog. The bundled
catalog contains only `bitty-terminal.shell-integration` (bundled-disabled), and
`bitty --safe` loads zero plugins, so nothing renders feedback under `--safe` and
no Core chrome fallback is drawn. This matches
[ADR 0014](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md)
and the [Status System Specification](status-system.md): workspace and status
presentation are plugin-only, and Core keeps mechanism, bounds, and validation.

`statusline` is not a v1 slot: it was removed as a breaking change and status
presentation is a `bottom`-band composition per the
[Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md). This
candidate requests **no new slot** and no Core-drawn bar. When both `bar` and
`statusline` are installed, either may render the state; the user's plugin choice
wins, Core does not arbitrate beyond the band contract, and enabling both may
duplicate labels (open point, not a Core policy).

## Indicator contract (candidate, blocked on the provider contract)

Core owns state, timing, cancellation, and accessibility semantics. **Plugin
rendering is a dependency, not an assumption**: the future `StatusProvider`
interface, version, metadata, filtering protocol, and host surface remain open
per the [Chrome Surface Contract](chrome-surface-contract-candidate.md). Until
that amendment is accepted, there is no plugin read path, no snapshot shape, and
Core state remains internal.

Once the provider contract exists, the candidate rules are:

1. A renderer reads a read-only snapshot (`class`, `phase`, `label`, `progress`),
   cannot mutate phase or timing, and receives updates on transitions only.
2. Labels come from a closed static vocabulary: `submitted`, `pasted`,
   `starting`, `running`, `done`, `failed`, `refused`, and Core user-mode names.
   Terminal output never enters a label, log line, or announcement.
3. Error and refusal are a leading status glyph plus a text label, composed as
   `Text` in a `Row`/`Column`. The accepted node subset is
   `Text | Row | Column | List`; there is no shape or stroke primitive, and
   border/background treatment depends on the candidate Scene Style Primitives,
   so "not color-only" is met by text and glyph redundancy first.
4. Theme tokens style the fragment under the contrast obligations below. Label
   and glyph redundancy keep motion-off and color-blind postures legible.
5. No renderer means no feedback is rendered; Core does not draw a fallback.

## Accessibility and preferences

- **Reduced motion.** `appearance.animations.reduced_motion = auto | always | never`
  keeps its accepted meaning; `always` and `bitty --safe` force `0 ms`, and the
  state channel still changes where a renderer exists.
- **Contrast.** Feedback styling resolves theme tokens under the
  [Theme Token Contract (Candidate)](theme-token-contract-candidate.md), which
  consumes the accepted `AC-1`..`AC-3` contrast obligations; a plugin cannot
  self-certify contrast, and degradation for a violating token stays open there.
  No state is encoded by hue alone: mode and error carry text, and error carries
  a leading glyph as well.
- **Screen-reader announcements.** These are **dependent on the platform
  accessibility adapter, not available today**: only a headless backend exists,
  so no assistive technology sees a Bitty tree per the
  [Accessibility Extraction Contract](accessibility-extraction-contract.md). The
  candidate specifies the future rules — one bounded announcement per semantic
  transition (mode entered/left, failed/refused/done), never for typing or ack,
  rate-limited and coalesced, no PTY bytes, no repeating cadence — and claims no
  current announcement. No verbosity key exists; adding one is a follow-up.
- **Safe mode.** `--safe` loads no plugins and draws no Core fallback, so mode and
  error are **not rendered**. The candidate records that gap rather than adding a
  Core status surface; whether to fund one is `T-04`.

| Key (status)                                         | Default                    | Range / values                       | Effect on feedback                            |
| ---------------------------------------------------- | -------------------------- | ------------------------------------ | --------------------------------------------- |
| `appearance.animations.enabled` (shipped)            | `true`                     | `true` \| `false` (`false` = `0 ms`) | Disables motion; state remains                |
| `appearance.animations.reduced_motion` (shipped)     | `auto`                     | `auto` \| `always` \| `never`        | `always` and `--safe` collapse to final state |
| `appearance.animations.duration_ms.*` (shipped)      | `100..=200` per transition | `[0, 500]` ms                        | Existing transitions; unchanged               |
| `appearance.animations.duration_ms.ack` (candidate)  | `80`                       | `[0, 80]` ms                         | Ack accent; `0` means state-only              |
| `appearance.animations.duration_ms.mode` (candidate) | `150`                      | `[0, 180]` ms                        | Mode accent; `0` means state-only             |
| Minimum visible (policy, not a key; `T-02`)          | `180`                      | `150..=200` ms or no hold            | Hold after entry; renders no frames           |
| Per-burst interpolation cap (policy, not a key)      | `300`                      | fixed                                | Entry plus exit; excess degrades to committed |

`ui.motion` is **not** adopted. The accepted home is `appearance.animations`; a
second tree would duplicate that surface and split validation and attribution. If
a future revision introduces a neutral namespace, it must alias the accepted
table and preserve its validation and safe-mode behavior; this candidate does not
add `ui.motion`. The candidate keys above are proposals; the shipped
[configuration reference](../reference/configuration-options.md) and its
inventory stay unchanged until acceptance.

## Performance

- **Per frame.** Feedback interpolates already-computed chrome values or one
  indicator node: no VT parse, grid damage, snapshot rebuild, shaping, or plugin
  call. The hot path adds a flag and counters, not an allocation; buffers are
  pre-sized. The `≤1 ms` of `16.7 ms` envelope is a candidate planning target.
- **Coalescing and idle.** At most one live presentation per class and one
  animation per surface property; one absolute `≤300 ms` burst from the first
  trigger, which repeats never restart, and excess animating surfaces commit
  immediately (bound `8`). After the last animation present returns to idle, and a
  minimum-visible hold uses one one-shot deadline, cancelled on the next trigger.
  No spinner, pulse, or clock runs while idle.
- **High load and slow shells.** Feedback sits below terminal output: if the frame
  budget is exhausted, motion drops first and the state applies on the next
  available frame. It never backpressures the PTY or delays echo. A slow shell may
  show the ack before echo; that is allowed and does not imply shell acceptance.
- **Full-screen.** Feedback never draws over the grid. In alternate-screen or
  captured-pointer states a renderer stays in chrome if chrome is presented;
  otherwise nothing is drawn, and errors are not suppressed where chrome exists.
  With no plugin or under `--safe`, there is no render at all.

| Budget                  | Measurement                                                                                                                                 | Pass condition                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| PB-4 input latency      | Input event to feedback publication and first feedback frame, A/B with feedback disabled; the accepted key-to-screen harness runs unchanged | No key-to-screen regression; p99 stays `≤15 ms`; feedback never delays a PTY write                  |
| Feedback frame count    | Frames per ack and per `300 ms` burst, headless present counter                                                                             | `≤5` frames per ack; `≤18` per `300 ms`; static holds render `0` frames                             |
| PB-7 idle resources     | 10-minute idle after a burst; wakeup counter and CPU sampling                                                                               | Zero Bitty-attributable periodic wakeups; no timer survives; idle CPU within the accepted budget    |
| Present-path frame time | p99 present time with and without an active feedback animation                                                                              | No increase beyond the existing missed-present threshold; within the `≤1 ms` candidate envelope     |
| PB-5 package size       | Stripped binary and package delta after link                                                                                                | Charged to PB-5; a `>100 KiB` delta is a candidate review trigger, not a budget change              |
| Accessibility           | Headless state tests plus reduced-motion and `--safe` runs; adapter evidence is unavailable                                                 | Same committed state at `0 ms`; no color-only state; announcements remain a future-adapter contract |

## Owner decisions

| ID   | Decision                                                     | Recommendation                                                                                                              | Fail-safe if not accepted                                                     |
| ---- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| T-01 | Is the motion channel on by default?                         | Yes, inheriting `appearance.animations.enabled = true`; state is always on                                                  | Instant state changes only (`0 ms`); no animation ships                       |
| T-02 | Is minimum-visible progress enforced, and configurable?      | Enforce `180 ms` as a policy constant; no configuration key until measured                                                  | No minimum hold: completion presents as soon as known                         |
| T-03 | Does Core own feedback state or the whole indicator?         | Core owns state, timing, cancellation, and accessibility semantics; plugin rendering requires the status-provider amendment | Core state only; no plugin read path until the contract is accepted           |
| T-04 | Is there a default indicator in Core or the bundled catalog? | No. `statusline` or `bar`, when installed, may render through the future provider; `--safe` renders nothing                 | No indicator anywhere; mode and error remain unrendered and are not announced |
| T-05 | How persistent is error/refusal feedback?                    | Minimum `2 s` dwell, then sticky until next input, dismiss command, or replacement; never flash-only                        | Sticky until the next input; never auto-clear                                 |
| T-06 | Is the action-class set closed, may plugins add classes?     | Closed set; plugins render but cannot define classes; a new class needs a reviewed revision                                 | Closed at the classes here; unknown classes render as plain state             |

A recorded answer or fail-safe default is a promotion precondition.

## Acceptance mapping (bitty#2220)

| #2220 criterion                                                                              | Where this candidate answers it                                    | Status                                                   |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------- |
| Candidate actions, state machines, timing budgets, interruption rules, visual/input boundary | Action classes, state model, timing budgets, surfaces              | Addressed (design)                                       |
| Keyboard, Enter, paste, mode-switch, command-lifecycle latency and correctness invariants    | Action-class table, latency section, PTY-never-delayed rules       | Addressed (design)                                       |
| Reduced-motion and accessibility behavior                                                    | Accessibility and preferences; `T-01`, `T-02`                      | Addressed; announcements blocked on the platform adapter |
| High-load, slow-shell, and application-full-screen cases                                     | Performance and failure posture                                    | Partially addressed; design only, no live evidence       |
| Independent review before any product implementation                                         | P0 sign-off section and promotion gate                             | Pending review                                           |
| Issue closure                                                                                | Only on owner acceptance of `T-01`..`T-06` plus independent review | Pending owner and reviewer                               |

## Security review

Feedback adds no capability, host surface, or trust boundary. It is derived
presentation over state Core already owns and stays off the PTY, parse, and
render hot paths. Three properties bind any future revision: labels, log lines,
and announcements never interpolate PTY output or plugin free text, so a hostile
shell cannot spoof a `refused` state or inject into assistive output; no plugin
read path exists before the status-provider contract is accepted; and no feedback
path may become a per-frame plugin hook. No `P0` criterion changes; a security
reviewer is required before the provider amendment admits a read capability.

## Verification plan

1. Phase machine: `ack` resolves within `80 ms`; `submitted`, `pasting`, and
   `active` have the stated exits; no phase schedules a periodic timer (only the
   one-shot minimum-visible deadline exists); a boundary-less action returns to
   `idle`; dwell and replacement rules hold.
2. Budgets: transitions `120..=180 ms`, ack `≤80 ms`, burst interpolation
   `≤300 ms` with holds excluded, error dwell `≥2000 ms`, and candidate-key
   clamping to `[0, 80]` and `[0, 180]`.
3. Ordering: the write completes before state publication; ack may share, follow,
   or precede echo; no path blocks or reorders bytes; key repeat yields one burst.
4. Reduced motion, `--safe`, and `enabled = false`: identical committed state at
   `0 ms`; no render under `--safe`; no color-only state; no terminal text in a
   label.
5. Idle, soak, and load: zero wakeups after a burst, allocation-stable cycles, no
   frames after completion, motion-only degradation, and PB-4/PB-7 measurements
   under the scoped conditions above.

## Alternatives considered

| Alternative                                 | Trade-off                                                                                    | Disposition                                                                              |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Delay the write briefly to make ack visible | Synchronous feedback; real input latency and a PB-4 violation                                | Rejected — feedback publishes after the write, never before                              |
| Motion-only feedback                        | Simple to draw; invisible under reduced motion and without animation                         | Rejected — the state channel is primary                                                  |
| Spinner for indeterminate work              | Familiar progress signal; a loop contradicts RFC-0002 and PB-7                               | Rejected — static `running` state plus determinate steps only                            |
| Bundled default status module               | Legible without user setup; contradicts the one-item bundled catalog, ADR 0014, and `--safe` | Rejected — no default indicator; an installed plugin renders after the provider contract |
| Core-drawn indicator fallback               | Covers the `--safe` gap; draws presentation policy in Core and deviates from ADR 0014        | Rejected for this candidate; the safe-mode gap is recorded under `T-04`                  |

## Affected contracts

| Contract                                                                                                                                                                                                    | Effect                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [Panel Animations and Effects RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md) (accepted)                                                      | Unchanged; ack/mode accents need a reviewed leaf extension                          |
| [UI Motion and Budget (Candidate)](ui-motion-and-budget-candidate.md)                                                                                                                                       | Gains an input-feedback leaf proposal; tree stays closed, bound `8` stays candidate |
| [Status System Specification](status-system.md)                                                                                                                                                             | Gains an optional feedback module shape; plugin-only presentation unchanged         |
| [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md)                                                                                                                                 | The `StatusProvider` amendment is a hard dependency for any plugin read path        |
| [Default Distribution RFC](default-distribution-rfc.md) (accepted)                                                                                                                                          | Confirms no default indicator is added to the bundled catalog                       |
| [Theme Token Contract (Candidate)](theme-token-contract-candidate.md) and [Appearance RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0001-appearance-configuration.md) | Feedback styling consumes contrast obligations and token resolution                 |
| [Accessibility Extraction Contract](accessibility-extraction-contract.md) (accepted)                                                                                                                        | Announcement rules stay conditional on a future platform adapter                    |
| [Configuration reference](../reference/configuration-options.md)                                                                                                                                            | Unchanged until acceptance; candidate keys are not documented as available          |

## Open points

- The identifier `OQ-UX-TEMPORAL-INPUT` remains unregistered; routing it to the
  `bitty-docs` open-question register is an owner action, not this record's.
- The `StatusProvider` amendment: interface name, version, metadata, filtering,
  and read capability (blocking T-03/T-04).
- Whether `bar` and `statusline` may both render feedback, or configuration must
  pick one to avoid duplicate labels.
- Whether minimum-visible becomes a key (`T-02`), and the dismiss-command spelling
  for sticky errors (`T-05`).
- The closed label vocabulary byte bounds and whether mode names are stable.
- Whether error/refusal entries need a distinct dwell or the same `2 s` floor.

## Acceptance criteria

1. A reviewer confirms no rule delays, reorders, duplicates, or drops PTY bytes,
   that the ack-versus-echo invariant is stated correctly, and that PB-4 is
   untouched by design; `T-01`..`T-06` are answered or fail-safe defaults recorded.
2. Every action class is legible with motion disabled, under reduced motion, and
   under `--safe` to the extent a renderer exists; the state channel and indicator
   contract are read-only and off the hot path and the render-loop plugin boundary.
3. No default indicator is claimed for Core or the bundled catalog, and no plugin
   read path is claimed before the status-provider amendment is accepted.
4. bitty#2220's criteria are mapped as above; the issue closes only on owner
   acceptance plus independent review, and acceptance authorizes a bounded
   prototype plan, not shipping code.

## P0 Review Sign-off

Not applicable: this record changes no trust boundary, capability, resource
ceiling, or accepted performance number. A security reviewer is required if the
provider amendment admits a plugin read capability or a feedback path becomes a
per-frame plugin hook.

## References

- [Panel Animations and Effects RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md)
  — accepted durations, easing, reduced motion, no-interpolation contract;
  [Performance Budget RFC](performance-budget-rfc.md) — PB-4/PB-5/PB-7;
  [Input and Pointer Contract](input-pointer-rfc.md) — hot path and PTY boundary;
  [Terminal State RFC](terminal-state-rfc.md) — Terminal Truth and parser modes.
- [Text and Rendering RFC](text-rendering-rfc.md) — frame work and budget ties;
  [Status System Specification](status-system.md) — bar composition and `--safe`;
  [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md) —
  `bottom` band, removed `statusline` slot, open `StatusProvider`;
  [Default Distribution RFC](default-distribution-rfc.md) — bundled catalog and
  `--safe`; [ADR 0014](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md)
  — plugin-only presentation.
- [UI Motion and Budget (Candidate)](ui-motion-and-budget-candidate.md) — motion
  tree and bound `8`; [Theme Token Contract (Candidate)](theme-token-contract-candidate.md)
  — contrast obligations; [Accessibility Extraction Contract](accessibility-extraction-contract.md)
  — headless-only adapter; [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md)
  — copy mode status reporting.
- [bitty#2220](https://github.com/bitty-terminal/bitty/issues/2220) — the product
  exploration this candidate answers. Contour
  [input modes](https://contour-terminal.org/input-modes/),
  [indicator statusline](https://contour-terminal.org/configuration/indicator-statusline/),
  and [release notes](https://contour-terminal.org/release-notes/) are direction
  reference only, not a claim about its internals.
