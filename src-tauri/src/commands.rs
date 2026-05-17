use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::{AppHandle, Emitter, Manager};
use xcap::Monitor;

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
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?;
    let atlas_dir = resource_dir.join("assets").join("atlas");
    let sidecar_dir = resource_dir.join("sidecar");
    let process_py = sidecar_dir.join("process.py");

    let mut all_tribesmen = Vec::new();
    let mut total_cards = 0;

    for path in &paths {
        let output = Command::new("python3")
            .arg(&process_py)
            .arg(path)
            .arg("--atlas")
            .arg(&atlas_dir)
            .output()
            .map_err(|e| format!("Failed to run sidecar: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            if let Ok(result) = serde_json::from_str::<ProcessResult>(&stdout) {
                if let Some(err) = result.error {
                    return Err(err);
                }
            }
            return Err(format!("Sidecar failed: {}", stderr));
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
pub async fn capture_screen(app: AppHandle) -> Result<String, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let path = data_dir.join(format!("capture_{}.png", timestamp));

    let monitors = Monitor::all().map_err(|e| format!("Failed to list monitors: {}", e))?;
    let monitor = monitors.into_iter().next().ok_or("No monitor found")?;
    let image = monitor.capture_image().map_err(|e| format!("Failed to capture screen: {}", e))?;
    image.save(&path).map_err(|e| format!("Failed to save screenshot: {}", e))?;

    Ok(path.to_string_lossy().to_string())
}

pub fn capture_and_process(app: &AppHandle) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        app.emit("capture:status", "capturing").ok();

        let screenshot_path = match capture_screen(app.clone()).await {
            Ok(p) => p,
            Err(e) => {
                app.emit("capture:error", e).ok();
                return;
            }
        };

        app.emit("capture:status", "processing").ok();

        match process_images(vec![screenshot_path.clone()], app.clone()).await {
            Ok(result) => {
                app.emit("capture:result", &result).ok();
            }
            Err(e) => {
                app.emit("capture:error", e).ok();
            }
        }

        // Clean up the temp screenshot
        let _ = std::fs::remove_file(&screenshot_path);
    });
}
