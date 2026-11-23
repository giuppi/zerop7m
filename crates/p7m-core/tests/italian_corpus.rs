use std::fs;
use std::path::PathBuf;

use p7m_core::{
    DocumentKind, EncodingFormat, IntegrityStatus, MAX_INPUT_BYTES, MAX_NESTING_DEPTH,
    P7MErrorCode, RevocationStatus, inspect_p7m, normalize_fiscal_code, normalize_p7m_input,
};

fn fixture_path(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../fixtures/generated")
        .join(name)
}

fn read_fixture(name: &str) -> Vec<u8> {
    let path = fixture_path(name);
    fs::read(&path).unwrap_or_else(|e| panic!("Failed to read fixture {}: {}", path.display(), e))
}

#[test]
fn test_fixture_1_simple_pdf_der() {
    let bytes = read_fixture("simple_pdf_der.pdf.p7m");
    let out =
        inspect_p7m("simple_pdf_der.pdf.p7m", &bytes).expect("Failed to inspect simple_pdf_der");

    assert_eq!(out.report.original_file_name, "simple_pdf_der.pdf.p7m");
    assert_eq!(out.report.extracted_file_name, "simple_pdf_der.pdf");
    assert_eq!(out.report.document_kind, DocumentKind::Pdf);
    assert_eq!(out.report.mime_type, "application/pdf");
    assert_eq!(out.report.layers.len(), 1);

    let layer = &out.report.layers[0];
    assert_eq!(layer.depth, 1);
    assert_eq!(layer.encoding_detected, EncodingFormat::Der);
    assert_eq!(layer.signers.len(), 1);

    let signer = &layer.signers[0];
    assert_eq!(signer.common_name, "Mario Rossi");
    assert_eq!(signer.fiscal_code.as_deref(), Some("RSSMRA80A01H501U"));
    assert_eq!(signer.integrity, IntegrityStatus::VerifiedLocal);
    assert_eq!(signer.revocation, RevocationStatus::NotCheckedOffline);
    assert_eq!(signer.digest_algorithm, "SHA-256");

    assert!(out.payload.starts_with(b"%PDF-1.4"));
    assert_eq!(out.report.payload_size_bytes, out.payload.len());
}

#[test]
fn test_fixture_2_ber_indefinite() {
    let bytes = read_fixture("ber_indefinite.pdf.p7m");
    let out =
        inspect_p7m("ber_indefinite.pdf.p7m", &bytes).expect("Failed to inspect ber_indefinite");

    assert_eq!(out.report.extracted_file_name, "ber_indefinite.pdf");
    assert_eq!(out.report.document_kind, DocumentKind::Pdf);
    assert_eq!(out.report.layers.len(), 1);

    let layer = &out.report.layers[0];
    assert_eq!(layer.encoding_detected, EncodingFormat::BerIndefinite);
    assert_eq!(layer.signers.len(), 1);

    let signer = &layer.signers[0];
    assert_eq!(signer.common_name, "Mario Rossi");
    assert_eq!(signer.fiscal_code.as_deref(), Some("RSSMRA80A01H501U"));
    assert_eq!(signer.integrity, IntegrityStatus::VerifiedLocal);

    assert!(out.payload.starts_with(b"%PDF-1.4"));
}

#[test]
fn test_fixture_3_pem_base64() {
    let bytes = read_fixture("pem_base64.pdf.p7m");
    let out = inspect_p7m("pem_base64.pdf.p7m", &bytes).expect("Failed to inspect pem_base64");

    assert_eq!(out.report.extracted_file_name, "pem_base64.pdf");
    assert_eq!(out.report.document_kind, DocumentKind::Pdf);
    assert_eq!(out.report.layers.len(), 1);

    let layer = &out.report.layers[0];
    assert_eq!(layer.encoding_detected, EncodingFormat::Base64Pem);
    assert_eq!(layer.signers.len(), 1);

    let signer = &layer.signers[0];
    assert_eq!(signer.common_name, "Mario Rossi");
    assert_eq!(signer.integrity, IntegrityStatus::VerifiedLocal);

    assert!(out.payload.starts_with(b"%PDF-1.4"));
}

