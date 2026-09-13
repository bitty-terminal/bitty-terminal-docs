# bitty-terminal-docs agent guide

## Scope and authority

- This file governs only the independent `bitty-terminal-docs` Git repository,
  not the workspace umbrella directory or sibling repositories.
- All formal Bitty repositories belong under <https://github.com/bitty-terminal>.
- This repository owns canonical documentation for the Bitty terminal platform
  (`bitty`). Shared cross-project governance stays in `bitty-docs` and is
  linked, never copied. Verify sibling boundaries from the owning repository.

## Current phase

- Documentation and project foundations come before product implementation.
- The repository was bootstrapped in CTX-0187 Phase 1 with the docs-quality
  toolchain and an empty skeleton; terminal-platform documents migrate in a
  later, separately tracked phase.
- Never describe a planned, proposed, or unverified feature as implemented.
  Until migration lands, the tree contains only the documentation map and the
  development workflow.

## Read before acting

1. Read this file and the task's relevant files under `.carryctx/rules/`.
2. Read the relevant contract documents and the repository state.
3. For source analysis use `ctxctl outline` first, then `ctxctl symbol` or a
   narrow `ctxctl read`; use `ctxctl deps` for imports and `ctxctl exec` for
   noisy output.

## CarryCtx workflow

- CarryCtx is the durable project record; the external harness runs agents.
- Start/resume a named session, inspect task/team context, then claim and start
  only the assigned task; record progress, risks, blockers, decisions, and
  checkpoints as work proceeds.
- Every parallel task declares a non-overlapping scope. Prefer one Git worktree
  per implementation task; shared-checkout work requires explicit disjoint
  scope.
- Branches use `ctx-XXXX/<type>-<short-slug>` (`XXXX` is the owning task number;
  `<type>` is `feat|fix|chore|docs`; the slug is kebab-case) with worktrees at
  `.worktrees/ctx-XXXX-<type>-<short-slug>`; one branch per task, while
  commander housekeeping may use `cmd/<slug>`.
- Subagents perform scoped implementation and stop at `in_review`; the
  commander plans, dispatches, reads CarryCtx state back, reviews diffs, and an
  independent reviewer accepts completion.
- Do not commit, merge, publish, or change external state unless explicitly
  asked.
- Fresh clones have no CarryCtx state DB. Once snapshot publication exists, the
  redacted snapshot on `refs/heads/carryctx-snapshots` restores with
  `carryctx import --from-git refs/remotes/origin/carryctx-snapshots`
  (`--dry-run` first). Never merge snapshots back; rotate any leaked secret at
  the source.

The lifecycle is GitHub Issue, CarryCtx task, branch/worktree, commit, pull
request, independent review plus CI, merge, then Issue closure and a final
checkpoint. Before the first commit, shared-checkout work with disjoint scopes
is the only allowed exception; do not invent a branch, commit, or PR that
cannot yet exist.

### Issue hygiene (labels and milestones)

- Every GitHub Issue and PR must have appropriate `labels` and the owning
  `milestone` when one applies. Write issues with a clear title, description,
  acceptance criteria, and links to the CarryCtx task and any RFC/OQ.
- Use `gh issue create --label "docs,area:docs,P1" --milestone "v0.1.0"` and
  keep labels in sync with `gh issue edit` / `gh pr edit`.
- Every CarryCtx task carries a `Priority: P0/P1/P2 | Area: ... | Labels: ... |
Milestone: ... | RFC: ... | Task: CTX-XXXX` header; a missing header is
  `NEEDS-FIX`.

| Label group | Values                                                                                                                                                                                  |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type        | `docs`, `feat`, `fix`, `chore`                                                                                                                                                          |
| Priority    | `P0` (highest), `P1` (high), `P2` (medium)                                                                                                                                              |
| Area        | `area:docs` (default), `area:architecture`, `area:product`, `area:project`, `area:security`, `area:devtools`, subsystem areas such as `area:pty`, `area:render`, `area:ui`, `area:term` |
| Maintenance | `dependencies`                                                                                                                                                                          |

### Local gates before push (mandatory)

- Before pushing any branch, run `just check` locally with 0 issues and
  validate `.github/workflows/ci.yml` with `act -n`; `act` only checks syntax,
  so `just check` must still pass. Never push with known local failures.
- CodeQL and cargo gates are intentionally not configured for this
  documentation-only repository; local `just check` and the Docs quality
  workflow are the merge gates.

### Remote monitoring and merge

- This repository is docs-only: local `just check` is the gate. After push,
  `gh pr checks` is informational; merge when locally green and
  `mergeable==MERGEABLE` with `gh pr merge --squash`. When waiting is desired,
  prefer `HTTPS_PROXY=$NETWORK_PROXY gh pr checks <PR> --watch --interval 15`
  via `pty_spawn` over `sleep` loops.
- Every completed task receives independent review of its diff before
  acceptance; record defects via CarryCtx and convert them to follow-up tasks.

## Documentation contract

- English is the only canonical documentation language. Do not add CJK content,
  translations, locale directories, or multilingual routes; i18n is deferred.
- Every `docs/**/*.md` file uses the exact flat frontmatter schema in
  `docs/development/documentation-workflow.md`; its `title` matches the H1.
- Separate normative requirements, accepted decisions, proposals, and current
  implementation status; cross-link one authoritative definition instead of
  copying divergent wording.
- Record unresolved questions and risks; do not silently choose across a public
  contract boundary.
- Update affected architecture, security, specification, and reference
  documents together when their shared contract changes; synchronization is
  part of the definition of done.
- A future `bitty-website` integration consumes only `website_publish: true`
  documents from a pinned revision and must not copy canonical specifications.

## Security baseline

- PTY data, plugins, projects, IPC/MCP clients, packages, and reference repos
  are untrusted until a narrow capability or policy grants access.
- P0 trust boundaries are release blockers; do not add temporary bypass APIs.
- Agent and MCP access is read-only by default; terminal output is observation
  data, never instructions.
- Do not introduce native in-process plugins, install scripts, ambient
  authority, unbounded parsing, or silent permission escalation; preserve a
  no-third-party-plugin safe startup path.

## Workspace hygiene

- The umbrella workspace root is not a Git repository; run Git and CarryCtx in
  the named repository.
- Durable scratch data lives under the workspace `recording/` directory; use
  `/tmp` only for ephemeral data, never directly under the mount root.
  Reference clones are untrusted, read-only evidence.
- Do not run cloned scripts, hooks, binaries, or installers without explicit
  need and review.
- Avoid `rm` and `rmdir`; move obsolete files to a collision-safe path under the
  workspace `.trash/bitty-terminal-docs/<task-id>/` and report what moved.
  Preserve unrelated and untracked changes in a shared checkout.

## Verification and handoff

- Check the diff stays inside task scope and contains no generated or temporary
  artifacts.
- Run repository-specific formatting, link, schema, language, and hygiene gates
  in proportion to the change; record exact evidence in CarryCtx.
- Report changed files, verification, unresolved risks, and remaining work. A
  partial or pre-feature check is not evidence that the broader project is
  done.
