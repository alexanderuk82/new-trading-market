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
        if (typeof TwelveDataAPI !== 'undefined') {
            this.twelveDataAPI = new TwelveDataAPI();
            console.log('✅ TwelveDataAPI integrado en StrategyEngine');
        } else {
            console.warn('⚠️ TwelveDataAPI no disponible');
            this.twelveDataAPI = null;
        }
        this.analysisHistory = this.loadHistory();
        
        console.log('✅ StrategyEngine inicializado correctamente');
    }

    async performCompleteAnalysis(ticker) {
        try {
            console.log(`🔍 Iniciando análisis completo para ${ticker}...`);
            
            // Obtener datos de todas las fuentes con manejo de errores
            let oandaResult, investingResult, twelveDataResult = null;
            
            try {
                console.log('📊 Obteniendo datos de OANDA...');
                
                // 🔥 VERIFICACIÓN Y USO DE DUAL SOURCE
                if (typeof this.oandaAPI.enableDualSource === 'function') {
                    const dualEnabled = this.oandaAPI.enableDualSource();
                    if (dualEnabled && typeof this.oandaAPI.getCurrentPriceEnhanced === 'function') {
                        console.log('✅ Usando sistema dual-source OANDA + Alpha Vantage');
                        oandaResult = await this.oandaAPI.getCurrentPriceEnhanced(this.convertToOandaFormat(ticker));
                    } else {
                        console.log('⚠️ Dual source no disponible, usando solo OANDA');
                        oandaResult = await this.oandaAPI.getCurrentPrice(this.convertToOandaFormat(ticker));
                    }
                } else {
                    console.log('⚠️ EnableDualSource no disponible, usando solo OANDA');
                    oandaResult = await this.oandaAPI.getCurrentPrice(this.convertToOandaFormat(ticker));
                }
                
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
            
            // 🔥 NUEVO: Obtener datos de TwelveData
            if (this.twelveDataAPI) {
                try {
                    console.log('📊 Obteniendo datos técnicos de TwelveData...');
                    twelveDataResult = await this.twelveDataAPI.getEnhancedTechnicals(ticker, '15min');
                    console.log('✅ Datos TwelveData obtenidos:', twelveDataResult);
                    
                    // AGREGAR backtesting después de obtener datos principales
                    if (this.twelveDataAPI && twelveDataResult && twelveDataResult.success) {
                        try {
                            console.log('📈 Ejecutando backtesting histórico...');
                            const backtestResult = await this.twelveDataAPI.getHistoricalBacktest(ticker, 3); // 3 meses
                            twelveDataResult.backtest = backtestResult;
                            console.log(`✅ Backtesting completado: ${backtestResult.backtestRecommendation} (${backtestResult.confidence}%)`);
                        } catch (error) {
                            console.warn('⚠️ Error en backtesting:', error);
                        }
                    }
                } catch (error) {
                    console.error('❌ Error obteniendo datos TwelveData:', error);
                    twelveDataResult = null;
                }
            }
            
            // Procesar datos obtenidos
            const oandaData = oandaResult ? {
                price: oandaResult,
                indicators: this.extractOandaIndicators(oandaResult)
            } : null;
            
            const investingData = investingResult || this.getFallbackInvestingData();
            const twelveDataData = twelveDataResult || null;
            
            console.log('🔗 Datos procesados:', { oandaData, investingData, twelveDataData });
            
            // 🔥 CORREGIR: Combinar análisis con TwelveData incluido
            const combinedAnalysis = this.combineAnalysis(oandaData, investingData, twelveDataData);
            
            // Generar veredicto final
            const verdict = this.generateFinalVerdict(combinedAnalysis);
            
            const result = {
                oanda: oandaData,
                investing: investingData,
                twelveData: twelveDataData,
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
                }
                
                // 🔥 AJUSTE CON DATOS DUAL-SOURCE
                if (oandaData && oandaData.price) {
                    console.log('📈 Ajuste con datos dual-source');
                    
                    // Verificar si hay validación cruzada
                    if (oandaData.price.validationStatus === 'CROSS_VALIDATED') {
                        finalConfidence = Math.min(90, finalConfidence + 5);
                        console.log('✅ Precio validado cruzadamente, +5% confianza');
                    } else if (oandaData.price.validationStatus === 'PRICE_DISCREPANCY') {
                        finalConfidence = Math.max(40, finalConfidence - 8);
                        console.log('⚠️ Discrepancia de precios detectada, -8% confianza');
                    }
                    
                    // Ajustes por calidad de datos
                    if (oandaData.price.qualityScore >= 90) {
                        finalConfidence = Math.min(90, finalConfidence + 3);
                    } else if (oandaData.price.qualityScore < 60) {
                        finalConfidence = Math.max(35, finalConfidence - 5);
                    }
                    
                    // Ajustes tradicionales
                    if (oandaData.price.volume > 150000) {
                        finalConfidence = Math.min(90, finalConfidence + 2);
                    }
                    
                    if (oandaData.price.spread > 2.0) {
                        finalConfidence = Math.max(35, finalConfidence - 3);
                    }
                }

                // 🔥 CORREGIR: AJUSTE CON DATOS TWELVEDATA (20% peso)
                if (combinedAnalysis.twelveData) {
                    console.log('📊 Ajuste con datos TwelveData (20% peso)');
                    
                    const twelveScore = this.calculateTwelveDataScore(combinedAnalysis.twelveData);
                    finalConfidence = Math.min(90, finalConfidence + twelveScore);
                    
                    console.log(`✅ TwelveData Score aplicado: +${twelveScore}% confianza`);
                    
                    // 🔥 NUEVO: Ajuste direccional por Golden Cross
                    if (combinedAnalysis.twelveData.goldenCrossAnalysis) {
                        const gcAnalysis = combinedAnalysis.twelveData.goldenCrossAnalysis;
                        console.log(`🏆 Golden Cross Status: ${gcAnalysis.status} (${gcAnalysis.signal})`);
                        
                        // Si hay conflicto entre Investing y Golden Cross, reducir confianza
                        if (gcAnalysis.signal === 'STRONG_BUY' && finalDirection === 'BEARISH') {
                            finalConfidence = Math.max(40, finalConfidence - 10);
                            console.log('⚠️ Conflicto: Golden Cross alcista vs Investing bajista, -10% confianza');
                        } else if (gcAnalysis.signal === 'STRONG_SELL' && finalDirection === 'BULLISH') {
                            finalConfidence = Math.max(40, finalConfidence - 10);
                            console.log('⚠️ Conflicto: Golden Cross bajista vs Investing alcista, -10% confianza');
                        }
                        
                        // Si hay alineación, boost adicional
                        if ((gcAnalysis.signal.includes('BUY') && finalDirection === 'BULLISH') ||
                            (gcAnalysis.signal.includes('SELL') && finalDirection === 'BEARISH')) {
                            finalConfidence = Math.min(90, finalConfidence + 3);
                            console.log('✅ Alineación Golden Cross - Investing, +3% confianza');
                        }
                    }
                } else {
                    console.warn('⚠️ No hay datos de TwelveData para ajustar confianza');
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
                basedOnRealData: investingData?.isReal || false,
                // 🔥 Mejorar información de dual-source
                dataQuality: {
                    oandaStatus: oandaData?.price?.validationStatus || 'UNKNOWN',
                    qualityScore: oandaData?.price?.qualityScore || 50,
                    alphaVantagePrice: oandaData?.price?.alphaVantagePrice || null,
                    alphaVantageStatus: oandaData?.price?.alphaVantagePrice ? 'AVAILABLE' : 'RATE_LIMITED'
                },
                // 🔥 NUEVO: Información de TwelveData
                twelveDataInfo: combinedAnalysis.twelveData ? {
                    goldenCrossStatus: combinedAnalysis.twelveData.goldenCrossAnalysis?.status || 'UNKNOWN',
                    goldenCrossSignal: combinedAnalysis.twelveData.goldenCrossAnalysis?.signal || 'NEUTRAL',
                    confidence: combinedAnalysis.twelveData.goldenCrossAnalysis?.confidence || 0,
                    validIndicators: Object.values(combinedAnalysis.twelveData.indicators).filter(ind => ind.isValid).length
                } : null
            };
            
            console.log(`🎯 VEREDICTO FINAL (DUAL-SOURCE + TWELVEDATA):`, verdict);
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

    // 🔥 CORREGIR: Combinar análisis CON TwelveData incluido
    combineAnalysis(oandaData, investingData, twelveDataData) {
        console.log('🔗 Combinando análisis - Datos recibidos:', {
            oanda: !!oandaData,
            investing: !!investingData,
            twelveData: !!twelveDataData,
            investingIsReal: investingData?.isReal,
            oandaValidation: oandaData?.price?.validationStatus,
            goldenCrossStatus: twelveDataData?.goldenCrossAnalysis?.status
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

        // 🔥 NUEVO: Procesar señales de TwelveData
        if (twelveDataData && twelveDataData.success) {
            console.log('📊 Procesando señales de TwelveData...');
            
            // Agregar señales de medias móviles individuales
            Object.entries(twelveDataData.signals).forEach(([key, signal]) => {
                if (signal && signal !== 'NEUTRAL') {
                    signals.push({
                        indicator: `TwelveData_${key}`,
                        signal: this.convertTwelveDataSignal(signal),
                        weight: this.getTwelveDataIndicatorWeight(key),
                        source: 'twelvedata'
                    });
                }
            });
            
            // Agregar señal del Golden Cross con peso alto
            if (twelveDataData.goldenCrossAnalysis && twelveDataData.goldenCrossAnalysis.signal !== 'NEUTRAL') {
                signals.push({
                    indicator: 'GoldenCross',
                    signal: this.convertTwelveDataSignal(twelveDataData.goldenCrossAnalysis.signal),
                    weight: 0.25, // Peso alto para Golden Cross
                    source: 'twelvedata_gc'
                });
            }
        }

        // Procesar señales de OANDA con peso ajustado por calidad
        if (oandaData && oandaData.indicators) {
            let oandaWeight = 0.1;
            
            // Ajustar peso según calidad de datos dual-source
            if (oandaData.price && oandaData.price.validationStatus === 'CROSS_VALIDATED') {
                oandaWeight = 0.15; // Más peso si está validado cruzadamente
            }
            
            Object.entries(oandaData.indicators).forEach(([key, value]) => {
                if (value && typeof value === 'string') {
                    signals.push({
                        indicator: key,
                        signal: value,
                        weight: oandaWeight,
                        source: 'oanda_dual'
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
            oanda: oandaData,
            twelveData: twelveDataData // 🔥 INCLUIR TWELVEDATA
        };

        console.log('🔗 Análisis combinado completado:', {
            totalSignals: signals.length,
            bullishPoints: bullishPoints.toFixed(2),
            bearishPoints: bearishPoints.toFixed(2),
            hasRealData: investingData?.isReal,
            oandaValidation: oandaData?.price?.validationStatus,
            twelveDataSignals: twelveDataData ? Object.keys(twelveDataData.signals).length : 0
        });

        return result;
    }

    // 🔥 NUEVAS FUNCIONES AUXILIARES PARA TWELVEDATA
    convertTwelveDataSignal(signal) {
        const signalMap = {
            'STRONG_BUY': 'Strong Buy',
            'BUY': 'Buy',
            'NEUTRAL': 'Neutral',
            'SELL': 'Sell',
            'STRONG_SELL': 'Strong Sell'
        };
        return signalMap[signal] || 'Neutral';
    }

    getTwelveDataIndicatorWeight(indicatorKey) {
        const weights = {
            'SMA_50': 0.15,
            'SMA_200': 0.20,
            'SMA_300': 0.10,
            'VWAP': 0.15,
            'RSI': 0.10
        };
        return weights[indicatorKey] || 0.05;
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
        const trendSignals = signals.filter(s => s.indicator.includes('MA') || s.indicator.includes('SMA'));
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
            ['RSI', 'STOCH', 'MACD', 'Momentum', 'VWAP'].includes(s.indicator) ||
            s.indicator.includes('TwelveData_RSI') || s.indicator.includes('TwelveData_VWAP')
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
        
        const indicators = {
            price_trend: priceData.mid > priceData.open ? 'Buy' : 'Sell',
            volume_signal: priceData.volume > 100000 ? 'Buy' : 'Neutral'
        };
        
        // Agregar indicadores específicos de dual-source
        if (priceData.validationStatus) {
            indicators.validation_status = priceData.validationStatus === 'CROSS_VALIDATED' ? 'Buy' : 'Neutral';
        }
        
        return indicators;
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
                    instrument: this.convertToOandaFormat(ticker),
                    validationStatus: 'FALLBACK',
                    qualityScore: 40
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
                basedOnRealData: false,
                dataQuality: {
                    oandaStatus: 'FALLBACK',
                    qualityScore: 40,
                    alphaVantagePrice: null
                }
            },
            timestamp: new Date().toISOString()
        };
    }

    // 🔥 FUNCIÓN CORREGIDA: Calcular score de TwelveData
    calculateTwelveDataScore(twelveDataResult) {
        if (!twelveDataResult || !twelveDataResult.success) {
            return 0;
        }
        
        const { summary, confidence, overallRecommendation, goldenCrossAnalysis } = twelveDataResult;
        let score = 0;
        
        // Base score según consistencia de señales
        const totalSignals = summary.totalSignals;
        const maxSignals = Math.max(summary.bullishSignals, summary.bearishSignals);
        const consistency = totalSignals > 0 ? (maxSignals / totalSignals) : 0;
        
        // Score base (max 5 puntos por consistencia)
        score += consistency * 5;
        
        // Bonus por recomendación fuerte (max 4 puntos)
        if (overallRecommendation === 'STRONG_BUY' || overallRecommendation === 'STRONG_SELL') {
            score += 4;
        } else if (overallRecommendation === 'BUY' || overallRecommendation === 'SELL') {
            score += 2;
        }
        
        // Bonus por confianza de Golden Cross (max 3 puntos)
        if (goldenCrossAnalysis && goldenCrossAnalysis.confidence) {
            if (goldenCrossAnalysis.confidence >= 80) {
                score += 3;
            } else if (goldenCrossAnalysis.confidence >= 65) {
                score += 2;
            } else if (goldenCrossAnalysis.confidence >= 50) {
                score += 1;
            }
        }
        
        // Bonus por indicadores válidos (max 3 puntos)
        const validIndicators = Object.values(twelveDataResult.indicators).filter(ind => ind.isValid).length;
        if (validIndicators >= 4) {
            score += 3;
        } else if (validIndicators >= 3) {
            score += 2;
        } else if (validIndicators >= 2) {
            score += 1;
        }
        
        console.log(`📊 TwelveData Score calculado: ${score}/15 (Consistencia: ${consistency.toFixed(2)}, Válidos: ${validIndicators}/5, GC Conf: ${goldenCrossAnalysis?.confidence || 0}%)`);
        
        return Math.round(Math.min(15, score)); // Max 15 puntos
    }
}

// Asegurar que esté disponible globalmente
window.StrategyEngine = StrategyEngine;
console.log('✅ StrategyEngine cargado correctamente');