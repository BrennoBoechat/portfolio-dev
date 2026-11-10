/* Mensageria — sistema emulado + animações da página.
   Tudo aqui é inventado: contatos, e-mails, envios e auditoria vivem só na memória
   desta página e somem ao recarregar. Nenhum dado do sistema real foi usado,
   e nada sai do navegador (nem os anexos: só o nome e o tamanho aparecem na tela). */
"use strict";
document.documentElement.classList.add("js");

/* =================== HELPERS =================== */
function h(tag, props, ...kids){
  const n = document.createElement(tag);
  if(props) for(const k in props){
    const v = props[k];
    if(v == null || v === false) continue;
    if(k === "class") n.className = v;
    else if(k === "style") n.setAttribute("style", v);
    else if(k.startsWith("on")) n.addEventListener(k.slice(2).toLowerCase(), v);
    else if(k === "value" || k === "checked" || k === "disabled") n[k] = v;
    else n.setAttribute(k, v === true ? "" : v);
  }
  for(const c of kids.flat(Infinity)){
    if(c == null || c === false) continue;
    n.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return n;
}
const hora = d => d.toTimeString().slice(0, 8);
const sorteio = (a, b) => a + Math.random() * (b - a);
const norm = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const tamanho = n => n < 1048576 ? Math.max(1, Math.round(n / 1024)) + " KB" : (n / 1048576).toFixed(1) + " MB";
const plural = (n, um, varios) => n + " " + (n === 1 ? um : varios);
const reduzMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* =================== DADOS FICTÍCIOS =================== */
const PAISES = ["Argentina", "Bolívia", "Brasil", "Chile", "Paraguai", "Peru", "Uruguai"];
const INSTANCIAS = ["Conselho", "Comissão Diretiva", "Secretaria Técnica", "Cidade membro"];
const UNIDADES = ["Cultura", "Educação", "Meio Ambiente", "Turismo", "Juventude", "Gênero", "Desenvolvimento Econômico"];
const CARGO = { Argentina:"Intendente", Bolívia:"Alcalde(sa)", Brasil:"Prefeito(a)", Chile:"Alcalde(sa)", Paraguai:"Intendente", Peru:"Alcalde(sa)", Uruguai:"Intendente" };

/* cidade, país, autoridade (nome inventado), caixa de e-mail (null = sem e-mail), instância, unidades temáticas, adimplente */
const BASE = [
  ["Montevidéu",     "Uruguai",   "Lucía Ferreyra",    "gabinete", "Comissão Diretiva",  ["Cultura", "Turismo"],                 true ],
  ["Canelones",      "Uruguai",   "Martín Olivera",    "relint",   "Cidade membro",      ["Meio Ambiente"],                      true ],
  ["Paysandú",       "Uruguai",   "Sofía Bentancur",   null,       "Cidade membro",      ["Juventude"],                          false],
  ["Rosário",        "Argentina", "Diego Saravia",     "gabinete", "Conselho",           ["Desenvolvimento Econômico", "Cultura"], true ],
  ["Córdoba",        "Argentina", "Valentina Ríos",    "relint",   "Comissão Diretiva",  ["Educação"],                           true ],
  ["Mendoza",        "Argentina", "Joaquín Paredes",   "gabinete", "Cidade membro",      ["Turismo", "Meio Ambiente"],           false],
  ["Tandil",         "Argentina", "Camila Duarte",     "relint",   "Cidade membro",      ["Juventude", "Educação"],              true ],
  ["Porto Alegre",   "Brasil",    "Renata Moura",      "gabinete", "Conselho",           ["Gênero", "Cultura"],                  true ],
  ["Belo Horizonte", "Brasil",    "Carlos Andrade",    "relint",   "Secretaria Técnica", ["Educação"],                           true ],
  ["Curitiba",       "Brasil",    "Juliana Teixeira",  "gabinete", "Cidade membro",      ["Meio Ambiente"],                      true ],
  ["Recife",         "Brasil",    "Paulo Cavalcanti",  "relint",   "Cidade membro",      ["Cultura", "Turismo"],                 false],
  ["Salvador",       "Brasil",    "Marina Santana",    "gabinete", "Comissão Diretiva",  ["Gênero"],                             true ],
  ["Fortaleza",      "Brasil",    "Rafael Holanda",    null,       "Cidade membro",      ["Juventude"],                          true ],
  ["Valparaíso",     "Chile",     "Ignacia Muñoz",     "alcaldia", "Conselho",           ["Cultura", "Turismo"],                 true ],
  ["Concepción",     "Chile",     "Tomás Fuentes",     "relint",   "Cidade membro",      ["Educação"],                           false],
  ["La Serena",      "Chile",     "Antonia Rojas",     "alcaldia", "Cidade membro",      ["Meio Ambiente"],                      true ],
  ["Assunção",       "Paraguai",  "Luis Benítez",      "gabinete", "Comissão Diretiva",  ["Desenvolvimento Econômico"],          true ],
  ["Encarnación",    "Paraguai",  "Gabriela Acosta",   "relint",   "Cidade membro",      ["Turismo"],                            true ],
  ["La Paz",         "Bolívia",   "Andrés Quispe",     "alcaldia", "Conselho",           ["Gênero", "Educação"],                 true ],
  ["Cochabamba",     "Bolívia",   "Daniela Mamani",    "relint",   "Cidade membro",      ["Meio Ambiente"],                      false],
  ["Santa Cruz",     "Bolívia",   "Hugo Vaca",         "alcaldia", "Cidade membro",      ["Desenvolvimento Econômico"],          true ],
  ["Lima",           "Peru",      "Mariana Castillo",  "relint",   "Secretaria Técnica", ["Cultura"],                            true ],
  ["Arequipa",       "Peru",      "Jorge Salazar",     "alcaldia", "Cidade membro",      ["Turismo", "Juventude"],               true ],
  ["Cusco",          "Peru",      "Rosa Huamán",       "alcaldia", "Cidade membro",      ["Turismo", "Cultura"],                 false],
];
/* ".exemplo" não é um domínio real: nenhum endereço daqui existe */
const dominio = cidade => norm(cidade).replace(/[^a-z0-9]+/g, "") + ".exemplo";
function contatosIniciais(){
  return BASE.map(([cidade, pais, nome, caixa, instancia, unidades, adimplente], i) => ({
    id: i + 1, cidade, pais, cargo: CARGO[pais], nome,
    email: caixa ? `${caixa}@${dominio(cidade)}` : "",
    instancia, unidades: [...unidades], adimplente,
  }));
}

/* =================== REGRAS DA EMULAÇÃO =================== */
const SENHA_DEMO = "demo123";
const MAX_TENTATIVAS = 3;
const BLOQUEIO_S = 15;
const POOL = 6;                 // envios simultâneos, como no sistema real
const POR_PAGINA = 6;
const CHANCE_429 = 0.18;        // chance de o Office 365 "limitar a taxa" na 1ª tentativa
const TIPOS_ANEXO = ["pdf", "png", "jpg", "jpeg", "docx"];
const LIMITE_ANEXO = 10 * 1048576;
const REMETENTE = "mensageria@sexec.exemplo";
const ASSUNTO = "Convite — Encontro anual da rede";
const CORPO = "Prezado(a) {{nome}},\n\nA Secretaria Executiva tem a satisfação de convidar {{cidade}} para o encontro anual da rede, em formato híbrido.\n\nA confirmação pode ser enviada para este endereço.\n\nAtenciosamente,\nSecretaria Executiva";
const PASSOS_SSO = [
  "Redirecionando para o Microsoft Entra ID…",
  "Conta Microsoft autenticada",
  "id_token validado (assinatura e emissor)",
  "Sessão criada: JWT + refresh token",
];

/* troca {{nome}}, {{cidade}} e {{email}} pelos dados do contato; devolve pedaços de texto
   e <mark> (pra destacar o que foi trocado) — nunca HTML cru */
function preencher(modelo, c){
  const out = []; let fim = 0;
  modelo.replace(/\{\{(nome|cidade|email)\}\}/g, (achado, chave, pos) => {
    out.push(modelo.slice(fim, pos), h("mark", null, c[chave]));
    fim = pos + achado.length;
    return achado;
  });
  out.push(modelo.slice(fim));
  return out;
}

/* =================== O SISTEMA EMULADO =================== */
/* Cria uma instância do app dentro de `root`.
   Com `preset`, a instância é só um desenho estático (os "prints" da página): sem timers nem toasts. */
function criarApp(root, preset){
  const estatico = !!preset;
  const timers = new Set();
  let S, corpoEl, relogio = null;   // relogio: tique único da contagem do bloqueio

  function depois(fn, ms){
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
  }
  function limparTimers(){
    timers.forEach(clearTimeout); timers.clear();
    clearTimeout(relogio); relogio = null;
  }

  function estadoInicial(){
    return {
      tela: "login", tema: "light", user: null,
      login: { email: "visitante@mensageria.exemplo", senha: SENHA_DEMO, tentativas: 0, bloqueadoAte: 0, erro: "", ocupado: false, sso: 0 },
      contatos: contatosIniciais(),
      cf: { q: "", pais: "", instancia: "", unidade: "", pagina: 1 },
      envio: { sel: new Set(), q: "", instancia: "", unidade: "", assunto: ASSUNTO, corpo: CORPO, anexos: [], erros: {} },
      fila: null, audit: [], auditAberta: false, modal: null,
      stats: { enviados: 0 },
    };
  }

  /* ---------- auditoria ---------- */
  function log(acao, detalhe){
    S.audit.unshift({ t: new Date(), acao, detalhe, quem: S.user ? "visitante" : (S.login.email.trim() || "anônimo") });
    if(estatico) return;
    const n = root.querySelector("[data-audit]");
    if(n) n.textContent = S.audit.length;
    const d = root.querySelector(".drawer");
    if(d) d.replaceWith(gaveta());
  }
  function toast(msg){
    if(estatico) return;
    const t = h("div", { class: "toast", role: "status" }, msg);
    root.append(t);
    setTimeout(() => t.remove(), 2400);
  }

  /* ---------- desenho ---------- */
  function render(){
    root.className = "mx" + (S.tema === "dark" ? " dark" : "") + (estatico ? " static" : "");
    corpoEl = h("div", { class: "mx-body" }, TELAS[S.tela]());
    // replaceChildren transforma null no texto "null", por isso o filtro
    root.replaceChildren(...[cabecalho(), corpoEl, S.auditAberta && gaveta(), S.modal && MODAIS[S.modal.tipo]()].filter(Boolean));
  }
  function renderCorpo(){ corpoEl.replaceChildren(TELAS[S.tela]()); }

  function ir(tela){
    if(tela === "enviar" && S.fila && S.fila.rodando) tela = "envio";   // envio em andamento: volta pra fila
    S.tela = tela; S.modal = null;
    render();
    if(tela === "login" && S.login.bloqueadoAte > Date.now()) agendarContagem();
  }

  function cabecalho(){
    const logado = !!S.user;
    const aba = (id, rotulo) => h("button", {
      class: "mx-tab" + (S.tela === id || (id === "enviar" && S.tela === "envio") ? " on" : ""),
      type: "button", onclick: () => ir(id) }, rotulo);
    return h("div", { class: "mx-head" },
      h("div", { class: "mx-logo" }, h("span", { class: "ico" }, "✉"), h("div", null, "Mensageria", h("small", null, "SEXEC · MERCOCIDADES"))),
      logado && [aba("hub", "⌂ Início"), aba("enviar", "✉ Enviar"), aba("contatos", "👥 Contatos")],
      h("div", { class: "mx-sp" }),
      logado && h("button", { class: "mx-ib", type: "button", title: "Log de auditoria",
        onclick: () => { S.auditAberta = !S.auditAberta; render(); } }, "📜 ", h("span", { "data-audit": "" }, S.audit.length)),
      h("button", { class: "mx-ib", type: "button", title: "Tema claro/escuro",
        onclick: () => { S.tema = S.tema === "dark" ? "light" : "dark"; render(); } }, S.tema === "dark" ? "☀" : "☾"),
      logado && h("span", { class: "mx-user" }, "👤 " + S.user.nome + " · ADMIN"),
      logado && h("button", { class: "mx-ib", type: "button", onclick: sair }, "Sair"));
  }

  /* ---------- LOGIN ---------- */
  function telaLogin(){
    const L = S.login;
    const resta = Math.ceil((L.bloqueadoAte - Date.now()) / 1000);
    const bloqueado = resta > 0;
    const marca = h("div", { class: "brand" }, h("div", { class: "mx-logo" }, h("span", { class: "ico" }, "✉"), h("div", null, "Mensageria", h("small", null, "GESTÃO DE CONTATOS E ENVIO"))));

    if(L.ocupado === "sso"){
      return h("div", { class: "mx-login" }, h("div", { class: "card" }, marca,
        h("div", { class: "muted" }, "Entrando com a conta Microsoft…"),
        h("ol", { class: "sso" }, PASSOS_SSO.map((p, i) =>
          h("li", { class: i < L.sso ? "feito" : i === L.sso ? "agora" : "" },
            h("i", null, i < L.sso ? "✓" : i === L.sso ? h("span", { class: "spin" }, "◌") : "·"), p)))));
    }

    return h("div", { class: "mx-login" },
      h("form", { class: "card", onsubmit: e => { e.preventDefault(); entrar(); } }, marca,
        h("label", { class: "l" }, "E-mail"),
        h("input", { class: "in", type: "email", value: L.email, autocomplete: "off", oninput: e => L.email = e.target.value }),
        h("label", { class: "l" }, "Senha"),
        h("input", { class: "in", type: "password", value: L.senha, autocomplete: "off", oninput: e => L.senha = e.target.value }),
        h("div", { style: "margin-top:12px" },
          h("button", { class: "b pri full", type: "submit", disabled: bloqueado || !!L.ocupado }, L.ocupado === "senha" ? "Autenticando…" : "Entrar")),
        h("div", { class: "or" }, "ou"),
        h("button", { class: "b ms full", type: "button", disabled: !!L.ocupado, onclick: entrarSSO }, "⊞ Entrar com Microsoft"),
        bloqueado ? h("div", { class: "alert warn" }, `🔒 Conta bloqueada por segurança. Tente de novo em ${resta}s.`)
          : L.erro ? h("div", { class: "alert err" }, L.erro) : null,
        h("div", { class: "hint" }, "senha da demo: demo123")));
  }
  function entrar(){
    const L = S.login;
    if(L.ocupado || L.bloqueadoAte > Date.now()) return;
    if(!L.email.trim()){ L.erro = "Informe o e-mail."; return renderCorpo(); }
    if(L.senha !== SENHA_DEMO){
      L.tentativas++;
      log("LOGIN_FALHA", `${L.email.trim()} · tentativa ${L.tentativas}/${MAX_TENTATIVAS}`);
      if(L.tentativas >= MAX_TENTATIVAS){
        L.tentativas = 0; L.erro = "";
        L.bloqueadoAte = Date.now() + BLOQUEIO_S * 1000;
        log("CONTA_BLOQUEADA", `${BLOQUEIO_S}s após ${MAX_TENTATIVAS} falhas seguidas`);
        agendarContagem();
      } else {
        L.erro = `E-mail ou senha inválidos (tentativa ${L.tentativas}/${MAX_TENTATIVAS}).`;
      }
      return renderCorpo();
    }
    L.ocupado = "senha"; L.erro = "";
    renderCorpo();
    depois(() => { L.ocupado = false; logar("senha"); }, 700);
  }
  /* redesenha o login a cada segundo enquanto a conta estiver bloqueada; nunca agenda dois tiques */
  function agendarContagem(){
    if(relogio) return;
    relogio = setTimeout(() => { relogio = null; contagem(); }, 1000);
  }
  function contagem(){
    if(S.tela !== "login") return;
    renderCorpo();
    if(S.login.bloqueadoAte > Date.now()) agendarContagem();
  }
  function entrarSSO(){
    const L = S.login;
    if(L.ocupado) return;
    L.ocupado = "sso"; L.sso = 0; L.erro = "";
    renderCorpo();
    const passo = () => {
      L.sso++;
      renderCorpo();
      if(L.sso < PASSOS_SSO.length) depois(passo, 550);
      else depois(() => { L.ocupado = false; L.sso = 0; logar("sso"); }, 450);
    };
    depois(passo, 650);
  }
  function logar(via){
    S.user = { nome: "Visitante", via };
    log(via === "sso" ? "LOGIN_SSO" : "LOGIN_SUCESSO", via === "sso" ? "Microsoft Entra ID" : "e-mail e senha");
    ir("hub");
  }
  function sair(){
    log("LOGOUT", "sessão encerrada");
    limparTimers();
    S.user = null; S.fila = null; S.auditAberta = false;
    S.login.ocupado = false;
    ir("login");
  }

  /* ---------- HUB ---------- */
  function telaHub(){
    const kpi = (n, rotulo) => h("div", { class: "kpi" }, h("b", null, n), rotulo);
    return h("div", null,
      h("h4", null, `Olá, ${S.user.nome}!`),
      h("div", { class: "muted" }, "O que você quer fazer hoje?"),
      h("div", { class: "mx-hub-cards" },
        h("button", { class: "hubcard a", type: "button", onclick: () => ir("enviar") },
          h("div", { class: "hi" }, "✉"), h("b", null, "Envio de Mensagens"),
          h("span", null, "Componha e dispare e-mails em massa usando filtros de destinatários.")),
        h("button", { class: "hubcard c", type: "button", onclick: () => ir("contatos") },
          h("div", { class: "hi" }, "👥"), h("b", null, "Base de Contatos"),
          h("span", null, "Gerencie cidades, autoridades e e-mails institucionais."))),
      h("div", { class: "mx-kpis" },
        kpi(S.contatos.length, "cidades na base"),
        kpi(S.contatos.filter(c => c.email).length, "com e-mail"),
        kpi(S.stats.enviados, "enviados na sessão"),
        kpi(S.audit.length, "eventos auditados")));
  }

  /* ---------- CONTATOS ---------- */
  function filtrarContatos(){
    const f = S.cf, q = norm(f.q);
    return S.contatos.filter(c =>
      (!q || norm(`${c.cidade} ${c.nome} ${c.email} ${c.cargo}`).includes(q)) &&
      (!f.pais || c.pais === f.pais) &&
      (!f.instancia || c.instancia === f.instancia) &&
      (!f.unidade || c.unidades.includes(f.unidade)));
  }
  /* <select> com "todos" + opções; ao mudar, grava em obj[campo] e chama aoMudar */
  function seletor(obj, campo, todos, opcoes, aoMudar){
    const s = h("select", { class: "in", onchange: e => { obj[campo] = e.target.value; aoMudar(); } },
      h("option", { value: "" }, todos), opcoes.map(o => h("option", { value: o }, o)));
    s.value = obj[campo];
    return s;
  }
  function telaContatos(){
    const f = S.cf;
    const area = h("div");
    const desenhar = () => area.replaceChildren(tabelaContatos(desenhar));
    const filtrou = () => { f.pagina = 1; desenhar(); };
    desenhar();
    return h("div", null,
      h("div", { class: "mx-row" },
        h("div", { style: "flex:1" }, h("h4", null, "Base de Contatos"), h("div", { class: "muted" }, "Cidades da rede Mercocidades")),
        h("button", { class: "b pri", type: "button", onclick: () => abrirModal({ tipo: "contato" }) }, "+ Novo contato")),
      h("div", { class: "mx-filters" },
        h("input", { class: "in", type: "search", placeholder: "Pesquisar por nome, e-mail ou autoridade...", value: f.q,
          oninput: e => { f.q = e.target.value; filtrou(); } }),
        seletor(f, "pais", "Todos os Países", PAISES, filtrou),
        seletor(f, "instancia", "Todas as Instâncias", INSTANCIAS, filtrou),
        seletor(f, "unidade", "Todas as Unid. Temáticas", UNIDADES, filtrou)),
      area);
  }
  function tabelaContatos(redesenhar){
    const f = S.cf, lista = filtrarContatos();
    const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
    f.pagina = Math.min(f.pagina, paginas);
    const ini = (f.pagina - 1) * POR_PAGINA, pagina = lista.slice(ini, ini + POR_PAGINA);
    const linhas = pagina.length ? pagina.map(c => h("tr", null,
        h("td", null, h("b", null, c.cidade), h("div", null,
          h("span", { class: "tag m" }, c.instancia),
          h("span", { class: "tag " + (c.adimplente ? "ok" : "no") }, c.adimplente ? "adimplente" : "inadimplente"))),
        h("td", null, c.pais),
        h("td", null, h("div", { class: "muted", style: "font-size:10px" }, c.cargo), c.nome),
        h("td", null, c.email ? h("span", { class: "mono" }, c.email) : h("span", { class: "tag no" }, "sem e-mail")),
        h("td", { style: "white-space:nowrap" },
          h("button", { class: "icon-btn", type: "button", title: "Editar contato", onclick: () => abrirModal({ tipo: "contato", id: c.id }) }, "✎"), " ",
          h("button", { class: "icon-btn", type: "button", title: "Excluir contato", onclick: () => abrirModal({ tipo: "excluir", id: c.id }) }, "🗑"))))
      : h("tr", null, h("td", { colspan: "5", class: "muted", style: "text-align:center;padding:18px" }, "Nenhuma cidade encontrada."));
    return h("div", null,
      h("div", { class: "tbl" }, h("table", null,
        h("thead", null, h("tr", null, ["Cidade / Instituição", "País", "Autoridade Máxima", "E-mail Principal", "Ações"].map(t => h("th", null, t)))),
        h("tbody", null, linhas))),
      h("div", { class: "pager" },
        h("span", { class: "muted" }, lista.length ? `Mostrando ${ini + 1}–${ini + pagina.length} de ${lista.length}` : "0 resultados"),
        h("div", { class: "mx-row" },
          h("button", { class: "b sm", type: "button", disabled: f.pagina <= 1, onclick: () => { f.pagina--; redesenhar(); } }, "‹"),
          h("span", null, `${f.pagina} / ${paginas}`),
          h("button", { class: "b sm", type: "button", disabled: f.pagina >= paginas, onclick: () => { f.pagina++; redesenhar(); } }, "›"))));
  }

  /* ---------- ENVIAR (compor) ---------- */
  function destinatariosVisiveis(){
    const E = S.envio, q = norm(E.q);
    return S.contatos.filter(c =>
      (!q || norm(`${c.cidade} ${c.nome} ${c.email}`).includes(q)) &&
      (!E.instancia || c.instancia === E.instancia) &&
      (!E.unidade || c.unidades.includes(E.unidade)));
  }
  const alvosSelecionados = () => S.contatos.filter(c => S.envio.sel.has(c.id) && c.email);

  function telaEnviar(){
    const E = S.envio;
    const lista = h("div", { class: "rcpt-list" });
    const contador = h("span", { class: "muted" });
    const todos = h("input", { type: "checkbox", onchange: e => {
      destinatariosVisiveis().filter(c => c.email).forEach(c => e.target.checked ? E.sel.add(c.id) : E.sel.delete(c.id));
      E.erros.dest = false; desenharLista();
    } });
    const erroDest = h("div");
    const btnEnviar = h("button", { class: "b pri", type: "button", onclick: enviar });

    function atualizar(){
      const elegiveis = destinatariosVisiveis().filter(c => c.email);
      const marcados = elegiveis.filter(c => E.sel.has(c.id)).length;
      todos.checked = elegiveis.length > 0 && marcados === elegiveis.length;
      todos.indeterminate = marcados > 0 && !todos.checked;
      const n = alvosSelecionados().length;
      contador.textContent = plural(n, "selecionado", "selecionados");
      btnEnviar.textContent = `Enviar ➤ (${n})`;
      erroDest.replaceChildren(E.erros.dest ? h("div", { class: "errmsg" }, "Por favor, selecione ao menos um destinatário.") : "");
    }
    function desenharLista(){
      const vis = destinatariosVisiveis();
      lista.replaceChildren(...(vis.length ? vis.map(c => h("label", { class: "rc" + (c.email ? "" : " off") },
          h("input", { type: "checkbox", disabled: !c.email, checked: E.sel.has(c.id), onchange: e => {
            e.target.checked ? E.sel.add(c.id) : E.sel.delete(c.id);
            E.erros.dest = false; atualizar();
          } }),
          h("span", null, h("b", null, c.cidade), " — ", c.nome, h("small", null, c.email || "sem e-mail"))))
        : [h("div", { class: "muted", style: "padding:10px;text-align:center" }, "Nenhuma cidade encontrada.")]));
      atualizar();
    }

    const corpo = h("textarea", { class: "in" + (E.erros.corpo ? " err" : ""), placeholder: "Escreva sua mensagem aqui...", value: E.corpo,
      oninput: e => { E.corpo = e.target.value; } });
    const inserir = v => {
      const ini = corpo.selectionStart ?? corpo.value.length, fim = corpo.selectionEnd ?? ini;
      corpo.setRangeText(`{{${v}}} `, ini, fim, "end");
      E.corpo = corpo.value; corpo.focus();
    };

    /* anexos: o arquivo nunca é lido nem enviado — só nome e tamanho entram na lista */
    const arquivos = h("div", { class: "files" });
    const desenharAnexos = () => arquivos.replaceChildren(...E.anexos.map((a, i) =>
      h("span", { class: "file" }, `📎 ${a.nome} · ${tamanho(a.tamanho)}`,
        h("button", { type: "button", title: "Remover", onclick: () => { E.anexos.splice(i, 1); desenharAnexos(); } }, "✕"))));
    const seletorArquivo = h("input", { type: "file", multiple: true, accept: TIPOS_ANEXO.map(t => "." + t).join(","), style: "display:none",
      onchange: e => {
        for(const f of e.target.files){
          const ext = (f.name.split(".").pop() || "").toLowerCase();
          if(!TIPOS_ANEXO.includes(ext)) toast(`✖ ${f.name}: tipo não permitido`);
          else if(f.size > LIMITE_ANEXO) toast(`✖ ${f.name}: maior que 10 MB`);
          else E.anexos.push({ nome: f.name, tamanho: f.size });
        }
        e.target.value = ""; desenharAnexos();
      } });

    desenharLista(); desenharAnexos();
    const redesenhaFiltro = () => desenharLista();
    return h("div", { class: "mx-send" },
      h("div", { class: "pane" },
        h("div", { class: "pane-h" }, h("span", null, "Destinatários"), contador),
        h("input", { class: "in", type: "search", placeholder: "Buscar por nome, e-mail ou cidade...", value: E.q,
          oninput: e => { E.q = e.target.value; desenharLista(); } }),
        h("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px" },
          seletor(E, "instancia", "Todas as Instâncias", INSTANCIAS, redesenhaFiltro),
          seletor(E, "unidade", "Todas as Unid. Temáticas", UNIDADES, redesenhaFiltro)),
        h("label", { class: "chk", style: "margin-top:6px" }, todos, "Selecionar todos os filtrados"),
        lista, erroDest),
      h("div", { class: "pane compose" },
        h("div", { class: "pane-h" }, h("span", null, "Compor E-mail")),
        h("label", { class: "l", style: "margin-top:0" }, "Assunto"),
        h("input", { class: "in" + (E.erros.assunto ? " err" : ""), placeholder: "Digite o assunto do e-mail...", value: E.assunto,
          oninput: e => { E.assunto = e.target.value; } }),
        E.erros.assunto && h("div", { class: "errmsg" }, "O assunto é obrigatório."),
        h("div", { class: "vars" }, "Variáveis:",
          ["nome", "cidade", "email"].map(v => h("button", { class: "var", type: "button", onclick: () => inserir(v) }, `{{${v}}}`))),
        corpo,
        E.erros.corpo && h("div", { class: "errmsg" }, "O corpo da mensagem é obrigatório."),
        h("label", { class: "l" }, "Anexos"),
        h("div", { class: "drop", role: "button", tabindex: "0", onclick: () => seletorArquivo.click(),
          onkeydown: e => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); seletorArquivo.click(); } } },
          h("b", null, "Clique para upload"), " · PDF, PNG, JPG ou DOCX (Max. 10MB)"),
        seletorArquivo, arquivos,
        h("div", { class: "actions" },
          h("button", { class: "b", type: "button", onclick: () => abrirModal({ tipo: "preview", i: 0 }) }, "👁 Pré-visualizar"),
          h("button", { class: "b", type: "button", onclick: salvarRascunho }, "💾 Salvar rascunho"),
          btnEnviar)));
  }
  function salvarRascunho(){
    const E = S.envio;
    log("RASCUNHO_SALVO", `“${E.assunto.trim() || "(sem assunto)"}” · ${plural(alvosSelecionados().length, "destinatário", "destinatários")}`);
    toast("💾 Rascunho salvo");
  }
  function enviar(){
    const E = S.envio, alvos = alvosSelecionados();
    E.erros = { dest: !alvos.length, assunto: !E.assunto.trim(), corpo: !E.corpo.trim() };
    if(E.erros.dest || E.erros.assunto || E.erros.corpo) return renderCorpo();
    iniciarEnvio(alvos);
  }

  /* ---------- ENVIO (fila + pool) ---------- */
  function iniciarEnvio(alvos){
    /* uma mensagem por lote falha de vez, pra mostrar a DLQ e o reprocessamento */
    const azarado = alvos.length >= 5 ? Math.floor(Math.random() * alvos.length) : -1;
    S.fila = {
      assunto: S.envio.assunto.trim(), inicio: Date.now(), rodando: true, retentativas: 0, contados: 0, log: [],
      itens: alvos.map((c, i) => ({ id: c.id, cidade: c.cidade, email: c.email, status: "fila", tent: 0, lane: null, falhar: i === azarado })),
    };
    filaLog("i", `Lote criado: ${plural(alvos.length, "destinatário", "destinatários")} · pool de ${POOL}`);
    log("ENVIO_INICIADO", `“${S.fila.assunto}” · ${plural(alvos.length, "destinatário", "destinatários")}`);
    ir("envio");
    agendar();
  }
  function filaLog(tipo, msg){
    S.fila.log.push({ t: hora(new Date()), tipo, msg });
    if(S.fila.log.length > 80) S.fila.log.shift();
  }
  /* preenche os workers livres com o que está na fila */
  function agendar(){
    const F = S.fila;
    if(!F || !F.rodando) return;
    const ocupados = new Set(F.itens.filter(i => i.lane != null).map(i => i.lane));
    for(const it of F.itens){
      if(ocupados.size >= POOL) break;
      if(it.status !== "fila") continue;
      let lane = 0;
      while(ocupados.has(lane)) lane++;
      ocupados.add(lane);
      it.lane = lane; it.status = "enviando";
      disparar(it);
    }
    if(F.itens.every(i => i.status === "ok" || i.status === "dlq")) concluir();
    pintar();
  }
  function disparar(it){
    const F = S.fila;
    it.tent++;
    depois(() => {
      if(it.tent === 1 && !it.limpo && Math.random() < CHANCE_429){
        const s = 1 + Math.floor(Math.random() * 2);
        it.status = "espera"; F.retentativas++;
        filaLog("w", `429 Too Many Requests · ${it.cidade} — nova tentativa em ${s}s`);
        depois(() => { it.status = "enviando"; disparar(it); pintar(); }, s * 1000);
        return pintar();
      }
      it.lane = null;
      if(it.falhar){
        it.status = "dlq";
        filaLog("e", `Falha definitiva · ${it.cidade} → Dead Letter Queue`);
      } else {
        it.status = "ok";
        filaLog("ok", `202 Accepted · ${it.cidade} <${it.email}>`);
      }
      agendar();
    }, sorteio(380, 1100));
  }
  function concluir(){
    const F = S.fila;
    F.rodando = false;
    const ok = F.itens.filter(i => i.status === "ok").length, dlq = F.itens.length - ok;
    S.stats.enviados += ok - F.contados; F.contados = ok;
    filaLog("i", `Lote finalizado em ${((Date.now() - F.inicio) / 1000).toFixed(1)}s · ${ok} ✓ · ${dlq} na DLQ`);
    log("ENVIO_CONCLUIDO", `${ok} enviados · ${dlq} na DLQ`);
    if(S.tela !== "envio") toast(`✉ Envio concluído: ${ok} ✓`);
  }
  function reprocessarDLQ(){
    const F = S.fila, dl = F.itens.filter(i => i.status === "dlq");
    dl.forEach(i => { i.status = "fila"; i.tent = 0; i.falhar = false; i.limpo = true; });
    F.rodando = true; F.inicio = Date.now();
    filaLog("i", `Reprocessando ${plural(dl.length, "mensagem", "mensagens")} da DLQ`);
    log("DLQ_REPROCESSADA", plural(dl.length, "mensagem", "mensagens"));
    agendar();
  }
  function pintar(){ if(S.tela === "envio") renderCorpo(); }

  function telaEnvio(){
    const F = S.fila;
    if(!F) return h("div", { class: "muted" }, "Nenhum envio em andamento.");
    const conta = st => F.itens.filter(i => i.status === st).length;
    const n = F.itens.length, ok = conta("ok"), dlq = conta("dlq"), naFila = conta("fila");
    const pct = Math.round((ok + dlq) / n * 100);
    const pendentes = F.itens.filter(i => i.status === "fila");
    const mortos = F.itens.filter(i => i.status === "dlq");

    const workers = Array.from({ length: POOL }, (_, k) => {
      const it = F.itens.find(i => i.lane === k);
      if(!it) return h("div", { class: "lane" }, h("div", { class: "wk" }, `WORKER ${k + 1}`), h("div", { class: "muted" }, "livre"));
      const esperando = it.status === "espera";
      return h("div", { class: "lane " + (esperando ? "retry" : "busy") },
        h("div", { class: "wk" }, `WORKER ${k + 1}`),
        h("div", null, esperando ? "⏳" : h("span", { class: "spin" }, "◌"), " ", it.cidade),
        h("small", null, esperando ? "429 · aguardando" : `POST /emails · tentativa ${it.tent}`));
    });

    const term = h("div", { class: "term", "aria-live": "polite" },
      F.log.map(l => h("div", { class: l.tipo }, h("span", { class: "t" }, l.t + " "), l.msg)));
    requestAnimationFrame(() => { term.scrollTop = term.scrollHeight; });

    return h("div", null,
      h("div", { class: "mx-row" },
        h("h4", { style: "flex:1;min-width:0" }, "Disparando “", F.assunto, "”"),
        h("span", { class: "tag " + (F.rodando ? "m" : "ok") }, F.rodando ? "EM ANDAMENTO" : "CONCLUÍDO")),
      h("div", { class: "prog" }, h("i", { style: `width:${pct}%` }), h("span", null, `${pct}% · ${ok + dlq} de ${n}`)),
      h("div", { class: "counts" },
        h("span", { class: "cnt" }, `✓ ${ok} enviados`),
        h("span", { class: "cnt" }, `⏳ ${naFila} na fila`),
        h("span", { class: "cnt" }, `⟳ ${F.retentativas} retentativas`),
        h("span", { class: "cnt" }, `☠ ${dlq} na DLQ`)),
      h("div", { class: "flow" },
        h("div", { class: "queue" },
          h("div", { class: "qt" }, "🐇 Fila RabbitMQ"),
          pendentes.length ? [pendentes.slice(0, 5).map(i => h("div", { class: "qitem" }, i.cidade)),
            pendentes.length > 5 && h("div", { class: "muted", style: "font-size:10px" }, `+${pendentes.length - 5} na fila`)]
            : h("div", { class: "muted", style: "font-size:11px" }, "vazia"),
          mortos.length > 0 && [h("div", { class: "qt", style: "margin-top:8px" }, "☠ DLQ"), mortos.map(i => h("div", { class: "qitem dl" }, i.cidade))]),
        h("div", null,
          h("div", { class: "qt" }, `Pool de envio — ${POOL} simultâneos`),
          h("div", { class: "lanes" }, workers))),
      term,
      !F.rodando && h("div", { class: "done" },
        h("b", null, dlq ? `${ok} enviados, ${dlq} na DLQ` : `✓ Todos os ${ok} e-mails enviados`),
        h("div", { class: "mx-sp" }),
        dlq > 0 && h("button", { class: "b", type: "button", onclick: reprocessarDLQ }, `↻ Reprocessar DLQ (${dlq})`),
        h("button", { class: "b", type: "button", onclick: () => { S.auditAberta = true; render(); } }, "📜 Ver auditoria"),
        h("button", { class: "b pri", type: "button", onclick: () => { S.fila = null; ir("enviar"); } }, "✉ Novo envio")));
  }

  /* ---------- GAVETA DE AUDITORIA ---------- */
  function gaveta(){
    return h("aside", { class: "drawer", "aria-label": "Log de auditoria" },
      h("header", null, h("span", null, "📜 Log de auditoria"),
        h("button", { class: "x", type: "button", "aria-label": "Fechar", onclick: () => { S.auditAberta = false; render(); } }, "×")),
      h("div", { class: "alist" }, S.audit.length
        ? S.audit.map(a => h("div", { class: "aev" },
            h("div", null, h("span", { class: "t" }, hora(a.t)), " ", h("code", null, a.acao)),
            h("div", null, a.detalhe),
            h("div", { class: "t" }, "por " + a.quem)))
        : h("div", { class: "muted", style: "padding:10px 0" }, "Nenhum evento ainda.")),
      h("footer", null, "Registros imutáveis · retenção configurável"));
  }

  /* ---------- DIÁLOGOS ---------- */
  function abrirModal(m){
    if(m.tipo === "contato"){
      const c = m.id ? S.contatos.find(x => x.id === m.id) : null;
      m.rasc = c ? { ...c, unidades: [...c.unidades] }
        : { cidade: "", pais: "Brasil", cargo: CARGO.Brasil, nome: "", email: "", instancia: "Cidade membro", unidades: [], adimplente: true };
      m.erros = {};
    }
    S.modal = m;
    render();
    const primeiro = root.querySelector(".dlg input, .dlg button.pri, .dlg .x");
    if(primeiro) primeiro.focus();
  }
  function fecharModal(){ S.modal = null; render(); }
  function janela(titulo, conteudo, acoes, largo){
    return h("div", { class: "ov", onclick: e => { if(e.target === e.currentTarget) fecharModal(); } },
      h("div", { class: "dlg" + (largo ? " wide" : ""), role: "dialog", "aria-modal": "true", "aria-label": titulo },
        h("div", { class: "dt" }, h("span", null, titulo), h("button", { class: "x", type: "button", "aria-label": "Fechar", onclick: fecharModal }, "×")),
        h("div", { class: "dc" }, conteudo, h("div", { class: "actions" }, acoes))));
  }

  function modalContato(){
    const m = S.modal, r = m.rasc, e = m.erros;
    const campo = (rotulo, controle, erro, cheio) => h("div", { class: cheio ? "full" : null },
      h("label", { class: "l" }, rotulo), controle, erro && h("div", { class: "errmsg" }, erro));
    const texto = (k, extra) => h("input", { class: "in" + (e[k] ? " err" : ""), value: r[k], oninput: ev => { r[k] = ev.target.value; }, ...extra });
    const pais = h("select", { class: "in", onchange: ev => { r.pais = ev.target.value; r.cargo = CARGO[r.pais]; } }, PAISES.map(p => h("option", { value: p }, p)));
    pais.value = r.pais;
    const inst = h("select", { class: "in", onchange: ev => { r.instancia = ev.target.value; } }, INSTANCIAS.map(i => h("option", { value: i }, i)));
    inst.value = r.instancia;
    const unidades = h("div", null, UNIDADES.map(u => h("label", { class: "chk" },
      h("input", { type: "checkbox", checked: r.unidades.includes(u), onchange: ev => {
        r.unidades = ev.target.checked ? [...r.unidades, u] : r.unidades.filter(x => x !== u);
      } }), u)));
    return janela(m.id ? "Editar contato" : "Novo contato",
      h("div", { class: "form2" },
        campo("Cidade / Instituição", texto("cidade"), e.cidade),
        campo("País", pais),
        campo("Nome da autoridade", texto("nome"), e.nome),
        campo("Instância", inst),
        campo("E-mail principal", texto("email", { type: "email", placeholder: "vazio = sem e-mail" }), e.email, true),
        campo("Unidades temáticas", unidades, null, true),
        h("label", { class: "chk full", style: "margin-top:8px" },
          h("input", { type: "checkbox", checked: r.adimplente, onchange: ev => { r.adimplente = ev.target.checked; } }), "Adimplente com a rede")),
      [h("button", { class: "b", type: "button", onclick: fecharModal }, "Cancelar"),
       h("button", { class: "b pri", type: "button", onclick: salvarContato }, "Salvar")]);
  }
  function salvarContato(){
    const m = S.modal, r = m.rasc, e = {};
    const dados = { ...r, cidade: r.cidade.trim(), nome: r.nome.trim(), email: r.email.trim() };
    if(!dados.cidade) e.cidade = "Informe a cidade.";
    if(!dados.nome) e.nome = "Informe o nome da autoridade.";
    if(dados.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) e.email = "E-mail inválido.";
    if(Object.keys(e).length){ m.erros = e; return render(); }
    if(m.id){
      S.contatos = S.contatos.map(c => c.id === m.id ? dados : c);
      log("CONTATO_EDITADO", dados.cidade);
    } else {
      dados.id = Math.max(0, ...S.contatos.map(c => c.id)) + 1;
      S.contatos.unshift(dados);
      log("CONTATO_CRIADO", dados.cidade);
    }
    S.modal = null; render();
    toast(m.id ? "✓ Contato atualizado" : "✓ Contato criado");
  }
  function modalExcluir(){
    const c = S.contatos.find(x => x.id === S.modal.id);
    return janela("Confirmar Exclusão",
      h("p", null, "Excluir ", h("b", null, c.cidade), " da base? A ação fica registrada na auditoria."),
      [h("button", { class: "b", type: "button", onclick: fecharModal }, "Cancelar"),
       h("button", { class: "b danger", type: "button", onclick: () => {
         S.contatos = S.contatos.filter(x => x.id !== c.id);
         S.envio.sel.delete(c.id);
         log("CONTATO_EXCLUIDO", c.cidade);
         S.modal = null; render(); toast("🗑 Contato excluído");
       } }, "Excluir")]);
  }
  function modalPreview(){
    const E = S.envio, m = S.modal;
    let alvos = alvosSelecionados();
    const exemplo = !alvos.length;
    if(exemplo) alvos = S.contatos.filter(c => c.email).slice(0, 1);
    if(!alvos.length) return janela("Pré-visualização", h("p", null, "Nenhum contato com e-mail na base."), [h("button", { class: "b", type: "button", onclick: fecharModal }, "Fechar")]);
    const i = Math.min(m.i, alvos.length - 1), c = alvos[i];
    const ir2 = d => { m.i = i + d; render(); };
    return janela("Pré-visualização",
      h("div", null,
        exemplo && h("div", { class: "alert warn", style: "margin:0 0 6px" }, "Nenhum destinatário selecionado — mostrando um exemplo."),
        h("div", { class: "mail" },
          h("div", { class: "mh" },
            h("div", null, h("b", null, "De: "), REMETENTE),
            h("div", null, h("b", null, "Para: "), `${c.nome} <${c.email}>`),
            h("div", null, h("b", null, "Assunto: "), preencher(E.assunto.trim() || "(sem assunto)", c))),
          h("div", { class: "mb" }, preencher(E.corpo.trim() || "(sem corpo)", c)),
          E.anexos.length > 0 && h("div", { class: "ma" }, E.anexos.map(a => h("span", { class: "file" }, "📎 " + a.nome))))),
      [alvos.length > 1 && h("div", { class: "mx-row" },
          h("button", { class: "b sm", type: "button", disabled: i === 0, onclick: () => ir2(-1) }, "‹"),
          h("span", { class: "muted" }, `${i + 1} de ${alvos.length}`),
          h("button", { class: "b sm", type: "button", disabled: i === alvos.length - 1, onclick: () => ir2(1) }, "›")),
       h("div", { class: "mx-sp" }),
       h("button", { class: "b", type: "button", onclick: fecharModal }, "Fechar")],
      true);
  }

  const TELAS = { login: telaLogin, hub: telaHub, contatos: telaContatos, enviar: telaEnviar, envio: telaEnvio };
  const MODAIS = { contato: modalContato, excluir: modalExcluir, preview: modalPreview };

  /* ---------- presets dos "prints" ---------- */
  const PRESETS = {
    login(){ S.tela = "login"; },
    hub(){ entrouDemo(); S.tela = "hub"; S.stats.enviados = 17; S.audit = auditoriaDemo(); },
    contatos(){ entrouDemo(); S.tela = "contatos"; },
    enviar(){
      entrouDemo(); S.tela = "enviar";
      [1, 4, 5, 8, 9, 12, 14].forEach(id => S.envio.sel.add(id));
      S.envio.anexos = [{ nome: "convite.pdf", tamanho: 245760 }];
    },
    envio(){ entrouDemo(); S.tela = "envio"; S.fila = filaDemo(); },
    auditoria(){ entrouDemo(); S.tela = "hub"; S.audit = auditoriaDemo(); S.auditAberta = true; },
  };
  function entrouDemo(){ S.user = { nome: "Visitante", via: "senha" }; }
  function auditoriaDemo(){
    const agora = Date.now(), min = 60000;
    return [
      ["ENVIO_CONCLUIDO", "17 enviados · 1 na DLQ", 1],
      ["ENVIO_INICIADO", `“${ASSUNTO}” · 18 destinatários`, 2],
      ["CONTATO_EDITADO", "Valparaíso", 5],
      ["LOGIN_SSO", "Microsoft Entra ID", 9],
      ["CONTA_BLOQUEADA", `${BLOQUEIO_S}s após ${MAX_TENTATIVAS} falhas seguidas`, 11],
      ["LOGIN_FALHA", "visitante@mensageria.exemplo · tentativa 3/3", 11],
    ].map(([acao, detalhe, m]) => ({ t: new Date(agora - m * min), acao, detalhe, quem: "visitante" }));
  }
  function filaDemo(){
    const st = ["ok", "ok", "ok", "ok", "ok", "ok", "dlq", "enviando", "enviando", "espera", "enviando", "enviando", "enviando", "fila", "fila", "fila", "fila", "fila"];
    let lane = 0;
    const itens = S.contatos.filter(c => c.email).slice(0, st.length).map((c, i) => ({
      id: c.id, cidade: c.cidade, email: c.email, status: st[i], tent: st[i] === "fila" ? 0 : 1,
      lane: st[i] === "enviando" || st[i] === "espera" ? lane++ : null,
    }));
    const t = hora(new Date());
    const linha = (tipo, msg) => ({ t, tipo, msg });
    return {
      assunto: ASSUNTO, rodando: true, retentativas: 1, contados: 0, inicio: Date.now(), itens,
      log: [
        linha("i", `Lote criado: 18 destinatários · pool de ${POOL}`),
        ...itens.filter(i => i.status === "ok").map(i => linha("ok", `202 Accepted · ${i.cidade} <${i.email}>`)),
        linha("w", `429 Too Many Requests · ${itens[9].cidade} — nova tentativa em 2s`),
        linha("e", `Falha definitiva · ${itens[6].cidade} → Dead Letter Queue`),
      ],
    };
  }

  /* ---------- API usada pela página ---------- */
  root.addEventListener("keydown", e => {
    if(e.key !== "Escape") return;
    if(S.modal) fecharModal();
    else if(S.auditAberta){ S.auditAberta = false; render(); }
  });

  S = estadoInicial();
  if(preset) PRESETS[preset]();
  render();

  return {
    reiniciar(){
      limparTimers();
      const tema = S.tema;
      S = estadoInicial(); S.tema = tema;
      render();
    },
    /* atalho dos botões "ver ao vivo": leva o visitante direto pra uma etapa */
    abrir(alvo){
      if(alvo === "login"){
        if(S.user) sair(); else ir("login");
        return;
      }
      if(!S.user){
        limparTimers(); S.login.ocupado = false;
        S.user = { nome: "Visitante", via: "atalho" };
        log("LOGIN_SUCESSO", "atalho da página do projeto");
      }
      if(alvo === "auditoria"){
        S.auditAberta = true;
        return ir(S.tela === "login" ? "hub" : S.tela);
      }
      if(alvo === "envio"){
        if(!(S.fila && S.fila.rodando) && !alvosSelecionados().length)
          S.contatos.filter(c => c.email).forEach(c => S.envio.sel.add(c.id));
        ir("enviar");
        if(S.tela === "enviar") toast("Tudo pronto — clique em Enviar ➤");
        return;
      }
      ir(alvo);
    },
  };
}

