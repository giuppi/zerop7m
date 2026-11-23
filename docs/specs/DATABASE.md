# DATABASE — State Storage, Ephemeral Session Store & Offline Cache

## 1. Zero-Database Architecture Invariant
ZeroP7M has **NO remote database, NO SQLite persistence of user documents, and NO cloud sync**. Every opened `.p7m` document is treated as sensitive/confidential legal or fiscal material and exists strictly in **ephemeral volatile memory** for the duration of the viewing session.

## 2. Native Ephemeral Session Store (`apps/tauri`)
To avoid passing 50–200 MB payloads across Tauri JSON IPC, `apps/tauri` maintains a thread-safe in-memory store in Rust (`tauri::State<SessionStore>`):

```rust
pub struct SessionEntry {
    pub session_id: String,
    pub extracted_file_name: String,
    pub mime_type: String,
    pub payload: bytes::Bytes, // Reference-counted zero-copy slice for p7m:// responses
    pub created_at: std::time::Instant,
}

pub struct SessionStore {
    // Bounded map: max 2 active entries (current + transitioning document)
    inner: std::sync::RwLock<std::collections::HashMap<String, SessionEntry>>,
}
```

### Memory Eviction & Integrity Rules
* **Single-Active-Document Policy (v1.0):** Opening a new `.p7m` MUST invoke `dispose()` on the previous `OpenedDocument`, calling `release_session(old_id)` in Rust (or `URL.revokeObjectURL()` on Web) so RAM never accumulates across opened files.
* **Hard Cap Guard:** `SessionStore` enforces `MAX_SESSIONS = 2`; inserting a 3rd entry automatically evicts the oldest entry by `created_at`.
* **Zero Disk Leakage:** Extracted payloads are NEVER written to OS temp directories unless the user explicitly clicks **"Scarica / Salva copia"** or **"Condividi"** (on Android Share Sheet, temporary cached export files MUST live in app-private `cacheDir/shared/` and be swept on next app startup).

## 3. Web / PWA Storage Boundaries
| Storage Mechanism | Used? | Purpose & Limits |
| :--- | :--- | :--- |
| **Cache Storage (Service Worker / Workbox)** | **YES** | Stores ONLY static app shell assets: HTML, JS, CSS, `p7m_wasm_bg.wasm`, `pdf.worker.min.mjs`, and `/assets/xsl/FoglioStileAssoSoftware.xsl`. NEVER caches user `.p7m` blobs. |
| **In-Memory `Blob` / `ObjectURL`** | **YES** | Holds active extracted document bytes; immediately revoked via `URL.revokeObjectURL()` on document close or unload. |
| **`localStorage`** | **MINIMAL** | Optional non-sensitive UI preferences only (e.g., `theme: 'system' | 'light' | 'dark'`, `xsltStyle: 'assosoftware' | 'ade'`). Max < 1 KB. |
| **IndexedDB / Cookies** | **NO** | Explicitly unused in v1.0 to minimize privacy footprint. |
