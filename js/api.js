const API_KEY = 'BCP6TUU9QX9ML5TA';
const BASE_URL = 'https://www.alphavantage.co/query';

class StockAPI {
    static async getStockQuote(symbol) {
        try {
            // Remove .BSE suffix for index symbols
            const isIndex = symbol.startsWith('^');
            const querySymbol = isIndex ? symbol : `${symbol}.BSE`;
            
            const response = await fetch(
                `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${querySymbol}&apikey=${API_KEY}`
            );
            const data = await response.json();
            
            if (data['Note']) {
                console.error('API call frequency limit reached:', data['Note']);
                return null;
            }
            
            return data['Global Quote'];
        } catch (error) {
            console.error('Error fetching stock quote:', error);
            return null;
        }
    }

    static async getStockTimeSeries(symbol) {
        try {
            const response = await fetch(
                `${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}.BSE&outputsize=compact&apikey=${API_KEY}`
            );
            const data = await response.json();
            
            if (data['Note']) {
                console.error('API call frequency limit reached:', data['Note']);
                return null;
            }
            
            return data['Time Series (Daily)'];
        } catch (error) {
            console.error('Error fetching time series:', error);
            return null;
        }
    }

    static async searchStocks(keyword) {
        try {
            const response = await fetch(
                `${BASE_URL}?function=SYMBOL_SEARCH&keywords=${keyword}&apikey=${API_KEY}`
            );
            const data = await response.json();
            
            if (data['Note']) {
                console.error('API call frequency limit reached:', data['Note']);
                return [];
            }
            
            // Filter for Indian stocks and improve sorting
            return data.bestMatches
                .filter(match => 
                    match['4. region'] === 'India' || 
                    match['1. symbol'].endsWith('.BSE') ||
                    match['1. symbol'].startsWith('^')
                )
                .sort((a, b) => {
                    // Prioritize exact matches
                    const aExact = a['1. symbol'].toLowerCase().startsWith(keyword.toLowerCase());
                    const bExact = b['1. symbol'].toLowerCase().startsWith(keyword.toLowerCase());
                    if (aExact && !bExact) return -1;
                    if (!aExact && bExact) return 1;
                    return 0;
                });
        } catch (error) {
            console.error('Error searching stocks:', error);
            return [];
        }
    }

    // Add new method for top gainers/losers using India-specific endpoint
    static async getTopMovers(period = '1d') {
        try {
            let endpoint = 'TOP_GAINERS_LOSERS';
            switch(period) {
                case '1w':
                    endpoint = 'TOP_GAINERS_LOSERS_WEEKLY';
                    break;
                case '1m':
                    endpoint = 'TOP_GAINERS_LOSERS_MONTHLY';
                    break;
            }
            
            const response = await fetch(
                `${BASE_URL}?function=${endpoint}&apikey=${API_KEY}`
            );
            const data = await response.json();
            
            if (data['Note']) {
                console.error('API call frequency limit reached:', data['Note']);
                return null;
            }
            
            return {
                gainers: data.top_gainers || [],
                losers: data.top_losers || []
            };
        } catch (error) {
            console.error('Error fetching top movers:', error);
            return null;
        }
    }
} 