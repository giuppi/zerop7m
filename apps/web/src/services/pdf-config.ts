import * as pdfjsLib from "pdfjs-dist";

export function configurePdfjs() {
  if (typeof window !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/assets/pdfjs/pdf.worker.min.mjs";
  }
}

export function getPdfLoadingParams(source: string | Uint8Array) {
  if (typeof source === "string") {
    return {
      url: source,
      isEvalSupported: false as const,
      cMapUrl: "/assets/pdfjs/cmaps/",
      cMapPacked: true as const,
    };
  }

  return {
    data: source,
    isEvalSupported: false as const,
    cMapUrl: "/assets/pdfjs/cmaps/",
    cMapPacked: true as const,
  };
}
