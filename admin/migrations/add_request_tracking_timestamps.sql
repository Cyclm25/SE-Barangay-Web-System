-- Migration: Add request tracking timestamps
-- This script adds columns to track when a request is picked up and when it's completed

-- Add new columns to the request table
ALTER TABLE request
ADD COLUMN IF NOT EXISTS "PickupDate" TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS "CompletionDate" TIMESTAMP NULL;

-- Add comments for clarity
COMMENT ON COLUMN request."PickupDate" IS 'Timestamp when the request was picked up (set when status changes to Picked Up or Ready for Pickup)';
COMMENT ON COLUMN request."CompletionDate" IS 'Timestamp when the request was completed (set when status changes to Completed)';
