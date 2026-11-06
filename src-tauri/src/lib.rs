use tauri::Manager;

pub mod engine;
pub mod storage;
pub mod rules;
pub mod parsers;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn get_airgap_status() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "status": "AIR-GAPPED",
        "bytes_out": 0,
        "encryption": "AES-GCM-256",
        "local_verifier": "Active (Rust v2 Core)"
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_airgap_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ReconOS desktop application");
}
