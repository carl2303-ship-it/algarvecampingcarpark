import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BlockedDatesManager } from "@/components/admin/blocked-dates-manager";
import { createAdminClient } from "@/lib/supabase/admin";
import { CHECK_IN_TIME, CHECK_OUT_TIME, CONTACT_EMAIL } from "@/lib/constants";

export default async function SettingsPage() {
  const supabase = createAdminClient();
  const { data: zones } = await supabase.from("zones").select("id, name").order("sort_order");

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold">Definições</h1>

      <Card>
        <CardHeader>
          <CardTitle>Horários</CardTitle>
          <CardDescription>Configuração atual do parque</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>Check-in: a partir das {CHECK_IN_TIME}</p>
          <p>Check-out: até às {CHECK_OUT_TIME}</p>
        </CardContent>
      </Card>

      <BlockedDatesManager zones={zones ?? []} />

      <Card>
        <CardHeader>
          <CardTitle>Configurar admin</CardTitle>
          <CardDescription>
            Para criar o primeiro utilizador admin, execute no Supabase SQL Editor:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`-- 1. Criar utilizador em Authentication > Users
-- 2. Atribuir role admin:
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = '${CONTACT_EMAIL}';`}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Login admin em produção (Netlify/Vercel)</CardTitle>
          <CardDescription>
            Se o login funciona em local mas não no site publicado, verifique:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">1. Variáveis no hosting</strong> —{" "}
            NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY
            (depois redeploy).
          </p>
          <p>
            <strong className="text-foreground">2. Supabase → Authentication → URL Configuration</strong>
            {" "}— Site URL = URL do site publicado; Redirect URLs inclui o domínio
            (ex. https://teu-site.netlify.app/**).
          </p>
          <p>
            <strong className="text-foreground">3. Role admin</strong> — o utilizador precisa de{" "}
            <code className="text-xs bg-muted px-1 rounded">app_metadata.role = admin</code>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variáveis de ambiente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Configure Supabase, Stripe e Resend conforme o ficheiro .env.example na raiz do projeto.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
