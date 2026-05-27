import { cors, autenticar, kpisDaEquipe, kpisDoColaborador, getClaude, MODELO, PROMPTS } from '../_lib/index.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ erro: 'método não permitido' });

  try {
    const usuario = await autenticar(req);
    const { mensagem, historico = [], contexto = {} } = req.body;
    if (!mensagem) return res.status(400).json({ erro: 'mensagem obrigatória' });

    let dadosContexto = {};
    if (usuario.papel === 'supervisor') {
      dadosContexto.equipe = await kpisDaEquipe(usuario.id);
    } else if (usuario.papel === 'colaborador') {
      dadosContexto.meus_dados = await kpisDoColaborador(usuario.id);
    }

    const historicoStr = historico.slice(-6)
      .map(m => `${m.role === 'user' ? 'Usuário' : 'Copiloto'}: ${m.content}`).join('\n');

    const prompt = `Usuário: ${usuario.nome} (${usuario.papel})
Contexto: ${JSON.stringify({ ...contexto, ...dadosContexto }, null, 2)}
${historicoStr ? `\nHistórico recente:\n${historicoStr}\n` : ''}
Mensagem: ${mensagem}`;

    const claude = getClaude();
    const resposta = await claude.messages.create({
      model: MODELO,
      max_tokens: 1500,
      system: PROMPTS.CHAT,
      messages: [{ role: 'user', content: prompt }]
    });

    const texto = resposta.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    res.json({ resposta: texto });
  } catch (err) {
    res.status(err.status || 500).json({ erro: err.message || 'erro interno' });
  }
}
