# Farmeri Rack and Storefront update

Apply the ZIP at the Farmeri project root. It contains both `client/` and `server/`. Overwrite the matching project files and keep your existing environment files, production configuration, and MongoDB connection. Deploy the API first, then rebuild/redeploy the frontend. Do not run the database seed or catalog refresh for this update.

## Merchandising

- **Admin → Products → Add product / Edit → Show this product in.** Select any combination of Hero carousel, Rack, Featured and New Drops. Published products with no selections remain available in the shop.
- **Admin → Rack.** Search the active catalogue and add or remove a garment from the rail without changing any of its other placements or deleting the listing.
- Existing Featured and New Drops selections are preserved. Existing products do not acquire Hero or Rack selections automatically. Pick the garments you want in those two sections after deployment. The Hero keeps its normal artwork while its carousel is empty.
- Add an optional front-facing, transparent PNG/WebP cutout in the product editor for the best fit on the rack. Without a cutout, the first product photo is used. The second product photo, if supplied, is used for the Back view.
- The two Featured displays use the same Featured selection: the first is a carousel, the later one is a grid.

## Editable content

- **Admin → Storefront** controls the navbar and mobile menu independently, logo images, footer columns, homepage copy/images/buttons, rack copy, collection and lookbook cards, newsletter, shop headings, About, Contact, size guide, FAQs and policy content.
- **Admin → Settings** controls the main Hero headline, announcement, shipping fees and threshold, tax, support email and delivery postal code prefixes. Enter amounts in PKR; existing numeric catalog amounts are not converted.
- Images can be uploaded from the editor when the existing Cloudinary credentials are configured. Existing local assets and Cloudinary links work without uploading a replacement.
- New checkout uses Pakistan, five-digit postal codes, PKR and Cash on Delivery. Old Indian/Razorpay orders keep their historical currency; new Razorpay checkout is disabled. Check any previous shipping prefixes in Settings and replace them with the Pakistani delivery areas you actually serve.

## Checks

Run `npm ci --prefix client`, `npm ci --prefix server`, `npm run build`, and `npm test` from the project root. The API integration suite uses an isolated MongoDB replica set; no production connection or seed is required.
