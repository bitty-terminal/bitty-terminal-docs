---
title: Troubleshooting
description: Verified diagnosis recovery and escalation guidance for supported Bitty behavior
category: troubleshooting
audience: user
document_type: index
status: accepted
website_publish: true
sidebar_order: 10
---

# Troubleshooting

No product troubleshooting procedure is `Verified` or `Compatible`: the corpus
describes experimental and implemented-only behavior for the 0.0.28
development line, and the pre-alpha release is `v0.0.27`. Planned diagnostic,
safe-mode, log, and recovery ideas must not be presented as commands users can
run.

## Pages

| Page                                                        | Use when                                                                                                                   |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [Crash and exit diagnostics](crash-and-exit-diagnostics.md) | Bitty disappears, closes without an explanation, or leaves an unresponsive window; you need crash, exit, or stall evidence |

## Admission criteria

A page starts from an observable symptom, lists supported versions/platforms,
safe diagnostic evidence, likely causes, bounded remediation, recovery, and
escalation data. Commands and file locations must be verified and redact
sensitive information by default.

## Authority and status

Troubleshooting is task guidance backed by current behavior. Reference defines
facts; security policy governs data and recovery; unresolved defects remain in
their Issue and CarryCtx task rather than being normalized as expected behavior.

## Naming and maintenance

Use a searchable symptom or component name such as `startup-failure.md`. Link
the affected release and fix, retest instructions after behavior changes, and
remove obsolete remedies through the documented deprecation process.
