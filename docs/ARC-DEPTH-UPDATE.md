# Farmeri arc depth correction

Apply over the previous circular hero update.

1. Stop npm run dev (Ctrl+C).
2. Extract this ZIP and merge its client and docs folders into your existing farmeri project root. Replace matching files; do not delete existing folders.
3. Restart npm run dev and hard-refresh with Ctrl+Shift+R.

No install or database command is required.

This replaces the full-circle movement with one visible bowed arc. Shirts at the center are small/far away; shirts toward the left and right edges become large/close and angle toward the viewer. Every item follows that same visible arc. No second row travels behind the center shirt. Products repeat only after leaving the viewport at the edges, keeping scrolling continuous.

Finger swipe, mouse drag, horizontal trackpad scrolling, previous/next buttons and product detail links remain. Normal vertical touch scroll is preserved. Product assets, homepage heading, statue, mountains, backend, prices and inventory are unchanged.

Changed files:
- client/src/HeroProductCarousel.jsx
- client/src/styles.css
- docs/ARC-DEPTH-UPDATE.md

Validation: Vite production build passed; arc geometry checked (center scale .40, edge scale 1.54; opposite sides mirror). Real phone gestures and backend-backed product detail data were not tested for this focused visual correction.
