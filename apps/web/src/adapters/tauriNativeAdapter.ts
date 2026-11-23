import {
  type EngineAdapter,
  type OpenedDocument,
  type P7MInspectionReport,
  P7MInspectionReportSchema,
} from "@zerop7m/shared-types";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

export const DOWNLOAD_LEGAL_REMINDER =
  "Copia estratta solo per lettura e stampa. Conserva sempre il file .p7m originale per il valore legale.";

export class TauriNativeAdapter implements EngineAdapter {
  readonly runtime = "tauri-native" as const;

  async inspectFile(file: File): Promise<OpenedDocument> {
    const buffer = await file.arrayBuffer();
    const bytes = Array.from(new Uint8Array(buffer));
    const rawReport = await invoke<P7MInspectionReport>("inspect_p7m_bytes", {
      fileName: file.name,
      bytes,
    });
    return this.createOpenedDocument(rawReport);
  }

  async inspectPath(pathOrUri: string): Promise<OpenedDocument> {
    const rawReport = await invoke<P7MInspectionReport>("inspect_p7m_path", {
      pathOrUri,
    });
    return this.createOpenedDocument(rawReport);
  }

  private createOpenedDocument(rawReport: P7MInspectionReport): OpenedDocument {
    const report = P7MInspectionReportSchema.parse(rawReport);
    const payloadUrl = `p7m://localhost/session/${report.sessionId}`;
    let disposed = false;

    return {
      report,
      payloadUrl,
      readPayloadBytes: async () => {
        try {
          const raw = await invoke<number[] | Uint8Array>("get_session_bytes", {
            sessionId: report.sessionId,
          });
          return raw instanceof Uint8Array ? raw : new Uint8Array(raw);
        } catch {
          // Fallback to fetch for webviews supporting custom protocols under relaxed CSP
          const response = await fetch(payloadUrl);
          if (!response.ok) {
            throw new Error(`Errore caricamento payload: HTTP ${response.status}`);
          }
          const buf = await response.arrayBuffer();
          return new Uint8Array(buf);
        }
      },
      dispose: async () => {
        if (!disposed) {
          disposed = true;
          try {
            await invoke("release_session", { sessionId: report.sessionId });
          } catch {
            // Ignore cleanup errors on shutdown
          }
        }
      },
    };
  }

  private dispatchLegalReminder(): void {
    window.dispatchEvent(
      new CustomEvent("p7m:toast", {
        detail: {
          message: DOWNLOAD_LEGAL_REMINDER,
          type: "info",
        },
      })
    );
  }

  async saveExtractedCopy(doc: OpenedDocument): Promise<void> {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    // On mobile devices, file systems use content:// URIs not writable by POSIX std::fs.
    // Use Web Share API (native share/save sheet) or blob download fallback.
    if (isMobile) {
      await this.shareExtractedCopy(doc);
      return;
    }

    const selectedPath = await save({
      defaultPath: doc.report.extractedFileName,
      title: "Salva copia estratta",
    });

    if (!selectedPath) {
      return;
    }

    await invoke("save_extracted_file", {
      sessionId: doc.report.sessionId,
      targetPath: selectedPath,
    });

    this.dispatchLegalReminder();
  }

  async shareExtractedCopy(doc: OpenedDocument): Promise<void> {
    try {
      const bytes = await doc.readPayloadBytes();
      if (bytes.length === 0) {
        throw new Error("I dati estratti sono vuoti (0 bytes)");
      }

      if (navigator.share) {
        const file = new File([bytes as unknown as BlobPart], doc.report.extractedFileName, {
          type: doc.report.mimeType || "application/octet-stream",
        });

        const canShare = navigator.canShare ? navigator.canShare({ files: [file] }) : true;
        if (canShare) {
          await navigator.share({
            files: [file],
            title: doc.report.extractedFileName,
          });
          this.dispatchLegalReminder();
          return;
        }
      }

      // Browser blob fallback
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
      this.dispatchLegalReminder();
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") {
        return; // User cancelled share sheet
      }
      console.error("Errore salvataggio/condivisione mobile:", err);
      throw err;
    }
  }
}
