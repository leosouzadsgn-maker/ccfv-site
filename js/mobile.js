(() => {
  "use strict";

  const SUPABASE_URL = "https://hfiwndvshzorikfzkiiw.supabase.co";
  const SUPABASE_KEY = "sb_publishable_VykAaaP_0PfIW_n4HYHbTA_VlvrkjMu";

  const TEAMS = [
    "ATHLETICO-PR", "ATLÉTICO-MG", "BAHIA", "BOTAFOGO", "BRAGANTINO",
    "CHAPECOENSE", "CORINTHIANS", "CORITIBA", "CRUZEIRO", "FLAMENGO",
    "FLUMINENSE", "GRÊMIO", "INTERNACIONAL", "MIRASSOL", "PALMEIRAS",
    "REMO", "SANTOS", "SÃO PAULO", "VASCO", "VITÓRIA"
  ];

  const CLUB_SLUG = {
    "ATHLETICO-PR":"athletico-pr","ATLÉTICO-MG":"atletico-mg","BAHIA":"bahia","BOTAFOGO":"botafogo",
    "BRAGANTINO":"bragantino","CHAPECOENSE":"chapecoense","CORINTHIANS":"corinthians","CORITIBA":"coritiba",
    "CRUZEIRO":"cruzeiro","FLAMENGO":"flamengo","FLUMINENSE":"fluminense","GRÊMIO":"gremio",
    "INTERNACIONAL":"internacional","MIRASSOL":"mirassol","PALMEIRAS":"palmeiras","REMO":"remo",
    "SANTOS":"santos","SÃO PAULO":"sao-paulo","VASCO":"vasco","VITÓRIA":"vitoria"
  };

  const ELOS = [
    { key:"beginner", name:"INICIANTE", min:0, max:999 },
    { key:"amateur", name:"AMADOR", min:1000, max:1999 },
    { key:"professional", name:"PROFISSIONAL", min:2000, max:2999 },
    { key:"legend", name:"LENDA", min:3000, max:Infinity }
  ];

  const esc = s => String(s ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const norm = s => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
  const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const isFinal = s => /FINAL|FINISHED|COMPLETED|CONCL|ENCERR|FINALIZ/i.test(String(s || ""));
  const teamLogo = team => `../assets/images/clubs/${CLUB_SLUG[team] || ""}.png`;

  let client = null;
  let matches = [];
  let ranking = [];

  async function getClient() {
    if (client) return client;
    if (!window.supabase?.createClient) throw new Error("Supabase indisponível.");
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return client;
  }

  async function rpc(name, args = {}) {
    const c = await getClient();
    const { data, error } = await c.rpc(name, args);
    if (error) throw error;
    return data || [];
  }

  async function loadMatches() {
    matches = await rpc("get_ccfv_mobile_matches");
    return matches;
  }

  async function loadRanking() {
    ranking = await rpc("get_ccfv_mobile_ranking");
    return ranking;
  }

  /* --------- 38 rounds / round-robin schedule --------- */
  function generateSchedule() {
    const rounds = [];
    let rotating = [...TEAMS];
    for (let r = 0; r < 19; r++) {
      const round = [];
      for (let i = 0; i < 10; i++) {
        const a = rotating[i];
        const b = rotating[rotating.length - 1 - i];
        round.push({
          home: r % 2 === 0 ? a : b,
          away: r % 2 === 0 ? b : a,
          round: r + 1,
          index: i + 1
        });
      }
      rounds.push(round);
      rotating = [rotating[0], rotating[rotating.length - 1], ...rotating.slice(1, -1)];
    }
    const second = rounds.map((round, i) => round.map(g => ({
      ...g, home: g.away, away: g.home, round: i + 20, index: g.index
    })));
    return rounds.concat(second).flat();
  }

  const SCHEDULE = generateSchedule();

  function resultForFixture(fixture) {
    return matches.find(m =>
      norm(m.competition) === "BRASILEIRAO_MOBILE" &&
      num(m.round_number) === fixture.round &&
      norm(m.home_team) === norm(fixture.home) &&
      norm(m.away_team) === norm(fixture.away)
    ) || null;
  }

  function fixturesForRound(round) {
    return SCHEDULE.filter(g => g.round === round).map((fixture, index) => ({
      ...fixture,
      number: index + 1,
      result: resultForFixture(fixture)
    }));
  }

  function standingsForRound(round = 38) {
    const rows = TEAMS.map(team => ({ team, j:0, v:0, e:0, d:0, gp:0, gc:0, pts:0 }));
    const by = new Map(rows.map(r => [norm(r.team), r]));
    for (const m of matches) {
      if (norm(m.competition) !== "BRASILEIRAO_MOBILE") continue;
      if (num(m.round_number) > round) continue;
      if (!isFinal(m.status)) continue;
      const h = by.get(norm(m.home_team));
      const a = by.get(norm(m.away_team));
      if (!h || !a) continue;
      const hs = num(m.home_score), as = num(m.away_score);
      h.j++; a.j++; h.gp += hs; h.gc += as; a.gp += as; a.gc += hs;
      if (hs > as) { h.v++; a.d++; h.pts += 3; }
      else if (hs < as) { a.v++; h.d++; a.pts += 3; }
      else { h.e++; a.e++; h.pts++; a.pts++; }
    }
    return rows
      .sort((a,b) => b.pts-a.pts || ((b.gp-b.gc)-(a.gp-a.gc)) || (b.gp-a.gp) || a.team.localeCompare(b.team,"pt-BR"))
      .map((r,i) => ({...r, sg:r.gp-r.gc, position:i+1}));
  }

  function renderRoundPicker(round = 1) {
    const holder = document.querySelector("#mobile-round-picker");
    if (!holder) return;
    holder.innerHTML = `
      <label class="ccfv-mobile-round-select">
        <span>VISUALIZAR</span>
        <select id="mobile-round-select" aria-label="Selecionar rodada">
          ${Array.from({length:38},(_,i)=>`<option value="${i+1}" ${i+1===round?"selected":""}>RODADA ${String(i+1).padStart(2,"0")}</option>`).join("")}
        </select>
      </label>`;
    holder.querySelector("select")?.addEventListener("change", e => renderMobileBrasileirao(Number(e.target.value)));
  }

  function renderMobileBrasileiraoTable(table, round) {
    const el = document.querySelector("#mobile-standings");
    if (!el) return;
    el.innerHTML = `
      <div class="ccfv-mobile-standing ccfv-mobile-standing--head">
        <span>POS</span><span>CLUBE</span><span>J</span><span>V</span><span>E</span><span>D</span><span>GP</span><span>GC</span><span>SG</span><strong>PTS</strong>
      </div>
      ${table.map(r => `
        <div class="ccfv-mobile-standing ${r.position===1?'is-first':''}">
          <span>${String(r.position).padStart(2,"0")}</span>
          <strong class="ccfv-mobile-standing__club"><img src="${teamLogo(r.team)}" alt="">${esc(r.team)}</strong>
          <span>${r.j}</span><span>${r.v}</span><span>${r.e}</span><span>${r.d}</span>
          <span>${r.gp}</span><span>${r.gc}</span><span>${r.sg>0?`+${r.sg}`:r.sg}</span><strong>${r.pts}</strong>
        </div>`).join("")}`;
    const title = document.querySelector("#mobile-round-title");
    if (title) title.textContent = `CLASSIFICAÇÃO APÓS A RODADA ${String(round).padStart(2,"0")}`;
  }

  function renderFixtureRow(game) {
    const m = game.result;
    const final = m && isFinal(m.status);
    return `
      <article class="ccfv-mobile-fixture-card ${final ? "is-finished" : ""}">
        <div class="ccfv-mobile-fixture-card__top"><span>JOGO ${String(game.number).padStart(2,"0")}</span><span>${final ? "FINALIZADA" : "A DEFINIR"}</span></div>
        <div class="ccfv-mobile-fixture-card__teams">
          <div><img src="${teamLogo(game.home)}" alt=""><strong>${esc(game.home)}</strong><small>${esc(m?.home_player_name || "JOGADOR MOBILE")}</small></div>
          <div class="ccfv-mobile-fixture-card__score">${final ? `${num(m.home_score)} <span>×</span> ${num(m.away_score)}` : `<span>VS</span>`}</div>
          <div><img src="${teamLogo(game.away)}" alt=""><strong>${esc(game.away)}</strong><small>${esc(m?.away_player_name || "JOGADOR MOBILE")}</small></div>
        </div>
        <div class="ccfv-mobile-fixture-card__bottom"><span>RODADA ${String(game.round).padStart(2,"0")}</span><span>${final ? new Date(m.played_at || m.created_at || Date.now()).toLocaleDateString("pt-BR") : "DATA A DEFINIR"}</span></div>
      </article>`;
  }

  function renderRoundFixtures(round) {
    const el = document.querySelector("#mobile-round-matches");
    if (!el) return;
    const games = fixturesForRound(round);
    el.innerHTML = `<div class="ccfv-mobile-fixtures-grid">${games.map(renderFixtureRow).join("")}</div>`;
  }

  async function renderMobileBrasileirao(round=1) {
    const standingsEl = document.querySelector("#mobile-standings");
    if (!standingsEl) return;
    try {
      await loadMatches();
      renderRoundPicker(round);
      renderMobileBrasileiraoTable(standingsForRound(round), round);
      renderRoundFixtures(round);
    } catch (e) {
      console.error(e);
      standingsEl.innerHTML = `<div class="ccfv-mobile-empty">NÃO FOI POSSÍVEL CARREGAR O BRASILEIRÃO MOBILE.</div>`;
      const games = document.querySelector("#mobile-round-matches"); if (games) games.innerHTML = "";
    }
  }

  function rankName(elo) {
    const e = num(elo);
    return ELOS.find(x => e >= x.min && e <= x.max)?.name || "INICIANTE";
  }

  function rankKey(elo) {
    const e = num(elo);
    return ELOS.find(x => e >= x.min && e <= x.max)?.key || "beginner";
  }

  function initials(name) { return String(name || "CC").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase().slice(0,2); }
  function playerPhoto(p) { return p?.photo_url || p?.photo || p?.avatar_url || p?.image_url || ""; }

    function renderBadge(
        rank,
        size = "medium"
    ) {

        if (
            rank.key ===
            "legend"
        ) {

            return `

                <svg
                    class="
                        ccfv-badge
                        ccfv-badge--legend
                        ccfv-badge--${size}
                    "
                    viewBox="0 0 220 260"
                    aria-label="LENDA"
                    role="img"
                >

                    <defs>

                        <linearGradient
                            id="legend-metal"
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="1"
                        >

                            <stop
                                offset="0%"
                                stop-color="#fff7c5"
                            />

                            <stop
                                offset="24%"
                                stop-color="#ffd86b"
                            />

                            <stop
                                offset="50%"
                                stop-color="#ffc252"
                            />

                            <stop
                                offset="76%"
                                stop-color="#9d6710"
                            />

                            <stop
                                offset="100%"
                                stop-color="#fff1a0"
                            />

                        </linearGradient>


                        <radialGradient
                            id="legend-core"
                        >

                            <stop
                                offset="0%"
                                stop-color="#fff4b4"
                            />

                            <stop
                                offset="35%"
                                stop-color="#ffc252"
                            />

                            <stop
                                offset="100%"
                                stop-color="#7e5108"
                            />

                        </radialGradient>


                        <filter
                            id="legend-glow"
                        >

                            <feGaussianBlur
                                stdDeviation="7"
                                result="blur"
                            />

                            <feMerge>

                                <feMergeNode
                                    in="blur"
                                />

                                <feMergeNode
                                    in="SourceGraphic"
                                />

                            </feMerge>

                        </filter>

                    </defs>


                    <polygon
                        points="
                            110,4
                            144,24
                            190,26
                            216,68
                            195,182
                            110,254
                            25,182
                            4,68
                            30,26
                            76,24
                        "
                        fill="#070807"
                        stroke="#ffc252"
                        stroke-width="5"
                        filter="url(#legend-glow)"
                    />


                    <polygon
                        points="
                            110,18
                            141,37
                            179,39
                            200,70
                            179,173
                            110,238
                            41,173
                            20,70
                            41,39
                            79,37
                        "
                        fill="#12110c"
                        stroke="url(#legend-metal)"
                        stroke-width="3"
                    />


                    <circle
                        cx="110"
                        cy="104"
                        r="56"
                        fill="rgba(255,194,82,.035)"
                        stroke="#ffc252"
                        stroke-width="2"
                    />


                    <circle
                        cx="110"
                        cy="104"
                        r="45"
                        fill="none"
                        stroke="rgba(255,240,160,.30)"
                        stroke-width="1"
                    />


                    <path
                        d="
                            M72 76
                            L89 89
                            L110 58
                            L131 89
                            L148 76
                            L145 108
                            L110 132
                            L75 108
                            Z
                        "
                        fill="url(#legend-core)"
                    />


                    <path
                        d="
                            M60 134
                            Q110 174
                            160 134
                            L150 169
                            Q110 197
                            70 169
                            Z
                        "
                        fill="none"
                        stroke="#ffc252"
                        stroke-width="5"
                    />


                    <circle
                        cx="52"
                        cy="89"
                        r="4"
                        fill="#ffe99a"
                    />

                    <circle
                        cx="168"
                        cy="89"
                        r="4"
                        fill="#ffe99a"
                    />


                    <text
                        x="110"
                        y="216"
                        text-anchor="middle"
                        fill="#fff8d1"
                        stroke="#7c4f08"
                        stroke-width="2"
                        paint-order="stroke"
                        font-size="17"
                        font-weight="900"
                        letter-spacing="2.8"
                    >
                        LENDA
                    </text>

                </svg>

            `;

        }


        if (
            rank.key ===
            "professional"
        ) {

            return `

                <svg
                    class="
                        ccfv-badge
                        ccfv-badge--professional
                        ccfv-badge--${size}
                    "
                    viewBox="0 0 220 260"
                    aria-label="PROFISSIONAL"
                    role="img"
                >

                    <polygon
                        points="
                            110,7
                            157,31
                            200,72
                            188,178
                            110,250
                            32,178
                            20,72
                            63,31
                        "
                        fill="#05120b"
                        stroke="#43df91"
                        stroke-width="5"
                    />


                    <polygon
                        points="
                            110,26
                            147,47
                            181,78
                            170,168
                            110,225
                            50,168
                            39,78
                            73,47
                        "
                        fill="none"
                        stroke="#9dffd2"
                        stroke-width="3"
                    />


                    <circle
                        cx="110"
                        cy="105"
                        r="49"
                        fill="rgba(67,223,145,.045)"
                        stroke="#43df91"
                        stroke-width="2"
                    />


                    <path
                        d="
                            M110 61
                            L124 89
                            L154 94
                            L132 113
                            L138 145
                            L110 129
                            L82 145
                            L88 113
                            L66 94
                            L96 89
                            Z
                        "
                        fill="#43df91"
                    />


                    <circle
                        cx="57"
                        cy="91"
                        r="5"
                        fill="#43df91"
                    />

                    <circle
                        cx="163"
                        cy="91"
                        r="5"
                        fill="#43df91"
                    />


                    <text
                        x="110"
                        y="212"
                        text-anchor="middle"
                        fill="#c9ffe3"
                        stroke="#086b43"
                        stroke-width="1.4"
                        paint-order="stroke"
                        font-size="14"
                        font-weight="900"
                        letter-spacing="1.5"
                    >
                        PROFISSIONAL
                    </text>

                </svg>

            `;

        }


        if (
            rank.key ===
            "amateur"
        ) {

            return `

                <svg
                    class="
                        ccfv-badge
                        ccfv-badge--amateur
                        ccfv-badge--${size}
                    "
                    viewBox="0 0 220 260"
                    aria-label="AMADOR"
                    role="img"
                >

                    <polygon
                        points="
                            110,9
                            159,38
                            194,82
                            182,175
                            110,246
                            38,175
                            26,82
                            61,38
                        "
                        fill="#06101d"
                        stroke="#69a8ff"
                        stroke-width="5"
                    />


                    <polygon
                        points="
                            110,27
                            148,50
                            178,84
                            167,164
                            110,221
                            53,164
                            42,84
                            72,50
                        "
                        fill="none"
                        stroke="#b9d9ff"
                        stroke-width="3"
                    />


                    <circle
                        cx="110"
                        cy="105"
                        r="46"
                        fill="rgba(105,168,255,.045)"
                        stroke="#69a8ff"
                        stroke-width="2"
                    />


                    <path
                        d="
                            M110 64
                            L124 91
                            L152 96
                            L131 115
                            L138 143
                            L110 128
                            L82 143
                            L89 115
                            L68 96
                            L96 91
                            Z
                        "
                        fill="#69a8ff"
                    />


                    <circle
                        cx="63"
                        cy="94"
                        r="4"
                        fill="#69a8ff"
                    />

                    <circle
                        cx="157"
                        cy="94"
                        r="4"
                        fill="#69a8ff"
                    />


                    <text
                        x="110"
                        y="211"
                        text-anchor="middle"
                        fill="#e3efff"
                        stroke="#24558e"
                        stroke-width="1.3"
                        paint-order="stroke"
                        font-size="16"
                        font-weight="900"
                        letter-spacing="2.4"
                    >
                        AMADOR
                    </text>

                </svg>

            `;

        }


        return `

            <svg
                class="
                    ccfv-badge
                    ccfv-badge--beginner
                    ccfv-badge--${size}
                "
                viewBox="0 0 220 260"
                aria-label="INICIANTE"
                role="img"
            >

                <polygon
                    points="
                        110,11
                        158,41
                        191,82
                        179,169
                        110,246
                        41,169
                        29,82
                        62,41
                    "
                    fill="#080b0a"
                    stroke="#8d9a95"
                    stroke-width="5"
                />


                <polygon
                    points="
                        110,29
                        148,51
                        175,84
                        164,161
                        110,220
                        56,161
                        45,84
                        72,51
                    "
                    fill="none"
                    stroke="#bbc6c2"
                    stroke-width="2"
                />


                <circle
                    cx="110"
                    cy="105"
                    r="42"
                    fill="rgba(255,255,255,.025)"
                    stroke="#8d9a95"
                    stroke-width="2"
                />


                <circle
                    cx="110"
                    cy="105"
                    r="13"
                    fill="none"
                    stroke="#8d9a95"
                    stroke-width="4"
                />


                <text
                    x="110"
                    y="212"
                    text-anchor="middle"
                    fill="#e5ece9"
                    stroke="#4c5752"
                    stroke-width="1.3"
                    paint-order="stroke"
                    font-size="15"
                    font-weight="900"
                    letter-spacing="2.2"
                >
                    INICIANTE
                </text>

            </svg>

        `;

    }

  function cardHTML(player, pos) {
    const key = rankKey(player.elo), rank = ELOS.find(x=>x.key===key);
    const photo = playerPhoto(player);
    const games = num(player.matches_played ?? (num(player.wins)+num(player.draws)+num(player.losses)));
    const win = games ? Math.round((num(player.wins)/games)*100) : 0;
    const photoHTML = photo ? `<img src="${esc(photo)}" alt="${esc(player.name)}" loading="lazy" crossorigin="anonymous">` : `<span class="ccfv-player-card-real__initials">${esc(initials(player.name))}</span>`;
    return `<div class="ccfv-player-card-item" data-player-id="${esc(player.player_id || player.id || pos)}">
      <article class="ccfv-player-card-preview ccfv-player-card-preview--${key} ccfv-player-card-preview--animated ccfv-player-card-real" data-mobile-card-id="${esc(player.player_id || player.id || pos)}">
        <div class="ccfv-player-card-preview__holo"></div><div class="ccfv-player-card-preview__noise"></div><div class="ccfv-player-card-preview__energy"></div><div class="ccfv-player-card-preview__grid"></div>
        <div class="ccfv-player-card-preview__corner ccfv-player-card-preview__corner--tl"></div><div class="ccfv-player-card-preview__corner ccfv-player-card-preview__corner--tr"></div><div class="ccfv-player-card-preview__corner ccfv-player-card-preview__corner--bl"></div><div class="ccfv-player-card-preview__corner ccfv-player-card-preview__corner--br"></div>
        <div class="ccfv-player-card-preview__top"><div><span>CCFV MOBILE</span><strong>#${String(pos).padStart(3,"0")}</strong></div><div class="ccfv-player-card-preview__mini-badge">${renderBadge(rank,"small")}</div></div>
        <div class="ccfv-player-card-preview__scanline"></div>
        <div class="ccfv-player-card-preview__photo"><div class="ccfv-player-card-preview__photo-frame ccfv-player-card-real__photo-frame">${photoHTML}</div></div>
        <div class="ccfv-player-card-preview__badge-floating">${renderBadge(rank,"medium")}</div>
        <div class="ccfv-player-card-preview__identity"><span>${esc(rank.name)}</span><strong>${esc(player.name||"JOGADOR")}</strong><small>${esc(player.instagram ? `@${String(player.instagram).replace(/^@/,"")}` : "@ccfv.oficial")}</small></div>
        <div class="ccfv-player-card-preview__metrics"><div><span>ELO</span><strong>${num(player.elo)}</strong></div><div><span>POS</span><strong>#${String(pos).padStart(2,"0")}</strong></div><div><span>WIN</span><strong>${String(win).padStart(2,"0")} %</strong></div></div>
        <div class="ccfv-player-card-preview__footer"><span>@ccfv.oficial</span><strong>${esc(rank.name)}</strong></div>
        <div class="ccfv-player-card-preview__particles"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      </article>
      <button type="button" class="ccfv-player-card-download" data-mobile-download-card="${esc(player.player_id || player.id || pos)}"><span>BAIXAR CARD</span><span>↓</span></button>
    </div>`;
  }

  function bindCardMotion(root=document) {
    root.querySelectorAll(".ccfv-player-card-preview--animated").forEach(card => {
      if (card.dataset.motionBound === "true") return;
      card.dataset.motionBound = "true";
      card.addEventListener("pointermove", e => {
        const r = card.getBoundingClientRect(), x=(e.clientX-r.left)/r.width, y=(e.clientY-r.top)/r.height;
        card.style.setProperty("--mouse-x",`${x*100}%`); card.style.setProperty("--mouse-y",`${y*100}%`);
        card.style.setProperty("--rotate-x",`${(0.5-y)*12}deg`); card.style.setProperty("--rotate-y",`${(x-0.5)*14}deg`);
      });
      card.addEventListener("pointerleave",()=>{card.style.setProperty("--rotate-x","0deg");card.style.setProperty("--rotate-y","0deg");card.style.setProperty("--mouse-x","50%");card.style.setProperty("--mouse-y","50%");});
    });
  }

  async function downloadMobileCard(button) {
    const id = button?.dataset?.mobileDownloadCard;
    const card = document.querySelector(`[data-mobile-card-id="${CSS.escape(String(id))}"]`);
    if (!card) return;
    const original = button.innerHTML; button.disabled=true; button.innerHTML="GERANDO...";
    try {
      const opts = { pixelRatio: 2, cacheBust: true, backgroundColor: "#020403" };
      let dataUrl="";
      if (window.htmlToImage?.toPng) dataUrl=await window.htmlToImage.toPng(card, opts);
      else if (window.html2canvas) dataUrl=(await window.html2canvas(card,{scale:2,useCORS:true,allowTaint:false,backgroundColor:"#020403"})).toDataURL("image/png");
      if (!dataUrl || !dataUrl.startsWith("data:image/png")) throw new Error("PNG inválido");
      const p=ranking.find(x=>String(x.player_id||x.id)===String(id));
      const safe=String(p?.name||"jogador").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]+/g,"-").toLowerCase();
      const a=document.createElement("a"); a.download=`ccfv-mobile-card-${safe||"jogador"}.png`; a.href=dataUrl; document.body.appendChild(a); a.click(); a.remove();
    } catch(e) {
      console.error(e); alert("Não foi possível gerar o card. Verifique se a foto do jogador possui uma URL pública com CORS.");
    } finally { button.disabled=false; button.innerHTML=original; }
  }

  function bindDownloads(root=document){root.querySelectorAll("[data-mobile-download-card]").forEach(b=>{if(b.dataset.bound==="true")return;b.dataset.bound="true";b.addEventListener("click",()=>downloadMobileCard(b));});}

  function topByElo(key,list){return list.filter(p=>rankKey(p.elo)===key).sort((a,b)=>num(b.elo)-num(a.elo))[0]||null;}

  function renderMobileRankingPage() {
    const heroEl=document.querySelector("#mobile-ranking-hero-leader");
    const contentEl=document.querySelector("#mobile-ranking-content");
    if(!heroEl||!contentEl)return;
    const list=[...ranking].sort((a,b)=>num(b.elo)-num(a.elo));
    const top=list[0];
    const count=document.querySelector("#mobile-ranking-count"); if(count) count.textContent=String(list.length).padStart(2,"0");

    if(top){
      const rank=ELOS.find(e=>e.key===rankKey(top.elo));
      const photo=playerPhoto(top);
      const games=num(top.matches_played);
      heroEl.innerHTML=`<article class="ccfv-ranking-hero__leader-card ccfv-ranking-hero__leader-card--${rank.key}"><div class="ccfv-ranking-hero__leader-photo">${photo?`<img src="${esc(photo)}" alt="${esc(top.name)}" crossorigin="anonymous">`:`<span>${esc(initials(top.name))}</span>`}</div><div class="ccfv-ranking-hero__leader-badge">${renderBadge(rank,"small")}</div><div class="ccfv-ranking-hero__leader-content"><span>CCFV // MOBILE // OFFICIAL LEADER</span><div class="ccfv-ranking-hero__leader-position">#01 ABSOLUTO</div><h2>${esc(top.name)}</h2><small>${esc(top.instagram?`@${String(top.instagram).replace(/^@/,"")}`:"@ccfv.oficial")} · ${esc(rank.name)}</small><div class="ccfv-ranking-hero__leader-meta"><div><span>ELO</span><strong>${num(top.elo)}</strong></div><div><span>JOGOS</span><strong>${games}</strong></div><div><span>VITÓRIAS</span><strong>${num(top.wins)}</strong></div><div><span>TÍTULOS</span><strong>${num(top.titles)}</strong></div></div></div></article>`;
    } else {
      heroEl.innerHTML=`<div class="ccfv-ranking-hero__leader-card ccfv-ranking-hero__leader-card--empty"><div class="ccfv-ranking-hero__leader-copy"><span>CCFV // MOBILE // OFFICIAL RANKING</span><strong>O TOPO ESTÁ ESPERANDO.</strong><small>Cadastre os competidores Mobile no Admin.</small></div></div>`;
    }

    const top10=list.slice(0,10);
    const rows=top10.map((p,i)=>{
      const rank=ELOS.find(e=>e.key===rankKey(p.elo));
      const photo=playerPhoto(p); const pos=i+1;
      return `<article class="ccfv-ranking-row ccfv-ranking-row--${rank.key} ${pos===1?"is-first":""}"><span class="ccfv-ranking-row__position">${String(pos).padStart(2,"0")}</span><div class="ccfv-ranking-row__player"><div class="ccfv-ranking-row__photo">${photo?`<img src="${esc(photo)}" alt="" loading="lazy">`:esc(initials(p.name))}</div><div class="ccfv-ranking-row__player-info"><strong>${esc(p.name)}</strong><span>${esc(p.instagram?`@${String(p.instagram).replace(/^@/,"")}`:"@ccfv.oficial")}</span></div></div><span class="ccfv-ranking-row__platform">MOBILE</span><span class="ccfv-ranking-row__points">${num(p.elo)}</span><span class="ccfv-ranking-row__elo">ELO</span><span class="ccfv-ranking-row__rank">${esc(rank.name)}</span></article>`;
    }).join("");

    const levels=ELOS.map((rank,index)=>{
      const p=topByElo(rank.key,list), photo=playerPhoto(p);
      return `<article class="ccfv-ranking-level ccfv-ranking-level--${rank.key} ${p?"has-leader":"is-empty"}"><div class="ccfv-ranking-level__top"><span class="ccfv-ranking-level__number">${String(index+1).padStart(2,"0")}</span><span class="ccfv-ranking-level__leader-label">TOP 1 DO ELO</span></div><div class="ccfv-ranking-level__badge-art">${renderBadge(rank,"medium")}</div><div class="ccfv-ranking-level__leader-photo">${photo?`<img src="${esc(photo)}" alt="${esc(p.name)}" loading="lazy">`:`<span>${p?esc(initials(p.name)):"—"}</span>`}</div><div class="ccfv-ranking-level__name">${esc(rank.name)}</div><div class="ccfv-ranking-level__range">${rank.key==="legend"?"3000+ ELO":`${rank.min} → ${rank.max} ELO`}</div><div class="ccfv-ranking-level__leader">${p?`<strong>${esc(p.name)}</strong><span>${num(p.elo)} ELO</span>`:`<strong>A DEFINIR</strong><span>NENHUM JOGADOR NESTA FAIXA</span>`}</div></article>`;
    }).join("");

    contentEl.innerHTML=`<section class="ccfv-ranking-table-section"><div class="ccfv-ranking-container"><div class="ccfv-ranking-section-heading"><div><span>CCFV // MOBILE // LEADERBOARD</span><h2>TOP 10 <strong>MOBILE.</strong></h2></div></div><div class="ccfv-ranking-list" id="mobile-top10-list">${rows || `<div class="ccfv-ranking-empty-feature"><strong>NENHUM COMPETIDOR MOBILE.</strong><span>Os jogadores aparecerão aqui assim que forem cadastrados.</span></div>`}</div></div></section><section class="ccfv-ranking-levels"><div class="ccfv-ranking-container"><div class="ccfv-ranking-section-heading"><div><span>CCFV // MOBILE // ELO SYSTEM</span><h2>CONQUISTE SUA <strong>INSÍGNIA.</strong></h2></div><p>ELO e evolução competitiva independentes do PC e Console.</p></div><div class="ccfv-ranking-level-grid">${levels}</div></div></section>`;

    bindLevelMotion(contentEl);
  }

  function bindLevelMotion(root=document){
    root.querySelectorAll('.ccfv-ranking-level').forEach(card=>{
      if(card.dataset.bound==='true')return; card.dataset.bound='true';
      card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;card.style.setProperty('--level-rx',`${(0.5-y)*9}deg`);card.style.setProperty('--level-ry',`${(x-0.5)*12}deg`);card.style.setProperty('--level-mx',`${x*100}%`);card.style.setProperty('--level-my',`${y*100}%`);card.classList.add('is-hovering')});
      card.addEventListener('pointerleave',()=>{card.classList.remove('is-hovering');card.style.setProperty('--level-rx','0deg');card.style.setProperty('--level-ry','0deg');card.style.setProperty('--level-mx','50%');card.style.setProperty('--level-my','50%')});
    });
  }

  function renderPlayerDirectory() {
    const el=document.querySelector("#mobile-player-directory"); if(!el)return;
    const search=(document.querySelector("#mobile-player-search")?.value||"").trim().toLowerCase();
    const list=ranking.filter(p=>!search||String(p.name||"").toLowerCase().includes(search)||String(p.instagram||"").toLowerCase().includes(search)).sort((a,b)=>num(b.elo)-num(a.elo));
    el.innerHTML=list.length?`<div class="ccfv-player-cards-grid">${list.map((p,i)=>cardHTML(p,i+1)).join("")}</div>`:`<div class="ccfv-player-cards-empty"><strong>NENHUM COMPETIDOR MOBILE ENCONTRADO.</strong><span>Ajuste a busca ou cadastre jogadores Mobile pelo Admin.</span></div>`;
    bindCardMotion(el); bindDownloads(el);
    const count=document.querySelector("#mobile-directory-count");if(count)count.textContent=`${list.length} JOGADOR${list.length===1?"":"ES"}`;
  }

  function bracketMatch(match, code) {
    const final = match && isFinal(match.status);
    return `<article class="ccfv-night-bracket-match"><span class="ccfv-night-bracket-match__number">${code}</span><div class="ccfv-night-bracket-team"><span>${esc(match?.home_team || "A DEFINIR")}</span><strong>${final?num(match.home_score):""}</strong></div><div class="ccfv-night-bracket-team"><span>${esc(match?.away_team || "A DEFINIR")}</span><strong>${final?num(match.away_score):""}</strong></div></article>`;
  }

  function winner(match) { if(!match||!isFinal(match.status))return null; if(num(match.home_score)>num(match.away_score))return match.home_team; if(num(match.away_score)>num(match.home_score))return match.away_team; return null; }

  function renderArena() {
    const root=document.querySelector("#mobile-arena-root"); if(!root)return;
    const games=matches.filter(m=>norm(m.competition)==="ARENA_CUP");
    const q=Array.from({length:4},(_,i)=>games.find(m=>norm(m.stage).includes("QUART")&&num(m.round_number)===i+1));
    const s=Array.from({length:2},(_,i)=>games.find(m=>norm(m.stage).includes("SEMI")&&num(m.round_number)===i+1));
    const f=games.find(m=>norm(m.stage)==="FINAL"||norm(m.stage).startsWith("FINAL"));
    root.innerHTML=`<div class="ccfv-night-bracket ccfv-mobile-arena-bracket"><div class="ccfv-night-bracket-layout"><div class="ccfv-night-bracket-column ccfv-night-bracket-column--quarters"><div class="ccfv-night-bracket-column__title"><span>01</span><strong>QUARTAS</strong></div>${q.map((m,i)=>bracketMatch(m||{},`QF ${String(i+1).padStart(2,"0")}`)).join("")}</div><div class="ccfv-night-bracket-column ccfv-night-bracket-column--middle"><div class="ccfv-night-bracket-column__title"><span>02</span><strong>SEMIFINAIS</strong></div>${s.map((m,i)=>bracketMatch(m||{},`SF ${String(i+1).padStart(2,"0")}`)).join("")}</div><div class="ccfv-night-bracket-column ccfv-night-bracket-column--final"><div class="ccfv-night-bracket-column__title"><span>03</span><strong>FINAL</strong></div>${f?`<article class="ccfv-night-final-match"><div class="ccfv-night-final-match__crown">✦</div><span class="ccfv-night-final-match__label">ARENA CUP FINAL</span><div class="ccfv-night-final-match__team"><strong>${esc(f.home_team)}</strong><span>${isFinal(f.status)?num(f.home_score):"A DEFINIR"}</span></div><div class="ccfv-night-final-match__vs">VS</div><div class="ccfv-night-final-match__team"><span>${isFinal(f.status)?num(f.away_score):"A DEFINIR"}</span><strong>${esc(f.away_team)}</strong></div><div class="ccfv-night-final-match__champion">🏆 ${esc(winner(f)||"CAMPEÃO A DEFINIR")}</div></article>`:`<div class="ccfv-night-final-match"><div class="ccfv-night-final-match__crown">✦</div><span class="ccfv-night-final-match__label">ARENA CUP FINAL</span><div class="ccfv-night-final-match__team"><strong>A DEFINIR</strong></div><div class="ccfv-night-final-match__vs">VS</div><div class="ccfv-night-final-match__team"><strong>A DEFINIR</strong></div><div class="ccfv-night-final-match__champion">🏆 CAMPEÃO A DEFINIR</div></div>`}</div></div></div>`;
  }

  async function renderAllMatches(){
    const el=document.querySelector("#mobile-all-matches");if(!el)return;
    try{await loadMatches();const list=matches.sort((a,b)=>new Date(b.played_at||b.created_at)-new Date(a.played_at||a.created_at));el.innerHTML=list.length?list.map(m=>`<article class="ccfv-mobile-fixture-card is-finished"><div class="ccfv-mobile-fixture-card__top"><span>${esc(m.competition)}</span><span>${esc(m.status||"FINALIZADA")}</span></div><div class="ccfv-mobile-fixture-card__teams"><div><strong>${esc(m.home_team)}</strong><small>${esc(m.home_player_name||"")}</small></div><div class="ccfv-mobile-fixture-card__score">${num(m.home_score)} <span>×</span> ${num(m.away_score)}</div><div><strong>${esc(m.away_team)}</strong><small>${esc(m.away_player_name||"")}</small></div></div><div class="ccfv-mobile-fixture-card__bottom"><span>${esc(m.stage||"")}</span><span>${new Date(m.played_at||m.created_at||Date.now()).toLocaleString("pt-BR")}</span></div></article>`).join(""):`<div class="ccfv-mobile-empty">NENHUMA PARTIDA MOBILE.</div>`}catch(e){console.error(e);el.innerHTML=`<div class="ccfv-mobile-empty">NÃO FOI POSSÍVEL CARREGAR AS PARTIDAS MOBILE.</div>`}
  }

  function bindDirectorySearch(){const i=document.querySelector("#mobile-player-search");if(i&&!i.dataset.bound){i.dataset.bound="true";i.addEventListener("input",renderPlayerDirectory)}}

  async function boot(){
    const page=document.body.dataset.mobilePage; if(!page)return;
    const s=document.createElement("script");
    s.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    s.onload=async()=>{
      try {
        await loadMatches();
        if(page==="brasileirao") await renderMobileBrasileirao(1);
        if(page==="ranking") { await loadRanking(); renderMobileRankingPage(); }
        if(page==="jogadores") { await loadRanking(); renderPlayerDirectory(); bindDirectorySearch(); }
        if(page==="arena") renderArena();
        if(page==="partidas") renderAllMatches();
      } catch(e) { console.error("CCFV MOBILE",e); }
    };
    document.head.appendChild(s);
  }

  boot();
})();
