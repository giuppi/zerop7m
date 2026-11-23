# Workflow: `/audit-release`

Mandatory gate before tagging any release (`v*`) or completing Milestone 5.

## Steps
1. Read `docs/specs/SECURITY.md` and `docs/specs/TESTING.md`.
2. Run full automated audit suite:
   ```bash
   cargo audit
   cargo test --workspace
   pnpm audit --prod
   pnpm --filter web typecheck
   pnpm --filter web test
   pnpm --filter web build
   ```
3. Verify Security Invariants manually in diff/config:
   - [ ] `rustix >= 1.1.6` in `Cargo.lock` (`RUSTSEC-2026-0486`).
   - [ ] `pdfjs-dist >= 6.5.438` in `pnpm-lock.yaml` (`CVE-2026-16633`) and `isEvalSupported: false`.
   - [ ] CSP enforces `connect-src 'none'` on both WebApp (`index.html` / headers) and `apps/tauri/src-tauri/tauri.conf.json`.
   - [ ] FatturaPA iframe uses `sandbox="allow-same-origin allow-modals"` (NO `allow-scripts`) + HTML sanitizer active.
   - [ ] Zero external CDN/font/XSLT URLs in built `dist/` bundle.
   - [ ] Offline legal disclaimer present on download action ("solo lettura/stampa; conserva il .p7m originale").
4. Verify Release Artifacts & Checksums:
   - [ ] WebApp/PWA works 100% offline in browser DevTools.
   - [ ] Windows NSIS installer + Portable `.exe` generated with `SHA256SUMS.txt`.
   - [ ] Android `.apk` signed with project open-source keystore + `intent-filter` verified.
5. Record audit verdict and tag readiness in `docs/specs/STATE.md`.
