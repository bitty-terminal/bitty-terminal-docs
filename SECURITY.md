# Security Policy

## Supported Versions

Pre-alpha releases exist (latest `v0.0.20`), but no release is stable,
`Verified`, `Compatible`, or supported. Normative requirements in this policy
are `Accepted` contract, not shipped product behavior.

| Version   | Supported |
| --------- | --------- |
| Pre-alpha | No        |

Once a supported release exists, this table will list each supported version
range and its support status.

## Implementation status

Normative requirements here are `Accepted` contract. No stable, supported, or
`Verified` release is claimed. Where experimental code exists in the `bitty`
workspace, it is at most
`Implemented-only`, never `Verified`, per the [Panel Runtime
RFC](specifications/panel-runtime-rfc.md#implementation-status)
implementation-status table and the [Risk Evidence
RFC](specifications/risk-evidence-rfc.md) evidence lifecycle.

## Extraction boundaries and P0 controls

The small-core extraction boundaries are decided as direction, and every
focused contract preserves the P0 trust boundaries that the canonical
[bitty-docs security corpus](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
governs. Decision records:
[ADR 0015](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md)
and
[ADR 0016](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md).

The focused contracts that define this platform's trust surface, and that must
not weaken a P0 control, are (the `W-71` observability contract is still a
draft; the rest are accepted):

- [Observability Boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/observability-boundary.md)
  (`W-71`, draft): read-only observation, default-deny authorization, redaction,
  and bounded buffers stay in Core.
- [Package Manager and Runtime Loader Boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/package-manager-boundary.md)
  (`W-72`): `P0-AC-027` through `P0-AC-030` and Core's read-only startup
  validation are preserved; Core stays network-free.
- [Composer Boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/composer-boundary.md)
  (`W-73`): input capture, paste inspection, and `argv`-first process and
  temp-file controls stay Core-gated.
- [Legacy Chrome Retirement](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/legacy-chrome-retirement.md)
  (`W-74`) and
  [ADR 0017](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0017-tabs-alias-shell-integration-retirement.md):
  retirement preserves the capability, grant, and safe-mode enforcement points.
- [Validation Suite Ownership](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/validation-suite-ownership.md)
  (`W-75`): validation tooling gains no product authority; `P0-AC-002` and
  `P0-AC-034` remain gating.

Reconciling these pages changes no control; where a control or threshold appears
to need change it is recorded as an open point in the owning contract, never
downgraded here. The dependency order and the retained-mechanism summary are in
the
[small-core refactor execution handoff](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/handoff/2026-10-02-small-core-refactor.md).

## Reporting a Vulnerability

To report a security vulnerability, open a private
[GitHub Security Advisory](https://github.com/bitty-terminal/bitty-terminal-docs/security/advisories/new).

Do not report security vulnerabilities via public GitHub issues, pull
requests, discussions, or chat channels.

When reporting, include as much of the following as applicable:

- A description of the suspected vulnerability and its impact.
- The affected document, specification section, or (once they exist) component
  and version.
- Steps or inputs needed to reproduce the issue.
- Any suggested mitigation, if you have one.

## Disclosure Policy

- Reports are handled privately from intake through fix, coordination, and
  disclosure. Details are not discussed publicly while a fix or mitigation is
  being prepared.
- Reporters will receive an acknowledgment and a tracking reference, and will
  be kept informed of assessment outcomes and resolution timelines.
- Coordinated disclosure is the default: a public advisory accompanies or
  follows the release of a fix. Credit for reporters is given by default and
  may be declined on request.
- Security requirements for future Bitty implementations live in the canonical
  security corpus under `bitty-docs` `docs/security/`; that corpus takes
  precedence over historical notes when statements conflict.

## Response Expectations

These targets are process commitments for this documentation repository, not
claims about shipped product behavior:

- Acknowledgment of a new report: within 5 business days.
- Initial severity and impact assessment: within 10 business days of
  acknowledgment.
- Fix or mitigation guidance for confirmed issues: targeted within 90 days,
  sooner for high-severity findings; complex issues receive a communicated
  timeline instead of silence.
