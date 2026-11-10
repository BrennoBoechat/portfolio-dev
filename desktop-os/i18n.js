/* Idioma do BRENNO//OS (PT/EN), compartilhado pelo desktop e pelas páginas de projeto.
   - Elemento com data-en: troca o conteúdo (pode ter HTML) pela versão em inglês; o original em PT fica guardado.
   - data-en-title / data-en-alt / data-en-aria-label / data-en-placeholder: o mesmo, para atributos.
   - A escolha fica salva no navegador; na primeira visita segue o idioma do navegador.
   - O desktop avisa as páginas abertas no Projetos.exe por postMessage; elas também ouvem o evento "storage".
   Quem precisa reagir (JS que monta texto) ouve o evento "langchange" ou lê I18N.lang. */
(function(){
  "use strict";
  const KEY = "brennoos.lang";
  const ATRIBUTOS = ["title", "alt", "aria-label", "placeholder"];

  function inicial(){
    try{ const v = localStorage.getItem(KEY); if(v === "pt" || v === "en") return v; }catch(e){}
    return /^pt\b/i.test(navigator.language || "pt") ? "pt" : "en";
  }
  let lang = inicial();

  function apply(novo){
    lang = novo === "en" ? "en" : "pt";
    const en = lang === "en";
    document.documentElement.lang = en ? "en" : "pt-BR";
    document.querySelectorAll("[data-en]").forEach(el => {
      if(el._pt === undefined) el._pt = el.innerHTML;
      el.innerHTML = en ? el.dataset.en : el._pt;
    });
    ATRIBUTOS.forEach(a => document.querySelectorAll(`[data-en-${a}]`).forEach(el => {
      const guardado = "_pt_" + a;
      if(el[guardado] === undefined) el[guardado] = el.getAttribute(a) || "";
      el.setAttribute(a, en ? el.getAttribute(`data-en-${a}`) : el[guardado]);
    }));
    dispatchEvent(new CustomEvent("langchange", { detail: lang }));
  }
  function set(novo){
    try{ localStorage.setItem(KEY, novo); }catch(e){}
    apply(novo);
  }

  window.I18N = {
    get lang(){ return lang; },
    apply, set,
    /* atalho para textos montados no JS: I18N.t("Abrir", "Open") */
    t: (pt, en) => lang === "en" ? en : pt,
  };

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => apply(lang));
  else apply(lang);
  addEventListener("message", e => { if(e.data && e.data.type === "brennoos-lang") apply(e.data.lang); });
  addEventListener("storage", e => { if(e.key === KEY && e.newValue) apply(e.newValue); });
})();
