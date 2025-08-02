// Función compartida para convertir tickers
window.convertToOandaFormat = function(ticker) {
    const conversionMap = {
        'EURUSD': 'EUR_USD',
        'AUDUSD': 'AUD_USD', 
        'XAUUSD': 'XAU_USD',
        'USDJPY': 'USD_JPY',
        'USDCHF': 'USD_CHF',
        'EURJPY': 'EUR_JPY',
        'AUDJPY': 'AUD_JPY',
        'GBPUSD': 'GBP_USD',
        'GBPCAD': 'GBP_CAD',
        'EURGBP': 'EUR_GBP',
        'EURAUD': 'EUR_AUD',
        'AUDCAD': 'AUD_CAD',
        'GBPJPY': 'GBP_JPY',
        'EURCHF': 'EUR_CHF',
        'AUDCHF': 'AUD_CHF',
        'CADCHF': 'CAD_CHF',
        'CADJPY': 'CAD_JPY',
        'CHFJPY': 'CHF_JPY',
        'NZDUSD': 'NZD_USD',
        'NZDJPY': 'NZD_JPY',
        'XAGUSD': 'XAG_USD'
    };
    return conversionMap[ticker] || 'XAU_USD';
};

console.log('✅ convertToOandaFormat cargado');
