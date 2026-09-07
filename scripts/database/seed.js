const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

const DEFAULT_TEAM_TYPES = [];

async function seed() {
  try {
    console.log("Connected to PostgreSQL via Prisma.");

    // 1. Seed Team Types
    console.log("Seeding team types...");
    for (const team of DEFAULT_TEAM_TYPES) {
      await prisma.teamType.upsert({
        where: { name: team.name },
        update: {
          showName: team.showName,
          department: team.department,
          subTeams: team.subTeams || [],
          isActive: true,
          isDeleted: false,
          createdBy: "System",
        },
        create: {
          name: team.name,
          showName: team.showName,
          department: team.department,
          subTeams: team.subTeams || [],
          isActive: true,
          isDeleted: false,
          createdBy: "System",
        },
      });
    }
    console.log("Team types seeded successfully.");

    // 2. Seed Default Admin
    console.log("Seeding default admin...");
    const adminEmail = "admin@gmail.com";
    const adminPassword = "Admin@123@";

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        name: "Admin",
        password: hashedPassword,
        role: "admin",
      },
      create: {
        email: adminEmail,
        name: "Admin",
        password: hashedPassword,
        role: "admin",
      },
    });
    console.log(`Default admin seeded successfully. (Email: ${adminEmail} | Password: ${adminPassword})`);

  } catch (error) {
    console.error("Error during seeding:", error);
  } finally {
    await prisma.$disconnect();
    console.log("Disconnected from PostgreSQL.");
  }
}

seed();
