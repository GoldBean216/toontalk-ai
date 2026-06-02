import React from 'react';

interface AudioCustomPanelProps {
    isCustomAudioPanelOpen: boolean;
    setIsCustomAudioPanelOpen: (open: boolean) => void;
    useCustomBGM: boolean;
    setUseCustomBGM: (use: boolean) => void;
    customPlaylist: any[];
    currentTrackIndex: number;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleAddLink: (url: string, name: string) => void;
    handleNextTrack: () => void;
    handleSelectTrack: (idx: number) => void;
    handleDeleteTrack: (id: string, idx: number) => void;
    bgmVolume: number;
    setBgmVolume: (volume: number) => void;
    language: string;
}

export const AudioCustomPanel: React.FC<AudioCustomPanelProps> = ({
    isCustomAudioPanelOpen,
    setIsCustomAudioPanelOpen,
    useCustomBGM,
    setUseCustomBGM,
    customPlaylist,
    currentTrackIndex,
    handleFileUpload,
    handleAddLink,
    handleNextTrack,
    handleSelectTrack,
    handleDeleteTrack,
    bgmVolume,
    setBgmVolume,
    language
}) => {
    if (!isCustomAudioPanelOpen) return null;

    const isChinese = language === "简体中文";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm text-black"
            onClick={() => setIsCustomAudioPanelOpen(false)}
        >
            <div
                className="bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_rgba(0,0,0,1)] w-full max-w-lg mx-4 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="border-b-4 border-black px-5 py-4 text-white bg-indigo-600 flex items-center justify-between">
                    <div>
                        <h2 className="font-black text-lg">
                            {isChinese ? "🎵 自定义背景音乐" : "🎵 Custom BGM Settings"}
                        </h2>
                        <p className="text-white/80 text-xs mt-0.5">
                            {isChinese ? "设置本地音乐或网络音频链接作为背景音乐" : "Set local files or web links as background music"}
                        </p>
                    </div>
                    <button
                        onClick={() => setIsCustomAudioPanelOpen(false)}
                        className="font-black text-white hover:text-slate-200 text-xl focus:outline-none"
                    >
                        ✕
                    </button>
                </div>
                <div className="p-5 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-2 border-black rounded-xl p-3 bg-indigo-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <div>
                            <span className="font-black text-sm block">
                                {isChinese ? "启用自定义音乐" : "Enable Custom BGM"}
                            </span>
                            <span className="text-xs text-slate-500">
                                {useCustomBGM
                                    ? isChinese
                                        ? "当前正在播放自定义播放列表"
                                        : "Currently playing your custom playlist"
                                    : isChinese
                                    ? "播放系统默认 of procedural 音乐"
                                    : "Playing default procedural music"}
                            </span>
                        </div>
                        <button
                            onClick={() => setUseCustomBGM(!useCustomBGM)}
                            className={`px-3 py-1.5 rounded-lg border-2 border-black font-black text-xs transition-all active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                                useCustomBGM ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                            }`}
                        >
                            {useCustomBGM ? "ON" : "OFF"}
                        </button>
                    </div>
                    {/* BGM Volume Control Block */}
                    <div className="flex flex-col gap-2 border-2 border-black rounded-xl p-3 bg-indigo-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex justify-between items-center">
                            <span className="font-black text-sm">
                                {isChinese ? "背景音乐音量" : "BGM Volume"}
                            </span>
                            <span className="font-black text-xs px-2 py-0.5 bg-white border-2 border-black rounded shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                                {Math.round(bgmVolume * 100)}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={bgmVolume}
                            onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                            className="w-full h-2 bg-white rounded-lg appearance-none cursor-pointer accent-indigo-600 border-2 border-black shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border-2 border-black rounded-xl p-4 flex flex-col gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <span className="font-black text-xs text-slate-700 uppercase tracking-wider block">
                                {isChinese ? "📂 导入本地音频文件" : "📂 Import Local Files"}
                            </span>
                            <p className="text-[10px] text-slate-500 leading-normal">
                                {isChinese
                                    ? "支持多选音频文件 (MP3, WAV, OGG 等)，文件将持久化保存在浏览器本地数据库中。"
                                    : "Select audio files. They are saved offline/permanently in browser IndexedDB."}
                            </p>
                            <label className="mt-auto block">
                                <input
                                    type="file"
                                    multiple
                                    accept="audio/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <div className="w-full text-center border-2 border-black border-dashed rounded-lg p-3 bg-slate-50 hover:bg-indigo-50 cursor-pointer font-bold text-xs transition-all active:translate-y-0.5">
                                    {isChinese ? "📁 选择音频文件" : "📁 Select Audio Files"}
                                </div>
                            </label>
                        </div>
                        <div className="border-2 border-black rounded-xl p-4 flex flex-col gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <span className="font-black text-xs text-slate-700 uppercase tracking-wider block">
                                {isChinese ? "🔗 添加音乐链接" : "🔗 Add Music Link"}
                            </span>
                            <p className="text-[10px] text-slate-500 leading-normal">
                                {isChinese
                                    ? "输入网络音乐 URL (支持 HTTP/HTTPS，以及本地测试服务器地址)。"
                                    : "Add any remote audio URL or local server address (must support HTTP/HTTPS)."}
                            </p>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    const url = formData.get("url") as string;
                                    const name = formData.get("name") as string;
                                    if (url) {
                                        handleAddLink(url, name || "");
                                        e.currentTarget.reset();
                                    }
                                }}
                                className="flex flex-col gap-1.5 mt-auto"
                            >
                                <input
                                    type="text"
                                    name="name"
                                    placeholder={isChinese ? "音乐名称 (可选)" : "Track Name (Optional)"}
                                    className="w-full border-2 border-black rounded-lg px-2.5 py-1 font-bold text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                />
                                <div className="flex gap-1.5">
                                    <input
                                        type="text"
                                        name="url"
                                        required
                                        placeholder={isChinese ? "音频链接 (https://...)" : "Audio Link (https://...)"}
                                        className="flex-1 border-2 border-black rounded-lg px-2.5 py-1 font-bold text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                    />
                                    <button
                                        type="submit"
                                        className="px-3 bg-indigo-500 text-white font-black text-xs rounded-lg border-2 border-black hover:bg-indigo-600 active:translate-y-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                                    >
                                        {isChinese ? "添加" : "Add"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between px-1">
                            <span className="font-black text-xs text-slate-700 uppercase tracking-wider">
                                {isChinese ? "📋 播放列表" : "📋 Playlist"} ({customPlaylist.length})
                            </span>
                            {customPlaylist.length > 0 && useCustomBGM && (
                                <button
                                    onClick={handleNextTrack}
                                    className="px-2 py-1 bg-amber-100 hover:bg-amber-200 border-2 border-black rounded-lg text-[10px] font-black flex items-center gap-1 active:translate-y-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                                >
                                    <span>⏭️</span>
                                    <span>{isChinese ? "下一首" : "Next Song"}</span>
                                </button>
                            )}
                        </div>
                        {customPlaylist.length === 0 ? (
                            <div className="text-center py-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-400 font-bold text-xs">
                                {isChinese ? "播放列表为空，请在上方添加音乐" : "Playlist is empty. Add tracks above."}
                            </div>
                        ) : (
                            <div className="border-2 border-black rounded-xl overflow-hidden flex flex-col divide-y divide-black max-h-[220px] overflow-y-auto bg-slate-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                {customPlaylist.map((track, idx) => {
                                    const isPlaying = useCustomBGM && currentTrackIndex === idx;
                                    return (
                                        <div
                                            key={track.id}
                                            className={`p-2.5 flex items-center justify-between gap-3 text-xs font-bold transition-all ${
                                                isPlaying ? "bg-indigo-50 text-indigo-950 font-black" : "hover:bg-slate-100"
                                            }`}
                                        >
                                            <div
                                                className="flex-1 flex items-center gap-2 cursor-pointer min-w-0"
                                                onClick={() => handleSelectTrack(idx)}
                                            >
                                                <span className="text-sm shrink-0">
                                                    {isPlaying ? "▶️" : "🎵"}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <span className="truncate block pr-2">
                                                        {track.name}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 font-medium block">
                                                        {track.type === "file"
                                                            ? isChinese
                                                                ? "📁 本地存储文件"
                                                                : "📁 Local Storage File"
                                                            : `🔗 ${track.url}`}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {track.type === "file" ? (
                                                    <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-black border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                                        DB
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-black border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                                        URL
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteTrack(track.id, idx)}
                                                    className="p-1 hover:bg-rose-100 rounded text-slate-500 hover:text-rose-600 transition-all border border-transparent hover:border-black active:translate-y-0.5"
                                                    title={isChinese ? "删除" : "Delete"}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className="border-2 border-amber-300 bg-amber-50/50 rounded-xl p-3 text-[10px] text-amber-900 leading-relaxed font-bold">
                        ⚠️ <span className="font-extrabold">{isChinese ? "浏览器安全提示：" : "Browser Security Note: "}</span>
                        {isChinese
                            ? '为了保护您的隐私，浏览器无法直接加载类似 C:\\music.mp3 的本地绝对路径。请使用 "📁 选择音频文件" 上传本地歌曲，它们会安全地保存在您本机的浏览器数据库中，无需重复上传。'
                            : 'Browsers block direct access to local absolute paths (e.g. C:\\music.mp3) for security. Please upload local music via "📁 Select Audio Files" to save them offline in your local database.'}
                    </div>
                </div>
            </div>
        </div>
    );
};
