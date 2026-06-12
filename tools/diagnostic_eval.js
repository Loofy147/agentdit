import { PacioliEngine } from '../src/engine/pacioli.js';
import { SACController } from '../src/engine/sacController.js';
import { TaskGenerator } from '../src/services/taskGenerator.js';
import fs from 'fs';

async function diagnose() {
    console.log('--- Agent State Diagnostic ---');
    const generator = new TaskGenerator('./public_market_data.json');
    const tasks = await generator.generateTasks();

    let hw = JSON.parse(fs.readFileSync('./hero_v17_real_weights.json', 'utf8'));
    let sw = JSON.parse(fs.readFileSync('./sla_s_weights.json', 'utf8'));
    const hero = new SACController(17, 3, 64, new Float64Array(hw), new Float64Array(sw));

    const engine = new PacioliEngine();
    console.log('Initial Equity:', engine.state[5]);

    for(let t=0; t<24; t++) {
        const market = tasks[0].data[t];
        const state = new Float64Array(17);
        state.set(engine.state);
        state[10] = market.shockProb;
        state[11] = Math.min(1.0, (market.vix || 15) / 50);
        state[12] = Math.min(1.0, (market.recessionProb || 10) / 100);
        state[13] = Math.min(1.0, (market.interestRate || 5) / 10);
        state[14] = market.companies?.techCorp?.prob || 0;
        state[15] = market.companies?.energyPlus?.prob || 0;
        state[16] = market.companies?.retailGlobal?.prob || 0;

        const { actions, steActive, alpha } = hero.samplePhaseShifted(state, 0.15);

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

        if (steActive) {
            console.log(`Step ${t}: PHASE-SHIFT ACTIVE (α=${alpha.toFixed(2)})`);
        }

        if (t === 23) {
            console.log('Final State Vector:', engine.state);
            console.log('Final Net Worth (Eq + FX_Adj):', (engine.state[5] + engine.state[6]).toFixed(2));
            console.log('Final Leverage:', engine.getLeverage().toFixed(2));
        }
    }
}
diagnose().catch(console.error);
