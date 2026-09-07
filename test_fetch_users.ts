import mongoose from "mongoose";
import User from "./models/User";
import Workspace from "./models/Workspace";
import WorkspaceMember from "./models/WorkspaceMember";

async function test() {
  await mongoose.connect("mongodb://127.0.0.1:27017/daily_report");
  
  const workspace = await Workspace.findOne({ name: "Acme Industries" });
  if (!workspace) {
    console.log("No workspace found");
    process.exit(1);
  }
  
  const workspaceId = workspace._id;
  console.log("Workspace ID:", workspaceId);
  
  const members = await WorkspaceMember.find({ workspaceId }).select("userId role department displayTeamName");
  console.log("Members:", members);
  
  process.exit(0);
}

test();
