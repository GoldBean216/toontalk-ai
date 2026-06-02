
import React, { useState, useEffect } from 'react';
import { generateRandomProfiles } from '../services/gemini';
import { Contact } from '../types';
import { Button } from './Button';

interface MeetProps {
    onBack: () => void;
    onSayHello: (contact: Contact) => void;
    userCoins: number;
    onDeductCoins: (amount: number) => boolean;
    userId: string;
}

export const Meet: React.FC<MeetProps> = ({ onBack, onSayHello, userCoins, onDeductCoins, userId }) => {
    const [generated, setGenerated] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const getStorageKey = () => `toontalk_meet_results_${userId}`;

    // Load from localStorage on mount or when userId changes
    useEffect(() => {
        if (!userId) return;
        const saved = localStorage.getItem(getStorageKey());
        if (saved) {
            try {
                setGenerated(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load meet results", e);
            }
        } else {
            setGenerated([]);
        }
    }, [userId]);

    const handleMeet = async () => {
        setIsLoading(true);
        // Don't clear immediately, wait for results to feel "seamless" or show loading state

        try {
            const profiles = await generateRandomProfiles();

            const newContacts: Contact[] = profiles.map((p, index) => ({
                id: `meet_${Date.now()}_${index}`,
                name: p.name,
                species: p.species,
                persona: p.persona,
                avatarUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Robot.png',
                color: `bg-${['pink', 'cyan', 'lime', 'amber'][Math.floor(Math.random() * 4)]}-200`
            }));

            setGenerated(newContacts);
            localStorage.setItem(getStorageKey(), JSON.stringify(newContacts));
        } catch (e) {
            console.error(e);
            alert("The void is empty right now. Try again!");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSayHelloInternal = (contact: Contact) => {
        // Clear meet results from storage and state as requested
        localStorage.removeItem(getStorageKey());
        setGenerated([]);
        onSayHello(contact);
    };

    return (
        <div className="flex flex-col h-full bg-blue-50 overflow-y-auto">
            {/* Header */}
            <div className="bg-white border-b-4 border-black p-4 sticky top-0 z-10 flex items-center shadow-md">
                <button onClick={onBack} className="mr-4 text-2xl font-bold p-2 hover:bg-gray-100 rounded-full border-2 border-transparent hover:border-black transition-all">
                    ←
                </button>
                <h1 className="text-2xl font-black tracking-wider uppercase">Meet & Greet</h1>
            </div>

            <div className="p-6 flex flex-col items-center flex-1">

                {/* Main Action Area */}
                <div className="mb-10 w-full text-center">
                    <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-6">
                        <h2 className="text-3xl font-black mb-2">
                            {generated.length > 0 ? "Someone Else?" : "Who's Out There?"}
                        </h2>
                        <p className="font-bold text-gray-500 mb-6">
                            {generated.length > 0
                                ? "Not feeling these vibes? Summon new entities!"
                                : "Summon 1-3 random entities from the ToonTalk universe!"}
                        </p>
                        <div className="mb-4">
                            <span className="font-bold text-sm bg-green-200 px-3 py-1 rounded-full border-2 border-black">Cost: Free</span>
                        </div>

                        <Button
                            onClick={handleMeet}
                            disabled={isLoading}
                            className={`w-full text-2xl py-6 border-4 border-black font-black transition-all active:translate-y-1 active:shadow-none
                      ${generated.length > 0
                                    ? 'bg-orange-300 hover:bg-orange-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                                    : 'bg-yellow-300 hover:bg-yellow-400 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-pulse'}
                    `}
                        >
                            {isLoading ? 'Summoning...' : (generated.length > 0 ? '🔄 REGENERATE' : '🔮 SUMMON')}
                        </Button>
                    </div>
                </div>

                {/* Results */}
                <div className="w-full space-y-6 pb-24">
                    {generated.map((contact, index) => (
                        <div
                            key={contact.id}
                            className="bg-white border-4 border-black rounded-3xl p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-popIn"
                            style={{ animationDelay: `${index * 150}ms` }}
                        >
                            <div className="flex gap-4 items-start">
                                <img
                                    src={contact.avatarUrl}
                                    className="w-20 h-20 rounded-full border-4 border-black bg-gray-100"
                                />
                                <div className="flex-1">
                                    <h3 className="font-black text-xl">{contact.name}</h3>
                                    <span className="text-xs font-bold bg-black text-white px-2 py-0.5 rounded uppercase">
                                        {contact.species}
                                    </span>
                                    <p className="mt-2 text-sm font-bold text-gray-500 italic leading-snug">
                                        "{contact.persona}"
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <Button onClick={() => handleSayHelloInternal(contact)} className="py-2 text-sm bg-green-400 hover:bg-green-500 font-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    👋 Say Hello
                                </Button>
                            </div>
                        </div>
                    ))}

                    {!isLoading && generated.length === 0 && (
                        <div className="text-center opacity-40 mt-10">
                            <div className="text-6xl mb-4">🕸️</div>
                            <p className="font-bold">It's quiet... too quiet.<br />Summon someone!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
