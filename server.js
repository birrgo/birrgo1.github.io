const express = require('express');
const cors = require('cors');
const Brevo = require('@getbrevo/brevo');
const admin = require('firebase-admin');

const app = express();

// 1. Enable CORS for all incoming requests (crucial for GitHub Pages / Render combo)
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// 2. Initialize Firebase Admin securely using Render Environment Variables
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    console.log("Firebase Admin securely connected!");
  } catch (error) {
    console.error("Firebase Admin initialization failed:", error);
  }
} else {
  console.warn("WARNING: FIREBASE_SERVICE_ACCOUNT env variable is missing!");
}

// Simple health-check endpoint
app.get('/', (req, res) => {
  res.send('BirrGo OTP Backend is live and running!');
});

// Helper function to generate a 6-digit OTP securely
function generateSecureOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper to sanitize emails for Firebase paths (replacing '.' with '_')
function sanitizeEmail(email) {
  return email.toLowerCase().replace(/\./g, '_').replace(/@/g, '_at_');
}

// 3. Endpoint to generate, save, and send OTP
app.post('/send-otp', async (req, res) => {
  const { email, apiKey, senderEmail, templateId, senderName } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const secureOtp = generateSecureOTP();
  const activeApiKey = apiKey || process.env.BREVO_API_KEY;

  if (!activeApiKey) {
    console.error("Brevo API Key is missing.");
    return res.status(400).json({ error: 'Brevo API Key is missing.' });
  }

  try {
    // A) SAVE OTP TO FIREBASE SECURELY (using server permissions)
    const sanitizedEmailKey = sanitizeEmail(email);
    const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes expiration

    await admin.database().ref(`otps/${sanitizedEmailKey}`).set({
      otp: secureOtp,
      expiresAt: expiresAt,
      verified: false
    });

    // B) SEND OTP EMAIL VIA BREVO
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
        otp: secureOtp,
        OTP: secureOtp 
      };
    } else {
      sendSmtpEmail.subject = "Your OTP Verification Code";
      sendSmtpEmail.htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Your Verification Code is: <strong style="color: #9A0019;">${secureOtp}</strong></h2>
            <p>This code will expire in 5 minutes.</p>
          </body>
        </html>
      `;
    }

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`OTP sent to ${email}. Message ID: ${result.messageId}`);
    
    res.status(200).json({ 
      success: true, 
      message: 'OTP processed and dispatched successfully', 
      messageId: result.messageId 
    });

  } catch (error) {
    const errorDetails = error.response && error.response.body ? error.response.body : error.message;
    console.error("Error inside /send-otp flow:", errorDetails);
    
    res.status(500).json({ 
      error: 'Failed to complete OTP request', 
      details: errorDetails 
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
