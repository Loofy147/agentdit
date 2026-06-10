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
        // 1. Hidden Layer
        for (let j = 0; j < this.hiddenDim; j++) {
            let sum = 0;
            for (let i = 0; i < this.inputDim; i++) {
                sum += obs[i] * this.w1[i * this.hiddenDim + j];
            }
            this.hiddenBuffer[j] = this.tanh(sum);
        }

        // 2. Output Layer
        for (let k = 0; k < this.outputDim; k++) {
            let sum = 0;
            for (let j = 0; j < this.hiddenDim; j++) {
                sum += this.hiddenBuffer[j] * this.w2[j * this.outputDim + k];
            }
            this.outputBuffer[k] = this.tanh(sum);
        }

        return new Float64Array(this.outputBuffer);
    }
}
