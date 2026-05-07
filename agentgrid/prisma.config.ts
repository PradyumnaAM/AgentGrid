import path from 'node:path';
import { defineConfig } from 'prisma/config';

const localDbPath = path.resolve(process.cwd(), 'dev.db').split('\\').join('/');

export default defineConfig({
  // @ts-expect-error - earlyAccess is a runtime flag not yet in TS types
  earlyAccess: true,
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL ?? `file:${localDbPath}`,
    ...(process.env.DATABASE_AUTH_TOKEN ? { authToken: process.env.DATABASE_AUTH_TOKEN } : {}),
  },
});
