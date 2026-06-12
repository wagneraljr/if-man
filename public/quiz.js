let bancoDeQuestoes     = [];
let indicePerguntaAtual = 0;
let acertosConsecutivos = 0;  // combo de acertos seguidos
let acaoAposFeedback    = null;
let feedbackAtivo       = false;
let feedbackBotaoArea   = null;

function embaralharBancoQuestoes() {
    for (let i = bancoDeQuestoes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bancoDeQuestoes[i], bancoDeQuestoes[j]] = [bancoDeQuestoes[j], bancoDeQuestoes[i]];
    }
}

function atualizarFeedbackCanvasClick() {
    const canvas = document.getElementById("telaJogo");
    if (!canvas || canvas.dataset.feedbackClickBind === "1") return;

    canvas.addEventListener("click", (event) => {
        if (!feedbackAtivo || !feedbackBotaoArea) return;

        const ret = canvas.getBoundingClientRect();
        const escalaX = canvas.width / ret.width;
        const escalaY = canvas.height / ret.height;
        const x = (event.clientX - ret.left) * escalaX;
        const y = (event.clientY - ret.top) * escalaY;

        const dentroBotao = x >= feedbackBotaoArea.x && x <= feedbackBotaoArea.x + feedbackBotaoArea.w &&
            y >= feedbackBotaoArea.y && y <= feedbackBotaoArea.y + feedbackBotaoArea.h;

        if (dentroBotao) confirmarFeedbackVisual();
    });

    canvas.dataset.feedbackClickBind = "1";
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
        // Mostra erro no canvas em vez de alert bloqueante
        desenharTelaErro(
            "Erro ao carregar questões",
            "Verifique se o servidor está rodando e recarregue a página."
        );
        return;
    }

    if (bancoDeQuestoes.length === 0) {
        // Mostra tela de erro amigável no canvas
        desenharTelaErro(
            "Nenhuma questão disponível",
            "Não há questões nessa categoria. Volte e escolha outra categoria ou cadastre mais perguntas."
        );
        return;
    }

    // Embaralha a ordem das questões a cada partida
    embaralharBancoQuestoes();

    prepararRodadaInicial();
}

function carregarPergunta() {
    document.getElementById("pergunta").innerText = bancoDeQuestoes[indicePerguntaAtual].texto;
}

// ─── DESENHO DAS SALAS 3×2 ───────────────────────────────────────────────────
// Cada sala ocupa LARGURA_SALA colunas × ALTURA_SALA linhas.
// A posição registrada é o canto superior-esquerdo (coluna, linha).

