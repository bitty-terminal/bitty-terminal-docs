---
title: Review Extension Source and Consent
description: Inspect installed plugins and extensions, verify sources, manage consent, and recover from refused spawns
category: how-to
audience: user
document_type: guide
status: draft
website_publish: true
sidebar_order: 20
---

# Review Extension Source and Consent

> Status: draft, source-qualified guide. The extension and spawn procedures
> were inspected read-only against merged `bitty` source (confinement
> `2a3fddaf`, spawn ledger `a89f51a5`, source transparency `9a5296b9`;
> 2026-10-12). The activation column describes `470c20ab` (PR #2276,
> 2026-10-20). The plugin install/enable procedure below describes
> `1c52ba7617e4c42d2fde06c5b318ebefc54aec3b` (PR #2212). The behavior is
> experimental (`Implemented`-only, never `Verified`): this guide describes
> what the current code does, not a stable or supported contract. No
> compatibility promise is made; flags and exit codes may change before any
> supported release. This is not evidence that 0.0.24 has shipped or that
> the supply-chain security acceptance criteria are fully satisfied.

Use this guide to answer four questions about your installation: what is
installed, what authority it holds, whether its bytes are the pinned bytes,
and what to do when Bitty refuses to run something. Plugin store management
needs no running instance, IPC, or plugin VM and executes no package code.
Store inspection and state changes are local/offline; Git installation uses
the network and system tools. Native extension downloads have their own
network and consent flow, and runtime consent commands need a live instance.

Normative security constraints behind these commands live in the
[security overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
and [extension execution mediation](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/extension-execution-mediation.md)
documents; this guide states no policy of its own.

## Prerequisites

- A `bitty` build containing the source revision for the procedure you use;
  these draft procedures do not establish support for a release artifact.
- A terminal where you can run `bitty --help` successfully.
- No running Bitty instance is required except where noted (`bitty ctl`
  consent verbs need one live instance).

## 1. List what is installed

Lua plugins and native binary extensions are managed separately. Check
both:

```sh
bitty plugin list
bitty extension list
```

For machine-readable output, both verbs accept a shape flag:

```sh
bitty plugin list --format json
bitty extension list --format json
```

`bitty plugin list` shows source, state, pin status, and granted versus
requested capabilities per plugin. `bitty extension list` shows name,
version, active-version marker, source tier (`user` wins over `system`),
ABI compat, activation state, and path per component. There is no
dedicated `consent list` verb: `list` plus `info` below are the consent
inventory.

The activation column reports the last transition the component broker
recorded for that component name: `installed` (nothing recorded yet),
`active`, `stopped`, `crashed`, or `denied:<class>`. The class names are
the stable host error names (`capability_denied`, `plugin_not_active`,
`component_grant_invalid`, `component_untrusted`,
`component_unavailable`), so a denied entry matches the error Bitty
prints for the same refusal. The value is last-recorded diagnostics, not
a liveness probe: `active` means the broker recorded a spawn, not that
the process is alive right now, and it describes the component name, not
one version when several are installed. `--format json` reports the same
value as `activation`, plus `activation_class` for denials.

## 2. Inspect what authority a plugin holds

```sh
bitty plugin info <id>
```

Replace `<id>` with a plugin id from step 1, for example:

```sh
bitty plugin info bitty-terminal.shell-integration
```

The output shows the manifest plus recorded state, including the
plain-language effect of each granted capability. If the manifest changed
since the grant (added capabilities), the record blocks until you
re-approve: narrowed or unchanged sets carry forward silently, added
capabilities always need fresh consent.

## 3. Revoke authority you do not want granted

For a bundled managed plugin, drop one capability without removing it:

```sh
bitty plugin revoke <id> --cap <capability>
```

Drop every granted capability (this also disables the plugin):

```sh
bitty plugin revoke <id>
```

A revoked capability is remembered as explicitly denied: it is not
silently re-prompted. To grant again later, reinstall with explicit
consent. Use a bundled ID for its managed record:

```sh
bitty plugin install <id>
```

Store-installed packages do not support `plugin revoke`: remove the store
record and package tree with `bitty plugin remove <id> --force`, then
reinstall from the reviewed source to re-grant. For example:

```sh
bitty plugin install ./my-plugin --yes
```

`--yes` approves the capability consent non-interactively. Without it,
new requested capabilities prompt `Grant these capabilities? [y/N]` (up
to 3 attempts); `y`/`yes` approves, `n`/`no`/empty declines, and EOF aborts
(exit 1). Store consent is bound to the staged package snapshot. Decline or
EOF leaves the committed index, existing grants, and installed version
unchanged; staging or housekeeping may already have occurred.

### Review a store install before enabling it

Choose one reviewed source for `bitty plugin install <source> [--yes]`:
a local plugin directory, a local `.tar.gz`/`.tgz`/`.tar.zst`/`.zip` archive,
or an allowlisted Git spelling (`https://<host>/<path>.git`,
`git+https://<host>/<path>.git`, or `git@<host>:<path>`). Git and archive
acquisition feed the same local validation and consent pipeline; rejected
schemes or missing system helpers fail closed. See the
[CLI reference](../interfaces/cli.md#implemented-slice-bitty-plugin-management)
for source syntax, state stores, and failure semantics.

After a **fresh** local, Git, or archive install, inspect its manifest ID
and grants, then authorize future activation separately:

```sh
bitty plugin list --format json
bitty plugin info <id>
bitty plugin enable <id>
```

Expected result: the fresh install is **disabled**, including with `--yes`
or zero requested capabilities. Approval records capability consent; it
does not enable the package. Before enablement, startup discovery skips the
disabled store package. `enable` changes desired state without executing
package code; later discovery and activation still apply integrity,
compatibility, safe-mode, and recorded-grant checks. Inspect `plugin info`
again to confirm the recorded state; this does not prove runtime execution.

Updating or reinstalling an existing store package preserves its prior
enabled or disabled state. New capabilities still require consent before
commit. This policy applies to the CLI source-install path; bundled
install/enable behavior and the public library's default options are
unchanged. A desired-state change does not promise immediate revocation of
an already-running generation.

### Manage runtime consent separately

For runtime debug and automation scopes on a live instance, revoke with:

```sh
bitty ctl consent revoke --scope <scope>
bitty ctl consent revoke-session
```

For example `bitty ctl consent revoke --scope debug.control` ends that
scope grant with a receipt from the next dispatch boundary;
`revoke-session` ends your own session. Granting (`consent grant`) always
prompts for an explicit `ALLOW` phrase on the local terminal and grants
only to the calling session: it is never reachable from flags,
environment, configuration, or child-process inheritance.

## 4. Start safe when in doubt

```sh
bitty --safe
```

`--safe` selects the built-in safe configuration, reads no external
configuration layer at all, and never creates a third-party plugin VM.
Use it to recover from a hostile, invalid, or simply confusing setup, and
to check whether a problem persists without third-party code. The same
safe-mode precedence applies to `bitty config check` and `bitty doctor`.

## 5. Verify an extension's bytes before you trust it

Print the exact pinned executable bytes of an installed extension:

```sh
bitty extension show-source <name>
bitty extension show-source <name> <version>
```

For example:

```sh
bitty extension show-source net
bitty extension show-source net 0.0.1
```

Without a version, the active (`current`) pointer is used. Bitty
re-verifies the SHA-256 hash against the installed descriptor first: a
missing install or a mismatch fails closed (exit 4) with nothing on
stdout. Provenance (name, version, tier, path, sha256) goes to stderr, so
stdout stays byte-identical and safe to pipe or hash:

```sh
bitty extension show-source net > /tmp/net-bytes
sha256sum /tmp/net-bytes
```

Compare the printed digest with the provenance line on stderr. If they
differ, stop: the install is tampered (a tampered user install fails
closed with no system fallback) and must be removed and reinstalled from
a verified source, not forced.

## 6. Preview an extension update before it re-pins

Install or upgrade exactly one pinned release:

```sh
bitty extension install <name> --version <X.Y.Z>
bitty extension install <name> --version <X.Y.Z> --digest <hex>
```

When the fetch would change the recorded TOFU pin, Bitty prints an
advisory preview before anything changes:

```text
update-diff for '<name>': <old> -> <new> (preview only; consent and --force still apply)
```

The preview changes nothing by itself. The existing rules still apply in
full: both-must-match digest verification (CDN `SHA256SUMS` and your
`--digest` must each match the downloaded bytes, else exit 4), explicit
download consent (`Grant download <name> <version>? [y/N]`, up to 3
attempts; `--yes` approves non-interactively), and no automatic re-pin.
Only `--force` re-pins the recorded digest, and only after verification
passes:

```sh
bitty extension install <name> --version <X.Y.Z> --digest <hex> --force --yes
```

`--force` re-pins; it never bypasses digest verification. Exit codes for
all `bitty extension` verbs: `0` success, `1` declined consent / aborted
prompt / filesystem or fetch-environment failure, `2` usage error
(including a malformed `--digest`), `4` component error (integrity, ABI,
digest, or pin mismatch).

## 7. What to do when a spawn is refused

A refused tool spawn is Bitty working as designed: the request is denied
fail-closed before any process starts. Do this, in order:

1. **Read the diagnostic.** It names the tool and the operation class
   only (never secret values). Typical shapes:
   - `spawn denied: ...` — the request fell outside the allowlist;
   - `spawn env must not set pager, git config override, or
external-process variables` — an explicit variable named a denied
     channel (`PAGER`, `GIT_PAGER`, `GIT_CONFIG*`, `GIT_SSH*`,
     `GIT_DIR`, and the adjacent hooks);
   - `tool spawn confinement refused '<tool>': ...` — the OS
     confinement could not be armed (on macOS, Windows, and other
     non-Linux systems this refusal is by design until the platform
     mechanism lands).
2. **Check the request against the allowlist.** Only `git` spawns, only
   the read-only verbs (`status`, `diff`, `log`, `branch`, `show`,
   `rev-parse`, `ls-files`), no `-c` / `--config` / `-C` / `--git-dir` /
   pager / `--output` / `--ext-diff` / `--textconv` / `--upload-pack` /
   `--exec` smuggling, and no shell metacharacters. A `branch` creation
   (`branch <name>`) or mutating flag is a refusal, not a bug.
3. **Do not `--force` what you do not understand.** There is no force
   flag for tool spawns, and `install --force` applies only to the TOFU
   digest re-pin after verification — it cannot authorize a denied spawn
   or an unverified download. If a refusal surprises you, treat the
   requesting plugin as untrusted: inspect it (step 2), revoke its
   grants (step 3), and restart with `bitty --safe` (step 4).
4. **Escalate with evidence.** Keep the exact command, the full
   diagnostic on stderr, and the plugin id and version. File the report
   against the owning repository with that evidence; do not paste secret
   values (diagnostics never contain them, and neither should your
   report).

## Reference of commands used

| Task                   | Command                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------- |
| List plugins           | `bitty plugin list [--format table\|json\|jsonl]`                                     |
| Inspect a plugin       | `bitty plugin info <id>`                                                              |
| Revoke one capability  | `bitty plugin revoke <id> --cap <capability>`                                         |
| Revoke all grants      | `bitty plugin revoke <id>`                                                            |
| List extensions        | `bitty extension list [--format table\|json\|jsonl]`                                  |
| Print pinned bytes     | `bitty extension show-source <name> [<version>]`                                      |
| Install a release      | `bitty extension install <name> --version <X.Y.Z> [--digest <hex>] [--force] [--yes]` |
| Remove an extension    | `bitty extension remove <name> [<version>]`                                           |
| Safe startup           | `bitty --safe`                                                                        |
| Revoke a runtime scope | `bitty ctl consent revoke --scope <scope>`                                            |
| End your session grant | `bitty ctl consent revoke-session`                                                    |

Full verb and flag detail is authoritative in `bitty plugin --help`,
`bitty extension --help`, and `bitty ctl --help` on your build, which
describe the exact build you run.

## Open points

- Plugin install evidence is source-qualified: the pinned CLI tests cover
  local fresh-disabled state, explicit enable followed by v1/v3 activation,
  preserved update enablement, and decline/EOF state preservation. Successful
  Git transport, enabled-v2 activation, and an instrumented zero-invocation
  proof are not established. Archive tests cover successful installation,
  while the disabled policy follows the shared source path. The
  [CLI reference evidence](../interfaces/cli.md#implemented-slice-bitty-plugin-management)
  links the exact implementation and tests; no product test run is claimed
  by this guide.
- No dedicated `consent list` verb exists; the consent inventory is
  `plugin list` plus `plugin info` today.
- Non-Linux tool spawns refuse by design until per-platform confinement
  lands; the refusal diagnostic is the current contract there.
- Extension supply-chain identity (publisher signatures, transparency
  log) is absent: `show-source` proves the bytes are the pinned bytes,
  not whose bytes they are.
