# AtendeAI

Plataforma SaaS de atendimento via WhatsApp com IA (Claude) para lojas de roupas femininas. Cada loja
conversa com suas clientes pelo WhatsApp através da Evolution API; o Claude consulta estoque, preço e
produtos parecidos (catálogo sincronizado do Google Sheets), cria pedidos, e transfere para um atendente
humano quando necessário. Um painel web dá acesso de Administrador Geral (todas as lojas) e de Loja (só a
própria loja).

## Stack

- Next.js 16 (App Router, TypeScript) + Tailwind CSS
- PostgreSQL + Prisma ORM
- Auth.js (NextAuth v5) — login por e-mail/senha, papéis `SUPER_ADMIN` e `STORE_USER`
- Evolution API (self-hosted) para WhatsApp
- `@anthropic-ai/sdk` (Claude) com tool use
- Google Sheets API (`googleapis`) para o catálogo de produtos

## Setup local

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Copie `.env.example` para `.env` e preencha as variáveis (veja a descrição de cada uma no próprio
   arquivo): banco de dados, `AUTH_SECRET`, `ANTHROPIC_API_KEY`, credenciais da conta de serviço do Google,
   `CRON_SECRET` e `APP_URL`.
3. Rode as migrations e o seed (cria um super admin e uma loja de demonstração):
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
   As credenciais criadas aparecem no console (ou defina `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`,
   `SEED_STORE_EMAIL`, `SEED_STORE_PASSWORD` antes de rodar o seed para escolher as suas).
4. Suba a Evolution API (veja `docker/evolution-api/README.md`) ou aponte para uma instância já existente.
5. Rode a aplicação:
   ```bash
   npm run dev
   ```

## Estrutura

- `src/app/(admin)/admin` — painel do Administrador Geral (todas as lojas).
- `src/app/(store)/*` — painel de cada loja: Dashboard, Monitor, Pedidos, Catálogo, Configurações.
- `src/app/api/webhook/evolution/[storeId]` — recebe as mensagens do WhatsApp via Evolution API.
- `src/app/api/cron/sync-catalog` — sincroniza o catálogo (Google Sheets → banco) periodicamente.
- `src/lib/claude.ts` + `src/lib/tools/*` — núcleo de IA: prompt, ferramentas e loop de tool use.
- `src/lib/evolution.ts` — cliente da Evolution API (enviar mensagens, QR code, status).
- `src/lib/googleSheets.ts` + `src/lib/catalogSync.ts` — leitura e sincronização do catálogo.
- `docker/evolution-api/` — stack Docker pronta para hospedar a Evolution API numa VPS.
- `docs/catalogo-google-sheets.md` — passo a passo do catálogo (também disponível em `/catalogo/guia` no painel).

## Deploy

- **Aplicação (este projeto)**: Vercel. Configure as variáveis de ambiente do `.env.example` no projeto
  Vercel e cadastre o cron job (já incluído em `vercel.json`) protegido por `CRON_SECRET`.
- **Evolution API**: precisa de conexão persistente com o WhatsApp — não roda no Vercel. Siga
  `docker/evolution-api/README.md` para subir numa VPS própria.
- **Banco de dados**: recomendado Neon (Postgres serverless, ótima integração com Vercel).

## Fluxo de mensagens

```
Cliente (WhatsApp) → Evolution API → Webhook (/api/webhook/evolution/[storeId])
  → Claude (com histórico + ferramentas) → tool use (estoque, preço, pedidos, handoff)
  → Evolution API → Cliente
```

Se a conversa estiver marcada como `HUMAN_ACTIVE` (por transferência automática do Claude ou por um
atendente que assumiu manualmente no Monitor), as mensagens do cliente são apenas registradas — o bot não
responde até a conversa voltar para `BOT_ACTIVE`.
