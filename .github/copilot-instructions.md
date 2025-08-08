# Copilot Instructions for new-strattegy

This project consists of:
- Frontend (browser) app orchestrated by script.js (class TradingStrategyApp)
- Local Node server (real-scraper-server.js) providing scraping-backed APIs for technicals and news

High-level flow
- User triggers analysis (button or Enter on ticker):
  - script.js.performAnalysis orchestrates:
    - Technical analysis via StrategyEngine.performCompleteAnalysis (not in repo, must be loaded globally)
    - Order Flow via OrderFlowAnalyzer using OandaAPI historical data
    - News via fetch GET http://localhost:3002/api/news/:ticker
  - Results are merged, UI updated via updateUI/updateOrderFlowUI/updateNewsUI/updateTradeRecommendationUI
  - Fallback data is used on any failure to keep the app responsive

Frontend contracts and conventions (script.js)
- Global dependencies required on window prior to init:
  - OandaAPI, InvestingScraper, OrderFlowAnalyzer, StrategyEngine, TradeRecommender
  - App delays init 1s and throws with a friendly page if missing
- Supported tickers for OANDA conversion: EURUSD, AUDUSD, XAUUSD, USDJPY, USDCHF, EURJPY, AUDJPY, GBPUSD, GBPCAD
  - Extend convertToOandaFormat and the server’s investingUrls together when adding new pairs
- UI update patterns:
  - Use safeUpdateElement(id, text, className?) for simple text/class updates
  - Complex UI has dedicated methods: updateFinalVerdict, updateOandaData, updateInvestingData, updateCombinedIndicators, updateStrategyConfirmation
  - Order Flow UI: updateLiquidityData/updateOrderFlowData/updateImbalanceData/updateVolumeProfileData/updatePredictionData
  - News UI: updateNewsUI expects newsData.recentNews items with { title, time, impact, url?, source? }
    - News items are rendered as clickable <a href="news.url" target="_blank" rel="noopener noreferrer">
    - Color helpers: getImpactBadgeColor and getImpactColor map impact levels (HIGH|MEDIUM|LOW) to colors
- Error handling:
  - Each analysis stage is individually try/catch wrapped with fallbacks
  - showNotification and showError provide user feedback
- Trade recommendation:
  - Uses TradeRecommender if available; otherwise getFallbackTradeRecommendation
  - currentPrice source precedence: OANDA mid -> Investing currentPrice -> fallback

Backend contracts and conventions (real-scraper-server.js)
- Start: node real-scraper-server.js (requires npm i express cors puppeteer cheerio)
  - Listens on port 3002 with CORS enabled
  - Puppeteer launch args include --no-sandbox for broader compatibility
- Endpoints:
  - GET /health -> { status, message, timestamp }
  - GET /api/technical/:ticker?timeframe=1H (default 1H)
    - Attempts Investing.com technical scraping using exact URLs per ticker
    - Response shape (success):
      {
        ticker, timeframe, timestamp, source: 'investing.com_real',
        currentPrice?, isReal: true,
        recommendation: 'STRONG_BUY'|'BUY'|'NEUTRAL'|'SELL'|'STRONG_SELL',
        confidence: number,
        movingAverages: { summary, MA5..MA200 },
        oscillators: { summary, RSI, STOCH, MACD, CCI, 'Williams %R', Momentum }
      }
    - On failure returns generateFallbackTechnicalData with isReal: false
  - GET /api/news/:ticker
    - Primary source: Yahoo Finance; falls back to curated real URLs if needed
    - Response shape:
      {
        ticker, timestamp, source,
        recentNews: [{ title, time, impact: 'HIGH'|'MEDIUM'|'LOW', url, source?, validated? }],
        marketImpact: { level: 'HIGH'|'MEDIUM'|'LOW', description },
        warnings: [], sentiment: 'NEUTRAL', isReal: boolean
      }
- Logging: server is verbose (emojis + structured logs) to ease debugging
- Extending tickers:
  - Update investingUrls in attemptRealScraping
  - Ensure frontend convertToOandaFormat supports new symbols consistently

Data dependencies and coupling
- script.js expects the server’s news items to include url for clickable links; ensure server always supplies url (fallbacks provide working URLs)
- script.js UI classes depend on exact DOM IDs (e.g., newsOverview, marketImpact, newsWarnings). When changing HTML, adjust IDs or update script selectors
- Risk and confidence styling use className thresholds (e.g., high-confidence >=70)

Developer workflows
- Run backend:
  - npm i
  - node real-scraper-server.js
  - Test: curl http://localhost:3002/health
- Run frontend:
  - Serve or open the HTML that loads script.js and all required global classes (window.*)
  - Use browser devtools console to observe progress logs and errors
- Common pitfalls:
  - Missing globals (OandaAPI, InvestingScraper, OrderFlowAnalyzer, StrategyEngine, TradeRecommender) → app shows “Error de Carga”
  - News UI requires getImpactColor and getImpactBadgeColor present
  - Add URL fields to recentNews to make links clickable

Examples
- Fetch news for EURJPY:
  fetch('http://localhost:3002/api/news/EURJPY').then(r => r.json());
- Adding a new pair (e.g., USDCAD):
  - Frontend: add 'USDCAD': 'USD_CAD' in convertToOandaFormat
  - Backend: add 'USDCAD': 'https://www.investing.com/currencies/usd-cad-technical' in investingUrls

Conventions
- Logging uses emojis and Spanish messages
- Fallbacks are explicit and marked isReal: false; real data set isReal: true
- Keep responses resilient: when scraping fails, always return a shaped fallback to avoid UI crashes
