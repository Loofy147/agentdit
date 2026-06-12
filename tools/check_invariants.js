import { PacioliEngine } from '../src/engine/pacioli.js';
import { TaskGenerator } from '../src/services/taskGenerator.js';
import { SACController } from '../src/engine/sacController.js';
import fs from 'fs';

async function check() {
    const engine = new PacioliEngine();
    const generator = new TaskGenerator('./public_market_data.json');
    const tasks = await generator.generateTasks();
    const task = tasks[0];

    let hw = JSON.parse(fs.readFileSync('./hero_v17_real_weights.json', 'utf8'));
    let sw = JSON.parse(fs.readFileSync('./sla_s_weights.json', 'utf8'));
    // Updated stateDim to 17
    const hero = new SACController(17, 3, 64, new Float64Array(hw), new Float64Array(sw));

    console.log('--- Invariant Diagnostic Tool ---');
    console.log('Step 0 Invariant:', engine.getInvariant());

    let maxDrift = 0;
    for(let t=0; t<24; t++) {
        const market = task.data[t];
        const state = new Float64Array(17);
        state.set(engine.state);
        state[10] = market.shockProb;
        state[11] = Math.min(1.0, market.vix / 50);
        state[12] = Math.min(1.0, market.recessionProb / 100);
        state[13] = Math.min(1.0, market.interestRate / 10);
        state[14] = market.companies.techCorp.prob;
        state[15] = market.companies.energyPlus.prob;
        state[16] = market.companies.retailGlobal.prob;

        const { actions } = hero.samplePhaseShifted(state, 0.15);

        if (actions[0] > 0) engine.post(0, 4, actions[0] * 300);
        else if (actions[0] < 0) engine.post(4, 0, Math.abs(actions[0]) * 300);
        if (actions[1] > 0) engine.post(1, 0, actions[1] * 200);
        else if (actions[1] < 0) engine.post(0, 1, Math.abs(actions[1]) * 200);
        if (actions[2] > 0) engine.post(2, 0, actions[2] * 500);
        else if (actions[2] < 0) engine.post(0, 2, Math.abs(actions[2]) * 500);

        engine.revalueFX(market.fx);
        engine.post(3, 5, market.sales);
        engine.post(0, 3, engine.state[3] * 0.18);
        engine.post(5, 0, 180);

        const inv = engine.getInvariant();
        maxDrift = Math.max(maxDrift, Math.abs(inv));
        if (Math.abs(inv) > 1e-9) {
             console.log(`[ALERT] Step ${t} Invariant Breach: ${inv}`);
        }
    }
    console.log(`Diagnostic Complete. Max Drift: ${maxDrift.toExponential(4)}`);
}
check().catch(console.error);
