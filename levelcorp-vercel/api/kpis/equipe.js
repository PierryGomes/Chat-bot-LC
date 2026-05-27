import { cors, autenticar, kpisDaEquipe, log } from '../_lib/index.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ erro: 'método não permitido' });

  try {
    const usuario = await autenticar(req);
    if (!['supervisor', 'admin'].includes(usuario.papel)) {
      return res.status(403).json({ erro: 'acesso negado' });
    }

    const dias = parseInt(req.query.dias) || 30;
    const supervisorId = usuario.papel === 'admin' && req.query.supervisor_id
      ? req.query.supervisor_id
      : usuario.id;

    const equipe = await kpisDaEquipe(supervisorId, dias);
    await log(usuario.id, 'kpi_equipe_consultado', 'equipe', supervisorId);

    res.json({ equipe, periodo_dias: dias });
  } catch (err) {
    res.status(err.status || 500).json({ erro: err.message || 'erro interno' });
  }
}
