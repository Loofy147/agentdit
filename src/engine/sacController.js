import { PhaseShiftModule } from './phaseShift.js';

/**
 * SACController implements Layer 16 & 18: Soft Actor-Critic & Bayesian Volatility Surface.
 * Upgraded with Protocol SLA-2.1 Phase-Shift Module.
 */
export class SACController {
    static LOG_2PI = Math.log(2 * Math.PI);

    constructor(stateDim, actionDim, hiddenDim = 64, weightsM = null, weightsS = null) {
        this.stateDim = stateDim;
        this.actionDim = actionDim;
        this.hiddenDim = hiddenDim;

        const totalWeights = (stateDim * hiddenDim) + (hiddenDim * actionDim) + (hiddenDim * actionDim);

        this.weightsM = weightsM || new Float64Array(totalWeights).map(() => (Math.random() * 2 - 1) * 0.1);
        this.weightsS = weightsS || new Float64Array(this.weightsM);

        this.weights = new Float64Array(this.weightsM);

        this.phaseShift = new PhaseShiftModule();
        this.hiddenBuffer = new Float64Array(hiddenDim);
        this.muBuffer = new Float64Array(actionDim);
        this.logStdBuffer = new Float64Array(actionDim);
        this.actionsBuffer = new Float64Array(actionDim);

        this.updateWeightViews();
    }

    updateWeightViews() {
        const fc1Size = this.stateDim * this.hiddenDim;
        const muSize = this.hiddenDim * this.actionDim;
        this.wFc1 = this.weights.subarray(0, fc1Size);
        this.wMu = this.weights.subarray(fc1Size, fc1Size + muSize);
        this.wLogStd = this.weights.subarray(fc1Size + muSize);
    }

    relu(x) { return x > 0 ? x : 0; }

    sampleInternal(state, deterministic = false) {
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
            entropy: -logProb,
            mu: new Float64Array(this.muBuffer)
        };
    }

    sample(state, deterministic = false) {
        return this.sampleInternal(state, deterministic);
    }

    /**
     * Protocol SLA-2.1: PHASE-SHIFT MODULE EXECUTION.
     */
    samplePhaseShifted(state, sigma = 0.15) {
        const activeState = this.phaseShift.conserveBond(state);

        const originalWeights = new Float64Array(this.weights);

        // Mechanical Necessity (Vector B)
        this.weights.set(this.weightsM);
        this.updateWeightViews();
        const mechanical = this.sampleInternal(activeState, true);
        const vectorB = mechanical.actions[0];

        // Sentiment Sample (Domain S)
        this.weights.set(this.weightsS);
        this.updateWeightViews();
        const sentimentSample = this.sampleInternal(activeState, false);
        this.phaseShift.updateFloors(sentimentSample.actions);

        // Restore & Blending
        this.weights.set(originalWeights);
        this.updateWeightViews();
        const actualBehavior = this.sampleInternal(activeState, false);
        const actualA = actualBehavior.actions[0];

        const { steActive, alpha } = this.phaseShift.monitorEntropy(actualA, vectorB, sigma);

        if (alpha > 0) {
            this.weights.set(this.phaseShift.triangulateWeights(this.weightsM, this.weightsS, alpha));
        } else {
            this.weights.set(this.weightsM);
        }
        this.updateWeightViews();

        const result = this.sampleInternal(activeState, false);

        // KILL-SWITCH: Apply Sentiment Floors during STE
        if (steActive) {
            for (let i = 0; i < this.actionDim; i++) {
                const floor = this.phaseShift.sentimentFloors[i];
                // If action is weaker than floor in the same direction, snap to floor
                if (Math.sign(result.actions[i]) === Math.sign(floor) && Math.abs(result.actions[i]) < Math.abs(floor)) {
                    result.actions[i] = floor;
                }
            }
        }

        return {
            ...result,
            steActive,
            alpha,
            invalidationTrigger: steActive ? 'Sentiment Floor' : 'Technical Level'
        };
    }

    sampleBayesian(state, numPasses = 10) {
        const results = [];
        for (let i = 0; i < numPasses; i++) {
            results.push(this.sampleInternal(state, false).actions);
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
