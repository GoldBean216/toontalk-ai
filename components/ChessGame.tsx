import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { Contact } from '../types';
import { generateCharacterResponse, generateSpeech, decodeAndPlayAudio } from '../services/gemini';

interface ChessGameProps {
    onBack: () => void;
    userAvatar: string;
    contacts: Contact[]; 
    onWin?: (coins: number) => void;
}

type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
type PieceColor = 'w' | 'b';

interface Piece {
    type: PieceType;
    color: PieceColor;
}

interface Position {
    row: number;
    col: number;
}

type BoardState = (Piece | null)[][];

const INITIAL_BOARD: BoardState = [
    [{type:'r',color:'b'}, {type:'n',color:'b'}, {type:'b',color:'b'}, {type:'q',color:'b'}, {type:'k',color:'b'}, {type:'b',color:'b'}, {type:'n',color:'b'}, {type:'r',color:'b'}],
    [{type:'p',color:'b'}, {type:'p',color:'b'}, {type:'p',color:'b'}, {type:'p',color:'b'}, {type:'p',color:'b'}, {type:'p',color:'b'}, {type:'p',color:'b'}, {type:'p',color:'b'}],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [{type:'p',color:'w'}, {type:'p',color:'w'}, {type:'p',color:'w'}, {type:'p',color:'w'}, {type:'p',color:'w'}, {type:'p',color:'w'}, {type:'p',color:'w'}, {type:'p',color:'w'}],
    [{type:'r',color:'w'}, {type:'n',color:'w'}, {type:'b',color:'w'}, {type:'q',color:'w'}, {type:'k',color:'w'}, {type:'b',color:'w'}, {type:'n',color:'w'}, {type:'r',color:'w'}],
];

// Helper: Get unicode for piece
const getPieceSymbol = (p: Piece) => {
    const symbols: Record<string, string> = {
        'w-k': '♔', 'w-q': '♕', 'w-r': '♖', 'w-b': '♗', 'w-n': '♘', 'w-p': '♙',
        'b-k': '♚', 'b-q': '♛', 'b-r': '♜', 'b-b': '♝', 'b-n': '♞', 'b-p': '♟︎'
    };
    return symbols[`${p.color}-${p.type}`];
};

