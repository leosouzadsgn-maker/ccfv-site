(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const state = { client:null, season:null, registrations:[], clans:[], members:[], standings:[], matches:[], ranking:[], hall:[], activeGroup:'A', focusBeforeModal:null };
  const stageLabels = { GROUP:'FASE DE GRUPOS', REPECHAGE:'REPESCAGEM', QUARTERFINAL:'QUARTAS DE FINAL', SEMIFINAL:'SEMIFINAIS', FINAL:'GRANDE FINAL' };
  const esc = value => String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money = value => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value||0));
  const imageOrInitial = (url, name, className='') => url ? `<img class="${className}" src="${esc(url)}" alt="${esc(name)}" loading="lazy" onerror="this.style.display='none'">` : `<span class="${className} cw-image-fallback">${esc(String(name||'C').trim().slice(0,2).toUpperCase())}</span>`;

  async function getClient() {
    const started=Date.now();
    while(!window.CCFVAuth?.getClient){ if(Date.now()-started>12000) throw new Error('O serviço de dados da CCFV não carregou.'); await new Promise(resolve=>setTimeout(resolve,100)); }
    return window.CCFVAuth.getClient();
  }

  function setMessage(message, isError=false) {
    const node=$('#cw-live-message'); if(!node) return;
    node.textContent=message; node.classList.toggle('is-error',isError); node.classList.toggle('is-visible',Boolean(message));
  }

  function bindTabs() {
    $$('[data-tab]').forEach(button=>button.addEventListener('click',()=>{
      const target=button.dataset.tab;
      $$('[data-tab]').forEach(tab=>{const active=tab===button;tab.classList.toggle('is-active',active);tab.setAttribute('aria-selected',String(active));});
      $$('[data-panel]').forEach(panel=>{const active=panel.dataset.panel===target;panel.classList.toggle('is-active',active);panel.hidden=!active;});
    }));
    $$('[data-group]').forEach(button=>button.addEventListener('click',()=>renderStandings(button.dataset.group)));
  }

  async function loadSeason() {
    const {data,error}=await state.client.from('ccfv_clan_wars_seasons').select('*').neq('status','DRAFT').order('season_number',{ascending:false}).limit(1).maybeSingle();
    if(error) throw error;
    state.season=data;
    if(!data){
      $('#cw-season-name').textContent='SEASON 01';
      $('#cw-season-status').textContent='AGUARDANDO ABERTURA';
      $('#cw-current-phase').textContent='TEMPORADA NÃO PUBLICADA';
      setMessage('A Clan Wars está pronta para receber a primeira temporada. As inscrições serão publicadas pela administração.');
      return false;
    }
    $('#cw-season-name').textContent=data.season_name || `SEASON ${String(data.season_number).padStart(2,'0')}`;
    $('#cw-season-status').textContent=({REGISTRATIONS:'INSCRIÇÕES ABERTAS',GROUP_STAGE:'FASE DE GRUPOS',PLAYOFFS:'MATA-MATA',COMPLETED:'TEMPORADA ENCERRADA',ARCHIVED:'TEMPORADA ARQUIVADA'})[data.status] || data.status;
    $('#cw-current-phase').textContent=({REGISTRATIONS:'INSCRIÇÕES ABERTAS',GROUP_STAGE:'FASE DE GRUPOS',PLAYOFFS:'FASE ELIMINATÓRIA',COMPLETED:'TEMPORADA ENCERRADA',ARCHIVED:'ARQUIVADA'})[data.status] || data.status;
    $('#cw-stat-fee').textContent=money(data.entry_fee).replace(',00','');
    $('#cw-prize-champion').textContent=money(data.champion_prize);
    $('#cw-prize-runner').textContent=money(data.runner_up_prize);
    return true;
  }

  async function loadCompetitionData() {
    const seasonId=state.season.id;
    const [regsResult,standingsResult,matchesResult,rankingResult,hallResult]=await Promise.all([
      state.client.from('ccfv_clan_wars_registrations').select('*').eq('season_id',seasonId).eq('registration_status','APPROVED'),
      state.client.from('ccfv_clan_wars_public_standings').select('*').eq('season_id',seasonId).order('group_code').order('position'),
      state.client.from('ccfv_clan_wars_public_matches').select('*').eq('season_id',seasonId).order('stage').order('round_number').order('match_number'),
      state.client.from('ccfv_clan_wars_public_player_ranking').select('*').eq('season_id',seasonId).gte('played',3).order('position'),
      state.client.from('ccfv_clan_wars_public_hall_of_fame').select('*').order('season_number',{ascending:false})
    ]);
    for(const result of [regsResult,standingsResult,matchesResult,rankingResult,hallResult]) if(result.error) throw result.error;
    state.registrations=regsResult.data||[]; state.standings=standingsResult.data||[]; state.matches=matchesResult.data||[]; state.ranking=rankingResult.data||[]; state.hall=hallResult.data||[];
    const clanIds=[...new Set(state.registrations.map(item=>item.clan_id))];
    if(clanIds.length){
      const [{data:clans,error:clanError},{data:members,error:memberError}]=await Promise.all([
        state.client.from('ccfv_clans').select('*').in('id',clanIds).order('name'),
        state.client.from('ccfv_clan_members').select('*').eq('season_id',seasonId).in('clan_id',clanIds).order('member_role').order('slot_number')
      ]);
      if(clanError) throw clanError; if(memberError) throw memberError;
      state.clans=clans||[]; state.members=members||[];
    } else { state.clans=[]; state.members=[]; }
  }

  function clanForRegistration(registrationId) {
    const registration=state.registrations.find(item=>item.id===registrationId);
    return state.clans.find(item=>item.id===registration?.clan_id) || null;
  }

  function renderStandings(group) {
    state.activeGroup=group;
    const body=$('#cw-standings-body');
    $$('[data-group]').forEach(button=>{const active=button.dataset.group===group;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
    const rows=state.standings.filter(item=>item.group_code===group).sort((a,b)=>a.position-b.position);
    if(!rows.length){body.innerHTML='<tr><td colspan="8" class="cw-empty-cell">Os clãs deste grupo ainda não foram sorteados ou a tabela ainda não recebeu resultados.</td></tr>';return;}
    body.innerHTML=rows.map(row=>{
      const rowClass=row.position<=2?'cw-row--direct':row.position<=6?'cw-row--playoff':'';
      return `<tr class="${rowClass}"><td class="cw-pos">${row.position}º</td><td><div class="cw-clan-cell">${imageOrInitial(row.crest_url,row.clan_name,'cw-mini-crest')}<span><strong>${esc(row.clan_name)}</strong><small>${row.played} jogos disputados</small></span></div></td><td>${row.points}</td><td>${row.played}</td><td>${row.wins}</td><td>${row.draws}</td><td>${row.losses}</td><td>${row.goal_difference>0?'+':''}${row.goal_difference}</td></tr>`;
    }).join('');
  }

  function renderClans(filter='') {
    const grid=$('#cw-clans-grid');
    const normalized=filter.trim().toLocaleLowerCase('pt-BR');
    const rows=state.clans.filter(clan=>clan.name.toLocaleLowerCase('pt-BR').includes(normalized));
    $('#cw-clan-count').textContent=String(state.clans.length);
    if(!rows.length){grid.innerHTML='<div class="cw-empty-state">Nenhum clã aprovado encontrado.</div>';return;}
    grid.innerHTML=rows.map(clan=>{
      const reg=state.registrations.find(item=>item.clan_id===clan.id);
      const standing=state.standings.find(item=>item.registration_id===reg?.id);
      return `<button class="cw-clan-card" type="button" data-clan-id="${clan.id}" aria-label="Abrir perfil de ${esc(clan.name)}"><div class="cw-clan-card__top">${imageOrInitial(clan.crest_url,clan.name,'cw-clan-card__crest')}<span class="cw-clan-card__status">${reg?.group_code?`GRUPO ${reg.group_code}`:'INSCRITO'}</span></div><div class="cw-clan-card__body"><h3>${esc(clan.name)}</h3><p>${standing?`${standing.position}º lugar · ${standing.points} pontos`:'Perfil oficial da organização'}</p><div class="cw-clan-card__meta"><span>03 JOGADORES</span><span>VER PERFIL ↗</span></div></div></button>`;
    }).join('');
  }

  function personCard(person, fallbackRole) {
    const role=person?.member_role==='PLAYER'?`JOGADOR ${person.slot_number}`:person?.member_role==='COACH'?'TREINADOR':person?.member_role==='OWNER'?'DONO DO CLÃ':fallbackRole;
    const name=person?.display_name || 'Cadastro não informado';
    const instagram=String(person?.instagram||'').replace(/^@/,'');
    const insta=instagram?`<a href="https://instagram.com/${encodeURIComponent(instagram)}" target="_blank" rel="noopener noreferrer">@${esc(instagram)}</a>`:'—';
    return `<article class="cw-person-card"><div class="cw-person-card__photo">${person?.photo_url?`<img src="${esc(person.photo_url)}" alt="Foto de ${esc(name)}" loading="lazy">`:'<span aria-hidden="true">♙</span>'}</div><h4>${esc(name)}</h4><p>${esc(role)}</p><dl><div><dt>Identificador</dt><dd>${esc(person?.game_id||'—')}</dd></div><div><dt>Instagram</dt><dd>${insta}</dd></div><div><dt>Idade</dt><dd>${person?.age?`${person.age} anos`:'—'}</dd></div></dl></article>`;
  }

  function openClanModal(clanId) {
    const clan=state.clans.find(item=>item.id===clanId); if(!clan)return;
    const registration=state.registrations.find(item=>item.clan_id===clan.id);
    const standing=state.standings.find(item=>item.registration_id===registration?.id);
    const people=state.members.filter(item=>item.clan_id===clan.id);
    const players=[1,2,3].map(slot=>people.find(person=>person.member_role==='PLAYER'&&person.slot_number===slot));
    const coach=people.find(person=>person.member_role==='COACH'); const owner=people.find(person=>person.member_role==='OWNER');
    $('#cw-modal-content').innerHTML=`<header class="cw-modal__head">${imageOrInitial(clan.crest_url,clan.name,'cw-modal__crest')}<div><span class="cw-kicker">PERFIL OFICIAL · ${registration?.group_code?`GRUPO ${registration.group_code}`:'CLÃ'}</span><h2 id="cw-modal-title">${esc(clan.name)}</h2><p>${standing?`${standing.points} pontos · ${standing.wins} vitórias · ${standing.position}º lugar`:'Organização inscrita na CCFV Clan Wars'}</p></div></header><div class="cw-modal__body"><h3 class="cw-modal__section-title">ELENCO DE JOGADORES</h3><div class="cw-people-grid">${players.map((person,index)=>personCard(person,`JOGADOR ${index+1}`)).join('')}</div><h3 class="cw-modal__section-title" style="margin-top:22px">COMISSÃO DO CLÃ</h3><div class="cw-staff-grid">${personCard(coach,'TREINADOR')}${personCard(owner,'DONO DO CLÃ')}</div></div>`;
    state.focusBeforeModal=document.activeElement;
    const modal=$('#cw-clan-modal'); modal.classList.add('is-open'); modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; $('.cw-modal__close',modal)?.focus();
  }

  function closeClanModal() {
    const modal=$('#cw-clan-modal'); if(!modal)return;
    modal.classList.remove('is-open'); modal.setAttribute('aria-hidden','true'); document.body.style.overflow=''; state.focusBeforeModal?.focus?.();
  }

  function renderMatches() {
    const box=$('#cw-matches');
    const rows=state.matches.filter(item=>item.stage==='GROUP');
    if(!rows.length){box.innerHTML='<span class="cw-calendar-icon">▣</span><span>O calendário será publicado após o sorteio oficial dos grupos.</span>';}
    else {
      const rounds=[...new Set(rows.map(item=>item.round_number))].sort((a,b)=>a-b);
      box.innerHTML=rounds.map(round=>{
        const games=rows.filter(item=>item.round_number===round);
        return `<div class="cw-round-block"><strong>RODADA ${round}</strong><div>${games.map(match=>`<div class="cw-public-match"><span>${esc(match.home_clan_name)}</span><b>${match.home_goals===null?'—':match.home_goals} × ${match.away_goals===null?'—':match.away_goals}</b><span>${esc(match.away_clan_name)}</span><small>${esc(match.status==='VALIDATED'||match.status==='WO'?'HOMOLOGADA':'AGENDADA')}</small></div>`).join('')}</div></div>`;
      }).join('');
    }
    renderPlayoffs();
  }

  function renderPlayoffs() {
    const box=$('#cw-playoff-matches'); if(!box)return;
    const stages=['REPECHAGE','QUARTERFINAL','SEMIFINAL','FINAL'];
    const all=state.matches.filter(item=>item.stage!=='GROUP');
    if(!all.length){box.innerHTML='<div class="cw-empty-state">Os confrontos eliminatórios aparecerão após o encerramento dos grupos.</div>';return;}
    box.innerHTML=stages.map(stage=>{
      const games=all.filter(item=>item.stage===stage).sort((a,b)=>a.match_number-b.match_number);
      if(!games.length)return '';
      return `<section class="cw-playoff-stage"><strong>${esc(stageLabels[stage])}</strong>${games.map(match=>{
        const homeWinner=match.winner_registration_id===match.home_registration_id;
        const awayWinner=match.winner_registration_id===match.away_registration_id;
        return `<div class="cw-playoff-game"><span class="${homeWinner?'cw-playoff-game--winner':''}">${esc(match.home_clan_name)}</span><b>${match.home_goals===null?'—':match.home_goals} × ${match.away_goals===null?'—':match.away_goals}</b><span class="${awayWinner?'cw-playoff-game--winner':''}">${esc(match.away_clan_name)}</span><small>${match.status==='VALIDATED'||match.status==='WO'?'HOMOLOGADA':'AGUARDANDO'}</small></div>`;
      }).join('')}</section>`;
    }).join('');
  }

  function renderRanking() {
    const body=$('#cw-ranking-body');
    if(!state.ranking.length){body.innerHTML='<tr><td colspan="11" class="cw-empty-cell">O ranking será formado após jogadores disputarem pelo menos três partidas homologadas.</td></tr>';return;}
    body.innerHTML=state.ranking.map(row=>`<tr><td class="cw-pos">${row.position}º</td><td><div class="cw-clan-cell">${imageOrInitial(row.photo_url,row.display_name,'cw-ranking-avatar')}<span><strong>${esc(row.display_name)}</strong><small>${esc(row.game_id||'')}</small></span></div></td><td><span class="cw-ranking-clan">${imageOrInitial(row.crest_url,row.clan_name,'cw-ranking-crest')} ${esc(row.clan_name)}</span></td><td>${row.played}</td><td>${row.wins}</td><td>${row.draws}</td><td>${row.losses}</td><td>${row.goals_for}</td><td>${row.goal_difference>0?'+':''}${row.goal_difference}</td><td><strong>${row.points}</strong></td><td>${Number(row.win_percentage||0).toFixed(1)}%</td></tr>`).join('');
  }

  function renderHall() {
    const box=$('#cw-hall-grid');
    $('#cw-hall-editions').textContent=String(state.hall.length);
    $('#cw-hall-champions').textContent=String(new Set(state.hall.map(item=>item.champion_clan_id)).size);
    if(!state.hall.length){box.innerHTML='<div class="cw-empty-state">O Hall da Fama será preenchido após a primeira final homologada.</div>';return;}
    const counts=new Map(); state.hall.forEach(item=>counts.set(item.champion_clan_id,(counts.get(item.champion_clan_id)||0)+1));
    box.innerHTML=state.hall.map(item=>`<article class="cw-hall-card"><div class="cw-hall-card__trophy">♛</div><div class="cw-hall-card__crest">${imageOrInitial(item.champion_crest_url,item.champion_clan_name,'')}</div><span class="cw-kicker">${esc(item.season_name)} · CAMPEÃO</span><h3>${esc(item.champion_clan_name)}</h3><strong class="cw-hall-titles">${counts.get(item.champion_clan_id)||1} ${(counts.get(item.champion_clan_id)||1)===1?'TÍTULO':'TÍTULOS'}</strong><p>Vice-campeão: ${esc(item.runner_up_clan_name)}</p><small>${new Date(item.finalized_at).toLocaleDateString('pt-BR')}</small></article>`).join('');
  }

  function bindEvents() {
    $('#cw-clan-search')?.addEventListener('input',event=>renderClans(event.target.value));
    $('#cw-clans-grid')?.addEventListener('click',event=>{const button=event.target.closest('[data-clan-id]');if(button)openClanModal(button.dataset.clanId);});
    $('#cw-clan-modal')?.addEventListener('click',event=>{if(event.target.matches('[data-modal-close]'))closeClanModal();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('#cw-clan-modal')?.classList.contains('is-open'))closeClanModal();});
  }

  async function init() {
    try {
      state.client=await getClient(); bindTabs(); bindEvents();
      const hasSeason=await loadSeason();
      if(!hasSeason){renderStandings('A');renderClans();renderRanking();renderHall();return;}
      await loadCompetitionData();
      renderStandings('A');renderClans();renderMatches();renderRanking();renderHall();
      setMessage('Dados oficiais carregados da base da CCFV. Resultados e estatísticas consideram somente partidas homologadas.');
    } catch(error) {
      console.error('CCFV Clan Wars:',error);
      setMessage(`Não foi possível carregar os dados oficiais: ${error?.message || 'verifique se a migration da Clan Wars foi executada no Supabase.'}`,true);
      $('#cw-standings-body').innerHTML='<tr><td colspan="8" class="cw-empty-cell">Dados indisponíveis. Verifique a instalação do módulo.</td></tr>';
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
