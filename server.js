const express = require('express');
const cors = require('cors');
const Brevo = require('@getbrevo/brevo');

const app = express();

// 1. Enable CORS for all origins (or specify your frontend URL to make Brave happy)
app.use(cors());
app.use(express.json());

// 2. Initialize the Brevo API Client with your API Key safely
const defaultClient = Brevo.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

// 3. Instantiate the Transactional Emails Helper
const apiInstance = new Brevo.TransactionalEmailsApi();

// Endpoint to send OTP
app.post('/send-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  // 4. Create the email payload object using your verified sender
  const sendSmtpEmail = new Brevo.SendSmtpEmail();
  sendSmtpEmail.subject = "Your OTP Verification Code";
  sendSmtpEmail.htmlContent = `<html><body><h1>Your Verification Code is: <strong>${otp}</strong></h1><p>This code will expire in 10 minutes.</p></body></html>`;
  
  // Using your exact verified sender from the Brevo screenshot
  sendSmtpEmail.sender = { name: "Birrgo", email: "mail@birrgo.online" }; 
  sendSmtpEmail.to = [{ email: email }];

  try {
    // 5. Send the email using the configured instance
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("Email sent successfully:", result);
    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error("Error sending email via Brevo:", error.response ? error.response.body : error);
    res.status(500).json({ error: 'Failed to send OTP via Brevo' });
  }
});

// Use Render's default dynamic port assignment
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
