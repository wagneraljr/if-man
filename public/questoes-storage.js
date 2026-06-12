/* =============================================================================
   questoes-storage.js — Módulo de persistência de questões (via API)
   
   Interface idêntica à versão anterior com localStorage.
   Agora as operações são síncronas por compatibilidade com o painel-professor,
   que chama renderizarLista() diretamente após cada operação.
   O painel-professor foi atualizado para usar as versões async abaixo.
   ============================================================================= */

const CATEGORIA_PADRAO = "Informática Básica";

function normalizarCategoriaQuestao(categoria) {
    const texto = (categoria || "").trim();
    if (!texto || texto.toLowerCase() === "todas") return CATEGORIA_PADRAO;
    return texto;
}

function normalizarQuestao(questao = {}) {
    return {
        ...questao,
        categoria: normalizarCategoriaQuestao(questao.categoria)
    };
}

function normalizarListaQuestoes(questoes = []) {
    return questoes.map(normalizarQuestao);
}

function listarCategoriasQuestoes(questoes = []) {
    const categorias = new Set();
    for (const questao of normalizarListaQuestoes(questoes)) {
        categorias.add(questao.categoria);
    }
    return ["Todas", ...Array.from(categorias).sort((a, b) => a.localeCompare(b, "pt-BR"))];
}

function preencherSelectCategorias(select, categorias, categoriaSelecionada = "Todas") {
    if (!select) return;
    const lista = categorias && categorias.length ? categorias : ["Todas", CATEGORIA_PADRAO];
    select.innerHTML = lista.map(categoria => `
        <option value="${categoria}" ${categoria === categoriaSelecionada ? "selected" : ""}>${categoria}</option>
    `).join("");
}

function filtrarQuestoesPorCategoria(questoes = [], categoria = "Todas") {
    const lista = normalizarListaQuestoes(questoes);
    const filtro = (categoria || "Todas").trim() || "Todas";
    if (filtro === "Todas") return lista;
    return lista.filter(questao => questao.categoria === filtro);
}

// ── Funções assíncronas (usadas pelo painel-professor.html) ───────────────────

async function obterQuestoes() {
    const res = await fetch("/api/questoes");
    if (!res.ok) throw new Error("Erro ao buscar questões");
    return normalizarListaQuestoes(await res.json());
}

async function obterCategoriasQuestoes() {
    return listarCategoriasQuestoes(await obterQuestoes());
}

async function adicionarQuestao(questao) {
    const res = await fetch("/api/questoes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(normalizarQuestao(questao))
    });
    if (!res.ok) throw new Error("Erro ao adicionar questão");
    return res.json();
}

async function atualizarQuestao(questao) {
    const res = await fetch(`/api/questoes/${questao.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(normalizarQuestao(questao))
    });
    if (!res.ok) throw new Error("Erro ao atualizar questão");
    return res.json();
}

async function excluirQuestao(id) {
    const res = await fetch(`/api/questoes/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erro ao excluir questão");
}