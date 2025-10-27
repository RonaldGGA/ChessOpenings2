"use client";

import { Chess, Square } from "chess.js";
import React, { useEffect, useRef, useState } from "react";
import {
  Chessboard,
  PieceDropHandlerArgs,
  SquareHandlerArgs,
} from "react-chessboard";
import { Opening } from "@prisma/client";
import Link from "next/link";
import { ArrowRight, RotateCw } from "lucide-react";

interface StockfishMove {
  Move: string;
  Centipawn: number;
  Mate: number | null;
}

interface StockfishAnalysis {
  BestMove: string;
  Moves: StockfishMove[];
}

const FreePractice = () => {
  // create a chess game using a ref to always have access to the latest game state within closures and maintain the game state across renders
  const chessGameRef = useRef(new Chess());
  const [relatedOpenings, setRelatedOpenings] = useState<Opening[]>([]);
  const [moveAnalysis, setMoveAnalysis] = useState<StockfishAnalysis | null>(null);

  // track the current position of the chess game in state to trigger a re-render of the chessboard
  const [chessPosition, setChessPosition] = useState("start");
  const [moveFrom, setMoveFrom] = useState("");
  const [optionSquares, setOptionSquares] = useState({});

  useEffect(() => {
    setChessPosition(chessGameRef.current.fen());
  }, []);

  // make a random "CPU" move
  function makeRandomMove() {
    const chessGame = chessGameRef.current;

    // get all possible moves`
    const possibleMoves = chessGame.moves();

    // exit if the game is over
    if (chessGame.isGameOver()) {
      return;
    }

    // pick a random move
    const randomMove =
      possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

    // make the move
    chessGame.move(randomMove);

    // update the position state
    setChessPosition(chessGame.fen());
  }

  // get the move options for a square to show valid moves
  function getMoveOptions(square: Square) {
    const chessGame = chessGameRef.current;

    // get the moves for the square
    const moves = chessGame.moves({
      square,
      verbose: true,
    });

    // if no moves, clear the option squares
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    // create a new object to store the option squares
    const newSquares: Record<string, React.CSSProperties> = {};

    // loop through the moves and set the option squares
    for (const move of moves) {
      newSquares[move.to] = {
        background:
          chessGame.get(move.to) &&
          chessGame.get(move.to)?.color !== chessGame.get(square)?.color
            ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)" // larger circle for capturing
            : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
        // smaller circle for moving
        borderRadius: "50%",
      };
    }

    // set the square clicked to move from to yellow
    newSquares[square] = {
      background: "rgba(255, 255, 0, 0.4)",
    };

    // set the option squares
    setOptionSquares(newSquares);

    // return true to indicate that there are move options
    return true;
  }
  function onSquareClick({ square, piece }: SquareHandlerArgs) {
    const chessGame = chessGameRef.current;

    // piece clicked to move
    if (!moveFrom && piece) {
      // get the move options for the square
      const hasMoveOptions = getMoveOptions(square as Square);

      // if move options, set the moveFrom to the square
      if (hasMoveOptions) {
        setMoveFrom(square);
      }

      // return early
      return;
    }

    // square clicked to move to, check if valid move
    const moves = chessGame.moves({
      square: moveFrom as Square,
      verbose: true,
    });
    const foundMove = moves.find((m) => m.from === moveFrom && m.to === square);

    // not a valid move
    if (!foundMove) {
      // check if clicked on new piece
      const hasMoveOptions = getMoveOptions(square as Square);

      // if new piece, setMoveFrom, otherwise clear moveFrom
      setMoveFrom(hasMoveOptions ? square : "");

      // return early
      return;
    }

    // is normal move
    try {
      chessGame.move({
        from: moveFrom,
        to: square,
        promotion: "q",
      });
    } catch {
      // if invalid, setMoveFrom and getMoveOptions
      const hasMoveOptions = getMoveOptions(square as Square);

      // if new piece, setMoveFrom, otherwise clear moveFrom
      if (hasMoveOptions) {
        setMoveFrom(square);
      }

      // return early
      return;
    }

    // update the position state
    setChessPosition(chessGame.fen());

    // make random cpu move after a short delay
    // setTimeout(makeRandomMove, 300);

    // clear moveFrom and optionSquares
    setMoveFrom("");
    setOptionSquares({});
  }

  // handle piece drop
  function onPieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs) {
    const chessGame = chessGameRef.current;
    // type narrow targetSquare potentially being null (e.g. if dropped off board)
    if (!targetSquare) {
      return false;
    }

    // try to make the move according to chess.js logic
    try {
      chessGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q", // always promote to a queen for example simplicity
      });

      // update the position state upon successful move to trigger a re-render of the chessboard
      setChessPosition(chessGame.fen());

      // clear moveFrom and optionSquares
      setMoveFrom("");
      setOptionSquares({});

      // make random cpu move after a short delay
      setTimeout(makeRandomMove, 500);

      // return true as the move was successful
      return true;
    } catch {
      // return false as the move was not successful
      return false;
    }
  }

  // set the chessboard options
  const chessboardOptions = {
    onPieceDrop,
    onSquareClick,
    position: chessPosition,
    squareStyles: optionSquares,
    id: "click-or-drag-to-move",
  };

  // Function to analyze position with Stockfish
  const analyzePosition = async (fen: string) => {
    try {
      // Use local server-side proxy to avoid CORS and hide API key
      const response = await fetch('/api/stockfish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fen, depth: 20, mode: 'bestmoves', multipv: 10 }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Stockfish proxy error: ${response.status} ${text}`);
      }

      const data = await response.json();
      setMoveAnalysis(data as StockfishAnalysis);
    } catch (error) {
      console.error('Error analyzing position:', error);
      setMoveAnalysis(null);
    }
  };

  // Function to fetch related openings
  const fetchRelatedOpenings = async (fen: string) => {
    try {
      const response = await fetch(`/api/openings?fen=${encodeURIComponent(fen)}`);
      const data = await response.json();
      setRelatedOpenings(data.openings || []);
    } catch (error) {
      console.error('Error fetching related openings:', error);
    }
  };

  // Update analysis and openings when position changes
  useEffect(() => {
    if (chessPosition !== 'start') {
      const runAsync = async () => {
        await analyzePosition(chessPosition);
        await fetchRelatedOpenings(chessPosition);
      };
      runAsync();
    }
  }, [chessPosition]);

  // render the chessboard
  if (chessPosition === "start") {
    return <span>Loading...</span>;
  }

  return (
    <div className="grid grid-cols-12 gap-4 p-4 bg-slate-900 min-h-screen">
      {/* Related Openings - Left Panel */}
      <div className="col-span-3 bg-slate-800 rounded-lg p-4">
        <h2 className="text-xl font-bold text-yellow-400 mb-4">Related Openings</h2>
        <div className="space-y-2">
          {relatedOpenings.map((opening) => (
            <Link 
              key={opening.id}
              href={`/practice/${opening.id}`}
              className="block p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white group-hover:text-yellow-400">
                    {opening.name}
                  </h3>
                  <p className="text-sm text-gray-400">{opening.eco}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-yellow-400" />
              </div>
            </Link>
          ))}
          {relatedOpenings.length === 0 && (
            <p className="text-gray-400 text-center py-4">No related openings found</p>
          )}
        </div>
      </div>

      {/* Main Board - Center */}
      <div className="col-span-6">
        <div className="bg-slate-800 rounded-lg p-4">
          {/* Controls */}
          <div className="flex justify-center gap-4 mb-4">
            <button
              onClick={() => {
                chessGameRef.current = new Chess();
                setChessPosition(chessGameRef.current.fen());
              }}
              className="px-4 py-2 bg-yellow-500 text-slate-900 rounded-lg hover:bg-yellow-400 transition-colors flex items-center gap-2"
            >
              <RotateCw className="h-4 w-4" />
              Reset
            </button>
          </div>
          
          {/* Chessboard */}
          <Chessboard options={chessboardOptions} />
        </div>
      </div>

      {/* Move Analysis - Right Panel */}
      <div className="col-span-3 bg-slate-800 rounded-lg p-4">
        <h2 className="text-xl font-bold text-yellow-400 mb-4">Best Moves</h2>
        <div className="space-y-2">
          {moveAnalysis?.Moves.map((move, index) => (
            <div 
              key={index}
              className="p-3 bg-slate-700 rounded-lg flex justify-between items-center"
            >
              <div>
                <span className="text-white font-mono">{move.Move}</span>
                <p className="text-sm text-gray-400">
                  {move.Mate !== null 
                    ? `Mate in ${move.Mate}`
                    : `CP: ${(move.Centipawn / 100).toFixed(2)}`
                  }
                </p>
              </div>
            </div>
          ))}
          {!moveAnalysis && (
            <p className="text-gray-400 text-center py-4">Analyzing position...</p>
          )}
        </div>
      </div>
    </div>
  );
  // return (
  //   <div>

  //     {/* Play alone in a board matching the related moves and openings */}
  //     {/*Show the statistics of possible next moves*/}
  //     {/*Show the related openings and allow to click and go to pracitce that opening*/}
  //     FreePractice</div>
  // )
};

export default FreePractice;
