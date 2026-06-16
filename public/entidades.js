// ─── Jogador ──────────────────────────────────────────────────────────────────

let jogador = {
    coluna: 9,
    linha: 5,
    cor: "yellow",
    direcao: "right",
    angulosBoca: 0
};

// ─── Máquina de estados dos fantasmas ────────────────────────────────────────
// Estados:
//   "nacasa"     — dentro da casa, aguardando para sair
//   "saindo"     — subindo pela coluna 9 até o portão (linha 5)
//   "ativo"      — perseguindo ou fugindo normalmente no labirinto
//   "retornando" — foi comido, volta como olhos até a entrada da casa

const posicoesNaCasa = [
    { coluna: 8,  linha: 7 },
    { coluna: 9,  linha: 7 },
    { coluna: 10, linha: 7 },
    { coluna: 9,  linha: 8 }
];

const DELAYS_SAIDA = [0, 2000, 4000, 6000];

let monstros = [
    { coluna: 8,  linha: 7, cor: "red",    estado: "nacasa", tickSaida: 0 },
    { coluna: 9,  linha: 7, cor: "pink",   estado: "nacasa", tickSaida: 0 },
    { coluna: 10, linha: 7, cor: "cyan",   estado: "nacasa", tickSaida: 0 },
    { coluna: 9,  linha: 8, cor: "orange", estado: "nacasa", tickSaida: 0 }
];

const LINHA_PORTAO = 6;
const COLUNA_SAIDA = 9;
const LINHA_FORA   = 5;

let poderAtivo         = false;
let tempoPoder;
let fimDoPoderEm       = 0;
let intervaloPiscaPoder = null;
let bocaTick           = 0;
let emColisao          = false; // guarda para evitar múltiplos triggers simultâneos
let pontinhosColecionados = 0;  // pontinhos coletados nesta rodada (para o bônus)

// ─── Poder ────────────────────────────────────────────────────────────────────

function desativarPoder() {
    poderAtivo = false;
    fimDoPoderEm = 0;
    if (intervaloPiscaPoder) {
        clearInterval(intervaloPiscaPoder);
        intervaloPiscaPoder = null;
    }
    if (tempoPoder) {
        clearTimeout(tempoPoder);
        tempoPoder = null;
    }
}

function iniciarPiscaPoder() {
    if (intervaloPiscaPoder) clearInterval(intervaloPiscaPoder);
    intervaloPiscaPoder = setInterval(() => {
        if (!poderAtivo) return;
        if (!poderPertoDoFim()) return;
        if (typeof feedbackAtivo !== "undefined" && feedbackAtivo) return;
        if (typeof atualizarTela === "function") atualizarTela();
    }, 120);
}

function ativarPoder() {
    const DURACAO_PODER_MS = 7000;
    poderAtivo = true;
    fimDoPoderEm = Date.now() + DURACAO_PODER_MS;
    if (tempoPoder) clearTimeout(tempoPoder);
    iniciarPiscaPoder();
    tempoPoder = setTimeout(() => {
        poderAtivo = false;
        fimDoPoderEm = 0;
        if (intervaloPiscaPoder) {
            clearInterval(intervaloPiscaPoder);
            intervaloPiscaPoder = null;
        }
        tempoPoder = null;
    }, DURACAO_PODER_MS);
}

function poderPertoDoFim() {
    return poderAtivo && fimDoPoderEm > 0 && (fimDoPoderEm - Date.now()) <= 2000;
}

// ─── Reset ────────────────────────────────────────────────────────────────────

function resetarMonstros() {
    const agora = Date.now();
    emColisao = false;
    pontinhosColecionados = 0;
    desativarPoder();
    for (let i = 0; i < monstros.length; i++) {
        monstros[i].coluna    = posicoesNaCasa[i].coluna;
        monstros[i].linha     = posicoesNaCasa[i].linha;
        monstros[i].estado    = "nacasa";
        monstros[i].tickSaida = agora + DELAYS_SAIDA[i];
    }
}

// ─── Desenho do IF-Man (formando com capelo) ─────────────────────────────────

