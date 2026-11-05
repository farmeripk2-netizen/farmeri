import crypto from "node:crypto";
export const hash = (s) => crypto.createHash("sha256").update(s).digest("hex");
export const random = () => crypto.randomBytes(32).toString("hex");
export const fail = (status, message) =>
  Object.assign(new Error(message), { status });
export const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
export const ok = (res, data, status = 200) =>
  res.status(status).json({ success: true, data });
export const safeEqual = (a, b) =>
  typeof a === "string" &&
  typeof b === "string" &&
  a.length === b.length &&
  crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
