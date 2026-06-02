import React from 'react';

interface MapFilterBarProps {
    activeFilter: string;
    onFilterChange: (filterId: string) => void;
    language: string;
}

export const MapFilterBar: React.FC<MapFilterBarProps> = ({
    activeFilter,
    onFilterChange,
    language
}) => {
    const isChinese = language === "简体中文";
    const isJapanese = language === "日本語";

    const filterOptions = [
        {
            id: "all",
            label: isChinese ? "🗺️ 无限市区" : isJapanese ? "🗺️ インフィニットシティ" : "🗺️ Infinite City"
        },
        {
            id: "workstation",
            label: isChinese ? "🏢 工作总部" : isJapanese ? "🏢 ワークステーション(本部)" : "🏢 Workstations (HQ)"
        },
        {
            id: "cafe",
            label: isChinese ? "☕ 卡通咖啡店" : isJapanese ? "☕ カフェショップ" : "☕ Café Shop"
        },
        {
            id: "restroom",
            label: isChinese ? "⛲ 喷泉广场" : isJapanese ? "⛲ 噴水広場" : "⛲ Fountain Plaza"
        },
        {
            id: "lounge",
            label: isChinese ? "🎬 卡通影院" : isJapanese ? "🎬 トゥーンシネマ" : "🎬 Toon Cinema"
        },
        {
            id: "garden",
            label: isChinese ? "💪 健身房与花园" : isJapanese ? "💪 ジム&ガーデン" : "💪 Gym & Garden"
        }
    ];

    return (
        <div className="bg-white border-b-4 border-black p-3 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none z-20 shadow-[0px_2px_5px_rgba(0,0,0,0.05)]">
            {filterOptions.map((filter) => (
                <button
                    key={filter.id}
                    onClick={() => onFilterChange(filter.id)}
                    className={`px-3 py-1.5 rounded-full border-2 border-black font-bold text-xs transition-all active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                        activeFilter === filter.id 
                            ? "bg-yellow-300 text-black" 
                            : "bg-indigo-100 hover:bg-white text-gray-700 hover:text-black"
                    }`}
                >
                    {filter.label}
                </button>
            ))}
        </div>
    );
};
