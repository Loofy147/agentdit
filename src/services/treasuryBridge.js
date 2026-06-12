/**
 * TreasuryBridge v2.1 - Enhanced for Dynamic Settlement constraints.
 */
export class TreasuryBridge {
    constructor(engine, governance, settlement) {
        this.engine = engine;
        this.governance = governance;
        this.settlement = settlement;
        this.logs = [];
    }

    propose(actions, metadata) {
        const [debt, fx, invest] = actions;
        if (Math.abs(debt) > 0.1) this.proposeAction({ type: debt > 0 ? 'BORROW' : 'REPAY', amount: Math.abs(debt) * 300, dr: debt > 0 ? 0 : 4, cr: debt > 0 ? 4 : 0 }, metadata);
        if (Math.abs(fx) > 0.1) this.proposeAction({ type: fx > 0 ? 'FX_BUY' : 'FX_SELL', amount: Math.abs(fx) * 200, dr: fx > 0 ? 1 : 0, cr: fx > 0 ? 0 : 1 }, metadata);
        if (Math.abs(invest) > 0.1) this.proposeAction({ type: invest > 0 ? 'INVEST' : 'DIVEST', amount: Math.abs(invest) * 500, dr: invest > 0 ? 2 : 0, cr: invest > 0 ? 0 : 2 }, metadata);
    }

    proposeAction(action, metadata) {
        const result = this.governance.propose(action, metadata);
        if (result.status === 'LOCKED') {
            this.logs.unshift({ ts: Date.now(), msg: `TX ${result.tx.id} LOCKED (Time-lock: 2 steps)`, type: 'SYSTEM' });
        } else if (result.status === 'REJECTED') {
            this.logs.unshift({ ts: Date.now(), msg: `ACTION REJECTED: ${result.reason}`, type: 'ERROR' });
        }
    }

    step(marketState = {}) {
        const finalizedTXs = this.governance.step();
        finalizedTXs.forEach(tx => {
            const { type, amount, dr, cr } = tx.action;
            const rail = (amount > 500 || marketState.regime === 'Crisis') ? 'SWIFT' : 'L2';

            this.settlement.dispatch(rail, amount, (req) => {
                this.engine.post(dr, cr, req.amount);
                this.engine.post(5, 0, req.fee);
                this.logs.unshift({ ts: Date.now(), msg: `TX ${tx.id} SETTLED (${req.type}). Fee: $${req.fee.toFixed(2)}`, type: 'SUCCESS' });
            }, marketState);
        });
        if (this.logs.length > 20) this.logs.pop();
    }

    getLogs() { return this.logs; }
}
