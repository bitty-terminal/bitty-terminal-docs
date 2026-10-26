---
title: Config Lua require contract (candidate)
description: Draft restricted config-only Lua module loader contract for naming, roots, cache and cycle semantics, path containment, budgets, and diagnostics
category: specifications
audience: security-reviewer
document_type: specification
status: draft
website_publish: false
sidebar_order: 80
---

# Config Lua require contract (candidate)

## Document status

> Status: **draft, awaiting independent security acceptance** (issue
> `bitty#2670`, tracker tag `OQ-CONFIG-REQUIRE`). Nothing here is implemented
> and no statement claims shipped, stable, or supported behavior. The shipped
> configuration Lua surface remains a single data-returning chunk with no
> `require`; until this candidate is accepted and implemented, that stays the
> contract. Manual and generated-template synchronization happens only after
> acceptance.

The shipped configuration VM evidence this draft stands on (read-only from
`bitty` `origin/main`, `crates/bitty-lua/src/config.rs` and
`crates/bitty-config/src/file.rs`): the configuration chunk runs in a fresh
sandbox VM with the plugin-grade RC-1 (instruction and wall-clock) and RC-2
(32 MiB accounted heap) budgets; `print`, `tonumber`, `io`, `os`, `debug`,
`package`/`require`, `load`/`loadfile`/`dofile`, `_G`, and every host callback
are absent by default and a chunk that references a denied global fails
closed. File bounds are 64 KiB, 2048 lines, 4096 bytes per line, with 64
top-level keys and 32 keys per nested table. `--config PATH` /
`BITTY_CONFIG` selects an explicit entry file that must exist (fail closed,
exit 2); profiles live under
`$XDG_CONFIG_HOME/bitty/profiles/<name>.lua` with single-parent `extends`
chains (16-hop cap, cycle detection); `--safe` composes with the other flags in
any order and selects the built-in safe effective configuration without any
external configuration read.

## Purpose and scope

Issue `bitty#2670` asks the design gate before any implementation: the
restricted config-only Lua module loader that would finally make
`require(...)` legal inside configuration Lua, so an `init.lua` and its
profiles can split across `lua/` modules the way the accepted direction in
[Lua and XDG configuration](../configuration/lua-and-xdg.md) already sketches
(`require("config.options")` in the configuration VM). The loader is
inverse-symmetric to the plugin story: plugins get a package-tree-rooted
loader out of scarcity of shared code (the plugin-host rooted loader exists),
while configuration today gets nothing because a global runtime path is a
security event. This contract chooses a narrow answer: one root, exact
containment, bounded graph, bounded budget, fail-closed on every refusal, and
no new authority for any other VM.

In scope: module naming and root model; the `init.lua`, profile, and
`--config PATH` roots and nested-module loading; cache, duplicate-load,
cycle, recursive-load, and module-graph semantics; startup fail-soft versus
strict `config check`/`doctor`/reload behavior; path containment,
symlink/reparse/junction handling, TOCTOU resistance, Windows path rules, and
special-file rejection; depth/count/size/aggregate/evaluation budgets and
their accounting; `--safe` preservation and the preserved plugin-Lua denial
of `require`; diagnostics, source attribution, and redaction; the error
taxonomy.

Out of scope: the `require` implementation itself, plugin-sandbox changes,
arbitrary module search paths, network import, release/tag/CDN/R2 changes,
per-plugin settings Lua (its plain-data surface is untouched), system
defaults/policy executed as Lua, and project-scope Lua (its trust gate stays
[T-08](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md)).

## Normative sources this specification must not weaken

