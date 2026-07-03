-- Update service_items to match public pricing extras
DELETE FROM service_items WHERE name IN (
  'Eletricidade 16A',
  'Água potável',
  'Esgotos',
  'Wi-Fi'
);

INSERT INTO service_items (name, name_en, description, description_en, price_cents, icon, sort_order) VALUES
(
  'Serviço Autocaravana',
  'Motorhome service',
  'Serviço completo para autocaravana',
  'Full motorhome service',
  600,
  'sparkles',
  1
),
(
  'Duche',
  'Shower',
  '5 minutos',
  '5 minutes',
  100,
  'droplets',
  2
),
(
  'Máquina de lavar',
  'Washing machine',
  'Ciclo de lavagem',
  'Wash cycle',
  400,
  'sparkles',
  3
),
(
  'Secador',
  'Tumble dryer',
  'Ciclo de secagem',
  'Dry cycle',
  300,
  'sparkles',
  4
);
