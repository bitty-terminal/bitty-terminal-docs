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
terminal-platform corpus was migrated from `bitty-docs` (`docs/projects/bitty/`
at revision `c664214`) with history preserved in CTX-0001. Platform content
lives in topic trees at the repository root; this repository's own process
documents live under `docs/`.

## Authority and composition

- This repository owns terminal-platform architecture, specifications,
  configuration, interfaces, product, reference, user-facing, engineering
  evidence, and platform security audit documents.
- Shared cross-project governance lives in
  [bitty-docs](https://github.com/bitty-terminal/bitty-docs): decisions, the
  security corpus, sources, findings, reviews, handoff, project state, roadmap,
  and releases. This repository links to those documents with absolute URLs
  instead of copying them.
- Sibling documentation repositories:
  [bitty-ai-docs](https://github.com/bitty-terminal/bitty-ai-docs) (AI core) and
  [bitty-plugins-docs](https://github.com/bitty-terminal/bitty-plugins-docs)
  (plugin ecosystem). Documents migrated to those repositories are referenced
  from surviving pages by absolute cross-repository URL.
- The repository is mounted at `bitty/docs` as a Git submodule
  (`bitty/.gitmodules`: `[submodule "docs"] path = docs`). The implementation
  pin trails `main` by design, and `bitty-docs` holds a separate
  governance-reviewed pin.

## Content trees

| Tree                                           | Entry points                                                                                                                                                                                                                                              |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `architecture/`                                | [Architecture diagrams](../architecture/README.md), [overview](../architecture/overview.md), [core boundaries](../architecture/core-boundaries.md), [future boundaries](../architecture/future-boundaries.md).                                            |
| `specifications/`                              | [Specification register](../specifications/README.md) and the versioned technical contracts.                                                                                                                                                              |
| `configuration/`                               | [Lua configuration and XDG layout](../configuration/lua-and-xdg.md), [theme presets](../configuration/themes.md).                                                                                                                                         |
| `interfaces/`                                  | [Command-line interface](../interfaces/cli.md), [rich content](../interfaces/rich-content.md).                                                                                                                                                            |
| `product/`                                     | [Vision](../product/vision.md), [panel vision](../product/panel-vision.md), [release ladder](../product/release-ladder.md), and delivery plans.                                                                                                           |
| `development/`                                 | [Release mechanics](../development/release-mechanics.md) (crate publish order and version mapping) and the [maintainability report](../development/maintainability.md).                                                                                   |
| `security/`                                    | Platform [clipboard](../security/audits/clipboard-2026-09.md), [resource loader](../security/audits/resource-loader-2026-09.md), [rich image](../security/audits/rich-image-2026-09.md), and [VT parser](../security/audits/vt-parser-2026-09.md) audits. |
| `user-guide/`, `tutorials/`, `how-to/`         | [User guide](../user-guide/README.md), [tutorials](../tutorials/README.md), [how-to guides](../how-to/README.md).                                                                                                                                         |
| `reference/`, `requirements/`                  | [Reference](../reference/README.md) and [requirements](../requirements/README.md) registers.                                                                                                                                                              |
| `examples/`, `migrations/`, `troubleshooting/` | [Examples](../examples/README.md), [migrations](../migrations/README.md), [troubleshooting](../troubleshooting/README.md).                                                                                                                                |

## Process documents

| Document                                                        | Purpose                                                   |
| --------------------------------------------------------------- | --------------------------------------------------------- |
| [Development](development/README.md)                            | Contributor entry point and local gates.                  |
| [Documentation workflow](development/documentation-workflow.md) | Normative authoring, metadata, status, and review policy. |

## Maintaining the corpus

1. Update the canonical topic document first.
2. Keep status labels honest: `draft`, `accepted`, `normative`, `stable`,
   `deprecated`, `archived`.
3. Cross-link one authoritative definition instead of copying divergent
   wording.
4. Update this index and the root `README.md` when navigation changes.
5. Run `just check` before every push; documentation synchronization is part of
   delivery completion.
