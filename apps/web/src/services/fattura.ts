import assoXslRaw from "../../public/assets/xsl/FoglioStileAssoSoftware.xsl?raw";
import adeXslRaw from "../../public/assets/xsl/fatturaordinaria_v1.2.2.xsl?raw";
import { sanitizeFatturaHtml } from "./sanitizer";

export type FatturaXsltStyle = "assosoftware" | "ade";

const xslCache = new Map<FatturaXsltStyle, Document>();

function getXslDocument(style: FatturaXsltStyle): Document {
  const cached = xslCache.get(style);
  if (cached) return cached;

  const raw = style === "ade" ? adeXslRaw : assoXslRaw;
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, "application/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error(`Errore nel caricamento del foglio di stile XSL (${style}): ${parseError.textContent}`);
  }

  xslCache.set(style, doc);
  return doc;
}

export interface TransformResult {
  html: string;
  sanitizedHtml: string;
}

/**
 * Transforms a FatturaPA XML string using the chosen XSL stylesheet (AssoSoftware or AdE)
 * and sanitizes the output HTML string according to SECURITY.md.
 */
export function transformFatturaPaXml(
  xmlContent: string,
  style: FatturaXsltStyle = "assosoftware"
): TransformResult {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, "application/xml");

  const xmlError = xmlDoc.querySelector("parsererror");
  if (xmlError) {
    throw new Error(`Errore di parsing del file XML FatturaPA: ${xmlError.textContent}`);
  }

  const xslDoc = getXslDocument(style);

  if (typeof XSLTProcessor === "undefined") {
    throw new Error("XSLTProcessor non supportato in questo ambiente.");
  }

  const processor = new XSLTProcessor();
  processor.importStylesheet(xslDoc);

  const resultDoc = processor.transformToDocument(xmlDoc);
  const serializer = new XMLSerializer();
  const rawHtml = serializer.serializeToString(resultDoc);

  const sanitizedHtml = sanitizeFatturaHtml(rawHtml);

  return {
    html: rawHtml,
    sanitizedHtml,
  };
}

export interface FatturaAttachment {
  name: string;
  description?: string;
  format?: string;
  compression?: string;
  base64Data: string;
  sizeBytes: number;
}

/**
 * Extracts embedded attachments (<Allegati>) from Italian FatturaPA XML content.
 * Follows official Agenzia delle Entrate / SdI FatturaPA standard (schema 1.2+).
 */
export function extractFatturaAttachments(xmlContent: string): FatturaAttachment[] {
  if (!xmlContent) return [];
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, "application/xml");

    // Match <Allegati> with or without namespace (e.g. <p:Allegati>, <b:Allegati>, <Allegati>)
    const allegatiNodes = Array.from(xmlDoc.getElementsByTagNameNS("*", "Allegati")).concat(
      Array.from(xmlDoc.getElementsByTagName("Allegati"))
    );

    // Deduplicate in case both queries return matching elements
    const uniqueNodes = Array.from(new Set(allegatiNodes));
    const attachments: FatturaAttachment[] = [];

    for (const node of uniqueNodes) {
      const getChild = (tagName: string): string => {
        const el =
          node.getElementsByTagNameNS("*", tagName)[0] ||
          node.getElementsByTagName(tagName)[0];
        return el?.textContent?.trim() || "";
      };

      const rawAttachment = getChild("Attachment");
      if (!rawAttachment) continue;

      const cleanB64 = rawAttachment.replace(/\s+/g, "");
      const name = getChild("NomeAttachment") || "allegato.bin";
      const description = getChild("DescrizioneAttachment") || undefined;
      const format = getChild("FormatoAttachment") || undefined;
      const compression = getChild("AlgoritmoCompressione") || undefined;

      // Calculate approximate size in bytes from base64 string
      const padding = cleanB64.endsWith("==") ? 2 : cleanB64.endsWith("=") ? 1 : 0;
      const sizeBytes = Math.max(0, Math.floor((cleanB64.length * 3) / 4) - padding);

      attachments.push({
        name,
        description,
        format,
        compression,
        base64Data: cleanB64,
        sizeBytes,
      });
    }

    return attachments;
  } catch (err) {
    console.error("Errore durante l'estrazione degli allegati della FatturaPA:", err);
    return [];
  }
}

/**
 * Converts a base64 encoded string to Uint8Array safely.
 */
export function base64ToUint8Array(b64: string): Uint8Array {
  const clean = b64.replace(/\s+/g, "");
  const binaryStr = atob(clean);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

/**
 * Formats byte counts into human-readable strings (e.g. 142 KB, 1.2 MB).
 */
export function formatAttachmentSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
