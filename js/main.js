let currentChart = null;
let currentChartData = null;
let currentTimeSeries = null;
let searchTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchStock');

    // Add input event listener for search autocomplete
    searchInput.addEventListener('input', handleSearchInput);

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        const searchResults = document.getElementById('searchResults');
        const searchContainer = document.querySelector('.search-input-container');
        
        if (!searchContainer.contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });

    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // Theme toggle functionality
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', toggleTheme);

    // Initialize theme from localStorage or default to light
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    // Load initial market data
    loadMarketData();

    const predictionMethod = document.getElementById('predictionMethod');
    const updatePredictionBtn = document.getElementById('updatePrediction');

    // Disable update button initially
    updatePredictionBtn.disabled = true;

    predictionMethod.addEventListener('change', () => {
        const selectedMethod = predictionMethod.value;
        updatePredictionBtn.disabled = !selectedMethod;

        if (currentTimeSeries) {
            if (selectedMethod) {
                predictStockTrend(currentTimeSeries, selectedMethod);
            } else {
                clearPrediction();
            }
        }
        updateMethodDescription(selectedMethod);
    });

    updatePredictionBtn.addEventListener('click', () => {
        if (currentTimeSeries) {
            predictStockTrend(currentTimeSeries, predictionMethod.value);
        }
    });

    // Initialize method description
    updateMethodDescription(predictionMethod.value);
});

async function handleSearchInput(e) {
    const searchTerm = e.target.value.trim();
    const searchResults = document.getElementById('searchResults');

    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }

    // Clear results if search term is empty
    if (!searchTerm) {
        searchResults.classList.remove('active');
        return;
    }

    // Add debounce to prevent too many API calls
    searchTimeout = setTimeout(async () => {
        try {
            const results = await StockAPI.searchStocks(searchTerm);
            displaySearchResults(results);
        } catch (error) {
            console.error('Error searching stocks:', error);
        }
    }, 300);
}

function displaySearchResults(results) {
    const searchResults = document.getElementById('searchResults');
    
    if (!results || results.length === 0) {
        searchResults.classList.remove('active');
        return;
    }

    searchResults.innerHTML = results.map(stock => `
        <div class="search-result-item" data-symbol="${stock['1. symbol']}" onclick="selectStock(this)">
            <div class="stock-name">${stock['2. name']}</div>
            <div class="stock-symbol">${stock['1. symbol']}</div>
        </div>
    `).join('');

    searchResults.classList.add('active');
}

function selectStock(element) {
    const symbol = element.dataset.symbol;
    const searchInput = document.getElementById('searchStock');
    const searchResults = document.getElementById('searchResults');

    // Update input value and close dropdown
    searchInput.value = symbol;
    searchResults.classList.remove('active');

    // Trigger search
    handleSearch();
}

async function handleSearch() {
    const searchInput = document.getElementById('searchStock');
    const symbol = searchInput.value.trim();
    
    if (!symbol) return;

    const stockDetails = document.querySelector('.stock-details');
    stockDetails.classList.remove('hidden');

    await loadStockData(symbol);
}

async function loadMarketData() {
    try {
        // Load NIFTY 50 data
        const niftyData = await StockAPI.getStockQuote('^NSEI');
        updateIndexCard('nifty', niftyData);

        // Load SENSEX data
        const sensexData = await StockAPI.getStockQuote('^BSESN');
        updateIndexCard('sensex', sensexData);

        // Load top gainers and losers
        const moversData = await StockAPI.getTopMovers();
        if (moversData) {
            updateTopMovers(moversData);
        }

        // Refresh data every 5 minutes
        setTimeout(loadMarketData, 300000);
    } catch (error) {
        console.error('Error loading market data:', error);
    }
}

