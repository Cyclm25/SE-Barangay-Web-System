## Scheduled Announcements Feature Guide

This guide explains how to use the scheduled announcements feature to automatically publish announcements at a specific date and time.

### 📋 Database Setup

Run the migration to add the necessary columns:

```sql
ALTER TABLE announcement
ADD COLUMN IF NOT EXISTS "IsScheduled" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "ScheduledPublishDate" TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS "PublishedDate" TIMESTAMP NULL;
```

### 🎯 How It Works

1. **Create a Scheduled Announcement**
   - Go to Announcements Management
   - Click "Add New Announcement"
   - Fill in Title, Content, Images, Target Audience
   - Check "Schedule this announcement for later"
   - Select Date and Time when you want it published
   - Click "Schedule Announcement"

2. **The Announcement is Saved as Draft**
   - Scheduled announcements are saved as "Drafts"
   - They won't be visible to residents until the scheduled time arrives
   - You can see a "📅 Scheduled" badge on the card

3. **Automatic Publishing**
   - Call the publishing endpoint to check and publish ready announcements
   - This can be done manually or set up as a recurring task

### 🚀 Publishing Scheduled Announcements

#### Option 1: Manual API Call
```bash
GET /api/announcements/publish-scheduled
```

Response:
```json
{
  "message": "Published 2 scheduled announcement(s)",
  "published": 2,
  "announcements": [...]
}
```

#### Option 2: Run Node Script
```bash
cd admin
node utils/publishScheduledAnnouncements.js
```

#### Option 3: Set Up Cron Job (Recommended)

For **Linux/Mac**, add to crontab:
```bash
# Run every 5 minutes
*/5 * * * * cd /path/to/admin && node utils/publishScheduledAnnouncements.js

# Or run every hour
0 * * * * cd /path/to/admin && node utils/publishScheduledAnnouncements.js
```

For **Windows Task Scheduler**:
1. Open Task Scheduler
2. Create Basic Task
3. Set Trigger: Repeat every 5 minutes
4. Set Action: Start a program
5. Program: `node.exe`
6. Arguments: `utils\publishScheduledAnnouncements.js`
7. Start in: `C:\path\to\admin`

#### Option 4: Use npm package `node-cron`

Install:
```bash
npm install node-cron
```

Create a file `admin/cron/announcementScheduler.js`:
```javascript
const cron = require('node-cron');
const { publishScheduledAnnouncements } = require('../utils/publishScheduledAnnouncements');

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    await publishScheduledAnnouncements();
  } catch (err) {
    console.error('Cron error:', err);
  }
});

console.log('Announcement scheduler started. Running every 5 minutes.');
```

Then in your `admin/index.js` or main server file, add:
```javascript
require('./cron/announcementScheduler');
```

### 📅 Example Usage

**Scenario**: You want to announce a community event scheduled for March 10, 2026

1. **Today (March 3, 2026)**
   - Create announcement with event details
   - Enable "Schedule this announcement for later"
   - Set Date: March 10, 2026
   - Set Time: 08:00 (8:00 AM)
   - Click "Schedule Announcement"

2. **Result**
   - Announcement saved as Draft
   - Badge shows "📅 Scheduled"
   - Won't appear to residents yet

3. **March 10, 2026 at 8:00 AM**
   - Cron job runs publishScheduledAnnouncements()
   - Status changes from "Drafts" to "Active"
   - PublishedDate is set to current time
   - Announcement now visible to all residents

### 🔄 Fields Explained

| Field | Type | Description |
|-------|------|-------------|
| `IsScheduled` | Boolean | Whether this announcement is scheduled |
| `ScheduledPublishDate` | Timestamp | When to publish (in UTC) |
| `PublishedDate` | Timestamp | When it was actually published |
| `Status` | String | "Active" (published) or "Drafts" (not yet) |

### ✨ Features

- Set exact date and time for publication
- Automatic publishing based on system time
- Visual indicators for scheduled announcements
- Drafts hidden from residents until published
- Works with all announcement features (images, target audience, etc.)
- Time zone support (currently UTC, can be adjusted)

### 🛠️ Troubleshooting

**Announcement not publishing?**
- Check if cron job is running
- Verify server time is correct
- Call `/api/announcements/publish-scheduled` manually
- Check database for scheduled announcement with past `ScheduledPublishDate`

**Timezone issues?**
- Times are stored in UTC
- Frontend shows local time
- Adjust in `publishScheduledAnnouncements.js` if needed

**Want to change scheduled time?**
- Edit the announcement (currently manual SQL required)
- Or create a new endpoint for updating scheduled announcements

### 📝 API Reference

#### Get All Announcements (Admin)
```
GET /api/announcements
Returns: All announcements including scheduled ones
```

#### Get Visible Announcements (Resident)
```
GET /api/announcements/resident
Returns: Only "Active" announcements (excludes scheduled/drafts)
```

#### Publish Scheduled Announcements
```
GET /api/announcements/publish-scheduled
Returns: { message, published, announcements }
```

#### Create Announcement
```
POST /api/announcements
Body: {
  title: string,
  body: string,
  status: "posted" | "draft",
  targetAudience: string,
  postedByRole: string,
  postedById: string,
  isScheduled: boolean,          // NEW
  scheduledPublishDate: string   // NEW - ISO timestamp
}
```
