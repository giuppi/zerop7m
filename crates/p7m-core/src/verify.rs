use num_bigint::BigUint;
use rasn::Decoder;
use rasn::types::OctetString;
use sha1::Digest;

use crate::model::IntegrityStatus;

#[derive(rasn::AsnType, rasn::Decode, Debug)]
struct RsaPublicKey {
    modulus: rasn::types::Integer,
    public_exponent: rasn::types::Integer,
}

fn extract_der_integer_bytes(der: &[u8]) -> Option<&[u8]> {
    if der.len() < 2 || der[0] != 0x02 {
        return None;
    }
    let len_byte = der[1] as usize;
    let (len, offset) = if len_byte < 128 {
        (len_byte, 2)
    } else {
        let num_len_bytes = len_byte - 128;
        if der.len() < 2 + num_len_bytes {
            return None;
        }
        let mut l = 0usize;
        for &b in &der[2..2 + num_len_bytes] {
            l = (l << 8) | (b as usize);
        }
        (l, 2 + num_len_bytes)
    };
    if der.len() < offset + len {
        return None;
    }
    let mut val = &der[offset..offset + len];
    if val.len() > 1 && val[0] == 0x00 {
        val = &val[1..];
    }
    Some(val)
}

pub fn compute_digest(
    algo_oid: &[u32],
    data: &[u8],
    warnings: &mut Vec<String>,
) -> Option<Vec<u8>> {
    if algo_oid == [2, 16, 840, 1, 101, 3, 4, 2, 1] {
        // SHA-256
        let hash = sha2::Sha256::digest(data);
        Some(hash.to_vec())
    } else if algo_oid == [2, 16, 840, 1, 101, 3, 4, 2, 2] {
        // SHA-384
        let hash = sha2::Sha384::digest(data);
        Some(hash.to_vec())
    } else if algo_oid == [2, 16, 840, 1, 101, 3, 4, 2, 3] {
        // SHA-512
        let hash = sha2::Sha512::digest(data);
        Some(hash.to_vec())
    } else if algo_oid == [1, 3, 14, 3, 2, 26] {
        // SHA-1 (legacy)
        warnings.push("Algoritmo SHA-1 obsoleto".to_string());
        let hash = sha1::Sha1::digest(data);
        Some(hash.to_vec())
    } else {
        None
    }
}

const SHA256_DIGEST_INFO_PREFIX: &[u8] = &[
    0x30, 0x31, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01, 0x05,
    0x00, 0x04, 0x20,
];

const SHA384_DIGEST_INFO_PREFIX: &[u8] = &[
    0x30, 0x41, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x02, 0x05,
    0x00, 0x04, 0x30,
];

const SHA512_DIGEST_INFO_PREFIX: &[u8] = &[
    0x30, 0x51, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x03, 0x05,
    0x00, 0x04, 0x40,
];

const SHA1_DIGEST_INFO_PREFIX: &[u8] = &[
    0x30, 0x21, 0x30, 0x09, 0x06, 0x05, 0x2b, 0x0e, 0x03, 0x02, 0x1a, 0x05, 0x00, 0x04, 0x14,
];

fn get_digest_info_prefix(algo_oid: &[u32]) -> Option<&'static [u8]> {
    if algo_oid == [2, 16, 840, 1, 101, 3, 4, 2, 1] {
        Some(SHA256_DIGEST_INFO_PREFIX)
    } else if algo_oid == [2, 16, 840, 1, 101, 3, 4, 2, 2] {
        Some(SHA384_DIGEST_INFO_PREFIX)
    } else if algo_oid == [2, 16, 840, 1, 101, 3, 4, 2, 3] {
        Some(SHA512_DIGEST_INFO_PREFIX)
    } else if algo_oid == [1, 3, 14, 3, 2, 26] {
        Some(SHA1_DIGEST_INFO_PREFIX)
    } else {
        None
    }
}

