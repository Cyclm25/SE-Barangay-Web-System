# Barangay 160 Resident Portal - User Guide

## Overview
The Resident Portal is a comprehensive web application that allows residents of Barangay 160 to access community information, request documents, and manage their profile.

## Features

### 1. **Home Page - Announcements**
- View all barangay announcements with beautiful card layouts
- Filter announcements by tags:
  - Student
  - Senior Citizen
  - Events
- Click on any announcement card to view full details
- Each announcement includes:
  - Title
  - Featured image
  - Tags
  - Date
  - Requirements (when applicable)

### 2. **Announcement Details**
- Full announcement information with banner image
- Detailed description and event information
- List of requirements in a styled box
- Event details (date, time, location)
- Back button to return to home

### 3. **Services Page**
- Two main service categories:
  - **Barangay ID, Certificate / Indigency**
    - Barangay Clearance
    - Barangay ID
    - Certificate of Indigency
  - **Other Documents**
    - Business Permit
    - Certificate of Residency
    - Cedula

#### Document Request Process:
1. Select service type
2. Fill out webform with:
   - Personal information (name, age, sex, civil status, birthday)
   - Address (house number, street)
   - Document type and purpose
3. Submit request
4. Receive confirmation
5. Track request status

### 4. **About Us Page**
- Enhanced design with background imagery
- Barangay information and history
- Vision and Mission statements
- Image carousel showcasing community activities
- Contact information:
  - Address
  - Office hours
  - Contact number
  - Email
- Interactive image navigation

### 5. **Profile Sidebar**
Accessible by clicking the profile icon in the header:
- **Personal Information** - View and edit resident profile
- **Track Request** - Monitor document request status
- **Log Out** - Sign out of the system

### 6. **Personal Information Page**
Comprehensive profile management with:

#### Profile Picture
- Upload and change profile picture
- Camera icon for easy access

#### Personal Details
- First Name, Middle Name, Last Name, Suffix
- Birthdate and Age
- Sex and Civil Status
- Nationality and Religion

#### Contact Information
- Contact Number
- Email Address

#### Address
- House Number
- Street
- Barangay (read-only)
- City, Province, Zip Code

#### Emergency Contact
- Contact Name
- Relationship
- Contact Number

#### Features:
- Edit mode for updating information
- Save/Cancel functionality
- Visual feedback on updates
- Organized sections with clear headers

### 7. **Track Request Page**
Monitor all document requests:
- Document type
- Requester name
- Date requested
- Status with color indicators:
  - 🟢 **Pickup** (Green) - Ready for collection
  - 🔵 **Pending** (Blue) - Being processed
  - 🔴 **Denied** (Red) - Request denied
- Remarks for denied requests
- Clean, organized list view

## Navigation

### Header Navigation
- **Home** - View announcements
- **Services** - Request documents
- **About** - Learn about Barangay 160
- **Profile Icon** - Access profile menu

### Profile Menu
- Personal Information
- Track Request
- Log Out

## Login Credentials (Testing)

### Resident Access:
- Username: `resident`
- Password: `resident123`

### Admin Access:
- Username: `admin`
- Password: `admin123`

## Design Features

### Color Scheme
- Primary Blue: `#2957A1`
- Success Green: `#5CE36C`
- Warning Red: `#EA4D48`
- Light Background: `#DDE7F8`

### Typography
- Headers: Konkhmer Sleokchher
- Body: Inter
- Content: Kokoro

### UI Elements
- Rounded cards with shadows
- Smooth transitions and hover effects
- Responsive grid layouts
- Modern form inputs with validation
- Toast notifications for feedback

## User Flow

### Requesting a Document:
1. Log in as resident
2. Navigate to **Services**
3. Choose document category
4. Fill out webform
5. Click **Proceed**
6. View confirmation message
7. Track status in **Track Request**

### Viewing Announcements:
1. Log in as resident
2. Home page displays all announcements
3. Use filters to narrow by category
4. Click card to view details
5. Read full information and requirements
6. Use back button to return

### Managing Profile:
1. Click profile icon
2. Select **Personal Information**
3. Click **Edit Profile**
4. Update desired fields
5. Upload profile picture if needed
6. Click **Save Changes**
7. View success notification

## Responsive Design
The portal is fully responsive and optimized for:
- Desktop (1366px+)
- Tablet (768px - 1365px)
- Mobile (up to 767px)

## Additional Notes
- All forms include validation
- Toast notifications provide instant feedback
- Navigation is intuitive and consistent
- Data is preserved during navigation
- Logout available from profile menu
