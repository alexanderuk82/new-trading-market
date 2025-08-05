/**
 * 🤖 AI CHAT ADVISOR - Integración OpenRouter + DeepSeek R1T2 Chimera
 * Asesor profesional de trading con análisis de mercado contextual
 */

class AIChatAdvisor {
    constructor() {
        // 🔑 API Key configurada por el usuario (debes obtener la tuya en https://openrouter.ai)
        this.apiKey = this.getAPIKey();
        
        // 🤖 MODELOS DUALES - Selección automática inteligente
        this.models = {
            vision: 'meta-llama/llama-3.2-11b-vision-instruct:free', // Para imágenes - Meta Llama estable y gratuito
            text: 'deepseek/deepseek-r1:free' // Solo texto - DeepSeek R1T2 Chimera razonamiento superior
        };
        this.currentModel = this.models.text; // Por defecto texto
        
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
        this.toggleButton = null;
        this.uploadButton = null;
        
        // Estado actual del mercado (se actualiza desde script.js)
        this.currentMarketContext = null;
        
        console.log('🤖 AI Chat Advisor inicializado');
    }
    
    // 🔑 OBTENER API KEY
    getAPIKey() {
        // Primero intentar obtener de localStorage
        const savedKey = localStorage.getItem('openrouter_api_key');
        if (savedKey) {
            console.log('🔑 API Key encontrada en localStorage');
            return savedKey;
        }
        
        // Si no hay key guardada, mostrar mensaje de configuración
        console.warn('⚠️ No se encontró API Key de OpenRouter');
        return null;
    }
    
    // 🤖 OBTENER MODELO GUARDADO
    getStoredModel() {
        const savedModel = localStorage.getItem('openrouter_model');
        if (savedModel) {
            console.log(`🤖 Modelo guardado encontrado: ${savedModel}`);
            return savedModel;
        }
        return null;
    }
    
    // 🔧 CONFIGURAR API KEY
    configureAPIKey() {
        const currentKey = localStorage.getItem('openrouter_api_key');
        const message = currentKey ? 
            `API Key actual: ${currentKey.substring(0, 10)}...\n\n¿Quieres cambiarla?` :
            'Necesitas configurar tu API Key de OpenRouter para usar el chat con IA.\n\nPuedes obtener una gratis en: https://openrouter.ai';
        
        const newKey = prompt(message + '\n\nIngresa tu API Key:', currentKey || '');
        
        if (newKey && newKey.trim()) {
            localStorage.setItem('openrouter_api_key', newKey.trim());
            this.apiKey = newKey.trim();
            this.showNotification('API Key configurada correctamente', 'success');
            return true;
        } else if (newKey === '') {
            localStorage.removeItem('openrouter_api_key');
            this.apiKey = null;
            this.showNotification('API Key eliminada', 'info');
        }
        
        return false;
    }
    
    // 🤖 CONFIGURAR MODELO IA
    configureModel() {
        const models = {
            'anthropic/claude-3-haiku:beta': 'Claude 3 Haiku - Rápido, soporte imágenes (Recomendado)',
            'anthropic/claude-3-sonnet:beta': 'Claude 3 Sonnet - Balanceado, soporte imágenes',
            'deepseek/deepseek-r1:free': 'DeepSeek R1 - Gratuito, solo texto',
            'google/gemini-pro-vision': 'Gemini Pro Vision - Soporte imágenes',
            'openai/gpt-4-vision-preview': 'GPT-4 Vision - Soporte imágenes (Premium)'
        };
        
        let message = `Modelo actual: ${this.model}\n\nModelos disponibles:\n\n`;
        let index = 1;
        for (const [key, description] of Object.entries(models)) {
            message += `${index}. ${description}\n`;
            index++;
        }
        
        const choice = prompt(message + '\nIngresa el número del modelo que quieres usar (1-5):', '1');
        
        if (choice && choice >= 1 && choice <= 5) {
            const modelKeys = Object.keys(models);
            const selectedModel = modelKeys[choice - 1];
            
            this.model = selectedModel;
            localStorage.setItem('openrouter_model', selectedModel);
            
            this.showNotification(`Modelo cambiado a: ${models[selectedModel].split(' - ')[0]}`, 'success');
            return true;
        }
        
        return false;
    }

