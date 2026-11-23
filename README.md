# ZeroP7M 📄🔐

> **Lettore di file `.p7m` (CAdES-BES / CAdES-T) 100% Locale, Offline e Open-Source con motore OpenCAdES.**  
> *Zero upload su server, zero telemetria, zero costi, massima privacy.*

[![CI](https://github.com/giuppi/zerop7m/actions/workflows/ci.yml/badge.svg)](https://github.com/giuppi/zerop7m/actions/workflows/ci.yml)
[![Pages](https://github.com/giuppi/zerop7m/actions/workflows/deploy-pages.yml/badge.svg)](https://giuppi.github.io/zerop7m)
[![License: MIT/Apache-2.0](https://img.shields.io/badge/License-MIT%20%2F%20Apache--2.0-blue.svg)](LICENSE-MIT)

---

## 🇮🇹 Italiano

### Cos'è ZeroP7M?
In Italia, atti notarili, decreti, contratti e fatture elettroniche ricevuti via PEC o email arrivano spesso racchiusi in buste crittografiche con estensione `.p7m` (standard CMS / PKCS#7 / CAdES).  
I software commerciali spesso impongono installazioni pesanti, account obbligatori o, peggio, chiedono di caricare documenti riservati su server cloud terzi.

**ZeroP7M** risolve questo problema alla radice: è un lettore leggero, sicuro e universale basato sul motore crittografico open source **OpenCAdES**, compilato in **Rust + WebAssembly** e distribuito sia come WebApp/PWA sia come applicazione desktop e mobile nativa.

### 🛡️ Garanzia di Privacy Totale
- **Zero Server Uploads:** I tuoi file non lasciano **mai** il tuo dispositivo.
- **Zero Rete:** Il software è isolato da una Content Security Policy ferrea (`connect-src 'none'`). Nessuna richiesta HTTP in uscita, nessuna chiamata API, zero cookie.
- **Zero Telemetria o Analytics:** Nessun tracciamento di utilizzo, nessun log remoto.
- **Memoria Effimera:** I file aperti risiedono solo nella RAM volatile della sessione e vengono eliminati immediatamente alla chiusura.

### 🚀 Come Usarlo

#### 1. WebApp / PWA Istantanea (Qualsiasi Browser)
Accedi direttamente a: **[giuppi.github.io/zerop7m](https://giuppi.github.io/zerop7m)**  
Funziona su Chrome, Firefox, Safari ed Edge. Una volta caricata la prima volta, la WebApp funziona **completamente offline** anche senza connessione internet.

#### 2. iPhone / iPad (iOS Safari)
ZeroP7M supporta la modalità standalone PWA su iOS:
1. Apri **[giuppi.github.io/zerop7m](https://giuppi.github.io/zerop7m)** in Safari.
2. Tocca l'icona **Condividi** (il quadrato con la freccia verso l'alto).
3. Scorri e seleziona **"Aggiungi alla schermata Home"**.
4. L'app apparirà come un'applicazione nativa a schermo intero e funzionerà anche in modalità aereo.

#### 3. Windows (Installer NSIS & Versione Portatile)
Scarica l'ultima versione dalla pagina [GitHub Releases](../../releases):
- `ZeroP7M-vX.X.X-x64-setup.exe`: Installer per utente singolo (non richiede privilegi di amministratore) che associa automaticamente il doppio clic sui file `.p7m`.
- `ZeroP7M-vX.X.X-x64-portable.exe`: Eseguibile portatile senza installazione.

> **Avviso Microsoft Defender SmartScreen:**  
> Essendo un progetto open source no-profit con budget zero, non acquistiamo certificati commerciali EV Microsoft (costo 400-600 €/anno). Se Windows mostra la schermata blu *"SmartScreen ha impedito l'avvio di un'app non riconosciuta"*:
> 1. Fai clic su **"Ulteriori informazioni"**.
> 2. Fai clic su **"Esegui comunque"**.
> 
> Puoi verificare l'integrità del binario confrontando l'hash SHA-256 con il file ufficiale `SHA256SUMS.txt` presente nella Release:
> ```powershell
> Get-FileHash -Algorithm SHA256 .\ZeroP7M-*-setup.exe
> ```

#### 4. Android (APK & Obtainium / F-Droid)
Scarica `ZeroP7M-vX.X.X.apk` dalla sezione Releases.
- Si integra con il comando "Apri con ZeroP7M" da Gmail, WhatsApp, app PEC e File Manager.
- Compatibile con l'aggiornamento automatico tramite **Obtainium** inserendo l'URL della repository GitHub.

---

### ⚖️ Avvertenza Legale (Integrità vs Revoca)
ZeroP7M verifica matematicamente l'**integrità crittografica locale** del documento e mostra l'identità del firmatario (Nome, Cognome, Codice Fiscale, data di marcatura temporale).  
Tuttavia, operando al 100% offline, **non interroga le liste di revoca online (CRL/OCSP)** né lo stato di qualifica eIDAS in tempo reale presso i certificatori accreditati AgID.  
*Conserva sempre il file `.p7m` originale per il pieno valore legale e probatorio.*

---

## 🇬🇧 English Summary

**ZeroP7M** is an open-source (MIT/Apache-2.0), zero-cost, 100% offline client-side `.p7m` (CAdES-BES / CAdES-T) document and Italian electronic invoice (FatturaPA) reader powered by the **OpenCAdES** cryptographic engine.

- **100% Local & Offline:** Powered by pure Rust compiled to WASM and native desktop/mobile targets via Tauri v2.
- **Strict Privacy:** Zero server uploads, zero network connections (`connect-src 'none'`), zero analytics.
- **Full Viewers:** Multi-page PDF viewer with zoom and page-fit, FatturaPA XML viewer with official AssoSoftware and AdE stylesheets, image/text fallbacks.
- **Universal Extraction:** Instant one-click extraction of the underlying original file.

---

## 🛠️ Compilazione da Sorgente / Build from Source

### Requisiti
- **Rust:** 1.80+ (`rustup default stable`)
- **Node.js:** 22+ & **pnpm:** 10+
- **wasm-pack:** `cargo install wasm-pack` (per il target Web)

### 1. Clona il repository e installa le dipendenze
```bash
git clone https://github.com/giuppi/zerop7m.git
cd zerop7m
pnpm install
```

### 2. Esegui i test di sicurezza e correttezza
```bash
# Rust core & corpus italiano
cargo test --workspace

# Frontend e sanitizer Vitest
pnpm --filter web test

# Verifica invarianti di sicurezza (CSP, zero-egress, versioni dipendenze)
python scripts/verify_audit.py

# Benchmark sintetico 50 MB (Native < 1.5s, WASM < 2.0s, RAM release)
python scripts/benchmark_50mb.py
```

### 3. Compila la WebApp / PWA
```bash
# Compila il motore crittografico Rust in WASM
wasm-pack build crates/p7m-wasm --target web --release

# Compila il bundle frontend
pnpm --filter web build
```
I file pronti per la distribuzione saranno generati in `apps/web/dist/`.

### 4. Compila l'applicazione Desktop nativa (Windows)
```bash
pnpm --filter tauri tauri build
```
L'eseguibile portatile e il pacchetto NSIS saranno disponibili in `target/release/`.

---

## 📄 Licenza / License

Distribuito con doppia licenza **MIT** o **Apache-2.0** a scelta dell'utente.  
Vedi [LICENSE-MIT](LICENSE-MIT) e [LICENSE-APACHE](LICENSE-APACHE) per i dettagli.
