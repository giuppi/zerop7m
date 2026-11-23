import React from "react";
import type { OpenedDocument } from "@zerop7m/shared-types";
import { PdfViewer } from "./viewers/PdfViewer";
import { FatturaPaViewer } from "./viewers/FatturaPaViewer";
import { ImageViewer } from "./viewers/ImageViewer";
import { TextViewer } from "./viewers/TextViewer";
import { UnknownFormatCard } from "./viewers/UnknownFormatCard";

interface DocumentStageProps {
  doc: OpenedDocument;
  onDownload: () => void;
}

export const DocumentStage: React.FC<DocumentStageProps> = ({ doc, onDownload }) => {
  const { report, payloadUrl, readPayloadBytes } = doc;

  switch (report.documentKind) {
    case "PDF":
      return <PdfViewer url={payloadUrl} readBytes={readPayloadBytes} />;
    case "FATTURA_PA_XML":
      return <FatturaPaViewer readBytes={readPayloadBytes} />;
    case "IMAGE":
      return <ImageViewer url={payloadUrl} fileName={report.extractedFileName} />;
    case "TEXT":
      return <TextViewer readBytes={readPayloadBytes} fileName={report.extractedFileName} />;
    case "UNKNOWN":
    default:
      return (
        <UnknownFormatCard
          fileName={report.extractedFileName}
          mimeType={report.mimeType}
          sizeBytes={report.payloadSizeBytes}
          onDownload={onDownload}
        />
      );
  }
};
