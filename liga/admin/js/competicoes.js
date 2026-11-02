(() => {
  "use strict";
  const SUPABASE_URL = "https://msqvkcnywokhakmqgiso.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_sanJ5WpLoquv4JH2ryYR6w_LxdaS2Q2";
  let db = null;
  let seasons = [];
  let enrollments = [];
  let divisionOrder = [];
  let competitions = [];
  let activeMatches = [];
  let selectedCompetition = null;
  let selectedMatchType = null;
  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function toast(message) {
    const node = $("#toast");
    node.textContent = message;
    node.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { node.hidden = true; }, 4500);
  }
  function gate(title, message) {
    $("#gate-title").textContent = title;
    $("#gate-message").textContent = message;
    $("#gate").hidden = false;
    $("#app").hidden = true;
  }
  function showApp() { $("#gate").hidden = true; $("#app").hidden = false; }
  function rpcRows(payload, keys = []) {
    if (Array.isArray(payload)) return payload;
    const queue = [payload, payload?.items, payload?.data, payload?.result];
    for (const obj of queue) {
      if (Array.isArray(obj)) return obj;
      if (obj && typeof obj === "object") {
        for (const key of [...keys,"items","rows","seasons","clubs","competitions","matches","data"]) {
          if (Array.isArray(obj[key])) return obj[key];
        }
      }
    }
    return [];
  }
  function assertSuccess(payload, fallback) {
    if (payload?.success === false) throw new Error(payload.message || fallback);
    return payload;
  }
  async function rpc(name, args = {}) {
    const { data, error } = await db.rpc(name, args);
    if (error) throw error;
    return assertSuccess(data, `A função ${name} não confirmou a operação.`);
  }
  function currentSeasonId() { return $("#season-select").value || null; }
  function seasonLabel(status) {
    return ({DRAFT:"RASCUNHO",REGISTRATION:"INSCRIÇÕES ABERTAS",ACTIVE:"EM ANDAMENTO",CLOSED:"ENCERRADA",ARCHIVED:"ARQUIVADA",CANCELLED:"CANCELADA"})[String(status || "").toUpperCase()] || status || "—";
  }
  function enrollmentLabel(status) {
    return ({PENDING:"AGUARDANDO ANÁLISE",CONFIRMED:"CONFIRMADA",COMPLETED:"CONCLUÍDA",WITHDRAWN:"RETIRADA",DISQUALIFIED:"DESCLASSIFICADA",REPLACED:"SUBSTITUÍDA",PROMOTED:"PROMOVIDA",RELEGATED:"REBAIXADA"})[String(status || "").toUpperCase()] || status || "—";
  }
  function fmtDate(value) {
    if (!value) return "—";
    const d = new Date(`${String(value).slice(0,10)}T12:00:00`);
    return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat("pt-BR").format(d);
  }
  function badge(status) {
    const key = String(status || "").toUpperCase();
    const tone = ["ACTIVE","CONFIRMED","PLAYED","COMPLETED","READY"].includes(key) ? "green" : ["PENDING","DRAFT","REGISTRATION","SCHEDULED","IN_PROGRESS"].includes(key) ? "gold" : ["SUSPENDED","CANCELLED","WITHDRAWN","DISQUALIFIED"].includes(key) ? "red" : "";
    return `<span class="tag ${tone}">${esc(seasonLabel(key) === key ? enrollmentLabel(key) : seasonLabel(key))}</span>`;
  }
  function openTab(tab) {
    const allowed = ["season","enrollments","divisions","championship","cups","matches","standings"];
    if (!allowed.includes(tab)) tab = "season";
    document.querySelectorAll("[data-view]").forEach(node => node.classList.toggle("active", node.dataset.view === tab));
    document.querySelectorAll("[data-tab]").forEach(node => node.classList.toggle("active", node.dataset.tab === tab));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function clubImage(url, name) {
    const src = String(url || "").trim();
    if (/^https:\/\//i.test(src)) return `<img class="team-logo" src="${esc(src)}" alt="Escudo ${esc(name)}" loading="lazy" onerror="this.style.visibility='hidden'">`;
    return `<div class="team-logo fallback-logo">⚽</div>`;
  }

  async function loadSeasons(keepSelection = true) {
    const previous = keepSelection ? currentSeasonId() : null;
    const result = await rpc("ccfv_league_admin_list_seasons", {
      p_status: null, p_search: null, p_limit: 100, p_offset: 0
    });
    seasons = rpcRows(result, ["seasons","items"]);
    const select = $("#season-select");
    select.innerHTML = `<option value="">Selecione uma temporada</option>` + seasons.map(s => `<option value="${esc(s.id)}">${esc(s.name || s.season_code)} · ${esc(seasonLabel(s.status))}</option>`).join("");
    const target = seasons.find(s => s.id === previous) || seasons.find(s => s.status === "REGISTRATION") || seasons.find(s => s.status === "ACTIVE") || seasons[0];
    if (target) select.value = target.id;
    renderSeasonCards();
    return seasons;
  }
  function renderSeasonCards() {
    const list = $("#season-list");
    $("#season-counter").textContent = `${seasons.length} temporada(s)`;
    if (!seasons.length) { list.innerHTML = `<div class="empty">Nenhuma temporada cadastrada ainda.</div>`; return; }
    list.innerHTML = seasons.map(s => {
      let action = "";
      if (s.status === "DRAFT") action = `<button class="btn mini" data-season-status="REGISTRATION" data-season-id="${esc(s.id)}">ABRIR INSCRIÇÕES</button>`;
      else if (s.status === "REGISTRATION") action = `<button class="btn mini" data-season-status="ACTIVE" data-season-id="${esc(s.id)}">INICIAR TEMPORADA</button><button class="btn mini danger" data-season-status="CANCELLED" data-season-id="${esc(s.id)}">CANCELAR</button>`;
      else if (s.status === "ACTIVE") action = `<button class="btn mini secondary" data-season-finalize="${esc(s.id)}">FINALIZAR TEMPORADA</button>`;
      else if (s.status === "CLOSED") action = `<button class="btn mini secondary" data-season-status="ARCHIVED" data-season-id="${esc(s.id)}">ARQUIVAR</button>`;
      return `<article class="data-row"><div class="data-row-main"><div><h3>${esc(s.name || "Temporada")}</h3><p>${esc(s.season_code)} · ${fmtDate(s.starts_on)} até ${fmtDate(s.ends_on)} · ${Number(s.monthly_fee || 0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} · limite ${esc(s.max_clubs || 36)}</p></div></div><div class="row-actions">${badge(s.status)}${s.is_test ? `<span class="tag">TESTE</span>` : ""}${action}</div></article>`;
    }).join("");
  }
  async function createSeason(event) {
    event.preventDefault();
    const button = $("#season-create");
    button.disabled = true; button.textContent = "CRIANDO...";
    try {
      const result = await rpc("ccfv_league_admin_create_season_v2", {
        p_season_code: $("#season-code").value.trim(),
        p_name: $("#season-name").value.trim(),
        p_starts_on: $("#season-start").value,
        p_ends_on: $("#season-end").value,
        p_is_test: $("#season-test").checked
      });
      $("#season-create-form").reset();
      await loadSeasons(false);
      if (result.season_id) $("#season-select").value = result.season_id;
      toast(`Temporada criada: ${result.season_code || result.season_id}. Agora abra as inscrições.`);
      await refreshSeasonData();
    } catch (error) { console.error(error); toast(error.message || "Falha ao criar temporada."); }
    finally { button.disabled = false; button.textContent = "CRIAR TEMPORADA"; }
  }
  async function changeSeasonStatus(id, status) {
    const confirmText = status === "ACTIVE" ? "Iniciar esta temporada? A operação exige 36 clubes confirmados e 12 em cada série." : `Alterar a temporada para ${seasonLabel(status)}?`;
    if (!window.confirm(confirmText)) return;
    try {
      await rpc("ccfv_league_admin_change_season_status_v2", { p_season_id: id, p_new_status: status, p_note: null });
      await loadSeasons(true); await refreshSeasonData(); toast("Status da temporada atualizado.");
    } catch (error) { toast(error.message || "Não foi possível alterar o status."); }
  }


  async function finalizeSeason(id) {
    if (!window.confirm("Finalizar a temporada? O banco exige 396 resultados do Brasileirão e todas as copas geradas concluídas. Serão gravadas as posições finais, os três acessos e os três rebaixamentos por divisão aplicável.")) return;
    try {
      const result = await rpc("ccfv_league_admin_finalize_season_v2", { p_season_id:id, p_note:"Finalização confirmada pelo painel administrativo da Liga." });
      const promoted = (result.movements || []).filter(x=>x.movement==="PROMOTED").length;
      const relegated = (result.movements || []).filter(x=>x.movement==="RELEGATED").length;
      toast(`Temporada encerrada. ${promoted} acessos e ${relegated} rebaixamentos registrados.`);
      await loadSeasons(true); await refreshSeasonData();
    } catch (error) { toast(error.message || "Não foi possível finalizar a temporada."); }
  }

  async function loadEnrollments() {
    const seasonId = currentSeasonId();
    if (!seasonId) { enrollments = []; renderEnrollments(); return; }
    const result = await rpc("ccfv_league_admin_list_season_clubs_v2", { p_season_id: seasonId, p_status: null });
    enrollments = rpcRows(result, ["items"]);
    renderEnrollments();
    divisionOrder = enrollments.filter(e => e.status === "CONFIRMED").sort((a,b) => {
      const ap = Number(a.qualifier_position || 9999), bp = Number(b.qualifier_position || 9999);
      return ap - bp || String(a.created_at || "").localeCompare(String(b.created_at || ""));
    });
    renderDivisionOrder();
  }
  function renderEnrollments() {
    const list = $("#enrollment-list");
    const total = enrollments.length;
    const pending = enrollments.filter(e => e.status === "PENDING").length;
    const confirmed = enrollments.filter(e => e.status === "CONFIRMED").length;
    $("#en-stat-total").textContent = total;
    $("#en-stat-pending").textContent = pending;
    $("#en-stat-confirmed").textContent = confirmed;
    $("#en-stat-other").textContent = total - pending - confirmed;
    if (!total) { list.innerHTML = `<div class="empty">Nenhuma inscrição encontrada para esta temporada.</div>`; return; }
    list.innerHTML = enrollments.map(e => {
      const actions = e.status === "PENDING" ? `<button class="btn mini" data-enrollment-decision="APPROVE" data-enrollment-id="${esc(e.id)}">APROVAR INSCRIÇÃO</button><button class="btn mini danger" data-enrollment-decision="REJECT" data-enrollment-id="${esc(e.id)}">REJEITAR</button>` : "";
      return `<article class="enrollment-row"><div class="data-row-main">${clubImage(e.crest_url,e.club_name)}<div><h3>${esc(e.club_name || "Clube")}</h3><p>${esc(e.city || "Cidade não informada")} · ${esc(e.division || "Sem divisão")} · ordem ${esc(e.qualifier_position || "—")}</p></div></div><div class="row-actions">${badge(e.status)}${badge(e.club_status)}${actions}</div></article>`;
    }).join("");
  }
  async function decideEnrollment(id, decision) {
    const note = window.prompt(decision === "APPROVE" ? "Observação da aprovação (opcional):" : "Justificativa para rejeitar a inscrição:", "");
    if (note === null) return;
    try {
      await rpc("ccfv_league_admin_decide_season_club_v2", { p_enrollment_id:id, p_decision:decision, p_note:note || null });
      await loadEnrollments(); await loadCompetitions();
      toast(decision === "APPROVE" ? "Inscrição confirmada." : "Inscrição retirada e decisão auditada.");
    } catch (error) { toast(error.message || "Não foi possível decidir a inscrição."); }
  }

  function renderDivisionOrder() {
    const list = $("#division-list");
    const count = divisionOrder.length;
    $("#division-counter").textContent = `${count} / 36`;
    const a = Math.min(count,12), b = Math.max(0,Math.min(count-12,12)), c = Math.max(0,count-24);
    $("#division-summary").innerHTML = `<div><b>${a} / 12</b>SÉRIE A</div><div><b>${b} / 12</b>SÉRIE B</div><div><b>${c} / 12</b>SÉRIE C</div>`;
    if (!count) { list.innerHTML = `<div class="empty">Nenhuma inscrição confirmada ainda. Aprove os clubes primeiro.</div>`; return; }
    list.innerHTML = divisionOrder.map((e,i) => {
      const series = i < 12 ? "SÉRIE A" : i < 24 ? "SÉRIE B" : "SÉRIE C";
      return `<div class="rank-row"><span class="rank-number">${String(i+1).padStart(2,"0")}</span>${clubImage(e.crest_url,e.club_name)}<div><b>${esc(e.club_name)}</b><small>${series} · ${esc(e.city || "Cidade não informada")}</small></div><div class="rank-controls"><button type="button" data-move-rank="up" data-index="${i}" title="Subir" ${i===0?"disabled":""}>↑</button><button type="button" data-move-rank="down" data-index="${i}" title="Descer" ${i===count-1?"disabled":""}>↓</button></div></div>`;
    }).join("");
  }
  function moveRank(index, direction) {
    const next = index + (direction === "up" ? -1 : 1);
    if (next < 0 || next >= divisionOrder.length) return;
    [divisionOrder[index],divisionOrder[next]] = [divisionOrder[next],divisionOrder[index]];
    renderDivisionOrder();
  }
  async function saveDivisions() {
    if (divisionOrder.length !== 36) { toast(`A distribuição exige 36 inscrições confirmadas. Atualmente: ${divisionOrder.length}.`); return; }
    if (!window.confirm("Confirmar a distribuição? Posições 1–12: A; 13–24: B; 25–36: C.")) return;
    try {
      const ids = divisionOrder.map(e => e.id);
      const result = await rpc("ccfv_league_admin_assign_divisions_v2", {
        p_season_id:currentSeasonId(), p_ranked_enrollment_ids:ids, p_note:"Distribuição confirmada pelo painel administrativo da Liga."
      });
      toast(`Distribuição concluída: A ${result.serie_a}/12 · B ${result.serie_b}/12 · C ${result.serie_c}/12.`);
      await loadEnrollments();
    } catch (error) { toast(error.message || "Não foi possível distribuir as divisões."); }
  }

  async function loadCompetitions() {
    if (!currentSeasonId()) { competitions=[]; renderCompetitionLists(); return; }
    const result = await rpc("ccfv_league_admin_list_competitions_v2", { p_season_id:currentSeasonId() });
    competitions = rpcRows(result,["items"]);
    renderCompetitionLists();
    fillCompetitionSelects();
  }
  function competitionName(c) { return c.name || c.competition_code || "Competição"; }
  function renderCompetitionLists() {
    const leagues = competitions.filter(c => c.competition_type === "LEAGUE");
    const cups = competitions.filter(c => c.competition_type === "CUP");
    $("#league-competitions").innerHTML = leagues.length ? leagues.map(c => `<article class="competition-row"><div><h3>${esc(competitionName(c))}</h3><p>${esc(c.division_code || "Divisão")} · ${c.played_count || 0}/${c.matches_count || 0} resultados</p></div><div class="row-actions">${badge(c.status)}<button class="btn mini secondary" data-open-competition="${esc(c.id)}" data-open-tab="matches">PARTIDAS</button><button class="btn mini secondary" data-open-competition="${esc(c.id)}" data-open-tab="standings">CLASSIFICAÇÃO</button></div></article>`).join("") : `<div class="empty">Calendário ainda não gerado para esta temporada.</div>`;
    $("#cup-competitions").innerHTML = cups.length ? cups.map(c => `<article class="competition-row"><div><h3>${esc(competitionName(c))}</h3><p>${esc(c.competition_code)} · ${c.played_count || 0}/${c.matches_count || 0} resultados</p></div><div class="row-actions">${badge(c.status)}<button class="btn mini secondary" data-open-competition="${esc(c.id)}" data-open-tab="matches">ABRIR CHAVE</button>${c.status !== "COMPLETED" ? `<button class="btn mini" data-advance-cup="${esc(c.id)}">GERAR PRÓXIMA FASE</button>` : ""}</div></article>`).join("") : `<div class="empty">Nenhuma copa gerada para esta temporada.</div>`;
  }
  function fillCompetitionSelects() {
    const matchSelect = $("#match-competition");
    const standingsSelect = $("#standings-competition");
    const oldMatch = matchSelect.value, oldStandings = standingsSelect.value;
    matchSelect.innerHTML = `<option value="">Selecione uma competição</option>` + competitions.map(c => `<option value="${esc(c.id)}">${esc(competitionName(c))}</option>`).join("");
    standingsSelect.innerHTML = `<option value="">Selecione uma série</option>` + competitions.filter(c => c.competition_type === "LEAGUE").map(c => `<option value="${esc(c.id)}">${esc(competitionName(c))}</option>`).join("");
    if (competitions.some(c => c.id === oldMatch)) matchSelect.value = oldMatch;
    if (competitions.some(c => c.id === oldStandings)) standingsSelect.value = oldStandings;
  }
  async function generateLeague() {
    if (!currentSeasonId()) { toast("Selecione uma temporada."); return; }
    if (!window.confirm("Gerar as três divisões? Serão criadas 396 partidas (132 por série). Essa ação só pode ser executada uma vez por temporada.")) return;
    const button=$("#generate-league"); button.disabled=true; button.textContent="GERANDO...";
    try { const result=await rpc("ccfv_league_admin_generate_league_schedule_v2",{p_season_id:currentSeasonId()}); toast(`${result.matches_created} partidas geradas com sucesso.`); await loadCompetitions(); }
    catch(error){toast(error.message || "Falha ao gerar o calendário.");}
    finally{button.disabled=false;button.textContent="GERAR 396 PARTIDAS";}
  }
  async function generateCup(code) {
    if (!currentSeasonId()) { toast("Selecione uma temporada."); return; }
    const labels={INTERDIVISIONAL:"Copa Interdivisional",ELITE:"Copa Elite",INTEGRACAO:"Copa Integração"};
    if (!window.confirm(`Gerar ${labels[code]} para esta temporada? A chave será congelada a partir dos participantes e critérios atuais.`)) return;
    try { const result=await rpc("ccfv_league_admin_generate_cup_v2",{p_season_id:currentSeasonId(),p_cup_code:code}); toast(`${labels[code]} gerada. Partidas da primeira fase: ${result.first_round_matches}.`); await loadCompetitions(); }
    catch(error){toast(error.message || "Falha ao gerar a copa.");}
  }
  async function advanceCup(id) {
    if (!window.confirm("Gerar a próxima fase? Todas as partidas da fase atual precisam ter resultado registrado.")) return;
    try { const result=await rpc("ccfv_league_admin_advance_cup_v2",{p_competition_id:id}); toast(result.completed ? "Copa concluída. Campeão registrado." : `Próxima fase gerada: ${result.stage_code}.`); await loadCompetitions(); }
    catch(error){toast(error.message || "Não foi possível avançar a copa.");}
  }

  async function loadMatches() {
    const compId = $("#match-competition").value;
    if (!compId) { $("#match-list").innerHTML = `<div class="empty">Selecione uma competição.</div>`; return; }
    const round = $("#match-round").value;
    $("#match-list").innerHTML = `<div class="empty">Consultando partidas...</div>`;
    try {
      const result = await rpc("ccfv_league_admin_list_matches_v2",{p_competition_id:compId,p_round_number:round ? Number(round) : null});
      activeMatches = rpcRows(result,["items"]);
      selectedCompetition = competitions.find(c=>c.id===compId) || null;
      renderMatches();
      const allRounds = [...new Set(activeMatches.map(m=>Number(m.round_number)))].sort((a,b)=>a-b);
      const currentRound = round;
      $("#match-round").innerHTML = `<option value="">Todas</option>`+allRounds.map(n=>`<option value="${n}">Rodada / fase ${n}</option>`).join("");
      if (currentRound) $("#match-round").value=currentRound;
    } catch(error) { $("#match-list").innerHTML=`<div class="empty">${esc(error.message || "Falha ao carregar partidas.")}</div>`; }
  }
  function renderMatches() {
    const list=$("#match-list");
    if(!activeMatches.length){list.innerHTML=`<div class="empty">Nenhuma partida encontrada para esta competição/fase.</div>`;return;}
    const isCup=selectedCompetition?.competition_type==="CUP";
    list.innerHTML=activeMatches.map(m=>{
      const played=m.status==="PLAYED";
      const score=played?`${m.home_goals} × ${m.away_goals}${m.home_penalties!==null && m.home_penalties!==undefined ? ` (${m.home_penalties} × ${m.away_penalties} pen.)` : ""}`:"VS";
      const scheduleValue=m.scheduled_at?new Date(m.scheduled_at).toISOString().slice(0,16):"";
      return `<article class="match-card" data-match-card="${esc(m.id)}">
        <div class="match-top"><small>${esc(m.stage_code)} · JOGO ${String(m.match_number).padStart(2,"0")} · FASE ${m.round_number}</small>${badge(m.status)}</div>
        <div class="match-teams"><div class="team">${clubImage(m.home_crest_url,m.home_name)}<span>${esc(m.home_name)}</span></div><strong class="versus">${esc(score)}</strong><div class="team away">${clubImage(m.away_crest_url,m.away_name)}<span>${esc(m.away_name)}</span></div></div>
        ${m.result_note?`<p class="match-note">Observação: ${esc(m.result_note)}</p>`:""}
        ${m.status!=="CANCELLED"?`<div class="match-actions"><div class="match-inputs"><label>DATA/HORA<input type="datetime-local" data-schedule-value value="${esc(scheduleValue)}" ${played?"disabled":""}></label><button class="btn mini secondary" data-save-schedule="${esc(m.id)}" ${played?"disabled":""}>SALVAR AGENDA</button></div>
        <form class="match-inputs" data-result-form="${esc(m.id)}"><label>GOLS CASA<input type="number" min="0" max="99" name="home_goals" required ${played?`value="${m.home_goals}"`:""}></label><label>GOLS FORA<input type="number" min="0" max="99" name="away_goals" required ${played?`value="${m.away_goals}"`:""}></label>${isCup?`<label>PÊNALTIS CASA<input type="number" min="0" max="99" name="home_penalties" ${m.home_penalties!==null&&m.home_penalties!==undefined?`value="${m.home_penalties}"`:""}></label><label>PÊNALTIS FORA<input type="number" min="0" max="99" name="away_penalties" ${m.away_penalties!==null&&m.away_penalties!==undefined?`value="${m.away_penalties}"`:""}></label>`:""}<button class="btn mini" type="submit">${played?"CORRIGIR RESULTADO":"REGISTRAR RESULTADO"}</button></form></div>`:""}
      </article>`;
    }).join("");
  }
  async function saveSchedule(id, card) {
    const value=card.querySelector("[data-schedule-value]")?.value;
    if(!value){toast("Informe a data e o horário.");return;}
    const date=new Date(value);
    if(Number.isNaN(date.getTime())){toast("Data/hora inválida.");return;}
    try{await rpc("ccfv_league_admin_schedule_match_v2",{p_match_id:id,p_scheduled_at:date.toISOString(),p_note:null});toast("Partida agendada.");await loadMatches();}
    catch(error){toast(error.message||"Falha ao agendar partida.");}
  }
  async function saveResult(event, form) {
    event.preventDefault();
    const fd=new FormData(form);
    const integer=(key)=>{const val=fd.get(key);return val==null||String(val).trim()===""?null:Number(val);};
    const home=integer("home_goals"), away=integer("away_goals");
    if(home===null||away===null||home<0||away<0){toast("Informe um placar válido.");return;}
    const hpen=integer("home_penalties"), apen=integer("away_penalties");
    const old=activeMatches.find(m=>m.id===form.dataset.resultForm);
    let note=null;
    if(old?.status==="PLAYED"){
      note=window.prompt("Justificativa obrigatória para corrigir um resultado já lançado:","");
      if(note===null)return;
      if(!note.trim()){toast("Informe a justificativa da correção.");return;}
    } else note="Resultado conferido pela administração da Liga CCFV.";
    try{
      await rpc("ccfv_league_admin_record_match_result_v2",{
        p_match_id:form.dataset.resultForm,p_home_goals:home,p_away_goals:away,
        p_home_penalties:hpen,p_away_penalties:apen,p_note:note
      });
      toast("Resultado registrado e enviado para a auditoria.");
      await loadMatches(); await loadCompetitions();
    }catch(error){toast(error.message||"Falha ao registrar resultado.");}
  }

  async function loadStandings() {
    const id=$("#standings-competition").value;
    if(!id){$("#standings-list").innerHTML=`<div class="empty">Selecione uma divisão.</div>`;return;}
    $("#standings-list").innerHTML=`<div class="empty">Calculando classificação...</div>`;
    try{
      const result=await rpc("ccfv_league_admin_get_standings_v2",{p_competition_id:id});
      const rows=rpcRows(result,["items"]);
      if(!rows.length){$("#standings-list").innerHTML=`<div class="empty">Nenhum participante encontrado.</div>`;return;}
      $("#standings-list").innerHTML=`<table><thead><tr><th>#</th><th>CLUBE</th><th>PTS</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${r.position}</b></td><td><div class="data-row-main">${clubImage(r.crest_url,r.club_name)}<b>${esc(r.club_name)}</b></div></td><td><b>${r.points}</b></td><td>${r.played}</td><td>${r.wins}</td><td>${r.draws}</td><td>${r.losses}</td><td>${r.goals_for}</td><td>${r.goals_against}</td><td>${r.goal_difference>0?`+${r.goal_difference}`:r.goal_difference}</td></tr>`).join("")}</tbody></table>`;
    }catch(error){$("#standings-list").innerHTML=`<div class="empty">${esc(error.message||"Falha ao calcular classificação.")}</div>`;}
  }

  async function refreshSeasonData() {
    if(!currentSeasonId()){
      enrollments=[];competitions=[];renderEnrollments();renderDivisionOrder();renderCompetitionLists();fillCompetitionSelects();return;
    }
    try{await loadEnrollments();}catch(error){console.error(error);$("#enrollment-list").innerHTML=`<div class="empty">${esc(error.message)}</div>`;}
    try{await loadCompetitions();}catch(error){console.error(error);toast(error.message||"Falha ao carregar competições.");}
  }
  async function refreshAll() {
    try{await loadSeasons(true);await refreshSeasonData();toast("Dados atualizados.");}
    catch(error){toast(error.message||"Falha ao atualizar os dados.");}
  }
  function bindEvents() {
    document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>openTab(b.dataset.tab)));
    $("#season-create-form").addEventListener("submit",createSeason);
    $("#season-select").addEventListener("change",refreshSeasonData);
    $("#refresh-all").addEventListener("click",refreshAll);
    $("#reload-enrollments").addEventListener("click",loadEnrollments);
    $("#save-divisions").addEventListener("click",saveDivisions);
    $("#generate-league").addEventListener("click",generateLeague);
    $("#reload-cups").addEventListener("click",loadCompetitions);
    $("#load-matches").addEventListener("click",loadMatches);
    $("#match-competition").addEventListener("change",()=>{$("#match-round").innerHTML='<option value="">Todas</option>';loadMatches();});
    $("#match-round").addEventListener("change",loadMatches);
    $("#load-standings").addEventListener("click",loadStandings);
    $("#season-list").addEventListener("click",event=>{const f=event.target.closest("[data-season-finalize]");if(f){finalizeSeason(f.dataset.seasonFinalize);return;}const b=event.target.closest("[data-season-status]");if(b)changeSeasonStatus(b.dataset.seasonId,b.dataset.seasonStatus);});
    $("#enrollment-list").addEventListener("click",event=>{const b=event.target.closest("[data-enrollment-decision]");if(b)decideEnrollment(b.dataset.enrollmentId,b.dataset.enrollmentDecision);});
    $("#division-list").addEventListener("click",event=>{const b=event.target.closest("[data-move-rank]");if(b)moveRank(Number(b.dataset.index),b.dataset.moveRank);});
    document.querySelectorAll("[data-generate-cup]").forEach(b=>b.addEventListener("click",()=>generateCup(b.dataset.generateCup)));
    document.body.addEventListener("click",event=>{
      const adv=event.target.closest("[data-advance-cup]");if(adv){advanceCup(adv.dataset.advanceCup);return;}
      const open=event.target.closest("[data-open-competition]");if(open){
        if(open.dataset.openTab==="matches"){$("#match-competition").value=open.dataset.openCompetition;openTab("matches");loadMatches();}
        else{$("#standings-competition").value=open.dataset.openCompetition;openTab("standings");loadStandings();}
      }
      const sched=event.target.closest("[data-save-schedule]");if(sched){saveSchedule(sched.dataset.saveSchedule,sched.closest("[data-match-card]"));}
    });
    $("#match-list").addEventListener("submit",event=>{const form=event.target.closest("[data-result-form]");if(form)saveResult(event,form);});
    $("#logout").addEventListener("click",async()=>{const {error}=await db.auth.signOut();if(error){toast(error.message);return;}location.href="/admin/login.html";});
  }
  async function init() {
    bindEvents();
    if(!window.supabase?.createClient){gate("Biblioteca indisponível","Não foi possível carregar o Supabase JS v2.");return;}
    db=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    try{
      const {data:sessionData,error:sessionError}=await db.auth.getSession();
      if(sessionError)throw sessionError;
      if(!sessionData?.session){gate("Sessão necessária","Entre primeiro no Admin principal da CCFV.");return;}
      const {data:allowed,error:adminError}=await db.rpc("ccfv_is_admin");
      if(adminError)throw adminError;
      if(!(allowed===true||allowed?.is_admin===true)){gate("Acesso não autorizado","Sua conta não possui permissão administrativa para operar as competições.");return;}
      $("#admin-email").textContent=sessionData.session.user?.email||"Administrador";
      showApp();
      await loadSeasons(false);
      await refreshSeasonData();
      const requested=new URLSearchParams(location.search).get("tab");
      if(requested)openTab(requested);
    }catch(error){console.error("CCFV LEAGUE COMPETITION ENGINE",error);gate("Falha ao carregar o motor",error.message||"Erro desconhecido.");}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
