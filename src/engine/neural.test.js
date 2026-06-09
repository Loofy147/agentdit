import { describe, it, expect } from 'vitest';
import { NeuralController } from './neuralController.js';

describe('NeuralController', () => {
    it('outputs steering actions in expected range [-1, 1]', () => {
        // v14 uses 7 inputs, 32 hidden, 2 outputs
        const controller = new NeuralController(7, 32, 2);
        const obs = new Float64Array([1500, 500, 1000, 700, 1500, 2200, 0]);
        const action = controller.predict(obs);
        expect(action).toHaveLength(2);
        expect(action[0]).toBeGreaterThanOrEqual(-1);
        expect(action[0]).toBeLessThanOrEqual(1);
    });

    it('uses provided weights correctly', () => {
        const inputDim = 7;
        const hiddenDim = 32;
        const outputDim = 2;
        const totalWeights = (inputDim * hiddenDim) + (hiddenDim * outputDim);
        const weights = new Float64Array(totalWeights).fill(0.1);
        const controller = new NeuralController(inputDim, hiddenDim, outputDim, weights);
        const obs = new Float64Array(inputDim).fill(0.5);
        const action = controller.predict(obs);
        expect(action[0]).toBeGreaterThan(0);
    });
});
