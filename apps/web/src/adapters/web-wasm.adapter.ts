import {
  type EngineAdapter,
  type OpenedDocument,
  type P7MError,
  type P7MInspectionReport,
  P7MInspectionReportSchema,
} from "@zerop7m/shared-types";
import type {
  WorkerInspectRequest,
  WorkerInspectResponse,
} from "../workers/p7m.worker";

export const DOWNLOAD_LEGAL_REMINDER =
  "Copia estratta solo per lettura e stampa. Conserva sempre il file .p7m originale per il valore legale.";

export class WebWasmAdapter implements EngineAdapter {
  readonly runtime = "web-wasm" as const;
  private worker: Worker | null = null;
  private pendingRequests = new Map<
    string,
    {
      resolve: (value: { report: P7MInspectionReport; payloadBuffer: ArrayBuffer }) => void;
      reject: (reason: P7MError) => void;
    }
  >();

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(
        new URL("../workers/p7m.worker.ts", import.meta.url),
        { type: "module" }
      );

      this.worker.onmessage = (event: MessageEvent<WorkerInspectResponse>) => {
        const data = event.data;
        const pending = this.pendingRequests.get(data.id);
        if (!pending) return;

        this.pendingRequests.delete(data.id);

        if (data.ok) {
          try {
            // Validate report with Zod runtime schema
            const validatedReport = P7MInspectionReportSchema.parse(data.report);
            pending.resolve({
              report: validatedReport,
              payloadBuffer: data.payloadBuffer,
            });
          } catch (err) {
            pending.reject({
              code: "INTERNAL_ERROR",
              message: "Validazione report fallita: " + String(err),
            });
          }
        } else {
          pending.reject(data.error);
        }
      };

      this.worker.onerror = (e) => {
        for (const [id, pending] of this.pendingRequests.entries()) {
          pending.reject({
            code: "INTERNAL_ERROR",
            message: "Worker error: " + (e.message || "Unknown worker error"),
          });
          this.pendingRequests.delete(id);
        }
      };
    }
    return this.worker;
  }

  async inspectFile(file: File): Promise<OpenedDocument> {
    const worker = this.getWorker();
    const id = Math.random().toString(36).substring(2, 15);
    const buffer = await file.arrayBuffer();

    const request: WorkerInspectRequest = {
      id,
      type: "INSPECT",
      fileName: file.name,
      buffer,
    };

    const workerResultPromise = new Promise<{
      report: P7MInspectionReport;
      payloadBuffer: ArrayBuffer;
    }>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });

    // Zero-copy transfer
    worker.postMessage(request, [buffer]);

    const { report, payloadBuffer } = await workerResultPromise;
    const blob = new Blob([payloadBuffer], { type: report.mimeType });
    const payloadUrl = URL.createObjectURL(blob);
    let disposed = false;

    const doc: OpenedDocument = {
      report,
      payloadUrl,
      readPayloadBytes: async () => {
        // Return a fresh cloned slice so consumers (e.g. PDF.js worker transfer) cannot detach payloadBuffer
        return new Uint8Array(payloadBuffer.slice(0));
      },
      dispose: async () => {
        if (!disposed) {
          disposed = true;
          URL.revokeObjectURL(payloadUrl);
        }
      },
    };

    return doc;
  }

  async saveExtractedCopy(doc: OpenedDocument): Promise<void> {
    const bytes = await doc.readPayloadBytes();
    if (bytes.length === 0) {
      throw new Error("I dati estratti sono vuoti (0 bytes)");
    }

    const blob = new Blob([bytes as unknown as BlobPart], {
      type: doc.report.mimeType || "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.report.extractedFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    // Dispatch global toast event for Italian legal reminder
    window.dispatchEvent(
      new CustomEvent("p7m:toast", {
        detail: {
          message: DOWNLOAD_LEGAL_REMINDER,
          type: "info",
        },
      })
    );
  }
}
