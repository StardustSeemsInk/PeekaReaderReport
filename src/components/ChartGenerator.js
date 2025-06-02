// ChartGenerator 组件 - 使用全局类

class ChartGenerator {
    constructor() {
        this.charts = new InteractiveCharts();
        this.chartData = null;
    }

    // 从分析结果生成图表数据
    generateChartsFromAnalysis(analysisResult) {
        if (!analysisResult) {
            throw new Error('分析结果不能为空');
        }

        this.chartData = this.prepareChartData(analysisResult);
        this.renderAllCharts();
    }

    // 准备图表数据
    prepareChartData(analysisResult) {
        console.log('原始分析结果:', analysisResult);
        
        // 准备书籍借阅次数数据（前10名）
        const bookBorrowData = this.getTopBooks(analysisResult.book_borrow_counts, 10);
        console.log('处理后的书籍借阅数据:', bookBorrowData);
        
        // 准备月度借阅数据
        const monthlyBorrowData = analysisResult.monthly_borrow || {};
        console.log('月度借阅数据:', monthlyBorrowData);
        
        // 准备类别数据（从书籍借阅次数推算）
        const categoryData = this.calculateCategoryData(analysisResult);
        console.log('类别数据:', categoryData);

        const chartData = {
            bookBorrowCounts: bookBorrowData,
            monthlyBorrow: monthlyBorrowData,
            categoryDistribution: categoryData,
        };
        
        console.log('最终图表数据:', chartData);
        return chartData;
    }

    // 获取前N本热门书籍
    getTopBooks(bookCounts, topN = 10) {
        if (!bookCounts || typeof bookCounts !== 'object') {
            return {};
        }

        const sortedBooks = Object.entries(bookCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, topN);
        
        return Object.fromEntries(sortedBooks);
    }

    // 计算类别分布数据（模拟，因为Rust分析器暂未提供详细的类别统计）
    calculateCategoryData(analysisResult) {
        // 这里是一个简化的实现，真实情况下应该从Rust分析器获取详细的类别统计
        // 目前基于最频繁类别进行模拟
        const mockCategoryData = {};
        
        if (analysisResult.most_frequent_category) {
            // 模拟数据，实际应该从分析器获取完整的类别统计
            mockCategoryData[analysisResult.most_frequent_category] = Math.floor(analysisResult.borrow_frequency * 0.4);
            mockCategoryData['其他类别'] = Math.floor(analysisResult.borrow_frequency * 0.6);
        }
        
        return mockCategoryData;
    }

    // 渲染所有图表
    renderAllCharts() {
        if (!this.chartData) {
            console.error('没有图表数据可供渲染');
            return;
        }

        try {
            // 确保图表容器存在
            this.ensureChartContainers();

            // 渲染书籍借阅次数图表
            if (Object.keys(this.chartData.bookBorrowCounts).length > 0) {
                this.charts.createBookBorrowCountChart('bookBorrowChart', this.chartData.bookBorrowCounts);
            }

            // 渲染月度借阅趋势图表
            if (Object.keys(this.chartData.monthlyBorrow).length > 0) {
                this.charts.createMonthlyBorrowChart('monthlyBorrowChart', this.chartData.monthlyBorrow);
            }

            // 渲染类别分布饼图
            if (Object.keys(this.chartData.categoryDistribution).length > 0) {
                this.charts.createCategoryPieChart('categoryChart', this.chartData.categoryDistribution);
            }

            console.log('所有图表渲染完成');
        } catch (error) {
            console.error('渲染图表时发生错误:', error);
            throw error;
        }
    }

    // 确保图表容器存在
    ensureChartContainers() {
        const chartContainers = [
            { id: 'bookBorrowChart', title: '📚 热门书籍借阅次数排行' },
            { id: 'monthlyBorrowChart', title: '📈 月度借阅趋势' },
            { id: 'categoryChart', title: '🎯 图书类别分布' }
        ];

        let chartsContainer = document.getElementById('chartsContainer');
        if (!chartsContainer) {
            // 创建图表容器
            chartsContainer = document.createElement('div');
            chartsContainer.id = 'chartsContainer';
            chartsContainer.className = 'charts-container';
            
            // 插入到结果显示区域
            const resultDisplay = document.querySelector('.result-display');
            if (resultDisplay) {
                const statsCards = document.getElementById('statsCards');
                if (statsCards && statsCards.nextSibling) {
                    resultDisplay.insertBefore(chartsContainer, statsCards.nextSibling);
                } else {
                    resultDisplay.appendChild(chartsContainer);
                }
            }
        }

        // 清空现有内容
        chartsContainer.innerHTML = '';

        // 创建图表容器
        chartContainers.forEach(({ id, title }) => {
            const chartSection = document.createElement('div');
            chartSection.className = 'chart-section';
            chartSection.innerHTML = `
                <h3 class="chart-title">${title}</h3>
                <div class="chart-container">
                    <canvas id="${id}"></canvas>
                </div>
            `;
            chartsContainer.appendChild(chartSection);
        });
    }

    // 导出所有图表为PNG
    async exportChartsAsPNG(outputDir = null) {
        const chartIds = ['bookBorrowChart', 'monthlyBorrowChart', 'categoryChart'];
        const exportedPaths = [];

        for (const chartId of chartIds) {
            try {
                const filename = `${chartId}.png`;
                const dataUrl = this.charts.exportChartAsPNG(chartId, filename);
                
                if (outputDir) {
                    // 如果提供了输出目录，可以通过Tauri保存文件
                    // 这里需要调用后端API来保存文件
                    console.log(`图表 ${chartId} 已导出为: ${filename}`);
                } else {
                    // 浏览器下载
                    console.log(`图表 ${chartId} 已下载为: ${filename}`);
                }
                
                exportedPaths.push(filename);
            } catch (error) {
                console.error(`导出图表 ${chartId} 失败:`, error);
            }
        }

        return exportedPaths;
    }

    // 销毁所有图表
    destroyCharts() {
        this.charts.destroyAllCharts();
        const chartsContainer = document.getElementById('chartsContainer');
        if (chartsContainer) {
            chartsContainer.innerHTML = '';
        }
    }

    // 更新图表数据
    updateCharts(newAnalysisResult) {
        this.destroyCharts();
        this.generateChartsFromAnalysis(newAnalysisResult);
    }

    // 获取图表数据（用于调试）
    getChartData() {
        return this.chartData;
    }
}