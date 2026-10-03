---
title: Graphics Extraction Contract
description: Terminal-side contract for the graphics decode and processing extraction boundary covering placement bounded protocol intake aggregate image budget Core-retained validation worker lifecycle and negative-path verification
category: specifications
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 68
---

# Graphics Extraction Contract

> Status: **accepted** terminal-side contract for the graphics extraction boundary.
> Frontmatter `status` is `accepted` per the repository metadata schema;
> document status is Accepted.

## Document status

This document is `Accepted` (`W-133`) as the terminal-side contract that Core and extension tasks cite for the
graphics boundary decided by
[ADR 0016](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md)
(Boundary 2). Frontmatter `status` is `accepted` per the repository metadata schema; document status is
Accepted. It states the decided decode placement, the bounded protocol
intake, the resource boundary, what Core retains, the public contract shape, and
the negative-path evidence a later implementation must produce. It does not
start, schedule, or authorize implementation; the extension repository and
worker (`CTX-0003`) and the Core integration (`W-141`, `CTX-0934`) remain their
own tasks. It does not authorize extraction, does not describe shipped behavior,
and does not weaken any normative security control.

- Owning task: `W-133` (bitty-terminal-docs), CarryCtx `CTX-0089`, Issue
  [bitty-terminal-docs#170](https://github.com/bitty-terminal/bitty-terminal-docs/issues/170).
- Predecessor boundary: ADR 0016 Boundary 2, accepted 2026-10-02 (plan key `W-130`, CarryCtx `CTX-0266`).
- Related decisions: ADR 0015 (small-core extraction boundaries),
  ADR 0013 (core ontology and identity), and DIR-021 (graphics as image
  producers over a shared composition pipeline).
- Cross-session map:
  [Small-core refactor execution handoff](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/handoff/2026-10-02-small-core-refactor.md).

The authoritative image contract stays the accepted
[Rich Presentation RFC](rich-presentation-rfc.md) (OQ-008, `IMG-1`..`IMG-9`);
this page consumes it and does not redefine or reopen it. Refusals and
deferrals for Sixel and iTerm2 stay with the recorded
[Image Protocol Decision](image-protocol-decision.md) and the
[Kitty Family Scope Decision](kitty-family-scope-decision.md).

## Purpose and scope

ADR 0016 decided that graphics decode and processing move to the reserved
`bitty-graphics` extension, including an optional bounded worker, while Core
keeps the trust decision. It parked the placement choice, framing, quotas, and
worker lifecycle to `W-133`. This page turns that park into the explicit
terminal-side contract so a Core integration task and an extension task can
cite one definition of the boundary.

In scope:

- the decided placement of decode and processing, and the statement that a
  separate repository is not a separate process;
- the bounded APC/Kitty/Sixel/iTerm2 intake and the validation that happens
  before any decode;
- the aggregate image budget, per-image and global caps, worker memory and
  output caps, timeout, crash recovery, and output re-validation before renderer
  upload;
- the `P0-AC-003` and `P0-AC-004` controls, quoted and explicitly not weakened;
- what Core retains: bounded protocol entry, image placement and resource
  policy, renderer upload validation, and Terminal Truth;
- the high-level public contract shape: decode/process request and response,
  typed failures, cancellation, and worker lifecycle;
- security review, a verification plan with negative-path evidence,
  alternatives, affected contracts, open points, acceptance criteria, and P0
  sign-off.

Out of scope and owned elsewhere:

- the `bitty-graphics` crate layout, worker binary, and package implementation
  (`CTX-0003`, on the metadata-only scaffold created under `CTX-0001`); this
  page names the owner but decides no content of that package;
- the Core integration that consumes the extension (`W-141`, `CTX-0934`);
- final wire encoding, exact identifier spellings, and manifest schema, which
  stay provisional here until the extension contract accepts them;
- protocol admission for Sixel and iTerm2, which stays with the recorded
  refusal/deferral and any later scoped admission task;
- the renderer's scene composition, z-order, and present path, owned by the
  accepted [Rich Presentation RFC](rich-presentation-rfc.md) and the graphics
  and appearance model;
- platform transparency, blur, and appearance policy, owned elsewhere.

## Normative sources this specification must not weaken

This contract must be read together with, and must not weaken:

- The bitty-docs security corpus:
  [security overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [threat model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  [risk register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md),
  and
  [P0 acceptance criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md).
  The binding controls include graphics decompression limits (`P0-AC-003`),
  the aggregate image-store budget (`P0-AC-004`), deny-by-default local file
  loading (`P0-AC-005`), capability-checked host APIs and official-plugin
  parity (`P0-AC-012`), per-plugin resource budgets (`P0-AC-014`), hot-path
  exclusion (`P0-AC-015`), Core-owned Terminal Truth (`P0-AC-016`), and safe
  mode (`P0-AC-019`).
- [ADR 0016](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md)
  Boundary 2 and its binding constraints, especially the rule that a standalone
  crate is not process isolation and that graphics enforce pre-allocation and
  aggregate budgets.
- [ADR 0015](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md):
  the bootstrap fence, no private first-party bypass, and no raw PTY, GPU, or
  window handle.
- The accepted [Rich Presentation RFC](rich-presentation-rfc.md): the
  `ImageStore`/`ImagePlacement` model, the `Image != Cell` rule, the decode
  pipeline, and the `IMG-1`..`IMG-9` ceilings, which this page quotes and does
  not reopen.
- The accepted [Performance Budget RFC](performance-budget-rfc.md): image
  decode runs off the parser, render, and input hot paths.
- The accepted [Terminal State RFC](terminal-state-rfc.md) and
  [Workspace Compositor Specification](workspace-compositor.md): Terminal Truth
  ownership and the `PanelId != ViewId != TerminalId` identity separation.
- The recorded [Image Protocol Decision](image-protocol-decision.md) and
  [Kitty Family Scope Decision](kitty-family-scope-decision.md): Kitty is the
  admitted protocol, Sixel is refused, and iTerm2 is deferred behind a demand
  and security gate.
- The accepted plugin-ecosystem contracts that bound any extension packaging:
  [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md),
  [Isolation and Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md),
  and the [manifest and capability grammar](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/manifest-capability-authority.md).

## Terminology

| Term                   | Meaning in this document                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Graphics extension     | The reserved Rust-level component `bitty-graphics` that owns decoder and codec processing, texture-preparation mechanics, and the decode worker lifecycle.   |
| Decoder                | The code that turns one bounded, admitted payload and its declared dimensions into a normalized RGBA8 frame.                                                 |
| Decode worker          | The bounded execution shape that runs decode outside the Core address space, owned by the graphics extension, and whose memory and output Core never trusts. |
| Bounded intake         | The Core parser path that accepts a protocol payload under fixed caps and rejects it before any large allocation.                                            |
| Image store            | Core-owned, bounded collection of decoded images keyed by a stable `ImageId`, with FIFO eviction under the aggregate budget.                                 |
| Placement              | Core-owned record binding an `ImageId` to grid geometry, z-order, clipping, and scroll behavior.                                                             |
| Decoded output         | The `width * height * 4` RGBA8 bytes a decoder returns, plus the declared width, height, stride, and pixel format.                                           |
| Aggregate image budget | The total decoded bytes and image count across all protocols and terminals of one window (`IMG-4`, `IMG-5`).                                                 |
| Pre-allocation check   | The checked-arithmetic validation that rejects a declared size, dimension, stride, or buffer length before the refused bytes are allocated (`P0-AC-003`).    |
| Pre-upload validation  | Core's re-validation of a decoder's returned dimensions, stride, and buffer length immediately before the renderer uploads it.                               |
| Terminal Truth         | Parser state, grid semantics, cursor state, modes, and canonical scrollback; mutable only by Core.                                                           |
| Worker supervisor      | The Core-side mechanism that owns worker launch, deadlines, crash detection, restart bounds, and teardown; it does not trust worker output.                  |
| Framing                | The length-prefixed request and response envelope exchanged with a decode worker, with fixed-width length fields validated before any allocation.            |
| Typed failure          | A structured result naming the violated bound or capability, never a bare boolean, panic, or partial decode.                                                 |
| Generation fencing     | The rule that a stale request, placement, or worker handle is rejected by the owner itself rather than trusted from the caller.                              |
| Safe mode              | `bitty --safe`, which starts with zero third-party plugins and no optional extension; the terminal remains usable and image decode fails closed.             |

## Placement decision

**Decided placement (W-133):** image decode and processing move to the
`bitty-graphics` Rust-level extension, and the decode step runs in a **bounded
worker process** owned and supervised by that extension. Core calls the
extension only through one public, capability-gated request/response contract
and keeps the trust decision. The extension crate may also expose an in-process
decode entry for tests and headless harnesses, but that entry obeys the same
bounds and is not a privileged path.

The rationale for choosing a worker as the decode execution shape over a
plain in-process crate:

- Decode is the decompression-bomb and malformed-codec surface (`R-002`,
  `T-02`). A worker gives crash containment and prompt memory reclamation on a
  codec fault that an in-process Rust panic or allocator spike does not.
- The accepted pre-allocation checks already bound the declared output, so a
  worker is a defense-in-depth execution boundary, not the primary limit.
- The worker shape makes "the decoder's own memory is not trusted" concrete:
  Core re-validates returned output before upload, independent of location.

**A separate repository is not a separate process.** Naming or creating the
`bitty-graphics` repository, or moving the decoder into its own crate, adds no
isolation and changes no trust decision. Only the bounded OS-process boundary
adds crash and memory containment, and even then Core enforces framing,
deadlines, crash recovery, and output re-validation before it consumes
anything. Conversely, a repository split must not be used to claim that a
withdrawn Core check has become unnecessary.

**Framing protocol direction.** Worker communication uses a versioned,
length-prefixed envelope. Every frame starts with a fixed-width request or
response header carrying a protocol version, a request identity, a declared
command, and fixed-width length fields; the payload follows. Fixed-width
lengths are validated against the remaining frame and the declared caps with
checked arithmetic before any buffer is allocated. No frame carries a raw PTY,
GPU, window, or filesystem handle, and no field is trusted because the peer is
first-party. This is a direction, not a frozen wire format; the exact encoding
is parked to `CTX-0003`.

**Core retains the trust decision.** Regardless of worker placement, Core owns
bounded intake, image placement and resource policy, the aggregate image budget,
pre-allocation validation, and pre-upload validation. A decoder that fails,
times out, crashes, or returns malformed output cannot place an image, mutate
Terminal Truth, or bypass the budget.

**Absence and safe mode.** The extension is optional. While it is absent,
disabled, incompatible, or crashed beyond its restart bound, image decode fails
closed: the bounded intake still accepts and discards the payload safely, no
image is placed, and the terminal remains fully usable with zero plugins and in
`bitty --safe`. Removing the extension removes image decoding, not the terminal.

**Extraction is not authorized.** This page fixes the boundary a later task
builds against. It creates no repository, schedules no implementation, and
authorizes no code move. Until extraction lands, Core keeps its current
in-process decode behavior.

### Core retained versus extension-owned

| Concern                                    | Owner after extraction                     | Core retains                                                          |
| ------------------------------------------ | ------------------------------------------ | --------------------------------------------------------------------- |
| Compressed payload intake and control caps | Core bounded intake                        | Parser caps, control budget, payload and ledger bounds                |
| Decode and codec processing                | Graphics extension (`bitty-graphics`)      | Pre-allocation validation of declared size, dimensions, and stride    |
| Texture-preparation mechanics              | Graphics extension                         | Pre-upload validation of returned dimensions, stride, buffer length   |
| Decode execution and crash containment     | Bounded worker, extension-owned supervisor | Deadline, crash detection, restart bound, teardown, no partial submit |
| Placement and lifecycle policy             | Core                                       | `ImageStore`/`ImagePlacement`, eviction and refusal                   |
| Aggregate image budget                     | Core                                       | Global and per-image caps, attributed accounting                      |
| Terminal Truth                             | Core                                       | `Image != Cell`, no grid mutation                                     |
| Capability and consent                     | Core                                       | Grant, revocation, attribution, safe mode                             |

## Bounded protocol intake

Intake happens only at the Core parser boundary and only for admitted protocols.
Core validates before any decode; the extension never sees an unbounded or
un-validated payload.

### Entry points and admitted protocols

- **Kitty Graphics (admitted).** `ESC _ G ... ST` (APC `G`) is intercepted
  before the VT state machine; the control header, the base64 payload, and the
  chunked reassembly are bounded. This is the only admitted image protocol.
- **Sixel (refused).** The recorded refusal stands; `bitty inspect protocol
sixel` reports unsupported and Sixel sequences are ignored while text and
  fallbacks keep working. This page opens no Sixel path.
- **iTerm2 inline images (deferred).** No parser or decoder exists; the data
  model variant is inert. Admission requires a new scoped task with demand
  evidence and a security review.

### Intake caps and where validation happens

The accepted image contract fixes the protocol-independent upper bounds; the
reviewed Core-internal constants are the narrower observed values and are
**implemented-only evidence**, not accepted ceilings. A later implementation
must not raise an accepted ceiling, and may tighten.

| Stage                         | Bound                                                                      | Enforcement point and timing                                          |
| ----------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| APC control header            | 4096 bytes (`KITTY_APC_MAX_CONTROL_BYTES`, observed)                       | Parser, before routing the payload                                    |
| Per-transmission payload      | 4096 bytes (`KITTY_MAX_PAYLOAD_BYTES`/`KITTY_MAX_CHUNKED_BYTES`, observed) | Intake ledger, before buffering the transmission                      |
| Intake ledger (raw in-flight) | 320,000,000 bytes (`KITTY_LEDGER_MAX_BYTES`, observed)                     | Intake, before growth; single-shot evict-to-fit, chunked fails closed |
| Stalled/held non-image APC    | 64 KiB (`KITTY_APC_STALL_MAX_BYTES`, observed)                             | Parser, drops the held stream rather than buffering without bound     |
| Compressed payload per image  | 4 MiB (`IMG-1`, accepted)                                                  | Store admission and adapter, before decode                            |
| Declared pixel dimensions     | 4096 x 4096 px (`IMG-2`, accepted)                                         | Before allocation; checked arithmetic                                 |
| Decode peak memory per image  | 64 MiB (`IMG-3`, accepted, `width x height x peak_bytes_per_pixel`)        | Before allocation; checked arithmetic, overflow-safe                  |
| Raw uncompressed claim        | exact `s x v x channels`, validated against `IMG-2`/`IMG-3`                | On the first chunk, before any payload byte is buffered               |

Validation ordering is fixed:

1. Protocol identification and control-header budget.
2. Per-transmission payload cap; chunked and single-shot transmissions share
   one cap, and growth past the ledger cap fails closed with nothing stored.
3. Declared dimension, stride, and decoded-length checks with checked
   arithmetic, before any large allocation.
4. For undefined-size encodings (PNG and any compressed stream), a bounded
   decode in the extension, after the intake caps above.
5. Core re-validation of the returned output before upload.

A future adapter admits a new protocol only through this same ordered path. An
adapter that decodes before validating, buffers an undeclared stream without
bound, or writes pixels directly is non-conforming.

## Resource boundary

### Per-image and global caps

The accepted ceilings are quoted from the [Rich Presentation
RFC](rich-presentation-rfc.md) and are not weakened here:

| ID    | Dimension                         | Accepted ceiling                                | Enforcement point                         |
| ----- | --------------------------------- | ----------------------------------------------- | ----------------------------------------- |
| IMG-1 | Max compressed payload per image  | 4 MiB                                           | Intake and store admission, before decode |
| IMG-2 | Max decoded dimensions per image  | 4096 x 4096 px                                  | Before allocation                         |
| IMG-3 | Max decode peak memory per image  | 64 MiB, overflow-checked                        | Before allocation                         |
| IMG-4 | Max total image-store bytes       | 256 MiB per window, all protocols and terminals | Store admission; evict oldest or refuse   |
| IMG-5 | Max image count                   | 256 per store                                   | Store admission                           |
| IMG-6 | Max animation frames per image    | 64; excess frames discarded                     | Adapter                                   |
| IMG-7 | Max total decoded animation bytes | IMG-3 x IMG-6, bounded by IMG-4                 | Store admission                           |
| IMG-8 | Max placement count per terminal  | 128                                             | Placement admission                       |
| IMG-9 | Animated frame rate               | at most 30 fps, host-throttled                  | Renderer pacing                           |

### Aggregate budget, eviction, and refusal

`P0-AC-004` is enforced by Core at store admission:

- Accounting is per window across all protocols and terminals; every retained
  byte is attributed to an origin so a noisy origin can be diagnosed.
- When admitting a new image would exceed `IMG-4` or `IMG-5`, Core evicts
  oldest-first until the image fits, or refuses the admission with a typed
  error when a single image cannot be admitted without displacing below zero.
  Silent over-budget growth is non-conforming.
- A refused admission emits no placement and consumes no image identity; an
  evicted image drops its placements deterministically.
- The worker never owns the ledger. Worker output is charged against `IMG-4`
  before it is admitted to the store, so a worker that returns more bytes than
  declared is rejected rather than accounted separately.

### Worker memory and output caps

- **Declared request budget.** Each request carries the declared width, height,
  stride, pixel format, and payload length. The worker computes the output size
  with checked arithmetic and refuses a request whose declared output exceeds
  `IMG-3` or the remaining `IMG-4` headroom, before allocating.
- **Address-space and output ceiling.** The worker's decoded-output allocation
  is capped per request at `IMG-3` (64 MiB) and its resident working set is
  capped at the same order; output beyond the declared length is truncated or
  refused, never returned as a partial image.
- **Output length is exact.** A successful response declares width, height,
  stride, and byte length, and the byte length must equal `width * height * 4`
  for the normalized RGBA8 format. Any mismatch is a typed worker-output
  failure and places nothing.
- **No ambient authority.** The worker receives only the bounded request frame.
  It holds no PTY, GPU, window, or filesystem handle and performs no network or
  file access.

### Timeout and crash recovery

- **Finite deadline.** Every request carries a finite decode deadline; a request
  that does not complete within it is cancelled, and the in-flight request
  fails closed with no partial output and no placement.
- **Supervisor-owned teardown.** The Core-side supervisor terminates only the
  worker process it recorded for that request; it never signals an unrelated
  process. Teardown is idempotent.
- **Crash containment.** A worker crash or a malformed frame fails the in-flight
  request with a typed unavailable/crashed failure, releases its budget
  reservation, and leaves the image store, placements, and Terminal Truth
  unchanged.
- **Bounded restart.** The supervisor restarts a crashed worker under a bounded
  backoff and attempt count. Past the bound, decode fails closed and the
  terminal stays usable; it never restarts without bound or escalates to a
  different execution path.
- **No default retry of a user request.** A timed-out or crashed decode is not
  silently retried; re-decode is an explicit caller action under the same
  bounds.

### Output re-validation before renderer upload

Core validates the worker output on return and again immediately before the
renderer uploads:

1. Dimensions are nonzero and within `IMG-2`; the pixel count is within the
   area bound with checked arithmetic.
2. The declared stride is consistent with the width and format, and the buffer
   length exactly matches the dimensions and format.
3. The image fits the remaining aggregate budget.
4. At upload, the renderer rejects a blit whose destination span is zero or
   whose byte length does not equal `width * height * 4`, and rejects a blit
   over the device texture limit. Each rejection is counted and fails closed.

The reviewed Core-internal `ImageBlit::try_new` (nonzero span plus exact
`width * height * 4` byte length with checked arithmetic) and the fail-closed
device-texture-limit gate are **implemented-only evidence** for this step; the
binding requirement is that the check exists and fails closed regardless of
decoder placement.

## P0-AC-003 and P0-AC-004 (quoted, not weakened)

This page quotes the two P0 controls verbatim from the
[P0 acceptance criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md)
and does not weaken, narrow, or reinterpret them.

### P0-AC-003 Graphics decompression limits

> - Given a compressed graphics payload whose decoded size, pixel dimensions, or
>   aggregate image-store contribution would exceed budgets,
>   when Bitty evaluates it before allocation,
>   then the payload is rejected before any large allocation occurs.
>
> Verification: adversarial + unit.
> Pass threshold: decompression-bomb tests prove rejection happens
> pre-allocation (peak memory stays under the declared budget).

This contract keeps the check in Core even after decode moves to the extension.
The declared decoded size, pixel dimensions, stride, and buffer length are
evaluated with checked arithmetic before the extension allocates, and the
returned output is re-validated before upload. A worker cannot move, delay, or
waive the decision.

### P0-AC-004 Aggregate image-store budget

> - Given repeated valid images accumulating toward the total image-store budget,
>   when new images are requested,
>   then oldest/excess content is evicted or refused and total stored bytes stay
>   within budget.
>
> Verification: integration.
> Pass threshold: sustained-load test holds the budget invariant with bounded
> memory growth.

This contract keeps the ledger and eviction policy in Core and charges worker
output against `IMG-4` before admission. A worker response larger than its
declaration is refused, not accounted separately, so sustained load cannot grow
the store past the budget.

Neither control is reopened by this page; a conflict discovered during review is
returned to revision rather than downgraded.

## What Core retains

| Retained mechanism         | Contract                                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Bounded protocol entry     | Intercept APC (and, if ever admitted, DCS/OSC) under fixed caps; reject before decode; keep the parser hot path free of extension work. |
| Image placement and policy | Own `ImageStore`/`ImagePlacement`, FIFO eviction, refusal, lifecycle generations, and alternate-screen suppression.                     |
| Resource policy            | Own `IMG-1`..`IMG-9`, the aggregate window budget, and per-origin attribution.                                                          |
| Pre-allocation validation  | Reject declared decoded size, dimensions, stride, or length that exceeds budget before any large allocation.                            |
| Pre-upload validation      | Re-validate returned dimensions, stride, and buffer length and the device texture limit before upload; fail closed otherwise.           |
| Terminal Truth             | Keep `Image != Cell`; images and placements never mutate grid, cursor, modes, or scrollback.                                            |
| Capability and consent     | Gate extension access, attribute requests, support revocation and safe mode.                                                            |
| Hot-path exclusion         | Never run decode inline on the parser, render, or input hot path.                                                                       |

No private first-party bypass is introduced. The extension reaches Core only
through the public, capability-gated request/response contract, and a
third-party consumer of the same contract is treated identically.

## Public contract shape (high level)

The following shapes are provisional direction; the exact spellings and wire
encoding are parked to `CTX-0003`. They fix the semantics a later implementation
must preserve, not a frozen API.

### Decode/process request

A request carries, at minimum: a protocol version, a request identity, the
source protocol, the transmit format, the declared width and height (optional
for self-describing encodings), the declared payload length, the declared
budget (per-request cap, remaining aggregate headroom), a deadline, and the
bounded payload bytes. A request is immutable once submitted.

### Decode/process response

A response carries, at minimum: the matching request identity, a typed status,
and on success the normalized pixel format, width, height, stride, output byte
length, and the RGBA8 bytes. A response never carries a partial frame on
failure.

### Typed failures

Failures are structured, name the violated bound or condition, and place
nothing. They mirror the reviewed Core-internal decode and admission failures as
provisional names.

| Failure              | Meaning                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| `EmptyPayload`       | No image bytes.                                                          |
| `MissingDimensions`  | A raw format arrived without both dimensions.                            |
| `ZeroDimension`      | A declared dimension is zero.                                            |
| `DimensionsTooLarge` | A side or area exceeds the declared cap.                                 |
| `DecodedTooLarge`    | Decoded bytes exceed the per-image cap.                                  |
| `LengthMismatch`     | A raw payload or returned buffer does not match the declared dimensions. |
| `MalformedImage`     | The compressed stream is corrupt or truncated; deterministic per input.  |
| `BudgetExceeded`     | The aggregate or per-request budget cannot admit the image.              |
| `Timeout`            | The decode deadline elapsed; the worker was torn down.                   |
| `WorkerUnavailable`  | No worker is available or the restart bound was reached.                 |
| `WorkerCrashed`      | The worker exited unexpectedly for this request.                         |
| `OutputMismatch`     | Returned dimensions, stride, or length disagree with the declaration.    |
| `Cancelled`          | The caller cancelled before completion.                                  |

### Cancellation

Core cancels by request identity under generation fencing: a cancel for a stale
request identity is rejected rather than delivered to a newer request. Cancel
releases the budget reservation, tears down the recorded worker if idle,
returns a typed `Cancelled`, and emits no placement. Cancel is available at all
times, including during terminal close and plugin unload.

### Worker lifecycle

- **On demand or pooled.** Workers are launched on demand or kept in a bounded
  pool; the pool size is finite and policy-owned, and there is never an
  unbounded worker count.
- **One request class.** A worker handles decode requests only and keeps no
  cross-request state; it cannot accumulate authority or cache untrusted bytes
  beyond its working buffer.
- **Idle reclamation.** An idle worker is reclaimed after a finite idle timeout
  and on terminal close.
- **Fenced handles.** A worker handle is generation-fenced; a handle for a
  retired request or worker is rejected by the supervisor, not trusted from the
  caller.
- **Fail closed.** A protocol-version mismatch, a missing capability, or a
  frame validation failure disables decode with a typed failure and no partial
  activation. Unknown future fields are ignored within the declared version.

## Security review

This contract crosses the untrusted PTY input boundary, the decode/worker
process boundary, the aggregate resource ledger, and the renderer upload path.
Independent security review is required before extraction is authorized. The
reviewer must confirm:

- `P0-AC-003` and `P0-AC-004` are quoted and unweakened, and every decode path
  enforces declared size, dimensions, stride, and aggregate budget before
  allocation;
- worker memory and output are never trusted; returned output is re-validated by
  Core before upload, and a worker defect cannot place an image or mutate
  Terminal Truth;
- a repository or crate split is never treated as process isolation, and no
  Core check is withdrawn because code moved;
- the worker receives no PTY, GPU, window, or filesystem handle and performs no
  network or file access; deny-by-default local file loading (`P0-AC-005`) is
  untouched;
- deadlines, crash recovery, restart bounds, and cancellation fail closed with
  no partial upload and no unbounded restart;
- intake remains bounded and off the parser, render, and input hot paths
  (`P0-AC-015`), and Terminal Truth stays Core-owned (`P0-AC-016`);
- safe mode and zero-plugin startup keep a usable terminal with image decode
  failing closed (`P0-AC-019`);
- no private first-party bypass exists (`P0-AC-012`).

## Verification plan

This is a contract specification; it has no executable verification of its own.
Any later implementation that cites this contract must prove, at minimum:

1. **Bounded intake.** Oversized control headers, oversized per-transmission
   payloads, ledger overflow, and held-stream overflow are rejected with no
   large allocation and no partial decode.
2. **P0-AC-003 negative paths.** An oversize compressed payload, a malformed
   stream, a decompression bomb (small payload declaring huge dimensions), and a
   dimension or size overflow are each rejected before allocation; peak memory
   stays under the declared budget.
3. **P0-AC-004 negative paths.** A sustained valid-image load under the budget
   holds total bytes and count within `IMG-4`/`IMG-5`; an over-budget admission
   is evicted or refused with a typed failure and no silent growth.
4. **Budget refusal.** A single image whose declared output cannot be admitted
   is refused with no placement, no identity consumption, and no store change.
5. **Worker memory/output cap.** A worker request whose declared output exceeds
   `IMG-3` or the remaining headroom is refused before allocation; a response
   whose byte length does not equal `width * height * 4` is a typed failure and
   nothing is placed.
6. **Timeout.** A decode that exceeds its deadline is cancelled, its worker is
   torn down, the budget reservation is released, and a typed `Timeout` is
   returned with no placement.
7. **Worker crash.** A worker crash or malformed frame fails only the in-flight
   request, leaves the store and Terminal Truth unchanged, and is recovered
   within the restart bound; past the bound, decode fails closed and the
   terminal stays usable.
8. **Malicious output.** A worker that returns malformed, oversized,
   wrong-dimension, wrong-stride, or wrong-length output cannot cause an upload;
   the renderer refuses it and counts the rejection.
9. **Pre-upload validation.** A blit whose span is zero or whose byte length
   disagrees with the destination extent, and a blit over the device texture
   limit, are refused fail-closed.
10. **No hot-path work.** Decode and worker communication never run inline on
    the parser, render, or input hot path.
11. **Terminal Truth.** No decode, placement, worker fault, or eviction mutates
    the grid, cursor, modes, or scrollback; `Image != Cell` holds.
12. **Safe mode and no-plugin startup.** With the extension absent, disabled,
    incompatible, or crashed, the terminal is usable and image payloads fail
    closed with no placement.
13. **Documentation gates.** The repository-local `just check` passes with zero
    issues.

## Alternatives considered

| Alternative                                                | Trade-off                                                                                            | Disposition                                                                                               |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Keep decode in Core and extract nothing                    | Fewest moving parts, but leaves decode policy in the small core and contradicts ADR 0016 Boundary 2. | Rejected; decode moves to `bitty-graphics` under this contract.                                           |
| Extract decode as an in-process crate only, with no worker | Simple and fast, but a codec panic or allocator spike has no crash containment.                      | Partially accepted as a test/headless entry; the decided decode execution shape is the bounded worker.    |
| Trust the worker because it is first-party                 | Removes re-validation cost, but moves the trust decision out of Core.                                | Rejected; worker memory and output are never trusted and are re-validated before upload.                  |
| Let the extension own placement, budget, or eviction       | Centralizes graphics logic, but divides the trust decision across owners.                            | Rejected; Core retains placement, resource policy, and the aggregate ledger.                              |
| Treat the repository split as process isolation            | Cheap to document, but a repository is not an OS boundary and withdraws no risk.                     | Rejected; only the bounded worker adds containment, and framing, deadlines, and re-validation still bind. |
| Decode inline on the parser or render path for latency     | Shortest path, but puts untrusted decode work on the hot path.                                       | Rejected; decode stays off the parser, render, and input hot paths.                                       |
| Admit Sixel or iTerm2 here to widen coverage               | Broader protocol support, but multiplies decoder attack surface with no demand evidence.             | Rejected; the recorded refusal/deferral stands and any admission needs its own scoped task.               |
| Let a worker restart without bound after repeated crashes  | Self-healing, but can spin and mask a persistent fault.                                              | Rejected; restarts are bounded and past the bound decode fails closed.                                    |

## Affected contracts

| Contract                                                                                                                                                        | Effect                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [ADR 0016](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md) | Consumed as the accepted boundary; this page records its terminal-side consequences only.                    |
| [Rich Presentation RFC](rich-presentation-rfc.md) (accepted)                                                                                                    | Unchanged; `IMG-1`..`IMG-9`, `ImageStore`/`ImagePlacement`, and `Image != Cell` are consumed, not redefined. |
| [Image Protocol Decision](image-protocol-decision.md) (draft)                                                                                                   | Consumed; Sixel refusal and iTerm2 deferral are not reopened.                                                |
| [Kitty Family Scope Decision](kitty-family-scope-decision.md) (draft)                                                                                           | Consumed; the scope of deferral is not extended here.                                                        |
| [Performance Budget RFC](performance-budget-rfc.md) (accepted)                                                                                                  | Unchanged; hot-path exclusion is consumed.                                                                   |
| [Terminal State RFC](terminal-state-rfc.md) (accepted)                                                                                                          | Unchanged; Terminal Truth ownership is consumed.                                                             |
| [Workspace Compositor Specification](workspace-compositor.md) (accepted)                                                                                        | Unchanged; identity separation is consumed.                                                                  |
| Core integration `W-141` (`CTX-0934`)                                                                                                                           | Gains the placement, intake, budget, and validation requirements it must implement.                          |
| `bitty-graphics` extension `CTX-0003`                                                                                                                           | Gains the worker lifecycle, framing, and output-cap constraints it must implement.                           |

## Open points

None of these is a new global open question; each is parked with its named owner.

- **Exact wire encoding and identifiers** parked to `CTX-0003`: the request and
  response field spellings, protocol version, and framing encoding.
- **Worker pool policy** parked to `CTX-0003`: pool size, idle timeout, restart
  backoff, and the default on-demand versus pooled choice.
- **In-process entry** parked to `CTX-0003`: whether the in-process decode entry
  ships for headless harnesses and how its bounds are asserted.
- **Core integration mechanics** parked to `W-141` (`CTX-0934`): how the
  supervisor is wired, where the deadline is measured, and how the store charges
  worker output.
- **Per-origin quotas** parked with the accepted RFC follow-ups: the recorded
  global FIFO store means a noisy origin can evict another origin's images;
  per-origin quotas remain a follow-up, not a change here.
- **IMG-2 side-cap wording** parked with the accepted RFC follow-ups: the
  reviewed Kitty path admits `8192` px per side within the same `4096²` area
  and `64 MiB` byte budget; the accepted `IMG-2` wording stays authoritative
  until the owning revision aligns it.
- **Sixel and iTerm2 admission** parked to a future scoped task: demand
  evidence, protocol work, and a security review are prerequisites, never
  convenience.

## Acceptance criteria

1. The placement decision states the decided decode execution shape, the framing
   direction, and that a separate repository is not a separate process.
2. Bounded protocol intake names the admitted protocol, the refused and deferred
   protocols, the caps, and the ordered validation that runs before decode.
3. The resource boundary states the per-image and global caps, the aggregate
   budget with eviction or refusal, worker memory and output caps, deadline,
   crash recovery, and output re-validation before upload.
4. `P0-AC-003` and `P0-AC-004` are quoted and explicitly not weakened.
5. What Core retains is explicit: bounded entry, placement and resource policy,
   upload validation, and Terminal Truth.
6. The public contract shape covers request, response, typed failures,
   cancellation, and worker lifecycle, with provisional names marked.
7. Security review and a verification plan with negative-path evidence cover
   oversize payload, decompression bomb, dimension overflow, budget refusal,
   worker crash/timeout, and malicious output.
8. Downstream owners `bitty-graphics` `CTX-0003` and Core integration `W-141`
   (`CTX-0934`) are named without deciding their content.
9. The page is self-contained with no research-archive reference, and `just
check` passes with zero issues.

## P0 Review Sign-off

Signed: independent security review (sign-off recorded), docs-curator review (approved), and architecture-owner scope confirmation (matches ADR-0016 Boundary 2) are recorded for this promotion. Independent security review is required before extraction is authorized. This document changes no P0 control.

| Role                 | Scope                                                                       | Requirement                                                      |
| -------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `architecture-owner` | Placement, retained mechanisms, boundary correctness, and downstream owners | Approve; confirms the worker decision and Core-retained scope.   |
| `security-architect` | Intake, worker isolation, aggregate budget, upload validation, safe mode    | Independent security sign-off required before promotion.         |
| `docs-curator`       | Metadata, links, terminology, and status honesty                            | Approve; confirms schema, discoverability, and evidence marking. |

## References

- [bitty-terminal-docs#170](https://github.com/bitty-terminal/bitty-terminal-docs/issues/170)
  (CarryCtx `CTX-0089`, plan key `W-133`).
- [ADR 0016 - Execution, Graphics, Accessibility, Storage, and Platform-Service
  Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md)
  (Boundary 2).
- [ADR 0015 - Small-Core Extraction
  Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md).
- [Small-core refactor execution
  handoff](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/handoff/2026-10-02-small-core-refactor.md),
  plan keys `W-133`, `W-141`.
- [Rich Presentation RFC](rich-presentation-rfc.md) — accepted image contract
  (OQ-008) and `IMG-1`..`IMG-9`.
- [Image Protocol Decision](image-protocol-decision.md) and [Kitty Family Scope
  Decision](kitty-family-scope-decision.md) — recorded refusal and deferral.
- [Performance Budget RFC](performance-budget-rfc.md) — hot-path exclusion.
- [Terminal State RFC](terminal-state-rfc.md) and [Workspace Compositor
  Specification](workspace-compositor.md) — Terminal Truth and identity.
- [Security overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [threat model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  [risk register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md),
  and [P0 acceptance
  criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md)
  (`P0-AC-003`, `P0-AC-004`, `P0-AC-005`, `P0-AC-012`, `P0-AC-014`, `P0-AC-015`,
  `P0-AC-016`, `P0-AC-019`).
- [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md)
  and [Isolation and Resource
  RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md).
