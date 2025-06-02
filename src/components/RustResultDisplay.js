import { InteractiveCharts } from './InteractiveCharts.js';

export class RustResultDisplay {
    constructor() {
        this.charts = new InteractiveCharts();
        this.currentResult = null;
    }

    displayResult(result) {
        this.currentResult = result;
        
        // 清理现有内容
        this.clearDisplay();
        
        // 显示基本统计信息
        this.displayBasicStats(result);
        
        // 显示交互式图表
        this.displayCharts(result);
        
        // 显示详细统计数据
        this.displayDetailedStats(result);
    }

    clearDisplay() {
        const resultsDiv = document.getElementById('results');
        if (resultsDiv) {
            resultsDiv.innerHTML = '';
        }
        
        // 销毁现有图表
        this.charts.destroyAllCharts();
    }

    displayBasicStats(result) {
        const resultsDiv = document.getElementById('results');
        if (!resultsDiv) return;

        const statsHTML = `
            <div class="rust-results-container">
                <div class="results-header">
                    <h2 class="results-title">📚 ${result.reader_name} 的读书分析报告</h2>
                    <p class="results-subtitle">基于 Rust 分析引擎生成</p>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card theme-blue">
                        <div class="stat-icon">📖</div>
                        <div class="stat-content">
                            <div class="stat-number">${result.borrow_frequency}</div>
                            <div class="stat-label">总借阅次数</div>
                        </div>
                    </div>
                    
                    <div class="stat-card theme-green">
                        <div class="stat-icon">⏰</div>
                        <div class="stat-content">
                            <div class="stat-number">${result.total_reading_duration}</div>
                            <div class="stat-label">总阅读天数</div>
                        </div>
                    </div>
                    
                    <div class="stat-card theme-orange">
                        <div class="stat-icon">💰</div>
                        <div class="stat-content">
                            <div class="stat-number">¥${result.total_price.toFixed(2)}</div>
                            <div class="stat-label">图书总价值</div>
                        </div>
                    </div>
                    
                    <div class="stat-card theme-purple">
                        <div class="stat-icon">🏆</div>
                        <div class="stat-content">
                            <div class="stat-number">${result.total_full_attendance}</div>
                            <div class="stat-label">全勤月数</div>
                        </div>
                    </div>
                </div>

                <div class="insights-section">
                    <h3 class="section-title">🔍 阅读洞察</h3>
                    <div class="insights-grid">
                        <div class="insight-item">
                            <span class="insight-label">最爱作者 (按次数):</span>
                            <span class="insight-value">${result.most_frequent_author}</span>
                        </div>
                        <div class="insight-item">
                            <span class="insight-label">最爱类别 (按次数):</span>
                            <span class="insight-value">${result.most_frequent_category}</span>
                        </div>
                        <div class="insight-item">
                            <span class="insight-label">阅读时长最长作者:</span>
                            <span class="insight-value">${result.longest_author}</span>
                        </div>
                        <div class="insight-item">
                            <span class="insight-label">阅读时长最长类别:</span>
                            <span class="insight-value">${result.longest_category}</span>
                        </div>
                        <div class="insight-item">
                            <span class="insight-label">借阅高峰期:</span>
                            <span class="insight-value">${result.borrow_peak_yearmonth}</span>
                        </div>
                        <div class="insight-item">
                            <span class="insight-label">最爱书籍:</span>
                            <span class="insight-value">${result.most_borrowed_book} (${result.most_borrowed_book_count}次)</span>
                        </div>
                    </div>
                </div>
                
                <div class="charts-section">
                    <h3 class="section-title">📊 数据可视化</h3>
                    <div class="charts-grid" id="chartsContainer">
                        <!-- 图表将在这里动态生成 -->
                    </div>
                </div>
            </div>
        `;

        resultsDiv.innerHTML = statsHTML;
    }

