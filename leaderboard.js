// ================================================================
//  🏆 LEADERBOARD.JS — Локальный лидерборд
// ================================================================

const Leaderboard = {
    KEY: 'rat_leaderboard_v1',
    MAX: 50,

    load() {
        try {
            const raw = localStorage.getItem(this.KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return [];
    },

    save(list) {
        try {
            localStorage.setItem(this.KEY, JSON.stringify(list.slice(0, this.MAX)));
        } catch (e) {}
    },

    add(nickname, score, level, date = new Date()) {
        const list = this.load();
        const entry = {
            id: 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            nickname: String(nickname || 'GUEST').slice(0, 20).trim() || 'GUEST',
            score,
            level,
            date: date.toISOString(),
        };
        list.push(entry);
        list.sort((a, b) => b.score - a.score);
        this.save(list);
        return entry;
    },

    show(highlightId = null) {
        const list = this.load();
        const box = document.getElementById('leaderboard-list');
        box.innerHTML = '';

        if (list.length === 0) {
            box.innerHTML = '<div class="lb-empty">ПОКА НИКТО НЕ ИГРАЛ<br>СТАНЬ ПЕРВЫМ! 🐭</div>';
            return;
        }

        list.slice(0, this.MAX).forEach((entry, i) => {
            const row = document.createElement('div');
            row.className = 'lb-row';
            if (highlightId && entry.id === highlightId) row.classList.add('me');

            const rank = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
            const dateStr = this._formatDate(entry.date);

            row.innerHTML = `
                <span class="rank">${rank}</span>
                <span class="name" title="${entry.nickname}">${entry.nickname}</span>
                <span class="score">${entry.score}</span>
                <span class="date">${dateStr}</span>
            `;
            box.appendChild(row);
        });
    },

    _formatDate(isoStr) {
        try {
            const d = new Date(isoStr);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = String(d.getFullYear()).slice(2);
            const hours = String(d.getHours()).padStart(2, '0');
            const mins = String(d.getMinutes()).padStart(2, '0');
            return `${day}.${month}.${year} ${hours}:${mins}`;
        } catch (e) {
            return '—';
        }
    },

    clear() {
        localStorage.removeItem(this.KEY);
    },
};