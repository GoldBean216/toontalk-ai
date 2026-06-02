import React, { useState, useEffect, useRef } from 'react';
import { MAP_TRANSLATIONS } from './translations';

interface MapHeaderProps {
    onBack: () => void;
    customMapName: string;
    language: string;
    zoom: number;
    isEditingName: boolean;
    tempName: string;
    setTempName: (name: string) => void;
    handleStartEditName: (e: React.MouseEvent) => void;
    handleSaveName: (e?: React.FormEvent) => void;
    handleCancelEdit: () => void;
    handleZoomIn: () => void;
    handleZoomOut: () => void;
    handleResetZoom: () => void;
    bgmMuted: boolean;
    sfxMuted: boolean;
    toggleBgmMuted: () => void;
    toggleSfxMuted: () => void;
    bgmVolume: number;
    setBgmVolume: (volume: number) => void;
    setIsCustomAudioPanelOpen: (open: boolean) => void;
    showFog: boolean;
    setShowFog: (show: boolean) => void;
    isEditMode: boolean;
    setIsEditMode: (edit: boolean) => void;
    handleSaveConfig: () => void;
    isSavingConfig: boolean;
    handleExportMap: () => void;
    importFileRef: React.RefObject<HTMLInputElement>;
    handleImportMap: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const MapHeader: React.FC<MapHeaderProps> = ({
    onBack,
    customMapName,
    language,
    zoom,
    isEditingName,
    tempName,
    setTempName,
    handleStartEditName,
    handleSaveName,
    handleCancelEdit,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    bgmMuted,
    sfxMuted,
    toggleBgmMuted,
    toggleSfxMuted,
    bgmVolume,
    setBgmVolume,
    setIsCustomAudioPanelOpen,
    showFog,
    setShowFog,
    isEditMode,
    setIsEditMode,
    handleSaveConfig,
    isSavingConfig,
    handleExportMap,
    importFileRef,
    handleImportMap
}) => {
    const t = MAP_TRANSLATIONS[language] || MAP_TRANSLATIONS.English;
    const [showAudioDropdown, setShowAudioDropdown] = useState(false);
    const audioDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent | TouchEvent) {
            if (audioDropdownRef.current && !audioDropdownRef.current.contains(event.target as Node)) {
                setShowAudioDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, []);

    return (
        <div className="bg-indigo-400 border-b-4 border-black p-4 sticky top-0 z-30 flex justify-between items-center shadow-[0_4px_10px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="bg-white hover:bg-yellow-300 active:translate-y-1 font-black text-lg p-2 px-4 rounded-xl border-2 border-black transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black"
                >
                    ⬅ Back
                </button>
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                    {isEditingName ? (
                        <form
                            onSubmit={handleSaveName}
                            className="flex items-center gap-1.5 bg-white border-2 border-black rounded-xl p-1 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                        >
                            <input
                                type="text"
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                className="px-2 py-0.5 text-sm font-bold border-0 outline-none w-44 text-slate-800 rounded"
                                autoFocus
                                maxLength={25}
                            />
                            <button
                                type="submit"
                                className="bg-emerald-400 hover:bg-emerald-500 text-white px-2 py-0.5 rounded-lg border-2 border-black text-xs font-black transition-all active:translate-y-0.5 shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                            >
                                ✓
                            </button>
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="bg-rose-400 hover:bg-rose-500 text-white px-2 py-0.5 rounded-lg border-2 border-black text-xs font-black transition-all active:translate-y-0.5 shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                            >
                                ✕
                            </button>
                        </form>
                    ) : (
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-black text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] tracking-wider uppercase">
                                {customMapName || t.mapTitle || "Toon world"}
                            </h1>
                            <button
                                onClick={handleStartEditName}
                                className="text-white hover:text-yellow-300 text-xs bg-indigo-500 hover:bg-indigo-600 border-2 border-black rounded-lg p-1 px-1.5 shadow-[1px_1px_0px_rgba(0,0,0,1)] transition-all active:translate-y-0.5 font-bold"
                                title="Rename Map"
                            >
                                ✏️ Rename
                            </button>
                        </div>
                    )}
                    {zoom >= 0.70 ? (
                        <span className="bg-yellow-300 border-2 border-black px-2 py-0.5 rounded text-[10px] font-black text-black shadow-[1px_1px_0px_rgba(0,0,0,1)] uppercase tracking-wider animate-[pulse_2s_infinite]">
                            {t.lod0 || "🔍 LOD 0: Detailed Interiors"}
                        </span>
                    ) : zoom >= 0.40 ? (
                        <span className="bg-emerald-300 border-2 border-black px-2 py-0.5 rounded text-[10px] font-black text-black shadow-[1px_1px_0px_rgba(0,0,0,1)] uppercase tracking-wider">
                            {t.lod1 || "🗺️ LOD 1: City Structures"}
                        </span>
                    ) : (
                        <span className="bg-sky-400 border-2 border-black px-2 py-0.5 rounded text-[10px] font-black text-white shadow-[1px_1px_0px_rgba(0,0,0,1)] uppercase tracking-wider">
                            {t.lod2 || "🌐 LOD 2: Regional Roads"}
                        </span>
                    )}
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                <button
                    onClick={handleZoomIn}
                    title="Zoom In"
                    className="w-10 h-10 font-bold bg-white border-2 border-black rounded-lg hover:bg-indigo-200 active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-xl text-black"
                >
                    ＋
                </button>
                <button
                    onClick={handleZoomOut}
                    title="Zoom Out"
                    className="w-10 h-10 font-bold bg-white border-2 border-black rounded-lg hover:bg-indigo-200 active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-xl text-black"
                >
                    －
                </button>
                <button
                    onClick={handleResetZoom}
                    className="px-3 h-10 font-bold bg-white text-xs border-2 border-black rounded-lg hover:bg-indigo-200 active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black"
                >
                    Reset Focus
                </button>
                <div className="relative" ref={audioDropdownRef}>
                    <button
                        onClick={() => setShowAudioDropdown(!showAudioDropdown)}
                        title={language === "简体中文" ? "音频设置" : "Audio Settings"}
                        className={`px-3 h-10 font-bold text-xs border-2 border-black rounded-lg active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-1.5 ${!bgmMuted || !sfxMuted ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border-emerald-400" : "bg-rose-100 hover:bg-rose-200 text-rose-950 border-rose-400"}`}
                    >
                        <span className="text-sm">
                            {!bgmMuted || !sfxMuted ? "🔊" : "🔇"}
                        </span>
                        <span>
                            {language === "简体中文" ? "音频" : "Audio"}
                        </span>
                        <span className="text-[10px] opacity-70">
                            ▼
                        </span>
                    </button>
                    {showAudioDropdown && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border-4 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 p-2 flex flex-col gap-1.5">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 pb-1 border-b-2 border-slate-100 text-center">
                                {language === "简体中文" ? "音频设置" : "Audio Settings"}
                            </div>
                            <button
                                onClick={toggleBgmMuted}
                                title={bgmMuted ? "Unmute BGM" : "Mute BGM"}
                                className={`w-full px-2 py-1.5 rounded-lg border-2 border-black font-bold text-[11px] flex items-center justify-between transition-all active:translate-y-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${bgmMuted ? "bg-rose-100 hover:bg-rose-200 text-rose-800 border-rose-400" : "bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-400"}`}
                            >
                                <span className="flex items-center gap-1">
                                    <span className="text-xs">
                                        {bgmMuted ? "🔇" : "🎵"}
                                    </span>
                                    <span>
                                        {language === "简体中文" ? "背景音乐" : "BGM"}
                                    </span>
                                </span>
                                <span className="text-[9px] opacity-70 font-black">
                                    {bgmMuted ? "OFF" : "ON"}
                                </span>
                            </button>

                            {/* BGM Volume Slider */}
                            <div className="flex flex-col gap-1 px-1 py-1 border-t border-b border-black/10 my-0.5">
                                <div className="flex justify-between text-[10px] font-black text-slate-700">
                                    <span>{language === "简体中文" ? "背景音乐音量" : "BGM Volume"}</span>
                                    <span>{Math.round(bgmVolume * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={bgmVolume}
                                    onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500 border border-black shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                                />
                            </div>

                            <button
                                onClick={toggleSfxMuted}
                                title={sfxMuted ? "Unmute Sound Effects" : "Mute Sound Effects"}
                                className={`w-full px-2 py-1.5 rounded-lg border-2 border-black font-bold text-[11px] flex items-center justify-between transition-all active:translate-y-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${sfxMuted ? "bg-rose-100 hover:bg-rose-200 text-rose-800 border-rose-400" : "bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-400"}`}
                            >
                                <span className="flex items-center gap-1">
                                    <span className="text-xs">
                                        {sfxMuted ? "🔇" : "🔊"}
                                    </span>
                                    <span>
                                        {language === "简体中文" ? "音效" : "SFX"}
                                    </span>
                                </span>
                                <span className="text-[9px] opacity-70 font-black">
                                    {sfxMuted ? "OFF" : "ON"}
                                </span>
                            </button>
                            <button
                                onClick={() => {
                                    setIsCustomAudioPanelOpen(true);
                                    setShowAudioDropdown(false);
                                }}
                                className="w-full px-2 py-1.5 rounded-lg border-2 border-black font-bold text-[11px] flex items-center justify-between transition-all active:translate-y-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-300"
                            >
                                <span className="flex items-center gap-1">
                                    <span className="text-xs">⚙️</span>
                                    <span>
                                        {language === "简体中文" ? "自定义音乐..." : "Custom Music..."}
                                    </span>
                                </span>
                                <span className="text-[9px] opacity-70 font-black">
                                    SET
                                </span>
                            </button>
                        </div>
                    )}
                </div>
                <button
                    onClick={() => {
                        const next = !showFog;
                        setShowFog(next);
                        localStorage.setItem("toon_map_show_fog", String(next));
                    }}
                    title={showFog ? t.fogOff || "Hide Fog" : t.fogOn || "Show Fog"}
                    className={`px-3 h-10 font-bold text-xs border-2 border-black rounded-lg active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-1.5 ${showFog ? "bg-sky-100 hover:bg-sky-200 text-sky-900 border-sky-400" : "bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-400"}`}
                >
                    <span className="text-sm">🌫️</span>
                    {showFog ? t.fogOn || "Fog: ON" : t.fogOff || "Fog: OFF"}
                </button>
                <button
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`px-3 h-10 font-black text-xs border-2 border-black rounded-lg active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${isEditMode ? "bg-rose-400 hover:bg-rose-500 text-white" : "bg-yellow-300 hover:bg-yellow-400 text-black"}`}
                >
                    {isEditMode ? "✓ Finish Build" : "🔧 Build Mode"}
                </button>
                {isEditMode && (
                    <>
                        <button
                            onClick={handleSaveConfig}
                            disabled={isSavingConfig}
                            className="px-3 h-10 font-black text-xs border-2 border-black rounded-lg active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all bg-emerald-400 hover:bg-emerald-500 text-black disabled:opacity-50"
                        >
                            {isSavingConfig ? "Saving..." : "💾 Save Config"}
                        </button>
                        <button
                            onClick={handleExportMap}
                            className="px-3 h-10 font-black text-xs border-2 border-black rounded-lg active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all bg-violet-400 hover:bg-violet-500 text-white"
                        >
                            📤 Export Map
                        </button>
                        <input
                            ref={importFileRef}
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={handleImportMap}
                        />
                    </>
                )}
            </div>
        </div>
    );
};
