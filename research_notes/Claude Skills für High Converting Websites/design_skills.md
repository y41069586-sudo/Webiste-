# Claude Code / Agent Skills für Web- und Frontend-Design (Stand 27.11.2026)

Hinweis zur Methodik: Stars wurden per Abruf der GitHub-Reposeite (WebFetch) am 27.11.2026 gelesen. Der Versuch, Lizenz/letztes Push-Datum per `gh api` zu holen, scheiterte (403, Repo-Zugriff in dieser Session nicht freigeschaltet). Deshalb sind "letztes Update"-Daten fast durchgehend NICHT verifiziert; die Reposeiten zeigten nur Commit-Anzahlen. Star-Zahlen aus Blogs sind mit Datum der Quelle gekennzeichnet. Aggregator-/Blog-Rankings sind teils Affiliate- oder Vendor-getrieben.

## 1. Anthropics offizielles Skills-Repo: gibt es "frontend-design", was tut es, Installation?

### Takeaway
Ja: `anthropics/skills` enthält einen Ordner `skills/frontend-design` und hat rund 201k Stars (27.11.2026). Es ist der offizielle Baseline-Skill für "weniger generisches" UI. Installation per Plugin-Marketplace oder durch Kopieren des Skill-Ordners nach `~/.claude/skills/` bzw. `.claude/skills/`.

