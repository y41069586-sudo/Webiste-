# Practitioner reports and small case studies: when does the FIRST QR scan / response arrive after mailing letters or postcards to small local businesses?

Research date: 15.11.2026. Scope: new data points beyond what the project already has (CMC curve ~54 % of scans in week 1, 73 % within 14 days; kebertt 40→2, LastingLifeSuccess 25→3, jspmedia 80→0).

Bottom line up front: **I found no new public first-hand report that states, with dates, how many days after mailing the first QR scan came in for a "demo website plus letter or postcard to a local business" campaign.** Practitioner posts I found give totals or reply rates, not timing. Vendor and QR-tool content gives timing rules of thumb, mostly unsourced. The one new quantitative timing dataset (QRLynx, Sept 2026) is not specific to direct mail. Method limits are listed under Gaps: Reddit, Indie Hackers and YouTube blocked direct fetching, and the Reddit archive API refused agent access.

## 1. Practitioner posts: how many days after mailing did the first scan, call or visit come?

### Takeaway
No new dated first-hand case states a "first scan on day X" for a demo-site letter or postcard. The closest new items are a promotional claim from a demo-site tool founder (reply rate, no timing), an unnamed vendor roofing example ("most scans within 2 days of mail arrival", not first-hand), and a 2015 sign-shop forum thread with B2B postcard totals but no timing.

