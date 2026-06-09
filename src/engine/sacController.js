/**
 * SACController implements Layer 16: Soft Actor-Critic logic.
 * Stochastic Policy mapping states to action distributions (mu, log_std).
 */
export class SACController {
    constructor(stateDim, actionDim, hiddenDim = 64, weights = null) {
        this.stateDim = stateDim;
        this.actionDim = actionDim;
        this.hiddenDim = hiddenDim;

        // Weights for: FC1 (state->hidden), MU (hidden->action), LOG_STD (hidden->action)
        const totalWeights = (stateDim * hiddenDim) + (hiddenDim * actionDim) + (hiddenDim * actionDim);
        this.weights = weights || new Float64Array(totalWeights).map(() => (Math.random() * 2 - 1) * 0.1);
    }

    relu(x) { return Math.max(0, x); }
    tanh(x) { return Math.tanh(x); }

    /**
     * sample: Samples an action from the policy distribution and calculates log_prob (entropy).
     */
    sample(state, deterministic = false) {
        const fc1Size = this.stateDim * this.hiddenDim;
        const muSize = this.hiddenDim * this.actionDim;

        const wFc1 = this.weights.slice(0, fc1Size);
        const wMu = this.weights.slice(fc1Size, fc1Size + muSize);
        const wLogStd = this.weights.slice(fc1Size + muSize);

        // FC1
        const hidden = new Float64Array(this.hiddenDim);
        for (let j = 0; j < this.hiddenDim; j++) {
            let sum = 0;
            for (let i = 0; i < this.stateDim; i++) {
                sum += state[i] * wFc1[i * this.hiddenDim + j];
            }
            hidden[j] = this.relu(sum);
        }

        // MU and LOG_STD
        const mu = new Float64Array(this.actionDim);
        const logStd = new Float64Array(this.actionDim);
        for (let k = 0; k < this.actionDim; k++) {
            let sumMu = 0;
            let sumLogStd = 0;
            for (let j = 0; j < this.hiddenDim; j++) {
                sumMu += hidden[j] * wMu[j * this.actionDim + k];
                sumLogStd += hidden[j] * wLogStd[j * this.actionDim + k];
            }
            mu[k] = sumMu;
            logStd[k] = Math.max(-20, Math.min(2, sumLogStd));
        }

        const actions = new Float64Array(this.actionDim);
        let logProb = 0;

        for (let k = 0; k < this.actionDim; k++) {
            const std = Math.exp(logStd[k]);
            let z;
            if (deterministic) {
                z = mu[k];
            } else {
                // Box-Muller transform for normal distribution
                const u1 = Math.random();
                const u2 = Math.random();
                const standardNormal = Math.sqrt(-2.0 * Math.log(u1 + 1e-9)) * Math.cos(2.0 * Math.PI * u2);
                z = mu[k] + standardNormal * std;
            }

            const actionRaw = this.tanh(z);
            actions[k] = actionRaw;

            // Log prob for entropy (simplified)
            // ln(pi(a|s)) = ln(N(z|mu,std)) - ln(1-tanh^2(z))
            const lnNormal = -0.5 * (Math.pow((z - mu[k]) / std, 2) + 2 * Math.log(std) + Math.log(2 * Math.PI));
            const lnCorrection = Math.log(Math.max(1e-6, 1 - Math.pow(actionRaw, 2)));
            logProb += (lnNormal - lnCorrection);
        }

        return { actions, entropy: -logProb };
    }
}
