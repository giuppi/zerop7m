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
      <div className="h-10 bg-white dark:bg-[#171A21] border-b border-[#E2E5EB] dark:border-[#262B36] px-4 flex items-center justify-between text-xs text-[#525C6E] dark:text-[#9CA3AF] z-10 select-none">
        <span className="font-mono truncate">{fileName}</span>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.25))}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Riduci zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-mono text-gray-700 dark:text-gray-300">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.25, 4))}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Aumenta zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Adatta all'area"
          >
            <Maximize2 className="w-4 h-4" />
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
