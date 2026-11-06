import { useQuery } from "@tanstack/react-query";
import { request } from "./state";

const builtInSlugs = new Set([
  "home",
  "shop",
  "new",
  "about",
  "contact",
  "faq",
  "size-guide",
  "shipping-returns",
  "privacy",
  "terms",
  "track-order",
  "search",
  "cart",
  "checkout",
  "account",
  "wishlist",
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "verify-email",
]);
const privateSlugs = new Set([
  "track-order",
  "search",
  "cart",
  "checkout",
  "account",
  "wishlist",
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "verify-email",
  "admin",
]);
export const isBuiltInPage = (slug) => builtInSlugs.has(slug);
export const pathSlug = (pathname) =>
  pathname.replace(/^\/+|\/+$/g, "") || "home";
export const privatePath = (slug) =>
  privateSlugs.has(slug) || slug.startsWith("order/");
export const usePage = (slug, enabled = true) =>
  useQuery({
    queryKey: ["page", slug],
    queryFn: () => request("/pages/" + encodeURIComponent(slug)),
    enabled,
    retry: false,
  });
