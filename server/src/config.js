import "dotenv/config";
export const config = {
  port: Number(process.env.PORT || 5000),
  mongo:
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/farmeri?replicaSet=rs0",
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  secret: process.env.JWT_SECRET,
  production: process.env.NODE_ENV === "production",
  currency: "INR",
};
export function checkConfig() {
  if (!config.secret || config.secret.length < 32)
    throw new Error(
      "Set JWT_SECRET to at least 32 random characters in server/.env",
    );
}
