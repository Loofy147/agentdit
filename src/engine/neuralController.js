/**
 * Flexible Neural Controller for Layer 14 Adversarial Game.
 */
export class NeuralController {
    constructor(inputDim, hiddenDim, outputDim, weights = null) {
        this.inputDim = inputDim;
        this.hiddenDim = hiddenDim;
        this.outputDim = outputDim;

        const totalWeights = (inputDim * hiddenDim) + (hiddenDim * outputDim);
        this.weights = weights || new Float64Array(totalWeights).map(() => (Math.random() * 2 - 1) * 0.1);
    }

    tanh(x) {
        return Math.tanh(x);
    }

    predict(obs) {
        const w1Size = this.inputDim * this.hiddenDim;
        const w1 = this.weights.slice(0, w1Size);
        const w2 = this.weights.slice(w1Size);

        // Hidden Layer
        const hidden = new Float64Array(this.hiddenDim);
        for (let j = 0; j < this.hiddenDim; j++) {
            let sum = 0;
            for (let i = 0; i < this.inputDim; i++) {
                sum += obs[i] * w1[i * this.hiddenDim + j];
            }
            hidden[j] = this.tanh(sum);
        }

        // Output Layer
        const outputs = new Float64Array(this.outputDim);
        for (let k = 0; k < this.outputDim; k++) {
            let sum = 0;
            for (let j = 0; j < this.hiddenDim; j++) {
                sum += hidden[j] * w2[j * this.outputDim + k];
            }
            outputs[k] = this.tanh(sum);
        }

        return outputs;
    }
}
