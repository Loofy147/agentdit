/**
 * SettlementService v2.0 - Implements Dynamic Latency and Congestion.
 */
export class SettlementService {
    constructor() {
        this.queue = [];
        this.completedCount = 0;
        this.feesPaid = 0;
        this.congestion = 1.0; // 1.0 = Base multiplier
    }

    dispatch(type, amount, onFinalize, marketState = {}) {
        const id = 'TX' + Math.random().toString(36).substr(2, 6).toUpperCase();

        // Dynamic Congestion: increased during Crisis or high Shock
        this.congestion = marketState.regime === 'Crisis' ? 2.5 : (marketState.shockProb > 0.4 ? 1.5 : 1.0);

        const baseFee = type === 'L2' ? amount * 0.0005 : amount * 0.005;
        const fee = baseFee * this.congestion;

        // Dynamic Latency: SWIFT takes longer during Crisis
        let latency = type === 'L2' ? 0 : 3;
        if (type === 'SWIFT' && marketState.regime === 'Crisis') latency += 2;

        const request = { id, type, amount, fee, onFinalize, stepsRemaining: latency, status: latency === 0 ? 'Finalized' : 'Pending' };

        if (latency === 0) {
            this.finalize(request);
        } else {
            this.queue.push(request);
        }
        return request;
    }

    step() {
        const finished = [];
        this.queue.forEach(req => {
            req.stepsRemaining--;
            if (req.stepsRemaining <= 0) {
                req.status = 'Finalized';
                finished.push(req);
            }
        });
        finished.forEach(req => {
            this.finalize(req);
            this.queue = this.queue.filter(r => r.id !== req.id);
        });
        return finished;
    }

    finalize(request) {
        this.completedCount++;
        this.feesPaid += request.fee;
        if (request.onFinalize) request.onFinalize(request);
    }

    getStats() {
        return { pending: this.queue.length, completed: this.completedCount, totalFees: this.feesPaid.toFixed(2), congestion: this.congestion.toFixed(1) };
    }
}
