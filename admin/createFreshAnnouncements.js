/**
 * Create Fresh Test Announcements
 * 
 * This script creates new test announcements with proper dates for testing
 */

const pool = require('./db');

async function createFreshAnnouncements() {
  const client = await pool.connect();

  try {
    console.log('🧹 Cleaning up old test announcements...\n');

    // Delete old test announcements
    await client.query('DELETE FROM announcement WHERE "Title" LIKE $1', ['Test%']);
    console.log('✅ Deleted old test announcements\n');

    console.log('📝 Creating fresh test announcements...\n');

    // Test 1: Active announcement with no expiration
    const result1 = await client.query(
      `INSERT INTO announcement
        ("Title","Body","PostedByRole","PostedByID","Category","Status","CreatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,NOW())
      RETURNING "AnnouncementID", "Title", "Status"`,
      [
        "Welcome to Community",
        "This is an active announcement that should be visible immediately.",
        "SuperAdmin",
        "SA20260001",
        "All",
        "Active",
      ]
    );
    console.log(`✅ Created: "${result1.rows[0].Title}" (ID: ${result1.rows[0].AnnouncementID}, Status: ${result1.rows[0].Status})`);

    // Test 2: Active announcement with future expiration
    const futureDate = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
    const result2 = await client.query(
      `INSERT INTO announcement
        ("Title","Body","PostedByRole","PostedByID","Category","Status","CreatedAt","ExpirationDate")
      VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7)
      RETURNING "AnnouncementID", "Title", "Status", "ExpirationDate"`,
      [
        "Limited Time Announcement",
        "This announcement will expire in 30 minutes.",
        "SuperAdmin",
        "SA20260001",
        "All",
        "Active",
        futureDate.toISOString(),
      ]
    );
    console.log(`✅ Created: "${result2.rows[0].Title}" (expires in 30 mins)`);

    // Test 3: Draft announcement
    const result3 = await client.query(
      `INSERT INTO announcement
        ("Title","Body","PostedByRole","PostedByID","Category","Status","CreatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,NOW())
      RETURNING "AnnouncementID", "Title", "Status"`,
      [
        "Draft Announcement",
        "This announcement is a work in progress.",
        "SuperAdmin",
        "SA20260001",
        "All",
        "Drafts",
      ]
    );
    console.log(`✅ Created: "${result3.rows[0].Title}" (Status: ${result3.rows[0].Status})`);

    // Test 4: Scheduled announcement (future)
    const scheduledDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    const result4 = await client.query(
      `INSERT INTO announcement
        ("Title","Body","PostedByRole","PostedByID","Category","Status","CreatedAt","IsScheduled","ScheduledPublishDate")
      VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7,$8)
      RETURNING "AnnouncementID", "Title", "Status", "IsScheduled", "ScheduledPublishDate"`,
      [
        "Scheduled Announcement",
        "This announcement will be published automatically in 10 minutes.",
        "SuperAdmin",
        "SA20260001",
        "All",
        "Drafts",
        true,
        scheduledDate.toISOString(),
      ]
    );
    console.log(`✅ Created: "${result4.rows[0].Title}" (scheduled for ${scheduledDate.toLocaleTimeString()})`);

    console.log('\n✅ All test announcements created successfully!');
    console.log('\n📍 What to expect:');
    console.log('   1. "Welcome to Community" - Should appear in Active tab');
    console.log('   2. "Limited Time Announcement" - Should appear in Active tab (30 min expiry)');
    console.log('   3. "Draft Announcement" - Should appear in Draft tab');
    console.log('   4. "Scheduled Announcement" - Should appear in Draft tab, then Active in 10 mins\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

createFreshAnnouncements()
  .then(() => {
    console.log('✅ Done!\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nFatal error:', err);
    process.exit(1);
  });
