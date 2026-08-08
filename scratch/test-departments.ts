import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import User from "../models/User";

const envPath = path.resolve(process.cwd(), ".env.local");
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

async function testUserDepartments() {
  try {
    await mongoose.connect(MONGODB_URI as string);
    console.log("Connected to MongoDB");

    const payload = {
      name: "Test Dept User",
      email: "dept2@gmail.com",
      phone: "9999999999",
      password: "pass",
      role: "team_member",
      departments: [
        {
          name: "Finance",
          subTeams: []
        }
      ]
    };

    const newUser = await User.create(payload);
    console.log("Created user departments:", newUser.departments);
    
    const fetched = await User.findById(newUser._id).lean();
    console.log("Fetched user departments:", fetched.departments);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

testUserDepartments();
