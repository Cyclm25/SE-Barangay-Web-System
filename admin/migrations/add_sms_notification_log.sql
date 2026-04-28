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
