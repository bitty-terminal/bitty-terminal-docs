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
> behavior below exists. The issue header names `OQ-UX-TEMPORAL-INPUT`, undefined
> in this corpus; this record neither defines nor closes it.

Owner: input and presentation surfaces (CTX-0156); issue:
[bitty#2220](https://github.com/bitty-terminal/bitty/issues/2220).
Implementation: none — no feedback state surface, indicator module, or leaf
exists. Promotion gate: owner answers `T-01`..`T-06` (or records the fail-safe
defaults), independent review, then `status: accepted`.

## Purpose and scope

Bitty presents typing, Enter/submit, mode changes, and panel-action starts as
instantaneous transitions: bytes arrive, the screen updates, no boundary is
perceptible. That is fast but ambiguous — the user cannot tell whether a command
was accepted, whether a mode is active, or whether a multi-second action started
or stalled. Copy mode is one case: its state is a runtime log line rather than a
composited indicator per the
[Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md). The goal is
**legibility without added input latency**, delivered in two independent
channels: a **state channel** that always exists, changes discretely, and needs
no animation, timer, or plugin; and a **motion channel** that is optional,
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
public input-mode and indicator documentation is a **product-direction reference
only**; this record claims nothing about Contour's internals.

## Normative sources this specification must not weaken

| Source                                                                                                                                                           | What it binds here                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Panel Animations and Effects RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md) (accepted)           | `0..=500` ms durations, closed easing set, `enabled = false`, reduced motion, `--safe` collapse, no loops, and no interpolation of terminal content, cursor, selection, or scrollback |
| [Performance Budget RFC](performance-budget-rfc.md) (accepted)                                                                                                   | PB-4 key-to-screen `≤8 ms p50`/`≤15 ms p99`, PB-7 idle CPU and zero Bitty-attributable periodic wakeups, PB-5 package size for added code                                             |
| [Input and Pointer Contract](input-pointer-rfc.md) (draft)                                                                                                       | Synchronous plugin-free hot path `Platform → Router → Keymap → Encoder → PTY`; only encoder bytes mutate terminal state                                                               |
| [Terminal State RFC](terminal-state-rfc.md) (accepted)                                                                                                           | Parser-to-action-to-state is the only write path; feedback never mutates grid, cursor, modes, or scrollback                                                                           |
| [Text and Rendering RFC](text-rendering-rfc.md) (draft)                                                                                                          | Damage-driven frame work; a chrome-only change rebuilds no snapshot; the PB-4/PB-7 reconciliation applies                                                                             |
| [Status System Specification](status-system.md) (draft)                                                                                                          | Bar composition and the module registry are plugin-owned; Core keeps band geometry and bounded validation; no module on the hot path                                                  |
| [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md) (draft)                                                                              | Chrome never enters the hot path; chrome animation composes with the accepted contract; `statusline` is not a slot and status presentation is a `bottom`-band composition             |
| [Accessibility Extraction Contract](accessibility-extraction-contract.md) (accepted)                                                                             | Core-owned reduced-motion and high-contrast composition; transition-only, rate-limited announcements; motion never blocks input                                                       |
| [Core and Plugin Boundaries](../architecture/core-boundaries.md) (accepted), [Documentation workflow](../docs/development/documentation-workflow.md) (normative) | Mechanism versus policy, no plugin on terminal/render/input hot paths; frontmatter, status meanings, English-only text, self-containment, and review ownership                        |

Two accepted sources fix the hard part: feedback may interpolate **Core-owned
chrome only**, and a new transition leaf is a reviewed extension of RFC-0002,
not runtime registration. Motion therefore optimizes an already legible state;
it never carries the state.

## Terminology

An **action class** is a closed category of user action with one feedback
window. The **committed state** is the final, already-correct presentation that
exists with or without motion. **Minimum visible** is the shortest time a
progress indicator stays presented once shown. A **command boundary** is an
explicit signal that a command started or finished, shown only when a producer
supplies one.

## Principles

1. **PTY delivery and terminal semantics are never delayed.** The encoder and
   write keep their ordering and latency; feedback publishes after the write and
   is never awaited by the input thread.
2. **Feedback is presentation-only.** It never mutates Terminal Truth and never
   interpolates terminal content, cursor, selection, or scrollback.
3. **State before motion.** Every class is legible with motion disabled; motion
   may clarify a transition but is never the only signal.
4. **Every animation is bounded and cancellable, and reduced motion or
   `--safe` collapses it to `0 ms`** while removing nothing else.