export const ChessGame: React.FC<ChessGameProps> = ({ onBack, userAvatar, contacts, onWin }) => {
    // Phases
    const [phase, setPhase] = useState<'select' | 'playing' | 'gameover'>('select');
    const [opponent, setOpponent] = useState<Contact | null>(null);
    
    // Game State
    const [board, setBoard] = useState<BoardState>(INITIAL_BOARD);
    const [turn, setTurn] = useState<PieceColor>('w');
    const [selectedPos, setSelectedPos] = useState<Position | null>(null);
    const [validMoves, setValidMoves] = useState<Position[]>([]);
    const [capturedWhite, setCapturedWhite] = useState<PieceType[]>([]);
    const [capturedBlack, setCapturedBlack] = useState<PieceType[]>([]);
    const [winner, setWinner] = useState<'w' | 'b' | 'draw' | null>(null);
    const [statusMsg, setStatusMsg] = useState('White to move');
    const [isMuted, setIsMuted] = useState(false);

    // AI Comm State
    const [aiMessage, setAiMessage] = useState<{ text: string, visible: boolean }>({ text: '', visible: false });
    const [isAiThinking, setIsAiThinking] = useState(false);

    // Deep copy board helper
    const cloneBoard = (b: BoardState): BoardState => b.map(row => row.map(p => p ? {...p} : null));

    const audioContextRef = useRef<AudioContext | null>(null);
    const getAudioContext = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        return audioContextRef.current;
    };

    const triggerAiComment = async (context: string) => {
        if (!opponent || isMuted) return;
        setIsAiThinking(true);
        try {
            const resp = await generateCharacterResponse(
                opponent.species!,
                opponent.name,
                opponent.persona!,
                `[Chess Game Context]: ${context}`,
                [],
                'extremely concise trash talk or reaction, 1 sentence max'
            );

            const text = typeof resp === 'string' ? resp : (resp.translation || JSON.stringify(resp));
            setAiMessage({ text, visible: true });

            const audio = await generateSpeech(resp.translation, opponent.species!, opponent.persona!, 5, opponent.aiBrain?.ttsVoice, opponent.aiBrain, resp.raw_sound);
            if (audio) {
                decodeAndPlayAudio(audio, getAudioContext());
            }

            setTimeout(() => setAiMessage(prev => ({ ...prev, visible: false })), 5000);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAiThinking(false);
        }
    };

    // --- GAME ENGINE ---
    const getPseudoLegalMoves = (b: BoardState, pos: Position): Position[] => {
        const piece = b[pos.row][pos.col];
        if (!piece) return [];
        const moves: Position[] = [];
        const { row, col } = pos;
        const directions = [
            {r:-1, c:0}, {r:1, c:0}, {r:0, c:-1}, {r:0, c:1}, // Rook
            {r:-1, c:-1}, {r:-1, c:1}, {r:1, c:-1}, {r:1, c:1} // Bishop
        ];
        const knightMoves = [
            {r:-2, c:-1}, {r:-2, c:1}, {r:-1, c:-2}, {r:-1, c:2},
            {r:1, c:-2}, {r:1, c:2}, {r:2, c:-1}, {r:2, c:1}
        ];

        const addMoveIfValid = (r: number, c: number) => {
            if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                const target = b[r][c];
                if (!target || target.color !== piece.color) {
                    moves.push({ row: r, col: c });
                }
            }
        };

        if (piece.type === 'p') {
            const dir = piece.color === 'w' ? -1 : 1;
            const startRow = piece.color === 'w' ? 6 : 1;
            
            if (!b[row+dir]?.[col]) {
                moves.push({ row: row+dir, col });
                if (row === startRow && !b[row+dir*2]?.[col]) {
                    moves.push({ row: row+dir*2, col });
                }
            }
            if (b[row+dir]?.[col-1] && b[row+dir][col-1]?.color !== piece.color) moves.push({ row: row+dir, col: col-1 });
            if (b[row+dir]?.[col+1] && b[row+dir][col+1]?.color !== piece.color) moves.push({ row: row+dir, col: col+1 });
        }
        else if (piece.type === 'n') {
            knightMoves.forEach(m => addMoveIfValid(row + m.r, col + m.c));
        }
        else if (piece.type === 'k') {
            directions.forEach(d => addMoveIfValid(row + d.r, col + d.c));
        }
        else {
            const dirs = piece.type === 'r' ? directions.slice(0,4) 
                       : piece.type === 'b' ? directions.slice(4) 
                       : directions; // Queen
            
            dirs.forEach(d => {
                let r = row + d.r;
                let c = col + d.c;
                while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                    const target = b[r][c];
                    if (!target) {
                        moves.push({ row: r, col: c });
                    } else {
                        if (target.color !== piece.color) moves.push({ row: r, col: c });
                        break;
                    }
                    r += d.r;
                    c += d.c;
                }
            });
        }
        return moves;
    };

    const isKingInCheck = (b: BoardState, color: PieceColor): boolean => {
        let kingPos: Position | null = null;
        for (let r=0; r<8; r++) {
            for (let c=0; c<8; c++) {
                const p = b[r][c];
                if (p && p.type === 'k' && p.color === color) {
                    kingPos = {row: r, col: c};
                    break;
                }
            }
        }
        if (!kingPos) return true;

        for (let r=0; r<8; r++) {
            for (let c=0; c<8; c++) {
                const p = b[r][c];
                if (p && p.color !== color) {
                    const moves = getPseudoLegalMoves(b, {row:r, col:c});
                    if (moves.some(m => m.row === kingPos!.row && m.col === kingPos!.col)) return true;
                }
            }
        }
        return false;
    };

    const getLegalMoves = (b: BoardState, pos: Position): Position[] => {
        const pseudos = getPseudoLegalMoves(b, pos);
        const piece = b[pos.row][pos.col];
        if (!piece) return [];

        return pseudos.filter(m => {
            const nextBoard = cloneBoard(b);
            nextBoard[m.row][m.col] = piece;
            nextBoard[pos.row][pos.col] = null;
            return !isKingInCheck(nextBoard, piece.color);
        });
    };

    const executeMove = (from: Position, to: Position) => {
        const movingPiece = board[from.row][from.col];
        const targetPiece = board[to.row][to.col];
        if (!movingPiece) return;

        const nextBoard = cloneBoard(board);
        nextBoard[to.row][to.col] = movingPiece;
        nextBoard[from.row][from.col] = null;

        if (movingPiece.type === 'p' && (to.row === 0 || to.row === 7)) {
            nextBoard[to.row][to.col] = { ...movingPiece, type: 'q' };
        }

        if (targetPiece) {
            if (targetPiece.color === 'w') setCapturedWhite(prev => [...prev, targetPiece.type]);
            else setCapturedBlack(prev => [...prev, targetPiece.type]);
            if (turn === 'w') triggerAiComment(`Ouch! You took my ${targetPiece.type === 'q' ? 'Queen' : 'piece'}!`);
        }

        setBoard(nextBoard);
        const nextTurn = turn === 'w' ? 'b' : 'w';
        setTurn(nextTurn);
        setStatusMsg(nextTurn === 'w' ? "White's Turn" : "Black's Turn");
        setSelectedPos(null);
        setValidMoves([]);

        const isCheck = isKingInCheck(nextBoard, nextTurn);
        let hasMoves = false;
        for(let r=0; r<8; r++) {
            for(let c=0; c<8; c++) {
                if (nextBoard[r][c]?.color === nextTurn) {
                    if (getLegalMoves(nextBoard, {row:r, col:c}).length > 0) {
                        hasMoves = true;
                        break;
                    }
                }
            }
            if(hasMoves) break;
        }

        if (!hasMoves) {
            if (isCheck) {
                setWinner(turn);
                setPhase('gameover');
                if (turn === 'w') {
                    if (onWin) onWin(100);
                    triggerAiComment("Checkmate! You beat me... fair and square.");
                } else {
                    triggerAiComment("Checkmate! I win! Better luck next time.");
                }
            } else {
                setWinner('draw');
                setPhase('gameover');
                triggerAiComment("Stalemate! A tactical draw.");
            }
        } else if (isCheck) {
            setStatusMsg(nextTurn === 'w' ? "White is in Check!" : "Black is in Check!");
            if (nextTurn === 'b') triggerAiComment("Check? Impressive move...");
        }
    };

    const handleSquareClick = (r: number, c: number) => {
        if (phase !== 'playing' || turn === 'b') return;
        const clickedPiece = board[r][c];
        if (clickedPiece?.color === turn) {
            setSelectedPos({ row: r, col: c });
            setValidMoves(getLegalMoves(board, { row: r, col: c }));
            return;
        }
        if (selectedPos) {
            if (validMoves.some(m => m.row === r && m.col === c)) {
                executeMove(selectedPos, { row: r, col: c });
            } else {
                setSelectedPos(null);
                setValidMoves([]);
            }
        }
    };

    useEffect(() => {
        if (phase === 'playing' && turn === 'b') {
            const timer = setTimeout(() => {
                let allMoves: { from: Position, to: Position, score: number }[] = [];
                for(let r=0; r<8; r++) {
                    for(let c=0; c<8; c++) {
                        const p = board[r][c];
                        if (p && p.color === 'b') {
                            const moves = getLegalMoves(board, {row: r, col: c});
                            moves.forEach(m => {
                                let score = Math.random() * 2;
                                const target = board[m.row][m.col];
                                if (target) score += ({p:10, n:30, b:30, r:50, q:90, k:900}[target.type] || 0);
                                if (m.row >= 3 && m.row <= 4 && m.col >= 3 && m.col <= 4) score += 5;
                                allMoves.push({ from: {row: r, col: c}, to: m, score });
                            });
                        }
                    }
                }
                if (allMoves.length > 0) {
                    allMoves.sort((a,b) => b.score - a.score);
                    const best = allMoves[0];
                    executeMove(best.from, best.to);
                }
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [phase, turn, board]);

    const aiContacts = contacts.filter(c => !c.isGroup && c.isAi);

    if (phase === 'select') {
        return (
            <div className="flex flex-col h-full bg-gray-900 text-white p-6 items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                <h1 className="text-4xl font-black mb-8 text-blue-400 tracking-widest uppercase z-10">Grand Chess</h1>
                <p className="mb-8 font-bold text-gray-400 z-10 text-lg uppercase tracking-wider">Choose your AI Master</p>
                <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-12 z-10 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {aiContacts.map(opp => (
                        <div key={opp.id} onClick={() => { setOpponent(opp); setPhase('playing'); setBoard(INITIAL_BOARD); setTurn('w'); setCapturedWhite([]); setCapturedBlack([]); }}
                             className={`rounded-3xl border-4 border-black cursor-pointer transition-all hover:scale-105 active:scale-95 ${opp.color || 'bg-slate-200'} flex flex-col items-center justify-center p-4 relative group shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]`}>
                            <img src={opp.avatarUrl} className="w-20 h-20 mb-3 drop-shadow-md group-hover:animate-bounce object-contain" />
                            <h3 className="font-black text-black text-xs uppercase text-center leading-tight truncate w-full">{opp.name}</h3>
                            <span className="text-[10px] text-black/50 font-bold uppercase">{opp.species}</span>
                        </div>
                    ))}
                    {aiContacts.length === 0 && <p className="col-span-full py-12 text-center text-gray-500 font-bold">Summon AI contacts first!</p>}
                </div>
                <Button onClick={onBack} variant="secondary" className="w-48 border-white text-white bg-transparent hover:bg-white hover:text-black z-10 font-black">BACK TO LOBBY</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#1a1a1a] relative">
            <div className="bg-[#111] p-4 flex justify-between items-center text-white border-b-4 border-black">
                <button onClick={onBack} className="font-black text-xs bg-red-600 px-3 py-1.5 rounded border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-px transition-all">EXIT</button>
                <div className="font-black text-sm tracking-widest uppercase text-blue-400">{statusMsg}</div>
                <button onClick={() => setIsMuted(!isMuted)} className="text-lg">{isMuted ? '🔇' : '🔊'}</button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-4">
                <div className="flex items-center gap-4 w-full max-w-md justify-between bg-black/30 p-3 rounded-2xl border-2 border-white/5 relative">
                    {aiMessage.visible && (
                        <div className="absolute -top-16 left-12 bg-white text-black border-2 border-black p-2 rounded-xl text-[10px] font-bold shadow-lg animate-bounce z-50 max-w-[150px]">
                            {aiMessage.text}
                            <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-white border-b-2 border-r-2 border-black rotate-45"></div>
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full border-2 overflow-hidden ${turn === 'b' ? 'border-yellow-400 ring-4 ring-yellow-400/20 scale-110' : 'border-gray-700 opacity-60'} transition-all`}>
                            <img src={opponent?.avatarUrl} className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <div className="font-black text-white text-xs uppercase">{opponent?.name}</div>
                            <div className="flex flex-wrap gap-0.5 mt-1 max-w-[100px]">
                                {capturedWhite.map((p, i) => <span key={i} className="text-[10px] grayscale brightness-200 opacity-50">{p}</span>)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full max-w-md aspect-square bg-[#312e2b] border-[10px] border-[#262421] rounded-lg grid grid-cols-8 grid-rows-8 shadow-2xl overflow-hidden">
                    {board.map((row, r) => row.map((piece, c) => {
                        const isDark = (r + c) % 2 === 1;
                        const isSelected = selectedPos?.row === r && selectedPos?.col === c;
                        const isValidMove = validMoves.some(m => m.row === r && m.col === c);
                        return (
                            <div key={`${r}-${c}`} onClick={() => handleSquareClick(r, c)} className={`flex items-center justify-center text-4xl cursor-pointer relative ${isDark ? 'bg-[#b58863]' : 'bg-[#f0d9b5]'} ${isSelected ? '!bg-[#f7f769]' : ''}`}>
                                {isValidMove && <div className={`absolute rounded-full ${piece ? 'border-[6px] border-black/10 w-full h-full' : 'w-3 h-3 bg-black/10'}`}></div>}
                                {piece && <span className={`select-none transition-all ${isSelected ? '-translate-y-1 scale-110' : ''} ${piece.color === 'w' ? 'text-white' : 'text-black'}`} style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))' }}>{getPieceSymbol(piece)}</span>}
                            </div>
                        );
                    }))}
                </div>

                <div className="flex items-center gap-4 w-full max-w-md justify-between bg-black/30 p-3 rounded-2xl border-2 border-white/5">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full border-2 overflow-hidden ${turn === 'w' ? 'border-blue-400 ring-4 ring-blue-400/20 scale-110' : 'border-gray-700 opacity-60'} transition-all`}>
                            <img src={userAvatar} className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <div className="font-black text-white text-xs uppercase">YOU</div>
                            <div className="flex flex-wrap gap-0.5 mt-1 max-w-[100px]">
                                {capturedBlack.map((p, i) => <span key={i} className="text-[10px] grayscale brightness-200 opacity-50">{p}</span>)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {phase === 'gameover' && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] animate-fadeIn">
                    <div className="bg-white p-8 rounded-[40px] text-center max-w-sm border-8 border-black shadow-[15px_15px_0px_rgba(0,0,0,0.5)] scale-up">
                        <div className="text-6xl mb-4">{winner === 'draw' ? '⚖️' : (winner === 'w' ? '🥇' : '💀')}</div>
                        <h2 className="text-4xl font-black mb-2 uppercase italic tracking-tighter">
                            {winner === 'draw' ? 'Stalemate' : (winner === 'w' ? 'Victory!' : 'Defeated')}
                        </h2>
                        <p className="text-slate-500 font-bold mb-6 text-sm">Against {opponent?.name}</p>
                        <div className="flex flex-col gap-3">
                            <Button onClick={() => setPhase('select')} className="bg-yellow-400 hover:bg-yellow-500 text-black py-4 text-xl font-black border-4 border-black shadow-[4px_4px_0px_black]">PLAY AGAIN</Button>
                            <Button onClick={onBack} variant="secondary" className="py-3 font-bold border-4 border-black shadow-[4px_4px_0px_black]">BACK TO HALL</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
