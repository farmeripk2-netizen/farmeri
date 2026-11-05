import mongoose from "mongoose";
import app from "./app.js";
import { config, checkConfig } from "./config.js";
import { expireOrders } from "./commerce.js";
import { deliverEmails } from "./email.js";
checkConfig();
await mongoose.connect(config.mongo);
console.log("MongoDB connected:", mongoose.connection.name);
const server = app.listen(config.port, () =>
  console.log(`Farmeri API: http://localhost:${config.port}/api/v1`),
);
let working = false;
const timer = setInterval(async () => {
  if (working) return;
  working = true;
  try {
    await expireOrders();
    await deliverEmails();
  } catch (e) {
    console.error("Background job failed:", e.message);
  } finally {
    working = false;
  }
}, 30000);
async function shutdown() {
  clearInterval(timer);
  server.close();
  await mongoose.disconnect();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
