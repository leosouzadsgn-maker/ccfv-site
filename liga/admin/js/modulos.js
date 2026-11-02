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


  async function init() {
    bindEvents();
    try {
      const allowed = await verifyAdmin();
      if (!allowed) return;
      if (document.body.dataset.page === "clubes") initClubsModule();
      console.info("CCFV LIGA ADMIN // PÁGINA CARREGADA:", document.body.dataset.page || "módulo");
    } catch (error) {
      console.error("CCFV LIGA ADMIN // ERRO DE ACESSO", error);
      deny("Não foi possível validar seu acesso: " + (error?.message || "erro desconhecido."));
    }
  }
  init();
})();
