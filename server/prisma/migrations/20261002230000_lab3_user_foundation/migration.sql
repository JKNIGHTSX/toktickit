-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');

-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'WAITING_FOR_REQUESTER';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'REOPENED';

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "tickets_requesterId_fkey";
ALTER TABLE "attachments" DROP CONSTRAINT IF EXISTS "attachments_removedByRequesterId_fkey";

-- CreateTable users
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'REQUESTER',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Migrate data from requester_users into users if requester_users exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'requester_users') THEN
        INSERT INTO "users" ("id", "email", "passwordHash", "name", "department", "role", "mustChangePassword", "isActive", "createdAt", "updatedAt")
        SELECT "id", "email", '$2a$10$w8T.uWd6T9Fz1O7Lq.1Z4O.O9xGvYJ/02T.8W8T.uWd6T9Fz1O7Lq', "name", "department", 'REQUESTER'::"UserRole", true, "isActive", "createdAt", "updatedAt"
        FROM "requester_users"
        ON CONFLICT ("id") DO NOTHING;
    END IF;
END $$;

-- DropTable requester_users
DROP TABLE IF EXISTS "requester_users";

-- CreateTable public_comments
CREATE TABLE "public_comments" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable internal_notes
CREATE TABLE "internal_notes" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_notes_pkey" PRIMARY KEY ("id")
);

-- AlterTable tickets
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "ownerId" INTEGER;

-- AlterTable attachments
ALTER TABLE "attachments" RENAME COLUMN "removedByRequesterId" TO "removedByUserId";

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_role_isActive_idx" ON "users"("role", "isActive");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "tickets_ownerId_idx" ON "tickets"("ownerId");
CREATE INDEX "public_comments_ticketId_createdAt_idx" ON "public_comments"("ticketId", "createdAt" ASC);
CREATE INDEX "internal_notes_ticketId_createdAt_idx" ON "internal_notes"("ticketId", "createdAt" ASC);

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public_comments" ADD CONSTRAINT "public_comments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public_comments" ADD CONSTRAINT "public_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_removedByUserId_fkey" FOREIGN KEY ("removedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
