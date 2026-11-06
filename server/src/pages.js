import { z } from "zod";
import { defaults, schemaFor, storefrontContent } from "./storefront.js";
import { Page, settings } from "./models.js";

export const builtInPages = {
  home: ["Homepage", "/", null],
  shop: ["Shop", "/shop", "shop"],
  new: ["New Drops", "/new", "new"],
  about: ["About Us", "/about", "about"],
  contact: ["Contact", "/contact", "contact"],
  faq: ["FAQs", "/faq", "faq"],
  "size-guide": ["Size Guide", "/size-guide", "sizeGuide"],
  "shipping-returns": [
    "Shipping & Returns",
    "/shipping-returns",
    "shippingReturns",
  ],
  privacy: ["Privacy Policy", "/privacy", "privacy"],
  terms: ["Terms & Conditions", "/terms", "terms"],
  "track-order": ["Track Order", "/track-order", "trackOrder", true],
  search: ["Search", "/search", null, true],
  cart: ["Shopping Bag", "/cart", null, true],
  checkout: ["Checkout", "/checkout", null, true],
  account: ["My Account", "/account", null, true],
  wishlist: ["Wishlist", "/wishlist", null, true],
  login: ["Sign In", "/login", null, true],
  register: ["Register", "/register", null, true],
  "forgot-password": ["Forgot Password", "/forgot-password", null, true],
  "reset-password": ["Reset Password", "/reset-password", null, true],
  "verify-email": ["Verify Email", "/verify-email", null, true],
};
const reserved = new Set([
  ...Object.keys(builtInPages),
  "admin",
  "api",
  "assets",
  "product",
  "order",
  "men",
  "women",
  "about-us",
  "pages",
  "sitemap",
  "robots",
  "health",
]);
export const slugSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and hyphens",
  )
  .max(80);
export const seoSchema = z
  .object({
    title: z.string().trim().max(160).default(""),
    description: z.string().trim().max(500).default(""),
    keywords: z.string().trim().max(500).default(""),
    noIndex: z.boolean().default(false),
  })
  .default({});
export const customPageInput = z.object({
  slug: slugSchema.refine(
    (slug) => !reserved.has(slug),
    "This page URL is reserved",
  ),
  title: z.string().trim().min(1).max(160),
  intro: z.string().trim().max(1500).default(""),
  sections: z
    .array(
      z.object({
        title: z.string().trim().max(160),
        text: z.string().trim().max(10000),
      }),
    )
    .max(30)
    .default([]),
  published: z.boolean().default(false),
  seo: seoSchema,
});
const builtInInput = z.object({
  seo: seoSchema,
  content: z.unknown().optional(),
});
const shape = (field) =>
  field === "new"
    ? { title: defaults.pages.shop.newTitle }
    : defaults.pages[field];
export function parseBuiltIn(slug, input) {
  const [, , field, lockedNoIndex] = builtInPages[slug];
  const value = builtInInput.parse(input);
  if (lockedNoIndex) value.seo.noIndex = true;
  return {
    seo: value.seo,
    ...(field && value.content !== undefined
      ? { content: schemaFor(shape(field)).parse(value.content) }
      : {}),
  };
}
export function builtInView(slug, site, entry) {
  const [label, path, field, lockedNoIndex] = builtInPages[slug];
  const copy = storefrontContent(site.storefront);
  const content =
    entry?.content ??
    (field === "new" ? { title: copy.pages.shop.newTitle } : copy.pages[field]);
  const fallbackSeo =
    slug === "home"
      ? { title: copy.home.seoTitle, description: copy.home.seoDescription }
      : {};
  const seo = { ...seoSchema.parse({}), ...fallbackSeo, ...entry?.seo };
  if (lockedNoIndex) seo.noIndex = true;
  return {
    slug,
    label,
    path,
    field,
    builtIn: true,
    published: true,
    lockedNoIndex: !!lockedNoIndex,
    content,
    seo,
  };
}
export function customView(page) {
  return {
    slug: page.slug,
    label: page.title,
    title: page.title,
    intro: page.intro,
    sections: page.sections,
    path: "/" + page.slug,
    builtIn: false,
    published: page.published,
    seo: seoSchema.parse(page.seo ?? {}),
  };
}
export async function listPages() {
  const [site, rows] = await Promise.all([
    settings(),
    Page.find().sort({ slug: 1 }).lean(),
  ]);
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  return [
    ...Object.keys(builtInPages).map((slug) =>
      builtInView(slug, site, bySlug.get(slug)),
    ),
    ...rows.filter((p) => !p.builtIn).map(customView),
  ];
}
