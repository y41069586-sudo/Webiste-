# Authentic-looking demo websites for local trade businesses without their own photos (UX evidence, imagery, design system, generator prompting; German legal limits)

Research date: 19.11.2026. Sources preferred from 2024–2026. Where only older primary research exists (NN/g 2010/2019), this is flagged. Legal points are summaries of German practitioner sources, not legal advice.

## 1. What local-service visitors look for first, and what hurts trust (UX/consumer evidence)

### Takeaway
The deciding factors happen before and around the site: ratings, recent reviews and owner responses (BrightLocal 2026). On the site itself, visitors want the basics they can act on: phone (tap to call), hours, address/directions, services and prices. Decorative stock imagery is ignored rather than "read". There is no strong evidence that good stock or AI images lower trust. Visible fakery (made-up reviews, generic templated text) is what consumers punish.

### Cited Findings
**Reviews and ratings (BrightLocal Local Consumer Review Survey 2026, published 11.02.2026, n=1,002 US adults, SurveyMonkey panel; US data, not German)**
- 97% of consumers read reviews for local businesses, and 41% "always" read them (up from 29% in 2025) — [BrightLocal LCRS 2026](https://www.brightlocal.com/research/local-consumer-review-survey/)
- 92% care about star ratings. 68% will only use a business with ≥4 stars (up from 55%), and 31% only with ≥4.5 stars (up from 17%) — [BrightLocal LCRS 2026](https://www.brightlocal.com/research/local-consumer-review-survey/)
- 47% won't use a business with fewer than 20 reviews — [BrightLocal LCRS 2026](https://www.brightlocal.com/research/local-consumer-review-survey/)
- On recency, 74% look for reviews from the last 3 months, 32% from the last 2 weeks and 18% from the last week. The most important review factor is consistent sentiment across many reviews (56%) — [BrightLocal LCRS 2026](https://www.brightlocal.com/research/local-consumer-review-survey/)
- After reading positive reviews, 54% visit the business website, 31% visit the location and 20% contact the business. The website is the most common next step — [BrightLocal LCRS 2026](https://www.brightlocal.com/research/local-consumer-review-survey/)
- 89% expect owners to respond to reviews. 50% are unlikely to choose a business that uses templated or generic replies, which is direct evidence that generic text costs trust — [BrightLocal LCRS 2026](https://www.brightlocal.com/research/local-consumer-review-survey/)
- 45% use ChatGPT or other generative AI tools for local recommendations (up from 6%). Google is used by 71% (down from 83%) and Apple Maps by 27% — [BrightLocal LCRS 2026](https://www.brightlocal.com/research/local-consumer-review-survey/). Caveat: these "discovery source" shares differ from "review reading" shares, and some aggregators conflate them — [PinMeTo summary](https://www.pinmeto.com/news/brightlocal-local-consumer-review-survey-2026/)
- 97% think businesses caught using fake reviews should be punished — [BrightLocal LCRS 2026](https://www.brightlocal.com/research/local-consumer-review-survey/)

**Contact information (NN/g)**
- In a qualitative study of 20 business professionals on 40 sites, most participants preferred to reach a real person by phone. Showing a phone number "signals that the organization is reachable and builds trust", and hiding it damages reputation — [NN/g, "Contact Us" Page Guidelines, Anna Kaley, 18.08.2019](https://www.nngroup.com/articles/contact-us-pages/)
- NN/g recommends linking every address to a map app, showing opening hours and placing them near the phone number, and offering forms only in addition to a phone number, never as the only channel. Forms should have 3–5 fields, and no account should be required. Participants felt forms "took control away" — [NN/g Contact Us guidelines (2019)](https://www.nngroup.com/articles/contact-us-pages/)
- Older consumer surveys rank product/service list, opening hours, phone number, price list and address as the most important website information. One mobile survey cites ~88% wanting hours prominently, ~85% a click-to-call phone number and 82% an address/directions. These are ~2014 data and were seen only in search snippets, so they are indicative only — [BrightLocal, What local consumers want from local business websites](https://www.brightlocal.com/research/what-local-consumers-want-most-from-local-business-websites/); [Search Engine Land](https://searchengineland.com/different-consumer-groups-really-want-local-business-websites-244008)

**Images and trust (NN/g)**
- In eye-tracking, users "pay close attention to photos and other images that contain relevant information" and ignore decorative "feel-good" images. Stock photos of generic people were "pure filler". Photos of "real people who actually work at the company" drew attention: one user spent 10% more time on staff portraits than on bios that took 316% more space — [NN/g, Photos as Web Content, Jakob Nielsen, 2010, reviewed 08/2026](https://www.nngroup.com/articles/photos-as-web-content/)
- NN/g's 2026 study (77 US adults, fictional consulting homepage, 3 AI vs 3 real stock hero images, 10-second exposure) found no evidence that AI images reduced trust. AI pages scored about 0.2 points higher on trust and professionalism and 0.4 higher on authenticity (only authenticity was significant, and the effect was "very small"). Participants who *suspected* AI rated sites lower, and disclosed AI use reduces trust (citing Schilke & Reimann). NN/g recommends checking every image for believability, visual errors (hands, garbled text, reflections) and fit with the page's purpose, in its final crop — [NN/g, AI-Generated Images, Rachel Banawa, 21.08.2026](https://nngroup.com/articles/ai-generated-images)
- NN/g also says decorative images can set tone, but must not interfere with the user's task — [NN/g video, Decorative Images](https://www.nngroup.com/videos/decorative-images/)
- The claim that "stock photos actively hurt trust/conversion" comes mainly from marketing blogs and vendor research. For example, Getty/iStock VisualGPS reports 98% saying "authentic" images are pivotal to trust, but this is commercially motivated and the press page could not be retrieved (403) — [Getty VisualGPS trust](https://creativeinsights.gettyimages.com/en/trends/realness/trust); [CXL stock vs real photos](https://cxl.com/blog/stock-photography-vs-real-photos/)

### Inferences
- For a demo, the top fold should do the jobs visitors come for: business name and trade, location/district, the rating with review count (only if it is real and current), a tap-to-call phone number, today's opening hours and the address linked to maps. Visual polish matters less than having these facts visible at once.
- Because "consistent sentiment" and "templated replies" matter to consumers, concrete specifics drawn from real review themes (for example, "Termine auch samstags", "erklärt vorher die Kosten") will likely beat generic claims ("Qualität und Service"). They have to be phrased as the business's offer, not as made-up quotes.
- Real team photos are the strongest image type, but a demo can't have them yet. So a demo should not *fake* a team: no stock "mechanic smiling" passed off as the owner. It should leave a clearly marked slot ("Hier kommt Ihr Teamfoto hin") that becomes an onboarding task.
- NN/g's AI-image result argues against a blanket ban on non-real images. What hurts is images that look fake or wrong for the context and are noticed as such. Each image needs a quality check. Showing realistic people as if they were the owner's staff is still deceptive under the project's § 5 UWG rule.

### Gaps
- I found no 2024–2026 German consumer survey (e.g. Bitkom, IfH) on what visitors look for on Handwerk/Kfz websites. The data above is US or old.
- I found no Baymard research specific to local service sites. Baymard covers e-commerce checkout and product pages, not local trades.
- I found no Think with Google study from 2024–2026 with click-to-call and "near me" statistics. Older figures exist, but I could not verify them on a primary page in this session.

## 2. Handling missing imagery credibly, and German legal limits on using the business's Google photos, logo, Street View and reviews

### Takeaway
Legally safe options are licensed stock or illustration (honestly used as atmosphere/example), typography-led layouts, and an *embedded* Google map or Street View through official embeds/APIs. The business's own Google photos, its logo and Street View screenshots cannot be copied into a demo without permission. Street View is banned in print entirely, so it must never appear in the letter.

### Cited Findings
**Google Maps / Street View (Google Geo Guidelines)**
- A Google map can be embedded on a website without permission. Maps may be annotated, but must not be "significantly altered". Commercial, revenue-generating uses should go through Google Maps Platform — [Google Brand Resource Center, Geo guidelines](https://about.google/brand-resource-center/products-and-services/geo-guidelines/)
- Street View: "You may not screenshot Street View imagery or remove it from embedded sources for any purpose." Downloading it for offline use or stitching images is prohibited, and "Street View imagery may not be used for any print purposes." Embedding a Street View image or panorama on a website, or using the APIs, is allowed — [Google Geo guidelines](https://about.google/brand-resource-center/products-and-services/geo-guidelines/)
- In print, Maps content is allowed as "supplemental navigational use in printed promotional materials". It is prohibited as "primary or creative use in printed promotional or advertising materials" — [Google Geo guidelines](https://about.google/brand-resource-center/products-and-services/geo-guidelines/)
- Attribution must stay close to the content and must not be cropped or obscured — [Google Geo guidelines](https://about.google/brand-resource-center/products-and-services/geo-guidelines/). Embed and static options for Street View: [Street View Static API overview](https://developers.google.com/maps/documentation/streetview/intro?hl=de)

**Business photos and reviews via Google Places API**
- Photos and reviews from the Places API must always credit the author ("avatar, name, and profile link" when space allows). Users must be able to open the item on Google Maps (`googleMapsUri`). The Google Maps logo is the preferred attribution — [Google Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies)
- The same policies prohibit pre-fetching, storing, scraping or redistributing Maps content outside the Services, and copying and saving user reviews. They also say: "Don't create content based on Google Maps Content." Only place IDs (and lat/lng for up to 30 days) may be cached — [Google Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies)

**German copyright on photos (UrhG)**
- Even simple snapshots and most phone photos are protected as *Lichtbilder* under § 72 UrhG (50 years), with no minimum creativity required. Publishing without consent is infringement and leads to *Abmahnung* claims (injunction, damages, often lawyers' fees) — [e-recht24, Bilderklau](https://www.e-recht24.de/urheberrecht/8289-abmahnung-urheberrecht-vertragsstrafe-bilderklau.html); [WBS Legal, unberechtigte Bildnutzung](https://www.wbs.legal/urheberrecht/bildrecht/fotografen/unberechtigte-bildnutzung/); [IT-Recht Kanzlei](https://www.it-recht-kanzlei.de/urhebervermutung-fotos-internet.html?print=1)
- Google business-profile photos are often taken by customers or Google Local Guides, not the owner, so the owner may not even hold the rights. (Inference based on the author-attribution requirement in the [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies). I found no German source that addresses Google-profile photos specifically.)

**Logos**
- Logos may be protected both as registered trademarks (*Bild-/Wort-Bildmarke*) and by copyright if creative enough. Embedding someone else's logo without consent risks an *Abmahnung* (Unterlassung, Auskunft, Schadensersatz), even when the use is unintentional. Trademark infringement requires *kennzeichenmäßige Benutzung*, whereas copyright also covers decorative use — [e-recht24, Logo-Urheberrecht](https://www.e-recht24.de/artikel/blog-foren-web20/7095-youtube-twitter-facebook-logonutzung.html); [gruender.de, Logos einbinden](https://www.gruender.de/recht/logos-webseite-einbinden/); [e-recht24, Abmahnung Markenrecht](https://www.e-recht24.de/markenrecht/13341-abmahnung-markenrecht.html)

**Reviews on one's own site (UWG)**
- Quoting a selection of genuine positive reviews can be lawful if the selection is made clear. Misleading presentation violates § 5 UWG. Since 28.05.2022, § 5b Abs. 3 UWG requires anyone who shows reviews to state whether and how they verify authenticity, including when they quote or embed external reviews verbatim — [IT-Recht Kanzlei, FAQ Echtheit Kundenbewertungen](https://www.it-recht-kanzlei.de/faq-informationspflicht-echtheit-kundenbewertungen.html); [IT-Recht Kanzlei, Google/Facebook-Bewertungen einbinden](https://www.it-recht-kanzlei.de/bewertungen-google-facebook-online-shop-integration.html); [ra-plutte, Werbung mit Bewertungen ab 28.05.2022](https://www.ra-plutte.de/recht-faq-muster-werbung-mit-bewertungen-ab-28-05-2022/)

**Stock licensing**
- The Unsplash licence allows commercial use without attribution. It prohibits selling images without significant modification and compiling images into a competing service. The licence page says nothing about trademarks, identifiable people or property shown in photos — [Unsplash License](https://unsplash.com/license)

### Inferences
- **Allowed in a demo:** licensed stock/illustration as clearly generic atmosphere (workshop details, tools, hands, materials; ideally no identifiable faces and no visible third-party brands); typography-led heroes; an embedded Google Map, or better an OSM-based map given the project's OSM focus; an official Street View embed or Static API image on the web page only, with attribution; text facts (name, address, phone) in the business's own words.
- **Not allowed without explicit permission:** downloading the business's Google photos or logo, screenshots of Street View or Maps, any Street View image in the printed letter, and copying Google review texts into the page.
- **Project-specific risk:** the Places policy line "Don't create content based on Google Maps Content" sits uneasily with generating demo copy from Google "review themes". This should be checked against `docs/compliance-google.md`. OSM plus other licensed sources, or the owner's own statements, are safer inputs.
- If real reviews are shown after purchase, the page needs a § 5b Abs. 3 UWG authenticity notice, or reviews should be shown only as a link or official widget to the Google profile.
- A credible substitute for missing photos is to *visibly* design for the photo: a styled empty frame labelled "Ihr Werkstattfoto" in the demo. That is more honest than stock posing as the business. Whether it converts better than atmospheric stock is untested (see Gaps).
- Stock with Unsplash-style licences carries residual personality-rights and trademark risk (people, car brands on cars). A generator should prefer object/detail shots without faces or logos.

### Gaps
- I found no court decision or German legal article specifically on reusing Google business-profile photos or Street View on third-party sites. The conclusions rest on general § 72 UrhG principles plus Google's own terms.
- I found no copyright analysis (§ 51 UrhG Zitatrecht) of quoting individual Google reviews. The UWG side is covered.
- I found no A/B or eye-tracking evidence comparing a "styled photo placeholder" with a "generic stock hero" for local businesses.
- The documentary-style stock vs generic stock comparison is backed only by vendor or marketing sources (Getty/iStock, CXL). I found no independent 2024–2026 study.

## 3. Design-system choices that make a site feel "made for this business"

### Takeaway
Primary guidance from Anthropic, Vercel and design-system practitioners agrees. Generic output comes from unspecified defaults. A site feels bespoke when it commits to one clear art direction with a dominant colour and sharp accent, one distinctive typeface used decisively, role-based tokens, varied section compositions and concrete production copy. There is no controlled study proving conversion gains from these choices. The evidence is expert guidance plus the consumer data on "generic/templated" signals.

### Cited Findings
- Anthropic identifies "distributional convergence" as the cause of the generic "AI slop" look. The guidance names overused fonts to avoid (Inter, Roboto, Arial, Open Sans, Lato, system fonts), "clichéd color schemes (particularly purple gradients on white backgrounds)", "predictable layouts and component patterns" and "cookie-cutter designs lacking context-specific character" — [Anthropic/Claude blog, Improving frontend design through Skills, 12.11.2025](https://claude.com/blog/improving-frontend-design-through-skills)
- On colour: "Dominant colors with sharp accents outperform timid, evenly-distributed palettes", and consistency should come from CSS variables — [Anthropic/Claude blog](https://claude.com/blog/improving-frontend-design-through-skills)
- On typography: "Pick one distinctive font, use it decisively"; pair contrasting styles (serif + geometric sans, display + mono); use extreme weight and size contrasts ("100/200 weight vs 800/900, not 400 vs 600") — [Anthropic/Claude blog](https://claude.com/blog/improving-frontend-design-through-skills)
- On motion and backgrounds: one orchestrated page-load moment with staggered reveals instead of scattered effects, and layered gradients, patterns or contextual effects instead of flat colour — [Anthropic/Claude blog](https://claude.com/blog/improving-frontend-design-through-skills)
- Even with banned-font lists, the model drifted to the next default (Space Grotesk), so variation must be explicitly enforced — [Anthropic/Claude blog](https://claude.com/blog/improving-frontend-design-through-skills)
- Design-system practice for non-generic AI UI includes the following (undated practitioner article):
  - a named visual direction (e.g. "Editorial Design")
  - a spacing system (8 px base; 80 px section gap desktop, 48 px mobile)
  - an explicit shape language
  - colours with *jobs* (surface, elevated, primary action, muted text, border, status) and limits on accent use
  - a type system with distinct roles
  - semantic tokens (colour, radius, shadow, spacing, motion)
  - every interaction state defined
  - each expressive choice tied to the product's purpose

  Source: [daisyUI, How to make AI UI less generic](https://trends.daisyui.com/how-to-make-ai-ui-less-generic/)
- The same source flags placeholder copy and missing states as signs of generic output, and asks for "real production labels" — [daisyUI](https://trends.daisyui.com/how-to-make-ai-ui-less-generic/)
- Default stacks (shadcn/ui + default Tailwind values) are a main source of sameness, and the usual fix is to pass the project's own token block into the prompt. These are third-party guides — [v0 prompting guide (SurePrompts)](https://sureprompts.com/blog/v0-prompting-guide); [v0 Design Systems 2.0 docs](https://v0.app/docs/design-systems-2)
- Consumers penalise templated, generic replies (50% unlikely to choose such a business), which supports owner-voice microcopy over boilerplate — [BrightLocal LCRS 2026](https://www.brightlocal.com/research/local-consumer-review-survey/)

### Inferences
Applied to a Kfz workshop:
- **Palette from the trade:** for example oil-black or graphite as the dominant colour with one signal accent (safety orange or yellow, as on workshop markings). Avoid evenly mixed multi-colour palettes and purple-blue SaaS gradients. The accent is reserved for the call button and the "heute geöffnet" status.
- **One typeface pairing per kit:** for example a condensed grotesk or industrial display face for headings plus a readable text face, with high size contrast. Inter, Roboto and Space Grotesk should be on the banned list for heroes.
- **Varied section compositions** instead of repeated 3-card grids: a typographic hero with the phone number as a big element; a services list styled as a price-list/table ("Inspektion ab … €" only if real prices are known); a "So läuft ein Termin ab" timeline; a map/route block with hours; an owner note.
- **Real copy specifics:** district and street ("in Dortmund-Hörde, nahe …"), the actual brands or services from OSM tags, real hours, and review *themes* turned into service promises. No numbers without a source, matching the project's L1/L2 truth check.
- **Owner-voice microcopy:** short, plain German ("Rufen Sie einfach an – wir sagen Ihnen vorher, was es kostet"), not marketing superlatives ("Ihr kompetenter Partner rund ums Auto").

### Gaps
- I found no controlled study (A/B or eye-tracking) showing that distinctive typography or trade-derived palettes raise trust or conversion for local service sites. This is expert consensus, not measured evidence.
- I found no evidence-based rules for German trade-specific colour associations (e.g. Kfz = dark/orange). Those palette examples are design convention, not research.

## 4. Prompt and generator techniques that reduce generic AI output

### Takeaway
The most effective documented levers are: start from content and context (who, when, what decision); give an art-direction brief at the "right altitude" (direction plus role-based tokens, not vague adjectives and not only hex values); keep explicit banned-pattern lists while also forcing variation; reuse a design system or token block across generations; review output against stated rules.

### Cited Findings
- Vercel's official framework uses three inputs: (1) product surface ("List the actual components, features, and data"; not "a dashboard"); (2) context of use, meaning who, when, what decision, how much time ("If you don't define the context of use, it will guess"); (3) constraints and taste (device, e.g. "mobile-first" rather than "works on mobile"; visual tone; layout; colour meaning) — [Vercel blog, How to prompt v0, 15.12.2025](https://vercel.com/blog/how-to-prompt-v0)
- In Vercel's own tests, adding context of use produced a fully functional, responsive result where the version without context had non-functional search and cart. A specific product-surface prompt was 19 s faster and produced 152 fewer lines. Prompts should carry logic and structure, with visual tweaks done in a design mode — [Vercel blog](https://vercel.com/blog/how-to-prompt-v0)
- Design systems can be taught once and reused: a design-system "skill" is an adapter saying which components, props and tokens are safe to use — [v0 Design Systems 2.0 docs](https://v0.app/docs/design-systems-2)
- Anthropic's techniques:
  - give high-level context before specifics
  - pitch guidance "at the right altitude", avoiding both hardcoded hex values and vague direction
  - list anti-patterns explicitly
  - end with a reminder to vary and to "make unexpected choices that feel genuinely designed for the context"
  - package the guidance as a ~400-token skill that loads when relevant

  Source: [Anthropic/Claude blog, 12.11.2025](https://claude.com/blog/improving-frontend-design-through-skills)
- Generic UI "usually begins with a generic request". Adjectives without rules give the model no decisions to apply. Prompts should name the product and audience, a visual direction and tokens, and ask for real labels instead of placeholders. Output should be reviewed against the spacing scale, type hierarchy at both widths and contrast — [daisyUI, How to make AI UI less generic](https://trends.daisyui.com/how-to-make-ai-ui-less-generic/)
- NN/g's image guidance doubles as a review checklist for any generated image: purpose fit, representation, believability, artefacts (hands, text, reflections), checked in final crop and placement — [NN/g AI-Generated Images, 2026](https://nngroup.com/articles/ai-generated-images)

### Inferences
A concrete recipe for the project's demo generator, which already has kits, a phrase filter and AI-pattern QA:
1. **Content-first fact sheet** as the prompt's first block: name, trade, district, address, phone, hours, OSM tags (brands, services), rating and count (only if allowed and real), 3–5 review *themes* (paraphrased, see the legal caveat in section 2), and what is *unknown*. The model must not fill unknowns.
2. **Context of use:** "Owner of a Kfz-Werkstatt scans a QR from a letter on his phone, maybe between jobs, ~30 seconds; he must recognise his own business immediately and see it looks professional." Plus the end customer's context: "Driver with a problem, mobile, wants to call or find the way."
3. **Art-direction brief per kit:** a named direction (e.g. "Werkstatt-Editorial: industrial, ehrlich, ruhig"), the token block (colour roles, one display + one text face, radius, spacing scale), a list of section *compositions* to choose from with a rule like "no two adjacent sections share a layout", and one motion moment.
4. **Banned-pattern list:**
   - Inter/Roboto/Space Grotesk heroes
   - purple/blue gradients
   - three equal icon cards in a row repeated
   - emoji icons
   - "Willkommen bei …", "Ihr kompetenter Partner", "Qualität, die überzeugt"
   - fake testimonials or star widgets
   - stock people posing as staff
   - invented numbers ("20 Jahre Erfahrung")
   - placeholder lorem/labels
5. **Forced variation and self-review:** pick the palette and composition variant by seed per lead, and run an automated check against the rules (contrast, banned fonts and phrases, repeated layouts, unverified numbers) before human review. This matches the project's existing QA/review gate.

### Gaps
- I did not retrieve Lovable's official prompting docs or the full official Anthropic `frontend-design` SKILL.md. Both are known only through the Anthropic blog and third-party mirrors.
- I found no published head-to-head evaluation showing how much banned-pattern lists or token blocks reduce "AI look" as rated by end users. Vercel's tests measure functionality, time and code size, not perceived authenticity.
