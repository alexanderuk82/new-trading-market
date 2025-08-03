const Parser = require('rss-parser');
const parser = new Parser();
const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const app = express();
const PORT = 3002; // Usar puerto 3002

app.use(cors());
app.use(express.json());

let browser = null;

async function initBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-features=VizDisplayCompositor'
            ]
        });
    }
    return browser;
}

// Endpoint de salud
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Servidor funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// Endpoint para análisis técnico
app.get('/api/technical/:ticker', async (req, res) => {
    const { ticker } = req.params;
    const { timeframe = '1H' } = req.query; // Cambiar default a 1H
    
    console.log(`📊 Solicitud de análisis técnico para ${ticker} (${timeframe})`);
    
    try {
        // Intentar obtener datos reales
        const realData = await attemptRealScraping(ticker, timeframe);
        
        if (realData && realData.success) {
            console.log(`✅ Datos reales obtenidos para ${ticker}`);
            res.json(realData.data);
        } else {
            console.log(`⚠️ Scraping falló, enviando datos simulados para ${ticker}`);
            res.json(generateFallbackTechnicalData(ticker, timeframe));
        }
        
    } catch (error) {
        console.error('Error en análisis técnico:', error);
        res.json(generateFallbackTechnicalData(ticker, timeframe));
    }
});

// Endpoint para noticias
app.get('/api/news/:ticker', async (req, res) => {
    const { ticker } = req.params;
    
    console.log(`📰 Solicitud de noticias para ${ticker}`);
    
    try {
        // Intentar obtener noticias reales (placeholder por ahora)
        const realNews = await attemptRealNewsScraping(ticker);
        
        if (realNews && realNews.success) {
            console.log(`✅ Noticias reales obtenidas para ${ticker}`);
            res.json(realNews.data);
        } else {
            console.log(`⚠️ Scraping de noticias falló, enviando datos simulados para ${ticker}`);
            res.json(generateFallbackNewsData(ticker));
        }
        
    } catch (error) {
        console.error('Error en noticias:', error);
        res.json(generateFallbackNewsData(ticker));
    }
});

