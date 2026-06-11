/**
 * LatticeService implements SynapticLattice v3 (Kinetic Resonance) in JavaScript.
 * Tracks geopolitical "Atoms" and their "Bonds" to determine market regime and shock probability.
 */

class Atom {
    constructor(name, vs, role = 'Anchor', tau = 1.0) {
        this.name = name;
        this.vs = vs;
        this.role = role;
        this.tau = Math.max(0, Math.min(1.0, tau));
        this.bonds = [];
        this.growthMode = role === 'Threat' ? 'Sigmoid' : 'Decay';
        this.networkEffect = ["CHINA_YUAN_INTL", "SWIFT_ALTERNATIVES", "CBDC_COMPETITION"].includes(name);
    }

    bondTo(other, strength = 1.0) {
        this.bonds.push({ atom: other, strength });
    }

    step(dt = 1.0, k = 0.5) {
        if (this.growthMode === 'Sigmoid') {
            const kEff = this.networkEffect ? k * (1.0 + Math.max(0.0, (this.vs - 5.0) * 0.4)) : k;
            const dvs = kEff * this.vs * (1.0 - this.vs / 10.0) * dt;
            this.vs = Math.min(10.0, this.vs + dvs);
        } else {
            this.vs = Math.max(1.0, this.vs - 0.2 * dt);
        }
        return this.vs;
    }
}

export class LatticeService {
    constructor() {
        this.atoms = {};
        this.initLattice();
        this.snapFired = false;
    }

    initLattice() {
        // Anchors
        const a1 = new Atom("USD_RESERVE_STATUS", 10.0, 'Anchor', 0.85);
        const a2 = new Atom("US_DEBT_LIQUIDITY", 9.0, 'Anchor', 0.80);
        const a8 = new Atom("FED_CREDIBILITY", 7.0, 'Anchor', 0.65);
        const a9 = new Atom("EURODOLLAR_SYSTEM", 9.0, 'Anchor', 0.90);

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
        a1.bondTo(a2, 0.90); a1.bondTo(a8, 0.70); a1.bondTo(a9, 0.60);
        a2.bondTo(a12, 0.80); a8.bondTo(a12, 0.55);
        a4.bondTo(a1, 0.80); a3.bondTo(a4, 0.70);
        a5.bondTo(a4, 0.85); a5.bondTo(a6, 0.60);
        a6.bondTo(a7, 0.75); a7.bondTo(a3, 0.65);
        a10.bondTo(a3, 0.50); a11.bondTo(a7, 0.70);
        a12.bondTo(a5, 0.40);

        [a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12].forEach(a => {
            this.atoms[a.name] = a;
        });

        this.tKeys = ["BRICS_COMMODITY_PEG", "PETRO_DOLLAR_FRICTION", "US_SANCTIONS_USE", "CHINA_YUAN_INTL", "SWIFT_ALTERNATIVES", "GOLD_RESERVE_SHIFT", "CBDC_COMPETITION"];
        this.aKeys = ["USD_RESERVE_STATUS", "US_DEBT_LIQUIDITY", "FED_CREDIBILITY", "EURODOLLAR_SYSTEM"];
    }

    getRegimeProb() {
        const t = this.tKeys.reduce((acc, k) => acc + this.atoms[k].vs, 0) / this.tKeys.length;
        const a = this.aKeys.reduce((acc, k) => acc + this.atoms[k].vs, 0) / this.aKeys.length;
        const prob = 1.0 / (1.0 + Math.exp(-0.5 * (t - a)));
        return { prob, t, a };
    }

    step(dt = 1.0, k = 0.5) {
        const { prob } = this.getRegimeProb();

        // Step all atoms
        Object.values(this.atoms).forEach(atom => atom.step(dt, k));

        // Reflexivity: P > 0.40 -> anchors erode
        if (prob > 0.40) {
            const rm = 1.0 + (prob - 0.40);
            this.aKeys.forEach(k => {
                this.atoms[k].vs = Math.max(1.0, this.atoms[k].vs / rm);
            });
        }

        // Liquidity Snap: P > 0.45 -> snap US_DEBT_LIQUIDITY
        let snapEvent = false;
        if (prob > 0.45 && !this.snapFired) {
            if (this.atoms["US_DEBT_LIQUIDITY"].vs > 4.0) {
                this.atoms["US_DEBT_LIQUIDITY"].vs = 4.0;
                this.snapFired = true;
                snapEvent = true;
            }
        }

        return { prob, snapEvent };
    }

    getMarketDynamics() {
        const { prob } = this.getRegimeProb();
        let regime = 'Stable';
        if (prob > 0.6) regime = 'Crisis';
        else if (prob > 0.4) regime = 'Volatile';
        else if (prob > 0.2) regime = 'Recovery';

        return {
            regime,
            shockProb: prob,
            vix: 15 + (prob * 40),
            interestRate: 5 + (prob * 5)
        };
    }
}
