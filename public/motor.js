const canvas = document.getElementById("telaJogo");
const contexto = canvas.getContext("2d");

let pontuacao = 0;
let vidas = 3;
let jogoAtivo = false;        // controla se monstros/teclado estão ativos
let intervaloMonstros = null;

// ── Velocidade crescente dos fantasmas ───────────────────────────────────────
const VELOCIDADE_INICIAL = 600;  // ms — intervalo inicial (mais lento)
const VELOCIDADE_MINIMA  = 220;  // ms — teto máximo de velocidade
const REDUCAO_POR_ACERTO = 40;   // ms reduzidos a cada questão correta
let   velocidadeAtual    = VELOCIDADE_INICIAL;

// ── Movimento contínuo ───────────────────────────────────────────────────────
// O jogador continua se movendo na última direção pressionada.
// A tecla pressionada é armazenada e aplicada a cada tick do loop.
let direcaoAtual    = null; // "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight"
let direcaoPendente = null; // próxima direção (fila de 1 input)
let intervaloMovimento = null;
const INTERVALO_MOVIMENTO_MS = 150; // ms entre cada passo do jogador

const TECLAS_MOVIMENTO = new Set([
    "ArrowUp","ArrowDown","ArrowLeft","ArrowRight",
    "w","W","s","S","a","A","d","D"
]);

function normalizarTecla(tecla) {
    const mapa = { w:"ArrowUp", W:"ArrowUp", s:"ArrowDown", S:"ArrowDown",
                   a:"ArrowLeft", A:"ArrowLeft", d:"ArrowRight", D:"ArrowRight" };
    return mapa[tecla] || tecla;
}

// Chamado pelo keydown — armazena direção pendente
function registrarDirecao(evento) {
    if (!jogoAtivo || vidas <= 0 || emColisao) return;
    const tecla = evento.key;
    if (!TECLAS_MOVIMENTO.has(tecla)) return;
    evento.preventDefault();
    direcaoPendente = normalizarTecla(tecla);
}

// Tenta aplicar a direção pendente; se não couber, mantém a atual
function tentarMoverJogador() {
    if (!jogoAtivo || vidas <= 0 || emColisao) return;
    if (typeof feedbackAtivo !== "undefined" && feedbackAtivo) return;

    // Tenta direção pendente primeiro
    if (direcaoPendente) {
        const moveu = aplicarMovimento(direcaoPendente);
        if (moveu) {
            direcaoAtual    = direcaoPendente;
            direcaoPendente = null;
            return;
        }
    }

    // Mantém direção atual
    if (direcaoAtual) {
        aplicarMovimento(direcaoAtual);
    }
}

// Executa um passo na direção indicada; retorna true se moveu
function aplicarMovimento(tecla) {
    let proximaColuna = jogador.coluna;
    let proximaLinha  = jogador.linha;

    if      (tecla === "ArrowUp")    { proximaLinha--;  jogador.direcao = "up";    }
    else if (tecla === "ArrowDown")  { proximaLinha++;  jogador.direcao = "down";  }
    else if (tecla === "ArrowLeft")  { proximaColuna--; jogador.direcao = "left";  }
    else if (tecla === "ArrowRight") { proximaColuna++; jogador.direcao = "right"; }
    else return false;

    const cel = labirinto[proximaLinha]?.[proximaColuna];
    if (cel === undefined || cel === 1 || cel === 5 || cel === 6) {
        // Restaura direção visual (sem mover)
        return false;
    }

    jogador.coluna = proximaColuna;
    jogador.linha  = proximaLinha;

    const item = labirinto[jogador.linha][jogador.coluna];
    if (item === 2) {
        labirinto[jogador.linha][jogador.coluna] = 0;
        pontuacao += 50;
        pontinhosColecionados++;
        atualizarPlacar();
        tocarSom("pontinho");
    } else if (item === 3) {
        labirinto[jogador.linha][jogador.coluna] = 0;
        pontuacao += 200;
        pontinhosColecionados += 4;
        atualizarPlacar();
        ativarPoder();
        tocarSom("poder");
    }

    const respondeuQuestao = verificarColisaoComResposta();
    if (!respondeuQuestao) {
        verificarColisaoComMonstro();
        atualizarTela();
    }

    return true;
}

