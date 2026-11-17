# Serving /d/{slug} and the /q/{token} scan redirect from CDN/static storage (Next.js 16 on Netlify Free, Nov 2026)

Context checked in the repo (17.11.2026): `apps/web/src/app/d/[slug]/route.ts` and `apps/web/src/app/q/[token]/route.ts` are Route Handlers with `export const dynamic = 'force-dynamic'`. The demo response sends `cache-control: private, no-store` and records a view event on the server, so every demo view and every scan runs the 1 GB Lambda today, and any cold start shows up as the 9–11 s delay. Demo images are inlined as `data:` URIs (CSP `img-src data:`). That is why one HTML response is ~0.5–1 MB.

The repo also already has a building block for a static route. `apps/web/src/lib/demo-fallback.ts` together with `infra/netlify/snapshot-demos.mjs` writes static copies to `/notfall/<slug>.html` in every Netlify deploy, along with a hashed token/short-code → slug map, for the demos of sent letters. Today these copies are used only when the DB or storage times out, and the function still runs first. `TRACK_DOMAIN=seitenwerk.world` (`.env.example`), so the QR codes already printed point at that domain. Any solution has to keep `seitenwerk.world/q/{token}` and the short-code URLs working.

## 1. Netlify CDN caching for Next.js: can a cached /d/{slug} be served without invoking the function?

### Takeaway
Yes, mostly. A response with `Netlify-CDN-Cache-Control: public, durable, …` is served from the edge or the durable cache without running the function. Next Runtime ≥ 5.5 uses the durable cache automatically for cacheable responses. The current route sends `private, no-store` and `force-dynamic`, so nothing is cached. Three limits matter: the first request after each deploy still hits the function (every deploy invalidates the cache unless `Netlify-Cache-ID` is set), retention after long idle is not documented, and a server-side view counter stops running on cache hits.

