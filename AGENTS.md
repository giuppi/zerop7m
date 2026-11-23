# AGENTS.md — ZeroP7M Global Context Router

**Project:** ZeroP7M — Open-Source, Zero-Cost, 100% Client-Side/Offline `.p7m` Reader powered by OpenCAdES (WebApp/PWA + Windows + Android + iOS-ready via Rust/WASM + Tauri v2).
**License:** Dual-licensed MIT / Apache-2.0.
**Invariants:** Zero server uploads, zero telemetry, zero outbound network calls (`connect-src 'none'`), zero paid infrastructure.

## 1. Mandatory Session Protocol
1. **Start of Session:** Read `docs/specs/STATE.md` first to recover active milestone, task, and blockers.
2. **Scoped Reading Only:** Never load all specs indiscriminately. Use the Trigger Table below to load only the files relevant to your task.
3. **Contract-First Gate:** Freeze and update `docs/specs/CONTRACTS.md` (and `crates/p7m-core` Rust structs + `ts-rs` exports) BEFORE modifying cross-boundary code.
4. **End of Session:** Update `docs/specs/STATE.md` with ultra-dense handoff notes (completed items, test output, exact next action).

## 2. Spec Trigger Table (Read Before Touching Domain)
| Task / Domain | Mandatory Spec(s) to Read |
| :--- | :--- |
| Product scope, MVP boundary, user flows | `docs/specs/BLUEPRINT.md` |
| Monorepo layout, ADRs, WASM/Tauri bridge | `docs/specs/ARCHITECTURE.md` |
| Rust<->TS types, IPC commands, `p7m://`, errors | `docs/specs/CONTRACTS.md` |
| Ephemeral session store, memory eviction, PWA cache | `docs/specs/DATABASE.md` |
| `p7m-core` (ASN.1 BER/DER, X.509, crypto), `p7m-wasm`, Tauri Rust | `docs/specs/BACKEND.md` |
| React 19 UI, Web Worker, PDF.js, FatturaPA XSLT, PWA | `docs/specs/FRONTEND.md` |
| Visual tokens, layout, Italian UI microcopy, anti-slop | `docs/specs/DESIGN.md` |
| CSP, XSLT sandbox, CVE/RUSTSEC pinning, privacy | `docs/specs/SECURITY.md` |
| TDD workflow, P7M fixture suite, Vitest, Cargo tests | `docs/specs/TESTING.md` |
| Naming, linters, strict TS 7, Rust clippy/fmt | `docs/specs/CODE_STYLE.md` |
| Current milestone, active task, handoff log | `docs/specs/STATE.md` |

## 3. External Skill Adaptation Protocol
* **Ponytail (Lazy Senior Dev):** *"The best code is the code never written."* Solve the whole problem with the least new code; prefer native browser/OS/crate primitives (`rasn-cms`, `XSLTProcessor`, `infer`, Tauri `fileAssociations`) over custom abstractions.
* **Superpowers (Spec-First TDD):** Never write production code without an approved micro-plan and a failing test first (Red -> Green -> Refactor).
* **Caveman (High-Density Output):** Keep status logs, commit messages, and `STATE.md` updates ultra-dense with zero conversational fluff.
* **Impeccable (UI Craft):** Follow `docs/specs/DESIGN.md` strictly; zero generic AI UI templates or decorative clutter.
* **Security-Audit (Defense-in-Depth):** Validate every milestone against `docs/specs/SECURITY.md` (untrusted `.p7m`, PDF, XML/XSLT, CSP, `cargo audit`, `npm audit`).

## 4. Authoritative Commands
```bash
# Workspace install & bindings
pnpm install
cargo test -p p7m-core export_bindings

# Rust Core & WASM
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
wasm-pack build crates/p7m-wasm --target web --release

# WebApp / PWA
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
pnpm --filter web build

# Tauri v2 Standalone (Windows / Android / iOS)
pnpm --filter tauri tauri build
pnpm --filter tauri tauri android build --apk
pnpm --filter tauri tauri ios build --no-sign

# Security Audits
cargo audit
pnpm audit --prod
```

## 5. Non-Negotiable Safety Gates
* Never claim legal/eIDAS qualified revocation validity offline; always show explicit local integrity vs offline revocation status.
* Never render FatturaPA XSLT output with scripts enabled (`<iframe sandbox="allow-same-origin allow-modals">`, never `allow-scripts`).
* Never pass raw multi-MB file payloads through JSON Tauri IPC; use `p7m://localhost/session/<uuid>` in Tauri and `Transferable` `ArrayBuffer` in Web Workers.
* Keep `rustix >= 1.1.6` (`RUSTSEC-2026-0486`) and `pdfjs-dist >= 6.5.438` (`CVE-2026-16633`, `isEvalSupported: false`).
