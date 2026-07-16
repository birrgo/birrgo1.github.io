const express = require('express');
const cors = require('cors');
// Import the correct Brevo SDK classes
const SibApiV3Sdk = require('@getbrevo/brevo');

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
    // 1. Authenticate the SDK client instance correctly
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKeyInstance = defaultClient.authentications['api-key'];
    apiKeyInstance.apiKey = activeApiKey;

    // 2. Instantiate the transactional email API
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    // 3. Build the SendSmtpEmail payload object
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.to = [{ email: email }];
    sendSmtpEmail.sender = { 
      name: senderName || "Birrgo", 
      email: senderEmail || "mail@birrgo.online" 
    };

    // If templateId is provided by the dashboard, use it
    if (templateId) {
      sendSmtpEmail.templateId = parseInt(templateId, 10);
      // Brevo template parameters are lowercase "params"
      // Make sure your Brevo template uses {{ params.otp }} or {{ params.OTP }}
      sendSmtpEmail.params = { 
        otp: otp,
        OTP: otp 
      };
    } else {
      // Otherwise, fallback to a clean HTML layout
      sendSmtpEmail.subject = "Your OTP Verification Code";
      sendSmtpEmail.htmlContent = `<html><body><h1>Your Verification Code is: <strong>${otp}</strong></h1><p>This code will expire in 5 minutes.</p></body></html>`;
    }

    // 4. Dispatch the email using the correct SDK v4 method
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("OTP Email successfully dispatched:", result);
    
    res.status(200).json({ success: true, message: 'OTP sent successfully', messageId: result.messageId });
  } catch (error) {
    // Handle SDK-specific response error objects cleanly
    const errorDetails = error.response && error.response.body ? error.response.body : error.message;
    console.error("Error sending email via Brevo API:", errorDetails);
    
    res.status(500).json({ 
      error: 'Failed to send OTP via Brevo', 
      details: errorDetails 
    });
  }
});

// Port assignment compatible with Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
