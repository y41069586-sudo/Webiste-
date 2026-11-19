# Always-on hosting for the Next.js 16 app (or only its purchase routes) without cold starts, as of Nov 2026

Context from the repo, checked 19.11.2026: `apps/web` uses `next` 16.4.2 with `output: 'standalone'` already set in `apps/web/next.config.ts`. There is no root `middleware.ts`/`proxy.ts`, but there is one Netlify Edge Function (`apps/web/netlify/edge-functions/qr-pfoertner.ts`). There is no `netlify.toml` and no `public/_redirects` yet. The VPS is a Contabo "Cloud VPS 4" with Ubuntu 24.04, Docker and the worker (`docs/entscheidungen.md`, 28.10.2026). The earlier worker measurement was 197 MiB idle and a 623 MiB peak while Chromium renders (`docs/vps-vorschlag-2026-10-27.md`). A prior note (`research_notes/QR Scan sofort ohne Kaltstart/cold_start_costs_alternatives.md`) measured Netlify cold starts at 9–11 s, with the function in region cmh/Ohio and a bundle of about 90 MB. It already recommended the VPS + Caddy subdomain for the QR redirect. This note extends that to the purchase routes and the whole app.

## 1. Self-hosting Next.js 16 (`output: 'standalone'`, `next start`) on the existing VPS in Docker behind Caddy

### Takeaway
The Next.js docs officially support self-hosting with `next start` or Docker, behind a reverse proxy. Middleware/proxy, image optimisation, ISR, Cache Components and `after()` all work there "with zero configuration". A single always-running Node process has no cold start. Caddy issues and renews HTTPS certificates automatically once a DNS A record points at the VPS and ports 80/443 are open. RAM for a Next standalone server is usually quoted at about 100–300 MB, but those figures come from blogs and forums, not an official benchmark, and memory growth has been reported. Plan for a 512 MB–1 GB container limit and measure.

