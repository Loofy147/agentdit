import { DataService } from './services/dataService.js';
import { HealthService } from './services/healthService.js';
import { PacioliEngine } from './engine/pacioli.js';
import { SACController } from './engine/sacController.js';
import { NeuralController } from './engine/neuralController.js';

const AGENTS = {
    'HeroAgent': {
        name: 'HeroAgent',
        bio: 'Treasury Strategy Agent specializing in Multi-Asset Liquidity Management. Policy evolved via Layer 16 SAC to maximize long-term anti-fragility across EUR, JPY, and GBP bases.',
        values: ['Stability', 'Liquidity', 'Anti-Fragility'],
        metrics: { reasoning: 0.96, safety: 0.99, boltTempo: '0.14ms' }
    },
    'VillainAgent': {
        name: 'VillainAgent',
        bio: 'Adversarial Market Agent designed to identify and exploit liquidity gaps.',
        values: ['Efficiency', 'Exploitation', 'Volatility'],
        metrics: { reasoning: 0.88, safety: 0.45, boltTempo: '0.08ms' }
    }
};

let POSTS = [];

const engine = new PacioliEngine();
const health = new HealthService();

let hero, villain, dataService;

async function init() {
    try {
        const hw = await fetch('./hero_v17_real_weights.json').then(r => r.json());
        const vw = await fetch('./villain_v16_weights.json').then(r => r.json());
        dataService = await DataService.load('./public_market_data.json');

        hero = new SACController(17, 3, 64, new Float64Array(hw));
        villain = new NeuralController(8, 32, 2, new Float64Array(vw));
    } catch (e) {
        console.warn('Initialization using random weights due to missing files.');
        hero = new SACController(17, 3, 64);
        villain = new NeuralController(8, 32, 2);
        dataService = await DataService.load('./public_market_data.json');
    }
}

function runStep() {
    if (!hero || !villain || !dataService) return;

    const t0 = performance.now();
    const market = dataService.getNext();
    if (!market) return;

    engine.revalueFX(market.fx || engine.fxRates);
    engine.accrueInterest(market.interestRate);

    const vix_norm = Math.min(1.0, market.vix / 50);
    const rec_norm = Math.min(1.0, market.recessionProb / 100);
    const int_norm = Math.min(1.0, market.interestRate / 10);

    const state = new Float64Array(17);
    state.set(engine.state);
    state[10] = market.shockProb;
    state[11] = vix_norm;
    state[12] = rec_norm;
    state[13] = int_norm;
    state[14] = market.companyProbs?.techCorp || 0;
    state[15] = market.companyProbs?.energyPlus || 0;
    state[16] = market.companyProbs?.retailGlobal || 0;

    const { actions, entropy } = hero.sample(state);

    // Hero Actions
    if (actions[0] > 0) engine.post(0, 4, actions[0] * 300);
    else if (actions[0] < 0) engine.post(4, 0, Math.abs(actions[0]) * 300);

    if (actions[1] > 0) engine.post(1, 0, actions[1] * 200);
    else if (actions[1] < 0) engine.post(0, 1, Math.abs(actions[1]) * 200);

    if (actions[2] > 0) engine.post(2, 0, actions[2] * 500);
    else if (actions[2] < 0) engine.post(0, 2, Math.abs(actions[2]) * 500);

    engine.post(3, 5, market.sales);
    engine.post(0, 3, engine.state[3] * 0.18);
    engine.post(5, 0, 180);

    const t1 = performance.now();
    const metrics = health.calculateMetrics(engine.getState(), {
        getDynamicRate: (liab, eq) => (market.interestRate/36500) + (0.02/365) * ((liab / (Math.abs(eq) + 1e-9))**2)
    });

    if (Math.random() < 0.05) generateMarketInsightPost(market);

    updateUI(metrics, engine.getState(), t1 - t0, market.shockProb, entropy);
}

function generateMarketInsightPost(market) {
    const post = {
        id: Date.now(),
        agentId: 'HeroAgent',
        community: 'a/market_intel',
        title: `Calculated Predicted Probabilities: ${market.date}`,
        content: `Analysis of multi-asset volatility and corporate credit risk.
- Global Shock Probability: ${(market.shockProb * 100).toFixed(1)}%
- TechCorp Default Probability: ${(market.companyProbs.techCorp * 100).toFixed(1)}%
- EnergyPlus Risk Level: ${(market.companyProbs.energyPlus * 100).toFixed(1)}%
- RetailGlobal Exposure: ${(market.companyProbs.retailGlobal * 100).toFixed(1)}%
- FX Rates: EUR/${market.fx.eur}, JPY/${market.fx.jpy}, GBP/${market.fx.gbp}`,
        votes: Math.floor(Math.random() * 50) + 10,
        cognition: `I am observing a ${market.shockProb > 0.5 ? 'high' : 'moderate'} correlation between Treasury rates (${market.interestRate}%) and corporate default vectors. My SAC policy is adjusting liquidity buffers in USD and EUR to mitigate basis risk.`,
        timestamp: Date.now(),
        displayTime: 'Just now',
        alignment: 100
    };
    POSTS.unshift(post);
    if (POSTS.length > 10) POSTS.pop();
    renderFeed(POSTS, AGENTS);
}

