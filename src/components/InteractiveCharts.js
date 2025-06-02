// Chart.js 通过 CDN 加载，使用全局 Chart 对象

class InteractiveCharts {
    constructor() {
        this.charts = new Map();
    }
    
    // 替代matplotlib的静态图表，提供更好的交互体验
    createBookDurationChart(containerId, data) {
        const ctx = document.getElementById(containerId).getContext('2d');
        
        // 确保销毁之前的图表
        if (this.charts.has(containerId)) {
            this.charts.get(containerId).destroy();
        }
        
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    label: '阅读时长 (天)',
                    data: Object.values(data),
                    backgroundColor: 'rgba(54, 162, 235, 0.8)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                return '书名: ' + context[0].label;
                            },
                            label: function(context) {
                                return '阅读时长: ' + context.raw + ' 天';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '天数'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '书名'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 0
                        }
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const bookName = Object.keys(data)[index];
                        const duration = Object.values(data)[index];
                        alert(`书名: ${bookName}\n阅读时长: ${duration} 天`);
                    }
                }
            }
        });
        
        this.charts.set(containerId, chart);
        return chart;
    }
    
    createMonthlyBorrowChart(containerId, data) {
        const ctx = document.getElementById(containerId).getContext('2d');
        
        // 确保销毁之前的图表
        if (this.charts.has(containerId)) {
            this.charts.get(containerId).destroy();
        }
        
        // 按年月排序
        const sortedEntries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedEntries.map(([month]) => month),
                datasets: [{
                    label: '借阅次数',
                    data: sortedEntries.map(([, count]) => count),
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                return '月份: ' + context[0].label;
                            },
                            label: function(context) {
                                return '借阅次数: ' + context.raw + ' 本';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '借阅次数'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '月份'
                        }
                    }
                },
                elements: {
                    point: {
                        radius: 5,
                        hoverRadius: 8
                    }
                }
            }
        });
        
        this.charts.set(containerId, chart);
        return chart;
    }
    
    createCategoryPieChart(containerId, data) {
        const ctx = document.getElementById(containerId).getContext('2d');
        
        // 确保销毁之前的图表
        if (this.charts.has(containerId)) {
            this.charts.get(containerId).destroy();
        }
        
        // 生成颜色调色板
        const colors = [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 205, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(199, 199, 199, 0.8)',
            'rgba(83, 102, 255, 0.8)',
            'rgba(255, 99, 255, 0.8)',
            'rgba(99, 255, 132, 0.8)'
        ];
        
        const chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    data: Object.values(data),
                    backgroundColor: colors,
                    borderColor: colors.map(color => color.replace('0.8', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} 本 (${percentage}%)`;
                            }
                        }
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const category = Object.keys(data)[index];
                        const count = Object.values(data)[index];
                        const total = Object.values(data).reduce((a, b) => a + b, 0);
                        const percentage = ((count / total) * 100).toFixed(1);
                        alert(`类别: ${category}\n借阅数量: ${count} 本\n占比: ${percentage}%`);
                    }
                }
            }
        });
        
        this.charts.set(containerId, chart);
        return chart;
    }
    
    // 创建借阅次数排行榜
    createBookBorrowCountChart(containerId, data) {
        const ctx = document.getElementById(containerId).getContext('2d');
        
        // 确保销毁之前的图表
        if (this.charts.has(containerId)) {
            this.charts.get(containerId).destroy();
        }
        
        // 取前10本书
        const sortedEntries = Object.entries(data)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);
        
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedEntries.map(([book]) => book),
                datasets: [{
                    label: '借阅次数',
                    data: sortedEntries.map(([, count]) => count),
                    backgroundColor: 'rgba(255, 159, 64, 0.8)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y', // 这使得条形图变为水平
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return '书名: ' + context[0].label;
                            },
                            label: function(context) {
                                return '借阅次数: ' + context.raw + ' 次';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '借阅次数'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '书名'
                        }
                    }
                }
            }
        });
        
        this.charts.set(containerId, chart);
        return chart;
    }
    
    // 图表导出功能
    exportChartAsPNG(chartId, filename = 'chart.png') {
        const chart = this.charts.get(chartId);
        if (!chart) {
            throw new Error(`找不到ID为 ${chartId} 的图表`);
        }
        
        const canvas = chart.canvas;
        const url = canvas.toDataURL('image/png');
        
        // 创建下载链接
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return url;
    }
    
    // 销毁所有图表
    destroyAllCharts() {
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
    }
    
    // 销毁指定图表
    destroyChart(chartId) {
        const chart = this.charts.get(chartId);
        if (chart) {
            chart.destroy();
            this.charts.delete(chartId);
        }
    }
    
    // 更新图表数据
    updateChartData(chartId, newData) {
        const chart = this.charts.get(chartId);
        if (!chart) {
            throw new Error(`找不到ID为 ${chartId} 的图表`);
        }
        
        chart.data.labels = Object.keys(newData);
        chart.data.datasets[0].data = Object.values(newData);
        chart.update();
    }
}