async function loadStockData(symbol) {
    try {
        console.log('Loading stock data for:', symbol);
        
        // Show loading state
        const stockChart = document.getElementById('stockChart');
        stockChart.innerHTML = '<canvas id="priceChart"></canvas>';
        stockChart.classList.add('loading');

        const quote = await StockAPI.getStockQuote(symbol);
        const timeSeries = await StockAPI.getStockTimeSeries(symbol);

        console.log('Quote data:', quote);
        console.log('Time series data:', timeSeries);

        // Remove loading state
        stockChart.classList.remove('loading');

        if (quote && timeSeries) {
            currentTimeSeries = timeSeries;
            updateStockInfo(quote);
            
            // Create new chart
            if (currentChart) {
                currentChart.destroy();
            }
            currentChart = ChartManager.createPriceChart('priceChart', timeSeries);
            
            // Update prediction if method is selected
            const method = document.getElementById('predictionMethod').value;
            if (method) {
                predictStockTrend(timeSeries, method);
            } else {
                clearPrediction();
            }
        } else {
            console.error('Failed to load stock data');
            stockChart.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    Failed to load stock data. Please try again.
                </div>
            `;
        }
    } catch (error) {
        console.error('Error in loadStockData:', error);
        const stockChart = document.getElementById('stockChart');
        stockChart.classList.remove('loading');
        stockChart.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                An error occurred while loading the data.
            </div>
        `;
    }
}

function updateIndexCard(elementId, data) {
    const element = document.getElementById(elementId);
    if (!data) {
        element.querySelector('.price').textContent = 'Data unavailable';
        element.querySelector('.change').textContent = '';
        return;
    }

    const price = element.querySelector('.price');
    const change = element.querySelector('.change');

    const priceValue = parseFloat(data['05. price']);
    const changePercent = parseFloat(data['10. change percent']);

    price.textContent = `₹${priceValue.toLocaleString('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    })}`;
    
    change.textContent = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
    change.style.color = changePercent >= 0 ? '#00897b' : '#e53935';
}

function updateStockInfo(quote) {
    const stockHeader = document.getElementById('stockHeader');
    const stockPrice = document.getElementById('stockPrice');

    stockHeader.innerHTML = `
        <h3>${quote['01. symbol']}</h3>
        <p>Last Updated: ${quote['07. latest trading day']}</p>
    `;

    const price = parseFloat(quote['05. price']);
    const change = parseFloat(quote['09. change']);
    const changePercent = parseFloat(quote['10. change percent']);
    const isPositive = change >= 0;

    stockPrice.innerHTML = `
        <div class="price-container">
            <h4>₹${price.toLocaleString('en-IN', {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2
            })}</h4>
            <div class="change-container">
                <p class="change" style="color: ${isPositive ? 'var(--success-color)' : 'var(--danger-color)'}">
                    ${isPositive ? '+' : ''}${change.toFixed(2)}
                </p>
                <p class="change-percent" style="color: ${isPositive ? 'var(--success-color)' : 'var(--danger-color)'}">
                    (${isPositive ? '+' : ''}${changePercent.toFixed(2)}%)
                </p>
            </div>
        </div>
    `;
}

function updateStockChart(timeSeries) {
    if (currentChart) {
        currentChart.destroy();
    }
    currentChart = ChartManager.createPriceChart('priceChart', timeSeries);
}

function predictStockTrend(timeSeries, method = 'sma') {
    const prices = Object.values(timeSeries).slice(0, 30).map(day => parseFloat(day['4. close'])).reverse();
    const volumes = Object.values(timeSeries).slice(0, 30).map(day => parseFloat(day['5. volume'])).reverse();
    
    let prediction = '';
    let details = '';
    let metrics = [];

    switch (method) {
        case 'sma':
            const smaResult = predictUsingSMA(prices);
            prediction = smaResult.trend;
            details = smaResult.details;
            metrics = smaResult.metrics;
            break;

        case 'ema':
            const emaResult = predictUsingEMA(prices);
            prediction = emaResult.trend;
            details = emaResult.details;
            metrics = emaResult.metrics;
            break;

        case 'rsi':
            const rsiResult = predictUsingRSI(prices);
            prediction = rsiResult.trend;
            details = rsiResult.details;
            metrics = rsiResult.metrics;
            break;

        case 'macd':
            const macdResult = predictUsingMACD(prices);
            prediction = macdResult.trend;
            details = macdResult.details;
            metrics = macdResult.metrics;
            break;
    }

    const predictionElement = document.getElementById('prediction');
    predictionElement.innerHTML = `
        <h3>Trend Prediction</h3>
        <div class="prediction-details">
            <p>Based on ${method.toUpperCase()} analysis, the stock shows a <strong>${prediction}</strong> trend</p>
            <p>${details}</p>
        </div>
        <div class="prediction-metrics">
            ${metrics.map(metric => `
                <div class="metric-card">
                    <div class="metric-name">${metric.name}</div>
                    <div class="value">${metric.value}</div>
                    <div class="description">${metric.description}</div>
                </div>
            `).join('')}
        </div>
        <p class="disclaimer">* This is a technical analysis prediction and should not be used as financial advice</p>
    `;
}

function predictUsingSMA(prices) {
    const shortPeriod = 10;
    const longPeriod = 20;
    
    const shortSMA = calculateSMA(prices, shortPeriod);
    const longSMA = calculateSMA(prices, longPeriod);
    
    const trend = shortSMA > longSMA ? 'Upward' : 'Downward';
    const strength = Math.abs(shortSMA - longSMA) / longSMA * 100;

    return {
        trend,
        details: `The ${shortPeriod}-day SMA is ${shortSMA.toFixed(2)} and the ${longPeriod}-day SMA is ${longSMA.toFixed(2)}`,
        metrics: [
            {
                name: 'Short-term SMA',
                value: shortSMA.toFixed(2),
                description: `${shortPeriod}-day moving average`
            },
            {
                name: 'Long-term SMA',
                value: longSMA.toFixed(2),
                description: `${longPeriod}-day moving average`
            },
            {
                name: 'Trend Strength',
                value: `${strength.toFixed(2)}%`,
                description: 'Difference between SMAs'
            }
        ]
    };
}

function predictUsingEMA(prices) {
    const shortPeriod = 12;
    const longPeriod = 26;
    
    const shortEMA = calculateEMA(prices, shortPeriod);
    const longEMA = calculateEMA(prices, longPeriod);
    
    const trend = shortEMA > longEMA ? 'Upward' : 'Downward';
    const strength = Math.abs(shortEMA - longEMA) / longEMA * 100;

    return {
        trend,
        details: `The ${shortPeriod}-day EMA is ${shortEMA.toFixed(2)} and the ${longPeriod}-day EMA is ${longEMA.toFixed(2)}`,
        metrics: [
            {
                name: 'Short-term EMA',
                value: shortEMA.toFixed(2),
                description: `${shortPeriod}-day exponential average`
            },
            {
                name: 'Long-term EMA',
                value: longEMA.toFixed(2),
                description: `${longPeriod}-day exponential average`
            },
            {
                name: 'Trend Strength',
                value: `${strength.toFixed(2)}%`,
                description: 'Difference between EMAs'
            }
        ]
    };
}

function predictUsingRSI(prices) {
    const period = 14;
    const rsi = calculateRSI(prices, period);
    let trend = 'Neutral';
    
    if (rsi >= 70) trend = 'Downward (Overbought)';
    else if (rsi <= 30) trend = 'Upward (Oversold)';
    else trend = rsi > 50 ? 'Slightly Upward' : 'Slightly Downward';

    return {
        trend,
        details: `The ${period}-day RSI value is ${rsi.toFixed(2)}`,
        metrics: [
            {
                name: 'RSI Value',
                value: rsi.toFixed(2),
                description: `${period}-day relative strength`
            },
            {
                name: 'Overbought Level',
                value: '70',
                description: 'Upper threshold'
            },
            {
                name: 'Oversold Level',
                value: '30',
                description: 'Lower threshold'
            }
        ]
    };
}

function predictUsingMACD(prices) {
    const { macd, signal, histogram } = calculateMACD(prices);
    const trend = macd > signal ? 'Upward' : 'Downward';
    const strength = Math.abs(histogram) / signal * 100;

    return {
        trend,
        details: `MACD (${macd.toFixed(2)}) ${trend.toLowerCase()} trend with signal line at ${signal.toFixed(2)}`,
        metrics: [
            {
                name: 'MACD Line',
                value: macd.toFixed(2),
                description: 'Moving Average Convergence Divergence'
            },
            {
                name: 'Signal Line',
                value: signal.toFixed(2),
                description: '9-day EMA of MACD'
            },
            {
                name: 'Histogram',
                value: histogram.toFixed(2),
                description: 'MACD - Signal'
            }
        ]
    };
}

function calculateSMA(prices, period) {
    return prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
}

function calculateEMA(prices, period) {
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < period; i++) {
        ema = (prices[i] - ema) * multiplier + ema;
    }
    return ema;
}

