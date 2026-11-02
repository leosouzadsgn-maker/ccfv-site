(() => {
  "use strict";
  const SUPABASE_URL = "https://msqvkcnywokhakmqgiso.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_sanJ5WpLoquv4JH2ryYR6w_LxdaS2Q2";
  let client = null;
  const $ = (selector) => document.querySelector(selector);

  async function getClient() {
    if (client) return client;
    if (!window.supabase?.createClient) throw new Error("Biblioteca Supabase indisponível.");
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    window.CCFVLigaAdminSupabase = client;
    return client;
  }

  function deny(message, showLogin = false) {
    const screen = $("#access-screen");
    if (!screen) return;
    $("#access-title").textContent = "Acesso não autorizado";
    $("#access-message").textContent = message;
    $("#access-login").hidden = !showLogin;
    screen.hidden = false;
    $("#admin-layout").hidden = true;
  }

  async function verifyAdmin() {
    const supabase = await getClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const session = sessionData?.session;
    if (!session) {
      deny("Entre primeiro no Admin principal da CCFV.", true);
      return false;
    }
    const { data, error } = await supabase.rpc("ccfv_is_admin");
    if (error) throw error;
    const allowed = data === true || data?.is_admin === true;
    if (!allowed) {
      deny("Sua conta não possui autorização administrativa para gerenciar a Liga.");
      return false;
    }
    const email = $("#admin-email");
    if (email) email.textContent = session.user?.email || "Administrador";
    $("#access-screen").hidden = true;
    $("#admin-layout").hidden = false;
    return true;
  }

  function toast(message) {
    let node = $("#module-toast");
    if (!node) {
      node = document.createElement("div");
      node.id = "module-toast";
      node.className = "toast";
      node.hidden = true;
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.hidden = false;
    window.clearTimeout(node._timer);
    node._timer = window.setTimeout(() => { node.hidden = true; }, 4200);
  }

  function bindEvents() {
    $("#logout-button")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = "SAINDO...";
      try {
        const supabase = await getClient();
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        window.location.replace("/admin/login.html");
      } catch (error) {
        console.error("CCFV LIGA ADMIN // LOGOUT", error);
        button.disabled = false;
        button.textContent = "SAIR";
        toast("Não foi possível encerrar a sessão. Tente novamente.");
      }
    });
    document.querySelectorAll("[data-pending-action]").forEach((button) => {
      button.addEventListener("click", () => {
        toast("Tela estrutural pronta. A gravação será ativada depois de conectarmos esta ação à função segura do banco.");
      });
    });
    document.querySelectorAll("[data-static-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        button.parentElement?.querySelectorAll("[data-static-filter]").forEach((item) => item.classList.toggle("active", item === button));
      });
    });
  }



  /* =====================================================
     MÓDULO CLUBES — CONSULTA ADMINISTRATIVA
     A listagem é somente leitura nesta etapa.
     As ações de aprovação/status serão ligadas após validar
     os valores permitidos pelas respectivas RPCs.
     ===================================================== */
  let clubsCache = [];
  let clubsFilter = "ALL";
  let clubsFiltered = [];

  const clubText = (value, fallback = "Não informado") => {
    const text = String(value ?? "").trim();
    return text || fallback;
  };

  const clubEscape = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const clubStatus = (club) => String(club?.status ?? "DRAFT").trim().toUpperCase();

  const clubStatusLabel = (status) => ({
    DRAFT: "RASCUNHO / EM ANÁLISE",
    ACTIVE: "ATIVO",
    INACTIVE: "INATIVO",
    ARCHIVED: "ARQUIVADO",
    PENDING: "PENDENTE",
    REJECTED: "REJEITADO"
  }[status] || status || "NÃO INFORMADO");

  const clubOwner = (club) => {
    const nested = club?.player || club?.players || club?.owner || club?.responsible || {};
    return club?.owner_name || club?.player_name || club?.owner_player_name ||
      club?.responsible_name || nested?.name || nested?.player_name || "Responsável não informado";
  };

  const clubCity = (club) => [club?.city, club?.region].filter(Boolean).join(" / ") || "Cidade não informada";

  const clubDate = (value) => {
    if (!value) return "Não informado";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Data inválida";
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
  };

  const clubSafeImage = (value) => {
    const url = String(value ?? "").trim();
    if (!url) return "";
    if (/^https:\/\//i.test(url) || /^http:\/\//i.test(url) || url.startsWith("/")) return url;
    return "";
  };

  function extractClubRows(payload) {
    if (Array.isArray(payload)) return payload;
    const candidates = [
      payload?.clubs,
      payload?.items,
      payload?.results,
      payload?.rows,
      payload?.data,
      payload?.data?.clubs,
      payload?.data?.items,
      payload?.result?.clubs
    ];
    return candidates.find(Array.isArray) || null;
  }

  function clubState(message, title = "") {
    const list = $("#clubs-list");
    if (!list) return;
    list.innerHTML = `<div class="clubs-state">${title ? `<strong>${clubEscape(title)}</strong>` : ""}<p>${clubEscape(message)}</p></div>`;
  }

  function updateClubStats() {
    const count = (status) => clubsCache.filter((club) => clubStatus(club) === status).length;
    $("#clubs-stat-total").textContent = String(clubsCache.length);
    $("#clubs-stat-active").textContent = String(count("ACTIVE"));
    $("#clubs-stat-draft").textContent = String(count("DRAFT"));
    $("#clubs-stat-inactive").textContent = String(count("INACTIVE") + count("ARCHIVED"));
  }

  function getFilteredClubs() {
    const term = String($("#clubs-search")?.value || "").trim().toLocaleLowerCase("pt-BR");
    return clubsCache.filter((club) => {
      const status = clubStatus(club);
      const matchesStatus = clubsFilter === "ALL" || status === clubsFilter;
      const values = [club?.name, club?.short_name, club?.slug, clubOwner(club), club?.player_code,
        club?.owner_player_code, club?.city, club?.region, club?.motto]
        .filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
      return matchesStatus && (!term || values.includes(term));
    });
  }

  function renderClubs() {
    const list = $("#clubs-list");
    if (!list) return;
    clubsFiltered = getFilteredClubs();
    $("#clubs-counter").textContent = `${clubsFiltered.length} de ${clubsCache.length} clube(s)`;

    if (!clubsFiltered.length) {
      clubState(clubsCache.length ? "Nenhum clube corresponde aos filtros selecionados." : "A função administrativa não retornou clubes.",
        clubsCache.length ? "Nenhum resultado" : "Base de clubes vazia");
      return;
    }

    list.innerHTML = clubsFiltered.map((club, index) => {
      const name = clubText(club?.name, "Clube sem nome");
      const shortName = clubText(club?.short_name, "—");
      const crest = clubSafeImage(club?.crest_url);
      const status = clubStatus(club);
      const owner = clubOwner(club);
      const city = clubCity(club);
      const colors = [club?.primary_color, club?.secondary_color, club?.accent_color]
        .filter((color) => /^#[0-9a-f]{6}$/i.test(String(color || "")));
      const marker = colors.length ? `<span class="club-color-mark" style="--club-mark:${clubEscape(colors[0])}"></span>` : "";
      const crestHTML = crest
        ? `<img src="${clubEscape(crest)}" alt="Escudo de ${clubEscape(name)}" loading="lazy" referrerpolicy="no-referrer">`
        : `<span>${clubEscape((shortName !== "—" ? shortName : name).slice(0, 2).toUpperCase())}</span>`;
      return `<article class="club-row">
        <div class="club-main">
          <div class="club-crest">${crestHTML}</div>
          <div class="club-meta">
            <h3>${clubEscape(name)} ${marker}</h3>
            <small>${clubEscape(shortName)} · ${clubEscape(clubText(club?.slug, "sem-identificador"))}</small>
            <div class="club-meta-line"><span class="club-owner">${clubEscape(owner)}</span><span class="club-city">${clubEscape(city)}</span></div>
          </div>
        </div>
        <div class="club-row-side">
          <span class="club-status ${clubEscape(status.toLowerCase())}">${clubEscape(clubStatusLabel(status))}</span>
          <button class="club-view" type="button" data-club-details="${index}">VER DETALHES</button>
        </div>
      </article>`;
    }).join("");
  }

  function openClubDetails(index) {
    const club = clubsFiltered[index];
    if (!club) return;
    const put = (selector, value) => { const node = $(selector); if (node) node.textContent = clubText(value); };
    put("#club-modal-title", club?.name || "Clube sem nome");
    put("#club-modal-short", club?.short_name);
    put("#club-modal-owner", clubOwner(club));
    put("#club-modal-city", clubCity(club));
    put("#club-modal-founded", club?.founded_year);
    put("#club-modal-slug", club?.slug);
    put("#club-modal-created", clubDate(club?.created_at));
    put("#club-modal-status", clubStatusLabel(clubStatus(club)));
    put("#club-modal-description", club?.description || "Sem descrição cadastrada.");

    const crest = $("#club-modal-crest");
    const crestURL = clubSafeImage(club?.crest_url);
    if (crest && crestURL) { crest.src = crestURL; crest.hidden = false; }
    else if (crest) { crest.removeAttribute("src"); crest.hidden = true; }

    const setColor = (selector, value) => {
      const node = $(selector);
      node.style.background = /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : "#111a14";
    };
    setColor("#club-color-primary", club?.primary_color);
    setColor("#club-color-secondary", club?.secondary_color);
    setColor("#club-color-accent", club?.accent_color);

    const motto = $("#club-modal-motto");
    motto.textContent = club?.motto || "";
    motto.hidden = !club?.motto;
    $("#club-detail-modal").hidden = false;
  }

  async function loadClubs() {
    const refresh = $("#clubs-refresh");
    if (refresh) { refresh.disabled = true; refresh.textContent = "CONSULTANDO..."; }
    clubState("Consultando a base de clubes no Supabase...");
    try {
      const supabase = await getClient();
      const { data, error } = await supabase.rpc("ccfv_league_admin_list_clubs", {
        p_status: null,
        p_search: null,
        p_limit: 100,
        p_offset: 0
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data?.message || "A consulta administrativa foi recusada.");
      const rows = extractClubRows(data);
      if (!rows) {
        console.error("CCFV LIGA ADMIN // FORMATO DA RPC DE CLUBES", data);
        throw new Error("A função respondeu, mas o formato da lista ainda precisa ser confirmado. Consulte o console do navegador.");
      }
      clubsCache = rows;
      updateClubStats();
      renderClubs();
      console.info("CCFV LIGA ADMIN // CLUBES CARREGADOS", { total: rows.length, response: data });
    } catch (error) {
      console.error("CCFV LIGA ADMIN // ERRO AO CARREGAR CLUBES", error);
      clubState(error?.message || "Não foi possível carregar a base de clubes.", "Falha na consulta");
      $("#clubs-counter").textContent = "FALHA NA CONSULTA";
      toast(error?.message || "Erro ao consultar clubes.");
    } finally {
      if (refresh) { refresh.disabled = false; refresh.textContent = "↻ ATUALIZAR CLUBES"; }
    }
  }

  function initClubsModule() {
    $("#clubs-refresh")?.addEventListener("click", loadClubs);
    $("#clubs-search")?.addEventListener("input", renderClubs);
    document.querySelectorAll("[data-club-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        clubsFilter = button.dataset.clubFilter || "ALL";
        document.querySelectorAll("[data-club-filter]").forEach((item) => item.classList.toggle("active", item === button));
        renderClubs();
      });
    });
    $("#clubs-list")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-club-details]");
      if (button) openClubDetails(Number(button.dataset.clubDetails));
    });
    const closeModal = () => { $("#club-detail-modal").hidden = true; };
    $("#club-modal-close")?.addEventListener("click", closeModal);
    $("#club-detail-modal")?.addEventListener("click", (event) => {
      if (event.target.id === "club-detail-modal") closeModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && $("#club-detail-modal") && !$("#club-detail-modal").hidden) closeModal();
    });
    loadClubs();
  }


  /* =====================================================
     MÓDULOS DE LEITURA — TEMPORADAS / INSCRIÇÕES / DIVISÕES
     As ações de gravação permanecem deliberadamente bloqueadas
     até validar o corpo das RPCs e suas regras de negócio.
     ===================================================== */
  let seasonsCache = [];
  let seasonRowsCache = [];
  let seasonFilter = "ALL";
  let enrollmentFilter = "ALL";
  let divisionRowsCache = [];
  let auditRowsCache = [];

  function unwrapRows(payload, keys = []) {
    if (Array.isArray(payload)) return payload;
    const queue = [payload, payload?.data, payload?.result, payload?.payload];
    for (const object of queue) {
      if (Array.isArray(object)) return object;
      if (!object || typeof object !== "object") continue;
      for (const key of [...keys, "items", "rows", "results", "records", "data"]) {
        if (Array.isArray(object[key])) return object[key];
      }
    }
    return null;
  }

  function assertRpcSuccess(payload, fallback) {
    if (payload?.success === false) throw new Error(payload?.message || fallback);
  }

  const seasonValue = (row, ...keys) => {
    for (const key of keys) {
      const value = row?.[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return null;
  };

  const seasonDate = (value, withTime = false) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("pt-BR", withTime
      ? { dateStyle: "short", timeStyle: "short" }
      : { dateStyle: "short" }).format(date);
  };

  const seasonStatusLabel = (value) => ({
    DRAFT: "RASCUNHO", REGISTRATION: "INSCRIÇÕES ABERTAS", QUALIFIER: "CLASSIFICATÓRIA",
    TEST: "TEMPORADA TESTE", ACTIVE: "EM ANDAMENTO", CLOSED: "ENCERRADA",
    ARCHIVED: "ARQUIVADA", CANCELLED: "CANCELADA"
  }[String(value || "").toUpperCase()] || String(value || "NÃO INFORMADO"));

  const enrollmentStatusLabel = (value) => ({
    PENDING: "AGUARDANDO ANÁLISE", ACTIVE: "CONFIRMADA", WITHDRAWN: "DESISTÊNCIA",
    REPLACED: "SUBSTITUÍDA", PROMOTED: "PROMOVIDA", RELEGATED: "REBAIXADA"
  }[String(value || "").toUpperCase()] || String(value || "NÃO INFORMADO"));

  async function fetchSeasons(force = false) {
    if (seasonsCache.length && !force) return seasonsCache;
    const supabase = await getClient();
    const { data, error } = await supabase.rpc("ccfv_league_admin_list_seasons", {
      p_status: null, p_search: null, p_limit: 100, p_offset: 0
    });
    if (error) throw error;
    assertRpcSuccess(data, "A consulta de temporadas foi recusada.");
    const rows = unwrapRows(data, ["seasons", "temporadas"]);
    if (!rows) {
      console.error("CCFV LIGA // RESPOSTA LIST_SEASONS", data);
      throw new Error("A RPC respondeu, mas o formato da lista de temporadas ainda precisa ser conferido.");
    }
    seasonsCache = rows;
    return seasonsCache;
  }

  function seasonIdOf(row) {
    return seasonValue(row, "id", "season_id");
  }

  function renderSeasonRows() {
    const node = $("#seasons-list");
    if (!node) return;
    const term = String($("#seasons-search")?.value || "").trim().toLocaleLowerCase("pt-BR");
    const rows = seasonsCache.filter((row) => {
      const status = String(seasonValue(row, "status") || "").toUpperCase();
      const matchStatus = seasonFilter === "ALL" || status === seasonFilter;
      const haystack = [seasonValue(row,"name"), seasonValue(row,"season_code"), status]
        .filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
      return matchStatus && (!term || haystack.includes(term));
    });
    $("#seasons-counter").textContent = `${rows.length} de ${seasonsCache.length} temporada(s)`;
    const count = (status) => seasonsCache.filter(r => String(seasonValue(r,"status") || "").toUpperCase() === status).length;
    if ($("#seasons-stat-total")) $("#seasons-stat-total").textContent = seasonsCache.length;
    if ($("#seasons-stat-open")) $("#seasons-stat-open").textContent = count("REGISTRATION");
    if ($("#seasons-stat-active")) $("#seasons-stat-active").textContent = count("ACTIVE") + count("TEST") + count("QUALIFIER");
    if ($("#seasons-stat-closed")) $("#seasons-stat-closed").textContent = count("CLOSED") + count("ARCHIVED");
    if (!rows.length) {
      node.innerHTML = `<div class="empty"><div class="empty-icon">▦</div><h3>${seasonsCache.length ? "Nenhum resultado" : "Nenhuma temporada cadastrada"}</h3><p>${seasonsCache.length ? "Altere os filtros para consultar outros ciclos." : "A lista administrativa não retornou temporadas."}</p></div>`;
      return;
    }
    node.innerHTML = rows.map((row) => {
      const status = String(seasonValue(row,"status") || "").toUpperCase();
      const rawTest = seasonValue(row,"is_test");
      const test = rawTest === true || String(rawTest).toLowerCase() === "true" || rawTest === 1;
      return `<article class="data-card">
        <div class="data-card-head"><div><span class="eyebrow">${clubEscape(seasonValue(row,"season_code") || "CÓDIGO NÃO INFORMADO")}</span><h3>${clubEscape(seasonValue(row,"name") || "Temporada sem nome")}</h3></div><span class="status ${clubEscape(status.toLowerCase())}">${clubEscape(seasonStatusLabel(status))}</span></div>
        <div class="data-card-grid">
          <div><small>INÍCIO</small><strong>${clubEscape(seasonDate(seasonValue(row,"starts_on")))}</strong></div>
          <div><small>ENCERRAMENTO</small><strong>${clubEscape(seasonDate(seasonValue(row,"ends_on")))}</strong></div>
          <div><small>TIPO</small><strong>${test ? "TEMPORADA TESTE" : "TEMPORADA REGULAR"}</strong></div>
          <div><small>MENSALIDADE REGISTRADA</small><strong>${seasonValue(row,"monthly_fee") == null ? "Não retornada" : clubEscape(new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(seasonValue(row,"monthly_fee"))))}</strong></div>
        </div>
      </article>`;
    }).join("");
  }

  async function loadSeasons(force = false) {
    const button = $("#seasons-refresh");
    if (button) { button.disabled = true; button.textContent = "CONSULTANDO..."; }
    const node = $("#seasons-list");
    if (node) node.innerHTML = `<div class="loading-state"><p>Consultando temporadas no Supabase...</p></div>`;
    try {
      await fetchSeasons(force);
      seasonRowsCache = seasonsCache;
      renderSeasonRows();
      console.info("CCFV LIGA // TEMPORADAS", seasonsCache);
    } catch (error) {
      console.error("CCFV LIGA // ERRO TEMPORADAS", error);
      if (node) node.innerHTML = `<div class="error-state"><h3>Falha ao consultar temporadas</h3><p>${clubEscape(error.message || "Erro desconhecido")}</p></div>`;
      if ($("#seasons-counter")) $("#seasons-counter").textContent = "FALHA NA CONSULTA";
      toast(error.message || "Não foi possível carregar temporadas.");
    } finally {
      if (button) { button.disabled = false; button.textContent = "↻ ATUALIZAR TEMPORADAS"; }
    }
  }

  function fillSeasonSelect(select, rows, preferredId = null) {
    if (!select) return null;
    const current = preferredId || select.value;
    select.innerHTML = `<option value="">Selecione uma temporada</option>` + rows.map((row) => {
      const id = seasonIdOf(row);
      if (!id) return "";
      const label = `${seasonValue(row,"season_code") || "SEM CÓDIGO"} — ${seasonValue(row,"name") || "Temporada"}`;
      return `<option value="${clubEscape(id)}">${clubEscape(label)}</option>`;
    }).join("");
    if (current && rows.some(row => String(seasonIdOf(row)) === String(current))) select.value = current;
    else if (rows.length) select.value = String(seasonIdOf(rows[0]) || "");
    return select.value || null;
  }

  function initSeasonsModule() {
    $("#seasons-refresh")?.addEventListener("click", () => loadSeasons(true));
    $("#seasons-search")?.addEventListener("input", renderSeasonRows);
    document.querySelectorAll("[data-season-filter]").forEach((button) => button.addEventListener("click", () => {
      seasonFilter = button.dataset.seasonFilter || "ALL";
      document.querySelectorAll("[data-season-filter]").forEach((item) => item.classList.toggle("active", item === button));
      renderSeasonRows();
    }));
    loadSeasons(true);
  }

  async function fetchSeasonClubs(seasonId, status = null, search = null) {
    const supabase = await getClient();
    const { data, error } = await supabase.rpc("ccfv_league_admin_list_season_clubs", {
      p_season_id: seasonId,
      p_status: status,
      p_search: search,
      p_limit: 100,
      p_offset: 0
    });
    if (error) throw error;
    assertRpcSuccess(data, "A consulta de inscrições foi recusada.");
    const rows = unwrapRows(data, ["season_clubs", "enrollments", "inscricoes", "registrations", "clubs"]);
    if (!rows) {
      console.error("CCFV LIGA // RESPOSTA LIST_SEASON_CLUBS", data);
      throw new Error("A RPC respondeu, mas o formato da lista de inscrições ainda precisa ser conferido.");
    }
    return rows;
  }

  function enrollmentName(row) {
    const club = row?.club || row?.clubs || {};
    return seasonValue(row,"club_name_snapshot","club_name","name") || seasonValue(club,"name") || "Clube sem nome";
  }
  function enrollmentCrest(row) {
    const club = row?.club || row?.clubs || {};
    return seasonValue(row,"crest_url_snapshot","crest_url") || seasonValue(club,"crest_url") || "";
  }
  function enrollmentDivision(row) {
    return String(seasonValue(row,"division","division_code") || "NÃO DISTRIBUÍDA").toUpperCase();
  }
  function enrollmentStatus(row) {
    return String(seasonValue(row,"registration_status","status") || "PENDING").toUpperCase();
  }

  async function loadEnrollments() {
    const list = $("#enrollments-list");
    const seasonId = $("#enroll-season")?.value;
    const statusValue = $("#enroll-status")?.value || "ALL";
    const search = String($("#enroll-search")?.value || "").trim() || null;
    if (!seasonId) {
      if (list) list.innerHTML = `<div class="empty"><h3>Selecione uma temporada</h3><p>Escolha um ciclo para consultar as inscrições recebidas.</p></div>`;
      return;
    }
    if (list) list.innerHTML = `<div class="loading-state"><p>Consultando inscrições da temporada...</p></div>`;
    const refresh = $("#enroll-refresh");
    if (refresh) { refresh.disabled = true; refresh.textContent = "CONSULTANDO..."; }
    try {
      seasonRowsCache = await fetchSeasonClubs(seasonId, statusValue === "ALL" ? null : statusValue, search);
      renderEnrollments();
    } catch (error) {
      console.error("CCFV LIGA // ERRO INSCRIÇÕES", error);
      if (list) list.innerHTML = `<div class="error-state"><h3>Falha ao consultar inscrições</h3><p>${clubEscape(error.message || "Erro desconhecido")}</p></div>`;
      toast(error.message || "Não foi possível carregar inscrições.");
    } finally {
      if (refresh) { refresh.disabled = false; refresh.textContent = "↻ ATUALIZAR INSCRIÇÕES"; }
    }
  }

  function renderEnrollments() {
    const list = $("#enrollments-list");
    if (!list) return;
    const term = String($("#enroll-search")?.value || "").trim().toLocaleLowerCase("pt-BR");
    const rows = seasonRowsCache.filter(row => {
      const status = enrollmentStatus(row);
      const search = [enrollmentName(row), seasonValue(row,"player_name"), seasonValue(row,"player_code"), enrollmentDivision(row)]
        .filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
      return (enrollmentFilter === "ALL" || status === enrollmentFilter) && (!term || search.includes(term));
    });
    $("#enroll-counter").textContent = `${rows.length} inscrição(ões)`;
    const count = status => seasonRowsCache.filter(row => enrollmentStatus(row) === status).length;
    if ($("#enroll-stat-total")) $("#enroll-stat-total").textContent = seasonRowsCache.length;
    if ($("#enroll-stat-pending")) $("#enroll-stat-pending").textContent = count("PENDING");
    if ($("#enroll-stat-active")) $("#enroll-stat-active").textContent = count("ACTIVE");
    if ($("#enroll-stat-other")) $("#enroll-stat-other").textContent = seasonRowsCache.length - count("PENDING") - count("ACTIVE");
    if (!rows.length) {
      list.innerHTML = `<div class="empty"><div class="empty-icon">＋</div><h3>Nenhuma inscrição encontrada</h3><p>Não existem registros para a temporada e os filtros selecionados.</p></div>`;
      return;
    }
    list.innerHTML = rows.map(row => {
      const status = enrollmentStatus(row);
      const crest = clubSafeImage(enrollmentCrest(row));
      const crestHtml = crest ? `<img src="${clubEscape(crest)}" alt="" loading="lazy">` : `<span>⚽</span>`;
      const player = seasonValue(row,"player_name","owner_name","responsible_name") || "Jogador não retornado";
      const position = seasonValue(row,"division_position");
      return `<article class="data-card"><div class="data-card-head"><div class="data-card-title"><div class="mini-crest">${crestHtml}</div><div><h3>${clubEscape(enrollmentName(row))}</h3><small>${clubEscape(player)} · ${clubEscape(seasonValue(row,"player_code") || "Código não retornado")}</small></div></div><span class="status ${clubEscape(status.toLowerCase())}">${clubEscape(enrollmentStatusLabel(status))}</span></div><div class="data-card-grid"><div><small>DIVISÃO</small><strong>${clubEscape(enrollmentDivision(row))}</strong></div><div><small>POSIÇÃO</small><strong>${clubEscape(position ?? "A definir")}</strong></div><div><small>INSCRIÇÃO</small><strong>${clubEscape(seasonDate(seasonValue(row,"created_at","requested_at"),true))}</strong></div><div><small>CLUBE / PLAYER ID</small><strong>${clubEscape(seasonValue(row,"club_id") || seasonValue(row,"player_id") || "Não retornado")}</strong></div></div></article>`;
    }).join("");
  }

  async function initEnrollmentsModule() {
    try {
      const seasons = await fetchSeasons(true);
      const selected = fillSeasonSelect($("#enroll-season"), seasons);
      $("#enroll-season")?.addEventListener("change", loadEnrollments);
      $("#enroll-status")?.addEventListener("change", loadEnrollments);
      $("#enroll-search")?.addEventListener("input", () => {
        window.clearTimeout(window.__ccfvEnrollSearchTimer);
        window.__ccfvEnrollSearchTimer = window.setTimeout(loadEnrollments, 250);
      });
      $("#enroll-refresh")?.addEventListener("click", loadEnrollments);
      if (selected) await loadEnrollments();
      else if ($("#enrollments-list")) $("#enrollments-list").innerHTML = `<div class="empty"><h3>Nenhuma temporada disponível</h3><p>Cadastre ou publique uma temporada antes de consultar inscrições.</p></div>`;
    } catch (error) {
      console.error("CCFV LIGA // INIT INSCRIÇÕES", error);
      if ($("#enrollments-list")) $("#enrollments-list").innerHTML = `<div class="error-state"><h3>Falha ao preparar inscrições</h3><p>${clubEscape(error.message || "Erro desconhecido")}</p></div>`;
    }
  }

  function divisionLabel(value) {
    return ({ SERIE_A: "SÉRIE A", SERIE_B: "SÉRIE B", SERIE_C: "SÉRIE C", A: "SÉRIE A", B: "SÉRIE B", C: "SÉRIE C" })[String(value || "").toUpperCase()] || "SEM DIVISÃO";
  }

  async function loadDivisions() {
    const list = $("#divisions-grid");
    const seasonId = $("#division-season")?.value;
    if (!seasonId) {
      if (list) list.innerHTML = `<div class="empty"><h3>Selecione uma temporada</h3><p>As divisões serão exibidas após escolher um ciclo.</p></div>`;
      return;
    }
    if (list) list.innerHTML = `<div class="loading-state"><p>Consultando composição das divisões...</p></div>`;
    const button = $("#division-refresh");
    if (button) { button.disabled = true; button.textContent = "CONSULTANDO..."; }
    try {
      divisionRowsCache = await fetchSeasonClubs(seasonId, null, null);
      renderDivisions();
    } catch (error) {
      console.error("CCFV LIGA // ERRO DIVISÕES", error);
      if (list) list.innerHTML = `<div class="error-state"><h3>Falha ao consultar divisões</h3><p>${clubEscape(error.message || "Erro desconhecido")}</p></div>`;
    } finally {
      if (button) { button.disabled = false; button.textContent = "↻ ATUALIZAR DIVISÕES"; }
    }
  }

  function renderDivisions() {
    const list = $("#divisions-grid");
    if (!list) return;
    const series = [
      { key:"SERIE_A", label:"SÉRIE A", tone:"gold" },
      { key:"SERIE_B", label:"SÉRIE B", tone:"silver" },
      { key:"SERIE_C", label:"SÉRIE C", tone:"bronze" }
    ];
    const assigned = new Set();
    list.innerHTML = series.map(group => {
      const rows = divisionRowsCache.filter(row => {
        const key = enrollmentDivision(row);
        return key === group.key || key === group.key.replace("SERIE_", "");
      }).sort((a,b) => Number(seasonValue(a,"division_position") || 999) - Number(seasonValue(b,"division_position") || 999));
      rows.forEach(row => assigned.add(row));
      const pendingPosition = rows.filter(item => !seasonValue(item,"division_position"));
      const slots = Array.from({length:12}, (_, index) => {
        const position = index + 1;
        const row = rows.find(item => Number(seasonValue(item,"division_position")) === position);
        if (!row) return `<div class="division-slot empty-slot"><span>${String(position).padStart(2,"0")}</span><small>POSIÇÃO NÃO ATRIBUÍDA</small></div>`;
        const crest = clubSafeImage(enrollmentCrest(row));
        return `<div class="division-slot"><span>${String(position).padStart(2,"0")}</span>${crest ? `<img src="${clubEscape(crest)}" alt="" loading="lazy">` : `<i>⚽</i>`}<strong>${clubEscape(enrollmentName(row))}</strong><small>${clubEscape(enrollmentStatusLabel(enrollmentStatus(row)))}</small></div>`;
      }).join("");
      return `<section class="division-card ${group.tone}"><header><div><span class="eyebrow">CCFV // DIVISION</span><h3>${group.label}</h3></div><strong>${rows.length}/12</strong></header><div class="division-slots">${slots}</div>${pendingPosition.length ? `<div class="division-pending-note">${pendingPosition.length} clube(s) na divisão sem posição definida: ${pendingPosition.map(item => clubEscape(enrollmentName(item))).join(", ")}</div>` : ""}</section>`;
    }).join("");
    const unassigned = divisionRowsCache.filter(row => !assigned.has(row) || !["SERIE_A","SERIE_B","SERIE_C","A","B","C"].includes(enrollmentDivision(row)));
    const count = (key) => divisionRowsCache.filter(row => enrollmentDivision(row) === key).length;
    if ($("#division-stat-total")) $("#division-stat-total").textContent = divisionRowsCache.length;
    if ($("#division-stat-a")) $("#division-stat-a").textContent = count("SERIE_A") + count("A");
    if ($("#division-stat-b")) $("#division-stat-b").textContent = count("SERIE_B") + count("B");
    if ($("#division-stat-c")) $("#division-stat-c").textContent = count("SERIE_C") + count("C");
    const unassignedBox = $("#division-unassigned");
    if (unassignedBox) {
      unassignedBox.innerHTML = unassigned.length
        ? unassigned.map(row => `<span>${clubEscape(enrollmentName(row))}</span>`).join("")
        : `<span class="muted-inline">Nenhum clube retornado fora das divisões.</span>`;
    }
  }

  async function initDivisionsModule() {
    try {
      const seasons = await fetchSeasons(true);
      const selected = fillSeasonSelect($("#division-season"), seasons);
      $("#division-season")?.addEventListener("change", loadDivisions);
      $("#division-refresh")?.addEventListener("click", loadDivisions);
      if (selected) await loadDivisions();
      else if ($("#divisions-grid")) $("#divisions-grid").innerHTML = `<div class="empty"><h3>Nenhuma temporada disponível</h3><p>Crie uma temporada para organizar os clubes nas três séries.</p></div>`;
    } catch (error) {
      console.error("CCFV LIGA // INIT DIVISÕES", error);
      if ($("#divisions-grid")) $("#divisions-grid").innerHTML = `<div class="error-state"><h3>Falha ao preparar divisões</h3><p>${clubEscape(error.message || "Erro desconhecido")}</p></div>`;
    }
  }

  async function loadAuditHistory() {
    const list = $("#audit-list");
    const button = $("#audit-refresh");
    if (button) { button.disabled = true; button.textContent = "CONSULTANDO..."; }
    if (list) list.innerHTML = `<div class="loading-state"><p>Consultando trilha de auditoria...</p></div>`;
    try {
      const supabase = await getClient();
      const { data, error } = await supabase.from("ccfv_league_audit_logs")
        .select("id, actor_user_id, season_id, action, entity_type, entity_id, old_data, new_data, metadata, created_at")
        .order("created_at", { ascending:false }).limit(200);
      if (error) throw error;
      auditRowsCache = Array.isArray(data) ? data : [];
      renderAuditHistory();
    } catch (error) {
      console.error("CCFV LIGA // ERRO AUDITORIA", error);
      if (list) list.innerHTML = `<div class="error-state"><h3>Não foi possível consultar a auditoria</h3><p>${clubEscape(error.message || "Erro desconhecido")}</p></div>`;
      toast(error.message || "Falha na consulta da auditoria.");
    } finally {
      if (button) { button.disabled = false; button.textContent = "↻ ATUALIZAR HISTÓRICO"; }
    }
  }

  function renderAuditHistory() {
    const list = $("#audit-list");
    if (!list) return;
    const term = String($("#audit-search")?.value || "").trim().toLocaleLowerCase("pt-BR");
    const type = $("#audit-type")?.value || "ALL";
    const rows = auditRowsCache.filter(row => {
      const typeMatch = type === "ALL" || String(row.entity_type || "").toUpperCase() === type;
      const haystack = [row.action,row.entity_type,row.entity_id,row.actor_user_id,row.season_id,JSON.stringify(row.metadata || {})]
        .filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
      return typeMatch && (!term || haystack.includes(term));
    });
    if ($("#audit-counter")) $("#audit-counter").textContent = `${rows.length} de ${auditRowsCache.length} evento(s)`;
    if (!rows.length) {
      list.innerHTML = `<div class="empty"><div class="empty-icon">◷</div><h3>Nenhum evento encontrado</h3><p>A tabela de auditoria ainda não retornou eventos para os filtros.</p></div>`;
      return;
    }
    list.innerHTML = `<div class="table-wrap"><table><thead><tr><th>DATA</th><th>AÇÃO</th><th>TIPO</th><th>RESPONSÁVEL (UUID)</th><th>ENTIDADE</th><th>OBSERVAÇÃO</th></tr></thead><tbody>${rows.map(row => {
      const note = row.metadata?.note || row.metadata?.reason || row.metadata?.description || "—";
      return `<tr><td>${clubEscape(seasonDate(row.created_at,true))}</td><td><strong>${clubEscape(row.action || "—")}</strong></td><td>${clubEscape(row.entity_type || "—")}</td><td>${clubEscape(row.actor_user_id || "—")}</td><td title="${clubEscape(row.entity_id || "")}">${clubEscape(String(row.entity_id || "—").slice(0,8))}</td><td>${clubEscape(note)}</td></tr>`;
    }).join("")}</tbody></table></div>`;
  }

  function initAuditModule() {
    $("#audit-refresh")?.addEventListener("click", loadAuditHistory);
    $("#audit-search")?.addEventListener("input", renderAuditHistory);
    $("#audit-type")?.addEventListener("change", renderAuditHistory);
    loadAuditHistory();
  }


  async function init() {
    bindEvents();
    try {
      const allowed = await verifyAdmin();
      if (!allowed) return;
      const page = document.body.dataset.page;
      if (page === "clubes") initClubsModule();
      if (page === "temporadas") initSeasonsModule();
      if (page === "inscricoes") await initEnrollmentsModule();
      if (page === "divisoes") await initDivisionsModule();
      if (page === "historico") initAuditModule();
      console.info("CCFV LIGA ADMIN // PÁGINA CARREGADA:", page || "módulo");
    } catch (error) {
      console.error("CCFV LIGA ADMIN // ERRO DE ACESSO", error);
      deny("Não foi possível validar seu acesso: " + (error?.message || "erro desconhecido."));
    }
  }
  init();
})();
