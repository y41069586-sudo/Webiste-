# Generator architecture: distinctive, art-directed demo sites at scale (HTML + Tailwind templates + LLM-written German copy)

Scope note: research done 04.11.2026 with about 20 web calls. Several primary pages could not be fetched (Pexels license page and help center returned 403, the Relume docs URL 404, the GitHub path of the Claude Code frontend-design plugin 404). Where only third-party summaries were available, this is marked.

## 1. Design-token systems and per-sector "art direction kits" (combining without ugly combos)

### Takeaway
Tailwind v4's `@theme` variables, which compile to plain CSS custom properties, are a natural carrier for per-sector "kits". To make combinations safe, constrain them structurally: (a) role-based color scales where each step has a fixed job and contrast is guaranteed (the Radix 12-step model), (b) curated, pre-validated font pairings and palettes rather than free mixing, and (c) a small number of global "knobs" (radius, scaling, panel style), as Radix Themes exposes them, instead of hundreds of free variables.

### Cited Findings
- Tailwind v4 theme variables are defined with `@theme`. They "influence which utility classes exist in your project", e.g. `--color-mint-500` creates `bg-mint-500`, `text-mint-500` and `fill-mint-500`. — [Tailwind docs: Theme variables](https://tailwindcss.com/docs/theme)
- Namespaces map tokens to utilities: `--color-*`, `--font-*`, `--text-*` (sizes), `--radius-*`, `--shadow-*`, `--breakpoint-*` and `--container-*`. `--spacing` is a single base variable that drives the whole spacing scale. — [Tailwind docs: Theme variables](https://tailwindcss.com/docs/theme)
- "All of your theme variables are turned into regular CSS variables when you compile your CSS." Only used variables are emitted unless the `static` option is set. A namespace can be reset (`--color-*: initial;`), and so can the whole theme (`--*: initial;`). — [Tailwind docs: Theme variables](https://tailwindcss.com/docs/theme)
- `@theme inline` should be used when theme variables reference other variables, to avoid unexpected fallbacks from where `var()` is resolved. — [Tailwind docs: Theme variables](https://tailwindcss.com/docs/theme)
- Themes can be shared as a separate CSS file imported per project ("throwing them into their own CSS file that you can import"), which works in monorepos or as an npm package. — [Tailwind docs: Theme variables](https://tailwindcss.com/docs/theme)
- Radix Themes sets the whole look through a `Theme` component with a few props, e.g. `accentColor="mint"`, `grayColor="gray"`, `panelBackground="solid"`, `scaling="100%"` and `radius="full"`. Its defaults are described as "a well tuned set". Token categories are Color, Typography, Spacing, Radius, Shadows and Cursors. — [Radix Themes: Theme overview](https://www.radix-ui.com/themes/docs/theme/overview)
- In the Radix 12-step color scale each step has a fixed role: 1–2 app and subtle backgrounds; 3–5 component backgrounds (normal, hover, pressed); 6–8 borders (subtle, interactive, strong or focus); 9–10 solid accents (9 is the most saturated) and their hover; 11–12 low- and high-contrast text. Steps 11 and 12 are guaranteed to reach "Lc 60 and Lc 90 APCA contrast" on step 2 of the same scale. — [Radix Colors: Understanding the scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)
- Open Props is a "non-prescriptive" token set (CSS, PostCSS, JSON, JS). It provides fluid type via `clamp()` (e.g. `--font-size-fluid-3: clamp(2rem, 9vw, 3.5rem)`), easings (including spring and bounce), 30 gradients, 5 noise textures with matching filters, shadows that adapt to light and dark mode, a 16-step OKLCH palette driven by hue, chroma and rotation, and opt-in edge and corner masks (scallops, zig-zags, corner cuts). Packs can be imported one by one, or only the used props emitted through `postcss-jit-props`. — [Open Props](https://open-props.style/)
- Anthropic's current frontend-design skill asks for a compact token plan before building: 4–6 named hex colors, type roles, layout wireframes and principles. The plan is then reviewed against the brief to replace generic defaults. It also asks for one or two clearly distinct typefaces with a deliberate type scale, and for body lines under about 80 characters (serif body text slightly more line height than sans). — [anthropics/skills frontend-design SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md) (paraphrased; the fetch tool returned a summary, not the verbatim text)
- The Anthropic blog recommends using CSS variables for consistency, drawing inspiration from IDE themes and cultural aesthetics, and that "Dominant colors with sharp accents outperform timid, evenly-distributed palettes." — [Claude blog: Improving frontend design through Skills (12.11.2025)](https://claude.com/blog/improving-frontend-design-through-skills)

### Inferences
- A practical kit schema for this repo (`packages/templates`), one CSS file per kit plus a JSON manifest:
  - `type`: display and body family (self-hosted woff2), a scale ratio (e.g. 1.25 vs 1.333 vs 1.5), weight extremes, tracking for display, `line-height` per role.
  - `color`: one neutral scale plus one accent scale in Radix-style 12 steps (generated in OKLCH), and an optional "surface tint". Roles, not hex values, are referenced in templates (`bg-surface`, `text-ink`, `bg-accent-solid`, `border-subtle`).
  - `shape`: radius set (0 / 4 / 999), border weight, shadow style (none, hairline, soft, hard offset).
  - `rhythm`: `--spacing` base and section padding scale (compact, airy).
  - `image`: treatment preset (duotone with accent, warm grade, b/w with color accent, framed or masked) and an aspect-ratio set.
  - `texture`: noise, paper or grid pattern (e.g. Open Props noise and masks).
- Avoid ugly combinations by not combining axes freely. Pre-validate a whitelist: N font pairings × M palettes, each pair tested once for contrast and taste. Then allow free variation only on "safe" axes (radius, rhythm, image treatment, section variant). This mirrors Radix's approach of a few tuned knobs over a fixed, validated scale system.
- Enforce contrast at build time by computing APCA/WCAG contrast for the role pairs actually used (text-on-surface, text-on-accent, button). A combination that fails is rejected, not "fixed" by the LLM.
- Use a deterministic seed (e.g. hash of the lead id) for kit and variant picks so a demo re-renders identically and stays idempotent. Neighbouring leads of the same sector in the same city should get different kits (a "no duplicate within radius/sector" rule).

### Gaps
- No primary source found on how commercial builders (Wix, Durable, Hostinger) internally constrain theme combinations; their internals are not public.
- Radix Themes' auto gray matching and the `appearance` prop were not covered on the fetched page.
- The Pexels license page itself was not readable (403).

## 2. Layout variety: section libraries, composition rules, how builders do it and where they fail

### Takeaway
All mainstream AI builders compose pages from a fixed library of sections. Reviewers consistently say they get structure right but look generic (Relume: "structurally strong but visually generic"; Framer Wireframer: good information architecture, generic styling with vague prompts; Wix: "unmistakably a Wix site"). Distinctiveness therefore has to come from (a) genuinely different section variants, not cosmetic ones, (b) composition rules that vary rhythm, and (c) art direction (type, color, imagery) layered on top. Variant count alone is not enough.

### Cited Findings
- Relume's AI Site Builder generates a sitemap from a short description, then wireframes in one click, drawing on a library of 1,000+ components for Figma, Webflow and React, plus a Style Guide Builder for color, typography and UI elements. Reviewers describe the output as "structurally strong but visually generic, since the AI draws from a fixed component library". — [Relume](https://relume.io/); [Hack Design: Relume toolkit](https://www.hackdesign.org/toolkit/relume/); [Durable: Relume review](https://durable.com/ai-tools/relume-review) (aggregated by the search tool; the Relume docs page itself returned 404)
- Framer's Wireframer generates layout wireframes from text, "to quickly explore structural options before committing to detailed design". A guide says a vague prompt ("Make me a business website") yields a generic corporate layout "that could be for anyone"; it "usually gets the information architecture spot-on", and the recommendation is to keep the structure and add your own colors, fonts and styling. — [Framer Academy: Wireframer](https://www.framer.com/academy/lessons/generating-layouts-with-ai-using-wireframer); [hxmzaehsan blog: Framer Wireframer](https://www.hxmzaehsan.com/blog/how-to-use-framer-wireframer-ai); [BuildWithAngga Framer AI tutorial](https://buildwithangga.com/tips/framer-ai-panduan-lengkap-membuat-website-profesional-tanpa-coding-untuk-pemula)
- Builder reviews (mostly affiliate listicles, low reliability): Wix output was "unmistakably a Wix site", with predictable layouts, safe typography and generic filler copy. Hostinger's AI builder lists generic output as its main downside. Durable is the fastest (a site in under a minute) but its text "may feel robotic", and with no HTML customization it stays "basic and template-like". 10Web output "feels basic". Framer is singled out as design-first. — [DEV: I tested the most popular AI website builders](https://dev.to/fredy/i-tested-the-most-popular-ai-website-builders-heres-what-i-found-4on8); [Kaizen: I tested 7 AI builders](https://kaizen-website-eks.pages.dev/blog/builders-perspective/tested-ai-builders); [State of Digital Publishing: Hostinger review](https://www.stateofdigitalpublishing.com/digital-platform-tools/hostinger-builder-review/); [DEV: Best AI website builders 2026](https://dev.to/techsifted/best-ai-website-builders-in-2026-tested-and-ranked-43ln); [softpicker 2026](https://softpicker.com/best-ai-website-builders/)
- The frontend-design skill says the hero should open with "the most characteristic element of the subject's world". The default of a big number, small label and gradient accent should be used only when it's the best option. Industry, materials and vernacular should drive visual choices. — [anthropics/skills frontend-design SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md) (paraphrased)
- The same skill lists layout and structure tells to avoid: identical SaaS card grids, eyebrow labels above content, all-caps labels, accenting one headline word, middle-dot meta strings, broadsheet hairlines, and numbered markers unless the content is a true sequence. Borders, numbering and dividers should carry information. — [anthropics/skills frontend-design SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md) (paraphrased)
- Anthropic's blog notes that the unguided default for landing pages is Inter-style fonts, purple gradients on white and minimal animation, and that the general skill includes a list of "predictable layouts" to avoid. — [Claude blog: Improving frontend design through Skills](https://claude.com/blog/improving-frontend-design-through-skills)

### Inferences
- A section library should define variants on structural axes, not only styling. For example:
  - Hero: (1) typographic, oversized display type and no image; (2) split image with offset frame; (3) full-bleed image with overlay text; (4) "object/menu-first" (a menu board or price list as hero for gastronomy, an opening-hours board for beauty); (5) map/address-first for local walk-in shops.
  - Services: list with prices, accordion, a 2-column "menu" with dotted leaders, tabbed categories, large numbered rows (only if sequential).
  - Gallery: masonry, a single wide strip, a 2-up diptych, an "atmosphere band" (texture or duotone).
  - Process: horizontal timeline, vertical steps, a 3-column "how it works".
  - Contact: map + hours block, big phone CTA, form + WhatsApp link.
- Composition rules (implementable as a validator over the section sequence):
  - Alternate density: never two full-width image sections in a row, and never two card grids in a row.
  - Alternate background roles: surface → tinted → surface → inverse at most once per page.
  - Each page gets exactly one "signature moment" (a large typographic statement or an image band).
  - Section order depends on the sector's conversion job: for gastronomy, menu and hours early; for trades, services, area served and the call CTA early.
  - Limit the number of distinct section types per page (e.g. 6–8) and forbid repeating a variant.
- The common failure mode of commercial builders is "fixed library + generic prompt + same defaults". The counter-measure is sector-specific variants and business-specific data (district, street, opening hours, OSM tags, review themes) feeding both layout choice and copy.

### Gaps
- No primary documentation found on how Wix ADI/Studio, Durable, 10Web or Hostinger choose sections internally. The critiques are anecdotal reviews, not controlled tests; no study compared identical prompts across builders.
- No quantitative study found on "perceived bespoke-ness" vs. number of section variants.

## 3. Prompting LLMs for non-generic copy and design

### Takeaway
Anthropic explicitly names the problem: LLMs converge on "safe" defaults because those dominate web training data. The fix is a short, targeted style prompt or skill (about 400 tokens), concrete lists of defaults to avoid (fonts, palettes, layouts), a reminder that models converge on new defaults too (Space Grotesk is cited), theme-scoped constraint blocks, and grounding in subject-specific material. For copy, the same pattern applies: banned-phrase lists, user perspective and active voice, and specificity from real business data.

### Cited Findings
- Problem statement: "Safe design choices–those that work universally and offend no one–dominate web training data." Unguided output tends toward Inter-like fonts, purple gradients on white and minimal animation. — [Claude blog: Improving frontend design through Skills](https://claude.com/blog/improving-frontend-design-through-skills)
- Typography guidance: "Avoid using boring, generic fonts". The banned defaults are Inter, Roboto, Open Sans, Lato and system fonts. Alternatives are grouped by use: code, editorial, technical and distinctive (e.g. JetBrains Mono, Playfair Display, IBM Plex, Bricolage Grotesque). Pairing principle: "High contrast = interesting." Weights: "Use extremes: 100/200 weight vs 800/900, not 400 vs 600." Commit to one distinctive font and use it decisively. — [Claude blog](https://claude.com/blog/improving-frontend-design-through-skills)
- Color: "Commit to a cohesive aesthetic"; dominant colors with sharp accents beat evenly distributed palettes. Backgrounds: "Create atmosphere and depth rather than defaulting to solid colors", using layered gradients, geometric patterns or context-matched effects. Motion: focus on high-impact moments, e.g. one page load with staggered reveals, rather than scattered micro-interactions. — [Claude blog](https://claude.com/blog/improving-frontend-design-through-skills)
- Models converge on new defaults even with the skill (Space Grotesk is cited), so the prompt closes with "it is critical that you think outside the box!" A theme-specific constraint block (`<always_use_rpg_theme>`) shows how to lock one aesthetic. The skill is about 400 tokens and loads on demand, because "too many tokens in the context window can result in degradation of performance." — [Claude blog](https://claude.com/blog/improving-frontend-design-through-skills)
- The newer frontend-design skill adds a list of current "AI tells" to avoid: cream-and-terracotta palettes, near-black with acid accents, broadsheet hairlines, identical SaaS card grids, eyebrow labels and middle-dot meta strings. It asks for one orchestrated motion moment, motion that responds to user actions, and a quality floor (responsive layouts, visible focus states, reduced-motion support, harmonious color). Copy should be written from the user's perspective, in active voice and a plain, conversational tone, with consistent action names. The process ends with screenshot review and removing unnecessary decoration. — [anthropics/skills frontend-design SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md) (paraphrased)
- Framer's guidance: vague prompts give generic layouts "that could be for anyone"; specificity in the prompt improves results. — [hxmzaehsan blog: Framer Wireframer](https://www.hxmzaehsan.com/blog/how-to-use-framer-wireframer-ai)
- Reviews of Wix and Durable flag generic filler and "robotic" AI copy as a main weakness. — [DEV: AI website builders tested](https://dev.to/fredy/i-tested-the-most-popular-ai-website-builders-heres-what-i-found-4on8); [Kaizen: tested AI builders](https://kaizen-website-eks.pages.dev/blog/builders-perspective/tested-ai-builders)

### Inferences
- Split responsibilities. The LLM should not invent design freely per lead; templates and kits encode design. The LLM (a) picks from a whitelisted set of kits and variants with justification from business data (tool use with a JSON schema enum, so it can only choose valid ids), and (b) writes copy into fixed slots with length limits. This fits the existing L2 approach (slot templates, blocking truth check).
- Rotate or penalize the LLM's own new defaults. Log which kit and variant ids are chosen and apply a frequency penalty (e.g. down-weight kits used in the last N demos of the same sector or city). This addresses the convergence problem Anthropic describes, but at the system level.
- A German banned-phrase list for copy, checked deterministically after generation (regex or lemma) with a retry, should include, e.g.: "Ihr zuverlässiger Partner", "Qualität steht bei uns an erster Stelle", "mit Leidenschaft", "maßgeschneiderte Lösungen", "rundum sorglos", "Ihr Wohlbefinden liegt uns am Herzen", "Herzlich willkommen auf unserer Website", "Tradition trifft Moderne", "Wir freuen uns auf Ihren Besuch" as a closing line, unverifiable superlatives ("die beste …", "Nr. 1"), and English buzzwords. This fits § 5 UWG ("nur belegte Aussagen") as well as taste.
- Specificity from real data: the street, district (Stadtteil), opening hours, OSM tags (e.g. `cuisine=*`, `craft=*`), payment options, accessibility tags, and themes from the review text. Concrete nouns from the sector ("Fliesenspiegel", "Balayage", "Mittagstisch") make copy feel bespoke. Facts must be traceable to a source field, which the existing truth check can enforce.
- Keep the design prompt short and cached (prompt caching), and pass sector context as structured data rather than prose. Anthropic's note on context bloat supports small, on-demand instructions.

### Gaps
- No primary Vercel v0 documentation was fetched in this session (budget limit), so v0's system-prompt and design approach is not covered here.
- No study found that measures conversion lift from "non-generic" copy for local-business sites specifically.

## 4. Imagery without own photos (stock licensing, treatment, AI images, alternatives)

### Takeaway
Unsplash and Pexels both allow free commercial use without attribution, but neither clears identifiable people, trademarks, logos or buildings, and both forbid building a competing image service. For a demo implying "this is your business", the larger risk is lauterkeitsrechtlich (UWG): images that suggest real work or real premises of the business can mislead. Best practice is generic atmosphere, material or detail imagery with a consistent treatment (duotone, grade, crop), clearly not "their" work. Typography- and texture-led designs reduce dependence on photos. AI-generated images that suggest real products or real work carry irreführungs risk, and the EU AI Act transparency duties (Art. 50) apply from 02.08.2026, with sources disagreeing on their scope.

### Cited Findings
- Unsplash license: free use for commercial and non-commercial purposes, with no permission or attribution needed (attribution is appreciated). Restrictions: "Images cannot be sold without significant modification", and no "Compiling images from Unsplash to replicate a similar or competing service." The license page does not address trademarks, people or property. — [Unsplash License](https://unsplash.com/license)
- Pexels: identifiable people "may not appear in a bad light or in a way that is offensive". Pexels' terms say the license does not cover "identifiable people, logos, brands of all kinds …, goods or services, buildings and architecture …". Unaltered copies cannot be sold. Third-party summaries say users must not imply endorsement by a depicted person or brand, and that model releases are not guaranteed. — [Pexels Terms of Service](https://pexels.com/terms-of-service); [Pexels Help: rules for using content](https://help.pexels.com/hc/en-us/articles/360042332714-What-are-the-rules-for-using-Pexels-photos-or-videos) (search snippet; page returned 403); [licenseorg: free stock licensing traps](https://licenseorg.com/blog/free-stock-photos-licensing-traps)
- Pexels: photos with identifiable people or trademarks may not be used to promote political parties or candidates. — [Pexels Help: political campaigns](https://help.pexels.com/hc/en-us/articles/360043229813-Can-I-use-photos-and-videos-from-Pexels-in-a-political-campaign)
- UWG: misleading product depiction can be an unfair act under § 5 UWG, with Abmahnung risk from competitors and associations. A misleading impression can also come from omitting material information (§ 5a). A label should sit in or on the image, not only in the description text. — [Händlerbund: KI-Bilder kennzeichnen](https://ohn.haendlerbund.de/haendlerbund-news/ki-bilder-amazon-kennzeichnen); [Fieldfisher: Generative KI im Marketing](https://www.fieldfisher.com/de-de/locations/germany/insights/generative-ki-im-marketing-neue-transparenzpflichten)
- Product images must show the offered product accurately in its essential properties, and over-editing can mislead. A common practice is real photos as the main image, with AI scenes only as clearly secondary lifestyle images. — [Xictron FAQ: Produktfotos rechtlich](https://www.xictron.com/de/faq/was-ist-bei-produktfotos-rechtlich-zu-beachten/); [IT-Recht Kanzlei: KI-Hinweis kann Kaufbereitschaft senken](https://www.it-recht-kanzlei.de/ki-hinweis-kann-kaufbereitschaft-senken.html)
- EU AI Act transparency obligations apply from 02.08.2026. Sources disagree on scope: some say generated images must be recognizable as such, while e-recht24 limits the labelling duty to deepfakes. The regulation text (Art. 50) was not checked in this session. — [NRW.Bank: KI-Verordnung ab 2. August 2026](https://www.nrwbank.de/de/unternehmen/nrw-bank-innovationspartner/aktuelles/ki-verordnung-ab-2-august-2026-gilt-die-kennzeichnungspflicht); [e-recht24: KI-Bilder rechtlich](https://www.e-recht24.de/ki/13543-ki-bilder-erstellen-rechtliches.html); [ZAW Handreichung KI-VO, Stand 20.07.2026](https://zaw.de/app/uploads/2026/07/Handreichung_KI-VO_Stand_20Juli2026.pdf)
- IT-Recht Kanzlei reports that an AI label can lower purchase willingness, which is a trade-off when using AI imagery. — [IT-Recht Kanzlei](https://www.it-recht-kanzlei.de/ki-hinweis-kann-kaufbereitschaft-senken.html)
- Anthropic's guidance favors atmosphere through layered gradients, geometric patterns and textures over flat solid colors, which supports typography- and texture-led layouts. — [Claude blog](https://claude.com/blog/improving-frontend-design-through-skills); Open Props ships noise textures and masks usable for that. — [Open Props](https://open-props.style/)

### Inferences
- Build a curated, versioned image library per sector, stored locally (which also avoids hot-linking and API rate limits). For each image record the source URL, photographer, license and download date. Allow only images without identifiable faces, logos, readable brand names or recognizable buildings. Prefer details, materials, tools, ingredients, textures and hands (no faces). Unsplash's "no competing service" clause means the library should stay internal, not a browsable gallery.
- Apply a consistent treatment per kit at build time (e.g. sharp/libvips: duotone mapped to the accent's step 9 and 12, a fixed grade, grain overlay, fixed aspect crops with art-directed focal points). Different source photos then look like one shoot and match the palette, which is a strong "bespoke" signal.
- Label or caption images as "Beispielbild" / "Symbolbild" in demos so they are not read as the business's own work or premises. This is consistent with the project's existing § 5 UWG rule and the "Leistungen als Beispiel gekennzeichnet" rule in CLAUDE.md 5.2.
- Avoid AI-generated photorealistic images of "work results" (a finished bathroom, a haircut, a dish) entirely: an uncanny look plus Irreführung risk. If AI is used, use it only for abstract textures, patterns or illustrations that make no factual claim.
- Typography-led kits (big display type, a sector pictogram set, a map tile of the real street, opening hours as a design element) sidestep photo issues and often look more bespoke than stock.

### Gaps
- The full Pexels license text could not be fetched (403); endorsement wording comes from third-party summaries.
- No German case law found specifically on stock photos in website demos or mock-ups sent to prospects. The legal assessment is inferred from general § 5/5a UWG commentary; a lawyer check is advisable.
- Art. 50 KI-VO scope for non-deepfake AI images was not verified against the regulation text.

## 5. Quality gates: automated visual quality checks

### Takeaway
Deterministic gates (Lighthouse, axe, contrast checks, layout heuristics on rendered DOM at 390/1440 px) should be blocking. Screenshot critique by vision LLMs is useful as an advisory signal but is clearly below human experts: zero-shot comments are mostly invalid, few-shot plus visual prompting helps substantially, and it still trails humans. Use it as a ranked "suspicion list" for the review queue, not as an auto-approve.

### Cited Findings
- UICrit (983 mobile UIs with expert critiques, using Gemini Pro Vision): zero-shot produced 5,927 comments, of which only 13.1% were valid. The best setup (8 few-shot examples selected by visual and task similarity, plus screenshots with edge coordinates) raised average comment quality from 0.31 to 0.48 (a 55% gain, p = 5e-4). Human critiques scored 0.75, and participants preferred human comment sets 81% of the time. Critique generation and localization worked better as separate LLM calls. Localization IoU was about 0.004 with the screenshot alone vs about 0.19–0.22 with edge coordinates or numbered patches; a grid overlay was worst. Inter-rater agreement was only fair (Fleiss' κ ≈ 0.29–0.31). — [UICrit, arXiv 2407.08850](https://arxiv.org/html/2407.08850v3)
- Iterative visual prompting for design critique (Duan et al., Dec 2024) produces region-grounded UI comments and outperformed baselines across two multimodal tasks. — [arXiv 2412.16829](https://arxiv.org/html/2412.16829v2) (search summary)
- A July 2025 comparison of multimodal-LLM vs human heuristic evaluation (Zhong et al.) found that synthetic evaluation struggled with recognizing some UI components and conventions, and with identifying violations that span screens. — reported in search results around [UICrit](https://arxiv.org/html/2407.08850v3) and related work; not fetched directly
- The frontend-design skill's own quality floor: responsive layout, visible focus states, reduced-motion support, accessibility, harmonious color, review with screenshots, and removing unnecessary decoration. It also warns about CSS specificity conflicts in section spacing. — [anthropics/skills frontend-design SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md) (paraphrased)
- Radix scale contrast guarantees (APCA Lc 60/90 for steps 11/12 on step 2) can serve as a design-time contrast gate. — [Radix Colors](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)

### Inferences
- Proposed gate pipeline per demo (Playwright is already in the stack):
  1. Static: HTML validity, banned-phrase scan, truth check (existing), every image has alt text and a license record.
  2. Rendered DOM at 390×844 and 1440×900: no horizontal overflow (`scrollWidth > clientWidth`), no text overflow or clipping (elements whose `scrollHeight > clientHeight` with `overflow:hidden`), tap targets ≥ 44 px, minimum font size, max line length (characters per line), headline wrap check (no single-word widows in the hero), image aspect and focal crop present, hero above the fold.
  3. axe-core (WCAG 2.1 AA) and Lighthouse (performance, accessibility, best practices, SEO ≥ 90), already required by CLAUDE.md 5.2.
  4. Diversity gate: perceptual hash or embedding of the desktop screenshot compared with the last N demos of the same sector. Too similar → re-pick kit or variants.
  5. Vision-LLM critique (advisory): a fixed rubric (hierarchy, rhythm, contrast, "looks templated/AI-ish", sector fit), few-shot with the operator's own past approve/reject screenshots (UICrit shows similarity-selected few-shot matters), and separate calls for "find issues" and "localize". The output goes to the review queue as notes and a score, never as auto-approval.
- Because inter-rater agreement on design is only fair even among humans (κ ≈ 0.3), use the operator's approvals (the first 30 manual reviews per CLAUDE.md) as the ground truth to calibrate the rubric and few-shot set.

### Gaps
- Lighthouse and axe docs were not fetched in this session. Their thresholds and rule sets are standard but not re-verified here.
- No published benchmark found for Claude vision models specifically on UI aesthetic critique; UICrit used Gemini Pro Vision.
- No validated automated metric for "looks AI-generated/generic" was found; the diversity gate above is an inference.

## 6. Evidence and case studies on AI site-builder output quality

### Takeaway
Evidence is mostly anecdotal: affiliate-style reviews from 2024–2026 and vendor marketing. The consistent theme is fast, structurally sound, visually generic output with generic or robotic copy that needs human refinement. Framer is seen as the most design-first. Anthropic's own blog is the most credible primary source on why LLM design output converges to generic defaults and how constraints counteract it. Academic work on automated UI critique shows LLMs are still well below human designers.

### Cited Findings
- Wix: "unmistakably a Wix site", predictable layouts, safe typography and generic filler copy, often requiring "significant human refinement". — [DEV: AI builders tested](https://dev.to/fredy/i-tested-the-most-popular-ai-website-builders-heres-what-i-found-4on8); [Kaizen](https://kaizen-website-eks.pages.dev/blog/builders-perspective/tested-ai-builders)
- Durable: fastest ("complete website in under a minute"), but the text "may feel robotic", there is no code export ("walled garden"), and the output stays template-like. — [DEV: Best AI website builders 2026](https://dev.to/techsifted/best-ai-website-builders-in-2026-tested-and-ranked-43ln); [softpicker](https://softpicker.com/best-ai-website-builders/)
- Hostinger AI builder: generic output is its main downside. — [State of Digital Publishing](https://www.stateofdigitalpublishing.com/digital-platform-tools/hostinger-builder-review/)
- 10Web: AI output "feels basic". — [aitoolduels: Wix vs Hostinger vs 10Web](https://aitoolduels.pages.dev/ai-website-builder-tools-wix-vs-hostinger-vs-10web)
- Relume: structurally strong, visually generic, from a fixed 1,000+ component library. — [Durable: Relume review](https://durable.com/ai-tools/relume-review); [Hack Design](https://www.hackdesign.org/toolkit/relume/)
- Framer: described as "design-first … visually polished and modern". Framer's AI agent can review pages for SEO gaps, accessibility, layout problems and responsive details (vendor claim). — [Framer AI designer](https://www.framer.com/solutions/ai-designer/)
- Anthropic's with/without-skill comparisons (SaaS landing page, blog, dashboard) show "distinctive typography, cohesive color scheme, and layered backgrounds" with the skill. These are qualitative captions, not measured metrics. — [Claude blog](https://claude.com/blog/improving-frontend-design-through-skills)
- Sitebuilderreport publishes prompt-to-website example galleries, useful as a visual reference for typical builder output. — [Sitebuilderreport: AI prompt to website examples](https://www.sitebuilderreport.com/ai-prompt-to-website-examples) (not fetched)

### Inferences
- The project's competitive edge over these builders is not a bigger component library. It comes from three things: (1) curated sector kits with real art direction, (2) grounding in verified local data, and (3) a human review step for the first demos. That combination addresses exactly the failure modes the reviews describe (generic look, filler copy).
- Since prospects compare the demo against what they would get from Wix or Jimdo-like builders, avoiding the recognizable "builder look" (centered hero + 3 icon cards + testimonial slider + generic stock team photo) is itself a differentiator.

### Gaps
- No controlled, same-prompt, cross-builder study with blind human ratings was found.
- No data found on conversion rates of AI-built vs designer-built sites for local businesses.
- Many review sources are SEO and affiliate content of uncertain independence; treat their quotes as indicative only.
