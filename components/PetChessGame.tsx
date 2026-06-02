import React, { useState, useEffect } from 'react';
import { Button } from './Button';

interface PetChessGameProps {
    onBack: () => void;
    userAvatar: string;
    onWin?: (coins: number) => void;
}

type PetType = 'cat' | 'dog';
type PieceColor = 'black' | 'white';

interface Piece {
    id: string;
    color: PieceColor;
    type: PetType;
    position: number; // 0-15
}

export const PetChessGame: React.FC<PetChessGameProps> = ({ onBack, userAvatar, onWin }) => {
    const [phase, setPhase] = useState<'select' | 'playing' | 'gameover'>('select');
    const [opponentType, setOpponentType] = useState<PetType | null>(null);
    
    // Game State
    // User is always BLACK (Bottom), AI is WHITE (Top)
    const [pieces, setPieces] = useState<Piece[]>([]);
    const [turn, setTurn] = useState<PieceColor>('black');
    const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
    const [validMoves, setValidMoves] = useState<number[]>([]);
    const [winner, setWinner] = useState<PieceColor | null>(null);
    const [msg, setMsg] = useState('');

    const THEME = {
        cat: {
            black: '🐈‍⬛', white: '🐈',
            avatar: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Cat.png',
            name: 'Meow Master'
        },
        dog: {
            black: '🐕‍🦺', white: '🐕',
            avatar: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Dog.png',
            name: 'Bark Boss'
        }
    };

    const initGame = (type: PetType) => {
        setOpponentType(type);
        const newPieces: Piece[] = [];
        // AI (White) Top
        for(let i=0; i<4; i++) newPieces.push({ id: `w_${i}`, color: 'white', type, position: i });
        // User (Black) Bottom
        for(let i=0; i<4; i++) newPieces.push({ id: `b_${i}`, color: 'black', type, position: 12+i });
        
        setPieces(newPieces);
        setTurn('black');
        setPhase('playing');
        setMsg("Your Turn (Black)");
        setWinner(null);
        setSelectedPieceId(null);
    };

    // --- LOGIC ---

    const getPieceAt = (pos: number, currentPieces: Piece[]) => currentPieces.find(p => p.position === pos);

    const getValidMovesForPiece = (piece: Piece, currentPieces: Piece[]): number[] => {
        const moves: number[] = [];
        const curr = piece.position;
        const row = Math.floor(curr / 4);
        const col = curr % 4;

        const candidates = [
            { r: row - 1, c: col }, { r: row + 1, c: col },
            { r: row, c: col - 1 }, { r: row, c: col + 1 }
        ];

        candidates.forEach(cand => {
            if (cand.r >= 0 && cand.r < 4 && cand.c >= 0 && cand.c < 4) {
                const targetPos = cand.r * 4 + cand.c;
                if (!getPieceAt(targetPos, currentPieces)) {
                    moves.push(targetPos);
                }
            }
        });
        return moves;
    };

    const hasAnyValidMoves = (color: PieceColor, currentPieces: Piece[]): boolean => {
        const myPieces = currentPieces.filter(p => p.color === color);
        for (const p of myPieces) {
            if (getValidMovesForPiece(p, currentPieces).length > 0) return true;
        }
        return false;
    };

    const countPiecesInRow = (row: number, allPieces: Piece[]) => {
        return allPieces.filter(p => Math.floor(p.position / 4) === row).length;
    };

    const countPiecesInCol = (col: number, allPieces: Piece[]) => {
        return allPieces.filter(p => p.position % 4 === col).length;
    };

    // Check captures involving the piece that just moved
    const resolveCaptures = (movedPiece: Piece, allPieces: Piece[]): Piece[] => {
        const { position: pos, color } = movedPiece;
        const row = Math.floor(pos / 4);
        const col = pos % 4;
        const enemyColor = color === 'white' ? 'black' : 'white';
        let capturedIds: string[] = [];
        let suicide = false;

        // 1. Check Passive Capture (Suicide)
        // Did I move between two enemies? [Enemy] [Me] [Enemy]
        // Horizontal Check
        const left = getPieceAt(pos - 1, allPieces);
        const right = getPieceAt(pos + 1, allPieces);
        // Valid neighbors on same row?
        const hasLeft = col > 0 && left && left.color === enemyColor;
        const hasRight = col < 3 && right && right.color === enemyColor;
        
        if (hasLeft && hasRight) {
            // Check Exception: 4 pieces in this row?
            if (countPiecesInRow(row, allPieces) < 4) {
                suicide = true;
            }
        }

        // Vertical Check
        const up = getPieceAt(pos - 4, allPieces);
        const down = getPieceAt(pos + 4, allPieces);
        const hasUp = row > 0 && up && up.color === enemyColor;
        const hasDown = row < 3 && down && down.color === enemyColor;

        if (hasUp && hasDown) {
            // Check Exception: 4 pieces in this col?
            if (countPiecesInCol(col, allPieces) < 4) {
                suicide = true;
            }
        }

        if (suicide) {
            setMsg("Oh no! You walked into a trap!");
            return allPieces.filter(p => p.id !== movedPiece.id);
        }

        // 2. Check Active Capture (I surround you)
        // Did I create [Me] [Enemy] [Me]?
        
        // Directions: [dr, dc]
        const dirs = [
            { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, // Vertical
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 }  // Horizontal
        ];

        dirs.forEach(({ dr, dc }) => {
            // Neighbor (Enemy?)
            const r1 = row + dr;
            const c1 = col + dc;
            // Far (Ally?)
            const r2 = row + (dr * 2);
            const c2 = col + (dc * 2);

            if (r1 >= 0 && r1 < 4 && c1 >= 0 && c1 < 4 && r2 >= 0 && r2 < 4 && c2 >= 0 && c2 < 4) {
                const pos1 = r1 * 4 + c1;
                const pos2 = r2 * 4 + c2;
                
                const p1 = getPieceAt(pos1, allPieces);
                const p2 = getPieceAt(pos2, allPieces);

                if (p1 && p1.color === enemyColor && p2 && p2.color === color) {
                    // Potential Capture found. Check Exceptions.
                    const isHorizontal = (dr === 0);
                    const lineCount = isHorizontal 
                        ? countPiecesInRow(row, allPieces)
                        : countPiecesInCol(col, allPieces);
                    
                    if (lineCount < 4) {
                        capturedIds.push(p1.id);
                    }
                }
            }
        });

        if (capturedIds.length > 0) {
            setMsg(capturedIds.length > 1 ? "DOUBLE CAPTURE!" : "Captured!");
            return allPieces.filter(p => !capturedIds.includes(p.id));
        }

        return allPieces;
    };

    const makeMove = (pieceId: string, targetPos: number) => {
        // 1. Move
        let currentPieces = pieces.map(p => 
            p.id === pieceId ? { ...p, position: targetPos } : p
        );
        
        // 2. Resolve Captures
        const movedPiece = currentPieces.find(p => p.id === pieceId)!;
        currentPieces = resolveCaptures(movedPiece, currentPieces);
        
        setPieces(currentPieces);
        setSelectedPieceId(null);
        setValidMoves([]);

        // 3. Check Win Conditions
        const whiteCount = currentPieces.filter(p => p.color === 'white').length;
        const blackCount = currentPieces.filter(p => p.color === 'black').length;

        if (whiteCount <= 1) {
            handleGameOver('black', "White lost! (Too few pieces)");
            return;
        }
        if (blackCount <= 1) {
            handleGameOver('white', "Black lost! (Too few pieces)");
            return;
        }

        const nextTurn = turn === 'black' ? 'white' : 'black';
        if (!hasAnyValidMoves(nextTurn, currentPieces)) {
            handleGameOver(turn, `${nextTurn === 'white' ? 'AI' : 'You'} can't move!`);
            return;
        }

        // 4. Switch Turn
        setTurn(nextTurn);
        if (nextTurn === 'black') setMsg("Your Turn (Black)");
        else setMsg("AI Thinking...");
    };

    const handleGameOver = (winnerColor: PieceColor, reason: string) => {
        setWinner(winnerColor);
        setMsg(reason);
        setPhase('gameover');
        if (winnerColor === 'black' && onWin) onWin(50);
    };

    const handleSquareClick = (idx: number) => {
        if (turn !== 'black') return;

        const clickedPiece = getPieceAt(idx, pieces);

        if (clickedPiece && clickedPiece.color === 'black') {
            setSelectedPieceId(clickedPiece.id);
            setValidMoves(getValidMovesForPiece(clickedPiece, pieces));
            return;
        }

        if (selectedPieceId && validMoves.includes(idx)) {
            makeMove(selectedPieceId, idx);
        }
    };

    // AI Logic
    useEffect(() => {
        if (phase === 'playing' && turn === 'white') {
            const timer = setTimeout(() => {
                const aiPieces = pieces.filter(p => p.color === 'white');
                let possibleMoves: { pid: string, to: number, score: number }[] = [];

                aiPieces.forEach(p => {
                    const moves = getValidMovesForPiece(p, pieces);
                    moves.forEach(m => {
                        let score = Math.random() * 10;
                        
                        // Lookahead: Simulate move
                        let simPieces = pieces.map(x => x.id === p.id ? { ...x, position: m } : x);
                        
                        // Check if I capture?
                        const afterCapture = resolveCaptures({...p, position: m}, simPieces);
                        if (afterCapture.length < simPieces.length) {
                            score += 50; // Capture priority
                        } else {
                            // Check if I die? (Suicide check logic inside resolveCaptures would have removed me)
                            const amIAlive = afterCapture.find(x => x.id === p.id);
                            if (!amIAlive) {
                                score -= 100; // Avoid suicide
                            }
                        }
                        
                        possibleMoves.push({ pid: p.id, to: m, score });
                    });
                });

                if (possibleMoves.length > 0) {
                    possibleMoves.sort((a,b) => b.score - a.score);
                    const best = possibleMoves[0];
                    makeMove(best.pid, best.to);
                } else {
                    handleGameOver('black', "AI has no moves!");
                }
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [turn, phase, pieces]);

    if (phase === 'select') {
        return (
            <div className="flex flex-col h-full bg-blue-50 text-black p-6 items-center">
                <div className="bg-white border-b-4 border-black p-4 sticky top-0 z-10 flex items-center shadow-md w-full rounded-2xl mb-8">
                    <button onClick={onBack} className="mr-4 text-2xl font-bold p-2 hover:bg-gray-100 rounded-full border-2 border-transparent hover:border-black transition-all">←</button>
                    <h1 className="text-2xl font-black uppercase tracking-wider">Pet Chess</h1>
                </div>
                
                <h2 className="text-2xl font-black mb-2">Choose Your Team</h2>
                <p className="text-sm font-bold text-gray-500 mb-8 max-w-xs text-center">
                    Rule: Sandwich enemies to capture. 
                    <br/>(Exception: No capture if line has 4 pieces)
                </p>

                <div className="flex gap-6">
                    <div onClick={() => initGame('cat')} className="bg-orange-100 border-4 border-black rounded-3xl p-6 cursor-pointer hover:scale-105 transition-transform flex flex-col items-center">
                        <img src={THEME.cat.avatar} className="w-24 h-24 mb-4" />
                        <h3 className="font-black text-xl">Team Cat</h3>
                    </div>
                    <div onClick={() => initGame('dog')} className="bg-yellow-100 border-4 border-black rounded-3xl p-6 cursor-pointer hover:scale-105 transition-transform flex flex-col items-center">
                        <img src={THEME.dog.avatar} className="w-24 h-24 mb-4" />
                        <h3 className="font-black text-xl">Team Dog</h3>
                    </div>
                </div>
            </div>
        );
    }

    const theme = THEME[opponentType!];

    return (
        <div className="flex flex-col h-full bg-gray-200 items-center justify-center p-4 relative">
            
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-white border-b-4 border-black z-20">
                <button onClick={onBack} className="font-bold text-gray-500 hover:text-black">EXIT</button>
                <div className="font-black text-xl uppercase tracking-wider">{msg}</div>
                <div className="w-8"></div>
            </div>

            {/* AI HUD */}
            <div className="mb-4 flex flex-col items-center animate-fadeIn">
                <img src={theme.avatar} className={`w-16 h-16 rounded-full border-4 border-black bg-white mb-2 ${turn === 'white' ? 'animate-bounce border-yellow-400' : ''}`} />
                <span className="font-bold bg-white px-2 rounded border border-black">{theme.name}</span>
                <span className="text-4xl mt-2">{theme.white}</span>
            </div>

            {/* BOARD */}
            <div className="bg-[#bcaaa4] p-2 rounded-lg border-4 border-[#5d4037] shadow-[0_10px_0px_rgba(0,0,0,0.2)]">
                <div className="grid grid-cols-4 gap-1 w-72 h-72 md:w-96 md:h-96">
                    {Array.from({length: 16}).map((_, i) => {
                        const piece = getPieceAt(i, pieces);
                        const isValid = validMoves.includes(i);
                        const isSelected = selectedPieceId && piece && piece.id === selectedPieceId;
                        const isDark = ((Math.floor(i / 4) + i % 4) % 2 === 1);

                        return (
                            <div 
                                key={i}
                                onClick={() => handleSquareClick(i)}
                                className={`
                                    relative rounded flex items-center justify-center text-4xl md:text-5xl cursor-pointer select-none transition-colors
                                    ${isDark ? 'bg-[#8d6e63]' : 'bg-[#d7ccc8]'}
                                    ${isValid ? 'ring-4 ring-green-400 ring-inset animate-pulse' : ''}
                                    ${isSelected ? 'bg-yellow-200' : ''}
                                `}
                            >
                                {piece && (
                                    <span className={`drop-shadow-md transform transition-transform ${isSelected ? 'scale-110' : ''}`}>
                                        {piece.color === 'black' ? theme.black : theme.white}
                                    </span>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* User HUD */}
            <div className="mt-4 flex flex-col items-center animate-fadeIn">
                <span className="text-4xl mb-2">{theme.black}</span>
                <div className="flex items-center gap-2">
                    <img src={userAvatar} className={`w-12 h-12 rounded-full border-4 border-black bg-white ${turn === 'black' ? 'animate-bounce border-yellow-400' : ''}`} />
                    <span className="font-bold bg-white px-2 rounded border border-black">You</span>
                </div>
            </div>

            {/* Game Over */}
            {phase === 'gameover' && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 animate-fadeIn">
                    <div className="bg-white p-8 rounded-3xl text-center max-w-sm border-4 border-black">
                        <div className="text-6xl mb-4">{winner === 'black' ? '🏆' : '💀'}</div>
                        <h2 className="text-4xl font-black mb-2 uppercase">
                            {winner === 'black' ? 'YOU WIN!' : 'YOU LOSE!'}
                        </h2>
                        <p className="text-gray-500 font-bold mb-4">{msg}</p>
                        {winner === 'black' && (
                            <p className="text-xl font-bold text-yellow-500 mb-6">+50 TT Coins</p>
                        )}
                        <div className="flex flex-col gap-3">
                            <Button onClick={() => initGame(opponentType!)} variant="primary">Play Again</Button>
                            <Button onClick={onBack} variant="secondary">Exit</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};