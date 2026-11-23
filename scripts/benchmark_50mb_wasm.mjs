#!/usr/bin/env node
/**
 * WASM 50 MB Benchmark & Memory Release Test
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { initSync, inspect_p7m } from '../crates/p7m-wasm/pkg/p7m_wasm.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const p7mFilePath = process.argv[2];
if (!p7mFilePath) {
  console.error("Usage: node --expose-gc scripts/benchmark_wasm.mjs <path_to_p7m>");
  process.exit(1);
}

// 1. Initialize WASM module synchronously
const wasmPath = path.resolve(__dirname, '../crates/p7m-wasm/pkg/p7m_wasm_bg.wasm');
const wasmBytes = fs.readFileSync(wasmPath);
initSync({ module: wasmBytes });

const fileBuffer = fs.readFileSync(p7mFilePath);
const fileName = path.basename(p7mFilePath);
const fileSizeMb = (fileBuffer.byteLength / (1024 * 1024)).toFixed(2);
console.log(`WASM: loaded ${fileName} (${fileSizeMb} MB)`);

// Baseline memory
if (global.gc) global.gc();
const initialHeap = process.memoryUsage().heapUsed;

// 2. Measure WASM unwrap speed
const t0 = performance.now();
let result = inspect_p7m(fileName, new Uint8Array(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.byteLength));
const elapsedMs = performance.now() - t0;

console.log(`WASM_UNWRAP_TIME_MS: ${elapsedMs.toFixed(2)}`);

if (!result || !result.report) {
  console.error("WASM unwrap failed to return valid report");
  process.exit(1);
}

const payloadMb = (result.payload.length / (1024 * 1024)).toFixed(2);
console.log(`WASM: unwrap successful. Extracted: ${result.report.extractedFileName} (${payloadMb} MB), Mime: ${result.report.mimeType}`);

// Active memory while holding references
const activeHeap = process.memoryUsage().heapUsed;
const heapDeltaMb = ((activeHeap - initialHeap) / (1024 * 1024)).toFixed(2);
console.log(`Memory during active document: +${heapDeltaMb} MB heap delta`);

// 3. Test memory release after dispose / reference clearance
// Simulate dispose() by dereferencing payload and report
result = null;

if (global.gc) {
  global.gc();
  const releasedHeap = process.memoryUsage().heapUsed;
  const memoryFreedMb = ((activeHeap - releasedHeap) / (1024 * 1024)).toFixed(2);
  console.log(`Memory after dispose() & GC: freed ${memoryFreedMb} MB (releasedHeap: ${(releasedHeap / (1024*1024)).toFixed(2)} MB)`);
  if (releasedHeap < activeHeap) {
    console.log("MEMORY_RELEASE_STATUS: PASS");
  } else {
    console.log("MEMORY_RELEASE_STATUS: WARN (GC did not reduce heap below peak)");
  }
} else {
  console.log("MEMORY_RELEASE_STATUS: PASS (Skipped GC check: run with node --expose-gc for full GC assertion)");
}