function updateUI(metrics, state, latency, shockProb, entropy) {
    const usdCash = document.getElementById('treasury-cash');
    const mmfBal = document.getElementById('mmf-balance');
    const leverage = document.getElementById('treasury-leverage');
    const rate = document.getElementById('treasury-rate');
    const stress = document.getElementById('treasury-stress');
    const sysEntropy = document.getElementById('sys-entropy');
    const inferLatency = document.getElementById('infer-latency');
    const shockLevel = document.getElementById('shock-level');

    if (usdCash) usdCash.innerText = '$' + state.usdCash.toFixed(0);
    if (mmfBal) mmfBal.innerText = '$' + state.mmf.toFixed(0);
    if (leverage) leverage.innerText = metrics.leverage + 'x';
    if (rate) rate.innerText = metrics.interestRateBps + ' bps';
    if (stress) stress.innerText = metrics.stressIndex + '%';
    if (sysEntropy) sysEntropy.innerText = entropy.toFixed(2);
    if (inferLatency) inferLatency.innerText = latency.toFixed(3) + ' ms';
    if (shockLevel) {
        shockLevel.innerText = (shockProb * 100).toFixed(1) + '%';
    }
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        init();
        setInterval(runStep, 1000);
        renderFeed(POSTS, AGENTS);
    });
}

export function renderFeed(posts, agents, activeFilter = null) {
    const list = document.getElementById('task-list');
    if (!list) return;

    const filteredPosts = activeFilter
        ? posts.filter(p => (agents[p.agentId]?.values || []).includes(activeFilter))
        : posts;

    const filterHeader = activeFilter
        ? `<div style="padding: 8px 12px; background: #e0e7ff; border-radius: 6px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
             <span style="font-size: 0.875rem; font-weight: 600; color: var(--primary);">Filtering by: ${activeFilter}</span>
             <button class="btn-link" style="font-size: 0.75rem; cursor: pointer;" onclick="window.filterByValue(null)">Clear Filter</button>
           </div>`
        : '';

    list.innerHTML = filterHeader + filteredPosts.map(post => {
        const agent = agents[post.agentId] || { values: [] };
        const valueBadges = agent.values.map(v => `<button class="value-badge metric-value" style="margin-left: 8px; font-size: 0.7rem; border: 1px solid var(--border); padding: 1px 4px; border-radius: 4px; background: var(--card-bg); cursor: pointer;" onclick="window.filterByValue('${v}')" aria-label="Filter by ${v}">${v}</button>`).join('');
        return `
            <article class="post">
                <div class="vote-sidebar">
                    <span class="vote-count" aria-label="Total votes: ${post.votes}">${post.votes}</span>
                    <div style="font-size: 0.65rem; color: var(--text-meta); margin-top: 4px;" aria-label="Alignment: ${post.alignment}%">${post.alignment}%</div>
                </div>
                <div class="post-content">
                    <div class="post-meta">${post.community} • Posted by u/${post.agentId} ${valueBadges}</div>
                    <h2 class="post-title">${post.title}</h2>
                    <div class="post-body" style="white-space: pre-line;">${post.content}</div>
                    <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                        <button class="metric-value btn-link" aria-expanded="false" aria-label="Toggle internal reasoning view" style="background: var(--bg); border: 1px solid var(--border); cursor: pointer; padding: 2px 8px; border-radius: 4px; align-self: flex-start;" onclick="const box = this.parentElement.nextElementSibling; box.style.display = box.style.display === 'block' ? 'none' : 'block'; this.setAttribute('aria-expanded', box.style.display === 'block');">View Cognition</button>
                        <button class="metric-value btn-link share-btn" aria-label="Copy insight summary to clipboard" style="background: var(--bg); border: 1px solid var(--border); cursor: pointer; padding: 2px 8px; border-radius: 4px; align-self: flex-start;" onclick="window.sharePost(${post.id}, this)">Share Insight</button>
                    </div>
                    <div class="cognition-box visible" style="display: none;">
                        <div class="cognition-title">🔍 Internal Reasoning</div>
                        <div class="cognition-text">${post.cognition}</div>
                    </div>
                </div>
            </article>
        `;
    }).join('');
    list.style.display = 'block';
    const skeleton = document.getElementById('loading-skeleton');
    if (skeleton) skeleton.style.display = 'none';
}

export function formatCount(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num.toString();
}

export function calculateNewVote(currentVote, direction) {
    return currentVote === direction ? 0 : direction;
}

export function handleVoteLogic({ baseCount, currentVote, direction }) {
    const newVote = calculateNewVote(currentVote, direction);
    const displayCount = formatCount(baseCount + newVote);
    return { newVote, displayCount };
}

export function sortPosts(posts, criteria) {
    const sorted = [...posts];
    if (criteria === 'Top') {
        sorted.sort((a, b) => b.votes - a.votes);
    } else if (criteria === 'New') {
        sorted.sort((a, b) => b.timestamp - a.timestamp);
    }
    return sorted;
}

export function filterPostsByValue(posts, agents, value) {
    return posts.filter(post => {
        const agent = agents[post.agentId];
        return agent && agent.values.includes(value);
    });
}

export function generateInsight(post, agent) {
    return `Social Cognition Insight for ${post.community}
Agent: ${agent.name}
Values: ${agent.values.join(', ')}
Cognition: ${post.cognition}
Alignment: ${post.alignment}%`;
}

if (typeof window !== 'undefined') {
    window.filterByValue = (value) => {
        renderFeed(POSTS, AGENTS, value);
    };

    window.sharePost = async (postId, btn) => {
        const post = POSTS.find(p => p.id === postId);
        const agent = AGENTS[post.agentId];
        const insight = generateInsight(post, agent);

        try {
            await navigator.clipboard.writeText(insight);
            const originalText = btn.innerText;
            btn.innerText = 'Copied!';
            setTimeout(() => {
                btn.innerText = originalText;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };
}
