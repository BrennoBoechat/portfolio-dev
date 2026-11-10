/* Rede Internacional — sistema emulado + animações da página.
   Tudo aqui é inventado: eventos, cidades, países, instituições, pessoas, contratos, valores e
   logs vivem só na memória desta página e somem ao recarregar. O nome real da rede, das
   instituições e das cidades não aparece. Nenhum dado do sistema real foi usado e nada sai do
   navegador (os IPs do log são do bloco reservado para documentação, 203.0.113.0/24). */
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
const hojeIso = () => iso(new Date());
const plural = (n, um, varios) => n + " " + (n === 1 ? um : varios);
const hex = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => pad(b.toString(16))).join("");
const mascararEmail = e => e.replace(/^(.).*(@.*)$/, "$1***$2");
const semAcento = s => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const num = v => { const n = parseFloat(String(v ?? "").replace(",", ".")); return isNaN(n) ? 0 : n; };
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const moeda = v => BRL.format(num(v));
const reduzMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;
function emDias(n){ const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return iso(d); }
function haMinutos(m){ return new Date(Date.now() - m * 60000); }
const duracao = (ini, fim) => ini && fim && fim >= ini ? Math.round((deIso(fim) - deIso(ini)) / 864e5) + 1 : 0;

/* =================== DADOS FICTÍCIOS =================== */
const SEDE = "Cidade-Sede";
const CIDADES = { "Cidade-Sede": "País A", "Cidade do Prata": "País B", "Cidade Andina": "País C", "Cidade Atlântica": "País A", "Cidade Serrana": "País D" };
const PAISES = ["País A", "País B", "País C", "País D"];
const INSTITUICOES = ["Rede Internacional", "Fórum Exemplo", "Fundo Modelo", "Associação Demo"];
const COR_INST = { "Rede Internacional": "#9d4edd", "Fórum Exemplo": "#0a8f9e", "Fundo Modelo": "#e85d04", "Associação Demo": "#d61f69" };
const OFERECE = [["passagem", "✈ Passagem"], ["hotel", "🏨 Hospedagem"], ["transporte", "🚌 Transporte"], ["alim", "🍽 Alimentação"]];
const CUSTOS = OFERECE.map(([k]) => k);
const PESSOAS = ["Ana Exemplo", "Bruno Fictício", "Carla Modelo", "Davi Exemplo", "Eva Fictícia", "Fábio Modelo", "Gina Exemplo", "Hélio Fictício", "Íris Modelo", "Joana Exemplo"];
const ORGS = ["Prefeitura Exemplo", "Secretaria Modelo", "Instituto Demo", "Agência Fictícia"];
const ehSede = cidade => cidade === SEDE;
const paisDe = cidade => CIDADES[cidade] || "—";

/* perfis: o que cada um pode fazer (como no sistema real) */
const PERFIS = {
  ADMIN: "acesso total e gestão de usuários",
  EDITOR: "cria, edita e exclui eventos",
  SUPERUSER: "vê tudo, mas não edita",
  USER: "consulta a versão pública dos eventos",
};
const podeEditar = u => !!u && (u.perfil === "ADMIN" || u.perfil === "EDITOR");
const veTudo = u => !!u && u.perfil !== "USER";
const ehAdmin = u => !!u && u.perfil === "ADMIN";
const SENHA_DEMO = "demo123";
const CONTA_DEMO = { ADMIN: "admin@rede.exemplo", EDITOR: "editor@rede.exemplo", SUPERUSER: "consulta@rede.exemplo", USER: "usuario@rede.exemplo" };

function usuariosIniciais(){
  return [
    ["Admin Demo", "admin@rede.exemplo", "País A", "ADMIN", false],
    ["Editora Demo", "editor@rede.exemplo", "País B", "EDITOR", false],
    ["Consulta Demo", "consulta@rede.exemplo", "País C", "SUPERUSER", false],
    ["Usuário Novo", "usuario@rede.exemplo", "País D", "USER", true],   // senha temporária: cai na troca de senha
    ["Bruno Fictício", "bruno@rede.exemplo", "País B", "EDITOR", false],
    ["Carla Modelo", "carla@rede.exemplo", "País A", "USER", false],
  ].map(([nome, email, pais, perfil, trocar], i) => ({ id: i + 1, nome, email, pais, perfil, trocar, senha: SENHA_DEMO }));
}

function fichaVazia(){
  return {
    nome: "", inst: "", cidade: "", ini: "", fim: "", publico: "",
    coord: { nome: "", tel: "", email: "" }, desc: "",
    oferece: { passagem: false, hotel: false, transporte: false, alim: false },
    participantes: [], contrato: { processo: "", numero: "", contratante: "", valor: "" }, patrocinios: [],
    insc: { limite: "", link: "", cond: "", vagas: "" }, prog: "", site: "",
  };
}
const participanteVazio = () => ({ nome: "", org: "", passagem: "", hotel: "", transporte: "", alim: "" });
function participanteExemplo(i){
  return { nome: PESSOAS[i % PESSOAS.length], org: ORGS[i % ORGS.length],
    passagem: String(1800 + (i * 370) % 1500), hotel: String(900 + (i * 210) % 800),
    transporte: String(120 + (i * 45) % 200), alim: String(300 + (i * 80) % 300) };
}
/* [nome, instituição, cidade, começa em N dias, duração em dias, público estimado] */
const PLANO = [
  ["Cúpula Anual da Rede", 0, SEDE, 18, 3, 400],
  ["Seminário de Mobilidade Urbana", 1, "Cidade do Prata", 6, 2, 120],
  ["Oficina de Cooperação Técnica", 2, "Cidade Andina", 2, 1, 40],
  ["Reunião das Unidades Temáticas", 0, SEDE, 11, 1, 60],
  ["Encontro de Juventudes", 0, "Cidade Atlântica", 27, 3, 250],
  ["Painel de Inovação Pública", 2, "Cidade do Prata", 40, 3, 150],
  ["Fórum de Cidades Sustentáveis", 3, "Cidade Serrana", -9, 3, 180],
  ["Mesa de Cultura e Turismo", 1, SEDE, -20, 2, 90],
];
const NOVOS_NOMES = ["Oficina de Governo Aberto", "Seminário de Clima Urbano", "Jornada de Economia Criativa", "Encontro de Gestores Exemplo"];

function fichaExemplo(i, [nome, inst, cidade, off, dias, publico]){
  const f = fichaVazia();
  Object.assign(f, {
    nome, inst: INSTITUICOES[inst], cidade, ini: emDias(off), fim: emDias(off + dias - 1), publico: String(publico),
    desc: `Evento fictício da emulação: ${nome.toLowerCase()}, com painéis e oficinas entre as cidades da rede.`,
    prog: "Dia 1 — abertura e painéis" + (dias > 1 ? "\nDia 2 — oficinas temáticas" : "") + "\nEncerramento e carta final",
    site: "https://evento.exemplo",
  });
  f.coord = { nome: PESSOAS[(i + 3) % PESSOAS.length], tel: `(00) 9${pad(1000 + i * 111, 4)}-${pad(2000 + i * 37, 4)}`, email: `coordenacao${i + 1}@exemplo.org` };
  f.oferece = { passagem: i % 2 === 0, hotel: true, transporte: i % 3 !== 0, alim: true };
  f.insc = { limite: emDias(off - 3), link: "https://inscricao.exemplo", vagas: String(Math.round(publico * 0.6)),
    cond: i % 2 ? "Aberta a servidores das cidades da rede" : "Gratuita, por ordem de inscrição" };
  if(ehSede(cidade)){
    f.contrato = { processo: `9900/${pad(1000 + i * 17, 6)}/2026`, numero: `CT-${pad(10 + i, 3)}/2026`,
      contratante: "Empresa Fictícia de Eventos Ltda.", valor: String(25000 + i * 4300) };
    f.patrocinios = i % 2 === 0 ? [{ nome: "Patrocinador Exemplo", valor: "15000" }, { nome: "Fundação Modelo", valor: "8000" }]
      : i % 3 ? [{ nome: "Patrocinador Exemplo", valor: "5000" }] : [];
  } else {
    f.participantes = Array.from({ length: 1 + i % 3 }, (_, j) => participanteExemplo(i + j));
  }
  return f;
}
function eventosIniciais(){
  return PLANO.map((p, i) => ({ id: i + 1, d: fichaExemplo(i, p),
    criadoPor: i % 2 ? CONTA_DEMO.EDITOR : CONTA_DEMO.ADMIN, criadoEm: haMinutos(60 * 24 * (30 - i * 3)),
    editadoPor: i === 1 ? CONTA_DEMO.ADMIN : null, editadoEm: i === 1 ? haMinutos(60 * 5) : null }));
}

