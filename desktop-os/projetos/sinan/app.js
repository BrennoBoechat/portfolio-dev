/* SINAN Digital — sistema emulado + animações da página.
   Tudo aqui é inventado: fichas, pessoas, unidades, CEPs e logs vivem só na memória desta
   página e somem ao recarregar. Nenhum dado do sistema real foi usado e nada sai do navegador:
   o "PDF" é desenhado na tela e o CSV é montado aqui mesmo, só com dados fictícios. */
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
const pad = (n, w = 2) => String(n).padStart(w, "0");
const hora = d => d.toTimeString().slice(0, 8);
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const deIso = s => { const [a, m, d] = s.split("-").map(Number); return new Date(a, m - 1, d); };
const dataBR = d => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const isoBR = s => s ? dataBR(deIso(s)) : "—";
const mesChave = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}`;
const plural = (n, um, varios) => n + " " + (n === 1 ? um : varios);
const so = s => (s || "").replace(/\D/g, "");
const hex = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => pad(b.toString(16))).join("");
const b64 = bytes => btoa(String.fromCharCode(...bytes));
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : `${hex(4)}-${hex(2)}-4${hex(2).slice(1)}-${hex(2)}-${hex(6)}`);
const mascararEmail = e => e.replace(/^(.).*(@.*)$/, "$1***$2");
const reduzMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;
function diasAtras(n, horaBase = 9){
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(Math.min(horaBase + (n * 5) % 8, new Date().getHours()), (n * 17) % 60, 0, 0);
  return d;
}
function idade(nasc){
  if(!nasc) return null;
  const n = deIso(nasc), hoje = new Date();
  let a = hoje.getFullYear() - n.getFullYear();
  if(hoje < new Date(hoje.getFullYear(), n.getMonth(), n.getDate())) a--;
  return a;
}
function faixaEtaria(nasc){
  const a = idade(nasc);
  if(a == null) return "ignorada";
  return a < 10 ? "0-9" : a < 20 ? "10-19" : a < 30 ? "20-29" : a < 60 ? "30-59" : "60+";
}

/* =================== OPÇÕES DO FORMULÁRIO ===================
   Formulário genérico e simplificado: NÃO reproduz as perguntas nem as opções da ficha real. */
const ETAPAS = ["Atendimento", "Pessoa", "Endereço", "Ocorrência"];
const CIDADES = ["Cidade Norte", "Cidade Sul", "Cidade Leste", "Cidade Oeste"];
const UNIDADES = ["Unidade Exemplo 1", "Unidade Exemplo 2", "Unidade Exemplo 3"];
const SEXO = ["Feminino", "Masculino", "Prefere não informar"];
const CATEGORIAS = ["Categoria A", "Categoria B", "Categoria C", "Outra"];
const SIM_NAO = ["Sim", "Não", "Não sabe"];
const ENCAMINHAMENTOS = ["Nenhum", "Serviço de saúde", "Serviço social", "Outro serviço"];
/* nomes claramente fictícios */
const NOMES = ["Ana Exemplo", "Bruno Fictício", "Carla Modelo", "Davi Exemplo", "Eva Fictícia", "Fábio Modelo", "Gina Exemplo",
  "Hélio Fictício", "Íris Modelo", "Joana Exemplo", "Leo Fictício", "Marta Modelo", "Nina Exemplo", "Otávio Fictício", "Paula Modelo", "Rui Exemplo"];
const BAIRROS = ["Centro", "Jardim Exemplo", "Vila Modelo", "Bairro Demo"];

/* =================== REGRAS DA EMULAÇÃO =================== */
const POR_PAGINA = 6;            // mesmo tamanho de página da listagem real
const COOLDOWN_PDF = 10;         // segundos entre um PDF e outro (por usuário)
const CACHE_PDF_MIN = 5;         // PDF gerado fica em cache por alguns minutos
const MAX_OBS = 500;
const CONTAS = {
  ADMIN: { nome: "Admin Demo", email: "admin@sinan.exemplo" },
  USER:  { nome: "Profissional Demo", email: "profissional@sinan.exemplo" },
};
const PASSOS_SSO = perfil => [
  "Redirecionando para o Microsoft Entra ID…",
  "Conta Microsoft autenticada",
  "Tenant e audience do token validados",
  `Perfil lido do token: ${perfil}`,
  "Sessão criada (cookie HttpOnly)",
];
const MSG_NEGADO = "Seu acesso ao SINAN Digital ainda não foi liberado. Peça ao administrador para atribuir sua conta ao sistema.";

function dadosVazios(profissional){
  return {
    dataAtend: iso(new Date()), cidade: "", unidade: "", profissional,
    nome: "", nasc: "", sexo: "", documento: "",
    cep: "", numero: "", logradouro: "", bairro: "",
    dataOcorr: "", categoria: "", recorrente: "Não sabe", encaminhamento: "Nenhum", obs: "",
  };
}
/* ficha fictícia completa e válida (o botão ⚡ e a base inicial usam isto) */
function dadosExemplo(i, criada, profissional){
  const atend = criada || new Date();
  const ocorr = new Date(atend); ocorr.setDate(ocorr.getDate() - 1 - (i % 3));
  return Object.assign(dadosVazios(profissional), {
    dataAtend: iso(atend), cidade: CIDADES[i % CIDADES.length], unidade: UNIDADES[i % UNIDADES.length],
    nome: NOMES[i % NOMES.length], nasc: `${1958 + (i * 9) % 52}-${pad(1 + i % 12)}-${pad(1 + (i * 3) % 28)}`,
    sexo: SEXO[i % 2], documento: `DOC-${pad(1000 + i * 37, 4)}`,
    cep: `00${pad(10 + (i * 7) % 89)}0-${pad(100 + i * 13, 3).slice(-3)}`, numero: i % 4 === 0 ? "s/n" : String(10 + i * 7),
    logradouro: `Rua Fictícia ${1 + i}`, bairro: BAIRROS[i % BAIRROS.length],
    dataOcorr: iso(ocorr), categoria: CATEGORIAS[i % 3], recorrente: SIM_NAO[i % 3], encaminhamento: ENCAMINHAMENTOS[i % ENCAMINHAMENTOS.length],
  });
}

/* base inicial: [dias atrás, enviada, excluída]. A excluída some da lista, mas o número dela
   nunca é reaproveitado — por isso aparece um "buraco" na numeração. */
const PLANO = [[0, false], [0, true], [1, false], [2, true], [4, false, true], [5, true], [6, false], [8, true],
  [11, true], [14, false], [18, true], [23, true], [29, true], [36, true], [41, false], [47, true]];
function baseInicial(){
  const seq = {}, fichas = [];
  PLANO.slice().reverse().forEach(([dias, enviada, excluida], i) => {   // da mais antiga pra mais nova: numeração crescente
    const criada = diasAtras(dias), chave = mesChave(criada);
    seq[chave] = (seq[chave] || 0) + 1;
    fichas.push({ id: i + 1, num: `${chave}_${pad(seq[chave], 4)}`, criada, enviada, ativo: !excluida,
      dados: dadosExemplo(i, criada, CONTAS.USER.nome), pdfAte: 0 });
  });
  return { fichas: fichas.reverse(), seq };
}

/* ---------- cifra da fila offline ----------
   Como no sistema real: AES-256-GCM pela Web Crypto, com uma chave do dispositivo que não pode
   ser extraída. Aqui a chave vive só na memória da página. Sem Web Crypto, mostra bytes aleatórios. */
let chaveDispositivo = null;
async function cifrar(texto){
  try{
    chaveDispositivo = chaveDispositivo || crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const dados = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await chaveDispositivo, new TextEncoder().encode(texto));
    return b64(iv) + b64(new Uint8Array(dados));
  }catch(e){
    return b64(crypto.getRandomValues(new Uint8Array(64)));
  }
}

/* =================== O SISTEMA EMULADO =================== */
let instancias = 0;
/* Cria uma instância do app dentro de `root`.
   Com `preset`, a instância é só um desenho estático (os "prints" da página): sem timers nem toasts. */
function criarApp(root, preset){
  const estatico = !!preset;
  const uid = ++instancias;
  const timers = new Set();
  let S, corpoEl;

  function depois(fn, ms){
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
  }
  function limparTimers(){ timers.forEach(clearTimeout); timers.clear(); }

  function estadoInicial(){
    const base = baseInicial();
    const st = {
      tela: "login", tema: "light", user: null,
      login: { perfil: "ADMIN", ocupado: false, passo: 0, erro: "" },
      online: true, fichas: base.fichas, seq: base.seq, pendentes: [], sincronizando: false,
      pagina: 1, destaque: null, wz: null, modal: null, logs: [], pdfLivreEm: 0,
    };
    const ativas = st.fichas.filter(f => f.ativo), excluida = st.fichas.find(f => !f.ativo);
    const min = 60000, agora = Date.now();
    st.logs = [
      ["CSV_EXPORT", "relatório anonimizado · 9 linhas", CONTAS.ADMIN.email, 7],
      ["FICHA_PDF", ativas[1].num, CONTAS.USER.email, 18],
      ["FICHA_MARK_SENT", `${ativas[1].num} · enviada=true`, CONTAS.USER.email, 22],
      ["FICHA_CREATE", ativas[0].num, CONTAS.USER.email, 35],
      ["LOGIN", "Microsoft Entra ID · perfil USER", CONTAS.USER.email, 41],
      ["FICHA_DELETE", `${excluida.num} · exclusão lógica`, CONTAS.ADMIN.email, 60 * 24 * 4],
    ].map(([evento, detalhe, user, m]) => ({ t: new Date(agora - m * min), evento, detalhe, user, cid: hex(4) }));
    return st;
  }

  /* ---------- auditoria e avisos ---------- */
  function log(evento, detalhe){
    S.logs.unshift({ t: new Date(), evento, detalhe, user: S.user ? S.user.email : "anônimo", cid: hex(4) });
  }
  function toast(msg){
    if(estatico) return;
    const t = h("div", { class: "toast", role: "status" }, msg);
    root.append(t);
    setTimeout(() => t.remove(), 2600);
  }

  /* ---------- desenho ---------- */
  function render(){
    root.className = "mx" + (S.tema === "dark" ? " dark" : "") + (estatico ? " static" : "");
    corpoEl = h("div", { class: "mx-body" }, TELAS[S.tela]());
    root.replaceChildren(...[cabecalho(), S.user && !S.online && faixaOffline(), corpoEl, S.modal && MODAIS[S.modal.tipo]()].filter(Boolean));
  }
  function renderCorpo(){ corpoEl.replaceChildren(TELAS[S.tela]()); }
  /* só o cabeçalho (contador da fila): não atrapalha quem está digitando */
  function renderCabecalho(){ const c = root.querySelector(".mx-head"); if(c) c.replaceWith(cabecalho()); }
  function ir(tela){
    if(tela === "nova" && !S.wz) S.wz = novoWizard();
    if(tela === "logs" && S.user.perfil !== "ADMIN") tela = "dashboard";
    S.tela = tela; S.modal = null;
    render();
  }

  function cabecalho(){
    const u = S.user;
    const aba = (id, rotulo) => h("button", { class: "mx-tab" + (S.tela === id ? " on" : ""), type: "button", onclick: () => ir(id) }, rotulo);
    return h("div", { class: "mx-head" },
      h("div", { class: "mx-logo" }, h("span", { class: "ico" }, "✚"), h("div", null, "SINAN Digital", h("small", null, "NOTIFICAÇÃO DE VIOLÊNCIA"))),
      // como no menu real: "Logs" só aparece para ADMIN
      u && [aba("dashboard", "▦ Dashboard"), aba("fichas", "📄 Fichas"), aba("nova", "＋ Nova Ficha"), u.perfil === "ADMIN" && aba("logs", "📜 Logs")],
      h("div", { class: "mx-sp" }),
      u && h("button", { class: "mx-ib net" + (S.online ? "" : " off"), type: "button", title: "Simular queda / volta da internet", onclick: alternarRede },
        S.online ? "📶 Online" : "📴 Offline", minhas().length > 0 && h("span", { class: "pend", title: "fichas no dispositivo" }, minhas().length)),
      h("button", { class: "mx-ib", type: "button", title: "Tema claro/escuro",
        onclick: () => { S.tema = S.tema === "dark" ? "light" : "dark"; render(); } }, S.tema === "dark" ? "☀" : "☾"),
      u && h("span", { class: "mx-user", title: u.nome }, h("span", { class: "pf " + u.perfil }, u.perfil)),
      u && h("button", { class: "mx-ib", type: "button", onclick: sair }, "Sair"));
  }
  function faixaOffline(){
    return h("div", { class: "offbar", role: "status" }, "📴 Você está offline. Fichas preenchidas serão salvas no dispositivo e sincronizadas quando a conexão voltar.");
  }

  /* ---------- LOGIN ---------- */
  function telaLogin(){
    const L = S.login;
    const marca = h("div", { class: "brand" }, h("div", { class: "mx-logo" }, h("span", { class: "ico" }, "✚"),
      h("div", null, "SINAN Digital", h("small", null, "FICHA DE NOTIFICAÇÃO DO SUS"))));

    if(L.ocupado){
      const passos = PASSOS_SSO(L.perfil === "NEGADO" ? "—" : L.perfil);
      return h("div", { class: "mx-login" }, h("div", { class: "card" }, marca,
        h("div", { class: "muted" }, "Entrando com a conta Microsoft…"),
        h("ol", { class: "sso" }, passos.map((p, i) =>
          h("li", { class: i < L.passo ? "feito" : i === L.passo ? "agora" : "" },
            h("i", null, i < L.passo ? "✓" : i === L.passo ? h("span", { class: "spin" }, "◌") : "·"), p)))));
    }

    const opcao = (valor, rotulo, nota) => h("label", { class: L.perfil === valor ? "on" : null },
      h("input", { type: "radio", name: "perfil-" + uid, checked: L.perfil === valor, onchange: () => { L.perfil = valor; L.erro = ""; renderCorpo(); } }),
      rotulo, h("small", null, nota));
    return h("div", { class: "mx-login" }, h("div", { class: "card" }, marca,
      h("div", { class: "muted" }, "Acesso com a conta institucional."),
      h("div", { class: "perfis" },
        h("label", { class: "l", style: "margin:0;padding:0;border:0" }, "Conta de demonstração"),
        opcao("ADMIN", "Administrador", "ADMIN"),
        opcao("USER", "Profissional de saúde", "USER"),
        opcao("NEGADO", "Conta não liberada", "sem acesso")),
      h("button", { class: "b ms full", type: "button", style: "margin-top:10px", onclick: entrar }, "⊞ Entrar com Microsoft"),
      L.erro && h("div", { class: "alert warn" }, "🔒 " + L.erro),
      h("div", { class: "hint" }, "login simulado · nenhuma conta real é usada")));
  }
  function entrar(){
    const L = S.login;
    if(L.ocupado) return;
    L.ocupado = true; L.passo = 0; L.erro = "";
    renderCorpo();
    const negado = L.perfil === "NEGADO";
    const passo = () => {
      L.passo++;
      if(negado && L.passo === 2){   // a Microsoft autentica, mas a conta não foi atribuída ao sistema
        L.ocupado = false; L.erro = MSG_NEGADO;
        S.logs.unshift({ t: new Date(), evento: "SECURITY_EVENT", detalhe: "LOGIN_REJEITADO · conta não atribuída", user: "visitante@outro.exemplo", cid: hex(4) });
        return renderCorpo();
      }
      renderCorpo();
      if(L.passo < PASSOS_SSO("").length) depois(passo, 520);
      else depois(() => { L.ocupado = false; logar(L.perfil); }, 420);
    };
    depois(passo, 600);
  }
  function logar(perfil){
    S.user = { ...CONTAS[perfil], perfil };
    log("LOGIN", `Microsoft Entra ID · perfil ${perfil}`);
    ir("dashboard");
  }
  function sair(){
    log("LOGOUT", "sessão encerrada (logout federado)");
    limparTimers();
    S.user = null; S.wz = null; S.sincronizando = false; S.online = true;
    S.login.ocupado = false;
    ir("login");
  }

  /* ---------- DASHBOARD ---------- */
  function telaDashboard(){
    const hoje = new Date(), ativas = S.fichas.filter(f => f.ativo);
    const total = ativas.length, deHoje = ativas.filter(f => iso(f.criada) === iso(hoje)).length;
    const enviadas = ativas.filter(f => f.enviada).length, naoEnviadas = total - enviadas;
    const doMes = ativas.filter(f => mesChave(f.criada) === mesChave(hoje));
    const envMes = doMes.filter(f => f.enviada).length, naoMes = doMes.length - envMes;
    const pct = doMes.length ? Math.round(envMes / doMes.length * 100) : 0;

    const card = (titulo, valor, icone, selo, cls) => h("div", { class: "sc " + (cls || "") },
      h("span", { class: "bg", "aria-hidden": "true" }, icone),
      h("div", { class: "k" }, titulo),
      h("div", { class: "v", "data-alvo": valor }, estatico || reduzMovimento ? valor : 0),
      selo);
    const selo = (txt, cls) => h("span", { class: "bdg " + (cls || "") }, txt);
    const tela = h("div", null,
      h("h4", null, `Olá, ${S.user.nome}!`),
      h("div", { class: "muted" }, "Resumo das notificações · atualizado agora"),
      h("div", { class: "stats4" },
        card("Total de fichas", total, "🗂", selo("🕒 atualizado agora")),
        card("Fichas hoje", deHoje, "📅", selo("🕒 atualizado agora")),
        card("Não enviadas", naoEnviadas, "📝", naoEnviadas > 0 ? selo("⚠ Ação necessária", "warn") : selo("👍 Tudo em dia", "ok"), "v-pend"),
        card("Enviadas", enviadas, "✅", selo("👍 Sincronizado", "ok"), "v-sent")),
      h("div", { class: "dash2" },
        h("div", { class: "cta" },
          h("b", null, "Registrar uma nova notificação"),
          h("span", null, "Preencha a ficha em 4 etapas. Sem internet? Ela fica salva no aparelho e sobe depois."),
          h("button", { class: "b", type: "button", onclick: () => { S.wz = novoWizard(); ir("nova"); } }, "＋ Nova Ficha"),
          minhas().length > 0 && h("span", null, `📦 ${plural(minhas().length, "ficha aguardando", "fichas aguardando")} sincronização`)),
        h("div", { class: "donut-card" },
          h("div", { class: "bt" }, "◔ Status mensal"),
          h("div", { class: "donut", style: doMes.length ? `background:conic-gradient(#7e22ce 0 ${pct}%, #ea580c ${pct}% 100%)` : "background:#bbb" },
            h("span", null, pct + "%")),
          h("div", { class: "lgd" },
            h("div", { style: "--c:#6b7280" }, h("i"), "Total no mês", h("b", null, doMes.length)),
            h("div", { style: "--c:#7e22ce" }, h("i"), "Enviadas no mês", h("b", null, envMes)),
            h("div", { style: "--c:#ea580c" }, h("i"), "Não enviadas no mês", h("b", null, naoMes))))));
    if(!estatico && !reduzMovimento) requestAnimationFrame(() => tela.querySelectorAll("[data-alvo]").forEach(animarNumero));
    return tela;
  }
  function animarNumero(el){
    const alvo = +el.dataset.alvo, t0 = performance.now(), dur = 900;
    (function quadro(t){
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(alvo * (1 - Math.pow(1 - p, 3)));
      if(p < 1) requestAnimationFrame(quadro);
    })(t0);
  }

  /* ---------- FICHAS ---------- */
  function telaFichas(){
    const ativas = S.fichas.filter(f => f.ativo);
    const paginas = Math.max(1, Math.ceil(ativas.length / POR_PAGINA));
    S.pagina = Math.min(S.pagina, paginas);
    const ini = (S.pagina - 1) * POR_PAGINA;
    const semRede = !S.online && "Precisa de conexão";
    return h("div", null,
      h("div", { class: "mx-row" },
        h("div", { style: "flex:1;min-width:0" }, h("h4", null, "Fichas"),
          h("div", { class: "muted" }, `${plural(ativas.length, "ficha", "fichas")} · ${ativas.filter(f => !f.enviada).length} não enviadas`)),
        h("button", { class: "b", type: "button", disabled: !S.online, title: semRede, onclick: () => abrirModal(csvPadrao()) }, "⬇ Exportar CSV"),
        h("button", { class: "b pri", type: "button", onclick: () => { S.wz = novoWizard(); ir("nova"); } }, "＋ Nova Ficha")),
      minhas().length > 0 && painelPendentes(),
      h("div", { class: "fgrid", style: "margin-top:10px" }, ativas.slice(ini, ini + POR_PAGINA).map(cartaoFicha)),
      h("div", { class: "pager" },
        h("span", { class: "muted" }, ativas.length ? `Mostrando ${ini + 1}–${Math.min(ini + POR_PAGINA, ativas.length)} de ${ativas.length}` : "Nenhuma ficha"),
        h("div", { class: "mx-row" },
          h("button", { class: "b sm", type: "button", disabled: S.pagina <= 1, onclick: () => { S.pagina--; renderCorpo(); } }, "‹"),
          h("span", null, `${S.pagina} / ${paginas}`),
          h("button", { class: "b sm", type: "button", disabled: S.pagina >= paginas, onclick: () => { S.pagina++; renderCorpo(); } }, "›"))));
  }
  function cartaoFicha(f){
    const semRede = !S.online;
    const status = h("select", { class: "in", disabled: semRede, title: semRede ? "Precisa de conexão" : null,
      onchange: e => abrirModal({ tipo: "status", id: f.id, enviada: e.target.value === "1" }) },
      h("option", { value: "0" }, "⏳ Não enviada"), h("option", { value: "1" }, "✓ Enviada"));
    status.value = f.enviada ? "1" : "0";
    const acao = (rotulo, titulo, fn) => h("button", { class: "b sm", type: "button", title: semRede ? "Precisa de conexão" : titulo, disabled: semRede, onclick: fn }, rotulo);
    return h("div", { class: "fc" + (S.destaque === f.id ? " hl" : "") },
      h("div", { class: "n" }, "Nº " + f.num),
      h("div", { class: "d" }, "📅 Criada em " + dataBR(f.criada) + " · " + f.criada.toTimeString().slice(0, 5)),
      status,
      h("div", { class: "acts" },
        acao("📄 PDF", "Gerar PDF", () => gerarPdf(f)),
        acao("✎", "Editar ficha", () => editar(f)),
        acao("🗑", "Excluir ficha", () => abrirModal({ tipo: "excluir", id: f.id }))));
  }
  function painelPendentes(){
    return h("div", { class: "pending" },
      h("div", { class: "ph" }, "📦 ", plural(minhas().length, "ficha salva", "fichas salvas"), " neste dispositivo",
        h("div", { class: "mx-sp" }),
        h("button", { class: "b sm", type: "button", disabled: !S.online || S.sincronizando, onclick: sincronizar },
          S.sincronizando ? "Sincronizando…" : S.online ? "⟳ Sincronizar agora" : "aguardando conexão")),
      minhas().map(p => h("div", { class: "pitem" },
        h("span", null, "🔒"),
        h("div", { style: "min-width:0" },
          h("div", null, h("b", null, "Ficha local"), " · salva às " + p.criada.toTimeString().slice(0, 5)),
          h("code", { title: "conteúdo cifrado com AES-256-GCM" }, p.cifra ? p.cifra.slice(0, 44) + "…" : "cifrando…"),
          h("div", { class: "muted", style: "font:9px var(--mono)" }, "Idempotency-Key " + p.chave.slice(0, 13) + "…")),
        h("span", { class: "st" }, p.status === "enviando" ? h("span", null, h("span", { class: "spin" }, "◌"), " enviando")
          : p.status === "ok" ? h("span", { class: "tag ok" }, "✓ " + p.num) : h("span", { class: "tag m" }, "na fila")))),
      h("div", { class: "muted", style: "margin-top:5px;font-size:10px" }, "Só quem salvou vê e envia estas fichas. O conteúdo fica cifrado com uma chave do próprio aparelho."));
  }

  /* ---------- rede e sincronização ---------- */
  function alternarRede(){
    S.online = !S.online;
    render();
    toast(S.online ? "📶 Conexão restabelecida" : "📴 Você está offline");
    if(S.online && minhas().length) depois(sincronizar, 700);
  }
  function sincronizar(){
    if(S.sincronizando || !S.online) return;
    const fila = minhas().filter(p => p.status !== "ok");
    if(!fila.length) return;
    S.sincronizando = true;
    atualizarFila();
    const passo = i => {
      if(i >= fila.length){
        depois(() => {
          S.pendentes = S.pendentes.filter(p => p.status !== "ok");
          S.sincronizando = false;
          toast(`⟳ ${plural(fila.length, "ficha sincronizada", "fichas sincronizadas")}`);
          atualizarFila(true);
        }, 1100);
        return;
      }
      const p = fila[i];
      p.status = "enviando";
      atualizarFila();
      depois(() => {
        if(!S.online){ p.status = "fila"; S.sincronizando = false; return atualizarFila(); }   // caiu de novo no meio
        const f = criarNoServidor(p.dados);
        p.status = "ok"; p.num = f.num;
        log("FICHA_CREATE", `${f.num} · sincronizada do modo offline`);
        atualizarFila();
        passo(i + 1);
      }, 850);
    };
    passo(0);
  }
  /* redesenha o que mostra a fila sem tirar o foco de quem está preenchendo a ficha */
  function atualizarFila(fim){
    if(S.tela === "fichas" || S.tela === "dashboard") render();
    else renderCabecalho();
    if(fim && S.tela === "nova") renderCabecalho();
  }
  function criarNoServidor(dados){
    const agora = new Date(), chave = mesChave(agora);
    S.seq[chave] = (S.seq[chave] || 0) + 1;
    const f = { id: Math.max(0, ...S.fichas.map(x => x.id)) + 1, num: `${chave}_${pad(S.seq[chave], 4)}`,
      criada: agora, enviada: false, ativo: true, dados: structuredClone(dados), pdfAte: 0 };
    S.fichas.unshift(f);
    S.destaque = f.id; S.pagina = 1;
    return f;
  }

  /* ---------- NOVA FICHA (formulário em etapas) ---------- */
  function novoWizard(){ return { etapa: 0, d: dadosVazios(S.user ? S.user.nome : ""), erros: {}, editando: null, salvando: false }; }
  function editar(f){
    S.wz = { etapa: 0, d: structuredClone(f.dados), erros: {}, editando: f.id, salvando: false };
    log("AUDIT_EDIT_VIEW", f.num);
    ir("nova");
  }
  function telaNova(){
    const W = S.wz;
    const editando = W.editando && S.fichas.find(f => f.id === W.editando);
    return h("div", null,
      h("div", { class: "wz-top" },
        h("h4", null, editando ? `Editando ficha ${editando.num}` : "Nova ficha de notificação"),
        !editando && h("button", { class: "b sm", type: "button", onclick: preencherExemplo }, "⚡ Preencher com dados fictícios")),
      h("div", { class: "muted" }, `Etapa ${W.etapa + 1} de ${ETAPAS.length} — ${ETAPAS[W.etapa]}`),
      h("div", { class: "wz-steps" }, ETAPAS.map((nome, i) =>
        h("div", { class: "wz-step" + (i < W.etapa ? " feito" : i === W.etapa ? " agora" : "") }, h("b", null, i < W.etapa ? "✓" : i + 1), nome))),
      h("div", { class: "wz-card" }, h("h5", null, ETAPAS[W.etapa]), FORMULARIOS[W.etapa](W.d, W.erros)),
      h("div", { class: "wz-nav" },
        h("button", { class: "b", type: "button", disabled: W.etapa === 0, onclick: () => irEtapa(W.etapa - 1) }, "‹ Voltar"),
        editando && h("button", { class: "b", type: "button", onclick: () => { S.wz = null; ir("fichas"); } }, "Cancelar"),
        h("div", { class: "mx-sp" }),
        !S.online && !editando && h("span", { class: "muted", style: "font-size:11px" }, "📴 offline: será salva no dispositivo"),
        W.etapa < ETAPAS.length - 1
          ? h("button", { class: "b pri", type: "button", onclick: avancar }, "Próximo ›")
          : h("button", { class: "b pri", type: "button", disabled: W.salvando, onclick: salvarFicha },
              W.salvando ? "Salvando…" : editando ? "💾 Salvar alterações" : "✓ Salvar ficha")));
  }
  function irEtapa(i){
    S.wz.etapa = i; S.wz.erros = {};
    renderCorpo();
    corpoEl.scrollTop = 0;
  }
  function avancar(){
    const erros = validar(S.wz.etapa, S.wz.d);
    if(Object.keys(erros).length){ S.wz.erros = erros; return renderCorpo(); }
    irEtapa(S.wz.etapa + 1);
  }
  function preencherExemplo(){
    const atual = S.wz.etapa;
    S.wz.d = dadosExemplo(S.fichas.length + S.pendentes.length + 3, new Date(), S.user.nome);
    S.wz.erros = {}; S.wz.etapa = atual;
    renderCorpo();
    toast("⚡ Ficha preenchida com dados fictícios");
  }
  function validar(etapa, d){
    const e = {}, hoje = iso(new Date());
    if(etapa === 0){
      if(!d.dataAtend) e.dataAtend = "Informe a data do atendimento.";
      else if(d.dataAtend > hoje) e.dataAtend = "Data no futuro.";
      if(!d.cidade) e.cidade = "Escolha a cidade.";
      if(!d.unidade) e.unidade = "Escolha a unidade.";
      if(!d.profissional.trim()) e.profissional = "Informe o profissional.";
    }
    if(etapa === 1){
      if(d.nome.trim().length < 3) e.nome = "Informe o nome (mínimo 3 letras).";
      if(!d.nasc) e.nasc = "Informe a data de nascimento.";
      else if(d.nasc > hoje) e.nasc = "Data no futuro.";
      if(!d.sexo) e.sexo = "Escolha uma opção.";
    }
    if(etapa === 2){
      if(so(d.cep).length !== 8) e.cep = "CEP com 8 dígitos.";
      if(!d.numero.trim()) e.numero = "Informe o número ou s/n.";
    }
    if(etapa === 3){
      if(!d.dataOcorr) e.dataOcorr = "Informe a data da ocorrência.";
      else if(d.dataAtend && d.dataOcorr > d.dataAtend) e.dataOcorr = "A ocorrência não pode ser depois do atendimento.";
      if(!d.categoria) e.categoria = "Escolha a categoria.";
    }
    return e;
  }
  function salvarFicha(){
    const W = S.wz;
    for(let i = 0; i < ETAPAS.length; i++){   // revalida tudo: leva de volta à primeira etapa com erro
      const erros = validar(i, W.d);
      if(Object.keys(erros).length){ W.etapa = i; W.erros = erros; renderCorpo(); return toast(`Revise a etapa ${i + 1}: ${ETAPAS[i]}`); }
    }
    if(W.editando){
      if(!S.online) return toast("📴 Sem conexão: a edição precisa do servidor");
      const f = S.fichas.find(x => x.id === W.editando);
      f.dados = structuredClone(W.d); f.pdfAte = 0;   // invalida o PDF em cache
      log("FICHA_UPDATE", f.num);
      S.wz = null; S.destaque = f.id;
      ir("fichas");
      return toast(`💾 Ficha ${f.num} atualizada`);
    }
    if(!S.online){
      const p = { dono: S.user.email, chave: uuid(), criada: new Date(), dados: structuredClone(W.d), cifra: "", status: "fila" };
      S.pendentes.push(p);
      cifrar(JSON.stringify(p.dados)).then(c => { p.cifra = c; if(S.tela === "fichas") render(); });
      S.wz = null;
      ir("fichas");
      return toast("📦 Sem conexão: ficha salva no dispositivo, cifrada");
    }
    W.salvando = true; renderCorpo();
    depois(() => {
      const f = criarNoServidor(W.d);
      log("FICHA_CREATE", f.num);
      S.wz = null;
      ir("fichas");
      toast(`✓ Ficha ${f.num} criada`);
    }, 650);
  }

  /* campos do formulário. `d` = dados da ficha, `e` = erros da etapa */
  function campo(d, e, k, rotulo, o = {}){
    let ctrl;
    const cls = "in" + (e[k] ? " err" : "");
    if(o.opcoes){
      ctrl = h("select", { class: cls, "data-k": k, onchange: ev => { d[k] = ev.target.value; } },
        h("option", { value: "" }, "Selecione…"), o.opcoes.map(x => h("option", { value: x }, x)));
      ctrl.value = d[k];
    } else if(o.tipo === "textarea"){
      const cont = h("div", { class: "cont" }, `${d[k].length}/${o.max}`);
      ctrl = [h("textarea", { class: cls, rows: 3, maxlength: o.max, value: d[k], placeholder: o.placeholder,
        oninput: ev => { d[k] = ev.target.value; cont.textContent = `${d[k].length}/${o.max}`; } }), cont];
    } else {
      ctrl = h("input", { class: cls, "data-k": k, type: o.tipo || "text", value: d[k], placeholder: o.placeholder, maxlength: o.max,
        readonly: o.fixo, inputmode: o.inputmode, autocomplete: "off",
        oninput: ev => {
          if(o.mascara) ev.target.value = o.mascara(ev.target.value);
          d[k] = ev.target.value;
          if(o.aoDigitar) o.aoDigitar(ev.target.value);
        } });
    }
    return h("div", { class: o.full ? "full" : null },
      h("label", { class: "l" }, rotulo, o.req && h("span", { class: "req" }, " *"), o.nota && [" ", h("span", { class: "lock" }, o.nota)]),
      ctrl, e[k] && h("div", { class: "errmsg" }, e[k]));
  }
  const mascaraCEP = v => { const n = so(v).slice(0, 8); return n.length > 5 ? n.slice(0, 5) + "-" + n.slice(5) : n; };
  const CIFRADO = "🔒 cifrado no banco";
  /* CEP: no sistema real a busca vai ao ViaCEP; aqui o "endereço" é inventado a partir dos dígitos */
  function buscarCep(d, v){
    const n = so(v);
    if(n.length !== 8) return;
    const soma = [...n].reduce((a, c) => a + +c, 0);
    d.logradouro = `Rua Fictícia ${1 + soma * 3}`; d.bairro = BAIRROS[soma % BAIRROS.length];
    renderCorpo();
    const num = root.querySelector('[data-k="numero"]');
    if(num) num.focus();
    toast("📍 Endereço preenchido pelo CEP (simulado)");
  }
  const FORMULARIOS = [
    (d, e) => h("div", { class: "grid2" },
      campo(d, e, "dataAtend", "Data do atendimento", { tipo: "date", req: true }),
      campo(d, e, "cidade", "Cidade", { opcoes: CIDADES, req: true }),
      campo(d, e, "unidade", "Unidade", { opcoes: UNIDADES, req: true }),
      campo(d, e, "profissional", "Profissional responsável", { req: true, max: 120 })),
    (d, e) => h("div", { class: "grid2" },
      campo(d, e, "nome", "Nome", { req: true, full: true, max: 120, nota: CIFRADO }),
      campo(d, e, "nasc", "Data de nascimento", { tipo: "date", req: true }),
      campo(d, e, "sexo", "Sexo", { opcoes: SEXO, req: true }),
      campo(d, e, "documento", "Documento", { placeholder: "opcional", max: 20, nota: CIFRADO })),
    (d, e) => h("div", { class: "grid2" },
      campo(d, e, "cep", "CEP", { req: true, placeholder: "00000-000", mascara: mascaraCEP, inputmode: "numeric", nota: "autocompleta o endereço",
        aoDigitar: v => buscarCep(d, v) }),
      campo(d, e, "numero", "Número", { req: true, placeholder: "nº ou s/n", max: 10, nota: CIFRADO }),
      campo(d, e, "logradouro", "Logradouro", { full: true, max: 120, nota: CIFRADO }),
      campo(d, e, "bairro", "Bairro", { max: 60 })),
    (d, e) => h("div", { class: "grid2" },
      campo(d, e, "dataOcorr", "Data da ocorrência", { tipo: "date", req: true }),
      campo(d, e, "categoria", "Categoria", { opcoes: CATEGORIAS, req: true }),
      campo(d, e, "recorrente", "Já aconteceu antes?", { opcoes: SIM_NAO }),
      campo(d, e, "encaminhamento", "Encaminhamento", { opcoes: ENCAMINHAMENTOS }),
      campo(d, e, "obs", "Observações", { tipo: "textarea", max: MAX_OBS, full: true, placeholder: "Opcional" })),
  ];

  /* ---------- PDF ---------- */
  function gerarPdf(f){
    const resta = Math.ceil((S.pdfLivreEm - Date.now()) / 1000);
    if(resta > 0) return toast(`⏳ Aguarde ${resta}s para gerar outro PDF`);
    const doCache = f.pdfAte > Date.now();
    S.pdfLivreEm = Date.now() + COOLDOWN_PDF * 1000;
    if(!doCache) f.pdfAte = Date.now() + CACHE_PDF_MIN * 60000;
    log("FICHA_PDF", f.num + (doCache ? " · cache" : ""));
    abrirModal({ tipo: "pdf", id: f.id, doCache });
  }

  /* ---------- CSV anonimizado ---------- */
  function csvPadrao(){
    const ini = new Date(); ini.setDate(1); ini.setMonth(ini.getMonth() - 1);
    return { tipo: "csv", ini: iso(ini), fim: iso(new Date()), cidade: "", status: "" };
  }
  const CSV_COLUNAS = ["num_ficha", "data_atendimento", "cidade", "unidade", "categoria", "faixa_etaria", "sexo", "recorrente", "enviada"];
  function linhasCsv(m){
    return S.fichas.filter(f => f.ativo &&
      f.dados.dataAtend >= m.ini && f.dados.dataAtend <= m.fim &&
      (!m.cidade || f.dados.cidade === m.cidade) &&
      (!m.status || (m.status === "enviadas") === f.enviada))
      .map(f => [f.num, f.dados.dataAtend, f.dados.cidade, f.dados.unidade, f.dados.categoria,
        faixaEtaria(f.dados.nasc), f.dados.sexo, f.dados.recorrente, f.enviada ? "sim" : "não"]);
  }
  const csvTexto = linhas => [CSV_COLUNAS, ...linhas].map(l => l.map(c => /[;"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join(";")).join("\n");
  function baixarCsv(m){
    const linhas = linhasCsv(m);
    if(!linhas.length) return toast("Nenhuma ficha no filtro escolhido");
    const blob = new Blob(["﻿" + csvTexto(linhas)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = h("a", { href: url, download: `relatorio_anonimizado_${iso(new Date())}.csv` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    log("CSV_EXPORT", `relatório anonimizado · ${plural(linhas.length, "linha", "linhas")}`);
    S.modal = null; render();
    toast(`⬇ CSV baixado: ${plural(linhas.length, "linha", "linhas")}, sem dado pessoal`);
  }

  /* ---------- LOGS (só ADMIN) ---------- */
  function telaLogs(){
    return h("div", null,
      h("h4", null, "Logs de auditoria"),
      h("div", { class: "muted" }, "Toda operação sobre ficha fica registrada, com usuário e correlationId."),
      h("div", { class: "tbl", style: "margin-top:10px" }, h("table", null,
        h("thead", null, h("tr", null, ["Hora", "Evento", "Usuário", "Detalhe", "correlationId"].map(t => h("th", null, t)))),
        h("tbody", null, S.logs.map(l => h("tr", null,
          h("td", { class: "mono" }, (iso(l.t) === iso(new Date()) ? "" : dataBR(l.t).slice(0, 5) + " ") + hora(l.t)),
          h("td", null, h("span", { class: "tag m" }, l.evento)),
          h("td", { class: "mono" }, mascararEmail(l.user)),
          h("td", null, l.detalhe),
          h("td", { class: "mono" }, l.cid)))))));
  }

  /* ---------- DIÁLOGOS ---------- */
  function abrirModal(m){
    S.modal = m;
    render();
    const primeiro = root.querySelector(".dlg button.pri, .dlg .x");
    if(primeiro) primeiro.focus();
  }
  function fecharModal(){ S.modal = null; render(); }
  function janela(titulo, conteudo, acoes, largo){
    return h("div", { class: "ov", onclick: e => { if(e.target === e.currentTarget) fecharModal(); } },
      h("div", { class: "dlg" + (largo ? " wide" : ""), role: "dialog", "aria-modal": "true", "aria-label": titulo },
        h("div", { class: "dt" }, h("span", null, titulo), h("button", { class: "x", type: "button", "aria-label": "Fechar", onclick: fecharModal }, "×")),
        h("div", { class: "dc" }, conteudo, h("div", { class: "actions" }, acoes))));
  }
  /* fila offline separada por usuário: em computador compartilhado, uma conta não vê
     nem envia as fichas que outra deixou pendentes */
  const minhas = () => S.user ? S.pendentes.filter(p => p.dono === S.user.email) : [];
  const fichaDoModal = () => S.fichas.find(f => f.id === S.modal.id);

  function modalStatus(){
    const f = fichaDoModal(), enviada = S.modal.enviada;
    return janela(enviada ? "Marcar como enviada" : "Voltar para não enviada",
      h("p", null, enviada ? ["Confirmar que a ficha ", h("b", null, f.num), " já foi enviada ao SINAN?"]
        : ["Voltar a ficha ", h("b", null, f.num), " para ", h("b", null, "não enviada"), "?"]),
      [h("button", { class: "b", type: "button", onclick: fecharModal }, "Cancelar"),
       h("button", { class: "b pri", type: "button", onclick: () => {
         f.enviada = enviada;
         log("FICHA_MARK_SENT", `${f.num} · enviada=${enviada}`);
         S.modal = null; render();
         toast(enviada ? `✓ ${f.num} marcada como enviada` : `${f.num} voltou para não enviada`);
       } }, "Confirmar")]);
  }
  function modalExcluir(){
    const f = fichaDoModal();
    return janela("Excluir ficha",
      h("div", null,
        h("p", null, "Excluir a ficha ", h("b", null, f.num), "?"),
        h("p", { class: "muted", style: "margin-top:6px;font-size:12px" },
          "É uma exclusão lógica: a ficha sai da lista, mas fica no histórico da auditoria. O número ", h("b", null, f.num), " não será reutilizado.")),
      [h("button", { class: "b", type: "button", onclick: fecharModal }, "Cancelar"),
       h("button", { class: "b danger", type: "button", onclick: () => {
         f.ativo = false;
         log("FICHA_DELETE", `${f.num} · exclusão lógica`);
         S.modal = null; render();
         toast(`🗑 Ficha ${f.num} excluída`);
       } }, "Excluir")]);
  }
  function modalPdf(){
    const f = fichaDoModal(), d = f.dados;
    const c = (rotulo, valor, full) => h("div", { class: "sf" + (full ? " full" : "") }, h("small", null, rotulo), valor || "—");
    return janela(`PDF — ficha ${f.num}`,
      h("div", null,
        h("div", { class: "sheet" },
          h("div", { class: "sh" }, h("span", null, "Ficha de notificação", h("br"), "modelo fictício da emulação"), h("span", null, "Nº " + f.num)),
          h("div", { class: "sg" },
            c("Data do atendimento", isoBR(d.dataAtend)), c("Data da ocorrência", isoBR(d.dataOcorr)),
            c("Cidade", d.cidade), c("Unidade", d.unidade),
            c("Nome", d.nome), c("Nascimento", isoBR(d.nasc)),
            c("Sexo", d.sexo), c("Documento", d.documento),
            c("Endereço", [d.logradouro, d.numero, d.bairro].filter(Boolean).join(", "), true),
            c("Categoria", d.categoria), c("Já aconteceu antes?", d.recorrente),
            c("Encaminhamento", d.encaminhamento), c("Profissional", d.profissional),
            c("Observações", d.obs, true))),
        h("div", { class: "pdfmeta" }, S.modal.doCache ? "⚡ servido do cache (gerado há pouco)" : "📄 gerado em memória a partir de um modelo · fica em cache alguns minutos",
          h("br"), "Documento fictício: todos os dados desta ficha são inventados.")),
      [h("div", { class: "muted", style: "font-size:11px" }, `próximo PDF liberado em ${COOLDOWN_PDF}s`),
       h("div", { class: "mx-sp" }),
       h("button", { class: "b", type: "button", onclick: fecharModal }, "Fechar")],
      true);
  }
  function modalCsv(){
    const m = S.modal, linhas = linhasCsv(m);
    const muda = (k, v) => { m[k] = v; render(); };
    const data = k => h("input", { class: "in", type: "date", value: m[k], onchange: e => muda(k, e.target.value) });
    const sel = (k, opcoes) => { const s = h("select", { class: "in", onchange: e => muda(k, e.target.value) }, opcoes.map(([v, t]) => h("option", { value: v }, t))); s.value = m[k]; return s; };
    return janela("Exportar relatório (CSV)",
      h("div", null,
        h("div", { class: "form2" },
          h("div", null, h("label", { class: "l" }, "Data início"), data("ini")),
          h("div", null, h("label", { class: "l" }, "Data fim"), data("fim")),
          h("div", null, h("label", { class: "l" }, "Cidade"), sel("cidade", [["", "Todas"], ...CIDADES.map(x => [x, x])])),
          h("div", null, h("label", { class: "l" }, "Status"), sel("status", [["", "Todas"], ["enviadas", "Só enviadas"], ["nao", "Só não enviadas"]]))),
        h("div", { class: "alert warn", style: "margin-top:10px" }, "🔒 Sem nome, documento ou endereço: só dados agregáveis."),
        h("div", { class: "csvprev", "aria-label": "Prévia do CSV" }, linhas.length ? csvTexto(linhas.slice(0, 6)) + (linhas.length > 6 ? `\n… +${linhas.length - 6} linhas` : "") : "Nenhuma ficha no filtro.")),
      [h("span", { class: "muted", style: "font-size:11px" }, plural(linhas.length, "linha", "linhas")),
       h("div", { class: "mx-sp" }),
       h("button", { class: "b", type: "button", onclick: fecharModal }, "Cancelar"),
       h("button", { class: "b pri", type: "button", disabled: !linhas.length, onclick: () => baixarCsv(m) }, "⬇ Baixar CSV")],
      true);
  }

  const TELAS = { login: telaLogin, dashboard: telaDashboard, fichas: telaFichas, nova: telaNova, logs: telaLogs };
  const MODAIS = { status: modalStatus, excluir: modalExcluir, pdf: modalPdf, csv: modalCsv };

  /* ---------- presets dos "prints" ---------- */
  function entrouDemo(perfil){ S.user = { ...CONTAS[perfil], perfil }; }
  const PRESETS = {
    login(){ S.tela = "login"; },
    dashboard(){ entrouDemo("ADMIN"); S.tela = "dashboard"; },
    wizard(){
      entrouDemo("USER"); S.tela = "nova";
      S.wz = novoWizard(); S.wz.d = dadosExemplo(4, new Date(), S.user.nome); S.wz.etapa = 3;
    },
    offline(){
      entrouDemo("USER"); S.tela = "fichas"; S.online = false;
      S.pendentes = [0, 1].map(i => ({ dono: S.user.email, chave: uuid(), criada: diasAtras(0, 10 + i), dados: dadosExemplo(20 + i, new Date(), S.user.nome),
        cifra: b64(crypto.getRandomValues(new Uint8Array(40))), status: "fila" }));
    },
    fichas(){ entrouDemo("ADMIN"); S.tela = "fichas"; S.destaque = S.fichas[0].id; },
    exportar(){ entrouDemo("ADMIN"); S.tela = "fichas"; S.modal = csvPadrao(); },
  };

  /* ---------- API usada pela página ---------- */
  root.addEventListener("keydown", e => { if(e.key === "Escape" && S.modal) fecharModal(); });

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
        entrouDemo("ADMIN");
        log("LOGIN", "atalho da página do projeto · perfil ADMIN");
      }
      if(alvo === "wizard"){ if(!S.wz) S.wz = novoWizard(); return ir("nova"); }
      if(alvo === "offline"){
        if(S.online){ S.online = false; }
        S.wz = novoWizard();
        ir("nova");
        return toast("📴 Internet desligada: use ⚡, avance e salve a ficha");
      }
      if(alvo === "exportar"){
        if(!S.online) S.online = true;
        S.tela = "fichas";
        return abrirModal(csvPadrao());
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
  fig.append(h("button", { class: "btn95 sm", type: "button", onclick: () => {
    demo.abrir(nome);
    pular("demo");
    janelaDemo.classList.remove("flash"); void janelaDemo.offsetWidth; janelaDemo.classList.add("flash");
  } }, "▶ ver ao vivo"));
});

/* terminal do hero digitando frases */
(function digitar(){
  const alvo = document.getElementById("typed");
  const frases = ["troca a ficha de papel por um formulário guiado", "funciona sem internet e sincroniza depois",
                  "cifra os dados pessoais (LGPD)", "gera o PDF da ficha", "exporta relatório sem dado pessoal"];
  if(reduzMovimento) return;
  let f = 0, i = frases[0].length, apagando = true;
  setTimeout(function passo(){
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