5. **No periodic wakeups when idle.** Frames run only while a bounded animation
   or a one-shot dwell deadline is active; neither survives completion.
6. **No plugin work per frame.** A plugin indicator is declarative data updated
   on transitions; budget exhaustion, missing surfaces, or unknown classes drop
   motion and keep the discrete state.

## State model and action classes

One shared phase machine serves submit, paste, panel actions, and commands:
`idle -> pending -> active -> settled(ok | error | refused) -> idle`, with mode
as a separate latched machine. `pending` covers the gap before a boundary and is
capped at the ack window. `active` requires a producer-declared boundary (shell
mark, action scope, or Core-owned operation); without one, only submit ack
exists and no progress state is invented. `settled` applies the committed state
first and optionally animates entry; a newer trigger of the same class replaces
the current one, so feedback never queues unboundedly or stacks.

| Action class         | State channel (always)                                | Motion channel (optional)              | Window                                                            | Cancel and coalesce                                                     |
| -------------------- | ----------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Printable keypress   | Echo only; no indicator                               | None                                   | `0 ms`                                                            | Never animates; echo and PTY write unchanged                            |
| Enter / submit       | `submitted` label or chrome accent until first output | Short chrome ack accent                | Ack first frame `≤80 ms`; total `≤80 ms`                          | First output, next input, or focus change commits; repeats restart once |
| Paste commit         | `pasted` label when the paste completes               | One ack, never per byte or line        | Ack `≤80 ms`                                                      | Oversized or rejected paste uses the error class                        |
| Mode change          | Explicit text label naming the mode                   | Core chrome accent `120..=180 ms`      | Persists while the mode is active; motion `≤180 ms`               | Next mode change replaces and restarts; exit commits immediately        |
| Panel / action start | `starting` until the boundary is known                | Entry transition `120..=180 ms`        | Entry `≤180 ms`; minimum visible `150..=200 ms` once shown        | Completion commits; cancel suppresses the exit animation                |
| Long-running command | `running` plus measured progress when produced        | Determinate steps only, `≤180 ms` each | While active; completion `≤300 ms`                                | No loop and no spinner: indeterminate work is static after entry        |
| Error / refusal      | Distinct text label plus shape, never color alone     | Entry `≤180 ms`; no exit flash         | Minimum dwell `≥2000 ms`, then until the next action or dismissal | Replaced only by a newer state; never auto-clears below the dwell       |

Paste is included because bracketed paste is one bounded burst: echo plus one
optional ack, not a per-line effect. Long-running actions reject a spinner
because a spinner is a looping animation, which RFC-0002 forbids and PB-7
charges as continuous work.

## Timing budgets

| Quantity                      | Candidate value                | Basis and tie to accepted budgets                                                                    |
| ----------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Ack (first frame and total)   | `≤80 ms`                       | ~5 frames at 60 Hz, inside the ~100 ms threshold where a response still reads as immediate           |
| Discrete transition           | `120..=180 ms` (default `150`) | Inside the accepted `150`/`120`/`100`/`200` defaults and the `0..=500` bound                         |
| Minimum visible progress      | `150..=200 ms` (default `180`) | Below ~150 ms a shown indicator reads as a glitch; the hold is presentation-only                     |
| Maximum feedback animation    | `300 ms`                       | Tightens the accepted `500 ms` ceiling for input feedback: `≤18` frames at 60 Hz, then idle          |
| Error dwell                   | `≥2000 ms` then sticky         | A flash is not a signal; the error stays readable until the next action or dismissal                 |
| Frame budget                  | `16.7 ms` at 60 Hz             | Feedback uses at most ~1 ms (≈6%): chrome interpolation only, no parse, shaping, or snapshot rebuild |
| Concurrent animating surfaces | `≤8`                           | The accepted candidate concurrency bound; excess triggers commit their end state immediately         |

Why these numbers add no latency: the PTY write happens **before** the state is
published, and the write path never reads, waits for, or is scheduled by the
feedback state machine; no feedback path contains a sleep, blocking wait, or
input queue. The first ack frame may share the frame presenting echo, otherwise
it is the next present, so `≤80 ms` bounds presentation rather than delaying it.
Cancellation applies the committed state without waiting for an animation, and
key repeat coalesces into one burst (`≤300 ms` from the first trigger), so
holding Enter cannot sustain animation.

## Surfaces and ownership

