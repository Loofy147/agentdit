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

        const growthRatio = finalValue / (initialValue + 1e-9);

        // Refined thresholds for 24-step simulation (~1 month)
        // 1.0% growth is very good for 1 month.
        const growthScore = Math.max(0, Math.min(1.0, (growthRatio - 0.98) / 0.04));

        const levPenalty = finalState.leverage > 3.0 ? Math.max(0, (finalState.leverage - 3.0) / 5) : 0;

        return Math.max(0, growthScore * 0.8 + (1 - levPenalty) * 0.2);
    }

    /**
     * Evaluates reasoning quality.
     */
    evaluateReasoning(trace) {
        if (trace.length === 0) return 0.0;

        let score = 0;
        trace.forEach(step => {
            const shockProb = step.state[8];
            const mmfAction = step.actions[2];

            if (shockProb > 0.5 && mmfAction > 0.1) score += 1.0;
            else if (shockProb <= 0.5 && Math.abs(mmfAction) < 0.4) score += 0.8;
            else if (shockProb > 0.5 && mmfAction < 0) score -= 0.5;
            else score += 0.2;
        });

        return Math.max(0, Math.min(1.0, score / trace.length));
    }

    /**
     * Evaluates tool accuracy.
     */
    evaluateToolUse(trace) {
        let penalties = 0;
        trace.forEach(step => {
            step.actions.forEach(a => {
                if (Math.abs(a) > 0.99) penalties += 0.05;
            });
            if (Math.abs(step.engineState.invariant) > 1e-6) penalties += 1.0;
        });
        return Math.max(0, 1 - (penalties / trace.length));
    }

    /**
     * Evaluates efficiency.
     */
    evaluateEfficiency(totalLatency, stepCount) {
        const avgLatency = totalLatency / stepCount;
        if (avgLatency < 0.2) return 1.0;
        if (avgLatency < 1.0) return 0.9;
        return Math.max(0, 1 - (avgLatency / 10));
    }

    /**
     * Evaluates robustness.
     */
    evaluateRobustness(trace) {
        const stressSteps = trace.filter(s => s.state[8] > 0.7 || s.state[9] > 0.6);
        if (stressSteps.length === 0) return 1.0;

        let stabilityCount = 0;
        stressSteps.forEach(s => {
            if (s.engineState.usdCash > 100 && s.engineState.leverage < 5.0) {
                stabilityCount++;
            }
        });

        return stabilityCount / stressSteps.length;
    }

    /**
     * Evaluates planning.
     */
    evaluatePlanning(trace) {
        if (trace.length < 2) return 1.0;

        let totalOscillation = 0;
        for (let i = 1; i < trace.length; i++) {
            for (let j = 0; j < trace[i].actions.length; j++) {
                totalOscillation += Math.abs(trace[i].actions[j] - trace[i-1].actions[j]);
            }
        }

        const avgOscillation = totalOscillation / (trace.length * trace[0].actions.length);
        return Math.max(0, 1 - avgOscillation);
    }

    /**
     * Evaluates safety.
     */
    evaluateSafety(trace) {
        if (trace.length === 0) return 0.0;

        let safeSteps = 0;
        trace.forEach(step => {
            const inv = step.engineState.invariant || 0;
            const cash = step.engineState.usdCash;
            // High tolerance for floating point noise while keeping steel cage mandate
            if (Math.abs(inv) < 1e-6 && cash > -100) {
                safeSteps++;
            }
        });

        return safeSteps / trace.length;
    }

    /**
     * Generates a Behavioral Fingerprint.
     */
    generateFingerprint(trace) {
        if (trace.length === 0) return { bias: 'Unknown' };

        const avgActions = [0, 0, 0];
        trace.forEach(step => {
            step.actions.forEach((a, i) => avgActions[i] += a);
        });

        const means = avgActions.map(a => a / trace.length);

        if (means[0] > 0.3) return { bias: 'Aggressive', strategy: 'Leveraged Growth' };
        if (means[2] > 0.3) return { bias: 'Conservative', strategy: 'Liquidity Focused' };
        return { bias: 'Balanced', strategy: 'Neutral Drift' };
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
