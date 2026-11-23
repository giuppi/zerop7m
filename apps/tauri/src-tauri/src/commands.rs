use crate::session::{SessionEntry, SessionStore};
use bytes::Bytes;
use p7m_core::{P7MError, P7MErrorCode, P7MInspectionReport};
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::State;

pub struct LaunchFileState(pub Mutex<Option<String>>);

#[tauri::command]
pub async fn inspect_p7m_path(
    path_or_uri: String,
    store: State<'_, Arc<SessionStore>>,
) -> Result<P7MInspectionReport, P7MError> {
    let path = Path::new(&path_or_uri);

    // Verify size guard before reading (500 MB max for native desktop)
    if std::fs::metadata(path).is_ok_and(|meta| meta.len() > 500 * 1024 * 1024) {
        return Err(P7MError::new(
            P7MErrorCode::FileTooLarge,
            "Il file supera la dimensione massima consentita di 500 MB",
        ));
    }

    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("documento.p7m");

    let bytes = std::fs::read(path).map_err(|err| {
        P7MError::new(
            P7MErrorCode::IoReadFailed,
            format!("Impossibile leggere il file specificato: {}", err),
        )
    })?;

    let output = p7m_core::inspect_p7m(file_name, &bytes)?;

    let entry = SessionEntry {
        session_id: output.report.session_id.clone(),
        extracted_file_name: output.report.extracted_file_name.clone(),
        mime_type: output.report.mime_type.clone(),
        payload: Bytes::from(output.payload),
        created_at: Instant::now(),
    };

    store.insert(entry);
    Ok(output.report)
}

#[tauri::command]
pub async fn inspect_p7m_bytes(
    file_name: String,
    bytes: Vec<u8>,
    store: State<'_, Arc<SessionStore>>,
) -> Result<P7MInspectionReport, P7MError> {
    if bytes.len() > 500 * 1024 * 1024 {
        return Err(P7MError::new(
            P7MErrorCode::FileTooLarge,
            "Il file supera la dimensione massima consentita di 500 MB",
        ));
    }

    let output = p7m_core::inspect_p7m(&file_name, &bytes)?;

    let entry = SessionEntry {
        session_id: output.report.session_id.clone(),
        extracted_file_name: output.report.extracted_file_name.clone(),
        mime_type: output.report.mime_type.clone(),
        payload: Bytes::from(output.payload),
        created_at: Instant::now(),
    };

    store.insert(entry);
    Ok(output.report)
}

#[tauri::command]
pub async fn get_session_bytes(
    session_id: String,
    store: State<'_, Arc<SessionStore>>,
) -> Result<Vec<u8>, P7MError> {
    let entry = store.get(&session_id).ok_or_else(|| {
        P7MError::new(
            P7MErrorCode::InternalError,
            "Sessione non trovata o scaduta in memoria volatile",
        )
    })?;
    Ok(entry.payload.to_vec())
}

#[tauri::command]
pub async fn release_session(
    session_id: String,
    store: State<'_, Arc<SessionStore>>,
) -> Result<(), P7MError> {
    store.release(&session_id);
    Ok(())
}

#[tauri::command]
pub async fn save_extracted_file(
    session_id: String,
    target_path: String,
    store: State<'_, Arc<SessionStore>>,
) -> Result<(), P7MError> {
    let entry = store.get(&session_id).ok_or_else(|| {
        P7MError::new(
            P7MErrorCode::InternalError,
            "Sessione non trovata o scaduta in memoria volatile",
        )
    })?;

    if entry.payload.is_empty() {
        return Err(P7MError::new(
            P7MErrorCode::InternalError,
            "I dati estratti dal documento sono vuoti (0 bytes)",
        ));
    }

    std::fs::write(&target_path, &entry.payload).map_err(|err| {
        P7MError::new(
            P7MErrorCode::IoReadFailed,
            format!("Impossibile salvare la copia estratta: {}", err),
        )
    })?;

    Ok(())
}

#[tauri::command]
pub fn get_launch_file(state: State<'_, LaunchFileState>) -> Option<String> {
    state.0.lock().ok().and_then(|mut guard| guard.take())
}
