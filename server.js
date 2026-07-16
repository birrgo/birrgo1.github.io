const express = require('express');
const cors = require('cors');
const SibApiV3Sdk = require('@getbrevo/brevo');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Brevo Client
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// Endpoint to send OTP
app.post('/send-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.subject = "Your OTP Verification Code";
  sendSmtpEmail.htmlContent = `<html><body><h1>Your Verification Code is: <strong>${otp}</strong></h1><p>This code will expire in 10 minutes.</p></body></html>`;
  sendSmtpEmail.sender = { name: "Birrgo", email: "no-reply@birrgo.online" }; // Update to your verified sender email on Brevo
  sendSmtpEmail.to = [{ email: email }];

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send OTP via Brevo' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
