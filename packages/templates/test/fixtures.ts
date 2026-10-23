import type { BusinessFacts, RenderInput, SiteContent } from '../src/types';

export const sampleContent: SiteContent = {
  hero_headline: 'Saubere Arbeit für Ihre Räume',
  hero_subline: 'Malerarbeiten innen und außen – sorgfältig geplant und ordentlich ausgeführt.',
  services: [
    { title: 'Innenanstrich', text: 'Wände und Decken in Wohnungen, Büros und Treppenhäusern.', icon: 'roller' },
    { title: 'Fassadenanstrich', text: 'Schutz und frische Farbe für Ihre Außenwände.', icon: 'house' },
    { title: 'Tapezierarbeiten', text: 'Vom Entfernen alter Tapeten bis zur neuen Wandgestaltung.', icon: 'wall' },
    { title: 'Lackierarbeiten', text: 'Türen, Fenster und Heizkörper wie neu.', icon: 'brush' },
  ],
  about: 'Wir sind Ihr Malerbetrieb in Dortmund. Uns ist wichtig, dass Sie sich auf eine saubere und zuverlässige Ausführung verlassen können.\n\nSprechen Sie uns an – wir besprechen Ihr Vorhaben gern persönlich.',
  cta_text: 'Jetzt anrufen',
  seo_title: 'Malerbetrieb Beispiel – Maler in Dortmund',
  seo_description: 'Malerarbeiten in Dortmund: Innenanstrich, Fassade, Tapezieren und Lackieren. Rufen Sie uns an.',
  faq: [
    { q: 'Arbeiten Sie auch in bewohnten Räumen?', a: 'Ja. Wir decken Möbel und Böden ab und hinterlassen die Räume sauber.' },
    { q: 'Wie bekomme ich ein Angebot?', a: 'Rufen Sie uns an oder schreiben Sie uns über das Kontaktformular.' },
    { q: 'Übernehmen Sie auch kleine Aufträge?', a: 'Sprechen Sie uns gern an – wir klären gemeinsam, was möglich ist.' },
  ],
};

export const sampleFacts: BusinessFacts = {
  name: 'Malerbetrieb Beispiel',
  branchLabel: 'Malerbetrieb',
  group: 'handwerk',
  street: 'Hohe Straße',
  houseNumber: '7',
  postalCode: '44139',
  city: 'Dortmund',
  phone: '0231 123456',
  phoneHref: 'tel:+49231123456',
  openingLines: [
    { label: 'Montag – Freitag', value: '07:00 – 16:00 Uhr' },
    { label: 'Samstag – Sonntag', value: 'geschlossen' },
  ],
};

export function demoInput(templateId: string, palette: string, group: 'handwerk' | 'beauty' = 'handwerk'): RenderInput {
  return {
    templateId,
    palette,
    mode: 'demo',
    content: sampleContent,
    facts: { ...sampleFacts, group },
    renderedAt: 1700000000000,
    demo: {
      slug: 'abcdefghijklmnopqrstuvwx',
      priceLabel: '390 €',
      checkoutUrl: 'https://entwurf.example.de/d/abcdefghijklmnopqrstuvwx/uebernehmen',
      questionUrl: 'https://entwurf.example.de/d/abcdefghijklmnopqrstuvwx/frage',
      optOutUrl: 'https://entwurf.example.de/d/abcdefghijklmnopqrstuvwx/kein-interesse',
      expiresLabel: 'am 21.11.2026',
      sender: {
        name: 'Max Muster',
        company: 'Website-Brief',
        street: 'Musterstraße 1',
        postalCode: '44135',
        city: 'Dortmund',
        email: 'hallo@example.de',
        phone: '0231 000000',
        imprintUrl: 'https://app.example.de/impressum',
        privacyUrl: 'https://app.example.de/datenschutz',
      },
    },
  };
}
