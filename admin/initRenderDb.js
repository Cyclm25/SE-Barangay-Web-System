const bcrypt = require("bcrypt");
const pool = require("./db");

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS superadmin (
        "SuperAdminID" VARCHAR(20) PRIMARY KEY,
        "Password" TEXT
      );

      CREATE TABLE IF NOT EXISTS barangayadmin (
        "BarangayAdminID" VARCHAR(20) PRIMARY KEY,
        "AdminName" VARCHAR(100),
        "Position" VARCHAR(50),
        "Email" VARCHAR(100) UNIQUE,
        "ContactNumber" VARCHAR(20),
        "Password" TEXT,
        "Status" BOOLEAN DEFAULT TRUE,
        "DateCreated" TIMESTAMP DEFAULT NOW(),
        "SuperAdminID" VARCHAR(20) REFERENCES superadmin("SuperAdminID") ON DELETE SET NULL,
        "TermStart" DATE,
        "TermEnd" DATE,
        "ProfileImage" TEXT
      );

      CREATE TABLE IF NOT EXISTS resident (
        "ResidentID" VARCHAR(20) PRIMARY KEY,
        "LastName" VARCHAR(50),
        "FirstName" VARCHAR(50),
        "MiddleName" VARCHAR(50),
        "Suffix" VARCHAR(20),
        "Birthday" DATE,
        "Age" INTEGER,
        "Gender" VARCHAR(20),
        "CivilStatus" VARCHAR(30),
        "HouseNumber" VARCHAR(30),
        "StreetAddress" VARCHAR(150),
        "Barangay" VARCHAR(100),
        "City" VARCHAR(100),
        "Province" VARCHAR(100),
        "ContactNumber" VARCHAR(20),
        "Email" VARCHAR(100),
        "FatherName" VARCHAR(150),
        "MotherName" VARCHAR(150),
        "SpouseName" VARCHAR(150),
        "NoOfChildren" INTEGER DEFAULT 0,
        "ContactPerson" VARCHAR(150),
        "ContactPersonNo" VARCHAR(20),
        "ContactPersonAddress" TEXT,
        "BarangayCard" TEXT,
        "ResidentType" VARCHAR(50),
        "VoterStatus" BOOLEAN,
        "Password" TEXT,
        "ProfileImage" TEXT,
        "Religion" VARCHAR(100),
        "Nationality" VARCHAR(100),
        "ZipCode" VARCHAR(20),
        "DateRegistered" TIMESTAMP DEFAULT NOW(),
        "DateCreated" TIMESTAMP DEFAULT NOW(),
        "status" VARCHAR(20) DEFAULT 'Active',
        "ResidentAccountID" INTEGER
      );

      ALTER TABLE resident
        ADD COLUMN IF NOT EXISTS "FatherName" VARCHAR(150),
        ADD COLUMN IF NOT EXISTS "MotherName" VARCHAR(150),
        ADD COLUMN IF NOT EXISTS "SpouseName" VARCHAR(150),
        ADD COLUMN IF NOT EXISTS "NoOfChildren" INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "ContactPerson" VARCHAR(150),
        ADD COLUMN IF NOT EXISTS "ContactPersonNo" VARCHAR(20),
        ADD COLUMN IF NOT EXISTS "ContactPersonAddress" TEXT,
        ADD COLUMN IF NOT EXISTS "BarangayCard" TEXT,
        ADD COLUMN IF NOT EXISTS "ProfileImage" TEXT,
        ADD COLUMN IF NOT EXISTS "Religion" VARCHAR(100),
        ADD COLUMN IF NOT EXISTS "Nationality" VARCHAR(100),
        ADD COLUMN IF NOT EXISTS "City" VARCHAR(100),
        ADD COLUMN IF NOT EXISTS "Province" VARCHAR(100),
        ADD COLUMN IF NOT EXISTS "ZipCode" VARCHAR(20),
        ADD COLUMN IF NOT EXISTS "DateRegistered" TIMESTAMP DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS "DateCreated" TIMESTAMP DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'Active',
        ADD COLUMN IF NOT EXISTS "ResidentAccountID" INTEGER;

      CREATE TABLE IF NOT EXISTS residentaccount (
        "ResidentAccountID" SERIAL PRIMARY KEY,
        "ResidentID" VARCHAR(20) REFERENCES resident("ResidentID") ON DELETE CASCADE,
        "BarangayAdminID" VARCHAR(20) REFERENCES barangayadmin("BarangayAdminID") ON DELETE CASCADE,
        "SuperAdminID" VARCHAR(20) REFERENCES superadmin("SuperAdminID") ON DELETE CASCADE,
        "Password" TEXT NOT NULL,
        "Role" VARCHAR(50),
        "status" VARCHAR(20) DEFAULT 'Active'
      );

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'resident_residentaccount_fk'
        ) THEN
          ALTER TABLE resident
          ADD CONSTRAINT resident_residentaccount_fk
          FOREIGN KEY ("ResidentAccountID")
          REFERENCES residentaccount("ResidentAccountID")
          ON DELETE SET NULL
          DEFERRABLE INITIALLY DEFERRED;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS request (
        "RequestID" SERIAL PRIMARY KEY,
        "ResidentID" VARCHAR(20) REFERENCES resident("ResidentID") ON DELETE SET NULL,
        "RequestDate" TIMESTAMP DEFAULT NOW(),
        "RequestType" VARCHAR(100),
        "RequestStatus" VARCHAR(50) DEFAULT 'Pending',
        "RequestPurpose" TEXT,
        "PickupDate" TIMESTAMP,
        "CompletionDate" TIMESTAMP,
        "RejectionReason" TEXT,
        "ReceiverName" VARCHAR(150),
        "CreatedAt" TIMESTAMP DEFAULT NOW(),
        "UpdatedAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS transaction_history (
        "TransactionID" SERIAL PRIMARY KEY,
        "RequestID" INTEGER REFERENCES request("RequestID") ON DELETE SET NULL,
        "ResidentID" VARCHAR(20),
        "Action" VARCHAR(100),
        "RequestStatus" VARCHAR(50),
        "RequestType" VARCHAR(100),
        "RequestPurpose" TEXT,
        "CreatedAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS announcement (
        "AnnouncementID" SERIAL PRIMARY KEY,
        "Title" VARCHAR(200),
        "Body" TEXT,
        "Content" TEXT,
        "Description" TEXT,
        "Category" TEXT[] DEFAULT ARRAY['All']::text[],
        "Status" VARCHAR(50) DEFAULT 'Drafts',
        "TargetAudience" VARCHAR(100),
        "Image" TEXT,
        "Images" JSONB DEFAULT '[]'::jsonb,
        "PostedBy" VARCHAR(20),
        "PostedByID" VARCHAR(20),
        "PostedByRole" VARCHAR(50),
        "DateCreated" TIMESTAMP DEFAULT NOW(),
        "CreatedAt" TIMESTAMP DEFAULT NOW(),
        "DatePosted" TIMESTAMP,
        "PublishedDate" TIMESTAMP,
        "IsPublished" BOOLEAN DEFAULT FALSE,
        "IsScheduled" BOOLEAN DEFAULT FALSE,
        "ScheduledPublishDate" TIMESTAMP,
        "ExpirationDate" TIMESTAMP,
        "ArchivedAt" TIMESTAMP
      );

      ALTER TABLE announcement
        ADD COLUMN IF NOT EXISTS "Body" TEXT,
        ADD COLUMN IF NOT EXISTS "PostedByID" VARCHAR(20),
        ADD COLUMN IF NOT EXISTS "CreatedAt" TIMESTAMP DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS "PublishedDate" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "IsPublished" BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "ScheduledPublishDate" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "ExpirationDate" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "ArchivedAt" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "Images" JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "IsScheduled" BOOLEAN DEFAULT FALSE;

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'announcement'
            AND column_name = 'Category'
            AND data_type <> 'ARRAY'
        ) THEN
          ALTER TABLE announcement
          ALTER COLUMN "Category" TYPE TEXT[]
          USING CASE
            WHEN "Category" IS NULL THEN ARRAY['All']::text[]
            ELSE ARRAY["Category"::text]
          END;
        END IF;
      END $$;

      ALTER TABLE announcement
        ALTER COLUMN "Category" SET DEFAULT ARRAY['All']::text[];

      CREATE TABLE IF NOT EXISTS notification (
        "NotificationID" SERIAL PRIMARY KEY,
        "RequestID" INTEGER REFERENCES request("RequestID") ON DELETE CASCADE,
        "ResidentID" VARCHAR(20),
        "SuperAdminID" VARCHAR(20),
        "BarangayAdminID" VARCHAR(20),
        "RecipientRole" VARCHAR(50),
        "RecipientID" VARCHAR(50),
        "NotificationType" VARCHAR(50),
        "NotificationDate" TIMESTAMP DEFAULT NOW(),
        "Message" TEXT,
        "IsRead" BOOLEAN DEFAULT FALSE,
        "CreatedAt" TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE notification
        ADD COLUMN IF NOT EXISTS "ResidentID" VARCHAR(20),
        ADD COLUMN IF NOT EXISTS "SuperAdminID" VARCHAR(20),
        ADD COLUMN IF NOT EXISTS "BarangayAdminID" VARCHAR(20),
        ADD COLUMN IF NOT EXISTS "RecipientRole" VARCHAR(50),
        ADD COLUMN IF NOT EXISTS "RecipientID" VARCHAR(50),
        ADD COLUMN IF NOT EXISTS "NotificationType" VARCHAR(50),
        ADD COLUMN IF NOT EXISTS "NotificationDate" TIMESTAMP DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS "Message" TEXT,
        ADD COLUMN IF NOT EXISTS "IsRead" BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "CreatedAt" TIMESTAMP DEFAULT NOW();

      CREATE TABLE IF NOT EXISTS email_notification_log (
        "EmailNotificationLogID" SERIAL PRIMARY KEY,
        "RequestID" INTEGER,
        "ResidentID" VARCHAR(20),
        "EmailAddress" VARCHAR(255),
        "Subject" TEXT,
        "Message" TEXT,
        "Status" VARCHAR(30),
        "ErrorMessage" TEXT,
        "CreatedAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sms_notification_log (
        "SmsNotificationLogID" SERIAL PRIMARY KEY,
        "RequestID" INTEGER,
        "ResidentID" VARCHAR(20),
        "PhoneNumber" VARCHAR(30),
        "Provider" VARCHAR(50),
        "Message" TEXT,
        "Status" VARCHAR(30),
        "ErrorMessage" TEXT,
        "ProviderMessageId" TEXT,
        "CreatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    const superAdminId = process.env.SUPER_ADMIN_ID || "SA20260001";
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || "super123";
    const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

    await client.query(
      `
      INSERT INTO superadmin ("SuperAdminID", "Password")
      VALUES ($1, $2)
      ON CONFLICT ("SuperAdminID")
      DO UPDATE SET "Password" = EXCLUDED."Password"
      `,
      [superAdminId, hashedPassword]
    );

    await client.query(
      `
      INSERT INTO residentaccount ("SuperAdminID", "Password", "Role")
      SELECT $1::varchar(20), $2::text, 'Super Admin'
      WHERE NOT EXISTS (
        SELECT 1
        FROM residentaccount
        WHERE "SuperAdminID" = $1::varchar(20)
          AND LOWER(REPLACE(TRIM(COALESCE("Role", '')), ' ', '')) = 'superadmin'
      )
      `,
      [superAdminId, hashedPassword]
    );

    await client.query("COMMIT");
    console.log("Render database initialized.");
    console.log(`Super Admin ID: ${superAdminId}`);
    console.log(
      "Super Admin password: value from SUPER_ADMIN_PASSWORD, or super123 if not set."
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Database initialization failed:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
