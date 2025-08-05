class DualSourceAPI {
    constructor() {
        this.oandaAPI = new OandaAPI();
        this.alphaVantageKey = 'JZSM6O0SBAQXJ1Y3';
        this.priceCache = new Map();
        this.dataQuality = { oanda: 0, alphaVantage: 0 };
    }

    async getDualSourcePrice(instrument) {
        console.log(`🔄 Obteniendo precio dual-source para ${instrument}...`);
        
        const results = await Promise.allSettled([
            this.getOandaPrice(instrument),
            this.getAlphaVantagePrice(instrument)
        ]);

        return this.analyzeDualResults(results, instrument);
    }

    async getOandaPrice(instrument) {
        try {
            const price = await this.oandaAPI.getCurrentPrice(instrument);
            this.dataQuality.oanda = price.isReal ? 90 : 40;
            return { source: 'OANDA', data: price, quality: this.dataQuality.oanda };
        } catch (error) {
            this.dataQuality.oanda = 0;
            return { source: 'OANDA', error: error.message, quality: 0 };
        }
    }


    async getAlphaVantagePrice(instrument) {
        try {
            const ticker = this.convertToAlphaFormat(instrument);
            const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${this.alphaVantageKey}`;
            
            console.log(`🔍 Alpha Vantage request para ${instrument} (${ticker})`);
            
            const response = await fetch(url);
            const data = await response.json();
            
            // 🔍 DEBUG solo si hay problemas
            if (!data['Global Quote']) {
                console.log(`⚠️ Alpha Vantage respuesta:`, Object.keys(data));
                if (data['Information']) {
                    console.log(`📝 Information:`, data['Information']);
                }
            }
            
            // Verificar errores comunes
            if (data['Information'] && data['Information'].includes('API call frequency')) {
                console.warn(`⚠️ Alpha Vantage: API Limit alcanzado`);
                throw new Error('Alpha Vantage API Limit reached');
            }
            
            if (data['Error Message']) {
                console.error(`❌ Alpha Vantage Error: ${data['Error Message']}`);
                throw new Error(`Alpha Vantage API Error: ${data['Error Message']}`);
            }
            
            if (data['Note']) {
                console.warn(`⚠️ Alpha Vantage Note: ${data['Note']}`);
                throw new Error(`Alpha Vantage API Limit: ${data['Note']}`);
            }
            
            if (data['Global Quote']) {
                const quote = data['Global Quote'];
                const priceField = quote['05. price'] || quote['price'] || quote['Price'] || quote['05.price'];
                
                if (priceField) {
                    const processed = this.processAlphaVantageData(quote, instrument);
                    this.dataQuality.alphaVantage = 85;
                    console.log(`✅ Alpha Vantage: Precio obtenido ${priceField}`);
                    return { source: 'ALPHA_VANTAGE', data: processed, quality: 85 };
                } else {
                    throw new Error('No price field found in Global Quote');
                }
            } else {
                // Error común - respuesta no contiene Global Quote
                throw new Error('Alpha Vantage: No Global Quote data (posible API limit)');
            }
            
        } catch (error) {
            console.warn(`⚠️ Alpha Vantage no disponible: ${error.message}`);
            this.dataQuality.alphaVantage = 0;
            return { source: 'ALPHA_VANTAGE', error: error.message, quality: 0 };
        }
    }

    convertToAlphaFormat(instrument) {
    const map = {
        'XAU_USD': 'XAUUSD',      
        'EUR_USD': 'EURUSD',      
        'GBP_USD': 'GBPUSD',      
        'USD_JPY': 'USDJPY',      
        'AUD_USD': 'AUDUSD',
        'USD_CHF': 'USDCHF',
        'EUR_JPY': 'EURJPY',
        'GBP_JPY': 'GBPJPY',
        'GBP_CAD': 'GBPCAD',
        'USD_CAD': 'USDCAD',        
        
    };
    
    const ticker = map[instrument] || 'XAUUSD';
    console.log(`   🔄 Conversión: ${instrument} → ${ticker}`);
    return ticker;
}

    processAlphaVantageData(quote, instrument) {
        const price = parseFloat(quote['05. price']);
        return {
            instrument,
            mid: price,
            high: parseFloat(quote['03. high']),
            low: parseFloat(quote['04. low']),
            open: parseFloat(quote['02. open']),
            volume: parseInt(quote['06. volume']) || 0,
            change: parseFloat(quote['09. change']),
            changePercent: quote['10. change percent'],
            timestamp: new Date().toISOString(),
            isReal: true
        };
    }

    // analyzeDualResults(results, instrument) {
    //     const [oandaResult, alphaResult] = results;
        
    //     // Si ambas funcionan, validar cruzadamente
    //     if (oandaResult.status === 'fulfilled' && alphaResult.status === 'fulfilled') {
    //         return this.performCrossValidation(oandaResult.value, alphaResult.value, instrument);
    //     }
        
    //     // Si solo una funciona, usar esa
    //     if (oandaResult.status === 'fulfilled') {
    //         return { ...oandaResult.value.data, validationStatus: 'SINGLE_SOURCE_OANDA' };
    //     }
        
    //     if (alphaResult.status === 'fulfilled') {
    //         return { ...alphaResult.value.data, validationStatus: 'SINGLE_SOURCE_ALPHA' };
    //     }
        
    //     // Si ambas fallan, usar fallback
    //     return this.oandaAPI.getFallbackPrice(instrument);
    // }

    analyzeDualResults(results, instrument) {
        const [oandaResult, alphaResult] = results;
        
        console.log(`🔍 Análisis dual para ${instrument}:`);
        console.log(`   OANDA: ${oandaResult.status === 'fulfilled' ? '✅' : '❌'}`);
        console.log(`   Alpha: ${alphaResult.status === 'fulfilled' ? '✅' : '❌'}`);
        
        // Si ambas funcionan, validar cruzadamente
        if (oandaResult.status === 'fulfilled' && alphaResult.status === 'fulfilled') {
            console.log(`🔄 Validación cruzada...`);
            return this.performCrossValidation(oandaResult.value, alphaResult.value, instrument);
        }
        
        // Si solo OANDA funciona (caso más común)
        if (oandaResult.status === 'fulfilled' && oandaResult.value.data) {
            console.log(`🔥 Solo OANDA disponible - Continuando con datos OANDA`);
            return { 
                ...oandaResult.value.data, 
                validationStatus: 'SINGLE_SOURCE_OANDA',
                qualityScore: oandaResult.value.quality,
                alphaVantageError: alphaResult.reason?.message || 'Alpha Vantage no disponible'
            };
        }
        
        // Si solo Alpha Vantage funciona
        if (alphaResult.status === 'fulfilled') {
            console.log(`🔥 Solo Alpha Vantage disponible`);
            return { 
                ...alphaResult.value.data, 
                validationStatus: 'SINGLE_SOURCE_ALPHA',
                qualityScore: alphaResult.value.quality
            };
        }
        
        // Si ambas fallan, usar fallback
        console.warn(`⚠️ Ambas APIs fallaron, usando fallback`);
        return this.oandaAPI.getFallbackPrice(instrument);
    }

    performCrossValidation(oandaResult, alphaResult, instrument) {
    console.log(`   🔍 VALIDACIÓN CRUZADA:`, { oandaResult, alphaResult });
    
    // Verificar que ambos tengan datos válidos
    if (!oandaResult.data || !alphaResult.data) {
        console.warn(`   ⚠️ Datos faltantes para validación cruzada`);
        return oandaResult.data || { validationStatus: 'VALIDATION_ERROR' };
    }
    
    const oandaPrice = oandaResult.data.mid;
    const alphaPrice = alphaResult.data.mid;
    
    console.log(`   💰 Precios para validación: OANDA=${oandaPrice}, Alpha=${alphaPrice}`);
        const difference = Math.abs(oandaPrice - alphaPrice);
        const percentDiff = (difference / oandaPrice) * 100;
        
        if (percentDiff < 0.1) { // Diferencia menor al 0.1%
            return {
                ...oandaResult.data,
                validationStatus: 'CROSS_VALIDATED',
                qualityScore: 95,
                alphaVantagePrice: alphaPrice,
                priceDifference: difference
            };
        } else {
            console.warn(`⚠️ Discrepancia de precios: ${percentDiff}%`);
            return {
                ...oandaResult.data,
                validationStatus: 'PRICE_DISCREPANCY',
                qualityScore: 60,
                alphaVantagePrice: alphaPrice,
                priceDifference: difference
            };
        }
    }
}

window.DualSourceAPI = DualSourceAPI;
console.log('✅ DualSourceAPI cargado');