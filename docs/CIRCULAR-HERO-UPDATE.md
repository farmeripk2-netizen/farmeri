# Farmeri circular hero update

## Replace

Stop npm run dev. Extract this ZIP, copy its client and docs folders into the existing farmeri project root, and replace matching files. Merge folders; do not delete the existing folders. Restart npm run dev and hard-refresh with Ctrl+Shift+R.

Requires the previous transparent product image update. This patch replaces the earlier linear swipe carousel. No install, database command, new dependency or environment changes.

## Behavior

The T-shirts now move on a full circular / oval orbit. Finger swipes, mouse drag, horizontal trackpad gestures and the arrow buttons turn the circle. Front products grow and move in front; back products shrink and pass behind. The cycle has no first/last end stop. Six existing T-shirt designs are repeated around twelve circle positions. Photos remain image assets, not physical 3D garment models.

Tap/click opens the existing product detail route. Dragging is distinguished from clicking. Vertical touch gestures continue scrolling the page. Keyboard Tab focuses/centers products; arrow keys navigate around the circle; Enter opens the focused product. Reduced-motion preference disables spring movement.

Blue hero atmosphere, smaller central statue, red ORIGINALS behind it and a mountain/cloud foreground follow the supplied reference composition. Farmeri's EVERY FIT COUNTS heading and existing branding remain.

Validation: production build passed. Desktop browser verified the full-circle layout, mouse drag changing the front product without navigating, and a subsequent click opening the matching /product/spider-white-tee route. Real phone touch gestures and database-backed detail loading were not tested here (backend not running in preview).

## Files

- client/src/Home.jsx
- client/src/HeroProductCarousel.jsx
- client/src/styles.css
- client/public/assets/hero-mountains.png
- docs/CIRCULAR-HERO-UPDATE.md

## New asset

hero-mountains.png generated with the built-in image-generation tool. Prompt: photorealistic wide icy-blue alpine ridge, higher clusters left/right, low open central valley for a separately placed statue, white clouds and fog at base, transparent background, no sky/statue/text/logos. The supplied product photos were not regenerated or changed for this update.
