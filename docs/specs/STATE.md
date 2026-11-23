# STATE — ZeroP7M / OpenCAdES Session Continuity Log

## Current Status
* **Phase:** Milestone 5 Complete -> **v1.0.0 Production Release Published (Rebranded to ZeroP7M)**
* **Active Milestone:** Milestone 5 — Final Security Hardening, Audit & Zero-Cost Release Pipeline (COMPLETED)
* **Active Task:** Rebranded from ApriP7M to **ZeroP7M** (powered by **OpenCAdES** engine). Repository restructured into a clean 6-commit linear history, release tag `v1.0.0` published.
* **Blockers:** None.

## Rebranding Execution (ZeroP7M & OpenCAdES)
* [x] **Deep Codebase Rebranding:** Renamed all packages (`@zerop7m/shared-types`, `@zerop7m/tauri`), crates (`zerop7m-tauri`), Android application ID (`io.github.giuppi.zerop7m`), protocol handler (`zerop7m://open-file`), release keystore alias (`zerop7m`), and specifications.
* [x] **Pristine Linear Git History:** Restructured the entire repository into 6 clean, atomic, conventional commits. Completely eliminated all superfluous commits and historical references to the old placeholder name.
* [x] **GitHub Repository:** Renamed remote repository from `giuppi/aprip7m` to `giuppi/zerop7m` via GitHub CLI; updated local remote origin to `https://github.com/giuppi/zerop7m.git` and adjusted documentation links and clones.
* [x] **Branding & Windows Icon:** Redesigned official 512x512 vector icon (`app-icon.svg`), generated multi-resolution Windows `.ico` (16, 24, 32, 48, 64, 128, 256), macOS `.icns`, and Android/iOS/PWA mipmaps via `tauri icon`.
* [x] **PDF Viewer Fixes:** Resolved continuous scroll page overlapping bug by adding `shrink-0`, `gap-6`, explicit container dimensions, and removing `transition-all`.
* [x] **FatturaPA Embedded Attachments:** Implemented XML `<Allegati>` parser conforming to Agenzia delle Entrate FatturaPA standard; added top banner and slide-over Attachments Drawer enabling 1-click extraction and download of embedded courtesy PDFs and attachments.
* [x] **Web / PWA:** Updated `apps/web/index.html` (title, meta tags), `apps/web/vite.config.ts` (manifest `ZeroP7M — OpenCAdES Offline Reader`), `EmptyDropZone.tsx` (`0P7` badge, `ZeroP7M`, `OpenCAdES • 100% Locale • Zero-Cloud`), and `SignatureDrawer.tsx` (`ZeroP7M • Motore OpenCAdES • 100% Offline`).
* [x] **Tauri Desktop & Mobile:** Updated `tauri.conf.json` (`productName: "ZeroP7M"`, window title: `ZeroP7M — OpenCAdES Reader`), `AndroidManifest.xml` (`android:label="ZeroP7M"` and `android:label="Apri con ZeroP7M"` on all intent filters).
* [x] **Scripts & Metadata:** Updated `scripts/inject_android_manifest.py` for `Apri con ZeroP7M`, fastlane store metadata in `it-IT` and `en-US` (`title.txt`, `short_description.txt`, `full_description.txt`).
* [x] **CI & Release Workflow:** Updated `.github/workflows/release.yml` artifact packaging names to `ZeroP7M-${VERSION}-x64-setup.exe`, `ZeroP7M-${VERSION}-x64-portable.exe`, `ZeroP7M-${VERSION}.apk`.
* [x] **Documentation:** Comprehensive bilingual `README.md` updated with `ZeroP7M` title, OpenCAdES engine, and updated build & installation instructions.

## Milestone 5 Completed Items
* [x] Dependency audit floors verified: `rustix = "1.1.6"` (`RUSTSEC-2026-0486`), `pdfjs-dist = "6.5.438"` (`CVE-2026-16633`), `isEvalSupported: false` in `pdf-config.ts`.
* [x] Supply chain audits clean: `cargo audit` (0 vulnerabilities across 502 dependencies), `pnpm audit --prod` (0 vulnerabilities).
* [x] Security invariants verified (`scripts/verify_audit.py`):
  - CSP `connect-src 'none'` verified in `apps/web/index.html` and `tauri.conf.json`.
  - FatturaPA iframe sandbox verified (`allow-same-origin allow-modals`, 0 `allow-scripts`) and HTML sanitization tests passing.
  - Zero external URLs/CDNs/fonts/analytics in production `apps/web/dist/` bundle.
  - Offline legal disclaimers active in download toast (`DOWNLOAD_LEGAL_REMINDER`) and `SignatureDrawer.tsx`.
* [x] Synthetic 50 MB `.pdf.p7m` performance benchmark & memory smoke (`scripts/benchmark_50mb.py`, `crates/p7m-core/examples/benchmark_native.rs`, `scripts/benchmark_50mb_wasm.mjs`):
  - Native Rust unwrap speed: **0.158s** (Threshold: < 1.500s -> **PASS**)
  - WASM unwrap speed: **1.814s** (Threshold: < 2.000s -> **PASS**)
  - Memory release after `dispose()` / reference drop + GC: **PASS**
