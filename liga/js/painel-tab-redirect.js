/* Liga CCFV — abre a aba indicada pela URL depois que o painel protegido carregar. */
(() => {
  "use strict";
  const requested = new URLSearchParams(location.search).get("tab");
  if (requested !== "club") return;
  let done = false;
  const check = () => {
    if (done) return;
    const app = document.getElementById("app");
    if (!app || app.hidden) return;
    const button = document.querySelector('[data-tab="club"]');
    if (!button) return;
    done = true;
    button.click();
    observer.disconnect();
  };
  const observer = new MutationObserver(check);
  observer.observe(document.documentElement, {subtree:true,childList:true,attributes:true,attributeFilter:["hidden","class"]});
  document.addEventListener("DOMContentLoaded", check, {once:true});
  check();
})();