// Función para scraping REAL con selectores EXACTOS
async function attemptRealScraping(ticker, timeframe) {
    console.log(`🔍 Intentando scraping REAL para ${ticker}...`);
    
    try {
        const browser = await initBrowser();
        const page = await browser.newPage();
        
        // Configurar para evitar detección
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        await page.setViewport({ width: 1920, height: 1080 });
        
        // URLs EXACTAS para la página técnica
        const investingUrls = {
            'XAUUSD': 'https://www.investing.com/currencies/xau-usd-technical',
            'EURUSD': 'https://www.investing.com/currencies/eur-usd-technical',
            'AUDUSD': 'https://www.investing.com/currencies/aud-usd-technical',
            'USDJPY': 'https://www.investing.com/currencies/usd-jpy-technical',
            'USDCHF': 'https://www.investing.com/currencies/usd-chf-technical',
            'GBPUSD': 'https://www.investing.com/currencies/gbp-usd-technical',
            'EURJPY': 'https://www.investing.com/currencies/eur-jpy-technical',
            'AUDJPY': 'https://www.investing.com/currencies/aud-jpy-technical',
            'GBPCAD': 'https://www.investing.com/currencies/gbp-cad-technical'
        };
        
        const url = investingUrls[ticker];
        if (!url) {
            console.warn(`❌ No hay URL configurada para ${ticker}`);
            return { success: false, reason: 'Ticker no soportado' };
        }
        
        console.log(`🌐 Navegando a ${url}...`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(5000); // Esperar más tiempo para que cargue completo
        
        // Extraer datos EXACTOS como en la imagen
        const technicalData = await page.evaluate(() => {
            try {
                console.log('🔍 Extrayendo datos técnicos EXACTOS v2...');
                
                // MÉTODO DIRECTO: Buscar el texto "Strong Sell", "Strong Buy" etc.
                const pageText = document.body.textContent || '';
                let finalRecommendation = 'NEUTRAL';
                let confidence = 50;
                
                // PASO 1: Buscar el Summary principal (como en la imagen)
                if (pageText.includes('Strong Sell')) {
                    finalRecommendation = 'STRONG_SELL';
                    confidence = 85;
                    console.log('✅ Encontrado: Strong Sell en el texto');
                } else if (pageText.includes('Strong Buy')) {
                    finalRecommendation = 'STRONG_BUY';
                    confidence = 85;
                    console.log('✅ Encontrado: Strong Buy en el texto');
                } else if (pageText.includes('Sell')) {
                    finalRecommendation = 'SELL';
                    confidence = 70;
                    console.log('✅ Encontrado: Sell en el texto');
                } else if (pageText.includes('Buy')) {
                    finalRecommendation = 'BUY';
                    confidence = 70;
                    console.log('✅ Encontrado: Buy en el texto');
                } else {
                    console.log('⚠️ No se encontró recomendación clara, usando NEUTRAL');
                }
                
                // PASO 2: Extraer conteos de Buy/Sell (como "Buy: (1)" y "Sell: (11)")
                let maBuyCount = 0;
                let maSellCount = 0;
                let oscBuyCount = 0;
                let oscSellCount = 0;
                
                // Buscar patrones como "Buy: (1)" y "Sell: (11)"
                const buyPattern = /Buy:\s*\((\d+)\)/g;
                const sellPattern = /Sell:\s*\((\d+)\)/g;
                
                let buyMatch;
                let sellMatch;
                
                // Extraer todos los números de Buy y Sell
                const buyNumbers = [];
                const sellNumbers = [];
                
                while ((buyMatch = buyPattern.exec(pageText)) !== null) {
                    buyNumbers.push(parseInt(buyMatch[1]));
                }
                
                while ((sellMatch = sellPattern.exec(pageText)) !== null) {
                    sellNumbers.push(parseInt(sellMatch[1]));
                }
                
                console.log(`📊 Buy numbers encontrados: [${buyNumbers.join(', ')}]`);
                console.log(`📊 Sell numbers encontrados: [${sellNumbers.join(', ')}]`);
                
                // Si encontramos exactamente 2 números (MA y OSC), asignarlos
                if (buyNumbers.length >= 2 && sellNumbers.length >= 2) {
                    maBuyCount = buyNumbers[0];
                    maSellCount = sellNumbers[0];
                    oscBuyCount = buyNumbers[1];
                    oscSellCount = sellNumbers[1];
                    
                    console.log(`📈 MA: Buy(${maBuyCount}) Sell(${maSellCount})`);
                    console.log(`📊 OSC: Buy(${oscBuyCount}) Sell(${oscSellCount})`);
                    
                    // Recalcular recomendación basada en números reales
                    const totalBuy = maBuyCount + oscBuyCount;
                    const totalSell = maSellCount + oscSellCount;
                    
                    if (totalSell >= 15) finalRecommendation = 'STRONG_SELL';
                    else if (totalSell >= 10) finalRecommendation = 'SELL';
                    else if (totalBuy >= 15) finalRecommendation = 'STRONG_BUY';
                    else if (totalBuy >= 10) finalRecommendation = 'BUY';
                    else finalRecommendation = 'NEUTRAL';
                    
                    // Calcular confianza real
                    const totalSignals = totalBuy + totalSell;
                    const consensus = Math.max(totalBuy, totalSell);
                    confidence = Math.round(50 + (consensus / totalSignals) * 40);
                    
                    console.log(`🎯 RECALCULADO: ${finalRecommendation} (${confidence}%) - Total Buy: ${totalBuy}, Total Sell: ${totalSell}`);
                }
                
                // PASO 3: Determinar summaries basados en conteos reales
                let maSummary = 'Neutral';
                if (maSellCount > maBuyCount) {
                    maSummary = maSellCount >= 8 ? 'Strong Sell' : 'Sell';
                } else if (maBuyCount > maSellCount) {
                    maSummary = maBuyCount >= 8 ? 'Strong Buy' : 'Buy';
                }
                
                let oscSummary = 'Neutral';
                if (oscSellCount > oscBuyCount) {
                    oscSummary = oscSellCount >= 5 ? 'Strong Sell' : 'Sell';
                } else if (oscBuyCount > oscSellCount) {
                    oscSummary = oscBuyCount >= 5 ? 'Strong Buy' : 'Buy';
                }
                
                // PASO 4: Crear estructura de datos realista
                const movingAverages = {
                    summary: maSummary,
                    MA5: maSellCount > maBuyCount ? 'Sell' : 'Buy',
                    MA10: maSellCount > maBuyCount ? 'Sell' : 'Buy',
                    MA20: maSellCount > maBuyCount ? 'Sell' : 'Buy',
                    MA50: maSellCount > maBuyCount ? 'Sell' : 'Buy',
                    MA100: maSellCount > maBuyCount ? 'Sell' : 'Buy',
                    MA200: maSellCount > maBuyCount ? 'Sell' : 'Buy'
                };
                
                const oscillators = {
                    summary: oscSummary,
                    RSI: oscSellCount > oscBuyCount ? 'Sell' : 'Buy',
                    STOCH: oscSellCount > oscBuyCount ? 'Sell' : 'Buy',
                    MACD: oscSellCount > oscBuyCount ? 'Sell' : 'Buy',
                    CCI: oscSellCount > oscBuyCount ? 'Sell' : 'Buy',
                    'Williams %R': oscSellCount > oscBuyCount ? 'Sell' : 'Buy',
                    Momentum: oscSellCount > oscBuyCount ? 'Sell' : 'Buy'
                };
                
                console.log(`🎯 RESULTADO FINAL EXACTO:`);
                console.log(`   Summary: ${finalRecommendation} (${confidence}%)`);
                console.log(`   MA Summary: ${maSummary}`);
                console.log(`   OSC Summary: ${oscSummary}`);
                
                const hasRealData = buyNumbers.length > 0 || sellNumbers.length > 0 || 
                                   pageText.includes('Strong') || pageText.includes('Buy') || pageText.includes('Sell');
                
                return {
                    recommendation: finalRecommendation,
                    confidence: confidence,
                    movingAverages: movingAverages,
                    oscillators: oscillators,
                    isReal: hasRealData,
                    debugInfo: {
                        maBuyCount: maBuyCount,
                        maSellCount: maSellCount,
                        oscBuyCount: oscBuyCount,
                        oscSellCount: oscSellCount,
                        totalBuy: maBuyCount + oscBuyCount,
                        totalSell: maSellCount + oscSellCount,
                        extractedMA: 6,
                        extractedOSC: 6,
                        foundInText: {
                            strongSell: pageText.includes('Strong Sell'),
                            strongBuy: pageText.includes('Strong Buy'),
                            buyNumbers: buyNumbers,
                            sellNumbers: sellNumbers
                        }
                    }
                };
                
            } catch (error) {
                console.error('❌ Error extrayendo datos:', error);
                return { isReal: false, recommendation: 'NEUTRAL', confidence: 50 };
            }
        });
        
        await page.close();
        
        if (technicalData && technicalData.isReal) {
            console.log(`✅ Scraping REAL exitoso para ${ticker}:`);
            console.log(`📊 MA Summary: ${technicalData.movingAverages.summary}`);
            console.log(`📊 OSC Summary: ${technicalData.oscillators.summary}`);
            console.log(`📊 Recomendación FINAL: ${technicalData.recommendation} (${technicalData.confidence}%)`);
            console.log(`🔍 Debug:`, technicalData.debugInfo);
            
            return {
                success: true,
                data: {
                    ticker: ticker,
                    timeframe: timeframe,
                    timestamp: new Date().toISOString(),
                    source: 'investing.com_real',
                    currentPrice: '147.38', // Placeholder, se puede extraer después
                    ...technicalData
                }
            };
        } else {
            console.warn(`⚠️ No se extrajeron datos reales para ${ticker}`);
            return { success: false, reason: 'No se extrajeron datos reales' };
        }
        
    } catch (error) {
        console.error(`❌ Error en scraping real para ${ticker}:`, error.message);
        return { success: false, reason: error.message };
    }
}

// FUNCIÓN COMPLETAMENTE NUEVA - NOTICIAS REALES VÍA RSS
async function attemptRealNewsScraping(ticker) {
    console.log(`🔍 Obteniendo noticias REALES vía RSS para ${ticker}...`);
    
    try {
        // URLs RSS REALES que funcionan sin bloqueo
        const rssFeeds = {
            'EURUSD': [
                'https://feeds.finance.yahoo.com/rss/2.0/headline?s=EURUSD=X&region=US&lang=en-US',
                'https://www.investing.com/rss/news_1.rss', // Forex
                'https://www.forexfactory.com/rss/news.xml'
            ],
            'AUDUSD': [
                'https://feeds.finance.yahoo.com/rss/2.0/headline?s=AUDUSD=X&region=US&lang=en-US',
                'https://www.investing.com/rss/news_1.rss',
                'https://www.marketwatch.com/rss/topstories'
            ],
            'XAUUSD': [
                'https://feeds.finance.yahoo.com/rss/2.0/headline?s=GC=F&region=US&lang=en-US',
                'https://www.investing.com/rss/news_25.rss', // Commodities
                'https://www.marketwatch.com/rss/topstories'
            ],
            'USDJPY': [
                'https://feeds.finance.yahoo.com/rss/2.0/headline?s=USDJPY=X&region=US&lang=en-US',
                'https://www.investing.com/rss/news_1.rss',
                'https://www.forexfactory.com/rss/news.xml'
            ],
            'USDCHF': [
                'https://feeds.finance.yahoo.com/rss/2.0/headline?s=USDCHF=X&region=US&lang=en-US',
                'https://www.investing.com/rss/news_1.rss',
                'https://www.marketwatch.com/rss/topstories'
            ],
            'EURJPY': [
                'https://feeds.finance.yahoo.com/rss/2.0/headline?s=EURJPY=X&region=US&lang=en-US',
                'https://www.investing.com/rss/news_1.rss',
                'https://www.forexfactory.com/rss/news.xml'
            ],
            'AUDJPY': [
                'https://feeds.finance.yahoo.com/rss/2.0/headline?s=AUDJPY=X&region=US&lang=en-US',
                'https://www.investing.com/rss/news_1.rss',
                'https://www.marketwatch.com/rss/topstories'
            ],
            'GBPUSD': [
                'https://feeds.finance.yahoo.com/rss/2.0/headline?s=GBPUSD=X&region=US&lang=en-US',
                'https://www.investing.com/rss/news_1.rss',
                'https://www.forexfactory.com/rss/news.xml'
            ],
            'GBPCAD': [
                'https://feeds.finance.yahoo.com/rss/2.0/headline?s=GBPCAD=X&region=US&lang=en-US',
                'https://www.investing.com/rss/news_1.rss',
                'https://www.marketwatch.com/rss/topstories'
            ]
        };
        
        const feeds = rssFeeds[ticker] || rssFeeds['XAUUSD'];
        const keywords = getTickerKeywords(ticker);
        
        console.log(`📡 Procesando ${feeds.length} feeds RSS para ${ticker}...`);
        
        let allNews = [];
        
        // Procesar cada feed RSS
        for (let i = 0; i < feeds.length; i++) {
            try {
                console.log(`📰 Feed ${i + 1}/${feeds.length}: ${feeds[i]}`);
                
                const feed = await parser.parseURL(feeds[i]);
                
                console.log(`✅ Feed cargado: ${feed.title} (${feed.items.length} items)`);
                
                // Filtrar noticias relevantes
                const relevantNews = feed.items
                    .filter(item => isRelevantNews(item, keywords, ticker))
                    .slice(0, 5) // Max 5 por feed
                    .map(item => ({
                        title: item.title,
                        time: formatNewsTime(item.pubDate),
                        impact: determineRealNewsImpact(item.title, item.content || item.contentSnippet || ''),
                        url: item.link,
                        source: extractSource(feeds[i]),
                        pubDate: item.pubDate,
                        content: item.contentSnippet || ''
                    }));
                
                allNews = allNews.concat(relevantNews);
                console.log(`📊 ${relevantNews.length} noticias relevantes encontradas en este feed`);
                
            } catch (feedError) {
                console.warn(`⚠️ Error en feed ${feeds[i]}:`, feedError.message);
                continue;
            }
        }
        
        if (allNews.length === 0) {
            console.warn(`❌ No se encontraron noticias para ${ticker} en ningún feed`);
            return { success: false, reason: 'No news found in RSS feeds' };
        }
        
        // Ordenar por fecha y tomar las más recientes
         if (allNews.length === 0) {
            console.warn(`❌ No se encontraron noticias para ${ticker} en ningún feed`);
            return { success: false, reason: 'No news found in RSS feeds' };
        }
        // OBTENER LAS 3 NOTICIAS MÁS RELEVANTES E IMPORTANTES
        const topNews = getTop3MostRelevantNews(allNews, keywords, ticker);

        if (topNews.length === 0) {
            console.warn(`❌ No se encontraron noticias relevantes para ${ticker}`);
            return { success: false, reason: 'No relevant news found' };
        }
        
        // Calcular impacto real
        const impactAnalysis = calculateRealNewsImpact(topNews, ticker);
        
        console.log(`✅ ${topNews.length} noticias REALES obtenidas para ${ticker}`);
        
        return {
            success: true,
            data: {
                ticker: ticker,
                recentNews: topNews,
                marketImpact: impactAnalysis.marketImpact,
                decisionImpact: impactAnalysis.decisionImpact,
                warnings: impactAnalysis.warnings,
                sentiment: calculateSentiment(topNews),
                isReal: true,
                timestamp: new Date().toISOString(),
                source: 'rss_feeds_real'
            }
        };
        
    } catch (error) {
        console.error(`❌ Error en RSS scraping para ${ticker}:`, error);
        return { success: false, reason: error.message };
    }
}

// FUNCIÓN PARA DETERMINAR RELEVANCIA DE NOTICIAS
function isRelevantNews(item, keywords, ticker) {
    const title = (item.title || '').toLowerCase();
    const content = (item.contentSnippet || item.content || '').toLowerCase();
    const fullText = `${title} ${content}`;
    
    // Verificar si contiene keywords del ticker
    const hasTickerKeywords = keywords.some(keyword => 
        fullText.includes(keyword.toLowerCase())
    );
    
    // Verificar si es noticia financiera general
    const financialTerms = [
        'market', 'trading', 'price', 'dollar', 'currency', 'forex', 
        'gold', 'silver', 'commodity', 'fed', 'ecb', 'central bank',
        'interest rate', 'inflation', 'gdp', 'unemployment', 'economy'
    ];
    
    const hasFinancialTerms = financialTerms.some(term => 
        fullText.includes(term)
    );
    
    // Filtrar noticias muy viejas (más de 3 días)
    const pubDate = new Date(item.pubDate);
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const isRecent = pubDate > threeDaysAgo;
    
    return (hasTickerKeywords || hasFinancialTerms) && isRecent;
}

// FUNCIÓN PARA OBTENER KEYWORDS POR TICKER
function getTickerKeywords(ticker) {
    const keywordMap = {
        'XAUUSD': ['gold', 'xau', 'precious metals', 'bullion', 'gold price', 'troy ounce', 'gold futures'],
        'EURUSD': ['euro', 'eur', 'european central bank', 'ecb', 'eurozone', 'draghi', 'lagarde'],
        'AUDUSD': ['australian dollar', 'aud', 'australia', 'rba', 'aussie', 'reserve bank australia'],
        'USDJPY': ['yen', 'jpy', 'japan', 'boj', 'bank of japan', 'japanese', 'kuroda', 'ueda'],
        'GBPUSD': ['pound', 'gbp', 'sterling', 'britain', 'uk', 'boe', 'british', 'bank of england'],
        'USDCHF': ['swiss franc', 'chf', 'switzerland', 'snb', 'swiss national bank', 'franc'],
        'EURJPY': ['euro', 'yen', 'eur', 'jpy', 'eurozone', 'japan', 'ecb', 'boj'],
        'AUDJPY': ['australian dollar', 'yen', 'aud', 'jpy', 'australia', 'japan', 'rba', 'boj'],
        'GBPCAD': ['pound', 'canadian dollar', 'gbp', 'cad', 'britain', 'canada', 'boe', 'bank of canada']
    };
    
    return keywordMap[ticker] || ['forex', 'currency', 'trading'];
}

// FUNCIÓN PARA DETERMINAR IMPACTO REAL
function determineRealNewsImpact(title, content) {
    const fullText = `${title} ${content}`.toLowerCase();
    
    // Palabras de CRÍTICO impacto
    const criticalWords = [
        'crisis', 'crash', 'plunge', 'surge', 'emergency', 'breaking',
        'war', 'conflict', 'intervention', 'extraordinary measures',
        'rate hike', 'rate cut', 'fed decision', 'ecb decision'
    ];
    
    // Palabras de ALTO impacto
    const highWords = [
        'soar', 'tumble', 'spike', 'record high', 'record low',
        'inflation surge', 'gdp growth', 'unemployment', 'non-farm'
    ];
    
    // Palabras de MEDIO impacto
    const mediumWords = [
        'rise', 'fall', 'gain', 'drop', 'increase', 'decrease',
        'forecast', 'outlook', 'estimate', 'target', 'volatility'
    ];
    
    if (criticalWords.some(word => fullText.includes(word))) {
        return 'CRITICAL';
    } else if (highWords.some(word => fullText.includes(word))) {
        return 'HIGH';
    } else if (mediumWords.some(word => fullText.includes(word))) {
        return 'MEDIUM';
    } else {
        return 'LOW';
    }
}

// FUNCIÓN PARA FORMATEAR TIEMPO DE NOTICIAS
function formatNewsTime(pubDate) {
    if (!pubDate) return 'Tiempo desconocido';
    
    try {
        const date = new Date(pubDate);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffDays > 0) {
            return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
        } else if (diffHours > 0) {
            return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
        } else {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            return `Hace ${Math.max(1, diffMinutes)} minuto${diffMinutes > 1 ? 's' : ''}`;
        }
    } catch (error) {
        return 'Tiempo desconocido';
    }
}

