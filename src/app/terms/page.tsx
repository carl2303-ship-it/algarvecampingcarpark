import { MarketingLayout } from "@/components/layout/marketing-layout";
import { CHECK_IN_TIME, CHECK_OUT_TIME } from "@/lib/constants";

export default function TermsPage() {
  return (
    <MarketingLayout locale="pt">
      <div className="container mx-auto px-4 py-16 max-w-3xl prose dark:prose-invert">
        <h1>Termos e Condições</h1>
        <h2>Reservas</h2>
        <ul>
          <li>Check-in a partir das {CHECK_IN_TIME}</li>
          <li>Check-out até às {CHECK_OUT_TIME}</li>
          <li>O lugar específico é atribuído na chegada</li>
          <li>Pagamento total obrigatório no momento da reserva</li>
        </ul>
        <h2>Cancelamentos</h2>
        <p>
          Contacte-nos por email para pedidos de cancelamento. A política de reembolso
          será comunicada caso a caso.
        </p>
      </div>
    </MarketingLayout>
  );
}
