/* CCFV LIGA — AÇÕES ADMINISTRATIVAS DE CLUBES
   Usa exclusivamente as RPCs protegidas já existentes no Supabase.
   APPROVE / REJECT: ccfv_league_admin_review_club
   SUSPEND / REACTIVATE: ccfv_league_admin_change_club_status
*/
(() => {
  "use strict";

  const SUPABASE_URL = "https://msqvkcnywokhakmqgiso.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_sanJ5WpLoquv4JH2ryYR6w_LxdaS2Q2";
  const $ = (selector) => document.querySelector(selector);

  let client = null;
  let currentClub = null;
  let actionBusy = false;
  let observer = null;

  function ensureStyles() {
    if (document.getElementById("club-admin-actions-styles")) return;
    const style = document.createElement("style");
    style.id = "club-admin-actions-styles";
    style.textContent = `
      .club-admin-actions{margin-top:18px;padding:16px;border:1px solid rgba(214,180,90,.22);border-radius:10px;background:rgba(214,180,90,.035)}
      .club-admin-actions h3{margin:0 0 7px;color:#d6b45a;font-size:10px;font-weight:950;letter-spacing:.12em}
      .club-admin-actions p{margin:0 0 12px;color:#9aa89d;font-size:9px;line-height:1.65}
      .club-admin-actions textarea{display:block;width:100%;min-height:65px;margin:0 0 11px;padding:10px;border:1px solid rgba(255,255,255,.12);border-radius:7px;background:#07110b;color:#f5f8f5;font:inherit;font-size:10px;resize:vertical;outline:none}
      .club-admin-actions textarea:focus{border-color:rgba(37,201,133,.55)}
      .club-admin-actions .club-action-buttons{display:flex;flex-wrap:wrap;gap:8px}
      .club-admin-actions button{min-height:36px;padding:0 13px;border:1px solid transparent;border-radius:7px;font-size:8px;font-weight:950;letter-spacing:.07em;cursor:pointer}
      .club-admin-actions button:disabled{opacity:.45;cursor:not-allowed}
      .club-admin-actions .approve{background:#45d99a;color:#031008}
      .club-admin-actions .reject,.club-admin-actions .suspend{background:rgba(220,85,85,.12);border-color:rgba(220,85,85,.3);color:#ffaaaa}
      .club-admin-actions .reactivate{background:rgba(37,201,133,.1);border-color:rgba(37,201,133,.3);color:#70e8ad}
      .club-admin-actions .hint{margin-top:10px;color:#d6b45a;font-size:8px;line-height:1.6}
      .club-admin-actions .result{margin-top:10px;padding:9px 10px;border-radius:7px;background:rgba(255,255,255,.04);color:#dbe9df;font-size:9px;line-height:1.6}
    `;
    document.head.appendChild(style);
  }

  async function getClient() {
    if (client) return client;
    if (window.CCFVLigaAdminSupabase) {
      client = window.CCFVLigaAdminSupabase;
    } else {
      if (!window.supabase?.createClient) throw new Error("Biblioteca Supabase indisponível.");
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    }

    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData?.session) throw new Error("Sua sessão administrativa expirou. Entre novamente no Admin CCFV.");

    const { data: adminData, error: adminError } = await client.rpc("ccfv_is_admin");
    if (adminError) throw adminError;
    if (!(adminData === true || adminData?.is_admin === true)) {
      throw new Error("Sua conta não possui autorização administrativa para esta operação.");
    }
    return client;
  }

  function extractClubs(payload) {
    if (Array.isArray(payload)) return payload;
    const candidates = [
      payload?.clubs, payload?.items, payload?.results, payload?.rows,
      payload?.data, payload?.data?.clubs, payload?.data?.items,
      payload?.result?.clubs, payload?.result?.items
    ];
    return candidates.find(Array.isArray) || null;
  }

  async function loadClubBySlug(slug) {
    const supabase = await getClient();
    const { data, error } = await supabase.rpc("ccfv_league_admin_list_clubs", {
      p_status: null,
      p_search: null,
      p_limit: 100,
      p_offset: 0
    });
    if (error) throw error;
    if (data?.success === false) throw new Error(data?.message || "Não foi possível consultar o clube.");
    const rows = extractClubs(data);
    if (!rows) throw new Error("A RPC de listagem não retornou a lista de clubes esperada.");
    const club = rows.find((item) => String(item?.slug || "").toLowerCase() === String(slug || "").toLowerCase());
    if (!club) throw new Error("Não localizei o clube selecionado. Feche os detalhes e atualize a lista.");
    return club;
  }

  function setResult(message, isError = false) {
    const node = $("#club-action-result");
    if (!node) return;
    node.textContent = message;
    node.style.color = isError ? "#ffaaaa" : "#dbe9df";
    node.hidden = false;
  }

  function renderActions(club) {
    const host = $("#club-admin-actions");
    if (!host) return;
    currentClub = club;
    const status = String(club?.status || "").toUpperCase();
    const crest = String(club?.crest_url || "").trim();

    let explanation = "As decisões são registradas no histórico administrativo da Liga.";
    let buttons = "";
    let hint = "";

    if (status === "DRAFT") {
      explanation = "Este clube está aguardando análise. Confira nome, responsável, escudo e identidade antes de decidir.";
      buttons = `
        <button type="button" class="approve" data-club-action="APPROVE" ${crest ? "" : "disabled"}>APROVAR CLUBE</button>
        <button type="button" class="reject" data-club-action="REJECT">REJEITAR CLUBE</button>`;
      if (!crest) hint = "Para aprovar, o clube precisa cadastrar um escudo. A própria RPC também valida se o responsável continua ativo na CCFV.";
    } else if (status === "ACTIVE") {
      explanation = "Este clube já está aprovado e pode participar das temporadas conforme as regras da Liga.";
      buttons = `<button type="button" class="suspend" data-club-action="SUSPEND">SUSPENDER CLUBE</button>`;
    } else if (status === "SUSPENDED") {
      explanation = "Este clube está suspenso. A reativação exige proprietário CCFV ativo e escudo cadastrado.";
      buttons = `<button type="button" class="reactivate" data-club-action="REACTIVATE">REATIVAR CLUBE</button>`;
    } else if (status === "INACTIVE") {
      explanation = "Este clube está inativo/rejeitado. A função administrativa atual não oferece reativação direta. O responsável poderá corrigir os dados e reenviar para análise pelo painel do participante.";
      hint = "Não tente reativar editando diretamente a tabela. O reenvio do responsável muda o estado para DRAFT pela RPC própria.";
    } else {
      explanation = `Status atual: ${status || "não informado"}. Não há ação administrativa configurada para este estado.`;
    }

    host.innerHTML = `
      <h3>DECISÃO ADMINISTRATIVA</h3>
      <p>${explanation}</p>
      <textarea id="club-action-note" maxlength="500" placeholder="Observação ou justificativa (opcional, até 500 caracteres)"></textarea>
      <div class="club-action-buttons">${buttons}</div>
      ${hint ? `<div class="hint">${hint}</div>` : ""}
      <div class="result" id="club-action-result" role="status" hidden></div>
    `;
  }

  function actionConfirmation(action, clubName) {
    const messages = {
      APPROVE: `Confirma a aprovação de ${clubName}? O clube passará para ACTIVE.`,
      REJECT: `Confirma a rejeição de ${clubName}? O clube passará para INACTIVE.`,
      SUSPEND: `Confirma a suspensão de ${clubName}? O clube deixará de estar ativo.`,
      REACTIVATE: `Confirma a reativação de ${clubName}? O clube voltará para ACTIVE.`
    };
    return window.confirm(messages[action] || "Confirma esta ação?");
  }

  async function executeAction(action, button) {
    if (!currentClub?.id || actionBusy) return;
    const note = String($("#club-action-note")?.value || "").trim();
    if (note.length > 500) {
      setResult("A observação deve ter até 500 caracteres.", true);
      return;
    }
    if (!actionConfirmation(action, currentClub.name || "este clube")) return;

    actionBusy = true;
    const buttons = document.querySelectorAll("#club-admin-actions button");
    buttons.forEach((item) => { item.disabled = true; });
    const original = button.textContent;
    button.textContent = "PROCESSANDO...";

    try {
      const supabase = await getClient();
      let data, error;

      if (action === "APPROVE" || action === "REJECT") {
        ({ data, error } = await supabase.rpc("ccfv_league_admin_review_club", {
          p_club_id: currentClub.id,
          p_decision: action,
          p_note: note || null
        }));
      } else {
        ({ data, error } = await supabase.rpc("ccfv_league_admin_change_club_status", {
          p_club_id: currentClub.id,
          p_action: action,
          p_note: note || null
        }));
      }

      if (error) throw error;
      if (data?.success !== true) throw new Error(data?.message || "O banco não confirmou a operação.");

      const newStatus = String(data.status || "").toUpperCase();
      const messages = {
        APPROVE: "Clube aprovado com sucesso. Status: ACTIVE.",
        REJECT: "Clube rejeitado. Status: INACTIVE.",
        SUSPEND: "Clube suspenso com sucesso.",
        REACTIVATE: "Clube reativado com sucesso. Status: ACTIVE."
      };
      setResult(`${messages[action]} ${newStatus ? `(${newStatus})` : ""}`);
      const refresh = $("#clubs-refresh");
      if (refresh) refresh.click();
      window.setTimeout(() => {
        const backdrop = $("#club-detail-modal");
        if (backdrop) backdrop.hidden = true;
      }, 1000);
    } catch (error) {
      console.error("CCFV LIGA ADMIN // AÇÃO DO CLUBE", error);
      setResult(error?.message || "Não foi possível concluir a operação.", true);
      buttons.forEach((item) => { item.disabled = false; });
      button.textContent = original;
    } finally {
      actionBusy = false;
    }
  }

  function bindActionEvents() {
    const host = $("#club-admin-actions");
    if (!host || host.dataset.bound === "1") return;
    host.dataset.bound = "1";
    host.addEventListener("click", (event) => {
      const button = event.target.closest("[data-club-action]");
      if (!button || button.disabled) return;
      executeAction(button.dataset.clubAction, button);
    });
  }

  async function handleModalOpen() {
    const modal = $("#club-detail-modal");
    if (!modal || modal.hidden) return;
    const host = $("#club-admin-actions");
    const note = modal.querySelector(".club-modal-note");
    if (note) note.hidden = true;
    if (host) host.innerHTML = `<h3>DECISÃO ADMINISTRATIVA</h3><p>Consultando situação atual do clube...</p>`;

    try {
      const slug = String($("#club-modal-slug")?.textContent || "").trim();
      if (!slug || slug === "Não informado") throw new Error("O identificador do clube não foi encontrado no modal.");
      const club = await loadClubBySlug(slug);
      renderActions(club);
    } catch (error) {
      console.error("CCFV LIGA ADMIN // CARREGAR AÇÕES DO CLUBE", error);
      if (host) host.innerHTML = `<h3>AÇÕES ADMINISTRATIVAS</h3><p>${String(error?.message || "Não foi possível carregar as ações.")}</p>`;
    }
  }

  async function init() {
    ensureStyles();
    bindActionEvents();
    const modal = $("#club-detail-modal");
    if (!modal) return;
    try {
      await getClient();
    } catch (error) {
      console.error("CCFV LIGA ADMIN // AUTORIZAÇÃO DAS AÇÕES", error);
      const host = $("#club-admin-actions");
      if (host) host.textContent = error?.message || "Não foi possível validar a autorização administrativa.";
      return;
    }
    observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.attributeName === "hidden") && !modal.hidden) {
        handleModalOpen();
      }
    });
    observer.observe(modal, { attributes: true, attributeFilter: ["hidden"] });
    if (!modal.hidden) handleModalOpen();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
