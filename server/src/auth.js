import jwt from "jsonwebtoken";
import { Session, User } from "./models.js";
import { config } from "./config.js";
import { hash, random, fail } from "./utils.js";
export const cookieOptions = {
  httpOnly: true,
  secure: config.production,
  sameSite: config.production ? "none" : "lax",
  path: "/api/v1/auth",
  maxAge: 7 * 86400000,
};
export async function issue(user, res) {
  const raw = random();
  await Session.create({
    user: user._id,
    hash: hash(raw),
    expiresAt: new Date(Date.now() + 7 * 86400000),
  });
  res.cookie("refresh", raw, cookieOptions);
  return {
    accessToken: jwt.sign({ sub: String(user._id) }, config.secret, {
      expiresIn: "15m",
    }),
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    },
  };
}
export async function optional(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (header) {
      const payload = jwt.verify(header.replace(/^Bearer /, ""), config.secret);
      req.user = await User.findById(payload.sub);
      if (!req.user) throw Error();
    }
    next();
  } catch {
    next(fail(401, "Session expired. Please sign in again."));
  }
}
export function required(req, res, next) {
  if (!req.user) return next(fail(401, "Please sign in"));
  next();
}
export function admin(req, res, next) {
  if (req.user?.role !== "admin")
    return next(fail(403, "Administrator access required"));
  next();
}
