/**
 * 🤖 AI CHAT ADVISOR - Volume Profile Expert System
 * Especialista en metodología Dale Woods + Setup EMAs personalizado
 */

class AIChatAdvisor {
    constructor() {
        // 🔑 API Key configurada por el usuario
        this.apiKey = this.getAPIKey();
        
        // 🤖 MODELO ÚNICO - Llama Vision para TODO (texto + imágenes)
        this.model = 'meta-llama/llama-3.2-11b-vision-instruct:free';
        
        // Estado de conversación mejorado
        this.conversationContext = {
            hasAnalyzedImage: false,
            lastImageAnalysis: null,
            isFollowUp: false,
            conversationHistory: [],
            lastAnalysisData: null
        };
        
        this.baseURL = 'https://openrouter.ai/api/v1/chat/completions';
        this.currentTicker = 'XAUUSD';
        this.isThinking = false;
        
        // Managers
        this.storageManager = null;
        this.imageHandler = null;
        
        // UI Elements
        this.chatContainer = null;
        this.chatMessages = null;
        this.messageInput = null;
        this.sendButton = null;
        this.uploadButton = null;
        
        // Estado actual del mercado
        this.currentMarketContext = null;
        
        console.log('🤖 Volume Profile AI Expert inicializado');
    }
    
