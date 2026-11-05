import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { readFile } from "node:fs/promises";
import { config } from "./config.js";
import { Product, Category, User, Coupon, settings } from "./models.js";
await mongoose.connect(config.mongo);
const products = JSON.parse(
  await readFile(new URL("./catalog.json", import.meta.url), "utf8"),
);
for (const p of products)
  await Product.updateOne(
    { slug: p.slug },
    { $setOnInsert: p },
    { upsert: true },
  );
for (const c of [
  { name: "T-shirts", slug: "oversized-tees" },
  { name: "Hoodies", slug: "hoodies" },
])
  await Category.updateOne(
    { slug: c.slug },
    { $setOnInsert: c },
    { upsert: true },
  );
await Coupon.updateOne(
  { code: "FIRST10" },
  {
    $setOnInsert: {
      code: "FIRST10",
      type: "percent",
      value: 10,
      minCart: 100000,
      expiry: new Date(Date.now() + 365 * 86400000),
      usageLimit: 100,
    },
  },
  { upsert: true },
);
await settings();
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD?.length >= 12) {
  await User.updateOne(
    { email: process.env.ADMIN_EMAIL.toLowerCase() },
    {
      $setOnInsert: {
        name: "Farmeri Admin",
        email: process.env.ADMIN_EMAIL.toLowerCase(),
        passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
        role: "admin",
        isVerified: true,
      },
    },
    { upsert: true },
  );
  console.log("Admin ensured (existing accounts are not overwritten).");
} else
  console.log(
    "Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) to seed an admin.",
  );
console.log("Seed complete. Existing products and settings preserved.");
await mongoose.disconnect();
