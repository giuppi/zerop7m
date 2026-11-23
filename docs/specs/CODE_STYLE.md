# CODE_STYLE — Conventions, Type Safety & Linting Invariants

## 1. Rust (`crates/p7m-core`, `crates/p7m-wasm`, `apps/tauri/src-tauri`)
* **Edition:** Rust 2024 (or latest stable MSRV documented in `Cargo.toml`).
* **Safety:** `#![forbid(unsafe_code)]` at crate root of `crates/p7m-core`.
* **No Panics on Input:** Never use `.unwrap()` or `.expect()` on untrusted `.p7m` bytes, ASN.1 fields, or UTF-8 conversions. Always propagate typed `P7MError`.
* **Formatting & Linting:**
  - `cargo fmt --all -- --check`
  - `cargo clippy --workspace --all-targets -- -D warnings`
* **Naming:** `snake_case` modules/functions, `PascalCase` structs/enums; serde attributes `#[serde(rename_all = "camelCase")]` so generated TypeScript matches JS conventions cleanly.

## 2. TypeScript & React (`apps/web`, `packages/shared-types`)
* **Compiler:** TypeScript `7.0.2` (`strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`).
* **Zero `any`:** Explicit `unknown` + Zod parsing at every external boundary (Worker messages, Tauri `invoke`, file inputs).
* **React 19:** Functional components only. Rely on React Compiler 1.0+ — avoid manual `useMemo`/`useCallback` clutter unless profiling proves a specific boundary requirement.
* **Styling:** Tailwind CSS `4.3.5` utility classes referencing semantic design tokens from `@theme` in `src/index.css`. Avoid arbitrary hex colors in TSX.
* **File Organization:**
  - Components: `PascalCase.tsx` (max ~200 lines; extract hooks/helpers if larger).
  - Hooks/Adapters/Utils: `camelCase.ts`.
  - Colocated unit tests: `*.test.ts` / `*.test.tsx`.

## 3. Contract Synchronization Gate
Whenever `crates/p7m-core/src/model.rs` changes:
```bash
cargo test -p p7m-core export_bindings
pnpm --filter web typecheck
```
CI rejects any PR where `packages/shared-types/src/generated.ts` is out of sync with Rust structs.

## 4. Git Commits (Caveman Style)
Use Conventional Commits, terse and factual:
* `feat(core): add BER indefinite-length unwrap and recursive layer tracking`
* `fix(web): sanitize XSLT event handlers before iframe srcDoc render`
* `chore(ci): add Windows NSIS and Android APK release workflow with SHA256SUMS`
