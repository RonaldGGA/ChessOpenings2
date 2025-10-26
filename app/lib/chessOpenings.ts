// lib/chessOpenings.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ChessOpeningsService {
  // Buscar opening por FEN
  async getOpeningByFen(fen: string) {
    return prisma.opening.findUnique({
      where: { fen },
      include: {
        aliases: true,
        fromTransitions: {
          include: {
            toOpening: true
          }
        },
        toTransitions: {
          include: {
            fromOpening: true
          }
        }
      }
    });
  }

  // Buscar openings por ECO
  async getOpeningsByEco(eco: string) {
    return prisma.opening.findMany({
      where: { eco },
      include: {
        aliases: true
      }
    });
  }

  // Buscar openings por nombre
  async searchOpeningsByName(name: string) {
    return prisma.opening.findMany({
      where: {
        name: {
          contains: name,
          mode: 'insensitive'
        }
      },
      include: {
        aliases: true
      }
    });
  }

  // Obtener transiciones desde un FEN específico
  async getTransitionsFromFen(fen: string) {
    return prisma.fromTo.findMany({
      where: { fromFen: fen },
      include: {
        toOpening: true
      }
    });
  }

  // Obtener openings raíz por ECO
  async getEcoRootOpenings(eco?: string) {
    const where = eco ? { eco, isEcoRoot: true } : { isEcoRoot: true };
    
    return prisma.opening.findMany({
      where,
      include: {
        aliases: true
      }
    });
  }
}

export const openingsService = new ChessOpeningsService();