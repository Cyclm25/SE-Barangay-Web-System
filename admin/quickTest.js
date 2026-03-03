/**
 * Quick test of announcements query
 */

const pool = require('./db');

async function testQuery() {
  try {
    console.log('🧪 Testing announcements query...\n');
    
    const result = await pool.query('SELECT * FROM announcement ORDER BY "CreatedAt" DESC');
    
    console.log('✅ Query successful!');
    console.log(`📊 Found ${result.rows.length} announcements:\n`);
    
    result.rows.forEach((ann, i) => {
      console.log(`${i + 1}. ID: ${ann.AnnouncementID} | Title: ${ann.Title} | Status: ${ann.Status}`);
      console.log(`   IsScheduled: ${ann.IsScheduled} | ExpirationDate: ${ann.ExpirationDate}\n`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

testQuery();
