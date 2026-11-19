# Edge and static architectures for a purchase flow with no cold start (Netlify, late 2026)

Scope: the customer path "Übernehmen" → plan choice → Stripe Checkout, on Netlify Personal (credits), Next.js 16 App Router, Supabase Postgres (Frankfurt), Stripe Checkout Sessions. Measured locally: cold Lambda about 9–10 s, warm about 0.6 s. The Edge gatekeeper for QR scans takes about 0.2 s.
Research date: 19.11.2026. Sources are cited inline. Estimates are labelled **(estimate)**.

## 1. Can the plan-choice page be fully static or cached, so only the "pay" click needs compute?

### Takeaway
Yes, with one condition. The page must not depend on a cookie or draft. Today it is dynamic because `/d/{slug}/uebernehmen` creates a draft and sets a cookie. If the draft and order are created only on the "pay" click, `/einrichten/{slug}` becomes a pure per-slug page. It can then come from the Next.js Full Route Cache (ISR) or from an Edge Function with `cache: "manual"`. Netlify's durable cache works only for serverless function responses, not Edge Function responses. After every deploy, the first request per page invokes the function once, so a deploy can trigger a cold start unless the pages are warmed or served from the Edge.

### Cited Findings
- Netlify's Next.js adapter states: "static page responses are automatically cached at the edge and can be revalidated by path or by tag". App Router and Pages Router support on-demand and time-based revalidation. — [Netlify Next.js overview](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)
- On SSG/prerendered pages: "Pre-rendered pages are stored in Next.js route cache, and fetched from the route cache by a function invocation when first accessed after a deploy." The first request per page after each deploy therefore goes through the Lambda. — [Netlify Next.js overview](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)
- The adapter provisions one serverless function for SSR, ISR, PPR, route handlers and **Server Actions**. Server Actions have "Full Support", but they run in the Lambda. — [Netlify Next.js overview](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)
- Durable cache: "The durable cache is currently only compatible with Netlify Function responses. The `durable` directive has no effect on responses from Netlify Edge Functions." Next.js on Next Runtime 5.5.0+ uses durable automatically for cacheable responses. — [Netlify caching overview](https://docs.netlify.com/build/caching/caching-overview/)
- Durable does not guarantee exactly one function call per page version ("we do not guarantee that there's always only a single function call for each version of a generated page"). — [Netlify caching overview](https://docs.netlify.com/build/caching/caching-overview/)
- Cache tags: the `Netlify-Cache-Tag` header plus purge by API or `purgeCache()` from `@netlify/cache`. The rate limit is 2 purges per 5 s per tag or site. — [Netlify caching overview](https://docs.netlify.com/build/caching/caching-overview/)
- `Netlify-Vary: cookie=<name>` varies the cache on specific cookie keys rather than the whole Cookie header. This allows caching even when a cookie exists, but each cookie value gets its own cache entry. — [Netlify caching overview](https://docs.netlify.com/build/caching/caching-overview/)
- Edge Function responses become cacheable only with **both** `cache: "manual"` and cache headers (e.g. `cache-control: public, s-maxage=3600`). Cached responses do not count as invocations. Atomic deploys: "`s-maxage`, `max-age`, and `Expires` are voided by a new deploy". — [Netlify Edge Functions optional configuration](https://docs.netlify.com/build/edge-functions/optional-configuration/), [Netlify Edge limits](https://docs.netlify.com/build/edge-functions/limits/)

### Inferences
- The cleanest move is to separate "show" from "act". `/d/{slug}/uebernehmen` becomes a plain redirect: the Edge gatekeeper can do it as a 302/303, or a static redirect works. `/einrichten/{slug}` becomes a page with no cookie, carrying the per-slug data that appears on the offer card: company name, demo screenshot and plan prices. The draft and order row are written only on the "pay" click (Section 2). The "Einrichtung vor der Zahlung" feature (private drafts, `/einrichten/[slug]`) would then need an anonymous form state, for example in localStorage or as hidden fields. It would be saved only on submit.
- Option 1a (smallest change): `/einrichten/[slug]` as ISR with `revalidatePath`/`revalidateTag` on demo publish and change. The durable cache then serves it. Remaining risk: after each deploy, the first request per slug invokes the function. Mitigation: a post-deploy warm-up script that requests all active slugs once (only ~40–300 active demos). Its cost is a few seconds of compute per deploy. **(estimate)**
- Option 1b (no Lambda at all): the existing Edge gatekeeper, or a second Edge Function, renders the plan page itself. It fetches per-slug data from Supabase PostgREST, or reads a small JSON file per slug from the deploy/blob store, and fills a fixed HTML template. With `cache: "manual"` plus `s-maxage`, the edge caches the page. Edge Functions are not affected by "first invocation after deploy", but an Edge cache miss after a deploy costs one PostgREST round trip from Deno, roughly 50–150 ms **(estimate)**, not a 10 s Lambda cold start.
- Netlify does not document whether a cached ISR page served from the CDN still runs any function (it is implied, not stated). Measure it: `x-nf-request-id` / `cache-status` response headers, plus function logs.

### Gaps
- No official Netlify statement was found on whether durable cache entries for Next.js ISR survive a new deploy. The atomic-deploy wording above suggests they do not.
- Next.js 16 is not named explicitly on the Netlify page ("tested with every Next.js release").

## 2. Can a Netlify Edge Function (Deno) create the Stripe Checkout Session and write the order row?

### Takeaway
Feasible and the strongest "free" option. Call the Stripe REST API with plain `fetch` (form-encoded, with an `Idempotency-Key` header) and write the order row through Supabase PostgREST, ideally a single `rpc()` call to a Postgres function. Waiting for I/O does not count toward the 50 ms CPU limit, and the response-header timeout is 40 s. Netlify does not document raw TCP Postgres drivers on Edge. Use HTTP (PostgREST/supabase-js), not `postgres`/`pg`. The risk is duplicated business logic: plan → price IDs, consent, success/cancel URLs, metadata.

### Cited Findings
- Netlify Edge limits: CPU **50 ms per request**, and "Time spent waiting for resources or responses is excluded". Response header timeout **40 s**. Memory 512 MB. Code 20 MB compressed. No separate wall-time limit is listed. — [Netlify Edge limits](https://docs.netlify.com/build/edge-functions/limits/)
- Edge Functions support Node built-ins (`node:` prefix) and Deno modules. "Support for npm packages is in beta", and packages with native binaries (e.g. Prisma) may fail. Raw TCP (`Deno.connect`) is not documented; the Web API list includes WebSocket but no socket API. — [Netlify Edge API](https://docs.netlify.com/build/edge-functions/api/)
- Secrets are read with `Netlify.env.get("NAME")`. The env var scope must include **Functions**. `context.waitUntil()` exists, but its work also counts against the CPU limit. — [Netlify Edge API](https://docs.netlify.com/build/edge-functions/api/)
- Edge Function requests are billed as web requests: **2 credits per 10,000**, with no compute charge. Serverless compute costs 10 credits/GB-hour. Personal = 1,000 credits/month, and all projects pause when credits run out (auto-recharge 500 credits for $5 is optional). — [Netlify credits](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)
- Stripe API `POST /v1/checkout/sessions` accepts `client_reference_id` (≤ 200 characters), `metadata`, `expires_at`, `mode`, `line_items[].price`, `subscription_data`, `consent_collection`, `custom_text`, `locale` and more. The current doc version shows `Stripe-Version: 2026-10-28.endive`. — [Stripe API: Create Checkout Session](https://docs.stripe.com/api/checkout/sessions/create)
- stripe-node runs on Deno/Workers with `Stripe.createFetchHttpClient()`. For webhook verification on Web Crypto, use `createSubtleCryptoProvider()` together with `constructEventAsync()`, because sync `constructEvent()` fails there. These are mostly secondary sources (Stripe dev.to post, Cloudflare blog, community). — [Stripe dev.to: stripe-node with Deno](https://dev.to/stripe/stripe-node-with-deno-1fc4), [Cloudflare blog: Stripe support in Workers](https://blog.cloudflare.com/announcing-stripe-support-in-workers), [Supabase Stripe webhook example](https://supabase.com/docs/guides/functions/examples/stripe-webhooks)
- Supabase's troubleshooting docs say Stripe imports via esm.sh on Deno sometimes need `?target=deno`. — [Supabase troubleshooting: esm.sh/Stripe](https://supabase.com/docs/guides/troubleshooting/importing-stripe-or-other-modules-from-esmsh-on-deno-edge-functions-throws-an-error-TmbB5p.md)

### Inferences (implementation sketch)
- **Route:** `POST /kaufen` (or `/einrichten/{slug}/bezahlen`) → Netlify Edge Function `checkout-edge` (path-scoped in `netlify.toml` or with an inline `config.path`). The plan page sends a plain HTML `<form method="post">` with `slug`, `plan`, the consent checkboxes and a random `attempt_id` (hidden field, generated client-side). This works without JS and needs no Server Action.
- **Steps (about 3 HTTP calls, < 5 ms CPU (estimate)):**
  1. Validate input (allow-list of plans; slug format; consent boxes set).
  2. `POST {SUPABASE_URL}/rest/v1/rpc/create_checkout_order` with the service-role key from `Netlify.env.get`. The function is a Postgres `SECURITY DEFINER` function that checks the demo status (published, not expired, not suppressed, kill switch off). It inserts or returns an existing order (`UNIQUE(attempt_id)` → idempotent), resolves the price/Stripe price ID from `settings`, and returns `{order_id, price_id, mode, …}`. All the business rules stay in **one** place, the DB function, rather than two (Next + Edge).
  3. `fetch("https://api.stripe.com/v1/checkout/sessions", {method:"POST", headers:{Authorization:"Bearer "+key, "Idempotency-Key":"order_"+order_id, "Stripe-Version": pinned}, body:URLSearchParams})` with `client_reference_id=order_id`, `metadata[order_id]`, `metadata[slug]`, `expires_at=now+30–60 min`.
  4. PATCH the order with `stripe_session_id` (or skip it and let the webhook do it via `client_reference_id`), then `303 Location: session.url`.
- **Latency:** Edge (FRA) → Supabase FRA about 20–60 ms. Stripe session create about 300–800 ms **(estimate; no official Stripe latency figure found)**. Total about 0.4–1 s, versus 9–10 s cold or 0.6 s warm on Lambda.
- **Fallback:** If the Edge call fails (Stripe 5xx, timeout), 303 to the existing Lambda route or Server Action. Netlify's `onError: "bypass"`/rewrite exists in the Edge config ([optional configuration](https://docs.netlify.com/build/edge-functions/optional-configuration/)). The current flow stays as a backup.
- **Webhooks** (`checkout.session.completed` etc.) can stay in the Lambda. They are asynchronous and Stripe retries them, so a cold start there does not affect the customer.
- **Secrets:** use a Stripe **restricted key** with only "Checkout Sessions: write" for the Edge Function, not the full `sk_live`. That limits the damage if it leaks. (Stripe restricted keys are standard; no page was fetched in this session, so verify the exact permission names.)
- **Recommended raw `fetch` over the stripe-node SDK on the Edge:** smaller bundle, no npm-beta risk, and parse CPU time stays well under 50 ms.
- **Risks:** (a) drift between the Edge and Next logic, reduced by the DB function; (b) Edge Functions do not run when Netlify Split Testing is active ([Edge limits](https://docs.netlify.com/build/edge-functions/limits/)); (c) a service-role key in the Edge runtime has the same trust level as in the Lambda today; (d) an operator who is not technical gets one more deploy-time component. It deploys with the site, so there is no extra service.

### Gaps
- No official figure for the p50/p95 latency of Stripe Checkout Session creation.
- No Netlify statement on Deno version or `Deno.connect`. `postgres.js`/`pg` on Netlify Edge is therefore unverified (avoid it).

## 3. Payment Links or pre-created Checkout Sessions instead?

### Takeaway
Pre-creating sessions when a demo is published is impossible: `expires_at` is at most 24 h, and demos run 30 days. Payment Links per plan (2–3 fixed links) remove compute from the click entirely: the button is a plain `<a href>` with `?client_reference_id=<slug-or-draft>`. The order is then created only from the webhook. The cost is flexibility: per-customer metadata, the dynamic billing start "after go-live" and server-side pre-checks (expired demo, suppression list, kill switch) all fall away or move to the webhook.

### Cited Findings
- `expires_at`: "anywhere from 30 minutes to 24 hours after Checkout Session creation. By default, this value is 24 hours from creation." — [Stripe API: Create Checkout Session](https://docs.stripe.com/api/checkout/sessions/create)
- Payment Links accept `client_reference_id` as a URL parameter (alphanumeric, `-`, `_`, ≤ 200 characters; invalid values are **silently dropped**). It arrives in the `checkout.session.completed` webhook. Stripe warns that links with parameters can be shared further. — [Stripe: Payment Link URL parameters](https://docs.stripe.com/payment-links/url-parameters)
- Payment Links redirect after payment via `after_completion[type]=redirect`. UTM parameters are passed through to the redirect URL. — [Stripe: Payment Link URL parameters](https://docs.stripe.com/payment-links/url-parameters)
- Stripe recommends listening for further events for delayed payment methods (SEPA, 2–14 days) as well as `checkout.session.completed`. — [Stripe: Payment Link URL parameters](https://docs.stripe.com/payment-links/url-parameters)

### Inferences
- A **hybrid** is possible: pre-create a session at scan time (Edge gatekeeper, `context.waitUntil`) with a 24 h lifetime. Each scan would then create an open session and an order draft, mostly wasted, plus Stripe API calls for scanners who never buy. It is also unclear which plan the customer will pick, so it would need two sessions. Not recommended.
- Payment Links fit badly with today's model (Basis/Care+ with "monthly start only after confirmed go-live", mandate consent, private drafts before payment, B2B/AGB checkboxes). Whether Payment Links support `subscription_data.trial_end`/`billing_cycle_anchor` dynamically, or mandatory checkbox fields, was **not verified**. `custom_fields` on Checkout allows at most 3 fields ([Create Checkout Session](https://docs.stripe.com/api/checkout/sessions/create)), but no checkbox type was documented. → Option 2 (Edge + Session API) keeps full control and is just as fast.
- Payment Links make sense only as an **emergency fallback**, for example if Supabase is unavailable. The plan page could then show static links, and the order would be reconstructed later from the webhook and `client_reference_id`.

### Gaps
- Payment Link support for setup fee + delayed subscription start (V4: 597 € + 19/99 €/month from go-live) was not checked.

## 4. Supabase Edge Functions as the checkout endpoint

### Takeaway
A technically good alternative. Cold boot is now about 42 ms on average, 86 ms at p95 and 460 ms at p99 (Supabase, July 2025). The free plan includes 500,000 invocations per month, and the function can be pinned to `eu-central-1` (Frankfurt), next to the database. Compared with the Netlify Edge Function, the downsides are a second deploy target with its own CLI and secrets, and the free-project pause after 1 week of inactivity (not relevant while the worker is active daily).

### Cited Findings
- Boot-time benchmark after "persistent storage" (Supabase blog, 18.07.2025): average 870 → **42 ms**, P95 8,502 → **86 ms**, P99 15,069 → **460 ms**, worst case 24,300 → 1,630 ms. Spikes > 1 s: 47% → 4%. — [Supabase blog](https://supabase.com/blog/persistent-storage-for-faster-edge-functions)
- Limits: memory 256 MB. Wall clock 150 s on Free, 400 s on paid plans. **CPU 2 s per request** (async I/O not counted). Request idle timeout 150 s. Function size 20 MB via CLI or 5 MB via Dashboard. 100 functions on Free. 100 secrets per project. — [Supabase Edge Function limits](https://supabase.com/docs/guides/functions/limits)
- Pricing: Free plan includes **500,000** Edge Function invocations per month. Projects pause "After 1 week of inactivity". Pro costs from $25/month with 2M invocations, then $2 per million. — [Supabase pricing](https://supabase.com/pricing)
- Region: by default "the region closest to the user". Force Frankfurt with the header `x-region: eu-central-1`, or with the query parameter `forceFunctionRegion` when headers are not possible (form POST, webhooks). A pinned region is **not** automatically re-routed during an outage. — [Supabase regional invocation](https://supabase.com/docs/guides/functions/regional-invocation)
- Third-party cold-start figures vary widely (12 ms to 400 ms median) and are poorly documented. Measure with the "Booted" log event. — [Supabase troubleshooting: Edge Function takes too long](https://supabase.com/docs/guides/troubleshooting/edge-function-takes-too-long-to-respond.md)

### Inferences
- An HTML form can POST directly to `https://<ref>.supabase.co/functions/v1/checkout?forceFunctionRegion=eu-central-1`, and the function answers 303 to Stripe. Supabase functions verify a JWT by default, so for a public form endpoint JWT verification must be turned off (`--no-verify-jwt`, as I recall from Supabase's CLI docs; not fetched in this session) and replaced with your own checks (rate limit, slug check).
- The domain is `*.supabase.co`, not your own domain. A custom domain is a paid add-on (not checked). For a customer this is invisible because it redirects straight to Stripe.
- Advantage over Netlify Edge: 2 s CPU instead of 50 ms, and a direct DB connection (supabase-js, or even a Postgres driver) in the same region. Disadvantage: a second platform for an operator who is not technical. Netlify Edge is enough for the CPU needs here, which are tiny.

### Gaps
- Official Supabase pages (not just the blog) do not give a guaranteed cold-start SLA.

## 5. Predictive warm-up (ping on scan or scroll): does it help?

### Takeaway
It helps partially and is cheap, but it is not guaranteed. A Lambda environment serves **one** request at a time. A user request that arrives while the warm-up ping's environment is still initializing starts a **second** environment, which means another cold start. A ping fired at the **scan** is early enough: the gap between scan and "Übernehmen" is almost always > 10 s **(estimate)**. A ping fired on scrolling to the price section is often too late with a 9–10 s init. Because the Netlify Next.js adapter puts all SSR, ISR and Server Actions into **one** function, a ping to any cheap dynamic route warms the checkout path too.

### Cited Findings
- AWS: execution environments handle one invocation at a time. For concurrent requests Lambda creates more environments, each with its own possible cold start. — [AWS Compute Blog: Operating Lambda performance optimization part 1](https://aws.amazon.com/blogs/compute/operating-lambda-performance-optimization-part-1)
- AWS: "For functions using on-demand concurrency, Lambda might occasionally initialize execution environments ahead of invocation requests … We recommend you to not take a dependency on this behavior." — [AWS Lambda execution environment](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)
- AWS: "The `Init` phase is limited to 10 seconds. If all three tasks do not complete within 10 seconds, Lambda retries the `Init` phase at the time of the first function invocation with the configured function timeout." — [AWS Lambda execution environment](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)
- AWS: after the invocation, the environment is frozen and kept "for a period of time"; "Lambda terminates execution environments every few hours … even for functions that are invoked continuously." Typical cold start: "from under 100 ms to over 1 second". Biggest factors: package size, amount of init code, connection setup. — [AWS Lambda execution environment](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)
- Netlify adapter: one serverless function for SSR, ISR, PPR, route handlers and Server Actions. — [Netlify Next.js overview](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)
- Netlify Edge: `context.waitUntil()` lets work run on without delaying the response. It is still subject to the CPU limit, but waiting for I/O does not count. — [Netlify Edge API](https://docs.netlify.com/build/edge-functions/api/), [Netlify Edge limits](https://docs.netlify.com/build/edge-functions/limits/)

### Inferences
- A measured 9–10 s cold start is far above AWS's typical value (< 100 ms to > 1 s) and close to the **10 s init limit**. That points to a very large bundle or expensive top-level initialization (Next server boot, DB pool, SDK imports). If init exceeds 10 s, AWS repeats it on invocation, which makes things even slower. Slimming the bundle (lazy imports, no DB connect at top level) is a lever independent of the architecture.
- Scan-ping sketch: the Edge gatekeeper does `context.waitUntil(fetch(origin + "/api/warm", {method:"HEAD"}))` before the 302. `/api/warm` must be a dynamic route in the same server handler, return immediately and touch no DB. Cost: about 10 s × 1 GB ≈ 0.003 GB-h ≈ 0.03 credits per cold ping **(estimate, assuming 1 GB memory)**, so negligible.
- Limits of scan-pinging: (a) Netlify may route the ping and the real request to different AZs or instances, with no guarantee; (b) after the "some time" retention window (AWS gives no number; community folklore says 5–15 min, **unconfirmed**), the environment is cold again if the customer only clicks later; (c) it does not fix concurrent requests (two prospects at once).
- Pinging on scroll or hover over the price section helps only if init (9–10 s) is shorter than the time to the click. That fits for slow readers but not for fast clickers. It makes sense as a **second** ping (refresh) in addition to the scan ping.
- Conclusion: the warm-up is a cheap stopgap, but **only Option 2 (Edge checkout) removes the Lambda from the critical path completely**.

### Gaps
- No public AWS or Netlify statement on routing to an environment that is still initializing; only the "one request per environment" principle is documented.
- No documented idle time before AWS freezes and removes an environment.

## 6. A Cloudflare Workers (free) mini checkout service

### Takeaway
It works technically: 100,000 requests/day free, isolates with no relevant cold start, Stripe documented in Workers. However, the free plan allows only **10 ms CPU** per request. That is enough with raw `fetch`, but tight with the full stripe-node SDK. Compared with the Netlify Edge Function it adds a third platform and a cross-domain hop, without a speed advantage. It is worth considering only if Netlify Edge is ruled out.

### Cited Findings
- Workers Free: **100,000 requests/day**, **10 ms CPU** per HTTP request, 50 subrequests per request, 128 MB memory, 64 MiB script (uncompressed), 1 s startup time. When the limit is exceeded, error 1027, either "fail open" (Worker bypassed) or "fail closed". The counter resets at midnight UTC. — [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- Stripe SDK in Workers with `Stripe.createFetchHttpClient()`. Webhooks via `constructEventAsync` and SubtleCrypto. — [Cloudflare blog](https://blog.cloudflare.com/announcing-stripe-support-in-workers)

### Inferences
- Flow identical to Option 2. Without a domain on Cloudflare, it runs under `*.workers.dev` (form POST cross-site, 303 to Stripe). A custom route needs the domain's DNS on Cloudflare.
- Cost: €0 at this volume (< 100 requests/day).
- Risk for an operator who is not technical: another account, secrets in two places, a separate deploy (wrangler).

### Gaps
- Not measured whether stripe-node stays under 10 ms CPU on Workers Free when parsing and initializing (to be safe, use raw fetch).

---

## Overall comparison (for the report writer)

| Option | Click latency | Monthly cost | Complexity | Risk |
|---|---|---|---|---|
| A. Status quo + scan ping (waitUntil) | 0.6 s if hit, otherwise 10 s **(estimate)** | ≈ 0 | very low | not guaranteed |
| B. Plan page as ISR + durable cache + post-deploy warm-up | page instant; pay click still Lambda | ≈ 0 | low | first hit after deploy, pay click cold |
| C. **Plan page + pay click as a Netlify Edge Function** (PostgREST RPC + Stripe fetch) | ~0.4–1 s **(estimate)** | ≈ 0 (2 credits/10k requests) | medium (one Edge Function + one DB function) | logic drift, mitigated by the DB function; npm beta avoided |
| D. Supabase Edge Function as the checkout endpoint | ~0.4–1 s + boot 42 ms avg | €0 (500k free) | medium + 2nd platform | free-project pause, JWT off |
| E. Cloudflare Worker | ~0.4–1 s | €0 | medium + 3rd platform | 10 ms CPU on free |
| F. Stripe Payment Links | instant (plain link) | €0 | low | loses dynamic plan logic and pre-checks |

Recommendation from the findings (inference): **C** as the target architecture, with the existing Server Action as the fallback route. In addition, **A** (scan ping) as a cheap interim step and for the remaining Lambda pages (onboarding, success page). Also slim down the Lambda's init (9–10 s, close to the AWS 10 s init limit).