- [Security overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
  invariant 5 (least privilege per untrusted input class), invariant 7 (size,
  time, nesting, rate, and memory limits per protocol), and invariant 10
  (`--safe` always starts with minimal built-in configuration and no
  third-party plugins).
- [Threat model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md)
  abuse cases T-15/T-16 and the
  [Configuration and workspace trust](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md#configuration-and-workspace-trust)
  record: user configuration is trusted code whose loader is still a
  host-controlled file-read surface and never a filesystem authority.
- [Configuration Model RFC](../specifications/configuration-model-rfc.md)
  (accepted): declarative `ConfigPlan` two-stage pipeline, layer stack,
  merge rules, reload classification, and fail-closed enumeration.
- [ADR-0007 async GC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0007-async-gc.md):
  config evaluation charging (PB-1/PB-2, RC-1/RC-2) already assumes a rooted
  `require` inside `$BITTY_CONFIG/lua` and per-VM `package.loaded`-equivalent
  caching with no cross-VM cache; this contract supplies the missing loader
  mechanics.
- [ADR-0005 Lua pins and stdlib](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0005-lua-pins-and-stdlib.md)
  and [ADR-0006 os/env policy](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0006-os-env-policy.md):
  restricted stdlib posture and `os.getenv` denial do not change because a
  loader exists.

## Terminology

- **Entry file**: the Lua file that starts the configuration evaluation
  (`init.lua`, a fallback `config.lua`, a profile file, or an explicit
  `--config` path).
- **Module root**: the single directory tree from which every `require` call
  in one generation resolves. Exactly one module root exists per
  configuration generation.
- **Module spec**: the string argument passed to `require`, e.g.
  `"config.options"`.
- **Generation**: one startup / check / reload evaluation of the
  configuration layer stack. The loader, cache, and budget accounts exist
  only inside one generation.

## Decision summary (candidate, one line)

Configuration `require` resolves one spec grammar against exactly one
root — the `lua/` directory sibling of the configuration root — with
host-side per-generation caching, cycle failure, strict path containment
(lexical, canonical, and handle-bound), the shipped per-file limits plus
aggregate graph caps, the same RC-1/RC-2 evaluation budget as the config VM
today, whole-layer fail-soft startup salvage versus strict check/doctor and
refused reload, redacted typed diagnostics, no authority for `--safe` (which
never constructs the loader) or for plugin and settings VMs (which keep
denying `require`).

## Module naming and root model (candidate)

### Name grammar

A module spec must match:

- 1..16 segments separated by a single `.`; each segment is an identifier of
  1..64 bytes, first byte `[A-Za-z0-9]`, following bytes
  `[A-Za-z0-9_-]`; the total spec is at most 256 bytes;
- no leading or trailing `.`; no consecutive `.`; no `..` as any segment;
- no backslash, slash, drive letters, `:` (an NTFS alternate-data-stream
  separator and Windows reserved form), NUL bytes, or non-ASCII bytes;
- the reserved first segment `bitty` (and any `bitty.*` prefix) is refused:
  the host bridge surface stays a preloaded read-only table, never a module,
  so `require("bitty")` fails closed — the candidate snippet
  `local bitty = require("bitty")` in
  [Lua and XDG configuration](../configuration/lua-and-xdg.md) is superseded
  by this decision.

Non-string arguments, runtime-mutable specs, and spec strings that fail the
grammar fail closed with `E_CONFIG_MODULE_NAME`.

### Chosen root model

One grammar, one root:

```text
Config VM -> <configuration-root>/lua/   (exactly one root per generation)
Plugin X VM -> package tree (plugin-host rooted loader, unchanged)
Settings VM -> nothing: require stays denied (unchanged)
```

- Root derivation: the module root is the `lua/` directory inside the
  directory that owns the configuration root — for a default launch,
  `init.lua` (or fallback `config.lua`) sits at the configuration root, so
  the module root is `<configuration-root>/lua/`; the derivation never
  consults the working directory, drive substitution, `$PATH`, `$LUA_PATH`,
  or any Lua-set variable. The root itself is fixed by the host from the
  same explicit-or-probed configuration source that today selects the entry
  file; Lua cannot widen, re-point, or add roots.
- Nested-module loading is allowed: a module may call `require` again, and
  every such spec resolves against the same single root (no per-module
  subtree roots, no sibling-directory roots, no upward references).
- Resolution order for spec `a.b.c` is deterministic and collision-failing:
  the file `<root>/a/b/c.lua` is preferred; if it does not exist, the init
  module `<root>/a/b/c/init.lua` is used; if both exist for the same spec
  the load fails closed with `E_CONFIG_MODULE_AMBIGUOUS` instead of picking
  one; if neither exists the load fails closed with
  `E_CONFIG_MODULE_NOT_FOUND`. `.lua` suffixes inside specs (`"foo.lua"`)
  are invalid by the grammar (`.` segment splits), so no spec can address a
  non-`init` file by its stem-embedded extension.
- The profile entry (`profiles/<name>.lua`) and an explicit
  `--config PATH` entry participate in the same module root: the root is
  always derived from the directory of the configuration root selection —
  for `--config PATH` that is `PATH`'s directory's `lua/` sibling — and a
  profile never adds, replaces, or narrows it. A profile that is reached
  through `extends` shares that root and the same generation cache.
- System (`$XDG_CONFIG_DIRS`) and distribution layers are not admitted to
  this loader in this revision: system defaults or policy in Lua execute
  only after their own trust decision (already an open point in
  [Lua and XDG configuration](../configuration/lua-and-xdg.md)), and no
  system-shaped module path exists yet.

### Loader surface

`require` is one host-provided global function on the configuration VM:
`package` (and `package.path`, `package.loaders`) is never created, so there
is no Lua-visible search path to mutate and no `loadlib`. The function takes
exactly one string argument, returns the module's plain-data returns (see
below), and raises a fail-closed typed error on every refusal. `dofile`,
`loadfile`, `load` and the rest of the deny list stay absent.

Modules carry the same declarative duty as `init.lua`: they are plain-data
producers, not imperative agents. A module may compose submodules (`local
options = require("config.options")`), but the module chain ultimately feeds
the single returned `ConfigPlan` table through the accepted two-stage
pipeline. A module returning a function or another non-table return fails
validation at the extraction boundary exactly like today's entry-file shape
contract.

## Loader semantics: cache, duplicate loads, cycles, and the module graph (candidate)

- **Cache.** The loader keeps a host-side per-generation map from module
  spec to its returned value. It is deliberately not Lua-visible (no
  `package.loaded` or other exposed table), so configuration code cannot
  enumerate the graph, mutate another module's value through the cache, or
  fake a cache hit. This matches the ADR-0007 intent (per-VM cache seeded
  by the host, no cross-VM cache).
- **Duplicate load.** A second `require` of an already-completed spec
  returns the cached value without re-evaluating the file; the returned
  table's identity is stable across the generation, so diamond-shaped
  imports share one instance.
- **Recursive load.** A `require` of an in-flight spec — a module whose
  subtree has not returned — is a cycle and fails closed with
  `E_CONFIG_MODULE_CYCLE`; the loader never returns a partially-initialized
  module table or a load sentinel. (This is stricter and simpler than
  ambient Lua's `package.loaded` trick, and matches the declarative model:
  a cycle is a plan-shape error, not a partial-value facility.)
- **Cycle shape.** Any cycle in the module-reference graph (self-import,
  two-module ring, long ring under the depth cap) produces the same
  `E_CONFIG_MODULE_CYCLE`; the diagnostic names the specs on the in-flight
  chain in import order.
- **Depth.** The require chain depth is capped at 16 (same value as the
  profile `extends` chain cap), counted per nested-evaluation stack, not
  per distinct module; exceeding it fails with `E_CONFIG_MODULE_DEPTH`.
- **Module count.** At most 64 distinct modules may load in one generation
  (same value as the shipped top-level-key cap); the 65th distinct module
  fails with `E_CONFIG_MODULE_COUNT`.
- **Graph properties.** With cycles refused and counts bounded, the
  reference graph is a finite DAG per generation; it cannot grow across
  generations because cache identity does not survive a reload or a
  process restart. Cache clears on every reload generation and every
  startup; there is no on-disk cache, no compiled-bytecode cache, and no
  background prefetch.
- **No lazy loading.** Evaluation is synchronous on the startup path per
  ADR-0007's config-VM charging; there is no deferred-coroutine loading,
  no `require` returning a handle future, and no loader work after the
  configuration evaluation ends.

## Startup, check, doctor, and reload semantics (candidate)

Startup is fail-soft to keep recovery possible; verification paths stay
strict; reload refuses rather than adopts. All four paths share one loader
and one validation sequence so there is no divergent second parser.

| Path                           | Behavior on any loader failure (name, not found, ambiguous, cycle, depth, count, size, aggregate, escape, not-regular, evaluation)                                                                                                                                                                                    |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Startup                        | The whole external layer that started the failing evaluation is dropped with its existing whole-layer failure rule (fail-soft salvage keeps every other valid layer and continues startup with defaults/lower layers); a diagnostic with the taxonomy code and module spec is emitted; nothing is silently defaulted. |
| `--config PATH` entry presence | Unchanged: the explicit entry file itself is still a fail-closed precondition (exit 2); only loader failures inside a present entry fall under the row above.                                                                                                                                                         |
| `bitty config check`           | Strict: the same input is reported per module finding and the command exits non-zero; no salvage, no partial success.                                                                                                                                                                                                 |
| `bitty doctor`                 | Strict: loader findings land in the diagnosis with the taxonomy code and the affected configuration source, exit non-zero.                                                                                                                                                                                            |
| `bitty ctl config reload`      | Refused: the previous good plan stays active; the reload reports the taxonomy finding and never adopts a partially-good module graph.                                                                                                                                                                                 |
| `init`/template generation     | Unchanged: generated templates stay self-contained data and are produced without constructing a loader.                                                                                                                                                                                                               |

Two-step rationale: a module failure is a content failure of one external
layer, and the shipped startup salvage already collapses whole-layer
failures (Lua syntax/runtime faults, budget exhaustion, undeclared keys)
into a documented layer drop — module loading introduces no new tier. The
only fail-closed startup cases remain the existing explicit-selection
preconditions: a missing `--config`/`BITTY_CONFIG` entry file or a
missing/invalid requested profile fail with exit 2 before any evaluation.

## Path containment and platform handling (candidate)

Containment is three independent checks, all fail closed, and the final
decision is bound to an open file handle rather than to a path string:

1. **Lexical containment.** The spec resolves to
   `<root>/<a>/<b>/<c>.lua` (or `/init.lua`). Directory traversal
   components cannot arise from the grammar, and the host re-verifies the
   joined path stays inside the resolved root and contains no `.`,
   `..`, backslash, drive letter, or reserved form.
2. **Canonical containment.** The root and the joined path are
   canonicalized; the canonical path must remain inside the canonical root.
   Symlinked path components inside the configuration root are permitted
   only when the canonical target — file and every parent — stays under
   the canonical root (this keeps the common dotfile layout — a
   symlinked configuration directory resolving back under the real
   `bitty/` tree — workable); any escape outside the root, including a
   symlink that points at another tree, is rejected with
   `E_CONFIG_MODULE_ESCAPE`. Canonicalization failures (loop detection,
   `ELOOP`, permission) reject.
3. **Handle-bound identity.** The file is opened by the host, and the
   containment decision is validated against the opened handle, not the
   path string, so a path swapped between the containment check and the
   read does not become the read target (TOCTOU resistance):
   - Unix: the open uses per-component no-follow (`openat`/`openat2` with
     `RESOLVE_BENEATH`, `RESOLVE_NO_SYMLINKS`, and
     `RESOLVE_NO_MAGICLINKS` where available, falling back to
     component-wise `O_NOFOLLOW` with the `dev`/`inode` identity from the
     canonical-resolution step compared against the post-open `fstat`
     identity — a mismatch rejects the file).
   - Windows: the open rejects reparse-point attributes so junctions,
     NTFS symlinks, and mount points cannot carry the read outside the
     root; the post-open identity check (`FILE_ID_INFO`) matches the
     pre-open lookup, and case handling follows the Windows rules below.
4. **Special files.** Only regular files that pass the identity check are
   read: FIFOs, devices, sockets, directories reached through an init
   module that is also a file, sparse anomalies, and named pipes reject
   with `E_CONFIG_MODULE_NOT_REGULAR`. The size cap is enforced on the
   opened handle's length before any read, and the read cannot span
   reallocation of the underlying object (read once, in full, into the
   budget).

### Windows path rules

- The module root on Windows is `%APPDATA%\bitty\lua` (config roams with
  the profile, per the cross-platform table in
  [Lua and XDG configuration](../configuration/lua-and-xdg.md)); the same
  grammar runs on every platform — backslash, `:`, drive-letter prefixes,
  `\\?\`, `\\.\`, and UNC forms cannot appear in a spec, so a spec can
  never name a stream, device, or another volume.
- Case handling: the cache key is the raw spec byte string; canonical
  comparisons and identity checks are case-insensitive where the volume
  is case-insensitive, so two differently-cased paths cannot smuggle one
  file past a containment check that already passed.
- Reparse refusal is unconditional on Windows: every path component —
  root ancestors, any in-root directory, and the file itself — is walked
  with reparse attributes refused, so the Unix "symlinked dotfile layout
  inside the root" allowance does not carry over; a Windows layout that
  wants indirection must present a real directory tree to the loader.
- Short-name aliases (8.3), Unicode normalization confusables, NTFS
  alternate data streams (`:` — already grammar-rejected), reserved device
  names (`CON`, `PRN`, `AUX`, `NUL`, `COM1`..`COM9`, `LPT1`..`LPT9`,
  case-insensitive), and trailing dots or spaces are explicitly rejected
  at the canonical step; canonicalization uses the long-path-resolved
  canonical form only.
- A profile or explicit `--config` path chosen on Windows may itself be
  a real directory or file only; a path that contains any reparse-point
  component is rejected by the unconditional Windows walk above, so the
  loader never uses reparse-point attributes to leap outside the
  configuration root.

### What the loader may not do

- No filesystem-write paths, no `os`/`io`/`exec` reach, no environment
  probing (`ADR-0006` denial unchanged), no network, no bytecode loading
  (`load`, `string.dump`, or precompiled chunks — the `load*` deny list
  is unchanged, so a module is always parsed from its source bytes, and
  bytecode loading stays refused even for a served file).
- No loading outside one generation: nothing persists into the second
  process, no on-disk cache, no cross-VM sharing, and no plugin read
  authority.
- The plugin-host rooted loader keeps its own contract and is never
  reused as the config loader, and the config loader's code path is
  never callable from plugin or settings VM scope.

## Budgets and accounting (candidate)

Budget values are contract numbers owned here at candidate status; the
integration host is the same accounting that already guards the config VM:

| Budget                                | Cap                                                                  | Rationale and accounting integration                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Per-file source size                  | 64 KiB, 2048 lines, 4096 bytes/line                                  | The shipped configuration-file bounds apply unchanged to every module file; a bigger module is rejected with `E_CONFIG_MODULE_SIZE`, never truncated.                                                                                                                                                                                                                                                                                                |
| Aggregate source size                 | 256 KiB across the generation                                        | Bounds the total parser input no matter how modules are split; exceeding it fails with `E_CONFIG_MODULE_AGGREGATE`.                                                                                                                                                                                                                                                                                                                                  |
| Module count                          | 64 distinct modules                                                  | Identical to the shipped top-level-key cap; prevents splitting a giant config into many tiny files to dodge the aggregate cap.                                                                                                                                                                                                                                                                                                                       |
| Depth                                 | 16                                                                   | Matches the profile `extends` chain cap; a deeper chain fails with `E_CONFIG_MODULE_DEPTH`.                                                                                                                                                                                                                                                                                                                                                          |
| Evaluation (instructions, wall clock) | RC-1 shape applied per generation, not per module                    | Same values as the config VM evaluation today; the whole graph must fit the startup budget, charged to [ADR-0007 config-VM PB-1 accounting](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0007-async-gc.md) with the `config_eval_budget` structured record; exceeding it suspends fail-closed and falls back to the last good plan or minimal built-in configuration per the Configuration Model RFC failure rule. |
| Evaluation heap                       | RC-2 32 MiB per Config VM                                            | Unchanged single VM; cache entries, loaded chunks, and module tables all count in the same accounted heap; no per-module heap carve-outs.                                                                                                                                                                                                                                                                                                            |
| Startup wall                          | [PB-1](../specifications/performance-budget-rfc.md) budget unchanged | The module graph costs inside the same cold-start measurement; no async deferral is permitted to hide the cost.                                                                                                                                                                                                                                                                                                                                      |

Accounting rules: the loader refreshes the instruction and wall-account
budgets on entry to every module evaluation exactly as the entry file costs
own they do today — there is no separate per-module budget tier and no
waiver; the general aggregate heap is unchanged (nothing else changes RC-2);
failure inside an opened budget (depth, count, aggregate, wall, heap) fails
the whole graph the startup/check/reload table above; the
`config_eval_budget` record gains the module count and aggregate bytes so
budget dashboards stay explainable.

## Safe mode and plugin isolation (candidate)

- `--safe` never constructs the loader. Safe mode selects the built-in safe
  effective configuration before any external configuration read; it
  ignores `--config`/`BITTY_CONFIG`, profiles, system/distribution probing,
  and CLI appearance overrides entirely, exactly as shipped. There is no
  safe-mode loader state, no safe-mode require availability (the `require`
  global simply does not exist in the safe configuration evaluation), and
  no safe-mode module path. `--safe --config PATH` remains the accepted
  diagnostic composition where `--safe` wins.
- Plugin VMs keep the default-deny `require`. This contract adds no
  `require` to the plugin runtime VM, the plugin settings VM, or any
  future plugin surface; the plugin-host rooted loader remains the
  plugin-ecosystem story with its own trust and containment contract.
- The settings loader stays a bounded plain-data evaluator with no host
  callbacks and no file I/O of its own; it cannot load a config module.
- No cross-escalation: config modules cannot reach plugin loaders, plugin
  packages, or host plugins services; plugin code cannot select a config
  module path; and `bitty ctl config reload` never reloads plugin module
  tree state.
- The loader gives configuration code no new authority beyond the plain
  read of its own root: it grants no capability, no manifest grant, no
  plugin enable, no theme write, and no registry participation.

## Diagnostics and error taxonomy (candidate)

Every refusal emits one typed host diagnostic. Shape
(candidate; render as additive fields on the existing startup/check
diagnostic records):

```text
code            E_CONFIG_* code from the taxonomy below
module_spec     the raw `require` argument byte string (or the corrupted form)
phase           address | open | read | evaluate | extract | budget
source          relative module spec plus phodopus line info, or "entry"
aggregate       the counter that tripped (count | depth-aggregate | budget), when applicable
```

| Code                          | Meaning                                                                                                                | Fail response                    |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `E_CONFIG_MODULE_NAME`        | spec fails the grammar (non-string, traversal/reserved/duplicate-segment, `bitty.*`, backslash/`:`/NUL/another volume) | layer fail-soft / strict failure |
| `E_CONFIG_MODULE_NOT_FOUND`   | resolved path (file or `init` module) does not exist                                                                   | layer fail-soft / strict failure |
| `E_CONFIG_MODULE_AMBIGUOUS`   | both the flat file and the `init` module exist for one spec, and the resolution order cannot pick deterministically    | layer fail-soft / strict failure |
| `E_CONFIG_MODULE_CYCLE`       | a `require` re-entered an in-flight spec (self or ring)                                                                | layer fail-soft / strict failure |
| `E_CONFIG_MODULE_DEPTH`       | require chain over 16                                                                                                  | layer fail-soft / strict failure |
| `E_CONFIG_MODULE_COUNT`       | more than 64 distinct modules in one generation                                                                        | layer fail-soft / strict failure |
| `E_CONFIG_MODULE_SIZE`        | a file exceeds the 64 KiB / 2048-line / 4096-byte-per-line bounds                                                      | layer fail-soft / strict failure |
| `E_CONFIG_MODULE_AGGREGATE`   | generation source total exceeds 256 KiB                                                                                | layer fail-soft / strict failure |
| `E_CONFIG_MODULE_ESCAPE`      | canonical containment failed; a symlink/junction escaped the root                                                      | layer fail-soft / strict failure |
| `E_CONFIG_MODULE_NOT_REGULAR` | the open found a non-regular file, a reparse point, an ADS form, or a special file                                     | layer fail-soft / strict failure |
| `E_CONFIG_MODULE_BUDGET`      | aggregate source/evaluation budget tripped (instructions, wall clock, or RC-2 heap)                                    | fail-closed as today             |
| `E_CONFIG_MODULE_EVAL`        | module chunk raised a Lua error or returned the wrong shape                                                            | layer fail-soft / strict failure |

Redaction rules (carried from the shipped config diagnostics):

- Diagnostics name specs and phodopus line info only, never the resolved
  host path, the configuration root absolute form, the identity check, or
  other filesystem metadata — `E_CONFIG_MODULE_NOT_FOUND` says which spec
  failed, not which absolute path failed.
- Error text echoes at most the offending source line, never the whole
  file, contents of other modules, or a surrounding region.
- Values in plan data stay subject to the existing sensitive-value
  redaction (`*_SECRET*`/`*_TOKEN*`/`*_KEY*`/`*_PASSWORD*` naming shape);
  module loading adds no value channel and no secret-scanning obligation.
- Integration with source attribution: every effective-config field loaded
  through a module keeps the module spec plus line as its source record, so
  `config show --source`-style attribution explains "which module, which
  line" the way the accepted Configuration Model RFC requires layer
  attribution; attribution records carry spec form only.
- The loader adds no Lua-visible diagnostic surface; diagnostics stay
  host-side records as they are for configs today.

## Security review

Independent security acceptance for this candidate must confirm at least:

- one grammar, one root, no Lua-mutable search paths, and no use of the
  plugin-host rooted loader for configuration (and vice versa);
- every containment check is threefold (lexical, canonical,
  handle-bound) and TOCTOU-resistant on Unix (per-component no-follow,
  `openat2` `RESOLVE_*` where available, post-open identity match) and on
  Windows (reparse/refusals, ADS and reserved-name refusal, identity
  match, case-insensitive canonical comparison);
- the bytecode-loading and `load*` denial survives the loader (no
  precompiled or cached chunk can take the load path);
- `--safe` provably reads no external configuration and never reaches a
  module address; plugin and settings VM `require` denial is untouched;
- the budget table matches the chart above and integrates with RC-1/RC-2,
  PB-1/PB-2, and the shipped per-file bounds without introducing a
  per-module budget bypass or a count/size class violation;
- startup salvage, check/doctor strictness, and reload refusal are
  preserved for loader failures, and the error taxonomy is exhaustive
  over the failure surface (no untyped failure); and
- the diagnostics leak nothing beyond the spec + line contract.

Acceptance is a design decision, not a crash gate: the dependent
implementation issue is created only after this document is accepted, per
the issue's explicit sequencing.

## Verification plan

After acceptance, implementation evidence must (in the implementation
issue, not here):

- negative-test the whole taxonomy: malformed specs, traversal attempts,
  `bitty.*` reserved rejection, ambiguity, missing file, cycle including
  self-require, depth over 16, count over 64, per-file and aggregate
  overruns, special files (Unix FIFO/device; Windows ADS, junction,
  reparse, reserved names), symlink-in-root and symlink-escape cases, and
  identity-mismatch TOCTOU simulation;
- prove containment on a case-insensitive Windows volume and a
  case-sensitive Unix volume with the same module set, including a
  root-symlinked dotfiles layout that stays under the canonical root;
- prove budget accounting: the module graph is charged to the same
  RC-1/RC-2/PB-1 records as a single-chunk configuration, with a
  count-of-modules and aggregate-bytes assertion in the record;
- prove the four-path prose: salvage-drop at startup for each taxonomy
  code, non-zero strict check/doctor exits, refused reload that keeps the
  previous plan with the previous module graph intact;
- prove `--safe` with a hostile-on-disk configuration (root escape
  attempt, cycle) still starts with the built-in safe configuration and
  the diagnostic stream names the blocked attempt without host-path
  leaks; and
- prove plugin-VM and settings-VM `require` refusal is byte-identical to
  today's refusal (no new error text, no new fallthrough).

Run the owning repository gates (`just check`, `just links`) for the
documentation side; implementation times run the `bitty` gates.

## Alternatives considered

- **Ambient runtime-path `require` (Neovim-style, rejected).** Multiple
  roots with first-found precedence is a search-policy surface Lua can
  influence and a containment audit nightmare; the accepted direction
  already says resolution must avoid ambient first-found semantics.
- **Explicit user-registered module roots (deferred).** A user-declared
  extra root (for distributions sharing modules) would be a trust
  decision over untrusted-adjacent trees; deferred until system
  defaults/policy Lua itself has a decided trust model, and then only as
  a separate contract.
- **Reusing the plugin-host rooted loader (rejected).** The rooted loader
  exists for package-module trees with manifest-mediated trust; config
  layout, budgets, and trust differ (user-trusted free-form Lua versus
  package-scoped plain-data returns), so sharing code invites sharing
  trust.
- **Allowing project-tree or `XDG_CONFIG_DIRS` modules (rejected).** T-08
  keeps project configuration declarative; system Lua execution is an
  unresolved trust decision.
- **Returning load sentinels for cycles (rejected).** Ambient Lua's
  partial-table `package.loaded` behavior invites half-initialized plans;
  cycle-as-failure keeps the declarative contract total.
- **No nested `require` (rejected).** Forcing every module to inline its
  all sources once makes splitting genuinely impossible; nesting with
  containment and budgets is the point of the feature.

## Affected contracts

- [Configuration Model RFC](../specifications/configuration-model-rfc.md):
  reload classification and whole-layer failure rule — the four-path table
  composed with the accepted semantics, no change to the pipeline itself.
- [Lua and XDG configuration](../configuration/lua-and-xdg.md): the
  candidate module-resolution sketch gains this contract as its concrete
  naming/root answer; cross-link from there, no duplication. The deleted
  `local bitty = require("bitty")` sketch is superseded: `bitty` stays a
  preloaded host table, never a module.
- [ADR-0007 async GC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0007-async-gc.md):
  config-VM budget charging assumed this loader; no numeric change.
- [Threat model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md):
  T-15/T-16 coverage record; no P0 gate changes.
- Plugin runtime and settings surface: untouched (deny-list confirmation
  only).

## Open points

- The Lua VM/runtime and stdlib question (open in
  [Lua and XDG configuration](../configuration/lua-and-xdg.md)) stays
  open: this contract fixes the loader surface, not the wider stdlib
  admission.
- Whether `require` also serves a future `bitty init --migrate` or
  template-generation path (it does not in this revision).
- Deeper ambiguity policy: if a flat file and an init module disagree in
  existence over symlink boundaries, the resolution order above is the
  chosen tiebreak — an error is not reachable through the chosen
  deterministic order, and accepting both shapes only through an
  explicit `--`-style diagnostic is a follow-up.
- Exact final numeric values for depth/count/aggregate caps are contract
  numbers that can shift by RFC revision; the values above are the
  candidate proposal.
- A per-module environment snapshot (`bitty.env.get` inside modules)?
  The config-VM host-bridge question is its own open point; this
  contract adds no module-value bridge.

## Acceptance criteria

- Accepted config/security design with independent security review (the
  review itself lands on the PR, by a reviewer who did not author this
  draft).
- One unambiguous module-resolution contract and error taxonomy (the
  sections above).
- Explicit startup/check/doctor/reload/cache/cycle/resource-bound
  semantics.
- Threat model and platform path-security coverage for Unix and Windows
  (the T-15/T-16 record in bitty-docs
  [threat-model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md)).
- The dependent implementation issue is created only after design
  acceptance; nothing in this draft authorizes implementation.

## P0 Review Sign-off

This draft records no P0 sign-off and closes no security risk. It defines
required behavior for a future implementation under P0 controls; evidence
comes from the implementation PR under the verification plan above.

## References

- [Issue `bitty#2670`](https://github.com/bitty-terminal/bitty/issues/2670)
  (design gate) and its follow-up from issue
  [`bitty#2581`](https://github.com/bitty-terminal/bitty/issues/2581).
- [Lua and XDG configuration](../configuration/lua-and-xdg.md) — the
  candidate module-resolution sketch this contract resolves.
- [Configuration Model RFC](../specifications/configuration-model-rfc.md)
  — accepted pipeline, layer stack, reload classification.
- [ADR-0007 async GC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0007-async-gc.md)
  — config-VM budget charging and cache assumptions.
- [Threat model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md)
  — T-15/T-16 coverage record.
- Shipped evidence: `crates/bitty-lua/src/config.rs` and
  `crates/bitty-config/src/file.rs` on `bitty` `origin/main` (sandbox
  deny list, file bounds, fail-soft salvage, explicit-selection
  failures).
