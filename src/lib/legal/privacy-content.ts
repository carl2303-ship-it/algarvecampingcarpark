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

const privacyFr: PrivacyContent = {
  eyebrow: "RGPD",
  title: "Politique de confidentialité et protection des données",
  intro:
    "La confidentialité et la sécurité des données de nos clients sont une priorité pour Algarve Camping Car Park. La présente Politique de confidentialité explique comment nous collectons, utilisons, traitons et protégeons vos données personnelles, en pleine conformité avec le Règlement général sur la protection des données (RGPD) de l'Union européenne.",
  sections: [
    {
      title: "1. Responsable du traitement des données",
      paragraphs: [
        `Le responsable de la collecte et du traitement de vos données personnelles via le site algarvecampingcarpark.pt est ${SITE_SHORT_NAME} (${SITE_NAME}). Pour toute question relative à votre vie privée, vous pouvez nous contacter à : ${CONTACT_EMAIL}.`,
      ],
    },
    {
      title: "2. Données collectées et finalité",
      paragraphs: [
        "Nous collectons et traitons uniquement les informations strictement nécessaires pour assurer l'efficacité de nos services. Les données collectées comprennent :",
      ],
      list: [
        {
          label: "Nom complet",
          text: "Pour l'identification du client et l'émission de factures.",
        },
        {
          label: "Adresse e-mail et téléphone",
          text: "Pour la confirmation des réservations, les communications opérationnelles relatives au séjour et le support client.",
        },
        {
          label: "Immatriculation du véhicule (facultatif / si applicable)",
          text: "Pour le contrôle d'accès, la sécurité du site et l'organisation des emplacements.",
        },
        {
          label: "Données de paiement",
          text: "Traitées de manière chiffrée et sécurisée directement par nos partenaires de paiement (Stripe), sans que nous ayons accès direct aux données de votre carte.",
        },
      ],
    },
    {
      title: "3. Base juridique du traitement",
      paragraphs: ["Le traitement de vos données repose sur les fondements juridiques suivants :"],
      bullets: [
        "Exécution d'un contrat : Nécessaire pour traiter votre réservation et gérer votre séjour dans notre aire de camping-cars.",
        "Respect d'obligations légales : Pour l'émission de factures fiscales et toute communication obligatoire aux autorités compétentes (comme le service des étrangers et des frontières / autorités de police, si la loi l'exige).",
        "Consentement : Dans le cas de communications optionnelles ou du renseignement de données facultatives.",
      ],
    },
    {
      title: "4. Partage des données avec des tiers",
      paragraphs: [
        `${SITE_SHORT_NAME} ne vend, ne loue ni ne partage vos données personnelles avec des tiers à des fins marketing. Vos données sont partagées exclusivement avec des prestataires strictement nécessaires au fonctionnement, notamment :`,
      ],
      bullets: [
        "Plateformes de paiement (Stripe) : Pour le traitement sécurisé des transactions financières.",
        "Autorités officielles : Uniquement lorsque la loi portugaise l'exige.",
      ],
    },
    {
      title: "5. Durée de conservation des données",
      paragraphs: [
        "Nous conservons vos données personnelles uniquement pendant la période strictement nécessaire pour remplir les finalités pour lesquelles elles ont été collectées (gestion de la réservation et du séjour) ou pour respecter les obligations légales et fiscales en vigueur au Portugal (par exemple, les données de facturation sont légalement conservées pendant 10 ans).",
      ],
    },
    {
      title: "6. Sécurité des données",
      paragraphs: [
        "Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées (y compris l'utilisation de protocoles tels que HTTPS/SSL sur notre site) pour protéger vos données personnelles contre tout accès non autorisé, perte, destruction ou altération.",
      ],
    },
    {
      title: "7. Vos droits (RGPD)",
      paragraphs: [
        `Conformément au RGPD, vous avez le droit de demander à tout moment à ${SITE_SHORT_NAME} :`,
      ],
      bullets: [
        "L'accès aux données que nous détenons à votre sujet ;",
        "La rectification d'informations incorrectes ou obsolètes ;",
        "L'effacement de vos données personnelles (droit à l'oubli), sous réserve qu'il n'entre pas en conflit avec des obligations légales de conservation ;",
        "La limitation ou l'opposition au traitement de vos données.",
      ],
      closingParagraphs: [
        `Pour exercer l'un de ces droits, il suffit d'envoyer une demande écrite à : ${CONTACT_EMAIL}. Si vous estimez que vos droits ont été violés, vous avez également le droit de déposer une plainte auprès de l'autorité de contrôle nationale (CNPD – Comissão Nacional de Proteção de Dados).`,
      ],
    },
    {
      title: "8. Mises à jour de cette politique",
      paragraphs: [
        "Cette politique peut être mise à jour périodiquement pour refléter des changements dans nos pratiques ou dans la législation. La date de la dernière mise à jour sera toujours indiquée à la fin de ce document.",
      ],
    },
  ],
  lastUpdatedLabel: "Dernière mise à jour",
  lastUpdated: "Juillet 2026",
};

