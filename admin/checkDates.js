const pool = require('./db');

async function checkDates() {
  try {
    const result = await pool.query(`
      SELECT "AnnouncementID", "Title", "ScheduledPublishDate", "ExpirationDate", "IsScheduled"
      FROM announcement 
      WHERE "IsScheduled" = true 
      ORDER BY "CreatedAt" DESC 
      LIMIT 5
    `);
    
    console.log('=== Scheduled Announcements in Database ===\n');
    
    for (const row of result.rows) {
      console.log(`Title: ${row.Title}`);
      console.log(`  Raw ScheduledPublishDate: ${row.ScheduledPublishDate}`);
      console.log(`  Raw ExpirationDate: ${row.ExpirationDate}`);
      
      if (row.ScheduledPublishDate) {
        const d = new Date(row.ScheduledPublishDate);
        console.log(`  Scheduled as Date object: ${d.toISOString()}`);
        console.log(`  Displayed in PH Time: ${d.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`);
      }
      console.log('');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkDates();
