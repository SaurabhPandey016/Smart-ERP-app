import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Create PostgreSQL adapter required by Prisma v7+ when using the "client" engine
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV !== 'production' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
