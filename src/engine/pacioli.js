/**
 * PacioliEngineV16 implements the 8-account state for the Global Hydraulic Grid.
 * Optimized for frequent instantiation using static shared masks.
 */
export class PacioliEngine {
    // Static shared constants to avoid re-allocation and re-calculation on every new instance
    static INITIAL_STATE = new Float64Array([1500.0, 500.0, 1000.0, 700.0, 1500.0, 2240.0, 0.0, 0.0]);
    static TYPES = new Float64Array([1, 1, 1, 1, -1, -1, -1, -1]);
    static DEBIT_MASK = new Float64Array([1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0]);
    static CREDIT_MASK = new Float64Array([-1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0]);

    constructor() {
        // [0: USD_Cash, 1: EUR_Cash, 2: MMF_USD, 3: AR_USD, 4: Liab_USD, 5: Eq, 6: FX_Reval_Adj, 7: Int_Accrual_Liab]
        // Assets: 1500 + 500*1.08 + 1000 + 700 = 3740
        // Liab+Eq: 1500 + 2240 + 0 + 0 = 3740
        this.state = new Float64Array(PacioliEngine.INITIAL_STATE);
        this.fxRate = 1.08;
    }

    /**
     * Executes a double-entry post between two accounts.
     * @param {number} drAccount Debit Account Index
     * @param {number} crAccount Credit Account Index
     * @param {number} amount Amount in base currency (USD) unless one account is EUR
     */
    post(drAccount, crAccount, amount) {
        if (amount <= 0 || isNaN(amount)) return;

        let drAmt = amount;
        let crAmt = amount;

        // Multi-currency handling: If the account is EUR (index 1), convert the USD amount.
        if (drAccount === 1) drAmt = amount / this.fxRate;
        if (crAccount === 1) crAmt = amount / this.fxRate;

        this.state[drAccount] += PacioliEngine.DEBIT_MASK[drAccount] * drAmt;
        this.state[crAccount] += PacioliEngine.CREDIT_MASK[crAccount] * crAmt;
    }

    revalueFX(newRate) {
        const oldVal = this.state[1] * this.fxRate;
        const newVal = this.state[1] * newRate;
        const diff = newVal - oldVal;

        // Asset changed by diff, Equity must change by diff
        this.state[6] += diff;
        this.fxRate = newRate;
    }

    /**
     * Accrues interest on liabilities.
     * @param {number} marketRate Annual percentage rate (e.g., 5.38)
     */
    accrueInterest(marketRate) {
        const principal = this.state[4]; // Liab_USD
        const dailyRate = (marketRate / 100) / 365;
        const interest = principal * dailyRate;

        if (interest > 0) {
            this.post(5, 7, interest); // Dr Eq (5), Cr Int_Accrual_Liab (7)
        }
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
