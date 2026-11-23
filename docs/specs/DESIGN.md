# DESIGN — ZeroP7M Visual Direction & Impeccable Guardrails

## 1. Aesthetic Direction: "Archivio Digitale Pulito" (Swiss Utility / Editorial Precision)
ZeroP7M is a quiet, trustworthy utility for legal and administrative documents. The document itself is the hero — the chrome must recede cleanly like macOS Preview or a well-crafted archival reader.
* **Zero AI Slop:** No neon purple gradients, no glassmorphism blur cards, no marketing hero sections blocking the drop zone, no bouncy confetti or fake "AI-powered" badges.
* **Instant Utility:** On launch, the entire viewport is a calm, tactile drop target ready to receive a `.p7m` file in 1 click or drag.

## 2. Design Tokens (Tailwind CSS 4 `@theme`)
### Color Palette (Light Default + Automatic Dark Mode)
* **Light Canvas (Document Backdrop):** `#F4F5F7` (`--color-canvas`) — subtle cool paper-gray so white PDF/FatturaPA pages have crisp natural edge separation.
* **Elevated Surface (Toolbar / Drawer):** `#FFFFFF` (`--color-surface`) with hairline border `#E2E5EB` (`--color-border`).
* **Ink Primary:** `#111827` (`--color-ink`) | **Ink Muted:** `#525C6E` (`--color-ink-muted`).
* **Brand Accent (Institutional Slate-Blue):** `#1E40AF` (`--color-accent`) / hover `#1D4ED8`.
* **Semantic Signature States (Muted, High-Contrast):**
  - `VERIFIED_LOCAL`: Forest `#166534` on `#ECFDF5` (border `#BBF7D0`) — Label: *"Integrità verificata (locale)"*
  - `OFFLINE_INFO`: Slate `#334155` on `#F1F5F9` — Label: *"Revoca non verificata (offline)"*
  - `PARSE_WARNING` / `UNSUPPORTED_ALGO` / `SHA-1`: Amber `#92400E` on `#FFFBEB` (border `#FDE68A`)
  - `DIGEST_MISMATCH` / `SIGNATURE_INVALID`: Crimson `#991B1B` on `#FEF2F2` (border `#FECACA`)
* **Dark Mode Overrides:** Canvas `#0F1115`, Surface `#171A21`, Border `#262B36`, Ink `#F3F4F6`, Ink Muted `#9CA3AF`.

### Typography (100% System / Locally Bundled — Zero External Fonts)
* **UI Sans:** `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` (zero network requests, native OS crispness).
* **Technical / Fiscal Code / Hashes / XML:** `ui-monospace, "Cascadia Code", "SF Mono", Consolas, monospace` with `font-variant-numeric: tabular-nums`.
* **Scale:** Toolbar title `14px` semibold; Section headers `12px` uppercase tracking `0.06em` muted; Body `14px` leading `1.5`; Fiscal Code / Serial `12px` mono.

## 3. Layout & Responsive Breakpoints
* **Toolbar Height:** Fixed `52px` (`h-13`) single row, sticky top.
* **Desktop (`>= 1024px`):** Document Stage fills remaining width; `SignatureDrawer` opens as a `360px` docked right sidebar without obscuring toolbar actions.
* **Tablet / Mobile (`< 1024px`):** Toolbar collapses secondary labels to icons with tooltips; `SignatureDrawer` opens as a dismissible bottom sheet (`max-h-[80dvh]`) with swipe/close button.

## 4. Italian UI Microcopy & Legal Clarity
* **Drop Zone Headline:** *"Trascina qui un file `.p7m`"* / Button: *"Scegli dal dispositivo"*
* **Privacy Pill (Footer of Drop Zone):** *"100% locale e offline — i tuoi file non lasciano mai questo dispositivo."*
* **Download Tooltip / Toast:** *"Copia estratta solo per lettura e stampa. Conserva sempre il file `.p7m` originale per il valore legale."*
* **Integrity Disclaimer (Inside Signature Drawer):** *"Verifica crittografica eseguita offline sull'integrità del documento. Lo stato di revoca o qualifica eIDAS del certificato non è verificato in modalità locale."*
