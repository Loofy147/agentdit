/**
 * MetricEvaluator implements Layer 19: Performance Evaluation Logic.
 * It decomposes agent traces into quantitative performance scores.
 */
export class MetricEvaluator {
    constructor() {}

    /**
     * Evaluates task success based on survival, equity growth, and leverage.
     */
    evaluateTaskSuccess(initialState, finalState) {
        if (finalState.usdCash <= 0) return 0.0;

        const initialValue = initialState.equity + initialState.fxRevalAdj;
        const finalValue = finalState.equity + finalState.fxRevalAdj;
        const growth = finalValue / initialValue;

        // Growth Score: 1.0 if growth > 5%, 0.0 if growth < -10%
        const growthScore = Math.max(0, Math.min(1.0, (growth - 0.9) / 0.15));

        // Leverage Penalty: Ideal leverage < 2.5x
        const levPenalty = finalState.leverage > 2.5 ? Math.max(0, (finalState.leverage - 2.5) / 5) : 0;

        return Math.max(0, growthScore * 0.8 + (1 - levPenalty) * 0.2);
    }

    /**
     * Evaluates reasoning quality by analyzing the correlation between risk signals and defensive actions.
     */
    evaluateReasoning(trace) {
        if (trace.length === 0) return 0.0;

        let score = 0;
        trace.forEach(step => {
            const shockProb = step.state[8]; // index 8 is shockProb
            const mmfAction = step.actions[2]; // index 2 is MMF realloc

            // Proactive defense: if shock is likely, move to MMF
            if (shockProb > 0.5 && mmfAction > 0.2) score += 1.0;
            else if (shockProb <= 0.5 && Math.abs(mmfAction) < 0.3) score += 0.8;
            else if (shockProb > 0.5 && mmfAction < 0) score -= 0.5; // Dangerous: moving out of MMF during risk
            else score += 0.2;
        });

        return Math.max(0, Math.min(1.0, score / trace.length));
    }

    /**
     * Evaluates tool accuracy: correctness of ledger posts and action optimality.
     */
    evaluateToolUse(trace) {
        // In this context, tool use is the selection of action vectors.
        // Penalty for extreme "saturated" actions without high entropy or high risk.
        let penalties = 0;
        trace.forEach(step => {
            step.actions.forEach(a => {
                if (Math.abs(a) > 0.99) penalties += 0.05;
            });
        });
        return Math.max(0, 1 - (penalties / trace.length));
    }

    /**
     * Evaluates efficiency: latency and resource utilization.
     */
    evaluateEfficiency(totalLatency, stepCount) {
        const avgLatency = totalLatency / stepCount;
        // Bolt Tempo mandate: < 1ms
        if (avgLatency < 0.2) return 1.0;
        if (avgLatency < 1.0) return 0.9;
        return Math.max(0, 1 - (avgLatency / 10));
    }

    /**
     * Evaluates robustness: survival and stability under high stress conditions.
     */
    evaluateRobustness(trace) {
        const stressSteps = trace.filter(s => s.state[8] > 0.7 || s.state[9] > 0.6); // shockProb or VIX
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
            planning: 0.15, // Currently proxied by reasoning/trace consistency
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

        // Difficulty Normalization
        return total * difficultyFactor;
    }
}
