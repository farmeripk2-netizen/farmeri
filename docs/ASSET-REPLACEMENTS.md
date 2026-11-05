# Farmeri artwork and content handoff

All included SVG files are original local **placeholder illustrations**, not product photographs or exact reproductions of the unseen reference video. No random internet images are hotlinked. Fonts are installed locally from Fontsource packages.

| Asset | Recommended replacement |
|---|---|
| `client/public/assets/placeholder-angel.svg` | Transparent WebP/PNG angel + rock cutout, 1800 × 1260 or larger |
| `client/public/assets/placeholder-clouds.svg` | Transparent WebP clouds, 2400 × 525 |
| `client/public/assets/placeholder-*-front.svg` | Product front photo/cutout, 1200 × 1500, consistent framing |
| `client/public/assets/placeholder-*-back.svg` | Matching product back photo, 1200 × 1500 |
| Navbar/footer text logo in `Layout.jsx` | Original Farmeri logo SVG with a suitable accessible label |
| Category artwork in `Home.jsx` | Men/women/accessories editorial photos, 1200 × 1400; accessories tile currently uses a collection illustration |
| Lookbook artwork in `Home.jsx` | Three licensed/owned lifestyle shots, 1200 × 1200 |

Replacing a file with a different extension requires updating its reference in `Home.jsx`, `Static.jsx`, `Account.jsx`, or the product image URLs through admin. For seeded products, updating `catalog.json` does not overwrite an existing database product; use admin to update it.

Also replace: sample size chart in `Product.jsx` and `Static.jsx`; draft shipping/returns, privacy and terms in `Static.jsx`; demo delivery estimate; support email in admin; product fabric/specification text; founder/manufacturing story. No unverifiable founder biography or customer testimonials were invented.

Provide the original video/Figma reference to perform a visual comparison. Current acceptance is against the written direction only.
