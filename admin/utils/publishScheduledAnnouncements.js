async function publishScheduledAnnouncements() {
  const client = await pool.connect();

  try {
    console.log(`[Scheduled Announcements] Running check at ${new Date().toLocaleString('en-PH')}...`);

    // TASK A: Publish Drafts that reached their Scheduled Date
    // We use NOW() AT TIME ZONE 'Asia/Manila' to force Philippine time comparison
    const publishResult = await client.query(
      `
      UPDATE announcement
      SET "Status" = 'Active',
          "IsScheduled" = false,
          "PublishedDate" = NOW()
      WHERE "Status" = 'Drafts'
        AND "IsScheduled" = true
        AND "ScheduledPublishDate" <= NOW() AT TIME ZONE 'Asia/Manila'
      RETURNING "AnnouncementID", "Title";
      `
    );

    // TASK B: Archive Active posts that have reached their Expiry Date
    const archiveResult = await client.query(
      `
      UPDATE announcement
      SET "Status" = 'Archive'
      WHERE "Status" = 'Active'
        AND "ExpiryDate" IS NOT NULL
        AND "ExpiryDate" <= NOW() AT TIME ZONE 'Asia/Manila'
      RETURNING "AnnouncementID", "Title";
      `
    );

    // Logging results
    if (publishResult.rowCount > 0) console.log(`✅ Published: ${publishResult.rowCount} posts`);
    if (archiveResult.rowCount > 0) console.log(`📁 Archived: ${archiveResult.rowCount} posts`);

  } catch (err) {
    console.error('[Scheduled Announcements] Error:', err.message);
  } finally {
    client.release();
  }
}