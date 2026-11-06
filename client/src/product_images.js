// Compatibility for existing database/cart entries that reference the supplied JPG or PNG assets.
// Custom remote photos and unrelated local assets are never replaced.
const suppliedPhotos = new Set(["authority-graphic-tee-front", "beige-tribal-hoodie-back", "beige-tribal-hoodie-front", "born-to-die-graphic-tee-front", "dragon-graphic-tee-front", "farmeri-maroon-tee-back", "farmeri-maroon-tee-front", "freedom-alien-hoodie-back", "freedom-alien-hoodie-front", "pink-graphic-hoodie-back", "pink-graphic-hoodie-front", "rick-and-morty-hoodie-back", "rick-and-morty-hoodie-front", "scarface-graphic-tee-front", "spider-white-tee-front", "tribal-skull-hoodie-back", "tribal-skull-hoodie-front"]);
export function productImage(value) {
  if (typeof value !== "string") return value;
  const match = value.match(/^\/assets\/([^/?#]+)\.(?:jpg|png)([?#].*)?$/);
  return match && suppliedPhotos.has(match[1])
    ? `/assets/${match[1]}.webp${match[2] || ""}` : value;
}
export function normalizeProductImages(value) {
  if (typeof value === "string") return productImage(value);
  if (Array.isArray(value)) return value.map(normalizeProductImages);
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeProductImages(item)]));
  return value;
}

const cropped = new Set(["authority-graphic-tee", "born-to-die-graphic-tee", "dragon-graphic-tee", "farmeri-maroon-tee", "scarface-graphic-tee", "spider-white-tee"]);
export function garmentImage(product) {
  if (product.hangerImage) return product.hangerImage;
  const front = productImage(product.images?.[0]);
  return cropped.has(product.slug) && front === "/assets/" + product.slug + "-front.webp"
    ? "/assets/hero-tees/" + product.slug + ".webp" : front;
}
