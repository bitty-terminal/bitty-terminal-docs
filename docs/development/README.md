---
title: Development
description: Contributor entry point for this documentation repository
category: development
audience: contributor
document_type: index
status: accepted
website_publish: true
sidebar_order: 10
---

# Development

This repository holds canonical documentation only; it ships no product code.
The project is documentation-first and pre-implementation, so this page
describes how to contribute documentation and run the repository gates, not a
product build workflow.

## Start here

1. Read the root `AGENTS.md` and the workspace-level guidance before editing.
2. Read the [documentation workflow](documentation-workflow.md) — it defines the
   frontmatter schema, status meanings, and review expectations for every
   canonical document in the root topic trees and under `docs/`.
3. Check the [documentation map](../README.md) for the content trees and process
   documents.
4. Enter the repository with a scoped CarryCtx task and a non-overlapping file
   scope before editing.
5. Run `just check` locally before every push.

## Local gates

`just check` runs the same logical gates as CI:

- `just fmt-check` — Prettier formatting for every supported file type.
- `just markdownlint` — Markdown linting per `.markdownlint-cli2.jsonc`.
- `just links` — repository-local links and heading fragments, offline.
- `just metadata` — the exact flat frontmatter schema for canonical documents.
- `just language` — English-only Markdown.
- `just agents` — AGENTS.md and TODO.md line budgets.
- `just hygiene` — no generated, database, or editor artifacts.
- `just svg` — documentation SVG assets are well-formed XML.
- `just actionlint` — GitHub Actions workflow syntax.

JavaScript tooling runs through Bun only (`bun` / `bunx --bun`); `npm`, `npx`,
and `yarn` are not used in this repository. Tool versions are pinned in the
justfile.

## Delivery expectation

The normal lifecycle is Issue, scoped CarryCtx task, branch/worktree, commit,
pull request, independent review plus CI, merge, then task closure and a final
checkpoint. Documentation synchronization is part of the definition of done for
every change.
