use serde::{Deserialize, Serialize};
use thiserror::Error;
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum P7MErrorCode {
    InvalidFormat,
    UnsupportedCmsType,
    DetachedNoContent,
    MaxNestingExceeded,
    FileTooLarge,
    IoReadFailed,
    CorruptPayload,
    InternalError,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, Error)]
#[serde(rename_all = "camelCase")]
#[error("{message}")]
pub struct P7MError {
    pub code: P7MErrorCode,
    pub message: String,
    #[ts(optional)]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
}

impl P7MError {
    pub fn new(code: P7MErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            details: None,
        }
    }

    pub fn with_details(
        code: P7MErrorCode,
        message: impl Into<String>,
        details: impl Into<String>,
    ) -> Self {
        Self {
            code,
            message: message.into(),
            details: Some(details.into()),
        }
    }
}
