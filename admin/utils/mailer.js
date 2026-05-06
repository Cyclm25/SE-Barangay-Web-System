const nodemailer = require("nodemailer");

function getBaseConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error("Missing SMTP credentials. Set SMTP_USER/SMTP_PASS.");
  }

  return { host, port, user, pass };
}

function buildTransportConfig(host, port, user, pass) {
  if (!host) {
    return {
      service: "gmail",
      auth: { user, pass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    };
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  };
}

function getFallbackPort(port) {
  if (port === 465) return 587;
  if (port === 587) return 465;
  return null;
}

async function attemptSend({ host, port, user, pass, mailOptions, verifyOnly = false }) {
  const transporter = nodemailer.createTransport(buildTransportConfig(host, port, user, pass));
  if (verifyOnly) {
    await transporter.verify();
    return { ok: true, port };
  }
  const info = await transporter.sendMail(mailOptions);
  return { ok: true, port, info };
}

async function sendMailWithFallback(mailOptions) {
  const { host, port, user, pass } = getBaseConfig();
  const fromUser = user;

  try {
    const sent = await attemptSend({ host, port, user, pass, mailOptions });
    return { ...sent, fromUser };
  } catch (err) {
    const fallbackPort = getFallbackPort(port);
    const shouldRetry = (err && err.code === "ETIMEDOUT" && !!fallbackPort && host === "smtp.gmail.com");
    if (!shouldRetry) throw err;
    const sent = await attemptSend({ host, port: fallbackPort, user, pass, mailOptions });
    return { ...sent, fromUser };
  }
}

async function verifyMailer() {
  const { host, port, user, pass } = getBaseConfig();
  const fromUser = user;
  try {
    const ok = await attemptSend({ host, port, user, pass, verifyOnly: true });
    return { ok: true, fromUser, port: ok.port };
  } catch (err) {
    const fallbackPort = getFallbackPort(port);
    const shouldRetry = err && err.code === "ETIMEDOUT" && !!fallbackPort && host === "smtp.gmail.com";
    if (!shouldRetry) throw err;
    const ok = await attemptSend({ host, port: fallbackPort, user, pass, verifyOnly: true });
    return { ok: true, fromUser, port: ok.port };
  }
}

module.exports = {
  sendMailWithFallback,
  verifyMailer,
};
