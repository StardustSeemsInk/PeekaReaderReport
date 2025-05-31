# ReaderReport - 读书报告分析工具

一个基于 Tauri 的跨平台桌面应用程序，用于分析图书馆借阅数据并生成个性化的读书报告。

## 功能特点

- 📊 **数据分析**: 分析借阅频次、阅读时长、图书价值等统计信息
- 📈 **数据可视化**: 生成图表展示阅读趋势和偏好
- 📄 **报告生成**: 导出 Word 格式的个性化读书报告
- 🖥️ **跨平台**: 支持 Windows、macOS 和 Linux
- 🎯 **用户友好**: 原生文件对话框和直观的用户界面

## 技术架构

- **前端**: HTML5 + CSS3 + 原生 JavaScript (模块化)
- **后端**: Rust + Tauri
- **数据分析**: Python (使用PyO3集成)
- **文件处理**: Tauri Dialog 插件

## 前置要求

### 开发环境
- Node.js (v16+)
- Rust (v1.70+)
- Python 3.8+

### 系统要求
- Windows 10+ / macOS 10.15+ / Linux (现代发行版)
- 至少 500MB 可用磁盘空间

## 安装和运行

### 1. 克隆项目
```bash
git clone https://github.com/StardustSeemsInk/PeekaReaderReport.git
cd ReaderReport
```

### 2. 安装依赖

#### 安装前端依赖
```bash
yarn install
```

#### 安装 Rust 依赖 (自动)
Tauri 会在构建时自动安装 Rust 依赖。

### 3. 开发模式运行
```bash
yarn tauri dev
```

这将启动开发服务器并打开应用程序窗口。

### 4. 构建生产版本

**请参阅 [PACKAGING_GUIDE.md](PACKAGING_GUIDE.md) 以了解如何打包应用程序。**

构建完成后，可执行文件将在 `src-tauri/target/release/` 目录中。

## 使用说明

### 1. 准备数据文件
确保你有以下 Excel 文件：
- **借阅数据文件** (.xlsx/.xls): 包含借阅记录
- **读者清单文件** (.xlsx/.xls): 包含读者信息
- **文件来源**：
  - 借阅数据文件可以从图书馆管理系统导出
  - 读者清单文件可以从在线端图书馆会员管理系统导出

### 2. 选择文件
1. 点击"选择借阅数据文件"按钮，选择一个或多个借阅数据文件
2. 点击"选择读者清单文件"按钮，选择读者清单文件

### 3. 开始分析
1. 确认文件选择无误
2. 点击"开始分析"按钮
3. 等待分析完成，查看进度条

### 4. 查看结果
- 查看统计数据卡片
- 选择输出目录生成图表
- 点击"导出报告"生成 Word 文档

## 项目结构

```
ReaderReport/
├── src/                          # 前端源码
│   ├── components/              # UI 组件
│   │   ├── FileSelector.js     # 文件选择组件
│   │   ├── AnalysisControl.js  # 分析控制组件
│   │   └── ResultDisplay.js    # 结果显示组件
│   ├── main.js                 # 主应用逻辑
│   ├── index.html              # 主页面
│   └── styles.css              # 样式表
├── src-tauri/                   # 后端源码
│   ├── src/
│   │   ├── commands.rs         # Tauri 命令
│   │   ├── python_analyzer.rs  # Python 分析器模块
│   │   ├── lib.rs              # 库入口
│   │   └── main.rs             # 程序入口
│   ├── python/                 # Python 分析脚本 (预留)
│   ├── Cargo.toml             # Rust 依赖配置
│   ├── tauri.conf.json        # Tauri 配置
│   └── capabilities/           # 权限配置
├── package.json               # 前端依赖配置
└── README.md                  # 本文档
```

## 开发状态

### ✅ 已实现功能
- 完整的 Tauri 应用程序框架
- 原生文件选择对话框集成
- 模拟数据分析流程
- 基础 UI 组件和样式
- Python 数据分析集成
- Excel 文件解析和数据处理
- 图表生成和显示
- Word 报告生成
- 跨平台支持

### 📋 计划功能
- 更多数据可视化选项
- 报告模板自定义
- 数据导入向导

## 开发指南

### 添加新的分析功能
1. 在 `src-tauri/src/python_analyzer.rs` 中添加分析逻辑
2. 在 `src-tauri/src/commands.rs` 中添加 Tauri 命令
3. 在 `src-tauri/src/lib.rs` 中注册命令
4. 在前端调用新命令

### 添加新的 UI 组件
1. 在 `src/components/` 中创建新的 .js 文件
2. 实现组件类和相关方法
3. 在 `src/main.js` 中导入和使用组件
4. 在 `src/styles.css` 中添加相关样式

### 调试提示
- 使用 `yarn run dev` 进行开发调试
- 检查浏览器开发者工具的控制台输出
- 检查 Rust 后端的日志输出
- 使用 `tauri info` 检查环境配置

## 贡献指南

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

## 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 Issue
