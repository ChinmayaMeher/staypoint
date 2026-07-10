require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user');

async function checkUsers() {
  await mongoose.connect(process.env.MONGO_URL);
  const users = await User.find({}, 'email username');
  console.log(users);
  process.exit();
}
checkUsers();
