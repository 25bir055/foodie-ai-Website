const nodemailer = require('nodemailer')
require('dotenv').config()

let transporter = null

function getTransporter() {
  if (transporter) return transporter

  // 1. If custom SMTP or Gmail credentials are provided in .env
  const emailUser = process.env.EMAIL_USER || process.env.GMAIL_USER
  const emailPass = process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD

  if (emailUser && emailPass) {
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    })
    console.log(`📧 Nodemailer configured with ${emailUser}`)
  } else {
    // 2. Test / development mode
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass'
      }
    })
    console.log('📧 Nodemailer in development fallback mode')
  }

  return transporter
}

/**
 * Send Welcome / Login Notification Email
 * @param {string} toEmail - Recipient email address
 * @param {string} userName - Name of the user
 * @param {string} loginMethod - 'Google' or 'Email & Password'
 */
async function sendWelcomeEmail(toEmail, userName = 'Foodie User', loginMethod = 'Google Authentication') {
  if (!toEmail) return

  try {
    const transport = getTransporter()
    const sender = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'Foodie AI <no-reply@foodie.ai>'
    const loginTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F8FAF7; margin: 0; padding: 20px; color: #1E2D24; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #E2EFE7; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
          .header { background: linear-gradient(135deg, #1C3B2B 0%, #2A5C43 100%); padding: 32px 28px; text-align: center; color: #ffffff; }
          .logo { font-size: 28px; font-weight: 700; margin-bottom: 4px; letter-spacing: -0.5px; }
          .tagline { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.8; }
          .content { padding: 32px 28px; }
          .greeting { font-size: 20px; font-weight: 600; color: #1C3B2B; margin-bottom: 12px; }
          .text { font-size: 14px; line-height: 1.6; color: #4A6354; margin-bottom: 20px; }
          .badge-box { background: #F1F8F4; border-left: 4px solid #3B9767; padding: 14px 18px; border-radius: 8px; margin: 20px 0; }
          .badge-title { font-size: 13px; font-weight: 600; color: #1C3B2B; margin: 0 0 6px 0; }
          .badge-desc { font-size: 12px; color: #537562; margin: 0; }
          .features { margin: 24px 0; }
          .feature-item { display: flex; align-items: center; margin-bottom: 12px; font-size: 13px; color: #2C4637; }
          .feature-icon { margin-right: 10px; font-size: 16px; }
          .btn-container { text-align: center; margin: 30px 0 10px; }
          .button { background: #2A5C43; color: #ffffff !important; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-weight: 600; font-size: 14px; display: inline-block; }
          .footer { background: #FAFDFB; padding: 20px 28px; text-align: center; border-top: 1px solid #EAF3EE; font-size: 11px; color: #8FA89A; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🌿 Foodie AI</div>
            <div class="tagline">Smart Nutrition & Food Product Scanner</div>
          </div>
          
          <div class="content">
            <div class="greeting">Welcome, ${userName}! 👋</div>
            <p class="text">
              You have successfully logged in to <strong>Foodie AI</strong> using <strong>${loginMethod}</strong>.
            </p>

            <div class="badge-box">
              <p class="badge-title">🔒 Login Security Details</p>
              <p class="badge-desc">
                <strong>Email:</strong> ${toEmail}<br>
                <strong>Method:</strong> ${loginMethod}<br>
                <strong>Time:</strong> ${loginTime} (IST)
              </p>
            </div>

            <p class="text">
              Here is what you can do right now with Foodie AI:
            </p>

            <div class="features">
              <div class="feature-item"><span class="feature-icon">📸</span> <strong>Instant Barcode Scanner:</strong> Scan any packaged grocery in real time.</div>
              <div class="feature-item"><span class="feature-icon">📊</span> <strong>Health Score (0-100):</strong> Understand nutritional quality in plain language.</div>
              <div class="feature-item"><span class="feature-icon">🚨</span> <strong>Allergen Alerts:</strong> Automatic detection for harmful additives and sugars.</div>
              <div class="feature-item"><span class="feature-icon">❤️</span> <strong>Personal Favorites:</strong> Save healthy foods to your private list.</div>
            </div>

            <div class="btn-container">
              <a href="http://localhost:5173/dashboard" class="button">Open Foodie AI Dashboard →</a>
            </div>
          </div>

          <div class="footer">
            <p>© 2026 Foodie AI. All rights reserved.<br>If you did not perform this login, please secure your account immediately.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const mailOptions = {
      from: sender,
      to: toEmail,
      subject: `🌿 Welcome to Foodie AI — Successful Login (${loginMethod})`,
      text: `Hello ${userName},\n\nYou have successfully logged in to Foodie AI via ${loginMethod}.\n\nTime: ${loginTime}\nEmail: ${toEmail}\n\nStart scanning smarter with Foodie AI!\nhttp://localhost:5173`,
      html: htmlContent
    }

    const info = await transport.sendMail(mailOptions)
    console.log(`✅ Welcome email sent to ${toEmail} [MessageId: ${info.messageId}]`)
    return { success: true, messageId: info.messageId }
  } catch (err) {
    console.error(`⚠️ Email sending notice for ${toEmail}:`, err.message)
    return { success: false, error: err.message }
  }
}

module.exports = {
  sendWelcomeEmail
}
