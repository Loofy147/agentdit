/**
 * Newton-Schulz Linear Regression Solver
 *
 * Reusable in-context linear regression solver using Newton-Schulz iterative
 * matrix inversion. Optimized for "Bolt Tempo" performance (< 1ms inference)
 * using linear memory access and minimal allocations.
 */

export class NewtonSchulzSolver {
    // Static identity matrix for reuse (up to d=64)
    static MAX_D = 64;
    static I_STATIC = new Float64Array(NewtonSchulzSolver.MAX_D * NewtonSchulzSolver.MAX_D);
    static {
        for (let i = 0; i < NewtonSchulzSolver.MAX_D; i++) {
            NewtonSchulzSolver.I_STATIC[i * NewtonSchulzSolver.MAX_D + i] = 1.0;
        }
    }

    /**
     * Matrix Utilities for Float64Array
     * Optimized for cache locality (linear access).
     */
    static transpose(A, rows, cols, out) {
        for (let i = 0; i < rows; i++) {
            const iOffset = i * cols;
            for (let j = 0; j < cols; j++) {
                out[j * rows + i] = A[iOffset + j];
            }
        }
    }

    /**
     * C = A @ B
     * A: (n, m), B: (m, p), C: (n, p)
     * Optimized using the linear accumulation pattern (outer loop over input).
     */
    static matmul(A, B, n, m, p, out) {
        out.fill(0);
        for (let i = 0; i < n; i++) {
            const iOffset = i * m;
            const ciOffset = i * p;
            for (let k = 0; k < m; k++) {
                const aik = A[iOffset + k];
                const kOffset = k * p;
                for (let j = 0; j < p; j++) {
                    out[ciOffset + j] += aik * B[kOffset + j];
                }
            }
        }
    }

    /**
     * Jacobi Eigenvalue Algorithm for symmetric matrices.
     * Returns eigenvalues in ascending order.
     */
    static getSymmetricEigs(M, d, outEigs, maxIters = 100, tol = 1e-10) {
        const A = new Float64Array(M); // Copy M

        for (let iter = 0; iter < maxIters; iter++) {
            let maxVal = 0;
            let p = 0, q = 1;

            for (let i = 0; i < d; i++) {
                for (let j = i + 1; j < d; j++) {
                    const val = Math.abs(A[i * d + j]);
                    if (val > maxVal) {
                        maxVal = val;
                        p = i; q = j;
                    }
                }
            }

            if (maxVal < tol) break;

            const app = A[p * d + p];
            const aqq = A[q * d + q];
            const apq = A[p * d + q];

            const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
            const c = Math.cos(phi);
            const s = Math.sin(phi);

            for (let i = 0; i < d; i++) {
                if (i !== p && i !== q) {
                    const aip = A[i * d + p];
                    const aiq = A[i * d + q];
                    A[i * d + p] = A[p * d + i] = c * aip - s * aiq;
                    A[i * d + q] = A[q * d + i] = s * aip + c * aiq;
                }
            }
            A[p * d + p] = c * c * app - 2 * s * c * apq + s * s * aqq;
            A[q * d + q] = s * s * app + 2 * s * c * apq + c * c * aqq;
            A[p * d + q] = A[q * d + p] = 0;
        }

        for (let i = 0; i < d; i++) outEigs[i] = A[i * d + i];
        outEigs.sort();
    }

    static selectDepth(condEst, minSafeDepth = 6, maxDepth = 48) {
        const raw = Math.ceil(Math.log2(Math.max(condEst, 2.0))) + 4;
        return Math.max(minSafeDepth, Math.min(maxDepth, raw));
    }

    /**
     * Newton-Schulz Matrix Inversion
     */
    static newtonSchulzInv(M, d, iters, lamMin, lamMax, outX) {
        const scale = 2.0 / (lamMax + lamMin);
        outX.fill(0);
        for (let i = 0; i < d; i++) outX[i * d + i] = scale;

        const MXk = new Float64Array(d * d);
        const bracket = new Float64Array(d * d);
        const nextXk = new Float64Array(d * d);

        for (let k = 0; k < iters; k++) {
            // Xk = Xk @ (2I - M @ Xk)
            this.matmul(M, outX, d, d, d, MXk);

            bracket.fill(0);
            for (let i = 0; i < d; i++) bracket[i * d + i] = 2.0;
            for (let i = 0; i < d * d; i++) bracket[i] -= MXk[i];

            this.matmul(outX, bracket, d, d, d, nextXk);
            outX.set(nextXk);
        }
    }

    /**
     * Solve Linear Regression y = Xw
     * Returns { prediction, info }
     */
    static solve(X, y, xQuery, options = {}) {
        const {
            regFrac = 1e-6,
            depth = null,
            minSafeDepth = 6,
            maxDepth = 48
        } = options;

        const N = y.length;
        const d = xQuery.length;

        const XT = new Float64Array(d * N);
        this.transpose(X, N, d, XT);

        const M_raw = new Float64Array(d * d);
        this.matmul(XT, X, d, N, d, M_raw);

        const eigs_raw = new Float64Array(d);
        this.getSymmetricEigs(M_raw, d, eigs_raw);

        const lamMax_raw = eigs_raw[d - 1];
        const lamMin_raw = Math.max(eigs_raw[0], 1e-8 * lamMax_raw);
        const condEst = lamMax_raw / lamMin_raw;

        const recommendedDepth = this.selectDepth(condEst, minSafeDepth, maxDepth);
        const usedDepth = depth !== null ? depth : recommendedDepth;
        const underResourced = usedDepth < recommendedDepth;

        // Regularize M
        const M = new Float64Array(M_raw);
        const regVal = regFrac * lamMax_raw;
        for (let i = 0; i < d; i++) M[i * d + i] += regVal;

        const eigs = new Float64Array(d);
        this.getSymmetricEigs(M, d, eigs);

        const Ainv = new Float64Array(d * d);
        this.newtonSchulzInv(M, d, usedDepth, eigs[0], eigs[d - 1], Ainv);

        // w_hat = Ainv @ (XT @ y)
        const XTy = new Float64Array(d);
        for (let i = 0; i < d; i++) {
            const offset = i * N;
            for (let j = 0; j < N; j++) {
                XTy[i] += XT[offset + j] * y[j];
            }
        }

        const wHat = new Float64Array(d);
        for (let i = 0; i < d; i++) {
            const offset = i * d;
            for (let j = 0; j < d; j++) {
                wHat[i] += Ainv[offset + j] * XTy[j];
            }
        }

        let pred = 0;
        for (let i = 0; i < d; i++) pred += xQuery[i] * wHat[i];

        return {
            prediction: pred,
            info: {
                estimatedConditionNumber: condEst,
                recommendedDepth,
                usedDepth,
                underResourced,
                costEstimateFlops: usedDepth * Math.pow(d, 3)
            }
        };
    }
}