function desenharJogador(contexto) {
    bocaTick += 0.25;
    let abertura = (Math.sin(bocaTick) * 0.5 + 0.5) * 0.35 + 0.05;

    let posicaoX = jogador.coluna * tamanhoBloco;
    let posicaoY = jogador.linha  * tamanhoBloco;
    let centroX  = posicaoX + tamanhoBloco / 2;
    let centroY  = posicaoY + tamanhoBloco / 2;
    let raio     = tamanhoBloco / 2.2;

    let rotacao = 0;
    if      (jogador.direcao === "right") rotacao = 0;
    else if (jogador.direcao === "left")  rotacao = Math.PI;
    else if (jogador.direcao === "up")    rotacao = -Math.PI / 2;
    else if (jogador.direcao === "down")  rotacao =  Math.PI / 2;

    let anguloInicio = rotacao + abertura * Math.PI;
    let anguloFim    = rotacao + (2 - abertura) * Math.PI;

    contexto.save();

    // Corpo verde IF
    contexto.shadowColor = "rgba(47, 158, 65, 0.6)";
    contexto.shadowBlur  = 10;
    contexto.fillStyle   = "#2F9E41";
    contexto.beginPath();
    contexto.moveTo(centroX, centroY);
    contexto.arc(centroX, centroY, raio, anguloInicio, anguloFim);
    contexto.closePath();
    contexto.fill();

    /* Olho
    let olhoAngulo = rotacao - Math.PI / 4;
    let olhoX = centroX + Math.cos(olhoAngulo) * raio * 0.48;
    let olhoY = centroY + Math.sin(olhoAngulo) * raio * 0.48;
    contexto.shadowBlur = 0;
    contexto.fillStyle  = "white";
    contexto.beginPath();
    contexto.arc(olhoX, olhoY, 4, 0, Math.PI * 2);
    contexto.fill();
    contexto.fillStyle = "#000010";
    contexto.beginPath();
    contexto.arc(olhoX + Math.cos(rotacao) * 1.5, olhoY + Math.sin(rotacao) * 1.5, 2, 0, Math.PI * 2);
    contexto.fill();

    // Capelo — fixo no topo independente da direção
    let topoY    = centroY - raio;
    let abaLarg  = raio * 1.6;
    let abaAltu  = raio * 0.22;
    let caixaLarg = abaLarg * 0.45;
    let caixaAltu = raio * 0.28;

    contexto.fillStyle = "#1D6B2A";
    contexto.fillRect(centroX - abaLarg / 2, topoY - abaAltu / 2, abaLarg, abaAltu);
    contexto.fillRect(centroX - caixaLarg / 2, topoY - abaAltu / 2 - caixaAltu, caixaLarg, caixaAltu);

    // Borla dourada
    let borlaBaseX = centroX + abaLarg * 0.38;
    let borlaBaseY = topoY;
    let borlaCompr = raio * 0.55;

    contexto.strokeStyle = "#F1C40F";
    contexto.lineWidth   = 2;
    contexto.lineCap     = "round";
    contexto.beginPath();
    contexto.moveTo(borlaBaseX, borlaBaseY);
    contexto.lineTo(borlaBaseX + borlaCompr * 0.5, borlaBaseY + borlaCompr);
    contexto.stroke();

    contexto.fillStyle = "#F1C40F";
    contexto.beginPath();
    contexto.arc(borlaBaseX + borlaCompr * 0.5, borlaBaseY + borlaCompr + 3, 3.5, 0, Math.PI * 2);
    contexto.fill();
*/
    contexto.restore();
}

// ─── Desenho dos fantasmas ────────────────────────────────────────────────────

const nomesParaHex = {
    red: "#ff0000", pink: "#ff69b4", cyan: "#00ffff", orange: "#ffa500",
    white: "#ffffff", blue: "#0000ff", yellow: "#ffff00", green: "#008000"
};

function lightenColor(cor, amount) {
    let hex = nomesParaHex[cor.toLowerCase()] || cor;
    let c = hex.replace('#', '');
    if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
    let r = Math.min(255, parseInt(c.substring(0,2), 16) + amount);
    let g = Math.min(255, parseInt(c.substring(2,4), 16) + amount);
    let b = Math.min(255, parseInt(c.substring(4,6), 16) + amount);
    return `rgb(${r},${g},${b})`;
}

