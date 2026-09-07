const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const appData = require('../config/app-data.json');

const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('Connected to PostgreSQL via Prisma.');

    const defaultAdmin = appData.defaultAdmin;
    const existingAdmin = await prisma.user.findUnique({ where: { email: defaultAdmin.email } });

    if (existingAdmin) {
      console.log(`Admin user (${defaultAdmin.email}) already exists. Updating password...`);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(defaultAdmin.password, salt);
      
      await prisma.user.update({
        where: { email: defaultAdmin.email },
        data: { password: hashedPassword }
      });
      console.log('Admin password reset successfully to the one in app-data.json.');
    } else {
      console.log('Admin user not found. Creating a new admin user...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(defaultAdmin.password, salt);
      
      await prisma.user.create({
        data: {
          email: defaultAdmin.email,
          name: defaultAdmin.name,
          role: defaultAdmin.role,
          password: hashedPassword,
        }
      });
      console.log('Admin user created successfully.');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  } finally {
    await prisma.$disconnect();
    console.log('Disconnected from PostgreSQL.');
  }
}

seed();
