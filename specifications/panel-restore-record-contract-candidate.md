---
title: Panel Restore Record Contract (Candidate)
description: Draft candidate field contract for the persisted panel restore record at manifest version 3 with a closed field list bounds and fail-closed refusals
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 90
---

# Panel Restore Record Contract (Candidate)

## Document status

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This document is a candidate contract
> record: it decides nothing on behalf of an owner, it **changes no accepted
> text**, and it **awaits owner acceptance**. Nothing here authorizes a shipped
> encoding, a compatibility guarantee, or an implementation claim. It records a
> field set, a version rule, bounds, and a refusal list so that a producer can
> be written against a stated contract instead of an assumption; until the
> Panel RFC owner accepts it (with the security reviewer's sign-off on the
> persistence and capability boundary named below), the persisted record stays
> exactly as the tree spells it today, and `RFC-OQ-9` stays open. This record
> does **not** close `RFC-OQ-9`; closing it is the RFC owner's act, not this
> document's.

## Purpose and scope

The panel restore chain is complete in its rules and unusable in a shipped
binary: `Runtime::set_panel_restore_records` and
`PanelRuntime::register_panel_provider` have no caller outside
`crates/bitty-runtime/tests/`, `bitty_ui::encode_manifest` is never called on
save, and `bitty_ui::decode_manifest` plus `bitty_ui::plan_restore` are never
called on load. One blocking reason is not wiring but a missing contract: a
`PanelRestoreInput` needs a `panel_type` and a `PanelDriverAnswer`, and the
persisted record (`bitty_ui::PersistedPanel`) carries neither, nor the owning
plugin whose provider contract the record was written against. This document
fixes the candidate field set that closes that gap, at
`PERSIST_MANIFEST_VERSION = 3`.

In scope: the record's fields and their encodings, the `2 -> 3` version rule and
its refusal direction, the bounds, what is deliberately excluded, the
restore-time derivation of the two facts the record cannot carry, and the
fail-closed refusal list. Out of scope: where the document is written on disk,
when the save and load call sites land, the plugin package declaration that
registers a provider manifest, and the startup ordering that puts a panel host
in place before the restore runs — the first follows once the contract is
fixed, the other three belong to the producer work named in `bitty#3243`.

## Normative sources this specification must not weaken

[Panel Runtime RFC](panel-runtime-rfc.md) retains panel identity, lifecycle,
presentation, focus routing, capability isolation, and the open question
`RFC-OQ-9` that owns restart persistence; this record answers one half of that
question and leaves its acceptance open. [Workspace Compositor Specification](workspace-compositor.md)
retains workspace identity and hierarchy, including the rule that a runtime
`WorkspaceId` is per-window attribution rather than durable identity. The
[Panel Generation Ownership Decision](panel-generation-ownership-decision.md)
retains the generation, binding, grant-ceiling, and placeholder rules; its
residual 10 is the row this contract exists to unblock, and it keeps its own
blocked status until an owner accepts a contract. The session snapshot format
in `bitty-runtime` retains workspace, layout, focus, and pane durability — this
record duplicates none of it.

## Terminology

- **Record** — one persisted panel line in the restart manifest document.
- **Restore key** — `(ws, pid)` in encoded form, resolved at restore into a
  live `(WorkspaceId, PersistentId)` pair.
- **Owner** — the plugin id of the plugin the record claims as its driver.
- **Provider contract version** — the schema version the record was written
  against, compared against `PROVIDER_MANIFEST_VERSION_V1`; the provider
  manifest's own `version` is the same axis, declared by a plugin.
- **Document** — the newline-joined set of records; a document carries no
  header line and no trailer.
- **Candidate** — direction recorded here and awaiting owner acceptance; not a
  contract in force.

## Claim status map

