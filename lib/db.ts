import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// We use global.prisma to prevent connection leaks during Next.js hot reloads in development.
const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;

