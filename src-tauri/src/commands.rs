use crate::python_analyzer::{PythonAnalyzer, AnalysisResult};
use std::sync::Mutex;
use tauri::State;

// 全局状态管理
pub struct AppState {
    pub analyzer: Mutex<Option<PythonAnalyzer>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            analyzer: Mutex::new(None),
        }
    }
}

#[tauri::command]
pub async fn initialize_analyzer(state: State<'_, AppState>) -> Result<(), String> {
    let mut analyzer_guard = state.analyzer.lock().map_err(|e| e.to_string())?;
    
    match PythonAnalyzer::new() {
        Ok(mut analyzer) => {
            if let Err(e) = analyzer.initialize() {
                return Err(format!("初始化Python分析器失败: {}", e));
            }
            *analyzer_guard = Some(analyzer);
            Ok(())
        }
        Err(e) => Err(format!("创建Python分析器失败: {}", e)),
    }
}

#[tauri::command]
pub async fn analyze_files(
    reader_list_path: String,
    borrow_paths: Vec<String>,
    state: State<'_, AppState>,
) -> Result<AnalysisResult, String> {
    let analyzer_guard = state.analyzer.lock().map_err(|e| e.to_string())?;
    
    let analyzer = analyzer_guard
        .as_ref()
        .ok_or("分析器未初始化，请先调用 initialize_analyzer")?;

    // 加载数据
    if let Err(e) = analyzer.load_data(borrow_paths, reader_list_path, None) {
        return Err(format!("加载数据失败: {}", e));
    }

    // 执行分析
    match analyzer.analyze(None) {
        Ok(result) => Ok(result),
        Err(e) => Err(format!("分析失败: {}", e)),
    }
}

#[tauri::command]
pub async fn generate_charts(
    output_dir: String,
    state: State<'_, AppState>,
) -> Result<std::collections::HashMap<String, String>, String> {
    let analyzer_guard = state.analyzer.lock().map_err(|e| e.to_string())?;
    
    let analyzer = analyzer_guard
        .as_ref()
        .ok_or("分析器未初始化，请先调用 initialize_analyzer")?;

    match analyzer.generate_charts(output_dir, None) {
        Ok(chart_paths) => Ok(chart_paths),
        Err(e) => Err(format!("生成图表失败: {}", e)),
    }
}

#[tauri::command]
pub async fn export_report(
    output_path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let analyzer_guard = state.analyzer.lock().map_err(|e| e.to_string())?;
    
    let analyzer = analyzer_guard
        .as_ref()
        .ok_or("分析器未初始化，请先调用 initialize_analyzer")?;

    match analyzer.export_report(output_path, None) {
        Ok(()) => Ok(()),
        Err(e) => Err(format!("导出报告失败: {}", e)),
    }
}

#[tauri::command]
pub async fn get_file_count(
    state: State<'_, AppState>,
) -> Result<u32, String> {
    let analyzer_guard = state.analyzer.lock().map_err(|e| e.to_string())?;
    
    let analyzer = analyzer_guard
        .as_ref()
        .ok_or("分析器未初始化，请先调用 initialize_analyzer")?;

    match analyzer.get_file_count() {
        Ok(count) => Ok(count),
        Err(e) => Err(format!("获取文件数量失败: {}", e)),
    }
}

#[tauri::command]
pub async fn get_file_name(
    file_index: u32,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let analyzer_guard = state.analyzer.lock().map_err(|e| e.to_string())?;
    
    let analyzer = analyzer_guard
        .as_ref()
        .ok_or("分析器未初始化，请先调用 initialize_analyzer")?;

    match analyzer.get_file_name(file_index) {
        Ok(name) => Ok(name),
        Err(e) => Err(format!("获取文件名失败: {}", e)),
    }
}

#[tauri::command]
pub async fn analyze_single_file(
    file_index: u32,
    state: State<'_, AppState>,
) -> Result<AnalysisResult, String> {
    let analyzer_guard = state.analyzer.lock().map_err(|e| e.to_string())?;
    
    let analyzer = analyzer_guard
        .as_ref()
        .ok_or("分析器未初始化，请先调用 initialize_analyzer")?;

    match analyzer.analyze_single_file(file_index, None) {
        Ok(result) => Ok(result),
        Err(e) => Err(format!("分析单文件失败: {}", e)),
    }
}

#[tauri::command]
pub async fn export_reports_for_all_files(
    base_output_dir: String,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let analyzer_guard = state.analyzer.lock().map_err(|e| e.to_string())?;
    
    let analyzer = analyzer_guard
        .as_ref()
        .ok_or("分析器未初始化，请先调用 initialize_analyzer")?;

    match analyzer.export_reports_for_all_files(base_output_dir, None) {
        Ok(report_paths) => Ok(report_paths),
        Err(e) => Err(format!("批量导出报告失败: {}", e)),
    }
}