# Farmeri API reference

Base: `http://localhost:5000/api/v1`.

Success: `{ "success": true, "data": ... }`. Failure: `{ "success": false, "error": "Readable message" }`.

Protected calls use `Authorization: Bearer <accessToken>`. Refresh uses an httpOnly cookie scoped to `/api/v1/auth`. Admin requires role `admin`. Money is integer **paise**: `230000` means ₹2,300.00. Request bodies are JSON unless specified otherwise.

| Method | Path | Access | Body / query | Response data |
|---|---|---|---|---|
| GET | `/health` | Public | — | Readiness; 503 if DB unavailable |
| POST | `/auth/register` | Public | name, email, password (10+ chars) | accessToken, user; sets refresh cookie |
| POST | `/auth/login` | Public | email, password | accessToken, user; sets refresh cookie |
| POST | `/auth/refresh` | Refresh cookie | — | Rotated session and access token |
| POST | `/auth/logout` | Cookie | — | Clears refresh session |
| GET | `/auth/me` | Customer | — | User |
| POST | `/auth/forgot-password` | Public | email | Generic acknowledgement |
| POST | `/auth/reset-password` | Token | token, password | Message |
| POST | `/auth/verify-email` | Token | token | Message |
| POST | `/auth/resend-verification` | Customer | — | Message |
| GET/PATCH | `/users/me` | Customer | PATCH: name | Profile |
| PATCH | `/users/me/password` | Customer | currentPassword, password | Message |
| GET/POST | `/users/me/addresses` | Customer | POST: address fields | Addresses |
| PATCH/DELETE | `/users/me/addresses/:id` | Owner | PATCH: address fields | Addresses |
| GET | `/users/me/wishlist` | Customer | — | Product array |
| POST/DELETE | `/users/me/wishlist/:id` | Customer | Product ID in path | Message |
| GET | `/products` | Public | q, category, gender, size, color, min/max (paise), available, featured, new, sort, page, limit | items, total, page, pages |
| GET | `/products/search` | Public | Same as list | Paginated products |
| GET | `/products/featured` | Public | list parameters | Featured products |
| GET | `/products/new-arrivals` | Public | list parameters | New products |
| GET | `/products/:slug` | Public | — | Product and variants |
| GET | `/products/:slug/related` | Public | — | Up to four related products |
| GET | `/products/:id/reviews` | Public | Product ID | Approved reviews |
| GET | `/categories` | Public | — | Active categories |
| GET | `/settings/public` | Public | — | Store settings, onlinePaymentsEnabled |
| GET | `/testimonials` | Public | — | Up to three approved verified positive reviews |
| POST | `/shipping/check` | Public | postalCode | available, message |
| GET | `/cart` | Customer | — | Cart items with populated product |
| PUT | `/cart` | Customer | items: [{product,sku,qty}] (empty allowed) | Saved cart |
| POST | `/cart/merge` | Customer | items | Merged populated cart |
| POST | `/checkout/quote` | Public | items, optional coupon | Item snapshots and computed totals |
| POST | `/coupons/validate` | Public | items, coupon | Computed quote |
| POST | `/orders` | Public/customer | Checkout payload; Idempotency-Key header | order, guestToken (guest only) |
| GET | `/orders/mine` | Customer | — | Latest 100 owned orders |
| POST | `/orders/track` | Public, rate limited | number, email | Only number, status, history, trackingNumber |
| GET | `/orders/:id` | Owner/admin/guest token | X-Order-Token for guest | Private order detail |
| GET | `/orders/:id/invoice` | Owner/admin/guest token | Same as order | PDF binary |
| POST | `/payments/create-order` | Order owner/token | orderId | key, provider orderId, amount, currency |
| POST | `/payments/verify` | Order owner/token | orderId, razorpay_payment_id, razorpay_signature | Updated order |
| POST | `/payments/webhook` | Provider signature | Raw signed JSON; x-razorpay-signature | received |
| POST | `/reviews` | Verified customer, delivered purchase | product, rating (1–5), title, comment | Pending review |
| POST | `/contact` | Public | name, email, subject, message | Message |
| POST | `/newsletter` | Public | email | Message |
| GET | `/admin/stats` | Admin | — | Revenue, orders, customers, top, lowStock, recent |
| GET/POST | `/admin/products` | Admin | POST: product schema | Product array/new product |
| PUT/DELETE | `/admin/products/:id` | Admin | PUT: full product schema | Updated product/archive message |
| GET/POST | `/admin/categories` | Admin | name, slug, image, gender, isActive | Array/new category |
| PUT/DELETE | `/admin/categories/:id` | Admin | PUT: category schema | Category/archive message |
| GET | `/admin/orders` | Admin | optional status | Latest 500 orders |
| PATCH | `/admin/orders/:id/status` | Admin | status, trackingNumber?, refundNote? | Order |
| GET | `/admin/customers` | Admin | — | Latest 500 customers |
| GET/POST | `/admin/coupons` | Admin | POST: coupon schema | Array/new coupon |
| PUT/DELETE | `/admin/coupons/:id` | Admin | PUT: full coupon schema | Coupon/disable message |
| GET | `/admin/reviews` | Admin | — | Reviews |
| PATCH | `/admin/reviews/:id` | Admin | status: pending/approved/rejected | Review; rating recalculated |
| GET | `/admin/contacts` | Admin | — | Inbox |
| PATCH | `/admin/contacts/:id` | Admin | status: new/read/resolved | Contact message |
| GET/PUT | `/admin/settings` | Admin | PUT: settings schema | Settings |
| POST | `/admin/uploads` | Admin | multipart `images`, max 10 files | Cloudinary URL array |

`GET /sitemap.xml` is outside the `/api/v1` prefix.

Sort values: `newest`, `price-asc`, `price-desc`, `best-selling`. List limit max 50. Admin lists are bounded; admin search currently filters loaded records client-side.

## Checkout payload

```json
{
  "email": "buyer@example.com",
  "items": [{"product": "REPLACE_WITH_PRODUCT_ID", "sku": "FM-001-M", "qty": 1}],
  "coupon": "FIRST10",
  "address": {
    "name": "Test Buyer",
    "phone": "+919876543210",
    "line1": "12 Example Street",
    "line2": "",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postalCode": "400001",
    "country": "India"
  },
  "paymentMethod": "cod"
}
```

Use a unique UUID `Idempotency-Key` for each intended order and reuse it only for retries of the same payload. The server rejects reuse with changed data. Never send trusted totals from the browser; unknown price/total fields are discarded.

## Local curl examples

```bash
curl http://localhost:5000/api/v1/health
curl "http://localhost:5000/api/v1/products?sort=price-asc&limit=4"
curl -c cookies.txt -H "Content-Type: application/json" -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}' http://localhost:5000/api/v1/auth/login
curl -b cookies.txt -c cookies.txt -X POST http://localhost:5000/api/v1/auth/refresh
```

In PowerShell use `curl.exe`, or use Postman with the same URL/method/JSON. Save the login `accessToken` as a Postman variable, then set Bearer auth on customer/admin requests. Postman retains the refresh cookie. Use `docs/checkout-example.json` as a starting order body, replacing its product ID with one from `/products`.

## Status rules

- Pending → Confirmed / Cancelled
- Confirmed → Packed / Cancelled
- Packed → Shipped / Cancelled
- Shipped → Delivered / Returned
- Delivered → Returned
- Cancelled and Returned are terminal.

Online orders cannot progress without captured payment. Cancelling/returning restores inventory once. Paid cancelled/returned orders require a manual provider refund. COD marks payment paid on delivery. Reviews need verified email and a delivered purchase; one review per customer/product.
