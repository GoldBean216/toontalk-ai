"use client";

import React, { useState, useEffect } from 'react';
import { Contact } from '../../types';
import { MapBuilding, MapBuildingContent } from './types';
import { localChatDB } from '../../lib/local-db';
import { eventService } from '../../lib/event-service';
import { useSkillStore } from '../../lib/skill-store';
import { PRESET_SKILLS } from '../../lib/ai-skills';
import { FormattedChatMessage } from '../FormattedChatMessage';

interface BuildingCardProps {
    selectedBuilding: MapBuilding;
    setSelectedBuilding: (b: MapBuilding | null) => void;
    buildings: MapBuilding[];
    setBuildings: React.Dispatch<React.SetStateAction<MapBuilding[]>>;
    contacts: Contact[];
    language: string;
    onOpenGameLobby?: () => void;
    onOpenMall?: () => void;
    onOpenSkillMall?: () => void;
    userId?: string;
    onOpenBuildingChat?: (building: MapBuilding) => void;
}

export const BuildingCard: React.FC<BuildingCardProps> = ({
    selectedBuilding,
    setSelectedBuilding,
    buildings,
    setBuildings,
    contacts,
    language,
    onOpenGameLobby,
    onOpenMall,
    onOpenSkillMall,
    userId,
    onOpenBuildingChat,
}) => {
    const isChinese = language === "简体中文";
    const isJapanese = language === "日本語";

    const getBuildingItemIcon = (b: MapBuilding) => {
        const type = (b.type || '').toLowerCase();
        const tag = (b.tag || '').toLowerCase();
        const id = (b.id || '').toLowerCase();
        const name = (b.name || '').toLowerCase();

        if (type.includes('office') || tag.includes('office') || id.includes('hq') || name.includes('办公')) {
            return { emoji: '📄', label: isChinese ? '文件' : 'Document' };
        }
        if (type.includes('cafe') || id.includes('cafe') || tag.includes('cafe') || name.includes('咖啡')) {
            return { emoji: '☕', label: isChinese ? '咖啡' : 'Coffee' };
        }
        if (id.includes('boba') || tag.includes('boba') || name.includes('奶茶') || name.includes('茶')) {
            return { emoji: '🍵', label: isChinese ? '奶茶' : 'Boba' };
        }
        if (type.includes('gym') || id.includes('gym') || name.includes('健身')) {
            return { emoji: '💪', label: isChinese ? '健身' : 'Workout' };
        }
        if (type.includes('transit') || id.includes('station') || name.includes('地铁')) {
            return { emoji: '🚇', label: isChinese ? '车票' : 'Ticket' };
        }
        if (type.includes('education') || id.includes('library') || name.includes('图书') || name.includes('学校')) {
            return { emoji: '📖', label: isChinese ? '书籍' : 'Book' };
        }
        if (type.includes('shop') || id.includes('store') || name.includes('商店') || name.includes('超市')) {
            return { emoji: '🛍️', label: isChinese ? '商品' : 'Product' };
        }
        if (id.includes('cinema') || name.includes('影院') || name.includes('电影')) {
            return { emoji: '🎟️', label: isChinese ? '电影票' : 'Movie Ticket' };
        }
        if (id.includes('arcade') || name.includes('游戏') || name.includes('电玩')) {
            return { emoji: '👾', label: isChinese ? '游戏币' : 'Game Token' };
        }
        return { emoji: b.emoji || '📦', label: isChinese ? '物品' : 'Item' };
    };

    const [editManagerId, setEditManagerId] = useState<string | null>(selectedBuilding.managerId || null);
    const [editBasicFunction, setEditBasicFunction] = useState(selectedBuilding.basicFunction || "");

    useEffect(() => {
        setEditManagerId(selectedBuilding.managerId || null);
        setEditBasicFunction(selectedBuilding.basicFunction || "");
        setIsEditing(false); // Reset edit mode when switching buildings
    }, [selectedBuilding.id, selectedBuilding.managerId, selectedBuilding.basicFunction]);

    // Local state for selected content (inline modal)
    const [selectedContent, setSelectedContent] = useState<MapBuildingContent | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const { installedSkills, isLoaded, loadInstalledSkills } = useSkillStore();

    useEffect(() => {
        if (!isLoaded) {
            loadInstalledSkills();
        }
    }, [isLoaded, loadInstalledSkills]);

    const allAvailableSkills = React.useMemo(() => {
        return installedSkills;
    }, [installedSkills]);

    const handleActivate = (e: React.MouseEvent) => {
        e.stopPropagation();
        console.log("[BuildingCard] Activating building, setting isEditing to true");
        setIsEditing(true);
    };

    const handleSaveAttributes = async () => {
        setIsSaving(true);
        const updatedBuilding: MapBuilding = {
            ...selectedBuilding,
            isActive: true, // Mark as active on first save
            managerId: editManagerId,
            basicFunction: editBasicFunction,
            health: selectedBuilding.isActive ? selectedBuilding.health : 100 // Initialize health if first time
        };

        // Trigger OPENING event only once
        if (!selectedBuilding.hasAnnounced && updatedBuilding.isActive) {
            const manager = contacts.find(c => c.id === editManagerId);
            eventService.addEvent({
                type: 'OPENING',
                characters: editManagerId ? [editManagerId] : [],
                location: selectedBuilding.id,
                metadata: {
                    buildingName: selectedBuilding.name,
                    buildingType: selectedBuilding.type,
                    reason: manager ? `Congratulations to ${manager.name}!` : "New building in town!"
                }
            });
            updatedBuilding.hasAnnounced = true;
        }

        await updateBuildingInList(updatedBuilding);
        setIsSaving(false);
        setShowSuccess(true);
        setTimeout(() => {
            setShowSuccess(false);
            setIsEditing(false); // Close settings panel
            setSelectedBuilding(null); // Close the detail card modal
            
            // Navigate to building chat room if manager is assigned
            if (editManagerId && onOpenBuildingChat) {
                onOpenBuildingChat(updatedBuilding);
            }
        }, 800);
    };

    const updateBuildingInList = async (updated: MapBuilding) => {
        try {
            const nextBuildings = buildings.map(b => b.id === updated.id ? updated : b);
            setBuildings(nextBuildings);
            setSelectedBuilding(updated);
            
            // Save to IndexedDB for persistence
            await localChatDB.saveBuilding(updated, userId);
            console.log(`[BuildingCard] Saved building ${updated.name} to IndexedDB`);
        } catch (err) {
            console.error("[BuildingCard] Failed to save building:", err);
            alert(isChinese ? "保存失败，请检查控制台错误" : "Save failed, please check console for errors.");
        }
    };

    const handleReaction = async (contentId: string, type: 'like' | 'dislike') => {
        // ── Persist to DB (user reaction) ──────────────────────────────────
        try {
            const reactorId = userId || 'user';
            const apiRes = await fetch('/api/ai/building-contents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contentId, reaction: type, reactorId })
            });
            if (apiRes.ok) {
                const apiData = await apiRes.json();
                if (apiData.skipped) {
                    // Already reacted — optionally show a toast, but do nothing
                    console.log(`[BuildingCard] User already reacted (${apiData.previousReaction}) to content ${contentId}`);
                    return;
                }
                // Use server-authoritative counts if available
                if (typeof apiData.likes === 'number') {
                    const nextContents = (selectedBuilding.generatedContents || []).map(c => {
                        if (c.id === contentId) {
                            return { ...c, likes: apiData.likes, dislikes: apiData.dislikes };
                        }
                        return c;
                    });
                    const healthChange = type === 'like' ? 2 : -1;
                    const currentHealth = selectedBuilding.health ?? 100;
                    const newHealth = Math.min(100, Math.max(0, currentHealth + healthChange));
                    const updatedBuilding = { ...selectedBuilding, generatedContents: nextContents, health: newHealth };
                    if (selectedContent && selectedContent.id === contentId) {
                        setSelectedContent(nextContents.find(c => c.id === contentId) || null);
                    }
                    updateBuildingInList(updatedBuilding);
                    return;
                }
            }
        } catch (apiErr) {
            console.warn('[BuildingCard] Persist reaction API failed, falling back to optimistic update:', apiErr);
        }

        // ── Optimistic fallback (if API unavailable) ───────────────────────
        const nextContents = (selectedBuilding.generatedContents || []).map(c => {
            if (c.id === contentId) {
                return {
                    ...c,
                    likes: type === 'like' ? c.likes + 1 : c.likes,
                    dislikes: type === 'dislike' ? c.dislikes + 1 : c.dislikes,
                };
            }
            return c;
        });

        const healthChange = type === 'like' ? 2 : -1;
        const currentHealth = selectedBuilding.health ?? 100;
        const newHealth = Math.min(100, Math.max(0, currentHealth + healthChange));

        const updatedBuilding = {
            ...selectedBuilding,
            generatedContents: nextContents,
            health: newHealth
        };
        
        if (selectedContent && selectedContent.id === contentId) {
            setSelectedContent(nextContents.find(c => c.id === contentId) || null);
        }

        updateBuildingInList(updatedBuilding);
    };

    const getHealthColor = (h: number) => {
        if (h > 70) return 'bg-green-500';
        if (h > 30) return 'bg-yellow-400';
        return 'bg-red-500';
    };

    return (
        <div 
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto text-black"
            onClick={() => setSelectedBuilding(null)}
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-white border-4 border-black rounded-3xl w-full max-w-lg flex flex-col shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden max-h-[90vh] relative"
            >
                {/* Close button */}
                <button 
                    onClick={() => setSelectedBuilding(null)}
                    className="absolute top-3 right-3 text-slate-500 hover:text-black font-black text-xl hover:bg-slate-100 rounded-full w-8 h-8 flex items-center justify-center transition-colors z-[70]"
                >
                    ✕
                </button>

                {/* Header */}
                <div className="bg-yellow-300 p-5 border-b-4 border-black flex gap-4 items-center rounded-t-2xl relative z-10">
                    <div className="w-14 h-14 rounded-2xl border-3 border-black bg-white flex items-center justify-center text-3xl shadow-[2px_2px_0px_rgba(0,0,0,1)] shrink-0">
                        {selectedBuilding.emoji}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 leading-none">
                            <span className="truncate">{selectedBuilding.name}</span>
                            <span className="text-[10px] bg-indigo-100 border-2 border-indigo-300 text-indigo-700 px-2 py-0.5 rounded-md font-black uppercase shrink-0">
                                {selectedBuilding.tag}
                            </span>
                        </h3>
                        <p className="text-xs font-bold text-slate-700 mt-1 line-clamp-1">
                            {selectedBuilding.description}
                        </p>
                    </div>
                    
                    <div className="flex gap-2 mr-8 shrink-0">
                        {selectedBuilding.id === "arcade" && onOpenGameLobby && (
                            <button 
                                onClick={() => { setSelectedBuilding(null); onOpenGameLobby(); }} 
                                className="bg-white hover:bg-yellow-100 active:translate-y-0.5 text-black font-black text-[10px] px-3 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase transition-all"
                            >
                                🎮 {isChinese ? "玩游戏" : isJapanese ? "ゲーム" : "Play"}
                            </button>
                        )}
                        {(selectedBuilding.id === "store" || selectedBuilding.id === "boba" || selectedBuilding.id === "cafe") && onOpenMall && (
                            <button 
                                onClick={() => { setSelectedBuilding(null); onOpenMall(); }} 
                                className="bg-white hover:bg-cyan-100 active:translate-y-0.5 text-black font-black text-[10px] px-3 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase transition-all"
                            >
                                🛍️ {isChinese ? "商城" : isJapanese ? "モール" : "Mall"}
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col flex-1 overflow-hidden relative min-h-[500px]">
                    {/* Activation Overlay */}
                    {!selectedBuilding.isActive && !isEditing && (
                        <div className="absolute inset-0 z-40 bg-white/90 backdrop-blur-[2px] flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
                            <div className="w-24 h-24 bg-yellow-100 rounded-3xl flex items-center justify-center text-5xl mb-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-bounce">
                                🏗️
                            </div>
                            <h2 className="text-3xl font-black mb-3 uppercase tracking-tight">
                                {isChinese ? "建筑未激活" : isJapanese ? "建物が未アクティブ" : "Building Inactive"}
                            </h2>
                            <p className="text-slate-600 font-bold mb-8 max-w-sm leading-relaxed">
                                {isChinese ? "激活此建筑以开始产出内容，并指派一名经理进行管理。" : 
                                 isJapanese ? "この建物をアクティブにしてコンテンツの生成を開始し、マネージャーを割り当てます。" : 
                                 "Activate this building to start generating content and assign a manager to oversee operations."}
                            </p>
                            <button 
                                onClick={handleActivate}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-10 py-4 rounded-2xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none text-xl uppercase relative z-50"
                            >
                                {isChinese ? "立即激活" : isJapanese ? "アクティブにする" : "Activate Building"}
                            </button>
                        </div>
                    )}

                    {/* Left Column: Attributes (Settings or Details) */}
                    <div className="w-full bg-indigo-50/40 p-6 overflow-y-auto flex flex-col gap-6">
                        {isEditing ? (
                            <>
                                {/* Settings View */}
                                <h4 className="font-black text-xs text-indigo-900 border-b-2 border-black pb-2 mb-2 uppercase tracking-wider">
                                    {isChinese ? "建筑设置" : "Building Settings"}
                                </h4>
                                
                                <section>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 ml-1">
                                        {isChinese ? "指派经理" : "Building Manager"}
                                    </label>
                                    <select 
                                        value={editManagerId || ""}
                                        onChange={(e) => setEditManagerId(e.target.value || null)}
                                        className="w-full bg-white border-2 border-black rounded-xl p-3 text-sm font-bold shadow-[3px_3px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 ring-indigo-500/20"
                                    >
                                        <option value="">{isChinese ? "无经理" : "No Manager"}</option>
                                        {contacts.filter(c => c.isAi).map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </section>

                                 <section>
                                     <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 ml-1">
                                         {isChinese ? "基本功能 (AI 技能)" : isJapanese ? "基本機能 (AIスキル)" : "Basic Function (AI Skill)"}
                                     </label>
                                     {allAvailableSkills.length === 0 ? (
                                         <div className="bg-amber-50 border-2 border-black p-3.5 rounded-xl flex flex-col gap-2 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                                             <p className="text-xs font-black text-amber-800 leading-normal">
                                                 ⚠️ {isChinese ? "您还没有安装任何 AI 技能！" : 
                                                     isJapanese ? "AIスキルがインストールされていません！" : 
                                                     "You haven't installed any AI skills yet!"}
                                             </p>
                                             {(onOpenSkillMall || onOpenMall) && (
                                                 <button
                                                     type="button"
                                                     onClick={() => {
                                                         setSelectedBuilding(null);
                                                         if (onOpenSkillMall) {
                                                             onOpenSkillMall();
                                                         } else if (onOpenMall) {
                                                             onOpenMall();
                                                         }
                                                     }}
                                                     className="w-full bg-white hover:bg-yellow-100 active:translate-y-0.5 text-black font-black text-[10px] py-2 rounded-xl border-2 border-black shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] active:shadow-none transition-all uppercase"
                                                 >
                                                     🛍️ {isChinese ? "前往技能商城" : isJapanese ? "スキルストアへ" : "Go to Skill Store"}
                                                 </button>
                                             )}
                                         </div>
                                     ) : (
                                         <select 
                                             value={editBasicFunction}
                                             onChange={(e) => setEditBasicFunction(e.target.value)}
                                             className="w-full bg-white border-2 border-black rounded-xl p-3 text-sm font-bold shadow-[3px_3px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 ring-indigo-500/20"
                                         >
                                             <option value="">{isChinese ? "请选择一个技能..." : "Select a skill..."}</option>
                                             {allAvailableSkills.map(skill => (
                                                 <option key={skill.id} value={skill.id}>
                                                     {skill.icon} {skill.name}
                                                 </option>
                                             ))}
                                         </select>
                                     )}
                                 </section>

                                <div className="flex gap-3 mt-auto">
                                    {!selectedBuilding.isActive && (
                                        <button 
                                            onClick={() => setIsEditing(false)}
                                            className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black py-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all uppercase text-sm"
                                        >
                                            {isChinese ? "取消" : "Cancel"}
                                        </button>
                                    )}
                                    {selectedBuilding.isActive && (
                                        <button 
                                            onClick={() => {
                                                setIsEditing(false);
                                                // Revert local state
                                                setEditManagerId(selectedBuilding.managerId || null);
                                                setEditBasicFunction(selectedBuilding.basicFunction || "");
                                            }}
                                            className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black py-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all uppercase text-sm"
                                        >
                                            {isChinese ? "返回" : "Back"}
                                        </button>
                                    )}
                                    <button 
                                        onClick={handleSaveAttributes}
                                        disabled={isSaving}
                                        className={`flex-[2] ${showSuccess ? 'bg-green-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'} font-black py-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all uppercase text-sm flex items-center justify-center gap-2`}
                                    >
                                        {isSaving ? (
                                            <>
                                                <span className="animate-spin text-lg">⏳</span>
                                                {isChinese ? "正在保存..." : "SAVING..."}
                                            </>
                                        ) : showSuccess ? (
                                            <>
                                                <span className="text-lg">✅</span>
                                                {isChinese ? "已保存！" : "SAVED!"}
                                            </>
                                        ) : (
                                            isChinese ? "保存设置" : "Save Settings"
                                        )}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Details View */}
                                <h4 className="font-black text-xs text-indigo-900 border-b-2 border-black pb-2 mb-2 uppercase tracking-wider flex justify-between items-center">
                                    <span>{isChinese ? "建筑详情" : "Building Details"}</span>
                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[8px] font-black">
                                        {isChinese ? "运营中" : "OPERATING"}
                                    </span>
                                </h4>

                                {/* Manager Info Card */}
                                <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl border-2 border-black overflow-hidden bg-slate-100 shrink-0">
                                        <img 
                                            src={contacts.find(c => c.id === selectedBuilding.managerId)?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedBuilding.managerId}`} 
                                            className="w-full h-full object-cover" 
                                            alt="Manager" 
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                            {isChinese ? "AI 负责人" : "Manager"}
                                        </div>
                                        <div className="text-lg font-black text-slate-900 truncate">
                                            {contacts.find(c => c.id === selectedBuilding.managerId)?.name || (isChinese ? "未指派" : "Unassigned")}
                                        </div>
                                    </div>
                                </div>



                                {/* Equipped Skill */}
                                <section className="bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                                        {isChinese ? "装备的 AI 技能" : "Equipped Skill"}
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <div className="text-2xl bg-indigo-50 w-10 h-10 flex items-center justify-center rounded-xl border border-indigo-100">
                                            {allAvailableSkills.find(s => s.id === selectedBuilding.basicFunction)?.icon || '🧠'}
                                        </div>
                                        <div className="font-black text-slate-800">
                                            {allAvailableSkills.find(s => s.id === selectedBuilding.basicFunction)?.name || (isChinese ? "默认思考" : "Default Reasoning")}
                                        </div>
                                    </div>
                                </section>



                                <button 
                                    onClick={() => setIsEditing(true)}
                                    className="w-full bg-white hover:bg-slate-50 text-black font-black py-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all uppercase text-sm mt-auto"
                                >
                                    {isChinese ? "设置" : "Settings"}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Inline Content Modal */}
                {selectedContent && (
                    <div 
                        className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn"
                        onClick={() => setSelectedContent(null)}
                    >
                        <div 
                            className="bg-white border-4 border-black rounded-[2.5rem] w-full max-w-lg shadow-[12px_12px_0px_rgba(0,0,0,1)] flex flex-col max-h-[85%] animate-scaleUp overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-5 border-b-4 border-black flex justify-between items-center bg-indigo-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full border-2 border-black overflow-hidden bg-white">
                                        <img src={contacts.find(c => c.id === selectedContent.authorId)?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedContent.authorId}`} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <div>
                                        <span className="font-black text-sm block leading-none">
                                            {contacts.find(c => c.id === selectedContent.authorId)?.name || "AI Agent"}
                                        </span>
                                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter">Content Author</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedContent(null)} 
                                    className="w-10 h-10 rounded-full hover:bg-black/5 flex items-center justify-center text-2xl font-black transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                            
                            <div className="p-8 overflow-y-auto flex-1 text-base font-bold text-slate-700 leading-relaxed selection:bg-yellow-200">
                                <FormattedChatMessage text={selectedContent.markdown} />
                            </div>
                            
                            <div className="p-6 border-t-4 border-black bg-slate-50 flex gap-4">
                                <button 
                                    onClick={() => handleReaction(selectedContent.id, 'like')}
                                    className="flex-1 bg-white hover:bg-green-50 border-2 border-black py-4 rounded-2xl font-black text-sm shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 group"
                                >
                                    <span className="text-xl group-hover:scale-125 transition-transform">👍</span> 
                                    <span>{isChinese ? "赞" : isJapanese ? "いいね" : "Like"} ({selectedContent.likes})</span>
                                </button>
                                <button 
                                    onClick={() => handleReaction(selectedContent.id, 'dislike')}
                                    className="flex-1 bg-white hover:bg-red-50 border-2 border-black py-4 rounded-2xl font-black text-sm shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 group"
                                >
                                    <span className="text-xl group-hover:scale-125 transition-transform">👎</span> 
                                    <span>{isChinese ? "踩" : isJapanese ? "よくない" : "Dislike"} ({selectedContent.dislikes})</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


