// app/api/openings/route.ts
import { prisma } from '@/app/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const eco = searchParams.get('eco') || '';

    const skip = (page - 1) * limit;

    // Construir where clause basado en búsqueda y filtros
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { eco: { contains: search, mode: 'insensitive' } },
        { moves: { contains: search, mode: 'insensitive' } },
        {
          aliases: {
            some: {
              value: { contains: search, mode: 'insensitive' }
            }
          }
        }
      ];
    }

    if (eco) {
      where.eco = eco;
    }

    // Obtener openings con paginación
    const openings = await prisma.opening.findMany({
      where,
      include: {
        aliases: true,
      },
      orderBy: [
        { eco: 'asc' },
        { name: 'asc' }
      ],
      skip,
      take: limit,
    });

    // Obtener opciones de ECO únicas para el filtro
    const ecoOptions = await prisma.opening.findMany({
      distinct: ['eco'],
      select: {
        eco: true
      },
      orderBy: {
        eco: 'asc'
      }
    });

    return NextResponse.json({ 
      openings,
      ecoOptions: ecoOptions.map(item => item.eco),
      pagination: {
        page,
        limit,
        hasMore: openings.length === limit
      }
    });
  } catch (error) {
    console.error('Error fetching openings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}