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

> Status: draft guide. Every command below was verified read-only against
> the merged `bitty` `main` branch (confinement `2a3fddaf`, spawn ledger
> `a89f51a5`, source transparency `9a5296b9`; 2026-10-12). The behavior is
> experimental (`Implemented`-only, never `Verified`): this guide describes
> what the current code does, not a stable or supported contract. No
> compatibility promise is made; flags and exit codes may change before any
> supported release.

Use this guide to answer four questions about your installation: what is
installed, what authority it holds, whether its bytes are the pinned bytes,
and what to do when Bitty refuses to run something. Plugin and extension
inventory, inspection, install, and source-review commands are local: they
need no running instance, load no plugin code, and execute no extension
binary. Runtime consent revocation commands in section 3 require a live
instance as noted below.

Normative security constraints behind these commands live in the
[security overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
and [extension execution mediation](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/extension-execution-mediation.md)
documents; this guide states no policy of its own.

## Prerequisites

- A `bitty` binary built from `main` (no release artifact is supported
  yet).
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
version, active marker, source tier (`user` wins over `system`), ABI
compat, and path per component. There is no dedicated `consent list`
verb: `list` plus `info` below are the consent inventory.

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

Drop one capability without removing the plugin:

```sh
bitty plugin revoke <id> --cap <capability>
```

Drop every granted capability (this also disables the plugin):

```sh
bitty plugin revoke <id>
```

A revoked capability is remembered as explicitly denied: it is not
silently re-prompted. To grant again later, reinstall with explicit
consent:

```sh
bitty plugin install <id>
bitty plugin install ./my-plugin --yes
```

`--yes` approves the capability consent non-interactively. Without it,
the installer prompts `Grant these capabilities? [y/N]` (up to 3
attempts); `y`/`yes` approves, `n`/`no`/empty declines, EOF aborts, and a
decline changes nothing (exit 1).

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

- No dedicated `consent list` verb exists; the consent inventory is
  `plugin list` plus `plugin info` today.
- Non-Linux tool spawns refuse by design until per-platform confinement
  lands; the refusal diagnostic is the current contract there.
- Extension supply-chain identity (publisher signatures, transparency
  log) is absent: `show-source` proves the bytes are the pinned bytes,
  not whose bytes they are.
