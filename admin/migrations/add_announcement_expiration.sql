-- Migration: Add announcement expiration support
-- This adds columns to track when an announcement expires and should be archived

ALTER TABLE announcement
ADD COLUMN IF NOT EXISTS "ExpirationDate" TIMESTAMP NULL;

-- Add comment for clarity
COMMENT ON COLUMN announcement."ExpirationDate" IS 'The date and time when the announcement should be automatically archived and hidden from residents';
