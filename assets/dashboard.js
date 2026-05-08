(() => {
  const CACHE_KEY = 'wl-dashboard-cache';
  const TTL_MS = 5 * 60 * 1000;
  const USER = 'Caissaisdead';

  function getCached() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { at, data } = JSON.parse(raw);
      if (Date.now() - at > TTL_MS) return null;
      return data;
    } catch (e) { return null; }
  }

  function setCached(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data })); } catch (e) {}
  }

  function summarize(events) {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = events.filter(e => new Date(e.created_at).getTime() > cutoff);
    const types = { PushEvent: 0, PullRequestEvent: 0, ReleaseEvent: 0 };
    const repos = new Set();
    for (const e of recent) {
      if (Object.prototype.hasOwnProperty.call(types, e.type)) types[e.type]++;
      if (e.repo && e.repo.name) repos.add(e.repo.name);
    }
    return {
      total: recent.length,
      pushes: types.PushEvent,
      prs: types.PullRequestEvent,
      releases: types.ReleaseEvent,
      repos: repos.size,
    };
  }

  function render(stats) {
    const value = document.getElementById('gh-value');
    const meta = document.getElementById('gh-meta');
    if (value) value.textContent = stats.total ? `${stats.total} events` : 'Quiet week';
    if (meta) {
      const parts = [];
      if (stats.pushes) parts.push(`${stats.pushes} pushes`);
      if (stats.prs) parts.push(`${stats.prs} PRs`);
      if (stats.releases) parts.push(`${stats.releases} releases`);
      if (stats.repos) parts.push(`${stats.repos} repos`);
      meta.textContent = parts.length ? parts.join(' · ') : `last 7 days · @${USER}`;
    }
  }

  async function load() {
    const cached = getCached();
    if (cached) { render(cached); return; }
    try {
      const res = await fetch(`https://api.github.com/users/${USER}/events/public`);
      if (!res.ok) return;
      const data = await res.json();
      const stats = summarize(data);
      setCached(stats);
      render(stats);
    } catch (e) {
      // network / CORS / rate-limit — skeleton stays
    }
  }

  load();
})();
