use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::{AppHandle, Emitter, Manager};
use xcap::{Monitor, Window};

#[derive(Debug, Serialize, Deserialize)]
pub struct TraitMatch {
    pub icon_name: String,
    pub confidence: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Tribesman {
    pub name: String,
    pub level: Option<i32>,
    pub class: Option<String>,
    pub clan: Option<String>,
    pub title: Option<String>,
    pub location: Option<String>,
    pub traits: Vec<TraitMatch>,
    #[serde(default)]
    pub captured_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessResult {
    pub tribesmen: Vec<Tribesman>,
    pub cards_found: usize,
    #[serde(default)]
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Roster {
    pub last_updated: String,
    pub tribesmen: Vec<Tribesman>,
}

#[tauri::command]
pub async fn process_images(paths: Vec<String>, app: AppHandle) -> Result<ProcessResult, String> {
    // In dev mode, resources are NOT copied into resource_dir — they live at the project root.
    // The binary is at src-tauri/target/debug/screenread.exe, so go up 3 levels to the project root.
    // In release/bundle mode, resource_dir() contains the bundled copies.
    let project_root = if cfg!(debug_assertions) {
        std::env::current_exe()
            .ok()
            .and_then(|p| {
                p.parent() // debug/
                    .and_then(|p| p.parent()) // target/
                    .and_then(|p| p.parent()) // src-tauri/
                    .and_then(|p| p.parent()) // project root
                    .map(|p| p.to_path_buf())
            })
    } else {
        None
    };

    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?;

    let base_dir = project_root.unwrap_or(resource_dir);
    let atlas_dir = base_dir.join("assets").join("atlas");
    let sidecar_dir = base_dir.join("sidecar");
    let process_py = sidecar_dir.join("process.py");

    let mut all_tribesmen = Vec::new();
    let mut total_cards = 0;

    for path in &paths {
        let python = if cfg!(windows) { "python" } else { "python3" };
        let path_exists = std::path::Path::new(path.as_str()).exists();
        eprintln!("[sidecar] running: {} {:?} {:?} --atlas {:?} (file_exists={})", python, process_py, path, atlas_dir, path_exists);
        log_to_file(&format!("[sidecar] path={} exists={}", path, path_exists));
        let output = Command::new(python)
            .arg(&process_py)
            .arg(path)
            .arg("--atlas")
            .arg(&atlas_dir)
            .current_dir(&sidecar_dir)  // set cwd so relative imports work
            .env("PYTHONPATH", &sidecar_dir)  // also add to PYTHONPATH for safety
            .output()
            .map_err(|e| format!("Failed to run sidecar: {} (process_py={})", e, process_py.display()))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            eprintln!("[sidecar] exit={} stdout={:?} stderr={:?}", output.status, &*stdout, &*stderr);
            if let Ok(result) = serde_json::from_str::<ProcessResult>(&stdout) {
                if let Some(err) = result.error {
                    return Err(format!("py: {} | stderr: {}", err, stderr.trim()));
                }
            }
            return Err(format!("Sidecar failed | stdout: {:?} | stderr: {:?}", stdout.trim(), stderr.trim()));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let result: ProcessResult =
            serde_json::from_str(&stdout).map_err(|e| format!("Invalid JSON from sidecar: {}", e))?;

        total_cards += result.cards_found;
        all_tribesmen.extend(result.tribesmen);
    }

    Ok(ProcessResult {
        tribesmen: all_tribesmen,
        cards_found: total_cards,
        error: None,
    })
}

#[tauri::command]
pub async fn save_roster(roster: Roster, app: AppHandle) -> Result<(), String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let path = data_dir.join("roster.json");
    let json = serde_json::to_string_pretty(&roster).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn load_roster(app: AppHandle) -> Result<Option<Roster>, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let path = data_dir.join("roster.json");
    if !path.exists() {
        return Ok(None);
    }
    let json = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let roster: Roster = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    Ok(Some(roster))
}

#[tauri::command]
pub async fn capture_screen(_app: AppHandle) -> Result<String, String> {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let path = std::env::temp_dir().join(format!("screenread_capture_{}.png", timestamp));

    let image = capture_game_image()?;
    image.save(&path).map_err(|e| format!("Failed to save screenshot: {}", e))?;
    Ok(path.to_string_lossy().to_string())
}

/// Try to capture the Soulmask window directly; fall back to the largest monitor.
/// Window capture works even when the game is on a non-primary monitor and crops
/// out desktop chrome — giving detect_cards cleaner input.
fn capture_game_image() -> Result<xcap::image::RgbaImage, String> {
    // 1. Try direct window capture
    if let Ok(windows) = Window::all() {
        let soulmask = windows.into_iter().find(|w| {
            let title = w.title().unwrap_or_default().to_lowercase();
            let app   = w.app_name().unwrap_or_default().to_lowercase();
            title.contains("soulmask")
                || app.contains("soulmask")
                || title.contains("ws-win64-shipping")
                || app.contains("ws-win64")
        });
        if let Some(win) = soulmask {
            log_to_file(&format!(
                "[capture] window found: title={:?} app={:?}",
                win.title(), win.app_name()
            ));
            match win.capture_image() {
                Ok(img) => return Ok(img),
                Err(e)  => log_to_file(&format!("[capture] window capture failed: {e}, falling back to monitor")),
            }
        } else {
            log_to_file("[capture] no Soulmask window found, falling back to monitor");
        }
    }

    // 2. Fall back to the largest monitor (most likely the gaming monitor)
    let monitors = Monitor::all().map_err(|e| format!("Failed to list monitors: {e}"))?;
    if monitors.is_empty() {
        return Err("No monitor found".to_string());
    }
    let monitor = monitors
        .into_iter()
        .max_by_key(|m| m.width().unwrap_or(0) * m.height().unwrap_or(0))
        .unwrap();
    log_to_file(&format!(
        "[capture] capturing monitor {}x{}",
        monitor.width().unwrap_or(0), monitor.height().unwrap_or(0)
    ));
    monitor.capture_image().map_err(|e| format!("Monitor capture failed: {e}"))
}

fn log_to_file(msg: &str) {
    use std::io::Write;
    let log = std::env::temp_dir().join("screenread_debug.log");
    eprintln!("[log] writing to {:?}: {}", log, msg);
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&log) {
        let _ = writeln!(f, "{}", msg);
    } else {
        eprintln!("[log] FAILED to open log file {:?}", log);
    }
}

#[tauri::command]
pub async fn debug_capture(app: AppHandle) -> Result<String, String> {
    let project_root = if cfg!(debug_assertions) {
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent()?.parent()?.parent()?.parent().map(|p| p.to_path_buf()))
    } else {
        None
    };
    let resource_dir = app.path().resource_dir().map_err(|e| e.to_string())?;
    let base_dir = project_root.clone().unwrap_or(resource_dir.clone());
    let sidecar_dir = base_dir.join("sidecar");
    let process_py = sidecar_dir.join("process.py");
    let atlas_dir = base_dir.join("assets").join("atlas");
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(format!(
        "exe={:?}\nproject_root={:?}\nresource_dir={:?}\nbase_dir={:?}\nsidecar_dir={:?}\nprocess_py={:?} exists={}\natlas_dir={:?} exists={}\ndata_dir={:?}\ntemp_dir={:?}",
        std::env::current_exe().ok(),
        project_root,
        resource_dir,
        base_dir,
        sidecar_dir,
        process_py, process_py.exists(),
        atlas_dir, atlas_dir.exists(),
        data_dir,
        std::env::temp_dir(),
    ))
}


