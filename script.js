class TradingStrategyApp {
    constructor() {
        // Verificar todas las dependencias antes de continuar
        this.checkDependencies();
        
        this.strategyEngine = new StrategyEngine();
        this.orderFlowAnalyzer = new OrderFlowAnalyzer();
        
        // ✅ Verificar que TradeRecommender esté disponible antes de instanciar
        if (typeof TradeRecommender !== 'undefined') {
            this.tradeRecommender = new TradeRecommender();
        } else {
            console.error('❌ TradeRecommender no está disponible');
            this.tradeRecommender = null;
        }
        
        this.currentTicker = 'XAUUSD';
        this.isAnalyzing = false;
        
        this.initializeApp();
    }

    checkDependencies() {
        const requiredClasses = [
            'OandaAPI',
            'InvestingScraper', 
            'OrderFlowAnalyzer',
            'StrategyEngine',
            'TradeRecommender'
        ];
        
        const missing = [];
        
        requiredClasses.forEach(className => {
            if (typeof window[className] === 'undefined') {
                missing.push(className);
            }
        });
        
        if (missing.length > 0) {
            const error = `❌ Dependencias faltantes: ${missing.join(', ')}`;
            console.error(error);
            throw new Error(error);
        }
        
        console.log('✅ Todas las dependencias están disponibles');
    }

    initializeApp() {
        this.setupEventListeners();
        this.loadInitialData();
    }

    setupEventListeners() {
        // Botón de análisis
        document.getElementById('analyzeBtn').addEventListener('click', () => {
            this.performAnalysis();
        });

        // Input de ticker
        const tickerInput = document.getElementById('tickerInput');
        tickerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performAnalysis();
            }
        });

        tickerInput.addEventListener('input', (e) => {
            this.currentTicker = e.target.value.toUpperCase();
        });

        // Botones de acción
        document.getElementById('saveAnalysis').addEventListener('click', () => {
            this.saveCurrentAnalysis();
        });

        document.getElementById('exportData').addEventListener('click', () => {
            this.exportCurrentAnalysis();
        });

        document.getElementById('clearHistory').addEventListener('click', () => {
            this.clearAnalysisHistory();
        });

        // Botones de pares rápidos
        document.querySelectorAll('.pair-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pair = e.target.dataset.pair;
                document.getElementById('tickerInput').value = pair;
                this.currentTicker = pair;
                
                // Actualizar botón activo
                document.querySelectorAll('.pair-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Auto-analizar si se desea
                // this.performAnalysis();
            });
        });
    }

    async loadInitialData() {
        // Cargar historial
        this.updateHistoryDisplay();
        
        // Mostrar estado inicial
        this.showInitialState();
        this.showOrderFlowInitialState();
    }

    showInitialState() {
        document.getElementById('verdictDirection').textContent = 'Presiona "Confirmar Estrategia" para analizar';
        document.getElementById('verdictDirection').className = 'neutral';
        
        document.getElementById('verdictConfidence').textContent = 'Esperando análisis...';
        document.getElementById('verdictConfidence').className = 'neutral';
        
        document.getElementById('oandaStatus').textContent = 'Listo para conectar';
        document.getElementById('oandaStatus').className = 'data-status';
        
        document.getElementById('investingStatus').textContent = 'Listo para obtener datos';
        document.getElementById('investingStatus').className = 'data-status';
        
        document.getElementById('oandaPrice').textContent = 'Haz clic para obtener precio';
        document.getElementById('investingOverview').textContent = 'Análisis pendiente';
    }

    showOrderFlowInitialState() {
        // Estados iniciales para Order Flow
        document.getElementById('liquidityLevel').textContent = 'Esperando datos...';
        document.getElementById('liquidityTrend').textContent = 'Pendiente de análisis';
        document.getElementById('orderFlowDirection').textContent = 'Sin datos';
        document.getElementById('orderFlowStrength').textContent = 'Calculando...';
        document.getElementById('imbalanceStatus').textContent = 'No detectados';
        document.getElementById('nextLevel').textContent = '--';
        document.getElementById('criticalZone').textContent = '--';
        document.getElementById('volumeProfile').textContent = 'Generando perfil...';
        document.getElementById('pocLevel').textContent = '--';
        document.getElementById('vpocStrength').textContent = '--';
        document.getElementById('predictionDirection').textContent = 'PENDIENTE';
        document.getElementById('predictionProbability').textContent = '-- %';
        document.getElementById('targetPrice').textContent = '--';
        document.getElementById('estimatedTime').textContent = '--';
        document.getElementById('stopLevel').textContent = '--';
    }

    async performAnalysis() {
        if (this.isAnalyzing) {
            this.showNotification('⏳ Análisis ya en progreso...');
            return;
        }
        
        try {
            this.isAnalyzing = true;
            this.showLoadingStates();
            
            // Actualizar ticker actual
            this.currentTicker = document.getElementById('tickerInput').value.toUpperCase() || 'XAUUSD';
            
            this.showNotification('🔍 Iniciando análisis completo...');
            
            console.log(`🔍 Iniciando análisis para ${this.currentTicker}...`);
            
            // Realizar análisis completo con manejo de errores individual
            let analysis, orderFlowAnalysis, newsAnalysis;
            
            try {
                console.log('📊 Ejecutando análisis principal...');
                analysis = await this.strategyEngine.performCompleteAnalysis(this.currentTicker);
                console.log('✅ Análisis principal completado:', analysis);
            } catch (error) {
                console.error('❌ Error en análisis principal:', error);
                analysis = this.getFallbackAnalysis();
            }
            
            try {
                console.log('💧 Ejecutando análisis Order Flow...');
                orderFlowAnalysis = await this.performOrderFlowAnalysis(this.currentTicker);
                console.log('✅ Order Flow completado:', orderFlowAnalysis);
            } catch (error) {
                console.error('❌ Error en Order Flow:', error);
                orderFlowAnalysis = this.orderFlowAnalyzer.getFallbackOrderFlowData();
            }
            
            try {
                console.log('📰 Ejecutando análisis de noticias...');
                newsAnalysis = await this.performNewsAnalysis(this.currentTicker);
                console.log('✅ Noticias completadas:', newsAnalysis);
            } catch (error) {
                console.error('❌ Error en noticias:', error);
                newsAnalysis = this.getFallbackNewsData();
            }
            
            console.log('🔍 Análisis completados:', { analysis, orderFlowAnalysis, newsAnalysis });
            
            // Verificar que tenemos datos válidos antes de continuar
            if (!analysis || !analysis.verdict) {
                console.error('❌ Análisis principal no tiene datos válidos');
                analysis = this.getFallbackAnalysis();
            }
            
            // GENERAR RECOMENDACIÓN DE TRADE - ARREGLAR LÓGICA
            let tradeRecommendation = null;
            if (this.tradeRecommender) {
                try {
                    // Usar precio de investing si OANDA no está disponible
                    const currentPrice = analysis?.oanda?.price?.mid || 
                                         analysis?.investing?.currentPrice || 
                                         3362.895; // fallback price
                    
                    tradeRecommendation = this.tradeRecommender.generateTradeRecommendation(
                        analysis,
                        orderFlowAnalysis,
                        newsAnalysis,
                        currentPrice
                    );
                } catch (error) {
                    console.error('❌ Error generando recomendación de trade:', error);
                    tradeRecommendation = this.getFallbackTradeRecommendation();
                }
            } else {
                console.warn('⚠️ TradeRecommender no disponible, saltando recomendación');
                tradeRecommendation = this.getFallbackTradeRecommendation();
            }
            
            // Actualizar interfaz con datos seguros
            this.updateUI(analysis);
            this.updateOrderFlowUI(orderFlowAnalysis);
            this.updateNewsUI(newsAnalysis);
            this.updateTradeRecommendationUI(tradeRecommendation);
            
            // Guardar análisis actual
            this.currentAnalysis = {
                ...analysis,
                orderFlow: orderFlowAnalysis,
                news: newsAnalysis,
                tradeRecommendation: tradeRecommendation
            };
            
            this.showNotification('✅ Análisis completo finalizado');
            
        } catch (error) {
            console.error('Error en análisis:', error);
            this.showError('Error al realizar análisis. Verificar conexión.');
            this.showNotification('❌ Error en el análisis', 'error');
        } finally {
            this.isAnalyzing = false;
            
            // Rehabilitar botón siempre
            const analyzeBtn = document.getElementById('analyzeBtn');
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'Confirmar Estrategia';
        }
    }

    getFallbackAnalysis() {
        console.log('🔄 Generando análisis de fallback...');
        
        return {
            oanda: {
                price: {
                    mid: 3362.895,
                    high: 3363.6,
                    low: 3361.635,
                    spread: 0.5,
                    volume: 150000
                }
            },
            investing: {
                recommendation: 'NEUTRAL',
                confidence: 50,
                timeframe: '15m',
                isReal: false,
                movingAverages: { summary: 'Neutral' },
                oscillators: { summary: 'Neutral' }
            },
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
                timestamp: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
        };
    }

    updateUI(analysis) {
        try {
            console.log('🎨 Actualizando UI con análisis:', analysis);
            
            // Verificar que analysis tiene la estructura correcta
            if (!analysis || !analysis.verdict) {
                console.error('❌ Análisis no válido para UI, usando fallback');
                analysis = this.getFallbackAnalysis();
            }
            
            // Actualizar veredicto final
            this.updateFinalVerdict(analysis.verdict);
            
            // Actualizar datos de OANDA
            this.updateOandaData(analysis.oanda);
            
            // Actualizar datos de Investing
            this.updateInvestingData(analysis.investing);
            
            // Actualizar indicadores combinados
            this.updateCombinedIndicators(analysis.combined);
            
            // Actualizar confirmación de estrategia
            this.updateStrategyConfirmation(analysis.combined, analysis.verdict);
            
        } catch (error) {
            console.error('❌ Error actualizando UI:', error);
            this.showError('Error en la interfaz');
        }
    }

    async performOrderFlowAnalysis(ticker) {
        try {
            this.showNotification('💧 Analizando Order Flow y liquidez...');
            
            // Obtener datos históricos para Order Flow
            const oandaInstrument = this.convertToOandaFormat(ticker);
            const historicalData = await this.orderFlowAnalyzer.oandaAPI.getHistoricalData(oandaInstrument, 50);
            
            // Realizar análisis de Order Flow
            const orderFlowResult = await this.orderFlowAnalyzer.analyzeOrderFlow(oandaInstrument, historicalData);
            
            return orderFlowResult;
        } catch (error) {
            console.error('Error en análisis Order Flow:', error);
            return this.orderFlowAnalyzer.getFallbackOrderFlowData();
        }
    }

    async performNewsAnalysis(ticker) {
        try {
            this.showNotification('📰 Analizando noticias y alertas...');
            
            console.log(`📰 Solicitando noticias para ${ticker} al servidor...`);
            
            const response = await fetch(`http://localhost:3002/api/news/${ticker}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 15000 // 15 segundos timeout para noticias
            });
            
            console.log(`🌐 Respuesta noticias: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
                const newsData = await response.json();
                
                console.log(`📦 Datos de noticias recibidos:`, newsData);
                
                if (newsData && newsData.isReal) {
                    console.log('✅ NOTICIAS REALES obtenidas del servidor');
                    
                    // Mostrar warnings críticos inmediatamente
                    this.showCriticalWarnings(newsData.warnings);
                    return newsData;
                } else if (newsData) {
                    console.warn('⚠️ Noticias de fallback del servidor');
                    return newsData;
                }
            } else {
                console.error(`❌ Error del servidor de noticias: ${response.status} ${response.statusText}`);
            }
            
            console.warn('❌ Error obteniendo noticias del servidor, usando fallback local');
            return this.getFallbackNewsData();
            
        } catch (error) {
            console.error('Error en análisis de noticias:', error);
            console.warn('❌ Usando fallback de noticias por error de conexión');
            return this.getFallbackNewsData();
        }
    }

    getFallbackNewsData() {
        console.log('🔄 Generando noticias de fallback locales...');
        
        // Generar noticias más realistas
        const newsTemplates = [
            {
                title: `Análisis del mercado para ${this.currentTicker}: Consolidación esperada`,
                time: 'Hace 2 horas',
                impact: 'MEDIUM'
            },
            {
                title: `Volumen de trading ${this.currentTicker} por encima del promedio`,
                time: 'Hace 1 hora',
                impact: 'LOW'
            },
            {
                title: `Análisis técnico sugiere niveles clave para ${this.currentTicker}`,
                time: 'Hace 45 minutos',
                impact: 'LOW'
            }
        ];
        
        return {
            recentNews: newsTemplates,
            marketImpact: {
                level: 'LOW',
                description: 'Condiciones normales del mercado - Sin eventos significativos'
            },
            warnings: [], // Sin warnings para evitar alertas falsas
            sentiment: 'NEUTRAL',
            isReal: false,
            timestamp: new Date().toISOString(),
            source: 'local_fallback'
        };
    }

    convertToOandaFormat(ticker) {
        // Solo los pares Forex que realmente operas
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

    showLoadingStates() {
        // Estados de carga
        document.getElementById('verdictDirection').textContent = 'Analizando...';
        document.getElementById('verdictDirection').className = 'loading';
        
        document.getElementById('verdictConfidence').textContent = 'Calculando confianza...';
        document.getElementById('verdictConfidence').className = 'loading';
        
        document.getElementById('oandaStatus').textContent = 'Conectando a OANDA...';
        document.getElementById('oandaStatus').className = 'data-status loading';
        
        document.getElementById('investingStatus').textContent = 'Obteniendo datos técnicos...';
        document.getElementById('investingStatus').className = 'data-status loading';
        
        document.getElementById('oandaPrice').textContent = 'Cargando...';
        document.getElementById('investingOverview').textContent = 'Procesando...';
        
        // Estados de carga para Order Flow
        this.showOrderFlowLoadingStates();
        
        // Estados de carga para noticias
        document.getElementById('newsOverview').textContent = 'Obteniendo noticias...';
        document.getElementById('marketImpact').textContent = 'Analizando impacto...';
        document.getElementById('newsWarnings').textContent = 'Verificando alertas...';
        
        // Deshabilitar botón mientras analiza
        const analyzeBtn = document.getElementById('analyzeBtn');
        analyzeBtn.disabled = true;
        analyzeBtn.textContent = 'Analizando...';
    }

    showOrderFlowLoadingStates() {
        document.getElementById('liquidityLevel').textContent = 'Analizando liquidez...';
        document.getElementById('liquidityTrend').textContent = 'Calculando tendencia...';
        document.getElementById('orderFlowDirection').textContent = 'Detectando flujo...';
        document.getElementById('orderFlowStrength').textContent = 'Midiendo fuerza...';
        document.getElementById('imbalanceStatus').textContent = 'Buscando imbalances...';
        document.getElementById('volumeProfile').textContent = 'Creando perfil...';
        document.getElementById('predictionDirection').textContent = 'CALCULANDO...';
        document.getElementById('predictionProbability').textContent = 'Procesando...';
    }

    updateUI(analysis) {
        try {
            console.log('🎨 Actualizando UI con análisis:', analysis);
            
            // Verificar que analysis tiene la estructura correcta
            if (!analysis || !analysis.verdict) {
                console.error('❌ Análisis no válido para UI, usando fallback');
                analysis = this.getFallbackAnalysis();
            }
            
            // Actualizar veredicto final
            this.updateFinalVerdict(analysis.verdict);
            
            // Actualizar datos de OANDA
            this.updateOandaData(analysis.oanda);
            
            // Actualizar datos de Investing
            this.updateInvestingData(analysis.investing);
            
            // Actualizar indicadores combinados
            this.updateCombinedIndicators(analysis.combined);
            
            // Actualizar confirmación de estrategia
            this.updateStrategyConfirmation(analysis.combined, analysis.verdict);
            
        } catch (error) {
            console.error('❌ Error actualizando UI:', error);
            this.showError('Error en la interfaz');
        }
    }

    updateOrderFlowUI(orderFlowData) {
        if (!orderFlowData) return;
        
        // Actualizar liquidez
        this.updateLiquidityData(orderFlowData.liquidity);
        
        // Actualizar Order Flow
        this.updateOrderFlowData(orderFlowData.orderFlow);
        
        // Actualizar imbalances
        this.updateImbalanceData(orderFlowData.imbalances);
        
        // Actualizar perfil de volumen
        this.updateVolumeProfileData(orderFlowData.volumeProfile);
        
        // Actualizar predicción
        this.updatePredictionData(orderFlowData.prediction);
    }

    updateNewsUI(newsData) {
        if (!newsData) return;
        
        const statusElement = document.getElementById('newsStatus');
        
        // Actualizar overview de noticias
        if (newsData.recentNews && newsData.recentNews.length > 0) {
            const topNews = newsData.recentNews.slice(0, 3);
            document.getElementById('newsOverview').innerHTML = `
                <div style="font-size: 1.1rem; margin-bottom: 10px;">
                    <strong>Últimas ${topNews.length} noticias:</strong>
                </div>
                ${topNews.map(news => `
                    <div style="margin: 5px 0; padding: 5px; background: rgba(44, 52, 73, 0.3); border-radius: 4px;">
                        <div style="font-size: 0.9rem; color: #ccc;">${news.title}</div>
                        <div style="font-size: 0.8rem; color: #888;">${news.time} - Impacto: ${news.impact}</div>
                    </div>
                `).join('')}
            `;
        } else {
            document.getElementById('newsOverview').textContent = 'No hay noticias recientes';
        }
        
        // Actualizar impacto del mercado
        if (newsData.marketImpact) {
            const impact = newsData.marketImpact;
            document.getElementById('marketImpact').innerHTML = `
                <div style="text-align: center; margin: 10px 0;">
                    <div style="font-weight: bold; color: ${this.getImpactColor(impact.level)};">
                        📊 Impacto: ${impact.level}
                    </div>
                    <div style="font-size: 0.9rem; color: #ccc;">
                        ${impact.description}
                    </div>
                </div>
            `;
        }
        
        // Actualizar warnings
        if (newsData.warnings && newsData.warnings.length > 0) {
            document.getElementById('newsWarnings').innerHTML = `
                <div style="margin-top: 10px;">
                    <strong style="color: #ffa502;">⚠️ Alertas Activas:</strong>
                    ${newsData.warnings.map(warning => `
                        <div style="margin: 5px 0; padding: 8px; background: rgba(255, 165, 2, 0.1); border-left: 3px solid #ffa502; border-radius: 4px;">
                            <div style="font-size: 0.9rem; color: #ffa502;">${warning.message}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            document.getElementById('newsWarnings').innerHTML = `
                <div style="text-align: center; color: #00ff88; margin-top: 10px;">
                    ✅ No hay alertas activas
                </div>
            `;
        }
        
        // Actualizar status
        const dataSource = newsData.isReal ? '✅ REAL' : '⚠️ SIMULADO';
        statusElement.innerHTML = `${dataSource} - Noticias`;
        statusElement.className = `data-status ${newsData.isReal ? 'connected' : 'warning'}`;
    }

    showCriticalWarnings(warnings) {
        if (!warnings || warnings.length === 0) return;
        
        // Mostrar warnings críticos como notificaciones
        warnings.forEach(warning => {
            if (warning.type === 'HIGH_RISK') {
                this.showNotification(warning.message, 'warning');
            }
        });
        
        // Si hay warnings de alto riesgo, mostrar alerta
        const highRiskWarnings = warnings.filter(w => w.type === 'HIGH_RISK');
        if (highRiskWarnings.length > 0) {
            setTimeout(() => {
                if (confirm('🚨 ALERTA: Se detectaron eventos de alto riesgo. ¿Continuar con el análisis?')) {
                    console.log('Usuario decidió continuar a pesar de warnings');
                } else {
                    this.showNotification('⏸️ Análisis pausado por precaución', 'warning');
                }
            }, 2000);
        }
    }

    getImpactColor(level) {
        const colors = {
            'HIGH': '#ff4757',
            'MEDIUM': '#ffa502',
            'LOW': '#00ff88'
        };
        return colors[level] || '#888';
    }

    getFallbackNewsData() {
        console.log('🔄 Generando noticias de fallback locales...');
        
        // Generar noticias más realistas
        const newsTemplates = [
            {
                title: `Análisis del mercado para ${this.currentTicker}: Consolidación esperada`,
                time: 'Hace 2 horas',
                impact: 'MEDIUM'
            },
            {
                title: `Volumen de trading ${this.currentTicker} por encima del promedio`,
                time: 'Hace 1 hora',
                impact: 'LOW'
            },
            {
                title: `Análisis técnico sugiere niveles clave para ${this.currentTicker}`,
                time: 'Hace 45 minutos',
                impact: 'LOW'
            }
        ];
        
        return {
            recentNews: newsTemplates,
            marketImpact: {
                level: 'LOW',
                description: 'Condiciones normales del mercado - Sin eventos significativos'
            },
            warnings: [], // Sin warnings para evitar alertas falsas
            sentiment: 'NEUTRAL',
            isReal: false,
            timestamp: new Date().toISOString(),
            source: 'local_fallback'
        };
    }

    getFallbackTradeRecommendation() {
        return {
            action: 'NO_TRADE',
            reason: 'Sistema de recomendaciones no disponible',
            recommendation: 'Verificar carga de scripts',
            confidence: 0,
            timestamp: new Date().toISOString()
        };
    }

    updateFinalVerdict(verdict) {
        const directionElement = document.getElementById('verdictDirection');
        const confidenceElement = document.getElementById('verdictConfidence');
        
        // Dirección
        directionElement.textContent = verdict.direction;
        directionElement.className = verdict.direction.toLowerCase();
        
        // MOSTRAR CLARAMENTE SI ES BASADO EN DATOS REALES
        const realInvestingConfidence = this.currentAnalysis?.investing?.confidence || 0;
        const isRealData = this.currentAnalysis?.investing?.isReal || false;
        
        if (isRealData && realInvestingConfidence > 0) {
            confidenceElement.innerHTML = `
                <div style="font-size: 1.8rem; color: #00ff88;">${realInvestingConfidence}% Confianza</div>
                <div style="font-size: 1rem; color: #888;">
                    📊 Basado en datos REALES de investing.com
                </div>
            `;
        } else {
            confidenceElement.innerHTML = `
                <div style="font-size: 1.8rem; color: #ffa502;">${verdict.confidence}% Confianza</div>
                <div style="font-size: 1rem; color: #888;">
                    ⚠️ Basado en datos simulados
                </div>
            `;
        }
        
        confidenceElement.className = (isRealData ? realInvestingConfidence : verdict.confidence) >= 70 ? 'high-confidence' : 
                                    (isRealData ? realInvestingConfidence : verdict.confidence) >= 50 ? 'medium-confidence' : 'low-confidence';
        
        // Actualizar color de la tarjeta según dirección
        const verdictCard = document.getElementById('finalVerdict');
        verdictCard.className = `verdict-card ${verdict.direction.toLowerCase()}`;
        
        console.log(`🎯 UI actualizada: ${verdict.direction} (${isRealData ? realInvestingConfidence : verdict.confidence}% - ${isRealData ? 'REAL' : 'SIMULADO'})`);
    }

    updateOandaData(oandaData) {
        const statusElement = document.getElementById('oandaStatus');
        
        if (oandaData && oandaData.price) {
            // Precio actual
            document.getElementById('oandaPrice').textContent = `$${oandaData.price.mid.toFixed(4)}`;
            
            // Spread
            document.getElementById('oandaSpread').textContent = `Spread: ${oandaData.price.spread.toFixed(2)} pips`;
            
            // Volumen
            document.getElementById('oandaVolume').textContent = `Volumen: ${oandaData.price.volume.toLocaleString()}`;
            
            statusElement.textContent = '✅ Conectado';
            statusElement.className = 'data-status connected';
        } else {
            document.getElementById('oandaPrice').textContent = 'Sin conexión';
            document.getElementById('oandaSpread').textContent = '--';
            document.getElementById('oandaVolume').textContent = '--';
            
            statusElement.textContent = '❌ Error de conexión';
            statusElement.className = 'data-status error';
        }
    }

    updateInvestingData(investingData) {
        const statusElement = document.getElementById('investingStatus');
        
        if (investingData) {
            // Mostrar si los datos son reales o simulados + timeframe
            const dataSource = investingData.isReal ? '✅ REAL' : '⚠️ SIMULADO';
            const timeframe = investingData.timeframe || '1D';
            
            // Overview con indicador de fuente y timeframe
            document.getElementById('investingOverview').innerHTML = `
                <strong>Recomendación: ${investingData.recommendation}</strong><br>
                <small style="color: ${investingData.isReal ? '#00ff88' : '#ffa502'}">${dataSource} - ${investingData.confidence}% confianza (${timeframe})</small>
            `;
            
            // Señales técnicas con detalles
            const signals = [];
            if (investingData.movingAverages) {
                signals.push(`MA: ${investingData.movingAverages.summary}`);
            }
            if (investingData.oscillators) {
                signals.push(`OSC: ${investingData.oscillators.summary}`);
            }
            
            document.getElementById('investingSignals').textContent = signals.join(' | ');
            
            statusElement.innerHTML = `${dataSource} - Investing.com (${timeframe})`;
            statusElement.className = `data-status ${investingData.isReal ? 'connected' : 'warning'}`;
        } else {
            document.getElementById('investingOverview').textContent = 'Error al obtener datos';
            document.getElementById('investingSignals').textContent = '--';
            
            statusElement.textContent = '❌ Error de scraping';
            statusElement.className = 'data-status error';
        }
    }

    updateCombinedIndicators(combinedData) {
        // Tendencia
        document.getElementById('trendScore').innerHTML = `Tendencia: <span class="${this.getScoreClass(combinedData.trendScore)}">${combinedData.trendScore}</span>`;
        
        // Momentum
        document.getElementById('momentumScore').innerHTML = `Momentum: <span class="${this.getScoreClass(combinedData.momentumScore)}">${combinedData.momentumScore}</span>`;
        
        // Volumen
        document.getElementById('volumeScore').innerHTML = `Volumen: <span class="${this.getVolumeClass(combinedData.volumeScore)}">${combinedData.volumeScore}</span>`;
        
        // Soporte/Resistencia
        document.getElementById('supportResistance').innerHTML = `S/R: ${combinedData.supportResistance.support} / ${combinedData.supportResistance.resistance}`;
    }

    updateStrategyConfirmation(combinedData, verdict) {
        // Puntos de estrategia
        document.getElementById('bullishPoints').textContent = `Bullish: ${combinedData.bullishPoints.toFixed(1)} puntos`;
        document.getElementById('bearishPoints').textContent = `Bearish: ${combinedData.bearishPoints.toFixed(1)} puntos`;
        document.getElementById('neutralPoints').textContent = `Neutral: ${combinedData.neutralPoints.toFixed(1)} puntos`;
        
        // Nivel de riesgo
        const riskElement = document.getElementById('riskLevel');
        riskElement.textContent = `Nivel de Riesgo: ${verdict.riskLevel}`;
        riskElement.className = `risk-${verdict.riskLevel.toLowerCase().replace(' ', '-')}`;
    }

    updateLiquidityData(liquidityData) {
        document.getElementById('liquidityLevel').textContent = liquidityData.level;
        document.getElementById('liquidityLevel').className = this.getLiquidityClass(liquidityData.level);
        
        document.getElementById('liquidityTrend').textContent = liquidityData.trend;
        document.getElementById('liquidityTrend').className = this.getTrendClass(liquidityData.trend);
        
        // Actualizar barras de liquidez
        const bidPercentage = (liquidityData.totalBidVolume / (liquidityData.totalBidVolume + liquidityData.totalAskVolume)) * 100;
        const askPercentage = 100 - bidPercentage;
        
        const bidBar = document.getElementById('bidBar');
        const askBar = document.getElementById('askBar');
        
        if (bidBar) bidBar.style.width = `${bidPercentage}%`;
        if (askBar) askBar.style.width = `${askPercentage}%`;
    }

    updateOrderFlowData(orderFlowData) {
        document.getElementById('orderFlowDirection').textContent = orderFlowData.direction;
        document.getElementById('orderFlowDirection').className = this.getFlowDirectionClass(orderFlowData.direction);
        
        document.getElementById('orderFlowStrength').textContent = `Fuerza: ${orderFlowData.strength}`;
        
        // Actualizar indicadores de flujo
        const buyFlow = document.getElementById('buyFlow');
        const sellFlow = document.getElementById('sellFlow');
        
        if (buyFlow) {
            const buyArrow = buyFlow.querySelector('.arrow-fill');
            if (buyArrow) buyArrow.style.width = `${orderFlowData.buyPercentage}%`;
        }
        
        if (sellFlow) {
            const sellArrow = sellFlow.querySelector('.arrow-fill');
            if (sellArrow) sellArrow.style.width = `${orderFlowData.sellPercentage}%`;
        }
    }

    updateImbalanceData(imbalanceData) {
        document.getElementById('imbalanceStatus').textContent = imbalanceData.detected ? 
            `${imbalanceData.count} Imbalances Detectados` : 'No Detectados';
        document.getElementById('imbalanceStatus').className = imbalanceData.detected ? 'detected' : 'no-detected';
        
        document.getElementById('nextLevel').textContent = imbalanceData.nextLevel;
        document.getElementById('criticalZone').textContent = imbalanceData.criticalZone;
    }

    updateVolumeProfileData(volumeProfileData) {
        document.getElementById('volumeProfile').textContent = `POC: ${volumeProfileData.pocPrice}`;
        document.getElementById('pocLevel').textContent = volumeProfileData.pocPrice;
        document.getElementById('vpocStrength').textContent = `${volumeProfileData.vpocStrength} (${volumeProfileData.vpocPercentage}%)`;
    }

    updatePredictionData(predictionData) {
        document.getElementById('predictionDirection').textContent = predictionData.direction;
        document.getElementById('predictionDirection').className = this.getPredictionDirectionClass(predictionData.direction);
        
        document.getElementById('predictionProbability').textContent = `${predictionData.probability}% Probabilidad`;
        document.getElementById('predictionProbability').className = this.getProbabilityClass(predictionData.probability);
        
        document.getElementById('targetPrice').textContent = predictionData.targetPrice;
        document.getElementById('estimatedTime').textContent = predictionData.estimatedTime;
        document.getElementById('stopLevel').textContent = predictionData.stopLevel;
    }

    // Métodos para clases CSS que faltaban
    getScoreClass(score) {
        if (typeof score !== 'string') return 'neutral';
        
        if (score.includes('STRONG')) {
            return score.includes('NEGATIVE') ? 'bearish' : 'bullish';
        }
        if (score.includes('MODERATE')) {
            return score.includes('NEGATIVE') ? 'bearish' : 'bullish';
        }
        if (score.includes('POSITIVE') || score.includes('HIGH')) {
            return 'bullish';
        }
        if (score.includes('NEGATIVE') || score.includes('LOW')) {
            return 'bearish';
        }
        return 'neutral';
    }

    getVolumeClass(volume) {
        if (typeof volume !== 'string') return 'neutral';
        
        if (volume === 'HIGH' || volume === 'ALTA') return 'bullish';
        if (volume === 'LOW' || volume === 'BAJA') return 'bearish';
        return 'neutral';
    }

    getLiquidityClass(level) {
        if (level === 'ALTA') return 'bullish';
        if (level === 'BAJA') return 'bearish';
        return 'neutral';
    }

    getTrendClass(trend) {
        if (trend.includes('COMPRA')) return 'bullish';
        if (trend.includes('VENTA')) return 'bearish';
        return 'neutral';
    }

    getFlowDirectionClass(direction) {
        if (direction.includes('COMPRA')) return 'bullish';
        if (direction.includes('VENTA')) return 'bearish';
        return 'neutral';
    }

    getPredictionDirectionClass(direction) {
        if (direction === 'ALCISTA') return 'bullish';
        if (direction === 'BAJISTA') return 'bearish';
        return 'neutral';
    }

    getProbabilityClass(probability) {
        if (probability >= 70) return 'high-confidence';
        if (probability >= 55) return 'medium-confidence';
        return 'low-confidence';
    }

    saveCurrentAnalysis() {
        if (this.currentAnalysis) {
            this.strategyEngine.saveAnalysis(this.currentAnalysis);
            this.updateHistoryDisplay();
            this.showNotification('✅ Análisis completo guardado (incluye Order Flow)');
        }
    }

    exportCurrentAnalysis() {
        if (this.currentAnalysis) {
            this.strategyEngine.exportAnalysis(this.currentAnalysis);
            this.showNotification('📤 Análisis completo exportado');
        }
    }

    clearAnalysisHistory() {
        if (confirm('¿Estás seguro de que quieres limpiar todo el historial?')) {
            this.strategyEngine.clearHistory();
            this.updateHistoryDisplay();
            this.showNotification('🗑️ Historial limpiado');
        }
    }

    updateHistoryDisplay() {
        const historyContainer = document.getElementById('recentAnalysis');
        const history = this.strategyEngine.analysisHistory.slice(0, 5);
        
        if (history.length === 0) {
            historyContainer.innerHTML = '<p style="color: #888; text-align: center;">No hay análisis guardados</p>';
            return;
        }
        
        historyContainer.innerHTML = history.map(item => `
            <div class="history-item">
                <div><strong>${item.verdict?.direction || 'N/A'}</strong> - ${item.verdict?.confidence || 0}% confianza</div>
                <div>Recomendación: ${item.verdict?.recommendation || 'N/A'}</div>
                <div>Order Flow: ${item.orderFlow?.prediction?.direction || 'N/A'} (${item.orderFlow?.prediction?.probability || 0}%)</div>
                <div>Noticias: ${item.news?.warnings?.length || 0} alertas detectadas</div>
                <div class="timestamp">${new Date(item.timestamp).toLocaleString()}</div>
            </div>
        `).join('');
    }

    showNotification(message, type = 'success') {
        // Crear notificación temporal
        const notification = document.createElement('div');
        notification.textContent = message;
        
        const colors = {
            success: 'linear-gradient(45deg, #00d4aa, #007a5a)',
            error: 'linear-gradient(45deg, #ff4757, #ff3742)',
            warning: 'linear-gradient(45deg, #ffa502, #ff6348)'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.success};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            z-index: 1000;
            font-weight: bold;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }

    showError(message) {
        document.getElementById('verdictDirection').textContent = message;
        document.getElementById('verdictDirection').className = 'error';
        
        document.getElementById('verdictConfidence').textContent = 'Error en análisis';
        document.getElementById('verdictConfidence').className = 'error';
        
        // Mostrar error en Order Flow también
        document.getElementById('predictionDirection').textContent = 'ERROR';
        document.getElementById('predictionDirection').className = 'error';
    }

    updateTradeRecommendationUI(recommendation) {
        console.log('🎯 Actualizando UI de recomendación de trade:', recommendation);
        
        const container = document.getElementById('tradeRecommendation');
        if (!container) return;
        
        if (recommendation.action === 'TRADE_RECOMMENDED') {
            container.innerHTML = `
                <div class="trade-recommendation-header ${recommendation.direction.toLowerCase()}">
                    <h4>🎯 TRADE RECOMENDADO (15min)</h4>
                    <div class="trade-confidence">${recommendation.confidence}% Confianza</div>
                </div>
                
                <div class="trade-details">
                    <div class="trade-direction">
                        <span class="label">Dirección:</span>
                        <span class="value ${recommendation.direction.toLowerCase()}">${recommendation.direction}</span>
                    </div>
                    
                    <div class="trade-levels">
                        <div class="level-item">
                            <span class="label">📍 Entry:</span>
                            <span class="value">${recommendation.entry}</span>
                        </div>
                        <div class="level-item">
                            <span class="label">🛑 Stop Loss:</span>
                            <span class="value">${recommendation.stopLoss}</span>
                        </div>
                        <div class="level-item">
                            <span class="label">🎯 Take Profit:</span>
                            <span class="value">${recommendation.takeProfit}</span>
                        </div>
                        <div class="level-item">
                            <span class="label">⚖️ Risk:Reward:</span>
                            <span class="value">1:${recommendation.riskReward}</span>
                        </div>
                    </div>
                    
                    <div class="trade-management">
                        <div class="management-item">
                            <span class="label">📊 Tamaño posición:</span>
                            <span class="value">${recommendation.positionSize}</span>
                        </div>
                        <div class="management-item">
                            <span class="label">⏰ Válido hasta:</span>
                            <span class="value">${recommendation.validUntil}</span>
                        </div>
                        <div class="management-item">
                            <span class="label">💱 Spread:</span>
                            <span class="value">${recommendation.spread}</span>
                        </div>
                    </div>
                    
                    ${recommendation.newsAlert ? `
                        <div class="news-alert">
                            <div class="alert-icon">⚠️</div>
                            <div class="alert-text">${recommendation.newsAlert}</div>
                        </div>
                    ` : ''}
                    
                    <div class="trade-reasoning">
                        <div class="reasoning-title">📋 Justificación:</div>
                        <ul>
                            ${recommendation.reasoning.map(reason => `<li>${reason}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
        } else {
            // NO_TRADE
            container.innerHTML = `
                <div class="trade-recommendation-header no-trade">
                    <h4>🚫 NO OPERAR</h4>
                    <div class="trade-confidence">${recommendation.confidence || 0}% Confianza</div>
                </div>
                
                <div class="no-trade-details">
                    <div class="no-trade-reason">
                        <span class="label">Razón:</span>
                        <span class="value">${recommendation.reason}</span>
                    </div>
                    <div class="no-trade-recommendation">
                        <span class="label">Recomendación:</span>
                        <span class="value">${recommendation.recommendation}</span>
                    </div>
                    <div class="no-trade-next">
                        <span class="label">Próxima revisión:</span>
                        <span class="value">${recommendation.nextCheck}</span>
                    </div>
                    
                    ${recommendation.newsAlert ? `
                        <div class="news-alert">
                            <div class="alert-icon">📰</div>
                            <div class="alert-text">${recommendation.newsAlert}</div>
                        </div>
                    ` : ''}
                </div>
            `;
        }
    }
}

