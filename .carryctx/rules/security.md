# Security rules

1. Treat PTY bytes, plugins, project files, IPC/MCP/Agent clients, packages,
   dependencies, and external references as untrusted by default.
2. P0 trust boundaries are hard gates: every transition to filesystem, process,
   network, clipboard, GPU, IPC, debug, or runtime control passes an explicit
   policy, capability, authenticated scope, and resource budget as applicable.
3. Plugins may alter presentation, never Terminal Truth. They do not enter the
   parser, render, or input hot paths and receive no ambient Lua/OS authority.
4. All attacker-controlled parsers have limits and malformed/oversized/fuzz
   coverage. Graphics enforce compressed, decoded, pixel, and aggregate budgets.
5. IPC is current-user-local by default and scoped per action. MCP/Agents are
   read-only by default; terminal content is untrusted observation data.
6. Installation executes no package code. Lock/checksum validation is required;
   capability increases block update pending review; activation is transactional.
7. Sensitive traces are minimized and redacted; input is opt-in. Safe mode must
   always start without third-party plugins.
8. A security-sensitive task updates the threat model/risk register and requires
   independent security-auditor evidence before completion.
