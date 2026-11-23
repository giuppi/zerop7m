import init, { inspect_p7m } from "p7m-wasm";
import type { P7MError, P7MInspectionReport } from "@zerop7m/shared-types";

let wasmInitPromise: Promise<unknown> | null = null;

function ensureWasm() {
  if (!wasmInitPromise) {
    wasmInitPromise = init();
  }
  return wasmInitPromise;
}

export interface WorkerInspectRequest {
  id: string;
  type: "INSPECT";
  fileName: string;
  buffer: ArrayBuffer;
}

export type WorkerInspectResponse =
  | { id: string; ok: true; report: P7MInspectionReport; payloadBuffer: ArrayBuffer }
  | { id: string; ok: false; error: P7MError };

self.onmessage = async (event: MessageEvent<WorkerInspectRequest>) => {
  const { id, type, fileName, buffer } = event.data;
  if (type !== "INSPECT") return;

  try {
    await ensureWasm();
    const bytes = new Uint8Array(buffer);
    const result = inspect_p7m(fileName, bytes);
    
    const report = result.report as P7MInspectionReport;
    const payload = result.payload as Uint8Array;

    // Always create a clean isolated ArrayBuffer slice, detached from WASM linear memory
    const payloadBuffer = payload.slice().buffer as ArrayBuffer;

    const response: WorkerInspectResponse = {
      id,
      ok: true,
      report,
      payloadBuffer,
    };

    (self as unknown as Worker).postMessage(response, [payloadBuffer]);
  } catch (err: unknown) {
    let error: P7MError;
    if (err && typeof err === "object" && "code" in err && "message" in err) {
      error = err as P7MError;
    } else {
      error = {
        code: "INTERNAL_ERROR",
        message: err instanceof Error ? err.message : String(err),
      };
    }
    const response: WorkerInspectResponse = { id, ok: false, error };
    (self as unknown as Worker).postMessage(response);
  }
};