const privacyDe: PrivacyContent = {
  eyebrow: "DSGVO",
  title: "Datenschutzrichtlinie und Datenschutz",
  intro:
    "Die Privatsphäre und Sicherheit der Daten unserer Gäste haben für Algarve Camping Car Park Priorität. Diese Datenschutzrichtlinie erklärt, wie wir Ihre personenbezogenen Daten erheben, verwenden, verarbeiten und schützen – in voller Übereinstimmung mit der Datenschutz-Grundverordnung (DSGVO) der Europäischen Union.",
  sections: [
    {
      title: "1. Verantwortlicher für die Datenverarbeitung",
      paragraphs: [
        `Verantwortlich für die Erhebung und Verarbeitung Ihrer personenbezogenen Daten über die Website algarvecampingcarpark.pt ist ${SITE_SHORT_NAME} (${SITE_NAME}). Bei Fragen zum Datenschutz können Sie uns kontaktieren unter: ${CONTACT_EMAIL}.`,
      ],
    },
    {
      title: "2. Erhobene Daten und Zweck",
      paragraphs: [
        "Wir erheben und verarbeiten nur die Informationen, die zur wirksamen Erbringung unserer Leistungen unbedingt erforderlich sind. Die erhobenen Daten umfassen:",
      ],
      list: [
        {
          label: "Vollständiger Name",
          text: "Zur Identifikation des Gastes und zur Ausstellung von Rechnungen.",
        },
        {
          label: "E-Mail-Adresse und Telefonnummer",
          text: "Zur Buchungsbestätigung, betrieblichen Kommunikation zum Aufenthalt und zum Kundensupport.",
        },
        {
          label: "Fahrzeugkennzeichen (optional / sofern zutreffend)",
          text: "Zur Zugangskontrolle, Sicherheit der Anlage und Organisation der Stellplätze.",
        },
        {
          label: "Zahlungsdaten",
          text: "Verschlüsselt und sicher direkt durch unsere Zahlungspartner (Stripe) verarbeitet, ohne dass wir direkten Zugriff auf Ihre Kartendaten haben.",
        },
      ],
    },
    {
      title: "3. Rechtsgrundlage der Verarbeitung",
      paragraphs: ["Die Verarbeitung Ihrer Daten stützt sich auf folgende Rechtsgrundlagen:"],
      bullets: [
        "Erfüllung eines Vertrags: Erforderlich zur Bearbeitung Ihrer Buchung und zur Verwaltung Ihres Aufenthalts in unserem Wohnmobilpark.",
        "Erfüllung gesetzlicher Verpflichtungen: Zur Ausstellung steuerlicher Rechnungen und ggf. zur obligatorischen Mitteilung an zuständige Behörden (z. B. Ausländer- und Grenzbehörde / Polizei, sofern gesetzlich vorgeschrieben).",
        "Einwilligung: Bei optionaler Kommunikation oder Angabe freiwilliger Daten.",
      ],
    },
    {
      title: "4. Weitergabe von Daten an Dritte",
      paragraphs: [
        `${SITE_SHORT_NAME} verkauft, vermietet oder teilt Ihre personenbezogenen Daten nicht mit Dritten zu Marketingzwecken. Ihre Daten werden ausschließlich an Dienstleister weitergegeben, die für den Betrieb unbedingt erforderlich sind, insbesondere:`,
      ],
      bullets: [
        "Zahlungsplattformen (Stripe): Für die sichere Abwicklung finanzieller Transaktionen.",
        "Behörden: Nur wenn dies nach portugiesischem Recht vorgeschrieben ist.",
      ],
    },
    {
      title: "5. Aufbewahrungsfrist der Daten",
      paragraphs: [
        "Wir speichern Ihre personenbezogenen Daten nur so lange, wie es zur Erfüllung der Zwecke, für die sie erhoben wurden (Buchungs- und Aufenthaltsverwaltung), oder zur Einhaltung der in Portugal geltenden gesetzlichen und steuerlichen Verpflichtungen erforderlich ist (beispielsweise werden Rechnungsdaten gesetzlich 10 Jahre aufbewahrt).",
      ],
    },
    {
      title: "6. Datensicherheit",
      paragraphs: [
        "Wir setzen geeignete technische und organisatorische Sicherheitsmaßnahmen ein (einschließlich Sicherheitsprotokollen wie HTTPS/SSL auf unserer Website), um Ihre personenbezogenen Daten vor unbefugtem Zugriff, Verlust, Zerstörung oder Veränderung zu schützen.",
      ],
    },
    {
      title: "7. Ihre Rechte (DSGVO)",
      paragraphs: [
        `Gemäß der DSGVO haben Sie jederzeit das Recht, von ${SITE_SHORT_NAME} zu verlangen:`,
      ],
      bullets: [
        "Auskunft über die Daten, die wir über Sie speichern;",
        "Berichtigung unrichtiger oder veralteter Informationen;",
        "Löschung Ihrer personenbezogenen Daten (Recht auf Vergessenwerden), sofern dem keine gesetzlichen Aufbewahrungspflichten entgegenstehen;",
        "Einschränkung der Verarbeitung oder Widerspruch gegen die Verarbeitung Ihrer Daten.",
      ],
      closingParagraphs: [
        `Um eines dieser Rechte auszuüben, senden Sie einfach eine schriftliche Anfrage an: ${CONTACT_EMAIL}. Wenn Sie der Ansicht sind, dass Ihre Rechte verletzt wurden, haben Sie auch das Recht, eine Beschwerde bei der nationalen Aufsichtsbehörde (CNPD – Comissão Nacional de Proteção de Dados) einzureichen.`,
      ],
    },
    {
      title: "8. Aktualisierungen dieser Richtlinie",
      paragraphs: [
        "Diese Richtlinie kann regelmäßig aktualisiert werden, um Änderungen unserer Praktiken oder der Gesetzgebung widerzuspiegeln. Das Datum der letzten Aktualisierung wird stets am Ende dieses Dokuments angegeben.",
      ],
    },
  ],
  lastUpdatedLabel: "Zuletzt aktualisiert",
  lastUpdated: "Juli 2026",
};

