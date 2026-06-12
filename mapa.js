// ─── Convenções ────────────────────────────────────────────────────────────────
// 0 = corredor (vira pontinho)   1 = parede     2 = pontinho pequeno
// 3 = pontinho grande            4 = sala resp  5 = interior da casa
// 6 = portão da casa (apenas fantasmas passam)
//
// Grade: 19 × 15 | tamanhoBloco = 40px | canvas = 760 × 600px
// Casa dos fantasmas: fixa em rows 6-9, cols 7-11 (sobreposta em todos os mapas)

// ─── Mapas ────────────────────────────────────────────────────────────────────

const mapa1 = {
    posicoes: [
        { coluna: 1, linha: 1 }, { coluna: 15, linha: 1 },
        { coluna: 1, linha: 12 }, { coluna: 15, linha: 12 }
    ],
    layout: [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 4, 1],
        [1, 4, 4, 4, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 4, 4, 4, 1],
        [1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
        [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
        [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1],
        [1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1],
        [1, 4, 4, 4, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 4, 4, 4, 1],
        [1, 4, 4, 4, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 4, 4, 4, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ]
};

const mapa2 = {
    posicoes: [
        { coluna: 3, linha: 3 }, { coluna: 13, linha: 3 },
        { coluna: 3, linha: 10 }, { coluna: 13, linha: 10 }
    ],
    layout: [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 4, 4, 4, 1, 0, 0, 0, 0, 0, 1, 4, 4, 4, 1, 0, 1],
        [1, 0, 1, 4, 4, 4, 1, 0, 1, 1, 1, 0, 1, 4, 4, 4, 1, 0, 1],
        [1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1],
        [1, 0, 1, 4, 4, 4, 1, 0, 1, 1, 1, 0, 1, 4, 4, 4, 1, 0, 1],
        [1, 0, 1, 4, 4, 4, 1, 0, 0, 0, 0, 0, 1, 4, 4, 4, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ]
};

const mapa3 = {
    posicoes: [
        { coluna: 1, linha: 1 }, { coluna: 15, linha: 1 },
        { coluna: 1, linha: 12 }, { coluna: 15, linha: 12 }
    ],
    layout: [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 4, 4, 4, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 4, 4, 4, 1],
        [1, 4, 4, 4, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 4, 4, 4, 1],
        [1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1],
        [1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1],
        [1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1],
        [1, 4, 4, 4, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 4, 4, 4, 1],
        [1, 4, 4, 4, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 4, 4, 4, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ]
};

const mapa4 = {
    posicoes: [
        { coluna: 3, linha: 2 }, { coluna: 13, linha: 2 },
        { coluna: 3, linha: 11 }, { coluna: 13, linha: 11 }
    ],
    layout: [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 4, 4, 4, 1, 0, 1, 1, 1, 0, 1, 4, 4, 4, 1, 0, 1],
        [1, 0, 1, 4, 4, 4, 1, 0, 0, 0, 0, 0, 1, 4, 4, 4, 1, 0, 1],
        [1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1],
        [1, 0, 1, 4, 4, 4, 1, 0, 0, 0, 0, 0, 1, 4, 4, 4, 1, 0, 1],
        [1, 0, 1, 4, 4, 4, 1, 0, 1, 1, 1, 0, 1, 4, 4, 4, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ]
};

// ─── Mapa 5: O Labirinto Espiral ──────────────────────────────────────────────
// Caminhos que contornam a casa dos fantasmas central, criando
// rotas mais longas e estratégicas para chegar às salas de resposta.
const mapa5 = {
    posicoes: [
        { coluna: 1, linha: 1 }, { coluna: 15, linha: 1 },
        { coluna: 1, linha: 11 }, { coluna: 15, linha: 11 }
    ],
    layout: [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 4, 1],
        [1, 4, 4, 4, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 4, 4, 4, 1],
        [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
        [1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1],
        [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
        [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
        [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
        [1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1],
        [1, 4, 4, 4, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 4, 4, 4, 1],
        [1, 4, 4, 4, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 4, 4, 4, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ]
};

const bancoDeMapas = [mapa1, mapa2, mapa3, mapa4, mapa5];

let labirinto = [];
let posicoesRespostasAtuais = [];
const tamanhoBloco = 40;
const LARGURA_SALA = 3;
const ALTURA_SALA  = 2;

let frameTick = 0;
let ultimoMapaIndex = -1; // evita repetição do mesmo mapa

// ─── Montagem do labirinto ────────────────────────────────────────────────────

function sortearMapaDaRodada() {
    // Sorteia excluindo o mapa da rodada anterior
    let indicios = Array.from({ length: bancoDeMapas.length }, (_, i) => i)
                       .filter(i => i !== ultimoMapaIndex);
    let indiceSorteado = indicios[Math.floor(Math.random() * indicios.length)];
    ultimoMapaIndex    = indiceSorteado;
    let mapaEscolhido  = bancoDeMapas[indiceSorteado];

    // Converte valores do layout: 0→pontinho(2), 4→livre(0), resto mantém
    labirinto = [];
    for (let i = 0; i < mapaEscolhido.layout.length; i++) {
        let novaLinha = [];
        for (let j = 0; j < mapaEscolhido.layout[i].length; j++) {
            let v = mapaEscolhido.layout[i][j];
            novaLinha.push(v === 0 ? 2 : v === 4 ? 0 : v);
        }
        labirinto.push(novaLinha);
    }

    // ── Casa dos fantasmas (fixa em todos os mapas) ──────────────────────────
    // Linha 6: teto com portão
    labirinto[6][7]  = 1;  // parede esq
    labirinto[6][8]  = 1;  // parede
    labirinto[6][9]  = 6;  // portão (apenas fantasmas passam)
    labirinto[6][10] = 1;  // parede
    labirinto[6][11] = 1;  // parede dir
    // Linhas 7-8: interior
    for (let r = 7; r <= 8; r++) {
        labirinto[r][7]  = 1;  // parede esq
        labirinto[r][8]  = 5;  // interior
        labirinto[r][9]  = 5;  // interior
        labirinto[r][10] = 5;  // interior
        labirinto[r][11] = 1;  // parede dir
    }
    // Linha 9: chão
    for (let c = 7; c <= 11; c++) labirinto[9][c] = 1;

    // Pontos grandes nas extremidades
    labirinto[5][1]  = 3;
    labirinto[5][17] = 3;
    labirinto[9][1]  = 3;
    labirinto[9][17] = 3;

    // Posição do jogador fica livre (sem pontinho)
    labirinto[5][9] = 0;

    // Embaralha posições das salas de resposta
    let posicoesEmbaralhadas = [...mapaEscolhido.posicoes];
    for (let i = posicoesEmbaralhadas.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [posicoesEmbaralhadas[i], posicoesEmbaralhadas[j]] =
        [posicoesEmbaralhadas[j], posicoesEmbaralhadas[i]];
    }
    posicoesRespostasAtuais = posicoesEmbaralhadas;
}

// ─── Desenho do mapa ──────────────────────────────────────────────────────────

function desenharParede(ctx, x, y, tam) {
    ctx.fillStyle = "#00008b";
    ctx.fillRect(x, y, tam, tam);
    const b = 3;
    ctx.strokeStyle = "#4466ff";
    ctx.lineWidth = b;
    ctx.strokeRect(x + b/2, y + b/2, tam - b, tam - b);
    ctx.fillStyle = "rgba(100,140,255,0.25)";
    ctx.fillRect(x, y, tam, b);
    ctx.fillRect(x, y, b, tam);
    ctx.fillStyle = "rgba(0,0,60,0.5)";
    ctx.fillRect(x, y + tam - b, tam, b);
    ctx.fillRect(x + tam - b, y, b, tam);
}

function desenharPontoPequeno(ctx, cx, cy) {
    let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 6);
    g.addColorStop(0, "rgba(255,220,180,1)");
    g.addColorStop(0.5, "rgba(255,180,100,0.6)");
    g.addColorStop(1, "rgba(255,180,100,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#ffddaa";
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI*2); ctx.fill();
}

function desenharPontoGrande(ctx, cx, cy, tick) {
    let pulso = 9 + Math.sin(tick * 0.15) * 2.5;
    let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulso*2);
    g.addColorStop(0, "rgba(255,255,200,0.9)");
    g.addColorStop(0.4, "rgba(255,220,80,0.5)");
    g.addColorStop(1, "rgba(255,200,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, pulso*2, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#fffbe0";
    ctx.beginPath(); ctx.arc(cx, cy, pulso, 0, Math.PI*2); ctx.fill();
}

function desenharMapa(contexto) {
    frameTick++;
    const bs = tamanhoBloco;
    for (let linha = 0; linha < labirinto.length; linha++) {
        for (let coluna = 0; coluna < labirinto[linha].length; coluna++) {
            let valor = labirinto[linha][coluna];
            let x = coluna * bs, y = linha * bs;
            let cx = x + bs/2, cy = y + bs/2;

            if (valor === 1) {
                desenharParede(contexto, x, y, bs);

            } else if (valor === 2) {
                desenharPontoPequeno(contexto, cx, cy);

            } else if (valor === 3) {
                desenharPontoGrande(contexto, cx, cy, frameTick);

            } else if (valor === 5) {
                // Interior da casa — mesmo fundo escuro do corredor
                contexto.fillStyle = "#000010";
                contexto.fillRect(x, y, bs, bs);

            } else if (valor === 6) {
                // Portão — fundo escuro com barra azul discreta (mesma cor das paredes)
                contexto.fillStyle = "#000010";
                contexto.fillRect(x, y, bs, bs);
                contexto.strokeStyle = "#4466ff";
                contexto.lineWidth = 3;
                contexto.beginPath();
                contexto.moveTo(x + 4, cy);
                contexto.lineTo(x + bs - 4, cy);
                contexto.stroke();
            }
        }
    }
}