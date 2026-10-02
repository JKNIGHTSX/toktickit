import { getPrisma } from "../src/prisma.js";
import bcrypt from "bcryptjs";

// Lab 3 — Seed Categories, Related Systems, Users (Requesters, IT Staff, Admin), Tickets, Comments, and Notes.
// Requirement: running the seed multiple times must be IDEMPOTENT (safe to run repeatedly).
async function main() {
  const prisma = getPrisma();

  // Pre-hash default password for local development
  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);

  // 1. Seed Categories with descriptions
  const categories = [
    { name: "Account and Access", description: "Login, permissions, and account requests" },
    { name: "Hardware", description: "Laptops, monitors, peripherals, and accessories" },
    { name: "Software", description: "Application issues, licenses, and installation" },
    { name: "Network", description: "VPN, Wi-Fi, DNS, and connectivity issues" },
  ];

  const seededCategories: Record<string, number> = {};
  for (const cat of categories) {
    const record = await prisma.category.upsert({
      where: { name: cat.name },
      update: { description: cat.description, isActive: true },
      create: { name: cat.name, description: cat.description, isActive: true },
    });
    seededCategories[cat.name] = record.id;
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

  const seededSystems: Record<string, number> = {};
  for (const sys of relatedSystems) {
    const record = await prisma.relatedSystem.upsert({
      where: { name: sys.name },
      update: { description: sys.description, isActive: true },
      create: { name: sys.name, description: sys.description, isActive: true },
    });
    seededSystems[sys.name] = record.id;
  }
  console.log("Seeded related systems successfully.");

  // 3. Seed Users (Requesters, IT Staff, Administrators)
  const users = [
    // Active Requesters (at least 4)
    {
      name: "Jennifer Anderson",
      email: "jennifer.anderson@toktickit.local",
      department: "Marketing",
      role: "REQUESTER" as const,
      mustChangePassword: false,
      isActive: true,
    },
    {
      name: "Michael Brown",
      email: "michael.brown@toktickit.local",
      department: "Finance",
      role: "REQUESTER" as const,
      mustChangePassword: false,
      isActive: true,
    },
    {
      name: "Sarah Johnson",
      email: "sarah.johnson@toktickit.local",
      department: "Human Resources",
      role: "REQUESTER" as const,
      mustChangePassword: false,
      isActive: true,
    },
    {
      name: "David Lee",
      email: "david.lee@toktickit.local",
      department: "Engineering",
      role: "REQUESTER" as const,
      mustChangePassword: false,
      isActive: true,
    },
    // Inactive Requester (at least 1)
    {
      name: "Inactive Test User",
      email: "inactive.user@toktickit.local",
      department: "Former Employee",
      role: "REQUESTER" as const,
      mustChangePassword: true,
      isActive: false,
    },
    // Active IT Staff (at least 3)
    {
      name: "Tech One",
      email: "tech1@toktickit.local",
      department: "IT Support",
      role: "IT_STAFF" as const,
      mustChangePassword: false,
      isActive: true,
    },
    {
      name: "Tech Two",
      email: "tech2@toktickit.local",
      department: "IT Infrastructure",
      role: "IT_STAFF" as const,
      mustChangePassword: false,
      isActive: true,
    },
    {
      name: "Tech Three",
      email: "tech3@toktickit.local",
      department: "IT Systems",
      role: "IT_STAFF" as const,
      mustChangePassword: false,
      isActive: true,
    },
    // Inactive IT Staff (at least 1)
    {
      name: "Tech Inactive",
      email: "tech_inactive@toktickit.local",
      department: "IT Support",
      role: "IT_STAFF" as const,
      mustChangePassword: true,
      isActive: false,
    },
    // Active Administrator (at least 1)
    {
      name: "John Smith",
      email: "admin@toktickit.local",
      department: "System Administration",
      role: "ADMINISTRATOR" as const,
      mustChangePassword: false,
      isActive: true,
    },
  ];

  const seededUsers: Record<string, any> = {};
  for (const u of users) {
    const record = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        department: u.department,
        role: u.role,
        isActive: u.isActive,
      },
      create: {
        name: u.name,
        email: u.email,
        passwordHash: defaultPasswordHash,
        department: u.department,
        role: u.role,
        mustChangePassword: u.mustChangePassword,
        isActive: u.isActive,
      },
    });
    seededUsers[u.email] = record;
  }
  console.log("Seeded users (Requesters, IT Staff, Administrators) successfully.");

  // 4. Seed Realistic Tickets
  const jennifer = seededUsers["jennifer.anderson@toktickit.local"];
  const michael = seededUsers["michael.brown@toktickit.local"];
  const sarah = seededUsers["sarah.johnson@toktickit.local"];
  const tech1 = seededUsers["tech1@toktickit.local"];
  const tech2 = seededUsers["tech2@toktickit.local"];

  const sampleTickets = [
    {
      ticketNumber: "TKT-2026-000101",
      summary: "Laptop battery drains quickly",
      description: "My laptop battery is draining much faster than usual after last week's Windows update. Needs inspection or replacement.",
      requestedPriority: "MEDIUM" as const,
      itPriority: "MEDIUM" as const,
      status: "IN_PROGRESS" as const,
      requesterId: jennifer.id,
      ownerId: tech1.id,
      categoryId: seededCategories["Hardware"],
      relatedSystemId: seededSystems["Corporate Laptop"],
    },
    {
      ticketNumber: "TKT-2026-000102",
      summary: "Cannot connect to VPN from home",
      description: "VPN client reports authentication failure when attempting connection from home Wi-Fi network.",
      requestedPriority: "HIGH" as const,
      itPriority: "HIGH" as const,
      status: "OPEN" as const,
      requesterId: michael.id,
      ownerId: tech2.id,
      categoryId: seededCategories["Network"],
      relatedSystemId: seededSystems["VPN"],
    },
    {
      ticketNumber: "TKT-2026-000103",
      summary: "Request access to HR Grade Portal",
      description: "Need read-only access to Grade Submission App for end-of-semester auditing.",
      requestedPriority: "LOW" as const,
      itPriority: "LOW" as const,
      status: "NEW" as const,
      requesterId: sarah.id,
      ownerId: null,
      categoryId: seededCategories["Account and Access"],
      relatedSystemId: seededSystems["Grade Submission App"],
    },
    {
      ticketNumber: "TKT-2026-000104",
      summary: "Printer toner low on 3rd floor",
      description: "3rd floor main printer displays low toner warning and faint print output.",
      requestedPriority: "LOW" as const,
      itPriority: "LOW" as const,
      status: "RESOLVED" as const,
      resolutionSummary: "Replaced black toner cartridge and verified test print page.",
      requesterId: jennifer.id,
      ownerId: tech1.id,
      categoryId: seededCategories["Hardware"],
      relatedSystemId: seededSystems["Printer"],
    },
  ];

  for (const t of sampleTickets) {
    const existingTicket = await prisma.ticket.findUnique({
      where: { ticketNumber: t.ticketNumber },
    });

    let ticket;
    if (existingTicket) {
      ticket = await prisma.ticket.update({
        where: { id: existingTicket.id },
        data: {
          summary: t.summary,
          description: t.description,
          requestedPriority: t.requestedPriority,
          itPriority: t.itPriority,
          status: t.status,
          ownerId: t.ownerId,
          resolutionSummary: t.resolutionSummary || null,
        },
      });
    } else {
      ticket = await prisma.ticket.create({
        data: {
          ticketNumber: t.ticketNumber,
          summary: t.summary,
          description: t.description,
          requestedPriority: t.requestedPriority,
          itPriority: t.itPriority,
          status: t.status,
          requesterId: t.requesterId,
          ownerId: t.ownerId,
          categoryId: t.categoryId,
          relatedSystemId: t.relatedSystemId,
          resolutionSummary: t.resolutionSummary || null,
        },
      });
    }

    // Seed sample Public Comments & Internal Notes for TKT-2026-000101
    if (t.ticketNumber === "TKT-2026-000101") {
      const publicCommentsCount = await prisma.publicComment.count({ where: { ticketId: ticket.id } });
      if (publicCommentsCount === 0) {
        await prisma.publicComment.createMany({
          data: [
            {
              ticketId: ticket.id,
              authorId: jennifer.id,
              content: "Just adding that this issue occurs even when I close all background applications.",
            },
            {
              ticketId: ticket.id,
              authorId: tech1.id,
              content: "We are investigating the issue on your device. We will update you shortly.",
            },
          ],
        });
      }

      const internalNotesCount = await prisma.internalNote.count({ where: { ticketId: ticket.id } });
      if (internalNotesCount === 0) {
        await prisma.internalNote.createMany({
          data: [
            {
              ticketId: ticket.id,
              authorId: tech1.id,
              content: "Checked battery health logs remotely. Battery capacity is at 42%. Diagnostics order placed.",
            },
          ],
        });
      }
    }
  }
  console.log("Seeded realistic tickets, public comments, and internal notes successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
