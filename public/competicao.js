/* =============================================================================
   competicao.js — Módulo de estado da competição (cliente)
   ============================================================================= */

const NOME_ALUNO = sessionStorage.getItem("aluno_nome") || "Anônimo";

let intervaloPolling   = null;
let intervaloEnvio     = null;
let competicaoAtiva    = false;
let callbackEncerrar   = null;
let falhasConsecutivas = 0;
const MAX_FALHAS       = 3; // após 3 falhas (~6s) exibe aviso de conexão

// ── Polling do estado ─────────────────────────────────────────────────────────

function iniciarPolling(onEncerrar) {
    callbackEncerrar = onEncerrar;

    intervaloPolling = setInterval(async () => {
        try {
            const res   = await fetch("/api/estado");
            const dados = await res.json();

            // Conexão restaurada
            if (falhasConsecutivas > 0) {
                falhasConsecutivas = 0;
                definirEstadoConexao("ok");
            }

            atualizarTimerVisual(dados.restante);

            if (dados.fase === "encerrada" && competicaoAtiva) {
                competicaoAtiva = false;
                pararPolling();
                if (callbackEncerrar) callbackEncerrar();
            }

            if (dados.fase === "rodando") competicaoAtiva = true;

        } catch {
            falhasConsecutivas++;
            if (falhasConsecutivas >= MAX_FALHAS) {
                definirEstadoConexao("erro");
            }
        }
    }, 2000);
}

function pararPolling() {
    if (intervaloPolling) { clearInterval(intervaloPolling); intervaloPolling = null; }
    if (intervaloEnvio)   { clearInterval(intervaloEnvio);   intervaloEnvio   = null; }
}

// ── Envio de pontuação ────────────────────────────────────────────────────────

function iniciarEnvioPontuacao(getPontuacao, getVidas) {
    const enviar = async () => {
        try {
            await fetch("/api/pontuacao", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    nome:      NOME_ALUNO,
                    pontuacao: getPontuacao(),
                    vidas:     getVidas()
                })
            });
        } catch { /* silencioso — o polling já cuida do aviso */ }
    };
    enviar();
    intervaloEnvio = setInterval(enviar, 3000);
}

// ── Timer visual ──────────────────────────────────────────────────────────────

function atualizarTimerVisual(segundosRestantes) {
    const wrapper = document.getElementById("timer-competicao");
    const texto   = document.getElementById("timer-texto");
    if (!wrapper || !texto) return;

    const min = Math.floor(segundosRestantes / 60).toString().padStart(2, "0");
    const seg = (segundosRestantes % 60).toString().padStart(2, "0");
    texto.innerText = `⏱ ${min}:${seg}`;

    wrapper.classList.toggle("timer-urgente",   segundosRestantes <= 30 && segundosRestantes > 0);
    wrapper.classList.toggle("timer-encerrado", segundosRestantes === 0);
    wrapper.classList.remove("timer-sem-conexao");
}

// ── Estado de conexão ─────────────────────────────────────────────────────────

function definirEstadoConexao(estado) {
    const wrapper = document.getElementById("timer-competicao");
    const texto   = document.getElementById("timer-texto");
    if (!wrapper || !texto) return;

    if (estado === "erro") {
        wrapper.classList.add("timer-sem-conexao");
        wrapper.classList.remove("timer-urgente", "timer-encerrado");
        texto.innerText = "⚠ Sem conexão";
    } else {
        wrapper.classList.remove("timer-sem-conexao");
    }
}