| #   | Claim in this document                                                                                                           | Status in this document                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| C-1 | The record carries exactly eight fields: `v`, `id`, `ws`, `pid`, `title`, `type`, `owner`, `pcv`                                 | Candidate field set; no implementation writes it yet                                                                       |
| C-2 | `PERSIST_MANIFEST_VERSION` becomes `3`; readers accept only `3`                                                                  | Candidate; the tree still writes and accepts `2`                                                                           |
| C-3 | A version-1 or version-2 document is refused, never upgraded                                                                     | Candidate rule, consistent with the landed refusal of version 1                                                            |
| C-4 | `ws` persists the workspace creation sequence, not a slot ordinal                                                                | Candidate change; the landed decoder wraps the stored integer in `WorkspaceId` and the planner subtracts one as an ordinal |
| C-5 | The record grants nothing: no capability set, no consent, no generation is persisted                                             | Candidate rule; it also restates the boundary the landed restore gate already enforces                                     |
| C-6 | The driver answer is derived at restore and is never read from the document                                                      | Candidate rule; the type and the driver answer are separate inputs today                                                   |
| C-7 | A corrupt, older, newer, or unknown-type document refuses as a whole                                                             | Candidate refusal list with named error variants                                                                           |
| C-8 | An installed driver whose registered provider contract is newer than the runtime keeps its container and presents `incompatible` | Landed behaviour (`bitty#3242`), restated here because the field set must not contradict it                                |
| C-9 | This record changes no accepted text and awaits owner acceptance                                                                 | Statement about this document, not a claim about the product                                                               |

## The record, as a field list

One record is one line. The canonical writer order is the table order; the
reader accepts fields in any order and requires each name at most once.

| Field   | Encoding                                                         | Required | Bound                                                                                                     | Meaning and restore use                                                                                                                                           |
| ------- | ---------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `v`     | decimal `u32`                                                    | yes      | exactly `3`                                                                                               | Record format version this line was written at; a value other than `3` refuses the document.                                                                      |
| `id`    | decimal `u64`                                                    | yes      | any `u64`                                                                                                 | The `PanelId` the panel had before the restart. **Advisory only**: never passed to allocation, never re-attached, reported as `persisted_id`.                     |
| `ws`    | decimal `u64`                                                    | yes      | `1..=u64::MAX`                                                                                            | Stable creation sequence of the owning workspace (`WorkspaceSnapshot.seq`). Resolved by exact match against the restored slots.                                   |
| `pid`   | text over `[a-z0-9_-]`                                           | yes      | `1..=64` bytes                                                                                            | `PersistentId`. With `ws` it forms the restore key; unique per document.                                                                                          |
| `title` | text                                                             | yes      | `0..=64` chars, no `;`, no newline                                                                        | Display title carried across the restart, including for a container that presents a placeholder because no driver resolved.                                       |
| `type`  | one token from `terminal`, `rich`, `browser`, `helper`, `canvas` | yes      | `1..=8` chars, exact lowercase, closed set                                                                | `PanelType`: the container kind the registry allocates **before** any driver is known. An unrecognised token refuses the document.                                |
| `owner` | plugin id `owner.name`                                           | yes      | `1..=33` bytes, two segments of `1..=16` bytes, first byte `[a-z]`, charset `[a-z0-9_-]`, exactly one `.` | The plugin the record claims as its driver, and the subject whose provider contract `pcv` measures. A **claim**, never a grant, never a substitution source.      |
| `pcv`   | decimal `u32`                                                    | yes      | `1..=u32::MAX`; `0` refused                                                                               | Provider contract version the record was written against. Compared against `PROVIDER_MANIFEST_VERSION_V1`; a value this runtime cannot read refuses the document. |

The field list, spelled as a list:

1. `v` — record format version (`3`).
2. `id` — advisory pre-restart `PanelId`.
3. `ws` — owning workspace creation sequence.
4. `pid` — `PersistentId` component of the restore key.
5. `title` — display title.
6. `type` — `PanelType` token, closed set.
7. `owner` — owning plugin identity (`owner.name`).
8. `pcv` — provider contract version the record was written against.

