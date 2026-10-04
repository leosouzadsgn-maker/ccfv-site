(() => {
  "use strict";

  const TEAMS = [
    "ATHLETICO-PR","ATLÉTICO-MG","BAHIA","BOTAFOGO","BRAGANTINO",
    "CHAPECOENSE","CORINTHIANS","CORITIBA","CRUZEIRO","FLAMENGO",
    "FLUMINENSE","GRÊMIO","INTERNACIONAL","MIRASSOL","PALMEIRAS",
    "REMO","SANTOS","SÃO PAULO","VASCO","VITÓRIA"
  ];

  const state = {
    client:null, players:[], regs:[], matches:[], standings:[],
    round:1, selectedMatch:null
  };

  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const done = ["VALIDATED","WO","ADMIN_DECISION"];

  function msg(text,error=false){
    const el=$("#message"); if(!el)return;
    el.hidden=false; el.textContent=text; el.classList.toggle("error",error);
    clearTimeout(msg.t); msg.t=setTimeout(()=>el.hidden=true,4500);
  }

  async function client(){
    if(state.client)return state.client;
    state.client=await window.CCFVAuth.getClient();
    return state.client;
  }

  async function load(){
    const c=await client();
    const [p,r,m] = await Promise.all([
      c.from("players").select("id,name,platform,elo,status,team_name,photo_url").eq("status","ACTIVE").order("name"),
      c.from("player_competitions").select("*").eq("competition","BRASILEIRAO"),
      c.from("matches").select("id,competition,stage,round_number,home_player_id,away_player_id,home_team,away_team,home_score,away_score,status,played_at,created_at").eq("competition","BRASILEIRAO").order("round_number").order("created_at"),
    ]);
    const first=[p,r,m].find(x=>x.error); if(first)throw first.error;
    state.players=p.data||[]; state.regs=r.data||[]; state.matches=m.data||[];
    await loadStandings();
    renderAll();
  }

  async function loadStandings(){
    const c=await client();
    const r=await c.rpc("get_brasileirao_standings",{p_round_number:state.round});
    if(r.error){ state.standings=[]; return; }
    state.standings=Array.isArray(r.data)?r.data:[];
  }

  function regForTeam(team){ return state.regs.find(r=>norm(r.team_name)===norm(team)); }
  function norm(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toUpperCase();}

  function renderRegistrations(){
    const list=$("#registration-list");
    const used=new Set(state.regs.map(r=>String(r.player_id)));
    list.innerHTML=TEAMS.map((team,i)=>{
      const reg=regForTeam(team);
      const options=['<option value="">A DEFINIR</option>'].concat(
        state.players.map(p=>{
          const usedOther=used.has(String(p.id)) && String(p.id)!==String(reg?.player_id||"");
          return `<option value="${esc(p.id)}" ${String(p.id)===String(reg?.player_id||"")?"selected":""} ${usedOther?"disabled":""}>${esc(p.name)}${usedOther?" — JÁ INSCRITO":""}</option>`;
        })
      ).join("");
      return `<div class="ccfv-row">
        <span class="slot">${String(i+1).padStart(2,"0")}</span>
        <div><strong>${esc(team)}</strong><small>${reg?.player_id ? "INSCRITO" : "AGUARDANDO"}</small></div>
        <select data-team="${esc(team)}">${options}</select>
        <div class="actions"><button class="ccfv-btn" data-save="${esc(team)}">${reg?.player_id?"ATUALIZAR":"INSCRVER"}</button></div>
      </div>`;
    }).join("");
    $("#stat-registered").textContent=`${state.regs.length}/20`;
    $("#registration-status").textContent=state.regs.length===20?"PRONTA":"CONFIGURANDO";
  }

  async function saveRegistration(team){
    const select=document.querySelector(`select[data-team="${CSS.escape(team)}"]`);
    const playerId=select?.value||"";
    if(!playerId){msg("Selecione um jogador para este clube.",true);return;}
    try{
      const c=await client();
      const existing=state.regs.find(r=>String(r.player_id)===String(playerId));
      if(existing && norm(existing.team_name)!==norm(team)){
        msg("Este jogador já está inscrito em outro clube.",true); return;
      }
      const sameTeam=regForTeam(team);
      if(sameTeam){
        const {error}=await c.from("player_competitions").update({player_id:playerId,team_name:team}).eq("id",sameTeam.id);
        if(error)throw error;
      }else{
        const {error}=await c.from("player_competitions").insert({player_id:playerId,competition:"BRASILEIRAO",team_name:team});
        if(error)throw error;
      }
      msg("Clube inscrito com sucesso.");
      await load();
    }catch(e){msg(e.message||"Não foi possível salvar a inscrição.",true)}
  }

  function buildSchedule(teams){
    let arr=teams.map(x=>({...x}));
    if(arr.length%2)arr.push(null);
    const n=arr.length, half=n/2, rounds=[];
    let fixed=arr[0], rotating=arr.slice(1);
    for(let round=0;round<n-1;round++){
      const line=[fixed,...rotating];
      const pairs=[];
      for(let i=0;i<half;i++){
        const a=line[i], b=line[n-1-i];
        if(!a||!b)continue;
        const home=(round%2===0)?a:b, away=(round%2===0)?b:a;
        pairs.push({round:round+1,home,away});
      }
      rounds.push(pairs);
      rotating=[rotating[rotating.length-1],...rotating.slice(0,-1)];
    }
    return rounds;
  }

  async function generate(){
    if(state.regs.length!==20){msg("Inscreva os 20 clubes antes de gerar a competição.",true);return;}
    if(state.matches.some(m=>done.includes(String(m.status||"")))){msg("Já existem resultados oficiais. Não é permitido regenerar a tabela.",true);return;}
    if(state.matches.length>0){msg("A tabela já foi gerada. Use as rodadas e registre os resultados.",true);return;}
    const teams=TEAMS.map(name=>{
      const r=regForTeam(name);
      const p=state.players.find(x=>String(x.id)===String(r?.player_id));
      return {name,playerId:p.id};
    });
    const schedule=buildSchedule(teams);
    const rows=[];
    for(const pairs of schedule){
      for(const g of pairs){
        rows.push({
          competition:"BRASILEIRAO",
          stage:`RODADA_${String(g.round).padStart(2,"0")}`,
          round_number:g.round,
          home_player_id:g.home.playerId,
          away_player_id:g.away.playerId,
          home_team:g.home.name,
          away_team:g.away.name
        });
      }
      for(const g of pairs){
        rows.push({
          competition:"BRASILEIRAO",
          stage:`RODADA_${String(g.round+19).padStart(2,"0")}`,
          round_number:g.round+19,
          home_player_id:g.away.playerId,
          away_player_id:g.home.playerId,
          home_team:g.away.name,
          away_team:g.home.name
        });
      }
    }
    try{
      const c=await client();
      const {error}=await c.from("matches").insert(rows);
      if(error)throw error;
      msg("38 rodadas geradas com sucesso.");
      await load();
    }catch(e){msg(e.message||"Não foi possível gerar a tabela. O motor do banco não foi alterado.",true)}
  }

  async function openResult(id){
    const m=state.matches.find(x=>String(x.id)===String(id)); if(!m)return;
    state.selectedMatch=m;
    $("#home-team").value=m.home_team||"";
    $("#away-team").value=m.away_team||"";
    $("#home-score").value=m.home_score??0;
    $("#away-score").value=m.away_score??0;
    if(m.played_at){const d=new Date(m.played_at); const pad=n=>String(n).padStart(2,"0"); $("#played-at").value=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;}
    $("#result-modal").hidden=false;
  }

  async function submitResult(e){
    e.preventDefault();
    const m=state.selectedMatch; if(!m)return;
    try{
      const c=await client();
      const homeId=m.home_player_id, awayId=m.away_player_id;
      const pHome=state.players.find(p=>String(p.id)===String(homeId));
      const pAway=state.players.find(p=>String(p.id)===String(awayId));
      const r=await c.rpc("register_ccfv_match",{
        p_competition:"BRASILEIRAO",
        p_stage:m.stage,
        p_round_number:Number(m.round_number)||1,
        p_home_player_id:homeId,
        p_away_player_id:awayId,
        p_home_team:m.home_team,
        p_away_team:m.away_team,
        p_home_score:Math.max(0,Number($("#home-score").value||0)),
        p_away_score:Math.max(0,Number($("#away-score").value||0)),
        p_played_at:$("#played-at").value?new Date($("#played-at").value).toISOString():new Date().toISOString()
      });
      if(r.error)throw r.error;
      $("#result-modal").hidden=true;
      msg(`Resultado registrado. Elo: ${r.data?.home_elo_change>=0?"+":""}${r.data?.home_elo_change||0} / ${r.data?.away_elo_change>=0?"+":""}${r.data?.away_elo_change||0}`);
      await load();
    }catch(e){msg(e.message||"Não foi possível registrar o resultado.",true)}
  }

  function renderRound(){
    const list=$("#round-list");
    const matches=state.matches.filter(m=>Number(m.round_number)===state.round);
    list.innerHTML=matches.map(m=>`
      <article class="ccfv-match">
        <div><small>RODADA ${String(m.round_number).padStart(2,"0")}</small><strong>${esc(m.home_team)}</strong><small>vs</small><strong>${esc(m.away_team)}</strong></div>
        <div class="score">${done.includes(String(m.status||""))?`${m.home_score} × ${m.away_score}`:"—"}</div>
        <div><small>${done.includes(String(m.status||""))?"ENCERRADA":"PENDENTE"}</small></div>
        <button class="ccfv-btn" data-result="${esc(m.id)}">${done.includes(String(m.status||""))?"EDITAR":"RESULTADO"}</button>
      </article>
    `).join("") || '<div class="ccfv-empty">Nenhuma partida encontrada para esta rodada.</div>';
    $("#stat-matches").textContent=String(state.matches.length).padStart(3,"0");
    const finished=state.matches.filter(m=>done.includes(String(m.status||""))).length;
    $("#stat-finished").textContent=String(finished).padStart(3,"0");
    $("#stat-round").textContent=String(state.round).padStart(2,"0");
  }

  function renderStandings(){
    const body=$("#standings");
    body.innerHTML=state.standings.map(t=>`
      <tr><td>${String(t.position||0).padStart(2,"0")}</td><td><strong>${esc(t.team_name)}</strong></td><td>${t.played||0}</td><td>${t.wins||0}</td><td>${t.draws||0}</td><td>${t.losses||0}</td><td>${t.goals_for||0}</td><td>${t.goals_against||0}</td><td>${t.goal_difference>0?"+":""}${t.goal_difference||0}</td><td><strong>${t.points||0}</strong></td></tr>
    `).join("") || '<tr><td colspan="10">Classificação aguardando resultados.</td></tr>';
  }

  function renderAll(){renderRegistrations();renderRound();renderStandings();$("#admin-user").textContent="Sessão autenticada";}

  function bind(){
    $("#registration-list").addEventListener("click",e=>{const b=e.target.closest("[data-save]");if(b)saveRegistration(b.dataset.save);});
    $("#generate").addEventListener("click",generate);
    $("#load-round").addEventListener("click",load);
    $("#show-round").addEventListener("click",async()=>{state.round=Math.max(1,Math.min(38,Number($("#round").value)||1));await loadStandings();renderRound();renderStandings();});
    $("#round").addEventListener("change",async()=>{state.round=Math.max(1,Math.min(38,Number($("#round").value)||1));await loadStandings();renderRound();renderStandings();});
    $("#round-list").addEventListener("click",e=>{const b=e.target.closest("[data-result]");if(b)openResult(b.dataset.result);});
    $("#refresh").addEventListener("click",load);
    $("#close-result").addEventListener("click",()=>$("#result-modal").hidden=true);
    $("#result-form").addEventListener("submit",submitResult);
  }

  async function init(){
    try{await client();bind();await load();}
    catch(e){msg(e.message||"Falha ao carregar painel do Brasileirão.",true)}
  }
  document.addEventListener("DOMContentLoaded",init,{once:true});
})();
