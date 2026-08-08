import { adminCreateUserSchema, adminUpdateUserSchema } from "../lib/validation";

const payload = {
  firstName: "Test",
  lastName: "API",
  phone: "1122334455",
  empID: "T123",
  role: "team_member",
  roleTypes: ["Backend Engineer"],
  teamNames: ["FINANCE_TEAM"],
  departments: [
    { name: "Software", subTeams: [] }
  ],
  managerName: "Admin",
  email: "testapi@gmail.com",
  password: "Password@123"
};

const parsed = adminCreateUserSchema.safeParse(payload);
console.log("Create Parsed Success:", parsed.success);
if (parsed.success) {
  console.log("Create Parsed Departments:", parsed.data.departments);
} else {
  console.log("Create Errors:", parsed.error.issues);
}

const updatePayload = {
  role: "team_member",
  departments: [
    { name: "Finance" }
  ]
};

const updateParsed = adminUpdateUserSchema.safeParse(updatePayload);
console.log("Update Parsed Success:", updateParsed.success);
if (updateParsed.success) {
  console.log("Update Parsed Departments:", updateParsed.data.departments);
} else {
  console.log("Update Errors:", updateParsed.error.issues);
}
