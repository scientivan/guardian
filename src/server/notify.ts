import nodemailer from "nodemailer";

// Email notifications through Gmail (SMTP with an app password). Optional: without
// GMAIL_USER and GMAIL_APP_PASSWORD nothing is sent and the caller records why.
// Emails carry no patient name or document content, only what to open in Guardian.

export type Mail = { to: string; subject: string; text: string };
export type MailResult = { sent: number; skipped: string | null };

export function mailConfigured() { return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD); }

export async function sendMails(mails: Mail[], timeoutMs = 10_000): Promise<MailResult> {
  if (!mails.length) return { sent: 0, skipped: "no recipient with an email address" };
  if (!mailConfigured()) return { sent: 0, skipped: "Gmail is not configured (GMAIL_USER, GMAIL_APP_PASSWORD)" };
  const transport = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }, connectionTimeout: timeoutMs, socketTimeout: timeoutMs });
  const from = `Guardian <${process.env.GMAIL_USER}>`;
  const results = await Promise.allSettled(mails.map(m => transport.sendMail({ from, ...m })));
  transport.close();
  const failed = results.filter(r => r.status === "rejected").length;
  return { sent: results.length - failed, skipped: failed ? `${failed} email(s) could not be sent` : null };
}
