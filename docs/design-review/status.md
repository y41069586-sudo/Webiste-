# Maler-Redesign – Zwischenabnahme ausstehend

26.10.2026. Ausgangscommit `ea8ba3d`. Vorheriges Ultimate-Upgrade ist ausdrücklich nicht gestalterisch abgenommen.

## Dieses Arbeitspaket abgeschlossen

- Drei strukturelle Konzepte unter bestehenden IDs, identische fiktive Fakten und Farbpalette.
- Opt-in `RenderInput.designReview`; Standardrenderer/20 IDs/Plakat unverändert. Kein öffentlicher Schalter.
- Review-exklusive KI-Motive, keine Aufnahme in normale Bildrotation. Einseitiger Review-Brief mit
  118-mm-Vorschau, 41-mm-QR und getrennten zentralen V4-Preisangaben.
- Vollständige Desktop1440- und Mobil360/390/430-Aufnahmen, Hero/Angebot, Vorher/Nachher,
  Graustufen, PDFs und tatsächliche PDF-Druckansichten unter `docs/design-review/evidence/`.
- HTML, Bilder, Konsole, Axe/Layout sowie geöffnetes Frageformular geprüft; CTA-Ziele lokal geprüft.
- Alle drei finalen PDFs einseitig, QR aus PDF dekodiert und lokale Konzeptzuordnung geprüft.
- 100 Template-Tests, 45 relevante Core-Tests, TypeScript, Lint und lokaler Produktionsbuild bestanden.
  Keine vollständige erneute V4/V5-/Provider-E2E-Abnahme. Abschlusslauf mit endgültigem Renderer und korrigierter Angebots-Detailaufnahme
  (Toolbar nur für das Detailfoto unsichtbar).

## Übergabe und offene Grenzen

[Zehn-Punkte-Bericht und sichtbare Ergebnisse](README.md) sind maßgeblich. `visualApproved=false`.
Keine reale Kundenvalidierung, Druckprobe, produktive Identitäts-/Rechtsfreigabe oder Stripe-Sandboxzahlung.
Lokale QR-Ziele sind nicht öffentlich erreichbar. Funnel-Zustellschätzungen/Testabgrenzung bleiben
Kampagnenblocker; diese Prototypen ändern die vorhandene Messlogik nicht. Lead-Faktenprüfung bleibt manuell.

Keine laufende Implementierung oder Test-DB-Mutation nach Abschluss. Kein Deployment, Push mit
Skip-Markierungen ist ausschließlich Codesicherung. DRY_RUN=true. Keine echten Anbieteraktionen.

**Nächster Schritt: gestalterische Rückmeldung zu diesen drei sichtbaren Konzepten. Hier stoppen.**
Keine Branchenübertragung oder allgemeines Firmenwebsite-Redesign vor ausdrücklicher Zwischenabnahme.

Letzter sicherer Implementierungscommit: `b618a7a2a9a0322f813906af4aa7320ee72189ab` auf `codex/conversion-v4`.
Dieser folgende Dokumentationscommit hält nur den Wiederaufnahmepunkt fest.
