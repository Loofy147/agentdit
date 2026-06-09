import { PacioliEngine } from '../src/engine/pacioli.js';
import { SACController } from '../src/engine/sacController.js';
import { DataService } from '../src/services/dataService.js';
import fs from 'fs';

async function runRealDataSession(heroWeights, dataService, steps = 24) {
    const engine = new PacioliEngine();
    // stateDim = 9: [8-account state, shockProb]
    const hero = new SACController(9, 3, 64, heroWeights);

    let heroTotalUtility = 0;
    const alpha = 0.2; // Temperature

    for (let t = 0; t < steps; t++) {
        const market = dataService.getNext();
        if (!market) break;

        // Update engine with real market data
        engine.fxRate = market.fxRate;
        const revShock = market.sales / 250; // Ratio of real sales to base sales

        const state = new Float64Array([...engine.state, market.shockProb]);
        const { actions, entropy } = hero.sample(state);

        // Hero Actions
        engine.post(0, 4, actions[0] * 300); // Borrow
        engine.post(1, 0, actions[1] * 200); // Swap
        engine.post(2, 0, actions[2] * 500); // MMF Realloc

        // Reality
        engine.post(3, 5, market.sales);
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

async function train() {
    console.log('Loading real market data...');
    const dataService = await DataService.load('./public_market_data.json');

    // stateDim=9, actionDim=3, hidden=64
    let heroWeights = new Float64Array((9 * 64) + (64 * 3) + (64 * 3)).map(() => (Math.random() * 2 - 1) * 0.1);

    console.log('Training Hero Agent on Real Predicted Probabilities...');
    for (let i = 0; i < 100; i++) {
        for (let j = 0; j < 10; j++) {
            const noise = new Float64Array(heroWeights.length).map(() => (Math.random() * 2 - 1) * 0.05);
            const candidate = heroWeights.map((w, idx) => w + noise[idx]);

            const scoreHero = await runRealDataSession(heroWeights, dataService);
            const scoreCandidate = await runRealDataSession(candidate, dataService);

            if (scoreCandidate > scoreHero) {
                heroWeights = candidate;
            }
        }
        if (i % 20 === 0) console.log(`Generation ${i} complete`);
    }

    fs.writeFileSync('hero_v17_real_weights.json', JSON.stringify(Array.from(heroWeights)));
    console.log('Real data training complete. Saved to hero_v17_real_weights.json');
}

train();
