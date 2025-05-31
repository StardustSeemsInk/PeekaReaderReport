use std::env;
use std::path::Path;
use std::process::Command;

fn main() {
    println!("cargo:rerun-if-changed=python/");
    
    // 确保Python脚本存在
    let python_dir = Path::new("python");
    if !python_dir.exists() {
        panic!("Python目录不存在: {:?}", python_dir);
    }
    
    // 检查主要的Python文件
    let analyzer_py = python_dir.join("analyzer.py");
    if !analyzer_py.exists() {
        panic!("analyzer.py文件不存在: {:?}", analyzer_py);
    }
    
    // 在构建时验证Python环境（仅在开发模式下）
    if env::var("PROFILE").unwrap_or_default() == "debug" {
        check_python_dependencies();
    }
    
    println!("Python脚本验证完成");
    
    tauri_build::build()
}

fn check_python_dependencies() {
    println!("检查Python依赖...");
    
    // 尝试导入关键的Python模块
    let python_modules = vec![
        "pandas", "matplotlib", "numpy", "docx", "openpyxl"
    ];
    
    for module in python_modules {
        let output = Command::new("python")
            .args(&["-c", &format!("import {}", module)])
            .output();
            
        match output {
            Ok(result) if result.status.success() => {
                println!("✓ Python模块 {} 可用", module);
            }
            _ => {
                println!("⚠ Python模块 {} 不可用，请运行: pip install -r python/requirements.txt", module);
            }
        }
    }
}
