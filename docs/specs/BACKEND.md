# BACKEND — Rust Core Engine (`p7m-core`, `p7m-wasm`, `apps/tauri`)

## 1. Crate Decomposition
* **`crates/p7m-core`:** Pure Rust library containing zero UI, zero WASM, and zero Tauri dependencies. Compiles cleanly on `x86_64`, `aarch64`, and `wasm32-unknown-unknown`.
* **`crates/p7m-wasm`:** Thin `wasm-bindgen` wrapper exposing `inspect_p7m(file_name: &str, bytes: &[u8]) -> Result<JsValue, JsValue>` plus payload return buffer.
* **`apps/tauri/src-tauri`:** Native desktop/mobile shell linking `p7m-core` directly, registering `p7m://` custom protocol, OS file associations, and Android `content://` URI reading.

## 2. `p7m-core` Processing Pipeline

### Stage 1: Pre-Normalizer (`src/normalize.rs`)
Real-world Italian `.p7m` files frequently deviate from strict binary DER:
1. Enforce size limit (`MAX_INPUT_BYTES`: 250 MB Web / 500 MB Native).
2. Strip UTF-8 BOM (`0xEF 0xBB 0xBF`) and leading/trailing ASCII whitespace.
3. **Binary vs Base64/PEM Sniffing:**
   - If first byte is `0x30` (ASN.1 `SEQUENCE` tag): treat as binary ASN.1 (`DER` or `BER`).
   - Else if input contains `-----BEGIN` header (e.g. `PKCS7`, `CMS`): strip PEM armor lines and whitespace, decode via `base64` crate (`EncodingFormat::BASE64_PEM`).
   - Else if input consists of valid Base64 alphabet + whitespace: strip whitespace and decode via `base64` crate (`EncodingFormat::BASE64_PEM`).
   - Otherwise return `P7MErrorCode::INVALID_FORMAT`.
4. Check second byte after `0x30` tag: if `0x80`, flag `EncodingFormat::BER_INDEFINITE` (and append non-blocking warning if appropriate).

### Stage 2: Recursive CMS Unwrapper (`src/unwrap.rs`)
1. Loop up to `MAX_NESTING_DEPTH = 10` (prevent zip-bomb/recursion DoS):
2. Decode `rasn_cms::ContentInfo` using **`rasn::ber::decode`** (BER decoder is a strict superset that handles DER, CER, and indefinite-length BER + constructed `OCTET STRING`s seamlessly).
3. Verify `content_type == OID_SIGNED_DATA` (`1.2.840.113549.1.7.2`). If `EnvelopedData` (encrypted), return `UNSUPPORTED_CMS_TYPE`.
4. Decode `SignedData` from `content`.
5. Extract `encap_content_info.content`:
   - If `None`: record signer layer with `IntegrityStatus::DETACHED_SIGNATURE` and terminate loop (`payloadSizeBytes = 0`).
   - If `Some(octet_string)`: collect raw bytes (recursively concatenated by `rasn::ber` if fragmented).
6. Inspect `signer_infos` and `certificates` for this layer (Stage 3 & 4) against the *current layer's encapsulated bytes* (critical: outer layer signs the inner `.p7m` bytes, not the final PDF!).
7. **Recursion Check:** Test whether extracted bytes are themselves another valid CMS `SignedData` envelope (either filename still ends with `.p7m` or bytes parse cleanly as `ContentInfo::SignedData`). If yes, push layer and continue loop; otherwise break with final payload bytes.

### Stage 3: X.509 Signer & Timestamp Parser (`src/x509.rs`)
* Match each `SignerInfo.sid` (`IssuerAndSerialNumber` or `SubjectKeyIdentifier`) to the corresponding X.509 certificate in `SignedData.certificates` via `rasn-pkix`.
* Extract Subject RDNs:
  - `CN` (`2.5.4.3`), `givenName` (`2.5.4.42`), `surname` (`2.5.4.4`), `O` (`2.5.4.10`).
  - **Italian Fiscal Code:** Parse `serialNumber` (`2.5.4.5`). Handle ETSI/AgID formats `TINIT-<16-char-CF>` and `IDC:IT-<CF>` -> normalize to clean uppercase 16-char Fiscal Code.
