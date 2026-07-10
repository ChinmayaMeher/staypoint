require('dotenv').config();
const { sendPasswordResetOtp } = require('./utils/email');

async function test() {
  try {
    const user = { email: 'test@example.com', fullName: 'Test User' };
    const otp = '123456';
    console.log('Sending email with USER:', process.env.EMAIL_USER);
    await sendPasswordResetOtp(user, otp);
    console.log('Done.');
  } catch (err) {
    console.error(err);
  }
}
test();
