import React, { useState, useEffect } from 'react';
import { Contact } from '../../types';
import { AiSimState, MapBuilding } from './types';
import { MAP_TRANSLATIONS, getContactLocation } from './translations';
import { eventService, ToonEvent } from '../../lib/event-service';

interface CharacterInfoCardProps {
    selectedContact: Contact | null;
    setSelectedContact: (c: Contact | null) => void;
    contacts: Contact[];
    onUpdateContactState?: (contactId: string, newState: 'work' | 'rest' | 'social' | 'sick' | 'hospitalized') => void;
    buildings: MapBuilding[];
    aiSimulationState: Record<string, AiSimState>;
    language: string;
    onChat: (contact: Contact) => void;
    completedActivityMessages?: Record<string, { text: string; unread: boolean }>;
}

export const CharacterInfoCard: React.FC<CharacterInfoCardProps> = ({
    selectedContact,
    setSelectedContact,
    contacts,
    onUpdateContactState,
    buildings,
    aiSimulationState,
    language,
    onChat,
    completedActivityMessages
}) => {
    if (!selectedContact) return null;

    const [activeQuarrel, setActiveQuarrel] = useState<ToonEvent | null>(null);

    useEffect(() => {
        const checkQuarrel = async () => {
            const quarrels = await eventService.getRecentQuarrels();
            const found = quarrels.find(q => q.characters.includes(selectedContact.id));
            setActiveQuarrel(found || null);
        };
        checkQuarrel();
        const interval = setInterval(checkQuarrel, 5000);
        return () => clearInterval(interval);
    }, [selectedContact.id]);

    const isChinese = language === "简体中文";
    const loc = getContactLocation(selectedContact);

    const handleStateChange = (newState: 'work' | 'rest' | 'social' | 'sick' | 'hospitalized') => {
        if (onUpdateContactState) {
            onUpdateContactState(selectedContact.id, newState);
        }
        setSelectedContact({ ...selectedContact, aiState: newState });
    };

    const handleMediate = async () => {
        if (!activeQuarrel) return;
        
        // Mark as resolved
        const updated = { ...activeQuarrel, status: 'RESOLVED' as const };
        await eventService.updateEvent(updated);
        setActiveQuarrel(null);
        
        // Visual feedback
        alert(isChinese ? "调解成功！危机已化解。" : "Mediation successful! Crisis averted.");
    };

    const energy = selectedContact.energy ?? 100;
    const energyColor = energy > 70 ? 'bg-green-500' : energy > 30 ? 'bg-yellow-500' : 'bg-red-500';

    return (
        <>
            <div className="bg-white border-t-4 border-black p-5 relative z-40 shadow-[0_-5px_15px_rgba(0,0,0,0.1)] transition-all duration-300 max-w-4xl mx-auto w-full text-black">
                <button
                    onClick={() => setSelectedContact(null)}
                    className="absolute top-3 right-3 text-gray-500 hover:text-black font-black text-sm p-1"
                >
                    ✕
                </button>
                <div className="flex gap-4 items-center">
                    <div className="relative shrink-0">
                        <img
                            src={selectedContact.avatarUrl}
                            alt={selectedContact.name}
                            className="w-16 h-16 rounded-full border-4 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] object-cover bg-white"
                        />
                        <span className="absolute -bottom-1 -right-1 text-2xl bg-white border-2 border-black p-0.5 rounded-full select-none">
                            {loc.icon}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start flex-wrap gap-2">
                            <div className="min-w-0 flex-1">
                                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 flex-wrap">
                                    <span className="truncate">{selectedContact.name}</span>
                                    <span className="text-xs bg-indigo-100 border border-indigo-300 text-indigo-700 px-2 py-0.5 rounded font-black uppercase shrink-0">
                                        {selectedContact.species}
                                    </span>
                                </h3>
                                <p className="text-xs font-black text-indigo-500 uppercase mt-0.5 truncate">
                                    📍 {loc.roomName} ({loc.status})
                                </p>
                            </div>
                            <div className="flex gap-2 items-center shrink-0">
                                {activeQuarrel && (
                                    <button
                                        onClick={handleMediate}
                                        className="bg-rose-500 hover:bg-rose-600 text-white font-black text-xs px-4 py-2 rounded-xl border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all animate-pulse uppercase"
                                    >
                                        🤝 {isChinese ? "调解" : "Mediate"}
                                    </button>
                                )}
                                {selectedContact.isAi && (
                                    <div className="flex items-center gap-2 mr-2">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black uppercase text-slate-500">
                                                {isChinese ? "能量" : "Energy"} ({energy}%)
                                            </span>
                                            <div className="w-24 h-2.5 bg-slate-200 rounded-full border-2 border-black overflow-hidden mt-0.5">
                                                <div className={`h-full ${energyColor}`} style={{ width: `${energy}%` }} />
                                            </div>
                                        </div>
                                        <select 
                                            value={selectedContact.aiState || 'work'}
                                            onChange={(e) => handleStateChange(e.target.value as any)}
                                            className="text-xs font-black border-2 border-black rounded-lg px-2 py-1 bg-white outline-none cursor-pointer hover:bg-slate-50 transition-colors uppercase shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                                        >
                                            <option value="work">{isChinese ? "工作" : "Work"}</option>
                                            <option value="rest">{isChinese ? "休息" : "Rest"}</option>
                                            <option value="social">{isChinese ? "社交" : "Social"}</option>
                                            <option value="sick" disabled>{isChinese ? "生病" : "Sick"}</option>
                                            <option value="hospitalized" disabled>{isChinese ? "在医院" : "Hospitalized"}</option>
                                        </select>
                                    </div>
                                )}
                                <button
                                    onClick={() => onChat(selectedContact)}
                                    disabled={selectedContact.aiState === 'rest' || selectedContact.aiState === 'social' || selectedContact.aiState === 'sick' || selectedContact.aiState === 'hospitalized'}
                                    className="bg-yellow-300 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-0.5 text-black font-black text-xs px-4 py-2 rounded-xl border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all uppercase relative"
                                >
                                    {MAP_TRANSLATIONS[language]?.startChat || "Chat"}
                                    {completedActivityMessages?.[selectedContact.id]?.unread && (
                                        <div className="absolute -top-1.5 -right-1.5 bg-red-500 w-4 h-4 rounded-full border-2 border-white animate-pulse shadow-lg" />
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="mt-2 bg-slate-50 border-2 border-black p-2.5 rounded-xl text-xs text-slate-700 font-bold shadow-[2px_2px_0px_rgba(0,0,0,0.05)] flex justify-between items-center">
                            <div className="flex-1 min-w-0 truncate">
                                <span className="text-indigo-600 font-black mr-1">
                                    {MAP_TRANSLATIONS[language]?.currentActivity || "CURRENT ACTIVITY: "}
                                </span>
                                {aiSimulationState[selectedContact.id]?.currentAction || loc.activity}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
