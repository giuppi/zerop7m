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
    <header className="min-h-[56px] sm:min-h-[52px] pt-[env(safe-area-inset-top,0px)] bg-white dark:bg-[#171A21] border-b border-[#E2E5EB] dark:border-[#262B36] px-3 sm:px-4 pl-[max(env(safe-area-inset-left,0px),0.75rem)] pr-[max(env(safe-area-inset-right,0px),0.75rem)] flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Document info */}
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
        <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
          <FileText className="w-5 h-5 text-[#1E40AF] shrink-0" />
          <h1
            className="text-xs sm:text-sm font-semibold truncate text-[#111827] dark:text-[#F3F4F6] max-w-[120px] xs:max-w-[170px] sm:max-w-xs md:max-w-md lg:max-w-lg"
            title={report.originalFileName}
          >
            {report.extractedFileName}
          </h1>
          <span className="text-[11px] sm:text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[#525C6E] dark:text-[#9CA3AF] shrink-0 font-medium">
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

      {/* Center / Right: Integrity Button & Primary Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Prominent Integrity & Signature Drawer Toggle Button */}
        <button
          onClick={onToggleDrawer}
          className={`h-10 sm:h-9 px-2.5 sm:px-3 rounded-lg text-xs font-medium border inline-flex items-center justify-center transition-colors shadow-2xs ${
            hasMismatch
              ? "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA] hover:bg-red-100 active:bg-red-200"
              : allVerified
              ? "bg-[#ECFDF5] text-[#166534] border-[#BBF7D0] hover:bg-emerald-100 active:bg-emerald-200"
              : "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A] hover:bg-amber-100 active:bg-amber-200"
          } ${isDrawerOpen ? "ring-2 ring-offset-1 ring-[#1E40AF]/30 dark:ring-blue-400/40" : ""}`}
          title="Mostra dettagli firme e certificati"
          aria-label="Dettagli firme e certificati"
        >
          {hasMismatch ? (
            <ShieldAlert className="w-4 h-4 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5 shrink-0" />
          ) : allVerified ? (
            <ShieldCheck className="w-4 h-4 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5 shrink-0" />
          ) : (
            <Shield className="w-4 h-4 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5 shrink-0" />
          )}
          <span className="hidden md:inline">
            {hasMismatch
              ? "Firma Non Conforme"
              : allVerified
              ? "Integrità verificata (locale)"
              : "Firma presente"}
          </span>
          <span className="inline md:hidden font-semibold">
            {hasMismatch ? "Non valida" : allVerified ? "Firma OK" : "Firma"}
          </span>
        </button>

        {/* Download extracted copy */}
        <button
          onClick={onDownload}
          className="h-10 sm:h-9 px-3 sm:px-3.5 text-xs font-medium text-white bg-[#1E40AF] hover:bg-[#1D4ED8] active:bg-[#1e3a8a] rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          title="Estrai e salva una copia"
          aria-label="Estrai e salva una copia"
        >
          <Download className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
          <span className="hidden xs:inline">Estrai Copia</span>
        </button>

        {/* Open Another File */}
        <button
          onClick={onOpenAnother}
          className="h-10 w-10 sm:h-9 sm:w-9 rounded-lg inline-flex items-center justify-center text-[#525C6E] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors"
          title="Apri un altro file"
          aria-label="Apri un altro file"
        >
          <RotateCcw className="w-4.5 h-4.5 sm:w-4 sm:h-4" />
        </button>
      </div>
    </header>
  );
};
