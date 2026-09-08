/* =========================================================
   CCFV // MOBILE RANKING
   MESMA FONTE DE DADOS DO RANKING PRINCIPAL
   ========================================================= */
(() => {
  "use strict";

  const RANKS = [
    { key: "beginner", name: "INICIANTE", min: 0, max: 999 },
    { key: "amateur", name: "AMADOR", min: 1000, max: 1999 },
    { key: "professional", name: "PROFISSIONAL", min: 2000, max: 2999 },
    { key: "legend", name: "LENDA", min: 3000, max: Infinity }
  ];

  let client = null;
  let ranking = [];

  const $ = selector => document.querySelector(selector);
  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function rankByElo(elo) {
    const value = num(elo);
    return RANKS.find(rank => value >= rank.min && value <= rank.max) || RANKS[0];
  }

  function initials(name) {
    const words = String(name || "CC").trim().split(/\s+/).filter(Boolean);
    return words.length > 1
      ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
      : String(words[0] || "CC").slice(0, 2).toUpperCase();
  }

  function photo(player) {
    return player?.photo || player?.photo_url || "";
  }

  function normalize(row) {
    return {
      ...row,
      name: row.name || row.player_name || "JOGADOR",
      platform: row.platform || "—",
      elo: num(row.elo),
      matches_played: num(row.matches_played ?? row.matches ?? (num(row.wins) + num(row.draws) + num(row.losses))),
      wins: num(row.wins),
      draws: num(row.draws),
      losses: num(row.losses),
      titles: num(row.titles)
    };
  }

  async function getClient() {
    if (client) return client;
    if (window.CCFVAuth?.getClient) {
      client = await window.CCFVAuth.getClient();
      return client;
    }

    let script = document.querySelector('script[src*="/admin/js/auth.js"]');
    if (!script) {
      script = document.createElement("script");
      script.src = "../admin/js/auth.js";
      script.defer = true;
      document.head.appendChild(script);
    }

    const started = Date.now();
    while (!window.CCFVAuth?.getClient) {
      if (Date.now() - started > 10000) throw new Error("Supabase não está disponível.");
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    client = await window.CCFVAuth.getClient();
    return client;
  }

  async function loadRanking() {
    const c = await getClient();
    const { data, error } = await c
      .from("ccfv_ranking")
      .select("*")
      .order("ranking_position", { ascending: true });

    if (error) throw error;

    ranking = (data || [])
      .map(normalize)
      .filter(player => String(player.platform || "").trim().toUpperCase() === "MOBILE")
      .sort((a, b) => {
        const elo = b.elo - a.elo;
        if (elo) return elo;
        const wins = b.wins - a.wins;
        if (wins) return wins;
        return String(a.name).localeCompare(String(b.name), "pt-BR");
      })
      .map((player, index) => ({ ...player, ranking_position: index + 1 }));

    return ranking;
  }

  function badge(rank) {
    const label = rank.name === "PROFISSIONAL" ? "PRO" : rank.name;
    return `<div class="ccfv-mobile-rank-badge ccfv-mobile-rank-badge--${rank.key}" aria-label="${esc(rank.name)}"><span>${esc(label)}</span></div>`;
  }

  function renderHero() {
    const el = $("#mobile-ranking-hero-leader");
    if (!el) return;
    const top = ranking[0];
    if (!top) {
      el.innerHTML = `<article class="ccfv-ranking-hero__leader-card"><div class="ccfv-ranking-hero__leader-content"><span>CCFV // MOBILE // OFFICIAL LEADER</span><h2>AGUARDANDO</h2><small>Nenhum jogador Mobile no ranking principal.</small></div></article>`;
      return;
    }
    const rank = rankByElo(top.elo);
    const pic = photo(top);
    const games = top.matches_played;
    el.innerHTML = `
      <article class="ccfv-ranking-hero__leader-card ccfv-ranking-hero__leader-card--${rank.key}">
        <div class="ccfv-ranking-hero__leader-photo">${pic ? `<img src="${esc(pic)}" alt="${esc(top.name)}">` : `<span>${esc(initials(top.name))}</span>`}</div>
        <div class="ccfv-ranking-hero__leader-badge">${badge(rank)}</div>
        <div class="ccfv-ranking-hero__leader-content">
          <span>CCFV // MOBILE // OFFICIAL LEADER</span>
          <div class="ccfv-ranking-hero__leader-position">#01 ABSOLUTO</div>
          <h2>${esc(top.name)}</h2>
          <small>${top.instagram ? `@${esc(String(top.instagram).replace(/^@/, ""))}` : esc(rank.name)}</small>
          <div class="ccfv-ranking-hero__leader-meta">
            <div><span>ELO</span><strong>${top.elo}</strong></div>
            <div><span>JOGOS</span><strong>${games}</strong></div>
            <div><span>VITÓRIAS</span><strong>${top.wins}</strong></div>
            <div><span>TÍTULOS</span><strong>${top.titles}</strong></div>
          </div>
        </div>
      </article>`;
  }

  function renderTop10() {
    const content = $("#mobile-ranking-content");
    if (!content) return;
    const top10 = ranking.slice(0, 10);
    const rows = top10.map((player, index) => {
      const rank = rankByElo(player.elo);
      const pic = photo(player);
      return `<article class="ccfv-ranking-row ccfv-ranking-row--${rank.key} ${index === 0 ? "is-first" : ""}">
        <span class="ccfv-ranking-row__position">${String(index + 1).padStart(2, "0")}</span>
        <div class="ccfv-ranking-row__player">
          <div class="ccfv-ranking-row__photo">${pic ? `<img src="${esc(pic)}" alt="${esc(player.name)}">` : `<span>${esc(initials(player.name))}</span>`}</div>
          <div class="ccfv-ranking-row__player-info"><strong>${esc(player.name)}</strong><span>${player.instagram ? `@${esc(String(player.instagram).replace(/^@/, ""))}` : esc(rank.name)}</span></div>
        </div>
        <span class="ccfv-ranking-row__platform">MOBILE</span>
        <span class="ccfv-ranking-row__points">${player.elo}</span>
        <span class="ccfv-ranking-row__elo">ELO</span>
        <span class="ccfv-ranking-row__rank">${esc(rank.name)}</span>
      </article>`;
    }).join("");

    const levels = RANKS.map((rank, index) => {
      const leader = ranking.find(player => rankByElo(player.elo).key === rank.key);
      const range = rank.max === Infinity ? `${rank.min}+ ELO` : `${rank.min} — ${rank.max} ELO`;
      const pic = leader ? photo(leader) : "";
      return `<article class="ccfv-ranking-level ccfv-ranking-level--${rank.key}">
        <div class="ccfv-ranking-level__top"><span class="ccfv-ranking-level__number">NÍVEL ${String(index + 1).padStart(2, "0")}</span><span class="ccfv-ranking-level__leader-label">${leader ? "LÍDER" : "AGUARDANDO"}</span></div>
        <div class="ccfv-ranking-level__badge-art">${badge(rank)}</div>
        <div class="ccfv-ranking-level__leader-photo">${leader ? (pic ? `<img src="${esc(pic)}" alt="${esc(leader.name)}">` : `<span>${esc(initials(leader.name))}</span>`) : "?"}</div>
        <div class="ccfv-ranking-level__name">${esc(rank.name)}</div>
        <div class="ccfv-ranking-level__range">${range}</div>
        <div class="ccfv-ranking-level__leader">${leader ? `<strong>${esc(leader.name)}</strong><span>${leader.elo} ELO</span>` : `<strong>NENHUM JOGADOR</strong><span>Essa faixa ainda está disponível.</span>`}</div>
      </article>`;
    }).join("");

    content.innerHTML = `
      <section class="ccfv-ranking-table-section"><div class="ccfv-ranking-container">
        <div class="ccfv-ranking-section-heading"><span>CCFV // MOBILE</span><h2>TOP 10</h2></div>
        <div id="mobile-top10-list">${rows || `<div class="ccfv-ranking-empty-feature">NENHUM JOGADOR MOBILE NO RANKING.</div>`}</div>
      </div></section>
      <section class="ccfv-ranking-levels"><div class="ccfv-ranking-container">
        <div class="ccfv-ranking-section-heading"><span>PROGRESSÃO</span><h2>NÍVEIS DO RANKING</h2></div>
        <div class="ccfv-ranking-level-grid">${levels}</div>
      </div></section>`;
  }

  function render() {
    const count = $("#mobile-ranking-count");
    if (count) count.textContent = String(ranking.length).padStart(2, "0");
    renderHero();
    renderTop10();
  }

  async function refresh() {
    try {
      await loadRanking();
      render();
    } catch (error) {
      console.error("CCFV // MOBILE RANKING:", error);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    refresh();
    window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 60000);
  }, { once: true });
})();
