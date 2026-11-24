(() => {
  'use strict';

  const TABLE = {
    seasons: 'ccfv_clan_wars_seasons', clans: 'ccfv_clans', members: 'ccfv_clan_members',
    registrations: 'ccfv_clan_wars_registrations', matches: 'ccfv_clan_wars_matches',
    hall: 'ccfv_clan_wars_hall_of_fame', audit: 'ccfv_clan_wars_audit'
  };
  const BUCKET = 'ccfv-clan-wars';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const state = { client: null, session: null, seasons: [], season: null, registrations: [], clans: [], members: [], allClans: [], matches: [] };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[char]);
  const money = value => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value || 0));
  const stageLabel = { GROUP:'GRUPOS', REPECHAGE:'REPESCAGEM', QUARTERFINAL:'QUARTAS', SEMIFINAL:'SEMIFINAIS', FINAL:'FINAL' };

  function alertUser(message, type = 'success') {
    const node = $('#cw-admin-alert');
    if (!node) return;
    node.textContent = message;
    node.hidden = false;
    node.className = `cw-admin-alert ${type === 'error' ? 'is-error' : 'is-success'}`;
    window.clearTimeout(alertUser.timer);
    alertUser.timer = window.setTimeout(() => { node.hidden = true; }, 6500);
  }

  function setBusy(button, busy, label = 'Processando...') {
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.textContent = label;
      button.disabled = true;
    } else {
      button.textContent = button.dataset.originalText || button.textContent;
      button.disabled = false;
    }
  }

  function requireSeason() {
    if (!state.season?.id) throw new Error('Crie ou selecione uma temporada antes de continuar.');
    return state.season.id;
  }

  async function getClient() {
    const started = Date.now();
    while (!window.CCFVAuth?.getClient) {
      if (Date.now() - started > 12000) throw new Error('Autenticação CCFV não carregou. Verifique /admin/js/auth.js.');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return window.CCFVAuth.getClient();
  }

  async function uploadImage(file, path) {
    if (!file || !file.size) return null;
    if (!['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error('Use somente imagens PNG, JPG ou WEBP.');
    if (file.size > 5 * 1024 * 1024) throw new Error('Cada imagem deve ter no máximo 5 MB.');
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const target = `${path}-${Date.now()}.${ext}`;
    const { error } = await state.client.storage.from(BUCKET).upload(target, file, { upsert: true, cacheControl: '3600', contentType: file.type });
    if (error) throw error;
    const { data } = state.client.storage.from(BUCKET).getPublicUrl(target);
    return data.publicUrl;
  }

  function bindNavigation() {
    $$('.cw-admin-nav [data-admin-tab]').forEach(button => button.addEventListener('click', () => openTab(button.dataset.adminTab)));
    $$('[data-jump]').forEach(button => button.addEventListener('click', () => openTab(button.dataset.jump)));
  }

  function openTab(name) {
    $$('.cw-admin-nav [data-admin-tab]').forEach(button => button.classList.toggle('is-active', button.dataset.adminTab === name));
    $$('.cw-admin-panel[data-admin-panel]').forEach(panel => panel.classList.toggle('is-active', panel.dataset.adminPanel === name));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (name === 'matches') loadMatches().catch(showError);
    if (name === 'hall') loadHall().catch(showError);
  }

  function showError(error) {
    console.error('CCFV Clan Wars Admin:', error);
    alertUser(error?.message || 'Não foi possível concluir a operação.', 'error');
  }

  async function loadSeasons(preferredId = null) {
    const { data, error } = await state.client.from(TABLE.seasons).select('*').order('season_number', { ascending: false });
    if (error) throw error;
    state.seasons = data || [];
    const select = $('#cw-admin-season-select');
    if (select) {
      select.innerHTML = state.seasons.length
        ? state.seasons.map(item => `<option value="${item.id}">${esc(item.season_name)} · ${esc(item.status)}</option>`).join('')
        : '<option value="">Nenhuma temporada criada</option>';
      const selected = preferredId || state.season?.id || state.seasons.find(item => item.status !== 'COMPLETED')?.id || state.seasons[0]?.id || '';
      select.value = selected;
    }
    state.season = state.seasons.find(item => item.id === select?.value) || state.seasons[0] || null;
    if (select && state.season) select.value = state.season.id;
    await loadExistingClans();
    await refreshAll();
  }

  async function refreshAll() {
    if (!state.season) {
      $('#cw-kpi-phase').textContent = 'SEM TEMPORADA';
      $('#cw-season-details').textContent = 'Crie a primeira temporada na aba Temporada.';
      $('#cw-admin-clan-list').innerHTML = '<div class="cw-admin-empty">Nenhuma temporada selecionada.</div>';
      return;
    }
    await loadRegistrations();
    await Promise.all([loadMatches(), loadHall()]);
    renderDashboard();
  }

  async function loadExistingClans() {
    const { data, error } = await state.client.from(TABLE.clans).select('id,name,slug,crest_url,description').order('name');
    if (error) throw error;
    state.allClans = data || [];
    const select = $('#cw-existing-clan-select');
    if (select) {
      const previous = select.value;
      select.innerHTML = '<option value="">Selecione uma organização cadastrada...</option>' + state.allClans.map(clan => `<option value="${clan.id}">${esc(clan.name)}</option>`).join('');
      if (state.allClans.some(clan => clan.id === previous)) select.value = previous;
    }
  }

  async function loadExistingClanIntoForm() {
    const clanId = $('#cw-existing-clan-select')?.value;
    if (!clanId) throw new Error('Selecione um clã cadastrado.');
    const clan = state.allClans.find(item => item.id === clanId);
    if (!clan) throw new Error('Clã não encontrado. Atualize a lista.');
    const currentReg = state.registrations.find(item => item.clan_id === clan.id);
    let membersQuery = state.client.from(TABLE.members).select('*').eq('clan_id',clanId);
    membersQuery = currentReg
      ? membersQuery.eq('season_id', state.season.id).order('created_at', { ascending:false })
      : membersQuery.order('created_at', { ascending:false });
    const { data: members, error } = await membersQuery;
    if (error) throw error;
    const latest = new Map();
    for (const member of (members || [])) {
      const key = `${member.member_role}:${member.slot_number}`;
      if (!latest.has(key)) latest.set(key,member);
    }
    const form = $('#cw-clan-form');
    resetClanForm();
    form.elements.clan_id.value = clan.id;
    form.elements.clan_name.value = clan.name || '';
    form.elements.description.value = clan.description || '';
    if (currentReg) {
      form.elements.registration_id.value = currentReg.id;
      form.elements.registration_status.value = currentReg.registration_status;
      form.elements.payment_status.value = currentReg.payment_status;
    } else {
      form.elements.registration_status.value = 'PENDING';
      form.elements.payment_status.value = 'PENDING';
    }
    form.elements.crest_file.dataset.currentUrl = clan.crest_url || '';
    const slots = [
      {role:'PLAYER',slot:1,prefix:'player1'},{role:'PLAYER',slot:2,prefix:'player2'},{role:'PLAYER',slot:3,prefix:'player3'},
      {role:'COACH',slot:1,prefix:'coach'},{role:'OWNER',slot:1,prefix:'owner'}
    ];
    for (const slot of slots) {
      const member = latest.get(`${slot.role}:${slot.slot}`);
      if (!member) continue;
      form.elements[`${slot.prefix}_name`].value = member.display_name || '';
      if (form.elements[`${slot.prefix}_game_id`]) form.elements[`${slot.prefix}_game_id`].value = member.game_id || '';
      form.elements[`${slot.prefix}_instagram`].value = member.instagram || '';
      form.elements[`${slot.prefix}_age`].value = member.age || '';
      form.elements[`${slot.prefix}_photo`].dataset.currentUrl = member.photo_url || '';
    }
    openTab('clans');
    form.scrollIntoView({behavior:'smooth',block:'start'});
    alertUser(`Dados de ${clan.name} carregados. Ao salvar, os membros serão registrados nesta temporada sem alterar o histórico anterior.`, 'success');
  }

  async function loadRegistrations() {
    const seasonId = requireSeason();
    const { data: regs, error: regError } = await state.client.from(TABLE.registrations).select('*').eq('season_id', seasonId).order('registered_at');
    if (regError) throw regError;
    state.registrations = regs || [];
    const clanIds = [...new Set(state.registrations.map(item => item.clan_id))];
    if (!clanIds.length) { state.clans = []; state.members = []; renderClanList(); renderGroups(); renderCapacity(); return; }
    const [{ data: clans, error: clanError }, { data: members, error: memberError }] = await Promise.all([
      state.client.from(TABLE.clans).select('*').in('id', clanIds).order('name'),
      state.client.from(TABLE.members).select('*').eq('season_id', state.season.id).in('clan_id', clanIds).order('member_role').order('slot_number')
    ]);
    if (clanError) throw clanError;
    if (memberError) throw memberError;
    state.clans = clans || [];
    state.members = members || [];
    renderClanList();
    renderGroups();
    renderCapacity();
  }

  async function loadMatches() {
    if (!state.season) { state.matches = []; renderMatches(); return; }
    const { data, error } = await state.client.from(TABLE.matches).select('*').eq('season_id', state.season.id)
      .order('stage').order('round_number').order('match_number');
    if (error) throw error;
    state.matches = data || [];
    renderMatches();
    renderDashboardMatches();
  }

  function renderCapacity() {
    const count = state.registrations.filter(item => item.registration_status === 'APPROVED').length;
    const value = `${count} / 16`;
    $('#cw-clan-capacity').textContent = value;
    $('#cw-clan-list-count').textContent = value;
    $('#cw-kpi-clans').textContent = value;
  }

  function renderDashboard() {
    const paid = state.registrations.filter(item => ['PAID','WAIVED'].includes(item.payment_status)).length;
    const validated = state.matches.filter(item => ['VALIDATED','WO'].includes(item.status)).length;
    $('#cw-kpi-paid').textContent = String(paid);
    $('#cw-kpi-matches').textContent = String(validated);
    $('#cw-kpi-phase').textContent = state.season?.status || '—';
    $('#cw-admin-fee').textContent = money(state.season?.entry_fee);
    $('#cw-admin-champion-prize').textContent = `${money(state.season?.champion_prize)} + troféu`;
    $('#cw-admin-runner-prize').textContent = money(state.season?.runner_up_prize);
    $('#cw-season-details').innerHTML = `<div class="cw-admin-prizes"><div><span>Temporada</span><strong>${esc(state.season.season_name)}</strong></div><div><span>Status</span><strong>${esc(state.season.status)}</strong></div><div><span>Inscrição</span><strong>${money(state.season.entry_fee)}</strong></div><div><span>Campeão</span><strong>${money(state.season.champion_prize)}</strong></div><div><span>Vice</span><strong>${money(state.season.runner_up_prize)}</strong></div><div><span>Troféu físico</span><strong>${state.season.trophy_physical ? 'SIM' : 'NÃO'}</strong></div></div>`;
    renderDashboardMatches();
  }

  function renderDashboardMatches() {
    const box = $('#cw-admin-recent-matches');
    if (!box) return;
    const recent = state.matches.filter(item => ['VALIDATED','WO'].includes(item.status)).slice(-5).reverse();
    if (!recent.length) { box.innerHTML = '<div class="cw-admin-empty">Ainda não existem partidas homologadas.</div>'; return; }
    const reg = id => state.registrations.find(item => item.id === id);
    const clan = id => state.clans.find(item => item.id === reg(id)?.clan_id);
    box.innerHTML = recent.map(match => `<div class="cw-admin-group-item"><strong>${esc(clan(match.home_registration_id)?.name || 'Clã')} ${match.home_goals ?? 0} × ${match.away_goals ?? 0} ${esc(clan(match.away_registration_id)?.name || 'Clã')}</strong><small>${esc(stageLabel[match.stage] || match.stage)} · ${esc(match.status)}</small></div>`).join('');
  }

  function renderClanList() {
    const box = $('#cw-admin-clan-list');
    if (!box) return;
    if (!state.registrations.length) { box.innerHTML = '<div class="cw-admin-empty">Nenhum clã cadastrado nesta temporada.</div>'; return; }
    const clanMap = new Map(state.clans.map(item => [item.id,item]));
    box.innerHTML = state.registrations.map(reg => {
      const clan = clanMap.get(reg.clan_id) || {};
      return `<div class="cw-admin-clan-item"><img src="${esc(clan.crest_url || '')}" alt="" onerror="this.style.visibility='hidden'"><div><strong>${esc(clan.name || 'Clã sem nome')}</strong><small>${esc(reg.group_code ? `Grupo ${reg.group_code}` : 'Grupo não definido')} · ${esc(reg.registration_status)} · ${esc(reg.payment_status)}</small></div><button type="button" data-edit-clan="${reg.clan_id}">EDITAR</button></div>`;
    }).join('');
    $$('[data-edit-clan]', box).forEach(button => button.addEventListener('click', () => fillClanForm(button.dataset.editClan)));
  }

  function renderGroups() {
    for (const group of ['A','B']) {
      const box = $(`#cw-admin-group-${group.toLowerCase()}`);
      if (!box) continue;
      const rows = state.registrations.filter(item => item.registration_status === 'APPROVED' && item.group_code === group)
        .sort((a,b) => (a.draw_order || 99) - (b.draw_order || 99));
      box.innerHTML = rows.length ? rows.map((reg,index) => {
        const clan = state.clans.find(item => item.id === reg.clan_id);
        return `<div class="cw-admin-group-item"><span>${index+1}º</span><strong>${esc(clan?.name || 'Clã')}</strong><small>${esc(reg.payment_status)}</small></div>`;
      }).join('') : '<div class="cw-admin-empty">Grupo ainda não sorteado.</div>';
    }
  }

  function resetClanForm() { $('#cw-clan-form')?.reset(); $('#cw-clan-form [name="clan_id"]').value = ''; $('#cw-clan-form [name="registration_id"]').value = ''; $$('input[type="file"]', $('#cw-clan-form')).forEach(input => { input.dataset.currentUrl = ''; }); }

  function fillClanForm(clanId) {
    const clan = state.clans.find(item => item.id === clanId);
    const reg = state.registrations.find(item => item.clan_id === clanId);
    if (!clan || !reg) return;
    const form = $('#cw-clan-form');
    resetClanForm();
    form.elements.clan_id.value = clan.id;
    form.elements.registration_id.value = reg.id;
    form.elements.clan_name.value = clan.name || '';
    form.elements.description.value = clan.description || '';
    form.elements.registration_status.value = reg.registration_status;
    form.elements.payment_status.value = reg.payment_status;
    const members = state.members.filter(item => item.clan_id === clanId);
    const mapping = { PLAYER:['player1','player2','player3'], COACH:['coach'], OWNER:['owner'] };
    for (const member of members) {
      const prefix = mapping[member.member_role]?.[member.member_role === 'PLAYER' ? (member.slot_number - 1) : 0];
      if (!prefix) continue;
      form.elements[`${prefix}_name`].value = member.display_name || '';
      if (form.elements[`${prefix}_game_id`]) form.elements[`${prefix}_game_id`].value = member.game_id || '';
      form.elements[`${prefix}_instagram`].value = member.instagram || '';
      form.elements[`${prefix}_age`].value = member.age || '';
      form.elements[`${prefix}_photo`].dataset.currentUrl = member.photo_url || '';
    }
    if (form.elements.crest_file) form.elements.crest_file.dataset.currentUrl = clan.crest_url || '';
    openTab('clans');
    form.scrollIntoView({ behavior:'smooth', block:'start' });
    alertUser(`Editando ${clan.name}. Faça as alterações e salve.`, 'success');
  }

  async function saveClan(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $('button[type="submit"]', form);
    setBusy(button,true,'Salvando clã...');
    try {
      const fd = new FormData(form);
      const name = String(fd.get('clan_name') || '').trim();
      if (!name) throw new Error('Informe o nome do clã.');
      const existingId = String(fd.get('clan_id') || '').trim();
      for (const fileInput of $$('input[type="file"]', form)) { const file = fileInput.files?.[0]; if (file && (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 5*1024*1024)) throw new Error('Use imagens PNG, JPG ou WEBP com até 5 MB.'); }
      const registrationStatus = String(fd.get('registration_status') || 'PENDING');
      const existingRegistration = state.registrations.find(item => item.clan_id === existingId);
      if (!existingRegistration && state.season?.status !== 'REGISTRATIONS') throw new Error('As inscrições não estão abertas para novos clãs nesta temporada.');
      const approvedCountBeforeSave = state.registrations.filter(item => item.registration_status === 'APPROVED' && item.clan_id !== existingId).length;
      if (registrationStatus === 'APPROVED' && !existingRegistration && approvedCountBeforeSave >= 16) throw new Error('Esta temporada já possui 16 clãs aprovados.');
      const paymentStatus = String(fd.get('payment_status') || 'PENDING');
      if (registrationStatus === 'APPROVED' && !['PAID','WAIVED'].includes(paymentStatus)) throw new Error('Para aprovar a inscrição, confirme o pagamento de R$ 50,00 ou marque a isenção autorizada.');
      const crestInput = form.elements.crest_file;
      const crestFile = crestInput.files?.[0];
      const knownClan = state.allClans.find(item => item.id === existingId) || state.clans.find(item => item.id === existingId);
      if (!crestFile && !crestInput.dataset.currentUrl && !knownClan?.crest_url) throw new Error('Envie o escudo oficial do clã antes de salvar.');
      let clan;
      if (existingId) {
        const { data, error } = await state.client.from(TABLE.clans).update({ name, description:String(fd.get('description') || '').trim(), updated_at:new Date().toISOString() }).eq('id',existingId).select().single();
        if (error) throw error; clan = data;
      } else {
        const slugBase = name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,42) || 'clan';
        const { data, error } = await state.client.from(TABLE.clans).insert({ name, slug:`${slugBase}-${Date.now().toString(36)}`, description:String(fd.get('description') || '').trim() }).select().single();
        if (error) throw error; clan = data;
      }

      const crestUrl = await uploadImage(crestFile,`clans/${clan.id}/crest`) || crestInput.dataset.currentUrl || clan.crest_url || null;
      if (crestUrl !== clan.crest_url) {
        const { error } = await state.client.from(TABLE.clans).update({ crest_url:crestUrl, updated_at:new Date().toISOString() }).eq('id',clan.id);
        if (error) throw error;
      }

      const seasonId = requireSeason();
      const memberInputs = [
        { role:'PLAYER', slot:1, prefix:'player1' }, { role:'PLAYER', slot:2, prefix:'player2' }, { role:'PLAYER', slot:3, prefix:'player3' },
        { role:'COACH', slot:1, prefix:'coach' }, { role:'OWNER', slot:1, prefix:'owner' }
      ];
      const rows = [];
      for (const item of memberInputs) {
        const photoInput = form.elements[`${item.prefix}_photo`];
        const photoUrl = await uploadImage(photoInput.files?.[0],`clans/${clan.id}/${item.prefix}`) || photoInput.dataset.currentUrl || null;
        const displayName = String(fd.get(`${item.prefix}_name`) || '').trim();
        if (!displayName) throw new Error(`Preencha o nome de ${item.prefix.toUpperCase()}.`);
        const gameId = item.role==='PLAYER' ? String(fd.get(`${item.prefix}_game_id`) || '').trim() : null;
        if (item.role==='PLAYER' && !gameId) throw new Error(`Informe o identificador do jogo de ${item.prefix.toUpperCase()}.`);
        rows.push({ season_id:seasonId, clan_id:clan.id, member_role:item.role, slot_number:item.slot, display_name:displayName,
          game_id:gameId || null,
          instagram:String(fd.get(`${item.prefix}_instagram`) || '').trim() || null,
          age:fd.get(`${item.prefix}_age`) ? Number(fd.get(`${item.prefix}_age`)) : null,
          photo_url:photoUrl, updated_at:new Date().toISOString() });
      }
      const { error: membersError } = await state.client.from(TABLE.members).upsert(rows,{ onConflict:'season_id,clan_id,member_role,slot_number' });
      if (membersError) throw membersError;

      const registration = { season_id:seasonId, clan_id:clan.id, registration_status:registrationStatus,
        payment_status:paymentStatus, group_code:existingRegistration?.group_code || null,
        approved_at:registrationStatus === 'APPROVED' ? new Date().toISOString() : null };
      const { error: regError } = await state.client.from(TABLE.registrations).upsert(registration,{ onConflict:'season_id,clan_id' });
      if (regError) throw regError;
      resetClanForm();
      await loadRegistrations();
      await loadExistingClans();
      renderDashboard();
      alertUser(`${name} cadastrado e vinculado à temporada.`, 'success');
    } catch (error) { showError(error); }
    finally { setBusy(button,false); }
  }

  async function createSeason(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $('button[type="submit"]',form);
    setBusy(button,true,'Criando temporada...');
    try {
      const fd = new FormData(form);
      const seasonNumber = Number(fd.get('season_number'));
      const payload = { season_number:seasonNumber, season_name:String(fd.get('season_name')).trim(), status:String(fd.get('status')),
        entry_fee:Number(fd.get('entry_fee')), champion_prize:Number(fd.get('champion_prize')), runner_up_prize:Number(fd.get('runner_up_prize')),
        trophy_physical:fd.get('trophy_physical') === 'on', created_by:state.session?.user?.id || null };
      if (!payload.season_number || !payload.season_name) throw new Error('Informe número e nome da temporada.');
      const { data, error } = await state.client.from(TABLE.seasons).insert(payload).select().single();
      if (error) throw error;
      form.reset();
      form.elements.entry_fee.value='50.00'; form.elements.champion_prize.value='400.00'; form.elements.runner_up_prize.value='200.00'; form.elements.trophy_physical.checked=true;
      await loadSeasons(data.id);
      alertUser(`${data.season_name} criada com sucesso.`, 'success');
    } catch(error) { showError(error); }
    finally { setBusy(button,false); }
  }

  async function updateSeasonStatus(status) {
    try {
      const id = requireSeason();
      const { error } = await state.client.from(TABLE.seasons).update({ status }).eq('id',id);
      if (error) throw error;
      await loadSeasons(id);
      alertUser(`Status atualizado para ${status}.`, 'success');
    } catch(error) { showError(error); }
  }

  async function rpc(name, successText) {
    try {
      const result = await state.client.rpc(name,{ p_season_id:requireSeason() });
      if (result.error) throw result.error;
      await refreshAll();
      alertUser(successText, 'success');
    } catch(error) { showError(error); }
  }

  async function assignGroups() {
    if (!window.confirm('Sortear os 16 clãs aprovados em dois grupos de oito? Depois de gerar o calendário, o sorteio não poderá ser repetido.')) return;
    try {
      const { error } = await state.client.rpc('ccfv_clan_wars_assign_groups',{ p_season_id:requireSeason(), p_randomize:true });
      if (error) throw error;
      await loadRegistrations();
      await loadSeasons(state.season.id);
      alertUser('Sorteio concluído: Grupo A e Grupo B preenchidos.', 'success');
    } catch(error) { showError(error); }
  }

  function findReg(id) { return state.registrations.find(item => item.id === id); }
  function findClanByReg(id) { const reg = findReg(id); return state.clans.find(item => item.id === reg?.clan_id); }
  function membersForRegistration(registrationId) {
    const reg = findReg(registrationId);
    return state.members.filter(item => item.clan_id === reg?.clan_id && item.member_role === 'PLAYER');
  }
  function playerOptions(registrationId, selectedId) {
    const list = membersForRegistration(registrationId);
    return `<option value="">Jogador escalado</option>${list.map(item => `<option value="${item.id}" ${item.id === selectedId ? 'selected' : ''}>${esc(item.display_name)}</option>`).join('')}`;
  }

  function renderMatches() {
    const box = $('#cw-admin-matches');
    if (!box) return;
    const filter = $('#cw-match-filter')?.value || 'ALL';
    const rows = state.matches.filter(item => filter === 'ALL' || item.stage === filter);
    if (!rows.length) { box.innerHTML = '<div class="cw-admin-empty">Nenhuma partida encontrada para esta fase. Gere o calendário ou a próxima etapa.</div>'; return; }
    box.innerHTML = rows.map(match => {
      const home = findClanByReg(match.home_registration_id); const away = findClanByReg(match.away_registration_id);
      const homeReg = findReg(match.home_registration_id); const awayReg = findReg(match.away_registration_id);
      const stageInfo = match.stage === 'GROUP' ? `GRUPO ${match.group_code} · RODADA ${match.round_number}` : `${stageLabel[match.stage]} · JOGO ${match.match_number}`;
      const winnerValue = match.winner_registration_id === match.home_registration_id ? 'HOME' : match.winner_registration_id === match.away_registration_id ? 'AWAY' : '';
      return `<article class="cw-admin-match-card" data-match-card="${match.id}">
        <div class="cw-admin-match-top"><span>${esc(stageInfo)}</span><span>${esc(match.status)}</span></div>
        <div class="cw-admin-match-players">
          <div class="cw-admin-side"><strong>${esc(home?.name || 'Clã mandante')}</strong><small>${esc(homeReg?.group_code ? `Grupo ${homeReg.group_code}` : 'Classificado')}</small></div>
          <div class="cw-admin-score"><input type="number" min="0" max="99" data-home-score value="${match.home_goals ?? ''}" aria-label="Gols do mandante"><b>×</b><input type="number" min="0" max="99" data-away-score value="${match.away_goals ?? ''}" aria-label="Gols do visitante"></div>
          <div class="cw-admin-side" style="text-align:right"><strong>${esc(away?.name || 'Clã visitante')}</strong><small>${esc(awayReg?.group_code ? `Grupo ${awayReg.group_code}` : 'Classificado')}</small></div>
        </div>
        <div class="cw-admin-match-fields"><select data-home-player aria-label="Representante do clã mandante">${playerOptions(match.home_registration_id,match.home_player_member_id)}</select><select data-away-player aria-label="Representante do clã visitante">${playerOptions(match.away_registration_id,match.away_player_member_id)}</select><select data-winner aria-label="Vencedor em caso de empate"><option value="" ${winnerValue===''?'selected':''}>Vencedor automático</option><option value="HOME" ${winnerValue==='HOME'?'selected':''}>Vitória ${esc(home?.name || 'mandante')}</option><option value="AWAY" ${winnerValue==='AWAY'?'selected':''}>Vitória ${esc(away?.name || 'visitante')}</option></select></div>
        <div class="cw-admin-match-fields"><input type="url" data-evidence value="${esc(match.evidence_url || '')}" placeholder="Link da evidência (opcional)"><input type="text" data-note value="${esc(match.admin_note || '')}" placeholder="Observação administrativa"><span></span></div><div class="cw-admin-match-fields"><input type="number" min="0" data-home-penalties value="${match.home_penalties ?? ''}" placeholder="Pênaltis mandante"><input type="number" min="0" data-away-penalties value="${match.away_penalties ?? ''}" placeholder="Pênaltis visitante"><span></span></div>
        <div class="cw-admin-match-bottom"><small>${match.validated_at ? `Homologada em ${new Date(match.validated_at).toLocaleString('pt-BR')}` : 'Resultado pendente de homologação'}</small><div class="cw-admin-actions"><button type="button" class="cw-admin-btn cw-admin-btn--small" data-wo="HOME">W.O. mandante</button><button type="button" class="cw-admin-btn cw-admin-btn--small" data-wo="AWAY">W.O. visitante</button><button type="button" class="cw-admin-btn cw-admin-btn--primary cw-admin-btn--small" data-save-match>Salvar / homologar</button></div></div>
      </article>`;
    }).join('');
  }

  async function saveMatchResult(button, forceWo = null) {
    const card = button.closest('[data-match-card]');
    const match = state.matches.find(item => item.id === card?.dataset.matchCard);
    if (!match) throw new Error('Partida não encontrada. Atualize a página.');
    const homeGoals = forceWo ? (forceWo === 'HOME' ? 3 : 0) : Number($('[data-home-score]',card).value);
    const awayGoals = forceWo ? (forceWo === 'AWAY' ? 3 : 0) : Number($('[data-away-score]',card).value);
    if (!Number.isInteger(homeGoals) || !Number.isInteger(awayGoals) || homeGoals < 0 || awayGoals < 0) throw new Error('Informe um placar válido.');
    let winner = null;
    const homePlayerId = $('[data-home-player]',card).value || null;
    const awayPlayerId = $('[data-away-player]',card).value || null;
    const homePenaltyInput = $('[data-home-penalties]',card);
    const awayPenaltyInput = $('[data-away-penalties]',card);
    const homePenalties = homePenaltyInput?.value === '' ? null : Number(homePenaltyInput?.value);
    const awayPenalties = awayPenaltyInput?.value === '' ? null : Number(awayPenaltyInput?.value);
    if (!forceWo && (!homePlayerId || !awayPlayerId)) throw new Error('Selecione o representante dos dois clãs para atualizar o ranking individual.');
    if (forceWo === 'HOME') winner = match.home_registration_id;
    else if (forceWo === 'AWAY') winner = match.away_registration_id;
    else if (homeGoals > awayGoals) winner = match.home_registration_id;
    else if (awayGoals > homeGoals) winner = match.away_registration_id;
    else if (match.stage !== 'GROUP') {
      if (homePenalties !== null && awayPenalties !== null && homePenalties !== awayPenalties) {
        winner = homePenalties > awayPenalties ? match.home_registration_id : match.away_registration_id;
      } else {
        const choice = $('[data-winner]',card).value;
        if (!choice) throw new Error('Empate no mata-mata: informe os pênaltis ou selecione o vencedor após a decisão.');
        winner = choice === 'HOME' ? match.home_registration_id : match.away_registration_id;
      }
    }
    const payload = {
      home_goals:homeGoals, away_goals:awayGoals,
      home_penalties:forceWo ? null : homePenalties, away_penalties:forceWo ? null : awayPenalties,
      home_player_member_id: forceWo ? null : homePlayerId,
      away_player_member_id: forceWo ? null : awayPlayerId,
      winner_registration_id:winner,
      status:forceWo ? 'WO' : 'VALIDATED',
      evidence_url:$('[data-evidence]',card).value.trim() || null,
      admin_note:forceWo ? `W.O. atribuído ao ${forceWo === 'HOME' ? 'mandante' : 'visitante'}. ${$('[data-note]',card).value.trim()}`.trim() : ($('[data-note]',card).value.trim() || null),
      validated_at:new Date().toISOString(), validated_by:state.session?.user?.id || null, updated_at:new Date().toISOString()
    };
    setBusy(button,true,'Salvando...');
    try {
      const { error } = await state.client.from(TABLE.matches).update(payload).eq('id',match.id);
      if (error) throw error;
      await state.client.from(TABLE.audit).insert({ season_id:state.season.id, actor_id:state.session?.user?.id || null,
        action:forceWo ? 'MATCH_WO' : 'MATCH_VALIDATED', entity_type:'MATCH', entity_id:match.id,
        details:{ home_goals:homeGoals, away_goals:awayGoals, winner_registration_id:winner } });
      await refreshAll();
      alertUser(forceWo ? 'W.O. registrado e homologado.' : 'Resultado homologado. A classificação e o ranking serão recalculados automaticamente.', 'success');
    } finally { setBusy(button,false); }
  }

  async function loadHall() {
    const box = $('#cw-admin-hall');
    if (!box) return;
    const { data, error } = await state.client.from(TABLE.hall).select('*').order('finalized_at',{ascending:false});
    if (error) throw error;
    if (!data?.length) { box.innerHTML = '<div class="cw-admin-empty">Nenhuma temporada finalizada ainda.</div>'; return; }
    const seasonIds = data.map(item => item.season_id);
    const [{data:views,error:viewError}] = await Promise.all([state.client.from('ccfv_clan_wars_public_hall_of_fame').select('*').in('season_id',seasonIds).order('season_number',{ascending:false})]);
    if (viewError) throw viewError;
    const map = new Map((views || []).map(item => [item.id,item]));
    box.innerHTML = data.map(item => {
      const view = map.get(item.id) || {};
      return `<article class="cw-admin-hall-item"><img src="${esc(view.champion_crest_url || '')}" alt="" onerror="this.style.visibility='hidden'"><div><strong>${esc(view.champion_clan_name || 'Campeão')} — ${esc(view.season_name || 'Temporada')}</strong><small>Vice: ${esc(view.runner_up_clan_name || '—')} · Campeão ${money(item.champion_prize)} · Vice ${money(item.runner_up_prize)}</small></div><div class="cw-admin-hall-checks"><label><input type="checkbox" data-hall-field="champion_paid" data-hall-id="${item.id}" ${item.champion_paid?'checked':''}> Campeão pago</label><label><input type="checkbox" data-hall-field="runner_up_paid" data-hall-id="${item.id}" ${item.runner_up_paid?'checked':''}> Vice pago</label><label><input type="checkbox" data-hall-field="trophy_delivered" data-hall-id="${item.id}" ${item.trophy_delivered?'checked':''}> Troféu entregue</label></div></article>`;
    }).join('');
    $$('[data-hall-field]',box).forEach(input => input.addEventListener('change',async()=>{
      const {error:updateError}=await state.client.from(TABLE.hall).update({[input.dataset.hallField]:input.checked}).eq('id',input.dataset.hallId);
      if(updateError){input.checked=!input.checked;showError(updateError);} else alertUser('Histórico atualizado.','success');
    }));
  }

  function bindEvents() {
    $('#cw-admin-season-select')?.addEventListener('change', async event => { state.season = state.seasons.find(item=>item.id===event.target.value) || null; await refreshAll().catch(showError); });
    $('#cw-season-form')?.addEventListener('submit', createSeason);
    $('#cw-clan-form')?.addEventListener('submit', saveClan);
    $('#cw-clan-form-reset')?.addEventListener('click', resetClanForm);
    $('#cw-load-existing-clan')?.addEventListener('click',()=>loadExistingClanIntoForm().catch(showError));
    $('#cw-admin-refresh')?.addEventListener('click',()=>loadSeasons(state.season?.id).catch(showError));
    $('#cw-season-open')?.addEventListener('click',()=>updateSeasonStatus('REGISTRATIONS'));
    $('#cw-assign-groups')?.addEventListener('click',assignGroups);
    $('#cw-generate-schedule')?.addEventListener('click',()=>rpc('ccfv_clan_wars_generate_group_schedule','Calendário gerado: 56 partidas em sete rodadas.'));
    $('#cw-refresh-groups')?.addEventListener('click',()=>loadRegistrations().catch(showError));
    $('#cw-match-filter')?.addEventListener('change',renderMatches);
    $('#cw-admin-matches')?.addEventListener('click',async event=>{
      const save=event.target.closest('[data-save-match]');
      const wo=event.target.closest('[data-wo]');
      if(!save && !wo) return;
      try { await saveMatchResult(save || wo,wo?.dataset.wo || null); } catch(error){showError(error);}
    });
    $('#cw-generate-repechage')?.addEventListener('click',()=>rpc('ccfv_clan_wars_generate_repechage','Repescagem criada com quatro confrontos.'));
    $('#cw-generate-qf')?.addEventListener('click',()=>rpc('ccfv_clan_wars_generate_quarterfinals','Quartas de final criadas. Confira os cruzamentos antes de divulgar.'));
    $('#cw-generate-sf')?.addEventListener('click',()=>rpc('ccfv_clan_wars_generate_semifinals','Semifinais criadas.'));
    $('#cw-generate-final')?.addEventListener('click',()=>rpc('ccfv_clan_wars_generate_final','Grande final criada.'));
    $('#cw-finish-season')?.addEventListener('click',async()=>{
      if(!window.confirm('Finalizar a temporada e registrar o campeão e o vice no Hall da Fama? Esta ação encerra a edição.')) return;
      await rpc('ccfv_clan_wars_finish_season','Temporada encerrada. Campeão registrado no Hall da Fama.');
      await loadHall().catch(showError);
    });
  }

  async function init() {
    try {
      state.client = await getClient();
      state.session = await window.CCFVAuth.getSession();
      if (!state.session) throw new Error('Sessão administrativa não encontrada. Entre novamente no painel CCFV.');
      $('#cw-admin-session').textContent = state.session.user?.email || 'Sessão autenticada';
      bindNavigation(); bindEvents();
      await loadSeasons();
    } catch(error) {
      showError(error);
      if (String(error?.message || '').includes('Sessão administrativa')) window.location.replace('/admin/login.html');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
