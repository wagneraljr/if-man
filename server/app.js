/* =============================================================================
   server.js — Servidor central do Quiz Pac-Man
   
   Responsabilidades:
     1. Servir arquivos estáticos
     2. Persistir questões em questoes.json
     3. Persistir senha em config.json (hash SHA-256)
     4. Gerenciar estado da competição em memória
     5. Expor API REST para polling dos clientes
   ============================================================================= */

const http   = require("http");
const fs     = require("fs");
const path   = require("path");
const crypto = require("crypto");

const PORTA          = 3000;
const ROOT_DIR       = path.join(__dirname, "..");
const DATA_DIR       = path.join(ROOT_DIR, "data");
const PUBLIC_DIR     = path.join(ROOT_DIR, "public");
const ARQUIVO_CONFIG = path.join(DATA_DIR, "config.json");
const ARQUIVO_QUEST  = path.join(DATA_DIR, "questoes.json");
const ARQUIVO_HIST   = path.join(DATA_DIR, "historico.json");
const ARQUIVO_ALUNOS = path.join(DATA_DIR, "alunos.json");
const ADMIN_COOKIE_NOME = "ifman_admin_session";
const ADMIN_SESSAO_MAX_AGE_SEG = 60 * 60 * 12; // 12 horas

const CATEGORIA_PADRAO = "Informática Básica";

function normalizarQuestao(questao = {}) {
    return {
        ...questao,
        categoria: (questao.categoria || "").trim() || CATEGORIA_PADRAO
    };
}

function normalizarListaQuestoes(questoes = []) {
    return questoes.map(normalizarQuestao);
}

// ── Questões padrão (usadas se questoes.json não existir) ─────────────────────

const QUESTOES_PADRAO = [
    {
        id: 1,
        categoria: CATEGORIA_PADRAO,
        texto: "Qual componente age como o 'cérebro' que pensa e resolve os problemas?",
        alternativas: [
            { texto: "CPU",     correta: true  },
            { texto: "RAM",     correta: false },
            { texto: "HD",      correta: false },
            { texto: "Monitor", correta: false }
        ]
    },
    {
        id: 2,
        categoria: CATEGORIA_PADRAO,
        texto: "Qual destes dispositivos é classificado APENAS como unidade de entrada?",
        alternativas: [
            { texto: "Teclado",      correta: true  },
            { texto: "Caixa de Som", correta: false },
            { texto: "Impressora",   correta: false },
            { texto: "Monitor",      correta: false }
        ]
    },
    {
        id: 3,
        categoria: CATEGORIA_PADRAO,
        texto: "Entre HD e SSD, qual é mais indicado para alta velocidade de inicialização?",
        alternativas: [
            { texto: "SSD",       correta: true  },
            { texto: "HD",        correta: false },
            { texto: "Pen Drive", correta: false },
            { texto: "CD-ROM",    correta: false }
        ]
    }
];

// ── Persistência em disco ─────────────────────────────────────────────────────

function lerJSON(arquivo, padrao) {
    try {
        return JSON.parse(fs.readFileSync(arquivo, "utf8"));
    } catch {
        return padrao;
    }
}

function salvarJSON(arquivo, dados) {
    fs.writeFileSync(arquivo, JSON.stringify(dados, null, 2), "utf8");
}

function hash(texto) {
    return crypto.createHash("sha256").update(texto).digest("hex");
}

function parseCookies(req) {
    const header = req.headers.cookie || "";
    const pares = header.split(";");
    const cookies = {};

    for (const par of pares) {
        const idx = par.indexOf("=");
        if (idx === -1) continue;
        const chave = par.slice(0, idx).trim();
        const valor = par.slice(idx + 1).trim();
        cookies[chave] = decodeURIComponent(valor);
    }

    return cookies;
}

function gerarTokenSessaoAdmin() {
    return crypto.randomBytes(32).toString("hex");
}

function definirCookieSessaoAdmin(res, token) {
    const cookie = `${ADMIN_COOKIE_NOME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${ADMIN_SESSAO_MAX_AGE_SEG}`;
    res.setHeader("Set-Cookie", cookie);
}

