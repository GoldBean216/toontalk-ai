import React from 'react';
import { MAP_TRANSLATIONS } from './translations';

interface CustomItemModalProps {
    isCustomModalOpen: boolean;
    setIsCustomModalOpen: (open: boolean) => void;
    customModalTab: 'buildings' | 'decors' | 'maps';
    editingCustomItem: any;
    setEditingCustomItem: (item: any) => void;
    customItemName: string;
    setCustomItemName: (name: string) => void;
    customItemTag: string;
    setCustomItemTag: (tag: string) => void;
    customItemWidth: number;
    setCustomItemWidth: (w: number) => void;
    customItemHeight: number;
    setCustomItemHeight: (h: number) => void;
    customItemEmoji: string;
    setCustomItemEmoji: (emoji: string) => void;
    customItemImageUrl: string;
    setCustomItemImageUrl: (url: string) => void;
    customItemDescription: string;
    setCustomItemDescription: (desc: string) => void;
    handleImageFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSaveCustomItem: () => void;
    language: string;
}

export const CustomItemModal: React.FC<CustomItemModalProps> = ({
    isCustomModalOpen,
    setIsCustomModalOpen,
    customModalTab,
    editingCustomItem,
    setEditingCustomItem,
    customItemName,
    setCustomItemName,
    customItemTag,
    setCustomItemTag,
    customItemWidth,
    setCustomItemWidth,
    customItemHeight,
    setCustomItemHeight,
    customItemEmoji,
    setCustomItemEmoji,
    customItemImageUrl,
    setCustomItemImageUrl,
    customItemDescription,
    setCustomItemDescription,
    handleImageFileChange,
    handleSaveCustomItem,
    language
}) => {
    if (!isCustomModalOpen) return null;

    const t = MAP_TRANSLATIONS[language] || {};
    const isChinese = language === "简体中文";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm text-black"
            onClick={() => setIsCustomModalOpen(false)}
        >
            <div
                className="bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_rgba(0,0,0,1)] w-full max-w-lg mx-4 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className={`border-b-4 border-black px-5 py-4 text-white ${
                        customModalTab === "buildings"
                            ? "bg-violet-500"
                            : customModalTab === "decors"
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                    }`}
                >
                    <h2 className="font-black text-lg">
                        {editingCustomItem ? (t.editPrefix || "✏️ Edit ") : (t.addPrefix || "➕ Add ")}
                        {customModalTab === "buildings"
                            ? (t.customBuilding || "Custom Building")
                            : customModalTab === "decors"
                            ? (t.customDecor || "Custom Decor")
                            : (t.customMapPreset || "Custom Map Preset")}
                    </h2>
                    <p className="text-white/80 text-xs mt-0.5">
                        {customModalTab === "maps"
                            ? (t.customMapPresetDesc || "Save the current building and street layout as a custom map preset")
                            : (t.customBlueprintDesc || "Create a blueprint item with custom size, emoji, or image")}
                    </p>
                </div>
                <div className="p-5 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block font-black text-sm text-slate-700 mb-1">
                                {t.customName || "Name *"}
                            </label>
                            <input
                                type="text"
                                value={customItemName}
                                onChange={(e) => setCustomItemName(e.target.value)}
                                placeholder={t.customNamePlaceholder || "e.g. Geek Studio..."}
                                className="w-full border-2 border-black rounded-lg px-3 py-2 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                                autoFocus
                            />
                        </div>
                        {(customModalTab === "buildings" || customModalTab === "decors") && (
                            <div className="w-1/3">
                                <label className="block font-black text-sm text-slate-700 mb-1">
                                    {t.customTag || "Tag"}
                                </label>
                                <input
                                    type="text"
                                    value={customItemTag}
                                    onChange={(e) => setCustomItemTag(e.target.value)}
                                    placeholder="CUSTOM"
                                    className="w-full border-2 border-black rounded-lg px-3 py-2 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                                />
                            </div>
                        )}
                    </div>
                    {(customModalTab === "buildings" || customModalTab === "decors") && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block font-black text-sm text-slate-700 mb-1">
                                    {t.customWidth || "Width (pixels)"}
                                </label>
                                <select
                                    value={customItemWidth}
                                    onChange={(e) => setCustomItemWidth(Number(e.target.value))}
                                    className="w-full border-2 border-black rounded-lg px-3 py-2 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                                >
                                    <option value={40}>{t.customGridOption1 || "40 px (1 grid)"}</option>
                                    <option value={80}>{t.customGridOption2 || "80 px (2 grids)"}</option>
                                    <option value={120}>{t.customGridOption3 || "120 px (3 grids)"}</option>
                                    <option value={160}>{t.customGridOption4 || "160 px (4 grids)"}</option>
                                    <option value={200}>{t.customGridOption5 || "200 px (5 grids)"}</option>
                                    <option value={240}>{t.customGridOption6 || "240 px (6 grids)"}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block font-black text-sm text-slate-700 mb-1">
                                    {t.customHeight || "Height (pixels)"}
                                </label>
                                <select
                                    value={customItemHeight}
                                    onChange={(e) => setCustomItemHeight(Number(e.target.value))}
                                    className="w-full border-2 border-black rounded-lg px-3 py-2 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                                >
                                    <option value={40}>{t.customGridOption1 || "40 px (1 grid)"}</option>
                                    <option value={80}>{t.customGridOption2 || "80 px (2 grids)"}</option>
                                    <option value={120}>{t.customGridOption3 || "120 px (3 grids)"}</option>
                                    <option value={160}>{t.customGridOption4 || "160 px (4 grids)"}</option>
                                    <option value={200}>{t.customGridOption5 || "200 px (5 grids)"}</option>
                                    <option value={240}>{t.customGridOption6 || "240 px (6 grids)"}</option>
                                </select>
                            </div>
                        </div>
                    )}
                    {(customModalTab === "buildings" || customModalTab === "decors") && (
                        <div className="flex gap-4 items-start">
                            <div className="w-24 shrink-0">
                                <label className="block font-black text-sm text-slate-700 mb-1">
                                    {t.customFallbackEmoji || "Fallback Emoji"}
                                </label>
                                <input
                                    type="text"
                                    value={customItemEmoji}
                                    onChange={(e) => setCustomItemEmoji(e.target.value)}
                                    placeholder="🏢"
                                    maxLength={4}
                                    className="w-full border-2 border-black rounded-lg px-3 py-2 font-bold text-lg text-center focus:outline-none focus:ring-2 focus:ring-violet-400"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block font-black text-sm text-slate-700 mb-1">
                                    {isChinese ? "自定义图片 (文件上传)" : "Custom Image (File Upload)"}
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageFileChange}
                                    className="w-full border-2 border-black rounded-lg px-2 py-1 text-xs font-bold bg-slate-50 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-black file:bg-slate-200 hover:file:bg-slate-300"
                                />
                                <div className="text-[10px] text-slate-400 font-semibold mt-1">
                                    {isChinese ? "或者输入图片 URL：" : "Or enter Image URL:"}
                                </div>
                                <input
                                    type="text"
                                    value={customItemImageUrl}
                                    onChange={(e) => setCustomItemImageUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full border-2 border-black rounded-lg px-3 py-1 mt-1 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-violet-400"
                                />
                            </div>
                        </div>
                    )}
                    {customItemImageUrl && (
                        <div className="border-2 border-dashed border-black/30 rounded-xl p-3 flex flex-col items-center justify-center bg-slate-50">
                            <div className="text-[10px] text-slate-400 font-bold mb-1">
                                {isChinese ? "预览:" : "Preview:"}
                            </div>
                            <img
                                src={customItemImageUrl}
                                alt="Preview"
                                className="max-h-24 object-contain rounded-lg border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                                onError={(e: any) => {
                                    e.target.style.display = "none";
                                }}
                            />
                        </div>
                    )}
                    <div>
                        <label className="block font-black text-sm text-slate-700 mb-1">
                            {isChinese ? "描述 / 简介" : "Description / Bio"}
                        </label>
                        <textarea
                            value={customItemDescription}
                            onChange={(e) => setCustomItemDescription(e.target.value)}
                            placeholder={isChinese ? "这个项目的详细介绍或描述..." : "A detailed description or bio of this item..."}
                            rows={2}
                            className="w-full border-2 border-black rounded-lg px-3 py-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                        />
                    </div>
                    <div className="flex gap-3 mt-2">
                        <button
                            onClick={handleSaveCustomItem}
                            className={`flex-1 border-2 border-black text-white font-black text-sm py-2.5 rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all active:translate-y-0.5 ${
                                customModalTab === "buildings"
                                    ? "bg-violet-500 hover:bg-violet-600"
                                    : customModalTab === "decors"
                                    ? "bg-amber-500 hover:bg-amber-600"
                                    : "bg-emerald-500 hover:bg-emerald-600"
                            }`}
                        >
                            {isChinese ? "💾 保存修改" : "💾 Save Changes"}
                        </button>
                        <button
                            onClick={() => {
                                setIsCustomModalOpen(false);
                                setEditingCustomItem(null);
                            }}
                            className="px-4 bg-slate-100 hover:bg-slate-200 border-2 border-black text-slate-700 font-black text-sm py-2.5 rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all active:translate-y-0.5"
                        >
                            {isChinese ? "取消" : "Cancel"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
