# Claude Code / Agent Skills für CRO, Landing-Page-Copy und Marketing (Stand 2026-11-27)

Alle Sternzahlen "heute" = per WebFetch der GitHub-Seite am 2026-11-27 gelesen (Seitenansicht, nicht API; GitHub-Seiten zeigen gerundete "k"-Werte). Sekundärquellen (Aggregatoren) sind jeweils mit ihrem Datum markiert. Zu Sternen auf Reddit/HN/X: keine verwertbaren Diskussionen gefunden (siehe Gaps).

## 1. coreyhaines31/marketingskills: existiert es, Sterne, Inhalt, Installation?

### Takeaway
Das Repo existiert und ist mit großem Abstand das populärste Marketing-Skill-Paket (ca. 63k Sterne am 2026-11-27, MIT). Wichtig: Die in der Fragestellung genannten Skill-Namen (`page-cro`, `form-cro`, `pricing-strategy`, `ab-test-setup`, `schema-markup`) stimmen mit dem aktuellen Stand nicht mehr überein, die Ordner heißen jetzt `cro`, `pricing`, `ab-testing`, `schema` usw. Die Skills sind generische englische SaaS-/Startup-Marketing-Playbooks ohne eingebaute Forschungsbelege oder Messergebnisse.

### Cited Findings
**Kennzahlen (Datum jeweils angegeben)**
- 63.0k Sterne, 9.2k Forks, 414 Watchers, 1.683 Commits auf `main`, 46 offene Issues / 36 offene PRs, Lizenz MIT; gelesen am 2026-11-27. Letztes Commit-Datum auf der Seite nicht ersichtlich — [GitHub-Repo](https://github.com/coreyhaines31/marketingskills)
- Sternverlauf aus Drittquellen: ~20.090 (SourcePulse, undatiert), 42.469 (Listing Stand 2026-07-23), ~49.000 (SkillRank, Stand 2026-09-09), 57,8k (Star History, Stand 2026-11-01), 56,8K (Marktplatz-Listing, undatiert) — [Suchergebnis-Zusammenfassung mit Quellen Star History / SkillRank](https://www.star-history.com/coreyhaines31/marketingskills), [SkillRank](https://skillrank.it.com/skills/coreyhaines31-marketingskills)
- 59.423 Sterne / 8.678 Forks, 49 Skills, MIT, am 2026-11-10 von einem Blogger geprüft — [Rob Palmer, Nov 2026](https://robpalmer.com/blog/best-claude-code-skills-for-copywriting)
- Das Repo erreichte laut Suchsnippet am 2026-04-14 Platz 1 der GitHub-Trending-Liste (Trendshift-Angabe, nicht selbst verifiziert) — [Trendshift](https://trendshift.io/repositories/18529)

**Aktuelle Skill-Liste (53 Ordner in `/skills`, geprüft 2026-11-27)** — [skills-Ordner](https://github.com/coreyhaines31/marketingskills/tree/main/skills)
- Conversion: `cro`, `signup`, `onboarding`, `popups`, `paywalls`
- Copy: `copywriting`, `copy-editing`, `cold-email`, `emails`, `social`, `video`, `image`, `sms`
- SEO: `seo-audit`, `ai-seo`, `link-building`, `programmatic-seo`, `site-architecture`, `competitors`, `schema`
- Messung/Test: `analytics`, `conversion-tracking`, `ab-testing`, `attribution`
- Strategie u. a.: `marketing-psychology`, `marketing-ideas`, `pricing`, `offers`, `product-marketing`, `launch`, `customer-research`, `content-strategy`, `lead-magnets`, `referrals`, `free-tools` u. v. m.
- Namensabgleich zur Anfrage: `page-cro` heißt jetzt `cro` (Seite zeigt keine Umbenennungshistorie); `form-cro` ist als eigener Ordner nicht mehr vorhanden, die `cro`-Skill enthält laut Inhaltsangabe einen Abschnitt "form optimization notes" und eine Referenz-Routing-Tabelle für Formulare/Experimente — [cro/SKILL.md](https://raw.githubusercontent.com/coreyhaines31/marketingskills/main/skills/cro/SKILL.md); `pricing-strategy` → `pricing`, `ab-test-setup` → `ab-testing`, `schema-markup` → `schema`, `copywriting`/`copy-editing`/`seo-audit` unverändert — [skills-Ordner](https://github.com/coreyhaines31/marketingskills/tree/main/skills)
- Skill-Anzahl schwankt je Quelle (43, 49, 53), weil das Repo wächst — [Rob Palmer](https://robpalmer.com/blog/best-claude-code-skills-for-copywriting), [skills-Ordner](https://github.com/coreyhaines31/marketingskills/tree/main/skills)

**Installation (README)** — [GitHub-Repo](https://github.com/coreyhaines31/marketingskills)
- Empfohlen: `npx skills add coreyhaines31/marketingskills` (einzelne Skills mit `--skill`, Auflisten mit `--list`; in Agent-Session `-a claude-code`)
- Claude-Code-Plugin: `/plugin marketplace add coreyhaines31/marketingskills`, dann `/plugin install marketing-skills`
- Weitere: Ordner `skills` nach `.agents/skills/` kopieren, Git-Submodule, SkillKit, ZIPs aus den Releases für Claude Web (Customize → Skills), Codex-Plugin

**Benötigte Eingaben**
- Die Skill `product-marketing` erstellt/aktualisiert `.agents/product-marketing.md`; alle anderen Skills lesen diese Datei zuerst (Produkt, Zielgruppe, Positionierung). Ab v2.0 verschoben von `.claude/product-marketing-context.md`; Fallback auf den alten Pfad existiert — [GitHub-Repo](https://github.com/coreyhaines31/marketingskills)
- `copywriting` verlangt: Seitenzweck + eine Hauptaktion, Zielgruppe (Problem, Einwände, Sprache), Angebot/Differenzierung/Belege, Traffic-Kontext; optional Schreibprobe für Tonalität — [copywriting/SKILL.md](https://raw.githubusercontent.com/coreyhaines31/marketingskills/main/skills/copywriting/SKILL.md)

**Inhalt der wichtigsten Skills**
- `cro`: 7 Analyse-Dimensionen "in Reihenfolge der Wirkung": Value Proposition, Headline, CTA-Platzierung, visuelle Hierarchie, Trust-Signale, Einwandbehandlung, Reibung; Ausgabe: Quick Wins, High-Impact Changes, Testideen, Copy-Alternativen; Frameworks je Seitentyp (Home, Landing, Pricing, Feature, Blog) — [cro/SKILL.md](https://raw.githubusercontent.com/coreyhaines31/marketingskills/main/skills/cro/SKILL.md)
- `copywriting`: Eingabe-Triage (leer / eigene Stimme vorhanden / Punktkorrektur); jede Zeile durchläuft 3 Fragen (vorstellbar? beweisbar wahr/falsch? könnte ein Wettbewerber sie schreiben?); Seitenaufbau Hero → Social Proof → Problem → Nutzen → Ablauf → Einwände → Schluss-CTA; CTA-Formel "[Verb] + [Was man bekommt] + [Qualifier]" — [copywriting/SKILL.md](https://raw.githubusercontent.com/coreyhaines31/marketingskills/main/skills/copywriting/SKILL.md)
- Positiv für unseren Fall: `copywriting` warnt ausdrücklich "Fabricated statistics or testimonials erode trust and create legal liability" und weist an, fehlende Belege als `[NEED: ...]` zu markieren statt sie zu erfinden — [copywriting/SKILL.md](https://raw.githubusercontent.com/coreyhaines31/marketingskills/main/skills/copywriting/SKILL.md)

**Sponsoring / Sicherheit**
- Fünf bezahlte "Verified Partners" (Converly, Ploy, AIsa, Omnia, Livestorm); laut README beeinflussen sie die Kern-Empfehlungen nicht — [GitHub-Repo](https://github.com/coreyhaines31/marketingskills)
- Ein automatisierter Skill-Scanner (skills.sh "agent trust hub") markiert eine Skill mit "externe Downloads", weil sie den Agenten anweist, Code aus einem externen GitHub-Repo zu installieren/auszuführen; automatischer Befund, keine Menschenprüfung — [skills.sh Trust Hub](https://www.skills.sh/podo/design-agent-skills/coreyhaines-marketing/security/agent-trust-hub)
- Autor: Corey Haines, früher Head of Growth bei Baremetrics (laut Podcast-Show-Notes) — [Humans of Martech](https://share.transistor.fm/s/b660eca4)

### Inferences
- Für SeitenWerk sind `copywriting`, `copy-editing`, `cro`, `marketing-psychology`, `offers`, `pricing`, `ab-testing` potenziell nutzbar; SaaS-spezifische (`paywalls`, `signup`, `revops`, `ad-creative`) sind für Handwerker-Landingpages irrelevant.
- Die Skills sind englisch und SaaS-orientiert; deutsche Handwerker-Texte erfordern eigene Kontextdatei (`.agents/product-marketing.md`) mit deutscher Tonalität, Siezen, lokalem Bezug.
- Wegen der Umbenennungen sollten Prompts/Notizen, die `page-cro` oder `form-cro` nennen, vor Verwendung gegen `--list` geprüft werden.
- Der Sprung auf Platz 1 bei Trending und die Wachstumsrate (~42k im Juli → 63k im November) deuten auf Hype-/Social-Wachstum; das sagt nichts über Textqualität.

### Gaps
- Letztes Commit-Datum und Release-Stand (z. B. v2.x) nicht auf der Seite sichtbar; nicht verifiziert.
- Kein Reddit-/HN-/X-Thread mit Bewertung des Repos gefunden (Suche ergab keine Treffer), daher keine unabhängige Nutzer-Qualitätsaussage.
- Inhalt der Skills `marketing-psychology`, `offers`, `popups`, `pricing`, `ab-testing`, `schema` wurde nicht gelesen; Aussagen zu Dringlichkeits-/Knappheitsempfehlungen dort ungeprüft (`cro` und `copywriting` enthalten laut Abruf keine konkreten Dringlichkeits-/Countdown-Tipps; `marketing-psychology` ist der wahrscheinlichste Ort — ungeprüft).
- `cro/SKILL.md` wurde per Zusammenfassungs-Abruf gelesen, nicht im Volltext; Detailzitate können Verkürzungen sein.

## 2. Andere populäre Marketing-/CRO-/Copy-Skill-Repos

### Takeaway
Nach Sternen folgt hinter marketingskills (63k) `AgriciDaniel/claude-seo` (32,8k, SEO), dann Anthropics offizielles `knowledge-work-plugins` mit Marketing-Plugin (37,2k Sterne für das Gesamtrepo, Marketing nur ein Teil). Im Copy/CRO-Bereich ist der Rest klein: `wondelai/skills` 2,8k, `borghei/Claude-Skills` ~1,1k, `boraoztunc/skills` ~460, `OneWave-AI/claude-skills` ~422, `robpalmer99` 60. Kein weiteres Landing-Page-spezifisches Repo mit vierstelligen Sternen gefunden.

### Cited Findings
**Übersichtstabelle (Sterne mit Datum)**

| Repo | Sterne (Datum) | Lizenz | Fokus |
|---|---|---|---|
| coreyhaines31/marketingskills | 63,0k (2026-11-27) | MIT | 53 Marketing-Skills, inkl. CRO/Copy |
| anthropics/knowledge-work-plugins | 37,2k (2026-11-27) | Apache-2.0 | 11 Plugins, darunter `marketing` |
| AgriciDaniel/claude-seo | 32,8k (2026-11-27); 25,9k (Star History 2026-11-02) | MIT | SEO-Audit, Schema, E-E-A-T |
| wondelai/skills | 2,8k (2026-11-27) | MIT | Buch-basierte Frameworks (CRO, Cialdini, StoryBrand) |
| borghei/Claude-Skills | 1.083 (2026-11-10) | "Custom" | 403 Skills, Qualität schwankt |
| boraoztunc/skills | 460 (2026-11-10) | Apache-2.0 | Copy-Editing, "stop-slop", Design |
| OneWave-AI/claude-skills | 422 (2026-11-10) | MIT | ~230 Skills, Schreib-Skills flach |
| robpalmer99/claude-code-copywriting-skills | 60 (2026-11-27); 49 (2026-11-10) | CC-BY-4.0 | Direct-Response, Ads, Compliance |
| rampstackco/claude-skills (`landing-page-copy`) | Sterne nicht ermittelt | ? | Hero, Value Prop, Social Proof, CTA |

Quellen zur Tabelle: [marketingskills](https://github.com/coreyhaines31/marketingskills), [knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins), [claude-seo](https://github.com/AgriciDaniel/claude-seo), [wondelai/skills](https://github.com/wondelai/skills), [robpalmer99-Repo](https://github.com/robpalmer99/claude-code-copywriting-skills), [Rob Palmer Ranking (Sterne 2026-11-10)](https://robpalmer.com/blog/best-claude-code-skills-for-copywriting), [Star History claude-seo](https://www.star-history.com/agricidaniel/claude-seo), [rampstackco landing-page-copy](https://github.com/rampstackco/claude-skills/blob/main/skills/landing-page-copy/SKILL.md).

**Anthropic `knowledge-work-plugins` / `marketing`** — [Repo](https://github.com/anthropics/knowledge-work-plugins), [marketing-Ordner](https://github.com/anthropics/knowledge-work-plugins/tree/main/marketing)
- Existiert; 37,2k Sterne, 4,1k Forks, Apache-2.0, 1.153 Commits (2026-11-27).
- Marketing-Plugin: Commands `/draft-content` (u. a. Landing Pages), `/campaign-plan`, `/brand-review`, `/competitive-brief`, `/performance-report`, `/seo-audit`, `/email-sequence`; Skills `content-creation`, `campaign-planning`, `brand-voice`, `competitive-analysis`, `performance-analytics`.
- Installation Claude Code: `claude plugin marketplace add anthropics/knowledge-work-plugins`, dann `claude plugin install marketing@knowledge-work-plugins` (der marketing-Befehl folgt dem Muster des sales-Beispiels, nicht explizit auf der Seite gezeigt).
- Eingaben: läuft ohne Konfiguration; für personalisierte Ergebnisse lokale Settings-Datei mit Brand Voice, Styleguide, Personas (Dateiname nicht auf der Seite genannt). Optionale MCP-Connectoren: Slack, Canva, Figma, HubSpot, Amplitude, Notion, Ahrefs, Similarweb, Klaviyo, Supermetrics.
- Nicht CRO-spezifisch: keine eigene CRO- oder Landing-Page-Skill, Landing Page nur eine Ausgabeart von `/draft-content`.

**AgriciDaniel/claude-seo** — [Repo](https://github.com/AgriciDaniel/claude-seo)
- 32,8k Sterne, 4,0k Forks, MIT, 768 Commits; Skill-Zahl inkonsistent (About: 26 Sub-Skills/19 Agenten; Text: 29/20; 30 Befehle).
- Install: `/plugin marketplace add AgriciDaniel/claude-seo`, `/plugin install claude-seo@agricidaniel-claude-seo`, `/seo setup` (installiert eigene Python-Umgebung + Headless-Browser; benötigt Claude Code ≥ 1.0.33, Python 3.11–3.14). Alternativ `install.sh` / `install.ps1`.
- Relevante Befehle: `/seo page <url>`, `/seo schema <url>`, `/seo content <url>` (E-E-A-T), `/seo content-brief <topic>`. Kein eigenes Landing-Page-Copy-Skill.
- Keine API-Keys nötig; optional Google-APIs (PageSpeed, CrUX, Search Console, GA4) und Erweiterungen.
- Sterne-Sprung 25,9k (2026-11-02, Star History) → 32,8k (2026-11-27) ist ungewöhnlich schnell; Ursache nicht geprüft (Quellen-Konflikt/gerundete Werte möglich).

**wondelai/skills** — [Repo](https://github.com/wondelai/skills)
- 2,8k Sterne, 272 Forks, MIT, 89 Commits; Skill-Zahl inkonsistent (About: 50, README: 66).
- Relevant: `cro-methodology` (basiert auf *Making Websites Win*), `storybrand-messaging`, `influence-psychology` (Cialdini, mit Ethik-Checkliste), `made-to-stick`, `hundred-million-offers`, Metaskills `conversion-optimization`, `improve-website`, `grow-website`.
- Install: `/plugin marketplace add wondelai/skills`, dann `/plugin install marketing-cro@wondelai-skills`; oder `npx skills add wondelai/skills/<skill> --global`.

**Cialdini-/Persuasion-Skills (kleine Repos, nur Aggregator-Daten)** — [Suchergebnisse](https://claudeskills.info/skills/guia-matthieu/clawfu-skills/persuasion-principles/)
- `guia-matthieu/clawfu-skills` (`persuasion-principles`, betont Ethik/Ehrlichkeit), `getagentseal/founder-playbook` (`influence`, nutzt nach Eigenangabe nur replizierte Laborstudien), `santos-sanz/lifeskills` (`persuasion-cialdini-influence-design`, mit Ethik-Guardrails), `asgard-ai-platform/skills` (`soc-cialdini`, in Kategorie Security einsortiert). Sternzahlen nicht ermittelt; Inhalte nicht gelesen — [skills.sh Cialdini](https://skills.sh/asgard-ai-platform/skills/soc-cialdini), [getagentseal](https://skills.sh/getagentseal/founder-playbook/influence)

**Rob Palmer Direct-Response-Suite** — [Repo](https://github.com/robpalmer99/claude-code-copywriting-skills)
- 60 Sterne, 11 Forks, 7 Commits, CC-BY-4.0. Acht Skills (README): `angle-finder`, `direct-response-copy`, `static-ad`, `ad-copy`, `landing-page-copy` (Bridge-/Pre-sell-Seiten), `copychief` (Zeilenreview), `funnel-teardown`, `compliance-checker` (Audit gegen Meta/Google/TikTok/YouTube/ClickBank-Richtlinien, also US-Plattformrecht, nicht UWG).
- Install: Skill-Ordner nach `.claude/skills/` kopieren.
- Interessenkonflikt: Der Autor rankt seine eigene Suite (49 Sterne) vor marketingskills (59k), der Blog endet in einem Aufruf zur Strategie-Buchung — [Rob Palmer](https://robpalmer.com/blog/best-claude-code-skills-for-copywriting)

**Sonstiges**
- `anthropics/skills` (190.998 Sterne, 2026-11-10) enthält laut Palmer keine Copywriting-Skill — [Rob Palmer](https://robpalmer.com/blog/best-claude-code-skills-for-copywriting)
- Eine große Zahl Forks/Klone von marketingskills existiert (z. B. ayrshare, Transformaiton, syntax-syndicate); sie sind keine eigenständigen Quellen — [Suchergebnis](https://github.com/ayrshare/marketingskills)

### Inferences
- Wenn nur eine Quelle genutzt wird: `coreyhaines31/marketingskills` (Reichweite, MIT, aktiv gepflegt); als offizielle Ergänzung für Brand-Voice-Prüfung: Anthropic `marketing`-Plugin; `claude-seo` nur für technisches SEO/Schema.
- Es gibt kein populäres Repo mit deutschem Fokus oder UWG-Bezug; deutscher Rechtsrahmen muss selbst als Prüfregel ergänzt werden (z. B. als eigene Skill/Checkliste).
- Sternzahlen sind Popularität, nicht Qualität: Palmers Qualitätsranking und Sternrangfolge stimmen nicht überein, aber seine Rangfolge ist befangen.

### Gaps
- Sterne/Lizenz/Letztes Update von `rampstackco/claude-skills`, `boraoztunc/skills` (aktuell), Cialdini-Repos nicht selbst abgerufen.
- Eine "awesome-claude-skills"-Liste wurde nicht gezielt geöffnet; daher keine unabhängige Kuratoren-Empfehlung belegt.
- Keine Reddit-/HN-/X-Empfehlungen 2026 gefunden (Suche brachte nur Aggregatoren und Blogs).
- Letzte Commit-Daten aller Repos auf GitHub-Seiten nicht sichtbar.

## 3. Evidenzqualität: echte Forschung/CRO-Frameworks oder generische Ratschläge? Gemessene Ergebnisse? Hype?

### Takeaway
Die untersuchten Skills sind Prompt-Playbooks, die etablierte Praktiker-Frameworks zusammenfassen; keines der geprüften Repos legt eigene Messdaten, Studien oder A/B-Testergebnisse vor. Hype-Anzeichen: unbelegte Zahlen in wondelai und bei Rob Palmer, sehr schnelles Stern-Wachstum, gesponserte Partner.

### Cited Findings
- `cro`-Skill (marketingskills): zitiert keine Studien, Daten oder empirischen Befunde; keine Conversion-Lift-Angaben; einzige Zahl ist ein Headline-Template "Join 10,000+ teams who..." — [cro/SKILL.md](https://raw.githubusercontent.com/coreyhaines31/marketingskills/main/skills/cro/SKILL.md)
- Repo-README von marketingskills macht keine gemessenen Performance-Versprechen; einzige Zahl: "140 SaaS marketing ideas" (Inhaltsmenge, kein Ergebnis) — [GitHub-Repo](https://github.com/coreyhaines31/marketingskills)
- `copywriting`-Skill hat einen Qualitätsfilter (3 Fragen, `[NEED: ...]`-Platzhalter für fehlende Beweise), das ist ein Prozess-, kein Evidenz-Merkmal — [copywriting/SKILL.md](https://raw.githubusercontent.com/coreyhaines31/marketingskills/main/skills/copywriting/SKILL.md)
- `cro` empfiehlt Testimonials "specific, attributed, with photos" und Trust-Signale "near CTAs" — Praktikerregel, keine zitierte Studie — [cro/SKILL.md](https://raw.githubusercontent.com/coreyhaines31/marketingskills/main/skills/cro/SKILL.md)
- wondelai/skills: nennt ohne Quelle "Scorecard-Quizze konvertieren 30–50 % gegenüber 3–10 % bei PDF-Lead-Magneten", "Methodik habe Milliarden zusätzlichen Umsatzes erzeugt", EOS "von über 250.000 Firmen genutzt"; Quellen/Daten fehlen. Das sind Autor-/Buch-Marketingaussagen aus Beschreibungen der Originalbücher — [wondelai/skills](https://github.com/wondelai/skills)
- wondelai hat eine Ethik-Checkliste in `influence-psychology` und die Frameworks haben reale Buch-Herkunft (z. B. *Making Websites Win*, Cialdini) — [wondelai/skills](https://github.com/wondelai/skills)
- robpalmer99: "40+ Jahre Erfahrung" und "$523M+ tracked campaign results" ohne Belege/Fallstudien; interne Inkonsistenz (fünf vs. acht Skills) — [robpalmer99-Repo](https://github.com/robpalmer99/claude-code-copywriting-skills)
- Palmers Ranking: nach eigener Angabe "alle auf realer Arbeit installiert und benutzt", aber keine kontrollierten Tests, Benchmarks oder Bewertungsraster; selbstbezogener Interessenkonflikt — [Rob Palmer](https://robpalmer.com/blog/best-claude-code-skills-for-copywriting)
- Drittplattformen (Tessl, skills.sh) führen Skill-Reviews/Scans; ein Scanner kennzeichnete marketingskills mit Warnung zu externen Downloads — [Tessl Registry](https://tessl.io/registry/skills/github/coreyhaines31/marketingskills), [skills.sh Trust Hub](https://www.skills.sh/podo/design-agent-skills/coreyhaines-marketing/security/agent-trust-hub)
- Ein Medium-Artikel (Stackademic, Paywall) beschreibt einen Praxistest auf ein Beauty-Produkt ("built my entire marketing strategy"); nur Titel/Snippet gesehen, Inhalt und Zahlen nicht geprüft — [Stackademic](https://blog.stackademic.com/i-ran-a-github-repo-with-20k-stars-on-a-beauty-product-it-built-my-entire-marketing-strategy-7591d97c70a7)

### Inferences
- Konversionsverbesserungen durch diese Skills sind unbelegt. Nutzen liegt in Struktur und Checklisten, nicht in nachgewiesener Wirksamkeit; echte Wirkung müsste SeitenWerk selbst per A/B-Test messen (der `ab-testing`-Skill hilft beim Planen, aber bei kleinem Traffic von Handwerker-Seiten sind Tests statistisch kaum aussagekräftig).
- Zahlen, die ein Skill aus dem Modellgedächtnis in Texte einfügt (z. B. "+30 % Conversion"), sind als unbelegt zu behandeln, passend zu CLAUDE.md-Regel 8 (nur belegte Aussagen).
- Die Regel "nicht erfinden, `[NEED: ...]` markieren" in `copywriting` entspricht der Projektregel, sodass die Skill hier gut passt.

### Gaps
- Kein Repo mit veröffentlichten, kontrollierten Conversion-Ergebnissen gefunden; das heißt nicht, dass es keines gibt, nur dass die Suche keines ergab.
- Tessl-Review-Scores wurden nicht abgerufen.
- Inhalt des Stackademic-Artikels und der Medium-/Blog-Erfahrungsberichte (aibuilderclub.com u. ä.) nicht ausgewertet.

## 4. Rechtliche Passung für Deutschland: Welche typischen CRO-Taktiken sind unzulässig bzw. riskant?

### Takeaway
Unzulässig sind erfundene Bewertungen/Testimonials (UWG-Anhang Nr. 23b/23c), falsche Knappheit/Zeitdruck (Nr. 7), Lockangebote ohne Vorrat (Nr. 5), ungenehmigte Gütesiegel (Nr. 2) sowie unbelegte Zahlen (§ 5 UWG). Echte, ehrlich begrenzte Angebote und echte Kundenbewertungen sind erlaubt. Hinweis: Die Anhangs-Liste ("schwarze Liste") ist auf Verbraucher gemünzt; SeitenWerk verkauft an Betriebe (B2B), aber § 5 UWG (Irreführung) gilt auch gegenüber sonstigen Marktteilnehmern. Das ist eine Einordnung, keine Rechtsberatung.

### Cited Findings
**UWG-Anhang ("schwarze Liste"), Wortlaut/Kurzfassung**
- Nr. 7: "die unwahre Angabe, bestimmte Waren oder Dienstleistungen seien allgemein … nur für einen sehr begrenzten Zeitraum verfügbar" (Wortlaut gekürzt) — [lxgesetze UWG-Anhang](https://lxgesetze.de/uwg/AN); Händlerbund-Erläuterung: Wer vorgibt, ein Angebot sei nur kurz oder in begrenzter Menge verfügbar, obwohl das nicht stimmt, übt unzulässigen Entscheidungsdruck aus — [Händlerbund](https://www.haendlerbund.de/de/news/aktuelles/wissenssnack/schwarze-liste-uwg)
- Nr. 5/6: Lockangebote ohne ausreichende Verfügbarkeit bzw. zum Absatz anderer Waren; Händlerbund: bei weniger als zwei Tagen Verfügbarkeit liegt die Beweislast beim Händler — [Händlerbund](https://www.haendlerbund.de/de/news/aktuelles/wissenssnack/schwarze-liste-uwg), [lxgesetze](https://lxgesetze.de/uwg/AN)
- Nr. 2: "die Verwendung von Gütezeichen, Qualitätskennzeichen oder Ähnlichem ohne die erforderliche Genehmigung" — [lxgesetze](https://lxgesetze.de/uwg/AN)
- Nr. 23b: Behauptung, Bewertungen stammten von Verbrauchern, die die Ware/Leistung tatsächlich genutzt haben, ohne angemessene und verhältnismäßige Prüfmaßnahmen — [lxgesetze](https://lxgesetze.de/uwg/AN)
- Nr. 23c: Übermittlung oder Beauftragung gefälschter Bewertungen/Empfehlungen sowie falsche Darstellung von Bewertungen in sozialen Medien — [lxgesetze](https://lxgesetze.de/uwg/AN)
- Händlerbund nennt außerdem Nr. 10 (gesetzliche Rechte als Besonderheit bewerben, z. B. Widerruf/gesetzliche Gewährleistung als "Vorteil") und Nr. 20 ("gratis/kostenlos" nur ohne versteckte Kosten) — [Händlerbund](https://www.haendlerbund.de/de/news/aktuelles/wissenssnack/schwarze-liste-uwg). Die Nummern weichen von meiner Erinnerung ab bzw. wurden nicht am Gesetzestext geprüft.
- Verbotsliste gilt unabhängig davon, ob tatsächlich getäuscht wird (Per-se-Verbot) — [Suchergebnis zu Nr. 23b](https://www.gesetze-im-internet.de/uwg_2004/anhang.html) (Volltext konnte nicht abgerufen werden, 503)

**Countdown-Timer**
- LG Deggendorf, 27.03.2026, Az. 1 HK O 6/25 (nicht rechtskräftig, Berufung OLG München Az. 6 U 1041/26 e): Countdown-Uhr nicht per se irreführend, wenn der Preis tatsächlich so lange gilt und nichts über den späteren Preis gesagt wird; unzulässig war aber, einen Einzelreview und 4,5 Sterne aus 430 Bewertungen ohne Hinweis zu zeigen, ob und wie die Echtheit der Bewertungen geprüft wird (§ 5b Abs. 3, § 5a Abs. 1 UWG) — [IT-Recht Kanzlei](https://www.it-recht-kanzlei.de/countdown-uhr-online-shop-irrefuehrend-kundenbewertungen.html)
- Kommentar dort: Countdown wird riskant, wenn er Preiserhöhung, künstliche Knappheit oder ein Aktionsende suggeriert, das tatsächlich nicht eintritt — ebd.
- OLG Bamberg, Urteil 04.02.2026, 3 UKl 8/25 e: betrifft befristete Werbung mit Countdown und FOMO-Kaufaufforderungen; Ergebnis aus dem abgerufenen Dokument nicht lesbar — [BeckRS 2026 N 7018](https://www.gesetze-bayern.de/Content/Pdf/Y-300-Z-BECKRS-B-2026-N-7018?all=False)

**Filter-Liste für die Skills-Ausgabe (Tabelle der typischen CRO-Taktiken)**
Rechtsbezug stützt sich auf die oben zitierten Quellen; die Zuordnung der Taktik ist meine Inferenz.

| Typische Skill-/CRO-Empfehlung | Einordnung DE |
|---|---|
| Erfundene Testimonials, Fantasie-Kundennamen, Platzhalter-Bewertungen | Verboten (Nr. 23c, § 5 UWG); Skill `copywriting` warnt selbst davor |
| Sterne/Bewertungsdurchschnitt ohne reale Quelle und ohne Hinweis zur Echtheitsprüfung | Riskant bis unzulässig (Nr. 23b, § 5b Abs. 3; LG Deggendorf) |
| Zahlen wie "über 500 zufriedene Kunden", "+30 % mehr Anfragen" ohne Beleg | Irreführung nach § 5 UWG; nur belegte Zahlen (Projektregel 8) |
| Countdown, der bei Ablauf neu startet, "nur noch 3 Plätze" ohne Grund, "Angebot endet heute" ohne echte Frist | Verboten (Nr. 7) bzw. irreführend; echte, ehrliche Fristen ok |
| Lockpreis "ab 49 €" ohne Hinweis auf Mindestlaufzeit/Folgepreis | Irreführung durch Unterlassen (§ 5a UWG); in CLAUDE.md schon Pflicht (Mindestlaufzeit neben Preis) |
| "Kostenlos/gratis" mit versteckten Kosten | Verboten (Händlerbund Nr. 20) |
| Siegel/Logos ("TÜV geprüft", "Google Partner", Innungszeichen) ohne Berechtigung | Verboten (Nr. 2) |
| Gesetzliche Rechte (Widerruf, gesetzliche Gewährleistung) als besonderes Extra bewerben | Verboten gegenüber Verbrauchern (Händlerbund Nr. 10); eigene 14-Tage-Garantie als freiwillige Leistung bleibt möglich, wenn tatsächlich über das Gesetz hinausgehend |
| Pop-up/Exit-Intent mit Fake-"andere schauen gerade"-Zähler | Fake-Live-Zähler wäre irreführend (§ 5); nur echte Daten |
| Cold-E-Mail/SMS/WhatsApp-Akquise (Skills `cold-email`, `sms`) | In DE unzulässig ohne Einwilligung (§ 7 UWG; Projektregel schließt das aus) — § 7 UWG hier nicht neu geprüft, entspricht aber CLAUDE.md |
| Vorher/Nachher-Fotos, Logos oder Fotos "des Betriebs" erfinden | Verboten gemäß Projektregeln; KI-generierte Bilder nicht als echte Referenzen ausgeben |

### Inferences
- Skills von marketingskills enthalten in `cro`/`copywriting` keine Countdown-/Scarcity-Tipps (laut Abruf); das Risiko liegt eher in `marketing-psychology`, `popups`, `offers`, `launch`, `ad-creative`, `sms`, `cold-email` (ungeprüft) und in Modell-Improvisation. Empfehlung: eigene "DE-Rechtsfilter"-Regeln in die `product-marketing`-Kontextdatei schreiben (verbotene Taktiken, Pflicht: Beleg oder `[NEED:]`).
- Die Anhangsliste gilt dem Wortlaut nach für Verbraucher; Handwerksbetriebe als B2B-Kunden sind rechtlich weniger geschützt, aber § 5 UWG (Irreführung) und § 5a (Vorenthalten wesentlicher Informationen) gelten auch gegenüber Unternehmern, und Wettbewerber können abmahnen. Für die Landingpages der Handwerker selbst (B2C-Endkunden) gilt dagegen die volle Liste, das ist für SeitenWerk als Textlieferant relevant (Haftungsrisiko für den Kunden). Das ist meine Einordnung; juristische Prüfung empfohlen.
- Echte Fristen (z. B. "Demo online bis {Datum}", wie im Brief-Konzept) sind unproblematisch, solange die Demo tatsächlich dann endet.

### Gaps
- Gesetzesvolltext des UWG-Anhangs konnte nicht von gesetze-im-internet.de geladen werden (HTTP 503); Zitate stammen von lxgesetze.de (Zusammenfassung des Abrufs, Wortlaut teils mit "[…]" gekürzt) und Händlerbund. Nummerierung Händlerbund (Nr. 10, 20) nicht am Gesetzestext gegengeprüft.
- OLG-Bamberg-Entscheidung (04.02.2026) Ergebnis nicht lesbar; LG-Deggendorf-Urteil nicht rechtskräftig (Berufung anhängig), Stand nach 2026-03 nicht geprüft.
- Keine Prüfung zu Preisangabenverordnung/Preisauszeichnung, Heilmittelwerbegesetz (Gesundheit ist ohnehin ausgeschlossen), Impressumspflicht, DSGVO/TDDDG bei Tracking-Skripten (Skills `conversion-tracking`/`analytics` können Tracking vorschlagen; § 25 TDDDG ist im Projekt als offen vermerkt).
- Keine Rechtsberatung; für verbindliche Aussagen Anwalt/IT-Recht-Kanzlei einbinden.
