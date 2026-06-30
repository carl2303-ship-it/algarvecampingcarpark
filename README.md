# Algarve Camping Car Park — Sistema de Reservas

Web-app completa para gestão e reservas online do parque de autocaravanas em Armação de Pêra.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Supabase** (PostgreSQL, Auth, RLS)
- **Stripe** (pagamentos online)
- **Resend** (emails transacionais)
- **Tailwind CSS + shadcn/ui**

## Setup local

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha as chaves Supabase, Stripe e Resend.

### 3. Configurar Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Execute a migration em `supabase/migrations/001_initial_schema.sql`
3. Execute o seed em `supabase/seed.sql`
4. Crie um utilizador admin em Authentication → Users
5. Atribua role admin:

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'seu-email@exemplo.com';
```

### 4. Configurar Stripe

1. Crie conta em [stripe.com](https://stripe.com)
2. Configure webhook para `https://seu-dominio/api/webhooks/stripe`
3. Eventos: `checkout.session.completed`, `checkout.session.expired`

### 5. Correr em desenvolvimento

```bash
npm run dev
```

- Site: http://localhost:3000
- Reservas: http://localhost:3000/book
- Admin: http://localhost:3000/admin

## Deploy (Vercel + Supabase)

### Vercel

1. Push para GitHub
2. Importe o projeto na [Vercel](https://vercel.com)
3. Adicione todas as variáveis de `.env.example`
4. Deploy

### DNS (algarvecampingcarpark.pt)

Aponte o domínio para a Vercel:

```
A     @    76.76.21.21
CNAME www  cname.vercel-dns.com
```

Atualize `NEXT_PUBLIC_APP_URL=https://algarvecampingcarpark.pt`

### Stripe webhook em produção

URL: `https://algarvecampingcarpark.pt/api/webhooks/stripe`

## Estrutura

```
src/
├── app/
│   ├── (marketing pages PT/EN)
│   ├── book/              # Fluxo de reserva
│   ├── admin/             # Backoffice
│   └── api/               # APIs
├── components/
├── lib/                   # Supabase, Stripe, pricing
└── types/
supabase/
├── migrations/            # Schema SQL
└── seed.sql               # Dados iniciais
```

## Funcionalidades

- Reservas online por zonas com disponibilidade em tempo real
- Pagamento total via Stripe Checkout
- Backoffice: dashboard, reservas, calendário, check-in/out
- Export CSV de reservas
- Site marketing PT/EN
- 3 zonas seed: Com Eletricidade (30), Sem Eletricidade (17), Premium Vista Mar (10)
