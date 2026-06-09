export class TreasuryBridge {
    constructor(engine) {
        this.engine = engine;
        this.fxSpread = 0.002;
    }

    /**
     * Executes control actions [borrow, paydown, swap].
     */
    execute(actions) {
        const [borrow, paydown, swapUsdToEur] = actions;
        let logs = [];

        if (borrow > 0.1) {
            this.engine.post(0, 4, borrow);
            logs.push({ action: 'BORROW', amount: borrow.toFixed(2) });
        }

        if (paydown > 0.1) {
            this.engine.post(4, 0, paydown);
            logs.push({ action: 'PAYDOWN', amount: paydown.toFixed(2) });
        }

        if (swapUsdToEur > 0.1) {
            const actualUsdSwap = Math.min(swapUsdToEur, this.engine.state[0] / (1 + this.fxSpread));

            // Spread Loss (Debit Eq, Credit USD_Cash)
            const spreadLoss = actualUsdSwap * this.fxSpread;
            this.engine.post(5, 0, spreadLoss);

            // Swap Execution (Debit EUR_Cash, Credit USD_Cash)
            this.engine.post(1, 0, actualUsdSwap / this.engine.fxRate);

            logs.push({ action: 'SWAP', amount: actualUsdSwap.toFixed(2) });
        }

        return logs;
    }
}
