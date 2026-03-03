-- Migration: Add scheduled announcement support
-- This adds columns to track when an announcement should be published/scheduled

ALTER TABLE announcement
ADD COLUMN IF NOT EXISTS "IsScheduled" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "ScheduledPublishDate" TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS "PublishedDate" TIMESTAMP NULL;

-- Add comments for clarity
COMMENT ON COLUMN announcement."IsScheduled" IS 'Indicates if the announcement is scheduled for future publishing';
COMMENT ON COLUMN announcement."ScheduledPublishDate" IS 'The date and time when the announcement should be automatically published';
COMMENT ON COLUMN announcement."PublishedDate" IS 'The actual date and time when the announcement was published';
