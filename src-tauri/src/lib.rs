mod commands;

use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let shortcut = Shortcut::new(Some(Modifiers::ALT | Modifiers::SHIFT), Code::KeyS);

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
        ])
        .setup(move |app| {
            app.global_shortcut().register(shortcut)?;
            let handle = app.handle().clone();
            let _ = app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, _event| {
                commands::capture_and_process(&handle);
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
