const { createRequire } = require("node:module");
const path = require("node:path");

const requireFromServer = createRequire(path.join(process.cwd(), "server", "package.json"));
const { PrismaClient } = requireFromServer("@prisma/client");
const bcrypt = requireFromServer("bcryptjs");

const seededAccountEmails = [
  "jennifer.anderson@toktickit.local",
  "michael.brown@toktickit.local",
  "sarah.johnson@toktickit.local",
  "david.lee@toktickit.local",
  "inactive.user@toktickit.local",
  "tech1@toktickit.local",
  "tech2@toktickit.local",
  "tech3@toktickit.local",
  "tech_inactive@toktickit.local",
  "admin@toktickit.local",
];

module.exports = async function globalSetup() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Set DATABASE_URL to an isolated *_test database before running Playwright.");
  }

  const databaseName = decodeURIComponent(new URL(databaseUrl).pathname.slice(1));
  if (!databaseName.endsWith("_test")) {
    throw new Error(`Playwright refuses to change seeded accounts in non-test database "${databaseName}".`);
  }

  const prisma = new PrismaClient();
  try {
    const seededAccountCount = await prisma.user.count({
      where: { email: { in: seededAccountEmails } },
    });
    if (seededAccountCount !== seededAccountEmails.length) {
      throw new Error("The isolated E2E database is not fully seeded. Apply migrations and run prisma:seed first.");
    }

    await prisma.user.updateMany({
      where: { email: { in: seededAccountEmails } },
      data: {
        passwordHash: bcrypt.hashSync("Password123!", 10),
        mustChangePassword: false,
      },
    });
  } finally {
    await prisma.$disconnect();
  }
};
