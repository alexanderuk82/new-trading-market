class InvestingScraper {
    constructor() {
        this.localServerUrl = 'http://localhost:3002';
        this.isServerAvailable = false;
        this.checkServerHealth();
    }

    async checkServerHealth() {
        try {
            const response = await fetch(`${this.localServerUrl}/health`);
            this.isServerAvailable = response.ok;
            console.log(this.isServerAvailable ? '✅ Servidor local disponible' : '❌ Servidor local no disponible');
        } catch (error) {
            this.isServerAvailable = false;
            console.warn('⚠️ Servidor local no encontrado, usando fallback');
        }
    }

    async getTechnicalAnalysis(ticker, timeframe = '15m') {
        try {
            console.log(`📊 Obteniendo análisis técnico REAL para ${ticker} (${timeframe})...`);
            
            // Forzar verificación de servidor antes de cada petición
            await this.checkServerHealth();
            
            if (this.isServerAvailable) {
                try {
                    const response = await fetch(`${this.localServerUrl}/api/technical/${ticker}?timeframe=${timeframe}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        timeout: 10000 // 10 segundos timeout
                    });
                    
                    console.log(`🌐 Respuesta del servidor: ${response.status} ${response.statusText}`);
                    
                    if (response.ok) {
                        const data = await response.json();
                        
                        console.log(`📦 Datos recibidos:`, data);
                        
                        if (data && data.isReal) {
                            console.log(`✅ DATOS TÉCNICOS REALES obtenidos de investing.com (${data.timeframe || timeframe})`);
                            console.log(`📊 Recomendación real: ${data.recommendation} (${data.confidence}% confianza)`);
                            return data;
                        } else if (data) {
                            console.warn('⚠️ Datos técnicos de fallback del servidor (scraping falló)');
                            return data;
                        }
                    } else {
                        console.error(`❌ Error del servidor: ${response.status} ${response.statusText}`);
                    }
                } catch (fetchError) {
                    console.error('❌ Error en fetch:', fetchError);
                    this.isServerAvailable = false;
                }
            }
            
            console.warn('❌ Servidor no disponible o falló, usando datos simulados');
            return this.getFallbackTechnicalData(timeframe);
            
        } catch (error) {
            console.error('Error obteniendo análisis técnico:', error);
            return this.getFallbackTechnicalData(timeframe);
        }
    }

    getFallbackTechnicalData(timeframe = '15m') {
        console.log('🔄 Usando datos técnicos SIMULADOS (' + timeframe + ')');
        
        // Generar datos técnicos simulados realistas
        const recommendations = ['STRONG_BUY', 'BUY', 'NEUTRAL', 'SELL', 'STRONG_SELL'];
        const signals = ['Strong Buy', 'Buy', 'Neutral', 'Sell', 'Strong Sell'];
        
        const randomRecommendation = recommendations[Math.floor(Math.random() * recommendations.length)];
        const randomSignal = signals[Math.floor(Math.random() * signals.length)];
        
        // Generar confianza basada en la recomendación
        let confidence;
        if (randomRecommendation.includes('STRONG')) {
            confidence = 70 + Math.random() * 20; // 70-90%
        } else if (randomRecommendation === 'NEUTRAL') {
            confidence = 40 + Math.random() * 20; // 40-60%
        } else {
            confidence = 55 + Math.random() * 25; // 55-80%
        }
        
        return {
            recommendation: randomRecommendation,
            confidence: Math.round(confidence),
            timeframe: timeframe,
            isReal: false,
            
            movingAverages: {
                summary: randomSignal,
                'MA5': randomSignal,
                'MA10': randomSignal,
                'MA20': randomSignal,
                'MA50': randomSignal,
                'MA100': randomSignal,
                'MA200': randomSignal
            },
            
            oscillators: {
                summary: randomSignal,
                'RSI': randomSignal,
                'STOCH': randomSignal,
                'MACD': randomSignal,
                'CCI': randomSignal,
                'Williams %R': randomSignal,
                'Momentum': randomSignal
            },
            
            // Datos adicionales para compatibilidad
            price: Math.random() * 1000 + 2000, // Precio simulado
            change: (Math.random() - 0.5) * 100, // Cambio simulado
            changePercent: (Math.random() - 0.5) * 5, // % cambio simulado
            
            timestamp: new Date().toISOString(),
            source: 'fallback_simulation'
        };
    }

    async getOverview(ticker) {
        try {
            console.log(`📊 Obteniendo overview para ${ticker}...`);
            
            if (this.isServerAvailable) {
                const response = await fetch(`${this.localServerUrl}/api/overview/${ticker}`);
                
                if (response.ok) {
                    const data = await response.json();
                    return data;
                }
            }
            
            return this.getFallbackOverviewData(ticker);
            
        } catch (error) {
            console.error('Error obteniendo overview:', error);
            return this.getFallbackOverviewData(ticker);
        }
    }

    getFallbackOverviewData(ticker) {
        return {
            instrument: ticker,
            price: Math.random() * 1000 + 2000,
            change: (Math.random() - 0.5) * 100,
            changePercent: (Math.random() - 0.5) * 5,
            volume: Math.floor(Math.random() * 1000000) + 500000,
            marketCap: 'N/A',
            isReal: false,
            timestamp: new Date().toISOString()
        };
    }

    async getNews(ticker) {
        try {
            console.log(`📰 Obteniendo noticias para ${ticker}...`);
            
            if (this.isServerAvailable) {
                const response = await fetch(`${this.localServerUrl}/api/news/${ticker}`);
                
                if (response.ok) {
                    const data = await response.json();
                    return data;
                }
            }
            
            return this.getFallbackNewsData();
            
        } catch (error) {
            console.error('Error obteniendo noticias:', error);
            return this.getFallbackNewsData();
        }
    }

    getFallbackNewsData() {
        return {
            recentNews: [
                {
                    title: 'Mercado en condiciones normales',
                    time: 'Hace 1 hora',
                    impact: 'LOW',
                    url: '#'
                },
                {
                    title: 'Análisis técnico sugiere consolidación',
                    time: 'Hace 3 horas',
                    impact: 'MEDIUM',
                    url: '#'
                }
            ],
            marketImpact: {
                level: 'LOW',
                description: 'Condiciones normales del mercado'
            },
            warnings: [],
            sentiment: 'NEUTRAL',
            isReal: false,
            timestamp: new Date().toISOString()
        };
    }
}

// Asegurar que esté disponible globalmente
window.InvestingScraper = InvestingScraper;
console.log('✅ InvestingScraper cargado correctamente');