#!/usr/bin/env python3
"""
ZeroP7M — Release Audit & Security Invariants Verification Script
Validates all checklist items from docs/specs/SECURITY.md and .agent/workflows/audit-release.md.
"""

import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def check_rustix_version():
    cargo_lock = (ROOT / "Cargo.lock").read_text(encoding="utf-8")
    rustix_blocks = re.findall(r'name = "rustix"\s+version = "([^"]+)"', cargo_lock)
    if not rustix_blocks:
        raise ValueError("rustix not found in Cargo.lock")
    for ver in rustix_blocks:
        parts = [int(p) for p in ver.split(".")]
        # Needs >= 1.1.6
        if parts < [1, 1, 6]:
            raise ValueError(f"Found rustix version {ver} < 1.1.6 (RUSTSEC-2026-0486)")
    print(f"[OK] rustix version >= 1.1.6 ({rustix_blocks})")

def check_pdfjs_version():
    pnpm_lock = (ROOT / "pnpm-lock.yaml").read_text(encoding="utf-8")
    pdfjs_matches = set(re.findall(r'pdfjs-dist[@/]([0-9.]+)', pnpm_lock))
    if not pdfjs_matches:
        raise ValueError("pdfjs-dist not found in pnpm-lock.yaml")
    for ver in pdfjs_matches:
        parts = [int(p) for p in ver.split(".")]
        if parts < [6, 5, 438]:
            raise ValueError(f"Found pdfjs-dist version {ver} < 6.5.438 (CVE-2026-16633)")
    print(f"[OK] pdfjs-dist version >= 6.5.438 ({pdfjs_matches})")

    # Check isEvalSupported: false
    pdf_config = (ROOT / "apps/web/src/services/pdf-config.ts").read_text(encoding="utf-8")
    if "isEvalSupported: false" not in pdf_config:
        raise ValueError("isEvalSupported: false not configured in pdf-config.ts")
    print("[OK] pdfjs isEvalSupported: false verified")

def check_csp():
    # WebApp index.html
    index_html = (ROOT / "apps/web/index.html").read_text(encoding="utf-8")
    if "connect-src 'none'" not in index_html:
        raise ValueError("connect-src 'none' missing in apps/web/index.html CSP")
    print("[OK] WebApp CSP enforces connect-src 'none'")

    # Tauri config
    tauri_conf = (ROOT / "apps/tauri/src-tauri/tauri.conf.json").read_text(encoding="utf-8")
    if "connect-src 'none'" not in tauri_conf:
        raise ValueError("connect-src 'none' missing in tauri.conf.json CSP")
    print("[OK] Tauri CSP enforces connect-src 'none'")

def check_fatturapa_sandbox():
    viewer = (ROOT / "apps/web/src/components/viewers/FatturaPaViewer.tsx").read_text(encoding="utf-8")
    if 'sandbox="allow-same-origin allow-modals"' not in viewer:
        raise ValueError("FatturaPA iframe sandbox missing or altered")
    if "allow-scripts" in viewer:
        raise ValueError("SECURITY VIOLATION: allow-scripts detected in FatturaPA iframe sandbox")
    print("[OK] FatturaPA iframe sandbox lacks allow-scripts and is strictly isolated")

def check_legal_disclaimers():
    # Adapter download reminder
    web_adapter = (ROOT / "apps/web/src/adapters/web-wasm.adapter.ts").read_text(encoding="utf-8")
    if "DOWNLOAD_LEGAL_REMINDER" not in web_adapter or "conserva sempre il file .p7m originale per il valore legale" not in web_adapter.lower():
        raise ValueError("Offline download legal disclaimer missing in web-wasm.adapter.ts")

    tauri_adapter = (ROOT / "apps/web/src/adapters/tauriNativeAdapter.ts").read_text(encoding="utf-8")
    if "DOWNLOAD_LEGAL_REMINDER" not in tauri_adapter:
        raise ValueError("Offline download legal disclaimer missing in tauriNativeAdapter.ts")

    drawer = (ROOT / "apps/web/src/components/SignatureDrawer.tsx").read_text(encoding="utf-8")
    if "stato di revoca o qualifica eidas" not in drawer.lower():
        raise ValueError("Offline revocation disclaimer missing in SignatureDrawer.tsx")
    print("[OK] Offline legal disclaimers present in download action and SignatureDrawer")

def check_dist_bundle_zero_egress():
    dist_dir = ROOT / "apps/web/dist"
    if not dist_dir.exists():
        raise ValueError("apps/web/dist does not exist. Run pnpm --filter web build first.")

    # Patterns that indicate external CDN, fonts, analytics, telemetry
    forbidden_patterns = [
        re.compile(r'https?://(?:fonts\.googleapis\.com|cdnjs\.cloudflare\.com|cdn\.|unpkg\.com|cdn\.jsdelivr\.net)'),
        re.compile(r'https?://(?:www\.)?google-analytics\.com'),
        re.compile(r'https?://(?:www\.)?googletagmanager\.com'),
        re.compile(r'https?://[a-zA-Z0-9.-]+\.telemetry'),
        re.compile(r'https?://[a-zA-Z0-9.-]+\.sentry\.io'),
    ]

    for root_path, _, files in os.walk(dist_dir):
        for f in files:
            if f.endswith((".html", ".js", ".css", ".webmanifest")):
                file_path = Path(root_path) / f
                content = file_path.read_text(encoding="utf-8", errors="ignore")
                for pat in forbidden_patterns:
                    matches = pat.findall(content)
                    if matches:
                        raise ValueError(f"Forbidden external endpoint {matches} found in {file_path}")
    print("[OK] Zero external CDNs/fonts/analytics/telemetry in apps/web/dist/")

def main():
    print("=== Running ZeroP7M Security & Release Audit Checks ===")
    try:
        check_rustix_version()
        check_pdfjs_version()
        check_csp()
        check_fatturapa_sandbox()
        check_legal_disclaimers()
        check_dist_bundle_zero_egress()
        print("\n>>> ALL SECURITY INVARIANTS VERIFIED CLEAN <<<")
    except Exception as e:
        print(f"\n[FAIL] {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
