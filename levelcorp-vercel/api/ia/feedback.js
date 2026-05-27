import { cors, autenticar, kpisDoColaborador, getClaude, getSupabase, log, MODELO, PROMPTS } from '../_lib/index.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ erro: 'método não permitido' });

  try {
    const usuario = await autenticar(req);
    if (!['supervisor', 'admin'].includes(usuario.papel)) {
      return res.status(403).json({ erro: 'acesso negado' });
    }

    const { colaborador_id } = req.body;
    if (!colaborador_id) return res.status(400).json({ erro: 'colaborador_id obrigatório' });

    // Verifica acesso
    if (usuario.papel === 'supervisor') {
      const sb = getSupabase();
      const { data: alvo } = await sb
        .from('colaboradores').select('supervisor_id').eq('id', colaborador_id).single();
      if (!alvo || alvo.supervisor_id !== usuario.id) {
        return res.status(403).json({ erro: 'colaborador fora da sua equipe' });
      }
    }

    const dados = await kpisDoColaborador(colaborador_id);
    if (!dados) return res.status(404).json({ erro: 'colaborador não encontrado' });

    const claude = getClaude();
    const resposta = await claude.messages.create({
      model: MODELO,
      max_tokens: 2000,
      system: PROMPTS.FEEDBACK,
      messages: [{ role: 'user', content: `Dados:\n${JSON.stringify(dados, null, 2)}` }]
    });
    const conteudo = resposta.content.filter(b => b.type === 'text').map(b => b.text).join('\n');

    // Salva no Supabase para auditoria
    const sb = getSupabase();
    const { data: salvo } = await sb.from('feedbacks_ia').insert({
      colaborador_id,
      solicitado_por_id: usuario.id,
      conteudo,
      dados_usados: dados,
      modelo_ia: MODELO,
      prompt_versao: 'v1',
    }).select('id, criado_em').single();

    await log(usuario.id, 'feedback_gerado', 'colaborador', colaborador_id, { feedback_id: salvo?.id });

    res.json({ id: salvo?.id, conteudo, criado_em: salvo?.criado_em });
  } catch (err) {
    res.status(err.status || 500).json({ erro: err.message || 'erro interno' });
  }
}
