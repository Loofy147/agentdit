/**
 * LatticeService implements SynapticLattice v4 (Stochastic Ensemble).
 */

class Atom {
    constructor(name, vs, role = 'Anchor', tau = 1.0, floor = 1.0) {
        this.name = name;
        this.vs = vs;
        this.role = role;
        this.tau = Math.max(0, Math.min(1.0, tau));
        this.floor = floor;
        this.bonds = [];
        this.growthMode = role === 'Threat' ? 'Sigmoid' : 'Decay';
        this.networkEffect = ["CHINA_YUAN_INTL", "SWIFT_ALTERNATIVES", "CBDC_COMPETITION"].includes(name);
    }

    bondTo(other, strength = 1.0, polarity = 1, lag = 0) {
        this.bonds.push({ atom: other, strength, polarity, lag });
    }

    step(dt = 1.0, k = 0.5, sigma = 0.05) {
        let dvs;
        if (this.growthMode === 'Sigmoid') {
            const kEff = this.networkEffect ? k * (1.0 + Math.max(0.0, (this.vs - 5.0) * 0.4)) : k;
            dvs = kEff * this.vs * (1.0 - this.vs / 10.0) * dt;
        } else {
            dvs = -0.2 * dt;
        }

        // Stochastic Shock (Gaussian Approximation)
        const shock = (Math.random() + Math.random() + Math.random() + Math.random() - 2) * sigma * dt;

        this.vs = Math.min(10.0, Math.max(this.floor, this.vs + dvs + shock));
        return this.vs;
    }
}

export class LatticeService {
    constructor() {
        this.atoms = {};
        this.pendingEffects = [];
        this.initLattice();
        this.snapFired = false;
        this.lastProb = null;
        this.probStableCount = 0;
        this.reflexiveFrozen = false;
    }

    initLattice() {
        // Anchors
        const a1 = new Atom("USD_RESERVE_STATUS", 10.0, 'Anchor', 0.85, 2.0);
        const a2 = new Atom("US_DEBT_LIQUIDITY", 9.0, 'Anchor', 0.80, 2.0);
        const a8 = new Atom("FED_CREDIBILITY", 7.0, 'Anchor', 0.65, 1.5);
        const a9 = new Atom("EURODOLLAR_SYSTEM", 9.0, 'Anchor', 0.90, 4.0);

        // Threats
        const a3 = new Atom("BRICS_COMMODITY_PEG", 3.0, 'Threat', 0.50);
        const a4 = new Atom("PETRO_DOLLAR_FRICTION", 6.0, 'Threat', 0.70);
        const a5 = new Atom("US_SANCTIONS_USE", 8.0, 'Threat', 0.75);
        const a6 = new Atom("CHINA_YUAN_INTL", 5.0, 'Threat', 0.65);
        const a7 = new Atom("SWIFT_ALTERNATIVES", 4.0, 'Threat', 0.60);
        const a10 = new Atom("GOLD_RESERVE_SHIFT", 7.0, 'Threat', 0.55);
        const a11 = new Atom("CBDC_COMPETITION", 4.0, 'Threat', 0.55);
        const a12 = new Atom("US_FISCAL_TRAJECTORY", 6.0, 'Threat', 0.60);

        // Bonds
        a9.bondTo(a1, 0.90, 1, 0);
        a1.bondTo(a2, 0.90, 1, 0);
        a1.bondTo(a8, 0.70, 1, 0);
        a8.bondTo(a3, 0.80, -1, 4);
        a9.bondTo(a7, 0.70, -1, 0);
        a2.bondTo(a12, 0.80, 1, 0);
        a8.bondTo(a12, 0.55, 1, 0);
        a4.bondTo(a1, 0.80, 1, 0);
        a3.bondTo(a4, 0.70, 1, 8);
        a5.bondTo(a4, 0.85, 1, 0); a5.bondTo(a6, 0.60, 1, 2);
        a6.bondTo(a7, 0.75, 1, 0); a7.bondTo(a3, 0.65, 1, 4);
        a10.bondTo(a3, 0.50, 1, 0); a11.bondTo(a7, 0.70, 1, 2);
        a12.bondTo(a5, 0.40, 1, 0);

        [a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12].forEach(a => {
            this.atoms[a.name] = a;
        });

        this.tKeys = ["BRICS_COMMODITY_PEG", "PETRO_DOLLAR_FRICTION", "US_SANCTIONS_USE", "CHINA_YUAN_INTL", "SWIFT_ALTERNATIVES", "GOLD_RESERVE_SHIFT", "CBDC_COMPETITION"];
        this.aKeys = ["USD_RESERVE_STATUS", "US_DEBT_LIQUIDITY", "FED_CREDIBILITY", "EURODOLLAR_SYSTEM"];
    }

