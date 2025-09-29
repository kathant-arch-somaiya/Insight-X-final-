// FINAL SERVER.JS CODE WITH BREVO

// Load environment variables from a .env file for local development
require('dotenv').config();

// Import necessary packages
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const SibApiV3Sdk = require('sib-api-v3-sdk'); // Brevo's package

// Initialize the Express app
const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware Setup ---
app.use(cors({
    origin: "https://ac-insight-x.vercel.app", 
    methods: ["GET", "POST"],
    credentials: true
}));
app.use(express.json());

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected successfully!"))
    .catch(err => console.error("MongoDB connection error:", err));

// --- Brevo API Client Setup ---
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY; // Using the key from Render's environment
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// --- Database Schema and Model ---
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

// --- API Routes ---
app.get("/", (req, res) => {
    res.send("Insight-X Backend is running and ready!");
});

app.post('/api/register', async (req, res) => {
    console.log("POST /api/register endpoint hit");
    try {
        const { fullName, email, contactNumber, currentYear, branch, purpose } = req.body;

        if (!fullName || !email || !contactNumber || !currentYear || !branch) {
            return res.status(400).json({ message: "Please fill out all required fields." });
        }
        const existingRegistration = await Registration.findOne({ $or: [{ email }, { contactNumber }] });
        if (existingRegistration) {
            return res.status(409).json({ message: "This email or contact number has already been registered." });
        }
        const newRegistration = new Registration({ fullName, email, contactNumber, currentYear, branch, purpose });
        await newRegistration.save();
        console.log("Registration saved successfully to database:", newRegistration);

        // --- Send Email with Brevo ---
        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        sendSmtpEmail.subject = "Registration Confirmed for Insight X!";
        sendSmtpEmail.htmlContent = `<h1>Welcome to Insight X, ${fullName}!</h1><p>Thank you for registering. We're thrilled to have you join us for our Campus to Corporate event.</p><p><b>Event Date:</b> October 13th, 2025</p><p>Best regards,</p><p><b>Alumni Cell KJSSE</b></p>`;
        sendSmtpEmail.sender = { name: "Insight X", email: "kathant.somaiya@somaiya.edu" }; // IMPORTANT: Change this to an email you have verified as a sender in Brevo
        sendSmtpEmail.to = [{ email: email, name: fullName }];

        console.log(`Attempting to send confirmation email with Brevo to ${email}...`);
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Email sent successfully via Brevo!');
        
        res.status(201).json({ message: "Registration successful! A confirmation email has been sent." });

    } catch (error) {
        console.error("An error occurred during the registration process:", error);
        res.status(500).json({ message: "An unexpected server error occurred." });
    }
});

// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
