fn main() {
    // 纯Rust版本，不再需要Python依赖检查
    println!("构建Rust版本的读书报告分析工具...");
    
    tauri_build::build()
}