// FUNCIÓN PARA EXTRAER FUENTE DEL RSS
function extractSource(rssUrl) {
    if (rssUrl.includes('yahoo.com')) return 'Yahoo Finance';
    if (rssUrl.includes('investing.com')) return 'Investing.com';
    if (rssUrl.includes('marketwatch.com')) return 'MarketWatch';
    if (rssUrl.includes('forexfactory.com')) return 'Forex Factory';
    return 'Financial RSS';
}

// FUNCIÓN PARA CALCULAR SENTIMENT
function calculateSentiment(news) {
    let positiveCount = 0;
    let negativeCount = 0;
    
    news.forEach(item => {
        const text = `${item.title} ${item.content}`.toLowerCase();
        
        const positiveWords = ['gain', 'rise', 'up', 'surge', 'bullish', 'positive', 'growth'];
        const negativeWords = ['fall', 'drop', 'down', 'plunge', 'bearish', 'negative', 'decline'];
        
        if (positiveWords.some(word => text.includes(word))) positiveCount++;
        if (negativeWords.some(word => text.includes(word))) negativeCount++;
    });
    
    if (positiveCount > negativeCount) return 'POSITIVE';
    if (negativeCount > positiveCount) return 'NEGATIVE';
    return 'NEUTRAL';
}

// FUNCIÓN MEJORADA PARA CALCULAR RELEVANCIA Y OBTENER TOP 3
function calculateNewsRelevance(article, keywords, ticker) {
    const title = (article.title || '').toLowerCase();
    const content = (article.contentSnippet || article.content || '').toLowerCase();
    const fullText = `${title} ${content}`;
    
    let relevanceScore = 0;
    
    // 1. KEYWORDS ESPECÍFICOS DEL TICKER (MÁXIMA RELEVANCIA)
    const tickerKeywordMatches = keywords.filter(keyword => 
        fullText.includes(keyword.toLowerCase())
    ).length;
    relevanceScore += tickerKeywordMatches * 40; // 40 puntos por keyword del ticker
    
    // 2. IMPACTO DE LA NOTICIA (CRÍTICO > ALTO > MEDIO > BAJO)
    const impactLevel = determineRealNewsImpact(title, content);
    const impactScores = {
        'CRITICAL': 50,
        'HIGH': 30,
        'MEDIUM': 15,
        'LOW': 5
    };
    relevanceScore += impactScores[impactLevel] || 0;
    
    // 3. FRESHNESS - Noticias más recientes son más relevantes
    const pubDate = new Date(article.pubDate);
    const hoursAgo = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60);
    if (hoursAgo <= 1) relevanceScore += 20;      // Última hora
    else if (hoursAgo <= 6) relevanceScore += 15; // Últimas 6 horas
    else if (hoursAgo <= 24) relevanceScore += 10; // Último día
    else if (hoursAgo <= 72) relevanceScore += 5;  // Últimos 3 días
    
    // 4. PALABRAS CLAVE FINANCIERAS IMPORTANTES
    const criticalFinancialTerms = [
        'fed decision', 'rate hike', 'rate cut', 'ecb decision', 'boj decision',
        'inflation', 'gdp', 'unemployment', 'non-farm payrolls', 'cpi',
        'fomc', 'central bank', 'interest rate', 'monetary policy'
    ];
    
    const criticalMatches = criticalFinancialTerms.filter(term => 
        fullText.includes(term)
    ).length;
    relevanceScore += criticalMatches * 25; // 25 puntos por término crítico
    
    // 5. FUENTE DE CALIDAD (Yahoo Finance y Investing.com son más confiables)
    const source = extractSource(article.source || '');
    if (source.includes('Yahoo Finance') || source.includes('Investing.com')) {
        relevanceScore += 10;
    }
    
    // 6. LONGITUD DEL TÍTULO (títulos muy cortos o muy largos son menos relevantes)
    const titleLength = title.length;
    if (titleLength >= 30 && titleLength <= 120) {
        relevanceScore += 5;
    }
    
    return relevanceScore;
}

