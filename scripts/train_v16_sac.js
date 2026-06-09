import { PacioliEngine } from '../src/engine/pacioli.js';
import { SACController } from '../src/engine/sacController.js';
import { NeuralController } from '../src/engine/neuralController.js';
import fs from 'fs';

function runSACSession(heroWeights, villainWeights, steps = 100) {
    const engine = new PacioliEngine();
    const hero = new SACController(8, 3, 64, heroWeights);
    const villain = new NeuralController(8, 32, 2, villainWeights);

    let heroTotalUtility = 0;
    const alpha = 0.2; // Temperature

    for (let t = 0; t < steps; t++) {
        const state = engine.state;
        const { actions, entropy } = hero.sample(state);
        const vAct = villain.predict(state);

        // Villain
        engine.fxRate += vAct[0] * 0.015;
        const revShock = (vAct[1] + 1) / 2;

        // Hero Actions
        engine.post(0, 4, actions[0] * 300); // Borrow
        engine.post(1, 0, actions[1] * 200); // Swap
        engine.post(2, 0, actions[2] * 500); // MMF Realloc

        // Reality
        engine.post(3, 5, 250 * (1 - revShock));
        engine.post(0, 3, engine.state[3] * 0.18);
        engine.post(5, 0, 180);

        // Reward + Entropy
        const stress = engine.state[0] / 800.0;
        const reward = (engine.state[5] / 2500.0) + Math.min(1.0, stress);
        heroTotalUtility += reward + (alpha * entropy);

        if (engine.state[0] < 0) break;
    }
    return heroTotalUtility;
}

// Co-Training
let heroWeights = new Float64Array((8 * 64) + (64 * 3) + (64 * 3)).map(() => (Math.random() * 2 - 1) * 0.1);
let villainWeights = new Float64Array((8 * 32) + (32 * 2)).map(() => (Math.random() * 2 - 1) * 0.1);

console.log('Training Maximum Entropy Global Grid (SAC vs GAN)...');
for (let i = 0; i < 150; i++) {
    // Hero
    for (let j = 0; j < 5; j++) {
        const noise = new Float64Array(heroWeights.length).map(() => (Math.random() * 2 - 1) * 0.05);
        const candidate = heroWeights.map((w, idx) => w + noise[idx]);
        if (runSACSession(candidate, villainWeights) > runSACSession(heroWeights, villainWeights)) {
            heroWeights = candidate;
        }
    }
    // Villain
    for (let j = 0; j < 5; j++) {
        const noise = new Float64Array(villainWeights.length).map(() => (Math.random() * 2 - 1) * 0.05);
        const candidate = villainWeights.map((w, idx) => w + noise[idx]);
        if (runSACSession(heroWeights, candidate) < runSACSession(heroWeights, villainWeights)) {
            villainWeights = candidate;
        }
    }
    if (i % 30 === 0) console.log(`Generation ${i} complete`);
}

fs.writeFileSync('hero_sac_weights.json', JSON.stringify(Array.from(heroWeights)));
fs.writeFileSync('villain_v16_weights.json', JSON.stringify(Array.from(villainWeights)));
console.log('SAC training complete.');
