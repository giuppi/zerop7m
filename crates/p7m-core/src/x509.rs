use rasn::types::Oid;

pub fn normalize_fiscal_code(input: &str) -> Option<String> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return None;
    }
    let lower = trimmed.to_ascii_lowercase();
    let cf = if lower.starts_with("tinit-") {
        &trimmed[6..]
    } else if lower.starts_with("idc:it-") {
        &trimmed[7..]
    } else {
        trimmed
    };
    let clean = cf.trim().to_ascii_uppercase();
    // Italian Fiscal Code is 16 chars alphanumeric (or 11 digits for Partita IVA)
    if (clean.len() == 16 || clean.len() == 11) && clean.chars().all(|c| c.is_ascii_alphanumeric())
    {
        Some(clean)
    } else {
        None
    }
}

pub fn extract_string_from_asn1_bytes(bytes: &[u8]) -> String {
    // Try DirectoryString decode first
    if let Ok(dir_str) = rasn::der::decode::<rasn_pkix::DirectoryString>(bytes) {
        match dir_str {
            rasn_pkix::DirectoryString::Utf8(s) => return s.as_str().to_string(),
            rasn_pkix::DirectoryString::Printable(s) => {
                return String::from_utf8_lossy(s.as_bytes()).to_string();
            }
            rasn_pkix::DirectoryString::Teletex(s) => {
                return String::from_utf8_lossy(&s.to_bytes()).to_string();
            }
            rasn_pkix::DirectoryString::Universal(s) => return s.as_str().to_string(),
            rasn_pkix::DirectoryString::Bmp(s) => {
                return String::from_utf8_lossy(&s.to_bytes()).to_string();
            }
        }
    }

    // Try Ia5String
    if let Ok(ia5) = rasn::der::decode::<rasn::types::Ia5String>(bytes) {
        return ia5.to_string();
    }

    // Fallback: parse TLV header if present
    if bytes.len() >= 2 {
        let len_byte = bytes[1] as usize;
        if len_byte < 128 && bytes.len() >= 2 + len_byte {
            return String::from_utf8_lossy(&bytes[2..2 + len_byte]).to_string();
        } else if len_byte > 128 {
            let num_len_bytes = len_byte - 128;
            if bytes.len() > 2 + num_len_bytes {
                return String::from_utf8_lossy(&bytes[2 + num_len_bytes..]).to_string();
            }
        }
    }

    String::from_utf8_lossy(bytes).to_string()
}

pub fn find_certificate<'a>(
    sid: &rasn_cms::SignerIdentifier,
    certs: Option<&'a rasn_cms::CertificateSet>,
) -> Option<&'a rasn_pkix::Certificate> {
    let certs = certs?;
    for choice in certs.iter() {
        if let rasn_cms::CertificateChoices::Certificate(cert) = choice {
            match sid {
                rasn_cms::SignerIdentifier::IssuerAndSerialNumber(ian) => {
                    if cert.tbs_certificate.issuer == ian.issuer
                        && cert.tbs_certificate.serial_number == ian.serial_number
                    {
                        return Some(cert.as_ref());
                    }
                }
                rasn_cms::SignerIdentifier::SubjectKeyIdentifier(ski) => {
                    if let Some(extensions) = &cert.tbs_certificate.extensions {
                        for ext in extensions.iter() {
                            // OID 2.5.29.14 = SubjectKeyIdentifier
                            if ext.extn_id.as_ref() == [2, 5, 29, 14]
                                && let Ok(cert_ski) =
                                    rasn::der::decode::<rasn_pkix::SubjectKeyIdentifier>(
                                        &ext.extn_value,
                                    )
                                && cert_ski.as_ref() == ski.as_ref()
                            {
                                return Some(cert.as_ref());
                            }
                        }
                    }
                }
            }
        }
    }
    None
}

#[derive(Debug, Default)]
pub struct SubjectRdns {
    pub common_name: Option<String>,
    pub given_name: Option<String>,
    pub surname: Option<String>,
    pub organization: Option<String>,
    pub serial_number_attr: Option<String>,
}

