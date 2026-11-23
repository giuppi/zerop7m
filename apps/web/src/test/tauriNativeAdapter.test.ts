import { describe, it, expect, vi, beforeEach } from "vitest";
import { TauriNativeAdapter, DOWNLOAD_LEGAL_REMINDER } from "../adapters/tauriNativeAdapter";
import type { P7MInspectionReport } from "@zerop7m/shared-types";

// Mock @tauri-apps/api/core
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Mock @tauri-apps/plugin-dialog
const mockSave = vi.fn();
vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: (...args: unknown[]) => mockSave(...args),
}));

describe("TauriNativeAdapter (CONTRACTS.md §3, §5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "inspect_p7m_bytes" || cmd === "inspect_p7m_path") {
        return Promise.resolve(sampleReport);
      }
      return Promise.resolve();
    });
  });

  const sampleReport: P7MInspectionReport = {
    sessionId: "550e8400-e29b-41d4-a716-446655440000",
    originalFileName: "documento.pdf.p7m",
    extractedFileName: "documento.pdf",
    payloadSizeBytes: 1024,
    mimeType: "application/pdf",
    documentKind: "PDF",
    layers: [],
    warnings: [],
  };

  it("has runtime set to 'tauri-native'", () => {
    const adapter = new TauriNativeAdapter();
    expect(adapter.runtime).toBe("tauri-native");
  });

  it("inspectFile invokes inspect_p7m_bytes and formats p7m:// URL", async () => {
    const adapter = new TauriNativeAdapter();
    const fakeFile = {
      name: "documento.pdf.p7m",
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    } as unknown as File;

    const doc = await adapter.inspectFile(fakeFile);

    expect(mockInvoke).toHaveBeenCalledWith(
      "inspect_p7m_bytes",
      expect.objectContaining({
        fileName: "documento.pdf.p7m",
      })
    );
    expect(doc.report.sessionId).toBe(sampleReport.sessionId);
    expect(doc.payloadUrl).toBe(`p7m://localhost/session/${sampleReport.sessionId}`);
  });

  it("inspectPath invokes inspect_p7m_path", async () => {
    const adapter = new TauriNativeAdapter();
    const doc = await adapter.inspectPath("C:\\Users\\test\\doc.pdf.p7m");

    expect(mockInvoke).toHaveBeenCalledWith("inspect_p7m_path", {
      pathOrUri: "C:\\Users\\test\\doc.pdf.p7m",
    });
    expect(doc.report.sessionId).toBe(sampleReport.sessionId);
    expect(doc.payloadUrl).toBe(`p7m://localhost/session/${sampleReport.sessionId}`);
  });

  it("doc.dispose invokes release_session only once", async () => {
    const adapter = new TauriNativeAdapter();
    const doc = await adapter.inspectPath("test.p7m");

    await doc.dispose();
    expect(mockInvoke).toHaveBeenCalledWith("release_session", {
      sessionId: sampleReport.sessionId,
    });

    // Second call should be a no-op
    await doc.dispose();
    expect(mockInvoke).toHaveBeenCalledTimes(2); // 1 inspect + 1 release
  });

  it("saveExtractedCopy opens save dialog and invokes save_extracted_file", async () => {
    mockSave.mockResolvedValueOnce("C:\\Users\\test\\saved_doc.pdf");

    const toastListener = vi.fn();
    window.addEventListener("p7m:toast", toastListener);

    const adapter = new TauriNativeAdapter();
    const doc = await adapter.inspectPath("test.p7m");

    await adapter.saveExtractedCopy(doc);

    expect(mockSave).toHaveBeenCalledWith({
      defaultPath: "documento.pdf",
      title: "Salva copia estratta",
    });

    expect(mockInvoke).toHaveBeenCalledWith("save_extracted_file", {
      sessionId: sampleReport.sessionId,
      targetPath: "C:\\Users\\test\\saved_doc.pdf",
    });

    expect(toastListener).toHaveBeenCalled();
    const event = toastListener.mock.calls[0][0] as CustomEvent;
    expect(event.detail.message).toBe(DOWNLOAD_LEGAL_REMINDER);

    window.removeEventListener("p7m:toast", toastListener);
  });

  it("readPayloadBytes invokes get_session_bytes and returns Uint8Array without network fetch", async () => {
    const fakeBytes = [10, 20, 30, 40];
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "inspect_p7m_path") return Promise.resolve(sampleReport);
      if (cmd === "get_session_bytes") return Promise.resolve(fakeBytes);
      return Promise.resolve();
    });

    const adapter = new TauriNativeAdapter();
    const doc = await adapter.inspectPath("test.p7m");
    const bytes = await doc.readPayloadBytes();

    expect(mockInvoke).toHaveBeenCalledWith("get_session_bytes", {
      sessionId: sampleReport.sessionId,
    });
    expect(bytes).toEqual(new Uint8Array(fakeBytes));
  });
});
