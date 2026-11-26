# Technik: Bauoptionen für einen deutschsprachigen KI-Telefonassistenten (Stand Ende Nov. 2026)

Hinweis zur Quellenlage: Viele Preisangaben im Netz stammen von Wettbewerbern (Telnyx, Retell, Synthflow, Zeeg, CloudTalk) oder SEO-Seiten und widersprechen sich. Wo möglich wurden die offiziellen Preisseiten direkt abgerufen (26.11.2026). Alle Dollarbeträge sind USD, netto. Rechnungen in "Inferences" sind **Schätzungen**.

## Frage 1: Gehostete Voice-Agent-Plattformen (Vapi, Retell, ElevenLabs, Bland, Synthflow, Twilio ConversationRelay)

### Takeaway
Retell und ElevenLabs Agents sind die preislich transparentesten All-in-Optionen (ca. 0,08–0,17 $/Min. inkl. LLM, Telefonie je nach Wahl), beide unterstützen Claude direkt oder als Custom LLM, Webhook-Tools und Weiterleitung. Echte EU-Datenhaltung gibt es nur als Enterprise-/Premium-Option (ElevenLabs Enterprise, Vapi Premier); Retell betreibt laut eigener Aussage keine EU-Infrastruktur.

### Cited Findings

**Retell AI (offizielle Preisseite, abgerufen 26.11.2026)**
- Voice Infra 0,055 $/Min.; Telefonie über Twilio/Telnyx ca. 0,015 $/Min. (länderabhängig); SIP-Trunking/eigene Telefonie ohne Retell-Gebühr; Abrechnung sekundengenau, nicht verbundene Anrufe kostenlos; nach Weiterleitung endet die KI-Gebühr, Telefonie läuft weiter — [Retell Pricing](https://www.retellai.com/pricing)
- LLM-Preise pro Minute laut Retell: Claude 5.5 Haiku 0,0032 $, Claude 4.5 Haiku 0,025 $, Claude 5.5 Sonnet 0,064 $ (von Retell "recommended"), Claude 5.5 Opus 0,128 $; GPT 6.1 Terra 0,032 $; Gemini 3.5 Flash Lite 0,0096 $; eigenes "Custom LLM" ohne Preisangabe — [Retell Pricing](https://www.retellai.com/pricing)
- TTS pro Minute: Retell-/Minimax-/Fish-/Cartesia-/OpenAI-/Inworld-Stimmen 0,015 $; ElevenLabs Flash 0,040 $; ElevenLabs Multilingual v2 0,06 $; ElevenLabs v3/v4 0,10 $ — [Retell Pricing](https://www.retellai.com/pricing)
- Speech-to-Speech: GPT Realtime 0,345 $/Min., GPT Realtime 2/2.1 0,38 $/Min., GPT Realtime mini 0,07 $/Min. — [Retell Pricing](https://www.retellai.com/pricing)
- Add-ons: Knowledge Base +0,005 $/Min., Denoising +0,005 $/Min., PII-Entfernung +0,01 $/Min., SMS 0,01 $/Nachricht (Retell SMS 20 $/Monat); Retell-Nummer 2 $/Monat (eigene Nummern kostenlos); 20 parallele Anrufe frei, danach 8 $/Kanal/Monat; 10 $ Startguthaben; Prompts über durchschnittlich 4.000 Token verlängern die abgerechnete Zeit proportional — [Retell Pricing](https://www.retellai.com/pricing)
- Custom LLM: Retell übernimmt Telefonie, Transkription, Turn-Taking und Sprachsynthese; pro Anruf öffnet Retell einen WebSocket zu `llm_websocket_url`, der eigene Server streamt Antworten zurück; `end_call`, `transfer_call`, `press_digit` können aus der Antwort ausgelöst werden; Latenz, Verfügbarkeit und Reconnect liegen dann beim Betreiber — [Retell Docs: Custom LLM](https://docs.retellai.com/integrate-llm/overview)
- EU: Retell gibt an, die Hauptinfrastruktur liege in den USA und es würden derzeit keine Dienste in der EU betrieben; DPA und EU-Standardvertragsklauseln verfügbar — [Retell Glossar Data Residency](https://www.retellai.com/de/glossary/data-residency); Community-Thread: SCCs erfüllen keine physische EU-Residenzpflicht (z. B. NIS2) — [Retell Community](https://community.retellai.com/t/retell-nis2-is-full-eu-data-residency-actually-possible/2541)
- Herstellerangabe: Retell nennt 580–640 ms Latenz in eigenen 200 Testanrufen (nicht unabhängig, nicht Deutsch) — [Retell Blog (DE)](https://www.retellai.com/de/blog/best-ai-voice-agents-phone-support-automation)

**ElevenLabs Agents (ElevenAgents, offizielle Preisseite, abgerufen 26.11.2026; Black-Friday-Aktion lief)**
- Pläne: Free 0 $ (15 Min.), Starter 6 $ (75 Min.), Creator 22 $ (275 Min.), Pro 99 $ (1.238 Min.), Scale 299 $ (3.738 Min.), Business 990 $ (12.375 Min.); Zusatzminute 0,08 $; Burst (bis 3× Concurrency) 0,16 $/Min.; SMS 0,010 $ — [ElevenLabs Agents Pricing](https://elevenlabs.io/pricing/agents)
- LLM-Kosten werden getrennt pro Token zum Anbieterpreis durchgereicht (Input/Output/Cache getrennt); bestimmte Claude-/Gemini-Modelle werden zu Vertex-AI-Regionalpreisen abgerechnet (+10 %) — [ElevenLabs Docs LLM](https://elevenlabs.io/docs/agents-platform/customization/llm)
- Telefonie: keine ElevenLabs-Gebühr, Abrechnung zu Kosten; bei eigenem Anbieter (Twilio, SIP-Trunk) rechnet dieser direkt ab — [ElevenLabs Agents Pricing](https://elevenlabs.io/pricing/agents)
- Unterstützte Claude-Modelle (eingebaut): Opus 5.5/5/4.8/4.7/4.6, Sonnet 5.5/5/4.6/4.5, Haiku 4.5 (Haiku 5.5 nicht gelistet); Custom LLM über eigenen Endpunkt mit hinterlegten Credentials; Empfehlung: niedriges Thinking-Budget für Turn-Taking — [ElevenLabs Docs LLM](https://elevenlabs.io/docs/agents-platform/customization/llm)
- Tool-Typen: Client Tools, Webhook Tools, Code Tools (sandboxed JS), MCP Tools, System Tools — [ElevenLabs Docs Tools](https://elevenlabs.io/docs/agents-platform/customization/tools)
- EU-Datenresidenz: Enterprise-Feature, isolierte Umgebung unter `eu.residency.elevenlabs.io`; Zero Retention Mode separat zuschaltbar; Verarbeitung nur in der EU bei EU-Residenz + Zero Retention — [ElevenLabs Docs Data Residency](https://elevenlabs.io/docs/overview/administration/data-residency); mit EU-Residenz sind einige ältere Claude-/Gemini-Modelle nicht verfügbar, Custom LLMs bleiben verfügbar — [ElevenLabs Docs (via Suche)](https://elevenlabs.io/docs/agents-platform/customization/llm)

**Vapi (offizielle Preisseite, abgerufen 26.11.2026)**
- Plattformgebühr 0,05 $/Min. (prepaid, ohne Success Package); Core 29 $/Monat (10 parallele Anrufe, ZDR inklusive); Pro 10 % der Hosting-Gebühr, mind. 999 $/Monat; Premier individuell; HIPAA 2.000 $/Monat; Zusatz-Concurrency 10 $/Kanal/Monat — [Vapi Pricing](https://vapi.ai/pricing)
- STT/LLM/TTS werden "at cost, no markup" durchgereicht; Beispiel-Spannen: Deepgram 0,0095–0,0099 $/Min., OpenAI-LLM 0,0077–0,0452 $/Min., ElevenLabs-Stimme 0,0146–0,0238 $/Min.; Twilio inbound 0,008 $/Min., Telnyx 0,0055 $/Min., Vapi-SIP kostenlos; Beispiel 1.000 Min.: 82–129 $/Monat gesamt — [Vapi Pricing](https://vapi.ai/pricing)
- EU-Region (eigenes Dashboard, `api.eu.vapi.ai`, `sip.eu.vapi.ai`) nur mit Premier Success Package über Vertrieb — [Vapi Docs EU Region](https://docs.vapi.ai/security-and-privacy/eu-region); Support-Antwort: EU-Dashboard auf AWS Frankfurt, volle EU-Residenz erfordert eigene Provider-Keys — [Vapi Support](https://support.vapi.ai/t/23149730/is-there-a-possibility-to-keep-all-vapis-traffic-in-europe)
- Claude: nativer Provider `anthropic` (Doku listet u. a. claude-sonnet-4-6, claude-haiku-4-5) — [Vapi Docs Anthropic](https://docs.vapi.ai/providers/model/anthropic.md); Custom LLM als OpenAI-kompatibler Endpunkt (Vapi hängt `/chat/completions` an); Tool-Aufrufe gehen an die beim Tool hinterlegte Server-URL — [Vapi Docs Custom LLM](https://docs.vapi.ai/assistants/custom-llm), [Vapi Tool Calling](https://docs.vapi.ai/customization/tool-calling-integration); Forenberichte über stillschweigend fehlschlagende Transfers mit Custom LLM (nicht offiziell) — [Vapi Support](https://support.vapi.ai/t/23152458/how-to-implement-transfer-call-with-custom-llm)

**Bland AI**
- Laut Drittquelle (Prüfung 09.11.2026): Start 0,14 $/Min. (kostenlos), Build 0,12 $/Min. + 299 $/Monat Plattformgebühr; Telefonie separat; ältere Guides nennen niedrigere Tarife (veraltet) — [Stork via Suche](https://www.stork.ai/blog/de/bland-ai-alternatives-2026), [Zeeg](https://zeeg.me/en/blog/post/bland-ai-pricing). Offizielle Seite nicht direkt geprüft.

**Synthflow**
- Ältere Drittangabe: Voice Engine 0,09 $/Min. + LLM 0,02–0,04 $ + Telefonie 0–0,02 $ — [CloudTalk (Juli 2026)](https://www.cloudtalk.io/blog/synthflow-pricing/); laut Stork (Nov. 2026) inzwischen nur noch Enterprise — [Stork via Suche](https://www.stork.ai/blog/de/bland-ai-alternatives-2026); Synthflow nennt EU- und US-Datenresidenz — [Synthflow vs Bland](https://synthflow.ai/alternatives/synthflow-vs-bland-ai). Widersprüchlich, nicht offiziell verifiziert.

**Twilio ConversationRelay (halb-gehostet: Twilio macht STT/TTS/Turn-Taking, eigener Server liefert Text über WebSocket)**
- 0,07 $/Min., Sprachminuten separat; Sprache per `language`-Attribut, Deutsch unterstützt — [Twilio Conversational AI Pricing](https://twilio.com/en-us/products/conversational-ai/pricing), [Twilio Docs ConversationRelay](https://twilio.com/docs/voice/twiml/connect/conversationrelay)
- Abgehend DE-Festnetz 0,0283 $/Min., DE-Mobil 0,3763 $/Min. (relevant für Weiterleitung an Handy des Handwerkers) — [Twilio Voice Pricing DE](https://www.twilio.com/en-us/voice/pricing/de)

**Deutsche Rufnummern (gilt für alle, die Twilio-Nummern nutzen)**
- Twilio-Ortsnummern in DE benötigen eine Anschrift im Ortsnetz der Vorwahl (keine Postfächer), Nachweis per Handelsregisterauszug oder Gewerbeanmeldung; Regulatory-Bundle-Prüfung bis 3 Werktage, teils Wochen — [Twilio DE Regulatory](https://www.twilio.com/en-us/guidelines/de/regulatory), [Close Help](https://help.close.com/docs/german-regulatory-documents)

**Marktkontext DE (Endkundenpreise fertiger Produkte)**
- KI-Telefonservices für Handwerker liegen laut einem Vergleich bei ca. 49–150 €/Monat — [CloudTalk DE](https://www.cloudtalk.io/de/blog/bester-ki-telefonservice-fuer-handwerker/); deutsche Anbieter wie fonio.ai, Callioo, Agentino, Famulor (ab 49 €/Monat) — [OMR](https://omr.com/de/reviews/category/ai-call-assistant), [Famulor](https://www.famulor.io/de/ki-telefonassistent-vergleich)

### Inferences
- Für ein MVP ohne EU-Residenz-Pflicht sind Retell (feinste Preis-Granularität, Claude 5.5 Haiku für 0,0032 $/Min.) und ElevenLabs Agents (beste Stimmen aus einer Hand, Pakete) die naheliegenden Kandidaten. Vapi ist flexibel, aber EU-Hosting erst im Premier-Paket, und Custom-LLM-Transfers wirken fehleranfällig.
- Weiterleitung an das Handy des Handwerkers kostet bei Twilio-Telefonie spürbar (0,38 $/Min. zu DE-Mobil); eine deutsche SIP-Telefonie (z. B. Weiterleitung über den bestehenden Anbieter des Betriebs) dürfte günstiger sein — nicht verifiziert.
- Die wahrscheinlich einfachste Anbindung der Nummer: Der Handwerker behält seine Nummer und richtet eine bedingte Rufumleitung (bei Besetzt/Nichtmelden) auf eine Plattform-Nummer ein; das umgeht teilweise die Ortsnetz-Adressnachweise, wenn eine Nummer im eigenen Ortsnetz des Betreibers (Dortmund) genutzt wird. Rechtliche Zulässigkeit, eine Nummer für viele Kunden zu nutzen, ist zu prüfen.

### Gaps
- Keine unabhängige, deutschsprachige Latenz- oder Qualitätsmessung der Plattformen gefunden; alle Latenzangaben sind Herstellerangaben oder englisch.
- Bland- und Synthflow-Preise nicht auf offiziellen Seiten geprüft; Synthflow-Self-Serve-Status unklar.
- Twilio-Preis für deutsche Ortsnummern (Monatsgebühr, eingehende Minute) nicht abgerufen; Vapis "Twilio inbound 0,008 $/Min." bezieht sich vermutlich auf US-Nummern.
- SMS-Versand an deutsche Handynummern (Preise, Absenderkennung) bei Retell/ElevenLabs nicht geprüft; Post-Call-Webhooks bei Retell/ElevenLabs nicht direkt in der Doku verifiziert (allgemein bekannt, aber hier nicht belegt).

## Frage 2: Selbstbau (Pipecat, LiveKit Agents, Twilio Media Streams/ConversationRelay, OpenAI Realtime, STT/TTS für Deutsch)

### Takeaway
Selbstbau senkt die variablen Kosten auf grob 0,02–0,06 $/Min. (Schätzung), verlagert aber Turn-Taking, Unterbrechungen, Latenz-Tuning und Ausfallsicherheit auf eine Ein-Personen-Firma; selbst erfahrene Entwickler berichten von 2,3 s p50 nach Wochen Tuning. Für ein MVP nicht empfehlenswert; als spätere Kostenoptimierung möglich.

### Cited Findings
- Deepgram Flux Multilingual (Streaming, inkl. Deutsch) 0,0078 $/Min. Pay-as-you-go, 0,0068 $ Growth; Nova-3 Multilingual 0,0058 $/0,0050 $; Streaming-Preise als befristete Aktion bezeichnet — [Deepgram Pricing](https://deepgram.com/pricing), [usagepricing.com](https://usagepricing.com/blueprint/deepgram); Deutsch in `flux-general-multi` — [developersdigest](https://www.developersdigest.tech/models/speech/deepgram)
- Ein Entwickler betreibt einen deutschen Agenten produktiv mit LiveKit Agents + Azure STT + gpt-4.1-mini + Cartesia TTS; die Frage nach dem schnellsten deutschen Stack blieb unbeantwortet — [LiveKit Community](https://community.livekit.io/t/lowest-latency-stt-tts-llm-stack-for-german-whats-your-experience/541)
- Ein LiveKit-Nutzer berichtet von 2,3 s p50-Latenz nach wochenlangem Tuning einer klassischen STT→LLM→TTS-Kette — [LiveKit Community](https://community.livekit.io/t/stuck-at-2-3s-p50-after-weeks-of-tuning-is-the-livekit-io-homepage-demo-a-classic-chain-or-realtime-speech/851)
- Drittbenchmark (englisch): Pipecat + Claude + Cartesia P50 410 ms, P95 540 ms — [DEV Community](https://dev.to/kenimo49/i-benchmarked-5-voice-ai-stacks-only-2-stayed-under-300ms-2bka); Spanisch mit Deepgram + GPT-4.1-mini + Cartesia ähnlich schnell wie Englisch — [DEV Community CloudX](https://dev.to/cloudx/cracking-the-1-second-voice-loop-what-we-learned-after-30-stack-benchmarks-427)
- LiveKit Cloud: Pläne Build/Ship/Scale/Enterprise, Agent-Sessions sekundengenau mit 10 s Minimum; Inference separat — [LiveKit Docs Billing](https://docs.livekit.io/deploy/admin/billing/), [LiveKit Pricing](https://livekit.com/pricing); Drittschätzung ca. 0,01 $/Min. Session + 0,03–0,07 $/Min. Inference (sekundär, evtl. veraltet) — [usagepricing.com](https://usagepricing.com/blueprint/livekit)
- Pipecat lässt sich mit Deepgram für STT und TTS kombinieren — [Deepgram Docs Pipecat](https://developers.deepgram.com/docs/pipecat-integration)
- OpenAI-Realtime (Speech-to-Speech) kostet über Retell 0,345–0,38 $/Min., Realtime mini 0,07 $/Min. — [Retell Pricing](https://www.retellai.com/pricing)
- TTS-Qualität allgemein (meist englisch, Quelle ist Wettbewerber): Artificial-Analysis-Board Sept. 2026: Cartesia Sonic 3.6 Platz 1 (1.282 Elo), Inworld TTS-2 Platz 2, ElevenLabs v3 Conversational Platz 8, Azure HD 2.5 Platz 12 (Mai 2026) — [Gradium](https://gradium.ai/content/best-elevenlabs-alternatives-2026-tts-apis-voice-quality-price); Entwicklerblog: ElevenLabs-Deutsch gut, aber gelegentlich anglisierte Aussprache; Google TTS gut bei Deutsch — [DEV Community](https://dev.to/raxxostudios/elevenlabs-vs-other-ai-voice-tools-an-honest-comparison-aga)
- Für Latenzanalyse wird Instrumentierung pro Stufe empfohlen — [Hugging Face Latency Playbook](https://huggingface.co/blog/dvalle08/voice-agent-latency-playbook)

### Inferences
- Pipecat ist ein Python-Framework; der bestehende Worker ist Node/TypeScript. Selbstbau hieße realistisch einen zusätzlichen Python-Container (oder LiveKit Agents, das nach meinem Kenntnisstand auch ein Node-SDK hat — nicht in dieser Recherche belegt).
- Ein kleiner VPS kann Orchestrierung (WebSockets, Pipecat/LiveKit-Agent-Prozesse) für einige parallele Anrufe tragen, wenn STT/TTS/LLM als APIs laufen; lokale Modelle (Whisper, lokale TTS) sind auf einem kleinen VPS ohne GPU für Echtzeit nicht realistisch (Einschätzung, nicht gemessen).
- Twilio ConversationRelay ist der Mittelweg: Twilio übernimmt Audio/STT/TTS/Unterbrechungen, der Node-Worker liefert nur Text per WebSocket mit Claude — passt am besten zum TypeScript-Stack, kostet aber 0,07 $/Min. plus Telefonie plus LLM.
- Schätzung Selbstbau variable Kosten: Deepgram ~0,008 $ + Claude Haiku 5.5 ~0,003 $ + TTS ~0,015–0,04 $ + Telefonie ~0,01–0,02 $ ≈ 0,035–0,07 $/Min. — also nur etwa halb so viel wie Retell/ElevenLabs, bei deutlich mehr Eigenaufwand.

### Gaps
- Keine Messwerte zu deutscher STT-Genauigkeit (Dialekte, Ruhrdeutsch, Baustellenlärm, Fachbegriffe) für Deepgram vs. Azure vs. Google gefunden.
- LiveKit-Cloud-EU-Region und genaue Plan-Preise nicht verifiziert.
- Cartesia/ElevenLabs/Azure-Direktpreise für deutsche Stimmen nicht abgerufen.

## Frage 3: Claude (Anthropic API) als "Gehirn"

### Takeaway
Claude ist auf allen großen Plattformen nutzbar: nativ bei Retell (Claude 5.5 Haiku/Sonnet), ElevenLabs (Sonnet 5.5, Haiku 4.5 u. a.) und Vapi (Provider `anthropic`), sonst als Custom LLM. Claude Haiku 5.5 kostet nur 0,10 $/0,50 $ pro Mio. Token; Latenz hängt vor allem davon ab, Thinking niedrig zu halten.

### Cited Findings
- Claude Haiku 5.5 (`claude-haiku-5-5`): 0,10 $ Input / 0,50 $ Output pro Mio. Token (bis 100K-Prompt), 1M Kontext; Claude Sonnet 5.5 (`claude-sonnet-5-5`): 2 $/10 $, Cache-Reads 0,10 $; Claude Haiku 4.5: 1 $/5 $ — [Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing) (Stand laut Anthropic-SDK-Referenz, zwischengespeichert 03.11.2026)
- Haiku 5.5: Thinking adaptiv und standardmäßig an, Standard-Effort `medium`; `thinking: disabled` nur bei Effort `high` oder niedriger möglich — [Anthropic Docs](https://platform.claude.com/docs/en/about-claude/models/overview) (laut Anthropic-SDK-Referenz)
- Prompt-Caching: Mindestlänge des cachebaren Präfixes für Haiku 5.5/Sonnet 5.5 512 Token; Cache-Reads ca. 0,1× Inputpreis, Cache-Writes ca. 1,25×; Standard-TTL 5 Min., optional 1 h — [Anthropic Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) (laut Anthropic-SDK-Referenz)
- Anthropic-Erstanbieter-API: `inference_geo` standardmäßig `global`, wahlweise `us` (1,1× Preis); eine EU-Option ist dort nicht aufgeführt — [Anthropic Data Residency](https://platform.claude.com/docs/en/build-with-claude/data-residency) (laut Anthropic-SDK-Referenz)
- Retell-Minutenpreis für Claude 5.5 Haiku: 0,0032 $/Min., Claude 5.5 Sonnet 0,064 $/Min. — [Retell Pricing](https://www.retellai.com/pricing)
- ElevenLabs rechnet Claude per Token zum Anbieterpreis ab, teils zu Vertex-Regionalpreisen (+10 %); empfiehlt niedriges Thinking-Budget für Turn-Taking — [ElevenLabs Docs LLM](https://elevenlabs.io/docs/agents-platform/customization/llm)
- Pipecat + Claude + Cartesia P50 410 ms (englisch, Drittbenchmark) — [DEV Community](https://dev.to/kenimo49/i-benchmarked-5-voice-ai-stacks-only-2-stayed-under-300ms-2bka)

### Inferences
- Plausibilitätscheck (Schätzung): ~6 Turns/Min. × ~3.000 Token Kontext ≈ 18.000 Input-Token/Min. → ca. 0,002 $/Min. mit Haiku 5.5 ohne Caching; passt zu Retells 0,0032 $/Min. LLM-Kosten sind bei Haiku praktisch vernachlässigbar; Sonnet 5.5 ist ~20× teurer, für ein Annahme-Skript (Name, Anliegen, Adresse, Dringlichkeit, Rückruf) vermutlich unnötig.
- Für Sprachagenten Thinking aus (oder Effort `low`) setzen, System-Prompt + Tool-Definitionen stabil halten (≥ 512 Token → cachebar) — das senkt TTFT und Kosten. Das Projekt nutzt `claude-haiku-5-5` bereits als `MODEL_BULK`.
- Wer EU-Verarbeitung für das LLM braucht, muss Claude über einen Cloud-Anbieter mit EU-Region (Bedrock/Vertex) beziehen oder auf ElevenLabs-EU-Residenz mit Custom LLM setzen; ob Haiku 5.5 dort in EU-Regionen verfügbar ist, wurde nicht geprüft.

### Gaps
- Keine gemessene Time-to-first-token für Claude Haiku 5.5 auf Deutsch gefunden; eigene Messung nötig.
- Verfügbarkeit von Claude Haiku 5.5 auf Bedrock/Vertex in EU-Regionen (Frankfurt) nicht verifiziert.
- Ob ElevenLabs Haiku 5.5 inzwischen eingebaut anbietet (Liste nannte nur Haiku 4.5), unklar.

## Frage 4: Minimal-Architektur für eine Ein-Personen-Firma und Kosten pro Kunde (100 / 300 Minuten)

### Takeaway
Für das MVP mit dem wenigsten Code: gehostete Plattform (Retell oder ElevenLabs Agents) mit Claude Haiku 5.5 bzw. Sonnet, eine Webhook-Tool-Route im bestehenden Next.js/Worker-Backend (Anrufnotiz speichern, Resend-Mail an den Handwerker), Rufumleitung des Betriebs auf eine Plattform-Nummer. Variable Kosten geschätzt ca. 8–18 $ bei 100 Min. und 25–52 $ bei 300 Min. pro Kunde und Monat, plus Nummer.

### Cited Findings
- Retell: 0,055 $ Infra + 0,015 $ TTS (bzw. 0,04 $ ElevenLabs Flash) + 0,0032 $ (Claude 5.5 Haiku) bzw. 0,064 $ (Claude 5.5 Sonnet) + 0,015 $ Telefonie (0 $ bei eigenem SIP); Nummer 2 $/Monat — [Retell Pricing](https://www.retellai.com/pricing)
- ElevenLabs: 0,08 $/Min. (Pro 99 $ für 1.238 Min.) + LLM per Token + Telefonie zu Kosten — [ElevenLabs Agents Pricing](https://elevenlabs.io/pricing/agents)
- Vapi: Beispiel 1.000 Min. = 82–129 $ (also 0,08–0,13 $/Min.) — [Vapi Pricing](https://vapi.ai/pricing)
- Twilio ConversationRelay 0,07 $/Min. + Voice-Kosten — [Twilio Pricing](https://twilio.com/en-us/products/conversational-ai/pricing)

### Inferences (alle Kosten sind Schätzungen, USD, ohne MwSt., ohne Weiterleitungs-Minuten)

| Variante | $/Min. (Schätzung) | 100 Min./Kunde | 300 Min./Kunde |
|---|---|---|---|
| Retell + Claude 5.5 Haiku + Retell-Stimme + Retell-Telefonie | 0,055+0,015+0,0032+0,015 ≈ 0,088 | ≈ 9 $ + 2 $ Nummer | ≈ 27 $ + 2 $ |
| Retell + Claude 5.5 Sonnet + ElevenLabs Flash + Telefonie | ≈ 0,174 | ≈ 17 $ + 2 $ | ≈ 52 $ + 2 $ |
| ElevenLabs Agents (Pro/Scale-Kontingent) + Haiku + Twilio | ≈ 0,08 + ~0,003 + Telefonie ~0,01–0,02 ≈ 0,095–0,10 | ≈ 10 $ | ≈ 30 $ |
| Vapi (Build) laut Vapi-Rechner | 0,08–0,13 | 8–13 $ | 25–39 $ |
| Twilio ConversationRelay + Claude Haiku (eigener Node-Server) | 0,07 + ~0,003 + Telefonie ≈ 0,08–0,09 | ≈ 8–9 $ | ≈ 24–27 $ |
| Selbstbau (Pipecat/LiveKit + Deepgram + Haiku + Cartesia) | ≈ 0,035–0,07 | ≈ 4–7 $ + VPS-Anteil | ≈ 11–21 $ + VPS-Anteil |

- Empfohlener MVP-Ablauf (Einschätzung): (1) Retell oder ElevenLabs-Agent pro Kunde aus Vorlage per API anlegen (Firmenname, Leistungen, Öffnungszeiten als Variablen); (2) Kundennummer: bedingte Rufumleitung auf eine Plattform-/SIP-Nummer; (3) ein Webhook-Tool `anfrage_speichern` (Name, Rückrufnummer, Anliegen, Adresse, Dringlichkeit) → Next.js-API-Route/Worker schreibt in Postgres und schickt per Resend eine Zusammenfassung an den Handwerker; (4) Notfall: `transfer_call` an Handynummer nur wenn konfiguriert; (5) Post-Call-Webhook für Transkript/Dauer → Budget-Ledger (passt zum bestehenden Kosten-Ledger-Prinzip); (6) Provider-Interface `VoiceAgentProvider`, damit später Wechsel auf Selbstbau möglich ist.
- Wahl zwischen Retell und ElevenLabs: Retell ist pro Minute günstiger und bietet Claude 5.5 Haiku direkt; ElevenLabs bietet die Option auf EU-Residenz (Enterprise) und hochwertige Stimmen ohne Aufpreis. Wenn DSGVO-Argument "Daten bleiben in der EU" im Vertrieb wichtig ist, ist keine der günstigen Self-Serve-Stufen ausreichend.
- Bei 49–150 €/Monat Marktpreis und ca. 10–30 $ variablen Kosten bei 100–300 Min. bleibt rechnerisch Marge; Weiterleitungen an Mobilnummern (bei Twilio 0,38 $/Min.) können sie jedoch deutlich schmälern.

### Gaps
- Keine Belege, wie viele Minuten ein typischer Handwerksbetrieb monatlich über einen KI-Assistenten abwickelt (100/300 sind Annahmen des Auftrags).
- Unklar, ob Retell/ElevenLabs deutsche Ortsnummern selbst bereitstellen; vermutlich ist BYO-Telefonie (Twilio-DE-Nummer mit Adressnachweis oder deutscher SIP-Anbieter) nötig — nicht verifiziert.
- Keine Prüfung von AVV/DPA-Inhalten, Aufzeichnungs-/Einwilligungspflichten (§ 201 StGB, Ansage zu KI und Aufzeichnung) — außerhalb dieses Technik-Scopes, aber für den Betrieb zwingend.
