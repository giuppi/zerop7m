import React, { useEffect } from "react";
import { X, ExternalLink, ShieldCheck, Lock, Code2, Heart, Info, FileText } from "lucide-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-w-lg w-full bg-white dark:bg-[#171A21] border border-[#E2E5EB] dark:border-[#262B36] rounded-2xl shadow-2xl p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 h-9 w-9 flex items-center justify-center rounded-lg text-[#525C6E] hover:text-[#111827] dark:text-[#9CA3AF] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Chiudi (Esc)"
          aria-label="Chiudi finestra"
        >
          <X className="w-5 h-5" />
        </button>

        {/* App Identity Header */}
        <div className="flex items-start space-x-3.5 mb-5">
          <div className="w-12 h-12 rounded-xl bg-[#1E40AF] text-white flex items-center justify-center font-bold text-base tracking-tight shadow-md shrink-0">
            0P7
          </div>
          <div className="min-w-0 pr-6">
            <div className="flex items-center space-x-2">
              <h2 id="about-dialog-title" className="text-xl font-bold tracking-tight text-[#111827] dark:text-[#F3F4F6]">
                ZeroP7M
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#1E40AF] dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono font-medium">
                v1.0.2
              </span>
            </div>
            <p className="text-xs text-[#525C6E] dark:text-[#9CA3AF] mt-0.5">
              Lettore CAdES <code className="font-mono text-[#1E40AF]">.p7m</code> 100% Client-Side, Gratuito e Open Source
            </p>
          </div>
        </div>

        {/* Main Content Sections */}
        <div className="space-y-4 text-xs leading-relaxed text-[#525C6E] dark:text-[#9CA3AF]">
          {/* Authorship & Credits Card */}
          <div className="bg-[#F8FAFC] dark:bg-[#13161C] border border-[#E2E5EB] dark:border-[#262B36] rounded-xl p-4 space-y-2">
            <div className="flex items-center space-x-2 text-[#111827] dark:text-[#F3F4F6] font-semibold text-sm">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              <span>Paternità & Crediti</span>
            </div>
            <p>
              Progetto ideato, sviluppato e mantenuto da{" "}
              <a
                href="https://github.com/giuppi"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#1E40AF] dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
              >
                Giuppi
                <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
              </a>
              .
            </p>
            <p>
              Motore crittografico:{" "}
              <strong className="text-[#111827] dark:text-[#F3F4F6]">OpenCAdES</strong> (scritto in Rust e compilato in WebAssembly nativo per garantire massima velocità, assenza di dipendenze e zero allocazioni non necessarie).
            </p>
          </div>

          {/* Privacy & Guarantees */}
          <div className="bg-[#F8FAFC] dark:bg-[#13161C] border border-[#E2E5EB] dark:border-[#262B36] rounded-xl p-4 space-y-2.5">
            <div className="flex items-center space-x-2 text-[#111827] dark:text-[#F3F4F6] font-semibold text-sm">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>Invarianti di Sicurezza & Privacy</span>
            </div>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>
                <strong className="text-[#111827] dark:text-[#F3F4F6]">100% Locale / Zero-Cloud:</strong> I file <code className="font-mono">.p7m</code> non vengono mai inviati a server terzi (<code className="font-mono text-[11px]">connect-src 'none'</code>).
              </li>
              <li>
                <strong className="text-[#111827] dark:text-[#F3F4F6]">Zero Telemetria:</strong> Nessun tracciamento, nessun cookie pubblicitario, nessun dato personale raccolto.
              </li>
              <li>
                <strong className="text-[#111827] dark:text-[#F3F4F6]">Nessun Paywall:</strong> Visualizzazione integrale di PDF multipagina, fatture elettroniche e allegati senza abbonamenti.
              </li>
            </ul>
          </div>

          {/* Useful Links & Source Code */}
          <div className="bg-[#F8FAFC] dark:bg-[#13161C] border border-[#E2E5EB] dark:border-[#262B36] rounded-xl p-4 space-y-2">
            <div className="flex items-center space-x-2 text-[#111827] dark:text-[#F3F4F6] font-semibold text-sm">
              <Code2 className="w-4 h-4 text-[#1E40AF] dark:text-blue-400" />
              <span>Licenza & Sorgenti</span>
            </div>
            <p>
              Rilasciato con licenza libera{" "}
              <strong className="text-[#111827] dark:text-[#F3F4F6]">MIT / Apache-2.0</strong>. Libero per privati, professionisti, imprese e Pubblica Amministrazione.
            </p>
            <div className="pt-1 flex flex-col sm:flex-row gap-2">
              <a
                href="https://github.com/giuppi/zerop7m"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-900 hover:bg-black text-white dark:bg-gray-100 dark:hover:bg-white dark:text-gray-900 font-medium text-xs transition-colors shadow-2xs"
              >
                {/* GitHub Mark SVG */}
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>Repository GitHub</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>

              <a
                href="https://giuppi.github.io/zerop7m/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-[#1E40AF] dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium text-xs transition-colors"
              >
                <span>Sito Web Ufficiale</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-[#E2E5EB] dark:border-[#262B36] flex items-center justify-end">
          <button
            onClick={onClose}
            className="h-10 px-5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 active:bg-gray-300 text-[#111827] dark:text-[#F3F4F6] text-xs font-semibold transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