/* =================== PÁGINA =================== */
const demo = criarApp(document.getElementById("app"));
const janelaDemo = document.getElementById("demoWin");
document.getElementById("resetDemo").addEventListener("click", () => demo.reiniciar());

/* rola só esta página (o iframe do navegador), nunca a janela do desktop */
function pular(id){
  const alvo = document.getElementById(id);
  if(!alvo) return;
  scrollTo({ top: alvo.getBoundingClientRect().top + scrollY - 8, behavior: reduzMovimento ? "auto" : "smooth" });
}
document.querySelectorAll("[data-jump]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); pular(a.dataset.jump); }));

/* prints: cada um é uma instância estática do app, desenhada em miniatura */
document.querySelectorAll("[data-print]").forEach(fig => {
  const nome = fig.dataset.print;
  const tela = h("div");
  fig.prepend(h("div", { class: "shot" },
    h("div", { class: "bar" }, h("span", null, fig.dataset.file || nome + ".png"), h("span", { "aria-hidden": "true" }, "_ □ ×")),
    h("div", { class: "view" }, h("div", { class: "stage", inert: true, "aria-hidden": "true" }, tela))));
  criarApp(tela, nome);
  fig.append(h("button", { class: "btn95 sm", type: "button", "data-en": "▶ see it live", onclick: () => {
    demo.abrir(nome);
    pular("demo");
    janelaDemo.classList.remove("flash"); void janelaDemo.offsetWidth; janelaDemo.classList.add("flash");
  } }, "▶ ver ao vivo"));
});

/* terminal do hero digitando frases */
(function digitar(){
  const alvo = document.getElementById("typed");
  const frasesPT = ["conecta cidades da América Latina", "dispara e-mails institucionais em massa", "entra com senha ou conta Microsoft",
                  "não perde mensagem: fila, retry e DLQ", "registra tudo na auditoria"];
  const frasesEN = ["connects cities across Latin America","sends institutional e-mail in bulk","signs in with password or Microsoft account","never loses a message: queue, retry and DLQ","logs everything in the audit trail"];
  const escolher = () => window.I18N && I18N.lang === "en" ? frasesEN : frasesPT;
  let frases = frasesPT;
  /* sem animação (reduzir movimento), a frase fixa acompanha o idioma */
  addEventListener("langchange", () => { if(reduzMovimento) alvo.textContent = escolher()[0]; });
  if(reduzMovimento) return;
  let f = 0, i = frases[0].length, apagando = true;
  setTimeout(function passo(){
    frases = escolher();
    const frase = frases[f];
    if(apagando){
      i--;
      if(i <= 0){ apagando = false; f = (f + 1) % frases.length; }
    } else {
      i++;
      if(i >= frase.length){ alvo.textContent = frase; apagando = true; return setTimeout(passo, 1800); }
    }
    alvo.textContent = frases[f].slice(0, Math.max(0, i));
    setTimeout(passo, apagando ? 28 : 55);
  }, 1800);
})();

/* contadores que sobem e blocos que entram ao rolar */
function desenharContador(el, n){
  const largura = Math.max(2, String(el.dataset.count).length);
  el.replaceChildren(...String(n).padStart(largura, "0").split("").map(d => h("b", null, d)));
}
function animarContador(el){
  const alvo = +el.dataset.count, t0 = performance.now(), dur = 900;
  if(reduzMovimento || alvo === 0) return desenharContador(el, alvo);
  (function quadro(t){
    const p = Math.min(1, (t - t0) / dur);
    desenharContador(el, Math.round(alvo * (1 - Math.pow(1 - p, 3))));
    if(p < 1) requestAnimationFrame(quadro);
  })(t0);
}
const contadores = document.querySelectorAll("[data-count]");
contadores.forEach(el => desenharContador(el, 0));
const revelaveis = document.querySelectorAll(".reveal");
if("IntersectionObserver" in window){
  const io = new IntersectionObserver(entradas => entradas.forEach(e => {
    if(!e.isIntersecting) return;
    e.target.classList.add("in");
    e.target.querySelectorAll("[data-count]").forEach(animarContador);
    io.unobserve(e.target);
  }), { threshold: 0.15 });
  revelaveis.forEach(el => io.observe(el));
} else {
  revelaveis.forEach(el => el.classList.add("in"));
  contadores.forEach(el => desenharContador(el, +el.dataset.count));
}
