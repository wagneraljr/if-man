let bancoDeQuestoes = [];
let indicePerguntaAtual = 0;

async function carregarBancoDeQuestoes() {
    try {
        bancoDeQuestoes = await obterQuestoes();
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
            "Nenhuma questão cadastrada",
            "Aguarde o professor cadastrar perguntas no painel e recarregue a página."
        );
        return;
    }

    // Embaralha a ordem das questões a cada partida
    for (let i = bancoDeQuestoes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bancoDeQuestoes[i], bancoDeQuestoes[j]] = [bancoDeQuestoes[j], bancoDeQuestoes[i]];
    }

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
        // Jogador está dentro da sala se estiver em qualquer um dos 6 blocos
        let dentroColuna = jogador.coluna >= pos.coluna && jogador.coluna < pos.coluna + LARGURA_SALA;
        let dentroLinha  = jogador.linha  >= pos.linha  && jogador.linha  < pos.linha  + ALTURA_SALA;
        if (dentroColuna && dentroLinha) {
            tocouEmAlguma = true;
            if (alternativas[i].correta) acertou = true;
        }
    }

    if (tocouEmAlguma) {
        // Pausa o jogo imediatamente para exibir feedback
        pausarRodada();

        if (acertou) {
            pontuacao += 1000;
            vidas += 1;
            atualizarPlacar();

            const ultimaQuestao = indicePerguntaAtual + 1 >= bancoDeQuestoes.length;
            indicePerguntaAtual++;

            if (ultimaQuestao) {
                let bonus = vidas * 100;
                pontuacao += bonus;
                atualizarPlacar();
                desenharFeedback("✓ Você concluiu todas as questões!",
                    `Pontuação final: ${pontuacao} pts (bônus de vidas: ${bonus})`, "verde");
                setTimeout(() => {
                    indicePerguntaAtual = 0;
                    prepararNovaRodada();
                }, 2500);
            } else {
                desenharFeedback("✓ Resposta correta!", "+1000 pontos  |  +1 vida", "verde");
                setTimeout(() => { prepararNovaRodada(); }, 1800);
            }

        } else {
            vidas--;
            atualizarPlacar();
            desenharFeedback("✗ Resposta incorreta", "Você perdeu 1 vida.", "vermelho");
            setTimeout(() => {
                verificarDerrota();
                if (vidas > 0) prepararNovaRodada();
            }, 1800);
        }
    }
}

// ── Feedback visual no canvas (acerto / erro) ─────────────────────────────────

function desenharFeedback(titulo, subtitulo, tipo) {
    const ctx = contexto;
    const corFaixa = tipo === "verde" ? "#2F9E41" : "#CD191E";

    // Overlay leve
    ctx.fillStyle = "rgba(0,0,10,0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let bw = 460, bh = 120;
    let bx = (canvas.width  - bw) / 2;
    let by = (canvas.height - bh) / 2;

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
    ctx.fillText(titulo, canvas.width / 2, by + 19);

    // Subtítulo
    ctx.fillStyle = "#2D3436";
    ctx.font = "13px 'Open Sans', sans-serif";
    ctx.fillText(subtitulo, canvas.width / 2, by + 78);

    // Linha decorativa na base
    ctx.strokeStyle = corFaixa;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx + 8, by + bh - 1);
    ctx.lineTo(bx + bw - 8, by + bh - 1);
    ctx.stroke();
}