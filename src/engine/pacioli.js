/**
 * PacioliEngineV12 implements Layer 12: Credit-Default Integration with Multi-Currency.
 * It uses an 8-account state vector with dynamic leverage tracking and FX revaluation.
 */
export class PacioliEngine {
    constructor() {
        // [0: USD_Cash, 1: EUR_Cash, 2: MMF_USD, 3: AR_USD, 4: Liab_USD, 5: Eq, 6: FX_Reval_Adj, 7: Int_Accrual_Liab]
        this.state = new Float64Array([1500.0, 500.0, 1000.0, 700.0, 1500.0, 2200.0, 0.0, 0.0]);

        // Account Types: 1 for Debit-normal (Assets), -1 for Credit-normal (Liab/Eq)
        this.types = new Float64Array([1, 1, 1, 1, -1, -1, -1, -1]);

        this.debitMask = this.types.map(t => t === 1 ? 1.0 : -1.0);
        this.creditMask = this.types.map(t => t === -1 ? 1.0 : -1.0);
        this.fxRate = 1.08; // USD per 1 EUR
    }

    /**
     * post executes a double-entry transaction.
     */
    post(drAccount, crAccount, amount) {
        if (amount <= 0 || isNaN(amount)) return;

        this.state[drAccount] += this.debitMask[drAccount] * amount;
        this.state[crAccount] += this.creditMask[crAccount] * amount;
    }

    /**
     * revalueFX adjusts the USD equivalent of EUR_Cash due to FX rate changes.
     */
    revalueFX(newRate) {
        const oldValEurUsd = this.state[1] * this.fxRate;
        const newValEurUsd = this.state[1] * newRate;
        const diff = newValEurUsd - oldValEurUsd;

        this.state[6] += diff; // FX_Reval_Adj (Credit-normal, Eq-like)
        this.state[5] += diff; // Equity directly affected
        this.fxRate = newRate;
    }

    /**
     * getLeverage returns the ratio of Liabilities to Equity.
     */
    getLeverage() {
        const liabs = this.state[4] + this.state[7]; // Liab_USD + Int_Accrual_Liab
        const equity = this.state[5] + this.state[6]; // Eq + FX_Reval_Adj
        return liabs / (Math.abs(equity) + 1e-9);
    }

    /**
     * getInvariant ensures the balance sheet closes.
     * Assets (USD) - (Liabilities + Equity) (USD) = 0
     */
    getInvariant() {
        const assetsUsd = this.state[0] + (this.state[1] * this.fxRate) + this.state[2] + this.state[3];
        const liabEqUsd = this.state[4] + this.state[5] + this.state[6] + this.state[7];
        return assetsUsd - liabEqUsd;
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
