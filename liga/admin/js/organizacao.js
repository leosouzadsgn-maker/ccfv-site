(() => {
  "use strict";

  const SUPABASE_URL = "https://msqvkcnywokhakmqgiso.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_sanJ5WpLoquv4JH2ryYR6w_LxdaS2Q2";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
  const normalize = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim();

  let db = null;
  let seasons = [];
  let season = null;
  let enrollments = [];
  let ranking = [];
  let competitions = [];
  let eliteParticipants = [];
  let busy = false;

  function toast(message, error = false) {
    const node = $("#module-toast");
    node.textContent = message;
    node.hidden = false;
    node.style.borderColor = error ? "rgba(241,112,112,.4)" : "rgba(214,180,90,.25)";
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { node.hidden = true; }, 5000);
  }

  function showGate(title, message, showLogin = false) {
    $("#access-title").textContent = title;
    $("#access-message").textContent = message;
    $("#access-login").hidden = !showLogin;
    $("#access-screen").hidden = false;
    $("#admin-layout").hidden = true;
  }

  function getRows(payload, keys = []) {
    if (Array.isArray(payload)) return payload;
    if (payload?.success === false) throw new Error(payload.message || "A consulta foi recusada pelo banco.");
    const queue = [payload, payload?.data, payload?.result, payload?.payload];
    for (const item of queue) {
      if (Array.isArray(item)) return item;
      if (item && typeof item === "object") {
        for (const key of [...keys, "items", "rows", "results", "seasons", "clubs", "competitions", "data"]) {
          if (Array.isArray(item[key])) return item[key];
        }
      }
    }
    return [];
  }

  async function rpc(name, args = {}) {
    const { data, error } = await db.rpc(name, args);
    if (error) throw error;
    if (data?.success === false) throw new Error(data.message || `A operação ${name} não foi confirmada.`);
    return data;
  }

  function setImportMessage(message, type = "info") {
    const node = $("#import-message");
    node.textContent = message;
    node.className = `org-message ${type}`;
    node.hidden = false;
  }

  function statusLabel(value) {
    return ({ DRAFT:"RASCUNHO", REGISTRATION:"INSCRIÇÕES ABERTAS", QUALIFIER:"CLASSIFICATÓRIA", ACTIVE:"EM ANDAMENTO", CLOSED:"ENCERRADA", ARCHIVED:"ARQUIVADA", CANCELLED:"CANCELADA" })[String(value || "").toUpperCase()] || String(value || "NÃO INFORMADO");
  }

  function divisionInfo(code) {
    return ({
      SERIE_A: { name:"SÉRIE COLOSSEUM", css:"colosseum", short:"COLOSSEUM" },
      SERIE_B: { name:"SÉRIE GLADIADORES", css:"gladiadores", short:"GLADIADORES" },
      SERIE_C: { name:"SÉRIE LEGIONÁRIOS", css:"legionarios", short:"LEGIONÁRIOS" }
    })[String(code || "").toUpperCase()] || { name:"SEM DIVISÃO", css:"", short:"SEM DIVISÃO" };
  }

  async function loadSeasons() {
    const data = await rpc("ccfv_league_admin_list_seasons", { p_status:null, p_search:null, p_limit:100, p_offset:0 });
    seasons = getRows(data, ["seasons", "items"]);
    const select = $("#season-select");
    const previous = select.value;
    select.innerHTML = `<option value="">Selecione uma temporada</option>` + seasons.map(item => `<option value="${esc(item.id)}">${esc(item.name || item.season_code || "Temporada")} · ${esc(statusLabel(item.status))}</option>`).join("");
    const target = seasons.find(item => String(item.id) === previous) || seasons.find(item => item.status === "REGISTRATION") || seasons.find(item => item.status === "ACTIVE") || seasons[0];
    if (target) {
      select.value = target.id;
      await selectSeason(target.id);
    } else {
      $("#season-status").textContent = "Nenhuma temporada encontrada";
      clearSeasonViews();
    }
  }

  function clearSeasonViews() {
    season = null;
    enrollments = [];
    ranking = [];
    competitions = [];
    eliteParticipants = [];
    $("#confirmed-count").textContent = "0";
    $("#division-state").textContent = "SEM TEMPORADA";
    $("#division-rosters").innerHTML = `<div class="org-empty-card">Crie uma temporada para começar a organizar os clubes.</div>`;
    $("#ranking-panel").hidden = true;
    $("#cup-history").innerHTML = `<div class="org-empty-card">Nenhuma temporada selecionada.</div>`;
    ["cup-inter-list", "cup-elite-list", "cup-integ-list"].forEach(id => $("#" + id).innerHTML = `<div class="org-empty-card">Selecione uma temporada.</div>`);
    ["cup-inter-count", "cup-elite-count", "cup-integ-count"].forEach(id => $("#" + id).textContent = "0");
    $$('[data-generate-draw]').forEach(button => button.disabled = true);
  }

  async function selectSeason(id) {
    season = seasons.find(item => String(item.id) === String(id)) || null;
    if (!season) { clearSeasonViews(); return; }
    $("#season-status").textContent = `${statusLabel(season.status)} · ${season.starts_on || "sem início"} até ${season.ends_on || "sem término"}`;
    await Promise.all([loadEnrollments(), loadCompetitions()]);
    renderDivisionRosters();
    await renderCupParticipants();
  }

  async function loadEnrollments() {
    if (!season) return;
    const data = await rpc("ccfv_league_admin_list_season_clubs_v2", { p_season_id:season.id, p_status:null });
    enrollments = getRows(data, ["items", "season_clubs", "enrollments"]);
    const confirmed = enrollments.filter(item => String(item.status || "").toUpperCase() === "CONFIRMED");
    $("#confirmed-count").textContent = String(confirmed.length);
    $("#division-state").textContent = confirmed.length === 36 && confirmed.every(item => item.division) ? "DIVISÕES PREENCHIDAS" : `${confirmed.length} / 36 CONFIRMADOS`;
  }

  async function loadCompetitions() {
    if (!season) return;
    const data = await rpc("ccfv_league_admin_list_competitions_v2", { p_season_id:season.id });
    competitions = getRows(data, ["items", "competitions"]);
    renderCupHistory();
  }

  function renderDivisionRosters() {
    const host = $("#division-rosters");
    const confirmed = enrollments.filter(item => String(item.status || "").toUpperCase() === "CONFIRMED");
    if (!confirmed.length) {
      host.innerHTML = `<div class="org-empty-card">Nenhuma inscrição confirmada nesta temporada.</div>`;
      return;
    }
    const groups = ["SERIE_A", "SERIE_B", "SERIE_C"];
    host.innerHTML = groups.map(code => {
      const info = divisionInfo(code);
      const rows = confirmed.filter(item => String(item.division || "").toUpperCase() === code)
        .sort((a,b) => Number(a.qualifier_position || 999) - Number(b.qualifier_position || 999));
      return `<article class="org-division-card"><header><div><strong>${info.name}</strong><br><small>${rows.length} DE 12 CLUBES</small></div><strong>${rows.length}/12</strong></header><ol>${rows.length ? rows.map(item => `<li>${esc(item.club_name || item.name || "Clube sem nome")}</li>`).join("") : `<li>Divisão ainda vazia</li>`}</ol></article>`;
    }).join("");
  }

  function parseCSV(text) {
    const source = String(text || "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const firstLine = source.split("\n").find(line => line.trim()) || "";
    const delimiter = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ";" : ",";
    const rows = [];
    let row = [], cell = "", quoted = false;
    for (let i = 0; i < source.length; i++) {
      const char = source[i];
      if (char === '"') {
        if (quoted && source[i + 1] === '"') { cell += '"'; i++; }
        else quoted = !quoted;
      } else if (char === delimiter && !quoted) {
        row.push(cell); cell = "";
      } else if (char === "\n" && !quoted) {
        row.push(cell); cell = "";
        if (row.some(value => String(value).trim() !== "")) rows.push(row);
        row = [];
      } else {
        cell += char;
      }
    }
    row.push(cell);
    if (row.some(value => String(value).trim() !== "")) rows.push(row);
    if (quoted) throw new Error("O CSV contém aspas sem fechamento. Exporte novamente pelo aplicativo local.");
    if (rows.length < 2) throw new Error("O arquivo CSV não possui linhas de classificação.");
    const headers = rows.shift().map(value => normalize(value));
    const index = key => headers.findIndex(value => value === normalize(key));
    const posIndex = index("Posição");
    const clubIndex = index("Clube");
    const groupIndex = index("Grupo");
    const pointsIndex = index("Pontos");
    const tieIndex = index("Empate técnico");
    if (posIndex < 0 || clubIndex < 0) throw new Error("Não encontrei as colunas “Posição” e “Clube”. Use o arquivo CCFV_Classificacao_Final.csv.");
    return rows.map((values, lineIndex) => ({
      position: Number(String(values[posIndex] || "").trim()),
      name: String(values[clubIndex] || "").trim(),
      group: groupIndex >= 0 ? String(values[groupIndex] || "").trim() : "",
      points: pointsIndex >= 0 ? Number(values[pointsIndex] || 0) : 0,
      tied: tieIndex >= 0 && ["SIM", "S", "TRUE", "1"].includes(String(values[tieIndex] || "").trim().toUpperCase()),
      line: lineIndex + 2
    })).filter(row => row.name || row.position);
  }

  function matchCSVToEnrollment(row) {
    const target = normalize(row.name);
    const matches = enrollments.filter(item => normalize(item.club_name || item.name) === target);
    return matches.length === 1 ? matches[0] : null;
  }

  function importRanking(file) {
    if (!season) throw new Error("Selecione uma temporada antes de importar a classificação.");
    if (season.status !== "REGISTRATION") throw new Error("A distribuição inicial só pode ser confirmada enquanto a temporada estiver com INSCRIÇÕES ABERTAS.");
    const confirmed = enrollments.filter(item => String(item.status || "").toUpperCase() === "CONFIRMED");
    if (confirmed.length !== 36) throw new Error(`Esta temporada possui ${confirmed.length} inscrições confirmadas. A distribuição exige exatamente 36.`);
    const inactive = confirmed.filter(item => String(item.club_status || "").toUpperCase() !== "ACTIVE");
    if (inactive.length) throw new Error(`Há ${inactive.length} clube(s) confirmado(s), mas não ativo(s). Corrija os cadastros antes de distribuir.`);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = parseCSV(reader.result);
        if (imported.length !== 36) throw new Error(`O CSV contém ${imported.length} clubes. São necessários exatamente 36.`);
        const positions = imported.map(row => row.position).sort((a,b) => a-b);
        if (positions.some((value,index) => value !== index + 1)) throw new Error("As posições do CSV precisam ser únicas e numeradas de 1 a 36, sem lacunas.");
        const seenNames = new Set();
        const mapped = imported.sort((a,b) => a.position - b.position).map(row => {
          const key = normalize(row.name);
          if (!key || seenNames.has(key)) throw new Error(`Nome de clube vazio ou duplicado no CSV: ${row.name || "linha " + row.line}.`);
          seenNames.add(key);
          const enrollment = matchCSVToEnrollment(row);
          if (!enrollment) throw new Error(`O clube “${row.name}” não foi localizado de forma única nas inscrições confirmadas. Confira se o nome está igual ao cadastro do clube.`);
          return { ...row, enrollment };
        });
        const selectedIds = new Set(mapped.map(row => row.enrollment.id));
        if (selectedIds.size !== 36) throw new Error("Dois nomes do CSV foram associados à mesma inscrição. Revise os nomes dos clubes.");
        ranking = mapped;
        $("#ranking-panel").hidden = false;
        $("#tie-review").checked = false;
        renderRanking();
        const ties = ranking.filter(row => row.tied).length;
        setImportMessage(`CSV validado e associado aos 36 clubes confirmados. ${ties ? `${ties} posição(ões) foram sinalizadas com empate técnico; revise a ordem usando as setas.` : "Nenhum empate técnico foi sinalizado no arquivo."}`, ties ? "info" : "success");
      } catch (error) {
        ranking = [];
        $("#ranking-panel").hidden = true;
        setImportMessage(error.message || "Não foi possível importar o arquivo.", "error");
      }
    };
    reader.onerror = () => setImportMessage("Não foi possível ler o arquivo CSV.", "error");
    reader.readAsText(file, "UTF-8");
  }

  function destinationFor(position) {
    if (position <= 12) return { ...divisionInfo("SERIE_A"), code:"SERIE_A" };
    if (position <= 24) return { ...divisionInfo("SERIE_B"), code:"SERIE_B" };
    return { ...divisionInfo("SERIE_C"), code:"SERIE_C" };
  }

  function renderRanking() {
    const body = $("#ranking-body");
    if (!ranking.length) {
      body.innerHTML = `<tr><td colspan="7" class="org-empty">Nenhuma classificação importada.</td></tr>`;
      $("#assign-divisions").disabled = true;
      return;
    }
    ranking.forEach((row,index) => { row.position = index + 1; });
    body.innerHTML = ranking.map((row,index) => {
      const destination = destinationFor(index + 1);
      return `<tr>
        <td class="rank-cell">${String(index + 1).padStart(2,"0")}</td>
        <td><strong>${esc(row.name)}</strong>${row.tied ? `<div class="tie-cell">EMPATE TÉCNICO NO CSV</div>` : ""}</td>
        <td>${esc(row.enrollment.club_name || row.enrollment.name)}</td>
        <td>${esc(row.group || "—")}</td><td>${Number.isFinite(row.points) ? row.points : 0}</td>
        <td class="move-cell"><span class="division-pill ${destination.css}">${destination.name}</span></td>
        <td><button class="org-move" type="button" data-rank-move="up" data-index="${index}" ${index === 0 ? "disabled" : ""}>↑</button><button class="org-move" type="button" data-rank-move="down" data-index="${index}" ${index === ranking.length - 1 ? "disabled" : ""}>↓</button></td>
      </tr>`;
    }).join("");
    $("#ranking-counter").textContent = `${ranking.length} / 36 CLUBES`;
    $("#count-colosseum").textContent = "12 / 12";
    $("#count-gladiadores").textContent = "12 / 12";
    $("#count-legionarios").textContent = "12 / 12";
    $("#assign-divisions").disabled = !$("#tie-review").checked || ranking.length !== 36;
  }

  function moveRank(index, direction) {
    const target = index + (direction === "up" ? -1 : 1);
    if (target < 0 || target >= ranking.length) return;
    [ranking[index], ranking[target]] = [ranking[target], ranking[index]];
    $("#tie-review").checked = false;
    renderRanking();
  }

  async function assignDivisions() {
    if (!season || ranking.length !== 36) throw new Error("Importe uma classificação completa com 36 clubes.");
    if (season.status !== "REGISTRATION") throw new Error("A temporada precisa estar com inscrições abertas para distribuir as divisões.");
    if (!$("#tie-review").checked) throw new Error("Marque a confirmação de revisão da classificação e dos empates técnicos.");
    const ids = ranking.map(row => row.enrollment.id);
    if (new Set(ids).size !== 36) throw new Error("A lista possui inscrições repetidas.");
    if (!confirm("Confirmar a distribuição oficial? Posições 1–12: Colosseum; 13–24: Gladiadores; 25–36: Legionários. A distribuição ficará registrada no histórico.")) return;
    setBusy(true, "CONFIRMANDO DISTRIBUIÇÃO...");
    try {
      await rpc("ccfv_league_admin_assign_divisions_v2", {
        p_season_id:season.id,
        p_ranked_enrollment_ids:ids,
        p_note:"Distribuição inicial importada do Campeonato Classificatório CCFV; ordem revisada pela administração."
      });
      await loadEnrollments();
      await renderCupParticipants();
      renderDivisionRosters();
      $("#division-state").textContent = "DISTRIBUIÇÃO CONFIRMADA";
      toast("Distribuição das três divisões registrada com sucesso.");
      setImportMessage("Distribuição confirmada. As 36 posições foram registradas no banco e a operação foi auditada.", "success");
    } catch (error) {
      toast(error.message || "Não foi possível confirmar a distribuição.", true);
      setImportMessage(error.message || "Não foi possível confirmar a distribuição.", "error");
    } finally {
      setBusy(false);
    }
  }

  function renderCheckList(hostId, rows, cupCode, disabled = false) {
    const host = $("#" + hostId);
    if (!rows.length) {
      host.innerHTML = `<div class="org-empty-card">Nenhum participante elegível foi encontrado.</div>`;
      return;
    }
    host.innerHTML = rows.map(item => {
      const division = divisionInfo(item.division);
      return `<label class="org-participant"><input type="checkbox" data-cup-check="${cupCode}" value="${esc(item.id)}" checked ${disabled ? "disabled" : ""}><span>${esc(item.club_name || item.name || "Clube")}</span><small>${division.short}</small></label>`;
    }).join("");
  }

  function setCupCount(code, count, expected) {
    const id = code === "INTERDIVISIONAL" ? "cup-inter-count" : code === "ELITE" ? "cup-elite-count" : "cup-integ-count";
    $("#" + id).textContent = `${count} / ${expected}`;
    const button = $(`[data-generate-draw="${code}"]`);
    const existing = competitions.some(item => item.competition_code === code);
    button.disabled = count !== expected || existing || !season || season.status !== "ACTIVE";
  }

  async function renderCupParticipants() {
    const confirmed = enrollments.filter(item => String(item.status || "").toUpperCase() === "CONFIRMED" && String(item.club_status || "").toUpperCase() === "ACTIVE");
    const hasDivisions = confirmed.length === 36 && ["SERIE_A", "SERIE_B", "SERIE_C"].every(code => confirmed.filter(item => item.division === code).length === 12);
    if (!hasDivisions) {
      ["cup-inter-list", "cup-elite-list", "cup-integ-list"].forEach(id => $("#" + id).innerHTML = `<div class="org-empty-card">A distribuição oficial de 36 clubes ainda não foi confirmada.</div>`);
      setCupCount("INTERDIVISIONAL",0,36); setCupCount("ELITE",0,8); setCupCount("INTEGRACAO",0,24);
      return;
    }
    const all = [...confirmed].sort((a,b) => Number(a.qualifier_position || 999) - Number(b.qualifier_position || 999));
    const lower = all.filter(item => ["SERIE_B", "SERIE_C"].includes(item.division));
    renderCheckList("cup-inter-list", all, "INTERDIVISIONAL", true);
    renderCheckList("cup-integ-list", lower, "INTEGRACAO", true);
    setCupCount("INTERDIVISIONAL",all.length,36);
    setCupCount("INTEGRACAO",lower.length,24);

    const leagueA = competitions.find(item => item.competition_code === "LEAGUE_A" && item.competition_type === "LEAGUE");
    eliteParticipants = [];
    if (leagueA && Number(leagueA.played_count) === 132) {
      try {
        const data = await rpc("ccfv_league_admin_get_standings_v2", { p_competition_id:leagueA.id });
        const rows = getRows(data, ["items", "standings"]);
        eliteParticipants = rows.slice(0,8).map(row => ({ id:row.enrollment_id, club_name:row.club_name, division:"SERIE_A" }));
        renderCheckList("cup-elite-list", eliteParticipants, "ELITE", true);
        setCupCount("ELITE",eliteParticipants.length,8);
      } catch (error) {
        $("#cup-elite-list").innerHTML = `<div class="org-empty-card">Falha ao calcular a classificação da Colosseum: ${esc(error.message)}</div>`;
        setCupCount("ELITE",0,8);
      }
    } else {
      const played = leagueA ? Number(leagueA.played_count || 0) : 0;
      $("#cup-elite-list").innerHTML = `<div class="org-empty-card">${leagueA ? `A Colosseum possui ${played}/132 resultados. A Copa Elite será liberada após os 132 jogos das 22 rodadas.` : "Gere o calendário do Campeonato CCFV e registre os 132 resultados da Colosseum para definir os oito classificados."}</div>`;
      setCupCount("ELITE",0,8);
    }
  }

  function renderCupHistory() {
    const host = $("#cup-history");
    const cups = competitions.filter(item => item.competition_type === "CUP");
    $("#cup-history-count").textContent = `${cups.length} / 3 COPAS`;
    if (!cups.length) {
      host.innerHTML = `<div class="org-empty-card">Nenhuma copa gerada nesta temporada.</div>`;
      return;
    }
    const labels = { INTERDIVISIONAL:"COPA INTERDIVISIONAL", ELITE:"COPA ELITE", INTEGRACAO:"COPA INTEGRAÇÃO" };
    host.innerHTML = `<div class="org-cup-history">${cups.map(item => `<article><b>${labels[item.competition_code] || esc(item.name)}</b><span>${esc(item.status)} · ${Number(item.played_count || 0)}/${Number(item.matches_count || 0)} resultados</span><a href="/liga/admin/index.html?module=competicoes&tab=matches">ABRIR PARTIDAS →</a></article>`).join("")}</div>`;
  }

  async function generateCupDraw(code) {
    if (!season) throw new Error("Selecione uma temporada.");
    if (season.status !== "ACTIVE") throw new Error("A temporada precisa estar EM ANDAMENTO para gerar as copas.");
    const expected = code === "INTERDIVISIONAL" ? 36 : code === "ELITE" ? 8 : 24;
    const selected = $$(`[data-cup-check="${code}"]:checked`).map(node => node.value);
    if (selected.length !== expected) throw new Error(`A ${code} exige ${expected} participantes; encontrados ${selected.length}.`);
    const labels = { INTERDIVISIONAL:"Copa Interdivisional", ELITE:"Copa Elite", INTEGRACAO:"Copa Integração" };
    if (!confirm(`Realizar o sorteio da ${labels[code]}? O banco vai sortear os participantes e criar a primeira fase. Depois disso, a chave fica congelada e não poderá ser sorteada novamente.`)) return;
    setBusy(true, "REALIZANDO SORTEIO...");
    try {
      const data = await rpc("ccfv_league_admin_generate_cup_draw_v2", {
        p_season_id:season.id,
        p_cup_code:code,
        p_selected_enrollment_ids:selected
      });
      await loadCompetitions();
      await renderCupParticipants();
      const resultNode = $(code === "INTERDIVISIONAL" ? "#cup-inter-result" : code === "ELITE" ? "#cup-elite-result" : "#cup-integ-result");
      resultNode.textContent = `Sorteio concluído. ${data.first_round_matches || 0} confronto(s) gerado(s) na primeira fase.`;
      await showFirstDraw(data.competition_id, resultNode);
      toast(`${labels[code]} sorteada e registrada com sucesso.`);
    } catch (error) {
      toast(error.message || "Não foi possível concluir o sorteio.", true);
    } finally {
      setBusy(false);
    }
  }

  async function showFirstDraw(competitionId, host) {
    const data = await rpc("ccfv_league_admin_list_matches_v2", { p_competition_id:competitionId, p_round_number:1 });
    const matches = getRows(data, ["items", "matches"]);
    if (!matches.length) return;
    const list = matches.map((match,index) => `${index + 1}. ${match.home_name} × ${match.away_name}`).join(" · ");
    host.textContent += ` Confrontos: ${list}`;
  }

  function setBusy(value, label = "PROCESSANDO...") {
    busy = value;
    $$('button').forEach(button => {
      if (button.dataset.originalText === undefined) button.dataset.originalText = button.textContent;
      if (value && (button.id === "assign-divisions" || button.matches("[data-generate-draw]"))) {
        button.disabled = true;
        button.textContent = label;
      }
      if (!value && (button.id === "assign-divisions" || button.matches("[data-generate-draw]"))) {
        button.textContent = button.dataset.originalText;
      }
    });
    if (!value) {
      if (ranking.length) $("#assign-divisions").disabled = !$("#tie-review").checked;
      renderCupButtonsState();
    }
  }

  function renderCupButtonsState() {
    if (!season) return;
    const confirmed = enrollments.filter(item => String(item.status || "").toUpperCase() === "CONFIRMED" && String(item.club_status || "").toUpperCase() === "ACTIVE");
    const inter = confirmed.filter(item => item.division && ["SERIE_A","SERIE_B","SERIE_C"].includes(item.division));
    const lower = confirmed.filter(item => ["SERIE_B","SERIE_C"].includes(item.division));
    setCupCount("INTERDIVISIONAL",inter.length,36);
    setCupCount("INTEGRACAO",lower.length,24);
    const eliteCode = competitions.find(item => item.competition_code === "LEAGUE_A");
    setCupCount("ELITE",eliteParticipants.length,8);
  }

  function bind() {
    $("#season-select").addEventListener("change", async event => {
      try { await selectSeason(event.target.value); }
      catch (error) { toast(error.message || "Falha ao carregar a temporada.", true); }
    });
    $("#ranking-file").addEventListener("change", event => {
      const file = event.target.files?.[0];
      if (file) importRanking(file);
      event.target.value = "";
    });
    $("#tie-review").addEventListener("change", renderRanking);
    $("#ranking-body").addEventListener("click", event => {
      const button = event.target.closest("[data-rank-move]");
      if (button) moveRank(Number(button.dataset.index), button.dataset.rankMove);
    });
    $("#clear-ranking").addEventListener("click", () => {
      if (!confirm("Limpar somente a prévia importada? A distribuição já gravada no banco não será alterada.")) return;
      ranking = [];
      $("#ranking-panel").hidden = true;
      $("#tie-review").checked = false;
      $("#ranking-file").value = "";
      $("#import-message").hidden = true;
    });
    $("#assign-divisions").addEventListener("click", async () => {
      if (busy) return;
      try { await assignDivisions(); } catch (error) { toast(error.message || "Falha na distribuição.", true); }
    });
    $$("[data-view-tab]").forEach(button => button.addEventListener("click", () => {
      $$("[data-view-tab]").forEach(item => item.classList.toggle("active", item === button));
      $$("[data-view]").forEach(view => {
        const active = view.dataset.view === button.dataset.viewTab;
        view.classList.toggle("active", active);
        view.hidden = !active;
      });
    }));
    $$('[data-generate-draw]').forEach(button => button.addEventListener("click", async () => {
      if (busy) return;
      try { await generateCupDraw(button.dataset.generateDraw); }
      catch (error) { toast(error.message || "Falha no sorteio.", true); }
    }));
    $("#logout-button").addEventListener("click", async buttonEvent => {
      const button = buttonEvent.currentTarget;
      button.disabled = true;
      try {
        const { error } = await db.auth.signOut();
        if (error) throw error;
        location.replace("/admin/login.html");
      } catch (error) {
        button.disabled = false;
        toast(error.message || "Não foi possível sair.", true);
      }
    });
  }

  async function init() {
    bind();
    try {
      if (!window.supabase?.createClient) throw new Error("Biblioteca Supabase indisponível.");
      db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
      });
      const { data:sessionData, error:sessionError } = await db.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData?.session) {
        showGate("Sessão necessária", "Entre primeiro no Admin principal da CCFV.", true);
        return;
      }
      const { data:allowed, error:adminError } = await db.rpc("ccfv_is_admin");
      if (adminError) throw adminError;
      if (!(allowed === true || allowed?.is_admin === true)) {
        showGate("Acesso não autorizado", "Sua conta não possui permissão administrativa para organizar as competições.");
        return;
      }
      $("#admin-email").textContent = sessionData.session.user?.email || "Administrador";
      $("#access-screen").hidden = true;
      $("#admin-layout").hidden = false;
      await loadSeasons();
    } catch (error) {
      console.error("CCFV ORGANIZAÇÃO ESPORTIVA", error);
      showGate("Falha ao carregar organização esportiva", error.message || "Não foi possível iniciar o módulo.");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
  else init();
})();
