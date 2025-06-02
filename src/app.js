// ReaderReport 现代化应用 - 简化版本，支持Rust引擎
class ReaderReportApp {
    constructor() {
        this.currentFiles = { borrowFiles: [], memberFile: null };
        this.analysisResult = null;
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
        // 创建引擎信息显示
        this.createEngineInfo();
        
        // 创建文件选择器
        this.createFileSelector();
        
        // 创建分析控制器
        this.createAnalysisControl();
        
        // 创建结果显示容器
        this.createResultContainer();
    }

    createEngineInfo() {
        const header = document.querySelector('.header');
        if (!header) {
            console.error('未找到.header元素');
            return;
        }

        const infoHTML = `
            <div class="analyzer-switcher">
                <div class="switcher-content">
                    <div class="switcher-info">
                        <span class="engine-name">🦀 Rust引擎</span>
                        <span class="engine-desc">高性能原生分析引擎</span>
                    </div>
                </div>
            </div>
        `;
        
        header.insertAdjacentHTML('beforeend', infoHTML);

        // 添加CSS样式
        const style = document.createElement('style');
        style.textContent = `
            .analyzer-switcher {
                position: absolute;
                top: 20px;
                right: 20px;
                background: rgba(255, 255, 255, 0.15);
                backdrop-filter: blur(10px);
                border-radius: 15px;
                padding: 15px 20px;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .switcher-content {
                text-align: center;
            }
            
            .engine-name {
                display: block;
                color: white;
                font-weight: 700;
                font-size: 16px;
                margin-bottom: 4px;
            }
            
            .engine-desc {
                display: block;
                color: white;
                font-size: 12px;
                opacity: 0.9;
            }
            
            @media (max-width: 768px) {
                .analyzer-switcher {
                    position: static;
                    margin: 15px auto;
                    max-width: 300px;
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
                        <span class="file-hint">支持多选Excel文件(.xlsx/.xls)</span>
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
                        <span class="file-hint">选择单个Excel文件(.xlsx/.xls)</span>
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
                    <span class="button-engine">Rust引擎</span>
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
        // 文件选择事件监听器
        setTimeout(() => {
            const selectBorrowBtn = document.getElementById('selectBorrowFiles');
            const selectReaderBtn = document.getElementById('selectReaderFile');
            const analyzeBtn = document.getElementById('analyzeButton');

            if (selectBorrowBtn) {
                selectBorrowBtn.addEventListener('click', () => {
                    this.selectBorrowFiles();
                });
            }

            if (selectReaderBtn) {
                selectReaderBtn.addEventListener('click', () => {
                    this.selectReaderFile();
                });
            }

            if (analyzeBtn) {
                analyzeBtn.addEventListener('click', () => {
                    this.performAnalysis();
                });
            }
        }, 100);
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
        
        if (analyzeBtn) {
            const canAnalyze = this.currentFiles.borrowFiles.length > 0 && this.currentFiles.memberFile;
            analyzeBtn.disabled = !canAnalyze || this.isAnalyzing;
        }
    }

    async performAnalysis() {
        if (!this.validateFiles() || this.isAnalyzing) {
            return;
        }

        this.isAnalyzing = true;
        this.updateAnalyzeButton();

        try {
            this.showProgress('开始分析...', 0);

            // 使用Rust分析器 - 先加载文件获取读者列表
            this.showProgress('加载数据文件...', 20);
            const readerFiles = await window.__TAURI__.core.invoke('rust_analyze_files', {
                readerListPath: this.currentFiles.memberFile,
                borrowPaths: this.currentFiles.borrowFiles
            });
            
            if (!readerFiles || readerFiles.length === 0) {
                throw new Error('没有找到任何读者数据');
            }

            // 分析第一个读者文件（单文件模式）
            this.showProgress('分析读者数据...', 50);
            const result = await window.__TAURI__.core.invoke('rust_analyze_single_file', {
                fileIndex: 0
            });
            
            this.showProgress('渲染结果...', 80);
            this.displayResult(result);

            this.analysisResult = result;
            this.readerFiles = readerFiles; // 保存读者文件列表用于后续选择
            this.showProgress('分析完成', 100);
            
            // 如果有多个读者文件，显示选择界面
            if (readerFiles.length > 1) {
                this.showReaderSelector(readerFiles);
            }
            
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

    displayResult(result) {
        const container = document.getElementById('resultsContent');
        if (!container) return;

        // 保留读者选择器，只更新结果部分
        const existingSelector = document.getElementById('readerSelector');
        const selectorHTML = existingSelector ? existingSelector.outerHTML : '';
        
        // 移除旧的结果，但保留选择器
        const existingResults = container.querySelector('.rust-results-container');
        if (existingResults) {
            existingResults.remove();
        }

        const resultHTML = `
            <div class="rust-results-container animate-in">
                <div class="results-header">
                    <h2 class="results-title">📚 ${result.reader_name || '未知读者'} 的读书分析报告</h2>
                    <p class="results-subtitle">基于 Rust 高性能分析引擎生成</p>
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
                            <div class="stat-number">${result.total_reading_duration || 0}</div>
                            <div class="stat-label">总阅读天数</div>
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

                <div class="insights-section">
                    <h3 class="section-title">🔍 阅读洞察</h3>
                    <div class="insights-grid">
                        <div class="insight-item">
                            <span class="insight-label">最爱作者:</span>
                            <span class="insight-value">${result.most_frequent_author || '暂无数据'}</span>
                        </div>
                        <div class="insight-item">
                            <span class="insight-label">最爱类别:</span>
                            <span class="insight-value">${result.most_frequent_category || '暂无数据'}</span>
                        </div>
                        <div class="insight-item">
                            <span class="insight-label">阅读时长最长作者:</span>
                            <span class="insight-value">${result.longest_author || '暂无数据'}</span>
                        </div>
                        <div class="insight-item">
                            <span class="insight-label">阅读时长最长类别:</span>
                            <span class="insight-value">${result.longest_category || '暂无数据'}</span>
                        </div>
                        <div class="insight-item">
                            <span class="insight-label">借阅高峰期:</span>
                            <span class="insight-value">${result.borrow_peak_yearmonth || '暂无数据'}</span>
                        </div>
                        <div class="insight-item">
                            <span class="insight-label">最爱书籍:</span>
                            <span class="insight-value">${result.most_borrowed_book || '暂无数据'} ${result.most_borrowed_book_count ? '(' + result.most_borrowed_book_count + '次)' : ''}</span>
                        </div>
                    </div>
                </div>

                <div class="export-section">
                    <h4 class="section-title">📤 导出功能</h4>
                    <div class="export-buttons">
                        <button class="export-btn primary" onclick="readerReportApp.generateReport()">
                            📄 生成完整报告
                        </button>
                        <button class="export-btn secondary" onclick="readerReportApp.exportData()">
                            💾 导出原始数据
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // 将结果HTML插入到容器中
        container.insertAdjacentHTML('beforeend', resultHTML);
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

    showReaderSelector(readerFiles) {
        console.log('显示读者选择器:', readerFiles);
        
        // 创建读者选择器UI
        const container = document.getElementById('resultsContent');
        if (!container) {
            console.error('找不到 resultsContent 容器');
            return;
        }

        // 在结果前面插入读者选择器
        const existingSelector = document.getElementById('readerSelector');
        if (existingSelector) {
            existingSelector.remove();
        }

        const selectorHTML = `
            <div id="readerSelector" class="reader-selector">
                <div class="selector-header">
                    <h3>📚 读者选择 (${readerFiles.length}个)</h3>
                </div>
                <div class="reader-buttons">
                    ${readerFiles.map((file, index) => `
                        <button class="reader-btn ${index === (this.currentReaderIndex || 0) ? 'active' : ''}"
                                onclick="readerReportApp.switchToReader(${index})"
                                data-index="${index}">
                            <div class="reader-info">
                                <span class="reader-name">${file.primary_reader_name}</span>
                                <span class="reader-count">${file.record_count} 条记录</span>
                            </div>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        console.log('插入读者选择器HTML:', selectorHTML);
        container.insertAdjacentHTML('afterbegin', selectorHTML);

        // 添加CSS样式
        this.addReaderSelectorStyles();
        
        console.log('读者选择器创建完成');
    }

    addReaderSelectorStyles() {
        const existingStyle = document.getElementById('readerSelectorStyles');
        if (existingStyle) return;

        const style = document.createElement('style');
        style.id = 'readerSelectorStyles';
        style.textContent = `
            .reader-selector {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 15px;
                padding: 20px;
                margin-bottom: 20px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            }

            .selector-header h3 {
                color: white;
                margin: 0 0 15px 0;
                font-size: 18px;
                font-weight: 600;
            }

            .reader-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
            }

            .reader-btn {
                background: rgba(255, 255, 255, 0.15);
                border: 2px solid rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                padding: 12px 16px;
                color: white;
                cursor: pointer;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
                min-width: 150px;
            }

            .reader-btn:hover {
                background: rgba(255, 255, 255, 0.25);
                border-color: rgba(255, 255, 255, 0.4);
                transform: translateY(-2px);
            }

            .reader-btn.active {
                background: rgba(255, 255, 255, 0.9);
                color: #333;
                border-color: white;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            }

            .reader-info {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
            }

            .reader-name {
                font-weight: 600;
                font-size: 14px;
            }

            .reader-count {
                font-size: 12px;
                opacity: 0.8;
            }

            .reader-btn.active .reader-count {
                opacity: 0.6;
            }

            @media (max-width: 768px) {
                .reader-buttons {
                    flex-direction: column;
                }
                
                .reader-btn {
                    min-width: unset;
                }
            }
        `;
        document.head.appendChild(style);
    }

    async switchToReader(fileIndex) {
        if (this.isAnalyzing || fileIndex === this.currentReaderIndex) return;
        
        this.isAnalyzing = true;
        this.updateAnalyzeButton();

        try {
            this.showProgress('切换读者数据...', 0);
            
            const result = await window.__TAURI__.core.invoke('rust_analyze_single_file', {
                fileIndex: fileIndex
            });
            
            this.showProgress('更新结果...', 50);
            this.displayResult(result);
            this.analysisResult = result;
            this.currentReaderIndex = fileIndex;
            
            // 更新按钮状态
            this.updateReaderButtons();
            
            this.showProgress('完成', 100);
            setTimeout(() => {
                this.hideProgress();
            }, 500);

        } catch (error) {
            console.error('切换读者失败:', error);
            this.showError('切换读者失败: ' + error.message);
        } finally {
            this.isAnalyzing = false;
            this.updateAnalyzeButton();
        }
    }

    updateReaderButtons() {
        const buttons = document.querySelectorAll('.reader-btn');
        buttons.forEach((btn, index) => {
            if (index === this.currentReaderIndex) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    showInfo(message) {
        // 简单的信息提示，可以后续扩展为更好的UI
        alert(message);
    }

    clearResults() {
        this.analysisResult = null;
        
        const container = document.getElementById('resultsContent');
        if (container) {
            container.innerHTML = '';
        }
    }

    generateReport() {
        alert('报告生成功能正在开发中...');
    }

    exportData() {
        if (!this.analysisResult) {
            alert('没有可导出的数据');
            return;
        }

        const dataStr = JSON.stringify(this.analysisResult, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `读书分析数据_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// 应用初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化ReaderReport应用...');
    window.readerReportApp = new ReaderReportApp();
});