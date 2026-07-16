const express = require('express');
const cors = require('cors');
const Brevo = require('@getbrevo/brevo');

const app = express();

// 1. Enable CORS for your hosted domain (GitHub Pages) and local testing
app.use(cors({
  origin: '*', // Allows requests from any frontend domain hosting your files
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Add a simple health check route to verify the server is active in browser
app.get('/', (req, res) => {
  res.send('BirrGo OTP Backend is live and running!');
});

// 2. Endpoint to send OTP
app.post('/send-otp', async (req, res) => {
  const { email, otp, apiKey, senderEmail, templateId, senderName } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  const activeApiKey = apiKey || process.env.BREVO_API_KEY;

  if (!activeApiKey) {
    console.error("Brevo API Key is missing.");
    return res.status(400).json({ error: 'Brevo API Key is missing. Please configure it in your environment variables.' });
  }

  try {
    // Correct modern Brevo SDK configuration
    let defaultClient = Brevo.ApiClient.instance;
    let apiKeyInstance = defaultClient.authentications['api-key'];
    apiKeyInstance.apiKey = activeApiKey;

    const apiInstance = new Brevo.TransactionalEmailsApi();
    const sendSmtpEmail = new Brevo.SendSmtpEmail();

    sendSmtpEmail.to = [{ email: email }];
    sendSmtpEmail.sender = { 
      name: senderName || "Birrgo", 
      email: senderEmail || "mail@birrgo.online" 
    };

    if (templateId) {
      sendSmtpEmail.templateId = parseInt(templateId, 10);
      sendSmtpEmail.params = { 
        otp: otp,
        OTP: otp 
      };
    } else {
      sendSmtpEmail.subject = "Your OTP Verification Code";
      sendSmtpEmail.htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Your Verification Code is: <strong style="color: #9A0019;">${otp}</strong></h2>
            <p>This code will expire in 5 minutes.</p>
          </body>
        </html>
      `;
    }

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("OTP Email successfully dispatched:", result);
    
    res.status(200).json({ 
      success: true, 
      message: 'OTP sent successfully', 
      messageId: result.messageId 
    });
  } catch (error) {
    const errorDetails = error.response && error.response.body ? error.response.body : error.message;
    console.error("Error sending email via Brevo API:", errorDetails);
    
    res.status(500).json({ 
      error: 'Failed to send OTP via Brevo', 
      details: errorDetails 
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