pub fn extract_subject_rdns(subject: &rasn_pkix::Name) -> SubjectRdns {
    let mut rdns = SubjectRdns::default();

    let rasn_pkix::Name::RdnSequence(rdn_seq) = subject;
    for rdn in rdn_seq.iter() {
        for atv in rdn.iter() {
            let oid = atv.r#type.as_ref();
            let val_bytes = atv.value.as_bytes();
            let str_val = extract_string_from_asn1_bytes(val_bytes);
            if oid == [2, 5, 4, 3] {
                // CN
                rdns.common_name = Some(str_val);
            } else if oid == [2, 5, 4, 42] {
                // givenName
                rdns.given_name = Some(str_val);
            } else if oid == [2, 5, 4, 4] {
                // surname
                rdns.surname = Some(str_val);
            } else if oid == [2, 5, 4, 10] {
                // O
                rdns.organization = Some(str_val);
            } else if oid == [2, 5, 4, 5] {
                // serialNumber (Italian Fiscal Code)
                rdns.serial_number_attr = Some(str_val);
            }
        }
    }

    rdns
}

pub fn extract_issuer_cn(issuer: &rasn_pkix::Name) -> String {
    let rasn_pkix::Name::RdnSequence(rdns) = issuer;
    for rdn in rdns.iter() {
        for atv in rdn.iter() {
            if atv.r#type.as_ref() == [2, 5, 4, 3] {
                // CN
                return extract_string_from_asn1_bytes(atv.value.as_bytes());
            }
        }
    }
    "Unknown Issuer".to_string()
}

pub fn format_serial_hex(serial: &rasn_pkix::CertificateSerialNumber) -> String {
    if let Ok(der) = rasn::der::encode(serial)
        && der.len() >= 2
        && der[0] == 0x02
    {
        let mut val_bytes = &der[2..];
        if val_bytes.len() > 1 && val_bytes[0] == 0x00 {
            val_bytes = &val_bytes[1..];
        }
        return val_bytes.iter().map(|b| format!("{:02X}", b)).collect();
    }
    serial.to_string()
}

pub fn format_time_iso(time: &rasn_pkix::Time) -> String {
    match time {
        rasn_pkix::Time::Utc(t) => t.to_rfc3339(),
        rasn_pkix::Time::General(t) => t.to_rfc3339(),
    }
}

pub fn extract_signing_time(signed_attrs: Option<&rasn_cms::SignedAttributes>) -> Option<String> {
    let attrs = signed_attrs?;
    for attr in attrs.iter() {
        // OID 1.2.840.113549.1.9.5 = SIGNING_TIME
        if attr.r#type.as_ref() == [1, 2, 840, 113549, 1, 9, 5]
            && let Some(val) = attr.values.iter().next()
            && let Ok(time) = rasn::der::decode::<rasn_pkix::Time>(val.as_bytes())
        {
            return Some(format_time_iso(&time));
        }
    }
    None
}

pub fn extract_rfc3161_timestamp(
    unsigned_attrs: Option<&rasn_cms::UnsignedAttributes>,
) -> Option<String> {
    let attrs = unsigned_attrs?;
    for attr in attrs.iter() {
        // OID 1.2.840.113549.1.9.16.2.14 = id-aa-timeStampToken
        if attr.r#type.as_ref() == [1, 2, 840, 113549, 1, 9, 16, 2, 14]
            && let Some(val) = attr.values.iter().next()
            && let Ok(ci) = rasn::der::decode::<rasn_cms::ContentInfo>(val.as_bytes())
            && ci.content_type.as_ref() == [1, 2, 840, 113549, 1, 7, 2]
            && let Ok(sd) = rasn::der::decode::<rasn_cms::SignedData>(ci.content.as_bytes())
            && let Some(content_bytes) = &sd.encap_content_info.content
            && let Ok(tst) = rasn::der::decode::<rasn_cms::tsp::TstInfo>(content_bytes.as_ref())
        {
            return Some(tst.gen_time.to_rfc3339());
        }
    }
    None
}

pub fn digest_algo_name(oid: &Oid) -> String {
    let s = oid.as_ref();
    if s == [2, 16, 840, 1, 101, 3, 4, 2, 1] {
        "SHA-256".to_string()
    } else if s == [2, 16, 840, 1, 101, 3, 4, 2, 2] {
        "SHA-384".to_string()
    } else if s == [2, 16, 840, 1, 101, 3, 4, 2, 3] {
        "SHA-512".to_string()
    } else if s == [1, 3, 14, 3, 2, 26] {
        "SHA-1".to_string()
    } else {
        oid.to_string()
    }
}
