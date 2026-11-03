---
title: Config Lua Require Contract
description: Design and security review for a bounded, single-root module loader inside configuration Lua
category: specifications
audience: security-reviewer
document_type: specification
status: accepted
website_publish: false
sidebar_order: 80
---

# Config Lua Require Contract

## Document status

> Status: **accepted on 2026-11-04** after the third independent security
> review returned `ACCEPTED`
> ([Restricted Config Require Contract Third Review](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/config-require-third-review.md),
> merged as [bitty-docs#494](https://github.com/bitty-terminal/bitty-docs/pull/494)).
> The three rounds read the same text: round one returned `NEEDS-FIX` on
> `G-1`..`G-3`, round two returned `NEEDS-FIX` on `B-1`..`B-4`, and round three
> closed every blocking finding, left five earlier and four new non-blocking
> findings open, and authorized this promotion through the design gate
> [bitty#2670](https://github.com/bitty-terminal/bitty/issues/2670). The
> accepted revision is the one that review read (`bitty-terminal-docs`
> `d327a1a`), so the promotion changed only its status, its title, the
> sentences that described the review as still pending, and the open-items
> record below; no reviewed mechanism, budget, or taxonomy row was edited.
>
> **Nothing is implemented.** The shipped configuration VM still denies
> `require` (`crates/bitty-lua/src/config.rs`), the shipped configuration
> surface remains one data-returning chunk, and no statement here claims
> shipped, stable, or supported behavior. Acceptance records a reviewed design
> and authorizes the dependent implementation issue; it is not evidence of
> behavior, it closes no P0 control, and that implementation issue has not been
> opened. Manual and generated-template synchronization stays blocked until
> implementation, because those surfaces describe shipped behavior.
>
> The residuals the review admitted, and the non-blocking findings it left
> open, are carried with an owner each in
> [Open items after acceptance](#open-items-after-acceptance). Acceptance
> closes none of them: no residual becomes a closed property, and the
> still-open findings are owed work, not accepted risk.

This contract depends on shipped behavior in the owning implementation
repository, read-only from `bitty` `origin/main`
(`crates/bitty-lua/src/config.rs`, `crates/bitty-lua/src/lib.rs`,
`crates/bitty-config/src/file.rs`, `crates/bitty-config/src/plain_config.rs`,
`crates/bitty-config/src/merge.rs`, and the bounded-read pattern in
`crates/bitty-runtime/src/plugin_runtime/plugin_settings.rs` and
`crates/bitty-runtime/src/component/activation.rs`):

- The configuration chunk runs in a fresh sandbox VM with the plugin-grade
  RC-1 (10,000,000 instructions and 50 ms wall clock) and RC-2 (32 MiB
  accounted heap) budgets. `print`, `tonumber`, `io`, `os`, `debug`,
  `package`/`require`, `load`/`loadfile`/`dofile`, `_G`, and every host
  callback are absent by default; a chunk that references a denied global
  fails closed with a Lua runtime error. Metatables may be set but extraction
  reads raw table contents, so `__index` cannot smuggle values past
  validation.
- File bounds are 64 KiB, 2048 lines, 4096 bytes per line, 64 top-level keys,
  32 keys per nested table, and 2048 bytes per string
  ([configuration options](../reference/configuration-options.md)).
- `--config PATH` / `BITTY_CONFIG` selects an explicit entry file that must
  exist (fail closed, exit 2); profiles live under
  `<config-dir>/profiles/<name>.lua` with single-parent `extends` chains
  (16-hop cap, cycle detection); `--safe` selects the built-in safe effective
  configuration without any external configuration read.

## Purpose and scope

Issue `bitty#2670` asks for the design gate before any implementation: the
restricted, config-only Lua module loader that would make `require(...)` legal
inside configuration Lua, so that `init.lua` and its profiles can split across
`lua/` modules the way the accepted direction in
[Lua and XDG configuration](../configuration/lua-and-xdg.md) sketches.
Plugin Lua already gets a package-tree-rooted loader because plugins need
shared code; user configuration gets nothing today because an ambient runtime
search path is a security event. This contract chooses the narrow answer: one
root, exact containment, a bounded graph, a bounded budget, fail-closed on
every refusal, and no new authority for any other VM.

In scope: module naming and the root model, including how roots are derived
from `init.lua`, a profile, and `--config PATH`; nested-module loading; cache,
duplicate-load, cycle, recursive-load, and module-graph identity; startup
fail-soft versus strict `bitty config check` / `bitty doctor` and refused
reload; path containment including symlink, reparse-point, and junction
handling, TOCTOU resistance, Windows path rules, non-blocking
special-file rejection, and a bounded read whose byte count must match the
opened handle;
depth, count, per-file, aggregate, and evaluation budgets with their
accounting; `--safe` preservation and the preserved plugin-Lua denial of
`require`; diagnostics, source attribution, redaction, and the error taxonomy;
and a threat model with residual risks.

Out of scope: the implementation itself, plugin-sandbox changes, arbitrary
module search paths, network import, release, tag, catalog, and CDN changes,
per-plugin settings Lua (its plain-data surface is untouched), system
defaults or policy executed as Lua, and project-scope Lua (its trust gate
stays with the configuration and workspace trust record in the
[threat model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md)).

## Normative sources this specification must not weaken

- [Security overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  least privilege per untrusted input class, limits on size, time, nesting,
  rate, and memory per protocol, and the rule that `--safe` always starts
  with the minimal built-in configuration and no third-party plugins.
- [Threat model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md):
  the configuration and workspace trust record — user configuration is
  trusted code, but its loader is still a host-controlled file-read surface
  and never a filesystem authority.
- [Configuration Model RFC](configuration-model-rfc.md) (accepted): the
  declarative `ConfigPlan` two-stage pipeline, layer stack, merge rules,
  reload classification, and fail-closed enumeration.
- [Performance Budget RFC](performance-budget-rfc.md) PB-1 cold startup
  (≤ 100 ms p50, ≤ 200 ms p99), which the module graph must fit without
  deferral.
- [Lua and XDG configuration](../configuration/lua-and-xdg.md): the accepted
  `Config VM -> $BITTY_CONFIG/lua/` resolution direction, RC-1/RC-2 posture,
  and the `--safe` precedence contract.
- [Configuration options](../reference/configuration-options.md): the shipped
  per-file bounds, fail-closed element handling, and startup salvage versus
  strict diagnostics contract this document reuses rather than redefines.

## Terminology

- **Configuration directory**: the directory the runtime already resolves as
  the configuration target — `dirname(PATH)` for an explicit `--config` /
  `BITTY_CONFIG`, otherwise `$XDG_CONFIG_HOME/bitty` (fallback
  `~/.config/bitty`), and `%APPDATA%\bitty` on Windows.
- **Entry file**: the Lua file that starts a configuration evaluation —
  `<config-dir>/init.lua`, its `config.lua` fallback, `<config-dir>/profiles/<name>.lua`,
  or an explicit `--config` path.
- **Module root**: the single directory tree from which every `require` call
  in one generation resolves. Exactly one module root exists per generation.
- **Module spec**: the string argument to `require`, for example
  `"config.options"`.
- **Generation**: one startup, check, doctor, or reload evaluation of the
  configuration layer stack. The loader, its cache, and its budget accounts
  exist only inside one generation.
- **Module graph**: the directed reference graph of module identities that one
  generation evaluated, with each node's spec and source span.

## Decision register

Each item the issue asks this document to settle is either decided here or
explicitly left open, with the owning section named so a reviewer can check
one row at a time.

| Issue item                                 | Disposition                                                                                                                                                                     | Section                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Module naming and root model               | Decided: one grammar, one root (`<config-dir>/lua`), nested modules allowed, deterministic collision-failing resolution                                                         | [Module naming and root model](#module-naming-and-root-model)       |
| Cache, duplicates, cycles, recursive loads | Decided: per-generation host-side cache keyed by file identity, duplicates return the cached value, cycles and depth overrun fail                                               | [Loader semantics](#loader-semantics-cache-duplicates-and-cycles)   |
| Module graph identity                      | Decided: identity is the opened file identity, not the spec byte string; cached aliases collapse to one evaluation                                                              | [Graph identity](#graph-identity)                                   |
| Startup, check, doctor, reload             | Decided: startup salvages the whole layer, check and doctor are strict and non-zero, reload refuses and keeps the previous plan                                                 | [Failure behaviour](#failure-behaviour-startup-check-doctor-reload) |
| Path containment and platform security     | Decided: lexical and canonical checks, then a descriptor-anchored no-follow walk from an open root; reparse and special-file refusal; length-checked read; Windows rules stated | [Path containment](#path-containment-and-platform-handling)         |
| Budgets                                    | Decided in shape, proposed in numbers: depth 16, 64 modules, 64 KiB per file, 256 KiB aggregate, unchanged RC-1/RC-2 and PB-1                                                   | [Budgets and accounting](#budgets-and-accounting)                   |
| `--safe` and plugin `require` denial       | Decided: safe mode never constructs the loader; plugin and settings VMs keep the default-deny list unchanged                                                                    | [Safe mode and isolation](#safe-mode-and-plugin-isolation)          |
| Diagnostics, attribution, error taxonomy   | Decided: typed `E_CONFIG_MODULE_*` codes, spec plus line attribution, redaction rules, per-path surfacing                                                                       | [Diagnostics](#diagnostics-and-error-taxonomy)                      |
| Threat model                               | Decided for this revision: fifteen rows with mitigations and residual risks; no row claims a closed residual                                                                    | [Threat model](#threat-model)                                       |

## Decision summary

Configuration `require` resolves one spec grammar against exactly one root —
`<config-dir>/lua/` — with host-side per-generation caching, cycle and depth
failure, threefold path containment (lexical, canonical, and descriptor-anchored,
with the root-relative remainder resolved beneath an open canonical root and the
object typed and length-checked before it is parsed), the shipped
per-file limits plus aggregate graph caps, the same RC-1/RC-2 evaluation budget
as the configuration VM today, whole-layer fail-soft startup salvage versus
strict check and doctor and a refused reload, bounded and escaped typed
diagnostics whose rendering contains only an allowed byte set, no loader at all
under `--safe`, and no `require` for plugin or settings VMs.

## Module naming and root model

### Name grammar

A module spec must match:

- 1..16 segments separated by a single `.`; each segment is an identifier of
  1..64 bytes whose first byte is `[A-Za-z0-9]` and whose following bytes are
  `[A-Za-z0-9_-]`; the whole spec is at most 256 bytes;
- no leading or trailing `.`, no consecutive `.`, and no `..` segment;
- no backslash, slash, drive letter, `:` (an NTFS alternate-data-stream
  separator and a Windows reserved form), NUL byte, or non-ASCII byte;
- no reserved first segment `bitty`: `require("bitty")` and every `bitty.*`
  spec fail closed. The host bridge stays a preloaded read-only table if it
  ships, never a module, so the `local bitty = require("bitty")` sketch in
  [Lua and XDG configuration](../configuration/lua-and-xdg.md) is superseded
  by this decision.

Non-string arguments, runtime-mutated specs, and specs that fail the grammar
fail closed with `E_CONFIG_MODULE_NAME`. The grammar is total: because it
admits no separator, no `.` traversal component, and no drive or volume form,
a spec can never name a parent directory, an absolute path, another volume, or
a stream.

### Root derivation

One grammar, one root per generation:

```text
Config VM   -> <config-dir>/lua/     exactly one root per generation
Plugin X VM -> package tree          plugin-host rooted loader, unchanged
Settings VM -> nothing               require stays denied
```

| Entry selection                      | Entry file                           | Module root                   |
| ------------------------------------ | ------------------------------------ | ----------------------------- |
| Default probe                        | `<config-dir>/init.lua`              | `<config-dir>/lua/`           |
| Default probe, `config.lua`          | `<config-dir>/config.lua`            | `<config-dir>/lua/`           |
| Explicit `--config` / `BITTY_CONFIG` | the given path                       | `dirname(path)/lua/`          |
| Profile, default root                | `<config-dir>/profiles/<name>.lua`   | `<config-dir>/lua/`           |
| Profile under explicit config        | `dirname(path)/profiles/<name>.lua`  | `dirname(path)/lua/`          |
| `extends` parent profile             | `<config-dir>/profiles/<parent>.lua` | the same root as the child    |
| `--safe`                             | none evaluated                       | none; the loader is not built |
| System `$XDG_CONFIG_DIRS` layer      | none in this revision                | none; not admitted            |

The derivation is the same rule in every row: the module root is the `lua/`
directory of the configuration directory, and the configuration directory is
the directory that owns the entry file — with a profile entry owned by the
directory above `profiles/`. The rule never consults the working directory,
drive substitution, `$PATH`, `$LUA_PATH`, or any Lua-set variable; a profile
never adds, replaces, or narrows the root, and an `extends` chain shares one
root and one cache because it is one generation.

System and distribution layers are not admitted to this loader in this
revision. System Lua execution is still an open trust decision in
[Lua and XDG configuration](../configuration/lua-and-xdg.md), and no
system-shaped module path exists yet; admitting one would let a
distribution-controlled tree resolve `config.options` ahead of the user's
file.

### Resolution order

For spec `a.b.c` the loader tries, in this order:

1. `<root>/a/b/c.lua` — the flat module file;
2. `<root>/a/b/c/init.lua` — the init module.

Both existing for one spec is not a preference: the load fails closed with
`E_CONFIG_MODULE_AMBIGUOUS` instead of picking one. Neither existing fails
with `E_CONFIG_MODULE_NOT_FOUND`. A `.lua` suffix inside a spec is invalid by
the grammar, because `.` splits a segment, so no spec can address an `init.lua`
by file name and no spec can address a non-`.lua` file at all.

### Nested modules

A module may call `require` again. Every such call resolves against the same
single root: no per-module subtree roots, no sibling-directory roots, no
upward references, and no root-relative escape hatch. Nesting is the feature —
it is what lets `init.lua` compose `config.options`, `config.appearance`, and
`config.keymaps` — and it is bounded by the depth, count, and aggregate
budgets in [Budgets and accounting](#budgets-and-accounting).

### Loader surface

`require` is one host-provided global function on the configuration VM.
`package`, `package.path`, and `package.loaders` are never created, so there
is no Lua-visible search path to mutate, and `loadlib` does not exist. The
function takes exactly one string argument and returns the module's
plain-data return value; every refusal raises a fail-closed typed error.
`dofile`, `loadfile`, `load`, and the rest of the deny list stay absent, so a
module is always compiled from source bytes by the host parser and a prebuilt
binary chunk can never take the load path.

Modules carry the same declarative duty as the entry file: they are
plain-data producers, not imperative agents. A module may compose submodules,
but the chain ultimately feeds one `ConfigPlan` table through the accepted
two-stage pipeline. A module returning a function, a scalar, or another
non-table value fails validation at the extraction boundary exactly like the
entry file's shape contract does today.

## Loader semantics: cache, duplicates, and cycles

- **Cache.** The loader keeps a host-side, per-generation map from module
  identity to returned value. It is deliberately not Lua-visible: there is no
  `package.loaded` equivalent, so configuration code cannot enumerate the
  graph, mutate another module's value through the cache, or fake a cache hit.
  The cache is built by the host and never survives the generation.
- **Duplicate load.** A second `require` that resolves to an
  already-completed identity returns the cached value without re-evaluating
  the file. The returned table's identity is stable for the generation, so
  diamond-shaped imports share one instance and one set of table mutations.
- **Recursive load.** A `require` of an in-flight identity — a module whose
  own evaluation has not returned — is a cycle and fails closed with
  `E_CONFIG_MODULE_CYCLE`. The loader never returns a partially initialized
  module table and never returns a sentinel. This is stricter than ambient
  Lua's `package.loaded` behavior and matches the declarative model: a cycle
  is a plan-shape error, not a partial-value facility.
- **Cycle shape.** A self-import, a two-module ring, and a longer ring under
  the depth cap all produce the same code. The diagnostic names the specs on
  the in-flight chain in import order, which is the order a reader needs.
- **Depth.** The require chain is capped at 16 nested evaluations, counted on
  the nesting stack rather than per distinct module; exceeding it fails with
  `E_CONFIG_MODULE_DEPTH` before evaluation of the 17th module starts.
- **Evaluation order.** Depth-first, left-to-right in source order, and fully
  synchronous on the startup path. There is no deferred or coroutine loading,
  no handle or future return, and no loader work after configuration
  evaluation ends.
- **Lifetime.** The cache clears on every reload and every startup. There is
  no on-disk cache, no compiled-bytecode cache, no background prefetch, and
  no cross-VM sharing.

### Graph identity

Identity is the opened file, not the spec byte string. Each load records the
file identity of the handle it read — device and inode on Unix, volume and
file ID on Windows — and the cache is keyed by that identity; the spec is a
lookup key that resolves to an identity and, for diagnostics, the name a
reader recognizes.

Consequences, all deliberate:

- **Aliases collapse.** Two specs that reach the same file evaluate once and
  share one value: a hardlink inside the root, and on a case-insensitive
  volume a case-variant spec such as `Config.Options` versus
  `config.options`. On a case-sensitive volume the case variant is a
  different file or a not-found, which is the filesystem's own answer.
- **The count budget counts identities**, so alias collapse cannot be used to
  spend a second module slot on one file, and cannot be used to exhaust the
  budget by re-importing a large module under new names.
- **Attribution names the first loader.** A diagnostic or effective-value
  source record names the spec that first loaded the identity; later aliases
  inherit that attribution rather than inventing a second source.
- **No graph identity across generations.** Reload and restart build a new
  graph from disk with a fresh cache; nothing about the previous graph — not
  values, not identity, not attribution — carries over.

## Failure behaviour: startup, check, doctor, reload

Startup stays fail-soft so recovery remains possible; verification paths stay
strict; reload refuses rather than adopts a partial graph. All four paths
share one loader and one validation sequence, so there is no divergent second
parser.

| Path                      | Behavior on any loader failure                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Startup                   | The whole external layer that started the failing evaluation is dropped under the existing whole-layer rule (see [Startup salvage and strict diagnostics](../reference/configuration-options.md#startup-salvage-and-strict-diagnostics)); every other valid layer and the built-in defaults continue; one bounded diagnostic names the code, the spec, and the entry. Nothing is silently defaulted. |
| Explicit entry presence   | Unchanged and still fatal: a missing `--config` / `BITTY_CONFIG` path, or a requested-but-missing or invalid profile, fails closed with exit 2 before any evaluation. Only failures inside a present entry fall under the startup row.                                                                                                                                                               |
| `bitty config check`      | Strict: each module finding is reported with its code, spec, and line, and the command exits non-zero with no salvage and no partial success.                                                                                                                                                                                                                                                        |
| `bitty doctor`            | Strict: loader findings land in the diagnosis with the taxonomy code and the affected configuration source, and the command exits non-zero.                                                                                                                                                                                                                                                          |
| `bitty ctl config reload` | Refused: the previous good plan and its previous module graph stay active; the reload reports the typed finding and never adopts a partially good graph.                                                                                                                                                                                                                                             |
| `bitty init` / templates  | Unchanged: generated templates stay self-contained data and are produced without constructing a loader.                                                                                                                                                                                                                                                                                              |

Rationale: a module failure is a content failure of one external layer, and
the shipped startup salvage already collapses whole-layer failures — Lua
syntax or runtime faults, budget exhaustion, unreadable files, undeclared
keys, and profile `extends` failures — into a documented layer drop with a
bounded diagnostic. Module loading introduces no new failure tier and no new
fatal case. The only fatal cases remain the existing explicit-selection
preconditions listed in the second row.

A reload differs from startup in one respect worth stating: it re-evaluates
the whole generation from disk, so a module edit is seen, but a loader
failure at any point leaves the running plan untouched. Startup therefore
degrades, check and doctor report, and reload refuses.

## Path containment and platform handling

Containment is three independent checks, all fail closed, and the decision is
bound to a walk from an open root descriptor rather than to a path string.

1. **Lexical containment.** The spec resolves to `<root>/<a>/<b>/<c>.lua` or
   `<root>/<a>/<b>/<c>/init.lua`. Traversal components cannot arise from the
   grammar, and the host re-verifies that the joined path stays inside the
   resolved root and contains no `.`, `..`, backslash, drive letter, NUL, or
   reserved form.
2. **Canonical containment.** The root and the joined path are canonicalized,
   and the canonical path must stay inside the canonical root. Symlinked path
   components inside the configuration root are permitted only when the
   canonical target — the file and every parent — stays under the canonical
   root, which keeps the common dotfiles layout (a symlinked configuration
   directory resolving back under the real tree) workable. Any target outside
   the root, including a symlink into another tree, fails with
   `E_CONFIG_MODULE_ESCAPE`. Canonicalization failures on a module path — loop
   detection, `ELOOP`, permission denied — reject with
   `E_CONFIG_MODULE_ESCAPE`; a failure to canonicalize or open the root itself
   is `E_CONFIG_MODULE_ROOT`, not an escape. The canonical target supplies the
   remainder the loader walks: the loader strips the canonical root prefix from
   the canonical target — a target that does not start with that prefix plus a
   separator is already an escape — and resolves that remainder beneath an
   already-open descriptor for the canonical root, so the allowed layout is
   honored by walking a symlink-free remainder, not by refusing the layout at
   the open.
3. **Descriptor-anchored open.** The anchored walk is the rule and a by-path
   open is the fallback, because only the anchored walk refuses an intermediate
   component that is swapped after canonicalization. The host opens the
   canonical root once, resolves the root-relative remainder from that
   descriptor, and records identity from the final handle only:
   - **Root open.** `O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC` on the
     canonical root. A root that cannot be canonicalized, opened, or typed as a
     directory — `ELOOP`, `ENOENT`, `EACCES`, not-a-directory, or a symlinked
     final component — is `E_CONFIG_MODULE_ROOT`: the loader is not built and no
     spec resolves.
   - **Linux.** Resolve the remainder from the root descriptor with `openat2`,
     using the resolve flags `RESOLVE_BENEATH`, `RESOLVE_NO_SYMLINKS`, and
     `RESOLVE_NO_MAGICLINKS`, and the open flags `O_RDONLY`, `O_NONBLOCK`, and
     `O_CLOEXEC`. `RESOLVE_BENEATH` measures containment from `root_fd`, so an
     absolute remainder and a `..` remainder fail with `EXDEV`, and the two
     no-follow flags refuse a symlink or a magic link at any component,
     including a component replaced after canonicalization. The remainder comes
     from the canonical target, so an admitted in-root symlink layout arrives
     here as its symlink-free canonical form and these flags are not a second
     refusal of a layout step 2 allows.
   - **macOS and the BSDs.** No `openat2`, so the same rule is a per-component
     walk: each directory component is opened with `openat` from its parent
     descriptor using `O_RDONLY`, `O_DIRECTORY`, `O_NOFOLLOW`, and `O_CLOEXEC`,
     and the final file with `O_RDONLY`, `O_NOFOLLOW`, `O_NONBLOCK`, and
     `O_CLOEXEC`. Every step is relative to the previous descriptor, so a
     component swapped after canonicalization is refused by `O_NOFOLLOW` before
     it is traversed, and `O_DIRECTORY` stops a swapped regular file or FIFO
     from standing in for a directory.
   - **Windows.** Open the canonical root handle once, then open each component
     below it with `FILE_FLAG_OPEN_REPARSE_POINT`; refuse any component that
     carries a reparse attribute or is not the expected type, and compare the
     final handle's `FILE_ID_INFO` with the identity recorded for the canonical
     target. A reparse attribute, a wrong type, or an identity mismatch rejects
     with `E_CONFIG_MODULE_ESCAPE`.
   - **What the identity is for.** The identity recorded on the open handle has
     exactly two uses: it keys the per-generation cache so aliases collapse to
     one evaluation ([Graph identity](#graph-identity)), and it is a redundant
     confirmation that the object the walk opened is the object canonicalization
     described. It does not close the TOCTOU window, and this contract does not
     claim it does. An identity recorded by a path-following call after
     canonicalization already carries the attacker's identity for an
     intermediate component swapped in that window, so a matching comparison
     would pass precisely when the race is used. Containment therefore rests on
     the walk — every component of the read target resolved from an
     already-open descriptor under a no-follow rule — and never on the
     comparison.

4. **Special files, opened non-blocking.** Only a regular file opened through
   the anchored walk is read, and the object type is decided before any read can
   wait. The open is `O_RDONLY | O_NONBLOCK | O_CLOEXEC` plus the step 3 flags
   (`O_NOFOLLOW` on each `openat`, `RESOLVE_NO_SYMLINKS` in `openat2`); the host
   then `fstat`s the handle and rejects any object whose type is not a regular
   file — FIFO, character or block device, socket, directory reached by a
   non-`init` resolution, named pipe — with `E_CONFIG_MODULE_NOT_REGULAR`. Only
   after that rejection does the host clear `O_NONBLOCK`, and only then does it
   read. The order is the guarantee, not an implementation detail: a blocking
   `O_RDONLY` open of a FIFO waits for a writer before any check runs, so it
   would turn a required fail-closed refusal into an unbounded wait on startup,
   `bitty config check`, and `bitty doctor`. No open, `fstat`, or check in this
   path is allowed to block for that reason. The descriptor is close-on-exec,
   matching the corpus rule for every descriptor a process can inherit.
5. **Bounded, length-checked read.** The read is one bounded loop, not an
   unbounded read and not a "read in full": the host reads
   `take(cap + 1).read_to_end(&mut bytes)` from the anchored handle, with `cap`
   the 64 KiB per-file ceiling and the expected length taken from that handle's
   metadata, then requires `bytes.len()` to equal that expected length. "Read
   once" is a mechanism; "in full" is not, because a read on a regular file may
   return fewer bytes than requested — the file shrank between the `fstat` and
   the read, a signal interrupted it after a partial transfer, or the
   filesystem returns short reads — so a single read can yield a prefix of the
   module. A prefix cut at a statement boundary can still compile, so a loader
   that accepted it would produce a silently truncated plan, which is the
   fail-open on content this section otherwise forbids. A read error, a byte
   count that differs from the handle's size, or a `take(cap + 1)` that returns
   more than the cap is therefore a refusal with `E_CONFIG_MODULE_READ`, never a
   parsed prefix: nothing partial reaches the parser, the extraction step, or
   the plan. The accepted byte count is what the generation's aggregate account
   is charged, so the 256 KiB cap is charged for exactly what was read. The
   shape is the one the repository already ships for this job:
   `read_bounded_regular_file` in
   `crates/bitty-runtime/src/plugin_runtime/plugin_settings.rs` and
   `read_record_bytes` in `crates/bitty-runtime/src/component/activation.rs`
   both read `take(cap + 1).read_to_end()` and refuse a byte count that differs
   from `metadata.len()`, and this contract follows them rather than describing
   a weaker check.
   Residual, on this open-and-read path: an unusual, FUSE-backed, or
   network-backed filesystem can still defer inside `open` or `fstat` in ways
   no flag controls; that delay is outside what this contract guarantees and is
   recorded in the [threat model](#threat-model) rather than claimed closed.

### Windows path rules

- The module root on Windows is `%APPDATA%\bitty\lua`; configuration roams
  with the user profile. The grammar is identical on every platform:
  backslash, `:`, drive-letter prefixes, `\\?\`, `\\.\`, and UNC forms cannot
  appear in a spec, so a spec can never name a stream, a device, or another
  volume.
- Reparse refusal applies from the canonical root downward. Every in-root
  directory and the file itself is walked with reparse-point attributes
  refused, so the Unix "symlinked layout inside the root" allowance does not
  carry over below the root. A Windows layout that wants indirection must
  present a real directory tree to the loader.
- Root ancestors are resolved once, not refused. The configuration directory is
  canonicalized during root derivation, before any module path exists, so a
  redirected or junctioned `%APPDATA%` — a common enterprise folder-redirection
  layout — produces a canonical root and a loader that works: no ancestor above
  the canonical root takes part in containment, so refusing one would refuse
  the whole loader for a layout the user did not choose. If that
  canonicalization fails, the loader is not built and `require` reports
  `E_CONFIG_MODULE_ROOT` — `phase` `root`, `source` naming the entry, `detail`
  naming the layout as refused, and no `module_spec`, because no spec resolved.
  It never reports `E_CONFIG_MODULE_NOT_FOUND`, because a module-shaped error
  would send the user looking for a missing file instead of a redirected
  profile.
- Case handling: canonical comparisons and identity checks are
  case-insensitive where the volume is, so two differently cased paths cannot
  smuggle one file past a containment check that already passed, and the
  identity-keyed cache collapses those aliases to one evaluation.
- Short-name aliases (8.3), Unicode normalization confusables, NTFS alternate
  data streams (`:` is grammar-rejected), reserved device names (`CON`, `PRN`,
  `AUX`, `NUL`, `COM1`..`COM9`, `LPT1`..`LPT9`, case-insensitive), and trailing
  dots or spaces are rejected at the canonical step. Canonicalization uses the
  long-path-resolved canonical form only.

### Module-root medium assumptions

The containment and identity rules above assume a local fixed volume, and this
contract states that assumption instead of leaving it implied. An explicit
`--config` / `BITTY_CONFIG` on a network share, a mapped drive, or removable
media makes the module root remote or removable, where the identities the
checks compare are weaker than on a local disk: some network filesystems
synthesize `dev`/`inode` or `FILE_ID_INFO` values per client or per mount, some
removable media recycle them across mounts, and `FILE_ID_INFO` support varies by
filesystem and driver even on Windows.

- Containment, the non-blocking object order, the size caps, and the budgets
  hold on every medium, because none of them needs the identity to be globally
  unique: an identity that cannot be compared still fails the comparison, and
  the object still has to be a regular file under the root.
- Alias collapse and duplicate-load suppression are exact only on a local fixed
  volume. On a remote or removable root, two paths a local volume would report
  as one identity can evaluate twice; that spends count and aggregate budget,
  which the caps bound, and grants no new authority.
- A root on such a medium is permitted in this revision as an accepted residual
  recorded in the [threat model](#threat-model), not as a closed property, and
  whether the loader should be restricted to local fixed volumes stays an open
  point rather than a silent default.

The loader never mounts, never enumerates a volume, and never falls back to a
different root when the medium looks unusual. It reads what the canonical path
names, or it refuses.

### Unix and macOS notes

- On macOS the default APFS volume is case-insensitive and normalization
  insensitive; canonical comparison follows the volume's own answer rather
  than assuming either behavior, and the identity check is what actually
  decides reuse.
- Mount points are not reparse points. A mount inside the root that presents a
  tree from outside is accepted when its canonical path is under the root,
  and this is recorded as a residual rather than claimed as closed in the
  [threat model](#threat-model).
- `openat2` is not available on every supported Linux kernel or libc, and never
  on macOS or the BSDs. The fallback there is not a by-path open plus an
  identity comparison: it is the per-component `openat` walk from the root
  descriptor in step 3, which refuses a swapped intermediate component at the
  component itself, so containment does not depend on `openat2` being present.
  A Unix target that cannot open a directory relative to a descriptor and
  refuse a link per component does not build the loader and reports
  `E_CONFIG_MODULE_ROOT`.
- Windows has no descriptor-relative open in the stable surface, so the
  containment mechanism there is the per-component walk with
  `FILE_FLAG_OPEN_REPARSE_POINT` and a type refusal at every component below the
  canonical root handle; the `FILE_ID_INFO` comparison is the same redundant
  confirmation it is on Unix, and no platform's containment rests on it.

### What the loader may not do

- No filesystem-write path, no `os`/`io`/exec reach, no environment probing
  (`os.getenv` stays denied), no network, and no bytecode loading
  (`load`, `string.dump`, `loadfile`, or a precompiled chunk). A binary chunk
  presented as a module is a parse failure, not a load.
- No loading outside one generation: nothing persists into the next process,
  no on-disk cache, no cross-VM sharing, and no plugin read authority.
- The plugin-host rooted loader keeps its own contract and is never reused as
  the configuration loader; the configuration loader's code path is never
  callable from plugin or settings VM scope.

## Budgets and accounting

Every number below is a proposal owned by this contract; the per-file values
and the evaluation budgets are not new, and each row names the document that
owns the number it reuses.

| Budget               | Proposed cap                                                      | Owning or related document and rationale                                                                                                                                                                                              |
| -------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Per-file source size | 64 KiB, 2048 lines, 4096 bytes per line                           | [Configuration options](../reference/configuration-options.md) owns these shipped bounds for ordinary Core configuration; a module larger than the entry file is rejected with `E_CONFIG_MODULE_SIZE`, never truncated.               |
| Aggregate source     | 256 KiB across one generation                                     | Proposal owned here. Bounds total parser input no matter how a user splits files; exceeding it fails with `E_CONFIG_MODULE_AGGREGATE`. 256 KiB is four maximal files, which is generous for composition and still small against RC-2. |
| Module count         | 64 distinct module identities                                     | Proposal owned here, matching the shipped 64 top-level-key cap so the two "64 things" limits stay explainable together. A 65th identity fails with `E_CONFIG_MODULE_COUNT`.                                                           |
| Depth                | 16 nested evaluations                                             | Proposal owned here, matching the shipped profile `extends` 16-hop cap so a user meets one nesting number, not two. Overrun fails with `E_CONFIG_MODULE_DEPTH`.                                                                       |
| Evaluation steps     | RC-1: 10,000,000 instructions and 50 ms wall clock per generation | [Lua and XDG configuration](../configuration/lua-and-xdg.md) records the RC-1 values; the configuration VM already runs under them. The whole graph shares one account.                                                               |
| Evaluation heap      | RC-2: 32 MiB accounted heap per configuration VM                  | Same source. Cache entries, loaded chunks, file bytes, and module tables all count in the one accounted heap; there is no per-module carve-out.                                                                                       |
| Cold startup         | PB-1 ≤ 100 ms p50, ≤ 200 ms p99 unchanged                         | [Performance Budget RFC](performance-budget-rfc.md) owns PB-1. The graph costs inside the same measurement; no asynchronous deferral may hide it.                                                                                     |

Accounting rules, which are the part a reviewer should check hardest:

- **One evaluation account per generation.** Entering a module does not
  refresh, top up, or re-arm the instruction or wall-clock budget. The 10,000,000
  instructions are the generation's total, so a graph of 64 modules shares
  them and cannot multiply the budget by module count. This is a deliberate
  narrowing of the shipped per-chunk behavior, where the entry chunk is the
  only chunk and therefore receives the whole account.
- **Parse cost is bounded by bytes, not by a counter.** Module size and the
  aggregate cap bound host-side parsing before evaluation; a parse failure is
  a typed finding, and the parser never evaluates a partially parsed chunk.
- **Budget failure is not a salvage tier, and it behaves exactly like every
  other loader failure.** Exceeding RC-1 or RC-2 inside a module ends the
  generation under the Configuration Model RFC failure rule: startup drops the
  whole external layer that started the evaluation and keeps the other layers
  and the defaults, `bitty config check` and `bitty doctor` report the finding
  and exit non-zero, and a reload refuses and keeps the previous plan. The
  loader does not retry with a smaller graph, and `E_CONFIG_MODULE_BUDGET` is
  the same fail-soft-at-startup, strict-at-verification behavior as every other
  code in the taxonomy — one behavior per path, stated once.
- **The budget record grows, the numbers do not.** The `config_eval_budget`
  structured record gains `modules` (distinct identities evaluated) and
  `module_bytes` (aggregate source bytes) so a budget dashboard can explain a
  slow generation without new thresholds.
- **No per-module budget tier, no waiver, and no configuration knob.** The
  caps are contract constants; a user cannot raise them, and a distribution
  cannot ship a file that raises them.

## Safe mode and plugin isolation

- `--safe` never constructs the loader. Safe mode selects the built-in safe
  effective configuration before any external configuration read; it ignores
  `--config`/`BITTY_CONFIG`, profiles, system and distribution probing, and
  CLI appearance overrides, exactly as shipped. There is no safe-mode loader
  state, no safe-mode `require` global, and no safe-mode module path.
  `--safe --config PATH` remains the accepted diagnostic composition in which
  `--safe` wins.
- Plugin runtime VMs keep the default-deny list. This contract adds no
  `require` to the plugin runtime VM, the plugin settings VM, or any future
  plugin surface; the plugin-host rooted loader remains the plugin
  ecosystem's story with its own trust and containment contract.
- The settings loader stays a bounded plain-data evaluator with no host
  callbacks and no file I/O of its own; it cannot load a configuration
  module, and its 16 KiB source cap is untouched.
- No cross-escalation: configuration modules cannot reach plugin loaders,
  plugin package trees, or host plugin services; plugin code cannot select a
  configuration module path; and `bitty ctl config reload` never reloads
  plugin module tree state.
- The loader grants no capability, no manifest grant, no plugin enable, no
  theme write, and no registry participation. Its entire authority is reading
  regular files under one directory and returning their tables.

## Diagnostics and error taxonomy

Every refusal emits one typed host diagnostic. The record is rendered as
additive fields on the existing startup and check diagnostic records:

```text
code         E_CONFIG_MODULE_* code from the taxonomy below
module_spec  the require argument byte string, bounded and escaped for display
phase        root | name | resolve | open | read | parse | evaluate | extract | budget
source       entry, or the module spec with its source line and column, escaped
aggregate    the counter that tripped (count | depth | bytes | budget), when applicable
detail       the module-authored parse, compile, or evaluation message, bounded
             at 512 bytes and escaped, present only when a refusal carries one
```

`detail` is the one field a module controls end to end: `E_CONFIG_MODULE_SYNTAX`
is only useful because the parser names the offending token, and
`E_CONFIG_MODULE_EVAL` is only useful because the raised message is carried. It
is therefore in the record, inside the escaping rule, and bounded like every
other field, rather than dropped to avoid the risk. Dropping it would be a
diagnosability regression against shipped behavior, where the configuration
loader already maps a Lua error message onto the validation diagnostic
(`crates/bitty-config/src/file.rs`), and the bounded, escaped form keeps the
diagnosis without giving module text a render channel. A record for
`E_CONFIG_MODULE_ROOT` has no `module_spec` and no source line, because no spec
resolved and no module file was read: it carries `phase` `root`, the entry in
`source`, and the layout in `detail`.

| Code                          | Meaning                                                                                                                                                      | Fail response                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| `E_CONFIG_MODULE_NAME`        | Spec fails the grammar: non-string, empty, too long, traversal or duplicate-segment form, reserved `bitty.*`, backslash, `:`, NUL, non-ASCII, another volume | layer fail-soft / strict failure |
| `E_CONFIG_MODULE_ROOT`        | The canonical root could not be canonicalized, opened, or typed as a directory; the loader is not built and no spec resolves                                 | layer fail-soft / strict failure |
| `E_CONFIG_MODULE_NOT_FOUND`   | Neither the flat file nor the `init` module exists for the spec                                                                                              | layer fail-soft / strict failure |
| `E_CONFIG_MODULE_AMBIGUOUS`   | Both the flat file and the `init` module exist for one spec                                                                                                  | layer fail-soft / strict failure |
| `E_CONFIG_MODULE_CYCLE`       | A `require` re-entered an in-flight identity (self-import or ring)                                                                                           | layer fail-soft / strict failure |
| `E_CONFIG_MODULE_DEPTH`       | Require chain nesting exceeded 16                                                                                                                            | layer fail-soft / strict failure |
| `E_CONFIG_MODULE_COUNT`       | More than 64 distinct module identities in one generation                                                                                                    | layer fail-soft / strict failure |
| `E_CONFIG_MODULE_SIZE`        | A file exceeded 64 KiB, 2048 lines, or 4096 bytes on a line                                                                                                  | layer fail-soft / strict failure |
| `E_CONFIG_MODULE_AGGREGATE`   | Generation source total exceeded 256 KiB                                                                                                                     | layer fail-soft / strict failure |
| `E_CONFIG_MODULE_ESCAPE`      | Containment failed: the canonical target is outside the root, or the anchored walk refused a component (symlink, magic link, junction, reparse point)        | layer fail-soft / strict failure |
| `E_CONFIG_MODULE_NOT_REGULAR` | The opened object is not a regular file, or is a reparse point, ADS form, FIFO, device, socket, or directory                                                 | layer fail-soft / strict failure |
| `E_CONFIG_MODULE_READ`        | A read through the anchored handle failed, returned fewer bytes than the handle's size, or read past the 64 KiB cap; no prefix is parsed                     | layer fail-soft / strict failure |
| `E_CONFIG_MODULE_SYNTAX`      | The file is not valid Lua source, including a binary chunk header; the parser's offending token is carried in `detail`                                       | layer fail-soft / strict failure |
| `E_CONFIG_MODULE_EVAL`        | A module chunk raised a Lua error or violated the shape contract; the module-authored message is carried in `detail`                                         | layer fail-soft / strict failure |
| `E_CONFIG_MODULE_BUDGET`      | A generation budget tripped: RC-1 instructions, RC-1 wall clock, or RC-2 heap                                                                                | layer fail-soft / strict failure |

How a refused module surfaces, per path:

- **Startup** prints one bounded stderr line per refused evaluation naming the
  code, the spec, the entry, and `layer ignored; using defaults and remaining
layers`, and continues on the remaining layers.
- **`bitty config check`** prints one finding per refusal, including the
  in-flight chain for a cycle, and exits non-zero.
- **`bitty doctor`** places the same finding in its diagnosis section beside
  the affected configuration source.
- **Reload** reports the finding in the reload result and keeps the previous
  plan; the result never claims a partial adoption.

`E_CONFIG_MODULE_READ` and `E_CONFIG_MODULE_ROOT` map onto these same four
paths rather than a fifth one. A read refusal carries the spec, `phase` `read`,
and no partial content, so it surfaces exactly like a containment refusal: one
startup stderr line, one `config check` finding with a non-zero exit, one
`doctor` finding, and a refused reload. A root refusal is reported once for the
generation rather than once per refused `require`, because no spec resolved:
startup drops the external layer with one line, check and doctor report one
finding each and exit non-zero, and a reload refuses and keeps the previous
plan. Because that record has no `module_spec`, its `source` names the entry
and its `detail` names the layout, so the user is never sent looking for a
module file that was never the problem.

Source attribution and redaction:

- A module that feeds an effective value keeps `<spec>:<line>` as its source
  record, so a `config show --source` style view can answer "which module,
  which line" the way the accepted Configuration Model RFC requires layer
  attribution.
- Diagnostics name specs and source positions only. They never print the
  resolved absolute path, the canonical root, the identity tuple, or other
  filesystem metadata: `E_CONFIG_MODULE_NOT_FOUND` says which spec failed, not
  which absolute path failed to open.
- Error text echoes at most the offending source line, never the whole file,
  never another module's contents, and never a surrounding region.
- **Bounding is not encoding, so both are required.** Every rendered field —
  the spec, the entry name, the in-flight module chain, any echoed source line,
  and the module-authored `detail` message — is escaped before it reaches a
  renderer.
- **The rule is an allowlist over bytes, and it is total by construction.** A
  rendered field may contain only bytes in `0x20`..`0x7E` plus tab; every other
  byte is replaced with a visible escape form — `\xNN` for the byte, or
  `\u{...}` for a decoded code point — and the escape form itself is printable
  ASCII. Nothing is classified, so no incomplete class list can miss an input:
  C0 controls other than tab, every C1 control including NEL U+0085, DEL,
  ESC-initiated sequences (CSI, OSC 8 hyperlinks, DCS), bidirectional controls
  and isolates, zero-width characters and combining marks, tag characters,
  U+2028 and U+2029, and bytes that are not valid UTF-8 all fall under the same
  rule, because each one contains a byte outside the allowed set. The named
  classes are a non-exhaustive illustration of what the allowlist rejects, not
  the definition of it. Because the field starts as a byte string, the same rule
  is what keeps invalid UTF-8 out of the structured export: a byte at or above
  `0x80` is escaped as a byte, never passed through.
- **Tab is the single exception.** It is the only non-printing byte an indented
  source line needs, and it cannot start an escape sequence, move the cursor to
  another line, or introduce a control byte; it can only shift alignment inside
  the line it appears on, which a reader sees as a misaligned column rather than
  as a second record.
- **Caps and truncation.** The echoed spec is capped at the 256-byte grammar
  limit, the echoed line at the 4096-byte source-line cap already in force, and
  `detail` at 512 bytes. Truncation happens on the input at a UTF-8 scalar
  boundary and is marked with the ASCII suffix `...`; escaping happens after
  truncation, so no field ends in half an escape sequence and the truncation
  marker is itself inside the allowed set.
- **What the property is asserted over.** It constrains the rendered record, not
  the input: the test asserts the emitted bytes, so a field that is escaped in
  one renderer and interpolated raw in another fails the same assertion. A raw
  spec could move the cursor, clear the line, rewrite the terminal title,
  reverse text direction, plant a second record inside a log stream, or split a
  JSON export at U+2028; `E_CONFIG_MODULE_NAME` reports input the grammar
  rejected by definition, so its `module_spec` is the field that most needs the
  rule, and a source line echoed from a hostile file or a `detail` message a
  module wrote deliberately needs it just as much.
- The escaping rule binds at the point of rendering, not at the point of
  construction, and applies to every path that renders the record: the startup
  stderr line, `bitty config check` findings, `bitty doctor` diagnosis, the
  reload result, and any structured export. A new renderer inherits the rule
  and cannot opt out, and no diagnostic record carries a second, unescaped copy
  of the same field for internal display.
- Plan values stay subject to the existing sensitive-value redaction;
  module loading adds no value channel and no secret-scanning obligation.
- The loader adds no Lua-visible diagnostic surface; diagnostics stay
  host-side records, as they are for configuration today.

## Threat model

User configuration is trusted code in this corpus, so the loader is not
defended against the owner editing their own files. It is defended against
every path where configuration content, a hostile distribution layout, a
shared or synced configuration tree, or a concurrent process could turn a
module name into a read the host did not intend, or turn the loader into a
budget bypass.

| Threat                                                      | Mitigation                                                                                                                                                                                                                                                                                                                                   | Residual risk                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Traversal or absolute path in a spec                        | Total grammar (no separators, no `.`/`..`, no drive or volume form) plus a lexical re-check on the joined path                                                                                                                                                                                                                               | None identified; the grammar admits no traversal token, and the lexical check runs anyway                                                                                                                                                                                                                                                                    |
| Symlink, junction, or reparse escape out of the root        | Canonical containment, then a descriptor-anchored walk: the canonical root is opened once and each root-relative component is resolved beneath it with a no-follow rule (`openat2` or per-component `openat`) or refused as a reparse point on Windows                                                                                       | A Unix mount point inside the root can present a foreign tree; accepted while its canonical path is under the root and recorded here                                                                                                                                                                                                                         |
| TOCTOU swap between the containment check and the read      | Descriptor-anchored walk from the open root (`openat2(root_fd, remainder, RESOLVE_BENEATH\|RESOLVE_NO_SYMLINKS\|RESOLVE_NO_MAGICLINKS)`; per-component `openat` with `O_NOFOLLOW\|O_DIRECTORY` on macOS and the BSDs; per-component reparse refusal on Windows), so a component swapped after canonicalization is refused where it is opened | The anchor is a directory, not a path: a mount point, or a root ancestor swapped before the root is opened, can still present a foreign tree, and the walk then confines reads to that tree. Recorded as the same accepted residual as the mount-point row; the identity comparison is a redundant confirmation and cache key, not the containment mechanism |
| FIFO, device, socket, or directory read that hangs or leaks | `O_RDONLY \| O_NONBLOCK \| O_CLOEXEC` open, `fstat`, non-regular rejection, `O_NONBLOCK` cleared only after that rejection, then one bounded read whose byte count must equal the handle's size                                                                                                                                              | An unusual, FUSE-backed, or remote filesystem can still defer inside `open` or `fstat`; the refusal is typed when it returns, and the size cap and length check bound the rest                                                                                                                                                                               |
| Module root on a network, mapped, or removable medium       | Containment, object typing, size caps, and budgets hold without needing identity uniqueness; the medium assumption is stated rather than implied                                                                                                                                                                                             | Identity and alias-collapse exactness are unproven there and `FILE_ID_INFO` support varies by driver; a remote or removable root is permitted as an accepted residual                                                                                                                                                                                        |
| Resource exhaustion through many or very large modules      | Depth 16, count 64, 64 KiB per file, 256 KiB aggregate, one shared RC-1/RC-2 account                                                                                                                                                                                                                                                         | The cold-start cost of 256 KiB of parsing is real and must be measured against PB-1 before the aggregate cap becomes contract, rather than argued away                                                                                                                                                                                                       |
| Cycle or unbounded recursion in the reference graph         | In-flight identity detection fails the cycle; depth cap fails deep chains before the 17th evaluation                                                                                                                                                                                                                                         | None identified; both paths are constant-time refusals                                                                                                                                                                                                                                                                                                       |
| Cache poisoning or cross-generation leakage                 | Cache is host-side, not Lua-visible, per generation, and cleared on reload; identity-keyed so aliases cannot fork an instance                                                                                                                                                                                                                | A module can still mutate its own returned table before returning, which is the same power the single entry chunk has today                                                                                                                                                                                                                                  |
| `--safe` bypass through a module path or loader             | Safe mode returns the built-in configuration before any external read and never constructs the loader; `require` does not exist in that VM                                                                                                                                                                                                   | None identified; stated as a negative test rather than an inference                                                                                                                                                                                                                                                                                          |
| Escalation into plugin or settings authority                | Separate loader, separate root, deny lists unchanged; no shared code path with the plugin-host loader                                                                                                                                                                                                                                        | The risk is a future refactor that merges the two loaders; the review gate is that they stay separate, with negative tests                                                                                                                                                                                                                                   |
| Bytecode or precompiled chunk smuggling                     | `load`, `loadfile`, `dofile`, and `string.dump` stay denied; the host parses source only and refuses a binary chunk header as a syntax error                                                                                                                                                                                                 | None identified in the VM; a future source parser change must keep the header refusal                                                                                                                                                                                                                                                                        |
| Windows reserved names, short-name aliases, ADS, UNC forms  | Grammar rejects `:` and separators; canonical step rejects reserved device names, trailing dots or spaces, and 8.3 aliases                                                                                                                                                                                                                   | Volumes with 8.3 generation disabled can still present aliases to other tools; the identity check decides reuse, so an alias cannot double-load                                                                                                                                                                                                              |
| Diagnostic leak of host paths or file contents              | Spec-only attribution, allowlist-escaped spec, line, and `detail` echo, no absolute paths, no content dumps                                                                                                                                                                                                                                  | Spec names disclose the local module layout, which the user already knows and which the plan's own source records also name                                                                                                                                                                                                                                  |
| Concurrent writer changing a module during evaluation       | One bounded read through the anchored handle, `take(cap + 1)` with the byte count required to equal the handle's size; a mismatch is `E_CONFIG_MODULE_READ` and no prefix is parsed                                                                                                                                                          | A file replaced between two different `require` calls in one generation is seen as two identities only if the earlier one was already cached; the graph does not re-read                                                                                                                                                                                     |
| Owner-edited configuration as the attack path               | Out of scope by trust model: the user is the author of the code being run                                                                                                                                                                                                                                                                    | Stated, not mitigated. The loader narrows what configuration code can read; it does not defend the owner from their own file                                                                                                                                                                                                                                 |

Reviewer notes that follow from the table: no row may be re-described as
closed in a later revision without evidence, the two "none identified" rows
are claims about the grammar and the deny list that a reviewer should attack
first, and the mount-point, root-anchor, and remote-or-removable-medium
residuals must appear in the implementation issue as accepted risk rather than
as open defects.

## Security review checklist

Independent security acceptance for this contract was recorded by the third
review linked above, which judged these properties. Any amendment to this
document must again confirm at least:

- one grammar, one root, no Lua-mutable search path, and no reuse of the
  plugin-host rooted loader in either direction;
- containment is threefold (lexical, canonical, and descriptor-anchored), the
  read target is reached by a walk from an open root descriptor on every
  platform, and no containment step rests on a path-following identity
  comparison;
- the read is length-checked against the open handle, and a short, failed, or
  over-cap read is a refusal with no parsed prefix;
- the bytecode and `load*` denial survives the loader, including a binary
  chunk presented as a module;
- `--safe` provably reads no external configuration and never reaches a
  loader, and plugin and settings VM `require` denial is untouched;
- the budget table matches the section above, shares one RC-1/RC-2 account
  per generation, adds no per-module refresh, and does not change PB-1;
- startup salvage, check and doctor strictness, and reload refusal hold for
  every taxonomy code, with no untyped failure path, including
  `E_CONFIG_MODULE_READ` and `E_CONFIG_MODULE_ROOT`;
- the diagnostics leak nothing beyond spec, line, code, and a bounded `detail`
  message, every rendering path emits only allowlisted bytes, and the taxonomy
  is exhaustive over the refusal surface; and
- the threat model's residual rows are carried into the implementation issue
  as accepted risk.

Acceptance is a design decision, not a crash gate. This document is accepted;
the dependent implementation issue is the next gate under the sequencing in
`bitty#2670` and has not been created.

## Verification plan

After acceptance, the implementation evidence belongs in the implementation
issue, not here. It must:

- negative-test the taxonomy on all four paths: malformed and traversal specs,
  reserved `bitty.*`, ambiguity, missing files, self-require and rings, depth
  over 16, count over 64, per-file and aggregate overruns, a FIFO, a Unix
  socket, and a device node at a module path each refusing with a typed code
  within a bounded time — a test that hangs is a defect, not a pass — plus
  ADS, junction, reparse, and reserved names on Windows;
- prove the anchored walk is the mechanism, with a negative control that a
  by-path open cannot pass: one symlinked in-root module loads through its
  canonical target and its root-relative remainder; a **final** component
  replaced between canonicalization and the open refuses with
  `E_CONFIG_MODULE_ESCAPE`; and an **intermediate directory** component
  replaced between canonicalization and the open refuses with
  `E_CONFIG_MODULE_ESCAPE`. The intermediate-component test is the control:
  a loader that opens the canonical path by name and compares identities
  passes the final-component test and fails this one, so the test can fail and
  proves the walk rather than restating it. Add the branch complements — an
  absolute remainder and a `..` remainder must fail with `EXDEV` on Linux, a
  per-component `O_NOFOLLOW` refusal must fire on macOS and the BSDs with the
  same swap, and a Windows run that replaces an intermediate component with a
  junction must produce the same code;
- prove the read is bounded and length-checked: a regular file whose read
  returns fewer bytes than the handle's size refuses with
  `E_CONFIG_MODULE_READ` and produces no plan and no parsed prefix; a read that
  fails outright refuses the same way; a file that grows past the 64 KiB cap
  between the handle's `fstat` and the read refuses rather than truncating; and
  a file of exactly 64 KiB loads, so the check is not a rejection of the cap
  itself;
- prove the unbuildable root: an unreadable ancestor, a resolution loop at the
  root, a symlinked root final component, and a missing root directory each
  refuse with `E_CONFIG_MODULE_ROOT` and never `E_CONFIG_MODULE_NOT_FOUND`, on
  all four paths, and the Windows redirected-`%APPDATA%` canonicalization
  failure reports the same code;
- prove the escaping rule as a property, generated from the complement of the
  allowlist and not from any class list: seed every byte `0x00`..`0x1F` and
  `0x7F`..`0xFF` into a spec, an echoed source line, and a module message, and
  assert that the rendered record on startup, `config check`, `doctor`, and
  reload contains only bytes in `0x20`..`0x7E` plus tab. Then run an
  independent hostile corpus that is not derived from the allowlist — ANSI and
  CSI sequences, OSC 8 hyperlinks, DCS, C1 controls encoded as UTF-8
  U+0080..U+009F, zero-width characters and combining marks, bidi isolates,
  U+2028 and U+2029, NEL U+0085, tabs against spaces, and a source line long
  enough to be truncated — and assert the same allowlist property, that
  truncation happens before escaping so no partial escape sequence is emitted,
  and that a tab cannot forge a field separator;
- prove the module-authored message is inside the rule: a module that calls
  `error` with control bytes and a bidi override, and a syntax error whose
  offending token contains them, must reach `detail` bounded at 512 bytes and
  escaped, on all four paths; a message past the cap must truncate and still
  satisfy the allowlist; and a build that drops the message instead of carrying
  it must fail the test, so diagnosability is asserted rather than assumed;
- prove containment on a case-insensitive volume and a case-sensitive volume
  with the same module set, including a symlinked dotfiles layout that stays
  under the canonical root and a hardlink alias that collapses to one
  evaluation;
- prove accounting: one RC-1/RC-2 account for the whole graph, no refresh on
  module entry, and `modules`/`module_bytes` present in the budget record;
- prove the four-path behavior for each taxonomy code: startup layer drop,
  non-zero `config check` and `doctor`, and a refused reload that keeps the
  previous plan and graph, with the root refusal reported once per generation
  and the read refusal reported once per refused load;
- prove `--safe` with a hostile on-disk tree still starts on the built-in
  configuration and reports the blocked attempt without host-path leaks; and
- prove plugin and settings VM `require` refusal is unchanged in behavior and
  message shape, with no new fallthrough.

The documentation side runs this repository's gates; implementation timing
runs the owning repository's gates.

## Alternatives considered

| Alternative                                         | Trade-off                                                   | Disposition                                                                                                                                                 |
| --------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ambient runtime-path `require` (Neovim-style)       | Familiar; multiple roots with first-found precedence        | Rejected. It is a search policy Lua can influence and a containment audit problem, and the accepted direction already rejects ambient first-found semantics |
| User-registered extra roots                         | Lets distributions share modules                            | Deferred. It is a trust decision over untrusted-adjacent trees, and it needs the system Lua decision first                                                  |
| Reusing the plugin-host rooted loader               | One loader to maintain                                      | Rejected. Package trees have manifest-mediated trust; configuration is free-form user Lua with different budgets, so sharing code invites sharing trust     |
| Admitting project-tree or `XDG_CONFIG_DIRS` modules | Better distribution ergonomics                              | Rejected for this revision. Project configuration stays declarative and system Lua execution is undecided                                                   |
| Load sentinels for cycles                           | Matches ambient Lua and allows mutually referencing modules | Rejected. Half-initialized plans are not a facility the declarative model wants                                                                             |
| No nested `require`                                 | Smallest loader, no depth budget needed                     | Rejected. Inlining every source is exactly the duplication the feature exists to remove                                                                     |
| Per-module budget refresh                           | Each module gets a fair 10,000,000 instructions             | Rejected. It multiplies the generation budget by module count, which is the bypass this contract exists to prevent                                          |

## Affected contracts

- [Configuration Model RFC](configuration-model-rfc.md): the reload
  classification and whole-layer failure rule are composed with, not changed;
  loader failures join the existing whole-layer tier.
- [Lua and XDG configuration](../configuration/lua-and-xdg.md): the
  candidate resolution sketch gains this contract as its concrete
  naming-and-root answer, and its `local bitty = require("bitty")` snippet is
  superseded because `bitty` stays a preloaded host table, never a module.
- [Configuration options](../reference/configuration-options.md): the shipped
  per-file bounds and salvage-versus-strict contract are reused unchanged;
  that document gains a pointer here with the implementation issue, not with
  this acceptance, because those bounds describe shipped behavior.
- [Performance Budget RFC](performance-budget-rfc.md): PB-1 is unchanged; the
  graph must fit the existing cold-start budget.
- [Threat model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md):
  this document supplies the loader-specific rows and residuals for the
  configuration and workspace trust record.
- Plugin runtime, plugin settings, and template generation: untouched, with
  the deny-list confirmation recorded as a negative test.

## Open points

- The numeric caps for aggregate bytes (256 KiB), module count (64), and
  depth (16) are proposals. They match existing numbers where one exists, but
  the aggregate cap in particular should be confirmed against a PB-1
  measurement of a maximal graph before acceptance.
- Whether the module root must be a local fixed volume is not decided. Remote,
  mapped, and removable roots are permitted in this revision as an accepted
  residual; restricting the loader to local volumes, or surfacing a diagnostic
  note when the root medium is remote, is a decision this contract defers.
- The wider Lua VM and standard-library question stays open in
  [Lua and XDG configuration](../configuration/lua-and-xdg.md); this contract
  fixes the loader surface, not the stdlib admission.
- A `bitty.*` module namespace beyond the refused reserved prefix is not
  decided. A future host-bridge table is a preloaded value, not a module, and
  any module form would need its own contract.
- System and distribution module roots are excluded here and remain open
  until system Lua execution has a trust decision.
- Project-scope modules stay out of scope; their admission depends on the
  project configuration trust gate.
- Whether a relational `extends` for modules (a module declaring a parent
  module) should exist is not decided; `extends` stays profile-layer-only.
- Whether `bitty config check --json` should emit the module graph itself, or
  only per-finding records, is left to the implementation issue once the
  diagnostic schema is fixed.

## Open items after acceptance

Acceptance is not a clean sheet. This section is the record of what the third
review admitted as residual and what it left open, carried with an owner each
so that none of it can be re-described as closed by a later edit. Nothing here
is accepted risk except the residuals in the first table; the findings in the
second table are owed work.

### Admitted residuals

These are accepted risk, and each must appear in the implementation issue as
accepted risk rather than as an open defect. None may be re-described as a
closed property without evidence.

| Residual                                                           | Why it cannot be closed here                                                                                                                                          | Owner                                                          |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| A Unix mount point inside the root can present a foreign tree      | The walk confines reads to the tree the anchor names; it cannot tell whether that tree is the one the user meant. Accepted while its canonical path is under the root | implementation issue (`bitty` config loader)                   |
| A root ancestor swapped before the root is opened                  | The anchor is a directory, not a path; the walk then confines reads to the attacker's tree                                                                            | implementation issue (`bitty` config loader)                   |
| A remote, mapped, or removable module root                         | Identity and alias-collapse exactness are unproven there, and `FILE_ID_INFO` support varies by driver; containment, typing, caps, and budgets still hold              | implementation issue (`bitty` config loader)                   |
| Exotic, FUSE-backed, or network-backed filesystems                 | They can defer inside `open`, `fstat`, or the read in ways no flag controls; the delay is outside the guarantee and the refusal is typed when it returns              | implementation issue (`bitty` config loader)                   |
| A file replaced between two `require` calls in one generation      | The first identity is cached, so the graph does not re-read                                                                                                           | implementation issue (`bitty` config loader)                   |
| A module mutating its own returned table before returning          | The same power the single entry chunk has today; no new authority                                                                                                     | implementation issue (`bitty` config loader)                   |
| Spec names disclose the local module layout to a diagnostic reader | The plan's own source records name the same layout                                                                                                                    | implementation issue (`bitty` config loader), redaction review |
| Owner-edited configuration as the attack path                      | Out of scope by trust model: the user is the author of the code being run                                                                                             | project owner (trust-model decision, not a loader fix)         |

### Non-blocking findings `N-1` to `N-12`

`N-1`, `N-2`, and `N-4` were closed by the earlier amendments and stay closed.
The nine rows below are open. `N-9` to `N-12` are text corrections inside this
document, not residuals, and they may not be carried as accepted risk in place
of being fixed; `N-3` and `N-5` are obligations that acceptance does not
discharge.

| ID     | Status | Open item                                                                                                                                                                                                                                                                                                                                         | Owner                                                                                   |
| ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `N-1`  | Closed | Record shape and field naming defects from round one                                                                                                                                                                                                                                                                                              | none (closed in round two)                                                              |
| `N-2`  | Closed | Containment-rule wording defects from round one                                                                                                                                                                                                                                                                                                   | none (closed in round two)                                                              |
| `N-3`  | Open   | The 256 KiB aggregate cap and the PB-1 claim are asserted, not measured. Measure a maximal graph (64 identities, 256 KiB) against PB-1 p50/p99 before the number becomes contract; acceptance does not make it contract-grade                                                                                                                     | loader implementation issue (`bitty`), with a `bitty-perf` PB-1 measurement             |
| `N-4`  | Closed | Missing error code and `phase` for the root refusal                                                                                                                                                                                                                                                                                               | none (closed by the amendment the third review read)                                    |
| `N-5`  | Open   | No [risk register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md) or evidence-matrix row exists for this loader; add one before any loader-shipped release, so the residual set is tracked and not only described                                                                                         | docs security maintainer (`bitty-docs` security register)                               |
| `N-6`  | Open   | `bitty config check --json` graph emission is unbound. Bind it: graph emission, if any, carries specs, lines, and codes only, never absolute paths, resolved roots, or identity tuples                                                                                                                                                            | implementation issue (`bitty-config` diagnostic schema owner)                           |
| `N-7`  | Open   | Resolution order and canonicalization order are not related: for `a.b.c` the loader must probe both forms, decide `NOT_FOUND` or `AMBIGUOUS`, and only then canonicalize the form that exists                                                                                                                                                     | specifications maintainer (this repository), next contract revision                     |
| `N-8`  | Open   | `E_CONFIG_MODULE_NOT_REGULAR` still names "directory reached by a non-`init` resolution"; both resolutions end in a file name, so say "a directory at either resolution" and drop the qualifier in item 4 and the taxonomy row                                                                                                                    | specifications maintainer (this repository), next contract revision                     |
| `N-9`  | Open   | Item 3's first sentence still calls a by-path open "the fallback" while three other clauses forbid it. Delete the fallback clause and say the anchored walk is the mechanism on every platform, or name the fallback with its flags, platforms, and containment                                                                                   | specifications maintainer (this repository); must land before the implementation starts |
| `N-10` | Open   | The read boundary has two plausible codes for an oversized file and none for a failed `fstat`: pin the metadata-size refusal to `E_CONFIG_MODULE_SIZE` (pre-read), a `take(cap + 1)` result at or beyond the ceiling to `E_CONFIG_MODULE_READ`, and a failed `fstat` to `E_CONFIG_MODULE_READ`, and broaden `detail` to host-authored layout text | specifications maintainer (this repository), next contract revision                     |
| `N-11` | Open   | The root record's `detail` "names the layout" while the redaction rule forbids printing the canonical root: say `detail` names the layout **kind** (redirected profile, unreadable ancestor, resolution loop, not a directory) and never its path                                                                                                 | specifications maintainer (this repository), next contract revision                     |
| `N-12` | Open   | The `bitty-docs` threat model's `D-2` bullet still names handle-bound identity as containment's third leg; it must name the descriptor-anchored walk and describe the identity match as a cache key and redundant confirmation. Due now that this contract is promoted                                                                            | docs security maintainer (`bitty-docs` threat model)                                    |

## Acceptance criteria

- Independent security review approved the containment, budget, safe-mode,
  and isolation sections in the third review, and the threat model residuals
  are carried into the implementation issue as accepted risk.
- The seven issue items are each answered by the decision register, with the
  numbers marked as proposals.
- The error taxonomy is exhaustive over the refusal surface and every code
  names the path where it surfaces.
- That review has landed: the third independent review returned `ACCEPTED` and
  this document is `accepted`. Acceptance authorizes the dependent
  implementation issue and nothing else; it promotes no P0 control, ships no
  loader, and is not evidence of behavior.

## P0 review sign-off

This contract records no P0 sign-off and closes no security risk. It defines
required behavior for a future implementation under P0 controls; the evidence
comes from the implementation change under the verification plan above.

## References

- [Issue `bitty#2670`](https://github.com/bitty-terminal/bitty/issues/2670) —
  the design gate this document answers, and its follow-up from
  [`bitty#2581`](https://github.com/bitty-terminal/bitty/issues/2581).
- [Restricted Config Require Contract Third Review](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/config-require-third-review.md)
  — the `ACCEPTED` verdict that promoted this contract, merged as
  [bitty-docs#494](https://github.com/bitty-terminal/bitty-docs/pull/494).
- [Lua and XDG configuration](../configuration/lua-and-xdg.md) — module
  resolution direction, RC-1/RC-2 posture, and `--safe` precedence.
- [Configuration Model RFC](configuration-model-rfc.md) — pipeline, layer
  stack, reload classification, failure rule.
- [Configuration options](../reference/configuration-options.md) — per-file
  bounds, startup salvage, strict diagnostics.
- [Performance Budget RFC](performance-budget-rfc.md) — PB-1 cold startup.
- [Threat model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md)
  — configuration and workspace trust record.
- Shipped evidence, read-only from `bitty` `origin/main`:
  `crates/bitty-lua/src/config.rs` (sandbox deny list, shape contract),
  `crates/bitty-lua/src/lib.rs` (RC-1/RC-2 constants),
  `crates/bitty-config/src/file.rs` (file bounds, fail-soft salvage, Lua error
  message mapped onto the validation diagnostic),
  `crates/bitty-config/src/merge.rs` (`safe_merged`, fallback built-in),
  `crates/bitty-runtime/src/plugin_runtime/plugin_settings.rs`
  (`read_bounded_regular_file`: `take(cap + 1).read_to_end()` plus byte-count
  equality) and `crates/bitty-runtime/src/component/activation.rs`
  (`open_record_no_follow`, `read_record_bytes`: the same bounded-read shape).
