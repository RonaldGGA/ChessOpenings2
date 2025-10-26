// scripts/migrateOpenings.ts

import { prisma } from '@/app/lib/db';
import fs from 'fs';
import path from 'path';

interface OpeningData {
  src: string;
  eco: string;
  moves: string;
  name: string;
  scid?: string;
  isEcoRoot?: boolean;
  aliases?: {
    [key: string]: string;
  };
}

interface EcoData {
  [fen: string]: OpeningData;
}

interface FromToEntry {
  fromFen: string;
  toFen: string;
  fromSrc: string;
  toSrc: string;
}

async function migrateOpenings() {
  try {
    console.log('Iniciando migración de openings...');

    // Leer archivos ECO
    const ecoFiles = ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json', 'eco_interpolated.json'];
    const allOpenings: EcoData = {};

    for (const file of ecoFiles) {
      const filePath = path.join(process.cwd(), 'data', file);
      if (fs.existsSync(filePath)) {
        console.log(`Procesando ${file}...`);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        Object.assign(allOpenings, data);
      }
    }

    console.log(`Total de openings encontrados: ${Object.keys(allOpenings).length}`);

    // Migrar openings
    let processed = 0;
    const batchSize = 1000;

    for (const [fen, openingData] of Object.entries(allOpenings)) {
      try {
        // Crear opening
        const opening = await prisma.opening.upsert({
          where: { fen },
          update: {
            src: openingData.src,
            eco: openingData.eco,
            moves: openingData.moves,
            name: openingData.name,
            scid: openingData.scid || null,
            isEcoRoot: openingData.isEcoRoot || false,
          },
          create: {
            fen,
            src: openingData.src,
            eco: openingData.eco,
            moves: openingData.moves,
            name: openingData.name,
            scid: openingData.scid || null,
            isEcoRoot: openingData.isEcoRoot || false,
          },
        });

        // Migrar aliases si existen
        if (openingData.aliases && Object.keys(openingData.aliases).length > 0) {
          const aliasPromises = Object.entries(openingData.aliases).map(([source, value]) =>
            prisma.alias.upsert({
              where: {
                openingId_source_value: {
                  openingId: opening.id,
                  source,
                  value,
                },
              },
              update: {},
              create: {
                openingId: opening.id,
                source,
                value,
              },
            })
          );

          await Promise.all(aliasPromises);
        }

        processed++;
        if (processed % batchSize === 0) {
          console.log(`Procesados ${processed} openings...`);
        }
      } catch (error) {
        console.error(`Error procesando opening ${fen}:`, error);
      }
    }

    console.log(`Openings migrados: ${processed}`);

    // Migrar relaciones FromTo
    console.log('Migrando relaciones FromTo...');
    const fromToPath = path.join(process.cwd(), 'data', 'fromTo.json');
    
    if (fs.existsSync(fromToPath)) {
      const fromToData: FromToEntry[] = JSON.parse(fs.readFileSync(fromToPath, 'utf-8'));
      
      let fromToProcessed = 0;
      
      for (const entry of fromToData) {
        try {
          await prisma.fromTo.create({
            data: {
              fromFen: entry.fromFen,
              toFen: entry.toFen,
              fromSrc: entry.fromSrc,
              toSrc: entry.toSrc,
            },
          });
          
          fromToProcessed++;
          if (fromToProcessed % 1000 === 0) {
            console.log(`Procesadas ${fromToProcessed} relaciones FromTo...`);
          }
        } catch (error) {
          console.error(`Error procesando relación FromTo:`, entry, error);
        }
      }
      
      console.log(`Relaciones FromTo migradas: ${fromToProcessed}`);
    }

    console.log('Migración completada exitosamente!');
  } catch (error) {
    console.error('Error en la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar migración
migrateOpenings();