# bitty-terminal-docs

`bitty-terminal-docs` is the canonical documentation repository for the Bitty
terminal platform — the product implemented by the `bitty` repository. It owns
the English-language architecture, specification, configuration, interface,
product, reference, and user-facing documentation for the terminal platform.

**Current state: terminal-platform corpus migrated (CTX-0001).** The
terminal-platform documents were imported from `bitty-docs`
(`docs/projects/bitty/` at `c664214`) with history preserved. AI-core and
plugin-ecosystem documents were split out to the separately migrated
`bitty-ai-docs` and `bitty-plugins-docs` repositories, and every
cross-repository link uses an absolute URL. CTX-0002 recovered the
evidence and operations documents that bitty PR #663 removed without a
docs-repository destination, adding the `development/` and `security/audits/`
trees and the crate publish ladder at `development/release-mechanics.md`.

## Scope

This repository owns:

- Product intent and user-facing documentation for the terminal platform.
- Architecture, specifications, requirements, and interface contracts.
- Configuration, extensibility, examples, migrations, and troubleshooting
  guidance.
- Reference material derived from verified implementation evidence.
- Engineering evidence, release operations, and platform security audit
  records recovered from the `bitty` repository.

This repository does not own:

- Shared cross-project governance — decisions, the security corpus, findings,
  reviews, handoff, roadmap, releases, and project state — which stays in
  [bitty-docs](https://github.com/bitty-terminal/bitty-docs).
- AI-core documentation, which lives in
  [bitty-ai-docs](https://github.com/bitty-terminal/bitty-ai-docs).
- Plugin-ecosystem documentation, which lives in
  [bitty-plugins-docs](https://github.com/bitty-terminal/bitty-plugins-docs).

Cross-project contracts and registers are linked, never copied.

## Composition

The repository is mounted at `bitty/docs` as a Git submodule so platform
documentation version-matches the implementation it describes
(`bitty/.gitmodules`: `[submodule "docs"] path = docs`; the implementation
pin trails `main` by design for reproducibility). The standalone repository
remains fully self-contained and passes its own gates. Platform content lives
in topic trees at the repository root; this repository's process documents
stay under `docs/`.

## Structure

| Path                             | Purpose                                                                                                                            |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `docs/README.md`                 | Documentation map and authority rules for this repository.                                                                         |
| `docs/development/`              | Contributor workflow and the normative documentation policy.                                                                       |
| `<topic>/`                       | Canonical platform documents (architecture, specifications, configuration, interfaces, product, reference, and user-facing trees). |
| `TODO.md`                        | Work register for this repository.                                                                                                 |
| `AGENTS.md`                      | Agent scope, CarryCtx workflow, and local gate rules.                                                                              |
| `.github/scripts/check-docs.mjs` | Links, metadata, language, budgets, and hygiene checks.                                                                            |
| `justfile`                       | Pinned docs-quality commands; `just check` is the gate.                                                                            |

## Authority and status

- The
  [documentation workflow](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/docs/development/documentation-workflow.md)
  is normative for authoring, metadata, status, and review.
- Every canonical document (root topic trees and `docs/`) carries the flat
  frontmatter schema and declares its own status; design intention must never
  read as implemented behavior.
- When statements conflict, the canonical bitty-docs security corpus takes
  precedence. Implementation claims require evidence from the owning code
  repository.

## Local checks

```sh
just fmt           # format supported files
just check         # full local gate pipeline (same logical gates as CI)
```

`just check` verifies Prettier formatting, markdownlint, repository-local links,
frontmatter metadata, English-only content, file budgets, hygiene, SVG
well-formedness, and GitHub Actions syntax. JavaScript tooling runs through Bun
only; `npm`, `npx`, and `yarn` are not used here.

## Contributing

Read [CONTRIBUTING.md](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/CONTRIBUTING.md)
and [AGENTS.md](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/AGENTS.md)
before editing. The normal lifecycle is Issue, scoped CarryCtx task,
branch/worktree, commit, pull request, independent review plus CI, merge, then
task closure and a final checkpoint.

## Related repositories

| Repository                                                                 | Role                                           |
| -------------------------------------------------------------------------- | ---------------------------------------------- |
| [bitty](https://github.com/bitty-terminal/bitty)                           | Terminal platform implementation.              |
| [bitty-docs](https://github.com/bitty-terminal/bitty-docs)                 | Shared cross-project governance and registers. |
| [bitty-ai-docs](https://github.com/bitty-terminal/bitty-ai-docs)           | AI-core documentation.                         |
| [bitty-plugins-docs](https://github.com/bitty-terminal/bitty-plugins-docs) | Plugin-ecosystem documentation.                |

## License

MIT — see [LICENSE](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/LICENSE).
