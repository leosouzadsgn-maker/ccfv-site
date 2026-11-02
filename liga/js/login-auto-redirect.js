/* Liga CCFV — depois do vínculo ACTIVE, segue para a criação/gestão do clube. */
(() => {
  "use strict";
  if (location.pathname !== "/liga/login.html") return;
  let redirected = false;
  const check = () => {
    if (redirected) return;
    const status = document.getElementById("player-link-status");
    if (!status || status.hidden) return;
    const approved = status.classList.contains("is-success") && /VÍNCULO APROVADO/i.test(status.textContent || "");
    if (!approved) return;
    redirected = true;
    location.replace("/liga/painel.html?tab=club");
  };
  const observer = new MutationObserver(check);
  observer.observe(document.documentElement, {subtree:true,childList:true,attributes:true,characterData:true,attributeFilter:["class","hidden"]});
  document.addEventListener("DOMContentLoaded", check, {once:true});
  check();
})();
