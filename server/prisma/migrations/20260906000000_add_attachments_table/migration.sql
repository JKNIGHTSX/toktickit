-- Restore the Lab 2 attachment table for clean installs before the Lab 3
-- migration renames its requester-removal relationship.
CREATE TABLE IF NOT EXISTS "attachments" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storedFileName" TEXT NOT NULL,
    "fileMimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "isRemoved" BOOLEAN NOT NULL DEFAULT false,
    "removedReason" VARCHAR(255),
    "removedAt" TIMESTAMP(3),
    "removedByRequesterId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "attachments_storedFileName_key"
    ON "attachments"("storedFileName");
CREATE INDEX IF NOT EXISTS "attachments_ticketId_isRemoved_idx"
    ON "attachments"("ticketId", "isRemoved");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'attachments_ticketId_fkey'
          AND conrelid = '"attachments"'::regclass
    ) THEN
        ALTER TABLE "attachments"
            ADD CONSTRAINT "attachments_ticketId_fkey"
            FOREIGN KEY ("ticketId") REFERENCES "tickets"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'attachments'
          AND column_name = 'removedByRequesterId'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'attachments_removedByRequesterId_fkey'
          AND conrelid = '"attachments"'::regclass
    ) THEN
        ALTER TABLE "attachments"
            ADD CONSTRAINT "attachments_removedByRequesterId_fkey"
            FOREIGN KEY ("removedByRequesterId") REFERENCES "requester_users"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