#[test]
fn test_fixture_4_nested_double() {
    let bytes = read_fixture("nested_double.pdf.p7m.p7m");
    let out =
        inspect_p7m("nested_double.pdf.p7m.p7m", &bytes).expect("Failed to inspect nested_double");

    assert_eq!(out.report.original_file_name, "nested_double.pdf.p7m.p7m");
    assert_eq!(out.report.extracted_file_name, "nested_double.pdf");
    assert_eq!(out.report.document_kind, DocumentKind::Pdf);
    assert_eq!(out.report.layers.len(), 2);

    // Layer 1 is outer envelope (signed by Giuseppe Verdi)
    let outer = &out.report.layers[0];
    assert_eq!(outer.depth, 1);
    assert_eq!(outer.signers.len(), 1);
    assert_eq!(outer.signers[0].common_name, "Giuseppe Verdi");
    assert_eq!(
        outer.signers[0].fiscal_code.as_deref(),
        Some("VRDGPP75B02H501Y")
    );
    assert_eq!(outer.signers[0].integrity, IntegrityStatus::VerifiedLocal);

    // Layer 2 is inner envelope (signed by Mario Rossi)
    let inner = &out.report.layers[1];
    assert_eq!(inner.depth, 2);
    assert_eq!(inner.signers.len(), 1);
    assert_eq!(inner.signers[0].common_name, "Mario Rossi");
    assert_eq!(
        inner.signers[0].fiscal_code.as_deref(),
        Some("RSSMRA80A01H501U")
    );
    assert_eq!(inner.signers[0].integrity, IntegrityStatus::VerifiedLocal);

    assert!(out.payload.starts_with(b"%PDF-1.4"));
}

#[test]
fn test_fixture_5_cosigned_multi() {
    let bytes = read_fixture("cosigned_multi.pdf.p7m");
    let out =
        inspect_p7m("cosigned_multi.pdf.p7m", &bytes).expect("Failed to inspect cosigned_multi");

    assert_eq!(out.report.extracted_file_name, "cosigned_multi.pdf");
    assert_eq!(out.report.document_kind, DocumentKind::Pdf);
    assert_eq!(out.report.layers.len(), 1);

    let layer = &out.report.layers[0];
    assert_eq!(layer.signers.len(), 2);

    let cns: Vec<&str> = layer
        .signers
        .iter()
        .map(|s| s.common_name.as_str())
        .collect();
    assert!(cns.contains(&"Mario Rossi"));
    assert!(cns.contains(&"Giuseppe Verdi"));

    for s in &layer.signers {
        assert_eq!(s.integrity, IntegrityStatus::VerifiedLocal);
    }

    assert!(out.payload.starts_with(b"%PDF-1.4"));
}

#[test]
fn test_fixture_6_fatturapa_valid() {
    let bytes = read_fixture("fatturapa_valid.xml.p7m");
    let out =
        inspect_p7m("fatturapa_valid.xml.p7m", &bytes).expect("Failed to inspect fatturapa_valid");

    assert_eq!(out.report.original_file_name, "fatturapa_valid.xml.p7m");
    assert_eq!(out.report.extracted_file_name, "fatturapa_valid.xml");
    assert_eq!(out.report.document_kind, DocumentKind::FatturaPaXml);
    assert_eq!(out.report.mime_type, "application/xml");
    assert_eq!(out.report.layers.len(), 1);
    assert_eq!(
        out.report.layers[0].signers[0].integrity,
        IntegrityStatus::VerifiedLocal
    );

    let text = String::from_utf8_lossy(&out.payload);
    assert!(text.contains("FatturaElettronica"));
    assert!(text.contains("Mario Rossi S.r.l."));
}

#[test]
fn test_fixture_7_fatturapa_xss_attack() {
    let bytes = read_fixture("fatturapa_xss_attack.xml.p7m");
    let out = inspect_p7m("fatturapa_xss_attack.xml.p7m", &bytes)
        .expect("Failed to inspect fatturapa_xss_attack");

    assert_eq!(out.report.document_kind, DocumentKind::FatturaPaXml);
    assert_eq!(out.report.mime_type, "application/xml");
    assert_eq!(
        out.report.layers[0].signers[0].integrity,
        IntegrityStatus::VerifiedLocal
    );

    let text = String::from_utf8_lossy(&out.payload);
    assert!(text.contains("<script>alert(1)</script>"));
}

#[test]
fn test_fixture_8_detached_only() {
    let bytes = read_fixture("detached_only.p7m");
    let out = inspect_p7m("detached_only.p7m", &bytes).expect("Failed to inspect detached_only");

    assert_eq!(out.report.payload_size_bytes, 0);
    assert!(out.payload.is_empty());
    assert_eq!(out.report.layers.len(), 1);
    assert_eq!(
        out.report.layers[0].signers[0].integrity,
        IntegrityStatus::DetachedSignature
    );
}

#[test]
fn test_fixture_9_tampered_digest() {
    let bytes = read_fixture("tampered_digest.pdf.p7m");
    let out =
        inspect_p7m("tampered_digest.pdf.p7m", &bytes).expect("Failed to inspect tampered_digest");

    assert_eq!(out.report.document_kind, DocumentKind::Pdf);
    assert_eq!(out.report.layers.len(), 1);
    assert_eq!(
        out.report.layers[0].signers[0].integrity,
        IntegrityStatus::DigestMismatch
    );
    assert!(out.payload.starts_with(b"%PDF-1.4"));
}

#[test]
fn test_fixture_10_corrupt_truncated_and_not_a_p7m() {
    let corrupt = read_fixture("corrupt_truncated.p7m");
    let err_corrupt = inspect_p7m("corrupt_truncated.p7m", &corrupt).unwrap_err();
    assert!(
        matches!(
            err_corrupt.code,
            P7MErrorCode::CorruptPayload | P7MErrorCode::InvalidFormat
        ),
        "Expected CorruptPayload or InvalidFormat, got: {:?}",
        err_corrupt.code
    );

    let not_p7m = read_fixture("not_a_p7m.txt");
    let err_not_p7m = inspect_p7m("not_a_p7m.txt", &not_p7m).unwrap_err();
    assert_eq!(err_not_p7m.code, P7MErrorCode::InvalidFormat);
}

#[test]
fn test_max_nesting_depth_guard() {
    assert_eq!(MAX_NESTING_DEPTH, 10);
}

#[test]
fn test_max_input_bytes_guard() {
    assert_eq!(MAX_INPUT_BYTES, 250 * 1024 * 1024);
    let oversized = vec![0u8; MAX_INPUT_BYTES + 1];
    let err = normalize_p7m_input(&oversized).unwrap_err();
    assert_eq!(err.code, P7MErrorCode::FileTooLarge);
}

#[test]
fn test_fiscal_code_normalization() {
    assert_eq!(
        normalize_fiscal_code("TINIT-RSSMRA80A01H501U"),
        Some("RSSMRA80A01H501U".to_string())
    );
    assert_eq!(
        normalize_fiscal_code("tinit-rssmra80a01h501u"),
        Some("RSSMRA80A01H501U".to_string())
    );
    assert_eq!(
        normalize_fiscal_code("IDC:IT-RSSMRA80A01H501U"),
        Some("RSSMRA80A01H501U".to_string())
    );
    assert_eq!(
        normalize_fiscal_code("idc:it-rssmra80a01h501u"),
        Some("RSSMRA80A01H501U".to_string())
    );
    assert_eq!(
        normalize_fiscal_code("RSSMRA80A01H501U"),
        Some("RSSMRA80A01H501U".to_string())
    );
    assert_eq!(
        normalize_fiscal_code("  TINIT-RSSMRA80A01H501U  \n"),
        Some("RSSMRA80A01H501U".to_string())
    );
    // Invalid / Non-CF
    assert_eq!(normalize_fiscal_code(""), None);
    assert_eq!(normalize_fiscal_code("12345"), None);
}

#[test]
fn test_security_fuzz_truncated_no_panic() {
    let bytes = read_fixture("simple_pdf_der.pdf.p7m");
    for i in 1..bytes.len().min(128) {
        let truncated = &bytes[..i];
        let _ = inspect_p7m("test.p7m", truncated); // Must never panic
    }
}
