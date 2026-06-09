/**
 * NeuralController implements Layer 13: Neural Hydraulics.
 * A simple 2-layer MLP (6 Inputs -> 8 Hidden -> 2 Outputs).
 */
export class NeuralController {
    constructor(weights = null) {
        // 6 inputs: [usdCash, eurCash, liabilities, equity, fxRate, leverage]
        // 8 hidden neurons
        // 2 outputs: [borrowPaydown, swapIntensity]
        this.weights = weights || new Float64Array(64).map(() => (Math.random() * 2 - 1) * 0.1);
    }

    tanh(x) {
        return Math.tanh(x);
    }

    /**
     * Inference: Maps observations to actions.
     */
    predict(obs) {
        const w1 = this.weights.slice(0, 48); // 6x8
        const w2 = this.weights.slice(48, 64); // 8x2

        // Hidden Layer
        const hidden = new Float64Array(8);
        for (let j = 0; j < 8; j++) {
            let sum = 0;
            for (let i = 0; i < 6; i++) {
                sum += obs[i] * w1[i * 8 + j];
            }
            hidden[j] = this.tanh(sum);
        }

        // Output Layer
        const outputs = new Float64Array(2);
        for (let k = 0; k < 2; k++) {
            let sum = 0;
            for (let j = 0; j < 8; j++) {
                sum += hidden[j] * w2[j * 2 + k];
            }
            outputs[k] = this.tanh(sum);
        }

        return outputs;
    }
}
