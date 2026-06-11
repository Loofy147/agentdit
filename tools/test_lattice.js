import { LatticeService } from '../src/services/latticeService.js';

const lattice = new LatticeService();
console.log('--- Lattice Initial State ---');
console.log(lattice.getMarketDynamics());

for (let i = 0; i < 5; i++) {
    const status = lattice.step(1.0, 0.5);
    console.log(`Step ${i+1}: Prob=${status.prob.toFixed(4)} Snap=${status.snapEvent}`);
    console.log(lattice.getMarketDynamics());
}
