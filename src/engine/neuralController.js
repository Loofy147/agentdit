/**
 * Flexible Neural Controller for Layer 14 Adversarial Game.
 * Optimized for performance using pre-allocated buffers and subarray views.
 */
export class NeuralController {
    constructor(inputDim, hiddenDim, outputDim, weights = null) {
        this.inputDim = inputDim;
        this.hiddenDim = hiddenDim;
        this.outputDim = outputDim;

        const totalWeights = (inputDim * hiddenDim) + (hiddenDim * outputDim);
        this.weights = weights || new Float64Array(totalWeights).map(() => (Math.random() * 2 - 1) * 0.1);

        this.hiddenBuffer = new Float64Array(hiddenDim);
        this.outputBuffer = new Float64Array(outputDim);

        const w1Size = inputDim * hiddenDim;
        this.w1 = this.weights.subarray(0, w1Size);
        this.w2 = this.weights.subarray(w1Size);
    }

    tanh(x) {
        return Math.tanh(x);
    }

    predict(obs) {
        // 1. Hidden Layer - Optimized Linear Iteration
        this.hiddenBuffer.fill(0);
        for (let i = 0; i < this.inputDim; i++) {
            const o = obs[i];
            const offset = i * this.hiddenDim;
            for (let j = 0; j < this.hiddenDim; j++) {
                this.hiddenBuffer[j] += o * this.w1[offset + j];
            }
        }
        for (let j = 0; j < this.hiddenDim; j++) {
            this.hiddenBuffer[j] = this.tanh(this.hiddenBuffer[j]);
        }

        // 2. Output Layer
        this.outputBuffer.fill(0);
        for (let j = 0; j < this.hiddenDim; j++) {
            const h = this.hiddenBuffer[j];
            const offset = j * this.outputDim;
            for (let k = 0; k < this.outputDim; k++) {
                this.outputBuffer[k] += h * this.w2[offset + k];
            }
        }
        for (let k = 0; k < this.outputDim; k++) {
            this.outputBuffer[k] = this.tanh(this.outputBuffer[k]);
        }

        return new Float64Array(this.outputBuffer);
    }
}
