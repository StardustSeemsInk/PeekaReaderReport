use crate::rust_analyzer::{RustAnalyzer, ReaderFileInfo, AnalysisResult as RustAnalysisResult};
use std::sync::Mutex;
use tauri::State;
use std::path::Path;
use std::fs;

// 全局状态管理
pub struct AppState {
    pub rust_analyzer: Mutex<Option<RustAnalyzer>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            rust_analyzer: Mutex::new(None),
        }
    }
}

// Rust 分析器命令
#[tauri::command]
pub async fn rust_analyze_files(
    reader_list_path: String,
    borrow_paths: Vec<String>,
    state: State<'_, AppState>,
) -> Result<Vec<ReaderFileInfo>, String> {
    println!("开始使用Rust分析器加载和分析数据...");
    println!("读者清单路径: {}", reader_list_path);
    println!("借阅数据路径: {:?}", borrow_paths);
    
    let mut rust_analyzer_guard = state.rust_analyzer.lock().map_err(|e| e.to_string())?;
    
    // 创建新的Rust分析器实例
    let mut rust_analyzer = RustAnalyzer::new();
    
    // 加载数据
    if let Err(e) = rust_analyzer.load_excel_files(&reader_list_path, &borrow_paths) {
        return Err(format!("Rust分析器加载数据失败: {}", e));
    }
    
    // 获取读者文件信息
    let reader_files = rust_analyzer.get_reader_files();
    
    // 保存分析器实例
    *rust_analyzer_guard = Some(rust_analyzer);
    
    println!("找到 {} 个读者", reader_files.len());
    Ok(reader_files)
}

#[tauri::command]
pub async fn rust_analyze_single_file(
    file_index: usize,
    state: State<'_, AppState>,
) -> Result<RustAnalysisResult, String> {
    let rust_analyzer_guard = state.rust_analyzer.lock().map_err(|e| e.to_string())?;
    
    let rust_analyzer = rust_analyzer_guard
        .as_ref()
        .ok_or("Rust分析器未初始化，请先调用 rust_analyze_files")?;
    
    match rust_analyzer.analyze_single_file(file_index) {
        Ok(result) => {
            println!("Rust分析完成! 读者: {}", result.reader_name);
            Ok(result)
        }
        Err(e) => Err(format!("Rust分析单文件失败: {}", e)),
    }
}

#[tauri::command]
pub async fn rust_get_file_count(
    state: State<'_, AppState>,
) -> Result<usize, String> {
    let rust_analyzer_guard = state.rust_analyzer.lock().map_err(|e| e.to_string())?;
    
    let rust_analyzer = rust_analyzer_guard
        .as_ref()
        .ok_or("Rust分析器未初始化，请先调用 rust_analyze_files")?;
    
    Ok(rust_analyzer.get_file_count())
}

#[tauri::command]
pub async fn rust_get_file_name(
    file_index: usize,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let rust_analyzer_guard = state.rust_analyzer.lock().map_err(|e| e.to_string())?;
    
    let rust_analyzer = rust_analyzer_guard
        .as_ref()
        .ok_or("Rust分析器未初始化，请先调用 rust_analyze_files")?;
    
    Ok(rust_analyzer.get_file_name(file_index))
}

#[tauri::command]
pub async fn rust_get_reader_files(
    state: State<'_, AppState>,
) -> Result<Vec<ReaderFileInfo>, String> {
    let rust_analyzer_guard = state.rust_analyzer.lock().map_err(|e| e.to_string())?;
    
    let rust_analyzer = rust_analyzer_guard
        .as_ref()
        .ok_or("Rust分析器未初始化，请先调用 rust_analyze_files")?;
    
    Ok(rust_analyzer.get_reader_files())
}

// 批量导出所有文件的报告和图表
#[tauri::command]
pub async fn rust_export_reports_for_all_files(
    base_output_dir: String,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let rust_analyzer_guard = state.rust_analyzer.lock().map_err(|e| e.to_string())?;
    
    let rust_analyzer = rust_analyzer_guard
        .as_ref()
        .ok_or("Rust分析器未初始化，请先调用 rust_analyze_files")?;
    
    let file_count = rust_analyzer.get_file_count();
    let mut report_paths = Vec::new();
    
    // 确保输出目录存在
    if let Err(e) = fs::create_dir_all(&base_output_dir) {
        return Err(format!("创建输出目录失败: {}", e));
    }
    
    for file_index in 0..file_count {
        // 分析单个文件
        let analysis_result = match rust_analyzer.analyze_single_file(file_index) {
            Ok(result) => result,
            Err(e) => {
                eprintln!("分析文件 {} 失败: {}", file_index, e);
                continue;
            }
        };
        
        // 生成文件名（使用读者姓名）
        let safe_reader_name = analysis_result.reader_name
            .replace("/", "_")
            .replace("\\", "_")
            .replace(":", "_")
            .replace("*", "_")
            .replace("?", "_")
            .replace("\"", "_")
            .replace("<", "_")
            .replace(">", "_")
            .replace("|", "_");
        
        let report_filename = format!("{}_读书分析报告.html", safe_reader_name);
        let report_path = Path::new(&base_output_dir).join(&report_filename);
        
        // 生成HTML报告
        match generate_html_report(&analysis_result, report_path.to_string_lossy().as_ref()) {
            Ok(_) => {
                report_paths.push(report_path.to_string_lossy().to_string());
                println!("成功生成报告: {}", report_path.display());
            }
            Err(e) => {
                eprintln!("生成报告失败 {}: {}", report_filename, e);
            }
        }
    }
    
    if report_paths.is_empty() {
        return Err("没有成功生成任何报告".to_string());
    }
    
    Ok(report_paths)
}

