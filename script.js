class FundGame {
    constructor() {
        this.funds = []; // 基金数据
        this.currentDate = new Date('2021-01-01');
        this.gamePhase = 'tutorial'; // tutorial, playing
        this.selectedFund = null;
        this.userPortfolio = []; // 用户投资组合历史
        this.remainingChanges = 3;
        this.currentYear = 2021;
        this.autoPlayInterval = null;
        this.chart = null;
        this.gameStartDate = new Date('2022-01-01'); // 正式游戏开始日期
        
        this.bindEvents();
        // 初始化图表，但不加载数据
        this.initChart();
    }

    initializeGame() {
        // 加载基金数据
        this.loadFundData();
    }

    loadFundData() {
        // 显示加载中提示
        document.getElementById('loading-indicator').style.display = 'flex';
        document.getElementById('load-data-btn').style.display = 'none';
        
        // 直接加载 funddata.json 文件
        fetch('funddata.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('无法加载基金数据文件');
                }
                return response.json();
            })
            .then(data => {
                // 处理加载的数据
                this.funds = data.map((fund, index) => {
                    // 确保日期格式正确
                    const processedData = fund.data.map(item => ({
                        date: typeof item.date === 'string' ? new Date(item.date) : item.date,
                        value: parseFloat(item.value),
                        weeklyReturn: item.weeklyReturn || 0
                    }));
                    
                    return {
                        id: index,
                        name: fund.name,
                        data: processedData
                    };
                });
                
                // 隐藏加载数据界面
                document.getElementById('loading-screen').style.display = 'none';
                
                // 显示游戏界面
                document.getElementById('game-container').style.display = 'block';
                
                // 初始化游戏界面
                this.populateFundSelector();
                this.updateUI();
                this.updateChart();
            })
            .catch(error => {
                // 隐藏加载提示
                document.getElementById('loading-indicator').style.display = 'none';
                document.getElementById('load-data-btn').style.display = 'block';
                
                // 显示错误信息
                document.getElementById('load-error').textContent = '加载基金数据失败: ' + error.message;
                document.getElementById('load-error').style.display = 'block';
                
                // 3秒后自动隐藏错误信息
                setTimeout(() => {
                    document.getElementById('load-error').style.display = 'none';
                }, 3000);
            });
    }

    populateFundSelector() {
        const selector = document.getElementById('fund-selector');
        if (!selector) {
            return;
        }
        
        // 清空现有选项
        selector.innerHTML = '<option value="">请选择基金产品</option>';
        
        this.funds.forEach((fund, index) => {
            const option = document.createElement('option');
            option.value = fund.id;
            option.textContent = fund.name;
            selector.appendChild(option);
        });
    }

    // 移除调试信息更新方法

    // 导出游戏数据
    exportGameData() {
        return {
            userPortfolio: this.userPortfolio,
            currentDate: this.currentDate,
            gamePhase: this.gamePhase,
            selectedFund: this.selectedFund,
            userStats: this.calculateUserStats()
        };
    }

    bindEvents() {
        document.getElementById('fund-selector').addEventListener('change', (e) => {
            const confirmBtn = document.getElementById('confirm-selection');
            confirmBtn.disabled = !e.target.value;
        });

        document.getElementById('confirm-selection').addEventListener('click', () => {
            this.selectFund();
        });

        document.getElementById('change-fund').addEventListener('click', () => {
            this.showFundSelector();
        });

        document.getElementById('next-week').addEventListener('click', () => {
            this.nextWeek();
        });

        document.getElementById('auto-play').addEventListener('click', () => {
            this.startAutoPlay();
        });

        document.getElementById('pause-auto').addEventListener('click', () => {
            this.stopAutoPlay();
        });

        document.getElementById('close-summary').addEventListener('click', () => {
            document.getElementById('year-summary-modal').style.display = 'none';
        });
    }

    selectFund() {
        const selector = document.getElementById('fund-selector');
        const fundId = parseInt(selector.value);
        
        if (fundId >= 0) {
            this.selectedFund = fundId;
            this.userPortfolio.push({
                date: new Date(this.currentDate),
                fundId: fundId,
                fundName: this.funds[fundId].name
            });
            
            document.getElementById('fund-selector').style.display = 'none';
            document.getElementById('confirm-selection').style.display = 'none';
            document.getElementById('change-fund').style.display = 'inline-block';
            
            this.updateChart();
            this.updateUI();
        }
    }

    showFundSelector() {
        if (this.remainingChanges > 0 || this.gamePhase === 'tutorial') {
            document.getElementById('fund-selector').style.display = 'block';
            document.getElementById('confirm-selection').style.display = 'inline-block';
            document.getElementById('change-fund').style.display = 'none';
            
            if (this.gamePhase !== 'tutorial') {
                this.remainingChanges--;
            }
        } else {
            alert('本年度调整机会已用完！');
        }
    }

    nextWeek() {
        this.currentDate.setDate(this.currentDate.getDate() + 7);
        
        // 检查是否到达数据最新日期
        const currentDataIndex = this.getCurrentDataIndex();
        if (currentDataIndex >= this.funds[0].data.length - 1) {
            this.stopAutoPlay(); // 停止自动播放
            this.showFinalSummary(); // 显示最终总结
            return; // 不再继续更新
        }
        
        // 检查是否需要显示年度总结
        if (this.currentDate.getMonth() === 11 && this.currentDate.getDate() >= 25) {
            this.showYearSummary();
        }
        
        // 检查是否进入新年
        if (this.currentDate.getFullYear() > this.currentYear) {
            this.currentYear = this.currentDate.getFullYear();
            
            if (this.currentYear === 2022) {
                this.gamePhase = 'playing';
                // 重置用户投资组合并归一化所有基金净值
                this.resetGameFor2022();
                alert('新手教学结束！现在开始正式游戏，每年有3次调整机会。所有产品净值已归一化重新开始。');
            }
            
            this.remainingChanges = 3;
            this.showFundSelector();
        }
        
        this.updateChart();
        this.updateUI();
        this.updateRanking();
    }
    
    // 显示最终总结
    showFinalSummary() {
        const summaryContent = document.getElementById('year-summary-content');
        const modal = document.getElementById('year-summary-modal');
        
        // 检测是否为移动设备
        const isMobile = window.innerWidth <= 768;
        
        // 计算用户最终表现
        const userStats = this.calculateUserStats();
        
        // 计算所有基金的最终表现
        const fundPerformance = this.funds.map(fund => {
            const startValue = fund.data[0].value;
            const endValue = fund.data[fund.data.length - 1].value;
            const totalReturn = (endValue - startValue) / startValue * 100;
            
            // 计算夏普比率和最大回撤
            const weeklyReturns = [];
            for (let i = 1; i < fund.data.length; i++) {
                const returnRate = (fund.data[i].value - fund.data[i - 1].value) / fund.data[i - 1].value;
                weeklyReturns.push(returnRate);
            }
            
            const avgReturn = weeklyReturns.reduce((sum, r) => sum + r, 0) / weeklyReturns.length;
            const variance = weeklyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / weeklyReturns.length;
            const volatility = Math.sqrt(variance * 52);
            const annualizedReturn = Math.pow(1 + avgReturn, 52) - 1;
            const sharpeRatio = (annualizedReturn - 0.03) / volatility;
            
            // 计算最大回撤
            let maxDrawdown = 0;
            let peak = fund.data[0].value;
            
            for (let i = 1; i < fund.data.length; i++) {
                if (fund.data[i].value > peak) {
                    peak = fund.data[i].value;
                } else {
                    const drawdown = (peak - fund.data[i].value) / peak;
                    maxDrawdown = Math.max(maxDrawdown, drawdown);
                }
            }
            
            return {
                name: fund.name,
                return: totalReturn,
                sharpeRatio: sharpeRatio,
                maxDrawdown: maxDrawdown * 100
            };
        });
        
        // 按收益率排序
        fundPerformance.sort((a, b) => b.return - a.return);
        
        // 生成用户排名
        let userRank = fundPerformance.length + 1;
        for (let i = 0; i < fundPerformance.length; i++) {
            if (userStats.totalReturn > fundPerformance[i].return) {
                userRank = i + 1;
                break;
            }
        }
        
        // 生成HTML内容 - 根据设备类型调整显示
        let summaryHTML = '<h4>投资挑战最终总结</h4>' +
            '<div class="year-stats">' +
                '<p><strong>您的最终表现：</strong></p>' +
                '<p>累计收益率: <span class="' + (userStats.totalReturn >= 0 ? 'positive' : 'negative') + '">' + 
                    userStats.totalReturn.toFixed(2) + '%</span></p>' +
                '<p>夏普比率: ' + userStats.sharpeRatio.toFixed(2) + '</p>' +
                '<p>最大回撤: <span class="negative">' + userStats.maxDrawdown.toFixed(2) + '%</span></p>' +
                '<p>波动率: ' + userStats.volatility.toFixed(2) + '%</p>' +
                '<p>您的排名: <strong>' + userRank + '/' + (fundPerformance.length + 1) + '</strong></p>' +
                '<h5>基金最终排行榜 TOP 10:</h5>';
        
        // 移动端使用更紧凑的布局
        if (isMobile) {
            // 移动端使用卡片式布局
            summaryHTML += '<div class="mobile-ranking-cards">';
            
            fundPerformance.slice(0, 10).forEach((fund, index) => {
                summaryHTML += 
                    '<div class="mobile-ranking-card">' +
                        '<div class="rank-number">' + (index + 1) + '</div>' +
                        '<div class="fund-name">' + fund.name + '</div>' +
                        '<div class="fund-stats">' +
                            '<div>收益: <span class="' + (fund.return >= 0 ? 'positive' : 'negative') + '">' + 
                                fund.return.toFixed(2) + '%</span></div>' +
                            '<div>夏普: ' + fund.sharpeRatio.toFixed(2) + '</div>' +
                            '<div>回撤: <span class="negative">' + fund.maxDrawdown.toFixed(2) + '%</span></div>' +
                        '</div>' +
                    '</div>';
            });
            
            summaryHTML += '</div>';
        } else {
            // 桌面端使用表格布局
            summaryHTML += '<table class="summary-table" style="width:100%; border-collapse: collapse; margin-top: 10px;">' +
                '<tr><th>排名</th><th>产品名称</th><th>累计收益</th><th>夏普比率</th><th>最大回撤</th></tr>';
            
            // 添加前10名基金
            fundPerformance.slice(0, 10).forEach((fund, index) => {
                summaryHTML += '<tr>' +
                    '<td>' + (index + 1) + '</td>' +
                    '<td>' + fund.name + '</td>' +
                    '<td class="' + (fund.return >= 0 ? 'positive' : 'negative') + '">' + fund.return.toFixed(2) + '%</td>' +
                    '<td>' + fund.sharpeRatio.toFixed(2) + '</td>' +
                    '<td class="negative">' + fund.maxDrawdown.toFixed(2) + '%</td>' +
                    '</tr>';
            });
            
            summaryHTML += '</table>';
        }
        
        summaryHTML += '<p style="margin-top: 20px; font-weight: bold;">恭喜您完成投资挑战！</p>' +
            '</div>';
        
        summaryContent.innerHTML = summaryHTML;
        modal.style.display = 'flex';
        
        // 修改按钮文本
        document.getElementById('close-summary').textContent = '完成挑战';
    }

    resetGameFor2022() {
        // 重置用户投资组合
        this.userPortfolio = [];
        this.selectedFund = null;
        
        // 找到2022年1月1日的数据索引
        const resetIndex = this.funds[0].data.findIndex(item => 
            item.date.getFullYear() === 2022 && item.date.getMonth() === 0
        );
        
        if (resetIndex !== -1) {
            // 归一化所有基金在2022年1月1日的净值为1.0
            this.funds.forEach(fund => {
                const resetValue = fund.data[resetIndex].value;
                // 从2022年开始重新计算净值
                for (let i = resetIndex; i < fund.data.length; i++) {
                    fund.data[i].value = fund.data[i].value / resetValue;
                }
            });
        }
    }

    startAutoPlay() {
        if (this.autoPlayInterval) return;
        
        this.autoPlayInterval = setInterval(() => {
            this.nextWeek();
        }, 1000); // 每秒前进一周
        
        document.getElementById('auto-play').disabled = true;
        document.getElementById('pause-auto').disabled = false;
    }

    stopAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
        
        document.getElementById('auto-play').disabled = false;
        document.getElementById('pause-auto').disabled = true;
    }

    initChart() {
        const ctx = document.getElementById('performance-chart');
        if (!ctx) {
            console.error('Chart canvas not found');
            return;
        }
        
        // 检测是否为移动设备
        const isMobile = window.innerWidth <= 768;
        const isSmallMobile = window.innerWidth <= 480;
        
        this.chart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0 // 完全禁用动画效果
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: !isSmallMobile, // 小屏幕不显示标题
                            text: '净值'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(3);
                            },
                            font: {
                                size: isMobile ? 10 : 12 // 移动端字体更小
                            }
                        }
                    },
                    x: {
                        title: {
                            display: !isSmallMobile, // 小屏幕不显示标题
                            text: '日期'
                        },
                        ticks: {
                            maxRotation: 90, // 移动端允许标签垂直旋转
                            minRotation: isMobile ? 45 : 0, // 移动端标签旋转45度
                            font: {
                                size: isMobile ? 8 : 12 // 移动端字体更小
                            },
                            callback: function(value, index, values) {
                                // 移动端只显示部分日期标签
                                if (isMobile) {
                                    const totalLabels = values.length;
                                    // 小屏幕手机显示更少的标签
                                    const skipFactor = isSmallMobile ? 8 : 4;
                                    return index % skipFactor === 0 ? this.getLabelForValue(value) : '';
                                }
                                return this.getLabelForValue(value);
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: isMobile ? 6 : 10,
                            font: {
                                size: isMobile ? 10 : 12
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        bodyFont: {
                            size: isMobile ? 10 : 14
                        },
                        titleFont: {
                            size: isMobile ? 12 : 16
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
        
        // 添加窗口大小变化监听，重新初始化图表
        window.addEventListener('resize', this.handleResize.bind(this));
    }
    
    // 处理窗口大小变化
    handleResize() {
        // 如果窗口大小变化较大，重新初始化图表
        if (this.chart) {
            this.chart.destroy();
            this.initChart();
            this.updateChart();
        }
    }

    generateColors(count) {
        const baseColors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
            '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
            '#A3E4D7', '#F9E79F', '#D5A6BD', '#AED6F1', '#A9DFBF',
            '#FAD7A0', '#E8DAEF', '#D1F2EB', '#FCF3CF', '#FADBD8',
            '#EBF5FB', '#E8F8F5', '#FEF9E7', '#FDF2E9', '#FDEBD0'
        ];
        
        const colors = [];
        for (let i = 0; i < count; i++) {
            if (i < baseColors.length) {
                colors.push(baseColors[i]);
            } else {
                const hue = (i * 137.5) % 360; // 黄金角度分布
                colors.push('hsl(' + hue + ', 65%, 55%)');
            }
        }
        return colors;
    }

    generatePointStyles(count) {
        const styles = ['circle', 'triangle', 'rect', 'rectRounded', 'rectRot', 'cross', 'crossRot', 'star', 'line', 'dash'];
        const pointStyles = [];
        
        for (let i = 0; i < count; i++) {
            pointStyles.push(styles[i % styles.length]);
        }
        return pointStyles;
    }

    generatePointColor(lineColor) {
        // 将线条颜色转换为更亮的数据点颜色
        if (lineColor.startsWith('#')) {
            const r = parseInt(lineColor.slice(1, 3), 16);
            const g = parseInt(lineColor.slice(3, 5), 16);
            const b = parseInt(lineColor.slice(5, 7), 16);
            
            // 增加亮度
            const newR = Math.min(255, r + 60);
            const newG = Math.min(255, g + 60);
            const newB = Math.min(255, b + 60);
            
            return 'rgb(' + newR + ', ' + newG + ', ' + newB + ')';
        }
        return lineColor;
    }

    updateChart() {
        if (!this.chart) return;
        
        const currentDataIndex = this.getCurrentDataIndex();
        const labels = [];
        const datasets = [];
        
        // 生成颜色和形状数组
        const colors = this.generateColors(this.funds.length + 1);
        const pointStyles = this.generatePointStyles(this.funds.length + 1);
        
        // 收集所有数据值以计算范围
        let allValues = [];
        
        // 确定显示的起始索引
        let startIndex = 0;
        if (this.gamePhase === 'playing') {
            // 正式游戏阶段只显示2022年以后的数据
            startIndex = this.funds[0].data.findIndex(item => 
                item.date.getFullYear() === 2022 && item.date.getMonth() === 0
            );
            if (startIndex === -1) startIndex = 0;
        }
        
        // 添加所有基金数据
        this.funds.forEach((fund, index) => {
            const data = fund.data.slice(startIndex, currentDataIndex + 1).map(item => item.value);
            allValues.push(...data);
            
            // 为数据点生成不同的颜色
            const pointColor = this.generatePointColor(colors[index]);
            
            datasets.push({
                label: fund.name,
                data: data,
                borderColor: colors[index],
                backgroundColor: colors[index] + '20',
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 7,
                pointBackgroundColor: pointColor,
                pointBorderColor: colors[index],
                pointBorderWidth: 2,
                pointStyle: pointStyles[index]
            });
        });
        
        // 添加用户投资组合数据
        if (this.selectedFund !== null) {
            const userPortfolioData = this.calculateUserPortfolioValue();
            const displayData = userPortfolioData.slice(startIndex);
            const validUserData = displayData.filter(val => val !== null && val !== undefined);
            if (validUserData.length > 0) {
                allValues.push(...validUserData);
            }
            
            datasets.push({
                label: '您的投资组合',
                data: displayData,
                borderColor: '#e74c3c',
                backgroundColor: '#e74c3c20',
                borderWidth: 6, // 加粗用户投资组合线条
                pointRadius: 6,
                pointHoverRadius: 10,
                pointBackgroundColor: '#c0392b',
                pointBorderColor: '#e74c3c',
                pointBorderWidth: 3,
                pointStyle: 'star'
            });
        }
        
        // 计算动态Y轴范围，根据当前显示的数据调整
        if (allValues.length > 0) {
            // 计算当前显示数据的统计信息
            const minValue = Math.min(...allValues);
            const maxValue = Math.max(...allValues);
            const avgValue = allValues.reduce((sum, val) => sum + val, 0) / allValues.length;
            const stdDev = Math.sqrt(
                allValues.reduce((sum, val) => sum + Math.pow(val - avgValue, 2), 0) / allValues.length
            );
            
            // 根据数据分布情况动态调整边距
            // 如果数据分散程度大，使用较小的边距；如果数据集中，使用较大的边距
            const variationCoeff = stdDev / avgValue; // 变异系数
            const paddingFactor = Math.max(0.05, Math.min(0.2, 0.1 / variationCoeff)); // 根据变异系数调整边距因子
            
            const range = maxValue - minValue;
            const padding = range * paddingFactor;
            
            // 设置Y轴范围，确保最小值不小于0
            const newMin = Math.max(0, minValue - padding);
            const newMax = maxValue + padding;
            
            // 更新图表Y轴范围
            this.chart.options.scales.y.min = newMin;
            this.chart.options.scales.y.max = newMax;
        }
        
        // 生成标签
        if (this.funds.length > 0) {
            labels.push(...this.funds[0].data.slice(startIndex, currentDataIndex + 1).map(item => 
                item.date.toLocaleDateString('zh-CN')
            ));
        }
        
        this.chart.data.labels = labels;
        this.chart.data.datasets = datasets;
        this.chart.update();
    }

    getCurrentDataIndex() {
        if (this.funds.length === 0) return 0;
        
        const index = this.funds[0].data.findIndex(item => 
            item.date > this.currentDate
        );
        
        // 如果没有找到大于当前日期的数据点，说明已经到达数据末尾
        if (index === -1) {
            return this.funds[0].data.length - 1;
        }
        
        return index - 1;
    }

    calculateUserPortfolioValue() {
        if (this.userPortfolio.length === 0) return [];
        
        const currentDataIndex = this.getCurrentDataIndex();
        const portfolioValues = [];
        let currentValue = 1.0;
        let currentFundId = this.userPortfolio[0].fundId;
        
        // 如果是正式游戏阶段，从2022年开始计算
        let startIndex = 0;
        if (this.gamePhase === 'playing') {
            startIndex = this.funds[0].data.findIndex(item => 
                item.date.getFullYear() === 2022 && item.date.getMonth() === 0
            );
            if (startIndex === -1) startIndex = 0;
        }
        
        for (let i = 0; i <= currentDataIndex; i++) {
            const currentDate = this.funds[0].data[i].date;
            
            // 检查是否有基金变更
            const change = this.userPortfolio.find(p => 
                p.date.getTime() === currentDate.getTime()
            );
            
            if (change) {
                currentFundId = change.fundId;
            }
            
            if (i > startIndex && currentFundId !== null) {
                const fund = this.funds[currentFundId];
                const prevValue = fund.data[i - 1].value;
                const currentFundValue = fund.data[i].value;
                const returnRate = (currentFundValue - prevValue) / prevValue;
                currentValue *= (1 + returnRate);
            }
            
            // 在正式游戏开始前，用户组合值为空
            if (this.gamePhase === 'playing' && i < startIndex) {
                portfolioValues.push(null);
            } else {
                portfolioValues.push(currentValue);
            }
        }
        
        return portfolioValues;
    }

    calculateUserStats() {
        const portfolioValues = this.calculateUserPortfolioValue();
        const validValues = portfolioValues.filter(val => val !== null && val !== undefined);
        
        if (validValues.length < 2) {
            return {
                totalReturn: 0,
                sharpeRatio: 0,
                maxDrawdown: 0,
                volatility: 0
            };
        }
        
        const totalReturn = (validValues[validValues.length - 1] - 1) * 100;
        
        // 计算周收益率
        const weeklyReturns = [];
        for (let i = 1; i < validValues.length; i++) {
            const returnRate = (validValues[i] - validValues[i - 1]) / validValues[i - 1];
            weeklyReturns.push(returnRate);
        }
        
        // 计算波动率（年化）
        const avgReturn = weeklyReturns.reduce((sum, r) => sum + r, 0) / weeklyReturns.length;
        const variance = weeklyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / weeklyReturns.length;
        const volatility = Math.sqrt(variance * 52) * 100; // 年化波动率
        
        // 计算夏普比率（假设无风险利率为3%）
        const annualizedReturn = Math.pow(1 + avgReturn, 52) - 1;
        const sharpeRatio = (annualizedReturn - 0.03) / (volatility / 100);
        
        // 计算最大回撤
        let maxDrawdown = 0;
        let peak = validValues[0];
        
        for (let i = 1; i < validValues.length; i++) {
            if (validValues[i] > peak) {
                peak = validValues[i];
            } else {
                const drawdown = (peak - validValues[i]) / peak;
                maxDrawdown = Math.max(maxDrawdown, drawdown);
            }
        }
        
        return {
            totalReturn: totalReturn,
            sharpeRatio: sharpeRatio,
            maxDrawdown: maxDrawdown * 100,
            volatility: volatility
        };
    }

    updateUI() {
        document.getElementById('current-date').textContent = this.currentDate.toLocaleDateString('zh-CN');
        document.getElementById('game-phase').textContent = this.gamePhase === 'tutorial' ? '新手教学' : '正式游戏';
        document.getElementById('remaining-changes').textContent = '调整机会: ' + this.remainingChanges + '次';
        
        // 更新用户统计
        const stats = this.calculateUserStats();
        document.getElementById('total-return').textContent = stats.totalReturn.toFixed(2) + '%';
        document.getElementById('total-return').className = stats.totalReturn >= 0 ? 'positive' : 'negative';
        
        document.getElementById('sharpe-ratio').textContent = stats.sharpeRatio.toFixed(2);
        document.getElementById('max-drawdown').textContent = stats.maxDrawdown.toFixed(2) + '%';
        document.getElementById('volatility').textContent = stats.volatility.toFixed(2) + '%';
    }

    updateRanking() {
        const currentDataIndex = this.getCurrentDataIndex();
        if (currentDataIndex < 0) return;
        
        const rankings = this.funds.map(fund => {
            const currentValue = fund.data[currentDataIndex].value;
            const totalReturn = (currentValue - 1) * 100;
            
            // 计算基金统计数据
            const weeklyReturns = [];
            for (let i = 1; i <= currentDataIndex; i++) {
                const returnRate = (fund.data[i].value - fund.data[i - 1].value) / fund.data[i - 1].value;
                weeklyReturns.push(returnRate);
            }
            
            const avgReturn = weeklyReturns.reduce((sum, r) => sum + r, 0) / weeklyReturns.length;
            const variance = weeklyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / weeklyReturns.length;
            const volatility = Math.sqrt(variance * 52);
            const annualizedReturn = Math.pow(1 + avgReturn, 52) - 1;
            const sharpeRatio = (annualizedReturn - 0.03) / volatility;
            
            // 计算最大回撤
            let maxDrawdown = 0;
            let peak = fund.data[0].value;
            
            for (let i = 1; i <= currentDataIndex; i++) {
                if (fund.data[i].value > peak) {
                    peak = fund.data[i].value;
                } else {
                    const drawdown = (peak - fund.data[i].value) / peak;
                    maxDrawdown = Math.max(maxDrawdown, drawdown);
                }
            }
            
            return {
                id: fund.id,
                name: fund.name,
                totalReturn: totalReturn,
                currentReturn: weeklyReturns[weeklyReturns.length - 1] * 100,
                sharpeRatio: sharpeRatio,
                maxDrawdown: maxDrawdown * 100
            };
        });
        
        // 按总收益率排序
        rankings.sort((a, b) => b.totalReturn - a.totalReturn);
        
        // 添加用户投资组合到排名中
        if (this.selectedFund !== null) {
            const userStats = this.calculateUserStats();
            const userRanking = {
                id: 'user',
                name: '您的投资组合',
                totalReturn: userStats.totalReturn,
                currentReturn: 0, // 当期收益需要单独计算
                sharpeRatio: userStats.sharpeRatio,
                maxDrawdown: userStats.maxDrawdown
            };
            
            rankings.push(userRanking);
            rankings.sort((a, b) => b.totalReturn - a.totalReturn);
        }
        
        // 更新排名表格
        const tbody = document.querySelector('#ranking-table tbody');
        tbody.innerHTML = '';
        
        rankings.forEach((item, index) => {
            const row = document.createElement('tr');
            if (item.id === 'user') {
                row.className = 'user-row';
            }
            
            row.innerHTML = '<td>' + (index + 1) + '</td>' +
                '<td>' + item.name + '</td>' +
                '<td class="' + (item.currentReturn >= 0 ? 'positive' : 'negative') + '">' +
                    item.currentReturn.toFixed(2) + '%' +
                '</td>' +
                '<td class="' + (item.totalReturn >= 0 ? 'positive' : 'negative') + '">' +
                    item.totalReturn.toFixed(2) + '%' +
                '</td>' +
                '<td>' + item.sharpeRatio.toFixed(2) + '</td>' +
                '<td class="negative">' + item.maxDrawdown.toFixed(2) + '%</td>';
            
            tbody.appendChild(row);
        });
    }

    showYearSummary() {
        const year = this.currentYear;
        const summaryContent = document.getElementById('year-summary-content');
        
        // 计算年度统计
        const yearStartIndex = this.funds[0].data.findIndex(item => 
            item.date.getFullYear() === year && item.date.getMonth() === 0
        );
        const yearEndIndex = this.getCurrentDataIndex();
        
        if (yearStartIndex === -1 || yearEndIndex === -1) return;
        
        // 计算所有基金年度表现
        const yearlyPerformance = this.funds.map(fund => {
            const startValue = fund.data[yearStartIndex].value;
            const endValue = fund.data[yearEndIndex].value;
            const yearlyReturn = (endValue - startValue) / startValue * 100;
            
            return {
                name: fund.name,
                return: yearlyReturn
            };
        });
        
        yearlyPerformance.sort((a, b) => b.return - a.return);
        
        // 计算用户年度表现
        const userStats = this.calculateUserStats();
        
        let summaryHTML = '<h4>' + year + '年度投资总结</h4>' +
            '<div class="year-stats">' +
                '<p><strong>您的年度表现：</strong></p>' +
                '<p>累计收益率: <span class="' + (userStats.totalReturn >= 0 ? 'positive' : 'negative') + '">' + userStats.totalReturn.toFixed(2) + '%</span></p>' +
                '<p>夏普比率: ' + userStats.sharpeRatio.toFixed(2) + '</p>' +
                '<p>最大回撤: <span class="negative">' + userStats.maxDrawdown.toFixed(2) + '%</span></p>' +
                '<h5>基金年度排行榜 TOP 10:</h5>' +
                '<ol>';
        
        yearlyPerformance.slice(0, 10).forEach(fund => {
            summaryHTML += '<li>' + fund.name + ': <span class="' + (fund.return >= 0 ? 'positive' : 'negative') + '">' + fund.return.toFixed(2) + '%</span></li>';
        });
        
        summaryHTML += '</ol></div>';
        
        summaryContent.innerHTML = summaryHTML;
        document.getElementById('year-summary-modal').style.display = 'flex';
    }
}

// 确保页面可以正常滚动
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        history.scrollRestoration = 'auto';
        document.body.style.overflow = 'auto';
    }, 100);
});