    // 🧠 OBTENER CONTEXTO DETALLADO DEL ANÁLISIS
    getDetailedAnalysisContext() {
        if (!this.currentMarketContext) {
            return 'No hay datos de análisis técnico disponibles.';
        }

        const analysis = this.currentMarketContext;
        let detailedContext = '';

        // OANDA Data
        if (analysis.oanda) {
            detailedContext += `\nOANDA DATOS EN TIEMPO REAL:\n`;
            detailedContext += `• Precio Bid: ${analysis.oanda.price?.bid || 'N/A'}\n`;
            detailedContext += `• Precio Ask: ${analysis.oanda.price?.ask || 'N/A'}\n`;
            detailedContext += `• Precio Mid: ${analysis.oanda.price?.mid || 'N/A'}\n`;
            detailedContext += `• Spread: ${analysis.oanda.price?.spread || 'N/A'} pips\n`;
            detailedContext += `• Volumen: ${analysis.oanda.price?.volume ? analysis.oanda.price.volume.toLocaleString() : 'N/A'}\n`;
            detailedContext += `• Timestamp: ${new Date(analysis.oanda.price?.time || '').toLocaleString()}\n`;
        }

        // Investing.com Data
        if (analysis.investing) {
            detailedContext += `\nINVESTING.COM ANÁLISIS TÉCNICO:\n`;
            detailedContext += `• Estado de datos: ${analysis.investing.isReal ? 'DATOS REALES' : 'SIMULADO'}\n`;
            
            if (analysis.investing.movingAverages) {
                detailedContext += `• Medias Móviles Summary: ${analysis.investing.movingAverages.summary}\n`;
                detailedContext += `• Medias Móviles Señal: ${analysis.investing.movingAverages.signal}\n`;
                if (analysis.investing.movingAverages.details) {
                    detailedContext += `• Detalles MAs: ${JSON.stringify(analysis.investing.movingAverages.details)}\n`;
                }
            }
            
            if (analysis.investing.oscillators) {
                detailedContext += `• Osciladores Summary: ${analysis.investing.oscillators.summary}\n`;
                detailedContext += `• Osciladores Señal: ${analysis.investing.oscillators.signal}\n`;
                if (analysis.investing.oscillators.details) {
                    detailedContext += `• Detalles Osciladores: ${JSON.stringify(analysis.investing.oscillators.details)}\n`;
                }
            }
        }

        // Order Flow Data
        if (analysis.orderFlow) {
            detailedContext += `\nORDER FLOW ANÁLISIS:\n`;
            detailedContext += `• Nivel de Liquidez: ${analysis.orderFlow.liquidity?.level || 'N/A'}\n`;
            detailedContext += `• Score de Liquidez: ${analysis.orderFlow.liquidity?.score || 'N/A'}\n`;
            detailedContext += `• Predicción Dirección: ${analysis.orderFlow.prediction?.direction || 'N/A'}\n`;
            detailedContext += `• Probabilidad: ${analysis.orderFlow.prediction?.probability || 0}%\n`;
            detailedContext += `• Confianza: ${analysis.orderFlow.prediction?.confidence || 'N/A'}\n`;
            if (analysis.orderFlow.levels) {
                detailedContext += `• Niveles Clave: ${JSON.stringify(analysis.orderFlow.levels)}\n`;
            }
        }

        // Trade Recommendation
        if (analysis.tradeRecommendation) {
            detailedContext += `\nRECOMENDACIÓN DE TRADE:\n`;
            detailedContext += `• Acción Recomendada: ${analysis.tradeRecommendation.action || 'N/A'}\n`;
            detailedContext += `• Confianza: ${analysis.tradeRecommendation.confidence || 0}%\n`;
            detailedContext += `• Razón: ${analysis.tradeRecommendation.reason || 'N/A'}\n`;
            if (analysis.tradeRecommendation.entryPrice) {
                detailedContext += `• Precio Entrada: ${analysis.tradeRecommendation.entryPrice}\n`;
            }
            if (analysis.tradeRecommendation.stopLoss) {
                detailedContext += `• Stop Loss: ${analysis.tradeRecommendation.stopLoss}\n`;
            }
            if (analysis.tradeRecommendation.takeProfit) {
                detailedContext += `• Take Profit: ${analysis.tradeRecommendation.takeProfit}\n`;
            }
        }

        // Verdict Final
        if (analysis.verdict) {
            detailedContext += `\nVEREDICTO FINAL DEL SISTEMA:\n`;
            detailedContext += `• Dirección: ${analysis.verdict.direction || 'N/A'}\n`;
            detailedContext += `• Confianza: ${analysis.verdict.confidence || 0}%\n`;
            detailedContext += `• Recomendación: ${analysis.verdict.recommendation || 'N/A'}\n`;
            detailedContext += `• Timestamp: ${new Date(analysis.verdict.timestamp || analysis.timestamp).toLocaleString()}\n`;
        }

        // News Analysis
        if (analysis.news) {
            detailedContext += `\nANÁLISIS DE NOTICIAS:\n`;
            detailedContext += `• Estado: ${analysis.news.isReal ? 'NOTICIAS REALES' : 'SIMULADO'}\n`;
            if (analysis.news.decisionImpact) {
                detailedContext += `• Impacto en Decisión: ${analysis.news.decisionImpact.percentage}% (${analysis.news.decisionImpact.level})\n`;
                if (analysis.news.decisionImpact.breakdown) {
                    detailedContext += `• Breakdown: Críticas=${analysis.news.decisionImpact.breakdown.critical}, Altas=${analysis.news.decisionImpact.breakdown.high}, Total=${analysis.news.decisionImpact.breakdown.total}\n`;
                }
            }
            if (analysis.news.marketImpact) {
                detailedContext += `• Impacto Mercado: ${analysis.news.marketImpact.level} - ${analysis.news.marketImpact.description}\n`;
            }
            if (analysis.news.warnings && analysis.news.warnings.length > 0) {
                detailedContext += `• Alertas Críticas: ${analysis.news.warnings.length} detectadas\n`;
                analysis.news.warnings.forEach((warning, index) => {
                    detailedContext += `  ${index + 1}. ${warning.message}\n`;
                });
            } else {
                detailedContext += `• Alertas Críticas: Ninguna detectada\n`;
            }
            if (analysis.news.recentNews && analysis.news.recentNews.length > 0) {
                detailedContext += `• Noticias Recientes: ${analysis.news.recentNews.length} noticias\n`;
                analysis.news.recentNews.slice(0, 3).forEach((news, index) => {
                    detailedContext += `  ${index + 1}. [${news.impact}] ${news.title} (${news.time})\n`;
                });
            }
        }

        return detailedContext || 'Análisis técnico en proceso...';
    }
    
    // 🔑 OBTENER API KEY
    getAPIKey() {
        const savedKey = localStorage.getItem('openrouter_api_key');
        if (savedKey) {
            console.log('🔑 API Key encontrada');
            return savedKey;
        }
        console.warn('⚠️ No se encontró API Key de OpenRouter');
        return null;
    }
    
    // 🔧 CONFIGURAR API KEY
    configureAPIKey() {
        const currentKey = localStorage.getItem('openrouter_api_key');
        const message = currentKey ? 
            `API Key actual: ${currentKey.substring(0, 10)}...\n\n¿Quieres cambiarla?` :
            'Configura tu API Key de OpenRouter\n\nObtén una gratis en: https://openrouter.ai';
        
        const newKey = prompt(message + '\n\nIngresa tu API Key:', currentKey || '');
        
        if (newKey && newKey.trim()) {
            localStorage.setItem('openrouter_api_key', newKey.trim());
            this.apiKey = newKey.trim();
            this.showNotification('API Key configurada', 'success');
            return true;
        } else if (newKey === '') {
            localStorage.removeItem('openrouter_api_key');
            this.apiKey = null;
            this.showNotification('API Key eliminada', 'info');
        }
        return false;
    }

