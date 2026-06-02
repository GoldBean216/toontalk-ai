import { useState, useEffect, useRef, useCallback } from 'react';
import { MapBuilding, Street, BuildTool } from './types';
import { mergeOverlappingStreets } from './mapUtils';
import { DEFAULT_BUILDINGS } from './constants';

interface MapEditorProps {
    buildings: MapBuilding[];
    setBuildings: React.Dispatch<React.SetStateAction<MapBuilding[]>>;
    streets: Street[];
    setStreets: React.Dispatch<React.SetStateAction<Street[]>>;
    customMapName: string;
    setCustomMapName: React.Dispatch<React.SetStateAction<string>>;
    setSelectedBuilding: (b: MapBuilding | null) => void;
    setSelectedContact: (c: any | null) => void;
    setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
    setZoom: React.Dispatch<React.SetStateAction<number>>;
    language: string;
    t: any;
    userId?: string;
}

export function useMapEditor({
    buildings,
    setBuildings,
    streets,
    setStreets,
    customMapName,
    setCustomMapName,
    setSelectedBuilding,
    setSelectedContact,
    setPan,
    setZoom,
    language,
    t,
    userId
}: MapEditorProps) {
    const [isEditMode, setIsEditMode] = useState(false);
    const [isCatalogCollapsed, setIsCatalogCollapsed] = useState(true);
    const [activeCatalogTab, setActiveCatalogTab] = useState("buildings");
    const [hasNewMapDot, setHasNewMapDot] = useState(false);
    const [draggingItem, setDraggingItem] = useState<any | null>(null);
    const [buildTool, setBuildTool] = useState<BuildTool>("pan");
    const [drawingRoad, setDrawingRoad] = useState<any | null>(null);

    // Editable Map Title States (linked via props)
    const [tempName, setTempName] = useState("");

    const customBuildingsKey = userId ? `toon_custom_buildings_${userId}` : "toon_custom_buildings";
    const customDecorsKey = userId ? `toon_custom_decors_${userId}` : "toon_custom_decors";
    const customMapsKey = userId ? `toon_custom_maps_${userId}` : "toon_custom_maps";
    const savedMapsKey = userId ? `toon_saved_maps_${userId}` : "toon_saved_maps";

    // Custom items catalog lists (loaded from localStorage)
    const [customBuildings, setCustomBuildings] = useState<any[]>(() => {
        if (typeof window === "undefined") return [];
        try {
            const saved = localStorage.getItem(customBuildingsKey);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [customDecors, setCustomDecors] = useState<any[]>(() => {
        if (typeof window === "undefined") return [];
        try {
            const saved = localStorage.getItem(customDecorsKey);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [customMaps, setCustomMaps] = useState<any[]>(() => {
        if (typeof window === "undefined") return [];
        try {
            const savedCustom = localStorage.getItem(customMapsKey);
            const savedMy = localStorage.getItem(savedMapsKey);
            let customList = savedCustom ? JSON.parse(savedCustom) : [];
            let myList = savedMy ? JSON.parse(savedMy) : [];
            let merged = [...customList];
            let changed = false;
            for (const map of myList) {
                if (!merged.some((m) => m.id === map.id)) {
                    merged.push({
                        ...map,
                        emoji: map.emoji || "🗺️",
                        isCustom: true
                    });
                    changed = true;
                }
            }
            if (changed) {
                localStorage.setItem(customMapsKey, JSON.stringify(merged));
            }
            return merged;
        } catch {
            return [];
        }
    });

    // Custom Item Modal and Form States
    const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
    const [customModalTab, setCustomModalTab] = useState<"buildings" | "decors" | "maps">("buildings");
    const [editingCustomItem, setEditingCustomItem] = useState<any | null>(null);
    const [customItemName, setCustomItemName] = useState("");
    const [customItemDescription, setCustomItemDescription] = useState("");
    const [customItemEmoji, setCustomItemEmoji] = useState("🏢");
    const [customItemImageUrl, setCustomItemImageUrl] = useState("");
    const [customItemTag, setCustomItemTag] = useState("CUSTOM");
    const [customItemWidth, setCustomItemWidth] = useState(120);
    const [customItemHeight, setCustomItemHeight] = useState(120);

    const [isSavingConfig, setIsSavingConfig] = useState(false);
    const importFileRef = useRef<HTMLInputElement>(null);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportName, setExportName] = useState("");
    const [exportDesc, setExportDesc] = useState("");

    // Reactive reloader when user changes
    useEffect(() => {
        if (!userId) return;

        let loadedB = [];
        try {
            const saved = localStorage.getItem(`toon_custom_buildings_${userId}`);
            if (saved) loadedB = JSON.parse(saved);
        } catch {}
        setCustomBuildings(loadedB);

        let loadedD = [];
        try {
            const saved = localStorage.getItem(`toon_custom_decors_${userId}`);
            if (saved) loadedD = JSON.parse(saved);
        } catch {}
        setCustomDecors(loadedD);

        let loadedM = [];
        try {
            const savedCustom = localStorage.getItem(`toon_custom_maps_${userId}`);
            const savedMy = localStorage.getItem(`toon_saved_maps_${userId}`);
            let customList = savedCustom ? JSON.parse(savedCustom) : [];
            let myList = savedMy ? JSON.parse(savedMy) : [];
            loadedM = [...customList];
            for (const map of myList) {
                if (!loadedM.some((m) => m.id === map.id)) {
                    loadedM.push({
                        ...map,
                        emoji: map.emoji || "🗺️",
                        isCustom: true
                    });
                }
            }
        } catch {}
        setCustomMaps(loadedM);
    }, [userId]);

    // Toggle editor mode configurations
    useEffect(() => {
        if (!isEditMode) {
            setIsCatalogCollapsed(true);
            setBuildTool("pan");
        }
    }, [isEditMode]);

    useEffect(() => {
        if (buildTool === "draw" || buildTool === "curve" || buildTool === "upgrade") {
            setIsCatalogCollapsed(true);
        }
    }, [buildTool]);

    useEffect(() => {
        if (activeCatalogTab === "maps") {
            setHasNewMapDot(false);
        }
    }, [activeCatalogTab]);

    const handleSpawnItem = useCallback((item: any) => {
        // Spawn at the center of the current camera viewport (approximated, snapped to 40px grid)
        const mapX = 0;
        const mapY = 0;
        if (item.type === "roundabout") {
            const newRoad: Street = {
                id: `r_${Date.now()}`,
                type: "roundabout",
                coord: mapY,
                start: mapX,
                end: mapX + 80,
                roadStyle: "two-lane"
            };
            const next = mergeOverlappingStreets([...streets, newRoad]);
            setStreets(next);
        } else if (item.type === "road") {
            const newRoad: Street = {
                id: `r_${Date.now()}`,
                type: item.roadType,
                coord: item.roadType === "h" ? mapY : mapX,
                start: Math.round(((item.roadType === "h" ? mapX : mapY) - item.length / 2) / 40) * 40,
                end: Math.round(((item.roadType === "h" ? mapX : mapY) + item.length / 2) / 40) * 40,
                roadStyle: "two-lane"
            };
            const next = mergeOverlappingStreets([...streets, newRoad]);
            setStreets(next);
        } else {
            const baseId = `b_${Date.now()}`;
            
            if (item.id === 'station') {
                const idA = `${baseId}_A`;
                const idB = `${baseId}_B`;
                
                const stationA: MapBuilding = {
                    id: idA,
                    name: `${item.name} A`,
                    type: item.type,
                    x: mapX,
                    y: mapY,
                    width: item.width,
                    height: item.height,
                    emoji: item.emoji,
                    description: item.description,
                    tag: item.tag,
                    actionText: item.actionText || "Interact 🔍",
                    imageUrl: item.imageUrl,
                    hasAnnounced: false,
                    linkedMetroId: idB
                };
                
                const stationB: MapBuilding = {
                    id: idB,
                    name: `${item.name} B`,
                    type: item.type,
                    x: mapX + 200,
                    y: mapY + 200,
                    width: item.width,
                    height: item.height,
                    emoji: item.emoji,
                    description: item.description,
                    tag: item.tag,
                    actionText: item.actionText || "Interact 🔍",
                    imageUrl: item.imageUrl,
                    hasAnnounced: false,
                    linkedMetroId: idA
                };
                
                const next = [...buildings, stationA, stationB];
                setBuildings(next);
            } else {
                const newB: MapBuilding = {
                    id: baseId,
                    name: item.name,
                    type: item.type,
                    x: mapX,
                    y: mapY,
                    width: item.width,
                    height: item.height,
                    emoji: item.emoji,
                    description: item.description,
                    tag: item.tag,
                    actionText: item.actionText || "Interact 🔍",
                    imageUrl: item.imageUrl,
                    hasAnnounced: false
                };
                const next = [...buildings, newB];
                setBuildings(next);
            }
        }
    }, [streets, buildings, setStreets, setBuildings]);

    const handleOpenCustomModal = useCallback((tab: "buildings" | "decors" | "maps", item: any = null) => {
        setCustomModalTab(tab);
        setEditingCustomItem(item);
        if (item) {
            setCustomItemName(item.name || "");
            setCustomItemDescription(item.description || "");
            setCustomItemEmoji(item.emoji || (tab === "buildings" ? "🏢" : tab === "decors" ? "🌸" : "🗺️"));
            setCustomItemImageUrl(item.imageUrl || "");
            setCustomItemTag(item.tag || "CUSTOM");
            setCustomItemWidth(item.width || 120);
            setCustomItemHeight(item.height || 120);
        } else {
            setCustomItemName("");
            setCustomItemDescription("");
            setCustomItemEmoji(tab === "buildings" ? "🏢" : tab === "decors" ? "🌸" : "🗺️");
            setCustomItemImageUrl("");
            setCustomItemTag("CUSTOM");
            setCustomItemWidth(120);
            setCustomItemHeight(120);
        }
        setIsCustomModalOpen(true);
    }, []);

    const handleImageFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === "string") {
                    setCustomItemImageUrl(reader.result);
                }
            };
            reader.readAsDataURL(file);
        }
    }, []);

    const handleSaveCustomItem = useCallback(() => {
        if (!customItemName.trim()) {
            alert(t.customPleaseEnterName || "Please enter a name.");
            return;
        }
        if (customModalTab === "buildings") {
            let updated;
            if (editingCustomItem) {
                updated = customBuildings.map((b) => b.id === editingCustomItem.id ? {
                    ...b,
                    name: customItemName,
                    description: customItemDescription,
                    emoji: customItemEmoji,
                    imageUrl: customItemImageUrl,
                    tag: customItemTag,
                    width: Number(customItemWidth),
                    height: Number(customItemHeight)
                } : b);
            } else {
                const newB = {
                    id: `custom_bldg_${Date.now()}`,
                    name: customItemName,
                    type: "office",
                    emoji: customItemEmoji,
                    imageUrl: customItemImageUrl,
                    tag: customItemTag,
                    width: Number(customItemWidth),
                    height: Number(customItemHeight),
                    description: customItemDescription,
                    isCustom: true
                };
                updated = [...customBuildings, newB];
            }
            setCustomBuildings(updated);
            localStorage.setItem(customBuildingsKey, JSON.stringify(updated));
        } else if (customModalTab === "decors") {
            let updated;
            if (editingCustomItem) {
                updated = customDecors.map((d) => d.id === editingCustomItem.id ? {
                    ...d,
                    name: customItemName,
                    description: customItemDescription,
                    emoji: customItemEmoji,
                    imageUrl: customItemImageUrl,
                    tag: customItemTag,
                    width: Number(customItemWidth),
                    height: Number(customItemHeight)
                } : d);
            } else {
                const newD = {
                    id: `custom_decor_${Date.now()}`,
                    name: customItemName,
                    type: "home",
                    emoji: customItemEmoji,
                    imageUrl: customItemImageUrl,
                    tag: customItemTag,
                    width: Number(customItemWidth),
                    height: Number(customItemHeight),
                    description: customItemDescription,
                    isCustom: true
                };
                updated = [...customDecors, newD];
            }
            setCustomDecors(updated);
            localStorage.setItem(customDecorsKey, JSON.stringify(updated));
        } else if (customModalTab === "maps") {
            let updated;
            if (editingCustomItem) {
                updated = customMaps.map((m) => m.id === editingCustomItem.id ? {
                    ...m,
                    name: customItemName,
                    description: customItemDescription,
                    emoji: customItemEmoji,
                    imageUrl: customItemImageUrl
                } : m);
            } else {
                const newMap = {
                    id: `custom_map_${Date.now()}`,
                    name: customItemName,
                    description: customItemDescription,
                    emoji: customItemEmoji,
                    imageUrl: customItemImageUrl,
                    buildings: buildings,
                    streets: streets,
                    isCustom: true
                };
                updated = [...customMaps, newMap];
            }
            setCustomMaps(updated);
            localStorage.setItem(customMapsKey, JSON.stringify(updated));
        }
        setIsCustomModalOpen(false);
        setEditingCustomItem(null);
    }, [customItemName, customModalTab, editingCustomItem, customBuildings, customDecors, customMaps, customItemDescription, customItemEmoji, customItemImageUrl, customItemTag, customItemWidth, customItemHeight, buildings, streets, t]);

    const handleDeleteCustomItem = useCallback((tab: string, id: string) => {
        if (!window.confirm("Are you sure you want to delete this custom item?")) {
            return;
        }
        if (tab === "buildings") {
            const updated = customBuildings.filter((b) => b.id !== id);
            setCustomBuildings(updated);
            localStorage.setItem(customBuildingsKey, JSON.stringify(updated));
        } else if (tab === "decors") {
            const updated = customDecors.filter((d) => d.id !== id);
            setCustomDecors(updated);
            localStorage.setItem(customDecorsKey, JSON.stringify(updated));
        } else if (tab === "maps") {
            const updated = customMaps.filter((m) => m.id !== id);
            setCustomMaps(updated);
            localStorage.setItem(customMapsKey, JSON.stringify(updated));
        }
    }, [customBuildings, customDecors, customMaps]);

    const handleLoadMapPreset = useCallback((preset: any) => {
        if (window.confirm(t.confirmPreset || `Are you sure you want to load this map preset? This will overwrite your current layout.`)) {
            setBuildings(preset.buildings);
            setStreets(preset.streets);
            const customNameKey = userId ? `toon_map_custom_name_${userId}` : "toon_map_custom_name";
            if (preset.name) {
                setCustomMapName(preset.name);
                localStorage.setItem(customNameKey, preset.name);
            }
            setPan({ x: 0, y: 0 });
            setZoom(0.65);
            setHasNewMapDot(false);
        }
    }, [setBuildings, setStreets, setCustomMapName, setPan, setZoom, t]);

    const handleSaveConfig = useCallback(async () => {
        setIsSavingConfig(true);
        try {
            const res = await fetch("/api/map-config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ buildings, streets })
            });
            if (res.ok) {
                // Sync AI Roles to Markdown files
                for (const b of buildings) {
                    if (b.functions) {
                        for (const f of b.functions) {
                            if (f.assigneeId && f.aiRoleSetting) {
                                await fetch("/api/ai-character-settings", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        assigneeId: f.assigneeId,
                                        buildingName: b.name,
                                        functionName: f.name,
                                        aiRoleSetting: f.aiRoleSetting
                                    })
                                }).catch((e) => console.error("Failed to sync role for", f.assigneeId, e));
                            }
                        }
                    }
                }
                alert(language === "简体中文" ? "配置已成功保存！" : "Configuration saved successfully!");
            } else {
                alert("Failed to save config");
            }
        } catch (err) {
            console.error(err);
            alert("Error saving config");
        }
        setIsSavingConfig(false);
    }, [buildings, streets, language]);

    const handleExportMap = useCallback(() => {
        setExportName(customMapName || "My ToonMap");
        setExportDesc("");
        setShowExportModal(true);
    }, [customMapName]);

    const handleConfirmExport = useCallback(() => {
        const name = exportName.trim() || "My ToonMap";
        const desc = exportDesc.trim();
        const newMap = {
            id: `custom_map_${Date.now()}`,
            name,
            description: desc,
            emoji: "🗺️",
            imageUrl: "",
            buildings: buildings.map((b) => ({ ...b })),
            streets: streets.map((s) => ({ ...s })),
            isCustom: true
        };
        const updated = [newMap, ...customMaps];
        localStorage.setItem(customMapsKey, JSON.stringify(updated));
        setCustomMaps(updated);

        // Download JSON
        const blob = new Blob([JSON.stringify(newMap, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${name.replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setShowExportModal(false);
        alert(language === "简体中文" ? "✅ 地图已导出并下载！" : "✅ Map exported and downloaded successfully!");
    }, [exportName, exportDesc, buildings, streets, customMaps, language]);

    const handleImportMap = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                if (!data.buildings || !Array.isArray(data.buildings)) {
                    alert("Invalid map file: missing buildings");
                    return;
                }
                const mergedBuildings = data.buildings.map((imported: any) => {
                    const def = DEFAULT_BUILDINGS.find((b) => b.id === imported.id);
                    return def ? {
                        ...def,
                        ...imported,
                        functions: imported.functions || def.functions || []
                    } : imported;
                });
                const mapId = data.id || `custom_map_${Date.now()}`;
                const mapName = data.name || file.name.replace(/\.json$/i, "") || "Imported Map";
                const newMap = {
                    id: mapId,
                    name: mapName,
                    description: data.description || "Imported via JSON file",
                    emoji: data.emoji || "🗺️",
                    imageUrl: data.imageUrl || "",
                    buildings: mergedBuildings,
                    streets: data.streets || [],
                    isCustom: true
                };
                const updated = [newMap, ...customMaps.filter((m) => m.id !== mapId)];
                localStorage.setItem(customMapsKey, JSON.stringify(updated));
                setCustomMaps(updated);
                setHasNewMapDot(true);
                alert(`✅ Map "${mapName}" imported successfully!`);
            } catch {
                alert("Failed to parse map file");
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    }, [customMaps]);

    const handleItemDragStart = useCallback((e: React.MouseEvent, id: string, type: string, initX: number, initY: number, initStart?: number, initEnd?: number) => {
        if (!isEditMode || buildTool !== "pan") return;
        e.stopPropagation();
        e.preventDefault();
        setDraggingItem({
            id,
            type,
            startX: e.clientX,
            startY: e.clientY,
            initX,
            initY,
            initStart,
            initEnd
        });
    }, [isEditMode, buildTool]);

    const handleItemTouchStart = useCallback((e: React.TouchEvent, id: string, type: string, initX: number, initY: number, initStart?: number, initEnd?: number) => {
        if (!isEditMode || buildTool !== "pan") return;
        if (e.touches.length !== 1) return;
        e.stopPropagation();
        const touch = e.touches[0];
        setDraggingItem({
            id,
            type,
            startX: touch.clientX,
            startY: touch.clientY,
            initX,
            initY,
            initStart,
            initEnd
        });
    }, [isEditMode, buildTool]);

    const handleDeleteBuilding = useCallback((e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const next = buildings.filter((b) => b.id !== id);
        setBuildings(next);
        setSelectedBuilding(null);
    }, [buildings, setBuildings, setSelectedBuilding]);

    const handleDeleteStreet = useCallback((e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const next = streets.filter((s) => s.id !== id);
        setStreets(next);
    }, [streets, setStreets]);

    const handleUpgradeRoad = useCallback((roadId: string) => {
        const nextStreets = streets.map((s) => {
            if (s.id === roadId) {
                const currentStyle = s.roadStyle || "two-lane";
                const styleCycle = ["dirt", "two-lane", "avenue", "overpass"];
                const nextIdx = (styleCycle.indexOf(currentStyle) + 1) % styleCycle.length;
                return {
                    ...s,
                    roadStyle: styleCycle[nextIdx]
                };
            }
            return s;
        });
        const merged = mergeOverlappingStreets(nextStreets);
        setStreets(merged);
    }, [streets, setStreets]);

    return {
        isEditMode,
        setIsEditMode,
        isCatalogCollapsed,
        setIsCatalogCollapsed,
        activeCatalogTab,
        setActiveCatalogTab,
        hasNewMapDot,
        setHasNewMapDot,
        draggingItem,
        setDraggingItem,
        buildTool,
        setBuildTool,
        drawingRoad,
        setDrawingRoad,
        customBuildings,
        customDecors,
        customMaps,
        // modal & form state
        isCustomModalOpen,
        setIsCustomModalOpen,
        customModalTab,
        setCustomModalTab,
        editingCustomItem,
        setEditingCustomItem,
        customItemName,
        setCustomItemName,
        customItemDescription,
        setCustomItemDescription,
        customItemEmoji,
        setCustomItemEmoji,
        customItemImageUrl,
        setCustomItemImageUrl,
        customItemTag,
        setCustomItemTag,
        customItemWidth,
        setCustomItemWidth,
        customItemHeight,
        setCustomItemHeight,
        // import / export
        isSavingConfig,
        importFileRef,
        showExportModal,
        setShowExportModal,
        exportName,
        setExportName,
        exportDesc,
        setExportDesc,
        // Handlers
        handleSpawnItem,
        handleOpenCustomModal,
        handleImageFileChange,
        handleSaveCustomItem,
        handleDeleteCustomItem,
        handleLoadMapPreset,
        handleSaveConfig,
        handleExportMap,
        handleConfirmExport,
        handleImportMap,
        handleItemDragStart,
        handleItemTouchStart,
        handleDeleteBuilding,
        handleDeleteStreet,
        handleUpgradeRoad
    };
}
