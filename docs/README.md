---
title: Documentation map
description: Canonical navigation and authority rules for the Bitty terminal platform documentation corpus
category: project
audience: mixed
document_type: index
status: accepted
website_publish: true
sidebar_order: 1
---

# Documentation map

This index is the entry point for the canonical documentation of the Bitty
terminal platform — the product implemented by the `bitty` repository. The
repository is in its bootstrap state (CTX-0187 Phase 1): the docs-quality
toolchain and this skeleton exist, while the platform documents are migrated
from `bitty-docs` in a later, separately tracked phase. Nothing on this page
claims migrated content.

## Authority and composition

- This repository owns terminal-platform architecture, specifications,
  configuration, interfaces, product, reference, and user-facing documents.
- Shared cross-project governance lives in
  [bitty-docs](https://github.com/bitty-terminal/bitty-docs): decisions, the
  security corpus, sources, findings, reviews, handoff, project state, roadmap,
  and releases. This repository links to those documents instead of copying
  them.
- Sibling documentation repositories:
  [bitty-ai-docs](https://github.com/bitty-terminal/bitty-ai-docs) (AI core)
  and
  [bitty-plugins-docs](https://github.com/bitty-terminal/bitty-plugins-docs)
  (plugin ecosystem).
- The repository is designed to be mounted at `bitty/docs` as a Git submodule
  in a later wiring phase.

## Current tree

| Document                                                        | Purpose                                                   |
| --------------------------------------------------------------- | --------------------------------------------------------- |
| [Development](development/README.md)                            | Contributor entry point and local gates.                  |
| [Documentation workflow](development/documentation-workflow.md) | Normative authoring, metadata, status, and review policy. |

## Planned structure

The terminal-platform documents migrate into topic trees equivalent to the
current `bitty-docs` `docs/projects/bitty/` layout:

| Planned tree                                                                           | Content                                                  |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `architecture/`                                                                        | System context, layers, and core boundaries.             |
| `specifications/`                                                                      | Versioned technical contracts with verification duties.  |
| `configuration/`                                                                       | Lua/XDG configuration model and themes.                  |
| `interfaces/`                                                                          | CLI, IPC, rich content, and automation contracts.        |
| `product/`                                                                             | Vision, release ladder, and acceptance plans.            |
| `user-guide/`, `tutorials/`, `how-to/`, `troubleshooting/`, `migrations/`, `examples/` | User-facing documentation once behavior is verified.     |
| `requirements/`, `reference/`, `extensibility/`                                        | Requirements, factual reference, and extension surfaces. |

Trees are created only as real content lands; empty placeholder pages are not
added.

## Maintaining the corpus

1. Update the canonical topic document first.
2. Keep status labels honest: `draft`, `accepted`, `normative`, `stable`,
   `deprecated`, `archived`.
3. Cross-link one authoritative definition instead of copying divergent
   wording.
4. Update this index and the root `README.md` when navigation changes.
5. Run `just check` before every push; documentation synchronization is part of
   delivery completion.
