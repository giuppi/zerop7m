import React, { useRef } from "react";
import { UploadCloud, FileText, Lock, FileCheck, ShieldAlert } from "lucide-react";

interface EmptyDropZoneProps {
  onFileSelected: (file: File) => void;
  isDragging: boolean;
}

export const EmptyDropZone: React.FC<EmptyDropZoneProps> = ({
  onFileSelected,
  isDragging,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file) {
        onFileSelected(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file) {
        onFileSelected(file);
      }
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`min-h-screen flex flex-col items-center justify-between p-6 pt-[max(env(safe-area-inset-top,0px),1.5rem)] pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] pl-[max(env(safe-area-inset-left,0px),1.5rem)] pr-[max(env(safe-area-inset-right,0px),1.5rem)] transition-colors select-none ${
        isDragging
          ? "bg-blue-50/80 dark:bg-blue-950/20 border-2 border-dashed border-[#1E40AF]"
          : "bg-[#F4F5F7] dark:bg-[#0F1115]"
      }`}
    >
      <header className="w-full max-w-4xl flex items-center justify-between py-2">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded bg-[#1E40AF] text-white flex items-center justify-center font-bold text-xs tracking-tight">
            0P7
          </div>
          <span className="font-semibold text-base tracking-tight text-[#111827] dark:text-[#F3F4F6]">
            ZeroP7M
          </span>
        </div>
        <span className="text-xs text-[#525C6E] dark:text-[#9CA3AF]">
          OpenCAdES • 100% Locale • Zero-Cloud
        </span>
      </header>

      {/* Main tactile drop container */}
      <main className="w-full max-w-xl my-auto py-12 px-6 flex flex-col items-center text-center">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="group w-full bg-white dark:bg-[#171A21] border border-[#E2E5EB] dark:border-[#262B36] hover:border-[#1E40AF] dark:hover:border-[#1E40AF] rounded-2xl p-10 flex flex-col items-center cursor-pointer shadow-xs hover:shadow-md transition-all duration-200"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".p7m,.P7M,application/pkcs7-mime,application/x-pkcs7-mime,application/pkcs7-signature,application/x-pkcs7-signature,application/octet-stream,*/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#1E40AF] dark:text-blue-300 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-200">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-semibold text-[#111827] dark:text-[#F3F4F6] mb-2">
            Trascina qui un file <code className="text-[#1E40AF] bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded text-lg font-mono">.p7m</code>
          </h2>

          <p className="text-sm text-[#525C6E] dark:text-[#9CA3AF] mb-6 max-w-md">
            Visualizza PDF firmati, Fatture Elettroniche PA/B2B, immagini o documenti CAdES senza installare software proprietari.
          </p>

          <button
            type="button"
            className="min-h-[44px] px-6 py-2.5 bg-[#1E40AF] hover:bg-[#1D4ED8] active:bg-[#1e3a8a] text-white text-sm font-medium rounded-lg shadow-xs transition-colors flex items-center justify-center cursor-pointer"
          >
            Scegli dal dispositivo
          </button>
        </div>

        {/* Recent format badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-8 text-xs text-[#525C6E] dark:text-[#9CA3AF]">
          <span className="flex items-center px-2.5 py-1 rounded-md bg-white dark:bg-[#171A21] border border-[#E2E5EB] dark:border-[#262B36]">
            <FileText className="w-3.5 h-3.5 mr-1.5 text-red-500" />
            PDF Firmati
          </span>
          <span className="flex items-center px-2.5 py-1 rounded-md bg-white dark:bg-[#171A21] border border-[#E2E5EB] dark:border-[#262B36]">
            <FileCheck className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
            FatturaPA XML (AssoSoftware / AdE)
          </span>
          <span className="flex items-center px-2.5 py-1 rounded-md bg-white dark:bg-[#171A21] border border-[#E2E5EB] dark:border-[#262B36]">
            <Lock className="w-3.5 h-3.5 mr-1.5 text-green-600" />
            Buste Annidate CAdES
          </span>
        </div>
      </main>

      {/* Privacy Guarantee Pill (Footer) */}
      <footer className="w-full max-w-xl pb-4">
        <div className="flex items-center justify-center space-x-2 text-xs text-[#525C6E] dark:text-[#9CA3AF] bg-white dark:bg-[#171A21] border border-[#E2E5EB] dark:border-[#262B36] py-2 px-4 rounded-full shadow-xs">
          <Lock className="w-3.5 h-3.5 text-green-600 shrink-0" />
          <span>
            100% locale e offline — i tuoi file non lasciano mai questo dispositivo.
          </span>
        </div>
      </footer>
    </div>
  );
};
