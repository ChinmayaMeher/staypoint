const nodemailer = require("nodemailer");

// Create a reusable transporter
let transporter;

async function setupTransporter() {
  if (transporter) return transporter;

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    // Use real SMTP if provided
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else {
    // Generate test SMTP service account from ethereal.email if no credentials
    console.log("No EMAIL_USER/EMAIL_PASS found. Generating Ethereal test account...");
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log("Ethereal test account created: ", testAccount.user);
  }
  return transporter;
}

/**
 * Sends a booking confirmation email
 * @param {Object} user - The user object
 * @param {Object} booking - The booking object
 * @param {String} ticketUrl - The URL to view the ticket
 */
async function sendBookingConfirmation(user, booking, ticketUrl) {
  try {
    const t = await setupTransporter();
    const info = await t.sendMail({
      from: '"StayPoint Booking" <no-reply@staypoint.com>',
      to: user.email || "guest@example.com", // user.email might not exist if model doesn't have it, fallback
      subject: `Booking Confirmed: ${booking.bookingRef}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #c8622a;">Booking Confirmed!</h2>
          <p>Hi ${user.fullName || user.username},</p>
          <p>Your booking <strong>${booking.bookingRef}</strong> has been successfully created.</p>
          <p><strong>Check-in:</strong> ${new Date(booking.checkin).toLocaleDateString()}</p>
          <p><strong>Check-out:</strong> ${new Date(booking.checkout).toLocaleDateString()}</p>
          <p>You can view your detailed digital ticket and download it by clicking the link below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${ticketUrl}" style="background-color: #c8622a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Your Ticket</a>
          </div>
          <p>Thank you for choosing StayPoint!</p>
        </div>
      `,
    });
    console.log("Message sent: %s", info.messageId);
    if (info.messageId && nodemailer.getTestMessageUrl(info)) {
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error("Error sending booking confirmation email:", error);
  }
}

/**
 * Sends a booking cancellation email
 * @param {Object} user - The user object
 * @param {Object} booking - The booking object
 */
async function sendBookingCancellation(user, booking) {
  try {
    const t = await setupTransporter();
    const info = await t.sendMail({
      from: '"StayPoint Booking" <no-reply@staypoint.com>',
      to: user.email || "guest@example.com",
      subject: `Booking Cancelled: ${booking.bookingRef}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #d9534f;">Booking Cancelled</h2>
          <p>Hi ${user.fullName || user.username},</p>
          <p>Your booking <strong>${booking.bookingRef}</strong> has been cancelled.</p>
          <p>Reason: ${booking.cancellationReason || "Not provided"}</p>
          <p>If you have any questions, please contact our support team.</p>
          <p>We hope to see you again at StayPoint.</p>
        </div>
      `,
    });
    console.log("Message sent: %s", info.messageId);
    if (info.messageId && nodemailer.getTestMessageUrl(info)) {
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error("Error sending booking cancellation email:", error);
  }
}

/**
 * Sends a password reset OTP email
 * @param {Object} user - The user object
 * @param {String} otp - The 6-digit OTP
 * @param {String} hostUrl - The base URL of the website
 */
async function sendPasswordResetOtp(user, otp, hostUrl) {
  try {
    const t = await setupTransporter();
    const info = await t.sendMail({
      from: '"StayPoint Security" <no-reply@staypoint.com>',
      to: user.email,
      subject: `Password Reset OTP: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 25px;">
            <h2 style="color: #c8622a; margin: 0; font-size: 24px;">Reset Your Password</h2>
          </div>
          <p style="color: #333333; font-size: 16px;">Hi ${user.fullName || user.username},</p>
          <p style="color: #555555; font-size: 15px; line-height: 1.5;">We received a request to reset your password. Click the button below to proceed securely:</p>
          <div style="text-align: center; margin: 35px 0;">
            <a href="${hostUrl}/verify-otp?email=${encodeURIComponent(user.email)}&otp=${otp}" style="background-color: #c8622a; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(200, 98, 42, 0.2);">Reset Password</a>
          </div>
          <p style="text-align: center; font-size: 14px; color: #777777;">Or use this 6-digit verification code manually:</p>
          <div style="text-align: center; margin: 15px 0 30px;">
            <span style="background-color: #f8f1eb; color: #3a2318; padding: 12px 24px; border-radius: 8px; font-size: 22px; font-weight: 700; letter-spacing: 6px; border: 1px solid #e0d4c8;">${otp}</span>
          </div>
          <p style="color: #777777; font-size: 13px; line-height: 1.5; border-top: 1px solid #eaeaea; padding-top: 20px;">This link and code are valid for the next <strong>4 minutes</strong>. If you did not request a password reset, you can safely ignore this email.</p>
          <p style="color: #777777; font-size: 13px;">Thank you,<br><strong>The StayPoint Team</strong></p>
        </div>
      `,
    });
    console.log("OTP Email sent: %s", info.messageId);
    if (info.messageId && nodemailer.getTestMessageUrl(info)) {
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error("Error sending OTP email:", error);
  }
}

module.exports = {
  sendBookingConfirmation,
  sendBookingCancellation,
  sendPasswordResetOtp,
};