function desenharAlternativas(ctx) {
    let alternativas = bancoDeQuestoes[indicePerguntaAtual].alternativas;
    let bs = tamanhoBloco;
    let sw = LARGURA_SALA * bs;   // largura total da sala em px
    let sh = ALTURA_SALA  * bs;   // altura  total da sala em px

    for (let i = 0; i < alternativas.length; i++) {
        let alt = alternativas[i];
        let pos = posicoesRespostasAtuais[i];
        let x = pos.coluna * bs;
        let y = pos.linha  * bs;

        // Fundo da sala
        ctx.save();
        ctx.shadowColor = "rgba(0,200,50,0.4)";
        ctx.shadowBlur = 6;
        let grad = ctx.createLinearGradient(x, y, x, y + sh);
        grad.addColorStop(0, "#14532d");
        grad.addColorStop(1, "#052e16");
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, sw, sh);

        // Borda neon
        ctx.strokeStyle = "#00e040";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, sw - 2, sh - 2);

        // Reflexo superior
        ctx.fillStyle = "rgba(100,255,120,0.08)";
        ctx.fillRect(x + 2, y + 2, sw - 4, sh * 0.3);
        ctx.restore();

        // ── Texto da alternativa centralizado na sala ──
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.font = `${bs * 0.37}px 'Courier New', monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        let maxW = sw - 10;
        let linhas = quebrarTexto(ctx, alt.texto, maxW);
        let alturaLinha = bs * 0.4;
        let totalAltura = linhas.length * alturaLinha;

        // Centraliza verticalmente na sala inteira
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

        // Exige que o jogador chegue à coluna CENTRAL da sala (col+1 de 3)
        // evitando disparar ao apenas roçar a borda da sala pelo corredor adjacente.
        let colunaConfirmacao = pos.coluna + 1;
        let dentroColuna = jogador.coluna === colunaConfirmacao;
        let dentroLinha  = jogador.linha >= pos.linha && jogador.linha < pos.linha + ALTURA_SALA;

        if (dentroColuna && dentroLinha) {
            tocouEmAlguma = true;
            if (alternativas[i].correta) acertou = true;
        }
    }

    if (tocouEmAlguma) {
        // Pausa o jogo imediatamente para exibir feedback
        pausarRodada();

        if (acertou) {
            acertosConsecutivos++;

            // ── Bônus de exploração (pontinhos coletados na rodada) ───────────
            // A cada 5 pontinhos coletados, ganha +100pts no prêmio da questão
            const bonusExplora = Math.min(20, Math.floor(pontinhosColecionados / 5)) * 100;

            // ── Multiplicador de combo (acertos consecutivos) ─────────────────
            // 1 acerto = ×1 | 2 = ×1.5 | 3 = ×2 | 4+ = ×3
            const multCombo = acertosConsecutivos >= 4 ? 3
                            : acertosConsecutivos === 3 ? 2
                            : acertosConsecutivos === 2 ? 1.5
                            : 1;

            const baseAcerto  = 1000;
            const totalAcerto = Math.round(baseAcerto * multCombo) + bonusExplora;

            pontuacao += totalAcerto;
            vidas++;
            aumentarVelocidade();
            atualizarPlacar();
            atualizarCombo(acertosConsecutivos);

            // Monta linha de detalhes do feedback
            let detalhes = `+${totalAcerto} pts`;
            if (multCombo > 1)    detalhes += `  |  combo ×${multCombo}`;
            if (bonusExplora > 0) detalhes += `  |  exploração +${bonusExplora}`;
            detalhes += "  |  +1 vida";

            const ultimaQuestao = indicePerguntaAtual + 1 >= bancoDeQuestoes.length;
            indicePerguntaAtual++;

            if (ultimaQuestao) {
                indicePerguntaAtual = 0;
                embaralharBancoQuestoes();
            } else {
                // mantém o índice já avançado
            }

            desenharFeedback("✓ Resposta correta!", detalhes, "verde", () => {
                prepararNovaRodada();
            });

        } else {
            acertosConsecutivos = 0; // quebra o combo
            vidas--;
            atualizarPlacar();
            atualizarCombo(0);
            desenharFeedback("✗ Resposta incorreta", "Combo zerado  |  você perdeu 1 vida.", "vermelho", () => {
                verificarDerrota();
                if (vidas > 0) prepararNovaRodada();
            });
        }
    }

    return tocouEmAlguma;
}

// ── Feedback visual no canvas (acerto / erro) ─────────────────────────────────

function ocultarFeedbackVisual() {
    feedbackAtivo = false;
    feedbackBotaoArea = null;
}

function desenharFeedbackNoCanvas(titulo, subtitulo, tipo) {
    const ctx = contexto;
    const telaCanvas = document.getElementById("telaJogo");
    if (!ctx || !telaCanvas) return;
    const corFaixa = tipo === "verde" ? "#2F9E41" : "#CD191E";

    // Overlay leve
    ctx.fillStyle = "rgba(0,0,10,0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let bw = 460, bh = 150;
    let bx = (telaCanvas.width  - bw) / 2;
    let by = (telaCanvas.height - bh) / 2;

    // Sombra
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath(); ctx.roundRect(bx+4, by+4, bw, bh, 8); ctx.fill();

    // Fundo branco
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill();

    // Faixa colorida no topo
    ctx.fillStyle = corFaixa;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, 38, [8, 8, 0, 0]); ctx.fill();

    // Título
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px 'Open Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowBlur = 0;
    ctx.fillText(titulo, telaCanvas.width / 2, by + 19);

    // Subtítulo
    ctx.fillStyle = "#2D3436";
    ctx.font = "13px 'Open Sans', sans-serif";
    ctx.fillText(subtitulo, telaCanvas.width / 2, by + 78);

    // Botão OK desenhado no próprio canvas
    const btnW = 82;
    const btnH = 30;
    const btnX = telaCanvas.width / 2 - btnW / 2;
    const btnY = by + 100;

    ctx.fillStyle = corFaixa;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 8);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px 'Open Sans', sans-serif";
    ctx.fillText("OK", telaCanvas.width / 2, btnY + btnH / 2 + 1);

    feedbackBotaoArea = { x: btnX, y: btnY, w: btnW, h: btnH };
    feedbackAtivo = true;

    // Linha decorativa na base
    ctx.strokeStyle = corFaixa;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx + 8, by + bh - 1);
    ctx.lineTo(bx + bw - 8, by + bh - 1);
    ctx.stroke();
}

function confirmarFeedbackVisual() {
    ocultarFeedbackVisual();

    const acao = acaoAposFeedback;
    acaoAposFeedback = null;
    if (typeof acao === "function") acao();
}

function desenharFeedback(titulo, subtitulo, tipo, onConfirm = null) {
    // Sempre desenha no canvas para garantir feedback mesmo se houver
    // qualquer problema visual/empilhamento com o modal HTML.
    desenharFeedbackNoCanvas(titulo, subtitulo, tipo);

    acaoAposFeedback = typeof onConfirm === "function" ? onConfirm : null;
}