### Cited Findings
- Repo `anthropics/skills`: 201.3k Stars, 23.6k Forks, 64 Commits auf main (abgerufen 27.11.2026). Lizenz: README nennt viele Skills als Apache 2.0, docx/pdf/pptx/xlsx ebenfalls Apache 2.0, `THIRD_PARTY_NOTICES.md` vorhanden; pro Skill eigene Lizenz (frontend-design verweist auf "LICENSE.txt" im Skill-Ordner). Letztes Commit-Datum nicht ermittelt — [GitHub anthropics/skills](https://github.com/anthropics/skills)
- Der Ordner `skills/` enthält 19 Skills, darunter `frontend-design`, `canvas-design`, `theme-factory`, `web-artifacts-builder`, `brand-guidelines`, `webapp-testing`, `skill-creator`, `mcp-builder` — [GitHub skills/](https://github.com/anthropics/skills/tree/main/skills)
- Frontmatter von `frontend-design` (aktuelle Fassung auf main): "Guidance for distinctive, intentional visual design when building new UI or reshaping an existing one. Helps with aesthetic direction, typography, and making choices that don't read as templated defaults." — [SKILL.md raw](https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md)
- Inhalt der aktuellen Fassung: erst Thema/Zielgruppe/Hauptaufgabe klären; Typografie (eine Familie oder zwei klar verschiedene, deliberate Wahl, Zeilenlänge < 80 Zeichen); Farbe (4–6 benannte Hex-Werte, bewusst NICHT Creme+Terrakotta, nicht Near-Black + Säuregrün, keine getönten Near-Blacks wie #0B0B0B); Motion sparsam (ein orchestrierter Page-Load-Moment statt Fade-Slide auf jeder Sektion; `prefers-reduced-motion` beachten); Anti-"AI-Slop" (keine identischen runden SaaS-Karten mit Gradient-Washes, keine ALL-CAPS-Eyebrow-Labels, keine Mono-Datenlabels, "Spend your boldness in one place"); Prozess: kompakten Design-Plan schreiben, gegen Brief prüfen, bauen, mit Screenshots kritisieren; Copy gilt als Designinhalt — [SKILL.md raw](https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md)
- Installation Marketplace (Repo-Gesamtmarkt): `/plugin marketplace add anthropics/skills`, dann `/plugin install document-skills@anthropic-agent-skills` bzw. `example-skills@anthropic-agent-skills` — [GitHub anthropics/skills](https://github.com/anthropics/skills). Hinweis: Welches Bundle `frontend-design` enthält, wurde nicht verifiziert (vermutlich example-skills).
- Alternativer Plugin-Befehl laut Vergleichsseite: `/plugin install frontend-design@claude-plugins-official` — [SkillGild](https://skillgild.dev/learn/claude-code-frontend-design-skills) (Drittquelle; nicht gegen Anthropic-Marketplace geprüft). Ein direkter Abruf von `anthropics/claude-code/plugins/frontend-design` ergab 404, d.h. dort liegt es (zumindest an diesem Pfad) nicht.
- Speicherorte laut Claude-Code-Doku: persönlich `~/.claude/skills/<name>/SKILL.md`, Projekt `.claude/skills/<name>/SKILL.md` (einchecken zum Teilen), Plugin `<plugin>/skills/<name>/SKILL.md`; bei gleichem Namen schlägt persönlich Projekt — [Claude Code Docs: Skills](https://code.claude.com/docs/en/skills)
- Vergleichstest (Paralect, Stars Okt. 2026 = 180K): frontend-design "moved Claude off its default look" (kondensierte Schrift, produktzentrierter Hero, ~3 Min.), Schwäche: "agent still invents copy, clients, and prices" — [Paralect](https://www.paralect.com/skills/top-design-skills)
- Kritik (Subframe, Vendor-Quelle, 183.301 Stars am 23.10.2026): fragt nie nach einer Referenz; Kritiker sagen, es ziehe Output zu Anthropics eigener Optik — [Subframe](https://www.subframe.com/tips/best-claude-code-skills-for-ui-design)
- Kosten: ca. 1,6x der Kosten eines Laufs ohne Skill; 4 von 5 getesteten Seiten (inkl. ohne Skill) erfanden Produktfakten — [SkillGild](https://skillgild.dev/learn/claude-code-frontend-design-skills)

### Inferences
- Für SeitenWerk reicht das Kopieren des Ordners `skills/frontend-design` nach `.claude/skills/` im Projekt (kein Marketplace nötig, reproduzierbar, git-versioniert). Damit kann man auch den Text prüfen und anpassen.
- Der "erfindet Fakten/Preise/Kunden"-Befund kollidiert mit den Projektregeln (§ 5 UWG, keine erfundenen Fakten); der Skill muss durch Projektregeln (Claims-Freigabe, keine Testimonials) ergänzt werden, nicht umgekehrt.
- Die Anti-Cliché-Liste (Creme/Terrakotta etc.) ist nützlich gegen KI-Look, aber Handwerksbetriebe brauchen oft bewusst vertraute Looks; Skill sagt selbst "Use the brief's own words for visual direction".

### Gaps
- Exakte Lizenz von frontend-design (LICENSE.txt im Ordner) nicht gelesen. Letztes Update-Datum nicht verifizierbar. Ob die ältere, oft zitierte Fassung (Mai 2026 und früher, "bold aesthetic direction") durch die jetzige ersetzt wurde, ist nicht belegt; die aktuell abgerufene Fassung ist die oben beschriebene.

## 2. Beliebteste Community-Design-Skills (Repos, Stars, Inhalt, Installation)

### Takeaway
Die Top-Repos Ende 2026: ui-ux-pro-max (~155k), taste-skill (~122k), Impeccable (~118k), Emil Kowalski skills (~60k), Vercel agent-skills (~35k), shadcn/ui-Skill (offiziell, im shadcn-Repo 129k Stars für das Gesamtprojekt). Alle laufen mit Claude Code; die meisten Stars-Zahlen sind seit Okt. 2026 deutlich gewachsen (Vergleich unten).

### Cited Findings
Stars am 27.11.2026 (eigene Abfrage der Reposeite), zum Vergleich Stand 9.–25.10.2026 aus Blogs.

**ui-ux-pro-max** — [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
- 154.9k Stars (27.11.2026); 133.9k (9.10.2026, SkillGild) / 135K (Paralect). MIT. 329 Commits; letztes Datum nicht gezeigt.
- Inhalt: ca. 80 UI-Stile (51 aktiv), 194 Farbpaletten, 74 Font-Pairings, 194 branchenspezifische Reasoning-Regeln zur Design-System-Generierung, 25 Chart-Typen, 141 UX-Guidelines, 105 Icon-Zeilen; Python-Suchskript (nur Stdlib) mit CLI für Design-Systeme/Tokens/Stack-Guidance.
- Installation: `/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill` dann `/plugin install ui-ux-pro-max@ui-ux-pro-max-skill`; oder `npm install -g ui-ux-pro-max-cli` + `uipro init --ai claude`; oder `gh skill install nextlevelbuilder/ui-ux-pro-max-skill .claude/skills/ui-ux-pro-max`. Voraussetzung Python 3.
- Stacks: 22, Standard "HTML + Tailwind", dazu React, Next.js, shadcn/ui, Vue, Svelte, Astro usw. -> passt direkt zu statischem HTML+Tailwind und Next.js.
- Qualität: laut Paralect "most conventional page in the test" (Pill-Badge, Fake-App-Fenster, unbelegter "6,000+ designers"-Logostreifen); gut für konsistentes System, nicht zum Herausstechen — [Paralect](https://www.paralect.com/skills/top-design-skills). SkillGild: konventionellster Look, schwebende Karte verdeckte eine Zeile — [SkillGild](https://skillgild.dev/learn/claude-code-frontend-design-skills).

**taste-skill (`design-taste-frontend`)** — [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)
- 122.2k Stars (27.11.2026); 93.8k (9.10.) / 101.6k (23.10., Subframe). MIT (c) 2026. 328 Commits.
- Inhalt: klassifiziert das Kundengeschäft, "deals" Palette und Font-Pairing, Starter-HTML (`assets/starter.html`) + Layout-CSS, echte Produkt-UI/Fotos, Shader-/Scroll-Effekte nur für Tech/Software/Gaming; Checker rendert in headless Chrome bei mehreren Breiten, "Finish Gate" vor Übergabe. Node-22+-Skripte, benötigt Chrome/Chromium; keine API-Keys.
- Installation: `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"`; oder `/plugin marketplace add Leonxlnx/taste-skill` + `/plugin install taste-skill@taste-skill`.
- Frameworks: leerer Ordner -> statische HTML/Tailwind-Seite; bestehende React/Vue/Svelte/Astro-Projekte im eigenen Stack; Next.js als Static Export. -> sehr passend für SeitenWerk-Muster.
- Qualität: starke Headline-Typo, ein Akzent, aber "common layout, random stock photo", nicht für Dashboards (Paralect). Subframe (Vendor-Bias): langsam (30–45 Min., mehrere 100k Token), eigener Blindtest 7,7 vs. 7,8 ohne Skill; SkillGild: verfehlte zwei eigene Pre-Flight-Checks. Achtung: Starzahl-Quellen weichen ab (Paralect 95K vs. Subframe 101.6K am ähnlichen Datum) — [Paralect](https://www.paralect.com/skills/top-design-skills), [Subframe](https://www.subframe.com/tips/best-claude-code-skills-for-ui-design), [SkillGild](https://skillgild.dev/learn/claude-code-frontend-design-skills)

**Impeccable** — [pbakaus/impeccable](https://github.com/pbakaus/impeccable) (Site laut Subframe: impeccable.style)
- 117.8k Stars (27.11.2026); 78.6k (9.10.) / 85.5k (23.10.). Apache-2.0. 3.967 Commits.
- Inhalt: Design-Vokabular + 24 Slash-Commands: Steer (`bolder`, `quieter`, `distill`, `colorize`, `typeset`, `layout`, `animate`, `delight`, `overdrive`), Review (`critique`, `audit`), Finish (`polish`, `harden`, `clarify`, `adapt`, `optimize`, `onboard`), `live`, `generate`, Setup (`shape`, `init` schreibt PRODUCT.md, `document` schreibt DESIGN.md, `extract`). 62 deterministische Regeln gegen AI-Slop (Inter überall, Violett-Blau-Verläufe, verschachtelte Karten, graue Schrift auf Farbfläche, Icon-Kachel über jeder Überschrift) ohne LLM, als Hook, CLI (`npx impeccable detect`) oder Chrome-Extension.
- Installation: `npx impeccable install` im Projektroot, Tool neu laden, `/impeccable init`; alternativ `/plugin marketplace add pbakaus/impeccable`, VS-Code-Extension, Submodule, manuelles Kopieren.
- Qualität: In Paralect-Test einziges Pack, das `/audit` (10/20 ohne Skill) und `/polish` (Mobile-Overflow, Kontrast, Tap-Targets) real verbesserte und erfundene Belege als "needs your input" markierte; beste Wahl für bestehende Seiten. Subframe: "best single pick", aber Seiten sehen weiterhin ähnlich aus; SkillGild: langsamster/teuerster Lauf (~7,6x No-Skill), Einzelcommands im Alltag empfohlen; als einziger ohne erfundene Produktfakten — [Paralect](https://www.paralect.com/skills/top-design-skills), [Subframe](https://www.subframe.com/tips/best-claude-code-skills-for-ui-design), [SkillGild](https://skillgild.dev/learn/claude-code-frontend-design-skills)
- Statisches HTML: Detektor/Commands arbeiten auf Dateien/gerenderten Seiten; Framework-Unabhängigkeit ist plausibel, aber nicht explizit für statisches HTML belegt.

**Emil Kowalski's skills** — [emilkowalski/skills](https://github.com/emilkowalski/skills)
- 60.3k Stars (27.11.2026); 44.3k (9.10.) / 49.1k (23.10.). MIT. 69 Commits.
- Inhalt: 19 Skills u.a. `emil-design-eng`, `animate`, `review-animations`, `improve-animations`, `animation-performance`, `gestures`, `apple-design`, `pick-ui-library`, `learn-taste`; plus `ui-cheatsheet.md`, `performance-cheatsheet.md`.
- Installation: `npx skills@latest add emilkowalski/skills`.
- Qualität: Paralect: 21 Interaktionsänderungen mit Begründung, Timer-Bug gefixt, aber ändert kein Layout/Farbe/Typo; ein Reddit-Nutzer laut Subframe: Ergebnis "still fell flat" — [Paralect](https://www.paralect.com/skills/top-design-skills), [Subframe](https://www.subframe.com/tips/best-claude-code-skills-for-ui-design)

**Vercel `agent-skills`** — [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)
- 35.0k Stars, MIT, 284 Commits (27.11.2026).
- Skills: `web-design-guidelines` (Review von UI-Code gegen 100+ Regeln zu A11y/Performance/UX), `react-best-practices` (40+ Regeln, React/Next.js), `composition-patterns`, `react-view-transitions`, `deploy-to-vercel`, `vercel-optimize` u.a.
- Installation: `npx skills add vercel-labs/agent-skills`.
- Eher Review/Regelwerk als Design-Generator; web-design-guidelines passt auch für statisches HTML (Review von UI-Code), react-best-practices nur für React/Next.

**shadcn/ui Skill (offiziell)** — [shadcn-ui/ui](https://github.com/shadcn-ui/ui), Doku [ui.shadcn.com/docs/skills](https://ui.shadcn.com/docs/skills)
- Gesamtrepo 129.2k Stars, MIT (27.11.2026). Skill liest `components.json`, `shadcn info --json`, kennt CLI (`init`, `add`, `search`, `view`, `docs`, `diff`, `info`, `build`), Theming (CSS-Variablen, Dark Mode), Registries/MCP, erzwingt Patterns (`FieldGroup`, `ToggleGroup`), schlägt Komponenten vor dem Generieren nach.
- Installation: `pnpm dlx skills add shadcn/ui` (npm/yarn/bun-Äquivalente).
- Nur für React/Next.js-Projekte mit shadcn; nicht für statisches HTML.

**Superdesign** — [superdesigndev/superdesign](https://github.com/superdesigndev/superdesign)
- 7.7k Stars (27.11.2026). Lizenz auf Seite nicht genannt. README: Original-IDE-Extension (Cursor/VS Code) von 2025, "no longer actively maintained"; Produkt jetzt Web-App superdesign.dev; als Skill für Claude Code/Cursor über separates Repo `superdesigndev/superdesign-skill` nutzbar (dieses Repo nicht selbst geprüft).

**Weitere in Vergleichen genannt (nicht selbst geprüft)**
- Hallmark (~30K), huashu-design (~25K; teuerster Lauf ca. 8,5 Min./4,20 $, drei Design-Richtungen), designer-skills (2,9K; 33 Plugins, Critique 16 Punkte in 1,5 Min.) — nur [Paralect](https://www.paralect.com/skills/top-design-skills), Stand Okt. 2026; Repo-URLs nicht verifiziert.
- better-ui (jakubkrehel/skills, 8.206 Stars am 23.10.2026) — [Subframe](https://www.subframe.com/tips/best-claude-code-skills-for-ui-design), nicht selbst geprüft.
- Web-Suche nennt "brand-landingpage" (~36,5K Stars) als Landingpage-Skill — nur aus einer Suchzusammenfassung, Repo nicht verifiziert; ich konnte ihn nicht bestätigen.

### Inferences
- Tendenz aller Vergleiche: frontend-design zum Neustart, Impeccable zum Nachschärfen vor Auslieferung, Emil-Skills nur für Motion. ui-ux-pro-max liefert Systeme (Paletten, Fonts, Stile pro Branche), aber das "generischste" Ergebnis — für Handwerksbetriebe ggf. sogar passend (vertraut, zugänglich).
- Star-Wachstum zwischen Okt. und Nov. 2026 (z.B. Impeccable +39k, taste-skill +28k in ~7 Wochen) deutet auf Hype; Stars sind kein Qualitätsbeleg.

### Gaps
- Letztes Update-Datum je Repo nicht ermittelt (gh API 403, Reposeiten ohne Datum).
- Keine Primärbelege aus Reddit/HN/X gefunden (Suche lieferte keine Threads); Community-Urteile stammen aus Blogs/Aggregatoren.
- Keine unabhängige Messung, dass Skills Conversion verbessern; Tests sind Einzelläufe mit einer Brief-Seite (SaaS-Landingpage "Hourglass"), nicht deutsches Handwerk.

## 3. "Berühmter Skill für High-Converting Websites" und Landingpage-spezifische Skills

### Takeaway
Einen einzelnen anerkannten "High-Converting-Website"-Skill konnte ich nicht belegen. Es gibt viele Landingpage-/Copywriting-Skills mit unverifizierten Stars auf Aggregator-Seiten; Konversion kommt eher aus Copy-Frameworks + Design-Skill-Kombination.

### Cited Findings
- Suche ergab u.a.: `alirezarezvani/claude-skills` Landing Page Generator (Next.js/React TSX + Tailwind), `borghei/Claude-Skills` (Struktur, Copy-Frameworks, CTA), `onewave-ai/claude-skills` Landing Page Copywriter (PAS/AIDA/StoryBrand; Listing zeigt 234 Stars), `thatrebeccarae/claude-marketing` Landing Page Optimizer (Installation durch Klonen nach `~/.claude/skills/`) — [Suchergebnisse u.a. skills.sh / claudeskills.info](https://www.skills.sh/onewave-ai/claude-skills/landing-page-copywriter). Qualität ungeprüft; Aggregator zeigen teils unplausible Zahlen.
- Taste-skill wird in Guides als "strict anti-slop rules for landing pages" beschrieben — [Subframe](https://www.subframe.com/tips/best-claude-code-skills-for-ui-design) / Suchzusammenfassung.

### Inferences
- Wirksamer für SeitenWerk: eigene kleine Projekt-Skill (Branchen-Playbooks, Claims-Regeln, deutsches Recht) + frontend-design/Impeccable als Gestaltungsschicht, statt einen "Wunder-Skill" zu installieren.

### Gaps
- Kein belegtes "famous"-Repo mit Conversion-Messung; Reddit/X-Quellen nicht auffindbar.

## 4. Eignung für statisches HTML+Tailwind vs. Next.js

### Takeaway
taste-skill (Starter-HTML), ui-ux-pro-max (Standard-Stack HTML+Tailwind) und frontend-design sind framework-agnostisch. shadcn-Skill und Vercels react-best-practices sind nur für React/Next.

### Cited Findings
- taste-skill: leerer Ordner -> statische Seite aus `assets/starter.html`; Next.js als Static Export — [GitHub](https://github.com/Leonxlnx/taste-skill)
- ui-ux-pro-max: "HTML + Tailwind (default)" plus 21 weitere Stacks — [GitHub](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
- Paralect-Test lief als einzelne `index.html` für alle Packs — [Paralect](https://www.paralect.com/skills/top-design-skills)
- shadcn-Skill setzt `components.json` voraus — [shadcn docs](https://ui.shadcn.com/docs/skills)

### Gaps
- Impeccable/Emil: statisches HTML nicht ausdrücklich belegt.

## 5. Sicherheit: Was vor der Installation prüfen?

### Takeaway
Skills laufen mit den Rechten des Agenten; Drittanbieter-Skills können Skripte, Hooks, MCP-Server und Shell-Injection enthalten. Vor Installation SKILL.md, Skripte und Manifeste lesen; bevorzugt kopieren und pinnen statt blind `npx`/Marketplace.

### Cited Findings
- Snyk "ToxicSkills": von 3.984 Skills (ClawHub, skills.sh; Stand 5.2.2026) hatten 36,8 % (1.467) mindestens einen Sicherheitsmangel, 534 (13,4 %) kritisch, 76 bestätigt bösartige Payloads; Top-100 auf skills.sh: 0,0 % Prompt-Injection-Treffer — [Snyk](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/) (Zahlen laut Snyks eigenem Scanner)
- Akademische Studie: 98.380 Skills geprüft, 157 bösartige mit 632 Schwachstellen — [arXiv 2602.06547](https://arxiv.org/pdf/2602.06547v2); Technical Report: viele nutzen Prompt Injection, die klassische Code-Scanner übersehen — [arXiv 2605.28588](https://arxiv.org/html/2605.28588)
- Claude-Code-Doku: Projekt-Skills können `allowed-tools` selbst vergeben (auch in `-p` in nicht vertrauten Ordnern); Zeilen wie `` !`cmd` `` laufen beim Laden ohne Rückfrage (Abschalten: `"disableSkillShellExecution": true`); Ordner mit `.claude-plugin/plugin.json` laden als Plugin mit Agents, Hooks, MCP-Servern; Skills in `~/.claude/skills/synced/` werden überschrieben — [Claude Code Docs](https://code.claude.com/docs/en/skills)
- Konkrete Checkliste (abgeleitet): `allowed-tools`, `hooks`, `!`-Shell-Injection, `scripts/`-Inhalt (Netzwerkaufrufe, `curl | sh`, Zugriff auf `.env`/`~/.ssh`), `install.sh`/npm-postinstall der CLI-Installer (ui-ux-pro-max-cli, `npx impeccable install`, `npx skills add`), `.claude-plugin/`-Manifeste, Versionspinning per Commit-Hash.

### Inferences
- Die oben genannten großen Repos (Anthropic, Vercel, shadcn) sind niedrigeres Risiko; taste-skill und ui-ux-pro-max bringen ausführbare Node-/Python-Skripte mit — Skripte vor Nutzung lesen. Ich habe die Skripte dieser Repos NICHT auditiert.

### Gaps
- Kein Sicherheitsaudit der konkreten Design-Repos gefunden.

## Empfehlung für SeitenWerk (Inferenz, kein Beleg)
1. `frontend-design` (Anthropic) als Projekt-Skill in `.claude/skills/` kopieren, Text lesen und um Projektregeln ergänzen (keine erfundenen Fakten/Testimonials).
2. Impeccable (`audit`/`polish`/`critique`) als Qualitätsschleife vor Auslieferung.
3. Optional taste-skill für statische HTML/Tailwind-Starter; ui-ux-pro-max als Branchen-Paletten-/Font-Nachschlagewerk.
4. shadcn-Skill nur bei Next.js-Projekten mit shadcn; Vercel `web-design-guidelines` als A11y-/UX-Review.
5. Immer: eigene Wahrheits- und Rechtsregeln (Impressum, Datenschutz, § 5 UWG) gehören in einen eigenen Skill, nicht in Community-Skills.
