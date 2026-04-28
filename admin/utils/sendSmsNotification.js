const pool = require("../db");

const SMS_LOG_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS sms_notification_log (
    "SmsLogID" SERIAL PRIMARY KEY,
    "RequestID" INTEGER,
    "ResidentID" VARCHAR(20),
    "PhoneNumber" VARCHAR(30),
    "Provider" VARCHAR(50) NOT NULL,
    "Message" TEXT NOT NULL,
    "Status" VARCHAR(20) NOT NULL,
    "ErrorMessage" TEXT,
    "ProviderMessageId" VARCHAR(120),
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
  );
`;

let smsLogTableReady = false;

async function ensureSmsLogTable() {
  if (smsLogTableReady) return;
  await pool.query(SMS_LOG_TABLE_SQL);
  smsLogTableReady = true;
}

function normalizePhilippineMobileNumber(rawNumber) {
  const digits = String(rawNumber || "").replace(/\D/g, "");

  if (!digits) return null;
  if (digits.startsWith("63") && digits.length === 12) return digits;
  if (digits.startsWith("09") && digits.length === 11) return `63${digits.slice(1)}`;
  if (digits.startsWith("9") && digits.length === 10) return `63${digits}`;

  return null;
}

function buildReadyForPickupSms({ residentName, documentType }) {
  return `Good day, ${residentName}. Your requested document ${documentType} is now ready for pickup at Barangay 160. Please bring a valid ID. Thank you.`;
}

async function logSmsAttempt({
  requestId,
  residentId,
  phoneNumber,
  provider,
  message,
  status,
  errorMessage = null,
  providerMessageId = null,
}) {
  await ensureSmsLogTable();

  await pool.query(
    `INSERT INTO sms_notification_log
      ("RequestID","ResidentID","PhoneNumber","Provider","Message","Status","ErrorMessage","ProviderMessageId")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      requestId,
      residentId,
      phoneNumber,
      provider,
      message,
      status,
      errorMessage,
      providerMessageId,
    ]
  );
}

async function sendSemaphoreSms({ phoneNumber, message }) {
  const apiKey = process.env.SEMAPHORE_API_KEY;
  const senderName = process.env.SEMAPHORE_SENDER_NAME;

  if (!apiKey) {
    throw new Error("Missing SEMAPHORE_API_KEY environment variable.");
  }

  const params = new URLSearchParams();
  params.append("apikey", apiKey);
  params.append("number", phoneNumber);
  params.append("message", message);
  if (senderName) {
    params.append("sendername", senderName);
  }

  const response = await fetch("https://api.semaphore.co/api/v4/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  });

  const rawText = await response.text();
  let data;

  try {
    data = JSON.parse(rawText);
  } catch {
    data = rawText;
  }

  if (!response.ok) {
    const errorMessage =
      Array.isArray(data) && data[0]?.message
        ? data[0].message
        : typeof data === "object" && data?.message
        ? data.message
        : `Semaphore SMS request failed with HTTP ${response.status}`;
    throw new Error(errorMessage);
  }

  const messageId = Array.isArray(data) ? data[0]?.message_id || null : null;
  return { provider: "Semaphore", providerMessageId: messageId, raw: data };
}

async function sendReadyForPickupSms({
  requestId,
  residentId,
  residentName,
  documentType,
  rawPhoneNumber,
}) {
  const normalizedPhone = normalizePhilippineMobileNumber(rawPhoneNumber);
  const message = buildReadyForPickupSms({ residentName, documentType });
  const provider = "Semaphore";

  if (!normalizedPhone) {
    const error = "Missing or invalid resident mobile number.";
    await logSmsAttempt({
      requestId,
      residentId,
      phoneNumber: rawPhoneNumber || null,
      provider,
      message,
      status: "failed",
      errorMessage: error,
    });

    return {
      attempted: true,
      success: false,
      provider,
      error,
    };
  }

  try {
    const smsResult = await sendSemaphoreSms({
      phoneNumber: normalizedPhone,
      message,
    });

    await logSmsAttempt({
      requestId,
      residentId,
      phoneNumber: normalizedPhone,
      provider,
      message,
      status: "sent",
      providerMessageId: smsResult.providerMessageId,
    });

    return {
      attempted: true,
      success: true,
      provider,
      providerMessageId: smsResult.providerMessageId,
    };
  } catch (error) {
    await logSmsAttempt({
      requestId,
      residentId,
      phoneNumber: normalizedPhone,
      provider,
      message,
      status: "failed",
      errorMessage: error.message,
    });

    return {
      attempted: true,
      success: false,
      provider,
      error: error.message,
    };
  }
}

module.exports = {
  sendReadyForPickupSms,
};