### Why these four additions and no others

`type` is persisted because allocation happens before the driver question is
answered: `Runtime::restore_one_panel` calls `create_panel(item.panel_type, …)`
and only then inspects `item.driver`. A missing driver cannot supply a
container kind, and a retained container must have one — deriving it from the
title, from the owner's declared types, or from a default would invent the very
fact the record exists to carry.

`owner` is persisted because without it a record cannot distinguish "my driver
is gone" from "some other plugin declares this type": the host would have to
search, and the first match would bind. Naming the owner makes a missing,
denied, or older driver a per-record answer instead of a type-wide guess, and it
names the subject `pcv` measures. The persisted owner is not authority — see
[no owner substitution](#no-owner-substitution).

`pcv` is persisted because two skews answer differently and only one of them is
observable without it. A runtime that cannot read the record's own contract
cannot interpret the record at all, which is a decode refusal; a runtime that
can read the record but faces an installed driver declaring a newer provider
contract keeps the container and presents `incompatible`, which is a landed
restore outcome. Without `pcv` both collapse into "something is newer", and the
restore either refuses a document it could have used or binds a driver it
cannot read.

`ws` changes from a slot ordinal to the workspace creation sequence because the
ordinal is not stable across the restart it is meant to survive: closing a
workspace shifts every later ordinal, so a record would silently land in a
different workspace — a re-home the restore path explicitly forbids for an
unresolvable record. `WorkspaceSnapshot.seq` is the durable anchor the session
snapshot already carries, and `Runtime::workspace_index_by_seq` is the resolver
that already exists for exactly this purpose.

## Encoding and a worked example

`key=value` fields joined by `;`, records joined by newlines, no escaping of any
kind, no quoting, no header, no trailer. A text value that needs `;`, a newline,
or an `=`-adjacent separator cannot be represented: it is refused at encode time
rather than escaped, which keeps the spelling auditable by eye.

```text
v=3;id=9;ws=1;pid=logs;title=logs;type=rich;owner=bitty.logs;pcv=1
v=3;id=3;ws=2;pid=editor;title=editor;type=terminal;owner=bitty.editor;pcv=1
```

Reader rules: fields in any order; unknown `k=` fields ignored (forward
tolerance); a repeated field name in one line is corrupt; a missing field is
corrupt. Forward tolerance covers additive fields only — a new **required**
field or a changed meaning for an existing field is a version bump, never a
tolerated extra.

## Version rule: 2 to 3

`PERSIST_MANIFEST_VERSION` becomes `3`. The bump is required, not cosmetic:
version 2 carries `v`, `id`, `ws`, `pid`, and `title` only, so a version-2
record has no container kind, no owner, and no provider contract version, and
its `ws` integer is a slot ordinal rather than a creation sequence. Three of the
five additions change what the record means, which no tolerant reader can
absorb.

- **Writer.** Writes `v=3` on every record. It never writes `2` again, never
  writes a version-2 document alongside a version-3 one, and offers no
  downgrade.
- **Reader.** Accepts exactly `3`. Any other value refuses the **whole
  document** with `ManifestError::UnsupportedVersion { found, supported: 3 }`,
  before planning, so the restore applies zero records.
- **Older versions (`1`, `2`) are refused, never upgraded.** Version 1 already
  fails closed in the landed decoder because it stored a bare workspace index
  that cannot key a restore. Version 2 is refused on the same principle:
  upgrading it would mean synthesizing `type` (inventing a container kind),
  synthesizing `owner` (inventing an authority claim from whatever plugin the
  registry happens to hold), synthesizing `pcv` (inventing a compatibility
  statement), and reinterpreting `ws` (reading a shifted ordinal as a creation
  sequence). A fabricated record is worse than a missing one: it restores the
  wrong thing and reports success.
- **Newer versions (`4` and above) are refused** with the same error, the same
  document-level scope. Forward compatibility is not claimed for the record
  format; only additive unknown fields are tolerated inside an accepted version.
- **Compatibility consequence, stated plainly.** The first build that writes
  version 3 restores **no panels** from a version-2 file: the document is
  refused whole, the session snapshot's workspaces and panes still restore, and
  the user sees a clean panel population rather than a partial one. That is the
  one-time, deliberate cost of the bump. It is not mitigated by a migration
  pass, a dual read, or a best-effort subset, because each of those would
  resurrect a record whose meaning nobody decided.

Version 2 documents are expected to be rare in practice rather than common:
the tree today has no production writer, so the population of version-2 files is
confined to whatever a pre-`3` build managed to write once the save path landed.

## What the record deliberately does not persist

Each exclusion is a decision, not an omission:

- **The driver's capability resolution** (`panel.*`) and **the consent set** —
  these are the authority a first bind commits, and they are re-derived at
  restore from the installed generation and the permission diff. A file that
  could supply them would let a restart grant capabilities by editing text.
- **Any controller generation, allocation epoch, or last controller owner** —
  runtime facts about a process that no longer exists; persisting them would
  invite a restore to fence against a dead generation.
- **Any placeholder kind or recovery counter** — outcomes of a restore, not
  inputs to one.
- **Layout geometry, focus, MRU order, pane state, scrollback, and per-pane
  working directory** — the session snapshot owns durability for all of it; a
  second copy in this record would be a second truth that can disagree.
- **The plugin's package version, build id, signature, install path, or
  manifest digest** — none is a compatibility claim the host can verify against
  a contract, and persisting an install path would freeze a mutable fact into a
  durable record. `owner` plus `pcv` is the whole durable plugin identity.
- **Presentation mode, Panel Rules evaluation results, theme, or style** —
  re-derived from current rules and configuration; a persisted evaluation would
  replay a decision made against a tree that no longer exists.
- **Environment variables, exported shell state, credentials, tokens, socket
  paths, or any environment capture** — secrets and process-bound values never
  enter a durable record, which is also why a tampered document cannot leak one
  back.
- **Process identity**: pid, process group, PTY or session handles, file
  descriptors, start time, or socket inodes — meaningless across a restart and a
  fingerprint of the process that wrote the file.

## Restore-time derivation

The two facts a `PanelRestoreInput` needs beyond the durable record are derived,
never read:

| `PanelRestoreInput` member  | Source at restore                                                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `record: PersistedPanel`    | `id`, `ws`, `pid`, `title` from the document, with `ws` resolved to the live `WorkspaceId` of the matched slot                     |
| `panel_type: PanelType`     | the `type` field verbatim; no inference from owner, title, or registry state                                                       |
| `driver: PanelDriverAnswer` | the plugin host's answer for `owner`: installed generation's resolution and the permission diff, or `Missing` / `Denied` / `Older` |
| `owner` and `pcv`           | additional inputs to that answer: owner is the lookup key, `pcv` is the record's side of the contract comparison                   |

`PanelDriverAnswer::Installed` is therefore assembled at restore and never
deserialized. A document cannot say "installed with these grants"; it can only
say which plugin it expected and which contract version it was written at.

### Skew matrix

| Record `pcv` | Driver's registered manifest version | Runtime reads it | Outcome                                                                                           |
| ------------ | ------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------- |
| `1`          | `1`                                  | yes              | First bind: fresh container, whole resolution granted.                                            |
| `1`          | `2`                                  | no               | Container retained, `incompatible` placeholder, nothing granted (landed behaviour, `bitty#3242`). |
| `2`          | any                                  | no               | Document refused at decode: this runtime cannot read the record's own contract.                   |
| `1`          | `2`                                  | yes (future)     | First bind; the driver owns the record's upgrade, the runtime does not interpret it.              |

### No owner substitution

A record whose `owner` is not installed answers `Missing` — an `unloaded`
placeholder on a retained container — even when another installed plugin
declares the record's `type`. Substituting a different plugin into a persisted
slot would hand a whole `panel.*` resolution to a plugin the record never named,
on the strength of a type token in a file, which is a capability escalation
across a restart. The same rule applies to a driver that is installed but does
not declare the record's `type`: the answer is `Older` or `Missing` by the
contract comparison, never a rebind to a type-compatible neighbour.

## Fail-closed refusal list

Every item below refuses the **whole document** before planning, so a refused
restore mutates nothing and reports zero restored panels. Partial application is
never an outcome: a document that cannot be read whole is a document whose
missing records nobody can distinguish from records that were never written.

| #   | Condition                                                                                                                                                                                   | Error variant (proposed names included)                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1   | Record format version other than `3` (older `1`/`2` or newer `4+`)                                                                                                                          | `ManifestError::UnsupportedVersion { found, supported }` (exists)             |
| 2   | Corrupt line: field without `=`; a required field missing; a field name repeated; non-decimal `v`, `id`, `ws`, or `pcv`; `;` inside `title`, `pid`, or `owner`; newline inside a text value | `ManifestError::Malformed { line }` (exists)                                  |
| 3   | Line longer than `MAX_MANIFEST_LINE_LEN`                                                                                                                                                    | `ManifestError::LineTooLong { line }` (exists)                                |
| 4   | More than `MAX_PERSIST_PANELS` records                                                                                                                                                      | `ManifestError::TooManyPanels { found, cap }` (exists)                        |
| 5   | `pid` empty, overlong, or outside `[a-z0-9_-]`                                                                                                                                              | `ManifestError::InvalidPersistentId { line }` (exists)                        |
| 6   | `title` longer than `MAX_IDENTITY_TITLE_LEN` chars                                                                                                                                          | `ManifestError::TitleTooLong { line }` (exists)                               |
| 7   | `type` absent or not one of the five closed tokens, including a case variant or a plausible future type                                                                                     | `ManifestError::UnknownPanelType { line }` (new)                              |
| 8   | `owner` empty, overlong, not exactly `owner.name`, wrong case, whitespace, or outside the segment charset                                                                                   | `ManifestError::InvalidOwner { line }` (new)                                  |
| 9   | `pcv` above the provider contract version this runtime reads                                                                                                                                | `ManifestError::UnsupportedProviderContract { line, found, supported }` (new) |
| 10  | Two records share one `(ws, pid)` restore key                                                                                                                                               | `ManifestError::DuplicateRestoreKey { line }` (new)                           |
| 11  | `PersistencePolicy::StableIdentity` selected at the restore entry (unchanged, restated)                                                                                                     | `ManifestError::StableIdentityUnsupported` (exists)                           |

`ws` and `pcv` are covered by rows 2 and 9 respectively; `ws = 0` is malformed
because no slot is ever minted at sequence zero.

### Restore outcomes that are not decode refusals

These are per-record outcomes after a document was accepted, and they are not
refusals of the document: `Missing` (unloaded placeholder), `Denied` (`denied`
placeholder, container `unavailable`), `Older` and `incompatible` (retained
container, nothing granted), `WorkspaceGone` (the record's `ws` names no
restored slot — dropped, never re-homed), `NoPanelHost` and `PanelHostBusy`
(bounded drops that leave nothing allocated), and `RegistryRefused` (allocation
or bind refused; the container is disposed again before the drop is reported).
None of them deletes a record's right to be retried by a later restore, and none
of them is reported as a successful restore of that panel.

## Bounds

| Bound                      | Value                                   | Applies to                                                           |
| -------------------------- | --------------------------------------- | -------------------------------------------------------------------- |
| `MAX_PERSIST_PANELS`       | `256` (unchanged)                       | Records per document                                                 |
| `MAX_MANIFEST_LINE_LEN`    | `512` chars (unchanged)                 | One encoded record; the worst case below is `260` chars              |
| `MAX_PERSISTENT_ID_LEN`    | `64` bytes (unchanged)                  | `pid`                                                                |
| `MAX_IDENTITY_TITLE_LEN`   | `64` chars (unchanged)                  | `title`                                                              |
| `MAX_PERSIST_OWNER_LEN`    | `33` bytes (new)                        | `owner`; two `1..=16` byte segments and one `.`                      |
| `MAX_PANEL_TYPE_TOKEN_LEN` | `8` chars (new)                         | `type`; the longest closed token is `terminal`                       |
| Provider contract version  | `1..=u32::MAX`, `0` refused (new)       | `pcv`; `0` is not a schema version                                   |
| Workspace sequence         | `1..=u64::MAX` (new)                    | `ws`; resolved against at most `MAX_SESSION_WORKSPACES` (`16`) slots |
| Document size (derived)    | `<= 256 x 513` bytes, about `128.2 KiB` | The whole file; no compression, no streaming, no chunking            |

The worst-case record line is `260` characters (`v=3`, a 20-digit `id`, a
20-digit `ws`, a 64-byte `pid`, a 64-character `title`, `type=terminal`, a
33-byte `owner`, and a 10-digit `pcv`), which leaves `252` characters of
headroom under the unchanged `512` cap. The cap is not raised: it bounds the
work a decoder does per line, and raising it would widen the format for no
field this contract adds.

## Landed state at this revision

Read at `bitty` `3c588f26` (2026-11-18), the revision this contract is written
against. Symbols, not line numbers:

- `crates/bitty-ui/src/panel_persist.rs` carries `PersistedPanel` (`id`, `key`,
  `title`), `RestartManifest`, `PanelRestoreKey`, `PersistentId`,
  `PersistencePolicy`, `ManifestError`, `encode_manifest`, `decode_manifest`,
  and `plan_restore`, at `PERSIST_MANIFEST_VERSION = 2`, with
  `MAX_PERSIST_PANELS = 256`, `MAX_MANIFEST_LINE_LEN = 512`,
  `MAX_PERSISTENT_ID_LEN = 64`, and a title bound of `64`.
- `decode_manifest` already refuses a version it does not write
  (`UnsupportedVersion`), tolerates unknown fields, and wraps the persisted `ws`
  integer in `WorkspaceId::new`; `plan_restore` refuses
  `PersistencePolicy::StableIdentity`.
- `crates/bitty-runtime/src/runtime/panel_restore.rs` carries
  `PanelRestoreInput { record, panel_type, driver }`, `PanelDriverAnswer`
  (`Installed { owner, resolution, consented }`, `Missing`, `Denied`, `Older`),
  `PanelRestoreOutcome`, `PanelRestoreDrop`, and
  `Runtime::plan_panel_restore` / `commit_panel_restore` /
  `restore_one_panel`; the workspace side resolves the persisted value as a
  **1-based slot ordinal** (`restored_slot_of`), which this contract replaces
  with a sequence match.
- `crates/bitty-runtime/src/registry/provider.rs` carries
  `PROVIDER_MANIFEST_VERSION_V1 = 1`, `PanelProviderManifest::parse` (admits any
  version above zero, refuses `0`), `requires_newer_runtime`, and
  `MAX_PROVIDER_TYPES = 8`; its owner grammar is two `1..=16` byte segments,
  narrower than `PluginId`'s `1..=64`.
- `bitty_plugin_host::PluginId` allows `owner.name` with segments up to `64`
  bytes and `MAX_PLUGIN_ID_LEN = 128`; the record's `owner` bound is the
  intersection of the two grammars, because the same text is the lookup key for
  both.
- `WorkspaceSnapshot` persists `seq` per workspace and documents that the
  runtime `WorkspaceId` is not persisted; `Runtime::workspace_index_by_seq`
  resolves a sequence to a slot index and returns `None` when no slot carries it.
- `Runtime::set_panel_restore_records` and `PanelRuntime::register_panel_provider`
  have no caller outside `crates/bitty-runtime/tests/`; `encode_manifest`,
  `decode_manifest`, and `plan_restore` have no caller outside `bitty-ui` and its
  tests. `bitty#3243` is the producer home for the save, load, and registration
  call sites this field set unblocks.

## Security review

| Concern                             | Disposition                                                                                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| A document that grants capabilities | Impossible by construction: no field carries a grant, a consent, or a generation; the bind's authority is derived at restore.             |
| A tampered owner                    | The owner is a lookup claim only; a mismatch answers `Missing`, `Older`, or `incompatible`, and never rebinds to another plugin.          |
| A tampered type                     | The type selects a container kind, not authority; an unknown token refuses the document, and a driver must declare the type to bind.      |
| Secrets or process identity on disk | Excluded by the field list; no environment capture, credential, socket path, or process handle is representable.                          |
| Corrupt or hostile input            | Structural refusal of the whole document before any mutation; bounded line length, count, and per-field sizes; no allocation from a file. |
| Denial of service by size           | The derived document ceiling is about `128.2 KiB` and every bound is enforced before planning.                                            |

The security reviewer's sign-off is required before acceptance because the
contract touches a durable file that a plugin-side claim is read from, even
though no field can grant anything.

## Verification plan

Acceptance requires the following rows, each on the production chain where one
exists, and each red when the field it covers is removed:

1. Round trip: a manifest holding every field encodes and decodes to
   field-for-field equality, with field order varied and an unknown field
   present.
2. Version refusals: `v=1`, `v=2`, and `v=4` each refuse the whole document with
   `UnsupportedVersion`, and `plan_panel_restore` plans zero records.
3. Corrupt-input refusals: one row per item in the refusal list, each asserting
   the typed variant, the reported line, and that nothing was applied.
4. Type refusal: an unknown, absent, or case-variant `type` refuses; each of the
   five tokens is accepted.
5. Owner rules: a malformed `owner` refuses; a record whose owner is not
   installed answers `Missing` even when another plugin declares the type.
6. Workspace resolution: a record whose `ws` matches a restored slot's sequence
   lands in that slot after the slot's index shifted; a record whose `ws` matches
   nothing drops with `WorkspaceGone` and is never re-homed.
7. Skew: `pcv` above the runtime's provider contract refuses the document; an
   installed driver declaring a newer contract keeps its container and presents
   `incompatible` (the landed row, re-run against these fields).
8. The `bitty#3243` closing chain: save a session with a recorded panel, restart,
   load in a fresh process, register a driver whose manifest is newer, and assert
   the `incompatible` placeholder, the retained allocation epoch, no controller
   generation, and no grant — plus three sabotage runs that each turn it red.

This document supplies no test result and marks no criterion satisfied.

## Alternatives considered

- **Extend version 2 additively and keep the reader tolerant.** Rejected: three
  of the added fields change the meaning of a record that already exists, and a
  tolerant reader would restore a version-2 record with an invented container
  kind.
- **Upgrade version 2 in place, deriving `type` from the plugin's declared types
  and `owner` from the registry.** Rejected: both are guesses about authority
  made at restore time, and the second silently names a plugin the user never
  bound.
- **Keep `ws` as a slot ordinal.** Rejected: closing a workspace shifts later
  ordinals, so a record silently re-homes to a different workspace — the failure
  the restore path forbids for an unresolvable key, arriving through arithmetic
  instead of lookup.
- **Persist the driver's resolution and consent so restore is exact.** Rejected:
  that makes a text file a capability grant, and a restart would replay authority
  from a process that no longer exists.
- **Persist the plugin's package version instead of a provider contract
  version.** Rejected: a semver string is not a contract the host can compare,
  and it would freeze an install fact into a durable record.
- **Add a document header or a checksum.** Rejected for now: a header changes
  the format for no field this contract needs, and a checksum adds a failure
  mode with no recovery story; structural validation already fails closed. Left
  as an open point rather than decided.
- **Refuse per record instead of per document.** Rejected: a document whose
  unreadable records are dropped restores a partial workspace that reports as
  complete, which is the outcome the panel count cap already refuses.

## Affected contracts

| Contract                                          | Effect                                                                                                                                                               |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Panel Runtime RFC](panel-runtime-rfc.md)         | No change to identity, lifecycle, presentation, or focus rules; `RFC-OQ-9` stays open and this record answers one half of it as a candidate.                         |
| Panel Generation Ownership Decision (residual 10) | The field, version, and workspace-resolution blocker this residual names is answered here as a candidate; the residual stays blocked until an owner accepts.         |
| Session snapshot format                           | No change: it already carries the workspace sequence this record keys on, and it remains the sole owner of layout, focus, and pane durability.                       |
| Plugin package manifest                           | A provider-contract declaration (schema version plus declared panel types) is still missing there; this record consumes it and does not define it.                   |
| Panel persistence module (`bitty-ui`)             | `PersistedPanel`, `ManifestError`, `encode_manifest`, `decode_manifest`, and the constants change at the version bump; the change lands with the producer, not here. |

