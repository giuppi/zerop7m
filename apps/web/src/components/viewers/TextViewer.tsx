import React, { useState, useEffect } from "react";

interface TextViewerProps {
  readBytes: () => Promise<Uint8Array>;
  fileName: string;
}

export const TextViewer: React.FC<TextViewerProps> = ({ readBytes, fileName }) => {
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    readBytes()
      .then((bytes) => {
        if (!cancelled) {
          const decoder = new TextDecoder("utf-8");
          setText(decoder.decode(bytes));
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setText("Impossibile decodificare il file come testo UTF-8.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [readBytes]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="w-6 h-6 border-2 border-[#1E40AF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const lines = text.split("\n");

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#111418] overflow-hidden font-mono text-xs">
      <div className="h-8 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 flex items-center text-gray-500">
        <span>{fileName} ({lines.length} righe)</span>
      </div>

      <div className="flex-1 overflow-auto p-4 flex">
        {/* Line numbers */}
        <div className="select-none text-right pr-4 text-gray-400 dark:text-gray-600 border-r border-gray-200 dark:border-gray-800">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Text lines */}
        <div className="pl-4 text-gray-800 dark:text-gray-200 whitespace-pre overflow-x-auto flex-1">
          {lines.map((line, i) => (
            <div key={i}>{line || " "}</div>
          ))}
        </div>
      </div>
    </div>
  );
};
