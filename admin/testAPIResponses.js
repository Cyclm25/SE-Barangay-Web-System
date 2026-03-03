/**
 * Test API responses for debugging
 */

const http = require('http');

function testAnnouncementsAPI() {
  console.log('\n🧪 Testing /api/announcements endpoint:\n');

  http.get('http://localhost:5001/api/announcements', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      try {
        const json = JSON.parse(data);
        console.log('Count:', json.length);
        console.log('\nAnnouncements:');
        json.forEach((a, i) => {
          console.log(`\n${i+1}. Title: ${a.Title}`);
          console.log(`   ID: ${a.AnnouncementID}`);
          console.log(`   Status: ${a.Status} (should be "Active" or "Drafts")`);
          console.log(`   IsScheduled: ${a.IsScheduled}`);
          console.log(`   ExpirationDate: ${a.ExpirationDate}`);
        });
      } catch (e) {
        console.log('ERROR parsing JSON:', e.message);
        console.log('Response:', data.substring(0, 500));
      }
      process.exit(0);
    });
  }).on('error', err => {
    console.error('❌ Connection error:', err.message);
    process.exit(1);
  });
}

testAnnouncementsAPI();