## Open points

1. **`title` retention.** The field exists so a placeholder can show a name
   before a driver resolves. Whether the placeholder should instead show the
   `pid` is a presentation question this record does not settle.
2. **`pcv` placement.** A per-record field is chosen over a document header so
   one document can carry records written at different contract versions during
   a transition. If a header is ever added, this field becomes redundant.
3. **Provider contract versions above one.** `PROVIDER_MANIFEST_VERSION_V1` is
   the only version this runtime reads. What a version-2 provider contract
   contains, and whether the record needs a field for it, belongs to the plugin
   manifest work, not here.
4. **When the save path writes.** The contract fixes the fields, not the moment
   of capture or the file's location; both follow from the producer work, and
   the file must never mix document versions.
5. **Owner acceptance route.** Whether this becomes an RFC amendment, an
   accepted contract record, or a section of the Panel Generation Ownership
   Decision is the Panel RFC owner's choice; the security reviewer's sign-off on
   the persistence boundary is required either way.

## Acceptance criteria

This record is complete when:

1. The Panel RFC owner accepts the field list, the `2 -> 3` rule, the bounds, and
   the refusal list, or returns them with named changes.
2. The security reviewer signs off on the persistence boundary: no field grants
   authority, no owner substitution, and nothing secret or process-bound is
   representable.
