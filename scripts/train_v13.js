import { PacioliEngine } from '../src/engine/pacioli.js';
import { NeuralController } from '../src/engine/neuralController.js';
import fs from 'fs';

function runSimulation(weights, steps = 100) {
    const engine = new PacioliEngine();
    const controller = new NeuralController(weights);
    let totalReward = 0;
    let prevEquity = engine.state[5];

    const shockStart = 60;
    const shockEnd = 80;

    for (let t = 0; t < steps; t++) {
        const state = engine.getState();
        const obs = new Float64Array([
            state.usdCash / 2000,
            state.eurCash / 1000,
            state.liabilities / 2000,
            state.equity / 3000,
            state.fxRate - 1,
            state.leverage / 5
        ]);

        const action = controller.predict(obs);

        // Borrow/Paydown
        const netBorrow = action[0] * 500;
        if (netBorrow > 0) engine.post(0, 4, netBorrow);
        else engine.post(4, 0, Math.min(Math.abs(netBorrow), engine.state[0]));

        // Swap
        const swapAmt = Math.max(0, action[1]) * 200;
        engine.post(1, 0, swapAmt / engine.fxRate);

        // Env
        engine.revalueFX(engine.fxRate + (Math.random() * 0.01 - 0.005));
        const shock = (t >= shockStart && t <= shockEnd) ? 0.2 : 1.0;
        engine.post(3, 5, Math.max(0, (250 + (Math.random() * 40 - 20)) * shock));
        engine.post(0, 3, engine.state[3] * 0.18);

        const dynRate = (0.05/365) + (0.02/365) * (state.leverage**2);
        engine.post(7, 5, engine.state[4] * dynRate);
        engine.post(4, 7, engine.state[4] * dynRate);
        engine.post(5, 0, 180);

        const currentEquity = engine.state[5];
        const cashPenalty = engine.state[0] < 200 ? 1000 : 0;
        totalReward += (currentEquity - prevEquity) - cashPenalty - (state.leverage**2) * 10;
        prevEquity = currentEquity;

        if (engine.state[0] < 0) break;
    }
    return totalReward;
}

// Simple Hill-Climbing
let bestWeights = new Float64Array(64).map(() => (Math.random() * 2 - 1) * 0.1);
let bestScore = -Infinity;

console.log('Training Neural Hydraulics...');
for (let i = 0; i < 500; i++) {
    const noise = new Float64Array(64).map(() => (Math.random() * 2 - 1) * 0.05);
    const candidate = bestWeights.map((w, idx) => w + noise[idx]);

    let totalScore = 0;
    for (let j = 0; j < 5; j++) totalScore += runSimulation(candidate);
    const avgScore = totalScore / 5;

    if (avgScore > bestScore) {
        bestScore = avgScore;
        bestWeights = candidate;
        if (i % 50 === 0) console.log(`Step ${i}: Score ${bestScore.toFixed(2)}`);
    }
}

fs.writeFileSync('best_weights.json', JSON.stringify(Array.from(bestWeights)));
console.log('Training complete. best_weights.json saved.');
