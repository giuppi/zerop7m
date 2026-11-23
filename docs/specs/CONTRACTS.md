# CONTRACTS — Contract-First Gate (Rust <-> WASM <-> Tauri <-> TypeScript)

**RULE:** All cross-boundary data structures MUST be defined in `crates/p7m-core/src/model.rs` with `#[derive(Serialize, Deserialize, TS)]` (`ts-rs`) and exported to `packages/shared-types/src/generated.ts` before frontend or native shell integration begins.

## 1. Shared Domain Types (`packages/shared-types/src/generated.ts`)
```typescript
export type DocumentKind = 'PDF' | 'FATTURA_PA_XML' | 'IMAGE' | 'TEXT' | 'UNKNOWN';

export type EncodingFormat = 'DER' | 'BER_INDEFINITE' | 'BASE64_PEM';

export type IntegrityStatus =
  | 'VERIFIED_LOCAL'      // Payload digest matches signed messageDigest & signature verifies against embedded cert public key
  | 'DIGEST_MISMATCH'     // Recomputed payload hash does not match signed digest
  | 'SIGNATURE_INVALID'   // Digest matched or present, but asymmetric signature verification failed
  | 'DETACHED_SIGNATURE'  // CMS envelope contains no embedded eContent payload
  | 'UNSUPPORTED_ALGO'    // Digest or asymmetric algorithm not supported locally
  | 'PARSE_WARNING';      // Payload extracted, but signer metadata or verification is incomplete

export type RevocationStatus =
  | 'NOT_CHECKED_OFFLINE'; // v1.0 strictly offline — never imply online eIDAS revocation validation

export interface SignerSummary {
  commonName: string;
  givenName?: string;
  surname?: string;
  fiscalCode?: string;         // Normalized Italian CF from OID 2.5.4.5 (e.g. "TINIT-RSSMRA80A01H501U" -> "RSSMRA80A01H501U")
  organization?: string;
  issuerCn: string;
  serialNumberHex: string;
  validFromIso: string;        // RFC 3339 / ISO 8601 UTC
  validToIso: string;          // RFC 3339 / ISO 8601 UTC
  declaredSigningTimeIso?: string;
  timestampIso?: string;       // RFC 3161 TimeStampToken genTime if present in unsignedAttrs
  digestAlgorithm: string;     // "SHA-256" | "SHA-384" | "SHA-512" | "SHA-1" | OID string
  integrity: IntegrityStatus;
  revocation: RevocationStatus;
}

export interface SignatureLayer {
  depth: number;               // 1 = outermost envelope, N = innermost envelope
  encodingDetected: EncodingFormat;
  signers: SignerSummary[];
}

export interface P7MInspectionReport {
  sessionId: string;           // UUID v4 handle for retrieving payload bytes
  originalFileName: string;
  extractedFileName: string;   // All trailing ".p7m" extensions stripped (case-insensitive)
  payloadSizeBytes: number;    // 0 when detached
  mimeType: string;            // Detected via magic bytes (infer) + FatturaPA XML heuristic
  documentKind: DocumentKind;
  layers: SignatureLayer[];
  warnings: string[];          // Machine-stable or localized warning keys
}
```

## 2. Standardized Error Contract
```typescript
export type P7MErrorCode =
  | 'INVALID_FORMAT'       // Not a valid ASN.1 CMS/PKCS#7 or Base64-wrapped envelope
  | 'UNSUPPORTED_CMS_TYPE' // ContentInfo is not SignedData (e.g. EnvelopedData encrypted)
  | 'DETACHED_NO_CONTENT'  // Valid SignedData, but no encapsulated content to view/extract
  | 'MAX_NESTING_EXCEEDED' // Exceeded safety cap (MAX_NESTING_DEPTH = 10)
  | 'FILE_TOO_LARGE'       // Exceeded safety cap (Web: 250 MB, Native: 500 MB)
  | 'IO_READ_FAILED'       // Native disk or Android content:// read error
  | 'CORRUPT_PAYLOAD'      // Truncated ASN.1 structure or unrecoverable byte stream
  | 'INTERNAL_ERROR';

export interface P7MError {
  code: P7MErrorCode;
  message: string;         // Concise technical message
  details?: string;        // Optional diagnostic context (never sensitive paths in Web)
}
```

## 3. Unified Frontend Adapter Interface (`EngineAdapter`)
The UI interacts ONLY with this contract and never branches on platform internals inside components:
```typescript
export interface OpenedDocument {
  report: P7MInspectionReport;
  /** URL readable by PDF.js, <img>, fetch() (Blob URL on Web, p7m://localhost/session/<id> on Tauri) */
  payloadUrl: string;
  /** Fetches raw bytes on demand (for FatturaPA XML text decoding or download fallback) */
  readPayloadBytes: () => Promise<Uint8Array>;
  /** Releases ObjectURL / native SessionStore memory immediately */
  dispose: () => Promise<void>;
}

export interface EngineAdapter {
  readonly runtime: 'web-wasm' | 'tauri-native';
  inspectFile(file: File): Promise<OpenedDocument>;
  inspectPath?(pathOrUri: string): Promise<OpenedDocument>;
  saveExtractedCopy(doc: OpenedDocument): Promise<void>;
  shareExtractedCopy?(doc: OpenedDocument): Promise<void>;
}
```

## 4. Web Worker Message Protocol (`apps/web`)
* **Request (Main -> Worker):** `{ id: string; type: 'INSPECT'; fileName: string; buffer: ArrayBuffer }` — `buffer` MUST be passed in the `transfer` array (`[buffer]`) for zero-copy handoff.
* **Response (Worker -> Main):**
  - Success: `{ id: string; ok: true; report: P7MInspectionReport; payloadBuffer: ArrayBuffer }` (`payloadBuffer` transferred back zero-copy).
  - Error: `{ id: string; ok: false; error: P7MError }`.

## 5. Tauri Native IPC & Custom Protocol (`apps/tauri`)
* **Commands (`#[tauri::command]`):**
  - `inspect_p7m_path(path_or_uri: String) -> Result<P7MInspectionReport, P7MError>`
  - `inspect_p7m_bytes(file_name: String, bytes: Vec<u8>) -> Result<P7MInspectionReport, P7MError>` *(fallback for drag-and-drop without path)*
  - `get_session_bytes(session_id: String) -> Result<Vec<u8>, P7MError>` *(direct in-memory payload retrieval via IPC, bypassing CSP and custom scheme restrictions)*
  - `release_session(session_id: String) -> Result<(), P7MError>`
  - `save_extracted_file(session_id: String, target_path: String) -> Result<(), P7MError>`
  - `get_launch_file() -> Option<String>` *(returns CLI arg / Android intent URI passed at cold start)*
* **Events (Rust -> WebView):**
  - `zerop7m://open-file` payload `{ pathOrUri: string }` *(fired on single-instance second launch or mobile intent while app is already open)*.
* **Custom URI Protocol:**
  - `GET p7m://localhost/session/<sessionId>` -> returns raw payload bytes with `Content-Type: <mimeType>` and `Cache-Control: no-store`.
