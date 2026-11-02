(() => {
  "use strict";

  const SUPABASE_URL = "https://msqvkcnywokhakmqgiso.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_sanJ5WpLoquv4JH2ryYR6w_LxdaS2Q2";
  const DEMO = new URLSearchParams(location.search).get("preview") === "1";
  // As RPCs de criação e edição foram auditadas a partir das definições fornecidas pelo administrador.
  // O upload do Storage possui política própria que exige vínculo ACTIVE e clube pertencente ao usuário.
  const PLAYER_WRITE_RPC_AUDITED = true;
  const CLUB_ASSETS_BUCKET = "ccfv-club-assets";
  const CLUB_ASSET_MAX_BYTES = 5 * 1024 * 1024;
  const CLUB_ASSET_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
  let supabase = null;
  let authUser = null;
  let playerLink = null;
  let player = null;
  let myClub = null;
  let seasons = [];
  let registrations = [];
  let existingCrestUrl = "";
  let existingBannerUrl = "";
  let crestObjectUrl = null;
  let bannerObjectUrl = null;
  const $ = (selector) => document.querySelector(selector);

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
  }
  function toast(message) {
    const node = $("#toast");
    node.textContent = message;
    node.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { node.hidden = true; }, 4200);
  }
  function setGate(title, message, actionsHTML) {
    $("#gate-title").textContent = title;
    $("#gate-message").textContent = message;
    if (actionsHTML) $("#gate-actions").innerHTML = actionsHTML;
    $("#gate").hidden = false;
    $("#app").hidden = true;
  }
  function showApp() { $("#gate").hidden = true; $("#app").hidden = false; }
  function statusLabel(value) {
    return ({ACTIVE:"APROVADO",PENDING:"EM ANÁLISE",REJECTED:"REJEITADO",BLOCKED:"BLOQUEADO",DRAFT:"EM ANÁLISE",SUSPENDED:"SUSPENSO",INACTIVE:"NÃO APROVADO",REGISTRATION:"INSCRIÇÕES ABERTAS",CONFIRMED:"CONFIRMADA",WITHDRAWN:"RETIRADA",DISQUALIFIED:"DESCLASSIFICADA",COMPLETED:"CONCLUÍDA"})[String(value || "").toUpperCase()] || String(value || "A DEFINIR");
  }
  function openTab(tab) {
    document.querySelectorAll("[data-view]").forEach(view => view.classList.toggle("active", view.dataset.view === tab));
    document.querySelectorAll("[data-tab]").forEach(button => button.classList.toggle("active", button.dataset.tab === tab));
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function bindNavigation() {
    document.querySelectorAll("[data-tab]").forEach(button => button.addEventListener("click", () => openTab(button.dataset.tab)));
    document.querySelectorAll("[data-open-tab]").forEach(button => button.addEventListener("click", () => openTab(button.dataset.openTab)));
  }
  function bindClubPreview() {
    const fields = ["club-name","club-short","club-slug","club-city","club-motto","club-primary","club-secondary","club-accent"];
    fields.forEach(id => $("#"+id)?.addEventListener("input", updatePreview));
    $("#club-name")?.addEventListener("input", () => {
      if (!$("#club-slug").dataset.edited) $("#club-slug").value = slugify($("#club-name").value);
      updatePreview();
    });
    $("#club-slug")?.addEventListener("input", () => { $("#club-slug").dataset.edited = "1"; });
    ["club-primary","club-secondary","club-accent"].forEach(id => $("#"+id)?.addEventListener("input", () => {
      const target = {"club-primary":"club-primary-code","club-secondary":"club-secondary-code","club-accent":"club-accent-code"}[id];
      $("#"+target).textContent = $("#"+id).value.toUpperCase();
    }));
    $("#club-crest-file")?.addEventListener("change", () => handleAssetSelection("crest"));
    $("#club-banner-file")?.addEventListener("change", () => handleAssetSelection("banner"));
    $("#club-form")?.addEventListener("submit", submitClubForm);
  }
  function slugify(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80);
  }
  function updatePreview() {
    const value = id => $("#"+id)?.value || "";
    $("#preview-name").textContent = value("club-name").trim() || "NOME DO CLUBE";
    $("#preview-motto").textContent = value("club-motto").trim() || "UMA IDENTIDADE. UM LEGADO.";
    $("#preview-city").textContent = value("club-city").trim() ? value("club-city").trim().toUpperCase() + " · BRASIL" : "CIDADE · BRASIL";
    $("#preview-primary").style.background = value("club-primary");
    $("#preview-secondary").style.background = value("club-secondary");
    $("#preview-accent").style.background = value("club-accent");
    const crest = crestObjectUrl || existingCrestUrl;
    $("#club-preview-crest").src = crest || "logos/01_logo_liga_ccfv.png";
    const banner = bannerObjectUrl || existingBannerUrl;
    $("#club-preview-banner").style.backgroundImage = banner
      ? `linear-gradient(90deg,rgba(4,12,7,.2),rgba(4,12,7,.45)),url("${banner.replace(/["\\]/g, "")}")`
      : `linear-gradient(120deg,${value("club-primary")},${value("club-secondary")})`;
  }
  function validateAssetFile(file, label) {
    if (!file) return;
    if (!CLUB_ASSET_MIME_TYPES.includes(file.type)) {
      throw new Error(`${label}: use PNG, JPG ou WebP.`);
    }
    if (file.size > CLUB_ASSET_MAX_BYTES) {
      throw new Error(`${label}: o arquivo ultrapassa 5 MB.`);
    }
  }
  function handleAssetSelection(kind) {
    const isCrest = kind === "crest";
    const input = $(isCrest ? "#club-crest-file" : "#club-banner-file");
    const label = $(isCrest ? "#club-crest-file-name" : "#club-banner-file-name");
    const file = input?.files?.[0] || null;
    const oldUrl = isCrest ? crestObjectUrl : bannerObjectUrl;
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    if (isCrest) crestObjectUrl = null; else bannerObjectUrl = null;
    if (!file) {
      label.textContent = isCrest
        ? (existingCrestUrl ? "Escudo atual mantido. Selecione outro para substituir." : "Selecione PNG, JPG ou WebP · até 5 MB")
        : (existingBannerUrl ? "Banner atual mantido. Selecione outro para substituir." : "Opcional · PNG, JPG ou WebP · até 5 MB");
      label.classList.remove("is-error", "is-success");
      updatePreview();
      return;
    }
    try {
      validateAssetFile(file, isCrest ? "Escudo" : "Banner");
      const objectUrl = URL.createObjectURL(file);
      if (isCrest) crestObjectUrl = objectUrl; else bannerObjectUrl = objectUrl;
      label.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
      label.classList.remove("is-error");
      label.classList.add("is-success");
      updatePreview();
    } catch (error) {
      input.value = "";
      label.textContent = error.message;
      label.classList.remove("is-success");
      label.classList.add("is-error");
      toast(error.message);
      updatePreview();
    }
  }
  function fillClubForm(club) {
    if (!club) return;
    const map = {"club-name":"name","club-short":"short_name","club-slug":"slug","club-city":"city","club-founded":"founded_year","club-motto":"motto","club-description":"description","club-primary":"primary_color","club-secondary":"secondary_color","club-accent":"accent_color"};
    Object.entries(map).forEach(([id,key]) => { if (club[key] != null && $("#"+id)) $("#"+id).value = club[key]; });
    existingCrestUrl = club.crest_url || "";
    existingBannerUrl = club.banner_url || "";
    const crestLabel = $("#club-crest-file-name");
    const bannerLabel = $("#club-banner-file-name");
    if (crestLabel) crestLabel.textContent = existingCrestUrl ? "Escudo atual cadastrado. Selecione outro para substituir." : "Selecione PNG, JPG ou WebP · até 5 MB";
    if (bannerLabel) bannerLabel.textContent = existingBannerUrl ? "Banner atual cadastrado. Selecione outro para substituir." : "Opcional · PNG, JPG ou WebP · até 5 MB";
    updatePreview();
  }
  function bindColorCodes() {
    ["club-primary","club-secondary","club-accent"].forEach(id => {
      const node = $("#"+id); const target = {"club-primary":"club-primary-code","club-secondary":"club-secondary-code","club-accent":"club-accent-code"}[id];
      $("#"+target).textContent = node.value.toUpperCase();
    });
  }
  function renderPlayerData() {
    const name = player?.name || player?.player_name || authUser?.user_metadata?.name || "Participante";
    const code = player?.player_code || player?.code || "—";
    $("#top-player").textContent = name;
    $("#welcome-name").textContent = `Olá, ${name}.`;
    $("#welcome-copy").textContent = "Sua conta está vinculada ao cadastro esportivo da CCFV. Agora você pode acompanhar as próximas etapas da sua jornada na Liga.";
    $("#stat-link").textContent = "APROVADO";
    $("#stat-club").textContent = myClub?.name || "NÃO CRIADO";
    $("#stat-season").textContent = registrations[0]?.season_name || "A DEFINIR";
    $("#stat-division").textContent = registrations[0]?.division || "A DEFINIR";
    $("#account-email").textContent = authUser?.email || "—";
    $("#account-player").textContent = name;
    $("#account-code").textContent = code;
    $("#account-link-status").textContent = "ATIVO";
    if (myClub) {
      $("#club-status").textContent = statusLabel(myClub.status);
      $("#stat-club").textContent = myClub.name;
      $("#next-title").textContent = "Acompanhe a situação do seu clube";
      $("#next-copy").textContent = `Seu clube ${myClub.name} está com status ${statusLabel(myClub.status)}. Após aprovação, a próxima etapa será solicitar participação em uma temporada aberta.`;
      $("#next-action").textContent = "ACESSAR MEU CLUBE";
    } else {
      $("#club-status").textContent = "CLUBE NÃO CRIADO";
      $("#next-title").textContent = "Prepare a identidade do seu clube";
      $("#next-copy").textContent = "Cadastre nome, escudo, cores e apresentação para enviar sua identidade à análise administrativa.";
      $("#next-action").textContent = "ACESSAR CRIAÇÃO DO CLUBE";
    }
    const steps = $("#journey-steps");
    steps.querySelectorAll("li").forEach((li,index) => li.classList.toggle("done", index <= (myClub ? 2 : 1)));
  }
  function renderSeasons() {
    const list = $("#season-list");
    if (!seasons.length) { list.innerHTML = `<div class="empty-state">Nenhuma temporada com inscrições abertas foi retornada pelo banco neste momento.</div>`; return; }
    list.innerHTML = seasons.map(season => `<article class="season-card"><div><span class="season-meta">${escapeHTML(season.season_code || "TEMPORADA CCFV")} · ${season.is_test ? "TESTE" : "OFICIAL"}</span><h3>${escapeHTML(season.name || "Temporada")}</h3><p>${escapeHTML(season.starts_on || "Data a definir")} até ${escapeHTML(season.ends_on || "Data a definir")} · ${Number(season.monthly_fee || 0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</p></div><span class="status">${escapeHTML(statusLabel(season.status))}</span></article>`).join("");
  }
  function renderRegistrations() {
    const node = $("#my-registrations");
    if (!registrations.length) { node.innerHTML = `<div class="empty-state">Nenhuma inscrição de temporada foi encontrada para este jogador.</div>`; return; }
    node.innerHTML = `<table><thead><tr><th>TEMPORADA</th><th>CLUBE</th><th>DIVISÃO</th><th>SITUAÇÃO</th><th>POSIÇÃO</th></tr></thead><tbody>${registrations.map(item=>`<tr><td>${escapeHTML(item.season_name || item.season_code || item.season_id)}</td><td>${escapeHTML(item.club_name || myClub?.name || "—")}</td><td>${escapeHTML(item.division || "A DEFINIR")}</td><td>${escapeHTML(statusLabel(item.status))}</td><td>${escapeHTML(item.qualifier_position ?? "—")}</td></tr>`).join("")}</tbody></table>`;
  }
  function getClubPayload(crestUrl, bannerUrl) {
    const value = id => $("#"+id).value.trim();
    return {
      p_name: value("club-name"),
      p_slug: value("club-slug"),
      p_short_name: value("club-short") || null,
      p_crest_url: crestUrl || null,
      p_banner_url: bannerUrl || null,
      p_primary_color: value("club-primary"),
      p_secondary_color: value("club-secondary"),
      p_accent_color: value("club-accent"),
      p_motto: value("club-motto") || null,
      p_description: value("club-description") || null,
      p_city: value("club-city") || null,
      p_founded_year: value("club-founded") ? Number(value("club-founded")) : null
    };
  }
  async function uploadClubAsset(file, clubId, kind) {
    validateAssetFile(file, kind === "crest" ? "Escudo" : "Banner");
    const extension = ({"image/png":"png","image/jpeg":"jpg","image/webp":"webp"})[file.type];
    if (!extension) throw new Error("Formato de imagem não permitido.");
    const path = `${authUser.id}/${clubId}/${kind}-${crypto.randomUUID()}.${extension}`;
    const {error} = await supabase.storage.from(CLUB_ASSETS_BUCKET).upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type
    });
    if (error) throw error;
    const {data} = supabase.storage.from(CLUB_ASSETS_BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) throw new Error("O arquivo foi enviado, mas não recebemos a URL pública.");
    return data.publicUrl;
  }
  async function submitClubForm(event) {
    event.preventDefault();
    if (DEMO) { toast("Modo demonstração: seus dados não foram enviados nem salvos."); return; }
    if (!PLAYER_WRITE_RPC_AUDITED) { toast("A gravação está bloqueada até a auditoria das RPCs."); return; }

    const crestFile = $("#club-crest-file")?.files?.[0] || null;
    const bannerFile = $("#club-banner-file")?.files?.[0] || null;
    try {
      validateAssetFile(crestFile, "Escudo");
      validateAssetFile(bannerFile, "Banner");
      if (!crestFile && !existingCrestUrl) throw new Error("Selecione o escudo oficial do clube.");
      if (!authUser?.id) throw new Error("Não foi possível identificar sua conta autenticada.");

      const button = $("#club-save");
      button.disabled = true;
      button.textContent = "SALVANDO IDENTIDADE...";
      $("#club-feedback").textContent = "Validando os dados do clube e preparando o envio dos arquivos...";

      let clubId = myClub?.id || null;
      if (!clubId) {
        const createPayload = getClubPayload(null, null);
        const {data,error} = await supabase.rpc("ccfv_league_create_club", createPayload);
        if (error) throw error;
        if (data?.success !== true || !data?.club_id) throw new Error(data?.message || "O banco não confirmou a criação do clube.");
        clubId = data.club_id;
        myClub = {id: clubId, status: data.status || "DRAFT"};
        $("#club-feedback").textContent = "Clube criado como rascunho. Enviando o escudo e o banner...";
      }

      let crestUrl = existingCrestUrl;
      let bannerUrl = existingBannerUrl;
      if (crestFile) crestUrl = await uploadClubAsset(crestFile, clubId, "crest");
      if (bannerFile) bannerUrl = await uploadClubAsset(bannerFile, clubId, "banner");

      const updatePayload = getClubPayload(crestUrl, bannerUrl);
      const {data:updateData,error:updateError} = await supabase.rpc("ccfv_league_update_my_club", updatePayload);
      if (updateError) throw updateError;
      if (updateData?.success !== true) throw new Error(updateData?.message || "O banco não confirmou a atualização do clube.");

      existingCrestUrl = crestUrl;
      existingBannerUrl = bannerUrl;
      if (crestObjectUrl) URL.revokeObjectURL(crestObjectUrl);
      if (bannerObjectUrl) URL.revokeObjectURL(bannerObjectUrl);
      crestObjectUrl = null;
      bannerObjectUrl = null;
      $("#club-crest-file").value = "";
      $("#club-banner-file").value = "";
      $("#club-feedback").textContent = "Identidade salva. Seu clube está em análise administrativa; a inscrição na temporada será uma etapa separada.";
      toast("Identidade do clube salva com sucesso.");
      await refreshLiveData();
      openTab("club");
    } catch (error) {
      console.error("CCFV CLUB ASSETS", error);
      $("#club-feedback").textContent = error.message || "Não foi possível salvar a identidade do clube.";
      toast(error.message || "Falha ao salvar a identidade do clube.");
    } finally {
      const button = $("#club-save");
      button.disabled = false;
      button.textContent = "SALVAR IDENTIDADE DO CLUBE";
    }
  }
  async function refreshLiveData() {
    // Uma única RPC segura retorna somente os dados do jogador autenticado.
    // Isso evita SELECT direto nas tabelas protegidas por RLS e não depende
    // de um player_id que a antiga RPC de vínculo não expunha.
    const {data,error}=await supabase.rpc("ccfv_league_get_my_player_dashboard");
    if(error) throw error;
    if(data?.success!==true) throw new Error(data?.message || "Não foi possível consultar os dados do participante.");

    playerLink=data;
    player=data.player || null;
    const status=String(data.link_status || "NOT_LINKED").toUpperCase();
    if(status!=="ACTIVE") return showLinkGate(status,player?.name);

    const playerId=data.player_id || player?.id || player?.player_id;
    if(!playerId) throw new Error("O vínculo está aprovado, mas a nova consulta segura não retornou o jogador associado. Confirme se o SQL CCFV_LIGA_PAINEL_DASHBOARD_RPC foi executado no Supabase.");

    myClub=data.club || null;
    registrations=Array.isArray(data.registrations) ? data.registrations : [];
    seasons=Array.isArray(data.seasons) ? data.seasons : [];

    renderPlayerData();
    renderSeasons();
    renderRegistrations();
    if(myClub) fillClubForm(myClub);
    else {
      $("#club-feedback").textContent="Seu vínculo está aprovado. Você já pode preparar a identidade do clube; o envio ficará disponível após a validação da função segura de criação.";
    }
    showApp();
  }
  function showLinkGate(status,name) {
    const messages={NOT_LINKED:["Vincule seu cadastro CCFV","Sua conta da Liga já está criada. Informe o código oficial do seu jogador para solicitar a validação.","/liga/login.html?view=login"],PENDING:["Vínculo em análise",`${name?name+" · ":""}Sua solicitação está aguardando aprovação administrativa. A criação do clube será liberada depois da validação.`,"/liga/login.html"],REJECTED:["Vínculo não aprovado","A solicitação foi rejeitada. Revise seu código de jogador no portal de acesso e solicite uma nova análise.","/liga/login.html"],BLOCKED:["Vínculo bloqueado","Sua conta precisa de análise da administração CCFV.","/liga/login.html"]};
    const item=messages[status]||["Vínculo não identificado","Não foi possível confirmar a situação do seu cadastro.","/liga/login.html"];
    setGate(item[0],item[1],`<a class="btn primary" href="${item[2]}">IR PARA O PORTAL DE ACESSO</a><a class="btn ghost" href="/liga/index.html">VOLTAR À LIGA</a>`);
  }
  function renderDemo() {
    $("#demo-ribbon").hidden=false;
    authUser={email:"jogador.demo@ccfv.com"};
    player={name:"Jogador Demonstração",player_code:"CCFV-DEMO"};
    myClub=null; registrations=[]; seasons=[{id:"demo",season_code:"CCFV-2026-11",name:"Temporada Novembro 2026",starts_on:"2026-11-05",ends_on:"2026-11-30",status:"REGISTRATION",is_test:false,monthly_fee:15}];
    renderPlayerData(); renderSeasons(); renderRegistrations();
    $("#club-feedback").textContent="Modo demonstração: preencha os campos e veja a prévia da identidade. O botão de envio não grava nada.";
    $("#club-save").disabled=false; $("#club-save").textContent="TESTAR PRÉVIA · NÃO SALVA";
    fillClubForm({name:"Aurora Esporte Clube",short_name:"AUR",slug:"aurora-esporte-clube",city:"Januária",founded_year:2026,motto:"A nossa história começa agora.",description:"Clube de demonstração da Liga CCFV.",crest_url:"",banner_url:"",primary_color:"#1F8F5F",secondary_color:"#0B1210",accent_color:"#D6B45A"});
    showApp();
  }
  async function init() {
    bindNavigation(); bindClubPreview(); bindColorCodes(); updatePreview();
    if(DEMO){renderDemo();return;}
    if(!window.supabase?.createClient){setGate("Falha ao carregar o sistema","Não foi possível carregar a biblioteca Supabase. Atualize a página.");return;}
    supabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data,error}=await supabase.auth.getSession();
    if(error){setGate("Falha ao verificar sua sessão",error.message);return;}
    if(!data?.session){setGate("Entre na sua conta","O painel do participante é protegido. Faça login para continuar.");return;}
    authUser=data.session.user;
    $("#logout").addEventListener("click",async()=>{const {error}=await supabase.auth.signOut();if(error){toast(error.message);return;}location.href="/liga/login.html?view=login";});
    try { await refreshLiveData(); }
    catch(error){console.error("CCFV PLAYER PANEL",error);setGate("Não foi possível carregar seu painel",error.message||"Erro ao consultar seus dados.",`<a class="btn primary" href="/liga/login.html">VOLTAR AO PORTAL</a><a class="btn ghost" href="/liga/index.html">VOLTAR À LIGA</a>`);}
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true}); else init();
})();
