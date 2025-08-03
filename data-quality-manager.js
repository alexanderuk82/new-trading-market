class DataQualityManager {
    constructor() {
        this.qualityThresholds = {
            EXCELLENT: 90,
            GOOD: 75,
            ACCEPTABLE: 60,
            POOR: 40
        };
    }

    calculateDataQualityScore(oandaData, investingData, orderFlowData) {
        let totalScore = 0;
        let maxScore = 0;

        // Scoring OANDA (35% peso)
        if (oandaData) {
            const oandaScore = this.scoreOandaData(oandaData);
            totalScore += oandaScore * 0.35;
            maxScore += 35;
        }

        // Scoring Investing (40% peso)
        if (investingData) {
            const investingScore = this.scoreInvestingData(investingData);
            totalScore += investingScore * 0.40;
            maxScore += 40;
        }

        // Scoring Order Flow (25% peso)
        if (orderFlowData) {
            const orderFlowScore = this.scoreOrderFlowData(orderFlowData);
            totalScore += orderFlowScore * 0.25;
            maxScore += 25;
        }

        const finalScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 50;

        return {
            overall: finalScore,
            level: this.getQualityLevel(finalScore),
            components: {
                oanda: oandaData ? this.scoreOandaData(oandaData) : 0,
                investing: investingData ? this.scoreInvestingData(investingData) : 0,
                orderFlow: orderFlowData ? this.scoreOrderFlowData(orderFlowData) : 0
            }
        };
    }

    scoreOandaData(data) {
        let score = 0;
        
        if (data.isReal) score += 40;
        else score += 20;
        
        if (data.validationStatus === 'CROSS_VALIDATED') score += 30;
        else if (data.validationStatus === 'SINGLE_SOURCE_OANDA') score += 20;
        
        if (data.spread < 1.0) score += 20;
        else if (data.spread < 2.0) score += 10;
        
        if (data.volume > 100000) score += 10;
        
        return Math.min(100, score);
    }

    scoreInvestingData(data) {
        let score = 0;
        
        if (data.isReal) score += 50;
        else score += 25;
        
        if (data.confidence > 70) score += 30;
        else if (data.confidence > 50) score += 20;
        else score += 10;
        
        if (data.timeframe === '15m') score += 20;
        else score += 10;
        
        return Math.min(100, score);
    }

    scoreOrderFlowData(data) {
        let score = 0;
        
        if (data.enhanced && data.enhanced.confidence) {
            score += data.enhanced.confidence.percentage;
        } else {
            score += 50;
        }
        
        return Math.min(100, score);
    }

    getQualityLevel(score) {
        if (score >= this.qualityThresholds.EXCELLENT) return 'EXCELLENT';
        if (score >= this.qualityThresholds.GOOD) return 'GOOD';
        if (score >= this.qualityThresholds.ACCEPTABLE) return 'ACCEPTABLE';
        return 'POOR';
    }
}

window.DataQualityManager = DataQualityManager;
console.log('✅ DataQualityManager cargado');