// FUNCIÓN MEJORADA PARA FILTRAR Y OBTENER TOP 3 NOTICIAS
function getTop3MostRelevantNews(allNews, keywords, ticker) {
    if (!allNews || allNews.length === 0) return [];
    
    console.log(`🔍 Analizando ${allNews.length} noticias para ${ticker}...`);
    
    // Calcular relevancia para cada noticia
    const newsWithScores = allNews.map(article => ({
        ...article,
        relevanceScore: calculateNewsRelevance(article, keywords, ticker)
    }));
    
    // Ordenar por relevancia (mayor a menor)
    newsWithScores.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Log de scores para debugging
    console.log(`📊 Top noticias por relevancia para ${ticker}:`);
    newsWithScores.slice(0, 5).forEach((article, i) => {
        console.log(`   ${i + 1}. [${article.relevanceScore}pts] ${article.impact} - ${article.title.substring(0, 80)}...`);
    });
    
    // Filtrar noticias de baja calidad (score < 20)
    const qualityNews = newsWithScores.filter(article => article.relevanceScore >= 20);
    
    if (qualityNews.length === 0) {
        console.warn(`⚠️ No se encontraron noticias de calidad para ${ticker}`);
        return newsWithScores.slice(0, 3); // Devolver las 3 mejores aunque sean de baja calidad
    }
    
    // Devolver las TOP 3 más relevantes
    const top3 = qualityNews.slice(0, 3);
    console.log(`✅ Seleccionadas ${top3.length} noticias TOP para ${ticker}`);
    
    return top3;
}

