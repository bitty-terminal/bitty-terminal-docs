---
title: Frequently asked questions
description: Common questions about Bitty configuration environment isolation cross-platform paths and runtime
category: user-guide
audience: user
document_type: explanation
status: draft
website_publish: true
sidebar_order: 50
---

# Frequently asked questions

This document collects common architectural and practical questions regarding
Bitty's configuration model, environment isolation, platform paths, and runtime
characteristics.

## Configuration and environment

### How does Bitty handle configuration? Is it like Neovim or WezTerm?

Bitty adopts a declarative configuration model inspired by WezTerm rather than an
imperative module-setup model like Neovim.

- In Bitty, user configuration lives in `init.lua` (by default under `$XDG_CONFIG_HOME/bitty/init.lua`) and returns a declarative table:

  ```lua
  return {
    theme = "tokyo-night",
    font = {
      family = "JetBrains Mono",
      size = 14.0,
    },
  }
  ```

- The Lua script does not directly mutate host state or invoke imperative setup functions (such as `require("bitty").setup(...)`). Instead, the host compiles the returned table into an immutable `ConfigPlan` that is merged across layers (`CLI > file > profile > defaults`) before the renderer and terminal runtime initialize.

### Why does calling `os.getenv` fail with `E_ENV_DENIED`?

Bitty enforces Zero Ambient Authority (ZAA). Physical stripping of `os.getenv`
and `os.setenv` prevents malicious project trees or third-party code from
exfiltrating credentials (such as `AWS_SECRET_ACCESS_KEY` or `GITHUB_TOKEN`).

- If user code or a plugin attempts to call `os.getenv`, Bitty raises a typed runtime error: `E_ENV_DENIED`.
- To safely read environment variables, use the host-mediated bridge:

  ```lua
  local editor = bitty.env.get("EDITOR")
  local has_profile = bitty.env.has("BITTY_PROFILE")
  ```

- In the configuration VM, the host resolves keys against an allowlist of standard variables (`EDITOR`, `SHELL`, `TERM`, `BITTY_PROFILE`, `BITTY_THEME`, `XDG_CONFIG_HOME`). Sensitive tokens are filtered and return `nil`. In plugin VMs, keys additionally require manifest capability declarations (`env:<KEY>`).

### Why do `export` or `set -x` in a terminal tab not affect Bitty?

In Unix process hierarchies, child processes cannot mutate parent process memory.
The terminal emulator is the parent process, and the shell running in a tab is a
child process connected via a pseudo-terminal (PTY) pair.

1. **Process isolation:** Running `export FOO=bar` in Bash/Zsh or `set -x FOO bar` in Fish mutates only that child shell's private environment table.
2. **Immutable VM snapshot:** Bitty captures allowed environment variables once at VM creation. Mid-session environment changes do not retroactively alter running Lua VMs.
3. **Security:** Preventing child PTYs from rewriting terminal emulator variables eliminates Confused Deputy attacks where untrusted scripts attempt to take over the terminal harness.
4. **Dynamic control:** To change terminal appearance or behavior from scripts, use the authenticated IPC interface (`bitty ctl theme set <name>`).

## Filesystem and cross-platform paths

### Where are configuration files stored across Linux, macOS, and Windows?

Bitty abstracts paths through a five-role semantic hierarchy:

| Role        | Linux / BSD                                        | macOS                                                          | Windows                              |
| ----------- | -------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------ |
| **Config**  | `$XDG_CONFIG_HOME/bitty` (`~/.config/bitty`)       | `~/Library/Application Support/bitty` (also `~/.config/bitty`) | `%APPDATA%\bitty` (roaming)          |
| **Data**    | `$XDG_DATA_HOME/bitty` (`~/.local/share/bitty`)    | `~/Library/Application Support/bitty`                          | `%LOCALAPPDATA%\bitty\data` (local)  |
| **State**   | `$XDG_STATE_HOME/bitty` (`~/.local/state/bitty`)   | `~/Library/Application Support/bitty`                          | `%LOCALAPPDATA%\bitty\state` (local) |
| **Cache**   | `$XDG_CACHE_HOME/bitty` (`~/.cache/bitty`)         | `~/Library/Caches/bitty`                                       | `%LOCALAPPDATA%\bitty\cache` (local) |
| **Runtime** | `$XDG_RUNTIME_DIR/bitty` (`/run/user/<uid>/bitty`) | `$TMPDIR/bitty-<uid>/`                                         | `\\.\pipe\bitty-<username>-<id>`     |

On Windows, configuration roams with user domain profiles (`%APPDATA%`), while
rebuildable caches and session state stay machine-local (`%LOCALAPPDATA%`).

### Can I override configuration paths using environment variables?

Yes. Bitty checks paths in strict precedence order:

1. CLI argument: `--config <path>`
2. Environment variable: `BITTY_CONFIG`
3. Probed defaults: `$XDG_CONFIG_HOME/bitty/init.lua` > `%APPDATA%\bitty\init.lua` > `$HOME/.config/bitty/init.lua` > `%LOCALAPPDATA%\bitty\init.lua`

If `--config` or `BITTY_CONFIG` is explicitly specified but the file does not
exist, Bitty fails closed with exit code 2 rather than falling back.

Other dedicated override variables include:

- `BITTY_PROFILE`: Selects an overlay profile (`profiles/<name>.lua`).
- `BITTY_SOCKET`: Overrides the IPC Unix socket or named pipe path.
- `BITTY_PLUGIN_DIR`: Overrides the plugin discovery directory.
- `BITTY_LOG` and `BITTY_VERBOSE`: Controls logging level and verbosity.
- `BITTY_FAIL_LOUD`: Aborts startup on primary shell or IPC initialization failure.

## Performance and memory footprint

### What is the expected binary size and memory consumption?

Bitty maintains a Small-Core Unix architecture by extracting non-terminal
concerns (AI runtime, observability backend, network, and agent coordination) into
independent L1 extensions:

- **Binary size:** The stripped release binary for Bitty Core is approximately 9.5 to 11.5 MB (median ~10.5 MB), with GPU rendering (`bitty-render`) accounting for roughly half of the code size.
- **Lua VM footprint:** The sandboxed Lua runtime (`phodopus`) adds only ~590 KiB to binary text size and initializes in ~35 microseconds with an initial heap of ~11 KB.
- **Memory consumption:**
  - Idle (1 window, clean shell): ~38 to 55 MB RSS.
  - Typical daily use (3 to 5 tabs with scrollback): ~65 to 90 MB RSS.
  - Heavy workload (8 tabs, rich images, large scrollback buffers): ~150 to 220 MB RSS (bounded by performance ceiling PB-3 <= 250 MB).
