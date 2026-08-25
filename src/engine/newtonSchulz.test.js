import { describe, it, expect } from 'vitest';
import { NewtonSchulzSolver } from './newtonSchulz.js';

describe('NewtonSchulzSolver', () => {
    it('correctly performs matrix multiplication', () => {
        const A = new Float64Array([1, 2, 3, 4]); // 2x2
        const B = new Float64Array([5, 6, 7, 8]); // 2x2
        const C = new Float64Array(4);
        NewtonSchulzSolver.matmul(A, B, 2, 2, 2, C);
        // [1*5+2*7, 1*6+2*8, 3*5+4*7, 3*6+4*8] = [19, 22, 43, 50]
        expect(Array.from(C)).toEqual([19, 22, 43, 50]);
    });

    it('correctly transposes a matrix', () => {
        const A = new Float64Array([1, 2, 3, 4, 5, 6]); // 2 rows, 3 cols
        const AT = new Float64Array(6);
        NewtonSchulzSolver.transpose(A, 2, 3, AT);
        // [1, 4, 2, 5, 3, 6] (3 rows, 2 cols)
        expect(Array.from(AT)).toEqual([1, 4, 2, 5, 3, 6]);
    });

    it('estimates eigenvalues of a symmetric matrix', () => {
        // M = [[2, 1], [1, 2]] -> eigs are 1 and 3
        const M = new Float64Array([2, 1, 1, 2]);
        const eigs = new Float64Array(2);
        NewtonSchulzSolver.getSymmetricEigs(M, 2, eigs);
        expect(eigs[0]).toBeCloseTo(1, 5);
        expect(eigs[1]).toBeCloseTo(3, 5);
    });

    it('reproduces the condition-number self-test behavior', () => {
        // This test simulates the Python self-test logic
        const d = 5;
        const N = 3 * d;
        const regFrac = 1e-6;

        const results = [];
        const conds = [10, 100, 1000];

        for (const targetCond of conds) {
            // Create a symmetric matrix with known eigenvalues to control condition number
            const eigs = new Float64Array(d);
            for (let i = 0; i < d; i++) {
                eigs[i] = Math.pow(10, (i / (d - 1)) * Math.log10(targetCond));
            }

            const X = new Float64Array(N * d);
            for (let i = 0; i < d; i++) {
                X[i * d + i] = Math.sqrt(eigs[i]);
            }

            const wStar = new Float64Array(d).fill(1.0);
            const y = new Float64Array(N);
            for (let i = 0; i < N; i++) {
                for (let j = 0; j < d; j++) {
                    y[i] += X[i * d + j] * wStar[j];
                }
            }

            const xQuery = new Float64Array(d).fill(0.5);
            const yQuery = 0.5 * d;

            const { prediction, info } = NewtonSchulzSolver.solve(X, y, xQuery, { regFrac });

            results.push({
                targetCond,
                estimatedCond: info.estimatedConditionNumber,
                error: Math.abs(prediction - yQuery)
            });
        }

        results.forEach(r => {
            expect(r.estimatedCond).toBeGreaterThan(r.targetCond * 0.9);
            expect(r.estimatedCond).toBeLessThan(r.targetCond * 1.1);
            expect(r.error).toBeLessThan(1e-3);
        });
    });

    it('flags under-resourced runs when depth is manually overridden low', () => {
        const d = 4;
        const X = new Float64Array(10 * d).fill(0.1);
        for(let i=0; i<d; i++) X[i*d+i] = 1.0;
        const y = new Float64Array(10).fill(1.0);
        const xQuery = new Float64Array(d).fill(1.0);

        const { info } = NewtonSchulzSolver.solve(X, y, xQuery, { depth: 2 });
        expect(info.underResourced).toBe(true);
        expect(info.usedDepth).toBe(2);
    });
});
