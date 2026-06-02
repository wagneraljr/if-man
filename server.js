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
const ARQUIVO_CONFIG = path.join(__dirname, "config.json");
const ARQUIVO_QUEST  = path.join(__dirname, "questoes.json");
const ARQUIVO_HIST   = path.join(__dirname, "historico.json");

// ── Questões padrão (usadas se questoes.json não existir) ─────────────────────

const QUESTOES_PADRAO = [
    {
        id: 1,
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

// ── Carregamento inicial ───────────────────────────────────────────────────────

let config = lerJSON(ARQUIVO_CONFIG, { senhaHash: null });

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
}


// ── Salva snapshot da competição encerrada no histórico ───────────────────────

function salvarHistorico(motivo) {
    if (!estado.inicioMs) return; // competição nunca iniciou

    const ranking = Object.entries(estado.alunos)
        .map(([nome, d]) => ({ nome, pontuacao: d.pontuacao, vidas: d.vidas }))
        .sort((a, b) => b.pontuacao - a.pontuacao);

    if (ranking.length === 0) return; // ninguém jogou

    const historico = lerJSON(ARQUIVO_HIST, []);
    const agora     = new Date();

    historico.unshift({
        id:           Date.now(),
        data:         agora.toLocaleDateString("pt-BR"),
        hora:         agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        duracaoSeg:   estado.duracaoSeg,
        motivo,       // "tempo" | "manual"
        participantes: ranking.length,
        ranking
    });

    // Mantém no máximo 50 competições no histórico
    if (historico.length > 50) historico.splice(50);

    salvarJSON(ARQUIVO_HIST, historico);
    console.log(`[${new Date().toLocaleTimeString()}] Histórico salvo (${ranking.length} participantes)`);
}

// ── Estado da competição (memória) ────────────────────────────────────────────

let estado = {
    fase:       "aguardando",
    duracaoSeg: 600,
    inicioMs:   null,
    alunos:     {},
    espera:     []
};

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
            responderJSON(res, 200, { ok: true });
        } else {
            responderJSON(res, 401, { ok: false, erro: "Senha incorreta." });
        }
        return;
    }

    // POST /api/alterar-senha — professor redefine a senha
    if (metodo === "POST" && url === "/api/alterar-senha") {
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

    // ══ QUESTÕES ══════════════════════════════════════════════════════════════

    // GET /api/questoes — retorna todas as questões
    if (metodo === "GET" && url === "/api/questoes") {
        const questoes = lerJSON(ARQUIVO_QUEST, []);
        responderJSON(res, 200, questoes);
        return;
    }

    // POST /api/questoes — adiciona nova questão
    if (metodo === "POST" && url === "/api/questoes") {
        const questoes = lerJSON(ARQUIVO_QUEST, []);
        const nova     = await lerCorpo(req);
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
        const id      = parseInt(url.split("/")[3]);
        const questoes = lerJSON(ARQUIVO_QUEST, []);
        const idx     = questoes.findIndex(q => q.id === id);
        if (idx === -1) { responderJSON(res, 404, { erro: "Questão não encontrada." }); return; }
        const atualizada = await lerCorpo(req);
        atualizada.id    = id;
        questoes[idx]    = atualizada;
        salvarJSON(ARQUIVO_QUEST, questoes);
        responderJSON(res, 200, atualizada);
        return;
    }

    // DELETE /api/questoes/:id — remove questão
    if (metodo === "DELETE" && url.startsWith("/api/questoes/")) {
        const id       = parseInt(url.split("/")[3]);
        let questoes   = lerJSON(ARQUIVO_QUEST, []);
        const tamanhoAntes = questoes.length;
        questoes = questoes.filter(q => q.id !== id);
        if (questoes.length === tamanhoAntes) { responderJSON(res, 404, { erro: "Questão não encontrada." }); return; }
        salvarJSON(ARQUIVO_QUEST, questoes);
        console.log(`[${new Date().toLocaleTimeString()}] Questão ${id} removida.`);
        responderJSON(res, 200, { ok: true });
        return;
    }

    // POST /api/questoes/restaurar — volta às questões padrão
    if (metodo === "POST" && url === "/api/questoes/restaurar") {
        salvarJSON(ARQUIVO_QUEST, QUESTOES_PADRAO);
        console.log(`[${new Date().toLocaleTimeString()}] Questões restauradas ao padrão.`);
        responderJSON(res, 200, { ok: true });
        return;
    }

    // ══ COMPETIÇÃO ════════════════════════════════════════════════════════════

    // GET /api/estado
    if (metodo === "GET" && url === "/api/estado") {
        const agora     = Date.now();
        const decorrido = estado.inicioMs ? Math.floor((agora - estado.inicioMs) / 1000) : 0;
        const restante  = Math.max(0, estado.duracaoSeg - decorrido);
        if (estado.fase === "rodando" && restante === 0) {
            estado.fase = "encerrada";
            salvarHistorico("tempo");
        }
        responderJSON(res, 200, { fase: estado.fase, restante, duracao: estado.duracaoSeg });
        return;
    }

    // POST /api/iniciar
    if (metodo === "POST" && url === "/api/iniciar") {
        const corpo = await lerCorpo(req);
        estado.fase       = "rodando";
        estado.duracaoSeg = parseInt(corpo.duracaoSeg) || 600;
        estado.inicioMs   = Date.now();
        estado.alunos     = {};
        console.log(`[${new Date().toLocaleTimeString()}] Competição iniciada — ${estado.duracaoSeg}s`);
        responderJSON(res, 200, { ok: true });
        return;
    }

    // POST /api/encerrar
    if (metodo === "POST" && url === "/api/encerrar") {
        salvarHistorico("manual");
        estado.fase = "encerrada";
        console.log(`[${new Date().toLocaleTimeString()}] Competição encerrada pelo professor`);
        responderJSON(res, 200, { ok: true });
        return;
    }

    // POST /api/resetar
    if (metodo === "POST" && url === "/api/resetar") {
        if (estado.fase === "encerrada") salvarHistorico("manual"); // garante salvamento se não havia sido salvo
        estado = { fase: "aguardando", duracaoSeg: 600, inicioMs: null, alunos: {}, espera: [] };
        console.log(`[${new Date().toLocaleTimeString()}] Estado resetado`);
        responderJSON(res, 200, { ok: true });
        return;
    }

    // POST /api/pontuacao
    if (metodo === "POST" && url === "/api/pontuacao") {
        const corpo = await lerCorpo(req);
        const nome  = (corpo.nome || "").trim();
        if (nome && estado.fase === "rodando") {
            estado.alunos[nome] = {
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
        const nome  = (corpo.nome || "").trim();
        if (nome && (estado.fase === "rodando" || estado.fase === "encerrada")) {
            const atual = estado.alunos[nome];
            if (!atual || corpo.pontuacao >= atual.pontuacao) {
                estado.alunos[nome] = {
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
        const ranking = Object.entries(estado.alunos)
            .map(([nome, d]) => ({ nome, ...d }))
            .sort((a, b) => b.pontuacao - a.pontuacao);
        responderJSON(res, 200, { fase: estado.fase, ranking });
        return;
    }

    // GET /api/resultado-aluno?nome=X
    if (metodo === "GET" && url.startsWith("/api/resultado-aluno")) {
        const params    = new URLSearchParams(req.url.split("?")[1] || "");
        const nome      = (params.get("nome") || "").trim();
        const ranking   = Object.entries(estado.alunos)
            .map(([n, d]) => ({ nome: n, ...d }))
            .sort((a, b) => b.pontuacao - a.pontuacao);
        const posicao   = ranking.findIndex(a => a.nome === nome) + 1;
        const meusDados = estado.alunos[nome] || { pontuacao: 0, vidas: 0 };
        responderJSON(res, 200, {
            fase: estado.fase,
            posicao: posicao || null,
            total: ranking.length,
            pontuacao: meusDados.pontuacao,
            vidas: meusDados.vidas,
            top3: ranking.slice(0, 3),
            ranking
        });
        return;
    }

    // POST /api/entrar-sala
    if (metodo === "POST" && url === "/api/entrar-sala") {
        const corpo = await lerCorpo(req);
        const nome  = (corpo.nome || "").trim();
        if (nome) {
            const idx = estado.espera.findIndex(a => a.nome === nome);
            if (idx !== -1) {
                estado.espera[idx].entradaMs = Date.now();
            } else {
                estado.espera.push({ nome, entradaMs: Date.now() });
                console.log(`[${new Date().toLocaleTimeString()}] Aluno na sala: ${nome} (total: ${estado.espera.length})`);
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

    // ══ ARQUIVOS ESTÁTICOS ════════════════════════════════════════════════════

    let caminhoArquivo = url === "/" ? "/index.html" : url;
    const arquivoFull  = path.join(__dirname, caminhoArquivo);
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
    console.log("  Quiz IF-Man — Servidor rodando");
    console.log(`  Local:   http://localhost:${PORTA}`);
    console.log(`  Rede:    http://SEU_IP:${PORTA}`);
    console.log("=".repeat(52));
    console.log("  Para descobrir seu IP no Windows: ipconfig");
    console.log("  Para descobrir seu IP no Linux:   hostname -I");
    console.log("=".repeat(52));
});