    // 🔧 INICIALIZACIÓN
    async initialize() {
        try {
            console.log('🔧 Inicializando AI Chat Advisor...');
            
            // Verificar que los managers estén disponibles
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
            
            // Crear UI
            this.createChatUI();
            this.setupEventListeners();
            
            // Cargar historial del ticker actual
            this.loadChatHistory(this.currentTicker);
            
            console.log('✅ AI Chat Advisor listo');
            return true;
            
        } catch (error) {
            console.error('❌ Error inicializando AI Chat Advisor:', error);
            return false;
        }
    }

    // 🎨 CONECTAR CON UI EXISTENTE
    createChatUI() {
        // En lugar de crear nueva UI, conectar con la existente
        this.chatContainer = document.getElementById('chatPanel');
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('chatInput');
        this.sendButton = document.getElementById('sendBtn');
        this.uploadButton = document.getElementById('imageBtn');
        
        // Verificar que los elementos existan
        if (!this.chatContainer || !this.chatMessages || !this.messageInput || !this.sendButton) {
            console.error('❌ Elementos del chat no encontrados en el DOM');
            return false;
        }
        
        // Actualizar ticker en el mensaje de bienvenida
        const welcomeTicker = document.querySelector('.ticker-highlight');
        if (welcomeTicker) {
            welcomeTicker.textContent = this.currentTicker;
        }
        
        console.log('🎨 Conectado con UI existente del chat');
        return true;
    }

