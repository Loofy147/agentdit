/**
 * SettlementService (Layer 17) manages multi-protocol transaction finality.
 * Handles L2 (Instant) and SWIFT (Delayed) settlement rails.
 */
export class SettlementService {
    constructor() {
        this.queue = [];
        this.completedCount = 0;
        this.feesPaid = 0;
    }

    /**
     * Dispatches a settlement request.
     * @param {string} type - 'L2' or 'SWIFT'
     * @param {number} amount - Amount to settle
     * @param {Function} onFinalize - Callback when transaction is finalized
     */
    dispatch(type, amount, onFinalize) {
        const id = Math.random().toString(36).substr(2, 9);
        const fee = type === 'L2' ? amount * 0.0005 : amount * 0.005;
        const latency = type === 'L2' ? 0 : 3; // 3 steps for SWIFT

        const request = {
            id,
            type,
            amount,
            fee,
            onFinalize,
            stepsRemaining: latency,
            status: latency === 0 ? 'Finalized' : 'Pending'
        };

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
        return {
            pending: this.queue.length,
            completed: this.completedCount,
            totalFees: this.feesPaid.toFixed(2)
        };
    }
}
