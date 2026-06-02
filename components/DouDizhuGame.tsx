
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';

interface DouDizhuGameProps {
    onBack: () => void;
    userAvatar: string;
    onWin?: (coins: number) => void;
}

// --- Types ---
type Suit = '♠' | '♥' | '♣' | '♦' | 'joker';
type Rank = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17; // 3-K, A(14), 2(15), SJ(16), BJ(17)

interface Card {
    id: string;
    suit: Suit;
    rank: Rank;
    label: string;
    color: string;
}

interface Player {
    id: 'user' | 'left' | 'right';
    name: string;
    avatar: string;
    role: 'peasant' | 'landlord' | null;
    hand: Card[];
    lastAction: string;
}

interface OpponentData {
    id: string;
    name: string;
    avatar: string;
    species: string;
    color: string;
}

const OPPONENTS_POOL: OpponentData[] = [
    { id: 'fox', name: 'Sly Fox', species: 'Fox', avatar: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Fox.png', color: 'bg-orange-200' },
    { id: 'rabbit', name: 'Bugs', species: 'Rabbit', avatar: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Rabbit%20Face.png', color: 'bg-pink-200' },
    { id: 'monkey', name: 'Kong', species: 'Monkey', avatar: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Monkey%20Face.png', color: 'bg-yellow-200' },
    { id: 'pig', name: 'Porky', species: 'Pig', avatar: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Pig%20Face.png', color: 'bg-pink-300' },
    { id: 'shark', name: 'Fin', species: 'Shark', avatar: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Shark.png', color: 'bg-blue-300' },
];

// --- Deck Logic ---
const createDeck = (): Card[] => {
    const suits: Suit[] = ['♠', '♥', '♣', '♦'];
    const ranks: { r: Rank, l: string }[] = [
        { r: 3, l: '3' }, { r: 4, l: '4' }, { r: 5, l: '5' }, { r: 6, l: '6' }, { r: 7, l: '7' },
        { r: 8, l: '8' }, { r: 9, l: '9' }, { r: 10, l: '10' }, { r: 11, l: 'J' }, { r: 12, l: 'Q' },
        { r: 13, l: 'K' }, { r: 14, l: 'A' }, { r: 15, l: '2' }
    ];
    
    let deck: Card[] = [];
    let idCounter = 0;

    suits.forEach(suit => {
        ranks.forEach(rank => {
            deck.push({
                id: `c_${idCounter++}`,
                suit,
                rank: rank.r,
                label: rank.l,
                color: (suit === '♥' || suit === '♦') ? 'text-red-500' : 'text-black'
            });
        });
    });

    deck.push({ id: `c_${idCounter++}`, suit: 'joker', rank: 16, label: 'SJ', color: 'text-black' });
    deck.push({ id: `c_${idCounter++}`, suit: 'joker', rank: 17, label: 'BJ', color: 'text-red-500' });

    return deck.sort(() => Math.random() - 0.5);
};

const sortHand = (hand: Card[]) => {
    return [...hand].sort((a, b) => b.rank - a.rank); // Descending
};

// --- Hand Logic Helpers (Simplified for brevity) ---
// Valid types: solo, pair, triple, bomb, rocket. (Ignoring straights/planes for this simplified implementation)
const getHandType = (cards: Card[]): { type: string, rank: number } | null => {
    const len = cards.length;
    if (len === 0) return null;
    const sorted = sortHand(cards);
    
    // Solo
    if (len === 1) return { type: 'solo', rank: sorted[0].rank };
    
    // Pair
    if (len === 2 && sorted[0].rank === sorted[1].rank) return { type: 'pair', rank: sorted[0].rank };
    
    // Rocket
    if (len === 2 && sorted[0].rank === 17 && sorted[1].rank === 16) return { type: 'rocket', rank: 100 };
    
    // Triple
    if (len === 3 && sorted[0].rank === sorted[2].rank) return { type: 'triple', rank: sorted[0].rank };
    
    // Bomb
    if (len === 4 && sorted[0].rank === sorted[3].rank) return { type: 'bomb', rank: sorted[0].rank };
    
    // Triple + 1
    if (len === 4) {
        if (sorted[0].rank === sorted[2].rank) return { type: '3+1', rank: sorted[0].rank }; // 333+4
        if (sorted[1].rank === sorted[3].rank) return { type: '3+1', rank: sorted[1].rank }; // 4+333
    }

    // Triple + 2
    if (len === 5) {
        if (sorted[0].rank === sorted[2].rank && sorted[3].rank === sorted[4].rank) return { type: '3+2', rank: sorted[0].rank }; // 333+44
        if (sorted[0].rank === sorted[1].rank && sorted[2].rank === sorted[4].rank) return { type: '3+2', rank: sorted[2].rank }; // 44+333
    }

    return null;
};

const canBeat = (newCards: Card[], lastCards: Card[], lastType: string): boolean => {
    const newHand = getHandType(newCards);
    const lastHand = getHandType(lastCards);
    
    if (!newHand || !lastHand) return false;

    if (newHand.type === 'rocket') return true;
    if (lastHand.type === 'rocket') return false;
    
    if (newHand.type === 'bomb' && lastHand.type !== 'bomb') return true;
    
    if (newHand.type === lastHand.type && newCards.length === lastCards.length) {
        return newHand.rank > lastHand.rank;
    }
    
    return false;
};

export const DouDizhuGame: React.FC<DouDizhuGameProps> = ({ onBack, userAvatar, onWin }) => {
    // Phases: 'select' -> 'bidding' -> 'playing' -> 'result'
    const [phase, setPhase] = useState<'select' | 'bidding' | 'playing' | 'result'>('select');
    const [selectedOpponents, setSelectedOpponents] = useState<string[]>([]);
    
    const [players, setPlayers] = useState<Record<string, Player>>({
        user: { id: 'user', name: 'You', avatar: userAvatar, role: null, hand: [], lastAction: '' },
        left: { id: 'left', name: 'AI 1', avatar: '', role: null, hand: [], lastAction: '' },
        right: { id: 'right', name: 'AI 2', avatar: '', role: null, hand: [], lastAction: '' }
    });

    const [lordCards, setLordCards] = useState<Card[]>([]);
    const [currentTurn, setCurrentTurn] = useState<'user' | 'left' | 'right'>('user');
    const [lastPlayed, setLastPlayed] = useState<{ playerId: string, cards: Card[] } | null>(null);
    const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
    const [bidScore, setBidScore] = useState(0);
    const [msg, setMsg] = useState('');
    
    // Bidding State
    const [bidTurn, setBidTurn] = useState(0); // 0, 1, 2
    const [highestBidder, setHighestBidder] = useState<string | null>(null);

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- PHASE 1: SELECTION ---
    const handleSelectOpponent = (id: string) => {
        if (selectedOpponents.includes(id)) {
            setSelectedOpponents(prev => prev.filter(oid => oid !== id));
        } else {
            if (selectedOpponents.length < 2) {
                setSelectedOpponents(prev => [...prev, id]);
            }
        }
    };

    const startGame = () => {
        if (selectedOpponents.length !== 2) return;
        
        // Setup Players
        const opp1 = OPPONENTS_POOL.find(o => o.id === selectedOpponents[0])!;
        const opp2 = OPPONENTS_POOL.find(o => o.id === selectedOpponents[1])!;
        
        const deck = createDeck();
        // Deal 17 cards each, 3 for lord
        const p1Hand = sortHand(deck.slice(0, 17));
        const p2Hand = sortHand(deck.slice(17, 34));
        const p3Hand = sortHand(deck.slice(34, 51));
        const lord = deck.slice(51, 54);

        setPlayers({
            user: { id: 'user', name: 'You', avatar: userAvatar, role: null, hand: p1Hand, lastAction: '' },
            right: { id: 'right', name: opp1.name, avatar: opp1.avatar, role: null, hand: p2Hand, lastAction: '' },
            left: { id: 'left', name: opp2.name, avatar: opp2.avatar, role: null, hand: p3Hand, lastAction: '' }
        });
        setLordCards(lord);
        setPhase('bidding');
        setCurrentTurn('user'); // User starts bidding
        setMsg("Bidding Phase: Do you want to be Landlord?");
    };

    // --- PHASE 2: BIDDING ---
    useEffect(() => {
        if (phase === 'bidding') {
            if (currentTurn !== 'user') {
                // AI Bidding Logic
                const timeout = setTimeout(() => {
                    handleAiBid(currentTurn);
                }, 1500);
                return () => clearTimeout(timeout);
            }
        }
    }, [phase, currentTurn, bidTurn]);

    const handleBid = (score: number) => {
        if (score > bidScore) {
            setBidScore(score);
            setHighestBidder(currentTurn);
            setMsg(`${players[currentTurn].name} bids ${score}!`);
        } else {
            setMsg(`${players[currentTurn].name} passes.`);
        }

        const nextOrder: ('user' | 'right' | 'left')[] = ['user', 'right', 'left'];
        const nextIdx = (nextOrder.indexOf(currentTurn) + 1) % 3;
        
        if (bidTurn >= 2) {
            // End Bidding
            finishBidding(score > bidScore ? currentTurn : highestBidder);
        } else {
            setBidTurn(prev => prev + 1);
            setCurrentTurn(nextOrder[nextIdx]);
        }
    };

    const handleAiBid = (playerId: 'left' | 'right') => {
        // Simple Logic: Count high cards (2, Joker)
        const hand = players[playerId].hand;
        const highCards = hand.filter(c => c.rank >= 15).length;
        let myBid = 0;
        if (highCards >= 3) myBid = 3;
        else if (highCards >= 2) myBid = 2;
        else if (highCards >= 1) myBid = 1;

        if (myBid > bidScore) {
            handleBid(myBid);
        } else {
            handleBid(0); // Pass
        }
    };

    const finishBidding = (winnerId: string | null) => {
        const landLordId = winnerId || 'user'; // Default to user if everyone passes (simple rule)
        const landLordKey = landLordId as 'user' | 'left' | 'right';
        
        setPlayers(prev => {
            const next = { ...prev };
            // Assign Roles
            Object.keys(next).forEach(k => {
                const key = k as 'user' | 'left' | 'right';
                next[key].role = key === landLordKey ? 'landlord' : 'peasant';
            });
            // Give cards to landlord
            next[landLordKey].hand = sortHand([...next[landLordKey].hand, ...lordCards]);
            return next;
        });

        setPhase('playing');
        setCurrentTurn(landLordKey);
        setMsg(`${players[landLordKey].name} is the Landlord! Game Start!`);
    };

    // --- PHASE 3: PLAYING ---
    useEffect(() => {
        if (phase === 'playing') {
            // Check Win Condition
            const winner = Object.values(players).find(p => p.hand.length === 0);
            if (winner) {
                setPhase('result');
                return;
            }

            if (currentTurn !== 'user') {
                const timeout = setTimeout(() => {
                    handleAiPlay(currentTurn);
                }, 2000);
                return () => clearTimeout(timeout);
            }
        }
    }, [phase, currentTurn, players]); // Removed lastPlayed from deps to avoid loop, handled in logic

    const handleCardSelect = (id: string) => {
        if (selectedCardIds.includes(id)) {
            setSelectedCardIds(prev => prev.filter(cid => cid !== id));
        } else {
            setSelectedCardIds(prev => [...prev, id]);
        }
    };

    const playHand = (playerId: 'user'|'left'|'right', cards: Card[]) => {
        const sorted = sortHand(cards);
        
        // Validate
        if (cards.length > 0) {
            const handType = getHandType(sorted);
            if (!handType) {
                if(playerId === 'user') alert("Invalid Hand!");
                return false;
            }
            if (lastPlayed && lastPlayed.playerId !== playerId) {
                const lastHandType = getHandType(lastPlayed.cards);
                if (!canBeat(sorted, lastPlayed.cards, lastHandType!.type)) {
                    if(playerId === 'user') alert("Cannot beat this hand!");
                    return false;
                }
            }
        } else {
            // Pass logic
            if (!lastPlayed || lastPlayed.playerId === playerId) {
                if(playerId === 'user') alert("You must play something to start!");
                return false;
            }
        }

        // Execute Play
        setPlayers(prev => ({
            ...prev,
            [playerId]: {
                ...prev[playerId],
                hand: prev[playerId].hand.filter(c => !cards.some(sc => sc.id === c.id)),
                lastAction: cards.length > 0 ? 'Played' : 'Pass'
            }
        }));

        if (cards.length > 0) {
            setLastPlayed({ playerId, cards: sorted });
            setMsg(`${players[playerId].name} played ${cards.length} cards.`);
        } else {
            setMsg(`${players[playerId].name} passed.`);
        }

        // Next Turn
        const nextOrder: ('user' | 'right' | 'left')[] = ['user', 'right', 'left'];
        const nextIdx = (nextOrder.indexOf(playerId) + 1) % 3;
        setCurrentTurn(nextOrder[nextIdx]);
        
        if (playerId === 'user') setSelectedCardIds([]);
        return true;
    };

    const handleUserPlay = () => {
        const cardsToPlay = players.user.hand.filter(c => selectedCardIds.includes(c.id));
        playHand('user', cardsToPlay);
    };

    const handleUserPass = () => {
        playHand('user', []);
    };

    const handleAiPlay = (playerId: 'left' | 'right') => {
        const hand = players[playerId].hand;
        let cardsToPlay: Card[] = [];

        // If I am starting or everyone passed back to me
        if (!lastPlayed || lastPlayed.playerId === playerId) {
            // Play smallest single
            cardsToPlay = [hand[hand.length - 1]];
            // Try playing a pair if available
            for (let i = hand.length - 1; i > 0; i--) {
                if (hand[i].rank === hand[i - 1].rank) {
                    cardsToPlay = [hand[i], hand[i - 1]];
                    break;
                }
            }
        } else {
            // Must beat lastPlayed
            const lastType = getHandType(lastPlayed.cards);
            if (lastType) {
                if (lastType.type === 'solo') {
                    const candidate = [...hand].reverse().find(c => c.rank > lastType.rank);
                    if (candidate) cardsToPlay = [candidate];
                } else if (lastType.type === 'pair') {
                    for (let i = hand.length - 1; i > 0; i--) {
                        if (hand[i].rank === hand[i - 1].rank && hand[i].rank > lastType.rank) {
                            cardsToPlay = [hand[i], hand[i - 1]];
                            break;
                        }
                    }
                }
                // Simplified AI: Bomb if desperate or random chance
                if (cardsToPlay.length === 0 && hand.length < 10) {
                     // Check for bomb
                     // ... (omitted for brevity)
                }
            }
        }

        playHand(playerId, cardsToPlay);
    };

    // --- RENDER ---
    if (phase === 'select') {
        return (
            <div className="flex flex-col h-full bg-yellow-50 p-6 items-center">
                <div className="bg-white border-b-4 border-black p-4 sticky top-0 z-10 flex items-center shadow-md w-full rounded-2xl mb-8">
                    <button onClick={onBack} className="mr-4 text-2xl font-bold p-2 hover:bg-gray-100 rounded-full border-2 border-transparent hover:border-black transition-all">←</button>
                    <h1 className="text-2xl font-black uppercase tracking-wider">Dou Dizhu</h1>
                </div>
                <h2 className="text-xl font-bold mb-4">Select 2 Opponents</h2>
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                    {OPPONENTS_POOL.map(opp => {
                        const isSelected = selectedOpponents.includes(opp.id);
                        return (
                            <div 
                                key={opp.id}
                                onClick={() => handleSelectOpponent(opp.id)}
                                className={`
                                    w-32 h-40 rounded-3xl border-4 cursor-pointer flex flex-col items-center justify-center p-2 transition-all
                                    ${isSelected ? 'border-blue-500 bg-blue-100 scale-105' : 'border-black bg-white hover:bg-gray-100'}
                                    shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                                `}
                            >
                                <img src={opp.avatar} className="w-20 h-20 mb-2" />
                                <span className="font-black text-sm">{opp.name}</span>
                            </div>
                        )
                    })}
                </div>
                <Button onClick={startGame} disabled={selectedOpponents.length !== 2} className="text-xl py-4 px-12">Start Game</Button>
            </div>
        );
    }

    if (phase === 'result') {
        const winner = Object.values(players).find(p => p.hand.length === 0);
        const userWin = winner?.role === players.user.role; // Teammates win together
        const reward = userWin ? (bidScore * 50 || 50) : 0; // Simple reward logic

        if (userWin && onWin) {
             // Effect runs once
             setTimeout(() => onWin(reward), 100); 
        }

        return (
            <div className="flex flex-col h-full items-center justify-center bg-black/80 text-white p-8">
                <h1 className={`text-6xl font-black mb-4 ${userWin ? 'text-green-400' : 'text-red-500'}`}>
                    {userWin ? 'VICTORY' : 'DEFEAT'}
                </h1>
                <p className="text-2xl font-bold mb-8">
                    {winner?.role === 'landlord' ? 'Landlord' : 'Peasants'} Won!
                </p>
                {userWin && <p className="text-yellow-400 font-black text-xl mb-8">Reward: +{reward} TT</p>}
                <Button onClick={onBack} variant="primary" className="text-black bg-white">Exit Game</Button>
            </div>
        );
    }

    // --- GAME TABLE UI ---
    return (
        <div className="flex flex-col h-full bg-[#2E7D32] relative overflow-hidden select-none">
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-2 flex justify-between items-start z-20">
                <button onClick={onBack} className="bg-black/50 text-white px-3 py-1 rounded-lg font-bold border border-white hover:bg-black">Exit</button>
                
                {/* Lord Cards */}
                <div className="flex gap-2 bg-black/20 p-2 rounded-xl border border-white/20">
                    {lordCards.length > 0 ? lordCards.map((c, i) => (
                        <div key={i} className={`w-8 h-12 bg-white rounded border border-black flex items-center justify-center text-sm font-black ${c.color}`}>
                            {c.label}{c.suit !== 'joker' && c.suit}
                        </div>
                    )) : (
                        <div className="text-white text-xs font-bold">Hidden Cards</div>
                    )}
                </div>

                <div className="text-white font-bold text-xs bg-black/50 px-2 py-1 rounded">
                    Bid: {bidScore > 0 ? bidScore : '-'}
                </div>
            </div>

            {/* Notification Area */}
            <div className="absolute top-20 left-0 right-0 flex justify-center z-10 pointer-events-none">
                {msg && <div className="bg-yellow-400 border-2 border-black px-4 py-1 rounded-full font-black text-sm shadow-md animate-bounce">{msg}</div>}
            </div>

            {/* AI LEFT */}
            <div className="absolute left-2 top-1/3 flex flex-col items-center">
                <img src={players.left.avatar} className="w-16 h-16 rounded-full border-4 border-white bg-white mb-2 shadow-lg" />
                <div className="bg-black/50 text-white text-xs px-2 rounded mb-1">{players.left.name}</div>
                <div className="flex flex-col items-center bg-white/10 p-1 rounded">
                    <span className="text-2xl">🂠</span>
                    <span className="text-white font-bold">{players.left.hand.length}</span>
                </div>
                {players.left.role === 'landlord' && <span className="bg-yellow-500 text-black text-[10px] font-black px-1 rounded mt-1">LANDLORD</span>}
                {players.left.lastAction && <div className="mt-2 bg-white text-black text-xs font-bold px-2 py-1 rounded border border-black">{players.left.lastAction}</div>}
            </div>

            {/* AI RIGHT */}
            <div className="absolute right-2 top-1/3 flex flex-col items-center">
                <img src={players.right.avatar} className="w-16 h-16 rounded-full border-4 border-white bg-white mb-2 shadow-lg" />
                <div className="bg-black/50 text-white text-xs px-2 rounded mb-1">{players.right.name}</div>
                <div className="flex flex-col items-center bg-white/10 p-1 rounded">
                    <span className="text-2xl">🂠</span>
                    <span className="text-white font-bold">{players.right.hand.length}</span>
                </div>
                {players.right.role === 'landlord' && <span className="bg-yellow-500 text-black text-[10px] font-black px-1 rounded mt-1">LANDLORD</span>}
                {players.right.lastAction && <div className="mt-2 bg-white text-black text-xs font-bold px-2 py-1 rounded border border-black">{players.right.lastAction}</div>}
            </div>

            {/* CENTER PLAYED CARDS */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                {lastPlayed && (
                    <div className="flex -space-x-8 animate-popIn">
                        {lastPlayed.cards.map((c, i) => (
                            <div 
                                key={`played-${c.id}`} 
                                className={`w-16 h-24 bg-white rounded-lg border-2 border-black flex flex-col items-center justify-center shadow-md ${c.color}`}
                            >
                                <span className="text-lg font-black">{c.label}</span>
                                <span className="text-2xl">{c.suit !== 'joker' ? c.suit : (c.rank === 17 ? '🤡' : '🃏')}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* USER AREA */}
            <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-4">
                
                {/* Controls */}
                <div className="mb-4 flex gap-4 z-20">
                    {phase === 'bidding' && currentTurn === 'user' && (
                        <>
                            <button onClick={() => handleBid(1)} disabled={bidScore >= 1} className="bg-yellow-300 border-2 border-black px-4 py-2 rounded-xl font-black hover:bg-yellow-400 disabled:opacity-50">1</button>
                            <button onClick={() => handleBid(2)} disabled={bidScore >= 2} className="bg-orange-300 border-2 border-black px-4 py-2 rounded-xl font-black hover:bg-orange-400 disabled:opacity-50">2</button>
                            <button onClick={() => handleBid(3)} disabled={bidScore >= 3} className="bg-red-300 border-2 border-black px-4 py-2 rounded-xl font-black hover:bg-red-400 disabled:opacity-50">3</button>
                            <button onClick={() => handleBid(0)} className="bg-gray-300 border-2 border-black px-4 py-2 rounded-xl font-black hover:bg-gray-400">Pass</button>
                        </>
                    )}

                    {phase === 'playing' && currentTurn === 'user' && (
                        <>
                            <button onClick={handleUserPass} className="bg-gray-300 border-2 border-black px-6 py-2 rounded-xl font-black hover:bg-gray-400 shadow-md">Pass</button>
                            <button onClick={handleUserPlay} className="bg-green-400 text-white border-2 border-black px-8 py-2 rounded-xl font-black hover:bg-green-500 shadow-md active:translate-y-1">PLAY</button>
                        </>
                    )}
                </div>

                {/* Hand */}
                <div className="flex -space-x-6 px-4 max-w-full overflow-x-visible items-end h-32">
                    {players.user.hand.map((c) => {
                        const isSelected = selectedCardIds.includes(c.id);
                        return (
                            <div 
                                key={c.id}
                                onClick={() => phase === 'playing' && handleCardSelect(c.id)}
                                className={`
                                    w-20 h-28 bg-white rounded-xl border-2 border-black flex flex-col p-1 shadow-md cursor-pointer transition-transform
                                    ${isSelected ? '-translate-y-6 z-10' : 'hover:-translate-y-2'}
                                    ${c.color}
                                `}
                            >
                                <div className="text-left font-black leading-none">{c.label}</div>
                                <div className="text-left text-xs">{c.suit !== 'joker' && c.suit}</div>
                                <div className="flex-1 flex items-center justify-center text-3xl">
                                    {c.suit !== 'joker' ? c.suit : (c.rank === 17 ? '🤡' : '🃏')}
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                <div className="flex items-center gap-2 mt-2 bg-black/50 px-4 py-1 rounded-full">
                    <img src={players.user.avatar} className="w-8 h-8 rounded-full border-2 border-white" />
                    <span className="text-white font-bold text-sm">You</span>
                    {players.user.role === 'landlord' && <span className="bg-yellow-500 text-black text-[9px] font-black px-1 rounded">LANDLORD</span>}
                </div>
            </div>
        </div>
    );
};
