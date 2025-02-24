class ChartManager {
    static createPriceChart(containerId, data) {
        try {
            const ctx = document.getElementById(containerId).getContext('2d');
            if (!ctx) {
                console.error('Could not get context from canvas');
                return null;
            }
            
            if (!data || Object.keys(data).length === 0) {
                console.error('No data provided for chart');
                return null;
            }

            // Clear any existing chart
            if (currentChart) {
                currentChart.destroy();
            }

            currentChartData = data;
            
            const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
            const textColor = isDarkMode ? '#ecf0f1' : '#2c3e50';
            
            // Prepare data
            const dates = Object.keys(data).slice(0, 30).reverse();
            const prices = dates.map(date => ({
                date: date,
                open: parseFloat(data[date]['1. open']),
                high: parseFloat(data[date]['2. high']),
                low: parseFloat(data[date]['3. low']),
                close: parseFloat(data[date]['4. close']),
                volume: parseFloat(data[date]['5. volume'])
            }));

            console.log('Processed price data:', prices); // Debug log

            // Calculate moving averages
            const closePrices = prices.map(p => p.close);
            const sma20 = this.calculateSMA(closePrices, 20);
            const sma50 = this.calculateSMA(closePrices, 50);

            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [
                        {
                            label: 'Price',
                            data: closePrices,
                            borderColor: '#3498db',
                            backgroundColor: 'rgba(52, 152, 219, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4,
                            yAxisID: 'y'
                        },
                        {
                            label: '20-day SMA',
                            data: sma20,
                            borderColor: '#f39c12',
                            borderWidth: 1.5,
                            borderDash: [5, 5],
                            pointRadius: 0,
                            fill: false,
                            yAxisID: 'y'
                        },
                        {
                            label: '50-day SMA',
                            data: sma50,
                            borderColor: '#9b59b6',
                            borderWidth: 1.5,
                            borderDash: [5, 5],
                            pointRadius: 0,
                            fill: false,
                            yAxisID: 'y'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: textColor,
                                maxRotation: 45,
                                maxTicksLimit: 10
                            }
                        },
                        y: {
                            position: 'right',
                            grid: {
                                color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                            },
                            ticks: {
                                color: textColor,
                                callback: function(value) {
                                    return '₹' + value.toLocaleString('en-IN');
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                color: textColor,
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: isDarkMode ? '#2c3e50' : 'rgba(255, 255, 255, 0.9)',
                            titleColor: isDarkMode ? '#ecf0f1' : '#2c3e50',
                            bodyColor: isDarkMode ? '#ecf0f1' : '#2c3e50',
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    label += '₹' + context.parsed.y.toLocaleString('en-IN', {
                                        maximumFractionDigits: 2
                                    });
                                    return label;
                                }
                            }
                        }
                    }
                }
            });

            return chart;
        } catch (error) {
            console.error('Error creating chart:', error);
            return null;
        }
    }

    static calculateSMA(data, period) {
        const sma = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                sma.push(null);
                continue;
            }
            const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            sma.push(sum / period);
        }
        return sma;
    }

    static formatVolume(value) {
        if (value >= 10000000) return (value / 10000000).toFixed(2) + ' Cr';
        if (value >= 100000) return (value / 100000).toFixed(2) + ' L';
        if (value >= 1000) return (value / 1000).toFixed(2) + ' K';
        return value.toString();
    }
} 