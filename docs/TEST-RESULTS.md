# Verification report

## Passed

- Frontend production build with Vite (`npm run build`).
- JavaScript syntax check of the Express application.
- **11 automated tests** in `commerce.test.js` and `http.test.js`:
  - Discount cap, free-shipping threshold, tax and nonnegative total calculations.
  - Rejection of disallowed cross-origin mutations.
  - Protected admin route rejects unauthenticated access.
  - Malformed login payload validation.
  - Valid login issues signed token and httpOnly cookie (database methods stubbed).
  - Invalid login rejection (database method stubbed).
  - Paginated product-list response contract (database methods stubbed).
  - Invalid checkout rejected before database mutation.
  - Unconfigured Razorpay produces an explicit configuration error.
- Chromium UI checks using **intercepted API fixtures**, not a real database:
  - Home at widths 360, 768, 1024 and 1440px, no horizontal overflow.
  - Mobile drawer navigation.
  - Product variant selection → add to bag → cart → checkout total preview.
  - Seventeen additional storefront/auth/static routes load without JavaScript page errors.
  - Mobile route overflow checks pass.
- Desktop and mobile homepage screenshots generated and visually inspected.

## Blocked / not verified

- The 12-test MongoDB integration suite could not initialize its temporary replica set. The MongoDB process exits with code 100 and `open: Operation not permitted` in this execution environment. This is **not a passing database test**. No permissions were weakened to run it.
- Real database registration, order persistence, concurrent stock transactions, idempotent order creation, customer/guest invoice authorization and cancellation restocking must be verified by running the included integration suite on the user's machine or CI with MongoDB process permissions.
- Real Razorpay test/live payments, webhook delivery, SMTP delivery and Cloudinary uploads require account configuration and were not exercised.
- Browser tests do not prove server/database behavior; their fixtures are explicitly identified in `ui-check-results.json` and `tests/ui-check.cjs`.
- No Lighthouse score, complete WCAG audit, hosted cookies/CORS test or production load test is claimed.
- No deployment was performed. Render/Vercel instructions are included.
- Original video was not supplied, so pixel matching against the video is unverified. All product/hero images are local replaceable illustrations.

## Repeat

From project root:

```bash
npm --prefix server test -- --testPathPattern="commerce.test.js|http.test.js"
npm test
npm run build
npx playwright install chromium
npm run test:ui
```

The UI script launches its own localhost Vite process and intercepts API calls. Run from the project root. It writes screenshots and results into `docs/`. It is a deterministic frontend check, not an end-to-end payment/store certification.
