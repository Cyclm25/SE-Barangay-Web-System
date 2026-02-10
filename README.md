# 🏙️ Barangay 160 Management System

A full-stack web application designed for **Barangay 160, Zone 14, Tondo, Manila**. This system enables residents to securely log in, request official barangay documents, and manage their profiles with an automated **OTP-based password recovery system**.

---

## 🚀 Tech Stack

* **Frontend:** React.js + Vite + Tailwind CSS
* **Backend:** Node.js + Express.js
* **Database:** PostgreSQL
* **Authentication:** Nodemailer for Email OTP (Gmail)

---

## 🛠️ Prerequisites

Ensure you have the following installed:

* **Node.js** (v16 or higher)
* **PostgreSQL**
* **Gmail Account:** Requires **2-Step Verification** enabled to generate a unique **App Password**.

---

## 📥 Installation & Setup

### 1. Database Configuration
1. Open your PostgreSQL terminal or **pgAdmin**.
2. Create a database named `barangay160_db`.
3. Execute the following SQL commands to build the required tables:

SQL
```
-- 1. CLEAN UP: Drop existing tables if they exist to avoid conflicts
DROP TABLE IF EXISTS notification CASCADE;
DROP TABLE IF EXISTS request CASCADE;
DROP TABLE IF EXISTS announcement CASCADE;
DROP TABLE IF EXISTS residentaccount CASCADE;
DROP TABLE IF EXISTS resident CASCADE;
DROP TABLE IF EXISTS barangayadmin CASCADE;
DROP TABLE IF EXISTS superadmin CASCADE;

-- 2. CREATE BASE TABLES
CREATE TABLE superadmin (
    "SuperAdminID" VARCHAR(20) PRIMARY KEY, 
    "Password" VARCHAR(50)
);

CREATE TABLE barangayadmin (
    "BarangayAdminID" VARCHAR(20) PRIMARY KEY, 
    "AdminName" VARCHAR(100), 
    "Password" VARCHAR(50), 
    "Email" VARCHAR(100),
    "SuperAdminID" VARCHAR(20) REFERENCES superadmin("SuperAdminID")
);

CREATE TABLE resident (
    "ResidentID" VARCHAR(20) PRIMARY KEY, 
    "LastName" VARCHAR(50), 
    "FirstName" VARCHAR(50), 
    "MiddleName" VARCHAR(50),
    "Birthday" DATE,
    "Age" INTEGER,
    "Gender" VARCHAR(10),
    "CivilStatus" VARCHAR(20),
    "HouseNumber" VARCHAR(10),
    "StreetAddress" VARCHAR(100),
    "ContactNumber" VARCHAR(20),
    "Email" VARCHAR(100),
    "ResidentType" VARCHAR(20),
    "VoterStatus" VARCHAR(5),
    "password" VARCHAR(50),
    "ResidentAccountID" INTEGER -- Link to the account table hub
);

-- 3. CREATE LOGIN HUB (ResidentAccount)
CREATE TABLE residentaccount (
    "ResidentAccountID" SERIAL PRIMARY KEY,
    "ResidentID" VARCHAR(20) REFERENCES resident("ResidentID"),
    "BarangayAdminID" VARCHAR(20) REFERENCES barangayadmin("BarangayAdminID"),
    "SuperAdminID" VARCHAR(20) REFERENCES superadmin("SuperAdminID"),
    "Password" VARCHAR(50) NOT NULL,
    "Role" VARCHAR(50)
);

-- Insert Base Super Admin
INSERT INTO superadmin ("SuperAdminID", "Password") 
VALUES ('SA20260001', 'super123');

-- Insert Base Barangay Admin
INSERT INTO barangayadmin ("BarangayAdminID", "AdminName", "Password", "SuperAdminID") 
VALUES ('AD20260001', 'Maria', 'admin123', 'SA20260001');

-- Insert Base Resident
INSERT INTO resident ("ResidentID", "LastName", "FirstName") 
VALUES ('RS20260001', 'Mabutas', 'Carla');

-- Create the Login Accounts
INSERT INTO residentaccount ("SuperAdminID", "Password", "Role")
VALUES ('SA20260001', 'super123', 'Super Admin');

INSERT INTO residentaccount ("BarangayAdminID", "Password", "Role", "SuperAdminID")
VALUES ('AD20260001', 'admin123', 'Admin', 'SA20260001');

INSERT INTO residentaccount ("ResidentID", "Password", "Role")
VALUES ('RS20260001', 'carla123', 'Resident');

-- Link Resident Profile to Account
UPDATE resident 
SET "ResidentAccountID" = (SELECT "ResidentAccountID" FROM residentaccount WHERE "ResidentID" = 'RS20260001')
WHERE "ResidentID" = 'RS20260001';

-- Insert Base Super Admin
INSERT INTO superadmin ("SuperAdminID", "Password") 
VALUES ('SA20260001', 'super123');

-- Insert Base Barangay Admin
INSERT INTO barangayadmin ("BarangayAdminID", "AdminName", "Password", "SuperAdminID") 
VALUES ('AD20260001', 'Maria', 'admin123', 'SA20260001');

-- Insert Base Resident
INSERT INTO resident ("ResidentID", "LastName", "FirstName") 
VALUES ('RS20260001', 'Mabutas', 'Carla');

-- Create the Login Accounts
INSERT INTO residentaccount ("SuperAdminID", "Password", "Role")
VALUES ('SA20260001', 'super123', 'Super Admin');

INSERT INTO residentaccount ("BarangayAdminID", "Password", "Role", "SuperAdminID")
VALUES ('AD20260001', 'admin123', 'Admin', 'SA20260001');

INSERT INTO residentaccount ("ResidentID", "Password", "Role")
VALUES ('RS20260001', 'carla123', 'Resident');

-- Link Resident Profile to Account
UPDATE resident 
SET "ResidentAccountID" = (SELECT "ResidentAccountID" FROM residentaccount WHERE "ResidentID" = 'RS20260001')
WHERE "ResidentID" = 'RS20260001';
```
2. Backend Setup

Navigate to the server directory:
```
cd server
```

Install required packages: 

```
npm install
```
cd admin
```
Launch the server:
```
 node index.js
```


3. Frontend Setup
Navigate to the client directory:
```
cd fe
```

Install required packages: 
```
npm install
```


Launch the development server: 
```
npm run dev
```

🔑 OTP Flow Logic
The system follows a streamlined "Username = Email" flow to ensure fast and secure password recovery:

Username Entry: The resident types their registered Gmail address into the login username field.

Auto-Trigger: Clicking "Forgot Password?" automatically triggers the backend to verify the email and generate a 6-digit OTP.

Email Delivery: The system sends the code via Nodemailer to the resident's Gmail.

Countdown: A 120-second timer starts in the UI; if the code is not entered in time, it expires.

Password Reset: Upon successful verification, the resident is directed to a "New Password" screen to update their account in the database.

📝 Project Notes
Security: Ensure the .env file is included in your .gitignore to prevent leaking Gmail credentials.

Constraints: The ResidentType field is protected by a check constraint to maintain data integrity.
