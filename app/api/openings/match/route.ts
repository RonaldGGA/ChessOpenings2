import  prisma from '@/app/lib/db'
import { NextRequest, NextResponse } from 'next/server'

function formatMoveHistory(moves: string[]): string {
  if (moves.length === 0) return '';

  let formatted = '';
  let moveNumber = 1;
  
  for (let i = 0; i < moves.length; i += 2) {
    // Agregar número de jugada
    formatted += `${moveNumber}. ${moves[i]}`;
    
    // Agregar movimiento de negras si existe
    if (i + 1 < moves.length) {
      formatted += ` ${moves[i + 1]}`;
    }
    
    // Agregar espacio entre jugadas (excepto después de la última)
    if (i + 2 < moves.length) {
      formatted += ' ';
    }
    
    moveNumber++;
  }
  
  return formatted;
}

export async function GET(request: NextRequest) {
  console.log('Starting /api/openings/match request');
  
  try {
    // // Verificar la conexión a la base de datos
    // await prisma.$queryRaw`SELECT 1`
    // console.log('Database connection verified');
    
    const { searchParams } = new URL(request.url)
    console.log('Search params:', Object.fromEntries(searchParams));
    
    const moveHistory = searchParams.get('moveHistory')
    if (!moveHistory) {
      console.log('Missing moveHistory parameter');
      return NextResponse.json(
        { error: 'El parámetro moveHistory es requerido' },
        { status: 400 }
      )
    }

    let movesArray: string[];
    try {
      movesArray = JSON.parse(moveHistory);
      if (!Array.isArray(movesArray)) {
        console.error('Invalid moveHistory format: not an array');
        throw new Error('moveHistory debe ser un array');
      }
      console.log('Parsed moves:', movesArray);
    } catch (error) {
      console.error('Error parsing moveHistory:', error);
      return NextResponse.json(
        { error: 'Formato inválido para moveHistory. Debe ser un array JSON' },
        { status: 400 }
      )
    }

    if (!Array.isArray(movesArray) || movesArray.length === 0) {
      return NextResponse.json({
        exactMatches: false,
        count: 0,
        openings: [],
        transitions: []
      })
    }

    // Convertir el array al formato de la base de datos
    const normalizedMoves = formatMoveHistory(movesArray)

    // Ejecutar consultas en paralelo
    const [baseOpenings, transitions] = await Promise.all([
      // Búsqueda en openings
      prisma.opening.findMany({
        where: {
          OR: [
            { 
              moves: { 
                startsWith: normalizedMoves, 
                mode: 'insensitive' 
              } 
            },
            { 
              moves: { 
                contains: ` ${normalizedMoves} `, 
                mode: 'insensitive' 
              } 
            },
          ]
        },    
        select: {
          id: true,
          fen: true,
          eco: true,
          moves: true,
          name: true,
          src: true,
          isEcoRoot: true,
          aliases: {
            select: {
              source: true,
              value: true
            }
          }
        },
        orderBy: [
          { isEcoRoot: 'desc' },
          { eco: 'asc' },
          { moves: 'asc' }
        ],
        take: 15
      }),

      // Búsqueda en transiciones
      prisma.fromTo.findMany({
        where: {
          OR: [
            { 
              fromSrc: { 
                contains: normalizedMoves, 
                mode: 'insensitive' 
              } 
            },
            { 
              toSrc: { 
                contains: normalizedMoves, 
                mode: 'insensitive' 
              } 
            }
          ]
        },
        select: {
          id: true,
          fromFen: true,
          toFen: true,
          fromSrc: true,
          toSrc: true,
          fromOpening: {
            select: {
              id: true,
              fen: true,
              eco: true,
              name: true,
              moves: true
            }
          },
          toOpening: {
            select: {
              id: true,
              fen: true,
              eco: true,
              name: true,
              moves: true
            }
          }
        },
        take: 10
      })
    ])

    const exactMatches = baseOpenings.some(opening => 
      opening.moves.toLowerCase().startsWith(normalizedMoves.toLowerCase())
    )

    const result = {
      exactMatches,
      count: baseOpenings.length,
      openings: baseOpenings,
      transitions,
      searchInfo: {
        normalizedMoves,
        movesCount: movesArray.length,
        moves: movesArray
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error buscando openings:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}