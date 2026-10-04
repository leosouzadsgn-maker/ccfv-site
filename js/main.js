(() => {
"use strict";

const CCFV={
    name:"CCFV",
    season:"Season 01",
    platform:"PC + Console"
};

const links=[
    ["INÍCIO","/index.html","home"],
    ["COMPETIÇÕES","/index.html#competicoes","competicoes"],
    ["BRASILEIRÃO","/pages/brasileirao.html","brasileirao"],
    ["CHAMPIONS LEAGUE","/pages/champions.html","champions"],
    ["LIBERTADORES","/pages/libertadores.html","libertadores"],
    ["NIGHT CUP","/pages/night.html","night"],
    ["MOBILE","/pages/mobile.html","mobile"],
    ["COPA DO MUNDO","/pages/copa-do-mundo.html","copa-do-mundo"],
    ["RANKING","/pages/ranking.html","ranking"],
    ["HISTÓRIA","/pages/historia.html","historia"]
];

function currentPage(){
    const p=window.location.pathname;

    if(
        p.includes("brasileirao-mobile")||
        p.includes("ranking-mobile")||
        p.includes("partidas-mobile")||
        p.includes("arena-cup")
    ) return "mobile";

    if(p.includes("brasileirao")) return "brasileirao";
    if(p.includes("champions")) return "champions";
    if(p.includes("libertadores")) return "libertadores";
    if(p.includes("night")) return "night";
    if(p.includes("mobile")) return "mobile";
    if(p.includes("copa-do-mundo")) return "copa-do-mundo";
    if(p.includes("ranking")) return "ranking";
    if(p.includes("historia")) return "historia";
    if(p.includes("competicoes")) return "competicoes";

    return "home";
}

function loadSideMenuCSS(){
    const existing = document.querySelector(
        'link[rel="stylesheet"][href*="header-side-menu.css"]'
    );

    if(existing) return;

    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="/css/header-side-menu.css";
    document.head.appendChild(link);
}

function initSideMenu(){
    loadSideMenuCSS();

    const header=document.querySelector("#site-header");
    const button=document.querySelector(".ccfv-header__menu");

    if(
        !header ||
        !button ||
        document.querySelector(".ccfv-side-menu")
    ) return;

    const menu=document.createElement("aside");

    menu.className="ccfv-side-menu";

    const page=currentPage();

    menu.innerHTML=`
        <div class="ccfv-side-menu__brand">
            <img
                src="/assets/images/logo/ccfv-logo.png"
                alt="CCFV"
            >
            <div>
                <strong>CCFV</strong>
                <span>CONFEDERAÇÃO COLISEU</span>
            </div>
        </div>

        <div class="ccfv-side-menu__label">
            UNIVERSO
        </div>

        <nav
            class="ccfv-side-menu__nav"
            aria-label="Menu principal"
        >
            ${links.map(
                ([label,href,key])=>`
                    <a
                        href="${href}"
                        class="${page===key?"is-active":""}"
                    >
                        <span></span>
                        ${label}
                    </a>
                `
            ).join("")}
        </nav>

        <div class="ccfv-side-menu__footer">
            <small>
                SEASON 01 • PC + CONSOLE • MOBILE
            </small>

            <a href="/admin/">
                ÁREA ADMINISTRATIVA →
            </a>
        </div>
    `;

    document.body.appendChild(menu);

    const overlay=document.createElement("div");
    overlay.className="ccfv-side-menu__overlay";
    document.body.appendChild(overlay);

    const close=()=>{
        menu.classList.remove("is-open");
        overlay.classList.remove("is-open");
        document.body.classList.remove("ccfv-side-open");
        button.setAttribute("aria-expanded","false");
        button.setAttribute("aria-label","Abrir menu");
    };

    const open=()=>{
        menu.classList.add("is-open");
        overlay.classList.add("is-open");
        document.body.classList.add("ccfv-side-open");
        button.setAttribute("aria-expanded","true");
        button.setAttribute("aria-label","Fechar menu");
    };

    button.addEventListener("click",event=>{
        event.preventDefault();
        event.stopPropagation();

        menu.classList.contains("is-open")
            ? close()
            : open();
    });

    overlay.addEventListener("click",close);

    document.addEventListener("keydown",event=>{
        if(event.key==="Escape") close();
    });

    menu.querySelectorAll("a").forEach(link=>{
        link.addEventListener("click",close);
    });
}

function init(){
    document.documentElement.classList.add("ccfv-ready");
    document.body.classList.add("ccfv-app-ready");

    initSideMenu();

    document
        .querySelectorAll("[data-ccfv-season]")
        .forEach(element=>{
            element.textContent=CCFV.season;
        });

    document
        .querySelectorAll("[data-ccfv-platform]")
        .forEach(element=>{
            element.textContent=CCFV.platform;
        });

    document.dispatchEvent(
        new CustomEvent(
            "ccfv:ready",
            {detail:CCFV}
        )
    );
}

if(
    document.readyState==="loading"
){
    document.addEventListener(
        "DOMContentLoaded",
        init,
        {once:true}
    );
}else{
    init();
}

})();