function calculateRSI(prices, period) {
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i < period; i++) {
        const difference = prices[i] - prices[i - 1];
        if (difference >= 0) gains += difference;
        else losses -= difference;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

function calculateMACD(prices) {
    const shortEMA = calculateEMA(prices, 12);
    const longEMA = calculateEMA(prices, 26);
    const macd = shortEMA - longEMA;
    const signal = calculateEMA([macd], 9);
    const histogram = macd - signal;
    
    return { macd, signal, histogram };
}

function updateTopMovers(data) {
    const gainers = document.getElementById('topGainers');
    const losers = document.getElementById('topLosers');

    if (data.gainers.length > 0) {
        gainers.innerHTML = data.gainers.slice(0, 5).map(stock => `
            <div class="stock-item">
                <span class="symbol">${stock.ticker}</span>
                <span class="price">₹${parseFloat(stock.price).toLocaleString('en-IN', {
                    maximumFractionDigits: 2
                })}</span>
                <span class="change" style="color: #00897b">+${stock.change_percentage}%</span>
            </div>
        `).join('');
    }

    if (data.losers.length > 0) {
        losers.innerHTML = data.losers.slice(0, 5).map(stock => `
            <div class="stock-item">
                <span class="symbol">${stock.ticker}</span>
                <span class="price">₹${parseFloat(stock.price).toLocaleString('en-IN', {
                    maximumFractionDigits: 2
                })}</span>
                <span class="change" style="color: #e53935">${stock.change_percentage}%</span>
            </div>
        `).join('');
    }
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);

    // Update chart if it exists
    if (currentChart) {
        updateStockChart(currentChartData);
    }
}

