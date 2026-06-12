# IF-Man - Quiz Pac-Man Educacional

Ferramenta didática gamificada para os cursos técnicos do IF Sudeste MG, campus Juiz de Fora.

O projeto transforma resolução de questões em uma experiência de jogo inspirada no Pac-Man, com foco em aprendizagem ativa, engajamento em sala e acompanhamento de desempenho.

## Objetivo do projeto

O IF-Man foi criado para apoiar aulas de disciplinas técnicas e de informática por meio de:

- Revisao de conteudos com perguntas objetivas organizadas por categoria.
- Aprendizagem por tentativa e erro com feedback imediato.
- Motivacao por gamificacao (pontuacao, vidas, combo e ranking).
- Acompanhamento de turmas em modo competicao com painel do professor.

## Visao geral do processo

### 1) Preparacao pelo professor

1. O professor acessa o painel administrativo.
2. Faz login com senha de professor.
3. Cadastra, edita e organiza questoes por categoria.
4. Configura e inicia uma competicao (duracao e categoria).

### 2) Entrada dos alunos

1. Alunos entram na sala de espera com nome.
2. O jogo inicia quando a competicao e ativada.
3. Cada aluno responde questoes navegando no mapa e escolhendo alternativas.

### 3) Dinamica de jogo

1. Acerto: ganha pontos, combo e bonus de exploracao.
2. Erro/captura: perde vida e combo pode ser zerado.
3. Feedback visual no canvas e retomada controlada por confirmacao.
4. Quando as questoes acabam, o banco e reembaralhado e as perguntas se repetem sem zerar a pontuacao acumulada.

### 4) Acompanhamento e resultado

1. O servidor recebe pontuacao periodicamente.
2. O professor acompanha ranking em tempo real.
3. Ao encerrar, o historico da competicao e salvo.
4. Aluno visualiza resultado final.

## Arquitetura e organizacao dos arquivos

Estrutura principal do projeto:

```text
if-man/
  data/
    config.json
    historico.json
    questoes.json
  public/
    competicao.js
    entidades.js
    estilo.css
    historico.html
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

Armazena persistencia local em JSON:

- config.json: configuracoes e hash da senha do professor.
- questoes.json: banco de questoes usado no jogo.
- historico.json: historico das competicoes finalizadas.

### Pasta public/

Camada de interface e logica de cliente:

- jogo.html: tela principal do jogo.
- quiz.js: fluxo das questoes, feedback, pontuacao e progresso.
- entidades.js: jogador, monstros e colisoes.
- motor.js: loop da rodada, HUD, velocidade e controle de inicio/pausa.
- mapa.js: geracao e renderizacao de mapa.
- questoes-storage.js: funcoes para consumir API de questoes.
- competicao.js: polling de estado da competicao e envio de pontuacao.
- painel-professor.html: CRUD de questoes, filtros e paginacao.
- painel-competicao.html: configuracao e controle da competicao.
- historico.html: consulta de historico e resultados passados.
- setup.html/login.html/index.html/sala-espera.html/resultado-aluno.html: fluxo de acesso e telas auxiliares.

### Pasta server/

- app.js: servidor HTTP Node.js sem framework externo, responsavel por:
  - servir arquivos estaticos,
  - autenticar professor,
  - gerenciar questoes,
  - controlar estado da competicao,
  - registrar historico e ranking,
  - expor API REST usada pelo front-end.

## Como executar localmente

### Requisitos

- Node.js 18+ (recomendado).

### Passos

1. Instale dependencias:

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
- Professor: login em login.html e acesso ao painel.
- Configuracao de senha: setup.html.

## API principal (resumo)

### Autenticacao

- POST /api/login
- POST /api/alterar-senha

### Questoes

- GET /api/questoes
- POST /api/questoes
- PUT /api/questoes/:id
- DELETE /api/questoes/:id

### Competicao

- GET /api/estado
- POST /api/iniciar
- POST /api/encerrar
- POST /api/resetar
- POST /api/pontuacao
- POST /api/pontuacao-final
- GET /api/placar
- GET /api/resultado-aluno?nome=...

### Sala de espera

- POST /api/entrar-sala
- GET /api/sala

### Historico

- GET /api/historico
- GET /api/historico/:id
- DELETE /api/historico/:id

## Dados padrao importantes

- Porta do servidor: 3000.
- Senha inicial de professor: ifmg2024.
- Categoria padrao: Informatica Basica.

## Uso didatico sugerido

- Revisao antes de avaliacao.
- Atividade de aquecimento no inicio da aula.
- Torneios curtos por categoria para fixacao.
- Analise de desempenho por turma com base no historico.
