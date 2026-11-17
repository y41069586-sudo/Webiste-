# Netlify Edge Functions / Next middleware at the edge for instant QR scan redirect (research as of 17.11.2026)

Context from the repo (read locally, not web-sourced): `apps/web/src/app/q/[token]/route.ts` runs `handleScan()` from `@wbm/core` (Drizzle/Postgres) in the Next server handler and falls back to `fallbackSlugForToken(token)` from `apps/web/src/lib/demo-fallback-map.json` when the DB times out. `infra/netlify/snapshot-demos.mjs` can already create static HTML copies of demos (for `public/notfall`). The app has no `netlify.toml`, no `middleware.ts`/`proxy.ts`, and no `netlify/edge-functions` directory today. These matter for the inferences below.

## 1. Netlify Edge Functions: cold start, limits, billing, config, location, coexistence with plugin-nextjs

### Takeaway
Edge Functions run at the edge node closest to the user. Netlify now runs them on Firecracker microVMs and reports about 5–6 ms median warm latency, with cold invocations on about 1.2 % of requests adding about 9 ms. On credit-based plans they are billed **only as web requests** (2 credits per 10,000), never as compute. A QR redirect handled there costs effectively nothing and has no multi-second cold start.

### Cited Findings
- Runtime: Edge Functions run in "a secure runtime based on Deno", "directly from the worldwide network edge location closest to each user". — [Netlify Docs: Edge Functions overview](https://docs.netlify.com/build/edge-functions/overview/)
- New infrastructure: Netlify moved Edge Functions from V8 isolates on a hosted service to Firecracker microVMs (built on Unikraft) inside its own edge network. Warm median is "~5–6ms at median (p50)", down from "25–40ms". p99 is "47.4% faster". Cold invocations happen on "about 1.2%" of invocations and take "about 9ms on average". Existing behavior (URL imports, npm packages, Node built-ins, netlify.toml declarations, local dev) is said to be unchanged. — [Netlify Blog: Edge Functions on Firecracker microVMs](https://www.netlify.com/blog/edge-functions-firecracker-microvms/). The article body has no visible publication date (page metadata says last_updated 2026-11-17), so the exact rollout date is uncertain. Secondary repost: [Pinggy](https://pinggy.io/blog/edge_functions_isolates_to_microvms/)
- Cold-start mechanism: the first time a compute node sees a function, it fetches the code once and caches it. Only that first request pays this cost. — [Netlify Blog (same post), via search summary](https://www.netlify.com/blog/edge-functions-firecracker-microvms.md)
- Older or independent data conflicts with this. Older Netlify guidance put edge cold starts at about 50–200 ms. A Bejamas/Checkly test from US East measured a worst case of about 1,559 ms for an edge function, which the author attributes to captured cold starts, against about 877 ms for cold serverless and about 170 ms for the CDN. These numbers predate the microVM migration. — [search summary of netlify.com/blog/edge-functions-explained and comparedge](https://comparedge.com/tools/netlify/performance) (treat as weak or outdated evidence)
- Limits: code size 20 MB compressed. Memory 512 MB per set of deployed edge functions. **CPU time 50 ms per request**, which "does not include time spent waiting for resources or responses". Response header timeout 40 s. No wall-clock limit is documented beyond the 40 s header timeout. — [Netlify Docs: Edge Functions limits](https://docs.netlify.com/build/edge-functions/limits/)
- Netlify says the documented limits come from the isolate model and that it has "room to revisit" them. No new limits have been announced yet. — [Netlify Blog: Firecracker microVMs](https://www.netlify.com/blog/edge-functions-firecracker-microvms/)
- Billing on credit-based plans: Web requests cost "2 credits per 10,000 requests" and cover "Page views, API calls, redirects, serverless function requests, static asset requests, and Edge Functions". Compute costs 10 credits per GB-hour and covers Functions, preview servers, Agent Runners and Netlify Database, with "Edge Functions are not included"; "Edge functions don't contribute to the compute usage metric." A production deploy costs 15 credits, and failed deploys, rollbacks, Deploy Previews and branch deploys are free. On the Free plan, 300 credits is a hard limit: when they run out, all projects pause and show "Site not available", and Free accounts cannot buy credit packs. — [Netlify Docs: How credits work](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/); same rates on [Netlify Pricing](https://www.netlify.com/pricing.md)
- If a cached edge response is served, "no edge function invocation is made and no usage is incurred". — [Netlify Docs: Edge Functions usage and billing](https://docs.netlify.com/build/edge-functions/usage-and-billing/)
- Config (inline `export const config`): `path` (URLPattern, must start with `/`), `excludedPath` (string or array), `pattern`/`excludedPattern` (regex), `method`, `header`, `onError`, `cache`. In netlify.toml, `[[edge_functions]]` takes `function`, `path`, `excludedPath`, `pattern`, `excludedPattern`, `header`, `cache`. — [Netlify Docs: Declarations](https://docs.netlify.com/build/edge-functions/declarations/)
- `onError` accepts `bypass` or `fail`. With `bypass`, the request falls through to the static or origin response. — [Netlify agent skill: netlify-edge-functions](https://cdn.jsdelivr.net/npm/@netlify/agent-runner-cli@1.132.0/dist/skills/netlify-edge-functions/SKILL.md)
- Location: edge functions go in `netlify/edge-functions/`, **relative to the site's base directory**. The location can be changed with `edge_functions` under `[build]` in netlify.toml. — [Netlify agent skill](https://cdn.jsdelivr.net/npm/@netlify/agent-runner-cli@1.132.0/dist/skills/netlify-edge-functions/SKILL.md) (paraphrased; official skill shipped by Netlify, not the main docs page)
- Env vars: read them with `Netlify.env.get(name)`, not `process.env` or `Deno.env`. The variable's scope must include Functions (Runtime). — [Netlify Docs: Edge Functions API](https://docs.netlify.com/build/edge-functions/api/); [Netlify agent skill](https://cdn.jsdelivr.net/npm/@netlify/agent-runner-cli@1.132.0/dist/skills/netlify-edge-functions/SKILL.md)
- Redirect: `return Response.redirect(url)`. "Once the function returns the response, the request chain ends and any redirects declared for that path do not occur." — [Netlify Docs: Edge Functions API](https://docs.netlify.com/build/edge-functions/api/)
- Coexistence and order: "framework-generated edge functions run before user-created edge functions". Config-file declarations run before inline ones. Inline functions on the same path run alphabetically. Redirect rules are evaluated after all edge functions "unless the last edge function returns a response and ends the request chain". An edge function on the target of a static rewrite does not run for rewritten requests. `fetch()`/`URL()` rewrites start a new request chain, while `context.next()` does not. — [Netlify Docs: Declarations](https://docs.netlify.com/build/edge-functions/declarations/)
- Edge functions are incompatible with split testing, with custom headers from `_headers`/netlify.toml on edge-served paths, and with prerendering on edge-served paths. CPU-heavy work should move to serverless functions. — [Netlify agent skill](https://cdn.jsdelivr.net/npm/@netlify/agent-runner-cli@1.132.0/dist/skills/netlify-edge-functions/SKILL.md)
- Node built-ins work via the `node:` prefix. npm packages are "beta", and packages with native binaries or some dynamic imports may fail. — [Netlify agent skill](https://cdn.jsdelivr.net/npm/@netlify/agent-runner-cli@1.132.0/dist/skills/netlify-edge-functions/SKILL.md)

### Inferences
- Cost for this use case is negligible. Even 10,000 scans a month cost 2 credits (one edge invocation = one web request). Adding an outbound `fetch` to Supabase adds no Netlify compute. Shipping the function needs one production deploy (15 credits), which is the real cost.
- Under the new microVM numbers (about 9 ms cold, about 5 ms warm), the redirect TTFB is dominated by network RTT and any awaited DB call, not by function startup. That is orders of magnitude below the 9–11 s Lambda cold start. Treat this as vendor-reported until measured.
- Monorepo: if the Netlify site's base directory is `apps/web`, the files go in `apps/web/netlify/edge-functions/scan.ts` (or the path is set via `[build] edge_functions`). User-defined edge functions run *after* plugin-nextjs's generated edge function (Next middleware), if there is one. Today the app has no middleware, so there is no conflict.
- The 50 ms CPU limit is ample: one PostgREST fetch plus `Response.redirect`, with I/O wait not counted.
- An edge function on `/q/*` returning a Response ends the chain, so the Next route `q/[token]` is never invoked and the Lambda is not touched.

### Gaps
- No independent, post-microVM benchmark of Netlify Edge Function TTFB from Europe was found. Netlify's figures are self-reported.
- Exact date and rollout scope of the microVM migration (all plans and regions, Free included?) is not stated.
- The official overview and limits pages do not mention cold starts or a wall-clock limit for `waitUntil` work.
- The Free-plan section of the pricing page does not explicitly name Edge Functions as included. The credits page meters them under web requests for credit-based plans, which implies availability, but this is not stated verbatim.

## 2. Writing the scan to Supabase from the edge (REST/RPC, keys, waitUntil, TCP)

### Takeaway
Use a plain `fetch` to Supabase PostgREST (`POST /rest/v1/events` or `/rest/v1/rpc/record_scan`) with the secret key in the `apikey` header. Do it inside `context.waitUntil()` so the 302 goes out immediately. Raw TCP Postgres (`pg`, Drizzle with node-postgres) should not be relied on in Netlify Edge.

### Cited Findings
- `context.waitUntil()` "allows you to extend the edge function's execution until the given Promise it completed, without blocking the response to the client from being sent". Netlify's examples are emitting analytics events and dispatching logs. Work in `waitUntil` "is still subject to the CPU execution time limit" (50 ms CPU, I/O wait excluded). — [Netlify Docs: Edge Functions API](https://docs.netlify.com/build/edge-functions/api/); [Limits](https://docs.netlify.com/build/edge-functions/limits/)
- Supabase keys: the new secret keys are `sb_secret_...` and not a JWT. They are meant for "backend components ... servers, APIs with their own authorization checks, Edge Functions". Send them "on the `apikey` header, not on `Authorization: Bearer`". "A secret key doesn't work in a browser. Supabase matches on the `User-Agent` header and returns HTTP 401." "Supabase is deprecating the `anon` and `service_role` keys by the end of 2026." Creating new keys does not revoke legacy keys. — [Supabase Docs: API keys](https://supabase.com/docs/guides/api/api-keys)
- TCP Postgres from edge runtimes: Deno's blog listed Netlify Edge Handlers among runtimes where Postgres TCP "is not supported". This is an older post (pre-2024) and may be outdated. Netlify's own Supabase-from-edge tutorial used an HTTP proxy (PolyScale). — [Deno Blog: Connecting to Postgres from the edge](https://deno.com/blog/deploy-postgres-at-the-edge); [Netlify Blog: Querying Supabase from the edge with PolyScale](https://www.netlify.com/blog/querying-supabase-from-the-edge-with-polyscale)
- General guidance: edge runtimes generally cannot open raw TCP connections, so use HTTP-based drivers. — [Neon FAQ](https://neon.com/faqs/postgres-tools-edge-functions-node-backends)
- Database distance dominates edge latency: a function querying a database across an ocean adds hundreds of ms per request. — [Prisma Blog: Make your applications fast globally](https://www.prisma.io/blog/make-your-applications-fast-globally.md)

### Inferences
- Recommended pattern for `/q/:token` and `/:code`:
  1. Resolve token or code to slug. Either do a synchronous PostgREST GET (one EU-to-EU round trip from a European edge node, likely tens of ms; not measured), or use a bundled or Blobs-backed map (the repo already has `demo-fallback-map.json` with token-to-slug), so nothing is awaited.
  2. `context.waitUntil(fetch(SUPABASE_URL + '/rest/v1/rpc/record_scan', {method:'POST', headers:{apikey: Netlify.env.get('SUPABASE_SECRET_KEY'), 'content-type':'application/json', Prefer:'return=minimal'}, body: JSON.stringify({token, ua_class, ...})}))`.
  3. `return Response.redirect(new URL('/d/'+slug, req.url), 302)` with `cache-control: no-store`.
- An RPC (a SQL function in Supabase) is preferable to a raw table insert. It can do the lookup, the idempotent event insert and the state transition (`scanned`) in one round trip, matching what `handleScan()` does in Node. Its logic would need to be ported to SQL, which is a duplication risk.
- With `fetch` there is no `User-Agent` problem expected. The Deno/edge `fetch` default UA is not a browser UA. Not verified: set an explicit UA like `seitenwerk-edge/1` to be safe.
- Privacy rule (CLAUDE.md §5.4, no full IP): `context.ip` must not be stored. Only coarse data (for example a UA class or `context.geo.country.code`) if anything.
- Geography: today the Lambda runs in us-east-2 and talks to Supabase EU (transatlantic per query). An edge function in Europe talking to Supabase EU removes that hop as well (inference, unmeasured).

### Gaps
- No measured Netlify-edge (EU) to Supabase-EU PostgREST latency was found.
- Whether TCP sockets work in the new microVM runtime is undocumented. The microVM post does not mention TCP.
- Whether `waitUntil` has a wall-clock cap (beyond CPU time) is not documented.

## 3. Netlify Blobs from edge functions as an event buffer

### Takeaway
Blobs is usable from edge functions (`getStore` from `@netlify/blobs`, credentials injected automatically) and is included on the Free plan. It is optimized for frequent reads and infrequent writes, uses eventual consistency, and site-wide stores default to `us-east-2`. That makes it a poor fit as a per-scan write buffer, but a good fit as a read-mostly token-to-slug map. No Blobs-specific credit rate is published.

### Cited Findings
- Edge function example with `getStore("file-uploads").set(key, value, {metadata})`. "In these contexts, siteID, deployID and token are all set for you." — [Netlify Docs: Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/)
- "optimized for frequent reads and infrequent writes". Eventual consistency by default: new blobs are "globally available immediately", and updates or deletes propagate "within 60 seconds". `consistency: "strong"` is opt-in with slower reads. "last write wins", with no concurrency control. — [Netlify Docs: Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/)
- Region: "Site-wide stores default to `us-east-2` unless you specify and pass `region`". Supported regions are ap-southeast-1, ap-southeast-2, **eu-central-1**, us-east-1 and us-east-2. Deploy-specific stores default to the functions region. — [Netlify Docs: Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/)
- Limits: key ≤ 600 bytes, object ≤ 5 GB, metadata ≤ 2 KB, list pages of 1,000. — [Netlify Docs: Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/)
- Pricing: Free plan includes "Store files & images with Blob storage". No Blobs-specific credit meter is listed on the credits page. Third-party summaries say Blobs "draws from your monthly credit allotment" without stating a rate. — [Netlify Pricing](https://www.netlify.com/pricing.md); [Netlify Docs: How credits work](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/); [netli.fyi (third party)](https://netli.fyi/blog/netlify-pricing-and-limits)

### Inferences
- As a scan buffer, one key per scan (for example `scan/<ts>-<rand>`) is feasible. The worker (Contabo VPS) or a scheduled job would then drain it into Postgres, but the worker would need Netlify API access to list and read the store. That adds complexity for no gain over a direct PostgREST insert in `waitUntil`, which is just as fire-and-forget.
- A better use of Blobs here: a read-mostly `qr-map` store (`eu-central-1`) with token/code to slug, kept in sync on demo publish. Alternatively bundle the map JSON into the function at deploy time, but every deploy costs 15 credits. Blobs updates do not require a deploy.
- Because no Blobs rate is published, its credit impact on the 300-credit Free plan is unknown. For a low-volume map it is likely tiny, but this is unverified.

### Gaps
- No published credit rate for Blobs storage or operations on credit-based plans.
- No documented Blobs rate limits.

## 4. Next.js middleware / Next 16 `proxy.ts` on Netlify

### Takeaway
On Netlify, the OpenNext adapter (`@netlify/plugin-nextjs` v5) implements Next middleware **as a Netlify Edge Function**, so a redirect returned from middleware does not wake the Lambda. Next 16's `proxy.ts` defaults to the Node runtime in Next itself. Netlify supports "Node.js Middleware" with limits (no C++ addons, no filesystem), which implies it still runs in the edge function (Deno with Node compatibility). A hand-written Netlify edge function is simpler and has fewer moving parts than middleware for this narrow job.

### Cited Findings
- Netlify feature table: "Middleware | ✓ | Full support. Implemented automatically via Edge Functions ... Note there are some limitations, including a Node.js Middleware specific limitation." The adapter "Provisions a Netlify Edge function for fast execution of Next.js Middleware at the edge." "Node.js Middleware: C++ Addons are not supported, Filesystem is not supported." "Headers and redirects are evaluated after middleware." "SSR pages using the edge runtime run in your functions region with the Node.js runtime, rather than in edge locations." — [Netlify Docs: Next.js on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)
- OpenNext Netlify: the adapter supports Next.js "13.5 and later (up to the latest stable version)" and provisions "Netlify Edge Functions for Edge Middleware". Edge-runtime SSR pages run in the functions region. Headers and redirects are evaluated after middleware. pnpm needs `PNPM_FLAGS` or a `.npmrc` hoisting rule. — [OpenNext: Netlify](https://opennext.js.org/netlify)
- Next 16: `proxy.ts` replaces `middleware.ts` (deprecated, still supported) and defaults to the Node.js runtime. — secondary sources: [DEV: Next.js 16 proxy.ts migration](https://dev.to/iurii_rogulia/nextjs-16-proxyts-migration-from-middlewarets-28km); [John Kavanagh](https://johnkavanagh.co.uk/articles/next-js-proxy-replaces-middleware/) (not verified against nextjs.org in this session)
- The opennextjs-netlify repo has a test fixture "npm monorepo with proxy / node middleware", with a comment treating "proxy ~= node middleware". This indicates `proxy.ts` is handled on the same path as Node middleware. — [opennextjs-netlify commit (mirror)](https://scriptagc.wasmer.app/https_github_com/opennextjs/opennextjs-netlify/commit/ff5479e5feabac8aa1c9719440b8e6a7ded3993e)
- Known issue history: `MiddlewareRequest` "only works in a Netlify Edge Function environment" errors under `netlify dev`. — [opennextjs-netlify issue #2735](https://github.com/opennextjs/opennextjs-netlify/issues/2735). Older forum reports of Node-only SDKs (firebase-admin) failing in edge middleware. — [answers.netlify.com](https://answers.netlify.com/t/cant-import-next-server-from-edge-function/105705)
- Known open adapter issues are tracked at the e2e report. — [runtime-e2e-report.netlify.app](https://runtime-e2e-report.netlify.app/) (referenced by Netlify docs, not opened)

### Inferences
- A `proxy.ts` with a `matcher` for `/q/:path*` and `/:code([A-Za-z0-9]{6})` could do the same fetch and redirect at the edge. However:
  - It runs before every matched request and ships Next's middleware runtime in the bundle.
  - Importing `@wbm/core` (Drizzle plus `pg` TCP, `node:fs`) would fail or bloat the bundle, so the code must stay `fetch`-only anyway.
  - Netlify-specific `context.waitUntil` is not exposed the same way. Next's `event.waitUntil` (NextFetchEvent) or `after()` would have to be used, and their behavior on the Netlify adapter is not documented (gap).
  - The 6-char root code matcher must exclude real routes (`/admin`, `/login`, ...), which is error-prone.
- A plain Netlify edge function (`apps/web/netlify/edge-functions/scan.ts`, `config.path` for `/q/*` plus a `pattern` for 6-char codes with `excludedPath` for known routes) gives direct `context.waitUntil`, `Netlify.env`, `onError: "bypass"` (falls through to the existing Next route if the edge code throws), and independence from plugin-nextjs internals. This is the lower-risk option.
- Alternative placement: put the edge function on the static launch site (seitenwerk.world), which already 302s `/q/*` and `/:code`. The edge function there records the scan and redirects straight to `/d/{slug}` on the app, saving one hop and keeping the Next build untouched. Netlify env vars are per site, so the Supabase key would need to be added there too.

### Gaps
- No official Netlify or Next doc found stating explicitly that Next 16 `proxy.ts` on Netlify runs in Deno edge rather than in the Node server handler. This is inferred from the "Node.js Middleware" limitation listed under "Implemented automatically via Edge Functions" and from the opennext test naming. Verify after deploy: the response header `x-nf-edge-functions` or the edge function logs in the Netlify UI should show it.
- `after()` / `NextFetchEvent.waitUntil` semantics under plugin-nextjs 5.16 are not documented.

## 5. Does a client abort cancel edge execution or `waitUntil` work?

### Takeaway
Not documented by Netlify. `waitUntil` is specified as running *after* the response is sent, which suggests it does not depend on the client staying connected. No source confirms abort behavior for Netlify.

### Cited Findings
- `waitUntil` lets you "perform any tasks after the response is sent, such as emitting analytics events". — [Netlify Docs: Edge Functions API](https://docs.netlify.com/build/edge-functions/api/)
- Comparable platforms: on Supabase Edge Functions, the instance "continues to run until the promise provided to waitUntil completes". Next.js fixed a bug where `after()` in an edge page did not run if the request was cancelled or aborted (Vercel edge runtime). This shows that abort handling is a real edge case across platforms. — [Supabase Docs: Background tasks](https://supabase.com/docs/guides/functions/background-tasks); [Next.js commit via semanticdiff](https://app.semanticdiff.com/gh/vercel/next.js/commit/69afa37323610c9bbfbecd22f0194f2f299d5a6c)

### Inferences
- For a 302 the response is sent within milliseconds. A QR scanner app or browser almost never aborts before receiving a 302, so the risk is small.
- To be robust, start the insert before returning: create the promise first, then pass it to `waitUntil`. Alternatively, if lookup and insert run in one RPC that is awaited (about 1 EU round trip), the count is recorded before the redirect is sent, at the cost of tens of ms.
- Keep the existing Node route as a fallback (`onError: "bypass"`), and keep the worker-side reconciliation (for example, a `demo_view` on `/d/{slug}` without a preceding `scan` event within N seconds counts as a scan) as a safety net.

### Gaps
- Netlify does not document what happens to in-flight edge execution or `waitUntil` promises when the client disconnects. This must be tested (for example, `curl --max-time 0.01` against the edge path, then check that the event row exists).

## 6. Real-world TTFB for Netlify edge redirects, and the remaining bottleneck

### Takeaway
No independent post-2025 benchmark exists. Netlify's own numbers (5–6 ms warm median, about 9 ms cold on about 1.2 %) suggest an edge 302 typically arrives in tens of ms, plus network RTT. **However, the redirect target `/d/{slug}` is still rendered by the Next Lambda**, so a cold start would simply move to the next request unless the demo page is also served without the Lambda.

### Cited Findings
- Netlify-reported latency after the microVM migration: p50 about 5–6 ms warm, about 9 ms cold (about 1.2 % of invocations). — [Netlify Blog](https://www.netlify.com/blog/edge-functions-firecracker-microvms/)
- Older independent test (US East, pre-microVM): CDN about 170 ms TTFB, cold serverless 877 ms, worst-case edge 1,559 ms (cold start captured). — [comparedge / Bejamas via search summary](https://comparedge.com/tools/netlify/performance)
- Netlify forum threads on slow TTFB (multi-second waits) generally concern serverless or SSR functions, not edge. — [answers.netlify.com: 4+ seconds waiting for server response](https://answers.netlify.com/t/4-seconds-waiting-for-server-response/114409); [Poor Server Response Time](https://answers.netlify.com/t/poor-server-response-time-time-to-first-byte/134290) (not opened in full)
- Netlify status recorded "increased Function latency" on both edge networks on 26.01.2026 (resolved). — [pingoru incident log](https://pingoru.io/providers/netlify/incidents/111230)

### Inferences (key for the overall decision)
- An edge function solves (a) counting the scan instantly and (b) the instant 302. It does **not** by itself solve the 9–11 s cold start for the demo page `/d/{slug}`, which is Next-rendered in the Lambda (us-east-2). Options to close that gap within 0 € (all inferences):
  1. Have the edge function serve or rewrite to a **static snapshot** of the demo (the repo already has `snapshot-demos.mjs` producing `public/notfall/<slug>.html` for emergencies). Static assets come from the CDN with no Lambda. Trade-off: buy, question and no-interest flows need the app. Links can still point to Lambda routes, since a few seconds there are acceptable once the page is visible.
  2. Cache `/d/{slug}` at the CDN (`Netlify-CDN-Cache-Control` / `Cache-Control: s-maxage` plus `stale-while-revalidate` on the Next response), so repeat or pre-warmed hits avoid the Lambda. The first hit after a deploy still needs a pre-warm request, for example from the worker after publishing a demo or deploying.
  3. Keep the Lambda warm with periodic pings from the VPS worker. This costs compute credits: 1 GB × short invocations is small but non-zero. Every ping is a web request plus some GB-seconds. Netlify cold starts also recur after deploys and scaling, so this is not guaranteed.
- Cost check for the edge path on the Free plan: about 2 credits per 10,000 scans (web requests) plus 0 compute, plus one 15-credit deploy to ship it. This is well within the 300-credit cap. The only risk to the cap is from other usage (deploys at 15 each, Lambda GB-hours, bandwidth at 20 credits/GB).
- Measure after deploy: `curl -w '%{time_starttransfer}' -o /dev/null -s https://<app>/q/<testtoken>` from an EU host (the VPS) repeated cold and warm, and compare with a static asset on the same site.

### Gaps
- No European-measured Netlify edge redirect TTFB found. No measurement of the end-to-end time from scan to rendered demo.
- Whether Netlify CDN caching of a Next 16 App Router dynamic page via plugin-nextjs 5.16 headers works as expected was not researched here (outside this scope).
