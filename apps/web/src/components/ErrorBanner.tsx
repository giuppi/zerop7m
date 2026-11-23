import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import type { P7MError } from "@zerop7m/shared-types";

interface ErrorBannerProps {
  error: P7MError;
  onRetry: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ error, onRetry }) => {
  const getItalianMessage = (code: string, originalMsg: string) => {
    switch (code) {
      case "DETACHED_NO_CONTENT":
        return "Firma disgiunta (detached): la busta .p7m contiene solo la firma digitale ma nessun contenuto allegato da visualizzare.";
      case "UNSUPPORTED_CMS_TYPE":
        return "Formato crittografico non supportato: il file potrebbe essere una busta crittografata (EnvelopedData) anziché firmata (SignedData).";
      case "MAX_NESTING_EXCEEDED":
        return "Busta eccessivamente annidata: il documento supera il limite di sicurezza di 10 livelli di firma.";
      case "FILE_TOO_LARGE":
        return "File troppo grande: supera la dimensione massima consentita di 250 MB per l'elaborazione locale nel browser.";
      case "INVALID_FORMAT":
      case "CORRUPT_PAYLOAD":
        return "File non valido o danneggiato: la struttura ASN.1 o la codifica Base64 non corrisponde a una busta PKCS#7 / CAdES.";
      default:
        return originalMsg || "Si è verificato un errore durante l'apertura del documento .p7m.";
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] dark:bg-[#0F1115] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white dark:bg-[#171A21] border border-[#FECACA] dark:border-red-900/50 rounded-2xl p-8 shadow-xs text-center flex flex-col items-center">
        <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/60 text-[#991B1B] flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <h2 className="text-lg font-semibold text-[#111827] dark:text-[#F3F4F6] mb-2">
          Impossibile aprire il file .p7m
        </h2>

        <p className="text-sm text-[#525C6E] dark:text-[#9CA3AF] mb-6">
          {getItalianMessage(error.code, error.message)}
        </p>

        {error.details && (
          <pre className="w-full text-left bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 rounded-lg text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto mb-6">
            {error.details}
          </pre>
        )}

        <button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white text-sm font-medium rounded-lg transition-colors shadow-xs"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Apri un altro file
        </button>
      </div>
    </div>
  );
};
