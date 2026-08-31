(() => {
  "use strict";
  const SUPABASE_URL="https://hfiwndvshzorikfzkiiw.supabase.co";
  const SUPABASE_KEY="sb_publishable_VykAaaP_0PfIW_n4HYHbTA_VlvrkjMu";
  const TEAMS=["ATHLETICO-PR","ATLÉTICO-MG","BAHIA","BOTAFOGO","BRAGANTINO","CHAPECOENSE","CORINTHIANS","CORITIBA","CRUZEIRO","FLAMENGO","FLUMINENSE","GRÊMIO","INTERNACIONAL","MIRASSOL","PALMEIRAS","REMO","SANTOS","SÃO PAULO","VASCO","VITÓRIA"];
  const ELOS=[
    {name:"INICIANTE",min:0,max:999},
    {name:"AMADOR",min:1000,max:1999},
    {name:"PROFISSIONAL",min:2000,max:2999},
    {name:"LENDA",min:3000,max:Infinity}
  ];
  const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const norm=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toUpperCase();
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const finalStatus=s=>/FINAL|FINISHED|COMPLETED|CONCL|ENCERR|FINALIZ/i.test(String(s||""));
  let client=null, matches=[], ranking=[];
  async function getClient(){
    if(client)return client;
    if(!window.supabase?.createClient)throw new Error("Supabase indisponível.");
    client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);return client;
  }
  async function rpc(name,args={}){const c=await getClient();const {data,error}=await c.rpc(name,args);if(error)throw error;return data||[];}
  async function loadMatches(){matches=await rpc("get_ccfv_mobile_matches");return matches;}
  async function loadRanking(){ranking=await rpc("get_ccfv_mobile_ranking");return ranking;}
  function standingsForRound(round=1){
    const rows=TEAMS.map(team=>({team,j:0,v:0,e:0,d:0,gp:0,gc:0,pts:0}));
    const by=new Map(rows.map(r=>[norm(r.team),r]));
    for(const m of matches){
      const mr=num(m.round_number);
      if(round>0 && mr>round)continue;
      if(!finalStatus(m.status))continue;
      const h=by.get(norm(m.home_team)),a=by.get(norm(m.away_team));if(!h||!a)continue;
      const hs=num(m.home_score),as=num(m.away_score);
      h.j++;a.j++;h.gp+=hs;h.gc+=as;a.gp+=as;a.gc+=hs;
      if(hs>as){h.v++;a.d++;h.pts+=3}else if(hs<as){a.v++;h.d++;a.pts+=3}else{h.e++;a.e++;h.pts++;a.pts++}
    }
    return rows.sort((a,b)=>b.pts-a.pts||((b.gp-b.gc)-(a.gp-a.gc))||(b.gp-a.gp)||a.team.localeCompare(b.team)).map((r,i)=>({...r,position:i+1,sg:r.gp-r.gc}));
  }
  function stageRoundFor(stage){const x=String(stage||""); if(/^RODADA_(\d+)$/i.test(x))return Number(x.match(/(\d+)/)[1]); return 1;}
  function renderRounds(container,current=1){if(!container)return;container.innerHTML=`<select id="mobile-round-select" aria-label="Selecionar rodada">${Array.from({length:38},(_,i)=>`<option value="${i+1}" ${i+1===current?"selected":""}>RODADA ${String(i+1).padStart(2,'0')}</option>`).join("")}</select>`;container.querySelector("select")?.addEventListener("change",e=>renderMobileBrasileirao(Number(e.target.value)))}
  async function renderMobileBrasileirao(round=1){
    const standingsEl=document.querySelector("#mobile-standings"),matchesEl=document.querySelector("#mobile-round-matches");if(!standingsEl)return;
    try{await loadMatches();const table=standingsForRound(round);standingsEl.innerHTML=`<div class="ccfv-mobile-standing ccfv-mobile-standing--head"><span>POS</span><span>CLUBE</span><span>J</span><span>V</span><span>E</span><span>D</span><strong>PTS</strong></div>`+table.map(r=>`<div class="ccfv-mobile-standing ${r.position===1?'is-first':''}"><span>${String(r.position).padStart(2,'0')}</span><strong>${esc(r.team)}</strong><span>${r.j}</span><span>${r.v}</span><span>${r.e}</span><span>${r.d}</span><strong>${r.pts}</strong></div>`).join("");
      const games=matches.filter(m=>num(m.round_number)===round && m.competition==="BRASILEIRAO_MOBILE");matchesEl.innerHTML=games.length?games.map(m=>`<div class="ccfv-mobile-match"><div class="ccfv-mobile-match__team">${esc(m.home_team)}<div class="ccfv-mobile-muted">${esc(m.home_player_name||"")}</div></div><div class="ccfv-mobile-match__score">${esc(m.home_score)} × ${esc(m.away_score)}</div><div class="ccfv-mobile-match__team">${esc(m.away_team)}<div class="ccfv-mobile-muted">${esc(m.away_player_name||"")}</div></div><div class="ccfv-mobile-match__meta">${esc(m.status||"PROGRAMADA")}</div></div>`).join(""):`<div class="ccfv-mobile-empty">NENHUMA PARTIDA REGISTRADA NESTA RODADA.</div>`;
    }catch(e){console.error(e);standingsEl.innerHTML=`<div class="ccfv-mobile-empty">EXECUTE O SQL DE INSTALAÇÃO DO MOBILE NO SUPABASE PARA ATIVAR ESTA ÁREA.</div>`;if(matchesEl)matchesEl.innerHTML="";}
  }
  function rankName(elo){const e=num(elo);return ELOS.find(x=>e>=x.min&&e<=x.max)?.name||"INICIANTE"}
  async function renderMobileRanking(){
    const el=document.querySelector("#mobile-ranking-list");if(!el)return;
    try{await loadRanking();const list=[...ranking].sort((a,b)=>num(b.elo)-num(a.elo)); const top=list[0];
      el.innerHTML=(top?`<section style="margin-bottom:40px"><div class="ccfv-mobile-card" style="min-height:240px"><span class="ccfv-mobile-card__num">CCFV // TOP 1 MOBILE</span><h3 style="margin-top:38px">${esc(top.name)}</h3><p>${esc(top.instagram?"@"+top.instagram:"CCFV MOBILE")} · ${esc(rankName(top.elo))}</p><span>${num(top.elo)} ELO · ${num(top.wins)} VITÓRIAS</span></div></section>`:"")+`<div class="ccfv-mobile-table__head"><span>POS</span><span>JOGADOR</span><span>PLATAFORMA</span><span>ELO</span><span>STATUS</span></div>`+(list.length?list.map((p,i)=>`<div class="ccfv-mobile-row"><span>${String(i+1).padStart(2,'0')}</span><div class="ccfv-mobile-row__player"><div class="ccfv-mobile-row__avatar">${p.photo_url?`<img src="${esc(p.photo_url)}" alt="">`:esc(String(p.name||"--").slice(0,2).toUpperCase())}</div><div><strong>${esc(p.name)}</strong><div class="ccfv-mobile-muted">${p.instagram?`@${esc(p.instagram)}`:"CCFV MOBILE"}</div></div></div><span>MOBILE</span><strong>${num(p.elo)} ELO</strong><span class="ccfv-mobile-muted">${esc(p.rank_name||rankName(p.elo))}</span></div>`).join(""):`<div class="ccfv-mobile-empty">NENHUM COMPETIDOR MOBILE CADASTRADO.</div>`);
    }catch(e){console.error(e);el.innerHTML=`<div class="ccfv-mobile-empty">EXECUTE O SQL DE INSTALAÇÃO DO MOBILE NO SUPABASE PARA ATIVAR O RANKING MOBILE.</div>`;}}
  async function renderArena(){
    const root=document.querySelector("#mobile-arena-root");if(!root)return;
    try{await loadMatches();const games=matches.filter(m=>m.competition==="ARENA_CUP");const phase=(p)=>games.filter(m=>String(m.stage||"").toUpperCase().startsWith(p)); const q=phase("QUARTAS");const s=phase("SEMI");const f=phase("FINAL");
      const col=(title,data)=>`<div><span class="ccfv-mobile-kicker">${title}</span>${data.length?data.map(m=>`<div class="ccfv-mobile-match"><div class="ccfv-mobile-match__team">${esc(m.home_team)}<div class="ccfv-mobile-muted">${esc(m.home_player_name||"")}</div></div><div class="ccfv-mobile-match__score">${esc(m.home_score)} × ${esc(m.away_score)}</div><div class="ccfv-mobile-match__team">${esc(m.away_team)}<div class="ccfv-mobile-muted">${esc(m.away_player_name||"")}</div></div><div class="ccfv-mobile-match__meta">${esc(m.stage)}</div></div>`).join(""):"<div class=\"ccfv-mobile-empty\">A DEFINIR.</div>"}</div>`;
      root.innerHTML=`<div class="ccfv-mobile-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">${col("QUARTAS",q)}${col("SEMIFINAIS",s)}${col("FINAL",f)}</div>`;
    }catch(e){root.innerHTML=`<div class="ccfv-mobile-empty">EXECUTE O SQL DE INSTALAÇÃO DO MOBILE NO SUPABASE PARA ATIVAR A ARENA CUP.</div>`;}
  }
  async function renderAllMatches(){const el=document.querySelector("#mobile-all-matches");if(!el)return;try{await loadMatches();el.innerHTML=matches.length?matches.map(m=>`<div class="ccfv-mobile-match"><div class="ccfv-mobile-match__team">${esc(m.home_team)}<div class="ccfv-mobile-muted">${esc(m.home_player_name||"")}</div></div><div class="ccfv-mobile-match__score">${esc(m.home_score)} × ${esc(m.away_score)}</div><div class="ccfv-mobile-match__team">${esc(m.away_team)}<div class="ccfv-mobile-muted">${esc(m.away_player_name||"")}</div></div><div class="ccfv-mobile-match__meta">${esc(m.competition)} · ${esc(m.stage||"")} · ${esc(m.status||"PROGRAMADA")}</div></div>`).join(""):`<div class="ccfv-mobile-empty">NENHUMA PARTIDA MOBILE.</div>`;}catch(e){el.innerHTML=`<div class="ccfv-mobile-empty">EXECUTE O SQL DE INSTALAÇÃO DO MOBILE NO SUPABASE PARA ATIVAR AS PARTIDAS.</div>`;}}
  async function boot(){
    const page=document.body.dataset.mobilePage;if(!page)return;
    const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";s.onload=async()=>{if(page==='brasileirao'){renderRounds(document.querySelector('#mobile-round-picker'),1);await renderMobileBrasileirao(1)}if(page==='ranking')await renderMobileRanking();if(page==='arena')await renderArena();if(page==='partidas')await renderAllMatches()};document.head.appendChild(s);
  }
  boot();
})();
