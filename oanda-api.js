class OandaAPI {
    constructor() {
        // ✅ CONFIGURACIÓN REAL DE OANDA
        this.apiKey = 'd9d0f97a80f1f8f0a0f7d0db8edf4897-bf8862e45f7db28ad5f3879aaca62f34';
        this.accountId = '101-004-35787913-001';
        this.baseURL = 'https://api-fxpractice.oanda.com/v3';
        
        // Verificar que tenemos configuración válida
        this.hasValidConfig = this.apiKey && this.accountId;
        
        if (this.hasValidConfig) {
            console.log('🏦 OANDA API configurada correctamente');
            console.log('📡 Account ID:', this.accountId);
            console.log('🌐 Base URL:', this.baseURL);
        } else {
            console.warn('⚠️ OANDA API no configurada completamente');
        }
    }

    async getAccountDetails() {
        return this.request(`/accounts/${this.accountId}`);
    }

    async getInstruments() {
        return this.request('/instruments');
    }

    async getCandles(instrument, params = {}) {
        const { granularity = 'M1', count = 100, from, to } = params;
        const url = `/instruments/${instrument}/candles?granularity=${granularity}&count=${count}` +
                    (from ? `&from=${from}` : '') +
                    (to ? `&to=${to}` : '');
        return this.request(url);
    }

    async getPricing(instrument) {
        return this.request(`/pricing?instruments=${instrument}`);
    }

    async getCurrentPrice(instrument) {
        console.log(`Obteniendo precio para ${instrument}...`);
        
        if (!this.hasValidConfig) {
            console.warn('⚠️ OANDA no configurada, usando datos simulados');
            return this.getFallbackPrice(instrument);
        }
        
        try {
            // Usar endpoint de pricing real de OANDA
            const pricingURL = `${this.baseURL}/accounts/${this.accountId}/pricing`;
            const params = new URLSearchParams({
                instruments: instrument
            });

            const response = await fetch(`${pricingURL}?${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`🌐 OANDA Response: ${response.status} ${response.statusText}`);

            if (response.ok) {
                const data = await response.json();
                console.log('📦 Respuesta OANDA pricing:', data);

                if (data.prices && data.prices.length > 0) {
                    const price = data.prices[0];
                    const processed = this.processPricing(price);
                    console.log('✅ Precio REAL de OANDA procesado:', processed);
                    return processed;
                }
            } else {
                const errorText = await response.text();
                console.warn(`⚠️ OANDA API error: ${response.status} - ${errorText}`);
            }

            // Fallback si OANDA falla
            return this.getFallbackPrice(instrument);
        } catch (error) {
            console.error('❌ Error conectando con OANDA:', error);
            return this.getFallbackPrice(instrument);
        }
    }

    processPricing(priceData) {
        try {
            const bid = parseFloat(priceData.bids[0]?.price || 0);
            const ask = parseFloat(priceData.asks[0]?.price || 0);
            const mid = (bid + ask) / 2;
            const spread = Math.abs(ask - bid);
            
            // Calcular spread en pips (depende del instrumento)
            let pipValue = 0.0001; // Para la mayoría de pares forex
            if (priceData.instrument.includes('JPY')) {
                pipValue = 0.01; // Para pares con JPY
            } else if (priceData.instrument.includes('XAU')) {
                pipValue = 0.01; // Para oro
            }
            
            const spreadInPips = spread / pipValue;
            
            return {
                instrument: priceData.instrument,
                mid: mid,
                bid: bid,
                ask: ask,
                high: mid * 1.001, // Aproximación
                low: mid * 0.999,  // Aproximación
                open: mid * (1 + (Math.random() - 0.5) * 0.001),
                spread: spreadInPips,
                volume: Math.floor(Math.random() * 200000) + 100000, // OANDA no proporciona volumen en pricing
                timestamp: new Date().toISOString(),
                isReal: true // ✅ Marcar como datos reales
            };
        } catch (error) {
            console.error('Error procesando datos de OANDA:', error);
            return this.getFallbackPrice(priceData.instrument);
        }
    }

    async getHistoricalData(instrument, count = 50) {
        console.log(`Obteniendo datos históricos para ${instrument}...`);
        
        if (!this.hasValidConfig) {
            return this.getFallbackHistoricalData(instrument, count);
        }
        
        try {
            const candlesURL = `${this.baseURL}/instruments/${instrument}/candles`;
            const params = new URLSearchParams({
                count: count.toString(),
                granularity: 'M15', // 15 minutos
                price: 'M' // Mid prices
            });

            const response = await fetch(`${candlesURL}?${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Datos históricos REALES obtenidos de OANDA');
                
                return data.candles.map(candle => this.processCandle(candle, instrument));
            } else {
                console.warn('⚠️ Error obteniendo datos históricos de OANDA');
            }
        } catch (error) {
            console.error('Error obteniendo datos históricos:', error);
        }
        
        return this.getFallbackHistoricalData(instrument, count);
    }

    processCandle(candle, instrument) {
        return {
            instrument: instrument,
            time: candle.time,
            mid: parseFloat(candle.mid.c),
            open: parseFloat(candle.mid.o),
            high: parseFloat(candle.mid.h),
            low: parseFloat(candle.mid.l),
            volume: candle.volume || Math.floor(Math.random() * 1000) + 500,
            complete: candle.complete
        };
    }

    getFallbackPrice(instrument) {
        console.log(`🔄 Usando precio simulado para ${instrument}`);
        
        const basePrices = {
            'XAU_USD': 3362.895,
            'EUR_USD': 1.0845,
            'AUD_USD': 0.6468,
            'USD_JPY': 149.25,
            'GBP_USD': 1.2756,
            'USD_CHF': 0.8756,
            'EUR_JPY': 161.45,
            'AUD_JPY': 96.52,
            'GBP_CAD': 1.7234
        };
        
        const basePrice = basePrices[instrument] || 1.0000;
        const variation = (Math.random() - 0.5) * 0.002; // ±0.2%
        const mid = basePrice * (1 + variation);
        
        return {
            instrument: instrument,
            mid: mid,
            high: mid * 1.001,
            low: mid * 0.999,
            open: mid * (1 + (Math.random() - 0.5) * 0.001),
            spread: Math.random() * 1.5 + 0.5,
            volume: Math.floor(Math.random() * 200000) + 100000,
            timestamp: new Date().toISOString(),
            isReal: false // Marcar como simulado
        };
    }

    getFallbackHistoricalData(instrument, count) {
        console.log(`🔄 Generando datos históricos simulados para ${instrument}`);
        
        const basePrice = this.getFallbackPrice(instrument).mid;
        const candles = [];
        
        for (let i = 0; i < count; i++) {
            const variation = (Math.random() - 0.5) * 0.01;
            const price = basePrice * (1 + variation);
            
            candles.push({
                instrument: instrument,
                time: new Date(Date.now() - (count - i) * 15 * 60 * 1000).toISOString(),
                mid: price,
                open: price * (1 + (Math.random() - 0.5) * 0.001),
                high: price * (1 + Math.random() * 0.002),
                low: price * (1 - Math.random() * 0.002),
                volume: Math.floor(Math.random() * 1000) + 500,
                complete: true
            });
        }
        
        return candles;
    }

    async request(path) {
        const response = await fetch(this.apiUrl + path, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.accessToken
            }
        });
        
        if (!response.ok) {
            const errorDetails = await response.json();
            throw new Error(`Error ${response.status}: ${errorDetails.message}`);
        }
        
        return response.json();
    }
}

// Asegurar que esté disponible globalmente
window.OandaAPI = OandaAPI;
console.log('✅ OandaAPI cargado correctamente');

// 🔥 INTEGRACIÓN CON DUAL SOURCE
OandaAPI.prototype.enableDualSource = function() {
    if (typeof DualSourceAPI !== 'undefined') {
        this.dualSource = new DualSourceAPI();
        console.log('✅ Dual Source habilitado en OandaAPI');
        return true;
    }
    console.warn('⚠️ DualSourceAPI no disponible');
    return false;
};

OandaAPI.prototype.getCurrentPriceEnhanced = async function(instrument) {
    if (this.dualSource) {
        return await this.dualSource.getDualSourcePrice(instrument);
    }
    return await this.getCurrentPrice(instrument);
};