# Frequently asked questions

This document provides answers to common architectural, configuration, and
operational questions about Bitty for users, developers, and packagers.

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
- For detailed architecture, see [Configuration model RFC](specifications/configuration-model-rfc.md) and [Lua and XDG configuration](configuration/lua-and-xdg.md).

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

- Environment variables set in shell startup scripts (`~/.bashrc`, `~/.zshrc`, `~/.config/fish/config.fish`) take effect only when Bitty is launched from that interactive shell. When launched from a desktop launcher or systemd user service, Bitty inherits the session-level or system-level environment.
- Any variable set inside an active tab via `export VAR=val` or `set -x VAR val` affects only that shell and its descendants. It never propagates back across the PTY boundary to the terminal process or peer tabs.

## Platform paths and overrides

### Where are configuration and data files stored across operating systems?

Bitty follows the XDG Base Directory specification on Linux, and standard platform conventions on macOS and Windows:

| Directory        | Linux / BSD                                                | macOS                                       | Windows                      |
| :--------------- | :--------------------------------------------------------- | :------------------------------------------ | :--------------------------- |
| **Config**       | `$XDG_CONFIG_HOME/bitty` (default `~/.config/bitty`)       | `~/Library/Application Support/bitty`       | `%APPDATA%\bitty`            |
| **Data**         | `$XDG_DATA_HOME/bitty` (default `~/.local/share/bitty`)    | `~/Library/Application Support/bitty`       | `%LOCALAPPDATA%\bitty`       |
| **Cache**        | `$XDG_CACHE_HOME/bitty` (default `~/.cache/bitty`)         | `~/Library/Caches/bitty`                    | `%LOCALAPPDATA%\bitty\cache` |
| **State / Logs** | `$XDG_STATE_HOME/bitty` (default `~/.local/state/bitty`)   | `~/Library/Application Support/bitty/state` | `%LOCALAPPDATA%\bitty\state` |
| **Runtime**      | `$XDG_RUNTIME_DIR/bitty` (default `/run/user/<uid>/bitty`) | `~/Library/Caches/bitty/run`                | `%LOCALAPPDATA%\bitty\run`   |

### Can I change these paths using environment variables or CLI flags?

Yes. Bitty provides explicit environment variables and CLI flags to override platform default paths:

- **CLI flags**:
  - `--config <path>`: Specifies an explicit configuration file, bypassing default search paths.
  - `--config-dir <dir>`: Sets the configuration directory for multi-file configurations.
- **Environment variables**:
  - `BITTY_CONFIG`: Sets an explicit path to the configuration file.
  - `BITTY_CONFIG_DIR`: Overrides the base configuration directory.
  - `BITTY_DATA_DIR`: Overrides the persistent data directory (plugins, themes, session state).
  - `BITTY_LOG_DIR`: Overrides the directory where diagnostic logs are written.
- **Evaluation precedence**:
  1. CLI arguments (`--config`)
  2. Direct environment overrides (`BITTY_CONFIG`)
  3. Platform standard directories (`$XDG_CONFIG_HOME`, `~/Library/Application Support`, `%APPDATA%`)

## Performance and runtime

### What is Bitty's binary size and memory budget?

Bitty is built in modern Rust with a strict resource and dependency budget:

- Target binary size is under 20 MB uncompressed (excluding external debug symbols).
- Baseline idle memory consumption is bounded below 35 MB RSS for a single active terminal session.
- By utilizing a custom pure-Rust Lua runtime (Phodopus) without C runtime bindings, Bitty avoids large native runtimes while guaranteeing fast cold starts (< 50 ms to first interactive frame).

### Where can I find more in-depth documentation?

- [User guide FAQ](user-guide/faq.md)
- [Lua and XDG configuration](configuration/lua-and-xdg.md)
- [Configuration model RFC](specifications/configuration-model-rfc.md)
- [Terminal platform boundaries](specifications/terminal-platform-boundaries-candidate.md)
- [Plugin platform documentation](https://github.com/bitty-terminal/bitty-plugins-docs)
- [AI core documentation](https://github.com/bitty-terminal/bitty-ai-docs)
