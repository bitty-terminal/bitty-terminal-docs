---
title: Platform Services Contract
description: Terminal-side contract for the notification URL-open and blur platform-service boundaries covering OSC notification intake redaction rate bounds permission and consent gates validated URL arguments and scheme allowlist compositor-blur ownership the adapter shape and negative-path verification
category: specifications
audience: maintainer
document_type: specification
status: accepted
website_publish: true
sidebar_order: 71
---

# Platform Services Contract

> Status: **accepted** terminal-side contract for the platform services.
> Frontmatter `status` is `accepted` per the repository metadata schema;
> document status is Accepted.

## Document status

This document is `Accepted` (`W-136`) as the terminal-side contract that
elaborates ADR 0016 Boundary 5 (platform services: accepted). Frontmatter
`status` is `accepted` per the repository metadata schema; document status is
Accepted. It fixes the
interface between the Core-retained platform-service mechanism and the
platform-service adapter that may move behind the adapter boundary: notification
intake and display handoff, URL opening, blur and window focus behavior, the
capability and consent gate, the retained Core mechanism, and the typed adapter
contract shape.

It authorizes no code and no extraction. Extraction (`W-145` / `CTX-0938`)
remains gated on this document, and the adapter implementation (`CTX-0003`,
including any `bitty-platform`-owned package) is a named downstream owner only;
its content is not decided here. The document does not describe implemented
behavior, does not authorize shipped, stable, normative, or
compatibility-guaranteed behavior, and does not weaken any normative security
control. The source-level evidence this document records is the existing
`bitty-vt`, `bitty-runtime`, and `bitty-platform` behavior reviewed read-only
against the workspace `bitty` checkout at `5670d9ae42a0`; it is
`Implemented-only`, never `Verified`, and is not the accepted adapter.

