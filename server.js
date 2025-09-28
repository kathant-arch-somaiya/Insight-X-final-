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

    try {
        const { fullName, email, contactNumber, currentYear, branch, purpose } = req.body;

        if (!fullName || !email || !contactNumber || !currentYear || !branch) {
            console.log("Validation failed");
            return res.status(400).json({ message: "Please fill out all required fields." });
        }

        const existingRegistration = await Registration.findOne({ $or: [{ email }, { contactNumber }] });
        if (existingRegistration) {
            console.log("Duplicate registration found");
            return res.status(409).json({ message: "This email or contact number has already been registered." });
        }

        const newRegistration = new Registration({ fullName, email, contactNumber, currentYear, branch, purpose });
        await newRegistration.save();
        console.log("Registration saved successfully:", newRegistration);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Registration Confirmed for Insight X!",
            html: `
                <h1>Welcome to Insight X, ${fullName}!</h1>
                <p>Thank you for registering. We're thrilled to have you join us!</p>
                <p><b>Event:</b> Insight X - Campus to Corporate</p>
                <p><b>Date:</b> October 13th, 2025</p>
                <p>We can't wait to see you there!</p>
                <br>
                <p>Alumni Cell KJSSE</p>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) console.error("Email sending failed:", error);
            else console.log("Email sent successfully:", info.response);
        });

        res.status(201).json({ message: "Registration successful! A confirmation email has been sent." });
    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ message: "An unexpected error occurred. Please try again later." });
    }
});
