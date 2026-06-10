import { describe, it, expect } from 'vitest';
import { PacioliEngine } from './pacioli.js';

describe('PacioliEngineV16', () => {
    it('maintains accounting invariant', () => {
        const p = new PacioliEngine();
        expect(p.getInvariant()).toBeCloseTo(0, 9);

        p.post(0, 4, 100); // Borrow: Cash+, Liab+
        expect(p.getInvariant()).toBeCloseTo(0, 9);

        p.revalueFX(1.15); // Revalue EUR
        expect(p.getInvariant()).toBeCloseTo(0, 9);
    });

    it('calculates leverage correctly', () => {
        const p = new PacioliEngine();
        // Liab: 1500, Eq: 2240. Leverage = 1500 / 2240 = 0.6696
        expect(p.getLeverage()).toBeCloseTo(0.6696, 2);
    });
});
