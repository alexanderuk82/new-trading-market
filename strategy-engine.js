class StrategyEngine {
    constructor() {
        // Verificar dependencias antes de instanciar
        if (typeof OandaAPI === 'undefined') {
            console.error('❌ OandaAPI no está disponible');
            throw new Error('OandaAPI debe cargarse antes que StrategyEngine');
        }
        
        if (typeof InvestingScraper === 'undefined') {
            console.error('❌ InvestingScraper no está disponible');
            throw new Error('InvestingScraper debe cargarse antes que StrategyEngine');
        }
        
        this.oandaAPI = new OandaAPI();
        this.investingScraper = new InvestingScraper();
        this.analysisHistory = this.loadHistory();
        
        console.log('✅ StrategyEngine inicializado correctamente');
    }

    async performCompleteAnalysis(ticker) {
        try {
            console.log(`🔍 Iniciando análisis completo para ${ticker}...`);
            
            // Obtener datos de ambas fuentes con manejo de errores
            let oandaResult, investingResult;
            
            try {
                console.log('📊 Obteniendo datos de OANDA...');
                oandaResult = await this.oandaAPI.getCurrentPrice(this.convertToOandaFormat(ticker));
                console.log('✅ Datos OANDA obtenidos:', oandaResult);
            } catch (error) {
                console.error('❌ Error obteniendo datos OANDA:', error);
                // Usar precio de fallback cuando OANDA falle
                oandaResult = this.oandaAPI.getFallbackPrice(this.convertToOandaFormat(ticker));
                console.log('🔄 Usando precio de fallback OANDA:', oandaResult);
            }
            
            try {
                console.log('📈 Obteniendo datos de Investing...');
                investingResult = await this.investingScraper.getTechnicalAnalysis(ticker, '15m');
                console.log('✅ Datos Investing obtenidos:', investingResult);
            } catch (error) {
                console.error('❌ Error obteniendo datos Investing:', error);
                investingResult = null;
            }
            
            // Procesar datos obtenidos
            const oandaData = oandaResult ? {
                price: oandaResult,
                indicators: this.extractOandaIndicators(oandaResult)
            } : null;
            
            const investingData = investingResult || this.getFallbackInvestingData();
            
            console.log('🔗 Datos procesados:', { oandaData, investingData });
            
            // Combinar análisis
            const combinedAnalysis = this.combineAnalysis(oandaData, investingData);
            
            // Generar veredicto final
            const verdict = this.generateFinalVerdict(combinedAnalysis);
            
            const result = {
                oanda: oandaData,
                investing: investingData,
                combined: combinedAnalysis,
                verdict: verdict,
                timestamp: new Date().toISOString()
            };
            
            console.log('✅ Análisis completo finalizado:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Error en análisis completo:', error);
            return this.getFallbackCompleteAnalysis(ticker);
        }
    }

    generateFinalVerdict(combinedAnalysis) {
        try {
            console.log('🔍 Analizando datos disponibles para veredicto...', combinedAnalysis);
            
            // BUSCAR DATOS DE INVESTING CON PRIORIDAD MÁXIMA
            let investingData = null;
            
            if (combinedAnalysis.investing) {
                console.log('📊 Estructura investing encontrada:', combinedAnalysis.investing);
                investingData = combinedAnalysis.investing;
                console.log('✅ Usando datos de investing como BASE PRINCIPAL');
            }
            
            const oandaData = combinedAnalysis.oanda || combinedAnalysis.oandaResult;
            
            let finalDirection = 'NEUTRAL';
            let finalConfidence = 50;
            let finalRecommendation = 'NEUTRAL';
            
            // PRIORIDAD ABSOLUTA A INVESTING.COM
            if (investingData && investingData.recommendation && investingData.confidence) {
                console.log('🎯 INVESTING.COM ES LA BASE PRINCIPAL');
                console.log('📊 Datos investing procesados:', {
                    recommendation: investingData.recommendation,
                    confidence: investingData.confidence,
                    isReal: investingData.isReal || false
                });
                
                finalRecommendation = investingData.recommendation;
                finalConfidence = investingData.confidence;
                
                // Convertir recomendación a dirección
                if (investingData.recommendation === 'STRONG_BUY') {
                    finalDirection = 'BULLISH';
                    finalConfidence = Math.min(85, finalConfidence + 10); // Boost para strong buy
                } else if (investingData.recommendation === 'BUY') {
                    finalDirection = 'BULLISH';
                    finalConfidence = Math.min(80, finalConfidence + 5);
                } else if (investingData.recommendation === 'STRONG_SELL') {
                    finalDirection = 'BEARISH';
                    finalConfidence = Math.min(85, finalConfidence + 10); // Boost para strong sell
                } else if (investingData.recommendation === 'SELL') {
                    finalDirection = 'BEARISH';
                    finalConfidence = Math.min(80, finalConfidence + 5);
                } else {
                    finalDirection = 'NEUTRAL';
                    // No cambiar confianza para neutral
                }
                
                // Ajuste MÍNIMO con datos de OANDA (máximo ±5%)
                if (oandaData && oandaData.price) {
                    console.log('📈 Ajuste mínimo con datos de OANDA');
                    
                    // Solo ajustes muy pequeños
                    if (oandaData.price.volume > 150000) {
                        finalConfidence = Math.min(90, finalConfidence + 3);
                    }
                    
                    if (oandaData.price.spread > 2.0) {
                        finalConfidence = Math.max(35, finalConfidence - 5);
                    }
                }
                
            } else {
                console.warn('⚠️ No hay datos válidos de investing, usando análisis básico');
                
                const signals = this.extractBasicSignals(combinedAnalysis);
                const consensus = this.calculateConsensus(signals);
                
                finalDirection = consensus.direction;
                finalConfidence = consensus.confidence;
                finalRecommendation = consensus.recommendation;
            }
            
            // Asegurar rangos válidos
            finalConfidence = Math.max(30, Math.min(90, finalConfidence));
            
            const verdict = {
                direction: finalDirection,
                confidence: Math.round(finalConfidence),
                recommendation: finalRecommendation,
                riskLevel: this.calculateRiskLevel(finalConfidence, combinedAnalysis),
                entryStrategy: this.generateEntryStrategy(finalDirection, finalConfidence),
                timestamp: new Date().toISOString(),
                basedOnRealData: investingData?.isReal || false
            };
            
            console.log(`🎯 VEREDICTO FINAL (BASADO EN INVESTING):`, verdict);
            return verdict;
            
        } catch (error) {
            console.error('Error generando veredicto final:', error);
            return {
                direction: 'NEUTRAL',
                confidence: 50,
                recommendation: 'NEUTRAL',
                riskLevel: 'HIGH',
                basedOnRealData: false
            };
        }
    }

    convertToOandaFormat(ticker) {
        const conversionMap = {
            'EURUSD': 'EUR_USD',
            'AUDUSD': 'AUD_USD', 
            'XAUUSD': 'XAU_USD',
            'USDJPY': 'USD_JPY',
            'USDCHF': 'USD_CHF',
            'EURJPY': 'EUR_JPY',
            'AUDJPY': 'AUD_JPY',
            'GBPUSD': 'GBP_USD',
            'GBPCAD': 'GBP_CAD'
        };
        return conversionMap[ticker] || 'XAU_USD';
    }

    combineAnalysis(oandaData, investingData) {
        console.log('🔗 Combinando análisis - Datos recibidos:', {
            oanda: !!oandaData,
            investing: !!investingData,
            investingIsReal: investingData?.isReal
        });

        const signals = [];
        let totalPoints = 0;
        let bullishPoints = 0;
        let bearishPoints = 0;
        let neutralPoints = 0;

        // Procesar señales de investing.com
        if (investingData) {
            console.log('📊 Procesando datos de investing.com:', investingData);
            
            if (investingData.movingAverages) {
                Object.entries(investingData.movingAverages).forEach(([key, value]) => {
                    if (key !== 'summary' && value) {
                        signals.push({
                            indicator: key,
                            signal: value,
                            weight: this.getIndicatorWeight(key),
                            source: 'investing'
                        });
                    }
                });

                if (investingData.movingAverages.summary) {
                    signals.push({
                        indicator: 'MovingAverages',
                        signal: investingData.movingAverages.summary,
                        weight: 0.35,
                        source: 'investing'
                    });
                }
            }

            if (investingData.oscillators) {
                Object.entries(investingData.oscillators).forEach(([key, value]) => {
                    if (key !== 'summary' && value) {
                        signals.push({
                            indicator: key,
                            signal: value,
                            weight: this.getIndicatorWeight(key),
                            source: 'investing'
                        });
                    }
                });

                if (investingData.oscillators.summary) {
                    signals.push({
                        indicator: 'Oscillators',
                        signal: investingData.oscillators.summary,
                        weight: 0.35,
                        source: 'investing'
                    });
                }
            }
        }

        // Procesar señales de OANDA
        if (oandaData && oandaData.indicators) {
            Object.entries(oandaData.indicators).forEach(([key, value]) => {
                if (value && typeof value === 'string') {
                    signals.push({
                        indicator: key,
                        signal: value,
                        weight: 0.1,
                        source: 'oanda'
                    });
                }
            });
        }

        // Calcular puntuación
        signals.forEach(signal => {
            const points = this.getSignalPoints(signal.signal) * signal.weight;
            totalPoints += Math.abs(points);

            if (points > 0) bullishPoints += points;
            else if (points < 0) bearishPoints += Math.abs(points);
            else neutralPoints += signal.weight;
        });

        const result = {
            signals: signals,
            totalPoints: totalPoints,
            bullishPoints: bullishPoints,
            bearishPoints: bearishPoints,
            neutralPoints: neutralPoints,
            trendScore: this.calculateTrendScore(signals),
            momentumScore: this.calculateMomentumScore(signals),
            volumeScore: this.calculateVolumeScore(oandaData),
            supportResistance: this.calculateSupportResistance(oandaData),
            investing: investingData,
            oanda: oandaData
        };

        console.log('🔗 Análisis combinado completado:', {
            totalSignals: signals.length,
            bullishPoints: bullishPoints.toFixed(2),
            bearishPoints: bearishPoints.toFixed(2),
            hasRealData: investingData?.isReal
        });

        return result;
    }

    getIndicatorWeight(indicator) {
        const weights = {
            'MA5': 0.1,
            'MA10': 0.15,
            'MA20': 0.2,
            'MA50': 0.25,
            'MA100': 0.15,
            'MA200': 0.15,
            'RSI': 0.2,
            'STOCH': 0.15,
            'MACD': 0.25,
            'CCI': 0.1,
            'Williams %R': 0.1,
            'Momentum': 0.15
        };
        return weights[indicator] || 0.1;
    }

    getSignalPoints(signal) {
        const signalMap = {
            'Strong Buy': 2,
            'Buy': 1,
            'Neutral': 0,
            'Sell': -1,
            'Strong Sell': -2
        };
        return signalMap[signal] || 0;
    }

    calculateTrendScore(signals) {
        const trendSignals = signals.filter(s => s.indicator.includes('MA'));
        if (trendSignals.length === 0) return 'NEUTRAL';
        
        let score = 0;
        trendSignals.forEach(signal => {
            score += this.getSignalPoints(signal.signal) * signal.weight;
        });
        
        if (score > 0.5) return 'STRONG POSITIVE';
        if (score > 0.2) return 'MODERATE POSITIVE';
        if (score < -0.5) return 'STRONG NEGATIVE';
        if (score < -0.2) return 'MODERATE NEGATIVE';
        return 'NEUTRAL';
    }

    calculateMomentumScore(signals) {
        const momentumSignals = signals.filter(s => 
            ['RSI', 'STOCH', 'MACD', 'Momentum'].includes(s.indicator)
        );
        if (momentumSignals.length === 0) return 'NEUTRAL';
        
        let score = 0;
        momentumSignals.forEach(signal => {
            score += this.getSignalPoints(signal.signal) * signal.weight;
        });
        
        if (score > 0.3) return 'HIGH POSITIVE';
        if (score > 0.1) return 'MODERATE POSITIVE';
        if (score < -0.3) return 'HIGH NEGATIVE';
        if (score < -0.1) return 'MODERATE NEGATIVE';
        return 'NEUTRAL';
    }

    calculateVolumeScore(oandaData) {
        if (!oandaData || !oandaData.price || !oandaData.price.volume) {
            return 'MEDIUM';
        }
        
        const volume = oandaData.price.volume;
        if (volume > 200000) return 'ALTA';
        if (volume < 50000) return 'BAJA';
        return 'MEDIUM';
    }

    calculateSupportResistance(oandaData) {
        if (!oandaData || !oandaData.price) {
            return { support: '3360.00', resistance: '3365.00' };
        }
        
        const price = oandaData.price.mid;
        const support = (price - 5).toFixed(2);
        const resistance = (price + 5).toFixed(2);
        
        return { support, resistance };
    }

    extractOandaIndicators(priceData) {
        if (!priceData) return {};
        
        return {
            price_trend: priceData.mid > priceData.open ? 'Buy' : 'Sell',
            volume_signal: priceData.volume > 100000 ? 'Buy' : 'Neutral'
        };
    }

    extractBasicSignals(combinedAnalysis) {
        return combinedAnalysis.signals || [];
    }

    calculateConsensus(signals) {
        if (signals.length === 0) {
            return {
                direction: 'NEUTRAL',
                confidence: 50,
                recommendation: 'NEUTRAL'
            };
        }
        
        let bullishScore = 0;
        let bearishScore = 0;
        
        signals.forEach(signal => {
            const points = this.getSignalPoints(signal.signal) * (signal.weight || 0.1);
            if (points > 0) bullishScore += points;
            else if (points < 0) bearishScore += Math.abs(points);
        });
        
        const totalScore = bullishScore + bearishScore;
        if (totalScore === 0) {
            return { direction: 'NEUTRAL', confidence: 50, recommendation: 'NEUTRAL' };
        }
        
        const bullishPercentage = (bullishScore / totalScore) * 100;
        
        if (bullishPercentage > 60) {
            return {
                direction: 'BULLISH',
                confidence: Math.round(bullishPercentage),
                recommendation: 'BUY'
            };
        } else if (bullishPercentage < 40) {
            return {
                direction: 'BEARISH',
                confidence: Math.round(100 - bullishPercentage),
                recommendation: 'SELL'
            };
        } else {
            return {
                direction: 'NEUTRAL',
                confidence: 50,
                recommendation: 'NEUTRAL'
            };
        }
    }

    calculateRiskLevel(confidence, combinedAnalysis) {
        if (confidence < 40) return 'HIGH';
        if (confidence > 70) return 'LOW';
        return 'MEDIUM';
    }

    generateEntryStrategy(direction, confidence) {
        if (confidence < 50) return 'Esperar confirmación';
        if (direction === 'BULLISH') return 'Buscar entrada en pullback';
        if (direction === 'BEARISH') return 'Esperar rebote para venta';
        return 'Esperar breakout direccional';
    }

    loadHistory() {
        try {
            const saved = localStorage.getItem('tradingAnalysisHistory');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error cargando historial:', error);
            return [];
        }
    }

    saveAnalysis(analysis) {
        try {
            this.analysisHistory.unshift({
                ...analysis,
                timestamp: new Date().toISOString()
            });
            
            this.analysisHistory = this.analysisHistory.slice(0, 50);
            localStorage.setItem('tradingAnalysisHistory', JSON.stringify(this.analysisHistory));
            console.log('✅ Análisis guardado en historial');
        } catch (error) {
            console.error('Error guardando análisis:', error);
        }
    }

    exportAnalysis(analysis) {
        try {
            const dataStr = JSON.stringify(analysis, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `trading-analysis-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            console.log('✅ Análisis exportado');
        } catch (error) {
            console.error('Error exportando análisis:', error);
        }
    }

    clearHistory() {
        this.analysisHistory = [];
        localStorage.removeItem('tradingAnalysisHistory');
        console.log('✅ Historial limpiado');
    }

    getFallbackInvestingData() {
        return {
            recommendation: 'NEUTRAL',
            confidence: 50,
            timeframe: '15m',
            isReal: false,
            movingAverages: { summary: 'Neutral' },
            oscillators: { summary: 'Neutral' },
            source: 'fallback'
        };
    }

    getFallbackCompleteAnalysis(ticker) {
        console.log('🔄 Generando análisis completo de fallback...');
        
        return {
            oanda: {
                price: {
                    mid: 3362.895,
                    high: 3363.6,
                    low: 3361.635,
                    spread: 0.5,
                    volume: 150000,
                    instrument: this.convertToOandaFormat(ticker)
                }
            },
            investing: this.getFallbackInvestingData(),
            combined: {
                signals: [],
                totalPoints: 0,
                bullishPoints: 0,
                bearishPoints: 0,
                neutralPoints: 1,
                trendScore: 'NEUTRAL',
                momentumScore: 'NEUTRAL',
                volumeScore: 'MEDIUM',
                supportResistance: {
                    support: '3360.00',
                    resistance: '3365.00'
                }
            },
            verdict: {
                direction: 'NEUTRAL',
                confidence: 50,
                recommendation: 'NEUTRAL',
                riskLevel: 'MEDIUM',
                entryStrategy: 'Esperar confirmación',
                basedOnRealData: false
            },
            timestamp: new Date().toISOString()
        };
    }
}

// Asegurar que esté disponible globalmente
window.StrategyEngine = StrategyEngine;
console.log('✅ StrategyEngine cargado correctamente');