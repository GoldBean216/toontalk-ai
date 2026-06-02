import { useState, useRef, useEffect, useCallback } from 'react';
import { getMapCoords } from './mapUtils';
import { Street, MapBuilding } from './types';

interface CameraControlsProps {
    isEditMode: boolean;
    buildTool: string;
    drawingRoad: any;
    setDrawingRoad: React.Dispatch<React.SetStateAction<any>>;
    draggingItem: any;
    setDraggingItem: React.Dispatch<React.SetStateAction<any>>;
    buildings: MapBuilding[];
    setBuildings: React.Dispatch<React.SetStateAction<MapBuilding[]>>;
    streets: Street[];
    setStreets: React.Dispatch<React.SetStateAction<Street[]>>;
    setSelectedContact: (c: any) => void;
    setSelectedBuilding: (b: any) => void;
}

export function useCameraControls({
    isEditMode,
    buildTool,
    drawingRoad,
    setDrawingRoad,
    draggingItem,
    setDraggingItem,
    buildings,
    setBuildings,
    streets,
    setStreets,
    setSelectedContact,
    setSelectedBuilding
}: CameraControlsProps) {
    const [zoom, setZoom] = useState(0.65);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const mapContainerRef = useRef<HTMLDivElement>(null);

    // Wheel zoom effect
    useEffect(() => {
        const container = mapContainerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const zoomFactor = 0.08;
            const delta = e.deltaY < 0 ? 1 : -1;
            setSelectedContact(null);
            setSelectedBuilding(null);
            setZoom((prev) => {
                const nextZoom = prev + delta * zoomFactor;
                return Math.max(0.15, Math.min(nextZoom, 4.5));
            });
        };

        container.addEventListener("wheel", handleWheel, { passive: false });
        return () => {
            container.removeEventListener("wheel", handleWheel);
        };
    }, [setSelectedContact, setSelectedBuilding]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return; // only left click dragging
        if (isEditMode) {
            const coords = getMapCoords(e.clientX, e.clientY, mapContainerRef.current, pan, zoom);
            const snappedX = Math.round(coords.x / 40) * 40;
            const snappedY = Math.round(coords.y / 40) * 40;
            if (buildTool === "draw" || buildTool === "curve") {
                e.stopPropagation();
                e.preventDefault();
                setDrawingRoad({
                    startX: snappedX,
                    startY: snappedY,
                    currentX: snappedX,
                    currentY: snappedY
                });
                return;
            }
        }
        setIsDragging(true);
        dragStart.current = {
            x: e.clientX - pan.x * zoom,
            y: e.clientY - pan.y * zoom
        };
    }, [isEditMode, buildTool, pan, zoom, setDrawingRoad]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isEditMode && drawingRoad) {
            e.stopPropagation();
            e.preventDefault();
            const coords = getMapCoords(e.clientX, e.clientY, mapContainerRef.current, pan, zoom);
            const snappedX = Math.round(coords.x / 40) * 40;
            const snappedY = Math.round(coords.y / 40) * 40;
            setDrawingRoad((prev: any) => prev ? {
                ...prev,
                currentX: snappedX,
                currentY: snappedY
            } : null);
            return;
        }
        if (draggingItem) {
            const deltaX = (e.clientX - draggingItem.startX) / zoom;
            const deltaY = (e.clientY - draggingItem.startY) / zoom;
            if (draggingItem.type === "building") {
                const nextBuildings = buildings.map((b) => {
                    if (b.id === draggingItem.id) {
                        return {
                            ...b,
                            x: Math.round((draggingItem.initX + deltaX) / 40) * 40,
                            y: Math.round((draggingItem.initY + deltaY) / 40) * 40
                        };
                    }
                    return b;
                });
                setBuildings(nextBuildings);
            } else if (draggingItem.type === "road") {
                const nextStreets = streets.map((s) => {
                    if (s.id === draggingItem.id) {
                        if (s.type === "roundabout") {
                            return {
                                ...s,
                                start: Math.round((draggingItem.initX + deltaX) / 40) * 40,
                                coord: Math.round((draggingItem.initY + deltaY) / 40) * 40
                            };
                        }
                        if (s.type === "curve") {
                            return {
                                ...s,
                                start: Math.round((draggingItem.initStart + deltaX) / 40) * 40,
                                coord: Math.round((draggingItem.initY + deltaY) / 40) * 40,
                                end: Math.round((draggingItem.initEnd + deltaX) / 40) * 40,
                                radius: Math.round(((s.radius ?? 80) + deltaY) / 40) * 40
                            };
                        }
                        const isHorizontal = s.type === "h";
                        if (isHorizontal) {
                            return {
                                ...s,
                                coord: Math.round((draggingItem.initY + deltaY) / 40) * 40,
                                start: Math.round(((draggingItem.initStart ?? s.start) + deltaX) / 40) * 40,
                                end: Math.round(((draggingItem.initEnd ?? s.end) + deltaX) / 40) * 40
                            };
                        } else {
                            return {
                                ...s,
                                coord: Math.round((draggingItem.initX + deltaX) / 40) * 40,
                                start: Math.round(((draggingItem.initStart ?? s.start) + deltaY) / 40) * 40,
                                end: Math.round(((draggingItem.initEnd ?? s.end) + deltaY) / 40) * 40
                            };
                        }
                    }
                    return s;
                });
                setStreets(nextStreets);
            }
            return;
        }
        if (!isDragging) return;
        const nextX = (e.clientX - dragStart.current.x) / zoom;
        const nextY = (e.clientY - dragStart.current.y) / zoom;
        // Bounds restricted to +/- 1800 px
        setPan({
            x: Math.max(-1800, Math.min(1800, nextX)),
            y: Math.max(-1500, Math.min(1500, nextY))
        });
    }, [isEditMode, drawingRoad, draggingItem, zoom, buildings, streets, isDragging, setDrawingRoad, setBuildings, setStreets, pan]);

    const handleMouseUpOrLeave = useCallback(() => {
        setIsDragging(false);
        if (isEditMode && drawingRoad) {
            const dx = Math.abs(drawingRoad.currentX - drawingRoad.startX);
            const dy = Math.abs(drawingRoad.currentY - drawingRoad.startY);
            import('./mapUtils').then(({ mergeOverlappingStreets }) => {
                if (buildTool === "curve") {
                    if (dx > 0 && dy > 0) {
                        const newRoad: Street = {
                            id: `r_${Date.now()}`,
                            type: "curve",
                            start: drawingRoad.startX,
                            coord: drawingRoad.startY,
                            end: drawingRoad.currentX,
                            radius: drawingRoad.currentY,
                            roadStyle: "two-lane"
                        };
                        const next = mergeOverlappingStreets([...streets, newRoad]);
                        setStreets(next);
                    }
                } else if (buildTool === "draw") {
                    if (dx > 0 || dy > 0) {
                        let newRoad: Street;
                        if (dx >= dy) {
                            newRoad = {
                                id: `r_${Date.now()}`,
                                type: "h",
                                coord: drawingRoad.startY,
                                start: Math.min(drawingRoad.startX, drawingRoad.currentX),
                                end: Math.max(drawingRoad.startX, drawingRoad.currentX),
                                roadStyle: "two-lane"
                            };
                        } else {
                            newRoad = {
                                id: `r_${Date.now()}`,
                                type: "v",
                                coord: drawingRoad.startX,
                                start: Math.min(drawingRoad.startY, drawingRoad.currentY),
                                end: Math.max(drawingRoad.startY, drawingRoad.currentY),
                                roadStyle: "two-lane"
                            };
                        }
                        const next = mergeOverlappingStreets([...streets, newRoad]);
                        setStreets(next);
                    }
                }
            });
            setDrawingRoad(null);
            return;
        }
        if (draggingItem) {
            setDraggingItem(null);
            import('./mapUtils').then(({ mergeOverlappingStreets }) => {
                const merged = mergeOverlappingStreets(streets);
                setStreets(merged);
            });
        }
    }, [isEditMode, drawingRoad, buildTool, streets, draggingItem, buildings, setDrawingRoad, setStreets, setDraggingItem]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        if (isEditMode) {
            const coords = getMapCoords(touch.clientX, touch.clientY, mapContainerRef.current, pan, zoom);
            const snappedX = Math.round(coords.x / 40) * 40;
            const snappedY = Math.round(coords.y / 40) * 40;
            if (buildTool === "draw" || buildTool === "curve") {
                e.stopPropagation();
                setDrawingRoad({
                    startX: snappedX,
                    startY: snappedY,
                    currentX: snappedX,
                    currentY: snappedY
                });
                return;
            }
        }
        setIsDragging(true);
        dragStart.current = {
            x: touch.clientX - pan.x * zoom,
            y: touch.clientY - zoom * pan.y
        };
    }, [isEditMode, buildTool, pan, zoom, setDrawingRoad]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        if (isEditMode && drawingRoad) {
            e.stopPropagation();
            const coords = getMapCoords(touch.clientX, touch.clientY, mapContainerRef.current, pan, zoom);
            const snappedX = Math.round(coords.x / 40) * 40;
            const snappedY = Math.round(coords.y / 40) * 40;
            setDrawingRoad((prev: any) => prev ? {
                ...prev,
                currentX: snappedX,
                currentY: snappedY
            } : null);
            return;
        }
        if (draggingItem) {
            const deltaX = (touch.clientX - draggingItem.startX) / zoom;
            const deltaY = (touch.clientY - draggingItem.startY) / zoom;
            if (draggingItem.type === "building") {
                const nextBuildings = buildings.map((b) => {
                    if (b.id === draggingItem.id) {
                        return {
                            ...b,
                            x: Math.round((draggingItem.initX + deltaX) / 40) * 40,
                            y: Math.round((draggingItem.initY + deltaY) / 40) * 40
                        };
                    }
                    return b;
                });
                setBuildings(nextBuildings);
            } else if (draggingItem.type === "road") {
                const nextStreets = streets.map((s) => {
                    if (s.id === draggingItem.id) {
                        if (s.type === "roundabout") {
                            return {
                                ...s,
                                start: Math.round((draggingItem.initX + deltaX) / 40) * 40,
                                coord: Math.round((draggingItem.initY + deltaY) / 40) * 40
                            };
                        }
                        if (s.type === "curve") {
                            return {
                                ...s,
                                start: Math.round((draggingItem.initStart + deltaX) / 40) * 40,
                                coord: Math.round((draggingItem.initY + deltaY) / 40) * 40,
                                end: Math.round((draggingItem.initEnd + deltaX) / 40) * 40,
                                radius: Math.round(((s.radius ?? 80) + deltaY) / 40) * 40
                            };
                        }
                        const isHorizontal = s.type === "h";
                        if (isHorizontal) {
                            return {
                                ...s,
                                coord: Math.round((draggingItem.initY + deltaY) / 40) * 40,
                                start: Math.round(((draggingItem.initStart ?? s.start) + deltaX) / 40) * 40,
                                end: Math.round(((draggingItem.initEnd ?? s.end) + deltaX) / 40) * 40
                            };
                        } else {
                            return {
                                ...s,
                                coord: Math.round((draggingItem.initX + deltaX) / 40) * 40,
                                start: Math.round(((draggingItem.initStart ?? s.start) + deltaY) / 40) * 40,
                                end: Math.round(((draggingItem.initEnd ?? s.end) + deltaY) / 40) * 40
                            };
                        }
                    }
                    return s;
                });
                setStreets(nextStreets);
            }
            return;
        }
        if (!isDragging) return;
        const nextX = (touch.clientX - dragStart.current.x) / zoom;
        const nextY = (touch.clientY - dragStart.current.y) / zoom;
        setPan({
            x: Math.max(-1800, Math.min(1800, nextX)),
            y: Math.max(-1500, Math.min(1500, nextY))
        });
    }, [isEditMode, drawingRoad, draggingItem, zoom, buildings, streets, isDragging, setDrawingRoad, setBuildings, setStreets, pan]);

    const handleZoomIn = useCallback(() => {
        setZoom((prev) => Math.min(prev + 0.25, 4.5));
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoom((prev) => Math.max(prev - 0.25, 0.15));
    }, []);

    const handleResetZoom = useCallback(() => {
        setZoom(0.65);
        setPan({ x: 0, y: 0 });
    }, []);

    return {
        zoom,
        setZoom,
        pan,
        setPan,
        isDragging,
        mapContainerRef,
        handleMouseDown,
        handleMouseMove,
        handleMouseUpOrLeave,
        handleTouchStart,
        handleTouchMove,
        handleZoomIn,
        handleZoomOut,
        handleResetZoom
    };
}
