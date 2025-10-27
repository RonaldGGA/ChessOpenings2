import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fen = body?.fen;
    const depth = body?.depth ?? 20;
    const mode = body?.mode ?? 'bestmoves';
    const multipv = body?.multipv ?? 10;

    if (!fen) {
      return NextResponse.json({ error: 'Missing fen in request body' }, { status: 400 });
    }

    const rapidRes = await fetch('https://chess-stockfish-16-api.p.rapidapi.com/api/v1/stockfish16/analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY ?? '',
        'X-RapidAPI-Host': 'chess-stockfish-16-api.p.rapidapi.com'
      },
      body: JSON.stringify({ fen, depth, mode, multipv })
    });

    if (!rapidRes.ok) {
      const text = await rapidRes.text();
      console.error('RapidAPI error', rapidRes.status, text);
      return NextResponse.json({ error: 'Remote API error', details: text }, { status: 502 });
    }

    const data = await rapidRes.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error proxying to Stockfish RapidAPI:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
