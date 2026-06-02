
import React, { useState } from 'react';
import { RoleplayScenario, RoleplayGameState, GameType, SpyPlayer } from '../types';
import { Button } from './Button';
import { RoleplayGameRoom } from './RoleplayGameRoom';

const SCENARIOS: RoleplayScenario[] = [
    // {
    //     id: 's1',
    //     title: 'Taboo Word: Fox & Crow',
    //     description: 'Trick the Fox into saying the forbidden word!',
    //     gameType: 'taboo',
    //     characters: [
    //         { id: 'fox', name: 'Fox', avatarUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Fox.png' },
    //         { id: 'crow', name: 'Crow', avatarUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Bird.png' }
    //     ],
    //     tabooWords: {
    //         'fox': 'cheese', 
    //         'crow': 'sing'   
    //     }
    // },
    {
        id: 's2',
        title: 'Guess Who',
        description: 'Think of a word! The AI has 20 questions to guess it.',
        gameType: 'guess',
        characters: [
            { id: 'pig', name: 'Pig', avatarUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Pig%20Face.png' },
            { id: 'monkey', name: 'Monkey', avatarUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Monkey%20Face.png' }
        ],
        guessWords: ['Apple', 'Banana', 'Carrot', 'Pizza', 'Moon', 'Sun', 'Tree', 'Book']
    },
    {
        id: 's3',
        title: 'Count to 30: Fox & Rabbit',
        description: 'Take turns saying 1 or 2 numbers. Whoever says 30 LOSES.',
        gameType: 'count',
        characters: [
            { id: 'rabbit', name: 'Rabbit', avatarUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Rabbit%20Face.png' },
            { id: 'fox', name: 'Fox', avatarUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Fox.png' }
        ]
    },
    {
        id: 's4',
        title: 'Who is the Spy?',
        description: '5 Players. 1 Spy. Describe your word and vote out the impostor.',
        gameType: 'spy',
        characters: [
            { id: 'horse', name: 'Horse', avatarUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Horse%20Face.png' },
            { id: 'chicken', name: 'Chicken', avatarUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Chicken.png' },
            { id: 'cow', name: 'Cow', avatarUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Cow%20Face.png' },
            { id: 'sheep', name: 'Sheep', avatarUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Ewe.png' },
            { id: 'dog', name: 'Dog', avatarUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Dog%20Face.png' }
        ],
        spyWords: [
            { civilian: 'Apple', spy: 'Orange' },
            { civilian: 'Cat', spy: 'Dog' },
            { civilian: 'Car', spy: 'Bike' },
            { civilian: 'Pen', spy: 'Pencil' },
            { civilian: 'Sun', spy: 'Moon' }
        ]
    }
];

interface RoleplayTheatreProps {
    onBack: () => void;
    userCoins: number;
    onDeductCoins: (amount: number) => boolean;
    onWin: () => void;
}

export const RoleplayTheatre: React.FC<RoleplayTheatreProps> = ({ onBack, userCoins, onDeductCoins, onWin }) => {
    const [selectedScenario, setSelectedScenario] = useState<RoleplayScenario | null>(null);
    const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
    const [activeGame, setActiveGame] = useState<RoleplayGameState | null>(null);
    const [gameId, setGameId] = useState(0); // Unique session ID to force remount on restart
    const [showWordInput, setShowWordInput] = useState(false);
    const [customWord, setCustomWord] = useState('');

    const initializeGame = (scenario: RoleplayScenario, charId: string): RoleplayGameState => {
        const gameState: RoleplayGameState = {
            scenario: scenario,
            userCharacterId: charId,
            aiCharacterIds: scenario.characters.filter(c => c.id !== charId).map(c => c.id),
            score: 0
        };

        if (scenario.gameType === 'taboo') {
            const userChar = scenario.characters.find(c => c.id === charId)!;
            const aiChar = scenario.characters.find(c => c.id !== charId)!;
            gameState.userTabooWord = scenario.tabooWords![userChar.id];
            gameState.targetTabooWord = scenario.tabooWords![aiChar.id];
        }
        else if (scenario.gameType === 'guess') {
            const words = scenario.guessWords!;
            const w1 = customWord || words[Math.floor(Math.random() * words.length)];
            let w2 = words[Math.floor(Math.random() * words.length)];
            while (w2 === w1) w2 = words[Math.floor(Math.random() * words.length)];

            gameState.userTargetWord = w1;
            gameState.aiTargetWord = w2;
        }
        else if (scenario.gameType === 'count') {
            gameState.currentNumber = 0;
        }
        else if (scenario.gameType === 'spy') {
            const pair = scenario.spyWords![Math.floor(Math.random() * scenario.spyWords!.length)];
            const players = scenario.characters;
            const spyIndex = Math.floor(Math.random() * players.length);

            const spyPlayers: SpyPlayer[] = players.map((p, idx) => ({
                id: p.id === charId ? 'user' : p.id,
                name: p.id === charId ? 'YOU' : p.name,
                avatarUrl: p.avatarUrl,
                role: idx === spyIndex ? 'spy' : 'civilian',
                word: idx === spyIndex ? pair.spy : pair.civilian,
                isAlive: true,
                isAi: p.id !== charId
            }));

            gameState.spyPlayers = spyPlayers;
            gameState.spyTurnIndex = 0;
            gameState.spyRound = 1;
            gameState.spyPhase = 'description';
        }
        return gameState;
    };

    const handleStart = () => {
        if (!selectedScenario || !selectedCharId) return;

        if (selectedScenario.gameType === 'guess' && !customWord) {
            setShowWordInput(true);
            return;
        }

        const newState = initializeGame(selectedScenario, selectedCharId);
        setActiveGame(newState);
        setGameId(prev => prev + 1); // Increment ID for new game
    };

    const handleConfirmWord = () => {
        if (!customWord.trim()) return;
        setShowWordInput(false);
        handleStart();
    };

    const handleRestart = () => {
        if (!selectedScenario || !selectedCharId) return;
        const newState = initializeGame(selectedScenario, selectedCharId);
        setActiveGame(newState);
        setGameId(prev => prev + 1); // Increment ID to force component reset
    };

    // ACTIVE GAME VIEW
    if (activeGame) {
        return (
            <RoleplayGameRoom
                key={gameId} // Force remount when gameId changes
                gameState={activeGame}
                onEndGame={(won) => { if (won) onWin(); }}
                onBack={() => setActiveGame(null)}
                onRestart={handleRestart}
                userCoins={userCoins}
                onDeductCoins={onDeductCoins}
            />
        );
    }

    // DETAIL VIEW
    if (selectedScenario) {
        return (
            <div className="flex flex-col h-full bg-purple-50 overflow-y-auto">
                <div className="bg-white border-b-4 border-black p-4 sticky top-0 z-10 flex items-center shadow-md">
                    <button onClick={() => { setSelectedScenario(null); setCustomWord(''); setShowWordInput(false); }} className="mr-4 text-2xl font-bold p-2 hover:bg-gray-100 rounded-full border-2 border-transparent hover:border-black">
                        ←
                    </button>
                    <h1 className="text-xl font-black truncate">{selectedScenario.title}</h1>
                </div>

                <div className="p-6 max-w-lg mx-auto w-full">
                    <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-8 text-center">
                        <h2 className="text-2xl font-black mb-4">Choose Role</h2>
                        <div className="flex flex-wrap justify-center gap-4 mb-6">
                            {selectedScenario.characters.map(char => {
                                const isSelected = selectedCharId === char.id;
                                return (
                                    <div
                                        key={char.id}
                                        onClick={() => setSelectedCharId(char.id)}
                                        className={`
                                            cursor-pointer flex flex-col items-center transition-all p-3 rounded-2xl border-4 w-24
                                            ${isSelected
                                                ? 'bg-yellow-200 border-black scale-110 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                                                : 'bg-gray-100 border-transparent hover:bg-gray-200 opacity-60 hover:opacity-100'
                                            }
                                        `}
                                    >
                                        <img src={char.avatarUrl} className="w-14 h-14 rounded-full border-2 border-black bg-white mb-2" />
                                        <span className="font-bold text-xs">{char.name}</span>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="bg-purple-100 border-2 border-purple-300 rounded-xl p-4 text-left">
                            <h3 className="font-black text-purple-600 mb-2">📜 Game Rules</h3>
                            <p className="text-sm font-bold text-gray-700">{selectedScenario.description}</p>
                        </div>
                    </div>

                    <Button
                        onClick={handleStart}
                        fullWidth
                        disabled={!selectedCharId}
                        className="text-xl py-4"
                    >
                        START SHOW
                    </Button>

                    {/* Word Input Modal */}
                    {showWordInput && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
                            <div className="bg-white rounded-3xl border-4 border-black p-6 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                                <h3 className="text-2xl font-black mb-4">Secret Word</h3>
                                <p className="mb-4 font-bold text-gray-500">Enter the word for AI to guess:</p>
                                <input
                                    type="text"
                                    value={customWord}
                                    onChange={e => setCustomWord(e.target.value)}
                                    className="w-full border-4 border-black rounded-xl p-3 font-bold text-xl mb-4 focus:ring-4 ring-yellow-300 outline-none"
                                    placeholder="e.g. Pizza"
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <Button onClick={() => setShowWordInput(false)} className="flex-1 bg-gray-200 text-gray-800">Cancel</Button>
                                    <Button onClick={handleConfirmWord} className="flex-1">Start!</Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // LIST VIEW
    return (
        <div className="flex flex-col h-full bg-purple-50 overflow-y-auto">
            <div className="bg-white border-b-4 border-black p-4 sticky top-0 z-10 flex items-center shadow-md">
                <button onClick={onBack} className="mr-4 text-2xl font-bold p-2 hover:bg-gray-100 rounded-full border-2 border-transparent hover:border-black">
                    ←
                </button>
                <h1 className="text-2xl font-black tracking-wider">THEATRE SCRIPTS</h1>
            </div>

            <div className="p-4 space-y-4">
                {SCENARIOS.map(scenario => (
                    <div
                        key={scenario.id}
                        onClick={() => setSelectedScenario(scenario)}
                        className="bg-white border-4 border-black rounded-3xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-yellow-50 transition-all active:translate-y-1 active:shadow-none"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                                <h3 className="text-xl font-black">{scenario.title}</h3>
                                <p className="text-gray-500 font-bold text-sm">{scenario.description}</p>
                            </div>
                            <span className="bg-black text-white text-xs font-bold px-2 py-1 rounded shrink-0 ml-2">PLAY</span>
                        </div>
                        <div className="flex -space-x-2 mt-3 overflow-hidden">
                            {scenario.characters.slice(0, 5).map(c => (
                                <img key={c.id} src={c.avatarUrl} className="w-8 h-8 rounded-full border-2 border-black bg-gray-200" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