3. Every item in the refusal list has a named error variant and a test row, and
   the version refusals assert a zero-record plan.
4. The workspace sequence rule replaces the ordinal arithmetic in the same
   change that bumps the version, so no reader ever interprets a version-3
   integer as an ordinal.
5. `bitty#3243`'s closing chain runs on these fields end to end, with the three
   sabotage runs turning it red.

## P0 Review Sign-off

Pending: the storage of a durable file that a plugin-side claim is read from
requires the security reviewer's sign-off before acceptance. No P0 criterion is
claimed satisfied here, and no capability, ceiling, or trust decision is changed
by this document.

## References

- [Panel Runtime RFC](panel-runtime-rfc.md) — accepted panel contract and the
  `RFC-OQ-9` persistence question this candidate answers one half of.
- [Panel Generation Ownership Decision](panel-generation-ownership-decision.md)
  — generation, binding, grant-ceiling, and placeholder rules; residual 10 is
  the blocked row this contract unblocks.
- [Workspace Panel Invariants](workspace-panel-invariants.md) — workspace and
  panel identity invariants, including the durable workspace sequence.
- [Workspace Compositor Specification](workspace-compositor.md) — accepted
  workspace hierarchy and the rule that a runtime workspace id is not durable
  identity.
- [Documentation workflow](../docs/development/documentation-workflow.md) —
  metadata, status, and self-containment rules this record follows.
- bitty#3243 — the producer home for the save, load, and provider-registration
  call sites this field set unblocks.
- bitty#3239 — rows 13 and 16, the placeholder producer and the pending
  persistence contract this record addresses.
