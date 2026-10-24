---
title: Crash and exit diagnostics
description: Collect bounded crash exit and stall evidence from Bitty state files and interpret the report fields
category: troubleshooting
audience: user
document_type: guide
status: draft
website_publish: true
sidebar_order: 20
---

# Crash and exit diagnostics

> Status: draft, implemented-only. This guide records behavior on the
> unreleased 0.0.28 development line from `bitty` PR #2588 (branch head
> `9cbbc8b`) for bitty#2570; the crash and exit reports are absent from 0.0.27
> and earlier. The opt-in stall watchdog and `BITTY_STALL_WATCHDOG` shipped in
> 0.0.26. No part of this guide is a stable or supported contract, and no
> diagnostic or recovery path is `Verified` or `Compatible`. When the code and
> this page disagree, the code wins.

## Purpose

Use this guide when a Bitty session disappears or closes without an
explanation, or leaves a mapped window that no longer answers input. The
process may have no terminal output because a graphical launcher starts it
without a readable standard error stream. Three local diagnostics make the
next occurrence self-describing:

- The **crash report** records a Rust panic: the message, source location,
  active main-loop phase, lifecycle and surface counters, process totals,
  thread states, and a path-reduced backtrace.
- The **exit report** records which explicit exit path ran: the exit reason,
  last phase, last lifecycle event, and surface counters.
- The **stall report** records a main loop that stopped making progress while
  the window stayed mapped. It is written only when the opt-in stall watchdog
  is enabled.

The diagnostics are local-only. Bitty never uploads them, they are not
telemetry, and each one is a single bounded slot rather than an append-only
log. Treat their contents as sensitive diagnostic data even after redaction.

## Prerequisites

