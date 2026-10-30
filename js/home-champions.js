(() => {
    "use strict";

    const root = document.querySelector("#home-champions-grid");
    if (!root) return;

    const competitions = [
      { key: "BRASILEIRAO", name: "BRASILEIRÃO", trophy: "assets/images/historia/trofeus/brasileirao.png" },
      { key: "CHAMPIONS", name: "CHAMPIONS LEAGUE", trophy: "assets/images/historia/trofeus/champions-league.png" },
      { key: "NIGHT_CUP", name: "NIGHT CUP", trophy: "assets/images/historia/trofeus/night-cup.png" },
      { key: "LIBERTADORES", name: "LIBERTADORES", trophy: "assets/images/historia/trofeus/libertadores.png" },
      { key: "COPA_DO_MUNDO", name: "COPA DO MUNDO", trophy: "assets/images/historia/trofeus/copa-do-mundo.png" }
    ];

    const escape = function(value) {
      return String(value == null ? "" : value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    };

    const normalize = function(value) {
      return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "_");
    };

    function competitionKey(row) {
      const value = normalize(row.competition_code || row.competition_name || "");
      if (value.includes("CHAMPIONS")) return "CHAMPIONS";
      if (value.includes("NIGHT")) return "NIGHT_CUP";
      if (value.includes("BRASILEIR")) return "BRASILEIRAO";
      if (value.includes("LIBERTADOR")) return "LIBERTADORES";
      if (value.includes("MUNDO") || value.includes("WORLD")) return "COPA_DO_MUNDO";
      return value;
    }

    async function getClient() {
      if (window.CCFVAuth && typeof window.CCFVAuth.getClient === "function") {
        return await window.CCFVAuth.getClient();
      }
      if (!document.querySelector('script[src="/admin/js/auth.js"]')) {
        const script = document.createElement("script");
        script.src = "/admin/js/auth.js";
        script.dataset.homeAuth = "true";
        document.head.appendChild(script);
      }
      const started = Date.now();
      while (!window.CCFVAuth || typeof window.CCFVAuth.getClient !== "function") {
        if (Date.now() - started > 12000) throw new Error("Não foi possível iniciar a conexão pública.");
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return await window.CCFVAuth.getClient();
    }

    function emptyCard(item) {
      return '<article class="ccfv-home-champion-card is-empty">' +
        '<div class="ccfv-home-champion-card__trophy"><img src="/' + escape(item.trophy) + '" alt="Troféu ' + escape(item.name) + '" loading="lazy"></div>' +
        '<div class="ccfv-home-champion-card__copy">' +
          '<span class="ccfv-home-champion-card__eyebrow">' + escape(item.name) + ' · ARQUIVO OFICIAL</span>' +
          '<strong>CAMPEÃO A DEFINIR</strong>' +
          '<small>A próxima conquista será registrada aqui.</small>' +
        '</div></article>';
    }

    function renderCard(config, title, players) {
      if (!title) return emptyCard(config);
      const player = players.get(String(title.player_id || title.participant_id || ""));
      const champion = player && player.name || title.player_name || title.participant_name || title.name || "CAMPEÃO REGISTRADO";
      const club = title.club_name || title.team_name || player && player.team_name || "CCFV";
      const season = title.season_label || title.season || title.season_name || "Temporada oficial";
      const photo = player && player.photo_url || title.photo_url || title.player_photo_url || "";
      const initials = champion.split(/\s+/).slice(0, 2).map(function(part) { return part[0] || ""; }).join("").toUpperCase();
      const photoMarkup = photo
        ? '<img class="ccfv-home-champion-card__photo" src="' + escape(photo) + '" alt="' + escape(champion) + '" loading="lazy">'
        : '<span class="ccfv-home-champion-card__initials">' + escape(initials) + '</span>';

      return '<article class="ccfv-home-champion-card">' +
        '<div class="ccfv-home-champion-card__top"><span>ÚLTIMO CAMPEÃO</span><span class="ccfv-home-champion-card__mark">CCFV</span></div>' +
        '<div class="ccfv-home-champion-card__main">' +
          '<div class="ccfv-home-champion-card__trophy"><img src="/' + escape(config.trophy) + '" alt="Troféu ' + escape(config.name) + '" loading="lazy"></div>' +
          '<div class="ccfv-home-champion-card__identity">' + photoMarkup + '<div><strong>' + escape(champion) + '</strong><small>' + escape(club) + '</small></div></div>' +
        '</div>' +
        '<div class="ccfv-home-champion-card__bottom"><span>' + escape(config.name) + '</span><strong>' + escape(season) + '</strong></div>' +
      '</article>';
    }

    async function load() {
      try {
        const client = await getClient();
        const results = await Promise.all([
          client.from("ccfv_titles").select("*").order("awarded_at", { ascending: false }),
          client.from("players").select("id,name,photo_url,team_name")
        ]);
        const titlesResult = results[0];
        const playersResult = results[1];
        if (titlesResult.error) throw titlesResult.error;
        const titles = Array.isArray(titlesResult.data) ? titlesResult.data : [];
        const playerRows = Array.isArray(playersResult.data) ? playersResult.data : [];
        const players = new Map(playerRows.map(player => [String(player.id), player]));
        titles.sort((a, b) => {
          const dateA = Date.parse(a.awarded_at || a.created_at || "") || 0;
          const dateB = Date.parse(b.awarded_at || b.created_at || "") || 0;
          return dateB - dateA;
        });
        const latest = new Map();
        titles.forEach(title => {
          const key = competitionKey(title);
          if (competitions.some(item => item.key === key) && !latest.has(key)) latest.set(key, title);
        });
        root.innerHTML = competitions.map(item => renderCard(item, latest.get(item.key), players)).join("");
      } catch (error) {
        console.error("CCFV // HOME HALL:", error);
        root.innerHTML = '<div class="ccfv-home-champions__loading is-error">NÃO FOI POSSÍVEL CARREGAR O HALL AGORA. CONSULTE A HISTÓRIA OFICIAL.</div>';
      }
    }

    load();
  })();
