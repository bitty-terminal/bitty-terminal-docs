---
title: Notification Banner Ownership Decision
description: Records the accepted decision that the in-grid notification banner is the Core notification primitive's display floor rather than plugin presentation, and fixes the plugin policy split and the safe-mode and no-OS behavior
category: specifications
audience: maintainer
document_type: register
status: accepted
website_publish: true
sidebar_order: 76
---

# Notification Banner Ownership Decision

## Purpose

This register answers the ownership question in
[bitty#2398](https://github.com/bitty-terminal/bitty/issues/2398) for the
in-grid notification banner that `bitty` paints for admitted notifications. It
records one disposition, the mechanism/policy split that disposition keeps, and
the safe-mode and no-OS behavior it implies. It authorizes no code, changes no
accepted ownership table by itself, closes no open question, and weakens no
normative security control.

In scope: who owns the painted banner, the plugin policy boundary, and the
display floor in safe mode and with no OS adapter. Out of scope and owned
elsewhere: `OSC 9`, `OSC 777`, and `OSC 99` intake, redaction, and rate bounds
(the accepted
[Platform Services Contract](platform-services-contract.md)); OS delivery and
its consent gate; the paste, workspace-close, and view/window-close
confirmation banners, which are safety gates; and the notification policy
`OQ-076`.

## Source identity

| Source                                                                                                                                 | Role                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [bitty#2398](https://github.com/bitty-terminal/bitty/issues/2398)                                                                      | The ownership question this record answers                                                                         |
| [ADR 0014](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md) | Accepted workspace mechanism/presentation split; the no-Core-chrome direction this record reconciles               |
| [Core and Plugin Boundaries](../architecture/core-boundaries.md)                                                                       | Accepted ownership tables and the mechanism/policy pattern                                                         |
| [Platform Services Contract](platform-services-contract.md)                                                                            | Accepted notification service, retained Core mechanism, and the in-grid banner floor                               |
| [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md)                                                                | The single modal authority and the `Messages` tier that notification surfaces consume                              |
| [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md)                                                            | Candidate inventory row that classifies the notification primitive as a Core host surface                          |
| [bitty#2341](https://github.com/bitty-terminal/bitty/issues/2341) (`fcaac331`, 0.0.25)                                                 | The change that split explicit `bitty.notify.show` from plugin command results and kept routine results off the OS |
| `bitty` `origin/main` `2e0077a1`                                                                                                       | Read-only implementation evidence for the current banner, queue, and tests                                         |

Implementation evidence (read-only, `bitty` `origin/main` `2e0077a1`):

- `crates/bitty-runtime/src/runtime.rs`: `admit_plugin_notification` (explicit
  `bitty.notify.show`, banner plus OS hand-off),
  `admit_plugin_banner_notification` (command results, banner only), the
  shared `admit_plugin_notice`, and `show_notification_banner`.
- `crates/bitty-runtime/src/runtime/present.rs`:
  `paint_bell_and_notification` and `paint_banner_pill` paint one right-aligned
  bottom pill on the present layer; grid truth, layout, and focus are never
  touched.
- `crates/bitty-runtime/src/runtime/bell.rs`: `Rc8Limiter`,
  `TerminalNotificationQueue`, `sanitize_notification_text`, and
  `notification_banner_text` bounds.
- `crates/bitty-runtime/tests/plugin_notifications_1827.rs` and
  `crates/bitty-runtime/tests/m1_bell_notification.rs` pin queue, sanitization,
  OS-gate, and routine-result behavior.

## Disposition

### Decision

**Option 1 is adopted: Core keeps the in-grid banner as the display of the
platform notification primitive.** The banner is not plugin presentation and
does not move to a plugin. Plugin policy decides whether an event notifies and
what the message says; Core decides how an admitted notification is displayed,
bounded, and gated, and keeps that display available with zero plugins and in
`bitty --safe`.

The banner is defined as the notification primitive's **display floor**: it is
shown for every admitted notification regardless of whether an OS sink exists,
and it is the only visible notification surface when no plugin VM, no OS
adapter, or both are present. "Floor" does not mean the banner is suppressed
when OS delivery succeeds; suppressing it would be a separate policy change and
is not decided here.

### What Core retains

- Intake classification and parsing for `OSC 9` and `OSC 777`, and the inert
  status of unparsed `OSC 99`.
- Control stripping, whitespace normalization, length bounds, and no
  raw-payload logging.
- The `RC-8` rate limiter, the bounded notification queue (one visible banner
  at a time), and drop accounting.
- The default-deny permission and consent gate, and the OS delivery gate for
  an admitted notification.
- The in-grid banner: one bounded pill, fixed placement and duration, no plugin
  slot, no composition, no hit-testing, and no per-surface appearance settings
  beyond the existing theme tokens.
- The decision to admit or refuse, and the counters for denied, dropped, and
  undelivered notifications.

### What plugins own

- Which events notify, when they notify, and which events stay silent.
- Message text, including title and body composition.
- Silence, do-not-disturb, and deduplication policy.
- Whether to use the explicit `bitty.notify.show` path (banner plus OS) or to
  return a command result (banner only).

A plugin does not paint the banner, choose its geometry, theme it separately, or
suppress it after Core admits a notification. No plugin read or event surface
exposes the notification queue or its text.

### Why the banner is a notification primitive, not Core chrome

The ADR 0014 no-Core-chrome rule addresses composed presentation of durable
domain state: a workspace bar, tab strip, sidebar, or pill that projects
workspace and panel identity, order, and focus. The banner differs on the three
tests that matter:

1. **Transient event versus durable state.** The banner exists only while one
   admitted notification is live and expires on a fixed timer. It projects no
   durable workspace, panel, or session state and has no composable data model.
2. **No composition policy.** There is no band reservation, no layout tree, no
   plugin slot, no hit-testing, and no user placement, color, or stacking
   policy to own. The content is the admitted notification; the bounds and
   sanitization are security controls, not style. A presentation plugin would
   have nothing to decide except the pixels Core already draws.
3. **No zero-plugin alternative.** With no plugin VM, a plugin-only banner is
   either invisible or replaced by a Core fallback. Option 2 therefore does not
   remove Core presentation; it adds a second path to the same pixels and
   leaves two owners for one surface.

The banner is kin to the visual bell and the IME preedit overlay: transient,
event-coupled feedback owned by Core, not chrome over domain state. It is not a
notification _policy_ surface; the policy remains with plugins and `OQ-076`.

### Why option 2 is rejected

| Concern                   | Consequence of moving the banner to a plugin                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Safe mode                 | `bitty --safe` has no plugin VM, so a notice would have no visible surface unless Core keeps a fallback, which recreates Core presentation and two owners.         |
| Zero-plugin baseline      | The same fallback problem appears with every plugin disabled or failed; the notification primitive would lose its visible floor.                                   |
| Notice read/event surface | Exposing notification text to every plugin holding the read capability widens the set of holders of untrusted, potentially secret-bearing text for no policy gain. |
| Round trip                | Plugin notifications already originate in a plugin; routing their text back to another plugin to paint adds latency and failure modes without adding authority.    |
| Ecosystem value           | The banner has no composable variants; there is no alternative banner ecosystem to enable, unlike bars, tabs, or sidebars.                                         |

### Ownership split with safety banners

Paste confirmation, workspace-close confirmation, and view/window-close
confirmation are safety gates, not notifications. They remain Core-owned, are
never admitted to the notification queue, are never handed to the OS, and are
never exposed through a notice read or event surface. Their `Esc` and confirm
precedence is unchanged and is outside this decision.

### Safe-mode and no-OS behavior

| Scenario                                                        | Visible surface                | OS delivery               | Notes                                          |
| --------------------------------------------------------------- | ------------------------------ | ------------------------- | ---------------------------------------------- |
| `bitty --safe`, terminal notification, consent denied (default) | None                           | None                      | Denied and counted, as today.                  |
| `bitty --safe`, terminal notification, consent allowed          | Core banner                    | None; no optional adapter | The banner is the display floor.               |
| `bitty --safe`, plugin `bitty.notify.show`                      | None                           | None                      | No plugin VM exists; the call is impossible.   |
| Zero plugins, terminal notification, consent allowed            | Core banner                    | Adapter if installed      | Same path as any other run.                    |
| Explicit plugin `bitty.notify.show`, grant held                 | Core banner                    | Adapter if installed      | The banner shows regardless of the OS outcome. |
| Plugin command result                                           | Core banner                    | Never                     | `plugin_notifications_1827` regression guard.  |
| No OS backend or adapter                                        | Core banner                    | Skipped and counted       | Never blocks and never panics.                 |
| Rate ceiling or queue full                                      | Existing bounded banner policy | Dropped and counted       | Unchanged by this decision.                    |

The explicit safe-mode/no-OS fallback is therefore the banner itself. It is not
a second, minimal presentation that a plugin could replace; it is the
primitive's only display, and the mechanism exists in every run. A denied
notification still produces no banner and no OS delivery, as today.

### Anti-rotation rules

- No `notification.banner.*` configuration key, placement setting, color
  setting, or silence setting is introduced in Core.
- No plugin slot, mount, scene, or hit region targets the notification banner.
- No plugin receives a copy of the notification queue, its text, or its drop
  counters.
- The banner is not suppressed when OS delivery succeeds.
- A future proposal to move the banner must amend this record and the
  [Platform Services Contract](platform-services-contract.md), and must state
  how safe mode and the zero-plugin baseline remain visible. A silent ownership
  change is non-conforming.

## Alternatives considered

| Alternative                                                   | Trade-off                                                                                                                         | Disposition                                                                                  |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Core keeps the banner as the primitive display (option 1)     | One owner, one visible floor, no new read surface, safe mode keeps notices                                                        | Adopted                                                                                      |
| First-party notification plugin paints the banner (option 2)  | Consistent with plugin-only chrome in appearance, but needs a notice read surface and a Core safe-mode fallback that recreates it | Rejected; it adds machinery without removing Core presentation                               |
| Plugin-only banner with no Core fallback                      | No Core chrome at all, but notices become invisible in safe mode and with no plugin                                               | Rejected; loses the accepted display floor and the default-deny notice path                  |
| Core banner, plugin-selectable theme and placement            | More customization, but recreates the Core chrome policy this decision avoids                                                     | Rejected; appearance stays theme-level, not per-surface policy                               |
| OS notification only                                          | No in-grid chrome, but headless, no-adapter, and safe-mode runs lose the notice entirely                                          | Rejected; violates the accepted no-adapter behavior                                          |
| Keep the banner but add a notice event for plugins to observe | Enables alternate displays, but widens notification-text exposure and creates a second consumer                                   | Rejected for this milestone; a future revision requires a security review and a new decision |

## Security review

- Notification payloads remain untrusted terminal or plugin observation data.
  Core redaction, normalization, length bounds, and no-raw-payload logging are
  unchanged.
- No capability, event, or plugin read surface is added by this decision. The
  set of holders of notification text does not grow.
- The default-deny consent gate and the OS delivery gate are unchanged. Routine
  plugin command results still never reach the OS notification sink.
- Safe mode keeps zero plugin VMs and zero optional adapters; the Core
  mechanism and the display floor still function.
- No P0 control changes. A future revision that adds a notice read or event
  surface, or that grants a plugin banner presentation, requires independent
  security review and a new decision.

## Verification backlog

The existing suites remain the acceptance evidence for the behavior this record
protects:

1. `plugin_notifications_1827`: an explicit plugin notification paints the
   banner and reaches the OS; a plugin command result paints the banner and
   never reaches the OS; empty, over-long, over-rate, and queue-full cases stay
   bounded and counted.
2. `m1_bell_notification` and `m1_bell_os_delivery`: `OSC 9` / `OSC 777`
   intake, consent denial, queue behavior, and the no-backend path.
3. A documentation check that no canonical page assigns banner painting to a
   plugin or introduces a `notification.banner.*` setting.
4. If a source-level guard is added later, it must assert that no plugin mount
   or scene can target the notification banner. That is a follow-up code
   guard, not part of this documentation decision.

## Open points

- `OQ-076` remains open: which events notify, message text, audible versus
  visual bell, silence and do-not-disturb rules, `OSC 99` admission, and OS
  backends.
- Secret detection in notification payloads beyond control stripping,
  normalization, and length bounds remains with `OQ-076` and the platform
  adapter work.
- The exact accepted banner duration, geometry, and theme-token mapping remain
  implementation evidence, not a new appearance contract. A future appearance
  contract must not turn the banner into plugin-composable chrome.
- Whether a future generic `Messages`-tier primitive should accept
  plugin-supplied content is explicitly not authorized here. It would require a
  new decision, a bounded read/event surface, and a safe-mode floor.

## P0 Review Sign-off

Not required for this record: it changes no security boundary, capability,
resource ceiling, trust decision, or accepted P0 control. It consumes the
notification controls in the [Platform Services Contract](platform-services-contract.md)
unchanged. Independent security review becomes required if a future revision
adds a notice read or event surface or grants banner presentation to a plugin.

## References

- [bitty#2398](https://github.com/bitty-terminal/bitty/issues/2398) - the
  ownership question and its acceptance criteria.
- [ADR 0014 - Workspace as Core Mechanism with Plugin-Only Presentation](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md)
  - the accepted mechanism/presentation boundary this decision composes with.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md) - ownership
  tables and the mechanism/policy pattern.
- [Platform Services Contract](platform-services-contract.md) - notification
  intake, redaction, rate bounds, consent, delivery, and the retained in-grid
  banner.
- [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md) -
  the `Messages` tier and the single modal authority.
- [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md) -
  the candidate inventory that classifies the notification primitive as a Core
  host surface.
- [Documentation workflow](../docs/development/documentation-workflow.md) -
  metadata, status, and review rules.
