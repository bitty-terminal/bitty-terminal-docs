# Security Policy

## Supported Versions

No version of Bitty has been released yet. There are no supported releases.
Normative requirements in this policy are `Accepted` contract, not shipped
product behavior.

| Version           | Supported |
| ----------------- | --------- |
| (no releases yet) | No        |

Once releases exist, this table will list each supported version range and its
support status.

## Implementation status

Normative requirements here are `Accepted` contract. No shipped release is
claimed. Where experimental code exists in the `bitty` workspace, it is at most
`Implemented-only`, never `Verified`, per the [Panel Runtime
RFC](specifications/panel-runtime-rfc.md#implementation-status)
implementation-status table and the [Risk Evidence
RFC](specifications/risk-evidence-rfc.md) evidence lifecycle.

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
