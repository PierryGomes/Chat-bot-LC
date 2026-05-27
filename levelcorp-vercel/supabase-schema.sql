-- ============================================================
-- LevelCorp OS — Schema Supabase
-- Cole e execute no SQL Editor do seu projeto Supabase:
-- supabase.com → seu projeto → SQL Editor → New Query
-- ============================================================

-- COLABORADORES
CREATE TABLE IF NOT EXISTS colaboradores (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  cargo TEXT,
  supervisor_id BIGINT REFERENCES colaboradores(id) ON DELETE SET NULL,
  papel TEXT NOT NULL DEFAULT 'colaborador'
    CHECK (papel IN ('colaborador', 'supervisor', 'admin')),
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_col_supervisor ON colaboradores(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_col_papel ON colaboradores(papel);

-- TAREFAS
CREATE TABLE IF NOT EXISTS tarefas (
  id BIGSERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  responsavel_id BIGINT NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  prazo TIMESTAMPTZ,
  concluida_em TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  complexidade TEXT DEFAULT 'media'
    CHECK (complexidade IN ('baixa', 'media', 'alta', 'muito_alta')),
  criada_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tar_responsavel ON tarefas(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_tar_status ON tarefas(status);
CREATE INDEX IF NOT EXISTS idx_tar_criada ON tarefas(criada_em);

-- FEEDBACKS_IA (auditoria LGPD)
CREATE TABLE IF NOT EXISTS feedbacks_ia (
  id BIGSERIAL PRIMARY KEY,
  colaborador_id BIGINT NOT NULL REFERENCES colaboradores(id),
  solicitado_por_id BIGINT REFERENCES colaboradores(id),
  conteudo TEXT NOT NULL,
  dados_usados JSONB NOT NULL,
  modelo_ia TEXT NOT NULL,
  prompt_versao TEXT NOT NULL DEFAULT 'v1',
  visivel_para_colaborador BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ANALISES_IA
CREATE TABLE IF NOT EXISTS analises_ia (
  id BIGSERIAL PRIMARY KEY,
  supervisor_id BIGINT NOT NULL REFERENCES colaboradores(id),
  resultado JSONB NOT NULL,
  dados_usados JSONB NOT NULL,
  modelo_ia TEXT NOT NULL,
  prompt_versao TEXT NOT NULL DEFAULT 'v1',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- LOG_AUDITORIA
CREATE TABLE IF NOT EXISTS log_auditoria (
  id BIGSERIAL PRIMARY KEY,
  acao TEXT NOT NULL,
  usuario_id BIGINT REFERENCES colaboradores(id),
  alvo_tipo TEXT,
  alvo_id BIGINT,
  metadados JSONB,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEED DE EXEMPLO — delete depois de testar em produção
-- ============================================================
INSERT INTO colaboradores (nome, email, cargo, papel) VALUES
  ('Admin LevelCorp', 'admin@levelcorp.com.br', 'Administrador', 'admin'),
  ('Supervisor Ops', 'sup@levelcorp.com.br', 'Gerente de Operações', 'supervisor')
ON CONFLICT (email) DO NOTHING;

DO $$
DECLARE sup_id BIGINT;
BEGIN
  SELECT id INTO sup_id FROM colaboradores WHERE email = 'sup@levelcorp.com.br';
  INSERT INTO colaboradores (nome, email, cargo, supervisor_id, papel) VALUES
    ('Ana Ribeiro',   'ana@levelcorp.com.br',   'Analista Pleno',  sup_id, 'colaborador'),
    ('Bruno Tavares', 'bruno@levelcorp.com.br', 'Analista Júnior', sup_id, 'colaborador'),
    ('Carla Menezes', 'carla@levelcorp.com.br', 'Especialista',    sup_id, 'colaborador'),
    ('Diego Alves',   'diego@levelcorp.com.br', 'Analista Pleno',  sup_id, 'colaborador')
  ON CONFLICT (email) DO NOTHING;
END $$;

-- Tarefas de exemplo (últimos 30 dias)
DO $$
DECLARE
  ana_id BIGINT; bruno_id BIGINT;
BEGIN
  SELECT id INTO ana_id   FROM colaboradores WHERE email = 'ana@levelcorp.com.br';
  SELECT id INTO bruno_id FROM colaboradores WHERE email = 'bruno@levelcorp.com.br';
  FOR i IN 1..47 LOOP
    INSERT INTO tarefas (titulo, responsavel_id, prazo, concluida_em, status, complexidade)
    VALUES ('Tarefa A'||i, ana_id,
      NOW() - (i||' days')::INTERVAL,
      CASE WHEN i<=44 THEN NOW()-(i||' days')::INTERVAL - INTERVAL '2h'
           ELSE NOW()-(i||' days')::INTERVAL + INTERVAL '3h' END,
      'concluida', 'alta');
  END LOOP;
  FOR i IN 1..62 LOOP
    INSERT INTO tarefas (titulo, responsavel_id, prazo, concluida_em, status, complexidade)
    VALUES ('Tarefa B'||i, bruno_id,
      NOW() - (i||' days')::INTERVAL,
      CASE WHEN i<=41 THEN NOW()-(i||' days')::INTERVAL - INTERVAL '1h'
           ELSE NOW()-(i||' days')::INTERVAL + INTERVAL '11h' END,
      'concluida', 'baixa');
  END LOOP;
END $$;
