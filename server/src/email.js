import nodemailer from "nodemailer";
import { EmailJob } from "./models.js";
export const enqueue = (to, subject, text, session) =>
  EmailJob.create([{ to, subject, text }], session ? { session } : {});
let busy = false;
export async function deliverEmails() {
  if (busy || !process.env.SMTP_HOST) return;
  busy = true;
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_PORT === "465",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    const jobs = await EmailJob.find({
      sentAt: null,
      attempts: { $lt: 5 },
    }).limit(10);
    for (const job of jobs) {
      try {
        await transport.sendMail({
          from: process.env.SMTP_FROM,
          to: job.to,
          subject: job.subject,
          text: job.text,
        });
        job.sentAt = new Date();
        job.lastError = "";
      } catch (e) {
        job.lastError = e.message;
      }
      job.attempts++;
      await job.save();
    }
  } finally {
    busy = false;
  }
}
