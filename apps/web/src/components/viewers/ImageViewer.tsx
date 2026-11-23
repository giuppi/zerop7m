import React, { useState } from "react";
import { ZoomIn, ZoomOut, Maximize2, Download } from "lucide-react";

interface ImageViewerProps {
  url: string;
  fileName: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ url, fileName }) => {
  const [zoom, setZoom] = useState<number>(1);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F4F5F7] dark:bg-[#0F1115] overflow-hidden">
      {/* Sub-toolbar */}
      <div className="min-h-[46px] sm:h-10 bg-white dark:bg-[#171A21] border-b border-[#E2E5EB] dark:border-[#262B36] px-3 sm:px-4 py-1 sm:py-0 flex items-center justify-between text-xs text-[#525C6E] dark:text-[#9CA3AF] z-10 select-none shadow-xs">
        <span className="font-mono truncate max-w-[140px] xs:max-w-xs">{fileName}</span>

        <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.25))}
            className="h-9 w-9 sm:h-7 sm:w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 transition-colors"
            title="Riduci zoom"
            aria-label="Riduci zoom"
          >
            <ZoomOut className="w-4.5 h-4.5 sm:w-4 sm:h-4" />
          </button>
          <span className="w-11 sm:w-12 text-center font-mono text-xs sm:text-[11px] font-medium text-gray-700 dark:text-gray-300">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.25, 4))}
            className="h-9 w-9 sm:h-7 sm:w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 transition-colors"
            title="Aumenta zoom"
            aria-label="Aumenta zoom"
          >
            <ZoomIn className="w-4.5 h-4.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="h-9 w-9 sm:h-7 sm:w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 text-[#1E40AF] dark:text-blue-400 transition-colors"
            title="Adatta all'area"
            aria-label="Adatta all'area"
          >
            <Maximize2 className="w-4.5 h-4.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Image stage */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-6">
        <img
          src={url}
          alt={fileName}
          style={{ transform: `scale(${zoom})`, transition: "transform 0.15s ease-out" }}
          className="max-w-full max-h-full object-contain shadow-md rounded bg-white"
        />
      </div>
    </div>
  );
};
