import React, { useMemo, useState, useEffect } from 'react';
import { Contact, ActiveCommand } from '../../types';
import { MapBuilding, Street, BuildTool, AiSimState } from './types';
import { THEME_CONFIGS } from './constants';
import { getContactWorldLocation } from './mapUtils';
import { getContactLocation } from './translations';
import { eventService, ToonEvent } from '../../lib/event-service';

interface MapCanvasProps {
    mapContainerRef: React.RefObject<HTMLDivElement | null>;
    zoom: number;
    setZoom: (z: number) => void;
    pan: { x: number; y: number };
    setPan: (p: { x: number; y: number }) => void;
    isDragging: boolean;
    mapTheme: string;
    streets: Street[];
    buildings: MapBuilding[];
    activeFilter: string;
    selectedContact: Contact | null;
    selectedBuilding: MapBuilding | null;
    setSelectedBuilding: (b: MapBuilding | null) => void;
    isEditMode: boolean;
    buildTool: BuildTool;
    drawingRoad: any;
    hoveredContactId: string | null;
    setHoveredContactId: (id: string | null) => void;
    aiSimulationState: Record<string, AiSimState>;
    weather: string;
    setWeather: (w: string) => void;
    isWeatherAuto: boolean;
    setIsWeatherAuto: React.Dispatch<React.SetStateAction<boolean>>;
    temperature: number;
    setTemperature: (t: number) => void;
    showFog: boolean;
    timeOfDay: string;
    contacts: Contact[];
    language: string;
    synthRef: React.RefObject<any>;
    
    // Handlers from useMapEditor
    handleMouseDown: React.MouseEventHandler<HTMLDivElement>;
    handleMouseMove: React.MouseEventHandler<HTMLDivElement>;
    handleMouseUpOrLeave: () => void;
    handleTouchStart: React.TouchEventHandler<HTMLDivElement>;
    handleTouchMove: React.TouchEventHandler<HTMLDivElement>;
    handleDropOnMap: React.DragEventHandler<HTMLDivElement>;
    handleUpgradeRoad: (id: string) => void;
    handleDeleteStreet: (e: React.MouseEvent, id: string) => void;
    handleDeleteBuilding: (e: React.MouseEvent, id: string) => void;
    handleItemDragStart: (e: React.MouseEvent, id: string, type: 'building' | 'road', offsetStart?: number, offsetCoord?: number, limitStart?: number, limitEnd?: number) => void;
    handleItemTouchStart: (e: React.TouchEvent, id: string, type: 'building' | 'road', offsetStart?: number, offsetCoord?: number, limitStart?: number, limitEnd?: number) => void;
    
    // Selection handlers
    handleSelectContact: (c: Contact) => void;
    handleSelectBuilding: (b: MapBuilding) => void;
    handleOpenNews?: () => void;
    
