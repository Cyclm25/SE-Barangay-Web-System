/**
 * Check and Apply Announcement Migrations
 * 
 * Usage: node checkAndApplyMigrations.js
 * 
 * This script will check if the required columns exist and add them if they don't
 */

const pool = require('./db');

async function checkAndApplyMigrations() {
  const client = await pool.connect();

  try {
    console.log('🔍 Checking announcement table schema...\n');

    // Check which columns exist
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'announcement'
      ORDER BY ordinal_position;
    `);

    const columns = columnCheck.rows.map(row => row.column_name);
    console.log('📋 Current columns in announcement table:');
    columns.forEach(col => console.log(`   - ${col}`));
    console.log();

    // Check for required columns
    const requiredColumns = {
      'IsScheduled': 'BOOLEAN DEFAULT FALSE',
      'ScheduledPublishDate': 'TIMESTAMP NULL',
      'PublishedDate': 'TIMESTAMP NULL',
      'ExpirationDate': 'TIMESTAMP NULL'
    };

    const missingColumns = Object.keys(requiredColumns).filter(col => !columns.includes(col));

    if (missingColumns.length === 0) {
      console.log('✅ All required columns already exist!');
      return;
    }

    console.log(`⚠️  Missing ${missingColumns.length} column(s). Adding them now...\n`);

    // Add missing columns
    for (const [column, dataType] of Object.entries(requiredColumns)) {
      if (!columns.includes(column)) {
        console.log(`   Adding column: ${column}...`);
        await client.query(`
          ALTER TABLE announcement
          ADD COLUMN IF NOT EXISTS "${column}" ${dataType};
        `);
        console.log(`   ✅ Added ${column}`);
      }
    }

    console.log('\n✅ All migrations applied successfully!');
    console.log('\n🎉 Your announcement table is now ready for scheduling and expiration!');

  } catch (err) {
    console.error('❌ Error applying migrations:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Run migrations
checkAndApplyMigrations()
  .then(() => {
    console.log('\nDone!\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nFatal error:', err);
    process.exit(1);
  });
