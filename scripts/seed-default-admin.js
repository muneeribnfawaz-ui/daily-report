const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const appData = require('../config/app-data.json');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2].trim();
    }
  });
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in .env.local');
  process.exit(1);
}

// Define the User model for seeding
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  teamName: { type: String, required: true },
  status: { type: String, default: 'active' }
}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    const defaultAdmin = appData.defaultAdmin;
    const existingAdmin = await User.findOne({ email: defaultAdmin.email });

    if (existingAdmin) {
      console.log(`Admin user (${defaultAdmin.email}) already exists. Updating password...`);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(defaultAdmin.password, salt);
      existingAdmin.password = hashedPassword;
      await existingAdmin.save();
      console.log('Admin password reset successfully to the one in app-data.json.');
    } else {
      console.log('Admin user not found. Creating a new admin user...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(defaultAdmin.password, salt);
      
      const newAdmin = new User({
        ...defaultAdmin,
        password: hashedPassword,
        status: 'active'
      });
      await newAdmin.save();
      console.log('Admin user created successfully.');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

seed();
