const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Migrating Team Types workspaceId assignment...");

  const teamTypes = await prisma.teamType.findMany();
  console.log(`Found ${teamTypes.length} team types to process.`);

  const users = await prisma.user.findMany({
    include: {
      workspaceMembers: {
        include: {
          workspace: true
        }
      }
    }
  });

  const companies = await prisma.workspace.findMany({
    where: { type: "company" },
    include: { members: { include: { user: true } } }
  });

  for (const tt of teamTypes) {
    if (tt.workspaceId) {
      console.log(`TeamType ${tt.name} already has workspaceId: ${tt.workspaceId}`);
      continue;
    }

    let assignedWorkspaceId = null;

    // 1. Try matching createdBy with user name / email / id
    const creator = users.find(u => 
      u.name.toLowerCase() === (tt.createdBy || "").toLowerCase() ||
      u.email.toLowerCase() === (tt.createdBy || "").toLowerCase() ||
      u.id === tt.createdBy
    );

    if (creator) {
      const companyMemberships = creator.workspaceMembers.filter(m => m.workspace && m.workspace.type === "company");
      if (companyMemberships.length === 1) {
        assignedWorkspaceId = companyMemberships[0].workspaceId;
      } else if (companyMemberships.length > 1) {
        // Try finding membership matching department or team
        const match = companyMemberships.find(m => 
          m.teamNames?.includes(tt.name) ||
          m.departments?.some(d => d.name === tt.department)
        );
        assignedWorkspaceId = match ? match.workspaceId : companyMemberships[0].workspaceId;
      }
    }

    // 2. If not assigned, check which company has members using this team name
    if (!assignedWorkspaceId) {
      for (const comp of companies) {
        const hasMemberWithTeam = comp.members.some(m => m.teamNames?.includes(tt.name));
        if (hasMemberWithTeam) {
          assignedWorkspaceId = comp.id;
          break;
        }
      }
    }

    // 3. Fallback: specific known seed mappings if any
    if (!assignedWorkspaceId) {
      if (["WEB", "MOBILE", "FINANCE", "MARKETING", "ENGINEERING"].includes(tt.name)) {
        const mif = companies.find(c => c.name.toLowerCase().includes("mif"));
        if (mif) assignedWorkspaceId = mif.id;
      } else if (["MOBILE_TEAM"].includes(tt.name)) {
        const absal = companies.find(c => c.name.toLowerCase().includes("absalkhan"));
        if (absal) assignedWorkspaceId = absal.id;
      }
    }

    if (assignedWorkspaceId) {
      await prisma.teamType.update({
        where: { id: tt.id },
        data: { workspaceId: assignedWorkspaceId }
      });
      console.log(`Updated TeamType "${tt.name}" (${tt.showName}) -> workspaceId: ${assignedWorkspaceId}`);
    } else {
      console.warn(`Could not determine workspaceId for TeamType "${tt.name}". Left as null.`);
    }
  }

  console.log("Team Types migration completed successfully.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
