export function formatCount(num) {
    if (num >= 999950) return (num / 1000000).toFixed(1) + 'm';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
}

export function calculateNewVote(currentVote, direction) {
    if (currentVote === direction) return 0; // Toggle off
    return direction;
}

export function handleVoteLogic({ baseCount, currentVote, direction }) {
    const newVote = calculateNewVote(currentVote, direction);
    const displayCount = formatCount(baseCount + newVote);
    return { newVote, displayCount };
}

if (typeof document !== 'undefined') {
    window.copyLink = function(btn, id) {
        // Handle case where only id is passed (before onclick update)
        if (typeof btn === 'string') {
            id = btn;
            btn = document.querySelector(`#${id} .share-btn`);
        }

        const url = window.location.origin + window.location.pathname + '#' + id;
        navigator.clipboard.writeText(url).then(() => {
            if (btn) {
                const originalContent = btn.innerHTML;
                btn.innerHTML = '<span aria-hidden="true">✅</span> Copied!';
                setTimeout(() => {
                    btn.innerHTML = originalContent;
                }, 2000);
            }
            const announcer = document.getElementById('announcer');
            if (announcer) announcer.innerText = 'Link copied to clipboard';
        });
    };

    window.handleVote = function(btn, direction) {
        const sidebar = btn.parentElement;
        const upBtn = sidebar.querySelector('.up');
        const downBtn = sidebar.querySelector('.down');
        const countSpan = sidebar.querySelector('.vote-count');
        const baseCount = parseInt(countSpan.getAttribute('data-base'));
        const announcer = document.getElementById('announcer');

        let currentVote = 0;
        if (upBtn.classList.contains('active')) currentVote = 1;
        else if (downBtn.classList.contains('active')) currentVote = -1;

        const result = handleVoteLogic({ baseCount, currentVote, direction });

        upBtn.classList.toggle('active', result.newVote === 1);
        downBtn.classList.toggle('active', result.newVote === -1);
        countSpan.innerText = result.displayCount;
        countSpan.className = 'vote-count' +
            (result.newVote === 1 ? ' up' : result.newVote === -1 ? ' down' : '');

        if (announcer) {
            announcer.innerText = result.newVote === 0 ? 'Vote removed' :
                                 result.newVote === 1 ? 'Upvoted' : 'Downvoted';
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        const sortButtons = document.querySelectorAll('.sort-btn[role="tab"]');
        sortButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                sortButtons.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-selected', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');
                const sortType = btn.innerText.replace(/[^\w]/g, '').trim();
                const announcer = document.getElementById('announcer');
                if (announcer) announcer.innerText = `Sorted by ${sortType}`;
            });
        });
    });
}