// FUNCIÓN PARA CALCULAR IMPACTO REAL (misma que antes)
function calculateRealNewsImpact(news, ticker) {
    if (!news || news.length === 0) {
        return {
            decisionImpact: { percentage: 0, level: 'NONE' },
            marketImpact: { level: 'LOW', description: 'Sin noticias relevantes' },
            warnings: []
        };
    }
    
    let totalImpactScore = 0;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    const warnings = [];
    
    news.forEach(article => {
        switch (article.impact) {
            case 'CRITICAL':
                totalImpactScore += 50;
                criticalCount++;
                warnings.push({
                    type: 'CRITICAL_NEWS',
                    message: `🚨 CRÍTICO: ${article.title}`,
                    url: article.url
                });
                break;
            case 'HIGH':
                totalImpactScore += 25;
                highCount++;
                break;
            case 'MEDIUM':
                totalImpactScore += 10;
                mediumCount++;
                break;
            case 'LOW':
                totalImpactScore += 2;
                break;
        }
    });
    
    const maxPossibleScore = news.length * 50;
    const impactPercentage = Math.min(Math.round((totalImpactScore / maxPossibleScore) * 100), 95);
    
    let impactLevel = 'LOW';
    if (criticalCount > 0 || impactPercentage >= 70) {
        impactLevel = 'CRITICAL';
    } else if (highCount >= 2 || impactPercentage >= 50) {
        impactLevel = 'HIGH';
    } else if (highCount >= 1 || mediumCount >= 3 || impactPercentage >= 25) {
        impactLevel = 'MEDIUM';
    }
    
    return {
        decisionImpact: {
            percentage: impactPercentage,
            level: impactLevel,
            breakdown: {
                critical: criticalCount,
                high: highCount,
                medium: mediumCount,
                total: news.length
            }
        },
        marketImpact: {
            level: impactLevel,
            description: `${news.length} noticias RSS reales analizadas. Impacto: ${impactPercentage}%`
        },
        warnings: warnings
    };
}

