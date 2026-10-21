---
title: Interfaces
description: Index of terminal-platform interface contracts for CLI rich content presentation and provider contracts
category: reference
audience: mixed
document_type: index
status: accepted
website_publish: true
sidebar_order: 10
---

# Interfaces

Index of the terminal-platform interface contracts. Normative detail lives
in the linked pages; this index carries no duplicate normative prose.

| Document                                                        | Status | Purpose                                                                        |
| --------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| [Command-line interface](cli.md)                                | Draft  | Extensible CLI, runtime control, output, and introspection contracts.          |
| [Provider contracts for bar modules](provider-contracts.md)     | Draft  | Core-owned sensor, platform, and audio provider interfaces with rate ceilings. |
| [Rich content and presentation interfaces](rich-content.md)     | Draft  | Terminal truth, rich blocks, semantic sources, and presentation composition.   |
| [Configuration dashboard](configuration-dashboard-candidate.md) | Draft  | Core configuration panel and the deferred `config.manage` write contract.      |

## Authority and status

All three pages are candidate contracts; experimental implementation exists, but
no stable or supported public contract is claimed. Accepted detail is recorded
in the [CLI Contract RFC](../specifications/cli-contract-rfc.md)
and the [Rich Presentation RFC](../specifications/rich-presentation-rfc.md);
these interface pages must not be read as stable, `Compatible`, or released
behavior.
