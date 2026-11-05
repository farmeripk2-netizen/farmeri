import mongoose from "mongoose";
const { Schema } = mongoose;
const ref = (model) => ({ type: Schema.Types.ObjectId, ref: model });
const make = (name, fields, indexes = []) => {
  const s = new Schema(fields, { timestamps: true });
  for (const [keys, opts] of indexes) s.index(keys, opts);
  return mongoose.model(name, s);
};
export const User = make("User", {
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true, lowercase: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["customer", "admin"], default: "customer" },
  isVerified: { type: Boolean, default: false },
  addresses: [
    {
      name: String,
      phone: String,
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
  ],
  wishlist: [ref("Product")],
});
export const Session = make(
  "Session",
  { user: ref("User"), hash: { type: String, unique: true }, expiresAt: Date },
  [[{ expiresAt: 1 }, { expireAfterSeconds: 0 }]],
);
export const Token = make(
  "Token",
  {
    user: ref("User"),
    hash: { type: String, unique: true },
    purpose: String,
    expiresAt: Date,
  },
  [[{ expiresAt: 1 }, { expireAfterSeconds: 0 }]],
);
export const Category = make("Category", {
  name: { type: String, required: true },
  slug: { type: String, unique: true },
  image: String,
  gender: String,
  isActive: { type: Boolean, default: true },
});
export const Product = make(
  "Product",
  {
    name: { type: String, required: true },
    slug: { type: String, unique: true, required: true },
    description: String,
    category: String,
    gender: { type: String, default: "unisex" },
    tags: [String],
    images: [String],
    price: { type: Number, min: 0, required: true },
    discountPrice: { type: Number, min: 0 },
    variants: [
      {
        sku: { type: String, required: true },
        size: String,
        color: String,
        stock: { type: Number, min: 0, default: 0 },
      },
    ],
    isFeatured: Boolean,
    isNewArrival: Boolean,
    isActive: { type: Boolean, default: true },
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    soldCount: { type: Number, default: 0 },
    fabric: String,
    care: String,
    seo: { title: String, description: String, keywords: String },
  },
  [[{ name: "text", description: "text", tags: "text" }, {}]],
);
export const Cart = make("Cart", {
  user: { ...ref("User"), unique: true },
  items: [{ product: ref("Product"), sku: String, qty: Number }],
});
export const Coupon = make("Coupon", {
  code: { type: String, unique: true },
  type: { type: String, enum: ["percent", "flat"] },
  value: Number,
  minCart: { type: Number, default: 0 },
  maxDiscount: Number,
  expiry: Date,
  usageLimit: { type: Number, default: 100 },
  usedCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
});
export const Order = make("Order", {
  number: { type: String, unique: true },
  user: ref("User"),
  email: String,
  guestHash: String,
  idempotencyKey: { type: String, unique: true },
  requestHash: String,
  items: [
    {
      product: ref("Product"),
      sku: String,
      name: String,
      image: String,
      size: String,
      color: String,
      qty: Number,
      price: Number,
    },
  ],
  address: {
    name: String,
    phone: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
  },
  subtotal: Number,
  discount: Number,
  shipping: Number,
  tax: Number,
  total: Number,
  coupon: ref("Coupon"),
  paymentMethod: { type: String, enum: ["cod", "razorpay"] },
  paymentStatus: { type: String, default: "pending" },
  status: { type: String, default: "Pending" },
  history: [{ status: String, at: Date }],
  razorpayOrderId: String,
  paymentId: String,
  expiresAt: Date,
  stockReleased: { type: Boolean, default: false },
  trackingNumber: String,
  refundNote: String,
});
export const Review = make(
  "Review",
  {
    product: ref("Product"),
    user: ref("User"),
    name: String,
    rating: { type: Number, min: 1, max: 5 },
    title: String,
    comment: String,
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    isVerifiedPurchase: { type: Boolean, default: true },
  },
  [[{ product: 1, user: 1 }, { unique: true }]],
);
export const Contact = make("Contact", {
  name: String,
  email: String,
  subject: String,
  message: String,
  status: { type: String, default: "new" },
});
export const Subscriber = make("Subscriber", {
  email: { type: String, unique: true },
  active: { type: Boolean, default: true },
});
export const Settings = make("Settings", {
  key: { type: String, unique: true, default: "site" },
  headline: { type: String, default: "EVERY FIT COUNTS" },
  announcement: {
    type: String,
    default: "FREE SHIPPING ON ORDERS OVER ₹1,999",
  },
  announcementEnabled: { type: Boolean, default: true },
  shippingThreshold: { type: Number, default: 199900 },
  shippingFee: { type: Number, default: 15000 },
  taxPercent: { type: Number, default: 0 },
  supportEmail: { type: String, default: "support@example.com" },
  serviceablePrefixes: [String],
});
export const EmailJob = make("EmailJob", {
  to: String,
  subject: String,
  text: String,
  sentAt: Date,
  attempts: { type: Number, default: 0 },
  lastError: String,
});
export const PaymentEvent = make("PaymentEvent", {
  eventId: { type: String, unique: true },
  order: ref("Order"),
  type: String,
});
export const settings = () =>
  Settings.findOneAndUpdate(
    { key: "site" },
    { $setOnInsert: { key: "site" } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
