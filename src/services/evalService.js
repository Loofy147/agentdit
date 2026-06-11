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
        // Pre-allocate buffer for state vector [8 accounts + shockProb + vix_norm + rec_norm]
        const stateBuffer = new Float64Array(11);

        for (const task of tasks) {
            const engine = new PacioliEngine();
            const initialState = engine.getState();
            const trace = [];
            let totalLatency = 0;

            for (let t = 0; t < task.steps; t++) {
                const market = task.data[t % task.data.length];
                const t0 = performance.now();

                // Optimized state preparation: avoids spread operator and new allocations in hot loop
                const vix_norm = Math.min(1.0, (market.vix || 15) / 50);
                const rec_norm = Math.min(1.0, (market.recessionProb || 10) / 100);

                stateBuffer.set(engine.state);
                stateBuffer[8] = market.shockProb || 0;
                stateBuffer[9] = vix_norm;
                stateBuffer[10] = rec_norm;

                const { actions } = agent.sample(stateBuffer, true); // Use deterministic for eval

                // Execute actions
                engine.post(0, 4, actions[0] * 300); // Borrow
                engine.post(1, 0, actions[1] * 200); // Swap
                engine.post(2, 0, actions[2] * 500); // MMF Realloc

                // Reality update
                engine.fxRate = market.fxRate || engine.fxRate;
                engine.post(3, 5, market.sales || 250);
                engine.post(0, 3, engine.state[3] * 0.18);
                engine.post(5, 0, 180);

                const t1 = performance.now();
                totalLatency += (t1 - t0);

                trace.push({
                    step: t,
                    state: Array.from(stateBuffer),
                    actions: Array.from(actions),
                    engineState: engine.getState()
                });

                if (engine.state[0] < 0) break; // Failure: Liquidity Exhausted
            }

            const finalState = engine.getState();

            const metrics = {
                taskSuccess: this.evaluator.evaluateTaskSuccess(initialState, finalState),
                reasoning: this.evaluator.evaluateReasoning(trace),
                toolUse: this.evaluator.evaluateToolUse(trace),
                efficiency: this.evaluator.evaluateEfficiency(totalLatency, trace.length),
                robustness: this.evaluator.evaluateRobustness(trace),
                planning: this.evaluator.evaluateReasoning(trace), // Proxy for now
                safety: finalState.usdCash > 0 ? 1.0 : 0.0
            };

            const finalScore = this.aggregator.calculateFinalScore(metrics, task.difficulty);

            results.push({
                taskId: task.id,
                taskName: task.name,
                finalScore,
                breakdown: metrics
            });
        }

        return results;
    }
}
