# Netlify Next.js cold starts: causes, credit costs, and cheaper alternatives (as of Nov 2026)

Context assumed throughout: Next.js 16.4 App Router on Netlify with @netlify/plugin-nextjs 5.16. Everything runs in one "Next.js Server Handler" Lambda (1024 MB, region cmh/Ohio, bundle about 90 MB) on the Netlify Free plan, which has a hard cap of 300 credits/month. The database is Supabase Postgres in the EU. Measured on this system: cold start 9–11 s; about 1.3 s per keep-warm ping when pinging every 4 min, with occasional full 9 s cold starts; 0.1–0.3 s when pings are seconds apart. The VPS is a Contabo machine in Germany (Docker, Node 22, Caddy). Budget is 0 €.

## 1. What drives Netlify/Lambda Next.js cold starts, and can the region be changed on Free?

### Takeaway
On a cold start the whole Next.js server has to boot: a large bundle is loaded and the framework is initialised inside one Lambda in Ohio. On top of that, every request that touches the EU database pays several transatlantic round trips. Changing the function region (for example to `fra` Frankfurt) is officially a **Pro/Enterprise feature**, so it is not available on Free.

### Cited Findings
- Netlify's server docs describe the cold-start mechanism: "When a request arrives and no instance is running, Netlify starts a new one, and the request waits for your server to start. This includes loading your entry file and running your start hooks". The documented mitigations are "Limit your entry file's top-level code…" and "Keep your server's dependencies small, since they're loaded every time an instance starts." — [Netlify docs: Server lifecycle](https://docs.netlify.com/build/server/lifecycle/)
- The same page says an instance stops "after 5 minutes without requests" and that instances "are also replaced at least every 8 hours, whether or not you deploy". It also says "A production deploy's server is already running when the deploy goes live". Note: this page documents Netlify's "server" runtime. I could not confirm that the Next.js plugin's Server Handler follows exactly these timings (see Gaps). — [Netlify docs: Server lifecycle](https://docs.netlify.com/build/server/lifecycle/)
- Netlify staff confirm that Next.js on Netlify runs on AWS Lambda, so Lambda's cold-start behaviour applies to it. Users report 6–9 s "waiting for server response" on first loads. — [Netlify forum: Very slow TTFB on first page load](https://answers.netlify.com/t/very-slow-ttfb-on-first-page-load-in-a-while/68209); [Netlify forum: DNS resolves quickly but waiting for server response is 6 seconds](https://answers.netlify.com/t/dns-resolves-quickly-but-waiting-for-server-response-is-6-seconds-on-initial-load-is-this-normal-or-a-sign-of-a-misconfiguration-from-dns/104081)
- The plugin-nextjs v5 runtime puts everything into one `___netlify-server-handler` function. Its bundle can grow large: one 2025/26 report has it exceeding the 250 MB Lambda limit after a CLI upgrade because dev dependencies were bundled. — [Netlify forum: server-handler exceeds 250 MB](https://answers.netlify.com/t/deploy-fails-after-upgrading-netlify-cli-from-v24-to-v26-netlify-server-handler-exceeds-250-mb/162829)
- After a request, AWS Lambda "retains the execution environment for a non-deterministic period of time", and warm reuse skips INIT. AWS says cold starts typically occur in "under 1% of invocations" for production workloads, but that figure is for steady traffic, not a low-traffic site. — [AWS Compute Blog: Lambda standardizes billing for INIT phase](https://aws.amazon.com/blogs/compute/aws-lambda-standardizes-billing-for-init-phase)
- **Region**: the default region for sites created after Oct 4, 2023 is `cmh` (US East, Ohio). The docs show the Region setting with the badge "This feature is available on all Pro and Enterprise plans." Self-serve regions include `fra` (Frankfurt), `dub` (Ireland) and `lhr` (London). For framework adapters such as Next.js, the region must be set in the project-level UI setting because `export const config` cannot be added to generated functions. Changing the region requires a redeploy. — [Netlify docs: Functions configuration](https://docs.netlify.com/build/functions/configuration.md)
- Netlify's own rationale for changing the region: "Deploying serverless functions close to their data sources, such as a database… can greatly reduce roundtrip time". — [Netlify docs: Functions configuration](https://docs.netlify.com/build/functions/configuration.md)
- Netlify forum staff have repeatedly said that a Pro plan is needed to change the function region. — [Netlify forum: Can I set my Netlify server location?](https://answers.netlify.com/t/can-i-set-my-netlify-server-location/41835); [Netlify forum: Slow functions, change default region?](https://answers.netlify.com/t/slow-functions-change-default-region/37670)
- Memory/vCPU configuration (1024–4096 MB) is "available on Credit-based Pro and Enterprise plans only". On Free, memory is fixed at 1024 MB. — [Netlify docs: Functions configuration](https://docs.netlify.com/build/functions/configuration.md)

### Inferences
- The 9–11 s cold start probably adds up from three parts. First, downloading and unpacking the roughly 90 MB bundle into a fresh Lambda. Second, Node module loading and Next.js server init at 1 GB memory (only a fraction of a vCPU). Third, the first Postgres connection from Ohio to the EU pooler. A Postgres+TLS connection setup needs several round trips (TCP, TLS, startup and SCRAM auth), each roughly transatlantic (on the order of 100 ms; not sourced here). So the DB connect alone plausibly costs about 0.5 s or more before the first query runs, and each query adds another round trip.
- The ~1.3 s per ping at a 4-minute interval, compared with 0.1–0.3 s for back-to-back pings, fits a pattern where the instance survives but its DB socket does not. Possible reasons: the pooler's idle timeout, or the frozen Lambda losing its TCP connections. Each ping then pays the reconnect plus the EU round trips. The occasional 9 s pings fit Lambda's non-deterministic recycling and the "replaced at least every 8 hours" behaviour.
- Even with a Pro plan and `fra` as the region, a cold Next.js boot would still take seconds. A region change removes the transatlantic DB penalty, which cuts warm latency for EU users, but it does not remove the cold start itself.

### Gaps
- I found no official Netlify number for how long a plugin-nextjs 5.x Server Handler Lambda stays warm. The "5 min / 8 h" values come from Netlify's server-lifecycle page, and I could not confirm that they apply 1:1 to the Next.js handler.
- I found no 2025–2026 benchmark that splits plugin-nextjs 5.x cold-start time into bundle load, framework init and DB connect. The original forum thread "Waiting for server response is on average 8 seconds" (answers.netlify.com/t/159870) returned 404 when fetched.
- I found no source on how plugin-nextjs 5.16 deploys a Next.js 16 `proxy.ts`, which defaults to the Node.js runtime: as an edge function or inside the Lambda. Next.js docs say Proxy "defaults to using the Node.js runtime" and a `runtime` option throws ([Next.js docs: proxy](https://nextjs.org/docs/app/getting-started/proxy.md)). If it runs inside the Lambda, the proxy cannot serve as a fast scan redirect.

## 2. How Netlify bills function compute on credit plans; whether keep-warm works; cost of pinging every 1/2/4 min

### Takeaway
Credit plans bill serverless functions at **10 credits per GB-hour**, calculated as invocation duration × memory (fixed 1 GB on Free), plus **2 credits per 10,000 web requests**. Keep-warm pinging is cheap if the ping is short, but it is unreliable: it keeps at most one instance warm and does not prevent recycling. With the measured 1.3 s per ping, a 4-minute ping costs about 41 credits/month and a 1-minute ping about 165 credits/month, more than half the 300-credit cap.

### Cited Findings
- "Compute consumes 10 credits per GB-hour", "Web requests use 2 credits per 10 thousand (10,000) requests", "Bandwidth consumes 20 credits per GB used", and "each successful production deploy consumes 15 credits". — [Netlify docs: How credits work](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)
- Free plan: "300 credits/month", "Hard limit", no auto-recharge. "Once your credit balance is completely used up, all of your web projects (sites/apps) are paused and visitors… will find a `Site not available` page". — [Netlify docs: How credits work](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)
- GB-hours "are calculated as the total duration of function invocations multiplied by the configured memory allocation in GB". The default is 1024 MB, so 2 h of total runtime equals 2 GB-hours. — [Netlify docs: Functions usage and billing](https://docs.netlify.com/build/functions/usage-and-billing/)
- Pricing-plan table: "Functions compute: 1 GB-hour, 10 credits. Serverless functions, scheduled functions, background functions". "Web Requests: 10,000 requests, 2 credits. All traffic to your site, includes edge functions". — [Netlify docs: Credit-based pricing plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)
- The compute rate changed from 5 to 10 credits per GB-hour after launch; current docs say 10. — [Netlify changelog: credit-based plans](https://www.netlify.com/changelog/netlify-pricing-update-introducing-credit-based-plans/) (rate change reported via search summary; current docs confirm 10)
- AWS made the INIT phase billable for on-demand ZIP/managed-runtime Lambdas from **Aug 1, 2025**. "INIT duration is added to Billed Duration". — [AWS Compute Blog](https://aws.amazon.com/blogs/compute/aws-lambda-standardizes-billing-for-init-phase)
- Keep-warm pings keep one environment warm but do nothing for scale-out: concurrent requests can still cold-start. — [Back4app glossary: serverless cold starts](https://www.back4app.com/glossary/serverless-cold-starts/) (vendor source; weigh accordingly). A developer's experiments concluded that "frequently pinging one or more website urls is not a reliable approach to mitigate cold start delays". — [Mitigating serverless cold start delays (via Node Weekly)](https://nodeweekly.com/link/136185/web) (older, likely 2023)
- Lambda keep-warm folklore says non-VPC functions stay warm for about 5 min. This is not AWS-documented; AWS only says "non-deterministic". — [Jeremy Daly: Lambda Warmer](https://jeremydaly.com/lambda-warmer-optimize-aws-lambda-function-cold-starts/) (older); [AWS Compute Blog](https://aws.amazon.com/blogs/compute/aws-lambda-standardizes-billing-for-init-phase)

### Credit math (my calculation from the cited rates; 30-day month, 1 GB memory → 1 credit = 360 s of function runtime)
| Ping interval | Pings/month | Web-request credits | Compute credits @0.2 s/ping | Compute @1.3 s/ping | Total (0.2 s / 1.3 s) |
|---|---|---|---|---|---|
| 4 min | 10,800 | 2.2 | 6.0 | 39.0 | ~8 / ~41 |
| 2 min | 21,600 | 4.3 | 12.0 | 78.0 | ~16 / ~82 |
| 1 min | 43,200 | 8.6 | 24.0 | 156.0 | ~33 / ~165 |
- A single 10 s cold start costs about 0.028 credits, so cold starts themselves are cheap. The problem is latency, not credits.
- These figures assume billed duration is close to the measured wall-clock time. Wall-clock time as seen from the VPS includes the Germany→Ohio network RTT, so billed duration is probably a bit lower (see Gaps).

### Inferences
- A ping to a lightweight route that does not touch the DB (for example a static-ish health route served by the same handler) would run in tens of milliseconds and cost only a few credits per month. It still would not guarantee a warm instance for a real scan: a second concurrent scan, Lambda recycling, and every new deploy all cause cold starts again.
- Pinging every minute with the current 1.3 s route would use about half of the 300-credit budget, alongside deploys (15 credits each) and real traffic. That risks the hard-cap "site paused" outcome, which would take down demo pages, checkout and admin.

### Gaps
- Netlify does not document billing granularity (ms vs. rounding), minimum billed duration, or whether Lambda INIT time counts toward Netlify's GB-hour meter. Netlify bills its own meter, not AWS's. AWS bills INIT since Aug 2025, but the pass-through is unconfirmed.
- The docs do not say whether each serverless-function invocation also counts as a web request. I assumed it does ("All traffic to your site").

## 3. Alternative: serve the scan redirect (and possibly demo pages) from the always-on VPS behind Caddy on a subdomain

### Takeaway
A tiny Node (or Caddy-only) endpoint on the existing VPS, for example `go.seitenwerk.world`, avoids cold starts entirely, costs 0 €, and runs in Germany next to EU users and close to the EU database. Caddy obtains and renews TLS certificates automatically once an A record points to the VPS. The main risk is that the VPS becomes a single point of failure.

### Cited Findings
- Caddy automatic HTTPS needs the domain's A/AAAA records to point to the server, ports 80/443 to be reachable, persistent storage, and the domain in the config. It uses Let's Encrypt with ZeroSSL as fallback, renews automatically, and retries with exponential backoff (at most a 1-day gap, for up to 30 days). — [Caddy docs: Automatic HTTPS](https://caddyserver.com/docs/automatic-https)
- Netlify redirect rules can proxy to an external URL with status 200, for example `/api/*  https://api.example.com/:splat  200`. Proxy rewrites time out after 26 s. — [Netlify docs: Rewrites and proxies](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/)
- The Netlify site already depends on the hard credit cap, so if credits run out the site shows "Site not available". A VPS endpoint is independent of that. — [Netlify docs: How credits work](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)

### Inferences
- **Latency:** an always-running Node process in Germany responds to a phone in Germany in tens of milliseconds. With a pooled, persistent Postgres connection to the EU Supabase pooler, the scan INSERT should take about one intra-EU round trip, and it can be done fire-and-forget after the 302 is sent. Under 1 s end-to-end is easily achievable. I have not measured this.
- **DNS setup:** add one A record `go → <VPS IPv4>` (plus AAAA if IPv6 is present) in whatever DNS hosts seitenwerk.world (currently Netlify DNS). No nameserver change is needed. Caddyfile: `go.seitenwerk.world { reverse_proxy localhost:PORT }`.
- **Letters already printed:** QR codes on letters already sent point to `<main domain>/{code}` and `/q/{token}` on Netlify. Moving future QR codes to `go.` only helps new letters. For already-sent codes, a Netlify redirect rule (`/q/*` → `https://go.seitenwerk.world/q/:splat` with 301/302, `force = true`) could hand off at the CDN layer without invoking the Lambda. Whether netlify.toml/_redirects rules run before the plugin-nextjs handler for these paths must be checked against Netlify's "Request processing order" doc, which I did not verify. The bare `/{code}` catch-all is harder to express as a Netlify redirect without shadowing other routes.
- **Demo page after the redirect:** if the 302 points to `/d/{slug}` on Netlify, the user still hits the possibly cold Lambda unless `/d/{slug}` is static or prerendered (served from the CDN) or is served from the VPS too. The redirect is only half the path. The fastest option is to redirect to a statically generated or CDN-cached demo page, or to serve demo HTML from the VPS.
- **SPOF and reliability:** the endpoint fails if the VPS, Docker or Caddy is down, or if the Contabo network has an incident. Mitigations: Docker `restart: unless-stopped`, an external uptime monitor, and a fallback. Because the letter's QR target is fixed, there is no automatic failover without a second host. One possible fallback is a DNS change back to Netlify, done manually.

### Gaps
- No measured numbers for VPS→Supabase EU pooler latency. This needs an actual `psql` or Node timing from the VPS.
- I did not verify Contabo SLA or uptime figures.

## 4. Alternative: Supabase Edge Functions (Deno) as the redirect-and-count endpoint

### Takeaway
On the Free plan Supabase Edge Functions allow 500k invocations/month, and cold starts have been in the tens of milliseconds on average since the July 2025 boot-time improvements. A 302 is fine because it is not HTML. The catch is the URL: without the paid Custom Domain add-on (10 $/month) the scan link would be `<project>.supabase.co/functions/v1/...`, which is long and off-brand, and `text/html` responses on that domain are rewritten to plain text.

### Cited Findings
- Free plan: 500,000 invocations/month. Paid plans: $2 per 1 million beyond quota. — [Supabase docs: Edge Functions pricing](https://supabase.com/docs/guides/functions/pricing)
- Limits: wall clock "Free plan: 150s"; "Maximum CPU Time: 2s" per request; "Maximum Memory: 256MB"; 100 functions per project on Free. "Serving of HTML content is only supported with custom domains (Otherwise `GET` requests that return `text/html` will be rewritten to `text/plain`)." — [Supabase docs: Edge Functions limits](https://supabase.com/docs/guides/functions/limits)
- Supabase (July 2025) reported that average Edge Function boot time fell from 870 ms to 42 ms and P99 from 15,069 ms to 460 ms. — [Supabase blog via DEV: Persistent storage and 97% faster cold starts](https://dev.to/supabase/persistent-storage-and-97-faster-cold-starts-for-edge-functions-516f)
- Third-party 2026 figures: 50–200 ms for small functions, 500 ms–2 s for large ones. One blog measured a 120 ms cold start and a 47 ms response. — [Rapid Developers tutorial](https://rapidevelopers.com/supabase-tutorial/how-to-reduce-cold-start-in-supabase-functions); [eastondev blog](https://eastondev.com/blog/en/posts/dev/20260503-supabase-edge-functions/) (secondary sources)
- Custom Domain add-on: $10 per domain per month per project, billed hourly. — [Supabase pricing](https://supabase.com/pricing); [Supabase changelog: hourly billing for custom domain](https://supabase.com/changelog/28438-moving-to-hourly-usage-based-billing-for-ipv4-custom-domain-and-point-in-time-recovery)

### Inferences
- A 302 with a `Location` header (no HTML body) should work on the default `supabase.co` domain. The function would need to be deployed without JWT verification (`--no-verify-jwt`) so anonymous phone browsers can call it. This is standard CLI behaviour but was not re-verified here.
- Printing a `supabase.co` URL on letters looks untrustworthy and ties the QR code to one Supabase project. The project was already migrated once (task #81), so this is a real risk. A Netlify-level redirect from the brand domain to the Supabase function would put the Netlify hop back in front, although redirect rules are cheap and not Lambda-bound (unverified ordering, see section 3).
- It runs close to the DB (same Supabase region), so the INSERT is fast. On the other hand it adds another platform the operator has to understand and deploy.

### Gaps
- I found no official Supabase docs statement about 302 responses specifically; the HTML restriction is the only response-type limit mentioned.
- Edge Function region placement relative to the EU database was not verified.

## 5. Alternative: Cloudflare Workers free plan as the redirect-and-count front, with Supabase REST

### Takeaway
Workers Free (100k requests/day, 10 ms CPU per request) is technically ideal: effectively no cold start, global edge, and a `fetch` to the Supabase REST/RPC endpoint to count the scan. However, putting it on `seitenwerk.world` or a subdomain requires moving the domain's **nameservers to Cloudflare**. Partial or CNAME setup is Business/Enterprise only. That is a bigger change than an A record when the domain sits on Netlify DNS. Using only a `*.workers.dev` URL avoids the DNS move but is off-brand.

### Cited Findings
- Free limits: "daily request limit of 100,000 requests, resetting at midnight UTC". CPU time is 10 ms per HTTP request (I/O wait does not count against the CPU limit, per Cloudflare's definition of CPU time). 50 subrequests per request. Over the limit you get Error 1027 or "fail open" behaviour, depending on route config. Global scope startup must finish within 1 s. — [Cloudflare docs: Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- Cold starts: Cloudflare's Sept 2025 "shard and conquer" change routes traffic for a Worker to an already-running instance in each data center. Per InfoQ, 99.99% of requests hit already-running code. — [Cloudflare blog: Eliminating Cold Starts 2](https://blog.cloudflare.com/eliminating-cold-starts-2-shard-and-conquer/); [InfoQ, Oct 2025](https://www.infoq.com/news/2025/10/workers-shard-conquer-cold-start)
- CNAME (partial) setup is only available on Business/Enterprise. On Free the zone must use Cloudflare nameservers (full setup) for Workers custom domains/routes. — [Cloudflare docs: CNAME setup (Partial)](https://developers.cloudflare.com/dns/zone-setups/partial-setup/); [Answer Overflow thread quoting Workers custom-domains docs](https://www.answeroverflow.com/m/1415002169089986684) (community)

### Inferences
- **Request budget:** expected scan volume (tens to hundreds per day from batches of about 40 letters) is many orders of magnitude below 100k/day, so it costs 0 €.
- **DNS move consequences:** moving nameservers from Netlify DNS to Cloudflare means recreating every record in Cloudflare: the Netlify site (A/ALIAS or CNAME to Netlify), Resend DKIM/SPF/DMARC records, MX, and any verification TXT records. Netlify-managed DNS features are lost, though Netlify sites work fine with external DNS. For a non-technical operator this migration carries real risk: a missed mail record means Resend mail fails or lands in spam, which is already a listed open risk.
- A Worker would call Supabase via HTTPS (PostgREST RPC or insert with a restricted key stored as a Worker secret). From a Frankfurt PoP to an EU Supabase project that is one HTTPS round trip, and the 302 can be returned with `ctx.waitUntil()` doing the count, so the user sees no DB latency.

### Gaps
- I did not verify the current wording of Cloudflare's own Workers Custom Domains page on whether a full zone is mandatory; the evidence comes from the partial-setup docs and a community quote.

## 6. Recommendation: simplest and most robust option for a non-technical solo operator

### Takeaway
**Best fit at 0 €: serve the scan redirect (and ideally the demo HTML) from the existing VPS behind Caddy on `go.seitenwerk.world`.** It needs one A record in Netlify DNS, no nameserver move, no new vendor account and no paid add-on, and it is permanently warm in Germany. Keep Netlify for checkout and admin. For QR codes already printed, add a CDN-level Netlify redirect from `/q/*` (and, if possible, the short-code paths) to the `go.` host, after checking that redirect rules run before the Next.js handler. Do not rely on keep-warm pinging; at most, ping a DB-free route as a cheap secondary measure (well under 10 credits/month).

### Cited Findings
- Region change and memory tuning that could shorten Netlify cold starts are Pro-only. — [Netlify docs: Functions configuration](https://docs.netlify.com/build/functions/configuration.md)
- The Free plan is a hard 300-credit cap, and exceeding it pauses all sites. — [Netlify docs: How credits work](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)
- Caddy handles TLS automatically from a plain A record. — [Caddy docs: Automatic HTTPS](https://caddyserver.com/docs/automatic-https)
- Cloudflare Workers custom domains on Free need a full nameserver move. — [Cloudflare docs: CNAME setup (Partial)](https://developers.cloudflare.com/dns/zone-setups/partial-setup/)
- A Supabase Edge Function on a brand domain costs $10/month. — [Supabase pricing](https://supabase.com/pricing)

### Inferences
- Ranking for this operator (simplicity × robustness × 0 €):
  1. **VPS + Caddy subdomain.** Lowest latency in Germany, 0 €, one DNS record, and the stack is already operated (Docker, Caddy, worker). The risk is a single point of failure: mitigate with a restart policy, an uptime alert, and a documented fallback (point the `go` A record back to Netlify or flip the Netlify redirect off).
  2. **Netlify Edge Function on the same site** (a custom `netlify/edge-functions` handler for `/q/*` that calls Supabase REST and returns a 302). It stays on the brand domain with no DNS work, edge functions are billed only as web requests (2 credits/10k, not compute), and it has a 50 ms CPU limit. Not fully verified: cold-start behaviour and whether it can coexist and take precedence over plugin-nextjs routes. A strong 0 € option if verified, and it also covers already-printed QR codes. — [Netlify docs: Credit-based pricing plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/); [Netlify docs: Edge Functions limits](https://docs.netlify.com/build/edge-functions/limits/)
  3. **Cloudflare Worker.** Technically the best edge option, but the full DNS migration (including mail records) is the riskiest step for a non-technical operator.
  4. **Supabase Edge Function.** Fast and free, but off-brand URL unless you pay $10/month, and it is coupled to the Supabase project.
  5. **Keep-warm pinging only.** Cheap but unreliable: it does not fix concurrency, recycling or deploy-time cold starts, and with the current 1.3 s route it gets expensive at short intervals.
- In every option the scan endpoint should send the 302 first and record the scan asynchronously. The redirect target `/d/{slug}` must itself be fast (static/CDN-cached or VPS-served); otherwise the cold Lambda just moves one hop later.

### Gaps
- The Netlify Edge Function option was not verified end-to-end: request-processing order relative to plugin-nextjs 5.16, edge cold-start numbers, and whether the plugin already registers edge functions on these paths.
- Whether `/d/{slug}` demo pages are currently static/ISR-cached on Netlify or rendered per request in the Lambda was not checked in this research. It determines whether the redirect alone achieves < 1 s.
