import { z } from "zod";

export * from "./generated.js";
import type {
  DocumentKind,
  EncodingFormat,
  IntegrityStatus,
  P7MErrorCode,
  RevocationStatus,
} from "./generated.js";

// ============================================================================
// Runtime Zod Schemas (Zod 4.6+)
// ============================================================================

export const DocumentKindSchema: z.ZodType<DocumentKind> = z.enum([
  "PDF",
  "FATTURA_PA_XML",
  "IMAGE",
  "TEXT",
  "UNKNOWN",
]);

export const EncodingFormatSchema: z.ZodType<EncodingFormat> = z.enum([
  "DER",
  "BER_INDEFINITE",
  "BASE64_PEM",
]);

export const IntegrityStatusSchema: z.ZodType<IntegrityStatus> = z.enum([
  "VERIFIED_LOCAL",
  "DIGEST_MISMATCH",
  "SIGNATURE_INVALID",
  "DETACHED_SIGNATURE",
  "UNSUPPORTED_ALGO",
  "PARSE_WARNING",
]);

export const RevocationStatusSchema: z.ZodType<RevocationStatus> = z.enum([
  "NOT_CHECKED_OFFLINE",
]);

export const SignerSummarySchema = z.object({
  commonName: z.string(),
  givenName: z.string().optional(),
  surname: z.string().optional(),
  fiscalCode: z.string().optional(),
  organization: z.string().optional(),
  issuerCn: z.string(),
  serialNumberHex: z.string(),
  validFromIso: z.string(),
  validToIso: z.string(),
  declaredSigningTimeIso: z.string().optional(),
  timestampIso: z.string().optional(),
  digestAlgorithm: z.string(),
  integrity: IntegrityStatusSchema,
  revocation: RevocationStatusSchema,
});

export const SignatureLayerSchema = z.object({
  depth: z.number().int().nonnegative(),
  encodingDetected: EncodingFormatSchema,
  signers: z.array(SignerSummarySchema),
});

export const P7MInspectionReportSchema = z.object({
  sessionId: z.string(),
  originalFileName: z.string(),
  extractedFileName: z.string(),
  payloadSizeBytes: z.number().int().nonnegative(),
  mimeType: z.string(),
  documentKind: DocumentKindSchema,
  layers: z.array(SignatureLayerSchema),
  warnings: z.array(z.string()),
});

export const P7MErrorCodeSchema: z.ZodType<P7MErrorCode> = z.enum([
  "INVALID_FORMAT",
  "UNSUPPORTED_CMS_TYPE",
  "DETACHED_NO_CONTENT",
  "MAX_NESTING_EXCEEDED",
  "FILE_TOO_LARGE",
  "IO_READ_FAILED",
  "CORRUPT_PAYLOAD",
  "INTERNAL_ERROR",
]);

export const P7MErrorSchema = z.object({
  code: P7MErrorCodeSchema,
  message: z.string(),
  details: z.string().optional(),
});

// Type compatibility assertions
export type SignerSummaryInferred = z.infer<typeof SignerSummarySchema>;
export type SignatureLayerInferred = z.infer<typeof SignatureLayerSchema>;
export type P7MInspectionReportInferred = z.infer<typeof P7MInspectionReportSchema>;
export type P7MErrorInferred = z.infer<typeof P7MErrorSchema>;

// ============================================================================
// Unified Frontend Adapter Interface (CONTRACTS.md §3)
// ============================================================================

export interface OpenedDocument {
  report: import("./generated.js").P7MInspectionReport;
  /** URL readable by PDF.js, <img>, fetch() (Blob URL on Web, p7m://localhost/session/<id> on Tauri) */
  payloadUrl: string;
  /** Fetches raw bytes on demand (for FatturaPA XML text decoding or download fallback) */
  readPayloadBytes: () => Promise<Uint8Array>;
  /** Releases ObjectURL / native SessionStore memory immediately */
  dispose: () => Promise<void>;
}

export interface EngineAdapter {
  readonly runtime: "web-wasm" | "tauri-native";
  inspectFile(file: File): Promise<OpenedDocument>;
  inspectPath?(pathOrUri: string): Promise<OpenedDocument>;
  saveExtractedCopy(doc: OpenedDocument): Promise<void>;
  shareExtractedCopy?(doc: OpenedDocument): Promise<void>;
}
