---
title: Observability Extraction Plan
description: Architecture plan for extracting debug/observability functionality into bitty-observability
category: architecture
audience: contributor
document_type: explanation
status: draft
website_publish: false
sidebar_order: 99
---

# Observability Extraction Plan

> **Status:** Draft  
> **Created:** 2024-10-02  
> **Purpose:** Define the architecture and migration path for extracting debug/observability functionality from bitty Core into an independent `bitty-observability` component.

## Status and authority

This plan is a candidate architecture sketch. It describes a possible migration
path and does not authorize, schedule, or claim any extraction: every
implemented claim, line count, and size figure below is a candidate estimate,
not evidence.

The observability boundary is now decided in direction by
[ADR 0015](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md)
(Boundary 1), with a focused contract in
[`W-71` observability boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/observability-boundary.md)
(draft) and alignment carried by `W-110`. Under that direction Core retains a
minimal, read-only observation seam plus a default-deny authorization gate,
redaction at emission, and bounded buffers; the optional debug and trace
implementation and all observation policy move to `bitty-observability`. Nothing
in that boundary is accepted or implemented, and the extraction this plan
sketches must not start before the `W-71` contract is accepted and its removal
gates are met. The accepted ownership summary lives in
[Core and Plugin Boundaries](core-boundaries.md#decided-extraction-boundaries),
and the dependency order is recorded in the
[small-core refactor execution handoff](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/handoff/2026-10-02-small-core-refactor.md).
The `bitty-observability` repository already exists with API and partial
implementation crates; its existence is not evidence that Core has adopted the
seam, and no part of this plan is a Core-integration claim.

## Executive Summary

This document outlines a 3-phase plan to extract ~5000 lines of debug/observability code from bitty Core into an independent `bitty-observability` component, following the successful pattern established by `bitty-network`.

**Key Benefits:**

- Reduces Core binary size by ~20% (~15 MB → ~12 MB)
- Eliminates debug surface from default installations (security)
- Enables independent updates for observability tooling
- Maintains zero-cost abstraction for Core mechanism

**Migration Path:**

1. **Phase 1:** Add observability trait abstractions (~200 lines)
2. **Phase 2:** Add feature flags (code remains, becomes optional)
3. **Phase 3:** Extract to independent repository (~5000 lines removed)

---

## Background

### Current State

Debug functionality is currently embedded in Core across multiple crates:

| Component                     | Lines      | Description          |
| ----------------------------- | ---------- | -------------------- |
| `plugin_runtime/debug.rs`     | 1164       | DebugView, TraceHub  |
| `plugin_runtime/redaction.rs` | 238        | Payload filtering    |
| `bitty-ipc/devtools.rs`       | 2000+      | 30+ IPC methods      |
| `plugin_runtime/services.rs`  | ~400       | Debug implementation |
| Other files                   | ~1050      | API, tests, routing  |
| **Total**                     | **~4852+** |                      |

### Motivation

Following the Unix philosophy and `bitty-network` precedent:

- **Mechanism in Core:** Plugin lifecycle, event delivery, state management
- **Policy outside Core:** Debug views, trace buffering, IPC protocol
- **Optional installation:** Users pay for what they use

---

## Architecture Design

### Core Abstraction Layer

Add pure trait definitions in `bitty-runtime/src/observability.rs`:

```rust
/// Read-only plugin state inspection
pub trait PluginStateInspector {
    fn discovered_ids(&self) -> Vec<PluginId>;
    fn plugin_state(&self, id: &PluginId) -> Option<LifecycleState>;
    fn plugin_commands(&self, id: &PluginId) -> Vec<CommandInfo>;
    fn plugin_subscriptions(&self, id: &PluginId) -> Vec<EventKind>;
    fn plugin_grants(&self, id: &PluginId) -> Option<BTreeSet<CapabilityId>>;
}

/// Event observation point
pub trait EventTracer {
    fn record_event(&mut self, kind: &str, payload: &serde_json::Value);
}
```

**Properties:**

- Zero runtime overhead (trait is compile-time abstraction)
- Read-only (no mutation exposed)
- Minimal surface (only essential queries)
- Safe (no internal state leaks)

### Component Boundary

```text
┌─────────────────────────────────────────────────────────┐
│ bitty Core (mechanism)                                   │
│  ├── Plugin lifecycle (create/activate/suspend/dispose)  │
│  ├── Event delivery (deliver_event)                      │
│  ├── State management (entries, registrations, grants)   │
│  └── observability traits ← abstraction boundary         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ bitty-observability (policy, optional)                   │
│  ├── bitty-observability-core                            │
│  │    ├── DebugView (snapshots)                          │
│  │    ├── TraceHub (ring buffers)                        │
│  │    └── Redaction (per-grant filtering)                │
│  ├── bitty-observability-lua                             │
│  │    └── bitty.debug.* API                              │
│  └── bitty-observability-ipc                             │
│       └── 30+ IPC methods                                │
└─────────────────────────────────────────────────────────┘
```

---

## Migration Phases

### Phase 1: Add Trait Abstractions (Week 1)

**Objective:** Establish mechanism boundary without breaking anything

**Changes:**

- Create `bitty-runtime/src/observability.rs` (~200 lines)
- Implement `PluginStateInspector` for `PluginRuntime`
- Implement `EventTracer` for `PluginRuntime` (no-op default)
- Add unit tests

**Impact:**

- ✅ Zero breaking changes
- ✅ Only additions (no deletions/modifications)
- ✅ Zero runtime overhead
- ✅ All existing tests pass

**Verification:**

```bash
cargo check --workspace
cargo test --workspace
cargo clippy --workspace -- -D warnings
```

### Phase 2: Feature Flags (Week 2-3)

**Objective:** Make debug code optional via feature flags

**Changes:**

```toml
# crates/bitty-lua/Cargo.toml
[features]
default = []
debug = []

# crates/bitty-runtime/Cargo.toml
[features]
default = []
debug = ["bitty-lua/debug"]
```

**Conditional compilation:**

```rust
#[cfg(feature = "debug")]
pub mod debug;

#[cfg(feature = "debug")]
impl EventTracer for PluginRuntime {
    fn record_event(&mut self, kind: &str, payload: &serde_json::Value) {
        self.trace_hub.borrow_mut().record(kind, payload);
    }
}

#[cfg(not(feature = "debug"))]
impl EventTracer for PluginRuntime {
    fn record_event(&mut self, _kind: &str, _payload: &serde_json::Value) {
        // No-op
    }
}
```

**Impact:**

- ✅ Default builds exclude debug code
- ✅ Opt-in via `--features debug`
- ✅ Existing functionality preserved when enabled

### Phase 3: Extract to Independent Repository (1-2 months)

**Objective:** Create `bitty-observability` repository, remove from Core

**New Repository Structure:**

```text
bitty-observability/
├── crates/
│   ├── bitty-observability-api/       (~100 lines)
│   │   └── Request/response types
│   ├── bitty-observability-core/      (~2200 lines)
│   │   ├── DebugView
│   │   ├── TraceHub
│   │   └── Redaction
│   ├── bitty-observability-lua/       (~600 lines)
│   │   └── bitty.debug.* API
│   └── bitty-observability-ipc/       (~2100+ lines)
│       └── 30+ IPC methods
└── README.md
```

**Removed from Core:**

| File                          | Lines      | Action            |
| ----------------------------- | ---------- | ----------------- |
| `plugin_runtime/debug.rs`     | 1164       | Delete            |
| `plugin_runtime/redaction.rs` | 238        | Delete            |
| `bitty-ipc/devtools.rs`       | 2000+      | Delete            |
| `plugin_runtime/services.rs`  | ~400       | Remove debug impl |
| `plugin_runtime/mod.rs`       | ~200       | Remove wrappers   |
| `tests/plugin_debug.rs`       | ~500       | Delete            |
| `bitty-lua/host.rs`           | ~150       | Remove debug API  |
| Other                         | ~200       | Remove routing    |
| **Total removed**             | **~4852+** |                   |

**Retained in Core:**

- `bitty-runtime/src/observability.rs` (~200 lines traits)

**Net Change:** -4652 lines (-96%)

---

## Installation Model

### Default Installation (No Observability)

```bash
$ bitty --version
bitty 0.1.0

$ du -h $(which bitty)
12M     /usr/local/bin/bitty    # Down from 15M
```

**Security:** Zero debug surface by default

### With DevTools Plugin

```bash
$ bitty plugin install devtools

> Downloading bitty-observability component... ✓
> Verifying integrity (SHA-256)... ✓
> Component installed to ~/.local/share/bitty/components/observability/

$ bitty plugin enable devtools
```

**Component reuse:** Other plugins requiring observability share the same component

---

## Security Considerations

### Attack Surface Reduction

**Before:**

- Debug APIs always present (even if unused)
- IPC methods always exposed
- Trace buffers always allocated

**After:**

- No debug surface in default installation
- Component only installed when explicitly requested
- Capability-gated access even when present

### Component Verification

Following `bitty-network` pattern:

1. Download independent binary component
2. Verify SHA-256 digest against signed manifest
3. Refuse to execute if verification fails
4. Component stored in `~/.local/share/bitty/components/`

### Capability Enforcement

Unchanged from current:

- `debug.inspect` - Read plugin state
- `debug.trace` - Enable event tracing
- `debug.control` - Lifecycle control (high-risk)

---

## Compatibility

### API Stability

**Phase 1-2:** Fully backward compatible

- All existing code continues to work
- Feature flag only affects binary size/build

**Phase 3:** Breaking change (major version bump)

- Plugins using `bitty.debug.*` must declare dependency on observability component
- Manifest update required:

  ```toml
  [requires.components]
  observability = ">=0.1.0,<1.0"
  ```

### Migration Timeline

```text
v0.x.x: Phase 1 (traits added)
  ↓
v0.y.x: Phase 2 (feature flags)
  ↓
v1.0.0: Phase 3 (extraction complete)
```

---

## Testing Strategy

### Phase 1

- Unit tests for trait object safety
- Integration tests for empty runtime edge cases
- Verify all existing tests pass unchanged

### Phase 2

- Test with `--features debug` (current behavior)
- Test without features (no-op stubs)
- Verify binary size reduction

### Phase 3

- Component installation/verification tests
- Cross-component integration tests
- Backward compatibility matrix

---

## Success Metrics

### Binary Size

- **Target:** 20% reduction in default installation
- **Measurement:** `du -h $(which bitty)`

### Compilation Time

- **Target:** 10% faster clean builds (fewer dependencies)
- **Measurement:** `cargo build --release --timings`

### Security

- **Target:** Zero debug surface in default installation
- **Measurement:** `grep -r "debug.rs\|trace_hub" target/release/`

### Maintainability

- **Target:** Independent versioning and updates
- **Measurement:** Can update observability without Core rebuild

---

## Risks and Mitigations

### Risk: Breaking Existing Workflows

**Mitigation:**

- Phase 1-2 fully backward compatible
- Phase 3 only affects explicit debug users
- Clear migration guide and automated component installation

### Risk: Increased Complexity

**Mitigation:**

- Pattern already proven by `bitty-network`
- Trait abstraction is simple and well-documented
- Component boundaries are clean

### Risk: Performance Regression

**Mitigation:**

- Traits are zero-cost abstractions
- No-op implementation when observability absent
- Benchmark suite validates no overhead

---

## Dependencies

### Blocked By

- bitty-ipc refactoring (higher priority)
- Must complete before Phase 3

### Blocks

- None (independent effort)

---

## Open Questions

1. **Component distribution:** Use existing plugin registry or separate channel?
   - **Proposed:** Separate `components/` registry for shared dependencies
2. **Versioning:** Independent version or tied to Core version?
   - **Proposed:** Independent semver, with compat ranges in manifests
3. **Documentation split:** Keep in `bitty-terminal-docs` or move to new repo?
   - **Proposed:** High-level architecture here, implementation details in component repo

---

## References

- [DevTools RFC](../specifications/devtools-rfc.md) - Accepted debug protocol
- [bitty-network Candidate](../specifications/bitty-network-candidate.md) - Component pattern
- [Core Boundaries](core-boundaries.md) - Mechanism vs policy separation and the decided extraction boundaries
- [`W-71` observability boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/observability-boundary.md), [ADR 0015](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md), and the [small-core refactor execution handoff](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/handoff/2026-10-02-small-core-refactor.md)

---

## Changelog

- **2024-10-02:** Initial draft (Phase 1 planning)
- **2026-10-03:** Added the status-and-authority note linking the decided
  `W-71`/ADR 0015 boundary; no migration claim changed.
