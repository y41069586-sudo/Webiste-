# Kaltstart verkleinern: Next.js 16 App Router auf Netlify (ohne Keep-warm-Pings)

Stand der Recherche: 19.11.2026. Geprüft wurden die Netlify-Doku, die AWS-Lambda-Doku, die Next.js-16.4-Doku und der Quelltext von `next@16.4.0` und `@netlify/plugin-nextjs@5.16.8` (neueste Version auf npm, gelesen aus dem npm-Tarball). Schätzungen sind als **[Schätzung]** markiert.

Kurz zu unserem Projekt (gelesen in `apps/web/next.config.ts` und `apps/web/instrumentation.ts`): `output: 'standalone'`, `transpilePackages: ['@wbm/core', '@wbm/templates']`, `serverExternalPackages` (pg, pg-boss, playwright, playwright-core, stripe, @anthropic-ai/sdk, @aws-sdk/client-s3 …), **kein** `experimental.preloadEntriesOnStart`. Damit gilt der Standardwert `true`. `register()` führt `await import('@wbm/core')` aus.

## 1. Was bestimmt den Kaltstart von Next.js auf Netlify (Lambda)?

### Takeaway
Den Kaltstart bestimmt vor allem die Arbeit beim Start: Module laden und auswerten, das Next-Server-Init, `instrumentation.register()` und das Vorladen aller Routen. Die reine Paketgröße wirkt mit, kommt aber an zweiter Stelle. Der Netlify-Adapter startet den Next-Server erst innerhalb der ersten Anfrage („lazy“). Diese Anfrage trägt deshalb das ganze Init, also Next laden, Instrumentation, Routen-Preload und DB-Verbindung. Belastbare veröffentlichte Netlify-Messungen für so große Apps habe ich nicht gefunden.

