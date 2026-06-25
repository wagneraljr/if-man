# IF-Man - Quiz Pac-Man Educacional

Ferramenta didática gamificada para os cursos técnicos do IF Sudeste MG, campus Juiz de Fora.

O projeto transforma resolução de questões em uma experiência de jogo inspirada no Pac-Man, com foco em aprendizagem ativa, engajamento em sala e acompanhamento de desempenho.

## Objetivo do projeto

O IF-Man foi criado para apoiar aulas de disciplinas técnicas e de informática por meio de:

- Revisão de conteudos com perguntas objetivas organizadas por categoria.
- Aprendizagem por tentativa e erro com feedback imediato.
- Motivação por gamificacão (pontuacão, vidas, combo e ranking).
- Acompanhamento de turmas em modo competição com painel do professor.

## Visão geral do processo

### 1) Preparação pelo professor

1. O professor acessa o painel administrativo.
2. Faz login com senha de professor.
3. Cadastra, edita e organiza questões por categoria.
4. Configura e inicia uma competição (duração e categoria).

### 2) Entrada dos alunos

1. Alunos entram na sala de espera com nome.
2. O jogo inicia quando a competição é ativada.
3. Cada aluno responde questões navegando no mapa e escolhendo alternativas.

### 3) Dinâmica de jogo

1. Acerto: ganha pontos, combo e bônus de exploração.
2. Erro/captura: perde vida e combo pode ser zerado.
3. Feedback visual no canvas e retomada controlada por confirmação.
4. Se as questões acabarem, o banco é reembaralhado e as perguntas se repetem sem zerar a pontuação acumulada.

### 4) Acompanhamento e resultado

1. O servidor recebe a pontuação periodicamente.
2. O professor acompanha o ranking em tempo real.
3. Ao encerrar, o histórico da competição e salvo.
4. Aluno visualiza o resultado final.

## Arquitetura e organização dos arquivos

Estrutura principal do projeto:

```text
if-man/
  data/
    config.json
    historico.json
    questoes.json
  public/
    aluno-cadastro.html
    aluno-conta.html
    aluno-config.html
    aluno-login.html
    competicao.js
    entidades.js
    estilo.css
    historico.html
    historico-aluno.html
    index.html
    jogo.html
    login.html
    mapa.js
    motor.js
    painel-competicao.html
    painel-professor.html
    questoes-storage.js
    quiz.js
    resultado-aluno.html
    sala-espera.html
    setup.html
  server/
    app.js
  package.json
```

### Pasta data/

Armazena persistência local em JSON:

- config.json: configurações e hash da senha do professor.
- questoes.json: banco de questões usado no jogo.
- historico.json: histórico das competições finalizadas.

### Pasta public/

Camada de interface e lógica de cliente:

- jogo.html: tela principal do jogo.
- quiz.js: fluxo das questões, feedback, pontuação e progresso.
- entidades.js: jogador, monstros e colisões.
- motor.js: loop da rodada, HUD, velocidade e controle de início/pausa.
- mapa.js: geração e renderização de mapa.
- questoes-storage.js: funções para consumir API de questões.
- competicao.js: polling de estado da competição e envio de pontuação.
- painel-professor.html: CRUD de questões, filtros e paginação.
- painel-competicao.html: configuração e controle da competição.
- historico.html: consulta de histórico e resultados passados.
- setup.html/login.html/index.html/sala-espera.html/resultado-aluno.html: fluxo de acesso e telas auxiliares.

### Pasta server/

- app.js: servidor HTTP Node.js sem framework externo, responsável por:
  - servir arquivos estáticos,
  - autenticar professor,
  - gerenciar questões,
  - controlar estado da competição,
  - registrar histórico e ranking,
  - expor API REST usada pelo front-end.

## Como executar localmente

### Requisitos

- Node.js 18+ (recomendado).

### Passos

1. Instale dependências:

```bash
npm install
```

2. Inicie o servidor:

```bash
npm start
```

