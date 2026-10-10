# Architecture and scope

OpenMaaS is a Next.js/OpenNext Web frontend and Hono Cloudflare Worker API with D1/R2. Public activities/feed searches, signed-in personal plans/transactions, staff ticket validation, admin configuration, scheduled imports/recovery and signed provider notifications are the maintained entry surfaces. OIDC identities are server-derived; owner predicates scope private records. Provider and operator configuration are separate trust boundaries. Raw card input is forwarded only to the provider; OAuth/recovery tokens use AES-GCM.

Source companions: authentication/HTTP, client-side, resource exhaustion, data isolation, cloud deployment and supply chain. No native/LLM/desktop subsystem is active. Legacy NestJS/Docker runtime is out of scope except installed workspace dependency context. No prior compatible security ledger existed.

Review is source-only. Independent agents examined auth/data/renderer, transactions/upstream, deployment/CI and UI diff. Full target execution sandbox controls were not established (read-only target/toolchain, empty allowlist environment, external-network denial, bounded process/disk namespaces). Normal implementation tests and Chrome UI checks are separate engineering evidence, not formal security reproduction. This run is incomplete for dynamic/deployed security assurance, while source review and remediation are complete.
