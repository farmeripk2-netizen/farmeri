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

describe("Homepage merchandising and storefront editing", () => {
  const adminId = "507f1f77bcf86cd799439021";
  const productId = "507f1f77bcf86cd799439022";
  async function adminToken(role = "admin") {
    const { default: jwt } = await import("jsonwebtoken");
    jest.spyOn(User, "findById").mockResolvedValue({ _id: adminId, role });
    return "Bearer " + jwt.sign({ sub: adminId }, process.env.JWT_SECRET);
  }

  test("publishes only active products explicitly selected for each section", async () => {
    const rows = [
      { _id: productId, isActive: true, isRack: true, isFeatured: true },
      { _id: "507f1f77bcf86cd799439023", isActive: false, isHero: true },
      {
        _id: "507f1f77bcf86cd799439024",
        isActive: true,
        isHero: true,
        isNewArrival: true,
      },
    ];
    jest.spyOn(Product, "find").mockImplementation((filter) => ({
      sort: () => ({
        lean: async () =>
          rows.filter((p) =>
            Object.entries(filter).every(([k, v]) => p[k] === v),
          ),
      }),
    }));
    const { status, body } = await api.get("/api/v1/products/homepage");
    expect(status).toBe(200);
    expect(body.data).toMatchObject({
      hero: [rows[2]],
      rack: [rows[0]],
      featured: [rows[0]],
      newDrops: [rows[2]],
    });
  });

  test("adding to Rack updates only the selected product's Rack flag", async () => {
    const auth = await adminToken();
    const update = jest.spyOn(Product, "findOneAndUpdate").mockReturnValue({
      select: async () => ({ _id: productId, isRack: true }),
    });
    const r = await api
      .patch("/api/v1/admin/rack/" + productId)
      .set("Authorization", auth)
      .send({ isRack: true, isHero: true });
    expect(r.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      { _id: productId, isActive: true },
      { $set: { isRack: true } },
      { new: true },
    );
  });

  test("persists editable storefront content and blocks unsafe links", async () => {
    const { Settings } = await import("../src/models.js");
    const auth = await adminToken();
    let saved;
    jest
      .spyOn(Settings, "updateOne")
      .mockImplementation(async (_filter, write) => {
        saved = write.$set.storefront;
      });
    jest.spyOn(Settings, "findOneAndUpdate").mockImplementation(async () => ({
      toObject: () => ({ storefront: saved }),
    }));
    const update = (payload) =>
      api
        .put("/api/v1/admin/storefront")
        .set("Authorization", auth)
        .send(payload);
    expect(
      (
        await update({
          navigation: {
            links: [{ label: "Invalid", href: "javascript:alert(1)" }],
          },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await update({
          navigation: { links: [] },
          footer: { market: "PKR • PAKISTAN" },
        })
      ).status,
    ).toBe(200);
    const read = await api.get("/api/v1/settings/public");
    expect(read.body.data.storefront.navigation.links).toEqual([]);
    expect(read.body.data.storefront.footer.market).toBe("PKR • PAKISTAN");
    expect(read.body.data.storefront.home.rack.title).toBe("The Rack.");
  });

  test("accepts Pakistani postal codes and rejects six-digit codes", async () => {
    const { Settings } = await import("../src/models.js");
    jest
      .spyOn(Settings, "findOneAndUpdate")
      .mockResolvedValue({ serviceablePrefixes: ["75"] });
    const shipping = (postalCode) =>
      api.post("/api/v1/shipping/check").send({ postalCode });
    expect((await shipping("75500")).body.data.available).toBe(true);
    expect((await shipping("44000")).body.data.available).toBe(false);
    expect((await shipping("400001")).status).toBe(400);
  });
});
