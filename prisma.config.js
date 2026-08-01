require('dotenv').config();

const prismaConfig = require('@prisma/config');
const defineConfig = prismaConfig.defineConfig || prismaConfig.default?.defineConfig || ((c) => c);

module.exports = defineConfig({
    datasource: {
      url: process.env.DATABASE_URL,
  },
});