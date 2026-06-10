import { PacioliEngine } from '../src/engine/pacioli.js';
import { SACController } from '../src/engine/sacController.js';
import { TaskGenerator } from '../src/services/taskGenerator.js';
import fs from 'fs';

async function diagnose() {
    const generator = new TaskGenerator('./public_market_data.json');
    const tasks = await generator.generateTasks();

    let hw = JSON.parse(fs.readFileSync('./hero_v17_real_weights.json', 'utf8'));
    const hero = new SACController(11, 3, 64, new Float64Array(hw));

    const engine = new PacioliEngine();
    console.log('Initial Equity:', engine.state[5]);

    for(let t=0; t<24; t++) {
        const market = tasks[0].data[t];
        const state = new Float64Array([...engine.state, market.shockProb, 0, 0]);
        const { actions } = hero.sample(state, true);

        if (actions[0] > 0) engine.post(0, 4, actions[0] * 300);
        else if (actions[0] < 0) engine.post(4, 0, Math.abs(actions[0]) * 300);
        if (actions[1] > 0) engine.post(1, 0, actions[1] * 200);
        else if (actions[1] < 0) engine.post(0, 1, Math.abs(actions[1]) * 200);
        if (actions[2] > 0) engine.post(2, 0, actions[2] * 500);
        else if (actions[2] < 0) engine.post(0, 2, Math.abs(actions[2]) * 500);

        engine.revalueFX(market.fxRate);
        engine.post(3, 5, market.sales);
        engine.post(0, 3, engine.state[3] * 0.18);
        engine.post(5, 0, 180);

        if (t === 23) {
            console.log('Final State:', engine.state);
            console.log('Final Equity + FX_Adj:', engine.state[5] + engine.state[6]);
        }
    }
}
diagnose();
