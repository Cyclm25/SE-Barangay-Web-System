## Announcement Expiration Feature Guide

This guide explains how to use the announcement expiration feature to automatically archive announcements after a specified date.

### 📋 Database Setup

Run the migration to add the necessary columns:

```sql
ALTER TABLE announcement
ADD COLUMN IF NOT EXISTS "ExpirationDate" TIMESTAMP NULL;
```

### 🎯 How Expiration Works

1. **Set Expiration Date When Creating**
   - Go to Announcements Management
   - Click "Add New Announcement"
   - Fill in Title, Content, Images, Target Audience
   - Check "Set an expiration date for this announcement"
   - Select Date and Time when you want it archived
   - Click "Post Announcement" or "Schedule Announcement"

2. **Automated Archiving**
   - When the expiration time passes, the announcement is automatically archived
   - Residents can no longer see expired announcements
   - The announcement moves to the "Archived" tab
   - Expired badge "⏰ Expired" appears on the card

3. **Archive Expired Announcements**
   - Call the archiving endpoint to archive all expired announcements
   - This can be done manually or set up as a recurring task

### 🚀 Archiving Expired Announcements

#### Option 1: Manual API Call
```bash
GET /api/announcements/archive-expired
```

Response:
```json
{
  "message": "Archived 3 expired announcement(s)",
  "archived": 3,
  "announcements": [...]
}
```

#### Option 2: Run Node Script
```bash
cd admin
node utils/archiveExpiredAnnouncements.js
```

#### Option 3: Set Up Cron Job (Recommended)

For **Linux/Mac**, add to crontab:
```bash
# Run every hour
0 * * * * cd /path/to/admin && node utils/archiveExpiredAnnouncements.js

# Or every 30 minutes
*/30 * * * * cd /path/to/admin && node utils/archiveExpiredAnnouncements.js
```

For **Windows Task Scheduler**:
1. Open Task Scheduler
2. Create Basic Task
3. Set Trigger: Repeat every 30 minutes
4. Set Action: Start a program
5. Program: `node.exe`
6. Arguments: `utils\archiveExpiredAnnouncements.js`
7. Start in: `C:\path\to\admin`

#### Option 4: Integrate in Main Server (Best)

Add to your `admin/index.js`:
```javascript
const { archiveExpiredAnnouncements } = require('./utils/archiveExpiredAnnouncements');

// Check every hour
setInterval(() => {
  archiveExpiredAnnouncements().catch(err => console.error(err));
}, 60 * 60 * 1000); // 1 hour

// Or use node-cron for more control
const cron = require('node-cron');
cron.schedule('0 */1 * * *', async () => {
  await archiveExpiredAnnouncements();
});
```

### 📅 Example Usage

**Scenario**: You want to post a limited-time event announcement

1. **Today (March 3, 2026)**
   - Create announcement about "Spring Festival on March 15"
   - Check "Set an expiration date for this announcement"
   - Set Date: March 15, 2026
   - Set Time: 23:59 (11:59 PM)
   - Click "Post Announcement"

2. **Result**
   - Announcement visible to residents immediately
   - Shows "Expires: 03/15/2026" on the card
   - Visible in resident announcements

3. **March 15, 2026 at 11:59 PM**
   - Cron job runs archiveExpiredAnnouncements()
   - Status changes from "Active" to "Archived"
   - Announcement hidden from residents
   - Shows "⏰ Expired" badge
   - Moves to "Archived" tab for admins

### 📝 Poster Name Display

The system now automatically displays the actual name of who posted the announcement instead of just their ID:

- **Before**: "Posted by: SA20260001"
- **After**: "Posted by: John Dela Cruz"

This is pulled automatically from the BarangayAdmin or SuperAdmin table based on who created the announcement.

### 🔄 Combined Features

You can now use **scheduling + expiration** together!

Example: Post announcement only during certain dates
```
Scheduled to publish: March 10, 2026 at 8:00 AM
Set to expire: March 20, 2026 at 11:59 PM
```

The announcement will:
1. Be hidden (Draft) until March 10 at 8:00 AM
2. Appear to residents from March 10 - March 20
3. Automatically archive on March 20 at 11:59 PM

### 📊 Fields in Database

| Field | Type | Description |
|-------|------|-------------|
| `ExpirationDate` | Timestamp | When to archive (in UTC) |
| `PostedByName` | String (computed) | Name of who posted it |
| `Status` | String | "Active" or "Archived" |

### ✨ Features

- Set exact expiration date and time
- Automatic archiving based on system time
- Visual "⏰ Expired" badge on cards
- Shows "Expires: MM/DD/YYYY" in metadata
- Works with scheduled announcements
- Display actual poster names
- Supports all announcement features

### 🛠️ Troubleshooting

**Announcement not archiving?**
- Check if cron job is running
- Verify server time is correct
- Manually call `/api/announcements/archive-expired`
- Check database: SELECT * FROM announcement WHERE "ExpirationDate" IS NOT NULL

**Poster name showing as "Unknown"?**
- Verify the user exists in barangayadmin or superadmin table
- Check that PostedByRole and PostedByID are correct
- Call GET /api/announcements to see what's returned

**Timezone issues?**
- Times are stored in UTC
- Frontend shows local system time
- Adjust in `archiveExpiredAnnouncements.js` if needed

### 📝 API Changes

#### Create Announcement (Updated)
```
POST /api/announcements
Body: {
  title: string,
  body: string,
  status: "posted" | "draft",
  targetAudience: string,
  postedByRole: string,
  postedById: string,
  isScheduled: boolean,
  scheduledPublishDate: string,     // ISO timestamp
  expirationDate: string            // NEW - ISO timestamp
}
```

#### Get All Announcements (Updated)
```
GET /api/announcements
Returns: All announcements with "PostedByName" field
```

#### Get Active Announcements (Updated)
```
GET /api/announcements/resident
Returns: Only active, non-expired announcements with "PostedByName"
```

#### Archive Expired Announcements (New)
```
GET /api/announcements/archive-expired
Returns: { message, archived, announcements }
```

### 🎓 Best Practices

1. **Set realistic expiration dates** - Give enough time for announcements to be read
2. **Use with schedules** - Combine scheduling and expiration for time-limited offers
3. **Run archiver regularly** - Set up cron job or integrate into server startup
4. **Check announcements frequently** - Monitor what's being shown to residents
5. **Use target audience** - Combine with categories for better organization
