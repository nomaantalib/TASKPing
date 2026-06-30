require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const testRegister = async () => {
  console.log('Connecting to database...');
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected.');

    const email = `test-${Date.now()}@example.com`;
    console.log(`Creating user with email: ${email}...`);

    const user = await User.create({
      name: 'Test Bot',
      email: email,
      passwordHash: 'dummyhash123'
    });

    console.log('✅ User created successfully in database!');
    console.log(JSON.stringify(user, null, 2));

    // Clean up
    await User.deleteOne({ _id: user._id });
    console.log('✅ Test user cleaned up.');
  } catch (err) {
    console.error('❌ Database user creation failed:', err);
  } finally {
    await mongoose.disconnect();
  }
};

testRegister();
