import React, { useState } from 'react';
import { Contact } from '../../types';
import { MapBuilding } from './types';

interface SocialPlannerModalProps {
    initiator: Contact;
    contacts: Contact[];
    buildings: MapBuilding[];
    selectedSocialType: 'chat' | 'date' | 'quarrel';
    setSelectedSocialType: (type: 'chat' | 'date' | 'quarrel') => void;
    selectedSocialTargets: string[];
    setSelectedSocialTargets: React.Dispatch<React.SetStateAction<string[]>>;
    selectedSocialVenue: string;
    setSelectedSocialVenue: (venue: string) => void;
    onStartActivity: () => void;
    onClose: () => void;
    language: string;
}

export const SocialPlannerModal: React.FC<SocialPlannerModalProps> = ({
    initiator,
    contacts,
    buildings,
    selectedSocialType,
    setSelectedSocialType,
    selectedSocialTargets,
    setSelectedSocialTargets,
    selectedSocialVenue,
    setSelectedSocialVenue,
    onStartActivity,
    onClose,
    language
}) => {
    const isChinese = language === "简体中文";
    const isJapanese = language === "日本語";

    const t = {
        title: isChinese ? "AI 社交活动规划器" : isJapanese ? "AI ソーシャルプランナー" : "AI Social Planner",
        socialType: isChinese ? "社交种类" : isJapanese ? "ソーシャルタイプ" : "Social Type",
        socialTargets: isChinese ? "选择社交对象" : isJapanese ? "ターゲットの選択" : "Select Targets",
        socialVenue: isChinese ? "选择社交地点" : isJapanese ? "場所の選択" : "Select Venue",
        startBtn: isChinese ? "开始社交活动 🚀" : isJapanese ? "ソーシャル活動を開始 🚀" : "Start Activity 🚀",
        cancelBtn: isChinese ? "取消" : isJapanese ? "キャンセル" : "Cancel",
        chat: isChinese ? "闲聊 💬" : isJapanese ? "雑談 💬" : "Chat 💬",
        date: isChinese ? "约会 ❤️" : isJapanese ? "デート ❤️" : "Date ❤️",
        quarrel: isChinese ? "争吵 💢" : isJapanese ? "喧嘩 💢" : "Quarrel 💢",
        singleSelectTip: isChinese ? "（单选）" : isJapanese ? "（単一選択）" : " (Single Select)",
        multiSelectTip: isChinese ? "（多选，可多选）" : isJapanese ? "（複数選択可能）" : " (Multi-select)",
        noTargetsTip: isChinese ? "没有可选的其他 AI 角色" : isJapanese ? "他のAIキャラクターはいません" : "No other AI characters available",
        selectVenuePlace: isChinese ? "选择建筑地点..." : isJapanese ? "場所を選択してください..." : "Select venue location..."
    };

    // Filter out initiator from targets
    const availableTargets = contacts.filter(c => c.id !== initiator.id && c.isAi && !c.isGroup);

    const handleTypeChange = (type: 'chat' | 'date' | 'quarrel') => {
        setSelectedSocialType(type);
        // Clear targets when changing type to avoid bad state
        setSelectedSocialTargets([]);
    };

    const handleToggleTarget = (targetId: string) => {
        if (selectedSocialType === 'chat') {
            // Multi-select
            setSelectedSocialTargets(prev => 
                prev.includes(targetId) 
                    ? prev.filter(id => id !== targetId) 
                    : [...prev, targetId]
            );
        } else {
            // Single-select
            setSelectedSocialTargets([targetId]);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
            <div className="bg-white border-4 border-black rounded-3xl w-full max-w-md flex flex-col shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-pink-300 to-indigo-300 p-4 border-b-4 border-black flex justify-between items-center rounded-t-2xl">
                    <h2 className="font-black text-xl uppercase text-black tracking-wider flex items-center gap-2">
                        🎉 {t.title}
                    </h2>
                    <button 
                        onClick={onClose}
                        className="font-black text-black hover:bg-white/40 border-2 border-black rounded-lg px-2 py-1 text-sm bg-white"
                    >
                        ✕
                    </button>
                </div>

                {/* Form Content */}
                <div className="p-6 bg-indigo-50/30 space-y-5 text-left max-h-[70vh] overflow-y-auto">
                    {/* Initiator details */}
                    <div className="bg-white border-2 border-black p-3 rounded-2xl flex items-center gap-3">
                        <img 
                            src={initiator.avatarUrl} 
                            className="w-12 h-12 rounded-full border-2 border-black object-cover" 
                            alt={initiator.name}
                        />
                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                                {isChinese ? "活动发起人" : isJapanese ? "発起者" : "Initiator"}
                            </span>
                            <span className="font-bold text-sm text-black">{initiator.name}</span>
                        </div>
                    </div>

                    {/* Social Type */}
                    <div className="space-y-2">
                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                            Select {t.socialType}
                        </label>
                        <select
                            value={selectedSocialType}
                            onChange={(e) => handleTypeChange(e.target.value as any)}
                            className="w-full bg-white border-2 border-black rounded-xl p-2.5 font-bold text-sm shadow-[2px_2px_0px_rgba(0,0,0,1)] outline-none"
                        >
                            <option value="chat">{t.chat}</option>
                            <option value="date">{t.date}</option>
                            <option value="quarrel">{t.quarrel}</option>
                        </select>
                    </div>

                    {/* Targets Selection */}
                    <div className="space-y-2">
                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                            {t.socialTargets} 
                            <span className="text-slate-400 font-bold">
                                {selectedSocialType === 'chat' ? t.multiSelectTip : t.singleSelectTip}
                            </span>
                        </label>
                        
                        {availableTargets.length === 0 ? (
                            <p className="text-xs font-bold text-slate-400 italic bg-white p-3 rounded-xl border border-dashed border-slate-300">
                                {t.noTargetsTip}
                            </p>
                        ) : (
                            <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto p-1 bg-white border-2 border-black rounded-xl shadow-[inset_2px_2px_4px_rgba(0,0,0,0.08)]">
                                {availableTargets.map(c => {
                                    const isSelected = selectedSocialTargets.includes(c.id);
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => handleToggleTarget(c.id)}
                                            className={`flex items-center gap-2 p-2 rounded-lg border-2 text-left font-bold text-xs transition-all ${
                                                isSelected 
                                                    ? 'bg-yellow-100 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]' 
                                                    : 'bg-slate-50 border-slate-200 hover:border-slate-400'
                                            }`}
                                        >
                                            <img 
                                                src={c.avatarUrl} 
                                                className="w-6 h-6 rounded-full border border-black object-cover" 
                                                alt={c.name}
                                            />
                                            <span className="truncate text-black">{c.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Venue Selection */}
                    <div className="space-y-2">
                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                            {t.socialVenue}
                        </label>
                        <select
                            value={selectedSocialVenue}
                            onChange={(e) => setSelectedSocialVenue(e.target.value)}
                            className="w-full bg-white border-2 border-black rounded-xl p-2.5 font-bold text-sm shadow-[2px_2px_0px_rgba(0,0,0,1)] outline-none"
                        >
                            {buildings.map(b => (
                                <option key={b.id} value={b.id}>
                                    {b.emoji} {b.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t-4 border-black bg-slate-50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 bg-white hover:bg-slate-100 text-black border-2 border-black rounded-xl font-black text-sm shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_rgba(0,0,0,1)] transition-all uppercase tracking-wider"
                    >
                        {t.cancelBtn}
                    </button>
                    <button
                        onClick={onStartActivity}
                        disabled={selectedSocialTargets.length === 0}
                        className={`flex-1 py-2.5 border-2 border-black rounded-xl font-black text-sm transition-all uppercase tracking-wider ${
                            selectedSocialTargets.length === 0
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border-slate-300 shadow-none'
                                : 'bg-yellow-400 hover:bg-yellow-500 text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_rgba(0,0,0,1)]'
                        }`}
                    >
                        {t.startBtn}
                    </button>
                </div>
            </div>
        </div>
    );
};