    // 🔧 INICIALIZACIÓN
    async initialize() {
        try {
            console.log('🔧 Inicializando Volume Profile Expert...');
            
            if (typeof ChatStorageManager !== 'undefined') {
                this.storageManager = new ChatStorageManager();
            } else {
                console.error('❌ ChatStorageManager no disponible');
                return false;
            }
            
            if (typeof ImageUploadHandler !== 'undefined') {
                this.imageHandler = new ImageUploadHandler();
            } else {
                console.error('❌ ImageUploadHandler no disponible');
                return false;
            }
            
            this.createChatUI();
            this.setupEventListeners();
            this.loadChatHistory(this.currentTicker);
            
            console.log('✅ Volume Profile Expert listo');
            return true;
            
        } catch (error) {
            console.error('❌ Error inicializando:', error);
            return false;
        }
    }

    // 🎨 CONECTAR CON UI EXISTENTE
    createChatUI() {
        this.chatContainer = document.getElementById('chatPanel');
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('chatInput');
        this.sendButton = document.getElementById('sendBtn');
        this.uploadButton = document.getElementById('imageBtn');
        
        if (!this.chatContainer || !this.chatMessages || !this.messageInput || !this.sendButton) {
            console.error('❌ Elementos del chat no encontrados');
            return false;
        }
        
        const welcomeTicker = document.querySelector('.ticker-highlight');
        if (welcomeTicker) {
            welcomeTicker.textContent = this.currentTicker;
        }
        
        console.log('🎨 Conectado con UI existente');
        return true;
    }

