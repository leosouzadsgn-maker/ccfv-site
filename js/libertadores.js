/* CCFV // LIBERTADORES — leitura pública */
(() => {
  "use strict";
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const resultStatuses=["VALIDATED","WO","ADMIN_DECISION"];
  const state={client:null,season:null,clubs:[],matches:[],standings:[]};
  async function client(){if(state.client)return state.client;if(!window.CCFVAuth?.getClient)throw Error("Cliente CCFV indisponível.");state.client=await window.CCFVAuth.getClient();return state.client}
  function logo(path,name){return path?`<img class="lib-public-logo" src="${esc(path)}" alt="${esc(name)}" loading="lazy">`:`<span class="lib-public-initials">${esc(String(name||"CC").slice(0,3).toUpperCase())}</span>`}
  async function load(){const c=await client();const seasons=await c.from("ccfv_libertadores_public_seasons").select("*").order("season_number",{ascending:false}).limit(1).maybeSingle();if(seasons.error)throw seasons.error;if(!seasons.data)return;state.season=seasons.data;
    const [clubs,matches,standings]=await Promise.all([
      c.from("ccfv_libertadores_public_clubs").select("*").eq("season_id",state.season.id).order("slot"),
      c.from("ccfv_libertadores_public_matches").select("*").eq("season_id",state.season.id).order("match_order"),
      c.from("ccfv_libertadores_public_standings").select("*").eq("season_id",state.season.id).order("group_code").order("position")
    ]);const bad=[clubs,matches,standings].find(x=>x.error);if(bad)throw bad.error;state.clubs=clubs.data||[];state.matches=matches.data||[];state.standings=standings.data||[];render();}
  function render(){
    const ms=state.matches.filter(m=>resultStatuses.includes(String(m.status||""))).length;
    $("#lib-stats").innerHTML=[['PARTICIPANTES','32'],['GRUPOS','8'],["JOGOS DA FASE DE GRUPOS","96"],["JOGOS TOTAIS","125"]].map(([a,b])=>`<div class="ccfv-lib-stat"><span>${a}</span><strong>${b}</strong></div>`).join("");
    const groups=["A","B","C","D","E","F","G","H"];$("#public-groups").innerHTML=groups.map(g=>`<div class="ccfv-lib-group"><h3>GRUPO ${g}</h3>${state.standings.filter(x=>x.group_code===g).map(x=>`<div class="ccfv-lib-group-row"><b>${String(x.position).padStart(2,'0')}</b><span>${logo(x.logo_path,x.name)} ${esc(x.name)}</span><em>${x.points}</em></div>`).join("")||'<div class="ccfv-lib-muted">Aguardando sorteio.</div>'}</div>`).join("");
    $("#public-matches").innerHTML=state.matches.map(m=>`<div class="ccfv-lib-match"><span>${esc(m.stage)}${m.group_code?` · GRUPO ${esc(m.group_code)}`:''}${m.tie_code?` · ${esc(m.tie_code)}`:''}</span><div class="ccfv-lib-teams"><div class="ccfv-lib-team">${logo(m.home_logo_path,m.home_name)}${esc(m.home_name)}</div><div>VS</div><div class="ccfv-lib-team">${logo(m.away_logo_path,m.away_name)}${esc(m.away_name)}</div></div><div class="ccfv-lib-match-score">${m.home_score!=null?`${m.home_score} × ${m.away_score}`:'—'}</div><span>${resultStatuses.includes(String(m.status||""))?'ENCERRADO':'A DEFINIR'}</span></div>`).join("")||'<div class="ccfv-lib-muted">Nenhuma partida gerada.</div>';
    const knockout=state.matches.filter(m=>["ROUND_OF_16","QUARTERFINALS","SEMIFINALS","FINAL"].includes(m.stage));const map=new Map();knockout.forEach(m=>{if(!map.has(m.tie_code))map.set(m.tie_code,[]);map.get(m.tie_code).push(m)});$("#public-knockout").innerHTML=Array.from(map.entries()).map(([tie,arr])=>`<div class="ccfv-lib-tie"><div class="ccfv-lib-tie-head"><span>${esc(tie)}</span><span>${esc(arr[0]?.stage||'')}</span></div><div class="ccfv-lib-tie-games">${arr.sort((a,b)=>a.leg-b.leg).map(m=>`<div class="ccfv-lib-tie-game"><span>${m.leg===2?'VOLTA':'IDA'}</span><div><span>${esc(m.home_name)}</span><strong>${m.home_score??'—'}</strong></div><div><span>${esc(m.away_name)}</span><strong>${m.away_score??'—'}</strong></div></div>`).join("")}</div></div>`).join("")||'<div class="ccfv-lib-muted">O mata-mata aparecerá após a fase de grupos.</div>';
    const champion=state.clubs.find(c=>c.status==='CHAMPION');$("#public-champion").innerHTML=champion?`<div class="ccfv-lib-champion-card"><span>CAMPEÃO DA LIBERTADORES CCFV</span>${logo(champion.logo_path,champion.name)}<strong>${esc(champion.name)}</strong><div>${esc(champion.participant_name||'')}</div></div>`:'';
  }
  function boot(){load().catch(e=>console.error("CCFV // LIBERTADORES PUBLIC:",e))}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
