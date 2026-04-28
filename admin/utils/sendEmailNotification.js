const pool = require("../db");
const nodemailer = require("nodemailer");

const EMAIL_LOG_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS email_notification_log (
    "EmailLogID" SERIAL PRIMARY KEY,
    "RequestID" INTEGER,
    "ResidentID" VARCHAR(20),
    "EmailAddress" VARCHAR(255),
    "Subject" VARCHAR(255) NOT NULL,
    "Message" TEXT NOT NULL,
    "Status" VARCHAR(20) NOT NULL,
    "ErrorMessage" TEXT,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
  );
`;

let emailLogTableReady = false;

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function ensureEmailLogTable() {
  if (emailLogTableReady) return;
  await pool.query(EMAIL_LOG_TABLE_SQL);
  emailLogTableReady = true;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function buildReadyForPickupEmail({ residentName, documentType }) {
  return {
    subject: "Your Document is Ready for Pickup",
    text: `Good day, ${residentName}.

Your requested document ${documentType} is now ready for pickup at Barangay 160.

Please bring a valid ID when claiming your document.

Thank you,
Barangay 160`,
  };
}

function buildRequestRejectedEmail({ residentName, documentType, reason }) {
  return {
    subject: "Your Document Request Was Denied",
    text: `Good day, ${residentName}.

Your requested document ${documentType} was denied by Barangay 160.

Reason for denial:
${reason}

Please review the concern and submit a new request if needed.

Thank you,
Barangay 160`,
  };
}

function buildReturnForCompletionEmail({ residentName, documentType, reason }) {
  return {
    subject: "Your Document Request Needs Completion",
    text: `Good day, ${residentName}.

Your requested document ${documentType} needs completion before Barangay 160 can continue processing it.

Reason / missing requirements:
${reason}

Please complete the missing requirements and coordinate with Barangay 160 for the next step.

Thank you,
Barangay 160`,
  };
}

async function logEmailAttempt({
  requestId,
  residentId,
  emailAddress,
  subject,
  message,
  status,
  errorMessage = null,
}) {
  await ensureEmailLogTable();

  await pool.query(
    `INSERT INTO email_notification_log
      ("RequestID","ResidentID","EmailAddress","Subject","Message","Status","ErrorMessage")
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [requestId, residentId, emailAddress, subject, message, status, errorMessage]
  );
}

async function sendReadyForPickupEmail({
  requestId,
  residentId,
  residentName,
  documentType,
  emailAddress,
}) {
  const normalizedEmail = String(emailAddress || "").trim().toLowerCase();
  const { subject, text } = buildReadyForPickupEmail({ residentName, documentType });

  if (!normalizedEmail) {
    const error = "Missing resident email address.";
    await logEmailAttempt({
      requestId,
      residentId,
      emailAddress: null,
      subject,
      message: text,
      status: "failed",
      errorMessage: error,
    });
    return { attempted: true, success: false, error };
  }

  if (!isValidEmail(normalizedEmail)) {
    const error = "Invalid resident email address.";
    await logEmailAttempt({
      requestId,
      residentId,
      emailAddress: normalizedEmail,
      subject,
      message: text,
      status: "failed",
      errorMessage: error,
    });
    return { attempted: true, success: false, error };
  }

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"Barangay 160" <${process.env.SMTP_USER}>`,
      to: normalizedEmail,
      subject,
      text,
    });

    await logEmailAttempt({
      requestId,
      residentId,
      emailAddress: normalizedEmail,
      subject,
      message: text,
      status: "sent",
    });

    return { attempted: true, success: true };
  } catch (error) {
    await logEmailAttempt({
      requestId,
      residentId,
      emailAddress: normalizedEmail,
      subject,
      message: text,
      status: "failed",
      errorMessage: error.message,
    });

    return { attempted: true, success: false, error: error.message };
  }
}

async function sendRequestRejectedEmail({
  requestId,
  residentId,
  residentName,
  documentType,
  reason,
  emailAddress,
}) {
  const normalizedEmail = String(emailAddress || "").trim().toLowerCase();
  const cleanReason = String(reason || "").trim();
  const { subject, text } = buildRequestRejectedEmail({
    residentName,
    documentType,
    reason: cleanReason,
  });

  if (!normalizedEmail) {
    const error = "Missing resident email address.";
    await logEmailAttempt({
      requestId,
      residentId,
      emailAddress: null,
      subject,
      message: text,
      status: "failed",
      errorMessage: error,
    });
    return { attempted: true, success: false, error };
  }

  if (!isValidEmail(normalizedEmail)) {
    const error = "Invalid resident email address.";
    await logEmailAttempt({
      requestId,
      residentId,
      emailAddress: normalizedEmail,
      subject,
      message: text,
      status: "failed",
      errorMessage: error,
    });
    return { attempted: true, success: false, error };
  }

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"Barangay 160" <${process.env.SMTP_USER}>`,
      to: normalizedEmail,
      subject,
      text,
    });

    await logEmailAttempt({
      requestId,
      residentId,
      emailAddress: normalizedEmail,
      subject,
      message: text,
      status: "sent",
    });

    return { attempted: true, success: true };
  } catch (error) {
    await logEmailAttempt({
      requestId,
      residentId,
      emailAddress: normalizedEmail,
      subject,
      message: text,
      status: "failed",
      errorMessage: error.message,
    });

    return { attempted: true, success: false, error: error.message };
  }
}

async function sendReturnForCompletionEmail({
  requestId,
  residentId,
  residentName,
  documentType,
  reason,
  emailAddress,
}) {
  const normalizedEmail = String(emailAddress || "").trim().toLowerCase();
  const cleanReason = String(reason || "").trim();
  const { subject, text } = buildReturnForCompletionEmail({
    residentName,
    documentType,
    reason: cleanReason,
  });

  if (!normalizedEmail) {
    const error = "Missing resident email address.";
    await logEmailAttempt({
      requestId,
      residentId,
      emailAddress: null,
      subject,
      message: text,
      status: "failed",
      errorMessage: error,
    });
    return { attempted: true, success: false, error };
  }

  if (!isValidEmail(normalizedEmail)) {
    const error = "Invalid resident email address.";
    await logEmailAttempt({
      requestId,
      residentId,
      emailAddress: normalizedEmail,
      subject,
      message: text,
      status: "failed",
      errorMessage: error,
    });
    return { attempted: true, success: false, error };
  }

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"Barangay 160" <${process.env.SMTP_USER}>`,
      to: normalizedEmail,
      subject,
      text,
    });

    await logEmailAttempt({
      requestId,
      residentId,
      emailAddress: normalizedEmail,
      subject,
      message: text,
      status: "sent",
    });

    return { attempted: true, success: true };
  } catch (error) {
    await logEmailAttempt({
      requestId,
      residentId,
      emailAddress: normalizedEmail,
      subject,
      message: text,
      status: "failed",
      errorMessage: error.message,
    });

    return { attempted: true, success: false, error: error.message };
  }
}

module.exports = {
  sendReadyForPickupEmail,
  sendRequestRejectedEmail,
  sendReturnForCompletionEmail,
};
