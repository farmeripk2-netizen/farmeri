import { jest, describe, test, expect, afterEach } from "@jest/globals";
import supertest from "supertest";
process.env.JWT_SECRET = "http-test-secret-at-least-32-characters";
const { default: app } = await import("../src/app.js");
const { Product, User, Session } = await import("../src/models.js");
const { default: bcrypt } = await import("bcryptjs");
const api = supertest(app);
afterEach(() => jest.restoreAllMocks());
describe("HTTP validation and authentication (database methods stubbed)", () => {
  test("rejects disallowed cross-origin mutations", async () => {
    expect(
      (
        await api
          .post("/api/v1/contact")
          .set("Origin", "https://untrusted.example")
          .send({})
      ).status,
    ).toBe(403);
  });
  test("requires admin role before any database query", async () => {
    expect((await api.get("/api/v1/admin/products")).status).toBe(401);
  });
  test("rejects malformed login fields", async () => {
    expect(
      (
        await api
          .post("/api/v1/auth/login")
          .send({ email: { $ne: null }, password: "abc" })
      ).status,
    ).toBe(400);
  });
  test("valid login issues signed access token and httpOnly cookie", async () => {
    const user = {
      _id: "507f1f77bcf86cd799439011",
      name: "Buyer",
      email: "buyer@example.com",
      role: "customer",
      isVerified: true,
      passwordHash: await bcrypt.hash("password12345", 4),
    };
    jest
      .spyOn(User, "findOne")
      .mockReturnValue({ select: () => Promise.resolve(user) });
    jest.spyOn(Session, "create").mockResolvedValue({});
    const r = await api
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: "password12345" });
    expect(r.status).toBe(200);
    expect(r.body.data.accessToken.split(".")).toHaveLength(3);
    expect(r.body.data.user.passwordHash).toBeUndefined();
    expect(r.headers["set-cookie"][0]).toContain("HttpOnly");
  });
  test("bad password is rejected", async () => {
    jest
      .spyOn(User, "findOne")
      .mockReturnValue({ select: () => Promise.resolve(null) });
    expect(
      (
        await api
          .post("/api/v1/auth/login")
          .send({ email: "x@example.com", password: "wrong" })
      ).status,
    ).toBe(401);
  });
  test("product listing returns paginated contract", async () => {
    jest
      .spyOn(Product, "aggregate")
      .mockResolvedValue([{ name: "Test Tee", price: 230000 }]);
    jest.spyOn(Product, "countDocuments").mockResolvedValue(1);
    const r = await api.get("/api/v1/products?q=Test&limit=12");
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ total: 1, page: 1, pages: 1 });
    expect(r.body.data.items[0].name).toBe("Test Tee");
  });
  test("invalid checkout is rejected before stock mutation", async () => {
    expect(
      (
        await api
          .post("/api/v1/orders")
          .send({ items: [{ qty: -1 }], total: 1 })
      ).status,
    ).toBe(400);
  });
  test("unconfigured online payments fail clearly", async () => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    const { razor } = await import("../src/commerce.js");
    expect(() => razor()).toThrow("Online payment is not configured");
  });
});
