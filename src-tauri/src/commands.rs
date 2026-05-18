use crate::{CaptureQueue, ProcessingFlag};
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::sync::atomic::Ordering;
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
    pub status: Option<String>,
    pub group: Option<String>,
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

// ── Legacy command kept for CaptureModal direct-invoke path ──────────────────

#[tauri::command]
pub async fn process_images(paths: Vec<String>, app: AppHandle) -> Result<ProcessResult, String> {
    let project_root = if cfg!(debug_assertions) {
        std::env::current_exe()
            .ok()
            .and_then(|p| {
                p.parent()
                    .and_then(|p| p.parent())
                    .and_then(|p| p.parent())
                    .and_then(|p| p.parent())
                    .map(|p| p.to_path_buf())
            })
    } else {
        None
    };

    let resource_dir = app.path().resource_dir().map_err(|e| e.to_string())?;
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
            .current_dir(&sidecar_dir)
            .env("PYTHONPATH", &sidecar_dir)
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

// ── Roster persistence (JSON pass-through to avoid field-name mismatches) ────

#[tauri::command]
pub async fn save_roster(roster: serde_json::Value, app: AppHandle) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let path = data_dir.join("roster.json");
    let json = serde_json::to_string_pretty(&roster).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn load_roster(app: AppHandle) -> Result<Option<serde_json::Value>, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let path = data_dir.join("roster.json");
    if !path.exists() {
        return Ok(None);
    }
    let json = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let value: serde_json::Value = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    Ok(Some(value))
}

