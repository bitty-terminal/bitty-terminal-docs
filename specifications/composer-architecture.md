---
title: Composer Architecture and Host API
description: Terminal-side Composer extension contract covering CommandBuffer semantics bounded paste assembly overlay lifecycle transient input capture external-editor allowlist process lifecycle temp files PTY submission cancellation API ownership versioning and rollback
category: specifications
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 30
---

# Composer Architecture and Host API

## Document status

This document is `Accepted` (`W-82`) as the terminal-side Composer architecture
and host-API contract that the Composer boundary
([bitty-docs `W-73`](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/composer-boundary.md))
delegates to this repository. It elaborates the boundary for the terminal
platform: the CommandBuffer, bounded paste assembly, overlay lifecycle,
transient input capture, external-editor process and temp-file handling, PTY
submission, cancellation, no-plugin behavior, API ownership and versioning,
testable limits, and migration and rollback. It does not authorize extraction,
does not authorize shipped, stable, or compatibility-guaranteed behavior, and
does not weaken any normative security control. The extraction (`W-103`) remains
gated on the focusable-overlay and transient input-capture host contract (`W-01`,
Issue #396, under open question `OQ-056`), `W-73`, and this document; until then
Core keeps the Composer behavior. The one `Implemented-only` Core-internal
behavior this document records is source-level evidence reviewed against the
workspace `bitty` checkout; it is not `Verified`, is not an extension, and is
not the host API. Frontmatter `status` is `accepted` per the repository metadata
schema; document status is Accepted.

- Owning task: `W-82` (bitty-terminal-docs), CarryCtx `CTX-0086`, Issue
  [bitty-terminal-docs#165](https://github.com/bitty-terminal/bitty-terminal-docs/issues/165).
- Predecessor boundary:
  [Composer Boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/composer-boundary.md)
  (`W-73`), accepted 2026-10-03.
- Related decisions:
  [ADR 0015 - Small-Core Extraction Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md)
  (Boundary 4),
  [ADR 0016 - Execution, Graphics, Accessibility, Storage, and Platform-Service Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md)
  (the `W-01` host API and the execution-supervisor defaults this contract
  reuses), and
  [ADR 0009 - Plugin API v1 Lua Surface Acceptance Resolution](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md)
  (authority split and the frozen v1 surface).
- Cross-session map:
  [Small-core refactor execution handoff](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/handoff/2026-10-02-small-core-refactor.md).

## Purpose and scope

The Composer is the editable command line and its input policy: line editing,
paste handling, external-editor launch, cancel, and submit. The Composer
boundary
([`W-73`](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/composer-boundary.md))
decided that this policy is a first-party extension, not a Core feature, and
that it may be extracted only after a public focusable-overlay and transient
input-capture host API exists. This specification fixes the terminal-side
delivery shape and the exact surface that the `composer` extension consumes, so
the Core host APIs, the SDK binding, and the plugin package can be built against
one reviewed contract.

In scope:

- CommandBuffer state and mutation semantics, including the finite byte cap and
  fail-closed behavior;
- bounded paste assembly and the bracketed-paste submit framing;
- focusable overlay lifecycle and transient input capture, including
  acquisition, focus, cancellation, release, and crash behavior;
- the external-editor program allowlist, `argv`-first process lifecycle, and
  the temp-file contract;
- PTY submission through the Core paste pipeline, cancellation, and the
  no-plugin fallback;
- API ownership, additive v2 capability identifiers, and versioning;
- finite limits, typed failure modes, and their observable enforcement;
- migration order and non-destructive rollback;
- the accurately bounded current implementation status.

Out of scope and owned elsewhere:

- the exact host primitive spellings, capture event payloads, focus-order
  rules, and timeout values owned by `W-01`; this document marks the
  Composer-facing host spellings it needs and states that they are provisional
  until `W-01` accepts its contract;
- the plugin package layout, manifest fields, and the `composer` plugin
  implementation (`CTX-0003`);
- repository creation and any extraction or migration code (`W-103`);
- the Core-side overlay, input-capture, process, and temp-file implementations;
- IME overlay presentation and the search/copy-mode capture contracts, which
  stay with their owning open questions.

This document does not reopen the accepted Terminal Truth, permission, paste,
process, or capability controls. It preserves them and records residual
questions under "Open points".

## Normative sources this specification must not weaken

This contract must be read together with, and must not weaken:

- The [Composer Boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/composer-boundary.md)
  (`W-73`), which owns the extension decision, the retained Core mechanisms, the
  `argv`-first process rule, the temp-file permissions and cleanup rule, and the
  compatibility and rollback direction elaborated here.
- The bitty-docs security corpus:
  [security overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [threat model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  [risk register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md),
  and
  [P0 acceptance criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md).
  The binding controls include deny-by-default local files (`P0-AC-005`),
  suspicious paste inspection (`P0-AC-008`), hyperlink and process launch
  without shell interpolation (`P0-AC-009`), capability-checked host APIs and
  official-plugin parity (`P0-AC-012`), per-plugin resource budgets
  (`P0-AC-014`), exclusion from the input, parser, and render hot paths
  (`P0-AC-015`), Core-owned Terminal Truth (`P0-AC-016`), safe mode
  (`P0-AC-019`), trace minimization with user-only files (`P0-AC-026`),
  trust-level admission (`P0-AC-035`), and the panel lease write gate
  (`P0-AC-039`).
- [ADR 0015 - Small-Core Extraction Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md)
  Boundary 4 and its binding constraints: Terminal Truth and permission
  retention, no private first-party bypass, and validated arguments rather than
  shell interpolation.
- [ADR 0016 - Execution, Graphics, Accessibility, Storage, and Platform-Service Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md)
  Boundary 1 and the
  [Execution Host and Supervisor Boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/execution-host-boundary.md):
  `argv`-first execution, closed stdin unless an interactive PTY is explicitly
  requested, capability-scoped process operations authorized per principal,
  generation fencing, bounded output, owned-process-tree kill, and no default
  retry.
- [ADR 0009 - Plugin API v1 Lua Surface Acceptance Resolution](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md),
  the
  [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md),
  the
  [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md),
  the
  [manifest and capability grammar](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/manifest-capability-authority.md),
  and the
  [Isolation and Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md):
  the frozen v1 surface, the closed deny-by-default capability families, the
  contract/implementation/generation authority split, and the rule that unknown
  future fields are ignored.
- The accepted
  [Terminal State RFC](terminal-state-rfc.md),
  [Panel Runtime RFC](panel-runtime-rfc.md),
  [Rich Presentation RFC](rich-presentation-rfc.md),
  [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md),
  and [Performance Budget RFC](performance-budget-rfc.md).
- The draft [Input and Pointer Contract](input-pointer-rfc.md), which owns the
  keyboard, pointer, selection, and IME direction the capture path composes
  with.

## Terminology

- **Composer**: the editable input line and its input policy (line editing,
  paste, external-editor launch, cancel, and submit). Core keeps the behavior
  until the extraction gates pass.
- **Extension**: optional behavior delivered through a public, versioned,
  capability-gated interface, whether a Lua plugin or a Rust-level component.
  First-party and third-party extensions use the same interfaces.
- **Core**: the always-available terminal mechanism that works with zero
  plugins and in `bitty --safe`; it owns Terminal Truth, permission and
  resource enforcement, and identity and generation fencing.
- **Terminal Truth**: parser state, grid semantics, cursor state, modes, and
  canonical scrollback; mutable only by Core.
- **CommandBuffer**: the bounded multiline edit buffer holding the unsubmitted
  command text.
- **Paste assembly**: the Core-inspected path that places pasted or selected
  text into the CommandBuffer under a finite limit.
- **Focusable overlay**: an overlay surface that can hold focus and receive
  transient input, distinct from the v1 presentation-only, non-focusable
  `overlay` slot.
- **Transient input capture**: a bounded, revocable modal capture in which
  keyboard, text, IME, and pointer input is routed to the focused overlay
  surface; Core owns acquisition and release, and no plugin callback runs on the
  input hot path.
- **PTY submission**: delivery of the accepted buffer into the focused panel's
  input stream through the Core paste pipeline, never by a plugin writing a raw
  PTY handle.
- **External-editor allowlist**: the closed set of bare editor program names
  that Core admits for the editor round trip.
- **Temp root**: the Bitty-owned, user-only directory under which editor temp
  files are created.
- **Typed outcome**: a structured result (success, cancelled, denied, timeout,
  editor failed, unavailable) carrying the missing capability or violated rule
  on denial, never a bare boolean or bare exit code.
- **Generation fencing**: the rule that a stale host handle is rejected by the
  host itself rather than trusted from the caller.
- **No-plugin mode**: the startup and runtime state in which the Composer
  extension is absent, disabled, failed, or incompatible; Core's retained
  behavior applies.

## Architecture overview

The Composer is a first-party extension over the same public, capability-gated
interfaces as any third-party extension. After the gated extraction it ships as
the optional `composer` plugin on the plugin platform; whether the delivery is
the Lua plugin or a Rust-level extension does not change the constraints, and
the exact package shape is owned by `CTX-0003`. Core retains every mechanism the
policy depends on, and no private first-party surface is introduced.

```text
                  public, capability-gated host API (this contract)
  composer extension  ───────────────────────────────────────────────►  Core
    CommandBuffer         acquire / update / release focusable overlay    Terminal Truth
    paste assembly        transient input capture (no hot-path callback)  input pipeline
    overlay lifecycle     submit buffer through paste pipeline            paste inspector
    editor policy         launch allowlisted editor (argv-first)          process supervisor
    cancel / submit       create + clean temp file                        temp-file policy
                          typed outcomes, deadlines, budgets              capability + consent
```

Ownership at a glance:

| Concern                       | Owner after extraction                        | Core retains                                                 |
| ----------------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| Command text and edit policy  | Composer extension                            | Bounded submission and the input pipeline                    |
| Paste inspection and framing  | Core paste pipeline                           | Inspector, bracketed paste, panel lease write gate           |
| Focusable overlay + capture   | `W-01` host API (bitty-docs)                  | Capture switch, consent, focus authority, hot-path exclusion |
| Editor process                | Composer extension requests, Core spawns      | PID tracking, timeouts, owned-tree kill, capability gate     |
| Editor temp file              | Core temp-file policy                         | Permissions, exclusive create, boundedness, cleanup          |
| Capability and consent        | Core                                          | Grant, revocation, attribution, safe mode                    |
| Plugin lifecycle and versions | Plugin platform (`W-120` SDK, `CTX-0003` pkg) | Compatibility validation before activation                   |

## CommandBuffer semantics

- **Explicit, modal, fail-open when closed.** The Composer opens only on an
  explicit modifier chord registered in the existing single-owner keymap. It
  never hijacks bare `Enter`; while closed, input bytes flow to the PTY
  unchanged so fullscreen programs, REPLs, and TUIs are unaffected.
- **UTF-8 text with `\n` newlines.** Inside the Composer, `Enter` inserts a
  newline and a configurable separate chord submits; the default bindings and
  their user remapping are extension policy, not a Core contract.
- **Finite byte cap.** The edit buffer is bounded by a finite Core-enforced
  limit. The reviewed Core-internal implementation uses `64 KiB`
  (`COMPOSER_MAX_BYTES`); any extension reuses a finite bound of the same order
  and may not raise it without a reviewed change. An insert that would exceed
  the cap fails closed with the buffer kept as-is, never truncated silently in
  place, and never buffered without bound.
- **No Terminal Truth mutation.** The CommandBuffer is extension-side
  presentation state. It never writes the grid, cursor, modes, scrollback, or a
  semantic zone, and it is never reconstructed from terminal content
  (`P0-AC-016`).
- **No cursor model required.** The contract requires bounded content and
  fail-closed mutation; a random-access cursor is an extension detail covered by
  the external editor rather than a host guarantee.

## Bounded paste assembly

Paste is security-relevant and stays under Core control; the extension requests
it and never writes the PTY directly.

- **One inspected path.** Pasted or selected text reaches the CommandBuffer
  through the Core paste pipeline, where suspicious-paste inspection
  (`P0-AC-008`) and bracketed paste as defense in depth remain authoritative.
  The extension receives the inspected result and cannot bypass the inspector.
- **Assembled under a finite limit.** The paste payload and the resulting buffer
  are bounded by finite Core-enforced limits. An over-limit paste is rejected or
  truncated under one documented rule that the extension states in its own
  documentation; it is never appended without bound. Rejection leaves the
  previous buffer intact.
- **Submit framing is byte-exact.** Submit converts the accepted buffer into one
  bracketed-paste frame: open marker `ESC[200~`, the content, close marker
  `ESC[201~`, then a single `CR` terminator. This preserves Unicode and
  multiline content without simulating individual keystrokes and without
  re-encoding the buffer.
- **Over-limit framing fails closed.** If the framed payload would exceed the
  finite limit, submission fails with a typed outcome and emits nothing; no
  partial frame reaches the PTY.
- **No raw PTY handle.** The extension never receives a PTY file descriptor, a
  raw write surface, or a terminal-state mutation path.

## Overlay lifecycle and transient input capture

The v1 `overlay` slot is presentation-only and non-focusable; the Composer
cannot be built on it alone. The extension depends on the `W-01` public host API
that provides a focusable overlay and bounded transient input capture. Core
retains the capture mechanism and the permission that gates it, and the API is
the public path, not a private one.

Lifecycle states:

1. **Acquire.** On an explicit user open, the extension requests a focusable
   overlay and transient capture. Core grants only with the capture capability
   and any required consent; a denial is a typed outcome and no overlay opens.
2. **Active.** While active, keyboard, text, IME, and pointer input route to the
   focused overlay under a bounded event queue. The extension reads events
   through the host API; it registers no synchronous callback on the input hot
   path (`P0-AC-015`).
3. **Switch.** Moving focus to another panel, view, overlay, or the terminal
   releases capture without delivering captured events to the terminal.
4. **Submit or cancel.** Submit goes through the controlled PTY submission path
   below; cancel discards the unsubmitted buffer and writes nothing.
5. **Release.** Core releases capture and restores terminal input on cancel,
   submit, focus switch, plugin unload, disable, crash, or a Core-side timeout.
   Release is idempotent and guaranteed by Core.

Binding rules:

- **Core owns the switch.** The extension cannot capture input directly, cannot
  hold capture past the overlay's active lifetime, and cannot pin the terminal.
- **No second input channel.** Capture composes with the accepted input-pointer
  and IME direction rather than opening a second channel; the IME overlay
  contract stays owned by its own open question and is not redefined here.
- **Crash and unload are release.** A crashed, unloaded, or disabled extension
  cannot leave capture held; Core restores terminal focus to the panel that
  actually holds it.
- **Terminal Truth untouched.** Captured input edits only extension presentation
  state; the terminal grid and scrollback are never written by capture.

## External editor: allowlist and process lifecycle

The external editor is a process launch on behalf of the extension and is bound
by the execution and process controls of the security corpus.

- **Allowlisted program only.** The editor program is read from `$VISUAL`, then
  `$EDITOR`; the first non-empty value wins and is matched exactly against a
  closed allowlist of bare program names. The reviewed Core-internal
  implementation admits exactly `nvim`, `vim`, and `vi`. A path, a flag, a
  whitespace- or metacharacter-bearing value, or a case variant fails the exact
  match and is denied before any temp file is written or child is spawned, with
  no fallback to the other variable. Extending the allowlist is a deliberate,
  reviewed change.
- **`argv`-first, no shell.** The editor launches as a program plus a validated
  argument vector whose only element is the temp-file path. There is no shell
  construction, command string, quoting, joining, expansion, redirect, or
  interpolation anywhere in the path (`P0-AC-009`). A path containing spaces is
  one argument, never split.
- **Capability-gated and attributed.** Launch requires the editor capability and
  is attributed to the extension; Core authorizes per principal and enforces the
  resource limits below. An AI-layer or plugin defect cannot launch an arbitrary
  process.
- **Owned and tracked.** Core spawns the editor, records the PID, and on cancel,
  timeout, or shutdown terminates only the process tree it recorded. The
  extension cannot send arbitrary signals, and a stale handle is rejected by
  the host.
- **Bounded environment and controlled stdin.** The editor inherits a minimized
  environment without ambient credentials or a runtime administrator token, and
  it never receives a raw PTY handle. Interactive versus non-interactive
  behavior follows the execution-boundary defaults.
- **Bounded lifetime.** The editor wait is bounded by a finite timeout. The
  reviewed Core-internal implementation uses a `120 s` default with a hard
  `300 s` ceiling; a larger request is clamped. A timeout kills the recorded
  tree and returns a typed timeout outcome.
- **Typed outcome.** The launch returns a structured outcome, not a bare exit
  code: at minimum accepted, edited content returned, cancelled, denied,
  timeout, spawn failed, non-zero exit, and unavailable. Denials name the
  missing capability or the violated rule, never the payload.
- **Fail closed, no retry.** A spawn failure, non-zero exit, timeout, or crash
  leaves Terminal Truth untouched, removes the temp file, and preserves or
  discards the previous draft under the documented rule below; it never
  silently substitutes content. There is no automatic retry.

## Temp-file handling

The editor session needs a file to hand to the editor. That file can contain
sensitive text and is treated as sensitive.

- **User-only permissions.** The file is created with user-only permissions
  (`0600` on Unix-like systems, the current-user equivalent elsewhere) in a
  Bitty-owned temp root that is itself user-only (`0700`), never in a
  world-readable location. On Unix the create call itself applies the mode, and
  the mode is re-asserted after the write. The `0700` Bitty-owned root is the
  contract requirement; the reviewed Core-internal implementation still uses the
  ambient OS temp directory, so introducing the owned root is a closing gap for
  the extraction task rather than a description of current behavior.
- **Unpredictable and exclusive.** The name is unpredictable and the file is
  created with exclusive creation, so a pre-existing path or symlink cannot be
  followed or overwritten. The reviewed implementation retries a bounded number
  of times on collision and never spins.
- **Regular file only.** The path resolves to a regular file under the approved
  temp root; devices, sockets, procfs, sysfs, devfs entries, and symlink escapes
  are rejected (`P0-AC-005`).
- **Bounded.** The temp file has a finite maximum size enforced at write and at
  read-back, matching the edit-buffer bound (`64 KiB` in the reviewed Core
  implementation). An oversize buffer is refused and the file is removed.
- **Extensionless and short-lived.** The file carries no handler-associated
  suffix, exists only for the editor session, is never a persistence path,
  never indexed, and never reused across sessions.
- **Never logged.** Temp-file contents and paths are not written to traces,
  diagnostics, or crash reports by default (`P0-AC-026`).
- **Always cleaned up.** Core removes the file on success, on cancel, on editor
  failure, on plugin unload, and on the next Core start after a crash. Cleanup
  is structural and Core-owned, not left to the extension; removal failure is
  reported, not silently ignored.

Non-Unix confidentiality is a documented residual: a safe-Rust
`forbid(unsafe_code)` crate cannot set a restrictive OS ACL portably, so the
file inherits the per-user temp-directory ACL. Fail-closed ordering and
guaranteed cleanup are the platform-uniform guarantees.

## PTY submission and cancellation

- **One submission path.** Submit writes the accepted buffer to the focused
  panel's PTY through the capability-gated terminal input API, attributed to the
  extension and gated by the panel lease write rule (`P0-AC-039`). The extension
  never writes a raw PTY handle.
- **Cancel is a no-op on the PTY.** A cancelled paste, cancelled editor session,
  or cancelled submit writes nothing to the PTY and leaves Terminal Truth
  unchanged.
- **Fail closed.** If inspection, capability, lease, or consent fails, the paste
  or submit is denied with a typed outcome and no partial write.
- **Cancellation releases everything.** Cancel releases capture, terminates only
  the recorded editor process tree, removes the temp file, and returns focus to
  the panel. Cancel is available from the user at all times.
- **Buffer disposition.** Submit clears the buffer after a successful write.
  Cancel discards the unsubmitted buffer. A failed editor round trip preserves
  the previous draft rather than substituting partial or empty content. This
  decision is bounded by the rule that Terminal Truth is never reconstructed
  from terminal content.
- **Crash containment.** A plugin crash cannot corrupt Terminal Truth, leak a
  temp file, or hold input capture. A lost in-progress buffer is acceptable.
- **No default retry.** A failed edit, paste, or submit is not retried
  automatically; re-execution is an explicit user or plugin action.

## No-plugin behavior

- **Core keeps a usable command line.** Until the extraction, and thereafter
  whenever the extension is absent, disabled, failed, or incompatible, Core
  retains its own edit and submit behavior. The terminal remains usable with
  zero plugins and in `bitty --safe` (`P0-AC-019`).
- **Rollback is disabling, not a bypass.** Disabling, uninstalling, or failing
  to load the extension falls back to the retained Core mechanism; there is no
  private first-party path and no silent degradation.
- **Compatibility fails closed.** A host API version or capability mismatch
  disables the extension with a diagnostic and no partial activation, never a
  blind load or privilege escalation.

## API ownership and versioning

Ownership follows the authority split recorded by
[ADR 0009](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md):
the reviewed contract is normative in the documentation corpus; the executable
Core and SDK surfaces are parity evidence and may not add or rename identifiers
without a documentation revision.

| Artifact                                                | Normative owner                                   | Versioning rule                                                                                                |
| ------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Composer architecture and host-API contract (this page) | bitty-terminal-docs (`W-82`)                      | Revised by a reviewed change in this repository; it may not weaken `W-73` or a P0 control.                     |
| Focusable-overlay and transient input-capture host API  | bitty-docs (`W-01`, Issue #396, under `OQ-056`)   | Additive and versioned; new identifiers require the owning contract; may not break the frozen v1 surface.      |
| Core host-API implementation and parity evidence        | `bitty` (Core host-API tasks; extraction `W-103`) | Must match `W-01` and this page; executable parity evidence required; may refine mechanics, never names.       |
| SDK binding for the overlay, input, process, temp APIs  | bitty-plugin-sdk (`W-120`, CarryCtx `CTX-0065`)   | Derived from `W-01`; may not invent identifiers.                                                               |
| `composer` plugin package                               | `composer` plugin task (`CTX-0003`)               | Package semver; the manifest declares the required host API and compatibility; no private first-party surface. |

The v1 surface is frozen. The Composer needs additive v2 capability identifiers
and host operations; the Composer-facing identifiers below are this contract's
proposal and are provisional until `W-01` accepts the host contract, because the
host primitive spelling is co-owned. If `W-01` chooses different spellings, this
page is revised in the same change and no implementation may cite the
provisional spelling. The identifiers extend the accepted deny-by-default
families and add no wildcard and no family-wide grant:

| Capability              | Grants                                                                         | Distinct from                                                          |
| ----------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `ui.overlay.focus`      | A focusable overlay and bounded transient input capture for one modal session. | v1 `ui.overlay` (presentation-only, non-focusable).                    |
| `terminal.input.submit` | Bounded buffer submission to the focused panel's PTY through the paste path.   | v1 `terminal.input.self`/`terminal.input.all` and `terminal.raw-read`. |
| `process.editor`        | Launch the allowlisted external editor and manage its owned PID tree.          | unconstrained `process.spawn`; no arbitrary program.                   |

The editor temp file is authorized by `process.editor` for the session only; it
does not grant general `fs.write` access, and the path never leaves Core.

Composer-facing host operations (provisional names, host-owned semantics):

| Operation               | Shape (provisional)                               | Host owner        |
| ----------------------- | ------------------------------------------------- | ----------------- |
| Acquire focus + capture | `bitty.overlay.acquire(spec) -> handle`           | `W-01`            |
| Update overlay content  | `bitty.overlay.update(handle, spec) -> boolean`   | `W-01`            |
| Poll or receive events  | `bitty.overlay.poll(handle)` / event subscription | `W-01`            |
| Release focus + capture | `bitty.overlay.release(handle)`                   | `W-01`            |
| Submit buffer to PTY    | `bitty.terminal.submit(text) -> outcome`          | `W-01`, Core host |
| Start editor round trip | `bitty.process.editor.start(path) -> outcome`     | `W-01`, Core host |

Rules:

- **Additive within v1.** The overlay, capture, submit, and editor operations
  are introduced additively; existing accepted v1 behavior is not broken and
  unknown future fields are ignored.
- **Declared compatibility.** The plugin manifest declares the host API version
  it requires; Core validates compatibility before activation and disables the
  plugin with a diagnostic on mismatch.
- **One normative text.** There is no divergent copy: the accepted contract
  lives in the documentation corpus, and the executable types are parity
  evidence.
- **No invented authority.** Contract, implementation, and SDK generation
  authority stay distinct exactly as ADR 0009 fixed them.

## Limits and failure modes

Every dimension the extension can grow is bounded and enforced by Core, with
attribution to the extension (`P0-AC-014`). The values below are the reviewed
Core-internal implementation evidence where noted; the binding requirement is
that a finite limit exists before the corresponding implementation lands, and
the numbers are re-confirmed with `W-01` for the host surface.

| Dimension                   | Finite bound (evidence where noted)                               | Failure mode                                                  |
| --------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| CommandBuffer / edit buffer | `64 KiB` (`COMPOSER_MAX_BYTES`)                                   | Insert fails closed, buffer kept as-is                        |
| Submit frame                | content `+ 13` bytes                                              | Typed too-large outcome before framing, nothing emitted       |
| Paste payload               | Core paste limit, inspected before use                            | Denied or truncated by one documented rule, prior buffer kept |
| Focusable overlay content   | Bounded node count and serialized size per update                 | Update rejected, previous content kept                        |
| Input capture queue         | Bounded depth, rate, and per-event size; no hot-path work         | Overflow fails open to the terminal without a callback        |
| Editor wall clock           | `120 s` default, `300 s` hard ceiling (`EDITOR_TIMEOUT_MAX`)      | Kill owned tree, typed timeout outcome                        |
| Editor program              | Closed allowlist of three bare names                              | Typed not-allowed before any temp file or child               |
| Editor temp file            | `64 KiB`, `0600` in `0700` (owned root planned), exclusive create | Typed write/too-large failure, file removed                   |
| Per-plugin budgets          | CPU, memory, tasks, callback time, and queue depth                | Core per-plugin enforcement (Isolation and Resource RFC)      |

An over-limit operation is denied or truncated with the previous state intact;
it never silently drops correctness or escalates authority.

## Migration and rollback

- **Core keeps the behavior until the gates pass.** Extraction does not start
  before `W-01`, `W-73`, and this contract are complete. Core retains a working
  edit and submit path throughout.
- **Dependency order.** Decide the host contract (`W-01`) and this architecture;
  land Core host-API and SDK surfaces; then extract (`W-103`) and ship the
  `composer` plugin (`CTX-0003`). No step cites this page as authorization to
  move code.
- **Additive API, fail closed on mismatch.** Host API growth is additive; a
  version or capability mismatch disables the plugin with a diagnostic and no
  partial activation, rather than silently degrading or escalating.
- **Rollback is non-destructive.** Rolling back the extension is disabling it.
  There is no destructive migration of terminal state, the retained Core path is
  the fallback, and rollback introduces no private first-party path.
- **Parity is proven, not assumed.** The first-party Composer uses the same
  public API as a third-party extension; the parity suite denies the same
  operations for both.

## Current implementation status

No part of this contract is implemented as an extension or as the public host
API. There is no focusable overlay, no transient input-capture host API, no
`ui.overlay.focus`, `terminal.input.submit`, or `process.editor` capability, and
no SDK binding. The `composer` repository/package is a metadata-only scaffold
and is not evidence of implementation.

Source-reviewed `Implemented-only` Core-internal evidence exists in the `bitty`
repository and is the behavior the extraction would later replace; it is not
`Verified`, not `Compatible`, and not the extension:

- The headless Composer engine lives in `crates/bitty-rich/src/composer.rs`:
  `CommandBuffer` with `BufferError` and the `64 KiB` cap, `ComposerSession`,
  composer keys and chords, `frame_submit`, `resolve_editor` over the
  `nvim`/`vim`/`vi` allowlist, `write_composer_temp`, and the `TempComposerFile`
  RAII guard.
- The app wires a Core-internal Composer modal through
  `crates/bitty-terminal/src/chrome_keys.rs` (`OpenComposer` ->
  `cw_composer_open`, modal routing, bracketed-paste submit) and hosts the
  external editor as an ordinary PTY grid leaf through
  `crates/bitty-terminal/src/editor_host.rs` (`ExternalEditorHost`,
  `write_composer_temp`, ownership of at most one session). This is Core-internal
  routing above the user keymap, not the public focusable-overlay and
  transient-capture host API.
- Tests exist under `crates/bitty-rich/tests/` and
  `crates/bitty-terminal/src/tests.rs` (hostile editor denied without side
  effects, single-session cleanup, round trip), consistent with the limits
  above. Passing tests are parity evidence for the mechanic, not acceptance of
  this contract.

Contract versus the reviewed Core-internal behavior (gaps a host-API and
extraction task must close; none weakens a control, and none is authorization):

- No Bitty-owned `0700` temp root exists yet: the reviewed implementation
  creates the `0600` file under `std::env::temp_dir()`.
- The editor child is not yet spawned with the minimized environment and
  closed-stdin default of the execution boundary; the reviewed blocking
  primitive inherits stdio and the ambient environment, and the panel-hosted
  path runs the editor in an interactive PTY leaf.
- The editor timeout kills only the direct child (`child.kill()`), not a
  recorded whole process tree.
- Submission, capture release, and buffer disposition are Core-internal
  mechanics, not the typed host outcomes this contract requires.

This status was read from the workspace `bitty` checkout at short revision
`5670d9ae` (2026-10-02, `main`) and is bounded to source inspection. The
[Semantic Terminal RFC](semantic-terminal-rfc.md) records the earlier
`Implemented-only` slices and an older current-state note; where the two
conflict, this page is the newer reviewed status, and the Semantic Terminal RFC
stays a draft interaction proposal that authorizes nothing.

## Security review

The Composer touches input capture, paste, process launch, and temporary-file
trust boundaries. Independent security review is required before this contract
merges. Reviewers must confirm that:

- the Composer is an extension using only the public, capability-gated API, with
  no private first-party bypass, no raw PTY, GPU, or window handle, and no input
  hot-path callback (`P0-AC-012`, `P0-AC-015`);
- Core retains Terminal Truth, the input pipeline, paste inspection, the panel
  lease write gate, and the permission and resource gate (`P0-AC-008`,
  `P0-AC-016`, `P0-AC-039`);
- the external-editor launch is `argv`-first with validated arguments and no
  shell construction or interpolation, and the temp file uses user-only
  permissions, exclusive creation, regular-file-only resolution, bounded size,
  and guaranteed cleanup (`P0-AC-005`, `P0-AC-009`, `P0-AC-026`);
- capture acquisition and release are Core-owned, transient, bounded, and
  guaranteed even on plugin crash, and can never pin input;
- safe mode and zero-plugin startup retain a usable command line
  (`P0-AC-019`).

The focused `W-01` contract and the `composer` plugin implementation each
require security review again before their own merge.

## Verification plan

This is a contract specification; it has no executable verification of its own.
Any later implementation must prove, at minimum:

1. **Ownership and no bypass.** The first-party `composer` extension uses the
   same public, capability-gated API as any third-party extension; the parity
   suite denies the same operations for both; no private first-party path
   exists.
2. **CommandBuffer is bounded.** An insert or paste past the cap fails closed
   with the previous buffer intact; a framed submit past the cap emits nothing.
3. **Paste stays inspected.** Suspicious paste content (C0 controls, NUL, ESC,
   CR, embedded newline, suspicious Unicode controls) triggers inspection and
   confirmation; the extension cannot bypass the inspector or write the PTY
   directly.
4. **Capture is transient and guaranteed.** After cancel, submit, focus switch,
   plugin disable, plugin crash, and Core-side timeout, terminal input is
   restored, capture is released, and no captured event reaches the terminal
   unintentionally.
5. **No hot-path execution.** Input and paste tests show no synchronous plugin
   callback on the input, parser, or render hot path.
6. **Editor launch is `argv`-first.** Adversarial editor values and path-shaped
   arguments are passed as single validated arguments; no shell is invoked and
   no metacharacter is interpreted; a value that cannot be a single argument is
   rejected before any side effect.
7. **Temp files are safe and removed.** The file is mode `0600` in a `0700`
   root, created exclusively, bounded, rejects symlinks and non-regular files,
   never appears in logs, and is removed on success, cancel, failure, and the
   next start after a crash.
8. **Budgets and deadlines are enforced.** Each resource dimension has a trigger
   test with observable enforcement and correct plugin attribution; an
   over-limit operation is denied with the previous state intact.
9. **Compatibility fails closed.** A version or capability mismatch disables the
   plugin with a diagnostic and no partial activation.
10. **Rollback is safe.** Disabling or uninstalling the plugin restores the
    retained Core behavior; safe mode and zero-plugin startup still accept input.
11. **Documentation gates pass.** The repository-local `just check` passes with
    zero issues.

## Alternatives considered

| Alternative                                                            | Disposition                                                                                                                              |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Keep the Composer inside Core as a Core feature or library             | Rejected by the `W-73` boundary: it leaves optional policy in the small core and contradicts the extension decision.                     |
| Depend only on the existing non-focusable `overlay` slot               | Rejected: a presentation-only, non-focusable slot cannot host an editable line or receive input.                                         |
| Let the extension capture input directly or register an input callback | Rejected: it would put a plugin on the input hot path and let a faulty extension pin the terminal.                                       |
| Let the extension write the PTY directly or hold a raw PTY handle      | Rejected: it bypasses paste inspection, Terminal Truth ownership, and the capability and lease gates.                                    |
| Launch the editor through a shell command string                       | Rejected: shell interpolation is the injection class the process controls exist to prevent.                                              |
| Accept any `$VISUAL`/`$EDITOR` value as the program                    | Rejected: the environment is attacker-influenced; the exact bare-name allowlist bounds the executed surface.                             |
| Keep the editor temp file world-readable or let the plugin clean it up | Rejected: the file can contain secrets; it needs user-only permissions, exclusive creation, a bounded size, and Core-guaranteed cleanup. |
| Extract before `W-01`, `W-73`, and this contract exist                 | Rejected: the host API and interface would be invented by implementation instead of decided by contract; extraction stays gated.         |

## Affected contracts

- [Composer Boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/composer-boundary.md)
  (`W-73`): this page supplies the terminal-side architecture and exact surface
  it delegates; `W-103` remains gated on `W-01`, `W-73`, and this page.
- [ADR 0015](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md)
  and
  [ADR 0016](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md):
  the extraction constraints and the execution defaults reused here are
  unchanged.
- [Small-core refactor execution handoff](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/handoff/2026-10-02-small-core-refactor.md):
  `W-82` now has its architecture contract; the dependency order is unchanged.
- [Specification register](README.md): routes to this document.
- [Semantic Terminal RFC](semantic-terminal-rfc.md): records the Composer and
  external-editor `Implemented-only` slices; this page carries the newer
  reviewed status.
- [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md) and
  [Panel Runtime RFC](panel-runtime-rfc.md): the overlay modality and focus
  authority this contract composes with.
- Plugin-ecosystem contracts:
  [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md),
  [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md),
  [manifest and capability grammar](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/manifest-capability-authority.md),
  and
  [Isolation and Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md).

## Open points

The following details are parked, not decided, each with a named owner and
reason. No item broadens an existing global open question into a new one.

- **Exact `W-01` host primitive spellings, capture payloads, focus-order rules,
  and timeout values** owned by `W-01` (Issue #396, under `OQ-056`); the
  Composer-facing identifiers in this page are provisional until `W-01`
  accepts its contract.
- **Delivery shape and package layout** parked to `CTX-0003`: whether the
  extension ships as a Lua plugin or a Rust-level extension, and its manifest
  compatibility declaration, are decided there under this contract's
  constraints.
- **Numeric bounds for focusable-overlay content, the capture queue, and the
  paste payload** co-owned with `W-01` and `CTX-0003`: they must be finite and
  enforced, but only the edit-buffer, temp-file, and editor-timeout values are
  confirmed by current implementation evidence.
- **Editor hosting modality** parked to `W-01` and `CTX-0003`: the current
  Core-internal behavior hosts the editor as an ordinary PTY leaf; whether the
  extracted extension hosts it in a focusable overlay or keeps a PTY-leaf
  editor is an extension policy that must preserve this contract's process and
  temp-file controls.
- **Plaintext sensitivity of the editor temp file** parked to the security
  review and `CTX-0003`: permissions, bounded size, no-logging, and guaranteed
  cleanup are binding; whether additional minimization is required is assessed
  at review.
- **Capture interaction with IME and copy mode** owned by the input-pointer,
  IME, and search contracts; this page requires no second channel and does not
  redefine those interfaces.
- **Non-Unix temp-file confidentiality** remains a documented residual until a
  safe ACL mechanism is available.

## Acceptance criteria

- The Composer is stated to be a first-party extension consuming the public
  focusable-overlay and transient input-capture host API, with Core's retained
  mechanisms explicit.
- CommandBuffer semantics, bounded paste assembly, overlay lifecycle, transient
  input capture, PTY submission, cancellation, and no-plugin behavior are
  defined.
- The external-editor allowlist and `argv`-first process lifecycle, and the
  temp-file permissions, exclusivity, boundedness, regular-file-only rule, and
  cleanup are defined.
- API ownership and versioning are explicit and additive; the provisional
  `W-01` co-owned spellings are called out.
- Limits and failure modes are finite and testable, and migration and rollback
  return to the retained Core behavior.
- The current implementation status is accurately stated as `Implemented-only`
  Core-internal evidence with a bounded revision, and nothing is described as
  an implemented extension or host API.
- The affected SDK and plugin documents are linked, the handoff and `W-73` are
  linked, and the document is self-contained with no research-repository
  references.
- The document follows the repository specification spine, and `just check`
  passes with zero issues.

## P0 Review Sign-off

| Role                 | Scope                                                                   | Requirement                                                      |
| -------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `architecture-owner` | Extension ownership, host-API dependency, and retained-Core correctness | Approve; confirms the architecture and the retained mechanisms.  |
| `security-reviewer`  | Input capture, paste, process launch, temp files, and capability gates  | Independent security review required before merge.               |
| `docs-curator`       | Taxonomy, metadata, links, terminology, and register synchronization    | Approve; confirms discoverability, self-containment, and schema. |

## References

- [bitty-terminal-docs#165](https://github.com/bitty-terminal/bitty-terminal-docs/issues/165)
  (CarryCtx `CTX-0086`, plan key `W-82`).
- [Composer Boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/composer-boundary.md)
  (bitty-docs `W-73`, CarryCtx `CTX-0262`, Issue bitty-docs#402).
- [ADR 0015 - Small-Core Extraction Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md),
  [ADR 0016 - Execution, Graphics, Accessibility, Storage, and Platform-Service Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md),
  and
  [ADR 0009 - Plugin API v1 Lua Surface Acceptance Resolution](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md).
- [Open-question register, OQ-056](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
  (the focusable-overlay and transient input-capture host API is v2 scope).
- [Small-core refactor execution handoff](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/handoff/2026-10-02-small-core-refactor.md),
  plan keys `W-01`, `W-73`, `W-82`, `W-103`, `W-120`.
- [Execution Host and Supervisor Boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/execution-host-boundary.md).
- [Security overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [threat model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  [risk register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md),
  and
  [P0 acceptance criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md).
- [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md),
  [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md),
  [manifest and capability grammar](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/manifest-capability-authority.md),
  and
  [Isolation and Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md).
- [Terminal State RFC](terminal-state-rfc.md),
  [Panel Runtime RFC](panel-runtime-rfc.md),
  [Rich Presentation RFC](rich-presentation-rfc.md),
  [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md),
  [Input and Pointer Contract](input-pointer-rfc.md),
  [Performance Budget RFC](performance-budget-rfc.md),
  and [Semantic Terminal RFC](semantic-terminal-rfc.md).
- [Documentation workflow](../docs/development/documentation-workflow.md)
  and [documentation map](../docs/README.md).