    displayCharts(result) {
        const chartsContainer = document.getElementById('chartsContainer');
        if (!chartsContainer) return;

        // 创建图表容器
        const chartsHTML = `
            <div class="chart-container theme-blue animate-in">
                <h4 class="chart-title">📈 月度借阅趋势</h4>
                <div class="chart-canvas-wrapper">
                    <canvas id="monthlyBorrowChart" class="chart-canvas"></canvas>
                </div>
                <div class="chart-controls">
                    <button class="chart-btn" onclick="rustResultDisplay.exportChart('monthlyBorrowChart', '月度借阅趋势.png')">
                        💾 导出图片
                    </button>
                    <button class="chart-btn" onclick="rustResultDisplay.toggleFullscreen('monthlyBorrowChart')">
                        🔍 全屏查看
                    </button>
                </div>
            </div>

            <div class="chart-container theme-green animate-in">
                <h4 class="chart-title">📚 热门书籍排行榜</h4>
                <div class="chart-canvas-wrapper">
                    <canvas id="bookBorrowChart" class="chart-canvas"></canvas>
                </div>
                <div class="chart-controls">
                    <button class="chart-btn" onclick="rustResultDisplay.exportChart('bookBorrowChart', '热门书籍排行榜.png')">
                        💾 导出图片
                    </button>
                    <button class="chart-btn" onclick="rustResultDisplay.toggleFullscreen('bookBorrowChart')">
                        🔍 全屏查看
                    </button>
                </div>
            </div>
        `;

        chartsContainer.innerHTML = chartsHTML;

        // 等待DOM更新后创建图表
        setTimeout(() => {
            this.createCharts(result);
        }, 100);
    }

    createCharts(result) {
        try {
            // 月度借阅趋势图
            if (result.monthly_borrow && Object.keys(result.monthly_borrow).length > 0) {
                this.charts.createMonthlyBorrowChart('monthlyBorrowChart', result.monthly_borrow);
            }

            // 书籍借阅次数排行榜
            if (result.book_borrow_counts && Object.keys(result.book_borrow_counts).length > 0) {
                this.charts.createBookBorrowCountChart('bookBorrowChart', result.book_borrow_counts);
            }
        } catch (error) {
            console.error('创建图表时出错:', error);
            this.showChartError('图表生成失败: ' + error.message);
        }
    }

    displayDetailedStats(result) {
        const resultsDiv = document.getElementById('results');
        if (!resultsDiv) return;

        const detailedStatsHTML = `
            <div class="detailed-stats-section">
                <h3 class="section-title">📋 详细统计信息</h3>
                
                <div class="stats-tabs">
                    <button class="stats-tab active" onclick="rustResultDisplay.switchTab('monthly')">月度统计</button>
                    <button class="stats-tab" onclick="rustResultDisplay.switchTab('books')">书籍排行</button>
                    <button class="stats-tab" onclick="rustResultDisplay.switchTab('attendance')">全勤记录</button>
                </div>

                <div class="stats-content">
                    <div id="monthlyStats" class="stats-tab-content active">
                        <h4>📅 每月借书数量排序</h4>
                        <div class="stats-list">
                            ${this.generateMonthlyStatsList(result.monthly_borrow)}
                        </div>
                    </div>

                    <div id="booksStats" class="stats-tab-content">
                        <h4>📚 书籍借阅次数排序（前十）</h4>
                        <div class="stats-list">
                            ${this.generateBooksStatsList(result.book_borrow_counts)}
                        </div>
                    </div>

                    <div id="attendanceStats" class="stats-tab-content">
                        <h4>🏆 全勤月列表</h4>
                        <div class="attendance-list">
                            ${this.generateAttendanceList(result.full_attendance)}
                        </div>
                    </div>
                </div>

                <div class="export-section">
                    <h4 class="section-title">📤 导出功能</h4>
                    <div class="export-buttons">
                        <button class="export-btn primary" onclick="rustResultDisplay.generateReport()">
                            📄 生成完整报告
                        </button>
                        <button class="export-btn secondary" onclick="rustResultDisplay.exportAllCharts()">
                            🖼️ 导出所有图表
                        </button>
                        <button class="export-btn secondary" onclick="rustResultDisplay.exportData()">
                            💾 导出原始数据
                        </button>
                    </div>
                </div>
            </div>
        `;

        resultsDiv.insertAdjacentHTML('beforeend', detailedStatsHTML);
    }

