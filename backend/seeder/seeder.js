const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '../config/.env') });

const connectDatabase = require('../config/db');
const User = require('../models/User');
const Product = require('../models/Product');
const buildSampleProducts = require('./products');

const adminSeed = {
  name: process.env.SEED_ADMIN_NAME || 'Infinite Pulls Admin',
  email: process.env.SEED_ADMIN_EMAIL || 'admin@infinitepulls.com',
  password: process.env.SEED_ADMIN_PASSWORD || 'Admin123!',
  role: 'admin',
  isVerified: true,
  isActive: true,
  authProvider: 'local',
  contact: process.env.SEED_ADMIN_CONTACT || '09171234567',
  address: {
    city: 'Quezon City',
    barangay: 'Bagumbayan',
    street: 'Collector Avenue',
    zipcode: '1110',
  },
  avatar: {
    public_id: 'seed_admin_avatar',
    url: 'https://res.cloudinary.com/demo/image/upload/v1690000000/default-avatar.png',
  },
};

const importData = async () => {
  try {
    connectDatabase();
    await mongoose.connection.asPromise();

    await Product.deleteMany({});

    let adminUser = await User.findOne({ email: adminSeed.email });
    const createdAdmin = !adminUser;

    if (!adminUser) {
      adminUser = new User(adminSeed);
      await adminUser.save();
    } else {
      adminUser.name = adminSeed.name;
      adminUser.role = 'admin';
      adminUser.isVerified = true;
      adminUser.isActive = true;
      adminUser.authProvider = 'local';
      adminUser.contact = adminSeed.contact;
      adminUser.address = adminSeed.address;
      adminUser.avatar = adminSeed.avatar;

      if (process.env.SEED_RESET_ADMIN_PASSWORD === 'true') {
        adminUser.password = adminSeed.password;
      }

      await adminUser.save();
    }

    const products = buildSampleProducts(adminUser._id);
    await Product.insertMany(products);

    console.log('Seed import complete');
    console.log(`Admin email: ${adminSeed.email}`);
    console.log(`Admin password: ${process.env.SEED_RESET_ADMIN_PASSWORD === 'true' || createdAdmin ? adminSeed.password : '(unchanged existing password)'}`);
    console.log(`Products inserted: ${products.length}`);

    process.exit(0);
  } catch (error) {
    console.error(`Seed import failed: ${error.message}`);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    connectDatabase();
    await mongoose.connection.asPromise();

    await Product.deleteMany({});
    await User.deleteOne({ email: adminSeed.email });

    console.log('Seed data destroyed');
    process.exit(0);
  } catch (error) {
    console.error(`Seed destroy failed: ${error.message}`);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}
