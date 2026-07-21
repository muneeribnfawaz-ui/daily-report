const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

// Try loading env vars from .env.local
const envPath = path.resolve(__dirname, ".env.local");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf8");
  envConfig.split("\n").forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2].trim();
    }
  });
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not defined in .env.local or process.env");
  process.exit(1);
}

// User Schema (matching updated structure)
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true },
    departments: {
      type: [
        {
          name: { type: String, required: true },
          subTeams: { type: [String], default: [] },
        },
      ],
      default: [],
    },
    status: { type: String, default: "active" },
  },
  { strict: false }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

// TeamType Schema (Taxonomy)
const TeamTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    showName: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: String, default: "System" },
  },
  { strict: false }
);

const TeamType = mongoose.models.TeamType || mongoose.model("TeamType", TeamTypeSchema);

const DEFAULT_DEPARTMENTS = [
  { name: "CONSTRUCTION", showName: "Construction" },
  { name: "SOFTWARE", showName: "Software" },
  { name: "FINANCE", showName: "Finance" },
  { name: "MARKETING", showName: "Marketing", subTeams: ["Physical", "Digital"] },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB.");

    // 1. Seed Team Types (Taxonomy)
    console.log("Seeding departments taxonomy...");
    for (const dept of DEFAULT_DEPARTMENTS) {
      await TeamType.findOneAndUpdate(
        { name: dept.name },
        {
          $set: {
            showName: dept.showName,
            subTeams: dept.subTeams || [],
            isActive: true,
            isDeleted: false,
            createdBy: "System",
          },
        },
        { upsert: true, new: true }
      );
    }
    console.log("Departments taxonomy seeded successfully.");

    // 2. Seed Default Admin
    console.log("Seeding default admin...");
    const adminEmail = "admin@gmail.com";
    const adminPassword = "Admin@123@";

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    await User.findOneAndUpdate(
      { email: adminEmail },
      {
        $set: {
          name: "Admin",
          password: hashedPassword,
          role: "admin",
          departments: [
            {
              name: "Software",
              subTeams: [],
            },
          ],
          status: "active",
        },
      },
      { upsert: true, new: true }
    );
    console.log(`Default admin seeded successfully. (Email: ${adminEmail} | Password: ${adminPassword})`);

  } catch (error) {
    console.error("Error during seeding:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

seed();
