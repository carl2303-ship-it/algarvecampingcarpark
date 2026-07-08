import { CONTACT_EMAIL, SITE_NAME, SITE_SHORT_NAME } from "@/lib/constants";
import type { Locale } from "@/lib/constants";

export type PrivacySection = {
  title: string;
  paragraphs?: string[];
  list?: { label: string; text: string }[];
  bullets?: string[];
  closingParagraphs?: string[];
};

export type PrivacyContent = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: PrivacySection[];
  lastUpdatedLabel: string;
  lastUpdated: string;
};

const privacyPt: PrivacyContent = {
  eyebrow: "RGPD",
  title: "Política de Privacidade e Proteção de Dados",
  intro:
    "A privacidade e a segurança dos dados dos nossos hóspedes são uma prioridade para o Algarve Camping Car Park. A presente Política de Privacidade explica como recolhemos, utilizamos, tratamos e protegemos os seus dados pessoais, em total conformidade com o Regulamento Geral sobre a Proteção de Dados (RGPD) da União Europeia.",
  sections: [
    {
      title: "1. Responsável pelo Tratamento dos Dados",
      paragraphs: [
        `O responsável pela recolha e tratamento dos seus dados pessoais através do site algarvecampingcarpark.pt é o ${SITE_SHORT_NAME} (${SITE_NAME}). Para qualquer questão relacionada com a sua privacidade, pode contactar-nos através do e-mail: ${CONTACT_EMAIL}.`,
      ],
    },
    {
      title: "2. Dados Que Recolhemos e Finalidade",
      paragraphs: [
        "Recolhemos e tratamos apenas a informação estritamente necessária para garantir a eficácia dos nossos serviços. Os dados recolhidos incluem:",
      ],
      list: [
        {
          label: "Nome Completo",
          text: "Para identificação do hóspede e emissão de faturas.",
        },
        {
          label: "Endereço de E-mail e Telefone",
          text: "Para confirmação de reservas, comunicações operacionais relativas à estadia e apoio ao cliente.",
        },
        {
          label: "Matrícula do Veículo (Opcional/Se aplicável)",
          text: "Para controlo de acessos, segurança do recinto e organização dos lugares do parque.",
        },
        {
          label: "Dados de Pagamento",
          text: "Processados de forma encriptada e segura diretamente pelos nossos parceiros de pagamento (Stripe), sem que tenhamos acesso direto aos dados do seu cartão.",
        },
      ],
    },
    {
      title: "3. Base Legal para o Tratamento",
      paragraphs: ["O tratamento dos seus dados baseia-se nos seguintes fundamentos jurídicos:"],
      bullets: [
        "Execução de um contrato: Necessário para processar a sua reserva e gerir a sua estadia no nosso parque de autocaravanas.",
        "Cumprimento de obrigações legais: Para a emissão de faturas fiscais e eventual comunicação obrigatória às autoridades competentes (como o Serviço de Estrangeiros e Fronteiras / autoridades policiais, se exigido por lei).",
        "Consentimento: No caso de comunicações opcionais ou preenchimento de dados facultativos.",
      ],
    },
    {
      title: "4. Partilha de Dados com Terceiros",
      paragraphs: [
        `O ${SITE_SHORT_NAME} não vende, não aluga e não partilha os seus dados pessoais com terceiros para fins de marketing. Os seus dados são partilhados exclusivamente com fornecedores de serviços estritamente necessários para a operação, nomeadamente:`,
      ],
      bullets: [
        "Plataformas de Pagamento (Stripe): Para o processamento seguro das transações financeiras.",
        "Autoridades Oficiais: Apenas quando legalmente obrigatório pelas autoridades portuguesas.",
      ],
    },
    {
      title: "5. Prazo de Conservação dos Dados",
      paragraphs: [
        "Conservamos os seus dados pessoais apenas durante o período estritamente necessário para cumprir as finalidades para as quais foram recolhidos (a gestão da reserva e da estadia) ou para cumprir as obrigações legais e fiscais em vigor em Portugal (por exemplo, os dados de faturação são legalmente conservados por um período de 10 anos).",
      ],
    },
    {
      title: "6. Segurança dos Dados",
      paragraphs: [
        "Implementamos medidas de segurança técnicas e organizativas adequadas (incluindo a utilização de protocolos de segurança como o HTTPS/SSL no nosso website) para proteger os seus dados pessoais contra acessos não autorizados, perda, destruição ou alteração.",
      ],
    },
    {
      title: "7. Os Seus Direitos (RGPD)",
      paragraphs: [
        `De acordo com o RGPD, o utilizador tem o direito de, a qualquer momento, solicitar ao ${SITE_SHORT_NAME}:`,
      ],
      bullets: [
        "O acesso aos dados que possuímos sobre si;",
        "A retificação de informações incorretas ou desatualizadas;",
        "O apagamento dos seus dados pessoais (direito a ser esquecido), desde que não colida com obrigações legais de retenção;",
        "A limitação ou oposição ao tratamento dos seus dados.",
      ],
      closingParagraphs: [
        `Para exercer qualquer um destes direitos, basta enviar um pedido por escrito para o e-mail: ${CONTACT_EMAIL}. Se considerar que os seus direitos foram violados, tem também o direito de apresentar uma reclamação junto da autoridade de controlo nacional (CNPD – Comissão Nacional de Proteção de Dados).`,
      ],
    },
    {
      title: "8. Atualizações a esta Política",
      paragraphs: [
        "Esta política pode ser atualizada periodicamente para refletir alterações nas nossas práticas ou na legislação. A data da última atualização será sempre indicada no final deste documento.",
      ],
    },
  ],
  lastUpdatedLabel: "Última atualização",
  lastUpdated: "Julho de 2026",
};

