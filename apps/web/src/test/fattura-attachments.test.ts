import { describe, it, expect } from "vitest";
import {
  extractFatturaAttachments,
  base64ToUint8Array,
  formatAttachmentSize,
} from "../services/fattura";

describe("FatturaPA Embedded Attachments Extraction", () => {
  it("returns an empty array when XML contains no attachments", () => {
    const xml = `
      <p:FatturaElettronica xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" versione="FPR12">
        <FatturaElettronicaBody>
          <DatiGenerali>
            <DatiGeneraliDocumento>
              <TipoDocumento>TD01</TipoDocumento>
            </DatiGeneraliDocumento>
          </DatiGenerali>
        </FatturaElettronicaBody>
      </p:FatturaElettronica>
    `;

    const attachments = extractFatturaAttachments(xml);
    expect(attachments).toEqual([]);
  });

  it("extracts embedded attachments with namespaced tags (p:Allegati)", () => {
    // "Hello World PDF Content" in Base64 is "SGVsbG8gV29ybGQgUERGIENvbnRlbnQ="
    const b64 = "SGVsbG8gV29ybGQgUERGIENvbnRlbnQ=";
    const xml = `
      <p:FatturaElettronica xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" versione="FPR12">
        <FatturaElettronicaBody>
          <DatiGenerali>
            <DatiGeneraliDocumento>
              <TipoDocumento>TD01</TipoDocumento>
            </DatiGeneraliDocumento>
          </DatiGenerali>
          <p:Allegati>
            <NomeAttachment>Fattura_Cortesia.pdf</NomeAttachment>
            <AlgoritmoCompressione>None</AlgoritmoCompressione>
            <FormatoAttachment>PDF</FormatoAttachment>
            <DescrizioneAttachment>Copia di cortesia PDF della fattura</DescrizioneAttachment>
            <Attachment>
              ${b64}
            </Attachment>
          </p:Allegati>
        </FatturaElettronicaBody>
      </p:FatturaElettronica>
    `;

    const attachments = extractFatturaAttachments(xml);
    expect(attachments.length).toBe(1);
    expect(attachments[0].name).toBe("Fattura_Cortesia.pdf");
    expect(attachments[0].format).toBe("PDF");
    expect(attachments[0].compression).toBe("None");
    expect(attachments[0].description).toBe("Copia di cortesia PDF della fattura");
    expect(attachments[0].base64Data).toBe(b64);
    expect(attachments[0].sizeBytes).toBe(23);

    const bytes = base64ToUint8Array(attachments[0].base64Data);
    expect(new TextDecoder().decode(bytes)).toBe("Hello World PDF Content");
  });

  it("extracts multiple attachments and handles un-namespaced tags", () => {
    const b64_1 = btoa("First document content");
    const b64_2 = btoa("Second document content");
    const xml = `
      <FatturaElettronica versione="FPR12">
        <FatturaElettronicaBody>
          <Allegati>
            <NomeAttachment>Contratto.pdf</NomeAttachment>
            <Attachment>${b64_1}</Attachment>
          </Allegati>
          <Allegati>
            <NomeAttachment>DDT_124.pdf</NomeAttachment>
            <DescrizioneAttachment>Documento di trasporto</DescrizioneAttachment>
            <Attachment>${b64_2}</Attachment>
          </Allegati>
        </FatturaElettronicaBody>
      </FatturaElettronica>
    `;

    const attachments = extractFatturaAttachments(xml);
    expect(attachments.length).toBe(2);
    expect(attachments[0].name).toBe("Contratto.pdf");
    expect(attachments[1].name).toBe("DDT_124.pdf");
    expect(attachments[1].description).toBe("Documento di trasporto");

    expect(new TextDecoder().decode(base64ToUint8Array(attachments[0].base64Data))).toBe(
      "First document content"
    );
    expect(new TextDecoder().decode(base64ToUint8Array(attachments[1].base64Data))).toBe(
      "Second document content"
    );
  });

  it("formats attachment sizes cleanly", () => {
    expect(formatAttachmentSize(0)).toBe("0 B");
    expect(formatAttachmentSize(512)).toBe("512 B");
    expect(formatAttachmentSize(1024)).toBe("1 KB");
    expect(formatAttachmentSize(145000)).toBe("141.6 KB");
    expect(formatAttachmentSize(2500000)).toBe("2.4 MB");
  });
});
