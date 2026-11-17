(() => {
  "use strict";

  const SUPABASE_URL = "https://msqvkcnywokhakmqgiso.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_sanJ5WpLoquv4JH2ryYR6w_LxdaS2Q2";
  const $ = (selector) => document.querySelector(selector);

  function safeImageUrl(value) {
    const url = String(value || "").trim();
    return /^https:\/\//i.test(url) || /^http:\/\//i.test(url) || url.startsWith("/") ? url : "";
  }

  function initials(value) {
    return String(value || "CC").trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase() || "CC";
  }

  function setImage(imageSelector, fallbackSelector, url, alt) {
    const image = $(imageSelector);
    const fallback = $(fallbackSelector);
    const safeUrl = safeImageUrl(url);
    if (safeUrl) {
      image.src = safeUrl;
      image.alt = alt;
      image.hidden = false;
      if (fallback) fallback.hidden = true;
      image.addEventListener("error", () => {
        image.hidden = true;
        if (fallback) fallback.hidden = false;
      }, { once: true });
    } else {
      image.removeAttribute("src");
      image.hidden = true;
      if (fallback) fallback.hidden = false;
    }
  }

  function setText(selector, value, fallback = "") {
    const node = $(selector);
    if (!node) return;
    node.textContent = String(value || fallback);
  }

  function showGate(title, copy, actionsHTML) {
    setText("#profile-gate-title", title);
    setText("#profile-gate-copy", copy);
    if (actionsHTML) $("#profile-gate-actions").innerHTML = actionsHTML;
  }

  function divisionLabel(value) {
    return ({
      SERIE_A: "Série Colosseum",
      SERIE_B: "Série Gladiadores",
      SERIE_C: "Série Legionários"
    })[String(value || "").toUpperCase()] || "Divisão a definir";
  }

  function renderProfile(club) {
    const cover = $("#public-profile-cover");
    const banner = safeImageUrl(club.banner_url);
    if (banner) {
      $("#public-banner").src = banner;
      $("#public-banner").hidden = false;
      cover.classList.add("has-banner");
    }

    const crestFallback = $("#public-crest-fallback");
    crestFallback.textContent = initials(club.short_name || club.name);
    setImage("#public-crest", "#public-crest-fallback", club.crest_url, `Escudo do ${club.name}`);

    const playerFallback = $("#public-player-fallback");
    playerFallback.textContent = initials(club.player_name);
    setImage("#public-player-photo", "#public-player-fallback", club.player_photo_url, `Foto de ${club.player_name}`);

    setText("#public-club-name", club.name, "Clube CCFV");
    setText("#public-player-name", club.player_name, "Participante CCFV");
    setText("#public-club-city", club.city, "Cidade não informada");
    setText("#public-club-division", divisionLabel(club.division));
    setText("#public-club-short", club.short_name, "SIGLA NÃO CADASTRADA");
    setText("#public-club-description", club.description, "Este clube ainda não adicionou uma apresentação.");

    const motto = $("#public-club-motto");
    motto.textContent = club.motto || "";
    motto.hidden = !club.motto;

    const founded = $("#public-club-founded");
    founded.textContent = club.founded_year ? `Fundado em ${club.founded_year}` : "";
    founded.hidden = !club.founded_year;

    const color = (value) => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : "#263b2d";
    $("#public-color-primary").style.background = color(club.primary_color);
    $("#public-color-secondary").style.background = color(club.secondary_color);
    $("#public-color-accent").style.background = color(club.accent_color);
    document.title = `${club.name} — Perfil | Liga CCFV`;
    $("#profile-gate").hidden = true;
    $("#public-profile-page").hidden = false;
  }

  async function init() {
    try {
      if (!window.supabase?.createClient) throw new Error("Não foi possível carregar a conexão com a Liga CCFV.");
      const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData?.session) {
        showGate("Entre na sua conta", "Os perfis dos clubes são uma área da comunidade reservada aos participantes da Liga.", '<a class="btn primary" href="/liga/login.html?view=login">ENTRAR NA LIGA</a><a class="btn ghost" href="/liga/index.html">PORTAL DA LIGA</a>');
        return;
      }

      const slug = new URLSearchParams(window.location.search).get("slug");
      if (!slug) throw new Error("O endereço não identifica um clube.");

      const { data, error } = await client.rpc("ccfv_league_get_public_club_profile", { p_slug: slug });
      if (error) throw error;
      if (data?.success !== true || !data?.club) {
        showGate("Perfil indisponível", data?.message || "Este clube não foi encontrado ou ainda não foi aprovado.");
        return;
      }
      renderProfile(data.club);
    } catch (error) {
      console.error("CCFV PUBLIC CLUB PROFILE", error);
      showGate("Não foi possível abrir o perfil", error?.message || "Ocorreu um erro ao consultar o clube.");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
