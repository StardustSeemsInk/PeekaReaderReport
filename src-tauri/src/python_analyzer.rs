use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use anyhow::{Result, anyhow, Context};
use pyo3::prelude::*;
use pyo3::types::{PyDict, PyList};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AnalysisResult {
    pub borrow_frequency: u32,
    pub total_duration: String,
    pub total_reading_duration: i64,
    pub total_price: f64,
    pub monthly_borrow: HashMap<String, u32>, // v2更新：改为String键支持年-月格式
    // v2新增字段
    pub most_frequent_author: String,
    pub most_frequent_category: String,
    pub book_borrow_counts: HashMap<String, u32>,
    pub borrow_peak_yearmonth: String,
    // 保留原有字段
    pub longest_author: String,
    pub longest_category: String,
    pub borrow_peak: u8,
    pub most_borrowed_book: String,
    pub most_borrowed_book_count: u32,
    pub full_attendance: Vec<String>,
    pub total_full_attendance: u32,
    pub chart_paths: HashMap<String, String>,
}

pub struct PythonAnalyzer {
    initialized: bool,
    analyzer_instance: Option<Py<PyAny>>,
}

impl PythonAnalyzer {
    pub fn new() -> Result<Self> {
        Ok(Self {
            initialized: false,
            analyzer_instance: None,
        })
    }

    /// 获取Python脚本路径，支持开发模式和打包模式
    fn get_python_path(&self) -> Result<String> {
        // 尝试多个可能的Python脚本路径
        let possible_paths = vec![
            // 1. 打包后的资源目录 (通过环境变量或可执行文件路径推断)
            self.get_bundled_python_path(),
            // 2. 开发模式下的src-tauri/python目录
            self.get_development_python_path(),
            // 3. 当前目录下的python目录
            self.get_current_dir_python_path(),
        ];

        for path_result in possible_paths {
            if let Ok(path) = path_result {
                if std::path::Path::new(&path).exists() {
                    return Ok(path);
                }
            }
        }

        Err(anyhow!("无法找到Python脚本目录，请检查文件结构"))
    }

    /// 获取打包后的Python脚本路径
    fn get_bundled_python_path(&self) -> Result<String> {
        // 获取可执行文件的目录
        let exe_path = std::env::current_exe().context("无法获取可执行文件路径")?;
        let exe_dir = exe_path.parent().context("无法获取可执行文件目录")?;
        
        // 在不同平台上，资源文件的位置可能不同
        let possible_resource_paths = vec![
            exe_dir.join("python"),                    // 直接在exe同级目录
            exe_dir.join("resources").join("python"),  // 在resources子目录
            exe_dir.join("..").join("Resources").join("python"), // macOS bundle结构
        ];

        for resource_path in possible_resource_paths {
            if resource_path.exists() {
                return Ok(resource_path.to_string_lossy().to_string());
            }
        }

        Err(anyhow!("未找到打包后的Python资源目录"))
    }

    /// 获取开发模式下的Python脚本路径
    fn get_development_python_path(&self) -> Result<String> {
        let project_root = std::env::current_dir().context("无法获取当前目录")?;
        let python_dir = project_root.join("src-tauri").join("python");
        
        if python_dir.exists() {
            Ok(python_dir.to_string_lossy().to_string())
        } else {
            Err(anyhow!("开发模式Python目录不存在: {:?}", python_dir))
        }
    }

    /// 获取当前目录下的Python脚本路径
    fn get_current_dir_python_path(&self) -> Result<String> {
        let project_root = std::env::current_dir().context("无法获取当前目录")?;
        let python_dir = project_root.join("python");
        
        if python_dir.exists() {
            Ok(python_dir.to_string_lossy().to_string())
        } else {
            Err(anyhow!("当前目录Python目录不存在: {:?}", python_dir))
        }
    }

    pub fn initialize(&mut self) -> Result<()> {
        Python::with_gil(|py| {
            // 添加Python脚本目录到sys.path
            let sys = py.import_bound("sys")?;
            let path = sys.getattr("path")?;
            
            // 获取Python脚本路径
            let python_path = self.get_python_path()?;
            
            println!("添加Python路径: {}", python_path);
            
            // 检查路径是否已在sys.path中
            let paths: Vec<String> = path.extract()?;
            if !paths.contains(&python_path) {
                path.call_method1("insert", (0, python_path))?;
            }

            // 导入正式的分析器
            let analyzer_module = py.import_bound("analyzer")?;
            
            // 创建BorrowingAnalyzer实例
            let analyzer_class = analyzer_module.getattr("BorrowingAnalyzer")?;
            let analyzer_instance = analyzer_class.call0()?;
            
            self.analyzer_instance = Some(analyzer_instance.unbind());
            self.initialized = true;
            
            println!("Python分析器初始化成功");
            Ok(())
        })
    }

