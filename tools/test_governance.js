import { GovernanceService } from '../src/services/governanceService.js';

const gs = new GovernanceService();

console.log('Proposing normal TX...');
const res1 = gs.propose({ type: 'BORROW', amount: 1000 }, { alpha: 0.1, shockProb: 0.2 });
console.log('Result 1:', res1.status, res1.tx?.id);

console.log('Proposing crisis TX (High Shock)...');
const res2 = gs.propose({ type: 'BORROW', amount: 1000 }, { alpha: 0.1, shockProb: 0.9 });
console.log('Result 2:', res2.status, res2.reason);

console.log('Mempool size:', gs.mempool.length);
gs.step();
console.log('Finalizing TX after 2 steps...');
const finalized = gs.step();
console.log('Finalized TXs:', finalized.length);
console.log('Stats:', gs.getStats());
