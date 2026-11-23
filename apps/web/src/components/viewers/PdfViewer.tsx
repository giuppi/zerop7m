import React, { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { ZoomIn, ZoomOut, Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
import { configurePdfjs, getPdfLoadingParams } from "../../services/pdf-config";

configurePdfjs();

interface PdfViewerProps {
  url?: string;
  readBytes?: () => Promise<Uint8Array>;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ url, readBytes }) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<"single" | "continuous">("single");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const singleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTasks = useRef<Map<number, any>>(new Map());
  const initialFitDone = useRef<boolean>(false);

  // Load PDF Document in-memory directly without triggering CSP connect-src network fetches
  useEffect(() => {
    let cancelled = false;
    let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;
    setLoading(true);
    setError(null);
    initialFitDone.current = false;
    setCurrentPage(1);

    const initDoc = async () => {
      try {
        let source: string | Uint8Array;
        if (readBytes) {
          source = await readBytes();
        } else if (url) {
          source = url;
        } else {
          throw new Error("Nessuna sorgente dati per il documento PDF");
        }

        if (cancelled) return;

        loadingTask = pdfjsLib.getDocument(getPdfLoadingParams(source));
        const doc = await loadingTask.promise;

        if (!cancelled) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            "Impossibile visualizzare il file PDF: " +
              (err instanceof Error ? err.message : String(err))
          );
          setLoading(false);
        }
      }
    };

    initDoc();

    return () => {
      cancelled = true;
      if (loadingTask) {
        loadingTask.destroy();
      }
    };
  }, [url, readBytes]);

  // Render a specific page onto a given canvas
  const renderPageToCanvas = useCallback(
    async (pageIndex: number, canvas: HTMLCanvasElement | null) => {
      if (!pdfDoc || !canvas) return;
      const pageNum = pageIndex + 1;

      // Cancel any ongoing render task for this page number
      const existingTask = renderTasks.current.get(pageNum);
      if (existingTask) {
        existingTask.cancel();
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        // Update container dimensions for the page in continuous mode
        const pageContainer = pageRefs.current[pageIndex];
        if (pageContainer) {
          pageContainer.style.width = `${Math.floor(viewport.width)}px`;
          pageContainer.style.height = `${Math.floor(viewport.height)}px`;
        }

        // High-DPI support
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
          canvas: canvas,
        };

        const renderTask = page.render(renderContext);
        renderTasks.current.set(pageNum, renderTask);

        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error(`Error rendering page ${pageNum}:`, err);
        }
      } finally {
        renderTasks.current.delete(pageNum);
      }
    },
    [pdfDoc, scale]
  );

  // Render page in continuous mode using pageRefs/canvasRefs arrays
  const renderContinuousPage = useCallback(
    (pageIndex: number) => {
      const canvas = canvasRefs.current[pageIndex];
      renderPageToCanvas(pageIndex, canvas);
    },
    [renderPageToCanvas]
  );

  // Calculate and apply Fit-to-Page scale
  const fitToPage = useCallback(async () => {
    if (!pdfDoc || !containerRef.current) return;
    try {
      const page = await pdfDoc.getPage(currentPage || 1);
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const container = containerRef.current;
      const padX = 36;
      const padY = 36;
      const availableWidth = Math.max(container.clientWidth - padX, 200);
      const availableHeight = Math.max(container.clientHeight - padY, 200);

      const scaleX = availableWidth / unscaledViewport.width;
      const scaleY = availableHeight / unscaledViewport.height;

      // Fit entire page in both dimensions so it is visible without scroll
      const optimalScale = Math.min(scaleX, scaleY);
      const clamped = Math.max(0.3, Math.min(Math.round(optimalScale * 100) / 100, 3.0));
      setScale(clamped);
    } catch (err) {
      console.error("Error calculating fit-to-page:", err);
    }
  }, [pdfDoc, currentPage]);

  // Initial fit to page on document load
  useEffect(() => {
    if (!loading && pdfDoc && !initialFitDone.current) {
      initialFitDone.current = true;
      requestAnimationFrame(() => {
        fitToPage();
      });
    }
  }, [loading, pdfDoc, fitToPage]);

  // Single page rendering effect: runs on page, scale, or viewMode change
  useEffect(() => {
    if (viewMode === "single" && pdfDoc && !loading) {
      renderPageToCanvas(currentPage - 1, singleCanvasRef.current);
    }
  }, [viewMode, currentPage, scale, pdfDoc, loading, renderPageToCanvas]);

  // Continuous mode: lazy render visible pages using IntersectionObserver
  useEffect(() => {
    if (viewMode !== "continuous" || !pdfDoc || numPages === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageIndex = Number(entry.target.getAttribute("data-page-index"));
            if (!isNaN(pageIndex)) {
              renderContinuousPage(pageIndex);
            }
          }
        });
      },
      {
        root: containerRef.current,
        rootMargin: "300px 0px",
        threshold: 0.1,
      }
    );

    pageRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      observer.disconnect();
    };
  }, [viewMode, pdfDoc, numPages, renderContinuousPage]);

  // Continuous mode: re-render visible pages on scale change
  useEffect(() => {
    if (viewMode !== "continuous" || !pdfDoc) return;
    pageRefs.current.forEach((ref, index) => {
      if (ref) {
        const rect = ref.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          renderContinuousPage(index);
        }
      }
    });
  }, [viewMode, scale, pdfDoc, renderContinuousPage]);

  // Continuous mode: track active visible page based on scroll position
  const updateCurrentPageFromScroll = useCallback(() => {
    if (viewMode !== "continuous" || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerTop = containerRect.top;

    let activePage = 1;
    let minDistance = Infinity;

    pageRefs.current.forEach((ref, index) => {
      if (!ref) return;
      const rect = ref.getBoundingClientRect();
      const distance = Math.abs(rect.top - containerTop);
      if (rect.bottom > containerTop + 20 && distance < minDistance) {
        minDistance = distance;
        activePage = index + 1;
      }
    });

    setCurrentPage(activePage);
  }, [viewMode]);

  // Zoom controls
  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.4));
  };

  // Page navigation
  const handlePageChange = useCallback(
    (targetPage: number) => {
      const pageNum = Math.max(1, Math.min(numPages, targetPage));
      setCurrentPage(pageNum);

      if (viewMode === "single") {
        containerRef.current?.scrollTo({ top: 0, left: 0 });
      } else {
        const targetRef = pageRefs.current[pageNum - 1];
        if (targetRef && containerRef.current) {
          targetRef.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    },
    [numPages, viewMode]
  );

  // Switch between Single page and Continuous view modes
  const handleViewModeChange = (newMode: "single" | "continuous") => {
    if (newMode === viewMode) return;
    setViewMode(newMode);

    if (newMode === "single") {
      containerRef.current?.scrollTo({ top: 0, left: 0 });
    } else {
      setTimeout(() => {
        const targetRef = pageRefs.current[currentPage - 1];
        if (targetRef && containerRef.current) {
          targetRef.scrollIntoView({ behavior: "auto", block: "start" });
        }
      }, 50);
    }
  };

  // Keyboard navigation: Left/Right arrows and PageUp/PageDown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        if (numPages > 1 && currentPage > 1) {
          e.preventDefault();
          handlePageChange(currentPage - 1);
        }
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        if (numPages > 1 && currentPage < numPages) {
          e.preventDefault();
          handlePageChange(currentPage + 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [numPages, currentPage, handlePageChange]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#1E40AF] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[#525C6E] dark:text-[#9CA3AF]">
            Caricamento e rendering documento PDF...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 p-6 rounded-xl max-w-md text-center">
          <p className="text-sm font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#E5E7EB] dark:bg-[#0B0C0E] overflow-hidden select-none">
      {/* Viewer Floating/Sub-toolbar */}
      <div className="min-h-[46px] sm:h-10 bg-white dark:bg-[#171A21] border-b border-[#E2E5EB] dark:border-[#262B36] px-2 sm:px-4 py-1 sm:py-0 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none text-xs text-[#525C6E] dark:text-[#9CA3AF] z-10 shadow-xs select-none">
        {/* Left Section: Mode Switch & Page Navigation (hidden if only 1 page) */}
        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
          {numPages > 1 && (
            <>
              {/* Single / Continuous View Mode Switch */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-[#E2E5EB] dark:border-[#262B36] mr-1 shrink-0">
                <button
                  onClick={() => handleViewModeChange("single")}
                  className={`h-8 sm:h-7 px-2.5 sm:px-2 rounded-md text-xs sm:text-[11px] font-medium flex items-center justify-center transition-colors ${
                    viewMode === "single"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white active:bg-gray-200 dark:active:bg-gray-600"
                  }`}
                  title="Visualizza una pagina per videata"
                  aria-label="Modalità pagina singola"
                >
                  Singola
                </button>
                <button
                  onClick={() => handleViewModeChange("continuous")}
                  className={`h-8 sm:h-7 px-2.5 sm:px-2 rounded-md text-xs sm:text-[11px] font-medium flex items-center justify-center transition-colors ${
                    viewMode === "continuous"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white active:bg-gray-200 dark:active:bg-gray-600"
                  }`}
                  title="Visualizza tutte le pagine accodate"
                  aria-label="Modalità pagine accodate"
                >
                  Accodate
                </button>
              </div>

              {/* Page navigation controls */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="h-9 w-9 sm:h-7 sm:w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Pagina precedente (Freccia Sinistra)"
                aria-label="Pagina precedente"
              >
                <ChevronLeft className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
              <span className="px-1 text-xs sm:text-xs whitespace-nowrap">
                <span className="hidden xs:inline">Pagina </span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{currentPage}</span> /{" "}
                <span className="font-semibold text-gray-900 dark:text-gray-100">{numPages}</span>
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= numPages}
                className="h-9 w-9 sm:h-7 sm:w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Pagina successiva (Freccia Destra)"
                aria-label="Pagina successiva"
              >
                <ChevronRight className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
            </>
          )}
        </div>

        {/* Right Section: Zoom Controls & Fit to Page */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
          <button
            onClick={handleZoomOut}
            className="h-9 w-9 sm:h-7 sm:w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors"
            title="Riduci zoom"
            aria-label="Riduci zoom"
          >
            <ZoomOut className="w-4.5 h-4.5 sm:w-4 sm:h-4" />
          </button>
          <span className="w-11 sm:w-12 text-center font-mono text-xs sm:text-[11px] font-medium">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="h-9 w-9 sm:h-7 sm:w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors"
            title="Aumenta zoom"
            aria-label="Aumenta zoom"
          >
            <ZoomIn className="w-4.5 h-4.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={fitToPage}
            className="h-9 w-9 sm:h-7 sm:w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 text-[#1E40AF] dark:text-blue-400 transition-colors"
            title="Adatta alla pagina"
            aria-label="Adatta alla pagina"
          >
            <Maximize2 className="w-4.5 h-4.5 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      </div>

      {/* Pages Container */}
      {viewMode === "single" ? (
        /* Single Page (One per Viewport) */
        <div
          ref={containerRef}
          className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-0"
        >
          <div className="relative inline-block m-auto">
            {numPages > 1 && (
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-mono bg-black/60 dark:bg-black/80 text-white select-none pointer-events-none z-10 backdrop-blur-xs">
                {currentPage} / {numPages}
              </div>
            )}
            <canvas
              key={`single-canvas-${currentPage}`}
              ref={(el) => {
                singleCanvasRef.current = el;
              }}
              className="block shadow-md border border-[#E2E5EB] dark:border-[#262B36] rounded-xs bg-white dark:bg-[#15181F]"
            />
          </div>
        </div>
      ) : (
        /* Continuous Scroll (Appended Pages) */
        <div
          ref={containerRef}
          onScroll={updateCurrentPageFromScroll}
          className="flex-1 overflow-auto p-4 sm:p-8 flex flex-col items-center gap-6 min-h-0"
        >
          {Array.from({ length: numPages }).map((_, index) => (
            <div
              key={`cont-page-${index}`}
              ref={(el) => {
                pageRefs.current[index] = el;
              }}
              data-page-index={index}
              className={`bg-white dark:bg-[#15181F] shadow-md border rounded-xs relative shrink-0 transition-colors duration-150 ${
                currentPage === index + 1
                  ? "border-[#1E40AF]/60 dark:border-blue-500/60 ring-2 ring-[#1E40AF]/15"
                  : "border-[#E2E5EB] dark:border-[#262B36]"
              }`}
              style={{
                width: "fit-content",
                height: "fit-content",
              }}
            >
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-mono bg-black/60 dark:bg-black/80 text-white select-none pointer-events-none z-10 backdrop-blur-xs">
                {index + 1} / {numPages}
              </div>

              <canvas
                ref={(el) => {
                  canvasRefs.current[index] = el;
                }}
                className="block"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
