/**
 * MacroService v2.0 - Implements QE/QT and Liquidity Dynamics.
 */
export class MacroService {
    constructor() {
        this.vitals = {
            inflation: { cpi: 3.2, pce: 2.8 },
            labor: { nfp: 220000, unemployment: 3.8 },
            monetary: { ffr: 5.25, mode: 'QT', liquidity: 85.0, realYield: 2.1 },
            market: { dxy: 104.2, ust10y: 4.3, curve: -0.2, sentiment: 'Risk-On' }
        };
    }

    step(regime, shockProb) {
        // 1. Inflation Dynamics
        const targetCpi = regime === 'Crisis' ? 5.5 : (regime === 'Volatile' ? 4.0 : 2.0);
        this.vitals.inflation.cpi += (targetCpi - this.vitals.inflation.cpi) * 0.15 + (Math.random() - 0.5) * 0.3;

        // 2. Monetary Policy Decision
        if (this.vitals.inflation.cpi > 4.5 || regime === 'Volatile') {
            this.vitals.monetary.mode = 'QT';
        } else if (regime === 'Crisis' || this.vitals.inflation.cpi < 2.0) {
            this.vitals.monetary.mode = 'QE';
        }

        // 3. FFR & Liquidity Physics
        if (this.vitals.monetary.mode === 'QE') {
            this.vitals.monetary.ffr = Math.max(0.0, this.vitals.monetary.ffr - 0.25);
            this.vitals.monetary.liquidity = Math.min(100.0, this.vitals.monetary.liquidity + 2.0);
            this.vitals.market.ust10y -= 0.1;
        } else {
            this.vitals.monetary.ffr = Math.min(6.5, this.vitals.monetary.ffr + 0.1);
            this.vitals.monetary.liquidity = Math.max(20.0, this.vitals.monetary.liquidity - 1.0);
            this.vitals.market.dxy += 0.2;
        }

        // 4. Yield Curve & Sentiment
        this.vitals.market.ust10y = this.vitals.monetary.ffr + (this.vitals.monetary.mode === 'QE' ? -0.5 : 0.5) + (Math.random() - 0.5) * 0.2;
        this.vitals.market.curve = this.vitals.market.ust10y - this.vitals.monetary.ffr;
        this.vitals.monetary.realYield = this.vitals.market.ust10y - 2.5; // Fixed expectations for simplicity

        this.vitals.market.sentiment = shockProb > 0.45 ? 'Risk-Off' : 'Risk-On';
        if (this.vitals.market.sentiment === 'Risk-Off') this.vitals.market.dxy += 0.5;

        return this.vitals;
    }

    getNormalizedSignals() {
        return {
            cpi: Math.min(1.0, this.vitals.inflation.cpi / 10),
            ffr: this.vitals.monetary.ffr / 10,
            liquidity: this.vitals.monetary.liquidity / 100,
            realYield: (this.vitals.monetary.realYield + 2) / 10,
            curve: (this.vitals.market.curve + 2) / 4
        };
    }
}
