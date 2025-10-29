import { PrismaClient } from '@prisma/client'

export function getPrismaClient() {
  const client = new PrismaClient({
    log: ['error', 'warn'],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: process.env.NODE_ENV === 'production' 
          ? process.env.DATABASE_URL 
          : process.env.DIRECT_URL
      }
    }
  });

  // Add error handling listener
  client.$on('error', (e) => {
    console.error('Database error:', e);
  });

  return client;
}