### Cited Findings
- Netlify-specific header: "`Netlify-CDN-Cache-Control`: targeted field that applies to only Netlify's CDN". The other two are `CDN-Cache-Control` (all CDNs) and `Cache-Control` (CDN or browser). — [Netlify Docs: Caching](https://docs.netlify.com/platform/caching/)
- `durable` directive: "for serverless functions only. Use to reduce function invocations and response latency. When a response is generated and cached for one edge node, store the response in Netlify's durable cache so that other edge nodes can reuse it instead of invoking the function again." Example: `Netlify-CDN-Cache-Control: public, durable, max-age=60, stale-while-revalidate=120`. — [Netlify Docs: Caching](https://docs.netlify.com/platform/caching/)
- "Whenever that content is requested, edge nodes that don't have the response locally cached check the durable cache, and only invoke the function if the response is not found there." — [Netlify Docs: Caching overview](https://docs.netlify.com/build/caching/caching-overview/)
- No guarantee of exactly one invocation: "we do not guarantee that there's always only a single function call for each version of a generated page. Multiple requests across different regions in a short time frame might invoke a function multiple times because the cache is eventually consistent." — [Netlify Docs: Caching overview](https://docs.netlify.com/build/caching/caching-overview/)
- By default, "responses coming from Netlify Functions, Edge Functions, Netlify Server, and proxies are not cached". Caching is opt-in via headers. — [Netlify Docs: Caching overview](https://docs.netlify.com/build/caching/caching-overview/)
- Next.js: "On Netlify, cacheable responses on sites using the Next Runtime 5.5.0 or later automatically use the durable cache". This can be overridden in the next config (not supported before Next 14.2.10). — [Netlify Docs: Caching overview](https://docs.netlify.com/build/caching/caching-overview/)
- The durable cache "is currently only compatible with Netlify Function responses. The `durable` directive has no effect on responses from Netlify Edge Functions." — [Netlify Docs: Caching](https://docs.netlify.com/platform/caching/)
- Retention: the official docs page gives no retention period or eviction policy (only `ttl` values in `Cache-Status` examples). The launch blog says the durable flag makes Netlify "persist the response in permanent storage, and use that as the origin for any cache misses until it's invalidated", and that combined with stale-while-revalidate "this is guaranteed to only trigger one function call that will be written back to the object store". — [Netlify Docs: Caching](https://docs.netlify.com/platform/caching/); [Netlify blog: Announcing durable caching](https://www.netlify.com/blog/announcing-durable-caching/) (blog wording; "guaranteed" conflicts with the docs' "we do not guarantee …" caveat)
- For comparison only (Vercel, not Netlify), Vercel's ISR storage drops entries that go "unaccessed for 31 days". Netlify publishes no equivalent figure. — [Vercel ISR docs](https://vercel.com/docs/incremental-static-regeneration/overview)
- Deploys invalidate the cache: "all new deploys invalidate the cache for the given deploy context by default." To opt out, set `Netlify-Cache-ID: <id>` on function or proxy responses so they "persist across atomic deploys". — [Netlify Docs: Caching overview](https://docs.netlify.com/build/caching/caching-overview/)
- Cache tags and purge: the `Netlify-Cache-Tag: tag1,tag2` header (up to 500 tags per response, 1024 chars each). Purge with `purgeCache({ tags })` from `@netlify/cache` or `POST https://api.netlify.com/api/v1/purge` with a personal access token and `{"site_slug", "cache_tags"}`. Rate limit: "Each cache tag or site can only be purged twice every 5 seconds" (otherwise 429). — [Netlify Docs: Caching](https://docs.netlify.com/platform/caching/)
- Cache keys: the `Netlify-Vary` header supports `query`, `header`, `language`, `country` and `cookie`, e.g. `Netlify-Vary: query=item_id|page`. — [Netlify Docs: Caching](https://docs.netlify.com/platform/caching/)
- Basic auth "on any page of your website disables caching for the entire website". — [Netlify Docs: Caching overview](https://docs.netlify.com/build/caching/caching-overview/)
- Next.js adapter: "static page responses are automatically cached at the edge and can be revalidated by path or by tag". ISR and Cache Components are listed as "Full Support". SSG: "Pre-rendered pages are stored in Next.js route cache, and fetched from the route cache by a function invocation when first accessed after a deploy." — [Netlify Docs: Next.js overview](https://docs.netlify.com/frameworks/next-js/overview/)
- Static assets (real files in the deploy) behave differently: they are "cached on Netlify's global edge nodes and automatically invalidated whenever a deploy changes the content … we treat static asset responses as fresh for up to one year". The default is `Netlify-CDN-Cache-Control: public, s-maxage=31536000, must-revalidate`. — [Netlify Docs: Caching overview](https://docs.netlify.com/build/caching/caching-overview/)
- Next 16 `proxy.ts` (formerly middleware) defaults to the Node.js runtime, and the `runtime` option is not allowed in proxy files. — [Next.js docs: proxy](https://nextjs.org/docs/app/getting-started/proxy). A Netlify forum report describes `proxy.ts` (Clerk) breaking after an automatic Next Runtime update (5.15.9 → newer, build 35.11.2), with no answer found. — [Netlify forum](https://answers.netlify.com/t/netlify-next-js-build-broke-on-35-11-2-update/160952)

### Inferences
- Smallest change inside Next: in the `/d/[slug]` handler, replace `private, no-store` with `Netlify-CDN-Cache-Control: public, durable, s-maxage=2592000, stale-while-revalidate=…`, add `Netlify-Cache-Tag: demo-<slug>`, and keep a browser `Cache-Control: public, max-age=0, must-revalidate`. After that, every request except the first should be served from the CDN.
  - The worker should "pre-warm" each demo by fetching `/d/{slug}` once after publishing or approval, so the scanner is not the first visitor.
  - The worker should purge by tag when a demo is rebuilt, expires (410) or is removed after opt-out.
- The limits of this approach:
  - (a) Every production deploy of the Next app wipes the cache unless `Netlify-Cache-ID` is set on these responses. Without it, the worker has to re-warm all live demos after each deploy.
  - (b) Netlify does not document how long an untouched entry survives. The blog says "permanent storage … until invalidated", but that is not a contractual SLA. Expect occasional cold misses.
  - (c) The server-side view event (`recordEvent`) and the per-request text, such as the "online bis …" label and the refreshed offer section, would be frozen at cache time. The view counter has to move to the existing beacon (`/d/{slug}/beacon`), which still runs the function but asynchronously, so the visitor does not wait. Any change to the offer or expiry has to purge the tag.
- The `/q/{token}` redirect cannot be cached as-is because it has to count the scan. It needs a separate fast path (see section 3).
- Unverified: the Next Runtime may normalize `Cache-Control` headers of App Router Route Handlers. Test with `curl -I` and look for `Cache-Status: "Netlify Edge"; hit` or `"Netlify Durable"; hit` on the second request.

### Gaps
- No official Netlify figure for how long durable cache or edge cache entries live when untouched for days or weeks. The docs are silent, and the blog says only "until invalidated".
- No official statement that durable caching, cache tags or the purge API are restricted on the Free plan. The pricing and caching pages don't mention plan limits, which suggests availability but does not confirm it.
- Could not confirm in Netlify docs whether Next 16 `'use cache'` / Cache Components output for a Route Handler returning raw HTML gets durable-cached the same way as page routes. The adapter docs say only "Full Support".

## 2. Publishing each demo as static files: Netlify deploy API vs. Netlify Blobs vs. Supabase Storage vs. Cloudflare (Workers Static Assets / R2 / Pages) vs. GitHub Pages

### Takeaway
On Netlify Free, publishing demos by production deploy is too expensive: 15 credits per deploy against a 300-credit hard cap, so at most about 3–4 extra deploys a week. Branch deploys and Deploy Previews are 0 credits. Supabase Storage serves HTML as text/plain unless a paid custom-domain add-on is used. The cheapest robust option is Cloudflare Workers with Static Assets or R2: asset requests are free and unlimited, egress is free, and Workers have no meaningful cold start. Its main cost is setup effort and DNS. The quickest Netlify-only option is the existing `/notfall/<slug>.html` static copies plus a path that routes to them without the Lambda.

### Cited Findings
**Netlify credits (Free plan)**
- Free plan: "300 credit limit". Production deploys "15 credits each". Compute "10 credits per GB-hour". Web requests "2 credits per 10k requests". Bandwidth "20 credits per GB". — [Netlify pricing](https://www.netlify.com/pricing/)
- "each successful production deploy consumes 15 credits … Failed deploys and rolling back a production deploy … does not consume credits." Deploy Previews and branch deploys: "0 credits". — [Netlify Docs: How credits work](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)
- Web requests count "requests for HTML pages, images, JavaScript, CSS files, and other static assets". Edge functions "don't contribute to the compute usage metric. Edge functions are measured through web requests." — [Netlify Docs: How credits work](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)
- At the cap, Free is a hard limit: "all of your web projects (sites/apps) are paused and visitors … will find a `Site not available` page". Also, "if one site/web project exceeds its limits, all sites/projects on your account will be paused". Alerts come at 50/75/90/100 %. — [Netlify Billing FAQ](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/); [How credits work](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)

**Netlify CLI and API deploys**
- "Your options for CLI and API and ZIP deploys are draft, or production." `--alias` "doesn't create a branch deploy and can't be used in conjunction with the branch subdomain feature". One user found a custom subdomain "isn't supported for drafts". — summarized from [Netlify CLI deploy docs](https://cli.netlify.com/commands/deploy) and [Netlify forum: Deploy with CLI to branch](https://answers.netlify.com/t/deploy-with-cli-to-branch/7226) (forum, partly older)
- Custom domains on branch deploys exist ("branch subdomains" / "automatic deploy subdomains", needs Netlify DNS). — [Netlify Docs: understand domains](https://docs.netlify.com/manage/domains/domains-fundamentals/understand-domains/)

**Netlify Blobs**
- Blobs supports CRUD from Edge Functions. `getStore` accepts `siteID` and `token` ("a Netlify Personal Access Token that grants access to Blobs on the given site"), so an external worker could write to it. The docs do not describe this as a workflow, so it is an inference. Max object size 5 GB. Eventual consistency by default: "Updates and deletions propagate within 60 seconds". Site-wide stores persist across deploys, default region `us-east-2`. — [Netlify Docs: Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/)

**Netlify Edge Functions**
- Limits: 50 ms CPU per request (waiting on I/O does not count), 512 MB memory, 20 MB compressed code. — [Netlify Docs: Edge Functions limits](https://docs.netlify.com/build/edge-functions/limits/)
- Netlify reports that, after moving Edge Functions into Firecracker MicroVMs, start time is about 2 ms at p99 and about 1.2 % of invocations are cold, averaging about 9 ms. This is the vendor's own figure. — [Netlify blog: Edge Functions on Firecracker microVMs](https://www.netlify.com/blog/edge-functions-firecracker-microvms/)
- `Response.redirect(url)` and `context.waitUntil(promise)` ("extend the edge function's execution … without blocking the response to the client", still subject to the CPU limit) are documented. — [Netlify Docs: Edge Functions API](https://docs.netlify.com/build/edge-functions/api/)

**Supabase Storage**
- Supabase docs: "For security, HTML files are returned as plain text." — as quoted in search results from [Supabase Storage guide (docs mirror)](https://docs-2lg9mxa1v-supabase.vercel.app/docs/guides/storage); see also [Supabase discussion #2557](https://github.com/orgs/supabase/discussions/2557)
- Changelog (2024-10-02): "you can now serve HTML and XHTML responses from the Storage service as well, if a Custom Domain is being used". Projects needing these content types use the "Custom Domain add-on". — [Supabase changelog 29633](https://supabase.com/changelog/29633-xhtml-responses-are-only-allowed-with-a-custom-domain-enabled.md)

**Cloudflare Workers (Free)**
- 100,000 requests/day and "10 milliseconds of CPU time per invocation". KV: 100,000 reads/day, 1,000 writes/day, 1 GB stored. R2: 10 GB-month, 1 M Class A and 10 M Class B ops/month, "no charges for egress bandwidth". "Requests to static assets are free and unlimited." D1: 5 M rows read/day, 100 k rows written/day. — [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- Static Assets on Free: 20,000 files per Worker version, 25 MiB per file. If `run_worker_first` is used, matching requests always invoke the Worker, and over the free limit they get 429 instead of falling back to assets. — [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/); [Static assets billing and limitations](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations)
- Cold start: Cloudflare loads the Worker during the TLS handshake (about 5 ms), so the cold start is hidden ("zero"). This is a 2020 vendor post, with no newer official benchmark found. — [Cloudflare blog: Eliminating cold starts](https://blog.cloudflare.com/eliminating-cold-starts-with-cloudflare-workers/)

**Cloudflare Pages (Free)**
- 500 builds/month, 20,000 files per site, 25 MiB per asset, 100 custom domains per project, `_headers` file supported (max 100 rules). For more than 100 sites Cloudflare points to Workers Static Assets / Workers for Platforms. — [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)

### Inferences
**Netlify static deploys**
- Publishing demos by production deploy to the static site would burn credits fast: 1/day is about 450 credits/month, which exceeds the 300 cap and pauses all sites; 1/week is about 60–65 credits.
- Workable only if demo publishing is batched with letter batches, e.g. one deploy per approved letter batch. The existing `/notfall/` snapshot step already does this as a side effect of each app deploy.
- Draft or alias deploys are not listed as billed, but they are also not explicitly listed as 0 credits. They can't use a custom domain, so they are unsuitable for already-printed QR codes on `seitenwerk.world`.

**Netlify-only fast path (0 €, low effort)**
- Add one Netlify Edge Function on `/q/*` (and the short-code path):
  1. Resolve token → slug from a map. Options: a JSON bundled at deploy time (like `demo-fallback-map.json`), Netlify Blobs written by the worker, or a fetch to Supabase PostgREST.
  2. `return Response.redirect('/d/'+slug, 302)` immediately.
  3. Log the scan with `context.waitUntil(fetch(SUPABASE_RPC…))`.
- Serve `/d/{slug}` either from a durable-cached function response (section 1) or from a static file. Netlify Blobs could feed an edge function too, but edge responses can't use the durable cache. A Blobs read on every view adds latency, so the expected time is unmeasured, probably low hundreds of ms.
- Unverified: whether a `_redirects` / `netlify.toml` rewrite (`/d/:slug /notfall/:slug.html 200`) takes precedence over the Next Runtime's own catch-all handler. Test on a deploy preview (0 credits).

**Supabase Storage**
- Not usable for serving demo HTML on the free plan: it returns text/plain, and the custom-domain add-on is paid. Fine as the origin the worker writes to and an edge or Worker layer reads from.

**Cloudflare (most robust 0 € option for instant pages)**
- Set up a Worker on a custom (sub)domain:
  - `/q/{token}`: KV or D1 lookup → `Response.redirect` + `ctx.waitUntil(fetch(Supabase))`.
  - `/d/{slug}`: HTML from R2 or KV with an explicit `content-type: text/html` and `X-Robots-Tag: noindex`.
- The worker on the VPS uploads to R2 (S3 API).
- At ~100–1000 scans/month all usage is far below free limits, e.g. 1,000 writes/day KV versus a few hundred demos.
- Catch: the printed QR codes point to `seitenwerk.world` on Netlify. Either move that zone's DNS to Cloudflare (Workers custom domains need the zone on Cloudflare), or keep Netlify and add one Netlify→Cloudflare hop (redirect or proxy), which re-adds Netlify latency and credits. New letters could use a Cloudflare-hosted track subdomain directly.
- GitHub Pages: no official limits checked in this research. It can't set custom response headers, so noindex would rely only on `<meta name="robots">`. Not recommended for this use (inference; see Gaps).

### Gaps
- Not confirmed whether Netlify draft/alias deploys created via API or CLI cost 0 credits. The docs explicitly list only Deploy Previews and branch deploys as 0.
- Not confirmed whether Cloudflare Pages "Direct Upload" deployments count against the 500 builds/month.
- No measured latency numbers found for Netlify Blobs reads from Edge Functions, or for Supabase Storage CDN cache hits from Germany.
- GitHub Pages limits and header support were not verified against current official docs.
- Whether Workers custom domains on the Free plan can work without moving the whole zone's nameservers to Cloudflare (partial/CNAME setup) was not verified. From prior knowledge, CNAME setup is a Business-plan feature, which would need checking.

## 3. How link/QR services keep redirects fast (edge KV + async logging)

### Takeaway
The standard pattern runs the redirect at the edge, looks the link up in a fast KV/Redis cache rather than the primary DB, and records the click asynchronously so the visitor never waits for the write. The same pattern maps directly onto a Netlify Edge Function or a Cloudflare Worker with `waitUntil`.

### Cited Findings
- Dub "uses a Next.js middleware to log and redirect click events". Click recording via `/track/click` / `recordClick` "is done asynchronously so it doesn't slow down the redirect". — [Tinybird: Analyzing Dub.co](https://www.tinybird.co/blog/analyzing-dub-co-saas-analytics)
- "Dub caches link metadata in Redis to avoid hitting the MySQL database for every click event". Upstash (Redis vendor) reports "sub 200ms redirect times" for Dub. This is a vendor case study, not an independent benchmark. — [Tinybird](https://www.tinybird.co/blog/analyzing-dub-co-saas-analytics); [Upstash customer story: Dub](https://upstash.com/customers/dub)
- Edge middleware can't use TCP Redis clients, hence HTTP-based clients such as Upstash REST. — [Dub fork README (community)](https://github.com/Snazzah/stub)
- Both Netlify Edge Functions (`context.waitUntil`) and Cloudflare Workers support finishing async work after the response. — [Netlify Docs: Edge Functions API](https://docs.netlify.com/build/edge-functions/api/); [Cloudflare blog: cold starts](https://blog.cloudflare.com/eliminating-cold-starts-with-cloudflare-workers/)

### Inferences
- For this system, the mapping is small (a few hundred demos) and changes rarely, so the token → slug map can be:
  - static (bundled into the edge function at deploy, already done for `demo-fallback-map.json`), or
  - in Netlify Blobs / Cloudflare KV, written by the worker.
- Counting the scan with a `waitUntil` fetch to a Supabase RPC (HTTP via PostgREST, no TCP pool needed) keeps the scan counted while the redirect returns in edge time.
- If the async write fails, a lost count is possible. Mitigations:
  - retry once inside `waitUntil`;
  - alternatively, count the scan on arrival at the demo via the beacon or a query flag like `/d/{slug}?s=1`. This is a trade-off: counting at arrival misses visitors who abandon during the redirect.

### Gaps
- Dub's exact current code (whether it uses `waitUntil` / `after()` today) was not verified from source.

## 4. Pitfalls: bandwidth credits for ~1 MB pages, images, HTML content-type

### Takeaway
On Netlify Free, bandwidth (20 credits/GB) dominates once pages are cached. For 100–1000 views/month of 1 MB pages it costs about 2–20 credits, which is affordable. Cold Lambda runs also cost compute credits, so caching saves credits as well as time. Supabase Storage can't serve HTML as `text/html` without a paid custom domain.

### Cited Findings
- Bandwidth 20 credits/GB, web requests 2 credits/10k, compute 10 credits/GB-hour. — [Netlify pricing](https://www.netlify.com/pricing/)
- Bandwidth includes "All static assets hosted on Netlify, HTML, CSS, JavaScript files served to visitors", image serving and API responses. — [Netlify Docs: How credits work](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)
- Supabase Storage returns HTML as plain text unless a custom domain (add-on) is used. — [Supabase changelog 29633](https://supabase.com/changelog/29633-xhtml-responses-are-only-allowed-with-a-custom-domain-enabled.md)
- Cloudflare R2 egress free, static asset requests free and unlimited. — [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)

### Inferences (own arithmetic from the cited unit prices)
**Bandwidth on Netlify**
- 100 views × 1 MB ≈ 0.1 GB ≈ 2 credits; 1000 views × 1 MB ≈ 1 GB ≈ 20 credits/month.
- Pre-warm fetches by the worker add the same per-demo cost: 300 demos × 1 MB ≈ 6 credits per full re-warm.
- Web requests are negligible: 1000 scans + 1000 demo views ≈ 0.4 credits.

**Compute today (uncached)**
- A 1 GB Lambda running about 10 s on a cold start uses 10 GB-s per view. 1000 views ≈ 2.8 GB-h ≈ 28 credits; 100 views ≈ 2.8 credits. Warm runs are cheaper.
- Caching removes most of this, and edge functions are billed as web requests, not compute.

**Images and size**
- Inlining images as `data:` base64 inflates them by about 33 % and makes every view re-download them, because HTML is not cached by the browser if it is `no-store`.
- Moving images to separate static files with long `Cache-Control` would cut repeat-view bandwidth and let HTML render first. Two ways:
  - on Cloudflare R2: free egress;
  - on Netlify: same 20 credits/GB, but browser-cacheable.
- Keep CSP in mind: it currently allows `img-src data:` only.

**Credits budget**
- Every extra production deploy of the Next app costs 15 credits and also invalidates the Netlify cache, which forces a re-warm.
- With a 300-credit hard cap shared by all sites, an overrun pauses `seitenwerk.world` too, so the QR codes would land on "Site not available". Keep a safety margin; alerts come at 50/75/90 %.

### Gaps
- No official statement on whether CDN cache hits are billed exactly like origin responses for bandwidth on Netlify (presumed yes, since bandwidth counts all data sent).
- Actual compressed transfer size of the demo HTML (gzip/brotli of base64 images compresses poorly) was not measured.
