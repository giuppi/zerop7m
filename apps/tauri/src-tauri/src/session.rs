use bytes::Bytes;
use std::collections::HashMap;
use std::sync::RwLock;
use std::time::Instant;

pub const MAX_SESSIONS: usize = 2;

#[derive(Clone, Debug)]
pub struct SessionEntry {
    pub session_id: String,
    pub extracted_file_name: String,
    pub mime_type: String,
    pub payload: Bytes,
    pub created_at: Instant,
}

#[derive(Default, Debug)]
pub struct SessionStore {
    inner: RwLock<HashMap<String, SessionEntry>>,
}

impl SessionStore {
    pub fn new() -> Self {
        Self {
            inner: RwLock::new(HashMap::new()),
        }
    }

    pub fn insert(&self, entry: SessionEntry) {
        let mut map = self.inner.write().unwrap();
        // Enforce MAX_SESSIONS = 2: evict oldest entry if at or above capacity
        if !map.contains_key(&entry.session_id)
            && map.len() >= MAX_SESSIONS
            && let Some(oldest_id) = map
                .iter()
                .min_by_key(|(_, v)| v.created_at)
                .map(|(k, _)| k.clone())
        {
            map.remove(&oldest_id);
        }
        map.insert(entry.session_id.clone(), entry);
    }

    pub fn get(&self, session_id: &str) -> Option<SessionEntry> {
        let map = self.inner.read().unwrap();
        map.get(session_id).cloned()
    }

    pub fn release(&self, session_id: &str) -> bool {
        let mut map = self.inner.write().unwrap();
        map.remove(session_id).is_some()
    }

    pub fn count(&self) -> usize {
        let map = self.inner.read().unwrap();
        map.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread::sleep;
    use std::time::Duration;

    #[test]
    fn test_session_store_eviction_max_sessions() {
        let store = SessionStore::new();

        let e1 = SessionEntry {
            session_id: "550e8400-e29b-41d4-a716-446655440001".to_string(),
            extracted_file_name: "doc1.pdf".to_string(),
            mime_type: "application/pdf".to_string(),
            payload: Bytes::from_static(b"doc1-content"),
            created_at: Instant::now(),
        };
        store.insert(e1);
        assert_eq!(store.count(), 1);
        assert!(store.get("550e8400-e29b-41d4-a716-446655440001").is_some());

        sleep(Duration::from_millis(5));

        let e2 = SessionEntry {
            session_id: "550e8400-e29b-41d4-a716-446655440002".to_string(),
            extracted_file_name: "doc2.pdf".to_string(),
            mime_type: "application/pdf".to_string(),
            payload: Bytes::from_static(b"doc2-content"),
            created_at: Instant::now(),
        };
        store.insert(e2);
        assert_eq!(store.count(), 2);
        assert!(store.get("550e8400-e29b-41d4-a716-446655440001").is_some());
        assert!(store.get("550e8400-e29b-41d4-a716-446655440002").is_some());

        sleep(Duration::from_millis(5));

        // Inserting 3rd entry must evict oldest (doc1)
        let e3 = SessionEntry {
            session_id: "550e8400-e29b-41d4-a716-446655440003".to_string(),
            extracted_file_name: "doc3.pdf".to_string(),
            mime_type: "application/pdf".to_string(),
            payload: Bytes::from_static(b"doc3-content"),
            created_at: Instant::now(),
        };
        store.insert(e3);

        assert_eq!(store.count(), 2);
        assert!(
            store.get("550e8400-e29b-41d4-a716-446655440001").is_none(),
            "Oldest session must be evicted"
        );
        assert!(store.get("550e8400-e29b-41d4-a716-446655440002").is_some());
        assert!(store.get("550e8400-e29b-41d4-a716-446655440003").is_some());

        // Test explicit release
        assert!(store.release("550e8400-e29b-41d4-a716-446655440002"));
        assert_eq!(store.count(), 1);
        assert!(store.get("550e8400-e29b-41d4-a716-446655440002").is_none());
    }
}
