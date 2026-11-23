import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Clock,
  Calendar,
  Building,
  User,
  Copy,
  Check,
  Info,
} from "lucide-react";
import type {
  IntegrityStatus,
  P7MInspectionReport,
  SignerSummary,
} from "@zerop7m/shared-types";

interface SignatureDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  report: P7MInspectionReport;
}

export const SignatureDrawer: React.FC<SignatureDrawerProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  const [copiedCf, setCopiedCf] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCf(text);
    setTimeout(() => setCopiedCf(null), 2000);
  };

  const formatIsoDate = (iso?: string) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      return d.toLocaleString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const getIntegrityBadge = (integrity: IntegrityStatus) => {
    switch (integrity) {
      case "VERIFIED_LOCAL":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#ECFDF5] text-[#166534] border border-[#BBF7D0]">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Integrità verificata (locale)
          </span>
        );
      case "DIGEST_MISMATCH":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]">
            <ShieldAlert className="w-3 h-3 mr-1" />
            Digest non corrispondente
          </span>
        );
      case "SIGNATURE_INVALID":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]">
            <ShieldAlert className="w-3 h-3 mr-1" />
            Firma non valida
          </span>
        );
      case "DETACHED_SIGNATURE":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
            <Shield className="w-3 h-3 mr-1" />
            Firma disgiunta
          </span>
        );
      case "UNSUPPORTED_ALGO":
      case "PARSE_WARNING":
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
            <Shield className="w-3 h-3 mr-1" />
            Verifica parziale
          </span>
        );
    }
  };

  return (
    <>
      {/* Backdrop on mobile */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 lg:hidden"
        onClick={onClose}
      />

      <aside
        aria-label="Dettagli firma digitale"
        className="fixed right-0 top-0 bottom-0 w-full sm:w-[400px] lg:w-[360px] bg-white dark:bg-[#171A21] border-l border-[#E2E5EB] dark:border-[#262B36] z-50 flex flex-col shadow-xl select-none pb-[env(safe-area-inset-bottom,0px)]"
      >
        {/* Header */}
        <div className="min-h-[56px] sm:min-h-[52px] pt-[env(safe-area-inset-top,0px)] border-b border-[#E2E5EB] dark:border-[#262B36] px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-[#1E40AF]" />
            <h2 className="text-sm font-semibold text-[#111827] dark:text-[#F3F4F6]">
              Dettagli Firme Digitali
            </h2>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg text-[#525C6E] hover:text-[#111827] dark:text-[#9CA3AF] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 transition-colors"
            title="Chiudi pannello (Esc)"
            aria-label="Chiudi pannello"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Legal Status Callout */}
          <div className="bg-[#F1F5F9] dark:bg-[#1E2430] border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-xs leading-relaxed text-[#334155] dark:text-slate-300 flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-[#1E40AF] shrink-0 mt-0.5" />
            <span>
              Verifica crittografica eseguita offline sull'integrità del documento. Lo stato di revoca o qualifica eIDAS del certificato non è verificato in modalità locale.
            </span>
          </div>

          <div className="text-center py-1 text-[11px] text-[#9CA3AF] dark:text-gray-500 font-medium">
            ZeroP7M • Motore OpenCAdES • 100% Offline
          </div>

          {/* Signature Layers */}
          {report.layers.map((layer) => (
            <div key={layer.depth} className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#525C6E] dark:text-[#9CA3AF]">
                  Livello {layer.depth}
                </span>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[#525C6E] dark:text-[#9CA3AF]">
                  {layer.encodingDetected}
                </span>
              </div>

              {layer.signers.map((signer: SignerSummary, idx: number) => (
                <div
                  key={idx}
                  className="bg-[#F8FAFC] dark:bg-[#13161C] border border-[#E2E5EB] dark:border-[#262B36] rounded-xl p-3.5 space-y-3"
                >
                  {/* Signer name & CN */}
                  <div>
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-[#1E40AF] shrink-0" />
                      <span className="text-sm font-semibold text-[#111827] dark:text-[#F3F4F6] truncate">
                        {signer.givenName && signer.surname
                          ? `${signer.givenName} ${signer.surname}`
                          : signer.commonName}
                      </span>
                    </div>
                    {signer.organization && (
                      <div className="flex items-center space-x-1.5 text-xs text-[#525C6E] dark:text-[#9CA3AF] mt-1 ml-6">
                        <Building className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{signer.organization}</span>
                      </div>
                    )}
                  </div>

                  {/* Fiscal Code badge */}
                  {signer.fiscalCode && (
                    <div className="flex items-center justify-between bg-white dark:bg-[#171A21] border border-[#E2E5EB] dark:border-[#262B36] rounded px-2.5 py-1.5 text-xs font-mono">
                      <span className="text-[#525C6E] dark:text-[#9CA3AF]">CF:</span>
                      <span className="font-semibold text-[#111827] dark:text-[#F3F4F6]">
                        {signer.fiscalCode}
                      </span>
                      <button
                        onClick={() => handleCopy(signer.fiscalCode!)}
                        className="h-8 w-8 flex items-center justify-center rounded-md text-[#525C6E] hover:text-[#1E40AF] dark:text-[#9CA3AF] dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 transition-colors"
                        title="Copia Codice Fiscale"
                        aria-label="Copia Codice Fiscale"
                      >
                        {copiedCf === signer.fiscalCode ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Integrity pill */}
                  <div>{getIntegrityBadge(signer.integrity)}</div>

                  {/* Issuer & Serial */}
                  <div className="text-xs space-y-1 text-[#525C6E] dark:text-[#9CA3AF] pt-1 border-t border-gray-100 dark:border-gray-800">
                    <div>
                      <span className="text-[#9CA3AF] dark:text-gray-500">Emittente: </span>
                      <span className="font-medium text-[#111827] dark:text-[#F3F4F6] truncate">
                        {signer.issuerCn}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] truncate">
                      <span className="text-[#9CA3AF] dark:text-gray-500">Seriale: </span>
                      {signer.serialNumberHex}
                    </div>
                  </div>

                  {/* Dates & Timestamps */}
                  <div className="text-xs space-y-1.5 text-[#525C6E] dark:text-[#9CA3AF] pt-1">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>
                        Validità: {formatIsoDate(signer.validFromIso)} →{" "}
                        {formatIsoDate(signer.validToIso)}
                      </span>
                    </div>

                    {signer.declaredSigningTimeIso && (
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>
                          Firma: {formatIsoDate(signer.declaredSigningTimeIso)}
                        </span>
                      </div>
                    )}

                    {signer.timestampIso && (
                      <div className="flex items-center space-x-1.5 text-green-700 dark:text-green-400 font-medium">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Marca temporale: {formatIsoDate(signer.timestampIso)}
                        </span>
                      </div>
                    )}

                    <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                      Algoritmo: {signer.digestAlgorithm}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
};
