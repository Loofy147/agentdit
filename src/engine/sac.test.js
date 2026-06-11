import { describe, it, expect } from 'vitest';
import { SACController } from './sacController.js';

describe('SACController', () => {
    it('samples actions in range [-1, 1]', () => {
        const sac = new SACController(12, 3);
        const state = new Float64Array(12).fill(0.5);
        const { actions, entropy } = sac.sample(state);
        expect(actions).toHaveLength(3);
        expect(actions[0]).toBeGreaterThanOrEqual(-1);
        expect(actions[0]).toBeLessThanOrEqual(1);
        expect(entropy).toBeDefined();
    });

    it('returns consistent deterministic actions', () => {
        const sac = new SACController(12, 3);
        const state = new Float64Array(12).fill(0.5);
        const res1 = sac.sample(state, true);
        const res2 = sac.sample(state, true);
        expect(res1.actions[0]).toBe(res2.actions[0]);
    });
});
