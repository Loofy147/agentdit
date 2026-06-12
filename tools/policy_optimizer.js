import { LatticeService } from '../src/services/latticeService.js';

function optimize() {
    console.log('--- Geopolitical Intervention Optimizer ---');
    const baseLattice = new LatticeService();
    const targetQ = 8;

    const anchors = ["USD_RESERVE_STATUS", "US_DEBT_LIQUIDITY", "FED_CREDIBILITY", "EURODOLLAR_SYSTEM"];

    const recommendations = anchors.map(name => {
        let dvs = 0.5;
        let delay = 0;

        // Simple test: if we add +1.0 VS, how much does it delay crossover?
        const simulateIntervention = (boost) => {
            const lattice = new LatticeService();
            lattice.atoms[name].vs = Math.min(10.0, lattice.atoms[name].vs + boost);
            let crossover = 12;
            for (let t = 0; t < 12; t++) {
                const { prob } = lattice.step();
                if (prob >= 0.5) { crossover = t; break; }
            }
            return crossover;
        };

        const baseCrossover = simulateIntervention(0);
        const boostedCrossover = simulateIntervention(1.5);

        return {
            atom: name,
            efficiency: (boostedCrossover - baseCrossover) / 1.5,
            delay: boostedCrossover - baseCrossover,
            recommendation: `Add +1.5 VS to ${name} to delay crossover by ${boostedCrossover - baseCrossover} quarters.`
        };
    });

    recommendations.sort((a, b) => b.efficiency - a.efficiency);
    recommendations.forEach(r => console.log(r.recommendation));
}

optimize();
