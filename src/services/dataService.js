/**
 * DataService handles market data ingestion for both Node.js and Browser environments.
 */
export class DataService {
    constructor(data = []) {
        this.data = data;
        this.cursor = 0;
    }

    getNext() {
        if (this.data.length === 0) return null;
        const item = this.data[this.cursor % this.data.length];
        this.cursor++;
        return item;
    }

    getForecast(horizon) {
        const forecast = [];
        if (this.data.length === 0) return forecast;
        for (let i = 0; i < horizon; i++) {
            const item = this.data[(this.cursor + i) % this.data.length];
            forecast.push(item);
        }
        return forecast;
    }

    static async load(path) {
        if (typeof window === 'undefined' && typeof process !== 'undefined') {
            // Node.js Environment: Use dynamic import for 'fs'
            try {
                const fs = await import('fs');
                const raw = fs.readFileSync(path, 'utf8');
                const data = JSON.parse(raw);
                return new DataService(data);
            } catch (e) {
                console.error('DataService (Node): Failed to load data:', e);
                return new DataService();
            }
        } else {
            // Browser Environment: Use fetch
            try {
                const response = await fetch(path);
                const data = await response.json();
                return new DataService(data);
            } catch (e) {
                console.error('DataService (Browser): Failed to load data:', e);
                return new DataService();
            }
        }
    }
}
