import { describe, it, expect } from 'vitest';
import { NeuralController } from './neuralController.js';

describe('NeuralController', () => {
    it('outputs steering actions in expected range [-1, 1]', () => {
        const controller = new NeuralController();
        const obs = new Float64Array([1.0, 0.5, 0.8, 1.2, 0.08, 0.4]);
        const action = controller.predict(obs);
        expect(action).toHaveLength(2);
        expect(action[0]).toBeGreaterThanOrEqual(-1);
        expect(action[0]).toBeLessThanOrEqual(1);
        expect(action[1]).toBeGreaterThanOrEqual(-1);
        expect(action[1]).toBeLessThanOrEqual(1);
    });

    it('uses provided weights correctly', () => {
        const weights = new Float64Array(64).fill(0.1);
        const controller = new NeuralController(weights);
        const obs = new Float64Array(6).fill(0.5);
        const action = controller.predict(obs);
        // With all positive weights and positive obs, output should be positive due to tanh
        expect(action[0]).toBeGreaterThan(0);
        expect(action[1]).toBeGreaterThan(0);
    });
});