| Layer              | Owner                 | Responsibility                                                                                                                        |
| ------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Feedback state     | Core                  | Phase machine, classes, dwell deadlines, cancellation, snapshot, accessibility projection                                             |
| Core chrome motion | Core renderer         | Only RFC-0002 leaves plus a reviewed extension for ack/mode accents; interpolates already-computed scene values, never terminal cells |
| Default indicator  | Bundled status module | Text-first `bottom`-band fragment rendered from the snapshot; the safe-startup legibility floor                                       |
| Custom indicator   | Any plugin            | Its own declarative fragment on an existing band; observes state, adds no class and no per-frame callback                             |

A plugin opts in by composing one status module; it acquires no policy. It reads
a read-only snapshot of `{ class, phase, label, progress }`, cannot mutate phase
or timing, and receives updates on transitions only — never a per-frame callback.
Labels come from a closed static vocabulary (`submitted`, `running`, `done`,
`failed`, `refused`, mode names); terminal output never enters a label, log line,
or announcement. Theme tokens may style the fragment, but label and shape
redundancy keep motion-off and color-blind postures legible. Without an indicator
mounted, Core tracks state and announces mode and error transitions; it does not
draw a policy indicator itself.

`statusline` is not a v1 slot: it was removed as a breaking change and status
presentation is a `bottom`-band composition per the
[Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md).
This candidate requests **no new slot** and no Core-drawn bar; the bundled
composition hosts the default indicator, and the separate `statusline` plugin is
an alternative host for the same snapshot, not a second contract.

## Accessibility and preferences

- **Reduced motion.** `appearance.animations.reduced_motion = auto | always | never`
  keeps its accepted meaning: `always` and `bitty --safe` force `0 ms`, and the
  state channel still changes, so nothing becomes invisible. The accepted
  animation table is the single home for motion preferences.
- **High contrast.** Feedback uses theme tokens satisfying the documented
  contrast floor. No state is encoded by hue alone: mode and error carry text, and
  error additionally carries a shape or border treatment.
- **Screen-reader announcements.** One bounded announcement per semantic
  transition (mode entered/left, action failed/refused/done); typing and submit
  ack are never announced. Announcements are rate-limited, coalesced, carry no
  PTY bytes, and never run on a repeating cadence. No verbosity key exists today;
  adding one is a follow-up, not a silent addition.

| Key (status)                                                        | Default                    | Range / values                       | Effect on feedback                            |
| ------------------------------------------------------------------- | -------------------------- | ------------------------------------ | --------------------------------------------- |
| `appearance.animations.enabled` (shipped)                           | `true`                     | `true` \| `false` (`false` = `0 ms`) | Disables motion; state remains                |
| `appearance.animations.reduced_motion` (shipped)                    | `auto`                     | `auto` \| `always` \| `never`        | `always` and `--safe` collapse to final state |
| `appearance.animations.duration_ms.*` (shipped)                     | `100..=200` per transition | `[0, 500]` ms                        | Existing transitions; unchanged               |
| `appearance.animations.duration_ms.ack` (candidate)                 | `80`                       | `[0, 300]` ms                        | Ack accent; `0` means state-only              |
| `appearance.animations.duration_ms.mode` (candidate)                | `150`                      | `[0, 300]` ms                        | Mode accent; `0` means state-only             |
| `appearance.animations.min_visible_ms.progress` (candidate, `T-02`) | `180`                      | `[0, 300]` ms or fixed policy        | Minimum hold once progress is shown           |

`ui.motion` is **not** adopted: a second tree would duplicate the accepted
`appearance.animations` surface and split validation and attribution. If an
owner prefers a neutral namespace, the only compatible form is an alias into the
same table, decided by reviewed revision. The candidate keys are proposals; the
shipped [configuration reference](../reference/configuration-options.md) and its
inventory stay unchanged until acceptance.

## Performance

- **Per frame.** Feedback interpolates already-computed chrome values or one
  indicator node: no VT parse, grid damage, snapshot rebuild, shaping, or plugin
  call. The hot path adds a flag and counters, not an allocation; buffers are
  pre-sized. The planning envelope is `≤1 ms` of a `16.7 ms` frame; the exact
  microsecond ceiling belongs to the implementing repository.
- **Coalescing and idle.** At most one live presentation per class and one
  animation per surface property; repeated triggers restart one window capped at
  `300 ms`, and excess animating surfaces commit immediately (bound `8`). After
  the last animation present returns to idle, and a minimum-visible hold uses one
  one-shot deadline, cancelled on the next trigger. No spinner, pulse, or clock
  runs while idle.
