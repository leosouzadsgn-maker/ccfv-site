(() => {
  "use strict";

  const SUPABASE_URL = "https://msqvkcnywokhakmqgiso.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_sanJ5WpLoquv4JH2ryYR6w_LxdaS2Q2";
  const DEMO = new URLSearchParams(location.search).get("preview") === "1";
  // Bloqueio intencional: a assinatura da RPC existe, mas o corpo de segurança e as permissões atuais ainda precisam ser auditados.
  const PLAYER_WRITE_RPC_AUDITED = false;
  let supabase = null;
  let authUser = null;
  let playerLink = null;
  let player = null;
  let myClub = null;
  let seasons = [];
  let registrations = [];
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
    const fields = ["club-name","club-short","club-slug","club-city","club-motto","club-crest","club-banner","club-primary","club-secondary","club-accent"];
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
    $("#club-crest")?.addEventListener("change", updatePreview);
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
    const crest = value("club-crest");
    if (/^https:\/\//i.test(crest)) $("#club-preview-crest").src = crest;
    else $("#club-preview-crest").src = "logos/01_logo_liga_ccfv.png";
    const banner = value("club-banner");
    $("#club-preview-banner").style.backgroundImage = /^https:\/\//i.test(banner) ? `linear-gradient(90deg,rgba(4,12,7,.2),rgba(4,12,7,.45)),url("${banner.replace(/["\\]/g,"")}")` : `linear-gradient(120deg,${value("club-primary")},${value("club-secondary")})`;
  }
  function fillClubForm(club) {
    if (!club) return;
    const map = {"club-name":"name","club-short":"short_name","club-slug":"slug","club-city":"city","club-founded":"founded_year","club-motto":"motto","club-description":"description","club-crest":"crest_url","club-banner":"banner_url","club-primary":"primary_color","club-secondary":"secondary_color","club-accent":"accent_color"};
    Object.entries(map).forEach(([id,key]) => { if (club[key] != null && $("#"+id)) $("#"+id).value = club[key]; });
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
  async function loadPlayerClub(playerId) {
    const {data,error}=await supabase.from("ccfv_league_clubs").select("id,owner_player_id,name,short_name,slug,crest_url,banner_url,primary_color,secondary_color,accent_color,motto,description,city,founded_year,status,created_at,updated_at").eq("owner_player_id",playerId).limit(1);
    if(error) throw error;
    myClub=Array.isArray(data)?data[0]||null:null;
  }
  async function loadPlayerRegistrations(playerId) {
    const {data,error}=await supabase.from("ccfv_league_season_clubs").select("id,season_id,club_id,player_id,division,status,qualifier_position,created_at").eq("player_id",playerId).order("created_at",{ascending:false}).limit(30);
    if(error) throw error;
    registrations=(data||[]);
  }
  async function loadRegistrationSeasons() {
    const {data,error}=await supabase.from("ccfv_league_seasons").select("id,season_code,name,starts_on,ends_on,status,is_test,monthly_fee,max_clubs").eq("status","REGISTRATION").order("starts_on",{ascending:true}).limit(20);
    if(error) throw error;
    seasons=data||[];
  }
  async function submitClubForm(event) {
    event.preventDefault();
    if(DEMO){toast("Modo demonstração: seus dados não foram enviados nem salvos.");return;}
    if(!PLAYER_WRITE_RPC_AUDITED){$("#club-feedback").textContent="A tela está pronta, mas a gravação está temporariamente bloqueada até conferirmos a definição e as permissões da RPC ccfv_league_create_club.";toast("Criação ainda bloqueada para proteger seu cadastro.");return;}
    // Liberação futura, após auditoria SQL da RPC; owner_player_id nunca é enviado pelo navegador.
    const value=id=>$("#"+id).value.trim();
    const payload={p_name:value("club-name"),p_slug:value("club-slug"),p_short_name:value("club-short")||null,p_crest_url:value("club-crest")||null,p_banner_url:value("club-banner")||null,p_primary_color:value("club-primary"),p_secondary_color:value("club-secondary"),p_accent_color:value("club-accent"),p_motto:value("club-motto")||null,p_description:value("club-description")||null,p_city:value("club-city")||null,p_founded_year:value("club-founded")?Number(value("club-founded")):null};
    const {data,error}=await supabase.rpc("ccfv_league_create_club",payload);
    if(error) throw error;
    if(data?.success!==true) throw new Error(data?.message||"O banco não confirmou a criação.");
    toast("Solicitação de criação recebida.");
    await refreshLiveData();
  }
  async function refreshLiveData() {
    const {data,error}=await supabase.rpc("ccfv_league_get_my_player_link");
    if(error) throw error;
    if(data?.success!==true) throw new Error("Não foi possível consultar o vínculo do jogador.");
    playerLink=data;
    player=data.player||null;
    const status=String(data.link_status||"NOT_LINKED").toUpperCase();
    if(status!=="ACTIVE") return showLinkGate(status,player?.name);
    const playerId=player?.id||player?.player_id||data.player_id;
    if(!playerId) throw new Error("O vínculo está ativo, mas a RPC não retornou o identificador do jogador. Precisamos conferir seu contrato antes de abrir os dados do clube.");
    try { await loadPlayerClub(playerId); } catch(error) { console.warn("Leitura do clube próprio indisponível",error); myClub=null; $("#club-feedback").textContent="Não foi possível consultar o clube existente. Confira as permissões de leitura da tabela ccfv_league_clubs."; }
    try { await loadPlayerRegistrations(playerId); } catch(error) { console.warn("Leitura das inscrições indisponível",error); registrations=[]; }
    try { await loadRegistrationSeasons(); } catch(error) { console.warn("Leitura das temporadas indisponível",error); seasons=[]; }
    renderPlayerData(); renderSeasons(); renderRegistrations();
    if(myClub) fillClubForm(myClub);
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
