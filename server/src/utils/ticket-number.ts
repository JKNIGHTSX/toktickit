import { PrismaClient } from "@prisma/client";

/**
 * Generates a unique server-side Ticket Number formatted as TKT-YYYY-NNNNNN.
 * e.g., TKT-2026-000001
 */
export async function generateTicketNumber(prisma: PrismaClient, yearOverride?: number): Promise<string> {
  const year = yearOverride ?? new Date().getFullYear();
  const prefix = `TKT-${year}-`;

  // Find the ticket with the highest ticket number for the current year
  const latestTicket = await prisma.ticket.findFirst({
    where: {
      ticketNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      ticketNumber: "desc",
    },
    select: {
      ticketNumber: true,
    },
  });

  let nextSequence = 1;

  if (latestTicket && latestTicket.ticketNumber) {
    const parts = latestTicket.ticketNumber.split("-");
    if (parts.length === 3) {
      const parsedSeq = parseInt(parts[2], 10);
      if (!isNaN(parsedSeq)) {
        nextSequence = parsedSeq + 1;
      }
    }
  }

  let ticketNumber = `${prefix}${String(nextSequence).padStart(6, "0")}`;

  // Collision safety loop
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    const existing = await prisma.ticket.findUnique({
      where: { ticketNumber },
    });

    if (!existing) {
      isUnique = true;
    } else {
      nextSequence += 1;
      ticketNumber = `${prefix}${String(nextSequence).padStart(6, "0")}`;
      attempts += 1;
    }
  }

  return ticketNumber;
}
