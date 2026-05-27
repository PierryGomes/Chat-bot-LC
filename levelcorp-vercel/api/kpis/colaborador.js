import { cors, autenticar, kpisDoColaborador, getSupabase, log } from '../../_lib/index.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ erro: 'método não permitido' });

  try {
    const usuario = await autenticar(req);
    const alvoId = parseInt(req.query.id);
    const dias = parseInt(req.query.dias) || 30;

    // Regra de acesso
    if (usuario.papel === 'colaborador' && alvoId !== usuario.id) {
      return res.status(403).json({ erro: 'sem permissão' });
    }
    if (usuario.papel === 'supervisor') {
      const sb = getSupabase();
      const { data: alvo } = await sb
        .from('colaboradores').select('supervisor_id').eq('id', alvoId).single();
      if (!alvo || alvo.supervisor_id !== usuario.id) {
        return res.status(403).json({ erro: 'colaborador fora da sua equipe' });
      }
    }

    const kpis = await kpisDoColaborador(alvoId, dias);
    if (!kpis) return res.status(404).json({ erro: 'não encontrado' });

    await log(usuario.id, 'kpi_individual_consultado', 'colaborador', alvoId);
    res.json(kpis);
  } catch (err) {
    res.status(err.status || 500).json({ erro: err.message || 'erro interno' });
  }
}
