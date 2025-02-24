let currentPeriod = '1d';
let updateTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    // Theme toggle functionality
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', toggleTheme);

    // Initialize theme
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    // Period selector functionality
    const periodButtons = document.querySelectorAll('.period-btn');
    periodButtons.forEach(button => {
        button.addEventListener('click', () => {
            periodButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentPeriod = button.dataset.period;
            loadMoversData(currentPeriod);
        });
    });

    // Initial load
    loadMoversData(currentPeriod);
});

async function loadMoversData(period) {
    try {
        showLoading();
        const data = await StockAPI.getTopMovers(period);
        if (data) {
            updateMoversDisplay(data);
        }
        scheduleNextUpdate();
    } catch (error) {
        console.error('Error loading movers data:', error);
        showError();
    }
}

function updateMoversDisplay(data) {
    const gainersGrid = document.getElementById('gainersGrid');
    const losersGrid = document.getElementById('losersGrid');

    gainersGrid.innerHTML = data.gainers.slice(0, 25).map(stock => createStockCard(stock, true)).join('');
    losersGrid.innerHTML = data.losers.slice(0, 25).map(stock => createStockCard(stock, false)).join('');
}

function createStockCard(stock, isGainer) {
    const changeColor = isGainer ? 'var(--success-color)' : 'var(--danger-color)';
    const changePrefix = isGainer ? '+' : '';
    
    return `
        <div class="stock-card" onclick="window.location.href='index.html?symbol=${stock.ticker}'">
            <div class="stock-card-header">
                <h3>${stock.ticker}</h3>
                <span class="stock-name">${stock.name || 'Stock'}</span>
            </div>
            <div class="stock-card-body">
                <div class="price">₹${parseFloat(stock.price).toLocaleString('en-IN', {
                    maximumFractionDigits: 2
                })}</div>
                <div class="change" style="color: ${changeColor}">
                    <span class="change-amount">${changePrefix}${stock.change}</span>
                    <span class="change-percent">(${changePrefix}${stock.change_percentage}%)</span>
                </div>
            </div>
            <div class="stock-card-footer">
                <span>Volume: ${formatVolume(stock.volume)}</span>
                <span>Last Updated: ${formatTime(stock.last_updated)}</span>
            </div>
        </div>
    `;
}

function formatVolume(volume) {
    if (volume >= 10000000) return (volume / 10000000).toFixed(2) + ' Cr';
    if (volume >= 100000) return (volume / 100000).toFixed(2) + ' L';
    if (volume >= 1000) return (volume / 1000).toFixed(2) + ' K';
    return volume.toString();
}

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showLoading() {
    const grids = document.querySelectorAll('.movers-grid');
    grids.forEach(grid => {
        grid.innerHTML = '<div class="loading-spinner">Loading...</div>';
    });
}

function showError() {
    const grids = document.querySelectorAll('.movers-grid');
    grids.forEach(grid => {
        grid.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                Failed to load market data. Please try again later.
            </div>
        `;
    });
}

function scheduleNextUpdate() {
    if (updateTimer) {
        clearTimeout(updateTimer);
    }
    updateTimer = setTimeout(() => loadMoversData(currentPeriod), 300000); // 5 minutes
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.innerHTML = theme === 'light' 
        ? '<i class="fas fa-moon"></i>' 
        : '<i class="fas fa-sun"></i>';
} 