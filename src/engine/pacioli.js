/**
 * PacioliEngineV16 implements the 8-account state for the Global Hydraulic Grid.
 */
export class PacioliEngine {
    constructor() {
        // [0: USD_Cash, 1: EUR_Cash, 2: MMF_USD, 3: AR_USD, 4: Liab_USD, 5: Eq, 6: FX_Reval_Adj, 7: Int_Accrual_Liab]
        this.state = new Float64Array([1500.0, 500.0, 1000.0, 700.0, 1500.0, 2200.0, 0.0, 0.0]);

        this.types = new Float64Array([1, 1, 1, 1, -1, -1, -1, -1]);
        this.debitMask = this.types.map(t => t === 1 ? 1.0 : -1.0);
        this.creditMask = this.types.map(t => t === -1 ? 1.0 : -1.0);
        this.fxRate = 1.08;
    }

    post(drAccount, crAccount, amount) {
        if (amount <= 0 || isNaN(amount)) return;
        this.state[drAccount] += this.debitMask[drAccount] * amount;
        this.state[crAccount] += this.creditMask[crAccount] * amount;
    }

    revalueFX(newRate) {
        const oldVal = this.state[1] * this.fxRate;
        const newVal = this.state[1] * newRate;
        const diff = newVal - oldVal;
        this.state[6] += diff;
        this.state[5] += diff;
        this.fxRate = newRate;
    }

    getLeverage() {
        const liabs = this.state[4] + this.state[7];
        const equity = this.state[5] + this.state[6];
        return liabs / (Math.abs(equity) + 1e-9);
    }

    getInvariant() {
        const assets = this.state[0] + (this.state[1] * this.fxRate) + this.state[2] + this.state[3];
        const liabEq = this.state[4] + this.state[5] + this.state[6] + this.state[7];
        return assets - liabEq;
    }

    getState() {
        return {
            usdCash: this.state[0],
            eurCash: this.state[1],
            mmf: this.state[2],
            ar: this.state[3],
            liabilities: this.state[4],
            equity: this.state[5],
            fxRevalAdj: this.state[6],
            intAccrual: this.state[7],
            totalAssetsUsd: this.state[0] + (this.state[1] * this.fxRate) + this.state[2] + this.state[3],
            leverage: this.getLeverage(),
            fxRate: this.fxRate
        };
    }
}
