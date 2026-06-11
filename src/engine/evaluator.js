/**
 * MetricEvaluator implements Layer 19: Performance Evaluation Logic.
 * It decomposes agent traces into quantitative performance scores.
 */
export class MetricEvaluator {
    constructor() {}

    evaluateTaskSuccess(initialState, finalState) {
        if (finalState.usdCash <= 0) return 0.0;
        const initialValue = initialState.equity + (initialState.fxRevalAdj || 0);
        const finalValue = finalState.equity + (finalState.fxRevalAdj || 0);
        const growth = finalValue / initialValue;
        const growthScore = Math.max(0, Math.min(1.0, (growth - 0.9) / 0.15));
        const levPenalty = finalState.leverage > 2.5 ? Math.max(0, (finalState.leverage - 2.5) / 5) : 0;
        return Math.max(0, growthScore * 0.8 + (1 - levPenalty) * 0.2);
    }

    evaluateReasoning(trace) {
        if (trace.length === 0) return 0.0;
        let score = 0;
        trace.forEach(step => {
            const shockProb = step.state[10];
            const mmfAction = step.actions[2];
            if (shockProb > 0.5 && mmfAction > 0.2) score += 1.0;
            else if (shockProb <= 0.5 && Math.abs(mmfAction) < 0.3) score += 0.8;
            else if (shockProb > 0.5 && mmfAction < 0) score -= 0.5;
            else score += 0.2;
        });
        return Math.max(0, Math.min(1.0, score / trace.length));
    }

    evaluateToolUse(trace) {
        let penalties = 0;
        trace.forEach(step => {
            step.actions.forEach(a => {
                if (Math.abs(a) > 0.99) penalties += 0.05;
            });
        });
        return Math.max(0, 1 - (penalties / trace.length));
    }

    evaluateEfficiency(latencies) {
        if (!latencies || latencies.length === 0) return 0;

        const sorted = [...latencies].sort((a, b) => a - b);
        const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        const p99 = sorted[Math.floor(sorted.length * 0.99)];

        // Jitter: Standard Deviation of latencies
        const variance = latencies.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / latencies.length;
        const jitter = Math.sqrt(variance);

        // Efficiency score weighted by p99 and jitter
        // Bolt Tempo mandate: p99 < 0.5ms is ideal
        let score = 1.0;
        if (p99 > 0.5) score -= 0.1;
        if (p99 > 1.0) score -= 0.4;
        if (jitter > 0.1) score -= 0.1; // Penalize high variance

        return Math.max(0, score);
    }

    evaluateRobustness(trace) {
        const stressSteps = trace.filter(s => s.state[10] > 0.7 || s.state[11] > 0.6);
        if (stressSteps.length === 0) return 1.0;
        let stabilityCount = 0;
        stressSteps.forEach(s => {
            if (s.engineState.usdCash > 300 && s.engineState.leverage < 3.0) {
                stabilityCount++;
            }
        });
        return stabilityCount / stressSteps.length;
    }
}

export class ScoringAggregator {
    constructor(weights = null) {
        this.weights = weights || {
            taskSuccess: 0.30,
            reasoning: 0.20,
            toolUse: 0.15,
            planning: 0.15,
            efficiency: 0.10,
            robustness: 0.05,
            safety: 0.05
        };
    }

    calculateFinalScore(metrics, difficultyFactor = 1.0) {
        let total = 0;
        for (const [key, weight] of Object.entries(this.weights)) {
            total += (metrics[key] || 0) * weight;
        }
        return total * difficultyFactor;
    }
}
