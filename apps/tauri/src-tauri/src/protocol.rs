use crate::session::SessionStore;
use std::sync::Arc;
use uuid::Uuid;

/// Extract and strictly validate session UUID from request path.
/// Rejects path traversal attempts, incorrect prefixes, and non-UUID inputs.
pub fn extract_session_id_from_path(raw_path: &str) -> Option<String> {
    // Explicitly reject traversal patterns before parsing
    if raw_path.contains("..")
        || raw_path.contains('\\')
        || raw_path.contains("%2e")
        || raw_path.contains("%2E")
    {
        return None;
    }

    let trimmed = raw_path.trim_start_matches('/');
    let segments: Vec<&str> = trimmed.split('/').collect();

    if segments.len() != 2 {
        return None;
    }

    if segments[0] != "session" {
        return None;
    }

    let uuid_str = segments[1];
    // Validate UUID format strictly (UUID v4)
    if let Ok(parsed) = Uuid::parse_str(uuid_str) {
        Some(parsed.to_string())
    } else {
        None
    }
}

pub fn handle_p7m_request(
    store: &Arc<SessionStore>,
    request: tauri::http::Request<Vec<u8>>,
) -> tauri::http::Response<Vec<u8>> {
    let path = request.uri().path();

    let session_id = match extract_session_id_from_path(path) {
        Some(id) => id,
        None => {
            return tauri::http::Response::builder()
                .status(404)
                .header("Content-Type", "text/plain")
                .header("Cache-Control", "no-store")
                .body(b"404 Not Found - Invalid session path".to_vec())
                .unwrap();
        }
    };

    match store.get(&session_id) {
        Some(entry) => tauri::http::Response::builder()
            .status(200)
            .header("Content-Type", &entry.mime_type)
            .header("Cache-Control", "no-store")
            .header("Access-Control-Allow-Origin", "*")
            .header("X-Content-Type-Options", "nosniff")
            .body(entry.payload.to_vec())
            .unwrap(),
        None => tauri::http::Response::builder()
            .status(404)
            .header("Content-Type", "text/plain")
            .header("Cache-Control", "no-store")
            .body(b"404 Not Found - Session expired or not found".to_vec())
            .unwrap(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_uuid_extraction() {
        let valid_path = "/session/550e8400-e29b-41d4-a716-446655440000";
        let extracted = extract_session_id_from_path(valid_path);
        assert_eq!(
            extracted,
            Some("550e8400-e29b-41d4-a716-446655440000".to_string())
        );

        let valid_without_slash = "session/550e8400-e29b-41d4-a716-446655440000";
        assert_eq!(
            extract_session_id_from_path(valid_without_slash),
            Some("550e8400-e29b-41d4-a716-446655440000".to_string())
        );
    }

    #[test]
    fn test_path_traversal_rejection() {
        assert_eq!(extract_session_id_from_path("/session/../etc/passwd"), None);
        assert_eq!(
            extract_session_id_from_path("session/../../windows/system32"),
            None
        );
        assert_eq!(extract_session_id_from_path("/session/%2e%2e/passwd"), None);
        assert_eq!(extract_session_id_from_path("/session/%2E%2E/passwd"), None);
        assert_eq!(extract_session_id_from_path("/session/..\\windows"), None);
    }

    #[test]
    fn test_invalid_uuid_rejection() {
        assert_eq!(
            extract_session_id_from_path("/session/not-a-valid-uuid"),
            None
        );
        assert_eq!(extract_session_id_from_path("/session/12345"), None);
        assert_eq!(extract_session_id_from_path("/session/"), None);
    }

    #[test]
    fn test_invalid_prefix_rejection() {
        assert_eq!(
            extract_session_id_from_path("/files/550e8400-e29b-41d4-a716-446655440000"),
            None
        );
        assert_eq!(
            extract_session_id_from_path("/session/550e8400-e29b-41d4-a716-446655440000/extra"),
            None
        );
    }
}
