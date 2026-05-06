const nodemailer = require("nodemailer");
let cachedTransporter = null;
let cachedFromUser = null;

function getMailConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error("Missing SMTP credentials. Set SMTP_USER/SMTP_PASS (or EMAIL_USER/EMAIL_PASS).");
  }

  if (!host) {
    return {
      service: "gmail",
      auth: { user, pass },
      fromUser: user,
    };
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    fromUser: user,
  };
}

function createTransporter() {
  if (cachedTransporter && cachedFromUser) {
    return { transporter: cachedTransporter, fromUser: cachedFromUser };
  }

  const config = getMailConfig();
  const { fromUser, ...transportConfig } = config;
  const transporter = nodemailer.createTransport({
    ...transportConfig,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

  cachedTransporter = transporter;
  cachedFromUser = fromUser;
  return { transporter: cachedTransporter, fromUser: cachedFromUser };
}

async function verifyMailer() {
  const { transporter, fromUser } = createTransporter();
  await transporter.verify();
  return { ok: true, fromUser };
}

module.exports = {
  createTransporter,
  verifyMailer,
};
