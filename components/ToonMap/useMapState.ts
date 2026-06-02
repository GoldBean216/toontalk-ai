import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Contact } from '../../types';
import { DEFAULT_BUILDINGS, DEFAULT_STREETS } from './constants';
import { MapBuilding, Street } from './types';
import { localChatDB } from '../../lib/local-db';

interface MapStateProps {
    contacts: Contact[];
    user: any;
    language: string;
}

const loadAndSeedBuildings = (key: string): MapBuilding[] => {
    if (typeof window === "undefined") return DEFAULT_BUILDINGS;
    try {
        const saved = localStorage.getItem(key);
        if (saved) {
            const parsed = JSON.parse(saved);
            
            // Delete old unlinked station if present
            let updated = parsed.filter((b: any) => b.id !== "station");
            let needsWrite = parsed.length !== updated.length;
            
            const requiredIds = ["lake", "mountain", "pond", "hospital", "station_a", "station_b"];
            for (const reqId of requiredIds) {
                if (!updated.some((b) => b.id === reqId)) {
                    const defB = DEFAULT_BUILDINGS.find((b) => b.id === reqId);
                    if (defB) {
                        updated.push(defB);
                        needsWrite = true;
                    }
                }
            }
            if (needsWrite) {
                localStorage.setItem(key, JSON.stringify(updated));
            }
            return updated;
        }
        return DEFAULT_BUILDINGS;
    } catch {
        return DEFAULT_BUILDINGS;
    }
};

