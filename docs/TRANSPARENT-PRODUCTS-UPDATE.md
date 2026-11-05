# Farmeri transparent product images — replacement patch

Built for the previously delivered farmeri-updated.zip project.

## Apply (Windows)

1. Stop npm run dev (Ctrl+C).
2. Extract this ZIP to a temporary folder.
3. Copy its client, server and docs folders into your existing farmeri project root (the folder with package.json). Choose Replace files in destination. Merge the folders; do not delete the existing folders. Your .env and dependencies are not included or overwritten.
4. Start npm run dev again. Hard refresh the browser with Ctrl+Shift+R.

No npm install, seed, database refresh or migration is required for this image-only update when your existing catalog contains the 11 Farmeri products from the previous delivery. Existing local JPG photo links in API responses and saved carts are mapped to the corresponding PNG paths on the client. Custom remote photos and unrelated local assets are preserved. The catalog JSON is updated for future fresh imports; no database writes were performed here.

17 supplied transparent PNGs cover all 11 products with front/back pairs where available. The files are copied unchanged from the attached PNGs. Previous approximate CSS shirt clipping has been removed, and hero images now use contain sizing so sleeves and hems remain visible. Existing animation, logo, layout, prices, stock and checkout behavior are retained. No dependencies or environment variables changed.

Validation: production Vite build passed; image compatibility checks passed; all 17 asset paths and source bytes verified; alpha transparency verified. Real database checkout and mobile device testing were not run for this image-only change.

## New / changed files

- client/src/Home.jsx
- client/src/collection.js
- client/src/styles.css
- client/src/state.js
- client/src/product_images.js
- client/src/CartCheckout.jsx
- server/src/catalog.json
- client/public/assets/authority-graphic-tee-front.png
- client/public/assets/beige-tribal-hoodie-back.png
- client/public/assets/beige-tribal-hoodie-front.png
- client/public/assets/born-to-die-graphic-tee-front.png
- client/public/assets/dragon-graphic-tee-front.png
- client/public/assets/farmeri-maroon-tee-back.png
- client/public/assets/farmeri-maroon-tee-front.png
- client/public/assets/freedom-alien-hoodie-back.png
- client/public/assets/freedom-alien-hoodie-front.png
- client/public/assets/pink-graphic-hoodie-back.png
- client/public/assets/pink-graphic-hoodie-front.png
- client/public/assets/rick-and-morty-hoodie-back.png
- client/public/assets/rick-and-morty-hoodie-front.png
- client/public/assets/scarface-graphic-tee-front.png
- client/public/assets/spider-white-tee-front.png
- client/public/assets/tribal-skull-hoodie-back.png
- client/public/assets/tribal-skull-hoodie-front.png
