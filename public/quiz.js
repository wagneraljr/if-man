let bancoDeQuestoes     = [];
let indicePerguntaAtual = 0;
let acertosConsecutivos = 0;
let acaoAposFeedback    = null;
let feedbackAtivo       = false;
let feedbackVisualAtual = null;

function obterBotaoFeedbackHtml() {
    return document.getElementById("btn-feedback-canvas");
}

function embaralharBancoQuestoes() {
    for (let i = bancoDeQuestoes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bancoDeQuestoes[i], bancoDeQuestoes[j]] = [bancoDeQuestoes[j], bancoDeQuestoes[i]];
    }
}

function atualizarFeedbackCanvasClick() {
    const botaoFeedback = obterBotaoFeedbackHtml();
    if (botaoFeedback && botaoFeedback.dataset.feedbackClickBind !== "1") {
        botaoFeedback.addEventListener("click", confirmarFeedbackVisual);
        botaoFeedback.dataset.feedbackClickBind = "1";
    }

    const corpo = document.body;
    if (corpo && corpo.dataset.feedbackKeyBind !== "1") {
        window.addEventListener("keydown", (event) => {
            if (!feedbackAtivo) return;
            if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
                event.preventDefault();
                confirmarFeedbackVisual();
            }
        });
        corpo.dataset.feedbackKeyBind = "1";
    }
}

atualizarFeedbackCanvasClick();

function obterCategoriaRodada() {
    const modo = sessionStorage.getItem("modo") || "livre";
    if (modo === "competicao") {
        return sessionStorage.getItem("categoria_competicao") || "Todas";
    }
    return sessionStorage.getItem("categoria_modo_livre") || "Todas";
}

async function carregarBancoDeQuestoes() {
    try {
        const todasQuestoes = await obterQuestoes();
        bancoDeQuestoes = filtrarQuestoesPorCategoria(todasQuestoes, obterCategoriaRodada());
    } catch {
        desenharTelaErro(
            "Erro ao carregar questões",
            "Verifique se o servidor está rodando e recarregue a página."
        );
        return;
    }

    if (bancoDeQuestoes.length === 0) {
        desenharTelaErro(
            "Nenhuma questão disponível",
            "Não há questões nessa categoria. Volte e escolha outra categoria ou cadastre mais perguntas."
        );
        return;
    }

    embaralharBancoQuestoes();
    prepararRodadaInicial();
}

function carregarPergunta() {
    document.getElementById("pergunta").innerText = bancoDeQuestoes[indicePerguntaAtual].texto;
}

// ─── DESENHO DAS SALAS 3×2 ───────────────────────────────────────────────────

