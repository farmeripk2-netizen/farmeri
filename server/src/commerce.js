import mongoose from "mongoose";
import crypto from "node:crypto";
import Razorpay from "razorpay";
import { Product, Coupon, Order, PaymentEvent, settings } from "./models.js";
import { fail, hash, random } from "./utils.js";
import { enqueue } from "./email.js";
import { config } from "./config.js";
export function calculateTotals(subtotal, coupon, s) {
  let discount = 0;
  if (coupon)
    discount =
      coupon.type === "percent"
        ? Math.round((subtotal * coupon.value) / 100)
        : coupon.value;
  if (coupon?.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, subtotal);
  const shipping =
    subtotal - discount >= s.shippingThreshold ? 0 : s.shippingFee;
  const tax = Math.round(((subtotal - discount) * s.taxPercent) / 100);
  return {
    subtotal,
    discount,
    shipping,
    tax,
    total: subtotal - discount + shipping + tax,
  };
}
export async function quote(input, session = null) {
  const merged = new Map();
  for (const item of input.items) {
    const k = item.product + ":" + item.sku;
    const prev = merged.get(k);
    merged.set(k, { ...item, qty: item.qty + (prev?.qty || 0) });
  }
  const lines = [];
  for (const item of merged.values()) {
    if (item.qty > 20) throw fail(400, "Maximum 20 per variant");
    const p = await Product.findOne({
      _id: item.product,
      isActive: true,
    }).session(session);
    const v = p?.variants.find((v) => v.sku === item.sku);
    if (!v || v.stock < item.qty)
      throw fail(409, `Item unavailable or insufficient stock: ${item.sku}`);
    lines.push({
      product: p._id,
      sku: v.sku,
      name: p.name,
      image: p.images[0],
      size: v.size,
      color: v.color,
      qty: item.qty,
      price: p.discountPrice || p.price,
    });
  }
  let coupon = null;
  if (input.coupon) {
    coupon = await Coupon.findOne({
      code: input.coupon.toUpperCase(),
      isActive: true,
      expiry: { $gt: new Date() },
    }).session(session);
    if (!coupon || coupon.usedCount >= coupon.usageLimit)
      throw fail(400, "Coupon is invalid or fully used");
  }
  const subtotal = lines.reduce((n, i) => n + i.price * i.qty, 0);
  if (coupon && subtotal < coupon.minCart)
    throw fail(400, "Cart does not meet coupon minimum");
  const s = await settings();
  if (
    input.address &&
    s.serviceablePrefixes.length &&
    !s.serviceablePrefixes.some((p) => input.address.postalCode.startsWith(p))
  )
    throw fail(400, "Delivery is not available for this PIN");
  return {
    items: lines,
    ...calculateTotals(subtotal, coupon, s),
    coupon: coupon?._id,
  };
}
export function razor() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
    throw fail(
      503,
      "Online payment is not configured. Choose Cash on Delivery.",
    );
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}
export async function createOrder(input, user, key) {
  if (!key || !/^[A-Za-z0-9-]{16,100}$/.test(key))
    throw fail(400, "A valid Idempotency-Key is required");
  if (input.paymentMethod === "razorpay") razor();
  const requestHash = hash(
    JSON.stringify({ input, user: String(user?._id || "guest") }),
  );
  const existing = await Order.findOne({ idempotencyKey: key });
  if (existing) {
    if (existing.requestHash !== requestHash)
      throw fail(409, "Checkout key already used for different details");
    return {
      order: existing,
      guestToken: !existing.user ? guestToken(key) : undefined,
    };
  }
  const session = await mongoose.startSession();
  let order;
  const guest = !user ? guestToken(key) : undefined;
  try {
    await session.withTransaction(async () => {
      const q = await quote(input, session);
      for (const item of q.items) {
        const result = await Product.updateOne(
          {
            _id: item.product,
            variants: {
              $elemMatch: { sku: item.sku, stock: { $gte: item.qty } },
            },
          },
          { $inc: { "variants.$.stock": -item.qty } },
          { session },
        );
        if (result.modifiedCount !== 1)
          throw fail(409, "Stock changed, please retry");
      }
      if (q.coupon) {
        const c = await Coupon.updateOne(
          { _id: q.coupon, $expr: { $lt: ["$usedCount", "$usageLimit"] } },
          { $inc: { usedCount: 1 } },
          { session },
        );
        if (c.modifiedCount !== 1) throw fail(409, "Coupon limit reached");
      }
      const data = {
        ...q,
        number:
          "FM-" +
          Date.now().toString(36).toUpperCase() +
          "-" +
          random().slice(0, 4).toUpperCase(),
        user: user?._id,
        email: user?.email || input.email,
        guestHash: guest ? hash(guest) : undefined,
        address: input.address,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentMethod === "cod" ? "unpaid" : "pending",
        status: "Pending",
        history: [{ status: "Pending", at: new Date() }],
        idempotencyKey: key,
        requestHash,
        expiresAt:
          input.paymentMethod === "razorpay"
            ? new Date(Date.now() + 30 * 60000)
            : undefined,
      };
      [order] = await Order.create([data], { session });
      if (input.paymentMethod === "cod")
        await enqueue(
          order.email,
          `Farmeri order ${order.number}`,
          `Thank you for your order. Total: INR ${(order.total / 100).toFixed(2)}. Payment: Cash on Delivery. Track at ${config.origin}/track-order`,
          session,
        );
    });
  } catch (e) {
    if (e.code === 11000) {
      const prior = await Order.findOne({ idempotencyKey: key, requestHash });
      if (prior) return { order: prior, guestToken: guest };
    }
    throw e;
  } finally {
    await session.endSession();
  }
  return { order, guestToken: guest };
}
function guestToken(key) {
  return crypto
    .createHmac("sha256", config.secret)
    .update("guest:" + key)
    .digest("hex");
}
export function canAccess(order, req) {
  return (
    order &&
    (req.user?.role === "admin" ||
      (order.user && String(order.user) === String(req.user?._id)) ||
      (!order.user &&
        req.headers["x-order-token"] &&
        hash(req.headers["x-order-token"]) === order.guestHash))
  );
}
export function publicOrder(order) {
  const o = order.toObject ? order.toObject() : { ...order };
  delete o.guestHash;
  delete o.requestHash;
  delete o.idempotencyKey;
  return o;
}
export async function restoreStock(order, session) {
  if (order.stockReleased) return;
  for (const item of order.items)
    await Product.updateOne(
      { _id: item.product, "variants.sku": item.sku },
      { $inc: { "variants.$.stock": item.qty } },
      { session },
    );
  if (order.coupon)
    await Coupon.updateOne(
      { _id: order.coupon, usedCount: { $gt: 0 } },
      { $inc: { usedCount: -1 } },
      { session },
    );
  order.stockReleased = true;
}
export async function expireOrders() {
  const stale = await Order.find({
    paymentMethod: "razorpay",
    paymentStatus: "pending",
    expiresAt: { $lt: new Date() },
    stockReleased: false,
  }).limit(50);
  for (const candidate of stale) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const o = await Order.findOne({
          _id: candidate._id,
          paymentStatus: "pending",
          stockReleased: false,
        }).session(session);
        if (!o) return;
        await restoreStock(o, session);
        o.paymentStatus = "expired";
        o.status = "Cancelled";
        o.history.push({ status: "Cancelled", at: new Date() });
        await o.save({ session });
      });
    } finally {
      await session.endSession();
    }
  }
}
export async function capturePayment(payment, eventId) {
  if (payment.status !== "captured")
    throw fail(409, "Payment not yet captured");
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      if (await PaymentEvent.findOne({ eventId }).session(session)) return;
      const o = await Order.findOne({
        razorpayOrderId: payment.order_id,
      }).session(session);
      if (!o) throw fail(404, "Payment order not found");
      if (payment.currency !== "INR" || payment.amount !== o.total)
        throw fail(400, "Payment amount or currency mismatch");
      if (o.paymentStatus === "paid" || o.paymentStatus === "refund_required") {
        await PaymentEvent.create(
          [{ eventId, order: o._id, type: "duplicate_capture" }],
          { session },
        );
        return;
      }
      o.paymentId = payment.id;
      o.paymentStatus = o.stockReleased ? "refund_required" : "paid";
      if (!o.stockReleased) {
        o.status = "Confirmed";
        o.history.push({ status: "Confirmed", at: new Date() });
      } else {
        o.refundNote =
          "Payment captured after stock release. Refund or resolve manually in Razorpay. Do not fulfil.";
      }
      await o.save({ session });
      await PaymentEvent.create([{ eventId, order: o._id, type: "captured" }], {
        session,
      });
      await enqueue(
        o.email,
        `Payment received: ${o.number}`,
        o.stockReleased
          ? "Payment arrived after order expiration. Support will arrange a refund."
          : `Your Farmeri order is confirmed. Total INR ${(o.total / 100).toFixed(2)}.`,
        session,
      );
    });
  } finally {
    await session.endSession();
  }
}
export async function updateStatus(orderId, input) {
  const transitions = {
    Pending: ["Confirmed", "Cancelled"],
    Confirmed: ["Packed", "Cancelled"],
    Packed: ["Shipped", "Cancelled"],
    Shipped: ["Delivered", "Returned"],
    Delivered: ["Returned"],
    Cancelled: [],
    Returned: [],
  };
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const o = await Order.findById(orderId).session(session);
      if (!o) throw fail(404, "Order not found");
      if (input.status !== o.status) {
        if (!transitions[o.status]?.includes(input.status))
          throw fail(400, "Invalid order status transition");
        if (
          o.paymentMethod === "razorpay" &&
          o.paymentStatus !== "paid" &&
          input.status !== "Cancelled"
        )
          throw fail(400, "Online payment must be captured before fulfilment");
        if (["Cancelled", "Returned"].includes(input.status)) {
          await restoreStock(o, session);
          if (o.status === "Delivered")
            for (const item of o.items)
              await Product.updateOne(
                { _id: item.product },
                { $inc: { soldCount: -item.qty } },
                { session },
              );
          if (o.paymentStatus === "paid") o.paymentStatus = "refund_required";
        }
        if (input.status === "Delivered") {
          if (o.paymentMethod === "cod") o.paymentStatus = "paid";
          for (const i of o.items)
            await Product.updateOne(
              { _id: i.product },
              { $inc: { soldCount: i.qty } },
              { session },
            );
        }
        o.status = input.status;
        o.history.push({ status: input.status, at: new Date() });
        await enqueue(
          o.email,
          `Order ${o.number}: ${o.status}`,
          `Your order status is ${o.status}. Tracking: ${input.trackingNumber || o.trackingNumber || "Not yet assigned"}.`,
          session,
        );
      }
      o.trackingNumber = input.trackingNumber || o.trackingNumber;
      o.refundNote = input.refundNote ?? o.refundNote;
      await o.save({ session });
      result = o;
    });
  } finally {
    await session.endSession();
  }
  return result;
}
