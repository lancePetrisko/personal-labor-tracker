use tauri::Manager;

#[tauri::command]
fn show_in_explorer(app: tauri::AppHandle) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer")
        .arg(&data_dir)
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    std::process::Command::new("open")
        .arg(&data_dir)
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open")
        .arg(&data_dir)
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Opens the author's site in the default browser. The URL is fixed here so the
/// webview cannot use this command to launch arbitrary URLs.
#[tauri::command]
fn open_author_site() -> Result<(), String> {
    const URL: &str = "https://lancepetrisko.com";

    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer")
        .arg(URL)
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    std::process::Command::new("open")
        .arg(URL)
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open")
        .arg(URL)
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Writes generated report bytes to a path the user already chose in the save
/// dialog. Narrower than granting the fs plugin a filesystem scope.
#[tauri::command]
fn save_pdf(path: String, bytes: Vec<u8>) -> Result<(), String> {
    std::fs::write(&path, bytes).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![show_in_explorer, open_author_site, save_pdf])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