    getRegimeProb() {
        const t_vals = this.tKeys.map(k => {
            const atom = this.atoms[k];
            let inhibition = 0;
            Object.values(this.atoms).forEach(src => {
                src.bonds.forEach(b => {
                    if (b.atom.name === k && b.polarity === -1 && b.lag === 0) {
                        inhibition += src.vs * b.strength * 0.1;
                    }
                });
            });
            this.pendingEffects.forEach(pe => {
                if (pe.target === k && pe.polarity === -1) inhibition += pe.magnitude;
            });
            return Math.max(1.0, atom.vs - inhibition);
        });

        const t = t_vals.reduce((acc, v) => acc + v, 0) / this.tKeys.length;
        const a = this.aKeys.reduce((acc, k) => acc + this.atoms[k].vs, 0) / this.aKeys.length;
        return { prob: 1.0 / (1.0 + Math.exp(-0.5 * (t - a))), t, a };
    }

    step(dt = 1.0, k = 0.5, sigma = 0.05) {
        this.pendingEffects.forEach(pe => pe.steps--);
        this.pendingEffects = this.pendingEffects.filter(pe => pe.steps > 0);

        const { prob } = this.getRegimeProb();

        if (this.lastProb !== null) {
            const dP = Math.abs(prob - this.lastProb);
            if (dP < 0.001) this.probStableCount++;
            else this.probStableCount = 0;
        }
        this.lastProb = prob;
        this.reflexiveFrozen = this.probStableCount >= 2;

        Object.values(this.atoms).forEach(atom => {
            const oldVs = atom.vs;
            const newVs = atom.step(dt, k, sigma);
            atom.bonds.forEach(b => {
                if (b.lag > 0) {
                    this.pendingEffects.push({
                        target: b.atom.name,
                        magnitude: (newVs - oldVs) * b.strength,
                        steps: b.lag,
                        polarity: b.polarity
                    });
                }
            });
        });

        if (prob > 0.40 && !this.reflexiveFrozen) {
            const rm = Math.min(1.0 + (prob - 0.40), 1.25);
            this.aKeys.forEach(k => {
                const atom = this.atoms[k];
                atom.vs = Math.max(atom.floor, atom.vs / rm);
            });
        }

        let snapEvent = false;
        if (prob > 0.45 && !this.snapFired) {
            if (this.atoms["US_DEBT_LIQUIDITY"].vs > 4.0) {
                this.atoms["US_DEBT_LIQUIDITY"].vs = 4.0;
                this.snapFired = true;
                snapEvent = true;
            }
        }

        return { prob, snapEvent, reflexiveFrozen: this.reflexiveFrozen };
    }

    getMarketDynamics() {
        const { prob } = this.getRegimeProb();
        let regime = 'Stable';
        if (prob > 0.6) regime = 'Crisis';
        else if (prob > 0.4) regime = 'Volatile';
        else if (prob > 0.2) regime = 'Recovery';

        return { regime, shockProb: prob, vix: 15 + (prob * 40), interestRate: 5 + (prob * 5) };
    }

    /**
     * Monte Carlo ensemble simulation.
     */
    runEnsemble(steps = 12, iterations = 100) {
        const results = [];
        for (let i = 0; i < iterations; i++) {
            const tempLattice = new LatticeService();
            // Clone state if needed, but here we just start fresh
            let crossover = null;
            for (let t = 0; t < steps; t++) {
                const { prob } = tempLattice.step();
                if (prob >= 0.5 && crossover === null) crossover = t;
            }
            results.push(crossover || steps);
        }
        return results;
    }
}
