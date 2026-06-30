import { MarketingLayout } from "@/components/layout/marketing-layout";

export default function PrivacyPage() {
  return (
    <MarketingLayout locale="pt">
      <div className="container mx-auto px-4 py-16 max-w-3xl prose dark:prose-invert">
        <h1>Política de Privacidade</h1>
        <p>
          O {`Elodie & Romy's Algarve Camping Car Park`} recolhe apenas os dados necessários
          para processar reservas: nome, email, telefone e matrícula (opcional).
        </p>
        <p>
          Os dados são utilizados exclusivamente para gestão de reservas e comunicação
          relacionada com a estadia. Não partilhamos dados com terceiros exceto processadores
          de pagamento (Stripe) conforme necessário.
        </p>
        <p>
          Para exercer os seus direitos RGPD, contacte: algarvecampingcarpark@gmail.com
        </p>
      </div>
    </MarketingLayout>
  );
}
