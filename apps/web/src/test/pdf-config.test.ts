import { describe, it, expect } from "vitest";
import { getPdfLoadingParams } from "../services/pdf-config";

describe("PDF Viewer Hardening Config (SECURITY.md §2)", () => {
  it("enforces isEvalSupported: false to neutralize PDF JS execution exploits for URL source", () => {
    const sampleUrl = "blob:http://localhost/sample-pdf";
    const params = getPdfLoadingParams(sampleUrl);

    expect(params.url).toBe(sampleUrl);
    expect(params.isEvalSupported).toBe(false);
    expect(params.cMapPacked).toBe(true);
  });

  it("supports in-memory Uint8Array data source to bypass CSP connect-src network fetches", () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const params = getPdfLoadingParams(bytes);

    expect(params.data).toBe(bytes);
    expect(params.isEvalSupported).toBe(false);
    expect(params.cMapPacked).toBe(true);
  });
});