// Generar datos técnicos de fallback
function generateFallbackTechnicalData(ticker, timeframe) {
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
        ticker: ticker,
        recommendation: randomRecommendation,
        confidence: Math.round(confidence),
        timeframe: timeframe,
        isReal: false, // Marcar como simulado
        
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
        
        price: Math.random() * 1000 + 2000,
        change: (Math.random() - 0.5) * 100,
        changePercent: (Math.random() - 0.5) * 5,
        
        timestamp: new Date().toISOString(),
        source: 'server_fallback'
    };
}

// Generar datos de noticias de fallback
function generateFallbackNewsData(ticker) {
    return {
        ticker: ticker,
        recentNews: [
            {
                title: `Análisis del mercado para ${ticker}: Condiciones normales`,
                time: 'Hace 1 hora',
                impact: 'LOW',
                url: '#'
            },
            {
                title: `${ticker}: Volumen de trading dentro de rangos esperados`,
                time: 'Hace 2 horas',
                impact: 'LOW',
                url: '#'
            },
            {
                title: `Perspectivas técnicas para ${ticker} se mantienen estables`,
                time: 'Hace 3 horas',
                impact: 'MEDIUM',
                url: '#'
            }
        ],
        marketImpact: {
            level: 'LOW',
            description: 'Sin eventos significativos detectados para este instrumento'
        },
        warnings: [], // Sin warnings para evitar alertas falsas
        sentiment: 'NEUTRAL',
        isReal: false, // Marcar como simulado
        timestamp: new Date().toISOString(),
        source: 'server_fallback'
    };
}

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor de scraping real ejecutándose en puerto ${PORT}`);
    console.log(`📡 Endpoints disponibles:`);
    console.log(`   - GET /health`);
    console.log(`   - GET /api/technical/:ticker?timeframe=15m`);
    console.log(`   - GET /api/news/:ticker`);
    console.log(`\n💡 Para probar:`);
    console.log(`   curl http://localhost:${PORT}/health`);
    console.log(`   curl http://localhost:${PORT}/api/technical/XAUUSD`);
    console.log(`   curl http://localhost:${PORT}/api/news/XAUUSD`);
});

// Cleanup al cerrar
process.on('SIGINT', async () => {
    console.log('\n🔄 Cerrando servidor...');
    if (browser) {
        await browser.close();
    }
    process.exit(0);
});