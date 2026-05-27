# LevelCorp OS — Deploy na Vercel

App completo: dashboard de equipe + feedbacks por IA + conselho executivo + chat copiloto.
Frontend React + Backend Serverless + Banco Supabase.

## Deploy em 4 passos (~15 minutos)

### 1. Banco de dados (Supabase)

1. Acesse [supabase.com](https://supabase.com) e crie um projeto (grátis)
2. No painel, clique em **SQL Editor → New Query**
3. Cole todo o conteúdo de `supabase-schema.sql` e clique em **Run**
4. Vá em **Settings → API** e copie:
   - `Project URL` → será o `SUPABASE_URL`
   - `service_role` (secret) → será o `SUPABASE_SERVICE_ROLE_KEY`
   - `anon` (public) → será o `VITE_SUPABASE_ANON_KEY`

### 2. Chave do Claude (Anthropic)

1. Acesse [console.anthropic.com](https://console.anthropic.com/settings/keys)
2. Crie uma API Key e copie → será o `ANTHROPIC_API_KEY`

### 3. Deploy na Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login com GitHub
2. Clique em **Add New → Project**
3. Importe o repositório `levelcorp-os` do seu GitHub
4. Antes de clicar em Deploy, clique em **Environment Variables** e adicione:

| Nome | Valor |
|------|-------|
| `SUPABASE_URL` | URL do seu projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key do Supabase |
| `ANTHROPIC_API_KEY` | sua chave do Claude |
| `VITE_SUPABASE_URL` | mesma URL do Supabase |
| `VITE_SUPABASE_ANON_KEY` | anon key do Supabase |

5. Clique em **Deploy**

Em ~2 minutos a Vercel vai te dar uma URL tipo `levelcorp-os.vercel.app`. É seu ambiente de preview.

### 4. Testar

Acesse a URL e:
- Selecione "Supervisor Ops" no topo
- Clique em Bruno na tabela → "Gerar feedback" (chama o Claude de verdade)
- Vá em Dashboard → "Rodar análise"
- Abra o chat flutuante (botão azul girando no canto)

## Atualizar depois de fazer mudanças

Qualquer `git push` no repositório atualiza o preview automaticamente. Não precisa fazer nada na Vercel.

```bash
git add .
git commit -m "sua mensagem"
git push
```

## Estrutura do projeto

```
api/              Funções serverless (backend)
├── _lib/         Helpers: Supabase, Claude, KPIs, prompts
├── kpis/         Endpoints de KPIs
└── ia/           Endpoints de IA
src/              Frontend React
├── main.jsx      Entry point
└── LevelCorpOS.jsx  App completo
index.html        HTML base
vite.config.js    Build config
vercel.json       Roteamento Vercel
supabase-schema.sql  Banco de dados
```

## Quando quiser colocar no site da LevelCorp

Leia `docs/INTEGRACAO.md` — tem o passo a passo de como o dev adapta esse código ao site existente.

## Problemas comuns

**"não autenticado"** — Certifique-se de que os IDs usados existem na tabela `colaboradores` do Supabase. Os IDs do seed são 1 (admin), 2 (supervisor), 3 (Ana), 4 (Bruno), etc.

**"equipe vazia"** — O supervisor precisa ter colaboradores com `supervisor_id` apontando para ele. Rode o seed em `supabase-schema.sql`.

**Feedback não gera** — Verifique se `ANTHROPIC_API_KEY` está nas Environment Variables da Vercel (não no `.env` do repositório).
