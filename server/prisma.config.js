// prisma.config.js — Required for Prisma 7
// Uses @prisma/config which is bundled with @prisma/client@7.x
import 'dotenv/config';
import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },
});
