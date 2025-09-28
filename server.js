// Load environment variables from a .env file
require('dotenv').config();

// Import necessary packages
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');

// Initialize the Express app
const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware Setup ---

// 1. CORS (Cross-Origin Resource Sharing)
// This securely allows your Vercel frontend to communicate with this backend.
app.use(cors({
    origin: "https://ac-insight-x.vercel.app", 
    methods: ["GET", "POST"],
    credentials: true
}));

// 2. JSON Body Parser
// This allows the server to read JSON data sent from the frontend.
app.use(express.json());

// --- Database Connection ---

// Connect to MongoDB using the connection string from your environment variables
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected successfully!"))
    .catch(err => console.error("MongoDB connection error:", err));

// --- Email Transporter Setup ---

// Create a reusable transporter object for sending emails with Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your full Gmail address
        pass: process.env.EMAIL_PASS, // The 16-character Google App Password
    },
});

// --- Database Schema and Model ---

// Define the structure for the registration data
const registrationSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    contactNumber: { type: String, required: true, unique: true },
    currentYear: { type: String, required: true },
    branch: { type: String, required: true },
    purpose: { type: String, required: false },
    registeredAt: { type: Date, default: Date.now },
});

// Create a model from the schema to interact with the 'registrations' collection
const Registration = mongoose.model('Registration', registrationSchema);

// --- API Routes ---

// Health check route to confirm the server is running
app.get("/", (req, res) => {
    res.send("Insight-X Backend is running and ready!");
});

// Main registration route
app.post('/api/register', async (req, res) => {
    console.log("POST /api/register endpoint hit");
    console.log("Received data:", req.body);

    try {
        const { fullName, email, contactNumber, currentYear, branch, purpose } = req.body;

        // --- 1. Validation ---
        if (!fullName || !email || !contactNumber || !currentYear || !branch) {
            console.log("Validation failed: A required field is missing.");
            return res.status(400).json({ message: "Please fill out all required fields." });
        }

        // --- 2. Check for Duplicates ---
        const existingRegistration = await Registration.findOne({ $or: [{ email }, { contactNumber }] });
        if (existingRegistration) {
            console.log("Duplicate registration attempt denied for:", email);
            return res.status(409).json({ message: "This email or contact number has already been registered." });
        }

        // --- 3. Save to Database ---
        const newRegistration = new Registration({ fullName, email, contactNumber, currentYear, branch, purpose });
        await newRegistration.save();
        console.log("Registration saved successfully to database:", newRegistration);

        // --- 4. Send Confirmation Email ---
        const mailOptions = {
            from: `"Insight X" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Registration Confirmed for Insight X!",
            html: `
                <h1>Welcome to Insight X, ${fullName}!</h1>
                <p>Thank you for registering. We're thrilled to have you join us for our Campus to Corporate event.</p>
                <p><b>Event Date:</b> October 13th, 2025</p>
                <p>We can't wait to see you there!</p>
                <br>
                <p>Best regards,</p>
                <p><b>Alumni Cell KJSSE</b></p>
            `
        };
        
        // **UPDATED CODE**
        // Using await here ensures we wait for the email to send.
        // If it fails, it will be caught by the catch block below.
        console.log(`Attempting to send confirmation email to ${email}...`);
        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully!");

        // --- 5. Send Success Response ---
        res.status(201).json({ message: "Registration successful! A confirmation email has been sent." });

    } catch (error) {
        // --- Error Handling ---
        console.error("An error occurred during the registration process:", error);
        res.status(500).json({ message: "An unexpected server error occurred. Please try again later." });
    }
});

// --- Start the Server ---

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