    activeCommand?: ActiveCommand | null;
    buildingVisits: Record<string, number>;
    userId?: string;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
    mapContainerRef,
    zoom,
    setZoom,
    pan,
    setPan,
    isDragging,
    mapTheme,
    streets,
    buildings,
    activeFilter,
    selectedContact,
    selectedBuilding,
    setSelectedBuilding,
    isEditMode,
    buildTool,
    drawingRoad,
    hoveredContactId,
    setHoveredContactId,
    aiSimulationState,
    weather,
    setWeather,
    isWeatherAuto,
    setIsWeatherAuto,
    temperature,
    setTemperature,
    showFog,
    timeOfDay,
    contacts,
    language,
    synthRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUpOrLeave,
    handleTouchStart,
    handleTouchMove,
    handleDropOnMap,
    handleUpgradeRoad,
    handleDeleteStreet,
    handleDeleteBuilding,
    handleItemDragStart,
    handleItemTouchStart,
    handleSelectContact,
    handleSelectBuilding,
    handleOpenNews,
    activeCommand,
    buildingVisits,
    userId
}) => {
    const activeThemeConfig = THEME_CONFIGS[mapTheme as keyof typeof THEME_CONFIGS] || THEME_CONFIGS.default;
    const isChinese = language === "简体中文";

    interface WorldStats {
        totalContents: number;
        mostLikedContent: {
            id: string;
            buildingId: string;
            authorId: string;
            markdown: string;
            likes: number;
            dislikes: number;
            authorName: string;
            authorAvatar: string;
        } | null;
        mostLikedCharacter: {
            authorId: string;
            totalLikes: number;
            authorName: string;
            authorAvatar: string;
        } | null;
    }

    const [stats, setStats] = useState<WorldStats | null>(null);

    const fetchStats = async () => {
        try {
            const url = userId ? `/api/ai/world-stats?userId=${encodeURIComponent(userId)}` : '/api/ai/world-stats';
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (err) {
            console.error('Failed to fetch world stats:', err);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 15000);
        return () => clearInterval(interval);
    }, [userId]);

    const topVisitedBuildingId = useMemo(() => {
        let topId = null;
        let maxVisits = -1;
        if (buildingVisits) {
            for (const [id, visits] of Object.entries(buildingVisits)) {
                if (visits > maxVisits) {
                    maxVisits = visits;
                    topId = id;
                }
            }
        }
        return { id: topId, visits: maxVisits };
    }, [buildingVisits]);

    const topVisitedBuilding = useMemo(() => {
        if (!topVisitedBuildingId.id || topVisitedBuildingId.visits <= 0) return null;
        const b = buildings.find(x => x.id === topVisitedBuildingId.id);
        return b ? {
            name: b.name,
            emoji: b.emoji,
            visits: topVisitedBuildingId.visits
        } : null;
    }, [buildings, topVisitedBuildingId]);

    const mostLikedContentBuildingName = useMemo(() => {
        if (!stats?.mostLikedContent?.buildingId) return null;
        const b = buildings.find(x => x.id === stats.mostLikedContent.buildingId);
        return b ? b.name : null;
    }, [buildings, stats]);

    // Breaking News Ticker State
    const [latestAlert, setLatestAlert] = useState<ToonEvent | null>(null);
    const [showAlert, setShowAlert] = useState(false);

    useEffect(() => {
        const unsubscribe = eventService.subscribe((event) => {
            if (['QUARREL', 'FIGHT', 'OPENING'].includes(event.type)) {
                setLatestAlert(event);
                setShowAlert(true);
                // Auto-hide after 8 seconds
                const timer = setTimeout(() => setShowAlert(false), 8000);
                return () => clearTimeout(timer);
            }
        });
        return () => unsubscribe();
    }, []);

    const fogOpacity = useMemo(() => {
        return weather === "foggy" ? 0.85 : Math.max(0.20, Math.min(0.92, 1.25 - zoom * 0.45));
    }, [weather, zoom]);

    const getLoadState = (b: MapBuilding) => {
        const containerW = mapContainerRef.current?.clientWidth || 1000;
        const containerH = mapContainerRef.current?.clientHeight || 750;
        const halfW = containerW / 2 / zoom;
        const halfH = containerH / 2 / zoom;
        const dx = Math.abs(b.x - -pan.x);
        const dy = Math.abs(b.y - -pan.y);
        
        const loadedX = halfW + b.width / 2 + 150;
        const loadedY = halfH + b.height / 2 + 150;
        if (dx < loadedX && dy < loadedY) {
            return "loaded";
        }
        
        const scanningX = loadedX + 450;
        const scanningY = loadedY + 450;
        if (dx < scanningX && dy < scanningY) {
            return "scanning";
        }
        return "hidden";
    };

    const aiContacts = useMemo(() => {
        return contacts.filter((c) => !c.isGroup);
    }, [contacts]);

    const filteredContacts = useMemo(() => {
        if (activeFilter === "all") return aiContacts;
        return aiContacts.filter((c) => 
            getContactLocation(c).roomName.toLowerCase().includes(activeFilter.toLowerCase())
        );
    }, [activeFilter, aiContacts]);

    const roadConnectors = useMemo(() => {
        const set = new Set<string>();
        for (const s of streets) {
            if (s.type === "roundabout" && s.x !== undefined && s.y !== undefined) {
                // Roundabout is mapped as a single central junction node
                set.add(`${s.x},${s.y}`);
            } else if (s.type === "h" && s.coord !== undefined && s.start !== undefined && s.end !== undefined) {
                // Snap points to 40px grid boundaries
                const startSnap = Math.round(s.start / 40) * 40;
                const endSnap = Math.round(s.end / 40) * 40;
                const coordSnap = Math.round(s.coord / 40) * 40;
                for (let x = startSnap; x <= endSnap; x += 40) {
                    set.add(`${x},${coordSnap}`);
                }
            } else if (s.type === "v" && s.coord !== undefined && s.start !== undefined && s.end !== undefined) {
                const startSnap = Math.round(s.start / 40) * 40;
                const endSnap = Math.round(s.end / 40) * 40;
                const coordSnap = Math.round(s.coord / 40) * 40;
                for (let y = startSnap; y <= endSnap; y += 40) {
                    set.add(`${coordSnap},${y}`);
                }
            }
        }
        return set;
    }, [streets]);

    const roadGrid = useMemo(() => {
        const grid: Record<string, { x: number; y: number; style: string; isCurve?: boolean }> = {};
        for (const s of streets) {
            const style = s.roadStyle || "two-lane";
            if (s.type === "roundabout" && s.x !== undefined && s.y !== undefined) {
                // Treated as junction hub
                grid[`${s.x},${s.y}`] = { x: s.x, y: s.y, style };
            } else if (s.type === "curve") {
                // Curves are rendered individually via vector SVGs
            } else if (s.type === "h" && s.coord !== undefined && s.start !== undefined && s.end !== undefined) {
                const startSnap = Math.round(s.start / 40) * 40;
                const endSnap = Math.round(s.end / 40) * 40;
                const coordSnap = Math.round(s.coord / 40) * 40;
                for (let x = startSnap; x <= endSnap; x += 40) {
                    const key = `${x},${coordSnap}`;
                    // Layering logic: overpass > avenue > two-lane > dirt
                    if (!grid[key] || style === "overpass" || (style === "avenue" && grid[key].style !== "overpass")) {
                        grid[key] = { x, y: coordSnap, style };
                    }
                }
            } else if (s.type === "v" && s.coord !== undefined && s.start !== undefined && s.end !== undefined) {
                const startSnap = Math.round(s.start / 40) * 40;
                const endSnap = Math.round(s.end / 40) * 40;
                const coordSnap = Math.round(s.coord / 40) * 40;
                for (let y = startSnap; y <= endSnap; y += 40) {
                    const key = `${coordSnap},${y}`;
                    if (!grid[key] || style === "overpass" || (style === "avenue" && grid[key].style !== "overpass")) {
                        grid[key] = { x: coordSnap, y, style };
                    }
                }
            }
        }
        return grid;
    }, [streets]);

    return (
        <div
            ref={mapContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => handleMouseUpOrLeave()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropOnMap}
            className={`flex-1 relative overflow-hidden ${activeThemeConfig.bgClass} flex items-center justify-center cursor-grab active:cursor-grabbing select-none transition-colors duration-500`}
            style={{
                backgroundImage: `radial-gradient(${activeThemeConfig.dotsColor} 1.5px, transparent 1.5px)`,
                backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
                backgroundPosition: `calc(50% + ${pan.x * zoom}px) calc(50% + ${pan.y * zoom}px)`,
                transition: isDragging ? "none" : "background-position 0.2s ease-out, background-size 0.2s ease-out"
            }}
        >
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(${activeThemeConfig.linesColor} 1px, transparent 1px), linear-gradient(90deg, ${activeThemeConfig.linesColor} 1px, transparent 1px)`,
                    backgroundSize: `${200 * zoom}px ${200 * zoom}px`,
                    backgroundPosition: `calc(50% + ${pan.x * zoom}px) calc(50% + ${pan.y * zoom}px)`,
                    transition: isDragging ? "none" : "background-position 0.2s ease-out, background-size 0.2s ease-out"
                }}
            />
            <div
                className="absolute w-0 h-0"
                style={{
                    transform: `translate(${pan.x * zoom}px, ${pan.y * zoom}px) scale(${zoom})`,
                    transformOrigin: "center center",
                    transition: isDragging ? "none" : "transform 0.2s ease-out"
                }}
            >
                {streets.map((s) => {
                    const containerW = mapContainerRef.current?.clientWidth || 1000;
                    const containerH = mapContainerRef.current?.clientHeight || 750;
                    const halfW = containerW / 2 / zoom;
                    const halfH = containerH / 2 / zoom;
                    if (s.type === "h" && s.coord !== undefined) {
                        const dy = Math.abs(s.coord - -pan.y);
                        if (dy > halfH + 200) return null;
                    } else if (s.type === "v" && s.coord !== undefined) {
                        const dx = Math.abs(s.coord - -pan.x);
                        if (dx > halfW + 200) return null;
                    }

                    if (s.type === "roundabout" && s.start !== undefined && s.coord !== undefined) {
                        const style = s.roadStyle || "two-lane";
                        return (
                            <div
                                key={s.id}
                                onClick={(e) => {
                                    if (isEditMode && buildTool === "upgrade") {
                                        e.stopPropagation();
                                        handleUpgradeRoad(s.id);
                                    }
                                }}
                                onMouseDown={(e) => handleItemDragStart(e, s.id, "road", s.start, s.coord)}
                                onTouchStart={(e) => handleItemTouchStart(e, s.id, "road", s.start, s.coord)}
                                className={isEditMode ? "cursor-move ring-2 ring-yellow-400 hover:ring-rose-400" : ""}
                                style={{
                                    position: "absolute",
                                    left: `${s.start}px`,
                                    top: `${s.coord}px`,
                                    width: "120px",
                                    height: "120px",
                                    transform: "translate(-50%, -50%)",
                                    borderRadius: "50%",
                                    backgroundColor: style === "dirt" ? "#b45309" : style === "overpass" ? "#1e1b4b" : "#475569",
                                    border: style === "dirt" ? "4px dashed #78350f" : "4px solid #000",
                                    boxShadow: style === "overpass" ? "0 12px 24px rgba(0,0,0,0.4)" : "inset 0 4px 8px rgba(0,0,0,0.3)",
                                    zIndex: style === "overpass" ? 5 : 2,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                <div
                                    style={{
                                        width: "60px",
                                        height: "60px",
                                        borderRadius: "50%",
                                        backgroundColor: "#22c55e",
                                        border: "3px solid #000",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "20px",
                                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                                    }}
                                >
                                    ⛲
                                </div>
                                {isEditMode && buildTool !== "upgrade" && (
                                    <button
                                        onClick={(e) => handleDeleteStreet(e, s.id)}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onTouchStart={(e) => e.stopPropagation()}
                                        className="absolute z-10 w-6 h-6 bg-rose-500 hover:bg-rose-600 text-white rounded-full border-2 border-black flex items-center justify-center text-xs shadow-md top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110 active:translate-y-px"
                                        title="Delete Roundabout"
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>
                        );
                    }

                    if (s.type === "curve" && s.start !== undefined && s.coord !== undefined && s.end !== undefined) {
                        const style = s.roadStyle || "two-lane";
                        const x1 = s.start;
                        const y1 = s.coord;
                        const x2 = s.end;
                        const y2 = s.radius || y1;
                        
                        const newStartX = x1 + (x2 > x1 ? -24 : 24);
                        const newEndY = y2 + (y2 > y1 ? 24 : -24);

                        const left = Math.min(x1, x2) - 40;
                        const top = Math.min(y1, y2) - 40;
                        const w = Math.abs(x1 - x2) + 80;
                        const h = Math.abs(y1 - y2) + 80;
                        const rx1 = newStartX - left;
                        const ry1 = y1 - top;
                        const rx2 = x2 - left;
                        const ry2 = newEndY - top;
                        const rcx = rx2;
                        const rcy = ry1;
                        const pathD = `M ${rx1} ${ry1} Q ${rcx} ${rcy} ${rx2} ${ry2}`;
                        let mainStroke = "#475569";
                        let borderStroke = "#000";
                        let dividerStroke = "#facc15";
                        let isDashed = false;
                        if (style === "dirt") {
                            mainStroke = "#b45309";
                            borderStroke = "#78350f";
                            dividerStroke = "#78350f";
                            isDashed = true;
                        } else if (style === "overpass") {
                            mainStroke = "#1e1b4b";
                            dividerStroke = "#06b6d4";
                        }
                        return (
                            <div
                                key={s.id}
                                onClick={(e) => {
                                    if (isEditMode && buildTool === "upgrade") {
                                        e.stopPropagation();
                                        handleUpgradeRoad(s.id);
                                    }
                                }}
                                onMouseDown={(e) => handleItemDragStart(e, s.id, "road", 0, 0, x1, x2)}
                                onTouchStart={(e) => handleItemTouchStart(e, s.id, "road", 0, 0, x1, x2)}
                                className={isEditMode ? "cursor-move ring-2 ring-yellow-400 hover:ring-rose-400" : ""}
                                style={{
                                    position: "absolute",
                                    left: `${left}px`,
                                    top: `${top}px`,
                                    width: `${w}px`,
                                    height: `${h}px`,
                                    zIndex: style === "overpass" ? 5 : 2,
                                    pointerEvents: "auto"
                                }}
                            >
                                <svg width={w} height={h} style={{ overflow: "visible", pointerEvents: "none" }}>
                                    <path
                                        data-distributed="" d={pathD}
                                        fill="none"
                                        stroke={borderStroke}
                                        strokeWidth={style === "avenue" ? 66 : 48}
                                        strokeLinecap="butt"
                                        strokeDasharray={isDashed ? "8,12" : "none"}
                                    />
                                    <path
                                        d={pathD}
                                        fill="none"
                                        stroke={mainStroke}
                                        strokeWidth={style === "avenue" ? 60 : 42}
                                        strokeLinecap="butt"
                                    />
                                    {style === "avenue" ? (
                                        <path
                                            d={pathD}
                                            fill="none"
                                            stroke="#15803d"
                                            strokeWidth={8}
                                            strokeLinecap="butt"
                                        />
                                    ) : style === "overpass" ? (
                                        <>
                                            <path
                                                d={pathD}
                                                fill="none"
                                                stroke="#06b6d4"
                                                strokeWidth={42}
                                                strokeLinecap="butt"
                                                strokeDasharray="4,8"
                                            />
                                            <path
                                                d={pathD}
                                                fill="none"
                                                stroke={mainStroke}
                                                strokeWidth={38}
                                                strokeLinecap="butt"
                                            />
                                        </>
                                    ) : (
                                        <path
                                            d={pathD}
                                            fill="none"
                                            stroke={dividerStroke}
                                            strokeWidth={2}
                                            strokeLinecap="butt"
                                            strokeDasharray={style === "dirt" ? "4,12" : "8,12"}
                                        />
                                    )}
                                </svg>
                                {isEditMode && buildTool !== "upgrade" && (
                                    <button
                                        onClick={(e) => handleDeleteStreet(e, s.id)}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onTouchStart={(e) => e.stopPropagation()}
                                        className="absolute z-10 w-6 h-6 bg-rose-500 hover:bg-rose-600 text-white rounded-full border-2 border-black flex items-center justify-center text-xs shadow-md top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110 active:translate-y-px"
                                        title="Delete Curved Road"
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>
                        );
                    }

                    if (!isEditMode) return null;
                    const isHorizontal = s.type === "h";
                    const style = s.roadStyle || "two-lane";
                    const roadSize = style === "avenue" ? 60 : 42;
                    const halfOffset = roadSize / 2;
                    const styleObj: any = {
                        position: "absolute",
                        borderRadius: "8px",
                        border: "2px dashed #facc15",
                        backgroundColor: "rgba(250, 204, 21, 0.15)",
                        zIndex: 4,
                        cursor: "move"
                    };
                    if (s.start !== undefined && s.end !== undefined && s.coord !== undefined) {
                        if (isHorizontal) {
                            styleObj.left = `${s.start}px`;
                            styleObj.top = `${s.coord}px`;
                            styleObj.width = `${s.end - s.start}px`;
                            styleObj.height = `${roadSize}px`;
                            styleObj.transform = `translateY(-${halfOffset}px)`;
                        } else {
                            styleObj.left = `${s.coord}px`;
                            styleObj.top = `${s.start}px`;
                            styleObj.width = `${roadSize}px`;
                            styleObj.height = `${s.end - s.start}px`;
                            styleObj.transform = `translateX(-${halfOffset}px)`;
                        }
                    }
                    return (
                        <div
                            key={s.id}
                            onClick={(e) => {
                                if (isEditMode && buildTool === "upgrade") {
                                    e.stopPropagation();
                                    handleUpgradeRoad(s.id);
                                }
                            }}
                            onMouseDown={(e) => handleItemDragStart(e, s.id, "road", 0, 0, s.start, s.end)}
                            onTouchStart={(e) => handleItemTouchStart(e, s.id, "road", 0, 0, s.start, s.end)}
                            className="hover:bg-yellow-400/25 transition-colors"
                            style={styleObj}
                        >
                            {buildTool !== "upgrade" && (
                                <button
                                    onClick={(e) => handleDeleteStreet(e, s.id)}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    className="absolute z-10 w-6 h-6 bg-rose-500 hover:bg-rose-600 text-white rounded-full border-2 border-black flex items-center justify-center text-xs shadow-md top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110 active:translate-y-px"
                                    title="Delete Road"
                                >
                                    🗑️
                                </button>
                            )}
                        </div>
                    );
                })}

                {Object.values(roadGrid).map((tile) => {
                    const key = `${tile.x},${tile.y}`;
                    const containerW = mapContainerRef.current?.clientWidth || 1000;
                    const containerH = mapContainerRef.current?.clientHeight || 750;
                    const halfW = containerW / 2 / zoom;
                    const halfH = containerH / 2 / zoom;
                    const dx = Math.abs(tile.x - -pan.x);
                    const dy = Math.abs(tile.y - -pan.y);
                    if (dx > halfW + 120 || dy > halfH + 120) return null;

                    const up = roadConnectors.has(`${tile.x},${tile.y - 40}`);
                    const right = roadConnectors.has(`${tile.x + 40},${tile.y}`);
                    const down = roadConnectors.has(`${tile.x},${tile.y + 40}`);
                    const left = roadConnectors.has(`${tile.x - 40},${tile.y}`);

                    let bgColor = "#475569";
                    let borderColor = "#000";
                    let borderWidth = 3;
                    let dividerColor = "#facc15";
                    let dividerWidth = 2;
                    let dividerDash: string | undefined = "6,6";
                    if (tile.style === "dirt") {
                        bgColor = "#b45309";
                        borderColor = "#78350f";
                        dividerColor = "#78350f";
                        dividerDash = "4,4";
                    } else if (tile.style === "avenue") {
                        bgColor = "#334155";
                        dividerColor = "#15803d";
                        dividerWidth = 6;
                        dividerDash = undefined;
                    } else if (tile.style === "overpass") {
                        bgColor = "#1e1b4b";
                        borderColor = "#06b6d4";
                        dividerColor = "#06b6d4";
                        dividerDash = "6,6";
                    }

                    const borders = [];
                    if (!up) {
                        borders.push(
                            <line
                                key="border-up"
                                x1={0}
                                y1={0}
                                x2={40}
                                y2={0}
                                stroke={borderColor}
                                strokeWidth={borderWidth}
                                strokeLinecap="square"
                            />
                        );
                    }
                    if (!right) {
                        borders.push(
                            <line
                                key="border-right"
                                x1={40}
                                y1={0}
                                x2={40}
                                y2={40}
                                stroke={borderColor}
                                strokeWidth={borderWidth}
                                strokeLinecap="square"
                            />
                        );
                    }
                    if (!down) {
                        borders.push(
                            <line
                                key="border-down"
                                x1={0}
                                y1={40}
                                x2={40}
                                y2={40}
                                stroke={borderColor}
                                strokeWidth={borderWidth}
                                strokeLinecap="square"
                            />
                        );
                    }
                    if (!left) {
                        borders.push(
                            <line
                                key="border-left"
                                x1={0}
                                y1={0}
                                x2={0}
                                y2={40}
                                stroke={borderColor}
                                strokeWidth={borderWidth}
                                strokeLinecap="square"
                            />
                        );
                    }

                    const dividers = [];
                    if (up && down && !left && !right) {
                        dividers.push(
                            <line
                                key="div-v"
                                x1={20}
                                y1={0}
                                x2={20}
                                y2={40}
                                stroke={dividerColor}
                                strokeWidth={dividerWidth}
                                strokeDasharray={dividerDash}
                                strokeDashoffset={dividerDash ? -(tile.y - 20) : undefined}
                                strokeLinecap="butt"
                            />
                        );
                    } else if (left && right && !up && !down) {
                        dividers.push(
                            <line
                                key="div-h"
                                x1={0}
                                y1={20}
                                x2={40}
                                y2={20}
                                stroke={dividerColor}
                                strokeWidth={dividerWidth}
                                strokeDasharray={dividerDash}
                                strokeDashoffset={dividerDash ? -(tile.x - 20) : undefined}
                                strokeLinecap="butt"
                            />
                        );
                    } else {
                        if (up) {
                            dividers.push(
                                <line
                                    key="div-up"
                                    x1={20}
                                    y1={20}
                                    x2={20}
                                    y2={0}
                                    stroke={dividerColor}
                                    strokeWidth={dividerWidth}
                                    strokeDasharray={dividerDash}
                                    strokeDashoffset={dividerDash ? -(tile.y - 20) : undefined}
                                    strokeLinecap="butt"
                                />
                            );
                        }
                        if (right) {
                            dividers.push(
                                <line
                                    key="div-right"
                                    x1={20}
                                    y1={20}
                                    x2={40}
                                    y2={20}
                                    stroke={dividerColor}
                                    strokeWidth={dividerWidth}
                                    strokeDasharray={dividerDash}
                                    strokeDashoffset={dividerDash ? -tile.x : undefined}
                                    strokeLinecap="butt"
                                />
                            );
                        }
                        if (down) {
                            dividers.push(
                                <line
                                    key="div-down"
                                    x1={20}
                                    y1={20}
                                    x2={20}
                                    y2={40}
                                    stroke={dividerColor}
                                    strokeWidth={dividerWidth}
                                    strokeDasharray={dividerDash}
                                    strokeDashoffset={dividerDash ? -tile.y : undefined}
                                    strokeLinecap="butt"
                                />
                            );
                        }
                        if (left) {
                            dividers.push(
                                <line
                                    key="div-left"
                                    x1={20}
                                    y1={20}
                                    x2={0}
                                    y2={20}
                                    stroke={dividerColor}
                                    strokeWidth={dividerWidth}
                                    strokeDasharray={dividerDash}
                                    strokeDashoffset={dividerDash ? -(tile.x - 20) : undefined}
                                    strokeLinecap="butt"
                                />
                            );
                        }
                    }
                    return (
                        <div
                            key={key}
                            style={{
                                position: "absolute",
                                left: `${tile.x - 20}px`,
                                top: `${tile.y - 20}px`,
                                width: "40px",
                                height: "40px",
                                backgroundColor: "transparent",
                                zIndex: tile.style === "overpass" ? 5 : 2,
                                pointerEvents: "none"
                            }}
                        >
                            <svg width="40" height="40" style={{ overflow: "visible", display: "block" }}>
                                <rect x={-0.5} y={-0.5} width={41} height={41} fill={bgColor} stroke="none" />
                                {dividers}
                                {borders}
                            </svg>
                        </div>
                    );
                })}

                {isEditMode && drawingRoad && (() => {
                    const dx = Math.abs(drawingRoad.currentX - drawingRoad.startX);
                    const dy = Math.abs(drawingRoad.currentY - drawingRoad.startY);
                    if (buildTool === "curve") {
                        const x1 = drawingRoad.startX;
                        const y1 = drawingRoad.startY;
                        const x2 = drawingRoad.currentX;
                        const y2 = drawingRoad.currentY;
                        
                        const newStartX = x1 + (x2 > x1 ? -24 : 24);
                        const newEndY = y2 + (y2 > y1 ? 24 : -24);

                        const left = Math.min(x1, x2) - 40;
                        const top = Math.min(y1, y2) - 40;
                        const w = Math.abs(x1 - x2) + 80;
                        const h = Math.abs(y1 - y2) + 80;
                        const rx1 = newStartX - left;
                        const ry1 = y1 - top;
                        const rx2 = x2 - left;
                        const ry2 = newEndY - top;
                        const rcx = rx2;
                        const rcy = ry1;
                        const pathD = `M ${rx1} ${ry1} Q ${rcx} ${rcy} ${rx2} ${ry2}`;
                        const gridW = Math.max(1, Math.round(Math.abs(x1 - x2) / 40));
                        const gridH = Math.max(1, Math.round(Math.abs(y1 - y2) / 40));
                        return (
                            <div
                                style={{
                                    position: "absolute",
                                    left: `${left}px`,
                                    top: `${top}px`,
                                    width: `${w}px`,
                                    height: `${h}px`,
                                    zIndex: 30,
                                    pointerEvents: "none"
                                }}
                            >
                                <svg width={w} height={h} style={{ overflow: "visible" }}>
                                    <path
                                        d={pathD}
                                        fill="none"
                                        stroke="#0ea5e9"
                                        strokeWidth={48}
                                        strokeLinecap="butt"
                                        strokeDasharray="4,8"
                                        opacity={0.6}
                                    />
                                    <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth={4} strokeLinecap="butt" />
                                </svg>
                                <div
                                    className="absolute bg-sky-500 text-white font-black text-[10px] px-2 py-0.5 rounded border border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] whitespace-nowrap z-40"
                                    style={{
                                        left: `${(rx1 + rx2) / 2}px`,
                                        top: `${(ry1 + ry2) / 2 - 25}px`,
                                        transform: "translate(-50%, -50%)"
                                    }}
                                >
                                    📐 Curve: {gridW} x {gridH} Tiles
                                </div>
                            </div>
                        );
                    } else if (buildTool === "draw") {
                        const isHorizontal = dx >= dy;
                        let left = 0;
                        let top = 0;
                        let width = 0;
                        let height = 0;
                        if (isHorizontal) {
                            left = Math.min(drawingRoad.startX, drawingRoad.currentX);
                            top = drawingRoad.startY - 21;
                            width = Math.max(40, dx);
                            height = 42;
                        } else {
                            left = drawingRoad.startX - 21;
                            top = Math.min(drawingRoad.startY, drawingRoad.currentY);
                            width = 42;
                            height = Math.max(40, dy);
                        }
                        const gridLen = Math.round(Math.max(40, isHorizontal ? dx : dy) / 40);
                        return (
                            <>
                                <div
                                    style={{
                                        position: "absolute",
                                        left: `${left}px`,
                                        top: `${top}px`,
                                        width: `${width}px`,
                                        height: `${height}px`,
                                        backgroundColor: "#38bdf8",
                                        border: "3px dashed #0284c7",
                                        borderRadius: "8px",
                                        opacity: 0.6,
                                        zIndex: 30,
                                        pointerEvents: "none"
                                    }}
                                />
                                <div
                                    className="absolute border-2 border-dashed border-sky-400 bg-sky-400/20 pointer-events-none z-30"
                                    style={{
                                        left: `${left - 6}px`,
                                        top: `${top - 6}px`,
                                        width: `${width + 12}px`,
                                        height: `${height + 12}px`,
                                        borderRadius: "12px"
                                    }}
                                />
                                <div
                                    className="absolute bg-sky-500 text-white font-black text-xs px-2 py-1 rounded border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] whitespace-nowrap z-40"
                                    style={{
                                        left: isHorizontal ? `${left + width / 2}px` : `${left + 40}px`,
                                        top: isHorizontal ? `${top - 30}px` : `${top + height / 2}px`,
                                        transform: "translate(-50%, -50%)"
                                    }}
                                >
                                    📏 {isHorizontal ? `${gridLen} x 1` : `1 x ${gridLen}`} Tiles
                                </div>
                            </>
                        );
                    }
                    return null;
                })()}

                {buildings.map((b) => {
                    if (zoom < 0.40) return null;
                    const loadState = getLoadState(b);
                    if (loadState === "hidden") return null;

                    if (loadState === "scanning") {
                        return (
                            <div
                                key={b.id}
                                style={{
                                    position: "absolute",
                                    left: `${b.x}px`,
                                    top: `${b.y}px`,
                                    width: `${b.width}px`,
                                    height: `${b.height}px`,
                                    transform: "translate(-50%, -50%)",
                                    zIndex: 10
                                }}
                                className="border-4 border-dashed border-amber-400 bg-amber-50/80 rounded-[32px] p-3 flex flex-col justify-between items-center shadow-[4px_4px_0px_rgba(0,0,0,1)] animate-pulse select-none transition-all duration-500 text-black"
                            >
                                <div className="flex items-center gap-1.5 mt-2 text-amber-700">
                                    <span className="text-xl animate-bounce">🚧</span>
                                    <span className="text-[10px] font-black uppercase tracking-wider">Blueprint Scanning</span>
                                </div>
                                <div className="text-3xl filter grayscale opacity-45">{b.emoji}</div>
                                <div className="text-center w-full">
                                    <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wide truncate">{b.name}</h4>
                                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                        <div className="bg-amber-400 h-full w-2/3 rounded-full animate-[shimmer_2s_infinite]" />
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    const isLodDetailed = zoom >= 0.70;
                    return (
                        <div
                            key={b.id}
                            style={{
                                position: "absolute",
                                left: `${b.x}px`,
                                top: `${b.y}px`,
                                width: `${b.width}px`,
                                height: `${b.height}px`,
                                transform: "translate(-50%, -50%)",
                                zIndex: selectedBuilding?.id === b.id ? 28 : 10
                            }}
                            onClick={() => {
                                if (isEditMode) return;
                                handleSelectBuilding(b);
                            }}
                            onMouseDown={(e) => handleItemDragStart(e, b.id, "building", b.x, b.y)}
                            onTouchStart={(e) => handleItemTouchStart(e, b.id, "building", b.x, b.y)}
                            className={`transition-all duration-300 select-none cursor-pointer ${
                                isEditMode
                                    ? "cursor-move ring-4 ring-yellow-400 hover:ring-rose-400 rounded-[28px]"
                                    : ""
                            } ${
                                selectedBuilding?.id === b.id
                                    ? "scale-110 filter drop-shadow-[0_0_12px_rgba(234,179,8,0.6)]"
                                    : selectedContact &&
                                      getContactWorldLocation(selectedContact, buildings).placeName.includes(b.name)
                                    ? "scale-110 filter drop-shadow-[0_0_12px_rgba(234,179,8,0.6)]"
                                    : "hover:scale-105"
                            }`}
                        >
                            {isEditMode && (
                                <button
                                    onClick={(e) => handleDeleteBuilding(e, b.id)}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    className="absolute -top-3.5 -right-3.5 z-30 w-7 h-7 bg-rose-500 hover:bg-rose-600 text-white rounded-full border-3 border-black flex items-center justify-center text-xs shadow-md cursor-pointer transition-transform hover:scale-110 active:translate-y-px"
                                    title="Delete Building"
                                >
                                    🗑️
                                </button>
                            )}
                            {selectedBuilding?.id === b.id && <div className="building-ripple-ring" />}

                            {/* In-World Building Health Bar */}
                            {b.isActive && (
                                <div 
                                    className="absolute -left-3 top-1/2 -translate-y-1/2 w-2 bg-slate-200 border border-black rounded-full overflow-hidden flex flex-col-reverse shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                                    style={{ height: '35%', zIndex: 30 }}
                                    title={`Health: ${b.health || 0}%`}
                                >
                                    <div 
                                        className={`w-full transition-all duration-700 ease-out ${
                                            (b.health || 0) > 70 ? 'bg-green-500' : (b.health || 0) > 30 ? 'bg-yellow-400' : 'bg-red-500'
                                        }`}
                                        style={{ height: `${b.health || 0}%` }}
                                    />
                                </div>
                            )}

                            <div className={`w-full h-full transition-all flex flex-col justify-between relative text-black ${
                                isLodDetailed
                                    ? "bg-white border-4 border-black rounded-[32px] p-3 shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[4px_4px_0px_rgba(0,0,0,1)] overflow-hidden"
                                    : "bg-transparent border-0 p-0 shadow-none overflow-visible"
                            }`}>
                                {isLodDetailed && (
                                    <div className="absolute top-3 left-3 bg-indigo-100 border-2 border-black text-black text-[8px] font-black px-1.5 py-0.5 rounded-lg tracking-wide uppercase shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]">
                                        {b.tag}
                                    </div>
                                )}
                                {isLodDetailed ? (
                                    <>
                                        <div className="flex justify-between items-start mt-6">
                                            <div className="flex flex-col text-left">
                                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide leading-tight line-clamp-2">
                                                    {b.name}
                                                </h4>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                                    {b.type}
                                                </span>
                                            </div>
                                            <span className="text-3xl select-none filter drop-shadow-[1px_2px_0px_rgba(0,0,0,0.1)] shrink-0 ml-1">
                                                {b.emoji}
                                            </span>
                                        </div>
                                        <div className="flex-1 my-1.5 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 p-1.5 flex flex-col justify-between relative overflow-hidden">
                                            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:8px_8px] pointer-events-none" />
                                            {b.id === "hq" && (
                                                <div className="h-full flex flex-col justify-between z-10 text-[9px] font-bold text-slate-700">
                                                    <div className="flex justify-between">
                                                        <span>🖥️ Workdesk A</span>
                                                        <span>🖥️ B</span>
                                                    </div>
                                                    <div className="flex justify-center text-xs">💡 Research Server Node</div>
                                                    <div className="flex justify-around">
                                                        <span>🛋️ Lounge Pod</span>
                                                        <span>☕ Tea Corner</span>
                                                    </div>
                                                </div>
                                            )}
                                            {b.id === "cafe" && (
                                                <div className="h-full flex flex-col justify-between z-10 text-[9px] font-bold text-slate-700">
                                                    <div className="flex justify-between">
                                                        <span>🥐 Bakery</span>
                                                        <span>🧉 Beans</span>
                                                    </div>
                                                    <div className="flex justify-center text-xs">☕ Espresso Station</div>
                                                    <div className="text-center">Patio Tables Rest Area</div>
                                                </div>
                                            )}
                                            {b.id === "plaza" && (
                                                <div className="h-full flex flex-col justify-between z-10 text-[9px] font-black text-emerald-800">
                                                    <div className="flex justify-between">
                                                        <span>🌲 Pinewood</span>
                                                        <span>🌳 Oak</span>
                                                    </div>
                                                    <div className="text-center text-2xl animate-[bounce_2s_infinite]">⛲</div>
                                                    <div className="flex justify-around">
                                                        <span>🌻 Tulip bed</span>
                                                        <span>🌸 Lilac</span>
                                                    </div>
                                                </div>
                                            )}
                                            {b.id === "gym" && (
                                                <div className="h-full flex flex-col justify-between z-10 text-[9px] font-bold text-slate-700">
                                                    <div className="flex justify-between">
                                                        <span>🏋️ Weight Bench</span>
                                                        <span>🏃 Treadmill</span>
                                                    </div>
                                                    <div className="text-center text-xs">👟 Aerobic Arena</div>
                                                    <div className="text-center">Locker Rooms 🚿</div>
                                                </div>
                                            )}
                                            {b.id === "cinema" && (
                                                <div className="h-full flex flex-col justify-between z-10 text-[9px] font-bold text-slate-700">
                                                    <div className="text-center bg-slate-900 text-cyan-300 font-bold py-0.5 rounded border border-black uppercase text-[8px]">
                                                        🎬 PROJECTOR SCREEN
                                                    </div>
                                                    <div className="flex justify-around text-xs">🛏️ 🛏️ 🛏️</div>
                                                    <div className="text-center">🍿 Popcorn Concession</div>
                                                </div>
                                            )}
                                            {b.id === "arcade" && (
                                                <div className="h-full flex flex-col justify-between z-10 text-[9px] font-bold text-slate-700">
                                                    <div className="flex justify-between">
                                                        <span>🕹️ Pac-Man</span>
                                                        <span>🕹️ Tetris</span>
                                                    </div>
                                                    <div className="text-center text-xs animate-pulse text-purple-700 font-black">👾 RETRO ARENA</div>
                                                    <div className="text-center text-purple-600">🎟️ Prize Counter</div>
                                                </div>
                                            )}
                                            {b.type === "lake" && (
                                                <div className="h-full flex flex-col justify-between z-10 text-[9px] font-black text-blue-900">
                                                    <div className="flex justify-between">
                                                        <span>⛵ Sailboat Cove</span>
                                                        <span>🚣 Kayak Launch</span>
                                                    </div>
                                                    <div className="text-center text-2xl animate-[pulse_2s_infinite]">🎣</div>
                                                    <div className="flex justify-around">
                                                        <span>🐟 Fishing Pier</span>
                                                        <span>🏖️ Sandy Beach</span>
                                                    </div>
                                                </div>
                                            )}
                                            {b.type === "mountain" && (
                                                <div className="h-full flex flex-col justify-between z-10 text-[9px] font-black text-amber-900">
                                                    <div className="flex justify-between">
                                                        <span>🧗 Summit Trail</span>
                                                        <span>⛺ Camping Ground</span>
                                                    </div>
                                                    <div className="text-center text-2xl animate-[bounce_3s_infinite]">⛰️</div>
                                                    <div className="flex justify-around">
                                                        <span>🦅 Lookout Point</span>
                                                        <span>🧘 Meditation Ledge</span>
                                                    </div>
                                                </div>
                                            )}
                                            {b.type === "pond" && (
                                                <div className="h-full flex flex-col justify-between z-10 text-[9px] font-black text-emerald-900">
                                                    <div className="flex justify-between">
                                                        <span>🐸 Lily Pad Deck</span>
                                                        <span>🌿 Reed Hideout</span>
                                                    </div>
                                                    <div className="text-center text-2xl animate-[bounce_2s_infinite]">🐸</div>
                                                    <div className="flex justify-around">
                                                        <span>🐌 Tadpole Shallows</span>
                                                        <span>🍀 Lotus Pool</span>
                                                    </div>
                                                </div>
                                            )}
                                            {(b.id === "hospital" || b.type === "hospital") && (
                                                <div className="h-full flex flex-col justify-between z-10 text-[9px] font-bold text-slate-700">
                                                    <div className="flex justify-between">
                                                        <span>🏥 Emergency Room</span>
                                                        <span>🌡️ Ward A</span>
                                                    </div>
                                                    <div className="text-center text-xs animate-pulse text-red-500 font-black">➕ TOON CLINIC</div>
                                                    <div className="flex justify-around">
                                                        <span>💊 Pharmacy</span>
                                                        <span>🛌 Recovery Bed</span>
                                                    </div>
                                                </div>
                                            )}
                                            {b.imageUrl ? (
                                                <div className="h-full w-full flex items-center justify-center p-1 z-10 bg-white rounded-xl border border-black/10">
                                                    <img src={b.imageUrl} alt={b.name} className="max-h-full max-w-full object-contain rounded" />
                                                </div>
                                            ) : (
                                                !["hq", "cafe", "plaza", "gym", "cinema", "arcade", "lake", "mountain", "pond", "hospital"].includes(b.id) &&
                                                !["lake", "mountain", "pond", "hospital"].includes(b.type) && (
                                                    <div className="h-full flex flex-col justify-center items-center gap-1 z-10">
                                                        <span className="text-2xl animate-bounce">{b.emoji || "🌀"}</span>
                                                        <span className="text-[8px] font-bold text-slate-500 uppercase">{b.tag || "Interactive Zone"}</span>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                        <p className="text-[8px] text-gray-500 font-bold leading-none mb-0.5 text-left truncate">{b.description}</p>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col justify-center items-center relative select-none">
                                        {b.id === "hq" && (
                                            <div className="w-[140px] h-[190px] flex flex-col justify-center items-center relative">
                                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-12 bg-slate-800 flex justify-center">
                                                    <div className="w-2.5 h-2.5 bg-red-500 border border-black rounded-full animate-[ping_1.5s_infinite]" />
                                                </div>
                                                <div className="w-[90px] h-[16px] bg-emerald-600 border-4 border-black rounded-t-xl" />
                                                <div className="w-[110px] h-[110px] bg-emerald-400 border-4 border-black flex flex-wrap p-1.5 gap-1 justify-center content-start shadow-[5px_5px_0px_rgba(0,0,0,1)]">
                                                    {Array.from({ length: 12 }).map((_, i) => (
                                                        <div
                                                            key={i}
                                                            className={`w-[18px] h-[14px] border-2 border-black rounded-sm transition-colors duration-1000 ${
                                                                timeOfDay === "night"
                                                                    ? "bg-yellow-300 shadow-[0_0_6px_rgba(253,224,71,0.8)]"
                                                                    : "bg-cyan-200"
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="w-[120px] h-[28px] bg-emerald-500 border-x-4 border-b-4 border-black flex justify-center items-end relative">
                                                    <div className="absolute -top-1 w-[50px] h-[6px] bg-red-400 border-2 border-black" />
                                                    <div className="w-[30px] h-[18px] bg-yellow-100 border-t-2 border-x-2 border-black rounded-t" />
                                                </div>
                                                <span className="absolute -bottom-5 bg-black border-2 border-black text-white text-[8px] font-black px-1.5 py-0.5 rounded tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase">
                                                    {b.name}
                                                </span>
                                            </div>
                                        )}
                                        {b.id === "cafe" && (
                                            <div className="w-[140px] h-[170px] flex flex-col justify-center items-center relative">
                                                <div className="w-[120px] h-[28px] bg-red-400 border-4 border-black rounded-t-[32px] relative flex justify-center">
                                                    <span className="absolute -top-6 text-xl">☕</span>
                                                </div>
                                                <div className="w-[110px] h-[10px] bg-red-300 border-x-4 border-b-4 border-black flex justify-around">
                                                    <div className="w-4 h-full bg-white" />
                                                    <div className="w-4 h-full bg-white" />
                                                    <div className="w-4 h-full bg-white" />
                                                </div>
                                                <div className="w-[100px] h-[75px] bg-amber-100 border-x-4 border-b-4 border-black flex justify-around items-center p-1 shadow-[5px_5px_0px_rgba(0,0,0,1)] relative">
                                                    <div
                                                        className={`w-6 h-6 rounded-full border-2 border-black flex items-center justify-center text-xs transition-all duration-1000 ${
                                                            timeOfDay === "night"
                                                                ? "bg-yellow-300 shadow-[0_0_6px_rgba(253,224,71,0.8)]"
                                                                : "bg-cyan-100"
                                                        }`}
                                                    >
                                                        🥐
                                                    </div>
                                                    <div className="w-6 h-10 bg-amber-700 border-2 border-black rounded-t" />
                                                </div>
                                                <span className="absolute -bottom-5 bg-black border-2 border-black text-white text-[8px] font-black px-1.5 py-0.5 rounded tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase">
                                                    {b.name}
                                                </span>
                                            </div>
                                        )}
                                        {b.id === "gym" && (
                                            <div className="w-[140px] h-[160px] flex flex-col justify-center items-center relative">
                                                <div className="w-[110px] h-[40px] bg-blue-500 border-4 border-black rounded-t-full border-b-0 flex justify-center items-end">
                                                    <span className="text-lg">🏋️</span>
                                                </div>
                                                <div className="w-[110px] h-[65px] bg-slate-300 border-4 border-black flex flex-col justify-center items-center pb-1 shadow-[5px_5px_0px_rgba(0,0,0,1)] relative">
                                                    <div className="w-[20px] h-[28px] bg-slate-800 border-t-2 border-x-2 border-black rounded-t" />
                                                    <div
                                                        className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 border-black flex items-center justify-center text-[10px] transition-colors duration-1000 ${
                                                            timeOfDay === "night"
                                                                ? "bg-yellow-300 shadow-[0_0_6px_rgba(253,224,71,0.8)]"
                                                                : "bg-cyan-100"
                                                        }`}
                                                    >
                                                        🏃
                                                    </div>
                                                    <div
                                                        className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 border-black flex items-center justify-center text-[10px] transition-colors duration-1000 ${
                                                            timeOfDay === "night"
                                                                ? "bg-yellow-300 shadow-[0_0_6px_rgba(253,224,71,0.8)]"
                                                                : "bg-cyan-100"
                                                        }`}
                                                    >
                                                        👟
                                                    </div>
                                                </div>
                                                <span className="absolute -bottom-5 bg-black border-2 border-black text-white text-[8px] font-black px-1.5 py-0.5 rounded tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase">
                                                    {b.name}
                                                </span>
                                            </div>
                                        )}
                                        {b.id === "plaza" && (
                                            <div className="w-[160px] h-[150px] flex flex-col justify-center items-center relative">
                                                <div className="w-[140px] h-[110px] bg-emerald-300 border-4 border-black rounded-full shadow-[5px_5px_0px_rgba(0,0,0,1)] flex items-center justify-center relative">
                                                    <div className="absolute inset-2 border-2 border-dashed border-emerald-400 rounded-full" />
                                                    <div
                                                        className={`w-16 h-16 border-2 border-black rounded-full flex items-center justify-center animate-[pulse_2.5s_infinite] relative shadow-inner z-10 transition-colors duration-1000 ${
                                                            timeOfDay === "night"
                                                                ? "bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                                                                : "bg-blue-300"
                                                        }`}
                                                    >
                                                        <span className="text-xl animate-[bounce_1.5s_infinite]">⛲</span>
                                                        <div className="absolute -top-1 left-2 text-[8px] animate-ping">💦</div>
                                                        <div className="absolute -bottom-1 right-2 text-[8px] animate-ping delay-300">💦</div>
                                                    </div>
                                                    <div className="absolute -top-3 left-4 text-xl">🌳</div>
                                                    <div className="absolute -bottom-3 right-6 text-xl">🌳</div>
                                                    <div className="absolute top-6 -right-3 text-xl">🌳</div>
                                                    <div className="absolute bottom-6 -left-3 text-xl">🌳</div>
                                                </div>
                                                <span className="absolute -bottom-5 bg-black border-2 border-black text-white text-[8px] font-black px-1.5 py-0.5 rounded tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase z-20">
                                                    {b.name}
                                                </span>
                                            </div>
                                        )}
                                        {b.id === "cinema" && (
                                            <div className="w-[140px] h-[160px] flex flex-col justify-center items-center relative">
                                                <div className="w-[110px] h-[95px] bg-rose-500 border-4 border-black flex flex-col justify-between items-center p-1.5 shadow-[5px_5px_0px_rgba(0,0,0,1)] relative rounded-t-xl">
                                                    <div
                                                        className={`w-full border-2 border-black py-0.5 text-center text-[7px] font-black tracking-widest text-black animate-pulse uppercase transition-all duration-1000 ${
                                                            timeOfDay === "night" ? "bg-yellow-300 shadow-[0_0_8px_rgba(253,224,71,0.9)]" : "bg-yellow-300"
                                                        }`}
                                                    >
                                                        🎟️ NOW PLAYING 🎟️
                                                    </div>
                                                    <span className="text-2xl my-1 animate-[pulse_3s_infinite]">🍿</span>
                                                    <div className="w-[24px] h-[20px] bg-black border-t-2 border-x-2 border-black rounded-t flex justify-center">
                                                        <div
                                                            className={`w-2 h-full transition-colors duration-1000 ${
                                                                timeOfDay === "night" ? "bg-yellow-300 shadow-[0_0_6px_rgba(253,224,71,0.8)]" : "bg-zinc-800"
                                                            }`}
                                                        />
                                                    </div>
                                                </div>
                                                <span className="absolute -bottom-5 bg-black border-2 border-black text-white text-[8px] font-black px-1.5 py-0.5 rounded tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase">
                                                    {b.name}
                                                </span>
                                            </div>
                                        )}
                                        {b.id === "arcade" && (
                                            <div className="w-[140px] h-[160px] flex flex-col justify-center items-center relative">
                                                <div className="w-[100px] h-[80px] bg-violet-400 border-4 border-black flex flex-col justify-between items-center p-1 shadow-[5px_5px_0px_rgba(0,0,0,1)] relative rounded-t-xl">
                                                    <div className="flex justify-between w-full text-[9px]">
                                                        <span>🕹️</span>
                                                        <span>🕹️</span>
                                                    </div>
                                                    <span className="text-2xl animate-bounce mb-1">👾</span>
                                                    <div className="w-[28px] h-[16px] bg-indigo-900 border-t-2 border-x-2 border-black rounded-t" />
                                                </div>
                                                <span className="absolute -bottom-5 bg-black border-2 border-black text-white text-[8px] font-black px-1.5 py-0.5 rounded tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase">
                                                    {b.name}
                                                </span>
                                            </div>
                                        )}
                                        {(b.id === "lake" || b.type === "lake") && (
                                            <div className="w-full h-full flex flex-col justify-center items-center relative">
                                                <div className="w-[90%] h-[85%] bg-gradient-to-b from-blue-300 to-indigo-600 border-4 border-black rounded-full shadow-[5px_5px_0px_rgba(0,0,0,1)] relative flex items-center justify-center overflow-hidden">
                                                    <div className="absolute top-2 left-6 text-xl animate-[jumpFish_5s_infinite_ease-in-out] select-none z-10">
                                                        🐟
                                                    </div>
                                                    <div className="absolute bottom-4 right-8 text-xl animate-[jumpFish_7s_infinite_ease-in-out_1s] select-none z-10">
                                                        🐠
                                                    </div>
                                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl animate-[drift_4s_infinite_ease-in-out] select-none">
                                                        ⛵
                                                    </div>
                                                </div>
                                                <span className="absolute -bottom-5 bg-black border-2 border-black text-white text-[8px] font-black px-1.5 py-0.5 rounded tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase z-20">
                                                    {b.name}
                                                </span>
                                            </div>
                                        )}
                                        {(b.id === "mountain" || b.type === "mountain") && (
                                            <div className="w-full h-full flex flex-col justify-center items-center relative">
                                                <div className="w-[90%] h-[85%] bg-gradient-to-b from-amber-200 to-amber-600 border-4 border-black rounded-3xl shadow-[5px_5px_0px_rgba(0,0,0,1)] relative flex justify-center items-end overflow-hidden">
                                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl animate-[drift_6s_infinite_ease-in-out] select-none">
                                                        ⛰️
                                                    </div>
                                                    <div className="absolute bottom-0 right-10 text-xl z-20">🌲</div>
                                                    <div className="absolute top-2 left-6 text-xl animate-[floatCloud_12s_infinite_ease-in-out] z-20 filter drop-shadow-[2px_2px_0px_rgba(0,0,0,0.15)] opacity-90 select-none">
                                                        ☁️
                                                    </div>
                                                </div>
                                                <span className="absolute -bottom-5 bg-black border-2 border-black text-white text-[8px] font-black px-1.5 py-0.5 rounded tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase z-20">
                                                    {b.name}
                                                </span>
                                            </div>
                                        )}
                                        {(b.id === "pond" || b.type === "pond") && (
                                            <div className="w-full h-full flex flex-col justify-center items-center relative">
                                                <div className="w-[85%] h-[85%] bg-gradient-to-b from-teal-300 to-cyan-500 border-4 border-black rounded-full shadow-[5px_5px_0px_rgba(0,0,0,1)] relative flex items-center justify-center overflow-hidden">
                                                    {timeOfDay === "night" && (
                                                        <>
                                                            <div className="absolute top-2 right-4 text-[7px] text-yellow-200 animate-ping select-none">✨</div>
                                                            <div className="absolute bottom-4 left-6 text-[9px] text-yellow-200 animate-pulse select-none">✨</div>
                                                        </>
                                                    )}
                                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl animate-[bounce_3s_infinite] select-none z-10">
                                                        🐸
                                                    </div>
                                                    <div className="absolute top-6 right-8 w-4 h-1 bg-black/10 rounded-full animate-[swimAround_6s_infinite_linear]" />
                                                    <div className="absolute bottom-8 left-8 w-3 h-1 bg-black/10 rounded-full animate-[swimAround_8s_infinite_linear_reverse]" />
                                                </div>
                                                <span className="absolute -bottom-5 bg-black border-2 border-black text-white text-[8px] font-black px-1.5 py-0.5 rounded tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase z-20">
                                                    {b.name}
                                                </span>
                                            </div>
                                        )}
                                        {(b.id === "library" || b.type === "education") && (
                                            <div className="w-[150px] h-[170px] flex flex-col justify-center items-center relative select-none">
                                                <div className="w-[130px] h-0 border-l-[65px] border-l-transparent border-r-[65px] border-r-transparent border-b-[28px] border-b-amber-800 relative flex justify-center">
                                                    <div className="absolute top-[8px] text-[8px] font-black text-yellow-300 tracking-widest uppercase">
                                                        BIBLIO
                                                    </div>
                                                </div>
                                                <div className="w-[140px] h-[8px] bg-amber-900 border-x-4 border-b-4 border-black" />
                                                <div className="w-[120px] h-[85px] bg-amber-50 border-x-4 border-b-4 border-black flex justify-around items-end p-1 shadow-[5px_5px_0px_rgba(0,0,0,1)] relative">
                                                    <div className="w-3 h-full bg-amber-200 border-x-2 border-black" />
                                                    <div className="w-10 h-[50px] bg-amber-800 border-t-2 border-x-2 border-black rounded-t flex justify-around p-0.5 z-10">
                                                        <div className="w-3.5 h-full bg-amber-900 border-r border-black" />
                                                        <div className="w-3.5 h-full bg-amber-900 border-l border-black" />
                                                    </div>
                                                    <div className="w-3 h-full bg-amber-200 border-x-2 border-black" />
                                                    <div className="absolute top-2 left-1/2 -translate-x-1/2 text-lg z-10 animate-[bounce_2s_infinite]">
                                                        📚
                                                    </div>
                                                </div>
                                                <span className="absolute -bottom-5 bg-black border-2 border-black text-white text-[8px] font-black px-1.5 py-0.5 rounded tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase z-20">
                                                    {b.name}
                                                </span>
                                            </div>
                                        )}
                                        {(b.id === "store" || (b.type === "shop" && b.id !== "cafe" && b.id !== "boba" && b.tag !== "BOBA")) && (
                                            <div className="w-[140px] h-[160px] flex flex-col justify-center items-center relative select-none">
                                                <div className="bg-yellow-300 border-2 border-black px-2 py-0.5 rounded text-[8px] font-black text-black tracking-wider uppercase mb-1 shadow-[2px_2px_0px_rgba(0,0,0,1)] animate-pulse z-10">
                                                    🏪 24/7 MART
                                                </div>
                                                <div className="w-[110px] h-[20px] bg-gradient-to-r from-red-500 via-white to-green-500 border-4 border-black rounded-t-lg" />
                                                <div className="w-[100px] h-[70px] bg-slate-100 border-x-4 border-b-4 border-black flex justify-around items-end p-1 shadow-[5px_5px_0px_rgba(0,0,0,1)] relative">
                                                    <div className="w-[32px] h-[40px] bg-cyan-100 border-2 border-black rounded flex justify-center items-center">
                                                        <span className="text-xs">🍎</span>
                                                    </div>
                                                    <div className="w-[28px] h-[55px] bg-cyan-50 border-t-2 border-x-2 border-black rounded-t" />
                                                    <div className="w-[20px] h-[40px] bg-cyan-100 border-2 border-black rounded flex justify-center items-center">
                                                        <span className="text-xs">🥤</span>
                                                    </div>
                                                </div>
                                                <span className="absolute -bottom-5 bg-black border-2 border-black text-white text-[8px] font-black px-1.5 py-0.5 rounded tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase z-20">
                                                    {b.name}
                                                </span>
                                            </div>
                                        )}
                                        {(b.id === "boba" || b.tag === "BOBA") && (
                                            <div className="w-[140px] h-[180px] flex flex-col justify-center items-center relative select-none">
                                                <div className="w-[45px] h-[60px] bg-amber-100 border-4 border-black rounded-b-2xl rounded-t-md relative flex justify-center items-center mb-1 shrink-0">
                                                    <div className="absolute bottom-1.5 flex gap-0.5">
                                                        <div className="w-1.5 h-1.5 bg-black rounded-full" />
                                                        <div className="w-1.5 h-1.5 bg-black rounded-full" />
                                                        <div className="w-1.5 h-1.5 bg-black rounded-full" />
                                                    </div>
                                                    <div className="w-2.5 h-10 bg-pink-400 border-x-2 border-t-2 border-black -top-7 absolute rounded-t-sm" />
                                                    <span className="text-[7px] font-black text-amber-800">BOBA</span>
                                                </div>
                                                <div className="w-[110px] h-[16px] bg-pink-300 border-4 border-black rounded-t-xl" />
                                                <div className="w-[100px] h-[65px] bg-pink-50 border-x-4 border-b-4 border-black flex justify-around items-end p-1 shadow-[5px_5px_0px_rgba(0,0,0,1)] relative">
                                                    <div className="w-6 h-[40px] bg-amber-100 border-2 border-black rounded flex items-center justify-center text-xs">
                                                        🍵
                                                    </div>
                                                    <div className="w-6 h-[50px] bg-amber-700 border-t-2 border-x-2 border-black rounded-t" />
                                                </div>
                                                <span className="absolute -bottom-5 bg-black border-2 border-black text-white text-[8px] font-black px-1.5 py-0.5 rounded tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase z-20">
                                                    {b.name}
                                                </span>
                                            </div>
                                        )}
                                        {(b.id === "station" || b.type === "transit") && (
                                            <div className="w-[150px] h-[160px] flex flex-col justify-center items-center relative select-none">
                                                <div className="w-[120px] h-[40px] bg-zinc-500 border-4 border-black rounded-t-full relative flex justify-center">
                                                    <div className="absolute -top-7 w-7 h-7 bg-indigo-500 border-2 border-black rounded-full text-white text-[9px] flex items-center justify-center font-black animate-pulse shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                                                        M
                                                    </div>
                                                </div>
                                                <div className="w-[110px] h-[65px] bg-zinc-300 border-x-4 border-b-4 border-black flex justify-center items-end shadow-[5px_5px_0px_rgba(0,0,0,1)] relative">
                                                    <div className="w-[45px] h-[48px] bg-zinc-800 border-t-4 border-x-4 border-black rounded-t-full flex items-center justify-center relative overflow-hidden">
                                                        <div className="absolute top-1 text-[8px] text-yellow-300 font-bold tracking-wider">ENTRANCE</div>
                                                        <span className="text-lg translate-y-1">🚇</span>
                                                    </div>
                                                </div>
                                                <span className="absolute -bottom-5 bg-black border-2 border-black text-white text-[8px] font-black px-1.5 py-0.5 rounded tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase z-20">
                                                    {b.name}
                                                </span>
                                            </div>
                                        )}
                                        {(b.id === "hospital" || b.type === "hospital") && (
                                            <div className="w-[150px] h-[170px] flex flex-col justify-center items-center relative select-none">
                                                {/* Rooftop Red Cross Signboard */}
                                                <div className="w-[45px] h-[36px] bg-white border-4 border-black rounded-xl relative flex justify-center items-center mb-0.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] z-10 shrink-0 animate-pulse">
                                                    <span className="text-xl text-red-500 font-bold">➕</span>
                                                </div>
                                                {/* Red Roof */}
                                                <div className="w-[120px] h-[20px] bg-red-500 border-4 border-black rounded-t-xl" />
                                                {/* Clinic Body: White Clean Walls */}
                                                <div className="w-[110px] h-[80px] bg-white border-x-4 border-b-4 border-black flex justify-between items-end p-1.5 shadow-[5px_5px_0px_rgba(0,0,0,1)] relative">
                                                    {/* Left window */}
                                                    <div className={`w-[24px] h-[36px] border-2 border-black rounded flex items-center justify-center transition-colors duration-1000 ${
                                                        timeOfDay === "night"
                                                            ? "bg-yellow-200 shadow-[0_0_6px_rgba(253,224,71,0.8)]"
                                                            : "bg-cyan-100"
                                                    }`}>
                                                        <span className="text-[10px] text-slate-400">🏥</span>
                                                    </div>
                                                    
                                                    {/* Central Double Doors with Red Cross */}
                                                    <div className="w-[36px] h-[50px] bg-red-100 border-t-2 border-x-2 border-black rounded-t flex justify-center items-center relative z-10">
                                                        <span className="text-xs text-red-600 font-black animate-pulse">➕</span>
                                                    </div>

                                                    {/* Right window */}
                                                    <div className={`w-[24px] h-[36px] border-2 border-black rounded flex items-center justify-center transition-colors duration-1000 ${
                                                        timeOfDay === "night"
                                                            ? "bg-yellow-200 shadow-[0_0_6px_rgba(253,224,71,0.8)]"
                                                            : "bg-cyan-100"
                                                    }`}>
                                                        <span className="text-xs">🌡️</span>
                                                    </div>
                                                </div>
                                                {/* Base Naming Label */}
                                                <span className="absolute -bottom-5 bg-black border-2 border-black text-white text-[8px] font-black px-1.5 py-0.5 rounded tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase z-20">
                                                    {b.name}
                                                </span>
                                            </div>
                                        )}
                                        {b.imageUrl ? (
                                            <div className="w-[140px] h-[150px] flex flex-col justify-center items-center relative select-none">
                                                <div className="w-[100px] h-[85px] bg-white border-4 border-black rounded-t-2xl flex items-center justify-center p-1.5 shadow-[5px_5px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                                                    <img src={b.imageUrl} alt={b.name} className="max-h-full max-w-full object-contain rounded-md" />
                                                </div>
                                                <span className="absolute -bottom-5 bg-black border-2 border-black text-white text-[8px] font-black px-1.5 py-0.5 rounded tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase z-20">
                                                    {b.name}
                                                </span>
                                            </div>
                                        ) : (
                                            !["hq", "cafe", "gym", "plaza", "cinema", "arcade", "library", "store", "boba", "station", "lake", "mountain", "pond", "hospital"].includes(b.id) &&
                                            !["lake", "mountain", "pond", "shop", "education", "transit", "hospital"].includes(b.type) &&
                                            b.tag !== "BOBA" && (
                                                <div className="w-[140px] h-[150px] flex flex-col justify-center items-center relative select-none">
                                                    <div className="w-[100px] h-[75px] bg-sky-200 border-4 border-black rounded-t-2xl flex flex-col justify-center items-center p-1.5 shadow-[5px_5px_0px_rgba(0,0,0,1)] relative">
                                                        <div className="absolute -top-3 w-[110px] h-[14px] bg-indigo-500 border-4 border-black rounded-full" />
                                                        <span className="text-3xl animate-bounce mb-1">{b.emoji || "🏡"}</span>
                                                        <span className="text-[7px] font-black uppercase text-slate-700 bg-white border border-slate-300 px-1 py-0.5 rounded">
                                                            {b.tag || "BUILDING"}
                                                        </span>
                                                    </div>
                                                    <span className="absolute -bottom-5 bg-black border-2 border-black text-white text-[8px] font-black px-1.5 py-0.5 rounded tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase z-20">
                                                        {b.name}
                                                    </span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {zoom >= 0.40 && filteredContacts.map((c) => {
                    const worldLoc = getContactWorldLocation(c, buildings);
                    const simLoc = aiSimulationState[c.id];
                    const finalX = simLoc ? simLoc.x : worldLoc.x;
                    const finalY = simLoc ? simLoc.y : worldLoc.y;
                    const isSelected = selectedContact?.id === c.id;
                    const currentEnergy = c.energy !== undefined ? c.energy : 100;
                    const maxEnergy = c.maxEnergy !== undefined ? c.maxEnergy : 100;
                    const energyPct = Math.max(0, Math.min(100, (currentEnergy / maxEnergy) * 100));

                    // Transit visibility logic
                    const isEntering = simLoc?.transitStatus === 'entering';
                    const isExiting = simLoc?.transitStatus === 'exiting';
                    const isTransit = isEntering || isExiting;
                    const isHidden = isEntering || (isExiting && simLoc && simLoc.transitTimer && simLoc.transitTimer > 7);

                    const scale = isHidden ? 0.5 : 1;

                    return (
                        <div
                            key={c.id}
                            className={`absolute ${isHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                            style={{
                                left: 0,
                                top: 0,
                                transform: `translate3d(${finalX}px, ${finalY}px, 0) translate(-50%, -50%) scale(${scale})`,
                                zIndex: hoveredContactId === c.id ? 50 : 20,
                                transition: isTransit 
                                   ? "opacity 0.6s ease, transform 0.6s ease" 
                                   : "transform 0.1s linear, opacity 0.4s ease"
                            }}
                            onMouseEnter={() => {
                                setHoveredContactId(c.id);
                                if (synthRef.current?.playAnimal) {
                                    synthRef.current.playAnimal(c.species, c.id);
                                }
                            }}
                            onMouseLeave={() => setHoveredContactId(null)}
                        >
                            {simLoc?.chatBubble && (
                                <div className="absolute bottom-full left-1/2 mb-4 pointer-events-none transform -translate-x-1/2">
                                    <div className="bg-white border-2 border-black rounded-2xl px-3 py-1.5 text-[10px] font-bold text-slate-800 shadow-[3px_3px_0px_rgba(0,0,0,1)] whitespace-normal break-words max-w-[140px] text-center leading-tight">
                                        {simLoc.chatBubble}
                                    </div>
                                    <div
                                        className="w-0 h-0 mx-auto"
                                        style={{
                                            borderLeft: "5px solid transparent",
                                            borderRight: "5px solid transparent",
                                            borderTop: "5px solid black"
                                        }}
                                    />
                                </div>
                            )}
                            {hoveredContactId === c.id && !simLoc?.chatBubble && (
                                <div className="absolute bottom-full left-1/2 mb-4 pointer-events-none transform -translate-x-1/2">
                                    <div className="bg-slate-900/95 backdrop-blur text-white rounded-xl px-3 py-2 shadow-2xl text-[11px] leading-snug min-w-[140px] text-center border border-slate-600 whitespace-nowrap">
                                        <div className="font-black text-yellow-300 text-sm leading-none">{c.name}</div>
                                        <div className="text-slate-400 text-[9px] mt-0.5">{c.species}</div>
                                        {simLoc && (
                                            <div
                                                className={`mt-1.5 text-[10px] font-semibold flex items-center justify-center gap-1 ${
                                                    simLoc.state === "walking"
                                                        ? "text-green-400"
                                                        : simLoc.state === "socializing"
                                                        ? simLoc.socialPartnerId
                                                            ? "text-red-400"
                                                            : "text-pink-400"
                                                        : "text-blue-300"
                                                }`}
                                            >
                                                <span>
                                                    {simLoc.state === "walking"
                                                        ? "🚶"
                                                        : simLoc.state === "socializing"
                                                        ? simLoc.socialPartnerId
                                                            ? "❤️"
                                                            : "💬"
                                                        : "😌"}
                                                </span>
                                                <span>{simLoc.currentAction}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div
                                        className="w-0 h-0 mx-auto"
                                        style={{
                                            borderLeft: "5px solid transparent",
                                            borderRight: "5px solid transparent",
                                            borderTop: "5px solid #1e293b"
                                        }}
                                    />
                                </div>
                            )}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-9 h-2 bg-slate-200 border border-black rounded-full overflow-hidden flex">
                                <div
                                    className={`h-full transition-all duration-300 ${
                                        energyPct > 50 ? "bg-emerald-500" : energyPct > 20 ? "bg-amber-500" : "bg-rose-500"
                                    }`}
                                    style={{ width: `${energyPct}%` }}
                                />
                            </div>

                            {activeCommand && activeCommand.phase !== 'done' && activeCommand.phase !== 'cancelled' && activeCommand.executorId === c.id && (
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-bounce text-xl select-none z-30">
                                    ▼
                                </div>
                            )}

                            <button
                                onClick={() => handleSelectContact(c)}
                                className={`w-12 h-12 rounded-full border-3 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] flex items-center justify-center cursor-pointer relative ${
                                    c.color || "bg-white"
                                } ${isSelected ? "ring-4 ring-yellow-400 scale-125 animate-bounce" : "hover:scale-110"} ${
                                    activeCommand && activeCommand.phase === 'interacting' && activeCommand.type === 'fight' && (activeCommand.executorId === c.id || activeCommand.targetId === c.id)
                                        ? "command-shake"
                                        : ""
                                }`}
                            >
                                <img src={c.avatarUrl} alt={c.name} className="w-10 h-10 rounded-full object-cover pointer-events-none" />
                                <div
                                    className={`absolute -top-1 -right-1 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-white leading-none ${
                                        simLoc?.state === "walking"
                                            ? "bg-green-600"
                                            : simLoc?.state === "socializing"
                                            ? simLoc?.socialPartnerId
                                                ? "bg-red-500"
                                                : "bg-pink-500"
                                            : "bg-black"
                                    }`}
                                >
                                    {simLoc?.state === "walking"
                                        ? "🚶"
                                        : simLoc?.state === "socializing"
                                        ? simLoc?.socialPartnerId
                                            ? "❤️"
                                            : "💬"
                                        : worldLoc.icon}
                                </div>
                                {weather === "rainy" && (
                                    <div className="absolute -bottom-1 -left-1 bg-blue-500 border border-white text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center shadow-[1px_1px_0px_rgba(0,0,0,1)] z-10 animate-bounce">
                                        ☂️
                                    </div>
                                )}
                            </button>
                        </div>
                    );
                })}

                {/* Active Command Interactive Effects */}
                {activeCommand && activeCommand.phase === 'interacting' && (() => {
                    const simE = aiSimulationState[activeCommand.executorId];
                    if (!simE) return null;

                    let targetX = 0;
                    let targetY = 0;

                    if (activeCommand.type === 'goto' && activeCommand.buildingId) {
                        const bTarget = buildings.find(b => b.id === activeCommand.buildingId);
                        if (bTarget) {
                            targetX = bTarget.x;
                            targetY = bTarget.y - 40;
                        }
                    } else if (activeCommand.targetId) {
                        const simT = aiSimulationState[activeCommand.targetId];
                        if (simT) {
                            targetX = simT.x;
                            targetY = simT.y;
                        }
                    }

                    if (!targetX && !targetY) return null;

                    const midX = (simE.x + targetX) / 2;
                    const midY = (simE.y + targetY) / 2 - 10; // slightly offset upward

                    if (activeCommand.type === 'fight') {
                        // Render fight particles: 💥 ⚡ 🥊 💢 💨
                        return (
                            <>
                                <div className="fight-sparkle" style={{ left: midX - 10, top: midY - 10, animationDelay: '0s' }}>💥</div>
                                <div className="fight-sparkle" style={{ left: midX + 15, top: midY - 5, animationDelay: '0.15s' }}>🥊</div>
                                <div className="fight-sparkle" style={{ left: midX - 5, top: midY + 15, animationDelay: '0.3s' }}>⚡</div>
                                <div className="fight-sparkle" style={{ left: midX + 10, top: midY + 10, animationDelay: '0.45s' }}>💨</div>
                            </>
                        );
                    } else if (activeCommand.type === 'date') {
                        // Render floating hearts: ❤️ 💕 💖 🌸
                        return (
                            <>
                                <div className="date-heart" style={{ left: midX - 15, top: midY, animationDelay: '0s' }}>❤️</div>
                                <div className="date-heart" style={{ left: midX + 10, top: midY - 10, animationDelay: '0.3s' }}>💕</div>
                                <div className="date-heart" style={{ left: midX, top: midY + 10, animationDelay: '0.6s' }}>💖</div>
                                <div className="date-heart" style={{ left: midX - 8, top: midY - 15, animationDelay: '0.9s' }}>🌸</div>
                            </>
                        );
                    } else if (activeCommand.type === 'chat') {
                        return (
                            <>
                                <div className="date-heart" style={{ left: midX, top: midY - 20, animationDelay: '0s', fontSize: '16px' }}>💬</div>
                                <div className="date-heart" style={{ left: midX - 10, top: midY - 10, animationDelay: '0.5s', fontSize: '14px' }}>✨</div>
                            </>
                        );
                    } else if (activeCommand.type === 'goto') {
                        return (
                            <div className="absolute pointer-events-none" style={{ left: targetX, top: targetY, transform: 'translate(-50%, -50%)', zIndex: 45 }}>
                                <div className="date-heart" style={{ left: 0, top: 0, animationDelay: '0s', fontSize: '24px' }}>🔍</div>
                                <div className="building-ripple-ring" style={{ width: '120px', height: '120px', left: '-60px', top: '-60px' }} />
                            </div>
                        );
                    }
                    return null;
                })()}
            </div>

            <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-500 z-15"
                style={{
                    background: `radial-gradient(circle 460px at 50% 50%, transparent 22%, rgba(255, 255, 255, ${fogOpacity * 0.9}) 62%, rgba(255, 255, 255, ${Math.min(0.99, fogOpacity + 0.12)}) 95%)`,
                    opacity: showFog || weather === "foggy" ? 1 : 0
                }}
            />

            {weather !== "sunny" && (
                <div className="absolute inset-0 pointer-events-none z-25 overflow-hidden select-none">
                    {weather === "rainy" &&
                        Array.from({ length: 40 }).map((_, i) => {
                            const left = `${Math.random() * 100}%`;
                            const delay = `${Math.random() * 2}s`;
                            const duration = `${0.5 + Math.random() * 0.8}s`;
                            const opacity = 0.3 + Math.random() * 0.5;
                            const height = `${30 + Math.random() * 30}px`;
                            return (
                                <div
                                    key={i}
                                    className="absolute bg-blue-400 w-[2px]"
                                    style={{
                                        left,
                                        top: "-60px",
                                        height,
                                        opacity,
                                        animation: `fallRain ${duration} linear infinite`,
                                        animationDelay: delay
                                    }}
                                />
                            );
                        })}
                    {weather === "snowy" &&
                        Array.from({ length: 30 }).map((_, i) => {
                            const left = `${Math.random() * 100}%`;
                            const delay = `${Math.random() * 4}s`;
                            const duration = `${2 + Math.random() * 3}s`;
                            const size = `${4 + Math.random() * 6}px`;
                            const opacity = 0.5 + Math.random() * 0.4;
                            return (
                                <div
                                    key={i}
                                    className="absolute bg-white rounded-full border border-black/10"
                                    style={{
                                        left,
                                        top: "-20px",
                                        width: size,
                                        height: size,
                                        opacity,
                                        animation: `driftSnow ${duration} linear infinite`,
                                        animationDelay: delay
                                    }}
                                />
                            );
                        })}
                    {weather === "windy" &&
                        Array.from({ length: 15 }).map((_, i) => {
                            const top = `${Math.random() * 100}%`;
                            const delay = `${Math.random() * 3}s`;
                            const duration = `${1.5 + Math.random() * 2}s`;
                            const width = `${100 + Math.random() * 150}px`;
                            const opacity = 0.15 + Math.random() * 0.25;
                            return (
                                <div
                                    key={i}
                                    className="absolute bg-white/40 h-[1.5px] border-t border-slate-300/30"
                                    style={{
                                        top,
                                        left: "-200px",
                                        width,
                                        opacity,
                                        animation: `blowWind ${duration} linear infinite`,
                                        animationDelay: delay
                                    }}
                                />
                            );
                        })}
                    {weather === "foggy" &&
                        Array.from({ length: 8 }).map((_, i) => {
                            const top = `${10 + Math.random() * 80}%`;
                            const delay = `${Math.random() * 5}s`;
                            const duration = `${8 + Math.random() * 10}s`;
                            const size = `${200 + Math.random() * 200}px`;
                            const opacity = 0.1 + Math.random() * 0.15;
                            return (
                                <div
                                    key={i}
                                    className="absolute bg-white/60 blur-[30px] rounded-full"
                                    style={{
                                        top,
                                        left: "-300px",
                                        width: size,
                                        height: `${parseFloat(size) * 0.4}px`,
                                        opacity,
                                        animation: `driftFog ${duration} linear infinite`,
                                        animationDelay: delay
                                    }}
                                />
                            );
                        })}
                </div>
            )}

            <div
                className="absolute inset-0 pointer-events-none transition-colors duration-1000"
                style={{
                    zIndex: 25,
                    backgroundColor:
                        timeOfDay === "morning"
                            ? "rgba(253, 224, 71, 0.05)"
                            : timeOfDay === "afternoon"
                            ? "rgba(0, 0, 0, 0)"
                            : timeOfDay === "evening"
                            ? "rgba(244, 63, 94, 0.12)"
                            : "rgba(15, 23, 42, 0.42)"
                }}
            />

            <div
                onMouseDown={(e) => e.stopPropagation()}
                onMouseMove={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="absolute top-4 left-4 z-30 flex flex-row items-start gap-3 pointer-events-none"
            >
                <div className="flex flex-col gap-3 pointer-events-none">
                    <div className="w-52 bg-white border-4 border-black p-3 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] select-none text-slate-800 pointer-events-auto">
                        <div className="flex items-center gap-1.5 border-b-2 border-black pb-1.5 mb-2">
                            <span className="text-base">🌈</span>
                            <span className="text-[10px] font-black tracking-widest uppercase text-slate-700">WEATHER STATION</span>
                        </div>
                        <div className="flex items-center justify-between bg-slate-50 border-2 border-black p-2 rounded-xl mb-2.5 shadow-[2px_2px_0px_rgba(0,0,0,0.15)]">
                            <div className="flex flex-col">
                                <span className="text-xs font-black capitalize">
                                    {weather === "sunny"
                                        ? "Sunny ☀️"
                                        : weather === "rainy"
                                        ? "Rainy 🌧️"
                                        : weather === "snowy"
                                        ? "Snowy ❄️"
                                        : weather === "windy"
                                        ? "Windy 💨"
                                        : "Foggy 🌫️"}
                                </span>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">OUTDOORS</span>
                            </div>
                            <div className="text-lg font-black bg-yellow-200 border-2 border-black px-2 py-0.5 rounded-lg shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                                {temperature}°C
                            </div>
                        </div>
                        <div className="grid grid-cols-5 gap-1 mb-2.5">
                            {[
                                { id: "sunny", emoji: "☀️", bg: "bg-amber-300 hover:bg-amber-400", label: "Sunny" },
                                { id: "rainy", emoji: "🌧️", bg: "bg-blue-300 hover:bg-blue-400", label: "Rainy" },
                                { id: "snowy", emoji: "❄️", bg: "bg-sky-200 hover:bg-sky-300", label: "Snowy" },
                                { id: "windy", emoji: "💨", bg: "bg-teal-200 hover:bg-teal-300", label: "Windy" },
                                { id: "foggy", emoji: "🌫️", bg: "bg-slate-300 hover:bg-slate-400", label: "Foggy" }
                            ].map((wOpt) => (
                                <button
                                    key={wOpt.id}
                                    onClick={() => {
                                        setWeather(wOpt.id);
                                        setIsWeatherAuto(false);
                                        let nextTemp = 24;
                                        if (wOpt.id === "sunny") nextTemp = 26 + Math.floor(Math.random() * 8);
                                        else if (wOpt.id === "rainy") nextTemp = 16 + Math.floor(Math.random() * 6);
                                        else if (wOpt.id === "snowy") nextTemp = -4 + Math.floor(Math.random() * 6);
                                        else if (wOpt.id === "windy") nextTemp = 12 + Math.floor(Math.random() * 6);
                                        else if (wOpt.id === "foggy") nextTemp = 8 + Math.floor(Math.random() * 6);
                                        setTemperature(nextTemp);
                                    }}
                                    className={`h-8 rounded-lg border-2 border-black flex items-center justify-center text-sm font-black transition-all active:translate-y-0.5 shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] ${
                                        weather === wOpt.id
                                            ? `${wOpt.bg} scale-110 ring-2 ring-yellow-400 ring-offset-1`
                                            : "bg-white hover:bg-slate-100"
                                    }`}
                                    title={wOpt.label}
                                >
                                    {wOpt.emoji}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setIsWeatherAuto((prev) => !prev)}
                            className={`w-full py-1.5 rounded-xl border-2 border-black text-[9px] font-black uppercase tracking-wider transition-all active:translate-y-0.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] ${
                                isWeatherAuto
                                    ? "bg-emerald-300 hover:bg-emerald-400 text-emerald-950"
                                    : "bg-slate-200 hover:bg-slate-300 text-slate-600"
                            }`}
                        >
                            {isWeatherAuto ? "Auto Cycle: ON 🔄" : "Auto Cycle: OFF ⏸️"}
                        </button>
                    </div>

                    <div className="w-52 bg-white border-4 border-black p-3 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] select-none text-slate-800 pointer-events-auto flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 border-b-2 border-black pb-1.5 mb-0.5">
                            <span className="text-base">📊</span>
                            <span className="text-[10px] font-black tracking-widest uppercase text-slate-700">
                                {isChinese ? "世界概览" : "WORLD OVERVIEW"}
                            </span>
                        </div>
                        
                        {/* 1. Total Content Count */}
                        <div className="flex flex-col gap-0.5 bg-slate-50 border-2 border-black p-2 rounded-xl shadow-[2px_2px_0px_rgba(0,0,0,0.15)]">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                                {isChinese ? "内容总产出" : "TOTAL OUTPUTS"}
                            </span>
                            <span className="text-xs font-black">
                                {stats?.totalContents ?? 0} {isChinese ? "个" : "items"}
                            </span>
                        </div>

                        {/* 2. Most Liked Content */}
                        <div className="flex flex-col gap-0.5 bg-slate-50 border-2 border-black p-2 rounded-xl shadow-[2px_2px_0px_rgba(0,0,0,0.15)]">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                                {isChinese ? "最受欢迎内容" : "TOP CONTENT"}
                            </span>
                            {stats?.mostLikedContent ? (
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] line-clamp-2 italic font-bold">
                                        "{stats.mostLikedContent.markdown}"
                                    </span>
                                    <span className="text-[9px] text-slate-500 font-semibold leading-tight">
                                        👤 {stats.mostLikedContent.authorName || (isChinese ? "未知" : "Unknown")} | 🏢 {mostLikedContentBuildingName || (isChinese ? "建筑" : "Building")}
                                    </span>
                                    <span className="text-[9px] text-amber-600 font-black">
                                        ❤️ {stats.mostLikedContent.likes} {isChinese ? "点赞" : "likes"}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-[10px] text-slate-400 font-medium">
                                    {isChinese ? "暂无数据" : "No data"}
                                </span>
                            )}
                        </div>

                        {/* 3. Most Popular Character */}
                        <div className="flex flex-col gap-0.5 bg-slate-50 border-2 border-black p-2 rounded-xl shadow-[2px_2px_0px_rgba(0,0,0,0.15)]">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                                {isChinese ? "最受欢迎角色" : "TOP CHARACTER"}
                            </span>
                            {stats?.mostLikedCharacter ? (
                                <div className="flex items-center gap-1.5">
                                    {stats.mostLikedCharacter.authorAvatar && (
                                        <img 
                                            src={stats.mostLikedCharacter.authorAvatar} 
                                            className="w-5 h-5 object-contain" 
                                            alt=""
                                        />
                                    )}
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold leading-tight">
                                            {stats.mostLikedCharacter.authorName || (isChinese ? "未知" : "Unknown")}
                                        </span>
                                        <span className="text-[9px] text-rose-500 font-black">
                                            ❤️ {stats.mostLikedCharacter.totalLikes} {isChinese ? "总点赞" : "likes"}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <span className="text-[10px] text-slate-400 font-medium">
                                    {isChinese ? "暂无数据" : "No data"}
                                </span>
                            )}
                        </div>

                        {/* 4. Most Popular Building */}
                        <div className="flex flex-col gap-0.5 bg-slate-50 border-2 border-black p-2 rounded-xl shadow-[2px_2px_0px_rgba(0,0,0,0.15)]">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                                {isChinese ? "最受欢迎建筑" : "TOP BUILDING"}
                            </span>
                            {topVisitedBuilding ? (
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold leading-tight">
                                        {topVisitedBuilding.emoji} {topVisitedBuilding.name}
                                    </span>
                                    <span className="text-[9px] text-emerald-600 font-black">
                                        🚶 {topVisitedBuilding.visits} {isChinese ? "次拜访" : "visits"}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-[10px] text-slate-400 font-medium">
                                    {isChinese ? "暂无数据" : "No data"}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 pointer-events-none">
                    <div
                        className="w-16 h-16 bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] select-none pointer-events-auto flex items-center justify-center relative overflow-hidden transition-all hover:scale-105 cursor-pointer"
                        title={
                            timeOfDay === "night" || timeOfDay === "evening"
                                ? isChinese
                                    ? "夜晚"
                                    : "Night"
                                : isChinese
                                ? "白天"
                                : "Day"
                        }
                    >
                        <div
                            className={`absolute inset-0 transition-opacity duration-1000 ${
                                timeOfDay === "night" || timeOfDay === "evening"
                                    ? "bg-gradient-to-br from-slate-900 to-indigo-950 opacity-100"
                                    : "bg-gradient-to-br from-sky-400 to-blue-300 opacity-100"
                            }`}
                        />
                        {timeOfDay === "night" || timeOfDay === "evening" ? (
                            <div className="absolute inset-0 opacity-40 pointer-events-none">
                                <span className="absolute text-[6px] text-white top-1 left-2 animate-pulse">⭐</span>
                                <span className="absolute text-[8px] text-white top-3 right-3 animate-pulse delay-75">⭐</span>
                                <span className="absolute text-[5px] text-white bottom-2 left-4 animate-pulse delay-150">⭐</span>
                            </div>
                        ) : (
                            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle,white_10%,transparent_10%)] bg-[size:10px_10px]" />
                        )}
                        <span className="text-3xl z-10 filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)] animate-bounce">
                            {timeOfDay === "night" || timeOfDay === "evening" ? "🌙" : "☀️"}
                        </span>
                    </div>

                    <div
                        className="w-16 h-16 bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] select-none pointer-events-auto flex items-center justify-center relative overflow-hidden transition-all hover:scale-110 active:scale-95 cursor-pointer group"
                        onClick={handleOpenNews}
                        title={isChinese ? "卡通世界报纸" : "Toon World Gazette"}
                    >
                        <div className="absolute inset-0 bg-[#fdf6e3] group-hover:bg-amber-50 transition-colors" />
                        
                        {/* Custom Newspaper Icon */}
                        <div className="relative z-10 flex flex-col items-center justify-center scale-90 group-hover:scale-100 transition-transform">
                            <div className="w-10 h-12 bg-white border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] flex flex-col p-0.5 relative rotate-[-5deg] group-hover:rotate-0 transition-transform">
                                {/* Newspaper Header */}
                                <div className="w-full bg-black h-3 flex items-center justify-center mb-1">
                                    <span className="text-[6px] font-black text-white tracking-tighter scale-90">NEWS</span>
                                </div>
                                {/* News Content Lines */}
                                <div className="flex flex-col gap-0.5 px-0.5">
                                    <div className="w-full h-0.5 bg-slate-300" />
                                    <div className="flex gap-0.5">
                                        <div className="w-1/3 h-2 bg-slate-200" />
                                        <div className="flex-1 flex flex-col gap-0.5">
                                            <div className="w-full h-0.5 bg-slate-300" />
                                            <div className="w-full h-0.5 bg-slate-300" />
                                        </div>
                                    </div>
                                    <div className="w-full h-0.5 bg-slate-300" />
                                    <div className="w-4/5 h-0.5 bg-slate-300" />
                                </div>
                                {/* Fold Detail */}
                                <div className="absolute -right-[2px] bottom-1 w-1.5 h-4 bg-slate-100 border-l border-black/20" />
                            </div>
                            {/* Secondary stacked paper */}
                            <div className="absolute w-10 h-12 bg-white border-2 border-black -z-10 translate-x-1 translate-y-1 rotate-[3deg] group-hover:rotate-6 transition-transform" />
                        </div>

                        {/* Red Dot Badge for "Hot" events */}
                        <div className="absolute top-2 right-2 bg-rose-500 w-2.5 h-2.5 rounded-full border-2 border-black animate-pulse z-20" />
                    </div>
                </div>
            </div>

            {/* Real-time Breaking News Ticker */}
            {showAlert && latestAlert && (
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[60] w-[90%] max-w-2xl animate-in slide-in-from-bottom-10 duration-500">
                    <div className="bg-rose-600 border-4 border-black p-3 shadow-[8px_8px_0px_rgba(0,0,0,1)] flex items-center gap-4 group cursor-pointer hover:scale-105 transition-all"
                         onClick={handleOpenNews}>
                        <div className="bg-white border-2 border-black px-3 py-1 font-black text-xs animate-pulse rotate-[-2deg] shrink-0">
                            {isChinese ? "突发新闻" : "BREAKING NEWS"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-black text-sm uppercase truncate">
                                {latestAlert.type === 'QUARREL' ? '💢 ' : latestAlert.type === 'FIGHT' ? '🥊 ' : '🗞️ '}
                                {latestAlert.metadata.reason || latestAlert.metadata.buildingName || 'Something happened!'}
                            </p>
                        </div>
                        <div className="text-white/50 text-[10px] font-black uppercase hidden md:block">
                            {isChinese ? "点击查看报纸 →" : "TAP FOR GAZETTE →"}
                        </div>
                    </div>
                </div>
            )}

            <style
                dangerouslySetInnerHTML={{
                    __html: `
              @keyframes slideIn {
                from { transform: translate3d(120%, 0, 0); opacity: 0; }
                to { transform: translate3d(0, 0, 0); opacity: 1; }
              }
              @keyframes fallRain {
                0% { transform: translateY(-50px) translateX(0); }
                100% { transform: translateY(110vh) translateX(-20px); }
              }
              @keyframes driftSnow {
                0% { transform: translateY(-20px) translateX(0) rotate(0deg); }
                50% { transform: translateY(50vh) translateX(30px) rotate(180deg); }
                100% { transform: translateY(110vh) translateX(0px) rotate(360deg); }
              }
              @keyframes blowWind {
                0% { transform: translateX(0) skewX(-20deg); }
                100% { transform: translateX(120vw) skewX(-20deg); }
              }
              @keyframes driftFog {
                0% { transform: translateX(0); }
                100% { transform: translateX(120vw); }
              }
              @keyframes jumpFish {
                0%, 100% { transform: translateY(0) scale(0); opacity: 0; }
                10% { transform: translateY(0) scale(1); opacity: 1; }
                40% { transform: translateY(-30px) rotate(-15deg); }
                60% { transform: translateY(-30px) rotate(15deg); }
                90% { transform: translateY(0) scale(1); opacity: 1; }
                95% { transform: translateY(0) scale(0); opacity: 0; }
              }
              @keyframes drift {
                0%, 100% { transform: translateX(0) translateY(0) rotate(0deg); }
                50% { transform: translateX(6px) translateY(2px) rotate(2deg); }
              }
              @keyframes floatCloud {
                0%, 100% { transform: translateX(0) translateY(0); }
                50% { transform: translateX(15px) translateY(-4px); }
              }
              @keyframes swimAround {
                0%, 100% { transform: translateX(-15px); }
                50% { transform: translateX(15px); }
              }
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes buildingRipple {
                0% { transform: scale(0.95); opacity: 0.9; }
                100% { transform: scale(1.35); opacity: 0; }
              }
              .building-ripple-ring {
                position: absolute;
                inset: 0;
                border: 4px solid #ef4444;
                border-radius: 28px;
                pointer-events: none;
                animation: buildingRipple 2.2s cubic-bezier(0.25, 1, 0.5, 1) infinite;
              }
              @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
              }
              @keyframes shake {
                0%, 100% { transform: translate(0, 0) rotate(0deg); }
                10% { transform: translate(-3px, -2px) rotate(-1deg); }
                20% { transform: translate(-1px, 2px) rotate(1deg); }
                30% { transform: translate(2px, 1px) rotate(0deg); }
                40% { transform: translate(-1px, -1px) rotate(1deg); }
                50% { transform: translate(3px, 1px) rotate(-1deg); }
                60% { transform: translate(-2px, -2px) rotate(0deg); }
                70% { transform: translate(2px, 1px) rotate(-1deg); }
                80% { transform: translate(-1px, -1px) rotate(1deg); }
                90% { transform: translate(1px, 2px) rotate(0deg); }
              }
              .command-shake {
                animation: shake 0.15s infinite !important;
              }
              @keyframes burstFight {
                0% { transform: scale(0.5) translate(-50%, -50%); opacity: 0; }
                50% { opacity: 1; }
                100% { transform: scale(1.6) translate(-50%, -50%); opacity: 0; }
              }
              .fight-sparkle {
                position: absolute;
                pointer-events: none;
                animation: burstFight 0.6s ease-out infinite;
                font-size: 28px;
                z-index: 45;
              }
              @keyframes floatHeart {
                0% { transform: translateY(0px) scale(0.6) translate(-50%, -50%); opacity: 0; }
                20% { opacity: 1; }
                100% { transform: translateY(-45px) scale(1.3) translate(-50%, -50%); opacity: 0; }
              }
              .date-heart {
                position: absolute;
                pointer-events: none;
                animation: floatHeart 1.5s ease-out infinite;
                font-size: 20px;
                z-index: 45;
              }
            `
                }}
            />
        </div>
    );
};
