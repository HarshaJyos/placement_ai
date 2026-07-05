import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

declare global {
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  prisma = new PrismaClient({ adapter });
} else {
  if (!global.prisma) {
    const dbPath = path.join(process.cwd(), "prisma", "dev.db");
    const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
    global.prisma = new PrismaClient({ adapter });
  }
  prisma = global.prisma;
}

export { prisma };
export default prisma;
