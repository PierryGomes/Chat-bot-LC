import React, { useState, useEffect, useRef } from 'react';

// ============================================================
// LEVELCORP OS — protótipo funcional
// Arquitetura: SPA com 3 papéis, persistência local, IA real via API
// ============================================================

// ============================================================
// LEVELCORP OS — v3 com paleta de marca
// Paleta derivada do logo: azul gradiente sobre fundo deep navy, ciano accent
// ============================================================

const ACCENT = '#4A9EFF';        // azul-claro do logo
const ACCENT_2 = '#7BCFFF';      // ciano de destaque/hover
const ACCENT_DEEP = '#1E3A8A';   // azul profundo do logo
const BG = '#06091A';            // azul-noite quase preto
const BG_ELEVATED = '#0B1024';   // elevação sutil
const PANEL = '#0F1530';         // painéis
const PANEL_HOVER = '#161E40';   // hover
const BORDER = '#1F2A52';        // bordas azuladas
const TEXT = '#E8EEFF';           // branco com leve azul
const MUTED = '#7A88B5';         // azul-acinzentado
const SUCCESS = '#5EE2C0';       // verde-água
const WARN = '#FFB547';          // âmbar
const DANGER = '#FF6B9D';        // rosa-magenta (não vermelho puro, combina com paleta fria)

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: ${BG};
    color: ${TEXT};
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 13.5px;
    line-height: 1.55;
    background-image:
      radial-gradient(ellipse 80% 50% at 20% 0%, rgba(74, 158, 255, 0.08), transparent 70%),
      radial-gradient(ellipse 60% 40% at 80% 100%, rgba(30, 58, 138, 0.12), transparent 70%);
    background-attachment: fixed;
  }
  .display { font-family: 'Space Grotesk', sans-serif; font-weight: 600; letter-spacing: -0.02em; }
  .mono { font-family: 'DM Mono', monospace; font-size: 0.92em; }
  ::selection { background: ${ACCENT}; color: ${BG}; }
  button { font-family: inherit; cursor: pointer; }
  input, textarea, select { font-family: inherit; outline: none; }
  input:focus, textarea:focus, select:focus { border-color: ${ACCENT} !important; }
  .scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
  .scrollbar::-webkit-scrollbar-track { background: transparent; }
  .scrollbar::-webkit-scrollbar-thumb { background: ${BORDER}; border-radius: 3px; }
  .scrollbar::-webkit-scrollbar-thumb:hover { background: ${ACCENT_DEEP}; }
  @keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.3; transform: scale(0.85); } }
  .pulse { animation: pulse-dot 1.4s ease-in-out infinite; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  .fade-in { animation: fadeIn 0.3s ease-out; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .spin { animation: spin 8s linear infinite; }
  .glow { box-shadow: 0 0 0 1px ${BORDER}, 0 8px 32px rgba(74, 158, 255, 0.06); }
  .glow-accent { box-shadow: 0 0 24px rgba(74, 158, 255, 0.25); }
`;

// ============================================================
// CONFIGURAÇÃO — URL do seu backend
// ============================================================
// Em produção, ajuste para o domínio onde o backend está rodando.
const API_BASE = '/api';

// ============================================================
// CLIENT HTTP — chama o backend (que chama o Claude internamente)
// ============================================================
async function apiCall(path, { method = 'GET', body, userId } = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        // Em produção: substituir por token JWT do seu sistema de auth
        'x-user-id': String(userId || ''),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ erro: 'erro desconhecido' }));
      throw new Error(err.erro || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    return { error: err.message };
  }
}

// ============================================================
// NOTA: Os system prompts da IA agora vivem no BACKEND
// (em backend/src/services/ia.js). O frontend só chama
// os endpoints e renderiza o resultado.
// ============================================================

// ============================================================
// NOTA: SEED_TEAM e SEED_USERS foram removidos.
// Os dados agora vêm do backend via /api/kpis/equipe e /api/kpis/colaborador.
// O banco PostgreSQL é a fonte da verdade.
// ============================================================

// ============================================================
// STORAGE HELPERS — localStorage do navegador
// ============================================================
async function loadData() {
  try {
    const r = localStorage.getItem('levelcorp:state');
    return r ? JSON.parse(r) : null;
  } catch { return null; }
}
async function saveData(state) {
  try { localStorage.setItem('levelcorp:state', JSON.stringify(state)); } catch {}
}

// ============================================================
// UI COMPONENTES BASE
// ============================================================
const Badge = ({ children, color = MUTED, bg = 'transparent' }) => (
  <span style={{ display: 'inline-block', padding: '2px 8px', border: `1px solid ${color}`, color, background: bg, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>{children}</span>
);

const Btn = ({ children, onClick, variant = 'default', disabled, style = {} }) => {
  const styles = {
    default: { background: PANEL, color: TEXT, border: `1px solid ${BORDER}` },
    primary: { background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DEEP})`, color: TEXT, border: `1px solid ${ACCENT}` },
    ghost: { background: 'transparent', color: TEXT, border: `1px solid ${BORDER}` }
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant], padding: '10px 18px', fontSize: 12, fontWeight: 600,
      letterSpacing: '0.02em', transition: 'all 0.15s', borderRadius: 8,
      opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer', ...style
    }}>{children}</button>
  );
};

const Panel = ({ children, title, subtitle, style = {} }) => (
  <div className="glow" style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, ...style }}>
    {(title || subtitle) && (
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          {title && <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: ACCENT_2, fontWeight: 600 }}>{title}</div>}
          {subtitle && <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{subtitle}</div>}
        </div>
      </div>
    )}
    <div style={{ padding: 20 }}>{children}</div>
  </div>
);

