import { cors, autenticar, getClaude, log, MODELO, PROMPTS } from '../_lib/index.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ erro: 'método não permitido' });

  try {
    const usuario = await autenticar(req);
    if (!['supervisor', 'admin'].includes(usuario.papel)) {
      return res.status(403).json({ erro: 'acesso negado' });
    }

    const { decisao } = req.body;
    if (!decisao) return res.status(400).json({ erro: 'decisao obrigatória' });

    const claude = getClaude();
    const resposta = await claude.messages.create({
      model: MODELO,
      max_tokens: 2500,
      system: PROMPTS.CONSELHO,
      messages: [{ role: 'user', content: decisao }]
    });
    const texto = resposta.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
      .replace(/```json|```/g, '').trim();

    let resultado;
    try { resultado = JSON.parse(texto); }
    catch { resultado = { erro: 'falha_parse', raw: texto }; }

    await log(usuario.id, 'conselho_consultado', null, null, { decisao });
    res.json(resultado);
  } catch (err) {
    res.status(err.status || 500).json({ erro: err.message || 'erro interno' });
  }
}