function desenharOlhos(ctx, cx, cy, raio) {
    ctx.fillStyle = "white";
    ctx.beginPath(); ctx.ellipse(cx - raio*0.32, cy - raio*0.15, raio*0.22, raio*0.28, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + raio*0.32, cy - raio*0.15, raio*0.22, raio*0.28, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#0000cc";
    ctx.beginPath(); ctx.arc(cx - raio*0.27, cy - raio*0.11, raio*0.11, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + raio*0.37, cy - raio*0.11, raio*0.11, 0, Math.PI*2); ctx.fill();
}

function desenharFantasma(ctx, cx, cy, raio, cor, assustado) {
    ctx.save();

    const tempoRestantePoder = Math.max(0, fimDoPoderEm - Date.now());
    const assustadoPiscando = assustado && tempoRestantePoder <= 2000 && Math.floor(tempoRestantePoder / 180) % 2 === 0;
    let corUsar = assustado ? (assustadoPiscando ? "#ffffff" : "#2255cc") : cor;
    ctx.shadowColor = assustado
        ? (assustadoPiscando ? "rgba(255,255,255,0.75)" : "rgba(100,150,255,0.6)")
        : cor;
    ctx.shadowBlur  = 10;

    let grad = ctx.createRadialGradient(cx - raio*0.2, cy - raio*0.2, 1, cx, cy, raio);
    grad.addColorStop(0, lightenColor(corUsar, 50));
    grad.addColorStop(1, corUsar);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy - raio*0.1, raio, Math.PI, 0);

    let baseY     = cy + raio*0.9;
    let esq       = cx - raio;
    let dir       = cx + raio;
    let largDente = (dir - esq) / 3;

    ctx.lineTo(dir, baseY);
    ctx.quadraticCurveTo(dir - largDente*0.25, baseY + raio*0.4, dir - largDente*0.5, baseY);
    ctx.quadraticCurveTo(dir - largDente*0.75, baseY - raio*0.35, cx, baseY);
    ctx.quadraticCurveTo(esq + largDente*0.75, baseY + raio*0.4, esq + largDente*0.5, baseY);
    ctx.quadraticCurveTo(esq + largDente*0.25, baseY - raio*0.35, esq, baseY);
    ctx.lineTo(esq, cy - raio*0.1);
    ctx.closePath();
    ctx.fill();

    if (!assustado) {
        ctx.fillStyle = "white";
        ctx.beginPath(); ctx.ellipse(cx - raio*0.32, cy - raio*0.15, raio*0.22, raio*0.28, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + raio*0.32, cy - raio*0.15, raio*0.22, raio*0.28, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#0000cc";
        ctx.beginPath(); ctx.arc(cx - raio*0.27, cy - raio*0.11, raio*0.11, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + raio*0.37, cy - raio*0.11, raio*0.11, 0, Math.PI*2); ctx.fill();
    } else {
        ctx.strokeStyle = assustadoPiscando ? "#2255cc" : "#ffffff";
        ctx.lineWidth = 2;
        let r = raio * 0.13;
        let ox1 = cx - raio*0.32, oy1 = cy - raio*0.15;
        ctx.beginPath(); ctx.moveTo(ox1-r, oy1-r); ctx.lineTo(ox1+r, oy1+r); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ox1+r, oy1-r); ctx.lineTo(ox1-r, oy1+r); ctx.stroke();
        let ox2 = cx + raio*0.32;
        ctx.beginPath(); ctx.moveTo(ox2-r, oy1-r); ctx.lineTo(ox2+r, oy1+r); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ox2+r, oy1-r); ctx.lineTo(ox2-r, oy1+r); ctx.stroke();
    }

    ctx.restore();
}

function desenharMonstros(contexto) {
    let raio = tamanhoBloco / 2.2;
    for (let i = 0; i < monstros.length; i++) {
        let m  = monstros[i];
        let cx = m.coluna * tamanhoBloco + tamanhoBloco / 2;
        let cy = m.linha  * tamanhoBloco + tamanhoBloco / 2;

        if (m.estado === "nacasa") {
            contexto.save();
            contexto.globalAlpha = 0.7;
            desenharFantasma(contexto, cx, cy, raio, m.cor, false);
            contexto.restore();
        } else if (m.estado === "saindo") {
            contexto.save();
            contexto.globalAlpha = 0.85;
            desenharFantasma(contexto, cx, cy, raio, m.cor, poderAtivo);
            contexto.restore();
        } else if (m.estado === "ativo") {
            desenharFantasma(contexto, cx, cy, raio, m.cor, poderAtivo);
        } else if (m.estado === "retornando") {
            contexto.save();
            contexto.globalAlpha = 0.85;
            desenharOlhos(contexto, cx, cy, raio);
            contexto.restore();
        }
    }
}

// ─── Colisão com monstro ──────────────────────────────────────────────────────

function monstroPodeColidir(m) {
    return m.estado === "ativo" || m.estado === "saindo";
}

