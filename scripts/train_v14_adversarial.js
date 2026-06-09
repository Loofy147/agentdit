import { PacioliEngine } from '../src/engine/pacioli.js';
import { NeuralController } from '../src/engine/neuralController.js';
import fs from 'fs';

function runAdversarialSession(heroWeights, villainWeights, steps = 100) {
    const engine = new PacioliEngine();
    const hero = new NeuralController(7, 32, 2, heroWeights);
    const villain = new NeuralController(7, 32, 2, villainWeights);

    let heroTotalReward = 0;

    for (let t = 0; t < steps; t++) {
        const obs = new Float64Array(engine.state);
        const hAct = hero.predict(obs);
        const vAct = villain.predict(obs);

        // 1. Villain Attack
        const fxDelta = vAct[0] * 0.02;
        const revShock = (vAct[1] + 1) / 2;
        engine.revalueFX(engine.fxRate + fxDelta);

        // 2. Hero Defense
        const borrowAmt = hAct[0] * 500;
        if (borrowAmt > 0) engine.post(0, 4, borrowAmt);
        else engine.post(4, 0, Math.min(Math.abs(borrowAmt), engine.state[0]));

        const swapAmt = hAct[1] * 200;
        if (swapAmt > 0) engine.post(1, 0, swapAmt / engine.fxRate);
        else engine.post(0, 1, Math.abs(swapAmt));

        // 3. Reality
        engine.post(3, 5, 250 * (1 - revShock));
        engine.post(0, 3, engine.state[3] * 0.15);
        engine.post(5, 0, 180);

        // 4. Reward
        const stress = engine.state[0] / 500.0;
        const reward = (engine.state[5] / 2000.0) + Math.min(1.0, stress);
        heroTotalReward += reward;

        if (engine.state[0] < 0) break;
    }
    return heroTotalReward;
}

// Training Logic
let heroWeights = new Float64Array((7 * 32) + (32 * 2)).map(() => (Math.random() * 2 - 1) * 0.1);
let villainWeights = new Float64Array((7 * 32) + (32 * 2)).map(() => (Math.random() * 2 - 1) * 0.1);

console.log('Training Adversarial Agents...');
for (let i = 0; i < 200; i++) {
    // 1. Train Hero to resist current Villain
    for (let j = 0; j < 10; j++) {
        const noise = new Float64Array(heroWeights.length).map(() => (Math.random() * 2 - 1) * 0.05);
        const candidate = heroWeights.map((w, idx) => w + noise[idx]);
        if (runAdversarialSession(candidate, villainWeights) > runAdversarialSession(heroWeights, villainWeights)) {
            heroWeights = candidate;
        }
    }

    // 2. Train Villain to break current Hero
    for (let j = 0; j < 10; j++) {
        const noise = new Float64Array(villainWeights.length).map(() => (Math.random() * 2 - 1) * 0.05);
        const candidate = villainWeights.map((w, idx) => w + noise[idx]);
        // Villain wants to MINIMIZE Hero's reward
        if (runAdversarialSession(heroWeights, candidate) < runAdversarialSession(heroWeights, villainWeights)) {
            villainWeights = candidate;
        }
    }

    if (i % 20 === 0) console.log(`Generation ${i} complete`);
}

fs.writeFileSync('hero_weights.json', JSON.stringify(Array.from(heroWeights)));
fs.writeFileSync('villain_weights.json', JSON.stringify(Array.from(villainWeights)));
console.log('Adversarial training complete.');
