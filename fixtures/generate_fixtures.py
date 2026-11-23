#!/usr/bin/env python3
"""
ZeroP7M — Deterministic P7M Fixture Corpus Generator
Produces the 10 anonymized test vectors defined in docs/specs/TESTING.md §2.
"""

from __future__ import annotations

import base64
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

FIXTURES_DIR = Path(__file__).resolve().parent / "generated"


def run_cmd(cmd: list[str], cwd: Path | None = None) -> bytes:
    res = subprocess.run(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
    )
    return res.stdout


def make_3page_pdf() -> bytes:
    return b"""%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 6 0 R>> endobj
4 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 7 0 R>> endobj
5 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 8 0 R>> endobj
6 0 obj <</Length 44>> stream
BT /F1 24 Tf 100 700 Td (Page 1 - ApriP7M Test) ET
endstream endobj
7 0 obj <</Length 44>> stream
BT /F1 24 Tf 100 700 Td (Page 2 - ApriP7M Test) ET
endstream endobj
8 0 obj <</Length 44>> stream
BT /F1 24 Tf 100 700 Td (Page 3 - ApriP7M Test) ET
endstream endobj
xref
0 9
0000000000 65535 f 
0000000009 00000 n 
0000000056 00000 n 
0000000122 00000 n 
0000000206 00000 n 
0000000290 00000 n 
0000000374 00000 n 
0000000469 00000 n 
0000000564 00000 n 
trailer <</Size 9 /Root 1 0 R>>
startxref
659
%%EOF
"""