    generateMonthlyStatsList(monthlyBorrow) {
        if (!monthlyBorrow || Object.keys(monthlyBorrow).length === 0) {
            return '<p class="no-data">暂无月度数据</p>';
        }

        const sortedEntries = Object.entries(monthlyBorrow)
            .sort(([, a], [, b]) => b - a);

        return sortedEntries.map(([month, count]) => `
            <div class="stats-item">
                <span class="stats-month">${month}</span>
                <span class="stats-count">${count} 本</span>
            </div>
        `).join('');
    }

    generateBooksStatsList(bookBorrowCounts) {
        if (!bookBorrowCounts || Object.keys(bookBorrowCounts).length === 0) {
            return '<p class="no-data">暂无书籍数据</p>';
        }

        const sortedEntries = Object.entries(bookBorrowCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        return sortedEntries.map(([book, count], index) => `
            <div class="stats-item ranked">
                <span class="rank">#${index + 1}</span>
                <span class="book-title">${book}</span>
                <span class="stats-count">${count} 次</span>
            </div>
        `).join('');
    }

    generateAttendanceList(fullAttendance) {
        if (!fullAttendance || fullAttendance.length === 0) {
            return '<p class="no-data">暂无全勤记录</p>';
        }

        return fullAttendance.map(month => `
            <div class="attendance-item">
                <span class="attendance-icon">🏆</span>
                <span class="attendance-month">${month}</span>
            </div>
        `).join('');
    }

    switchTab(tabName) {
        // 移除所有active状态
        document.querySelectorAll('.stats-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.stats-tab-content').forEach(content => content.classList.remove('active'));

        // 激活选中的tab
        event.target.classList.add('active');
        document.getElementById(tabName + 'Stats').classList.add('active');
    }

    exportChart(chartId, filename) {
        try {
            this.charts.exportChartAsPNG(chartId, filename);
        } catch (error) {
            alert('导出图表失败: ' + error.message);
        }
    }

    exportAllCharts() {
        const chartIds = ['monthlyBorrowChart', 'bookBorrowChart'];
        const filenames = ['月度借阅趋势.png', '热门书籍排行榜.png'];

        chartIds.forEach((chartId, index) => {
            try {
                this.charts.exportChartAsPNG(chartId, filenames[index]);
            } catch (error) {
                console.error(`导出图表 ${chartId} 失败:`, error);
            }
        });
    }

    exportData() {
        if (!this.currentResult) {
            alert('没有可导出的数据');
            return;
        }

        const dataStr = JSON.stringify(this.currentResult, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `${this.currentResult.reader_name}_阅读数据_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    toggleFullscreen(chartId) {
        // 实现全屏功能（简化版）
        const canvas = document.getElementById(chartId);
        if (canvas.requestFullscreen) {
            canvas.requestFullscreen();
        } else if (canvas.webkitRequestFullscreen) {
            canvas.webkitRequestFullscreen();
        } else if (canvas.msRequestFullscreen) {
            canvas.msRequestFullscreen();
        }
    }

    generateReport() {
        // 调用Rust后端生成报告
        alert('报告生成功能正在开发中...');
    }

    showChartError(message) {
        const chartsContainer = document.getElementById('chartsContainer');
        if (chartsContainer) {
            chartsContainer.innerHTML = `
                <div class="chart-error">
                    <div class="chart-error-icon">⚠️</div>
                    <div class="chart-error-message">${message}</div>
                </div>
            `;
        }
    }
}

// 创建全局实例
window.rustResultDisplay = new RustResultDisplay();