    // 🎧 CONFIGURAR EVENT LISTENERS
    setupEventListeners() {
        this.sendButton?.addEventListener('click', () => {
            this.sendMessage();
        });

        this.messageInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.uploadButton?.addEventListener('click', () => {
            document.getElementById('imageInput')?.click();
        });

        document.getElementById('imageInput')?.addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });

        this.messageInput?.addEventListener('input', (e) => {
            this.autoResizeTextarea(e.target);
        });
        
        this.messageInput?.addEventListener('paste', (e) => {
            this.handlePasteImages(e);
        });

        console.log('🎧 Event listeners configurados');
    }

    // 📸 MANEJO DE IMÁGENES
    async handleImageUpload(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        try {
            await this.processAndDisplayImages(files);
        } catch (error) {
            console.error('❌ Error subiendo imágenes:', error);
            this.showNotification('Error subiendo imágenes', 'error');
        }
        event.target.value = '';
    }
    
    async handlePasteImages(event) {
        const items = event.clipboardData?.items;
        if (!items) return;
        
        const imageFiles = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
                event.preventDefault();
                const file = item.getAsFile();
                if (file) imageFiles.push(file);
            }
        }
        
        if (imageFiles.length > 0) {
            this.showNotification(`📷 ${imageFiles.length} imagen(es) pegada(s)`, 'success');
            await this.processAndDisplayImages(imageFiles);
        }
    }
    
    async processAndDisplayImages(files) {
        if (!this.imageHandler) {
            this.showNotification('Image handler no disponible', 'error');
            return;
        }
        
        const previewContainer = document.getElementById('imagePreviewContainer');
        if (!previewContainer) {
            this.showNotification('Contenedor no encontrado', 'error');
            return;
        }
        
        try {
            const results = await this.imageHandler.processMultipleFiles(files);
            
            for (const result of results) {
                if (result.success) {
                    this.imageHandler.createImagePreview(result.data, previewContainer);
                } else {
                    console.error(`Error procesando ${result.filename}:`, result.error);
                    this.showNotification(`Error: ${result.error}`, 'error');
                }
            }
            
            if (previewContainer.children.length > 0) {
                previewContainer.style.display = 'flex';
            }
            
            const successCount = results.filter(r => r.success).length;
            if (successCount > 0) {
                this.showNotification(`✅ ${successCount} imagen(es) lista(s)`, 'success');
            }
            
        } catch (error) {
            console.error('❌ Error procesando imágenes:', error);
            this.showNotification('Error procesando imágenes', 'error');
        }
    }

    hasUploadedImages() {
        return document.querySelectorAll('#imagePreviewContainer .image-preview').length > 0;
    }

    getUploadedImages() {
        const images = [];
        document.querySelectorAll('#imagePreviewContainer .image-preview img').forEach(img => {
            images.push(img.src);
        });
        return images;
    }

    clearUploadedImages() {
        const previewContainer = document.getElementById('imagePreviewContainer');
        if (previewContainer) {
            previewContainer.innerHTML = '';
            previewContainer.style.display = 'none';
        }
    }

    // 📨 ENVIAR MENSAJE
    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message && !this.hasUploadedImages()) {
            this.showNotification('Escribe un mensaje o sube una imagen', 'warning');
            return;
        }

        if (!this.apiKey) {
            const configured = this.configureAPIKey();
            if (!configured) {
                this.showNotification('Necesitas configurar tu API Key', 'warning');
                return;
            }
        }

        if (this.isThinking) {
            this.showNotification('La IA está procesando...', 'info');
            return;
        }

        try {
            this.addUserMessage(message);
            this.messageInput.value = '';
            this.autoResizeTextarea(this.messageInput);
            
            const fullContext = this.prepareContextForAI(message);
            this.showThinkingIndicator();
            
            const response = await this.callOpenRouterAPI(fullContext);
            this.hideThinkingIndicator();
            
            this.addAIMessage(response);
            this.saveChatToStorage();
            
            // Solo limpiar imágenes si no es follow-up
            if (!this.conversationContext.isFollowUp) {
                this.clearUploadedImages();
            }
            
        } catch (error) {
            console.error('❌ Error enviando mensaje:', error);
            this.hideThinkingIndicator();
            
            let errorMessage = '❌ **Error de conexión**\n\n';
            
            if (error.message.includes('401')) {
                errorMessage += 'API Key inválida. ¿Configurar nueva?';
                this.addAIMessage(errorMessage);
                setTimeout(() => {
                    if (confirm('API Key inválida. ¿Configurar nueva?')) {
                        this.configureAPIKey();
                    }
                }, 1000);
            } else {
                errorMessage += 'Error de conexión. Verifica internet e intenta nuevamente.';
                this.addAIMessage(errorMessage);
            }
            
            this.showNotification('Error al enviar mensaje', 'error');
        }
    }

    // 🤖 CONTEXTO DE CONVERSACIÓN MEJORADO
    updateConversationContext(hasImages, userMessage) {
        // Detectar si es follow-up conversacional
        const followUpIndicators = [
            'que opinas', 'tu qué', 'entonces', 'y ahora', 'confirmalo', 'confirma',
            'es asi', 'correcto', 'verdad', 'dirección', 'hacia donde', 'para donde',
            'tu opinion', 'tu piensas', 'crees que', 'el precio', 'POC', 'hacia donde',
            'subir', 'bajar', 'alcista', 'bajista', 'en este momento'
        ];
        
        this.conversationContext.isFollowUp = followUpIndicators.some(indicator => 
            userMessage.toLowerCase().includes(indicator)
        );
        
        if (hasImages) {
            this.conversationContext.hasAnalyzedImage = true;
            this.conversationContext.lastImageAnalysis = new Date().toISOString();
        }
        
        // Mantener historial de análisis
        this.conversationContext.lastAnalysisData = this.currentMarketContext;
        
        console.log('🖼️ Solo Llama Vision:', this.model);
        console.log('💬 Es follow-up?', this.conversationContext.isFollowUp);
        console.log('📊 Tiene datos previos?', !!this.conversationContext.lastAnalysisData);
    }
    
    // 🔍 PREPARAR CONTEXTO PARA LA IA - VOLUME PROFILE EXPERT
    prepareContextForAI(userMessage) {
        const marketContext = this.getCurrentMarketContext();
        const chatHistory = this.getChatHistory();
        const images = this.getUploadedImages();
        
        // Solo Llama Vision - no cambiar modelo
        this.updateConversationContext(images.length > 0, userMessage);
        
        // Determinar el tono de respuesta basado en el contexto
        const isFollowUpQuestion = this.conversationContext.isFollowUp;
        const hasRecentAnalysis = this.conversationContext.hasAnalyzedImage;
        
        let systemPrompt;
        
        if (isFollowUpQuestion && hasRecentAnalysis) {
            // MODO CONVERSACIONAL - Para follow-ups
            systemPrompt = `Eres un trader experto en Volume Profile muy conversacional y directo. El usuario ya te mostró un gráfico y ahora te hace una pregunta de seguimiento.

📊 DATOS COMPLETOS DEL ANÁLISIS ACTUAL (${this.currentTicker}):
${marketContext}

🧠 **INFORMACIÓN TÉCNICA DISPONIBLE:**
${this.getDetailedAnalysisContext()}

💬 **MODO CONVERSATIONAL ACTIVO**
- NO hagas un análisis completo nuevo
- USA los datos del análisis técnico que tienes arriba
- Responde directamente a la pregunta específica
- Sé conversacional y humano como si fueras un colega trader
- Usa el análisis previo de la imagen que ya viste
- Mantén respuestas concisas y al grano
- Puedes usar emojis ocasionales para ser más humano

🎯 **RESPONDE COMO TRADER EXPERIMENTADO:**
- "Mira, según los datos que tengo..."
- "Basándome en el análisis actual..."
- "Te soy honesto, los indicadores muestran..."
- "Por lo que veo en el gráfico y los datos..."
- "Mi opinión considerando todo es que..."

⚡ **REGLAS FOLLOW-UP:**
- Máximo 3-4 líneas de respuesta
- Ve directo al punto
- Confirma o niega con evidencia breve del análisis
- Mantén el contexto de la imagen analizada previamente
- SIEMPRE referencia los datos técnicos disponibles`;
        } else {
            // MODO ANÁLISIS COMPLETO - Para nuevas imágenes o análisis profundo
            systemPrompt = `Eres un EXPERTO MUNDIAL en VOLUME PROFILE con 15+ años especializándote en la metodología exacta de Dale Woods. Combinas este expertise con el setup personalizado del trader.

📊 DATOS COMPLETOS DEL ANÁLISIS ACTUAL (${this.currentTicker}):
${marketContext}

🧠 **INFORMACIÓN TÉCNICA DISPONIBLE:**
${this.getDetailedAnalysisContext()}

🎯 **SETUP PERSONALIZADO DEL TRADER:**
• **EMA 200 (LÍNEA ROJA)**: Tendencia principal - Filtro direccional
• **EMA 55 (LÍNEA AZUL)**: Tendencia intermedia - Confirmación momentum
• **EMA 21 (LÍNEA AMARILLA)**: Tendencia corta - Timing entrada

📈 **VOLUME PROFILE MASTERY:**

**Los 4 Tipos de Perfiles:**
• **D-Profile**: Mercado balanceado, instituciones acumulando posiciones
• **P-Profile**: Compradores agresivos dominan, vendedores débiles (bullish)
• **b-Profile**: Vendedores agresivos dominan, compradores débiles (bearish)  
• **Thin Profile**: Trend explosivo, poco tiempo para acumular volumen

**Elementos Críticos:**
• **POC (Point of Control)**: Precio con MÁXIMO volumen - donde instituciones más operaron
• **VAH/VAL**: Value Area High/Low - contiene 70% del volumen total
• **HVN/LVN**: High/Low Volume Nodes - niveles de soporte/resistencia por volumen
• **Volume Clusters**: Zonas donde instituciones acumularon grandes posiciones

🔍 **LOS 3 SETUPS SAGRADOS (Dale Woods):**

**Setup #1: Volume Accumulation**
- BUSCAR: Zona sideways seguida de breakout agresivo
- LÓGICA: Instituciones acumulan en silencio → Después inician trend
- ENTRADA: En el POC de la zona de acumulación
- CONFLUENCIA CLAVE: Support/Resistance flip + Volume

**Setup #2: Trend Setup**
- BUSCAR: Volume clusters DENTRO de trends fuertes ya establecidos
- LÓGICA: Instituciones aprovechan momentum para añadir más posiciones
- ENTRADA: En los volume clusters del trend en curso
- CONFIRMACIÓN: Dirección debe coincidir con trend principal

**Setup #3: Rejection Setup** 
- BUSCAR: Rechazo fuerte y agresivo con volumen alto concentrado
- LÓGICA: Instituciones defienden violentamente niveles clave
- ENTRADA: En el POC de la zona de rechazo más agresiva
- VALIDACIÓN: La agresividad del rechazo debe ser evidente

🖼️ **METODOLOGÍA ANÁLISIS DE GRÁFICOS:**

**PASO 1 - EMAs Alignment:**
- ¿Alineación bullish (21>55>200) o bearish (21<55<200)?
- ¿Crossovers recientes en EMAs clave?
- ¿Precio respeta o viola las EMAs principales?

**PASO 2 - Volume Profile Identification:**
- Identifica tipo de perfil predominante (D, P, b, Thin)
- Localiza POC más significativo y volume clusters
- Busca cuál de los 3 setups está presente
- Evalúa fuerza del volumen institucional

**PASO 3 - Price Action Context:**
- Sideways areas = Acumulación institucional silenciosa
- Aggressive initiation = Breakouts con volumen explosivo  
- Strong rejections = Instituciones defendiendo territorio
- Failed auctions = Imperfecciones que el mercado corregirá

**PASO 4 - Confluencias Críticas:**
- Volume Profile + EMA alignment + Price Action
- Support becoming resistance (metodología Dale Woods)
- Daily/Weekly highs and lows como confirmación
- Strong vs weak highs/lows (agresión vs debilidad)

📊 **CRITERIOS EVALUACIÓN TRADES:**

✅ **TRADE DE CLASE MUNDIAL:**
- Setup Dale Woods (#1, #2, o #3) cristalino
- POC robusto en zona de alta significancia
- Triple confluencia: Volume + Price Action + EMAs alignment
- Evidencia clara de volumen institucional masivo
- Risk/Reward mínimo 1:1 (preferencia Dale Woods)
- Stop Loss colocado en zona de BAJO volumen

❌ **TRADE AMATEUR/PELIGROSO:**
- Ausencia total de setup Volume Profile válido
- POC débil, difuso o mal definido
- Operación contra TODAS las EMAs sin justificación bomba
- Entrada en zona de bajo volumen (donde instituciones no operan)
- Failed auction cercano que magnetizará el precio
- Weak high/low que será re-testeado inevitablemente

⚠️ **SEÑALES ALERTA ROJA:**
- Weak highs/lows en proximidad peligrosa
- Failed auctions sin resolver creando magnetismo
- Trend institucional fuerte contra dirección del trade
- Volúmenes decrecientes en supuestos breakouts
- Niveles previamente "testeados" por el mercado

🎯 **PROTOCOLO DE RESPUESTA:**

**PARA IMÁGENES DE GRÁFICOS:**
1. **Identificación Setup**: ¿Cuál de los 3 setups de Dale Woods?
2. **EMAs Analysis**: Alineación, crossovers, respeto del precio
3. **Volume Profile**: Tipo perfil, POC, clusters, significancia
4. **Price Action**: Sideways, initiations, rejections, failed auctions
5. **Confluencias**: Factores múltiples convergiendo
6. **Risk Management**: Entry preciso, SL en low volume, TP en resistance

**PARA CONSULTAS DE TEXTO:**
- Aplica siempre principios Volume Profile de Dale Woods
- Referencia los setups cuando sea relevante al contexto
- Enfoque láser en volumen institucional y price action
- Integra análisis de EMAs en cada respuesta contextual

📝 **ESTRUCTURA RESPUESTA OBLIGATORIA:**
1. **Setup Identificado** (Cuál de los 3 + nivel de confianza)
2. **EMAs Context** (Alineación actual y significado)
3. **Volume Analysis** (POC, clusters, tipo perfil dominante)
4. **Confluencias Detectadas** (Factores que se refuerzan)
5. **Risk/Reward Assessment** (Entry, SL, TP con lógica)
6. **Execution Plan** (Pasos específicos y temporización)

🏆 **TU IDENTIDAD ÚNICA:**
Eres THE Volume Profile expert que combina la metodología probada de Dale Woods con análisis en tiempo real de EMAs personalizadas. Tu reputación se construye identificando setups institucionales precision-guided y gestión de riesgo basada en evidencia de volumen.

⚡ **REGLAS INQUEBRANTABLES:**
- JAMÁS confirmes bias del trader sin evidencia volumen sólida
- SIEMPRE identifica cuál de los 3 setups está presente
- NUNCA ignores las EMAs en ningún análisis
- PRIORIZA confluencias Volume + Price Action + EMAs
- SÉ BRUTALMENTE HONESTO sobre calidad del setup
- NO EXISTE "tal vez" - O hay setup válido O NO lo hay`;
        }

        const messages = [{ role: 'system', content: systemPrompt }];

        // Mantener más contexto conversacional para follow-ups
        const historyLimit = isFollowUpQuestion ? -6 : -4;
        const recentHistory = chatHistory.slice(historyLimit);
        recentHistory.forEach(msg => {
            messages.push({ role: msg.role, content: msg.content });
        });

        // Agregar mensaje actual con contexto adecuado
        if (images.length > 0) {
            const content = [
                {
                    type: 'text',
                    text: userMessage || 'Analiza este gráfico aplicando la metodología Volume Profile de Dale Woods. Identifica el setup presente, EMAs alignment y dame tu opinión directa sobre la dirección.'
                }
            ];

            images.forEach(imageData => {
                content.push({
                    type: 'image_url',
                    image_url: { url: imageData }
                });
            });

            messages.push({ role: 'user', content: content });
        } else {
            // Para preguntas de texto, ser más conversacional
            const contextualMessage = isFollowUpQuestion && hasRecentAnalysis ?
                `${userMessage} (Basándote en el gráfico que acabas de analizar)` :
                userMessage;
            
            messages.push({ role: 'user', content: contextualMessage });
        }

        return messages;
    }

    // 🌐 LLAMADA A OPENROUTER API
    async callOpenRouterAPI(messages) {
        // Ajustar parámetros según el tipo de conversación
        const isFollowUp = this.conversationContext.isFollowUp;
        
        const requestBody = {
            model: this.model, // Solo Llama Vision
            messages: messages,
            max_tokens: isFollowUp ? 800 : 2000, // Respuestas más cortas para follow-ups
            temperature: isFollowUp ? 0.8 : 0.7, // Más conversacional para follow-ups
            top_p: 0.9,
            frequency_penalty: 0.1,
            presence_penalty: 0.1
        };

        console.log('🌐 Enviando request a OpenRouter:', {
            model: this.model,
            messageCount: messages.length,
            hasImages: messages.some(m => Array.isArray(m.content)),
            isFollowUp: this.conversationContext.isFollowUp,
            maxTokens: requestBody.max_tokens
        });

        const response = await fetch(this.baseURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Volume Profile Trading Expert'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        console.log('✅ Respuesta recibida de OpenRouter');

        return data.choices[0]?.message?.content || 'No pude generar una respuesta. Intenta nuevamente.';
    }

    // 💬 AGREGAR MENSAJES A LA UI
    addUserMessage(message) {
        const messageHTML = `
            <div class="message user-message">
                <div class="message-avatar">👤</div>
                <div class="message-content">
                    ${this.formatMessage(message)}
                    ${this.getUploadedImagesHTML()}
                </div>
            </div>
        `;
        this.chatMessages.insertAdjacentHTML('beforeend', messageHTML);
        this.scrollToBottom();
    }

    addAIMessage(message) {
        const messageHTML = `
            <div class="message ai-message">
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                    ${this.formatMessage(message)}
                </div>
            </div>
        `;
        this.chatMessages.insertAdjacentHTML('beforeend', messageHTML);
        this.scrollToBottom();
    }
    
    getUploadedImagesHTML() {
        if (!this.hasUploadedImages()) return '';
        
        const images = this.getUploadedImages();
        if (images.length === 0) return '';
        
        return `
            <div class="message-images" style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px;">
                ${images.map(img => `
                    <img src="${img}" alt="Imagen subida" 
                         style="max-width: 150px; max-height: 150px; border-radius: 8px; border: 1px solid rgba(0, 212, 170, 0.3);">
                `).join('')}
            </div>
        `;
    }

    // 🤔 INDICADORES
    showThinkingIndicator() {
        this.isThinking = true;
        this.sendButton.disabled = true;
        
        // Indicador diferente para follow-ups
        const thinkingEmoji = this.conversationContext.isFollowUp ? '💭' : '🤔';
        this.sendButton.innerHTML = `<span>${thinkingEmoji}</span>`;
        
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.style.display = 'flex';
            typingIndicator.classList.add('show');
            
            // Agregar clase para modo conversacional
            if (this.conversationContext.isFollowUp) {
                typingIndicator.classList.add('conversation-mode');
            } else {
                typingIndicator.classList.remove('conversation-mode');
            }
        }
        
        this.showConversationModeIndicator();
        this.scrollToBottom();
    }

    hideThinkingIndicator() {
        this.isThinking = false;
        this.sendButton.disabled = false;
        this.sendButton.innerHTML = '<span>📤</span>';
        
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.style.display = 'none';
            typingIndicator.classList.remove('show', 'conversation-mode');
        }
    }

    // 📊 CONTEXTO DEL MERCADO
    updateMarketContext(analysisData) {
        this.currentMarketContext = analysisData;
        
        const tickerDisplays = document.querySelectorAll('#chatTickerDisplay, #welcomeTicker');
        tickerDisplays.forEach(element => {
            if (element) element.textContent = this.currentTicker;
        });
        
        console.log(`📊 Contexto actualizado para ${this.currentTicker}`);
    }

    getCurrentMarketContext() {
        if (!this.currentMarketContext) {
            return `No hay análisis actual disponible para ${this.currentTicker}.`;
        }

        const analysis = this.currentMarketContext;
        
        return `
ANÁLISIS ACTUAL (${this.currentTicker}):
• Dirección: ${analysis.verdict?.direction || 'N/A'} (${analysis.verdict?.confidence || 0}% confianza)
• Recomendación: ${analysis.verdict?.recommendation || 'N/A'}
• Precio actual: ${analysis.oanda?.price?.mid || 'N/A'}
• Spread: ${analysis.oanda?.price?.spread || 'N/A'} pips
• Volumen: ${analysis.oanda?.price?.volume ? analysis.oanda.price.volume.toLocaleString() : 'N/A'}

DATOS TÉCNICOS:
• Estado: ${analysis.investing?.isReal ? 'DATOS REALES' : 'SIMULADO'}
• Medias móviles: ${analysis.investing?.movingAverages?.summary || 'N/A'}
• Osciladores: ${analysis.investing?.oscillators?.summary || 'N/A'}

ORDER FLOW:
• Liquidez: ${analysis.orderFlow?.liquidity?.level || 'N/A'}
• Dirección: ${analysis.orderFlow?.prediction?.direction || 'N/A'}
• Probabilidad: ${analysis.orderFlow?.prediction?.probability || 0}%

TRADE RECOMMENDATION:
• Acción: ${analysis.tradeRecommendation?.action || 'N/A'}
• Confianza: ${analysis.tradeRecommendation?.confidence || 0}%

Timestamp: ${new Date(analysis.timestamp).toLocaleString()}
        `.trim();
    }

    // 🔄 CAMBIO DE TICKER
    changeTicker(newTicker) {
        this.saveChatToStorage();
        this.currentTicker = newTicker;
        this.loadChatHistory(newTicker);
        
        const tickerDisplays = document.querySelectorAll('#chatCurrentTicker, .ticker-highlight');
        tickerDisplays.forEach(element => {
            if (element) element.textContent = newTicker;
        });
        
        console.log(`🔄 Ticker cambiado a ${newTicker}`);
    }

    // 💾 GESTIÓN DE HISTORIAL
    getChatHistory() {
        if (!this.storageManager) return [];
        return this.storageManager.getChatHistory(this.currentTicker);
    }

    loadChatHistory(ticker) {
        const history = this.storageManager?.getChatHistory(ticker) || [];
        
        const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
        this.chatMessages.innerHTML = '';
        if (welcomeMessage) {
            this.chatMessages.appendChild(welcomeMessage);
        }
        
        history.forEach(msg => {
            if (msg.role === 'user') {
                this.addUserMessage(msg.content);
            } else if (msg.role === 'assistant') {
                this.addAIMessage(msg.content);
            }
        });
        
        this.scrollToBottom();
    }

    saveChatToStorage() {
        if (!this.storageManager) return;
        
        const messages = [];
        const messageElements = this.chatMessages.querySelectorAll('.user-message, .ai-message:not(.thinking-message)');
        
        messageElements.forEach(element => {
            if (element.classList.contains('welcome-message')) return;
            
            const isUser = element.classList.contains('user-message');
            const content = element.querySelector('.message-content').textContent;
            
            if (content) {
                messages.push({
                    role: isUser ? 'user' : 'assistant',
                    content: content,
                    timestamp: new Date().toISOString()
                });
            }
        });
        
        this.storageManager.saveChatHistory(this.currentTicker, messages);
    }

    // 🛠️ UTILIDADES
    formatMessage(message) {
        if (!message) return '';
        
        return message
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>')
            .replace(/#{1,3}\s*(.*?)(?:\n|$)/g, '<h4>$1</h4>');
    }

    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }

    showConversationModeIndicator() {
        if (this.conversationContext.isFollowUp && this.conversationContext.hasAnalyzedImage) {
            // Crear indicador si no existe
            let indicator = document.getElementById('conversationModeIndicator');
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'conversationModeIndicator';
                indicator.className = 'conversation-mode-indicator';
                indicator.innerHTML = `
                    <span class="mode-icon">💬</span>
                    <span>Modo Conversacional - Respondiendo a tu pregunta</span>
                `;
                
                const chatMessages = document.getElementById('chatMessages');
                if (chatMessages) {
                    chatMessages.appendChild(indicator);
                }
            }
            
            indicator.classList.add('show');
            
            // Auto-ocultar después de 3 segundos
            setTimeout(() => {
                if (indicator) {
                    indicator.classList.remove('show');
                    setTimeout(() => {
                        if (indicator && indicator.parentNode) {
                            indicator.parentNode.removeChild(indicator);
                        }
                    }, 300);
                }
            }, 3000);
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.className = `chat-notification-popup ${type}`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // 🧹 LIMPIEZA
    clearChatHistory() {
        if (confirm(`¿Limpiar historial de chat para ${this.currentTicker}?`)) {
            this.storageManager?.clearChatHistory(this.currentTicker);
            this.loadChatHistory(this.currentTicker);
            this.showNotification('Historial limpiado', 'success');
        }
    }
    
    clearChat() {
        this.clearChatHistory();
    }

    // 📤 EXPORTAR CHAT
    exportChatHistory() {
        const history = this.getChatHistory();
        if (history.length === 0) {
            this.showNotification('No hay historial para exportar', 'warning');
            return;
        }
        
        const exportData = {
            ticker: this.currentTicker,
            exportDate: new Date().toISOString(),
            chatHistory: history,
            marketContext: this.currentMarketContext
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `volume-profile-chat-${this.currentTicker}-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showNotification('Chat exportado', 'success');
    }
}

// 🌍 DISPONIBILIDAD GLOBAL
window.AIChatAdvisor = AIChatAdvisor;
console.log('✅ Volume Profile Expert System cargado completamente');
