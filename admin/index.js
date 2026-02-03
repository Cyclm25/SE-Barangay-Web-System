const express = require("express");
const cors = require("cors");
const app = express();

// 1. Enable CORS so your Frontend on Port 3000 can talk to this Backend
app.use(cors()); 
app.use(express.json());

// 2. Link your authentication routes
app.use("/auth", require("./routes/auth"));

// 3. Start on Port 5001
app.listen(5001, () => {
  console.log("Backend server is running on http://localhost:5001");
});