3. Acesse no navegador:

- http://localhost:3000

## Fluxo de acesso

- Aluno: entra por index.html e segue para sala de espera/jogo.
- Aluno com conta: login em aluno-login.html, cadastro em aluno-cadastro.html e central de conta em aluno-conta.html.
- Professor: login em login.html e acesso ao painel.
- Configuração de senha: setup.html.

## API principal (resumo)

### Autenticação

- POST /api/login
- POST /api/alterar-senha
- POST /api/alunos/cadastro
- POST /api/alunos/login
- GET /api/alunos/:id
- POST /api/alunos/atualizar-perfil

### Questões

- GET /api/questoes
- POST /api/questoes
- PUT /api/questoes/:id
- DELETE /api/questoes/:id

### Competição

- GET /api/estado
- POST /api/iniciar
- POST /api/encerrar
- POST /api/resetar
- POST /api/pontuacao
- POST /api/pontuacao-final
- GET /api/placar
- GET /api/resultado-aluno?nome=...

Observação: competição agora exige aluno autenticado (via alunoId). O modo livre continua funcionando com ou sem login.

### Histórico do aluno

- GET /api/alunos/:id/historico

### Sala de espera

- POST /api/entrar-sala
- GET /api/sala

### Histórico

- GET /api/historico
- GET /api/historico/:id
- DELETE /api/historico/:id

## Dados padrão importantes

- Porta do servidor: 3000.
- Senha inicial de professor: ifmg2026.
- Categoria padrão: Informática Básica.

## Uso didático sugerido

- Revisão antes de avaliação.
- Atividade de aquecimento no início da aula.
- Torneios curtos por categoria para fixação.
- Análise de desempenho por turma com base no histórico.

## Testes manuais de layout responsivo

O jogo agora usa configuração central de layout em `window.CONFIG_LAYOUT_JOGO` (definida em `public/jogo.html`) e botão de início desenhado no próprio canvas.

### Pré-condição

1. Inicie o projeto com `npm start`.
2. Abra `http://localhost:3000/jogo.html`.
3. Abra o DevTools (F12) para simular larguras de tela quando necessário.

### 1) Fluxo de início da rodada (sem regressão)

1. Com a rodada pausada, confirme que aparece o botão "▶ INICIAR RODADA" dentro do canvas.
2. Clique no botão desenhado no canvas e valide que a rodada inicia normalmente.
3. Pause por erro/captura e confirme que o botão volta a aparecer dentro do canvas.
4. Com o botão visível, pressione Enter e confirme que também inicia normalmente.

### 2) HUD de vidas compacto

1. Valide que o HUD mostra `❤ × N` (ou `☠ × 0`) em vez de múltiplos corações repetidos.
2. Force ganho e perda de vidas durante a partida e confirme atualização imediata do contador.

### 3) Presets de mapa para validar escala futura

No console do navegador, execute:

```js
aplicarPresetLayoutMapa('pequeno');
aplicarPresetLayoutMapa('medio');
aplicarPresetLayoutMapa('grande');
restaurarLayoutMapaAtual();
```

Critérios esperados:

1. `pequeno` (19x15): canvas não deve estourar a largura nem altura disponíveis.
2. `medio` (24x18): deve reduzir escala sem sobrepor o painel superior.
3. `grande` (30x22): deve permanecer navegável visualmente sem corte lateral.
4. `restaurarLayoutMapaAtual()` deve retornar ao tamanho do mapa da rodada.

### 4) Larguras-alvo para validação

Repita os testes acima em 3 faixas de tela:

1. Desktop: 1366x768 (ou superior).
2. Tablet: 768x1024.
3. Mobile: 390x844 (ou largura próxima de 360-430px).

Critérios gerais:

1. O painel de pergunta permanece alinhado com a largura escalada do canvas.
2. Botões flutuantes (sair, conta, d-pad touch) continuam acessíveis.
3. Feedback no canvas (OK, acerto/erro) continua funcional.