    pub fn load_data(
        &self,
        borrow_paths: Vec<String>,
        member_path: String,
        _progress_callback: Option<Box<dyn Fn(u32, u32, String)>>,
    ) -> Result<()> {
        if !self.initialized {
            return Err(anyhow!("Python分析器未初始化"));
        }

        // 验证文件路径
        if borrow_paths.is_empty() {
            return Err(anyhow!("请至少选择一个借阅数据文件"));
        }

        if member_path.is_empty() {
            return Err(anyhow!("请选择读者清单文件"));
        }

        // 验证文件是否存在
        for path in &borrow_paths {
            if !std::path::Path::new(path).exists() {
                return Err(anyhow!("借阅数据文件不存在: {}", path));
            }
        }
        
        if !std::path::Path::new(&member_path).exists() {
            return Err(anyhow!("读者清单文件不存在: {}", member_path));
        }

        Python::with_gil(|py| {
            let analyzer = self.analyzer_instance.as_ref().unwrap().bind(py);
            
            // 转换borrow_paths为Python列表
            let py_borrow_paths = PyList::new_bound(py, &borrow_paths);
            
            // 调用load_excel_files方法
            analyzer.call_method1("load_excel_files", (&py_borrow_paths, &member_path))?;
            
            println!("数据加载完成");
            println!("借阅数据文件: {:?}", borrow_paths);
            println!("读者清单文件: {}", member_path);
            
            Ok(())
        })
    }

    pub fn analyze(
        &self,
        _progress_callback: Option<Box<dyn Fn(u32, u32, String)>>,
    ) -> Result<AnalysisResult> {
        if !self.initialized {
            return Err(anyhow!("Python分析器未初始化"));
        }

        Python::with_gil(|py| {
            let analyzer = self.analyzer_instance.as_ref().unwrap().bind(py);
            
            // 调用analyze_with_progress方法
            let results = analyzer.call_method0("analyze_with_progress")?;
            
            // 提取结果
            let borrow_frequency: u32 = results.getattr("borrow_frequency")?.extract()?;
            let total_duration: String = results.getattr("total_duration")?.to_string();
            let total_reading_duration: i64 = results.getattr("total_reading_duration")?.extract()?;
            let total_price: f64 = results.getattr("total_price")?.extract()?;
            // v2新增字段
            let most_frequent_author: String = results.getattr("most_frequent_author")?.extract()?;
            let most_frequent_category: String = results.getattr("most_frequent_category")?.extract()?;
            let borrow_peak_yearmonth: String = results.getattr("borrow_peak_yearmonth")?.extract()?;
            // 保留原有字段
            let longest_author: String = results.getattr("longest_author")?.extract()?;
            let longest_category: String = results.getattr("longest_category")?.extract()?;
            let borrow_peak: u8 = results.getattr("borrow_peak")?.extract()?;
            let most_borrowed_book: String = results.getattr("most_borrowed_book")?.extract()?;
            let most_borrowed_book_count: u32 = results.getattr("most_borrowed_book_count")?.extract()?;
            let total_full_attendance: u32 = results.getattr("total_full_attendance")?.extract()?;
            
            // 提取full_attendance列表
            let full_attendance_py = results.getattr("full_attendance")?;
            let full_attendance: Vec<String> = full_attendance_py.extract()?;
            
            // v2更新：提取monthly_borrow字典（年-月格式）
            let monthly_borrow_py = results.getattr("monthly_borrow")?;
            let monthly_borrow_dict = monthly_borrow_py.downcast::<PyDict>()
                .map_err(|e| anyhow!("无法将monthly_borrow转换为字典: {:?}", e))?;
            let mut monthly_borrow = HashMap::new();
            for (key, value) in monthly_borrow_dict.iter() {
                let month: String = key.extract()?; // v2更新：改为String类型
                let count: u32 = value.extract()?;
                monthly_borrow.insert(month, count);
            }

            // v2新增：提取book_borrow_counts字典
            let book_borrow_counts_py = results.getattr("book_borrow_counts")?;
            let book_borrow_counts_dict = book_borrow_counts_py.downcast::<PyDict>()
                .map_err(|e| anyhow!("无法将book_borrow_counts转换为字典: {:?}", e))?;
            let mut book_borrow_counts = HashMap::new();
            for (key, value) in book_borrow_counts_dict.iter() {
                let book_name: String = key.extract()?;
                let count: u32 = value.extract()?;
                book_borrow_counts.insert(book_name, count);
            }
            
            let result = AnalysisResult {
                borrow_frequency,
                total_duration,
                total_reading_duration,
                total_price,
                monthly_borrow,
                // v2新增字段
                most_frequent_author,
                most_frequent_category,
                book_borrow_counts,
                borrow_peak_yearmonth,
                // 保留原有字段
                longest_author,
                longest_category,
                borrow_peak,
                most_borrowed_book,
                most_borrowed_book_count,
                full_attendance,
                total_full_attendance,
                chart_paths: HashMap::new(),
            };

            println!("数据分析完成");
            Ok(result)
        })
    }