function verificarColisaoComMonstro() {
    if (emColisao) return;

    for (let i = 0; i < monstros.length; i++) {
        let m = monstros[i];
        if (!monstroPodeColidir(m)) continue;

        if (jogador.coluna === m.coluna && jogador.linha === m.linha) {
            if (poderAtivo) {
                m.estado = "retornando";
                pontuacao += 200;
                atualizarPlacar();
            } else {
                emColisao = true;
                vidas--;
                acertosConsecutivos = 0;
                atualizarPlacar();
                atualizarCombo(0);
                pausarRodada(false);
                desenharFeedback("Você foi capturado!", `Combo zerado | Vidas restantes: ${vidas}`, "vermelho", () => {
                    verificarDerrota();
                    if (vidas <= 0) {
                        emColisao = false;
                        return;
                    }

                    jogador.coluna = 9;
                    jogador.linha  = 5;
                    resetarMonstros();
                    emColisao = false;
                    atualizarTela();
                    desenharTelaEspera();
                    document.getElementById("btn-iniciar")?.classList.remove("oculto");
                });
                return;
            }
        }
    }
}

// ─── Verificação de colisão entre monstros ────────────────────────────────────

function temOutroMonstro(linhaTestada, colunaTestada, meuIndice) {
    for (let i = 0; i < monstros.length; i++) {
        if (i === meuIndice) continue;
        let m = monstros[i];
        if (m.estado !== "retornando" &&
            m.linha === linhaTestada && m.coluna === colunaTestada) {
            return true;
        }
    }
    return false;
}

function celulaEhAcessivelParaMonstro(linha, coluna, opcoes = {}) {
    const { permitirPortao = false } = opcoes;
    const celula = labirinto[linha]?.[coluna];

    if (celula === undefined || celula === 1 || celula === 5) return false;
    if (celula === 6) return permitirPortao;

    return true;
}

function celulaEhAcessivelNaSaida(linha, coluna) {
    const celula = labirinto[linha]?.[coluna];
    return celula !== undefined && celula !== 1;
}

function obterMovimentosValidosMonstro(monstro, indice, opcoes = {}) {
    const vizinhos = [
        { linha: monstro.linha - 1, coluna: monstro.coluna },
        { linha: monstro.linha + 1, coluna: monstro.coluna },
        { linha: monstro.linha,     coluna: monstro.coluna - 1 },
        { linha: monstro.linha,     coluna: monstro.coluna + 1 }
    ];

    return vizinhos.filter((vizinho) => {
        return celulaEhAcessivelParaMonstro(vizinho.linha, vizinho.coluna, opcoes) &&
            !temOutroMonstro(vizinho.linha, vizinho.coluna, indice);
    });
}

function calcularMapaDistancias(alvos, opcoes = {}) {
    const distancias = labirinto.map((linha) => linha.map(() => Infinity));
    const fila = [];

    for (let i = 0; i < alvos.length; i++) {
        const alvo = alvos[i];
        if (!celulaEhAcessivelParaMonstro(alvo.linha, alvo.coluna, opcoes)) continue;
        distancias[alvo.linha][alvo.coluna] = 0;
        fila.push(alvo);
    }

    for (let cabeca = 0; cabeca < fila.length; cabeca++) {
        const atual = fila[cabeca];
        const distanciaAtual = distancias[atual.linha][atual.coluna];
        const vizinhos = [
            { linha: atual.linha - 1, coluna: atual.coluna },
            { linha: atual.linha + 1, coluna: atual.coluna },
            { linha: atual.linha,     coluna: atual.coluna - 1 },
            { linha: atual.linha,     coluna: atual.coluna + 1 }
        ];

        for (let i = 0; i < vizinhos.length; i++) {
            const vizinho = vizinhos[i];
            if (!celulaEhAcessivelParaMonstro(vizinho.linha, vizinho.coluna, opcoes)) continue;
            if (distancias[vizinho.linha][vizinho.coluna] <= distanciaAtual + 1) continue;

            distancias[vizinho.linha][vizinho.coluna] = distanciaAtual + 1;
            fila.push(vizinho);
        }
    }

    return distancias;
}

function escolherMovimentoPorDistancia(monstro, indice, mapaDistancias, estrategia, opcoes = {}) {
    const movimentos = obterMovimentosValidosMonstro(monstro, indice, opcoes);
    if (movimentos.length === 0) return null;

    let melhorValor = estrategia === "fugir" ? -Infinity : Infinity;
    let melhores = [];

    for (let i = 0; i < movimentos.length; i++) {
        const movimento = movimentos[i];
        const distancia = mapaDistancias[movimento.linha]?.[movimento.coluna] ?? Infinity;
        const valor = Number.isFinite(distancia)
            ? distancia
            : (estrategia === "fugir" ? 9999 : Infinity);

        const ehMelhor = estrategia === "fugir"
            ? valor > melhorValor
            : valor < melhorValor;

        if (ehMelhor) {
            melhorValor = valor;
            melhores = [movimento];
        } else if (valor === melhorValor) {
            melhores.push(movimento);
        }
    }

    return melhores[Math.floor(Math.random() * melhores.length)] || null;
}

