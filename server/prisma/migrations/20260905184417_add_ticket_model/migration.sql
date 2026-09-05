-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('NEW', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "tickets" (
    "id" SERIAL NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "requesterId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "relatedSystemId" INTEGER NOT NULL,
    "summary" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "requestedPriority" "PriorityLevel" NOT NULL DEFAULT 'MEDIUM',
    "itPriority" "PriorityLevel",
    "status" "TicketStatus" NOT NULL DEFAULT 'NEW',
    "ticketOwnerName" TEXT,
    "resolutionSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticketNumber_key" ON "tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX "tickets_requesterId_createdAt_idx" ON "tickets"("requesterId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "tickets_ticketNumber_idx" ON "tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX "tickets_categoryId_idx" ON "tickets"("categoryId");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "requester_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_relatedSystemId_fkey" FOREIGN KEY ("relatedSystemId") REFERENCES "related_systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