// Inicializar aplicación cuando el DOM esté listo CON VERIFICACIÓN MEJORADA
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Dar tiempo extra para que todos los scripts se carguen
        setTimeout(() => {
            // Verificar que todos los scripts estén cargados
            const requiredClasses = ['OandaAPI', 'InvestingScraper', 'OrderFlowAnalyzer', 'StrategyEngine', 'TradeRecommender'];
            const missing = requiredClasses.filter(className => typeof window[className] === 'undefined');
            
            if (missing.length > 0) {
                console.error(`❌ Scripts no cargados después de timeout: ${missing.join(', ')}`);
                console.log('🔍 Verificando que existan los archivos...');
                
                // Mostrar el estado de window para debugging
                console.log('🔍 Estado de window:', {
                    OandaAPI: typeof window.OandaAPI,
                    InvestingScraper: typeof window.InvestingScraper,
                    OrderFlowAnalyzer: typeof window.OrderFlowAnalyzer,
                    StrategyEngine: typeof window.StrategyEngine,
                    TradeRecommender: typeof window.TradeRecommender,
                    convertToOandaFormat: typeof window.convertToOandaFormat
                });
                
                document.body.innerHTML = `
                    <div style="text-align: center; color: red; padding: 50px; font-family: Arial;">
                        <h2>❌ Error de Carga</h2>
                        <p><strong>Scripts faltantes:</strong> ${missing.join(', ')}</p>
                        <p>Verifica que los siguientes archivos existan:</p>
                        <ul style="text-align: left; display: inline-block;">
                            <li>convertToOandaFormat.js</li>
                            <li>oanda-api.js</li>
                            <li>investing-scraper.js</li>
                            <li>orderflow-analyzer.js</li>
                            <li>strategy-engine.js</li>
                            <li>trade-recommender.js</li>
                        </ul>
                        <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 20px; font-size: 16px;">Recargar Página</button>
                    </div>
                `;
                return;
            }
            
            window.tradingApp = new TradingStrategyApp();
            console.log('✅ Trading Strategy App con Order Flow inicializada correctamente');
        }, 1000); // Esperar 1 segundo para que todos los scripts se carguen
        
    } catch (error) {
        console.error('❌ Error inicializando la aplicación:', error);
        document.body.innerHTML = `
            <div style="text-align: center; color: red; padding: 50px;">
                <h2>❌ Error de Inicialización</h2>
                <p>${error.message}</p>
                <button onclick="location.reload()">Recargar Página</button>
            </div>
        `;
    }
});

// Manejar errores globales
window.addEventListener('error', (e) => {
    console.error('Error global:', e.error);
});

// Cleanup al cerrar la página (ya no hay auto-refresh que limpiar)
window.addEventListener('beforeunload', () => {
    console.log('🔄 Cerrando aplicación...');
});
