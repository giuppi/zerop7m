# FRONTEND — React 19 WebApp, PWA & Document Viewers (`apps/web`)

## 1. Architecture & Component Tree
```text
AppShell
├── HeaderBar (file name, nesting badge, integrity pill, Print, Download, Inspect Drawer toggle, Open Another)
├── EmptyDropZone (initial state: full-viewport drag-and-drop + file picker + privacy guarantee + recent format hints)
├── ErrorBanner (actionable Italian error message for detached/encrypted/corrupt files, still shows signers if detached)
├── DocumentStage (occupies >= 80% viewport)
│   ├── PdfViewer (pdfjs-dist 6.5.438, virtualized/lazy canvas pages, zoom controls, page jumper, text layer)
│   ├── FatturaPaViewer (XSLTProcessor + DOM sanitizer + sandboxed iframe + toggle Raw XML + style selector AssoSoftware/AdE)
│   ├── ImageViewer (zoom/fit native <img>)
│   ├── TextViewer (monospace scrollable UTF-8 viewer)
│   └── UnknownFormatCard (detected MIME, file size, prominent Extract & Save CTA)
└── SignatureDrawer (collapsible right panel / mobile bottom sheet)
    ├── LegalStatusCallout (clear local integrity vs offline revocation explanation)
    └── SignatureLayerList (grouped by depth 1..N: CN, Fiscal Code badge, Issuer, Validity, Signing/Timestamp dates)
```

## 2. State Management (Ponytail Principle)
No Redux/Zustand bloat needed for v1.0. Use a single typed `useDocumentSession()` React 19 hook managing a finite state machine:
```typescript
type SessionState =
  | { status: 'idle' }
  | { status: 'loading'; fileName: string }
  | { status: 'ready'; doc: OpenedDocument }
  | { status: 'error'; error: P7MError; partialReport?: P7MInspectionReport };
```
* **Cleanup Invariant:** Whenever transitioning away from `ready` or on `beforeunload`, call `doc.dispose()` to free ObjectURLs / native `SessionStore` memory.

## 3. Runtime Adapter Selection (`src/adapters/`)
* Detect Tauri runtime cleanly via `isTauri()` from `@tauri-apps/api/core`.
* **`WebWasmAdapter`:**
  - Instantiates a singleton Web Worker (`new Worker(new URL('../workers/p7m.worker.ts', import.meta.url), { type: 'module' })`).
  - Reads `file.arrayBuffer()`, transfers it zero-copy to Worker.
  - Receives `report` + transferred `payloadBuffer`, validates `report` with Zod (`P7MInspectionReportSchema`), creates `URL.createObjectURL(new Blob([payloadBuffer], { type: report.mimeType }))`.
  - Download action creates temporary `<a download={extractedFileName}>` and shows a non-blocking toast reminding the user to keep the original `.p7m` for legal value.
* **`TauriNativeAdapter`:**
  - Listens on mount for `get_launch_file()` (cold start) and `zerop7m://open-file` event (warm OS Open-With).
  - Calls `invoke('inspect_p7m_path', { pathOrUri })`, sets `payloadUrl = "p7m://localhost/session/" + report.sessionId`.
  - Download action uses native Save Dialog (`@tauri-apps/plugin-dialog`) -> `invoke('save_extracted_file', ...)`.

## 4. Document Viewers Implementation Rules
### PDF Viewer (`pdfjs-dist` `6.5.438`)
* Bundle worker locally (`pdfjs-dist/build/pdf.worker.min.mjs`) via Vite `?url` import so it works 100% offline.
* Mandatory security option: `getDocument({ url: payloadUrl, isEvalSupported: false, cMapPacked: true })`.
* Render pages lazily via `IntersectionObserver` (render visible pages +/- 1 buffer) to keep RAM low on 100+ page deeds.
* Support crisp HiDPI rendering (`window.devicePixelRatio`) capped at `2.0` on mobile to prevent canvas OOM.

### FatturaPA XML Viewer (`.xml.p7m`)
* Bundle official XSLT files locally in `apps/web/public/assets/xsl/`:
  - `FoglioStileAssoSoftware.xsl` (default — compact commercial invoice layout).
  - `fatturaordinaria_v1.2.2.xsl` (optional switch — Agenzia delle Entrate layout).
* Pipeline:
  1. Decode XML payload (`TextDecoder`, handling UTF-8 and ISO-8859-1 declaration if specified).
  2. Parse XML via `DOMParser` (`application/xml`); parse cached XSL via `DOMParser`.
  3. Transform via `new XSLTProcessor()`.
  4. Sanitize resulting HTML string (strip `<script>`, `<iframe>`, `<object>`, `<embed>`, `<meta http-equiv>`, and `on*` / `javascript:` attributes).
  5. Render inside `<iframe sandbox="allow-same-origin allow-modals" srcDoc={sanitizedHtml} />`.
  6. Print button triggers `iframeRef.current.contentWindow.print()`.

## 5. PWA & iOS Offline Support (`vite-plugin-pwa` `2.0.0`)
* Configure `registerType: 'autoUpdate'`, `workbox.globPatterns: ['**/*.{js,css,html,wasm,mjs,xsl,svg,png}']`.
* Manifest: `name: "ZeroP7M"`, `short_name: "ZeroP7M"`, `display: "standalone"`, `start_url: "./"`, Apple Touch icons, and `file_handlers` manifest entry for `.p7m` on Chromium Desktop/Android PWAs.

## 6. Accessibility (WCAG 2.1 AA)
* Full keyboard navigation (`Escape` closes drawer, `Ctrl/Cmd+P` prints active document, `+/-` zooms PDF).
* Semantic landmarks (`<header>`, `<main>`, `<aside aria-label="Dettagli firma digitale">`), focus trap in mobile drawer, minimum 4.5:1 contrast ratio.
