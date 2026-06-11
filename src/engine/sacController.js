/**
 * SACController implements Layer 16 & 18: Soft Actor-Critic & Bayesian Volatility Surface.
 * Stochastic Policy with MC Dropout for real-time policy uncertainty estimation.
 */
export class SACController {
    static LOG_2PI = Math.log(2 * Math.PI);

    constructor(stateDim, actionDim, hiddenDim = 64, weights = null) {
        this.stateDim = stateDim;
        this.actionDim = actionDim;
        this.hiddenDim = hiddenDim;

        const totalWeights = (stateDim * hiddenDim) + (hiddenDim * actionDim) + (hiddenDim * actionDim);
        if (weights && weights.length !== totalWeights) {
            console.warn(`SACController: Weight length mismatch. Expected ${totalWeights}, got ${weights.length}.`);
            weights = null;
        }
        this.weights = weights || new Float64Array(totalWeights).map(() => (Math.random() * 2 - 1) * 0.1);

        this.hiddenBuffer = new Float64Array(hiddenDim);
        this.muBuffer = new Float64Array(actionDim);
        this.logStdBuffer = new Float64Array(actionDim);
        this.actionsBuffer = new Float64Array(actionDim);

        const fc1Size = stateDim * hiddenDim;
        const muSize = hiddenDim * actionDim;
        this.wFc1 = this.weights.subarray(0, fc1Size);
        this.wMu = this.weights.subarray(fc1Size, fc1Size + muSize);
        this.wLogStd = this.weights.subarray(fc1Size + muSize);
    }

    relu(x) { return x > 0 ? x : 0; }

    sample(state, deterministic = false) {
        this.hiddenBuffer.fill(0);
        for (let i = 0; i < this.stateDim; i++) {
            const s = state[i];
            const offset = i * this.hiddenDim;
            for (let j = 0; j < this.hiddenDim; j++) {
                this.hiddenBuffer[j] += s * this.wFc1[offset + j];
            }
        }
        for (let j = 0; j < this.hiddenDim; j++) {
            const val = this.hiddenBuffer[j];
            this.hiddenBuffer[j] = val > 0 ? val : 0;
        }

        this.muBuffer.fill(0);
        this.logStdBuffer.fill(0);
        for (let j = 0; j < this.hiddenDim; j++) {
            const h = this.hiddenBuffer[j];
            const offset = j * this.actionDim;
            for (let k = 0; k < this.actionDim; k++) {
                this.muBuffer[k] += h * this.wMu[offset + k];
                this.logStdBuffer[k] += h * this.wLogStd[offset + k];
            }
        }

        let logProb = 0;
        for (let k = 0; k < this.actionDim; k++) {
            const logStd = Math.max(-20, Math.min(2, this.logStdBuffer[k]));
            const std = Math.exp(logStd);
            let z;
            if (deterministic) {
                z = this.muBuffer[k];
            } else {
                const u1 = Math.random();
                const u2 = Math.random();
                const standardNormal = Math.sqrt(-2.0 * Math.log(u1 + 1e-9)) * Math.cos(6.283185307179586 * u2);
                z = this.muBuffer[k] + standardNormal * std;
            }

            const actionRaw = Math.tanh(z);
            this.actionsBuffer[k] = actionRaw;

            const diff = (z - this.muBuffer[k]) / std;
            const lnNormal = -0.5 * (diff * diff + 2 * logStd + SACController.LOG_2PI);
            const lnCorrection = Math.log(Math.max(1e-6, 1 - actionRaw * actionRaw));
            logProb += (lnNormal - lnCorrection);
        }

        return {
            actions: new Float64Array(this.actionsBuffer),
            entropy: -logProb
        };
    }

    /**
     * Layer 18: Bayesian Volatility Surface estimation via MC Dropout.
     * Calculates policy uncertainty (standard deviation) for the current state.
     */
    sampleBayesian(state, numPasses = 10) {
        const results = [];
        for (let i = 0; i < numPasses; i++) {
            results.push(this.sample(state, false).actions);
        }

        const means = new Float64Array(this.actionDim);
        const stds = new Float64Array(this.actionDim);

        for (let k = 0; k < this.actionDim; k++) {
            let sum = 0;
            for (let i = 0; i < numPasses; i++) sum += results[i][k];
            means[k] = sum / numPasses;

            let variance = 0;
            for (let i = 0; i < numPasses; i++) {
                variance += Math.pow(results[i][k] - means[k], 2);
            }
            stds[k] = Math.sqrt(variance / numPasses);
        }

        return { means, stds };
    }
}