// ── Screen capture ────────────────────────────────────────────────────────────

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
fn capture_game_image() -> Result<xcap::image::RgbaImage, String> {
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
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&log) {
        let _ = writeln!(f, "{}", msg);
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

// ── Persistent captures directory ─────────────────────────────────────────────

fn captures_dir(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("captures");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

// ── Queue capture (Alt+Shift+S) ───────────────────────────────────────────────

/// Capture a screenshot, save it persistently, push onto the queue,
/// then immediately kick off processing if none is running.
pub async fn queue_capture_inner(app: &AppHandle) {
    eprintln!("[queue] hotkey triggered, capturing screenshot");
    log_to_file("[queue] hotkey triggered");
    app.emit("capture:status", "capturing").ok();

    let image = match capture_game_image() {
        Ok(img) => img,
        Err(e) => {
            eprintln!("[queue] capture failed: {}", e);
            log_to_file(&format!("[queue] capture failed: {}", e));
            app.emit("capture:error", e).ok();
            return;
        }
    };

    let dir = match captures_dir(app) {
        Ok(d) => d,
        Err(e) => {
            app.emit("capture:error", format!("Cannot create captures dir: {}", e)).ok();
            return;
        }
    };

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let path = dir.join(format!("capture_{}.png", timestamp));

    if let Err(e) = image.save(&path) {
        app.emit("capture:error", format!("Failed to save screenshot: {}", e)).ok();
        return;
    }

    let path_str = path.to_string_lossy().to_string();
    eprintln!("[queue] screenshot saved to {}", path_str);
    log_to_file(&format!("[queue] screenshot saved to {}", path_str));

    let count = {
        let queue = app.state::<CaptureQueue>();
        let mut q = queue.0.lock().unwrap();
        q.push(path_str.clone());
        q.len()
    };

    app.emit("capture:status", "idle").ok();
    app.emit("capture:queued", count).ok();
    app.emit("capture:queued_path", &path_str).ok();

    // Immediately start processing if not already running.
    try_start_processing(app).await;
}

// ── Processing loop ───────────────────────────────────────────────────────────

/// Claim the processing flag and spawn the drain loop.
/// No-op if processing is already running (new items will be picked up by the
/// running loop's next iteration).
pub async fn try_start_processing(app: &AppHandle) {
    let flag = app.state::<ProcessingFlag>();
    if flag.0.compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst).is_ok() {
        let app_clone = app.clone();
        tauri::async_runtime::spawn(async move {
            process_queue_loop(&app_clone).await;
            let f = app_clone.state::<ProcessingFlag>();
            f.0.store(false, Ordering::SeqCst);
        });
    }
    // If the flag was already true, the running loop will drain the newly-added item
    // on its next iteration.
}

/// Drain the queue in a loop: process all queued screenshots, then check for
/// anything that arrived during processing and handle those too.
async fn process_queue_loop(app: &AppHandle) {
    loop {
        let paths = {
            let queue = app.state::<CaptureQueue>();
            let mut q = queue.0.lock().unwrap();
            if q.is_empty() {
                break;
            }
            std::mem::take(&mut *q)
        };

        let total = paths.len();
        eprintln!("[queue] processing {} screenshot(s)", total);
        log_to_file(&format!("[queue] processing {} screenshot(s)", total));

        app.emit("capture:queued", 0usize).ok();
        app.emit("capture:status", "processing").ok();
        app.emit("capture:progress", format!("0/{}", total)).ok();

        let result = run_sidecar(&paths, app).await;
        app.emit("capture:progress", format!("{0}/{0}", total)).ok();

        match result {
            Ok(r) => {
                eprintln!("[queue] done — {} cards, {} tribesmen", r.cards_found, r.tribesmen.len());
                log_to_file(&format!("[queue] done — {} cards, {} tribesmen", r.cards_found, r.tribesmen.len()));
                app.emit("capture:result", &r).ok();
            }
            Err(e) => {
                eprintln!("[queue] processing failed: {}", e);
                log_to_file(&format!("[queue] processing failed: {}", e));
                app.emit("capture:error", e).ok();
                // Don't break — drain any remaining queued items even after an error
            }
        }
    }

    app.emit("capture:status", "idle").ok();
}

/// Invoke the Python sidecar with one or more image paths.
/// Runs on a blocking thread so the Tokio runtime is never stalled.
async fn run_sidecar(paths: &[String], app: &AppHandle) -> Result<ProcessResult, String> {
    let project_root = if cfg!(debug_assertions) {
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent()?.parent()?.parent()?.parent().map(|p| p.to_path_buf()))
    } else {
        None
    };
    let resource_dir = app.path().resource_dir().map_err(|e| e.to_string())?;
    let base_dir = project_root.unwrap_or(resource_dir);
    let atlas_dir   = base_dir.join("assets").join("atlas");
    let sidecar_dir = base_dir.join("sidecar");
    let process_py  = sidecar_dir.join("process.py");

    let python = if cfg!(windows) { "python" } else { "python3" };
    let n = paths.len();
    eprintln!("[sidecar] running: {} {:?} {} path(s) --atlas {:?}", python, process_py, n, atlas_dir);

    let paths_owned     = paths.to_vec();
    let process_py_own  = process_py.clone();
    let atlas_dir_own   = atlas_dir.clone();
    let sidecar_dir_own = sidecar_dir.clone();

    let output = tokio::task::spawn_blocking(move || {
        Command::new(python)
            .arg(&process_py_own)
            .args(&paths_owned)
            .arg("--atlas")
            .arg(&atlas_dir_own)
            .current_dir(&sidecar_dir_own)
            .env("PYTHONPATH", &sidecar_dir_own)
            .output()
    })
    .await
    .map_err(|e| format!("spawn_blocking failed: {}", e))?
    .map_err(|e| format!("Failed to run sidecar: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        eprintln!("[sidecar] exit={} stdout={:?} stderr={:?}", output.status, &*stdout, &*stderr);
        if let Ok(r) = serde_json::from_str::<ProcessResult>(&stdout) {
            if let Some(err) = r.error {
                return Err(format!("py: {} | stderr: {}", err, stderr.trim()));
            }
        }
        return Err(format!("Sidecar failed | stdout: {:?} | stderr: {:?}", stdout.trim(), stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str(&stdout).map_err(|e| format!("Invalid JSON from sidecar: {}", e))
}

// ── Tauri commands ────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn process_queue(app: AppHandle) -> Result<(), String> {
    try_start_processing(&app).await;
    Ok(())
}

#[tauri::command]
pub async fn clear_queue(app: AppHandle) -> Result<(), String> {
    let paths = {
        let queue = app.state::<CaptureQueue>();
        let mut q = queue.0.lock().unwrap();
        std::mem::take(&mut *q)
    };
    for p in &paths {
        let _ = std::fs::remove_file(p);
    }
    app.emit("capture:queued", 0usize).ok();
    Ok(())
}
