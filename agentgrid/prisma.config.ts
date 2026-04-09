import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  // @ts-expect-error - earlyAccess is a runtime flag not yet in TS types
  earlyAccess: true,
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: 'file:./dev.db',
  },
});
