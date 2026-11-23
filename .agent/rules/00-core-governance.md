# Rule 00: Core Governance & Skill Adaptation (ZeroP7M)

**Scope:** Always active across the entire repository.

## 1. Single Source of Truth Hierarchy
1. `docs/specs/CONTRACTS.md` governs all cross-language boundaries (`crates/p7m-core` <-> `packages/shared-types` <-> `apps/web` <-> `apps/tauri`).
2. `docs/specs/SECURITY.md` overrides convenience or UX shortcuts whenever a conflict arises.
3. `docs/specs/STATE.md` is the live ledger of progress and must never be deleted or overwritten by scaffolding.

## 2. Mandatory Skill Adaptation Protocols
* **Ponytail Protocol (Lazy Senior Dev Mode):**
  "You are a lazy senior developer. The best code is the code never written. You solve the whole problem with the least new code."
  - Do not hand-roll ASN.1 parsers when `rasn-cms` handles BER/CER/DER.
  - Do not build custom PDF renderers when `pdfjs-dist` exists.
  - Do not invent custom state frameworks; React 19 state + a thin `EngineAdapter` interface is sufficient.
* **Superpowers Protocol (Spec-First TDD):**
  - Before editing `src/`, state a 3–5 bullet micro-plan referencing the exact spec section.
  - Write a failing unit/integration test (Red), write minimal code to pass (Green), then clean up (Refactor).
  - No milestone item is marked complete without green tests and zero compiler/clippy/tsc warnings.
* **Caveman Protocol (Token Efficiency):**
  - Status reports, commit messages, and `STATE.md` entries must be concise, factual, and free of filler.
* **Impeccable Protocol (UI Craft):**
  - Every UI component must trace back to `docs/specs/DESIGN.md`.
  - Document viewport occupies >= 80% of screen area; signature inspector stays unobtrusive until opened.
* **Security-Audit Protocol (Defense-in-Depth):**
  - Treat every `.p7m`, extracted PDF, and extracted XML as hostile untrusted input.
  - Enforce `connect-src 'none'` CSP, iframe sandbox without `allow-scripts`, and verified dependency floors (`pdfjs-dist >= 6.5.438`, `rustix >= 1.1.6`).

## 3. Dependency & Version Discipline
* Never downgrade pinned security floors.
* Keep `rasn`, `rasn-cms`, and `rasn-pkix` on the same compatible minor version (`0.30.x` or `0.29.x` as verified via `cargo update --dry-run`).
* Never add paid SaaS dependencies, analytics SDKs, or external CDN links (all fonts, PDF.js workers, and XSLT stylesheets must be bundled locally for 100% offline execution).
