import React, { useState, useEffect, useRef } from 'react';
import { RoleplayGameState, Message, SpyPlayer, ChatResponse } from '../types';
import { generateRoleplayResponse, generateGuessResponse, generateSpyDescription, generateSpyVote, generateAiGuess, generateSpeech, decodeAndPlayAudio } from '../services/gemini';
import { Button } from './Button';
import { FormattedChatMessage } from './FormattedChatMessage';

interface RoleplayGameRoomProps {
    gameState: RoleplayGameState;
    onEndGame: (won: boolean) => void;
    onBack: () => void;
    onRestart: () => void;
    userCoins: number;
    onDeductCoins: (amount: number) => boolean;
}

export const RoleplayGameRoom: React.FC<RoleplayGameRoomProps> = ({ gameState, onEndGame, onBack, onRestart, userCoins, onDeductCoins }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [timeLeft, setTimeLeft] = useState(60);
    const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
    // For Guess game, start with AI thinking (disabled input) until first question arrives
    const [isAiThinking, setIsAiThinking] = useState(gameState.scenario.gameType === 'guess');

    // Count Game State
    const [currentCount, setCurrentCount] = useState(0);

    // Spy Game State
    const [spyPlayers, setSpyPlayers] = useState<SpyPlayer[]>(gameState.spyPlayers || []);
    const [spyTurnIndex, setSpyTurnIndex] = useState(0);
    const [spyPhase, setSpyPhase] = useState<'description' | 'vote'>(gameState.spyPhase || 'description');

    // Guess Game State
    const [guessTurnCount, setGuessTurnCount] = useState(0);
    const [translatedMessages, setTranslatedMessages] = useState<Record<string, boolean>>({});
    const [showVoteModal, setShowVoteModal] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const splitRef = useRef<HTMLDivElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Trigger Vote Modal
    useEffect(() => {
        if (spyPhase === 'vote' && gameStatus === 'playing') {
            setShowVoteModal(true);
        } else {
            setShowVoteModal(false);
        }
    }, [spyPhase, gameStatus]);

    // Auto Start for Guess Who
    useEffect(() => {
        // Removed !isAiThinking check to allow start even if init=true
        if (gameState.scenario.gameType === 'guess' && messages.length === 0 && gameStatus === 'playing') {
            const startGuessGame = async () => {
                // Check if we need to wait for component mount basics? No, just run.
                // Need to ensure aiChar is ready.
                if (!aiChar) return;

                setIsAiThinking(true);
                try {
                    const aiResp = await generateAiGuess(aiChar.name, "Unknown", [], aiChar.aiBrain);
                    setIsAiThinking(false);
                    processAiResponse(aiResp, aiChar.id, aiChar.name); // Using processAiResponse directly
                } catch (e) {
                    setIsAiThinking(false);
                    console.error(e);
                }
            };
            startGuessGame();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameState.scenario.gameType, messages.length]);

    const getPlayerAvatar = (playerId: string) => {
        if (playerId === 'user') return userChar.avatarUrl;
        const char = gameState.scenario.characters.find(c => c.id === playerId);
        return char ? char.avatarUrl : 'https://via.placeholder.com/150';
    };

    const handleVote = (targetName: string) => {
        setShowVoteModal(false);
        // Visual feedback immediate, logic follows
        handleSpyGameLogic(targetName);
    };

    // Audio Context Management
    useEffect(() => {
        return () => {
            audioContextRef.current?.close();
        };
    }, []);

    const getAudioContext = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        return audioContextRef.current;
    };

    const playAudio = (base64: string) => {
        const ctx = getAudioContext();
        decodeAndPlayAudio(base64, ctx);
    };

    const toggleTranslation = (msgId: string) => {
        setTranslatedMessages(prev => ({ ...prev, [msgId]: !prev[msgId] }));
    };

    const processAiResponse = async (
        aiResp: ChatResponse,
        senderId: string,
        senderSpecies: string,
        senderPersona: string = 'playful' // Default persona
    ) => {
        const msgId = Date.now().toString();

        // 1. Create initial message
        const aiMsg: Message = {
            id: msgId,
            senderId: senderId,
            text: aiResp.translation,
            rawSound: aiResp.raw_sound,
            timestamp: Date.now(),
            isAudio: true,
            isTranslated: false
        };
        setMessages(prev => [...prev, aiMsg]);

        // 2. Generate and attach audio
        try {
            // Note: In Roleplay, we might stick to a default persona logic or fetch real one
            // Ideally we should pass the full character object, but here we just need species/persona for TTS
            const character = gameState.scenario.characters.find(c => c.id === senderId);
            const brain = character?.aiBrain;
            const audio = await generateSpeech(aiResp.translation, senderSpecies, senderPersona, 5, brain?.ttsVoice, brain, aiResp.raw_sound);
            if (audio) {
                setMessages(prev => prev.map(m => m.id === msgId ? { ...m, audioUrl: audio } : m));
                // Optional: Auto-play? Maybe not to avoid chaos in fast games, 
                // but ChatRoom plays auto. Let's auto-play for immersion.
                playAudio(audio);
            }
        } catch (e) {
            console.error("TTS failed", e);
        }
        return aiMsg;
    };

    // Avatars
    const userChar = gameState.scenario.characters.find(c => c.id === gameState.userCharacterId);
    // For 1v1 games
    const aiChar = gameState.scenario.characters.find(c => c.id === gameState.aiCharacterIds[0]);

    if (!userChar) {
        console.error("Critical: User Character not found in scenario!", gameState);
        return <div className="p-4 text-red-500 font-bold">Error: Valid character not found. Please restart game.</div>;
    }

    // Scroll to bottom
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isAiThinking]);

    // Timer Logic
    useEffect(() => {
        if (gameStatus !== 'playing') {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        // Only run timer for User Turn (except Spy game handles turns differently)
        if (gameState.scenario.gameType === 'spy') {
            const currentPlayer = spyPlayers[spyTurnIndex];
            // If it's AI turn in description phase, pause timer
            if (spyPhase === 'description' && currentPlayer && currentPlayer.isAi) {
                if (timerRef.current) clearInterval(timerRef.current);
                return;
            }
        }

        if (isAiThinking) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    // Time's up logic with ANSWER REVEAL
                    let reason = "Time's up!";
                    if (gameState.scenario.gameType === 'taboo') {
                        reason = `Time's up! You lose. Your forbidden word was "${gameState.userTabooWord}". AI's was "${gameState.targetTabooWord}".`;
                    } else if (gameState.scenario.gameType === 'guess') {
                        reason = `Time's up! You lose. The word was "${gameState.userTargetWord}".`;
                    } else if (gameState.scenario.gameType === 'spy') {
                        const spyName = spyPlayers.find(p => p.role === 'spy')?.name || 'Unknown';
                        reason = `Time's up! You lose. The Spy was ${spyName}.`;
                    } else {
                        reason = "Time's up! You lose.";
                    }

                    handleGameOver(false, reason);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [gameStatus, messages, isAiThinking, spyTurnIndex, spyPhase, spyPlayers, gameState]);

    const resetTimer = () => {
        setTimeLeft(60);
    };

    const addSystemMessage = (text: string) => {
        const sysMsg: Message = {
            id: Date.now().toString(),
            senderId: 'system',
            text: text,
            timestamp: Date.now(),
            isAudio: false,
            isTranslated: true
        };
        setMessages(prev => [...prev, sysMsg]);
    };

    const handleGameOver = (won: boolean, reason: string) => {
        setGameStatus(won ? 'won' : 'lost');
        addSystemMessage(reason);
        if (won) onEndGame(true);
    };

    const handleSurrender = () => {
        let reason = "You surrendered.";
        if (gameState.scenario.gameType === 'taboo') {
            reason = `You gave up! Your forbidden word was "${gameState.userTabooWord}". AI's was "${gameState.targetTabooWord}".`;
        } else if (gameState.scenario.gameType === 'guess') {
            reason = `You gave up! The word was "${gameState.userTargetWord}".`;
        } else if (gameState.scenario.gameType === 'spy') {
            const spyName = spyPlayers.find(p => p.role === 'spy')?.name || 'Unknown';
            reason = `You gave up! The Spy was ${spyName}.`;
        }
        handleGameOver(false, reason);
    };

    const handleTryAgain = () => {
        onRestart();
    };

    // --- GAME ENGINE HANDLERS ---
    // (Existing handlers kept same, just ensuring context is correct)

    const handleTabooLogic = async (text: string) => {
        // Add user message to chat
        const userMsg: Message = {
            id: Date.now().toString(),
            senderId: 'user',
            text: text,
            timestamp: Date.now(),
            isAudio: false,
            isTranslated: true
        };
        setMessages(prev => [...prev, userMsg]);

        if (text.toLowerCase().includes(gameState.userTabooWord!.toLowerCase())) {
            handleGameOver(false, `You said your forbidden word: "${gameState.userTabooWord}". (AI's word was "${gameState.targetTabooWord}")`);
            return;
        }

        setIsAiThinking(true);
        try {
            const history = messages.map(m => m.text);
            history.push(text);
            const aiResp = await generateRoleplayResponse(aiChar!.name, gameState.targetTabooWord!, gameState.userTabooWord!, history, aiChar?.aiBrain);

            setIsAiThinking(false);

            // Use name as species for voice inference
            processAiResponse(aiResp, aiChar!.id, aiChar!.name);

            if (aiResp.translation.toLowerCase().includes(gameState.targetTabooWord!.toLowerCase())) {
                handleGameOver(true, `Victory! AI said: "${gameState.targetTabooWord}". (Your word was "${gameState.userTabooWord}")`);
            }
        } catch (e) {
            setIsAiThinking(false);
        }
    };

    const handleGuessLogic = async (text: string) => {
        // 1. Add User Confirmation
        const userMsg: Message = {
            id: Date.now().toString(),
            senderId: 'user',
            text: text,
            timestamp: Date.now(),
            isAudio: false,
            isTranslated: true
        };
        setMessages(prev => [...prev, userMsg]);

        // 2. Check Conditions
        if (text === "IT'S CORRECT!") {
            handleGameOver(false, "AI successfully guessed your word! AI Wins!");
            return;
        }

        // 3. Check Turn Limit
        if (guessTurnCount >= 20) {
            handleGameOver(true, "20 Questions reached! AI failed to guess. You Win!");
            return;
        }
        setGuessTurnCount(prev => prev + 1);

        // 4. AI Turn
        setIsAiThinking(true);
        try {
            const history = messages.map(m => m.text);
            history.push(text);

            const aiResp = await generateAiGuess(aiChar!.name, "Unknown", history, aiChar?.aiBrain);
            setIsAiThinking(false);

            processAiResponse(aiResp, aiChar!.id, aiChar!.name);
        } catch (e) {
            setIsAiThinking(false);
            console.error(e);
        }
    };

    const handleCountLogic = (text: string) => {
        const parts = text.trim().split(/\s+/).map(Number);
        if (parts.some(isNaN)) {
            addSystemMessage("Invalid input. Type numbers only (e.g. '1' or '1 2').");
            return;
        }

        let next = currentCount;
        for (const p of parts) {
            if (p !== next + 1) {
                addSystemMessage(`Wrong number. Next is ${next + 1}.`);
                return;
            }
            next = p;
        }

        // Add user message to chat
        const userMsg: Message = {
            id: Date.now().toString(),
            senderId: 'user',
            text: text,
            timestamp: Date.now(),
            isAudio: false,
            isTranslated: true
        };
        setMessages(prev => [...prev, userMsg]);

        setCurrentCount(next);

        if (next >= 30) {
            handleGameOver(false, "You said 30. You Lose!");
            return;
        }

        setIsAiThinking(true);
        setTimeout(() => {
            setIsAiThinking(false);
            let aiMoveCount = 0;
            const target = Math.floor(next / 3) * 3 + 3;

            if (next % 3 === 0) {
                aiMoveCount = Math.random() > 0.5 ? 1 : 2;
            } else {
                aiMoveCount = target - next;
            }

            if (next + aiMoveCount >= 30) {
                if (next === 29) {
                    handleGameOver(true, "AI forced to say 30. You Win!");
                    return;
                }
                aiMoveCount = 1;
            }

            const aiNums = [];
            let aiNext = next;
            for (let i = 0; i < aiMoveCount; i++) {
                aiNext++;
                aiNums.push(aiNext);
            }

            setCurrentCount(aiNext);

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(), senderId: aiChar!.id,
                text: aiNums.join(' '), timestamp: Date.now(), isAudio: false, isTranslated: true
            };
            setMessages(prev => [...prev, aiMsg]);

            if (aiNext >= 30) {
                handleGameOver(true, "AI said 30. You Win!");
            }

        }, 1000);
    };

    const handleSpyGameLogic = async (text?: string) => {
        const players = [...spyPlayers];
        const player = players[spyTurnIndex];

        if (gameStatus !== 'playing') return;

        if (spyPhase === 'description') {
            if (player.isAi) {
                setIsAiThinking(true);
                const history = messages.map(m => m.text);
                const character = gameState.scenario.characters.find(c => c.id === player.id);
                const aiResp = await generateSpyDescription(player, history, character?.aiBrain);
                setIsAiThinking(false);

                processAiResponse(aiResp, player.id, player.name);
            } else {
                if (!text) return;
                const userMsg: Message = {
                    id: Date.now().toString(), senderId: 'user',
                    text: `${userChar.name}: ${text}`, timestamp: Date.now(), isAudio: false, isTranslated: true
                };
                setMessages(prev => [...prev, userMsg]);
            }

            let nextIndex = (spyTurnIndex + 1) % players.length;
            while (!players[nextIndex].isAlive) {
                nextIndex = (nextIndex + 1) % players.length;
            }

            if (nextIndex <= spyTurnIndex) {
                setSpyPhase('vote');
                addSystemMessage("Voting Phase Started! Type the name of the suspicious player.");
            }
            setSpyTurnIndex(nextIndex);

        } else if (spyPhase === 'vote') {
            if (!text) return;
            addSystemMessage("Voting in progress...");
            const votes: Record<string, number> = {};
            const aliveAIs = players.filter(p => p.isAlive && p.isAi);
            const alivePlayers = players.filter(p => p.isAlive);
            const history = messages.map(m => m.text);

            await Promise.all(aliveAIs.map(async (aiP) => {
                try {
                    const character = gameState.scenario.characters.find(c => c.id === aiP.id);
                    const targetNameRaw = await generateSpyVote(aiP, alivePlayers, history, character?.aiBrain);
                    const target = alivePlayers.find(p => targetNameRaw.toLowerCase().includes(p.name.toLowerCase()));
                    if (target) {
                        votes[target.name] = (votes[target.name] || 0) + 1;
                    }
                } catch (e) { console.error(e); }
            }));

            const target = alivePlayers.find(p => text.toLowerCase().includes(p.name.toLowerCase()));
            if (target) {
                addSystemMessage(`You voted for ${target.name}.`);
                votes[target.name] = (votes[target.name] || 0) + 1;
            } else {
                addSystemMessage(`User voted for unknown: "${text}". Vote wasted.`);
            }

            let maxVotes = 0;
            let eliminatedName = '';

            Object.entries(votes).forEach(([name, count]) => {
                if (count > maxVotes) {
                    maxVotes = count;
                    eliminatedName = name;
                }
            });

            if (eliminatedName) {
                addSystemMessage(`Player eliminated: ${eliminatedName} with ${maxVotes} votes.`);
                const elimPlayerIndex = players.findIndex(p => p.name === eliminatedName);

                if (elimPlayerIndex !== -1) {
                    players[elimPlayerIndex].isAlive = false;
                    setSpyPlayers([...players]);

                    const elimPlayer = players[elimPlayerIndex];
                    if (elimPlayer.role === 'spy') {
                        handleGameOver(true, `The Spy was caught! Civilians Win! (Spy was ${elimPlayer.name})`);
                        return;
                    } else if (elimPlayer.id === 'user') {
                        const spyName = players.find(p => p.role === 'spy')?.name || 'Unknown';
                        handleGameOver(false, `You were voted out! You Lose! (Spy was ${spyName})`);
                        return;
                    }
                }
            } else {
                addSystemMessage("No one eliminated (Tie or no votes).");
            }

            const aliveCount = players.filter(p => p.isAlive).length;
            const spyAlive = players.some(p => p.isAlive && p.role === 'spy');

            if (aliveCount <= 2 && spyAlive) {
                const spyName = players.find(p => p.role === 'spy')?.name || 'Unknown';
                handleGameOver(false, `Spy survived until the end. Spy Wins! (Spy was ${spyName})`);
                return;
            }

            setSpyPhase('description');
            let nextRoundStart = 0;
            while (nextRoundStart < players.length && !players[nextRoundStart].isAlive) {
                nextRoundStart++;
            }
            setSpyTurnIndex(nextRoundStart);
            addSystemMessage("Next Round: Describe your word!");
        }
    };

    useEffect(() => {
        if (gameState.scenario.gameType === 'spy' && gameStatus === 'playing') {
            const currentPlayer = spyPlayers[spyTurnIndex];
            if (currentPlayer && currentPlayer.isAi && spyPhase === 'description') {
                const timer = setTimeout(() => handleSpyGameLogic(), 1500);
                return () => clearTimeout(timer);
            }
        }
    }, [spyTurnIndex, spyPhase, spyPlayers, gameStatus]);

    const handleSendMessage = (overrideText?: string) => {
        if ((!inputValue.trim() && !overrideText) || gameStatus !== 'playing') return;
        const text = overrideText || inputValue.trim();
        if (!overrideText) setInputValue('');
        resetTimer();

        if (gameState.scenario.gameType === 'taboo') handleTabooLogic(text);
        else if (gameState.scenario.gameType === 'guess') handleGuessLogic(text);
        else if (gameState.scenario.gameType === 'count') handleCountLogic(text);
        else if (gameState.scenario.gameType === 'spy') handleSpyGameLogic(text);
    };

    const getTopBarContent = () => {
        if (gameState.scenario.gameType === 'taboo') {
            return (
                <div className="flex flex-col items-center">
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">MAKE THEM SAY</span>
                    <span className="text-2xl font-black text-yellow-400 animate-pulse">{gameState.targetTabooWord?.toUpperCase()}</span>
                </div>
            );
        }
        if (gameState.scenario.gameType === 'guess') {
            return (
                <div className="flex flex-col items-center">
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">AI GUESSING YOUR WORD</span>
                    <span className="text-xl font-black text-yellow-400">{gameState.userTargetWord?.toUpperCase()}</span>
                    <span className="text-[10px] font-bold text-gray-500 mt-1">TURN {guessTurnCount}/20</span>
                </div>
            );
        }
        if (gameState.scenario.gameType === 'count') {
            return (
                <div className="flex flex-col items-center">
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">CURRENT COUNT</span>
                    <span className="text-4xl font-black text-blue-400">{currentCount}</span>
                </div>
            );
        }
        if (gameState.scenario.gameType === 'spy') {
            const myPlayer = spyPlayers.find(p => p.id === 'user');
            return (
                <div className="flex flex-col items-center">
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">YOUR SECRET WORD</span>
                    <span className="text-xl font-black text-green-400">{myPlayer?.word}</span>
                </div>
            );
        }
        return null;
    };

    const isInputDisabled = () => {
        if (gameState.scenario.gameType === 'spy') {
            if (spyPhase === 'description' && spyPlayers[spyTurnIndex].isAi) return true;
            return false;
        }
        return isAiThinking;
    };

    const getInputPlaceholder = () => {
        if (spyPhase === 'vote') return "Type player name to vote...";
        /* Guess logic uses buttons */
        return "Type here...";
    }

    return (
        <div className="flex flex-col h-full bg-gray-100">
            {/* Top Bar */}
            <div className="bg-black text-white p-3 flex justify-between items-center shadow-md z-10">
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="text-white font-bold px-2 rounded hover:bg-gray-800">Exit</button>
                    {gameStatus === 'playing' && (
                        <button onClick={handleSurrender} className="text-red-400 font-bold text-xs border border-red-500 px-2 py-1 rounded hover:bg-red-900">Surrender</button>
                    )}
                </div>
                {getTopBarContent()}
                <div className={`w-12 h-12 rounded-full border-4 border-white flex items-center justify-center font-black text-xl ${timeLeft <= 10 ? 'bg-red-500 animate-ping' : 'bg-gray-800'}`}>
                    {timeLeft}
                </div>
            </div>

            {/* Vote Modal */}
            {showVoteModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-white rounded-3xl border-4 border-black p-6 w-full max-w-md shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <h2 className="text-2xl font-black text-center mb-6 uppercase tracking-widest text-red-500">Who is the Spy?</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {spyPlayers.filter(p => p.isAlive && p.id !== 'user').map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => handleVote(p.name)}
                                    className="flex flex-col items-center gap-2 p-4 border-4 border-gray-200 rounded-xl hover:border-black hover:bg-red-50 transition-all active:scale-95 bg-white"
                                >
                                    <img src={getPlayerAvatar(p.id)} className="w-16 h-16 rounded-full border-2 border-black object-cover bg-gray-100" />
                                    <span className="font-bold text-sm text-center leading-tight">{p.name}</span>
                                </button>
                            ))}
                        </div>
                        <p className="text-center mt-6 text-gray-400 text-xs font-bold uppercase tracking-widest">Tap a suspect to vote</p>
                    </div>
                </div>
            )}

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-purple-50">

                {messages.map((msg) => {
                    if (msg.senderId === 'system') {
                        return (
                            <div key={msg.id} className="flex justify-center my-4">
                                <div className={`px-4 py-2 rounded-xl font-bold text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${msg.text.includes('Victory') || msg.text.includes('Win') ? 'bg-green-500' : 'bg-gray-500'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        );
                    }
                    const isUser = msg.senderId === 'user';
                    let avatar = userChar.avatarUrl;
                    if (!isUser) {
                        const sender = gameState.scenario.characters.find(c => c.id === msg.senderId);
                        if (sender) avatar = sender.avatarUrl;
                    }

                    const showTranslation = translatedMessages[msg.id] ?? (['guess', 'spy'].includes(gameState.scenario.gameType));

                    return (
                        <div key={msg.id} className={`flex w-full gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                            {!isUser && <img src={avatar} className="w-10 h-10 rounded-full border-2 border-black bg-white" />}

                            <div
                                className={`
                                    max-w-[75%] border-4 border-black rounded-2xl p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] 
                                    ${isUser ? 'bg-blue-300 rounded-tr-none' : 'bg-white rounded-tl-none'}
                                    ${!isUser && msg.isAudio ? 'cursor-pointer active:scale-95 transition-transform' : ''}
                                `}
                                onClick={() => !isUser && msg.isAudio && toggleTranslation(msg.id)}
                            >
                                {!isUser && msg.isAudio ? (
                                    <div className="flex flex-col min-w-[120px]">
                                        <div className="flex items-center gap-2 select-none">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (msg.audioUrl) playAudio(msg.audioUrl);
                                                    toggleTranslation(msg.id); // Also reveal translation on play
                                                }}
                                                className="w-10 h-10 bg-green-400 hover:bg-green-500 rounded-full flex items-center justify-center text-white border-2 border-black active:translate-y-1 active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex-shrink-0"
                                            >
                                                <span className="text-sm ml-0.5">▶</span>
                                            </button>
                                            <div className="font-black text-lg italic text-gray-800 tracking-wide break-words leading-tight">
                                                "{msg.rawSound}"
                                            </div>
                                        </div>

                                        {showTranslation ? (
                                                 <div className="font-bold text-gray-700 leading-snug w-full">
                                                     <FormattedChatMessage text={msg.text} />
                                                 </div>
                                        ) : (
                                            <div className="mt-2 text-[10px] text-gray-400 font-bold text-center uppercase tracking-widest select-none border-t border-gray-100 pt-1">
                                                Tap to Translate
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                     <div className="font-bold w-full">
                                         <FormattedChatMessage text={typeof msg.text === 'string' ? msg.text : (msg.text as any)?.translation || JSON.stringify(msg.text)} />
                                     </div>
                                )}
                            </div>

                            {isUser && <img src={userChar.avatarUrl} className="w-10 h-10 rounded-full border-2 border-black bg-white" />}
                        </div>
                    );
                })}

                {isAiThinking && (
                    <div className="flex gap-2">
                        <div className="w-10 h-10 rounded-full border-2 border-black bg-gray-200" />
                        <div className="bg-gray-200 border-4 border-black rounded-2xl p-3 animate-pulse">
                            ...
                        </div>
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            {gameStatus === 'playing' ? (
                <div className="bg-white border-t-4 border-black p-4">
                    {gameState.scenario.gameType === 'guess' ? (
                        <div className="flex-1 flex gap-2 justify-center">
                            <Button onClick={() => handleSendMessage('Yes')} disabled={isInputDisabled()} className="flex-1 bg-green-400">YES</Button>
                            <Button onClick={() => handleSendMessage('No')} disabled={isInputDisabled()} className="flex-1 bg-red-400">NO</Button>
                            <Button onClick={() => handleSendMessage("IT'S CORRECT!")} disabled={isInputDisabled()} className="flex-1 bg-yellow-400 text-xs">IT'S CORRECT!</Button>
                        </div>
                    ) : gameState.scenario.gameType === 'count' ? (
                        <div className="flex-1 flex gap-2 justify-center">
                            <Button
                                onClick={() => handleSendMessage(`${currentCount + 1}`)}
                                disabled={isInputDisabled()}
                                className="flex-1 bg-blue-300 text-lg border-b-8 active:border-b-0 active:translate-y-2"
                            >
                                {currentCount + 1}
                            </Button>
                            <Button
                                onClick={() => handleSendMessage(`${currentCount + 1} ${currentCount + 2}`)}
                                disabled={isInputDisabled()}
                                className="flex-1 bg-blue-400 text-lg border-b-8 active:border-b-0 active:translate-y-2"
                            >
                                {currentCount + 1}, {currentCount + 2}
                            </Button>
                        </div>
                    ) : (
                        <div className="flex-1 flex gap-2">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder={getInputPlaceholder()}
                                autoFocus
                                disabled={isInputDisabled()}
                                className="flex-1 border-4 border-black rounded-xl p-3 font-bold focus:outline-none focus:ring-4 ring-purple-300 disabled:opacity-50"
                            />
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={isInputDisabled()}
                                className="bg-green-400 text-white font-black border-4 border-black rounded-xl px-6 hover:bg-green-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 disabled:opacity-50 disabled:shadow-none"
                            >
                                SEND
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white border-t-4 border-black p-6 flex gap-4">
                    {gameStatus === 'lost' && (
                        <Button onClick={handleTryAgain} variant="primary" fullWidth className="text-xl">
                            Try Again
                        </Button>
                    )}
                    <Button onClick={onBack} variant="secondary" fullWidth className="text-xl">
                        {gameStatus === 'won' ? 'Collect Reward & Exit' : 'Exit Game'}
                    </Button>
                </div>
            )
            }
        </div >
    );
};
