/**
 * Test Script: Create Announcement with Scheduling and Expiration
 * 
 * This script creates test announcements to verify the scheduling and expiration features work
 * 
 * Usage: node testAnnouncements.js
 */

const pool = require('./db');

async function createTestAnnouncements() {
  const client = await pool.connect();

  try {
    console.log('🧪 Creating test announcements...\n');

    // Test 1: Create an announcement scheduled for 5 minutes from now
    const futureDate = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    const expirationDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    console.log(`📅 Test 1: Scheduled announcement (will publish in 5 minutes)`);
    console.log(`   Scheduled for: ${futureDate.toISOString()}\n`);

    const result1 = await client.query(
      `
      INSERT INTO announcement
        ("Title","Body","PostedByRole","PostedByID","Category","Status","CreatedAt","IsScheduled","ScheduledPublishDate","ExpirationDate")
      VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7,$8,$9)
      RETURNING "AnnouncementID", "Title", "Status", "IsScheduled", "ScheduledPublishDate", "ExpirationDate"
      `,
      [
        "Test Scheduled Announcement",
        "This is a test announcement that will be published automatically in 5 minutes.",
        "SuperAdmin",
        "SA20260001",
        "All",
        "Drafts",
        true,
        futureDate.toISOString(),
        expirationDate.toISOString(),
      ]
    );

    console.log('✅ Created:');
    console.log(`   ID: ${result1.rows[0].AnnouncementID}`);
    console.log(`   Title: ${result1.rows[0].Title}`);
    console.log(`   Status: ${result1.rows[0].Status}`);
    console.log(`   IsScheduled: ${result1.rows[0].IsScheduled}`);
    console.log(`   ScheduledPublishDate: ${result1.rows[0].ScheduledPublishDate}`);
    console.log(`   ExpirationDate: ${result1.rows[0].ExpirationDate}\n`);

    // Test 2: Create an announcement that's already expired
    const pastDate = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

    console.log(`📅 Test 2: Announcement with past expiration (should be archived)`);
    console.log(`   Expired: ${pastDate.toISOString()}\n`);

    const result2 = await client.query(
      `
      INSERT INTO announcement
        ("Title","Body","PostedByRole","PostedByID","Category","Status","CreatedAt","ExpirationDate")
      VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7)
      RETURNING "AnnouncementID", "Title", "Status", "ExpirationDate"
      `,
      [
        "Test Expired Announcement",
        "This announcement is already expired and should be archived.",
        "SuperAdmin",
        "SA20260001",
        "All",
        "Active",
        pastDate.toISOString(),
      ]
    );

    console.log('✅ Created:');
    console.log(`   ID: ${result2.rows[0].AnnouncementID}`);
    console.log(`   Title: ${result2.rows[0].Title}`);
    console.log(`   Status: ${result2.rows[0].Status}`);
    console.log(`   ExpirationDate: ${result2.rows[0].ExpirationDate}\n`);

    console.log('📝 Next Steps:');
    console.log('1. Restart the server: npm start (or node index.js)');
    console.log('2. Wait for automatic scheduler to run (checks every 5 minutes)');
    console.log('3. Or manually call:');
    console.log('   - GET /api/announcements/publish-scheduled');
    console.log('   - GET /api/announcements/archive-expired\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

createTestAnnouncements()
  .then(() => {
    console.log('✅ Done!\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nFatal error:', err);
    process.exit(1);
  });
