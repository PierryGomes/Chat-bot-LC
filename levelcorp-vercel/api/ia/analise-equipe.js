import { cors, autenticar, kpisDaEquipe, getClaude, getSupabase, log, MODELO, PROMPTS } from '../_lib/index.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ erro: 'método não permitido' });

  try {
    const usuario = await autenticar(req);
    if (!['supervisor', 'admin'].includes(usuario.papel)) {
      return res.status(403).json({ erro: 'acesso negado' });
    }

    const supervisorId = usuario.id;
    const equipe = await kpisDaEquipe(supervisorId);
    if (!equipe.length) return res.status(400).json({ erro: 'equipe vazia' });

    const claude = getClaude();
    const resposta = await claude.messages.create({
      model: MODELO,
      max_tokens: 2500,
      system: PROMPTS.ANALISE,
      messages: [{ role: 'user', content: `Equipe:\n${JSON.stringify(equipe, null, 2)}` }]
    });
    const texto = resposta.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
      .replace(/```json|```/g, '').trim();

    let resultado;
    try { resultado = JSON.parse(texto); }
    catch { resultado = { erro: 'falha_parse', raw: texto }; }

    const sb = getSupabase();
    const { data: salvo } = await sb.from('analises_ia').insert({
      supervisor_id: supervisorId,
      resultado,
      dados_usados: equipe,
      modelo_ia: MODELO,
      prompt_versao: 'v1',
    }).select('id, criado_em').single();

    await log(usuario.id, 'analise_equipe_gerada', 'equipe', supervisorId, { analise_id: salvo?.id });

    res.json({ id: salvo?.id, resultado, criado_em: salvo?.criado_em });
  } catch (err) {
    res.status(err.status || 500).json({ erro: err.message || 'erro interno' });
  }
}
