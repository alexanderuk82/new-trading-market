/**
 * 🤖 AI CHAT ADVISOR - Integración OpenRouter + DeepSeek R1T2 Chimera
 * Asesor profesional de trading con análisis de mercado contextual
 */

class AIChatAdvisor {
    constructor() {
        // 🔑 API Key configurada por el usuario (debes obtener la tuya en https://openrouter.ai)
        this.apiKey = this.getAPIKey();
        this.model = 'deepseek/deepseek-r1:free'; // Modelo gratuito más estable
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

        console.log('🎧 Event listeners configurados');
    }

    // 📸 MANEJO DE IMÁGENES (usando el sistema existente)
    async handleImageUpload(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        try {
            // Usar el ImageUploadHandler existente
            if (this.imageHandler) {
                for (const file of files) {
                    await this.imageHandler.handleImageUpload(file);
                }
                
                // Mostrar vista previa en el contenedor existente
                const previewContainer = document.getElementById('imagePreviewContainer');
                if (previewContainer) {
                    previewContainer.style.display = 'flex';
                }
            }
            
        } catch (error) {
            console.error('❌ Error subiendo imágenes:', error);
            this.showNotification('Error subiendo imágenes', 'error');
        }

        // Limpiar input
        event.target.value = '';
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
            } else {
                errorMessage += 'No pude procesar tu mensaje. Verifica tu conexión a internet y intenta nuevamente.';
                this.addAIMessage(errorMessage);
            }
            
            this.showNotification('Error al enviar mensaje', 'error');
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
        
        // Construir prompt contextual
        const systemPrompt = `Eres un asesor profesional de trading especializado en análisis técnico y fundamental. Tu objetivo es ayudar al trader con análisis del mercado ${this.currentTicker} en timeframe de 15 minutos.

CONTEXTO ACTUAL DEL MERCADO (${this.currentTicker}):
${marketContext}

INSTRUCCIONES:
1. Proporciona análisis profesional y práctico
2. Si hay imágenes, analízalas detalladamente
3. Sugiere estrategias alternativas cuando sea apropiado
4. Mantén un tono profesional pero cercano
5. Usa emojis ocasionalmente para claridad
6. Si detectas riesgo alto, menciona gestión de riesgo

IMPORTANTE: Basa tus recomendaciones en los datos reales del análisis actual.`;

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
            model: this.model,
            messages: messages,
            max_tokens: 2000,
            temperature: 0.7,
            top_p: 0.9,
            frequency_penalty: 0.1,
            presence_penalty: 0.1
        };

        console.log('🌐 Enviando request a OpenRouter:', {
            model: this.model,
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
