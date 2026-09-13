---
title: Documentation workflow
description: Normative authoring ownership review synchronization and lifecycle policy
category: development
audience: contributor
document_type: policy
status: normative
website_publish: true
sidebar_order: 20
---

# Documentation workflow

This policy defines how this repository maintains English-language canonical
documentation for its documented scope. It applies to the migrated
terminal-platform corpus and continues once the scope's implementation
repository ships code.

## Scope and authority

- This repository owns canonical documentation for its declared scope. The
  scope statement lives in the root `README.md` and the
  [documentation map](../README.md).
- Shared cross-project governance stays in
  [bitty-docs](https://github.com/bitty-terminal/bitty-docs): ADRs, the global
  open-question register, the security corpus, findings, reviews, handoff,
  roadmap, releases, and project state.
- Cross-project contracts and registers are linked, never copied. When this
  repository needs a shared decision it links to the canonical document in
  bitty-docs and records only the domain-specific consequences here.

## Language policy

English is the only canonical documentation language. Repository-owned Markdown
must not contain CJK text. Internationalization, translation repositories,
locale directories, translated URL routing, and synchronization between
languages are deferred until a reviewed cross-repository decision activates
them.

## Repository layout

Canonical platform documents live in topic trees at the repository root and
follow the [documentation map](../README.md). This repository's own process
documents live under `docs/`. New topic trees are added only when real content
exists; empty placeholder pages are avoided so the tree does not imply work that
has not happened.

| Path                | Owns                                           |
| ------------------- | ---------------------------------------------- |
| `<topic>/`          | Canonical documents for the terminal platform. |
| `docs/README.md`    | Documentation map and authority rules.         |
| `docs/development/` | Contributor policy and workflow.               |

## Document types and authority

| Type                    | Purpose                                                                         | Authority rule                                                    |
| ----------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Guide                   | Helps a reader complete a supported task.                                       | Must cite verified behavior for the documented release.           |
| Reference               | Enumerates stable commands, fields, APIs, protocols, errors, and compatibility. | Must match the owning implementation and version.                 |
| Specification           | Defines a proposed or accepted technical contract.                              | Status and unresolved details must be explicit.                   |
| Policy or contract      | Defines normative project, security, or cross-repository obligations.           | Changes require the named owners and affected reviewers.          |
| Overview or explanation | Provides orientation and rationale.                                             | Links to authoritative specifications instead of redefining them. |
| Register                | Tracks decisions, questions, risks, or evidence.                                | Entries close only with cited reviewable evidence.                |
| Research                | Preserves provenance and observations.                                          | Never becomes a decision or implementation claim by implication.  |
| Index                   | Routes readers to canonical documents.                                          | Must stay complete and avoid duplicate normative prose.           |

The maintained topic document is the source of truth. Historical conversations
and external references are provenance. The implementation repository is the
source of implementation evidence.

## Required metadata

Every canonical platform document in the root topic trees, and every process
document under `docs/`, begins with YAML frontmatter containing exactly these
flat, ordered, plain scalar fields:

| Field             | Allowed value or rule                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `title`           | Non-empty text exactly matching the first H1.                                                                               |
| `description`     | One-line plain text suitable for navigation and search.                                                                     |
| `category`        | One value from the canonical category list below.                                                                           |
| `audience`        | `contributor`, `maintainer`, `mixed`, `plugin-author`, `security-reviewer`, or `user`.                                      |
| `document_type`   | `contract`, `explanation`, `guide`, `index`, `overview`, `policy`, `reference`, `register`, `research`, or `specification`. |
| `status`          | `accepted`, `archived`, `deprecated`, `draft`, `normative`, or `stable`.                                                    |
| `website_publish` | Unquoted Boolean `true` or `false`.                                                                                         |
| `sidebar_order`   | Non-negative unquoted integer. Ordering is interpreted within website navigation context.                                   |

Arrays, maps, multiline values, aliases, tags, and additional frontmatter fields
are not allowed. A schema change must update this policy, the repository check,
the affected corpus, and the website consumer contract together.

Canonical categories are `architecture`, `configuration`, `decisions`,
`development`, `examples`, `extensibility`, `findings`, `how-to`, `migrations`,
`product`, `project`, `provenance`, `reference`, `releases`, `requirements`,
`roadmap`, `security`, `specifications`, `troubleshooting`, `tutorials`, and
`user-guide`.

## Status meanings

- `draft` is actively shaped and may change without compatibility promises.
  Draft text does not authorize shipped, stable, normative, or
  compatibility-guaranteed behavior and does not form public reference.
- `accepted` records a reviewed working direction or maintained project fact.
- `normative` is a required gate or policy, even when implementation evidence is
  not yet available.
- `stable` is maintained provenance or a contract whose stability has explicit
  evidence; it does not mean every linked feature is implemented.
- `deprecated` remains available during a documented transition.
- `archived` is retained for history and must not be treated as current advice.

## Review and ownership

- The document category owner reviews correctness and status.
- A docs curator reviews taxonomy, metadata, terminology, links, provenance,
  deprecation, and navigation.
- A security reviewer is required for trust boundaries, capabilities, resource
  limits, packages, IPC/MCP, DevTools, and sensitive data.
- The owning implementation repository supplies code/test/release evidence for
  claims of current behavior.
- Cross-repository changes use linked Issues and pull requests. Each repository
  retains independent approval and CI.

## Delivery lifecycle

The primary lifecycle is GitHub Issue, CarryCtx task, branch/worktree, commit,
pull request, independent review plus CI, merge, then Issue closure and a final
CarryCtx checkpoint. Branch names use `ctx-XXXX/<type>-<short-slug>` and
worktrees live under `.worktrees/`. Before the first commit the repository is in
the initialization exception: branch, worktree, and PR stages are unavailable.

Documentation synchronization is part of the definition of done. A change
remains incomplete while affected canonical documents, indexes, links, or
statuses are stale. If documentation cannot be updated within the same delivery,
the task remains open or carries an explicit blocking dependency on a scoped
documentation task.

## Deprecation and versioning

A deprecated document or public path names its replacement, affected versions,
transition period, and removal condition. Deletion without a reviewed
replacement or redirect decision is not allowed for published material.

Once releases exist, reference and user guidance must state or derive the
supported product version. A future website build that publishes canonical
documentation must consume an immutable pinned revision of this repository so
the published build can be reproduced.
