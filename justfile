# Docs repository quality commands

prettier_version := "3.9.6"
markdownlint_version := "0.23.1"
actionlint_version := "1.7.12"
commitlint_version := "21.2.2"
lefthook_version := "2.1.10"

# Format every file type supported by Prettier inside this repository.
fmt:
    bunx --bun prettier@{{prettier_version}} --write . --ignore-unknown

# Check formatting without changing files.
fmt-check:
    bunx --bun prettier@{{prettier_version}} --check . --ignore-unknown

# Lint every Markdown file selected by .markdownlint-cli2.jsonc.
markdownlint:
    bunx --bun markdownlint-cli2@{{markdownlint_version}}

# Check repository-local Markdown links and fragments without network access.
links:
    bun .github/scripts/check-docs.mjs links

# Validate the exact flat frontmatter schema for every canonical document.
metadata:
    bun .github/scripts/check-docs.mjs metadata

# Keep every repository-owned Markdown file English-only.
language:
    bun .github/scripts/check-docs.mjs language

# Enforce line budgets for every repository-owned AGENTS.md and TODO.md.
agents:
    bun .github/scripts/check-docs.mjs agents

# Reject generated, temporary, database, and editor artifacts.
hygiene:
    bun .github/scripts/check-docs.mjs hygiene

# Validate every documentation SVG asset is well-formed XML.
svg:
    #!/usr/bin/env bash
    set -euo pipefail
    command -v xmllint >/dev/null || { echo "xmllint (libxml2-utils) is required" >&2; exit 1; }
    git ls-files -z --cached --others --exclude-standard -- '*.svg' | xargs -0 -r xmllint --noout

# Validate GitHub Actions syntax using the locally installed actionlint.
actionlint:
    @installed="$(actionlint --version | head -n 1)"; test "$installed" = "{{actionlint_version}}" || { echo "actionlint {{actionlint_version}} required; found $installed" >&2; exit 1; }
    actionlint -color -shellcheck=

# Validate a commit message file against commitlint.config.ts (Conventional Commits).
commit-check message_file:
    #!/usr/bin/env bash
    set -euo pipefail
    message_file="{{message_file}}"
    if [[ -z "${message_file}" ]]; then
        echo "usage: just commit-check <message-file>" >&2
        exit 2
    fi
    version="{{commitlint_version}}"
    cache="${XDG_CACHE_HOME:-${HOME}/.cache}/bitty-docs-repos/commitlint@${version}"
    cli="${cache}/node_modules/@commitlint/cli/lib/cli.js"
    config="${cache}/node_modules/@commitlint/config-conventional/package.json"
    if [[ ! -f "${cli}" || ! -f "${config}" ]]; then
        mkdir -p "${cache}"
        printf '{"name":"bitty-docs-repos-commitlint","private":true}\n' > "${cache}/package.json"
        (cd "${cache}" && bun add "@commitlint/cli@${version}" "@commitlint/config-conventional@${version}")
    fi
    exec env NODE_PATH="${cache}/node_modules" bun "${cli}" --edit "${message_file}"

# Install Git hooks managed by lefthook (opt-in per contributor checkout).
hooks-install:
    bunx --bun lefthook@{{lefthook_version}} install

# Remove lefthook-managed Git hooks.
hooks-uninstall:
    bunx --bun lefthook@{{lefthook_version}} uninstall

# Run the same logical gates as CI. All recipes are read-only.
check:
    just fmt-check
    just markdownlint
    just links
    just metadata
    just language
    just agents
    just hygiene
    just svg
    just actionlint
