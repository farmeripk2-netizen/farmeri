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
process.env.JWT_SECRET = "integration-only-secret-with-at-least-32-characters";
process.env.NODE_ENV = "test";
let repl, app, M, api, user, token, product, cookie, order;
jest.setTimeout(180000);
beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
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
  phone: "+919876543210",
  line1: "12 Example Street",
  city: "Mumbai",
  state: "Maharashtra",
  postalCode: "400001",
  country: "India",
};
const payload = () => ({
  items: [{ product: String(product._id), sku: "TEST-M", qty: 1 }],
  address,
  email: "buyer@example.com",
  paymentMethod: "cod",
});
describe("Connected API flows", () => {
  test("registers a customer and rejects role escalation", async () => {
    const r = await api
      .post("/api/v1/auth/register")
      .send({
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
});