/* log de acesso: quem tentou entrar, de onde e se deu certo */
const IP_VISITANTE = "203.0.113." + (20 + Math.floor(Math.random() * 200));
const NAVEGADOR = (ua => /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Navegador")(navigator.userAgent);
function logsIniciais(){
  return [
    [3, CONTA_DEMO.EDITOR, "203.0.113.24", "Firefox", true, ""],
    [9, "visitante@exemplo.org", "203.0.113.77", "Chrome", false, "Credenciais inválidas"],
    [26, CONTA_DEMO.ADMIN, "203.0.113.10", "Edge", true, ""],
    [60 * 5, CONTA_DEMO.SUPERUSER, "203.0.113.51", "Chrome", true, ""],
    [60 * 26, "carla@rede.exemplo", "203.0.113.33", "Safari", false, "Credenciais inválidas"],
    [60 * 26 - 2, "carla@rede.exemplo", "203.0.113.33", "Safari", true, ""],
  ].map(([m, email, ip, nav, ok, motivo]) => ({ t: haMinutos(m), email, ip, nav, ok, motivo }));
}

/* =================== VALIDAÇÕES (as mesmas regras do sistema real) =================== */
const EMAIL_OK = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
function erroEmail(email, obrigatorio){
  const v = (email || "").trim();
  if(!v) return obrigatorio ? "E-mail é obrigatório." : "";
  if(/\s/.test(email.trim())) return "E-mail não pode conter espaços.";
  if(!EMAIL_OK.test(v)) return "Formato de e-mail inválido.";
  return "";
}
function erroNome(nome){
  const v = (nome || "").trim().replace(/\s+/g, " ");
  if(!v) return "Nome é obrigatório.";
  if(v.length < 5) return "Nome muito curto.";
  if(v.split(" ").length < 2) return "Informe nome e sobrenome.";
  if(!/^[A-Za-zÀ-ÖØ-öø-ÿ]+(\s[A-Za-zÀ-ÖØ-öø-ÿ]+)+$/.test(v)) return "Nome inválido. Use apenas letras.";
  return "";
}
function erroDocumento(valor, rotulo){
  if(!valor.trim()) return `${rotulo} é obrigatório.`;
  if(/\s/.test(valor)) return `${rotulo} não pode conter espaços.`;
  if(!/\d/.test(valor)) return `${rotulo} deve conter pelo menos um número.`;
  return "";
}
const regrasSenha = (nova, conf) => [
  ["Pelo menos 5 caracteres", nova.length >= 5, "A senha deve conter no mínimo 5 caracteres."],
  ["Sem espaços", nova.length > 0 && /^\S+$/.test(nova), "A senha não pode conter espaços."],
  ["Confirmação igual", conf.length > 0 && nova === conf, "As senhas não coincidem."],
];
const totalPart = p => CUSTOS.reduce((a, k) => a + num(p[k]), 0);
const totalPatroc = d => d.patrocinios.reduce((a, s) => a + num(s.valor), 0);
const linhaVazia = obj => Object.values(obj).every(v => !String(v).trim());

/* =================== O SISTEMA EMULADO =================== */
/* Cria uma instância do app dentro de `root`.
   Com `preset`, a instância é só um desenho estático (os "prints" da página): sem timers nem toasts. */
function criarApp(root, preset){
  const estatico = !!preset;
  const timers = new Set();
  let S, corpoEl;

  function depois(fn, ms){
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
  }
  function limparTimers(){ timers.forEach(clearTimeout); timers.clear(); }

  function estadoInicial(){
    const hoje = new Date();
    return {
      tela: "login", tema: "light", user: null,
      login: { email: "", senha: "", erro: "", ocupado: false },
      troca: { nova: "", conf: "" },
      usuarios: usuariosIniciais(), eventos: eventosIniciais(), logs: logsIniciais(),
      filtro: { q: "", inst: "", aba: "proximos" },
      mes: new Date(hoje.getFullYear(), hoje.getMonth(), 1),
      atual: null, destaque: null, wz: null, modal: null, adminAba: "usuarios",
    };
  }

  function toast(msg){
    if(estatico) return;
    const t = h("div", { class: "toast", role: "status" }, msg);
    root.append(t);
    setTimeout(() => t.remove(), 2600);
  }
  function logAcesso(email, ok, motivo){
    S.logs.unshift({ t: new Date(), email, ip: IP_VISITANTE, nav: NAVEGADOR, ok, motivo: motivo || "" });
  }

  /* ---------- desenho ---------- */
  function render(){
    root.className = "mx" + (S.tema === "dark" ? " dark" : "") + (estatico ? " static" : "");
    corpoEl = h("div", { class: "mx-body" }, TELAS[S.tela]());
    root.replaceChildren(...[cabecalho(), corpoEl, S.modal && MODAIS[S.modal.tipo]()].filter(Boolean));
  }
  function renderCorpo(){ corpoEl.replaceChildren(TELAS[S.tela]()); }
  /* as guardas de rota: sem login vai pro login, senha temporária vai pra troca, sem permissão volta ao painel */
  function ir(tela){
    const u = S.user;
    if(!u) tela = "login";
    else if(u.trocar) tela = "senha";
    else if(tela === "nova" && !podeEditar(u)) tela = "painel";
    else if(tela === "admin" && !ehAdmin(u)) tela = "painel";
    if(tela === "nova" && !S.wz) S.wz = novoWizard();
    S.tela = tela; S.modal = null;
    render();
    if(corpoEl) corpoEl.scrollTop = 0;
  }

  function cabecalho(){
    const u = S.user, dentro = u && !u.trocar;
    const aba = (id, rotulo, ativo) => h("button", { class: "mx-tab" + ((ativo || [id]).includes(S.tela) ? " on" : ""), type: "button", onclick: () => ir(id) }, rotulo);
    return h("div", { class: "mx-head" },
      h("div", { class: "mx-logo" }, h("span", { class: "ico" }, "🌎"), h("div", null, "Rede Internacional", h("small", null, "GESTÃO DE EVENTOS"))),
      dentro && [aba("painel", "▦ Painel"), aba("eventos", "📋 Eventos", ["eventos", "resumo"]), aba("calendario", "📅 Calendário"),
        podeEditar(u) && aba("nova", "＋ Ficha"), ehAdmin(u) && aba("admin", "⚙ Admin")],
      h("div", { class: "mx-sp" }),
      h("button", { class: "mx-ib", type: "button", title: "Tema claro/escuro",
        onclick: () => { S.tema = S.tema === "dark" ? "light" : "dark"; render(); } }, S.tema === "dark" ? "☀" : "☾"),
      u && h("span", { class: "pf " + u.perfil, title: `${u.nome} · ${PERFIS[u.perfil]}` }, u.perfil),
      u && h("button", { class: "mx-ib", type: "button", onclick: sair }, "Sair"));
  }
  const marca = sub => h("div", { class: "brand" }, h("div", { class: "mx-logo" }, h("span", { class: "ico" }, "🌎"),
    h("div", null, "Rede Internacional", h("small", null, sub))));

  /* ---------- LOGIN ---------- */
  function telaLogin(){
    const L = S.login;
    const preencher = perfil => { L.email = CONTA_DEMO[perfil]; L.senha = SENHA_DEMO; L.erro = ""; renderCorpo(); root.querySelector(".mx-login .pri").focus(); };
    return h("div", { class: "mx-login" }, h("div", { class: "card" }, marca("PLATAFORMA DA REDE"),
      h("div", { class: "muted" }, "Acesso restrito a quem tem conta na rede."),
      h("form", { novalidate: true, onsubmit: e => { e.preventDefault(); entrar(); } },
        h("label", { class: "l" }, "E-mail"),
        h("input", { class: "in" + (L.erro && !L.email ? " err" : ""), type: "email", value: L.email, placeholder: "nome@rede.exemplo", autocomplete: "off",
          oninput: e => { L.email = e.target.value; } }),
        h("label", { class: "l" }, "Senha"),
        h("input", { class: "in" + (L.erro && !L.senha ? " err" : ""), type: "password", value: L.senha, placeholder: "••••••", autocomplete: "off",
          oninput: e => { L.senha = e.target.value; } }),
        h("button", { class: "b pri full", type: "submit", style: "margin-top:10px", disabled: L.ocupado },
          L.ocupado ? [h("span", { class: "spin" }, "◌"), " Entrando…"] : "Entrar")),
      L.erro && h("div", { class: "alert err" }, "⚠ " + L.erro),
      h("div", { class: "or" }, "contas de demonstração"),
      h("div", { class: "demo-contas" }, Object.keys(CONTA_DEMO).map(p =>
        h("button", { class: "b sm", type: "button", title: PERFIS[p], onclick: () => preencher(p) }, h("span", { class: "pf " + p }, p)))),
      h("div", { class: "hint" }, `senha de todas: ${SENHA_DEMO} · login simulado`)));
  }
  function entrar(){
    const L = S.login;
    if(L.ocupado) return;
    if(!L.email.trim() || !L.senha){ L.erro = "Informe e-mail e senha."; return renderCorpo(); }
    L.ocupado = true; L.erro = "";
    renderCorpo();
    depois(() => {
      L.ocupado = false;
      const email = L.email.trim().toLowerCase();
      const u = S.usuarios.find(x => x.email === email);
      if(!u || u.senha !== L.senha){
        logAcesso(email, false, "Credenciais inválidas");
        L.erro = "E-mail ou senha inválidos."; L.senha = "";
        return renderCorpo();
      }
      logAcesso(u.email, true);
      S.user = u; L.senha = "";
      ir("painel");
      toast(u.trocar ? "🔑 Senha temporária: troque antes de continuar" : `🔑 Token JWT emitido · perfil ${u.perfil}`);
    }, 650);
  }
  function sair(){
    limparTimers();
    S.user = null; S.wz = null; S.modal = null;
    S.login.ocupado = false; S.login.erro = ""; S.troca = { nova: "", conf: "" };
    ir("login");
  }

  /* ---------- TROCA DE SENHA (primeiro acesso) ---------- */
  function telaSenha(){
    const T = S.troca;
    const lista = h("ul", { class: "regras" });
    const pintarRegras = () => lista.replaceChildren(...regrasSenha(T.nova, T.conf).map(([txt, ok]) => h("li", { class: ok ? "ok" : null }, ok ? "✓ " : "· ", txt)));
    pintarRegras();
    return h("div", { class: "mx-login" }, h("div", { class: "card" }, marca("PRIMEIRO ACESSO"),
      h("h4", { style: "margin-top:6px" }, "Troque sua senha"),
      h("div", { class: "muted" }, `Olá, ${S.user.nome}. Você entrou com uma senha temporária: crie a sua antes de continuar.`),
      h("form", { novalidate: true, onsubmit: e => { e.preventDefault(); salvarSenha(); } },
        h("label", { class: "l" }, "Nova senha"),
        h("input", { class: "in", type: "password", value: T.nova, placeholder: "Digite sua nova senha", autocomplete: "new-password",
          oninput: e => { T.nova = e.target.value; pintarRegras(); } }),
        h("label", { class: "l" }, "Confirmar nova senha"),
        h("input", { class: "in", type: "password", value: T.conf, placeholder: "Digite a senha novamente", autocomplete: "new-password",
          oninput: e => { T.conf = e.target.value; pintarRegras(); } }),
        lista,
        h("button", { class: "b pri full", type: "submit" }, "Salvar nova senha")),
      T.erro && h("div", { class: "alert err" }, "⚠ " + T.erro)));
  }
  function salvarSenha(){
    const T = S.troca, falha = regrasSenha(T.nova, T.conf).find(r => !r[1]);
    if(falha){ T.erro = falha[2]; return renderCorpo(); }
    S.user.senha = T.nova; S.user.trocar = false;
    S.troca = { nova: "", conf: "" };
    ir("painel");
    toast("🔒 Senha alterada · bem-vindo!");
  }

  /* ---------- PAINEL ---------- */
  function telaPainel(){
    const u = S.user, hoje = hojeIso(), mesAtual = hoje.slice(0, 7);
    const modulos = [
      { id: "eventos", ico: "📋", t: "Eventos", d: "Todos os eventos e suas informações." },
      { id: "nova", ico: "✚", t: "Criar Ficha de Evento", d: "Cadastre um evento em 4 etapas.", ok: podeEditar(u) },
      { id: "calendario", ico: "📅", t: "Calendário", d: "Os eventos do mês num só lugar." },
      { id: "relatorios", ico: "📊", t: "Relatórios", d: "Relatórios dos eventos.", obra: true },
      { id: "projetos", ico: "🗂", t: "Banco de Projetos", d: "Projetos da rede.", obra: true },
      { id: "admin", ico: "⚙", t: "Painel Administrativo", d: "Acessos e perfis do sistema.", ok: ehAdmin(u) },
    ];
    const visiveis = modulos.filter(m => m.ok !== false), escondidos = modulos.length - visiveis.length;
    const ev = S.eventos.map(e => e.d);
    const kpi = (v, t) => h("div", { class: "kpi" }, h("b", null, v), t);
    return h("div", null,
      h("h4", null, `Olá, ${u.nome}!`),
      h("div", { class: "muted" }, `Perfil ${u.perfil}: ${PERFIS[u.perfil]}.`),
      h("div", { class: "mx-kpis" },
        kpi(ev.filter(d => d.fim >= hoje).length, "próximos eventos"),
        kpi(ev.filter(d => d.ini.slice(0, 7) <= mesAtual && d.fim.slice(0, 7) >= mesAtual).length, "neste mês"),
        kpi(ev.filter(d => d.fim < hoje).length, "concluídos"),
        kpi(new Set(ev.map(d => d.cidade)).size, "cidades")),
      h("div", { class: "mods" }, visiveis.map(m =>
        h("button", { class: "mod" + (m.obra ? " obra" : ""), type: "button",
          onclick: () => m.obra ? toast("🚧 Módulo em construção") : m.id === "nova" ? novaFicha() : ir(m.id) },
          h("span", { class: "mi" }, m.ico), h("b", null, m.t), h("span", null, m.d),
          h("small", null, m.obra ? "🚧 em construção" : "Visualizar ›")))),
      escondidos > 0 && h("div", { class: "muted", style: "margin-top:8px;font-size:11px" },
        `🔒 ${plural(escondidos, "módulo escondido", "módulos escondidos")} para o perfil ${u.perfil}.`));
  }

  /* ---------- EVENTOS ---------- */
  function telaEventos(){
    const F = S.filtro, u = S.user;
    const res = h("div");
    const pintar = () => res.replaceChildren(resultadoEventos(pintar));
    pintar();
    const inst = h("select", { class: "in", onchange: e => { F.inst = e.target.value; pintar(); } },
      h("option", { value: "" }, "Todas as instituições"), INSTITUICOES.map(x => h("option", { value: x }, x)));
    inst.value = F.inst;
    return h("div", null,
      h("div", { class: "mx-row" },
        h("div", { style: "flex:1;min-width:0" }, h("h4", null, "Eventos"),
          h("div", { class: "muted" }, plural(S.eventos.length, "evento cadastrado", "eventos cadastrados"))),
        podeEditar(u) && h("button", { class: "b pri", type: "button", onclick: novaFicha }, "＋ Nova Ficha")),
      h("div", { class: "evfil" },
        h("input", { class: "in", type: "search", placeholder: "Buscar evento ou cidade…", value: F.q, oninput: e => { F.q = e.target.value; pintar(); } }),
        inst),
      res);
  }
  function resultadoEventos(pintar){
    const F = S.filtro, hoje = hojeIso(), q = semAcento(F.q.trim());
    const filtrados = S.eventos.filter(e => (!F.inst || e.d.inst === F.inst) && (!q || semAcento(e.d.nome + " " + e.d.cidade).includes(q)));
    const prox = filtrados.filter(e => e.d.fim >= hoje).sort((a, b) => a.d.ini.localeCompare(b.d.ini));
    const conc = filtrados.filter(e => e.d.fim < hoje).sort((a, b) => b.d.ini.localeCompare(a.d.ini));
    const lista = F.aba === "proximos" ? prox : conc;
    const aba = (id, rotulo, n) => h("button", { class: "mx-tab" + (F.aba === id ? " on" : ""), type: "button", onclick: () => { F.aba = id; pintar(); } }, `${rotulo} (${n})`);
    return h("div", null,
      h("div", { class: "evtabs" }, aba("proximos", "⏭ Próximos", prox.length), aba("concluidos", "✓ Concluídos", conc.length)),
      lista.length ? h("div", { class: "evgrid" }, lista.map(cartaoEvento))
        : h("div", { class: "vazio" }, "Nenhum evento encontrado", h("small", null, F.q || F.inst ? "Tente outra busca ou instituição." : "")));
  }
  const periodo = d => (d.ini === d.fim ? isoBR(d.ini) : `${isoBR(d.ini)} a ${isoBR(d.fim)}`) + ` · ${plural(duracao(d.ini, d.fim), "dia", "dias")}`;
  function cartaoEvento(e){
    const d = e.d, u = S.user;
    return h("div", { class: "ev" + (S.destaque === e.id ? " hl" : ""), style: `--c:${COR_INST[d.inst]}` },
      h("div", { class: "ev-top" }, h("span", { class: "inst" }, d.inst),
        ehSede(d.cidade) && h("span", { class: "tag m" }, "cidade-sede"), d.fim < hojeIso() && h("span", { class: "tag ok" }, "concluído")),
      h("b", { class: "ev-n" }, d.nome),
      h("div", { class: "ev-i" }, "📅 ", periodo(d)),
      h("div", { class: "ev-i" }, "📍 ", d.cidade, " · ", paisDe(d.cidade)),
      h("div", { class: "ev-i" }, "👥 ", d.publico ? `${d.publico} pessoas (estimado)` : "público não informado"),
      h("div", { class: "acts" },
        h("button", { class: "b sm", type: "button", onclick: () => verResumo(e.id) }, "👁 Ver resumo"),
        podeEditar(u) && h("button", { class: "b sm", type: "button", title: "Editar", onclick: () => editar(e) }, "✎"),
        podeEditar(u) && h("button", { class: "b sm", type: "button", title: "Excluir", onclick: () => abrirModal({ tipo: "excluir", id: e.id }) }, "🗑")));
  }
  function verResumo(id){ S.atual = id; ir("resumo"); }

  /* ---------- CALENDÁRIO ---------- */
  function telaCalendario(){
    const m = S.mes, ano = m.getFullYear(), mes = m.getMonth(), hoje = hojeIso();
    const inicio = new Date(ano, mes, 1 - new Date(ano, mes, 1).getDay());   // domingo antes do dia 1
    const semanas = Math.ceil((new Date(ano, mes, 1).getDay() + new Date(ano, mes + 1, 0).getDate()) / 7);
    const ordenados = S.eventos.slice().sort((a, b) => a.d.ini.localeCompare(b.d.ini) || a.id - b.id);
    const chaveMes = `${ano}-${pad(mes + 1)}`;
    const doMes = ordenados.filter(e => e.d.ini.slice(0, 7) <= chaveMes && e.d.fim.slice(0, 7) >= chaveMes);
    const mudar = n => { S.mes = n === 0 ? new Date(new Date().getFullYear(), new Date().getMonth(), 1) : new Date(ano, mes + n, 1); renderCorpo(); };
    const titulo = m.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    const celulas = [];
    for(let i = 0; i < semanas * 7; i++){
      const dia = new Date(inicio); dia.setDate(inicio.getDate() + i);
      const k = iso(dia), evs = ordenados.filter(e => e.d.ini <= k && e.d.fim >= k);
      celulas.push(h("div", { class: "cd" + (dia.getMonth() !== mes ? " fora" : "") + (k === hoje ? " hoje" : "") },
        h("span", { class: "dn" }, dia.getDate()),
        evs.slice(0, 2).map(e => {
          const comeca = e.d.ini === k || dia.getDay() === 0;   // o nome aparece no 1º dia e no começo de cada semana
          return h("button", { class: "ce" + (e.d.ini === k ? " ini" : "") + (e.d.fim === k ? " fim" : ""), type: "button",
            style: `--c:${COR_INST[e.d.inst]}`, title: `${e.d.nome} · ${e.d.cidade}`, onclick: () => verResumo(e.id) }, comeca ? e.d.nome : " ");
        }),
        evs.length > 2 && h("small", { class: "mais" }, `+${evs.length - 2}`)));
    }
    return h("div", null,
      h("div", { class: "calbar" },
        h("div", { class: "mx-row" },
          h("button", { class: "b sm", type: "button", title: "Mês anterior", onclick: () => mudar(-1) }, "‹"),
          h("button", { class: "b sm", type: "button", onclick: () => mudar(0) }, "Hoje"),
          h("button", { class: "b sm", type: "button", title: "Próximo mês", onclick: () => mudar(1) }, "›")),
        h("h4", null, titulo.charAt(0).toUpperCase() + titulo.slice(1)),
        h("span", { class: "muted" }, plural(doMes.length, "evento", "eventos"))),
      h("div", { class: "calg" },
        ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => h("div", { class: "cw" }, d)),
        celulas),
      h("div", { class: "lgd-inst" }, INSTITUICOES.map(x => h("span", { style: `--c:${COR_INST[x]}` }, h("i"), x))));
  }

  /* ---------- RESUMO DO EVENTO ---------- */
  function telaResumo(){
    const e = S.eventos.find(x => x.id === S.atual);
    if(!e){ S.tela = "eventos"; return telaEventos(); }
    const u = S.user, tudo = veTudo(u);
    return h("div", null,
      h("div", { class: "mx-row" },
        h("button", { class: "b sm", type: "button", onclick: () => ir("eventos") }, "‹ Eventos"),
        h("div", { class: "mx-sp" }),
        podeEditar(u) && h("button", { class: "b sm", type: "button", onclick: () => editar(e) }, "✎ Editar"),
        h("button", { class: "b sm pri", type: "button", onclick: () => abrirModal({ tipo: "imprimir", id: e.id }) }, "🖨 Imprimir")),
      h("h4", { style: "margin-top:8px" }, e.d.nome),
      h("div", { class: "muted" }, tudo ? "Visualização completa dos dados" : "Versão pública do evento"),
      !tudo && h("div", { class: "alert warn" }, "🔒 Seu perfil (USER) não vê contatos, custos, contrato nem patrocínio. A API já responde sem esses campos."),
      conteudoResumo(e, tudo));
  }
  /* o corpo do resumo é o mesmo na tela e na folha de impressão */
  function conteudoResumo(e, tudo){
    const d = e.d, sede = ehSede(d.cidade);
    const sec = (titulo, ...kids) => h("section", { class: "rsec" }, h("div", { class: "rt" }, titulo), kids);
    const c = (rotulo, valor, cls) => h("div", { class: "rf" + (cls ? " " + cls : "") }, h("small", null, rotulo), valor || "—");
    const texto = (v, vazio) => v ? h("p", { class: "rtx" }, v) : h("p", { class: "rtx muted" }, vazio);
    const ofertas = OFERECE.filter(([k]) => d.oferece[k]).map(([, r]) => h("span", { class: "tag m" }, r));
    const n = duracao(d.ini, d.fim);
    return h("div", { class: "resumo" },
      sec("Identificação", h("div", { class: "rg" },
        c("Nome do evento", d.nome, "w2"), c("Instituição", d.inst),
        c("Cidade", d.cidade + (sede ? " (sede)" : "")), c("País", paisDe(d.cidade)), c("Público estimado", d.publico && `${d.publico} pessoas`),
        c("Início", isoBR(d.ini)), c("Fim", isoBR(d.fim) + (d.fim < hojeIso() ? " (concluído)" : "")), c("Duração", n && plural(n, "dia", "dias")))),
      tudo && sec("Coordenação", h("div", { class: "rg" }, c("Responsável", d.coord.nome), c("Telefone", d.coord.tel), c("E-mail", d.coord.email))),
      sec("Descrição", texto(d.desc, "Nenhuma descrição informada"),
        h("div", { class: "rof" }, h("small", null, "O evento oferece: "), ofertas.length ? ofertas : h("span", { class: "muted" }, "nada informado"))),
      tudo && sede && sec("Informações do contrato", h("div", { class: "rg" },
        c("Número do processo", d.contrato.processo), c("Número do contrato", d.contrato.numero),
        c("Contratante", d.contrato.contratante), c("Valor do contrato", d.contrato.valor && moeda(d.contrato.valor)))),
      tudo && sede && sec("Patrocinadores", d.patrocinios.length
        ? h("table", { class: "rtbl" },
            h("thead", null, h("tr", null, h("th", null, "Patrocinador"), h("th", { class: "num" }, "Valor do patrocínio"))),
            h("tbody", null, d.patrocinios.map(s => h("tr", null, h("td", null, s.nome), h("td", { class: "num" }, moeda(s.valor))))),
            h("tfoot", null, h("tr", null, h("td", null, "Total"), h("td", { class: "num" }, moeda(totalPatroc(d))))))
        : texto("", "Nenhum patrocinador cadastrado")),
      tudo && !sede && sec("Participantes e custos", d.participantes.length
        ? h("div", { class: "tbl" }, h("table", { class: "rtbl" },
            h("thead", null, h("tr", null, ["Nome", "Organização", "Passagem", "Hospedagem", "Transporte", "Alimentação", "Total"].map((t, i) => h("th", { class: i > 1 ? "num" : null }, t)))),
            h("tbody", null, d.participantes.map(p => h("tr", null, h("td", null, p.nome), h("td", null, p.org),
              CUSTOS.map(k => h("td", { class: "num" }, moeda(p[k]))), h("td", { class: "num" }, h("b", null, moeda(totalPart(p))))))),
            h("tfoot", null, h("tr", null, h("td", { colspan: 6 }, `Custo estimado · ${plural(d.participantes.length, "participante", "participantes")}`),
              h("td", { class: "num" }, moeda(d.participantes.reduce((a, p) => a + totalPart(p), 0)))))))
        : texto("", "Nenhum participante cadastrado")),
      sec("Inscrições", h("div", { class: "rg" },
        c("Até o dia", isoBR(d.insc.limite)), c("Vagas", d.insc.vagas), c("Link", d.insc.link), c("Condições", d.insc.cond, "w3"))),
      sec("Programação", texto(d.prog, "Nenhuma programação informada"), d.site && h("div", { class: "rof" }, h("small", null, "Site: "), d.site)),
      h("div", { class: "rmeta" },
        tudo ? `Criado por ${e.criadoPor} em ${dataBR(e.criadoEm)}` + (e.editadoPor ? ` · editado por ${e.editadoPor} em ${dataBR(e.editadoEm)}` : "")
          : `Criado em ${dataBR(e.criadoEm)}` + (e.editadoEm ? ` · atualizado em ${dataBR(e.editadoEm)}` : "")));
  }
  /* imprime só a folha: copia pra fora do app, esconde o resto da página e chama a impressão do navegador */
  function imprimir(){
    const folha = root.querySelector(".psheet");
    if(!folha) return;
    const velha = document.getElementById("printArea");
    if(velha) velha.remove();
    const area = h("div", { id: "printArea", class: "mx print-area" }, folha.cloneNode(true));
    document.body.append(area);
    document.documentElement.classList.add("imprimindo");
    /* na tela a área fica sempre escondida; só some de vez quando a impressão termina */
    addEventListener("afterprint", () => { area.remove(); document.documentElement.classList.remove("imprimindo"); }, { once: true });
    print();
  }

  /* ---------- NOVA FICHA (formulário em 4 etapas) ---------- */
  const etapasDe = d => ["Dados do evento", "Organização", ehSede(d.cidade) ? "Contrato & Patrocínio" : "Participantes & Custos", "Programação"];
  function novoWizard(){ return { etapa: 0, d: fichaVazia(), erros: {}, editando: null, salvando: false }; }
  function novaFicha(){ S.wz = novoWizard(); ir("nova"); }
  function editar(e){
    S.wz = { etapa: 0, d: structuredClone(e.d), erros: {}, editando: e.id, salvando: false };
    ir("nova");
  }
  function telaNova(){
    const W = S.wz, d = W.d, etapas = etapasDe(d);
    const editando = W.editando && S.eventos.find(x => x.id === W.editando);
    return h("div", null,
      h("div", { class: "wz-top" },
        h("h4", null, editando ? "Editando ficha" : "Cadastro da ficha"),
        h("button", { class: "b sm", type: "button", onclick: preencherExemplo }, "⚡ Preencher com dados fictícios")),
      h("div", { class: "muted" }, editando ? editando.d.nome : `Etapa ${W.etapa + 1} de 4 — ${etapas[W.etapa]}`),
      h("div", { class: "wz-steps" }, etapas.map((nome, i) =>
        h("button", { class: "wz-step" + (i < W.etapa ? " feito" : i === W.etapa ? " agora" : ""), type: "button", onclick: () => irPara(i) },
          h("b", null, i < W.etapa ? "✓" : i + 1), h("span", { "data-etapa": i }, nome)))),
      h("div", { class: "wz-card" }, FORMULARIOS[W.etapa](d, W.erros)),
      h("div", { class: "wz-nav" },
        h("button", { class: "b", type: "button", disabled: W.etapa === 0, onclick: () => irEtapa(W.etapa - 1) }, "‹ Voltar"),
        editando && h("button", { class: "b", type: "button", onclick: () => { S.wz = null; verResumo(editando.id); } }, "Cancelar"),
        h("div", { class: "mx-sp" }),
        W.etapa < 3
          ? h("button", { class: "b pri", type: "button", onclick: () => irPara(W.etapa + 1) }, "Próximo ›")
          : h("button", { class: "b pri", type: "button", disabled: W.salvando, onclick: salvarFicha },
              W.salvando ? "Salvando…" : editando ? "💾 Salvar alterações" : "✓ Salvar ficha")));
  }
  function irEtapa(i){
    S.wz.etapa = i; S.wz.erros = {};
    renderCorpo();
    corpoEl.scrollTop = 0;
  }
  /* pra frente, só passa se as etapas do caminho estiverem válidas */
  function irPara(alvo){
    const W = S.wz;
    for(let i = W.etapa; i < alvo; i++){
      const erros = validar(i, W.d);
      if(Object.keys(erros).length){ W.etapa = i; W.erros = erros; renderCorpo(); return toast(`Revise a etapa ${i + 1}`); }
    }
    irEtapa(alvo);
  }
  function preencherExemplo(){
    const W = S.wz, k = S.eventos.length + 3;
    const cidade = W.d.cidade || (k % 2 ? "Cidade Andina" : SEDE);
    W.d = fichaExemplo(k, [W.d.nome || NOVOS_NOMES[k % NOVOS_NOMES.length], k % INSTITUICOES.length, cidade, 9 + (k * 5) % 30, 1 + k % 3, 80 + (k * 37) % 300]);
    W.erros = {};
    renderCorpo();
    toast("⚡ Ficha preenchida com dados fictícios");
  }
  function validar(etapa, d){
    const e = {}, hoje = hojeIso();
    if(etapa === 0){
      if(d.nome.trim().length < 3) e.nome = "Informe o nome do evento.";
      if(!d.inst) e.inst = "Escolha a instituição.";
      if(!d.cidade) e.cidade = "Escolha a cidade.";
      if(!d.ini) e.ini = "A data inicial é obrigatória.";
      else if(d.ini < hoje) e.ini = "A data inicial não pode ser no passado.";
      if(!d.fim) e.fim = "A data final é obrigatória.";
      else if(d.ini && d.fim < d.ini) e.fim = "A data final não pode ser anterior à data inicial.";
      if(num(d.publico) < 0) e.publico = "Não pode ser negativo.";
    }
    if(etapa === 1){
      const m = erroEmail(d.coord.email, false);
      if(m) e["coord.email"] = m;
    }
    if(etapa === 2){
      if(ehSede(d.cidade)){
        const ct = d.contrato;
        [["processo", "Número do processo"], ["numero", "Número do contrato"]].forEach(([k, r]) => { const m = erroDocumento(ct[k], r); if(m) e["contrato." + k] = m; });
        if(!ct.contratante.trim()) e["contrato.contratante"] = "Informe o contratante.";
        if(!String(ct.valor).trim()) e["contrato.valor"] = "Informe o valor do contrato.";
        else if(num(ct.valor) < 0) e["contrato.valor"] = "Valor não pode ser negativo.";
        d.patrocinios.forEach((s, i) => {
          if(linhaVazia(s)) return;
          if(!s.nome.trim()) e[`s.${i}.nome`] = `Patrocinador ${i + 1}: informe o nome.`;
          if(num(s.valor) < 0) e[`s.${i}.valor`] = `Patrocinador ${i + 1}: valor não pode ser negativo.`;
        });
      } else {
        d.participantes.forEach((p, i) => {
          if(linhaVazia(p)) return;
          if(!p.nome.trim()) e[`p.${i}.nome`] = `Participante ${i + 1}: informe o nome.`;
          CUSTOS.forEach(k => { if(num(p[k]) < 0) e[`p.${i}.${k}`] = `Participante ${i + 1}: valor não pode ser negativo.`; });
        });
      }
    }
    if(etapa === 3 && num(d.insc.vagas) < 0) e["insc.vagas"] = "Não pode ser negativo.";
    return e;
  }
  function salvarFicha(){
    const W = S.wz;
    for(let i = 0; i < 4; i++){   // revalida tudo: leva de volta à primeira etapa com erro
      const erros = validar(i, W.d);
      if(Object.keys(erros).length){ W.etapa = i; W.erros = erros; renderCorpo(); return toast(`Revise a etapa ${i + 1}: ${etapasDe(W.d)[i]}`); }
    }
    /* regra por cidade: na sede vai contrato e patrocínio; fora dela, participantes e custos */
    const d = structuredClone(W.d);
    if(ehSede(d.cidade)){ d.participantes = []; d.patrocinios = d.patrocinios.filter(s => !linhaVazia(s)); }
    else { d.contrato = fichaVazia().contrato; d.patrocinios = []; d.participantes = d.participantes.filter(p => !linhaVazia(p)); }
    W.salvando = true; renderCorpo();
    depois(() => {
      let ev;
      if(W.editando){
        ev = S.eventos.find(x => x.id === W.editando);
        Object.assign(ev, { d, editadoPor: S.user.email, editadoEm: new Date() });
        toast("💾 Ficha atualizada · evento sincronizado");
      } else {
        ev = { id: Math.max(0, ...S.eventos.map(x => x.id)) + 1, d, criadoPor: S.user.email, criadoEm: new Date(), editadoPor: null, editadoEm: null };
        S.eventos.push(ev);
        toast("✓ Ficha salva · evento criado no calendário");
      }
      const ini = deIso(d.ini);
      S.mes = new Date(ini.getFullYear(), ini.getMonth(), 1);   // o calendário abre no mês do evento
      S.destaque = ev.id; S.wz = null;
      verResumo(ev.id);
    }, 600);
  }

  /* campos do formulário. `obj` = onde o valor mora, `e` = erros da etapa */
  function campo(obj, e, k, rotulo, o = {}){
    const ek = o.ek || k, cls = "in" + (e[ek] ? " err" : "");
    let ctrl;
    if(o.opcoes){
      ctrl = h("select", { class: cls, "data-k": ek, onchange: ev => { obj[k] = ev.target.value; if(o.aoMudar) o.aoMudar(); } },
        h("option", { value: "" }, "Selecione…"), o.opcoes.map(x => h("option", { value: x }, x)));
      ctrl.value = obj[k];
    } else if(o.tipo === "textarea"){
      const cont = h("div", { class: "cont" }, `${obj[k].length}/${o.max}`);
      ctrl = [h("textarea", { class: cls, rows: o.linhas || 3, maxlength: o.max, value: obj[k], placeholder: o.placeholder,
        oninput: ev => { obj[k] = ev.target.value; cont.textContent = `${obj[k].length}/${o.max}`; } }), cont];
    } else {
      ctrl = h("input", { class: cls, "data-k": ek, type: o.tipo || "text", value: obj[k], placeholder: o.placeholder, maxlength: o.max,
        min: o.min, step: o.step, inputmode: o.inputmode, autocomplete: "off",
        oninput: ev => {
          if(o.mascara) ev.target.value = o.mascara(ev.target.value);
          obj[k] = ev.target.value;
          if(o.aoMudar) o.aoMudar();
        } });
    }
    return h("div", { class: o.full ? "full" : null },
      h("label", { class: "l" }, rotulo, o.req && h("span", { class: "req" }, " *"), o.nota && [" ", h("span", { class: "lock" }, o.nota)]),
      ctrl, e[ek] && h("div", { class: "errmsg" }, e[ek]));
  }
  const info = (rotulo, chave, valor, nota) => h("div", null,
    h("label", { class: "l" }, rotulo, " ", h("span", { class: "lock" }, nota)),
    h("div", { class: "in fixo", "data-info": chave }, valor));
  const mascaraTel = v => {
    const n = v.replace(/\D/g, "").slice(0, 11);
    if(n.length <= 2) return n.length ? `(${n}` : "";
    if(n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
    return `(${n.slice(0, 2)}) ${n.slice(2, n.length - 4)}-${n.slice(-4)}`;
  };
  /* atualiza país, duração e o nome da etapa 3 sem redesenhar o formulário (não tira o foco de quem digita) */
  function atualizarDerivados(){
    const d = S.wz.d, n = duracao(d.ini, d.fim);
    const set = (sel, txt) => { const el = root.querySelector(sel); if(el) el.textContent = txt; };
    set('[data-info="pais"]', d.cidade ? paisDe(d.cidade) : "—");
    set('[data-info="dur"]', n ? plural(n, "dia", "dias") : "—");
    set('[data-etapa="2"]', etapasDe(d)[2]);
    const fim = root.querySelector('[data-k="fim"]');
    if(fim) fim.min = d.ini || hojeIso();
  }
  function atualizarTotais(){
    const d = S.wz.d;
    d.participantes.forEach((p, i) => { const el = root.querySelector(`[data-tot="${i}"]`); if(el) el.textContent = moeda(totalPart(p)); });
    const g = root.querySelector("[data-totg]");
    if(g) g.textContent = moeda(d.participantes.reduce((a, p) => a + totalPart(p), 0));
    const s = root.querySelector("[data-totp]");
    if(s) s.textContent = moeda(totalPatroc(d));
  }
  const errosCom = (e, prefixo) => Object.keys(e).filter(k => k.startsWith(prefixo)).map(k => e[k]);
  function celula(obj, e, ek, k, o = {}){
    return h("td", null, h("input", { class: "in" + (e[ek] ? " err" : ""), type: o.tipo || "text", value: obj[k], placeholder: o.placeholder,
      min: o.tipo === "number" ? 0 : null, step: o.tipo === "number" ? "0.01" : null, "aria-label": o.rotulo,
      oninput: ev => { obj[k] = ev.target.value; if(o.tipo === "number") atualizarTotais(); } }));
  }
  const FORMULARIOS = [
    (d, e) => h("div", { class: "grid2" },
      campo(d, e, "nome", "Nome do evento", { req: true, full: true, max: 120, placeholder: "Ex.: Seminário de Mobilidade Urbana" }),
      campo(d, e, "inst", "Instituição", { req: true, opcoes: INSTITUICOES }),
      campo(d, e, "cidade", "Cidade", { req: true, opcoes: Object.keys(CIDADES), nota: "a sede muda a etapa 3", aoMudar: atualizarDerivados }),
      campo(d, e, "ini", "Data de início", { req: true, tipo: "date", min: hojeIso(), aoMudar: atualizarDerivados }),
      campo(d, e, "fim", "Data de fim", { req: true, tipo: "date", min: d.ini || hojeIso(), aoMudar: atualizarDerivados }),
      info("País", "pais", d.cidade ? paisDe(d.cidade) : "—", "vem da cidade"),
      info("Duração", "dur", duracao(d.ini, d.fim) ? plural(duracao(d.ini, d.fim), "dia", "dias") : "—", "calculada pelas datas"),
      campo(d, e, "publico", "Público estimado", { tipo: "number", min: 0, placeholder: "nº de pessoas", full: true })),
    (d, e) => h("div", { class: "grid2" },
      h("div", { class: "full subt" }, "Coordenação"),
      campo(d.coord, e, "nome", "Responsável", { ek: "coord.nome", max: 120 }),
      campo(d.coord, e, "tel", "Telefone", { ek: "coord.tel", placeholder: "(00) 00000-0000", mascara: mascaraTel, inputmode: "tel" }),
      campo(d.coord, e, "email", "E-mail", { ek: "coord.email", full: true, tipo: "email", placeholder: "nome@exemplo.org" }),
      campo(d, e, "desc", "Descrição", { tipo: "textarea", full: true, max: 600, placeholder: "Sobre o que é o evento" }),
      h("div", { class: "full" }, h("label", { class: "l" }, "O evento oferece"),
        h("div", { class: "opts" }, OFERECE.map(([k, r]) => h("label", { class: "chk" },
          h("input", { type: "checkbox", checked: d.oferece[k], onchange: ev => { d.oferece[k] = ev.target.checked; } }), r))))),
    (d, e) => ehSede(d.cidade) ? etapaSede(d, e) : etapaParticipantes(d, e),
    (d, e) => h("div", { class: "grid2" },
      h("div", { class: "full subt" }, "Inscrições"),
      campo(d.insc, e, "limite", "Inscrições até", { ek: "insc.limite", tipo: "date" }),
      campo(d.insc, e, "vagas", "Vagas", { ek: "insc.vagas", tipo: "number", min: 0 }),
      campo(d.insc, e, "cond", "Condições", { ek: "insc.cond", max: 160, placeholder: "Ex.: gratuita, por ordem de inscrição" }),
      campo(d.insc, e, "link", "Link de inscrição", { ek: "insc.link", tipo: "url", placeholder: "https://" }),
      campo(d, e, "prog", "Programação", { tipo: "textarea", full: true, max: 1000, placeholder: "Dia 1 — abertura…" }),
      campo(d, e, "site", "Site do evento", { tipo: "url", full: true, placeholder: "https://" })),
  ];
  function etapaSede(d, e){
    const errosPat = errosCom(e, "s.");
    return h("div", null,
      h("div", { class: "alert info" }, "📍 Evento na cidade-sede: o contrato é obrigatório e não há lista de participantes."),
      h("div", { class: "grid2" },
        campo(d.contrato, e, "processo", "Nº do processo", { ek: "contrato.processo", req: true, placeholder: "0000/000000/2026" }),
        campo(d.contrato, e, "numero", "Nº do contrato", { ek: "contrato.numero", req: true, placeholder: "CT-000/2026" }),
        campo(d.contrato, e, "contratante", "Contratante", { ek: "contrato.contratante", req: true, max: 120 }),
        campo(d.contrato, e, "valor", "Valor do contrato (R$)", { ek: "contrato.valor", req: true, tipo: "number", min: 0, step: "0.01" })),
      h("div", { class: "subt", style: "margin-top:10px" }, "Patrocínios ", h("span", { class: "muted" }, "(opcional)")),
      d.patrocinios.length > 0 && h("table", { class: "pt" },
        h("thead", null, h("tr", null, h("th", null, "Patrocinador"), h("th", null, "Valor (R$)"), h("th"))),
        h("tbody", null, d.patrocinios.map((s, i) => h("tr", null,
          celula(s, e, `s.${i}.nome`, "nome", { rotulo: "Patrocinador", placeholder: "Nome" }),
          celula(s, e, `s.${i}.valor`, "valor", { rotulo: "Valor", tipo: "number" }),
          h("td", null, h("button", { class: "icon-btn", type: "button", title: "Remover", onclick: () => { d.patrocinios.splice(i, 1); renderCorpo(); } }, "✕"))))),
        h("tfoot", null, h("tr", null, h("td", null, "Total"), h("td", { "data-totp": true }, moeda(totalPatroc(d))), h("td")))),
      errosPat.length > 0 && h("div", { class: "alert err" }, errosPat.join(" · ")),
      h("button", { class: "b sm", type: "button", style: "margin-top:6px", onclick: () => { d.patrocinios.push({ nome: "", valor: "" }); renderCorpo(); } }, "＋ Patrocinador"));
  }
  function etapaParticipantes(d, e){
    const errosP = errosCom(e, "p.");
    return h("div", null,
      h("div", { class: "alert info" }, d.cidade ? "🌎 Evento fora da cidade-sede: informe quem vai e quanto custa. Contrato e patrocínio não se aplicam."
        : "Escolha a cidade na etapa 1. Na cidade-sede, esta etapa vira contrato e patrocínio."),
      d.participantes.length > 0 ? h("div", { class: "tbl" }, h("table", { class: "pt" },
        h("thead", null, h("tr", null, ["Nome", "Organização", "Passagem", "Hospedagem", "Transporte", "Alimentação", "Total", ""].map(t => h("th", null, t)))),
        h("tbody", null, d.participantes.map((p, i) => h("tr", null,
          celula(p, e, `p.${i}.nome`, "nome", { rotulo: "Nome", placeholder: "Nome" }),
          celula(p, e, `p.${i}.org`, "org", { rotulo: "Organização", placeholder: "Organização" }),
          CUSTOS.map(k => celula(p, e, `p.${i}.${k}`, k, { rotulo: k, tipo: "number", placeholder: "0" })),
          h("td", { class: "tot", "data-tot": i }, moeda(totalPart(p))),
          h("td", null, h("button", { class: "icon-btn", type: "button", title: "Remover", onclick: () => { d.participantes.splice(i, 1); renderCorpo(); } }, "✕"))))),
        h("tfoot", null, h("tr", null, h("td", { colspan: 6 }, "Total geral"), h("td", { class: "tot", "data-totg": true }, moeda(d.participantes.reduce((a, p) => a + totalPart(p), 0))), h("td")))))
        : h("div", { class: "vazio" }, "Nenhum participante ainda", h("small", null, "Os valores somam por pessoa e no total, na hora.")),
      errosP.length > 0 && h("div", { class: "alert err" }, errosP.join(" · ")),
      h("button", { class: "b sm", type: "button", style: "margin-top:6px", onclick: () => { d.participantes.push(participanteVazio()); renderCorpo(); } }, "＋ Participante"));
  }

  /* ---------- ADMINISTRAÇÃO (só ADMIN) ---------- */
  function telaAdmin(){
    const aba = (id, rotulo) => h("button", { class: "mx-tab" + (S.adminAba === id ? " on" : ""), type: "button", onclick: () => { S.adminAba = id; renderCorpo(); } }, rotulo);
    return h("div", null,
      h("div", { class: "mx-row" },
        h("div", { style: "flex:1;min-width:0" }, h("h4", null, "Administração"),
          h("div", { class: "muted" }, `${plural(S.usuarios.length, "usuário", "usuários")} · ${plural(S.logs.length, "acesso registrado", "acessos registrados")}`)),
        h("button", { class: "b pri", type: "button", onclick: () => modalUsuario(null) }, "＋ Novo usuário")),
      h("div", { class: "evtabs" }, aba("usuarios", "👥 Usuários"), aba("log", "📜 Log de acesso")),
      S.adminAba === "usuarios" ? tabelaUsuarios() : tabelaLog());
  }
  function tabelaUsuarios(){
    return h("div", { class: "tbl" }, h("table", null,
      h("thead", null, h("tr", null, ["Nome", "E-mail", "País", "Perfil", "Senha", ""].map(t => h("th", null, t)))),
      h("tbody", null, S.usuarios.map(u => {
        const eu = S.user && u.id === S.user.id;
        return h("tr", null,
          h("td", null, u.nome, eu && h("span", { class: "muted" }, " (você)")),
          h("td", { class: "mono" }, u.email),
          h("td", null, u.pais),
          h("td", null, h("span", { class: "pf " + u.perfil }, u.perfil)),
          h("td", null, u.trocar ? h("span", { class: "tag no" }, "⏳ troca pendente") : h("span", { class: "tag ok" }, "✓ definida")),
          h("td", { style: "white-space:nowrap" },
            h("button", { class: "icon-btn", type: "button", title: "Editar", onclick: () => modalUsuario(u) }, "✎"), " ",
            h("button", { class: "icon-btn", type: "button", title: eu ? "Você não pode excluir a própria conta" : "Excluir", disabled: eu,
              onclick: () => abrirModal({ tipo: "excluirUsuario", id: u.id }) }, "🗑")));
      }))));
  }
  function tabelaLog(){
    return h("div", { class: "tbl" }, h("table", null,
      h("thead", null, h("tr", null, ["Hora", "E-mail", "IP", "Navegador", "Status", "Motivo"].map(t => h("th", null, t)))),
      h("tbody", null, S.logs.map(l => h("tr", null,
        h("td", { class: "mono" }, (iso(l.t) === hojeIso() ? "" : dataBR(l.t).slice(0, 5) + " ") + hora(l.t)),
        h("td", { class: "mono" }, mascararEmail(l.email)),
        h("td", { class: "mono" }, l.ip),
        h("td", null, l.nav),
        h("td", null, l.ok ? h("span", { class: "tag ok" }, "SUCCESS") : h("span", { class: "tag no" }, "FAILED")),
        h("td", { class: "muted" }, l.motivo || "—"))))));
  }

  /* ---------- DIÁLOGOS ---------- */
  function abrirModal(m){
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
  const eventoDoModal = () => S.eventos.find(x => x.id === S.modal.id);

  function modalExcluir(){
    const ev = eventoDoModal();
    return janela("Excluir evento",
      h("div", null, h("p", null, "Tem certeza que deseja excluir ", h("b", null, ev.d.nome), "?"),
        h("p", { class: "muted", style: "margin-top:6px;font-size:12px" }, "A ficha e o evento saem juntos, inclusive do calendário.")),
      [h("button", { class: "b", type: "button", onclick: fecharModal }, "Cancelar"),
       h("button", { class: "b danger", type: "button", onclick: () => {
         S.eventos = S.eventos.filter(x => x.id !== ev.id);
         if(S.atual === ev.id) S.atual = null;
         S.tela = "eventos"; S.modal = null; render();
         toast("🗑 Evento deletado com sucesso!");
       } }, "Excluir")]);
  }
  function modalImprimir(){
    const ev = eventoDoModal();
    return janela("Imprimir — resumo do evento",
      h("div", null,
        h("div", { class: "psheet" },
          h("div", { class: "ph" }, h("span", null, "Ficha do evento", h("br"), h("small", null, "modelo fictício da emulação")), h("span", null, "Nº " + pad(ev.id, 4))),
          conteudoResumo(ev, veTudo(S.user))),
        h("div", { class: "pdfmeta" }, "A folha usa um CSS só de impressão: some o menu, ficam os dados.")),
      [h("button", { class: "b", type: "button", onclick: fecharModal }, "Fechar"),
       h("button", { class: "b pri", type: "button", onclick: imprimir }, "🖨 Imprimir")],
      true);
  }
  function modalUsuario(u){
    abrirModal({ tipo: "usuario", id: u ? u.id : null, erros: {},
      f: u ? { nome: u.nome, email: u.email, pais: u.pais, perfil: u.perfil, trocar: u.trocar } : { nome: "", email: "", pais: PAISES[0], perfil: "USER", trocar: true } });
  }
  function telaModalUsuario(){
    const m = S.modal, f = m.f, eu = m.id && S.user && m.id === S.user.id;
    const inp = (k, rotulo, tipo, ph) => h("div", { class: k === "nome" || k === "email" ? "full" : null },
      h("label", { class: "l" }, rotulo), h("input", { class: "in" + (m.erros[k] ? " err" : ""), type: tipo || "text", value: f[k], placeholder: ph, autocomplete: "off",
        oninput: e => { f[k] = e.target.value; } }), m.erros[k] && h("div", { class: "errmsg" }, m.erros[k]));
    const sel = (k, rotulo, opcoes, bloqueado) => {
      const s = h("select", { class: "in", disabled: bloqueado, onchange: e => { f[k] = e.target.value; } }, opcoes.map(([v, t]) => h("option", { value: v }, t)));
      s.value = f[k];
      return h("div", null, h("label", { class: "l" }, rotulo), s);
    };
    return janela(m.id ? "Editar usuário" : "Novo usuário",
      h("div", { class: "form2" },
        inp("nome", "Nome e sobrenome", "text", "Ex.: Ana Exemplo"),
        inp("email", "E-mail", "email", "nome@rede.exemplo"),
        sel("pais", "País", PAISES.map(p => [p, p])),
        sel("perfil", "Perfil", Object.keys(PERFIS).map(p => [p, `${p} — ${PERFIS[p]}`]), eu),
        eu && h("div", { class: "full muted", style: "font-size:11px;margin-top:4px" }, "Você não pode mudar o próprio perfil."),
        m.id ? h("label", { class: "chk full", style: "margin-top:8px" }, h("input", { type: "checkbox", checked: f.trocar, onchange: e => { f.trocar = e.target.checked; } }), "Exigir troca de senha no próximo login")
          : h("div", { class: "full alert warn" }, "🔑 O sistema gera uma senha temporária. No primeiro login, a pessoa troca.")),
      [h("button", { class: "b", type: "button", onclick: fecharModal }, "Cancelar"),
       h("button", { class: "b pri", type: "button", onclick: salvarUsuario }, m.id ? "💾 Salvar" : "＋ Criar usuário")]);
  }
  function salvarUsuario(){
    const m = S.modal, f = m.f, erros = {};
    const nome = erroNome(f.nome);
    if(nome) erros.nome = nome;
    const email = f.email.trim().toLowerCase();
    const formato = erroEmail(f.email, true);
    if(formato) erros.email = formato;
    else if(S.usuarios.some(u => u.email === email && u.id !== m.id)) erros.email = "E-mail já cadastrado.";
    if(Object.keys(erros).length){ m.erros = erros; return render(); }
    const dados = { nome: f.nome.trim().replace(/\s+/g, " "), email, pais: f.pais, perfil: f.perfil };
    if(m.id){
      Object.assign(S.usuarios.find(u => u.id === m.id), dados, { trocar: f.trocar });
      S.modal = null; render();
      return toast("✓ Usuário atualizado com sucesso");
    }
    const senha = "temp-" + hex(2);
    S.usuarios.push({ id: Math.max(...S.usuarios.map(u => u.id)) + 1, ...dados, senha, trocar: true });
    abrirModal({ tipo: "senhaTemp", nome: dados.nome, email, senha });
    toast("✓ Usuário criado com sucesso");
  }
  function modalSenhaTemp(){
    const m = S.modal;
    return janela("Usuário criado",
      h("div", null,
        h("p", null, h("b", null, m.nome), " já pode entrar com:"),
        h("div", { class: "cred" }, h("div", null, h("small", null, "E-mail"), m.email), h("div", null, h("small", null, "Senha temporária"), h("b", null, m.senha))),
        h("p", { class: "muted", style: "margin-top:6px;font-size:12px" }, "No primeiro login o sistema pede uma senha nova. Senha guardada só como hash BCrypt.")),
      [h("button", { class: "b", type: "button", onclick: fecharModal }, "Fechar"),
       h("button", { class: "b pri", type: "button", onclick: () => { sair(); S.login.email = m.email; S.login.senha = m.senha; renderCorpo(); toast("Login preenchido: clique em Entrar"); } },
         "Sair e testar o primeiro acesso")]);
  }
  function modalExcluirUsuario(){
    const u = S.usuarios.find(x => x.id === S.modal.id);
    return janela("Excluir usuário",
      h("p", null, "Excluir a conta de ", h("b", null, u.nome), "? Ela perde o acesso na hora."),
      [h("button", { class: "b", type: "button", onclick: fecharModal }, "Cancelar"),
       h("button", { class: "b danger", type: "button", onclick: () => {
         S.usuarios = S.usuarios.filter(x => x.id !== u.id);
         S.modal = null; render();
         toast("🗑 Usuário excluído com sucesso");
       } }, "Excluir")]);
  }

  const TELAS = { login: telaLogin, senha: telaSenha, painel: telaPainel, eventos: telaEventos, calendario: telaCalendario, resumo: telaResumo, nova: telaNova, admin: telaAdmin };
  const MODAIS = { excluir: modalExcluir, imprimir: modalImprimir, usuario: telaModalUsuario, senhaTemp: modalSenhaTemp, excluirUsuario: modalExcluirUsuario };

  /* ---------- presets dos "prints" ---------- */
  function entrouDemo(perfil){ S.user = S.usuarios.find(u => u.email === CONTA_DEMO[perfil]); }
  const PRESETS = {
    login(){ S.tela = "login"; S.login.email = CONTA_DEMO.EDITOR; S.login.senha = SENHA_DEMO; },
    painel(){ entrouDemo("ADMIN"); S.tela = "painel"; },
    ficha(){
      entrouDemo("EDITOR"); S.tela = "nova";
      S.wz = novoWizard(); S.wz.d = fichaExemplo(2, PLANO[1]); S.wz.etapa = 2;
    },
    calendario(){ entrouDemo("ADMIN"); S.tela = "calendario"; },
    resumo(){ entrouDemo("ADMIN"); S.tela = "resumo"; S.atual = 2; },
    admin(){ entrouDemo("ADMIN"); S.tela = "admin"; },
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
      if(alvo === "login"){ if(S.user) sair(); else ir("login"); return; }
      const precisa = { ficha: podeEditar, admin: ehAdmin }[alvo];
      if(!S.user || S.user.trocar || (precisa && !precisa(S.user))){
        limparTimers(); S.login.ocupado = false;
        entrouDemo("ADMIN");
        logAcesso(S.user.email, true, "atalho da página do projeto");
      }
      if(alvo === "ficha") return novaFicha();
      if(alvo === "resumo"){
        const hoje = hojeIso(), prox = S.eventos.filter(e => e.d.fim >= hoje).sort((a, b) => a.d.ini.localeCompare(b.d.ini));
        const alvoId = S.eventos.some(e => e.id === S.atual) ? S.atual : (prox[0] || S.eventos[0] || {}).id;
        if(alvoId) return verResumo(alvoId);
        return ir("eventos");
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
  const frases = ["organiza os eventos de uma rede de cidades", "ficha do evento em 4 etapas", "regra diferente para a cidade-sede",
                  "custos por participante, somados na hora", "calendário mensal dos eventos", "cada perfil vê só o que pode"];
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
