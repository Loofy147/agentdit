/**
 * PacioliEngineV16 implements the multi-asset state for the Global Hydraulic Grid.
 */
export class PacioliEngine {
    // [0: USD_Cash, 1: EUR_Cash, 2: MMF_USD, 3: AR_USD, 4: Liab_USD, 5: Eq, 6: FX_Reval_Adj, 7: Int_Accrual_Liab, 8: JPY_Cash, 9: GBP_Cash]
    static INITIAL_STATE = new Float64Array([1500.0, 500.0, 1000.0, 700.0, 1500.0, 0, 0.0, 0.0, 14000.0, 400.0]);
    static DEBIT_MASK = new Float64Array([1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0]);
    static CREDIT_MASK = new Float64Array([-1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0]);

    constructor() {
        this.state = new Float64Array(PacioliEngine.INITIAL_STATE);
        this.fxRates = { eur: 0.91, jpy: 145.0, gbp: 0.79 };

        // Balance Equity at initialization
        const assets = this.state[0] + (this.state[1] / this.fxRates.eur) + this.state[2] + this.state[3] + (this.state[8] / this.fxRates.jpy) + (this.state[9] / this.fxRates.gbp);
        this.state[5] = assets - this.state[4];
    }

    post(drAccount, crAccount, amount) {
        if (amount <= 0 || isNaN(amount)) return;

        let drAmt = amount;
        let crAmt = amount;

        if (drAccount === 1) drAmt = amount * this.fxRates.eur;
        if (crAccount === 1) crAmt = amount * this.fxRates.eur;
        if (drAccount === 8) drAmt = amount * this.fxRates.jpy;
        if (crAccount === 8) crAmt = amount * this.fxRates.jpy;
        if (drAccount === 9) drAmt = amount * this.fxRates.gbp;
        if (crAccount === 9) crAmt = amount * this.fxRates.gbp;

        this.state[drAccount] += PacioliEngine.DEBIT_MASK[drAccount] * drAmt;
        this.state[crAccount] += PacioliEngine.CREDIT_MASK[crAccount] * crAmt;
    }

    revalueFX(newRates) {
        const oldTotal = (this.state[1] / this.fxRates.eur) + (this.state[8] / this.fxRates.jpy) + (this.state[9] / this.fxRates.gbp);
        const newTotal = (this.state[1] / newRates.eur) + (this.state[8] / newRates.jpy) + (this.state[9] / newRates.gbp);

        this.state[6] += (newTotal - oldTotal);
        this.fxRates = { ...newRates };
    }

    accrueInterest(marketRate) {
        const principal = this.state[4];
        const dailyRate = (marketRate / 100) / 365;
        const interest = principal * dailyRate;
        if (interest > 0) {
            this.post(5, 7, interest);
        }
    }

    getLeverage() {
        const liabs = this.state[4] + this.state[7];
        const equity = this.state[5] + this.state[6];
        return liabs / (Math.abs(equity) + 1e-9);
    }

    getInvariant() {
        const assets = this.state[0] + (this.state[1] / this.fxRates.eur) + this.state[2] + this.state[3] + (this.state[8] / this.fxRates.jpy) + (this.state[9] / this.fxRates.gbp);
        const liabEq = this.state[4] + this.state[5] + this.state[6] + this.state[7];
        return assets - liabEq;
    }

    getState() {
        return {
            usdCash: this.state[0],
            eurCash: this.state[1],
            jpyCash: this.state[8],
            gbpCash: this.state[9],
            mmf: this.state[2],
            liabilities: this.state[4],
            equity: this.state[5],
            fxRevalAdj: this.state[6],
            intAccrual: this.state[7],
            totalAssetsUsd: this.state[0] + (this.state[1] / this.fxRates.eur) + this.state[2] + this.state[3] + (this.state[8] / this.fxRates.jpy) + (this.state[9] / this.fxRates.gbp),
            leverage: this.getLeverage(),
            fxRates: this.fxRates
        };
    }
}
