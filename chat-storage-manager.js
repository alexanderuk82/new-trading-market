/**
 * 💾 CHAT STORAGE MANAGER
 * Gestiona la persistencia del historial de chat por ticker
 */

class ChatStorageManager {
    constructor() {
        this.storageKey = 'tradingChatHistory';
        this.maxHistoryPerTicker = 100; // Máximo 100 mensajes por ticker
        this.maxTickers = 20; // Máximo 20 tickers diferentes
        
        console.log('💾 Chat Storage Manager inicializado');
    }

    // 📖 OBTENER HISTORIAL DE CHAT
    getChatHistory(ticker) {
        try {
            const allHistory = this.getAllChatHistory();
            return allHistory[ticker] || [];
        } catch (error) {
            console.error('❌ Error obteniendo historial de chat:', error);
            return [];
        }
    }

    // 💾 GUARDAR HISTORIAL DE CHAT
    saveChatHistory(ticker, messages) {
        try {
            const allHistory = this.getAllChatHistory();
            
            // Limitar número de mensajes por ticker
            const limitedMessages = messages.slice(-this.maxHistoryPerTicker);
            
            // Guardar historial del ticker
            allHistory[ticker] = limitedMessages;
            
            // Limitar número de tickers almacenados
            this.limitStoredTickers(allHistory);
            
            // Guardar en localStorage
            localStorage.setItem(this.storageKey, JSON.stringify(allHistory));
            
            console.log(`💾 Historial guardado para ${ticker}: ${limitedMessages.length} mensajes`);
            
        } catch (error) {
            console.error('❌ Error guardando historial de chat:', error);
        }
    }

