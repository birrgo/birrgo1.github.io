const express = require('express');
const cors = require('cors');
const Brevo = require('@getbrevo/brevo');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Brevo Client
const brevo = new Brevo.BrevoClient({ 
  apiKey: process.env.BREVO_API_KEY 
});

// Endpoint to send OTP
app.post('/send-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  try {
    const result = await brevo.transactionalEmails.sendTransacEmail({
      subject: "Your OTP Verification Code",
      htmlContent: `<html><body><h1>Your Verification Code is: <strong>${otp}</strong></h1><p>This code will expire in 10 minutes.</p></body></html>`,
      sender: { name: "Birrgo", email: "no-reply@birrgo.online" }, // Make sure this email is verified in your Brevo account
      to: [{ email: email }]
    });

    console.log("Email sent successfully:", result);
    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error("Error sending email via Brevo:", error);
    res.status(500).json({ error: 'Failed to send OTP via Brevo' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
