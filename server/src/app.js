import { storefrontContent, storefrontSchema } from "./storefront.js";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import PDFDocument from "pdfkit";
import { config } from "./config.js";
import * as M from "./models.js";
import * as V from "./validators.js";
import { optional, required, admin, issue, cookieOptions } from "./auth.js";
import {
  wrap,
  ok,
  fail,
  random,
  hash,
  safeEqual,
  escapeRegex,
} from "./utils.js";
import {
  quote,
  createOrder,
  razor,
  canAccess,
  publicOrder,
  orderCurrency,
  capturePayment,
  updateStatus,
} from "./commerce.js";
import { enqueue } from "./email.js";
const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(compression());
const origins = config.origin.split(",").map((s) => s.trim());
app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || origins.includes(origin)),
    credentials: true,
  }),
);
app.use((req, res, next) => {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.headers.origin &&
    !origins.includes(req.headers.origin)
  )
    return next(fail(403, "Origin not allowed"));
  next();
});
const limiter = (limit) =>
  rateLimit({
    windowMs: 15 * 60000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, error: "Too many requests. Try again later." },
  });
app.use("/api", limiter(600));
let vercelDbConnection;

app.use(async (req, res, next) => {
  if (process.env.VERCEL !== "1" || mongoose.connection.readyState === 1) {
    return next();
  }

  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is missing from the Vercel project");
    return res.status(503).json({
      success: false,
      data: { status: "database unavailable" },
    });
  }

  try {
    vercelDbConnection ??= mongoose
      .connect(config.mongo, { serverSelectionTimeoutMS: 8000 })
      .finally(() => {
        vercelDbConnection = undefined;
      });

    await vercelDbConnection;
    return next();
  } catch (error) {
    console.error("Atlas connection failed:", error.name, error.code);
    return res.status(503).json({
      success: false,
      data: { status: "database unavailable" },
    });
  }
});
app.post(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
  wrap(async (req, res) => {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET)
      throw fail(503, "Webhook not configured");
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(req.body)
      .digest("hex");
    if (!safeEqual(expected, req.headers["x-razorpay-signature"]))
      throw fail(400, "Invalid webhook signature");
    const event = JSON.parse(req.body.toString());
    if (event.event === "payment.captured")
      await capturePayment(
        event.payload.payment.entity,
        req.headers["x-razorpay-event-id"] || hash(req.body),
      );
    ok(res, { received: true });
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
const api = express.Router();
app.use("/api/v1", api);
api.use(optional);
api.get("/health", (req, res) =>
  ok(
    res,
    {
      status:
        mongoose.connection.readyState === 1 ? "ready" : "database unavailable",
    },
    mongoose.connection.readyState === 1 ? 200 : 503,
  ),
);
api.use("/auth", limiter(40));
const email = V.z.string().email().toLowerCase();
const password = V.z.string().min(10).max(128);
const short = V.z.string().trim().min(1).max(200);
async function sendToken(user, purpose) {
  const raw = random();
  await M.Token.deleteMany({ user: user._id, purpose });
  await M.Token.create({
    user: user._id,
    purpose,
    hash: hash(raw),
    expiresAt: new Date(
      Date.now() + (purpose === "verify" ? 86400000 : 3600000),
    ),
  });
  const path = purpose === "verify" ? "verify-email" : "reset-password";
  await enqueue(
    user.email,
    purpose === "verify"
      ? "Verify your Farmeri account"
      : "Reset your Farmeri password",
    `Open ${origins[0]}/${path}?token=${raw}\nIf you did not request this, ignore this email.`,
  );
}
api.post(
  "/auth/register",
  wrap(async (req, res) => {
    const data = V.z.object({ name: short, email, password }).parse(req.body);
    if (await M.User.exists({ email: data.email }))
      throw fail(409, "An account with this email already exists");
    const user = await M.User.create({
      name: data.name,
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, 12),
    });
    await sendToken(user, "verify");
    ok(res, await issue(user, res), 201);
  }),
);
api.post(
  "/auth/login",
  wrap(async (req, res) => {
    const data = V.z
      .object({ email, password: V.z.string().max(128) })
      .parse(req.body);
    const user = await M.User.findOne({ email: data.email }).select(
      "+passwordHash",
    );
    if (!user || !(await bcrypt.compare(data.password, user.passwordHash)))
      throw fail(401, "Invalid email or password");
    ok(res, await issue(user, res));
  }),
);
api.post(
  "/auth/refresh",
  wrap(async (req, res) => {
    res.set("Cache-Control", "no-store");
    const bootstrap = req.query.mode === "bootstrap";
    const guestOrUnauthorized = (message) => {
      if (bootstrap) return ok(res, null);
      throw fail(401, message);
    };

    if (!req.cookies.refresh)
      return guestOrUnauthorized("Sign in required");

    const session = await M.Session.findOneAndDelete({
      hash: hash(req.cookies.refresh),
      expiresAt: { $gt: new Date() },
    });
    if (!session) return guestOrUnauthorized("Session expired");

    const user = await M.User.findById(session.user);
    if (!user) return guestOrUnauthorized("Account unavailable");

    return ok(res, await issue(user, res));
  }),
);
api.post(
  "/auth/logout",
  wrap(async (req, res) => {
    if (req.cookies.refresh)
      await M.Session.deleteOne({ hash: hash(req.cookies.refresh) });
    res.clearCookie("refresh", { ...cookieOptions, maxAge: undefined });
    ok(res, { message: "Signed out" });
  }),
);
api.get("/auth/me", required, (req, res) => ok(res, req.user));
api.post(
  "/auth/forgot-password",
  wrap(async (req, res) => {
    const data = V.z.object({ email }).parse(req.body);
    const user = await M.User.findOne({ email: data.email });
    if (user) await sendToken(user, "reset");
    ok(res, {
      message: "If that account exists, a reset email will arrive shortly.",
    });
  }),
);
api.post(
  "/auth/resend-verification",
  required,
  wrap(async (req, res) => {
    if (!req.user.isVerified) await sendToken(req.user, "verify");
    ok(res, { message: "Verification email queued" });
  }),
);
api.post(
  "/auth/verify-email",
  wrap(async (req, res) => {
    const { token } = V.z
      .object({ token: V.z.string().length(64) })
      .parse(req.body);
    const t = await M.Token.findOneAndDelete({
      hash: hash(token),
      purpose: "verify",
      expiresAt: { $gt: new Date() },
    });
    if (!t) throw fail(400, "Link expired or already used");
    await M.User.findByIdAndUpdate(t.user, { isVerified: true });
    ok(res, { message: "Email verified. You can sign in." });
  }),
);
api.post(
  "/auth/reset-password",
  wrap(async (req, res) => {
    const d = V.z
      .object({ token: V.z.string().length(64), password })
      .parse(req.body);
    const t = await M.Token.findOneAndDelete({
      hash: hash(d.token),
      purpose: "reset",
      expiresAt: { $gt: new Date() },
    });
    if (!t) throw fail(400, "Link expired or already used");
    await M.User.findByIdAndUpdate(t.user, {
      passwordHash: await bcrypt.hash(d.password, 12),
    });
    await M.Session.deleteMany({ user: t.user });
    ok(res, { message: "Password updated. Please sign in." });
  }),
);
api.get("/users/me", required, (req, res) => ok(res, req.user));
api.patch(
  "/users/me",
  required,
  wrap(async (req, res) =>
    ok(
      res,
      await M.User.findByIdAndUpdate(
        req.user._id,
        V.z.object({ name: short }).parse(req.body),
        { new: true },
      ),
    ),
  ),
);
api.patch(
  "/users/me/password",
  required,
  wrap(async (req, res) => {
    const d = V.z
      .object({ currentPassword: V.z.string(), password })
      .parse(req.body);
    const u = await M.User.findById(req.user._id).select("+passwordHash");
    if (!(await bcrypt.compare(d.currentPassword, u.passwordHash)))
      throw fail(400, "Current password is incorrect");
    u.passwordHash = await bcrypt.hash(d.password, 12);
    await u.save();
    await M.Session.deleteMany({ user: u._id });
    ok(res, { message: "Password changed. Other refresh sessions revoked." });
  }),
);
api.get("/users/me/addresses", required, (req, res) =>
  ok(res, req.user.addresses),
);
api.post(
  "/users/me/addresses",
  required,
  wrap(async (req, res) => {
    if (req.user.addresses.length >= 10)
      throw fail(400, "Maximum 10 addresses");
    req.user.addresses.push(V.address.parse(req.body));
    await req.user.save();
    ok(res, req.user.addresses);
  }),
);
api.patch(
  "/users/me/addresses/:id",
  required,
  wrap(async (req, res) => {
    const a = req.user.addresses.id(V.id.parse(req.params.id));
    if (!a) throw fail(404, "Address not found");
    Object.assign(a, V.address.parse(req.body));
    await req.user.save();
    ok(res, req.user.addresses);
  }),
);
api.delete(
  "/users/me/addresses/:id",
  required,
  wrap(async (req, res) => {
    req.user.addresses.pull(V.id.parse(req.params.id));
    await req.user.save();
    ok(res, req.user.addresses);
  }),
);
api.get(
  "/users/me/wishlist",
  required,
  wrap(async (req, res) => {
    await req.user.populate("wishlist");
    ok(
      res,
      req.user.wishlist.filter((p) => p?.isActive),
    );
  }),
);
api.post(
  "/users/me/wishlist/:id",
  required,
  wrap(async (req, res) => {
    const id = V.id.parse(req.params.id);
    if (!(await M.Product.exists({ _id: id, isActive: true })))
      throw fail(404, "Product not found");
    await M.User.findByIdAndUpdate(req.user._id, {
      $addToSet: { wishlist: id },
    });
    ok(res, { message: "Saved to wishlist" });
  }),
);
api.delete(
  "/users/me/wishlist/:id",
  required,
  wrap(async (req, res) => {
    await M.User.findByIdAndUpdate(req.user._id, {
      $pull: { wishlist: V.id.parse(req.params.id) },
    });
    ok(res, { message: "Removed from wishlist" });
  }),
);
async function listProducts(req, res) {
  const d = V.z
    .object({
      q: V.z.string().max(100).optional(),
      category: V.z.string().max(100).optional(),
      gender: V.z.enum(["men", "women", "unisex"]).optional(),
      size: V.z.string().max(20).optional(),
      color: V.z.string().max(30).optional(),
      min: V.z.coerce.number().min(0).optional(),
      max: V.z.coerce.number().min(0).optional(),
      available: V.z.enum(["true", "false"]).optional(),
      featured: V.z.enum(["true", "false"]).optional(),
      new: V.z.enum(["true", "false"]).optional(),
      sort: V.z
        .enum(["newest", "price-asc", "price-desc", "best-selling"])
        .default("newest"),
      page: V.z.coerce.number().int().min(1).max(10000).default(1),
      limit: V.z.coerce.number().int().min(1).max(50).default(12),
    })
    .parse(req.query);
  const f = { isActive: true };
  if (d.q) f.name = { $regex: escapeRegex(d.q), $options: "i" };
  if (d.category) f.category = d.category;
  if (d.gender) f.gender = { $in: [d.gender, "unisex"] };
  if (d.featured === "true") f.isFeatured = true;
  if (d.new === "true") f.isNewArrival = true;
  const variant = {};
  if (d.size) variant.size = d.size;
  if (d.color) variant.color = d.color;
  if (d.available === "true") variant.stock = { $gt: 0 };
  if (Object.keys(variant).length) f.variants = { $elemMatch: variant };
  const effective = { $ifNull: ["$discountPrice", "$price"] };
  const comparisons = [];
  if (d.min != null) comparisons.push({ $gte: [effective, d.min] });
  if (d.max != null) comparisons.push({ $lte: [effective, d.max] });
  if (comparisons.length) f.$expr = { $and: comparisons };
  const sort = {
    newest: { createdAt: -1 },
    "price-asc": { effectivePrice: 1 },
    "price-desc": { effectivePrice: -1 },
    "best-selling": { soldCount: -1 },
  }[d.sort];
  const [items, total] = await Promise.all([
    M.Product.aggregate([
      { $match: f },
      { $addFields: { effectivePrice: effective } },
      { $sort: sort },
      { $skip: (d.page - 1) * d.limit },
      { $limit: d.limit },
    ]),
    M.Product.countDocuments(f),
  ]);
  ok(res, { items, total, page: d.page, pages: Math.ceil(total / d.limit) });
}
api.get("/products", wrap(listProducts));
api.get("/products/search", wrap(listProducts));
api.get("/products/homepage", wrap(async (_req, res) => {
  const query = (flag) => M.Product.find({ isActive: true, [flag]: true })
    .sort({ createdAt: -1, _id: -1 }).lean();
  const [hero, rack, featured, newDrops] = await Promise.all([
    query("isHero"), query("isRack"), query("isFeatured"), query("isNewArrival"),
  ]);
  ok(res, { hero, rack, featured, newDrops });
}));
api.get(
  "/products/featured",
  wrap(async (req, res) => {
    req.query.featured = "true";
    await listProducts(req, res);
  }),
);
api.get(
  "/products/new-arrivals",
  wrap(async (req, res) => {
    req.query.new = "true";
    await listProducts(req, res);
  }),
);
api.get(
  "/products/:slug/related",
  wrap(async (req, res) => {
    const p = await M.Product.findOne({
      slug: req.params.slug,
      isActive: true,
    });
    if (!p) throw fail(404, "Product not found");
    ok(
      res,
      await M.Product.find({
        isActive: true,
        category: p.category,
        _id: { $ne: p._id },
      }).limit(4),
    );
  }),
);
api.get(
  "/products/:id/reviews",
  wrap(async (req, res) =>
    ok(
      res,
      await M.Review.find({
        product: V.id.parse(req.params.id),
        status: "approved",
      })
        .sort({ createdAt: -1 })
        .limit(100),
    ),
  ),
);
api.get(
  "/products/:slug",
  wrap(async (req, res) => {
    const p = await M.Product.findOne({
      slug: req.params.slug,
      isActive: true,
    });
    if (!p) throw fail(404, "Product not found");
    ok(res, p);
  }),
);
api.get(
  "/testimonials",
  wrap(async (req, res) =>
    ok(
      res,
      await M.Review.find({
        status: "approved",
        isVerifiedPurchase: true,
        rating: { $gte: 4 },
      })
        .select("name rating title comment")
        .sort({ createdAt: -1 })
        .limit(3),
    ),
  ),
);
api.get(
  "/categories",
  wrap(async (req, res) => ok(res, await M.Category.find({ isActive: true }))),
);
api.get(
  "/settings/public",
  wrap(async (req, res) => {
    const s = (await M.settings()).toObject();
    ok(res, {
      ...s,
      announcement: s.announcement?.replaceAll("₹", "PKR "),
      storefront: storefrontContent(s.storefront),
    });
  }),
);
api.post(
  "/shipping/check",
  wrap(async (req, res) => {
    const { postalCode } = V.z
      .object({ postalCode: V.postalCode })
      .parse(req.body);
    const s = await M.settings();
    ok(res, {
      available:
        !s.serviceablePrefixes.length ||
        s.serviceablePrefixes.some((p) => postalCode.startsWith(p)),
      message:
        "Delivery estimate: 4–7 business days (configure before launch).",
    });
  }),
);
api.get(
  "/cart",
  required,
  wrap(async (req, res) => {
    const cart = await M.Cart.findOne({ user: req.user._id }).populate(
      "items.product",
    );
    ok(res, cart?.items.filter((i) => i.product) || []);
  }),
);
api.put(
  "/cart",
  required,
  wrap(async (req, res) => {
    const items = V.items
      .or(V.z.array(V.z.never()).length(0))
      .parse(req.body.items);
    ok(
      res,
      await M.Cart.findOneAndUpdate(
        { user: req.user._id },
        { items },
        { upsert: true, new: true },
      ),
    );
  }),
);
api.post(
  "/cart/merge",
  required,
  wrap(async (req, res) => {
    const incoming = V.items
      .or(V.z.array(V.z.never()).length(0))
      .parse(req.body.items);
    const c =
      (await M.Cart.findOne({ user: req.user._id })) ||
      new M.Cart({ user: req.user._id, items: [] });
    for (const item of incoming) {
      const prev = c.items.find(
        (i) => String(i.product) === item.product && i.sku === item.sku,
      );
      if (prev) prev.qty = Math.min(20, prev.qty + item.qty);
      else c.items.push(item);
    }
    await c.save();
    await c.populate("items.product");
    ok(
      res,
      c.items.filter((i) => i.product),
    );
  }),
);
api.post(
  "/checkout/quote",
  wrap(async (req, res) =>
    ok(
      res,
      await quote(
        V.z
          .object({ items: V.items, coupon: V.z.string().max(40).optional() })
          .parse(req.body),
      ),
    ),
  ),
);
api.post(
  "/coupons/validate",
  wrap(async (req, res) =>
    ok(
      res,
      await quote(
        V.z
          .object({ items: V.items, coupon: V.z.string().max(40) })
          .parse(req.body),
      ),
    ),
  ),
);
api.use("/orders", limiter(100));
api.post(
  "/orders",
  wrap(async (req, res) => {
    const result = await createOrder(
      V.checkout.parse(req.body),
      req.user,
      req.headers["idempotency-key"],
    );
    ok(
      res,
      { order: publicOrder(result.order), guestToken: result.guestToken },
      201,
    );
  }),
);
api.get(
  "/orders/mine",
  required,
  wrap(async (req, res) =>
    ok(
      res,
      (
        await M.Order.find({ user: req.user._id })
          .sort({ createdAt: -1 })
          .limit(100)
      ).map(publicOrder),
    ),
  ),
);
api.post(
  "/orders/track",
  limiter(20),
  wrap(async (req, res) => {
    const d = V.z.object({ number: short, email }).parse(req.body);
    const o = await M.Order.findOne({
      number: d.number.toUpperCase(),
      email: d.email,
    });
    if (!o) throw fail(404, "Order not found");
    ok(res, {
      number: o.number,
      status: o.status,
      history: o.history,
      trackingNumber: o.trackingNumber,
    });
  }),
);
async function getOrder(req) {
  const o = await M.Order.findById(V.id.parse(req.params.id));
  if (!canAccess(o, req)) throw fail(404, "Order not found");
  return o;
}
api.get(
  "/orders/:id/invoice",
  wrap(async (req, res) => {
    const o = await getOrder(req);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${o.number}.pdf"`,
    );
    const currency = orderCurrency(o);
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);
    doc.fontSize(30).text("FARMERI");
    doc
      .fontSize(12)
      .text(
        `Order invoice: ${o.number}\nDate: ${o.createdAt.toISOString().slice(0, 10)}\n${o.address.name}\n${o.address.line1}\n${o.address.city}, ${o.address.postalCode}\nPayment: ${o.paymentMethod} / ${o.paymentStatus}`,
      )
      .moveDown();
    for (const i of o.items)
      doc
        .text(
          `${i.name} - ${i.size} / ${i.color}\n${i.qty} x ${currency} ${(i.price / 100).toFixed(2)} = ${currency} ${((i.qty * i.price) / 100).toFixed(2)}`,
        )
        .moveDown();
    for (const k of ["subtotal", "discount", "shipping", "tax", "total"])
      doc.text(`${k.toUpperCase()}: ${currency} ${(o[k] / 100).toFixed(2)}`);
    doc.moveDown().text("Thank you for choosing Farmeri.");
    doc.end();
  }),
);
api.get(
  "/orders/:id",
  wrap(async (req, res) => ok(res, publicOrder(await getOrder(req)))),
);
api.use("/payments", limiter(60));
api.post(
  "/payments/create-order",
  wrap(async (req, res) => {
    const { orderId } = V.z.object({ orderId: V.id }).parse(req.body);
    const o = await M.Order.findById(orderId);
    if (!canAccess(o, req)) throw fail(404, "Order not found");
    if (
      o.paymentMethod !== "razorpay" ||
      o.paymentStatus !== "pending" ||
      o.expiresAt < new Date()
    )
      throw fail(409, "Order is not payable");
    if (!o.razorpayOrderId) {
      const created = await razor().orders.create({
        amount: o.total,
        currency: "INR",
        receipt: o.number,
      });
      const claimed = await M.Order.findOneAndUpdate(
        { _id: o._id, razorpayOrderId: null },
        { $set: { razorpayOrderId: created.id } },
        { new: true },
      );
      o.razorpayOrderId =
        claimed?.razorpayOrderId ||
        (await M.Order.findById(o._id)).razorpayOrderId;
    }
    ok(res, {
      key: process.env.RAZORPAY_KEY_ID,
      orderId: o.razorpayOrderId,
      amount: o.total,
      currency: "INR",
    });
  }),
);
api.post(
  "/payments/verify",
  wrap(async (req, res) => {
    const d = V.z
      .object({
        orderId: V.id,
        razorpay_payment_id: short,
        razorpay_signature: V.z.string().length(64),
      })
      .parse(req.body);
    const o = await M.Order.findById(d.orderId);
    if (!canAccess(o, req)) throw fail(404, "Order not found");
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(o.razorpayOrderId + "|" + d.razorpay_payment_id)
      .digest("hex");
    if (!safeEqual(expected, d.razorpay_signature))
      throw fail(400, "Invalid payment signature");
    const payment = await razor().payments.fetch(d.razorpay_payment_id);
    if (payment.order_id !== o.razorpayOrderId)
      throw fail(400, "Payment order mismatch");
    await capturePayment(payment, "verify:" + payment.id);
    ok(res, publicOrder(await M.Order.findById(o._id)));
  }),
);
api.post(
  "/reviews",
  required,
  wrap(async (req, res) => {
    const d = V.z
      .object({
        product: V.id,
        rating: V.z.number().int().min(1).max(5),
        title: short,
        comment: V.z.string().min(5).max(2000),
      })
      .parse(req.body);
    if (!req.user.isVerified)
      throw fail(403, "Verify your email before reviewing");
    if (
      !(await M.Order.exists({
        user: req.user._id,
        status: "Delivered",
        "items.product": d.product,
      }))
    )
      throw fail(403, "Only verified buyers with a delivered order can review");
    ok(
      res,
      await M.Review.create({ ...d, user: req.user._id, name: req.user.name }),
      201,
    );
  }),
);
api.post(
  "/contact",
  limiter(10),
  wrap(async (req, res) => {
    const d = V.z
      .object({
        name: short,
        email,
        subject: short,
        message: V.z.string().min(10).max(5000),
      })
      .parse(req.body);
    await M.Contact.create(d);
    const s = await M.settings();
    await enqueue(
      s.supportEmail,
      `Contact: ${d.subject}`,
      `${d.name} <${d.email}>\n\n${d.message}`,
    );
    ok(
      res,
      { message: "Message received. Our team will get back to you." },
      201,
    );
  }),
);
api.post(
  "/newsletter",
  limiter(15),
  wrap(async (req, res) => {
    const d = V.z.object({ email }).parse(req.body);
    await M.Subscriber.updateOne(
      { email: d.email },
      { active: true },
      { upsert: true },
    );
    ok(res, { message: "You are on the list." });
  }),
);
const a = express.Router();
api.use("/admin", required, admin, a);
a.get(
  "/stats",
  wrap(async (req, res) => {
    const [revenue, orders, customers, lowStock, recent, top] =
      await Promise.all([
        M.Order.aggregate([
          {
            $match: {
              paymentStatus: "paid",
              "address.country": "Pakistan",
              status: { $nin: ["Cancelled", "Returned"] },
            },
          },
          { $group: { _id: null, total: { $sum: "$total" } } },
        ]),
        M.Order.countDocuments(),
        M.User.countDocuments({ role: "customer" }),
        M.Product.find({ isActive: true, "variants.stock": { $lte: 5 } }).limit(
          10,
        ),
        M.Order.find().sort({ createdAt: -1 }).limit(8),
        M.Product.find().sort({ soldCount: -1 }).limit(5),
      ]);
    ok(res, {
      revenue: revenue[0]?.total || 0,
      orders,
      customers,
      lowStock,
      recent: recent.map(publicOrder),
      top,
    });
  }),
);
a.get(
  "/products",
  wrap(async (req, res) =>
    ok(res, await M.Product.find().sort({ createdAt: -1 }).limit(1000)),
  ),
);
a.post(
  "/products",
  wrap(async (req, res) =>
    ok(res, await M.Product.create(V.product.parse(req.body)), 201),
  ),
);
a.put(
  "/products/:id",
  wrap(async (req, res) => {
    const d = V.product.parse(req.body);
    const prior = await M.Product.findById(V.id.parse(req.params.id));
    if (!prior) throw fail(404, "Product not found");
    const removed = prior.variants.filter(
      (v) => !d.variants.some((n) => n.sku === v.sku),
    );
    if (
      removed.length &&
      (await M.Order.exists({
        stockReleased: false,
        status: { $nin: ["Cancelled", "Returned"] },
        "items.product": prior._id,
        "items.sku": { $in: removed.map((v) => v.sku) },
      }))
    )
      throw fail(
        409,
        "Cannot remove variants referenced by orders; retain SKU and set stock to zero",
      );
    ok(
      res,
      await M.Product.findByIdAndUpdate(prior._id, d, {
        new: true,
        runValidators: true,
      }),
    );
  }),
);
a.delete(
  "/products/:id",
  wrap(async (req, res) => {
    await M.Product.findByIdAndUpdate(V.id.parse(req.params.id), {
      isActive: false,
    });
    ok(res, { message: "Product archived" });
  }),
);
const categorySchema = V.z.object({
  name: short,
  slug: V.z.string().regex(/^[a-z0-9-]+$/),
  image: V.z.string().default(""),
  gender: V.z.enum(["men", "women", "unisex"]).default("unisex"),
  isActive: V.z.boolean().default(true),
});
a.get(
  "/categories",
  wrap(async (req, res) => ok(res, await M.Category.find())),
);
a.post(
  "/categories",
  wrap(async (req, res) =>
    ok(res, await M.Category.create(categorySchema.parse(req.body)), 201),
  ),
);
a.put(
  "/categories/:id",
  wrap(async (req, res) =>
    ok(
      res,
      await M.Category.findByIdAndUpdate(
        V.id.parse(req.params.id),
        categorySchema.parse(req.body),
        { new: true },
      ),
    ),
  ),
);
a.delete(
  "/categories/:id",
  wrap(async (req, res) => {
    await M.Category.findByIdAndUpdate(V.id.parse(req.params.id), {
      isActive: false,
    });
    ok(res, { message: "Category archived" });
  }),
);
a.get(
  "/orders",
  wrap(async (req, res) => {
    const f = {};
    if (typeof req.query.status === "string") f.status = req.query.status;
    ok(
      res,
      (await M.Order.find(f).sort({ createdAt: -1 }).limit(500)).map(
        publicOrder,
      ),
    );
  }),
);
a.patch(
  "/orders/:id/status",
  wrap(async (req, res) => {
    const d = V.z
      .object({
        status: V.z.enum([
          "Pending",
          "Confirmed",
          "Packed",
          "Shipped",
          "Delivered",
          "Cancelled",
          "Returned",
        ]),
        trackingNumber: V.z.string().max(150).optional(),
        refundNote: V.z.string().max(1000).optional(),
      })
      .parse(req.body);
    ok(res, publicOrder(await updateStatus(V.id.parse(req.params.id), d)));
  }),
);
a.get(
  "/customers",
  wrap(async (req, res) =>
    ok(
      res,
      await M.User.find({ role: "customer" })
        .select("name email isVerified createdAt")
        .sort({ createdAt: -1 })
        .limit(500),
    ),
  ),
);
a.get(
  "/coupons",
  wrap(async (req, res) => ok(res, await M.Coupon.find())),
);
a.post(
  "/coupons",
  wrap(async (req, res) =>
    ok(res, await M.Coupon.create(V.coupon.parse(req.body)), 201),
  ),
);
a.put(
  "/coupons/:id",
  wrap(async (req, res) =>
    ok(
      res,
      await M.Coupon.findByIdAndUpdate(
        V.id.parse(req.params.id),
        V.coupon.parse(req.body),
        { new: true },
      ),
    ),
  ),
);
a.delete(
  "/coupons/:id",
  wrap(async (req, res) => {
    await M.Coupon.findByIdAndUpdate(V.id.parse(req.params.id), {
      isActive: false,
    });
    ok(res, { message: "Coupon disabled" });
  }),
);
a.get(
  "/reviews",
  wrap(async (req, res) =>
    ok(
      res,
      await M.Review.find()
        .populate("product", "name")
        .sort({ createdAt: -1 })
        .limit(500),
    ),
  ),
);
a.patch(
  "/reviews/:id",
  wrap(async (req, res) => {
    const d = V.z
      .object({ status: V.z.enum(["approved", "rejected", "pending"]) })
      .parse(req.body);
    const r = await M.Review.findByIdAndUpdate(V.id.parse(req.params.id), d, {
      new: true,
    });
    if (!r) throw fail(404, "Review not found");
    const agg = await M.Review.aggregate([
      { $match: { product: r.product, status: "approved" } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    await M.Product.findByIdAndUpdate(r.product, {
      ratingAverage: agg[0]?.avg || 0,
      ratingCount: agg[0]?.count || 0,
    });
    ok(res, r);
  }),
);
a.get(
  "/contacts",
  wrap(async (req, res) =>
    ok(res, await M.Contact.find().sort({ createdAt: -1 }).limit(500)),
  ),
);
a.patch(
  "/contacts/:id",
  wrap(async (req, res) =>
    ok(
      res,
      await M.Contact.findByIdAndUpdate(
        V.id.parse(req.params.id),
        V.z
          .object({ status: V.z.enum(["new", "read", "resolved"]) })
          .parse(req.body),
        { new: true },
      ),
    ),
  ),
);
a.get("/rack", wrap(async (_req, res) => {
  ok(res, await M.Product.find({ isActive: true }).select("name slug images hangerImage isRack")
    .sort({ name: 1 }).lean());
}));
a.patch("/rack/:id", wrap(async (req, res) => {
  const { isRack } = V.z.object({ isRack: V.z.boolean() }).parse(req.body);
  const product = await M.Product.findOneAndUpdate(
    { _id: V.id.parse(req.params.id), isActive: true }, { $set: { isRack } }, { new: true },
  ).select("name slug images hangerImage isRack");
  if (!product) throw fail(404, "Active product not found");
  ok(res, product);
}));
a.get("/storefront", wrap(async (_req, res) => {
  const s = await M.settings();
  ok(res, storefrontContent(s.storefront));
}));
a.put("/storefront", wrap(async (req, res) => {
  const storefront = storefrontSchema.parse(req.body);
  await M.Settings.updateOne({ key: "site" }, { $set: { storefront } }, { upsert: true });
  ok(res, storefront);
}));
a.get(
  "/settings",
  wrap(async (req, res) => { const s = (await M.settings()).toObject(); ok(res, { ...s, announcement: s.announcement?.replaceAll("₹", "PKR ") }); }),
);
a.put(
  "/settings",
  wrap(async (req, res) =>
    ok(
      res,
      await M.Settings.findOneAndUpdate(
        { key: "site" },
        V.siteSettings.parse(req.body),
        { new: true, upsert: true },
      ),
    ),
  ),
);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) =>
    cb(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)),
});
a.post(
  "/uploads",
  upload.array("images", 10),
  wrap(async (req, res) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME)
      throw fail(503, "Set Cloudinary credentials first");
    if (!req.files?.length) throw fail(400, "Select JPEG, PNG or WebP images");
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    const urls = [];
    for (const f of req.files) {
      const result = await cloudinary.uploader.upload(
        "data:" + f.mimetype + ";base64," + f.buffer.toString("base64"),
        { folder: "farmeri/products", resource_type: "image" },
      );
      urls.push(result.secure_url);
    }
    ok(res, urls);
  }),
);
app.get(
  "/sitemap.xml",
  wrap(async (req, res) => {
    const origin = (process.env.PUBLIC_SITE_URL || origins[0]).replace(
      /\/$/,
      "",
    );
    const products = await M.Product.find({ isActive: true }).select("slug");
    const paths = [
      "",
      "shop",
      "new",
      "men",
      "women",
      "about",
      "contact",
      "faq",
      "shipping-returns",
      "size-guide",
      ...products.map((p) => "product/" + p.slug),
    ];
    res
      .type("application/xml")
      .send(
        '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
          paths.map((p) => `<url><loc>${origin}/${p}</loc></url>`).join("") +
          "</urlset>",
      );
  }),
);
app.use((req, res, next) => next(fail(404, "Endpoint not found")));
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status =
    err.status ||
    (err instanceof V.z.ZodError
      ? 400
      : err.code === 11000
        ? 409
        : err.name === "CastError"
          ? 400
          : 500);
  if (status === 500) console.error(err);
  res
    .status(status)
    .json({
      success: false,
      error:
        err instanceof V.z.ZodError
          ? err.issues.map((i) => i.message).join("; ")
          : err.code === 11000
            ? "This record already exists"
            : status === 500
              ? "Server error. Please try again."
              : err.message,
    });
});
export default app;
