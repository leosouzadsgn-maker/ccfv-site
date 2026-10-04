(() => {
"use strict";
const state={client:null,season:null,teams:[],matches:[],standings:[],stage:"GROUP_STAGE",players:[]};
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const done=["VALIDATED","WO","ADMIN_DECISION"];
const phase={REGISTRATIONS:"INSCRIÇÕES",DRAW:"SORTEIO",GROUP_STAGE:"FASE DE GRUPOS",ROUND_OF_16:"OITAVAS",QUARTERFINALS:"QUARTAS",SEMIFINALS:"SEMIFINAIS",FINAL:"FINAL",FINISHED:"ENCERRADA"};
const msg=(t,e=false)=>{const el=$("#message");el.hidden=false;el.textContent=t;el.classList.toggle("error",e);clearTimeout(msg.t);msg.t=setTimeout(()=>el.hidden=true,4500)};
async function client(){if(state.client)return state.client;state.client=await window.CCFVAuth.getClient();return state.client}
async function load(){
 const c=await client();
 const [s,t,m,p]=await Promise.all([
  c.from("ccfv_world_cup_seasons").select("*").order("season_number",{ascending:false}).limit(1).single(),
  c.from("ccfv_world_cup_public_teams").select("*").order("slot"),
  c.from("ccfv_world_cup_public_matches").select("*").order("match_order"),
  c.from("players").select("id,name,platform").eq("status","ACTIVE").order("name")
 ]);
 const e=[s,t,m,p].find(x=>x.error); if(e)throw e.error;
 state.season=s.data;state.teams=t.data||[];state.matches=m.data||[];state.players=p.data||[];
 const st=await c.from("ccfv_world_cup_public_standings").select("*").order("group_code").order("position");
 state.standings=st.error?[]:(st.data||[]); render();
}
function render(){
 $("#stat-season").textContent=String(state.season?.season_number||1).padStart(2,"0");
 $("#stat-registered").textContent=`${state.teams.filter(t=>t.participant_id).length}/32`;
 $("#stat-phase").textContent=phase[state.season?.phase]||state.season?.phase||"—";
 $("#stat-matches").textContent=String(state.matches.length).padStart(3,"0");
 renderTeams();renderGroups();renderMatches();renderChampion();
}
function renderTeams(){
 const used=new Set(state.teams.filter(t=>t.participant_id).map(t=>String(t.participant_id)));
 $("#team-list").innerHTML=state.teams.map(t=>{
  const opts=['<option value="">A DEFINIR</option>'].concat(state.players.map(p=>{
   const other=used.has(String(p.id))&&String(p.id)!==String(t.participant_id||"");
   return `<option value="${esc(p.id)}" ${String(p.id)===String(t.participant_id||"")?"selected":""} ${other?"disabled":""}>${esc(p.name)}${other?" — JÁ INSCRITO":""}</option>`;
  })).join("");
  return `<div class="ccfv-row"><span class="slot">${String(t.slot).padStart(2,"0")}</span><div><strong>${esc(t.name)}</strong><small>${esc(t.confederation)} · POTE ${t.pot}</small></div><select data-team="${esc(t.id)}">${opts}</select><div class="actions"><button class="ccfv-btn" data-save="${esc(t.id)}">SALVAR</button></div></div>`;
 }).join("");
}
async function save(id){
 const sel=document.querySelector(`select[data-team="${CSS.escape(id)}"]`),pid=sel?.value;
 if(!pid){msg("Selecione um jogador.",true);return}
 try{const r=await (await client()).rpc("ccfv_world_cup_register_participant",{p_season_id:state.season.id,p_team_id:id,p_player_id:pid});if(r.error)throw r.error;msg("Participante inscrito.");await load()}catch(e){msg(e.message,true)}
}
async function draw(){
 try{const r=await (await client()).rpc("ccfv_world_cup_draw_groups",{p_season_id:state.season.id});if(r.error)throw r.error;msg("Sorteio concluído.");await load()}catch(e){msg(e.message,true)}
}
async function generate(){
 try{const r=await (await client()).rpc("ccfv_world_cup_generate_group_matches",{p_season_id:state.season.id});if(r.error)throw r.error;msg(`${r.data||48} partidas de grupos geradas.`);await load()}catch(e){msg(e.message,true)}
}
function renderGroups(){
 const groups=["A","B","C","D","E","F","G","H"];
 $("#groups").innerHTML=groups.map(g=>{const rows=state.standings.filter(x=>x.group_code===g);return `<div class="ccfv-card" style="margin-bottom:8px;padding:12px"><strong>GRUPO ${g}</strong>${rows.map(x=>`<div class="ccfv-row" style="grid-template-columns:35px 1fr 70px"><span class="slot">${String(x.position).padStart(2,"0")}</span><div><strong>${esc(x.name)}</strong></div><strong>${x.points||0} PTS</strong></div>`).join("")||'<div class="ccfv-muted">Aguardando sorteio.</div>'}</div>`}).join("");
}
function renderMatches(){
 const ms=state.matches.filter(m=>m.stage===state.stage);
 $("#matches").innerHTML=ms.map(m=>`<article class="ccfv-match"><div><small>${phase[m.stage]||m.stage}${m.group_code?` · ${m.group_code}`:""}</small><strong>${esc(m.home_name)}</strong> × <strong>${esc(m.away_name)}</strong></div><div class="score">${done.includes(m.status)?`${m.home_score} × ${m.away_score}`:"—"}</div><div><small>${done.includes(m.status)?"ENCERRADA":"PENDENTE"}</small></div><button class="ccfv-btn" data-result="${esc(m.id)}">${done.includes(m.status)?"EDITAR":"RESULTADO"}</button></article>`).join("")||'<div class="ccfv-empty">Nenhuma partida nesta fase.</div>';
}
function renderChampion(){
 const t=state.teams.find(x=>x.status==="CHAMPION");
 $("#champion").innerHTML=t?`<div><span class="ccfv-chip">CAMPEÃO DA COPA DO MUNDO</span><h3 style="font-size:28px;margin:10px 0">${esc(t.name)}</h3><p>${esc(t.participant_name||"")}</p></div>`:"A DEFINIR";
}
async function result(id){
 const m=state.matches.find(x=>String(x.id)===String(id));if(!m)return;
 state.match=m;$("#home").value=m.home_name;$("#away").value=m.away_name;$("#home-score").value=m.home_score??0;$("#away-score").value=m.away_score??0;$("#home-pen").value=m.home_penalties??"";$("#away-pen").value=m.away_penalties??"";$("#notes").value=m.notes||"";$("#result-modal").hidden=false;
}
async function submitResult(e){
 e.preventDefault();const m=state.match;if(!m)return;
 try{const r=await (await client()).rpc("ccfv_world_cup_set_result",{p_match_id:m.id,p_home_score:Number($("#home-score").value||0),p_away_score:Number($("#away-score").value||0),p_home_penalties:$("#home-pen").value===""?null:Number($("#home-pen").value),p_away_penalties:$("#away-pen").value===""?null:Number($("#away-pen").value),p_notes:$("#notes").value||null});if(r.error)throw r.error;$("#result-modal").hidden=true;msg("Resultado validado.");await load()}catch(e){msg(e.message,true)}
}
async function finish(){
 if(!confirm("Finalizar a Copa do Mundo e registrar o campeão?"))return;
 try{const r=await (await client()).rpc("ccfv_world_cup_finish_season",{p_season_id:state.season.id});if(r.error)throw r.error;msg("Temporada finalizada e próxima temporada criada.");await load()}catch(e){msg(e.message,true)}
}
async function init(){
 $("#team-list").addEventListener("click",e=>{const b=e.target.closest("[data-save]");if(b)save(b.dataset.save)});
 $("#draw").addEventListener("click",draw);$("#generate").addEventListener("click",generate);$("#finish").addEventListener("click",finish);
 $("#stage-filter").addEventListener("change",e=>{state.stage=e.target.value;renderMatches()});$("#load-matches").addEventListener("click",renderMatches);
 $("#matches").addEventListener("click",e=>{const b=e.target.closest("[data-result]");if(b)result(b.dataset.result)});
 $("#close-result").addEventListener("click",()=>$("#result-modal").hidden=true);$("#result-form").addEventListener("submit",submitResult);$("#refresh").addEventListener("click",load);
 $("#generate-r16").addEventListener("click",async()=>{try{const r=await (await client()).rpc("ccfv_world_cup_generate_round_of_16",{p_season_id:state.season.id});if(r.error)throw r.error;msg(`${r.data||8} oitavas geradas.`);await load()}catch(e){msg(e.message,true)}});
 $("#next-phase").addEventListener("click",async()=>{const stage=state.season?.phase;if(!["ROUND_OF_16","QUARTERFINALS","SEMIFINALS"].includes(stage)){msg("A próxima fase ainda não está disponível.",true);return}try{const r=await (await client()).rpc("ccfv_world_cup_generate_next_phase",{p_season_id:state.season.id,p_stage:stage});if(r.error)throw r.error;msg("Próxima fase gerada.");await load()}catch(e){msg(e.message,true)}});
 await load();
}
document.addEventListener("DOMContentLoaded",()=>init().catch(e=>msg(e.message,true)),{once:true});
})();