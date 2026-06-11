import { PacioliEngine } from '../src/engine/pacioli.js';
import { SACController } from '../src/engine/sacController.js';
import { DataService } from '../src/services/dataService.js';
import fs from 'fs';

async function runRealDataSession(heroWeights, dataService, steps = 24) {
    const engine = new PacioliEngine();
    // stateDim=17
    const hero = new SACController(17, 3, 64, heroWeights);

    let heroTotalUtility = 0;
    const alpha = 0.1;

    for (let t = 0; t < steps; t++) {
        const market = dataService.getNext();
        if (!market) break;

        engine.revalueFX(market.fx);
        engine.accrueInterest(market.interestRate);

        const vix_norm = Math.min(1.0, market.vix / 50);
        const rec_norm = Math.min(1.0, market.recessionProb / 100);
        const int_norm = Math.min(1.0, market.interestRate / 10);

        const state = new Float64Array(17);
        state.set(engine.state);
        state[10] = market.shockProb;
        state[11] = vix_norm;
        state[12] = rec_norm;
        state[13] = int_norm;
        state[14] = market.companyProbs.techCorp;
        state[15] = market.companyProbs.energyPlus;
        state[16] = market.companyProbs.retailGlobal;

        const { actions, entropy } = hero.sample(state);

        // Hero Actions
        if (actions[0] > 0) engine.post(0, 4, actions[0] * 300);
        else if (actions[0] < 0) engine.post(4, 0, Math.abs(actions[0]) * 300);

        if (actions[1] > 0) engine.post(1, 0, actions[1] * 200);
        else if (actions[1] < 0) engine.post(0, 1, Math.abs(actions[1]) * 200);

        if (actions[2] > 0) engine.post(2, 0, actions[2] * 500);
        else if (actions[2] < 0) engine.post(0, 2, Math.abs(actions[2]) * 500);

        engine.post(3, 5, market.sales);
        engine.post(0, 3, engine.state[3] * 0.18);
        engine.post(5, 0, 180);

        const cash = engine.state[0];
        const equity = engine.state[5] + engine.state[6];
        const leverage = engine.getLeverage();

        let reward = equity / 1000.0;
        if (cash < 200) reward -= 5.0;
        if (leverage > 4.0) reward -= (leverage - 4.0);

        if (cash < 0) {
            reward -= 50;
            heroTotalUtility += reward;
            break;
        }

        heroTotalUtility += reward + (alpha * entropy);
    }
    return heroTotalUtility;
}

async function train() {
    console.log('Loading enriched multi-asset market data...');
    const dataService = await DataService.load('./public_market_data.json');

    const weightSize = (17 * 64) + (64 * 3) + (64 * 3);
    let heroWeights = new Float64Array(weightSize).map(() => (Math.random() * 2 - 1) * 0.1);

    console.log('Training Hero Agent (Multi-Asset Focus)...');
    let bestScore = -Infinity;

    for (let i = 0; i < 150; i++) {
        let currentScore = await runRealDataSession(heroWeights, dataService);

        for (let j = 0; j < 5; j++) {
            const noiseLevel = 0.05 * Math.exp(-i / 100);
            const noise = new Float64Array(heroWeights.length).map(() => (Math.random() * 2 - 1) * noiseLevel);
            const candidate = heroWeights.map((w, idx) => w + noise[idx]);

            const scoreCandidate = await runRealDataSession(candidate, dataService);

            if (scoreCandidate > currentScore) {
                heroWeights = candidate;
                currentScore = scoreCandidate;
            }
        }

        if (currentScore > bestScore) {
            bestScore = currentScore;
        }

        if (i % 50 === 0) console.log(`Generation ${i} complete. Best Score: ${bestScore.toFixed(2)}`);
    }

    fs.writeFileSync('hero_v17_real_weights.json', JSON.stringify(Array.from(heroWeights)));
    console.log('Training complete.');
}

train();
