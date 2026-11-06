# Farmeri — MERN clothing store

A locally developed React/Express/MongoDB store with a dark teal streetwear interface, catalog, cart, checkout, customer accounts and admin studio. Reference structure: https://www.dussu.store/. Visual direction follows the supplied Farmeri brief.

## Delivery status

Application source is included for storefront, account, admin, backend, integrations and deployment configuration. **This is a local development build, not a deployed or production-certified store.** Supplied Farmeri logo, product photography and reference-video visual update are now included. See docs/FARMERI-VISUAL-UPDATE.md for the required catalog refresh command, provisional inventory details and validation limits. Draft policies still need owner review.

Currency: **PKR**. Country: **Pakistan**. New checkout uses **Cash on Delivery**. For product placements and the storefront editor, see [Rack and Storefront](docs/RACK-AND-STOREFRONT.md). Node 24 is used instead of the brief's end-of-life Node 20. React 18 and React Router 6 are retained.

Read `docs/TEST-RESULTS.md` for actual verification and limitations.

## 1. Prerequisites

- Node.js 24 LTS (Node 22 supported), npm.
- MongoDB 7+ replica set, or an Atlas development cluster. Transactions are required for checkout; a standalone MongoDB instance is insufficient.
- Optional integrations: Cloudinary and SMTP.

## 2. Install (Windows PowerShell)

Open a terminal in the extracted `farmeri` folder:

```powershell
npm install
npm run install:all
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste the generated value into `JWT_SECRET` in `server/.env`. Set:

```dotenv
CLIENT_URL=http://localhost:5173
PUBLIC_SITE_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/farmeri?replicaSet=rs0
ADMIN_EMAIL=your-own-admin-email@example.com
ADMIN_PASSWORD=choose-your-own-long-password
```

Use an actual private admin password of at least 12 characters. There are no shared hardcoded login credentials. Do not commit `.env` files.

For macOS/Linux use `cp` instead of `Copy-Item`.

## 3. MongoDB locally

Option A: Atlas development cluster. Create a database user, permit your current IP, copy the driver's connection URI into `MONGODB_URI`, and name the database `farmeri`. Do not expose your password in screenshots.

Option B: Dedicated local replica set on port **27018**, avoiding conflict with an existing MongoDB Windows service on 27017. Install MongoDB Community and mongosh, then run:

```powershell
New-Item -ItemType Directory -Force C:\farmeri-mongo
mongod --dbpath C:\farmeri-mongo --port 27018 --replSet rs0 --bind_ip 127.0.0.1
```

Keep that window open. In another terminal:

```powershell
mongosh --port 27018 --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27018"}]})'
```

Run `rs.initiate()` only once for that data directory. Change server `.env`:

```dotenv
MONGODB_URI=mongodb://localhost:27018/farmeri?replicaSet=rs0
```

If `mongod` or `mongosh` is not on PATH, invoke its installed executable with its full Windows path. Never use an existing production data directory for this development instance.

## 4. Seed and run

```powershell
npm run seed
npm run dev
```

- Store: http://localhost:5173
- Login: http://localhost:5173/login
- Admin: http://localhost:5173/admin (log in using the admin you seeded)
- API readiness: http://localhost:5000/api/v1/health

The seed creates eight sample products, three categories and `FIRST10` (10% off; minimum ₹1,000). It preserves existing products/users/settings when rerun. Changing `ADMIN_PASSWORD` later does not overwrite an existing admin; use password reset or a controlled database maintenance procedure.

You can also run `npm run dev` separately inside `server` and `client`.

## 5. Configure integrations

### Email

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Messages are persisted in the `emailjobs` MongoDB collection and processed every 30 seconds while the API is running. Without SMTP, messages stay queued; the app does not falsely claim delivery. In local development, inspect `emailjobs.text` in MongoDB Compass to open verification/reset links. Never expose this collection publicly. Each job retries up to five times. The process is designed for one API instance; use a leased external worker before horizontal scaling.

### Product images

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Admin → Products supports JPEG/PNG/WebP upload, 8 MiB per image, up to ten per request. Multiple uploads allow up to twenty URLs on a product. Credentials remain on the server.

### Historical Razorpay orders

New checkout uses Cash on Delivery. Existing Razorpay orders retain their previous currency and provider handling. Keep existing Razorpay credentials only if historical orders still need reconciliation or refunds.

## 6. Project map

- `client/src/Home.jsx`: layered hero, featured carousel, category sections, arrivals and lookbook.
- `client/src/Shop.jsx`, `Product.jsx`: catalog and product details.
- `client/src/CartCheckout.jsx`: bag, checkout, order detail and invoice download.
- `client/src/Account.jsx`: auth, profile, addresses, orders, wishlist.
- `client/src/Admin.jsx`: catalog, orders, coupons, moderation, contacts and settings.
- `client/src/Static.jsx`: about, contact, tracking, FAQ, policy pages and 404.
- `client/src/state.js`: API client, access-token refresh, persisted guest cart and login merge.
- `server/src/models.js`: schemas and indexes.
- `server/src/app.js`: validated REST endpoints and middleware.
- `server/src/commerce.js`: pricing, transactions, stock, payments and status changes.
- `server/src/auth.js`, `email.js`: sessions and durable email queue.

The supplied folder plan was consolidated into cohesive modules rather than creating empty folders. The public contracts implemented in this build are documented in `docs/API.md`.

## 7. Tests and build

```powershell
npm test
npm run build
```

`npm test` includes the MongoDB replica-set integration suite. Its first run downloads a test MongoDB binary. It needs an environment that permits MongoDB to start. Database-free checks can be run separately:

```powershell
npm --prefix server test -- --testPathPattern="commerce.test.js|http.test.js"
```

These database-free HTTP tests stub database methods; they do not prove database integration. See the separate test report for what ran successfully in the delivery environment.

Production frontend output: `client/dist`. Full setup and deployment instructions are in `docs/DEPLOYMENT.md`.

## Known launch requirements

- Replace all sample garment measurements, draft policy text and demo product specifications.
- Configure and test SMTP and Cloudinary accounts.
- Run the full integration suite and manual QA on a machine with MongoDB permissions.
- Approve final content and complete hosted-domain checks before accepting customers.
- No fabricated customer testimonials are included. The homepage community section displays approved verified reviews when available.
