// api/_lib/index.js
// Helpers compartilhados entre todas as serverless functions

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

// ── Supabase (service role — nunca expor no frontend) ──────
export function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// ── Anthropic ──────────────────────────────────────────────
export function getClaude() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export const MODELO = 'claude-sonnet-4-20250514';

// ── CORS helper ────────────────────────────────────────────
export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');
}

// ── Auth: valida x-user-id e retorna usuário ───────────────
export async function autenticar(req) {
  const userId = req.headers['x-user-id'];
  if (!userId) throw { status: 401, message: 'não autenticado' };

  const sb = getSupabase();
  const { data: user, error } = await sb
    .from('colaboradores')
    .select('id, nome, papel, supervisor_id')
    .eq('id', userId)
    .eq('ativo', true)
    .single();

  if (error || !user) throw { status: 401, message: 'usuário inválido' };
  return user;
}

// ── KPIs: calcula a partir da tabela tarefas ───────────────
export async function kpisDoColaborador(colaboradorId, diasAtras = 30) {
  const sb = getSupabase();

  const { data: info } = await sb
    .from('colaboradores')
    .select('id, nome, cargo, supervisor_id')
    .eq('id', colaboradorId)
    .single();

  if (!info) return null;

  const desde = new Date();
  desde.setDate(desde.getDate() - diasAtras);

  const { data: tarefas } = await sb
    .from('tarefas')
    .select('status, prazo, concluida_em, complexidade')
    .eq('responsavel_id', colaboradorId)
    .eq('status', 'concluida')
    .gte('criada_em', desde.toISOString());

  const total = tarefas?.length || 0;
  const noPrazo = tarefas?.filter(t => t.concluida_em && t.prazo && new Date(t.concluida_em) <= new Date(t.prazo)).length || 0;
  const atrasadas = tarefas?.filter(t => t.concluida_em && t.prazo && new Date(t.concluida_em) > new Date(t.prazo)) || [];
  const atrasoMedio = atrasadas.length > 0
    ? atrasadas.reduce((s, t) => s + (new Date(t.concluida_em) - new Date(t.prazo)) / 3600000, 0) / atrasadas.length
    : 0;

  // Complexidade mais comum
  const complexidades = tarefas?.map(t => t.complexidade).filter(Boolean) || [];
  const complexidadeMedia = complexidades.length > 0
    ? Object.entries(complexidades.reduce((acc, c) => ({ ...acc, [c]: (acc[c] || 0) + 1 }), {}))
        .sort((a, b) => b[1] - a[1])[0][0]
    : 'media';

  return {
    id: info.id,
    nome: info.nome,
    cargo: info.cargo,
    supervisor: info.supervisor_id,
    tarefas_30d: total,
    no_prazo: noPrazo,
    atraso_medio_h: Math.round(atrasoMedio),
    complexidade_media: complexidadeMedia,
    participacao_reunioes: 'consistente', // TODO: integrar calendário
    ultimo_1on1: null,
  };
}

export async function kpisDaEquipe(supervisorId, diasAtras = 30) {
  const sb = getSupabase();
  const { data: equipe } = await sb
    .from('colaboradores')
    .select('id')
    .eq('supervisor_id', supervisorId)
    .eq('ativo', true);

  if (!equipe?.length) return [];
  const kpis = await Promise.all(equipe.map(c => kpisDoColaborador(c.id, diasAtras)));
  return kpis.filter(Boolean);
}

// ── Auditoria ──────────────────────────────────────────────
export async function log(usuarioId, acao, alvoTipo, alvoId, meta = {}) {
  try {
    const sb = getSupabase();
    await sb.from('log_auditoria').insert({
      usuario_id: usuarioId, acao, alvo_tipo: alvoTipo, alvo_id: alvoId, metadados: meta
    });
  } catch {}
}

// ── System Prompts ─────────────────────────────────────────
export const PROMPTS = {
  FEEDBACK: `Você é o sistema operacional da LevelCorp gerando feedback individual.
REGRAS: Nunca invente dados. Diferencie baixa produtividade vs sobrecarga vs falha de gestão.
Use "há sinais de" para hipóteses. Sem bajulação genérica.

ESTRUTURA (markdown):
## Pontos fortes (com evidência)
## Pontos a desenvolver (com evidência)
## Evolução recente
## Impacto no time
## Recomendações práticas (3 ações)
## Lacunas de dados`,

  ANALISE: `Analista operacional da LevelCorp. Retorne JSON estrito:
{"gargalos":[{"titulo":"","severidade":"alta|media|baixa","evidencia":"","responsavel_sugerido":""}],
"riscos":[{"tipo":"burnout|sobrecarga|desalinhamento|prazo","pessoa_ou_area":"","sinais":""}],
"padroes":[{"observacao":"","implicacao":""}],"lacunas_de_dados":[]}`,

  CONSELHO: `Conselho executivo crítico. Cada membro DEVE discordar quando fizer sentido.
Retorne JSON estrito:
{"decisao_analisada":"","executivos":[
{"papel":"CEO","posicao":"favoravel|contra|condicional","argumento":"","discorda_de":null},
{"papel":"CFO","posicao":"","argumento":"","discorda_de":null},
{"papel":"COO","posicao":"","argumento":"","discorda_de":null},
{"papel":"CPO","posicao":"","argumento":"","discorda_de":null},
{"papel":"Crítico","posicao":"contra","argumento":"","discorda_de":"todos"}],
"sintese_presidente":{"recomendacao":"","principal_risco_residual":"","condicoes_para_seguir":[]}}`,

  CHAT: `Copiloto operacional da LevelCorp. Direto, sem bajulação.
Se faltar dado, faça UMA pergunta específica. Aponte lógica fraca quando perceber.
Nunca invente dados que não estejam no contexto.`,
};
