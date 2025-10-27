import { Opening } from "@prisma/client";
import { prisma } from "./db";
import { OpeningWithRelations } from "../practice/[id]/page";

export async function findOpening(id: string) {
  try {
    const opening = await prisma.opening.findUnique({
      where: { id },
      include: {
        aliases: true,
        toTransitions: {
          where: {
            toOpening: {
              isNot: null
            }
          },
          select: {
            id: true,
            createdAt: true,
            fromFen: true,
            toFen: true,
            fromSrc: true,
            toSrc: true,
            toOpening: {
              select: {
                id: true,
                name: true,
                fen: true,
                src: true,
                eco: true,
                moves: true,
                scid: true,
                isEcoRoot: true,
                createdAt: true,
                updatedAt: true
              }
            }
          }
        }
      },
    });

    if (!opening) {
      return { opening: null, variations: [] };
    }

    // Get variations (openings that share the same ECO and are different from current)
    const variations = await prisma.opening.findMany({
      where: {
        eco: opening.eco,
        id: { not: opening.id }
      },
      include: {
        aliases: true,
      },
      take: 10,
      orderBy: {
        name: 'asc'
      }
    });

    return {
      opening: opening as OpeningWithRelations,
      variations: variations as Opening[]
    };

  } catch (error) {
    console.error('Error fetching opening:', error);
    return { opening: null, variations: [] };
  }
}