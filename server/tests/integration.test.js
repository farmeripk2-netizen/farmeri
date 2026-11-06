import {
  jest,
  beforeAll,
  afterAll,
  describe,
  test,
  expect,
} from "@jest/globals";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import supertest from "supertest";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
process.env.JWT_SECRET = "integration-only-secret-with-at-least-32-characters";
process.env.NODE_ENV = "test";
let repl, app, M, api, user, token, product, cookie, order;
jest.setTimeout(180000);
beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
      args: [
        "--nounixsocket",
        "--setParameter",
        "diagnosticDataCollectionEnabled=false",
      ],
    },
    binary: { version: "7.0.14" },
  });
  await mongoose.connect(repl.getUri());
  app = (await import("../src/app.js")).default;
  M = await import("../src/models.js");
  await Promise.all(
    Object.values(M)
      .filter((v) => v?.modelName)
      .map((v) => v.init()),
  );
  api = supertest(app);
  await M.settings();
  product = await M.Product.create({
    name: "Integration Tee",
    slug: "integration-tee",
    category: "tees",
    gender: "unisex",
    images: ["/assets/test.svg"],
    description: "Test product",
    price: 230000,
    variants: [{ sku: "TEST-M", size: "M", color: "Black", stock: 10 }],
    isActive: true,
  });
});
afterAll(async () => {
  await mongoose.disconnect();
  if (repl) await repl.stop();
});
const address = {
  name: "Test Buyer",
  phone: "+923001234567",
  line1: "12 Example Street",
  city: "Karachi",
  state: "Sindh",
  postalCode: "75500",
  country: "Pakistan",
};
const payload = () => ({
  items: [{ product: String(product._id), sku: "TEST-M", qty: 1 }],
  address,
  email: "buyer@example.com",
  paymentMethod: "cod",
});
describe("Connected API flows", () => {
  test("registers a customer and rejects role escalation", async () => {
    const r = await api.post("/api/v1/auth/register").send({
      name: "Test Buyer",
      email: "buyer@example.com",
      password: "MyLongPassword123!",
      role: "admin",
    });
    expect(r.status).toBe(201);
    user = r.body.data.user;
    token = r.body.data.accessToken;
    cookie = r.headers["set-cookie"];
    expect(user.role).toBe("customer");
    expect(cookie[0]).toContain("HttpOnly");
    expect(await M.Token.countDocuments({ purpose: "verify" })).toBe(1);
    expect(await M.EmailJob.countDocuments()).toBe(1);
  });
  test("does not expose password hashes and protects admin", async () => {
    const me = await api
      .get("/api/v1/users/me")
      .set("Authorization", "Bearer " + token);
    expect(me.body.data.passwordHash).toBeUndefined();
    expect(
      (
        await api
          .get("/api/v1/admin/products")
          .set("Authorization", "Bearer " + token)
      ).status,
    ).toBe(403);
  });
  test("refresh cookie rotates and cannot be reused", async () => {
    const r = await api.post("/api/v1/auth/refresh").set("Cookie", cookie);
    expect(r.status).toBe(200);
    expect(
      (await api.post("/api/v1/auth/refresh").set("Cookie", cookie)).status,
    ).toBe(401);
  });
  test("lists products and validates filters", async () => {
    const r = await api.get(
      "/api/v1/products?q=Integration&size=M&available=true",
    );
    expect(r.status).toBe(200);
    expect(r.body.data.total).toBe(1);
    expect((await api.get("/api/v1/products?limit=500000")).status).toBe(400);
  });
  test("rejects malformed cart quantities", async () => {
    const p = payload();
    p.items[0].qty = -1;
    expect(
      (
        await api
          .post("/api/v1/orders")
          .set("Idempotency-Key", crypto.randomUUID())
          .send(p)
      ).status,
    ).toBe(400);
  });
  test("server ignores forged client prices; order creation is idempotent", async () => {
    const p = payload();
    p.items[0].price = 1;
    p.total = 1;
    const key = crypto.randomUUID();
    const first = await api
      .post("/api/v1/orders")
      .set("Authorization", "Bearer " + token)
      .set("Idempotency-Key", key)
      .send(p);
    expect(first.status).toBe(201);
    order = first.body.data.order;
    expect(order.total).toBe(230000);
    expect(order.idempotencyKey).toBeUndefined();
    const again = await api
      .post("/api/v1/orders")
      .set("Authorization", "Bearer " + token)
      .set("Idempotency-Key", key)
      .send(p);
    expect(again.body.data.order._id).toBe(order._id);
    expect((await M.Product.findById(product._id)).variants[0].stock).toBe(9);
  });
  test("customer cannot read another order without authorization", async () => {
    expect((await api.get("/api/v1/orders/" + order._id)).status).toBe(404);
    const own = await api
      .get("/api/v1/orders/" + order._id)
      .set("Authorization", "Bearer " + token);
    expect(own.status).toBe(200);
  });
  test("guest gets a private order token and valid invoice PDF", async () => {
    const r = await api
      .post("/api/v1/orders")
      .set("Idempotency-Key", crypto.randomUUID())
      .send(payload());
    expect(r.status).toBe(201);
    const id = r.body.data.order._id;
    expect((await api.get("/api/v1/orders/" + id)).status).toBe(404);
    const invoice = await api
      .get("/api/v1/orders/" + id + "/invoice")
      .set("X-Order-Token", r.body.data.guestToken);
    expect(invoice.status).toBe(200);
    expect(invoice.headers["content-type"]).toContain("application/pdf");
  });
  test("concurrent checkout cannot oversell the final unit", async () => {
    await M.Product.updateOne(
      { _id: product._id },
      { $set: { "variants.0.stock": 1 } },
    );
    const results = await Promise.all(
      [1, 2].map(() =>
        api
          .post("/api/v1/orders")
          .set("Idempotency-Key", crypto.randomUUID())
          .send(payload()),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect((await M.Product.findById(product._id)).variants[0].stock).toBe(0);
  });
  test("review requires a delivered purchase", async () => {
    const r = await api
      .post("/api/v1/reviews")
      .set("Authorization", "Bearer " + token)
      .send({
        product: String(product._id),
        rating: 5,
        title: "Great",
        comment: "Great quality",
      });
    expect(r.status).toBe(403);
  });
  test("rejects forged payment webhooks", async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "test-secret";
    const r = await api
      .post("/api/v1/payments/webhook")
      .set("x-razorpay-signature", "bad")
      .send({ event: "payment.captured" });
    expect(r.status).toBe(400);
  });
  test("cancellation restores stock once", async () => {
    const { updateStatus } = await import("../src/commerce.js");
    await updateStatus(order._id, { status: "Cancelled" });
    await updateStatus(order._id, { status: "Cancelled" });
    expect((await M.Product.findById(product._id)).variants[0].stock).toBe(1);
  });
  test("an admin can place a product, remove it from Rack without deleting it, and publish storefront copy", async () => {
    const admin = await M.User.create({
      name: "Test Admin",
      email: "admin@example.com",
      passwordHash: "test-only",
      role: "admin",
    });
    const auth =
      "Bearer " + jwt.sign({ sub: String(admin._id) }, process.env.JWT_SECRET);
    const payload = {
      name: "Rack Hoodie",
      slug: "rack-hoodie",
      description: "An integration hoodie",
      category: "hoodies",
      gender: "unisex",
      price: 320000,
      images: ["/assets/test.webp"],
      variants: [{ sku: "RACK-M", size: "M", color: "Black", stock: 1 }],
      isHero: true,
      isRack: true,
      isNewArrival: true,
    };
    const created = await api
      .post("/api/v1/admin/products")
      .set("Authorization", auth)
      .send(payload);
    expect(created.status).toBe(201);
    const id = created.body.data._id;
    const homepage = () => api.get("/api/v1/products/homepage");
    const sections = (await homepage()).body.data;
    expect(sections.hero.map((p) => p._id)).toContain(id);
    expect(sections.rack.map((p) => p._id)).toContain(id);
    expect(sections.newDrops.map((p) => p._id)).toContain(id);
    expect(sections.featured.map((p) => p._id)).not.toContain(id);
    expect(
      (
        await api
          .patch("/api/v1/admin/rack/" + id)
          .set("Authorization", auth)
          .send({ isRack: false })
      ).status,
    ).toBe(200);
    const after = (await homepage()).body.data;
    expect(after.rack.map((p) => p._id)).not.toContain(id);
    expect(after.hero.map((p) => p._id)).toContain(id);
    expect(
      (
        await api
          .put("/api/v1/admin/storefront")
          .set("Authorization", auth)
          .send({
            footer: { market: "PKR / PAKISTAN" },
            home: { rack: { title: "Studio rack" } },
          })
      ).status,
    ).toBe(200);
    const settings = (await api.get("/api/v1/settings/public")).body.data;
    expect(settings.storefront.home.rack.title).toBe("Studio rack");
    expect(settings.storefront.footer.market).toBe("PKR / PAKISTAN");
  });
  test("manages built-in and custom page content, SEO and publishing", async () => {
    const admin = await M.User.findOne({ role: "admin" });
    const auth =
      "Bearer " + jwt.sign({ sub: String(admin._id) }, process.env.JWT_SECRET);
    const get = (slug) => api.get("/api/v1/pages/" + slug);
    const put = (slug, data) =>
      api
        .put("/api/v1/admin/pages/" + slug)
        .set("Authorization", auth)
        .send(data);
    expect((await api.get("/api/v1/admin/pages")).status).toBe(401);
    const listing = await api
      .get("/api/v1/admin/pages")
      .set("Authorization", auth);
    expect(listing.body.data.map((p) => p.label)).toEqual(
      expect.arrayContaining([
        "About Us",
        "Privacy Policy",
        "Shipping & Returns",
        "Checkout",
      ]),
    );
    const about = (await get("about")).body.data;
    expect(
      (
        await put("about", {
          content: { ...about.content, title: "About Farmeri" },
          seo: {
            title: "About Us | Farmeri Pakistan",
            description: "Our story.",
            keywords: "Farmeri, Pakistan",
          },
        })
      ).status,
    ).toBe(200);
    const saved = (await get("about")).body.data;
    expect(saved.content).toMatchObject({
      title: "About Farmeri",
      image: about.content.image,
    });
    expect(saved.seo.keywords).toBe("Farmeri, Pakistan");
    expect(
      (
        await put("checkout", {
          seo: { title: "Farmeri Checkout", noIndex: false },
        })
      ).body.data.seo.noIndex,
    ).toBe(true);
    const page = {
      slug: "cotton-care",
      title: "Cotton Care",
      sections: [{ title: "Washing", text: "Wash cold." }],
      seo: { title: "Cotton care by Farmeri" },
    };
    const add = (data) =>
      api.post("/api/v1/admin/pages").set("Authorization", auth).send(data);
    expect((await add({ ...page, slug: "checkout" })).status).toBe(400);
    expect((await add(page)).status).toBe(201);
    expect((await get(page.slug)).status).toBe(404);
    expect((await put(page.slug, { ...page, published: true })).status).toBe(
      200,
    );
    expect((await get(page.slug)).body.data.sections).toEqual(page.sections);
    expect((await api.get("/sitemap.xml")).text).toContain(
      "/cotton-care</loc>",
    );
    expect((await api.get("/sitemap.xml")).text).not.toContain(
      "/checkout</loc>",
    );
    await put(page.slug, { ...page, published: true, seo: { noIndex: true } });
    expect((await api.get("/sitemap.xml")).text).not.toContain(
      "/cotton-care</loc>",
    );
    await put(page.slug, { ...page, published: false });
    expect((await get(page.slug)).status).toBe(404);
  });
});
