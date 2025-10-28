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

interface StockfishAnalysis {
  bestMove: string;
  ponder: string;
  evaluation: string;
  continuation: string;
  mate: string | null;
}

const FreePractice = () => {
  const chessGameRef = useRef(new Chess());
  const [relatedOpenings, setRelatedOpenings] = useState<Opening[]>([]);
  const [moveAnalysis, setMoveAnalysis] = useState<StockfishAnalysis | null>(null);
  const [chessPosition, setChessPosition] = useState("start");
  const [moveFrom, setMoveFrom] = useState("");
  const [optionSquares, setOptionSquares] = useState({});
  const [movesHistory, setMovesHistory] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    setChessPosition(chessGameRef.current.fen());
  }, []);

  // Function to analyze position with Stockfish
  const analyzePosition = async (fen: string) => {
    setIsAnalyzing(true);
    try {
      const response = await fetch(
        `https://stockfish.online/api/s/v2.php?fen=${encodeURIComponent(fen)}&depth=13`
      );

      if (!response.ok) {
        throw new Error(`Stockfish error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error("Error analyzing the position");
      }

      // Parse the bestmove string correctly
      const bestMoveParts = data.bestmove?.split(" ") || [];
      const newData: StockfishAnalysis = {
        bestMove: bestMoveParts[1] || "",
        ponder: bestMoveParts[3] || "",
        evaluation: data.evaluation || "0",
        continuation: data.continuation || "",
        mate: data.mate,
      };
      setMoveAnalysis(newData);
    } catch (error) {
      console.error("Error analyzing position:", error);
      setMoveAnalysis(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Function to fetch related openings
  const fetchRelatedOpenings = async (moves: string[]) => {
    try {
      // Convert moves array to the format expected by the API
      const response = await fetch(`/api/openings/match?moveHistory=${JSON.stringify(moves)}`);
      const data = await response.json();
      setRelatedOpenings(data.openings || []);
    } catch (error) {
      console.error("Error fetching related openings:", error);
      setRelatedOpenings([]);
    }
  };

  // Update analysis and openings when position changes
  useEffect(() => {
    if (chessPosition !== "start" && !chessGameRef.current.isGameOver()) {
      analyzePosition(chessPosition);
      fetchRelatedOpenings(movesHistory);
    }
  }, [chessPosition, movesHistory]);

  function getMoveOptions(square: Square) {
    const chessGame = chessGameRef.current;
    const moves = chessGame.moves({
      square,
      verbose: true,
    });

    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: Record<string, React.CSSProperties> = {};

    for (const move of moves) {
      newSquares[move.to] = {
        background:
          chessGame.get(move.to) &&
          chessGame.get(move.to)?.color !== chessGame.get(square)?.color
            ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
        borderRadius: "50%",
      };
    }

    newSquares[square] = {
      background: "rgba(255, 255, 0, 0.4)",
    };

    setOptionSquares(newSquares);
    return true;
  }

  function onSquareClick({ square, piece }: SquareHandlerArgs) {
    const chessGame = chessGameRef.current;

    // Piece clicked to move
    if (!moveFrom && piece) {
      const hasMoveOptions = getMoveOptions(square as Square);
      if (hasMoveOptions) {
        setMoveFrom(square);
      }
      return;
    }

    // Square clicked to move to
    const moves = chessGame.moves({
      square: moveFrom as Square,
      verbose: true,
    });
    const foundMove = moves.find((m) => m.from === moveFrom && m.to === square);

    if (!foundMove) {
      const hasMoveOptions = getMoveOptions(square as Square);
      setMoveFrom(hasMoveOptions ? square : "");
      return;
    }

    // Make the move
    try {
      chessGame.move({
        from: moveFrom,
        to: square,
        promotion: "q",
      });

      setChessPosition(chessGame.fen());
      setMoveFrom("");
      setOptionSquares({});
      setMovesHistory(chessGame.history());
    } catch {
      const hasMoveOptions = getMoveOptions(square as Square);
      setMoveFrom(hasMoveOptions ? square : "");
    }
  }

  function onPieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs) {
    if (!targetSquare) {
      return false;
    }

    const chessGame = chessGameRef.current;
    
    try {
      chessGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });

      setChessPosition(chessGame.fen());
      setMoveFrom("");
      setOptionSquares({});
      setMovesHistory(chessGame.history());
      return true;
    } catch {
      return false;
    }
  }

  const resetBoard = () => {
    chessGameRef.current = new Chess();
    setChessPosition(chessGameRef.current.fen());
    setMovesHistory([]);
    setMoveAnalysis(null);
    setRelatedOpenings([]);
    setOptionSquares({});
    setMoveFrom("");
  };

  const chessboardOptions = {
    onPieceDrop,
    onSquareClick,
    position: chessPosition,
    squareStyles: optionSquares,
    id: "click-or-drag-to-move",
  };

  if (chessPosition === "start") {
    return <span>Loading...</span>;
  }

  return (
    <div className="grid grid-cols-12 gap-4 p-4 bg-slate-900 min-h-screen">
      {/* Related Openings - Left Panel */}
      <div className="col-span-3 bg-slate-800 rounded-lg p-4">
        <h2 className="text-xl font-bold text-yellow-400 mb-4">Related Openings</h2>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
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
                  <p className="text-xs text-gray-500 mt-1">{opening.moves}</p>
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
      <div className="col-span-6 flex flex-col items-center">
        <div className="bg-slate-800 rounded-lg p-4 w-full max-w-2xl">
          {/* Controls */}
          <div className="flex justify-center gap-4 mb-4">
            <button
              onClick={resetBoard}
              className="px-4 py-2 bg-yellow-500 text-slate-900 rounded-lg hover:bg-yellow-400 transition-colors flex items-center gap-2"
            >
              <RotateCw className="h-4 w-4" />
              Reset Board
            </button>
          </div>
          
          {/* Chessboard */}
          <div className="flex justify-center">
            <Chessboard options={chessboardOptions} />
          </div>

          {/* Current Moves */}
          <div className="mt-4 p-3 bg-slate-700 rounded-lg">
            <h3 className="text-white font-semibold mb-2">Move History</h3>
            <p className="text-gray-300 text-sm">
              {movesHistory.length > 0 ? movesHistory.join(", ") : "No moves yet"}
            </p>
          </div>
        </div>
      </div>

      {/* Move Analysis - Right Panel */}
      <div className="col-span-3 bg-slate-800 rounded-lg p-4">
        <h2 className="text-xl font-bold text-yellow-400 mb-4">Position Analysis</h2>
        <div className="space-y-3 text-white">
          {isAnalyzing ? (
            <p className="text-gray-400 text-center py-4">Analyzing position...</p>
          ) : moveAnalysis ? (
            <>
              <div>
                <span className="font-semibold text-yellow-400">Best Move:</span>
                <span className="ml-2">{moveAnalysis.bestMove || "N/A"}</span>
              </div>
              <div>
                <span className="font-semibold text-yellow-400">Ponder:</span>
                <span className="ml-2">{moveAnalysis.ponder || "N/A"}</span>
              </div>
              <div>
                <span className="font-semibold text-yellow-400">Evaluation:</span>
                <span className="ml-2">{moveAnalysis.evaluation}</span>
              </div>
              {moveAnalysis.mate && (
                <div>
                  <span className="font-semibold text-yellow-400">Mate in:</span>
                  <span className="ml-2">{moveAnalysis.mate}</span>
                </div>
              )}
              <div>
                <span className="font-semibold text-yellow-400">Continuation:</span>
                <p className="text-sm mt-1 text-gray-300 wrap-break-words">
                  {moveAnalysis.continuation || "N/A"}
                </p>
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-center py-4">No analysis available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FreePractice;