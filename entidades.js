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
//
// Posições iniciais dentro da casa (valores 5 no labirinto)
const posicoesNaCasa = [
    { coluna: 8,  linha: 7 },
    { coluna: 9,  linha: 7 },
    { coluna: 10, linha: 7 },
    { coluna: 9,  linha: 8 }
];

// Delays de saída: cada fantasma espera N ms antes de começar a sair
const DELAYS_SAIDA = [0, 2000, 4000, 6000];

let monstros = [
    { coluna: 8,  linha: 7, cor: "red",    estado: "nacasa", tickSaida: 0 },
    { coluna: 9,  linha: 7, cor: "pink",   estado: "nacasa", tickSaida: 0 },
    { coluna: 10, linha: 7, cor: "cyan",   estado: "nacasa", tickSaida: 0 },
    { coluna: 9,  linha: 8, cor: "orange", estado: "nacasa", tickSaida: 0 }
];

// Linha do portão e coluna central da saída
const LINHA_PORTAO  = 6;
const COLUNA_SAIDA  = 9;
const LINHA_FORA    = 5; // linha onde o fantasma já está livre

let poderAtivo = false;
let tempoPoder;
let bocaTick = 0;

// ─── Poder ────────────────────────────────────────────────────────────────────

function ativarPoder() {
    poderAtivo = true;
    if (tempoPoder) clearTimeout(tempoPoder);
    tempoPoder = setTimeout(() => { poderAtivo = false; }, 7000);
}

// ─── Reset ────────────────────────────────────────────────────────────────────

