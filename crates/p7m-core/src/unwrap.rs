use rasn_cms::{CONTENT_ENVELOPED_DATA, CONTENT_SIGNED_DATA, ContentInfo, SignedData};

use crate::error::{P7MError, P7MErrorCode};
use crate::model::{EncodingFormat, RevocationStatus, SignatureLayer, SignerSummary};
use crate::verify::verify_signer;
use crate::x509::{
    digest_algo_name, extract_issuer_cn, extract_rfc3161_timestamp, extract_signing_time,
    extract_subject_rdns, find_certificate, format_serial_hex, format_time_iso,
    normalize_fiscal_code,
};

pub const MAX_NESTING_DEPTH: usize = 10;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UnwrappedCms {
    pub layers: Vec<SignatureLayer>,
    pub payload: Vec<u8>,
    pub warnings: Vec<String>,
}

pub fn unwrap_cms(
    initial_bytes: &[u8],
    initial_format: EncodingFormat,
) -> Result<UnwrappedCms, P7MError> {
    let mut current_bytes = initial_bytes.to_vec();
    let mut current_format = initial_format;
    let mut layers = Vec::new();
    let mut warnings = Vec::new();
    let mut depth = 1u32;
    let final_payload;

    loop {
        if depth > MAX_NESTING_DEPTH as u32 {
            return Err(P7MError::new(
                P7MErrorCode::MaxNestingExceeded,
                format!("Exceeded maximum nesting depth of {MAX_NESTING_DEPTH}"),
            ));
        }

        let content_info: ContentInfo = match rasn::ber::decode(&current_bytes) {
            Ok(ci) => ci,
            Err(e) => {
                if depth == 1 {
                    return Err(P7MError::with_details(
                        P7MErrorCode::CorruptPayload,
                        "Failed to decode CMS ContentInfo structure",
                        e.to_string(),
                    ));
                }
                final_payload = current_bytes;
                break;
            }
        };

        if content_info.content_type == *CONTENT_ENVELOPED_DATA {
            return Err(P7MError::new(
                P7MErrorCode::UnsupportedCmsType,
                "Encrypted CMS envelopes (EnvelopedData) are not supported",
            ));
        }

        if content_info.content_type != *CONTENT_SIGNED_DATA {
            if depth == 1 {
                return Err(P7MError::new(
                    P7MErrorCode::UnsupportedCmsType,
                    format!(
                        "Unsupported CMS content type: {}",
                        content_info.content_type
                    ),
                ));
            }
            final_payload = current_bytes;
            break;
        }

        let signed_data: SignedData = match rasn::ber::decode(content_info.content.as_bytes()) {
            Ok(sd) => sd,
            Err(e) => {
                if depth == 1 {
                    return Err(P7MError::with_details(
                        P7MErrorCode::CorruptPayload,
                        "Failed to decode SignedData structure in CMS envelope",
                        e.to_string(),
                    ));
                }
                final_payload = current_bytes;
                break;
            }
        };

        let mut signers = Vec::new();
        let encap_content = &signed_data.encap_content_info.content;

        for signer_info in signed_data.signer_infos.iter() {
            let cert_opt = find_certificate(&signer_info.sid, signed_data.certificates.as_ref());

            let integrity = match encap_content {
                None => crate::model::IntegrityStatus::DetachedSignature,
                Some(octets) => {
                    verify_signer(signer_info, cert_opt, octets.as_ref(), &mut warnings)
                }
            };

            let rdns = match cert_opt {
                Some(cert) => extract_subject_rdns(&cert.tbs_certificate.subject),
                None => Default::default(),
            };

            let common_name = rdns
                .common_name
                .unwrap_or_else(|| "Firmatario non identificato".to_string());
            let fiscal_code = rdns
                .serial_number_attr
                .as_deref()
                .and_then(normalize_fiscal_code);

            let issuer_cn = match cert_opt {
                Some(cert) => extract_issuer_cn(&cert.tbs_certificate.issuer),
                None => "Emittente sconosciuto".to_string(),
            };

            let serial_number_hex = match cert_opt {
                Some(cert) => format_serial_hex(&cert.tbs_certificate.serial_number),
                None => String::new(),
            };

            let valid_from_iso = match cert_opt {
                Some(cert) => format_time_iso(&cert.tbs_certificate.validity.not_before),
                None => String::new(),
            };

            let valid_to_iso = match cert_opt {
                Some(cert) => format_time_iso(&cert.tbs_certificate.validity.not_after),
                None => String::new(),
            };

            let declared_signing_time_iso = extract_signing_time(signer_info.signed_attrs.as_ref());
            let timestamp_iso = extract_rfc3161_timestamp(signer_info.unsigned_attrs.as_ref());
            let digest_algorithm = digest_algo_name(&signer_info.digest_algorithm.algorithm);

            signers.push(SignerSummary {
                common_name,
                given_name: rdns.given_name,
                surname: rdns.surname,
                fiscal_code,
                organization: rdns.organization,
                issuer_cn,
                serial_number_hex,
                valid_from_iso,
                valid_to_iso,
                declared_signing_time_iso,
                timestamp_iso,
                digest_algorithm,
                integrity,
                revocation: RevocationStatus::NotCheckedOffline,
            });
        }

        layers.push(SignatureLayer {
            depth,
            encoding_detected: current_format,
            signers,
        });

        match encap_content {
            None => {
                final_payload = Vec::new();
                break;
            }
            Some(octets) => {
                let extracted = octets.as_ref().to_vec();

                let is_inner_cms = extracted.starts_with(&[0x30])
                    && rasn::ber::decode::<ContentInfo>(&extracted)
                        .map(|inner_ci| inner_ci.content_type == *CONTENT_SIGNED_DATA)
                        .unwrap_or(false);

                if is_inner_cms {
                    if depth >= MAX_NESTING_DEPTH as u32 {
                        return Err(P7MError::new(
                            P7MErrorCode::MaxNestingExceeded,
                            format!("Exceeded maximum nesting depth of {MAX_NESTING_DEPTH}"),
                        ));
                    }
                    current_format = if extracted.len() > 1 && extracted[1] == 0x80 {
                        EncodingFormat::BerIndefinite
                    } else {
                        EncodingFormat::Der
                    };
                    current_bytes = extracted;
                    depth += 1;
                } else {
                    final_payload = extracted;
                    break;
                }
            }
        }
    }

    Ok(UnwrappedCms {
        layers,
        payload: final_payload,
        warnings,
    })
}
