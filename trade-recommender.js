class TradeRecommender {
    constructor() {
        this.minimumConfidence = 60; // Reducir de 65% a 60%
        this.riskRewardRatio = 2.0;
    }

    generateTradeRecommendation(analysis, orderFlow, news, currentPrice) {
        console.log('🎯 Generando recomendación de trade para 15min...');
        
        try {
            // 1. EVALUAR SI HAY SUFICIENTE CONFIANZA
            const overallConfidence = this.calculateOverallConfidence(analysis, orderFlow, news);
            
            if (overallConfidence.percentage < this.minimumConfidence) {
                return this.getNoTradeRecommendation(overallConfidence, news);
            }
            
            // 2. DETERMINAR DIRECCIÓN DEL TRADE
            const tradeDirection = this.determineTradeDirection(analysis, orderFlow);
            
            if (tradeDirection === 'NO_TRADE') {
                return this.getNoTradeRecommendation(overallConfidence, news);
            }
            
            // 3. CALCULAR NIVELES DE ENTRADA, SL Y TP
            const tradeLevels = this.calculateTradeLevels(
                tradeDirection, 
                currentPrice, 
                analysis, 
                orderFlow,
                overallConfidence.percentage
            );
            
            // 4. EVALUAR RIESGOS DE NOTICIAS
            const newsRisk = this.evaluateNewsRisk(news);
            
            // 5. AJUSTAR TAMAÑO DE POSICIÓN
            const positionSize = this.calculatePositionSize(
                overallConfidence.percentage, 
                newsRisk.level,
                analysis.verdict?.riskLevel
            );
            
            // 6. GENERAR RECOMENDACIÓN FINAL
            return {
                action: 'TRADE_RECOMMENDED',
                direction: tradeDirection,
                timeframe: '15min',
                confidence: overallConfidence.percentage,
                
                // NIVELES REALES
                entry: tradeLevels.entry,
                stopLoss: tradeLevels.stopLoss,
                takeProfit: tradeLevels.takeProfit,
                
                // GESTIÓN DE RIESGO
                riskReward: tradeLevels.riskReward,
                positionSize: positionSize,
                maxRisk: '1-2% del capital',
                
                // JUSTIFICACIÓN
                reasoning: this.buildTradeReasoning(analysis, orderFlow, overallConfidence),
                newsAlert: newsRisk.alert,
                
                // CONDICIONES
                validUntil: this.calculateValidUntil(),
                marketCondition: this.assessMarketCondition(analysis, news),
                
                // DATOS TÉCNICOS
                currentPrice: currentPrice,
                spread: this.estimateSpread(analysis.oanda),
                
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Error generando recomendación de trade:', error);
            return this.getErrorRecommendation();
        }
    }

    calculateOverallConfidence(analysis, orderFlow, news) {
        let totalWeight = 0;
        let weightedScore = 0;
        
        // Análisis principal (investing.com) - PESO AUMENTADO A 70%
        if (analysis.investing) {
            const investingWeight = 0.7; // Aumentado de 0.5 a 0.7
            let investingScore = 0;
            
            if (analysis.investing.isReal) {
                investingScore = analysis.investing.confidence / 100;
                console.log(`📊 Investing REAL: ${analysis.investing.confidence}% (peso 70%)`);
            } else if (analysis.investing.confidence) {
                // Incluso si es simulado, darle peso si tiene datos válidos
                investingScore = (analysis.investing.confidence / 100) * 0.8; // 80% del valor
                console.log(`📊 Investing simulado: ${analysis.investing.confidence}% (peso 70% x 0.8)`);
            }
            
            if (investingScore > 0) {
                weightedScore += investingScore * investingWeight;
                totalWeight += investingWeight;
            }
        }
        
        // Order Flow - PESO REDUCIDO A 20%
        if (orderFlow.prediction && orderFlow.prediction.probability > 50) {
            const orderFlowWeight = 0.2; // Reducido de 0.3 a 0.2
            const orderFlowScore = orderFlow.prediction.probability / 100;
            weightedScore += orderFlowScore * orderFlowWeight;
            totalWeight += orderFlowWeight;
            console.log(`💧 Order Flow: ${orderFlow.prediction.probability}% (peso 20%)`);
        }
        
        // OANDA (precio real) - PESO REDUCIDO A 10%
        if (analysis.oanda && analysis.oanda.price) {
            const oandaWeight = 0.1; // Reducido de 0.2 a 0.1
            const oandaScore = 0.7;
            weightedScore += oandaScore * oandaWeight;
            totalWeight += oandaWeight;
            console.log(`🏦 OANDA: Datos reales (peso 10%)`);
        }
        
        const finalConfidence = totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0;
        
        return {
            percentage: Math.round(finalConfidence),
            components: {
                investing: analysis.investing?.confidence || 0,
                orderFlow: orderFlow.prediction?.probability || 0,
                oanda: analysis.oanda?.price ? 70 : 0
            },
            hasRealData: analysis.investing?.isReal || false
        };
    }

    determineTradeDirection(analysis, orderFlow) {
        const signals = [];
        
        // Señal de Investing (PESO MUCHÍSIMO MAYOR - 80%)
        if (analysis.investing && analysis.investing.recommendation) {
            let weight = 0.8; // Aumentado a 80%
            
            // Si es dato real, darle aún más peso
            if (analysis.investing.isReal) {
                weight = 0.9; // 90% si es real
            }
            
            if (analysis.investing.recommendation.includes('BUY')) {
                signals.push({ direction: 'LONG', weight: weight, source: 'investing' });
                console.log(`📊 Investing: ${analysis.investing.recommendation} -> LONG (peso ${weight})`);
            } else if (analysis.investing.recommendation.includes('SELL')) {
                signals.push({ direction: 'SHORT', weight: weight, source: 'investing' });
                console.log(`📊 Investing: ${analysis.investing.recommendation} -> SHORT (peso ${weight})`);
            } else {
                signals.push({ direction: 'NEUTRAL', weight: weight * 0.5, source: 'investing' });
                console.log(`📊 Investing: ${analysis.investing.recommendation} -> NEUTRAL (peso ${weight * 0.5})`);
            }
        }
        
        // Señal de Order Flow (PESO MUCHO MENOR - 20%)
        if (orderFlow.prediction) {
            const weight = 0.2; // Reducido a 20%
            
            if (orderFlow.prediction.direction === 'ALCISTA') {
                signals.push({ direction: 'LONG', weight: weight, source: 'orderflow' });
            } else if (orderFlow.prediction.direction === 'BAJISTA') {
                signals.push({ direction: 'SHORT', weight: weight, source: 'orderflow' });
            }
            console.log(`💧 Order Flow: ${orderFlow.prediction.direction} (peso ${weight})`);
        }
        
        // Calcular consenso
        let longWeight = 0;
        let shortWeight = 0;
        let neutralWeight = 0;
        
        signals.forEach(signal => {
            if (signal.direction === 'LONG') longWeight += signal.weight;
            else if (signal.direction === 'SHORT') shortWeight += signal.weight;
            else if (signal.direction === 'NEUTRAL') neutralWeight += signal.weight;
        });
        
        console.log(`🎯 Pesos finales: LONG: ${longWeight.toFixed(2)}, SHORT: ${shortWeight.toFixed(2)}, NEUTRAL: ${neutralWeight.toFixed(2)}`);
        
        // Decisión basada en investing principalmente
        if (longWeight > shortWeight && longWeight > neutralWeight && longWeight >= 0.4) {
            console.log(`📈 DECISIÓN: LONG (${longWeight.toFixed(2)} > ${Math.max(shortWeight, neutralWeight).toFixed(2)})`);
            return 'LONG';
        } else if (shortWeight > longWeight && shortWeight > neutralWeight && shortWeight >= 0.4) {
            console.log(`📉 DECISIÓN: SHORT (${shortWeight.toFixed(2)} > ${Math.max(longWeight, neutralWeight).toFixed(2)})`);
            return 'SHORT';
        }
        
        console.log(`🔄 Sin consenso suficiente para trade`);
        return 'NO_TRADE';
    }

    calculateTradeLevels(direction, currentPrice, analysis, orderFlow, confidence) {
        console.log(`💰 Calculando niveles para ${direction} desde precio ${currentPrice}`);
        
        // Obtener ATR/volatilidad estimada
        const atr = this.estimateATR(analysis.oanda, currentPrice);
        console.log(`📊 ATR estimado: ${atr}`);
        
        // Calcular niveles basados en confianza
        const confidenceMultiplier = confidence / 100;
        const baseDistance = atr * 0.5; // 50% del ATR como base
        
        let entry, stopLoss, takeProfit;
        
        if (direction === 'LONG') {
            // LONG Trade
            entry = currentPrice + (atr * 0.1); // Entrada ligeramente por encima del precio actual
            stopLoss = entry - (baseDistance * 1.5); // 1.5x distancia base para SL
            takeProfit = entry + (baseDistance * 3.0 * confidenceMultiplier); // TP ajustado por confianza
            
        } else {
            // SHORT Trade
            entry = currentPrice - (atr * 0.1); // Entrada ligeramente por debajo del precio actual
            stopLoss = entry + (baseDistance * 1.5); // 1.5x distancia base para SL
            takeProfit = entry - (baseDistance * 3.0 * confidenceMultiplier); // TP ajustado por confianza
        }
        
        // Calcular Risk:Reward
        const riskDistance = Math.abs(entry - stopLoss);
        const rewardDistance = Math.abs(takeProfit - entry);
        const riskReward = rewardDistance / riskDistance;
        
        console.log(`🎯 Niveles calculados: Entry=${entry.toFixed(4)}, SL=${stopLoss.toFixed(4)}, TP=${takeProfit.toFixed(4)}, RR=${riskReward.toFixed(2)}`);
        
        return {
            entry: entry.toFixed(4),
            stopLoss: stopLoss.toFixed(4),
            takeProfit: takeProfit.toFixed(4),
            riskReward: riskReward.toFixed(2),
            atrUsed: atr.toFixed(4)
        };
    }

    estimateATR(oandaData, currentPrice) {
        // Si tenemos datos históricos de OANDA, calcular ATR real
        if (oandaData && oandaData.historicalData && oandaData.historicalData.length > 0) {
            const data = oandaData.historicalData.slice(-14); // Últimas 14 velas
            let totalTR = 0;
            
            data.forEach((candle, index) => {
                if (index > 0) {
                    const high = candle.high;
                    const low = candle.low;
                    const prevClose = data[index - 1].close;
                    
                    const tr = Math.max(
                        high - low,
                        Math.abs(high - prevClose),
                        Math.abs(low - prevClose)
                    );
                    totalTR += tr;
                }
            });
            
            return totalTR / (data.length - 1);
        }
        
        // Fallback: estimar ATR basado en el precio actual
        if (currentPrice > 3000) {
            // XAU/USD - ATR típico 15-25
            return currentPrice * 0.005; // 0.5%
        } else if (currentPrice > 100) {
            // Pares JPY - ATR típico 0.5-1.0
            return currentPrice * 0.006; // 0.6%
        } else {
            // Majors - ATR típico 0.0080-0.0150
            return currentPrice * 0.008; // 0.8%
        }
    }

    evaluateNewsRisk(news) {
        if (!news || !news.warnings) {
            return { level: 'LOW', alert: null };
        }
        
        const highRiskWarnings = news.warnings.filter(w => w.type === 'HIGH_RISK');
        
        if (highRiskWarnings.length > 0) {
            return {
                level: 'HIGH',
                alert: `⚠️ ALTO RIESGO: ${highRiskWarnings[0].message}`,
                recommendation: 'Considerar reducir tamaño de posición o esperar'
            };
        }
        
        if (news.marketImpact && news.marketImpact.level === 'HIGH') {
            return {
                level: 'MEDIUM',
                alert: `📊 Impacto moderado: ${news.marketImpact.description}`,
                recommendation: 'Operar con precaución'
            };
        }
        
        return { level: 'LOW', alert: null };
    }

    calculatePositionSize(confidence, newsRisk, riskLevel) {
        let baseSize = 0.02; // 2% base del capital
        
        // Ajustar por confianza
        if (confidence > 80) baseSize = 0.025; // 2.5%
        else if (confidence < 70) baseSize = 0.015; // 1.5%
        
        // Ajustar por riesgo de noticias
        if (newsRisk === 'HIGH') baseSize *= 0.5; // Reducir 50%
        else if (newsRisk === 'MEDIUM') baseSize *= 0.75; // Reducir 25%
        
        // Ajustar por nivel de riesgo general
        if (riskLevel === 'HIGH') baseSize *= 0.7;
        
        return `${(baseSize * 100).toFixed(1)}% del capital`;
    }

    buildTradeReasoning(analysis, orderFlow, overallConfidence) {
        const reasons = [];
        
        if (analysis.investing && analysis.investing.isReal) {
            reasons.push(`📊 Investing.com: ${analysis.investing.recommendation} (${analysis.investing.confidence}% confianza)`);
        }
        
        if (orderFlow.prediction) {
            reasons.push(`💧 Order Flow: ${orderFlow.prediction.direction} (${orderFlow.prediction.probability}% probabilidad)`);
        }
        
        if (analysis.oanda && analysis.oanda.price) {
            reasons.push(`🏦 OANDA: Precio real $${analysis.oanda.price.mid.toFixed(4)}`);
        }
        
        reasons.push(`🎯 Confianza general: ${overallConfidence.percentage}%`);
        
        return reasons;
    }

    calculateValidUntil() {
        const now = new Date();
        const validUntil = new Date(now.getTime() + (15 * 60 * 1000)); // 15 minutos
        return validUntil.toLocaleTimeString();
    }

    assessMarketCondition(analysis, news) {
        if (news.warnings && news.warnings.length > 0) {
            return 'VOLÁTIL - Alta actividad de noticias';
        }
        
        if (analysis.oanda && analysis.oanda.price && analysis.oanda.price.spread > 2.0) {
            return 'SPREAD ALTO - Liquidez reducida';
        }
        
        return 'NORMAL - Condiciones estables';
    }

    estimateSpread(oandaData) {
        if (oandaData && oandaData.price && oandaData.price.spread) {
            return `${oandaData.price.spread.toFixed(1)} pips`;
        }
        return 'N/A';
    }

    getNoTradeRecommendation(confidence, news) {
        return {
            action: 'NO_TRADE',
            reason: confidence.percentage < this.minimumConfidence ? 
                   `Confianza insuficiente (${confidence.percentage}% < ${this.minimumConfidence}%)` :
                   'Señales contradictorias',
            confidence: confidence.percentage,
            recommendation: 'Esperar mejores condiciones de entrada',
            nextCheck: 'Revisar en 15-30 minutos',
            newsAlert: news.warnings && news.warnings.length > 0 ? 
                      'Actividad de noticias detectada' : null,
            timestamp: new Date().toISOString()
        };
    }

    getErrorRecommendation() {
        return {
            action: 'ERROR',
            reason: 'Error al procesar análisis',
            recommendation: 'No operar hasta resolver el problema',
            timestamp: new Date().toISOString()
        };
    }
}

// Asegurar que esté disponible globalmente
window.TradeRecommender = TradeRecommender;
console.log('✅ TradeRecommender cargado correctamente');
