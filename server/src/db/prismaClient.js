import { PrismaClient } from "@prisma/client";

// Single shared PrismaClient instance for the whole backend.
// Every service module must import this instance instead of calling
// `new PrismaClient()` itself, to avoid exhausting Postgres's connection pool.
const prisma = new PrismaClient();

export default prisma;
