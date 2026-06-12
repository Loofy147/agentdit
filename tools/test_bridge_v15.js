import { PacioliEngine } from '../src/engine/pacioli.js';
import { GovernanceService } from '../src/services/governanceService.js';
import { SettlementService } from '../src/services/settlementService.js';
import { TreasuryBridge } from '../src/services/treasuryBridge.js';

const engine = new PacioliEngine();
const gov = new GovernanceService();
const set = new SettlementService();
const bridge = new TreasuryBridge(engine, gov, set);

console.log('Proposing debt expansion...');
bridge.propose([0.5, 0, 0], { alpha: 0.1, shockProb: 0.1 });

console.log('Bridge Step 1...');
bridge.step();
set.step();

console.log('Bridge Step 2...');
bridge.step();
set.step();

console.log('Logs:', bridge.getLogs().map(l => l.msg));
console.log('Engine Liab:', engine.state[4]);
