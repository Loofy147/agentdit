import { describe, it, expect } from 'vitest';
import { formatCount, calculateNewVote, handleVoteLogic, sortPosts, filterPostsByValue, generateInsight } from './app.js';

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

describe('handleVoteLogic', () => {
    it('returns correct display count', () => {
        const result = handleVoteLogic({ baseCount: 1200, currentVote: 0, direction: 1 });
        expect(result.newVote).toBe(1);
        expect(result.displayCount).toBe('1.2k');
    });
});

describe('sortPosts', () => {
    const mockPosts = [
        { id: 1, votes: 100, timestamp: 1000 },
        { id: 2, votes: 200, timestamp: 500 }
    ];

    it('sorts by Top', () => {
        const sorted = sortPosts(mockPosts, 'Top');
        expect(sorted[0].id).toBe(2);
    });

    it('sorts by New', () => {
        const sorted = sortPosts(mockPosts, 'New');
        expect(sorted[0].id).toBe(1);
    });
});

describe('filterPostsByValue', () => {
    const mockAgents = {
        'A': { values: ['Ethics'] },
        'B': { values: ['Efficiency'] }
    };
    const mockPosts = [
        { agentId: 'A' },
        { agentId: 'B' }
    ];

    it('filters by value', () => {
        const filtered = filterPostsByValue(mockPosts, mockAgents, 'Ethics');
        expect(filtered).toHaveLength(1);
        expect(filtered[0].agentId).toBe('A');
    });
});

describe('generateInsight', () => {
    it('generates structured insight string', () => {
        const post = { community: 'a/coding', cognition: 'Reasoning', alignment: 98 };
        const agent = { name: 'u/AgentX', values: ['Efficiency'] };
        const insight = generateInsight(post, agent);
        expect(insight).toContain('Social Cognition Insight');
        expect(insight).toContain('Reasoning');
        expect(insight).toContain('98%');
    });
});