// ── Sons sintéticos (Web Audio API) ─────────────────────────────────────────
// Não usa arquivos externos. Gera sons proceduralmente.
let audioCtx = null;

function obterAudioCtx() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch {
            return null;
        }
    }
    // Retoma se suspenso (política de autoplay do navegador)
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
}

function tocarSom(tipo) {
    const ctx = obterAudioCtx();
    if (!ctx) return;

    const agora = ctx.currentTime;

    switch (tipo) {
        case "pontinho": {
            // Bipe curto e agudo
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = "square";
            osc.frequency.setValueAtTime(880, agora);
            osc.frequency.exponentialRampToValueAtTime(440, agora + 0.06);
            gain.gain.setValueAtTime(0.08, agora);
            gain.gain.exponentialRampToValueAtTime(0.001, agora + 0.07);
            osc.start(agora); osc.stop(agora + 0.07);
            break;
        }
        case "poder": {
            // Glissando ascendente
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(200, agora);
            osc.frequency.exponentialRampToValueAtTime(800, agora + 0.3);
            gain.gain.setValueAtTime(0.12, agora);
            gain.gain.exponentialRampToValueAtTime(0.001, agora + 0.35);
            osc.start(agora); osc.stop(agora + 0.35);
            break;
        }
        case "acerto": {
            // Dois bipes ascendentes — recompensa
            [0, 0.12].forEach((offset, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.type = "triangle";
                osc.frequency.setValueAtTime(i === 0 ? 523 : 784, agora + offset);
                gain.gain.setValueAtTime(0.15, agora + offset);
                gain.gain.exponentialRampToValueAtTime(0.001, agora + offset + 0.1);
                osc.start(agora + offset); osc.stop(agora + offset + 0.1);
            });
            break;
        }
        case "erro": {
            // Tom grave descendente — penalidade
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(300, agora);
            osc.frequency.exponentialRampToValueAtTime(80, agora + 0.35);
            gain.gain.setValueAtTime(0.18, agora);
            gain.gain.exponentialRampToValueAtTime(0.001, agora + 0.38);
            osc.start(agora); osc.stop(agora + 0.38);
            break;
        }
        case "captura": {
            // Queda rápida — capturado por fantasma
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = "square";
            osc.frequency.setValueAtTime(400, agora);
            osc.frequency.exponentialRampToValueAtTime(50, agora + 0.5);
            gain.gain.setValueAtTime(0.2, agora);
            gain.gain.exponentialRampToValueAtTime(0.001, agora + 0.52);
            osc.start(agora); osc.stop(agora + 0.52);
            break;
        }
        case "comer-fantasma": {
            // Bipe invertido — comeu um fantasma
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.setValueAtTime(150, agora);
            osc.frequency.exponentialRampToValueAtTime(600, agora + 0.15);
            gain.gain.setValueAtTime(0.2, agora);
            gain.gain.exponentialRampToValueAtTime(0.001, agora + 0.18);
            osc.start(agora); osc.stop(agora + 0.18);
            break;
        }
    }
}

// ── Placar e HUD ─────────────────────────────────────────────────────────────

function atualizarPlacar() {
    document.getElementById("pontos").innerText = pontuacao;
    let coracoes = "";
    for (let i = 0; i < vidas; i++) coracoes += "❤ ";
    document.getElementById("vidas").innerText = coracoes.trim() || "☠";
}

function atualizarCombo(consecutivos) {
    const el = document.getElementById("indicador-combo");
    if (!el) return;

    const wrapper = document.getElementById("hud-combo");

    if (consecutivos <= 1) {
        el.innerText = "";
        el.classList.remove("combo-ativo");
        if (wrapper) wrapper.style.display = "none";
        return;
    }

    const mult = consecutivos >= 4 ? "×3"
               : consecutivos === 3 ? "×2"
               : "×1.5";

    el.innerText = `🔥 COMBO ${mult}`;
    el.classList.add("combo-ativo");
    if (wrapper) wrapper.style.display = "flex";
}

function feedbackEstaAtivo() {
    return typeof feedbackAtivo !== "undefined" && feedbackAtivo;
}

