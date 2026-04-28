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
