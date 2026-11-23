# GEMINI.md — Google Antigravity IDE/CLI Entry Router

This file mirrors and enforces `AGENTS.md` for Gemini agents running inside Google Antigravity IDE and Antigravity CLI.

## Boot Sequence (Execute Every Session)
1. Load `docs/specs/STATE.md` and `.agent/rules/00-core-governance.md`.
2. Identify the active milestone and task; load ONLY the matching `docs/specs/*.md` files from the routing table in `AGENTS.md`.
3. Check `docs/specs/CONTRACTS.md` before changing any Rust struct, WASM export, Tauri command, or TypeScript interface.

## Project Identity
* **Name:** ZeroP7M (Open-Source `.p7m` Viewer powered by OpenCAdES — MIT/Apache-2.0, 0 EUR budget)
* **Core Engine:** Rust (`rasn` + `rasn-cms` + `rasn-pkix`, `sha2`/`sha1`, `base64`, `infer`, `ts-rs`) compiled to both native library (Tauri v2 `2.12.6`) and WASM (`wasm-bindgen` + `serde-wasm-bindgen`).
* **Frontend:** React `19.3.1`, TypeScript `7.0.2`, Vite `8.3.8`, Tailwind CSS `4.3.5`, `pdfjs-dist` `6.5.438`, `zod` `4.6.7`, `vite-plugin-pwa` `2.0.0`, `vitest` `5.1.1`.
* **Targets:** WebApp/PWA (GitHub Pages / Cloudflare Pages, also serving iOS Safari standalone), Windows NSIS + Portable `.exe`, Android `.apk` (GitHub Releases / Obtainium / F-Droid), iOS `--no-sign` source build.

## Native Antigravity Skill Enforcement
* **Ponytail:** Minimize code volume. Leverage `rasn` BER/DER decoding, browser `XSLTProcessor`, `pdfjs-dist`, and Tauri 2.11+ `fileAssociations`.
* **Superpowers:** Spec-first TDD (`cargo test` / `vitest`). Write failing test on real/synthetic `.p7m` fixture first.
* **Caveman:** Dense technical prose, compact diffs, terse `STATE.md` updates.
* **Impeccable:** Follow `docs/specs/DESIGN.md` — clean document-first reader aesthetic, crisp Italian legal disclaimers, zero AI-slop cards/gradients.
* **Security-Audit:** Verify zero network egress, strict CSP, sandboxed XSLT, and clean `cargo audit` / `pnpm audit` before milestone sign-off.

## Workflows Available in `.agent/workflows/`
* `/plan-feature` -> `.agent/workflows/plan-feature.md`
* `/execute-task` -> `.agent/workflows/execute-task.md`
* `/audit-release` -> `.agent/workflows/audit-release.md`

## Session Close Requirement
Before ending any turn that modifies code or specs, update `docs/specs/STATE.md` with:
```text
- Completed: <atomic items>
- Verified: <exact command + pass/fail>
- Next: <single concrete next step>
```
