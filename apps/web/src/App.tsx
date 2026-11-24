import React, { useState, useEffect, useMemo, useCallback } from "react";
import { isTauri, invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { WebWasmAdapter } from "./adapters/web-wasm.adapter";
import { TauriNativeAdapter } from "./adapters/tauriNativeAdapter";
import { useDocumentSession } from "./hooks/useDocumentSession";
import { HeaderBar } from "./components/HeaderBar";
import { EmptyDropZone } from "./components/EmptyDropZone";
import { ErrorBanner } from "./components/ErrorBanner";
import { DocumentStage } from "./components/DocumentStage";
import { SignatureDrawer } from "./components/SignatureDrawer";
import { AboutModal } from "./components/AboutModal";
import { Info, X } from "lucide-react";

export const App: React.FC = () => {
  const adapter = useMemo(() => {
    return isTauri() ? new TauriNativeAdapter() : new WebWasmAdapter();
  }, []);
  const { state, openFile, openPath, closeDocument } = useDocumentSession(adapter);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Hook cold-start get_launch_file() and warm-start zerop7m://open-file event
  useEffect(() => {
    if (!isTauri()) return;

    // Check cold-start launch file
    invoke<string | null>("get_launch_file")
      .then((launchFile) => {
        if (launchFile) {
          openPath(launchFile);
        }
      })
      .catch((err) => {
        console.warn("Failed to get launch file:", err);
      });

    // Listen for warm-start events (second instance or OS open)
    const unlistenPromise = listen<{ pathOrUri: string }>(
      "zerop7m://open-file",
      (event) => {
        if (event.payload?.pathOrUri) {
          openPath(event.payload.pathOrUri);
        }
      }
    );

    return () => {
      unlistenPromise.then((unlisten) => unlisten()).catch(() => {});
    };
  }, [openPath]);

  // Global Toast event listener
  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string }>;
      setToastMessage(customEvent.detail.message);
      setTimeout(() => {
        setToastMessage(null);
      }, 5000);
    };

    window.addEventListener("p7m:toast", handleToast);
    return () => window.removeEventListener("p7m:toast", handleToast);
  }, []);

  // Keyboard navigation: Escape closes modal or drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isAboutOpen) {
          setIsAboutOpen(false);
        } else if (isDrawerOpen) {
          setIsDrawerOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAboutOpen, isDrawerOpen]);

  // Global drag-and-drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file) {
        openFile(file);
      }
    }
  };

  const handleDownload = useCallback(async () => {
    if (state.status === "ready") {
      try {
        await adapter.saveExtractedCopy(state.doc);
      } catch (err) {
        console.error("Errore salvataggio copia:", err);
      }
    }
  }, [state, adapter]);

  // Loading indicator overlay or empty state
  if (state.status === "loading") {
    return (
      <div className="min-h-screen bg-[#F4F5F7] dark:bg-[#0F1115] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-3 border-[#1E40AF] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-medium text-[#111827] dark:text-[#F3F4F6] mb-1">
          Apertura del file {state.fileName}...
        </h2>
        <p className="text-xs text-[#525C6E] dark:text-[#9CA3AF]">
          Verifica crittografica e unwrap locale in corso...
        </p>
      </div>
    );
  }

  if (state.status === "error") {
    return <ErrorBanner error={state.error} onRetry={closeDocument} />;
  }

  if (state.status === "idle") {
    return (
      <>
        <EmptyDropZone
          onFileSelected={openFile}
          isDragging={isDragging}
          onOpenAbout={() => setIsAboutOpen(true)}
        />
        <AboutModal
          isOpen={isAboutOpen}
          onClose={() => setIsAboutOpen(false)}
        />
      </>
    );
  }

  // Ready State: Main Document Viewport
  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="min-h-screen h-screen flex flex-col bg-[#F4F5F7] dark:bg-[#0F1115] relative overflow-hidden"
    >
      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-[#1E40AF]/15 backdrop-blur-xs border-4 border-dashed border-[#1E40AF] flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-[#171A21] px-6 py-4 rounded-xl shadow-lg font-medium text-sm text-[#1E40AF]">
            Rilascia per aprire il file .p7m
          </div>
        </div>
      )}

      {/* 52px Fixed Sticky Toolbar */}
      <HeaderBar
        doc={state.doc}
        onOpenAnother={closeDocument}
        onDownload={handleDownload}
        isDrawerOpen={isDrawerOpen}
        onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
        onOpenAbout={() => setIsAboutOpen(true)}
      />

      {/* Main Document Stage (Occupies >= 80% screen area) */}
      <main className="flex-1 flex overflow-hidden relative">
        <DocumentStage doc={state.doc} onDownload={handleDownload} />

        {/* 360px Collapsible Right Signature Drawer */}
        <SignatureDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          report={state.doc.report}
          onOpenAbout={() => setIsAboutOpen(true)}
        />
      </main>

      {/* About & Credits Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      {/* Toast Notification (Italian legal copy) */}
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[90%] bg-[#111827] text-white text-xs px-4 py-3 rounded-lg shadow-xl flex items-start space-x-3 transition-opacity">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <span className="flex-1 leading-relaxed">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-gray-400 hover:text-white p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