function verificarDerrota() {
    if (vidas <= 0) {
        pausarRodada();
        desenharTelaErro(
            "Fim de Jogo!",
            `Suas vidas acabaram. Pontuação final: ${pontuacao} pontos.`
        );

        setTimeout(() => {
            pontuacao = 0;
            vidas = 3;
            indicePerguntaAtual = 0;

            resetarVelocidade();
            acertosConsecutivos = 0;
            atualizarPlacar();
            atualizarCombo(0);
            sortearMapaDaRodada();
            carregarPergunta();
            jogador.coluna = 9;
            jogador.linha  = 5;
            resetarMonstros();
            atualizarTela();
            desenharTelaEspera();
        }, 2500);
    }
}

function atualizarTela() {
    contexto.clearRect(0, 0, canvas.width, canvas.height);
    desenharMapa(contexto);
    desenharAlternativas(contexto);
    desenharJogador(contexto);
    desenharMonstros(contexto);
    if (typeof redesenharFeedbackAtivo === "function") {
        redesenharFeedbackAtivo();
    }
}

// ── Tela de espera ────────────────────────────────────────────────────────────
function desenharTelaEspera() {
    contexto.fillStyle = "rgba(0, 0, 10, 0.75)";
    contexto.fillRect(0, 0, canvas.width, canvas.height);

    let bw = 440, bh = 120;
    let bx = (canvas.width  - bw) / 2;
    let by = (canvas.height - bh) / 2;

    contexto.fillStyle = "rgba(0,0,0,0.4)";
    contexto.beginPath();
    contexto.roundRect(bx + 4, by + 4, bw, bh, 8);
    contexto.fill();

    contexto.fillStyle = "#ffffff";
    contexto.beginPath();
    contexto.roundRect(bx, by, bw, bh, 8);
    contexto.fill();

    contexto.fillStyle = "#2F9E41";
    contexto.beginPath();
    contexto.roundRect(bx, by, bw, 36, [8, 8, 0, 0]);
    contexto.fill();

    contexto.fillStyle = "#ffffff";
    contexto.font = "bold 15px 'Open Sans', sans-serif";
    contexto.textAlign = "center";
    contexto.textBaseline = "middle";
    contexto.shadowBlur = 0;
    contexto.fillText("Leia a pergunta com atenção", canvas.width / 2, by + 18);

    contexto.fillStyle = "#2D3436";
    contexto.font = "13px 'Open Sans', sans-serif";
    contexto.fillText("Clique em  ▶ Iniciar Rodada  quando estiver pronto", canvas.width / 2, by + 72);

    contexto.strokeStyle = "#2F9E41";
    contexto.lineWidth = 3;
    contexto.beginPath();
    contexto.moveTo(bx + 8, by + bh - 1);
    contexto.lineTo(bx + bw - 8, by + bh - 1);
    contexto.stroke();
}

// ── Tela de erro ──────────────────────────────────────────────────────────────
function desenharTelaErro(titulo, subtitulo) {
    contexto.clearRect(0, 0, canvas.width, canvas.height);

    contexto.fillStyle = "#000010";
    contexto.fillRect(0, 0, canvas.width, canvas.height);

    let bw = 500, bh = 150;
    let bx = (canvas.width  - bw) / 2;
    let by = (canvas.height - bh) / 2;

    contexto.fillStyle = "rgba(0,0,0,0.4)";
    contexto.beginPath();
    contexto.roundRect(bx + 4, by + 4, bw, bh, 8);
    contexto.fill();

    contexto.fillStyle = "#ffffff";
    contexto.beginPath();
    contexto.roundRect(bx, by, bw, bh, 8);
    contexto.fill();

    contexto.fillStyle = "#CD191E";
    contexto.beginPath();
    contexto.roundRect(bx, by, bw, 40, [8, 8, 0, 0]);
    contexto.fill();

    contexto.fillStyle = "#ffffff";
    contexto.font = "bold 15px 'Open Sans', sans-serif";
    contexto.textAlign = "center";
    contexto.textBaseline = "middle";
    contexto.shadowBlur = 0;
    contexto.fillText(titulo, canvas.width / 2, by + 20);

    contexto.fillStyle = "#2D3436";
    contexto.font = "13px 'Open Sans', sans-serif";
    contexto.fillText(subtitulo, canvas.width / 2, by + 80);

    contexto.strokeStyle = "#CD191E";
    contexto.lineWidth = 3;
    contexto.beginPath();
    contexto.moveTo(bx + 8, by + bh - 1);
    contexto.lineTo(bx + bw - 8, by + bh - 1);
    contexto.stroke();
}