function resetarMonstros() {
    const agora = Date.now();
    for (let i = 0; i < monstros.length; i++) {
        monstros[i].coluna   = posicoesNaCasa[i].coluna;
        monstros[i].linha    = posicoesNaCasa[i].linha;
        monstros[i].estado   = "nacasa";
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

    // ── Corpo verde IF ────────────────────────────────────────────────────────
    contexto.shadowColor = "rgba(47, 158, 65, 0.6)";
    contexto.shadowBlur  = 10;
    contexto.fillStyle   = "#2F9E41";
    contexto.beginPath();
    contexto.moveTo(centroX, centroY);
    contexto.arc(centroX, centroY, raio, anguloInicio, anguloFim);
    contexto.closePath();
    contexto.fill();

    // ── Olho ──────────────────────────────────────────────────────────────────
    // Posiciona o olho perpendicular à direção, no quarto superior
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

    // ── Capelo ────────────────────────────────────────────────────────────────
    // O capelo fica sempre no topo do personagem, independente da direção.
    // É desenhado por último para ficar sobre o corpo.

    let topoY = centroY - raio;  // ponto mais alto do círculo

    // Tabuleiro (aba plana) — retângulo centrado no topo
    let abaLarg = raio * 1.6;
    let abaAltu = raio * 0.22;
    contexto.fillStyle = "#1D6B2A";
    contexto.fillRect(centroX - abaLarg / 2, topoY - abaAltu / 2, abaLarg, abaAltu);

    // Caixinha do topo (parte elevada)
    let caixaLarg = abaLarg * 0.45;
    let caixaAltu = raio * 0.28;
    contexto.fillRect(centroX - caixaLarg / 2, topoY - abaAltu / 2 - caixaAltu, caixaLarg, caixaAltu);

    // Borla — ponto de partida no canto direito da aba
    let borlaBaseX = centroX + abaLarg * 0.38;
    let borlaBaseY = topoY;
    let borlaCompr = raio * 0.55;

    // Cordão que desce diagonalmente
    contexto.strokeStyle  = "#F1C40F";
    contexto.lineWidth    = 2;
    contexto.lineCap      = "round";
    contexto.beginPath();
    contexto.moveTo(borlaBaseX, borlaBaseY);
    contexto.lineTo(borlaBaseX + borlaCompr * 0.5, borlaBaseY + borlaCompr);
    contexto.stroke();

    // Bolinha da borla
    contexto.fillStyle = "#F1C40F";
    contexto.beginPath();
    contexto.arc(
        borlaBaseX + borlaCompr * 0.5,
        borlaBaseY + borlaCompr + 3,
        3.5, 0, Math.PI * 2
    );
    contexto.fill();

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
    // Apenas os olhos — usado quando o fantasma está retornando
    ctx.fillStyle = "white";
    ctx.beginPath(); ctx.ellipse(cx - raio*0.32, cy - raio*0.15, raio*0.22, raio*0.28, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + raio*0.32, cy - raio*0.15, raio*0.22, raio*0.28, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#0000cc";
    ctx.beginPath(); ctx.arc(cx - raio*0.27, cy - raio*0.11, raio*0.11, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + raio*0.37, cy - raio*0.11, raio*0.11, 0, Math.PI*2); ctx.fill();
}

function desenharFantasma(ctx, cx, cy, raio, cor, assustado) {
    ctx.save();

    let corUsar = assustado ? "#2255cc" : cor;
    ctx.shadowColor = assustado ? "rgba(100,150,255,0.6)" : cor;
    ctx.shadowBlur  = 10;

    let grad = ctx.createRadialGradient(cx - raio*0.2, cy - raio*0.2, 1, cx, cy, raio);
    grad.addColorStop(0, lightenColor(corUsar, 50));
    grad.addColorStop(1, corUsar);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy - raio*0.1, raio, Math.PI, 0);

    let baseY    = cy + raio*0.9;
    let esq      = cx - raio;
    let dir      = cx + raio;
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
        // Olhos normais
        ctx.fillStyle = "white";
        ctx.beginPath(); ctx.ellipse(cx - raio*0.32, cy - raio*0.15, raio*0.22, raio*0.28, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + raio*0.32, cy - raio*0.15, raio*0.22, raio*0.28, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#0000cc";
        ctx.beginPath(); ctx.arc(cx - raio*0.27, cy - raio*0.11, raio*0.11, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + raio*0.37, cy - raio*0.11, raio*0.11, 0, Math.PI*2); ctx.fill();
    } else {
        // Olhos em X
        ctx.strokeStyle = "#ffffff";
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
        let m = monstros[i];
        let cx = m.coluna * tamanhoBloco + tamanhoBloco / 2;
        let cy = m.linha  * tamanhoBloco + tamanhoBloco / 2;

        if (m.estado === "nacasa" || m.estado === "saindo") {
            // Dentro ou saindo da casa: desenha normalmente mas semi-transparente
            contexto.save();
            contexto.globalAlpha = 0.7;
            desenharFantasma(contexto, cx, cy, raio, m.cor, false);
            contexto.restore();

        } else if (m.estado === "ativo") {
            desenharFantasma(contexto, cx, cy, raio, m.cor, poderAtivo);

        } else if (m.estado === "retornando") {
            // Apenas olhos — visualmente indica que está "morto" voltando
            contexto.save();
            contexto.globalAlpha = 0.85;
            desenharOlhos(contexto, cx, cy, raio);
            contexto.restore();
        }
    }
}

// ─── Colisão com monstro ──────────────────────────────────────────────────────

function verificarColisaoComMonstro() {
    for (let i = 0; i < monstros.length; i++) {
        let m = monstros[i];
        if (m.estado !== "ativo") continue; // só colide com fantasmas ativos

        if (jogador.coluna === m.coluna && jogador.linha === m.linha) {
            if (poderAtivo) {
                // Fantasma comido — vira "olhos" e retorna para a casa
                m.estado = "retornando";
                pontuacao += 200;
                atualizarPlacar();

            } else {
                vidas--;
                atualizarPlacar();
                desenharFeedback("Você foi capturado!", `Vidas restantes: ${vidas}`, "vermelho");
                setTimeout(() => {
                    jogador.coluna = 9;
                    jogador.linha  = 5;
                    resetarMonstros();
                    verificarDerrota();
                    atualizarTela();
                }, 1500);
            }
        }
    }
}

// ─── Verificação de colisão entre monstros ────────────────────────────────────

function temOutroMonstro(linhaTestada, colunaTestada, meuIndice) {
    for (let i = 0; i < monstros.length; i++) {
        if (i === meuIndice) continue;
        let m = monstros[i];
        if ((m.estado === "ativo" || m.estado === "saindo") &&
            m.linha === linhaTestada && m.coluna === colunaTestada) {
            return true;
        }
    }
    return false;
}

// ─── Movimento dos monstros ───────────────────────────────────────────────────

function moverMonstros() {
    const agora = Date.now();

    for (let i = 0; i < monstros.length; i++) {
        let m = monstros[i];

        // ── Na casa: aguarda o delay e começa a subir ─────────────────────────
        if (m.estado === "nacasa") {
            if (agora >= m.tickSaida) {
                m.estado = "saindo";
                // Centraliza na coluna de saída antes de subir
                m.coluna = COLUNA_SAIDA;
            }
            continue;
        }

        // ── Saindo: sobe linha por linha até a linha livre ────────────────────
        if (m.estado === "saindo") {
            if (m.linha > LINHA_FORA) {
                m.linha--;
            } else {
                m.estado = "ativo";
            }
            continue;
        }

        // ── Retornando: move direto para a entrada da casa (ignora paredes) ───
        if (m.estado === "retornando") {
            // Move em direção à coluna da saída, depois desce até o portão
            if (m.coluna !== COLUNA_SAIDA) {
                m.coluna += m.coluna < COLUNA_SAIDA ? 1 : -1;
            } else if (m.linha < LINHA_PORTAO) {
                m.linha++;
            } else {
                // Chegou ao portão — entra na casa e renasce
                m.linha  = posicoesNaCasa[i].linha;
                m.coluna = posicoesNaCasa[i].coluna;
                m.estado = "nacasa";
                m.tickSaida = Date.now() + 3000; // aguarda 3s dentro da casa
            }
            continue;
        }

        // ── Ativo: perseguição / fuga normal ─────────────────────────────────
        let possiveisMovimentos = [];

        const vizinhos = [
            { linha: m.linha - 1, coluna: m.coluna },
            { linha: m.linha + 1, coluna: m.coluna },
            { linha: m.linha, coluna: m.coluna - 1 },
            { linha: m.linha, coluna: m.coluna + 1 }
        ];

        for (let v of vizinhos) {
            let cel = labirinto[v.linha]?.[v.coluna];
            // Fantasmas ativos não entram na casa (valores 5 e 6) nem em paredes
            if (cel !== 1 && cel !== 5 && cel !== 6 &&
                !temOutroMonstro(v.linha, v.coluna, i)) {
                possiveisMovimentos.push(v);
            }
        }

        if (possiveisMovimentos.length === 0) continue;

        let melhorMovimento = null;
        let distRef = poderAtivo ? -1 : 9999;

        for (let mov of possiveisMovimentos) {
            let dist = Math.abs(jogador.coluna - mov.coluna) +
                       Math.abs(jogador.linha  - mov.linha);
            if (poderAtivo ? dist > distRef : dist < distRef) {
                distRef = dist;
                melhorMovimento = mov;
            }
        }

        if (melhorMovimento) {
            m.coluna = melhorMovimento.coluna;
            m.linha  = melhorMovimento.linha;
        }
    }

    verificarColisaoComMonstro();
    atualizarTela();
}

// ─── Movimento do jogador ─────────────────────────────────────────────────────

function moverJogador(evento) {
    let tecla = evento.key;
    let proximaColuna = jogador.coluna;
    let proximaLinha  = jogador.linha;

    if      (tecla === "ArrowUp"    || tecla === "w" || tecla === "W") { proximaLinha--;  jogador.direcao = "up";    }
    else if (tecla === "ArrowDown"  || tecla === "s" || tecla === "S") { proximaLinha++;  jogador.direcao = "down";  }
    else if (tecla === "ArrowLeft"  || tecla === "a" || tecla === "A") { proximaColuna--; jogador.direcao = "left";  }
    else if (tecla === "ArrowRight" || tecla === "d" || tecla === "D") { proximaColuna++; jogador.direcao = "right"; }

    let cel = labirinto[proximaLinha]?.[proximaColuna];

    // Jogador não pode entrar na casa (5) nem atravessar o portão (6) nem paredes (1)
    if (cel !== undefined && cel !== 1 && cel !== 5 && cel !== 6) {
        jogador.coluna = proximaColuna;
        jogador.linha  = proximaLinha;

        let item = labirinto[jogador.linha][jogador.coluna];
        if (item === 2) {
            labirinto[jogador.linha][jogador.coluna] = 0;
            pontuacao += 10;
            atualizarPlacar();
        } else if (item === 3) {
            labirinto[jogador.linha][jogador.coluna] = 0;
            pontuacao += 50;
            atualizarPlacar();
            ativarPoder();
        }
    }

    verificarColisaoComResposta();
    verificarColisaoComMonstro();
    atualizarTela();
}