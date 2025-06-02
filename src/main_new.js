// 现代化的ReaderReport应用 - 支持Rust引擎
// import { InteractiveCharts } from './components/InteractiveCharts.js';
// import { RustResultDisplay } from './components/RustResultDisplay.js';

class ReaderReportApp {
    constructor() {
        // this.rustResultDisplay = new RustResultDisplay();
        this.currentFiles = { borrowFiles: [], memberFile: null };
        this.analysisResult = null;
        this.useRustAnalyzer = true; // 默认使用Rust分析器
        this.isAnalyzing = false;
        
        this.initializeApp();
    }

    async initializeApp() {
        console.log('初始化ReaderReport应用...');
        
        // 等待Tauri API准备就绪
        await this.waitForTauriAPI();
        
        // 创建UI组件
        this.createUI();
        
        // 设置事件监听器
        this.setupEventListeners();
        
        console.log('应用初始化完成');
    }

    async waitForTauriAPI() {
        if (typeof window.__TAURI__ === 'undefined') {
            console.log('等待 Tauri API 初始化...');
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
    }

    createUI() {
        // 创建分析器切换器
        this.createAnalyzerSwitcher();
        
        // 创建文件选择器
        this.createFileSelector();
        
        // 创建分析控制器
        this.createAnalysisControl();
        
        // 创建结果显示容器
        this.createResultContainer();
    }

    createAnalyzerSwitcher() {
        const header = document.querySelector('.header');
        if (!header) {
            console.error('未找到.header元素');
            return;
        }

        const switcherHTML = `
            <div class="analyzer-switcher">
                <div class="switcher-content">
                    <div class="switcher-info">
                        <span class="engine-name">Rust</span>
                        <span class="engine-desc">高性能原生引擎 (Python已停止支持)</span>
                    </div>
                </div>
            </div>
        `;
        
        header.insertAdjacentHTML('beforeend', switcherHTML);

        // 添加CSS样式
        const style = document.createElement('style');
        style.textContent = `
            .analyzer-switcher {
                position: absolute;
                top: 20px;
                right: 20px;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 15px;
                padding: 15px;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .switcher-content {
                display: flex;
                align-items: center;
                gap: 15px;
            }
            
            .switch {
                position: relative;
                display: inline-block;
                width: 120px;
                height: 34px;
            }
            
            .switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            
            .slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                transition: 0.4s;
                border-radius: 17px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 2px;
            }
            
            .slider:before {
                position: absolute;
                content: "";
                height: 30px;
                width: 58px;
                left: 2px;
                bottom: 2px;
                background: white;
                transition: 0.4s;
                border-radius: 15px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            }
            
            input:checked + .slider {
                background: linear-gradient(135deg, #ff7675 0%, #d63031 100%);
            }
            
            input:checked + .slider:before {
                transform: translateX(58px);
            }
            
            .switch-label {
                position: relative;
                z-index: 1;
                color: white;
                font-size: 12px;
                font-weight: 600;
                padding: 0 8px;
                text-shadow: 0 1px 2px rgba(0,0,0,0.3);
            }
            
            .switcher-info {
                color: white;
                text-align: left;
            }
            
            .engine-name {
                display: block;
                font-weight: 700;
                font-size: 16px;
                margin-bottom: 2px;
            }
            
            .engine-desc {
                display: block;
                font-size: 12px;
                opacity: 0.8;
            }
            
            @media (max-width: 768px) {
                .analyzer-switcher {
                    position: static;
                    margin: 10px 0;
                }
                
                .switcher-content {
                    flex-direction: column;
                    gap: 10px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    createFileSelector() {
        const container = document.getElementById('fileSelector');
        if (!container) return;

        container.innerHTML = `
            <div class="modern-file-selector">
                <div class="file-section">
                    <div class="file-section-header">
                        <h3>📚 借阅数据文件</h3>
                        <span class="file-hint">支持多选Excel文件</span>
                    </div>
                    <button id="selectBorrowFiles" class="modern-file-button">
                        <span class="button-icon">📁</span>
                        <span class="button-text">选择借阅数据文件</span>
                    </button>
                    <div id="borrowFilesList" class="file-list modern"></div>
                </div>
                
                <div class="file-section">
                    <div class="file-section-header">
                        <h3>👥 读者清单文件</h3>
                        <span class="file-hint">选择单个Excel文件</span>
                    </div>
                    <button id="selectReaderFile" class="modern-file-button">
                        <span class="button-icon">📋</span>
                        <span class="button-text">选择读者清单文件</span>
                    </button>
                    <div id="readerFileDisplay" class="file-list modern"></div>
                </div>
            </div>
        `;
    }

    createAnalysisControl() {
        const container = document.getElementById('analysisControl');
        if (!container) return;

        container.innerHTML = `
            <div class="modern-analysis-control">
                <button id="analyzeButton" class="modern-analyze-button" disabled>
                    <span class="button-icon">🔍</span>
                    <span class="button-text">开始智能分析</span>
                    <span class="button-engine">${this.useRustAnalyzer ? 'Rust引擎' : 'Python引擎'}</span>
                </button>
                
                <div id="progressContainer" class="modern-progress-container" style="display: none;">
                    <div class="progress-wrapper">
                        <div class="progress-bar">
                            <div id="progressFill" class="progress-fill"></div>
                        </div>
                        <div id="progressText" class="progress-text">准备中...</div>
                        <div id="progressPercent" class="progress-percent">0%</div>
                    </div>
                </div>
            </div>
        `;
    }

    createResultContainer() {
        const container = document.getElementById('results');
        if (!container) return;

        container.innerHTML = `
            <div id="resultsContent" class="results-content">
                <!-- 结果将在这里动态显示 -->
            </div>
        `;
    }

    setupEventListeners() {
        // 分析器切换事件
        const analyzerSwitch = document.getElementById('analyzerSwitch');
        if (analyzerSwitch) {
            analyzerSwitch.addEventListener('change', (e) => {
                this.useRustAnalyzer = e.target.checked;
                this.updateUI();
                this.clearResults();
            });
        }

        // 文件选择事件
        document.getElementById('selectBorrowFiles')?.addEventListener('click', () => {
            this.selectBorrowFiles();
        });

        document.getElementById('selectReaderFile')?.addEventListener('click', () => {
            this.selectReaderFile();
        });

        // 分析按钮事件
        document.getElementById('analyzeButton')?.addEventListener('click', () => {
            this.performAnalysis();
        });
    }

    async selectBorrowFiles() {
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
                this.currentFiles.borrowFiles = selected;
                this.updateFileDisplay();
                this.updateAnalyzeButton();
            }
        } catch (error) {
            console.error('选择借阅数据文件失败:', error);
            this.showError('选择借阅数据文件失败: ' + error.message);
        }
    }

    async selectReaderFile() {
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
                this.currentFiles.memberFile = selected;
                this.updateFileDisplay();
                this.updateAnalyzeButton();
            }
        } catch (error) {
            console.error('选择读者清单文件失败:', error);
            this.showError('选择读者清单文件失败: ' + error.message);
        }
    }

    updateFileDisplay() {
        // 更新借阅文件列表
        const borrowList = document.getElementById('borrowFilesList');
        if (borrowList && this.currentFiles.borrowFiles.length > 0) {
            borrowList.innerHTML = this.currentFiles.borrowFiles.map(path => {
                const fileName = path.split(/[/\\]/).pop();
                return `
                    <div class="file-item">
                        <span class="file-icon">📄</span>
                        <span class="file-name">${fileName}</span>
                        <span class="file-path" title="${path}">${path}</span>
                    </div>
                `;
            }).join('');
        }

        // 更新读者文件显示
        const readerDisplay = document.getElementById('readerFileDisplay');
        if (readerDisplay && this.currentFiles.memberFile) {
            const fileName = this.currentFiles.memberFile.split(/[/\\]/).pop();
            readerDisplay.innerHTML = `
                <div class="file-item">
                    <span class="file-icon">📋</span>
                    <span class="file-name">${fileName}</span>
                    <span class="file-path" title="${this.currentFiles.memberFile}">${this.currentFiles.memberFile}</span>
                </div>
            `;
        }
    }

    updateAnalyzeButton() {
        const analyzeBtn = document.getElementById('analyzeButton');
        const buttonEngine = analyzeBtn?.querySelector('.button-engine');
        
        if (analyzeBtn) {
            const canAnalyze = this.currentFiles.borrowFiles.length > 0 && this.currentFiles.memberFile;
            analyzeBtn.disabled = !canAnalyze || this.isAnalyzing;
            
            if (buttonEngine) {
                buttonEngine.textContent = 'Rust引擎';
            }
        }
    }

    updateUI() {
        this.updateAnalyzeButton();
    }

    async performAnalysis() {
        if (!this.validateFiles() || this.isAnalyzing) {
            return;
        }

        this.isAnalyzing = true;
        this.updateAnalyzeButton();

        try {
            this.showProgress('开始分析...', 0);

            let result;
            if (this.useRustAnalyzer) {
                // 使用Rust分析器
                this.showProgress('使用Rust引擎分析...', 20);
                result = await window.__TAURI__.core.invoke('rust_load_and_analyze', {
                    readerListPath: this.currentFiles.memberFile,
                    borrowPaths: this.currentFiles.borrowFiles
                });
                
                this.showProgress('渲染结果...', 80);
                this.rustResultDisplay.displayResult(result);
            } else {
                // 使用Python分析器
                this.showProgress('初始化Python引擎...', 10);
                await window.__TAURI__.core.invoke('initialize_analyzer');
                
                this.showProgress('使用Python引擎分析...', 30);
                result = await window.__TAURI__.core.invoke('analyze_files', {
                    readerListPath: this.currentFiles.memberFile,
                    borrowPaths: this.currentFiles.borrowFiles
                });
                
                this.showProgress('渲染结果...', 80);
                this.displayPythonResult(result);
            }

            this.analysisResult = result;
            this.showProgress('分析完成', 100);
            
            setTimeout(() => {
                this.hideProgress();
            }, 1000);

        } catch (error) {
            console.error('分析失败:', error);
            this.showError('分析失败: ' + error.message);
        } finally {
            this.isAnalyzing = false;
            this.updateAnalyzeButton();
        }
    }

    validateFiles() {
        if (this.currentFiles.borrowFiles.length === 0) {
            this.showError('请选择至少一个借阅数据文件');
            return false;
        }

        if (!this.currentFiles.memberFile) {
            this.showError('请选择读者清单文件');
            return false;
        }

        return true;
    }

    displayPythonResult(result) {
        // 为Python结果显示创建简单的显示
        const container = document.getElementById('resultsContent');
        if (!container) return;

        container.innerHTML = `
            <div class="python-results-container">
                <div class="results-header">
                    <h2 class="results-title">📚 ${result.reader_name || '未知读者'} 的读书分析报告</h2>
                    <p class="results-subtitle">基于 Python 分析引擎生成</p>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card theme-blue">
                        <div class="stat-icon">📖</div>
                        <div class="stat-content">
                            <div class="stat-number">${result.borrow_frequency || 0}</div>
                            <div class="stat-label">总借阅次数</div>
                        </div>
                    </div>
                    
                    <div class="stat-card theme-green">
                        <div class="stat-icon">⏰</div>
                        <div class="stat-content">
                            <div class="stat-number">${result.total_duration || '未知'}</div>
                            <div class="stat-label">会员时长</div>
                        </div>
                    </div>
                    
                    <div class="stat-card theme-orange">
                        <div class="stat-icon">💰</div>
                        <div class="stat-content">
                            <div class="stat-number">¥${(result.total_price || 0).toFixed(2)}</div>
                            <div class="stat-label">图书总价值</div>
                        </div>
                    </div>
                    
                    <div class="stat-card theme-purple">
                        <div class="stat-icon">🏆</div>
                        <div class="stat-content">
                            <div class="stat-number">${result.total_full_attendance || 0}</div>
                            <div class="stat-label">全勤月数</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showProgress(message, percent) {
        const container = document.getElementById('progressContainer');
        const fill = document.getElementById('progressFill');
        const text = document.getElementById('progressText');
        const percentElement = document.getElementById('progressPercent');

        if (container) container.style.display = 'block';
        if (fill) fill.style.width = percent + '%';
        if (text) text.textContent = message;
        if (percentElement) percentElement.textContent = Math.round(percent) + '%';
    }

    hideProgress() {
        const container = document.getElementById('progressContainer');
        if (container) {
            container.style.display = 'none';
        }
    }

    showError(message) {
        alert('错误: ' + message);
    }

    clearResults() {
        this.analysisResult = null;
        this.rustResultDisplay.clearDisplay();
        
        const container = document.getElementById('resultsContent');
        if (container) {
            container.innerHTML = '';
        }
    }
}

// 应用初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化现代化ReaderReport应用...');
    window.readerReportApp = new ReaderReportApp();
});

// 导出全局访问
window.ReaderReportApp = ReaderReportApp;