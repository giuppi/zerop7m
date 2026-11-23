# SECURITY — Threat Model, Sandboxing & Audit Gates

## 1. Threat Model (Untrusted Input Assumptions)
Every `.p7m` file opened by ZeroP7M MUST be treated as potentially malicious (e.g., phishing PEC attachment):
1. **ASN.1 Parser Attacks:** Deeply nested `.p7m` bombs, malformed BER indefinite-length streams, integer overflows, or crafted huge allocations causing OOM/crash.
2. **XSS / Script Injection via FatturaPA XML:** Attacker embeds `<script>`, `onerror=`, or malicious XSL-injected HTML inside an `.xml.p7m` invoice.
3. **PDF Renderer Exploits:** Malicious JavaScript embedded inside PDF actions or font/stream parser vulnerabilities (e.g. `CVE-2026-16633` in older `pdfjs-dist`).
4. **Data Exfiltration:** Accidental outbound requests leaking private legal/tax documents or metadata to external servers/CDNs.
5. **Supply Chain & Transitive Vulnerabilities:** Compromised crates/packages or unpatched CVEs (e.g. `RUSTSEC-2026-0486` in `rustix < 1.1.6`).

## 2. Mandatory Preventive Controls
| Control | Enforcement Point | Verification |
| :--- | :--- | :--- |
| **Zero Network Egress** | CSP header & `tauri.conf.json`: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: p7m:; connect-src 'none'; object-src 'none'; frame-src 'self' blob:;` | DevTools Network tab shows 0 outbound requests when opening PDF/XML/nested `.p7m`. |
| **Memory & Recursion Caps** | `crates/p7m-core`: `MAX_NESTING_DEPTH = 10`, `MAX_INPUT_BYTES = 250 MiB (Web) / 500 MiB (Native)`, safe Rust (`#![forbid(unsafe_code)]` in `p7m-core`). | Unit tests reject depth 11 and oversized inputs cleanly with `P7MError`. |
| **FatturaPA XSLT Sandbox** | Sanitize XSLT HTML output (remove `<script>`, `<object>`, `<embed>`, `<iframe>`, `on*` attrs, `javascript:` URLs) AND render inside `<iframe sandbox="allow-same-origin allow-modals" srcDoc={safeHtml}>`. NEVER include `allow-scripts`. | Unit test with malicious `<Descrizione><script>alert(1)</script><img src=x onerror=alert(2)></Descrizione>` confirms zero script execution. |
| **Hardened PDF.js** | Pin `pdfjs-dist >= 6.5.438` and pass `isEvalSupported: false` to `getDocument()`. Disable embedded PDF JS execution. | Lockfile check + unit test asserting `isEvalSupported: false`. |
| **Dependency Floors** | Pin `rustix >= 1.1.6` in `Cargo.lock`; run `cargo audit` and `pnpm audit --prod` in CI on every PR and release. | CI job fails on any high/critical advisory. |
| **Tauri Capability Minimization** | Tauri v2 ACL capabilities grant ONLY dialog save + scoped file read (via user-chosen path / OS intent). No shell execution, no HTTP plugin, no arbitrary filesystem write. | Review `apps/tauri/src-tauri/capabilities/default.json`. |
| **Zero-Cost Release Integrity** | Since v1.0 has no paid EV Code Signing cert, GitHub Actions builds all `.exe` and `.apk` artifacts cleanly from tagged commits and publishes `SHA256SUMS.txt` + GitHub Artifact Attestations. | Release workflow checks presence of `SHA256SUMS.txt`. |

## 3. Legal Liability Guardrail
* The UI MUST NEVER display a green "Firma Legalmente Valida" or "eIDAS Qualified" badge in v1.0 offline mode.
* Always distinguish: **"Integrità documento verificata (locale)"** + **"Stato revoca certificato non verificato (offline)"**.
