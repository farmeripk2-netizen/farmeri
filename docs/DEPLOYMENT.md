# Render + Vercel deployment

Deployment is a later step after local acceptance. No accounts were accessed and no website was published in this delivery.

## MongoDB Atlas

1. Create a cluster and a database user with access only to the `farmeri` database.
2. Add your development IP and the backend's outbound addresses to Network Access. Avoid an unrestricted allowlist when stable outbound addresses are available.
3. Put the connection string, including `/farmeri`, in `MONGODB_URI`. URL-encode special characters in credentials.
4. Run the seed once against the intended database. Do not use demo products as final launch data.

## Backend on Render

Create a Node Web Service from your own Git repository:

| Setting | Value |
|---|---|
| Root directory | `server` |
| Runtime | Node 24 |
| Build | `npm ci --omit=dev` |
| Start | `npm start` |
| Health check | `/api/v1/health` |

Set `NODE_ENV=production`, `JWT_SECRET`, `MONGODB_URI`, `CLIENT_URL=https://YOUR-FRONTEND.vercel.app`, `PUBLIC_SITE_URL=https://YOUR-FRONTEND.vercel.app`. Copy configured SMTP, Cloudinary and Razorpay variables from the `.env.example`; never commit actual values. Render supplies `PORT`.

For first-time admin provisioning, run the seed from a trusted local terminal pointed at Atlas with `ADMIN_EMAIL` and `ADMIN_PASSWORD`, or use a controlled service shell. Remove admin bootstrap credentials from runtime configuration afterwards. Inspect service logs for startup and background job errors.

Use a continuously running service for reliable email delivery and reservation cleanup. Sleeping/free instances may delay jobs and add cold-start latency. Current plan limits and pricing should be checked in your dashboard.

## Frontend on Vercel

Import the same repository:

| Setting | Value |
|---|---|
| Root directory | `client` |
| Framework | Vite |
| Build | `npm run build` |
| Output | `dist` |
| Environment | `VITE_API_URL=https://YOUR-API.onrender.com/api/v1` |
| Environment | `VITE_SITE_URL=https://YOUR-FRONTEND.vercel.app` |

The included `vercel.json` sends app deep links to `index.html` while keeping asset requests intact. Set the backend `CLIENT_URL` to the exact frontend origin, without a trailing slash. Vite variables are embedded at build time, so redeploy the frontend after changing them.

## Cross-domain authentication

The production refresh cookie uses `httpOnly`, `Secure`, `SameSite=None`; Axios uses credentials and the API has an explicit origin allowlist. Mutations from unapproved Origin headers are rejected. Access tokens stay in memory.

Some browsers block third-party cookies between unrelated `vercel.app` and `onrender.com` domains. For reliable sessions use custom domains under the same parent (for example `www.yourbrand.com` and `api.yourbrand.com`) or configure a same-origin `/api` reverse proxy. Check actual browser behavior rather than assuming `SameSite=None` guarantees availability.

## Razorpay webhook

- Endpoint: `https://YOUR-API.onrender.com/api/v1/payments/webhook`
- Event: `payment.captured`
- Set the same webhook secret in Razorpay and `RAZORPAY_WEBHOOK_SECRET`.
- Test valid signatures, invalid signatures, duplicate events, capture, abandoned checkout and capture after expiry.
- Enable automatic capture in the provider account, or deliberately configure and implement your capture policy before launch. This build confirms only captured payments.
- Replace test credentials with live credentials only after account activation and successful test flows.
- Late captures/cancelled paid orders are marked for manual refund; admin notes do not execute refunds.

## SEO and domains

The API serves dynamic `GET /sitemap.xml` with storefront product URLs. After domain setup add a Vercel rewrite **before** the SPA rule:

```json
{"source":"/sitemap.xml","destination":"https://YOUR-API.onrender.com/sitemap.xml"}
```

Append `Sitemap: https://YOUR-FRONTEND-DOMAIN/sitemap.xml` to `client/public/robots.txt`. Check the response is XML, not the SPA shell. Set canonical host variables and redirect alternate hosts through your hosting dashboard. HTTPS must be active before testing production cookies.

The frontend has dynamic meta tags via Helmet. Some social crawlers do not execute JavaScript; reliable per-product social previews require prerendering or SSR. This is documented rather than claimed solved by client-side tags alone.

## Acceptance checklist

- Health check succeeds and MongoDB transactions execute.
- Login, refresh, logout and reset work on final domains.
- Guest COD, customer COD and online test payment complete.
- Inventory cannot oversell under concurrent requests.
- Capture callbacks and webhook replays are idempotent.
- Expired unpaid order stock is restored; late capture is flagged for refund.
- Emails arrive and product uploads render.
- Admin status transitions and invoice access controls work.
- CORS rejects untrusted origins; private order data is not public.
- All draft brand/legal content and sample imagery have been replaced.
- Mobile, keyboard navigation and deep links pass QA.
- Submit sitemap only after final data and domain are ready.

## Scale notes

The app is configured for one API process. Before horizontal scaling add a shared rate limiter and leased email/background workers. Admin collection lists are bounded (500/1000 records); add server-side admin pagination as data grows. Customer orders are limited to the latest 100. Guest order tokens survive the current browser tab session; email/order-number tracking exposes only status. Full guest invoice retrieval on another device requires a future emailed secure access-link flow.

## Official references

- https://render.com/docs/deploy-node-express-app
- https://render.com/docs/health-checks
- https://vercel.com/docs/frameworks/frontend/vite
- https://vercel.com/docs/routing/rewrites
- https://www.mongodb.com/docs/manual/reference/command/replsetinitiate/
- https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/
- https://nodejs.org/en/about/eol
