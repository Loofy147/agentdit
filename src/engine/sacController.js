/**
 * SACController implements Layer 16: Soft Actor-Critic logic.
 * Stochastic Policy mapping states to action distributions (mu, log_std).
 * Optimized for "Bolt Tempo" (sub-1ms inference) using pre-allocated buffers.
 */
export class SACController {
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

        // Pre-allocate buffers for inference
        this.hiddenBuffer = new Float64Array(hiddenDim);
        this.muBuffer = new Float64Array(actionDim);
        this.logStdBuffer = new Float64Array(actionDim);
        this.actionsBuffer = new Float64Array(actionDim);

        // Weight Views (to avoid slicing in the hot loop)
        const fc1Size = stateDim * hiddenDim;
        const muSize = hiddenDim * actionDim;
        this.wFc1 = this.weights.subarray(0, fc1Size);
        this.wMu = this.weights.subarray(fc1Size, fc1Size + muSize);
        this.wLogStd = this.weights.subarray(fc1Size + muSize);
    }

    relu(x) { return Math.max(0, x); }
    tanh(x) { return Math.tanh(x); }

    /**
     * sample: Samples an action from the policy distribution and calculates log_prob (entropy).
     */
    sample(state, deterministic = false) {
        // 1. FC1 (State -> Hidden)
        for (let j = 0; j < this.hiddenDim; j++) {
            let sum = 0;
            for (let i = 0; i < this.stateDim; i++) {
                sum += state[i] * this.wFc1[i * this.hiddenDim + j];
            }
            this.hiddenBuffer[j] = this.relu(sum);
        }

        // 2. MU and LOG_STD (Hidden -> Action Params)
        for (let k = 0; k < this.actionDim; k++) {
            let sumMu = 0;
            let sumLogStd = 0;
            for (let j = 0; j < this.hiddenDim; j++) {
                sumMu += this.hiddenBuffer[j] * this.wMu[j * this.actionDim + k];
                sumLogStd += this.hiddenBuffer[j] * this.wLogStd[j * this.actionDim + k];
            }
            this.muBuffer[k] = sumMu;
            this.logStdBuffer[k] = Math.max(-20, Math.min(2, sumLogStd));
        }

        let logProb = 0;
        for (let k = 0; k < this.actionDim; k++) {
            const std = Math.exp(this.logStdBuffer[k]);
            let z;
            if (deterministic) {
                z = this.muBuffer[k];
            } else {
                const u1 = Math.random();
                const u2 = Math.random();
                const standardNormal = Math.sqrt(-2.0 * Math.log(u1 + 1e-9)) * Math.cos(2.0 * Math.PI * u2);
                z = this.muBuffer[k] + standardNormal * std;
            }

            const actionRaw = this.tanh(z);
            this.actionsBuffer[k] = actionRaw;

            // Simplified entropy calculation
            const lnNormal = -0.5 * (Math.pow((z - this.muBuffer[k]) / std, 2) + 2 * Math.log(std) + Math.log(2 * Math.PI));
            const lnCorrection = Math.log(Math.max(1e-6, 1 - Math.pow(actionRaw, 2)));
            logProb += (lnNormal - lnCorrection);
        }

        // Return copies or the buffer? Copying actions to prevent mutation of internal state if used elsewhere
        return {
            actions: new Float64Array(this.actionsBuffer),
            entropy: -logProb
        };
    }
}
