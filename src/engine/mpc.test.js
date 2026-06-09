import { describe, it, expect } from 'vitest';
import { MPCController } from './mpc.js';

describe('CreditAwareMPC', () => {
    it('calculates dynamic interest rate', () => {
        const mpc = new MPCController();
        const rate = mpc.getDynamicRate(1500, 2200);
        expect(rate).toBeGreaterThan(0);
    });

    it('solves for control actions', () => {
        const mpc = new MPCController();
        const state = new Float64Array([1500, 500, 1000, 700, 1500, 2200, 0, 0]);
        const forecastSales = new Array(10).fill(250);
        const forecastFX = new Array(10).fill(1.08);
        const actions = mpc.solve(state, forecastSales, forecastFX);
        expect(actions).toHaveLength(3);
    });
});
