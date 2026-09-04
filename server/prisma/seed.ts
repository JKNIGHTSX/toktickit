import { getPrisma } from "../src/prisma.js";

// Lab 1 (Issue 3) — seed the four supported categories.
// The four names are: Account and Access, Hardware, Software, Network.
// Lab 2 (Issue 1) — seed active and inactive Development Requesters.
// Requirement: running the seed multiple times must NOT create duplicates.
async function main() {
  const prisma = getPrisma();

  // 1. Seed Categories
  const categories = [
    "Account and Access",
    "Hardware",
    "Software",
    "Network",
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("Seeded categories successfully.");

  // 2. Seed Development Requesters
  const requesters = [
    {
      name: "Jennifer Anderson",
      email: "jennifer.anderson@toktickit.local",
      department: "Marketing",
      isActive: true,
    },
    {
      name: "Michael Brown",
      email: "michael.brown@toktickit.local",
      department: "Finance",
      isActive: true,
    },
    {
      name: "Sarah Johnson",
      email: "sarah.johnson@toktickit.local",
      department: "Human Resources",
      isActive: true,
    },
    {
      name: "David Lee",
      email: "david.lee@toktickit.local",
      department: "Engineering",
      isActive: true,
    },
    {
      name: "Inactive Test User",
      email: "inactive.user@toktickit.local",
      department: "Former Employee",
      isActive: false,
    },
  ];

  for (const req of requesters) {
    await prisma.requesterUser.upsert({
      where: { email: req.email },
      update: {
        name: req.name,
        department: req.department,
        isActive: req.isActive,
      },
      create: {
        name: req.name,
        email: req.email,
        department: req.department,
        isActive: req.isActive,
      },
    });
  }
  console.log("Seeded development requesters successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });

