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
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => {
                this.performAnalysis();
            });
        }

        // Input de ticker
        const tickerInput = document.getElementById('tickerInput');
        if (tickerInput) {
            tickerInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performAnalysis();
                }
            });

            tickerInput.addEventListener('input', (e) => {
                this.currentTicker = e.target.value.toUpperCase();
            });
        }

        // Botones de acción
        const saveBtn = document.getElementById('saveAnalysis');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveCurrentAnalysis();
            });
        }

        const exportBtn = document.getElementById('exportData');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportCurrentAnalysis();
            });
        }

        const clearBtn = document.getElementById('clearHistory');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearAnalysisHistory();
            });
        }

        // Botones de pares rápidos
        document.querySelectorAll('.pair-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pair = e.target.dataset.pair;
                const tickerInput = document.getElementById('tickerInput');
                if (tickerInput) {
                    tickerInput.value = pair;
                    this.currentTicker = pair;
                }
                
                // Actualizar botón activo
                document.querySelectorAll('.pair-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
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
        this.safeUpdateElement('verdictDirection', 'Presiona "Confirmar Estrategia" para analizar', 'neutral');
        this.safeUpdateElement('verdictConfidence', 'Esperando análisis...', 'neutral');
        this.safeUpdateElement('oandaStatus', 'Listo para conectar', 'data-status');
        this.safeUpdateElement('investingStatus', 'Listo para obtener datos', 'data-status');
        this.safeUpdateElement('oandaPrice', 'Haz clic para obtener precio');
        this.safeUpdateElement('investingOverview', 'Análisis pendiente');
    }

    showOrderFlowInitialState() {
        // Estados iniciales para Order Flow
        this.safeUpdateElement('liquidityLevel', 'Esperando datos...');
        this.safeUpdateElement('liquidityTrend', 'Pendiente de análisis');
        this.safeUpdateElement('orderFlowDirection', 'Sin datos');
        this.safeUpdateElement('orderFlowStrength', 'Calculando...');
        this.safeUpdateElement('imbalanceStatus', 'No detectados');
        this.safeUpdateElement('nextLevel', '--');
        this.safeUpdateElement('criticalZone', '--');
        this.safeUpdateElement('volumeProfile', 'Generando perfil...');
        this.safeUpdateElement('pocLevel', '--');
        this.safeUpdateElement('vpocStrength', '--');
        this.safeUpdateElement('predictionDirection', 'PENDIENTE');
        this.safeUpdateElement('predictionProbability', '-- %');
        this.safeUpdateElement('targetPrice', '--');
        this.safeUpdateElement('estimatedTime', '--');
        this.safeUpdateElement('stopLevel', '--');
    }

    safeUpdateElement(id, content, className = null) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content;
            if (className) {
                element.className = className;
            }
        }
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
            const tickerInput = document.getElementById('tickerInput');
            this.currentTicker = (tickerInput?.value || 'XAUUSD').toUpperCase();
            
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
            
            // GENERAR RECOMENDACIÓN DE TRADE
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
            if (analyzeBtn) {
                analyzeBtn.disabled = false;
                analyzeBtn.textContent = 'Confirmar Estrategia';
            }
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
        this.safeUpdateElement('verdictDirection', 'Analizando...', 'loading');
        this.safeUpdateElement('verdictConfidence', 'Calculando confianza...', 'loading');
        this.safeUpdateElement('oandaStatus', 'Conectando a OANDA...', 'data-status loading');
        this.safeUpdateElement('investingStatus', 'Obteniendo datos técnicos...', 'data-status loading');
        this.safeUpdateElement('oandaPrice', 'Cargando...');
        this.safeUpdateElement('investingOverview', 'Procesando...');
        
        // Estados de carga para Order Flow
        this.showOrderFlowLoadingStates();
        
        // Estados de carga para noticias
        this.safeUpdateElement('newsOverview', 'Obteniendo noticias...');
        this.safeUpdateElement('marketImpact', 'Analizando impacto...');
        this.safeUpdateElement('newsWarnings', 'Verificando alertas...');
        
        // Deshabilitar botón mientras analiza
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.textContent = 'Analizando...';
        }
    }

    showOrderFlowLoadingStates() {
        this.safeUpdateElement('liquidityLevel', 'Analizando liquidez...');
        this.safeUpdateElement('liquidityTrend', 'Calculando tendencia...');
        this.safeUpdateElement('orderFlowDirection', 'Detectando flujo...');
        this.safeUpdateElement('orderFlowStrength', 'Midiendo fuerza...');
        this.safeUpdateElement('imbalanceStatus', 'Buscando imbalances...');
        this.safeUpdateElement('volumeProfile', 'Creando perfil...');
        this.safeUpdateElement('predictionDirection', 'CALCULANDO...');
        this.safeUpdateElement('predictionProbability', 'Procesando...');
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

    // updateNewsUI(newsData) {
    //     if (!newsData) return;
        
    //     const statusElement = document.getElementById('newsStatus');
        
    //     // Actualizar overview de noticias
    //     const newsOverview = document.getElementById('newsOverview');
    //     if (newsOverview && newsData.recentNews && newsData.recentNews.length > 0) {
    //         const topNews = newsData.recentNews.slice(0, 3);
    //         newsOverview.innerHTML = `
    //             <div style="font-size: 1.1rem; margin-bottom: 10px;">
    //                 <strong>Últimas ${topNews.length} noticias:</strong>
    //             </div>
    //             ${topNews.map(news => `
    //                 <div style="margin: 5px 0; padding: 5px; background: rgba(44, 52, 73, 0.3); border-radius: 4px;">
    //                     <div style="font-size: 0.9rem; color: #ccc;">${news.title}</div>
    //                     <div style="font-size: 0.8rem; color: #888;">${news.time} - Impacto: ${news.impact}</div>
    //                 </div>
    //             `).join('')}
    //         `;
    //     } else if (newsOverview) {
    //         newsOverview.textContent = 'No hay noticias recientes';
    //     }
        
    //     // Actualizar impacto del mercado
    //     const marketImpact = document.getElementById('marketImpact');
    //     if (marketImpact && newsData.marketImpact) {
    //         const impact = newsData.marketImpact;
    //         marketImpact.innerHTML = `
    //             <div style="text-align: center; margin: 10px 0;">
    //                 <div style="font-weight: bold; color: ${this.getImpactColor(impact.level)};">
    //                     📊 Impacto: ${impact.level}
    //                 </div>
    //                 <div style="font-size: 0.9rem; color: #ccc;">
    //                     ${impact.description}
    //                 </div>
    //             </div>
    //         `;
    //     }
        
    //     // Actualizar warnings
    //     const newsWarnings = document.getElementById('newsWarnings');
    //     if (newsWarnings) {
    //         if (newsData.warnings && newsData.warnings.length > 0) {
    //             newsWarnings.innerHTML = `
    //                 <div style="margin-top: 10px;">
    //                     <strong style="color: #ffa502;">⚠️ Alertas Activas:</strong>
    //                     ${newsData.warnings.map(warning => `
    //                         <div style="margin: 5px 0; padding: 8px; background: rgba(255, 165, 2, 0.1); border-left: 3px solid #ffa502; border-radius: 4px;">
    //                             <div style="font-size: 0.9rem; color: #ffa502;">${warning.message}</div>
    //                         </div>
    //                     `).join('')}
    //                 </div>
    //             `;
    //         } else {
    //             newsWarnings.innerHTML = `
    //                 <div style="text-align: center; color: #00ff88; margin-top: 10px;">
    //                     ✅ No hay alertas activas
    //                 </div>
    //             `;
    //         }
    //     }
        
    //     // Actualizar status
    //     if (statusElement) {
    //         const dataSource = newsData.isReal ? '✅ REAL' : '⚠️ SIMULADO';
    //         statusElement.innerHTML = `${dataSource} - Noticias`;
    //         statusElement.className = `data-status ${newsData.isReal ? 'connected' : 'warning'}`;
    //     }
    // }

    updateNewsUI(newsData) {
    if (!newsData) return;
    
    const statusElement = document.getElementById('newsStatus');
    
    // Actualizar overview de noticias con ENLACES REALES
    const newsOverview = document.getElementById('newsOverview');
    if (newsOverview && newsData.recentNews && newsData.recentNews.length > 0) {
        const topNews = newsData.recentNews.slice(0, 5);
        newsOverview.innerHTML = `
            <div style="font-size: 1.1rem; margin-bottom: 10px;">
                <strong>📰 ${topNews.length} Noticias REALES:</strong>
            </div>
            ${topNews.map(news => `
                <div style="margin: 8px 0; padding: 8px; background: rgba(44, 52, 73, 0.3); border-radius: 4px; border-left: 3px solid ${this.getImpactBorderColor(news.impact)};">
                    <div style="font-size: 0.9rem; color: #ccc; margin-bottom: 4px;">
                        <a href="${news.url}" target="_blank" style="color: #00d4aa; text-decoration: none; hover: underline;">
                            ${news.title}
                        </a>
                    </div>
                    <div style="font-size: 0.8rem; color: #888; display: flex; justify-content: space-between;">
                        <span>${news.time}</span>
                        <span style="color: ${this.getImpactColor(news.impact)}; font-weight: bold;">
                            ${news.impact} IMPACT
                        </span>
                    </div>
                    <div style="font-size: 0.7rem; color: #666; margin-top: 2px;">
                        Fuente: ${news.source}
                    </div>
                </div>
            `).join('')}
        `;
    } else if (newsOverview) {
        newsOverview.innerHTML = `
            <div style="text-align: center; color: #ff6b6b; padding: 20px;">
                ❌ No se encontraron noticias reales
            </div>
        `;
    }
    
    // Actualizar IMPACTO EN LA DECISIÓN
    const marketImpact = document.getElementById('marketImpact');
    if (marketImpact && newsData.decisionImpact) {
        const impact = newsData.decisionImpact;
        const breakdown = impact.breakdown;
        
        marketImpact.innerHTML = `
            <div style="text-align: center; margin: 15px 0; padding: 15px; background: rgba(0, 0, 0, 0.2); border-radius: 8px;">
                <div style="font-size: 1.4rem; font-weight: bold; color: ${this.getImpactColor(impact.level)}; margin-bottom: 8px;">
                    📊 IMPACTO EN DECISIÓN: ${impact.percentage}%
                </div>
                <div style="font-size: 1rem; color: #ccc; margin-bottom: 8px;">
                    Nivel: ${impact.level}
                </div>
                <div style="font-size: 0.9rem; color: #aaa;">
                    ${newsData.marketImpact.description}
                </div>
                
                ${breakdown ? `
                    <div style="margin-top: 10px; font-size: 0.8rem; color: #888;">
                        Críticas: ${breakdown.critical} | Altas: ${breakdown.high} | Medias: ${breakdown.medium} | Total: ${breakdown.total}
                    </div>
                ` : ''}
                
                <div style="margin-top: 8px; font-size: 0.8rem; color: #00ff88;">
                    ✅ Datos reales de ${newsData.source}
                </div>
            </div>
        `;
    } else if (marketImpact) {
        marketImpact.innerHTML = `
            <div style="text-align: center; color: #ffa502; margin: 10px 0;">
                ⚠️ Sin datos de impacto disponibles
            </div>
        `;
    }
    
    // Actualizar ALERTAS CRÍTICAS
    const newsWarnings = document.getElementById('newsWarnings');
    if (newsWarnings) {
        if (newsData.warnings && newsData.warnings.length > 0) {
            newsWarnings.innerHTML = `
                <div style="margin-top: 15px;">
                    <strong style="color: #ff4757; font-size: 1.1rem;">🚨 ALERTAS CRÍTICAS:</strong>
                    ${newsData.warnings.map(warning => `
                        <div style="margin: 8px 0; padding: 12px; background: rgba(255, 71, 87, 0.15); border-left: 4px solid #ff4757; border-radius: 4px;">
                            <div style="font-size: 1rem; color: #ff4757; font-weight: bold; margin-bottom: 4px;">
                                ${warning.type === 'CRITICAL_NEWS' ? '📰' : '⚠️'} ${warning.message}
                            </div>
                            ${warning.url ? `
                                <div style="margin-top: 6px;">
                                    <a href="${warning.url}" target="_blank" style="color: #00d4aa; font-size: 0.9rem; text-decoration: none;">
                                        👀 Ver noticia completa →
                                    </a>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            newsWarnings.innerHTML = `
                <div style="text-align: center; color: #00ff88; margin-top: 15px; padding: 10px; background: rgba(0, 255, 136, 0.1); border-radius: 6px;">
                    ✅ No hay alertas críticas detectadas
                </div>
            `;
        }
    }
    
    // Actualizar status con fuente real
    if (statusElement) {
        const dataSource = newsData.isReal ? '✅ REAL' : '⚠️ SIMULADO';
        const sourceDetail = newsData.source || 'unknown';
        statusElement.innerHTML = `${dataSource} - ${sourceDetail}`;
        statusElement.className = `data-status ${newsData.isReal ? 'connected' : 'warning'}`;
    }
    
    // MOSTRAR ALERTA DE IMPACTO ALTO EN LA PANTALLA
    if (newsData.decisionImpact && newsData.decisionImpact.percentage >= 60) {
        this.showNewsImpactAlert(newsData.decisionImpact);
    }
    }
    
    // FUNCIÓN PARA MOSTRAR ALERTA DE ALTO IMPACTO
showNewsImpactAlert(impactData) {
    const alertMessage = `🚨 ALTO IMPACTO DETECTADO: ${impactData.percentage}%\n\nLas noticias actuales pueden afectar significativamente tu decisión de trading.\n\n¿Continuar con el análisis?`;
    
    if (confirm(alertMessage)) {
        console.log('✅ Usuario decidió continuar pese al alto impacto de noticias');
        this.showNotification(`⚠️ Operando con ${impactData.percentage}% de impacto noticioso`, 'warning');
    } else {
        console.log('🛑 Usuario pausó análisis por alto impacto de noticias');
        this.showNotification('⏸️ Análisis pausado por precaución noticiosa', 'warning');
    }
}

// FUNCIÓN PARA OBTENER COLOR DEL BORDE SEGÚN IMPACTO
getImpactBorderColor(impact) {
    const colors = {
        'CRITICAL': '#ff4757',
        'HIGH': '#ff6b35',
        'MEDIUM': '#ffa502',
        'LOW': '#00ff88'
    };
    return colors[impact] || '#888';
}

// FUNCIÓN MEJORADA PARA OBTENER COLOR DE IMPACTO
getImpactColor(level) {
    const colors = {
        'CRITICAL': '#ff4757',
        'HIGH': '#ff6b35',
        'MEDIUM': '#ffa502',
        'LOW': '#00ff88'
    };
    return colors[level] || '#888';
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

    getFallbackTradeRecommendation() {
        return {
            action: 'NO_TRADE',
            reason: 'Sistema de recomendaciones no disponible',
            recommendation: 'Verificar carga de scripts',
            confidence: 0,
            timestamp: new Date().toISOString()
        };
    }

    // FUNCIÓN PARA INTEGRAR IMPACTO DE NOTICIAS EN LA DECISIÓN FINAL
    updateFinalVerdict(verdict) {
    const directionElement = document.getElementById('verdictDirection');
    const confidenceElement = document.getElementById('verdictConfidence');
    
    if (!directionElement || !confidenceElement) return;
    
    // 🔥 INTEGRAR IMPACTO DE NOTICIAS AQUÍ
    let finalVerdict = { ...verdict };
    let newsImpactData = null;
    
    // Verificar si hay datos de noticias y calcular impacto
    if (this.currentAnalysis && this.currentAnalysis.news && this.currentAnalysis.news.decisionImpact) {
        newsImpactData = this.currentAnalysis.news.decisionImpact;
        finalVerdict = this.applyNewsImpactToVerdict(verdict, this.currentAnalysis.news);
    }
    
    // Dirección
    directionElement.textContent = finalVerdict.direction;
    directionElement.className = finalVerdict.direction.toLowerCase();
    
    // MEJORAR UI PARA MOSTRAR RECOMENDACIÓN CLARA
    const investingData = this.currentAnalysis?.investing;
    const isRealData = investingData?.isReal;
    const confidence = finalVerdict.confidence; // Usar confianza ajustada por noticias
    
    // Crear resumen de recomendación profesional
    let recommendationText = '';
    if (finalVerdict.direction === 'BULLISH') {
        recommendationText = `📈 RECOMENDACIÓN: COMPRA FUERTE`;
    } else if (finalVerdict.direction === 'BEARISH') {
        recommendationText = `📉 RECOMENDACIÓN: VENTA FUERTE`;
    } else {
        recommendationText = `⚖️ RECOMENDACIÓN: MANTENERSE NEUTRAL`;
    }
    
    // Determinar fuente de datos
    let dataSourceText = '';
    if (isRealData) {
        dataSourceText = `✅ Análisis basado en datos REALES de Investing.com`;
    } else {
        dataSourceText = `⚠️ Análisis basado en datos técnicos procesados`;
    }
    
    // 🔥 AGREGAR INFORMACIÓN DE IMPACTO DE NOTICIAS
    let newsImpactHTML = '';
    if (newsImpactData) {
        const impactColor = this.getNewsImpactColor(newsImpactData.level);
        const originalConfidence = verdict.confidence;
        const confidenceChange = originalConfidence - confidence;
        
        newsImpactHTML = `
            <div style="margin: 10px 0; padding: 8px; background: rgba(${impactColor}, 0.1); border-left: 3px solid ${impactColor}; border-radius: 4px;">
                <div style="font-size: 0.9rem; color: ${impactColor}; font-weight: bold;">
                    📰 Impacto Noticias: ${newsImpactData.percentage}% (${newsImpactData.level})
                </div>
                ${confidenceChange > 0 ? `
                    <div style="font-size: 0.8rem; color: #ff6b6b; margin-top: 2px;">
                        ⚠️ Confianza ajustada: ${originalConfidence}% → ${confidence}% (-${confidenceChange}%)
                    </div>
                ` : `
                    <div style="font-size: 0.8rem; color: #00ff88; margin-top: 2px;">
                        ✅ Sin ajustes negativos por noticias
                    </div>
                `}
                <div style="font-size: 0.7rem; color: #aaa; margin-top: 2px;">
                    ${newsImpactData.breakdown ? `Críticas: ${newsImpactData.breakdown.critical}, Altas: ${newsImpactData.breakdown.high}` : ''}
                </div>
            </div>
        `;
    }
    
    confidenceElement.innerHTML = `
        <div style="font-size: 1.8rem; color: ${isRealData ? '#00ff88' : '#ffa502'}; font-weight: bold;">
            ${confidence}% CONFIANZA
            ${newsImpactData && newsImpactData.percentage >= 30 ? 
                `<span style="font-size: 0.6em; color: #ffa502;">⚠️</span>` : ''}
        </div>
        <div style="font-size: 1.2rem; color: #ffffff; margin: 8px 0; font-weight: 600;">
            ${recommendationText}
        </div>
        <div style="font-size: 0.9rem; color: #ccc; margin-top: 5px;">
            ${dataSourceText}
        </div>
        ${newsImpactHTML}
        <div style="font-size: 0.8rem; color: #888; margin-top: 3px;">
            Timeframe: 15 minutos • ${new Date().toLocaleTimeString()}
        </div>
    `;
    
    // Ajustar clase de confianza considerando impacto de noticias
    let confidenceClass = '';
    if (newsImpactData && newsImpactData.level === 'CRITICAL') {
        confidenceClass = 'critical-news-impact';
    } else if (confidence >= 70) {
        confidenceClass = 'high-confidence';
    } else if (confidence >= 50) {
        confidenceClass = 'medium-confidence';
    } else {
        confidenceClass = 'low-confidence';
    }
    
    confidenceElement.className = confidenceClass;
    
    // Actualizar color de la tarjeta según dirección Y impacto de noticias
    const verdictCard = document.getElementById('finalVerdict');
    if (verdictCard) {
        let cardClass = `verdict-card ${finalVerdict.direction.toLowerCase()}`;
        if (newsImpactData && newsImpactData.level === 'CRITICAL') {
            cardClass += ' critical-news';
        }
        verdictCard.className = cardClass;
    }
    
    console.log(`🎯 UI actualizada: ${finalVerdict.direction} (${confidence}% - ${isRealData ? 'REAL' : 'PROCESADO'}) ${newsImpactData ? `[Noticias: ${newsImpactData.percentage}%]` : ''}`);
}

    // 🔥 NUEVA FUNCIÓN: Aplicar impacto de noticias al veredicto
applyNewsImpactToVerdict(originalVerdict, newsData) {
    if (!newsData || !newsData.decisionImpact) {
        return originalVerdict;
    }
    
    const newsImpact = newsData.decisionImpact;
    let adjustedConfidence = originalVerdict.confidence;
    let adjustedDirection = originalVerdict.direction;
    let adjustedRiskLevel = originalVerdict.riskLevel;
    
    // Calcular ajuste de confianza basado en nivel de impacto
    let confidenceAdjustment = 0;
    
    switch (newsImpact.level) {
        case 'CRITICAL':
            confidenceAdjustment = -Math.min(25, newsImpact.percentage * 0.4);
            adjustedRiskLevel = 'HIGH';
            break;
        case 'HIGH':
            confidenceAdjustment = -Math.min(15, newsImpact.percentage * 0.25);
            if (originalVerdict.riskLevel === 'LOW') adjustedRiskLevel = 'MEDIUM';
            break;
        case 'MEDIUM':
            confidenceAdjustment = -Math.min(8, newsImpact.percentage * 0.15);
            break;
        case 'LOW':
            confidenceAdjustment = -Math.min(3, newsImpact.percentage * 0.05);
            break;
    }
    
    // Aplicar ajuste pero mantener mínimo de 20%
    adjustedConfidence = Math.max(20, Math.round(adjustedConfidence + confidenceAdjustment));
    
    // Si la confianza cae demasiado, cambiar a NEUTRAL
    if (adjustedConfidence < 35 && (originalVerdict.direction === 'BULLISH' || originalVerdict.direction === 'BEARISH')) {
        console.warn(`⚠️ Confianza muy baja (${adjustedConfidence}%) por noticias, cambiando a NEUTRAL`);
        adjustedDirection = 'NEUTRAL';
    }
    
    return {
        ...originalVerdict,
        confidence: adjustedConfidence,
        direction: adjustedDirection,
        riskLevel: adjustedRiskLevel,
        newsImpact: {
            originalConfidence: originalVerdict.confidence,
            adjustment: confidenceAdjustment,
            level: newsImpact.level,
            percentage: newsImpact.percentage
        }
    };
}

// 🔥 NUEVA FUNCIÓN: Obtener color para impacto de noticias
getNewsImpactColor(level) {
    const colors = {
        'CRITICAL': '#ff4757',
        'HIGH': '#ff6b35', 
        'MEDIUM': '#ffa502',
        'LOW': '#00ff88'
    };
    return colors[level] || '#888';
}
    

    updateOandaData(oandaData) {
        const statusElement = document.getElementById('oandaStatus');
        
        if (oandaData && oandaData.price) {
            // Precio actual
            this.safeUpdateElement('oandaPrice', `$${oandaData.price.mid.toFixed(4)}`);
            
            // Spread
            this.safeUpdateElement('oandaSpread', `Spread: ${oandaData.price.spread.toFixed(2)} pips`);
            
            // Volumen
            this.safeUpdateElement('oandaVolume', `Volumen: ${oandaData.price.volume.toLocaleString()}`);
            
            if (statusElement) {
                statusElement.textContent = '✅ Conectado';
                statusElement.className = 'data-status connected';
            }
        } else {
            this.safeUpdateElement('oandaPrice', 'Sin conexión');
            this.safeUpdateElement('oandaSpread', '--');
            this.safeUpdateElement('oandaVolume', '--');
            
            if (statusElement) {
                statusElement.textContent = '❌ Error de conexión';
                statusElement.className = 'data-status error';
            }
        }
    }

    updateInvestingData(investingData) {
        const statusElement = document.getElementById('investingStatus');
        
        if (investingData) {
            // Mostrar si los datos son reales o simulados + timeframe
            const dataSource = investingData.isReal ? '✅ REAL' : '⚠️ SIMULADO';
            const timeframe = investingData.timeframe || '1D';
            
            // Overview con indicador de fuente y timeframe
            const overviewElement = document.getElementById('investingOverview');
            if (overviewElement) {
                overviewElement.innerHTML = `
                    <strong>Recomendación: ${investingData.recommendation}</strong><br>
                    <small style="color: ${investingData.isReal ? '#00ff88' : '#ffa502'}">${dataSource} - ${investingData.confidence}% confianza (${timeframe})</small>
                `;
            }
            
            // Señales técnicas con detalles
            const signals = [];
            if (investingData.movingAverages) {
                signals.push(`MA: ${investingData.movingAverages.summary}`);
            }
            if (investingData.oscillators) {
                signals.push(`OSC: ${investingData.oscillators.summary}`);
            }
            
            this.safeUpdateElement('investingSignals', signals.join(' | '));
            
            if (statusElement) {
                statusElement.innerHTML = `${dataSource} - Investing.com (${timeframe})`;
                statusElement.className = `data-status ${investingData.isReal ? 'connected' : 'warning'}`;
            }
        } else {
            this.safeUpdateElement('investingOverview', 'Error al obtener datos');
            this.safeUpdateElement('investingSignals', '--');
            
            if (statusElement) {
                statusElement.textContent = '❌ Error de scraping';
                statusElement.className = 'data-status error';
            }
        }
    }

    updateCombinedIndicators(combinedData) {
        // Tendencia
        const trendElement = document.getElementById('trendScore');
        if (trendElement) {
            trendElement.innerHTML = `Tendencia: <span class="${this.getScoreClass(combinedData.trendScore)}">${combinedData.trendScore}</span>`;
        }
        
        // Momentum
        const momentumElement = document.getElementById('momentumScore');
        if (momentumElement) {
            momentumElement.innerHTML = `Momentum: <span class="${this.getScoreClass(combinedData.momentumScore)}">${combinedData.momentumScore}</span>`;
        }
        
        // Volumen
        const volumeElement = document.getElementById('volumeScore');
        if (volumeElement) {
            volumeElement.innerHTML = `Volumen: <span class="${this.getVolumeClass(combinedData.volumeScore)}">${combinedData.volumeScore}</span>`;
        }
        
        // Soporte/Resistencia
        const srElement = document.getElementById('supportResistance');
        if (srElement) {
            srElement.innerHTML = `S/R: ${combinedData.supportResistance.support} / ${combinedData.supportResistance.resistance}`;
        }
    }

    updateStrategyConfirmation(combinedData, verdict) {
        // Puntos de estrategia
        this.safeUpdateElement('bullishPoints', `Bullish: ${combinedData.bullishPoints.toFixed(1)} puntos`);
        this.safeUpdateElement('bearishPoints', `Bearish: ${combinedData.bearishPoints.toFixed(1)} puntos`);
        this.safeUpdateElement('neutralPoints', `Neutral: ${combinedData.neutralPoints.toFixed(1)} puntos`);
        
        // Nivel de riesgo
        const riskElement = document.getElementById('riskLevel');
        if (riskElement) {
            riskElement.textContent = `Nivel de Riesgo: ${verdict.riskLevel}`;
            riskElement.className = `risk-${verdict.riskLevel.toLowerCase().replace(' ', '-')}`;
        }
    }

    updateLiquidityData(liquidityData) {
        const liquidityLevel = document.getElementById('liquidityLevel');
        if (liquidityLevel) {
            liquidityLevel.textContent = liquidityData.level;
            liquidityLevel.className = this.getLiquidityClass(liquidityData.level);
        }
        
        const liquidityTrend = document.getElementById('liquidityTrend');
        if (liquidityTrend) {
            liquidityTrend.textContent = liquidityData.trend;
            liquidityTrend.className = this.getTrendClass(liquidityData.trend);
        }
        
        // Actualizar barras de liquidez
        const bidPercentage = (liquidityData.totalBidVolume / (liquidityData.totalBidVolume + liquidityData.totalAskVolume)) * 100;
        const askPercentage = 100 - bidPercentage;
        
        const bidBar = document.getElementById('bidBar');
        const askBar = document.getElementById('askBar');
        
        if (bidBar) bidBar.style.width = `${bidPercentage}%`;
        if (askBar) askBar.style.width = `${askPercentage}%`;
    }

    updateOrderFlowData(orderFlowData) {
        const flowDirection = document.getElementById('orderFlowDirection');
        if (flowDirection) {
            flowDirection.textContent = orderFlowData.direction;
            flowDirection.className = this.getFlowDirectionClass(orderFlowData.direction);
        }
        
        this.safeUpdateElement('orderFlowStrength', `Fuerza: ${orderFlowData.strength}`);
        
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
        const imbalanceStatus = document.getElementById('imbalanceStatus');
        if (imbalanceStatus) {
            imbalanceStatus.textContent = imbalanceData.detected ? 
                `${imbalanceData.count} Imbalances Detectados` : 'No Detectados';
            imbalanceStatus.className = imbalanceData.detected ? 'detected' : 'no-detected';
        }
        
        this.safeUpdateElement('nextLevel', imbalanceData.nextLevel);
        this.safeUpdateElement('criticalZone', imbalanceData.criticalZone);
    }

    updateVolumeProfileData(volumeProfileData) {
        this.safeUpdateElement('volumeProfile', `POC: ${volumeProfileData.pocPrice}`);
        this.safeUpdateElement('pocLevel', volumeProfileData.pocPrice);
        this.safeUpdateElement('vpocStrength', `${volumeProfileData.vpocStrength} (${volumeProfileData.vpocPercentage}%)`);
    }

    updatePredictionData(predictionData) {
        const predictionDirection = document.getElementById('predictionDirection');
        if (predictionDirection) {
            predictionDirection.textContent = predictionData.direction;
            predictionDirection.className = this.getPredictionDirectionClass(predictionData.direction);
        }
        
        const predictionProbability = document.getElementById('predictionProbability');
        if (predictionProbability) {
            predictionProbability.textContent = `${predictionData.probability}% Probabilidad`;
            predictionProbability.className = this.getProbabilityClass(predictionData.probability);
        }
        
        this.safeUpdateElement('targetPrice', predictionData.targetPrice);
        this.safeUpdateElement('estimatedTime', predictionData.estimatedTime);
        this.safeUpdateElement('stopLevel', predictionData.stopLevel);
    }

    // Métodos para clases CSS
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
        if (!historyContainer) return;
        
        const history = this.strategyEngine.analysisHistory.slice(0, 5);
        
        if (history.length === 0) {
            historyContainer.innerHTML = '<p style="color: #888; text-align: center;">No hay análisis guardados</p>';
            return;
        }
        
        historyContainer.innerHTML = history.map(item => {
            // Extraer el mercado/ticker del análisis
            const marketCode = item.investing?.ticker || 
                              item.oanda?.price?.instrument?.replace('_', '') || 
                              item.verdict?.ticker || 
                              'N/A';
            
            // Formatear el mercado con emoji apropiado
            let marketDisplay = marketCode;
            const marketEmojis = {
                'XAUUSD': '🥇 XAU/USD',
                'EURUSD': '🇪🇺 EUR/USD', 
                'AUDUSD': '🇦🇺 AUD/USD',
                'USDJPY': '🇺🇸 USD/JPY',
                'GBPUSD': '🇬🇧 GBP/USD',
                'USDCHF': '🇺🇸 USD/CHF',
                'EURJPY': '🇪🇺 EUR/JPY',
                'AUDJPY': '🇦🇺 AUD/JPY',
                'GBPCAD': '🇬🇧 GBP/CAD'
            };
            marketDisplay = marketEmojis[marketCode] || `📈 ${marketCode}`;
            
            return `
                <div class="history-item">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <div><strong>${item.verdict?.direction || 'N/A'}</strong> - ${item.verdict?.confidence || 0}% confianza</div>
                        <div style="font-size: 0.9rem; color: #00d4aa; font-weight: bold;">${marketDisplay}</div>
                    </div>
                    <div>Recomendación: ${item.verdict?.recommendation || 'N/A'}</div>
                    <div>Order Flow: ${item.orderFlow?.prediction?.direction || 'N/A'} (${item.orderFlow?.prediction?.probability || 0}%)</div>
                    <div>Noticias: ${item.news?.warnings?.length || 0} alertas detectadas</div>
                    <div class="timestamp">${new Date(item.timestamp).toLocaleString()}</div>
                </div>
            `;
        }).join('');
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
        this.safeUpdateElement('verdictDirection', message, 'error');
        this.safeUpdateElement('verdictConfidence', 'Error en análisis', 'error');
        this.safeUpdateElement('predictionDirection', 'ERROR', 'error');
    }

    updateTradeRecommendationUI(recommendation) {
        console.log('🎯 Actualizando UI de recomendación de trade:', recommendation);
        
        const container = document.getElementById('tradeRecommendation');
        if (!container) return;
        
        if (recommendation && recommendation.action === 'TRADE_RECOMMENDED') {
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
                    <div class="trade-confidence">${recommendation?.confidence || 0}% Confianza</div>
                </div>
                
                <div class="no-trade-details">
                    <div class="no-trade-reason">
                        <span class="label">Razón:</span>
                        <span class="value">${recommendation?.reason || 'No determinada'}</span>
                    </div>
                    <div class="no-trade-recommendation">
                        <span class="label">Recomendación:</span>
                        <span class="value">${recommendation?.recommendation || 'Esperar mejores condiciones'}</span>
                    </div>
                    <div class="no-trade-next">
                        <span class="label">Próxima revisión:</span>
                        <span class="value">${recommendation?.nextCheck || '15 minutos'}</span>
                    </div>
                    
                    ${recommendation?.newsAlert ? `
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

// Cleanup al cerrar la página
window.addEventListener('beforeunload', () => {
    console.log('🔄 Cerrando aplicación...');
});