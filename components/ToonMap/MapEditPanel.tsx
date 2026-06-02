import React, { useRef } from 'react';
import { MapBuilding, BuildTool, MapTheme } from './types';
import { MAP_TRANSLATIONS } from './translations';
import { BUILDING_CATALOG_TEMPLATES, DECOR_TEMPLATES, MAP_TEMPLATES, THEME_CONFIGS } from './constants';

interface MapEditPanelProps {
    isEditMode: boolean;
    setIsEditMode: (open: boolean) => void;
    isCatalogCollapsed: boolean;
    setIsCatalogCollapsed: (collapsed: boolean) => void;
    buildTool: BuildTool;
    setBuildTool: (tool: BuildTool) => void;
    activeCatalogTab: string;
    setActiveCatalogTab: (tab: string) => void;
    hasNewMapDot: boolean;
    setHasNewMapDot: (dot: boolean) => void;
    customBuildings: MapBuilding[];
    customDecors: MapBuilding[];
    customMaps: any[];
    mapTheme: MapTheme;
    setMapTheme: (theme: MapTheme) => void;
    language: string;
    handleOpenCustomModal: (tab: 'buildings' | 'decors' | 'maps', item?: any) => void;
    handleDeleteCustomItem: (tab: 'buildings' | 'decors' | 'maps', id: string) => void;
    handleSpawnItem: (item: any) => void;
    handleLoadMapPreset: (preset: any) => void;
    handleImportMap: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const getLocalizedMapPreset = (presetName: string, lang: string) => {
    const mapping: Record<string, Record<string, { name: string; description: string }>> = {
        English: {
            "Default Town": {
                name: "🏙️ Default Town",
                description: "The standard interconnected starter town layout."
            },
            "Cozy Villa Village": {
                name: "🏡 Cozy Villa Village",
                description: "A quiet, cute residential suburb with villas and parks."
            },
            "Metropolitan Hub": {
                name: "🏢 Metropolitan Hub",
                description: "A high-density commercial layout centered around transit."
            },
            "Empty Canvas": {
                name: "⬜ Empty Canvas",
                description: "A completely clear, blank map for building your own dream layout."
            }
        },
        "简体中文": {
            "Default Town": {
                name: "🏙️ 默认小镇",
                description: "拥有互联道路的经典初始城市布局。"
            },
            "Cozy Villa Village": {
                name: "🏡 温馨别墅村",
                description: "安静惬意的别墅住宅区，配有小公园 and 奶茶店。"
            },
            "Metropolitan Hub": {
                name: "🏢 繁华大都市",
                description: "高密度商业街区，围绕地铁枢纽和娱乐中心。"
            },
            "Empty Canvas": {
                name: "⬜ 空白画布",
                description: "一张完全空白的地图，让你自由设计理想中的城镇布局。"
            }
        },
        "日本語": {
            "Default Town": {
                name: "🏙️ デフォルトタウン",
                description: "標準的な道路網が整備された初期レイアウト。"
            },
            "Cozy Villa Village": {
                name: "🏡 別荘の村",
                description: "別荘や公園がある、静かで可愛い住宅街。"
            },
            "Metropolitan Hub": {
                name: "🏢 メトロポリスハブ",
                description: "交通の便が良い高密度な商業地。"
            },
            "Empty Canvas": {
                name: "⬜ 空白のキャンバス",
                description: "自分だけの街をゼロから自由にレイアウトできる空白のマップ。"
            }
        },
        "Español": {
            "Default Town": {
                name: "🏙️ Pueblo Predeterminado",
                description: "El diseño inicial estándar de la ciudad interconectada."
            },
            "Cozy Villa Village": {
                name: "🏡 Pueblo de Villas",
                description: "Un barrio residencial tranquilo con villas y parques."
            },
            "Metropolitan Hub": {
                name: "🏢 Núcleo Metropolitano",
                description: "Un diseño comercial de alta densidad centrado en el transporte."
            },
            "Empty Canvas": {
                name: "⬜ Lienzo Vacío",
                description: "Un mapa completamente despejado para construir tu propio diseño."
            }
        },
        "Français": {
            "Default Town": {
                name: "🏙️ Ville Par Défaut",
                description: "Le tracé de départ standard et interconnecté de la ville."
            },
            "Cozy Villa Village": {
                name: "🏡 Village de Villas",
                description: "Une banlieue résidentielle calme et mignonne avec villas et parcs."
            },
            "Metropolitan Hub": {
                name: "🏢 Hub Métropolitain",
                description: "Un aménagement commercial à haute densité axé sur les transports."
            },
            "Empty Canvas": {
                name: "⬜ Toile Vierge",
                description: "Une carte entièrement vide pour concevoir votre propre agencement."
            }
        }
    };
    return mapping[lang]?.[presetName] || mapping.English[presetName] || {
        name: presetName,
        description: ""
    };
};

export const MapEditPanel: React.FC<MapEditPanelProps> = ({
    isEditMode,
    setIsEditMode,
    isCatalogCollapsed,
    setIsCatalogCollapsed,
    buildTool,
    setBuildTool,
    activeCatalogTab,
    setActiveCatalogTab,
    hasNewMapDot,
    setHasNewMapDot,
    customBuildings,
    customDecors,
    customMaps,
    mapTheme,
    setMapTheme,
    language,
    handleOpenCustomModal,
    handleDeleteCustomItem,
    handleSpawnItem,
    handleLoadMapPreset,
    handleImportMap
}) => {
    const importFileRef = useRef<HTMLInputElement>(null);
    if (!isEditMode) return null;

    const t = MAP_TRANSLATIONS[language] || {};
    const isChinese = language === "简体中文";

    return (
        <>
            <input
                ref={importFileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportMap}
            />

            {isCatalogCollapsed ? (
                <div
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseMove={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        animation: "slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards"
                    }}
                    className="absolute top-4 right-4 bottom-4 w-80 bg-white/95 backdrop-blur-md border-4 border-black rounded-2xl shadow-[6px_6px_0px_rgba(0,0,0,1)] z-30 flex flex-col overflow-hidden text-black"
                >
                    <div className="bg-yellow-400 border-b-4 border-black p-4 flex justify-between items-center text-black">
                        <div>
                            <h3 className="font-black text-base uppercase tracking-wider">
                                {isChinese ? "🛠️ 建造工具" : "🛠️ Build Tools"}
                            </h3>
                            <p className="text-[9px] font-black text-slate-700 uppercase tracking-wide">
                                {isChinese ? "选择一个工具来编辑您的城镇" : "Select a tool to edit your town"}
                            </p>
                        </div>
                        <button
                            onClick={() => setIsEditMode(false)}
                            className="bg-white hover:bg-rose-100 text-black p-1 border-2 border-black rounded-lg text-xs font-black active:translate-y-0.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
                            {isChinese ? "可用工具" : "Available Tools"}
                        </span>
                        <div className="flex flex-col gap-3">
                            {[
                                {
                                    id: "pan",
                                    label: isChinese ? "✋ 拖拽移动" : "✋ Drag/Move",
                                    desc: isChinese ? "拖拽移动建筑或视口" : "Move buildings or pan around"
                                },
                                {
                                    id: "draw",
                                    label: isChinese ? "🛣️ 绘制直路" : "🛣️ Draw Road",
                                    desc: isChinese ? "绘制直沥青路" : "Draw straight asphalt roads"
                                },
                                {
                                    id: "curve",
                                    label: isChinese ? "📐 绘制弯路" : "📐 Curve Road",
                                    desc: isChinese ? "点击并拖拽以绘制弯曲车道" : "Click & drag for a curved lane"
                                },
                                {
                                    id: "catalog",
                                    label: isChinese ? "🧱 蓝图目录" : "🧱 Catalog",
                                    desc: isChinese ? "打开蓝图目录以放置建筑/装饰" : "Open blueprint catalog to spawn items"
                                }
                            ].map((tool) => (
                                <button
                                    key={tool.id}
                                    onClick={() => {
                                        if (tool.id === "catalog") {
                                            setIsCatalogCollapsed(false);
                                            setBuildTool("pan");
                                        } else {
                                            setBuildTool(tool.id as BuildTool);
                                        }
                                    }}
                                    className={`w-full text-left border-2 border-black p-3.5 rounded-xl flex flex-col gap-1 transition-all shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-px active:shadow-[2px_2px_0px_rgba(0,0,0,1)] ${
                                        buildTool === tool.id && tool.id !== "catalog"
                                            ? "bg-yellow-300 text-black border-black ring-2 ring-black ring-offset-2"
                                            : "bg-indigo-50 hover:bg-indigo-100 text-slate-700"
                                    }`}
                                    title={tool.desc}
                                >
                                    <span className="font-black text-sm">{tool.label}</span>
                                    <span className="text-[10px] text-slate-500 font-bold">{tool.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseMove={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        animation: "slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards"
                    }}
                    className="absolute top-4 right-4 bottom-4 w-80 bg-white/95 backdrop-blur-md border-4 border-black rounded-2xl shadow-[6px_6px_0px_rgba(0,0,0,1)] z-30 flex flex-col overflow-hidden text-black"
                >
                    <div className="bg-indigo-400 border-b-4 border-black p-4 flex justify-between items-center text-white">
                        <div>
                            <h3 className="font-black text-base uppercase tracking-wider drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                                {isChinese ? "🧱 蓝图目录" : "🧱 Blueprint Catalog"}
                            </h3>
                            <p className="text-[9px] font-black text-yellow-200 uppercase tracking-wide">
                                {isChinese ? "拖拽到地图上或点击生成" : "Drag to map or click to spawn"}
                            </p>
                        </div>
                        <button
                            onClick={() => setIsCatalogCollapsed(true)}
                            className="bg-white hover:bg-rose-100 text-black p-1 border-2 border-black rounded-lg text-xs font-black active:translate-y-0.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="flex border-b-4 border-black bg-indigo-50 font-black text-[10px]">
                        {["buildings", "decors", "maps", "themes"].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => {
                                    setActiveCatalogTab(tab);
                                    if (tab === "maps") {
                                        setHasNewMapDot(false);
                                    }
                                }}
                                className={`flex-1 py-3 border-r-2 last:border-r-0 border-black transition-all uppercase tracking-wider ${
                                    activeCatalogTab === tab
                                        ? "bg-yellow-300 text-black"
                                        : "bg-indigo-50 text-slate-700 hover:bg-indigo-100"
                                }`}
                            >
                                {tab === "buildings" ? (
                                    isChinese ? "🏢 建筑" : "🏢 BLDGS"
                                ) : tab === "decors" ? (
                                    isChinese ? "🌸 装饰" : "🌸 DECORS"
                                ) : tab === "maps" ? (
                                    <span className="relative inline-flex items-center justify-center gap-1">
                                        {isChinese ? "🗺️ 地图" : "🗺️ MAPS"}
                                        {hasNewMapDot && (
                                            <span className="w-2 h-2 bg-rose-500 rounded-full border border-black animate-pulse" />
                                        )}
                                    </span>
                                ) : (
                                    isChinese ? "🏞️ 地域" : "🏞️ THEMES"
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-thin">
                        {activeCatalogTab === "buildings" && (
                            <button
                                onClick={() => handleOpenCustomModal("buildings")}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 active:translate-y-0.5 text-white font-black text-xs py-2.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all uppercase tracking-wider mb-1.5 flex items-center justify-center gap-2"
                            >
                                {t.addCustomBuilding || "➕ Add Custom Building"}
                            </button>
                        )}
                        {activeCatalogTab === "buildings" &&
                            customBuildings.map((item, idx) => (
                                <div className="relative group/card" key={`custom-bldg-${item.id || idx}`}>
                                    <div
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData(
                                                "text/plain",
                                                JSON.stringify({
                                                    type: "building",
                                                    template: item
                                                })
                                            );
                                        }}
                                        onClick={() => handleSpawnItem(item)}
                                        className="bg-indigo-50/70 hover:bg-yellow-100/70 border-2 border-black p-3 rounded-xl flex gap-3 items-center cursor-grab active:cursor-grabbing hover:border-indigo-500 transition-all hover:scale-[1.02] shadow-[2px_2px_0px_rgba(0,0,0,1)] group"
                                    >
                                        <div className="w-12 h-12 bg-white border-2 border-black rounded-xl flex items-center justify-center overflow-hidden shadow-[1px_1px_0px_rgba(0,0,0,1)] group-hover:scale-110 transition-transform shrink-0">
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-3xl">{item.emoji}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 pr-10">
                                            <h4 className="font-black text-xs text-slate-800 truncate uppercase flex items-center gap-1">
                                                {item.name}
                                                <span className="bg-amber-400 border border-black text-[6px] font-black px-1 rounded uppercase">
                                                    CUSTOM
                                                </span>
                                            </h4>
                                            <p className="text-[9px] font-bold text-gray-500 truncate mt-0.5">{item.description}</p>
                                            <div className="flex gap-1.5 mt-1">
                                                <span className="bg-indigo-200 border border-black text-black text-[7px] font-black px-1.5 py-0.2 rounded uppercase">
                                                    {item.width}x{item.height}
                                                </span>
                                                <span className="bg-emerald-200 border border-black text-black text-[7px] font-black px-1.5 py-0.2 rounded uppercase">
                                                    {item.tag}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity bg-white/90 p-1 rounded-lg border border-black/15 shadow-sm z-10">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenCustomModal("buildings", item);
                                            }}
                                            className="bg-sky-400 hover:bg-sky-500 text-white p-1 rounded border border-black text-[9px] font-black shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-y-0.5 cursor-pointer"
                                            title="Edit Item"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteCustomItem("buildings", item.id);
                                            }}
                                            className="bg-rose-500 hover:bg-rose-600 text-white p-1 rounded border border-black text-[9px] font-black shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-y-0.5 cursor-pointer"
                                            title="Delete Item"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        {activeCatalogTab === "buildings" &&
                            BUILDING_CATALOG_TEMPLATES.map((item, idx) => (
                                <div
                                    key={idx}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData(
                                            "text/plain",
                                            JSON.stringify({
                                                type: "building",
                                                template: item
                                            })
                                        );
                                    }}
                                    onClick={() => handleSpawnItem(item)}
                                    className="bg-indigo-50/70 hover:bg-yellow-100/70 border-2 border-black p-3 rounded-xl flex gap-3 items-center cursor-grab active:cursor-grabbing hover:border-indigo-500 transition-all hover:scale-[1.02] shadow-[2px_2px_0px_rgba(0,0,0,1)] group"
                                >
                                    <div className="w-12 h-12 bg-white border-2 border-black rounded-xl flex items-center justify-center text-3xl shadow-[1px_1px_0px_rgba(0,0,0,1)] group-hover:scale-110 transition-transform shrink-0">
                                        {item.emoji}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-xs text-slate-800 truncate uppercase">{item.name}</h4>
                                        <p className="text-[9px] font-bold text-gray-500 truncate mt-0.5">{item.description}</p>
                                        <div className="flex gap-1.5 mt-1">
                                            <span className="bg-indigo-200 border border-black text-black text-[7px] font-black px-1.5 py-0.2 rounded uppercase">
                                                {item.width}x{item.height}
                                            </span>
                                            <span className="bg-emerald-200 border border-black text-black text-[7px] font-black px-1.5 py-0.2 rounded uppercase">
                                                {item.tag}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                        {activeCatalogTab === "decors" && (
                            <button
                                onClick={() => handleOpenCustomModal("decors")}
                                className="w-full bg-pink-500 hover:bg-pink-600 active:translate-y-0.5 text-white font-black text-xs py-2.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all uppercase tracking-wider mb-1.5 flex items-center justify-center gap-2"
                            >
                                {t.addCustomDecor || "➕ Add Custom Decor"}
                            </button>
                        )}
                        {activeCatalogTab === "decors" &&
                            customDecors.map((item, idx) => (
                                <div className="relative group/card" key={`custom-decor-${item.id || idx}`}>
                                    <div
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData(
                                                "text/plain",
                                                JSON.stringify({
                                                    type: "building",
                                                    template: item
                                                })
                                            );
                                        }}
                                        onClick={() => handleSpawnItem(item)}
                                        className="bg-indigo-50/70 hover:bg-yellow-100/70 border-2 border-black p-3 rounded-xl flex gap-3 items-center cursor-grab active:cursor-grabbing hover:border-indigo-500 transition-all hover:scale-[1.02] shadow-[2px_2px_0px_rgba(0,0,0,1)] group"
                                    >
                                        <div className="w-12 h-12 bg-white border-2 border-black rounded-xl flex items-center justify-center overflow-hidden shadow-[1px_1px_0px_rgba(0,0,0,1)] group-hover:scale-110 transition-transform shrink-0">
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-3xl">{item.emoji}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 pr-10">
                                            <h4 className="font-black text-xs text-slate-800 truncate uppercase flex items-center gap-1">
                                                {item.name}
                                                <span className="bg-amber-400 border border-black text-[6px] font-black px-1 rounded uppercase">
                                                    CUSTOM
                                                </span>
                                            </h4>
                                            <p className="text-[9px] font-bold text-gray-500 truncate mt-0.5">{item.description}</p>
                                            <div className="flex gap-1.5 mt-1">
                                                <span className="bg-indigo-200 border border-black text-black text-[7px] font-black px-1.5 py-0.2 rounded uppercase">
                                                    {item.width}x{item.height}
                                                </span>
                                                <span className="bg-purple-200 border border-black text-black text-[7px] font-black px-1.5 py-0.2 rounded uppercase">
                                                    {item.tag}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity bg-white/90 p-1 rounded-lg border border-black/15 shadow-sm z-10">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenCustomModal("decors", item);
                                            }}
                                            className="bg-sky-400 hover:bg-sky-500 text-white p-1 rounded border border-black text-[9px] font-black shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-y-0.5 cursor-pointer"
                                            title="Edit Item"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteCustomItem("decors", item.id);
                                            }}
                                            className="bg-rose-500 hover:bg-rose-600 text-white p-1 rounded border border-black text-[9px] font-black shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-y-0.5 cursor-pointer"
                                            title="Delete Item"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        {activeCatalogTab === "decors" &&
                            DECOR_TEMPLATES.map((item, idx) => (
                                <div
                                    key={idx}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData(
                                            "text/plain",
                                            JSON.stringify({
                                                type: "building",
                                                template: item
                                            })
                                        );
                                    }}
                                    onClick={() => handleSpawnItem(item)}
                                    className="bg-indigo-50/70 hover:bg-yellow-100/70 border-2 border-black p-3 rounded-xl flex gap-3 items-center cursor-grab active:cursor-grabbing hover:border-indigo-500 transition-all hover:scale-[1.02] shadow-[2px_2px_0px_rgba(0,0,0,1)] group"
                                >
                                    <div className="w-12 h-12 bg-white border-2 border-black rounded-xl flex items-center justify-center text-3xl shadow-[1px_1px_0px_rgba(0,0,0,1)] group-hover:scale-110 transition-transform shrink-0">
                                        {item.emoji}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-xs text-slate-800 truncate uppercase">{item.name}</h4>
                                        <p className="text-[9px] font-bold text-gray-500 truncate mt-0.5">{item.description}</p>
                                        <div className="flex gap-1.5 mt-1">
                                            <span className="bg-indigo-200 border border-black text-black text-[7px] font-black px-1.5 py-0.2 rounded uppercase">
                                                {item.width}x{item.height}
                                            </span>
                                            <span className="bg-purple-200 border border-black text-black text-[7px] font-black px-1.5 py-0.2 rounded uppercase">
                                                {item.tag}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                        {activeCatalogTab === "maps" && (
                            <div className="flex gap-2 mb-2 w-full shrink-0">
                                <button
                                    onClick={() => handleOpenCustomModal("maps")}
                                    className="flex-1 bg-indigo-500 hover:bg-indigo-600 active:translate-y-0.5 text-white font-black text-[10px] py-2.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all uppercase tracking-wider flex items-center justify-center gap-1"
                                >
                                    {isChinese ? "💾 保存布局" : "💾 Save Layout"}
                                </button>
                                <button
                                    onClick={() => importFileRef.current?.click()}
                                    className="flex-1 bg-amber-400 hover:bg-amber-500 active:translate-y-0.5 text-black font-black text-[10px] py-2.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all uppercase tracking-wider flex items-center justify-center gap-1"
                                >
                                    {isChinese ? "📥 导入 JSON" : "📥 Import JSON"}
                                </button>
                            </div>
                        )}
                        {activeCatalogTab === "maps" &&
                            customMaps.map((item, idx) => (
                                <div className="relative group/card" key={`custom-map-${item.id || idx}`}>
                                    <div
                                        onClick={() => handleLoadMapPreset(item)}
                                        className="bg-indigo-50/70 hover:bg-yellow-100/70 border-2 border-black p-3 rounded-xl flex gap-3 items-center cursor-pointer hover:border-indigo-500 transition-all hover:scale-[1.02] shadow-[2px_2px_0px_rgba(0,0,0,1)] group text-left"
                                    >
                                        <div className="w-12 h-12 bg-white border-2 border-black rounded-xl flex items-center justify-center overflow-hidden shadow-[1px_1px_0px_rgba(0,0,0,1)] group-hover:scale-110 transition-transform shrink-0">
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-3xl">{item.emoji || "🗺️"}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 pr-10">
                                            <h4 className="font-black text-xs text-slate-800 truncate uppercase flex items-center gap-1">
                                                {item.name}
                                                <span className="bg-amber-400 border border-black text-[6px] font-black px-1 rounded uppercase">
                                                    CUSTOM
                                                </span>
                                            </h4>
                                            <p className="text-[9px] font-bold text-gray-500 whitespace-normal line-clamp-2 mt-0.5">{item.description}</p>
                                            <div className="flex gap-1.5 mt-1">
                                                <span className="bg-indigo-200 border border-black text-black text-[7px] font-black px-1.5 py-0.2 rounded uppercase">
                                                    Bldgs: {item.buildings?.length || 0}
                                                </span>
                                                <span className="bg-sky-200 border border-black text-black text-[7px] font-black px-1.5 py-0.2 rounded uppercase">
                                                    Roads: {item.streets?.length || 0}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity bg-white/90 p-1 rounded-lg border border-black/15 shadow-sm z-10">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenCustomModal("maps", item);
                                            }}
                                            className="bg-sky-400 hover:bg-sky-500 text-white p-1 rounded border border-black text-[9px] font-black shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-y-0.5 cursor-pointer"
                                            title="Edit Map Info"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteCustomItem("maps", item.id);
                                            }}
                                            className="bg-rose-500 hover:bg-rose-600 text-white p-1 rounded border border-black text-[9px] font-black shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-y-0.5 cursor-pointer"
                                            title="Delete Map Layout"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        {activeCatalogTab === "maps" &&
                            MAP_TEMPLATES.map((item, idx) => {
                                const localized = getLocalizedMapPreset(item.name, language);
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => handleLoadMapPreset(item)}
                                        className="bg-indigo-50/70 hover:bg-yellow-100/70 border-2 border-black p-3 rounded-xl flex gap-3 items-center cursor-pointer hover:border-indigo-500 transition-all hover:scale-[1.02] shadow-[2px_2px_0px_rgba(0,0,0,1)] group text-left"
                                    >
                                        <div className="w-12 h-12 bg-white border-2 border-black rounded-xl flex items-center justify-center text-3xl shadow-[1px_1px_0px_rgba(0,0,0,1)] group-hover:scale-110 transition-transform shrink-0">
                                            {item.emoji}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-xs text-slate-800 truncate uppercase">{localized.name}</h4>
                                            <p className="text-[9px] font-bold text-gray-500 whitespace-normal line-clamp-2 mt-0.5">{localized.description}</p>
                                            <div className="flex gap-1.5 mt-1">
                                                <span className="bg-indigo-200 border border-black text-black text-[7px] font-black px-1.5 py-0.2 rounded uppercase">
                                                    Bldgs: {item.buildings.length}
                                                </span>
                                                <span className="bg-sky-200 border border-black text-black text-[7px] font-black px-1.5 py-0.2 rounded uppercase">
                                                    Roads: {item.streets.length}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                        {activeCatalogTab === "themes" && (
                            <div className="flex flex-col gap-3 animate-[fadeIn_0.3s_ease-out_forwards]">
                                <div className="bg-blue-50 border-2 border-black p-3 rounded-xl text-xs font-black shadow-[2px_2px_0px_rgba(0,0,0,1)] text-slate-700 leading-relaxed mb-1">
                                    ℹ️ {isChinese
                                        ? "在此选择整个城镇画布的主题背景。主题会即时应用，并自动保存到浏览器本地缓存中。"
                                        : "Choose the canvas theme for your town. Themes apply instantly and persist in local storage."}
                                </div>
                                {Object.entries(THEME_CONFIGS).map(([id, config]) => {
                                    const isActive = mapTheme === id;
                                    const localizedName = config.name[language as keyof typeof config.name] || config.name.English;
                                    const localizedDesc = config.desc[language as keyof typeof config.desc] || config.desc.English;
                                    return (
                                        <button
                                            key={id}
                                            onClick={() => setMapTheme(id as MapTheme)}
                                            className={`w-full text-left border-2 border-black p-3 rounded-xl flex gap-3 items-center transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_rgba(0,0,0,1)] group ${
                                                isActive
                                                    ? "bg-yellow-100 border-indigo-600 ring-2 ring-black ring-offset-2"
                                                    : "bg-white hover:bg-slate-50"
                                            }`}
                                        >
                                            <div
                                                className={`w-12 h-12 rounded-xl border-2 border-black flex items-center justify-center text-3xl shadow-[1px_1px_0px_rgba(0,0,0,1)] shrink-0 transition-transform group-hover:scale-105 ${config.bgClass}`}
                                            >
                                                {config.emoji}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-xs text-slate-800 uppercase truncate">
                                                        {localizedName}
                                                    </span>
                                                    {isActive && (
                                                        <span className="bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 rounded-full border border-black font-black uppercase tracking-wider scale-90 shrink-0">
                                                            {isChinese ? "当前" : "ACTIVE"}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[9px] text-gray-500 font-bold mt-0.5 leading-snug line-clamp-2">
                                                    {localizedDesc}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};
