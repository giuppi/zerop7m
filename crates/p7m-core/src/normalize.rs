use base64::prelude::*;

use crate::error::{P7MError, P7MErrorCode};
use crate::model::EncodingFormat;

pub const MAX_INPUT_BYTES: usize = 250 * 1024 * 1024; // 250 MiB

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NormalizedInput {
    pub bytes: Vec<u8>,
    pub format: EncodingFormat,
}

pub fn normalize_p7m_input(input: &[u8]) -> Result<NormalizedInput, P7MError> {
    if input.len() > MAX_INPUT_BYTES {
        return Err(P7MError::with_details(
            P7MErrorCode::FileTooLarge,
            "Input file exceeds maximum allowed size (250 MiB)",
            format!(
                "Size: {} bytes, max: {} bytes",
                input.len(),
                MAX_INPUT_BYTES
            ),
        ));
    }

    // 1. Strip UTF-8 BOM if present
    let mut data = input;
    if data.starts_with(&[0xEF, 0xBB, 0xBF]) {
        data = &data[3..];
    }

    // 2. Strip leading and trailing ASCII whitespace
    let is_ws = |b: &u8| matches!(*b, b' ' | b'\t' | b'\r' | b'\n');
    let start = data.iter().position(|b| !is_ws(b)).unwrap_or(data.len());
    let end = data
        .iter()
        .rposition(|b| !is_ws(b))
        .map(|p| p + 1)
        .unwrap_or(0);

    if start >= end {
        return Err(P7MError::new(
            P7MErrorCode::InvalidFormat,
            "Input file is empty or contains only whitespace",
        ));
    }

    let trimmed = &data[start..end];

    // 3. Binary vs Base64/PEM Sniffing
    if trimmed[0] == 0x30 {
        // ASN.1 SEQUENCE tag
        let format = if trimmed.len() > 1 && trimmed[1] == 0x80 {
            EncodingFormat::BerIndefinite
        } else {
            EncodingFormat::Der
        };
        return Ok(NormalizedInput {
            bytes: trimmed.to_vec(),
            format,
        });
    }

    // Check for PEM header (e.g. -----BEGIN PKCS7----- or -----BEGIN CMS-----)
    if let Some(begin_pos) = trimmed.windows(11).position(|w| w == b"-----BEGIN ") {
        let header_rest = &trimmed[begin_pos + 11..];
        if let Some(dash_pos) = header_rest.windows(5).position(|w| w == b"-----") {
            let after_header = &header_rest[dash_pos + 5..];
            let payload_bytes =
                if let Some(end_pos) = after_header.windows(9).position(|w| w == b"-----END ") {
                    &after_header[..end_pos]
                } else {
                    after_header
                };

            let clean_b64: Vec<u8> = payload_bytes
                .iter()
                .copied()
                .filter(|b| !is_ws(b))
                .collect();

            if let Ok(decoded) = BASE64_STANDARD.decode(&clean_b64)
                && !decoded.is_empty()
                && decoded[0] == 0x30
            {
                return Ok(NormalizedInput {
                    bytes: decoded,
                    format: EncodingFormat::Base64Pem,
                });
            }
        }
    }

    // Check for raw Base64 without PEM headers
    let clean_b64: Vec<u8> = trimmed.iter().copied().filter(|b| !is_ws(b)).collect();

    let is_valid_b64_char =
        |b: u8| b.is_ascii_alphanumeric() || b == b'+' || b == b'/' || b == b'=';

    if !clean_b64.is_empty()
        && clean_b64.len().is_multiple_of(4)
        && clean_b64.iter().all(|&b| is_valid_b64_char(b))
        && let Ok(decoded) = BASE64_STANDARD.decode(&clean_b64)
        && !decoded.is_empty()
        && decoded[0] == 0x30
    {
        return Ok(NormalizedInput {
            bytes: decoded,
            format: EncodingFormat::Base64Pem,
        });
    }

    Err(P7MError::new(
        P7MErrorCode::InvalidFormat,
        "File is not a valid ASN.1 CMS envelope or Base64/PEM encoded structure",
    ))
}