    pub fn generate_charts(
        &self,
        output_dir: String,
        _progress_callback: Option<Box<dyn Fn(u32, u32, String)>>,
    ) -> Result<HashMap<String, String>> {
        if !self.initialized {
            return Err(anyhow!("Python分析器未初始化"));
        }

        // 确保输出目录存在
        std::fs::create_dir_all(&output_dir)?;

        Python::with_gil(|py| {
            let analyzer = self.analyzer_instance.as_ref().unwrap().bind(py);
            
            // 调用generate_charts方法
            let chart_paths_py = analyzer.call_method1("generate_charts", (output_dir.clone(),))?;
            
            // 转换Python字典为Rust HashMap
            let chart_paths_dict = chart_paths_py.downcast::<PyDict>()
                .map_err(|e| anyhow!("无法将chart_paths转换为字典: {:?}", e))?;
            let mut chart_paths = HashMap::new();
            
            for (key, value) in chart_paths_dict.iter() {
                let chart_type: String = key.extract()?;
                let chart_path: String = value.extract()?;
                chart_paths.insert(chart_type, chart_path);
            }

            println!("图表生成完成: {}", output_dir);
            Ok(chart_paths)
        })
    }

    pub fn export_report(
        &self,
        output_path: String,
        _progress_callback: Option<Box<dyn Fn(u32, u32, String)>>,
    ) -> Result<()> {
        if !self.initialized {
            return Err(anyhow!("Python分析器未初始化"));
        }

        // 确保输出目录存在
        if let Some(parent) = std::path::Path::new(&output_path).parent() {
            std::fs::create_dir_all(parent)?;
        }

        Python::with_gil(|py| {
            let analyzer = self.analyzer_instance.as_ref().unwrap().bind(py);
            
            // 调用export_report方法
            analyzer.call_method1("export_report", (output_path.clone(),))?;
            
            println!("报告导出完成: {}", output_path);
            Ok(())
        })
    }

    pub fn get_file_count(&self) -> Result<u32> {
        if !self.initialized {
            return Err(anyhow!("Python分析器未初始化"));
        }

        Python::with_gil(|py| {
            let analyzer = self.analyzer_instance.as_ref().unwrap().bind(py);
            let count: u32 = analyzer.call_method0("get_file_count")?.extract()?;
            Ok(count)
        })
    }

    pub fn get_file_name(&self, file_index: u32) -> Result<String> {
        if !self.initialized {
            return Err(anyhow!("Python分析器未初始化"));
        }

        Python::with_gil(|py| {
            let analyzer = self.analyzer_instance.as_ref().unwrap().bind(py);
            let name: String = analyzer.call_method1("get_file_name", (file_index,))?.extract()?;
            Ok(name)
        })
    }

