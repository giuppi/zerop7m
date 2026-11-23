import React from "react";
import {
  FileText,
  Download,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Layers,
  RotateCcw,
} from "lucide-react";
import type { OpenedDocument } from "@zerop7m/shared-types";

interface HeaderBarProps {
  doc: OpenedDocument;
  onOpenAnother: () => void;
  onDownload: () => void;
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  doc,
  onOpenAnother,
  onDownload,
  isDrawerOpen,
  onToggleDrawer,
}) => {
  const { report } = doc;
  const outerLayer = report.layers[0];
  const allSigners = report.layers.flatMap((l) => l.signers);
  const allVerified =
    allSigners.length > 0 &&
    allSigners.every((s) => s.integrity === "VERIFIED_LOCAL");
  const hasMismatch = allSigners.some(
    (s) => s.integrity === "DIGEST_MISMATCH" || s.integrity === "SIGNATURE_INVALID"
  );

  return (
    <header className="min-h-[52px] pt-[env(safe-area-inset-top,0px)] bg-white dark:bg-[#171A21] border-b border-[#E2E5EB] dark:border-[#262B36] px-4 pl-[max(env(safe-area-inset-left,0px),1rem)] pr-[max(env(safe-area-inset-right,0px),1rem)] flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Document info */}
      <div className="flex items-center space-x-3 min-w-0">
        <div className="flex items-center space-x-2 min-w-0">
          <FileText className="w-5 h-5 text-[#1E40AF] shrink-0" />
          <h1
            className="text-sm font-semibold truncate text-[#111827] dark:text-[#F3F4F6] max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg"
            title={report.originalFileName}
          >
            {report.extractedFileName}
          </h1>
          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[#525C6E] dark:text-[#9CA3AF] shrink-0">
            .p7m
          </span>
        </div>

        {report.layers.length > 1 && (
          <span className="hidden md:inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#1E40AF] dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono">
            <Layers className="w-3 h-3 mr-1" />
            {report.layers.length} livelli
          </span>
        )}
      </div>

      {/* Center / Right: Integrity Pill & Actions */}
      <div className="flex items-center space-x-2">
        {/* Integrity badge */}
        <button
          onClick={onToggleDrawer}
          className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
            hasMismatch
              ? "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]"
              : allVerified
              ? "bg-[#ECFDF5] text-[#166534] border-[#BBF7D0]"
              : "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]"
          }`}
          title="Mostra dettagli firme"
        >
          {hasMismatch ? (
            <ShieldAlert className="w-3.5 h-3.5 mr-1 shrink-0" />
          ) : allVerified ? (
            <ShieldCheck className="w-3.5 h-3.5 mr-1 shrink-0" />
          ) : (
            <Shield className="w-3.5 h-3.5 mr-1 shrink-0" />
          )}
          <span>
            {hasMismatch
              ? "Firma Non Conforme"
              : allVerified
              ? "Integrità verificata (locale)"
              : "Firma presente"}
          </span>
        </button>

        {/* Download extracted copy */}
        <button
          onClick={onDownload}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded transition-colors shadow-xs"
          title="Estrai e salva una copia"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          <span className="hidden sm:inline">Estrai Copia</span>
        </button>

        {/* Toggle Drawer */}
        <button
          onClick={onToggleDrawer}
          className={`p-1.5 rounded transition-colors ${
            isDrawerOpen
              ? "bg-blue-50 dark:bg-blue-900/40 text-[#1E40AF] dark:text-blue-300"
              : "text-[#525C6E] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
          title="Dettagli firma e certificati"
          aria-label="Dettagli firma"
        >
          <Shield className="w-4 h-4" />
        </button>

        {/* Open Another */}
        <button
          onClick={onOpenAnother}
          className="p-1.5 text-[#525C6E] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Apri un altro file"
          aria-label="Apri un altro file"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