export function useMapState({ contacts, user, language }: MapStateProps) {
    const userId = user?.id;
    const buildingsKey = userId ? `toon_map_buildings_${userId}` : "toon_map_buildings";
    const streetsKey = userId ? `toon_map_streets_${userId}` : "toon_map_streets";
    const customNameKey = userId ? `toon_map_custom_name_${userId}` : "toon_map_custom_name";

    // 1. Buildings state loaded from localStorage or defaults
    const [buildings, setBuildings] = useState<MapBuilding[]>(() => {
        return loadAndSeedBuildings(buildingsKey);
    });

    // Auto-save buildings to localStorage on change
    useEffect(() => {
        if (typeof window !== 'undefined' && buildings && buildings.length > 0) {
            localStorage.setItem(buildingsKey, JSON.stringify(buildings));
        }
    }, [buildings, buildingsKey]);

    // Load buildings from IndexedDB on mount or when userId changes
    useEffect(() => {
        const loadFromIDB = async () => {
            if (!userId) return;
            try {
                const idbBuildings = await localChatDB.getBuildings(userId);
                if (idbBuildings && idbBuildings.length > 0) {
                    setBuildings(prev => {
                        // Merge IDB buildings with current state, IDB takes precedence
                        const merged = [...prev];
                        idbBuildings.forEach(idbB => {
                            const idx = merged.findIndex(b => b.id === idbB.id);
                            if (idx !== -1) {
                                merged[idx] = { ...merged[idx], ...idbB };
                            } else {
                                merged.push(idbB);
                            }
                        });
                        return merged;
                    });
                }
            } catch (err) {
                console.error("Failed to load buildings from IndexedDB:", err);
            }
        };
        loadFromIDB();
    }, [userId]);

    // 2. Streets state loaded from localStorage or defaults
    const [streets, setStreets] = useState<Street[]>(() => {
        try {
            if (typeof window !== "undefined") {
                const saved = localStorage.getItem(streetsKey);
                return saved ? JSON.parse(saved) : DEFAULT_STREETS;
            }
        } catch {
            return DEFAULT_STREETS;
        }
        return DEFAULT_STREETS;
    });

    // Auto-save streets on change
    useEffect(() => {
        if (typeof window !== 'undefined' && streets && streets.length > 0) {
            localStorage.setItem(streetsKey, JSON.stringify(streets));
        }
    }, [streets, streetsKey]);

    // Reactive reloader when user changes
    useEffect(() => {
        if (!userId) return;

        const loadedBuildings = loadAndSeedBuildings(`toon_map_buildings_${userId}`);
        setBuildings(loadedBuildings);

        let loadedStreets = DEFAULT_STREETS;
        try {
            const saved = localStorage.getItem(`toon_map_streets_${userId}`);
            if (saved) {
                loadedStreets = JSON.parse(saved);
            }
        } catch {}
        setStreets(loadedStreets);

        let loadedName = "";
        try {
            loadedName = localStorage.getItem(`toon_map_custom_name_${userId}`) || "";
        } catch {}
        setCustomMapName(loadedName);

        let loadedVisits = {
            "cafe": 18,
            "plaza": 25,
            "park": 15,
            "gym": 10,
            "library": 8,
            "cinema": 12,
            "hospital": 5,
            "station_a": 14,
            "station_b": 11
        };
        try {
            const saved = localStorage.getItem(`toon_map_building_visits_${userId}`);
            if (saved) {
                loadedVisits = JSON.parse(saved);
            }
        } catch {}
        setBuildingVisits(loadedVisits);
    }, [userId]);

    // Fetch initial config from backend only if local storage is empty
    useEffect(() => {
        if (!userId) return;
        const hasLocalBuildings = localStorage.getItem(buildingsKey);
        const hasLocalStreets = localStorage.getItem(streetsKey);
        
        if (hasLocalBuildings || hasLocalStreets) {
            console.log("[useMapState] Local state found, skipping backend config fetch.");
            return;
        }

        fetch("/api/map-config")
            .then((res) => {
                if (res.ok) return res.json();
                throw new Error("Config not found or error");
            })
            .then((data) => {
                if (data && data.buildings && data.streets) {
                    console.log("[useMapState] No local state, loading from backend config.");
                    setBuildings(data.buildings);
                    setStreets(data.streets);
                }
            })
            .catch(() => {
                console.log("Using default map config.");
            });
    }, [userId, buildingsKey, streetsKey]);

    // 3. Weather System States
    const [weather, setWeather] = useState("sunny");
    const [isWeatherAuto, setIsWeatherAuto] = useState(true);
    const [temperature, setTemperature] = useState(24);
    const weatherRef = useRef("sunny");

    useEffect(() => {
        weatherRef.current = weather;
    }, [weather]);

    // Weather Auto-Cycle Effect
    useEffect(() => {
        if (!isWeatherAuto) return;
        const weathers = ["sunny", "rainy", "snowy", "windy", "foggy"];
        const interval = setInterval(() => {
            setWeather((current) => {
                const nextIndex = (weathers.indexOf(current) + 1) % weathers.length;
                const nextWeather = weathers[nextIndex];
                let nextTemp = 24;
                if (nextWeather === "sunny") nextTemp = 26 + Math.floor(Math.random() * 8);
                else if (nextWeather === "rainy") nextTemp = 16 + Math.floor(Math.random() * 6);
                else if (nextWeather === "snowy") nextTemp = -4 + Math.floor(Math.random() * 6);
                else if (nextWeather === "windy") nextTemp = 12 + Math.floor(Math.random() * 6);
                else if (nextWeather === "foggy") nextTemp = 8 + Math.floor(Math.random() * 6);
                setTemperature(nextTemp);
                return nextWeather;
            });
        }, 45000);
        return () => clearInterval(interval);
    }, [isWeatherAuto]);

    // 4. Game Time System States
    const [gameHour, setGameHour] = useState(8);
    const [gameMinute, setGameMinute] = useState(0);
    const [gameDay, setGameDay] = useState(1);
    const [timeSpeed, setTimeSpeed] = useState("normal");
    const gameHourRef = useRef(8);
    const gameMinuteRef = useRef(0);

    useEffect(() => {
        gameHourRef.current = gameHour;
    }, [gameHour]);

    useEffect(() => {
        gameMinuteRef.current = gameMinute;
    }, [gameMinute]);

    // Time Progression Timer (ticks every 1s)
    useEffect(() => {
        if (timeSpeed === "paused") return;
        const minIncrement = timeSpeed === "normal" ? 5 : timeSpeed === "fast" ? 15 : 30;
        const interval = setInterval(() => {
            setGameMinute((currentMin) => {
                let nextMin = currentMin + minIncrement;
                if (nextMin >= 60) {
                    const hourDiff = Math.floor(nextMin / 60);
                    nextMin = nextMin % 60;
                    setGameHour((currentHour) => {
                        let nextHour = currentHour + hourDiff;
                        if (nextHour >= 24) {
                            const dayDiff = Math.floor(nextHour / 24);
                            nextHour = nextHour % 24;
                            setGameDay((d) => d + dayDiff);
                        }
                        return nextHour;
                    });
                }
                return nextMin;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [timeSpeed]);

    const timeOfDay = useMemo(() => {
        if (gameHour >= 6 && gameHour < 12) return "morning";
        if (gameHour >= 12 && gameHour < 18) return "afternoon";
        if (gameHour >= 18 && gameHour < 21) return "evening";
        return "night";
    }, [gameHour]);

    const roadConnectors = useMemo(() => {
        const connectors = new Set<string>();
        for (const s of streets) {
            if (s.type === "roundabout") {
                const cx = s.start ?? s.x ?? 0;
                const cy = s.coord ?? s.y ?? 0;
                connectors.add(`${cx},${cy}`);
                connectors.add(`${cx - 40},${cy}`);
                connectors.add(`${cx + 40},${cy}`);
                connectors.add(`${cx},${cy - 40}`);
                connectors.add(`${cx},${cy + 40}`);
            } else if (s.type === "curve" && s.start !== undefined && s.coord !== undefined && s.end !== undefined) {
                connectors.add(`${s.start},${s.coord}`);
                connectors.add(`${s.end},${s.radius || s.coord}`);
            } else if (s.type === "h" && s.coord !== undefined && s.start !== undefined && s.end !== undefined) {
                const startSnap = Math.round(s.start / 40) * 40;
                const endSnap = Math.round(s.end / 40) * 40;
                const coordSnap = Math.round(s.coord / 40) * 40;
                for (let x = startSnap; x <= endSnap; x += 40) {
                    connectors.add(`${x},${coordSnap}`);
                }
            } else if (s.type === "v" && s.coord !== undefined && s.start !== undefined && s.end !== undefined) {
                const startSnap = Math.round(s.start / 40) * 40;
                const endSnap = Math.round(s.end / 40) * 40;
                const coordSnap = Math.round(s.coord / 40) * 40;
                for (let y = startSnap; y <= endSnap; y += 40) {
                    connectors.add(`${coordSnap},${y}`);
                }
            }
        }
        return connectors;
    }, [streets]);

    const unconnectedBuildings = useMemo(() => {
        const list = new Set<string>();
        for (const b of buildings) {
            let isAdjacent = false;
            const bLeft = b.x - b.width / 2 - 20;
            const bRight = b.x + b.width / 2 + 20;
            const bTop = b.y - b.height / 2 - 20;
            const bBottom = b.y + b.height / 2 + 20;
            for (const s of streets) {
                if (s.type === "h" && s.coord !== undefined && s.start !== undefined && s.end !== undefined) {
                    const size = s.roadStyle === "avenue" ? 60 : 42;
                    const half = size / 2;
                    const rLeft = s.start;
                    const rRight = s.end;
                    const rTop = s.coord - half;
                    const rBottom = s.coord + half;
                    if (Math.max(bLeft, rLeft) <= Math.min(bRight, rRight) && Math.max(bTop, rTop) <= Math.min(bBottom, rBottom)) {
                        isAdjacent = true;
                        break;
                    }
                } else if (s.type === "v" && s.coord !== undefined && s.start !== undefined && s.end !== undefined) {
                    const size = s.roadStyle === "avenue" ? 60 : 42;
                    const half = size / 2;
                    const rLeft = s.coord - half;
                    const rRight = s.coord + half;
                    const rTop = s.start;
                    const rBottom = s.end;
                    if (Math.max(bLeft, rLeft) <= Math.min(bRight, rRight) && Math.max(bTop, rTop) <= Math.min(bBottom, rBottom)) {
                        isAdjacent = true;
                        break;
                    }
                } else if (s.type === "roundabout") {
                    const rx = s.start ?? s.x ?? 0;
                    const ry = s.coord ?? s.y ?? 0;
                    const dx = Math.max(0, Math.abs(rx - b.x) - b.width / 2);
                    const dy = Math.max(0, Math.abs(ry - b.y) - b.height / 2);
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist <= 80) {
                        isAdjacent = true;
                        break;
                    }
                } else if (s.type === "curve" && s.start !== undefined && s.coord !== undefined && s.end !== undefined) {
                    const rx1 = s.start;
                    const ry1 = s.coord;
                    const rx2 = s.end;
                    const ry2 = s.radius || ry1;
                    const cLeft = Math.min(rx1, rx2) - 40;
                    const cRight = Math.max(rx1, rx2) + 40;
                    const cTop = Math.min(ry1, ry2) - 40;
                    const cBottom = Math.max(ry1, ry2) + 40;
                    if (Math.max(bLeft, cLeft) <= Math.min(bRight, cRight) && Math.max(bTop, cTop) <= Math.min(bBottom, cBottom)) {
                        isAdjacent = true;
                        break;
                    }
                }
            }
            if (!isAdjacent) {
                list.add(b.id);
            }
        }
        return list;
    }, [buildings, streets]);

    const roadGrid = useMemo(() => {
        const grid: Record<string, { x: number; y: number; style: string; isCurve?: boolean }> = {};
        for (const s of streets) {
            const style = s.roadStyle || "two-lane";
            if (s.type === "roundabout") {
                const rx = s.start ?? s.x ?? 0;
                const ry = s.coord ?? s.y ?? 0;
                grid[`${rx},${ry}`] = { x: rx, y: ry, style };
            } else if (s.type === "curve") {
                // Curves are rendered individually
            } else if (s.type === "h" && s.coord !== undefined && s.start !== undefined && s.end !== undefined) {
                const startSnap = Math.round(s.start / 40) * 40;
                const endSnap = Math.round(s.end / 40) * 40;
                const coordSnap = Math.round(s.coord / 40) * 40;
                for (let x = startSnap; x <= endSnap; x += 40) {
                    const key = `${x},${coordSnap}`;
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

    const formatGameTime = useCallback((hour: number, minute: number): string => {
        const ampm = hour >= 12 ? "PM" : "AM";
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        const strHour = displayHour.toString().padStart(2, "0");
        const strMin = minute.toString().padStart(2, "0");
        return `${strHour}:${strMin} ${ampm}`;
    }, []);

    // 5. General UI States
    const [selectedContact, setSelectedContact] = useState<any | null>(null);
    const [selectedBuilding, setSelectedBuilding] = useState<MapBuilding | null>(null);
    const [showFog, setShowFog] = useState(() => {
        try {
            if (typeof window !== "undefined") {
                const saved = localStorage.getItem("toon_map_show_fog");
                return saved !== "false";
            }
        } catch {}
        return true;
    });

    const [activeFilter, setActiveFilter] = useState("all");
    const [hoveredContactId, setHoveredContactId] = useState<string | null>(null);

    const visitsKey = userId ? `toon_map_building_visits_${userId}` : "toon_map_building_visits";
    const [buildingVisits, setBuildingVisits] = useState<Record<string, number>>(() => {
        try {
            if (typeof window !== "undefined") {
                const saved = localStorage.getItem(visitsKey);
                if (saved) return JSON.parse(saved);
            }
        } catch {}
        return {
            "cafe": 18,
            "plaza": 25,
            "park": 15,
            "gym": 10,
            "library": 8,
            "cinema": 12,
            "hospital": 5,
            "station_a": 14,
            "station_b": 11
        };
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(visitsKey, JSON.stringify(buildingVisits));
        }
    }, [buildingVisits, visitsKey]);

    // Editable Map Title States
    const [customMapName, setCustomMapName] = useState(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem(customNameKey) || "";
        }
        return "";
    });
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState("");

    const handleStartEditName = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setTempName(customMapName || (language === "简体中文" ? "卡通世界" : "Toon world"));
        setIsEditingName(true);
    }, [customMapName, language]);

    const handleSaveName = useCallback((e?: React.FormEvent) => {
        e?.preventDefault();
        const trimmed = tempName.trim();
        if (trimmed) {
            setCustomMapName(trimmed);
            localStorage.setItem(customNameKey, trimmed);
        } else {
            setCustomMapName("");
            localStorage.removeItem(customNameKey);
        }
        setIsEditingName(false);
    }, [tempName, customNameKey]);

    const handleCancelEdit = useCallback(() => {
        setIsEditingName(false);
    }, []);

    return {
        // States
        buildings,
        setBuildings,
        streets,
        setStreets,
        weather,
        setWeather,
        weatherRef,
        isWeatherAuto,
        setIsWeatherAuto,
        temperature,
        setTemperature,
        gameHour,
        gameHourRef,
        setGameHour,
        gameMinute,
        setGameMinute,
        gameDay,
        setGameDay,
        timeSpeed,
        setTimeSpeed,
        timeOfDay,
        formatGameTime,
        selectedContact,
        setSelectedContact,
        selectedBuilding,
        setSelectedBuilding,
        showFog,
        setShowFog,
        activeFilter,
        setActiveFilter,
        hoveredContactId,
        setHoveredContactId,
        buildingVisits,
        setBuildingVisits,
        // Name
        customMapName,
        isEditingName,
        tempName,
        setTempName,
        handleStartEditName,
        handleSaveName,
        handleCancelEdit,
        roadGrid,
        roadConnectors,
        unconnectedBuildings
    };
}
