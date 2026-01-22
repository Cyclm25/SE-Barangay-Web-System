const express = require("express");
const app = express();
const cors = require("cors");
const pool = require("./db");
const authRoutes = require("./routes/auth"); 

app.use(cors());
app.use(express.json());

// Routes
app.use("/auth", authRoutes); 

app.listen(5000, () => {
    console.log("Server is running on port 5000");
});