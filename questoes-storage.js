/* =============================================================================
   questoes-storage.js — Módulo de persistência de questões (via API)
   
   Interface idêntica à versão anterior com localStorage.
   Agora as operações são síncronas por compatibilidade com o painel-professor,
   que chama renderizarLista() diretamente após cada operação.
   O painel-professor foi atualizado para usar as versões async abaixo.
   ============================================================================= */

// ── Funções assíncronas (usadas pelo painel-professor.html) ───────────────────

async function obterQuestoes() {
    const res = await fetch("/api/questoes");
    if (!res.ok) throw new Error("Erro ao buscar questões");
    return res.json();
}

async function adicionarQuestao(questao) {
    const res = await fetch("/api/questoes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(questao)
    });
    if (!res.ok) throw new Error("Erro ao adicionar questão");
    return res.json();
}

async function atualizarQuestao(questao) {
    const res = await fetch(`/api/questoes/${questao.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(questao)
    });
    if (!res.ok) throw new Error("Erro ao atualizar questão");
    return res.json();
}

async function excluirQuestao(id) {
    const res = await fetch(`/api/questoes/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erro ao excluir questão");
}

async function restaurarPadrao() {
    const res = await fetch("/api/questoes/restaurar", { method: "POST" });
    if (!res.ok) throw new Error("Erro ao restaurar questões");
}