// ─── Movimento dos monstros ───────────────────────────────────────────────────

function moverMonstros() {
    const agora = Date.now();
    const distanciasAteJogador = calcularMapaDistancias([
        { linha: jogador.linha, coluna: jogador.coluna }
    ]);
    const distanciasAtePortao = calcularMapaDistancias([
        { linha: LINHA_PORTAO, coluna: COLUNA_SAIDA }
    ], { permitirPortao: true });

    for (let i = 0; i < monstros.length; i++) {
        let m = monstros[i];

        // ── Na casa: aguarda delay e verifica saída livre ─────────────────────
        if (m.estado === "nacasa") {
            if (agora >= m.tickSaida) {
                if (!temOutroMonstro(m.linha, COLUNA_SAIDA, i) &&
                    !temOutroMonstro(LINHA_PORTAO, COLUNA_SAIDA, i)) {
                    m.estado = "saindo";
                    m.coluna = COLUNA_SAIDA;
                } else {
                    m.tickSaida = agora + 500;
                }
            }
            continue;
        }

        // ── Saindo: sobe linha por linha até a linha livre ────────────────────
        if (m.estado === "saindo") {
            if (m.linha > LINHA_FORA) {
                let linhaDestino = m.linha - 1;
                if (celulaEhAcessivelNaSaida(linhaDestino, m.coluna) &&
                    !temOutroMonstro(linhaDestino, m.coluna, i)) {
                    m.linha = linhaDestino;
                }
            } else {
                m.estado = "ativo";
            }
            continue;
        }

        // ── Retornando: volta ao portão sem atravessar paredes ────────────────
        if (m.estado === "retornando") {
            if (m.coluna === COLUNA_SAIDA && m.linha === LINHA_PORTAO) {
                m.linha     = posicoesNaCasa[i].linha;
                m.coluna    = posicoesNaCasa[i].coluna;
                m.estado    = "nacasa";
                m.tickSaida = Date.now() + 3000;
            } else {
                const proximoPasso = escolherMovimentoPorDistancia(
                    m,
                    i,
                    distanciasAtePortao,
                    "perseguir",
                    { permitirPortao: true }
                );

                if (proximoPasso) {
                    m.coluna = proximoPasso.coluna;
                    m.linha  = proximoPasso.linha;
                }
            }
            continue;
        }

        // ── Ativo: perseguição / fuga pela menor rota válida do labirinto ─────
        const melhorMovimento = escolherMovimentoPorDistancia(
            m,
            i,
            distanciasAteJogador,
            poderAtivo ? "fugir" : "perseguir"
        );

        if (melhorMovimento) {
            m.coluna = melhorMovimento.coluna;
            m.linha  = melhorMovimento.linha;
        }
    }

    verificarColisaoComMonstro();
    // atualizarTela() é chamado pelo tickMonstros em motor.js
}

// ─── Movimento do jogador ─────────────────────────────────────────────────────

function moverJogador(evento) {
    if (!jogoAtivo || vidas <= 0 || emColisao) return;

    let tecla = evento.key;
    let proximaColuna = jogador.coluna;
    let proximaLinha  = jogador.linha;

    if      (tecla === "ArrowUp"    || tecla === "w" || tecla === "W") { proximaLinha--;  jogador.direcao = "up";    }
    else if (tecla === "ArrowDown"  || tecla === "s" || tecla === "S") { proximaLinha++;  jogador.direcao = "down";  }
    else if (tecla === "ArrowLeft"  || tecla === "a" || tecla === "A") { proximaColuna--; jogador.direcao = "left";  }
    else if (tecla === "ArrowRight" || tecla === "d" || tecla === "D") { proximaColuna++; jogador.direcao = "right"; }

    let cel = labirinto[proximaLinha]?.[proximaColuna];

    if (cel !== undefined && cel !== 1 && cel !== 5 && cel !== 6) {
        jogador.coluna = proximaColuna;
        jogador.linha  = proximaLinha;

        let item = labirinto[jogador.linha][jogador.coluna];
        if (item === 2) {
            labirinto[jogador.linha][jogador.coluna] = 0;
            pontuacao += 50;              // era 10
            pontinhosColecionados++;
            atualizarPlacar();
        } else if (item === 3) {
            labirinto[jogador.linha][jogador.coluna] = 0;
            pontuacao += 200;             // era 50
            pontinhosColecionados += 4;   // vale mais para o bônus de exploração
            atualizarPlacar();
            ativarPoder();
        }
    }

    const respondeuQuestao = verificarColisaoComResposta();
    if (respondeuQuestao) return;

    verificarColisaoComMonstro();
    atualizarTela();
}