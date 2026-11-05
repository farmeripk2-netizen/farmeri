# Farmeri visual update

Updated from the supplied farmeri.zip. Local work only, no deployment.

## Changes

- Supplied Farmeri logo in the header, footer, favicon and brand statement.
- EVERY FIT COUNTS replaces Fearless Soul, including page title and default settings.
- Men/Women removed from storefront navigation, home tiles and listings. Old /men and /women URLs redirect to /shop.
- Only T-shirts and Hoodies promoted; no accessories tile.
- 17 supplied photographs mapped to 11 distinct products, with matching front/back pairs where provided. Descriptive working product names need owner confirmation.
- Supplied photos used in the home carousel, collection tiles, lookbook and API seed catalog. Shop and detail photos come from the refreshed database catalog.
- Moving product strip with CSS perspective turns, hover/focus pause, explicit pause button and reduced-motion support. Single-photo products use the same image on both faces. This is photo animation, not physical 3D clothing or a 360-degree scan. Photos were preserved; CSS silhouettes clip white margins in the hero.
- Realistic stone winged statue inspired by the reference video's raised-arm pose, layered in front of red ORIGINALS, with the existing atmosphere and scroll parallax. Newly generated artwork, not an extracted/copyright-identical source statue or an interactive 3D model.
- Existing account, cart, checkout, payment and server behavior retained.

## Apply / run locally (Windows CMD)

1. Stop the running app. Back up your existing folder/database. Extract this ZIP to a new folder, or copy its farmeri folder contents over the existing project. Preserve your existing `.env` files. Dependencies and build output are excluded.
2. In the farmeri folder:

```bat
npm ci
npm --prefix server ci
npm --prefix client ci
```

3. Keep your existing server/.env and client/.env configuration; see the project's original README for first-time MongoDB and environment setup. No new environment variables or dependencies were added.
4. For a fresh database only, run the existing seed once to create initial settings/admin and products:

```bat
npm run seed
```

5. For both existing and new databases, apply the explicit catalog refresh with MongoDB available:

```bat
npm --prefix server run catalog:refresh
```

This upserts the 11 supplied product entries, changes their editorial fields/photos, and hides the original placeholder-image sample products without deleting records. Orders/users/custom products are not deleted. Prices and variants of matching real-product slugs are preserved on reruns. It hides the sample Accessories category and sets the headline. It is not an inventory import.

**Prices are provisional values inherited in spirit from the demo catalog (2300 per tee / 3200 per hoodie in the existing currency configuration). New products have ZERO stock so unverified inventory cannot be purchased. Before selling, confirm names, prices, sizes, fabric details and inventory in admin.** Existing checkout currency/country configuration was not changed by this visual update.

6. Start both apps from the project root:

```bat
npm run dev
```

7. Open the printed Vite URL. Hard refresh with Ctrl+Shift+R after applying the update.
8. Production build:

```bat
npm run build
```

No need to install a 3D library. Existing React/Framer Motion dependencies are reused.

## Check locally

- Header/footer show original Farmeri logo and T-shirts/Hoodies, no Men/Women links.
- Hero reads EVERY FIT COUNTS; actual shirts move and turn above red ORIGINALS and the winged stone statue.
- Pause/play button, pointer hover and keyboard focus pause the strip. OS reduced-motion preference disables movement and leaves a scrollable strip.
- T-shirts/Hoodies tiles open category filters; old /men and /women redirect to Shop all.
- After catalog refresh, home featured/new cards, shop, search and product detail use the supplied images. Check paired front/back for maroon tee, skull hoodie, Rick and Morty, beige, alien and pink hoodies. The other tees have one supplied photo.
- Resize to 390px and 1440px; check heading, logo, carousel, statue and menu.
- Set verified inventory/prices through admin, then check the existing add-to-cart flow locally.

## Validation performed

- Client production build passed.
- Server refresh/seed/model syntax checks passed.
- Catalog contains 11 unique product slugs and 17 unique original photographs; all image paths exist.
- Desktop browser checked logo, heading, product strip, realistic statue, category links and pause/play state.
- Existing local UI fixture test updated for the new headline/category navigation and explicit test-only stock; not run in this sandbox.
- No live MongoDB credentials were supplied: catalog refresh and transactional shopping flows were not executed here. API-backed product sections require your running backend and database; they show existing load errors when backend is absent. No claim of backend integration or mobile-device testing.

## Asset provenance

Product photographs and logo: supplied by user, copied unchanged.
Statue: generated with the built-in image-generation tool. Asset: client/public/assets/winged-statue.png.
Prompt: "Photorealistic full-body weathered pale limestone winged angel statue, fully dressed in flowing classical robes, both arms raised outward/upward, head tilted upward, carved feather wings spread, rocky plinth, frontal low angle, cinematic teal rim and warm stone lighting, transparent background, no text or logo."

The reference video itself is not bundled. It was used to inspect composition and movement.

## New and changed files

- `README.md`
- `client/index.html`
- `client/public/assets/authority-graphic-tee-front.jpg`
- `client/public/assets/beige-tribal-hoodie-back.jpg`
- `client/public/assets/beige-tribal-hoodie-front.jpg`
- `client/public/assets/born-to-die-graphic-tee-front.jpg`
- `client/public/assets/dragon-graphic-tee-front.jpg`
- `client/public/assets/farmeri-logo.jpg`
- `client/public/assets/farmeri-maroon-tee-back.jpg`
- `client/public/assets/farmeri-maroon-tee-front.jpg`
- `client/public/assets/freedom-alien-hoodie-back.jpg`
- `client/public/assets/freedom-alien-hoodie-front.jpg`
- `client/public/assets/pink-graphic-hoodie-back.jpg`
- `client/public/assets/pink-graphic-hoodie-front.jpg`
- `client/public/assets/rick-and-morty-hoodie-back.jpg`
- `client/public/assets/rick-and-morty-hoodie-front.jpg`
- `client/public/assets/scarface-graphic-tee-front.jpg`
- `client/public/assets/spider-white-tee-front.jpg`
- `client/public/assets/tribal-skull-hoodie-back.jpg`
- `client/public/assets/tribal-skull-hoodie-front.jpg`
- `client/public/assets/winged-statue.png`
- `client/src/Account.jsx`
- `client/src/Home.jsx`
- `client/src/Layout.jsx`
- `client/src/Shop.jsx`
- `client/src/Static.jsx`
- `client/src/collection.js`
- `client/src/main.jsx`
- `client/src/styles.css`
- `client/src/ui.jsx`
- `client/vite.config.js`
- `docs/FARMERI-VISUAL-UPDATE.md`
- `server/package.json`
- `server/src/catalog.json`
- `server/src/models.js`
- `server/src/refresh-catalog.js`
- `server/src/seed.js`
- `tests/ui-check.cjs`
