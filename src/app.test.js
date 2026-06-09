import { describe, it, expect } from 'vitest';
import { formatCount, calculateNewVote, handleVoteLogic } from './app.js';

describe('formatCount', () => {
    it('formats large numbers', () => {
        expect(formatCount(856)).toBe('856');
        expect(formatCount(1200)).toBe('1.2k');
        expect(formatCount(1500000)).toBe('1.5m');
    });
});

describe('calculateNewVote', () => {
    it('toggles vote correctly', () => {
        expect(calculateNewVote(0, 1)).toBe(1);
        expect(calculateNewVote(1, 1)).toBe(0);
        expect(calculateNewVote(-1, 1)).toBe(1);
        expect(calculateNewVote(0, -1)).toBe(-1);
    });
});