* [x] Zero-Cost GitHub Actions release pipelines:
  - `.github/workflows/deploy-pages.yml`: Automated build of WASM + WebApp/PWA deployed to GitHub Pages on `main`.
  - `.github/workflows/release.yml`: Tagged `v*` release build for Windows (`windows-latest` NSIS setup + portable `.exe`), Android universal `.apk` with open-source keystore signing (`ubuntu-latest`), `SHA256SUMS.txt` generation, GitHub Artifact Attestations (`actions/attest-build-provenance@v2`), and GitHub Release publication.
* [x] Fastlane / F-Droid / Obtainium metadata: `fastlane/metadata/android/it-IT/` and `fastlane/metadata/android/en-US/` with title, short/full descriptions, and changelogs.
* [x] Root Documentation: Complete bilingual `README.md` (Italian + English) detailing privacy invariants, WebApp/PWA link, iOS Add-to-Home guide, Windows SmartScreen bypass & SHA-256 verification, Android APK / Obtainium setup, build from source instructions, and MIT/Apache-2.0 dual license.

## Verification Status
* `cargo audit`: PASS (0 vulnerabilities)
* `pnpm audit --prod`: PASS (0 vulnerabilities)
* `cargo fmt --all -- --check`: PASS (0 diffs)
* `cargo clippy --workspace --all-targets -- -D warnings`: PASS (0 warnings across `p7m-core`, `p7m-wasm`, `zerop7m-tauri`)
* `cargo test --workspace`: PASS (20 passed: 14 `italian_corpus`, 1 `export_bindings`, 5 `zerop7m-tauri`)
* `pnpm --filter web typecheck`: PASS (`tsc --noEmit` 0 errors)
* `pnpm --filter web test`: PASS (5 test files, 12 tests passed)
* `pnpm --filter web build`: PASS (Vite 8.3.8 + PWA 2.0.0, 187 precached assets)
* `python scripts/verify_audit.py`: PASS (All security invariants verified clean)
* `python scripts/benchmark_50mb.py`: PASS (Native 0.158s, WASM 1.814s, Memory released)

## Recent Fixes
* **Resolved 0-Byte PDF Export Bug:**
  - *Web/WASM:* In `p7m.worker.ts` and `web-wasm.adapter.ts`, cloned `payloadBuffer` with `.slice()` to prevent PDF.js Web Worker message transfer from detaching/neutering the main-thread ArrayBuffer; generated fresh Blobs on download in `saveExtractedCopy`.
  - *Mobile / Android:* In `tauriNativeAdapter.ts`, routed mobile exports through `shareExtractedCopy` (Web Share API with Blob fallback) rather than desktop `save()`, preventing Android SAF from leaving 0-byte file placeholders when POSIX `std::fs::write` cannot write to `content://` URIs.
  - *Backend & UI:* In `commands.rs`, added empty payload guard in `save_extracted_file`; made `handleDownload` async with error handling in `App.tsx`.
* **PDF Fit-to-Page, Single-Page View & Dynamic Paginator:** Added dynamic "Adatta alla pagina" scale calculation on load and on demand via toolbar button; added user-facing view mode switch (`Singola` vs `Accodate`); hid pagination controls completely when `numPages <= 1`; added keyboard navigation (ArrowLeft/ArrowRight, PageUp/PageDown).
* **Removed Redundant Print Buttons:** Removed duplicate print actions from both the app header toolbar (`HeaderBar.tsx`) and the PDF viewer sub-toolbar (`PdfViewer.tsx`), avoiding browser canvas print splitting and directing users to extract and open the authentic original PDF copy.
* **Android Manifest Injection:** Implemented `scripts/inject_android_manifest.py` to inject `.p7m` intent filters into the generated Android manifest without clobbering native `@style/Theme.Tauri` or activity attributes, resolving AAPT resource error `style/Theme.App not found`.
* **PDF Multi-page Navigation:** Decoupled `setCurrentPage` from `IntersectionObserver` lazy rendering, added container `onScroll` viewport tracking, instant page state update on `scrollToPage`, and individual page number badges on cards.
* **Stable APK Keystore:** Committed permanent PKCS12 release keystore in `keystore/release.keystore` with fixed SHA-256 fingerprint, ensuring APK signature continuity across all builds and seamless in-place updates.
* **Android File Picker & Associations:** Expanded file input `accept` to prevent Android SAF disabling files, expanded `AndroidManifest.xml` intent-filters, and injected during CI.
* **Android In-Memory PDF Loading:** Native IPC command `get_session_bytes` eliminating `fetch()` failures under `connect-src 'none'`.

## Final Audit Verdict
* **VERDICT:** APPROVED FOR v1.0.0 PRODUCTION RELEASE
* **SECURITY POSTURE:** 100% Client-Side / Offline (`connect-src 'none'`), Safe Rust `#![forbid(unsafe_code)]`, Hardened PDF.js & XSLT Sandbox.
* **NEXT:** Tag v1.0.0 updated and pushed to trigger refreshed release build on GitHub Actions.

## Session Close Handoff
- Completed: Deep rebranding (@zerop7m, zerop7m-tauri, io.github.giuppi.zerop7m, zerop7m://, keystore alias), restructured git into 6 pristine linear conventional commits, force-pushed clean main and v1.0.0 tag to giuppi/zerop7m, purged legacy workflow runs.
- Verified: `pnpm check:ci` (tsc + 16 Vitest tests + 20 cargo tests + android aarch64 + verify_audit.py: PASS), `cargo fmt --check` (PASS), `cargo clippy -- -D warnings` (PASS), `scan_secrets_pii.py` (0 findings).
- Next: Monitor GitHub Actions run 45171331569 and verify release assets on GitHub Releases.