    // 📊 OBTENER TODO EL HISTORIAL
    getAllChatHistory() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('❌ Error obteniendo historial completo:', error);
            return {};
        }
    }

    // 🧹 LIMPIAR HISTORIAL DE UN TICKER
    clearChatHistory(ticker) {
        try {
            const allHistory = this.getAllChatHistory();
            delete allHistory[ticker];
            
            localStorage.setItem(this.storageKey, JSON.stringify(allHistory));
            console.log(`🧹 Historial limpiado para ${ticker}`);
            
        } catch (error) {
            console.error('❌ Error limpiando historial:', error);
        }
    }

    // 🗑️ LIMPIAR TODO EL HISTORIAL
    clearAllChatHistory() {
        try {
            localStorage.removeItem(this.storageKey);
            console.log('🗑️ Todo el historial de chat eliminado');
        } catch (error) {
            console.error('❌ Error limpiando todo el historial:', error);
        }
    }

    // 📋 OBTENER LISTA DE TICKERS CON HISTORIAL
    getTickersWithHistory() {
        try {
            const allHistory = this.getAllChatHistory();
            return Object.keys(allHistory).filter(ticker => 
                allHistory[ticker] && allHistory[ticker].length > 0
            );
        } catch (error) {
            console.error('❌ Error obteniendo lista de tickers:', error);
            return [];
        }
    }

    // 📊 OBTENER ESTADÍSTICAS DEL HISTORIAL
    getHistoryStats() {
        try {
            const allHistory = this.getAllChatHistory();
            const tickers = Object.keys(allHistory);
            
            let totalMessages = 0;
            const tickerStats = {};
            
            tickers.forEach(ticker => {
                const messages = allHistory[ticker] || [];
                const userMessages = messages.filter(m => m.role === 'user').length;
                const aiMessages = messages.filter(m => m.role === 'assistant').length;
                
                tickerStats[ticker] = {
                    total: messages.length,
                    user: userMessages,
                    ai: aiMessages,
                    lastActivity: messages.length > 0 ? 
                        new Date(messages[messages.length - 1].timestamp || 0) : null
                };
                
                totalMessages += messages.length;
            });
            
            return {
                totalTickers: tickers.length,
                totalMessages: totalMessages,
                tickerStats: tickerStats,
                storageSize: this.getStorageSize()
            };
            
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
            return {
                totalTickers: 0,
                totalMessages: 0,
                tickerStats: {},
                storageSize: 0
            };
        }
    }

    // 📏 OBTENER TAMAÑO DE ALMACENAMIENTO
    getStorageSize() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? new Blob([data]).size : 0;
        } catch (error) {
            return 0;
        }
    }

    // 🔄 LIMITAR TICKERS ALMACENADOS (FIFO)
    limitStoredTickers(allHistory) {
        const tickers = Object.keys(allHistory);
        
        if (tickers.length > this.maxTickers) {
            // Ordenar por última actividad (más antigua primero)
            const sortedTickers = tickers.sort((a, b) => {
                const aLastActivity = this.getLastActivityTime(allHistory[a]);
                const bLastActivity = this.getLastActivityTime(allHistory[b]);
                return aLastActivity - bLastActivity;
            });
            
            // Eliminar los tickers más antiguos
            const tickersToRemove = sortedTickers.slice(0, tickers.length - this.maxTickers);
            tickersToRemove.forEach(ticker => {
                console.log(`🗑️ Eliminando historial antiguo de ${ticker}`);
                delete allHistory[ticker];
            });
        }
    }

    // ⏰ OBTENER TIEMPO DE ÚLTIMA ACTIVIDAD
    getLastActivityTime(messages) {
        if (!messages || messages.length === 0) return 0;
        
        const lastMessage = messages[messages.length - 1];
        return new Date(lastMessage.timestamp || 0).getTime();
    }

    // 📤 EXPORTAR HISTORIAL COMPLETO
    exportAllHistory() {
        try {
            const allHistory = this.getAllChatHistory();
            const stats = this.getHistoryStats();
            
            const exportData = {
                exportDate: new Date().toISOString(),
                version: '1.0',
                stats: stats,
                chatHistory: allHistory
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `trading-chat-history-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            console.log('📤 Historial completo exportado');
            return true;
            
        } catch (error) {
            console.error('❌ Error exportando historial:', error);
            return false;
        }
    }

    // 📥 IMPORTAR HISTORIAL
    importHistory(jsonData) {
        try {
            const importData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            
            if (!importData.chatHistory) {
                throw new Error('Formato de archivo inválido');
            }
            
            // Verificar y fusionar con historial existente
            const currentHistory = this.getAllChatHistory();
            const importedHistory = importData.chatHistory;
            
            let mergedCount = 0;
            Object.keys(importedHistory).forEach(ticker => {
                if (importedHistory[ticker] && Array.isArray(importedHistory[ticker])) {
                    currentHistory[ticker] = importedHistory[ticker].slice(-this.maxHistoryPerTicker);
                    mergedCount++;
                }
            });
            
            // Limitar tickers totales
            this.limitStoredTickers(currentHistory);
            
            // Guardar historial fusionado
            localStorage.setItem(this.storageKey, JSON.stringify(currentHistory));
            
            console.log(`📥 Historial importado: ${mergedCount} tickers`);
            return { success: true, mergedTickers: mergedCount };
            
        } catch (error) {
            console.error('❌ Error importando historial:', error);
            return { success: false, error: error.message };
        }
    }

    // 🔍 BUSCAR EN HISTORIAL
    searchInHistory(query, ticker = null) {
        try {
            const allHistory = this.getAllChatHistory();
            const results = [];
            
            const tickersToSearch = ticker ? [ticker] : Object.keys(allHistory);
            
            tickersToSearch.forEach(tick => {
                const messages = allHistory[tick] || [];
                messages.forEach((message, index) => {
                    if (message.content && message.content.toLowerCase().includes(query.toLowerCase())) {
                        results.push({
                            ticker: tick,
                            messageIndex: index,
                            role: message.role,
                            content: message.content,
                            timestamp: message.timestamp,
                            context: this.getMessageContext(messages, index)
                        });
                    }
                });
            });
            
            // Ordenar por timestamp (más reciente primero)
            results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            return results;
            
        } catch (error) {
            console.error('❌ Error buscando en historial:', error);
            return [];
        }
    }

    // 📝 OBTENER CONTEXTO DE MENSAJE
    getMessageContext(messages, index, contextSize = 2) {
        const start = Math.max(0, index - contextSize);
        const end = Math.min(messages.length, index + contextSize + 1);
        
        return messages.slice(start, end).map((msg, i) => ({
            ...msg,
            isTarget: (start + i) === index
        }));
    }

    // 🧼 LIMPIAR HISTORIAL ANTIGUO
    cleanOldHistory(daysOld = 30) {
        try {
            const allHistory = this.getAllChatHistory();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            
            let cleanedTickers = 0;
            let cleanedMessages = 0;
            
            Object.keys(allHistory).forEach(ticker => {
                const messages = allHistory[ticker] || [];
                const filteredMessages = messages.filter(message => {
                    const messageDate = new Date(message.timestamp || 0);
                    return messageDate > cutoffDate;
                });
                
                if (filteredMessages.length === 0) {
                    // Eliminar ticker completamente si no tiene mensajes recientes
                    delete allHistory[ticker];
                    cleanedTickers++;
                } else if (filteredMessages.length !== messages.length) {
                    // Actualizar con mensajes filtrados
                    allHistory[ticker] = filteredMessages;
                    cleanedMessages += (messages.length - filteredMessages.length);
                }
            });
            
            // Guardar historial limpio
            localStorage.setItem(this.storageKey, JSON.stringify(allHistory));
            
            console.log(`🧼 Limpieza completada: ${cleanedTickers} tickers eliminados, ${cleanedMessages} mensajes antiguos removidos`);
            
            return {
                cleanedTickers,
                cleanedMessages,
                remainingTickers: Object.keys(allHistory).length
            };
            
        } catch (error) {
            console.error('❌ Error limpiando historial antiguo:', error);
            return { cleanedTickers: 0, cleanedMessages: 0, remainingTickers: 0 };
        }
    }

    // 🎛️ CONFIGURAR LÍMITES
    setLimits(maxHistoryPerTicker, maxTickers) {
        this.maxHistoryPerTicker = Math.max(10, Math.min(500, maxHistoryPerTicker || 100));
        this.maxTickers = Math.max(5, Math.min(50, maxTickers || 20));
        
        console.log(`🎛️ Límites actualizados: ${this.maxHistoryPerTicker} mensajes/ticker, ${this.maxTickers} tickers máx`);
    }
}

// 🌍 DISPONIBILIDAD GLOBAL
window.ChatStorageManager = ChatStorageManager;
console.log('✅ Chat Storage Manager cargado correctamente');