const privacyEs: PrivacyContent = {
  eyebrow: "RGPD",
  title: "Política de privacidad y protección de datos",
  intro:
    "La privacidad y la seguridad de los datos de nuestros huéspedes son una prioridad para Algarve Camping Car Park. La presente Política de privacidad explica cómo recopilamos, utilizamos, tratamos y protegemos sus datos personales, en plena conformidad con el Reglamento General de Protección de Datos (RGPD) de la Unión Europea.",
  sections: [
    {
      title: "1. Responsable del tratamiento de los datos",
      paragraphs: [
        `El responsable de la recogida y el tratamiento de sus datos personales a través del sitio algarvecampingcarpark.pt es ${SITE_SHORT_NAME} (${SITE_NAME}). Para cualquier cuestión relacionada con su privacidad, puede contactarnos en: ${CONTACT_EMAIL}.`,
      ],
    },
    {
      title: "2. Datos que recopilamos y finalidad",
      paragraphs: [
        "Recopilamos y tratamos únicamente la información estrictamente necesaria para garantizar la eficacia de nuestros servicios. Los datos recogidos incluyen:",
      ],
      list: [
        {
          label: "Nombre completo",
          text: "Para la identificación del huésped y la emisión de facturas.",
        },
        {
          label: "Correo electrónico y teléfono",
          text: "Para la confirmación de reservas, comunicaciones operativas relativas a la estancia y atención al cliente.",
        },
        {
          label: "Matrícula del vehículo (opcional / si procede)",
          text: "Para el control de accesos, la seguridad del recinto y la organización de las plazas del parque.",
        },
        {
          label: "Datos de pago",
          text: "Procesados de forma cifrada y segura directamente por nuestros socios de pago (Stripe), sin que tengamos acceso directo a los datos de su tarjeta.",
        },
      ],
    },
    {
      title: "3. Base legal del tratamiento",
      paragraphs: ["El tratamiento de sus datos se basa en los siguientes fundamentos jurídicos:"],
      bullets: [
        "Ejecución de un contrato: Necesario para procesar su reserva y gestionar su estancia en nuestro parque de autocaravanas.",
        "Cumplimiento de obligaciones legales: Para la emisión de facturas fiscales y eventual comunicación obligatoria a las autoridades competentes (como el Servicio de Extranjeros y Fronteras / autoridades policiales, si lo exige la ley).",
        "Consentimiento: En el caso de comunicaciones opcionales o del relleno de datos facultativos.",
      ],
    },
    {
      title: "4. Cesión de datos a terceros",
      paragraphs: [
        `${SITE_SHORT_NAME} no vende, no alquila ni comparte sus datos personales con terceros con fines de marketing. Sus datos se comparten exclusivamente con proveedores de servicios estrictamente necesarios para la operación, en concreto:`,
      ],
      bullets: [
        "Plataformas de pago (Stripe): Para el procesamiento seguro de las transacciones financieras.",
        "Autoridades oficiales: Solo cuando lo exija legalmente la normativa portuguesa.",
      ],
    },
    {
      title: "5. Plazo de conservación de los datos",
      paragraphs: [
        "Conservamos sus datos personales únicamente durante el periodo estrictamente necesario para cumplir las finalidades para las que se recogieron (gestión de la reserva y de la estancia) o para cumplir las obligaciones legales y fiscales vigentes en Portugal (por ejemplo, los datos de facturación se conservan legalmente durante 10 años).",
      ],
    },
    {
      title: "6. Seguridad de los datos",
      paragraphs: [
        "Aplicamos medidas de seguridad técnicas y organizativas adecuadas (incluido el uso de protocolos de seguridad como HTTPS/SSL en nuestro sitio web) para proteger sus datos personales frente a accesos no autorizados, pérdida, destrucción o alteración.",
      ],
    },
    {
      title: "7. Sus derechos (RGPD)",
      paragraphs: [
        `De acuerdo con el RGPD, el usuario tiene derecho a solicitar en cualquier momento a ${SITE_SHORT_NAME}:`,
      ],
      bullets: [
        "El acceso a los datos que poseemos sobre usted;",
        "La rectificación de información incorrecta o desactualizada;",
        "La eliminación de sus datos personales (derecho al olvido), siempre que no entre en conflicto con obligaciones legales de retención;",
        "La limitación u oposición al tratamiento de sus datos.",
      ],
      closingParagraphs: [
        `Para ejercer cualquiera de estos derechos, basta con enviar una solicitud por escrito a: ${CONTACT_EMAIL}. Si considera que sus derechos han sido vulnerados, también tiene derecho a presentar una reclamación ante la autoridad de control nacional (CNPD – Comissão Nacional de Proteção de Dados).`,
      ],
    },
    {
      title: "8. Actualizaciones de esta política",
      paragraphs: [
        "Esta política puede actualizarse periódicamente para reflejar cambios en nuestras prácticas o en la legislación. La fecha de la última actualización se indicará siempre al final de este documento.",
      ],
    },
  ],
  lastUpdatedLabel: "Última actualización",
  lastUpdated: "Julio de 2026",
};

const privacyByLocale: Record<Locale, PrivacyContent> = {
  pt: privacyPt,
  en: privacyEn,
  fr: privacyFr,
  de: privacyDe,
  es: privacyEs,
};

export function getPrivacyContent(locale: Locale): PrivacyContent {
  return privacyByLocale[locale] ?? privacyPt;
}
