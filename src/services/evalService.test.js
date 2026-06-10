import { describe, it, expect } from 'vitest';
import { MetricEvaluator, ScoringAggregator } from '../engine/evaluator.js';

describe('MetricEvaluator', () => {
    const evaluator = new MetricEvaluator();

    it('should calculate task success based on growth', () => {
        const initial = { equity: 1000, fxRevalAdj: 0, leverage: 1.0 };
        const final = { usdCash: 500, equity: 1100, fxRevalAdj: 0, leverage: 1.0 };
        const score = evaluator.evaluateTaskSuccess(initial, final);
        expect(score).toBeGreaterThan(0.5);
    });

    it('should fail task success if cash is zero', () => {
        const initial = { equity: 1000, fxRevalAdj: 0, leverage: 1.0 };
        const final = { usdCash: 0, equity: 1100, fxRevalAdj: 0, leverage: 1.0 };
        const score = evaluator.evaluateTaskSuccess(initial, final);
        expect(score).toBe(0);
    });

    it('should score reasoning based on shock response', () => {
        const trace = [
            { state: [0,0,0,0,0,0,0,0, 0.8], actions: [0, 0, 0.5] }, // High shock, MMF Realloc
            { state: [0,0,0,0,0,0,0,0, 0.1], actions: [0, 0, 0.0] }  // Low shock, Neutral
        ];
        const score = evaluator.evaluateReasoning(trace);
        expect(score).toBeGreaterThan(0.7);
    });
});

describe('ScoringAggregator', () => {
    const aggregator = new ScoringAggregator();

    it('should aggregate metrics with weights', () => {
        const metrics = {
            taskSuccess: 1.0,
            reasoning: 1.0,
            toolUse: 1.0,
            planning: 1.0,
            efficiency: 1.0,
            robustness: 1.0,
            safety: 1.0
        };
        const score = aggregator.calculateFinalScore(metrics);
        expect(score).toBeCloseTo(1.0);
    });
});
