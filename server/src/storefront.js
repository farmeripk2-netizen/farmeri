import { readFileSync } from "node:fs";
import { z } from "zod";

// This file is mirrored in the frontend for its pre-fetch defaults.
export const defaults = JSON.parse(
  readFileSync(new URL("./storefront-defaults.json", import.meta.url), "utf8"),
);
const safePath = (v) => /^\/(?!\/)[^\\\s\x00-\x1f]*$/.test(v);
const external = (v) => /^https:\/\//i.test(v) && URL.canParse(v);
export const imageUrl = z
  .string()
  .max(1000)
  .refine(
    (v) =>
      !v ||
      (v.startsWith("/assets/") && safePath(v)) ||
      (v.startsWith("https://res.cloudinary.com/") && external(v)),
    "Upload an image or use a local asset or Cloudinary URL",
  );
export function schemaFor(example, key) {
  if (Array.isArray(example)) return z.array(schemaFor(example[0])).max(30);
  if (typeof example === "object")
    return z.object(
      Object.fromEntries(
        Object.entries(example).map(([k, v]) => [
          k,
          schemaFor(v, k).default(v),
        ]),
      ),
    );
  if (typeof example === "boolean") return z.boolean();
  if (["logo", "image", "mountains", "statue", "clouds"].includes(key))
    return imageUrl;
  if (key === "href")
    return z
      .string()
      .max(1000)
      .refine(
        (v) => safePath(v) || external(v) || /^#[\w-]+$/.test(v),
        "Use a page path (like /shop), a section link, or an HTTPS URL",
      );
  return z.string().max(4000);
}
export const storefrontSchema = schemaFor(defaults);
export const storefrontContent = (value) => storefrontSchema.parse(value || {});
