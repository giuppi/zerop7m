//! WebAssembly bindings for ZeroP7M (OpenCAdES).

#![forbid(unsafe_code)]

use js_sys::{Object, Reflect, Uint8Array};
use serde::Serialize;
use wasm_bindgen::prelude::*;

pub use p7m_core::*;

/// Inspect and extract payload and signature metadata from a .p7m file.
/// Returns a JS Object: { report: P7MInspectionReport, payload: Uint8Array }
#[wasm_bindgen]
pub fn inspect_p7m(file_name: &str, bytes: &[u8]) -> Result<JsValue, JsValue> {
    match p7m_core::inspect_p7m(file_name, bytes) {
        Ok(output) => {
            let serializer = serde_wasm_bindgen::Serializer::json_compatible();
            let report_js = output
                .report
                .serialize(&serializer)
                .map_err(|e| JsValue::from_str(&e.to_string()))?;

            let payload_u8 = Uint8Array::from(&output.payload[..]);

            let obj = Object::new();
            Reflect::set(&obj, &JsValue::from_str("report"), &report_js)
                .map_err(|e| JsValue::from_str(&format!("{e:?}")))?;
            Reflect::set(&obj, &JsValue::from_str("payload"), &payload_u8.into())
                .map_err(|e| JsValue::from_str(&format!("{e:?}")))?;

            Ok(obj.into())
        }
        Err(err) => {
            let serializer = serde_wasm_bindgen::Serializer::json_compatible();
            let err_js = err
                .serialize(&serializer)
                .map_err(|e| JsValue::from_str(&e.to_string()))?;
            Err(err_js)
        }
    }
}
