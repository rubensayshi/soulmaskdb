mod commands;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let shortcut = Shortcut::new(Some(Modifiers::ALT | Modifiers::SHIFT), Code::KeyS);
    let capturing = Arc::new(AtomicBool::new(false));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::process_images,
            commands::save_roster,
            commands::load_roster,
            commands::capture_screen,
            commands::debug_capture,
        ])
        .setup(move |app| {
            let handle = app.handle().clone();
            app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, _event| {
                // Prevent double-firing from key repeat
                if capturing.compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst).is_ok() {
                    let capturing_clone = capturing.clone();
                    let handle_clone = handle.clone();
                    tauri::async_runtime::spawn(async move {
                        commands::capture_and_process_inner(&handle_clone).await;
                        capturing_clone.store(false, Ordering::SeqCst);
                    });
                }
            })?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
