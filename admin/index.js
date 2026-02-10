const express = require("express");
const cors = require("cors");
const app = express();

// 1. Enable CORS - Crucial for allowing your React app (Port 3000) to talk to this API
app.use(cors()); 
app.use(express.json()); // ✅ REQUIRED so req.body works in auth.js

// 2. Link your authentication routes (Login/Auth logic)
app.use("/auth", require("./routes/auth"));

// 3. Link your resident management routes (CRUD operations for Residents)
// This enables endpoints like GET /residents and POST /residents/register
app.use("/residents", require("./routes/residents")); 

// ✅ OPTIONAL but helpful: quick health check
app.get("/", (req, res) => {
  res.send("Backend API is running");
});

// 4. Start the server on Port 5001
app.listen(5001, () => {
  console.log("Backend server is running on http://localhost:5001");
});
