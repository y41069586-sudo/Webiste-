# Turning 58 mailed demo letters into first sales + fast low-budget channels (Germany, ~0 € budget, 1–4 weeks)

Context used from the repo (not web-sourced): operator sells Basis 597 € + 19 €/month, Care+ 597 € + 99 €/month, and (task #76) a "Komplett" plan 0 € setup + 179 €/month for 12 months, first payment 7 days after go-live. Letters go out via easyNova; last documented balances were ~15 € easyNova, 6 € AI, 5 € INWX (`docs/entscheidungen.md` line ~1282). Operator excludes cold calls, cold emails, door-to-door. Every 2nd letter costs real money (`docs/master-implementation-v4.md` line 942).

## 1. Follow-up letters/postcards: timing, content, cost, measured lift

### Takeaway
A second mailing to the same list is the single best-documented lever: practitioner data says it yields roughly 40–60 % of the first wave's response if spaced 3–4 weeks apart (much less if only ~10 days apart), and sequences with a real deadline can roughly double total response. In Germany, 58 single letters cannot use Dialogpost (minimums far above 58), so each follow-up costs at least 0,95 € postage (Standardbrief 2026) plus print/handling via the letter service; segment the follow-up to the leads who scanned/visited first.

### Cited Findings
- Standardbrief (bis 20 g) costs 0,95 € in 2026; 2026 letter/postcard prices unchanged vs. 2025 — [Wochenblatt-Reporter](https://www.wochenblatt-reporter.de/c-ratgeber/aktuelles-porto-brief-2025-was-mache-ich-mit-alten-briefmarken_a621746)
- Deutsche Post plans Standardbrief 1,15 € from 01.01.2027 (subject to Bundesnetzagentur approval) — [DHL Group Pressemitteilung](https://group.dhl.com/de/presse/pressemitteilungen/2026/deutsche-post-ag-passt-briefporto-und-produkte-zum-ersten-januar-2027-an.html); [Deutsche Handwerks Zeitung](https://www.deutsche-handwerks-zeitung.de/?p=385300). Implication: any follow-up mailing should go out in 2026.
- Dialogpost 2026 (net, plus VAT): Karte 0,36 €, Standard 0,38–0,42 €, Groß 0,54–1,11 €; only advertising content allowed — [Deutsche Post Dialogpost](https://www.deutschepost.de/de/p/print-mailing/dialogpost.html); [Dialogpost FAQ](https://www.deutschepost.de/de/p/print-mailing/dialogpost-faq.html)
- Dialogpost minimums: 5.000 nationwide / 200 per Leitregion; Dialogpost EASY for 500–4.999 pieces — [Deutsche Post Dialogpost FAQ](https://www.deutschepost.de/de/p/print-mailing/dialogpost-faq.html); [briefmarkenmesse-essen.de (Ratgeber)](https://www.briefmarkenmesse-essen.de/versenden/dialogpost/). So for 58 pieces Dialogpost is not available.
- Rule of thumb: re-mailing the same piece to the same list a few weeks later yields ~40–60 % of the original response — [Small Business Rainmaker](https://www.smallbusinessrainmaker.com/small-business-marketing-blog/bid/151928/does-your-marketing-strategy-include-this-direct-mail-technique)
- B2B test (MarketingSherpa, 2007): wave 1 = 1,90 % response, identical wave 2 three to four weeks later = 1,46 %; when the waves landed ~10 days apart, wave 2 fell to ~25–30 % of wave 1; advice: send wave 2 only to the best-performing segment — [MarketingSherpa blog](https://sherpablog.marketingsherpa.com/marketing/blog-30099/)
- Four-letter lead sequence example: 0,72 % / 0 % / 0 % / 1,8 % — author claims ~2,5× a single mailing; another variant 7,7 % then 3,3 %, 1,1 %, 2,0 % — [Small Business Rainmaker](https://www.smallbusinessrainmaker.com/small-business-marketing-blog/bid/151928/does-your-marketing-strategy-include-this-direct-mail-technique) (anecdotal, single author)
- Vendor case: a 2nd mail effort plus a deadline lifted conversion from 6,22 % to 14,93 % (+139,9 %); small sample, vendor source — [Century Direct case study](https://www.centurydirect.net/case-study-adding-a-2nd-direct-mail-effort/)
- Benchmarks: house-list response ~5,30 % vs. 0,90 % for saturation mailings (vendor 2026 table) — [Focus Digital](https://focus-digital.co/research/direct-mail-response-rates/) (vendor data, treat as indicative)

### Inferences
- With 58 letters, a 1–2 % order rate means 0–1 sale from wave 1; a follow-up wave is the cheapest way to add another ~0,5–1 expected sale. Mail it ~3–4 weeks after wave 1 delivery (the repo's planned "12 days after estimated delivery" for non-scanners is on the short side per MarketingSherpa's 10-day finding; 2–3 weeks is a reasonable compromise given cash pressure).
- Prioritise by signal: (a) scanned / visited demo but no purchase → personal "I improved your demo, here is what changed" letter (handwritten note or post-it style line on top increases perceived personal effort — common direct-mail practice, not separately sourced); (b) not scanned → short "online until {Datum}" deadline letter with large screenshot of their demo (deadline effect supported by Century Direct). If cash allows only ~10–20 letters, send only to (a) plus best-rated (b).
- Self-print and stamp option: if the operator prints at home and franks with Internetmarke at 0,95 €, the 58-piece follow-up costs ~55 € postage + paper/toner; via easyNova cost per piece is higher (exact easyNova price not found in docs — gap). Hand-addressed envelopes are cheap and stand out.
- Postkarte would avoid envelope cost but (inference) is likely 0,95 € as well in 2026 (letter and postcard prices unchanged and equal since 2025 per general reporting); a postcard shows the demo screenshot without opening — good for "non-scanners".
- "Free" framing: a forum discussion says offering a "free website" triggers suspicion of hidden catches; reframe as "already built, yours to take over, no risk" with concrete price — [yomotherboard thread summary](https://yomotherboard.com/?p=336690)

### Gaps
- No verified easyNova 2026 per-letter price found in repo docs or web (only balance numbers). Operator should read it from the easyNova account.
- No German-specific measured lift data for follow-up letters to small B2B businesses; all lift figures are US/UK practitioner or vendor anecdotes.
- Exact 2026 Postkarte price not explicitly confirmed by a primary Deutsche Post page in this research.

## 2. How "free website mockup / demo-first" sellers close deals and handle no reply

### Takeaway
Demo-first sellers send a live, working site (not a mockup) framed as a gift, then follow up on engagement signals (link clicked → personal contact) and quickly move on from non-responders; reported response is "much higher than generic pitches" but nobody publishes hard conversion numbers. In Germany the operator can only use the legal equivalent: follow-up letters to everyone, and personal phone/email only to those who contacted him first.

### Cited Findings
- Tactic: build a full functional static site in 30–60 min, send live link framed "I built this for you. Take a look", no strings attached; if yes, port to their hosting — [dev.to "Ugly Site Prospecting"](https://dev.to/ryancwynar/the-ugly-site-prospecting-strategy-building-free-redesigns-to-win-clients-39k)
- Same author: follow up by phone only if the recipient clicked the link (engagement-triggered follow-up), "Some convert, most don't. Move on." No conversion figures given — [dev.to](https://dev.to/ryancwynar/the-ugly-site-prospecting-strategy-building-free-redesigns-to-win-clients-39k)
- Best targets per that author: established businesses with solid Google reviews, family-owned — [dev.to](https://dev.to/ryancwynar/the-ugly-site-prospecting-strategy-building-free-redesigns-to-win-clients-39k)
- Forum advice: "free website" offers can make the sender seem untrustworthy because owners expect a catch; suggestion to frame as a low-risk monthly service instead — [yomotherboard (forum Q&A)](https://yomotherboard.com/?p=336690); [second thread](https://yomotherboard.com/?p=336682)
- Alternative opener cited by sales guides: an audit ("I found 5 issues costing you leads") converts better than "I build websites" — [Prospeo](https://prospeo.io/s/web-design-sales-pitch-example) (vendor blog)
- What local SMB clients reportedly want: a decent-looking site, someone local to talk to who makes updates/recommendations, and a good price — Indie Hackers founder post (FLX Websites), as summarised in search results; page itself returned 403 — [Indie Hackers](https://www.indiehackers.com/product/flx-websites/how-i-built-and-scaled-a-profitable-web-design-business-selling-to-local-regional-smbs--Nr3T_zPMbik2W5pTQLA)
- Productised versions of the same approach exist ("live demo sites for cold outreach, built in 48 h") — [PitchSites on Product Hunt](https://www.producthunt.com/p/pitchsites/pitchsites)

### Inferences
- Key German-legal adaptation: engagement-triggered follow-up = letter #3 ("I improved your demo") to scanners; the QR scan itself is not consent for calls/emails.
- "Local + reachable person" is a selling point: the follow-up letter should show the operator's face, mobile number and "ich komme gern vorbei, wenn Sie das möchten" (invitation for *them* to request a visit — then a visit is requested, not cold).
- The 0 € setup + monthly plan ("Komplett") directly addresses the "what's the catch / upfront risk" objection the forums describe.

### Gaps
- No published close-rate data for demo-first outreach; Reddit threads were not retrievable via search, Indie Hackers pages returned 403.

## 3. Using the businesses' own inbound channels legally (GBP, contact forms, directory forms, social posts)

### Takeaway
Most "their own inbound channel" tricks are either gone or legally risky: Google Business Profile chat was shut down in July 2024 and public Q&A was replaced in late 2025; contact forms, directory message forms and social DMs are electronic messages, so unsolicited advertising through them falls under the same § 7 UWG consent logic as email. Letters remain clearly allowed (B2B) unless the recipient objected.

### Cited Findings
- GBP chat/messaging: customers could no longer start new chats from 15.07.2024; feature removed 31.07.2024 — [Search Engine Roundtable](https://www.seroundtable.com/google-business-profile-call-history-deprecating-37465.html); [Google developers notice](https://developers.google.com/business-communications/business-messages/resources/release-notes/update-on-gbm?hl=de)
- GBP Q&A no longer visible; API shut down early November 2025; replaced by AI answers ("Ask Maps") from profile data, reviews and the linked website — [blckalpaca](https://blckalpaca.at/de/wissen/seo-geo/lokales-seo/gbp-qa-fragen-und-antworten-strategisch-nutzen); [BrightLocal](https://www.brightlocal.com/learn/google-business-profile-qa)
- Businesses can add WhatsApp/SMS as chat options in GBP (2025) — [onlinemarketing.de](https://onlinemarketing.de/technologie/google-business-profile-whatsapp-sms-integration). (Using those for an unsolicited sales pitch would still be electronic advertising.)
- IHK: letter advertising to businesses "ist grundsätzlich immer möglich" unless objection; objections must be kept on a block list. E-mail advertising B2B only with express consent (or narrow existing-customer privilege). Telephone B2B only with at least presumed consent based on concrete circumstances; "Branchenähnlichkeit" not enough; caller bears risk. § 7 covers "jede Art von Werbung" — [IHK Rhein-Neckar](https://www.ihk.de/rhein-neckar/recht/wettbewerbsrecht/lauterer-wettbewerb/werbung-was-ist-erlaubt-938948)
- Commentary on LG Köln case: contact via a contact form does not automatically permit later advertising emails; hidden privacy-policy hints are not enough — reported via [IT-Recht Kanzlei](https://www.it-recht-kanzlei.de/werbung-email-social-media-telefon-fax-was-ist-erlaubt.html) (exact Aktenzeichen not verified)

### Inferences
- Treat contact forms (business's own site — they mostly have none anyway — and directory forms like Das Örtliche/Gelbe Seiten/MyHammer messaging) and Facebook/Instagram DMs as e-mail-equivalent: no unsolicited sales messages. This is legal inference from § 7 Abs. 2 Nr. 2 UWG ("elektronische Post") and should be checked by a lawyer if the operator wants to use them.
- Permitted and useful: a genuine public comment like congratulations on a post is not prohibited per se, but a sales pitch in comments is likely advertising and reputationally bad; skip.
- What is legal and effective: make it easy for *them* to reach out (WhatsApp link, phone number, callback-request form on demo), then respond promptly. Once the business contacts the operator, replying with the offer is fine within the scope of their request.

### Gaps
- No German court ruling found specifically on unsolicited advertising via a business's website contact form or Facebook DM (widely treated as e-mail-equivalent in legal commentary; not verified here).

## 4. Low-cost alternative channels for quick first customers (Germany)

### Takeaway
The fastest zero-cost channels are warm ones: personal network (friends/family who know a Handwerker), referral partnerships with people who already serve small businesses (Steuerberater, printers, sign makers, Existenzgründer-Berater), and inbound listings (own Google Business Profile, Kleinanzeigen service ad). Expected time to first client with an existing contact list is 1–2 weeks vs. ≥1 month from scratch per one guide.

### Cited Findings
- With an existing contact list you can ask for referrals, a first client in 1–2 weeks is reasonable; starting from scratch, plan at least a month — [Elementor Blog (DE)](https://elementor.com/blog/de/wie-gruendet-man-ein-web-design-unternehmen/)
- Referral is called the strongest acquisition channel; mutual-referral pairs like Steuerberater ↔ Webdesigner cited — [selbststaendigkeit.de](https://selbststaendigkeit.de/marketing/kundengewinnung/kundenakquise/); [kostenlose-erechnung.de](https://kostenlose-erechnung.de/ratgeber/erste-kunden-gewinnen-freelancer/)
- Niching (e.g. one trade) makes early selling easier — [Elementor Blog (DE)](https://elementor.com/blog/de/wie-gruendet-man-ein-web-design-unternehmen/)
- Indie Hackers web-design founder: first client came from building a free site for a local youth sports team, which then promoted him on its channels/banners and generated referrals — Indie Hackers post (FLX Websites), via search summary — [Indie Hackers](https://www.indiehackers.com/product/flx-websites/how-i-built-and-scaled-a-profitable-web-design-business-selling-to-local-regional-smbs--Nr3T_zPMbik2W5pTQLA)
- Student playbook: ask every finished client for introductions — "business owners know other business owners" — [mctaba](https://mctaba.com/campus/building-websites-for-local-businesses)
- Kleinanzeigen: commercial providers may list; offering services is practically always commercial; must mark account as gewerblich and provide Impressum — [e-recht24](https://www.e-recht24.de/artikel/onlineauktionen/6830-ebay-kleinanzeigen.html); [selbststaendigkeit.de](https://selbststaendigkeit.de/gewerbe-anmelden/ebay-kleinanzeigen-gewerbe-anmelden/); [Händlerbund](https://ohn.haendlerbund.de/themen/marktplaetze/gewerbliche-verkaeufer-kleinanzeigen-kostenlose-anzeigen)
- Kleinanzeigen Pro account for businesses reportedly from 19,90 €/month (single low-reliability blog; verify) — [marszalstudio](https://marszalstudio.pl/de/ebay-kleinanzeigen-2026-gebuehren-betrug-verkaufstipps/)
- nebenan.de: business profiles appear to be paid (platform financed partly by paid local-business profiles; Trustpilot complaint about fees); exact terms not found — [bcn.group](https://bcn.group/en/brands/national/title/nebenande); [Trustpilot](https://uk.trustpilot.com/review/nebenan.de)
- Context: Bitkom/ZDH surveys report 95–97 % of Handwerk businesses (with ≥1 employee) already have a website — [Bitkom](https://www.bitkom.org/Presse/Presseinformation/Jeder-zweite-Handwerksbetrieb-setzt-digitale-Technologien-ein); [ZDH PDF 2022](https://www.zdh.de/fileadmin/Oeffentlich/Wirschaft_Energie_Umwelt/Themen/Digitalisierung/220701_BitkomZDHPresseinfo_Handwerk_final.pdf). The no-website pool is small and skewed to micro/solo businesses.

### Inferences
- Prioritised channel list (effort / cost):
  1. Personal network message (WhatsApp/Status/Instagram story to own contacts: "Ich baue Handwerkern ohne Website eine fertige Seite – kennt ihr jemanden?") — 1 h, 0 €. Messaging people you know privately is not cold B2B advertising to the business; the referred business then contacts you.
  2. Referral partners: Steuerberater, Druckereien/Copyshops, Schilder-/Werbetechnik, Existenzgründungsberater, Handwerkskammer-Gründungsberatung. Contact by letter or in person at their premises as a customer/visitor is a judgment call; safest is a short letter (allowed) or using one's own network. Offer a referral fee (e.g. 50–100 € per sale) — 2–4 h, cost only on success.
  3. Own Google Business Profile (Webdesign, Dortmund) + ask 3–5 friends/early contacts for honest reviews of real work — 2 h, 0 €; slow (weeks).
  4. Kleinanzeigen service ad "Website für Handwerker – fertig in 7 Tagen, ab 0 € Einrichtung" with demo examples, as gewerblich with Impressum — 1 h, 0 € (check if Pro account is mandatory/cost).
  5. Local Facebook groups (Dortmund Gründer, Unternehmer, Stadtteil groups): only where group rules allow promotions; post a case/demo, invite DMs — 1 h, 0 €.
  6. Volunteer/near-free site for a visible local organisation (Sportverein, Kita-Förderverein) with credit line — builds proof + referrals; 1–2 days effort, payback slow (>4 weeks).
  7. BNI/Unternehmerfrühstück/Handwerkskammer events: BNI membership costs money (not verified here) — consider guest visits only.
- Avoid paid ads and new letter batches until cash comes in; the 58 existing letters + targeted follow-up are the highest-leverage sunk asset.

### Gaps
- No verified data on BNI fees, Handwerkskammer Dortmund event calendar, or nebenan.de business-profile pricing.
- No German founder testimonials found on referral-partner success rates.

## 5. Retainer / recurring framing Handwerker accept

### Takeaway
The market anchor Handwerker know is website builders at roughly 9–45 €/month and agency builds from ~1.800 €; "pay monthly, no setup" lowers upfront risk (addresses "what's the catch") but critics warn about lock-in and ownership. Framing should stress: no upfront payment, everything done for them (they never touch tech), local contact person, cancel terms and ownership of domain clearly stated.

### Cited Findings
- Website builders from ~9 €/month; agency solutions from ~1.800 € — [streit-software (Handwerker-Website)](https://www.streit-software.de/wissen/handwerker-website)
- Builders ~10–45 €/month (2024 comparison); setup fees ~5–15 € — [trusted.de](https://trusted.de/website-kosten)
- Risks of pay-monthly websites for small businesses (lock-in, not owning the site) — [Redefine Web](https://redefineweb.com/blog/real-risks-pay-monthly-websites-small-businesses/)
- Website-subscription model marketed as "monthly instead of one-off" — [xictron](https://www.xictron.com/en/website-subscription/)
- Forum suggestion: frame the offer as a low-risk monthly service instead of "free website" — [yomotherboard](https://yomotherboard.com/?p=336690)
- Local SMB clients value a local person who makes updates — [Indie Hackers (FLX Websites)](https://www.indiehackers.com/product/flx-websites/how-i-built-and-scaled-a-profitable-web-design-business-selling-to-local-regional-smbs--Nr3T_zPMbik2W5pTQLA)

### Inferences
- For a cash-starved seller, the 597 € one-time plans bring cash faster, but the 0 € setup + monthly plan lowers the buyer's decision threshold. A time-limited "first 5 Dortmund businesses" option (e.g. reduced setup or first month free) is legitimate scarcity if true; it must not be a fake deadline (§ 5 UWG).
- Make ownership explicit ("Domain läuft auf Ihren Namen", "Sie können jederzeit mitnehmen") to neutralise lock-in fear.
- Frame monthly fee as "Ansprechpartner + Änderungen inklusive" rather than "Hosting".

### Gaps
- No German survey data on Handwerker acceptance of website subscriptions vs. one-off purchase.

## 6. What first-time founders report as their first-sale path

### Takeaway
Reported first sales come overwhelmingly from warm channels (word of mouth, own network, a visible volunteer project, Reddit/community presence), not from the first outbound batch; demo-first outbound helps but "most don't convert, move on".

### Cited Findings
- First client from a free site for a youth sports team → referrals — [Indie Hackers (FLX Websites)](https://www.indiehackers.com/product/flx-websites/how-i-built-and-scaled-a-profitable-web-design-business-selling-to-local-regional-smbs--Nr3T_zPMbik2W5pTQLA)
- Indie Hackers post title "My first 5 clients: 2 Reddit, 2 website visitors, 1 word of mouth" (content not retrievable, 403) — [Indie Hackers](https://www.indiehackers.com/post/my-first-5-clients-2-reddit-2-website-visitors-1-word-of-mouth-c1ada8d4c0)
- Demo-first outreach: "Some convert, most don't. Move on." — [dev.to](https://dev.to/ryancwynar/the-ugly-site-prospecting-strategy-building-free-redesigns-to-win-clients-39k)
- First client in 1–2 weeks realistic only with an existing contact list — [Elementor Blog (DE)](https://elementor.com/blog/de/wie-gruendet-man-ein-web-design-unternehmen/)

### Inferences
- Prioritised action plan:
  - **This week (0–30 €, ~8–10 h):** (1) Pull scan/visit data for the 58 leads; list every scanner. (2) Check inbound: WhatsApp, voicemail, demo form, Kein-Interesse clicks; answer anyone who reached out within hours, offer a short call or visit (allowed: they initiated). (3) Personal-network broadcast + ask 10 friends/family for intros to Handwerker without websites. (4) Set up own Google Business Profile and Kleinanzeigen service ad. (5) Prepare follow-up letter "Ich habe Ihre Seite überarbeitet" for scanners (improve each demo for real) and a deadline postcard/letter for non-scanners.
  - **Week 2 (~30–60 € postage):** mail follow-up to scanners first (all), plus top-scored non-scanners as budget allows; ensure demos stay online at least until the stated date. Send 3–5 letters to referral partners (Steuerberater/Druckerei/Werbetechnik in Dortmund) offering a referral fee.
  - **Week 3:** Second-chance for non-scanners only if cash allows; post one demo case in a Dortmund Facebook business group (if rules permit); follow up warm intros personally.
- Expected yield (inference from cited response rates): 58 letters × ~1–2 % → 0–1 sale from wave 1; follow-up adds ~40–60 % of wave-1 response; warm network is the likelier source of a sale within 2 weeks.

### Gaps
- Reddit threads (r/webdev, r/Entrepreneur, r/freelance) and German Gründer forums were not retrievable through the search tool in this session; no first-hand German founder reports found.
