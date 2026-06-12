/**
 * MacroService (Layer 9-13) tracks global economic vitals.
 * Simulates CPI, GDP, NFP, and Monetary Policy dynamics.
 */
export class MacroService {
    constructor() {
        this.vitals = {
            inflation: { cpi: 3.2, coreCpi: 3.4, pce: 2.8, expectations: 2.5 },
            labor: { nfp: 220000, unemployment: 3.8, ahe: 4.1 },
            growth: { gdp: 2.4, pmi: 51.5, retailSales: 0.3 },
            monetary: { ffr: 5.25, qt: true, realYield: 2.1 },
            market: { dxy: 104.2, ust10y: 4.3, curve: -0.2, sentiment: 'Risk-On' }
        };
    }

    step(regime, shockProb) {
        // Evolve Inflation
        const targetInflation = regime === 'Crisis' ? 5.0 : (regime === 'Volatile' ? 4.0 : 2.0);
        this.vitals.inflation.cpi += (targetInflation - this.vitals.inflation.cpi) * 0.1 + (Math.random() - 0.5) * 0.2;

        // Evolve Labor (NFP)
        const baseNfp = regime === 'Stable' ? 200000 : (regime === 'Crisis' ? -50000 : 100000);
        this.vitals.labor.nfp = Math.round(baseNfp + (Math.random() - 0.5) * 50000);
        this.vitals.labor.unemployment += (regime === 'Crisis' ? 0.2 : -0.05) + (Math.random() - 0.5) * 0.1;
        this.vitals.labor.unemployment = Math.max(3.4, Math.min(10.0, this.vitals.labor.unemployment));

        // Evolve Monetary Policy (FFR follows CPI with lag)
        if (this.vitals.inflation.cpi > 3.0) {
            this.vitals.monetary.ffr += 0.25;
        } else if (this.vitals.inflation.cpi < 2.0) {
            this.vitals.monetary.ffr -= 0.25;
        }
        this.vitals.monetary.ffr = Math.max(0.0, Math.min(6.5, this.vitals.monetary.ffr));

        // Market Dynamics
        this.vitals.market.ust10y = this.vitals.monetary.ffr - (shockProb * 2.0) + (Math.random() - 0.5) * 0.2;
        this.vitals.market.curve = this.vitals.market.ust10y - this.vitals.monetary.ffr;
        this.vitals.monetary.realYield = this.vitals.market.ust10y - this.vitals.inflation.expectations;

        this.vitals.market.sentiment = shockProb > 0.4 ? 'Risk-Off' : 'Risk-On';
        this.vitals.market.dxy += (this.vitals.market.sentiment === 'Risk-Off' ? 0.5 : -0.2);

        return this.vitals;
    }

    getNormalizedSignals() {
        return {
            cpi: Math.min(1.0, this.vitals.inflation.cpi / 10),
            nfp: Math.max(0.0, Math.min(1.0, (this.vitals.labor.nfp + 100000) / 500000)),
            ffr: this.vitals.monetary.ffr / 10,
            realYield: (this.vitals.monetary.realYield + 2) / 10,
            curve: (this.vitals.market.curve + 2) / 4
        };
    }
}
