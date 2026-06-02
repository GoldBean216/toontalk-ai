
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';

interface MahjongGameProps {
    onBack: () => void;
    userAvatar: string;
    onWin?: (coins: number) => void;
}

// --- TYPES ---
type TileSuit = 'bamboo' | 'dot' | 'char' | 'wind' | 'dragon';

interface Tile {
    id: string;
    suit: TileSuit;
    value: number | string;
    symbol: string;
    label: string;
}

interface Player {
    id: number; // 0=User, 1=Right, 2=Top, 3=Left
    name: string;
    avatar: string;
    hand: Tile[];
    discards: Tile[];
    isAi: boolean;
}

interface OpponentData {
    id: string;
    name: string;
    avatar: string;
}

const OPPONENTS_POOL: OpponentData[] = [
    { id: 'fox', name: 'Sly Fox', avatar: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Fox.png' },
    { id: 'rabbit', name: 'Bugs', avatar: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Rabbit%20Face.png' },
    { id: 'monkey', name: 'Kong', avatar: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Monkey%20Face.png' },
    { id: 'pig', name: 'Porky', avatar: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Pig%20Face.png' },
    { id: 'shark', name: 'Fin', avatar: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Shark.png' },
];

// --- LOGIC ---

const generateDeck = (): Tile[] => {
    let deck: Tile[] = [];
    let idCounter = 0;

    const addTiles = (suit: TileSuit, values: (number|string)[], symbols: string[]) => {
        values.forEach((val, idx) => {
            for (let i = 0; i < 4; i++) {
                deck.push({
                    id: `t_${idCounter++}`,
                    suit,
                    value: val,
                    symbol: symbols[idx],
                    label: val.toString()
                });
            }
        });
    };

    addTiles('bamboo', [1,2,3,4,5,6,7,8,9], ['🀐','🀑','🀒','🀓','🀔','🀕','🀖','🀗','🀘']);
    addTiles('dot', [1,2,3,4,5,6,7,8,9], ['🀙','🀚','🀛','🀜','🀝','🀞','🀟','🀠','🀡']);
    addTiles('char', [1,2,3,4,5,6,7,8,9], ['🀇','🀈','🀉','🀊','🀋','🀌','🀍','🀎','🀏']);
    addTiles('wind', ['E','S','W','N'], ['🀀','🀁','🀂','🀃']);
    addTiles('dragon', ['R','G','W'], ['🀄','🀅','🀆']);

    return deck.sort(() => Math.random() - 0.5);
};

const sortHand = (hand: Tile[]) => {
    const suitOrder: Record<string, number> = { 'char': 1, 'dot': 2, 'bamboo': 3, 'wind': 4, 'dragon': 5 };
    return [...hand].sort((a, b) => {
        if (a.suit !== b.suit) return suitOrder[a.suit] - suitOrder[b.suit];
        if (typeof a.value === 'number' && typeof b.value === 'number') return a.value - b.value;
        return a.value.toString().localeCompare(b.value.toString());
    });
};

export const MahjongGame: React.FC<MahjongGameProps> = ({ onBack, userAvatar, onWin }) => {
    const [phase, setPhase] = useState<'select' | 'playing' | 'result'>('select');
    const [selectedOpponents, setSelectedOpponents] = useState<string[]>([]);
    
    const [deck, setDeck] = useState<Tile[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0); 
    const [drawnTile, setDrawnTile] = useState<Tile | null>(null);
    const [lastDiscard, setLastDiscard] = useState<Tile | null>(null);
    const [turnMessage, setTurnMessage] = useState('');
    const [gameResult, setGameResult] = useState<{ winnerId: number | null, reason: string } | null>(null);

    const toggleOpponent = (id: string) => {
        if (selectedOpponents.includes(id)) {
            setSelectedOpponents(prev => prev.filter(oid => oid !== id));
        } else if (selectedOpponents.length < 3) {
            setSelectedOpponents(prev => [...prev, id]);
        }
    };

    const startGame = () => {
        if (selectedOpponents.length !== 3) return;

        const newDeck = generateDeck();
        const newPlayers: Player[] = [];
        
        newPlayers.push({ id: 0, name: 'You', avatar: userAvatar, hand: [], discards: [], isAi: false });
        
        selectedOpponents.forEach((oid, idx) => {
            const data = OPPONENTS_POOL.find(o => o.id === oid)!;
            newPlayers.push({ id: idx + 1, name: data.name, avatar: data.avatar, hand: [], discards: [], isAi: true });
        });

        for (let i = 0; i < 13; i++) {
            newPlayers.forEach(p => {
                if (newDeck.length > 0) p.hand.push(newDeck.pop()!);
            });
        }

        newPlayers.forEach(p => p.hand = sortHand(p.hand));

        setDeck(newDeck);
        setPlayers(newPlayers);
        setPhase('playing');
        setCurrentPlayerIdx(0);
        drawTile(0, newPlayers, newDeck);
    };

    const drawTile = (playerIdx: number, currentPlayers: Player[], currentDeck: Tile[]) => {
        if (currentDeck.length === 0) {
            setGameResult({ winnerId: null, reason: "Draw! Wall exhausted." });
            setPhase('result');
            return;
        }

        const tile = currentDeck.pop()!;
        setDeck([...currentDeck]); 
        setDrawnTile(tile);
        setTurnMessage(`${currentPlayers[playerIdx].name}'s Turn`);

        if (Math.random() < 0.01 && playerIdx !== 0) { 
             handleWin(playerIdx, "Self-Drawn Win (Zimo)!");
             return;
        }

        if (playerIdx !== 0) {
            setTimeout(() => {
                handleAiDiscard(playerIdx, tile, currentPlayers);
            }, 1000);
        }
    };

    const handleDiscard = (playerIdx: number, tileToDiscard: Tile) => {
        const p = players[playerIdx];
        
        if (drawnTile && tileToDiscard.id === drawnTile.id) {
            setDrawnTile(null);
        } else {
            if (drawnTile) {
                p.hand.push(drawnTile);
                setDrawnTile(null);
            }
            p.hand = p.hand.filter(t => t.id !== tileToDiscard.id);
            p.hand = sortHand(p.hand);
        }

        p.discards.push(tileToDiscard);
        setLastDiscard(tileToDiscard);
        setPlayers([...players]);

        const nextIdx = (playerIdx + 1) % 4;
        setCurrentPlayerIdx(nextIdx);
        
        setTimeout(() => {
            drawTile(nextIdx, players, deck);
        }, 500);
    };

    const handleAiDiscard = (playerIdx: number, drawn: Tile, currentPlayers: Player[]) => {
        const p = currentPlayers[playerIdx];
        const keepDrawn = Math.random() > 0.5;
        
        if (keepDrawn) {
            const discardIdx = Math.floor(Math.random() * p.hand.length);
            const tileToDiscard = p.hand[discardIdx];
            handleDiscard(playerIdx, tileToDiscard);
        } else {
            handleDiscard(playerIdx, drawn);
        }
    };

    const handleUserClickTile = (tile: Tile) => {
        if (currentPlayerIdx !== 0) return;
        handleDiscard(0, tile);
    };

    const handleWin = (winnerId: number, reason: string) => {
        setGameResult({ winnerId, reason });
        setPhase('result');
        if (winnerId === 0 && onWin) {
            onWin(100);
        }
    };

    if (phase === 'select') {
        return (
            <div className="flex flex-col h-full bg-[#006400] text-white p-6 items-center overflow-y-auto">
                <div className="w-full flex items-center justify-between mb-8 border-b-4 border-white pb-4">
                    <button onClick={onBack} className="text-2xl font-bold p-2 hover:bg-white/20 rounded-full">←</button>
                    <h1 className="text-3xl font-black uppercase tracking-widest">Mahjong</h1>
                    <div className="w-8"></div>
                </div>
                
                <h2 className="text-xl font-bold mb-6">Select 3 Opponents</h2>
                <div className="flex flex-wrap justify-center gap-4 mb-10">
                    {OPPONENTS_POOL.map(opp => {
                        const isSelected = selectedOpponents.includes(opp.id);
                        return (
                            <div 
                                key={opp.id}
                                onClick={() => toggleOpponent(opp.id)}
                                className={`
                                    w-28 h-36 bg-white rounded-2xl p-2 flex flex-col items-center justify-center cursor-pointer transition-all border-4
                                    ${isSelected ? 'border-yellow-400 scale-110 shadow-xl' : 'border-transparent opacity-80 hover:opacity-100'}
                                `}
                            >
                                <img src={opp.avatar} className="w-16 h-16 mb-2" />
                                <span className="text-black font-black text-xs">{opp.name}</span>
                            </div>
                        )
                    })}
                </div>

                <Button 
                    onClick={startGame} 
                    disabled={selectedOpponents.length !== 3}
                    className="text-xl py-4 px-12 bg-yellow-400 text-black border-white hover:bg-yellow-300"
                >
                    Start Game
                </Button>
            </div>
        );
    }

    if (phase === 'result' && gameResult) {
        const isUserWin = gameResult.winnerId === 0;
        return (
            <div className="flex flex-col h-full items-center justify-center bg-black/90 text-white p-8 animate-fadeIn">
                <div className="text-8xl mb-4">{isUserWin ? '🀄' : '😵'}</div>
                <h1 className={`text-5xl font-black mb-2 ${isUserWin ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {isUserWin ? 'YOU WIN!' : 'GAME OVER'}
                </h1>
                <p className="text-xl font-bold mb-8 text-center">{gameResult.reason}</p>
                {isUserWin && <p className="text-yellow-300 font-black mb-8">+100 TT</p>}
                <Button onClick={onBack} className="bg-white text-black">Exit</Button>
            </div>
        );
    }

    const userPlayer = players[0];
    const rightPlayer = players[1];
    const topPlayer = players[2];
    const leftPlayer = players[3];

    return (
        <div className="flex flex-col h-full bg-[#2E7D32] relative overflow-hidden select-none">
            {/* Texture */}
            <div className="absolute inset-0 bg-[radial-gradient(transparent_20%,#000_20%,#000_21%,transparent_21%)] bg-[length:4px_4px] opacity-10 pointer-events-none"></div>

            {/* Header */}
            <div className="absolute top-0 left-0 p-2 z-20">
                <button onClick={onBack} className="bg-black/40 text-white px-3 py-1 rounded border border-white/50 text-xs hover:bg-black">Exit</button>
            </div>
            
            {/* Center Info */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-4 border-yellow-600/50 rounded-xl flex flex-col items-center justify-center bg-[#1b5e20] shadow-inner z-0">
                <div className="text-yellow-200/50 font-black text-4xl mb-2">{deck.length}</div>
                <div className="text-white/80 font-bold text-xs bg-black/30 px-2 py-1 rounded">{turnMessage}</div>
                
                {lastDiscard && (
                    <div className="absolute z-10 animate-popIn">
                        <div className="w-12 h-16 bg-white border border-gray-400 rounded shadow-lg flex items-center justify-center relative">
                            <span className="text-3xl">{lastDiscard.symbol}</span>
                            <div className="absolute -bottom-6 text-[10px] text-white bg-black/50 px-1 rounded whitespace-nowrap">Last Played</div>
                        </div>
                    </div>
                )}
            </div>

            {/* TOP PLAYER */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="flex gap-1 mb-2">
                    {topPlayer.hand.map((_, i) => (
                        <div key={i} className="w-6 h-9 bg-blue-700 border border-white/50 rounded-sm shadow-sm"></div>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <img src={topPlayer.avatar} className={`w-10 h-10 rounded-full border-2 ${currentPlayerIdx === 2 ? 'border-yellow-400 animate-pulse' : 'border-black'}`} />
                    <span className="text-white text-xs font-bold bg-black/30 px-2 rounded">{topPlayer.name}</span>
                </div>
            </div>

            {/* LEFT PLAYER */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="flex flex-col gap-1 mr-2">
                    {leftPlayer.hand.map((_, i) => (
                        <div key={i} className="w-9 h-6 bg-blue-700 border border-white/50 rounded-sm shadow-sm"></div>
                    ))}
                </div>
                <img src={leftPlayer.avatar} className={`w-10 h-10 rounded-full border-2 mt-2 ${currentPlayerIdx === 3 ? 'border-yellow-400 animate-pulse' : 'border-black'}`} />
            </div>

            {/* RIGHT PLAYER */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="flex flex-col gap-1 ml-2">
                    {rightPlayer.hand.map((_, i) => (
                        <div key={i} className="w-9 h-6 bg-blue-700 border border-white/50 rounded-sm shadow-sm"></div>
                    ))}
                </div>
                <img src={rightPlayer.avatar} className={`w-10 h-10 rounded-full border-2 mt-2 ${currentPlayerIdx === 1 ? 'border-yellow-400 animate-pulse' : 'border-black'}`} />
            </div>

            {/* USER (BOTTOM) */}
            <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-4 bg-gradient-to-t from-black/50 to-transparent pt-10">
                
                {/* Drawn Tile Area (Floating) */}
                {drawnTile && currentPlayerIdx === 0 && (
                    <div 
                        className="mb-4 cursor-pointer hover:-translate-y-2 transition-transform animate-bounce"
                        onClick={() => handleUserClickTile(drawnTile)}
                    >
                        <div className="w-14 h-20 bg-[#F0E6D2] border-2 border-gray-400 rounded-md shadow-2xl flex flex-col items-center justify-center relative">
                            <span className="text-4xl">{drawnTile.symbol}</span>
                            <div className="absolute -top-6 text-white text-xs font-bold bg-yellow-600 px-2 rounded">DRAWN</div>
                        </div>
                    </div>
                )}

                {/* Hand */}
                <div className="flex gap-1 items-end">
                    {userPlayer.hand.map((tile) => (
                        <div 
                            key={tile.id}
                            onClick={() => currentPlayerIdx === 0 && handleUserClickTile(tile)}
                            className={`
                                w-12 h-16 md:w-14 md:h-20 bg-[#F0E6D2] border border-gray-400 rounded-md shadow-md flex flex-col items-center justify-center
                                ${currentPlayerIdx === 0 ? 'cursor-pointer hover:-translate-y-4 hover:bg-white transition-transform' : 'opacity-80'}
                            `}
                        >
                            <span className="text-3xl md:text-4xl leading-none">{tile.symbol}</span>
                            <span className="text-[8px] text-gray-500 font-bold">{tile.value}</span>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-2 mt-2">
                    <img src={userAvatar} className={`w-12 h-12 rounded-full border-2 ${currentPlayerIdx === 0 ? 'border-yellow-400 animate-pulse' : 'border-white'}`} />
                    <div className="bg-black/50 px-3 py-1 rounded-full text-white text-sm font-bold">You</div>
                </div>
            </div>
        </div>
    );
};
