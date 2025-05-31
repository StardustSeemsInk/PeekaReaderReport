mod python_analyzer;
mod commands;

use commands::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::initialize_analyzer,
            commands::analyze_files,
            commands::generate_charts,
            commands::export_report,
            commands::get_file_count,
            commands::get_file_name,
            commands::analyze_single_file,
            commands::export_reports_for_all_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
