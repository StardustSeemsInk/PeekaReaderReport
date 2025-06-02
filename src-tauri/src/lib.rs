mod commands;
mod rust_analyzer_simple;
mod rust_analyzer;

use commands::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            // 纯Rust版本命令
            commands::rust_analyze_files,
            commands::rust_analyze_single_file,
            commands::rust_get_file_count,
            commands::rust_get_file_name,
            commands::rust_get_reader_files,
            commands::rust_export_reports_for_all_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
