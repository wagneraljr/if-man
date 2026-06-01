const canvas = document.getElementById("telaJogo");
const contexto = canvas.getContext("2d");

let pontuacao = 0;
let vidas = 3;
let jogoAtivo = false;        // controla se monstros/teclado estão ativos
let intervaloMonstros = null;

function atualizarPlacar() {
    document.getElementById("pontos").innerText = pontuacao;
    let coracoes = "";
    for (let i = 0; i < vidas; i++) coracoes += "❤ ";
    document.getElementById("vidas").innerText = coracoes.trim() || "☠";
}

function verificarDerrota() {
    if (vidas <= 0) {
        // Exibe tela de game over no canvas por 2s antes de resetar
        desenharTelaErro(
            "Fim de Jogo!",
            `Suas vidas acabaram. Pontuação final: ${pontuacao} pontos.`
        );

        setTimeout(() => {
            pontuacao = 0;
            vidas = 3;
            indicePerguntaAtual = 0;

            atualizarPlacar();
            pausarRodada();
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
    intervaloMonstros = setInterval(moverMonstros, 600);
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
    atualizarTela();
    desenharTelaEspera();   // mostra overlay de espera
    // botão já visível por padrão no HTML
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