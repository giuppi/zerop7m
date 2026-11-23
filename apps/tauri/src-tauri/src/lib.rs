pub mod commands;
pub mod protocol;
pub mod session;

use commands::LaunchFileState;
use session::SessionStore;
use std::sync::{Arc, Mutex};
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Detect cold-start launch file from command-line arguments
    let mut initial_file = None;
    for arg in std::env::args().skip(1) {
        if !arg.starts_with('-') {
            initial_file = Some(arg);
            break;
        }
    }

    let session_store = Arc::new(SessionStore::new());
    let store_for_protocol = Arc::clone(&session_store);

    let builder = tauri::Builder::default().plugin(tauri_plugin_dialog::init());

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
        if let Some(path) = argv.into_iter().skip(1).find(|arg| !arg.starts_with('-')) {
            let _ = app.emit(
                "zerop7m://open-file",
                serde_json::json!({ "pathOrUri": path }),
            );
        }
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }));

    builder
        .manage(session_store)
        .manage(LaunchFileState(Mutex::new(initial_file)))
        .register_uri_scheme_protocol("p7m", move |_app, request| {
            protocol::handle_p7m_request(&store_for_protocol, request)
        })
        .invoke_handler(tauri::generate_handler![
            commands::inspect_p7m_path,
            commands::inspect_p7m_bytes,
            commands::get_session_bytes,
            commands::release_session,
            commands::save_extracted_file,
            commands::get_launch_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
