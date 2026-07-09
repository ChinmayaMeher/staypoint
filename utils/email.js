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
 */
async function sendPasswordResetOtp(user, otp) {
  try {
    const t = await setupTransporter();
    const info = await t.sendMail({
      from: '"StayPoint Security" <no-reply@staypoint.com>',
      to: user.email,
      subject: `Password Reset OTP: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #c8622a;">Reset Your Password</h2>
          <p>Hi ${user.fullName || user.username},</p>
          <p>We received a request to reset your password. Use the following One-Time Password (OTP) to proceed:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="background-color: #f2eae0; color: #3a2318; padding: 15px 30px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px;">${otp}</span>
          </div>
          <p>This OTP is valid for the next 10 minutes. If you did not request a password reset, please ignore this email.</p>
          <p>Thank you,<br>The StayPoint Team</p>
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
