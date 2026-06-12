import { PacioliEngine } from '../engine/pacioli.js';
import { MetricEvaluator, ScoringAggregator } from '../engine/evaluator.js';
import { HealthService } from './healthService.js';
import { LatticeService } from './latticeService.js';

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

                stateBuffer.set(engine.state);
                stateBuffer[10] = market.shockProb || 0;
                stateBuffer[11] = Math.min(1.0, (market.vix || 15) / 50);
                stateBuffer[12] = Math.min(1.0, (market.recessionProb || 10) / 100);
                stateBuffer[13] = Math.min(1.0, (market.interestRate || 5) / 10);
                // Placeholder for other signals
                stateBuffer[14] = 0.5; stateBuffer[15] = 0.5; stateBuffer[16] = 0.5;

                const { actions } = agent.sample(stateBuffer, true);
                const t1 = performance.now();
                latencies.push(t1 - t0);

                engine.post(0, 4, actions[0] * 300);
                engine.post(1, 0, actions[1] * 200);
                engine.post(2, 0, actions[2] * 500);

                engine.revalueFX(market.fx || engine.fxRates);
                engine.accrueInterest(market.interestRate || 5.0);
                engine.post(3, 5, market.sales || 250);
                engine.post(0, 3, engine.state[3] * 0.18);
                engine.post(5, 0, 180);

                trace.push({ step: t, state: Array.from(stateBuffer), actions: Array.from(actions), engineState: engine.getState() });
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

            results.push({
                taskId: task.id,
                taskName: task.name,
                finalScore: this.aggregator.calculateFinalScore(metrics, task.difficulty),
                breakdown: metrics,
                latencyStats: { avg: latencies.reduce((a, b) => a + b, 0) / latencies.length, p99: [...latencies].sort((a,b)=>a-b)[Math.floor(latencies.length*0.99)] }
            });
        }
        return results;
    }

    /**
     * Recursive Audit: Stress test using Levy-stable tail shocks (Monte Carlo).
     */
    runRecursiveAudit(agent, iterations = 100) {
        console.log(`[EvaluationService] Running Recursive Audit (N=${iterations})...`);
        let failures = 0;
        const ls = new LatticeService();

        for (let i = 0; i < iterations; i++) {
            const engine = new PacioliEngine();
            const state = new Float64Array(17);

            for (let t = 0; t < 24; t++) {
                // High-sigma stochastic step for tail risk
                ls.step(1.0, 0.5, 0.2);
                const d = ls.getMarketDynamics();

                state.set(engine.state);
                state[10] = d.shockProb;
                state[11] = Math.min(1.0, d.vix / 50);
                state[12] = 0.5; state[13] = 0.5; state[14] = 0.5; state[15] = 0.5; state[16] = 0.5;

                const { actions } = agent.sample(state, false);

                // Execution
                engine.post(0, 4, actions[0] * 300);
                engine.post(3, 5, 250 * (1 - d.shockProb)); // Attack sales during shocks

                if (engine.state[0] < 0) {
                    failures++;
                    break;
                }
            }
        }
        return { failureRate: failures / iterations, iterations };
    }
}
