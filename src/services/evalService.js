import { PacioliEngine } from '../engine/pacioli.js';
import { MetricEvaluator, ScoringAggregator } from '../engine/evaluator.js';
import { HealthService } from './healthService.js';

export class EvaluationService {
    constructor() {
        this.evaluator = new MetricEvaluator();
        this.aggregator = new ScoringAggregator();
        this.health = new HealthService();
    }

    async evaluateAgent(agent, tasks) {
        const results = [];

        for (const task of tasks) {
            const engine = new PacioliEngine();
            const initialState = engine.getState();
            const trace = [];
            let totalLatency = 0;

            for (let t = 0; t < task.steps; t++) {
                const market = task.data[t % task.data.length];
                const t0 = performance.now();

                const vix_norm = Math.min(1.0, (market.vix || 15) / 50);
                const rec_norm = Math.min(1.0, (market.recessionProb || 10) / 100);
                const state = new Float64Array([...engine.state, market.shockProb || 0, vix_norm, rec_norm]);

                const { actions } = agent.sample(state, true);

                // Refined Action Mapping
                // Action 0: Borrow (>0) / Repay (<0)
                if (actions[0] > 0) engine.post(0, 4, actions[0] * 300);
                else if (actions[0] < 0) engine.post(4, 0, Math.abs(actions[0]) * 300);

                // Action 1: Swap USD->EUR (>0) / EUR->USD (<0)
                if (actions[1] > 0) engine.post(1, 0, actions[1] * 200);
                else if (actions[1] < 0) engine.post(0, 1, Math.abs(actions[1]) * 200);

                // Action 2: Cash->MMF (>0) / MMF->Cash (<0)
                if (actions[2] > 0) engine.post(2, 0, actions[2] * 500);
                else if (actions[2] < 0) engine.post(0, 2, Math.abs(actions[2]) * 500);

                if (market.fxRate) {
                    engine.revalueFX(market.fxRate);
                }
                engine.post(3, 5, market.sales || 250);
                engine.post(0, 3, engine.state[3] * 0.18);
                engine.post(5, 0, 180);

                const t1 = performance.now();
                totalLatency += (t1 - t0);

                const engineState = engine.getState();
                const inv = engine.getInvariant();

                trace.push({
                    step: t,
                    state: Array.from(state),
                    actions: Array.from(actions),
                    engineState: {
                        ...engineState,
                        invariant: inv
                    }
                });

                if (engine.state[0] < 0) break;
            }

            const finalState = engine.getState();

            const metrics = {
                taskSuccess: this.evaluator.evaluateTaskSuccess(initialState, finalState),
                reasoning: this.evaluator.evaluateReasoning(trace),
                toolUse: this.evaluator.evaluateToolUse(trace),
                efficiency: this.evaluator.evaluateEfficiency(totalLatency, trace.length),
                robustness: this.evaluator.evaluateRobustness(trace),
                planning: this.evaluator.evaluatePlanning(trace),
                safety: this.evaluator.evaluateSafety(trace)
            };

            const finalScore = this.aggregator.calculateFinalScore(metrics, task.difficulty);
            const fingerprint = this.evaluator.generateFingerprint(trace);

            results.push({
                taskId: task.id,
                taskName: task.name,
                finalScore,
                breakdown: metrics,
                fingerprint
            });
        }

        return results;
    }
}
