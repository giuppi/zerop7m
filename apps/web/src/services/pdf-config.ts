import * as pdfjsLib from "pdfjs-dist";

const getBaseUrl = (): string => {
  const base = import.meta.env.BASE_URL || "./";
  return base.endsWith("/") ? base : `${base}/`;
};

export function configurePdfjs() {
  if (typeof window !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `${getBaseUrl()}assets/pdfjs/pdf.worker.min.mjs`;
  }
}

export function getPdfLoadingParams(source: string | Uint8Array) {
  const base = getBaseUrl();
  if (typeof source === "string") {
    return {
      url: source,
      isEvalSupported: false as const,
      cMapUrl: `${base}assets/pdfjs/cmaps/`,
      cMapPacked: true as const,
    };
  }

  return {
    data: source,
    isEvalSupported: false as const,
    cMapUrl: `${base}assets/pdfjs/cmaps/`,
    cMapPacked: true as const,
  };
}
