export class ResultDisplay {
    constructor() {
        this.element = this._createUI();
        this.onExportReportCallback = null;
    }

    _createUI() {
        const container = document.createElement('div');
        container.className = 'result-display';

        // 创建统计指标区域
        const statsSection = document.createElement('div');
        statsSection.className = 'stats-section';
        this.statsSection = statsSection;

        // 创建图表区域
        const chartSection = document.createElement('div');
        chartSection.className = 'chart-section';
        this.chartSection = chartSection;

        // 创建导出按钮
        const exportButton = document.createElement('button');
        exportButton.textContent = '导出报告';
        exportButton.className = 'export-button';
        exportButton.addEventListener('click', () => this._handleExport());
        this.exportButton = exportButton;
        exportButton.style.display = 'none';

        container.appendChild(statsSection);
        container.appendChild(chartSection);
        container.appendChild(exportButton);

        return container;
    }

    displayStats(analysisResult) {
        this.statsSection.innerHTML = '';

        const createStatCard = (label, value) => {
            const card = document.createElement('div');
            card.className = 'stat-card';
            
            const labelElem = document.createElement('div');
            labelElem.className = 'stat-label';
            labelElem.textContent = label;
            
            const valueElem = document.createElement('div');
            valueElem.className = 'stat-value';
            valueElem.textContent = value;
            
            card.appendChild(labelElem);
            card.appendChild(valueElem);
            return card;
        };

        // 显示基础统计信息
        const stats = [
            ['借阅频次', `${analysisResult.borrow_frequency} 次`],
            ['会员时长', analysisResult.total_duration],
            ['总阅读时长', `${analysisResult.total_reading_duration} 天`],
            ['图书总价值', `¥${analysisResult.total_price.toFixed(2)}`],
            ['最喜欢的作者', analysisResult.longest_author],
            ['最喜欢的类别', analysisResult.longest_category],
            ['借阅高峰期', `${analysisResult.borrow_peak} 月`],
            ['最常借阅的书', `${analysisResult.most_borrowed_book} (${analysisResult.most_borrowed_book_count}次)`],
            ['全勤月总数', `${analysisResult.total_full_attendance} 个月`]
        ];

        stats.forEach(([label, value]) => {
            this.statsSection.appendChild(createStatCard(label, value));
        });

        // 显示全勤月列表
        if (analysisResult.full_attendance.length > 0) {
            const fullAttendanceCard = document.createElement('div');
            fullAttendanceCard.className = 'stat-card full-attendance';
            
            const labelElem = document.createElement('div');
            labelElem.className = 'stat-label';
            labelElem.textContent = '全勤月份';
            
            const valueElem = document.createElement('div');
            valueElem.className = 'stat-value';
            valueElem.textContent = analysisResult.full_attendance.join(', ');
            
            fullAttendanceCard.appendChild(labelElem);
            fullAttendanceCard.appendChild(valueElem);
            this.statsSection.appendChild(fullAttendanceCard);
        }

        this.exportButton.style.display = 'block';
    }

    displayCharts(chartPaths) {
        this.chartSection.innerHTML = '';
        
        if (!chartPaths || Object.keys(chartPaths).length === 0) {
            const noChartsMsg = document.createElement('div');
            noChartsMsg.className = 'no-charts';
            noChartsMsg.textContent = '暂无图表数据';
            this.chartSection.appendChild(noChartsMsg);
            return;
        }

        // 创建图表标题
        const chartTitle = document.createElement('h3');
        chartTitle.textContent = '数据可视化';
        chartTitle.className = 'chart-title';
        this.chartSection.appendChild(chartTitle);

        // 显示图表（暂时显示路径，后续可以加载图片）
        Object.entries(chartPaths).forEach(([name, path]) => {
            const chartContainer = document.createElement('div');
            chartContainer.className = 'chart-container';
            
            const chartLabel = document.createElement('div');
            chartLabel.className = 'chart-label';
            chartLabel.textContent = this._getChartLabel(name);
            
            const chartPlaceholder = document.createElement('div');
            chartPlaceholder.className = 'chart-placeholder';
            chartPlaceholder.textContent = `图表已生成: ${path}`;
            
            chartContainer.appendChild(chartLabel);
            chartContainer.appendChild(chartPlaceholder);
            this.chartSection.appendChild(chartContainer);
        });
    }

    _getChartLabel(chartName) {
        const labels = {
            'duration': '阅读时长分布',
            'monthly': '月度借阅趋势',
            'category': '类别阅读比例'
        };
        return labels[chartName] || chartName;
    }

    _handleExport() {
        if (this.onExportReportCallback) {
            this.onExportReportCallback();
        }
    }

    onExportReport(callback) {
        this.onExportReportCallback = callback;
    }

    mount(parent) {
        parent.appendChild(this.element);
    }
}