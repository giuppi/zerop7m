import React from "react";
import { FileQuestion, Download } from "lucide-react";

interface UnknownFormatCardProps {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  onDownload: () => void;
}

export const UnknownFormatCard: React.FC<UnknownFormatCardProps> = ({
  fileName,
  mimeType,
  sizeBytes,
  onDownload,
}) => {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Byte";
    const k = 1024;
    const sizes = ["Byte", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-[#F4F5F7] dark:bg-[#0F1115]">
      <div className="w-full max-w-md bg-white dark:bg-[#171A21] border border-[#E2E5EB] dark:border-[#262B36] rounded-2xl p-8 text-center flex flex-col items-center shadow-xs">
        <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#1E40AF] dark:text-blue-300 flex items-center justify-center mb-6">
          <FileQuestion className="w-8 h-8" />
        </div>

        <h3 className="text-base font-semibold text-[#111827] dark:text-[#F3F4F6] mb-1 truncate max-w-xs">
          {fileName}
        </h3>

        <div className="text-xs text-[#525C6E] dark:text-[#9CA3AF] space-y-1 mb-6">
          <div>Tipo MIME rilevato: <span className="font-mono font-medium">{mimeType}</span></div>
          <div>Dimensione: <span className="font-mono font-medium">{formatSize(sizeBytes)}</span></div>
        </div>

        <p className="text-xs text-[#525C6E] dark:text-[#9CA3AF] mb-6">
          Questo tipo di file non dispone di un'anteprima visiva integrata nel browser, ma il contenuto è stato estratto con successo e verificato crittograficamente.
        </p>

        <button
          onClick={onDownload}
          className="inline-flex items-center px-4 py-2.5 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white text-sm font-medium rounded-lg transition-colors shadow-xs"
        >
          <Download className="w-4 h-4 mr-2" />
          Estrai e Salva File
        </button>
      </div>
    </div>
  );
};