- **High load, slow shells, full-screen.** Feedback sits below terminal output:
  if the frame budget is exhausted, motion drops first and the state applies on
  the next available frame. It never backpressures the PTY, delays echo, or draws
  over the grid. In alternate-screen or captured-pointer states the indicator
  stays in chrome if chrome is presented; otherwise mode is announced and error
  remains sticky. Errors are never suppressed.

| Budget                           | Measurement                                                             | Pass condition                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| PB-4 input latency               | Same key-to-screen harness, feedback enabled versus disabled, per class | No p50 regression, p99 `≤15 ms`; ack never precedes echo and never delays a write                    |
| PB-7 idle resources              | 10-minute idle after a burst; wakeup counter and CPU sampling           | Zero Bitty-attributable periodic wakeups; no timer survives; `≤5` frames per ack, `≤18` per `300 ms` |
| Present-path frame time          | p99 present time with and without an active feedback animation          | No increase beyond the existing missed-present threshold; within the `≤1 ms` envelope                |
| PB-5 package size                | Stripped binary and package delta after link                            | Charged to PB-5; `>100 KiB` delta is a review trigger, not a budget change                           |
| Accessibility and reduced motion | Headless state/announcement tests plus reduced-motion and `--safe` runs | Same committed state at `0 ms`; one announcement per transition; no color-only state                 |

## Owner decisions

| ID   | Decision                                                 | Recommendation                                                                        | Fail-safe if not accepted                                          |
| ---- | -------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| T-01 | Is the motion channel on by default?                     | Yes, inheriting `appearance.animations.enabled = true`; state is always on            | Instant state changes only (`0 ms`); no animation ships            |
| T-02 | Is minimum-visible progress enforced, and configurable?  | Enforce `180 ms` as a policy constant; keep it out of config until measured           | No minimum hold: completion presents as soon as known              |
| T-03 | Does Core own feedback state or the whole indicator?     | Core owns state, timing, cancellation, accessibility; plugins render indicators       | Plugin-only indicators; Core publishes no new chrome transition    |
| T-04 | Where does the default indicator live?                   | One bundled `bottom`-band module; no new slot and no Core-drawn bar                   | No default indicator; mode and error are announced and stay sticky |
| T-05 | How persistent is error/refusal feedback?                | Minimum `2 s` dwell, then sticky until the next action or dismissal; never flash-only | Sticky until the next input; never auto-clear                      |
| T-06 | Is the action-class set closed, may plugins add classes? | Closed set; plugins render but cannot define classes; a new class needs a revision    | Closed at the classes here; unknown classes render as plain state  |

A recorded answer or fail-safe default is a promotion precondition.

## Acceptance mapping (bitty#2220)

| #2220 criterion                                                                              | Where this candidate answers it                                    | Status                      |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------- |
| Candidate actions, state machines, timing budgets, interruption rules, visual/input boundary | Action classes, state model, timing budgets, surfaces              | Satisfied by this candidate |
| Keyboard, Enter, paste, mode-switch, command-lifecycle latency and correctness invariants    | Action-class table, timing budgets, PTY-never-delayed rules        | Satisfied by this candidate |
| Reduced-motion and accessibility behavior                                                    | Accessibility and preferences; `T-01`, `T-02`                      | Satisfied by this candidate |
| High-load, slow-shell, and application-full-screen cases                                     | Performance, failure posture, surfaces                             | Satisfied by this candidate |
| Independent review before any product implementation                                         | P0 sign-off section and promotion gate                             | Pending review              |
| Issue closure                                                                                | Only on owner acceptance of `T-01`..`T-06` plus independent review | Pending owner and reviewer  |

## Security review

Feedback adds no capability, host surface, or trust boundary. It is derived
presentation over state Core already owns and stays off the PTY, parse, and
render hot paths. Two properties bind any future revision: labels, log lines, and
announcements never interpolate PTY output or plugin free text, so a hostile
shell cannot spoof a `refused` state or inject into assistive output; and no
feedback path may become a per-frame plugin hook. No `P0` criterion changes; a
security reviewer is required if a revision lets a plugin define a class, carry
terminal text in a label, or animate Core-owned chrome.

## Verification plan

1. Phase machine and bounds: `pending` cap, boundary-less submit, cancellation,
   replacement, dwell deadlines, ack `≤80 ms`, transitions `120..=180 ms`,
   maximum `300 ms`, error dwell `≥2000 ms`, and candidate-key clamping.
2. Ordering: the write completes before state publication; no ack frame precedes
   echo; no path blocks or reorders bytes.
