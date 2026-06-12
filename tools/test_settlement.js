import { SettlementService } from '../src/services/settlementService.js';

const ss = new SettlementService();

console.log('Dispatching L2...');
ss.dispatch('L2', 1000, (req) => console.log(`Finalized ${req.id} (${req.type})`));

console.log('Dispatching SWIFT...');
ss.dispatch('SWIFT', 5000, (req) => console.log(`Finalized ${req.id} (${req.type})`));

console.log('Queue:', ss.queue.length);
ss.step();
console.log('Queue after step 1:', ss.queue.length);
ss.step();
ss.step();
console.log('Stats:', ss.getStats());