- Owning task: `W-136` (bitty-terminal-docs), CarryCtx `CTX-0092`, Issue
  [bitty-terminal-docs#167](https://github.com/bitty-terminal/bitty-terminal-docs/issues/167).
- Predecessor boundary: ADR 0016 Boundary 5, accepted 2026-10-02 under
  `bitty-docs` `W-130` (`CTX-0266`).
- Related decisions: [ADR 0015 - Small-Core Extraction
  Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md)
  (the bootstrap fence this contract inherits) and [ADR 0013 - Core Ontology
  and Identity
  Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0013-core-ontology-identity.md)
  (identity separation).
- Cross-session map: [Small-core refactor execution
  handoff](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/handoff/2026-10-02-small-core-refactor.md).

## Purpose and scope

ADR 0016 Boundary 5 accepted that the platform-service adapters - notification
delivery, URL opening, and compositor blur - move behind a platform-service
adapter boundary under focused contract `W-136`, while Core retains permission
control for each service, validated URL arguments with no shell construction or
interpolation (`P0-AC-009`), notification redaction and rate bounds, and the
rule that blur stays a platform-gated window or compositor adapter. This
document is that focused contract: it defines the exact surface the adapter
consumes, the bounds and failure behavior every implementation must preserve,
and the retained Core mechanism that survives extraction.

In scope:

- notification service: OSC notification intake (`OSC 9` / `OSC 777`, and the
  unparsed `OSC 99` form), parsing and bounds, redaction, permission and consent
  gating, rate bounds, display handoff, and failure behavior;
- URL opening service: the `OSC 8` hyperlink activation path, validated
  arguments with no shell construction or interpolation, the scheme allowlist,
  the user gesture and consent gate, and the retained Core mechanism;
- blur and window/platform events: blur as a window or compositor adapter
  responsibility, and the Core-retained permission gate and terminal-state
  association with no privileged bypass;
- what Core retains across all three services;
- the platform-service adapter contract shape: request and response, typed
  failures, capability declarations, platform capability discovery, and
  fail-closed behavior when no adapter is present;
- the security and lifecycle failure cases, the verification plan with
  negative-path evidence, and the honest implementation status.

Out of scope and owned elsewhere:

- the adapter repository or package, its platform backends, and its
  notification/URL/blur plumbing (`CTX-0003`);
- the Core extraction and integration (`W-145` / `CTX-0938`);
- the notification policy: which events notify, message text, audible versus
  visual bell, silence and do-not-disturb rules, and the OS backends
  (`OQ-076`; the current `bitty-runtime` bell and notification policy is
  `Implemented-only` input, not the accepted policy);
- the per-surface background opacity and blur contract, its platform gating,
  bounded blur radius, and presentation performance budget (`OQ-038`);
- the capability identifier grammar, grant dimensions, and version for the
  `platform` family (the manifest and capability contracts own the grammar; the
  plugin-ecosystem contracts own the surface);
- the plugin package, manifest fields, and any notification/URL plugin policy
  (`bitty-plugins-docs`, `CTX-0003`);
- title and cwd update behavior, which stays with its owning contract.

This document does not reopen the accepted Terminal Truth, hyperlink, paste,
permission, capability, or safe-mode controls. It preserves them and records
residual questions under "Open points".

## Normative sources this specification must not weaken

This contract must be read together with, and must not weaken:

- ADR 0016 Boundary 5 and its binding constraints, especially constraint 7 (no
  private first-party bypass), constraint 10 (platform services use validated
  arguments and stay bounded), and the rule that a separate repository is not
  process isolation.
- The bitty-docs security corpus:
  [security overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [threat model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  [risk register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md),
  and
  [P0 acceptance criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md).
  The binding controls include the hyperlink scheme policy and direct launch
  with no shell construction or interpolation anywhere in the path
  (`P0-AC-009`, risk `R-005`), capability-checked host APIs and official-plugin
  parity (`P0-AC-012`), exclusion from the input, parser, and render hot paths
  (`P0-AC-015`), Core-owned Terminal Truth (`P0-AC-016`), safe mode
  (`P0-AC-019`), trace minimization with typed redaction and user-only files
  (`P0-AC-026`), and trust-level admission (`P0-AC-035`).
- [ADR 0015 - Small-Core Extraction
  Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md):
  the bootstrap fence, validated arguments rather than shell interpolation, and
  the prohibition on a private first-party bypass or a raw window handle.
- DIR-017 (the Core network no-initiate invariant): a platform handoff must not
  become a Core-initiated network path, and the OS handler or notification
  backend acts on the platform side, not as a Core network client.
- The accepted [Terminal State RFC](terminal-state-rfc.md): what Terminal Truth
  is, and the rule that presentation is never truth.
- The accepted [Panel Runtime RFC](panel-runtime-rfc.md): panel identity, the
  command registry, focus routing, and capability isolation.
- The accepted [Workspace Compositor Specification](workspace-compositor.md):
  the identity hierarchy (`PanelId != ViewId != TerminalId`).
- The accepted [Performance Budget RFC](performance-budget-rfc.md): hot-path
  exclusion and no periodic timers.
- The draft [Input and Pointer Contract](input-pointer-rfc.md): the pointer
  gesture that mints a URL activation.
- The [Plugin Platform
  RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md),
  the [Plugin API v1 Lua Surface
  RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md),
  the [manifest and capability
  grammar](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/manifest-capability-authority.md),
  and the [Isolation and Resource
  RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md):
  the closed deny-by-default capability families, official-plugin parity, and
  the `RC-8` resource ceilings.

## Terminology

| Term                       | Meaning in this document                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Platform service           | One of the three terminal-to-desktop capabilities in scope: notification, URL opening, and blur.                                                                   |
| Platform-service adapter   | The optional, capability-gated side that owns platform API plumbing and platform permission discovery; a consumer of Core-authorized requests, never an authority. |
| Notification service       | The path from a terminal-originated notification request (`OSC 9` / `OSC 777`) to an admitted, redacted, bounded display handoff.                                  |
| URL opening service        | The path from an `OSC 8` hyperlink activation to a validated, scheme-checked hand-off to the platform URL handler.                                                 |
| Blur service               | The terminal window's background-blur or transparency attribute, applied by the window or compositor adapter when the platform supports it.                        |
| Focus/blur event           | A platform-reported window focus change (`WindowEventKind::Focused(bool)`) that Core maps to terminal state.                                                       |
| Permission gate            | The Core-owned decision that authorizes or denies a platform-service request before any adapter or OS effect.                                                      |
| Consent                    | The user- or embedder-facing approval distinct from a capability grant; a capability may be granted while consent is still required for a specific request.        |
| Validated argument         | An argument that has passed a closed, typed validation and is passed directly to a platform API, never interpolated into a shell string.                           |
| Capability declaration     | The adapter's statement of which platform services and platform permissions it can provide.                                                                        |
| Capability discovery       | The Core-side query of a declaration before a request is routed to the adapter.                                                                                    |
| Fail-closed                | A missing, unknown, denied, stale, or failed condition produces a typed refusal and no effect, never a default action or a privileged fallback.                    |
| Terminal-state association | The rule that a platform focus change is reflected in interoperable terminal state (focus reporting, IME preedit cleanup, drag teardown, cursor visibility).       |
| Safe mode                  | `bitty --safe`, which starts with zero third-party plugins and no optional adapter; Core mechanisms are unaffected.                                                |
| Private first-party bypass | Any non-public path, raw handle, or hot-path callback a first-party component could use but a third-party component could not; forbidden.                          |

## Architecture overview

The platform services are Core-authorized requests whose platform side may move
behind an adapter. Core classifies and bounds the untrusted input, gates the
request on capability and consent, validates every argument, and hands a typed,
already-sanitized request to the adapter. The adapter owns only the platform API
plumbing and the platform's own permission state, and it returns a typed
outcome. No untrusted terminal bytes reach a platform API unvalidated, and no
raw window, GPU, or PTY handle crosses the boundary.

```text
   untrusted terminal output / user gesture
                 │
                 ▼
        Core (always available)                         adapter (optional)
   ┌────────────────────────────────┐          ┌────────────────────────────┐
   │ OSC 9 / 777 intake + bounds     │          │ platform notification API  │
   │ redaction + RC-8 rate bounds    │  typed   │ OS URL handler             │
   │ permission gate + consent       │ request  │ compositor / window blur   │
   │ OSC 8 parse + scheme allowlist  │ ───────► │ platform permission state  │
   │ validated args (no shell)       │ ◄─────── │ platform focus reports     │
   │ gesture mint + revalidate       │  typed   │                            │
   │ focus/blur terminal association │ outcome  │                            │
   └────────────────────────────────┘          └────────────────────────────┘
       fail-closed when no adapter
```

Ownership at a glance:

| Concern                          | Adapter owns                                        | Core retains                                                        |
| -------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| Notification intake and parsing  | Nothing                                             | OSC classification, bounds, inert-on-unknown, no hot-path callback  |
| Notification redaction and rate  | Nothing                                             | Control stripping, whitespace normalization, length and rate bounds |
| Notification display handoff     | OS notification backend and its platform permission | Admitted, sanitized `DesktopNotification` handed to the sink        |
| Notification presentation policy | Which events notify, message text, silence rules    | Default-deny permission and consent gate                            |
| URL parsing and validation       | Nothing                                             | `OSC 8` parse, scheme allowlist, validated arguments, no shell      |
| URL activation and consent       | Nothing                                             | Gesture minting and consumption, revalidation, veto and timeout     |
| URL OS hand-off                  | Handler selection and spawn                         | The validated URI only; no shell; refusal counted                   |
| Blur application                 | Window/compositor API and platform gating           | Permission gate; blur is never a generic background service         |
| Window focus events              | Platform focus reporting                            | Terminal-state association (focus reporting, IME, drags, cursor)    |
| Capability and consent           | Declaration and platform permission state           | Grant, revocation, attribution, safe mode, fail-closed              |

## Notification service

### OSC notification intake

Notification intake is Core-owned, bounded, and fail-closed.

- **`OSC 9`.** The bare-text xterm form `OSC 9 ; <message>` is a notification.
  The message may contain `;` and is rejoined. The ConEmu sub-command space
  `OSC 9 ; <single digit 1..=9>` is **not** a notification: those codes are
  another protocol's commands and must not be reinterpreted as user-visible
  notifications. An empty message produces no notification.
- **`OSC 777`.** The rxvt-unicode form `OSC 777 ; notify ; <title> ; <body>` is
  a notification. Any other sub-command, a malformed segment list, or an empty
  body produces no notification; an unknown sub-command is recorded inert.
- **`OSC 99`.** The kitty notification protocol is **not parsed** today and
  must not be silently treated as `OSC 9` or `OSC 777`. Whether `OSC 99` is
  admitted is part of the open notification policy (`OQ-076`).
- **Bounds and failure.** The parser already length-bounds the OSC collector
  and every field is carried as a bounded string. A malformed or oversized
  sequence is a recoverable parser state that produces no notification; it
  never panics and never allocates unbounded. Classification and parsing never
  run on the input, parser, render, or plugin hot path.

Implemented-only evidence (`bitty` `5670d9ae42a0`): `OSC 9` / `OSC 777`
classification in `crates/bitty-vt/src/parser/dispatch.rs` (`parse_osc9_notification`,
`parse_osc777_notification`), the `Notification` and `NotificationSource`
types in `crates/bitty-vt/src/action.rs`, and the comment there recording that
`OSC 99` is unparsed.

### Redaction and rate bounds

Notification payloads are untrusted terminal observation data. Core retains the
transformation that makes them safe and bounded before any display handoff:

- **Never expanded or executed.** A notification string is never a command, a
  path, a format string, or an interpolation source.
- **Control-character stripping.** Control characters (including `BEL`, `ESC`,
  `CR`, `LF`, and other C0/C1 controls) are removed before display or delivery.
- **Whitespace normalization and length bounds.** Runs of whitespace collapse
  to a single space, and each field is truncated to a fixed character bound.
- **Redacted from logs and traces.** The raw payload is not written to logs,
  diagnostics, or traces; only a bounded, sanitized form may be surfaced, and
  only under the `P0-AC-026` minimization rules.
- **Rate bounds.** Both the bell and the notification surface are governed by
  the accepted `RC-8` ceiling of 10 events per one-second fixed window; excess
  events are dropped and counted, never queued without bound.
- **Bounded queuing.** Admitted notifications are held in a single bounded
  queue (one banner at a time); overflow drops the newest and counts the drop,
  so hostile child output cannot grow memory.

Implemented-only evidence (`5670d9ae42a0`):
`sanitize_notification_text` and `notification_banner_text` plus the
`Rc8Limiter` and `TerminalNotificationQueue` in
`crates/bitty-runtime/src/runtime/bell.rs` (`RC8_EVENTS_PER_WINDOW = 10`,
`RC8_WINDOW = 1s`, `NOTIFICATION_QUEUE_CAPACITY = 8`,
`NOTIFICATION_TEXT_MAX_CHARS = 256`); `sanitize_field` and the
`NOTIFICATION_TITLE_MAX_CHARS = 128` / `NOTIFICATION_BODY_MAX_CHARS = 256`
bounds in `crates/bitty-platform/src/notification.rs`. The exact
secret-detection policy beyond control stripping and bounding is **Open**
(`OQ-076`); it is a refinement of the retained redaction control, not a
relaxation of it.

### Permission and consent gate

Displaying a terminal-originated notification is a capability, and it is denied
by default.

- **Default deny.** A notification is not admitted unless the embedder or the
  owning configuration has opted in; the default startup posture produces no
  user-visible notification and no OS delivery.
- **Capability.** The platform capability family covers notifications; an
  extension that requests a notification uses the same public,
  capability-gated surface as any other extension, with no first-party
  privilege and no allow-all boolean.
- **Consent.** A granted capability does not by itself guarantee delivery; the
  user or embedder consent posture is part of the gate, and a missing consent
  denies the request.
- **Fail-closed.** A denied request is counted and produces no banner and no OS
  delivery; it never falls back to a default notification or a privileged path.

Implemented-only evidence (`5670d9ae42a0`): `osc_notification_allowed` and
`set_osc_notification_allowed` in `crates/bitty-runtime/src/runtime.rs`
(default `false`), consumed by `apply_notification_policy`, which counts
`notifications_denied` and returns without a display when not allowed. This is
the embedder opt-in, not the accepted plugin capability contract.

### What Core retains and what the adapter owns

- **Core retains:** intake classification and parsing; bounds; redaction
  (control stripping, normalization, length bounds, no-logging); the `RC-8`
  rate limiter; the bounded queue; the default-deny permission and consent
  gate; the in-grid banner; and the decision to admit or refuse.
- **The adapter owns:** the OS notification backend and its platform
  permission, delivery mechanics, and the presentation policy of which events
  notify, message text, and silence rules. The adapter is optional and its
  absence removes OS delivery only.

### Display handoff

Core builds an already-sanitized, bounded `DesktopNotification` from the
admitted notification and hands it to the installed notification sink. The
handoff is best-effort, non-blocking, and counted; the adapter never receives
the raw, unbounded terminal string.

- The OS backends the current evidence uses are invoked by absolute path with
  arguments only - Linux `notify-send` and macOS `osascript` - never through a
  shell, and never through `PATH` discovery.
- Delivery is reported as a typed outcome (delivered, skipped for a missing
  backend, or failed with a diagnostic); the OS may still drop a delivered
  request, which no synchronous API observes without blocking.
- The in-grid banner remains available independently of the OS sink, so the
  notification is still shown when no adapter or backend exists.

Implemented-only evidence (`5670d9ae42a0`):
`DesktopNotification`, `NotificationSink`, `OsNotificationSink`,
`OsDeliveryOutcome`, and `OsDeliverySkip` in
`crates/bitty-platform/src/notification.rs`; the runtime
`deliver_notification_to_os` path counted by `notifications_os_delivered` /
`notifications_os_undelivered` in `crates/bitty-runtime/src/runtime.rs`.

### Notification failure behavior

| Condition                             | Required behavior                                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Notification not allowed              | Denied and counted; no banner and no OS delivery.                                                   |
| Rate ceiling exceeded                 | Event dropped and counted; no unbounded queue growth.                                               |
| Queue full                            | Newest event dropped and counted; earlier events are preferred.                                     |
| Malformed or oversized sequence       | Produces no notification; parser state recovers.                                                    |
| Unknown sub-command or `OSC 99`       | Recorded inert; never reinterpreted as another protocol's notification.                             |
| No sink or missing OS backend         | In-grid banner still shows; delivery skipped and counted; no panic and no block.                    |
| Backend spawn or I/O failure          | Typed failure outcome; counted; delivery never blocks the terminal and never panics.                |
| Adapter denial or platform permission | Request denied with a typed outcome; Core banner behavior is unchanged and no privileged path runs. |

No failure case may produce a default notification, a raw payload delivery, an
unbounded queue, or a privileged path.

## URL opening service

### Activation path

The `OSC 8` hyperlink activation path is a single-use, gesture-bound chain; no
step can be substituted by terminal output or a caller boolean.

1. **Parse.** `OSC 8 ; <params> ; <URI>` is parsed into a bounded `Hyperlink`
   with an optional identifier and a URI; an empty or ending sequence clears the
   active link. The parser classifies and bounds only.
2. **Hit-test and validate.** A real primary-pointer release over a hyperlink in
   the grid of the view under the pointer resolves the exact URI for that view
   (not the primary grid at a primary-global cell), and the URI is validated
   against the platform policy.
3. **Mint and bind.** A single-use activation gesture is issued, and the exact
   URI that was validated is bound to it at mint time; a later caller cannot
   substitute a different URI.
4. **Interceptor review.** The registered `intercept.open-url` hook may veto
   the activation; a timeout is a veto, not a proceed. Terminal output cannot
   mint a gesture or clear a veto.
5. **Revalidate and consume.** Core revalidates the bound URI and consumes the
   gesture exactly once; a refusal still consumes the binding so a replayed
   activation cannot retry against a stale URI.
6. **Hand off.** Only the validated URI string is passed to the platform URL
   handler as one argument; the platform's default handler performs the open.

Implemented-only evidence (`5670d9ae42a0`): `OSC 8` parsing in
`crates/bitty-vt/src/parser/dispatch.rs`; `Hyperlink` in
`crates/bitty-vt/src/action.rs`; the gesture mint and URI binding in
`crates/bitty-runtime/src/runtime/resize.rs`; `UrlOpener` / `SystemUrlOpener`,
`authorize_url_activation`, `authorize_file_url_activation`,
`activate_pending_hyperlink`, and `spawn_validated_url` in
`crates/bitty-runtime/src/runtime/plugin.rs`.

### Validated arguments with no shell construction or interpolation

URL launching uses validated arguments, not a shell string (`P0-AC-009`). The
validation is closed and typed, and the validated value is passed directly to
the platform API:

- the URI is ASCII-only, non-empty, and at most `URL_MAX_LEN = 4096` bytes;
- it contains no control character and no whitespace;
- the scheme must be in the allowlist below;
- shell metacharacters (`'`, `"`, `` ` ``, `;`, `&`, `|`, `<`, `>`, `$`, `(`,
  `)`, `!`, `\`) are rejected anywhere after the scheme;
- a single layer of percent-decoding is applied for validation, and a
  percent-encoded control or forbidden character is rejected; malformed
  percent-encoding is rejected.
- The validated value is a crate-private wrapper (`ValidatedUrl`) so an
  external caller cannot construct one; the OS hand-off passes it as one
  argument to an executable with no shell and no string interpolation.

### Scheme allowlist

- The general activation path allows `http`, `https`, and `mailto` only.
- `file` is a **separate** path with a distinct capability and approval: it must
  be an authority-free local URI (`file:///`) that passes the traversal checks,
  and an `OSC 8 file:` URI on the general path is refused. The general path
  explicitly refuses a `file:` URI even if it passed the common validator.
- Any other scheme is refused. There is no wildcard, no user-defined scheme
  passthrough, and no fallback to the OS default for an unlisted scheme.

### Consent and permission

Opening a URL is an action the user must initiate and Core must authorize.

- **Gesture-gated.** Only a real primary-pointer activation mints the
  single-use gesture; terminal output and synthetic API calls cannot. The
  gesture is bound to the exact validated URI and consumed once.
- **Interceptor and consent.** The `intercept.open-url` hook may veto, and the
  permission/consent posture must authorize the request. A veto or timeout is
  fail-closed.
- **Capability.** An extension-initiated open uses the same public,
  capability-gated surface as any other extension (the platform family covers
  hyperlinks); there is no first-party bypass and no raw window handle.
- **Fail-closed.** No gesture, an invalid scheme, a forbidden character, an
  over-length or non-ASCII URI, a file URI on the general path, a veto, or a
  timeout all produce a typed refusal with nothing opened and a counted
  refusal.

### What Core retains for URL opening

Core retains the whole authorization chain and hands only a validated string to
the adapter:

- `OSC 8` parsing and bounds;
- the scheme allowlist and the closed argument validation;
- the single-use gesture, the exact-URI binding, and one-time consumption;
- the interceptor and consent gate and the fail-closed veto/timeout behavior;
- revalidation immediately before hand-off and refusal counting;
- the rule that no shell construction or interpolation exists anywhere in the
  path (`P0-AC-009`);
- the separate `file:` capability and approval path.

The adapter owns only handler selection and spawn mechanics for an
already-validated URI. Because a separate repository is not process isolation,
the adapter's returned data and any adapter-originated request are untrusted at
the Core boundary and are revalidated.

### URL failure behavior

| Condition                                  | Required behavior                                                                               |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| No pending gesture or already consumed     | Refused; nothing opened; refusal counted.                                                       |
| Interceptor veto or timeout                | Refused; the binding is consumed; nothing opened.                                               |
| Scheme not in the allowlist                | Refused; no OS default fallback.                                                                |
| Forbidden metacharacter or encoded control | Refused by validation; no shell is ever constructed.                                            |
| Over-length or non-ASCII URI               | Refused with a typed error.                                                                     |
| `file:` URI on the general path            | Refused; the distinct file capability/approval path is required.                                |
| Handler unavailable or spawn fails         | Typed failure; refusal counted; nothing opened and no shell fallback.                           |
| Adapter missing                            | Refused; Core parsing, validation, and gesture behavior are unchanged and safe mode still runs. |

No failure case may open an unvalidated URI, construct a shell command, fall
back to a default handler for an unlisted scheme, or bypass the gesture gate.

## Blur and window/platform events

### Blur as a window/compositor adapter responsibility

Blur is the terminal window's background-blur or transparency attribute, and it
stays a window or compositor adapter responsibility:

- **Platform-gated.** Blur is applied by the platform window or compositor
  adapter when the platform supports it; it is meaningful only with opacity
  below one, and it is never a generic background service.
- **Bounded.** The blur radius is a bounded window attribute (observed
  `0..=128` logical pixels in current evidence); an out-of-range value is
  clamped or refused, never passed through unbounded (`OQ-038` owns the accepted
  value).
- **Never a protocol concern.** No terminal protocol triggers blur, and blur is
  not implemented in a protocol or parser module. It is requested through
  configuration or an extension and gated like any other platform request.
- **No raw handle.** The adapter receives a bounded attribute value, never a raw
  window or compositor handle; no plugin can obtain a window handle.

Implemented-only evidence (`5670d9ae42a0`): `blur_radius` and
`with_blur_radius` (`min(128)`) in `crates/bitty-platform/src/app.rs`, and
`apply_blur` with per-platform backends in `crates/bitty-platform/src/blur.rs`
(Windows unsupported). This is an implemented-only window attribute, not the
accepted `OQ-038` contract.

### Focus/blur events and terminal-state association

A window focus change is a platform event that Core maps to terminal state; the
association is Core-owned and never advisory.

- The platform adapter reports focus gain and loss; Core processes it through
  the window event path.
- On focus loss, Core clears state that cannot outlive focus: an active IME
  preedit overlay is dropped and its pending key claim released, and a
  half-armed pointer release-swallow or drag is ended deterministically, so no
  stale input state survives the focus change.
- When the focused pane's mode register has focus reporting enabled (mode
  `1004`), Core emits the focus sequence to that pane's session, so the
  program that would receive input observes the focus change.
- Cursor visibility and the focus transition are associated with the pane that
  actually holds focus, never with a stale or hidden view.

Implemented-only evidence (`5670d9ae42a0`): `WindowEventKind::Focused(bool)` in
`crates/bitty-platform/src/event.rs`, and `set_focused` in
`crates/bitty-runtime/src/runtime/input.rs` (IME preedit clear, drag teardown,
mode `1004` focus-sequence emission, inspect-ring focus record).

### Core retains and no privileged bypass

Core retains the permission gate for any extension-initiated blur or
window-affecting request and the terminal-state association for focus and blur
events. The adapter applies the platform effect and reports platform state; it
never gains authority over terminal state, and its focus reports are untrusted
input that Core validates against live focus before use. There is no private
first-party channel, no raw window handle, no input hot-path callback, and no
privileged bypass. Safe mode starts with zero optional adapters and the Core
mechanisms still function.

## What Core retains

Across all three services, Core retains the mechanism extraction cannot remove:

- **The permission gate and consent** for the platform capability family
  (notifications, hyperlinks, and image-file access), with deny-by-default,
  revocation, attribution, and no allow-all boolean.
- **Validated arguments** for URL launching, with the closed scheme allowlist
  and no shell construction or interpolation anywhere in the path
  (`P0-AC-009`).
- **Notification redaction and rate bounds**: control stripping, whitespace
  normalization, length bounds, no raw-payload logging, the `RC-8` rate
  limiter, the bounded queue, and the in-grid banner floor.
- **Terminal-state association**: focus and blur events are reflected in
  authoritative terminal state (focus reporting, IME preedit cleanup, drag
  teardown, cursor visibility) for the pane that actually holds focus.
- **The single-use, URI-bound URL activation gesture** and its revalidation and
  refusal counting.
- **Blur as a platform-gated window attribute**, never a generic background
  service and never a protocol-module concern.
- **Bounded parsing, bounded queues, and safe-mode startup** with zero optional
  adapters.

## Platform-service adapter contract shape

The adapter contract is high level here; exact spellings and the
crate-versus-module-versus-repository question are parked to `CTX-0003`. The
following shape is binding.

### Request and response

- A request is typed and carries the already-validated argument (a validated
  URI, an admitted and sanitized notification, or a bounded blur/window
  attribute), the capability reference, and the consent reference.
- A response is typed and carries either a success outcome or a typed failure;
  the adapter returns no raw OS object, no handle, and no unbounded value to
  Core.
- Requests and responses never run on the input, parser, render, or plugin hot
  path, and never introduce a periodic timer.

### Typed failures

Every refusal or fault is a typed value, never a bare boolean or a bare OS
error code. The failure class set includes at least:

- capability denied or absent;
- consent required or denied;
- invalid or unsupported argument (scheme, encoding, bound, or shape);
- adapter unavailable, or the platform service or permission unsupported;
- rate-limited (the `RC-8` ceiling);
- timed out (including an interceptor timeout);
- delivery or launch failure with a bounded diagnostic.

Exact spelling is parked to `CTX-0003`; the requirement that every class is
typed and fail-closed is not.

### Capability declarations

- The adapter declares which platform services it provides (notification,
  URL opening, blur) and which platform permissions it depends on.
- The declaration is an input to the gate; it never grants authority. Core
  still checks the capability and consent for every request.
- There is no allow-all declaration and no implicit grant for an unlisted
  service.

### Platform capability discovery

- Core consults the declaration before routing a request and records the
  adapter's platform permission state.
- A service the adapter does not provide, or a platform permission it does not
  hold, is treated as unavailable and fails closed for that service.
- Discovery is read-only and never on a hot path; it does not create a second
  source of truth for terminal state.

### Fail-closed when no adapter

- With no adapter installed, disabled, crashed, or incompatible, the
  notification default-deny gate still holds and the in-grid banner remains the
  display floor; URL opening is refused; blur is not applied.
- Removing the adapter removes platform effects only. It never disables the
  Core gate, the redaction and rate bounds, the validated-argument path, the
  terminal-state association, or safe-mode startup.

## Security and lifecycle failure cases

| Failure case                                     | Required control                                                                                                     | Status         |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | -------------- |
| Malicious URL (dangerous scheme)                 | Scheme allowlist refuses it; no OS default fallback.                                                                 | Required fence |
| Shell metacharacter or encoded-control injection | Closed validation rejects it; the URI is passed as one argument with no shell.                                       | Required fence |
| Confused-deputy URI substitution                 | The gesture is single-use and bound to the exact validated URI at mint; a substitute is refused.                     | Required fence |
| Replayed activation after refusal                | The binding is consumed on refusal; a replay starts from no gesture and is refused.                                  | Required fence |
| Interceptor veto or timeout                      | Fail-closed; nothing is opened and no proceeding default is applied.                                                 | Required fence |
| Notification spam or rate excess                 | `RC-8` drops and counts the excess; no unbounded queue.                                                              | Required fence |
| Notification queue overflow                      | Newest is dropped and counted; memory stays bounded.                                                                 | Required fence |
| Secret in a notification payload                 | Control stripping, normalization, length bounds, and no raw-payload logging apply; no expansion or execution.        | Required fence |
| Unauthorized capability                          | Typed capability denial; no default effect and no privileged path.                                                   | Required fence |
| Missing consent                                  | Typed consent denial; no display and no launch.                                                                      | Required fence |
| No adapter or unsupported platform service       | Notification stays default-deny with the in-grid floor; URL open refused; blur not applied; Core remains functional. | Required fence |
| Adapter crash or unavailability                  | Platform effects are lost; Core gates, bounds, and terminal state stay correct; no dangling handle or stale launch.  | Required fence |
| Raw window, GPU, or PTY handle request           | Refused; only the public, capability-gated interface exists, and no raw window handle is exposed.                    | Required fence |
| Blur or opacity out of range                     | Clamped or refused at the bound; never passed through unbounded.                                                     | Required fence |
| Safe-mode startup                                | Works with zero adapters and in `bitty --safe`; removing the adapter removes platform effects only.                  | Required fence |
| Event-Bus publication of platform data           | Refused; platform-service payloads and raw terminal strings are not published for plugins.                           | Required fence |

No failure case may fall back to a default notification, a raw payload
hand-off, an unvalidated URL, a shell construction, a privileged path, or an
unbounded allocation.

## Implementation status

- **Accepted:** ADR 0016 Boundary 5 ownership split; this document fixes its
  terminal-side elaboration. This authorizes no implementation and no
  extraction.
- **Implemented-only evidence** (`bitty` revision `5670d9ae42a0`):
  - `bitty-vt`: `OSC 9` / `OSC 777` notification classification, `OSC 8`
    hyperlink parsing, and the `Notification` / `Hyperlink` types, with `OSC 99`
    recorded as unparsed.
  - `bitty-runtime`: default-deny `osc_notification_allowed`, `sanitize_notification_text`,
    the `Rc8Limiter` (`10`/s), the bounded `TerminalNotificationQueue` (`8`), the
    in-grid banner, the `OSC 8` gesture mint and exact-URI binding, the
    `intercept.open-url` veto/timeout gate, `authorize_url_activation` and
    `authorize_file_url_activation` revalidation, and the refusal counters.
  - `bitty-platform`: `validate_url` / `ValidatedUrl` (`URL_MAX_LEN = 4096`,
    scheme allowlist, forbidden-metacharacter and percent-decode checks),
    `validate_file_url`, the crate-private `open_url` hand-off, the absolute-path
    no-shell `OsNotificationSink`, `DesktopNotification` clamping, and the
    `blur_radius` / `apply_blur` window attribute with `min(128)`.
  - `WindowEventKind::Focused(bool)` and `set_focused` terminal-state
    association (IME preedit cleanup, drag teardown, mode `1004` emission).
    These are not `Accepted`, not `Verified`, and not wired to an accepted
    adapter.
- **Decided direction, not in code:** the platform-service adapter and its
  contract shape, capability declarations and discovery, platform permission
  discovery, and the exact crate-versus-module-versus-repository placement.
- **Not started:** the platform-service adapter (`CTX-0003`) and the Core
  extraction and integration (`W-145` / `CTX-0938`).
- **Open:** the notification policy (`OQ-076`), the per-surface opacity and blur
  contract (`OQ-038`), the accepted numeric bounds, and the capability
  identifier grammar and version.

## Security review

This contract crosses the platform, capability, hyperlink, notification, and
window trust boundaries. Independent security review is required before extraction is authorized. The reviewer must confirm:

- the permission gate, consent, and capability check stay Core-owned and are
  always available, so no enforcement point moves into the optional adapter;
- URL launching uses validated arguments only, with a closed scheme allowlist
  and no shell construction or interpolation anywhere in the path
  (`P0-AC-009`);
- the activation gesture is single-use and bound to the exact validated URI,
  and revalidation and refusal consume the binding so a replay cannot retry;
- notification payloads are redacted, bounded, never expanded or executed,
  never delivered raw, and never written to logs or traces (`P0-AC-026`);
- the `RC-8` rate bound and the bounded queue are enforced, and hostile child
  output cannot grow memory or the display surface without bound;
- blur stays a bounded, platform-gated window or compositor attribute, never a
  generic background service, never a protocol-module concern, and never
  exposes a raw window handle;
- the adapter is capability- and permission-gated, its returned values and
  requests are revalidated, and its absence or failure removes platform effects
  only;
- no P0 control is weakened, and safe-mode startup keeps zero third-party
  plugins with the Core mechanisms still functional.

No P0 control is changed by this document.

## Verification plan

This is a contract specification; it has no executable verification of its own.
Any later implementation that cites this contract must prove, at minimum, the
following, including the negative-path evidence that this contract obligates.

1. **Malicious URL.** An adversarial URI corpus of dangerous schemes, scheme
   look-alikes, credentials in the authority, and encoded delimiters is refused
   with no OS launch and no shell invocation (`P0-AC-009`, risk `R-005`).
2. **Shell metacharacter injection.** URIs carrying `;`, `&`, `|`, `$`,
   backticks, quotes, redirection, or newlines - raw and percent-encoded - are
   rejected, and no shell is constructed anywhere in the path; the launch is a
   single argument to an executable.
3. **Gesture confusion.** A URI different from the validated, bound URI cannot
   be opened with a stolen or replayed gesture; a refusal consumes the binding;
   terminal output cannot mint a gesture.
4. **Interceptor fail-closed.** A veto or a timeout leaves nothing opened, and
   no proceeding default is applied.
5. **Notification spam and rate limit.** A burst above the `RC-8` ceiling is
   dropped and counted; the queue stays bounded at its capacity; excess cannot
   grow memory or stack banners.
6. **Redaction of secrets and controls.** Control characters and encoded
   controls never reach the in-grid banner or an OS backend; over-length fields
   are truncated at the bound; the raw payload does not appear in logs or
   traces; whitespace is normalized.
7. **Unauthorized capability.** A notification, URL open, or blur request
   without the required capability or consent fails closed with a typed denial
   and no platform effect.
8. **No adapter.** With no adapter or an unsupported platform service, the
   notification gate stays default-deny with the in-grid floor, URL opening is
   refused, blur is not applied, and Core mechanisms still run.
9. **Safe mode.** With zero adapters in `bitty --safe`, all Core mechanisms
   remain functional and removing the adapter removes platform effects only.
10. **Terminal-state association.** A focus loss clears IME preedit and drag
    state and reports to the pane that actually holds focus; a focus change
    while a pane session owns the keyboard reports to that session only when
    mode `1004` is enabled.
11. **Bounds and no hot path.** An oversized payload, an out-of-range blur
    radius, and an over-length URI all fail closed at the bound; no
    notification, URL, blur, or discovery work runs on the input, parser,
    render, or plugin hot path.
12. **Documentation gates.** The repository-local `just check` passes with zero
    issues.

## Alternatives considered

| Alternative                                                  | Trade-off                                                                                               | Disposition                                                                                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Keep notification, URL, and blur behavior inside Core        | Fewer moving parts, but leaves optional platform policy in the small core and ignores DIR-001.          | Rejected by ADR 0016 Boundary 5; Core keeps the mechanism and the adapter may extract.            |
| Let the adapter decide permission or consent                 | Simpler adapter, but moves a security enforcement point out of Core.                                    | Rejected; Core retains the permission gate, validated arguments, and redaction and rate bounds.   |
| Launch URLs through a shell or command string                | Convenient handler reuse, but shell interpolation is the injection class the controls exist to prevent. | Rejected; validated arguments with no shell construction or interpolation (`P0-AC-009`).          |
| Treat `OSC 8` terminal output as an activation               | Fewer steps, but lets hostile output drive the desktop without a user gesture.                          | Rejected; only a real pointer gesture bound to the exact URI opens, and revalidation consumes it. |
| Allow any scheme and defer to the OS default handler         | Broader compatibility, but exposes dangerous schemes and file handling.                                 | Rejected; closed scheme allowlist, and `file:` on a separate capability path.                     |
| Deliver raw or unbounded notification text to the OS         | Richer text, but hostile payloads reach the platform and can blow bounds or inject controls.            | Rejected; control stripping, normalization, and fixed per-field bounds before delivery.           |
| Make blur a generic background service or a protocol feature | More ways to set it, but widens the surface and contradicts the accepted boundary.                      | Rejected; blur stays a bounded, platform-gated window or compositor attribute.                    |
| Treat the extracted adapter as process isolation             | Assumes trust by location, but a separate repository is not a trust boundary.                           | Rejected; adapter values and requests are revalidated by Core before effect.                      |
| Declare notification policy in this contract                 | Fewer open questions, but the policy is not decided and would pre-empt `OQ-076`.                        | Rejected; the policy remains Open and is parked to `OQ-076` and `CTX-0003`.                       |

## Affected contracts

| Contract                                                                                                                                                                                                                                                                  | Effect                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [ADR 0016](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md)                                                                                                           | Consumed as the accepted boundary; this contract records its terminal-side consequences and decides them.          |
| [ADR 0015](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md)                                                                                                                                       | The bootstrap fence is inherited unchanged.                                                                        |
| [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md) (draft)                                                                                                                                                                                                 | Records the implemented-only bell/notification and OSC 8 findings this contract bounds; its status is not flipped. |
| [Terminal State RFC](terminal-state-rfc.md) (accepted)                                                                                                                                                                                                                    | Unchanged; focus/blur association is reflected in Terminal Truth and presentation is never truth.                  |
| [Panel Runtime RFC](panel-runtime-rfc.md) (accepted)                                                                                                                                                                                                                      | Unchanged; the command registry and capability isolation are consumed.                                             |
| [Workspace Compositor Specification](workspace-compositor.md) (accepted)                                                                                                                                                                                                  | Unchanged; the identity hierarchy is consumed and no window handle is exposed.                                     |
| [Performance Budget RFC](performance-budget-rfc.md) (accepted)                                                                                                                                                                                                            | Unchanged; hot-path exclusion and the no-periodic-timer rule are consumed.                                         |
| [Input and Pointer Contract](input-pointer-rfc.md) (draft)                                                                                                                                                                                                                | Supplies the pointer gesture that mints a URL activation; no capture behavior is redefined.                        |
| [Accessibility Extraction Contract](accessibility-extraction-contract.md) (accepted)                                                                                                                                                                                      | Shares the platform-adapter capability and permission pattern and the no-privileged-bypass rule.                   |
| [Execution Extraction Contract](execution-extraction-contract.md) (accepted) and [Graphics Extraction Contract](graphics-extraction-contract.md) (draft)                                                                                                                  | Share the retained-Core and no-shell-execution pattern for their boundaries.                                       |
| [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md) and [Isolation and Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md) (accepted) | Unchanged; the capability families, official-plugin parity, and `RC-8` ceilings are consumed.                      |

## Open points

None of these is a new global open question; each is parked with its named
owner.

- **Notification policy** remains `OQ-076`: which events notify, message text,
  audible versus visual bell, silence and do-not-disturb rules, `OSC 99`
  admission, and OS backends. Parked to `OQ-076` and `CTX-0003`.
- **Per-surface opacity and blur contract** remains `OQ-038`: platform gating,
  the accepted bounded radius, per-surface semantics, and the presentation
  performance budget. Parked to `OQ-038`.
- **Accepted numeric bounds** parked to `CTX-0003`: the values in this page
  (`4096`, `10`/s, `8`, `256`, `128`, `0..=128`) are implemented-only evidence;
  the accepted ceilings must be fixed without admitting an unbounded
  allocation.
- **Adapter placement and package shape** parked to `CTX-0003`: whether the
  adapter is a crate, a module, or an independent repository, and its platform
  backends.
- **Capability identifier grammar and version** parked to the manifest and
  capability contracts: the `platform` family dimensions, identifier spelling,
  and API version.
- **Secret detection in notification payloads** parked to `OQ-076` and
  `CTX-0003`: whether field-level secret detection is required beyond control
  stripping, normalization, length bounds, and no-logging.
- **Platform permission surfacing** parked to `CTX-0003`: how each platform's
  own permission state is surfaced and re-checked before a request.
- **JSON-RPC-style adapter transport** is out of scope: DIR-030 governs native
  capability shape, and no transport or serialization is fixed here.

## Acceptance criteria

1. The contract elaborates the ADR 0016 Boundary 5 ownership split and states the
   retained Core mechanism explicitly.
2. The notification service defines `OSC 9` / `OSC 777` intake, the unparsed
   `OSC 99` status, parsing and bounds, redaction, the default-deny permission
   and consent gate, rate bounds, the display handoff, and failure behavior.
3. The URL opening service defines the `OSC 8` activation chain, validated
   arguments with no shell construction or interpolation (`P0-AC-009`), the
   scheme allowlist, the user gesture and consent gate, and the retained Core
   mechanism.
4. The blur and window/platform-event section defines blur as a window or
   compositor adapter responsibility and Core's retained permission gate and
   terminal-state association, with no privileged bypass.
5. The adapter contract shape defines requests and responses, typed failures,
   capability declarations, platform capability discovery, and fail-closed
   behavior when no adapter is present.
6. The negative paths (malicious URL, shell metacharacter injection,
   notification spam and rate limit, secret and control redaction, unauthorized
   capability, no adapter, and safe mode) are stated with their required
   controls.
7. Nothing is described as implemented beyond the `Implemented-only` evidence,
   and extraction is explicitly not authorized.
8. The downstream owners (the platform-service adapter `CTX-0003` / any
   `bitty-platform`-owned package, and Core integration `W-145` / `CTX-0938`)
   are named without deciding their content, and `OQ-076` and `OQ-038` remain
   Open.
9. The page is self-contained and links the ADR and handoff.
10. `just check` passes with zero issues.

## P0 Review Sign-off

Signed: independent security review (sign-off recorded), docs-curator review (approved), and architecture-owner scope confirmation (matches ADR-0016 Boundary 5) are recorded for this promotion. Independent security review is required before extraction is authorized. This document changes no P0 control.

| Role                 | Scope                                                                    | Requirement                                                                 |
| -------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `architecture-owner` | Boundary split, retained mechanism, and service correctness              | Approve; confirms the split, the retained Core list, and the adapter shape. |
| `security-reviewer`  | Capability gate, URL validation and launch, redaction, rate bounds, blur | Independent security sign-off required before promotion and extraction.     |
| `docs-curator`       | Metadata, links, terminology, status honesty, and total evidence marking | Approve; confirms schema, discoverability, and evidence marking.            |

## References

- [bitty-terminal-docs#167](https://github.com/bitty-terminal/bitty-terminal-docs/issues/167)
  (CarryCtx `CTX-0092`, plan key `W-136`).
- [ADR 0016 - Execution, Graphics, Accessibility, Storage, and Platform-Service
  Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md)
  - the accepted Boundary 5 and its binding constraints.
- [ADR 0015 - Small-Core Extraction
  Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md)
  - the bootstrap fence inherited here.
- [Small-core refactor execution
  handoff](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/handoff/2026-10-02-small-core-refactor.md)
  - the `W-136` focused contract and the `W-145` extraction disposition.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  [Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md),
  and [P0 security acceptance
  criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md)
  - the normative posture and abuse cases, including `P0-AC-009`.
- [Open-question register, OQ-076 and
  OQ-038](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
  - the notification policy and the per-surface opacity and blur contract, both
    still Open.
- [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md) - the
  implemented-only bell/notification and OSC 8 findings this contract bounds.
- [Terminal State RFC](terminal-state-rfc.md),
  [Panel Runtime RFC](panel-runtime-rfc.md),
  [Workspace Compositor Specification](workspace-compositor.md),
  [Performance Budget RFC](performance-budget-rfc.md),
  [Input and Pointer Contract](input-pointer-rfc.md),
  [Accessibility Extraction Contract](accessibility-extraction-contract.md),
  [Execution Extraction Contract](execution-extraction-contract.md), and
  [Graphics Extraction Contract](graphics-extraction-contract.md) - the
  contracts consumed by the gate, gesture, bounds, and retained-mechanism
  rules.
- [Plugin Platform
  RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md),
  [Plugin API v1 Lua Surface
  RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md),
  [manifest and capability
  grammar](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/manifest-capability-authority.md),
  and [Isolation and Resource
  RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md)
  - the capability, parity, and `RC-8` ceiling rules.
- [Documentation workflow](../docs/development/documentation-workflow.md) and
  [documentation map](../docs/README.md).