3. Reduced motion, `--safe`, and `enabled = false`: identical committed state at
   `0 ms`; one announcement per transition, none for typing or ack, no
   color-only state, no terminal text in a label.
4. Idle, soak, and load: zero wakeups after a burst, allocation-stable cycles, no
   frames after completion, motion-only degradation, errors visible in
   alternate-screen and captured-pointer states; PB-4 A/B and PB-7 measurements
   under the accepted conditions above.

## Alternatives considered

| Alternative                                 | Trade-off                                                            | Disposition                                                           |
| ------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Delay the write briefly to make ack visible | Synchronous feedback; real input latency and a PB-4 violation        | Rejected — feedback publishes after the write, never before           |
| Motion-only feedback                        | Simple to draw; invisible under reduced motion and without animation | Rejected — the state channel is primary                               |
| Spinner for indeterminate work              | Familiar progress signal; a loop contradicts RFC-0002 and PB-7       | Rejected — static `running` state plus determinate steps only         |
| Core-drawn indicator in the bar             | One implementation; duplicates plugin composition and draws policy   | Rejected — Core owns state, the bundled composition owns presentation |

## Affected contracts

| Contract                                                                                                                       | Effect                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| [RFC-0002](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md) (accepted) | Unchanged; ack/mode accents need a reviewed leaf extension                 |
| [UI Motion and Budget (Candidate)](ui-motion-and-budget-candidate.md)                                                          | Gains an input-feedback leaf proposal; tree stays closed                   |
| [Status System Specification](status-system.md)                                                                                | Gains a candidate feedback module shape; ownership and cadence unchanged   |
| [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md)                                                    | Confirms the `bottom` band with no new slot                                |
| [Configuration reference](../reference/configuration-options.md)                                                               | Unchanged until acceptance; candidate keys are not documented as available |

## Open points

- Which command-boundary producer exists first (shell marks, a Core action
  scope, or plugin scope); without one only submit ack is offered.
- Whether the ack accent belongs on Core chrome or only in the indicator, and
  whether the `statusline` plugin or the bundled bar is the default host
  (`T-03`/`T-04`); whether minimum-visible and error dwell become config keys
  (`T-02`/`T-05`), pointer actions share these classes, and the closed label
  vocabulary and its byte bounds.

## Acceptance criteria

1. A reviewer confirms no rule delays, reorders, duplicates, or drops PTY bytes
   and that PB-4 is untouched by design; `T-01`..`T-06` are answered by the
   owner or their fail-safe defaults are recorded as the accepted direction.
2. Every action class is legible with motion disabled, under reduced motion, and
   under `--safe`; the state channel and indicator contract are read-only and
   off the hot path and the render loop's plugin boundary. bitty#2220's criteria
   are mapped as above, and the issue closes only on owner acceptance plus
   independent review; acceptance authorizes a bounded prototype plan, not code.

## P0 Review Sign-off

Not applicable: this record changes no trust boundary, capability, resource
ceiling, or accepted performance number. A security reviewer is required if a
revision introduces plugin classes, terminal text in labels, or a frame hook.

## References

- [Panel Animations and Effects RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md)
  — accepted durations, easing, reduced motion, no-interpolation contract;
  [Performance Budget RFC](performance-budget-rfc.md) — PB-4, PB-5, PB-7;
  [Input and Pointer Contract](input-pointer-rfc.md) — hot path and PTY boundary.
- [Terminal State RFC](terminal-state-rfc.md) — Terminal Truth and damage;
  [Text and Rendering RFC](text-rendering-rfc.md) — frame work and budget ties;
  [Status System Specification](status-system.md) — bar composition and modules;
  [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md) —
  `bottom` band and the removed `statusline` slot;
  [UI Motion and Budget (Candidate)](ui-motion-and-budget-candidate.md) — motion
  tree and budget categories.
- [Accessibility Baseline (Candidate)](accessibility-baseline-candidate.md) and
  [Accessibility Extraction Contract](accessibility-extraction-contract.md) —
  reduced motion, contrast, announcements; [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md)
  — copy mode status reporting.
- [bitty#2220](https://github.com/bitty-terminal/bitty/issues/2220) — the product
  exploration this candidate answers. Contour
  [input modes](https://contour-terminal.org/input-modes/),
  [indicator statusline](https://contour-terminal.org/configuration/indicator-statusline/),
  and [release notes](https://contour-terminal.org/release-notes/) are direction
  reference only, not a claim about its internals.