| Surface                                                         | Applies to                                                                                                       |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Crash report, exit report, `BITTY_CRASH_REPORT`                 | The 0.0.28 development line (bitty PR #2588); not present in 0.0.27 or earlier                                   |
| Stall report, `BITTY_STALL_WATCHDOG`, `BITTY_STALL_WATCHDOG_MS` | 0.0.26 and later                                                                                                 |
| Thread-state rows (`tid`, `state`, `wchan`, `syscall_number`)   | Linux only; macOS and Windows still write reports but print `thread-state snapshot unavailable on this platform` |
| State directory                                                 | Unix: `XDG_STATE_HOME` or `HOME`; Windows falls back to `LOCALAPPDATA` when neither is set                       |

- Set diagnostic environment variables in the environment that launches
  `bitty`, for example `BITTY_CRASH_REPORT=0 bitty`. Setting them in a shell
  that runs inside Bitty does not affect the terminal process.
- You need read access to the user's state directory. The crash and exit
  reports are owner-only (`0600`) on Unix.
- The crash and exit reports are installed only for the interactive event
  loop. A normal headless run (`--headless` or `BITTY_HEADLESS=1`) and
  `bitty --test-mode` return before installation and never write those files.
  The `DisplayUnavailable` fallback is the one headless-adjacent exception: the
  hook is installed first, so the fallback writes an `exit-report.log` line
  with `reason=display-fallback` before running the headless smoke.

## Procedure

### 1. Confirm which diagnostics were active

| Variable                  | Default                           | Enable                                                                                                                  | Disable                                                                      |
| ------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `BITTY_CRASH_REPORT`      | Enabled for interactive runs      | Unset, empty, or any value other than a disabling value                                                                 | `0`, `false`, `off`, `no` (case-insensitive, surrounding whitespace ignored) |
| `BITTY_STALL_WATCHDOG`    | Disabled                          | `1`, `true`, `on`, `yes` (default 2000 ms threshold) or an integer number of milliseconds, clamped to 50 through 600000 | Unset, empty, `0`, `false`, `off`, `no`, or a non-numeric value              |
| `BITTY_STALL_WATCHDOG_MS` | 2000 ms when enabled by a boolean | Integer milliseconds, clamped to the range 50 through 600000                                                            | Never enables the watchdog by itself                                         |

`BITTY_STALL_WATCHDOG=1` is the boolean opt-in, not a one-millisecond
threshold. A larger integer both enables the watchdog and sets its threshold.
The watchdog exists only in the interactive process; headless and test-mode
runs never start it.

### 2. Locate the state files

Bitty resolves one state base directory per file and then appends
`bitty/<file name>`. The order is:

1. `$XDG_STATE_HOME`
2. `$HOME/.local/state` when `XDG_STATE_HOME` is unset or empty
3. `%LOCALAPPDATA%` on Windows when neither variable is set

| File                 | Path                                       | Written when                                                       | Cap   |
| -------------------- | ------------------------------------------ | ------------------------------------------------------------------ | ----- |
| `crash-report.log`   | `$XDG_STATE_HOME/bitty/crash-report.log`   | A panic occurs after the interactive hook is installed             | 8 KiB |
| `exit-report.log`    | `$XDG_STATE_HOME/bitty/exit-report.log`    | An explicit interactive exit path runs                             | 1 KiB |
| `stall-watchdog.log` | `$XDG_STATE_HOME/bitty/stall-watchdog.log` | The opt-in watchdog detects a stall and the report helper succeeds | 8 KiB |

With the default `XDG_STATE_HOME`, the directory is
`$HOME/.local/state/bitty`. On Windows with neither `XDG_STATE_HOME` nor
`HOME` set, it is `%LOCALAPPDATA%\bitty`; that fallback is part of the 0.0.28
development line, while 0.0.27 and earlier resolve the stall slot only from
`XDG_STATE_HOME` or `HOME`. A missing `crash-report.log` is
expected when no panic occurred, when the run was headless, or when
`BITTY_CRASH_REPORT` disabled the hook; a missing `stall-watchdog.log` is
expected unless the watchdog was enabled and a stall was detected.

The files carry no internal timestamp. Use the file modification time to
match a file to an incident, and copy the relevant slot aside before a restart
because the next report replaces it.

### 3. Read the crash report

The crash report is a header followed by one field per line:

| Field or line         | Meaning                                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `bitty: crash report` | Report kind marker; the same file always starts with this line                                                  |
| `kind=panic`          | The report came from the panic hook                                                                             |
| `message=`            | Panic payload reduced to one line, capped at 512 characters; control characters become `?`                      |
| `location=`           | Source file name, line, and column; directory components are dropped                                            |
| `phase=`              | Active main-loop phase when the panic fired                                                                     |
| `lifecycle=`          | `last=<event>` plus a count for every window/surface lifecycle event seen in this process                       |
| `surface=`            | Surface counters: configure, acquire, present, resize, headless, and retry outcomes plus `last=<event>`         |
| `process:`            | `threads=`, `fds=`, and `rss=` in KiB                                                                           |
| Thread rows           | One row per thread (at most 64): `[main]` marker, `tid`, `state`, `wchan`, `syscall_number`, `comm`; Linux only |
| `backtrace:`          | Up to 48 frames; source paths reduce to a file name                                                             |

Example shape (synthetic values):

```text
bitty: crash report
  kind=panic
  message=assertion failed: frame size
  location=runtime_tick.rs:412:9
  phase=runtime-tick
  lifecycle=last=close-requested close-requested=1 closed=1
  surface=last=present-ok configure_ok=3 configure_err=0 acquire_ok=42 acquire_timeout=0 acquire_outdated=0 acquire_lost=0 acquire_other=0 present_ok=41 present_err=1 resize=4 resize_zero_skipped=0 headless_present=0 retry_failures=1 retry_attempts=1 retry_recoveries=1 retry_last_delay_ms=50
  process: threads=19 fds=63 rss=74880 KiB
  [main] tid=1289 state=S wchan=do_epoll_wait syscall_number=232 comm=bitty
  tid=1290 state=S wchan=futex_wait_queue syscall_number=202 comm=bitty-render
  backtrace:
     0: bitty_terminal::terminal_app::TerminalApp::tick
             at terminal_app.rs:1234:9
```

Surface counter names are fixed for this report format: `configure_ok` and
`configure_err` count surface configuration outcomes; `acquire_ok`,
`acquire_timeout`, `acquire_outdated`, `acquire_lost`, and `acquire_other`
count swapchain acquisition outcomes; `present_ok` and `present_err` count
submitted and failed presents; `resize`, `resize_zero_skipped`, and
`headless_present` count resize and software-present paths; and
`retry_failures`, `retry_attempts`, `retry_recoveries`, and
`retry_last_delay_ms` describe the bounded GPU-present retry (50 ms doubling
to a 1 s ceiling) that retains damage and retries instead of spinning.

Phase names use the same vocabulary as the stall watchdog: `startup`, `idle`,
`event`, `window-create`, `pty-pump`, `reap`, `chrome-intercept`,
`route-event`, `ctl-drain`, `config-poll`, `plugin-workspace`,
`plugin-timers`, `chrome-bands`, `plugin-notifications`, `overlays`,
`cold-events`, `runtime-tick`, `snapshot-publish`, `history-capture`,
`cursor-sync`, `reply-flush`, `runtime-events`, `cold-commands`, `shutdown`,
and `unknown`. Lifecycle names are `startup`, `resumed`, `suspended`,
`window-created`, `gpu-attached`, `gpu-attach-failed`, `resized`,
`scale-changed`, `focused`, `unfocused`, `close-requested`, `closed`, and
`exit`.

The panic hook is installed immediately before the interactive event loop
starts. A panic during earlier startup (argument parsing, configuration load,
runtime construction) does not produce a crash report. The hook is
process-wide, so a panic on a worker thread also writes a report even when the
session keeps running; correlate a report with an actual process exit before
treating it as the cause of a disappearance.

### 4. Read the exit report

The exit report is one bounded line:

```text
bitty: exit reason=window-close phase=shutdown lifecycle=closed surface=last=present-ok configure_ok=2 configure_err=0 acquire_ok=8 acquire_timeout=0 acquire_outdated=0 acquire_lost=0 acquire_other=0 present_ok=7 present_err=0 resize=1 resize_zero_skipped=0 headless_present=0 retry_failures=0 retry_attempts=0 retry_recoveries=0 retry_last_delay_ms=0
```

| `reason=` value       | Meaning                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `shell-exit`          | The last shell exited and the session closed                                              |
| `close-view`          | A confirmed close-view action closed the last view                                        |
| `mouse-action`        | A configured mouse action requested exit                                                  |
| `route-event`         | Routed input or a control event requested exit without a more specific reason             |
| `loop-exiting`        | The runtime reported `Exiting`; a defensive backstop path                                 |
| `event-loop-returned` | The event loop returned normally                                                          |
| `display-fallback`    | No usable display server was found; Bitty recorded the fallback before the headless smoke |
| `window-close`        | The window close path requested exit                                                      |
| `unknown`             | The event loop failed without a more specific reason                                      |

The first exit path wins: a specific reason such as `shell-exit` or
`window-close` is recorded before the generic `event-loop-returned`, and the
later call does not overwrite it. An exit report that names
`event-loop-returned` means the loop returned without an earlier specific exit
path.

### 5. Enable and read the stall report

Start Bitty with the watchdog enabled before reproducing the freeze:

```sh
BITTY_STALL_WATCHDOG=1 bitty
```

Use `BITTY_STALL_WATCHDOG_MS` to change the threshold, for example
`BITTY_STALL_WATCHDOG=1 BITTY_STALL_WATCHDOG_MS=5000 bitty`. Values outside
50 through 600000 are clamped. The watchdog never changes routing, timing, or
application state, and it does not kill or restart anything.

A stall report starts with
`bitty: main-loop stall detected: no progress for ...` and contains the idle
time, threshold, phase, app uptime, progress counter, focused view, leaf and
pane counts, scrollback lines, presented frames, plugin and band ids, surface
counters, process totals, and Linux thread rows. When the bounded context
sample cannot be read, it prints `app state unavailable (context lock held or
poisoned)` in place of the focus, plugin, and surface fields. The same report
is written to standard error and to `stall-watchdog.log`; recovery and
suppression lines go to standard error only and never overwrite the stall
slot.

Reporting is rate-limited: at most five reports are written for one continuous
stall, 30 seconds apart, followed by one suppression line. When progress
resumes, one recovery line reports how long the stall lasted. Delivery runs
through a disposable helper with a bounded deadline, so a blocked standard
error pipe does not delay shutdown; if the helper cannot replace the state
slot, the previous report stays intact.

### 6. Confirm bounds, atomic replace, and redaction

| Property         | Crash report                           | Exit report                            | Stall report                                                   |
| ---------------- | -------------------------------------- | -------------------------------------- | -------------------------------------------------------------- |
| Hard cap         | 8192 bytes                             | 1024 bytes                             | 8192 bytes (report); 64 thread rows                            |
| Replacement      | Atomic: sibling temp file, then rename | Atomic: sibling temp file, then rename | Atomic: helper temp file, then rename                          |
| Failure behavior | Previous slot stays intact             | Previous slot stays intact             | Previous slot stays intact                                     |
| Permissions      | `0600` on Unix                         | `0600` on Unix                         | Not separately guaranteed; the state directory is the boundary |
| Append           | Never; one slot per file               | Never; one slot per file               | Never; one slot per file                                       |

Redaction happens before the durable write and the result is truncated again
after scrubbing, so redaction growth cannot exceed the cap:

- The user's home directory prefix becomes `~`.
- Panic locations and backtrace source paths keep only the file name, line,
  and column.
- Secret-shaped values are scrubbed with the same scrubber the stall watchdog
  uses.
- Control characters in one-line fields become `?`, and long fields are
  truncated at a character boundary.

The crash and exit slots are created with `create_new` after a stale temp
sibling is unlinked, so a leftover symlink is not followed. The stall slot is
replaced only by a complete new report.

### 7. Account for what is not captured

- **Terminating signals are not captured.** Bitty forbids unsafe code, so it
  cannot install an async-signal-safe handler for `SIGTERM` or `SIGHUP`, and
  no safe signal crate is in the dependency graph. A signal termination writes
  no new report: the crash slot keeps its previous content (usually absent) and
  the exit slot keeps the last clean exit, if any. Safe signal capture is
  tracked by [bitty#2589](https://github.com/bitty-terminal/bitty/issues/2589)
  and is not implemented.
- **`SIGKILL`, power loss, and kernel kills cannot be captured** by an
  in-process hook. Use the journal, `coredumpctl`, or the system's out-of-memory
  records for those incidents.
- **Native crashes and abort paths that skip the panic hook** (for example a
  segmentation fault, an allocator abort, or `std::process::abort`) write no
  crash report. Use the same out-of-process evidence.
- **Startup panics before hook installation** produce no crash report.
- **Non-Linux platforms** omit thread rows, `wchan`, and syscall numbers.
- **A stale file can describe an earlier run.** There is no timestamp inside a
  report; check the modification time before attributing it to the incident.

## Failure and recovery

| Symptom                                                                         | Evidence to collect                                                                                                            | Likely cause                                                                                                                  | Bounded remediation                                                                                                                              |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| The window vanished and the process is gone                                     | `crash-report.log` and `exit-report.log`; modification times; the launch command and whether it was headless                   | A panic (crash report) or an explicit close/exit path (exit report); a missing or stale exit report suggests a signal or kill | Copy both slots aside, then restart once. If a crash report exists, restart with `bitty --safe` to exclude configuration and plugins.            |
| The window is mapped but ignores input and the compositor marks it unresponsive | `stall-watchdog.log` written while `BITTY_STALL_WATCHDOG` was enabled; the `phase=`, `wchan=`, and `syscall_number=` fields    | The main thread is blocked inside the named phase, a plugin callback, a PTY operation, or a driver wait                       | Capture the single slot, note the phase and main-thread wait channel, then restart. Enable the watchdog for the next reproduction only.          |
| The window is visible but stale, or frames stop updating                        | `surface=` counters in any report: `present_err`, `acquire_*`, `retry_failures`, `retry_attempts`, `retry_recoveries`, `last=` | A failed GPU present or swapchain acquire, with a bounded retry in progress                                                   | If `retry_recoveries` increases, the retry recovered. If `retry_failures` grows without recovery, restart with `--safe` and report the counters. |
| Bitty exits immediately with `display-fallback`                                 | `exit-report.log` with `reason=display-fallback`                                                                               | No usable display server was found; the headless smoke path ran                                                               | Check `DISPLAY`/`WAYLAND_DISPLAY` and the launch session, not the terminal configuration.                                                        |
| No state files exist after an incident                                          | The resolved state directory, its permissions, and the environment that launched Bitty                                         | Headless run, disabled switch, a panic before installation, or an unwritable state directory                                  | Verify the switch and the launch environment; ensure at least one state root is writable; reproduce with `BITTY_CRASH_REPORT=1`.                 |
| A report contains a secret or an unexpected path                                | The affected file, its modification time, and the command that produced it                                                     | A value that the secret scrubber did not recognize, or a path outside the home prefix                                         | Do not paste the report publicly. Treat it as a potential security finding and escalate with the minimal necessary excerpt.                      |

### Recovery

- Restart normally after capturing the evidence. The next report replaces the
  previous slot, which is why you copy it first.
- Use `bitty --safe` for one diagnostic restart when configuration or a plugin
  is a plausible cause. Safe mode installs the crash hook, so a panic during a
  safe-mode run is still recorded.
- Disable the crash hook with `BITTY_CRASH_REPORT=0` only when the files
  themselves are the problem; disabling it removes the next occurrence's
  evidence.
- Leave the stall watchdog enabled only while you are reproducing a freeze, and
  unset it afterwards.

### Escalation data

Include the following in an Issue or support report:

- `bitty --version` output and the platform (OS, display server, launch
  method).
- Whether the run was interactive, `--headless`, or `--test-mode`, and the
  values of `BITTY_CRASH_REPORT`, `BITTY_STALL_WATCHDOG`, and
  `BITTY_STALL_WATCHDOG_MS`.
- The bounded report files, reviewed for sensitive values first.
- The modification time of each file and the approximate incident time.
- Reproduction steps and whether `bitty --safe` changed the symptom.

Do not attach a full session transcript or an unbounded log when the state
files already answer the question.

## References

- Implementation: `crates/bitty-terminal/src/crash_report.rs`,
  `crates/bitty-terminal/src/stall_watchdog.rs`,
  `crates/bitty-terminal/src/main.rs`, and
  `crates/bitty-terminal/src/terminal_app.rs` in
  [bitty](https://github.com/bitty-terminal/bitty) at bitty PR #2588 (head
  `9cbbc8b`).
- [bitty#2570](https://github.com/bitty-terminal/bitty/issues/2570): the
  silent-disappearance report that introduced these diagnostics.
- [bitty#2589](https://github.com/bitty-terminal/bitty/issues/2589): the
  follow-up for safe signal capture and the remaining freeze work.
- [bitty#2483](https://github.com/bitty-terminal/bitty/issues/2483): the opt-in
  stall watchdog.
- [Command-line interface](../interfaces/cli.md): the switch summary and the
  rest of the CLI environment contract.
- [Lua configuration and XDG layout](../configuration/lua-and-xdg.md): the
  state and configuration directory conventions.
- [Security overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
  and [threat model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md):
  the policy that governs diagnostic data and disclosure.