const privacyEn: PrivacyContent = {
  eyebrow: "GDPR",
  title: "Privacy Policy and Data Protection",
  intro:
    "The privacy and security of our guests' data are a priority for Algarve Camping Car Park. This Privacy Policy explains how we collect, use, process and protect your personal data, in full compliance with the European Union General Data Protection Regulation (GDPR).",
  sections: [
    {
      title: "1. Data Controller",
      paragraphs: [
        `The controller responsible for collecting and processing your personal data through the website algarvecampingcarpark.pt is ${SITE_SHORT_NAME} (${SITE_NAME}). For any privacy-related questions, you can contact us at: ${CONTACT_EMAIL}.`,
      ],
    },
    {
      title: "2. Data We Collect and Purpose",
      paragraphs: [
        "We collect and process only the information strictly necessary to ensure the effectiveness of our services. The data collected includes:",
      ],
      list: [
        {
          label: "Full Name",
          text: "For guest identification and invoice issuance.",
        },
        {
          label: "Email Address and Phone Number",
          text: "For booking confirmation, operational communications regarding your stay and customer support.",
        },
        {
          label: "Vehicle Registration (Optional/If applicable)",
          text: "For access control, site security and organisation of parking spaces.",
        },
        {
          label: "Payment Data",
          text: "Processed in an encrypted and secure manner directly by our payment partners (Stripe), without us having direct access to your card details.",
        },
      ],
    },
    {
      title: "3. Legal Basis for Processing",
      paragraphs: ["The processing of your data is based on the following legal grounds:"],
      bullets: [
        "Performance of a contract: Necessary to process your booking and manage your stay at our motorhome park.",
        "Compliance with legal obligations: For the issuance of tax invoices and any mandatory communication to the competent authorities (such as the Immigration and Border Service / police authorities, if required by law).",
        "Consent: In the case of optional communications or completion of non-mandatory data fields.",
      ],
    },
    {
      title: "4. Sharing Data with Third Parties",
      paragraphs: [
        `${SITE_SHORT_NAME} does not sell, rent or share your personal data with third parties for marketing purposes. Your data is shared exclusively with service providers strictly necessary for operations, namely:`,
      ],
      bullets: [
        "Payment Platforms (Stripe): For secure processing of financial transactions.",
        "Official Authorities: Only when legally required by Portuguese authorities.",
      ],
    },
    {
      title: "5. Data Retention Period",
      paragraphs: [
        "We retain your personal data only for the period strictly necessary to fulfil the purposes for which it was collected (booking and stay management) or to comply with legal and tax obligations in force in Portugal (for example, billing data is legally retained for a period of 10 years).",
      ],
    },
    {
      title: "6. Data Security",
      paragraphs: [
        "We implement appropriate technical and organisational security measures (including the use of security protocols such as HTTPS/SSL on our website) to protect your personal data against unauthorised access, loss, destruction or alteration.",
      ],
    },
    {
      title: "7. Your Rights (GDPR)",
      paragraphs: [
        `Under the GDPR, you have the right at any time to request from ${SITE_SHORT_NAME}:`,
      ],
      bullets: [
        "Access to the data we hold about you;",
        "Rectification of incorrect or outdated information;",
        "Erasure of your personal data (right to be forgotten), provided this does not conflict with legal retention obligations;",
        "Restriction of or objection to the processing of your data.",
      ],
      closingParagraphs: [
        `To exercise any of these rights, simply send a written request to: ${CONTACT_EMAIL}. If you believe your rights have been violated, you also have the right to lodge a complaint with the national supervisory authority (CNPD – Comissão Nacional de Proteção de Dados).`,
      ],
    },
    {
      title: "8. Updates to This Policy",
      paragraphs: [
        "This policy may be updated periodically to reflect changes in our practices or legislation. The date of the last update will always be indicated at the end of this document.",
      ],
    },
  ],
  lastUpdatedLabel: "Last updated",
  lastUpdated: "July 2026",
};

export function getPrivacyContent(locale: Locale): PrivacyContent {
  return locale === "en" ? privacyEn : privacyPt;
}