### Cited Findings
- AWS nennt als größten Latenzfaktor vor der Ausführung den Init-Code. Einflussfaktoren sind: „The size of the function package, in terms of imported libraries and dependencies“, „The amount of code and initialization work“ und „The performance of libraries and other services in setting up connections“. AWS empfiehlt, nur benötigte Module zu importieren, selten genutzte Objekte „lazily“ zu laden und große Funktionen in mehrere kleinere aufzuteilen — [AWS Lambda Docs: execution environment](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)
- AWS-Angabe zur Größenordnung: Kaltstarts betreffen typischerweise < 1 % der Aufrufe und dauern „from under 100 ms to over 1 second“. Unsere 9–10 s liegen weit darüber, der Großteil ist also eigener bzw. Framework-Init-Code — [AWS Lambda Docs](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)
- **Quelltext-Befund im Adapter (`@netlify/plugin-nextjs` 5.16.8, `dist/run/handlers/server.js`):** Beim Modulstart stößt der Handler nur `import("../next.cjs")` an. Den Next-Server erzeugt er erst in der ersten Anfrage (`if (!nextHandler) { … getMockedRequestHandler(…) }`, Span „initialize next server“). Der Aufruf geht über `getRequestHandlers` aus `next/dist/server/lib/start-server.js`, also den normalen Router-Server und nicht den „minimalMode“ — [npm-Tarball plugin-nextjs 5.16.8](https://registry.npmjs.org/@netlify/plugin-nextjs/-/plugin-nextjs-5.16.8.tgz)
- **Quelltext-Befund in Next 16.4 (`dist/server/next-server.js`):** `if (!options.dev && !this.minimalMode && this.nextConfig.experimental.preloadEntriesOnStart) { void this.unstable_preloadEntries() }`. Der Preload ruft für **jede** Seite in Pages- und App-Manifest `loadComponents` auf. Der Standardwert in `config-shared.js` ist `preloadEntriesOnStart: true`. Weil der Netlify-Adapter nicht im minimalMode läuft, lädt jeder Kaltstart **alle Routen-Module** samt ihren Top-Level-Imports — [unpkg next@16.4.0 next-server.js](https://unpkg.com/next@16.4.0/dist/server/next-server.js), [config-shared.js](https://unpkg.com/next@16.4.0/dist/server/config-shared.js)
- **Quelltext/Doku Next 16.4:** `prepareImpl()` wartet auf `runInstrumentationHookIfAvailable()`. Laut Doku wird `register` „called once when a new Next.js server instance is initiated, and must complete before the server is ready to handle requests“ — [Next.js 16.4 Docs instrumentation](https://unpkg.com/next@16.4.0/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md)
- Next-Doku (Memory-Guide): Next lädt beim Start standardmäßig alle Seiten-Module vor, „faster response times, in exchange for a larger initial memory footprint“. Abschalten mit `experimental.preloadEntriesOnStart: false` — [Next.js 16.4 Docs memory-usage](https://unpkg.com/next@16.4.0/dist/docs/01-app/02-guides/memory-usage.md)
- Einzelberichte aus Projekten, die `preloadEntriesOnStart: false` gesetzt haben: In einem PR sank die Haupt-Thread-CPU der ersten ~20 s nach dem Start von 2,44 s auf 0,56 s. Das ist ein Einzelfall, kein Benchmark — [GitHub-Suchergebnis: PRs „stop preloading every route on cold start“, z. B. Virtual-Coffee #1684](https://github.com/Virtual-Coffee/virtualcoffee.io/pull/1684), [Cognipeer/console #389](https://github.com/Cognipeer/console/pull/389)
- Netlify-Support (Mai 2025): Ein echter Kaltstart zeigt im Funktionslog eine Zeile „Init Duration“. Langsame Anfragen ohne diese Zeile sind keine Lambda-Kaltstarts. Im Thread lagen die gemessenen langsamen Next-Handler-Aufrufe bei 1,1–2,2 s (kleine App) — [Netlify Forum, 05/2025](https://answers.netlify.com/t/frequent-slow-cold-start-for-function-next-js-server-handler/148600)
- Zur Paketgröße: AJ Stuyvenberg (Jan 2024, Node 18) misst bei Node-ZIP-Funktionen ab etwa 30 MB, dass Container-Images schneller kaltstarten. Abhängigkeitsgröße sei aber nur ein Faktor neben „heap allocations, init-time computation, init-time network requests“. Die Zahlen stehen nur in Grafiken — [Stuyvenberg: The case for containers on Lambda (2024, älter)](https://dev.to/aws-heroes/the-case-for-containers-on-lambda-with-benchmarks-2alf)
- Widersprüchliche ältere Messungen: A Cloud Guru fand keinen Einfluss der Paketgröße, Tanasa (2023) fand einen steigenden Effekt — [Pluralsight/ACG (älter)](https://www.pluralsight.com/resources/blog/cloud/does-coding-language-memory-or-package-size-affect-cold-starts-of-aws-lambda); [Tanasa, Medium 2023](https://medium.com/@adtanasa/size-is-almost-all-that-matters-for-optimizing-aws-lambda-cold-starts-cad54f65cbb)
- OpenNext (AWS-Variante): „a big bundle size will increase cold start a lot“, weil die Umgebung das Paket herunterladen und entpacken muss — [OpenNext: Reducing Bundle Size](https://opennext.js.org/aws/v2/common_issues/bundle_size)

### Inferences
- **[Schätzung]** Unsere 9–10 s teilen sich vermutlich so auf: Lambda-Init plus Laden des Adapters/`next.cjs` (~1–2 s), `register()` mit vollem `@wbm/core` (transpiliert und gebündelt, zieht Drizzle, Provider, Prompts usw.), danach der Preload **aller** Admin-, Demo- und Checkout-Routen mit ihren Top-Level-Imports (Stripe, Anthropic, pdfjs, Playwright-Wrapper …) und zuletzt der erste TLS-plus-Postgres-Handshake Ohio → Frankfurt. Die 61 MB werden auf Platte gelesen, ausgewertet wird aber nur, was tatsächlich importiert wird. Die Auswertung (Parsen, Kompilieren, Top-Level-Code) wiegt daher mehr als die Zahl der Bytes.
- Mit Messung lässt sich das schnell eingrenzen. Dazu `performance.now()` in `register()` vor und nach `import('@wbm/core')` setzen und den Netlify-Span „initialize next server“ ansehen. Danach einmal mit `preloadEntriesOnStart: false` messen.

### Gaps
- Keine offizielle Netlify- oder OpenNext-Netlify-Messung, wie stark Trace-Größe oder Dateianzahl den Kaltstart beeinflussen. Kein GitHub-Issue mit Zahlen für Netlify v5 gefunden.
- Ungeklärt ist, ob Netlify für Funktionen den Node-Compile-Cache oder Bytecode-Caching nutzt (im Adapter nicht gefunden).

## 2. Funktion aufteilen und schwere Abhängigkeiten ausschließen

### Takeaway
Der Adapter v5 baut **genau eine** Funktion `___netlify-server-handler` mit `nodeBundler: "none"` und `includedFiles: ["**"]` aus dem Standalone-Output. Eine Aufteilung in mehrere Next-Funktionen ist nicht vorgesehen. Die Größe steuert man über Next selbst: `outputFileTracingExcludes` verkleinert das Funktionspaket direkt. `serverExternalPackages` verhindert das Mitbündeln, die Pakete bleiben aber im Trace. Wirksamer als das Ausschließen ist, schwere Pakete nur per `await import()` in den Routen zu laden, die sie brauchen, und Arbeit wie Playwright/PDF aus der Web-Funktion herauszunehmen (Worker auf dem VPS). Netlify-Functions außerhalb von Next (`netlify/functions/*`) sind eigene, kleine Lambdas.

### Cited Findings
- Quelltext Adapter 5.16.8 (`dist/build/plugin-context.js`): `SERVER_HANDLER_NAME = "___netlify-server-handler"`. In `dist/build/functions/server.js` steht das Manifest `{ name: "Next.js Server Handler", nodeBundler: "none", includedFiles: ["**"] }`. `copyNextDependencies` kopiert `standaloneRootDir` (also den Next-Output-File-Trace) in den Handler. `included_files` aus `[functions."*"]` in `netlify.toml` wird zusätzlich hineinkopiert, kann also nur hinzufügen, nicht ausschließen — [npm-Tarball plugin-nextjs 5.16.8](https://registry.npmjs.org/@netlify/plugin-nextjs/-/plugin-nextjs-5.16.8.tgz)
- Netlify-Mitarbeiter im Forum: Next.js-API-Routen laufen „all handled by a single function“ — [Netlify Forum: Next.JS Server Handler](https://answers.netlify.com/t/next-js-server-handler/123711)
- Netlify-Doku zum Next-Adapter: Er stellt „a serverless Netlify Function“ für SSR, ISR, PPR, Route Handlers und Server Actions bereit, dazu eine Edge Function für Middleware. Splitting wird nicht erwähnt — [Netlify Docs: Next.js overview](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)
- `outputFileTracingExcludes` mit Schlüssel `"*"` wirkt auf alle Funktionspakete. Übliche Kandidaten sind `@swc/core`, `esbuild`, `sharp` und Source-Maps (`*.js.map`) — [OpenNext: Reducing Bundle Size](https://opennext.js.org/aws/v2/common_issues/bundle_size)
- Ein Adapter-PR für pnpm: Ohne den Fix landen musl- **und** glibc-Varianten nativer Pakete im Paket, „function bundles take up effectively twice as much space“ — [opennextjs-netlify PR #3145](https://github.com/opennextjs/opennextjs-netlify/pull/3145)
- `serverExternalPackages`: nimmt Pakete aus dem Server-Components-Bündel heraus und lädt sie per nativem `require`. `@aws-sdk/client-s3` steht bereits auf Nexts Standardliste — [Next.js 16.4 Docs serverExternalPackages](https://unpkg.com/next@16.4.0/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverExternalPackages.md)
- Netlify-`netlify.toml` kennt `included_files`, `external_node_modules` und `node_bundler = "esbuild"` für eigene Funktionen. Der Next-Handler setzt `nodeBundler: "none"` fest — [Netlify Docs: Functions configuration](https://docs.netlify.com/build/functions/configuration/)
- AWS: „rearchitect a single function into multiple, specialized functions … individually smaller and each have less initialization code“ — [AWS Lambda Docs](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)

### Inferences
- Für den Kaltstart zählt, was beim Start **ausgewertet** wird, nicht was auf Platte liegt. Wenn ein Paket nirgends auf Top-Level importiert wird, kostet es beim Start fast nichts, auch wenn es im Trace liegt (abgesehen von Download und Entpacken). `outputFileTracingExcludes` für playwright-core, pdfjs-dist und Fonts lohnt sich nur, wenn die Web-App diese Pakete wirklich nie braucht. Sonst gibt es Laufzeitfehler „Cannot find module“.
- **[Schätzung]** Der Hebel für schnelle QR-Scans liegt darin, die zeitkritischen Wege (`/q/[token]`, Kurz-URL, `/d/[slug]`) aus dem großen Handler herauszuhalten. Das geht mit Next-Middleware (läuft auf Netlify als Edge Function, eigener Deno-Isolate, Limits 50 ms CPU und 20 MB Code) oder einer eigenen kleinen Netlify-Funktion bzw. Edge Function per HTTP-Lookup (z. B. Supabase REST). Diese Wege teilen dann keinen Kaltstart mit dem Admin-Code — [Netlify Docs: Edge Functions limits](https://docs.netlify.com/build/edge-functions/limits/)

### Gaps
- Keine offizielle Netlify-Option, um den Next-Handler pro Route zu splitten (nur einzelne Foren-Berichte aus der v4-Zeit über „sharded“ Funktionen).
- Keine Messung, wie viel Kaltstart 61 MB gegenüber z. B. 25 MB auf Netlify ausmachen.

## 3. Arbeitsspeicher: Einfluss und Einstellbarkeit im Personal-Tarif

### Takeaway
Im Personal-Tarif **nicht einstellbar**. Speicher und vCPU kann man nur in Credit-basierten Pro- und Enterprise-Tarifen von 1024 auf bis zu 4096 MB setzen. Auf Lambda skaliert die CPU mit dem Speicher. 2–4 GB würden das CPU-gebundene Modul-Auswerten beschleunigen, das ist aber im aktuellen Tarif keine Option.

### Cited Findings
- „Unless customized, every function deploys with: Memory 1024 MB.“ Das Anpassen ist „available on Credit-based Pro and Enterprise plans only“, im Bereich 1024–4096 MB oder `vcpu` 0.5–2.0 (0.5 ↔ 1024 MB, 2.0 ↔ 4096 MB, linear) — [Netlify Docs: Functions configuration](https://docs.netlify.com/build/functions/configuration/)
- Regionswahl: „available on all Pro and Enterprise plans“, Standard `cmh` (US East, Ohio). `fra` ist self-serve auswählbar (nur Pro). Für Framework-Adapter gilt die Projekt-Einstellung in der UI — [Netlify Docs: Functions configuration](https://docs.netlify.com/build/functions/configuration/)
- Forenbericht: Ein Pro-Nutzer erreichte trotz angefordertem 2 GB weiter die 1024-MB-Grenze. Das ist ein Einzelfall — [Netlify Forum: Increase Background function memory](https://answers.netlify.com/t/increase-background-function-memory/165230)

### Inferences
- **[Schätzung]** 1024 MB entsprechen bei Netlify „0.5 vCPU“, also halber CPU-Leistung. Modulauswertung ist single-threaded und CPU-gebunden, bei 2048 MB (1 vCPU) wäre das Init grob halb so lang. Das gilt aber nur auf Pro.
- Ein Wechsel auf Pro würde zusätzlich `fra` erlauben. Die Funktion stünde dann neben der Supabase-DB in Frankfurt, und mehrere Round-Trips über den Atlantik entfielen. Für die Kosten-/Tarifentscheidung ist das relevant, nicht für die Code-Optimierung.

### Gaps
- Keine Netlify-Messung zur Init-Dauer bei 1 GB gegenüber 2 GB oder 4 GB.

## 4. instrumentation.ts, Lazy Imports und Next-16-Optionen

### Takeaway
Mit hoher Wahrscheinlichkeit die größten Hebel bei geringem Aufwand: (1) `experimental.preloadEntriesOnStart: false`, (2) `register()` nicht mehr das ganze `@wbm/core` laden lassen, sondern nur ein winziges Modul für den Background-Runner, (3) schwere Bibliotheken (Stripe, Anthropic, pdfjs, Playwright, S3, pg-boss) nur per `await import()` dort laden, wo sie gebraucht werden, (4) DB-Client lazy und mit Pooler. Vercels Bytecode-Caching (bis −27 % TTFB) gibt es auf Netlify nicht. Ob der Node-Compile-Cache auf Netlify-Lambda nutzbar ist, ist unbelegt.

### Cited Findings
- `register` muss fertig sein, bevor der Server Anfragen annimmt (siehe Abschnitt 1). Next empfiehlt, Node-spezifische Imports in `register` per Laufzeitprüfung bzw. separatem `require('./register.node')` zu laden — [Next.js 16.4 Docs instrumentation](https://unpkg.com/next@16.4.0/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md)
- `preloadEntriesOnStart` steht in Next 16.4 standardmäßig auf `true`. Abschalten verringert den Startaufwand, die Module werden dann bei der ersten Nutzung der jeweiligen Route geladen — [config-shared.js](https://unpkg.com/next@16.4.0/dist/server/config-shared.js), [Memory-Guide](https://unpkg.com/next@16.4.0/dist/docs/01-app/02-guides/memory-usage.md)
- AWS: „only import the libraries and dependencies that they need … lazily load variables in the global scope to reduce the static initialization duration“ — [AWS Lambda Docs](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)
- Netlify (Doku zu Netlify Server, die Empfehlung ist allgemein gültig): „Limit your entry file's top-level code … Set up services or data that only some routes use when a request first needs them“ und „Keep your server's dependencies small, since they're loaded every time an instance starts.“ — [Netlify Docs: Server lifecycle](https://docs.netlify.com/build/server/lifecycle/)
- Vercel Bytecode Caching (Juni 2024): bis −27 % TTFB bei Kaltstarts (800-kB-Seite: 1548 → 1130 ms TTFB, abgerechnete Dauer −48 %). Das ist Vercel-exklusiv, das npm-Paket `v8-compile-cache` eignet sich laut Vercel nicht für Serverless mit flüchtigem Dateisystem — [Vercel Blog (2024)](https://vercel.com/blog/introducing-bytecode-caching-for-vercel-functions)
- Node-Compile-Cache: `module.enableCompileCache()` ab Node 22.8, Standardpfad `os.tmpdir()/node-compile-cache`, „portable“-Option bzw. `NODE_COMPILE_CACHE_PORTABLE=1` für verschobene Verzeichnisse. Es gibt keine Lambda- oder Netlify-Belege dazu — [Node.js v22 module docs](https://r2.nodejs.org/docs/v22.17.1/api/module.html), [Node-Commit portable](https://github.com/nodejs/node/commit/36da413663)
- Supabase-Pooler: Port 6543 ist seit 28.02.2025 nur noch Transaction-Mode und für Serverless gedacht. Im Hostnamen steht die Region (`aws-0-<region>.pooler.supabase.com`). Named Prepared Statements funktionieren im Transaction-Mode nicht — [Supabase Changelog](https://supabase.com/changelog/32755-supabase-connection-pooler-deprecating-session-mode-on-port-6543-on-february-28-2025), [Supavisor FAQ](https://supabase.com/docs/guides/troubleshooting/supavisor-faq-YyP5tI)

### Inferences
- **[Schätzung]** `preloadEntriesOnStart: false` plus ein schlankes `register()` dürften den Kaltstart einer einfachen Route (QR, Demo) deutlich senken, grob von 9–10 s auf 3–5 s. Der Rest verteilt sich auf Adapter- und Next-Init und den ersten DB-Handshake. Das muss gemessen werden. Admin-Routen bleiben beim ersten Aufruf langsamer, weil sie ihre Module dann selbst laden.
- **[Schätzung]** Der erste Postgres-Verbindungsaufbau Ohio → Frankfurt braucht TCP, TLS, SCRAM-Authentifizierung und die erste Abfrage, also mehrere Round-Trips von je ~90–110 ms, zusammen grob 0,5–1 s. Zwei Gegenmaßnahmen: die Verbindung schon während des Imports parallel anstoßen statt nacheinander, und für die öffentlichen Wege (QR, Demo) Antworten cachen bzw. statisch ausliefern (Netlify-CDN-Cache-Header, ISR), damit dort gar keine DB-Abfrage nötig ist.
- `transpilePackages: ['@wbm/core']` bündelt den ganzen Core in Server-Chunks. Ein Barrel-Import (`import … from '@wbm/core'`) in einer Route kann über Re-Exports viel mehr Code auswerten als nötig. Gezielte Subpfad-Exports (z. B. `@wbm/core/tracking`) verringern das.

### Gaps
- Keine veröffentlichte Messung zu `preloadEntriesOnStart` auf Netlify oder Lambda.
- Ob ein zur Build-Zeit erzeugter Node-Compile-Cache im Netlify-Paket bei Lambda greift (Pfad `/var/task` ist schreibgeschützt, Cache-Schlüssel), ist ungetestet und unbelegt.

## 5. Provisioned Concurrency, „Always warm“ oder Fluid-ähnliche Funktionen bei Netlify

### Takeaway
Für Next.js auf Netlify gibt es Stand November 2026 **keine** Funktion für Mindest-Instanzen oder warm gehaltene Instanzen. „Netlify Server“ (Early Access seit 10.11.2026, Credit-Tarife, im Early Access kostenlos) hält Instanzen 5 Minuten nach der letzten Anfrage am Leben und soll nach dem Early Access „a minimum number of instances running“ anbieten. Next.js läuft darauf aber **noch nicht**, und im Personal-Tarif ist es auf 1 Instanz begrenzt.

### Cited Findings
- „Full-stack frameworks such as Next.js, Astro and Nuxt don't run on Netlify Server yet.“ Verfügbar auf Credit-basierten Tarifen, im Early Access kostenlos. Nach GA wird nach „reserved memory (in GB-hours) and active CPU time (in vCPU-hours)“ abgerechnet. Personal und Free: maximal 1 Instanz, sonst 3. „An instance always scales to zero after 5 minutes without requests.“ Nach dem Early Access soll man Mindest-Instanzen festlegen können — [Netlify Changelog 10.11.2026](https://www.netlify.com/changelog/2026-11-10-netlify-server-early-access/)
- Lebenszyklus von Netlify Server: Die Instanz stoppt nach 5 Minuten ohne Anfragen. `setInterval` hält sie nicht am Leben. Bei einem Produktions-Deploy läuft der Server schon, bevor der Deploy live geht — [Netlify Docs: Server lifecycle](https://docs.netlify.com/build/server/lifecycle/)
- In der Netlify-Funktionen-Doku gibt es keine Option für Provisioned Concurrency oder Warmhalten — [Netlify Docs: Functions configuration](https://docs.netlify.com/build/functions/configuration/)
- Zum Vergleich (kein Netlify): AWS Provisioned Concurrency initialisiert Umgebungen vorab — [AWS Lambda Docs](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html). Vercel löst Kaltstarts mit „Fluid compute“ (scale to one) — [Vercel Blog: Scale to one](https://vercel.com/blog/scale-to-one-how-fluid-solves-cold-starts)

### Inferences
- Netlify Server könnte relevant werden, sobald Next.js dort unterstützt wird und Mindest-Instanzen verfügbar sind. Heute gilt das nicht für uns. Netlify Server ließe sich aber jetzt schon für eine kleine Express- oder Hono-App nutzen, z. B. für einen QR-Redirect-Dienst. Auch die skaliert nach 5 Minuten auf null, startet aber viel schneller, weil sie klein ist.

### Gaps
- Preis und Zeitpunkt für Mindest-Instanzen bei Netlify Server sind nicht bekannt. Ob Next.js unterstützt wird, ist ebenfalls offen.

## 6. AWS-Lambda-Fakten: Init-Abrechnung, 10-s-Grenze, SnapStart

### Takeaway
AWS rechnet seit 01.08.2025 die Init-Phase ab. Die Init-Phase darf höchstens 10 s dauern, sonst wird sie bei der ersten Anfrage mit dem Funktions-Timeout wiederholt. SnapStart gibt es für Node.js nur bei Container-Images (seit Sept. 2026), nicht für ZIP-Funktionen. Netlify erwähnt SnapStart nirgends. Weil der Netlify-Adapter Next erst in der ersten Anfrage startet, fällt der Großteil unseres Kaltstarts in die **Invoke**-Phase. Die 10-s-Init-Grenze trifft uns deshalb kaum, das 60-s-Funktions-Timeout bzw. die 20-s-Header-Grenze dagegen schon.

### Cited Findings
- „The Init phase is limited to 10 seconds. If all three tasks do not complete within 10 seconds, Lambda retries the Init phase at the time of the first function invocation with the configured function timeout.“ Zur Kaltstartzeit: „You are charged for this time“ — [AWS Lambda Docs](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)
- Init-Abrechnung ab 01.08.2025 für alle Konfigurationen, auch ZIP mit Managed Runtimes, zum gleichen Preis wie die Invoke-Phase — [AWS Compute Blog](https://aws.amazon.com/blogs/compute/aws-lambda-standardizes-billing-for-init-phase)
- SnapStart: Für ZIP-Funktionen werden Java 11+, Python 3.12+ und .NET 8+ unterstützt, Node.js nicht. Seit Sept. 2026 SnapStart für Container-Images, Node-Images über Label `com.amazonaws.lambda.feature.snapstart="Allow"` oder Runtime-Hooks — [AWS What's New 07/2026](https://aws.amazon.com/about-aws/whats-new/2026/07/aws-lambda-snapstart-container/), [InfoQ 09/2026](https://www.infoq.com/news/2026/09/lambda-snapstart-container-image/), [Classmethod: Next.js + SnapStart](https://dev.classmethod.jp/en/articles/nextjs-lambda-web-adapter-snapstart/)
- Netlify-Funktionen: synchrones Timeout 60 s (nicht konfigurierbar) — [Netlify Docs: Functions configuration](https://docs.netlify.com/build/functions/configuration/). Bei Netlify Server zählt die Startzeit zu den 20 s, in denen Header gesendet sein müssen — [Netlify Docs: Server lifecycle](https://docs.netlify.com/build/server/lifecycle/)

### Inferences
- Kosten: Ein Kaltstart von 10 s bei 1 GB entspricht ≈ 0,0028 GB-h ≈ 0,03 Credits (bei ~10 Credits/GB-h). Die Abrechnung ist also kein Grund zur Eile, Latenz und Conversion sind es. Ob Netlify die Init-Dauer getrennt in Credits abrechnet, ist nicht dokumentiert.
- Da Netlify SnapStart nicht anbietet, kommt SnapStart nur bei einem Wechsel zu eigenem AWS (Container plus Lambda Web Adapter) in Frage. Das ist außerhalb des Netlify-Rahmens.

### Gaps
- Keine Netlify-Aussage, ob ihre Lambdas SnapStart, Container-Images oder Provisioned Concurrency intern nutzen.

---

## Rangliste der Maßnahmen (Wirkung ÷ Aufwand) – Zusammenfassung für den Bericht

| # | Maßnahme | Erwartete Wirkung | Aufwand | Beleg |
|---|---|---|---|---|
| 1 | `experimental.preloadEntriesOnStart: false` in `next.config.ts` | hoch: verhindert, dass beim Start alle Routen-Module geladen werden **[Schätzung: mehrere Sekunden]** | 1 Zeile | Next-Quelltext und -Doku, Adapter läuft nicht im minimalMode |
| 2 | `register()` verschlanken: kein `import('@wbm/core')`, nur ein Mini-Modul für den Runner (oder Runner lazy beim ersten `after`) | hoch: `register` blockiert den ersten Request | klein | Next-Doku instrumentation |
| 3 | Schwere Pakete nur per `await import()` in den nutzenden Routen bzw. Funktionen; Subpfad-Exports statt Barrel aus `@wbm/core` | mittel–hoch | mittel | AWS-Doku, Netlify-Lifecycle-Empfehlung |
| 4 | QR-, Kurz-URL- und Demo-Wege aus dem großen Handler lösen: Middleware/Edge Function oder CDN-Cache/ISR für `/d/[slug]`, kleine eigene Funktion für `/q/` | sehr hoch für diese Wege (kein Next-Kaltstart mehr) | mittel | Edge-Limits-Doku; [Schätzung] |
| 5 | DB: Supavisor Transaction-Pooler (6543), Verbindung parallel zum Init aufbauen, öffentliche Seiten ohne DB-Abfrage ausliefern | 0,3–1 s **[Schätzung]** | klein–mittel | Supabase-Doku |
| 6 | `outputFileTracingExcludes` (`*.map`, playwright-core, pdfjs, `@swc/core`, doppelte Binaries), nur wenn zur Laufzeit im Web nicht gebraucht | gering–mittel (Download und Entpacken) | klein, Risiko „module not found“ | OpenNext-Doku, Adapter-PR #3145 |
| 7 | Tarif Pro: 2–4 GB / 1–2 vCPU und Region `fra` | mittel (CPU) plus DB-Latenz | Kosten | Netlify-Doku |
| – | Netlify Server mit Mindest-Instanzen | wäre ideal, für Next.js heute nicht verfügbar | – | Changelog 10.11.2026 |
| – | SnapStart, Provisioned Concurrency | bei Netlify nicht verfügbar | – | AWS- und Netlify-Doku |