### Cited Findings
- Next.js recommends a reverse proxy in front of a self-hosted server: "it's recommended to use a reverse proxy (like nginx) in front of your Next.js server rather than exposing it directly to the internet. A reverse proxy can handle malformed requests, slow connection attacks, payload size limits, rate limiting…" — [Next.js docs: Self-Hosting (updated 2026-10-15)](https://nextjs.org/docs/app/guides/self-hosting)
- Image Optimization, Proxy (formerly middleware) and `after` all work "with zero configuration when deploying using `next start`". On glibc Linux, Image Optimization (sharp) "may require additional configuration … to prevent excessive memory usage." — [Next.js docs: Self-Hosting](https://nextjs.org/docs/app/guides/self-hosting)
- ISR/cache is stored by default "in memory (defaults to 50mb) and on disk". This "works automatically for a single self-hosted `next start` instance with persistent local disk." — [Next.js docs: Self-Hosting](https://nextjs.org/docs/app/guides/self-hosting)
- Server-side env vars are read at runtime during dynamic rendering, so one Docker image can serve several environments. `NEXT_PUBLIC_*` values are inlined at build time. — [Next.js docs: Self-Hosting](https://nextjs.org/docs/app/guides/self-hosting)
- Streaming: when a proxy sits in front, buffering must be disabled. nginx needs `X-Accel-Buffering: no`, and "Reverse proxies … must also pass through chunked responses without buffering." — [Next.js docs: Self-Hosting](https://nextjs.org/docs/app/guides/self-hosting)
- Graceful shutdown: send SIGTERM/SIGINT and wait. "Platforms should allow a configurable drain period (10-30 seconds is recommended)." — [Next.js docs: Self-Hosting](https://nextjs.org/docs/app/guides/self-hosting)
- For multiple instances or a rebuild per environment, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` must be identical, and `generateBuildId`/`deploymentId` must be consistent. Otherwise you get "Failed to find Server Action" errors and version skew. — [Next.js docs: Self-Hosting](https://nextjs.org/docs/app/guides/self-hosting)
- Caddy automatic HTTPS needs DNS A/AAAA records pointing to the server before start, ports 80 and 443 open externally, and a persistent, writable data directory. Let's Encrypt is the default issuer with ZeroSSL as fallback. Certificates renew automatically, and HTTP redirects to HTTPS automatically. — [Caddy docs: Automatic HTTPS](https://caddyserver.com/docs/automatic-https)
- RAM (unofficial): blog and guide estimates put a standalone App Router server at about 100–150 MB idle and under 300 MB for a typical page mix, with 512 MB suggested as enough. A GitHub issue reports 10–20 % of a 1 GB container normally, but other users see memory that "only ever increases" past 1 GB. A Fly.io thread describes OOM kills. — [search summary incl. vercel/next.js#44685](https://github.com/vercel/next.js/issues/44685); [Fly.io community: High memory usage in deployed Next.js project](https://community.fly.io/t/high-memory-usage-in-deployed-next-js-project/12954); [oneuptime guide (2026)](https://oneuptime.com/blog/post/2026-02-17-how-to-build-a-docker-image-for-a-nextjs-application-with-standalone-output-and-deploy-to-cloud-run/view)
- The official Next.js memory guide covers build memory, not runtime figures for `next start`. — [Next.js docs: Memory usage](https://nextjs.org/docs/app/guides/memory-usage)

### Inferences
- **Effort:** `output: 'standalone'` is already configured, so most of the work is a Dockerfile, a compose service with `restart: unless-stopped`, `mem_limit` of about 768 MB–1 GB and `NODE_OPTIONS=--max-old-space-size≈512`, plus one Caddyfile block such as `kauf.seitenwerk.world { reverse_proxy web:3000 }` and one DNS A record. That is comparable in difficulty to the worker setup already done with `infra/vps/setup.sh`.
- **Response times (estimate):** a warm Node server in Germany should answer typical SSR pages in tens to a few hundred milliseconds. The actual time is dominated by database round trips (section 5) and render work. This has not been measured for this app, so measure it after setup.
- **Hidden work:** the VPS needs the same runtime secrets as Netlify (Supabase, Stripe live keys, Resend and so on). It also needs a build step: either `next build` on the VPS, which needs RAM and is slow on a small plan, or an image built in GitHub Actions and pulled. Every app update now means two deploys, Netlify and VPS, which must stay on the same commit. For a non-technical operator, this coupling is the main ongoing cost.
- **Coexistence with the worker:** the worker peaks at about 623 MiB while Chromium renders. Together with a Next server of roughly 150–500 MB, a VPS with ≥ 4 GB has headroom. On a 2 GB plan it would be tight. Verify the actual RAM of "Cloud VPS 4" in the Contabo panel; I did not verify it.
- Caddy streams responses by default (no nginx-style buffering header needed). This is my understanding, not verified in this session; test streaming/Suspense after setup.

### Gaps
- No official or benchmarked RAM/CPU numbers for a Next 16.4 standalone server. Measure with `docker stats` under realistic load.
- I did not verify Contabo's exact RAM/vCPU for the plan in use or its included DDoS protection.

## 2. Routing only some paths (e.g. `/d/*/uebernehmen`, `/einrichten/*`, `/checkout/*`) from Netlify to the VPS via `_redirects` 200 proxy rewrites

### Takeaway
Netlify supports 200 rewrites to an external origin "straight from our CDN servers". Rules created by the user take precedence over the rewrites the Next.js runtime generates. Proxy requests time out after 26 s. Proxied traffic very likely still costs Netlify web-request and bandwidth credits, but no function compute, so it is cheap. The serious technical catch is not cost: a page served by the VPS build loads its JS/CSS from `/_next/static/...`, and on the Netlify domain those come from a *different* build. Partial path proxying of a Next app is therefore fragile. A separate subdomain served entirely by the VPS is simpler and more robust.

### Cited Findings
- Syntax: `/api/*  https://api.example.com/:splat  200`. Requests "will be proxied through to `https://api.example.com` straight from our CDN servers without an additional connection from the browser." — [Netlify docs: Rewrites and proxies](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/)
- "Proxy rewrite requests will time out after 26 seconds." — [Netlify docs: Rewrites and proxies](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/)
- Custom headers (netlify.toml only) are sent to the origin with every request. They "apply to the request, not the response". Signed proxy redirects add an HS256 JWS in the `x-nf-sign` header, so the origin can verify that traffic came via Netlify. — [Netlify docs: Rewrites and proxies](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/)
- Origin responses with ETag/Last-Modified may be cached on Netlify's CDN. — [Netlify docs: Rewrites and proxies](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/)
- The docs say nothing about cookie handling or about compatibility with the Next.js runtime. — [Netlify docs: Rewrites and proxies](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/)
- Precedence: "Any Netlify redirects or rewrites that you create take precedence over those created by Next.js Runtime." That statement is from the v4 runtime docs. A Netlify forum post cautions that `_redirects` rules only apply when the request is not intercepted by Next.js middleware. — [Netlify docs: Next.js Runtime v4 redirects and rewrites](https://docs.netlify.com/frameworks/next-js/runtime-v4/redirects-and-rewrites); [Netlify forum: Issue with redirects in Next.js 14](https://answers.netlify.com/t/issue-with-redirects-not-working-as-expected-in-next-js-14-site/114310)
- The current Netlify Next.js docs say "Headers and redirects are evaluated after middleware, differing from stand-alone Next.js behavior". This refers to next.config headers and redirects. — [Netlify docs: Next.js on Netlify overview](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)
- Billing meters: web requests cost "2 credits per 10,000 requests" and cover page views, static assets and redirects. Bandwidth costs "20 credits per GB" of data sent to the internet. Compute costs 10 credits per GB-hour for Netlify functions only. Production deploys cost 15 credits each. When credits run out, "all web projects on the account are paused." The credits page does not explicitly mention proxies or rewrites. — [Netlify docs: How credits work](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)
- Personal plan: 1,000 credits/month. Auto-recharge is 500 credits for $5 and is off by default. — [Netlify docs: How credits work](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)

### Inferences
- **Credit cost of proxying (estimate):** a proxied page view counts as one or more web requests plus the response bytes as bandwidth. 1,000 purchase-page views at about 1 MB each is about 1 GB, so roughly 20 credits plus about 0.2 credits for requests. That is far less than function compute on a cold 1 GB Lambda. Proxying does not add compute credits, because no Netlify function runs. Netlify does not state this explicitly, so confirm with the billing FAQ or the usage dashboard after a test.
- **Added latency (estimate, not measured):** the browser goes to the nearest Netlify CDN node, then to the VPS in Germany over a fresh or pooled TLS connection. For German users this is probably about 10–40 ms extra compared with hitting the VPS directly, and still far better than a 9–10 s cold start. Measure with `curl -w` timings.
- **Asset mismatch (main risk):** HTML rendered by the VPS references `/_next/static/<build-hash>/…` and RSC/prefetch URLs. On the Netlify domain those resolve to Netlify's build, which has different hashes unless both builds are byte-identical. Possible fixes: (a) also proxy `/_next/*`, which effectively moves the whole app; (b) set `assetPrefix` on the VPS build to its own hostname (documented in the Next self-hosting guide under Static Assets); or (c) do not path-proxy at all, and serve the purchase flow on its own subdomain (e.g. `kauf.seitenwerk.world`) entirely from the VPS, linking there from the demo banner and email links. Option (c) is the simplest for this operator.
- **Server Actions and forms:** Next.js compares the request's Origin with the host for Server Actions. Behind a Netlify proxy, the Host or X-Forwarded-Host the VPS sees may differ from the browser's origin, so `serverActions.allowedOrigins` may need setting. This is an inference to test; I did not verify it in this session.
- **Cookies:** the browser only sees the Netlify domain, so cookies the VPS sets without a `Domain` attribute become first-party cookies for that domain. That should work, but Netlify does not document whether `Set-Cookie` or other response headers are altered. Test it.
- **Edge Function ordering:** the existing Netlify Edge Function `qr-pfoertner.ts` may run before redirect rules. I did not verify Netlify's request-chain order (see Gaps). It only matters if its path pattern overlaps the proxied paths.

### Gaps
- No Netlify statement on whether proxied requests and bandwidth are billed identically to static responses. The credits page is silent.
- I did not fetch Netlify's "Request processing order" page (`/resources/troubleshooting/request-chain`), so the order of Edge Functions, redirects and the Next.js handler in runtime v5 is unconfirmed. Test on a deploy preview.
- No published figure for latency added by the Netlify proxy.

## 3. Reliability risks of a single VPS, and mitigation

### Takeaway
A single VPS has no automatic failover. Reboots, OS/Docker updates, a crashed container, a full disk, a Contabo network incident or a DDoS take the routes down. Netlify proxy rules have no documented fallback to the Netlify function. A failing origin produces an error, after up to 26 s if the origin hangs. Mitigations are cheap but partly manual: restart policies, health checks, an external uptime alert, memory limits, and a documented one-step switch back to Netlify.

### Cited Findings
- Proxy timeout is 26 s. The Netlify docs describe no failover or fallback for proxy rules. — [Netlify docs: Rewrites and proxies](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/)
- Next.js recommends a reverse proxy for protection against malformed requests and slow-connection attacks, plus rate limiting. — [Next.js docs: Self-Hosting](https://nextjs.org/docs/app/guides/self-hosting)
- Caddy keeps retrying failed certificate renewals: it tries other issuers, then backs off for up to 30 days. Hitting production rate limits "can block HTTPS access for up to a week". — [Caddy docs: Automatic HTTPS](https://caddyserver.com/docs/automatic-https)
- Memory growth and OOM kills of Next.js containers are reported in the community. — [Fly.io community thread](https://community.fly.io/t/high-memory-usage-in-deployed-next-js-project/12954); [vercel/next.js#44685](https://github.com/vercel/next.js/issues/44685)
- If Netlify credits run out, all Netlify sites pause. A VPS-served route is independent of that failure mode. — [Netlify docs: How credits work](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)

### Inferences
- **Mitigation checklist (low effort):**
  1. Docker `restart: unless-stopped` plus a `healthcheck` on a DB-free `/api/health` route.
  2. `mem_limit` plus a Node heap cap, so a leak restarts the container instead of starving the worker.
  3. Unattended security updates, with reboots scheduled at night.
  4. Any free external uptime monitor emailing on downtime. I did not research specific providers here.
  5. Keep the full app deployed on Netlify unchanged. The fallback is then either flipping one DNS record (subdomain approach) or removing the proxy lines and redeploying (path approach, 15 credits).
  6. Caddy access logs without full IPs, to match the project's PII rule.
- **DDoS:** the VPS IP is public (A record), and a Netlify proxy does not hide it. Contabo's DDoS protection level was not verified. At this business's tiny traffic volume, targeted DDoS is a low-probability risk.
- **Blast radius:** the worker and web server share one machine, so a runaway web process could starve the worker (letters, polling), and the reverse. Container CPU and memory limits are important.
- **Overall:** for purchase routes that see a handful of visits per day, a VPS outage of a few minutes during a reboot is an acceptable risk compared with every visitor waiting 9–10 s today. Prefer the subdomain approach, because switching back is a single DNS change.

### Gaps
- No data on Contabo's historical uptime or SLA for this plan. Not researched.
- No source on whether Netlify retries or falls back when the proxy origin returns 5xx. The docs are silent, so treat it as no fallback.

## 4. Managed alternatives: Vercel Hobby, Cloudflare Workers (OpenNext), Render, Railway, Fly.io, Deno Deploy

### Takeaway
None of the managed options is both free and allowed for this commercial use and free of cold starts.
- **Vercel Hobby** is free, and Fluid compute reduces cold starts, but its terms limit Hobby to "personal or non-commercial use".
- **Cloudflare Workers** start almost instantly, and OpenNext supports Next 16. However, the free plan's 3 MiB bundle limit and 10 ms CPU per request make it unrealistic for this app, and a custom domain requires moving DNS to Cloudflare.
- **Render Free** sleeps after 15 minutes, takes about 1 minute to wake, and Render says not to use it for production.
- **Fly.io** has no free tier for new organisations. A small Frankfurt machine costs a few dollars a month.
- **Railway** has no meaningful free always-on tier.

The VPS, already paid for, is the only 0 € extra always-warm option.

### Cited Findings
**Vercel Hobby**
- Terms of Service §4: "You shall only use the Services under a Hobby plan for your personal or non-commercial use." The terms do not define "commercial". — [Vercel Terms of Service](https://vercel.com/legal/terms)
- Third-party sites interpret revenue, client work and payment processing as commercial use. That is opinion, not Vercel text. — [livemy.app: Vercel pricing](https://livemy.app/blog/vercel-pricing); [Vercel community thread](https://community.vercel.com/t/is-an-internal-only-tool-for-a-small-company-allowed-on-the-hobby-plan/49097)
- Hobby includes 1M function invocations, 4 active-CPU hours, 360 GB-hours of provisioned memory and 100 GB of Fast Data Transfer. When limits are exceeded, "you will have to wait until 30 days have passed". — [Vercel docs: Hobby plan (updated 2026-11-12)](https://vercel.com/docs/plans/hobby)
- Fluid compute (default for new projects since 23.04.2025) "Reduces the effects of cold starts through automatic bytecode optimization, and function pre-warming on production deployments". Bytecode caching means "the first request isn't cached yet". Hobby has no multi-region functions and no multi-region failover. — [Vercel docs: Fluid compute](https://vercel.com/docs/fluid-compute)

**Cloudflare Workers + OpenNext**
- `@opennextjs/cloudflare` supports "All minor and patch versions of Next.js 16". App Router, SSR, ISR, PPR, middleware and image optimisation (via Cloudflare Images) are supported. Node middleware (`proxy.ts`) is experimental since 1.20.3. It uses Next's Node.js runtime. — [OpenNext Cloudflare docs](https://opennext.js.org/cloudflare)
- Worker size limit is 3 MiB (free) or 10 MiB (paid), gzip-compressed. — [OpenNext Cloudflare docs](https://opennext.js.org/cloudflare)
- Workers Free allows 100,000 requests/day and 10 ms CPU per HTTP request. Paid allows up to 5 min of CPU (default 30 s). Memory is 128 MB per isolate, and global-scope startup must finish within 1 s. — [Cloudflare docs: Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- Earlier research for this project found two things: custom domains on the free plan need the zone's nameservers moved to Cloudflare, and Cloudflare's 2025 "shard and conquer" change made about 99.99 % of requests hit warm instances. — [Cloudflare docs: Partial (CNAME) setup](https://developers.cloudflare.com/dns/zone-setups/partial-setup/); [Cloudflare blog: Eliminating cold starts 2](https://blog.cloudflare.com/eliminating-cold-starts-2-shard-and-conquer/)

**Render**
- Free web services spin down after "15 minutes without receiving any inbound traffic". Spin-up takes about 1 minute. There are 750 free instance hours per month. Render says: "Do not use them for production applications." — [Render docs: Deploy for free](https://render.com/docs/free)

**Fly.io**
- New organisations have no free tier. The trial is $1 credit for 7 days. "Personal organizations with a monthly bill under $5 are waived." Always-on shared-cpu-1x costs $2.19 (256 MB), $3.69 (512 MB) and $6.70 (1 GB) per month in US regions, and $7.73/month for 1 GB in Frankfurt. Egress in Europe costs $0.02/GB, and a credit card is required. — [Fly.io docs: Pricing](https://docs.fly.io/about/pricing)

**Railway**
- Secondary sources say the Hobby plan costs $5/month including usage credit. Sources conflict on the free tier: one says $1/month after a trial, another says a $5 trial. On free, "serverless"/app sleeping is reportedly always on. These are not primary sources. — [livemy.app: Railway pricing](https://livemy.app/blog/railway-pricing); [Railway docs: pricing](https://docs.railway.com/pricing) (listed in search results only, not fetched); [Railway Station forum](https://station.railway.com/questions/does-hobby-stop-databases-from-closing-37ce0f14)

### Inferences
| Option | Extra cost | Cold start | Allowed for this business? | Setup effort for operator | Main risk |
|---|---|---|---|---|---|
| **VPS (Contabo DE) + Caddy, subdomain for purchase routes or the whole app** | 0 € (already paid) | none (always running) | yes | medium, one-time (Dockerfile, Caddy block, DNS record, secrets) | single point of failure; two deploy targets |
| Netlify proxy of selected paths → VPS | about 0 € (small credit use for requests and bandwidth, estimate) | none | yes | medium; fragile because of `_next` asset hashes | asset/build mismatch, 26 s timeout, no failover |
| Vercel Hobby | 0 € | reduced, not eliminated | **no** (personal/non-commercial only) | low | ToS violation, account suspension |
| Vercel Pro | about $20/month per seat (from the Hobby page's upgrade section) | reduced | yes | low–medium | cost; still not guaranteed warm |
| Cloudflare Workers Free + OpenNext | 0 € | near-zero | yes | **high** (DNS move, bundle diet, Postgres driver in workerd) | 3 MiB and 10 ms CPU limits almost certainly too small for this app (estimate) |
| Cloudflare Workers Paid | about $5/month (price not verified this session) | near-zero | yes | high | DNS migration including mail records |
| Render Free | 0 € | **about 60 s after 15 min idle** | discouraged for production | low | worse than today |
| Fly.io (fra, 512 MB–1 GB, always on) | about $4–8/month; possibly waived under $5 for personal orgs | none if auto-stop is off | yes | medium | new vendor, credit card, waiver policy may change |
| Railway Hobby | about $5/month (secondary sources) | none on paid if sleeping is disabled | yes | medium | sources inconsistent |

- Vercel's pre-warming applies to "production deployments", but no source says that rarely-hit functions stay warm indefinitely. Combined with the commercial-use ban on Hobby, Vercel is not a 0 € option for a business that takes payments.
- The current Netlify function bundle is about 90 MB (prior note), roughly 30× the Cloudflare free 3 MiB compressed limit. Even paid (10 MiB), the whole app is unlikely to fit without splitting. This is my estimate from the previously measured bundle, not tested.

### Gaps
- Deno Deploy: no results found on current Next.js 16 support, free-tier limits or terms. Not covered.
- Render's paid Starter price and free-instance RAM were not on the fetched page.
- Railway primary pricing page not fetched; figures come from secondary sites.
- Cloudflare Workers Paid price and included usage were not on the limits page; not verified this session.
- Vercel's default Hobby function region and whether Hobby can pin `fra1` were not verified.

## 5. Distance benefit: VPS in Germany next to Supabase Frankfurt vs. Netlify functions in Ohio

### Takeaway
Moving the server next to the database probably cuts each database round trip from about 90–110 ms (Ohio ↔ Frankfurt, estimate) to roughly 5–20 ms (German VPS ↔ AWS eu-central-1, estimate). Pages that run several sequential queries save several hundred milliseconds even when warm. I found no measured figure for this exact pair; measure from the VPS.

### Cited Findings
- The prior project note recorded the Netlify function region as cmh (Ohio) and the database as Supabase EU (Frankfurt). Warm requests measured 0.1–0.3 s, and pings every 4 minutes still cost about 1.3 s. — [prior note: QR Scan sofort ohne Kaltstart / cold_start_costs_alternatives.md](../QR%20Scan%20sofort%20ohne%20Kaltstart/cold_start_costs_alternatives.md) (internal measurement, not an external source)
- The worker on the VPS already connects to the Supabase session pooler on port 5432 (`docs/entscheidungen.md`, 28.10.2026). That confirms the network path exists and needs no extra setup for a web container. — internal repo document

### Inferences
- **Estimate:** the transatlantic round trip between Ohio and Frankfurt is typically about 90–110 ms. A data centre in Germany (Contabo Nuremberg or Düsseldorf) to Frankfurt is typically under 15 ms. A purchase page doing about 5 sequential queries would save about 0.4–0.5 s per request warm, on top of removing the 9–10 s cold start. Both numbers are estimates; check with `psql` `\timing` or a small Node script from the VPS.
- Users in Germany also save one transatlantic hop for the HTML (browser → Ohio → Frankfurt DB → Ohio → browser).

### Gaps
- No measured VPS → Supabase pooler latency, and no measured Netlify-Ohio → Supabase latency. Both need a quick timing test.
- I did not verify which Contabo data centre (Nuremberg, Düsseldorf or Munich) hosts this VPS.
