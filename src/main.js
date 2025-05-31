// 简化的应用初始化
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM 内容加载完成');
    
    // 检查 Tauri 环境并等待 API 就绪
    if (typeof window.__TAURI__ === 'undefined') {
        console.log('等待 Tauri API 初始化...');
        // 等待 Tauri API 可用
        await new Promise(resolve => {
            const check = () => {
                if (typeof window.__TAURI__ !== 'undefined') {
                    console.log('Tauri API 已可用');
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    console.log('Tauri API 已准备就绪');
    console.log('可用的 Tauri API:', Object.keys(window.__TAURI__));
    
    // 直接创建UI元素而不是动态加载组件
    createFileSelector();
    createAnalysisControl();
    createResultDisplay();
});

// 创建文件选择器
function createFileSelector() {
    const container = document.getElementById('fileSelector');
    if (!container) return;

    container.innerHTML = `
        <div class="file-selector">
            <div class="file-section">
                <label>借阅数据文件（可多选）：</label>
                <button id="selectBorrowFiles" class="file-select-button">选择借阅数据文件</button>
            </div>
            <div class="file-section">
                <label>读者清单文件：</label>
                <button id="selectReaderFile" class="file-select-button">选择读者清单文件</button>
            </div>
            <div id="fileList" class="file-list"></div>
        </div>
    `;

    // 添加事件监听器
    document.getElementById('selectBorrowFiles').addEventListener('click', selectBorrowFiles);
    document.getElementById('selectReaderFile').addEventListener('click', selectReaderFile);
}

// 创建分析控制器
function createAnalysisControl() {
    const container = document.getElementById('analysisControl');
    if (!container) return;

    container.innerHTML = `
        <div class="analysis-control">
            <button id="analyzeButton" class="analyze-button">开始分析</button>
            <div id="progressContainer" class="progress-container" style="display: none;">
                <div class="progress-bar">
                    <div id="progressFill" class="progress-fill" style="width: 0%;"></div>
                </div>
                <div id="progressText" class="progress-text">准备中...</div>
            </div>
        </div>
    `;

    // 添加事件监听器
    document.getElementById('analyzeButton').addEventListener('click', startAnalysis);
}

// 创建结果显示器
function createResultDisplay() {
    const container = document.getElementById('resultDisplay');
    if (!container) return;

    container.innerHTML = `
        <div class="result-display" style="display: none;">
            <div class="result-header">
                <h3>分析结果</h3>
                <button id="selectFileButton" class="select-file-button" style="display: none;">选择文件预览</button>
            </div>
            <div id="statsCards" class="stats-cards"></div>
            <div id="chartsList" class="charts-list"></div>
            <div class="result-actions">
                <button id="exportButton" class="export-button">导出报告</button>
            </div>
        </div>
    `;

    // 添加事件监听器
    document.getElementById('exportButton').addEventListener('click', exportReport);
    document.getElementById('selectFileButton').addEventListener('click', showFileSelector);
}

// 全局变量存储文件信息
let borrowFiles = [];
let readerListFile = null;

// 选择借阅数据文件
async function selectBorrowFiles() {
    try {
        const selected = await window.__TAURI__.dialog.open({
            multiple: true,
            filters: [{
                name: 'Excel文件',
                extensions: ['xlsx', 'xls']
            }],
            title: '选择借阅数据文件'
        });

        if (selected && selected.length > 0) {
            borrowFiles = selected.map(path => ({
                name: path.split(/[/\\]/).pop(),
                path: path
            }));
            updateFileList();
        }
    } catch (error) {
        console.error('选择借阅数据文件失败:', error);
        alert('选择借阅数据文件失败: ' + error.message);
    }
}

// 选择读者清单文件
async function selectReaderFile() {
    try {
        const selected = await window.__TAURI__.dialog.open({
            multiple: false,
            filters: [{
                name: 'Excel文件',
                extensions: ['xlsx', 'xls']
            }],
            title: '选择读者清单文件'
        });

        if (selected) {
            readerListFile = {
                name: selected.split(/[/\\]/).pop(),
                path: selected
            };
            updateFileList();
        }
    } catch (error) {
        console.error('选择读者清单文件失败:', error);
        alert('选择读者清单文件失败: ' + error.message);
    }
}

// 更新文件列表显示
function updateFileList() {
    const fileList = document.getElementById('fileList');
    if (!fileList) return;

    fileList.innerHTML = '';
    
    if (borrowFiles.length > 0) {
        const borrowTitle = document.createElement('h4');
        borrowTitle.textContent = '已选择的借阅数据文件：';
        fileList.appendChild(borrowTitle);
        
        const borrowList = document.createElement('ul');
        borrowFiles.forEach(file => {
            const li = document.createElement('li');
            li.textContent = file.name;
            li.title = file.path;
            borrowList.appendChild(li);
        });
        fileList.appendChild(borrowList);
    }

    if (readerListFile) {
        const readerTitle = document.createElement('h4');
        readerTitle.textContent = '已选择的读者清单文件：';
        fileList.appendChild(readerTitle);
        
        const readerList = document.createElement('ul');
        const li = document.createElement('li');
        li.textContent = readerListFile.name;
        li.title = readerListFile.path;
        readerList.appendChild(li);
        fileList.appendChild(readerList);
    }
}

// 开始分析
async function startAnalysis() {
    // 验证文件选择
    if (borrowFiles.length === 0 || !readerListFile) {
        alert('请选择读者清单文件和至少一个借阅数据文件');
        return;
    }

    try {
        // 显示进度条
        document.getElementById('progressContainer').style.display = 'block';
        document.getElementById('analyzeButton').disabled = true;

        // 初始化分析器
        updateProgress(10, '初始化分析器...');
        await window.__TAURI__.core.invoke('initialize_analyzer');

        // 开始分析
        updateProgress(30, '开始分析数据...');
        const result = await window.__TAURI__.core.invoke('analyze_files', {
            readerListPath: readerListFile.path,
            borrowPaths: borrowFiles.map(f => f.path)
        });

        // 显示结果
        updateProgress(70, '显示分析结果...');
        displayStats(result);
        
        // 选择输出目录并生成图表
        updateProgress(80, '选择输出目录...');
        const outputDir = await selectOutputDirectory();
        if (outputDir) {
            updateProgress(90, '生成图表...');
            const chartPaths = await window.__TAURI__.core.invoke('generate_charts', { outputDir });
            displayCharts(chartPaths);
        }
        
        updateProgress(100, '分析完成');
        
        // 检查是否有多个文件，如果有则显示文件选择按钮
        const fileCount = await window.__TAURI__.core.invoke('get_file_count');
        const selectFileButton = document.getElementById('selectFileButton');
        if (selectFileButton && fileCount > 1) {
            selectFileButton.style.display = 'inline-block';
            selectFileButton.textContent = `选择文件预览 (共 ${fileCount} 个文件)`;
        }
        
        // 显示结果区域
        document.querySelector('.result-display').style.display = 'block';
        
    } catch (error) {
        console.error('分析过程中出现错误:', error);
        alert('分析过程中出现错误: ' + error);
        updateProgress(0, '分析失败');
    } finally {
        document.getElementById('analyzeButton').disabled = false;
    }
}

// 更新进度
function updateProgress(percent, message) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (progressFill) progressFill.style.width = percent + '%';
    if (progressText) progressText.textContent = message;
    
    if (percent === 100 || percent === 0) {
        setTimeout(() => {
            const container = document.getElementById('progressContainer');
            if (container) container.style.display = 'none';
        }, 2000);
    }
}

// 显示统计结果
function displayStats(stats) {
    const container = document.getElementById('statsCards');
    if (!container) return;

    container.innerHTML = `
        <div class="stat-card">
            <h4>借阅频次</h4>
            <p>${stats.borrow_frequency} 次</p>
        </div>
        <div class="stat-card">
            <h4>总借阅时长</h4>
            <p>${stats.total_duration}</p>
        </div>
        <div class="stat-card">
            <h4>总价值</h4>
            <p>￥${stats.total_price}</p>
        </div>
        <div class="stat-card">
            <h4>借阅次数最多作者</h4>
            <p>${stats.most_frequent_author}</p>
        </div>
        <div class="stat-card">
            <h4>借阅次数最多类别</h4>
            <p>${stats.most_frequent_category}</p>
        </div>
        <div class="stat-card">
            <h4>借阅高峰期</h4>
            <p>${stats.borrow_peak_yearmonth}</p>
        </div>
        <div class="stat-card">
            <h4>最受欢迎图书</h4>
            <p>${stats.most_borrowed_book} (${stats.most_borrowed_book_count}次)</p>
        </div>
        <div class="stat-card">
            <h4>全勤月份</h4>
            <p>${stats.total_full_attendance} 个月</p>
        </div>
        <div class="stat-card">
            <h4>阅读时长最长作者</h4>
            <p>${stats.longest_author}</p>
        </div>
        <div class="stat-card">
            <h4>阅读时长最长类别</h4>
            <p>${stats.longest_category}</p>
        </div>
    `;
}

// 显示图表
function displayCharts(chartPaths) {
    const container = document.getElementById('chartsList');
    if (!container || !chartPaths) return;

    container.innerHTML = '<h4>生成的图表:</h4>';
    
    Object.entries(chartPaths).forEach(([key, path]) => {
        const chartItem = document.createElement('div');
        chartItem.className = 'chart-item';
        chartItem.innerHTML = `<p>${key}: ${path}</p>`;
        container.appendChild(chartItem);
    });
}

// 选择输出目录
async function selectOutputDirectory() {
    try {
        const selected = await window.__TAURI__.dialog.open({
            directory: true,
            title: '选择图表输出目录'
        });
        return selected;
    } catch (error) {
        console.error('选择输出目录失败:', error);
        alert('选择输出目录失败: ' + error.message);
        return null;
    }
}

// 导出报告 - 增强版支持多文件
async function exportReport() {
    try {
        // 检查是否有多个文件
        const fileCount = await window.__TAURI__.core.invoke('get_file_count');
        
        if (fileCount > 1) {
            // 多文件模式：选择输出目录，为每个文件生成独立报告
            // const result = confirm(`检测到 ${fileCount} 个借阅数据文件。\n\n点击"确定"为每个文件单独生成报告\n点击"取消"生成合并报告`);
            const result = true; // 默认启用多文件模式
            
            if (result) {
                await exportMultipleReports();
            } else {
                await exportSingleReport();
            }
        } else {
            // 单文件模式
            await exportSingleReport();
        }
    } catch (error) {
        console.error('导出报告失败:', error);
        alert('导出报告失败: ' + error);
    }
}

// 导出单个报告
async function exportSingleReport() {
    try {
        const savePath = await window.__TAURI__.dialog.save({
            filters: [{
                name: 'Word文档',
                extensions: ['docx']
            }],
            defaultPath: '读书报告.docx',
            title: '保存报告'
        });
        
        if (savePath) {
            await window.__TAURI__.core.invoke('export_report', { outputPath: savePath });
            alert('报告导出成功: ' + savePath);
        }
    } catch (error) {
        console.error('导出单个报告失败:', error);
        alert('导出单个报告失败: ' + error);
    }
}

// 导出多个报告
async function exportMultipleReports() {
    try {
        const outputDir = await window.__TAURI__.dialog.open({
            directory: true,
            title: '选择报告输出目录'
        });
        
        if (outputDir) {
            updateProgress(10, '开始批量生成报告...');
            
            const reportPaths = await window.__TAURI__.core.invoke('export_reports_for_all_files', {
                baseOutputDir: outputDir
            });
            
            updateProgress(100, '所有报告生成完成');
            
            const fileList = reportPaths.map(path => path.split(/[/\\]/).pop()).join('\n');
            alert(`所有报告导出成功！\n\n生成的报告文件：\n${fileList}\n\n保存位置：${outputDir}`);
        }
    } catch (error) {
        console.error('导出多个报告失败:', error);
        alert('导出多个报告失败: ' + error);
    }
}

// 新增：显示文件选择器，支持单文件分析预览
async function showFileSelector() {
    try {
        const fileCount = await window.__TAURI__.core.invoke('get_file_count');
        
        if (fileCount <= 1) {
            return; // 只有一个文件，不需要选择器
        }

        // 创建文件选择器模态框
        const modal = document.createElement('div');
        modal.className = 'file-selector-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>选择要预览的文件</h3>
                <div id="fileOptions" class="file-options"></div>
                <div class="modal-buttons">
                    <button id="previewSelected" class="preview-button">预览选中文件</button>
                    <button id="closeModal" class="close-button">关闭</button>
                </div>
            </div>
        `;
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .file-selector-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }
            .modal-content {
                background: white;
                padding: 20px;
                border-radius: 8px;
                max-width: 500px;
                width: 90%;
            }
            .file-options {
                margin: 20px 0;
            }
            .file-option {
                margin: 10px 0;
            }
            .modal-buttons {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
        `;
        document.head.appendChild(style);
        
        // 填充文件选项
        const fileOptionsContainer = modal.querySelector('#fileOptions');
        for (let i = 0; i < fileCount; i++) {
            const fileName = await window.__TAURI__.core.invoke('get_file_name', { fileIndex: i });
            const option = document.createElement('div');
            option.className = 'file-option';
            option.innerHTML = `
                <label>
                    <input type="radio" name="selectedFile" value="${i}">
                    ${fileName}
                </label>
            `;
            fileOptionsContainer.appendChild(option);
        }
        
        document.body.appendChild(modal);
        
        // 添加事件监听器
        modal.querySelector('#previewSelected').addEventListener('click', async () => {
            const selected = modal.querySelector('input[name="selectedFile"]:checked');
            if (selected) {
                const fileIndex = parseInt(selected.value);
                await previewSingleFile(fileIndex);
            } else {
                alert('请选择一个文件');
            }
        });
        
        modal.querySelector('#closeModal').addEventListener('click', () => {
            document.body.removeChild(modal);
            document.head.removeChild(style);
        });
        
    } catch (error) {
        console.error('显示文件选择器失败:', error);
        alert('显示文件选择器失败: ' + error);
    }
}

// 新增：预览单个文件的分析结果
async function previewSingleFile(fileIndex) {
    try {
        updateProgress(10, '分析单个文件...');
        
        const result = await window.__TAURI__.core.invoke('analyze_single_file', { fileIndex });
        const fileName = await window.__TAURI__.core.invoke('get_file_name', { fileIndex });
        
        updateProgress(50, '显示分析结果...');
        
        // 更新结果显示区域标题
        const resultDisplay = document.querySelector('.result-display h3');
        if (resultDisplay) {
            resultDisplay.textContent = `分析结果 - ${fileName}`;
        }
        
        displayStats(result);
        
        updateProgress(100, '单文件分析完成');
        
        // 关闭模态框
        const modal = document.querySelector('.file-selector-modal');
        if (modal) {
            document.body.removeChild(modal);
            // 移除样式
            const style = document.querySelector('style');
            if (style && style.textContent.includes('.file-selector-modal')) {
                document.head.removeChild(style);
            }
        }
        
        // 显示结果区域
        document.querySelector('.result-display').style.display = 'block';
        
    } catch (error) {
        console.error('预览单个文件失败:', error);
        alert('预览单个文件失败: ' + error);
    }
}