function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.innerHTML = theme === 'light' 
        ? '<i class="fas fa-moon"></i>' 
        : '<i class="fas fa-sun"></i>';
}

const methodDescriptions = {
    sma: {
        title: 'Simple Moving Average (SMA)',
        description: 'A basic trend-following indicator that averages prices over a specific period.',
        features: [
            'Reduces noise in price data',
            'Helps identify trend direction',
            'Slower to react to price changes',
            'Good for longer-term trends'
        ],
        bestUse: 'Best for identifying overall trend direction in stable markets'
    },
    ema: {
        title: 'Exponential Moving Average (EMA)',
        description: 'A weighted moving average that gives more importance to recent prices.',
        features: [
            'Responds faster to price changes',
            'Reduces lag in trend signals',
            'More weight to recent data',
            'Better for short-term trading'
        ],
        bestUse: 'Best for markets with clear trends and shorter timeframes'
    },
    rsi: {
        title: 'Relative Strength Index (RSI)',
        description: 'Momentum oscillator that measures the speed and magnitude of price changes.',
        features: [
            'Identifies overbought/oversold conditions',
            'Shows momentum strength',
            'Ranges from 0 to 100',
            'Helps spot potential reversals'
        ],
        bestUse: 'Best for identifying potential reversal points and market extremes'
    },
    macd: {
        title: 'Moving Average Convergence Divergence (MACD)',
        description: 'Trend-following momentum indicator showing relationship between two moving averages.',
        features: [
            'Combines trend and momentum',
            'Shows potential entry/exit points',
            'Identifies trend changes',
            'Useful for divergence analysis'
        ],
        bestUse: 'Best for identifying trend changes and momentum shifts'
    }
};

function updateMethodDescription(method) {
    const descriptionElement = document.getElementById('methodDescription');
    if (!method) {
        descriptionElement.innerHTML = `
            <h4>Choose a Prediction Model</h4>
            <p>Select a prediction model from the dropdown above to see its description and features.</p>
            <ul>
                <li>Each model has different strengths</li>
                <li>Different models work better in different market conditions</li>
                <li>Consider using multiple models for better analysis</li>
            </ul>
            <p><strong>Tip:</strong> Hover over each option to learn more about it</p>
        `;
        return;
    }
    const info = methodDescriptions[method];

    descriptionElement.innerHTML = `
        <h4>${info.title}</h4>
        <p>${info.description}</p>
        <ul>
            ${info.features.map(feature => `<li>${feature}</li>`).join('')}
        </ul>
        <p><strong>When to use:</strong> ${info.bestUse}</p>
    `;
}

function clearPrediction() {
    const predictionElement = document.getElementById('prediction');
    predictionElement.innerHTML = `
        <h3>Trend Prediction</h3>
        <div class="prediction-details">
            <p>Please select a prediction model to analyze the stock trend.</p>
        </div>
    `;
} 