def make_fatturapa_xml(xss: bool = False) -> bytes:
    desc = (
        "<![CDATA[Consulenza <script>alert(1)</script><img src=x onerror=alert(1)>]]>"
        if xss
        else "Consulenza informatica"
    )
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>01234567890</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>00001</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>0000000</CodiceDestinatario>
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <CodiceFiscale>RSSMRA80A01H501U</CodiceFiscale>
        <Anagrafica>
          <Denominazione>Mario Rossi S.r.l.</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>Via Roma 1</Indirizzo>
        <CAP>00100</CAP>
        <Comune>Roma</Comune>
        <Nazione>IT</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        <CodiceFiscale>VRDGPP75B02H501Y</CodiceFiscale>
        <Anagrafica>
          <Nome>Giuseppe</Nome>
          <Cognome>Verdi</Cognome>
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>Via Milano 2</Indirizzo>
        <CAP>20100</CAP>
        <Comune>Milano</Comune>
        <Nazione>IT</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>2026-11-20</Data>
        <Numero>1</Numero>
        <ImportoTotaleDocumento>122.00</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      <DettaglioLinee>
        <NumeroLinea>1</NumeroLinea>
        <Descrizione>{desc}</Descrizione>
        <PrezzoUnitario>100.00</PrezzoUnitario>
        <PrezzoTotale>100.00</PrezzoTotale>
        <AliquotaIVA>22.00</AliquotaIVA>
      </DettaglioLinee>
      <DatiRiepilogo>
        <AliquotaIVA>22.00</AliquotaIVA>
        <ImponibileImporto>100.00</ImponibileImporto>
        <Imposta>22.00</Imposta>
      </DatiRiepilogo>
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</p:FatturaElettronica>
"""
    return xml.encode("utf-8")


def main() -> None:
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp_dir_str:
        tmp = Path(tmp_dir_str)

        # 1. Generate RSA key 1 and cert 1 (Mario Rossi)
        key1 = tmp / "key1.pem"
        cert1 = tmp / "cert1.pem"
        run_cmd(
            [
                "openssl",
                "req",
                "-x509",
                "-newkey",
                "rsa:2048",
                "-nodes",
                "-keyout",
                str(key1),
                "-out",
                str(cert1),
                "-days",
                "3650",
                "-subj",
                "/CN=Mario Rossi/serialNumber=TINIT-RSSMRA80A01H501U/O=ApriP7M Test/C=IT",
            ]
        )

        # 2. Generate RSA key 2 and cert 2 (Giuseppe Verdi)
        key2 = tmp / "key2.pem"
        cert2 = tmp / "cert2.pem"
        run_cmd(
            [
                "openssl",
                "req",
                "-x509",
                "-newkey",
                "rsa:2048",
                "-nodes",
                "-keyout",
                str(key2),
                "-out",
                str(cert2),
                "-days",
                "3650",
                "-subj",
                "/CN=Giuseppe Verdi/serialNumber=TINIT-VRDGPP75B02H501Y/O=ApriP7M Test/C=IT",
            ]
        )

        # Base inputs
        sample_pdf = tmp / "sample.pdf"
        sample_pdf.write_bytes(make_3page_pdf())

        fattura_xml = tmp / "fattura.xml"
        fattura_xml.write_bytes(make_fatturapa_xml(xss=False))

        fattura_xss_xml = tmp / "fattura_xss.xml"
        fattura_xss_xml.write_bytes(make_fatturapa_xml(xss=True))

        # Vector 1: simple_pdf_der.pdf.p7m
        v1 = FIXTURES_DIR / "simple_pdf_der.pdf.p7m"
        run_cmd(
            [
                "openssl",
                "cms",
                "-sign",
                "-signer",
                str(cert1),
                "-inkey",
                str(key1),
                "-nodetach",
                "-outform",
                "DER",
                "-md",
                "sha256",
                "-in",
                str(sample_pdf),
                "-out",
                str(v1),
            ]
        )

        # Vector 2: ber_indefinite.pdf.p7m
        v2 = FIXTURES_DIR / "ber_indefinite.pdf.p7m"
        run_cmd(
            [
                "openssl",
                "cms",
                "-sign",
                "-signer",
                str(cert1),
                "-inkey",
                str(key1),
                "-nodetach",
                "-stream",
                "-outform",
                "DER",
                "-md",
                "sha256",
                "-in",
                str(sample_pdf),
                "-out",
                str(v2),
            ]
        )

        # Vector 3: pem_base64.pdf.p7m (PEM format with UTF-8 BOM + CRLF)
        v3 = FIXTURES_DIR / "pem_base64.pdf.p7m"
        pem_bytes = run_cmd(
            [
                "openssl",
                "cms",
                "-sign",
                "-signer",
                str(cert1),
                "-inkey",
                str(key1),
                "-nodetach",
                "-outform",
                "PEM",
                "-md",
                "sha256",
                "-in",
                str(sample_pdf),
            ]
        )
        crlf_pem = pem_bytes.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")
        v3.write_bytes(b"\xef\xbb\xbf" + crlf_pem)

        # Vector 4: nested_double.pdf.p7m.p7m (Sign inner .p7m with cert2)
        v4 = FIXTURES_DIR / "nested_double.pdf.p7m.p7m"
        run_cmd(
            [
                "openssl",
                "cms",
                "-sign",
                "-signer",
                str(cert2),
                "-inkey",
                str(key2),
                "-nodetach",
                "-binary",
                "-outform",
                "DER",
                "-md",
                "sha256",
                "-in",
                str(v1),
                "-out",
                str(v4),
            ]
        )

        # Vector 5: cosigned_multi.pdf.p7m (Co-signed by cert1 and cert2)
        v5 = FIXTURES_DIR / "cosigned_multi.pdf.p7m"
        run_cmd(
            [
                "openssl",
                "cms",
                "-sign",
                "-signer",
                str(cert1),
                "-inkey",
                str(key1),
                "-signer",
                str(cert2),
                "-inkey",
                str(key2),
                "-nodetach",
                "-outform",
                "DER",
                "-md",
                "sha256",
                "-in",
                str(sample_pdf),
                "-out",
                str(v5),
            ]
        )

        # Vector 6: fatturapa_valid.xml.p7m
        v6 = FIXTURES_DIR / "fatturapa_valid.xml.p7m"
        run_cmd(
            [
                "openssl",
                "cms",
                "-sign",
                "-signer",
                str(cert1),
                "-inkey",
                str(key1),
                "-nodetach",
                "-outform",
                "DER",
                "-md",
                "sha256",
                "-in",
                str(fattura_xml),
                "-out",
                str(v6),
            ]
        )

        # Vector 7: fatturapa_xss_attack.xml.p7m
        v7 = FIXTURES_DIR / "fatturapa_xss_attack.xml.p7m"
        run_cmd(
            [
                "openssl",
                "cms",
                "-sign",
                "-signer",
                str(cert1),
                "-inkey",
                str(key1),
                "-nodetach",
                "-outform",
                "DER",
                "-md",
                "sha256",
                "-in",
                str(fattura_xss_xml),
                "-out",
                str(v7),
            ]
        )

        # Vector 8: detached_only.p7m (no -nodetach, absent eContent)
        v8 = FIXTURES_DIR / "detached_only.p7m"
        run_cmd(
            [
                "openssl",
                "cms",
                "-sign",
                "-signer",
                str(cert1),
                "-inkey",
                str(key1),
                "-outform",
                "DER",
                "-md",
                "sha256",
                "-in",
                str(sample_pdf),
                "-out",
                str(v8),
            ]
        )

        # Vector 9: tampered_digest.pdf.p7m (1 byte mutated inside encapsulated payload)
        v9 = FIXTURES_DIR / "tampered_digest.pdf.p7m"
        v1_bytes = bytearray(v1.read_bytes())
        pdf_marker = b"Page 1 - ApriP7M Test"
        idx = v1_bytes.find(pdf_marker)
        if idx == -1:
            raise RuntimeError("PDF marker not found in signed payload")
        # Flip 1 byte in payload text
        v1_bytes[idx] = ord("X") if v1_bytes[idx] != ord("X") else ord("Y")
        v9.write_bytes(v1_bytes)

        # Vector 10: corrupt_truncated.p7m & not_a_p7m.txt
        v10_corrupt = FIXTURES_DIR / "corrupt_truncated.p7m"
        v10_corrupt.write_bytes(v1.read_bytes()[:120])

        v10_text = FIXTURES_DIR / "not_a_p7m.txt"
        v10_text.write_bytes(b"This is a plain text file, definitely not a CMS/PKCS#7 file.\n")

    print(f"Successfully generated all fixtures in {FIXTURES_DIR}")


if __name__ == "__main__":
    main()