const LoadingDots = () => (
  <span>
    <span className="pulse" style={{ display: 'inline-block', width: 4, height: 4, background: ACCENT, marginRight: 3 }}></span>
    <span className="pulse" style={{ display: 'inline-block', width: 4, height: 4, background: ACCENT, marginRight: 3, animationDelay: '0.2s' }}></span>
    <span className="pulse" style={{ display: 'inline-block', width: 4, height: 4, background: ACCENT, animationDelay: '0.4s' }}></span>
  </span>
);

// ============================================================
// LOGIN / SWITCH DE PAPEL (simula auth)
// ============================================================
const RoleSwitcher = ({ currentUser, users, onSwitch }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <span style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sessão simulada</span>
    <select value={currentUser.id} onChange={e => onSwitch(users.find(u => u.id === e.target.value))}
      style={{ background: BG, color: TEXT, border: `1px solid ${BORDER}`, padding: '6px 10px', fontSize: 12 }}>
      {users.map(u => <option key={u.id} value={u.id}>{u.nome} · {u.papel}</option>)}
    </select>
  </div>
);

// ============================================================
// DASHBOARD DO SUPERVISOR
// ============================================================
const SupervisorDashboard = ({ team, onSelectMember, onAnalyzeTeam, gargalosResult, gargalosLoading }) => {
  const totalTarefas = team.reduce((s, m) => s + m.tarefas_30d, 0);
  const noPrazo = team.reduce((s, m) => s + m.no_prazo, 0);
  const taxaPrazo = parseInt(((noPrazo / totalTarefas) * 100).toFixed(0));
  const emRisco = team.filter(m => m.atraso_medio_h > 10 || m.participacao_reunioes === 'ausente_frequente');

  // Status semântico do KPI principal
  const status = taxaPrazo >= 85 ? { label: 'saudável', color: SUCCESS } :
                 taxaPrazo >= 70 ? { label: 'atenção', color: WARN } :
                 { label: 'crítico', color: DANGER };

  // Ordena: pessoas em risco primeiro, depois por taxa de entrega
  const sortedTeam = [...team].sort((a, b) => {
    const riscoA = a.atraso_medio_h > 10 || a.participacao_reunioes === 'ausente_frequente';
    const riscoB = b.atraso_medio_h > 10 || b.participacao_reunioes === 'ausente_frequente';
    if (riscoA !== riscoB) return riscoA ? -1 : 1;
    return (a.no_prazo / a.tarefas_30d) - (b.no_prazo / b.tarefas_30d);
  });

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* HERO: a coisa mais importante da tela, sozinha, com ar */}
      <div className="glow fade-in" style={{
        background: `linear-gradient(135deg, ${PANEL} 0%, ${BG_ELEVATED} 100%)`,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: '32px 36px',
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: 32,
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow decorativo de fundo */}
        <div style={{
          position: 'absolute', top: -100, right: -100, width: 300, height: 300,
          background: `radial-gradient(circle, ${status.color}22, transparent 70%)`,
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative' }}>
          <div className="mono" style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: status.color, display: 'inline-block' }} />
            Operação · últimos 30 dias
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 12 }}>
            <span className="display" style={{ fontSize: 72, color: TEXT, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1 }}>
              {taxaPrazo}<span style={{ fontSize: 32, color: MUTED, fontWeight: 400 }}>%</span>
            </span>
            <span style={{
              fontSize: 11, color: status.color, fontWeight: 600,
              padding: '4px 10px', border: `1px solid ${status.color}`,
              borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.08em'
            }}>{status.label}</span>
          </div>
          <div style={{ fontSize: 14, color: MUTED, maxWidth: 340 }}>
            das <span style={{ color: TEXT, fontWeight: 500 }}>{totalTarefas} tarefas</span> entregues no prazo por {team.length} pessoas
          </div>

          {/* Barra de progresso visual */}
          <div style={{ marginTop: 20, height: 4, background: BG, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              width: `${taxaPrazo}%`, height: '100%',
              background: `linear-gradient(90deg, ${status.color}, ${ACCENT_2})`,
              transition: 'width 0.8s ease-out'
            }} />
          </div>
        </div>

        {/* Satélites: 3 stats menores em coluna */}
        <div style={{ display: 'grid', gap: 14, position: 'relative' }}>
          {[
            { label: 'Pessoas', value: team.length, sub: 'sob supervisão' },
            { label: 'Em risco', value: emRisco.length, sub: emRisco.length === 1 ? 'colaborador' : 'colaboradores', alert: emRisco.length > 0 },
            { label: 'Tarefas atrasadas', value: totalTarefas - noPrazo, sub: 'do total' }
          ].map(s => (
            <div key={s.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              paddingBottom: 12, borderBottom: `1px solid ${BORDER}`
            }}>
              <div>
                <div className="mono" style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{s.label}</div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{s.sub}</div>
              </div>
              <div className="display" style={{ fontSize: 28, color: s.alert ? DANGER : TEXT, fontWeight: 600 }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA secundário: análise IA */}
      <div className="glow" style={{
        background: PANEL,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 20
      }}>
        <div>
          <div style={{ fontSize: 14, color: TEXT, fontWeight: 500, marginBottom: 4 }}>Análise operacional automática</div>
          <div style={{ fontSize: 12, color: MUTED }}>
            {gargalosResult ? 'Análise gerada · revise abaixo' : 'A IA varre os dados e identifica gargalos, riscos e padrões'}
          </div>
        </div>
        <Btn variant="primary" onClick={onAnalyzeTeam} disabled={gargalosLoading}>
          {gargalosLoading ? <>Analisando <LoadingDots /></> : (gargalosResult ? 'Rodar novamente' : 'Rodar análise')}
        </Btn>
      </div>

      {gargalosResult && (
        <Panel title="Resultado da análise" subtitle="Riscos e padrões identificados pela IA">
          <GargalosView data={gargalosResult} />
        </Panel>
      )}

      {/* TABELA: pessoas em risco primeiro, visualmente destacadas */}
      <Panel title="Equipe" subtitle={`Ordenados por risco operacional · clique para gerar feedback`}>
        <div style={{ display: 'grid', gap: 8 }}>
          {sortedTeam.map(m => {
            const taxa = parseInt(((m.no_prazo / m.tarefas_30d) * 100).toFixed(0));
            const risco = m.atraso_medio_h > 10 || m.participacao_reunioes === 'ausente_frequente';
            const taxaColor = taxa >= 85 ? SUCCESS : taxa >= 70 ? WARN : DANGER;
            return (
              <div key={m.id} onClick={() => onSelectMember(m)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2.4fr 1fr 2fr 1fr',
                  alignItems: 'center',
                  gap: 16,
                  padding: '16px 18px',
                  background: BG_ELEVATED,
                  border: `1px solid ${risco ? DANGER + '44' : BORDER}`,
                  borderLeft: `3px solid ${risco ? DANGER : taxaColor}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  transition: 'all 0.18s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = PANEL_HOVER;
                  e.currentTarget.style.transform = 'translateX(2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = BG_ELEVATED;
                  e.currentTarget.style.transform = 'translateX(0)';
                }}>
                {/* Nome + cargo */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                    <span style={{ color: TEXT, fontWeight: 600, fontSize: 14 }}>{m.nome}</span>
                    {risco && <span className="pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: DANGER }} />}
                  </div>
                  <div style={{ fontSize: 12, color: MUTED }}>{m.cargo} · complexidade {m.complexidade_media}</div>
                </div>

                {/* Taxa de entrega — destaque */}
                <div>
                  <div className="display" style={{ fontSize: 22, color: taxaColor, fontWeight: 600, lineHeight: 1 }}>{taxa}%</div>
                  <div className="mono" style={{ fontSize: 10, color: MUTED, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {m.no_prazo}/{m.tarefas_30d} no prazo
                  </div>
                </div>

                {/* Barra de progresso individual */}
                <div>
                  <div style={{ height: 6, background: BG, borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{
                      width: `${taxa}%`, height: '100%',
                      background: taxaColor,
                      transition: 'width 0.6s ease-out'
                    }} />
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: MUTED }}>
                    <span>Atraso médio: <span style={{ color: m.atraso_medio_h > 10 ? DANGER : TEXT }}>{m.atraso_medio_h}h</span></span>
                    <span>·</span>
                    <span>Reuniões: <span style={{ color: m.participacao_reunioes === 'ausente_frequente' ? DANGER : TEXT, textTransform: 'capitalize' }}>{m.participacao_reunioes.replace('_', ' ')}</span></span>
                  </div>
                </div>

                {/* Ação */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: 11, color: ACCENT_2, fontWeight: 500,
                    padding: '6px 12px', border: `1px solid ${BORDER}`,
                    borderRadius: 6, transition: 'all 0.15s'
                  }}>
                    Analisar →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
};

const GargalosView = ({ data }) => {
  if (data.error) return <div style={{ color: ACCENT, fontSize: 12 }}>Falha na análise. Tente novamente.</div>;
  const sevColor = s => s === 'alta' ? ACCENT : s === 'media' ? WARN : MUTED;
  return (
    <div className="fade-in" style={{ display: 'grid', gap: 20 }}>
      {data.gargalos?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Gargalos</div>
          {data.gargalos.map((g, i) => (
            <div key={i} style={{ borderLeft: `2px solid ${sevColor(g.severidade)}`, paddingLeft: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
                <Badge color={sevColor(g.severidade)}>{g.severidade}</Badge>
                <span style={{ fontWeight: 600 }}>{g.titulo}</span>
              </div>
              <div style={{ fontSize: 12, color: MUTED }}>{g.evidencia}</div>
              {g.responsavel_sugerido && <div style={{ fontSize: 11, color: TEXT, marginTop: 4 }}>→ {g.responsavel_sugerido}</div>}
            </div>
          ))}
        </div>
      )}
      {data.riscos?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Riscos detectados</div>
          {data.riscos.map((r, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}><Badge>{r.tipo}</Badge><span style={{ color: TEXT }}>{r.pessoa_ou_area}</span></div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{r.sinais}</div>
            </div>
          ))}
        </div>
      )}
      {data.padroes?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Padrões</div>
          {data.padroes.map((p, i) => (
            <div key={i} style={{ marginBottom: 8, fontSize: 12 }}>
              <span style={{ color: TEXT }}>{p.observacao}</span>
              <span style={{ color: MUTED }}> → {p.implicacao}</span>
            </div>
          ))}
        </div>
      )}
      {data.lacunas_de_dados?.length > 0 && (
        <div style={{ padding: 12, background: BG, border: `1px dashed ${BORDER}` }}>
          <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Lacunas de dados</div>
          {data.lacunas_de_dados.map((l, i) => <div key={i} style={{ fontSize: 12, color: MUTED }}>· {l}</div>)}
        </div>
      )}
    </div>
  );
};

// ============================================================
// GERADOR DE FEEDBACK
// ============================================================
const FeedbackGenerator = ({ member, onBack, onGenerate, feedback, loading }) => (
  <div style={{ display: 'grid', gap: 20 }}>
    <div>
      <Btn variant="ghost" onClick={onBack} style={{ padding: '6px 12px', fontSize: 11 }}>← Voltar</Btn>
    </div>
    <Panel title={`Feedback — ${member.nome}`} subtitle={`${member.cargo} · Último 1:1: ${member.ultimo_1on1}`}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${BORDER}` }}>
        {[
          ['Tarefas (30d)', member.tarefas_30d],
          ['Entregas no prazo', `${member.no_prazo} (${((member.no_prazo/member.tarefas_30d)*100).toFixed(0)}%)`],
          ['Atraso médio', `${member.atraso_medio_h}h`],
          ['Complexidade média', member.complexidade_media],
          ['Participação em reuniões', member.participacao_reunioes],
          ['Último 1:1', member.ultimo_1on1]
        ].map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{k}</div>
            <div style={{ fontSize: 14, color: TEXT, marginTop: 3 }}>{v}</div>
          </div>
        ))}
      </div>
      <Btn variant="primary" onClick={onGenerate} disabled={loading}>
        {loading ? <>Gerando <LoadingDots /></> : 'Gerar feedback'}
      </Btn>
      {feedback && <FeedbackDisplay text={feedback} />}
    </Panel>
  </div>
);

const FeedbackDisplay = ({ text }) => {
  // render markdown leve
  const lines = text.split('\n');
  return (
    <div className="fade-in" style={{ marginTop: 24, padding: 20, background: BG, border: `1px solid ${BORDER}`, lineHeight: 1.7 }}>
      {lines.map((l, i) => {
        if (l.startsWith('## ')) return <h3 key={i} className="display" style={{ fontSize: 16, color: ACCENT, marginTop: i ? 18 : 0, marginBottom: 8, fontWeight: 600 }}>{l.slice(3)}</h3>;
        if (l.startsWith('- ') || l.startsWith('* ')) return <div key={i} style={{ color: TEXT, paddingLeft: 14, position: 'relative' }}><span style={{ position: 'absolute', left: 0, color: ACCENT }}>·</span>{l.slice(2)}</div>;
        if (!l.trim()) return <div key={i} style={{ height: 6 }} />;
        return <div key={i} style={{ color: TEXT, marginBottom: 4 }}>{l}</div>;
      })}
    </div>
  );
};

// ============================================================
// CHAT FLUTUANTE GLOBAL — disponível em qualquer aba
// Contexto automático + memória persistente + sugestões
// ============================================================

// Sugestões dinâmicas por aba/contexto
const getSuggestions = (view, selectedMember, currentUser) => {
  if (currentUser.papel === 'colaborador') {
    return [
      'Quais são meus pontos mais fortes nas últimas semanas?',
      'O que eu poderia melhorar?',
      'Que análise meu supervisor pode ver sobre mim?'
    ];
  }
  if (selectedMember) {
    return [
      `${selectedMember.nome.split(' ')[0]} está sobrecarregado ou improdutivo?`,
      `O que perguntar no próximo 1:1 com ${selectedMember.nome.split(' ')[0]}?`,
      `Quais riscos eu não estou vendo sobre ${selectedMember.nome.split(' ')[0]}?`
    ];
  }
  if (view === 'exec') {
    return [
      'Que decisão eu deveria estar analisando agora?',
      'Quais sinais sugerem que preciso reestruturar o time?',
      'Como apresentar isso para a diretoria?'
    ];
  }
  return [
    'Quem está com maior risco de atraso este mês?',
    'Onde está o maior gargalo da equipe?',
    'O Bruno tem 11h de atraso médio — é problema dele ou de gestão?',
    'Compare consistência de Ana e Carla.'
  ];
};

// Constrói contexto automático conforme a aba ativa
const buildContext = (view, team, selectedMember, currentUser) => {
  const parts = [
    `Usuário atual: ${currentUser.nome} (papel: ${currentUser.papel})`,
    `Aba ativa: ${view}`
  ];
  if (currentUser.papel === 'supervisor' || currentUser.papel === 'admin') {
    parts.push(`Equipe sob supervisão:\n${JSON.stringify(team, null, 2)}`);
  }
  if (currentUser.papel === 'colaborador') {
    const me = team.find(t => t.id === currentUser.id);
    if (me) parts.push(`Seus dados:\n${JSON.stringify(me, null, 2)}`);
  }
  if (selectedMember) {
    parts.push(`Foco atual: análise de ${selectedMember.nome}\n${JSON.stringify(selectedMember, null, 2)}`);
  }
  return parts.join('\n\n');
};

const FloatingChat = ({ team, currentUser, view, selectedMember }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(false);
  const endRef = useRef(null);

  // Carrega memória por usuário ao montar / trocar usuário
  useEffect(() => {
    try {
      const r = localStorage.getItem(`chat:${currentUser.id}`);
      if (r) setMessages(JSON.parse(r));
      else setMessages([]);
    } catch { setMessages([]); }
  }, [currentUser.id]);

  // Persiste a cada mudança
  useEffect(() => {
    if (messages.length > 0) {
      try { localStorage.setItem(`chat:${currentUser.id}`, JSON.stringify(messages)); } catch {}
    }
  }, [messages, currentUser.id]);

  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);

  const send = async (textOverride) => {
    const text = textOverride ?? input;
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user', content: text, ts: Date.now() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);

    // Chama o backend (que chama o Claude internamente)
    const historico = newMsgs.slice(-7, -1).map(m => ({ role: m.role, content: m.content }));
    const result = await apiCall('/ia/chat', {
      method: 'POST',
      userId: currentUser.id,
      body: {
        mensagem: text,
        historico,
        contexto: { aba: view, foco: selectedMember?.nome },
      },
    });
    const resp = result.error ? `[erro: ${result.error}]` : result.resposta;
    const updated = [...newMsgs, { role: 'assistant', content: resp, ts: Date.now() }];
    setMessages(updated);
    setLoading(false);
    if (!open) setUnread(true);
  };

  const clear = async () => {
    if (!confirm('Apagar todo o histórico desta conversa?')) return;
    setMessages([]);
    try { localStorage.removeItem(`chat:${currentUser.id}`); } catch {}
  };

  const handleOpen = () => { setOpen(true); setUnread(false); };

  const suggestions = getSuggestions(view, selectedMember, currentUser);
  const showSuggestions = messages.filter(m => m.role !== 'system').length === 0;

  return (
    <>
      {/* BOTÃO FLUTUANTE */}
      {!open && (
        <button onClick={handleOpen} style={{
          position: 'fixed', bottom: 24, right: 24, width: 60, height: 60,
          background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DEEP})`,
          color: BG, border: 'none', borderRadius: '50%',
          cursor: 'pointer', zIndex: 100,
          boxShadow: `0 8px 32px rgba(74, 158, 255, 0.4), 0 0 0 1px ${ACCENT_2}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
          <svg width="28" height="28" viewBox="0 0 100 100" className="spin" style={{ animationDuration: '6s' }}>
            <g transform="translate(50 50)">
              {[0, 60, 120, 180, 240, 300].map(angle => (
                <path key={angle}
                  d="M 0 -4 Q 18 -14, 28 -8 Q 38 0, 28 8 Q 18 14, 0 4 Z"
                  fill={TEXT}
                  transform={`rotate(${angle})`} />
              ))}
              <circle r="5" fill={BG} />
            </g>
          </svg>
          {unread && <span style={{
            position: 'absolute', top: -2, right: -2, width: 14, height: 14,
            background: ACCENT_2, borderRadius: '50%', border: `2px solid ${BG}`,
            boxShadow: `0 0 12px ${ACCENT_2}`
          }} />}
        </button>
      )}

      {/* PAINEL DO CHAT */}
      {open && (
        <div className="fade-in" style={{
          position: 'fixed', bottom: 24, right: 24, width: 440, height: 620,
          background: PANEL, border: `1px solid ${BORDER}`,
          borderRadius: 12, zIndex: 100,
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(74, 158, 255, 0.1)',
          overflow: 'hidden'
        }}>
          {/* HEADER */}
          <div style={{
            padding: '14px 18px',
            borderBottom: `1px solid ${BORDER}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: `linear-gradient(180deg, ${BG_ELEVATED}, ${PANEL})`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 100 100" className="spin" style={{ animationDuration: '10s' }}>
                <g transform="translate(50 50)">
                  {[0, 60, 120, 180, 240, 300].map(angle => (
                    <path key={angle}
                      d="M 0 -4 Q 18 -14, 28 -8 Q 38 0, 28 8 Q 18 14, 0 4 Z"
                      fill={ACCENT_2}
                      transform={`rotate(${angle})`} />
                  ))}
                </g>
              </svg>
              <div>
                <div style={{ fontSize: 12, color: TEXT, fontWeight: 600, letterSpacing: '-0.01em' }}>Copiloto</div>
                <div className="mono" style={{ fontSize: 9.5, color: MUTED, marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Contexto: {selectedMember ? `${selectedMember.nome.split(' ')[0]}` : view} · {messages.filter(m => m.role !== 'system').length} msgs
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {messages.length > 0 && (
                <button onClick={clear} title="Limpar histórico" style={{
                  background: 'transparent', color: MUTED, border: `1px solid ${BORDER}`,
                  width: 28, height: 28, fontSize: 13, cursor: 'pointer', borderRadius: 6
                }}>↻</button>
              )}
              <button onClick={() => setOpen(false)} style={{
                background: 'transparent', color: TEXT, border: `1px solid ${BORDER}`,
                width: 28, height: 28, fontSize: 14, cursor: 'pointer', borderRadius: 6
              }}>×</button>
            </div>
          </div>

          {/* MENSAGENS */}
          <div className="scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {showSuggestions && (
              <div className="fade-in">
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 12, lineHeight: 1.6 }}>
                  Pergunte qualquer coisa sobre a operação. Eu uso os dados desta sessão como contexto.
                </div>
                <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Sugestões</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => send(s)} style={{
                      background: BG, border: `1px solid ${BORDER}`, color: TEXT,
                      padding: '10px 12px', fontSize: 12, textAlign: 'left', cursor: 'pointer',
                      fontFamily: 'inherit', transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT; }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.filter(m => m.role !== 'system').map((m, i) => (
              <div key={i} className="fade-in" style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
                <div style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
                  {m.role === 'user' ? 'Você' : 'Copiloto'}
                </div>
                <div style={{
                  background: m.role === 'user' ? PANEL_HOVER : BG,
                  border: `1px solid ${BORDER}`,
                  borderLeft: m.role === 'assistant' ? `2px solid ${ACCENT}` : `1px solid ${BORDER}`,
                  padding: 10, fontSize: 12.5, whiteSpace: 'pre-wrap', lineHeight: 1.55
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', color: MUTED, fontSize: 11 }}>
                Pensando <LoadingDots />
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* INPUT */}
          <div style={{ borderTop: `1px solid ${BORDER}`, padding: 12, display: 'flex', gap: 8, background: BG_ELEVATED }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Sua pergunta..."
              style={{
                flex: 1, background: BG, color: TEXT,
                border: `1px solid ${BORDER}`, borderRadius: 8,
                padding: '11px 14px', fontSize: 13,
                transition: 'border-color 0.15s'
              }} />
            <button onClick={() => send()} disabled={loading || !input.trim()} style={{
              background: input.trim() && !loading ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DEEP})` : BORDER,
              color: input.trim() && !loading ? TEXT : MUTED,
              border: 'none', padding: '0 18px', borderRadius: 8,
              fontSize: 14, fontWeight: 600,
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s'
            }}>↑</button>
          </div>
        </div>
      )}
    </>
  );
};

// ============================================================
// PAINEL EXECUTIVO CRÍTICO
// ============================================================
const ExecPanel = ({ currentUserId }) => {
  const [decisao, setDecisao] = useState('');
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!decisao.trim()) return;
    setLoading(true);
    const r = await apiCall('/ia/conselho-executivo', {
      method: 'POST',
      userId: currentUserId,
      body: { decisao },
    });
    setResultado(r);
    setLoading(false);
  };

  const corPos = p => p === 'favoravel' ? SUCCESS : p === 'contra' ? ACCENT : WARN;

  return (
    <Panel title="Conselho executivo crítico" subtitle="5 perspectivas que podem discordar entre si + síntese do presidente">
      <div style={{ marginBottom: 16 }}>
        <textarea value={decisao} onChange={e => setDecisao(e.target.value)}
          placeholder="Descreva a decisão a ser analisada (ex: 'Devemos contratar mais 3 analistas em vez de reestruturar o processo de triagem?')"
          style={{ width: '100%', minHeight: 80, background: BG, color: TEXT, border: `1px solid ${BORDER}`, padding: 12, fontSize: 13, resize: 'vertical' }} />
      </div>
      <Btn variant="primary" onClick={run} disabled={loading}>
        {loading ? <>Convocando conselho <LoadingDots /></> : 'Convocar conselho'}
      </Btn>

      {resultado && !resultado.error && (
        <div className="fade-in" style={{ marginTop: 24 }}>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 12, fontStyle: 'italic' }}>Sobre: {resultado.decisao_analisada}</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {resultado.executivos?.map((e, i) => (
              <div key={i} style={{ background: BG, border: `1px solid ${BORDER}`, padding: 14, borderLeft: `3px solid ${corPos(e.posicao)}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span className="display" style={{ fontSize: 15, color: TEXT, fontWeight: 600 }}>{e.papel}</span>
                  <Badge color={corPos(e.posicao)}>{e.posicao}</Badge>
                </div>
                <div style={{ fontSize: 13, color: TEXT, marginBottom: e.discorda_de ? 6 : 0 }}>{e.argumento}</div>
                {e.discorda_de && <div style={{ fontSize: 11, color: MUTED }}>Discorda de: {e.discorda_de}</div>}
              </div>
            ))}
          </div>

          {resultado.sintese_presidente && (
            <div style={{ marginTop: 20, padding: 16, background: PANEL_HOVER, border: `1px solid ${ACCENT}` }}>
              <div style={{ fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Presidente do conselho</div>
              <div style={{ fontSize: 14, color: TEXT, marginBottom: 10, fontWeight: 500 }}>{resultado.sintese_presidente.recomendacao}</div>
              <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>Risco residual: {resultado.sintese_presidente.principal_risco_residual}</div>
              {resultado.sintese_presidente.condicoes_para_seguir?.length > 0 && (
                <div style={{ fontSize: 12, color: TEXT }}>
                  <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 10, marginBottom: 4 }}>Condições para seguir</div>
                  {resultado.sintese_presidente.condicoes_para_seguir.map((c, i) => <div key={i} style={{ paddingLeft: 12, position: 'relative' }}><span style={{ position: 'absolute', left: 0, color: ACCENT }}>·</span>{c}</div>)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
};

// ============================================================
// VIEW DO COLABORADOR — só vê o que é dele
// ============================================================
const CollaboratorView = ({ user, team }) => {
  const me = team.find(t => t.id === user.id);
  if (!me) return <Panel title="Sem dados">Nenhum dado operacional associado ao seu usuário.</Panel>;

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <Panel title="Seus indicadores" subtitle="LGPD: você tem direito de revisar análises feitas sobre você.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            ['Tarefas (30d)', me.tarefas_30d],
            ['No prazo', `${((me.no_prazo/me.tarefas_30d)*100).toFixed(0)}%`],
            ['Atraso médio', `${me.atraso_medio_h}h`],
            ['Complexidade', me.complexidade_media],
            ['Reuniões', me.participacao_reunioes],
            ['Último 1:1', me.ultimo_1on1]
          ].map(([k, v]) => (
            <div key={k} style={{ padding: 14, background: BG, border: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{k}</div>
              <div style={{ fontSize: 18, color: TEXT }}>{v}</div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Transparência" subtitle="O que seu supervisor vê sobre você">
        <div style={{ fontSize: 13, color: TEXT, lineHeight: 1.7 }}>
          Seu supervisor tem acesso aos indicadores acima e pode solicitar à IA uma análise estruturada (pontos fortes, pontos a desenvolver, sinais de risco).<br/><br/>
          <span style={{ color: ACCENT }}>Você pode solicitar:</span> revisão humana de qualquer análise gerada por IA, retificação de dados incorretos, cópia do histórico de análises feitas sobre você (LGPD Art. 18 e 20).
        </div>
      </Panel>
    </div>
  );
};

// ============================================================
// VIEW DO ADMIN — controle e auditoria
// ============================================================
const AdminView = ({ team }) => (
  <div style={{ display: 'grid', gap: 20 }}>
    <Panel title="Painel administrativo" subtitle="Aviso: este é um protótipo. Em produção, este painel exige logs de auditoria server-side, RBAC e versionamento de prompts.">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ padding: 14, background: BG, border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Colaboradores monitorados</div>
          <div className="display" style={{ fontSize: 28, color: TEXT }}>{team.length}</div>
        </div>
        <div style={{ padding: 14, background: BG, border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Fontes conectadas</div>
          <div className="display" style={{ fontSize: 28, color: TEXT }}>0 <span style={{ fontSize: 12, color: MUTED }}>/ a definir</span></div>
        </div>
      </div>
    </Panel>

    <Panel title="Lacunas críticas para produção" subtitle="O que falta para sair do protótipo">
      {[
        'Autenticação real (OAuth / SSO corporativo)',
        'Persistência em banco com criptografia em repouso',
        'Logs de auditoria imutáveis (quem viu/gerou o quê, quando)',
        'RBAC server-side (não confiar em estado de cliente)',
        'Política de retenção e descarte de dados analisados',
        'Fluxo de revisão humana antes de qualquer análise individual chegar ao colaborador',
        'Versionamento dos system prompts (toda análise deve ser rastreável ao prompt usado)',
        'Pipeline de ingestão de dados reais (CRM / planilhas / transcrições)'
      ].map((l, i) => (
        <div key={i} style={{ padding: '10px 0', borderBottom: i < 7 ? `1px solid ${BORDER}` : 'none', display: 'flex', gap: 12, fontSize: 13 }}>
          <span style={{ color: ACCENT, fontFamily: 'JetBrains Mono', fontWeight: 700 }}>{String(i + 1).padStart(2, '0')}</span>
          <span style={{ color: TEXT }}>{l}</span>
        </div>
      ))}
    </Panel>
  </div>
);

// ============================================================
// APP PRINCIPAL
// ============================================================
//
// AVISO: o "switch de papéis" no header é um STUB de desenvolvimento.
// Em produção, currentUser vem da autenticação real (JWT/sessão do site).
// O backend já tem RBAC server-side em todos os endpoints — então mesmo
// que alguém troque o ID no frontend, o backend valida.
//
// O array `users` abaixo lista os usuários cadastrados no banco, apenas
// para facilitar a demonstração. Em produção, REMOVA esse seletor.
// ============================================================
export default function App() {
  const [users, setUsers] = useState([]);
  const [team, setTeam] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [selectedMember, setSelectedMember] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [gargalos, setGargalos] = useState(null);
  const [gargalosLoading, setGargalosLoading] = useState(false);
  const [loadingApp, setLoadingApp] = useState(true);

  // Carrega lista de usuários disponíveis (DEV ONLY — em produção, remova)
  useEffect(() => {
    (async () => {
      // Em produção, isso vem do sistema de auth do site.
      // Aqui, lista direto do backend pra facilitar testes.
      // Você precisará criar uma rota /api/usuarios ou usar dados estáticos.
      const usersList = [
        { id: 1, nome: 'Admin LevelCorp', papel: 'admin' },
        { id: 2, nome: 'Supervisor Ops', papel: 'supervisor' },
        { id: 3, nome: 'Ana Ribeiro', papel: 'colaborador' },
        { id: 4, nome: 'Bruno Tavares', papel: 'colaborador' },
      ];
      setUsers(usersList);
      setCurrentUser(usersList[1]); // começa como supervisor
      setLoadingApp(false);
    })();
  }, []);

  // Quando troca de usuário ou logs in, busca a equipe
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.papel === 'supervisor' || currentUser.papel === 'admin') {
      (async () => {
        const r = await apiCall('/kpis/equipe', { userId: currentUser.id });
        if (!r.error) setTeam(r.equipe || []);
      })();
    } else if (currentUser.papel === 'colaborador') {
      (async () => {
        const r = await apiCall(`/kpis/colaborador?id=${currentUser.id}`, { userId: currentUser.id });
        if (!r.error) setTeam([r]); // colaborador vê só ele mesmo
      })();
    }
  }, [currentUser]);

  const handleSwitch = (u) => {
    setCurrentUser(u);
    setView('dashboard');
    setSelectedMember(null);
    setFeedback('');
    setGargalos(null);
  };

  const handleAnalyzeTeam = async () => {
    setGargalosLoading(true);
    const r = await apiCall('/ia/analise-equipe', {
      method: 'POST',
      userId: currentUser.id,
      body: {},
    });
    setGargalos(r.error ? { error: r.error } : r.resultado);
    setGargalosLoading(false);
  };

  const handleGenerateFeedback = async () => {
    setFeedbackLoading(true);
    setFeedback('');
    const r = await apiCall('/ia/feedback', {
      method: 'POST',
      userId: currentUser.id,
      body: { colaborador_id: selectedMember.id },
    });
    setFeedback(r.error ? `[erro: ${r.error}]` : r.conteudo);
    setFeedbackLoading(false);
  };

  if (loadingApp || !currentUser) {
    return (
      <div style={{ minHeight: '100vh', background: BG, color: TEXT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{css}</style>
        <div>Carregando <LoadingDots /></div>
      </div>
    );
  }

  // tabs por papel (chat agora é flutuante, removido das tabs)
  const tabs = currentUser.papel === 'supervisor'
    ? [{ id: 'dashboard', label: 'Dashboard' }, { id: 'exec', label: 'Conselho exec.' }]
    : currentUser.papel === 'admin'
      ? [{ id: 'admin', label: 'Admin' }, { id: 'dashboard', label: 'Dashboard' }, { id: 'exec', label: 'Conselho exec.' }]
      : [{ id: 'me', label: 'Minha visão' }];

  // garante view válida ao trocar papel
  useEffect(() => {
    if (!tabs.find(t => t.id === view)) setView(tabs[0].id);
  }, [currentUser]);

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT }}>
      <style>{css}</style>

      {/* HEADER */}
      <header style={{
        borderBottom: `1px solid ${BORDER}`,
        padding: '18px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: `linear-gradient(180deg, ${BG_ELEVATED}, ${BG})`,
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backdropFilter: 'blur(8px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* LOGO LEVELCORP — espiral inspirada no logo enviado */}
          <svg width="32" height="32" viewBox="0 0 100 100" className="spin" style={{ animationDuration: '30s' }}>
            <defs>
              <linearGradient id="bladeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={ACCENT_2} stopOpacity="0.95" />
                <stop offset="100%" stopColor={ACCENT_DEEP} stopOpacity="0.9" />
              </linearGradient>
            </defs>
            <g transform="translate(50 50)">
              {[0, 60, 120, 180, 240, 300].map(angle => (
                <path key={angle}
                  d="M 0 -4 Q 18 -14, 28 -8 Q 38 0, 28 8 Q 18 14, 0 4 Z"
                  fill="url(#bladeGrad)"
                  transform={`rotate(${angle})`} />
              ))}
              <circle r="5" fill={BG} stroke={ACCENT} strokeWidth="0.8" />
            </g>
          </svg>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span className="display" style={{ fontSize: 20, fontWeight: 700, color: TEXT, letterSpacing: '-0.03em' }}>
              Level<span style={{ color: ACCENT }}>Corp</span>
              <span style={{ color: MUTED, fontWeight: 400, marginLeft: 6, fontSize: 14 }}>OS</span>
            </span>
            <span className="mono" style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', borderLeft: `1px solid ${BORDER}`, paddingLeft: 12 }}>
              v0.3 · protótipo
            </span>
          </div>
        </div>
        <RoleSwitcher currentUser={currentUser} users={users} onSwitch={handleSwitch} />
      </header>

      {/* NAV */}
      <nav style={{ borderBottom: `1px solid ${BORDER}`, padding: '0 32px', display: 'flex', gap: 4, background: BG }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setView(t.id); setSelectedMember(null); }}
            style={{
              background: 'transparent', border: 'none', color: view === t.id ? ACCENT_2 : MUTED,
              padding: '16px 20px', fontSize: 12, letterSpacing: '0.02em', fontWeight: 500,
              borderBottom: view === t.id ? `2px solid ${ACCENT}` : '2px solid transparent', marginBottom: -1,
              transition: 'color 0.15s'
            }}>
            {t.label}
          </button>
        ))}
      </nav>

      {/* MAIN */}
      <main style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>
        {currentUser.papel === 'colaborador' && <CollaboratorView user={currentUser} team={team} />}

        {currentUser.papel === 'supervisor' && view === 'dashboard' && !selectedMember && (
          <SupervisorDashboard team={team} onSelectMember={m => { setSelectedMember(m); setFeedback(''); }}
            onAnalyzeTeam={handleAnalyzeTeam} gargalosResult={gargalos} gargalosLoading={gargalosLoading} />
        )}
        {currentUser.papel === 'supervisor' && view === 'dashboard' && selectedMember && (
          <FeedbackGenerator member={selectedMember} onBack={() => setSelectedMember(null)}
            onGenerate={handleGenerateFeedback} feedback={feedback} loading={feedbackLoading} />
        )}
        {currentUser.papel === 'supervisor' && view === 'exec' && <ExecPanel currentUserId={currentUser.id} />}

        {currentUser.papel === 'admin' && view === 'admin' && <AdminView team={team} />}
        {currentUser.papel === 'admin' && view === 'dashboard' && (
          <SupervisorDashboard team={team} onSelectMember={m => { setSelectedMember(m); setFeedback(''); }}
            onAnalyzeTeam={handleAnalyzeTeam} gargalosResult={gargalos} gargalosLoading={gargalosLoading} />
        )}
        {currentUser.papel === 'admin' && view === 'exec' && <ExecPanel currentUserId={currentUser.id} />}
      </main>

      <footer style={{ borderTop: `1px solid ${BORDER}`, padding: '16px 32px', fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'flex', justifyContent: 'space-between' }}>
        <span>LevelCorp OS · protótipo funcional</span>
        <span>IA: Claude Sonnet 4 · Dados: simulados</span>
      </footer>

      {/* Chat flutuante global — disponível em qualquer aba */}
      <FloatingChat team={team} currentUser={currentUser} view={view} selectedMember={selectedMember} />
    </div>
  );
}
