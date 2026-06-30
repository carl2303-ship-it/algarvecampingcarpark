import type { Locale } from "./constants";

const translations = {
  pt: {
    nav: {
      home: "Início",
      about: "Sobre",
      location: "Localização",
      contact: "Contacto",
      book: "Reservar",
      admin: "Admin",
    },
    home: {
      hero_title: "A sua ASA no coração do Algarve",
      hero_subtitle:
        "37 000 m² de natureza, vista mar e a autenticidade de Armação de Pêra. 57 lugares para autocaravanas.",
      cta_book: "Reservar agora",
      cta_contact: "Contactar",
      features: {
        capacity: "57 lugares",
        nature: "Ambiente natural",
        sea: "Vista mar",
        location: "Perto das praias",
      },
    },
    about: {
      title: "Sobre o parque",
      description:
        "A Área de Serviço para Autocaravanas Algarve Camping Car Park abriu em março de 2020. Localizada atrás do Estádio Municipal de Armação de Pêra, oferece um ambiente sossegado em plena natureza, a 10 minutos do Continente e 15 minutos das praias.",
    },
    location: {
      title: "Localização",
      address: "Armação de Pêra, Algarve, Portugal",
      directions: "Ligeiramente atrás do Estádio Municipal de Armação de Pêra",
    },
    contact: {
      title: "Contacto",
      subtitle: "Elodie & Romy estão disponíveis para ajudar",
    },
    book: {
      title: "Reservar o seu lugar",
      step_dates: "Datas",
      step_zone: "Zona",
      step_details: "Dados",
      step_payment: "Pagamento",
      check_in: "Check-in",
      check_out: "Check-out",
      select_dates: "Selecione as datas",
      no_availability: "Sem disponibilidade para estas datas",
      per_night: "por noite",
      total: "Total",
      nights: "noites",
      min_nights: "Mínimo de {n} noites",
      spots_left: "{n} lugares disponíveis",
      continue: "Continuar",
      pay: "Pagar e confirmar",
      guest_name: "Nome completo",
      guest_email: "Email",
      guest_phone: "Telefone",
      vehicle_plate: "Matrícula (opcional)",
      num_guests: "Número de pessoas",
      notes: "Notas (opcional)",
      success_title: "Reserva confirmada!",
      success_message: "Receberá um email de confirmação em breve.",
      cancelled: "Pagamento cancelado. Pode tentar novamente.",
    },
    footer: {
      rights: "Todos os direitos reservados",
      privacy: "Privacidade",
      terms: "Termos",
    },
  },
  en: {
    nav: {
      home: "Home",
      about: "About",
      location: "Location",
      contact: "Contact",
      book: "Book",
      admin: "Admin",
    },
    home: {
      hero_title: "Your motorhome stop in the Algarve",
      hero_subtitle:
        "37,000 m² of nature, sea views and the authenticity of Armação de Pêra. 57 motorhome pitches.",
      cta_book: "Book now",
      cta_contact: "Contact us",
      features: {
        capacity: "57 pitches",
        nature: "Natural setting",
        sea: "Sea view",
        location: "Near the beaches",
      },
    },
    about: {
      title: "About the park",
      description:
        "Algarve Camping Car Park opened in March 2020. Located behind Armação de Pêra Municipal Stadium, it offers a peaceful natural environment, 10 minutes from Continente supermarket and 15 minutes from the beaches.",
    },
    location: {
      title: "Location",
      address: "Armação de Pêra, Algarve, Portugal",
      directions: "Just behind Armação de Pêra Municipal Stadium",
    },
    contact: {
      title: "Contact",
      subtitle: "Elodie & Romy are here to help",
    },
    book: {
      title: "Book your pitch",
      step_dates: "Dates",
      step_zone: "Zone",
      step_details: "Details",
      step_payment: "Payment",
      check_in: "Check-in",
      check_out: "Check-out",
      select_dates: "Select dates",
      no_availability: "No availability for these dates",
      per_night: "per night",
      total: "Total",
      nights: "nights",
      min_nights: "Minimum {n} nights",
      spots_left: "{n} spots available",
      continue: "Continue",
      pay: "Pay and confirm",
      guest_name: "Full name",
      guest_email: "Email",
      guest_phone: "Phone",
      vehicle_plate: "License plate (optional)",
      num_guests: "Number of guests",
      notes: "Notes (optional)",
      success_title: "Booking confirmed!",
      success_message: "You will receive a confirmation email shortly.",
      cancelled: "Payment cancelled. You can try again.",
    },
    footer: {
      rights: "All rights reserved",
      privacy: "Privacy",
      terms: "Terms",
    },
  },
} as const;

export function getTranslations(locale: Locale) {
  return translations[locale] ?? translations.pt;
}

export function t(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  const keys = key.split(".");
  let value: unknown = getTranslations(locale);
  for (const k of keys) {
    value = (value as Record<string, unknown>)?.[k];
  }
  let str = typeof value === "string" ? value : key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, String(v));
    }
  }
  return str;
}
