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
CREATE TABLE Resident (
    ResidentID SERIAL PRIMARY KEY,
    LastName VARCHAR(50) NOT NULL,
    FirstName VARCHAR(50) NOT NULL,
    MiddleName VARCHAR(50),
    Email VARCHAR(100) UNIQUE NOT NULL,
    ResidentType VARCHAR(30) CHECK (ResidentType IN ('Adult', 'Student', 'Senior Citizen')),
    VoterStatus VARCHAR(10)
);

CREATE TABLE ResidentAccount (
    AccountID SERIAL PRIMARY KEY,
    ResidentID INT REFERENCES Resident(ResidentID) ON DELETE CASCADE,
    Username VARCHAR(255) UNIQUE NOT NULL, -- Resident's Gmail address
    Password VARCHAR(255) NOT NULL,
    DateCreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
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

Create a .env file in the root of the server folder:
```
Code snippet

EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-16-character-app-password
DB_USER=postgres
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=barangay160_db
```
Launch the server:
```
 node index.js
```


3. Frontend Setup
Navigate to the client directory:
```
cd client
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
