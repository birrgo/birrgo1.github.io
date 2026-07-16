const express = require('express');
const cors = require('cors');
// Import the unified modern BrevoClient class directly to prevent constructor errors
const { BrevoClient } = require('@getbrevo/brevo');

const app = express();

// 1. Enable CORS for browser requests
app.use(cors());
app.use(express.json());

// 2. Endpoint to send OTP (Supports both Register and Verification dashboards)
app.post('/send-otp', async (req, res) => {
  // Destructure all parameters sent by verified.html / register.html
  const { email, otp, apiKey, senderEmail, templateId, senderName } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  // Determine which API key to use (prefer the custom dashboard key, fallback to Render Env Var)
  const activeApiKey = apiKey || process.env.BREVO_API_KEY;

  if (!activeApiKey) {
    console.error("Brevo API Key is missing on the server and from the request payload.");
    return res.status(400).json({ error: 'Brevo API Key is missing. Please configure it in your dashboard settings.' });
  }

  try {
    // Initialize the modern BrevoClient instance with the active key
    const brevo = new BrevoClient({ apiKey: activeApiKey });

    // Build the email payload dynamically
    const emailPayload = {
      sender: { 
        name: senderName || "Birrgo", 
        email: senderEmail || "mail@birrgo.online" 
      },
      to: [{ email: email }]
    };

    // If templateId is provided by the dashboard, use it
    if (templateId) {
      emailPayload.templateId = parseInt(templateId, 10);
      emailPayload.params = { otp: otp };
    } else {
      // Otherwise, fallback to a clean HTML layout
      emailPayload.subject = "Your OTP Verification Code";
      emailPayload.htmlContent = `<html><body><h1>Your Verification Code is: <strong>${otp}</strong></h1><p>This code will expire in 5 minutes.</p></body></html>`;
    }

    // Dispatch the email using the updated SDK v4 method structure
    const result = await brevo.transactionalEmails.sendTransacEmail(emailPayload);
    console.log("OTP Email successfully dispatched:", result);
    
    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error("Error sending email via Brevo API:", error.response ? error.response.body : error);
    res.status(500).json({ 
      error: 'Failed to send OTP via Brevo', 
      details: error.response ? error.response.body : error.message 
    });
  }
});

// Port assignment compatible with Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