pub fn verify_signer(
    signer_info: &rasn_cms::SignerInfo,
    cert_opt: Option<&rasn_pkix::Certificate>,
    content_bytes: &[u8],
    warnings: &mut Vec<String>,
) -> IntegrityStatus {
    let digest_oid = signer_info.digest_algorithm.algorithm.as_ref();

    let computed_content_digest = match compute_digest(digest_oid, content_bytes, warnings) {
        Some(d) => d,
        None => return IntegrityStatus::UnsupportedAlgo,
    };

    // If signed_attrs are present:
    // 1. Verify messageDigest attribute matches computed digest of content
    // 2. Compute digest of DER SET OF signed_attrs
    let data_to_verify_against_signature = if let Some(signed_attrs) = &signer_info.signed_attrs {
        let mut msg_digest_attr: Option<Vec<u8>> = None;
        for attr in signed_attrs.iter() {
            // OID 1.2.840.113549.1.9.4 = MESSAGE_DIGEST
            if attr.r#type.as_ref() == [1, 2, 840, 113549, 1, 9, 4]
                && let Some(val) = attr.values.iter().next()
                && let Ok(oct) = rasn::der::decode::<OctetString>(val.as_bytes())
            {
                msg_digest_attr = Some(oct.as_ref().to_vec());
            }
        }

        match msg_digest_attr {
            Some(expected_digest) => {
                if computed_content_digest != expected_digest {
                    return IntegrityStatus::DigestMismatch;
                }
            }
            None => return IntegrityStatus::ParseWarning,
        }

        // Re-encode signed_attrs with DER SET OF tag (0x31)
        let signed_attrs_der = match rasn::der::encode(signed_attrs) {
            Ok(bytes) => bytes,
            Err(_) => return IntegrityStatus::ParseWarning,
        };

        match compute_digest(digest_oid, &signed_attrs_der, warnings) {
            Some(d) => d,
            None => return IntegrityStatus::UnsupportedAlgo,
        }
    } else {
        computed_content_digest
    };

    // Now verify the asymmetric signature against the certificate public key
    let cert = match cert_opt {
        Some(c) => c,
        None => return IntegrityStatus::UnsupportedAlgo,
    };

    let spki = &cert.tbs_certificate.subject_public_key_info;
    let pubkey_algo_oid = spki.algorithm.algorithm.as_ref();

    // Check if RSA
    let is_rsa = pubkey_algo_oid == [1, 2, 840, 113549, 1, 1, 1] // rsaEncryption
        || pubkey_algo_oid == [1, 2, 840, 113549, 1, 1, 11] // sha256WithRSAEncryption
        || pubkey_algo_oid == [1, 2, 840, 113549, 1, 1, 5] // sha1WithRSAEncryption
        || pubkey_algo_oid == [1, 2, 840, 113549, 1, 1, 12] // sha384WithRSAEncryption
        || pubkey_algo_oid == [1, 2, 840, 113549, 1, 1, 13]; // sha512WithRSAEncryption

    if !is_rsa {
        return IntegrityStatus::UnsupportedAlgo;
    }

    let rsa_pub: RsaPublicKey = match rasn::der::decode(spki.subject_public_key.as_raw_slice()) {
        Ok(k) => k,
        Err(_) => return IntegrityStatus::ParseWarning,
    };

    let n_der = match rasn::der::encode(&rsa_pub.modulus) {
        Ok(d) => d,
        Err(_) => return IntegrityStatus::ParseWarning,
    };
    let e_der = match rasn::der::encode(&rsa_pub.public_exponent) {
        Ok(d) => d,
        Err(_) => return IntegrityStatus::ParseWarning,
    };

    let n_bytes = match extract_der_integer_bytes(&n_der) {
        Some(b) => b,
        None => return IntegrityStatus::ParseWarning,
    };
    let e_bytes = match extract_der_integer_bytes(&e_der) {
        Some(b) => b,
        None => return IntegrityStatus::ParseWarning,
    };

    let n = BigUint::from_bytes_be(n_bytes);
    let e = BigUint::from_bytes_be(e_bytes);

    let sig_bytes = signer_info.signature.as_ref();
    let s = BigUint::from_bytes_be(sig_bytes);

    // Modular exponentiation: m = s^e mod n
    let m = s.modpow(&e, &n);
    let k = n_bytes.len();
    let mut m_bytes = m.to_bytes_be();
    if m_bytes.len() < k {
        let mut padded = vec![0u8; k - m_bytes.len()];
        padded.extend_from_slice(&m_bytes);
        m_bytes = padded;
    }

    let digest_info_prefix = match get_digest_info_prefix(digest_oid) {
        Some(p) => p,
        None => return IntegrityStatus::UnsupportedAlgo,
    };

    let mut expected_t =
        Vec::with_capacity(digest_info_prefix.len() + data_to_verify_against_signature.len());
    expected_t.extend_from_slice(digest_info_prefix);
    expected_t.extend_from_slice(&data_to_verify_against_signature);

    let t_len = expected_t.len();
    if k < t_len + 11 {
        return IntegrityStatus::SignatureInvalid;
    }

    // Check PKCS#1 v1.5 padding: 0x00 0x01 [0xFF ... 0xFF] 0x00 [DigestInfo]
    if m_bytes[0] != 0x00 || m_bytes[1] != 0x01 {
        return IntegrityStatus::SignatureInvalid;
    }

    let ps_end = k - t_len - 1;
    for &b in &m_bytes[2..ps_end] {
        if b != 0xFF {
            return IntegrityStatus::SignatureInvalid;
        }
    }

    if m_bytes[ps_end] != 0x00 {
        return IntegrityStatus::SignatureInvalid;
    }

    if &m_bytes[ps_end + 1..] != expected_t.as_slice() {
        return IntegrityStatus::SignatureInvalid;
    }

    IntegrityStatus::VerifiedLocal
}