// ── Controle de pausa/início ──────────────────────────────────────────────────
function pausarRodada(exibirBotaoIniciar = true) {
    jogoAtivo = false;
    direcaoAtual    = null;
    direcaoPendente = null;
    if (intervaloMonstros) {
        clearInterval(intervaloMonstros);
        intervaloMonstros = null;
    }
    if (intervaloMovimento) {
        clearInterval(intervaloMovimento);
        intervaloMovimento = null;
    }
    window.removeEventListener("keydown", registrarDirecao);
    const botaoIniciar = document.getElementById("btn-iniciar");
    if (!botaoIniciar) return;

    if (exibirBotaoIniciar) {
        botaoIniciar.classList.remove("oculto");
    } else {
        botaoIniciar.classList.add("oculto");
    }
}

// Chamada pelo onclick do botão no HTML
function iniciarRodada() {
    if (jogoAtivo) return;
    if (vidas <= 0) return;
    if (feedbackEstaAtivo()) return;

    // Retoma o AudioContext (necessário após gesto do usuário)
    obterAudioCtx();

    jogoAtivo = true;
    document.getElementById("btn-iniciar").classList.add("oculto");
    atualizarTela();

    window.addEventListener("keydown", registrarDirecao);

    // Loop de movimento contínuo do jogador
    intervaloMovimento = setInterval(() => {
        if (!jogoAtivo || vidas <= 0 || feedbackEstaAtivo() || emColisao) return;
        tentarMoverJogador();
    }, INTERVALO_MOVIMENTO_MS);

    intervaloMonstros = setInterval(tickMonstros, velocidadeAtual);
}

// Wrapper do intervalo dos monstros
function tickMonstros() {
    if (!jogoAtivo || vidas <= 0 || feedbackEstaAtivo()) return;
    moverMonstros();
    if (!emColisao) {
        atualizarTela();
    }
}

// Chamada pelo quiz.js após cada resposta correta
function aumentarVelocidade() {
    velocidadeAtual = Math.max(VELOCIDADE_MINIMA, velocidadeAtual - REDUCAO_POR_ACERTO);
    atualizarIndicadorVelocidade();
}

function resetarVelocidade() {
    velocidadeAtual = VELOCIDADE_INICIAL;
    atualizarIndicadorVelocidade();
}

function atualizarIndicadorVelocidade() {
    const el = document.getElementById("indicador-velocidade");
    if (!el) return;

    const range    = VELOCIDADE_INICIAL - VELOCIDADE_MINIMA;
    const progresso = (VELOCIDADE_INICIAL - velocidadeAtual) / range;
    const nivel    = Math.floor(progresso * 4) + 1;

    const nomes = ["", "Fácil", "Médio", "Rápido", "Difícil", "Máximo"];
    const cores = ["", "#2F9E41", "#E67E22", "#E67E22", "#CD191E", "#CD191E"];

    el.innerText         = `⚡ ${nomes[nivel]}`;
    el.style.color       = cores[nivel];
    el.style.borderColor = cores[nivel] + "88";
}

// ── Fluxo de inicialização ────────────────────────────────────────────────────
function iniciarJogo() {
    carregarBancoDeQuestoes();
}

function prepararRodadaInicial() {
    sortearMapaDaRodada();
    carregarPergunta();
    atualizarPlacar();
    atualizarIndicadorVelocidade();
    atualizarTela();
    desenharTelaEspera();
}

function prepararNovaRodada() {
    jogoAtivo = false;
    direcaoAtual    = null;
    direcaoPendente = null;
    if (intervaloMonstros) {
        clearInterval(intervaloMonstros);
        intervaloMonstros = null;
    }
    if (intervaloMovimento) {
        clearInterval(intervaloMovimento);
        intervaloMovimento = null;
    }
    window.removeEventListener("keydown", registrarDirecao);

    sortearMapaDaRodada();
    carregarPergunta();
    jogador.coluna = 9;
    jogador.linha  = 5;
    resetarMonstros();

    atualizarTela();
    desenharTelaEspera();

    document.getElementById("btn-iniciar").classList.remove("oculto");
}

window.onload = iniciarJogo;