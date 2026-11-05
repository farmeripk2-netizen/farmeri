# Farmeri hero swipe carousel

Apply on top of the previous transparent-product website update.

## Replace

1. Stop npm run dev (Ctrl+C).
2. Extract the ZIP, then copy its client and docs folders into your existing farmeri project root. Merge folders and replace matching files; do not delete existing folders.
3. Start npm run dev again and hard-refresh with Ctrl+Shift+R.

No npm install, database update, migration or environment changes.

## Behavior

- Replaces the automatic rotating strip with a manually scrollable T-shirt carousel using the existing six hero products and transparent photos.
- Mobile: swipe left/right with a finger; native momentum scrolling and center snapping. Vertical page scroll and pinch zoom remain available.
- Desktop: drag horizontally using the mouse, scroll sideways on a trackpad, or use previous/next buttons.
- The closest product grows smoothly to 1.2x while outer products shrink toward .72x; the center product faces forward.
- A tap/click opens that product's existing /product/:slug detail route. A mouse drag is distinguished from a click so dragging does not accidentally navigate.
- First/last products can center fully; navigation buttons disable at the ends.
- Keyboard: Tab to a product, Left/Right/Home/End navigate products, Enter opens the focused product. Focused products scroll to center.
- Reduced-motion preferences avoid smooth programmatic scrolling. No autoplay remains to fight with finger scrolling.
- Existing page styling, product images, other sections and backend retained.

## Validation

- Production Vite build passed.
- Desktop browser: center sizing checked (center approx. 1.20, neighbor approx. .86, outer .72).
- Next button changed the center item.
- Mouse drag moved the carousel and stayed on the homepage instead of triggering navigation.
- Clicking the centered product navigated to its matching product detail URL.
- Backend was not running in preview, so database-backed product details were not re-tested. Product routes still require your existing backend/catalog.
- Real-device finger gestures were not tested here; mobile swipe uses native browser scrolling. Locally test at phone width: swipe both ways, release to snap, tap to open, and confirm vertical page scrolling still works.

## Files

- client/src/Home.jsx
- client/src/HeroProductCarousel.jsx (new)
- client/src/styles.css
- docs/HERO-SWIPE-UPDATE.md
