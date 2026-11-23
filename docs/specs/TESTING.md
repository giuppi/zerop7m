# TESTING — TDD Strategy & Italian P7M Regression Suite

## 1. Superpowers TDD Protocol (Red -> Green -> Refactor)
Every feature or bugfix in `p7m-core`, `p7m-wasm`, `apps/web`, and `apps/tauri` follows:
1. Write a failing test targeting the exact contract/edge case.
2. Confirm the test fails for the right reason.
3. Implement minimal code to pass.
4. Refactor with zero warnings (`cargo clippy -D warnings`, `tsc --noEmit`).

## 2. Deterministic P7M Fixture Corpus (`fixtures/`)
Because real user `.p7m` files contain personal data, Milestone 1 MUST create a deterministic script (`fixtures/generate_fixtures.sh` / Python/OpenSSL script) that generates anonymized, repeatable test vectors committed or reproducible in CI:
1. `simple_pdf_der.pdf.p7m` — Standard DER CAdES-like CMS wrapping a 3-page PDF, SHA-256, signer CN + `serialNumber=TINIT-RSSMRA80A01H501U`.
2. `ber_indefinite.pdf.p7m` — BER indefinite-length (`0x80...0x0000`) with fragmented constructed `OCTET STRING` payload.
3. `pem_base64.pdf.p7m` — Same envelope encoded as PEM (`-----BEGIN PKCS7-----`) and raw Base64 with CRLF + UTF-8 BOM.
4. `nested_double.pdf.p7m.p7m` — Two-layer Russian-doll signed envelope with two distinct signers.
5. `cosigned_multi.pdf.p7m` — Single envelope containing 2 parallel `SignerInfo` entries.
6. `fatturapa_valid.xml.p7m` — Synthetic valid FatturaPA v1.2 (`FPR12`) signed in DER.
7. `fatturapa_xss_attack.xml.p7m` — FatturaPA XML containing `<script>alert(1)</script>` and `onerror=` payloads inside description fields.
8. `detached_only.p7m` — Valid CMS signature with absent `eContent`.
9. `tampered_digest.pdf.p7m` — 1-byte mutated payload inside valid ASN.1 structure (must still extract payload AND report `DIGEST_MISMATCH`).
10. `corrupt_truncated.p7m` & `not_a_p7m.txt` — Must fail gracefully with `INVALID_FORMAT` / `CORRUPT_PAYLOAD` (zero panics).

## 3. Coverage Matrix
| Layer | Tooling | Mandatory Test Cases |
| :--- | :--- | :--- |
| **Rust Core (`p7m-core`)** | `cargo test` | All 10 fixtures above, `MAX_NESTING_DEPTH` overflow, Fiscal Code regex/parser edge cases (`TINIT-`, `IDC:IT-`), `ts-rs` binding generation. |
| **WASM Bridge (`p7m-wasm`)** | `wasm-pack test --headless --firefox/--chrome` (or Node) | Round-trip binary input -> `P7MInspectionReport` + extracted payload bytes match Rust native byte-for-byte. |
| **Frontend Unit & Security** | `vitest 5.1.1` | `Zod` schema validation, `FatturaPA` XSLT sanitizer blocks `<script>` / `onerror`, `EngineAdapter` mock state machine, `dispose()` calls `revokeObjectURL`. |
| **Performance / Memory** | Manual + scripted benchmark | Opening a 50 MB synthetic `.pdf.p7m` on Web completes unwrap < 1.5s without blocking UI main thread; RAM drops after `dispose()`. |
| **Native Smoke (Milestone 4)** | Manual / CI build | Windows NSIS install + double-click `.p7m`; Android APK install + open `.p7m` from Files/Gmail `content://` URI. |

## 4. Mock Policy
* Unit tests in `apps/web` MAY mock `EngineAdapter` to test UI flows deterministically.
* Integration tests for `p7m-core` MUST NEVER mock `rasn-cms`, `sha2`, or ASN.1 decoding; always execute against real binary fixtures.
