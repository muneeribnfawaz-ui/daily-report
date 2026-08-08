const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

// Load env vars from .env.local
const envPath = path.resolve(__dirname, "../.env.local");
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
  console.error("MONGODB_URI is not defined in .env.local");
  process.exit(1);
}

// Minimal User Schema
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
    roleTypes: { type: [String], default: [] },
    teamName: { type: String },
    teamNames: { type: [String], default: [] },
    managerName: { type: String, default: "" },
    status: { type: String, default: "active" },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    isAdminActive: { type: Boolean, default: false },
    isEmailActivated: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

const USERS_TO_SEED = [
  {
    name: "HOD",
    email: "hod@gmail.com",
    password: "Hod@12345",
    role: "hod",
    departments: [
      { name: "Construction", subTeams: [] },
      { name: "Software", subTeams: [] },
      { name: "Finance", subTeams: [] },
      { name: "Marketing", subTeams: ["Physical", "Digital"] }
    ],
    roleTypes: ["Project Manager", "Technical Lead", "Financial Analyst", "Content Strategist"],
    teamName: "Admin",
    teamNames: ["Admin"],
    managerName: ""
  },
  {
    name: "Team Lead",
    email: "team@gmail.com",
    password: "Team@12345",
    role: "team_lead",
    departments: [{ name: "Construction", subTeams: [] }],
    roleTypes: ["Project Manager"],
    managerName: "HOD"
  },
  {
    name: "Team Member",
    email: "member@gmail.com",
    password: "Member@12345",
    role: "team_member",
    departments: [{ name: "Construction", subTeams: [] }],
    roleTypes: ["Civil Engineer"],
    managerName: "Team Lead"
  },
  {
    name: "Team Member 2",
    email: "mem@gmail.com",
    password: "Member@12345",
    role: "team_member",
    departments: [{ name: "Construction", subTeams: [] }],
    roleTypes: ["Structural Engineer"],
    managerName: "Team Lead"
  },
  {
    name: "Report Manager",
    email: "report@gmail.com",
    password: "Report@12345",
    role: "report_manager",
    departments: [{ name: "Software", subTeams: [] }],
    roleTypes: [],
    managerName: "HOD"
  },
  {
    name: "CEO",
    email: "ceo@gmail.com",
    password: "Ceo@12345",
    role: "ceo",
    departments: [
      { name: "Construction", subTeams: [] },
      { name: "Software", subTeams: [] },
      { name: "Finance", subTeams: [] },
      { name: "Marketing", subTeams: ["Physical", "Digital"] }
    ],
    roleTypes: ["Project Manager", "Technical Lead", "Financial Analyst", "Content Strategist"],
    managerName: ""
  },
  {
    name: "Finance Team",
    email: "fin@gmail.com",
    password: "Finance@12345",
    role: "finance_team",
    departments: [{ name: "Finance", subTeams: [] }],
    roleTypes: ["Accountant"],
    teamName: "FINANCE_TEAM",
    teamNames: ["FINANCE_TEAM"],
    managerName: "HOD"
  }
];

async function runSeed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB.");

    for (const u of USERS_TO_SEED) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(u.password, salt);

      const userPayload = {
        name: u.name,
        email: u.email.toLowerCase(),
        password: hashedPassword,
        role: u.role,
        departments: u.departments,
        roleTypes: u.roleTypes,
        teamName: u.teamName || "",
        teamNames: u.teamNames || [],
        managerName: u.managerName || "",
        status: "active",
        isActive: true,
        isDeleted: false,
        isAdminActive: true,
        isEmailActivated: true
      };

      await User.findOneAndUpdate(
        { email: u.email.toLowerCase() },
        { $set: userPayload },
        { upsert: true, new: true }
      );
      console.log(`Successfully seeded user: ${u.email} (${u.role})`);
    }

    console.log("All requested users have been successfully seeded/updated.");
  } catch (error) {
    console.error("Error during seeding additional users:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runSeed();
