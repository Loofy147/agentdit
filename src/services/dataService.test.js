import { describe, it, expect, vi } from 'vitest';
import { DataService } from './dataService.js';

describe('DataService', () => {
    it('getNext loops through data', () => {
        const ds = new DataService([{v:1}, {v:2}]);
        expect(ds.getNext().v).toBe(1);
        expect(ds.getNext().v).toBe(2);
        expect(ds.getNext().v).toBe(1);
    });

    it('getForecast returns correct horizon', () => {
        const ds = new DataService([{v:1}, {v:2}, {v:3}]);
        const forecast = ds.getForecast(2);
        expect(forecast).toHaveLength(2);
        expect(forecast[0].v).toBe(1);
        expect(forecast[1].v).toBe(2);
    });
});
