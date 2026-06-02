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

function verificarDerrota() {
    if (vidas <= 0) {
        // Para os monstros imediatamente antes de exibir game over
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
}

// ── Tela de espera desenhada sobre o canvas ───────────────────────────────────
function desenharTelaEspera() {
    // Overlay escuro semi-transparente
    contexto.fillStyle = "rgba(0, 0, 10, 0.75)";
    contexto.fillRect(0, 0, canvas.width, canvas.height);

    // Caixa central no estilo IF
    let bw = 440, bh = 120;
    let bx = (canvas.width  - bw) / 2;
    let by = (canvas.height - bh) / 2;

    // Sombra da caixa
    contexto.fillStyle = "rgba(0,0,0,0.4)";
    contexto.beginPath();
    contexto.roundRect(bx + 4, by + 4, bw, bh, 8);
    contexto.fill();

    // Fundo da caixa — branco institucional
    contexto.fillStyle = "#ffffff";
    contexto.beginPath();
    contexto.roundRect(bx, by, bw, bh, 8);
    contexto.fill();

    // Faixa verde no topo da caixa (identidade IF)
    contexto.fillStyle = "#2F9E41";
    contexto.beginPath();
    contexto.roundRect(bx, by, bw, 36, [8, 8, 0, 0]);
    contexto.fill();

    // Título na faixa verde
    contexto.fillStyle = "#ffffff";
    contexto.font = "bold 15px 'Open Sans', sans-serif";
    contexto.textAlign = "center";
    contexto.textBaseline = "middle";
    contexto.shadowBlur = 0;
    contexto.fillText("Leia a pergunta com atenção", canvas.width / 2, by + 18);

    // Subtexto no corpo branco
    contexto.fillStyle = "#2D3436";
    contexto.font = "13px 'Open Sans', sans-serif";
    contexto.fillText("Clique em  ▶ Iniciar Rodada  quando estiver pronto", canvas.width / 2, by + 72);

    // Linha decorativa verde IF na base da caixa
    contexto.strokeStyle = "#2F9E41";
    contexto.lineWidth = 3;
    contexto.beginPath();
    contexto.moveTo(bx + 8, by + bh - 1);
    contexto.lineTo(bx + bw - 8, by + bh - 1);
    contexto.stroke();
}


// ── Tela de erro desenhada sobre o canvas ─────────────────────────────────────
function desenharTelaErro(titulo, subtitulo) {
    contexto.clearRect(0, 0, canvas.width, canvas.height);

    // Fundo escuro
    contexto.fillStyle = "#000010";
    contexto.fillRect(0, 0, canvas.width, canvas.height);

    // Caixa central
    let bw = 500, bh = 150;
    let bx = (canvas.width  - bw) / 2;
    let by = (canvas.height - bh) / 2;

    // Sombra
    contexto.fillStyle = "rgba(0,0,0,0.4)";
    contexto.beginPath();
    contexto.roundRect(bx + 4, by + 4, bw, bh, 8);
    contexto.fill();

    // Fundo branco
    contexto.fillStyle = "#ffffff";
    contexto.beginPath();
    contexto.roundRect(bx, by, bw, bh, 8);
    contexto.fill();

    // Faixa vermelha no topo
    contexto.fillStyle = "#CD191E";
    contexto.beginPath();
    contexto.roundRect(bx, by, bw, 40, [8, 8, 0, 0]);
    contexto.fill();

    // Título na faixa vermelha
    contexto.fillStyle = "#ffffff";
    contexto.font = "bold 15px 'Open Sans', sans-serif";
    contexto.textAlign = "center";
    contexto.textBaseline = "middle";
    contexto.shadowBlur = 0;
    contexto.fillText(titulo, canvas.width / 2, by + 20);

    // Subtítulo no corpo branco
    contexto.fillStyle = "#2D3436";
    contexto.font = "13px 'Open Sans', sans-serif";
    contexto.fillText(subtitulo, canvas.width / 2, by + 80);

    // Linha decorativa vermelha na base
    contexto.strokeStyle = "#CD191E";
    contexto.lineWidth = 3;
    contexto.beginPath();
    contexto.moveTo(bx + 8, by + bh - 1);
    contexto.lineTo(bx + bw - 8, by + bh - 1);
    contexto.stroke();
}

// ── Controle de pausa/início ──────────────────────────────────────────────────
function pausarRodada() {
    jogoAtivo = false;
    if (intervaloMonstros) {
        clearInterval(intervaloMonstros);
        intervaloMonstros = null;
    }
    window.removeEventListener("keydown", moverJogador);
    document.getElementById("btn-iniciar").classList.remove("oculto");
}

// Chamada pelo onclick do botão no HTML
function iniciarRodada() {
    if (jogoAtivo) return;
    jogoAtivo = true;
    document.getElementById("btn-iniciar").classList.add("oculto");
    // Redesenha sem o overlay
    atualizarTela();
    window.addEventListener("keydown", moverJogador);
    intervaloMonstros = setInterval(tickMonstros, velocidadeAtual);
}


// Wrapper do intervalo: respeita o estado de colisão
function tickMonstros() {
    moverMonstros();
    // Só redesenha se não houver feedback/colisão em andamento
    if (!emColisao) {
        atualizarTela();
    }
}


// Chamada pelo quiz.js após cada resposta correta
function aumentarVelocidade() {
    velocidadeAtual = Math.max(VELOCIDADE_MINIMA, velocidadeAtual - REDUCAO_POR_ACERTO);
    atualizarIndicadorVelocidade();
}

// Reseta a velocidade ao reiniciar o jogo (game over ou fim de todas as questões)
function resetarVelocidade() {
    velocidadeAtual = VELOCIDADE_INICIAL;
    atualizarIndicadorVelocidade();
}

// Atualiza o indicador visual de velocidade no HUD
function atualizarIndicadorVelocidade() {
    const el = document.getElementById("indicador-velocidade");
    if (!el) return;

    // Calcula nível de 1 a 5 baseado na velocidade atual
    const range  = VELOCIDADE_INICIAL - VELOCIDADE_MINIMA;
    const progresso = (VELOCIDADE_INICIAL - velocidadeAtual) / range; // 0.0 a 1.0
    const nivel  = Math.floor(progresso * 4) + 1; // 1 a 5

    const nomes  = ["", "Fácil", "Médio", "Rápido", "Difícil", "Máximo"];
    const cores  = ["", "#2F9E41", "#E67E22", "#E67E22", "#CD191E", "#CD191E"];

    el.innerText  = `⚡ ${nomes[nivel]}`;
    el.style.color       = cores[nivel];
    el.style.borderColor = cores[nivel] + "88";
}

// ── Fluxo de inicialização ────────────────────────────────────────────────────
function iniciarJogo() {
    carregarBancoDeQuestoes();
}

// Chamada pelo quiz.js após o JSON carregar
function prepararRodadaInicial() {
    sortearMapaDaRodada();
    carregarPergunta();
    atualizarPlacar();
    atualizarIndicadorVelocidade();
    atualizarTela();
    desenharTelaEspera();
}

// Chamada pelo quiz.js a cada nova pergunta (acerto ou erro com vidas restantes)
function prepararNovaRodada() {
    sortearMapaDaRodada();
    carregarPergunta();
    jogador.coluna = 9;
    jogador.linha  = 5;
    resetarMonstros();
    atualizarTela();
    desenharTelaEspera();
    pausarRodada();
}

window.onload = iniciarJogo;