function limparCookieSessaoAdmin(res) {
    const cookie = `${ADMIN_COOKIE_NOME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
    res.setHeader("Set-Cookie", cookie);
}

function sanitizarAlunoAdmin(aluno) {
    return {
        id: aluno.id,
        nomeCompleto: aluno.nomeCompleto,
        apelido: aluno.apelido,
        criadoEm: aluno.criadoEm || null,
        atualizadoEm: aluno.atualizadoEm || null,
        totalHistorico: Array.isArray(aluno.historicoCompeticao) ? aluno.historicoCompeticao.length : 0
    };
}

function normalizarApelido(apelido = "") {
    return String(apelido).trim().toLowerCase();
}

function sanitizarAluno(aluno) {
    return {
        id: aluno.id,
        nomeCompleto: aluno.nomeCompleto,
        apelido: aluno.apelido
    };
}

function obterAlunoPorId(alunoId) {
    return alunos.find(aluno => aluno.id === alunoId) || null;
}

function obterAlunoPorApelido(apelido) {
    const apelidoNorm = normalizarApelido(apelido);
    return alunos.find(aluno => normalizarApelido(aluno.apelido) === apelidoNorm) || null;
}

// ── Carregamento inicial ───────────────────────────────────────────────────────

let config = lerJSON(ARQUIVO_CONFIG, { senhaHash: null });
let alunos = lerJSON(ARQUIVO_ALUNOS, []);
let sessoesAdmin = new Map();

if (!Array.isArray(alunos)) {
    alunos = [];
}

// Se não há senha configurada, define a padrão e salva
if (!config.senhaHash) {
    config.senhaHash = hash("ifmg2024");
    salvarJSON(ARQUIVO_CONFIG, config);
    console.log("  Senha padrão definida: ifmg2024");
    console.log("  Altere em: http://localhost:" + PORTA + "/setup.html");
}

// Se não há questões, cria o arquivo com as padrão
if (!fs.existsSync(ARQUIVO_QUEST)) {
    salvarJSON(ARQUIVO_QUEST, QUESTOES_PADRAO);
    console.log("  questoes.json criado com questões padrão.");
} else {
    const questoesPersistidas = lerJSON(ARQUIVO_QUEST, []);
    const normalizadas = normalizarListaQuestoes(questoesPersistidas);
    if (JSON.stringify(questoesPersistidas) !== JSON.stringify(normalizadas)) {
        salvarJSON(ARQUIVO_QUEST, normalizadas);
        console.log("  questoes.json normalizado com categorias.");
    }
}

if (!fs.existsSync(ARQUIVO_ALUNOS)) {
    salvarJSON(ARQUIVO_ALUNOS, alunos);
    console.log("  alunos.json criado.");
}


// ── Estado e utilitários da competição (memória) ─────────────────────────────

function criarEstadoInicial() {
    return {
        fase: "aguardando", // aguardando | rodando | encerrada | finalizada
        duracaoSeg: 600,
        inicioMs: null,
        categoria: "Todas",
        ocultarPontuacaoAlunos: false,
        alunos: {}, // ranking da rodada atual/última rodada encerrada
        espera: [],
        competicao: null,
        historicoSalvo: false
    };
}

let estado = criarEstadoInicial();

function montarRankingAtual() {
    return Object.values(estado.alunos)
        .map((d) => ({
            alunoId: d.alunoId,
            nome: d.nome,
            pontuacao: d.pontuacao,
            vidas: d.vidas
        }))
        .sort((a, b) => b.pontuacao - a.pontuacao);
}

function calcularRelatorioFinal(rodadas = []) {
    const melhorPontuacaoPorAluno = new Map();
    const mediasPorAluno = new Map();

    rodadas.forEach((rodada) => {
        (rodada.ranking || []).forEach((item) => {
            const atualMelhor = melhorPontuacaoPorAluno.get(item.alunoId);
            if (!atualMelhor || item.pontuacao > atualMelhor.pontuacao) {
                melhorPontuacaoPorAluno.set(item.alunoId, {
                    alunoId: item.alunoId,
                    nome: item.nome,
                    pontuacao: item.pontuacao,
                    rodada: rodada.numero
                });
            }

            const agg = mediasPorAluno.get(item.alunoId) || {
                alunoId: item.alunoId,
                nome: item.nome,
                soma: 0,
                rodadas: 0
            };

            agg.soma += item.pontuacao;
            agg.rodadas += 1;
            mediasPorAluno.set(item.alunoId, agg);
        });
    });

    const topPontuacoesUnicas = Array.from(melhorPontuacaoPorAluno.values())
        .sort((a, b) => b.pontuacao - a.pontuacao || a.rodada - b.rodada)
        .slice(0, 3);

    const topPontuacoesMedias = Array.from(mediasPorAluno.values())
        .map((item) => ({
            alunoId: item.alunoId,
            nome: item.nome,
            media: item.rodadas > 0 ? Number((item.soma / item.rodadas).toFixed(2)) : 0,
            rodadasParticipadas: item.rodadas
        }))
        .sort((a, b) => b.media - a.media || b.rodadasParticipadas - a.rodadasParticipadas)
        .slice(0, 3);

    return {
        topPontuacoesUnicas,
        topPontuacoesMedias
    };
}

function salvarHistoricoFinal(motivoFinal) {
    if (!estado.competicao || !estado.competicao.finalizada || estado.historicoSalvo) return;

    const ultimaRodada = estado.competicao.rodadas[estado.competicao.rodadas.length - 1] || null;
    const ranking = ultimaRodada?.ranking || [];
    if (ranking.length === 0) return;

    const historico = lerJSON(ARQUIVO_HIST, []);
    const agora     = new Date();

    const registro = {
        id: Date.now(),
        data: agora.toLocaleDateString("pt-BR"),
        hora: agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        duracaoSeg: estado.duracaoSeg,
        motivo: motivoFinal,
        participantes: ranking.length,
        totalRodadas: estado.competicao.totalRodadas,
        rodadas: (estado.competicao.rodadas || []).map((rodada) => ({
            numero: rodada.numero,
            motivo: rodada.motivo,
            inicioMs: rodada.inicioMs,
            fimMs: rodada.fimMs,
            ranking: rodada.ranking || []
        })),
        ranking,
        relatorioFinal: estado.competicao.relatorioFinal || null
    };

    historico.unshift(registro);
    if (historico.length > 50) historico.splice(50);
    salvarJSON(ARQUIVO_HIST, historico);

    ranking.forEach((item, idx) => {
        if (!item.alunoId) return;
        const aluno = obterAlunoPorId(item.alunoId);
        if (!aluno) return;

        if (!Array.isArray(aluno.historicoCompeticao)) {
            aluno.historicoCompeticao = [];
        }

        aluno.historicoCompeticao.unshift({
            competicaoId: registro.id,
            data: registro.data,
            hora: registro.hora,
            motivo: registro.motivo,
            duracaoSeg: registro.duracaoSeg,
            pontuacao: item.pontuacao,
            vidas: item.vidas,
            posicao: idx + 1,
            totalParticipantes: ranking.length,
            totalRodadas: registro.totalRodadas
        });

        if (aluno.historicoCompeticao.length > 100) {
            aluno.historicoCompeticao.splice(100);
        }
    });

    salvarJSON(ARQUIVO_ALUNOS, alunos);
    estado.historicoSalvo = true;
}

function iniciarRodada() {
    if (!estado.competicao) return false;

    if (estado.competicao.rodadaAtual >= estado.competicao.totalRodadas) return false;

    estado.competicao.rodadaAtual += 1;
    estado.fase = "rodando";
    estado.inicioMs = Date.now();
    estado.alunos = {};
    return true;
}

function encerrarRodada(motivo) {
    if (estado.fase !== "rodando" || !estado.competicao) return false;

    const ranking = montarRankingAtual();

    estado.competicao.rodadas.push({
        numero: estado.competicao.rodadaAtual,
        motivo,
        inicioMs: estado.inicioMs,
        fimMs: Date.now(),
        ranking
    });

    estado.inicioMs = null;

    if (estado.competicao.rodadaAtual >= estado.competicao.totalRodadas) {
        estado.fase = "finalizada";
        estado.competicao.finalizada = true;
        estado.competicao.motivoFinal = motivo;
        estado.competicao.relatorioFinal = calcularRelatorioFinal(estado.competicao.rodadas);
        salvarHistoricoFinal(motivo);
    } else {
        estado.fase = "encerrada";
    }

    return true;
}

// ── Utilitários HTTP ──────────────────────────────────────────────────────────

const TIPOS_MIME = {
    ".html": "text/html; charset=utf-8",
    ".css":  "text/css",
    ".js":   "application/javascript",
    ".json": "application/json",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".ico":  "image/x-icon"
};

function responderJSON(res, status, dados) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(dados));
}

function obterSessaoAdmin(req) {
    const cookies = parseCookies(req);
    const token = cookies[ADMIN_COOKIE_NOME];
    if (!token) return null;

    const sessao = sessoesAdmin.get(token);
    if (!sessao) return null;

    if (Date.now() > sessao.expiraEm) {
        sessoesAdmin.delete(token);
        return null;
    }

    return { token, sessao };
}

function exigirAdmin(req, res) {
    const encontrado = obterSessaoAdmin(req);
    if (!encontrado) {
        responderJSON(res, 401, { ok: false, erro: "Sessão do professor inválida ou expirada." });
        return null;
    }

    encontrado.sessao.expiraEm = Date.now() + ADMIN_SESSAO_MAX_AGE_SEG * 1000;
    return encontrado;
}

function lerCorpo(req) {
    return new Promise((resolve) => {
        let corpo = "";
        req.on("data", chunk => corpo += chunk);
        req.on("end", () => {
            try { resolve(JSON.parse(corpo)); }
            catch { resolve({}); }
        });
    });
}

// ── Roteador ──────────────────────────────────────────────────────────────────

const servidor = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

    const url    = req.url.split("?")[0];
    const metodo = req.method;

    // ══ AUTENTICAÇÃO ══════════════════════════════════════════════════════════

    // POST /api/login — valida senha do professor
    if (metodo === "POST" && url === "/api/login") {
        const corpo = await lerCorpo(req);
        const senhaEnviada = (corpo.senha || "").trim();
        if (hash(senhaEnviada) === config.senhaHash) {
            const token = gerarTokenSessaoAdmin();
            sessoesAdmin.set(token, {
                criadoEm: Date.now(),
                expiraEm: Date.now() + ADMIN_SESSAO_MAX_AGE_SEG * 1000
            });
            definirCookieSessaoAdmin(res, token);
            responderJSON(res, 200, { ok: true });
        } else {
            responderJSON(res, 401, { ok: false, erro: "Senha incorreta." });
        }
        return;
    }

    // POST /api/logout — encerra sessão do professor
    if (metodo === "POST" && url === "/api/logout") {
        const sessao = obterSessaoAdmin(req);
        if (sessao) {
            sessoesAdmin.delete(sessao.token);
        }
        limparCookieSessaoAdmin(res);
        responderJSON(res, 200, { ok: true });
        return;
    }

    // GET /api/admin/sessao — valida sessão administrativa ativa
    if (metodo === "GET" && url === "/api/admin/sessao") {
        const sessao = exigirAdmin(req, res);
        if (!sessao) return;
        definirCookieSessaoAdmin(res, sessao.token);
        responderJSON(res, 200, { ok: true });
        return;
    }

    // POST /api/alterar-senha — professor redefine a senha
    if (metodo === "POST" && url === "/api/alterar-senha") {
        const sessao = exigirAdmin(req, res);
        if (!sessao) return;
        definirCookieSessaoAdmin(res, sessao.token);

        const corpo = await lerCorpo(req);
        const senhaAtual = (corpo.senhaAtual || "").trim();
        const senhaNova  = (corpo.senhaNova  || "").trim();

        if (hash(senhaAtual) !== config.senhaHash) {
            responderJSON(res, 401, { ok: false, erro: "Senha atual incorreta." });
            return;
        }
        if (senhaNova.length < 4) {
            responderJSON(res, 400, { ok: false, erro: "A nova senha deve ter ao menos 4 caracteres." });
            return;
        }

        config.senhaHash = hash(senhaNova);
        salvarJSON(ARQUIVO_CONFIG, config);
        console.log(`[${new Date().toLocaleTimeString()}] Senha alterada.`);
        responderJSON(res, 200, { ok: true });
        return;
    }

    // ══ ALUNOS ═══════════════════════════════════════════════════════════════

    // POST /api/alunos/cadastro
    if (metodo === "POST" && url === "/api/alunos/cadastro") {
        const corpo = await lerCorpo(req);
        const nomeCompleto = (corpo.nomeCompleto || "").trim();
        const apelido = (corpo.apelido || "").trim();
        const senha = (corpo.senha || "").trim();
        const apelidoNorm = normalizarApelido(apelido);

        if (!nomeCompleto || !apelido || !senha) {
            responderJSON(res, 400, { ok: false, erro: "Preencha nome completo, apelido e senha." });
            return;
        }
        if (nomeCompleto.length < 3) {
            responderJSON(res, 400, { ok: false, erro: "O nome completo deve ter ao menos 3 caracteres." });
            return;
        }
        if (apelido.length < 2) {
            responderJSON(res, 400, { ok: false, erro: "O apelido deve ter ao menos 2 caracteres." });
            return;
        }
        if (senha.length < 4) {
            responderJSON(res, 400, { ok: false, erro: "A senha deve ter ao menos 4 caracteres." });
            return;
        }
        if (obterAlunoPorApelido(apelidoNorm)) {
            responderJSON(res, 409, { ok: false, erro: "Este apelido já está em uso." });
            return;
        }

        const agoraIso = new Date().toISOString();
        const novoAluno = {
            id: `aluno_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
            nomeCompleto,
            apelido,
            senhaHash: hash(senha),
            historicoCompeticao: [],
            criadoEm: agoraIso,
            atualizadoEm: agoraIso
        };

        alunos.push(novoAluno);
        salvarJSON(ARQUIVO_ALUNOS, alunos);
        responderJSON(res, 201, { ok: true, aluno: sanitizarAluno(novoAluno) });
        return;
    }

    // GET /api/alunos — lista alunos (uso administrativo)
    if (metodo === "GET" && url === "/api/alunos") {
        const sessao = exigirAdmin(req, res);
        if (!sessao) return;
        definirCookieSessaoAdmin(res, sessao.token);

        const lista = alunos
            .map(sanitizarAlunoAdmin)
            .sort((a, b) => (a.nomeCompleto || "").localeCompare(b.nomeCompleto || "", "pt-BR"));

        responderJSON(res, 200, { ok: true, alunos: lista });
        return;
    }

    // POST /api/alunos — cria aluno (uso administrativo)
    if (metodo === "POST" && url === "/api/alunos") {
        const sessao = exigirAdmin(req, res);
        if (!sessao) return;
        definirCookieSessaoAdmin(res, sessao.token);

        const corpo = await lerCorpo(req);
        const nomeCompleto = (corpo.nomeCompleto || "").trim();
        const apelido = (corpo.apelido || "").trim();
        const senha = (corpo.senha || "").trim();
        const apelidoNorm = normalizarApelido(apelido);

        if (!nomeCompleto || !apelido || !senha) {
            responderJSON(res, 400, { ok: false, erro: "Preencha nome completo, apelido e senha." });
            return;
        }
        if (nomeCompleto.length < 3) {
            responderJSON(res, 400, { ok: false, erro: "O nome completo deve ter ao menos 3 caracteres." });
            return;
        }
        if (apelido.length < 2) {
            responderJSON(res, 400, { ok: false, erro: "O apelido deve ter ao menos 2 caracteres." });
            return;
        }
        if (senha.length < 4) {
            responderJSON(res, 400, { ok: false, erro: "A senha deve ter ao menos 4 caracteres." });
            return;
        }
        if (obterAlunoPorApelido(apelidoNorm)) {
            responderJSON(res, 409, { ok: false, erro: "Este apelido já está em uso." });
            return;
        }

        const agoraIso = new Date().toISOString();
        const novoAluno = {
            id: `aluno_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
            nomeCompleto,
            apelido,
            senhaHash: hash(senha),
            historicoCompeticao: [],
            criadoEm: agoraIso,
            atualizadoEm: agoraIso
        };

        alunos.push(novoAluno);
        salvarJSON(ARQUIVO_ALUNOS, alunos);
        responderJSON(res, 201, { ok: true, aluno: sanitizarAlunoAdmin(novoAluno) });
        return;
    }

    // PUT /api/alunos/:id — atualiza aluno (uso administrativo)
    if (metodo === "PUT" && url.startsWith("/api/alunos/") && url.split("/").length === 4) {
        const sessao = exigirAdmin(req, res);
        if (!sessao) return;
        definirCookieSessaoAdmin(res, sessao.token);

        const alunoId = decodeURIComponent(url.split("/")[3]);
        const aluno = obterAlunoPorId(alunoId);
        if (!aluno) {
            responderJSON(res, 404, { ok: false, erro: "Aluno não encontrado." });
            return;
        }

        const corpo = await lerCorpo(req);
        const nomeCompleto = (corpo.nomeCompleto || "").trim();
        const apelido = (corpo.apelido || "").trim();
        const senhaNova = (corpo.senha || "").trim();

        if (!nomeCompleto || nomeCompleto.length < 3) {
            responderJSON(res, 400, { ok: false, erro: "Informe um nome completo válido." });
            return;
        }
        if (!apelido || apelido.length < 2) {
            responderJSON(res, 400, { ok: false, erro: "Informe um apelido válido." });
            return;
        }

        const conflito = alunos.find(a => a.id !== aluno.id && normalizarApelido(a.apelido) === normalizarApelido(apelido));
        if (conflito) {
            responderJSON(res, 409, { ok: false, erro: "Este apelido já está em uso por outro aluno." });
            return;
        }

        aluno.nomeCompleto = nomeCompleto;
        aluno.apelido = apelido;
        if (senhaNova) {
            if (senhaNova.length < 4) {
                responderJSON(res, 400, { ok: false, erro: "A nova senha deve ter ao menos 4 caracteres." });
                return;
            }
            aluno.senhaHash = hash(senhaNova);
        }
        aluno.atualizadoEm = new Date().toISOString();

        if (estado.alunos[aluno.id]) {
            estado.alunos[aluno.id].nome = aluno.apelido;
        }
        for (let i = 0; i < estado.espera.length; i++) {
            if (estado.espera[i].alunoId === aluno.id) {
                estado.espera[i].nome = aluno.apelido;
            }
        }

        salvarJSON(ARQUIVO_ALUNOS, alunos);
        responderJSON(res, 200, { ok: true, aluno: sanitizarAlunoAdmin(aluno) });
        return;
    }

    // DELETE /api/alunos/:id — exclui aluno (uso administrativo)
    if (metodo === "DELETE" && url.startsWith("/api/alunos/") && url.split("/").length === 4) {
        const sessao = exigirAdmin(req, res);
        if (!sessao) return;
        definirCookieSessaoAdmin(res, sessao.token);

        const alunoId = decodeURIComponent(url.split("/")[3]);
        const idx = alunos.findIndex(aluno => aluno.id === alunoId);
        if (idx === -1) {
            responderJSON(res, 404, { ok: false, erro: "Aluno não encontrado." });
            return;
        }

        const [removido] = alunos.splice(idx, 1);
        delete estado.alunos[alunoId];
        estado.espera = estado.espera.filter((item) => item.alunoId !== alunoId);

        salvarJSON(ARQUIVO_ALUNOS, alunos);
        responderJSON(res, 200, { ok: true, aluno: sanitizarAlunoAdmin(removido) });
        return;
    }

    // POST /api/alunos/login
    if (metodo === "POST" && url === "/api/alunos/login") {
        const corpo = await lerCorpo(req);
        const apelido = (corpo.apelido || "").trim();
        const senha = (corpo.senha || "").trim();

        const aluno = obterAlunoPorApelido(apelido);
        if (!aluno || aluno.senhaHash !== hash(senha)) {
            responderJSON(res, 401, { ok: false, erro: "Apelido ou senha inválidos." });
            return;
        }

        responderJSON(res, 200, { ok: true, aluno: sanitizarAluno(aluno) });
        return;
    }

    // GET /api/alunos/:id
    if (metodo === "GET" && url.startsWith("/api/alunos/") && url.split("/").length === 4) {
        const alunoId = decodeURIComponent(url.split("/")[3]);
        const aluno = obterAlunoPorId(alunoId);
        if (!aluno) {
            responderJSON(res, 404, { ok: false, erro: "Aluno não encontrado." });
            return;
        }

        responderJSON(res, 200, { ok: true, aluno: sanitizarAluno(aluno) });
        return;
    }

    // GET /api/alunos/:id/historico
    if (metodo === "GET" && url.startsWith("/api/alunos/") && url.endsWith("/historico")) {
        const partes = url.split("/");
        const alunoId = decodeURIComponent(partes[3] || "");
        const aluno = obterAlunoPorId(alunoId);
        if (!aluno) {
            responderJSON(res, 404, { ok: false, erro: "Aluno não encontrado." });
            return;
        }

        responderJSON(res, 200, { ok: true, historico: aluno.historicoCompeticao || [] });
        return;
    }

    // POST /api/alunos/atualizar-perfil
    if (metodo === "POST" && url === "/api/alunos/atualizar-perfil") {
        const corpo = await lerCorpo(req);
        const alunoId = (corpo.alunoId || "").trim();
        const nomeCompleto = (corpo.nomeCompleto || "").trim();
        const apelido = (corpo.apelido || "").trim();
        const senhaAtual = (corpo.senhaAtual || "").trim();
        const senhaNova = (corpo.senhaNova || "").trim();

        const aluno = obterAlunoPorId(alunoId);
        if (!aluno) {
            responderJSON(res, 404, { ok: false, erro: "Aluno não encontrado." });
            return;
        }
        if (hash(senhaAtual) !== aluno.senhaHash) {
            responderJSON(res, 401, { ok: false, erro: "Senha atual incorreta." });
            return;
        }
        if (!nomeCompleto || nomeCompleto.length < 3) {
            responderJSON(res, 400, { ok: false, erro: "Informe um nome completo válido." });
            return;
        }
        if (!apelido || apelido.length < 2) {
            responderJSON(res, 400, { ok: false, erro: "Informe um apelido válido." });
            return;
        }

        const conflito = alunos.find(a => a.id !== aluno.id && normalizarApelido(a.apelido) === normalizarApelido(apelido));
        if (conflito) {
            responderJSON(res, 409, { ok: false, erro: "Este apelido já está em uso por outro aluno." });
            return;
        }

        aluno.nomeCompleto = nomeCompleto;
        aluno.apelido = apelido;
        if (senhaNova) {
            if (senhaNova.length < 4) {
                responderJSON(res, 400, { ok: false, erro: "A nova senha deve ter ao menos 4 caracteres." });
                return;
            }
            aluno.senhaHash = hash(senhaNova);
        }
        aluno.atualizadoEm = new Date().toISOString();

        // Atualiza nome exibido no ranking em memória durante competição.
        if (estado.alunos[aluno.id]) {
            estado.alunos[aluno.id].nome = aluno.apelido;
        }

        salvarJSON(ARQUIVO_ALUNOS, alunos);
        responderJSON(res, 200, { ok: true, aluno: sanitizarAluno(aluno) });
        return;
    }

    // ══ QUESTÕES ══════════════════════════════════════════════════════════════

    // GET /api/questoes — retorna todas as questões
    if (metodo === "GET" && url === "/api/questoes") {
        const questoes = normalizarListaQuestoes(lerJSON(ARQUIVO_QUEST, []));
        responderJSON(res, 200, questoes);
        return;
    }

    // POST /api/questoes — adiciona nova questão
    if (metodo === "POST" && url === "/api/questoes") {
        const sessao = exigirAdmin(req, res);
        if (!sessao) return;
        definirCookieSessaoAdmin(res, sessao.token);

        const questoes = normalizarListaQuestoes(lerJSON(ARQUIVO_QUEST, []));
        const nova     = normalizarQuestao(await lerCorpo(req));
        const maiorId  = questoes.reduce((max, q) => Math.max(max, q.id || 0), 0);
        nova.id = maiorId + 1;
        questoes.push(nova);
        salvarJSON(ARQUIVO_QUEST, questoes);
        console.log(`[${new Date().toLocaleTimeString()}] Questão adicionada: "${nova.texto?.slice(0,40)}..."`);
        responderJSON(res, 201, nova);
        return;
    }

    // PUT /api/questoes/:id — atualiza questão existente
    if (metodo === "PUT" && url.startsWith("/api/questoes/")) {
        const sessao = exigirAdmin(req, res);
        if (!sessao) return;
        definirCookieSessaoAdmin(res, sessao.token);

        const id      = parseInt(url.split("/")[3]);
        const questoes = normalizarListaQuestoes(lerJSON(ARQUIVO_QUEST, []));
        const idx     = questoes.findIndex(q => q.id === id);
        if (idx === -1) { responderJSON(res, 404, { erro: "Questão não encontrada." }); return; }
        const atualizada = normalizarQuestao(await lerCorpo(req));
        atualizada.id    = id;
        questoes[idx]    = atualizada;
        salvarJSON(ARQUIVO_QUEST, questoes);
        responderJSON(res, 200, atualizada);
        return;
    }

    // DELETE /api/questoes/:id — remove questão
    if (metodo === "DELETE" && url.startsWith("/api/questoes/")) {
        const sessao = exigirAdmin(req, res);
        if (!sessao) return;
        definirCookieSessaoAdmin(res, sessao.token);

        const id       = parseInt(url.split("/")[3]);
        let questoes   = normalizarListaQuestoes(lerJSON(ARQUIVO_QUEST, []));
        const tamanhoAntes = questoes.length;
        questoes = questoes.filter(q => q.id !== id);
        if (questoes.length === tamanhoAntes) { responderJSON(res, 404, { erro: "Questão não encontrada." }); return; }
        salvarJSON(ARQUIVO_QUEST, questoes);
        console.log(`[${new Date().toLocaleTimeString()}] Questão ${id} removida.`);
        responderJSON(res, 200, { ok: true });
        return;
    }

    // ══ COMPETIÇÃO ════════════════════════════════════════════════════════════

    // GET /api/estado
    if (metodo === "GET" && url === "/api/estado") {
        const agora     = Date.now();
        const decorrido = estado.inicioMs ? Math.floor((agora - estado.inicioMs) / 1000) : 0;
        const restante  = estado.fase === "rodando"
            ? Math.max(0, estado.duracaoSeg - decorrido)
            : 0;
        if (estado.fase === "rodando" && restante === 0) {
            encerrarRodada("tempo");
        }

        const rodadaAtual = estado.competicao?.rodadaAtual || 0;
        const totalRodadas = estado.competicao?.totalRodadas || 0;
        const rodadasConcluidas = estado.competicao?.rodadas?.length || 0;
        const temProximaRodada = !!estado.competicao && rodadaAtual < totalRodadas;

        responderJSON(res, 200, {
            fase: estado.fase,
            restante,
            duracao: estado.duracaoSeg,
            categoria: estado.categoria || "Todas",
            ocultarPontuacaoAlunos: !!estado.ocultarPontuacaoAlunos,
            rodadaAtual,
            totalRodadas,
            rodadasConcluidas,
            temProximaRodada
        });
        return;
    }

    // POST /api/iniciar
    if (metodo === "POST" && url === "/api/iniciar") {
        const sessao = exigirAdmin(req, res);
        if (!sessao) return;
        definirCookieSessaoAdmin(res, sessao.token);

        const corpo = await lerCorpo(req);
        if (estado.fase === "rodando") {
            responderJSON(res, 409, { ok: false, erro: "Já existe uma rodada em andamento." });
            return;
        }

        if (!estado.competicao || estado.fase === "aguardando") {
            const totalRodadas = Math.max(1, parseInt(corpo.totalRodadas) || 1);
            estado.duracaoSeg = Math.max(60, parseInt(corpo.duracaoSeg) || 600);
            estado.categoria = (corpo.categoria || "Todas").trim() || "Todas";
            estado.ocultarPontuacaoAlunos = !!corpo.ocultarPontuacaoAlunos;
            estado.competicao = {
                totalRodadas,
                rodadaAtual: 0,
                rodadas: [],
                finalizada: false,
                motivoFinal: null,
                relatorioFinal: null
            };
            estado.historicoSalvo = false;
            estado.espera = [];
        } else if (estado.fase !== "encerrada") {
            responderJSON(res, 409, { ok: false, erro: "Não é possível iniciar rodada neste momento." });
            return;
        }

        if (!iniciarRodada()) {
            responderJSON(res, 409, { ok: false, erro: "Todas as rodadas já foram concluídas." });
            return;
        }

        console.log(
            `[${new Date().toLocaleTimeString()}] Rodada ${estado.competicao.rodadaAtual}/${estado.competicao.totalRodadas} iniciada — ${estado.duracaoSeg}s | categoria: ${estado.categoria}`
        );
        responderJSON(res, 200, {
            ok: true,
            rodadaAtual: estado.competicao.rodadaAtual,
            totalRodadas: estado.competicao.totalRodadas
        });
        return;
    }

    // POST /api/encerrar
    if (metodo === "POST" && url === "/api/encerrar") {
        const sessao = exigirAdmin(req, res);
        if (!sessao) return;
        definirCookieSessaoAdmin(res, sessao.token);

        if (estado.fase !== "rodando") {
            responderJSON(res, 400, { ok: false, erro: "Não há rodada em andamento para encerrar." });
            return;
        }

        encerrarRodada("manual");
        console.log(`[${new Date().toLocaleTimeString()}] Rodada encerrada pelo professor`);
        responderJSON(res, 200, {
            ok: true,
            fase: estado.fase,
            rodadaAtual: estado.competicao?.rodadaAtual || 0,
            totalRodadas: estado.competicao?.totalRodadas || 0,
            temProximaRodada: !!estado.competicao && estado.competicao.rodadaAtual < estado.competicao.totalRodadas
        });
        return;
    }

    // POST /api/resetar
    if (metodo === "POST" && url === "/api/resetar") {
        const sessao = exigirAdmin(req, res);
        if (!sessao) return;
        definirCookieSessaoAdmin(res, sessao.token);

        if (estado.fase === "finalizada") {
            salvarHistoricoFinal(estado.competicao?.motivoFinal || "manual");
        }
        estado = criarEstadoInicial();
        console.log(`[${new Date().toLocaleTimeString()}] Estado resetado`);
        responderJSON(res, 200, { ok: true });
        return;
    }

    // POST /api/pontuacao
    if (metodo === "POST" && url === "/api/pontuacao") {
        const corpo = await lerCorpo(req);
        const alunoId = (corpo.alunoId || "").trim();
        const aluno = obterAlunoPorId(alunoId);

        if (!aluno) {
            responderJSON(res, 401, { ok: false, erro: "Aluno não autenticado para competição." });
            return;
        }

        if (estado.fase === "rodando") {
            estado.alunos[aluno.id] = {
                alunoId: aluno.id,
                nome: aluno.apelido,
                pontuacao: corpo.pontuacao || 0,
                vidas:     corpo.vidas     || 0,
                ultimaAtualizacao: Date.now()
            };
        }
        responderJSON(res, 200, { ok: true });
        return;
    }

    // POST /api/pontuacao-final
    if (metodo === "POST" && url === "/api/pontuacao-final") {
        const corpo = await lerCorpo(req);
        const alunoId = (corpo.alunoId || "").trim();
        const aluno = obterAlunoPorId(alunoId);

        if (!aluno) {
            responderJSON(res, 401, { ok: false, erro: "Aluno não autenticado para competição." });
            return;
        }

        if (estado.fase === "rodando" || estado.fase === "encerrada") {
            const atual = estado.alunos[aluno.id];
            if (!atual || corpo.pontuacao >= atual.pontuacao) {
                estado.alunos[aluno.id] = {
                    alunoId: aluno.id,
                    nome: aluno.apelido,
                    pontuacao: corpo.pontuacao || 0,
                    vidas:     corpo.vidas     || 0,
                    ultimaAtualizacao: Date.now()
                };
            }
        }
        responderJSON(res, 200, { ok: true });
        return;
    }

    // GET /api/placar
    if (metodo === "GET" && url === "/api/placar") {
        const ranking = montarRankingAtual();
        responderJSON(res, 200, {
            fase: estado.fase,
            ranking,
            rodadaAtual: estado.competicao?.rodadaAtual || 0,
            totalRodadas: estado.competicao?.totalRodadas || 0,
            rodadasConcluidas: estado.competicao?.rodadas?.length || 0,
            temProximaRodada: !!estado.competicao && estado.competicao.rodadaAtual < estado.competicao.totalRodadas,
            relatorioFinal: estado.competicao?.relatorioFinal || null
        });
        return;
    }

    // GET /api/resultado-aluno?alunoId=X
    if (metodo === "GET" && url.startsWith("/api/resultado-aluno")) {
        const params    = new URLSearchParams(req.url.split("?")[1] || "");
        const alunoId   = (params.get("alunoId") || "").trim();
        const ranking   = montarRankingAtual();
        const posicao   = ranking.findIndex(a => a.alunoId === alunoId) + 1;
        const meusDados = estado.alunos[alunoId] || { pontuacao: 0, vidas: 0, nome: "Aluno" };
        const ocultarPontuacaoAlunos =
            !!estado.ocultarPontuacaoAlunos && (estado.fase === "encerrada" || estado.fase === "finalizada");
        responderJSON(res, 200, {
            fase: estado.fase,
            ocultarPontuacaoAlunos,
            rodadaAtual: estado.competicao?.rodadaAtual || 0,
            totalRodadas: estado.competicao?.totalRodadas || 0,
            posicao: posicao || null,
            total: ranking.length,
            nome: meusDados.nome,
            pontuacao: meusDados.pontuacao,
            vidas: meusDados.vidas,
            top3: ocultarPontuacaoAlunos
                ? ranking.slice(0, 3).map((a) => ({ nome: a.nome }))
                : ranking.slice(0, 3),
            ranking: ocultarPontuacaoAlunos
                ? []
                : ranking
        });
        return;
    }

    // POST /api/entrar-sala
    if (metodo === "POST" && url === "/api/entrar-sala") {
        const corpo = await lerCorpo(req);
        const alunoId = (corpo.alunoId || "").trim();
        const aluno = obterAlunoPorId(alunoId);

        if (!aluno) {
            responderJSON(res, 401, { ok: false, erro: "Aluno não autenticado para entrar na competição." });
            return;
        }

        if (aluno) {
            const idx = estado.espera.findIndex(a => a.alunoId === aluno.id);
            if (idx !== -1) {
                estado.espera[idx].entradaMs = Date.now();
            } else {
                estado.espera.push({ alunoId: aluno.id, nome: aluno.apelido, entradaMs: Date.now() });
                console.log(`[${new Date().toLocaleTimeString()}] Aluno na sala: ${aluno.apelido} (total: ${estado.espera.length})`);
            }
        }
        responderJSON(res, 200, { ok: true, total: estado.espera.length });
        return;
    }

    // GET /api/sala
    if (metodo === "GET" && url === "/api/sala") {
        const agora = Date.now();
        estado.espera = estado.espera.filter(a => agora - a.entradaMs < 300000);
        responderJSON(res, 200, { alunos: estado.espera });
        return;
    }


    // ══ HISTÓRICO ════════════════════════════════════════════════════════════

    // GET /api/historico — lista todas as competições (resumo sem ranking completo)
    if (metodo === "GET" && url === "/api/historico") {
        const sessao = exigirAdmin(req, res);
        if (!sessao) return;
        definirCookieSessaoAdmin(res, sessao.token);

        const historico = lerJSON(ARQUIVO_HIST, []);
        const resumo = historico.map(({ id, data, hora, duracaoSeg, motivo, participantes, ranking, totalRodadas, rodadas }) => ({
            id, data, hora, duracaoSeg, motivo, participantes,
            totalRodadas: totalRodadas || (Array.isArray(rodadas) ? rodadas.length : 1),
            top3: (ranking || []).slice(0, 3)
        }));
        responderJSON(res, 200, resumo);
        return;
    }

    // GET /api/historico/:id — detalhes completos de uma competição
    if (metodo === "GET" && url.startsWith("/api/historico/") && url.split("/").length === 4) {
        const sessao = exigirAdmin(req, res);
        if (!sessao) return;
        definirCookieSessaoAdmin(res, sessao.token);

        const id        = parseInt(url.split("/")[3]);
        const historico = lerJSON(ARQUIVO_HIST, []);
        const comp      = historico.find(h => h.id === id);
        if (!comp) { responderJSON(res, 404, { erro: "Competição não encontrada." }); return; }
        responderJSON(res, 200, comp);
        return;
    }

    // DELETE /api/historico/:id — remove uma competição do histórico
    if (metodo === "DELETE" && url.startsWith("/api/historico/")) {
        const sessao = exigirAdmin(req, res);
        if (!sessao) return;
        definirCookieSessaoAdmin(res, sessao.token);

        const id  = parseInt(url.split("/")[3]);
        let hist  = lerJSON(ARQUIVO_HIST, []);
        hist      = hist.filter(h => h.id !== id);
        salvarJSON(ARQUIVO_HIST, hist);
        console.log(`[${new Date().toLocaleTimeString()}] Histórico ${id} removido.`);
        responderJSON(res, 200, { ok: true });
        return;
    }

    // ══ ARQUIVOS ESTÁTICOS ════════════════════════════════════════════════════

    let caminhoArquivo = url === "/" ? "/index.html" : url;
    const arquivoFull  = path.normalize(path.join(PUBLIC_DIR, caminhoArquivo));

    if (!arquivoFull.startsWith(PUBLIC_DIR)) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("Acesso negado");
        return;
    }

    const extensao     = path.extname(arquivoFull);

    fs.readFile(arquivoFull, (erro, dados) => {
        if (erro) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Arquivo não encontrado: " + caminhoArquivo);
            return;
        }
        res.writeHead(200, { "Content-Type": TIPOS_MIME[extensao] || "application/octet-stream" });
        res.end(dados);
    });
});

servidor.listen(PORTA, "0.0.0.0", () => {
    console.log("=".repeat(52));
    console.log("  Quiz Pac-Man — Servidor rodando");
    console.log(`  Local:   http://localhost:${PORTA}`);
    console.log(`  Rede:    http://SEU_IP:${PORTA}`);
    console.log("=".repeat(52));
    console.log("  Para descobrir seu IP no Windows: ipconfig");
    console.log("  Para descobrir seu IP no Linux:   hostname -I");
    console.log("=".repeat(52));
});