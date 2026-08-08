import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import FinanceReport from "../models/FinanceReport";
import User from "../models/User";
import { FINANCE_TEAM_INTERNAL_NAME } from "../lib/team-types";
import { getINRtoSARRate } from "../lib/currency";

// Load environment variables
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

async function testFinanceCreate() {
  try {
    await mongoose.connect(MONGODB_URI as string);
    console.log("Connected to MongoDB");

    // 1. Create a dummy finance user to submit the report
    const financeUser = await User.findOneAndUpdate(
      { email: "finance@gmail.com" },
      {
        name: "Finance User",
        email: "finance@gmail.com",
        password: "pass", // Mock
        role: "engineer", // or whatever allows creating
        departments: [
          { name: "Finance", subTeams: [] } // Finance user
        ],
        status: "active"
      },
      { upsert: true, new: true }
    );

    // 2. Fetch exchange rate
    const exchangeRate = await getINRtoSARRate();
    console.log("Exchange Rate:", exchangeRate);

    // 3. Mock Report Data
    const reportDate = new Date();
    const dayStart = new Date(reportDate);
    dayStart.setUTCHours(0, 0, 0, 0);

    const reportPayload = {
      reportDate: dayStart,
      submittedBy: financeUser._id,
      submittedByName: financeUser.name,
      expenses: [],
      receipts: [],
      payments: [],
      bankBalances: [],
      cashBalance: {
        totalReceipts: 0,
        totalPayments: 0,
        closingBalance: 0
      },
      nextDayApprovals: [],
      summary: {
        totalReceipts: 0,
        totalPayments: 0,
        bankBalance: 0
      },
      exchangeRate,
      status: "pending",
      statusHistory: [
        {
          status: "pending",
          by: financeUser._id,
          byName: financeUser.name,
          timestamp: new Date()
        }
      ]
    };

    // 4. Create the report
    const report = await FinanceReport.create(reportPayload);
    console.log("Finance Report Created Successfully:", report._id);

  } catch (error) {
    console.error("Error creating finance report:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

testFinanceCreate();
