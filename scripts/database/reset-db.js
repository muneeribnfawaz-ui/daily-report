const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

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

async function resetDb() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB for reset.");
    
    console.log("Dropping the entire database...");
    await mongoose.connection.db.dropDatabase();
    console.log("Database dropped successfully.");
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

resetDb();
