import { z } from "zod";
export const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");
const text = z.string().trim().min(1).max(200);
export const address = z.object({
  name: text,
  phone: z.string().regex(/^\+?[0-9 ()-]{8,18}$/, "Enter a valid phone number"),
  line1: text,
  line2: z.string().max(200).optional().default(""),
  city: text,
  state: text,
  postalCode: z.string().regex(/^\d{6}$/, "Enter a six-digit Indian PIN"),
  country: z.literal("India"),
});
export const items = z
  .array(
    z.object({ product: id, sku: text, qty: z.number().int().min(1).max(20) }),
  )
  .min(1)
  .max(50);
export const checkout = z.object({
  items,
  coupon: z.string().max(40).optional().default(""),
  email: z.string().email().toLowerCase(),
  address,
  paymentMethod: z.enum(["cod", "razorpay"]),
});
export const product = z
  .object({
    name: text,
    slug: z.string().regex(/^[a-z0-9-]+$/),
    description: z.string().max(10000),
    category: text,
    gender: z.enum(["men", "women", "unisex"]),
    tags: z.array(text).default([]),
    images: z
      .array(
        z
          .string()
          .refine(
            (v) =>
              v.startsWith("/assets/") ||
              v.startsWith("https://res.cloudinary.com/"),
            "Use local assets or Cloudinary URLs",
          ),
      )
      .min(1)
      .max(20),
    price: z.number().int().min(1),
    discountPrice: z.number().int().min(1).nullable().optional(),
    variants: z
      .array(
        z.object({
          sku: text,
          size: text,
          color: text,
          stock: z.number().int().min(0),
        }),
      )
      .min(1)
      .max(100),
    isFeatured: z.boolean().default(false),
    isNewArrival: z.boolean().default(false),
    isActive: z.boolean().default(true),
    fabric: z.string().max(500).default(""),
    care: z.string().max(500).default(""),
    seo: z
      .object({
        title: z.string(),
        description: z.string(),
        keywords: z.string(),
      })
      .optional(),
  })
  .superRefine((v, c) => {
    if (v.discountPrice > v.price)
      c.addIssue({ code: "custom", message: "Sale price cannot exceed MRP" });
    if (new Set(v.variants.map((x) => x.sku)).size !== v.variants.length)
      c.addIssue({
        code: "custom",
        message: "SKUs must be unique within a product",
      });
  });
export const coupon = z
  .object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(30)
      .transform((v) => v.toUpperCase()),
    type: z.enum(["percent", "flat"]),
    value: z.number().int().positive(),
    minCart: z.number().int().min(0).default(0),
    maxDiscount: z.number().int().positive().nullable().optional(),
    expiry: z.coerce.date(),
    usageLimit: z.number().int().positive(),
    isActive: z.boolean().default(true),
  })
  .refine(
    (v) => v.type !== "percent" || v.value <= 100,
    "Percentage cannot exceed 100",
  );
export const siteSettings = z.object({
  headline: text,
  announcement: z.string().max(200),
  announcementEnabled: z.boolean(),
  shippingThreshold: z.number().int().min(0),
  shippingFee: z.number().int().min(0),
  taxPercent: z.number().min(0).max(30),
  supportEmail: z.string().email(),
  serviceablePrefixes: z.array(z.string().regex(/^\d{1,6}$/)).default([]),
});
export { z };
