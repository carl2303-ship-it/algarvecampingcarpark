import type { Locale } from "./constants";

const translations = {
  pt: {
    nav: {
      home: "Início",
      about: "Sobre",
      prices: "Preçário",
      location: "Localização",
      contact: "Contacto",
      book: "Reservar",
      admin: "Admin",
    },
    home: {
      hero_badge: "ASA · Armação de Pêra",
      hero_title: "Natureza, mar e tranquilidade no Algarve",
      hero_subtitle:
        "37 000 m² de espaço natural com vista para o oceano. A sua área de serviço para autocaravanas a poucos minutos das praias mais belas da região.",
      cta_book: "Reservar lugar",
      cta_location: "Ver localização",
      cta_contact: "Falar connosco",
      stats: {
        pitches: "lugares",
        area: "m² naturais",
        since: "desde 2020",
        view: "vista mar",
      },
      features_eyebrow: "O parque",
      features_title: "Uma experiência diferente",
      features_subtitle:
        "Muito mais do que um parque de estacionamento — um refúgio junto ao Atlântico.",
      features: {
        capacity: "57 lugares",
        capacity_desc: "Capacidade para autocaravanas de todos os tamanhos, com zonas com e sem eletricidade.",
        nature: "Ambiente natural",
        nature_desc: "37 000 m² de terreno arborizado, sossegado e autêntico.",
        sea: "Vista mar",
        sea_desc: "Lugares privilegiados com panorama sobre o oceano Atlântico.",
        location: "Perto de tudo",
        location_desc: "10 min do Continente, 15 min das praias de Armação de Pêra.",
      },
      experience_eyebrow: "A nossa história",
      experience_title: "Aberto desde março de 2020",
      experience_text:
        "Criado e gerido pela Elodie e a Romy, o Algarve Camping Car Park nasceu da vontade de oferecer uma área de serviço acolhedora e diferente — em plena natureza, mas perto do comércio e das praias.",
      experience_cta: "Conhecer o parque",
      location_eyebrow: "Onde estamos",
      location_title: "Sítio da Torre, Quintão",
      location_text:
        "Ligeiramente atrás do Estádio Municipal de Armação de Pêra. Fácil acesso e estacionamento amplo para autocaravanas.",
      location_cta: "Abrir no Google Maps",
      cta_banner_title: "Pronto para a sua estadia?",
      cta_banner_text: "Reserve online em poucos minutos. Pagamento seguro e confirmação imediata.",
    },
    about: {
      title: "Sobre o parque",
      description:
        "A Área de Serviço para Autocaravanas Algarve Camping Car Park abriu em março de 2020. Localizada atrás do Estádio Municipal de Armação de Pêra, oferece um ambiente sossegado em plena natureza, a 10 minutos do Continente e 15 minutos das praias.",
      services_title: "Serviços & comodidades",
      services: [
        "Eletricidade 16A nas zonas equipadas",
        "Água potável e esgotos",
        "37 000 m² de ambiente natural",
        "57 lugares para autocaravanas",
        "Vista mar em zonas premium",
        "Acesso fácil e estacionamento amplo",
      ],
      gallery_title: "Galeria",
      gallery_subtitle: "Conheça o parque, as zonas e a paisagem envolvente.",
      reviews_title: "Avaliações dos visitantes",
      reviews_subtitle: "Opiniões reais de quem já passou pelo parque.",
      reviews_count: "avaliações no Google",
      reviews_cta: "Ver no Google Maps",
      reviews_no_text: "Avaliação com estrelas, sem comentário escrito.",
      reviews_api_note:
        "As avaliações do Google não estão disponíveis neste momento. No Google Cloud, use uma chave API sem restrição HTTP referer e defina GOOGLE_PLACES_API_KEY no Netlify.",
      reviews_missing_key:
        "Chave API não encontrada no servidor. No Netlify, adicione GOOGLE_PLACES_API_KEY (ou NEXT_PUBLIC_GOOGLE_PLACES_API_KEY) e faça um novo deploy.",
      reviews_denied:
        "A chave API foi rejeitada pelo Google. No Google Cloud Console, remova a restrição HTTP referer (use «None») e mantenha apenas a Places API ativa.",
    },
    location: {
      title: "Localização",
      address: "Sítio da Torre, Quintão, 8365-184 Armação de Pêra",
      directions: "Ligeiramente atrás do Estádio Municipal de Armação de Pêra",
      open_maps: "Abrir no Google Maps",
      getting_here: "Como chegar",
      distances: {
        continente: "10 min — Supermercado Continente",
        beaches: "15 min — Praias de Armação de Pêra",
        faro: "~45 min — Aeroporto de Faro",
      },
    },
    contact: {
      title: "Contacto",
      subtitle: "Elodie & Romy estão disponíveis para ajudar",
      email_label: "Email",
      phone_label: "Telefone",
      hosts: "Elodie & Romy — os seus anfitriões",
    },
    prices: {
      title: "Preçário",
      subtitle:
        "Tarifas por época e zona. O valor final da reserva online é calculado automaticamente consoante as datas escolhidas.",
      summer: "Época de verão",
      summer_period: "Junho a Setembro",
      winter: "Época de inverno",
      winter_period: "Outubro a Maio",
      services: "Serviços adicionais",
      services_desc: "Eletricidade, água e outros serviços disponíveis no parque.",
      note: "Os preços podem variar consoante a época e a zona. Para reservar, o sistema calcula o total exacto no momento da reserva.",
      cta: "Reservar com preço em tempo real",
      updated: "Preços em tempo real",
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
      vehicle_plate: "Matrícula",
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
      tagline: "Área de serviço para autocaravanas no coração do Algarve.",
      navigate: "Navegar",
      contact: "Contacto",
    },
    install: {
      title: "Instale a app no seu telemóvel",
      android_desc: "Acesso rápido às reservas, preçário e contactos — como uma app nativa.",
      android_manual: "No Chrome: menu ⋮ → «Instalar aplicação» ou «Adicionar ao ecrã principal».",
      ios_desc: "Adicione ao ecrã principal para aceder rapidamente, sem abrir o browser.",
      ios_step1: "Toque em Partilhar no Safari",
      ios_step2: "Escolha «Adicionar ao ecrã principal»",
      install_btn: "Instalar app",
      later: "Agora não",
      dismiss: "Fechar",
    },
  },
  en: {
    nav: {
      home: "Home",
      about: "About",
      prices: "Prices",
      location: "Location",
      contact: "Contact",
      book: "Book",
      admin: "Admin",
    },
    home: {
      hero_badge: "Service area · Armação de Pêra",
      hero_title: "Nature, sea and tranquillity in the Algarve",
      hero_subtitle:
        "37,000 m² of natural space overlooking the ocean. Your motorhome service area just minutes from the region's most beautiful beaches.",
      cta_book: "Book a pitch",
      cta_location: "View location",
      cta_contact: "Get in touch",
      stats: {
        pitches: "pitches",
        area: "m² of nature",
        since: "since 2020",
        view: "sea view",
      },
      features_eyebrow: "The park",
      features_title: "A different experience",
      features_subtitle:
        "Much more than a parking area — a retreat by the Atlantic.",
      features: {
        capacity: "57 pitches",
        capacity_desc: "Room for motorhomes of all sizes, with electric and non-electric zones.",
        nature: "Natural setting",
        nature_desc: "37,000 m² of wooded, peaceful and authentic land.",
        sea: "Sea view",
        sea_desc: "Premium pitches with panoramic Atlantic views.",
        location: "Close to everything",
        location_desc: "10 min to Continente, 15 min to Armação de Pêra beaches.",
      },
      experience_eyebrow: "Our story",
      experience_title: "Open since March 2020",
      experience_text:
        "Created by Elodie and Romy, Algarve Camping Car Park was born from a desire to offer a welcoming, unique service area — surrounded by nature, yet close to shops and beaches.",
      experience_cta: "Discover the park",
      location_eyebrow: "Find us",
      location_title: "Sítio da Torre, Quintão",
      location_text:
        "Just behind Armação de Pêra Municipal Stadium. Easy access and ample parking for motorhomes.",
      location_cta: "Open in Google Maps",
      cta_banner_title: "Ready for your stay?",
      cta_banner_text: "Book online in minutes. Secure payment and instant confirmation.",
    },
    about: {
      title: "About the park",
      description:
        "Algarve Camping Car Park opened in March 2020. Located behind Armação de Pêra Municipal Stadium, it offers a peaceful natural environment, 10 minutes from Continente supermarket and 15 minutes from the beaches.",
      services_title: "Services & amenities",
      services: [
        "16A electricity in equipped zones",
        "Fresh water and waste disposal",
        "37,000 m² natural environment",
        "57 motorhome pitches",
        "Sea view in premium zones",
        "Easy access and ample parking",
      ],
      gallery_title: "Gallery",
      gallery_subtitle: "Explore the park, its zones and the surrounding landscape.",
      reviews_title: "Guest reviews",
      reviews_subtitle: "Real feedback from visitors who stayed at the park.",
      reviews_count: "Google reviews",
      reviews_cta: "View on Google Maps",
      reviews_no_text: "Star rating without a written comment.",
      reviews_api_note:
        "Google reviews are temporarily unavailable. In Google Cloud, use an API key without HTTP referer restriction and set GOOGLE_PLACES_API_KEY in Netlify.",
      reviews_missing_key:
        "API key not found on the server. Add GOOGLE_PLACES_API_KEY (or NEXT_PUBLIC_GOOGLE_PLACES_API_KEY) in Netlify and redeploy.",
      reviews_denied:
        "The API key was rejected by Google. In Google Cloud Console, remove the HTTP referer restriction (use «None») and keep only Places API enabled.",
    },
    location: {
      title: "Location",
      address: "Sítio da Torre, Quintão, 8365-184 Armação de Pêra",
      directions: "Just behind Armação de Pêra Municipal Stadium",
      open_maps: "Open in Google Maps",
      getting_here: "Getting here",
      distances: {
        continente: "10 min — Continente supermarket",
        beaches: "15 min — Armação de Pêra beaches",
        faro: "~45 min — Faro Airport",
      },
    },
    contact: {
      title: "Contact",
      subtitle: "Elodie & Romy are here to help",
      email_label: "Email",
      phone_label: "Phone",
      hosts: "Elodie & Romy — your hosts",
    },
    prices: {
      title: "Price list",
      subtitle:
        "Seasonal rates by zone. The final online booking price is calculated automatically based on your selected dates.",
      summer: "Summer season",
      summer_period: "June to September",
      winter: "Winter season",
      winter_period: "October to May",
      services: "Additional services",
      services_desc: "Electricity, water and other services available at the park.",
      note: "Prices may vary by season and zone. When booking, the system calculates the exact total at checkout.",
      cta: "Book with live pricing",
      updated: "Live pricing",
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
      tagline: "Motorhome service area in the heart of the Algarve.",
      navigate: "Navigate",
      contact: "Contact",
    },
    install: {
      title: "Install the app on your phone",
      android_desc: "Quick access to bookings, prices and contacts — just like a native app.",
      android_manual: 'In Chrome: menu ⋮ → "Install app" or "Add to Home screen".',
      ios_desc: "Add to your home screen for fast access without opening the browser.",
      ios_step1: "Tap Share in Safari",
      ios_step2: 'Choose "Add to Home Screen"',
      install_btn: "Install app",
      later: "Not now",
      dismiss: "Close",
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
