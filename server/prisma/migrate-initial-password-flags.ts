import bcrypt from "bcryptjs";
import { getPrisma } from "../src/prisma.js";

const migrationName = "20261017_all_roles_initial_password_required";
const initialPassword = process.env.SEED_INITIAL_PASSWORD ?? "Password123!";

async function main() {
  const prisma = getPrisma();

  const updatedCount = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      CREATE TABLE IF NOT EXISTS "_toktickit_data_migrations" (
        "name" TEXT PRIMARY KEY,
        "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const applied = await tx.$queryRaw<{ name: string }[]>`
      SELECT "name"
      FROM "_toktickit_data_migrations"
      WHERE "name" = ${migrationName}
      LIMIT 1
    `;
    if (applied.length > 0) return null;

    const candidates = await tx.user.findMany({
      where: { isActive: true, mustChangePassword: false },
      select: { id: true, passwordHash: true },
    });

    let updated = 0;
    for (const user of candidates) {
      if (!(await bcrypt.compare(initialPassword, user.passwordHash))) continue;

      const result = await tx.user.updateMany({
        where: { id: user.id, isActive: true, mustChangePassword: false },
        data: { mustChangePassword: true },
      });
      updated += result.count;
    }

    await tx.$executeRaw`
      INSERT INTO "_toktickit_data_migrations" ("name")
      VALUES (${migrationName})
    `;
    return updated;
  });

  if (updatedCount === null) {
    console.log(`Data migration ${migrationName} was already applied.`);
  } else {
    console.log(`Marked ${updatedCount} active accounts with the initial password as requiring a change.`);
  }
}

main()
  .catch((error) => {
    console.error("Failed to migrate initial-password account flags:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