// 生成HTML报告的辅助函数
fn generate_html_report(analysis_result: &RustAnalysisResult, output_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    let html_content = format!(
        r#"<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{} - 读书分析报告</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap');
        
        body {{
            font-family: 'Noto Sans SC', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }}
        
        .report-header {{
            text-align: center;
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
        }}
        
        .report-title {{
            font-size: 2.5em;
            font-weight: 700;
            background: linear-gradient(45deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }}
        
        .report-date {{
            color: #666;
            font-size: 1.1em;
        }}
        
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }}
        
        .stat-card {{
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
            text-align: center;
            transition: transform 0.3s ease;
        }}
        
        .stat-card:hover {{
            transform: translateY(-5px);
        }}
        
        .stat-number {{
            font-size: 2.2em;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 5px;
        }}
        
        .stat-label {{
            font-size: 1.1em;
            color: #666;
            font-weight: 500;
        }}
        
        .section {{
            background: white;
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            margin: 30px 0;
        }}
        
        .section-title {{
            font-size: 1.8em;
            font-weight: 600;
            color: #333;
            margin-bottom: 20px;
            border-left: 4px solid #667eea;
            padding-left: 15px;
        }}
        
        .book-list {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
        }}
        
        .book-item {{
            background: #f8f9fa;
            padding: 15px;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }}
        
        .book-title {{
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
        }}
        
        .book-count {{
            color: #667eea;
            font-weight: 500;
        }}
        
        .monthly-list {{
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }}
        
        .monthly-item {{
            background: #667eea;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 500;
        }}
        
        @media print {{
            body {{ background: white; }}
            .stat-card, .section {{ break-inside: avoid; }}
        }}
    </style>
</head>
<body>
    <div class="report-header">
        <h1 class="report-title">{} 的读书分析报告</h1>
        <p class="report-date">生成时间：{}</p>
    </div>
    
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-number">{}</div>
            <div class="stat-label">总借阅次数</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">{}</div>
            <div class="stat-label">总阅读天数</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">¥{:.2}</div>
            <div class="stat-label">图书总价值</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">{}</div>
            <div class="stat-label">全勤月数</div>
        </div>
    </div>
    
    <div class="section">
        <h2 class="section-title">📊 基本统计</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">{}</div>
                <div class="stat-label">借阅次数最多作者</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{}</div>
                <div class="stat-label">借阅次数最多类别</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{}</div>
                <div class="stat-label">阅读时长最长作者</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{}</div>
                <div class="stat-label">阅读时长最长类别</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{}</div>
                <div class="stat-label">借阅高峰期</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{} ({}次)</div>
                <div class="stat-label">最受欢迎图书</div>
            </div>
        </div>
    </div>
    
    <div class="section">
        <h2 class="section-title">📚 热门图书排行</h2>
        <div class="book-list">
            {}
        </div>
    </div>
    
    <div class="section">
        <h2 class="section-title">📅 月度借阅统计</h2>
        <div class="monthly-list">
            {}
        </div>
    </div>
    
    <div class="section">
        <h2 class="section-title">🏆 全勤月份</h2>
        <div class="monthly-list">
            {}
        </div>
    </div>
</body>
</html>"#,
        analysis_result.reader_name,
        analysis_result.reader_name,
        chrono::Local::now().format("%Y年%m月%d日 %H:%M"),
        analysis_result.borrow_frequency,
        analysis_result.total_reading_duration,
        analysis_result.total_price,
        analysis_result.total_full_attendance,
        analysis_result.most_frequent_author,
        analysis_result.most_frequent_category,
        analysis_result.longest_author,
        analysis_result.longest_category,
        analysis_result.borrow_peak_yearmonth,
        analysis_result.most_borrowed_book,
        analysis_result.most_borrowed_book_count,
        generate_book_list_html(&analysis_result.book_borrow_counts),
        generate_monthly_html(&analysis_result.monthly_borrow),
        generate_attendance_html(&analysis_result.full_attendance)
    );
    
    std::fs::write(output_path, html_content)?;
    Ok(())
}

// 生成图书列表HTML
fn generate_book_list_html(book_counts: &std::collections::HashMap<String, u32>) -> String {
    let mut books: Vec<_> = book_counts.iter().collect();
    books.sort_by(|a, b| b.1.cmp(a.1));
    
    books.iter()
        .take(10) // 只显示前10本
        .map(|(book, count)| {
            format!(
                r#"<div class="book-item">
                    <div class="book-title">{}</div>
                    <div class="book-count">借阅 {} 次</div>
                </div>"#,
                book, count
            )
        })
        .collect::<Vec<_>>()
        .join("")
}

// 生成月度统计HTML
fn generate_monthly_html(monthly_borrow: &std::collections::HashMap<String, u32>) -> String {
    let mut months: Vec<_> = monthly_borrow.iter().collect();
    months.sort_by(|a, b| a.0.cmp(b.0));
    
    months.iter()
        .map(|(month, count)| {
            format!(r#"<div class="monthly-item">{}: {} 本</div>"#, month, count)
        })
        .collect::<Vec<_>>()
        .join("")
}

// 生成全勤月份HTML
fn generate_attendance_html(full_attendance: &[String]) -> String {
    full_attendance.iter()
        .map(|month| {
            format!(r#"<div class="monthly-item">{}</div>"#, month)
        })
        .collect::<Vec<_>>()
        .join("")
}