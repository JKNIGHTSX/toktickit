import { getPrisma } from "../src/prisma.js";

// Lab 2 (Issue 2) — Seed Categories, Related Systems, and Development Requesters.
// Requirement: running the seed multiple times must NOT create duplicates.
async function main() {
  const prisma = getPrisma();

  // 1. Seed Categories with descriptions
  const categories = [
    { name: "Account and Access", description: "Login, permissions, and account requests" },
    { name: "Hardware", description: "Laptops, monitors, peripherals, and accessories" },
    { name: "Software", description: "Application issues, licenses, and installation" },
    { name: "Network", description: "VPN, Wi-Fi, DNS, and connectivity issues" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: { description: cat.description, isActive: true },
      create: { name: cat.name, description: cat.description, isActive: true },
    });
  }
  console.log("Seeded categories successfully.");

  // 2. Seed Related Systems
  const relatedSystems = [
    { name: "Email", description: "Corporate email and inbox service" },
    { name: "Campus Wi-Fi", description: "Wireless network access on campus" },
    { name: "VPN", description: "Virtual private network remote access" },
    { name: "LEB2 App", description: "Learning environment portal" },
    { name: "Grade Submission App", description: "Academic grade management app" },
    { name: "Printer", description: "Networked office printers and scanners" },
    { name: "Corporate Laptop", description: "Company-issued laptop hardware" },
  ];

  for (const sys of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name: sys.name },
      update: { description: sys.description, isActive: true },
      create: { name: sys.name, description: sys.description, isActive: true },
    });
  }
  console.log("Seeded related systems successfully.");

  // 3. Seed Development Requesters
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
