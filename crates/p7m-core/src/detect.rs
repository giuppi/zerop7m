use crate::model::DocumentKind;

pub fn clean_p7m_file_name(file_name: &str) -> String {
    let mut clean = file_name.trim();
    loop {
        if clean.to_ascii_lowercase().ends_with(".p7m") {
            clean = &clean[..clean.len() - 4];
        } else {
            break;
        }
    }
    if clean.is_empty() {
        "extracted_document".to_string()
    } else {
        clean.to_string()
    }
}

pub fn detect_content(payload: &[u8]) -> (DocumentKind, String) {
    if payload.is_empty() {
        return (
            DocumentKind::Unknown,
            "application/octet-stream".to_string(),
        );
    }

    let head_len = payload.len().min(4096);
    let head = &payload[..head_len];

    // FatturaPA XML heuristic (check before standard XML / plain text)
    if let Ok(head_str) = std::str::from_utf8(head) {
        let trimmed_head = head_str.trim_start();
        if (trimmed_head.starts_with("<?xml") || trimmed_head.starts_with('<'))
            && (head_str.contains("FatturaElettronica")
                || head_str.contains("FatturaElettronicaHeader"))
        {
            return (DocumentKind::FatturaPaXml, "application/xml".to_string());
        }
    } else {
        // Fallback for UTF-8 lossy in case of non-UTF8 characters in the first 4KB
        let lossy = String::from_utf8_lossy(head);
        let trimmed_lossy = lossy.trim_start();
        if (trimmed_lossy.starts_with("<?xml") || trimmed_lossy.starts_with('<'))
            && (lossy.contains("FatturaElettronica") || lossy.contains("FatturaElettronicaHeader"))
        {
            return (DocumentKind::FatturaPaXml, "application/xml".to_string());
        }
    }

    // Infer magic byte MIME detection
    if let Some(inferred) = infer::get(payload) {
        let mime = inferred.mime_type();
        if mime == "application/pdf" || payload.starts_with(b"%PDF-") {
            return (DocumentKind::Pdf, "application/pdf".to_string());
        }
        if mime.starts_with("image/") {
            return (DocumentKind::Image, mime.to_string());
        }
        if mime == "application/xml" || mime == "text/xml" {
            return (DocumentKind::Text, mime.to_string());
        }
        return (DocumentKind::Unknown, mime.to_string());
    }

    // PDF fallback (in case infer didn't catch header)
    if payload.starts_with(b"%PDF-") {
        return (DocumentKind::Pdf, "application/pdf".to_string());
    }

    // Text / UTF-8 fallback
    if std::str::from_utf8(head).is_ok() {
        let is_mostly_printable = head.iter().all(|&b| {
            b == b'\r' || b == b'\n' || b == b'\t' || (0x20..=0x7E).contains(&b) || b >= 0x80
        });
        if is_mostly_printable {
            return (DocumentKind::Text, "text/plain".to_string());
        }
    }

    (
        DocumentKind::Unknown,
        "application/octet-stream".to_string(),
    )
}