pub async fn capture_and_process_inner(app: &AppHandle) {
        eprintln!("[capture] hotkey triggered, starting screen capture");
        log_to_file("[capture] hotkey triggered");
        app.emit("capture:status", "capturing").ok();

        let screenshot_path = match capture_screen(app.clone()).await {
            Ok(p) => {
                eprintln!("[capture] screenshot saved to {}", p);
                log_to_file(&format!("[capture] screenshot saved to {}", p));
                p
            }
            Err(e) => {
                eprintln!("[capture] screenshot failed: {}", e);
                log_to_file(&format!("[capture] screenshot failed: {}", e));
                app.emit("capture:error", e).ok();
                return;
            }
        };

        eprintln!("[capture] running sidecar processing");
        app.emit("capture:status", "processing").ok();

        match process_images(vec![screenshot_path.clone()], app.clone()).await {
            Ok(result) => {
                eprintln!("[capture] done — {} cards, {} tribesmen", result.cards_found, result.tribesmen.len());
                log_to_file(&format!("[capture] done — {} cards, {} tribesmen", result.cards_found, result.tribesmen.len()));
                app.emit("capture:result", &result).ok();
            }
            Err(e) => {
                eprintln!("[capture] processing failed: {}", e);
                log_to_file(&format!("[capture] processing failed: {}", e));
                app.emit("capture:error", e).ok();
            }
        }

        let _ = std::fs::remove_file(&screenshot_path);
}
