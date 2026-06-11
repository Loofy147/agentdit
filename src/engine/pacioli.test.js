import { describe, it, expect } from 'vitest';
import { PacioliEngine } from './pacioli.js';

describe('PacioliEngineV16', () => {
    it('maintains accounting invariant', () => {
        const p = new PacioliEngine();
        expect(p.getInvariant()).toBeCloseTo(0, 9);

        p.post(0, 4, 100); // Borrow 100 USD
        expect(p.getInvariant()).toBeCloseTo(0, 9);

        p.revalueFX({ eur: 0.95, jpy: 150.0, gbp: 0.82 });
        expect(p.getInvariant()).toBeCloseTo(0, 9);
    });

    it('calculates leverage correctly', () => {
        const p = new PacioliEngine();
        // Initial state set in constructor ensures invariant=0
        const liabs = p.state[4];
        const eq = p.state[5];
        const expectedLeverage = liabs / eq;
        expect(p.getLeverage()).toBeCloseTo(expectedLeverage, 4);
    });
});