* Extract `signingTime` (`1.2.840.113549.1.9.5`) from `signed_attrs`.
* Extract RFC 3161 `TimeStampToken` (`1.2.840.113549.1.9.16.2.14`) from `unsigned_attrs` if present -> parse `TSTInfo.genTime` as `timestampIso`.

### Stage 4: Local Cryptographic Integrity Verification (`src/verify.rs`)
* **Never panic or block viewing** if an exotic algorithm or broken signature is encountered; return the extracted payload alongside explicit `IntegrityStatus`!
* Compute digest of the layer's encapsulated content using `sha2` (SHA-256, SHA-384, SHA-512) or `sha1` (legacy acts; emit warning `"Algoritmo SHA-1 obsoleto"`).
* Compare against `messageDigest` (`1.2.840.113549.1.9.4`) inside `signed_attrs`. If mismatch -> `IntegrityStatus::DIGEST_MISMATCH`.
* When `signed_attrs` are present, re-encode `signed_attrs` in DER with explicit `SET OF` tag (`0x31`) per RFC 5652 §5.4 and verify the asymmetric signature (RSA PKCS#1 v1.5 / RSA-PSS / ECDSA P-256 & P-384) against the matched certificate's `SubjectPublicKeyInfo`.
* Set `revocation: RevocationStatus::NOT_CHECKED_OFFLINE` unconditionally in v1.0.

### Stage 5: Content Detection (`src/detect.rs`)
1. Clean filename: repeatedly strip case-insensitive `.p7m` suffix (`atto.pdf.p7m.p7m` -> `atto.pdf`).
2. Run `infer::get(payload)` for magic-byte MIME detection (`application/pdf`, `image/png`, `image/jpeg`, `image/webp`, `application/zip`, etc.).
3. **FatturaPA Heuristic:** If `infer` returns `application/xml`, `text/xml`, or `None` and the first 4 KB (trimmed UTF-8/UTF-16) starts with `<?xml` or `<` and contains `FatturaElettronica` or `FatturaElettronicaHeader` -> classify as `DocumentKind::FATTURA_PA_XML` (`mimeType: "application/xml"`).
4. Otherwise map to `PDF`, `IMAGE`, `TEXT` (valid UTF-8 heuristic), or `UNKNOWN`.

## 3. Tauri Native Shell & OS Integration (`apps/tauri`)
* **Custom Protocol (`p7m://`):** Register via `tauri::Builder::register_uri_scheme_protocol("p7m", ...)`. Serve `SessionStore` bytes strictly for `session/<uuid>`, rejecting path traversal or unknown IDs with HTTP 404.
* **Windows (`tauri.conf.json`):**
  - `bundle.targets`: `["nsis"]` (per-user `installMode: "currentUser"`, no UAC elevation) + portable zip/exe artifact from `target/release/ZeroP7M.exe`.
  - `bundle.fileAssociations`: `ext: ["p7m"]`, `mimeType: "application/pkcs7-mime"`, `name: "Documento Firmato P7M"`.
  - Handle single-instance plugin (`tauri-plugin-single-instance`) so double-clicking a second `.p7m` focuses the existing window and emits `zerop7m://open-file`.
* **Android (`apps/tauri/src-tauri/gen/android`):**
  - Declare `fileAssociations` in Tauri 2.11+ config plus Android `intent-filter` for `ACTION_VIEW` and `ACTION_SEND` matching `application/pkcs7-mime`, `application/x-pkcs7-mime`, and fallback `application/octet-stream` / `*/*` with `pathPattern=".*\.p7m"`.
  - Read `content://` URIs via `tauri-plugin-fs` / Android `ContentResolver` stream into `p7m-core` without requiring legacy external storage permissions.
* **iOS (Build-Ready):**
  - Configure `UTImportedTypeDeclarations` (`com.rsa.pkcs-7-mime`, extension `p7m`) and `CFBundleDocumentTypes` in `Info.plist`.
  - Verify `pnpm --filter tauri tauri ios build --no-sign` configuration remains intact for future macOS/AltStore/App Store builds.
