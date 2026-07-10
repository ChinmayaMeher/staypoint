const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

async function test() {
  const jar = new CookieJar();
  const client = wrapper(axios.create({ jar, baseURL: 'http://localhost:8080', validateStatus: () => true }));

  try {
    // 1. Get forgot password to set initial session and get CSRF
    const res1 = await client.get('/forgot-password');
    const csrfMatch = res1.data.match(/name="_token" value="([^"]+)"/);
    if (!csrfMatch) throw new Error("CSRF token not found");
    const csrfToken = csrfMatch[1];
    
    console.log("Got CSRF:", csrfToken);

    // 2. Submit forgot password
    const res2 = await client.post('/forgot-password', 
      `_token=${csrfToken}&email=chinmayameher69%40gmail.com`, 
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, maxRedirects: 0 }
    );
    console.log("Forgot Password POST status:", res2.status, res2.headers.location);

    // 3. Get OTP from DB
    const mongoose = require('mongoose');
    require('dotenv').config();
    await mongoose.connect(process.env.MONGO_URL);
    const User = require('./models/user');
    const user = await User.findOne({ email: 'chinmayameher69@gmail.com' });
    const otp = user.resetOtp;
    console.log("Got OTP from DB:", otp);

    // 4. Verify OTP
    const res3 = await client.post('/verify-otp',
      `_token=${csrfToken}&otp=${otp}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, maxRedirects: 0 }
    );
    console.log("Verify OTP POST status:", res3.status, res3.headers.location);

    // 5. Follow redirect to reset-password
    const res4 = await client.get('/reset-password', { maxRedirects: 0 });
    console.log("Reset Password GET status:", res4.status, res4.headers.location);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
test();
