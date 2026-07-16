const express = require('express');
const cors = require('cors');
const Brevo = require('@getbrevo/brevo');

const app = express();

app.use(cors());
app.use(express.json());

// Endpoint to send OTP compatible with the V3 Verification Matrix panel
app.post('/send-otp', async (req, res) => {
  // Destructure all parameters sent by verified.html
  const { email, otp, apiKey, senderEmail, templateId, senderName } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  // Determine which API key to use (prefer the dashboard config, fallback to Environment Variable)
  const activeApiKey = apiKey || process.env.BREVO_API_KEY;

  if (!activeApiKey) {
    return res.status(400).json({ error: 'Brevo API Key is missing. Please configure it in your dashboard.' });
  }

  try {
    // 1. Dynamic SDK setup using the resolved API key
    const defaultClient = Brevo.ApiClient.instance;
    const apiKeyAuth = defaultClient.authentications['api-key'];
    apiKeyAuth.apiKey = activeApiKey;

    const apiInstance = new Brevo.TransactionalEmailsApi();

    // 2. Build the email payload dynamically based on dashboard settings
    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    
    // Set dynamic sender or fallback to validated default
    const finalSenderEmail = senderEmail || "mail@birrgo.online";
    const finalSenderName = senderName || "Birrgo";
    sendSmtpEmail.sender = { name: finalSenderName, email: finalSenderEmail };
    sendSmtpEmail.to = [{ email: email }];

    // Handle template fallback or template email dispatch
    if (templateId) {
      sendSmtpEmail.templateId = parseInt(templateId, 10);
      sendSmtpEmail.params = { otp: otp }; // Pass variables to template if used
    } else {
      sendSmtpEmail.subject = "Your OTP Verification Code";
      sendSmtpEmail.htmlContent = `<html><body><h1>Your Verification Code is: <strong>${otp}</strong></h1><p>This code will expire in 5 minutes.</p></body></html>`;
    }

    // 3. Dispatch Email
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
