import React, { useState, useEffect, useRef, useMemo } from "react";
import { Code, Eye, Printer, Paperclip, Download, X, FileText, Check } from "lucide-react";
import {
  transformFatturaPaXml,
  extractFatturaAttachments,
  base64ToUint8Array,
  formatAttachmentSize,
  type FatturaXsltStyle,
  type FatturaAttachment,
} from "../../services/fattura";

interface FatturaPaViewerProps {
  readBytes: () => Promise<Uint8Array>;
}

export const FatturaPaViewer: React.FC<FatturaPaViewerProps> = ({ readBytes }) => {
  const [xmlContent, setXmlContent] = useState<string>("");
  const [style, setStyle] = useState<FatturaXsltStyle>("assosoftware");
  const [viewMode, setViewMode] = useState<"visual" | "xml">("visual");
  const [sanitizedHtml, setSanitizedHtml] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [showAttachmentsBanner, setShowAttachmentsBanner] = useState<boolean>(true);
  const [isAttachmentsDrawerOpen, setIsAttachmentsDrawerOpen] = useState<boolean>(false);
  const [downloadedAttachments, setDownloadedAttachments] = useState<Set<string>>(new Set());

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Extract embedded attachments from XML
  const attachments = useMemo(() => {
    return extractFatturaAttachments(xmlContent);
  }, [xmlContent]);

  // Load and decode XML payload
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    readBytes()
      .then((bytes) => {
        if (cancelled) return;
        // Decode XML handling UTF-8 declaration
        const decoder = new TextDecoder("utf-8");
        const text = decoder.decode(bytes);
        setXmlContent(text);
      })
      .catch((err) => {
        if (cancelled) return;
        setError("Errore durante la lettura del payload XML: " + (err.message || String(err)));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [readBytes]);

  // Transform XML with selected XSLT style
  useEffect(() => {
    if (!xmlContent) return;

    try {
      const result = transformFatturaPaXml(xmlContent, style);
      setSanitizedHtml(result.sanitizedHtml);
      setLoading(false);
    } catch (err: unknown) {
      setError("Errore durante la trasformazione XSLT: " + (err instanceof Error ? err.message : String(err)));
      setLoading(false);
    }
  }, [xmlContent, style]);

  const handlePrint = () => {
    if (viewMode === "visual" && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print();
    } else {
      window.print();
    }
  };

  const handleDownloadAttachment = async (attachment: FatturaAttachment) => {
    try {
      const bytes = base64ToUint8Array(attachment.base64Data);

      let mimeType = "application/octet-stream";
      const lower = attachment.name.toLowerCase();
      const lowerFmt = (attachment.format || "").toLowerCase();
      if (lower.endsWith(".pdf") || lowerFmt === "pdf") {
        mimeType = "application/pdf";
      } else if (lower.endsWith(".xml") || lowerFmt === "xml") {
        mimeType = "application/xml";
      } else if (lower.endsWith(".txt")) {
        mimeType = "text/plain";
      } else if (lower.endsWith(".zip")) {
        mimeType = "application/zip";
      } else if (lower.endsWith(".png")) {
        mimeType = "image/png";
      } else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
        mimeType = "image/jpeg";
      }

      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile && navigator.share) {
        try {
          const file = new File([bytes as unknown as BlobPart], attachment.name, {
            type: mimeType,
          });
          const canShare = navigator.canShare
            ? navigator.canShare({ files: [file] })
            : true;
          if (canShare) {
            await navigator.share({
              files: [file],
              title: attachment.name,
            });
            setDownloadedAttachments((prev) => new Set(prev).add(attachment.name));
            return;
          }
        } catch (err: unknown) {
          if ((err as Error)?.name === "AbortError") return;
        }
      }

      // Browser blob download
      const blob = new Blob([bytes as unknown as BlobPart], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      setDownloadedAttachments((prev) => new Set(prev).add(attachment.name));
    } catch (err) {
      console.error("Errore durante il salvataggio dell'allegato:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#1E40AF] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[#525C6E] dark:text-[#9CA3AF]">
            Elaborazione Fattura Elettronica in corso...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 p-6 rounded-xl max-w-md text-center">
          <p className="text-sm">{error}</p>
          <button
            onClick={() => setViewMode("xml")}
            className="mt-4 px-3 py-1.5 text-xs font-medium bg-red-100 dark:bg-red-900 rounded hover:bg-red-200"
          >
            Visualizza XML Grezzo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F4F5F7] dark:bg-[#0F1115] overflow-hidden">
      {/* Sub-toolbar */}
      <div className="h-10 bg-white dark:bg-[#171A21] border-b border-[#E2E5EB] dark:border-[#262B36] px-4 flex items-center justify-between text-xs text-[#525C6E] dark:text-[#9CA3AF] z-10 select-none">
        {/* Style Selector */}
        <div className="flex items-center space-x-2">
          {viewMode === "visual" && (
            <div className="flex items-center space-x-1">
              <span className="hidden sm:inline">Stile:</span>
              <button
                onClick={() => setStyle("assosoftware")}
                className={`px-2 py-1 rounded transition-colors ${
                  style === "assosoftware"
                    ? "bg-blue-50 dark:bg-blue-900/40 text-[#1E40AF] dark:text-blue-300 font-medium"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                AssoSoftware
              </button>
              <button
                onClick={() => setStyle("ade")}
                className={`px-2 py-1 rounded transition-colors ${
                  style === "ade"
                    ? "bg-blue-50 dark:bg-blue-900/40 text-[#1E40AF] dark:text-blue-300 font-medium"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                AdE (v1.2.2)
              </button>
            </div>
          )}
        </div>

        {/* View mode toggle, Attachments & Print */}
        <div className="flex items-center space-x-2">
          {attachments.length > 0 && (
            <button
              onClick={() => setIsAttachmentsDrawerOpen((prev) => !prev)}
              className={`inline-flex items-center px-2 py-1 rounded transition-colors text-xs font-medium border ${
                isAttachmentsDrawerOpen
                  ? "bg-blue-100 dark:bg-blue-900/60 text-[#1E40AF] dark:text-blue-200 border-blue-300 dark:border-blue-700"
                  : "bg-blue-50 dark:bg-blue-950/60 text-[#1E40AF] dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40"
              }`}
              title="Visualizza allegati incorporati nella fattura"
            >
              <Paperclip className="w-3.5 h-3.5 mr-1 text-[#1E40AF] dark:text-blue-400" />
              <span>Allegati ({attachments.length})</span>
            </button>
          )}

          <button
            onClick={() => setViewMode(viewMode === "visual" ? "xml" : "visual")}
            className="inline-flex items-center px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={viewMode === "visual" ? "Mostra XML originale" : "Mostra Vista Grafica"}
          >
            {viewMode === "visual" ? (
              <>
                <Code className="w-3.5 h-3.5 mr-1" />
                <span>XML Sorgente</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 mr-1" />
                <span>Vista Grafica</span>
              </>
            )}
          </button>

          <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

          <button
            onClick={handlePrint}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Stampa fattura"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Embedded Attachments Top Notification Banner */}
      {attachments.length > 0 && showAttachmentsBanner && (
        <div className="bg-blue-50/90 dark:bg-[#131B2E] border-b border-blue-200 dark:border-blue-900/60 px-4 py-2 flex items-center justify-between text-xs text-blue-900 dark:text-blue-200 select-none">
          <div className="flex items-center space-x-2 min-w-0">
            <Paperclip className="w-4 h-4 text-[#1E40AF] dark:text-blue-400 shrink-0" />
            <div className="truncate">
              <span className="font-semibold">
                {attachments.length === 1
                  ? "Allegato incorporato: "
                  : `${attachments.length} allegati incorporati: `}
              </span>
              <span className="font-mono font-medium">{attachments[0].name}</span>
              <span className="text-blue-600 dark:text-blue-400 ml-1">
                ({formatAttachmentSize(attachments[0].sizeBytes)})
              </span>
              {attachments[0].description && (
                <span className="text-gray-500 dark:text-gray-400 ml-1.5 italic truncate hidden sm:inline">
                  — {attachments[0].description}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 ml-3">
            <button
              onClick={() => handleDownloadAttachment(attachments[0])}
              className="inline-flex items-center px-2.5 py-1 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded text-xs font-medium shadow-xs transition-colors"
              title={`Salva ${attachments[0].name}`}
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              <span>
                {attachments.length === 1 ? "Salva Allegato" : "Salva Primo"}
              </span>
            </button>

            {attachments.length > 1 && (
              <button
                onClick={() => setIsAttachmentsDrawerOpen(true)}
                className="px-2 py-1 bg-white dark:bg-gray-800 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-gray-700 rounded text-xs font-medium transition-colors"
              >
                Vedi tutti ({attachments.length})
              </button>
            )}

            <button
              onClick={() => setShowAttachmentsBanner(false)}
              className="p-1 text-blue-500 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 rounded"
              title="Chiudi notifica"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main View Area */}
      <div className="flex-1 relative overflow-hidden bg-white dark:bg-[#171A21]">
        {viewMode === "visual" ? (
          <iframe
            ref={iframeRef}
            title="Visualizzatore FatturaPA"
            sandbox="allow-same-origin allow-modals"
            srcDoc={sanitizedHtml}
            className="w-full h-full border-0 block"
          />
        ) : (
          <pre className="w-full h-full p-4 overflow-auto font-mono text-xs text-gray-800 dark:text-gray-200 bg-[#FAFAFA] dark:bg-[#111418] leading-relaxed whitespace-pre-wrap">
            {xmlContent}
          </pre>
        )}

        {/* Slide-over Attachments Drawer */}
        {isAttachmentsDrawerOpen && (
          <>
            <div
              className="absolute inset-0 bg-black/20 backdrop-blur-2xs z-20"
              onClick={() => setIsAttachmentsDrawerOpen(false)}
            />
            <aside
              aria-label="Allegati incorporati nella fattura"
              className="absolute right-0 top-0 bottom-0 w-full sm:w-[380px] bg-white dark:bg-[#171A21] border-l border-[#E2E5EB] dark:border-[#262B36] z-30 flex flex-col shadow-xl select-none"
            >
              {/* Drawer Header */}
              <div className="h-12 border-b border-[#E2E5EB] dark:border-[#262B36] px-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Paperclip className="w-4 h-4 text-[#1E40AF]" />
                  <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F3F4F6]">
                    Allegati Fattura ({attachments.length})
                  </h3>
                </div>
                <button
                  onClick={() => setIsAttachmentsDrawerOpen(false)}
                  className="p-1 rounded text-[#525C6E] hover:text-[#111827] dark:text-[#9CA3AF] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Chiudi pannello"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {attachments.map((attachment, idx) => {
                  const isDownloaded = downloadedAttachments.has(attachment.name);
                  return (
                    <div
                      key={idx}
                      className="bg-[#F8FAFC] dark:bg-[#13161C] border border-[#E2E5EB] dark:border-[#262B36] rounded-xl p-3.5 space-y-2.5"
                    >
                      <div className="flex items-start space-x-2.5 min-w-0">
                        <FileText className="w-5 h-5 text-[#1E40AF] shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#111827] dark:text-[#F3F4F6] truncate" title={attachment.name}>
                            {attachment.name}
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-[#525C6E] dark:text-[#9CA3AF] mt-0.5">
                            <span className="font-mono">{formatAttachmentSize(attachment.sizeBytes)}</span>
                            {attachment.format && (
                              <span className="px-1 py-0.2 rounded bg-gray-200 dark:bg-gray-700 text-[10px] font-mono uppercase">
                                {attachment.format}
                              </span>
                            )}
                            {attachment.compression && (
                              <span className="px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-[10px]">
                                {attachment.compression}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {attachment.description && (
                        <p className="text-xs text-[#525C6E] dark:text-[#9CA3AF] bg-white dark:bg-[#171A21] border border-[#E2E5EB] dark:border-[#262B36] rounded p-2 italic">
                          {attachment.description}
                        </p>
                      )}

                      <button
                        onClick={() => handleDownloadAttachment(attachment)}
                        className={`w-full inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded transition-colors shadow-xs ${
                          isDownloaded
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            : "bg-[#1E40AF] hover:bg-[#1D4ED8] text-white"
                        }`}
                      >
                        {isDownloaded ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            <span>Salvato (Scarica di nuovo)</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5 mr-1" />
                            <span>Salva Allegato</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Drawer Footer if multiple attachments */}
              {attachments.length > 1 && (
                <div className="p-3 border-t border-[#E2E5EB] dark:border-[#262B36] bg-[#F8FAFC] dark:bg-[#13161C]">
                  <button
                    onClick={() => {
                      attachments.forEach((att) => handleDownloadAttachment(att));
                    }}
                    className="w-full inline-flex items-center justify-center px-3 py-2 bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 rounded-lg text-xs font-medium shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    <span>Salva tutti gli allegati ({attachments.length})</span>
                  </button>
                </div>
              )}
            </aside>
          </>
        )}
      </div>
    </div>
  );
};