function desenharAlternativas(ctx) {
    let alternativas = bancoDeQuestoes[indicePerguntaAtual].alternativas;
    let bs = tamanhoBloco;
    let sw = LARGURA_SALA * bs;
    let sh = ALTURA_SALA  * bs;

    for (let i = 0; i < alternativas.length; i++) {
        let alt = alternativas[i];
        let pos = posicoesRespostasAtuais[i];
        let x = pos.coluna * bs;
        let y = pos.linha  * bs;

        ctx.save();
        ctx.shadowColor = "rgba(0,200,50,0.4)";
        ctx.shadowBlur = 6;
        let grad = ctx.createLinearGradient(x, y, x, y + sh);
        grad.addColorStop(0, "#14532d");
        grad.addColorStop(1, "#052e16");
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, sw, sh);

        ctx.strokeStyle = "#00e040";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, sw - 2, sh - 2);

        ctx.fillStyle = "rgba(100,255,120,0.08)";
        ctx.fillRect(x + 2, y + 2, sw - 4, sh * 0.3);
        ctx.restore();

        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.font = `${bs * 0.37}px 'Courier New', monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        let maxW = sw - 10;
        let linhas = quebrarTexto(ctx, alt.texto, maxW);
        let alturaLinha = bs * 0.4;
        let totalAltura = linhas.length * alturaLinha;
        let startY = y + (sh - totalAltura) / 2 + alturaLinha / 2;

        for (let l = 0; l < linhas.length; l++) {
            ctx.fillText(linhas[l], x + sw / 2, startY + l * alturaLinha);
        }
        ctx.restore();
    }
}

function quebrarTexto(ctx, texto, maxLargura) {
    let palavras = texto.split(" ");
    let linhas = [];
    let atual = "";
    for (let p of palavras) {
        let teste = atual ? atual + " " + p : p;
        if (ctx.measureText(teste).width > maxLargura && atual) {
            linhas.push(atual);
            atual = p;
        } else {
            atual = teste;
        }
    }
    if (atual) linhas.push(atual);
    return linhas;
}

// ─── COLISÃO: cobre todos os blocos da sala 3×2 ──────────────────────────────

function verificarColisaoComResposta() {
    let alternativas = bancoDeQuestoes[indicePerguntaAtual].alternativas;
    let tocouEmAlguma = false;
    let acertou = false;

    for (let i = 0; i < alternativas.length; i++) {
        let pos = posicoesRespostasAtuais[i];
        let colunaConfirmacao = pos.coluna + 1;
        let dentroColuna = jogador.coluna === colunaConfirmacao;
        let dentroLinha  = jogador.linha >= pos.linha && jogador.linha < pos.linha + ALTURA_SALA;

        if (dentroColuna && dentroLinha) {
            tocouEmAlguma = true;
            if (alternativas[i].correta) acertou = true;
        }
    }

    if (tocouEmAlguma) {
        pausarRodada(false);

        if (acertou) {
            acertosConsecutivos++;

            const bonusExplora = Math.min(20, Math.floor(pontinhosColecionados / 5)) * 100;

            const multCombo = acertosConsecutivos >= 4 ? 3
                            : acertosConsecutivos === 3 ? 2
                            : acertosConsecutivos === 2 ? 1.5
                            : 1;

            const baseAcerto  = 1000;
            const totalAcerto = Math.round(baseAcerto * multCombo) + bonusExplora;

            pontuacao += totalAcerto;
            vidas++;

            // ── Som de acerto ──
            tocarSom("acerto");

            aumentarVelocidade();
            atualizarPlacar();
            atualizarCombo(acertosConsecutivos);

            let detalhes = `+${totalAcerto} pts`;
            if (multCombo > 1)    detalhes += `  |  combo ×${multCombo}`;
            if (bonusExplora > 0) detalhes += `  |  exploração +${bonusExplora}`;
            detalhes += "  |  +1 vida";

            const ultimaQuestao = indicePerguntaAtual + 1 >= bancoDeQuestoes.length;
            indicePerguntaAtual++;

            if (ultimaQuestao) {
                indicePerguntaAtual = 0;
                embaralharBancoQuestoes();
            }

            desenharFeedback("✓ Resposta correta!", detalhes, "verde", () => {
                prepararNovaRodada();
            });

        } else {
            acertosConsecutivos = 0;
            vidas--;

            // ── Som de erro ──
            tocarSom("erro");

            atualizarPlacar();
            atualizarCombo(0);
            desenharFeedback("✗ Resposta incorreta", "Combo zerado  |  você perdeu 1 vida.", "vermelho", () => {
                verificarDerrota();
                if (vidas <= 0) return;

                jogador.coluna = 9;
                jogador.linha  = 5;
                resetarMonstros();
                atualizarTela();
                desenharTelaEspera();
                document.getElementById("btn-iniciar")?.classList.remove("oculto");
            });
        }
    }

    return tocouEmAlguma;
}

// ── Feedback visual no canvas ─────────────────────────────────────────────────

function ocultarFeedbackVisual() {
    feedbackAtivo = false;
    feedbackVisualAtual = null;

    const botaoFeedback = obterBotaoFeedbackHtml();
    if (botaoFeedback) {
        botaoFeedback.style.display = "none";
        botaoFeedback.classList.remove("feedback-erro");
    }
}

function desenharFeedbackNoCanvas(titulo, subtitulo, tipo) {
    const ctx = contexto;
    const telaCanvas = document.getElementById("telaJogo");
    if (!ctx || !telaCanvas) return;
    const corFaixa = tipo === "verde" ? "#2F9E41" : "#CD191E";

    ctx.fillStyle = "rgba(0,0,10,0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let bw = 460, bh = 150;
    let bx = (telaCanvas.width  - bw) / 2;
    let by = (telaCanvas.height - bh) / 2;

    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath(); ctx.roundRect(bx+4, by+4, bw, bh, 8); ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill();

    ctx.fillStyle = corFaixa;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, 38, [8, 8, 0, 0]); ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px 'Open Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowBlur = 0;
    ctx.fillText(titulo, telaCanvas.width / 2, by + 19);

    ctx.fillStyle = "#2D3436";
    ctx.font = "13px 'Open Sans', sans-serif";
    ctx.fillText(subtitulo, telaCanvas.width / 2, by + 78);
    feedbackAtivo = true;

    const botaoFeedback = obterBotaoFeedbackHtml();
    if (botaoFeedback) {
        botaoFeedback.style.display = "inline-flex";
        botaoFeedback.style.alignItems = "center";
        botaoFeedback.style.justifyContent = "center";
        botaoFeedback.classList.toggle("feedback-erro", tipo !== "verde");
        botaoFeedback.focus();
    }

    ctx.strokeStyle = corFaixa;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx + 8, by + bh - 1);
    ctx.lineTo(bx + bw - 8, by + bh - 1);
    ctx.stroke();
}

function redesenharFeedbackAtivo() {
    if (!feedbackAtivo || !feedbackVisualAtual) return;
    desenharFeedbackNoCanvas(
        feedbackVisualAtual.titulo,
        feedbackVisualAtual.subtitulo,
        feedbackVisualAtual.tipo
    );
}

function confirmarFeedbackVisual() {
    ocultarFeedbackVisual();
    const acao = acaoAposFeedback;
    acaoAposFeedback = null;
    if (typeof acao === "function") acao();
}

function desenharFeedback(titulo, subtitulo, tipo, onConfirm = null) {
    feedbackVisualAtual = { titulo, subtitulo, tipo };
    desenharFeedbackNoCanvas(titulo, subtitulo, tipo);
    acaoAposFeedback = typeof onConfirm === "function" ? onConfirm : null;
}