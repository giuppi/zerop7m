import { describe, it, expect, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { useDocumentSession } from "../hooks/useDocumentSession";
import type { EngineAdapter, OpenedDocument, P7MInspectionReport } from "@zerop7m/shared-types";

describe("useDocumentSession State Machine & Cleanup Invariant", () => {
  const createMockDoc = (id: string, fileName: string): OpenedDocument => {
    const report: P7MInspectionReport = {
      sessionId: id,
      originalFileName: fileName,
      extractedFileName: fileName.replace(/\.p7m$/i, ""),
      payloadSizeBytes: 1024,
      mimeType: "application/pdf",
      documentKind: "PDF",
      layers: [],
      warnings: [],
    };

    return {
      report,
      payloadUrl: "blob:http://localhost/" + id,
      readPayloadBytes: async () => new Uint8Array([1, 2, 3]),
      dispose: vi.fn().mockResolvedValue(undefined),
    };
  };

  it("guarantees dispose() is called on previous document when switching documents", async () => {
    const doc1 = createMockDoc("doc-1", "first.pdf.p7m");
    const doc2 = createMockDoc("doc-2", "second.pdf.p7m");

    let callCount = 0;
    const mockAdapter: EngineAdapter = {
      runtime: "web-wasm",
      inspectFile: vi.fn().mockImplementation(async () => {
        callCount++;
        return callCount === 1 ? doc1 : doc2;
      }),
      saveExtractedCopy: vi.fn(),
    };

    let session: ReturnType<typeof useDocumentSession>;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    function Harness() {
      session = useDocumentSession(mockAdapter);
      return null;
    }

    await act(async () => {
      root.render(React.createElement(Harness));
    });

    expect(session!.state.status).toBe("idle");

    // Open first file
    const file1 = new File(["dummy"], "first.pdf.p7m", { type: "application/pkcs7-mime" });
    await act(async () => {
      await session!.openFile(file1);
    });

    expect(session!.state.status).toBe("ready");
    if (session!.state.status === "ready") {
      expect(session!.state.doc.report.sessionId).toBe("doc-1");
    }
    expect(doc1.dispose).not.toHaveBeenCalled();

    // Open second file -> doc1 MUST be disposed immediately
    const file2 = new File(["dummy2"], "second.pdf.p7m", { type: "application/pkcs7-mime" });
    await act(async () => {
      await session!.openFile(file2);
    });

    expect(doc1.dispose).toHaveBeenCalledTimes(1);
    expect(session!.state.status).toBe("ready");
    if (session!.state.status === "ready") {
      expect(session!.state.doc.report.sessionId).toBe("doc-2");
    }
    expect(doc2.dispose).not.toHaveBeenCalled();

    // Close document -> doc2 disposed
    await act(async () => {
      await session!.closeDocument();
    });

    expect(doc2.dispose).toHaveBeenCalledTimes(1);
    expect(session!.state.status).toBe("idle");

    // Cleanup container
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});
