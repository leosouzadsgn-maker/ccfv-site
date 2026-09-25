/* =========================================================
   CCFV LIBERTADORES — ADMIN OPERACIONAL
   Isolado das demais competições.
   ========================================================= */
(() => {
  "use strict";

  const state = { client:null, season:null, seasons:[], clubs:[], matches:[], standings:[], audits:[], players:[] };
  const resultStatuses = ["VALIDATED","WO","ADMIN_DECISION"];
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const esc = (v) => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");

  function message(text, error=false){
    const el=$("#global-message");
    if(!el)return;
    el.hidden=false; el.textContent=text;
    el.style.borderColor=error?"rgba(255,92,104,.35)":"rgba(67,223,145,.25)";
    window.clearTimeout(message._t); message._t=window.setTimeout(()=>{el.hidden=true;},4500);
  }
  function activeSeason(){ return state.season; }
  async function client(){
    if(state.client) return state.client;
    if(!window.CCFVAuth?.getClient) throw new Error("Cliente CCFV indisponível.");
    state.client=await window.CCFVAuth.getClient();
    return state.client;
  }
  function phaseLabel(v){
    const m={REGISTRATIONS:"INSCRIÇÕES",DRAW:"SORTEIO",GROUP_STAGE:"FASE DE GRUPOS",ROUND_OF_16:"OITAVAS",QUARTERFINALS:"QUARTAS",SEMIFINALS:"SEMIFINAIS",FINAL:"FINAL",FINISHED:"ENCERRADA"};
    return m[String(v||"").toUpperCase()]||v||"—";
  }
  function logo(src,name){
    const path=String(src||"").trim();
    return path?`<img class="lib-club-logo" src="${esc(path)}" alt="${esc(name)}" loading="lazy">`:`<span class="lib-club-initials">${esc(String(name||"CC").slice(0,3).toUpperCase())}</span>`;
  }
  async function load(){
    const c=await client();
    const [seasons,clubs,matches,standings,audits,players] = await Promise.all([
      c.from("ccfv_libertadores_seasons").select("*").order("season_number",{ascending:false}),
      c.from("ccfv_libertadores_clubs").select("*, players(name,platform)").order("slot"),
      c.from("ccfv_libertadores_matches").select("*, home:home_club_id(id,name,logo_path,participant_id), away:away_club_id(id,name,logo_path,participant_id)").order("match_order"),
      c.from("ccfv_libertadores_public_standings").select("*").order("season_id").order("group_code").order("position"),
      c.from("ccfv_libertadores_audit").select("*").order("created_at",{ascending:false}).limit(100),
      c.from("players").select("id,name,platform").order("name")
    ]);
    const firstError=[seasons,clubs,matches,standings,audits,players].find(r=>r.error);
    if(firstError) throw firstError.error;
    state.seasons=seasons.data||[]; state.clubs=clubs.data||[]; state.matches=matches.data||[]; state.standings=standings.data||[]; state.audits=audits.data||[]; state.players=players.data||[];
    state.season=state.seasons[0]||null;
    renderAll();
  }
  function seasonMatches(){ return state.season?state.matches.filter(m=>String(m.season_id)===String(state.season.id)):[]; }
  function seasonClubs(){ return state.season?state.clubs.filter(c=>String(c.season_id)===String(state.season.id)):[]; }
  function seasonStandings(){ return state.season?state.standings.filter(s=>String(s.season_id)===String(state.season.id)):[]; }
  function seasonAudits(){ return state.season?state.audits.filter(a=>String(a.season_id)===String(state.season.id)):[]; }

  function renderAll(){
    renderDashboard(); renderSeasons(); renderParticipants(); renderPots(); renderGroups(); renderMatches(); renderKnockout(); renderHistory(); renderAudit();
    $("#admin-user-email").textContent=state.client?.auth?"Sessão autenticada":"Admin";
  }
  function renderDashboard(){
    const c=activeSeason(); const clubs=seasonClubs(); const matches=seasonMatches();
    $("#kpi-phase").textContent=phaseLabel(c?.phase); $("#kpi-participants").textContent=`${clubs.filter(x=>x.participant_id).length} / 32`;
    $("#kpi-groups").textContent=`${new Set(clubs.filter(x=>x.group_code).map(x=>x.group_code)).size} / 8`;
    $("#kpi-matches").textContent=`${matches.filter(m=>resultStatuses.includes(String(m.status||""))).length} / 125`;
    $("#kpi-pending").textContent=String(matches.filter(m=>!resultStatuses.includes(String(m.status||""))).length);
    const champion=clubs.find(x=>x.status==="CHAMPION"); $("#kpi-champion").textContent=champion?.name||"A DEFINIR";
  }
  function renderSeasons(){
    $("#season-list").innerHTML=state.seasons.map(s=>`<div class="lib-season-row"><div><strong>${esc(s.season_label)}</strong><span>${esc(s.code)} · ${phaseLabel(s.phase)}</span></div><button type="button" data-season-id="${esc(s.id)}">SELECIONAR</button></div>`).join("")||"<div class='lib-help'>Nenhuma temporada.</div>";
  }
  function renderParticipants(){
    const c=activeSeason(); if(!c){$("#participants-table").innerHTML="";return;}
    const query=String($("#participant-search")?.value||"").trim().toLowerCase();
    const clubs=seasonClubs().filter(x=>[x.name,x.country,x.participant_name].some(v=>String(v||"").toLowerCase().includes(query)));
    const occupiedPlayers=new Set(seasonClubs().filter(x=>x.participant_id).map(x=>String(x.participant_id)));
    $("#participant-counter").textContent=`${seasonClubs().filter(x=>x.participant_id).length} / 32`;
    $("#participants-table").innerHTML=clubs.map(club=>{
      const opts=[`<option value="">${club.participant_id?"—":"Selecionar jogador"}</option>`].concat(state.players.map(p=>{
        const usedByOther=occupiedPlayers.has(String(p.id)) && String(p.id)!==String(club.participant_id||"");
        const selected=String(p.id)===String(club.participant_id||"");
        return `<option value="${esc(p.id)}" ${selected?"selected":""} ${usedByOther?"disabled":""}>${esc(p.name)}${usedByOther?" — JÁ VINCULADO":""}</option>`;
      }));
      return `<tr><td>#${String(club.slot).padStart(2,"0")}</td><td>${logo(club.logo_path,club.name)} <strong>${esc(club.name)}</strong></td><td>${esc(club.country)}</td><td>POTE ${club.pot}</td><td>${club.participant_name?esc(club.participant_name):"<span style='color:rgba(255,255,255,.3)'>A DEFINIR</span>"}</td><td>${esc(club.status)}</td><td><select data-player-for-club="${esc(club.id)}" ${club.participant_id?"disabled":""}>${opts.join("")}</select><button type="button" data-link-club="${esc(club.id)}">${club.participant_id?"DESVINCULAR":"VINCULAR"}</button></td></tr>`;
    }).join("");
  }
  function renderPots(){
    const clubs=seasonClubs();
    $("#pots-grid").innerHTML=[1,2,3,4].map(p=>`<div class="lib-pot"><h3>POTE ${p}</h3>${clubs.filter(x=>x.pot===p).map(x=>`<div class="lib-pot-row"><span>${esc(x.name)}</span><span>${esc(x.group_code||"—")}</span></div>`).join("")}</div>`).join("");
  }
  function renderGroups(){
    const st=seasonStandings();
    const groups=["A","B","C","D","E","F","G","H"];
    $("#groups-grid").innerHTML=groups.map(g=>{const rows=st.filter(x=>x.group_code===g);return `<div class="lib-group"><h3>GRUPO ${g}</h3>${rows.map(x=>`<div class="lib-group-row"><span><b>${String(x.position).padStart(2,"0")}</b> ${esc(x.name)}</span><span>${x.points} PTS</span></div>`).join("")||`<div class='lib-help'>Aguardando sorteio.</div>`}</div>`}).join("");
  }
  function matchLabel(m){
    const stage=phaseLabel(m.stage); return `${stage}${m.group_code?` · GRUPO ${m.group_code}`:""}${m.tie_code?` · ${m.tie_code}`:""} · ${m.leg===2?"VOLTA":"IDA"}`;
  }
  function renderMatches(){
    const matches=seasonMatches();
    $("#matches-list").innerHTML=matches.length?matches.map(m=>`<div class="lib-match" data-finished="${resultStatuses.includes(String(m.status||""))}"><span>${matchLabel(m)}</span><div><strong>${esc(m.home?.name||"Casa")}</strong> × <strong>${esc(m.away?.name||"Fora")}</strong><span>${m.scheduled_at?new Date(m.scheduled_at).toLocaleString("pt-BR"):"Data a definir"}</span></div><strong>${m.home_score!=null?`${m.home_score} × ${m.away_score}`:"—"}</strong><button type="button" data-open-result="${esc(m.id)}">${resultStatuses.includes(String(m.status||""))?"EDITAR":"RESULTADO"}</button></div>`).join(""):"<div class='lib-help'>Nenhuma partida gerada ainda.</div>";
  }
  function renderKnockout(){
    const stages=["ROUND_OF_16","QUARTERFINALS","SEMIFINALS","FINAL"];
    const matches=seasonMatches().filter(m=>stages.includes(m.stage));
    if(!matches.length){$("#knockout-list").innerHTML="<div class='lib-help'>O mata-mata aparecerá após a classificação necessária.</div>";return;}
    const byTie=new Map(); matches.forEach(m=>{if(!byTie.has(m.tie_code))byTie.set(m.tie_code,[]);byTie.get(m.tie_code).push(m);});
    $("#knockout-list").innerHTML=Array.from(byTie.entries()).map(([tie,arr])=>`<div class="lib-tie"><div class="lib-tie-title"><span>${esc(tie)}</span><span>${phaseLabel(arr[0].stage)}</span></div><div class="lib-tie-grid">${arr.sort((a,b)=>a.leg-b.leg).map(m=>`<div class="lib-tie-game"><span>${m.leg===1?"IDA":"VOLTA"}</span><div>${esc(m.home?.name||"Casa")} <strong>${m.home_score??"—"}</strong></div><div>${esc(m.away?.name||"Fora")} <strong>${m.away_score??"—"}</strong></div><button type="button" data-open-result="${esc(m.id)}">LANÇAR / EDITAR</button></div>`).join("")}</div></div>`).join("");
  }
  function renderHistory(){
    const champion=seasonClubs().find(x=>x.status==="CHAMPION");
    $("#history-content").innerHTML=champion?`<div class="lib-history"><div class="lib-champion"><span>CAMPEÃO DA LIBERTADORES CCFV</span><strong>${esc(champion.name)}</strong><div>${esc(champion.participant_name||"A DEFINIR")}</div></div><p class="lib-help">Ao finalizar a temporada, o título é registrado na fonte oficial <code>ccfv_titles</code> com o troféu da Libertadores.</p></div>`:`<div class="lib-help">A competição ainda não possui campeão.</div>`;
  }
  function renderAudit(){
    $("#audit-table").innerHTML=seasonAudits().map(a=>`<tr><td>${new Date(a.created_at).toLocaleString("pt-BR")}</td><td>${esc(a.action)}</td><td>${esc(a.actor_id||"—")}</td><td><code>${esc(JSON.stringify(a.payload||{}))}</code></td></tr>`).join("")||"<tr><td colspan='4'>Sem eventos.</td></tr>";
  }
  async function rpc(name,args={}){const c=await client();const r=await c.rpc(name,args);if(r.error)throw r.error;return r.data;}
  function openResult(id){
    const m=seasonMatches().find(x=>String(x.id)===String(id)); if(!m)return;
    $("#result-match-id").value=m.id; $("#result-home-name").textContent=m.home?.name||"CASA"; $("#result-away-name").textContent=m.away?.name||"FORA";
    $("#result-home-score").value=m.home_score??0; $("#result-away-score").value=m.away_score??0; $("#result-home-extra").value=m.home_extra_score??0; $("#result-away-extra").value=m.away_extra_score??0;
    $("#result-home-penalties").value=m.home_penalties??""; $("#result-away-penalties").value=m.away_penalties??"";
    $("#result-home-red").value=m.red_cards_home??0; $("#result-away-red").value=m.red_cards_away??0; $("#result-home-yellow").value=m.yellow_cards_home??0; $("#result-away-yellow").value=m.yellow_cards_away??0;
    $("#result-notes").value=m.notes||""; $("#result-evidence").value=m.evidence_url||""; $("#result-modal").hidden=false;
  }
  function closeResult(){$("#result-modal").hidden=true;}
  async function submitResult(){
    try{
      const data=await rpc("ccfv_libertadores_submit_result",{
        p_match_id:$("#result-match-id").value,p_home_score:Number($("#result-home-score").value),p_away_score:Number($("#result-away-score").value),
        p_home_extra_score:Number($("#result-home-extra").value||0),p_away_extra_score:Number($("#result-away-extra").value||0),
        p_home_penalties:$("#result-home-penalties").value===""?null:Number($("#result-home-penalties").value),p_away_penalties:$("#result-away-penalties").value===""?null:Number($("#result-away-penalties").value),
        p_home_red:Number($("#result-home-red").value||0),p_away_red:Number($("#result-away-red").value||0),p_home_yellow:Number($("#result-home-yellow").value||0),p_away_yellow:Number($("#result-away-yellow").value||0),
        p_notes:$("#result-notes").value.trim()||null,p_evidence_url:$("#result-evidence").value.trim()||null
      });
      closeResult(); await load(); message(data?.winner_club_id?"RESULTADO VALIDADO — VENCEDOR DEFINIDO.":"RESULTADO VALIDADO.");
    }catch(e){console.error(e);message(e.message||"Erro ao salvar resultado.",true);}
  }
  async function execute(action){
    try{
      if(!state.season)throw new Error("NENHUMA TEMPORADA DISPONÍVEL.");
      const map={"draw-groups":["ccfv_libertadores_draw_groups",{p_season_id:state.season.id}],"generate-groups":["ccfv_libertadores_generate_group_matches",{p_season_id:state.season.id}],"generate-r16":["ccfv_libertadores_generate_r16",{p_season_id:state.season.id}],"generate-next":["ccfv_libertadores_generate_next_knockout",{p_season_id:state.season.id}],"finish":["ccfv_libertadores_finish_season",{p_season_id:state.season.id}],"recalc":[null,null]};
      if(action==="recalc"){await load();message("CLASSIFICAÇÃO ATUALIZADA.");return;}
      const [fn,args]=map[action]; if(!fn)throw new Error("Ação desconhecida.");
      if(!window.confirm("Confirmar esta operação? A ação ficará registrada na auditoria."))return;
      const data=await rpc(fn,args); await load(); message(`${action.toUpperCase()} CONCLUÍDO.`); return data;
    }catch(e){console.error(e);message(e.message||"Operação não concluída.",true);}
  }
  async function createSeason(){
    try{
      const n=Number($("#new-season-number").value); const label=$("#new-season-label").value.trim();
      if(!n)throw new Error("Informe o número da temporada.");
      await rpc("ccfv_libertadores_create_season",{p_season_number:n,p_season_label:label}); await load(); message("TEMPORADA CRIADA.");
    }catch(e){message(e.message||"Erro ao criar temporada.",true);}
  }
  async function linkClub(clubId){
    const select=document.querySelector(`[data-player-for-club="${CSS.escape(clubId)}"]`);
    const club=seasonClubs().find(x=>String(x.id)===String(clubId));
    if(!club) return;
    try{
      if(club.participant_id){
        await rpc("ccfv_libertadores_unregister_participant",{p_season_id:state.season.id,p_club_id:clubId});
      } else {
        const value=select?.value||"";
        if(!value) throw new Error("SELECIONE UM JOGADOR.");
        await rpc("ccfv_libertadores_register_participant",{p_season_id:state.season.id,p_club_id:clubId,p_player_id:value});
      }
      await load();
      message("VÍNCULO ATUALIZADO.");
    }catch(e){
      message(e.message||"Não foi possível atualizar o vínculo.",true);
    }
  }
  function bind(){
    $$("[data-tab]").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();$$(`[data-tab]`).forEach(x=>x.classList.remove("is-active"));a.classList.add("is-active");$$("[data-panel]").forEach(p=>p.classList.toggle("is-visible",p.dataset.panel===a.dataset.tab));location.hash=a.dataset.tab;}));
    $$('[data-action]').forEach(b=>b.addEventListener("click",()=>execute(b.dataset.action)));
    $("#btn-refresh")?.addEventListener("click",()=>load().then(()=>message("DADOS ATUALIZADOS.")));
    $("#btn-create-season")?.addEventListener("click",createSeason);
    $("#participant-search")?.addEventListener("input",renderParticipants);
    $("#submit-result")?.addEventListener("click",submitResult);
    $$('[data-close-result]').forEach(b=>b.addEventListener("click",closeResult));
    document.addEventListener("click",e=>{
      const tab=e.target.closest("[data-season-id]"); if(tab){const s=state.seasons.find(x=>String(x.id)===String(tab.dataset.seasonId));if(s){state.season=s;renderAll();location.hash="dashboard";}};
      const link=e.target.closest("[data-link-club]"); if(link)linkClub(link.dataset.linkClub);
      const result=e.target.closest("[data-open-result]"); if(result)openResult(result.dataset.openResult);
    });
    const hash=location.hash.replace("#",""); if(hash){const a=$(`[data-tab="${CSS.escape(hash)}"]`);if(a)a.click();}
  }
  async function boot(){
    try{
      const session=await window.CCFVAuth?.getSession?.();
      if(!session){ window.location.replace('/admin/login.html'); return; }
      await client(); bind(); await load();
    }catch(e){
      console.error(e);
      message(e.message||"Falha ao iniciar o Admin da Libertadores.",true);
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();