### Cited Findings
- **ClaimSite (r/boulder, 23.03.2026, u/Trevor521, self-promotion by the tool's founder).** The tool scans Google Maps for businesses with no website or a weak one, generates a demo site "in under 90 seconds", and includes "Physical postcards mailed to the business address with a QR code linking to their demo" in its outreach stack. The only result given is "Reply rates on the no-website pitch run around 20-25% when you lead with the live demo link". The post gives no channel split (email, SMS, call or postcard), no number of pieces, no dates and no scan timing. Treat it as marketing, not a case study. — [Reddit r/boulder post 1s14n0z](https://reddit.com/r/boulder/comments/1s14n0z/i_built_a_tool_that_finds_local_businesses_with/), read via the PullPush archive API.
- **Indie Hackers "I built a tool that generates a live website for a local business before you contact them"** (about 242 days old per search snippet, so roughly March 2026). It describes the same model: find businesses without websites on Google Maps, build a demo in about 90 seconds, mail a physical postcard with a QR code to the demo. The search summary reports no scan counts or timing. The page returned HTTP 403, so I could not verify the full text or the comments. — [Indie Hackers](https://www.indiehackers.com/post/i-built-a-tool-that-generates-a-live-website-for-a-local-business-before-you-contact-them-qoZTIOY6f8DC83FRfxmP)
- **Signs101 forum thread "Mailing Postcards....Anyone have any luck with it?"** (13.–15.10.2015; first-hand from US and Canadian sign shops mailing to local businesses, B2B). It is outside the 2020+ window but is one of the few B2B-to-local-business mail reports.
  - CanuckSigns: one postcard sent to 5,000 area businesses, 2 orders, one of which was never paid.
  - NateF: about 1,800 6x11 cards per month to larger businesses in a set radius. Says first mailings rarely produce big results.
  - Techman: one EDDM mailing got a good return, an identical repeat got nothing.
  - reQ: results ranged from zero to "not bad", and calls came only from businesses with an immediate need.
  - Nobody states how many days passed until the first call. — [Signs101](https://www.signs101.com/threads/mailing-postcards-anyone-have-any-luck-with-it.127897/)
- **Signs101 "Do postcards work?"** A member says a single drop of 100 postcards is unlikely to produce much return and stresses repeat mailings. No timing given. — [Signs101](https://www.signs101.com/threads/do-postcards-work.61239/)
- **"Midwest roofing contractor" example on the TwoDollarQR blog** (05.08.2026; vendor content, unnamed client, no citation; B2C homeowners, not B2B).
  - 5,000 postcards, about $2,500, 3-week campaign, 120 total scans (2.4 %), 18 qualified leads, 92 % of scans from mobile.
  - "Most scans happened within 2 days of mail arrival."
  - No dates, no weekly counts, no first-scan day. — [TwoDollarQR](https://twodollarqr.com/blog/qr-code-on-direct-mail)

### Inferences
- Public practitioner posts about demo-site-plus-postcard outreach (ClaimSite, the Indie Hackers post) are mostly tool promotion. They report blended reply rates and do not log first-scan timing. A first-scan date for this exact business model is effectively unpublished.
- With tiny batches (25–80 pieces, as in the earlier kebertt, LastingLifeSuccess and jspmedia cases), the expected number of scans is 0–3. Even when timing is logged, "first scan day" is a single noisy observation. One campaign's first-scan day says little about the next one.

### Gaps
- No first-hand post found with: mail date, delivery date, date of first scan, and scans per week 1, 2 and 3+ for letters or postcards to local businesses. Reddit (www and old.reddit), YouTube and Indie Hackers blocked direct fetching. The PullPush Reddit archive answered a few queries, then rate-limited and stated it does not serve agents, so I stopped using it. A manual search on Reddit for "postcard" + "scans" in r/web_design, r/freelance, r/sweatystartup and r/directmail may still surface such posts.
- The YouTube video "QR Code on a Postcard? Should you do it? Does it work?" ([YouTube](https://www.youtube.com/watch?v=gTRxRWW2hSI)) reportedly shows one creator's QR postcard results. YouTube redirected to a captcha, so content and numbers are unverified.

## 2. Do QR/PURL or mail vendors publish "time to first scan" or "first-day scan share" statistics, especially for B2B?

### Takeaway
No direct-mail vendor I checked (Lob, Postalytics, Thanks.io, Handwrytten, Stannp, Pingen, Optilyz, PostGrid, Deutsche Post) publishes a time-to-first-scan or first-day-share benchmark, and none publishes one for B2B. The only measured time-to-first-scan dataset is QRLynx's, and it covers all dynamic QR codes with the clock starting at code creation, not at mail delivery. Vendor timing statements ("2–3 days after delivery", "2–6 weeks after mail date") are unsourced rules of thumb.

### Cited Findings
- **QRLynx scan benchmarks** (vendor, QR generator; capture date 27.10.2026). Not direct-mail-specific; not B2B-specific.
  - Sample: 1,215 dynamic codes created 1–24.09.2026, of which 674 recorded a scan.
  - Among scanned codes: 73.7 % first scanned within 24 hours of creation, 84.4 % within 7 days. Mean delay to first scan: 2.59 days.
  - Across all codes, including those never scanned: 46.8 % scanned within 7 days. Within 30 dates, 55.5 % had at least one scan, and the median code had 1 scan.
  - About 66 % of scans in the 30-date window fell in the first 7 dates (my calculation from their totals: 6,550 of 9,928).
  - QRLynx withdrew its earlier figures (5.8 days mean, 82.1 % within 7 days). The report suggests reviewing a code with no scan after 2–3 weeks. — [QRLynx](https://qrlynx.com/blog/qr-code-scan-benchmarks-2026)
- **QR Insights (UK QR-tracking vendor, 19.03.2026).** Says scans "typically begin 2 to 3 days after delivery", peak in week 1 and tail off over 2–4 weeks, with a possible second wave. No data or source is cited, and its numeric example (1,000 pieces, 120 scans) is hypothetical. — [QR Insights](https://www.qr-insights.co.uk/blog/qr-code-tracking-direct-mail)
- **QR Code Handbook (08.08.2026, no data cited).** Says scans may arrive "two to six weeks after mail date". Recommends a primary attribution window of 14 days after the last in-home date plus a 30–60-day long tail. Warns against judging a drop on its first 48 hours. — [qrcode-handbook.com](https://www.qrcode-handbook.com/en/best-practices/qr-codes-in-direct-mail-and-postcards/)
- **Lob (vendor).** Its blog says a spike in QR scans or visits "may show up days or weeks after your mail hits". The search summary also says Lob's help centre states QR scan data is deleted after 90 days and that pieces reach "In Mailstream" after about 4 business days for First Class. I saw these via search summary only and did not fetch the pages; no time-to-first-scan statistic was found. — [Lob blog](https://www.lob.com/blog/how-can-i-measure-the-performance-of-direct-mail-campaigns), [Lob help: mail analytics](https://help.lob.com/print-and-mail/getting-data-and-results/mail-analytics), [Lob help: QR codes](https://help.lob.com/print-and-mail/designing-mail-creatives/maximizing-engagement/adding-qr-codes)
- **Postalytics (vendor).** Its FAQ covers USPS Intelligent Mail barcode tracking scans, not QR scans: the first USPS scan arrives 3–4 business days after submission, then transit scans follow within 18–48 hours. No QR time-to-first-scan benchmark. — [Postalytics FAQ](https://www.postalytics.com/support/frequently-asked-questions/), [Postalytics analytics guide](https://www.postalytics.com/blog/direct-mail-analytics/)
- **Thanks.io / Handwrytten (vendors).** Both publish response-rate claims, but no response timing:
  - Handwrytten claims 20–30 % response for handwritten cold outreach. Unverified.
  - Thanks.io offers per-recipient QR codes with a scan webhook. Its cart-abandonment example says First Class mail arrives 5–10 business days after sending. — [Handwrytten](https://www.handwrytten.com/resources/handwritten-letters-for-business), [thanks.io](https://thanks.io/drive)
- **ProspectUp (vendor).** Claims a 9.2 % average QR scan rate on its postcards, self-reported with no method and no timing. — [ProspectUp](https://www.prospectup.ai/features/physical-postcards)
- **Stannp, Pingen, Optilyz, PostGrid, Deutsche Post.** No published time-to-first-scan or first-day-share statistic was found in searches. — [PostGrid QR article](https://www.postgrid.com/qr-code-marketing-in-direct-mail-advertising/); no vendor-specific results for the others.
- **German mailing literature.** Gives only overall response rates (0.5–2 % for a classic cold mailing; 2–10 % to own customers). One article adds that a follow-up mailing typically yields about 50 % of the first mailing's response and should go out no later than 2 weeks after the first. No day-by-day response curve was found. — [business-schreibkurse.de](https://www.business-schreibkurse.de/kurse/werbebriefe/einfuehrung/ruecklauf-quoten/), [tatendrang.info](https://www.tatendrang.info/jedes-mailing-verdient-eine-zweite-chance/)

### Inferences
- QRLynx's 73.7 % "first scan within 24 h of creation" cannot be applied to mail. For printed mail the clock effectively starts at delivery plus the time until the recipient opens the post. Many web-created codes are scanned by their creators or used on screens. The usable takeaway is the shape of the curve: if a code gets scanned at all, the first scan usually comes early, and codes with no scan after 2–3 weeks rarely recover much.
- Vendor rules of thumb ("first scans 2–3 days after delivery, peak week 1, tail 2–4 weeks") match the CMC curve the project already has, but they are not independent evidence: none cites data.

### Gaps
- No B2B- or small-business-recipient-specific first-scan timing statistic exists publicly from any vendor checked.
- No vendor publishes a "first-day scan share" for direct mail.

## 3. How many campaigns had zero scans in week 1, and what were the eventual totals?

### Takeaway
No source reports the share of direct-mail campaigns with zero week-1 scans. The nearest proxy is QRLynx (all QR codes, not mail): 53.2 % of new codes had no scan within 7 days and 44.5 % still had none after 30 dates. Practitioner anecdotes include total-zero outcomes (jspmedia 80→0, already known) and "repeat mailing got nothing" (Signs101), without weekly breakdowns.

### Cited Findings
- **QRLynx (all dynamic codes, Sept 2026).** 46.8 % of 1,215 codes had at least one scan within 7 days, so 53.2 % had none. After 30 dates, 55.5 % had at least one scan. Between days 8 and 30, 107 codes recorded their first scan. — [QRLynx](https://qrlynx.com/blog/qr-code-scan-benchmarks-2026)
  - Derived from these figures: about 107 of 646 codes with no scan by day 7, roughly 17 %, got a first scan later within the 30-date window.
- **Signs101, Techman (2015, first-hand).** An EDDM mailing got a good return; an identical repeat got nothing. — [Signs101](https://www.signs101.com/threads/mailing-postcards-anyone-have-any-luck-with-it.127897/)
- **Signs101, CanuckSigns (2015, first-hand).** 5,000 postcards to businesses, 2 orders in total. — [same thread](https://www.signs101.com/threads/mailing-postcards-anyone-have-any-luck-with-it.127897/)
- **QR Code Handbook.** Explicitly warns against calling a drop a failure based on the first 48 hours. — [qrcode-handbook.com](https://www.qrcode-handbook.com/en/best-practices/qr-codes-in-direct-mail-and-postcards/)

### Inferences
- For a small batch (for example 40 letters at a 2–7 % scan rate, so about 1–3 expected scan events), zero scans in week 1 is a common outcome even for a working campaign. By Poisson arithmetic, with an expected 1.5 scans in week 1, P(0) ≈ 22 %. The CMC curve (54 % of scans in week 1) and the QRLynx proxy (about 17 % of codes with no first-week scan still scanned within 30 dates) both suggest waiting at least 14 days, ideally 30, before judging.

### Gaps
- No direct-mail campaign dataset reports the fraction of campaigns with zero week-1 scans, or their eventual totals.

## Cross-cutting: US vs DE delivery time, which shifts "days after mailing"

### Cited Findings
- **US.** Thanks.io's example puts First Class arrival at 5–10 business days after sending. — [thanks.io](https://thanks.io/drive)
- **US.** Lob says pieces reach "In Mailstream" after about 4 business days for First Class (search summary). — [Lob help](https://help.lob.com/print-and-mail/getting-data-and-results/mail-analytics)
- **US.** Vendor guides cite 3–7 days for First Class and 5–14 days for Marketing Mail (search summary of vendor guides, no single primary source). — [MailMath](https://mailmath.com/blog/how-to-track-direct-mail-campaign-results)
- **DE.** Under the Postrechtsmodernisierungsgesetz, from 2025, 95 % of letters must arrive by the 3rd working day and 99 % by the 4th (annual average). Previously the target was 95 % by the 2nd working day. — [Verbraucherzentrale](https://www.verbraucherzentrale.de/wissen/projekt-postaerger/neues-postgesetz-diese-aenderungen-sollten-sie-kennen-97427), [Bundesnetzagentur](https://www.bundesnetzagentur.de/SharedDocs/Pressemitteilungen/DE/2024/20240705_PostG.html?nn=659906)

### Inferences
- A US case's "first scan N days after mailing" includes a longer and more variable postal leg (roughly 3–10 business days) than in Germany (≤ 3 working days for 95 % of letters, plus print-service handover). When comparing US practitioner timing to this project, count from estimated delivery (the project uses `DELIVERY_BUSINESS_DAYS=3`), not from the send date.
