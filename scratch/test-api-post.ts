import http from "http";

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

const req = http.request(
  {
    hostname: "localhost",
    port: 3000,
    path: "/api/admin/users",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // We might need to mock auth... wait, the API uses Next-Auth `getCurrentUser()`.
    }
  },
  (res) => {
    let data = "";
    res.on("data", (chunk) => data += chunk);
    res.on("end", () => {
      console.log("Status:", res.statusCode);
      console.log("Response:", data);
    });
  }
);

req.on("error", (e) => console.error(e));
req.write(JSON.stringify(payload));
req.end();
