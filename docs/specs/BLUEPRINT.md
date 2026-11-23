# BLUEPRINT — ZeroP7M Product Specification

## 1. Vision & Problem Statement
In Italy, digitally signed documents (CAdES-BES / CAdES-T) are wrapped in `.p7m` cryptographic envelopes (CMS / RFC 5652). Citizens, lawyers, accountants, SMEs, and public-sector workers routinely receive `.p7m` files via PEC, email, or WhatsApp and only need to **open, read, print, or extract** the underlying document. Existing options are either bloated desktop signing suites (DiKe, Aruba Sign, InfoCert GoSign) or freemium web tools (such as `p7m.io`) that paywall multi-page PDF viewing and file downloads.

**ZeroP7M** is an **open-source (MIT/Apache-2.0), zero-cost, 100% client-side/offline** `.p7m` reader built from a single Rust + React codebase, delivering instant WebApp/PWA access alongside free standalone builds for Windows and Android (and source-ready iOS builds).

## 2. Target Personas
* **Occasional Citizen / Recipient:** Receives a PEC attachment (`.pdf.p7m` or `.xml.p7m`) on PC or phone; wants to read and print it in < 2 seconds without creating an account or uploading private documents to third-party servers.
* **Professional / PA Operator:** Opens dozens of signed decrees, contracts, notarized deeds (up to 100+ MB), and FatturaPA invoices daily; wants double-click `.p7m` association on Windows or "Open with" on Android.

## 3. MVP Scope (v1.0)
### Included
1. **Universal P7M Unwrapping (Italian Real-World Edge Cases):**
   - Standard ASN.1 DER binary `.p7m`.
   - ASN.1 BER with indefinite-length (`0x80 ... 0x00 0x00`) and constructed/fragmented `OCTET STRING` payloads.
   - Base64 / PEM-encoded `.p7m` files (`-----BEGIN PKCS7-----` or raw Base64 with whitespace/BOM).
   - Multi-signature (*co-signed*) envelopes and recursively nested envelopes (`.pdf.p7m.p7m.p7m`).
   - Explicit graceful handling of *detached* signatures (no embedded payload).
2. **Built-In Document Viewers (Zero-Upload, Offline):**
   - **PDF Viewer:** Full multi-page rendering (all pages unlocked), zoom, text selection/search, print, and direct download of original PDF.
   - **FatturaPA XML Viewer (`.xml.p7m`):** Automatic detection of Italian electronic invoices (`FatturaElettronica` FPR12/FPA12) and formatted human-readable rendering via locally bundled official XSLT stylesheet (`FoglioStileAssoSoftware.xsl` / AdE), toggleable with raw XML view and print/save-as-PDF.
   - **Images & Plain Text:** Native preview for PNG, JPEG, WebP, GIF, TIFF (where browser-supported), TXT, CSV.
   - **Universal Fallback:** Magic-byte MIME detection and one-click extraction/download for DOCX, XLSX, ZIP, and arbitrary payloads.
3. **Local Signature Inspection & Integrity Check (Offline Best-Effort):**
   - Display all signature layers and signers: Common Name, Given Name/Surname, **Italian Fiscal Code** (`TINIT-...` parsed from X.509 `serialNumber`), Issuer CA, validity period, declared `signingTime`, and qualified RFC 3161 timestamp (`timestampIso`) if present.
   - Cryptographic local integrity verification: recompute payload digest (SHA-256/384/512 and legacy SHA-1) against signed `messageDigest` and verify mathematical signature consistency against the embedded X.509 public key.
   - Clear legal UX separation: distinguish **Local Document Integrity** from **Online Revocation / eIDAS Qualified Status** (not checked offline).
4. **Zero-Cost Multi-Platform Distribution:**
   - **WebApp + Offline PWA:** Free static hosting (GitHub Pages / Cloudflare Pages). Primary zero-friction channel on Desktop and **iOS Safari** (Add to Home Screen standalone mode).
   - **Windows Standalone:** Per-user NSIS `.exe` installer (no admin required, registers `.p7m` file association) + Portable `.exe` on GitHub Releases.
   - **Android Standalone:** Self-signed open-source `.apk` on GitHub Releases (+ Obtainium & F-Droid metadata) registering Android `intent-filter` for `.p7m` from Gmail, WhatsApp, PEC apps, and Files.
   - **iOS Build-Ready:** Tauri v2 iOS target configured with UTI declarations and `--no-sign` build workflow for local/AltStore compilation (no 99 USD/yr Apple Developer account required in v1).

### Explicitly Out of Scope (Non-Goals v1.0)
* Applying digital signatures (smart cards, USB tokens, remote OTP signing).
* Online eIDAS legal validation (OCSP, CRL, EUTL/AgID network lookups).
* User accounts, cloud document storage, backend APIs, or analytics/telemetry.
* Paid app store distribution (Apple App Store, Google Play Store) or paid Windows EV/OV Code Signing certificates.

## 4. Core User Stories & Acceptance Criteria
| ID | Story | Acceptance Criteria |
| :--- | :--- | :--- |
| US-01 | As a user, I drag a `.pdf.p7m` onto the WebApp and read every page immediately. | Unwrap + first page render < 2s for typical 5 MB PDF; all pages accessible; zero network requests in DevTools. |
| US-02 | As a user, I open a FatturaPA `.xml.p7m` and read it like a human invoice. | App detects `FatturaElettronica`, renders formatted XSLT view in sandboxed iframe, allows printing and switching to raw XML. |
| US-03 | As a user, I open a nested `.pdf.p7m.p7m` or BER/Base64 file from PA. | Core recursively unwraps all layers, renders final PDF, and lists signers grouped by layer depth. |
| US-04 | As a user, I download the extracted document without losing legal awareness. | Download saves clean filename (stripping `.p7m` suffixes) and shows a clear non-blocking note to preserve the `.p7m` for legal validity. |
| US-05 | As a Windows/Android user, I open a `.p7m` directly from File Explorer / Gmail / WhatsApp. | OS launches ZeroP7M with file path or `content://` URI; document opens directly without manual picker. |
| US-06 | As an iOS or offline user, I open `.p7m` files without internet connectivity. | PWA Service Worker serves full app, WASM binary, PDF.js worker, and XSLT stylesheet offline. |
