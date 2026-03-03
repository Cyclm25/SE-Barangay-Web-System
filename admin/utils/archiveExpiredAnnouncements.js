/**
 * Announcement Expiration Archiver
 * 
 * This utility can be run periodically to archive expired announcements
 * 
 * Usage:
 * - Run directly: node archiveExpiredAnnouncements.js
 * - Or call via API: GET /api/announcements/archive-expired
 * - Or set up a cron job to run this periodically
 */

const pool = require('../db');

/**
 * Archive all expired announcements
 */
async function archiveExpiredAnnouncements() {
  const client = await pool.connect();

  try {
    console.log('[Announcement Expiration] Checking for expired announcements...');

    const now = new Date().toISOString();

    // Find all announcements that are expired
    const expired = await client.query(
      `
      SELECT "AnnouncementID", "Title", "ExpirationDate"
      FROM announcement
      WHERE "ExpirationDate" IS NOT NULL
        AND "ExpirationDate" <= $1
        AND "Status" != 'Archived'
      `,
      [now]
    );

    if (expired.rowCount === 0) {
      console.log('[Announcement Expiration] No expired announcements found.');
      return { archived: 0, announcements: [] };
    }

    console.log(`[Announcement Expiration] Found ${expired.rowCount} announcement(s) to archive.`);

    // Update all matching announcements
    const result = await client.query(
      `
      UPDATE announcement
      SET "Status" = 'Archived'
      WHERE "ExpirationDate" IS NOT NULL
        AND "ExpirationDate" <= $1
        AND "Status" != 'Archived'
      RETURNING "AnnouncementID", "Title", "ExpirationDate"
      `,
      [now]
    );

    console.log(`[Announcement Expiration] ✅ Archived ${result.rowCount} announcement(s):`);
    result.rows.forEach((row) => {
      console.log(`  - ${row.Title} (ID: ${row.AnnouncementID}) expired at ${row.ExpirationDate}`);
    });

    return {
      archived: result.rowCount,
      announcements: result.rows,
    };
  } catch (err) {
    console.error('[Announcement Expiration] Error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  archiveExpiredAnnouncements()
    .then(() => {
      console.log('[Announcement Expiration] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Announcement Expiration] Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { archiveExpiredAnnouncements };
