---
title: Bitty terminal platform documentation
description: Per-project documentation partition for the Bitty terminal platform
category: project
audience: mixed
document_type: index
status: draft
website_publish: false
sidebar_order: 10
---

# Bitty terminal platform documentation

This directory will hold the per-project documentation for the Bitty terminal
platform: core architecture, VT and PTY behavior, UI and rendering,
configuration, plugin host, IPC and agent surfaces, packaging, and the
terminal-facing user and contributor guides.

## Current stage

The partition exists, but the terminal-platform documents have not moved yet.
They remain in their existing top-level directories (`architecture/`,
`specifications/`, `configuration/`, `product/`, `interfaces/`,
`user-guide/`, `tutorials/`, `how-to/`, `reference/`, `examples/`,
`extensibility/`, `requirements/`, `troubleshooting/`, `migrations/`) until a
later, separately scoped migration moves them here with `git mv`, rewrites
links, and preserves each document's `website_publish` flag and deprecation
status. This page does not claim that any listed content has moved or changed.

## Related

- [Project documentation partition](../README.md)
- [Documentation map](../../README.md)
- [Documentation workflow](../../development/documentation-workflow.md)
- Shared governance: [`decisions/`](../../decisions/index.md),
  [`security/`](../../security/overview.md),
  [`development/`](../../development/README.md),
  [`project/`](../../project/repository-map.md)