    pub fn analyze_single_file(
        &self,
        file_index: u32,
        _progress_callback: Option<Box<dyn Fn(u32, u32, String)>>,
    ) -> Result<AnalysisResult> {
        if !self.initialized {
            return Err(anyhow!("Python分析器未初始化"));
        }

        Python::with_gil(|py| {
            let analyzer = self.analyzer_instance.as_ref().unwrap().bind(py);
            
            // 调用analyze_single_file方法
            let results = analyzer.call_method1("analyze_single_file", (file_index,))?;
            
            // 提取结果 (使用相同的提取逻辑)
            let borrow_frequency: u32 = results.getattr("borrow_frequency")?.extract()?;
            let total_duration: String = results.getattr("total_duration")?.to_string();
            let total_reading_duration: i64 = results.getattr("total_reading_duration")?.extract()?;
            let total_price: f64 = results.getattr("total_price")?.extract()?;
            // v2新增字段
            let most_frequent_author: String = results.getattr("most_frequent_author")?.extract()?;
            let most_frequent_category: String = results.getattr("most_frequent_category")?.extract()?;
            let borrow_peak_yearmonth: String = results.getattr("borrow_peak_yearmonth")?.extract()?;
            // 保留原有字段
            let longest_author: String = results.getattr("longest_author")?.extract()?;
            let longest_category: String = results.getattr("longest_category")?.extract()?;
            let borrow_peak: u8 = results.getattr("borrow_peak")?.extract()?;
            let most_borrowed_book: String = results.getattr("most_borrowed_book")?.extract()?;
            let most_borrowed_book_count: u32 = results.getattr("most_borrowed_book_count")?.extract()?;
            let total_full_attendance: u32 = results.getattr("total_full_attendance")?.extract()?;
            
            // 提取full_attendance列表
            let full_attendance_py = results.getattr("full_attendance")?;
            let full_attendance: Vec<String> = full_attendance_py.extract()?;
            
            // v2更新：提取monthly_borrow字典（年-月格式）
            let monthly_borrow_py = results.getattr("monthly_borrow")?;
            let monthly_borrow_dict = monthly_borrow_py.downcast::<PyDict>()
                .map_err(|e| anyhow!("无法将monthly_borrow转换为字典: {:?}", e))?;
            let mut monthly_borrow = HashMap::new();
            for (key, value) in monthly_borrow_dict.iter() {
                let month: String = key.extract()?; // v2更新：改为String类型
                let count: u32 = value.extract()?;
                monthly_borrow.insert(month, count);
            }

            // v2新增：提取book_borrow_counts字典
            let book_borrow_counts_py = results.getattr("book_borrow_counts")?;
            let book_borrow_counts_dict = book_borrow_counts_py.downcast::<PyDict>()
                .map_err(|e| anyhow!("无法将book_borrow_counts转换为字典: {:?}", e))?;
            let mut book_borrow_counts = HashMap::new();
            for (key, value) in book_borrow_counts_dict.iter() {
                let book_name: String = key.extract()?;
                let count: u32 = value.extract()?;
                book_borrow_counts.insert(book_name, count);
            }
            
            let result = AnalysisResult {
                borrow_frequency,
                total_duration,
                total_reading_duration,
                total_price,
                monthly_borrow,
                // v2新增字段
                most_frequent_author,
                most_frequent_category,
                book_borrow_counts,
                borrow_peak_yearmonth,
                // 保留原有字段
                longest_author,
                longest_category,
                borrow_peak,
                most_borrowed_book,
                most_borrowed_book_count,
                full_attendance,
                total_full_attendance,
                chart_paths: HashMap::new(),
            };

            println!("单文件分析完成: 文件索引 {}", file_index);
            Ok(result)
        })
    }

    pub fn export_reports_for_all_files(
        &self,
        base_output_dir: String,
        _progress_callback: Option<Box<dyn Fn(u32, u32, String)>>,
    ) -> Result<Vec<String>> {
        if !self.initialized {
            return Err(anyhow!("Python分析器未初始化"));
        }

        // 确保基础输出目录存在
        std::fs::create_dir_all(&base_output_dir)?;

        Python::with_gil(|py| {
            let analyzer = self.analyzer_instance.as_ref().unwrap().bind(py);
            
            // 调用export_reports_for_all_files方法
            let report_paths_py = analyzer.call_method1("export_reports_for_all_files", (base_output_dir.clone(),))?;
            
            // 转换Python列表为Rust Vec
            let report_paths: Vec<String> = report_paths_py.extract()?;
            
            println!("所有文件报告生成完成，共 {} 个文件", report_paths.len());
            Ok(report_paths)
        })
    }
}

impl Default for PythonAnalyzer {
    fn default() -> Self {
        Self::new().unwrap()
    }
}