#!/usr/bin/env python3
"""
ZeroP7M — Synthetic 50 MB .pdf.p7m Benchmark & Smoke Test
Validates:
1. Native unwrap speed < 1.5s
2. WASM unwrap speed < 2.0s
3. Memory release after document disposal
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def generate_50mb_p7m(dest_path: Path) -> None:
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp = Path(tmp_dir)
        key = tmp / "key.pem"
        cert = tmp / "cert.pem"
        pdf = tmp / "sample_50mb.pdf"

        # Generate self-signed cert for signing
        subprocess.run(
            [
                "openssl",
                "req",
                "-x509",
                "-newkey",
                "rsa:2048",
                "-nodes",
                "-keyout",
                str(key),
                "-out",
                str(cert),
                "-days",
                "1",
                "-subj",
                "/CN=ZeroP7M 50MB Benchmark/serialNumber=TINIT-RSSMRA80A01H501U",
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        # Generate valid 50 MB PDF with large internal stream
        stream_size = 50 * 1024 * 1024 - 2048
        with open(pdf, "wb") as f:
            f.write(
                b"%PDF-1.4\n1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n"
                b"2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n"
                b"3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R>> endobj\n"
                b"4 0 obj <</Length " + str(stream_size).encode() + b">> stream\n"
            )
            chunk = b"A" * (1024 * 1024)
            for _ in range(50 - 1):
                f.write(chunk)
            f.write(
                b"\nendstream endobj\nxref\n0 5\n0000000000 65535 f \n"
                b"trailer <</Size 5 /Root 1 0 R>>\nstartxref\n100\n%%EOF\n"
            )

        # Sign with OpenSSL CMS in DER format
        subprocess.run(
            [
                "openssl",
                "cms",
                "-sign",
                "-signer",
                str(cert),
                "-inkey",
                str(key),
                "-nodetach",
                "-outform",
                "DER",
                "-md",
                "sha256",
                "-in",
                str(pdf),
                "-out",
                str(dest_path),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

def run_native_benchmark(p7m_path: Path) -> float:
    print("\n--- Running Native Rust 50 MB Benchmark ---")
    cmd = [
        "cargo",
        "run",
        "--release",
        "-p",
        "p7m-core",
        "--example",
        "benchmark_native",
        "--",
        str(p7m_path),
    ]
    res = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, check=True)
    print(res.stdout)
    match = re.search(r"NATIVE_UNWRAP_TIME_MS:\s*([\d.]+)", res.stdout)
    if not match:
        raise ValueError(f"Could not parse NATIVE_UNWRAP_TIME_MS from output: {res.stdout}")
    return float(match.group(1))

def run_wasm_benchmark(p7m_path: Path) -> tuple[float, bool]:
    print("\n--- Running WASM + Memory Release 50 MB Benchmark ---")
    cmd = [
        "node",
        "--expose-gc",
        str(ROOT / "scripts" / "benchmark_50mb_wasm.mjs"),
        str(p7m_path),
    ]
    res = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, check=True)
    print(res.stdout)
    match = re.search(r"WASM_UNWRAP_TIME_MS:\s*([\d.]+)", res.stdout)
    if not match:
        raise ValueError(f"Could not parse WASM_UNWRAP_TIME_MS from output: {res.stdout}")
    time_ms = float(match.group(1))
    memory_ok = "MEMORY_RELEASE_STATUS: PASS" in res.stdout
    return time_ms, memory_ok

def main() -> None:
    print("==========================================================")
    print(" ZeroP7M — 50 MB .pdf.p7m Performance & Memory Benchmark")
    print(" Targets: Native < 1500 ms (1.5s) | WASM < 2000 ms (2.0s)")
    print("==========================================================")

    with tempfile.TemporaryDirectory() as tmp_dir:
        p7m_file = Path(tmp_dir) / "synthetic_50mb.pdf.p7m"
        print(f"Generating synthetic 50 MB signed .pdf.p7m...")
        t0 = time.time()
        generate_50mb_p7m(p7m_file)
        size_mb = os.path.getsize(p7m_file) / (1024 * 1024)
        print(f"Generated {size_mb:.2f} MB .p7m in {time.time() - t0:.2f}s")

        # 1. Native Rust Benchmark
        native_ms = run_native_benchmark(p7m_file)
        native_s = native_ms / 1000.0

        # 2. WASM Benchmark & Memory Release
        wasm_ms, mem_released = run_wasm_benchmark(p7m_file)
        wasm_s = wasm_ms / 1000.0

        # Evaluation
        print("\n================== BENCHMARK VERDICT ==================")
        print(f"Native Unwrap: {native_s:.3f}s (Threshold: < 1.500s) -> {'PASS' if native_s < 1.5 else 'FAIL'}")
        print(f"WASM Unwrap:   {wasm_s:.3f}s (Threshold: < 2.000s) -> {'PASS' if wasm_s < 2.0 else 'FAIL'}")
        print(f"Memory Release: {'PASS' if mem_released else 'FAIL'}")
        print("========================================================")

        if native_s >= 1.5:
            print(f"[FAIL] Native unwrap {native_s:.3f}s exceeded 1.5s threshold", file=sys.stderr)
            sys.exit(1)
        if wasm_s >= 2.0:
            print(f"[FAIL] WASM unwrap {wasm_s:.3f}s exceeded 2.0s threshold", file=sys.stderr)
            sys.exit(1)
        if not mem_released:
            print(f"[FAIL] Memory release check failed", file=sys.stderr)
            sys.exit(1)

        print(">>> 50 MB BENCHMARK & MEMORY RELEASE: ALL PASS <<<")

if __name__ == "__main__":
    main()