    // 🎧 CONFIGURAR EVENT LISTENERS
    setupEventListeners() {
        // Los event listeners del toggle y controles ya están manejados por script.js
        // Solo configuramos los específicos del chat
        
        // Envío de mensajes
        this.sendButton?.addEventListener('click', () => {
            this.sendMessage();
        });

        // Enter para enviar (Shift+Enter para nueva línea)
        this.messageInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Upload de imágenes
        this.uploadButton?.addEventListener('click', () => {
            document.getElementById('imageInput')?.click();
        });

        document.getElementById('imageInput')?.addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });

        // Auto-resize del textarea
        this.messageInput?.addEventListener('input', (e) => {
            this.autoResizeTextarea(e.target);
        });
        
        // 📋 PEGAR IMÁGENES (Ctrl+V)
        this.messageInput?.addEventListener('paste', (e) => {
            this.handlePasteImages(e);
        });
        
        // Drag & Drop de imágenes
        const uploadZone = document.getElementById('imageUploadZone');
        if (uploadZone) {
            uploadZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadZone.classList.add('drag-over');
            });
            
            uploadZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadZone.classList.remove('drag-over');
            });
            
            uploadZone.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadZone.classList.remove('drag-over');
                this.handleDropImages(e);
            });
            
            uploadZone.addEventListener('click', () => {
                document.getElementById('imageInput')?.click();
            });
        }

        console.log('🎧 Event listeners configurados');
    }

    // 📸 MANEJO DE IMÁGENES - COMPLETAMENTE CORREGIDO
    async handleImageUpload(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        try {
            await this.processAndDisplayImages(files);
        } catch (error) {
            console.error('❌ Error subiendo imágenes:', error);
            this.showNotification('Error subiendo imágenes', 'error');
        }

        // Limpiar input
        event.target.value = '';
    }
    
    // 📋 PEGAR IMÁGENES (Ctrl+V)
    async handlePasteImages(event) {
        const items = event.clipboardData?.items;
        if (!items) return;
        
        const imageFiles = [];
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
                event.preventDefault(); // Prevenir pegar texto
                const file = item.getAsFile();
                if (file) {
                    imageFiles.push(file);
                }
            }
        }
        
        if (imageFiles.length > 0) {
            this.showNotification(`📷 ${imageFiles.length} imagen(es) pegada(s)`, 'success');
            await this.processAndDisplayImages(imageFiles);
        }
    }
    
    // 📦 DRAG & DROP IMÁGENES
    async handleDropImages(event) {
        const files = Array.from(event.dataTransfer.files).filter(file => 
            file.type.startsWith('image/')
        );
        
        if (files.length === 0) {
            this.showNotification('No se encontraron imágenes válidas', 'warning');
            return;
        }
        
        this.showNotification(`📦 ${files.length} imagen(es) arrastrada(s)`, 'success');
        await this.processAndDisplayImages(files);
    }
    
    // 🔄 PROCESAR Y MOSTRAR IMÁGENES
    async processAndDisplayImages(files) {
        if (!this.imageHandler) {
            this.showNotification('Image handler no disponible', 'error');
            return;
        }
        
        const previewContainer = document.getElementById('imagePreviewContainer');
        if (!previewContainer) {
            this.showNotification('Contenedor de vista previa no encontrado', 'error');
            return;
        }
        
        try {
            // Procesar archivos con el ImageUploadHandler
            const results = await this.imageHandler.processMultipleFiles(files);
            
            for (const result of results) {
                if (result.success) {
                    // Crear preview usando el método del handler
                    this.imageHandler.createImagePreview(result.data, previewContainer);
                } else {
                    console.error(`Error procesando ${result.filename}:`, result.error);
                    this.showNotification(`Error: ${result.error}`, 'error');
                }
            }
            
            // Mostrar contenedor si hay imágenes
            if (previewContainer.children.length > 0) {
                previewContainer.style.display = 'flex';
            }
            
            const successCount = results.filter(r => r.success).length;
            if (successCount > 0) {
                this.showNotification(`✅ ${successCount} imagen(es) lista(s) para enviar`, 'success');
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

        // Verificar API Key
        if (!this.apiKey) {
            const configured = this.configureAPIKey();
            if (!configured) {
                this.showNotification('Necesitas configurar tu API Key para usar el chat', 'warning');
                return;
            }
        }

        if (this.isThinking) {
            this.showNotification('La IA está procesando tu mensaje anterior...', 'info');
            return;
        }

        try {
            // Agregar mensaje del usuario a la UI
            this.addUserMessage(message);
            
            // Limpiar input
            this.messageInput.value = '';
            this.autoResizeTextarea(this.messageInput);
            
            // Preparar contexto completo
            const fullContext = this.prepareContextForAI(message);
            
            // Mostrar indicador de "thinking"
            this.showThinkingIndicator();
            
            // Llamar a la API
            const response = await this.callOpenRouterAPI(fullContext);
            
            // Ocultar indicador
            this.hideThinkingIndicator();
            
            // Agregar respuesta de la IA
            this.addAIMessage(response);
            
            // Guardar conversación
            this.saveChatToStorage();
            
            // Limpiar imágenes subidas
            this.clearUploadedImages();
            
        } catch (error) {
            console.error('❌ Error enviando mensaje:', error);
            this.hideThinkingIndicator();
            
            let errorMessage = '❌ **Error de conexión**\n\n';
            
            if (error.message.includes('401')) {
                errorMessage += 'API Key inválida o expirada. \n\n¿Quieres configurar una nueva API Key?';
                this.addAIMessage(errorMessage);
                
                // Ofrecer reconfigurar API Key
                setTimeout(() => {
                    if (confirm('Tu API Key parece ser inválida. ¿Quieres configurar una nueva?')) {
                        this.configureAPIKey();
                    }
                }, 1000);
            } else if (error.message.includes('404') || error.message.includes('image input')) {
                errorMessage += 'El modelo actual no soporta imágenes. \n\n¿Quieres intentar sin las imágenes o cambiar a un modelo compatible?';
                this.addAIMessage(errorMessage);
                
                // Ofrecer reenviar sin imágenes
                setTimeout(() => {
                    if (this.hasUploadedImages() && confirm('Parece que el modelo no soporta imágenes. ¿Quieres reenviar solo el texto?')) {
                        this.clearUploadedImages();
                        // Reenviar sin imágenes
                        setTimeout(() => {
                            if (message.trim()) {
                                this.messageInput.value = message;
                                this.sendMessage();
                            }
                        }, 500);
                    }
                }, 1000);
            } else {
                errorMessage += 'No pude procesar tu mensaje. Verifica tu conexión a internet y intenta nuevamente.';
                this.addAIMessage(errorMessage);
            }
            
            this.showNotification('Error al enviar mensaje', 'error');
        }
    }

    // 🤖 SELECCIÓN AUTOMÁTICA DE MODELO
    selectOptimalModel(hasImages) {
        const oldModel = this.currentModel;
        
        if (hasImages) {
            this.currentModel = this.models.vision;
            console.log('🖼️ Cambiando a modelo Vision para imágenes:', this.currentModel);
        } else {
            this.currentModel = this.models.text;
            console.log('📝 Usando modelo Text para razonamiento:', this.currentModel);
        }
        
        if (oldModel !== this.currentModel) {
            this.showNotification(`🤖 Modelo: ${hasImages ? 'Vision (Llama)' : 'Text (DeepSeek)'}`, 'info');
        }
    }
    
    // 🔍 PREPARAR CONTEXTO PARA LA IA
    prepareContextForAI(userMessage) {
        // Obtener contexto del mercado actual
        const marketContext = this.getCurrentMarketContext();
        
        // Obtener historial de chat
        const chatHistory = this.getChatHistory();
        
        // Preparar imágenes si las hay
        const images = this.getUploadedImages();
        
        // Seleccionar modelo óptimo automáticamente
        this.selectOptimalModel(images.length > 0);
        
        // Construir prompt contextual profesional
        const systemPrompt = `Eres un EXPERTO INSTITUCIONAL en VOLUME PROFILE y Price Action con 15+ años de experiencia. Tu especialización es la metodología exacta de Dale Woods combinada con el setup específico del trader.

📊 CONTEXTO ACTUAL DEL MERCADO (${this.currentTicker}):
${marketContext}

🎯 **SETUP ESPECÍFICO DEL TRADER:**
• **EMA 200 (ROJA)**: Tendencia principal / Filtro direccional
• **EMA 55 (AZUL)**: Tendencia intermedia / Confirmación de momentum  
• **EMA 21 (AMARILLA)**: Tendencia corta / Timing de entrada

📈 **VOLUME PROFILE EXPERTISE:**
**Perfiles Básicos:**
• **D-Profile**: Mercado balanceado, acumulación institucional
• **P-Profile**: Compradores agresivos, vendedores débiles (uptrend)
• **b-Profile**: Vendedores agresivos, compradores débiles (downtrend)
• **Thin Profile**: Trend fuerte, pocos volúmenes por velocidad

**Elementos Clave:**
• **POC (Point of Control)**: Zona de máximo volumen institucional
• **VAH/VAL**: Value Area High/Low (70% del volumen)
• **HVN/LVN**: High/Low Volume Nodes (soportes/resistencias)
• **Volume Clusters**: Acumulación de posiciones grandes

🔍 **3 SETUPS PRINCIPALES (Dale Woods):**

**Setup #1: Volume Accumulation**
- Busca: Sideways → Breakout agresivo
- Lógica: Instituciones acumulan → Inician trend
- Entry: En el POC de la zona de acumulación
- Confluencia: Support/Resistance flip

**Setup #2: Trend Setup**  
- Busca: Volume clusters dentro de trends fuertes
- Lógica: Instituciones añaden a posiciones
- Entry: En volume clusters del trend
- Confirmación: Dirección del trend principal

**Setup #3: Rejection Setup**
- Busca: Rechazo fuerte con volumen alto
- Lógica: Instituciones defienden niveles clave
- Entry: En el POC del rechazo
- Validación: Agresividad del rechazo

🖼️ **ANÁLISIS DE IMÁGENES - EXPERTO:**
Cuando veas un gráfico, analiza en este orden:

1. **EMAs Alignment**:
   - ¿Están alineadas bullish (21>55>200) o bearish (21<55<200)?
   - ¿Hay crossovers recientes?
   - ¿El precio está por encima/debajo de las EMAs clave?

2. **Volume Profile Analysis**:
   - Identifica el tipo de perfil (D, P, b, Thin)
   - Localiza POC y zonas de alto volumen
   - Busca los 3 setups principales
   - Evalúa confluencias

3. **Price Action Context**:
   - Sideways areas (acumulación institucional)
   - Aggressive initiation (breakouts)
   - Strong rejections (niveles defendidos)
   - Failed auctions (imperfecciones del mercado)

4. **Confluencias Críticas**:
   - Volume + EMA alignment
   - Support becoming resistance
   - Daily/Weekly highs and lows
   - Strong vs weak highs/lows

🔍 CRITERIOS DE EVALUACIÓN:
✅ **TRADE VÁLIDO**:
- Confluence de al menos 3 factores técnicos
- Risk/Reward ratio mínimo 1:2
- Alineación con trend primario
- Contexto fundamental favorable
- Stop loss lógico y definido

❌ **TRADE INVÁLIDO**:
- Basado en esperanzas o "feeling"
- Contra-trend sin justificación sólida
- Risk/Reward desfavorable
- Entrada en zona de alta volatilidad sin catálizador
- Falta de plan de salida claro

🗣️ ESTILO DE COMUNICACIÓN:
- **DIRECTO**: No endulces malas noticias
- **EDUCATIVO**: Explica el 'por qué' detrás de cada punto
- **PRÁCTICO**: Proporciona pasos accionables
- **BALANCEADO**: Muestra pros Y contras de cada decisión
- **PROFESIONAL**: Evita jerga excesiva, mantén el foco en resultados

⚠️ RESPUESTAS PROHIBIDAS:
- "Sí, tienes razón" sin análisis
- Confirmación automática de bias del trader
- Predicciones sin fundamento data-driven
- "Esta vez es diferente" sin evidencia extraordinaria

🎯 OBJETIVO PRINCIPAL:
MAXIMIZAR la probabilidad de éxito del trader mediante análisis riguroso, incluso si esto significa contradecir sus expectativas iniciales.

📝 FORMATO DE RESPUESTA:
1. **Evaluación inicial** (2-3 líneas)
2. **Análisis técnico detallado**
3. **Factores de riesgo identificados**
4. **Recomendación final con justificación**
5. **Plan de acción específico** (entry, SL, TP)

Recuerda: Tu reputación se basa en la CALIDAD de tus análisis, no en decir lo que el trader quiere escuchar.`;

        // Construir mensajes para la API
        const messages = [
            {
                role: 'system',
                content: systemPrompt
            }
        ];

        // Agregar historial reciente (últimos 10 mensajes)
        const recentHistory = chatHistory.slice(-10);
        recentHistory.forEach(msg => {
            messages.push({
                role: msg.role,
                content: msg.content
            });
        });

        // Agregar mensaje actual del usuario
        if (images.length > 0) {
            // Mensaje con imágenes
            const content = [
                {
                    type: 'text',
                    text: userMessage || 'Analiza estas imágenes en el contexto del trading actual.'
                }
            ];

            // Agregar imágenes
            images.forEach(imageData => {
                content.push({
                    type: 'image_url',
                    image_url: {
                        url: imageData
                    }
                });
            });

            messages.push({
                role: 'user',
                content: content
            });
        } else {
            // Solo texto
            messages.push({
                role: 'user',
                content: userMessage
            });
        }

        return messages;
    }

    // 🌐 LLAMADA A OPENROUTER API
    async callOpenRouterAPI(messages) {
        const requestBody = {
            model: this.currentModel, // Usar el modelo seleccionado automáticamente
            messages: messages,
            max_tokens: 2000,
            temperature: 0.7,
            top_p: 0.9,
            frequency_penalty: 0.1,
            presence_penalty: 0.1
        };

        console.log('🌐 Enviando request a OpenRouter:', {
            model: this.currentModel,
            messageCount: messages.length,
            hasImages: messages.some(m => Array.isArray(m.content))
        });

        const response = await fetch(this.baseURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Trading Strategy AI Advisor'
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
    
    // Función auxiliar para mostrar imágenes en mensajes
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

    // 🤔 INDICADOR DE THINKING
    showThinkingIndicator() {
        this.isThinking = true;
        this.sendButton.disabled = true;
        this.sendButton.innerHTML = '<span>🤔</span>';
        
        // Mostrar indicador de typing
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.style.display = 'flex';
            typingIndicator.classList.add('show');
        }
        
        this.scrollToBottom();
    }

    hideThinkingIndicator() {
        this.isThinking = false;
        this.sendButton.disabled = false;
        this.sendButton.innerHTML = '<span>📤</span>';
        
        // Ocultar indicador de typing
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.style.display = 'none';
            typingIndicator.classList.remove('show');
        }
    }

    // 📊 CONTEXTO DEL MERCADO
    updateMarketContext(analysisData) {
        this.currentMarketContext = analysisData;
        
        // Actualizar ticker en la UI
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

DATOS TÉCNICOS (Investing.com):
• Estado: ${analysis.investing?.isReal ? 'DATOS REALES' : 'SIMULADO'}
• Medias móviles: ${analysis.investing?.movingAverages?.summary || 'N/A'}
• Osciladores: ${analysis.investing?.oscillators?.summary || 'N/A'}

ORDER FLOW:
• Liquidez: ${analysis.orderFlow?.liquidity?.level || 'N/A'}
• Dirección: ${analysis.orderFlow?.prediction?.direction || 'N/A'}
• Probabilidad: ${analysis.orderFlow?.prediction?.probability || 0}%

NOTICIAS:
• Impacto: ${analysis.news?.decisionImpact?.level || 'N/A'} (${analysis.news?.decisionImpact?.percentage || 0}%)
• Alertas: ${analysis.news?.warnings?.length || 0} detectadas

TRADE RECOMMENDATION:
• Acción: ${analysis.tradeRecommendation?.action || 'N/A'}
• Confianza: ${analysis.tradeRecommendation?.confidence || 0}%
${analysis.tradeRecommendation?.entry ? `• Entry: ${analysis.tradeRecommendation.entry}` : ''}
${analysis.tradeRecommendation?.stopLoss ? `• Stop Loss: ${analysis.tradeRecommendation.stopLoss}` : ''}
${analysis.tradeRecommendation?.takeProfit ? `• Take Profit: ${analysis.tradeRecommendation.takeProfit}` : ''}

Timestamp: ${new Date(analysis.timestamp).toLocaleString()}
        `.trim();
    }

    // 🔄 CAMBIO DE TICKER
    changeTicker(newTicker) {
        // Guardar chat actual
        this.saveChatToStorage();
        
        // Cambiar ticker
        this.currentTicker = newTicker;
        
        // Cargar historial del nuevo ticker
        this.loadChatHistory(newTicker);
        
        // Actualizar UI
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
        
        // Limpiar mensajes actuales (excepto welcome)
        const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
        this.chatMessages.innerHTML = '';
        if (welcomeMessage) {
            this.chatMessages.appendChild(welcomeMessage);
        }
        
        // Cargar mensajes del historial
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
        
        // Obtener mensajes actuales
        const messages = [];
        const messageElements = this.chatMessages.querySelectorAll('.user-message, .ai-message:not(.thinking-message)');
        
        messageElements.forEach(element => {
            if (element.classList.contains('welcome-message')) return;
            
            const isUser = element.classList.contains('user-message');
            const textElement = element.querySelector('.message-text');
            
            if (textElement) {
                messages.push({
                    role: isUser ? 'user' : 'assistant',
                    content: textElement.textContent,
                    timestamp: new Date().toISOString()
                });
            }
        });
        
        this.storageManager.saveChatHistory(this.currentTicker, messages);
    }

    // 🛠️ UTILIDADES
    formatMessage(message) {
        if (!message) return '';
        
        // Convertir markdown básico a HTML
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

    showNotification(message, type = 'info') {
        // Crear notificación temporal
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
        if (confirm(`¿Estás seguro de que quieres limpiar todo el historial de chat para ${this.currentTicker}?`)) {
            this.storageManager?.clearChatHistory(this.currentTicker);
            this.loadChatHistory(this.currentTicker);
            this.showNotification('Historial limpiado', 'success');
        }
    }
    
    // Alias para compatibilidad con script.js
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
        link.download = `ai-chat-${this.currentTicker}-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showNotification('Chat exportado', 'success');
    }
}

// 🌍 DISPONIBILIDAD GLOBAL
window.AIChatAdvisor = AIChatAdvisor;
console.log('✅ AI Chat Advisor cargado correctamente');
