require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS setup to allow your frontend domain
app.use(cors({
    origin: "https://ac-insight-x.vercel.app", 
    methods: ["GET", "POST"],
    credentials: true
}));

app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected successfully!"))
    .catch(err => console.error("MongoDB connection error:", err));

// Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// MongoDB schema & model
const registrationSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    contactNumber: { type: String, required: true, unique: true },
    currentYear: { type: String, required: true },
    branch: { type: String, required: true },
    purpose: { type: String, required: false },
    registeredAt: { type: Date, default: Date.now },
});

const Registration = mongoose.model('Registration', registrationSchema);

// Debug route to confirm backend is running
app.get("/", (req, res) => {
    res.send("Backend is running");
});

// Debug POST route to confirm /api/register connection
app.post('/api/register', async (req, res) => {
    console.log("POST /api/register triggered");
    console.log("Request body:", req.body);

    res.status(200).json({ message: "Route reached successfully" });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
