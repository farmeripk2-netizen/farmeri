import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import { normalizeProductImages } from "./product_images";
export const useSession = create((set) => ({
  user: null,
  token: null,
  ready: false,
  setSession: (data) =>
    set({
      user: data?.user || null,
      token: data?.accessToken || null,
      ready: true,
    }),
}));
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  withCredentials: true,
});
api.interceptors.request.use((c) => {
  const t = useSession.getState().token;
  if (
    t &&
    ![
      "/auth/refresh",
      "/auth/login",
      "/auth/register",
      "/auth/forgot-password",
      "/auth/reset-password",
      "/auth/verify-email",
      "/auth/logout",
    ].includes(c.url)
  )
    c.headers.Authorization = "Bearer " + t;
  return c;
});
let refreshing;
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const c = error.config;
    if (
      error.response?.status === 401 &&
      !c._retry &&
      !c.url.startsWith("/auth/")
    ) {
      c._retry = true;
      try {
        if (!refreshing)
          refreshing = api
            .post("/auth/refresh")
            .then((r) => {
              useSession.getState().setSession(r.data.data);
            })
            .finally(() => {
              refreshing = null;
            });
        await refreshing;
        return api(c);
      } catch {
        useSession.getState().setSession(null);
      }
    }
    return Promise.reject(error);
  },
);
export const request = async (path, method = "get", data, config = {}) =>
  normalizeProductImages((await api({ url: path, method, data, ...config })).data.data);
export const errorText = (e) =>
  e.response?.data?.error || e.message || "Something went wrong";
export const useNotice = create((set) => ({
  notice: null,
  show: (text) => {
    set({ notice: text });
    setTimeout(() => set({ notice: null }), 5000);
  },
}));
export const notify = (text) => useNotice.getState().show(text);
export const useCart = create(
  persist(
    (set, get) => ({
      items: [],
      coupon: "",
      setItems: (items) => set({ items }),
      setCoupon: (coupon) => set({ coupon }),
      add: (p, v, qty = 1) => {
        const items = [...get().items];
        const index = items.findIndex(
          (i) => i.product === p._id && i.sku === v.sku,
        );
        const line = {
          product: p._id,
          slug: p.slug,
          name: p.name,
          image: p.images[0],
          sku: v.sku,
          size: v.size,
          color: v.color,
          price: p.discountPrice || p.price,
          qty,
        };
        if (index >= 0)
          items[index] = {
            ...items[index],
            qty: Math.min(20, items[index].qty + qty),
          };
        else items.push(line);
        set({ items });
        syncCart(items);
        notify("Added to your bag");
      },
      quantity: (sku, qty) => {
        const items = get().items.map((i) =>
          i.sku === sku ? { ...i, qty: Math.max(1, Math.min(20, qty)) } : i,
        );
        set({ items });
        syncCart(items);
      },
      remove: (sku) => {
        const items = get().items.filter((i) => i.sku !== sku);
        set({ items });
        syncCart(items);
      },
      clear: () => {
        set({ items: [], coupon: "" });
        syncCart([]);
      },
    }),
    { name: "farmeri-cart-v1" },
  ),
);
export const cartPayload = (items) =>
  items.map(({ product, sku, qty }) => ({ product, sku, qty }));
async function syncCart(items) {
  if (useSession.getState().user)
    try {
      await request("/cart", "put", { items: cartPayload(items) });
    } catch (e) {
      notify("Cart sync failed: " + errorText(e));
    }
}
function mapCart(items) {
  return items.map((i) => ({
    product: i.product._id,
    slug: i.product.slug,
    name: i.product.name,
    image: i.product.images[0],
    sku: i.sku,
    size: i.product.variants.find((v) => v.sku === i.sku)?.size,
    color: i.product.variants.find((v) => v.sku === i.sku)?.color,
    price: i.product.discountPrice || i.product.price,
    qty: i.qty,
  }));
}
export async function loginCart() {
  const rows = await request("/cart/merge", "post", {
    items: cartPayload(useCart.getState().items),
  });
  useCart.getState().setItems(mapCart(rows));
}
export async function restoreSession() {
  try {
    const data = await request("/auth/refresh", "post", undefined, {
      params: { mode: "bootstrap" },
    });
    useSession.getState().setSession(data);
    if (!data?.accessToken) return;

    const rows = await request("/cart");
    useCart.getState().setItems(mapCart(rows));
  } catch {
    useSession.getState().setSession(null);
  }
}
export const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format((value || 0) / 100);
