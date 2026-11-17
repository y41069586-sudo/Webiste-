# Mobile Demo-Website und Briefdesign (Version 8): Best Practices 2024–2026

Researched 17.11.2026. Scope: (A) the mobile one-page demo the owner opens after scanning the QR code; (B) the visual design of the one-page DIN-A4 sales letter. Labels: **[Beleg]** = backed by a cited source; **[Meinung]** = opinion or inference, not measured.

Source quality: the strongest German source is the Deutsche Post teaching booklet "Themenheft Werbebriefsendung" (10/2025). It reproduces Siegfried Vögele Institut (SVI) material, and I extracted its text directly from the PDF. Most of the QR-size and sticky-UI guidance comes from vendor or secondary blogs; this is flagged where it applies.

---

## A1. What makes small-business websites convert on mobile (above the fold, click-to-call, sticky CTA, LCP, fonts, tap targets, image weight)

### Takeaway
The measurable targets are stable and checkable. Google's Core Web Vitals must pass at the 75th percentile on mobile: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1. Tap targets must be at least 24×24 CSS px under WCAG 2.2 AA; aim for 44–48 px. Click-to-call matters a lot for local services. Bounce probability rises sharply with every second of load time.

### Cited Findings
- Google/SOASTA (2017): as mobile page load time goes from 1 s to 3 s, the probability of bounce increases by 32%. From 1 s to 5 s it increases by 90%, and from 1 s to 10 s by 123%. These are *relative* increases, not bounce rates. — [Think with Google: page load time statistics](https://thinkwithgoogle.com/data/page-load-time-statistics); same figures in [Deloitte "Milliseconds Make Millions"](https://www2.deloitte.com/content/dam/Deloitte/ie/Documents/Consulting/Milliseconds_Make_Millions_report.pdf)
- Core Web Vitals "good" thresholds: LCP ≤ 2,500 ms (poor > 4,000 ms), INP ≤ 200 ms (poor > 500 ms), CLS ≤ 0.1 (poor > 0.25). Each is evaluated at the 75th percentile of visits. — [web.dev: How the Core Web Vitals thresholds were defined](https://web.dev/articles/defining-core-web-vitals-thresholds)
- WCAG 2.2 SC 2.5.8 (Level AA): pointer targets of at least 24×24 CSS px, or enough spacing between them. 44×44 CSS px is the AAA level (SC 2.5.5). Apple HIG recommends 44×44 pt and Material Design 48×48 dp. — [TetraLogical: Foundations: target sizes](https://tetralogical.com/blog/2022/12/20/foundations-target-size/); [W3C Understanding 2.5.8 (draft mirror)](https://raw.githack.com/w3c/wcag/dbce3c6320e5f0838ce1da6dff0271332de2fcf3/understanding/22/target-size-minimum.html)
- Click-to-call (Google/Ipsos, 2013): 70% of mobile searchers had used click-to-call from search results. 61% said it matters most in the purchase phase. 47% said they would be more likely to explore other brands if a business had no phone number. The data is old (2013). — [Think with Google: Click-to-call research (PDF)](https://www.thinkwithgoogle.com/_qs/documents/1454/click-to-call_research-studies_hz2ytgv.pdf); [MarketingCharts summary](https://www.marketingcharts.com/wp/online/smartphone-users-value-click-to-call-functionality-in-search-results-36950/)
- Local services had the highest click-to-call share of the verticals studied. Secondary summaries put it at 63% or 69%, and the discrepancy is unresolved. — [CustomerThink: Google research, the 4 verticals that get the most mobile calls](https://customerthink.com/google_research_the_4_verticals_that_get_the_most_mobile_calls/)
- Sticky headers: secondary sources attribute to NN/g the finding that sticky headers make navigation easier to discover but cost vertical space. They also attribute a recommendation to keep persistent headers small (about 1/10 of screen height). I could not verify this against the primary article. — [NN/g: Sticky Headers (primary, not fetched)](https://www.nngroup.com/articles/sticky-headers/); [secondary summary](https://www.digitalthriveai.com/en-ca/resources/web-design/sticky-menus-ux-guidelines/)

### Inferences
- **[Meinung] Checkable criteria for the demo:**
  - Lighthouse mobile ≥ 90 (already a project rule).
  - Field or lab LCP ≤ 2.5 s on a throttled 4G profile; aim for ≤ 1.8 s, because the owner arrives on mobile data from a letter.
  - CLS ≤ 0.1, so the banner must not push content down after load.
  - INP ≤ 200 ms.
- **[Meinung] Above the fold at 390×844**, and also at 360×780 and 320×568:
  - business name, trade, district/city
  - one hero image
  - primary end-customer CTA ("Anrufen" as a `tel:` link, or "Termin anfragen" depending on trade)
  - visible trust cue (opening hours or address line)
  Keep the hero image ≤ ~150–200 KB (AVIF/WebP via `srcset`), give it `fetchpriority="high"` and do not lazy-load it. The ~150–200 KB figure is a rule of thumb, not sourced.
- **[Meinung] Body text 16–18 px, line height ≥ 1.5.** Form inputs must be ≥ 16 px, because iOS Safari zooms into smaller inputs (widely known platform behaviour; I found no primary source in this session). Buttons should be ≥ 44–48 px high with ≥ 8 px gaps.
- **[Meinung] Inside the demo, a sticky bottom "Anrufen" bar for end customers** supports the "this is a real business site" impression. It must not stack with the "Entwurf" banner (see A3).

### Gaps
- I found no current (2024–2026) Google or Baymard study that quantifies mobile conversion uplift from click-to-call or sticky CTAs for small local service sites. The click-to-call data is from 2013.
- I could not retrieve Baymard's mobile UX benchmark numbers; they are mostly paywalled and e-commerce-focused.
- I found no sourced figure for an optimal page weight or image KB budget. The HTTP Archive median page weight was not retrieved.

---

## A2. Specific to a "demo for the owner": what convinces, how to present "Website übernehmen" without pressure, first-impression timing

### Takeaway
Visual appeal is judged within about 50 ms, and that first impression carries over into later credibility and usability judgments (halo effect). Design look is the most frequently cited credibility factor. For the owner, the first screen must therefore look professional *and* immediately show "this is mine" (own name, own trade, own district). I found no direct study of "demo for the owner" situations, so the recommendations here are inferences.

### Cited Findings
- Lindgaard et al. (2006, *Behaviour & Information Technology* 25:115–126): visual-appeal ratings after 50 ms exposure correlated closely with ratings after 500 ms. The authors conclude designers have about 50 ms to make a good first impression. — [Nature news coverage](https://www.nature.com/news/2006/060109/full/news060109-13.html); [websiteoptimization.com summary](https://old.websiteoptimization.com/speed/tweak/blink)
- The same research line describes a halo effect: initial appeal colours later judgments of credibility and usability. This comes from secondary summaries; I did not read the full paper. — [Nature news](https://www.nature.com/news/2006/060109/full/news060109-13.html)
- Stanford Web Credibility (Fogg et al., 2002): 2,684 participants evaluated 100 sites. "Design look" was the most frequently mentioned credibility factor, in 46.1% of comments. Critics note that participants mostly looked at the sites rather than using them. — [Consumer Reports WebWatch: How do people evaluate a web site's credibility?](https://advocacy.consumerreports.org/research/how-do-people-evaluate-a-web-sites-credibility); [ClickZ summary](https://clickz.com/study-for-site-cred-looks-matter/56564/)
- Personalised URLs and landing pages: Stannp reports that top-quartile QR campaigns often used personalisation, including variable QR codes leading to personalised landing pages. This is a vendor observation, not a controlled test. — [Stannp: Understanding direct mail engagement rates](https://go.stannp.com/blogs/understanding-direct-mail-engagement-rates-what-to-expect-how-to-improve)
- Deutsche Post / SVI: personalisation and guarantees act as "Verstärker" (small yes). Unanswered silent questions ("Was kostet das? Was muss ich tun?") act as "Filter" (small no). The guidance is about letters, but the logic transfers to the landing page. — [Deutsche Post Themenheft Werbebriefsendung 10/2025, p. 12–13](https://www.deutschepost.de/dam/jcr:7a909b24-3aa2-4659-bb4e-f83655a0f72b/dp-post-und-schule-themenheft-werbebriefsendung-102025.pdf)

### Inferences
- **[Meinung] The first viewport must answer "Ist das wirklich meins?" in under 1 second.** Show:
  - the exact business name as in Google/OSM
  - trade and district
  - correct opening hours and address, if known from public data
  - the owner's own Google rating, but only if the source is shown and the project's UWG/Google-compliance rules allow it (see `docs/compliance-google.md`)

  Wrong details (wrong trade, wrong street) are strong "Filter".
- **[Meinung] Real photos vs. stock.** Project rules forbid photos and logos of the business. Use neutral, clearly generic trade imagery, and say so honestly in the banner ("Bilder sind Platzhalter – Ihre eigenen Fotos kommen beim Einrichten hinein"). This answers the silent question before it becomes distrust. I found no study on stock vs. own photos for owner demos.
- **[Meinung] Non-pushy "take over" pattern:**
  - Keep a slim, unobtrusive "Entwurf für {Betrieb}" banner (≤ ~10% of viewport height, consistent with the NN/g-attributed header guidance).
  - Use one primary button "Website übernehmen" and one secondary "Preise".
  - Put "Was ist das?" / "Kein Interesse" behind a text link.
  - After the owner has scrolled through the demo, show a short closing section: "So geht es weiter" (3 steps, mirroring the letter's Ansehen / Anpassen / Übernehmen), the price transparently, then the CTA.
  - No countdown timers or modal pop-ups on load. The "online bis {Datum}" in the letter is already the scarcity element.
- **[Meinung] Mirror the letter on the landing page:** same headline wording, same three steps, same face/name of the sender. The scan then feels like a continuation of the letter, not a new advertisement (message match).

### Gaps
- I found no published study (NN/g, Baymard or academic) on "unsolicited pre-built website demo shown to the business owner" conversion. Everything in this subsection beyond the cited first-impression and credibility research is inference.
- I found no evidence on whether showing the owner's own Google reviews on the demo raises trust or creates privacy discomfort. It also has legal constraints (Google ToS, § 5 UWG), which are covered elsewhere in the project.

---

## A3. Common mobile bugs to test (horizontal scroll, sticky banners covering content, 100vh on iOS Safari, image sizes, legibility at 320 px)

### Takeaway
The most frequent defects are 100vh heroes that overflow behind browser chrome, fixed or sticky elements covering content or focused controls, and overflow at narrow widths. Fix 100vh with `svh`/`dvh` (Baseline in all engines, with a `vh` fallback). Test that no fixed element hides the focused element (a WCAG failure) and that nothing scrolls horizontally at 320 px.

### Cited Findings
- On mobile, elements sized 100vh "bleed out of the viewport", because 100vh corresponds to the *large* viewport with browser UI retracted. CSS now defines small (`svh`), large (`lvh`) and dynamic (`dvh`) viewport units. — [web.dev: The large, small, and dynamic viewport units](https://web.dev/blog/viewport-units)
- `100lvh` equals legacy `100vh`. The new units are Baseline. A `100dvh` element resizes whenever the address bar shows or hides, so declare a `vh` fallback first. — [specification.website: dynamic viewport units](https://specification.website/spec/performance/dynamic-viewport-units.md) (secondary)
- WCAG technique F110 (draft) describes a sticky header that fully obscures the focused element as a failure. A checklist lists sticky mobile toolbars, cookie banners and floating launchers as elements to retest. — [W3C WCAG F110 (editor's draft)](https://w3c.github.io/wcag/techniques/failures/F110); [frontendchecklist: focus not obscured](https://frontendchecklist.io/rules/accessibility/focus-not-obscured)
- Fixed or floating elements on small screens commonly sit on top of prices, form fields or the last line of text. — [UXmatters: Mobile design mistakes (2025)](https://www.uxmatters.com/mt/archives/2025/08/mobile-design-mistakes-that-cost-you-customers-and-money.php) (secondary)

### Inferences
- **[Meinung] Playwright test matrix for every demo**, with an automatable assertion for each check:
  1. **Viewports:** 320×568, 360×780, 390×844, 430×932, plus landscape 844×390.
  2. **No horizontal overflow:** `document.documentElement.scrollWidth <= window.innerWidth` at every width.
  3. **Banner overlap:** the "Entwurf" banner plus any sticky "Anrufen" bar must never overlap each other. Their combined height must be ≤ 20% of viewport height at 320×568. The last section, footer, Impressum link and form submit button must be fully visible when scrolled to the end (add `padding-bottom` equal to the sticky bar height plus `env(safe-area-inset-bottom)`).
  4. **Hero height:** use `min-height: 100svh` with `100vh` declared before it as a fallback, never a bare `height: 100vh`. Check that the primary CTA is inside the first viewport in iOS Safari with the toolbar visible.
  5. **Font legibility:** no text below 14 px computed. Body text ≥ 16 px. All form inputs ≥ 16 px (prevents iOS zoom). Long German compound words in headings (e.g. "Elektroinstallationsmeisterbetrieb") need `hyphens: auto` with `lang="de"` or `overflow-wrap: anywhere`, otherwise they cause overflow at 320 px. This is a frequent German-specific bug.
  6. **Tap targets:** every link and button ≥ 44×44 CSS px, or ≥ 24×24 with spacing (WCAG 2.5.8 minimum). `tel:` and `mailto:` links work. The `wa.me` link opens.
  7. **Images:** each `img` has `width`/`height` or `aspect-ratio` (CLS). Rendered image width ≤ 2× its CSS width. The hero is not lazy-loaded. Below-the-fold images use `loading="lazy"`.
  8. **Safe areas:** `viewport-fit=cover` with `env(safe-area-inset-*)` handled for notch and home indicator.
  9. **Contrast:** ≥ 4.5:1 for text (WCAG AA, already a project rule), including text on the banner and on hero overlays.
- **[Meinung] Test on at least one real iPhone with Safari.** Playwright WebKit emulation does not reproduce toolbar collapse behaviour exactly. This is an inference; I did not verify it in this session.

### Gaps
- I found no quantitative data on how often these bugs occur on small-business sites. The list is based on platform documentation and practitioner sources.

---

## B1. Direct-mail reading research (Vögele / SVI, Deutsche Post, DDV): eye path, text amount, images, P.S., signature, colour

### Takeaway
Recipients first *skim* the whole A4 page without reading, in a "first short dialogue" of about 20 seconds. They look for benefit answers to silent questions. Perception order is colour, then images, then graphics, then headline, then text. Pictures of people (portraits) attract most strongly. The signature must be legible and match the printed name. The P.S. is often the first text block actually *read*. Keep to one page, short paragraphs (first paragraph ≤ 3 lines) and highlights that tell the story alone.

### Cited Findings
All findings in this subsection come from the [Deutsche Post Themenheft Werbebriefsendung 10/2025](https://www.deutschepost.de/dam/jcr:7a909b24-3aa2-4659-bb4e-f83655a0f72b/dp-post-und-schule-themenheft-werbebriefsendung-102025.pdf) (text extracted from the PDF), which cites the SVI and Vögele's book "Dialogmethode: Das Verkaufsgespräch per Brief und Antwortkarte". The page number is given in parentheses after each finding.
- **Skimming:** eye-camera tests show readers skim an A4 page without reading, and the brain filters important from unimportant within a few seconds. (p. 8)
- **Reading path (Vögele's figure):** logo, then name and address, then subject/headline, then highlighted benefit words in the text, then signature, then P.S. (p. 8)
- **"Erster Kurz-Dialog" (20 seconds):** short silent reader questions are answered by pictures, headlines and underlined benefits. If the benefit is recognisable within 20 s, the reader keeps reading. If not, the letter goes in the bin. (p. 9)
- **Perception hierarchy:** colour, then images, then graphics, then headline, then text. (p. 10)
- **Images and shapes:**
  - Pictures of people attract more than product pictures; a portrait more than a full-body shot.
  - Large images more than small ones; colour more than black-and-white.
  - Circles attract the eye more than rectangles.
  - Muted colours convey credibility; bright colours convey sympathy.
  (p. 10)
- **Silent reader questions:** Wer schreibt mir? Was wird mir angeboten? Was sind die Vorteile für mich? Was kostet das? Was muss ich tun, um mehr zu erfahren? (p. 12)
- **Filters ("kleine Neins"):**
  - emphasising one's own company or product name
  - justified text (Blocksatz)
  - light text on light background
  - small print
  - complicated language and words with 5+ syllables

  **Verstärker ("kleine Jas"):** personalisation, guarantees, short headlines, bullet points, bold highlights, image captions. (p. 13)
- **Elements of a strong cover letter:**
  - appropriate paper quality
  - correct name and salutation
  - concrete date
  - benefit arguments
  - a concretely named offer
  - a clear call to action
  - signature
  - logo, sender and address
  - contact person with phone and e-mail
  - P.S.
  (p. 22)
- **Opening:** a benefit-oriented headline as the subject line, and a first paragraph of ideally ≤ 3 lines. Less is more: information overload quickly reduces receptiveness. (p. 22)
- **Paragraphs:**
  - first paragraph 3 lines, average 3–4 lines, maximum 5–6
  - one-line paragraphs read like subheadings and disturb the reading path
  - bullet lists: 3–4 points (maximum 6), one line each

  (p. 23)
- **Highlights:**
  - at most half a line per highlight, and one per paragraph
  - never across a line break
  - "Schnell-Lese-Botschaft": the highlights alone should convey the offer

  (p. 23)
- **Images:** images transport emotion and seem more credible. Stand-alone images can be misread, and a caption prevents that. (p. 24)
- **P.S.:**
  - often the first text block that is *read* (not merely seen)
  - must contain a real extra benefit or a call to action
  - surround it with white space and keep it to ≤ 1.5 lines
  - "eher im B2C- als im B2B-Bereich einzusetzen" (better suited to B2C than B2B)

  (p. 24)
- **Signature:**
  - must be legible and must answer "Wer schreibt mir?"
  - the printed name must match the signature, otherwise a "stummes Nein"
  - adding the job title helps
  - blue handwritten signatures with first and last name appear more sympathetic

  (p. 24)
- **Formal tips:**
  - not too much text, ideally one page
  - 10–12 pt
  - serif font
  - ragged right (Flattersatz) instead of justified text
  - no spelling errors

  (p. 24)
- **QR code / PURL:** a QR code or URL that leads directly to the specific landing page saves the detour via the homepage. Not finding the offer causes "große Frustration". Response becomes measurable. (p. 26)
- Vögele reported that an illegible signature was one of the biggest filters, that a concrete date is almost always read, and that he disliked bold type because it makes a letter look less like an original. This comes from secondary summaries of his handbook. — [SOFII: Secrets of direct mail (Vögele series)](https://sofii.org/article/secrets-of-direct-mail-3-how-people-read-letters) (page returned 404 when fetched; content via search snippets); [Medium: Secrets of Direct Mail: The Dialogue Method](https://medium.com/p/cda0aaca3a5e)
- **Conflict:** SVI material in the Deutsche Post booklet lists bold type as a "Verstärker" (p. 13). Older Vögele summaries say he disliked bold because it looks less like an original letter. A reasonable synthesis: highlight sparingly (one half-line per paragraph).
- Deutsche Post/CMC Dialogpost study 2020: in a same-volume comparison of classic letter, maxi postcard and self-mailer, the classic letter performed best, which surprised Deutsche Post itself. This is a sponsored study, reported via an advertorial. — [Horizont (Anzeige): CMC Dialogpost-Studie: der klassische Werbebrief wirkt](https://www.horizont.net/marketing/nachrichten/anzeige.-print-mailing-cmc-dialogpost-studie-der-klassische-werbebrief-wirkt-183113)

### Inferences
- **[Meinung] Mapping to Version 8:**
  - **Logo top:** fine, but keep it small. Emphasising your own brand is a "Filter".
  - **Address plus headline next to the address:** matches the reading path (name and address, then headline). The headline containing "{Betrieb}" is a strong personalisation "Verstärker".
  - **Dark stage with laptop and phone mockups:** the eye goes there first (colour, then image). That is acceptable only if the mockup shows *their* business name legibly, so the image itself answers "Was wird mir angeboten?" within 20 s. Add a short caption under the stage (SVI: captions prevent misreading), e.g. "Ihr Entwurf: {betrieb-domain}.de – so sieht er auf dem Handy aus".
  - **Three steps:** a numbered list of 3 is within the SVI optimum (3–4 points, one line each).
  - **Calendar leaf "online bis …":** a concrete date is almost always read, and a circle or leaf shape attracts the eye. Good.
  - **Signature:** use a blue handwritten signature plus the printed name, title ("Inhaber"/"Webdesigner") and phone number.
  - **P.S.:** Deutsche Post says the P.S. is "eher B2C". The recipients are micro-business owners reading as private persons, which is closer to B2C. Keep it ≤ 1.5 lines with one extra benefit or action (e.g. "P.S. Scannen dauert 10 Sekunden – Sie müssen nichts eingeben.").
  - **No prices in the letter:** this leaves the silent question "Was kostet das?" unanswered, which counts as a "Filter". Mitigation: one transparency line such as "Den Preis sehen Sie direkt auf der Seite – ohne Anruf, ohne Vertreterbesuch."
- **[Meinung] Typography:** body copy 10–12 pt with a serif or sober sans, ragged right, no light-grey small print except the legal block (Art. 14/21 notices must stay legible, ≥ 7–8 pt).

### Gaps
- I could not access the DDV's own eye-tracking data or a primary SVI study with fixation counts and timings in milliseconds. The "20 seconds" and the reading order come from SVI material reproduced by Deutsche Post.
- I found no published German test of P.S. vs. no P.S. with response figures.
- I found no quantified data on handwritten vs. printed signature effects. The "blue appears more sympathetic" claim is an SVI statement without numbers.

---

## B2. Dark image block plus mockups: helpful, or "looks like an ad" and lowers trust? "Too designed" vs. "personal letter"

### Takeaway
I found **no controlled evidence** that directly tests a dark stage with device mockups against a plain personal letter for German small-business recipients. SVI theory says images and colour are seen first and help the 20-second benefit check. The same theory says self-promotion, small print and anything that answers no silent question act as filters. The sponsored CMC study found the classic letter format beat more designed formats (postcard, self-mailer). So: use the image, but make it personal and explanatory, not brand-glossy.

### Cited Findings
- Perception order is colour, images, graphics, headline, text. Large, coloured images attract most. — [Deutsche Post Themenheft Werbebriefsendung 10/2025, p. 10](https://www.deutschepost.de/dam/jcr:7a909b24-3aa2-4659-bb4e-f83655a0f72b/dp-post-und-schule-themenheft-werbebriefsendung-102025.pdf)
- Muted colours convey credibility, bright colours convey sympathy. — [Deutsche Post Themenheft 10/2025, p. 10](https://www.deutschepost.de/dam/jcr:7a909b24-3aa2-4659-bb4e-f83655a0f72b/dp-post-und-schule-themenheft-werbebriefsendung-102025.pdf)
- Images seem more credible because they match everyday perception. Captions prevent misinterpretation. — [Deutsche Post Themenheft 10/2025, p. 24](https://www.deutschepost.de/dam/jcr:7a909b24-3aa2-4659-bb4e-f83655a0f72b/dp-post-und-schule-themenheft-werbebriefsendung-102025.pdf)
- Classic letter outperformed maxi postcard and self-mailer at equal volume (CMC Dialogpost-Studie 2020, sponsored by Deutsche Post). — [Horizont (Anzeige)](https://www.horizont.net/marketing/nachrichten/anzeige.-print-mailing-cmc-dialogpost-studie-der-klassische-werbebrief-wirkt-183113)
- Vögele summary: bold type and heavy design elements make a letter look less like an original personal letter. — [Medium: Secrets of Direct Mail: The Dialogue Method](https://medium.com/p/cda0aaca3a5e) (secondary)

### Inferences
- **[Meinung] Keep the stage, but de-advertise it:**
  - limit it to about 25–30% of the page height
  - use a muted dark colour (e.g. deep blue-grey rather than black with neon)
  - make the mockup screen show the recipient's real business name large enough to read at arm's length (≥ 9–10 pt equivalent in the screenshot)
  - add a one-line caption
  - keep the rest of the page a typed DIN 5008 letter with signature
- **[Meinung] Main trust risk:** the "Rechnung/Abzocke" association (the project already forbids invoice look) and "Agentur-Werbung" look. Mitigations:
  - first-person voice ("ich")
  - a small portrait photo of the sender (a portrait is the strongest eye magnet per SVI) next to the signature, if the operator later allows a photo; per CLAUDE.md currently "kein persönliches Foto"
  - full address and Impressum
  - no stock smiling-people imagery
- **[Meinung] A/B test candidate for the L5 optimizer:** "stage with mockups" vs. "small inline screenshot inside a plain letter". This is the only way to settle the question for this audience.

### Gaps
- I found no eye-tracking or response study on device mockups in print mailings.
- I found no German data on B2B micro-business trust reactions to "designed" vs. "plain" letters.

---

## B3. QR code best practices on print (size, CTA, placement, quiet zone, trust) and scan-rate benchmarks

### Takeaway
A 40 mm QR code is large: it is at or above the size Stannp recommends for mail (~4 cm) and well above the ~2 cm floor. The quiet zone must be ≥ 4 modules. The CTA wording matters far more than the code itself: Stannp's case study shows 7.34% vs. 0.58–0.67% scan engagement between CTA wordings. Typical direct-mail QR engagement (Stannp, 2025, ~1,400 campaigns, ~5 million pieces) has a median of 1.63%, a mean of 2.22% and a top decile of ≥ 5.29%.

### Cited Findings
- **Stannp 2025 benchmark** (~1,400 campaigns, ~5 million pieces, 16 industries, outliers removed; country not stated, Stannp operates in the UK and US):
  - median 1.63%, average 2.22%
  - top 25% ≥ 3.55%, top 10% ≥ 5.29%
  - bottom 25% ≤ 0.43%, bottom 10% ≤ 0.17%
  - scans keep arriving for weeks after delivery

  — [Stannp: Understanding direct mail engagement rates](https://go.stannp.com/blogs/understanding-direct-mail-engagement-rates-what-to-expect-how-to-improve)
- **Stannp recommendations:**
  - place the code where the eye lands (upper right or centre), not in a corner
  - use arrows, contrast boxes or colour
  - make it ≥ ~4 cm square
  - dark on light, with white border space
  - CTA wording that creates curiosity or exclusivity and states a specific benefit
  - A/B test the CTA only, ≥ 1,000 pieces per variant

  — [Stannp](https://go.stannp.com/blogs/understanding-direct-mail-engagement-rates-what-to-expect-how-to-improve)
- **Stannp CTA case study (Equinox):** about 27,200 pieces per variant. "Scan to unlock your exclusive offer" reached 7.34%, vs. 0.58–0.67% for three transactional alternatives. — [Stannp](https://go.stannp.com/blogs/understanding-direct-mail-engagement-rates-what-to-expect-how-to-improve)
- **Other benchmark claims:**
  - Linkbreakers claims 4–10% for direct mail, without a source (low reliability). — [Linkbreakers: QR scan rate benchmarks by industry](https://linkbreakers.com/help/article/qr-code-scan-rate-benchmarks-by-industry)
  - Yotru states there is no reliable public benchmark for B2B postcard scan rates and recommends defining scan rate as unique scanners ÷ delivered pieces. — [Yotru: B2B direct mail statistics](https://yotru.com/blog/b2b-direct-mail-statistics)
- **Deutsche Post / CMC Print-Mailing-Studie 2023:** nearly one in five existing-customer recipients visited the advertised online shop, measured via QR scans. This is existing customers of online shops, not cold B2B prospects, so it is not comparable. — [DHL Group press release: CMC Print-Mailing-Studie 2023](https://group.dhl.com/de/presse/pressemitteilungen/2023/cmc-print-mailing-studie-2023.html)
- **Size rules:** quiet zone ≥ 4 modules (vendor consensus; I did not verify ISO/IEC 18004 text). Minimum print size about 2×2 cm. Rule of thumb: code width ≈ scan distance ÷ 10, plus 20–30% for real conditions. — [Uniqode: QR code printing guideline](https://www.uniqode.com/blog/qr-code-best-practices/qr-code-printing-guideline); [QRCodeKit: Size of QR code for print](https://qrcodekit.com/?p=41655); [Linkbreakers: QR code size benchmarks](https://linkbreakers.com/help/article/qr-code-size-and-print-dimension-benchmarks)
- **Lob:** promotes dynamic, personalised QR codes for tracking. I could not extract a QR scan rate from Lob's 2025/2026 State of Direct Mail reports. — [Lob: Direct mail measurement with QR codes](https://lob.com/blog/direct-mail-measurement-just-got-easier-with-lobs-qr-codes); [Lob: State of Direct Mail 2026 key takeaways](https://www.lob.com/blog/state-of-direct-mail-2026-report-key-takeaways)

### Inferences
- **[Meinung] Checkable QR criteria for Version 8:**
  - code ≥ 40 mm, already satisfied
  - quiet zone ≥ 4 modules on the white card; ≥ 5 mm is easy at 40 mm
  - black on white, with no logo in the centre unless error correction level H is used and tested
  - short URL, so the code stays at a low version (fewer modules means bigger modules)
  - test scans with 3 phones (old Android, iPhone, mid-range) at 20–40 cm under kitchen-table lighting, on the actual printed paper from easyNova
- **[Meinung] CTA on the QR card:** "Hier scannen" alone is a transactional CTA, and the Stannp test suggests transactional wording underperforms by about 10×. Use a benefit- or curiosity-led line that names *their* site, e.g.:
  - "Ihre Website ansehen – Kamera drauf halten"
  - "Scannen: So sieht {Betrieb} online aus"

  Keep the short-URL fallback below the code. This is consistent with CLAUDE.md 5.5 ("Scannen und Ihre fertige Website ansehen – online bis …").
- **[Meinung] Trust signals near the QR:**
  - the human-readable domain (own domain, not a random tracking domain)
  - "keine App, keine Anmeldung, keine Daten nötig"
- **[Meinung] Realistic planning range for the project's KPI dashboard** (US/UK-derived, *not* German data, and must not be used as a claim in letters per § 5 UWG):
  - Personalised demos for cold small-business prospects might land anywhere in the ~1–5% band from the Stannp distribution.
  - Personalisation (their own site) is a plausible reason to land in the upper quartile, but this is unproven.
  - With 40 letters, the 95% confidence interval for any observed rate will be very wide. For example, 2 of 40 scans = 5%, with a CI of roughly 0.6–17% (Wilson interval approximation, computed by me).

### Gaps
- I found no German QR scan-rate benchmark for cold B2B or Handwerk mailings. Deutsche Post's Dialogmarketing-Monitor 2026 PDF was not parsed for QR figures.
- I could not find a Lob QR scan-rate figure.
- I did not consult ISO/IEC 18004 directly.

---

## B4. Fold lines (DIN lang, Z-fold) and the first visible third

### Takeaway
I found no fresh source with measured data on fold placement. Standard practice is a Z-fold (Zickzackfalz) or letter fold (Wickelfalz) of A4 into DIN lang (C6/5 or DL envelope), giving three panels of about 99 mm height (297 ÷ 3). The address window sits in the top third under DIN 5008 Form B, and whatever else is in that top third is what the recipient sees first when unfolding. Version 8 already places the headline next to the address, which is the right use of the first third.

### Cited Findings
- The reading path starts with logo and address/name, then the headline. — [Deutsche Post Themenheft 10/2025, p. 8](https://www.deutschepost.de/dam/jcr:7a909b24-3aa2-4659-bb4e-f83655a0f72b/dp-post-und-schule-themenheft-werbebriefsendung-102025.pdf)
- The first paragraph should be ≤ 3 lines, and the benefit must be recognisable within the 20-second short dialogue. — [Deutsche Post Themenheft 10/2025, p. 9 and 22](https://www.deutschepost.de/dam/jcr:7a909b24-3aa2-4659-bb4e-f83655a0f72b/dp-post-und-schule-themenheft-werbebriefsendung-102025.pdf)

### Inferences
- **[Meinung] Fold checks** (to be verified against easyNova's own print/fold specification, which the project documents in `docs/integrations.md`):
  - **Fold lines** at about 99 mm and about 198 mm from the top for a DIN-lang Z-fold. DIN 5008 fold marks are at 105 mm and 210 mm, a different (Form B) convention, so check which one easyNova uses.
  - **Stage and QR card:** the fold must not cross the QR code. A crease through the code can break scanning, and on a 40 mm code that is a real risk. Keep the code and its quiet zone fully within one panel.
  - **Layout by panel:**
    - top panel: logo, address, headline
    - middle panel: stage with mockups and QR
    - bottom panel: steps, calendar leaf, signature, P.S., legal text

    This lets each unfold step reveal a complete "small yes".
  - **Mockup images:** the laptop and phone should also not be split by a fold. A crease across the screen reduces legibility of the business name.
- **[Meinung] The first visible third should answer three of the five silent questions** without unfolding further:
  - "Wer schreibt mir?" (sender line or logo)
  - "Was wird mir angeboten?" (headline: "ich habe Ihre Website schon gebaut")
  - "Für wen?" (their business name)

### Gaps
- I found no measured study on how the fold position affects reading or response for A4 letters in DL envelopes.
- easyNova's exact fold type and fold positions were not checked in this research. They must be taken from the provider documentation or `docs/integrations.md`.
