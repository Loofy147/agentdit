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
        const stateBuffer = new Float64Array(17);

        for (const task of tasks) {
            const engine = new PacioliEngine();
            const initialState = engine.getState();
            const trace = [];
            const latencies = [];

            for (let t = 0; t < task.steps; t++) {
                const market = task.data[t % task.data.length];
                const t0 = performance.now();

                const vix_norm = Math.min(1.0, (market.vix || 15) / 50);
                const rec_norm = Math.min(1.0, (market.recessionProb || 10) / 100);
                const int_norm = Math.min(1.0, (market.interestRate || 5) / 10);

                stateBuffer.set(engine.state);
                stateBuffer[10] = market.shockProb || 0;
                stateBuffer[11] = vix_norm;
                stateBuffer[12] = rec_norm;
                stateBuffer[13] = int_norm;
                stateBuffer[14] = market.companyProbs?.techCorp || 0;
                stateBuffer[15] = market.companyProbs?.energyPlus || 0;
                stateBuffer[16] = market.companyProbs?.retailGlobal || 0;

                const { actions } = agent.sample(stateBuffer, true);

                const t1 = performance.now();
                latencies.push(t1 - t0);

                // Execute actions
                engine.post(0, 4, actions[0] * 300);
                engine.post(1, 0, actions[1] * 200);
                engine.post(2, 0, actions[2] * 500);

                engine.revalueFX(market.fx || engine.fxRates);
                engine.accrueInterest(market.interestRate || 5.0);
                engine.post(3, 5, market.sales || 250);
                engine.post(0, 3, engine.state[3] * 0.18);
                engine.post(5, 0, 180);

                trace.push({
                    step: t,
                    state: Array.from(stateBuffer),
                    actions: Array.from(actions),
                    engineState: engine.getState()
                });

                if (engine.state[0] < 0) break;
            }

            const finalState = engine.getState();

            const metrics = {
                taskSuccess: this.evaluator.evaluateTaskSuccess(initialState, finalState),
                reasoning: this.evaluator.evaluateReasoning(trace),
                toolUse: this.evaluator.evaluateToolUse(trace),
                efficiency: this.evaluator.evaluateEfficiency(latencies),
                robustness: this.evaluator.evaluateRobustness(trace),
                planning: this.evaluator.evaluateReasoning(trace),
                safety: finalState.usdCash > 0 ? 1.0 : 0.0
            };

            const finalScore = this.aggregator.calculateFinalScore(metrics, task.difficulty);

            results.push({
                taskId: task.id,
                taskName: task.name,
                finalScore,
                breakdown: metrics,
                latencyStats: {
                    avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
                    p99: [...latencies].sort((a,b) => a-b)[Math.floor(latencies.length * 0.99)]
                }
            });
        }

        return results;
    }
}
