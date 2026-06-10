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
        if (typeof window === 'undefined') {
            // Node.js
            try {
                const { readFileSync } = await import('fs');
                const raw = readFileSync(path, 'utf8');
                const data = JSON.parse(raw);
                return new DataService(data);
            } catch (e) {
                console.error('Failed to load data from file:', e);
                return new DataService();
            }
        } else {
            // Browser
            try {
                const response = await fetch(path);
                const data = await response.json();
                return new DataService(data);
            } catch (e) {
                console.error('Failed to load data from fetch:', e);
                return new DataService();
            }
        }
    }
}
