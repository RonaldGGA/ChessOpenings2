import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: ['error', 'warn'],
    errorFormat: 'pretty',
  });

  // Verificar la conexión
  client.$connect()
    .then(() => {
      console.log('Successfully connected to database');
    })
    .catch((error) => {
      console.error('Failed to connect to database:', error);
    });

  return client;
};

declare global {
  var prisma: PrismaClient | undefined
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export { prisma };